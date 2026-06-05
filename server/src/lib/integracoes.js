// integracoes.js — acesso à tabela integracoes_canais (camada de dados).
//
// Centraliza leitura/gravação das conexões de canal e o manuseio do token
// CIFRADO. Usado pelas rotas de integração, pelo webhook e pelo envio do
// chatbot. Sempre via service_role (adminClient): o webhook não tem sessão de
// usuário; nas rotas autenticadas o escopo por empresa é garantido a montante.
import { adminClient } from './supabase.js';
import { encryptSecret, decryptSecret } from './crypto.js';
import * as ig from './instagram.js';
import * as gcal from './google.js';

const TABLE = 'integracoes_canais';

// DTO seguro para o frontend — NUNCA inclui o token.
export function mapPublic(row) {
  if (!row) return null;
  return {
    canal: row.canal,
    status: row.status,
    username: row.username || null,
    nome: row.nome || null,
    foto: row.foto || null,
    conectadoEm: row.updated_at || row.created_at || null,
    expiraEm: row.token_expira_em || null,
    erro: row.status === 'erro' ? (row.ultimo_erro || null) : null,
  };
}

export async function listIntegracoes(empresaId) {
  const { data, error } = await adminClient().from(TABLE).select('*').eq('empresa_id', empresaId);
  if (error) throw error;
  return data || [];
}

export async function getIntegracao(empresaId, canal) {
  const { data, error } = await adminClient().from(TABLE).select('*').eq('empresa_id', empresaId).eq('canal', canal).maybeSingle();
  if (error) throw error;
  return data || null;
}

// Acha a integração pela conta da plataforma (recipient.id do webhook).
export async function findByExternalId(canal, externalId) {
  const { data, error } = await adminClient().from(TABLE).select('*').eq('canal', canal).eq('external_id', externalId).maybeSingle();
  if (error) throw error;
  return data || null;
}

