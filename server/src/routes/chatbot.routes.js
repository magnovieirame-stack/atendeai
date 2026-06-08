// chatbot.routes.js — MÓDULO CHATBOT (tabelas chatbot-contatos e chatbot-mensagens).
//
// Todas as rotas exigem login (requireAuth) e usam req.supabase (cliente com o
// token do usuário) -> o RLS do Postgres garante que cada empresa só acessa os
// próprios dados. Nada aqui confia no que o frontend manda como "empresa".
//
// Regra de direção da mensagem (definida pelo cliente):
//   enviadopor VAZIO  -> mensagem do CLIENTE  (balão esquerda)
//   enviadopor c/ NOME -> mensagem da EMPRESA  (balão direita), grava nome do atendente
import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { requirePermissao } from '../lib/autorizacao.js';
import { validateBody } from '../middleware/validate.js';
import { adminClient } from '../lib/supabase.js';
import * as integ from '../lib/integracoes.js';
import * as ig from '../lib/instagram.js';
import * as fb from '../lib/facebook.js';
import * as wa from '../lib/whatsapp.js';

export const chatbotRouter = Router();
chatbotRouter.use(requireAuth);

// Autorização do chatbot. Mistura ficha de cliente (clientes.*) com atendimento.
//   - /clientes e /clientes/:id  -> clientes.ver/criar/editar/excluir
//   - GET geral                  -> atendimento.ver
//   - excluir tag/resposta, apagar contato, limpar conversa -> atendimento.gerenciar (admin)
//   - remover tag DO contato (reversível) e demais POST/PATCH -> atendimento.responder
function permChatbot(method, p) {
  // ficha do cliente: /clientes ou /clientes/:id (NÃO confundir com /clientes-contato)
  if (/\/clientes(\/[^/]+)?$/.test(p)) {
    if (method === 'GET') return 'clientes.ver';
    if (method === 'POST') return 'clientes.criar';
    if (method === 'PATCH') return 'clientes.editar';
    if (method === 'DELETE') return 'clientes.excluir';
  }
  if (method === 'GET') return 'atendimento.ver';
  if (method === 'DELETE') {
    if (/\/contatos\/[^/]+\/tags\/[^/]+$/.test(p)) return 'atendimento.responder'; // tirar tag do contato (reversível)
    if (/\/tags\/[^/]+$/.test(p)) return 'atendimento.gerenciar';                  // apagar tag compartilhada
    if (/\/respostas-rapidas\/[^/]+$/.test(p)) return 'atendimento.gerenciar';     // apagar resposta-rápida
    if (/\/contatos\/[^/]+\/mensagens$/.test(p)) return 'atendimento.gerenciar';   // limpar conversa
    if (/\/contatos\/[^/]+$/.test(p)) return 'atendimento.gerenciar';              // apagar contato inteiro
    return 'atendimento.gerenciar';
  }
  return 'atendimento.responder'; // enviar msg, abrir/encerrar/fixar/bloquear, criar/editar tag e resposta, atribuir tag, nova conversa
}
chatbotRouter.use((req, res, next) => requirePermissao(permChatbot(req.method, req.path))(req, res, next));

const BUCKET = 'arquivos';
const MAX_FILE = 25 * 1024 * 1024; // 25 MB
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE } });

const uuid = z.string().uuid('id inválido');

// Nome a gravar em "enviadopor" quando a empresa/atendente envia.
function nomeAtendente(user) {
  return user?.user_metadata?.name || user?.email || 'Atendente';
}

