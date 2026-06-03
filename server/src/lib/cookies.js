// cookies.js — gerencia os cookies de sessão (httpOnly).
//
// Os tokens do Supabase ficam em cookies httpOnly: o JavaScript do navegador
// NÃO consegue lê-los, então um XSS não rouba a sessão. sameSite=lax protege
// contra CSRF em requisições cross-site.
import { config } from '../config.js';

export const ACCESS_COOKIE = 'sb-access-token';
export const REFRESH_COOKIE = 'sb-refresh-token';

const baseOpts = {
  httpOnly: true,
  sameSite: 'lax',
  secure: config.isProd, // HTTPS obrigatório em produção
  path: '/',
};

// Grava os tokens da sessão Supabase nos cookies.
export function setSessionCookies(res, session) {
  if (!session) return;
  // access token expira junto com a sessão; refresh token dura mais.
  res.cookie(ACCESS_COOKIE, session.access_token, {
    ...baseOpts,
    maxAge: (session.expires_in || 3600) * 1000,
  });
  res.cookie(REFRESH_COOKIE, session.refresh_token, {
    ...baseOpts,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
  });
}

export function clearSessionCookies(res) {
  res.clearCookie(ACCESS_COOKIE, baseOpts);
  res.clearCookie(REFRESH_COOKIE, baseOpts);
}
