// demo-data.jsx — DADOS SIMULADOS do MODO DEMO (botões "Entrar como" do login).
//
// Regra de ouro (pedido do usuário): SEPARAÇÃO 100%.
//   • DEMO  (window.__DEMO__ verdadeiro)  -> a UI lê SÓ daqui. NENHUMA chamada de
//     rede acontece (o intercept em api.jsx desvia tudo pra cá). Zero dado real.
//   • REAL  (login de verdade)            -> nada disto é usado; a UI fala com a API.
//
// Como funciona: api.jsx -> API._req, se window.__DEMO__, chama window.DEMO_MOCK.resolve
// (path, method, body) e devolve o mock. As FORMAS (shapes) abaixo espelham as do
// backend (res.json) pra a UI não notar diferença.
//
// É só PREVIEW de design — não persiste nada. Escritas (POST/PATCH/DELETE) devolvem
// sucesso "de mentira" pra os fluxos não quebrarem.
(function () {
  // ───────────────────────── datasets (tenant fictício "Iguabela · DEMO") ─────────────────────────

  // Equipe — GET /agenda/usuarios -> { usuarios:[{id,nome,email,papel,papelNome}] }
  const USUARIOS = [
    { id: 'u1', nome: 'Karla Zambelly', email: 'karla@iguabela.com',  papel: 'admin_loja', papelNome: 'Admin da Loja' },
    { id: 'u2', nome: 'Magno Vieira',   email: 'magno@iguabela.com',  papel: 'gerente',    papelNome: 'Gerente' },
    { id: 'u3', nome: 'Paulo Henrique', email: 'paulo@iguabela.com',  papel: 'vendedor',   papelNome: 'Vendedor' },
    { id: 'u4', nome: 'Larissa Souza',  email: 'larissa@iguabela.com',papel: 'atendente',  papelNome: 'Atendente' },
    { id: 'u5', nome: 'Daniel Costa',   email: 'daniel@iguabela.com', papel: 'atendente',  papelNome: 'Atendente' },
    { id: 'u6', nome: 'Fátima Coelho',  email: 'fatima@iguabela.com', papel: 'vendedor',   papelNome: 'Vendedor' },
  ];

  // Clientes — GET /chatbot/clientes -> { clientes:[...] } (shape de clienteDtoToRow)
  const CLIENTES = [
    { id: 'c1', nome: 'Cícera Vanderlânia da Silva Paz', empresa: '',                  telefone: '(88) 99745-1122', email: 'cicera@email.com',  cidade: 'Iguatu',            uf: 'CE', segmento: 'ouro',    ativo: true,  origemLead: 'Instagram', atendente: 'Karla Zambelly', criadoEm: '2025-11-02T13:00:00Z', orders: 7, ltv: 4890.00, ultimaCompra: '2026-05-30T16:20:00Z', tipoPessoa: 'pf', estagio: 'cliente' },
    { id: 'c2', nome: 'Bruno Aragão',                    empresa: 'Aragão Veículos',    telefone: '(85) 98812-3344', email: 'bruno@aragaov.com', cidade: 'Fortaleza',         uf: 'CE', segmento: 'prata',   ativo: true,  origemLead: 'WhatsApp',  atendente: 'Magno Vieira',   criadoEm: '2026-01-15T10:30:00Z', orders: 3, ltv: 1280.00, ultimaCompra: '2026-04-12T11:00:00Z', tipoPessoa: 'pj', razaoSocial: 'Aragão Veículos LTDA', nomeFantasia: 'Aragão Veículos', estagio: 'cliente' },
    { id: 'c3', nome: 'Patrícia Furtado',                empresa: '',                  telefone: '(88) 99123-7788', email: 'patricia@email.com',cidade: 'Juazeiro do Norte', uf: 'CE', segmento: 'bronze',  ativo: true,  origemLead: 'Indicação', atendente: 'Larissa Souza',  criadoEm: '2026-02-20T09:10:00Z', orders: 1, ltv: 320.00,  ultimaCompra: '2026-02-20T09:30:00Z', tipoPessoa: 'pf', estagio: 'cliente' },
    { id: 'c4', nome: 'Carlos Endwer',                   empresa: '',                  telefone: '(85) 99500-1212', email: 'carlos@email.com',  cidade: 'Sobral',            uf: 'CE', segmento: 'ouro',    ativo: true,  origemLead: 'Facebook',  atendente: 'Paulo Henrique', criadoEm: '2025-09-18T14:45:00Z', orders: 12,ltv: 9620.00, ultimaCompra: '2026-06-01T18:05:00Z', tipoPessoa: 'pf', estagio: 'cliente' },
    { id: 'c5', nome: 'Sara Pereira',                    empresa: '',                  telefone: '(88) 99887-6655', email: 'sara@email.com',    cidade: 'Crato',             uf: 'CE', segmento: 'prata',   ativo: false, origemLead: 'Site',      atendente: 'Karla Zambelly', criadoEm: '2025-12-05T16:00:00Z', orders: 2, ltv: 760.00,  ultimaCompra: '2026-03-22T10:15:00Z', tipoPessoa: 'pf', estagio: 'cliente' },
    { id: 'c6', nome: 'Roberto Lima',                    empresa: 'RL Distribuidora',   telefone: '(85) 98700-9090', email: 'roberto@rldist.com',cidade: 'Maracanaú',         uf: 'CE', segmento: 'ouro',    ativo: true,  origemLead: 'WhatsApp',  atendente: 'Daniel Costa',   criadoEm: '2025-10-28T11:20:00Z', orders: 9, ltv: 6310.00, ultimaCompra: '2026-05-19T09:40:00Z', tipoPessoa: 'pj', razaoSocial: 'RL Distribuidora ME', nomeFantasia: 'RL Distribuidora', estagio: 'cliente' },
    { id: 'c7', nome: 'Karla Cavalcante',                empresa: '',                  telefone: '(88) 99345-2211', email: 'karlac@email.com',  cidade: 'Iguatu',            uf: 'CE', segmento: 'bronze',  ativo: true,  origemLead: 'Instagram', atendente: 'Larissa Souza',  criadoEm: '2026-03-10T15:30:00Z', orders: 1, ltv: 180.00,  ultimaCompra: '2026-03-10T15:50:00Z', tipoPessoa: 'pf', estagio: 'cliente' },
    { id: 'c8', nome: 'Fátima Souto',                    empresa: '',                  telefone: '(85) 99611-7373', email: 'fatimas@email.com', cidade: 'Fortaleza',         uf: 'CE', segmento: 'prata',   ativo: true,  origemLead: 'Indicação', atendente: 'Magno Vieira',   criadoEm: '2026-04-01T08:00:00Z', orders: 4, ltv: 2140.00, ultimaCompra: '2026-05-28T17:10:00Z', tipoPessoa: 'pf', estagio: 'cliente' },
  ];

  // Leads em estágio 'lead' (ficha de clientes) — usado quando ?estagio=lead ou sem filtro.
  const CLIENTES_LEAD = [
    { id: 'cl1', nome: 'Júlia Mendes',     empresa: '', telefone: '(85) 99222-3311', email: 'julia@email.com',   cidade: 'Fortaleza', uf: 'CE', segmento: 'bronze', ativo: true, origemLead: 'Instagram', atendente: 'Larissa Souza', criadoEm: '2026-06-05T12:00:00Z', orders: 0, ltv: 0, ultimaCompra: null, tipoPessoa: 'pf', estagio: 'lead' },
    { id: 'cl2', nome: 'Matheus Gestor',   empresa: '', telefone: '(88) 99444-5566', email: 'matheus@email.com', cidade: 'Iguatu',    uf: 'CE', segmento: 'bronze', ativo: true, origemLead: 'WhatsApp',  atendente: 'Daniel Costa',  criadoEm: '2026-06-06T09:30:00Z', orders: 0, ltv: 0, ultimaCompra: null, tipoPessoa: 'pf', estagio: 'lead' },
    { id: 'cl3', nome: 'Thaís Aragão',     empresa: '', telefone: '(85) 99777-8899', email: 'thais@email.com',   cidade: 'Sobral',    uf: 'CE', segmento: 'bronze', ativo: true, origemLead: 'Facebook',  atendente: 'Paulo Henrique',criadoEm: '2026-06-07T16:45:00Z', orders: 0, ltv: 0, ultimaCompra: null, tipoPessoa: 'pf', estagio: 'lead' },
  ];

  // Leads (comercial) — GET /leads -> { leads:[...] } (shape de mapLead)
  const LEADS = [
    { id: 'l1', name: 'Júlia Mendes',    company: '',                phone: '(85) 99222-3311', email: 'julia@email.com',   value: 890,  source: 'Instagram', stage: 'novo',       attendant: 'Agente IA',     tags: ['quente'],    obs: 'Pediu orçamento do Pacote Noiva.',     date: '05/06/2026' },
    { id: 'l2', name: 'Matheus Gestor',  company: 'MG Contábil',     phone: '(88) 99444-5566', email: 'matheus@email.com', value: 1450, source: 'WhatsApp',  stage: 'contato',    attendant: 'Larissa Souza', tags: ['empresa'],   obs: '',                                     date: '06/06/2026' },
    { id: 'l3', name: 'Thaís Aragão',    company: '',                phone: '(85) 99777-8899', email: 'thais@email.com',   value: 320,  source: 'Facebook',  stage: 'qualificado',attendant: 'Paulo Henrique',tags: [],            obs: 'Quer agendar limpeza de pele.',        date: '07/06/2026' },
    { id: 'l4', name: 'Wilemson Pinto',  company: '',                phone: '(88) 99100-2020', email: 'wilemson@email.com',value: 540,  source: 'Indicação', stage: 'proposta',   attendant: 'Agente IA',     tags: ['retorno'],   obs: '',                                     date: '07/06/2026' },
    { id: 'l5', name: 'Iany Maia',       company: 'Studio Iany',     phone: '(85) 99055-7788', email: 'iany@email.com',    value: 2450, source: 'Site',      stage: 'negociacao', attendant: 'Magno Vieira',  tags: ['quente'],    obs: 'Fechando pacote completo.',            date: '08/06/2026' },
    { id: 'l6', name: 'Alex Soares',     company: '',                phone: '(88) 99033-4455', email: 'alex@email.com',    value: 180,  source: 'Instagram', stage: 'novo',       attendant: 'Daniel Costa',  tags: [],            obs: '',                                     date: '08/06/2026' },
  ];

  // Catálogo — GET /catalogo/produtos -> { produtos:[...] } (shape lido por produtoDtoToRow)
  const PRODUTOS = [
    { id: 'p1',  tipo: 'servico', nome: 'Limpeza de Pele Profunda', categoria: 'Estética facial', descricaoCurta: 'Higienização + extração + máscara', preco: 320.00, precoPromo: null,   custo: 90,  unidade: 'UN', estoque: 0,  estoqueMin: 0, controlaEstoque: false, ativo: true,  vendas: 42, criadoEm: '2025-08-10T10:00:00Z', duracao: 60 },
    { id: 'p2',  tipo: 'servico', nome: 'Massagem Modeladora',      categoria: 'Corporal',        descricaoCurta: 'Sessão de 50 min',                 preco: 180.00, precoPromo: 150.00, custo: 50,  unidade: 'UN', estoque: 0,  estoqueMin: 0, controlaEstoque: false, ativo: true,  vendas: 65, criadoEm: '2025-08-12T10:00:00Z', duracao: 50 },
    { id: 'p3',  tipo: 'servico', nome: 'Pacote Noiva',             categoria: 'Pacotes',         descricaoCurta: 'Day spa + maquiagem + cabelo',     preco: 2450.00,precoPromo: null,   custo: 700, unidade: 'UN', estoque: 0,  estoqueMin: 0, controlaEstoque: false, ativo: true,  vendas: 8,  criadoEm: '2025-09-01T10:00:00Z', duracao: 240 },
    { id: 'p4',  tipo: 'servico', nome: 'Drenagem Linfática',       categoria: 'Corporal',        descricaoCurta: 'Sessão avulsa',                    preco: 150.00, precoPromo: null,   custo: 40,  unidade: 'UN', estoque: 0,  estoqueMin: 0, controlaEstoque: false, ativo: true,  vendas: 51, criadoEm: '2025-09-05T10:00:00Z', duracao: 60 },
    { id: 'p5',  tipo: 'servico', nome: 'Depilação a Laser',        categoria: 'Estética',        descricaoCurta: 'Axila / virilha',                  preco: 480.00, precoPromo: 420.00, custo: 120, unidade: 'UN', estoque: 0,  estoqueMin: 0, controlaEstoque: false, ativo: true,  vendas: 23, criadoEm: '2025-10-02T10:00:00Z', duracao: 30 },
    { id: 'p6',  tipo: 'produto', nome: 'Sérum Vitamina C 30ml',    categoria: 'Skincare',        descricaoCurta: 'Antioxidante facial',              preco: 129.90, precoPromo: null,   custo: 45,  unidade: 'UN', estoque: 34, estoqueMin: 10,controlaEstoque: true,  ativo: true,  vendas: 88, criadoEm: '2025-07-20T10:00:00Z' },
    { id: 'p7',  tipo: 'produto', nome: 'Protetor Solar FPS 60',    categoria: 'Skincare',        descricaoCurta: 'Toque seco 50g',                   preco: 89.90,  precoPromo: 74.90,  custo: 30,  unidade: 'UN', estoque: 6,  estoqueMin: 12,controlaEstoque: true,  ativo: true,  vendas: 120,criadoEm: '2025-07-22T10:00:00Z' },
    { id: 'p8',  tipo: 'produto', nome: 'Máscara Hidratante 200g',  categoria: 'Cabelo',          descricaoCurta: 'Reconstrução capilar',             preco: 64.90,  precoPromo: null,   custo: 22,  unidade: 'UN', estoque: 0,  estoqueMin: 8, controlaEstoque: true,  ativo: true,  vendas: 47, criadoEm: '2025-08-01T10:00:00Z' },
    { id: 'p9',  tipo: 'produto', nome: 'Óleo Corporal 120ml',      categoria: 'Corporal',        descricaoCurta: 'Hidratação pós-banho',             preco: 54.90,  precoPromo: null,   custo: 18,  unidade: 'UN', estoque: 19, estoqueMin: 6, controlaEstoque: true,  ativo: false, vendas: 12, criadoEm: '2025-11-15T10:00:00Z' },
    { id: 'p10', tipo: 'produto', nome: 'Kit Skincare Completo',    categoria: 'Kits',            descricaoCurta: 'Limpeza + tônico + hidratante',    preco: 249.90, precoPromo: 199.90, custo: 95,  unidade: 'KIT',estoque: 11, estoqueMin: 4, controlaEstoque: true,  ativo: true,  vendas: 31, criadoEm: '2025-12-01T10:00:00Z' },
  ];

  // Vendas — GET /vendas -> { vendas:[...] } (shape de mapVenda). (A tela Vendas usa
  // seed próprio no demo; isto cobre quem chamar getVendas direto.)
  const VENDAS = [
    { id: 'v1', codigo: 'MJT-526586', clienteId: 'c4', clienteNome: 'Carlos Endwer',  vendedor: 'Paulo Henrique', subtotal: 480, desconto: 0,  acrescimo: 0, total: 480, pagamentos: [{ forma: 'PIX', valor: 480 }],          status: 'concluida', criadoEm: '2026-06-01T18:05:00Z', itens: [{ id: 'vi1', produtoId: 'p5', nome: 'Depilação a Laser', preco: 480, quantidade: 1, subtotal: 480 }] },
    { id: 'v2', codigo: 'KZP-118420', clienteId: 'c1', clienteNome: 'Cícera V. da Silva', vendedor: 'Karla Zambelly', subtotal: 320, desconto: 16, acrescimo: 0, total: 304, pagamentos: [{ forma: 'Dinheiro', valor: 304 }],   status: 'concluida', criadoEm: '2026-05-30T16:20:00Z', itens: [{ id: 'vi2', produtoId: 'p1', nome: 'Limpeza de Pele Profunda', preco: 320, quantidade: 1, subtotal: 320 }] },
    { id: 'v3', codigo: 'RLD-770301', clienteId: 'c6', clienteNome: 'Roberto Lima',   vendedor: 'Daniel Costa',   subtotal: 519.6,desconto: 0, acrescimo: 0, total: 519.6,pagamentos: [{ forma: 'Cartão Crédito', valor: 519.6, parcelas: 3 }], status: 'concluida', criadoEm: '2026-05-19T09:40:00Z', itens: [{ id: 'vi3', produtoId: 'p6', nome: 'Sérum Vitamina C 30ml', preco: 129.90, quantidade: 4, subtotal: 519.6 }] },
  ];

  // Inbox — GET /chatbot/contatos -> { contatos:[...] } (shape de mapContato)
  const CONTATOS = [
    { id: 'k1', nome: 'Cícera Vanderlânia', clienteId: 'c1', foto: null, telefone: '(88) 99745-1122', email: 'cicera@email.com', canal: 'whatsapp',  ia: false, status: 'ativo', naoLidas: 2, fixado: true,  ultimaMsg: '2026-06-09T11:40:00Z', ultimaMensagem: 'Perfeito, pode agendar pra sexta 😍', ultimaMidiaTipo: null, ultimaPorEmpresa: false, ultimaEntregue: true, tags: [{ id: 't1', nome: 'VIP', cor: '#f59e0b' }] },
    { id: 'k2', nome: 'Bruno Aragão',       clienteId: 'c2', foto: null, telefone: '(85) 98812-3344', email: 'bruno@aragaov.com',canal: 'instagram', ia: true,  status: 'ativo', naoLidas: 0, fixado: false, ultimaMsg: '2026-06-09T10:05:00Z', ultimaMensagem: 'Qual o valor do pacote?', ultimaMidiaTipo: null, ultimaPorEmpresa: false, ultimaEntregue: true, tags: [] },
    { id: 'k3', nome: 'Patrícia Furtado',   clienteId: 'c3', foto: null, telefone: '(88) 99123-7788', email: 'patricia@email.com',canal: 'whatsapp', ia: false, status: 'ativo', naoLidas: 0, fixado: false, ultimaMsg: '2026-06-08T17:22:00Z', ultimaMensagem: 'Obrigada!', ultimaMidiaTipo: null, ultimaPorEmpresa: true, ultimaEntregue: true, tags: [] },
    { id: 'k4', nome: 'Carlos Endwer',      clienteId: 'c4', foto: null, telefone: '(85) 99500-1212', email: 'carlos@email.com', canal: 'facebook',  ia: false, status: 'ativo', naoLidas: 1, fixado: false, ultimaMsg: '2026-06-08T14:00:00Z', ultimaMensagem: 'Mandei o comprovante', ultimaMidiaTipo: 'imagem', ultimaPorEmpresa: false, ultimaEntregue: true, tags: [] },
    { id: 'k5', nome: 'Júlia Mendes',       clienteId: 'cl1',foto: null, telefone: '(85) 99222-3311', email: 'julia@email.com',  canal: 'instagram', ia: true,  status: 'ativo', naoLidas: 3, fixado: false, ultimaMsg: '2026-06-09T09:12:00Z', ultimaMensagem: 'Oi! Vi o anúncio do Pacote Noiva', ultimaMidiaTipo: null, ultimaPorEmpresa: false, ultimaEntregue: true, tags: [{ id: 't2', nome: 'Lead', cor: '#22c55e' }] },
    { id: 'k6', nome: 'Roberto Lima',       clienteId: 'c6', foto: null, telefone: '(85) 98700-9090', email: 'roberto@rldist.com',canal: 'whatsapp', ia: false, status: 'finalizado', naoLidas: 0, fixado: false, ultimaMsg: '2026-06-07T19:30:00Z', ultimaMensagem: 'Fechado, valeu!', ultimaMidiaTipo: null, ultimaPorEmpresa: false, ultimaEntregue: true, tags: [] },
  ];

  // Thread padrão para qualquer contato aberto — GET /chatbot/contatos/:id/mensagens
  function mensagensDe(contatoId) {
    const c = CONTATOS.find((x) => x.id === contatoId);
    const nome = (c && c.nome) || 'Cliente';
    return [
      { id: 'm1', tipo: 'texto', texto: 'Oi! Tudo bem? Queria saber sobre os serviços de vocês 😊', deCliente: true,  criadoEm: '2026-06-09T09:00:00Z' },
      { id: 'm2', tipo: 'texto', texto: 'Olá, ' + (nome.split(' ')[0]) + '! Tudo ótimo 💚 Claro, posso te ajudar. O que você procura?', deCliente: false, criadoEm: '2026-06-09T09:02:00Z' },
      { id: 'm3', tipo: 'texto', texto: 'Vi o Pacote Noiva no Instagram, queria valores e datas.', deCliente: true,  criadoEm: '2026-06-09T09:05:00Z' },
      { id: 'm4', tipo: 'texto', texto: 'O Pacote Noiva sai R$ 2.450 e inclui day spa, maquiagem e cabelo. Temos agenda a partir da próxima semana!', deCliente: false, criadoEm: '2026-06-09T09:07:00Z' },
      { id: 'm5', tipo: 'texto', texto: 'Perfeito, pode agendar pra sexta 😍', deCliente: true, criadoEm: '2026-06-09T11:40:00Z' },
    ];
  }

  // Plataforma (Super Admin) — GET /plataforma/clientes -> { clientes:[...] }
  const PLAT_CLIENTES = [
    { id: 'pc1', tipo: 'pj', name: 'Iguabela Beleza', razao: 'Iguabela Cosméticos LTDA', fantasia: 'Iguabela Beleza', cnpj: '12.345.678/0001-90', doc: '12.345.678/0001-90', email: 'contato@iguabela.com', phone: '(88) 99745-1122', cidade: 'Iguatu', uf: 'CE', plano: 'Profissional', planoId: 'pl2', status: 'ativo',  empresaId: 'emp-iguabela', subdominio: 'iguabela', statusLoja: 'ativa', date: '10/08/2025', createdAt: '2025-08-10T10:00:00Z' },
    { id: 'pc2', tipo: 'pj', name: 'Ótica Scalloop',  razao: 'Scalloop Comércio de Óticas ME', fantasia: 'Ótica Scalloop', cnpj: '98.765.432/0001-10', doc: '98.765.432/0001-10', email: 'contato@scalloop.io', phone: '(88) 99100-2020', cidade: 'Iguatu', uf: 'CE', plano: 'Avançado', planoId: 'pl3', status: 'ativo',  empresaId: 'emp-scalloop', subdominio: 'scalloop', statusLoja: 'ativa', date: '02/09/2025', createdAt: '2025-09-02T10:00:00Z' },
    { id: 'pc3', tipo: 'pj', name: 'Studio Iany',     razao: 'Iany Maia Estética ME', fantasia: 'Studio Iany', cnpj: '11.222.333/0001-44', doc: '11.222.333/0001-44', email: 'studio@iany.com', phone: '(85) 99055-7788', cidade: 'Fortaleza', uf: 'CE', plano: 'Essencial', planoId: 'pl1', status: 'trial', empresaId: '', subdominio: 'studioiany', statusLoja: 'provisionando', date: '05/06/2026', createdAt: '2026-06-05T10:00:00Z' },
    { id: 'pc4', tipo: 'pf', name: 'Daniel Costa',    razao: '', fantasia: '', cpf: '123.456.789-00', doc: '123.456.789-00', email: 'daniel@email.com', phone: '(85) 98700-9090', cidade: 'Maracanaú', uf: 'CE', plano: '', planoId: '', status: 'novo', empresaId: '', subdominio: '', statusLoja: '', date: '08/06/2026', createdAt: '2026-06-08T10:00:00Z' },
  ];

  // Planos — GET /plataforma/planos -> { planos:[...] } (shape de mapPlano)
  const PLANOS = [
    { id: 'pl1', name: 'Essencial', features: 'Para começar: 1 canal e o básico do atendimento.', price: 97,  conv: 1000, users: 2,  channels: 'WhatsApp', active: 3, cor: '#22C55E', destaque: false, status: true, ciclo: 'mensal', conversasIlim: false, usuariosIlim: false, iaNivel: 'basica', iaAgentes: 1, crm: '1funil', relatorios: 'basico', suporte: 'padrao', trial: true, trialDias: 7, canais: { whatsapp: true, instagram: false, facebook: false, site: false }, modulos: { comercial: true, financeiro: false, agenda: true, catalogo: true, marketing: false }, avancados: { api: false, automacoes: false, whitelabel: false, dominio: false }, ordem: 1 },
    { id: 'pl2', name: 'Profissional', features: 'Multicanal + CRM completo + agenda.', price: 197, conv: 5000, users: 6,  channels: 'WhatsApp + Instagram + Facebook', active: 12, cor: '#2563EB', destaque: true, status: true, ciclo: 'mensal', conversasIlim: false, usuariosIlim: false, iaNivel: 'avancada', iaAgentes: 3, crm: 'multifunil', relatorios: 'avancado', suporte: 'prioritario', trial: true, trialDias: 14, canais: { whatsapp: true, instagram: true, facebook: true, site: true }, modulos: { comercial: true, financeiro: true, agenda: true, catalogo: true, marketing: true }, avancados: { api: false, automacoes: true, whitelabel: false, dominio: false }, ordem: 2 },
    { id: 'pl3', name: 'Avançado', features: 'Tudo do Profissional + API, automações e white-label.', price: 397, conv: null, users: null, channels: 'WhatsApp + Instagram + Facebook + Chat de site', active: 5, cor: '#7C3AED', destaque: false, status: true, ciclo: 'mensal', conversasIlim: true, usuariosIlim: true, iaNivel: 'avancada', iaAgentes: 10, crm: 'multifunil', relatorios: 'avancado', suporte: 'dedicado', trial: false, trialDias: 0, canais: { whatsapp: true, instagram: true, facebook: true, site: true }, modulos: { comercial: true, financeiro: true, agenda: true, catalogo: true, marketing: true }, avancados: { api: true, automacoes: true, whitelabel: true, dominio: true }, ordem: 3 },
  ];

  // /auth/me no demo (a identidade visível já vem do store; isto evita erro de rede)
  const ME = {
    user: {
      id: 'demo-user', name: 'Visitante (demo)', email: 'demo@pk360.app',
      papel: 'admin_loja', papelNome: 'Admin da Loja',
      empresa: { id: 'emp-demo', nome: 'Iguabela Beleza · DEMO' },
      permissoes: [], preferencias: null,
    },
  };

  // ───────────────────────── resolver ─────────────────────────
  // helper: separa querystring e devolve { path, q } (objeto de params)
  function splitQuery(full) {
    const i = full.indexOf('?');
    if (i < 0) return { path: full, q: {} };
    const path = full.slice(0, i);
    const q = {};
    full.slice(i + 1).split('&').forEach((kv) => {
      const [k, v] = kv.split('=');
      if (k) q[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
    return { path, q };
  }

  function byNome(list, q) {
    if (!q || !q.q) return list;
    const t = q.q.toLowerCase();
    return list.filter((c) => (c.nome || c.name || '').toLowerCase().includes(t));
  }

  // GETs ricos (tabela de rotas). Cada entrada: [regex, fn(match, q)].
  const GET_ROUTES = [
    [/^\/auth\/me$/,                      () => ME],
    [/^\/agenda\/usuarios$/,             () => ({ usuarios: USUARIOS })],
    [/^\/leads$/,                        () => ({ leads: LEADS })],
    [/^\/catalogo\/produtos$/,           () => ({ produtos: PRODUTOS })],
    [/^\/catalogo\/produtos\/[^/]+\/movimentacoes$/, () => ({ movimentacoes: [] })],
    [/^\/vendas$/,                       () => ({ vendas: VENDAS })],
    [/^\/chatbot\/contatos$/,            () => ({ contatos: CONTATOS })],
    [/^\/chatbot\/contatos\/([^/]+)\/mensagens$/, (m) => ({ mensagens: mensagensDe(m[1]) })],
    [/^\/chatbot\/contatos\/([^/]+)\/midias$/,    () => ({ midias: [] })],
    [/^\/plataforma\/clientes$/,         (m, q) => ({ clientes: byNome(PLAT_CLIENTES, q) })],
    [/^\/plataforma\/planos$/,           () => ({ planos: PLANOS })],
    [/^\/plataforma\/planos\/[^/]+\/lojas$/, () => ({ lojas: [] })],
    [/^\/chatbot\/clientes\/([^/]+)$/,   (m) => ({ cliente: CLIENTES.concat(CLIENTES_LEAD).find((c) => c.id === m[1]) || CLIENTES[0] })],
    [/^\/chatbot\/clientes$/, (m, q) => {
      let list;
      if (q.estagio === 'cliente') list = CLIENTES;
      else if (q.estagio === 'lead') list = CLIENTES_LEAD;
      else list = CLIENTES.concat(CLIENTES_LEAD);
      return { clientes: byNome(list, q) };
    }],
  ];

  function resolveSync(fullPath, method, body) {
    const { path, q } = splitQuery(fullPath);
    const m = (method || 'GET').toUpperCase();

    if (m === 'GET') {
      for (const [re, fn] of GET_ROUTES) {
        const mm = path.match(re);
        if (mm) return fn(mm, q);
      }
      // Fallback seguro: a maioria das telas faz `(r.chave || []).map(...)`,
      // então um objeto vazio vira lista vazia sem quebrar. Zero dado real.
      return {};
    }

    // Escritas (POST/PATCH/PUT/DELETE) — no-op de PREVIEW: sucesso "de mentira".
    // Echo do corpo + id falso pra fluxos otimistas não estourarem.
    const echo = (body && typeof body === 'object') ? body : {};
    return { ok: true, id: 'demo-' + Math.random().toString(36).slice(2, 9), ...echo };
  }

  // Pequeno atraso (~160ms) só pra os skeletons aparecerem naturalmente.
  function resolve(fullPath, method, body) {
    const data = resolveSync(fullPath, method, body);
    return new Promise((res) => setTimeout(() => res(data), 160));
  }

  window.DEMO_MOCK = { resolve, _data: { USUARIOS, CLIENTES, LEADS, PRODUTOS, VENDAS, CONTATOS, PLAT_CLIENTES, PLANOS } };
})();