// Entrega a mensagem do atendente no canal externo (Instagram/Facebook/WhatsApp).
// O histórico continua salvo no banco do MESMO jeito; aqui só "espelhamos" o
// envio para a plataforma. Best-effort: se falhar (ex.: fora da janela de 24h),
// a mensagem fica gravada como NÃO entregue e devolvemos um aviso.
const CANAIS_EXTERNOS = new Set(['instagram', 'facebook', 'whatsapp']);
const NOME_CANAL = { instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp' };

async function entregarNoCanal(req, contatoId, { texto, midiaUrl, tipo, titulo }) {
  try {
    const { data: ct } = await req.supabase
      .from('chatbot-contatos').select('origemcontato,external_id').eq('id', contatoId).single();
    const canal = ct && ct.origemcontato;
    if (!ct || !CANAIS_EXTERNOS.has(canal) || !ct.external_id) return { tentou: false, entregue: true };

    const empresaId = await getEmpresaId(req);
    const tok = await integ.getActiveToken(empresaId, canal);
    if (!tok) return { tentou: true, entregue: false, erro: NOME_CANAL[canal] + ' não está conectado.' };

    if (canal === 'instagram') {
      if (midiaUrl) await ig.sendMedia({ token: tok.token, recipientId: ct.external_id, type: ({ imagem: 'image', video: 'video', audio: 'audio', arquivo: 'file' })[tipo] || 'file', url: midiaUrl });
      else await ig.sendText({ token: tok.token, recipientId: ct.external_id, text: texto });
    } else if (canal === 'facebook') {
      if (midiaUrl) await fb.sendMedia({ token: tok.token, recipientId: ct.external_id, type: ({ imagem: 'image', video: 'video', audio: 'audio', arquivo: 'file' })[tipo] || 'file', url: midiaUrl });
      else await fb.sendText({ token: tok.token, recipientId: ct.external_id, text: texto });
    } else if (canal === 'whatsapp') {
      // No WhatsApp, o phone_number_id é o external_id da integração; o destino é o external_id do contato.
      if (midiaUrl) await wa.sendMedia({ token: tok.token, phoneNumberId: tok.externalId, to: ct.external_id, type: ({ imagem: 'image', video: 'video', audio: 'audio', arquivo: 'document' })[tipo] || 'document', link: midiaUrl, filename: titulo });
      else await wa.sendText({ token: tok.token, phoneNumberId: tok.externalId, to: ct.external_id, text: texto });
    }
    return { tentou: true, entregue: true };
  } catch (e) {
    return { tentou: true, entregue: false, erro: e?.message || 'Falha ao enviar pelo canal.' };
  }
}

// Deriva o tipomidia a partir do mimetype do arquivo enviado.
function tipoDoMime(mime = '') {
  if (mime.startsWith('image/')) return 'imagem';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  return 'arquivo';
}

// DB -> DTO limpo (não expomos nomes de coluna crus pro frontend).
// O nome/foto/telefone "de verdade" vêm da tabela clientes (via cliente_id).
// Normaliza o tipo de mídia da última mensagem (p/ o frontend escolher o ícone).
function normMidia(tipo) {
  switch (tipo) {
    case 'imagem': return 'imagem';
    case 'audio': return 'audio';
    case 'video': return 'video';
    case 'arquivo': case 'docx': case 'xlsx': case 'pdf': return 'arquivo';
    default: return null;
  }
}
// Rótulo curto p/ o preview quando a última mensagem é mídia (sem texto).
function rotuloMidia(tipo) {
  switch (tipo) {
    case 'imagem': return 'Foto';
    case 'audio': return 'Áudio';
    case 'video': return 'Vídeo';
    case 'arquivo': return 'Arquivo';
    default: return '';
  }
}

function mapContato(r, cliente, tags, ultima) {
  const nomeContato = r.nome && r.nome !== 'null' ? r.nome : null;
  const nomeCliente = cliente && cliente.nome && cliente.nome !== 'null' ? cliente.nome : null;
  const um = ultima || null;
  const temTexto = !!(um && um.texto && um.texto !== 'null');
  const midiaTipo = (um && !temTexto) ? normMidia(um.tipomidia) : null;
  const preview = temTexto ? um.texto : (midiaTipo ? rotuloMidia(midiaTipo) : '');
  const porEmpresa = !!(um && um.enviadopor && String(um.enviadopor).trim()); // empresa enviou a última msg
  return {
    id: r.id,
    nome: nomeCliente || nomeContato || 'Contato sem nome',
    clienteId: r.cliente_id,
    foto: cliente ? cliente.fotolink || null : null,
    telefone: cliente ? cliente.telefone || null : null,
    email: cliente ? cliente.email || null : null,
    canal: r.origemcontato || 'whatsapp',
    ia: !(r.atendente && String(r.atendente).trim() && r.atendente !== 'null'), // sem atendente humano => conduzida pela IA
    status: r.statuschat || 'ativo',
    departamento: r.departamento || null,
    naoLidas: r.qtd_mensagem_nao_lida || 0,
    novaMensagem: !!r.nova_mensagem,
    fixado: !!r.fixado,
    ultimaMsg: r.ultimamsg || null,
    // preview da última mensagem (estilo WhatsApp)
    ultimaMensagem: preview,
    ultimaMidiaTipo: midiaTipo,                        // imagem|audio|video|arquivo|null
    ultimaPorEmpresa: porEmpresa,
    ultimaEntregue: um ? um.entregue !== false : true, // coluna opcional; ausente => entregue
    tags: tags || [],
  };
}

// Tag padrão por tipo de contato (Cliente/Lead) — todo contato exibe ao menos uma (igual ao CRM).
const CONTATO_TIPO_TAG = {
  cliente: { id: 'auto-cliente', nome: 'Cliente', cor: '#16A34A' },
  lead: { id: 'auto-lead', nome: 'Lead', cor: '#3B82F6' },
};
const normNome = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const soDigitos = (s) => (s || '').replace(/\D/g, '');

// Garante a tag Cliente/Lead no contato (nível de exibição; não grava no banco).
function ensureTipoTag(tags, isLead) {
  const arr = Array.isArray(tags) ? tags : [];
  const jaTem = arr.some((t) => { const n = (t.nome || '').toLowerCase(); return n === 'cliente' || n === 'lead'; });
  if (jaTem) return arr;
  return [isLead ? CONTATO_TIPO_TAG.lead : CONTATO_TIPO_TAG.cliente, ...arr];
}

function mapMensagem(r) {
  const deCliente = !r.enviadopor || r.enviadopor.trim() === '';
  return {
    id: r.id,
    criadoEm: r.created_at,
    deCliente,                       // true = cliente (esquerda), false = empresa (direita)
    enviadopor: r.enviadopor || null,
    tipo: r.tipomidia || 'texto',    // texto | imagem | audio | video | arquivo | docx | xlsx ...
    texto: r.texto || null,
    midiaUrl: r.linkmidia || null,
    titulo: r.titulomidia || null,
    formato: r.formato || null,
    tamanho: r.tamanho || null,
    paginas: r.qtdpaginas || null,
    apagado: !!r['apagado-pra-todos'],
  };
}

// ---- GET /api/chatbot/contatos --------------------------------------------
// Enriquece cada contato com dados do cliente (nome/foto/telefone) e suas tags.
// Faz poucas queries (in-list) em vez de uma por contato (evita N+1).
chatbotRouter.get('/contatos', async (req, res, next) => {
  try {
    const { data: contatos, error } = await req.supabase
      .from('chatbot-contatos')
      .select('id,nome,cliente_id,origemcontato,statuschat,departamento,qtd_mensagem_nao_lida,nova_mensagem,fixado,ultimamsg,atendente')
      .order('ultimamsg', { ascending: false, nullsFirst: false });
    if (error) throw error;
    const rows = contatos || [];
    const clienteIds = [...new Set(rows.map((r) => r.cliente_id).filter(Boolean))];
    const contatoIds = rows.map((r) => r.id);

    // clientes e tags são independentes entre si -> buscamos em PARALELO (corta 1 round-trip).
    const [clientesById, tagsByContato, leadKeys, ultimaMsgByContato] = await Promise.all([
      // 1) clientes (nome/foto/telefone/email)
      (async () => {
        const map = {};
        if (clienteIds.length) {
          const { data: cls } = await req.supabase.from('clientes').select('id,nome,fotolink,telefone,email').in('id', clienteIds);
          (cls || []).forEach((c) => { map[c.id] = c; });
        }
        return map;
      })(),
      // 2) tags de cada contato (tags-contatos -> tags). q4 depende de q3, então fica encadeado aqui dentro.
      (async () => {
        const map = {};
        if (!contatoIds.length) return map;
        const { data: rel } = await req.supabase.from('tags-contatos').select('tagid,contatoid').in('contatoid', contatoIds);
        const tagIds = [...new Set((rel || []).map((x) => x.tagid).filter(Boolean))];
        const tagsById = {};
        if (tagIds.length) {
          const { data: tgs } = await req.supabase.from('tags').select('id,nome,cor').in('id', tagIds);
          (tgs || []).forEach((t) => { tagsById[t.id] = t; });
        }
        (rel || []).forEach((x) => {
          const t = tagsById[x.tagid];
          if (!t) return;
          (map[x.contatoid] = map[x.contatoid] || []).push({ id: t.id, nome: t.nome, cor: t.cor });
        });
        return map;
      })(),
      // 3) chaves dos leads (nome/telefone) p/ detectar se o contato é Lead (como no CRM).
      (async () => {
        const keys = new Set();
        try {
          const { data: mem } = await req.supabase.from('empresa_membros').select('empresa_id').limit(1);
          const empresaId = mem && mem[0] ? mem[0].empresa_id : null;
          if (empresaId) {
            const { data: leads } = await adminClient().from('leads').select('nome,telefone').eq('empresa_id', empresaId);
            (leads || []).forEach((l) => { if (l.nome) keys.add('n:' + normNome(l.nome)); const d = soDigitos(l.telefone); if (d) keys.add('p:' + d); });
          }
        } catch (e) { /* best-effort: na dúvida, trata como cliente */ }
        return keys;
      })(),
      // 4) última mensagem de cada contato (texto + quem enviou + entrega) p/ o preview.
      (async () => {
        const map = {};
        if (!contatoIds.length) return map;
        // select('*') p/ ser resiliente caso a coluna 'entregue' ainda não exista.
        const { data: msgs } = await req.supabase
          .from('chatbot-mensagens')
          .select('*')
          .in('contato', contatoIds)
          .order('created_at', { ascending: false })
          .limit(1000);
        (msgs || []).forEach((m) => { if (!map[m.contato]) map[m.contato] = m; }); // 1ª = mais recente
        return map;
      })(),
    ]);

    res.json({ contatos: rows.map((r) => {
      const cli = clientesById[r.cliente_id];
      // Sem tag forçada: o contato exibe apenas as tags realmente atribuídas.
      // (contato novo entra sem tag; o "Cliente"/"Lead" automático foi removido)
      return mapContato(r, cli, tagsByContato[r.id] || [], ultimaMsgByContato[r.id]);
    }) });
  } catch (err) { next(err); }
});

// ---- GET /api/chatbot/contatos/:id/mensagens ------------------------------
chatbotRouter.get('/contatos/:id/mensagens', async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const { data, error } = await req.supabase
      .from('chatbot-mensagens')
      .select('*')
      .eq('contato', id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ mensagens: (data || []).map(mapMensagem) });
  } catch (err) { next(err); }
});

