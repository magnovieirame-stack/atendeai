// catalogo.routes.js — MÓDULO COMERCIAL · CATÁLOGO (produtos/serviços).
//   Tabela: "catalogo-produtos". RLS ligado sem policies -> só o service_role
//   acessa. Usamos adminClient() e SEMPRE filtramos por empresa_id (tenant).
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requirePermissao } from '../lib/autorizacao.js';
import { validateBody } from '../middleware/validate.js';
import { adminClient } from '../lib/supabase.js';

export const catalogoRouter = Router();
catalogoRouter.use(requireAuth);
// Autorização por método (ver/criar/editar/excluir).
catalogoRouter.use((req, res, next) => {
  const m = { GET: 'catalogo.ver', POST: 'catalogo.criar', PATCH: 'catalogo.editar', PUT: 'catalogo.editar', DELETE: 'catalogo.excluir' };
  return requirePermissao(m[req.method] || 'catalogo.editar')(req, res, next);
});

const uuid = z.string().uuid('id inválido');
const db = () => adminClient();

async function getEmpresaId(req) {
  if (req._empresaId !== undefined) return req._empresaId;
  const { data } = await req.supabase.from('empresa_membros').select('empresa_id').limit(1);
  req._empresaId = data && data[0] ? data[0].empresa_id : null;
  return req._empresaId;
}

// ----- histórico (catalogo-movimentacoes) -----
function autorDe(req) {
  const u = req.user || {};
  const m = u.user_metadata || {};
  return m.nome || m.name || m.full_name || u.email || 'Sistema';
}

// Registra um evento no histórico. Nunca quebra a operação principal.
async function registrarMov(empresaId, produtoId, ev) {
  try {
    await db().from('catalogo-movimentacoes').insert({
      empresa_id: empresaId,
      produto_id: produtoId,
      tipo: ev.tipo,
      descricao: ev.descricao || null,
      autor: ev.autor || null,
      quantidade: ev.quantidade != null ? ev.quantidade : null,
      valor: ev.valor != null ? ev.valor : null,
    });
  } catch (e) { /* histórico é best-effort */ }
}

// Monta um resumo legível do que mudou entre o item antigo (a) e o novo (b).
function descreverMudancas(a, b) {
  const money = (v) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num = (v) => Number(v || 0);
  const parts = [];
  if ((a.nome || '') !== (b.nome || '')) parts.push(`Nome: "${a.nome || ''}" → "${b.nome || ''}"`);
  if ((a.categoria || '') !== (b.categoria || '')) parts.push(`Categoria: ${a.categoria || '—'} → ${b.categoria || '—'}`);
  if (num(a.preco) !== num(b.preco)) parts.push(`Preço: ${money(a.preco)} → ${money(b.preco)}`);
  if (num(a.preco_promo) !== num(b.preco_promo)) parts.push(`Preço promocional: ${money(a.preco_promo)} → ${money(b.preco_promo)}`);
  if (num(a.custo) !== num(b.custo)) parts.push(`Custo: ${money(a.custo)} → ${money(b.custo)}`);
  if ((a.unidade || '') !== (b.unidade || '')) parts.push(`Unidade: ${a.unidade || '—'} → ${b.unidade || '—'}`);
  if (num(a.estoque) !== num(b.estoque)) parts.push(`Estoque: ${num(a.estoque)} → ${num(b.estoque)}`);
  if (num(a.estoque_min) !== num(b.estoque_min)) parts.push(`Estoque mínimo: ${num(a.estoque_min)} → ${num(b.estoque_min)}`);
  if ((a.ativo !== false) !== (b.ativo !== false)) parts.push(`Ativo: ${a.ativo !== false ? 'sim' : 'não'} → ${b.ativo !== false ? 'sim' : 'não'}`);
  if ((a.controla_estoque !== false) !== (b.controla_estoque !== false)) parts.push(`Controla estoque: ${a.controla_estoque !== false ? 'sim' : 'não'} → ${b.controla_estoque !== false ? 'sim' : 'não'}`);
  if ((a.descricao_curta || '') !== (b.descricao_curta || '')) parts.push('Descrição curta atualizada');
  if ((a.descricao || '') !== (b.descricao || '')) parts.push('Descrição atualizada');
  if (JSON.stringify(a.tags || []) !== JSON.stringify(b.tags || [])) parts.push('Etiquetas atualizadas');
  if (JSON.stringify(a.extras || {}) !== JSON.stringify(b.extras || {})) parts.push('Dados de IA/variantes atualizados');
  return parts.join(' · ');
}

