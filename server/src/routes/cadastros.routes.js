// cadastros.routes.js — Cadastros gerais (Departamentos, e futuros: Lojas, etc.).
// Gate config.gerenciar (admin da loja). Isolamento: empresa do admin (req._auth/JWT).
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requirePermissao, carregarAutorizacao } from '../lib/autorizacao.js';
import { adminClient } from '../lib/supabase.js';

export const cadastrosRouter = Router();
cadastrosRouter.use(requireAuth);
cadastrosRouter.use((req, res, next) => requirePermissao('config.gerenciar')(req, res, next));

const db = () => adminClient();
async function empresaDe(req) { const a = await carregarAutorizacao(req); return a && a.empresaId; }
const mapDep = (d) => ({ id: d.id, nome: d.nome, descricao: d.descricao || '', ativo: d.ativo !== false, responsavel: d.responsavel_nome || '', responsavelId: d.responsavel_id || null, distribuicao: d.distribuicao === 'auto' ? 'auto' : 'manual', criadoEm: d.created_at });
const nomeDoUsuario = (req) => (req.user && req.user.user_metadata && req.user.user_metadata.name) || (req.user && req.user.email) || null;

// GET /api/cadastros/departamentos — lista (ativos + inativos) da empresa.
cadastrosRouter.get('/departamentos', async (req, res, next) => {
  try {
    const empresaId = await empresaDe(req);
    if (!empresaId) return res.json({ departamentos: [] });
    const { data, error } = await db().from('departamentos').select('*').eq('empresa', empresaId).order('nome');
    if (error) throw error;
    res.json({ departamentos: (data || []).map(mapDep) });
  } catch (err) { next(err); }
});

// POST /api/cadastros/departamentos
cadastrosRouter.post('/departamentos', async (req, res, next) => {
  try {
    const empresaId = await empresaDe(req);
    if (!empresaId) return res.status(400).json({ error: 'Sua conta não está vinculada a nenhuma empresa.' });
    const nome = String((req.body && req.body.nome) || '').trim();
    if (!nome) return res.status(422).json({ error: 'Informe o nome do departamento.' });
    const b0 = req.body || {};
    const ins = await db().from('departamentos').insert({
      empresa: empresaId, nome,
      descricao: String(b0.descricao || '').trim() || null,
      ativo: b0.ativo === false ? false : true,
      // Responsável: usa o escolhido no front; se não vier, cai no usuário atual.
      responsavel_id: b0.responsavelId || (req.user && req.user.id),
      responsavel_nome: b0.responsavelNome != null ? String(b0.responsavelNome).trim() : nomeDoUsuario(req),
    }).select('*').single();
    if (ins.error) throw ins.error;
    res.status(201).json({ departamento: mapDep(ins.data) });
  } catch (err) { next(err); }
});

// PATCH /api/cadastros/departamentos/:id
cadastrosRouter.patch('/departamentos/:id', async (req, res, next) => {
  try {
    const empresaId = await empresaDe(req);
    if (!empresaId) return res.status(400).json({ error: 'Sua conta não está vinculada a nenhuma empresa.' });
    const id = String(req.params.id || '');
    const b = req.body || {};
    const patch = { updated_at: new Date().toISOString() };
    if (b.nome !== undefined) { const n = String(b.nome).trim(); if (!n) return res.status(422).json({ error: 'Nome é obrigatório.' }); patch.nome = n; }
    if (b.descricao !== undefined) patch.descricao = String(b.descricao).trim() || null;
    if (b.ativo !== undefined) patch.ativo = !!b.ativo;
    if (b.responsavelId !== undefined) patch.responsavel_id = b.responsavelId || null;
    if (b.responsavelNome !== undefined) patch.responsavel_nome = b.responsavelNome != null ? String(b.responsavelNome).trim() : null;
    if (b.distribuicao !== undefined) patch.distribuicao = b.distribuicao === 'auto' ? 'auto' : 'manual';
    const upd = await db().from('departamentos').update(patch).eq('id', id).eq('empresa', empresaId).select('*').single();
    if (upd.error) throw upd.error;
    res.json({ departamento: mapDep(upd.data) });
  } catch (err) { next(err); }
});

