// check-jsx.js — valida a sintaxe dos .jsx (mesmo preset do Babel no navegador).
// Uso: node server/scripts/check-jsx.js  [arquivo1 arquivo2 ...]  (default: os do chatbot)
import babel from '@babel/core';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), 'public');
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['api.jsx', 'auth.jsx', 'inbox.jsx'];

let falhou = false;
for (const f of files) {
  const full = path.join(root, f);
  try {
    babel.transformSync(fs.readFileSync(full, 'utf8'), {
      filename: full,
      presets: ['@babel/preset-react'],
      babelrc: false, configFile: false,
    });
    console.log('OK   ' + f);
  } catch (e) {
    falhou = true;
    console.log('ERRO ' + f + ' -> ' + e.message.split('\n')[0]);
  }
}
process.exit(falhou ? 1 : 0);
