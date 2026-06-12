-- 0042_crm_card_dono.sql
-- CRM: dono (responsável) do card + departamento, para isolamento em 3 níveis
-- (admin vê tudo · líder vê o setor + pool · vendedor vê o seu + pool do setor).
-- ADITIVO e IDEMPOTENTE. Não remove nem altera nada existente.
-- Cards já existentes ficam com responsavel/departamento NULL = "pool" (continuam
-- visíveis pra equipe; ninguém perde card no deploy).

alter table public."crm-clientesfunil" add column if not exists responsavel_id   uuid;
alter table public."crm-clientesfunil" add column if not exists responsavel_nome text;
alter table public."crm-clientesfunil" add column if not exists departamento_id  bigint;

-- Índices p/ os filtros principais (meus cards / cards do setor).
create index if not exists crm_cli_resp_idx  on public."crm-clientesfunil" (empresa_id, responsavel_id);
create index if not exists crm_cli_depto_idx on public."crm-clientesfunil" (empresa_id, departamento_id);
