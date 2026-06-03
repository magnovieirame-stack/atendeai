// setup-test-user.js — cria um usuário de teste, vincula à empresa "minha empresa"
// e VALIDA o RLS (prova que o usuário só vê os dados da própria empresa).
// Uso: node server/scripts/setup-test-user.js
import { config } from '../src/config.js';
import { createClient } from '@supabase/supabase-js';

const EMPRESA_MINHA = '0c388d31-0d2e-4844-aadc-81c2580fa1fe'; // "minha empresa" (tem os dados de chatbot)
const EMPRESA_OUTRA = 'db268ca1-a151-4a2c-bb84-c0a65191caf0'; // "empresa 2" (não pode aparecer)
const EMAIL = 'teste@minhaempresa.com';
const SENHA = 'Teste@Atende2026';
const NOME = 'Magno Vieira';

const admin = createClient(config.supabase.url, config.supabase.serviceRoleKey, { auth: { persistSession: false } });
const anon = createClient(config.supabase.url, config.supabase.anonKey, { auth: { persistSession: false } });

function ok(b) { return b ? 'PASSOU ✅' : 'FALHOU ❌'; }

async function main() {
  // 1) Cria (ou reaproveita) o usuário no Supabase Auth.
  let userId;
  const created = await admin.auth.admin.createUser({
    email: EMAIL, password: SENHA, email_confirm: true,
    user_metadata: { name: NOME },
  });
  if (created.error) {
    if (/already.*registered|exists/i.test(created.error.message)) {
      const list = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      userId = list.data.users.find((u) => u.email === EMAIL)?.id;
      console.log('Usuário já existia, reaproveitando:', userId);
    } else {
      throw created.error;
    }
  } else {
    userId = created.data.user.id;
    console.log('Usuário criado:', userId);
  }

  // 2) Vincula o usuário à empresa "minha empresa" como admin.
  const link = await admin.from('empresa_membros').upsert(
    { user_id: userId, empresa_id: EMPRESA_MINHA, papel: 'admin' },
    { onConflict: 'user_id,empresa_id' },
  );
  if (link.error) throw link.error;
  console.log('Vínculo empresa_membros OK.');

  // 3) Faz login como o usuário (cliente anon) — daqui pra frente o RLS vale.
  const signin = await anon.auth.signInWithPassword({ email: EMAIL, password: SENHA });
  if (signin.error) throw signin.error;
  const token = signin.data.session.access_token;
  const userClient = createClient(config.supabase.url, config.supabase.anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // 4) VALIDAÇÃO do RLS.
  console.log('\n=== Validação do RLS (logado como ' + EMAIL + ') ===');

  const meusContatos = await userClient.from('chatbot-contatos').select('id,empresa_id');
  const todosDaMinha = (meusContatos.data || []).every((c) => c.empresa_id === EMPRESA_MINHA);
  console.log(`Vê ${meusContatos.data?.length ?? 0} contatos, todos da minha empresa: ${ok(todosDaMinha && (meusContatos.data?.length ?? 0) > 0)}`);

  // Tenta espiar a outra empresa explicitamente — deve vir vazio.
  const espiar = await userClient.from('clientes').select('id,empresa_id').eq('empresa_id', EMPRESA_OUTRA);
  console.log(`Tenta ver clientes da "empresa 2": retornou ${espiar.data?.length ?? 0} (esperado 0): ${ok((espiar.data?.length ?? 0) === 0)}`);

  // Mensagens de um contato da minha empresa (RLS via join contato->empresa).
  const umContato = meusContatos.data?.[0]?.id;
  if (umContato) {
    const msgs = await userClient.from('chatbot-mensagens').select('id').eq('contato', umContato);
    console.log(`Lê mensagens de um contato meu: ${msgs.data?.length ?? 0} mensagens (sem erro de RLS): ${ok(!msgs.error)}`);
  }

  console.log('\nCredenciais de teste:\n  email: ' + EMAIL + '\n  senha: ' + SENHA);
}

main().then(() => process.exit(0)).catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
