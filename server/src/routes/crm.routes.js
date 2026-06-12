// crm.routes.js — MÓDULO CRM (funil Kanban).
//   crm-funil       -> o funil (board)            [tenant: empresa_user_id]
//   crm-fasefunil   -> colunas/fases (por pos)    [tenant: via funil]
//   crm-clientesfunil -> cards (cliente x fase)   [tenant: empresa_id]
// Card = um cliente numa fase; valor do card = clientes.valor.
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requirePermissao, temPermissao } from '../lib/autorizacao.js';
import { deptosDoUsuario, deptosResponsavel, nomeUsuario } from '../lib/escopo.js';
import { validateBody } from '../middleware/validate.js';
import { adminClient } from '../lib/supabase.js';
import { criarNotificacao } from '../lib/notify.js';

export const crmRouter = Router();
crmRouter.use(requireAuth);
// Autorização: ver (GET) · mover card/fixar = crm.mover · resto (criar/apagar
// card, mexer no funil/fases) = crm.gerenciar.
crmRouter.use((req, res, next) => {
  let perm = 'crm.gerenciar';
  if (req.method === 'GET') perm = 'crm.ver';
  else if (req.method === 'PATCH' && /\/cards\/[^/]+(\/fixar|\/responsavel)?$/.test(req.path)) perm = 'crm.mover';
  return requirePermissao(perm)(req, res, next);
});

const uuid = z.string().uuid('id inválido');
const hexCor = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida.');

async function getEmpresaId(req) {
  if (req._empresaId !== undefined) return req._empresaId;
  // Reusa o empresaId já carregado pela autorização (req._auth) — evita ida redundante ao banco.
  if (req._auth && req._auth.empresaId != null) { req._empresaId = req._auth.empresaId; return req._empresaId; }
  const { data } = await req.supabase.from('empresa_membros').select('empresa_id').limit(1);
  req._empresaId = data && data[0] ? data[0].empresa_id : null;
  return req._empresaId;
}

// ESCOPO de cards (3 níveis): admin (crm.gerenciar) vê tudo; líder vê o(s) setor(es)
// que lidera + pool; vendedor vê os seus + pool do seu setor. Devolve o filtro PostgREST
// pra aplicar em crm-clientesfunil (ou or=null quando é admin = sem filtro).
async function escopoCards(req) {
  if (temPermissao(req._auth, 'crm.gerenciar')) return { isAdmin: true, or: null };
  const me = req.user.id;
  const meusDeptos = deptosDoUsuario(req);
  const deptosResp = await deptosResponsavel(req);
  const ors = [`responsavel_id.eq.${me}`]; // sempre vejo os MEUS
  if (meusDeptos.length > 0 || deptosResp.length > 0) {
    ors.push('and(responsavel_id.is.null,departamento_id.is.null)'); // pool global (sem dono e sem setor)
    if (meusDeptos.length) ors.push(`and(responsavel_id.is.null,departamento_id.in.(${meusDeptos.join(',')}))`); // pool do meu setor
    if (deptosResp.length) ors.push(`departamento_id.in.(${deptosResp.join(',')})`); // líder: tudo do(s) setor(es) que lidero
  }
  return { isAdmin: false, or: ors.join(',') };
}

// Pode MOVER/REATRIBUIR este card? admin OU dono OU líder-do-setor-do-card OU pool visível.
async function podeMexerNoCard(req, card) {
  if (temPermissao(req._auth, 'crm.gerenciar')) return true;          // admin
  const me = req.user.id;
  if (card.responsavel_id && card.responsavel_id === me) return true; // dono
  const deptosResp = await deptosResponsavel(req);
  const cardDep = card.departamento_id != null ? Number(card.departamento_id) : null;
  if (cardDep != null && deptosResp.map(Number).includes(cardDep)) return true; // líder do setor do card
  if (!card.responsavel_id) {                                          // pool: quem vê, pode pegar/mover
    const meus = deptosDoUsuario(req).map(Number);
    if (cardDep == null && (meus.length || deptosResp.length)) return true; // pool global
    if (cardDep != null && meus.includes(cardDep)) return true;             // pool do meu setor
  }
  return false;
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
    criadoEm: rel.created_at || null,   // data de criação do card (crm-clientesfunil)
    // tags jsonb [{label,color}] — todo card tem no mínimo a tag do tipo (Cliente/Lead)
    tags: withTipoTag(Array.isArray(rel.tags) ? rel.tags : [], rel.tipo === 'lead' ? 'lead' : 'cliente'),
    fixado: rel.fixado === true,        // card fixado no topo (coluna opcional)
    tipo: rel.tipo === 'lead' ? 'lead' : 'cliente', // cliente | lead (coluna opcional)
    responsavelId: rel.responsavel_id || null,        // dono do card (null = pool)
    responsavelNome: rel.responsavel_nome || null,
    departamentoId: rel.departamento_id != null ? rel.departamento_id : null,
  };
}

