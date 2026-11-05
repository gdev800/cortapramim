-- 002: endurecimento das regras (Parte 10, segurança). Só acrescenta: não muda o que a 001 já garante.
--
-- 1) Histórico é um extrato: membro lê e registra; ninguém edita um lançamento antigo.
--    Apagar só o próprio lançamento (é o "desfazer o último" do app) ou, se for o dono, qualquer um.
--    Analogia: é o livro-caixa. Lançamento errado se estorna com outro lançamento, não se apaga a página.
-- 2) Limite de tamanho nos campos JSON (um cliente adulterado podia gravar megabytes num projeto).

-- ---------------------------------------------------------------- 1) histórico

alter table public.historico
  add column criado_por uuid default auth.uid() references auth.users (id) on delete set null;

drop policy historico_membros on public.historico;

create policy historico_ler on public.historico for select to authenticated
  using (privado.e_membro(oficina_id));
create policy historico_registrar on public.historico for insert to authenticated
  with check (privado.e_membro(oficina_id) and criado_por = auth.uid());
create policy historico_apagar on public.historico for delete to authenticated
  using ((privado.e_membro(oficina_id) and criado_por = auth.uid()) or privado.e_dono(oficina_id));
-- sem política de update: nenhuma edição passa pelo RLS; e o privilégio também sai, para o erro ser claro
revoke update on public.historico from authenticated;

-- ---------------------------------------------------------------- 2) tamanho do JSON

-- o app já descarta o plano acima de ~170 KB ao salvar (ProjectPanel); o banco aceita com folga e para no absurdo
alter table public.projetos
  add constraint projetos_entrada_tamanho_ck check (octet_length(entrada::text) <= 1048576),       -- 1 MB
  add constraint projetos_plano_tamanho_ck check (plano is null or octet_length(plano::text) <= 2097152); -- 2 MB

alter table public.historico
  add constraint historico_json_tamanho_ck check (
    (chapas is null or octet_length(chapas::text) <= 65536) and (ferragens is null or octet_length(ferragens::text) <= 65536)
  );
