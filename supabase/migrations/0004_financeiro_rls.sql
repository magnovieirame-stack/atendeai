-- =====================================================================
-- 0004_financeiro_rls.sql
-- Políticas RLS do MÓDULO FINANCEIRO (contas + entradas/lançamentos).
-- Rode DEPOIS de 0001. Idempotente.
-- =====================================================================

-- financeiro-contas  (coluna de tenant: empresaid)
drop policy if exists fin_contas_tenant_all on public."financeiro-contas";
create policy fin_contas_tenant_all on public."financeiro-contas"
  for all to authenticated
  using      (empresaid in (select public.user_empresa_ids()))
  with check (empresaid in (select public.user_empresa_ids()));

-- financeiro-entradas  (coluna de tenant: empresaid)
drop policy if exists fin_entradas_tenant_all on public."financeiro-entradas";
create policy fin_entradas_tenant_all on public."financeiro-entradas"
  for all to authenticated
  using      (empresaid in (select public.user_empresa_ids()))
  with check (empresaid in (select public.user_empresa_ids()));