const SEL_CLI = 'id,nome,empresa,telefone,email,valor,fotolink';

// Tag automática por tipo de card (jsonb {label,color}) — todo card tem pelo menos uma.
const CARD_TIPO_TAG = {
  cliente: { label: 'Cliente', color: '#16A34A' }, // verde
  lead: { label: 'Lead', color: '#3B82F6' },       // azul
};

// Garante que a empresa tenha as 2 tags padrão no catálogo (tabela 'tags').
// Idempotente: cria se faltar, ajusta a cor canônica se divergir. Best-effort.
async function ensureCrmDefaultTags(req, empresaId) {
  if (!empresaId) return;
  try {
    const { data: ex } = await req.supabase.from('tags').select('id,nome,cor').eq('empresaid', empresaId);
    const byName = {};
    (ex || []).forEach((t) => { byName[(t.nome || '').trim().toLowerCase()] = t; });
    for (const key of ['cliente', 'lead']) {
      const def = CARD_TIPO_TAG[key];
      const cur = byName[def.label.toLowerCase()];
      if (!cur) {
        await req.supabase.from('tags').insert({ nome: def.label, cor: def.color, empresaid: empresaId });
      } else if ((cur.cor || '').toLowerCase() !== def.color.toLowerCase()) {
        await req.supabase.from('tags').update({ cor: def.color }).eq('id', cur.id);
      }
    }
  } catch (e) { /* best-effort: não bloqueia o fluxo */ }
}

// Mescla a tag do tipo (Cliente/Lead) com as tags escolhidas, sem duplicar.
function withTipoTag(tags, tipo) {
  const base = CARD_TIPO_TAG[tipo] || CARD_TIPO_TAG.cliente;
  const rest = (Array.isArray(tags) ? tags : []).filter((t) => (t.label || '').trim().toLowerCase() !== base.label.toLowerCase());
  return [base, ...rest];
}

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
    // ESCOPO 3 níveis: os contadores por fase só contam os cards VISÍVEIS pro usuário.
    const esc = await escopoCards(req);
    let relQ = req.supabase.from('crm-clientesfunil').select('id,cliente,fase');
    if (!esc.isAdmin && esc.or) relQ = relQ.or(esc.or);
    // funis, fases e cards são independentes -> em PARALELO (4 round-trips viram 2).
    const [funisRes, fasesRes, relsRes] = await Promise.all([
      req.supabase.from('crm-funil').select('id,nome,descricao,cor_funil,created_at').order('created_at', { ascending: true }),
      req.supabase.from('crm-fasefunil').select('id,nome,cor_funil,pos,funil'),
      relQ,
    ]);
    if (funisRes.error) throw funisRes.error;
    const funis = funisRes.data;
    const fases = fasesRes.data;
    const rels = relsRes.data;

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
      const columns = fs.map((f) => ({ id: f.id, label: f.nome, color: f.cor_funil || '#94a3b8', count: (statByFase[f.id] || {}).count || 0, value: (statByFase[f.id] || {}).value || 0 }));
      return { id: fu.id, name: fu.nome, desc: fu.descricao || '', color: fu.cor_funil || '#22C55E', updated: fmtData(fu.created_at), cards: columns.reduce((s, c) => s + c.count, 0), columns };
    });
    res.json({ funis: boards });
  } catch (err) { next(err); }
});

