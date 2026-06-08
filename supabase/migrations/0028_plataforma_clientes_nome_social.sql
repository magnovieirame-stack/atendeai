-- =====================================================================
-- 0028_plataforma_clientes_nome_social.sql
-- "Nome social" = nome de exibição (curto) do DONO da loja.
--   PF: o nome social da própria pessoa.
--   PJ: o nome social do responsável.
-- (Não confundir com nome_fantasia, que é o nome da LOJA.)
-- 100% ADITIVO e IDEMPOTENTE — não toca em RLS/policies nem em nada existente.
-- =====================================================================

alter table public.plataforma_clientes
  add column if not exists nome_social text;
