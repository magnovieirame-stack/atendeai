// test-upload.js — testa o upload de mídia ponta a ponta pelo backend.
const base = 'http://localhost:8080';
const CONTATO = '6b641525-173f-4b75-abfe-61495ee781ef';

// PNG 1x1 transparente
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/1eYAAAAAElFTkSuQmCC';
const buf = Buffer.from(pngBase64, 'base64');

const r1 = await fetch(base + '/api/auth/login', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'teste@minhaempresa.com', senha: 'Teste@Atende2026' }),
});
const cookies = (r1.headers.getSetCookie ? r1.headers.getSetCookie() : [r1.headers.get('set-cookie')]).map((c) => c.split(';')[0]).join('; ');
console.log('login:', r1.status);

const fd = new FormData();
fd.append('arquivo', new Blob([buf], { type: 'image/png' }), 'teste-upload.png');
const r2 = await fetch(base + '/api/chatbot/contatos/' + CONTATO + '/midia', {
  method: 'POST', headers: { cookie: cookies }, body: fd,
});
const data = await r2.json();
console.log('upload:', r2.status);
console.log(JSON.stringify(data, null, 2));
process.exit(r2.ok ? 0 : 1);
