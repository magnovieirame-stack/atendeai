// supabase.js — fábrica de clientes Supabase.
//
// Três formas de falar com o Supabase, cada uma com um nível de poder diferente:
//
//  1. authClient      — chave anon, usado SÓ para login/refresh (Supabase Auth).
//  2. supabaseForUser — chave anon + token do usuário logado. RLS CONTINUA VALENDO.
//                       É o que as rotas de dados usam → cada empresa só vê o que é dela.
//  3. adminClient     — chave service_role. IGNORA o RLS (super-admin).
//                       Usar só em operações administrativas controladas no servidor.
import { createClient } from '@supabase/supabase-js';
import { config, supabaseReady, serviceRoleReady } from '../config.js';

const noPersist = { auth: { persistSession: false, autoRefreshToken: false } };

// (1) Cliente para operações de autenticação (anon key).
export const authClient = supabaseReady
  ? createClient(config.supabase.url, config.supabase.anonKey, noPersist)
  : null;

// (3) Cliente administrativo (service_role) — criado sob demanda e em cache.
let _admin = null;
export function adminClient() {
  if (!serviceRoleReady) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada — operação administrativa indisponível.');
  }
  if (!_admin) {
    _admin = createClient(config.supabase.url, config.supabase.serviceRoleKey, noPersist);
  }
  return _admin;
}

// (2) Cliente com o token do usuário → o Postgres aplica o RLS como aquele usuário.
export function supabaseForUser(accessToken) {
  if (!supabaseReady) {
    throw new Error('Supabase não configurado — preencha SUPABASE_URL e SUPABASE_ANON_KEY no .env.');
  }
  return createClient(config.supabase.url, config.supabase.anonKey, {
    ...noPersist,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
