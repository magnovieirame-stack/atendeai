// auth.routes.js — autenticação via Supabase Auth.
//
//   POST /api/auth/login   { email, senha }  -> cria sessão, grava cookies httpOnly
//   POST /api/auth/logout                     -> encerra sessão e limpa cookies
//   GET  /api/auth/me                          -> dados do usuário logado
//
// O token NUNCA é devolvido no corpo da resposta — só vai em cookie httpOnly.
import { Router } from 'express';
import { z } from 'zod';
import { authClient } from '../lib/supabase.js';
import { supabaseReady } from '../config.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/security.js';
import { setSessionCookies, clearSessionCookies, REFRESH_COOKIE } from '../lib/cookies.js';
import { carregarAutorizacao } from '../lib/autorizacao.js';

export const authRouter = Router();

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
        papel: auth.papel,            // ex.: 'admin_loja' | 'atendente' | 'super_admin'
        papelNome: auth.papelNome,    // ex.: 'Admin da Loja'
        permissoes: Array.from(auth.permissoes), // ex.: ['catalogo.ver', ...]
      },
    });
  } catch (err) { next(err); }
});
