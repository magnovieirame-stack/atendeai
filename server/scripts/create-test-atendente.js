// create-test-atendente.js — cria um usuário ATENDENTE de teste na MESMA empresa
// do dono real (bemmarcas / IGUABELA), pra validar o 3º papel de verdade.
// Aditivo e idempotente: se o usuário já existir, reaproveita e redefine a senha.
// Uso: node server/scripts/create-test-atendente.js
import { config } from '../src/config.js';
import { createClient } from '@supabase/supabase-js';

const DONO_EMAIL = 'bemmarcas@gmail.com';            // dono real -> de quem pegamos a empresa
const EMAIL = 'atendente.teste@iguabela.com';
const SENHA = 'Atendente@Teste2026';
const NOME = 'Atendente Teste';

const admin = createClient(config.supabase.url, config.supabase.serviceRoleKey, { auth: { persistSession: false } });

async function main() {
  // 1) Acha o dono no Auth e a empresa dele (IGUABELA).
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const users = (list.data && list.data.users) || [];
  const dono = users.find((u) => (u.email || '').toLowerCase() === DONO_EMAIL);
  if (!dono) throw new Error('Dono ' + DONO_EMAIL + ' não encontrado no Auth.');
  const { data: vinc } = await admin.from('empresa_membros').select('empresa_id').eq('user_id', dono.id).order('created_at', { ascending: true }).limit(1);
  const empresaId = vinc && vinc[0] && vinc[0].empresa_id;
  if (!empresaId) throw new Error('Empresa do dono não encontrada em empresa_membros.');
  const { data: emp } = await admin.from('empresa_user').select('nome').eq('id', empresaId).single();
  console.log('Empresa alvo:', (emp && emp.nome) || '(sem nome)', '·', empresaId);

  // 2) papel_id do atendente (catálogo da migration 0020).
  const { data: papel } = await admin.from('papeis').select('id').eq('codigo', 'atendente').single();
  if (!papel) throw new Error('Papel "atendente" não encontrado (rodou a 0020?).');

  // 3) Cria (ou reaproveita) o usuário atendente.
  let userId;
  const created = await admin.auth.admin.createUser({ email: EMAIL, password: SENHA, email_confirm: true, user_metadata: { name: NOME, cargo: 'Atendente (teste)' } });
  if (created.error) {
    if (/already.*(registered|exists)|email.*exists|duplicate/i.test(created.error.message)) {
      const u = users.find((x) => (x.email || '').toLowerCase() === EMAIL);
      userId = u && u.id;
      if (!userId) throw created.error;
      await admin.auth.admin.updateUserById(userId, { password: SENHA, user_metadata: { name: NOME, cargo: 'Atendente (teste)' } });
      console.log('Usuário já existia — reaproveitado e senha redefinida:', userId);
    } else throw created.error;
  } else {
    userId = created.data.user.id;
    console.log('Atendente criado:', userId);
  }

  // 4) Vincula como ATENDENTE na empresa (papel string + papel_id, como o provisionamento faz).
  const link = await admin.from('empresa_membros').upsert(
    { user_id: userId, empresa_id: empresaId, papel: 'atendente', papel_id: papel.id },
    { onConflict: 'user_id,empresa_id' },
  );
  if (link.error) throw link.error;
  console.log('Vínculo empresa_membros (atendente) OK.');

  console.log('\n=== CREDENCIAIS DO ATENDENTE DE TESTE ===');
  console.log('  empresa: ' + ((emp && emp.nome) || empresaId));
  console.log('  email:   ' + EMAIL);
  console.log('  senha:   ' + SENHA);
}

main().then(() => process.exit(0)).catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
