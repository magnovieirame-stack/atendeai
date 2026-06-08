-- =====================================================================
-- 0016_clientes_ficha.sql
-- MÓDULO COMERCIAL · CLIENTES (ficha cadastral completa).
-- A tabela "clientes" já existe (compartilhada com chat/CRM/agenda) com um
-- conjunto mínimo de colunas. Aqui ADICIONAMOS os campos da ficha — tudo
-- additivo (não quebra os outros módulos). RLS já está ligado (0002).
-- Rode no SQL Editor do Supabase. É idempotente.
-- =====================================================================

-- Pessoa física / jurídica + documentos
alter table public.clientes add column if not exists tipo_pessoa text default 'pf';
alter table public.clientes add column if not exists cpf  text;
alter table public.clientes add column if not exists cnpj text;
alter table public.clientes add column if not exists rg   text;

-- Pessoa jurídica
alter table public.clientes add column if not exists razao_social       text;
alter table public.clientes add column if not exists nome_fantasia      text;
alter table public.clientes add column if not exists inscricao_estadual text;
alter table public.clientes add column if not exists responsavel_nome     text;
alter table public.clientes add column if not exists responsavel_cargo    text;
alter table public.clientes add column if not exists responsavel_cpf      text;
alter table public.clientes add column if not exists responsavel_email    text;
alter table public.clientes add column if not exists responsavel_telefone text;

-- Endereço
alter table public.clientes add column if not exists cep         text;
alter table public.clientes add column if not exists logradouro  text;
alter table public.clientes add column if not exists numero      text;
alter table public.clientes add column if not exists complemento text;
alter table public.clientes add column if not exists bairro      text;
alter table public.clientes add column if not exists cidade      text;
alter table public.clientes add column if not exists uf          text;

-- Comercial / segmentação
alter table public.clientes add column if not exists site        text;
alter table public.clientes add column if not exists segmento    text;   -- bronze..diamante
alter table public.clientes add column if not exists atendente   text;
alter table public.clientes add column if not exists ativo       boolean default true;
alter table public.clientes add column if not exists observacoes text;
alter table public.clientes add column if not exists aniversario text;   -- 'YYYY-MM-DD'

-- Campos personalizados ("campos adicionais" da ficha) e o que não tem coluna própria
alter table public.clientes add column if not exists extras jsonb not null default '{}'::jsonb;
