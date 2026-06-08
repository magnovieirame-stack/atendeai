-- =====================================================================
-- 0012_categorias_tipo_servico.sql
-- Adiciona o tipo 'Serviço' às categorias compartilhadas
-- (tabela "financeiro-categorias", usada também pelo Catálogo).
-- Rode no SQL Editor do Supabase, DEPOIS do 0005. É idempotente.
-- =====================================================================

-- 1) Troca o CHECK do tipo para incluir 'Serviço'.
--    Removemos qualquer check existente na tabela (só há o do 'tipo')
--    e recriamos com a lista completa — assim não dependemos do nome
--    auto-gerado da constraint.
do $$
declare r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public' and rel.relname = 'financeiro-categorias' and con.contype = 'c'
  loop
    execute format('alter table public.%I drop constraint %I', 'financeiro-categorias', r.conname);
  end loop;
end$$;

alter table public."financeiro-categorias"
  add constraint "financeiro-categorias_tipo_check"
  check (tipo in ('Financeira','Produto','Serviço','Cliente'));

-- 2) Semeia uma categoria de serviço padrão para cada empresa que já tem
--    categorias mas ainda nenhuma do tipo 'Serviço'. Empresas novas recebem
--    o padrão pelo auto-seed do backend (DEFAULT_CATEGORIAS).
insert into public."financeiro-categorias" (empresaid, nome, tipo)
select distinct c.empresaid, 'Prestação de Serviço', 'Serviço'
from public."financeiro-categorias" c
where not exists (
  select 1 from public."financeiro-categorias" s
  where s.empresaid = c.empresaid and s.tipo = 'Serviço'
)
on conflict (empresaid, nome) do nothing;