// ----- DB -> DTO (nomes que o frontend usa) -----
function mapProduto(r) {
  return {
    id: r.id,
    tipo: r.tipo || 'produto',
    nome: r.nome || '',
    sku: r.sku || '',
    categoria: r.categoria || '',
    descricaoCurta: r.descricao_curta || '',
    descricao: r.descricao || '',
    preco: r.preco != null ? Number(r.preco) : 0,
    precoPromo: r.preco_promo != null ? Number(r.preco_promo) : null,
    custo: r.custo != null ? Number(r.custo) : null,
    unidade: r.unidade || 'un',
    estoque: r.estoque != null ? Number(r.estoque) : 0,
    estoqueMin: r.estoque_min != null ? Number(r.estoque_min) : 0,
    ativo: r.ativo !== false,
    apareceCatalogo: r.aparece_catalogo !== false,
    controlaEstoque: r.controla_estoque !== false,
    duracao: r.duracao != null ? Number(r.duracao) : null,
    local: r.local || '',
    requerAgendamento: r.requer_agendamento !== false,
    tags: Array.isArray(r.tags) ? r.tags : [],
    extras: (r.extras && typeof r.extras === 'object') ? r.extras : {},
    criadoEm: r.created_at || null,
  };
}

// ----- validação do corpo (núcleo + tags + extras livre) -----
const produtoSchema = z.object({
  tipo: z.enum(['produto', 'servico']).optional().default('produto'),
  nome: z.string().trim().min(1, 'Informe o nome.').max(160),
  sku: z.string().trim().max(60).optional().default(''),
  categoria: z.string().trim().max(80).optional().default(''),
  descricaoCurta: z.string().trim().max(200).optional().default(''),
  descricao: z.string().trim().max(4000).optional().default(''),
  preco: z.coerce.number().min(0).optional().default(0),
  precoPromo: z.coerce.number().min(0).nullable().optional(),
  custo: z.coerce.number().min(0).nullable().optional(),
  unidade: z.string().trim().max(20).optional().default('un'),
  estoque: z.coerce.number().optional().default(0),
  estoqueMin: z.coerce.number().optional().default(0),
  ativo: z.coerce.boolean().optional().default(true),
  apareceCatalogo: z.coerce.boolean().optional().default(true),
  controlaEstoque: z.coerce.boolean().optional().default(true),
  duracao: z.coerce.number().int().nullable().optional(),
  local: z.string().trim().max(60).optional().default(''),
  requerAgendamento: z.coerce.boolean().optional().default(true),
  tags: z.array(z.string().max(60)).optional().default([]),
  extras: z.record(z.any()).optional().default({}),
}).strip();

// DTO -> colunas do banco
function produtoToDb(b, empresaId) {
  const row = {
    tipo: b.tipo || 'produto',
    nome: b.nome,
    sku: b.sku || null,
    categoria: b.categoria || null,
    descricao_curta: b.descricaoCurta || null,
    descricao: b.descricao || null,
    preco: b.preco || 0,
    preco_promo: b.precoPromo != null ? b.precoPromo : null,
    custo: b.custo != null ? b.custo : null,
    unidade: b.unidade || 'un',
    estoque: b.estoque || 0,
    estoque_min: b.estoqueMin || 0,
    ativo: b.ativo !== false,
    aparece_catalogo: b.apareceCatalogo !== false,
    controla_estoque: b.controlaEstoque !== false,
    duracao: b.duracao != null ? b.duracao : null,
    local: b.local || null,
    requer_agendamento: b.requerAgendamento !== false,
    tags: Array.isArray(b.tags) ? b.tags : [],
    extras: (b.extras && typeof b.extras === 'object') ? b.extras : {},
  };
  if (empresaId) row.empresa_id = empresaId;
  return row;
}

// GET /api/catalogo/produtos — lista todos da empresa
catalogoRouter.get('/produtos', async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    if (!empresaId) return res.json({ produtos: [] });
    const { data, error } = await db().from('catalogo-produtos').select('*')
      .eq('empresa_id', empresaId).order('created_at', { ascending: false });
    if (error) throw error;
    // Vendas reais por produto (unidades vendidas) — alimenta a coluna "Vendas".
    const vendido = {};
    const { data: vi } = await db().from('venda-itens').select('produto_id,quantidade').eq('empresa_id', empresaId);
    (vi || []).forEach((r) => { if (r.produto_id) vendido[r.produto_id] = (vendido[r.produto_id] || 0) + (Number(r.quantidade) || 0); });
    res.json({ produtos: (data || []).map((p) => ({ ...mapProduto(p), vendas: vendido[p.id] || 0 })) });
  } catch (err) { next(err); }
});

// POST /api/catalogo/produtos — cria
catalogoRouter.post('/produtos', validateBody(produtoSchema), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const { data, error } = await db().from('catalogo-produtos')
      .insert(produtoToDb(req.body, empresaId)).select('*').single();
    if (error) throw error;
    await registrarMov(empresaId, data.id, { tipo: 'cadastro', descricao: 'Item cadastrado no catálogo', autor: autorDe(req) });
    res.status(201).json({ produto: mapProduto(data) });
  } catch (err) { next(err); }
});

