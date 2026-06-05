// instagram.js — cliente da API de Mensagens do Instagram (Meta).
//
// Fluxo "Instagram API with Instagram Login": o cliente loga direto com a conta
// Instagram Profissional/Business (sem precisar de Página do Facebook). Aqui
// concentramos TODA a conversa com a Meta: OAuth, perfil, envio e verificação
// de assinatura do webhook. Nenhum segredo é exposto fora do servidor.
import crypto from 'node:crypto';
import { config } from '../config.js';

const GRAPH = 'https://graph.instagram.com';
const GRAPH_VERSION = 'v23.0';

// ---- pequeno helper de fetch com erro legível ----
async function callMeta(url, init, contexto) {
  const res = await fetch(url, init);
  let body = null;
  try { body = await res.json(); } catch { /* sem corpo json */ }
  if (!res.ok) {
    const msg = body?.error?.message || body?.error_message || ('HTTP ' + res.status);
    const err = new Error('Instagram (' + contexto + '): ' + msg);
    err.status = res.status >= 400 && res.status < 500 ? 400 : 502;
    err.metaError = body?.error || body || null;
    throw err;
  }
  return body || {};
}

// 1) URL de autorização (o usuário é mandado pra cá para fazer login + consentir).
export function buildAuthUrl(state) {
  const p = new URLSearchParams({
    client_id: config.instagram.appId,
    redirect_uri: config.instagram.redirectUri,
    response_type: 'code',
    scope: config.instagram.scopes,
    state,
  });
  return 'https://www.instagram.com/oauth/authorize?' + p.toString();
}

// 2) Troca o "code" do callback por um token de curta duração (+ user_id).
export async function exchangeCodeForToken(code) {
  const form = new URLSearchParams({
    client_id: config.instagram.appId,
    client_secret: config.instagram.appSecret,
    grant_type: 'authorization_code',
    redirect_uri: config.instagram.redirectUri,
    code,
  });
  // Este endpoint fica em api.instagram.com (não no graph).
  const data = await callMeta('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  }, 'troca de code');
  // Resposta: { access_token, user_id, permissions }
  return { shortToken: data.access_token, userId: String(data.user_id), permissions: data.permissions };
}

// 3) Converte o token curto em um token de LONGA duração (~60 dias).
export async function exchangeForLongLived(shortToken) {
  const p = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: config.instagram.appSecret,
    access_token: shortToken,
  });
  const data = await callMeta(GRAPH + '/access_token?' + p.toString(), { method: 'GET' }, 'token longo');
  // Resposta: { access_token, token_type, expires_in }
  return { token: data.access_token, expiresIn: Number(data.expires_in) || 0 };
}

// 4) Renova um token longo antes de expirar (chamável periodicamente).
export async function refreshLongLived(longToken) {
  const p = new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: longToken });
  const data = await callMeta(GRAPH + '/refresh_access_token?' + p.toString(), { method: 'GET' }, 'refresh token');
  return { token: data.access_token, expiresIn: Number(data.expires_in) || 0 };
}

// 5) Dados do perfil conectado (id, @usuário, nome, foto).
export async function getProfile(token) {
  const p = new URLSearchParams({
    fields: 'user_id,username,name,profile_picture_url',
    access_token: token,
  });
  const data = await callMeta(GRAPH + '/' + GRAPH_VERSION + '/me?' + p.toString(), { method: 'GET' }, 'perfil');
  return {
    igId: String(data.user_id || ''),
    username: data.username || null,
    nome: data.name || null,
    foto: data.profile_picture_url || null,
  };
}

// 6) Busca o perfil de QUEM mandou a DM (para nomear o contato no nosso banco).
//    Pode falhar se o usuário não autorizou esse acesso — tratamos como opcional.
export async function getSenderProfile(igsid, token) {
  try {
    const p = new URLSearchParams({ fields: 'name,username,profile_pic', access_token: token });
    const data = await callMeta(GRAPH + '/' + GRAPH_VERSION + '/' + igsid + '?' + p.toString(), { method: 'GET' }, 'perfil remetente');
    return { nome: data.name || null, username: data.username || null, foto: data.profile_pic || null };
  } catch {
    return { nome: null, username: null, foto: null };
  }
}

// 7) Envia uma mensagem de TEXTO para um usuário (resposta do atendente).
export async function sendText({ token, recipientId, text }) {
  const data = await callMeta(GRAPH + '/' + GRAPH_VERSION + '/me/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
  }, 'envio de texto');
  return data; // { recipient_id, message_id }
}

// 8) Envia uma mídia por URL (imagem/áudio/vídeo) já hospedada (ex.: nosso Storage).
export async function sendMedia({ token, recipientId, type, url }) {
  const data = await callMeta(GRAPH + '/' + GRAPH_VERSION + '/me/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { attachment: { type, payload: { url } } } }),
  }, 'envio de mídia');
  return data;
}

// 9) Verifica a assinatura X-Hub-Signature-256 do webhook contra o corpo CRU.
//    Garante que a chamada veio mesmo da Meta (e não foi adulterada).
export function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!signatureHeader || !config.instagram.appSecret) return false;
  const expected = 'sha256=' + crypto
    .createHmac('sha256', config.instagram.appSecret)
    .update(rawBody)
    .digest('hex');
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
