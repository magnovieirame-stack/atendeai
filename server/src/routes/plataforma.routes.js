// plataforma.routes.js — SUPER ADMIN · clientes da plataforma (lojas).
//   Tabela: "plataforma_clientes" (migration 0024). RLS ligada SEM policy ->
//   só o service_role (adminClient) acessa. É uma tabela GLOBAL da plataforma
//   (NÃO filtra por empresa_id — o super admin vê tudo).
//   Protegida por requirePermissao('plataforma.gerenciar') (papel super_admin).
import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requirePermissao } from '../lib/autorizacao.js';
import { validateBody } from '../middleware/validate.js';
import { adminClient } from '../lib/supabase.js';

export const plataformaRouter = Router();
plataformaRouter.use(requireAuth);
plataformaRouter.use(requirePermissao('plataforma.gerenciar'));

const db = () => adminClient();
const uuid = z.string().uuid('id inválido');

function fmtDataBR(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// DB -> DTO (nomes que o front já usa no NovaLojaDrawer)
function mapCliente(r) {
  const isPJ = r.tipo_pessoa === 'pj';
  const ex = r.extras || {};
  return {
    id: r.id,
    tipo: r.tipo_pessoa || 'pf',
    name: r.nome || '',
    razao: r.razao_social || '',
    fantasia: r.nome_fantasia || '',
    cpf: r.cpf || '', cnpj: r.cnpj || '', rg: r.rg || '', ie: r.inscricao_estadual || '',
    birth: r.nascimento || '', nomeSocial: r.nome_social || '',
    email: r.email || '', phone: r.telefone || '',
    doc: isPJ ? (r.cnpj || '') : (r.cpf || ''),
    respName: r.responsavel_nome || '', respRole: r.responsavel_cargo || '', respCpf: r.responsavel_cpf || '',
    respEmail: r.responsavel_email || '', respPhone: r.responsavel_telefone || '',
    cep: r.cep || '', logradouro: r.logradouro || '', numero: r.numero || '', complemento: r.complemento || '',
    bairro: r.bairro || '', cidade: r.cidade || '', uf: r.uf || '',
    source: r.origem || '', segment: r.segmento || '', attendant: r.atendente || '', obs: r.observacoes || '',
    planoId: r.plano_id || '', plano: (r.plano && r.plano.nome) || ex.plano || '', planoPreco: r.plano ? Number(r.plano.preco) : null,
    empresaId: r.empresa_id || '', // setado quando provisionado
    subdominio: ex.subdominio || '', statusLoja: ex.status || '',
    status: r.status || 'novo',
    date: fmtDataBR(r.created_at),
    createdAt: r.created_at,
  };
}

const clienteSchema = z.object({
  tipo: z.enum(['pf', 'pj']).default('pf'),
  name: z.string().trim().max(160).optional().default(''),
  nomeSocial: z.string().trim().max(160).optional().default(''),
  razao: z.string().trim().max(160).optional().default(''),
  fantasia: z.string().trim().max(160).optional().default(''),
  cpf: z.string().trim().max(20).optional().default(''),
  cnpj: z.string().trim().max(24).optional().default(''),
  rg: z.string().trim().max(24).optional().default(''),
  ie: z.string().trim().max(24).optional().default(''),
  birth: z.string().trim().max(20).optional().default(''),
  phone: z.string().trim().max(40).optional().default(''),
  email: z.string().trim().max(160).optional().default(''),
  respName: z.string().trim().max(160).optional().default(''),
  respRole: z.string().trim().max(60).optional().default(''),
  respCpf: z.string().trim().max(20).optional().default(''),
  respEmail: z.string().trim().max(160).optional().default(''),
  respPhone: z.string().trim().max(40).optional().default(''),
  cep: z.string().trim().max(12).optional().default(''),
  logradouro: z.string().trim().max(160).optional().default(''),
  numero: z.string().trim().max(20).optional().default(''),
  complemento: z.string().trim().max(120).optional().default(''),
  bairro: z.string().trim().max(120).optional().default(''),
  cidade: z.string().trim().max(120).optional().default(''),
  uf: z.string().trim().max(2).optional().default(''),
  source: z.string().trim().max(60).optional().default(''),
  segment: z.string().trim().max(40).optional().default(''),
  attendant: z.string().trim().max(120).optional().default(''),
  obs: z.string().trim().max(4000).optional().default(''),
  // Campos da "plataforma" (sem coluna própria -> vão pro extras jsonb): plano pretendido, subdomínio desejado, status.
  plan: z.string().trim().max(40).optional().default(''),
  status: z.string().trim().max(40).optional().default(''),
  subdomain: z.string().trim().max(80).optional().default(''),
  planoId: z.union([z.string().uuid(), z.literal('')]).optional().default(''),
}).strip();

function toDb(b) {
  const isPJ = b.tipo === 'pj';
  const displayName = isPJ ? (b.fantasia || b.razao) : b.name;
  return {
    tipo_pessoa: isPJ ? 'pj' : 'pf',
    nome: (displayName || '').trim() || (isPJ ? 'Loja' : 'Cliente'), // coluna NOT NULL
    razao_social: b.razao || null,
    nome_fantasia: b.fantasia || null,
    cpf: b.cpf || null, cnpj: b.cnpj || null, rg: b.rg || null, inscricao_estadual: b.ie || null,
    nascimento: b.birth || null, nome_social: b.nomeSocial || null,
    email: b.email || null, telefone: b.phone || null,
    responsavel_nome: b.respName || null, responsavel_cargo: b.respRole || null, responsavel_cpf: b.respCpf || null,
    responsavel_email: b.respEmail || null, responsavel_telefone: b.respPhone || null,
    cep: b.cep || null, logradouro: b.logradouro || null, numero: b.numero || null, complemento: b.complemento || null,
    bairro: b.bairro || null, cidade: b.cidade || null, uf: b.uf || null,
    origem: b.source || null, segmento: b.segment || null, atendente: b.attendant || null, observacoes: b.obs || null,
    // Vínculo por ID com o plano (à prova de rename).
    plano_id: b.planoId || null,
    // plano(nome)/subdomínio/status sem coluna própria -> extras (jsonb). plano fica como cópia/legado do nome.
    extras: { plano: b.plan || null, subdominio: b.subdomain || null, status: b.status || null },
  };
}

// Espelha a validação de obrigatórios do front (defesa no servidor).
function obrigatoriosFaltando(b) {
  const isPJ = b.tipo === 'pj';
  const nome = (isPJ ? b.razao : b.name) || '';
  const doc = (isPJ ? b.cnpj : b.cpf) || '';
  if (!nome.trim()) return isPJ ? 'Informe a razão social.' : 'Informe o nome.';
  if (!doc.trim()) return isPJ ? 'Informe o CNPJ.' : 'Informe o CPF.';
  if (!(b.email || '').trim()) return 'Informe o e-mail.';
  return null;
}

// Identidade de EXIBIÇÃO do dono (a partir do cadastro): nome social (fallback nome) + cargo.
// Gravada/espelhada no user_metadata do Auth — POR-USUÁRIO, não vaza entre membros da loja.
function donoIdentidade(cli) {
  const isPJ = cli.tipo_pessoa === 'pj';
  const fallback = (isPJ ? (cli.responsavel_nome || cli.nome_fantasia || cli.razao_social) : cli.nome) || cli.nome || 'Dono';
  const name = (cli.nome_social && cli.nome_social.trim()) || fallback;
  const cargo = isPJ ? (cli.responsavel_cargo || null) : null;
  return { name, cargo };
}

// Lista TODOS os cadastros da plataforma (mais recentes primeiro).
plataformaRouter.get('/clientes', async (req, res, next) => {
  try {
    const { data, error } = await db().from('plataforma_clientes').select('*, plano:planos(id, nome, preco)').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ clientes: (data || []).map(mapCliente) });
  } catch (err) { next(err); }
});

