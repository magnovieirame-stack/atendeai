-- =====================================================================
-- 0037_atendente_presenca.sql — PRESENÇA do atendente (disponível / em pausa).
-- ADITIVA e IDEMPOTENTE. NÃO remove nada.
--   1 linha por atendente (user_id). Guarda o status atual e o motivo da pausa.
--   - status: 'disponivel' | 'pausa'
--   - motivo: 'lunch' | 'rest' | 'emergency' | 'shift' | null
-- Usada para: (a) sobreviver ao F5; (b) tirar quem está em pausa do pool e das
-- listas de transferência; (c) admin enxergar quem está disponível/em pausa.
-- =====================================================================

create table if not exists public.atendente_presenca (
  user_id       uuid primary key,
  empresa       uuid not null references public.empresa_user(id) on delete cascade,
  status        text not null default 'disponivel',  -- 'disponivel' | 'pausa'
  motivo        text,                                  -- lunch | rest | emergency | shift | null
  motivo_label  text,
  cor           text,
  nota          text,
  desde         timestamptz,
  updated_at    timestamptz not null default now()
);

-- índice p/ consultas por empresa (admin lista a equipe)
create index if not exists atendente_presenca_empresa_idx on public.atendente_presenca (empresa);

alter table public.atendente_presenca enable row level security;

-- LEITURA: qualquer membro da empresa pode ler (admin enxerga toda a equipe).
drop policy if exists atendente_presenca_select on public.atendente_presenca;
create policy atendente_presenca_select on public.atendente_presenca
  for select to authenticated
  using (empresa in (select public.user_empresa_ids()));

-- ESCRITA: cada atendente só mexe na PRÓPRIA presença.
drop policy if exists atendente_presenca_write_own on public.atendente_presenca;
create policy atendente_presenca_write_own on public.atendente_presenca
  for all to authenticated
  using      (user_id = auth.uid() and empresa in (select public.user_empresa_ids()))
  with check (user_id = auth.uid() and empresa in (select public.user_empresa_ids()));