// ---- POST /api/chatbot/contatos/:id/mensagens (texto) ---------------------
const textoSchema = z.object({ texto: z.string().trim().min(1, 'Mensagem vazia.').max(4000) }).strip();

chatbotRouter.post('/contatos/:id/mensagens', validateBody(textoSchema), async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    // A policy de INSERT (with check) já garante que o contato é da empresa do
    // usuário; se não for, o insert falha. Gravamos o nome -> lado da empresa.
    const { data, error } = await req.supabase
      .from('chatbot-mensagens')
      .insert({ contato: id, tipomidia: 'texto', texto: req.body.texto, enviadopor: nomeAtendente(req.user) })
      .select('*')
      .single();
    if (error) throw error;
    // espelha o envio no canal externo (Instagram), se for o caso
    const ent = await entregarNoCanal(req, id, { texto: req.body.texto });
    if (ent.tentou && !ent.entregue) {
      await req.supabase.from('chatbot-mensagens').update({ entregue: false }).eq('id', data.id);
      data.entregue = false;
    }
    // marca o horário da última mensagem no contato (best-effort)
    await req.supabase.from('chatbot-contatos').update({ ultimamsg: new Date().toISOString() }).eq('id', id);
    res.status(201).json({ mensagem: mapMensagem(data), aviso: (ent.tentou && !ent.entregue) ? ent.erro : undefined });
  } catch (err) { next(err); }
});

