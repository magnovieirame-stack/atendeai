-- =====================================================================
-- 0007_crm_card_extras.sql
-- Colunas extras do card de CRM (crm-clientesfunil):
--   tags   -> jsonb [{label,color}] exibidas no card (Cliente/Lead + personalizadas)
--   fixado -> card fixado no topo da fase (mesmo conceito do "fixar" da lista)
--   tipo   -> 'cliente' | 'lead' — define a tag automática e a detecção de
--             participante (Lead x Cliente) ao abrir o agendamento.
-- Aplicadas manualmente durante o desenvolvimento; registradas aqui p/ versionar.
-- Idempotente.
-- =====================================================================

alter table public."crm-clientesfunil"
  add column if not exists tags   jsonb   not null default '[]'::jsonb;

alter table public."crm-clientesfunil"
  add column if not exists fixado boolean not null default false;

alter table public."crm-clientesfunil"
  add column if not exists tipo   text    not null default 'cliente';
