-- =====================================================================
-- 0011_catalogo_produtos.sql
-- MÓDULO COMERCIAL · CATÁLOGO (produtos e serviços).
-- Tabela: "catalogo-produtos"  [tenant: empresa_id]
-- Padrão igual ao módulo Leads: RLS LIGADO sem policies -> só o
-- service_role (backend via adminClient) acessa. O backend SEMPRE
-- filtra por empresa_id (isolamento por tenant). O navegador nunca
-- fala direto com o Supabase.
-- Rode UMA vez no SQL Editor do Supabase, DEPOIS do 0001. É idempotente.
-- =====================================================================

create table if not exists public."catalogo-produtos" (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresa_user(id) on delete cascade,

  -- núcleo
  tipo        text    not null default 'produto' check (tipo in ('produto','servico')),
  nome        text    not null,
  sku         text,
  categoria   text,
  descricao_curta text,
  descricao   text,

  -- preço & estoque
  preco       numeric not null default 0,
  preco_promo numeric,
  custo       numeric,
  unidade     text    default 'un',
  estoque     numeric not null default 0,
  estoque_min numeric not null default 0,

  -- flags
  ativo            boolean not null default true,
  aparece_catalogo boolean not null default true,

  -- serviço (quando tipo = 'servico')
  duracao            integer,
  local              text,
  requer_agendamento boolean default true,

  -- etiquetas simples (array de strings)
  tags jsonb not null default '[]'::jsonb,

  -- guarda o que ainda não tem coluna própria (variantes, treino da IA,
  -- metadados de mídia). Assim nada que o usuário digitar é perdido e
  -- podemos "promover" campos para colunas reais numa 2ª etapa.
  extras jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índice para a listagem por empresa (ordenada por criação).
create index if not exists catalogo_produtos_empresa_idx
  on public."catalogo-produtos" (empresa_id, created_at desc);

-- Tabelas novas nascem com RLS DESLIGADO. Ligamos aqui (sem policies),
-- deixando a tabela acessível apenas ao service_role do backend.
alter table public."catalogo-produtos" enable row level security;

-- updated_at automático em cada UPDATE.
create or replace function public.catalogo_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

drop trigger if exists catalogo_produtos_touch on public."catalogo-produtos";
create trigger catalogo_produtos_touch
  before update on public."catalogo-produtos"
  for each row execute function public.catalogo_touch_updated_at();
