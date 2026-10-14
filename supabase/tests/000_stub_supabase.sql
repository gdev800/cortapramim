-- SÓ PARA TESTE EM POSTGRES COMUM. Não rodar no Supabase (lá isso já existe).
-- Imita o mínimo do Supabase: papéis anon/authenticated, auth.users e auth.uid() lendo o JWT da requisição.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated;
-- o Supabase dá estes privilégios por padrão nas tabelas novas; a migração precisa funcionar mesmo assim
alter default privileges in schema public grant all on tables to anon, authenticated;
