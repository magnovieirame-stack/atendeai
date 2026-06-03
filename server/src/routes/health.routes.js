// health.routes.js — verificação de status do servidor.
import { Router } from 'express';
import { supabaseReady, serviceRoleReady } from '../config.js';

export const healthRouter = Router();

healthRouter.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'atende-ai',
    supabase: { configured: supabaseReady, serviceRole: serviceRoleReady },
  });
});
