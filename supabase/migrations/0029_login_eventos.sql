-- =====================================================================
-- 0029_login_eventos.sql
-- Histórico de logins por usuário — alimenta "Login recente" (aba Segurança)
-- e a base da aba "Sessões" do Perfil do Usuário.
-- O backend insere 1 linha a cada login bem-sucedido (via service_role).
-- Aditivo e idempotente. NÃO altera/remove nada existente.
-- =====================================================================

create table if not exists public.login_eventos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  empresa_id  uuid references public.empresa_user(id) on delete set null,
  ip          text,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists login_eventos_user_idx
  on public.login_eventos (user_id, created_at desc);

-- RLS: o usuário só enxerga os PRÓPRIOS eventos.
-- Escrita é só pelo backend (service_role) — por isso NÃO há policy de insert
-- para 'authenticated' (o service_role ignora o RLS).
alter table public.login_eventos enable row level security;

drop policy if exists login_eventos_self_select on public.login_eventos;
create policy login_eventos_self_select on public.login_eventos
  for select to authenticated
  using (user_id = auth.uid());