// ======================= FASE 2: ficha / tags / respostas =======================

// ---- Respostas rápidas (por empresa) ----
const respostaSchema = z.object({
  comando: z.string().trim().min(1, 'Informe o atalho.').max(60),
  mensagem: z.string().trim().min(1, 'Informe a mensagem.').max(4000),
}).strip();

chatbotRouter.get('/respostas-rapidas', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.from('respostasrapidas').select('id,comando,mensagem').order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ respostas: data || [] });
  } catch (err) { next(err); }
});
chatbotRouter.post('/respostas-rapidas', validateBody(respostaSchema), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const { data, error } = await req.supabase.from('respostasrapidas')
      .insert({ comando: req.body.comando, mensagem: req.body.mensagem, empresaid: empresaId })
      .select('id,comando,mensagem').single();
    if (error) throw error;
    res.status(201).json({ resposta: data });
  } catch (err) { next(err); }
});
chatbotRouter.patch('/respostas-rapidas/:id', validateBody(respostaSchema), async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const { data, error } = await req.supabase.from('respostasrapidas')
      .update({ comando: req.body.comando, mensagem: req.body.mensagem }).eq('id', id)
      .select('id,comando,mensagem').single();
    if (error) throw error;
    res.json({ resposta: data });
  } catch (err) { next(err); }
});
chatbotRouter.delete('/respostas-rapidas/:id', async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const { error } = await req.supabase.from('respostasrapidas').delete().eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ---- Tags (por empresa) ----
const tagSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome.').max(40),
  cor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida.').default('#3b82f6'),
}).strip();

