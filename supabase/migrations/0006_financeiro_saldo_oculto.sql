-- =====================================================================
-- 0006_financeiro_saldo_oculto.sql
-- Guarda a preferência de visibilidade do saldo de cada conta
-- (olho aberto/fechado no cartão). Idempotente.
-- =====================================================================

alter table public."financeiro-contas"
  add column if not exists saldo_oculto boolean not null default false;