// Cria um cadastro de cliente da plataforma.
plataformaRouter.post('/clientes', validateBody(clienteSchema), async (req, res, next) => {
  try {
    const falta = obrigatoriosFaltando(req.body);
    if (falta) return res.status(422).json({ error: falta });
    const { data, error } = await db().from('plataforma_clientes').insert(toDb(req.body)).select('*, plano:planos(id, nome, preco)').single();
    if (error) throw error;
    res.status(201).json({ cliente: mapCliente(data) });
  } catch (err) { next(err); }
});

// Edita um cadastro (o front manda o formulário completo).
plataformaRouter.patch('/clientes/:id', validateBody(clienteSchema.partial()), async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const falta = obrigatoriosFaltando(req.body);
    if (falta) return res.status(422).json({ error: falta });
    // Estado ANTERIOR (p/ detectar se a identidade de exibição realmente mudou).
    const { data: antes } = await db().from('plataforma_clientes').select('*').eq('id', id).single();
    const patch = { ...toDb(req.body), updated_at: new Date().toISOString() };
    const { data, error } = await db().from('plataforma_clientes').update(patch).eq('id', id).select('*, plano:planos(id, nome, preco)').single();
    if (error) throw error;
    // Re-sync best-effort do nome social + cargo no Auth do dono — SÓ se provisionado
    // E SÓ se a identidade de exibição MUDOU (compara o valor ANTERIOR guardado vs o novo).
    // Como o form manda o body CHEIO, comparar "está no req.body" não serve — comparar
    // vs o valor guardado evita clobberar a escolha que o usuário fez no próprio Perfil.
    // O cadastro é a fonte da verdade; se o Auth falhar, loga e segue (NÃO bloqueia o salvar).
    if (data && data.empresa_id) {
      try {
        const novo = donoIdentidade(data);
        const velho = antes ? donoIdentidade(antes) : { name: null, cargo: null };
        const mudou = novo.name !== velho.name || (novo.cargo || null) !== (velho.cargo || null);
        if (mudou) {
          const { data: ms } = await db().from('empresa_membros').select('user_id').eq('empresa_id', data.empresa_id).eq('papel', 'admin').limit(1);
          const donoUserId = ms && ms[0] && ms[0].user_id;
          if (donoUserId) await db().auth.admin.updateUserById(donoUserId, { user_metadata: { name: novo.name, cargo: novo.cargo || null } });
        }
      } catch (e) {
        console.error('[plataforma] re-sync nome/cargo do Auth (best-effort) falhou:', (e && e.message) || e);
      }
    }
    res.json({ cliente: mapCliente(data) });
  } catch (err) { next(err); }
});

