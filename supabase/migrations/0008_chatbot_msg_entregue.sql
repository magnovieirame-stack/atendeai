-- =====================================================================
-- 0008_chatbot_msg_entregue.sql
-- Status de entrega da mensagem (check simples x duplo, estilo WhatsApp),
-- exibido na prévia da última mensagem na lista de conversas.
--   true  = entregue ao destino  (✓✓)
--   false = enviada, ainda não entregue (✓)
-- Um gateway real do WhatsApp pode atualizar este campo no futuro.
-- Aplicada manualmente durante o desenvolvimento; registrada aqui p/ versionar.
-- Idempotente.
-- =====================================================================

alter table public."chatbot-mensagens"
  add column if not exists entregue boolean not null default true;
