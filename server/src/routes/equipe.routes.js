// equipe.routes.js — KPIs de venda por vendedor (tela Equipe / AdminTeam).
//   Agrega vendas por vendedor_id (= id do usuário logado no Auth = empresa_membros.user_id).
//   Período = mês atual. SÓ status='concluida' (cancelada NÃO conta). Isolamento por empresa_id.
import crypto from 'crypto';
import multer from 'multer';
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requirePermissao, carregarAutorizacao } from '../lib/autorizacao.js';
import { adminClient } from '../lib/supabase.js';

const BUCKET = 'arquivos'; // bucket público reaproveitado (mesmo do perfil/chat)
const fotoUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } }); // 2MB

export const equipeRouter = Router();
equipeRouter.use(requireAuth);
// Mesma porta de entrada da listagem de membros (GET /agenda/usuarios usa agenda.ver).
equipeRouter.use((req, res, next) => requirePermissao('agenda.ver')(req, res, next));

const db = () => adminClient();

// Senha provisória forte (mesmo padrão do provisionamento de tenant).
function gerarSenhaProvisoria() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(12);
  let s = '';
  for (let i = 0; i < 12; i++) s += chars[bytes[i] % chars.length];
  return s;
}

// ⚠️ ALLOW-LIST de papéis que um ADMIN DE LOJA pode criar — TRAVA NO BACK.
//    Mapeia o que o front manda -> código real em `papeis`. 'vendedor' = 'atendente'
//    (vendedor é um atendente). super_admin / plataforma NUNCA entram aqui.
const PAPEIS_PERMITIDOS = { atendente: 'atendente', vendedor: 'atendente', admin: 'admin_loja', admin_loja: 'admin_loja' };
// Coluna empresa_membros.papel (token curto), espelhando o provisionamento.
const MEMBRO_PAPEL = { atendente: 'atendente', admin_loja: 'admin' };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Para onde o link do convite volta: a tela "Criar sua senha" (SPA). Base via env
// (APP_URL/APP_BASE_URL) ou Origin da requisição; fallback = produção (Vercel).
// /ATENDE.IA.html funciona local e na Vercel; o Supabase anexa #access_token=...&type=invite.
function inviteRedirect(req) {
  const base = (process.env.APP_URL || process.env.APP_BASE_URL || req.headers.origin || 'https://atendeai-cyan.vercel.app').replace(/\/+$/, '');
  return base + '/ATENDE.IA.html';
}
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

async function getEmpresaId(req) {
  if (req._empresaId !== undefined) return req._empresaId;
  if (req._auth && req._auth.empresaId != null) { req._empresaId = req._auth.empresaId; return req._empresaId; }
  const { data } = await req.supabase.from('empresa_membros').select('empresa_id').limit(1);
  req._empresaId = data && data[0] ? data[0].empresa_id : null;
  return req._empresaId;
}

// GET /api/equipe/kpis — { periodo, kpis: { <vendedor_id>: { vendido, num_vendas, ticket_medio } } }
equipeRouter.get('/kpis', async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const now = new Date();
    const ini = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const fim = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    const periodo = { ano: now.getFullYear(), mes: now.getMonth() + 1, label: MESES[now.getMonth()] + '/' + now.getFullYear() };
    if (!empresaId) return res.json({ periodo, kpis: {} });

    const { data, error } = await db().from('vendas')
      .select('vendedor_id,total')
      .eq('empresa_id', empresaId)
      .eq('status', 'concluida')           // CANCELADA não conta
      .gte('created_at', ini).lt('created_at', fim);
    if (error) throw error;

    const acc = {};
    (data || []).forEach((v) => {
      if (!v.vendedor_id) return;
      const a = acc[v.vendedor_id] || (acc[v.vendedor_id] = { vendido: 0, num_vendas: 0 });
      a.vendido += Number(v.total) || 0;
      a.num_vendas += 1;
    });
    const kpis = {};
    Object.keys(acc).forEach((k) => {
      kpis[k] = { vendido: acc[k].vendido, num_vendas: acc[k].num_vendas, ticket_medio: acc[k].num_vendas ? acc[k].vendido / acc[k].num_vendas : 0 };
    });
    res.json({ periodo, kpis });
  } catch (err) { next(err); }
});

