-- =====================================================================
-- 0009_integracoes_canais.sql
-- Integração de canais externos (Instagram Direct, e futuramente Facebook).
-- Rode DEPOIS de 0001. Idempotente.
--
-- Guarda, POR EMPRESA, a conexão com cada canal: a conta conectada e o token
-- de acesso CRIPTOGRAFADO (o backend descriptografa só na hora de usar).
-- O token nunca é lido pelo frontend nem sai do servidor.
-- =====================================================================

create table if not exists public.integracoes_canais (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references public.empresa_user(id) on delete cascade,
  canal             text not null check (canal in ('instagram','facebook','whatsapp')),
  status            text not null default 'desconectado' check (status in ('conectado','desconectado','erro')),
  -- id da conta na plataforma (ex.: IG business id). É o "recipient.id" que chega no webhook.
  external_id       text,
  username          text,
  nome              text,
  foto              text,
  -- token de acesso CIFRADO (AES-256-GCM). Nunca em texto puro.
  access_token_enc  text,
  token_expira_em   timestamptz,
  escopos           text,
  ultimo_erro       text,
  meta              jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- uma conexão por canal por empresa (por enquanto)
  unique (empresa_id, canal)
);

-- Mapear webhook -> empresa pelo external_id (recipient da mensagem).
create unique index if not exists integracoes_canal_external
  on public.integracoes_canais (canal, external_id)
  where external_id is not null;

-- Tabela nova criada DEPOIS do 0001 -> precisa ligar o RLS explicitamente aqui.
alter table public.integracoes_canais enable row level security;

-- O usuário só enxerga/gerencia as integrações da(s) empresa(s) dele.
-- (O backend, via service_role, ignora o RLS para o fluxo do webhook.)
drop policy if exists integracoes_tenant_all on public.integracoes_canais;
create policy integracoes_tenant_all on public.integracoes_canais
  for all to authenticated
  using      (empresa_id in (select public.user_empresa_ids()))
  with check (empresa_id in (select public.user_empresa_ids()));

-- Coluna no contato p/ guardar o id do remetente na plataforma (IGSID do cliente).
-- Assim casamos a DM que chega com o contato certo da empresa.
alter table public."chatbot-contatos"
  add column if not exists external_id text;

create index if not exists chatbot_contatos_external
  on public."chatbot-contatos" (origemcontato, external_id)
  where external_id is not null;
