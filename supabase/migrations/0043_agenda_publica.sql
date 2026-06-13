-- 0043_agenda_publica.sql
-- MINHA AGENDA (agenda externa / link público de agendamento).
-- ADITIVO e IDEMPOTENTE. Não remove nem altera nada existente.
--
-- IMPORTANTE: a Minha Agenda é POR USUÁRIO, não da empresa. Cada usuário tem a
-- SUA agenda pública (disponibilidade, regras, slug do link e reservas recebidas)
-- dentro do isolamento da empresa. Por isso as tabelas chaveiam por
-- (empresa_id, user_id) — empresa garante o tenant; user_id é a granularidade.
--
-- Padrão do módulo agenda: RLS LIGADO sem policies (só service_role). O isolamento
-- por empresa/usuário é feito NO CÓDIGO (adminClient + .eq('empresa_id') + .eq('user_id')).

-- 1) CONFIG da agenda pública de cada usuário (1 linha por user dentro da empresa).
--    `slug` é o que vai depois de /agendar/ no link público (único globalmente).
--    `config` (jsonb) guarda o estado do drawer: slotDuration, bufferMin, advanceMin,
--    horizon, avail (disponibilidade semanal), overrides (bloqueios por slot) e notif.
create table if not exists public."agenda-publica-config" (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null,
  user_id     uuid not null,
  slug        text not null,
  titulo      text,
  ativa       boolean not null default true,
  config      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 1 config por usuário dentro da empresa; slug único no sistema inteiro (é a chave do link).
create unique index if not exists agenda_publica_config_user_uidx
  on public."agenda-publica-config" (empresa_id, user_id);
create unique index if not exists agenda_publica_config_slug_uidx
  on public."agenda-publica-config" (slug);

alter table public."agenda-publica-config" enable row level security;

-- 2) RESERVAS recebidas pelo link público (cada reserva é de UM usuário-dono).
--    `agenda_id` aponta para o compromisso criado na tabela "agenda" (a reserva
--    vira um compromisso real na agenda do usuário). Os dados do cliente ficam aqui
--    como snapshot do que o cliente preencheu no formulário público.
create table if not exists public."agenda-publica-reservas" (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null,
  user_id     uuid not null,                         -- dono da agenda (quem recebe)
  agenda_id   uuid references public.agenda(id) on delete set null,
  data        text not null,                         -- 'YYYY-MM-DD'
  hora        text not null,                         -- 'HH:MM'
  duracao     integer not null default 30,
  nome        text not null,
  sobrenome   text,
  contato     text,                                  -- WhatsApp/telefone
  email       text,
  local       text,
  assunto     text,
  status      text not null default 'agendado',      -- agendado | cancelado
  created_at  timestamptz not null default now()
);

create index if not exists agenda_publica_reservas_dono_idx
  on public."agenda-publica-reservas" (empresa_id, user_id);
create index if not exists agenda_publica_reservas_data_idx
  on public."agenda-publica-reservas" (empresa_id, user_id, data);

alter table public."agenda-publica-reservas" enable row level security;
