// auth.routes.js — autenticação via Supabase Auth.
//
//   POST /api/auth/login   { email, senha }  -> cria sessão, grava cookies httpOnly
//   POST /api/auth/logout                     -> encerra sessão e limpa cookies
//   GET  /api/auth/me                          -> dados do usuário logado
//
// O token NUNCA é devolvido no corpo da resposta — só vai em cookie httpOnly.
import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { authClient, adminClient } from '../lib/supabase.js';
import { supabaseReady } from '../config.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/security.js';
import { setSessionCookies, clearSessionCookies, REFRESH_COOKIE } from '../lib/cookies.js';
import { carregarAutorizacao } from '../lib/autorizacao.js';

export const authRouter = Router();

// Foto de perfil: reaproveita o bucket público "arquivos" (mesmo do chat). Sem bucket novo.
const BUCKET = 'arquivos';
const fotoUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } }); // 2MB

// Campos de perfil que vivem no user_metadata do Auth (sem tabela/migration).
function perfilDoMetadata(user) {
  const m = (user && user.user_metadata) || {};
  return {
    nomeCompleto: m.nome_completo || null,
    telefone: m.telefone || null,
    departamento: m.departamento || null,
    departamentoId: m.departamentoId != null ? m.departamentoId : null,
    nascimento: m.nascimento || null,
    endereco: m.endereco || null,
    bio: m.bio || null,
    fotoUrl: m.foto_url || null,
    preferencias: (m.preferencias && typeof m.preferencias === 'object') ? m.preferencias : {},
  };
}

const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('E-mail inválido.').max(255),
    senha: z.string().min(1, 'Informe a senha.').max(200),
  })
  .strip();

// Bloqueia as rotas se o Supabase ainda não foi configurado.
function ensureSupabase(req, res, next) {
  if (!supabaseReady) {
    return res.status(503).json({ error: 'Supabase ainda não configurado no servidor (.env).' });
  }
  next();
}

// Devolve só o que o frontend precisa do usuário (nunca tokens).
function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.app_metadata?.role || user.user_metadata?.role || null,
    tenantId: user.app_metadata?.tenant_id || null,
    name: user.user_metadata?.name || null,
  };
}

authRouter.post('/auth/login', authLimiter, ensureSupabase, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, senha } = req.body;
    const { data, error } = await authClient.auth.signInWithPassword({ email, password: senha });
    if (error || !data?.session) {
      // Mensagem genérica: não revela se o e-mail existe (anti-enumeração).
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }
    setSessionCookies(res, data.session);
    // Registra o login (best-effort) p/ "Login recente" e Sessões — NUNCA bloqueia o login.
    try {
      const uid = data.user.id;
      let empresaId = null;
      try {
        const { data: m } = await adminClient().from('empresa_membros').select('empresa_id').eq('user_id', uid).order('created_at', { ascending: true }).limit(1);
        empresaId = (m && m[0]) ? m[0].empresa_id : null;
      } catch (e) { /* sem empresa ainda — tudo bem */ }
      await adminClient().from('login_eventos').insert({ user_id: uid, empresa_id: empresaId, ip: req.ip || null, user_agent: (req.headers['user-agent'] || '').slice(0, 400) });
    } catch (e) { /* best-effort: registro de login não derruba o login */ }
    res.json({ user: publicUser(data.user) });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/auth/logout', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (refreshToken && authClient) {
      // melhor-esforço: invalida a sessão no Supabase
      try { await authClient.auth.admin?.signOut?.(refreshToken); } catch { /* ignore */ }
    }
    clearSessionCookies(res);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---- POST /api/auth/definir-senha — onboarding por CONVITE (SEM sessão/cookie) ----
