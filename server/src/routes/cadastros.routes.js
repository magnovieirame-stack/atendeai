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
const mapDep = (d) => ({ id: d.id, nome: d.nome, descricao: d.descricao || '', ativo: d.ativo !== false, responsavel: d.responsavel_nome || '', responsavelId: d.responsavel_id || null, criadoEm: d.created_at });
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
    const ins = await db().from('departamentos').insert({
      empresa: empresaId, nome,
      descricao: String((req.body && req.body.descricao) || '').trim() || null,
      ativo: (req.body && req.body.ativo) === false ? false : true,
      responsavel_id: req.user && req.user.id, // SEMPRE o usuário atual (não vem do front)
      responsavel_nome: nomeDoUsuario(req),
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
