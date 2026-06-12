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
import { requirePermissao, carregarAutorizacao, temPermissao } from '../lib/autorizacao.js';
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
  // CRM do contato pelo chat: ler = atendimento.ver; criar/mover/remover card = atendimento.responder.
  if (/\/crm(\/|$)/.test(p)) return method === 'GET' ? 'atendimento.ver' : 'atendimento.responder';
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
const MAX_FILE = 100 * 1024 * 1024; // 100 MB (suporta vídeos)
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

async function entregarNoCanal(req, contatoId, { texto, midiaUrl, tipo, titulo, contato }) {
  // Texto de fallback para canais sem cartão de contato nativo (Instagram/Facebook).
  const txtContato = contato ? ('📇 Contato: ' + (contato.nome || 'Contato') + (contato.telefone ? ' — ' + contato.telefone : '')) : null;
  try {
    const { data: ct } = await req.supabase
      .from('chatbot-contatos').select('origemcontato,external_id').eq('id', contatoId).single();
    const canal = ct && ct.origemcontato;
    console.log(`[envio] contato=${contatoId} canal=${canal} external_id=${ct && ct.external_id}`);
    if (!ct || !CANAIS_EXTERNOS.has(canal) || !ct.external_id) { console.log('[envio] pulado (canal interno ou sem external_id)'); return { tentou: false, entregue: true }; }

    const empresaId = await getEmpresaId(req);
    const tok = await integ.getActiveToken(empresaId, canal);
    if (!tok) { console.log('[envio] sem token ativo p/', canal); return { tentou: true, entregue: false, erro: NOME_CANAL[canal] + ' não está conectado.' }; }

    if (canal === 'instagram') {
      if (contato) await ig.sendText({ token: tok.token, recipientId: ct.external_id, text: txtContato });
      else if (midiaUrl) await ig.sendMedia({ token: tok.token, recipientId: ct.external_id, type: ({ imagem: 'image', video: 'video', audio: 'audio', arquivo: 'file' })[tipo] || 'file', url: midiaUrl });
      else await ig.sendText({ token: tok.token, recipientId: ct.external_id, text: texto });
    } else if (canal === 'facebook') {
      if (contato) await fb.sendText({ token: tok.token, recipientId: ct.external_id, text: txtContato });
      else if (midiaUrl) await fb.sendMedia({ token: tok.token, recipientId: ct.external_id, type: ({ imagem: 'image', video: 'video', audio: 'audio', arquivo: 'file' })[tipo] || 'file', url: midiaUrl });
      else await fb.sendText({ token: tok.token, recipientId: ct.external_id, text: texto });
    } else if (canal === 'whatsapp') {
      // No WhatsApp, o phone_number_id é o external_id da integração; o destino é o external_id do contato.
      if (contato) await wa.sendContact({ token: tok.token, phoneNumberId: tok.externalId, to: ct.external_id, nome: contato.nome, telefone: contato.telefone });
      else if (midiaUrl) await wa.sendMedia({ token: tok.token, phoneNumberId: tok.externalId, to: ct.external_id, type: ({ imagem: 'image', video: 'video', audio: 'audio', arquivo: 'document' })[tipo] || 'document', link: midiaUrl, filename: titulo });
      else await wa.sendText({ token: tok.token, phoneNumberId: tok.externalId, to: ct.external_id, text: texto });
    }
    console.log('[envio] OK ->', canal);
    return { tentou: true, entregue: true };
  } catch (e) {
    console.error('[envio] FALHOU ->', e?.metaError ? JSON.stringify(e.metaError) : (e?.message || e));
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
  const ehContato = !!(um && um.tipomidia === 'contato');
  const temTexto = !!(um && um.texto && um.texto !== 'null') && !ehContato;
  const midiaTipo = (um && !temTexto && !ehContato) ? normMidia(um.tipomidia) : null;
  const preview = ehContato ? 'Contato' : (temTexto ? um.texto : (midiaTipo ? rotuloMidia(midiaTipo) : ''));
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
    atendenteId: r.atendente_id || null,           // dono atual (isolamento/transferência)
    atendenteNome: (r.atendente && String(r.atendente).trim() && r.atendente !== 'null') ? r.atendente : null, // nome do dono (selo)
    departamentoId: r.departamento_id || null,      // departamento atual da conversa
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
  // Cartão de contato: dados (nome/telefone) ficam em JSON no campo texto.
  let contato = null;
  if (r.tipomidia === 'contato' && r.texto) { try { const j = JSON.parse(r.texto); if (j && typeof j === 'object') contato = { nome: j.nome || null, telefone: j.telefone || null }; } catch (_) {} }
  return {
    id: r.id,
    criadoEm: r.created_at,
    deCliente,                       // true = cliente (esquerda), false = empresa (direita)
    enviadopor: r.enviadopor || null,
    tipo: r.tipomidia || 'texto',    // texto | imagem | audio | video | arquivo | contato | docx | xlsx ...
    texto: r.texto || null,
    contato,                         // { nome, telefone } quando tipo === 'contato'
    midiaUrl: r.linkmidia || null,
    titulo: r.titulomidia || null,
    formato: r.formato || null,
    tamanho: r.tamanho || null,
    paginas: r.qtdpaginas || null,
    apagado: !!r['apagado-pra-todos'],
    respondeA: r.responde_a || null,   // citação (Responder)
    fixada: !!r.fixada,                // fixada na conversa
    fixadaAte: r.fixada_ate || null,   // expiração da fixação (24h/7d/.../90d) — null = sem prazo
    favoritada: !!r.favoritada,        // estrela
  };
}

// ---- GET /api/chatbot/contatos --------------------------------------------
// Enriquece cada contato com dados do cliente (nome/foto/telefone) e suas tags.
// Faz poucas queries (in-list) em vez de uma por contato (evita N+1).
chatbotRouter.get('/contatos', async (req, res, next) => {
  try {
    // ISOLAMENTO (3 níveis). O RLS por empresa continua valendo por baixo.
    //   - ADMIN (atendimento.gerenciar): vê TUDO.
    //   - RESPONSÁVEL de um departamento: vê TUDO daquele departamento
    //     (inclusive conversas já atribuídas a colegas) — papel de supervisor.
    //   - ATENDENTE comum: vê só as ATRIBUÍDAS A ELE + o POOL que pode pegar
    //     (sem dono, do seu setor ou sem setor nenhum). NÃO vê as dos colegas.
    // RESILIÊNCIA: se as migrations 0034/0035 ainda não rodaram (colunas/tabelas
    // ausentes), cai no comportamento legado (só tenant) sem quebrar o inbox.
    const COLS_NEW = 'id,nome,cliente_id,origemcontato,statuschat,departamento,departamento_id,qtd_mensagem_nao_lida,nova_mensagem,fixado,ultimamsg,atendente,atendente_id';
    const COLS_OLD = 'id,nome,cliente_id,origemcontato,statuschat,departamento,qtd_mensagem_nao_lida,nova_mensagem,fixado,ultimamsg,atendente';
    const auth = await carregarAutorizacao(req);
    const isAdmin = temPermissao(auth, 'atendimento.gerenciar');
    const ehMigracaoFaltando = (e) => /does not exist|could not find|schema cache|column|relation/i.test((e && e.message) || '');
    let rows;
    try {
      let cq = req.supabase.from('chatbot-contatos').select(COLS_NEW).order('ultimamsg', { ascending: false, nullsFirst: false });
      if (!isAdmin) {
        // EM PAUSA: não recebe NADA novo do pool — vê só as conversas que já são dele
        // (as em andamento permanecem com ele). Ao voltar, o pool reaparece.
        const emPausa = await atendenteEmPausa(req.user.id);
        if (emPausa) {
          cq = cq.or(`atendente_id.eq.${req.user.id}`);
        } else {
          const [meusDeptos, deptosResp] = await Promise.all([deptosDoUsuario(req), deptosResponsavel(req)]);
          const temDepartamento = meusDeptos.length > 0 || deptosResp.length > 0;
          // Sempre vê as ATRIBUÍDAS a ele (é assim que recebe por transferência direta, mesmo sem setor).
          const ors = [`atendente_id.eq.${req.user.id}`];
          // REGRA: usuário SEM departamento (nem perfil, nem responsável) NÃO recebe nada da fila.
          // Só atende o que transferirem direto pra ele (aba Atendente). Por isso o pool
          // (global + do setor + encerradas do setor) só vale p/ quem TEM departamento.
          if (temDepartamento) {
            ors.push(`and(atendente_id.is.null,departamento_id.is.null)`);  // pool global (sem dono e sem setor)
            if (meusDeptos.length) {
              ors.push(`and(atendente_id.is.null,departamento_id.in.(${meusDeptos.join(',')}))`);    // pool do meu setor (posso pegar)
              ors.push(`and(statuschat.eq.finalizado,departamento_id.in.(${meusDeptos.join(',')}))`); // encerradas do meu setor: todos do setor veem
            }
            if (deptosResp.length) ors.push(`departamento_id.in.(${deptosResp.join(',')})`);          // supervisor: tudo do(s) setor(es) que sou responsável
          }
          cq = cq.or(ors.join(','));
        }
      }
      const { data, error } = await cq;
      if (error) throw error;
      rows = data || [];
    } catch (e) {
      if (!ehMigracaoFaltando(e)) throw e;
      // Pré-migração: sem isolamento por depto/atribuição (só o RLS de empresa).
      const { data, error } = await req.supabase.from('chatbot-contatos').select(COLS_OLD).order('ultimamsg', { ascending: false, nullsFirst: false });
      if (error) throw error;
      rows = data || [];
    }
    const clienteIds = [...new Set(rows.map((r) => r.cliente_id).filter(Boolean))];
    const contatoIds = rows.map((r) => r.id);

    // clientes e tags são independentes entre si -> buscamos em PARALELO (corta 1 round-trip).
    const [clientesById, tagsByContato, leadKeys, ultimaMsgByContato, crmFasesByCliente] = await Promise.all([
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
        (msgs || []).forEach((m) => { if (m.tipomidia === 'nota' || m.tipomidia === 'inicio' || m.tipomidia === 'encerramento') return; if (!map[m.contato]) map[m.contato] = m; }); // 1ª = mais recente; ignora marcadores internos
        return map;
      })(),
      // 5) CRM: fases (colunas) em que cada CLIENTE está. Um cliente pode estar em
      //    vários funis -> guardamos a lista de faseIds (o filtro do inbox casa por qualquer uma).
      (async () => {
        const map = {};
        if (!clienteIds.length) return map;
        try {
          const { data: rel } = await req.supabase.from('crm-clientesfunil').select('cliente,fase').in('cliente', clienteIds);
          (rel || []).forEach((x) => {
            if (!x.cliente || x.fase == null) return;
            (map[x.cliente] = map[x.cliente] || []).push(x.fase);
          });
        } catch (e) { /* CRM ausente: contato fica sem fase; o filtro simplesmente não casa */ }
        return map;
      })(),
    ]);

    res.json({ contatos: rows.map((r) => {
      const cli = clientesById[r.cliente_id];
      // Sem tag forçada: o contato exibe apenas as tags realmente atribuídas.
      // (contato novo entra sem tag; o "Cliente"/"Lead" automático foi removido)
      const dto = mapContato(r, cli, tagsByContato[r.id] || [], ultimaMsgByContato[r.id]);
      dto.faseIds = crmFasesByCliente[r.cliente_id] || []; // fases do CRM p/ o filtro do inbox
      return dto;
    }) });
  } catch (err) { next(err); }
});

