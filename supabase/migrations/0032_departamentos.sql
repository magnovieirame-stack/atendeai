-- 0032_departamentos.sql — ESTENDE a tabela `departamentos` JÁ EXISTENTE
-- (colunas atuais: id, empresa, nome, created_at) com os campos do cadastro.
-- ADITIVO / idempotente: nada é removido ou alterado; os 2 registros atuais
-- recebem ativo=true por padrão. O tenant continua sendo a coluna `empresa`.
alter table public.departamentos add column if not exists descricao  text;
alter table public.departamentos add column if not exists ativo      boolean not null default true;
alter table public.departamentos add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_departamentos_empresa on public.departamentos (empresa);
