// agenda-publico.routes.js — AGENDA PÚBLICA (link de agendamento, SEM login).
//   Montado em /api/publico/agenda. O cliente final abre o link, vê os horários
//   livres do dono (resolvido pelo slug) e marca. Cada slug pertence a UM usuário
//   (a Minha Agenda é por usuário). Segurança: nada de id vindo do cliente — o
//   dono/empresa saem SEMPRE da linha do slug. RLS está ligado nas tabelas; aqui
//   usamos adminClient e filtramos no código.
import { Router } from 'express';
import { z } from 'zod';
import { adminClient } from '../lib/supabase.js';
import { validateBody } from '../middleware/validate.js';
import { criarNotificacao } from '../lib/notify.js';

export const agendaPublicoRouter = Router();
const db = () => adminClient();
const PUBLICA = 'agenda-publica-config';
const RESERVAS = 'agenda-publica-reservas';

// Disponibilidade semanal padrão (espelha o default do frontend) — usada quando o
// usuário ainda não salvou uma config de horários.
const DEFAULT_AVAIL = {
  1: { on: true,  ranges: [{ from: '09:00', to: '12:00' }, { from: '14:00', to: '18:00' }] },
  2: { on: true,  ranges: [{ from: '09:00', to: '12:00' }, { from: '14:00', to: '18:00' }] },
  3: { on: true,  ranges: [{ from: '09:00', to: '12:00' }, { from: '14:00', to: '18:00' }] },
  4: { on: true,  ranges: [{ from: '09:00', to: '12:00' }, { from: '14:00', to: '18:00' }] },
  5: { on: true,  ranges: [{ from: '09:00', to: '12:00' }, { from: '14:00', to: '17:00' }] },
  6: { on: false, ranges: [] },
  0: { on: false, ranges: [] },
};

const toMin = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const fromMin = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// Mesma grade do frontend (myAgGenSlots): passo = duração, das 07:00 às 20:00.
function gradeHorarios(stepMin) {
  const out = [];
  for (let m = 7 * 60; m < 20 * 60; m += stepMin) out.push(fromMin(m));
  return out;
}

// 'YYYY-MM-DD' no fuso local do servidor.
function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Um slot [ini, ini+dur) conflita com algum ocupado (expandido pelo buffer)?
function temConflito(iniMin, durMin, bufferMin, ocupadosDoDia) {
  const fim = iniMin + durMin;
  return (ocupadosDoDia || []).some((o) => {
    const oIni = o.ini - bufferMin;
    const oFim = o.ini + o.dur + bufferMin;
    return iniMin < oFim && fim > oIni; // sobreposição
  });
}

// Lê a config (regras + disponibilidade) de uma linha do slug.
function lerRegras(row) {
  const c = (row && row.config) || {};
  return {
    slotDuration: Number(c.slotDuration) || 30,
    bufferMin: Number(c.bufferMin) || 0,
    advanceMin: Number(c.advanceMin) || 0,
    horizon: Number(c.horizon) || 30,
    avail: (c.avail && typeof c.avail === 'object') ? c.avail : DEFAULT_AVAIL,
    bloqueios: Array.isArray(c.bloqueios) ? c.bloqueios : [], // bloqueios manuais por DATA ('YYYY-MM-DD-HH:MM')
    notif: (c.notif && typeof c.notif === 'object') ? c.notif : {},
  };
}

// Mapa data->[{ini,dur}] dos horários já ocupados do dono (compromissos da agenda
// + reservas públicas), no intervalo [hojeStr, fimStr].
async function ocupadosDoDono(empresaId, userId, hojeStr, fimStr) {
  const mapa = {};
  const add = (data, hora, dur) => {
    if (!data || !hora) return;
    (mapa[data] = mapa[data] || []).push({ ini: toMin(hora), dur: Number(dur) || 30 });
  };
  // compromissos da agenda interna onde o usuário é o responsável
  const { data: appts } = await db().from('agenda').select('data,hora,duracao,responsavel')
    .eq('empresa_id', empresaId).eq('responsavel', userId).gte('data', hojeStr).lte('data', fimStr);
  (appts || []).forEach((a) => add(a.data, a.hora, a.duracao));
  // reservas públicas já feitas (status agendado)
  const { data: rsv } = await db().from(RESERVAS).select('data,hora,duracao,status')
    .eq('empresa_id', empresaId).eq('user_id', userId).gte('data', hojeStr).lte('data', fimStr);
  (rsv || []).forEach((r) => { if (r.status !== 'cancelado') add(r.data, r.hora, r.duracao); });
  return mapa;
}

