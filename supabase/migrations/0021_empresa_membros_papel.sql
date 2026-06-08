-- =====================================================================
-- 0021_empresa_membros_papel.sql
-- Conecta empresa_membros à nova estrutura de papéis (0020):
--   - adiciona empresa_membros.papel_id -> papeis(id)
--   - faz o BACKFILL a partir do papel atual (super->super_admin, admin->admin_loja)
--   - REMOVE o CHECK fixo do papel (sai do "chumbado")
--   - mantém a coluna texto "papel" sincronizada com o código novo (espelho)
-- Não altera autorização nem o app. Rode DEPOIS da 0020. É idempotente.
-- =====================================================================

-- 1) Nova coluna que referencia o catálogo de papéis.
alter table public.empresa_membros
  add column if not exists papel_id uuid references public.papeis(id);

-- 2) Remove QUALQUER CHECK da tabela (só existe o do 'papel') — tira o "chumbado".
--    Feito antes do passo 4 para permitir gravar os códigos novos no texto.
do $$
declare r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public' and rel.relname = 'empresa_membros' and con.contype = 'c'
  loop
    execute format('alter table public.empresa_membros drop constraint %I', r.conname);
  end loop;
end$$;

-- 3) Backfill do papel_id a partir do papel atual (mapeia os nomes antigos;
--    se já estiver com o código novo, também resolve).
update public.empresa_membros m
set papel_id = p.id
from public.papeis p
where m.papel_id is null
  and p.codigo = case m.papel
    when 'super'     then 'super_admin'
    when 'admin'     then 'admin_loja'
    when 'atendente' then 'atendente'
    else m.papel
  end;

-- 4) Espelha a coluna texto "papel" no código novo (mantém consistência;
--    nada lê essa coluna hoje, mas evita confusão futura).
update public.empresa_membros m
set papel = p.codigo
from public.papeis p
where m.papel_id = p.id and m.papel <> p.codigo;
