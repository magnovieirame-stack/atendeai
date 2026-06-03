// financeiro.routes.js — MÓDULO FINANCEIRO.
//   financeiro-contas    -> contas bancárias                 [tenant: empresaid]
//   financeiro-entradas  -> lançamentos (entrada/saida)      [tenant: empresaid]
// tipo: 'entrada' = receita (a receber) · 'saida' = despesa (a pagar).
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

export const financeiroRouter = Router();
financeiroRouter.use(requireAuth);

const uuid = z.string().uuid('id inválido');
const hexCor = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida.');
const dataOpt = z.string().trim().max(10).optional().nullable(); // 'YYYY-MM-DD'

async function getEmpresaId(req) {
  if (req._empresaId !== undefined) return req._empresaId;
  const { data } = await req.supabase.from('empresa_membros').select('empresa_id').limit(1);
  req._empresaId = data && data[0] ? data[0].empresa_id : null;
  return req._empresaId;
}

// ----- mapeamentos DB <-> DTO (colunas com hífen ficam isoladas aqui) -----
function mapConta(r) {
  return {
    id: r.id,
    descricao: r.descricao || '',
    banco: r.banco || '',
    numero: r.numero || '',
    saldoInicial: r.saldoinicial || 0,
    saldo: r['saldo-da-conta'] != null ? r['saldo-da-conta'] : (r.saldoinicial || 0),
    cor: r.cor || '#3b82f6',
    tipoConta: r['tipo-conta'] || '',
    fisicaJuridica: r['fisica-ou-juridica'] || '',
    agencia: r['agencia-digito'] || '',
    conta: r['conta-digito'] || '',
    gerencial: !!r.gerencial,
    observacoes: r.observacoes && r.observacoes !== 'null' ? r.observacoes : '',
  };
}
function mapEntrada(r, contaNome) {
  return {
    id: r.id,
    codigo: r.codigo || '',
    tipo: r.tipo, // entrada | saida
    descricao: r.descricao && r.descricao !== 'null' ? r.descricao : '',
    valor: r.valor || 0,
    categoria: r.categoria && r.categoria !== 'null' ? r.categoria : '',
    contaId: r.conta || null,
    contaNome: contaNome || '',
    forma: r['forma-pagamento'] && r['forma-pagamento'] !== 'null' ? r['forma-pagamento'] : '',
    responsavel: r.responsavel && r.responsavel !== 'null' ? r.responsavel : '',
    clienteOrigem: r['cliente-origem'] && r['cliente-origem'] !== 'null' ? r['cliente-origem'] : '',
    observacoes: r.observacoes && r.observacoes !== 'null' ? r.observacoes : '',
    pago: !!r.pago,
    recorrente: !!r.recorrente,
    emissao: r.dataemissao || null,
    vencimento: r.datavencimento || null,
    competencia: r.datacompetencia || null,
  };
}

// =========================== CONTAS ===========================
const contaSchema = z.object({
  descricao: z.string().trim().min(1, 'Informe a descrição.').max(120),
  banco: z.string().trim().max(80).optional().default(''),
  numero: z.string().trim().max(40).optional().default(''),
  saldoInicial: z.coerce.number().optional().default(0),
  cor: hexCor.default('#3b82f6'),
  tipoConta: z.string().trim().max(40).optional().default(''),
  fisicaJuridica: z.string().trim().max(20).optional().default(''),
  agencia: z.string().trim().max(40).optional().default(''),
  conta: z.string().trim().max(40).optional().default(''),
  gerencial: z.coerce.boolean().optional().default(false),
  observacoes: z.string().trim().max(300).optional().default(''),
}).strip();

// DTO -> colunas do banco
function contaToDb(b, empresaId) {
  const row = {
    descricao: b.descricao, banco: b.banco, numero: b.numero,
    saldoinicial: b.saldoInicial, 'saldo-da-conta': b.saldoInicial, cor: b.cor,
    'tipo-conta': b.tipoConta || null, 'fisica-ou-juridica': b.fisicaJuridica || null,
    'agencia-digito': b.agencia || null, 'conta-digito': b.conta || null,
    gerencial: b.gerencial, observacoes: b.observacoes || null,
  };
  if (empresaId) row.empresaid = empresaId;
  return row;
}

