// notify.js — cria notificações (best-effort; nunca quebra a ação principal).
import { adminClient } from './supabase.js';

export async function criarNotificacao({ empresaId, userId = null, kind = 'info', texto, link = null }) {
  if (!empresaId || !texto) return;
  try {
    await adminClient().from('notificacoes').insert({ empresa_id: empresaId, user_id: userId, kind, texto, link });
  } catch (e) { /* ignora — notificação é secundária */ }
}