// Exclui um cadastro.
plataformaRouter.delete('/clientes/:id', async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const { error } = await db().from('plataforma_clientes').delete().eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// =====================================================================
// PLANOS (catálogo da plataforma — tabela "planos", migration 0025)
// =====================================================================

// DB -> DTO (mistura campos dos cards + campos do formulário do wizard).
function mapPlano(r, lojasCount) {
  const rec = r.recursos || {};
  const canais = rec.canais || {};
  const channelsStr = [canais.whatsapp && 'WhatsApp', canais.instagram && 'Instagram', canais.facebook && 'Facebook', canais.site && 'Chat de site'].filter(Boolean).join(' + ') || '—';
  return {
    id: r.id,
    name: r.nome,
    features: r.descricao || '',
    price: Number(r.preco) || 0,
    conv: r.conversas == null ? null : r.conversas,   // null = ilimitado
    users: r.usuarios == null ? null : r.usuarios,
    channels: channelsStr,
    active: lojasCount || 0,
    cor: r.cor || '#22C55E',
    destaque: !!r.destaque,
    status: !!r.status,
    ciclo: r.ciclo || 'mensal',
    conversasIlim: r.conversas == null,
    usuariosIlim: r.usuarios == null,
    iaNivel: r.ia_nivel || 'basica',
    iaAgentes: r.ia_agentes != null ? r.ia_agentes : 1,
    crm: r.crm || '1funil',
    relatorios: r.relatorios || 'basico',
    suporte: r.suporte || 'padrao',
    trial: !!r.trial,
    trialDias: r.trial_dias != null ? r.trial_dias : 0,
    canais: { whatsapp: !!canais.whatsapp, instagram: !!canais.instagram, facebook: !!canais.facebook, site: !!canais.site },
    modulos: rec.modulos || { comercial: false, financeiro: false, agenda: false, catalogo: false, marketing: false },
    avancados: rec.avancados || { api: false, automacoes: false, whitelabel: false, dominio: false },
    ordem: r.ordem || 0,
  };
}

const planoSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do plano.').max(80),
  descricao: z.string().trim().max(300).optional().default(''),
  preco: z.coerce.number().min(0).optional().default(0),
  ciclo: z.enum(['mensal', 'anual']).optional().default('mensal'),
  cor: z.string().trim().max(20).optional().default('#22C55E'),
  conversas: z.coerce.number().int().min(0).optional().default(0),
  conversasIlim: z.boolean().optional().default(false),
  usuarios: z.coerce.number().int().min(0).optional().default(0),
  usuariosIlim: z.boolean().optional().default(false),
  iaNivel: z.enum(['basica', 'avancada']).optional().default('basica'),
  iaAgentes: z.coerce.number().int().min(0).optional().default(1),
  crm: z.string().trim().max(20).optional().default('1funil'),
  relatorios: z.string().trim().max(20).optional().default('basico'),
  suporte: z.string().trim().max(20).optional().default('padrao'),
  trial: z.boolean().optional().default(false),
  trialDias: z.coerce.number().int().min(0).optional().default(0),
  destaque: z.boolean().optional().default(false),
  status: z.boolean().optional().default(true),
  ordem: z.coerce.number().int().optional().default(0),
  canais: z.record(z.boolean()).optional().default({}),
  modulos: z.record(z.boolean()).optional().default({}),
  avancados: z.record(z.boolean()).optional().default({}),
}).strip();

