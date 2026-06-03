-- =====================================================================
-- 0002_chatbot_rls.sql
-- Políticas RLS do MÓDULO CHATBOT (inbox/atendimento).
-- Rode DEPOIS de 0001. Idempotente.
--
-- Regra geral: o usuário só acessa linhas cuja empresa está em
-- user_empresa_ids(). Cobre SELECT/INSERT/UPDATE/DELETE (for all) e o
-- with check impede inserir/mover dado para uma empresa que não é a sua.
-- =====================================================================

-- chatbot-contatos  (coluna empresa_id)
drop policy if exists contatos_tenant_all on public."chatbot-contatos";
create policy contatos_tenant_all on public."chatbot-contatos"
  for all to authenticated
  using      (empresa_id in (select public.user_empresa_ids()))
  with check (empresa_id in (select public.user_empresa_ids()));

-- chatbot-mensagens  (sem empresa_id -> herda do contato)
drop policy if exists mensagens_tenant_all on public."chatbot-mensagens";
create policy mensagens_tenant_all on public."chatbot-mensagens"
  for all to authenticated
  using (exists (
    select 1 from public."chatbot-contatos" c
    where c.id = "chatbot-mensagens".contato
      and c.empresa_id in (select public.user_empresa_ids())
  ))
  with check (exists (
    select 1 from public."chatbot-contatos" c
    where c.id = "chatbot-mensagens".contato
      and c.empresa_id in (select public.user_empresa_ids())
  ));

-- clientes  (coluna empresa_id)
drop policy if exists clientes_tenant_all on public.clientes;
create policy clientes_tenant_all on public.clientes
  for all to authenticated
  using      (empresa_id in (select public.user_empresa_ids()))
  with check (empresa_id in (select public.user_empresa_ids()));

-- departamentos  (coluna empresa)
drop policy if exists departamentos_tenant_all on public.departamentos;
create policy departamentos_tenant_all on public.departamentos
  for all to authenticated
  using      (empresa in (select public.user_empresa_ids()))
  with check (empresa in (select public.user_empresa_ids()));

-- respostasrapidas  (coluna empresaid)
drop policy if exists respostas_tenant_all on public.respostasrapidas;
create policy respostas_tenant_all on public.respostasrapidas
  for all to authenticated
  using      (empresaid in (select public.user_empresa_ids()))
  with check (empresaid in (select public.user_empresa_ids()));

-- tags  (coluna empresaid)
drop policy if exists tags_tenant_all on public.tags;
create policy tags_tenant_all on public.tags
  for all to authenticated
  using      (empresaid in (select public.user_empresa_ids()))
  with check (empresaid in (select public.user_empresa_ids()));

-- tags-contatos  (sem empresa -> herda do contato via contatoid)
drop policy if exists tagscontatos_tenant_all on public."tags-contatos";
create policy tagscontatos_tenant_all on public."tags-contatos"
  for all to authenticated
  using (exists (
    select 1 from public."chatbot-contatos" c
    where c.id = "tags-contatos".contatoid
      and c.empresa_id in (select public.user_empresa_ids())
  ))
  with check (exists (
    select 1 from public."chatbot-contatos" c
    where c.id = "tags-contatos".contatoid
      and c.empresa_id in (select public.user_empresa_ids())
  ));