chatbotRouter.get('/tags', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.from('tags').select('id,nome,cor').order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ tags: data || [] });
  } catch (err) { next(err); }
});
chatbotRouter.post('/tags', validateBody(tagSchema), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const { data, error } = await req.supabase.from('tags')
      .insert({ nome: req.body.nome, cor: req.body.cor, empresaid: empresaId })
      .select('id,nome,cor').single();
    if (error) throw error;
    res.status(201).json({ tag: data });
  } catch (err) { next(err); }
});
chatbotRouter.patch('/tags/:id', validateBody(tagSchema), async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const { data, error } = await req.supabase.from('tags').update({ nome: req.body.nome, cor: req.body.cor }).eq('id', id).select('id,nome,cor').single();
    if (error) throw error;
    res.json({ tag: data });
  } catch (err) { next(err); }
});
chatbotRouter.delete('/tags/:id', async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    await req.supabase.from('tags-contatos').delete().eq('tagid', id); // remove vínculos
    const { error } = await req.supabase.from('tags').delete().eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ---- Tags de um contato (vincular / desvincular) ----
chatbotRouter.post('/contatos/:id/tags', async (req, res, next) => {
  try {
    const contatoId = uuid.parse(req.params.id);
    let tagId = req.body && req.body.tagId;
    // se veio nome (sem tagId), cria a tag primeiro
    if (!tagId && req.body && req.body.nome) {
      const empresaId = await getEmpresaId(req);
      const cor = /^#[0-9a-fA-F]{6}$/.test(req.body.cor || '') ? req.body.cor : '#3b82f6';
      const { data: nt, error: te } = await req.supabase.from('tags')
        .insert({ nome: String(req.body.nome).slice(0, 40), cor, empresaid: empresaId }).select('id,nome,cor').single();
      if (te) throw te;
      tagId = nt.id;
    }
    if (!tagId) return res.status(400).json({ error: 'Informe tagId ou nome da tag.' });
    const { error } = await req.supabase.from('tags-contatos').insert({ tagid: tagId, contatoid: contatoId });
    if (error && !/duplicate|unique/i.test(error.message)) throw error;
    res.status(201).json({ ok: true, tagId });
  } catch (err) { next(err); }
});
chatbotRouter.delete('/contatos/:id/tags/:tagId', async (req, res, next) => {
  try {
    const contatoId = uuid.parse(req.params.id);
    const tagId = uuid.parse(req.params.tagId);
    const { error } = await req.supabase.from('tags-contatos').delete().eq('contatoid', contatoId).eq('tagid', tagId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ---- Cliente (ficha) ----
chatbotRouter.get('/clientes/:id', async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const { data, error } = await req.supabase.from('clientes').select('*').eq('id', id).single();
    if (error) throw error;
    const empresaId = await getEmpresaId(req);
    let orders = 0, ltv = 0, ultimaCompra = null;
    if (empresaId) {
      const { data: vs } = await adminClient().from('vendas').select('total,created_at').eq('empresa_id', empresaId).eq('cliente_id', id);
      (vs || []).forEach((v) => { orders += 1; ltv += Number(v.total) || 0; if (!ultimaCompra || v.created_at > ultimaCompra) ultimaCompra = v.created_at; });
    }
    res.json({ cliente: { ...mapCliente(data), orders, ltv, ultimaCompra } });
  } catch (err) { next(err); }
});
// Schema da ficha (chaves = NOMES DE COLUNA do banco, p/ continuar compatível
// com a ficha do chat, que já envia patches assim). Leitura volta camelCase.
const clienteSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome.').max(120),
  telefone: z.string().trim().max(40).nullable().optional(),
  email: z.string().trim().max(120).nullable().optional(),
  empresa: z.string().trim().max(120).nullable().optional(),
  cargo: z.string().trim().max(80).nullable().optional(),
  produtointeresse: z.string().trim().max(160).nullable().optional(),
  origemlead: z.string().trim().max(60).nullable().optional(),
  tipo_pessoa: z.enum(['pf', 'pj']).nullable().optional(),
  cpf: z.string().trim().max(20).nullable().optional(),
  cnpj: z.string().trim().max(20).nullable().optional(),
  rg: z.string().trim().max(20).nullable().optional(),
  razao_social: z.string().trim().max(160).nullable().optional(),
  nome_fantasia: z.string().trim().max(160).nullable().optional(),
  inscricao_estadual: z.string().trim().max(40).nullable().optional(),
  responsavel_nome: z.string().trim().max(120).nullable().optional(),
  responsavel_cargo: z.string().trim().max(60).nullable().optional(),
  responsavel_cpf: z.string().trim().max(20).nullable().optional(),
  responsavel_email: z.string().trim().max(120).nullable().optional(),
  responsavel_telefone: z.string().trim().max(40).nullable().optional(),
  cep: z.string().trim().max(12).nullable().optional(),
  logradouro: z.string().trim().max(160).nullable().optional(),
  numero: z.string().trim().max(20).nullable().optional(),
  complemento: z.string().trim().max(80).nullable().optional(),
  bairro: z.string().trim().max(80).nullable().optional(),
  cidade: z.string().trim().max(80).nullable().optional(),
  uf: z.string().trim().max(2).nullable().optional(),
  site: z.string().trim().max(120).nullable().optional(),
  segmento: z.string().trim().max(20).nullable().optional(),
  atendente: z.string().trim().max(120).nullable().optional(),
  ativo: z.coerce.boolean().optional(),
  observacoes: z.string().trim().max(2000).nullable().optional(),
  aniversario: z.string().trim().max(10).nullable().optional(),
  estagio: z.enum(['lead', 'cliente']).optional(),
  extras: z.record(z.any()).optional(),
}).strip();
const clientePatchSchema = clienteSchema.partial();

// POST /api/chatbot/clientes — cria um cliente "puro" (sem abrir conversa no chat).
chatbotRouter.post('/clientes', validateBody(clienteSchema), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const row = { ...req.body, empresa_id: empresaId, temcontato: false };
    const { data, error } = await req.supabase.from('clientes').insert(row).select('*').single();
    if (error) throw error;
    res.status(201).json({ cliente: mapCliente(data) });
  } catch (err) { next(err); }
});

