-- Corta pra Mim — modelo de dados inicial (Parte 7, fase 19).
-- Cada marcenaria é uma "oficina". Todo dado tem oficina_id e o próprio banco (RLS) só deixa
-- membros da oficina lerem e gravarem. Analogia: a tela é o porteiro; o RLS é a fechadura de cada sala.
--
-- Ids: as tabelas de dados usam o mesmo id de texto que o app já gera no navegador ('s…', 'm…', 'p…'),
-- com chave (oficina_id, id). Assim o "importar o que está neste navegador" (Parte 9) não troca ids.

create extension if not exists pgcrypto;

-- Funções de permissão ficam fora do schema "public" (que a API expõe).
create schema if not exists privado;
revoke all on schema privado from public;

-- ---------------------------------------------------------------- tabelas

create table public.oficinas (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null check (char_length(btrim(nome)) between 1 and 120),
  criado_por  uuid not null default auth.uid() references auth.users (id) on delete restrict,
  criado_em   timestamptz not null default now()
);

create table public.membros (
  oficina_id  uuid not null references public.oficinas (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  papel       text not null default 'membro' check (papel in ('dono', 'membro')),
  criado_em   timestamptz not null default now(),
  primary key (oficina_id, user_id)
);
create index membros_user_idx on public.membros (user_id);

create table public.projetos (
  oficina_id    uuid not null references public.oficinas (id) on delete cascade,
  id            text not null check (char_length(id) between 1 and 64),
  nome          text not null default '' check (char_length(nome) <= 200),
  status        text not null default 'orcado' check (char_length(status) between 1 and 30),
  cliente       text not null default '' check (char_length(cliente) <= 200),
  valor         numeric(14, 2) not null default 0 check (valor >= 0),
  -- o que foi digitado (chapas, peças, ferragens, orçamento) e o plano calculado
  entrada       jsonb not null default '{}'::jsonb check (jsonb_typeof(entrada) = 'object'),
  plano         jsonb check (plano is null or jsonb_typeof(plano) = 'object'),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (oficina_id, id)
);

-- Sobras (retalhos guardados). Medidas em mm.
create table public.sobras (
  oficina_id    uuid not null references public.oficinas (id) on delete cascade,
  id            text not null check (char_length(id) between 1 and 64),
  nome          text not null check (char_length(btrim(nome)) between 1 and 200),
  esp           numeric(6, 2) not null default 0 check (esp >= 0),
  c             numeric(10, 2) not null check (c > 0),
  l             numeric(10, 2) not null check (l > 0),
  veio          boolean not null default false,
  obs           text not null default '' check (char_length(obs) <= 500),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (oficina_id, id)
);

-- Chapas inteiras, fita (m) e ferragens (un). Chapa: espessura e tamanho em mm, quantidade inteira.
create table public.insumos (
  oficina_id    uuid not null references public.oficinas (id) on delete cascade,
  id            text not null check (char_length(id) between 1 and 64),
  tipo          text not null check (tipo in ('chapa', 'fita', 'ferr')),
  nome          text not null check (char_length(btrim(nome)) between 1 and 200),
  q             numeric(12, 2) not null default 0 check (q >= 0 and q <= 1000000),
  min           numeric(12, 2) check (min is null or (min > 0 and min <= 1000000)),
  esp           numeric(6, 2),
  c             numeric(10, 2),
  l             numeric(10, 2),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (oficina_id, id),
  constraint insumos_chapa_ck check (
    tipo <> 'chapa' or (coalesce(esp, 0) > 0 and coalesce(c, 0) > 0 and coalesce(l, 0) > 0
                       and q = trunc(q) and (min is null or min = trunc(min)))
  )
);

-- Histórico de movimentações (o "extrato" do estoque). Colunas tipadas para o relatório mensal somar no banco.
-- A foto para "desfazer o último" fica só no navegador (é grande e só serve ao último movimento).
create table public.historico (
  oficina_id     uuid not null references public.oficinas (id) on delete cascade,
  id             text not null check (char_length(id) between 1 and 64),
  data           timestamptz not null,
  tipo           text not null check (tipo in ('saida', 'entrada', 'ajuste')),
  -- saída de um plano
  projeto        text check (char_length(projeto) <= 200),
  pecas          integer check (pecas >= 0),
  chapas         jsonb check (chapas is null or jsonb_typeof(chapas) = 'array'),     -- [{nome, esp, q}]
  ferragens      jsonb check (ferragens is null or jsonb_typeof(ferragens) = 'array'), -- [{nome, q}]
  sobras_usadas  integer check (sobras_usadas >= 0),
  sobras_novas   integer check (sobras_novas >= 0),
  fita_m         numeric(12, 2) check (fita_m >= 0),
  area_pecas     numeric(12, 2) check (area_pecas >= 0),
  area_chapas    numeric(12, 2) check (area_chapas >= 0),
  area_perda     numeric(12, 2) check (area_perda >= 0),
  custo          numeric(14, 2) check (custo >= 0),
  economia       numeric(14, 2) check (economia >= 0),
  -- entrada e ajuste
  item_tipo      text check (item_tipo in ('sobra', 'chapa', 'fita', 'ferr')),
  item_nome      text check (char_length(item_nome) <= 300),
  q              numeric(12, 2),
  de             numeric(12, 2),
  para           numeric(12, 2),
  un             text check (char_length(un) <= 10),
  obs            text check (char_length(obs) <= 500),
  criado_em      timestamptz not null default now(),
  primary key (oficina_id, id),
  constraint historico_tipo_ck check (
    (tipo = 'saida' and pecas is not null and item_tipo is null)
    or (tipo = 'entrada' and item_tipo is not null and q is not null)
    or (tipo = 'ajuste' and item_tipo is not null and de is not null and para is not null)
  )
);
-- relatório mensal: filtra por oficina e intervalo de datas
create index historico_oficina_data_idx on public.historico (oficina_id, data);

-- ---------------------------------------------------------------- funções e gatilhos

-- security definer para consultar "membros" sem cair no próprio RLS (evita recursão);
-- search_path vazio para ninguém trocar uma tabela por outra com o mesmo nome.
create or replace function privado.e_membro(p_oficina uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.membros m where m.oficina_id = p_oficina and m.user_id = auth.uid());
$$;

create or replace function privado.e_dono(p_oficina uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.membros m where m.oficina_id = p_oficina and m.user_id = auth.uid() and m.papel = 'dono');
$$;

-- Quem cria a oficina vira o dono dela.
create or replace function privado.oficina_criada()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.membros (oficina_id, user_id, papel) values (new.id, new.criado_por, 'dono');
  return new;
end $$;
create trigger oficina_criada after insert on public.oficinas
  for each row execute function privado.oficina_criada();

-- A oficina nunca fica sem dono (remover ou rebaixar o último dono é recusado).
-- Exceção: quando a própria oficina está sendo apagada (cascade).
create or replace function privado.manter_um_dono()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.papel = 'dono'
     and (tg_op = 'DELETE' or new.papel <> 'dono')
     and exists (select 1 from public.oficinas o where o.id = old.oficina_id)
     and not exists (select 1 from public.membros m
                     where m.oficina_id = old.oficina_id and m.papel = 'dono' and m.user_id <> old.user_id) then
    raise exception 'A oficina precisa de pelo menos um dono.' using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end $$;
create trigger manter_um_dono before update or delete on public.membros
  for each row execute function privado.manter_um_dono();

-- Campos que não mudam depois de criados.
create or replace function privado.imutaveis_oficina()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.criado_por <> old.criado_por or new.id <> old.id then
    raise exception 'Não é permitido trocar o criador ou o id da oficina.' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger imutaveis_oficina before update on public.oficinas
  for each row execute function privado.imutaveis_oficina();

create or replace function privado.carimbar_atualizacao()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.atualizado_em := now();
  return new;
end $$;
create trigger carimbar before update on public.projetos for each row execute function privado.carimbar_atualizacao();
create trigger carimbar before update on public.sobras   for each row execute function privado.carimbar_atualizacao();
create trigger carimbar before update on public.insumos  for each row execute function privado.carimbar_atualizacao();

-- ---------------------------------------------------------------- permissões e RLS

-- Sem login não há acesso nenhum; logado, o RLS decide linha a linha.
revoke all on all tables in schema public from anon;
revoke all on all functions in schema privado from public, anon;
grant usage on schema privado to authenticated;
grant execute on function privado.e_membro(uuid), privado.e_dono(uuid) to authenticated;
grant select, insert, update, delete on public.oficinas, public.membros, public.projetos,
  public.sobras, public.insumos, public.historico to authenticated;

alter table public.oficinas  enable row level security;
alter table public.membros   enable row level security;
alter table public.projetos  enable row level security;
alter table public.sobras    enable row level security;
alter table public.insumos   enable row level security;
alter table public.historico enable row level security;
-- Sem "force row level security": o dono das tabelas (postgres) precisa passar pelo RLS nas funções
-- security definer acima. O app nunca usa esse papel; usa anon/authenticated, que sempre passam pelo RLS.

-- oficinas: membros veem; qualquer usuário logado cria a sua; só o dono renomeia ou apaga.
create policy oficinas_ler on public.oficinas for select to authenticated
  using (privado.e_membro(id) or criado_por = auth.uid());
create policy oficinas_criar on public.oficinas for insert to authenticated
  with check (criado_por = auth.uid());
create policy oficinas_editar on public.oficinas for update to authenticated
  using (privado.e_dono(id)) with check (privado.e_dono(id));
create policy oficinas_apagar on public.oficinas for delete to authenticated
  using (privado.e_dono(id));

-- membros: membros veem a equipe; só o dono adiciona, muda o papel ou remove.
create policy membros_ler on public.membros for select to authenticated
  using (privado.e_membro(oficina_id));
create policy membros_adicionar on public.membros for insert to authenticated
  with check (privado.e_dono(oficina_id));
create policy membros_editar on public.membros for update to authenticated
  using (privado.e_dono(oficina_id)) with check (privado.e_dono(oficina_id));
create policy membros_remover on public.membros for delete to authenticated
  using (privado.e_dono(oficina_id));

-- dados da oficina: qualquer membro lê e grava; ninguém de fora.
create policy projetos_membros on public.projetos for all to authenticated
  using (privado.e_membro(oficina_id)) with check (privado.e_membro(oficina_id));
create policy sobras_membros on public.sobras for all to authenticated
  using (privado.e_membro(oficina_id)) with check (privado.e_membro(oficina_id));
create policy insumos_membros on public.insumos for all to authenticated
  using (privado.e_membro(oficina_id)) with check (privado.e_membro(oficina_id));
create policy historico_membros on public.historico for all to authenticated
  using (privado.e_membro(oficina_id)) with check (privado.e_membro(oficina_id));
