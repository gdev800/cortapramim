#!/usr/bin/env bash
# Sobe um Postgres temporário, aplica a migração do zero e roda os testes de RLS. Precisa do PostgreSQL 15+ instalado.
# A migração roda como um papel comum (sem superusuário), como o "postgres" do Supabase.
# Uso: bash supabase/tests/run-local.sh   (ou npm run test:rls)
set -euo pipefail
cd "$(dirname "$0")/../.."
BIN="${PG_BIN:-$(dirname "$(command -v initdb 2>/dev/null || ls -d /usr/lib/postgresql/*/bin/initdb | tail -1)")}"
TMP="$(mktemp -d)"; PORT="${PG_PORT:-55432}"
trap '"$BIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT
"$BIN/initdb" -D "$TMP/data" -U superusuario -A trust >/dev/null
"$BIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" -w start >/dev/null
P=(psql -X -q -v ON_ERROR_STOP=1 -h "$TMP" -p "$PORT" -d postgres)
"${P[@]}" -U superusuario -f supabase/tests/000_stub_supabase.sql
"${P[@]}" -U superusuario -c "create role dono_tabelas login createrole; grant create on database postgres to dono_tabelas; grant all on schema public to dono_tabelas; grant usage on schema auth to dono_tabelas; grant select, references on auth.users to dono_tabelas; grant anon, authenticated to dono_tabelas;"
for f in supabase/migrations/*.sql; do echo "migração: $f"; "${P[@]}" -U dono_tabelas -f "$f"; done
"${P[@]}" -U superusuario -o /dev/null -f supabase/tests/rls.test.sql 2>&1 | sed 's/^psql:[^ ]* NOTICE:  /  /'
