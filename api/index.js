// api/index.js — entrada serverless da Vercel.
// A Vercel transforma este arquivo numa função e, via vercel.json, manda
// todas as rotas /api/* para cá. O app Express é o próprio handler.
import app from '../server/src/index.js';

export default app;
