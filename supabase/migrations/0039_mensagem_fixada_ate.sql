-- =====================================================================
-- 0039_mensagem_fixada_ate.sql
-- Tempo de fixação da mensagem (estilo WhatsApp): 24h / 7d / 15d / 30d / 60d / 90d.
-- Guarda a data/hora em que a fixação EXPIRA. NULL = fixada sem prazo (legado).
-- A mensagem deixa de aparecer fixada quando fixada_ate < agora.
-- Mudança ADITIVA e IDEMPOTENTE.
-- =====================================================================

alter table public."chatbot-mensagens"
  add column if not exists fixada_ate timestamptz;
