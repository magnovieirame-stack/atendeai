-- =====================================================================
-- 0023_permissao_atendimento_gerenciar.sql
-- Permissão administrativa do atendimento: ações destrutivas/compartilhadas
-- (excluir tag, excluir resposta-rápida, apagar contato/conversa inteira).
-- O atendente PODE criar/editar tags e respostas e responder/encerrar, mas
-- NÃO pode apagar de vez. Esta permissão NÃO vai para o atendente.
-- Só dado. Rode DEPOIS da 0020. É idempotente.
-- =====================================================================

insert into public.permissoes (codigo, nome, grupo) values
  ('atendimento.gerenciar', 'Excluir tags/respostas e apagar contatos (admin)', 'atendimento')
on conflict (codigo) do nothing;

-- super_admin e admin_loja recebem (têm tudo da loja). Atendente NÃO recebe.
insert into public.papel_permissoes (papel_id, permissao_id)
select p.id, perm.id
from public.papeis p, public.permissoes perm
where p.codigo in ('super_admin', 'admin_loja') and perm.codigo = 'atendimento.gerenciar'
on conflict do nothing;