function planoToDb(b) {
  return {
    nome: b.nome,
    descricao: b.descricao || null,
    preco: Number(b.preco) || 0,
    ciclo: b.ciclo || 'mensal',
    cor: b.cor || '#22C55E',
    conversas: b.conversasIlim ? null : (Number(b.conversas) || 0),
    usuarios: b.usuariosIlim ? null : (Number(b.usuarios) || 0),
    ia_nivel: b.iaNivel || 'basica',
    ia_agentes: Number(b.iaAgentes) || 0,
    crm: b.crm || '1funil',
    relatorios: b.relatorios || 'basico',
    suporte: b.suporte || 'padrao',
    trial: !!b.trial,
    trial_dias: Number(b.trialDias) || 0,
    destaque: !!b.destaque,
    status: b.status == null ? true : !!b.status,
    ordem: Number(b.ordem) || 0,
    recursos: { canais: b.canais || {}, modulos: b.modulos || {}, avancados: b.avancados || {} },
  };
}

// Conta as "lojas" por plano = plataforma_clientes vinculados pelo plano_id.
// Mapa indexado por plano_id (à prova de rename).
async function contarLojasPorPlano() {
  const { data, error } = await db().from('plataforma_clientes').select('plano_id');
  if (error) throw error;
  const map = {};
  (data || []).forEach((r) => { if (r.plano_id) map[r.plano_id] = (map[r.plano_id] || 0) + 1; });
  return map;
}

// Lista planos (ordenados) + contagem de lojas.
plataformaRouter.get('/planos', async (req, res, next) => {
  try {
    const { data, error } = await db().from('planos').select('*').order('ordem', { ascending: true }).order('preco', { ascending: true });
    if (error) throw error;
    const counts = await contarLojasPorPlano();
    res.json({ planos: (data || []).map((r) => mapPlano(r, counts[r.id] || 0)) });
  } catch (err) { next(err); }
});

// Lojas (cadastros) de um plano — para o "Ver quais" do apagar.
plataformaRouter.get('/planos/:id/lojas', async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const { data: all, error: e1 } = await db().from('plataforma_clientes').select('id, nome, tipo_pessoa, plano_id').eq('plano_id', id);
    if (e1) throw e1;
    const lojas = (all || []).map((r) => ({ id: r.id, name: r.nome, tipo: r.tipo_pessoa }));
    res.json({ lojas });
  } catch (err) { next(err); }
});

