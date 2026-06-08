-- =====================================================================
-- 0027_empresa_provisionamento.sql
-- ETAPA 1 do PROVISIONAMENTO (cadastro -> tenant real).
-- Só PREPARA o schema: adiciona em empresa_user o vínculo com o plano + o
-- estado do tenant (ativo/trial/suspenso/cancelado). NÃO cria rota nem lógica.
--
-- 100% ADITIVO e IDEMPOTENTE:
--   - add column if not exists -> empresas existentes recebem status='ativo';
--   - NÃO toca em RLS, nas policies, em user_empresa_ids() nem em empresa_membros;
--   - o isolamento por tenant continua valendo como está (automático).
-- Rode no SQL Editor do Supabase.
-- =====================================================================

-- Plano do tenant (preenchido no provisionamento, copiando de plataforma_clientes.plano_id).
alter table public.empresa_user
  add column if not exists plano_id uuid references public.planos(id) on delete set null;

-- Estado do tenant. Default 'ativo' (vale pras empresas que já existem).
alter table public.empresa_user
  add column if not exists status text not null default 'ativo'
  check (status in ('ativo','trial','suspenso','cancelado'));

-- Fim do período de trial (NULL = não está em trial / não expira).
alter table public.empresa_user
  add column if not exists trial_ate date;

-- Quando a loja foi provisionada (NULL = ainda não provisionada / empresas legadas).
alter table public.empresa_user
  add column if not exists provisionado_em timestamptz;

create index if not exists empresa_user_plano_idx  on public.empresa_user (plano_id);
create index if not exists empresa_user_status_idx on public.empresa_user (status);
