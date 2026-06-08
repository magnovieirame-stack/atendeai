// grant-super-admin.js — atribui o papel "super_admin" ao SEU usuário, pra
// liberar o painel/rotas de plataforma (ex.: cadastro de clientes da plataforma).
//
// O que ele faz (usa service_role, ignora RLS):
//   1) acha seu usuário no Supabase Auth pelo e-mail;
//   2) pega o papel global super_admin (tabela papeis, da migration 0020);
//   3) aponta TODOS os seus vínculos em empresa_membros para esse papel
//      (papel='super' + papel_id=<super_admin>).
// Só mexe na SUA linha de empresa_membros (seu papel). Não cria/apaga empresa.
// Pra reverter: rode de novo com REVERT=admin_loja (volta pra admin da loja).
//
// Uso:  node server/scripts/grant-super-admin.js seu-email@exemplo.com
//       (reverter)  REVERT=admin_loja node server/scripts/grant-super-admin.js seu-email@exemplo.com

import { config } from '../src/config.js';
import { createClient } from '@supabase/supabase-js';

const EMAIL = process.argv[2];
const REVERT = process.env.REVERT; // ex.: 'admin_loja' para desfazer
if (!EMAIL) {
  console.error('Uso: node server/scripts/grant-super-admin.js seu-email@exemplo.com');
  process.exit(1);
}

const admin = createClient(config.supabase.url, config.supabase.serviceRoleKey, { auth: { persistSession: false } });

async function main() {
  // 1) Acha o usuário pelo e-mail.
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 500 });
  if (list.error) throw list.error;
  const user = list.data.users.find((u) => (u.email || '').toLowerCase() === EMAIL.toLowerCase());
  if (!user) throw new Error('Usuário não encontrado para o e-mail: ' + EMAIL);
  console.log('Usuário:', user.id, '·', user.email);

  // 2) Pega o papel desejado (super_admin por padrão; ou o do REVERT).
  const codigo = REVERT || 'super_admin';
  const papel = await admin.from('papeis').select('id, codigo, nome').eq('codigo', codigo).single();
  if (papel.error) throw new Error('Papel "' + codigo + '" não encontrado (rodou a migration 0020?). ' + papel.error.message);

  // 3) Confirma que o usuário tem vínculo(s) em empresa_membros.
  const membros = await admin.from('empresa_membros').select('user_id, empresa_id, papel').eq('user_id', user.id);
  if (membros.error) throw membros.error;
  if (!membros.data.length) throw new Error('Usuário sem vínculo em empresa_membros — entre no app ao menos uma vez antes.');

  // 4) Aplica o papel.
  const papelTexto = codigo === 'super_admin' ? 'super' : (codigo === 'admin_loja' ? 'admin' : 'atendente');
  const upd = await admin.from('empresa_membros')
    .update({ papel: papelTexto, papel_id: papel.data.id })
    .eq('user_id', user.id);
  if (upd.error) throw upd.error;

  console.log(`OK ✅  ${membros.data.length} vínculo(s) agora com papel "${papel.data.codigo}" (${papel.data.nome}).`);
  console.log('Faça logout/login no app pra recarregar as permissões.');
}

main().then(() => process.exit(0)).catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
