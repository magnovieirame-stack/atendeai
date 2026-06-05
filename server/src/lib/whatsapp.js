// whatsapp.js — cliente da WhatsApp Cloud API (Meta).
//
// Conexão MANUAL: a empresa informa o Phone Number ID + um token (do painel da
// Meta). Guardamos o token cifrado. Mensagens caem no webhook (formato próprio
// do WhatsApp) e são respondidas com esse token.
//
// Observação: o WhatsApp só permite enviar texto livre dentro da janela de 24h
// após a última mensagem do cliente; fora disso exige template aprovado.
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
    const err = new Error('WhatsApp (' + contexto + '): ' + msg);
    err.status = res.status >= 400 && res.status < 500 ? 400 : 502;
    throw err;
  }
  return body || {};
}

// Valida o par (phoneNumberId + token) e retorna os dados do número.
export async function getNumberInfo({ token, phoneNumberId }) {
  const p = new URLSearchParams({ fields: 'display_phone_number,verified_name,quality_rating', access_token: token });
  const data = await callMeta(GRAPH + '/' + VERSION + '/' + phoneNumberId + '?' + p.toString(), { method: 'GET' }, 'validação do número');
  return { displayPhone: data.display_phone_number || null, nome: data.verified_name || null };
}

// Envio de texto.
export async function sendText({ token, phoneNumberId, to, text }) {
  return callMeta(GRAPH + '/' + VERSION + '/' + phoneNumberId + '/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { preview_url: false, body: text } }),
  }, 'envio de texto');
}

// Envio de mídia por URL pública (nosso Storage é público).
export async function sendMedia({ token, phoneNumberId, to, type, link, filename }) {
  // type: image | audio | video | document
  const media = { link };
  if (type === 'document' && filename) media.filename = filename;
  return callMeta(GRAPH + '/' + VERSION + '/' + phoneNumberId + '/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type, [type]: media }),
  }, 'envio de mídia');
}

// Resolve a URL temporária de uma mídia recebida (precisa de token p/ baixar).
export async function getMediaUrl(mediaId, token) {
  const data = await callMeta(GRAPH + '/' + VERSION + '/' + mediaId + '?access_token=' + encodeURIComponent(token), { method: 'GET' }, 'url da mídia');
  return { url: data.url || null, mime: data.mime_type || null, tamanho: data.file_size || null };
}

// Baixa os bytes de uma mídia (a URL exige Authorization Bearer).
export async function downloadMedia(url, token) {
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  if (!res.ok) throw new Error('WhatsApp: falha ao baixar mídia (HTTP ' + res.status + ')');
  const buf = Buffer.from(await res.arrayBuffer());
  return { buffer: buf, mime: res.headers.get('content-type') || 'application/octet-stream' };
}

// Verificação da assinatura do webhook (segredo do mesmo app do Facebook).
export function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!signatureHeader || !config.whatsapp.appSecret) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', config.whatsapp.appSecret).update(rawBody).digest('hex');
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
