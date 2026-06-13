// agenda.routes.js — MÓDULO AGENDA (compromissos + tarefas).
//   Tabelas: "agenda" (compromissos) e "agenda-tarefas" (tarefas).
//   RLS está LIGADO sem policies -> só o service_role acessa. Por isso usamos
//   adminClient() e SEMPRE filtramos por empresa_id no servidor (isolamento por tenant).
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requirePermissao } from '../lib/autorizacao.js';
import { validateBody } from '../middleware/validate.js';
import { adminClient } from '../lib/supabase.js';
import * as integ from '../lib/integracoes.js';
import * as gcal from '../lib/google.js';
import { criarNotificacao } from '../lib/notify.js';

export const agendaRouter = Router();
agendaRouter.use(requireAuth);
agendaRouter.use((req, res, next) =>
  requirePermissao(req.method === 'GET' ? 'agenda.ver' : 'agenda.gerenciar')(req, res, next));

const uuid = z.string().uuid('id inválido');
const db = () => adminClient();

// Sincroniza um compromisso com o Google Calendar (se a empresa conectou).
// Uma via: criar/editar/excluir na Agenda reflete no Google. Best-effort: nunca
// derruba a requisição — se o Google falhar, o compromisso continua salvo aqui.
// 'row' é a linha CRUA da tabela agenda (data, hora, duracao, servico, ...).
async function sincronizarGoogle(empresaId, acao, row) {
  try {
    const g = await integ.getGoogleAccess(empresaId);
    if (!g) return null; // empresa não conectou o Google Calendar
    if (acao === 'delete') {
      if (row && row.gcal_event_id) await gcal.deleteEvent(g.accessToken, g.calendarId, row.gcal_event_id);
      return null;
    }
    const evento = gcal.montarEvento(row);
    if (acao === 'update' && row.gcal_event_id) {
      await gcal.updateEvent(g.accessToken, g.calendarId, row.gcal_event_id, evento);
      return row.gcal_event_id;
    }
    const ev = await gcal.insertEvent(g.accessToken, g.calendarId, evento); // create (ou update sem evento ainda)
    return ev && ev.id ? ev.id : null;
  } catch (e) { console.error('[gcal sync]', e?.message || e); return null; }
}

// empresa do usuário logado (via empresa_membros, que tem RLS própria).
async function getEmpresaId(req) {
  if (req._empresaId !== undefined) return req._empresaId;
  // Reusa o empresaId já carregado pela autorização (req._auth) — evita ida redundante ao banco.
  if (req._auth && req._auth.empresaId != null) { req._empresaId = req._auth.empresaId; return req._empresaId; }
  const { data } = await req.supabase.from('empresa_membros').select('empresa_id').limit(1);
  req._empresaId = data && data[0] ? data[0].empresa_id : null;
  return req._empresaId;
}

// =========================== COMPROMISSOS ===========================
function mapAppt(r, cli, participantes) {
  return {
    id: r.id,
    criadoPor: r.criado_por || null,
    participantes: participantes || [],
    clienteId: r.cliente_id || null,
    client: (r.participante && r.participante !== 'null') ? r.participante : (cli && cli.nome && cli.nome !== 'null' ? cli.nome : 'Sem nome'),
    participanteTipo: r.participante_tipo || 'cliente',
    participanteId: r.participante_id || null,
    service: r.servico || '',
    data: r.data || null,          // 'YYYY-MM-DD'
    start: r.hora || '',           // 'HH:MM'
    dur: r.duracao || 60,
    resp: r.responsavel || '',
    respNome: r.responsavel_nome || null,
    source: r.canal || 'manual',
    status: r.status || 'agendado',
    byAI: !!r.por_ia,
    type: r.tipo || 'Atendimento',
    local: r.local || '',
    phone: r.telefone || (cli ? cli.telefone : '') || '',
    obs: r.observacoes || '',
  };
}

