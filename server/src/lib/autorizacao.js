// autorizacao.js — carrega o PAPEL real e as PERMISSÕES do usuário logado.
// Fonte da verdade: empresa_membros -> papeis -> papel_permissoes -> permissoes.
// Usado pelo /auth/me (Passo 1) e, no Passo 2, pelo middleware requirePermissao.
import { adminClient } from './supabase.js';

// Retorna { empresaId, papel, papelNome, permissoes: Set<string> } do usuário/empresa atual.
// Cacheia em req._auth para não repetir consultas na mesma requisição.
export async function carregarAutorizacao(req) {
  if (req._auth) return req._auth;

  // 1) Vínculo do usuário (RLS garante que ele só enxerga os próprios).
  //    Multi-empresa: usa a primeira (mesma regra do getEmpresaId existente).
  const { data: membros } = await req.supabase
    .from('empresa_membros')
    .select('empresa_id, papel, papel_id')
    .limit(1);
  const m = membros && membros[0];
  if (!m) {
    req._auth = { empresaId: null, empresaNome: null, papel: null, papelNome: null, permissoes: new Set() };
    return req._auth;
  }

  let papelCodigo = m.papel || null;
  let papelNome = null;
  let empresaNome = null;
  const permissoes = new Set();

  // Nome da empresa — via service_role (o empresaId vem do próprio vínculo do
  // usuário, m.empresa_id; não é escalada de acesso). Garante o nome sem depender de policy.
  const { data: emp } = await adminClient().from('empresa_user').select('nome').eq('id', m.empresa_id).single();
  if (emp) empresaNome = emp.nome || null;

  // 2) Papel + permissões (catálogo global — lido via service_role).
  if (m.papel_id) {
    const db = adminClient();
    const { data: papel } = await db.from('papeis').select('codigo, nome').eq('id', m.papel_id).single();
    if (papel) { papelCodigo = papel.codigo; papelNome = papel.nome; }

    const { data: pp } = await db.from('papel_permissoes').select('permissao_id').eq('papel_id', m.papel_id);
    const ids = (pp || []).map((r) => r.permissao_id);
    if (ids.length) {
      const { data: perms } = await db.from('permissoes').select('codigo').in('id', ids);
      (perms || []).forEach((p) => { if (p.codigo) permissoes.add(p.codigo); });
    }
  }

  req._auth = { empresaId: m.empresa_id, empresaNome, papel: papelCodigo, papelNome, permissoes };
  return req._auth;
}

// Helper de leitura simples.
export function temPermissao(auth, codigo) {
  return !!(auth && auth.permissoes && auth.permissoes.has(codigo));
}

// Middleware: exige que o usuário tenha a permissão `codigo`. Deve vir DEPOIS
// do requireAuth (precisa de req.supabase/req.user). Retorna 403 se faltar.
// super_admin/admin_loja passam porque já têm as permissões no mapeamento.
export function requirePermissao(codigo) {
  return async (req, res, next) => {
    try {
      const auth = await carregarAutorizacao(req);
      if (!temPermissao(auth, codigo)) {
        return res.status(403).json({ error: 'Você não tem permissão para esta ação.', permissaoNecessaria: codigo });
      }
      next();
    } catch (err) { next(err); }
  };
}
