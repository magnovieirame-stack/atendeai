// de-provisionar.js — desfaz um provisionamento de TESTE (limpa o tenant sem deixar lixo),
// pra você testar e reprovisionar de novo. Usa a service_role do .env.
//
// O que faz:
//   1) acha o cadastro provisionado (por e-mail do cadastro OU por empresa_id);
//   2) zera o vínculo no cadastro (empresa_id = null, status = 'novo');
//   3) apaga a empresa_user (cascata remove o empresa_membros);
//   4) (opcional) apaga o usuário dono no Supabase Auth — SÓ com DEL_USER=1.
//
// Uso (PowerShell):
//   node server/scripts/de-provisionar.js <email-do-cadastro | empresa_id>
//   (apagando tb o login do dono):  $env:DEL_USER="1"; node server/scripts/de-provisionar.js <email | empresa_id>
//
// Obs.: feito pra loja de teste recém-provisionada (vazia). Se você logou como o dono e
//       criou dados, limpe-os antes (FK pode segurar a remoção da empresa).

import { config } from '../src/config.js';
import { createClient } from '@supabase/supabase-js';

const ARG = process.argv[2];
const DEL_USER = process.env.DEL_USER === '1';
if (!ARG) {
  console.error('Uso: node server/scripts/de-provisionar.js <email-do-cadastro | empresa_id>   (DEL_USER=1 apaga tb o login do dono)');
  process.exit(1);
}

const admin = createClient(config.supabase.url, config.supabase.serviceRoleKey, { auth: { persistSession: false } });
const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ARG);

async function main() {
  // 1) Acha o(s) cadastro(s) provisionado(s) que batem com o argumento.
  const { data: all, error } = await admin.from('plataforma_clientes')
    .select('id, nome, tipo_pessoa, email, responsavel_email, empresa_id, status');
  if (error) throw error;
  const cads = (all || []).filter((c) => c.empresa_id && (isUuid
    ? c.empresa_id === ARG
    : (c.email === ARG || c.responsavel_email === ARG)));

  if (!cads.length) { console.log('Nada provisionado encontrado para:', ARG); return; }
  if (cads.length > 1) {
    console.log('Mais de um cadastro bate — rode por empresa_id específico:');
    cads.forEach((c) => console.log(`  empresa_id=${c.empresa_id}  ${c.nome}  (${c.email || c.responsavel_email})`));
    return;
  }

  const c = cads[0];
  const empresaId = c.empresa_id;
  const ownerEmail = (c.tipo_pessoa === 'pj' && c.responsavel_email) ? c.responsavel_email : c.email;
  console.log(`Desprovisionando: ${c.nome} | empresa_id=${empresaId} | dono=${ownerEmail || '—'}`);

  // 2) Zera o vínculo no cadastro (volta pro estado de cadastro comercial).
  const r1 = await admin.from('plataforma_clientes')
    .update({ empresa_id: null, status: 'novo', updated_at: new Date().toISOString() }).eq('id', c.id);
  if (r1.error) throw r1.error;
  console.log('  ✓ cadastro desvinculado (empresa_id=null, status=novo)');

  // 3) Apaga a empresa (cascata remove empresa_membros).
  const r2 = await admin.from('empresa_user').delete().eq('id', empresaId);
  if (r2.error) throw r2.error;
  console.log('  ✓ empresa_user apagada (empresa_membros caiu junto, por cascata)');

  // 4) (opcional) Apaga o usuário dono no Auth.
  if (DEL_USER && ownerEmail) {
    const list = await admin.auth.admin.listUsers({ page: 1, perPage: 500 });
    const u = ((list.data && list.data.users) || []).find((x) => (x.email || '').toLowerCase() === ownerEmail.toLowerCase());
    if (u) {
      const del = await admin.auth.admin.deleteUser(u.id);
      if (del.error) throw del.error;
      console.log('  ✓ usuário Auth apagado:', ownerEmail);
    } else {
      console.log('  · usuário Auth não encontrado no Auth:', ownerEmail);
    }
  } else if (ownerEmail) {
    console.log(`  · usuário Auth MANTIDO (${ownerEmail}). Pra apagar também: $env:DEL_USER="1"; node ...`);
  }

  console.log('\nOK ✅ limpo — pode reprovisionar esse cadastro de novo.');
}

main().then(() => process.exit(0)).catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