const apptSchema = z.object({
  clienteId: uuid.nullable().optional(),
  participante: z.string().trim().max(160).optional().default(''),
  participanteTipo: z.string().trim().max(20).optional().default('cliente'),
  participanteId: uuid.nullable().optional(),
  respNome: z.string().trim().max(120).optional().default(''),
  service: z.string().trim().max(160).optional().default(''),
  data: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use YYYY-MM-DD).'),
  start: z.string().trim().max(5).optional().default(''),
  dur: z.coerce.number().int().optional().default(60),
  resp: z.string().trim().max(120).optional().default(''),
  type: z.string().trim().max(60).optional().default('Atendimento'),
  status: z.string().trim().max(40).optional().default('agendado'),
  local: z.string().trim().max(160).optional().default(''),
  phone: z.string().trim().max(40).optional().default(''),
  obs: z.string().trim().max(2000).optional().default(''),
  source: z.string().trim().max(40).optional().default('manual'),
  byAI: z.coerce.boolean().optional().default(false),
  // Participantes (N pessoas): usuario | cliente | lead | externo. Opcional (compat).
  participantes: z.array(z.object({
    tipo: z.string().trim().max(20).optional(),
    userId: uuid.nullable().optional(),
    clienteId: uuid.nullable().optional(),
    nome: z.string().trim().max(160).optional(),
  }).strip()).optional(),
}).strip();

function apptToDb(b, empresaId) {
  const row = {
    cliente_id: b.clienteId || null,
    participante: b.participante || null,
    participante_tipo: b.participanteTipo || null,
    participante_id: b.participanteId || null,
    responsavel_nome: b.respNome || null,
    servico: b.service || null,
    data: b.data,
    hora: b.start || null,
    duracao: b.dur || 60,
    responsavel: b.resp || null,
    tipo: b.type || null,
    status: b.status || 'agendado',
    local: b.local || null,
    telefone: b.phone || null,
    observacoes: b.obs || null,
    canal: b.source || 'manual',
    por_ia: !!b.byAI,
  };
  if (empresaId) row.empresa_id = empresaId;
  return row;
}

// nome/telefone dos clientes vinculados (1 query in-list, evita N+1)
async function clientesMap(ids) {
  const map = {};
  const uniq = [...new Set((ids || []).filter(Boolean))];
  if (!uniq.length) return map;
  const { data } = await db().from('clientes').select('id,nome,telefone').in('id', uniq);
  (data || []).forEach((c) => { map[c.id] = c; });
  return map;
}

// ---- PARTICIPANTES (N pessoas por reunião) -------------------------------
const isUuid = (s) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

// participantes de cada agenda (1 query in-list, evita N+1) -> { agendaId: [...] }
async function participantesMap(ids) {
  const map = {};
  const uniq = [...new Set((ids || []).filter(Boolean))];
  if (!uniq.length) return map;
  const { data } = await db().from('agenda_participantes').select('*').in('agenda_id', uniq);
  (data || []).forEach((p) => {
    (map[p.agenda_id] = map[p.agenda_id] || []).push({
      id: p.id, tipo: p.tipo, userId: p.user_id || null, clienteId: p.cliente_id || null,
      nome: p.nome || null, papel: p.papel || 'participante',
    });
  });
  return map;
}

// monta as linhas de participantes (papel 'participante') a partir do payload do front
function buildParticipanteRows(agendaId, empresaId, participantes) {
  return (participantes || []).map((p) => {
    if (!p) return null;
    const tipo = p.tipo || (p.userId ? 'usuario' : (p.clienteId ? 'cliente' : 'externo'));
    return {
      agenda_id: agendaId, empresa_id: empresaId, tipo,
      user_id: tipo === 'usuario' && isUuid(p.userId) ? p.userId : null,
      cliente_id: (tipo === 'cliente' || tipo === 'lead') && isUuid(p.clienteId) ? p.clienteId : null,
      nome: p.nome || null, papel: 'participante',
    };
  }).filter(Boolean);
}

// grava o RESPONSÁVEL como participante (papel 'responsavel') — fonte do filtro "minha agenda".
async function gravarResponsavel(agendaId, empresaId, resp, respNome) {
  await db().from('agenda_participantes').delete().eq('agenda_id', agendaId).eq('papel', 'responsavel');
  if (isUuid(resp)) {
    await db().from('agenda_participantes').insert({ agenda_id: agendaId, empresa_id: empresaId, tipo: 'usuario', user_id: resp, nome: respNome || null, papel: 'responsavel' });
  }
}

// substitui a lista de participantes (papel 'participante') da reunião.
async function gravarParticipantes(agendaId, empresaId, participantes) {
  await db().from('agenda_participantes').delete().eq('agenda_id', agendaId).eq('papel', 'participante');
  const rows = buildParticipanteRows(agendaId, empresaId, participantes);
  if (rows.length) await db().from('agenda_participantes').insert(rows);
}

