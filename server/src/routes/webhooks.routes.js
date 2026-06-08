// webhooks.routes.js — recebe eventos da Meta (Instagram, Messenger, WhatsApp).
//
// É a ÚNICA família de rotas públicas (sem login): a Meta chama aqui quando
// chega uma mensagem. Segurança:
//   - GET  valida o verify_token (handshake do webhook).
//   - POST valida a assinatura HMAC (X-Hub-Signature-256) contra o corpo CRU.
//   - Cada mensagem é amarrada à empresa dona da conta e salva nas MESMAS
//     tabelas do chatbot (chatbot-contatos / chatbot-mensagens).
import { Router } from 'express';
import { config } from '../config.js';
import { adminClient } from '../lib/supabase.js';
import * as ig from '../lib/instagram.js';
import * as fb from '../lib/facebook.js';
import * as wa from '../lib/whatsapp.js';
import * as store from '../lib/integracoes.js';

export const webhooksRouter = Router();

const BUCKET = 'arquivos';

// ============================ helpers compartilhados ============================

// Acha (ou cria) o contato de uma pessoa, isolado por empresa+canal.
async function acharOuCriarContato(db, { empresaId, canal, senderId, perfil }) {
  let { data: contato } = await db.from('chatbot-contatos')
    .select('id,cliente_id,qtd_mensagem_nao_lida')
    .eq('empresa_id', empresaId).eq('origemcontato', canal).eq('external_id', senderId)
    .maybeSingle();
  if (contato) return contato;

  const nome = (perfil && perfil.nome) || 'Contato ' + canal + ' ' + String(senderId).slice(-4);
  const { data: cli, error: cErr } = await db.from('clientes')
    .insert({ nome, empresa_id: empresaId, temcontato: true, fotolink: (perfil && perfil.foto) || null })
    .select('id').single();
  if (cErr) throw cErr;

  const { data: novo, error: ctErr } = await db.from('chatbot-contatos')
    .insert({ empresa_id: empresaId, cliente_id: cli.id, nome, origemcontato: canal, external_id: String(senderId), statuschat: 'ativo' })
    .select('id,cliente_id,qtd_mensagem_nao_lida').single();
  if (ctErr) throw ctErr;
  return novo;
}

// Grava as mensagens recebidas e atualiza o contato (não lida + horário).
async function salvarMensagens(db, contato, linhas) {
  if (!linhas.length) return;
  const { error } = await db.from('chatbot-mensagens').insert(linhas.map((l) => ({ ...l, contato: contato.id, enviadopor: '' })));
  if (error) throw error;
  const ultima = linhas[linhas.length - 1].created_at || new Date().toISOString();
  await db.from('chatbot-contatos').update({
    ultimamsg: ultima,
    nova_mensagem: true,
    qtd_mensagem_nao_lida: (contato.qtd_mensagem_nao_lida || 0) + linhas.length,
  }).eq('id', contato.id);
}

// ============================ INSTAGRAM ============================

webhooksRouter.get('/instagram', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  if (mode === 'subscribe' && token && token === config.instagram.webhookVerifyToken) {
    return res.status(200).send(String(req.query['hub.challenge'] || ''));
  }
  return res.sendStatus(403);
});

webhooksRouter.post('/instagram', async (req, res) => {
  const signature = req.get('x-hub-signature-256') || '';
  const raw = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
  if (!ig.verifyWebhookSignature(raw, signature)) return res.sendStatus(403);

  // Serverless (Vercel): processamos ANTES de responder, senão a função pode ser
  // congelada após o res e perder a gravação. Sempre respondemos 200 no fim.
  try {
    const body = req.body || {};
    if (body.object === 'instagram') {
      for (const entry of body.entry || []) {
        for (const ev of entry.messaging || []) {
          try { await processarMensageria('instagram', ev); } catch (e) { console.error('[wh ig]', e?.message || e); }
        }
      }
    }
  } catch (e) { console.error('[wh ig]', e?.message || e); }
  res.sendStatus(200);
});

