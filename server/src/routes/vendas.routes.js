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

export const vendasRouter = Router();
vendasRouter.use(requireAuth);
vendasRouter.use((req, res, next) =>
  requirePermissao(req.method === 'GET' ? 'vendas.ver' : 'vendas.criar')(req, res, next));

const uuid = z.string().uuid('id inválido');
const db = () => adminClient();

async function getEmpresaId(req) {
  if (req._empresaId !== undefined) return req._empresaId;
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

    const subtotal = b.itens.reduce((s, i) => s + i.preco * i.quantidade, 0);
    const desconto = Math.min(b.desconto || 0, subtotal);
    const total = Math.max(0, subtotal - desconto + (b.acrescimo || 0));
    const codigo = 'VND-' + Math.floor(10000 + Math.random() * 90000);

    // 1) cabeçalho da venda
    const { data: venda, error: vErr } = await db().from('vendas').insert({
      empresa_id: empresaId, codigo, cliente_id: b.clienteId || null, cliente_nome: b.clienteNome || null,
      vendedor: b.vendedor || null, subtotal, desconto, acrescimo: b.acrescimo || 0, total,
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
    for (const it of b.itens) {
      if (!it.produtoId) continue;
      try {
        const { data: prod } = await db().from('catalogo-produtos').select('estoque,controla_estoque,nome').eq('id', it.produtoId).eq('empresa_id', empresaId).single();
        if (prod && prod.controla_estoque !== false) {
          const novo = Math.max(0, (Number(prod.estoque) || 0) - it.quantidade);
          await db().from('catalogo-produtos').update({ estoque: novo }).eq('id', it.produtoId).eq('empresa_id', empresaId);
        }
        await db().from('catalogo-movimentacoes').insert({
          empresa_id: empresaId, produto_id: it.produtoId, tipo: 'venda',
          descricao: 'Venda ' + codigo + ' · ' + it.quantidade + '× ' + it.nome,
          autor, quantidade: it.quantidade, valor: it.preco * it.quantidade,
        });
      } catch (e) { /* histórico/estoque best-effort */ }
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
        valorsubtotal: subtotal, empresaid: empresaId,
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
    res.json({ vendas: (data || []).map((v) => mapVenda(v, [])) });
  } catch (err) { next(err); }
});
