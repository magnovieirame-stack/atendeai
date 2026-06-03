// crm.routes.js — MÓDULO CRM (funil Kanban).
//   crm-funil       -> o funil (board)            [tenant: empresa_user_id]
//   crm-fasefunil   -> colunas/fases (por pos)    [tenant: via funil]
//   crm-clientesfunil -> cards (cliente x fase)   [tenant: empresa_id]
// Card = um cliente numa fase; valor do card = clientes.valor.
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

export const crmRouter = Router();
crmRouter.use(requireAuth);

const uuid = z.string().uuid('id inválido');
const hexCor = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida.');

async function getEmpresaId(req) {
  if (req._empresaId !== undefined) return req._empresaId;
  const { data } = await req.supabase.from('empresa_membros').select('empresa_id').limit(1);
  req._empresaId = data && data[0] ? data[0].empresa_id : null;
  return req._empresaId;
}

// crm-clientesfunil + clientes -> card da UI
function mapCard(rel, cli) {
  return {
    id: rel.id,            // id do crm-clientesfunil (bigint)
    faseId: rel.fase,
    clienteId: rel.cliente,
    name: (cli && cli.nome && cli.nome !== 'null' ? cli.nome : null) || 'Sem nome',
    company: cli ? cli.empresa || null : null,
    phone: cli ? cli.telefone || null : null,
    email: cli ? cli.email || null : null,
    value: cli ? cli.valor || 0 : 0,
    foto: cli ? cli.fotolink || null : null,
  };
}

const SEL_CLI = 'id,nome,empresa,telefone,email,valor,fotolink';

function fmtData(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// ---- GET /api/crm/funis — lista de funis com estatísticas por fase ----
crmRouter.get('/funis', async (req, res, next) => {
  try {
    const { data: funis, error } = await req.supabase.from('crm-funil')
      .select('id,nome,descricao,cor_funil,created_at').order('created_at', { ascending: true });
    if (error) throw error;
    const { data: fases } = await req.supabase.from('crm-fasefunil').select('id,nome,cor_funil,pos,funil');
    const { data: rels } = await req.supabase.from('crm-clientesfunil').select('id,cliente,fase');

    const cliIds = [...new Set((rels || []).map((r) => r.cliente).filter(Boolean))];
    const valorByCli = {};
    if (cliIds.length) {
      const { data: cls } = await req.supabase.from('clientes').select('id,valor').in('id', cliIds);
      (cls || []).forEach((c) => { valorByCli[c.id] = c.valor || 0; });
    }
    const statByFase = {};
    (rels || []).forEach((r) => { const s = statByFase[r.fase] = statByFase[r.fase] || { count: 0, value: 0 }; s.count++; s.value += valorByCli[r.cliente] || 0; });
    const fasesByFunil = {};
    (fases || []).forEach((f) => { (fasesByFunil[f.funil] = fasesByFunil[f.funil] || []).push(f); });

    const boards = (funis || []).map((fu) => {
      const fs = (fasesByFunil[fu.id] || []).sort((a, b) => (a.pos || 0) - (b.pos || 0));
      const columns = fs.map((f) => ({ label: f.nome, color: f.cor_funil || '#94a3b8', count: (statByFase[f.id] || {}).count || 0, value: (statByFase[f.id] || {}).value || 0 }));
      return { id: fu.id, name: fu.nome, desc: fu.descricao || '', color: fu.cor_funil || '#22C55E', updated: fmtData(fu.created_at), cards: columns.reduce((s, c) => s + c.count, 0), columns };
    });
    res.json({ funis: boards });
  } catch (err) { next(err); }
});

// ---- GET /api/crm/funis/:id — board (fases + cards) ----
crmRouter.get('/funis/:id', async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const { data: funil, error } = await req.supabase.from('crm-funil').select('id,nome,descricao,cor_funil').eq('id', id).single();
    if (error || !funil) return res.status(404).json({ error: 'Funil não encontrado.' });
    const { data: fases } = await req.supabase.from('crm-fasefunil').select('id,nome,cor_funil,pos').eq('funil', id).order('pos', { ascending: true });
    const faseIds = (fases || []).map((f) => f.id);
    let cards = [];
    if (faseIds.length) {
      const { data: rels } = await req.supabase.from('crm-clientesfunil').select('id,cliente,fase').in('fase', faseIds);
      const cliIds = [...new Set((rels || []).map((r) => r.cliente).filter(Boolean))];
      const cliById = {};
      if (cliIds.length) { const { data: cls } = await req.supabase.from('clientes').select(SEL_CLI).in('id', cliIds); (cls || []).forEach((c) => { cliById[c.id] = c; }); }
      cards = (rels || []).map((r) => mapCard(r, cliById[r.cliente]));
    }
    res.json({
      funil: { id: funil.id, name: funil.nome, desc: funil.descricao || '', color: funil.cor_funil || '#22C55E' },
      fases: (fases || []).map((f) => ({ id: f.id, label: f.nome, color: f.cor_funil || '#94a3b8', pos: f.pos })),
      cards,
    });
  } catch (err) { next(err); }
});

// ---- PATCH /api/crm/cards/:id — mover card de fase (drag) ----
const moveSchema = z.object({ faseId: z.coerce.number().int() }).strip();
crmRouter.patch('/cards/:id', validateBody(moveSchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { data, error } = await req.supabase.from('crm-clientesfunil').update({ fase: req.body.faseId }).eq('id', id).select('id,fase').single();
    if (error) throw error;
    res.json({ card: { id: data.id, faseId: data.fase } });
  } catch (err) { next(err); }
});

