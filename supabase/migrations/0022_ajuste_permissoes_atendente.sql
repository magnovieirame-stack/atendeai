-- =====================================================================
-- 0022_ajuste_permissoes_atendente.sql
-- Ajustes de permissão pós-revisão:
--   - nova permissão granular "crm.mover" (mover card sem poder apagar/
--     reestruturar o funil — isso fica em crm.gerenciar).
--   - atendente ganha clientes.editar e crm.mover.
-- Só dado. Rode DEPOIS da 0020. É idempotente.
-- =====================================================================

-- 1) Nova permissão granular do CRM.
insert into public.permissoes (codigo, nome, grupo) values
  ('crm.mover', 'Mover cards no Kanban', 'crm')
on conflict (codigo) do nothing;

-- 2) super_admin e admin_loja também recebem crm.mover (têm tudo da loja).
insert into public.papel_permissoes (papel_id, permissao_id)
select p.id, perm.id
from public.papeis p, public.permissoes perm
where p.codigo in ('super_admin', 'admin_loja') and perm.codigo = 'crm.mover'
on conflict do nothing;

-- 3) Atendente: + clientes.editar (corrigir dados no atendimento) + crm.mover.
insert into public.papel_permissoes (papel_id, permissao_id)
select p.id, perm.id
from public.papeis p, public.permissoes perm
where p.codigo = 'atendente' and perm.codigo in ('clientes.editar', 'crm.mover')
on conflict do nothing;
