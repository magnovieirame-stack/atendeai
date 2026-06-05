// google.js — cliente do Google Calendar (OAuth 2.0 + eventos).
//
// O usuário autoriza o acesso ao calendário (offline) e guardamos o REFRESH
// TOKEN cifrado. A cada operação trocamos o refresh token por um access token
// curto e criamos/atualizamos/excluímos o evento. Sincronização de uma via:
// o que é salvo na Agenda do sistema reflete no Google Calendar.
import { config } from '../config.js';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const CAL_API = 'https://www.googleapis.com/calendar/v3';
const USERINFO = 'https://www.googleapis.com/oauth2/v2/userinfo';

async function call(url, init, contexto) {
  const res = await fetch(url, init);
  let body = null;
  try { body = await res.json(); } catch { /* sem json */ }
  if (!res.ok) {
    const msg = body?.error?.message || body?.error_description || body?.error || ('HTTP ' + res.status);
    const err = new Error('Google (' + contexto + '): ' + msg);
    err.status = res.status >= 400 && res.status < 500 ? 400 : 502;
    throw err;
  }
  return body || {};
}

// 1) URL de consentimento. access_type=offline + prompt=consent garantem o
//    refresh_token (necessário para agir sem o usuário presente).
export function buildAuthUrl(state) {
  const p = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: config.google.redirectUri,
    response_type: 'code',
    scope: config.google.scopes,
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    state,
  });
  return AUTH_URL + '?' + p.toString();
}

// 2) Troca o code por tokens (inclui o refresh_token na 1ª autorização).
export async function exchangeCode(code) {
  const body = new URLSearchParams({
    client_id: config.google.clientId,
    client_secret: config.google.clientSecret,
    redirect_uri: config.google.redirectUri,
    grant_type: 'authorization_code',
    code,
  });
  const data = await call(TOKEN_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString(),
  }, 'troca de code');
  return { accessToken: data.access_token, refreshToken: data.refresh_token || null, expiresIn: Number(data.expires_in) || 0 };
}

// 3) Gera um access token novo a partir do refresh token.
export async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    client_id: config.google.clientId,
    client_secret: config.google.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const data = await call(TOKEN_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString(),
  }, 'refresh token');
  return { accessToken: data.access_token, expiresIn: Number(data.expires_in) || 0 };
}

// 4) E-mail da conta conectada (para exibir).
export async function getUserEmail(accessToken) {
  try {
    const data = await call(USERINFO, { headers: { Authorization: 'Bearer ' + accessToken } }, 'perfil');
    return data.email || null;
  } catch { return null; }
}

// --- Montagem do evento a partir de um compromisso da Agenda ---
// data: 'YYYY-MM-DD'; hora: 'HH:MM' (vazio = dia inteiro); dur: minutos.
function somaMinutos(data, hora, mins) {
  const [y, m, d] = data.split('-').map(Number);
  const [hh, mm] = (hora || '00:00').split(':').map(Number);
  const base = Date.UTC(y, m - 1, d, hh, mm); // UTC só p/ aritmética de relógio
  const e = new Date(base + (mins || 0) * 60000);
  const dataFim = e.toISOString().slice(0, 10);
  const horaFim = String(e.getUTCHours()).padStart(2, '0') + ':' + String(e.getUTCMinutes()).padStart(2, '0');
  return { dataFim, horaFim };
}

export function montarEvento(appt) {
  const tz = config.google.timeZone;
  const titulo = appt.servico || appt.tipo || appt.participante || 'Compromisso';
  const descPartes = [];
  if (appt.participante) descPartes.push('Cliente: ' + appt.participante);
  if (appt.telefone) descPartes.push('Telefone: ' + appt.telefone);
  if (appt.responsavel) descPartes.push('Responsável: ' + appt.responsavel);
  if (appt.observacoes) descPartes.push('\n' + appt.observacoes);
  const ev = {
    summary: titulo,
    description: descPartes.join('\n') || undefined,
    location: appt.local || undefined,
  };
  if (appt.hora) {
    const { dataFim, horaFim } = somaMinutos(appt.data, appt.hora, appt.duracao || 60);
    ev.start = { dateTime: appt.data + 'T' + appt.hora + ':00', timeZone: tz };
    ev.end = { dateTime: dataFim + 'T' + horaFim + ':00', timeZone: tz };
  } else {
    // Sem hora -> evento de dia inteiro.
    const { dataFim } = somaMinutos(appt.data, '00:00', 24 * 60);
    ev.start = { date: appt.data };
    ev.end = { date: dataFim };
  }
  return ev;
}

export async function insertEvent(accessToken, calendarId, evento) {
  const data = await call(CAL_API + '/calendars/' + encodeURIComponent(calendarId) + '/events', {
    method: 'POST', headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' }, body: JSON.stringify(evento),
  }, 'criar evento');
  return data; // { id, htmlLink, ... }
}

export async function updateEvent(accessToken, calendarId, eventId, evento) {
  return call(CAL_API + '/calendars/' + encodeURIComponent(calendarId) + '/events/' + encodeURIComponent(eventId), {
    method: 'PUT', headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' }, body: JSON.stringify(evento),
  }, 'atualizar evento');
}

export async function deleteEvent(accessToken, calendarId, eventId) {
  const res = await fetch(CAL_API + '/calendars/' + encodeURIComponent(calendarId) + '/events/' + encodeURIComponent(eventId), {
    method: 'DELETE', headers: { Authorization: 'Bearer ' + accessToken },
  });
  // 410 = já removido; 404 = não existe -> tratamos como ok (idempotente).
  if (!res.ok && ![404, 410].includes(res.status)) {
    throw new Error('Google (excluir evento): HTTP ' + res.status);
  }
  return true;
}
