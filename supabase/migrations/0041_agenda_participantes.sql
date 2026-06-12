-- 0041_agenda_participantes.sql
-- AGENDA: múltiplos participantes por compromisso + auditoria de criador.
-- ADITIVO e IDEMPOTENTE. Não remove nem altera nada existente.
-- Mantém o padrão do módulo agenda: RLS LIGADO sem policies (só service_role),
-- isolamento por empresa feito no código (adminClient + .eq('empresa_id')).

-- 1) Auditoria: quem CRIOU o compromisso (fallback de "dono" junto do responsável).
alter table public.agenda add column if not exists criado_por uuid;

-- 2) Participantes (N pessoas por reunião): usuários do sistema, clientes, leads
--    ou externos (texto livre). É a FONTE DA VERDADE de "quem está na reunião" e
--    alimenta o filtro "minha agenda" (responsável OU participante).
create table if not exists public.agenda_participantes (
  id          bigint generated always as identity primary key,
  agenda_id   uuid not null references public.agenda(id) on delete cascade,
  empresa_id  uuid not null,
  tipo        text not null default 'usuario',      -- usuario | cliente | lead | externo
  user_id     uuid,                                  -- quando tipo = 'usuario'
  cliente_id  uuid,                                  -- quando tipo in ('cliente','lead')
  nome        text,                                  -- snapshot p/ exibição
  papel       text not null default 'participante',  -- responsavel | participante
  created_at  timestamptz not null default now()
);

-- Índices p/ os filtros principais (minha agenda, board, exclusão em cascata).
create index if not exists agenda_part_agenda_idx  on public.agenda_participantes (agenda_id);
create index if not exists agenda_part_user_idx    on public.agenda_participantes (empresa_id, user_id);
create index if not exists agenda_part_empresa_idx on public.agenda_participantes (empresa_id);

-- RLS ligado (sem policies -> só service_role), igual às demais tabelas do módulo.
alter table public.agenda_participantes enable row level security;

-- 3) BACKFILL idempotente — não perde a agenda já existente no novo filtro.
-- 3a) Responsável atual (quando é um usuário/UUID) -> papel 'responsavel'.
insert into public.agenda_participantes (agenda_id, empresa_id, tipo, user_id, nome, papel)
select a.id, a.empresa_id, 'usuario', a.responsavel::uuid, a.responsavel_nome, 'responsavel'
from public.agenda a
where a.responsavel is not null
  and a.responsavel ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  and not exists (
    select 1 from public.agenda_participantes p
    where p.agenda_id = a.id and p.papel = 'responsavel'
  );

-- 3b) Participante atual (cliente/lead/usuario) -> papel 'participante'.
insert into public.agenda_participantes (agenda_id, empresa_id, tipo, user_id, cliente_id, nome, papel)
select a.id, a.empresa_id,
       coalesce(nullif(a.participante_tipo, ''), 'cliente') as tipo,
       case when a.participante_tipo = 'usuario' then a.participante_id end as user_id,
       case when coalesce(a.participante_tipo, 'cliente') in ('cliente', 'lead')
            then coalesce(a.participante_id, a.cliente_id) end as cliente_id,
       nullif(a.participante, '') as nome,
       'participante'
from public.agenda a
where coalesce(nullif(a.participante, ''), a.participante_id::text, a.cliente_id::text) is not null
  and not exists (
    select 1 from public.agenda_participantes p
    where p.agenda_id = a.id and p.papel = 'participante'
  );