// Calcula os horários livres por dia, do dia de hoje até o horizonte.
function calcularDisponibilidade(regras, ocupados, agora) {
  const { slotDuration, bufferMin, advanceMin, horizon, avail } = regras;
  const bloq = new Set(regras.bloqueios || []); // bloqueios manuais por data
  const grade = gradeHorarios(slotDuration);
  const minimo = agora.getTime() + advanceMin * 60000; // não pode antes de agora+antecedência
  const dias = [];
  const base = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  for (let i = 0; i <= horizon; i++) {
    const d = new Date(base); d.setDate(base.getDate() + i);
    const wd = d.getDay();
    const data = ymd(d);
    const cfgDia = avail[wd];
    const slots = [];
    if (cfgDia && cfgDia.on) {
      const ocupadosDia = ocupados[data] || [];
      for (const hhmm of grade) {
        const m = toMin(hhmm);
        const dentro = (cfgDia.ranges || []).some((r) => m >= toMin(r.from) && m < toMin(r.to));
        if (!dentro) continue;                                   // fora da disponibilidade recorrente
        if (bloq.has(`${data}-${hhmm}`)) continue;               // bloqueio manual individual (esta data)
        const quando = new Date(d); quando.setHours(Math.floor(m / 60), m % 60, 0, 0);
        if (quando.getTime() < minimo) continue;                 // cedo demais
        if (temConflito(m, slotDuration, bufferMin, ocupadosDia)) continue; // ocupado por compromisso/reserva
        slots.push(hhmm);
      }
    }
    dias.push({ data, weekday: wd, slots });
  }
  return dias;
}

// Acha a linha do slug (config ativa). Retorna null se não existir.
async function acharSlug(slug) {
  const { data } = await db().from(PUBLICA).select('*').eq('slug', slug).maybeSingle();
  return data || null;
}

// GET /api/publico/agenda/:slug — perfil público + horários livres.
agendaPublicoRouter.get('/agenda/:slug', async (req, res, next) => {
  try {
    const row = await acharSlug(req.params.slug);
    if (!row) return res.status(404).json({ error: 'Link de agendamento não encontrado.' });
    if (row.ativa === false) return res.status(403).json({ error: 'Este link de agendamento está desativado no momento.' });
    const regras = lerRegras(row);
    const agora = new Date();
    const base = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const fim = new Date(base); fim.setDate(base.getDate() + regras.horizon);
    const ocupados = await ocupadosDoDono(row.empresa_id, row.user_id, ymd(base), ymd(fim));
    const dias = calcularDisponibilidade(regras, ocupados, agora);
    res.json({
      publica: { slug: row.slug, titulo: row.titulo || 'Agendamento' },
      regras: { slotDuration: regras.slotDuration, horizon: regras.horizon },
      disponibilidade: dias,
    });
  } catch (err) { next(err); }
});

const reservaSchema = z.object({
  data: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.'),
  hora: z.string().trim().regex(/^\d{2}:\d{2}$/, 'Horário inválido.'),
  nome: z.string().trim().min(1, 'Informe o nome.').max(80),
  sobrenome: z.string().trim().max(80).optional().default(''),
  contato: z.string().trim().min(1, 'Informe um contato.').max(40),
  email: z.string().trim().email('E-mail inválido.').max(160),
  local: z.string().trim().max(60).optional().default('Videochamada'),
  assunto: z.string().trim().min(1, 'Descreva o assunto.').max(2000),
}).strip();

