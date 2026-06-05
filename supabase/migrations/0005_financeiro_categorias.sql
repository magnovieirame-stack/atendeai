-- =====================================================================
-- 0005_financeiro_categorias.sql
-- Categorias de movimentação do financeiro (usadas em Aporte/Retirada).
-- Cada categoria tem um tipo: Financeira | Produto | Cliente.
-- Rode DEPOIS de 0001. Idempotente.
-- =====================================================================

create table if not exists public."financeiro-categorias" (
  id         uuid primary key default gen_random_uuid(),
  empresaid  uuid not null references public.empresa_user(id) on delete cascade,
  nome       text not null,
  tipo       text not null default 'Financeira' check (tipo in ('Financeira','Produto','Cliente')),
  created_at timestamptz not null default now(),
  unique (empresaid, nome)
);

-- RLS: cada empresa só enxerga/edita as próprias categorias (mesmo padrão do módulo).
alter table public."financeiro-categorias" enable row level security;

drop policy if exists fin_categorias_tenant_all on public."financeiro-categorias";
create policy fin_categorias_tenant_all on public."financeiro-categorias"
  for all to authenticated
  using      (empresaid in (select public.user_empresa_ids()))
  with check (empresaid in (select public.user_empresa_ids()));
