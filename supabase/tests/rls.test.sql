-- Testes de RLS (Parte 7). Rodam como os papéis do Supabase, trocando o usuário pelo JWT.
-- Qualquer falha levanta exceção e para o script (psql -v ON_ERROR_STOP=1).
-- No Supabase local: rode depois da migração, como superusuário (ex.: psql "$DB_URL" -f supabase/tests/rls.test.sql).
\set ON_ERROR_STOP 1
begin;

-- usuários de teste
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@teste.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@teste.local'),
  ('00000000-0000-0000-0000-00000000000c', 'c@teste.local');

create function pg_temp.como(u text) returns void language plpgsql as $$
begin
  if u is null then
    perform set_config('role', 'anon', true);
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  else
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  end if;
end $$;
create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FALHOU: %', msg; end if;
  raise notice 'ok - %', msg;
end $$;
-- espera que o comando seja recusado (erro de permissão, RLS ou check)
create function pg_temp.recusa(sql text, msg text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when insufficient_privilege or check_violation or foreign_key_violation then
    raise notice 'ok - %', msg; return;
  end;
  raise exception 'FALHOU (deveria recusar): %', msg;
end $$;
-- quantas linhas o comando mexeu (RLS em update/delete não dá erro: só não acha a linha)
create function pg_temp.linhas(sql text) returns int language plpgsql as $$
declare n int; begin execute sql; get diagnostics n = row_count; return n; end $$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- ===== A cria a oficina dele e grava dados
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
insert into public.oficinas (id, nome) values ('10000000-0000-0000-0000-00000000000a', 'Marcenaria A');
select pg_temp.ok((select papel from public.membros where oficina_id = '10000000-0000-0000-0000-00000000000a' and user_id = auth.uid()) = 'dono', 'quem cria a oficina vira dono');
insert into public.projetos (oficina_id, id, nome, entrada) values ('10000000-0000-0000-0000-00000000000a', 'p1', 'Cozinha', '{"blocks":[]}');
insert into public.sobras (oficina_id, id, nome, esp, c, l) values ('10000000-0000-0000-0000-00000000000a', 's1', 'Branco TX', 15, 900, 400);
insert into public.insumos (oficina_id, id, tipo, nome, q, min, esp, c, l) values ('10000000-0000-0000-0000-00000000000a', 'i1', 'chapa', 'Branco TX', 3, 5, 15, 2750, 1850);
insert into public.historico (oficina_id, id, data, tipo, projeto, pecas, chapas) values ('10000000-0000-0000-0000-00000000000a', 'm1', now(), 'saida', 'Cozinha', 10, '[{"nome":"Branco TX","esp":15,"q":2}]');
select pg_temp.ok((select count(*) from public.projetos) = 1, 'A vê o próprio projeto');

-- ===== B cria a dele
select pg_temp.como('00000000-0000-0000-0000-00000000000b');
insert into public.oficinas (id, nome) values ('10000000-0000-0000-0000-00000000000b', 'Marcenaria B');
insert into public.sobras (oficina_id, id, nome, esp, c, l) values ('10000000-0000-0000-0000-00000000000b', 's1', 'Carvalho', 18, 500, 300);

-- B não enxerga nada de A
select pg_temp.ok((select count(*) from public.oficinas) = 1, 'B vê só a própria oficina');
select pg_temp.ok((select count(*) from public.membros where oficina_id = '10000000-0000-0000-0000-00000000000a') = 0, 'B não vê membros de A');
select pg_temp.ok((select count(*) from public.projetos) = 0, 'B não vê projetos de A');
select pg_temp.ok((select count(*) from public.sobras where oficina_id = '10000000-0000-0000-0000-00000000000a') = 0, 'B não vê sobras de A');
select pg_temp.ok((select count(*) from public.insumos) = 0, 'B não vê insumos de A');
select pg_temp.ok((select count(*) from public.historico) = 0, 'B não vê histórico de A');
-- nem altera, apaga ou grava em A
select pg_temp.ok(pg_temp.linhas($q$update public.projetos set nome = 'invadido' where oficina_id = '10000000-0000-0000-0000-00000000000a'$q$) = 0, 'B não altera projeto de A');
select pg_temp.ok(pg_temp.linhas($q$delete from public.sobras where oficina_id = '10000000-0000-0000-0000-00000000000a'$q$) = 0, 'B não apaga sobra de A');
select pg_temp.ok(pg_temp.linhas($q$update public.oficinas set nome = 'x' where id = '10000000-0000-0000-0000-00000000000a'$q$) = 0, 'B não renomeia a oficina de A');
select pg_temp.recusa($q$insert into public.projetos (oficina_id, id) values ('10000000-0000-0000-0000-00000000000a', 'p9')$q$, 'B não grava projeto em A');
select pg_temp.recusa($q$insert into public.historico (oficina_id, id, data, tipo, pecas) values ('10000000-0000-0000-0000-00000000000a', 'm9', now(), 'saida', 1)$q$, 'B não grava histórico em A');
select pg_temp.recusa($q$insert into public.membros (oficina_id, user_id, papel) values ('10000000-0000-0000-0000-00000000000a', auth.uid(), 'dono')$q$, 'B não se coloca como membro de A');
select pg_temp.recusa($q$update public.sobras set oficina_id = '10000000-0000-0000-0000-00000000000a' where id = 's1'$q$, 'B não move a sobra dele para A');
select pg_temp.recusa($q$insert into public.oficinas (nome, criado_por) values ('Falsa', '00000000-0000-0000-0000-00000000000a')$q$, 'B não cria oficina em nome de A');

-- ===== sem login não lê nada e não grava nada
select pg_temp.como(null);
select pg_temp.recusa($q$select * from public.oficinas$q$, 'sem login não lê oficinas');
select pg_temp.recusa($q$select * from public.projetos$q$, 'sem login não lê projetos');
select pg_temp.recusa($q$select * from public.sobras$q$, 'sem login não lê sobras');
select pg_temp.recusa($q$select * from public.insumos$q$, 'sem login não lê insumos');
select pg_temp.recusa($q$select * from public.historico$q$, 'sem login não lê histórico');
select pg_temp.recusa($q$select * from public.membros$q$, 'sem login não lê membros');
select pg_temp.recusa($q$insert into public.oficinas (nome) values ('x')$q$, 'sem login não cria oficina');
select pg_temp.recusa($q$select privado.e_membro('10000000-0000-0000-0000-00000000000a')$q$, 'sem login não chama as funções de permissão');

-- ===== só o dono convida e remove
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
insert into public.membros (oficina_id, user_id) values ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c');
select pg_temp.como('00000000-0000-0000-0000-00000000000c');
select pg_temp.ok((select count(*) from public.sobras) = 1, 'membro C vê as sobras de A');
insert into public.sobras (oficina_id, id, nome, esp, c, l) values ('10000000-0000-0000-0000-00000000000a', 's2', 'Branco TX', 15, 600, 300);
select pg_temp.ok((select count(*) from public.sobras) = 2, 'membro C grava sobras em A');
select pg_temp.ok((select count(*) from public.sobras where oficina_id = '10000000-0000-0000-0000-00000000000b') = 0, 'membro C de A não vê B');
select pg_temp.recusa($q$insert into public.membros (oficina_id, user_id) values ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b')$q$, 'membro comum não convida');
select pg_temp.ok(pg_temp.linhas($q$update public.membros set papel = 'dono' where user_id = auth.uid()$q$) = 0, 'membro comum não vira dono sozinho');
select pg_temp.ok(pg_temp.linhas($q$delete from public.membros where user_id = '00000000-0000-0000-0000-00000000000a'$q$) = 0, 'membro comum não remove o dono');
select pg_temp.ok(pg_temp.linhas($q$delete from public.oficinas where id = '10000000-0000-0000-0000-00000000000a'$q$) = 0, 'membro comum não apaga a oficina');

select pg_temp.como('00000000-0000-0000-0000-00000000000a');
select pg_temp.recusa($q$delete from public.membros where user_id = auth.uid()$q$, 'o último dono não sai');
select pg_temp.recusa($q$update public.membros set papel = 'membro' where user_id = auth.uid()$q$, 'o último dono não se rebaixa');
select pg_temp.ok(pg_temp.linhas($q$delete from public.membros where user_id = '00000000-0000-0000-0000-00000000000c'$q$) = 1, 'o dono remove o membro C');
select pg_temp.como('00000000-0000-0000-0000-00000000000c');
select pg_temp.ok((select count(*) from public.sobras) = 0, 'C removido não vê mais nada de A');

-- ===== regras dos dados (check)
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
select pg_temp.recusa($q$insert into public.sobras (oficina_id, id, nome, c, l) values ('10000000-0000-0000-0000-00000000000a', 'sx', 'X', 0, 100)$q$, 'medida zero é recusada');
select pg_temp.recusa($q$insert into public.insumos (oficina_id, id, tipo, nome, q) values ('10000000-0000-0000-0000-00000000000a', 'ix', 'fita', 'Fita', -1)$q$, 'quantidade negativa é recusada');
select pg_temp.recusa($q$insert into public.insumos (oficina_id, id, tipo, nome, q, esp, c, l) values ('10000000-0000-0000-0000-00000000000a', 'iy', 'chapa', 'Ch', 2.5, 15, 2750, 1850)$q$, 'chapa com quantidade quebrada é recusada');
select pg_temp.recusa($q$insert into public.insumos (oficina_id, id, tipo, nome, q) values ('10000000-0000-0000-0000-00000000000a', 'iz', 'chapa', 'Ch', 2)$q$, 'chapa sem medidas é recusada');
select pg_temp.recusa($q$insert into public.historico (oficina_id, id, data, tipo) values ('10000000-0000-0000-0000-00000000000a', 'mx', now(), 'saida')$q$, 'saída sem peças é recusada');
select pg_temp.recusa($q$insert into public.projetos (oficina_id, id, entrada) values ('10000000-0000-0000-0000-00000000000a', 'px', '[1]')$q$, 'entrada do projeto precisa ser objeto');
select pg_temp.recusa($q$update public.oficinas set criado_por = '00000000-0000-0000-0000-00000000000b' where id = '10000000-0000-0000-0000-00000000000a'$q$, 'não troca o criador da oficina');

-- ===== o dono apaga a oficina e leva tudo junto
select pg_temp.ok(pg_temp.linhas($q$delete from public.oficinas where id = '10000000-0000-0000-0000-00000000000a'$q$) = 1, 'o dono apaga a oficina');
select pg_temp.ok((select count(*) from public.sobras) = 0 and (select count(*) from public.membros) = 0, 'apagar a oficina apaga dados e membros');

-- o índice do relatório mensal existe
reset role;
select pg_temp.ok(exists (select 1 from pg_indexes where indexname = 'historico_oficina_data_idx'), 'índice historico(oficina_id, data) existe');
select pg_temp.ok((select bool_and(relrowsecurity) from pg_class
  where relnamespace = 'public'::regnamespace and relkind = 'r'), 'RLS ligada em todas as tabelas de public');

rollback;
\echo 'RLS: todos os testes passaram.'
