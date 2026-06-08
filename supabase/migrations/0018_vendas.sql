-- =====================================================================
-- 0018_vendas.sql
-- MÓDULO COMERCIAL · VENDAS (PDV / Balcão).
-- "vendas" = cabeçalho da venda (cliente, vendedor, totais, pagamentos).
-- "venda-itens" = linhas (produtos/itens vendidos).
-- Ao fechar a venda, o backend baixa estoque, registra no histórico do
-- produto, gera a receita no Financeiro e vira o cliente lead->cliente.
-- Rode no SQL Editor do Supabase, DEPOIS do 0011/0016. É idempotente.
-- =====================================================================

create table if not exists public.vendas (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresa_user(id) on delete cascade,
  codigo     text,
  cliente_id   uuid references public.clientes(id) on delete set null,
  cliente_nome text,
  vendedor   text,
  subtotal   numeric not null default 0,
  desconto   numeric not null default 0,
  acrescimo  numeric not null default 0,
  total      numeric not null default 0,
  pagamentos jsonb   not null default '[]'::jsonb,  -- [{metodo, valor, parcelas}]
  status     text    not null default 'concluida',
  created_at timestamptz not null default now()
);

create table if not exists public."venda-itens" (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresa_user(id) on delete cascade,
  venda_id   uuid not null references public.vendas(id) on delete cascade,
  produto_id uuid references public."catalogo-produtos"(id) on delete set null,
  nome       text,
  preco      numeric not null default 0,
  quantidade numeric not null default 1,
  subtotal   numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists vendas_empresa_idx        on public.vendas (empresa_id, created_at desc);
create index if not exists vendas_cliente_idx         on public.vendas (cliente_id);
create index if not exists venda_itens_venda_idx      on public."venda-itens" (venda_id);
create index if not exists venda_itens_produto_idx    on public."venda-itens" (produto_id);

-- RLS ligado (sem policies) — acesso só pelo service_role do backend.
alter table public.vendas        enable row level security;
alter table public."venda-itens" enable row level security;
