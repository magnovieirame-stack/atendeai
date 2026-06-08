-- =====================================================================
-- 0017_clientes_estagio.sql
-- MÓDULO COMERCIAL · CLIENTES · CICLO DE VIDA.
-- "estagio": a pessoa nasce 'lead' e vira 'cliente' (na 1ª compra, quando
-- o PDV existir; até lá, muda manualmente na ficha). A ficha é a mesma.
-- Rode no SQL Editor do Supabase, DEPOIS do 0016. É idempotente.
-- =====================================================================

alter table public.clientes
  add column if not exists estagio text not null default 'lead'
  check (estagio in ('lead', 'cliente'));