// POST /api/publico/agenda/:slug/reservar — cria a reserva (+ compromisso na agenda do dono).
agendaPublicoRouter.post('/agenda/:slug/reservar', validateBody(reservaSchema), async (req, res, next) => {
  try {
    const row = await acharSlug(req.params.slug);
    if (!row) return res.status(404).json({ error: 'Link de agendamento não encontrado.' });
    if (row.ativa === false) return res.status(403).json({ error: 'Este link de agendamento está desativado.' });
    const regras = lerRegras(row);
    const b = req.body;

    // Revalida que o horário escolhido AINDA está livre (evita corrida / link velho).
    const agora = new Date();
    const ocupados = await ocupadosDoDono(row.empresa_id, row.user_id, b.data, b.data);
    const wd = new Date(b.data + 'T00:00:00').getDay();
    const m = toMin(b.hora);
    const cfgDia = regras.avail[wd];
    const dentro = cfgDia && cfgDia.on && (cfgDia.ranges || []).some((r) => m >= toMin(r.from) && m < toMin(r.to));
    const bloqueado = (regras.bloqueios || []).includes(`${b.data}-${b.hora}`); // bloqueio manual nesta data
    const quando = new Date(b.data + 'T00:00:00'); quando.setHours(Math.floor(m / 60), m % 60, 0, 0);
    const cedoDemais = quando.getTime() < (agora.getTime() + regras.advanceMin * 60000);
    if (!dentro || bloqueado || cedoDemais || temConflito(m, regras.slotDuration, regras.bufferMin, ocupados[b.data] || [])) {
      return res.status(409).json({ error: 'Esse horário acabou de ficar indisponível. Escolha outro, por favor.' });
    }

    const nomeCompleto = `${b.nome}${b.sobrenome ? ' ' + b.sobrenome : ''}`.trim();
    // 1) compromisso real na agenda do dono (aparece no calendário interno dele).
    const apptRow = {
      empresa_id: row.empresa_id,
      responsavel: row.user_id,
      data: b.data,
      hora: b.hora,
      duracao: regras.slotDuration,
      participante: nomeCompleto,
      participante_tipo: 'externo',
      servico: b.assunto.slice(0, 160),
      tipo: 'Agendamento',
      status: 'agendado',
      local: b.local || null,
      telefone: b.contato || null,
      observacoes: b.assunto || null,
      canal: 'link-publico',
    };
    const { data: appt, error: e1 } = await db().from('agenda').insert(apptRow).select('id').single();
    if (e1) throw e1;

    // 2) snapshot da reserva (dados que o cliente preencheu).
    const { data: reserva, error: e2 } = await db().from(RESERVAS).insert({
      empresa_id: row.empresa_id, user_id: row.user_id, agenda_id: appt.id,
      data: b.data, hora: b.hora, duracao: regras.slotDuration,
      nome: b.nome, sobrenome: b.sobrenome || null, contato: b.contato || null,
      email: b.email || null, local: b.local || null, assunto: b.assunto || null,
      status: 'agendado',
    }).select('*').single();
    if (e2) throw e2;

    // 3) Notificações (best-effort — nunca quebram a reserva).
    await notificarReserva(row, regras, reserva);

    res.status(201).json({ ok: true, reserva: { id: reserva.id, data: reserva.data, hora: reserva.hora } });
  } catch (err) { next(err); }
});

// Notificações da reserva. In-app (sino) já funciona; e-mail/WhatsApp ficam como
// best-effort: disparam quando a integração existir, senão só registram em log.
async function notificarReserva(row, regras, reserva) {
  const notif = regras.notif || {};
  // (a) Sino interno pro dono da agenda.
  if (notif.meNotificar !== false) {
    const quando = `${reserva.data} às ${String(reserva.hora).replace(':', 'h')}`;
    await criarNotificacao({
      empresaId: row.empresa_id, userId: row.user_id, kind: 'schedule',
      texto: `📅 Novo agendamento pelo seu link: ${reserva.nome}${reserva.sobrenome ? ' ' + reserva.sobrenome : ''} — ${quando}.`,
      link: 'agenda',
    });
  }
  // (b) E-mail de confirmação ao cliente — estrutura pronta; liga quando houver provedor de e-mail.
  if (notif.emailCliente !== false && reserva.email) {
    try {
      if (typeof globalThis.enviarEmail === 'function') {
        await globalThis.enviarEmail({ to: reserva.email, assunto: 'Agendamento confirmado', texto: `Seu horário ${reserva.data} ${reserva.hora} foi confirmado.` });
      } else {
        console.log(`[agenda-publico] (best-effort) e-mail de confirmação pendente p/ ${reserva.email} — sem provedor de e-mail configurado.`);
      }
    } catch (e) { /* não quebra a reserva */ }
  }
  // (c) Lembrete WhatsApp 1h antes — estrutura pronta; o worker/integração liga quando configurado.
  if (notif.whatsappLembrete !== false && reserva.contato) {
    console.log(`[agenda-publico] (best-effort) lembrete WhatsApp pendente p/ ${reserva.contato} — integração WhatsApp não configurada.`);
  }
}