chatbotRouter.patch('/clientes/:id', validateBody(clientePatchSchema), async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const { data, error } = await req.supabase.from('clientes').update(req.body).eq('id', id).select('*').single();
    if (error) throw error;
    res.json({ cliente: mapCliente(data) });
  } catch (err) { next(err); }
});

// DELETE /api/chatbot/clientes/:id — remove o cliente (se não tiver vínculos).
chatbotRouter.delete('/clientes/:id', async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const { error } = await req.supabase.from('clientes').delete().eq('id', id);
    if (error) {
      if (error.code === '23503') return res.status(409).json({ error: 'Cliente possui conversa ou registros vinculados e não pode ser excluído.' });
      throw error;
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ---- Mídias da conversa (fotos/vídeos/documentos) ----
chatbotRouter.get('/contatos/:id/midias', async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const { data, error } = await req.supabase.from('chatbot-mensagens').select('*')
      .eq('contato', id).neq('tipomidia', 'texto').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ midias: (data || []).map(mapMensagem) });
  } catch (err) { next(err); }
});

// ======================= FASE 3: contatos / nova conversa =======================

// ---- PATCH /api/chatbot/contatos/:id  { statuschat }  (encerrar / retomar) ----
const statusSchema = z.object({ statuschat: z.enum(['ativo', 'finalizado']) }).strip();
chatbotRouter.patch('/contatos/:id', validateBody(statusSchema), async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const { data, error } = await req.supabase.from('chatbot-contatos')
      .update({ statuschat: req.body.statuschat }).eq('id', id).select('id,statuschat').single();
    if (error) throw error;
    res.json({ contato: { id: data.id, status: data.statuschat } });
  } catch (err) { next(err); }
});

// ---- PATCH /api/chatbot/contatos/:id/fixar { fixado }  (fixar/desafixar) ----
const fixarSchema = z.object({ fixado: z.coerce.boolean() }).strip();
chatbotRouter.patch('/contatos/:id/fixar', validateBody(fixarSchema), async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const { data, error } = await req.supabase.from('chatbot-contatos')
      .update({ fixado: req.body.fixado }).eq('id', id).select('id,fixado').single();
    if (error) throw error;
    res.json({ contato: { id: data.id, fixado: !!data.fixado } });
  } catch (err) { next(err); }
});

// ---- PATCH /api/chatbot/contatos/:id/bloquear { bloquear }  (bloquear/desbloquear) ----
const bloquearSchema = z.object({ bloquear: z.coerce.boolean() }).strip();
chatbotRouter.patch('/contatos/:id/bloquear', validateBody(bloquearSchema), async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const { data, error } = await req.supabase.from('chatbot-contatos')
      .update({ statuschat: req.body.bloquear ? 'bloqueado' : 'ativo' }).eq('id', id).select('id,statuschat').single();
    if (error) throw error;
    res.json({ contato: { id: data.id, status: data.statuschat } });
  } catch (err) { next(err); }
});

