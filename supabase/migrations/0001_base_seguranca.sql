-- =====================================================================
-- 0001_base_seguranca.sql
-- Base de segurança multi-tenant do ATENDE.IA.
-- Rode UMA vez no SQL Editor do Supabase. É idempotente (pode rodar de novo).
-- =====================================================================

-- 1) Vínculo usuário (Supabase Auth) -> empresa (tenant).
--    Um usuário pode pertencer a uma ou mais empresas, com um papel.
create table if not exists public.empresa_membros (
  user_id    uuid not null references auth.users(id) on delete cascade,
  empresa_id uuid not null references public.empresa_user(id) on delete cascade,
  papel      text not null default 'atendente' check (papel in ('admin','atendente','super')),
  created_at timestamptz not null default now(),
  primary key (user_id, empresa_id)
);

-- 2) Função helper: retorna as empresas do usuário logado.
--    SECURITY DEFINER: lê empresa_membros por dentro (sem recursão de RLS),
--    mas só devolve as linhas do PRÓPRIO usuário (filtra por auth.uid()).
create or replace function public.user_empresa_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select empresa_id from public.empresa_membros where user_id = auth.uid()
$$;

revoke all on function public.user_empresa_ids() from public;
grant execute on function public.user_empresa_ids() to authenticated;

-- 3) Liga RLS em TODAS as tabelas do schema public.
--    Sem política, a tabela fica BLOQUEADA para anon/authenticated
--    (a service_role do backend ignora RLS). Assim nada vaza por engano:
--    cada módulo libera o acesso adicionando suas políticas.
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security;', r.tablename);
  end loop;
end$$;

-- 4) Políticas da base.
-- empresa_membros: o usuário só enxerga os próprios vínculos.
drop policy if exists membros_self_select on public.empresa_membros;
create policy membros_self_select on public.empresa_membros
  for select to authenticated
  using (user_id = auth.uid());

-- empresa_user: o usuário enxerga as empresas às quais pertence.
drop policy if exists empresa_self_select on public.empresa_user;
create policy empresa_self_select on public.empresa_user
  for select to authenticated
  using (id in (select public.user_empresa_ids()));
