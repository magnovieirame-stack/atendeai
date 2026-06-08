-- =====================================================================
-- 0000_base_tables.sql
-- VERSIONAMENTO das tabelas-base que hoje só existem no painel do Supabase:
--   - empresa_user  (as empresas/lojas — tenant raiz)
--   - clientes      (apenas o ESQUELETO base; colunas extras são adicionadas
--                    depois pelas migrations 0016/0017, que já existem)
-- Precisa rodar ANTES da 0001 (que referencia empresa_user) e da 0002/0016
-- (que mexem em clientes) — por isso o prefixo 0000.
-- É idempotente: "create table if not exists" NÃO recria o que já existe,
-- então no banco atual esta migration não altera nada.
-- =====================================================================

-- 1) Empresas / lojas (tenant). Tabela raiz referenciada por quase tudo.
create table if not exists public.empresa_user (
  id             uuid primary key default gen_random_uuid(),
  nome           text,
  id_user_bubble text,        -- legado da migração do Bubble (mantido por fidelidade)
  created_at     timestamptz not null default now()
);

-- 2) Clientes — ESQUELETO base (as 14 colunas originais do painel).
--    As demais colunas (PF/PJ, endereço, segmento, estagio, extras, etc.)
--    continuam sendo adicionadas pelas migrations 0016 e 0017.
create table if not exists public.clientes (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null references public.empresa_user(id) on delete cascade,
  nome             text,
  telefone         text,
  email            text,
  empresa          text,
  cargo            text,
  fotolink         text,
  origemlead       text,
  produtointeresse text,
  valor            numeric,
  valordonegocio   numeric,
  temcontato       boolean default false,
  created_at       timestamptz not null default now()
);

-- 3) RLS: liga já aqui, pra estas tabelas NUNCA existirem sem RLS num banco novo.
--    RLS ligado SEM política = tabela trancada (só o service_role do backend
--    acessa) = segura por padrão. As POLÍTICAS de acesso por empresa ficam na
--    0001 (empresa_user) e 0002 (clientes), pois dependem de empresa_membros +
--    user_empresa_ids(), que são criados na 0001. (Idempotente: religar RLS
--    já ligado não faz nada.)
alter table public.empresa_user enable row level security;
alter table public.clientes     enable row level security;