// ---- Presença do atendente (disponível / em pausa) ----
// Sobrevive ao F5, tira quem está em pausa do pool/transferências e deixa o admin ver.
async function atendenteEmPausa(userId) {
  try {
    const { data } = await adminClient().from('atendente_presenca').select('status').eq('user_id', userId).single();
    return !!(data && data.status === 'pausa');
  } catch (e) { return false; }
}

// minha presença atual (default: disponível)
chatbotRouter.get('/presenca', async (req, res, next) => {
  try {
    const { data } = await adminClient().from('atendente_presenca').select('*').eq('user_id', req.user.id).single();
    res.json({ presenca: data || { status: 'disponivel' } });
  } catch (e) { res.json({ presenca: { status: 'disponivel' } }); }
});

// define minha presença (entrar em pausa / voltar a ficar disponível)
const presencaSchema = z.object({
  status: z.enum(['disponivel', 'pausa']),
  motivo: z.string().trim().max(40).nullable().optional(),
  motivoLabel: z.string().trim().max(80).nullable().optional(),
  cor: z.string().trim().max(20).nullable().optional(),
  nota: z.string().trim().max(280).nullable().optional(),
}).strip();
chatbotRouter.post('/presenca', validateBody(presencaSchema), async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const b = req.body;
    const emPausa = b.status === 'pausa';
    const row = {
      user_id: req.user.id,
      empresa: empresaId,
      status: b.status,
      motivo: emPausa ? (b.motivo || null) : null,
      motivo_label: emPausa ? (b.motivoLabel || null) : null,
      cor: emPausa ? (b.cor || null) : null,
      nota: emPausa ? (b.nota || null) : null,
      desde: emPausa ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await adminClient().from('atendente_presenca').upsert(row, { onConflict: 'user_id' }).select('*').single();
    if (error) throw error;
    res.json({ presenca: data });
  } catch (err) { next(err); }
});

