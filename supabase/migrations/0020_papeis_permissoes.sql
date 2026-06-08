-- =====================================================================
-- 0020_papeis_permissoes.sql
-- ESTRUTURA FLEXÍVEL DE PAPÉIS E PERMISSÕES (esqueleto).
--   papeis            -> catálogo de papéis (super_admin, admin_loja, ...)
--   permissoes        -> catálogo de permissões (modulo.acao)
--   papel_permissoes  -> liga papel <-> permissões (o "quem pode o quê")
-- Só a estrutura + seed. NÃO altera autorização nem o app ainda.
-- Rode DEPOIS da 0001. É idempotente.
-- =====================================================================

-- ----------------------------- TABELAS -----------------------------
create table if not exists public.papeis (
  id         uuid primary key default gen_random_uuid(),
  codigo     text not null unique,                 -- 'super_admin', 'admin_loja'...
  nome       text not null,
  descricao  text,
  nivel      smallint not null default 0,          -- hierarquia (maior = mais poder)
  sistema    boolean  not null default false,      -- true nos papéis base (não apagar)
  empresa_id uuid references public.empresa_user(id) on delete cascade, -- null = papel GLOBAL do sistema; futuro: papel personalizado por loja
  created_at timestamptz not null default now()
);

create table if not exists public.permissoes (
  id         uuid primary key default gen_random_uuid(),
  codigo     text not null unique,                 -- 'catalogo.editar', 'vendas.criar'...
  nome       text not null,
  descricao  text,
  grupo      text,                                 -- módulo: 'catalogo','financeiro'...
  created_at timestamptz not null default now()
);

create table if not exists public.papel_permissoes (
  papel_id     uuid not null references public.papeis(id) on delete cascade,
  permissao_id uuid not null references public.permissoes(id) on delete cascade,
  primary key (papel_id, permissao_id)
);

create index if not exists papeis_empresa_idx       on public.papeis (empresa_id);
create index if not exists permissoes_grupo_idx      on public.permissoes (grupo);
create index if not exists papel_permissoes_perm_idx on public.papel_permissoes (permissao_id);

-- ----------------------------- RLS ---------------------------------
-- Tabelas criadas DEPOIS da 0001 não herdam o "enable RLS" automático -> ligamos aqui.
-- São catálogos de referência: leitura liberada ao usuário autenticado
-- (papéis globais + os da própria empresa); escrita só pelo backend (service_role).
alter table public.papeis           enable row level security;
alter table public.permissoes       enable row level security;
alter table public.papel_permissoes enable row level security;

drop policy if exists papeis_read on public.papeis;
create policy papeis_read on public.papeis
  for select to authenticated
  using (empresa_id is null or empresa_id in (select public.user_empresa_ids()));

drop policy if exists permissoes_read on public.permissoes;
create policy permissoes_read on public.permissoes
  for select to authenticated using (true);

drop policy if exists papel_permissoes_read on public.papel_permissoes;
create policy papel_permissoes_read on public.papel_permissoes
  for select to authenticated using (true);

-- ----------------------------- SEED: PAPÉIS ------------------------
insert into public.papeis (codigo, nome, descricao, nivel, sistema) values
  ('super_admin', 'Super Admin',   'Administrador da plataforma — acesso total, multi-loja.', 100, true),
  ('admin_loja',  'Admin da Loja', 'Administrador da loja — acesso total dentro da empresa.',  50, true),
  ('atendente',   'Atendente',     'Operação do dia a dia — atendimento, agenda e vendas.',     10, true)
on conflict (codigo) do nothing;

-- ----------------------------- SEED: PERMISSÕES --------------------
insert into public.permissoes (codigo, nome, grupo) values
  ('plataforma.gerenciar', 'Gerenciar a plataforma (empresas, planos, faturamento)', 'plataforma'),
  ('catalogo.ver',     'Ver catálogo',        'catalogo'),
  ('catalogo.criar',   'Criar itens',         'catalogo'),
  ('catalogo.editar',  'Editar itens',        'catalogo'),
  ('catalogo.excluir', 'Excluir itens',       'catalogo'),
  ('clientes.ver',     'Ver clientes',        'clientes'),
  ('clientes.criar',   'Criar clientes',      'clientes'),
  ('clientes.editar',  'Editar clientes',     'clientes'),
  ('clientes.excluir', 'Excluir clientes',    'clientes'),
  ('leads.ver',        'Ver leads',           'leads'),
  ('leads.gerenciar',  'Gerenciar leads',     'leads'),
  ('vendas.ver',       'Ver vendas',          'vendas'),
  ('vendas.criar',     'Registrar venda (PDV)', 'vendas'),
  ('financeiro.ver',       'Ver financeiro',      'financeiro'),
  ('financeiro.gerenciar', 'Gerenciar financeiro','financeiro'),
  ('crm.ver',          'Ver CRM',             'crm'),
  ('crm.gerenciar',    'Gerenciar CRM',       'crm'),
  ('atendimento.ver',      'Ver atendimentos',    'atendimento'),
  ('atendimento.responder','Responder no chat',   'atendimento'),
  ('agenda.ver',       'Ver agenda',          'agenda'),
  ('agenda.gerenciar', 'Gerenciar agenda',    'agenda'),
  ('marketing.ver',       'Ver marketing',    'marketing'),
  ('marketing.gerenciar', 'Gerenciar marketing','marketing'),
  ('relatorios.ver',   'Ver relatórios',      'relatorios'),
  ('config.gerenciar', 'Configurações da loja (equipe, integrações)', 'config')
on conflict (codigo) do nothing;

-- ----------------------- SEED: MAPEAMENTO PAPEL x PERMISSÃO ---------
-- super_admin = TUDO
insert into public.papel_permissoes (papel_id, permissao_id)
select p.id, perm.id from public.papeis p cross join public.permissoes perm
where p.codigo = 'super_admin'
on conflict do nothing;

-- admin_loja = tudo, MENOS o que é da plataforma (super)
insert into public.papel_permissoes (papel_id, permissao_id)
select p.id, perm.id from public.papeis p cross join public.permissoes perm
where p.codigo = 'admin_loja' and perm.grupo <> 'plataforma'
on conflict do nothing;

-- atendente = conjunto enxuto (operação)
insert into public.papel_permissoes (papel_id, permissao_id)
select p.id, perm.id
from public.papeis p
join public.permissoes perm on perm.codigo in (
  'atendimento.ver','atendimento.responder',
  'agenda.ver','agenda.gerenciar',
  'crm.ver',
  'clientes.ver','clientes.criar',
  'vendas.ver','vendas.criar',
  'catalogo.ver'
)
where p.codigo = 'atendente'
on conflict do nothing;
