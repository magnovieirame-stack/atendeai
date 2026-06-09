// vendas.routes.js — MÓDULO COMERCIAL · VENDAS (PDV).
//   Tabelas: "vendas" (cabeçalho) + "venda-itens" (linhas).
//   Ao fechar a venda (POST /vendas), de forma best-effort nos efeitos colaterais:
//     - baixa o estoque dos produtos e registra evento 'venda' no histórico
//     - gera a receita no Financeiro (financeiro-entradas)
//     - vira o cliente lead -> cliente
//   RLS ligado sem policies -> adminClient() + filtro por empresa_id.
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requirePermissao } from '../lib/autorizacao.js';
import { validateBody } from '../middleware/validate.js';
import { adminClient } from '../lib/supabase.js';
import { matrizId, resolveFilialId } from '../lib/filiais.js';

export const vendasRouter = Router();
vendasRouter.use(requireAuth);
vendasRouter.use((req, res, next) =>
  requirePermissao(req.method === 'GET' ? 'vendas.ver' : 'vendas.criar')(req, res, next));

const uuid = z.string().uuid('id inválido');
const db = () => adminClient();

async function getEmpresaId(req) {
  if (req._empresaId !== undefined) return req._empresaId;
  // Reusa o empresaId já carregado pela autorização (req._auth) — evita ida redundante ao banco.
  if (req._auth && req._auth.empresaId != null) { req._empresaId = req._auth.empresaId; return req._empresaId; }
  const { data } = await req.supabase.from('empresa_membros').select('empresa_id').limit(1);
  req._empresaId = data && data[0] ? data[0].empresa_id : null;
  return req._empresaId;
}

const METODO_LABEL = {
  dinheiro: 'Dinheiro', pix: 'PIX', debito: 'Cartão de Débito',
  credito: 'Cartão de Crédito', boleto: 'Boleto', carne: 'Carnê',
};

const vendaSchema = z.object({
  clienteId: uuid.nullable().optional(),
  clienteNome: z.string().trim().max(160).optional().default(''),
  vendedor: z.string().trim().max(120).optional().default(''),
  desconto: z.coerce.number().min(0).optional().default(0),
  acrescimo: z.coerce.number().min(0).optional().default(0),
  itens: z.array(z.object({
    produtoId: uuid.nullable().optional(),
    nome: z.string().trim().min(1).max(160),
    preco: z.coerce.number().min(0),
    quantidade: z.coerce.number().min(0.001),
  })).min(1, 'Adicione ao menos um item.'),
  pagamentos: z.array(z.object({
    metodo: z.string().trim().max(20),
    valor: z.coerce.number().min(0),
    parcelas: z.coerce.number().int().min(1).optional().default(1),
  })).optional().default([]),
}).strip();

function mapVenda(v, itens) {
  return {
    id: v.id, codigo: v.codigo, clienteId: v.cliente_id, clienteNome: v.cliente_nome || '',
    vendedor: v.vendedor || '', subtotal: Number(v.subtotal) || 0, desconto: Number(v.desconto) || 0,
    acrescimo: Number(v.acrescimo) || 0, total: Number(v.total) || 0,
    pagamentos: Array.isArray(v.pagamentos) ? v.pagamentos : [],
    status: v.status, criadoEm: v.created_at,
    itens: (itens || []).map((i) => ({ id: i.id, produtoId: i.produto_id, nome: i.nome, preco: Number(i.preco) || 0, quantidade: Number(i.quantidade) || 0, subtotal: Number(i.subtotal) || 0 })),
  };
}