// Cria/atualiza a conexão do Instagram após o OAuth (token já vem em texto puro
// aqui e é cifrado antes de tocar o banco).
export async function upsertInstagram(empresaId, { profile, token, expiresIn, scopes }) {
  const expiraEm = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
  const row = {
    empresa_id: empresaId,
    canal: 'instagram',
    status: 'conectado',
    external_id: profile.igId,
    username: profile.username,
    nome: profile.nome,
    foto: profile.foto,
    access_token_enc: encryptSecret(token),
    token_expira_em: expiraEm,
    escopos: scopes || null,
    ultimo_erro: null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await adminClient().from(TABLE).upsert(row, { onConflict: 'empresa_id,canal' }).select('*').single();
  if (error) throw error;
  return data;
}

// --- Facebook Messenger ---
// Guarda temporariamente as páginas do usuário (tokens cifrados) enquanto ele
// escolhe qual conectar. Reusa o status 'desconectado' (= ainda não ativo).
export async function salvarFacebookPendentes(empresaId, pages) {
  const pendentes = pages.map((p) => ({ id: p.id, name: p.name, foto: p.foto || null, token: encryptSecret(p.token) }));
  const row = {
    empresa_id: empresaId, canal: 'facebook', status: 'desconectado',
    external_id: null, access_token_enc: null, token_expira_em: null,
    meta: { pendentes }, updated_at: new Date().toISOString(),
  };
  const { error } = await adminClient().from(TABLE).upsert(row, { onConflict: 'empresa_id,canal' });
  if (error) throw error;
}

export async function getFacebookPendentes(empresaId) {
  const row = await getIntegracao(empresaId, 'facebook');
  return (row && row.meta && Array.isArray(row.meta.pendentes)) ? row.meta.pendentes : [];
}

// Conecta uma Página específica (já com o token em texto puro, que é cifrado aqui).
export async function conectarFacebook(empresaId, { id, name, foto, token }) {
  const row = {
    empresa_id: empresaId, canal: 'facebook', status: 'conectado',
    external_id: String(id), username: name || null, nome: name || null, foto: foto || null,
    access_token_enc: encryptSecret(token), token_expira_em: null, escopos: null,
    ultimo_erro: null, meta: {}, updated_at: new Date().toISOString(),
  };
  const { data, error } = await adminClient().from(TABLE).upsert(row, { onConflict: 'empresa_id,canal' }).select('*').single();
  if (error) throw error;
  return data;
}

// Recupera o token (decifrado) de uma página pendente, p/ a etapa de seleção.
export async function lerFacebookPendentePorId(empresaId, pageId) {
  const pendentes = await getFacebookPendentes(empresaId);
  const p = pendentes.find((x) => String(x.id) === String(pageId));
  if (!p) return null;
  return { token: decryptSecret(p.token), page: { id: p.id, name: p.name, foto: p.foto } };
}

// --- WhatsApp (conexão manual) ---
export async function conectarWhatsapp(empresaId, { phoneNumberId, token, displayPhone, nome, wabaId }) {
  const row = {
    empresa_id: empresaId, canal: 'whatsapp', status: 'conectado',
    external_id: String(phoneNumberId), username: displayPhone || null, nome: nome || displayPhone || null, foto: null,
    access_token_enc: encryptSecret(token), token_expira_em: null, escopos: null,
    ultimo_erro: null, meta: { wabaId: wabaId || null, displayPhone: displayPhone || null }, updated_at: new Date().toISOString(),
  };
  const { data, error } = await adminClient().from(TABLE).upsert(row, { onConflict: 'empresa_id,canal' }).select('*').single();
  if (error) throw error;
  return data;
}

// --- Google Calendar ---
export async function conectarGoogle(empresaId, { refreshToken, email, calendarId }) {
  const row = {
    empresa_id: empresaId, canal: 'google_calendar', status: 'conectado',
    external_id: email || null, username: email || null, nome: email || null, foto: null,
    access_token_enc: encryptSecret(refreshToken), token_expira_em: null, escopos: null,
    ultimo_erro: null, meta: { calendarId: calendarId || 'primary' }, updated_at: new Date().toISOString(),
  };
  const { data, error } = await adminClient().from(TABLE).upsert(row, { onConflict: 'empresa_id,canal' }).select('*').single();
  if (error) throw error;
  return data;
}

// Devolve um access token válido (gerado a partir do refresh token) + calendarId.
// Retorna null se a empresa não conectou o Google. Não lança em caso de falha de
// rede aqui (o chamador trata como "não sincronizado").
export async function getGoogleAccess(empresaId) {
  const row = await getIntegracao(empresaId, 'google_calendar');
  if (!row || row.status !== 'conectado' || !row.access_token_enc) return null;
  const refreshToken = decryptSecret(row.access_token_enc);
  const { accessToken } = await gcal.refreshAccessToken(refreshToken);
  if (!accessToken) return null;
  return { accessToken, calendarId: (row.meta && row.meta.calendarId) || 'primary', row };
}

export async function marcarErro(empresaId, canal, msg) {
  try {
    await adminClient().from(TABLE).update({ status: 'erro', ultimo_erro: String(msg || '').slice(0, 500), updated_at: new Date().toISOString() })
      .eq('empresa_id', empresaId).eq('canal', canal);
  } catch { /* best-effort */ }
}

export async function disconnect(empresaId, canal) {
  // Mantemos a linha para histórico, mas zeramos o token e marcamos desconectado.
  const { error } = await adminClient().from(TABLE)
    .update({ status: 'desconectado', access_token_enc: null, token_expira_em: null, updated_at: new Date().toISOString() })
    .eq('empresa_id', empresaId).eq('canal', canal);
  if (error) throw error;
}

// Devolve o token (descriptografado) pronto para uso, renovando se estiver perto
// de expirar. Retorna { token, externalId } ou null se não houver conexão ativa.
export async function getActiveToken(empresaIdOrRow, canal) {
  let row = (empresaIdOrRow && typeof empresaIdOrRow === 'object')
    ? empresaIdOrRow
    : await getIntegracao(empresaIdOrRow, canal);
  if (!row || row.status !== 'conectado' || !row.access_token_enc) return null;

  let token = decryptSecret(row.access_token_enc);

  // Renova proativamente se faltam <= 7 dias (token longo do IG dura ~60 dias).
  const expMs = row.token_expira_em ? new Date(row.token_expira_em).getTime() : 0;
  if (row.canal === 'instagram' && expMs && expMs - Date.now() < 7 * 24 * 60 * 60 * 1000) {
    try {
      const r = await ig.refreshLongLived(token);
      token = r.token;
      const novaExp = r.expiresIn ? new Date(Date.now() + r.expiresIn * 1000).toISOString() : row.token_expira_em;
      await adminClient().from(TABLE)
        .update({ access_token_enc: encryptSecret(token), token_expira_em: novaExp, updated_at: new Date().toISOString() })
        .eq('id', row.id);
    } catch { /* segue com o token atual; se falhar de vez, o envio acusará */ }
  }
  return { token, externalId: row.external_id, row };
}
