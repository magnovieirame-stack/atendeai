// lembretes.js — worker que dispara lembretes de agendamento no tempo certo.
//   A cada minuto procura agendamentos cujo horário de disparo
//   (horário do compromisso − antecedência configurada) já chegou e que ainda
//   não foram avisados; dispara a notificação para os envolvidos e marca
//   lembrete_enviado=true (nunca repete). NÃO dispara na criação.
import { adminClient } from './supabase.js';
import { criarNotificacao } from './notify.js';

function fmtBR(data) {
  const m = String(data || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (data || '');
}

async function tick() {
  const db = adminClient();
  const { data: appts, error } = await db.from('agenda').select('*').eq('lembrete_enviado', false).limit(500);
  if (error || !appts || !appts.length) return;

  const cfgCache = {};
  async function getCfg(empresaId) {
    if (cfgCache[empresaId] !== undefined) return cfgCache[empresaId];
    const { data } = await db.from('agenda-config').select('config').eq('empresa_id', empresaId).maybeSingle();
    cfgCache[empresaId] = (data && data.config) || {};
    return cfgCache[empresaId];
  }
  const marcarEnviado = (id) => db.from('agenda').update({ lembrete_enviado: true }).eq('id', id);
  const now = Date.now();

  for (const a of appts) {
    try {
      if (!a.data || !a.hora) continue;
      if (a.status === 'cancelado' || a.status === 'finalizado') { await marcarEnviado(a.id); continue; }
      const hora = String(a.hora).length === 5 ? a.hora : '00:00';
      const apptTime = new Date(`${a.data}T${hora}:00`).getTime();
      if (isNaN(apptTime)) { await marcarEnviado(a.id); continue; }
      // compromisso já passou (mais de 1h): limpa a flag p/ não reprocessar sempre
      if (now > apptTime + 60 * 60000) { await marcarEnviado(a.id); continue; }

      const cfg = await getCfg(a.empresa_id);
      const antMin = Number(cfg.antecedencia);
      const ant = Number.isFinite(antMin) ? antMin : 60;
      const dispatchAt = apptTime - ant * 60000;
      if (now < dispatchAt) continue; // ainda não é hora de disparar

      // Canal interno (default ligado). E-mail/Push/WhatsApp ainda não enviam de verdade.
      if (cfg.notifInterna !== false) {
        const prof = a.responsavel_nome || 'profissional';
        const local = a.local && a.local !== '—' ? a.local : 'local a definir';
        const serv = a.servico || 'atendimento';
        const horaFmt = hora.replace(':', 'h');
        const texto = `📅 Você tem um agendamento com ${prof} na ${local} para ${serv}, no dia ${fmtBR(a.data)} às ${horaFmt}.`;
        const alvos = new Set();
        if (a.criado_por) alvos.add(a.criado_por);
        if (a.participante_tipo === 'usuario' && a.participante_id) alvos.add(a.participante_id);
        if (alvos.size === 0) alvos.add(null); // fallback: empresa toda
        for (const uid of alvos) {
          await criarNotificacao({ empresaId: a.empresa_id, userId: uid, kind: 'schedule', texto, link: 'agenda' });
        }
      }
      await marcarEnviado(a.id);
    } catch (e) { /* ignora este agendamento e segue os demais */ }
  }
}

let _timer = null;
export function startLembretesWorker() {
  if (_timer) return;
  _timer = setInterval(() => { tick().catch(() => {}); }, 60000);
  tick().catch(() => {}); // roda uma vez no boot
}
