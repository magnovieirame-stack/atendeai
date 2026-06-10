-- =====================================================================
-- 0035_chatbot_atribuicao.sql
-- ATRIBUIÇÃO / TRANSFERÊNCIA de conversas. ADITIVA e IDEMPOTENTE.
-- A tabela `chatbot-contatos` já tem `atendente` e `departamento` (TEXTO, legado).
-- Aqui adicionamos as versões por ID (UUID) — fonte da verdade para o ISOLAMENTO
-- (atendente vê o que é do seu departamento + atribuído a ele) e a transferência.
-- Os campos de texto NÃO são removidos (continuam como snapshot/compat).
-- Rode no SQL Editor do Supabase. Reexecutável.
-- =====================================================================

-- atendente_id    = dono atual da conversa (NULL = sem dono / pool / IA).
-- departamento_id = departamento que atende a conversa (NULL = sem depto / geral).
-- Sem FK p/ não acoplar a delete de usuário; departamento_id aponta p/ departamentos
-- mas SEM FK (mesmo padrão dos carimbos de tenant do projeto — ex.: filial_id).
-- atendente_id = id do usuário (uuid, do Auth). departamento_id = departamentos.id (bigint, legado).
alter table public."chatbot-contatos" add column if not exists atendente_id    uuid;
alter table public."chatbot-contatos" add column if not exists departamento_id bigint;

create index if not exists idx_contatos_atendente    on public."chatbot-contatos" (atendente_id);
create index if not exists idx_contatos_departamento on public."chatbot-contatos" (departamento_id);
