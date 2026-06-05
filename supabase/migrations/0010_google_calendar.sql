-- =====================================================================
-- 0010_google_calendar.sql
-- Integração com o Google Calendar (sincroniza compromissos da Agenda).
-- Rode DEPOIS de 0009. Idempotente.
--
-- Reusa a tabela integracoes_canais (guarda o refresh_token CIFRADO do Google).
-- Adiciona o canal 'google_calendar' e uma coluna na agenda para lembrar o id
-- do evento criado no Google (necessário para atualizar/excluir depois).
-- =====================================================================

-- 1) Permite o novo canal na tabela de integrações.
alter table public.integracoes_canais drop constraint if exists integracoes_canais_canal_check;
alter table public.integracoes_canais
  add constraint integracoes_canais_canal_check
  check (canal in ('instagram','facebook','whatsapp','google_calendar'));

-- 2) Liga cada compromisso ao evento correspondente no Google Calendar.
alter table public.agenda
  add column if not exists gcal_event_id text;
