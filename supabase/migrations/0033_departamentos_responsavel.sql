-- 0033_departamentos_responsavel.sql — adiciona o RESPONSÁVEL ao cadastro de
-- Departamentos. ADITIVO / idempotente: guarda o id do usuário criador + um
-- snapshot do nome (pra exibir sem join). Nada é removido/alterado.
alter table public.departamentos add column if not exists responsavel_id   uuid;
alter table public.departamentos add column if not exists responsavel_nome text;
