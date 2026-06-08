-- =====================================================================
-- 0024_plataforma_clientes.sql
-- SUPER ADMIN · CADASTRO DE CLIENTES DA PLATAFORMA (lojas).
-- Tabela NOVA e independente: guarda a ficha comercial de uma loja
-- (cliente/prospect da plataforma) ANTES de virar um tenant de fato.
-- 100% ADITIVO — NÃO altera empresa_user, empresa_membros, papeis nem as
-- políticas de RLS existentes.
-- Acesso é EXCLUSIVO do backend (rota de super admin via service_role); por
-- isso a RLS fica LIGADA e SEM policy (nega acesso direto de qualquer usuário
-- autenticado — a tabela da plataforma nunca vaza pro front de uma loja).
-- Rode no SQL Editor do Supabase. É idempotente.
-- =====================================================================

create table if not exists public.plataforma_clientes (
  id uuid primary key default gen_random_uuid(),

  -- Tipo + identidade
  tipo_pessoa   text not null default 'pf' check (tipo_pessoa in ('pf','pj')),
  nome          text not null,            -- nome (PF) ou nome de exibição
  razao_social  text,
  nome_fantasia text,
  cpf  text,
  cnpj text,
  rg   text,
  inscricao_estadual text,
  nascimento text,                        -- 'YYYY-MM-DD' (PF)

  -- Contato
  email    text,
  telefone text,

  -- Responsável (PJ)
  responsavel_nome     text,
  responsavel_cargo    text,
  responsavel_cpf      text,
  responsavel_email    text,
  responsavel_telefone text,

  -- Endereço
  cep         text,
  logradouro  text,
  numero      text,
  complemento text,
  bairro      text,
  cidade      text,
  uf          text,

  -- Comercial
  origem      text,
  segmento    text,
  atendente   text,
  observacoes text,

  -- Status do cadastro comercial (prospect -> cliente). O provisionamento
  -- (plano, subdomínio, login) é uma fase futura — não entra aqui ainda.
  status text not null default 'novo',

  -- Vínculo FUTURO com o tenant real (preenchido quando a loja for provisionada).
  empresa_id uuid references public.empresa_user(id) on delete set null,

  -- Campos sem coluna própria (ex.: plano pretendido, subdomínio desejado).
  extras jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plataforma_clientes_created_idx on public.plataforma_clientes (created_at desc);
create index if not exists plataforma_clientes_status_idx  on public.plataforma_clientes (status);
create index if not exists plataforma_clientes_empresa_idx on public.plataforma_clientes (empresa_id);

-- RLS ligada e RESTRITIVA: sem nenhuma policy, nenhum usuário autenticado lê
-- ou escreve direto. O acesso é só pelo backend (rota de super admin) com
-- service_role, que ignora RLS.
alter table public.plataforma_clientes enable row level security;
