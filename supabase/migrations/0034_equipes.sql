-- =====================================================================
-- 0034_equipes.sql
-- EQUIPES de atendimento/venda. ADITIVA e IDEMPOTENTE. NÃO remove nada.
--   1) equipes        — cada equipe pertence a 1 departamento (opcional);
--                       um departamento pode ter VÁRIAS equipes.
--   2) equipe_membros — N-N usuário × equipe (um atendente pode estar em
--                       várias equipes). Sem FK p/ auth.users (padrão do projeto:
--                       guardamos só o user_id; o vínculo de empresa garante o tenant).
-- Tenant = coluna `empresa` (mesmo nome usado em `departamentos`), p/ casar com
-- a policy genérica e o cadastros.routes.
-- Rode no SQL Editor do Supabase. Reexecutável.
-- =====================================================================

-- 1) Equipes (por tenant). departamento_id NULL = equipe ainda sem departamento.
--    on delete set null: apagar o departamento NÃO apaga a equipe (só desvincula).
create table if not exists public.equipes (
  id               uuid primary key default gen_random_uuid(),
  empresa          uuid not null references public.empresa_user(id) on delete cascade,
  nome             text not null,
  descricao        text,
  cor              text,
  departamento_id  bigint references public.departamentos(id) on delete set null,  -- departamentos.id é bigint (legado)
  responsavel_id   uuid,                 -- usuário responsável (snapshot do nome ao lado)
  responsavel_nome text,
  ativo            boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_equipes_empresa      on public.equipes (empresa);
create index if not exists idx_equipes_departamento on public.equipes (departamento_id);

-- 2) Membros da equipe (N-N usuário × equipe). PK composta evita duplicar vínculo.
create table if not exists public.equipe_membros (
  equipe_id  uuid not null references public.equipes(id) on delete cascade,
  user_id    uuid not null,
  created_at timestamptz not null default now(),
  primary key (equipe_id, user_id)
);
create index if not exists idx_equipe_membros_user on public.equipe_membros (user_id);

-- 3) RLS por tenant (mesmo padrão de `departamentos` na 0002).
alter table public.equipes        enable row level security;
alter table public.equipe_membros enable row level security;

drop policy if exists equipes_tenant_all on public.equipes;
create policy equipes_tenant_all on public.equipes
  for all to authenticated
  using      (empresa in (select public.user_empresa_ids()))
  with check (empresa in (select public.user_empresa_ids()));

-- equipe_membros não tem coluna de empresa -> herda do vínculo com `equipes`.
drop policy if exists equipe_membros_tenant_all on public.equipe_membros;
create policy equipe_membros_tenant_all on public.equipe_membros
  for all to authenticated
  using (exists (
    select 1 from public.equipes e
    where e.id = equipe_membros.equipe_id
      and e.empresa in (select public.user_empresa_ids())
  ))
  with check (exists (
    select 1 from public.equipes e
    where e.id = equipe_membros.equipe_id
      and e.empresa in (select public.user_empresa_ids())
  ));