// ---- DELETE /api/chatbot/contatos/:id/mensagens  (limpar: apaga as mensagens, mantém a conversa) ----
chatbotRouter.delete('/contatos/:id/mensagens', async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const empresaId = await getEmpresaId(req);
    const { data: ct } = await adminClient().from('chatbot-contatos').select('id,empresa_id').eq('id', id).single();
    if (!ct || (empresaId && ct.empresa_id !== empresaId)) return res.status(404).json({ error: 'Conversa não encontrada.' });
    await adminClient().from('chatbot-mensagens').delete().eq('contato', id);
    await adminClient().from('chatbot-contatos').update({ ultimamsg: null, qtd_mensagem_nao_lida: 0 }).eq('id', id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ---- DELETE /api/chatbot/contatos/:id  (apagar: remove a conversa, mensagens e vínculos de tag) ----
chatbotRouter.delete('/contatos/:id', async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const empresaId = await getEmpresaId(req);
    const { data: ct } = await adminClient().from('chatbot-contatos').select('id,empresa_id').eq('id', id).single();
    if (!ct || (empresaId && ct.empresa_id !== empresaId)) return res.status(404).json({ error: 'Conversa não encontrada.' });
    await adminClient().from('chatbot-mensagens').delete().eq('contato', id);
    await adminClient().from('tags-contatos').delete().eq('contatoid', id);
    await adminClient().from('chatbot-contatos').delete().eq('id', id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ---- GET /api/chatbot/clientes?q= (buscar clientes da empresa) ----
chatbotRouter.get('/clientes', async (req, res, next) => {
  try {
    // sanitiza q: remove caracteres com significado na sintaxe de filtro do PostgREST
    const q = (req.query.q || '').toString().replace(/[,()*\\%]/g, '').trim().slice(0, 60);
    let query = req.supabase.from('clientes').select('*').order('nome', { ascending: true }).limit(500);
    if (q) query = query.or(`nome.ilike.%${q}%,telefone.ilike.%${q}%`);
    const { data, error } = await query;
    if (error) throw error;
    const empresaId = await getEmpresaId(req);
    const kpis = await vendasKpiPorCliente(empresaId);
    res.json({ clientes: (data || []).map((c) => { const k = kpis[c.id] || {}; return { ...mapCliente(c), orders: k.orders || 0, ltv: k.ltv || 0, ultimaCompra: k.ultima || null }; }) });
  } catch (err) { next(err); }
});

// ---- POST /api/chatbot/contatos { clienteId }  (abre ou cria contato p/ um cliente) ----
const abrirContatoSchema = z.object({ clienteId: z.string().uuid('clienteId inválido') }).strip();
chatbotRouter.post('/contatos', validateBody(abrirContatoSchema), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const clienteId = req.body.clienteId;
    // confirma que o cliente é da empresa (RLS): senão vem null
    const { data: cli } = await req.supabase.from('clientes').select('id,nome,fotolink,telefone,email').eq('id', clienteId).single();
    if (!cli) return res.status(403).json({ error: 'Cliente não encontrado ou sem permissão.' });
    // já existe contato para esse cliente?
    const { data: existentes } = await req.supabase.from('chatbot-contatos').select('*').eq('cliente_id', clienteId).limit(1);
    let contato = existentes && existentes[0];
    if (!contato) {
      const ins = await req.supabase.from('chatbot-contatos')
        .insert({ empresa_id: empresaId, cliente_id: clienteId, nome: cli.nome, statuschat: 'ativo', origemcontato: 'whatsapp' })
        .select('*').single();
      if (ins.error) throw ins.error;
      contato = ins.data;
      await req.supabase.from('clientes').update({ temcontato: true }).eq('id', clienteId);
    }
    res.status(201).json({ contato: mapContato(contato, cli, []) });
  } catch (err) { next(err); }
});

// ---- POST /api/chatbot/clientes-contato { nome, telefone, canal }  (nova conversa: cria cliente + contato) ----
const novaConversaSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome.').max(120),
  telefone: z.string().trim().max(40).optional().default(''),
  canal: z.string().trim().max(20).optional().default('whatsapp'),
}).strip();
chatbotRouter.post('/clientes-contato', validateBody(novaConversaSchema), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const { nome, telefone, canal } = req.body;
    const cliIns = await req.supabase.from('clientes')
      .insert({ nome, telefone, empresa_id: empresaId, temcontato: true })
      .select('id,nome,fotolink,telefone,email').single();
    if (cliIns.error) throw cliIns.error;
    const cli = cliIns.data;
    const ctIns = await req.supabase.from('chatbot-contatos')
      .insert({ empresa_id: empresaId, cliente_id: cli.id, nome, statuschat: 'ativo', origemcontato: canal })
      .select('*').single();
    if (ctIns.error) throw ctIns.error;
    res.status(201).json({ contato: mapContato(ctIns.data, cli, []) });
  } catch (err) { next(err); }
});

// ---- POST /api/chatbot/contatos/:id/midia (imagem/audio/video/arquivo) ---- — necessária em inserts que
// gravam a coluna de empresa (a policy with_check exige que seja a do usuário).
async function getEmpresaId(req) {
  if (req._empresaId !== undefined) return req._empresaId;
  const { data } = await req.supabase.from('empresa_membros').select('empresa_id').limit(1);
  req._empresaId = data && data[0] ? data[0].empresa_id : null;
  return req._empresaId;
}

