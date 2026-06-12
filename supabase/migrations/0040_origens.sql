-- =====================================================================
-- 0040_origens.sql
-- Cadastro de ORIGEM DO CLIENTE (de onde o cliente chegou: Instagram, Indicação…).
-- Usada na página de Cadastros e nas listas suspensas de "Origem" (ficha, clientes, leads).
-- Mudanças ADITIVAS e IDEMPOTENTES.
-- =====================================================================

create table if not exists public.origens (
  id uuid primary key default gen_random_uuid(),
  empresa uuid not null,
  nome text not null,
  descricao text,
  created_at timestamptz not null default now()
);

create index if not exists idx_origens_empresa on public.origens (empresa);

alter table public.origens enable row level security;

-- RLS: membros da empresa (mesmo padrão dos departamentos, via user_empresa_ids()).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'origens' and policyname = 'origens_empresa'
  ) then
    create policy "origens_empresa" on public.origens
      for all
      using (empresa in (select public.user_empresa_ids()))
      with check (empresa in (select public.user_empresa_ids()));
  end if;
end $$;