// DELETE /api/cadastros/departamentos/:id
cadastrosRouter.delete('/departamentos/:id', async (req, res, next) => {
  try {
    const empresaId = await empresaDe(req);
    if (!empresaId) return res.status(400).json({ error: 'Sua conta não está vinculada a nenhuma empresa.' });
    const id = String(req.params.id || '');
    const del = await db().from('departamentos').delete().eq('id', id).eq('empresa', empresaId);
    if (del.error) throw del.error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// =====================================================================
// ROTEAMENTO inicial — para onde o CONTATO NOVO vai primeiro (IA ou Departamento).
//   1 linha por empresa em `atendimento_config`. RESILIENTE: se a migration 0036
//   ainda não rodou, devolve o default ('ia') sem quebrar.
// =====================================================================
const ehMigracaoFaltando036 = (e) => /does not exist|could not find|schema cache|relation|column/i.test((e && e.message) || '');

// GET /api/cadastros/roteamento
cadastrosRouter.get('/roteamento', async (req, res, next) => {
  try {
    const empresaId = await empresaDe(req);
    if (!empresaId) return res.json({ destinoTipo: 'ia', destinoDepartamentoId: null });
    try {
      const { data, error } = await db().from('atendimento_config').select('*').eq('empresa', empresaId).maybeSingle();
      if (error) throw error;
      res.json({
        destinoTipo: (data && data.destino_tipo) === 'departamento' ? 'departamento' : 'ia',
        destinoDepartamentoId: (data && data.destino_departamento_id) || null,
      });
    } catch (e) {
      if (!ehMigracaoFaltando036(e)) throw e;
      res.json({ destinoTipo: 'ia', destinoDepartamentoId: null }); // pré-migração
    }
  } catch (err) { next(err); }
});

// PUT /api/cadastros/roteamento  { destinoTipo, destinoDepartamentoId }
cadastrosRouter.put('/roteamento', async (req, res, next) => {
  try {
    const empresaId = await empresaDe(req);
    if (!empresaId) return res.status(400).json({ error: 'Sua conta não está vinculada a nenhuma empresa.' });
    const b = req.body || {};
    const tipo = b.destinoTipo === 'departamento' ? 'departamento' : 'ia';
    const depId = tipo === 'departamento' ? (b.destinoDepartamentoId || null) : null;
    const { error } = await db().from('atendimento_config').upsert(
      { empresa: empresaId, destino_tipo: tipo, destino_departamento_id: depId, updated_at: new Date().toISOString() },
      { onConflict: 'empresa' },
    );
    if (error) throw error;
    res.json({ destinoTipo: tipo, destinoDepartamentoId: depId });
  } catch (err) { next(err); }
});

// =====================================================================
// EQUIPES — cada equipe pertence a 1 departamento (opcional); N membros.
//   Isolamento: empresa do admin (req._auth/JWT). Gate config.gerenciar (router).
// =====================================================================
const mapEquipe = (e, membros, count) => ({
  id: e.id, nome: e.nome, descricao: e.descricao || '', cor: e.cor || null,
  departamentoId: e.departamento_id || null,
  responsavel: e.responsavel_nome || '', responsavelId: e.responsavel_id || null,
  ativo: e.ativo !== false,
  membros: membros || [],                 // [user_id,...]
  membrosCount: count != null ? count : (membros ? membros.length : 0),
  criadoEm: e.created_at,
});

// GET /api/cadastros/equipes  (opcional ?departamento=:id) — lista com membros.
cadastrosRouter.get('/equipes', async (req, res, next) => {
  try {
    const empresaId = await empresaDe(req);
    if (!empresaId) return res.json({ equipes: [] });
    let q = db().from('equipes').select('*').eq('empresa', empresaId).order('nome');
    const dep = String(req.query.departamento || '').trim();
    if (dep) q = q.eq('departamento_id', dep);
    const { data: eqs, error } = await q;
    if (error) throw error;
    const ids = (eqs || []).map((e) => e.id);
    // membros de todas as equipes numa query só (evita N+1).
    const byEquipe = {};
    if (ids.length) {
      const { data: rel } = await db().from('equipe_membros').select('equipe_id,user_id').in('equipe_id', ids);
      (rel || []).forEach((r) => { (byEquipe[r.equipe_id] = byEquipe[r.equipe_id] || []).push(r.user_id); });
    }
    res.json({ equipes: (eqs || []).map((e) => mapEquipe(e, byEquipe[e.id] || [])) });
  } catch (err) { next(err); }
});

// POST /api/cadastros/equipes
cadastrosRouter.post('/equipes', async (req, res, next) => {
  try {
    const empresaId = await empresaDe(req);
    if (!empresaId) return res.status(400).json({ error: 'Sua conta não está vinculada a nenhuma empresa.' });
    const b = req.body || {};
    const nome = String(b.nome || '').trim();
    if (!nome) return res.status(422).json({ error: 'Informe o nome da equipe.' });
    const ins = await db().from('equipes').insert({
      empresa: empresaId, nome,
      descricao: String(b.descricao || '').trim() || null,
      cor: String(b.cor || '').trim() || null,
      departamento_id: b.departamentoId || null,
      responsavel_id: b.responsavelId || (req.user && req.user.id) || null,
      responsavel_nome: b.responsavelNome != null ? String(b.responsavelNome).trim() : nomeDoUsuario(req),
      ativo: b.ativo === false ? false : true,
    }).select('*').single();
    if (ins.error) throw ins.error;
    // membros iniciais (opcional).
    const membros = Array.isArray(b.membros) ? b.membros.filter(Boolean) : [];
    if (membros.length) {
      await db().from('equipe_membros').upsert(membros.map((uid) => ({ equipe_id: ins.data.id, user_id: uid })), { onConflict: 'equipe_id,user_id' });
    }
    res.status(201).json({ equipe: mapEquipe(ins.data, membros) });
  } catch (err) { next(err); }
});

// PATCH /api/cadastros/equipes/:id — edita dados, departamento e (opcional) membros.
cadastrosRouter.patch('/equipes/:id', async (req, res, next) => {
  try {
    const empresaId = await empresaDe(req);
    if (!empresaId) return res.status(400).json({ error: 'Sua conta não está vinculada a nenhuma empresa.' });
    const id = String(req.params.id || '');
    const b = req.body || {};
    const patch = { updated_at: new Date().toISOString() };
    if (b.nome !== undefined) { const n = String(b.nome).trim(); if (!n) return res.status(422).json({ error: 'Nome é obrigatório.' }); patch.nome = n; }
    if (b.descricao !== undefined) patch.descricao = String(b.descricao).trim() || null;
    if (b.cor !== undefined) patch.cor = String(b.cor).trim() || null;
    if (b.departamentoId !== undefined) patch.departamento_id = b.departamentoId || null;
    if (b.responsavelId !== undefined) patch.responsavel_id = b.responsavelId || null;
    if (b.responsavelNome !== undefined) patch.responsavel_nome = String(b.responsavelNome).trim() || null;
    if (b.ativo !== undefined) patch.ativo = !!b.ativo;
    const upd = await db().from('equipes').update(patch).eq('id', id).eq('empresa', empresaId).select('*').single();
    if (upd.error) throw upd.error;
    // se vier a lista completa de membros, sincroniza (substitui).
    if (Array.isArray(b.membros)) {
      const novos = b.membros.filter(Boolean);
      await db().from('equipe_membros').delete().eq('equipe_id', id);
      if (novos.length) await db().from('equipe_membros').upsert(novos.map((uid) => ({ equipe_id: id, user_id: uid })), { onConflict: 'equipe_id,user_id' });
    }
    const { data: rel } = await db().from('equipe_membros').select('user_id').eq('equipe_id', id);
    res.json({ equipe: mapEquipe(upd.data, (rel || []).map((r) => r.user_id)) });
  } catch (err) { next(err); }
});

// DELETE /api/cadastros/equipes/:id  (membros caem por ON DELETE CASCADE)
cadastrosRouter.delete('/equipes/:id', async (req, res, next) => {
  try {
    const empresaId = await empresaDe(req);
    if (!empresaId) return res.status(400).json({ error: 'Sua conta não está vinculada a nenhuma empresa.' });
    const id = String(req.params.id || '');
    const del = await db().from('equipes').delete().eq('id', id).eq('empresa', empresaId);
    if (del.error) throw del.error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ---- Membros de uma equipe (vincular / desvincular individual) ----
// Confirma que a equipe é da empresa do admin antes de mexer nos membros.
async function equipeDaEmpresa(id, empresaId) {
  const { data } = await db().from('equipes').select('id').eq('id', id).eq('empresa', empresaId).maybeSingle();
  return !!data;
}
cadastrosRouter.post('/equipes/:id/membros', async (req, res, next) => {
  try {
    const empresaId = await empresaDe(req);
    if (!empresaId) return res.status(400).json({ error: 'Sua conta não está vinculada a nenhuma empresa.' });
    const id = String(req.params.id || '');
    const userId = String((req.body && req.body.userId) || '').trim();
    if (!userId) return res.status(422).json({ error: 'Informe o usuário.' });
    if (!(await equipeDaEmpresa(id, empresaId))) return res.status(404).json({ error: 'Equipe não encontrada.' });
    const { error } = await db().from('equipe_membros').upsert({ equipe_id: id, user_id: userId }, { onConflict: 'equipe_id,user_id' });
    if (error) throw error;
    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
});
cadastrosRouter.delete('/equipes/:id/membros/:userId', async (req, res, next) => {
  try {
    const empresaId = await empresaDe(req);
    if (!empresaId) return res.status(400).json({ error: 'Sua conta não está vinculada a nenhuma empresa.' });
    const id = String(req.params.id || '');
    if (!(await equipeDaEmpresa(id, empresaId))) return res.status(404).json({ error: 'Equipe não encontrada.' });
    const { error } = await db().from('equipe_membros').delete().eq('equipe_id', id).eq('user_id', String(req.params.userId || ''));
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});
