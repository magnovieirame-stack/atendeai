// notificacoes.routes.js — MÓDULO NOTIFICAÇÕES.
//   Tabela: "notificacoes". RLS ligado sem policies -> só o service_role acessa.
//   Listamos as da empresa destinadas ao usuário OU a todos (user_id null).
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { adminClient } from '../lib/supabase.js';

export const notificacoesRouter = Router();
notificacoesRouter.use(requireAuth);

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

function mapNotif(r) {
  return {
    id: r.id,
    kind: r.kind || 'info',
    text: r.texto || '',
    link: r.link || null,
    read: !!r.lida,
    createdAt: r.created_at,
  };
}

// filtro "destinada a mim OU a todos (user_id null)"
function scopeUser(q, userId) {
  return userId ? q.or(`user_id.eq.${userId},user_id.is.null`) : q;
}

notificacoesRouter.get('/', async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const userId = req.user && req.user.id;
    let q = db().from('notificacoes').select('*').eq('empresa_id', empresaId)
      .order('created_at', { ascending: false }).limit(100);
    q = scopeUser(q, userId);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ notificacoes: (data || []).map(mapNotif) });
  } catch (err) { next(err); }
});

notificacoesRouter.post('/ler-todas', async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const userId = req.user && req.user.id;
    let q = db().from('notificacoes').update({ lida: true }).eq('empresa_id', empresaId).eq('lida', false);
    q = scopeUser(q, userId);
    const { error } = await q;
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

notificacoesRouter.patch('/:id', async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const id = uuid.parse(req.params.id);
    const lida = req.body && req.body.lida !== undefined ? !!req.body.lida : true;
    const { error } = await db().from('notificacoes').update({ lida }).eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});

notificacoesRouter.delete('/:id', async (req, res, next) => {
  try {
    const empresaId = await getEmpresaId(req);
    const id = uuid.parse(req.params.id);
    const { error } = await db().from('notificacoes').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { next(err); }
});
