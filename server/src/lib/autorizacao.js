// autorizacao.js — carrega o PAPEL real e as PERMISSÕES do usuário logado.
// Fonte da verdade: empresa_membros -> papeis -> papel_permissoes -> permissoes.
// Usado pelo /auth/me (Passo 1) e, no Passo 2, pelo middleware requirePermissao.
import { adminClient } from './supabase.js';

// Retorna { empresaId, papel, papelNome, permissoes: Set<string> } do usuário/empresa atual.
// Cacheia em req._auth para não repetir consultas na mesma requisição.
export async function carregarAutorizacao(req) {
  if (req._auth) return req._auth;

  // ⚠️ SEGURANÇA — FILTRO LOAD-BEARING (NUNCA REMOVER NEM AFROUXAR):
  //    Esta query usa adminClient() (service_role), que IGNORA o RLS. O isolamento
  //    por usuário/tenant depende 100% do .eq('user_id', req.user.id) abaixo.
  //    O req.user vem do JWT JÁ VALIDADO no requireAuth — NUNCA aceite user_id do
  //    front. Tirar/quebrar esse filtro vaza dados entre usuários.
  // Tudo numa ÚNICA ida (joins por FK): vínculo + nome da empresa + papel + permissões.
  // Multi-empresa: pega 1 vínculo (o MAIS ANTIGO por created_at — determinístico).
  //   - Single-empresa (caso de hoje): é a única linha → resultado idêntico ao anterior.
  //   - Multi-empresa: antes era .limit(1) SEM order (arbitrário); agora é estável e
  //     bate com o getEmpresaId (que passa a reusar este empresaId).
  const { data: row } = await adminClient()
    .from('empresa_membros')
    .select('empresa_id, papel, papel_id, empresa_user(nome), papeis(codigo, nome, papel_permissoes(permissoes(codigo)))')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!row) {
    req._auth = { empresaId: null, empresaNome: null, papel: null, papelNome: null, permissoes: new Set() };
    return req._auth;
  }

  const empresaNome = (row.empresa_user && row.empresa_user.nome) || null;
  const papelCodigo = (row.papeis && row.papeis.codigo) || row.papel || null;
  const papelNome = (row.papeis && row.papeis.nome) || null;
  const permissoes = new Set(
    ((row.papeis && row.papeis.papel_permissoes) || [])
      .map((pp) => pp.permissoes && pp.permissoes.codigo)
      .filter(Boolean),
  );

  req._auth = { empresaId: row.empresa_id, empresaNome, papel: papelCodigo, papelNome, permissoes };
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
