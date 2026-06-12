-- =====================================================================
-- 0038_mensagens_acoes.sql
-- Ações por mensagem no chat (estilo WhatsApp Web): Responder, Fixar, Favoritar.
-- "Apagar" REAPROVEITA a coluna já existente "apagado-pra-todos" (sem coluna nova).
-- Mudanças ADITIVAS e IDEMPOTENTES — nada é removido nem alterado do que já existe.
-- =====================================================================

-- Responder: id da mensagem citada. Guardado como TEXTO p/ casar com qualquer
-- tipo de id (uuid/bigint) — o front resolve a citação localmente. NULL = msg normal.
alter table public."chatbot-mensagens"
  add column if not exists responde_a text;

-- Fixar: mensagem fixada na conversa (faixa no topo, estilo WhatsApp).
alter table public."chatbot-mensagens"
  add column if not exists fixada boolean not null default false;

-- Favoritar: mensagem marcada com estrela.
alter table public."chatbot-mensagens"
  add column if not exists favoritada boolean not null default false;

-- Índices leves p/ listar fixadas/favoritadas por conversa.
create index if not exists idx_msg_fixada
  on public."chatbot-mensagens" (contato) where fixada;
create index if not exists idx_msg_favoritada
  on public."chatbot-mensagens" (contato) where favoritada;