// presença de TODOS os atendentes da empresa (admin/equipe enxerga quem está em pausa)
chatbotRouter.get('/presencas', async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const { data } = await adminClient().from('atendente_presenca').select('user_id,status,motivo,motivo_label,cor,nota,desde').eq('empresa', empresaId);
    res.json({ presencas: data || [] });
  } catch (e) { res.json({ presencas: [] }); }
});

// ---- GET /api/chatbot/atendentes — lista de atendentes p/ o filtro do inbox, ESCOPADA:
//   - ADMIN (atendimento.gerenciar): TODOS os atendentes da loja.
//   - RESPONSÁVEL de departamento: só os atendentes cujo departamento (perfil) está
//     entre os que ele lidera (vê só as conversas desses).
//   - Demais: lista vazia (a aba nem aparece pra eles no front).
chatbotRouter.get('/atendentes', async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const A = adminClient();
    const auth = await carregarAutorizacao(req);
    const isAdmin = temPermissao(auth, 'atendimento.gerenciar');

    const { data: membros } = await A.from('empresa_membros').select('user_id').eq('empresa_id', empresaId);
    const memberIds = new Set((membros || []).map((m) => m.user_id).filter(Boolean));
    const { data: list } = await A.auth.admin.listUsers({ page: 1, perPage: 200 });
    let users = (list?.users || []).filter((u) => memberIds.has(u.id));

    if (!isAdmin) {
      // responsável: departamentos que ele lidera -> só atendentes desses departamentos.
      const { data: deps } = await A.from('departamentos').select('id').eq('empresa', empresaId).eq('responsavel_id', req.user.id);
      const respIds = new Set((deps || []).map((d) => String(d.id)));
      if (!respIds.size) return res.json({ atendentes: [] }); // não lidera nada
      users = users.filter((u) => {
        const md = u.user_metadata || {};
        return md.departamentoId != null && respIds.has(String(md.departamentoId));
      });
    }
    const nomeDe = (u) => (u.user_metadata && u.user_metadata.name) || u.email;
    res.json({ atendentes: users.map((u) => ({ id: u.id, nome: nomeDe(u) })).sort((a, b) => (a.nome || '').localeCompare(b.nome || '')) });
  } catch (err) { next(err); }
});

// ---- GET /api/chatbot/departamentos-filtro — departamentos p/ o filtro do inbox.
//   Lista TODOS (ativos). podeFiltrar = ADMIN ou RESPONSÁVEL daquele departamento.
//   No front, os não-liberados aparecem cinza e não selecionáveis.
chatbotRouter.get('/departamentos-filtro', async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const A = adminClient();
    const auth = await carregarAutorizacao(req);
    const isAdmin = temPermissao(auth, 'atendimento.gerenciar');
    const { data: deps } = await A.from('departamentos').select('id,nome,ativo,responsavel_id').eq('empresa', empresaId).order('nome');
    const ativos = (deps || []).filter((d) => d.ativo !== false);
    res.json({ departamentos: ativos.map((d) => ({ id: d.id, nome: d.nome, podeFiltrar: isAdmin || d.responsavel_id === req.user.id })) });
  } catch (err) { next(err); }
});

// ---- GET /api/chatbot/origens — lista de ORIGENS p/ as listas suspensas (ficha etc.).
// Acessível a quem atende (atendimento.ver). Escopo por empresa.
chatbotRouter.get('/origens', async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const { data } = await adminClient().from('origens').select('id,nome').eq('empresa', empresaId).order('nome');
    res.json({ origens: (data || []).map((o) => ({ id: o.id, nome: o.nome })) });
  } catch (e) { res.json({ origens: [] }); }
});

// ---- GET /api/chatbot/departamentos — lista enxuta (id,nome) p/ a transferência.
// Acessível a QUEM ATENDE (gate atendimento.ver), diferente de /cadastros/departamentos
// que é só admin. Usa req.supabase (RLS por empresa) -> só os departamentos da loja.
chatbotRouter.get('/departamentos', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.from('departamentos').select('id,nome,ativo').order('nome');
    if (error) throw error;
    // meusDepartamentos: setores do usuário (perfil + equipes) p/ o modal de transferência
    // esconder o(s) meu(s) na aba "Departamento" e popular a aba "Meu departamento".
    const meus = await deptosDoUsuario(req);
    res.json({
      departamentos: (data || []).filter((d) => d.ativo !== false).map((d) => ({ id: d.id, nome: d.nome })),
      meusDepartamentos: meus,
    });
  } catch (err) { next(err); }
});