financeiroRouter.get('/contas', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.from('financeiro-contas').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ contas: (data || []).map(mapConta) });
  } catch (err) { next(err); }
});
financeiroRouter.post('/contas', validateBody(contaSchema), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const row = contaToDb(req.body, empresaId);
    row['saldo-da-conta'] = req.body.saldoInicial; // saldo começa = saldo inicial
    const { data, error } = await req.supabase.from('financeiro-contas').insert(row).select('*').single();
    if (error) throw error;
    res.status(201).json({ conta: mapConta(data) });
  } catch (err) { next(err); }
});
financeiroRouter.patch('/contas/:id', validateBody(contaSchema), async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const { data, error } = await req.supabase.from('financeiro-contas').update(contaToDb(req.body, null)).eq('id', id).select('*').single();
    if (error) throw error;
    res.json({ conta: mapConta(data) });
  } catch (err) { next(err); }
});
financeiroRouter.delete('/contas/:id', async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const { error } = await req.supabase.from('financeiro-contas').delete().eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// =========================== ENTRADAS / LANÇAMENTOS ===========================
const entradaSchema = z.object({
  tipo: z.enum(['entrada', 'saida']),
  descricao: z.string().trim().max(200).optional().default(''),
  valor: z.coerce.number().default(0),
  categoria: z.string().trim().max(120).optional().default(''),
  contaId: uuid.optional().nullable(),
  forma: z.string().trim().max(60).optional().default(''),
  responsavel: z.string().trim().max(120).optional().default(''),
  clienteOrigem: z.string().trim().max(160).optional().default(''),
  observacoes: z.string().trim().max(300).optional().default(''),
  pago: z.coerce.boolean().optional().default(false),
  recorrente: z.coerce.boolean().optional().default(false),
  emissao: dataOpt,
  vencimento: dataOpt,
  competencia: dataOpt,
}).strip();

function entradaToDb(b, empresaId) {
  const row = {
    tipo: b.tipo, descricao: b.descricao || null, valor: b.valor,
    categoria: b.categoria || null, conta: b.contaId || null,
    'forma-pagamento': b.forma || null, responsavel: b.responsavel || null,
    'cliente-origem': b.clienteOrigem || null, observacoes: b.observacoes || null,
    pago: b.pago, recorrente: b.recorrente,
    dataemissao: b.emissao || null, datavencimento: b.vencimento || null, datacompetencia: b.competencia || null,
    valorsubtotal: b.valor,
  };
  if (empresaId) row.empresaid = empresaId;
  return row;
}

// nomes das contas para anexar aos lançamentos
async function contaNomes(req) {
  const { data } = await req.supabase.from('financeiro-contas').select('id,descricao');
  const m = {}; (data || []).forEach((c) => { m[c.id] = c.descricao; }); return m;
}

financeiroRouter.get('/entradas', async (req, res, next) => {
  try {
    let q = req.supabase.from('financeiro-entradas').select('*').order('datavencimento', { ascending: false, nullsFirst: false });
    const tipo = req.query.tipo;
    if (tipo === 'entrada' || tipo === 'saida') q = q.eq('tipo', tipo);
    const { data, error } = await q;
    if (error) throw error;
    const nomes = await contaNomes(req);
    res.json({ entradas: (data || []).map((r) => mapEntrada(r, nomes[r.conta])) });
  } catch (err) { next(err); }
});
financeiroRouter.post('/entradas', validateBody(entradaSchema), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const row = entradaToDb(req.body, empresaId);
    row.codigo = (req.body.tipo === 'entrada' ? 'RCB' : 'DSP') + '-' + Math.floor(10000 + Math.random() * 90000);
    const { data, error } = await req.supabase.from('financeiro-entradas').insert(row).select('*').single();
    if (error) throw error;
    const nomes = await contaNomes(req);
    res.status(201).json({ entrada: mapEntrada(data, nomes[data.conta]) });
  } catch (err) { next(err); }
});
// PATCH aceita schema parcial (usado tanto p/ editar quanto p/ "dar baixa"/pagar)
const entradaPatchSchema = entradaSchema.partial();
financeiroRouter.patch('/entradas/:id', validateBody(entradaPatchSchema), async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    // monta só os campos enviados -> colunas
    const full = entradaToDb({ tipo: 'entrada', ...req.body }, null);
    const patch = {};
    const map = {
      descricao: 'descricao', valor: 'valor', categoria: 'categoria', contaId: 'conta',
      forma: 'forma-pagamento', responsavel: 'responsavel', clienteOrigem: 'cliente-origem',
      observacoes: 'observacoes', pago: 'pago', recorrente: 'recorrente',
      emissao: 'dataemissao', vencimento: 'datavencimento', competencia: 'datacompetencia',
    };
    Object.keys(req.body).forEach((k) => { if (map[k]) patch[map[k]] = full[map[k]]; });
    if (req.body.tipo) patch.tipo = req.body.tipo;
    const { data, error } = await req.supabase.from('financeiro-entradas').update(patch).eq('id', id).select('*').single();
    if (error) throw error;
    const nomes = await contaNomes(req);
    res.json({ entrada: mapEntrada(data, nomes[data.conta]) });
  } catch (err) { next(err); }
});
financeiroRouter.delete('/entradas/:id', async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const { error } = await req.supabase.from('financeiro-entradas').delete().eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});
