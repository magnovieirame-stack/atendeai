-- =====================================================================
-- 0003_crm_rls.sql
-- Políticas RLS do MÓDULO CRM (funil Kanban) + coluna de descrição.
-- Rode DEPOIS de 0001. Idempotente.
-- =====================================================================

-- crm-funil  (coluna de tenant: empresa_user_id)
drop policy if exists crm_funil_tenant_all on public."crm-funil";
create policy crm_funil_tenant_all on public."crm-funil"
  for all to authenticated
  using      (empresa_user_id in (select public.user_empresa_ids()))
  with check (empresa_user_id in (select public.user_empresa_ids()));

-- crm-fasefunil  (sem coluna de empresa -> herda do funil)
drop policy if exists crm_fase_tenant_all on public."crm-fasefunil";
create policy crm_fase_tenant_all on public."crm-fasefunil"
  for all to authenticated
  using (exists (
    select 1 from public."crm-funil" f
    where f.id = "crm-fasefunil".funil
      and f.empresa_user_id in (select public.user_empresa_ids())
  ))
  with check (exists (
    select 1 from public."crm-funil" f
    where f.id = "crm-fasefunil".funil
      and f.empresa_user_id in (select public.user_empresa_ids())
  ));

-- crm-clientesfunil  (coluna de tenant: empresa_id)
drop policy if exists crm_cli_tenant_all on public."crm-clientesfunil";
create policy crm_cli_tenant_all on public."crm-clientesfunil"
  for all to authenticated
  using      (empresa_id in (select public.user_empresa_ids()))
  with check (empresa_id in (select public.user_empresa_ids()));

-- Coluna opcional de descrição do funil (a tela tem o campo "descrição").
alter table public."crm-funil" add column if not exists descricao text;