function mapCliente(c) {
  if (!c) return null;
  return {
    id: c.id, nome: c.nome, telefone: c.telefone, email: c.email, valor: c.valor,
    foto: c.fotolink || null, empresa: c.empresa || null, cargo: c.cargo || null,
    produtoInteresse: c.produtointeresse || null, valorNegocio: c.valordonegocio || null,
    origemLead: c.origemlead || null, criadoEm: c.created_at,
    // ficha cadastral completa (0016)
    tipoPessoa: c.tipo_pessoa || 'pf',
    cpf: c.cpf || null, cnpj: c.cnpj || null, rg: c.rg || null,
    razaoSocial: c.razao_social || null, nomeFantasia: c.nome_fantasia || null,
    inscricaoEstadual: c.inscricao_estadual || null,
    responsavelNome: c.responsavel_nome || null, responsavelCargo: c.responsavel_cargo || null,
    responsavelCpf: c.responsavel_cpf || null, responsavelEmail: c.responsavel_email || null,
    responsavelTelefone: c.responsavel_telefone || null,
    cep: c.cep || null, logradouro: c.logradouro || null, numero: c.numero || null,
    complemento: c.complemento || null, bairro: c.bairro || null, cidade: c.cidade || null, uf: c.uf || null,
    site: c.site || null, segmento: c.segmento || null, atendente: c.atendente || null,
    ativo: c.ativo !== false, observacoes: c.observacoes || null, aniversario: c.aniversario || null,
    estagio: c.estagio || 'lead',
    extras: (c.extras && typeof c.extras === 'object') ? c.extras : {},
  };
}

// KPIs de compras por cliente (a partir das vendas do PDV). adminClient pois
// a tabela vendas tem RLS sem policies (só o service_role lê).
async function vendasKpiPorCliente(empresaId) {
  const map = {};
  if (!empresaId) return map;
  const { data } = await adminClient().from('vendas').select('cliente_id,total,created_at').eq('empresa_id', empresaId);
  (data || []).forEach((v) => {
    if (!v.cliente_id) return;
    const m = map[v.cliente_id] || (map[v.cliente_id] = { orders: 0, ltv: 0, ultima: null });
    m.orders += 1; m.ltv += Number(v.total) || 0;
    if (!m.ultima || (v.created_at && v.created_at > m.ultima)) m.ultima = v.created_at;
  });
  return map;
}

// ---- POST /api/chatbot/contatos/:id/midia (imagem/audio/video/arquivo) ----
chatbotRouter.post('/contatos/:id/midia', upload.single('arquivo'), async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    // 1) Confirma que o contato é da empresa do usuário (RLS): se não for, vem null.
    const { data: contato, error: cErr } = await req.supabase
      .from('chatbot-contatos').select('id,empresa_id').eq('id', id).single();
    if (cErr || !contato) return res.status(403).json({ error: 'Contato não encontrado ou sem permissão.' });

    // 2) Sobe o arquivo pro Storage (bucket público "arquivos"), caminho com empresa_id.
    const orig = req.file.originalname || 'arquivo';
    const dot = orig.lastIndexOf('.');
    const ext = dot > -1 ? orig.slice(dot + 1).toLowerCase() : 'bin';
    const baseSafe = orig.replace(/[^\w.\-]+/g, '_').slice(0, 60);
    const rand = req.file.size.toString(36) + '-' + id.slice(0, 8);
    const path = `${contato.empresa_id}/${rand}-${baseSafe}`;

    const storage = adminClient().storage.from(BUCKET);
    const up = await storage.upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
    if (up.error) throw up.error;
    const publicUrl = storage.getPublicUrl(path).data.publicUrl;

    // 3) Grava a mensagem de mídia.
    const tipo = tipoDoMime(req.file.mimetype);
    const { data, error } = await req.supabase
      .from('chatbot-mensagens')
      .insert({
        contato: id, tipomidia: tipo, linkmidia: publicUrl,
        titulomidia: orig, formato: ext.toUpperCase(), tamanho: req.file.size, qtdpaginas: 1,
        enviadopor: nomeAtendente(req.user),
      })
      .select('*')
      .single();
    if (error) throw error;
    // espelha a mídia no canal externo (Instagram/Facebook/WhatsApp), se for o caso
    const ent = await entregarNoCanal(req, id, { midiaUrl: publicUrl, tipo, titulo: orig });
    if (ent.tentou && !ent.entregue) {
      await req.supabase.from('chatbot-mensagens').update({ entregue: false }).eq('id', data.id);
      data.entregue = false;
    }
    await req.supabase.from('chatbot-contatos').update({ ultimamsg: new Date().toISOString() }).eq('id', id);
    res.status(201).json({ mensagem: mapMensagem(data), aviso: (ent.tentou && !ent.entregue) ? ent.erro : undefined });
  } catch (err) { next(err); }
});
