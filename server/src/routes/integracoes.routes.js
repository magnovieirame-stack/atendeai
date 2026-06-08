// integracoes.routes.js — MÓDULO INTEGRAÇÕES (canais externos).
//
// Conecta a conta de Instagram da empresa via OAuth (Instagram Login) e guarda
// o token CIFRADO. Tudo passa pelo backend; o token nunca chega ao navegador.
//
// Rotas (todas exigem login, exceto a natureza do callback que também valida o
// "state" assinado + cookie anti-CSRF):
//   GET    /api/integracoes                      -> status de cada canal (sem token)
//   GET    /api/integracoes/instagram/connect    -> 302 p/ o login do Instagram
//   GET    /api/integracoes/instagram/callback   -> recebe o code, salva a conexão
//   DELETE /api/integracoes/instagram            -> desconecta
import { Router } from 'express';
import { z } from 'zod';
import { config, instagramReady, facebookReady, whatsappReady, googleReady } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermissao } from '../lib/autorizacao.js';
import { validateBody } from '../middleware/validate.js';
import { signState, verifyState, randomToken } from '../lib/crypto.js';
import * as ig from '../lib/instagram.js';
import * as fb from '../lib/facebook.js';
import * as wa from '../lib/whatsapp.js';
import * as gcal from '../lib/google.js';
import * as store from '../lib/integracoes.js';

export const integracoesRouter = Router();

const STATE_COOKIE = 'ig_oauth_state';
const stateCookieOpts = {
  httpOnly: true,
  sameSite: 'lax',
  secure: config.isProd,
  path: '/api/integracoes',
  maxAge: 10 * 60 * 1000, // 10 min
};

// Empresa do usuário logado (mesma lógica do módulo chatbot).
async function getEmpresaId(req) {
  const { data } = await req.supabase.from('empresa_membros').select('empresa_id').limit(1);
  return data && data[0] ? data[0].empresa_id : null;
}