// POST /api/equipe/usuarios — ADMIN DE LOJA cria um membro com SENHA PROVISÓRIA.
//   Segurança: gate config.gerenciar · papel via ALLOW-LIST (nunca super_admin) ·
//   isolamento: empresa do admin logado (req._auth, do JWT) — NUNCA do body.
equipeRouter.post('/usuarios', requirePermissao('config.gerenciar'), async (req, res, next) => {
  try {
    const auth = await carregarAutorizacao(req);
    const empresaId = auth && auth.empresaId;
    if (!empresaId) return res.status(400).json({ error: 'Sua conta não está vinculada a nenhuma empresa.' });

    const b = req.body || {};
    const nomeCompleto = String(b.nomeCompleto || b.nome || '').trim();
    const apelido = String(b.name || b.apelido || '').trim();
    const email = String(b.email || '').trim().toLowerCase();
    const telefone = String(b.telefone || '').trim();
    const cpf = String(b.cpf || '').trim();
    const cargo = String(b.cargo || '').trim();
    const departamento = String(b.departamento || '').trim();
    const nascimento = String(b.nascimento || '').trim();
    const endereco = String(b.endereco || '').trim();
    const bio = String(b.bio || '').trim();
    const cidade = String(b.cidade || '').trim();
    const uf = String(b.uf || '').trim().toUpperCase().slice(0, 2);

    // Validação (espelha os obrigatórios do front).
    if (!nomeCompleto) return res.status(422).json({ error: 'Informe o nome completo.' });
    if (!apelido) return res.status(422).json({ error: 'Informe como o usuário prefere ser chamado.' });
    if (!EMAIL_RE.test(email)) return res.status(422).json({ error: 'E-mail inválido.' });
    if (!telefone) return res.status(422).json({ error: 'Informe o telefone.' });
    if (!cpf) return res.status(422).json({ error: 'Informe o CPF.' });

    // Papel pela ALLOW-LIST (trava no back). Default atendente.
    const papelCodigo = PAPEIS_PERMITIDOS[String(b.papel || 'atendente').toLowerCase()];
    if (!papelCodigo) return res.status(403).json({ error: 'Papel não permitido.' });

    const { data: papelRow, error: ep } = await db().from('papeis').select('id, codigo').eq('codigo', papelCodigo).single();
    if (ep || !papelRow) return res.status(500).json({ error: `Papel "${papelCodigo}" não encontrado (rodou a migration 0020?).` });

    // 1) CONVITE por e-mail: cria o usuário SEM senha e dispara o e-mail (SMTP).
    //    Quem define a senha é o próprio convidado, na tela "Criar sua senha".
    const meta = { name: apelido, nomeCompleto, telefone, cpf, cargo: cargo || null, departamento, nascimento, endereco, bio, cidade, uf };
    const redirectTo = inviteRedirect(req);
    const invited = await db().auth.admin.inviteUserByEmail(email, { data: meta, redirectTo });
    if (invited.error) {
      // E-mail já cadastrado -> não quebra; 409 (reenvio de convite fica pra polish).
      if (/already.*(registered|exists)|email.*exists|duplicate/i.test(invited.error.message)) {
        return res.status(409).json({ error: 'Usuário já cadastrado.' });
      }
      // Falha de ENVIO do e-mail (endereço inválido/SMTP) -> mensagem clara, não 500 genérico.
      if (/sending.*(invite|email)|smtp|e-?mail/i.test(invited.error.message)) {
        return res.status(502).json({ error: 'Não foi possível enviar o convite por e-mail. Confira o endereço e tente de novo.' });
      }
      throw invited.error;
    }
    const userId = invited.data.user.id;

    // 2) Vincula à empresa DO ADMIN (isolamento). upsert -> idempotente por (user,empresa).
    const lnk = await db().from('empresa_membros').upsert(
      { user_id: userId, empresa_id: empresaId, papel: MEMBRO_PAPEL[papelCodigo] || 'atendente', papel_id: papelRow.id },
      { onConflict: 'user_id,empresa_id' },
    );
    if (lnk.error) {
      // Compensação: se acabamos de criar o usuário, remove o órfão.
      if (!reusou) { try { await db().auth.admin.deleteUser(userId); } catch (e) {} }
      throw lnk.error;
    }

    res.status(201).json({ ok: true, userId, email, papel: papelCodigo, convidado: true });
  } catch (err) { next(err); }
});