// Cria um plano.
plataformaRouter.post('/planos', validateBody(planoSchema), async (req, res, next) => {
  try {
    const { data, error } = await db().from('planos').insert(planoToDb(req.body)).select('*').single();
    if (error) throw error;
    res.status(201).json({ plano: mapPlano(data, 0) });
  } catch (err) { next(err); }
});

// Edita um plano (o front manda o formulário completo).
plataformaRouter.patch('/planos/:id', validateBody(planoSchema), async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const patch = { ...planoToDb(req.body), updated_at: new Date().toISOString() };
    const { data, error } = await db().from('planos').update(patch).eq('id', id).select('*').single();
    if (error) throw error;
    const counts = await contarLojasPorPlano();
    res.json({ plano: mapPlano(data, counts[data.id] || 0) });
  } catch (err) { next(err); }
});

// Migra as lojas (plataforma_clientes) de um plano para outro (passo 1 do apagar).
plataformaRouter.post('/planos/:id/migrar', validateBody(z.object({ para: z.string().uuid('plano de destino inválido') }).strip()), async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const paraId = req.body.para; // id do plano DESTINO
    const { data: destino, error: e0 } = await db().from('planos').select('id, nome').eq('id', paraId).single();
    if (e0) throw e0;
    const { data: refs, error: e1 } = await db().from('plataforma_clientes').select('id, extras').eq('plano_id', id);
    if (e1) throw e1;
    for (const r of (refs || [])) {
      const ex = { ...(r.extras || {}), plano: destino.nome }; // mantém o nome legado em sincronia
      const { error: eu } = await db().from('plataforma_clientes').update({ plano_id: paraId, extras: ex, updated_at: new Date().toISOString() }).eq('id', r.id);
      if (eu) throw eu;
    }
    res.json({ migradas: (refs || []).length, para: destino.nome });
  } catch (err) { next(err); }
});

// Apaga um plano — só se não houver lojas usando (respeita a migração).
plataformaRouter.delete('/planos/:id', async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const counts = await contarLojasPorPlano();
    const usando = counts[id] || 0;
    if (usando > 0) return res.status(409).json({ error: `Este plano tem ${usando} loja(s). Migre-as para outro plano antes de apagar.`, lojas: usando });
    const { error } = await db().from('planos').delete().eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// =====================================================================
// PROVISIONAMENTO (cadastro -> tenant real: empresa + login do dono)
// =====================================================================

// Senha provisória legível (12 chars, sem caracteres ambíguos), mostrada 1x.
function gerarSenhaProvisoria() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(12);
  let s = '';
  for (let i = 0; i < 12; i++) s += chars[bytes[i] % chars.length];
  return s;
}

const provisionarSchema = z.object({ trial: z.boolean().optional() }).strip();