// POST /api/vendas — fecha uma venda do PDV.
vendasRouter.post('/', validateBody(vendaSchema), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    if (!empresaId) return res.status(400).json({ error: 'Empresa não encontrada.' });
    const b = req.body;
    const filialId = await resolveFilialId(empresaId, b.filial_id); // default = Matriz

    // ── Pré-checagem de regras de negócio (gate do servidor) ──────────────
    // Itens com produtoId precisam EXISTIR neste tenant (isolamento), estar
    // ATIVOS e — quando controlam estoque — ter saldo suficiente NA FILIAL da
    // venda (estoque-filial; default Matriz). Roda ANTES de gravar. Itens
    // avulsos (sem produtoId) e serviço/"Livre" passam direto.
    const idsCarrinho = [...new Set(b.itens.filter((i) => i.produtoId).map((i) => i.produtoId))];
    const prodById = {};
    const estoqueByProd = {};
    const pedidoPorProduto = {};
    b.itens.forEach((i) => { if (i.produtoId) pedidoPorProduto[i.produtoId] = (pedidoPorProduto[i.produtoId] || 0) + (Number(i.quantidade) || 0); });
    if (idsCarrinho.length) {
      const { data: prods, error: pErr } = await db().from('catalogo-produtos')
        .select('id, nome, ativo, controla_estoque')
        .in('id', idsCarrinho).eq('empresa_id', empresaId); // isolamento por tenant
      if (pErr) throw pErr;
      (prods || []).forEach((p) => { prodById[p.id] = p; });
      // saldo da FILIAL da venda (estoque-filial), em UMA query
      if (filialId) {
        const { data: ef } = await db().from('estoque-filial').select('produto_id, estoque')
          .in('produto_id', idsCarrinho).eq('empresa_id', empresaId).eq('filial_id', filialId);
        (ef || []).forEach((r) => { estoqueByProd[r.produto_id] = Number(r.estoque) || 0; });
      }
      for (const i of b.itens) {
        if (!i.produtoId) continue;
        const p = prodById[i.produtoId];
        if (!p) return res.status(400).json({ error: `O item "${i.nome}" não foi encontrado no catálogo desta empresa.` });
        if (p.ativo === false) return res.status(400).json({ error: `O item "${p.nome}" está inativo e não pode ser vendido.` });
      }
      for (const pid of Object.keys(pedidoPorProduto)) {
        const p = prodById[pid];
        if (p && p.controla_estoque !== false && pedidoPorProduto[pid] > (estoqueByProd[pid] || 0)) {
          return res.status(400).json({ error: `Estoque insuficiente de "${p.nome}": pedido ${pedidoPorProduto[pid]}, disponível ${estoqueByProd[pid] || 0}.` });
        }
      }
    }

    const subtotal = b.itens.reduce((s, i) => s + i.preco * i.quantidade, 0);
    const desconto = Math.min(b.desconto || 0, subtotal);
    const total = Math.max(0, subtotal - desconto + (b.acrescimo || 0));

    // ── Cobertura do pagamento (gate do servidor) ──────────────────────────
    // A soma dos pagamentos precisa COBRIR o total (tolerância de 1 centavo).
    // Pagamento vazio rejeita. Carnê/boleto "a receber" é assunto do Financeiro,
    // NÃO muda o status da venda (continua 'concluida').
    const brl = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const pagos = (b.pagamentos || []).reduce((s, p) => s + (Number(p.valor) || 0), 0);
    if (!(b.pagamentos || []).length || pagos < total - 0.01) {
      return res.status(400).json({ error: `Pagamento de ${brl(pagos)} não cobre o total de ${brl(total)}.` });
    }

    const codigo = 'VND-' + Math.floor(10000 + Math.random() * 90000);

    // 1) cabeçalho da venda
    const { data: venda, error: vErr } = await db().from('vendas').insert({
      empresa_id: empresaId, codigo, cliente_id: b.clienteId || null, cliente_nome: b.clienteNome || null,
      vendedor: b.vendedor || null, vendedor_id: (req.user && req.user.id) || null, filial_id: filialId,
      subtotal, desconto, acrescimo: b.acrescimo || 0, total,
      pagamentos: b.pagamentos || [], status: 'concluida',
    }).select('*').single();
    if (vErr) throw vErr;

    // 2) itens
    const itensRows = b.itens.map((i) => ({
      empresa_id: empresaId, venda_id: venda.id, produto_id: i.produtoId || null,
      nome: i.nome, preco: i.preco, quantidade: i.quantidade, subtotal: i.preco * i.quantidade,
    }));
    const { data: itens } = await db().from('venda-itens').insert(itensRows).select('*');

    // 3) efeitos colaterais (best-effort: não derrubam a venda já gravada)
    const autor = b.vendedor || 'PDV';
    // baixa de estoque na FILIAL da venda (estoque-filial), por produto (agregado)
    if (filialId) {
      for (const pid of Object.keys(pedidoPorProduto)) {
        const p = prodById[pid];
        if (!p || p.controla_estoque === false) continue;
        try {
          const novo = Math.max(0, (estoqueByProd[pid] || 0) - pedidoPorProduto[pid]);
          await db().from('estoque-filial').upsert({ empresa_id: empresaId, produto_id: pid, filial_id: filialId, estoque: novo }, { onConflict: 'produto_id,filial_id' });
        } catch (e) { /* estoque best-effort */ }
      }
    }
    // histórico 'venda' por item (carimba a filial)
    for (const it of b.itens) {
      if (!it.produtoId) continue;
      try {
        await db().from('catalogo-movimentacoes').insert({
          empresa_id: empresaId, produto_id: it.produtoId, filial_id: filialId, tipo: 'venda',
          descricao: 'Venda ' + codigo + ' · ' + it.quantidade + '× ' + it.nome,
          autor, quantidade: it.quantidade, valor: it.preco * it.quantidade,
        });
      } catch (e) { /* histórico best-effort */ }
    }

    // 4) receita no Financeiro
    try {
      const hoje = new Date().toISOString().slice(0, 10);
      const pags = b.pagamentos || [];
      const formaLabel = pags.length > 1 ? 'Múltiplas formas'
        : (METODO_LABEL[(pags[0] && pags[0].metodo) || ''] || (pags[0] && pags[0].metodo) || '');
      const parc = (pags.find((p) => (p.parcelas || 1) > 1) || {}).parcelas || null;
      await db().from('financeiro-entradas').insert({
        tipo: 'entrada', descricao: 'Venda ' + codigo + ' (PDV)', valor: total,
        categoria: 'Venda de Produto', conta: null, 'forma-pagamento': formaLabel || null,
        responsavel: b.vendedor || null, 'cliente-origem': b.clienteNome || null,
        pago: true, recorrente: false, parcelas: parc,
        dataemissao: hoje, datavencimento: hoje, datacompetencia: hoje,
        valorsubtotal: subtotal, empresaid: empresaId, venda_id: venda.id, filial_id: filialId,
        codigo: 'RCB-' + Math.floor(10000 + Math.random() * 90000),
      });
    } catch (e) { /* financeiro best-effort */ }

    // 5) lead -> cliente (1ª compra vira cliente)
    if (b.clienteId) {
      try { await db().from('clientes').update({ estagio: 'cliente' }).eq('id', b.clienteId).eq('empresa_id', empresaId); } catch (e) {}
    }

    res.status(201).json({ venda: mapVenda(venda, itens) });
  } catch (err) { next(err); }
});