// ---- POST /api/crm/cards — adiciona um cliente a uma fase ----
const addCardSchema = z.object({ clienteId: uuid, faseId: z.coerce.number().int() }).strip();
crmRouter.post('/cards', validateBody(addCardSchema), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const { data, error } = await req.supabase.from('crm-clientesfunil')
      .insert({ cliente: req.body.clienteId, fase: req.body.faseId, empresa_id: empresaId }).select('id,cliente,fase').single();
    if (error) throw error;
    const { data: cli } = await req.supabase.from('clientes').select(SEL_CLI).eq('id', req.body.clienteId).single();
    res.status(201).json({ card: mapCard(data, cli) });
  } catch (err) { next(err); }
});

// ---- POST /api/crm/cards/novo — cria um cliente novo e adiciona à fase ----
const novoCardSchema = z.object({
  faseId: z.coerce.number().int(),
  nome: z.string().trim().min(1, 'Informe o nome.').max(120),
  empresa: z.string().trim().max(120).optional().default(''),
  telefone: z.string().trim().max(40).optional().default(''),
  email: z.string().trim().max(120).optional().default(''),
  valor: z.coerce.number().optional().default(0),
}).strip();
crmRouter.post('/cards/novo', validateBody(novoCardSchema), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const { nome, empresa, telefone, email, valor, faseId } = req.body;
    const cliIns = await req.supabase.from('clientes')
      .insert({ nome, empresa: empresa || null, telefone, email, valor, empresa_id: empresaId }).select(SEL_CLI).single();
    if (cliIns.error) throw cliIns.error;
    const cli = cliIns.data;
    const relIns = await req.supabase.from('crm-clientesfunil')
      .insert({ cliente: cli.id, fase: faseId, empresa_id: empresaId }).select('id,cliente,fase').single();
    if (relIns.error) throw relIns.error;
    res.status(201).json({ card: mapCard(relIns.data, cli) });
  } catch (err) { next(err); }
});

// ---- DELETE /api/crm/cards/:id ----
crmRouter.delete('/cards/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { error } = await req.supabase.from('crm-clientesfunil').delete().eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ---- POST /api/crm/funis — criar funil ----
const funilSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome.').max(80),
  descricao: z.string().trim().max(300).optional().default(''),
  cor_funil: hexCor.default('#22C55E'),
}).strip();
crmRouter.post('/funis', validateBody(funilSchema), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const { data, error } = await req.supabase.from('crm-funil')
      .insert({ nome: req.body.nome, descricao: req.body.descricao, cor_funil: req.body.cor_funil, empresa_user_id: empresaId })
      .select('id,nome,descricao,cor_funil,created_at').single();
    if (error) throw error;
    res.status(201).json({ funil: { id: data.id, name: data.nome, desc: data.descricao || '', color: data.cor_funil, updated: fmtData(data.created_at), cards: 0, columns: [] } });
  } catch (err) { next(err); }
});

// ---- PATCH /api/crm/funis/:id — editar funil ----
crmRouter.patch('/funis/:id', validateBody(funilSchema), async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const { data, error } = await req.supabase.from('crm-funil')
      .update({ nome: req.body.nome, descricao: req.body.descricao, cor_funil: req.body.cor_funil }).eq('id', id)
      .select('id,nome,descricao,cor_funil').single();
    if (error) throw error;
    res.json({ funil: { id: data.id, name: data.nome, desc: data.descricao || '', color: data.cor_funil } });
  } catch (err) { next(err); }
});

// ---- POST /api/crm/funis/:id/fases — adicionar coluna ----
const faseSchema = z.object({ nome: z.string().trim().min(1).max(60), cor_funil: hexCor.default('#94a3b8') }).strip();
crmRouter.post('/funis/:id/fases', validateBody(faseSchema), async (req, res, next) => {
  try {
    const funilId = uuid.parse(req.params.id);
    const { data: ex } = await req.supabase.from('crm-fasefunil').select('pos').eq('funil', funilId).order('pos', { ascending: false }).limit(1);
    const pos = ex && ex[0] ? (ex[0].pos || 0) + 1 : 1;
    const { data, error } = await req.supabase.from('crm-fasefunil')
      .insert({ nome: req.body.nome, cor_funil: req.body.cor_funil, funil: funilId, pos }).select('id,nome,cor_funil,pos').single();
    if (error) throw error;
    res.status(201).json({ fase: { id: data.id, label: data.nome, color: data.cor_funil, pos: data.pos } });
  } catch (err) { next(err); }
});

// ---- PATCH /api/crm/fases/:id — renomear / cor / reordenar ----
const fasePatchSchema = z.object({ nome: z.string().trim().min(1).max(60).optional(), cor_funil: hexCor.optional(), pos: z.coerce.number().int().optional() }).strip();
crmRouter.patch('/fases/:id', validateBody(fasePatchSchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { data, error } = await req.supabase.from('crm-fasefunil').update(req.body).eq('id', id).select('id,nome,cor_funil,pos').single();
    if (error) throw error;
    res.json({ fase: { id: data.id, label: data.nome, color: data.cor_funil, pos: data.pos } });
  } catch (err) { next(err); }
});

// ---- DELETE /api/crm/fases/:id (remove a coluna e seus cards) ----
crmRouter.delete('/fases/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await req.supabase.from('crm-clientesfunil').delete().eq('fase', id);
    const { error } = await req.supabase.from('crm-fasefunil').delete().eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});
