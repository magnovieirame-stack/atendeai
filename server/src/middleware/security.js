// security.js — cabeçalhos de segurança (helmet) + rate limiting.
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Content-Security-Policy.
// OBS: o protótipo atual usa Babel-no-navegador (precisa de 'unsafe-eval') e
// React via unpkg, então a CSP está mais relaxada aqui. Quando migrarmos o
// frontend para Vite (build real), apertamos isto removendo unsafe-eval/inline.
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://unpkg.com', "'unsafe-eval'", "'unsafe-inline'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      mediaSrc: ["'self'", 'https:', 'blob:', 'data:'], // áudio/vídeo (Storage do Supabase)
      connectSrc: ["'self'", 'https://unpkg.com'], // backend + sourcemaps do Babel
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Limite geral para a API: protege contra abuso/brute force.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});

// Limite estrito para login: trava ataques de força bruta de senha.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Aguarde alguns minutos.' },
});