// Pequena página HTML que fecha o popup e avisa a janela principal.
const CANAL_LABEL = { instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp', google: 'Google Calendar' };
function popupClose(res, ok, mensagem, canal = 'instagram') {
  const nome = CANAL_LABEL[canal] || 'Canal';
  const payload = JSON.stringify({ source: 'atende-integracao', canal, ok, mensagem: mensagem || '' });
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html><html lang="pt-br"><head><meta charset="utf-8"><title>Conectar canal</title>
<style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}div{max-width:340px;padding:24px}</style></head>
<body><div><h3>${ok ? '✅ ' + nome + ' conectado' : '⚠️ Não foi possível conectar'}</h3>
<p style="opacity:.8;font-size:14px">${(mensagem || (ok ? 'Pode fechar esta janela.' : 'Tente novamente.')).replace(/</g, '&lt;')}</p>
<p style="opacity:.6;font-size:13px">Esta janela fecha sozinha…</p></div>
<script>try{if(window.opener)window.opener.postMessage(${payload},window.location.origin);}catch(e){}setTimeout(function(){window.close();},1500);</script>
</body></html>`);
}

// ---- GET /api/integracoes ------------------------------------------------
integracoesRouter.get('/', requireAuth, requirePermissao('config.gerenciar'), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const rows = empresaId ? await store.listIntegracoes(empresaId) : [];
    const byCanal = {};
    rows.forEach((r) => { byCanal[r.canal] = store.mapPublic(r); });
    res.json({
      integracoes: byCanal,
      instagramDisponivel: instagramReady, // false = app da Meta ainda não configurado no .env
      facebookDisponivel: facebookReady,
      whatsappDisponivel: whatsappReady,
      googleDisponivel: googleReady,
    });
  } catch (err) { next(err); }
});

// ---- GET /api/integracoes/instagram/connect ------------------------------
// Inicia o OAuth: assina um "state" com a empresa, grava cookie anti-CSRF e
// redireciona o popup para o login do Instagram.
integracoesRouter.get('/instagram/connect', requireAuth, requirePermissao('config.gerenciar'), async (req, res, next) => {
  try {
    if (!instagramReady) {
      return popupClose(res, false, 'Integração ainda não configurada no servidor (.env do app da Meta).');
    }
    const empresaId = await getEmpresaId(req);
    if (!empresaId) return popupClose(res, false, 'Sua conta não está vinculada a uma empresa.');

    const nonce = randomToken();
    const state = signState({ empresaId, nonce, ts: Date.now() });
    res.cookie(STATE_COOKIE, nonce, stateCookieOpts);
    return res.redirect(ig.buildAuthUrl(state));
  } catch (err) { next(err); }
});

// ---- GET /api/integracoes/instagram/callback -----------------------------
integracoesRouter.get('/instagram/callback', async (req, res, next) => {
  try {
    if (!instagramReady) return popupClose(res, false, 'Integração não configurada no servidor.');

    // O usuário pode ter recusado o consentimento.
    if (req.query.error) {
      return popupClose(res, false, String(req.query.error_description || req.query.error).slice(0, 200));
    }
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    if (!code || !state) return popupClose(res, false, 'Resposta inválida do Instagram.');

    // Valida o state assinado + cookie (double-submit anti-CSRF).
    const payload = verifyState(state);
    const cookieNonce = req.cookies?.[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE, { ...stateCookieOpts, maxAge: undefined });
    if (!payload || !payload.empresaId || !cookieNonce || cookieNonce !== payload.nonce) {
      return popupClose(res, false, 'Sessão de conexão expirada ou inválida. Tente de novo.');
    }
    const empresaId = payload.empresaId;

    // Troca o code -> token curto -> token longo, e busca o perfil.
    const { shortToken, permissions } = await ig.exchangeCodeForToken(code);
    const { token, expiresIn } = await ig.exchangeForLongLived(shortToken);
    const profile = await ig.getProfile(token);
    if (!profile.igId) return popupClose(res, false, 'Não foi possível ler o perfil do Instagram.');

    await store.upsertInstagram(empresaId, {
      profile, token, expiresIn,
      scopes: Array.isArray(permissions) ? permissions.join(',') : config.instagram.scopes,
    });

    return popupClose(res, true, '@' + (profile.username || profile.igId) + ' conectado com sucesso.');
  } catch (err) {
    // Nunca vaza stack/segredos para o popup.
    return popupClose(res, false, config.isProd ? 'Erro ao conectar.' : (err?.message || 'Erro ao conectar.'));
  }
});

// ---- DELETE /api/integracoes/instagram -----------------------------------
integracoesRouter.delete('/instagram', requireAuth, requirePermissao('config.gerenciar'), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    if (!empresaId) return res.status(403).json({ error: 'Empresa não encontrada.' });
    await store.disconnect(empresaId, 'instagram');
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ===================== FACEBOOK MESSENGER (OAuth + Página) =====================

// ---- GET /api/integracoes/facebook/connect ----
integracoesRouter.get('/facebook/connect', requireAuth, requirePermissao('config.gerenciar'), async (req, res, next) => {
  try {
    if (!facebookReady) return popupClose(res, false, 'Integração ainda não configurada no servidor (.env do app da Meta).', 'facebook');
    const empresaId = await getEmpresaId(req);
    if (!empresaId) return popupClose(res, false, 'Sua conta não está vinculada a uma empresa.', 'facebook');
    const nonce = randomToken();
    const state = signState({ empresaId, nonce, ts: Date.now(), c: 'fb' });
    res.cookie(STATE_COOKIE, nonce, stateCookieOpts);
    return res.redirect(fb.buildAuthUrl(state));
  } catch (err) { next(err); }
});

// ---- GET /api/integracoes/facebook/callback ----
integracoesRouter.get('/facebook/callback', async (req, res) => {
  try {
    if (!facebookReady) return popupClose(res, false, 'Integração não configurada no servidor.', 'facebook');
    if (req.query.error) return popupClose(res, false, String(req.query.error_description || req.query.error).slice(0, 200), 'facebook');
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    if (!code || !state) return popupClose(res, false, 'Resposta inválida do Facebook.', 'facebook');

    const payload = verifyState(state);
    const cookieNonce = req.cookies?.[STATE_COOKIE];
    if (!payload || !payload.empresaId || !cookieNonce || cookieNonce !== payload.nonce) {
      return popupClose(res, false, 'Sessão de conexão expirada ou inválida. Tente de novo.', 'facebook');
    }
    const empresaId = payload.empresaId;

    const shortToken = await fb.exchangeCodeForToken(code);
    const userToken = await fb.exchangeForLongLived(shortToken);
    const pages = await fb.getPages(userToken);
    if (!pages.length) {
      res.clearCookie(STATE_COOKIE, { ...stateCookieOpts, maxAge: undefined });
      return popupClose(res, false, 'Nenhuma Página do Facebook encontrada nesta conta.', 'facebook');
    }

    // Uma página -> conecta direto. Várias -> mostra seletor (mantém o popup aberto).
    if (pages.length === 1) {
      res.clearCookie(STATE_COOKIE, { ...stateCookieOpts, maxAge: undefined });
      const p = pages[0];
      try { await fb.subscribeAppToPage(p.id, p.token); } catch (e) { /* segue mesmo se a inscrição falhar */ }
      await store.conectarFacebook(empresaId, p);
      return popupClose(res, true, 'Página "' + (p.name || p.id) + '" conectada com sucesso.', 'facebook');
    }

    // Várias páginas: guarda os tokens (cifrados) e renderiza um seletor.
    await store.salvarFacebookPendentes(empresaId, pages);
    const novoNonce = randomToken();
    const novoState = signState({ empresaId, nonce: novoNonce, ts: Date.now(), c: 'fb-sel' });
    res.cookie(STATE_COOKIE, novoNonce, stateCookieOpts);
    return renderSeletorPaginas(res, pages, novoState);
  } catch (err) {
    return popupClose(res, false, config.isProd ? 'Erro ao conectar.' : (err?.message || 'Erro ao conectar.'), 'facebook');
  }
});

// ---- GET /api/integracoes/facebook/select?state&pageId  (escolha da Página) ----
integracoesRouter.get('/facebook/select', async (req, res) => {
  try {
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const pageId = typeof req.query.pageId === 'string' ? req.query.pageId : '';
    const payload = verifyState(state);
    const cookieNonce = req.cookies?.[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE, { ...stateCookieOpts, maxAge: undefined });
    if (!payload || payload.c !== 'fb-sel' || !payload.empresaId || !cookieNonce || cookieNonce !== payload.nonce) {
      return popupClose(res, false, 'Seleção expirada ou inválida. Tente conectar de novo.', 'facebook');
    }
    const sel = await store.lerFacebookPendentePorId(payload.empresaId, pageId);
    if (!sel) return popupClose(res, false, 'Página não encontrada. Tente de novo.', 'facebook');
    try { await fb.subscribeAppToPage(sel.page.id, sel.token); } catch (e) { /* best-effort */ }
    await store.conectarFacebook(payload.empresaId, { ...sel.page, token: sel.token });
    return popupClose(res, true, 'Página "' + (sel.page.name || sel.page.id) + '" conectada com sucesso.', 'facebook');
  } catch (err) {
    return popupClose(res, false, config.isProd ? 'Erro ao conectar.' : (err?.message || 'Erro ao conectar.'), 'facebook');
  }
});

// HTML do seletor de Páginas (cada item navega para /facebook/select).
function renderSeletorPaginas(res, pages, state) {
  const itens = pages.map((p) => {
    const url = '/api/integracoes/facebook/select?state=' + encodeURIComponent(state) + '&pageId=' + encodeURIComponent(p.id);
    const nome = String(p.name || p.id).replace(/</g, '&lt;');
    return `<a class="pg" href="${url}">${nome}</a>`;
  }).join('');
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html><html lang="pt-br"><head><meta charset="utf-8"><title>Escolha a Página</title>
<style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.box{max-width:360px;width:90%;padding:24px}.pg{display:block;padding:12px 14px;margin:8px 0;background:#1e293b;border:1px solid #334155;border-radius:10px;color:#e2e8f0;text-decoration:none}
.pg:hover{background:#334155}h3{margin:0 0 6px}p{opacity:.7;font-size:14px;margin:0 0 14px}</style></head>
<body><div class="box"><h3>Escolha a Página</h3><p>Qual Página do Facebook você quer conectar ao atendimento?</p>${itens}</div></body></html>`);
}

