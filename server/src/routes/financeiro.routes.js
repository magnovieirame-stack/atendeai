// financeiro.routes.js — MÓDULO FINANCEIRO.
//   financeiro-contas    -> contas bancárias                 [tenant: empresaid]
//   financeiro-entradas  -> lançamentos (entrada/saida)      [tenant: empresaid]
// tipo: 'entrada' = receita (a receber) · 'saida' = despesa (a pagar).
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requirePermissao } from '../lib/autorizacao.js';
import { validateBody } from '../middleware/validate.js';

export const financeiroRouter = Router();
financeiroRouter.use(requireAuth);
// Autorização: ver para GET, gerenciar para escrita.
financeiroRouter.use((req, res, next) =>
  requirePermissao(req.method === 'GET' ? 'financeiro.ver' : 'financeiro.gerenciar')(req, res, next));

const uuid = z.string().uuid('id inválido');
const hexCor = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida.');
const dataOpt = z.string().trim().max(10).optional().nullable(); // 'YYYY-MM-DD'

async function getEmpresaId(req) {
  if (req._empresaId !== undefined) return req._empresaId;
  // Reusa o empresaId já carregado pela autorização (req._auth) — evita ida redundante ao banco.
  if (req._auth && req._auth.empresaId != null) { req._empresaId = req._auth.empresaId; return req._empresaId; }
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
    saldoOculto: !!r.saldo_oculto,
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
    parcelas: r.parcelas != null ? Number(r.parcelas) : null,
    emissao: r.dataemissao || null,
    vencimento: r.datavencimento || null,
    competencia: r.datacompetencia || null,
    criadoEm: r.created_at || null, // timestamp de criação (data/hora da operação)
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
    let { data: contas, error } = await req.supabase.from('financeiro-contas').select('*').order('created_at', { ascending: true });
    if (error) throw error;

    // Garante que toda empresa tenha a conta GERENCIAL (criada automaticamente, padrão do sistema).
    const temGerencial = (contas || []).some((c) => (c.descricao || '').trim().toUpperCase() === 'GERENCIAL');
    if (!temGerencial) {
      const empresaId = await getEmpresaId(req);
      if (empresaId) {
        const seed = { descricao: 'GERENCIAL', banco: 'Gerencial', 'agencia-digito': '0001', 'conta-digito': '0001', saldoinicial: 0, 'saldo-da-conta': 0, cor: '#3b82f6', gerencial: true, empresaid: empresaId };
        const { data: created } = await req.supabase.from('financeiro-contas').insert(seed).select('*').single();
        if (created) contas = [...(contas || []), created];
      }
    }

    // Saldo CALCULADO: saldo inicial + Σ entradas pagas − Σ saídas pagas (por conta).
    const { data: lanc } = await req.supabase.from('financeiro-entradas').select('conta,tipo,valor,pago');
    const delta = {};
    (lanc || []).forEach((l) => {
      if (!l.pago || !l.conta) return;
      const v = Number(l.valor) || 0;
      delta[l.conta] = (delta[l.conta] || 0) + (l.tipo === 'saida' ? -v : v);
    });

    const out = (contas || []).map((c) => {
      const m = mapConta(c);
      m.saldo = (Number(c.saldoinicial) || 0) + (delta[c.id] || 0);
      m.gerencialDefault = (c.descricao || '').trim().toUpperCase() === 'GERENCIAL'; // conta padrão do sistema
      return m;
    });
    out.sort((a, b) => (b.gerencialDefault ? 1 : 0) - (a.gerencialDefault ? 1 : 0)); // GERENCIAL sempre primeiro
    res.json({ contas: out });
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

// Visibilidade do saldo no cartão (olho aberto/fechado) — persiste por conta.
financeiroRouter.patch('/contas/:id/visibilidade', validateBody(z.object({ oculto: z.coerce.boolean() }).strip()), async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const { error } = await req.supabase.from('financeiro-contas').update({ saldo_oculto: req.body.oculto }).eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// nome do responsável = sempre o usuário autenticado (não confia no que vem do front).
function currentUserName(req) {
  return req.user?.user_metadata?.name || req.user?.email || 'Usuário';
}
// saldo calculado de UMA conta (saldo inicial + Σ pagos).
async function saldoDaConta(req, conta) {
  const { data: lanc } = await req.supabase.from('financeiro-entradas').select('tipo,valor,pago').eq('conta', conta.id);
  let saldo = Number(conta.saldoinicial) || 0;
  (lanc || []).forEach((l) => { if (l.pago) saldo += (l.tipo === 'saida' ? -1 : 1) * (Number(l.valor) || 0); });
  return saldo;
}
// cria um par de lançamentos de transferência (saída na origem + entrada no destino).
async function inserirTransferencia(req, { origemId, destId, valor, data, descricao }, empresaId) {
  const quem = currentUserName(req);
  const dt = data || null;
  const mk = (tipo, conta, label) => {
    const row = entradaToDb({ tipo, valor, contaId: conta, descricao: descricao || label, categoria: 'Transferência', responsavel: quem, pago: true, emissao: dt, vencimento: dt, competencia: dt }, empresaId);
    row.codigo = 'TRF-' + Math.floor(10000 + Math.random() * 90000);
    return row;
  };
  return req.supabase.from('financeiro-entradas').insert([
    mk('saida', origemId, 'Transferência enviada'),
    mk('entrada', destId, 'Transferência recebida'),
  ]);
}

// ----- TRANSFERÊNCIA entre contas do sistema -----
const transferSchema = z.object({
  origemId: uuid,
  destId: uuid,
  valor: z.coerce.number().positive('Informe um valor maior que zero.'),
  data: dataOpt,
  descricao: z.string().trim().max(200).optional().default(''),
}).strip();

financeiroRouter.post('/transferencias', validateBody(transferSchema), async (req, res, next) => {
  try {
    const { origemId, destId } = req.body;
    if (origemId === destId) return res.status(400).json({ error: 'Conta de origem e destino devem ser diferentes.' });
    const empresaId = await getEmpresaId(req);
    const { error } = await inserirTransferencia(req, req.body, empresaId);
    if (error) throw error;
    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
});

// ----- ENCERRAR conta (regra: havendo saldo, é obrigatório transferir antes) -----
const encerrarSchema = z.object({
  destId: uuid.optional().nullable(),
  data: dataOpt,
  motivo: z.string().trim().max(300).optional().default(''),
}).strip();

financeiroRouter.post('/contas/:id/encerrar', validateBody(encerrarSchema), async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const { destId, data } = req.body;

    const { data: conta } = await req.supabase.from('financeiro-contas').select('*').eq('id', id).single();
    if (!conta) return res.status(404).json({ error: 'Conta não encontrada.' });
    // A conta GERENCIAL (padrão do sistema) não pode ser encerrada.
    if ((conta.descricao || '').trim().toUpperCase() === 'GERENCIAL') {
      return res.status(400).json({ error: 'A conta GERENCIAL é a conta padrão do sistema e não pode ser encerrada.' });
    }

    const saldo = await saldoDaConta(req, conta);
    // Regra obrigatória: havendo saldo, precisa transferir para outra conta do sistema.
    if (Math.abs(saldo) > 0.005) {
      if (!destId) return res.status(400).json({ error: 'A conta possui saldo. Transfira o saldo para outra conta antes de encerrar.' });
      if (destId === id) return res.status(400).json({ error: 'A conta destino deve ser diferente da que está sendo encerrada.' });
      const empresaId = await getEmpresaId(req);
      // credita o saldo na conta destino (a conta encerrada e seus lançamentos serão removidos abaixo).
      const row = entradaToDb({
        tipo: saldo > 0 ? 'entrada' : 'saida', valor: Math.abs(saldo), contaId: destId,
        descricao: 'Saldo recebido de conta encerrada (' + (conta.descricao || '') + ')',
        categoria: 'Transferência', responsavel: currentUserName(req), pago: true,
        emissao: data || null, vencimento: data || null, competencia: data || null,
      }, empresaId);
      row.codigo = 'TRF-' + Math.floor(10000 + Math.random() * 90000);
      const { error: trErr } = await req.supabase.from('financeiro-entradas').insert(row);
      if (trErr) throw trErr;
    }

    // Remove os lançamentos da conta encerrada (evita violar a FK) e então a própria conta.
    await req.supabase.from('financeiro-entradas').delete().eq('conta', id);
    const { error } = await req.supabase.from('financeiro-contas').delete().eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// =========================== CATEGORIAS (de movimentação) ===========================
const DEFAULT_CATEGORIAS = [
  { nome: 'Aporte de Sócio', tipo: 'Financeira' },
  { nome: 'Receita Operacional', tipo: 'Financeira' },
  { nome: 'Venda de Produto', tipo: 'Produto' },
  { nome: 'Prestação de Serviço', tipo: 'Serviço' },
  { nome: 'Pagamento de Cliente', tipo: 'Cliente' },
];
const categoriaSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da categoria.').max(80),
  tipo: z.enum(['Financeira', 'Produto', 'Serviço', 'Cliente']).default('Financeira'),
}).strip();

financeiroRouter.get('/categorias', async (req, res, next) => {
  try {
    let { data, error } = await req.supabase.from('financeiro-categorias').select('*').order('created_at', { ascending: true });
    // Tabela ainda não criada (migration 0005 não aplicada) → devolve os padrões para o app seguir funcionando.
    if (error) return res.json({ categorias: DEFAULT_CATEGORIAS.map((c, i) => ({ id: 'default-' + i, ...c })), _fallback: true });
    // Auto-seed: primeira vez sem categorias → cria as 4 padrão.
    if (!data || data.length === 0) {
      const empresaId = await getEmpresaId(req);
      if (empresaId) {
        const seed = DEFAULT_CATEGORIAS.map((c) => ({ ...c, empresaid: empresaId }));
        const r = await req.supabase.from('financeiro-categorias').insert(seed).select('*');
        if (!r.error && r.data) data = r.data;
      }
    }
    res.json({ categorias: (data || []).map((c) => ({ id: c.id, nome: c.nome, tipo: c.tipo })) });
  } catch (err) { next(err); }
});
financeiroRouter.post('/categorias', validateBody(categoriaSchema), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const row = { nome: req.body.nome, tipo: req.body.tipo };
    if (empresaId) row.empresaid = empresaId;
    const { data, error } = await req.supabase.from('financeiro-categorias').insert(row).select('*').single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Já existe uma categoria com esse nome.' });
      throw error;
    }
    res.status(201).json({ categoria: { id: data.id, nome: data.nome, tipo: data.tipo } });
  } catch (err) { next(err); }
});
financeiroRouter.delete('/categorias/:id', async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const { error } = await req.supabase.from('financeiro-categorias').delete().eq('id', id);
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
  parcelas: z.coerce.number().int().min(1).optional().nullable(),
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
    parcelas: b.parcelas || null,
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
    if (req.query.conta) q = q.eq('conta', req.query.conta); // extrato de uma conta específica
    // lançamentos e nomes das contas são independentes -> em PARALELO (2 round-trips viram 1).
    const [{ data, error }, nomes] = await Promise.all([q, contaNomes(req)]);
    if (error) throw error;
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
      observacoes: 'observacoes', pago: 'pago', recorrente: 'recorrente', parcelas: 'parcelas',
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