// compat: se o front não mandar `participantes`, monta 1 a partir do participante único legado.
function participantesDoBody(b) {
  if (b.participantes !== undefined) return b.participantes || [];
  if (b.participante || b.participanteId || b.clienteId) {
    const tipo = b.participanteTipo || 'cliente';
    return [{
      tipo,
      userId: tipo === 'usuario' ? b.participanteId : null,
      clienteId: (tipo === 'cliente' || tipo === 'lead') ? (b.participanteId || b.clienteId) : null,
      nome: b.participante || null,
    }];
  }
  return [];
}

// Notifica (in-app/sino) os USUÁRIOS envolvidos (participantes + responsável) ao criar/reagendar.
// Não notifica quem fez a ação. Best-effort: nunca quebra a rota.
function fmtBRdata(d) { const m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${String(m[1]).slice(2)}` : (d || ''); }
// "Maria", "Maria e José", "Maria, José e Ana"
function listaNomes(arr) {
  const a = (arr || []).filter(Boolean);
  if (!a.length) return '';
  if (a.length === 1) return a[0];
  return `${a.slice(0, -1).join(', ')} e ${a[a.length - 1]}`;
}
// Descreve O QUE mudou entre o compromisso antigo e o novo (p/ a notificação de edição).
function descreverMudancas(antes, depois) {
  if (!antes) return '';
  const hFmt = (h) => String(h || '').replace(':', 'h');
  const ch = [];
  if ((antes.data || '') !== (depois.data || '') || (antes.hora || '') !== (depois.hora || '')) ch.push(`novo horário ${fmtBRdata(depois.data)} às ${hFmt(depois.hora)}`);
  if ((antes.local || '') !== (depois.local || '')) ch.push(`local: ${depois.local || '—'}`);
  if ((antes.servico || '') !== (depois.servico || '')) ch.push(`serviço: ${depois.servico || '—'}`);
  if ((antes.status || '') !== (depois.status || '')) ch.push(`status: ${depois.status}`);
  return ch.join(' · ');
}
// Notifica (in-app/sino) os USUÁRIOS envolvidos ao criar/reagendar.
// Inclui os OUTROS participantes ("com Maria e José") e, na edição, O QUE mudou.
async function notificarEnvolvidos(empresaId, appt, { tipo, atorId, antes }) {
  try {
    const { data: parts } = await db().from('agenda_participantes').select('user_id,nome').eq('agenda_id', appt.id);
    const userIds = [...new Set((parts || []).filter((p) => p.user_id).map((p) => p.user_id))];
    if (!userIds.length) return;
    const quando = `${fmtBRdata(appt.data)}${appt.hora ? ' às ' + String(appt.hora).replace(':', 'h') : ''}`;
    const mudancas = tipo === 'reagendado' ? descreverMudancas(antes, appt) : '';
    for (const uid of userIds) {
      if (atorId && uid === atorId) continue;
      const outros = listaNomes((parts || []).filter((p) => p.user_id !== uid).map((p) => p.nome));
      const comQuem = outros ? ` com ${outros}` : '';
      const texto = tipo === 'reagendado'
        ? (mudancas
            ? `🔄 Agendamento alterado${comQuem} — ${mudancas}.`
            : `🔄 Agendamento atualizado${comQuem}, ${quando}.`)
        : `📅 Você foi incluído em um novo agendamento${comQuem}, ${quando}.`;
      await criarNotificacao({ empresaId, userId: uid, kind: 'schedule', texto, link: 'agenda' });
    }
  } catch (e) { /* notificação é secundária */ }
}

agendaRouter.get('/', async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const me = req.user.id;
    // MINHA AGENDA: compromissos onde sou RESPONSÁVEL ou PARTICIPANTE-usuário.
    // (a tela coletiva p/ admin/líderes virá depois, liberada por permissão.)
    const { data: parts } = await db().from('agenda_participantes')
      .select('agenda_id').eq('empresa_id', empresaId).eq('user_id', me);
    const ids = [...new Set((parts || []).map((p) => p.agenda_id).filter(Boolean))];
    let q = db().from('agenda').select('*').eq('empresa_id', empresaId);
    // MINHA AGENDA = sou RESPONSÁVEL ou sou PARTICIPANTE (linha em agenda_participantes).
    // Ao ser removido dos participantes, a linha some -> o compromisso some da minha agenda.
    q = ids.length ? q.or(`responsavel.eq.${me},id.in.(${ids.join(',')})`) : q.eq('responsavel', me);
    const { data, error } = await q.order('data', { ascending: true }).order('hora', { ascending: true });
    if (error) throw error;
    const rows = data || [];
    const [cmap, pmap] = await Promise.all([
      clientesMap(rows.map((r) => r.cliente_id)),
      participantesMap(rows.map((r) => r.id)),
    ]);
    res.json({ agenda: rows.map((r) => mapAppt(r, cmap[r.cliente_id], pmap[r.id])) });
  } catch (err) { next(err); }
});

// ---- GET /api/agenda/usuarios — usuários da empresa (do Supabase Auth) ----
// Devolve id/nome/email e TAMBÉM o papel real (codigo + nome de exibição), lido de
// empresa_membros -> papeis (mesma fonte do /auth/me). Aditivo: id/nome/email seguem
// iguais; papel/papelNome são extras (consumidores antigos só leem id/nome, sem quebra).
const PAPEL_LABEL = { admin: 'Admin da Loja', admin_loja: 'Admin da Loja', atendente: 'Atendente', super_admin: 'Super Admin' };
agendaRouter.get('/usuarios', async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const { data: membros } = await db().from('empresa_membros').select('user_id, papel, papel_id').eq('empresa_id', empresaId);
    const lista = (membros || []).filter((m) => m.user_id);
    const byUser = {};
    lista.forEach((m) => { byUser[m.user_id] = m; });
    // Catálogo dos papéis usados (id -> { codigo, nome }) — leitura via service_role, igual ao /auth/me.
    const papelIds = [...new Set(lista.map((m) => m.papel_id).filter(Boolean))];
    const papeisById = {};
    if (papelIds.length) {
      const { data: papeis } = await db().from('papeis').select('id, codigo, nome').in('id', papelIds);
      (papeis || []).forEach((p) => { papeisById[p.id] = p; });
    }
    const ids = new Set(lista.map((m) => m.user_id));
    const { data: list } = await db().auth.admin.listUsers({ page: 1, perPage: 200 });
    const usuarios = (list?.users || [])
      .filter((u) => ids.has(u.id))
      .map((u) => {
        const m = byUser[u.id] || {};
        const p = m.papel_id ? papeisById[m.papel_id] : null;
        const codigo = (p && p.codigo) || m.papel || null;          // ex.: 'admin_loja' | 'atendente'
        const md = u.user_metadata || {};
        return {
          id: u.id,
          nome: md.name || u.email,
          email: u.email,
          papel: codigo,
          papelNome: (p && p.nome) || PAPEL_LABEL[codigo] || codigo || null, // ex.: 'Admin da Loja'
          // Extras (aditivos) — alimentam a lista e o preenchimento da edição.
          nomeCompleto: md.nomeCompleto || '',
          telefone: md.telefone || '',
          cpf: md.cpf || '',
          cargo: md.cargo || '',
          departamento: md.departamento || '',
          departamentoId: md.departamentoId != null ? md.departamentoId : null,
          nascimento: md.nascimento || '',
          endereco: md.endereco || '',
          bio: md.bio || '',
          cidade: md.cidade || '',
          uf: md.uf || '',
          fotoUrl: md.foto_url || '',
          status: md.ativo === false ? 'inativo' : 'ativo',
        };
      });
    res.json({ usuarios });
  } catch (err) { next(err); }
});

// ---- Categorias personalizadas (as padrão ficam no front; aqui ficam as extras) ----
const categoriaSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome.').max(60),
  icone: z.string().trim().max(40).optional().default('tag'),
  cor: z.string().trim().max(20).optional().default(''),
}).strip();

agendaRouter.get('/categorias', async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const { data, error } = await db().from('agenda-categorias').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ categorias: (data || []).map((c) => ({ id: c.id, nome: c.nome, icone: c.icone, cor: c.cor || null })) });
  } catch (err) { next(err); }
});
agendaRouter.post('/categorias', validateBody(categoriaSchema), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const { data, error } = await db().from('agenda-categorias')
      .insert({ nome: req.body.nome, icone: req.body.icone || 'tag', empresa_id: empresaId })
      .select('id,nome,icone').single();
    if (error) throw error;
    const cor = req.body.cor || null;
    // gravação best-effort da cor (coluna pode ainda não existir) — não quebra a criação
    if (cor) { await db().from('agenda-categorias').update({ cor }).eq('id', data.id); }
    res.status(201).json({ categoria: { ...data, cor } });
  } catch (err) { next(err); }
});
agendaRouter.patch('/categorias/:id', validateBody(categoriaSchema.partial()), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const id = uuid.parse(req.params.id);
    const patch = {};
    if (req.body.nome !== undefined) patch.nome = req.body.nome;
    if (req.body.icone !== undefined) patch.icone = req.body.icone;
    if (req.body.cor !== undefined) patch.cor = req.body.cor;
    const { data, error } = await db().from('agenda-categorias').update(patch).eq('id', id).eq('empresa_id', empresaId).select('id,nome,icone,cor').single();
    if (error) throw error;
    res.json({ categoria: { id: data.id, nome: data.nome, icone: data.icone, cor: data.cor || null } });
  } catch (err) { next(err); }
});
agendaRouter.delete('/categorias/:id', async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const id = uuid.parse(req.params.id);
    const { error } = await db().from('agenda-categorias').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ---- Configurações da agenda (Geral / Horário / Notificações) — 1 linha por empresa ----
agendaRouter.get('/config', async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const { data, error } = await db().from('agenda-config').select('config').eq('empresa_id', empresaId).maybeSingle();
    if (error) throw error;
    res.json({ config: (data && data.config) || {} });
  } catch (err) { next(err); }
});
const configSchema = z.object({ config: z.record(z.any()).optional().default({}) }).strip();
agendaRouter.put('/config', validateBody(configSchema), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const { error } = await db().from('agenda-config')
      .upsert({ empresa_id: empresaId, config: req.body.config || {}, updated_at: new Date().toISOString() }, { onConflict: 'empresa_id' });
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ===================== MINHA AGENDA (link público) =====================
// Config da agenda PÚBLICA é POR USUÁRIO (não da empresa): cada user tem o SEU
// link/slug, disponibilidade e regras, dentro do isolamento da empresa.
// Tabela "agenda-publica-config", chaveada por (empresa_id, user_id); slug único.
const PUBLICA = 'agenda-publica-config';

// slug a partir de um nome: minúsculas, sem acento, só [a-z0-9-].
function slugify(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'agenda';
}

// devolve um slug livre a partir de uma base (acrescenta -2, -3... se preciso).
// `exceto` = user_id que pode "manter" o slug atual (na edição).
async function slugUnico(base, exceto) {
  const raiz = slugify(base);
  for (let i = 0; i < 60; i++) {
    const cand = i === 0 ? raiz : `${raiz}-${i + 1}`;
    const { data } = await db().from(PUBLICA).select('user_id').eq('slug', cand).maybeSingle();
    if (!data || (exceto && data.user_id === exceto)) return cand;
  }
  return `${raiz}-${Math.random().toString(36).slice(2, 7)}`;
}

function mapPublica(r) {
  return {
    slug: r.slug,
    titulo: r.titulo || '',
    ativa: r.ativa !== false,
    config: r.config || {},
  };
}

// pega a linha do usuário; se não existir, cria com slug derivado do nome dele.
async function getOrCreatePublica(req, empresaId) {
  const me = req.user.id;
  const { data } = await db().from(PUBLICA).select('*').eq('empresa_id', empresaId).eq('user_id', me).maybeSingle();
  if (data) return data;
  const md = req.user.user_metadata || {};
  const nome = md.name || md.nome || (req.user.email || '').split('@')[0] || 'agenda';
  const slug = await slugUnico(nome);
  const ins = await db().from(PUBLICA)
    .insert({ empresa_id: empresaId, user_id: me, slug, titulo: md.name || md.nome || 'Agendamento', ativa: true, config: {} })
    .select('*').single();
  if (ins.error) throw ins.error;
  return ins.data;
}

agendaRouter.get('/publica/config', async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const row = await getOrCreatePublica(req, empresaId);
    res.json({ publica: mapPublica(row) });
  } catch (err) { next(err); }
});

const publicaSchema = z.object({
  slug: z.string().trim().min(2, 'Link muito curto.').max(40)
    .regex(/^[a-z0-9-]+$/, 'Use só letras minúsculas, números e hífen.').optional(),
  titulo: z.string().trim().max(120).optional(),
  ativa: z.coerce.boolean().optional(),
  config: z.record(z.any()).optional(),
}).strip();

agendaRouter.put('/publica/config', validateBody(publicaSchema), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const me = req.user.id;
    const atual = await getOrCreatePublica(req, empresaId); // garante a linha
    const patch = { updated_at: new Date().toISOString() };
    if (req.body.titulo !== undefined) patch.titulo = req.body.titulo;
    if (req.body.ativa !== undefined) patch.ativa = req.body.ativa;
    if (req.body.config !== undefined) patch.config = req.body.config;
    if (req.body.slug !== undefined && req.body.slug !== atual.slug) {
      // slug é a chave do link público — não pode colidir com o de outro usuário.
      const { data: ex } = await db().from(PUBLICA).select('user_id').eq('slug', req.body.slug).maybeSingle();
      if (ex && ex.user_id !== me) return res.status(409).json({ error: 'Esse link já está em uso. Escolha outro.' });
      patch.slug = req.body.slug;
    }
    const { data, error } = await db().from(PUBLICA)
      .update(patch).eq('empresa_id', empresaId).eq('user_id', me).select('*').single();
    if (error) throw error;
    res.json({ publica: mapPublica(data) });
  } catch (err) { next(err); }
});

agendaRouter.post('/', validateBody(apptSchema), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const row = apptToDb(req.body, empresaId);
    if (req.user && req.user.id) row.criado_por = req.user.id;
    const { data, error } = await db().from('agenda').insert(row).select('*').single();
    if (error) throw error;
    // grava responsável + participantes (fonte do filtro "minha agenda")
    await gravarResponsavel(data.id, empresaId, req.body.resp, req.body.respNome);
    await gravarParticipantes(data.id, empresaId, participantesDoBody(req.body));
    await notificarEnvolvidos(empresaId, data, { tipo: 'novo', atorId: req.user.id });
    // espelha no Google Calendar (se conectado) e guarda o id do evento
    const eventId = await sincronizarGoogle(empresaId, 'create', data);
    if (eventId) { await db().from('agenda').update({ gcal_event_id: eventId }).eq('id', data.id); data.gcal_event_id = eventId; }
    const [cmap, pmap] = await Promise.all([clientesMap([data.cliente_id]), participantesMap([data.id])]);
    // NÃO notifica na criação — o lembrete é disparado pelo worker no tempo de antecedência.
    res.status(201).json({ appt: mapAppt(data, cmap[data.cliente_id], pmap[data.id]) });
  } catch (err) { next(err); }
});

agendaRouter.patch('/:id', validateBody(apptSchema.partial()), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const me = req.user.id;
    const id = uuid.parse(req.params.id);
    // OWNERSHIP: só o responsável OU o criador pode editar (participantes só veem).
    const { data: cur } = await db().from('agenda').select('id,responsavel,criado_por,data,hora,local,servico,status').eq('id', id).eq('empresa_id', empresaId).maybeSingle();
    if (!cur) return res.status(404).json({ error: 'Compromisso não encontrado.' });
    if (cur.responsavel !== me) return res.status(403).json({ error: 'Só o responsável pode editar este compromisso.' });
    const full = apptToDb({ data: req.body.data || '2000-01-01', ...req.body }, null);
    const map = { clienteId: 'cliente_id', participante: 'participante', participanteTipo: 'participante_tipo', participanteId: 'participante_id', respNome: 'responsavel_nome', service: 'servico', data: 'data', start: 'hora', dur: 'duracao', resp: 'responsavel', type: 'tipo', status: 'status', local: 'local', phone: 'telefone', obs: 'observacoes', source: 'canal', byAI: 'por_ia' };
    const patch = {};
    Object.keys(req.body).forEach((k) => { if (map[k]) patch[map[k]] = full[map[k]]; });
    const { data, error } = Object.keys(patch).length
      ? await db().from('agenda').update(patch).eq('id', id).eq('empresa_id', empresaId).select('*').single()
      : await db().from('agenda').select('*').eq('id', id).eq('empresa_id', empresaId).single();
    if (error) throw error;
    // sincroniza responsável/participantes só quando vierem no payload (PATCH parcial não clobbera).
    if (req.body.resp !== undefined) await gravarResponsavel(id, empresaId, req.body.resp, req.body.respNome);
    if (req.body.participantes !== undefined) await gravarParticipantes(id, empresaId, req.body.participantes);
    await notificarEnvolvidos(empresaId, data, { tipo: 'reagendado', atorId: req.user.id, antes: cur });
    // espelha a edição no Google Calendar (cria o evento se ainda não existir)
    const eventId = await sincronizarGoogle(empresaId, 'update', data);
    if (eventId && eventId !== data.gcal_event_id) { await db().from('agenda').update({ gcal_event_id: eventId }).eq('id', data.id); data.gcal_event_id = eventId; }
    const [cmap, pmap] = await Promise.all([clientesMap([data.cliente_id]), participantesMap([data.id])]);
    res.json({ appt: mapAppt(data, cmap[data.cliente_id], pmap[data.id]) });
  } catch (err) { next(err); }
});

agendaRouter.delete('/:id', async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const me = req.user.id;
    const id = uuid.parse(req.params.id);
    // pega o id do evento no Google antes de apagar, p/ remover de lá também
    const { data: row } = await db().from('agenda').select('gcal_event_id,responsavel,criado_por').eq('id', id).eq('empresa_id', empresaId).maybeSingle();
    if (!row) return res.status(404).json({ error: 'Compromisso não encontrado.' });
    // OWNERSHIP: só o responsável exclui.
    if (row.responsavel !== me) return res.status(403).json({ error: 'Só o responsável pode excluir este compromisso.' });
    // agenda_participantes tem ON DELETE CASCADE -> some junto.
    const { error } = await db().from('agenda').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
    if (row && row.gcal_event_id) await sincronizarGoogle(empresaId, 'delete', row);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// =========================== TAREFAS ===========================
function mapTask(r) {
  return {
    id: r.id,
    title: r.titulo || '',
    due: r.prazo || '',
    resp: r.responsavel || '',
    important: !!r.importante,
    urgent: !!r.urgente,
    cat: r.categoria || '',
    done: !!r.concluida,
  };
}

const taskSchema = z.object({
  title: z.string().trim().min(1, 'Informe o título.').max(200),
  due: z.string().trim().max(60).optional().default(''),
  resp: z.string().trim().max(120).optional().default(''),
  important: z.coerce.boolean().optional().default(false),
  urgent: z.coerce.boolean().optional().default(false),
  cat: z.string().trim().max(60).optional().default(''),
  done: z.coerce.boolean().optional().default(false),
}).strip();

function taskToDb(b, empresaId) {
  const row = {
    titulo: b.title,
    prazo: b.due || null,
    responsavel: b.resp || null,
    importante: !!b.important,
    urgente: !!b.urgent,
    categoria: b.cat || null,
    concluida: !!b.done,
  };
  if (empresaId) row.empresa_id = empresaId;
  return row;
}

agendaRouter.get('/tarefas', async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const { data, error } = await db().from('agenda-tarefas').select('*').eq('empresa_id', empresaId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ tarefas: (data || []).map(mapTask) });
  } catch (err) { next(err); }
});

agendaRouter.post('/tarefas', validateBody(taskSchema), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const { data, error } = await db().from('agenda-tarefas').insert(taskToDb(req.body, empresaId)).select('*').single();
    if (error) throw error;
    res.status(201).json({ tarefa: mapTask(data) });
  } catch (err) { next(err); }
});

agendaRouter.patch('/tarefas/:id', validateBody(taskSchema.partial()), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const id = uuid.parse(req.params.id);
    const full = taskToDb({ title: req.body.title || '', ...req.body }, null);
    const map = { title: 'titulo', due: 'prazo', resp: 'responsavel', important: 'importante', urgent: 'urgente', cat: 'categoria', done: 'concluida' };
    const patch = {};
    Object.keys(req.body).forEach((k) => { if (map[k]) patch[map[k]] = full[map[k]]; });
    const { data, error } = await db().from('agenda-tarefas').update(patch).eq('id', id).eq('empresa_id', empresaId).select('*').single();
    if (error) throw error;
    res.json({ tarefa: mapTask(data) });
  } catch (err) { next(err); }
});

agendaRouter.delete('/tarefas/:id', async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const id = uuid.parse(req.params.id);
    const { error } = await db().from('agenda-tarefas').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});