// ---- GET /api/crm/funis/:id — board (fases + cards) ----
crmRouter.get('/funis/:id', async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    // semeia as tags padrão (Cliente/Lead) da empresa — automático ao abrir o CRM.
    ensureCrmDefaultTags(req, await getEmpresaId(req)).catch(() => {});
    // funil e fases dependem só do :id (não um do outro) -> em PARALELO.
    const [funilRes, fasesRes] = await Promise.all([
      req.supabase.from('crm-funil').select('id,nome,descricao,cor_funil').eq('id', id).single(),
      req.supabase.from('crm-fasefunil').select('id,nome,cor_funil,pos').eq('funil', id).order('pos', { ascending: true }),
    ]);
    if (funilRes.error || !funilRes.data) return res.status(404).json({ error: 'Funil não encontrado.' });
    const funil = funilRes.data;
    const fases = fasesRes.data;
    const faseIds = (fases || []).map((f) => f.id);
    let cards = [];
    if (faseIds.length) {
      const esc = await escopoCards(req);
      let relQ = req.supabase.from('crm-clientesfunil').select('*').in('fase', faseIds);
      if (!esc.isAdmin && esc.or) relQ = relQ.or(esc.or);
      const { data: rels } = await relQ;
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
    const { data: card } = await req.supabase.from('crm-clientesfunil').select('id,responsavel_id,departamento_id').eq('id', id).maybeSingle();
    if (!card) return res.status(404).json({ error: 'Card não encontrado.' });
    if (!(await podeMexerNoCard(req, card))) return res.status(403).json({ error: 'Você não pode mover este card (é de outra pessoa).' });
    const { data, error } = await req.supabase.from('crm-clientesfunil').update({ fase: req.body.faseId }).eq('id', id).select('id,fase').single();
    if (error) throw error;
    res.json({ card: { id: data.id, faseId: data.fase } });
  } catch (err) { next(err); }
});

// ---- PATCH /api/crm/cards/:id/responsavel — atribuir/reatribuir o dono (dono/líder/admin) ----
const respCardSchema = z.object({
  responsavelId: uuid.nullable(),                                  // null = devolve pro pool
  responsavelNome: z.string().trim().max(120).nullable().optional(),
  departamentoId: z.union([z.string(), z.number()]).nullable().optional(),
}).strip();
crmRouter.patch('/cards/:id/responsavel', validateBody(respCardSchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { data: card } = await req.supabase.from('crm-clientesfunil').select('id,responsavel_id,departamento_id').eq('id', id).maybeSingle();
    if (!card) return res.status(404).json({ error: 'Card não encontrado.' });
    if (!(await podeMexerNoCard(req, card))) return res.status(403).json({ error: 'Você não pode reatribuir este card.' });
    const patch = {
      responsavel_id: req.body.responsavelId || null,
      responsavel_nome: req.body.responsavelId ? (req.body.responsavelNome || null) : null,
    };
    if (req.body.departamentoId !== undefined) patch.departamento_id = req.body.departamentoId || null;
    const { data, error } = await req.supabase.from('crm-clientesfunil').update(patch).eq('id', id).select('id,responsavel_id,responsavel_nome,departamento_id').single();
    if (error) throw error;
    res.json({ card: { id: data.id, responsavelId: data.responsavel_id || null, responsavelNome: data.responsavel_nome || null, departamentoId: data.departamento_id != null ? data.departamento_id : null } });
  } catch (err) { next(err); }
});