// ====================== CRM do contato (painel do chatbot) ======================
// Lê/atribui a posição do contato no CRM (funil/fase) DIRETO do chat, sem exigir
// permissão de CRM (gate de atendimento). Casa por clienteId = crm-clientesfunil.cliente.
// Tabelas têm RLS por empresa (0003), então req.supabase já isola por loja.
const crmAtribuirSchema = z.object({ faseId: z.coerce.number().int() }).strip();

// GET /api/chatbot/crm/:clienteId -> { card | null, funis: [{id,nome,cor,fases:[...]}] }
chatbotRouter.get('/crm/:clienteId', async (req, res, next) => {
  try {
    const clienteId = uuid.parse(req.params.clienteId);
    const [funisRes, fasesRes] = await Promise.all([
      req.supabase.from('crm-funil').select('id,nome,cor_funil,created_at').order('created_at', { ascending: true }),
      req.supabase.from('crm-fasefunil').select('id,nome,cor_funil,pos,funil').order('pos', { ascending: true }),
    ]);
    const funisRaw = funisRes.data || [];
    const fasesRaw = fasesRes.data || [];
    const fasesByFunil = {};
    fasesRaw.forEach((f) => { (fasesByFunil[f.funil] = fasesByFunil[f.funil] || []).push({ id: f.id, nome: f.nome, cor: f.cor_funil || '#94a3b8', pos: f.pos }); });
    const funis = funisRaw.map((fu) => ({ id: fu.id, nome: fu.nome, cor: fu.cor_funil || '#22C55E', fases: fasesByFunil[fu.id] || [] }));
    // TODOS os cards do cliente (pode estar em vários funis); o 1º (mais recente) é o "card".
    const { data: rels } = await req.supabase
      .from('crm-clientesfunil').select('id,cliente,fase,tipo,created_at')
      .eq('cliente', clienteId).order('created_at', { ascending: false });
    const toCard = (rel) => {
      const fase = fasesRaw.find((f) => String(f.id) === String(rel.fase));
      const funil = fase ? funisRaw.find((fu) => String(fu.id) === String(fase.funil)) : null;
      return {
        cardId: rel.id,
        funilId: funil ? funil.id : null, funilNome: funil ? funil.nome : null, funilCor: funil ? (funil.cor_funil || '#22C55E') : '#22C55E',
        faseId: rel.fase, faseNome: fase ? fase.nome : null, faseCor: fase ? (fase.cor || fase.cor_funil || '#94a3b8') : '#94a3b8',
        tipo: rel.tipo === 'lead' ? 'lead' : 'cliente',
      };
    };
    const cards = (rels || []).map(toCard);
    res.json({ card: cards[0] || null, cards, funis });
  } catch (err) { next(err); }
});

// POST /api/chatbot/crm/:clienteId/cards { faseId } -> ADICIONA o contato a OUTRO funil.
chatbotRouter.post('/crm/:clienteId/cards', validateBody(crmAtribuirSchema), async (req, res, next) => {
  try {
    const clienteId = uuid.parse(req.params.clienteId);
    const empresaId = await getEmpresaId(req);
    const { data, error } = await req.supabase.from('crm-clientesfunil')
      .insert({ cliente: clienteId, fase: req.body.faseId, empresa_id: empresaId }).select('id').single();
    if (error) throw error;
    res.status(201).json({ ok: true, cardId: data.id, faseId: req.body.faseId });
  } catch (err) { next(err); }
});

// PATCH /api/chatbot/crm/cards/:cardId { faseId } -> MOVE um card específico de fase.
chatbotRouter.patch('/crm/cards/:cardId', validateBody(crmAtribuirSchema), async (req, res, next) => {
  try {
    const cardId = Number(req.params.cardId);
    const { error } = await req.supabase.from('crm-clientesfunil').update({ fase: req.body.faseId }).eq('id', cardId);
    if (error) throw error;
    res.json({ ok: true, cardId, faseId: req.body.faseId });
  } catch (err) { next(err); }
});

