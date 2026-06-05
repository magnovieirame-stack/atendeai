// crypto.js — criptografia simétrica dos segredos guardados no banco.
//
// Os tokens de acesso do Instagram (que permitem ler/responder DMs em nome do
// cliente) NUNCA podem ficar em texto puro no banco. Aqui usamos AES-256-GCM
// (cifra autenticada: garante confidencialidade E integridade) com uma chave de
// 32 bytes que vive apenas no .env do servidor (TOKEN_ENCRYPTION_KEY).
//
// Formato do texto cifrado guardado:  "v1:<iv b64>:<tag b64>:<dados b64>"
import crypto from 'node:crypto';
import { config } from '../config.js';

const ALGO = 'aes-256-gcm';
const PREFIX = 'v1';

// Aceita a chave em hex (64 chars) ou base64; precisa render exatamente 32 bytes.
function getKey() {
  const raw = config.tokenEncryptionKey || '';
  if (!raw) throw new Error('TOKEN_ENCRYPTION_KEY não configurada — não é possível criptografar segredos.');
  let key;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) key = Buffer.from(raw, 'hex');
  else key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY inválida — precisa ter 32 bytes (64 hex ou base64 equivalente).');
  }
  return key;
}

// Texto puro -> string cifrada (segura para guardar no banco).
export function encryptSecret(plaintext) {
  if (plaintext == null) return null;
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96 bits, recomendado para GCM
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':');
}

// String cifrada -> texto puro. Lança se foi adulterado (tag não confere).
export function decryptSecret(blob) {
  if (!blob) return null;
  const parts = String(blob).split(':');
  if (parts.length !== 4 || parts[0] !== PREFIX) throw new Error('Segredo cifrado em formato inesperado.');
  const key = getKey();
  const iv = Buffer.from(parts[1], 'base64');
  const tag = Buffer.from(parts[2], 'base64');
  const data = Buffer.from(parts[3], 'base64');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

// --- Assinatura/verificação do "state" do OAuth (anti-CSRF, stateless) ---
// Assinamos um payload com HMAC-SHA256 usando a mesma chave. Como o segredo só
// existe no servidor, o cliente não consegue forjar um state com outra empresa.
export function signState(payloadObj) {
  const key = getKey();
  const json = JSON.stringify(payloadObj);
  const body = Buffer.from(json, 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', key).update(body).digest('base64url');
  return body + '.' + sig;
}

export function verifyState(state, maxAgeMs = 10 * 60 * 1000) {
  if (!state || typeof state !== 'string' || !state.includes('.')) return null;
  const key = getKey();
  const [body, sig] = state.split('.');
  const expected = crypto.createHmac('sha256', key).update(body).digest('base64url');
  // Comparação em tempo constante (evita timing attack).
  const a = Buffer.from(sig || '');
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try { payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch { return null; }
  if (payload.ts && Date.now() - payload.ts > maxAgeMs) return null; // expirado
  return payload;
}

// Token aleatório para o cookie de double-submit do OAuth.
export function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString('base64url');
}