// ============================ FACEBOOK MESSENGER ============================

webhooksRouter.get('/facebook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  if (mode === 'subscribe' && token && token === config.facebook.webhookVerifyToken) {
    return res.status(200).send(String(req.query['hub.challenge'] || ''));
  }
  return res.sendStatus(403);
});

webhooksRouter.post('/facebook', async (req, res) => {
  const signature = req.get('x-hub-signature-256') || '';
  const raw = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
  console.log('[wh fb] POST recebido | tem assinatura?', !!signature, '| bytes', raw.length, '| object', req.body && req.body.object);
  if (!fb.verifyWebhookSignature(raw, signature)) {
    console.error('[wh fb] ASSINATURA INVÁLIDA — confira se FB_APP_SECRET no Vercel é igual à chave do app');
    return res.sendStatus(403);
  }

  try {
    const body = req.body || {};
    console.log('[wh fb] payload:', JSON.stringify(body).slice(0, 1000));
    if (body.object === 'page') {
      for (const entry of body.entry || []) {
        for (const ev of entry.messaging || []) {
          try { await processarMensageria('facebook', ev); } catch (e) { console.error('[wh fb]', e?.message || e); }
        }
      }
    } else {
      console.log('[wh fb] object não é "page":', body.object);
    }
  } catch (e) { console.error('[wh fb]', e?.message || e); }
  res.sendStatus(200);
});

// Instagram e Messenger compartilham o MESMO formato de evento (messaging[]).
function tipoDoAnexoMeta(t) {
  switch (t) {
    case 'image': return 'imagem';
    case 'video': case 'ig_reel': case 'reel': return 'video';
    case 'audio': return 'audio';
    case 'file': return 'arquivo';
    default: return 'arquivo';
  }
}

async function processarMensageria(canal, ev) {
  const message = ev.message;
  console.log(`[wh ${canal}] evento | sender=${ev.sender && ev.sender.id} recipient=${ev.recipient && ev.recipient.id} echo=${message && message.is_echo} texto=${message && message.text}`);
  if (!message || message.is_echo) { console.log(`[wh ${canal}] ignorado (sem message ou echo)`); return; }

  const senderId = ev.sender?.id ? String(ev.sender.id) : null;
  const recipientId = ev.recipient?.id ? String(ev.recipient.id) : null;
  if (!senderId || !recipientId) { console.log(`[wh ${canal}] sem sender/recipient`); return; }

  const integ = await store.findByExternalId(canal, recipientId);
  console.log(`[wh ${canal}] integração p/ recipient ${recipientId}:`, integ ? ('achou status=' + integ.status) : 'NÃO ACHOU (id da página não bate com o conectado)');
  if (!integ || integ.status !== 'conectado') return;
  const db = adminClient();

  // Perfil de quem mandou (best-effort, usa o token do canal).
  let perfil = { nome: null, foto: null };
  try {
    const tok = await store.getActiveToken(integ, canal);
    if (tok) perfil = canal === 'instagram'
      ? await ig.getSenderProfile(senderId, tok.token)
      : await fb.getSenderProfile(senderId, tok.token);
  } catch { /* sem perfil */ }

  const contato = await acharOuCriarContato(db, { empresaId: integ.empresa_id, canal, senderId, perfil });

  const tsIso = ev.timestamp ? new Date(Number(ev.timestamp)).toISOString() : new Date().toISOString();
  const linhas = [];
  if (message.text && String(message.text).trim()) {
    linhas.push({ tipomidia: 'texto', texto: String(message.text), created_at: tsIso });
  }
  for (const att of message.attachments || []) {
    linhas.push({ tipomidia: tipoDoAnexoMeta(att.type), texto: null, linkmidia: att?.payload?.url || null, titulomidia: att?.payload?.title || null, created_at: tsIso });
  }
  await salvarMensagens(db, contato, linhas);
}

