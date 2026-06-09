// filiais.js — helpers de multi-filial. A "Matriz" é a filial default de cada
// empresa (criada no provisionamento + backfill da migration 0031). Tudo que
// chega SEM filial_id explícito cai na Matriz (transparente p/ loja única).
import { adminClient } from './supabase.js';

// id da Matriz da empresa (ou null se não houver — ex.: empresa legada sem backfill).
export async function matrizId(empresaId) {
  if (!empresaId) return null;
  const { data } = await adminClient()
    .from('filiais')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('is_matriz', true)
    .limit(1)
    .maybeSingle();
  return data ? data.id : null;
}

// Resolve a filial de uma operação: usa a explícita; senão, a Matriz.
export async function resolveFilialId(empresaId, explicito) {
  if (explicito) return explicito;
  return matrizId(empresaId);
}