// Confirma que o alvo é membro DA EMPRESA DO ADMIN (isolamento). Retorna a linha ou null.
async function membroDaEmpresa(userId, empresaId) {
  const { data } = await db().from('empresa_membros')
    .select('user_id, empresa_id, papel, papel_id')
    .eq('user_id', userId).eq('empresa_id', empresaId).maybeSingle();
  return data || null;
}

// PATCH /api/equipe/usuarios/:id — edita dados (metadados) + papel (allow-list). Isolado.
equipeRouter.patch('/usuarios/:id', requirePermissao('config.gerenciar'), async (req, res, next) => {
  try {
    const auth = await carregarAutorizacao(req);
    const empresaId = auth && auth.empresaId;
    if (!empresaId) return res.status(400).json({ error: 'Sua conta não está vinculada a nenhuma empresa.' });
    const id = String(req.params.id || '');
    const mem = await membroDaEmpresa(id, empresaId);
    if (!mem) return res.status(404).json({ error: 'Usuário não encontrado nesta empresa.' });

    const b = req.body || {};
    // Metadados: pega o atual e mescla só o que veio.
    const cur = await db().auth.admin.getUserById(id);
    const md = (cur && cur.data && cur.data.user && cur.data.user.user_metadata) || {};
    const meta = { ...md };
    if (b.name !== undefined) meta.name = String(b.name).trim();
    if (b.nomeCompleto !== undefined) meta.nomeCompleto = String(b.nomeCompleto).trim();
    if (b.telefone !== undefined) meta.telefone = String(b.telefone).trim();
    if (b.cpf !== undefined) meta.cpf = String(b.cpf).trim();
    if (b.cargo !== undefined) meta.cargo = String(b.cargo).trim();
    if (b.departamento !== undefined) meta.departamento = String(b.departamento).trim();
    if (b.nascimento !== undefined) meta.nascimento = String(b.nascimento).trim();
    if (b.endereco !== undefined) meta.endereco = String(b.endereco).trim();
    if (b.bio !== undefined) meta.bio = String(b.bio).trim();
    if (b.cidade !== undefined) meta.cidade = String(b.cidade).trim();
    if (b.uf !== undefined) meta.uf = String(b.uf).trim().toUpperCase().slice(0, 2);
    if (b.ativo !== undefined) meta.ativo = !!b.ativo;
    if (b.removerFoto === true) meta.foto_url = '';
    const upd = await db().auth.admin.updateUserById(id, { user_metadata: meta });
    if (upd.error) throw upd.error;
    if (b.removerFoto === true) { try { await db().storage.from(BUCKET).remove(['avatares/' + id]); } catch (e) {} }

    // Papel (opcional) — sempre pela ALLOW-LIST (nunca super_admin).
    if (b.papel !== undefined) {
      const papelCodigo = PAPEIS_PERMITIDOS[String(b.papel).toLowerCase()];
      if (!papelCodigo) return res.status(403).json({ error: 'Papel não permitido.' });
      const { data: papelRow } = await db().from('papeis').select('id').eq('codigo', papelCodigo).single();
      if (papelRow) await db().from('empresa_membros').update({ papel: MEMBRO_PAPEL[papelCodigo] || 'atendente', papel_id: papelRow.id }).eq('user_id', id).eq('empresa_id', empresaId);
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/equipe/usuarios/:id — DESVINCULA da empresa do admin (não apaga o Auth global,
//   pois o usuário pode pertencer a outras lojas). Bloqueia auto-remoção.
equipeRouter.delete('/usuarios/:id', requirePermissao('config.gerenciar'), async (req, res, next) => {
  try {
    const auth = await carregarAutorizacao(req);
    const empresaId = auth && auth.empresaId;
    if (!empresaId) return res.status(400).json({ error: 'Sua conta não está vinculada a nenhuma empresa.' });
    const id = String(req.params.id || '');
    if (id === req.user.id) return res.status(400).json({ error: 'Você não pode remover a si mesmo.' });
    const mem = await membroDaEmpresa(id, empresaId);
    if (!mem) return res.status(404).json({ error: 'Usuário não encontrado nesta empresa.' });
    const del = await db().from('empresa_membros').delete().eq('user_id', id).eq('empresa_id', empresaId);
    if (del.error) throw del.error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/equipe/usuarios/:id/reset-senha — admin gera nova senha provisória. Isolado.
equipeRouter.post('/usuarios/:id/reset-senha', requirePermissao('config.gerenciar'), async (req, res, next) => {
  try {
    const auth = await carregarAutorizacao(req);
    const empresaId = auth && auth.empresaId;
    if (!empresaId) return res.status(400).json({ error: 'Sua conta não está vinculada a nenhuma empresa.' });
    const id = String(req.params.id || '');
    const mem = await membroDaEmpresa(id, empresaId);
    if (!mem) return res.status(404).json({ error: 'Usuário não encontrado nesta empresa.' });
    const senha = gerarSenhaProvisoria();
    const upd = await db().auth.admin.updateUserById(id, { password: senha });
    if (upd.error) throw upd.error;
    let email = null;
    try { const g = await db().auth.admin.getUserById(id); email = g && g.data && g.data.user && g.data.user.email; } catch (e) {}
    res.json({ ok: true, email, senhaProvisoria: senha, reset: true });
  } catch (err) { next(err); }
});

// POST /api/equipe/usuarios/:id/foto — admin sobe a foto do membro (bucket "arquivos"). Isolado.
equipeRouter.post('/usuarios/:id/foto', requirePermissao('config.gerenciar'), fotoUpload.single('foto'), async (req, res, next) => {
  try {
    const auth = await carregarAutorizacao(req);
    const empresaId = auth && auth.empresaId;
    if (!empresaId) return res.status(400).json({ error: 'Sua conta não está vinculada a nenhuma empresa.' });
    const id = String(req.params.id || '');
    const mem = await membroDaEmpresa(id, empresaId);
    if (!mem) return res.status(404).json({ error: 'Usuário não encontrado nesta empresa.' });
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    if (!/^image\/(png|jpe?g|webp)$/i.test(req.file.mimetype)) return res.status(400).json({ error: 'Envie uma imagem PNG, JPG ou WebP.' });
    const path = `avatares/${id}`;
    const storage = db().storage.from(BUCKET);
    const up = await storage.upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
    if (up.error) throw up.error;
    const publicUrl = storage.getPublicUrl(path).data.publicUrl + '?v=' + req.file.size; // cache-bust
    const cur = await db().auth.admin.getUserById(id);
    const meta = { ...((cur && cur.data && cur.data.user && cur.data.user.user_metadata) || {}), foto_url: publicUrl };
    const { error } = await db().auth.admin.updateUserById(id, { user_metadata: meta });
    if (error) throw error;
    res.status(201).json({ ok: true, fotoUrl: publicUrl });
  } catch (err) { next(err); }
});
