// create-super-admin.js — cria um usuário JÁ como super_admin, numa tacada só
// (sem precisar de tela de signup). Usa a service_role do .env.
//
// É IDEMPOTENTE e NÃO mexe em nenhuma empresa/usuário que já existe — no máximo
// cria 1 empresa "placeholder" só pra carregar o papel desse super admin.
//
// O que faz:
//   1) cria (ou reaproveita, se já existir) o usuário no Supabase Auth com o
//      e-mail/senha passados (email_confirm: já entra direto, sem verificação);
//   2) garante 1 vínculo em empresa_membros (cria 1 empresa placeholder só se o
//      usuário ainda não tiver nenhuma);
//   3) atribui o papel super_admin (papel='super' + papel_id=<super_admin>).
//
// Uso:  node server/scripts/create-super-admin.js <email> <senha> ["Nome"]

import { config } from '../src/config.js';
import { createClient } from '@supabase/supabase-js';

const EMAIL = process.argv[2];
const SENHA = process.argv[3];
const NOME = process.argv[4] || (EMAIL ? EMAIL.split('@')[0] : 'Super Admin');
if (!EMAIL || !SENHA) {
  console.error('Uso: node server/scripts/create-super-admin.js <email> <senha> ["Nome"]');
  process.exit(1);
}

const admin = createClient(config.supabase.url, config.supabase.serviceRoleKey, { auth: { persistSession: false } });

async function findUserByEmail(email) {
  for (let page = 1; page <= 25; page++) {
    const res = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (res.error) throw res.error;
    const u = res.data.users.find((x) => (x.email || '').toLowerCase() === email.toLowerCase());
    if (u) return u;
    if (res.data.users.length < 200) break; // última página
  }
  return null;
}

async function main() {
  // 1) Cria ou reaproveita o usuário no Supabase Auth.
  let user;
  const created = await admin.auth.admin.createUser({
    email: EMAIL, password: SENHA, email_confirm: true, user_metadata: { name: NOME },
  });
  if (created.error) {
    if (/already.*(registered|exists)|email.*exists|duplicate/i.test(created.error.message)) {
      user = await findUserByEmail(EMAIL);
      if (!user) throw created.error;
      console.log('Usuário já existia, reaproveitando:', user.id);
    } else {
      throw created.error;
    }
  } else {
    user = created.data.user;
    console.log('Usuário criado:', user.id);
  }

  // 2) Papel super_admin (catálogo da migration 0020).
  const papel = await admin.from('papeis').select('id, nome').eq('codigo', 'super_admin').single();
  if (papel.error) throw new Error('Papel super_admin não encontrado (rodou a migration 0020?). ' + papel.error.message);

  // 3) Garante 1 empresa pra carregar o papel — reusa a do usuário se já houver;
  //    senão cria uma placeholder (não toca em nenhuma outra empresa).
  const membros = await admin.from('empresa_membros').select('empresa_id').eq('user_id', user.id).limit(1);
  if (membros.error) throw membros.error;
  let empresaId = membros.data[0]?.empresa_id;
  if (!empresaId) {
    const emp = await admin.from('empresa_user').insert({ nome: 'Plataforma · Super Admin (' + EMAIL + ')' }).select('id').single();
    if (emp.error) throw emp.error;
    empresaId = emp.data.id;
    console.log('Empresa placeholder criada:', empresaId);
  } else {
    console.log('Reaproveitando empresa do próprio usuário:', empresaId);
  }

  // 4) Vincula como super_admin (idempotente via upsert na PK user_id+empresa_id).
  const link = await admin.from('empresa_membros').upsert(
    { user_id: user.id, empresa_id: empresaId, papel: 'super', papel_id: papel.data.id },
    { onConflict: 'user_id,empresa_id' },
  );
  if (link.error) throw link.error;

  console.log('\nOK ✅  Super admin pronto.');
  console.log('  email: ' + EMAIL);
  console.log('  senha: ' + SENHA);
  console.log('Entre no app com essas credenciais — já como Super Admin.');
}

main().then(() => process.exit(0)).catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
