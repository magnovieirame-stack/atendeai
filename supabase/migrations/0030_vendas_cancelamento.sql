-- =====================================================================
-- 0030_vendas_cancelamento.sql
-- MÓDULO COMERCIAL · VENDAS · CANCELAMENTO COM ESTORNO (Fase 4).
-- ADITIVA e IDEMPOTENTE. Não remove nem altera dados existentes.
--   1) vendas: auditoria do cancelamento (quando/quem/por quê).
--   2) financeiro-entradas: venda_id -> liga a receita à venda (estorno limpo).
--   3) catalogo-movimentacoes: inclui 'estorno' no CHECK do tipo.
-- Rode no SQL Editor do Supabase, DEPOIS do 0018. Reexecutável.
-- =====================================================================

-- 1) Auditoria de cancelamento na venda (status já existe, default 'concluida').
alter table public.vendas
  add column if not exists cancelada_em       timestamptz,
  add column if not exists cancelada_por       uuid,
  add column if not exists cancelamento_motivo text;

-- 2) Liga a RECEITA do PDV à venda (hoje só há ligação pelo texto da descricao).
--    Sem FK pra não acoplar cascade; o backend já filtra por empresa_id.
alter table public."financeiro-entradas"
  add column if not exists venda_id uuid;

create index if not exists financeiro_entradas_venda_idx
  on public."financeiro-entradas" (venda_id);

-- 3) Permitir o tipo 'estorno' em catalogo-movimentacoes.
--    O CHECK da 0014 é INLINE e SEM nome -> o Postgres gerou um nome automático.
--    Em vez de chutar o nome, descobrimos dinamicamente QUALQUER constraint de
--    CHECK que mencione a coluna "tipo" e a derrubamos; depois recriamos nomeada
--    com a lista atual + 'estorno'. Reexecutável (o loop também pega a nova).
do $$
declare r record;
begin
  for r in
    select conname
      from pg_constraint
     where conrelid = 'public."catalogo-movimentacoes"'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%tipo%'
  loop
    execute format('alter table public."catalogo-movimentacoes" drop constraint %I', r.conname);
  end loop;
end $$;

alter table public."catalogo-movimentacoes"
  add constraint catalogo_movimentacoes_tipo_chk
  check (tipo in ('cadastro','edicao','entrada','saida','venda','estorno'));
