-- =====================================================================
-- 0026_plataforma_clientes_plano_id.sql
-- Liga o cadastro (plataforma_clientes) ao plano por ID — à prova de rename.
-- ADITIVO e IDEMPOTENTE: adiciona plano_id (FK planos.id, on delete set null),
-- faz backfill casando pelo nome (extras.plano -> planos.nome) e NÃO remove
-- extras.plano (fica como legado). Não mexe na RLS.
-- =====================================================================

alter table public.plataforma_clientes
  add column if not exists plano_id uuid references public.planos(id) on delete set null;

create index if not exists plataforma_clientes_plano_idx
  on public.plataforma_clientes (plano_id);

-- Backfill: preenche o plano_id dos cadastros existentes casando o nome guardado
-- em extras.plano com planos.nome (case-insensitive). Só toca em quem está nulo.
update public.plataforma_clientes pc
set plano_id = p.id
from public.planos p
where pc.plano_id is null
  and pc.extras->>'plano' is not null
  and lower(p.nome) = lower(pc.extras->>'plano');