// PATCH /api/catalogo/produtos/:id — atualiza (parcial)
catalogoRouter.patch('/produtos/:id', validateBody(produtoSchema.partial()), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const id = uuid.parse(req.params.id);
    // Só envia ao banco as colunas dos campos realmente recebidos (patch parcial).
    const full = produtoToDb({ nome: req.body.nome || '', ...req.body }, null);
    const map = {
      tipo: 'tipo', nome: 'nome', sku: 'sku', categoria: 'categoria',
      descricaoCurta: 'descricao_curta', descricao: 'descricao',
      preco: 'preco', precoPromo: 'preco_promo', custo: 'custo',
      unidade: 'unidade', estoque: 'estoque', estoqueMin: 'estoque_min',
      ativo: 'ativo', apareceCatalogo: 'aparece_catalogo', controlaEstoque: 'controla_estoque',
      duracao: 'duracao', local: 'local', requerAgendamento: 'requer_agendamento',
      tags: 'tags', extras: 'extras',
    };
    const patch = {};
    Object.keys(req.body).forEach((k) => { if (map[k]) patch[map[k]] = full[map[k]]; });
    // Estado atual (para o diff do histórico).
    const { data: old } = await db().from('catalogo-produtos').select('*')
      .eq('id', id).eq('empresa_id', empresaId).single();
    if (Object.keys(patch).length === 0) {
      return res.json({ produto: old ? mapProduto(old) : null });
    }
    const { data, error } = await db().from('catalogo-produtos').update(patch)
      .eq('id', id).eq('empresa_id', empresaId).select('*').single();
    if (error) throw error;
    // Registra a edição no histórico (só se algo de fato mudou).
    if (old) {
      const desc = descreverMudancas(old, data);
      if (desc) await registrarMov(empresaId, id, { tipo: 'edicao', descricao: desc, autor: autorDe(req) });
    }
    res.json({ produto: mapProduto(data) });
  } catch (err) { next(err); }
});

// DELETE /api/catalogo/produtos/:id — remove
catalogoRouter.delete('/produtos/:id', async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const id = uuid.parse(req.params.id);
    const { error } = await db().from('catalogo-produtos').delete()
      .eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// GET /api/catalogo/produtos/:id/movimentacoes — histórico do item
catalogoRouter.get('/produtos/:id/movimentacoes', async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const id = uuid.parse(req.params.id);
    const { data, error } = await db().from('catalogo-movimentacoes').select('*')
      .eq('produto_id', id).eq('empresa_id', empresaId).order('created_at', { ascending: false });
    if (error) throw error;
    const eventos = (data || []).map((m) => ({
      id: m.id,
      tipo: m.tipo,
      descricao: m.descricao || '',
      autor: m.autor || '',
      quantidade: m.quantidade != null ? Number(m.quantidade) : null,
      valor: m.valor != null ? Number(m.valor) : null,
      criadoEm: m.created_at || null,
    }));
    // Produtos cadastrados antes do histórico existir não têm evento 'cadastro':
    // sintetiza um a partir do created_at do próprio produto, para a timeline
    // sempre mostrar a criação.
    if (!eventos.some((e) => e.tipo === 'cadastro')) {
      const { data: prod } = await db().from('catalogo-produtos').select('created_at')
        .eq('id', id).eq('empresa_id', empresaId).single();
      if (prod) {
        eventos.push({ id: 'cadastro-virtual', tipo: 'cadastro', descricao: 'Item cadastrado no catálogo', autor: '', quantidade: null, valor: null, criadoEm: prod.created_at || null });
      }
    }
    res.json({ movimentacoes: eventos });
  } catch (err) { next(err); }
});

// =========================== UNIDADES ===========================
// Unidades personalizadas por empresa (as padrão ficam no front).
const unidadeSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da unidade.').max(40),
  sigla: z.string().trim().min(1, 'Informe a sigla.').max(8),
}).strip();

// GET /api/catalogo/unidades — lista as unidades personalizadas da empresa
catalogoRouter.get('/unidades', async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    if (!empresaId) return res.json({ unidades: [] });
    const { data, error } = await db().from('catalogo-unidades').select('*')
      .eq('empresa_id', empresaId).order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ unidades: (data || []).map((u) => ({ id: u.id, nome: u.nome, sigla: u.sigla })) });
  } catch (err) { next(err); }
});

// POST /api/catalogo/unidades — cria uma unidade personalizada
catalogoRouter.post('/unidades', validateBody(unidadeSchema), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const row = { nome: req.body.nome, sigla: req.body.sigla.toUpperCase(), empresa_id: empresaId };
    const { data, error } = await db().from('catalogo-unidades').insert(row).select('*').single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Já existe uma unidade com essa sigla.' });
      throw error;
    }
    res.status(201).json({ unidade: { id: data.id, nome: data.nome, sigla: data.sigla } });
  } catch (err) { next(err); }
});

// DELETE /api/catalogo/unidades/:id — remove
catalogoRouter.delete('/unidades/:id', async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const id = uuid.parse(req.params.id);
    const { error } = await db().from('catalogo-unidades').delete()
      .eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});
