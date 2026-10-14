# Supabase: banco e RLS

- `migrations/001_inicial.sql`: tabelas (`oficinas`, `membros`, `projetos`, `sobras`, `insumos`, `historico`), regras (`check`),
  gatilhos e RLS. Toda tabela de dados tem `oficina_id`; só membros da oficina leem e gravam; só o dono adiciona ou remove membros.
- `tests/rls.test.sql`: testes de RLS (A não vê B, sem login não lê nada, só o dono convida, regras dos dados).
- `tests/000_stub_supabase.sql`: **só para Postgres comum.** Imita `auth.uid()` e os papéis `anon`/`authenticated`.
  Nunca rodar no Supabase.

## Rodar os testes no computador

Precisa do PostgreSQL 15+ instalado (no Mac: `brew install postgresql@16`).

```bash
npm run test:rls
```

O script sobe um Postgres temporário, aplica a migração do zero como papel comum (igual ao Supabase) e roda os testes.
No GitHub, para rodar o mesmo a cada mudança em `supabase/`, crie `.github/workflows/rls.yml`:

```yaml
name: Testes de RLS (Supabase)
on:
  push:
    branches: [main]
    paths: ['supabase/**', '.github/workflows/rls.yml']
  pull_request:
    paths: ['supabase/**', '.github/workflows/rls.yml']
  workflow_dispatch:
permissions:
  contents: read
jobs:
  rls:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
      - name: PostgreSQL
        run: ls /usr/lib/postgresql/*/bin/initdb || (sudo apt-get update && sudo apt-get install -y postgresql)
      - name: Migração do zero + testes de RLS
        run: bash supabase/tests/run-local.sh
```

## Aplicar no projeto do Supabase

Opção simples (painel): **SQL Editor → New query**, colar o conteúdo de `migrations/001_inicial.sql` e rodar **uma vez**.

Opção com a CLI (recomendada quando houver mais migrações):

```bash
npx supabase login
npx supabase link --project-ref <ref do projeto>   # pede a senha do banco: digite, não guarde no repositório
npx supabase db push
```

Depois de aplicar, confira em **Authentication → Policies** que as 6 tabelas aparecem com RLS ligado.

## Chaves

- **Project URL** e **anon key**: públicas, vão no front. Quem protege os dados é o RLS.
- **service_role key** e **senha do banco**: nunca no repositório, nunca no front, nunca em mensagem.
