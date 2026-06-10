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
function mapAppt(r, cli) {
  return {
    id: r.id,
    clienteId: r.cliente_id || null,
    client: (r.participante && r.participante !== 'null') ? r.participante : (cli && cli.nome && cli.nome !== 'null' ? cli.nome : 'Sem nome'),
    participanteTipo: r.participante_tipo || 'cliente',
    participanteId: r.participante_id || null,
    service: r.servico || '',
    data: r.data || null,          // 'YYYY-MM-DD'
    start: r.hora || '',           // 'HH:MM'
    dur: r.duracao || 60,
    resp: r.responsavel || '',
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

agendaRouter.get('/', async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const { data, error } = await db().from('agenda').select('*').eq('empresa_id', empresaId)
      .order('data', { ascending: true }).order('hora', { ascending: true });
    if (error) throw error;
    const rows = data || [];
    const cmap = await clientesMap(rows.map((r) => r.cliente_id));
    res.json({ agenda: rows.map((r) => mapAppt(r, cmap[r.cliente_id])) });
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

agendaRouter.post('/', validateBody(apptSchema), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const row = apptToDb(req.body, empresaId);
    if (req.user && req.user.id) row.criado_por = req.user.id;
    const { data, error } = await db().from('agenda').insert(row).select('*').single();
    if (error) throw error;
    // espelha no Google Calendar (se conectado) e guarda o id do evento
    const eventId = await sincronizarGoogle(empresaId, 'create', data);
    if (eventId) { await db().from('agenda').update({ gcal_event_id: eventId }).eq('id', data.id); data.gcal_event_id = eventId; }
    const cmap = await clientesMap([data.cliente_id]);
    // NÃO notifica na criação — o lembrete é disparado pelo worker no tempo de antecedência.
    res.status(201).json({ appt: mapAppt(data, cmap[data.cliente_id]) });
  } catch (err) { next(err); }
});

agendaRouter.patch('/:id', validateBody(apptSchema.partial()), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const id = uuid.parse(req.params.id);
    const full = apptToDb({ data: req.body.data || '2000-01-01', ...req.body }, null);
    const map = { clienteId: 'cliente_id', participante: 'participante', participanteTipo: 'participante_tipo', participanteId: 'participante_id', respNome: 'responsavel_nome', service: 'servico', data: 'data', start: 'hora', dur: 'duracao', resp: 'responsavel', type: 'tipo', status: 'status', local: 'local', phone: 'telefone', obs: 'observacoes', source: 'canal', byAI: 'por_ia' };
    const patch = {};
    Object.keys(req.body).forEach((k) => { if (map[k]) patch[map[k]] = full[map[k]]; });
    const { data, error } = await db().from('agenda').update(patch).eq('id', id).eq('empresa_id', empresaId).select('*').single();
    if (error) throw error;
    // espelha a edição no Google Calendar (cria o evento se ainda não existir)
    const eventId = await sincronizarGoogle(empresaId, 'update', data);
    if (eventId && eventId !== data.gcal_event_id) { await db().from('agenda').update({ gcal_event_id: eventId }).eq('id', data.id); data.gcal_event_id = eventId; }
    const cmap = await clientesMap([data.cliente_id]);
    res.json({ appt: mapAppt(data, cmap[data.cliente_id]) });
  } catch (err) { next(err); }
});

agendaRouter.delete('/:id', async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const id = uuid.parse(req.params.id);
    // pega o id do evento no Google antes de apagar, p/ remover de lá também
    const { data: row } = await db().from('agenda').select('gcal_event_id').eq('id', id).eq('empresa_id', empresaId).maybeSingle();
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
