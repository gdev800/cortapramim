-- Testes da migração 002 (histórico só leitura e registro; limites de JSON).
\set ON_ERROR_STOP 1
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@teste.local'),
  ('00000000-0000-0000-0000-00000000000c', 'c@teste.local'),
  ('00000000-0000-0000-0000-00000000000d', 'd@teste.local');

create function pg_temp.como(u text) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
end $$;
create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FALHOU: %', msg; end if;
  raise notice 'ok - %', msg;
end $$;
create function pg_temp.recusa(sql text, msg text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when insufficient_privilege or check_violation or foreign_key_violation then
    raise notice 'ok - %', msg; return;
  end;
  raise exception 'FALHOU (deveria recusar): %', msg;
end $$;
create function pg_temp.linhas(sql text) returns int language plpgsql as $$
declare n int; begin execute sql; get diagnostics n = row_count; return n; end $$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- A é dono; C e D são membros
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
insert into public.oficinas (id, nome) values ('20000000-0000-0000-0000-00000000000a', 'Marcenaria A');
insert into public.membros (oficina_id, user_id) values
  ('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c'),
  ('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000d');
insert into public.historico (oficina_id, id, data, tipo, pecas) values ('20000000-0000-0000-0000-00000000000a', 'mA', now(), 'saida', 3);
select pg_temp.ok((select criado_por from public.historico where id = 'mA') = auth.uid(), 'lançamento guarda quem registrou');

-- C registra, lê, não edita, apaga só o que é dele
select pg_temp.como('00000000-0000-0000-0000-00000000000c');
insert into public.historico (oficina_id, id, data, tipo, pecas) values ('20000000-0000-0000-0000-00000000000a', 'mC', now(), 'saida', 5);
select pg_temp.ok((select count(*) from public.historico) = 2, 'membro lê o histórico da oficina');
select pg_temp.recusa($q$update public.historico set pecas = 999 where id = 'mC'$q$, 'ninguém edita lançamento, nem o próprio');
select pg_temp.recusa($q$insert into public.historico (oficina_id, id, data, tipo, pecas, criado_por) values ('20000000-0000-0000-0000-00000000000a', 'mF', now(), 'saida', 1, '00000000-0000-0000-0000-00000000000d')$q$, 'membro não registra em nome de outro');
select pg_temp.ok(pg_temp.linhas($q$delete from public.historico where id = 'mA'$q$) = 0, 'membro não apaga lançamento de outro');
select pg_temp.ok(pg_temp.linhas($q$delete from public.historico where id = 'mC'$q$) = 1, 'membro desfaz o próprio lançamento');

-- D registra; o dono pode apagar qualquer um
select pg_temp.como('00000000-0000-0000-0000-00000000000d');
insert into public.historico (oficina_id, id, data, tipo, pecas) values ('20000000-0000-0000-0000-00000000000a', 'mD', now(), 'saida', 2);
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
select pg_temp.recusa($q$update public.historico set pecas = 1 where id = 'mD'$q$, 'nem o dono edita lançamento');
select pg_temp.ok(pg_temp.linhas($q$delete from public.historico where id = 'mD'$q$) = 1, 'o dono apaga lançamento de membro');

-- limites de JSON
select pg_temp.recusa(format($q$insert into public.projetos (oficina_id, id, entrada) values ('20000000-0000-0000-0000-00000000000a', 'pG', '{"x":"%s"}')$q$, repeat('a', 1100000)), 'projeto com entrada acima de 1 MB é recusado');
select pg_temp.recusa(format($q$insert into public.historico (oficina_id, id, data, tipo, pecas, chapas) values ('20000000-0000-0000-0000-00000000000a', 'mG', now(), 'saida', 1, '["%s"]')$q$, repeat('a', 70000)), 'chapas do histórico acima de 64 KB é recusado');
insert into public.projetos (oficina_id, id, entrada) values ('20000000-0000-0000-0000-00000000000a', 'pN', '{"blocks":[]}');
select pg_temp.ok((select count(*) from public.projetos where id = 'pN') = 1, 'projeto normal continua gravando');

rollback;
\echo 'RLS 002: todos os testes passaram.'
