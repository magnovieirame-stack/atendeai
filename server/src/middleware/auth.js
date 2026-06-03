// auth.js — middleware que exige um usuário autenticado (Supabase Auth).
//
// Lê o access token do cookie httpOnly, valida no Supabase e anexa:
//   req.user      -> dados do usuário autenticado
//   req.supabase  -> cliente Supabase com o token do usuário (RLS aplicado!)
//
// Se o access token expirou mas há um refresh token válido, renova a sessão
// de forma transparente e reescreve os cookies.
import { authClient, supabaseForUser } from '../lib/supabase.js';
import { ACCESS_COOKIE, REFRESH_COOKIE, setSessionCookies, clearSessionCookies } from '../lib/cookies.js';

export async function requireAuth(req, res, next) {
  try {
    let accessToken = req.cookies?.[ACCESS_COOKIE];
    const refreshToken = req.cookies?.[REFRESH_COOKIE];

    // 1) Tenta validar o access token atual.
    if (accessToken) {
      const { data, error } = await supabaseForUser(accessToken).auth.getUser();
      if (!error && data?.user) {
        req.user = data.user;
        req.accessToken = accessToken;
        req.supabase = supabaseForUser(accessToken);
        return next();
      }
    }

    // 2) Access inválido/expirado → tenta renovar com o refresh token.
    if (refreshToken && authClient) {
      const { data, error } = await authClient.auth.refreshSession({ refresh_token: refreshToken });
      if (!error && data?.session && data?.user) {
        setSessionCookies(res, data.session);
        req.user = data.user;
        req.accessToken = data.session.access_token;
        req.supabase = supabaseForUser(data.session.access_token);
        return next();
      }
    }

    // 3) Sem sessão válida.
    clearSessionCookies(res);
    return res.status(401).json({ error: 'Não autenticado.' });
  } catch (err) {
    return next(err);
  }
}