// ============================ WHATSAPP ============================

webhooksRouter.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  if (mode === 'subscribe' && token && token === config.whatsapp.webhookVerifyToken) {
    return res.status(200).send(String(req.query['hub.challenge'] || ''));
  }
  return res.sendStatus(403);
});

webhooksRouter.post('/whatsapp', async (req, res) => {
  const signature = req.get('x-hub-signature-256') || '';
  const raw = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
  if (!wa.verifyWebhookSignature(raw, signature)) return res.sendStatus(403);

  try {
    const body = req.body || {};
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const ch of entry.changes || []) {
          if (ch.field !== 'messages') continue;
          try { await processarWhatsapp(ch.value || {}); } catch (e) { console.error('[wh wa]', e?.message || e); }
        }
      }
    }
  } catch (e) { console.error('[wh wa]', e?.message || e); }
  res.sendStatus(200);
});

const WA_TIPO = { image: 'imagem', audio: 'audio', voice: 'audio', video: 'video', document: 'arquivo', sticker: 'imagem' };

async function processarWhatsapp(value) {
  const messages = value.messages || [];
  if (!messages.length) return; // ignora 'statuses' (recibos de entrega) por enquanto

  const phoneNumberId = value.metadata?.phone_number_id ? String(value.metadata.phone_number_id) : null;
  if (!phoneNumberId) return;

  const integ = await store.findByExternalId('whatsapp', phoneNumberId);
  if (!integ || integ.status !== 'conectado') return;
  const db = adminClient();
  const empresaId = integ.empresa_id;

  // Nome do contato vem em contacts[].profile.name.
  const contatosMeta = {};
  (value.contacts || []).forEach((c) => { if (c.wa_id) contatosMeta[String(c.wa_id)] = c.profile?.name || null; });

  // token (p/ baixar mídias) — best-effort.
  let token = null;
  try { const t = await store.getActiveToken(integ, 'whatsapp'); token = t ? t.token : null; } catch { /* */ }

  for (const msg of messages) {
    const senderId = String(msg.from);
    const perfil = { nome: contatosMeta[senderId] || null, foto: null };
    const contato = await acharOuCriarContato(db, { empresaId, canal: 'whatsapp', senderId, perfil });

    const tsIso = msg.timestamp ? new Date(Number(msg.timestamp) * 1000).toISOString() : new Date().toISOString();
    const linha = { created_at: tsIso, texto: null };

    if (msg.type === 'text') {
      linha.tipomidia = 'texto';
      linha.texto = msg.text?.body || '';
    } else if (WA_TIPO[msg.type]) {
      linha.tipomidia = WA_TIPO[msg.type];
      const mid = msg[msg.type] || {};
      linha.texto = mid.caption || null;
      linha.titulomidia = mid.filename || null;
      // Re-hospeda a mídia no nosso Storage (a URL da Meta exige token p/ baixar).
      if (token && mid.id) {
        try {
          const info = await wa.getMediaUrl(mid.id, token);
          if (info.url) {
            const dl = await wa.downloadMedia(info.url, token);
            const ext = (info.mime || dl.mime || '').split('/')[1] || 'bin';
            const path = `${empresaId}/wa-${mid.id}.${ext}`;
            const storage = adminClient().storage.from(BUCKET);
            const up = await storage.upload(path, dl.buffer, { contentType: dl.mime || info.mime, upsert: true });
            if (!up.error) linha.linkmidia = storage.getPublicUrl(path).data.publicUrl;
          }
        } catch (e) { console.error('[wh wa midia]', e?.message || e); }
      }
    } else {
      // tipos não tratados (location, contacts, reaction…): registra como texto curto
      linha.tipomidia = 'texto';
      linha.texto = '[mensagem do tipo ' + msg.type + ']';
    }

    await salvarMensagens(db, contato, [linha]);
  }
}
