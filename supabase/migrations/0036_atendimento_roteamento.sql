-- =====================================================================
-- 0036_atendimento_roteamento.sql — ROTEAMENTO inicial + distribuição.
-- ADITIVA e IDEMPOTENTE. NÃO remove nada.
--   1) departamentos.distribuicao — 'manual' (atendente pega da fila) ou
--      'auto' (distribuição automática; regras a definir). Default 'manual'.
--   2) atendimento_config — 1 linha por empresa: para onde o CONTATO NOVO vai
--      primeiro: 'ia' (a IA atende) ou 'departamento' (cai na fila do setor).
-- =====================================================================

-- 1) Modo de distribuição por departamento.
alter table public.departamentos
  add column if not exists distribuicao text not null default 'manual';

-- 2) Config de roteamento inicial (por empresa). Tenant = coluna `empresa`.
create table if not exists public.atendimento_config (
  empresa                 uuid primary key references public.empresa_user(id) on delete cascade,
  destino_tipo            text not null default 'ia',     -- 'ia' | 'departamento'
  destino_departamento_id bigint references public.departamentos(id) on delete set null,
  updated_at              timestamptz not null default now()
);

alter table public.atendimento_config enable row level security;
drop policy if exists atendimento_config_tenant_all on public.atendimento_config;
create policy atendimento_config_tenant_all on public.atendimento_config
  for all to authenticated
  using      (empresa in (select public.user_empresa_ids()))
  with check (empresa in (select public.user_empresa_ids()));
