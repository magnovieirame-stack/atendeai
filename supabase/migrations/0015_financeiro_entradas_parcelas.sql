-- =====================================================================
-- 0015_financeiro_entradas_parcelas.sql
-- MÓDULO FINANCEIRO · LANÇAMENTOS.
-- Guarda o número de parcelas de um lançamento (boleto/carnê/cartão).
-- O valor da parcela é calculado (valor líquido ÷ parcelas), não persistido.
-- Rode no SQL Editor do Supabase, DEPOIS do 0004. É idempotente.
-- =====================================================================

alter table public."financeiro-entradas"
  add column if not exists parcelas integer;