// ---- DELETE /api/integracoes/facebook ----
integracoesRouter.delete('/facebook', requireAuth, requirePermissao('config.gerenciar'), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    if (!empresaId) return res.status(403).json({ error: 'Empresa não encontrada.' });
    await store.disconnect(empresaId, 'facebook');
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ===================== WHATSAPP (conexão manual) =====================

const whatsappSchema = z.object({
  phoneNumberId: z.string().trim().min(3, 'Informe o Phone Number ID.').max(60),
  token: z.string().trim().min(20, 'Informe o token de acesso.').max(800),
  wabaId: z.string().trim().max(60).optional().default(''),
}).strip();

// ---- POST /api/integracoes/whatsapp  { phoneNumberId, token, wabaId? } ----
integracoesRouter.post('/whatsapp', requireAuth, requirePermissao('config.gerenciar'), validateBody(whatsappSchema), async (req, res, next) => {
  try {
    if (!whatsappReady) return res.status(503).json({ error: 'Servidor sem chave de criptografia (TOKEN_ENCRYPTION_KEY).' });
    const empresaId = await getEmpresaId(req);
    if (!empresaId) return res.status(403).json({ error: 'Empresa não encontrada.' });

    const { phoneNumberId, token, wabaId } = req.body;
    // Valida o par (id + token) consultando o número na Meta antes de salvar.
    let info;
    try { info = await wa.getNumberInfo({ token, phoneNumberId }); }
    catch (e) { return res.status(400).json({ error: 'Não foi possível validar: ' + (e?.message || 'verifique o Phone Number ID e o token.') }); }

    const row = await store.conectarWhatsapp(empresaId, {
      phoneNumberId, token, wabaId, displayPhone: info.displayPhone, nome: info.nome,
    });
    res.status(201).json({ integracao: store.mapPublic(row) });
  } catch (err) { next(err); }
});

// ---- DELETE /api/integracoes/whatsapp ----
integracoesRouter.delete('/whatsapp', requireAuth, requirePermissao('config.gerenciar'), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    if (!empresaId) return res.status(403).json({ error: 'Empresa não encontrada.' });
    await store.disconnect(empresaId, 'whatsapp');
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ===================== GOOGLE CALENDAR (OAuth) =====================

// ---- GET /api/integracoes/google/connect ----
integracoesRouter.get('/google/connect', requireAuth, requirePermissao('config.gerenciar'), async (req, res, next) => {
  try {
    if (!googleReady) return popupClose(res, false, 'Integração ainda não configurada no servidor (.env do Google).', 'google');
    const empresaId = await getEmpresaId(req);
    if (!empresaId) return popupClose(res, false, 'Sua conta não está vinculada a uma empresa.', 'google');
    const nonce = randomToken();
    const state = signState({ empresaId, nonce, ts: Date.now(), c: 'google' });
    res.cookie(STATE_COOKIE, nonce, stateCookieOpts);
    return res.redirect(gcal.buildAuthUrl(state));
  } catch (err) { next(err); }
});

// ---- GET /api/integracoes/google/callback ----
integracoesRouter.get('/google/callback', async (req, res) => {
  try {
    if (!googleReady) return popupClose(res, false, 'Integração não configurada no servidor.', 'google');
    if (req.query.error) return popupClose(res, false, String(req.query.error_description || req.query.error).slice(0, 200), 'google');
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    if (!code || !state) return popupClose(res, false, 'Resposta inválida do Google.', 'google');

    const payload = verifyState(state);
    const cookieNonce = req.cookies?.[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE, { ...stateCookieOpts, maxAge: undefined });
    if (!payload || !payload.empresaId || !cookieNonce || cookieNonce !== payload.nonce) {
      return popupClose(res, false, 'Sessão de conexão expirada ou inválida. Tente de novo.', 'google');
    }
    const empresaId = payload.empresaId;

    const { accessToken, refreshToken } = await gcal.exchangeCode(code);
    if (!refreshToken) {
      // Sem refresh token não conseguimos agir depois -> peça para reconectar.
      return popupClose(res, false, 'O Google não devolveu autorização offline. Remova o acesso do app na sua Conta Google e tente novamente.', 'google');
    }
    const email = await gcal.getUserEmail(accessToken);
    await store.conectarGoogle(empresaId, { refreshToken, email, calendarId: 'primary' });
    return popupClose(res, true, (email ? email + ' ' : '') + 'conectado com sucesso.', 'google');
  } catch (err) {
    return popupClose(res, false, config.isProd ? 'Erro ao conectar.' : (err?.message || 'Erro ao conectar.'), 'google');
  }
});

// ---- DELETE /api/integracoes/google ----
integracoesRouter.delete('/google', requireAuth, requirePermissao('config.gerenciar'), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    if (!empresaId) return res.status(403).json({ error: 'Empresa não encontrada.' });
    await store.disconnect(empresaId, 'google_calendar');
    res.json({ ok: true });
  } catch (err) { next(err); }
});