// Transforma um cadastro em tenant real. Idempotente (trava se já provisionado).
plataformaRouter.post('/clientes/:id/provisionar', validateBody(provisionarSchema), async (req, res, next) => {
  try {
    const id = uuid.parse(req.params.id);
    const sb = db();

    // 1) Carrega o cadastro.
    const { data: cli, error: e0 } = await sb.from('plataforma_clientes').select('*').eq('id', id).single();
    if (e0 || !cli) return res.status(404).json({ error: 'Cadastro não encontrado.' });

    // 2) Trava de idempotência: já provisionado?
    if (cli.empresa_id) return res.status(409).json({ error: 'Este cliente já foi provisionado.', empresaId: cli.empresa_id });

    // 3) E-mail e nome do dono. PJ -> responsável; PF/sem responsável -> e-mail principal.
    const isPJ = cli.tipo_pessoa === 'pj';
    const ownerEmail = ((isPJ && cli.responsavel_email) ? cli.responsavel_email : cli.email || '').trim();
    if (!ownerEmail) return res.status(422).json({ error: 'Cliente sem e-mail para o dono — preencha o e-mail do responsável (PJ) ou o e-mail principal.' });
    const { name: ownerName, cargo: ownerCargo } = donoIdentidade(cli);
    const empresaNome = cli.nome_fantasia || cli.razao_social || cli.nome || 'Loja';

    // 4) Plano (pra default do trial e pro empresa_user.plano_id).
    let plano = null;
    if (cli.plano_id) {
      const r = await sb.from('planos').select('id, nome, trial, trial_dias').eq('id', cli.plano_id).single();
      if (!r.error) plano = r.data;
    }
    // Trial = escolha do super admin; padrão vem do plano.
    const usarTrial = (req.body.trial !== undefined) ? !!req.body.trial : !!(plano && plano.trial);
    const status = usarTrial ? 'trial' : 'ativo';
    let trialAte = null;
    if (usarTrial) {
      const dias = (plano && plano.trial_dias) ? plano.trial_dias : 7;
      const d = new Date(); d.setDate(d.getDate() + dias);
      trialAte = d.toISOString().slice(0, 10);
    }

    // 5) Papel admin_loja (pro vínculo do dono).
    const { data: papel, error: ep } = await sb.from('papeis').select('id').eq('codigo', 'admin_loja').single();
    if (ep || !papel) return res.status(500).json({ error: 'Papel admin_loja não encontrado (rodou a migration 0020?).' });

    // 6) Cria (ou reaproveita) o usuário dono no Supabase Auth. email_confirm -> loga direto.
    const senha = gerarSenhaProvisoria();
    let userId, reusouUsuario = false, senhaRetorno = senha;
    const created = await sb.auth.admin.createUser({ email: ownerEmail, password: senha, email_confirm: true, user_metadata: { name: ownerName, cargo: ownerCargo || null } });
    if (created.error) {
      if (/already.*(registered|exists)|email.*exists|duplicate/i.test(created.error.message)) {
        // Usuário já existe -> reaproveita (sem trocar a senha dele).
        const list = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
        const u = ((list.data && list.data.users) || []).find((x) => (x.email || '').toLowerCase() === ownerEmail.toLowerCase());
        if (!u) throw created.error;
        userId = u.id; reusouUsuario = true; senhaRetorno = null;
      } else throw created.error;
    } else {
      userId = created.data.user.id;
    }

    // 7) Cria a empresa (tenant) com plano + status. (Compensação se algo abaixo falhar.)
    const empIns = await sb.from('empresa_user').insert({
      nome: empresaNome, plano_id: cli.plano_id || null, status, trial_ate: trialAte, provisionado_em: new Date().toISOString(),
    }).select('id').single();
    if (empIns.error) throw empIns.error;
    const empresaId = empIns.data.id;

    // Matriz automática da nova empresa (multi-filial transparente p/ loja única).
    const filIns = await sb.from('filiais').insert({ empresa_id: empresaId, nome: 'Matriz', is_matriz: true, ativo: true });
    if (filIns.error) { await sb.from('empresa_user').delete().eq('id', empresaId); throw filIns.error; }

    // 8) Vincula o dono como admin_loja (RLS passa a isolar automaticamente).
    const lnk = await sb.from('empresa_membros').upsert(
      { user_id: userId, empresa_id: empresaId, papel: 'admin', papel_id: papel.id },
      { onConflict: 'user_id,empresa_id' },
    );
    if (lnk.error) { await sb.from('empresa_user').delete().eq('id', empresaId); throw lnk.error; }

    // 9) Liga o cadastro ao tenant + marca ativo.
    const upd = await sb.from('plataforma_clientes').update({ empresa_id: empresaId, status: 'ativo', updated_at: new Date().toISOString() }).eq('id', id);
    if (upd.error) {
      await sb.from('empresa_membros').delete().eq('user_id', userId).eq('empresa_id', empresaId);
      await sb.from('empresa_user').delete().eq('id', empresaId);
      throw upd.error;
    }

    res.status(201).json({
      ok: true,
      empresaId,
      ownerEmail,
      senhaProvisoria: senhaRetorno, // null se reaproveitou um usuário já existente
      reusouUsuario,
      status,
      trialAte,
      plano: plano ? plano.nome : null,
    });
  } catch (err) { next(err); }
});
