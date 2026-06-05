// index.js — ponto de entrada do servidor.
// Um único processo Express que:
//   1. serve o frontend (pasta public/) na porta única;
//   2. expõe a API em /api/* (tudo passa pelo backend — req. 2);
//   3. aplica segurança (helmet, rate limit, cookies httpOnly).
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';

import { config, logConfigStatus } from './config.js';
import { startLembretesWorker } from './lib/lembretes.js';
import { helmetMiddleware, apiLimiter } from './middleware/security.js';
import { apiNotFound, errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { chatbotRouter } from './routes/chatbot.routes.js';
import { crmRouter } from './routes/crm.routes.js';
import { financeiroRouter } from './routes/financeiro.routes.js';
import { agendaRouter } from './routes/agenda.routes.js';
import { leadsRouter } from './routes/leads.routes.js';
import { notificacoesRouter } from './routes/notificacoes.routes.js';

const app = express();

// Atrás de proxy (produção) — necessário p/ cookies secure e rate limit por IP.
app.set('trust proxy', 1);

// --- Segurança e parsing ---
app.use(helmetMiddleware);
app.use(express.json({ limit: '1mb' })); // limita tamanho do corpo (anti-DoS)
app.use(cookieParser());

// --- API (tudo sob /api) ---
const api = express.Router();
api.use(apiLimiter);
api.use(healthRouter);
api.use(authRouter);
api.use('/chatbot', chatbotRouter);
api.use('/crm', crmRouter);
api.use('/financeiro', financeiroRouter);
api.use('/agenda', agendaRouter);
api.use('/leads', leadsRouter);
api.use('/notificacoes', notificacoesRouter);
// (próximos módulos entram aqui)
app.use('/api', api);
app.use('/api', apiNotFound); // 404 JSON p/ rotas de API inexistentes

// --- Frontend estático (somente o que está em public/) ---
app.use(express.static(config.publicDir, { extensions: ['html'] }));

// Fallback: qualquer rota que não seja /api devolve o app (entrada única).
app.get('*', (req, res) => {
  res.sendFile(path.join(config.publicDir, 'ATENDE.IA.html'));
});

// --- Tratamento de erros (sempre por último) ---
app.use(errorHandler);

// Em serverless (Vercel) NÃO damos listen — exportamos o app como handler.
// Localmente (e em hosts persistentes como Render), subimos o servidor na porta.
if (!process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log('\n  ATENDE.IA — servidor no ar');
    console.log('  Frontend + API:  http://localhost:' + config.port);
    console.log('  Health check:    http://localhost:' + config.port + '/api/health');
    logConfigStatus();
    startLembretesWorker(); // dispara lembretes de agendamento no tempo de antecedência
    console.log('  Worker de lembretes: ativo (verifica a cada 1 min)');
    console.log('  (Ctrl+C para parar)\n');
  });
}

export default app;
