// api.jsx — camada de acesso ao backend (tudo passa por /api, com cookie de sessão).
// Exposto globalmente como window.API. Nada de chave do Supabase aqui no navegador.

// MODO TESTE: enquanto o login formal não está pronto, autenticamos
// automaticamente neste usuário (empresa "minha empresa"). Remover quando
// ligarmos o login de verdade na tela.
const DEV_AUTOLOGIN = { email: 'teste@minhaempresa.com', senha: 'Teste@Atende2026' };

const API = {
  async _req(path, opts = {}, _retried = false) {
    const res = await fetch('/api' + path, {
      credentials: 'include', // envia o cookie httpOnly de sessão
      ...opts,
    });
    // Sessão ausente/expirada: tenta login automático (modo teste) e repete 1x.
    if (res.status === 401 && !_retried && path.indexOf('/auth/') !== 0) {
      try { await this.login(DEV_AUTOLOGIN.email, DEV_AUTOLOGIN.senha); } catch (e) {}
      return this._req(path, opts, true);
    }
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await res.json() : null;
    if (!res.ok) {
      const err = new Error((data && data.error) || ('Erro ' + res.status));
      err.status = res.status; err.data = data;
      throw err;
    }
    return data;
  },
  _json(path, method, body) {
    return this._req(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  },

  // --- Auth ---
  login(email, senha) { return this._json('/auth/login', 'POST', { email, senha }); },
  logout() { return this._req('/auth/logout', { method: 'POST' }); },
  me() { return this._req('/auth/me'); },

  // --- Chatbot ---
  getContatos() { return this._req('/chatbot/contatos'); },
  getMensagens(contatoId) { return this._req('/chatbot/contatos/' + contatoId + '/mensagens'); },
  sendTexto(contatoId, texto) { return this._json('/chatbot/contatos/' + contatoId + '/mensagens', 'POST', { texto }); },
  sendMidia(contatoId, file, filename) {
    const fd = new FormData();
    fd.append('arquivo', file, filename || file.name || 'arquivo');
    // sem Content-Type manual: o browser define o boundary do multipart
    return this._req('/chatbot/contatos/' + contatoId + '/midia', { method: 'POST', body: fd });
  },
  getMidias(contatoId) { return this._req('/chatbot/contatos/' + contatoId + '/midias'); },

  // --- Respostas rápidas ---
  getRespostas() { return this._req('/chatbot/respostas-rapidas'); },
  createResposta(comando, mensagem) { return this._json('/chatbot/respostas-rapidas', 'POST', { comando, mensagem }); },
  updateResposta(id, comando, mensagem) { return this._json('/chatbot/respostas-rapidas/' + id, 'PATCH', { comando, mensagem }); },
  deleteResposta(id) { return this._req('/chatbot/respostas-rapidas/' + id, { method: 'DELETE' }); },

  // --- Tags ---
  getTags() { return this._req('/chatbot/tags'); },
  createTag(nome, cor) { return this._json('/chatbot/tags', 'POST', { nome, cor }); },
  updateTag(id, nome, cor) { return this._json('/chatbot/tags/' + id, 'PATCH', { nome, cor }); },
  deleteTag(id) { return this._req('/chatbot/tags/' + id, { method: 'DELETE' }); },
  assignTag(contatoId, payload) { return this._json('/chatbot/contatos/' + contatoId + '/tags', 'POST', payload); },
  removeTag(contatoId, tagId) { return this._req('/chatbot/contatos/' + contatoId + '/tags/' + tagId, { method: 'DELETE' }); },

  // --- Cliente (ficha) ---
  getCliente(id) { return this._req('/chatbot/clientes/' + id); },
  updateCliente(id, patch) { return this._json('/chatbot/clientes/' + id, 'PATCH', patch); },

  // --- CRM ---
  getFunis() { return this._req('/crm/funis'); },
  getFunil(id) { return this._req('/crm/funis/' + id); },
  createFunil(nome, descricao, cor_funil) { return this._json('/crm/funis', 'POST', { nome, descricao, cor_funil }); },
  updateFunil(id, nome, descricao, cor_funil) { return this._json('/crm/funis/' + id, 'PATCH', { nome, descricao, cor_funil }); },
  moveCard(cardId, faseId) { return this._json('/crm/cards/' + cardId, 'PATCH', { faseId }); },
  addCardCliente(faseId, dados) { return this._json('/crm/cards/novo', 'POST', { faseId, ...dados }); },
  deleteCard(cardId) { return this._req('/crm/cards/' + cardId, { method: 'DELETE' }); },
  addFase(funilId, nome, cor_funil) { return this._json('/crm/funis/' + funilId + '/fases', 'POST', { nome, cor_funil }); },
  updateFase(id, patch) { return this._json('/crm/fases/' + id, 'PATCH', patch); },
  deleteFase(id) { return this._req('/crm/fases/' + id, { method: 'DELETE' }); },

  // --- Financeiro: contas ---
  getContas() { return this._req('/financeiro/contas'); },
  createConta(dto) { return this._json('/financeiro/contas', 'POST', dto); },
  updateConta(id, dto) { return this._json('/financeiro/contas/' + id, 'PATCH', dto); },
  deleteConta(id) { return this._req('/financeiro/contas/' + id, { method: 'DELETE' }); },
  // --- Financeiro: lançamentos (entradas/saidas) ---
  getEntradas(tipo) { return this._req('/financeiro/entradas' + (tipo ? ('?tipo=' + tipo) : '')); },
  createEntrada(dto) { return this._json('/financeiro/entradas', 'POST', dto); },
  updateEntrada(id, dto) { return this._json('/financeiro/entradas/' + id, 'PATCH', dto); },
  deleteEntrada(id) { return this._req('/financeiro/entradas/' + id, { method: 'DELETE' }); },

  // --- Contatos / nova conversa ---
  getClientes(q) { return this._req('/chatbot/clientes' + (q ? ('?q=' + encodeURIComponent(q)) : '')); },
  openContato(clienteId) { return this._json('/chatbot/contatos', 'POST', { clienteId }); },
  setContatoStatus(id, statuschat) { return this._json('/chatbot/contatos/' + id, 'PATCH', { statuschat }); },
  createClienteContato(nome, telefone, canal) { return this._json('/chatbot/clientes-contato', 'POST', { nome, telefone, canal }); },
};
window.API = API;

// ---------- helpers de formatação ----------
function fmtHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  if (mesmoDia) return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
}
function fmtTamanho(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

// ---------- conversores DB(DTO do backend) -> formato que a UI já entende ----------
const STATUS_DB_UI = { ativo: 'em-andamento', finalizado: 'encerrada', pendente: 'pendente' };

function dbContatoToConv(c) {
  return {
    id: c.id,
    _db: true,                 // marca que é uma conversa real (vinda da API)
    client: c.nome,
    photo: c.foto || null,     // foto vem de clientes.fotolink
    avatar: typeof initials === 'function' ? initials(c.nome) : (c.nome || '?').slice(0, 2).toUpperCase(),
    channel: c.canal,
    status: STATUS_DB_UI[c.status] || 'em-andamento',
    handler: 'human',          // estes 2 bancos não têm IA/fila; tratamos como humano
    tags: c.tags || [],        // [{id,nome,cor}]
    tag: (c.tags && c.tags[0] && c.tags[0].nome) || null,
    unread: c.naoLidas || 0,
    lastTime: fmtHora(c.ultimaMsg),
    preview: '',
    phone: c.telefone || '',
    email: c.email || '',
    messages: null,            // carregado sob demanda ao abrir
    clienteId: c.clienteId,
    fixado: c.fixado,
  };
}

// Cor de texto legível (preto/branco) sobre um fundo hex.
function corContraste(hex) {
  if (!hex || hex[0] !== '#') return '#fff';
  const h = hex.length === 4 ? '#' + hex.slice(1).split('').map((x) => x + x).join('') : hex;
  const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? '#1f2937' : '#fff';
}

function dbMsgToUi(m) {
  let kind = 'text';
  if (m.tipo === 'imagem') kind = 'image';
  else if (m.tipo === 'audio') kind = 'audio';
  else if (m.tipo === 'texto') kind = 'text';
  else kind = 'doc'; // arquivo, docx, xlsx, video, pdf...
  const metaParts = [];
  if (m.formato) metaParts.push(m.formato);
  if (m.tamanho) metaParts.push(fmtTamanho(m.tamanho));
  return {
    _id: m.id,
    from: m.deCliente ? 'client' : 'agent',
    kind,
    text: m.texto || '',
    mediaUrl: m.midiaUrl || null,
    filename: m.titulo || 'arquivo',
    meta: metaParts.join(' · '),
    time: fmtHora(m.criadoEm),
  };
}

Object.assign(window, { dbContatoToConv, dbMsgToUi, fmtHora, fmtTamanho, corContraste });
