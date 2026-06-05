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

  // URL pública do app (ngrok em dev, domínio em prod). Usada para montar o
  // redirect_uri do OAuth e o endpoint do webhook que registramos na Meta.
  appBaseUrl: (process.env.APP_BASE_URL || '').replace(/\/+$/, ''),

  // Chave de 32 bytes (hex de 64 chars OU base64) p/ criptografar tokens em repouso.
  tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY || '',

  // --- Instagram (Meta) — "Instagram API with Instagram Login" ---
  instagram: {
    appId: process.env.IG_APP_ID || '',
    appSecret: process.env.IG_APP_SECRET || '',
    // Token que escolhemos e cadastramos no painel de Webhooks da Meta.
    webhookVerifyToken: process.env.IG_WEBHOOK_VERIFY_TOKEN || '',
    // Permissões pedidas no consentimento do usuário.
    scopes: process.env.IG_SCOPES || 'instagram_business_basic,instagram_business_manage_messages',
  },

  // --- Facebook Messenger (Meta) — login com Facebook + seleção de Página ---
  facebook: {
    appId: process.env.FB_APP_ID || '',
    appSecret: process.env.FB_APP_SECRET || '',
    webhookVerifyToken: process.env.FB_WEBHOOK_VERIFY_TOKEN || '',
    scopes: process.env.FB_SCOPES || 'pages_show_list,pages_messaging,pages_manage_metadata,pages_read_engagement,business_management',
  },

  // --- WhatsApp Cloud API (Meta) — conexão MANUAL (Phone Number ID + token) ---
  // O token e o phone_number_id são da empresa (guardados cifrados no banco).
  // Aqui só ficam os globais do app: a assinatura do webhook usa o FB_APP_SECRET
  // (mesmo app da Meta) e o verify token do webhook de WhatsApp.
  whatsapp: {
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '',
  },
};

// Caminhos de callback do OAuth (concatenados ao appBaseUrl).
config.instagram.redirectUri = config.appBaseUrl
  ? config.appBaseUrl + '/api/integracoes/instagram/callback'
  : '';
config.facebook.redirectUri = config.appBaseUrl
  ? config.appBaseUrl + '/api/integracoes/facebook/callback'
  : '';
// A assinatura do webhook do WhatsApp usa o segredo do mesmo app (Facebook).
config.whatsapp.appSecret = config.facebook.appSecret;

// Flags de prontidão — o servidor sobe mesmo sem credenciais (para servir o
// frontend), mas as rotas que precisam do Supabase avisam claramente se faltar.
export const supabaseReady = Boolean(config.supabase.url && config.supabase.anonKey);
export const serviceRoleReady = Boolean(config.supabase.url && config.supabase.serviceRoleKey);
// Cada canal só "liga" quando suas credenciais estiverem preenchidas no .env.
export const instagramReady = Boolean(
  config.instagram.appId && config.instagram.appSecret && config.appBaseUrl && config.tokenEncryptionKey,
);
export const facebookReady = Boolean(
  config.facebook.appId && config.facebook.appSecret && config.appBaseUrl && config.tokenEncryptionKey,
);
// WhatsApp é conexão MANUAL: para CONECTAR basta poder cifrar o token. Para
// RECEBER mensagens também é preciso o segredo do app + verify token do webhook.
export const whatsappReady = Boolean(config.tokenEncryptionKey);
export const whatsappWebhookReady = Boolean(config.whatsapp.appSecret && config.whatsapp.webhookVerifyToken);

export function logConfigStatus() {
  const ok = (b) => (b ? 'OK' : 'FALTANDO');
  console.log('  Supabase URL/anon:      ' + ok(supabaseReady));
  console.log('  Supabase service_role:  ' + ok(serviceRoleReady) + (serviceRoleReady ? '' : ' (opcional por enquanto)'));
  console.log('  Instagram (Meta):       ' + ok(instagramReady) + (instagramReady ? '' : ' (IG_* + APP_BASE_URL + TOKEN_ENCRYPTION_KEY)'));
  console.log('  Facebook (Meta):        ' + ok(facebookReady) + (facebookReady ? '' : ' (FB_* + APP_BASE_URL + TOKEN_ENCRYPTION_KEY)'));
  console.log('  WhatsApp (Cloud API):   ' + ok(whatsappReady) + (whatsappWebhookReady ? '' : ' (recebimento: FB_APP_SECRET + WHATSAPP_WEBHOOK_VERIFY_TOKEN)'));
  if (!supabaseReady) {
    console.log('  -> Auth/dados desativados até preencher o .env. Frontend funciona normalmente.');
  }
}
