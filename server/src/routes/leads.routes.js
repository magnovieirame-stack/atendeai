// leads.routes.js — MÓDULO LEADS (comercial).
//   Tabela: "leads". RLS ligado sem policies -> só o service_role acessa.
//   Usamos adminClient() e SEMPRE filtramos por empresa_id (isolamento por tenant).
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { adminClient } from '../lib/supabase.js';
import { criarNotificacao } from '../lib/notify.js';

export const leadsRouter = Router();
leadsRouter.use(requireAuth);

const uuid = z.string().uuid('id inválido');
const db = () => adminClient();

async function getEmpresaId(req) {
  if (req._empresaId !== undefined) return req._empresaId;
  const { data } = await req.supabase.from('empresa_membros').select('empresa_id').limit(1);
  req._empresaId = data && data[0] ? data[0].empresa_id : null;
  return req._empresaId;
}

function fmtDataBR(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// DB -> DTO (nomes que o frontend já usa)
function mapLead(r) {
  return {
    id: r.id,
    name: r.nome || '',
    company: r.empresa || '',
    phone: r.telefone || '',
    email: r.email || '',
    value: r.valor || 0,
    source: r.origem || '',
    stage: r.fase || 'novo',
    attendant: r.atendente || '',
    tags: Array.isArray(r.tags) ? r.tags : [],
    obs: r.observacoes && r.observacoes !== 'null' ? r.observacoes : '',
    date: fmtDataBR(r.created_at),
  };
}

const leadSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome.').max(160),
  company: z.string().trim().max(160).optional().default(''),
  phone: z.string().trim().max(40).optional().default(''),
  email: z.string().trim().max(160).optional().default(''),
  value: z.coerce.number().optional().default(0),
  source: z.string().trim().max(60).optional().default(''),
  stage: z.string().trim().max(40).optional().default('novo'),
  attendant: z.string().trim().max(120).optional().default(''),
  obs: z.string().trim().max(2000).optional().default(''),
  tags: z.array(z.object({ name: z.string().max(60), color: z.string().max(20) })).optional().default([]),
}).strip();

function leadToDb(b, empresaId) {
  const row = {
    nome: b.name,
    empresa: b.company || null,
    telefone: b.phone || null,
    email: b.email || null,
    valor: b.value || 0,
    origem: b.source || null,
    fase: b.stage || 'novo',
    atendente: b.attendant || null,
    observacoes: b.obs || null,
    tags: Array.isArray(b.tags) ? b.tags : [],
  };
  if (empresaId) row.empresa_id = empresaId;
  return row;
}

leadsRouter.get('/', async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const { data, error } = await db().from('leads').select('*').eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ leads: (data || []).map(mapLead) });
  } catch (err) { next(err); }
});

leadsRouter.post('/', validateBody(leadSchema), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const { data, error } = await db().from('leads').insert(leadToDb(req.body, empresaId)).select('*').single();
    if (error) throw error;
    await criarNotificacao({ empresaId, kind: 'lead', texto: 'Novo lead: ' + (data.nome || 'sem nome'), link: 'leads' });
    res.status(201).json({ lead: mapLead(data) });
  } catch (err) { next(err); }
});

leadsRouter.patch('/:id', validateBody(leadSchema.partial()), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const id = uuid.parse(req.params.id);
    const full = leadToDb({ name: req.body.name || '', ...req.body }, null);
    const map = { name: 'nome', company: 'empresa', phone: 'telefone', email: 'email', value: 'valor', source: 'origem', stage: 'fase', attendant: 'atendente', obs: 'observacoes', tags: 'tags' };
    const patch = {};
    Object.keys(req.body).forEach((k) => { if (map[k]) patch[map[k]] = full[map[k]]; });
    const { data, error } = await db().from('leads').update(patch).eq('id', id).eq('empresa_id', empresaId).select('*').single();
    if (error) throw error;
    res.json({ lead: mapLead(data) });
  } catch (err) { next(err); }
});

leadsRouter.delete('/:id', async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const id = uuid.parse(req.params.id);
    const { error } = await db().from('leads').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});
