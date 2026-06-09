-- =====================================================================
-- 0031_multifilial_modelo.sql
-- MULTI-FILIAL · Etapa 1 (MODELO). ADITIVA e IDEMPOTENTE. NÃO remove nada.
--   1) filiais (com no máx. 1 Matriz por empresa).
--   2) estoque-filial (saldo por produto × filial).
--   3) filial_id (nullable, SEM FK) em vendas, catalogo-movimentacoes, financeiro-entradas.
--   4) vendedor_id (nullable) em vendas.
--   5) BACKFILL: Matriz por empresa + estoque-filial inicial + carimbo filial_id.
--   6) catalogo-produtos.estoque NÃO é removido (vira legado; sai de uso na Etapa 2).
-- Rode no SQL Editor do Supabase. Reexecutável.
-- =====================================================================

-- 1) Filiais (por tenant). Tabela nova nasce com RLS off -> ligamos sem policies
--    (acesso só pelo service_role do backend, padrão do projeto).
create table if not exists public.filiais (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresa_user(id) on delete cascade,
  nome       text not null,
  is_matriz  boolean not null default false,
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists filiais_empresa_idx on public.filiais (empresa_id);
-- No máximo 1 matriz por empresa (índice único PARCIAL).
create unique index if not exists filiais_matriz_unica
  on public.filiais (empresa_id) where (is_matriz);
alter table public.filiais enable row level security;

-- 2) Estoque por (produto × filial). O saldo "de verdade" passa a viver aqui.
create table if not exists public."estoque-filial" (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresa_user(id) on delete cascade,
  produto_id uuid not null references public."catalogo-produtos"(id) on delete cascade,
  filial_id  uuid not null references public.filiais(id) on delete cascade,
  estoque    numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (produto_id, filial_id)
);
create index if not exists estoque_filial_empresa_filial_idx
  on public."estoque-filial" (empresa_id, filial_id);
alter table public."estoque-filial" enable row level security;

-- updated_at automático (reusa a função criada na 0011).
drop trigger if exists estoque_filial_touch on public."estoque-filial";
create trigger estoque_filial_touch
  before update on public."estoque-filial"
  for each row execute function public.catalogo_touch_updated_at();

-- 3) filial_id (nullable, SEM FK — padrão dos carimbos de tenant do projeto).
alter table public.vendas                  add column if not exists filial_id uuid;
alter table public."catalogo-movimentacoes" add column if not exists filial_id uuid;
alter table public."financeiro-entradas"    add column if not exists filial_id uuid;
create index if not exists vendas_filial_idx        on public.vendas (filial_id);
create index if not exists catalogo_mov_filial_idx  on public."catalogo-movimentacoes" (filial_id);
create index if not exists financeiro_ent_filial_idx on public."financeiro-entradas" (filial_id);

-- 4) vendedor_id (nullable) em vendas — de carona (KPIs por vendedor futuros).
alter table public.vendas add column if not exists vendedor_id uuid;

-- =====================================================================
-- 5) BACKFILL (idempotente)
-- =====================================================================

-- 5a) 1 Matriz por empresa que ainda não tem.
insert into public.filiais (empresa_id, nome, is_matriz, ativo)
select e.id, 'Matriz', true, true
  from public.empresa_user e
 where not exists (
   select 1 from public.filiais f where f.empresa_id = e.id and f.is_matriz
 );

-- 5b) estoque-filial inicial: cada produto na Matriz da sua empresa,
--     com o estoque ATUAL da ficha (catalogo-produtos.estoque).
insert into public."estoque-filial" (empresa_id, produto_id, filial_id, estoque)
select p.empresa_id, p.id, m.id, coalesce(p.estoque, 0)
  from public."catalogo-produtos" p
  join public.filiais m on m.empresa_id = p.empresa_id and m.is_matriz
 where not exists (
   select 1 from public."estoque-filial" ef
    where ef.produto_id = p.id and ef.filial_id = m.id
 );

-- 5c) carimba filial_id = Matriz nas linhas existentes (só onde está NULL).
update public.vendas v
   set filial_id = m.id
  from public.filiais m
 where m.empresa_id = v.empresa_id and m.is_matriz and v.filial_id is null;

update public."catalogo-movimentacoes" mv
   set filial_id = m.id
  from public.filiais m
 where m.empresa_id = mv.empresa_id and m.is_matriz and mv.filial_id is null;

-- financeiro-entradas usa a coluna de tenant "empresaid" (sem underscore).
update public."financeiro-entradas" fe
   set filial_id = m.id
  from public.filiais m
 where m.empresa_id = fe.empresaid and m.is_matriz and fe.filial_id is null;
