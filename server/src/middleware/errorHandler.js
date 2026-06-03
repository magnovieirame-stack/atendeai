// errorHandler.js — tratamento central de erros + 404 da API.
import { config } from '../config.js';

// 404 para rotas de API não encontradas.
export function apiNotFound(req, res) {
  res.status(404).json({ error: 'Rota de API não encontrada: ' + req.originalUrl });
}

// Handler de erros. Em produção não vaza stack trace / detalhes internos.
export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error('[erro]', err?.message || err);
  const status = err.status || 500;
  res.status(status).json({
    error: config.isProd ? 'Erro interno do servidor.' : (err?.message || 'Erro interno do servidor.'),
  });
}
