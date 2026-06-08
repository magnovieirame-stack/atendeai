-- =====================================================================
-- 0014_catalogo_movimentacoes.sql
-- MÓDULO COMERCIAL · CATÁLOGO · HISTÓRICO.
-- Tabela "catalogo-movimentacoes": linha do tempo de eventos de cada item
-- (cadastro, edição e — futuramente — entrada/saída de estoque e vendas).
-- Rode no SQL Editor do Supabase, DEPOIS do 0011. É idempotente.
-- =====================================================================

create table if not exists public."catalogo-movimentacoes" (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresa_user(id) on delete cascade,
  produto_id uuid not null references public."catalogo-produtos"(id) on delete cascade,
  -- tipos já previstos (entrada/saida/venda entram nas próximas fases):
  tipo       text not null check (tipo in ('cadastro','edicao','entrada','saida','venda')),
  descricao  text,
  autor      text,
  quantidade numeric,   -- usado por entrada/saida/venda
  valor      numeric,   -- usado por venda
  created_at timestamptz not null default now()
);

create index if not exists catalogo_mov_produto_idx
  on public."catalogo-movimentacoes" (produto_id, created_at desc);

-- RLS ligado (sem policies) — acesso só pelo service_role do backend.
alter table public."catalogo-movimentacoes" enable row level security;
