-- =====================================================================
-- 0013_catalogo_estoque_unidades.sql
-- MÓDULO COMERCIAL · CATÁLOGO.
--   1) Coluna "controla_estoque" em catalogo-produtos (toggle de estoque).
--   2) Tabela "catalogo-unidades" (unidades personalizadas por empresa).
-- Rode no SQL Editor do Supabase, DEPOIS do 0011. É idempotente.
-- =====================================================================

-- 1) Controle de estoque por item. true = controla entradas/saídas;
--    false = vende sem estoque (mostra "Livre" na lista).
alter table public."catalogo-produtos"
  add column if not exists controla_estoque boolean not null default true;

-- 2) Unidades de medida personalizadas (além das padrão do sistema).
--    O produto guarda apenas a SIGLA (ex: 'UN', 'CX'); esta tabela serve
--    para o usuário cadastrar siglas próprias que aparecem no dropdown.
create table if not exists public."catalogo-unidades" (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresa_user(id) on delete cascade,
  nome       text not null,
  sigla      text not null,
  created_at timestamptz not null default now(),
  unique (empresa_id, sigla)
);

create index if not exists catalogo_unidades_empresa_idx
  on public."catalogo-unidades" (empresa_id);

-- RLS ligado (sem policies) — acesso só pelo service_role do backend.
alter table public."catalogo-unidades" enable row level security;
