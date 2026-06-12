// escopo.js — helpers de ESCOPO por usuário/departamento (isolamento intra-empresa).
// Mesma regra de 3 níveis usada no atendimento; compartilhado p/ o CRM reaproveitar.

// Departamento(s) do PERFIL do usuário (user_metadata.departamentoId). Síncrono.
export function deptosDoUsuario(req) {
  const md = (req.user && req.user.user_metadata) || {};
  const dep = (md.departamentoId != null && md.departamentoId !== '') ? (Number(md.departamentoId) || md.departamentoId) : null;
  return dep != null ? [dep] : [];
}

// Departamento(s) que o usuário LIDERA (responsavel_id). Usa o RLS do req.supabase.
export async function deptosResponsavel(req) {
  const { data } = await req.supabase.from('departamentos').select('id').eq('responsavel_id', req.user.id);
  return [...new Set((data || []).map((d) => d.id).filter((x) => x != null))];
}

// Nome de exibição do usuário logado (snapshot p/ responsavel_nome etc.).
export function nomeUsuario(req) {
  const md = (req.user && req.user.user_metadata) || {};
  return md.name || (req.user && req.user.email) || null;
}