// DELETE /api/chatbot/crm/cards/:cardId -> remove o contato daquele funil.
chatbotRouter.delete('/crm/cards/:cardId', async (req, res, next) => {
  try {
    const cardId = Number(req.params.cardId);
    const { error } = await req.supabase.from('crm-clientesfunil').delete().eq('id', cardId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// PUT /api/chatbot/crm/:clienteId { faseId } -> atribui (cria) ou move o card p/ a fase.
chatbotRouter.put('/crm/:clienteId', validateBody(crmAtribuirSchema), async (req, res, next) => {
  try {
    const clienteId = uuid.parse(req.params.clienteId);
    const faseId = req.body.faseId;
    const { data: rels } = await req.supabase
      .from('crm-clientesfunil').select('id,created_at').eq('cliente', clienteId).order('created_at', { ascending: false });
    const rel = (rels || [])[0];
    if (rel) {
      const { error } = await req.supabase.from('crm-clientesfunil').update({ fase: faseId }).eq('id', rel.id);
      if (error) throw error;
      return res.json({ ok: true, cardId: rel.id, faseId });
    }
    const empresaId = await getEmpresaId(req);
    const { data, error } = await req.supabase.from('crm-clientesfunil')
      .insert({ cliente: clienteId, fase: faseId, empresa_id: empresaId }).select('id').single();
    if (error) throw error;
    res.status(201).json({ ok: true, cardId: data.id, faseId });
  } catch (err) { next(err); }
});

// ---- GET /api/chatbot/transferencia — listas p/ o popup de transferir.
// Resolve "quem é de qual departamento" cruzando os 3 vínculos: perfil
// (user_metadata.departamentoId), equipe (equipe_membros->equipes) e responsável
// (departamentos.responsavel_id). Devolve tudo pronto p/ as 3 abas.
const PAPEL_LABEL_CB = { admin: 'Admin da Loja', admin_loja: 'Admin da Loja', atendente: 'Atendente', super_admin: 'Super Admin' };
const numId = (x) => { const n = Number(x); return Number.isFinite(n) ? n : x; };
chatbotRouter.get('/transferencia', async (req, res, next) => {
  try {
    const meId = req.user.id;
    const empresaId = await getEmpresaId(req);
    const A = adminClient();

    // membros + papéis + usuários do Auth
    const { data: membros } = await A.from('empresa_membros').select('user_id,papel,papel_id').eq('empresa_id', empresaId);
    const lista = (membros || []).filter((m) => m.user_id);
    const memberIds = new Set(lista.map((m) => m.user_id));
    const byUser = {}; lista.forEach((m) => { byUser[m.user_id] = m; });
    const papelIds = [...new Set(lista.map((m) => m.papel_id).filter(Boolean))];
    const papeisById = {};
    if (papelIds.length) { const { data: ps } = await A.from('papeis').select('id,codigo,nome').in('id', papelIds); (ps || []).forEach((p) => { papeisById[p.id] = p; }); }
    const { data: list } = await A.auth.admin.listUsers({ page: 1, perPage: 200 });
    const authUsers = (list?.users || []).filter((u) => memberIds.has(u.id));

    // departamentos (id, nome, responsável)
    const { data: deps } = await A.from('departamentos').select('id,nome,ativo,responsavel_id').eq('empresa', empresaId);
    const depsAtivos = (deps || []).filter((d) => d.ativo !== false);

    // responsável: usuário -> setores que ele responde (supervisor).
    const respDeptByUser = {};
    (deps || []).forEach((d) => { if (d.responsavel_id) { (respDeptByUser[d.responsavel_id] = respDeptByUser[d.responsavel_id] || new Set()).add(numId(d.id)); } });

    // Departamentos de um usuário = PERFIL + RESPONSÁVEL (equipe NÃO entra no chatbot).
    const deptsOfUser = (u) => {
      const s = new Set();
      const md = u.user_metadata || {};
      if (md.departamentoId != null && md.departamentoId !== '') s.add(numId(md.departamentoId));
      (respDeptByUser[u.id] || []).forEach((d) => s.add(d));
      return s;
    };
    // setor PRINCIPAL p/ a conversa seguir o dono (perfil > responsável).
    const deptoPrincipal = (u) => {
      const md = u.user_metadata || {};
      if (md.departamentoId != null && md.departamentoId !== '') return numId(md.departamentoId);
      const r = respDeptByUser[u.id]; if (r && r.size) return [...r][0];
      return null;
    };

    // MEUS setores = perfil + responsável. Simétrico com deptsOfUser.
    const meuUser = authUsers.find((u) => u.id === meId) || req.user;
    const meusSet = deptsOfUser(meuUser);

    const nomeDe = (u) => (u.user_metadata && u.user_metadata.name) || u.email;
    const papelDe = (u) => { const m = byUser[u.id]; const p = m && m.papel_id ? papeisById[m.papel_id] : null; const cod = (p && p.codigo) || (m && m.papel) || null; return (p && p.nome) || PAPEL_LABEL_CB[cod] || cod || 'Atendente'; };
    // presença (p/ marcar quem está EM PAUSA -> não pode receber transferência)
    const { data: presRows } = await A.from('atendente_presenca').select('user_id,status,motivo_label').eq('empresa', empresaId);
    const presByUser = {}; (presRows || []).forEach((p) => { presByUser[p.user_id] = p; });
    const dto = (u) => {
      const pr = presByUser[u.id];
      const emPausa = !!(pr && pr.status === 'pausa');
      return { id: u.id, nome: nomeDe(u), papelNome: papelDe(u), departamentoId: deptoPrincipal(u), emPausa, pausaLabel: emPausa ? (pr.motivo_label || 'Em pausa') : null };
    };

    const atendentes = authUsers.filter((u) => u.id !== meId).map(dto);                    // todos, menos eu
    const colegas = authUsers.filter((u) => u.id !== meId && [...deptsOfUser(u)].some((d) => meusSet.has(d))).map(dto); // do(s) meu(s) setor(es)
    res.json({
      atendentes,
      colegas,
      departamentos: depsAtivos.map((d) => ({ id: d.id, nome: d.nome })),
      meusDepartamentos: [...meusSet],
    });
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
    // Abrir/ler a conversa ZERA o contador de não-lidas (badge verde da lista).
    // Best-effort: não falha o GET se o update der erro.
    try { await req.supabase.from('chatbot-contatos').update({ qtd_mensagem_nao_lida: 0 }).eq('id', id); } catch (_) {}
    res.json({ mensagens: (data || []).map(mapMensagem) });
  } catch (err) { next(err); }
});

// ---- POST /api/chatbot/contatos/:id/mensagens (texto) ---------------------
const textoSchema = z.object({ texto: z.string().trim().min(1, 'Mensagem vazia.').max(4000), respondeA: z.string().max(64).optional() }).strip();

chatbotRouter.post('/contatos/:id/mensagens', validateBody(textoSchema), async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    // A policy de INSERT (with check) já garante que o contato é da empresa do
    // usuário; se não for, o insert falha. Gravamos o nome -> lado da empresa.
    const { data, error } = await req.supabase
      .from('chatbot-mensagens')
      .insert({ contato: id, tipomidia: 'texto', texto: req.body.texto, enviadopor: nomeAtendente(req.user), ...(req.body.respondeA ? { responde_a: req.body.respondeA } : {}) })
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

// ---- POST /api/chatbot/contatos/:id/contato (enviar cartão de contato) -----
// Guarda nome+telefone como JSON no campo texto (tipomidia='contato') e entrega
// no canal (WhatsApp nativo; Instagram/Facebook caem em texto).
const contatoCardSchema = z.object({
  nome: z.string().trim().min(1, 'Nome vazio.').max(120),
  telefone: z.string().trim().max(40).optional().default(''),
}).strip();

chatbotRouter.post('/contatos/:id/contato', validateBody(contatoCardSchema), async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const card = { nome: req.body.nome, telefone: req.body.telefone || '' };
    const { data, error } = await req.supabase
      .from('chatbot-mensagens')
      .insert({ contato: id, tipomidia: 'contato', texto: JSON.stringify(card), enviadopor: nomeAtendente(req.user) })
      .select('*')
      .single();
    if (error) throw error;
    const ent = await entregarNoCanal(req, id, { contato: card });
    if (ent.tentou && !ent.entregue) {
      await req.supabase.from('chatbot-mensagens').update({ entregue: false }).eq('id', data.id);
      data.entregue = false;
    }
    await req.supabase.from('chatbot-contatos').update({ ultimamsg: new Date().toISOString() }).eq('id', id);
    res.status(201).json({ mensagem: mapMensagem(data), aviso: (ent.tentou && !ent.entregue) ? ent.erro : undefined });
  } catch (err) { next(err); }
});

// ---- PATCH /api/chatbot/contatos/:id/mensagens/:msgId  (ações por mensagem) ----
// Fixar / Favoritar / Apagar (pra todos, interno). Idempotente, via RLS (req.supabase).
const msgAcaoSchema = z.object({
  fixada: z.boolean().optional(),
  fixadaAte: z.string().nullable().optional(),  // ISO da expiração da fixação (null = sem prazo)
  favoritada: z.boolean().optional(),
  apagada: z.boolean().optional(),
}).strip();
chatbotRouter.patch('/contatos/:id/mensagens/:msgId', validateBody(msgAcaoSchema), async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const msgId = String(req.params.msgId);
    const b = req.body;
    const patch = {};
    if (b.fixada !== undefined) patch.fixada = !!b.fixada;
    if (b.fixadaAte !== undefined) patch.fixada_ate = b.fixadaAte || null;
    if (b.favoritada !== undefined) patch.favoritada = !!b.favoritada;
    if (b.apagada !== undefined) patch['apagado-pra-todos'] = !!b.apagada;
    if (!Object.keys(patch).length) return res.status(422).json({ error: 'Nada para atualizar.' });
    // Fixar: limite de 5 por conversa (estilo WhatsApp).
    if (patch.fixada === true) {
      const { count } = await req.supabase.from('chatbot-mensagens')
        .select('id', { count: 'exact', head: true }).eq('contato', id).eq('fixada', true);
      if ((count || 0) >= 5) return res.status(422).json({ error: 'Limite de 5 mensagens fixadas por conversa.' });
    }
    let r = await req.supabase.from('chatbot-mensagens')
      .update(patch).eq('id', msgId).eq('contato', id).select('*').single();
    // Resiliência: se a coluna fixada_ate ainda não existe (migration 0039 não rodada),
    // refaz o update sem ela (a fixação funciona, só sem prazo até rodar o SQL).
    if (r.error && patch.fixada_ate !== undefined) {
      const semAte = { ...patch }; delete semAte.fixada_ate;
      r = await req.supabase.from('chatbot-mensagens').update(semAte).eq('id', msgId).eq('contato', id).select('*').single();
    }
    if (r.error) throw r.error;
    res.json({ mensagem: mapMensagem(r.data) });
  } catch (err) { next(err); }
});

// ---- GET /api/chatbot/midia/download?url=&nome= — baixa a mídia VIA SERVIDOR e força o
// download no PC (Content-Disposition: attachment), sem esbarrar em CORS. Só aceita URLs
// do Storage PÚBLICO da própria Supabase (evita SSRF).
chatbotRouter.get('/midia/download', async (req, res, next) => {
  try {
    const url = String(req.query.url || '');
    const nome = (String(req.query.nome || 'arquivo').replace(/[^\w.\- ]+/g, '_').slice(0, 90) || 'arquivo').replace(/"/g, '');
    const base = (process.env.SUPABASE_URL || '').replace(/\/+$/, '') + '/storage/v1/object/public/';
    if (base.length < 30 || !url.startsWith(base)) return res.status(400).json({ error: 'URL não permitida.' });
    const up = await fetch(url);
    if (!up.ok) return res.status(502).json({ error: 'Falha ao buscar o arquivo.' });
    res.setHeader('Content-Type', up.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="' + nome + '"');
    const len = up.headers.get('content-length'); if (len) res.setHeader('Content-Length', len);
    res.setHeader('Cache-Control', 'private, max-age=0');
    res.send(Buffer.from(await up.arrayBuffer()));
  } catch (err) { next(err); }
});

// ---- GET /api/chatbot/contatos/:id/historico — linha do tempo REAL do cliente:
// cadastro + eventos da conversa (início/transferência/encerramento) + vendas + agendamentos.
// Agregado por empresa+cliente (adminClient escopado), ordenado por data desc.
chatbotRouter.get('/contatos/:id/historico', async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const empresaId = await getEmpresaId(req);
    const A = adminClient();
    const { data: cont } = await A.from('chatbot-contatos').select('cliente_id,empresa_id').eq('id', id).single();
    if (!cont || String(cont.empresa_id) !== String(empresaId)) return res.status(403).json({ error: 'Sem permissão.' });
    const clienteId = cont.cliente_id || null;
    const ev = [];
    const up = (s) => (s == null ? '' : String(s)).toUpperCase();
    // 1) Cadastro do cliente
    if (clienteId) try {
      const { data: cli } = await A.from('clientes').select('created_at,origemcontato').eq('id', clienteId).eq('empresa_id', empresaId).single();
      if (cli && cli.created_at) ev.push({ kind: 'entry', icon: 'plus', color: 'var(--text-faint)', title: 'Cliente cadastrado', desc: cli.origemcontato ? ('Origem: ' + cli.origemcontato) : '', at: cli.created_at });
    } catch (e) {}
    // 2) Eventos da conversa (marcadores)
    try {
      const { data: mk } = await A.from('chatbot-mensagens').select('tipomidia,texto,enviadopor,created_at').eq('contato', id).in('tipomidia', ['inicio', 'nota', 'encerramento']);
      (mk || []).forEach((m) => {
        let j = null; try { j = m.texto ? JSON.parse(m.texto) : null; } catch (e) {}
        if (m.tipomidia === 'inicio') ev.push({ kind: 'message', icon: 'check', color: 'var(--accent)', title: 'Atendimento iniciado', desc: [up(j && j.dept), (j && j.atend) || m.enviadopor].filter(Boolean).join(' · '), at: m.created_at });
        else if (m.tipomidia === 'nota') { const de = (j && j.de) || {}, pa = (j && j.para) || {}; ev.push({ kind: 'transfer', icon: 'refresh', color: 'var(--hue-blue)', title: 'Atendimento transferido', desc: `de ${up(de.dept) || '—'}${de.atend ? ' (' + de.atend + ')' : ''} → ${up(pa.dept) || '—'}${pa.atend ? ' (' + pa.atend + ')' : ''}`, at: m.created_at }); }
        else ev.push({ kind: 'close', icon: 'check-double', color: 'var(--text-muted)', title: 'Atendimento encerrado', desc: [up(j && j.dept), (j && j.atend) || m.enviadopor].filter(Boolean).join(' · '), at: m.created_at });
      });
    } catch (e) {}
    // 3) Vendas do cliente
    if (clienteId) try {
      const { data: vs } = await A.from('vendas').select('codigo,total,status,created_at').eq('empresa_id', empresaId).eq('cliente_id', clienteId).order('created_at', { ascending: false }).limit(50);
      (vs || []).forEach((v) => ev.push({ kind: 'sale', icon: 'cart', color: '#16a34a', title: 'Venda · R$ ' + (Number(v.total) || 0).toFixed(2).replace('.', ','), desc: [v.codigo ? ('#' + v.codigo) : null, v.status].filter(Boolean).join(' · '), at: v.created_at }));
    } catch (e) {}
    // 4) Agendamentos do cliente — via agenda_participantes (reflete remoção do participante)
    if (clienteId) try {
      const { data: aps } = await A.from('agenda_participantes').select('agenda_id').eq('empresa_id', empresaId).eq('cliente_id', clienteId);
      const agIds = [...new Set((aps || []).map((x) => x.agenda_id).filter(Boolean))];
      if (agIds.length) {
        const { data: ags } = await A.from('agenda').select('servico,tipo,data,hora,responsavel,responsavel_nome,status').in('id', agIds).order('data', { ascending: false }).limit(50);
        (ags || []).forEach((a) => { const quem = a.responsavel_nome || a.responsavel; ev.push({ kind: 'schedule', icon: 'agenda', color: 'var(--hue-violet)', title: a.servico || a.tipo || 'Agendamento', desc: [quem ? ('com ' + quem) : null, a.status].filter(Boolean).join(' · '), at: a.data ? (a.data + 'T' + (a.hora || '00:00') + ':00') : null }); });
      }
    } catch (e) {}
    ev.sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
    res.json({ historico: ev });
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
      .eq('contato', id).neq('tipomidia', 'texto').neq('tipomidia', 'nota').neq('tipomidia', 'inicio').order('created_at', { ascending: false });
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
      .update({ statuschat: req.body.statuschat }).eq('id', id).select('id,statuschat,departamento,atendente').single();
    if (error) throw error;
    // Ao ENCERRAR, registra o marcador 'encerramento' (departamento + atendente) no histórico.
    if (req.body.statuschat === 'finalizado') {
      const _nomeEnc = nomeAtendente(req.user);
      try { await req.supabase.from('chatbot-mensagens').insert({ contato: id, tipomidia: 'encerramento', texto: JSON.stringify({ dept: data.departamento || null, atend: data.atendente || _nomeEnc }), enviadopor: _nomeEnc }); } catch (e) { /* best-effort */ }
    }
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

// Departamentos do atendente = departamentos das equipes em que ele participa.
// Usado no isolamento da lista de conversas. Sem equipe => sem departamento (só pool + atribuídas).
async function deptosDoUsuario(req) {
  // Departamento do usuário = o do PERFIL (cadastro de Usuários). Equipe NÃO entra
  // aqui — no chatbot tratamos só por departamento (equipe é do mundo de vendas).
  const md = (req.user && req.user.user_metadata) || {};
  const dep = (md.departamentoId != null && md.departamentoId !== '') ? (Number(md.departamentoId) || md.departamentoId) : null;
  return dep != null ? [dep] : [];
}

// Departamentos em que o usuário é RESPONSÁVEL (supervisor) -> vê tudo deles.
async function deptosResponsavel(req) {
  const { data } = await req.supabase.from('departamentos').select('id').eq('responsavel_id', req.user.id);
  return [...new Set((data || []).map((d) => d.id).filter((x) => x != null))];
}

// ---- PATCH /api/chatbot/contatos/:id/atribuir  (transferir p/ atendente e/ou departamento) ----
// atendenteId/departamentoId = null limpa o respectivo dono. Os campos de texto
// (atendente/departamento) são atualizados em paralelo como snapshot p/ exibição.
const atribuirSchema = z.object({
  atendenteId: z.string().uuid('atendenteId inválido').nullable().optional(),
  atendenteNome: z.string().trim().max(120).nullable().optional(),
  departamentoId: z.union([z.string(), z.number()]).nullable().optional(), // departamentos.id é bigint
  departamentoNome: z.string().trim().max(120).nullable().optional(),
  nota: z.string().trim().max(2000).optional(),
}).strip();
chatbotRouter.patch('/contatos/:id/atribuir', validateBody(atribuirSchema), async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const b = req.body;
    const patch = {};
    if (b.atendenteId !== undefined) { patch.atendente_id = b.atendenteId || null; patch.atendente = b.atendenteId ? (b.atendenteNome || null) : null; }
    if (b.departamentoId !== undefined) { patch.departamento_id = b.departamentoId || null; patch.departamento = b.departamentoId ? (b.departamentoNome || null) : null; }
    if (!Object.keys(patch).length) return res.status(422).json({ error: 'Informe atendente e/ou departamento.' });
    // Transferir = vira PENDENTE para quem recebe (atendente ou setor): aparece na aba
    // Pendentes do destinatário, que precisa clicar "Atender" para iniciar. (não mexe se já encerrada)
    patch.statuschat = 'pendente';
    // Lê o setor ATUAL (origem "de qual setor veio") ANTES de trocar.
    const { data: prev } = await req.supabase.from('chatbot-contatos').select('departamento,atendente').eq('id', id).single();
    const _ok = (v) => (v && String(v).trim() && v !== 'null') ? v : null;
    const origemDept = _ok(prev && prev.departamento);
    const origemAtend = _ok(prev && prev.atendente);
    const { data, error } = await req.supabase.from('chatbot-contatos')
      .update(patch).eq('id', id).select('id,atendente_id,departamento_id').single();
    if (error) throw error;
    // REGISTRO da transferência ('nota'): de/para (departamento + atendente) em JSON no
    // texto; titulomidia mantém o setor de origem (compat). Alimenta o rodapé "Conversa
    // pendente". Não vai pro canal externo nem vira "última mensagem" (preview).
    const nota = (b.nota || '').trim();
    const destinoDept = b.departamentoId ? (b.departamentoNome || null) : origemDept;
    const destinoAtend = b.atendenteId ? (b.atendenteNome || null) : null;
    const _por = nomeAtendente(req.user);
    const _marca = JSON.stringify({ de: { dept: origemDept, atend: origemAtend }, para: { dept: destinoDept, atend: destinoAtend }, nota: nota || null, por: _por });
    try { await req.supabase.from('chatbot-mensagens').insert({ contato: id, tipomidia: 'nota', texto: _marca, titulomidia: origemDept, enviadopor: _por }); } catch (e) { /* best-effort */ }
    res.json({ contato: { id: data.id, atendenteId: data.atendente_id || null, departamentoId: data.departamento_id || null } });
  } catch (err) { next(err); }
});

// ---- POST /api/chatbot/contatos/:id/assumir  (iniciar atendimento -> vira dono) ----
// Atendente pega a conversa da fila: passa a ser o dono (atendente_id = ele) e a
// conversa fica 'ativo'. A partir daqui, só ele + o responsável do setor a veem.
chatbotRouter.post('/contatos/:id/assumir', async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const patch = { atendente_id: req.user.id, atendente: nomeAtendente(req.user), statuschat: 'ativo' };
    // Carimba o departamento de quem assume SE a conversa ainda não tiver setor
    // (não sobrescreve um setor já definido por transferência). Garante que as
    // ENCERRADAS fiquem visíveis pra todos do último departamento que atendeu.
    const meuDept = (req.user.user_metadata && req.user.user_metadata.departamentoId) || null;
    if (meuDept != null && meuDept !== '') {
      const { data: cur } = await req.supabase.from('chatbot-contatos').select('departamento_id').eq('id', id).single();
      if (!cur || cur.departamento_id == null) patch.departamento_id = meuDept;
    }
    const { data, error } = await req.supabase.from('chatbot-contatos')
      .update(patch).eq('id', id).select('id,atendente_id,departamento_id,statuschat,departamento').single();
    if (error) throw error;
    // Marca o INÍCIO ('inicio'): dados estruturados (departamento + atendente) em JSON no
    // texto; a data/hora vem do created_at. Não vai pro canal nem vira preview.
    const _nomeIni = nomeAtendente(req.user);
    try { await req.supabase.from('chatbot-mensagens').insert({ contato: id, tipomidia: 'inicio', texto: JSON.stringify({ dept: data.departamento || null, atend: _nomeIni }), enviadopor: _nomeIni }); } catch (e) { /* best-effort */ }
    res.json({ contato: { id: data.id, atendenteId: data.atendente_id || null, departamentoId: data.departamento_id || null, status: data.statuschat } });
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
    // Filtro por estágio (lead|cliente). A tela de Clientes pede só 'cliente'
    // (compradores) — leads ficam de fora até a 1ª compra. Sem o parâmetro, devolve
    // todos (pickers do Inbox/Agenda continuam enxergando leads e clientes).
    const estagio = ['lead', 'cliente'].includes((req.query.estagio || '').toString()) ? req.query.estagio.toString() : null;
    let query = req.supabase.from('clientes').select('*').order('nome', { ascending: true }).limit(500);
    if (estagio) query = query.eq('estagio', estagio);
    if (q) query = query.or(`nome.ilike.%${q}%,telefone.ilike.%${q}%`);
    const empresaId = await getEmpresaId(req); // grátis: vem do req._auth (1b)
    // clientes e vendas são independentes -> em PARALELO (1 ida em vez de 2 em série).
    const [clientesRes, kpis] = await Promise.all([query, vendasKpiPorCliente(empresaId)]);
    const { data, error } = clientesRes;
    if (error) throw error;
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
  // Reusa o empresaId que a autorização (requirePermissao→carregarAutorizacao) já
  // carregou em req._auth — evita uma ida REDUNDANTE ao banco e garante que rota e
  // autorização usem a MESMA empresa. (Aplicado só aqui por enquanto; valida antes
  // de replicar pros outros routers.)
  if (req._auth && req._auth.empresaId != null) { req._empresaId = req._auth.empresaId; return req._empresaId; }
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
chatbotRouter.post('/contatos/:id/midia', (req, res, next) => upload.single('arquivo')(req, res, (err) => {
  if (err) return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Arquivo muito grande (máx. 100 MB).' : 'Falha ao receber o arquivo.' });
  next();
}), async (req, res, next) => {
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
