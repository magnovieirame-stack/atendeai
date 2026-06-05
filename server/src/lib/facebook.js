// facebook.js — cliente da API do Messenger (Meta / Páginas do Facebook).
//
// Fluxo: o usuário faz login com o Facebook (OAuth), escolhemos a Página dele e
// guardamos o TOKEN DA PÁGINA (não expira) cifrado. As mensagens da Página caem
// no webhook e são respondidas com esse token. Tudo no servidor.
import crypto from 'node:crypto';
import { config } from '../config.js';

const GRAPH = 'https://graph.facebook.com';
const VERSION = 'v23.0';

async function callMeta(url, init, contexto) {
  const res = await fetch(url, init);
  let body = null;
  try { body = await res.json(); } catch { /* sem json */ }
  if (!res.ok) {
    const msg = body?.error?.message || ('HTTP ' + res.status);
    const err = new Error('Facebook (' + contexto + '): ' + msg);
    err.status = res.status >= 400 && res.status < 500 ? 400 : 502;
    throw err;
  }
  return body || {};
}

// 1) URL de login + consentimento.
export function buildAuthUrl(state) {
  const p = new URLSearchParams({
    client_id: config.facebook.appId,
    redirect_uri: config.facebook.redirectUri,
    state,
    scope: config.facebook.scopes,
    response_type: 'code',
  });
  return 'https://www.facebook.com/' + VERSION + '/dialog/oauth?' + p.toString();
}

// 2) code -> token de usuário (curto).
export async function exchangeCodeForToken(code) {
  const p = new URLSearchParams({
    client_id: config.facebook.appId,
    client_secret: config.facebook.appSecret,
    redirect_uri: config.facebook.redirectUri,
    code,
  });
  const data = await callMeta(GRAPH + '/' + VERSION + '/oauth/access_token?' + p.toString(), { method: 'GET' }, 'troca de code');
  return data.access_token;
}

// 3) token de usuário curto -> longo (~60 dias).
export async function exchangeForLongLived(shortToken) {
  const p = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: config.facebook.appId,
    client_secret: config.facebook.appSecret,
    fb_exchange_token: shortToken,
  });
  const data = await callMeta(GRAPH + '/' + VERSION + '/oauth/access_token?' + p.toString(), { method: 'GET' }, 'token longo');
  return data.access_token;
}

// 4) Páginas que o usuário administra (cada uma já vem com seu page token, que
//    é de longa duração quando obtido a partir de um user token longo).
export async function getPages(userToken) {
  const p = new URLSearchParams({ fields: 'id,name,access_token,picture', access_token: userToken });
  const data = await callMeta(GRAPH + '/' + VERSION + '/me/accounts?' + p.toString(), { method: 'GET' }, 'páginas');
  return (data.data || []).map((pg) => ({
    id: String(pg.id),
    name: pg.name || null,
    token: pg.access_token,
    foto: pg.picture?.data?.url || null,
  }));
}

// 5) Inscreve nosso app para receber mensagens daquela Página.
export async function subscribeAppToPage(pageId, pageToken) {
  const body = new URLSearchParams({ subscribed_fields: 'messages,messaging_postbacks', access_token: pageToken });
  return callMeta(GRAPH + '/' + VERSION + '/' + pageId + '/subscribed_apps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  }, 'inscrição de webhook');
}

// 6) Perfil de quem mandou a mensagem (best-effort).
export async function getSenderProfile(psid, pageToken) {
  try {
    const p = new URLSearchParams({ fields: 'name,profile_pic', access_token: pageToken });
    const data = await callMeta(GRAPH + '/' + VERSION + '/' + psid + '?' + p.toString(), { method: 'GET' }, 'perfil remetente');
    return { nome: data.name || null, foto: data.profile_pic || null };
  } catch { return { nome: null, foto: null }; }
}

// 7) Envio de texto.
export async function sendText({ token, recipientId, text }) {
  return callMeta(GRAPH + '/' + VERSION + '/me/messages?access_token=' + encodeURIComponent(token), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
  }, 'envio de texto');
}

// 8) Envio de mídia por URL.
export async function sendMedia({ token, recipientId, type, url }) {
  return callMeta(GRAPH + '/' + VERSION + '/me/messages?access_token=' + encodeURIComponent(token), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { attachment: { type, payload: { url, is_reusable: true } } } }),
  }, 'envio de mídia');
}

// 9) Verificação da assinatura do webhook (segredo do app do Facebook).
export function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!signatureHeader || !config.facebook.appSecret) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', config.facebook.appSecret).update(rawBody).digest('hex');
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