// O convidado define a senha usando o access_token do link do e-mail. O BACKEND é o
// gate: valida o token (auth.getUser) e troca a senha (admin.updateUserById).
authRouter.post('/auth/definir-senha', authLimiter, ensureSupabase, async (req, res, next) => {
  try {
    const access_token = req.body && req.body.access_token;
    const password = req.body && req.body.password;
    if (!access_token) return res.status(400).json({ error: 'Link inválido ou expirado.' });
    if (!password || String(password).length < 8) return res.status(422).json({ error: 'A senha precisa de ao menos 8 caracteres.' });
    const { data, error } = await adminClient().auth.getUser(access_token);
    if (error || !data || !data.user) return res.status(400).json({ error: 'Link inválido ou expirado.' });
    const upd = await adminClient().auth.admin.updateUserById(data.user.id, { password: String(password) });
    if (upd.error) throw upd.error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// GET /api/auth/perfil/departamentos — TODOS os departamentos a que o usuário está
// vinculado (perfil + responsável). Read-only, para exibir na página de Perfil.
// Lê o metadata FRESCO (getUserById) p/ não depender de relogin após o admin trocar o setor.
authRouter.get('/auth/perfil/departamentos', requireAuth, async (req, res, next) => {
  try {
    const auth = await carregarAutorizacao(req);
    const empresaId = auth && auth.empresaId;
    if (!empresaId) return res.json({ departamentos: [] });
    let profileDeptId = (req.user.user_metadata && req.user.user_metadata.departamentoId) || null;
    try { const g = await adminClient().auth.admin.getUserById(req.user.id); const md = g?.data?.user?.user_metadata; if (md && md.departamentoId != null) profileDeptId = md.departamentoId; } catch (e) {}
    const { data: deps } = await adminClient().from('departamentos').select('id,nome,responsavel_id').eq('empresa', empresaId);
    const meus = (deps || []).filter((d) =>
      (profileDeptId != null && String(d.id) === String(profileDeptId)) || d.responsavel_id === req.user.id,
    ).map((d) => d.nome);
    res.json({ departamentos: [...new Set(meus)] });
  } catch (err) { next(err); }
});

authRouter.get('/auth/me', requireAuth, async (req, res, next) => {
  try {
    // Papel e permissões REAIS (de empresa_membros), não mais de metadados vazios.
    const auth = await carregarAutorizacao(req);
    res.json({
      user: {
        ...publicUser(req.user),
        empresaId: auth.empresaId,
        empresa: auth.empresaId ? { id: auth.empresaId, nome: auth.empresaNome } : null, // NOVO · null-safe
        cargo: (req.user.user_metadata && req.user.user_metadata.cargo) || null, // cargo da ficha (por-usuário, do Auth)
        ...perfilDoMetadata(req.user), // campos do Perfil — vêm do user_metadata já carregado (SEM query nova)
        papel: auth.papel,            // ex.: 'admin_loja' | 'atendente' | 'super_admin'
        papelNome: auth.papelNome,    // ex.: 'Admin da Loja'
        permissoes: Array.from(auth.permissoes), // ex.: ['catalogo.ver', ...]
      },
    });
  } catch (err) { next(err); }
});

// ---- PATCH /api/auth/perfil — atualiza os dados do PRÓPRIO usuário (user_metadata) ----
// E-mail é READ-ONLY (não entra aqui). Faz MERGE: preserva o que já existe e
// sobrepõe só os campos enviados. Usa req.user.id (do token validado) — seguro.
// Preferências (Fase 2) — todas opcionais; gravadas em user_metadata.preferencias.
const prefsSchema = z.object({
  receberConversas: z.boolean(), notifSonoras: z.boolean(), emailDiario: z.boolean(),
  notifNovaMensagem: z.boolean(), notifTransferida: z.boolean(), notifAguardando: z.boolean(),
  notifResumoEmail: z.boolean(), notifPlataforma: z.boolean(),
  tema: z.enum(['light', 'dark']), densidade: z.enum(['compact', 'regular', 'comfy']),
}).partial().strip();

const perfilSchema = z.object({
  name: z.string().trim().max(120).optional(),          // "Como prefere ser chamado(a)" = nome de exibição
  nomeCompleto: z.string().trim().max(160).optional(),
  telefone: z.string().trim().max(40).optional(),
  cargo: z.string().trim().max(120).optional(),
  departamento: z.string().trim().max(120).optional(),
  nascimento: z.string().trim().max(20).optional(),
  endereco: z.string().trim().max(200).optional(),
  bio: z.string().trim().max(2000).optional(),
  preferencias: prefsSchema.optional(),
}).strip();

authRouter.patch('/auth/perfil', requireAuth, validateBody(perfilSchema), async (req, res, next) => {
  try {
    const b = req.body;
    const meta = { ...(req.user.user_metadata || {}) }; // merge: não perde campos não enviados
    const mapa = { name: 'name', nomeCompleto: 'nome_completo', telefone: 'telefone', cargo: 'cargo', departamento: 'departamento', nascimento: 'nascimento', endereco: 'endereco', bio: 'bio' };
    Object.keys(mapa).forEach((k) => { if (b[k] !== undefined) meta[mapa[k]] = b[k]; });
    if (b.preferencias !== undefined) meta.preferencias = { ...(meta.preferencias || {}), ...b.preferencias }; // merge das prefs
    const { data, error } = await adminClient().auth.admin.updateUserById(req.user.id, { user_metadata: meta });
    if (error) throw error;
    const u = data.user;
    res.json({ user: { ...publicUser(u), cargo: (u.user_metadata && u.user_metadata.cargo) || null, ...perfilDoMetadata(u) } });
  } catch (err) { next(err); }
});

// ---- POST /api/auth/perfil/foto — sobe a foto de perfil (bucket "arquivos") ----
authRouter.post('/auth/perfil/foto', requireAuth, fotoUpload.single('foto'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    if (!/^image\/(png|jpe?g|webp)$/i.test(req.file.mimetype)) return res.status(400).json({ error: 'Envie uma imagem PNG, JPG ou WebP.' });
    const path = `avatares/${req.user.id}`; // caminho fixo por usuário (upsert sobrescreve)
    const storage = adminClient().storage.from(BUCKET);
    const up = await storage.upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
    if (up.error) throw up.error;
    const publicUrl = storage.getPublicUrl(path).data.publicUrl + '?v=' + req.file.size; // cache-bust
    const meta = { ...(req.user.user_metadata || {}), foto_url: publicUrl };
    const { error } = await adminClient().auth.admin.updateUserById(req.user.id, { user_metadata: meta });
    if (error) throw error;
    res.status(201).json({ fotoUrl: publicUrl });
  } catch (err) { next(err); }
});

// ---- DELETE /api/auth/perfil/foto — remove a foto de perfil ----
authRouter.delete('/auth/perfil/foto', requireAuth, async (req, res, next) => {
  try {
    try { await adminClient().storage.from(BUCKET).remove([`avatares/${req.user.id}`]); } catch (e) { /* best-effort */ }
    const meta = { ...(req.user.user_metadata || {}) };
    delete meta.foto_url;
    const { error } = await adminClient().auth.admin.updateUserById(req.user.id, { user_metadata: meta });
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ---- POST /api/auth/senha — troca a senha do PRÓPRIO usuário ----
// Segurança: confere a senha ATUAL re-autenticando num cliente ISOLADO (não toca na
// sessão/cookies atuais). authLimiter trava brute-force. A sessão atual NÃO cai.
const senhaSchema = z.object({
  senhaAtual: z.string().min(1, 'Informe a senha atual.').max(200),
  novaSenha: z.string().min(8, 'A nova senha precisa de ao menos 8 caracteres.').max(200),
}).strip();

authRouter.post('/auth/senha', authLimiter, ensureSupabase, requireAuth, validateBody(senhaSchema), async (req, res, next) => {
  try {
    const { senhaAtual, novaSenha } = req.body;
    const email = req.user.email;
    if (!email) return res.status(400).json({ error: 'Conta sem e-mail — não é possível trocar a senha por aqui.' });

    // 1) Confere a senha ATUAL (re-autenticação isolada — authClient é persistSession:false).
    const check = await authClient.auth.signInWithPassword({ email, password: senhaAtual });
    if (check.error || !(check.data && check.data.user)) {
      return res.status(401).json({ error: 'Senha atual incorreta.' });
    }

    // 2) Troca a senha via admin (não derruba a sessão atual do usuário).
    const upd = await adminClient().auth.admin.updateUserById(req.user.id, { password: novaSenha });
    if (upd.error) throw upd.error;

    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ---- GET /api/auth/sessoes — logins/acessos recentes do PRÓPRIO usuário ----
// Lê via req.supabase (RLS self-select da migration 0029) — só os do próprio user.
authRouter.get('/auth/sessoes', requireAuth, async (req, res, next) => {
  try {
    const { data } = await req.supabase
      .from('login_eventos')
      .select('id, ip, user_agent, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    res.json({ sessoes: (data || []).map((r) => ({ id: r.id, ip: r.ip || null, userAgent: r.user_agent || '', createdAt: r.created_at })) });
  } catch (err) { next(err); }
});

// ---- POST /api/auth/sessoes/sair-todos — revoga TODAS as sessões do usuário ----
authRouter.post('/auth/sessoes/sair-todos', requireAuth, async (req, res, next) => {
  try {
    // Revoga todos os refresh tokens do usuário (escopo global). Best-effort.
    try { await adminClient().auth.admin.signOut(req.accessToken, 'global'); }
    catch (e) { console.error('[auth] sair-todos (signOut global) falhou:', (e && e.message) || e); }
    clearSessionCookies(res); // derruba também a sessão atual (deste dispositivo)
    res.json({ ok: true });
  } catch (err) { next(err); }
});
