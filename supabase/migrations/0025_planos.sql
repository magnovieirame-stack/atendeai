-- =====================================================================
-- 0025_planos.sql
-- SUPER ADMIN · CATÁLOGO DE PLANOS DA PLATAFORMA.
-- Tabela NOVA e independente. Colunas pros campos principais + jsonb
-- "recursos" pros toggles (canais/modulos/avancados). Limites: null = ilimitado.
-- 100% ADITIVO e IDEMPOTENTE — não toca em nada existente.
-- RLS ligada e SEM policy -> acesso só pelo backend (super admin) via service_role.
-- Rode no SQL Editor do Supabase.
-- =====================================================================

create table if not exists public.planos (
  id uuid primary key default gen_random_uuid(),
  nome        text not null,
  descricao   text,
  preco       numeric(12,2) not null default 0,
  ciclo       text not null default 'mensal' check (ciclo in ('mensal','anual')),
  cor         text default '#22C55E',
  conversas   integer,   -- null = ilimitado
  usuarios    integer,   -- null = ilimitado
  ia_nivel    text not null default 'basica' check (ia_nivel in ('basica','avancada')),
  ia_agentes  integer not null default 1,
  crm         text not null default '1funil',
  relatorios  text not null default 'basico',
  suporte     text not null default 'padrao',
  trial       boolean not null default false,
  trial_dias  integer not null default 0,
  destaque    boolean not null default false,
  status      boolean not null default true,   -- ativo / inativo
  ordem       integer not null default 0,
  recursos    jsonb not null default '{}'::jsonb,  -- { canais:{...}, modulos:{...}, avancados:{...} }
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists planos_status_idx on public.planos (status);
create index if not exists planos_ordem_idx  on public.planos (ordem);

-- RLS: ligada e SEM policy -> só o backend (super admin) via service_role.
alter table public.planos enable row level security;

-- Seed dos 3 planos padrão (idempotente: só insere se ainda não existir pelo nome).
insert into public.planos (nome, descricao, preco, ciclo, conversas, usuarios, ia_nivel, ia_agentes, crm, relatorios, suporte, trial, trial_dias, destaque, status, ordem, recursos)
select 'Starter', 'IA básica, CRM 1 board, Agenda', 197, 'mensal', 500, 2, 'basica', 1, '1funil', 'basico', 'padrao', true, 7, false, true, 1,
  '{"canais":{"whatsapp":true,"instagram":false,"facebook":false,"site":false},"modulos":{"comercial":true,"financeiro":false,"agenda":true,"catalogo":false,"marketing":false},"avancados":{"api":false,"automacoes":false,"whitelabel":false,"dominio":false}}'::jsonb
where not exists (select 1 from public.planos where nome = 'Starter');

insert into public.planos (nome, descricao, preco, ciclo, conversas, usuarios, ia_nivel, ia_agentes, crm, relatorios, suporte, trial, trial_dias, destaque, status, ordem, recursos)
select 'Pro', 'IA avançada, CRM ilimitado, Agenda, Catálogo', 397, 'mensal', 2000, 5, 'avancada', 1, 'ilimitado', 'basico', 'padrao', true, 7, true, true, 2,
  '{"canais":{"whatsapp":true,"instagram":true,"facebook":true,"site":false},"modulos":{"comercial":true,"financeiro":true,"agenda":true,"catalogo":true,"marketing":false},"avancados":{"api":false,"automacoes":false,"whitelabel":false,"dominio":false}}'::jsonb
where not exists (select 1 from public.planos where nome = 'Pro');

insert into public.planos (nome, descricao, preco, ciclo, conversas, usuarios, ia_nivel, ia_agentes, crm, relatorios, suporte, trial, trial_dias, destaque, status, ordem, recursos)
select 'Business', 'Tudo do Pro + integrações + relatórios avançados + suporte prioritário', 897, 'mensal', 8000, 15, 'avancada', 3, 'ilimitado', 'avancado', 'prioritario', true, 7, false, true, 3,
  '{"canais":{"whatsapp":true,"instagram":true,"facebook":true,"site":true},"modulos":{"comercial":true,"financeiro":true,"agenda":true,"catalogo":true,"marketing":true},"avancados":{"api":true,"automacoes":true,"whitelabel":false,"dominio":false}}'::jsonb
where not exists (select 1 from public.planos where nome = 'Business');
