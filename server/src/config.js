// config.js — carrega e valida as variáveis de ambiente.
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// .env fica na raiz do projeto (../../ a partir de server/src)
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });

export const config = {
  port: Number(process.env.PORT) || 8080,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  projectRoot: PROJECT_ROOT,
  publicDir: path.join(PROJECT_ROOT, 'public'),

  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
};

// Flags de prontidão — o servidor sobe mesmo sem credenciais (para servir o
// frontend), mas as rotas que precisam do Supabase avisam claramente se faltar.
export const supabaseReady = Boolean(config.supabase.url && config.supabase.anonKey);
export const serviceRoleReady = Boolean(config.supabase.url && config.supabase.serviceRoleKey);

export function logConfigStatus() {
  const ok = (b) => (b ? 'OK' : 'FALTANDO');
  console.log('  Supabase URL/anon:      ' + ok(supabaseReady));
  console.log('  Supabase service_role:  ' + ok(serviceRoleReady) + (serviceRoleReady ? '' : ' (opcional por enquanto)'));
  if (!supabaseReady) {
    console.log('  -> Auth/dados desativados até preencher o .env. Frontend funciona normalmente.');
  }
}