// GET /api/vendas — lista as vendas da empresa (relatório).
vendasRouter.get('/', async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    if (!empresaId) return res.json({ vendas: [] });
    const { data, error } = await db().from('vendas').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    // Itens de todas as vendas em UMA query, agrupados por venda_id.
    const ids = (data || []).map((v) => v.id);
    const itensByVenda = {};
    if (ids.length) {
      const { data: itens } = await db().from('venda-itens').select('*').in('venda_id', ids).eq('empresa_id', empresaId);
      (itens || []).forEach((i) => { (itensByVenda[i.venda_id] = itensByVenda[i.venda_id] || []).push(i); });
    }
    res.json({ vendas: (data || []).map((v) => mapVenda(v, itensByVenda[v.id] || [])) });
  } catch (err) { next(err); }
});

// PATCH /api/vendas/:id/cancelar — cancela a venda e estorna estoque + receita.
// Idempotente por FLIP CONDICIONAL: só vira se ainda estiver 'concluida'.
vendasRouter.patch('/:id/cancelar', async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    if (!empresaId) return res.status(400).json({ error: 'Empresa não encontrada.' });
    const id = uuid.parse(req.params.id);
    const motivo = (req.body && typeof req.body.motivo === 'string' && req.body.motivo.trim())
      ? req.body.motivo.trim().slice(0, 500) : null;

    // Flip condicional (isolamento por empresa_id + idempotência numa query só):
    // só atualiza se status='concluida'. 0 linhas => não achou ou já cancelada.
    const { data: flipped, error: fErr } = await db().from('vendas')
      .update({ status: 'cancelada', cancelada_em: new Date().toISOString(), cancelada_por: (req.user && req.user.id) || null, cancelamento_motivo: motivo })
      .eq('id', id).eq('empresa_id', empresaId).eq('status', 'concluida')
      .select('*');
    if (fErr) throw fErr;
    if (!flipped || !flipped.length) return res.status(409).json({ error: 'Venda não encontrada ou já cancelada.' });
    const venda = flipped[0];

    // Estorno (best-effort, só DEPOIS de ganhar o flip — nunca roda 2x).
    const { data: itens } = await db().from('venda-itens').select('*').eq('venda_id', id).eq('empresa_id', empresaId);
    const autor = venda.vendedor || 'Cancelamento';
    const filialId = venda.filial_id || await matrizId(empresaId); // filial da venda (default Matriz)
    for (const it of (itens || [])) {
      if (!it.produto_id) continue;
      try {
        const { data: prod } = await db().from('catalogo-produtos').select('controla_estoque,nome').eq('id', it.produto_id).eq('empresa_id', empresaId).single();
        if (prod && prod.controla_estoque !== false && filialId) {
          const { data: ef } = await db().from('estoque-filial').select('estoque').eq('empresa_id', empresaId).eq('produto_id', it.produto_id).eq('filial_id', filialId).maybeSingle();
          const novo = (ef ? Number(ef.estoque) || 0 : 0) + (Number(it.quantidade) || 0); // re-soma na filial
          await db().from('estoque-filial').upsert({ empresa_id: empresaId, produto_id: it.produto_id, filial_id: filialId, estoque: novo }, { onConflict: 'produto_id,filial_id' });
        }
        await db().from('catalogo-movimentacoes').insert({
          empresa_id: empresaId, produto_id: it.produto_id, filial_id: filialId, tipo: 'estorno',
          descricao: 'Estorno · cancelamento da venda ' + (venda.codigo || '') + ' · ' + (Number(it.quantidade) || 0) + '× ' + (it.nome || ''),
          autor, quantidade: it.quantidade, valor: it.subtotal,
        });
      } catch (e) { /* estoque/histórico best-effort */ }
    }
    // Estorna a receita ligada à venda (via venda_id — ligação limpa, sem texto).
    try { await db().from('financeiro-entradas').delete().eq('venda_id', id).eq('empresaid', empresaId); } catch (e) { /* best-effort */ }

    res.json({ venda: mapVenda(venda, itens || []) });
  } catch (err) { next(err); }
});