// ---- POST /api/crm/cards — adiciona um cliente a uma fase ----
const addCardSchema = z.object({ clienteId: uuid, faseId: z.coerce.number().int() }).strip();
crmRouter.post('/cards', validateBody(addCardSchema), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const meuDep = deptosDoUsuario(req)[0] || null; // card criado no board nasce com dono = você
    const { data, error } = await req.supabase.from('crm-clientesfunil')
      .insert({ cliente: req.body.clienteId, fase: req.body.faseId, empresa_id: empresaId, responsavel_id: req.user.id, responsavel_nome: nomeUsuario(req), departamento_id: meuDep }).select('id,cliente,fase,created_at,responsavel_id,responsavel_nome,departamento_id').single();
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
  tipo: z.enum(['cliente', 'lead']).optional().default('cliente'),
  tags: z.array(z.object({ label: z.string().trim().max(60), color: z.string().trim().max(20) })).optional().default([]),
}).strip();
crmRouter.post('/cards/novo', validateBody(novoCardSchema), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const { nome, empresa, telefone, email, valor, faseId } = req.body;
    const tipo = req.body.tipo === 'lead' ? 'lead' : 'cliente';
    const tagList = Array.isArray(req.body.tags) ? req.body.tags : [];
    const finalTags = withTipoTag(tagList, tipo); // todo card nasce com a tag Cliente/Lead
    // garante as 2 tags padrão no catálogo da empresa
    await ensureCrmDefaultTags(req, empresaId);
    const cliIns = await req.supabase.from('clientes')
      .insert({ nome, empresa: empresa || null, telefone, email, valor, empresa_id: empresaId }).select(SEL_CLI).single();
    if (cliIns.error) throw cliIns.error;
    const cli = cliIns.data;
    const meuDep = deptosDoUsuario(req)[0] || null; // card criado no board nasce com dono = você
    const relIns = await req.supabase.from('crm-clientesfunil')
      .insert({ cliente: cli.id, fase: faseId, empresa_id: empresaId, responsavel_id: req.user.id, responsavel_nome: nomeUsuario(req), departamento_id: meuDep }).select('id,cliente,fase,created_at,responsavel_id,responsavel_nome,departamento_id').single();
    if (relIns.error) throw relIns.error;
    // tags/tipo: gravação "best-effort" — sempre grava as tags (mínimo a do tipo).
    await req.supabase.from('crm-clientesfunil').update({ tags: finalTags }).eq('id', relIns.data.id);
    await req.supabase.from('crm-clientesfunil').update({ tipo }).eq('id', relIns.data.id);
    // Se o card é um Lead, cadastra também na tabela de leads (página Comercial > Leads).
    if (tipo === 'lead') {
      try {
        const lrow = { nome, empresa: empresa || null, telefone: telefone || null, email: email || null, valor: valor || 0, fase: 'novo', origem: 'CRM', tags: [] };
        if (empresaId) lrow.empresa_id = empresaId;
        const { data: ld } = await adminClient().from('leads').insert(lrow).select('id,nome').single();
        if (ld) await criarNotificacao({ empresaId, kind: 'lead', texto: 'Novo lead: ' + (ld.nome || 'sem nome'), link: 'leads' });
      } catch (e) { /* best-effort: não impede a criação do card */ }
    }
    res.status(201).json({ card: mapCard({ ...relIns.data, tags: finalTags, tipo }, cli) });
  } catch (err) { next(err); }
});

// ---- PATCH /api/crm/cards/:id/fixar — fixar/desafixar card (best-effort) ----
const fixarSchema = z.object({ fixado: z.coerce.boolean() }).strip();
crmRouter.patch('/cards/:id/fixar', validateBody(fixarSchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    // best-effort: se a coluna 'fixado' não existir, o update falha silenciosamente.
    await req.supabase.from('crm-clientesfunil').update({ fixado: req.body.fixado }).eq('id', id);
    res.json({ ok: true, fixado: req.body.fixado });
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

// ---- DELETE /api/crm/funis/:id — remove o funil, suas fases e os cards (cascata) ----
crmRouter.delete('/funis/:id', async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    // fases do funil -> remove primeiro os cards (crm-clientesfunil) dessas fases
    const { data: fases } = await req.supabase.from('crm-fasefunil').select('id').eq('funil', id);
    const faseIds = (fases || []).map((f) => f.id);
    if (faseIds.length) {
      await req.supabase.from('crm-clientesfunil').delete().in('fase', faseIds);
      await req.supabase.from('crm-fasefunil').delete().eq('funil', id);
    }
    const { error } = await req.supabase.from('crm-funil').delete().eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
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
