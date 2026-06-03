// data.jsx — Mock data for the prototype

const COLORS_AVATAR = ['#16a34a','#7c3aed','#2563eb','#ec4899','#f59e0b','#14b8a6','#f43f5e','#8b5cf6','#3b82f6','#22c55e'];
const colorFor = (s) => COLORS_AVATAR[Math.abs([...(s||'?')].reduce((a,c)=>a+c.charCodeAt(0),0)) % COLORS_AVATAR.length];
const initials = (n) => (n||'?').split(/\s+/).filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase();

const TENANT = { name: 'Iguabela Beleza', segment: 'Beleza & Estética' };

const TEAM = [
  { id: 'ph', name: 'Paulo Henrique', role: 'Administrador', email: 'paulo@iguabela.com', phone: '(85) 9 9840-4185', status: 'ativo', meta: 60000, vendido: 48500 },
  { id: 'kz', name: 'Karla Zambelly', role: 'Gerente Comercial', email: 'karla@iguabela.com', phone: '(85) 9 9800-1234', status: 'ativo', meta: 40000, vendido: 35200 },
  { id: 'mv', name: 'Magno Vieira',   role: 'Vendedor',          email: 'magno@iguabela.com', phone: '(85) 9 9800-5678', status: 'ativo', meta: 20000, vendido: 22100 },
  { id: 'fj', name: 'Francisco Junior', role: 'Vendedor',        email: 'francisco@iguabela.com', phone: '(85) 9 9800-9012', status: 'ativo', meta: 20000, vendido: 18700 },
  { id: 'ce', name: 'Carlos Endwer',  role: 'Analista',           email: 'carlos@iguabela.com', phone: '(85) 9 9800-3456', status: 'inativo', meta: 15000, vendido: 8400 },
];

// Conversations / messages
const CONVERSATIONS = [
  {
    id: 'c1', client: 'Magno Vieira', avatar: 'MV', channel: 'whatsapp', status: 'em-andamento',
    lastTime: '17:15', tag: 'PROSPECT', preview: 'Olá, bom dia, tudo bem?', unread: 0,
    handler: 'agent', phone: '(85) 9 9999-9999', email: 'contato@empresa.com',
    aiSummary: 'Cliente interessado no plano Iguabela Premium para 3 funcionárias. Já enviou currículo. Próximo passo: agendar reunião.',
    messages: [
      { from: 'client', kind: 'doc', filename: 'Curriculum maria', meta: '3 páginas · PDF · 994 kb', time: '15/01/2026' },
      { from: 'agent',  kind: 'doc', filename: 'Curriculum maria', meta: '3 páginas · PDF · 994 kb', time: '16/01/2026', ai: true },
      { from: 'client', kind: 'text', text: 'Fala meu amigo, bom dia, tudo bem? Esse é o modelo de mensagem que a gente vai deixar aqui!', time: '16/01/2026' },
      { from: 'agent',  kind: 'text', text: 'Bom dia! Tudo ótimo. Posso te ajudar com informações sobre o plano. Você tem interesse em qual modalidade?', time: '16/01/2026', ai: true },
      { from: 'client', kind: 'audio', dur: '1:23', time: '16/01/2026' },
      { from: 'agent',  kind: 'text', text: 'Entendi! Vou agendar uma reunião com nossa gerente comercial para você. Pode ser amanhã às 10h?', time: '16/01/2026', ai: true, flag: 'AGENDAR' },
    ],
  },
  { id: 'c2', client: 'Karla Zambelly', avatar: 'KZ', channel: 'whatsapp', status: 'em-andamento', lastTime: '08:17', tag: 'CLIENTE', preview: 'Oi, bom dia, tudo bem?', unread: 2, handler: 'agent', aiSummary: 'Cliente recorrente perguntando sobre disponibilidade de horário para procedimento.' },
  { id: 'c3', client: 'Francisco Junior', avatar: 'FJ', channel: 'instagram', status: 'pendente', lastTime: '08:01', tag: 'PROSPECT', preview: 'Vocês fazem entrega aqui na minha região?', unread: 1, handler: 'queue', waitMin: 7 },
  { id: 'c4', client: 'Carlos Endwer', avatar: 'CE', channel: 'whatsapp', status: 'em-andamento', lastTime: 'Ontem', tag: 'PROSPECT', preview: 'Olá, bom dia, tudo bem?', unread: 0, handler: 'human', assignee: 'kz' },
  { id: 'c5', client: 'Airton Silva', avatar: 'AS', channel: 'facebook', status: 'em-andamento', lastTime: 'Ontem', tag: 'CLIENTE', preview: 'Quando podemos marcar?', unread: 0, handler: 'agent' },
  { id: 'c6', client: 'Patrícia Furtado', avatar: 'PF', channel: 'whatsapp', status: 'pendente', lastTime: '07:42', tag: 'PROSPECT', preview: 'Quanto custa o pacote anual?', unread: 1, handler: 'queue', waitMin: 3 },
  { id: 'c7', client: 'Silvio Sobreira', avatar: 'SS', channel: 'instagram', status: 'encerrada', lastTime: 'Seg', tag: 'CLIENTE', preview: 'Obrigado, até a próxima!', unread: 0, handler: 'agent' },
  { id: 'c8', client: 'Daniel Gerente', avatar: 'DG', channel: 'whatsapp', status: 'em-andamento', lastTime: 'Seg', tag: 'PROSPECT', preview: 'Pode me mandar a tabela?', unread: 0, handler: 'agent' },
  { id: 'c9',  client: 'Júlia Mendes',     avatar:'JM', channel: 'instagram', status: 'em-andamento', lastTime: '17:02', tag: 'CLIENTE',  preview: 'Posso pagar em 3x sem juros?',          unread: 3, handler: 'human', assignee: 'kz' },
  { id: 'c10', client: 'Roberto Lima',     avatar:'RL', channel: 'whatsapp',  status: 'pendente',     lastTime: '16:48', tag: 'PROSPECT', preview: 'Tenho interesse no plano Pro',          unread: 1, handler: 'queue', waitMin: 12 },
  { id: 'c11', client: 'Fátima Coelho',    avatar:'FC', channel: 'facebook',  status: 'em-andamento', lastTime: '16:30', tag: 'PROSPECT', preview: 'Vocês atendem em Fortaleza?',          unread: 0, handler: 'agent' },
  { id: 'c12', client: 'Cesar Veículos',   avatar:'CV', channel: 'whatsapp',  status: 'em-andamento', lastTime: '15:55', tag: 'CLIENTE',  preview: 'Aguardo o orçamento, obrigado',         unread: 2, handler: 'human', assignee: 'kz' },
  { id: 'c13', client: 'Marcela Tavares',  avatar:'MT', channel: 'instagram', status: 'pendente',     lastTime: '15:20', tag: 'PROSPECT', preview: 'Recebi o link, mas não consegui abrir', unread: 1, handler: 'queue', waitMin: 22 },
  { id: 'c14', client: 'Bruno Aragão',     avatar:'BA', channel: 'whatsapp',  status: 'em-andamento', lastTime: '14:48', tag: 'CLIENTE',  preview: 'Vou confirmar o horário daqui a pouco', unread: 0, handler: 'agent' },
  { id: 'c15', client: 'Letícia Maranhão', avatar:'LM', channel: 'whatsapp',  status: 'em-andamento', lastTime: '14:10', tag: 'CLIENTE',  preview: 'Obrigada pelo atendimento ❤️',         unread: 0, handler: 'human', assignee: 'kz' },
  { id: 'c16', client: 'Henrique Castro',  avatar:'HC', channel: 'facebook',  status: 'em-andamento', lastTime: '13:32', tag: 'PROSPECT', preview: 'Qual a diferença entre os planos?',     unread: 1, handler: 'agent' },
  { id: 'c17', client: 'Sandra Vieira',    avatar:'SV', channel: 'instagram', status: 'encerrada',    lastTime: 'Ontem', tag: 'CLIENTE',  preview: 'Pode encerrar, muito obrigada!',       unread: 0, handler: 'human' },
  { id: 'c18', client: 'Pedro Mafra',      avatar:'PM', channel: 'whatsapp',  status: 'pendente',     lastTime: '12:55', tag: 'PROSPECT', preview: 'Não consegui finalizar o cadastro',    unread: 2, handler: 'queue', waitMin: 31 },
  { id: 'c19', client: 'Talita Souto',     avatar:'TS', channel: 'whatsapp',  status: 'em-andamento', lastTime: '12:14', tag: 'PROSPECT', preview: 'Quero conhecer melhor os pacotes',     unread: 0, handler: 'agent' },
  { id: 'c20', client: 'Eduardo Pacheco',  avatar:'EP', channel: 'instagram', status: 'em-andamento', lastTime: '11:48', tag: 'CLIENTE',  preview: 'Foto recebida, obrigado',              unread: 0, handler: 'human', assignee: 'kz' },
  { id: 'c21', client: 'Renata Bastos',    avatar:'RB', channel: 'whatsapp',  status: 'encerrada',    lastTime: 'Seg', tag: 'CLIENTE',  preview: 'Tudo certo, obrigada novamente',         unread: 0, handler: 'human' },
  { id: 'c22', client: 'Otávio Ramires',   avatar:'OR', channel: 'facebook',  status: 'em-andamento', lastTime: '10:20', tag: 'PROSPECT', preview: 'Quero saber sobre indicações',         unread: 4, handler: 'agent' },
  { id: 'c23', client: 'Beatriz Holanda',  avatar:'BH', channel: 'whatsapp',  status: 'pendente',     lastTime: '09:55', tag: 'PROSPECT', preview: 'Pode me retornar quando puder?',       unread: 1, handler: 'queue', waitMin: 45 },
  { id: 'c24', client: 'Gustavo Falcão',   avatar:'GF', channel: 'instagram', status: 'em-andamento', lastTime: '09:18', tag: 'CLIENTE',  preview: 'Aceito a proposta, vamos fechar',      unread: 0, handler: 'human', assignee: 'kz' },
];

// Leads
const LEADS = [
  { name:'Airton Silva',    company:'Joalheria Mimi Deus',    phone:'(85) 9 9870-5043', value: 3890, source:'Instagram',  date:'20/06/2026', stage:'novo' },
  { name:'Patrícia Furtado',company:'Cristal Forma',          phone:'(85) 9 9863-2754', value: 5500, source:'Indicação',  date:'19/06/2026', stage:'contatado' },
  { name:'Silvio Sobreira', company:'DELTA',                  phone:'(85) 9 9259-3441', value: 7200, source:'Google',     date:'18/06/2026', stage:'qualificado' },
  { name:'Daniel Gerente',  company:'Posto KG',               phone:'(85) 9 9454-1181', value: 3890, source:'WhatsApp',   date:'17/06/2026', stage:'proposta' },
  { name:'Fátima Coelho',   company:'Col. Frei Damião',       phone:'(85) 9 9551-1025', value: 9800, source:'Instagram',  date:'16/06/2026', stage:'negociacao' },
  { name:'Cesar Veículos',  company:'AG Cesar Veículos',      phone:'(85) 9 9881-4401', value: 2400, source:'Facebook',   date:'10/06/2026', stage:'perdido' },
  { name:'Júlia Mendes',    company:'Boutique Júlia',         phone:'(85) 9 9123-4567', value: 4500, source:'Instagram',  date:'15/06/2026', stage:'novo' },
  { name:'Roberto Lima',    company:'Lima Consultoria',       phone:'(85) 9 9876-5432', value: 6300, source:'Indicação',  date:'14/06/2026', stage:'qualificado' },
];

const LEAD_STAGES = [
  { id:'novo',        label:'Novo',         color:'#7c3aed' },
  { id:'contatado',   label:'Contatado',    color:'#3b82f6' },
  { id:'qualificado', label:'Qualificado',  color:'#f59e0b' },
  { id:'proposta',    label:'Proposta',     color:'#14b8a6' },
  { id:'negociacao',  label:'Negociação',   color:'#8b5cf6' },
  { id:'perdido',     label:'Perdido',      color:'#ef4444' },
];

// CRM Boards
const CRM_BOARDS = [
  { id:'pre-venda', name:'Pré-Venda', desc:'Funil de vendas principal', cards: 14, color:'#22C55E', updated:'há 12 min',
    columns: [
      { label:'PROSPECÇÃO',         color:'#FB923C', count: 4, value: 13280 },
      { label:'QUALIFICAÇÃO',       color:'#FACC15', count: 2, value: 3890  },
      { label:'1º CTT - ATENDENTE', color:'#14B8A6', count: 3, value: 15060 },
      { label:'2º CTT - DECISOR',   color:'#7C3AED', count: 2, value: 3890  },
      { label:'PROPOSTA',           color:'#3B82F6', count: 2, value: 8200  },
      { label:'FECHADO',            color:'#22C55E', count: 1, value: 6500  },
    ]
  },
  { id:'pos-venda', name:'Pós-Venda', desc:'Acompanhamento e fidelização', cards: 8, color:'#7C3AED', updated:'há 2 h',
    columns: [
      { label:'ONBOARDING',  color:'#3B82F6', count: 3, value: 12400 },
      { label:'ATIVAÇÃO',    color:'#14B8A6', count: 2, value: 8900  },
      { label:'FIDELIZAÇÃO', color:'#7C3AED', count: 2, value: 15600 },
      { label:'UPSELL',      color:'#EC2B8E', count: 1, value: 4200  },
    ]
  },
  { id:'reativacao', name:'Reativação de Inativos', desc:'Clientes sem compra > 90 dias', cards: 22, color:'#F59E0B', updated:'ontem',
    columns: [
      { label:'IDENTIFICAÇÃO', color:'#F43F5E', count: 8, value: 18400 },
      { label:'ABORDAGEM',     color:'#FB923C', count: 6, value: 22300 },
      { label:'OFERTA',        color:'#FACC15', count: 5, value: 31200 },
      { label:'NEGOCIAÇÃO',    color:'#3B82F6', count: 2, value: 9800  },
      { label:'RECUPERADO',    color:'#22C55E', count: 1, value: 4500  },
    ]
  },
];

const CRM_PHASES = [
  { id:'prospec',     label:'PROSPECÇÃO',        color:'#FB923C', value: 13280 },
  { id:'qualif',      label:'QUALIFICAÇÃO',      color:'#FACC15', value: 3890  },
  { id:'cti1',        label:'1º CTT - ATENDENTE',color:'#14B8A6', value: 15060 },
  { id:'cti2',        label:'2º CTT - DECISOR',  color:'#7C3AED', value: 3890  },
  { id:'reuniao',     label:'REUNIÃO AGENDADA',  color:'#22C55E', value: 7780  },
];

const CRM_CARDS = [
  { phase:'prospec', name:'SARA', company:'FRE DAMIÃO',      phone:'(88) 9 2143-8549', email:'sara@fredamiao.com.br', date:'15 Jun 2026', value: 3890, ai: true, tags:[{label:'VIP',color:'#f59e0b'},{label:'QUENTE',color:'#ef4444'}] },
  { phase:'prospec', name:'KARLA CAVALCANTE', company:'EMABREST', phone:'(88)98170-0005', email:'karla@emabrest.com', date:'18 Jun 2026', value: 5500, tags:[{label:'INDICAÇÃO',color:'#8b5cf6'}] },
  { phase:'prospec', name:'MATHEUS/GESTOR', company:'INOVA FIT', phone:'(88)9.8753-9176', email:'matheus@inovafit.com', date:'18 Jun 2026', value: 3890, tags:[{label:'B2B',color:'#0ea5e9'},{label:'QUENTE',color:'#ef4444'}] },
  { phase:'qualif',  name:'THAIS', company:'PLANETA CALÇADOS', phone:'(88)9.9739.1900', email:'thais@planetacalcados.com', date:'17 Jun 2026', value: 3890, ai: true, tags:[{label:'RECORRENTE',color:'#16a34a'}] },
  { phase:'cti1',    name:'SUELINE', company:'ESCOLA MODELO',  phone:'(88)9.5391-1822', email:'sueline@escolamodelo.com', date:'28 Mar 2026', value: 3890, tags:[{label:'VIP',color:'#f59e0b'}] },
  { phase:'cti1',    name:'WILEMSON', company:'ÓTICAS MORAIS',  phone:'(88)9.8451-5076', email:'wilemson@oticasmorais.com', date:'28 Mar 2026', value: 3890, tags:[{label:'B2B',color:'#0ea5e9'}] },
  { phase:'cti1',    name:'RICARDO DANIEL', company:'DUFT SOLAR', phone:'(88)9.8713-2876', email:'ricardo@duftsolar.com', date:'28 Jun 2026', value: 3890, tags:[{label:'INDICAÇÃO',color:'#8b5cf6'},{label:'QUENTE',color:'#ef4444'}] },
  { phase:'cti1',    name:'FRANCISCO', company:'BIOFARMA IBLATU', phone:'(88)9.9870-8246', email:'francisco@biofarma.com', date:'13 Jun 2026', value: 3890, tags:[{label:'RECORRENTE',color:'#16a34a'}] },
  { phase:'cti2',    name:'FUDA/IANY', company:'CASA DAS LENTES', phone:'(88)9.9826-5497', email:'iany@casadaslentes.com', date:'28 Mar 2026', value: 3890, tags:[{label:'VIP',color:'#f59e0b'},{label:'B2B',color:'#0ea5e9'}] },
  { phase:'reuniao', name:'ALEX', company:'CONSTRUMA',       phone:'(88)9.8724-8113', email:'alex@construma.com', date:'15 Jun 2026', value: 3890, ai: true, tags:[{label:'FECHANDO',color:'#16a34a'}] },
  { phase:'reuniao', name:'JEFFERSON', company:'CASA DAS LENTES', phone:'(88)9.8015-3339', email:'jefferson@casadaslentes.com', date:'15 Jun 2026', value: 3890, tags:[{label:'PROPOSTA',color:'#6366f1'}] },
];

// Contracts
const CONTRACTS = [
  { client:'CASA DAS LENTES',  service:'Gestão de Marca',     value:3890, start:'15/01/2026', end:'15/01/2027', resp:'Karla Zambelly',     status:'ativo' },
  { client:'CONSTRUMA',        service:'Consultoria Comercial',value:5500, start:'01/02/2026', end:'01/02/2027', resp:'Paulo Henrique',     status:'ativo' },
  { client:'ÓTICAS MORAIS',    service:'CRM + Marketing',     value:2890, start:'10/03/2026', end:'10/03/2027', resp:'Francisco Junior',   status:'pendente' },
  { client:'BIOFARMA IBLATU',  service:'Registro de Marca',   value: 887, start:'20/01/2026', end:'20/01/2027', resp:'Magno Vieira',       status:'ativo' },
  { client:'ESCOLA MODELO',    service:'Gestão de Marca',     value:3890, start:'05/04/2026', end:'05/04/2026', resp:'Karla Zambelly',     status:'vencendo' },
  { client:'DUFT SOLAR',       service:'Consultoria',          value:4200, start:'12/05/2026', end:'12/05/2027', resp:'Paulo Henrique',     status:'ativo' },
];

// Catalog
const CATALOG = [
  { name:'Pacote Pré-Sal Premium',       cat:'Pacote',        price:'R$ 3.890,00', stock:'Disponível', desc:'Tratamento facial completo com 6 sessões + brinde.' },
  { name:'Limpeza de Pele Profunda',     cat:'Procedimento',  price:'R$ 320,00',  stock:'Disponível', desc:'Sessão única de 60 minutos com extração e máscara.' },
  { name:'Massagem Modeladora',          cat:'Procedimento',  price:'R$ 180,00',  stock:'Disponível', desc:'Sessão de 50 minutos.' },
  { name:'Pacote Noiva',                 cat:'Pacote',        price:'R$ 2.450,00', stock:'Disponível', desc:'10 sessões pré-evento.' },
  { name:'Drenagem Linfática',           cat:'Procedimento',  price:'R$ 150,00',  stock:'Disponível', desc:'Sessão de 60 minutos.' },
  { name:'Depilação a Laser - Perna inteira', cat:'Procedimento', price:'R$ 480,00', stock:'Esgotado', desc:'Sessão única.' },
  { name:'Combo Spa Day',                cat:'Pacote',        price:'R$ 890,00',  stock:'Disponível', desc:'Dia completo de relaxamento.' },
  { name:'Microagulhamento',             cat:'Procedimento',  price:'R$ 540,00',  stock:'Disponível', desc:'Sessão única.' },
];

// Quick replies
const QUICK_REPLIES = [
  { id:'qr1', cat:'Saudação', title:'/oi', text:'Olá {nome_cliente}! Tudo bem? Como posso te ajudar hoje?' },
  { id:'qr2', cat:'Pagamento', title:'/pix', text:'Nossa chave Pix é {nome_loja}@iguabela.com. Pode enviar o comprovante por aqui.' },
  { id:'qr3', cat:'Prazo', title:'/prazo', text:'O prazo de entrega é de 3 a 5 dias úteis após a confirmação do pagamento.' },
  { id:'qr4', cat:'Saudação', title:'/tchau', text:'Foi um prazer falar com você, {nome_cliente}! Qualquer coisa estamos à disposição.' },
  { id:'qr5', cat:'Pagamento', title:'/parcelar', text:'Aceitamos parcelamento em até 12x no cartão. Posso te enviar o link?' },
];

// Transfer rules
const TRANSFER_RULES = [
  { id:'tr1', name:'Reclamação ou cancelamento', type:'Palavra-chave', config:'reclamar, cancelar, processo, advogado', active:true },
  { id:'tr2', name:'Após 3 erros consecutivos',  type:'Erros',         config:'3 mensagens sem resolução', active:true },
  { id:'tr3', name:'Fora do horário comercial',  type:'Horário',       config:'Antes das 08h ou após 19h', active:true },
  { id:'tr4', name:'Pedido acima de R$ 5.000',   type:'Valor',         config:'Pedidos > R$ 5.000,00', active:false },
];

// Appointments
const APPOINTMENTS = [
  { id:'a1', day: 4, client:'Magno Vieira',     service:'Reunião comercial', start:'10:00', dur:60, resp:'kz', source:'whatsapp', status:'confirmado', byAI: true,  type:'Reunião',      local:'Sala de Reuniões', phone:'(85) 9 9712-3344', obs:'Cliente quer fechar pacote anual. Levar proposta impressa e tabela de planos atualizada.' },
  { id:'a2', day: 4, client:'Karla Zambelly',   service:'Limpeza de pele',   start:'14:30', dur:60, resp:'mv', source:'instagram', status:'agendado', byAI: false, type:'Atendimento',  local:'Sala 2', phone:'(85) 9 9800-1234', obs:'Pele sensível — evitar produtos com ácido. Primeira sessão.' },
  { id:'a3', day: 5, client:'Patrícia Furtado', service:'Drenagem',          start:'09:00', dur:50, resp:'fj', source:'whatsapp', status:'confirmado', byAI: true,  type:'Atendimento',  local:'Sala 1', phone:'(85) 9 9988-7766', obs:'Pacote de 10 sessões — esta é a 3ª. Confirmar retorno da próxima semana.' },
  { id:'a4', day: 5, client:'Daniel Gerente',   service:'Massagem',          start:'11:30', dur:50, resp:'kz', source:'whatsapp', status:'confirmado', byAI: false, type:'Atendimento',  local:'Sala 3', phone:'(85) 9 9654-2211', obs:'Prefere pressão firme. Já é cliente recorrente.' },
  { id:'a5', day: 6, client:'Cesar Veículos',   service:'Apresentação',      start:'15:00', dur:90, resp:'mv', source:'whatsapp', status:'agendado', byAI: true,  type:'Reunião',      local:'Online · Google Meet', phone:'(85) 9 9123-4567', obs:'Enviar link da reunião 30 min antes. Apresentar plano Business.' },
  { id:'a6', day: 7, client:'Airton Silva',     service:'Pacote Noiva (1ª)', start:'10:00', dur:90, resp:'kz', source:'instagram', status:'agendado', byAI: true,  type:'Atendimento',  local:'Sala VIP', phone:'(85) 9 9777-8899', obs:'Casamento em julho. Primeira avaliação do pacote noiva completo.' },
  { id:'a7', day: 8, client:'Silvio Sobreira',  service:'Microagulhamento',  start:'13:00', dur:60, resp:'mv', source:'facebook', status:'realizado', byAI: false, type:'Atendimento',  local:'Sala 2', phone:'(85) 9 9345-1122', obs:'Sessão concluída. Orientar cuidados pós-procedimento por mensagem.' },
  { id:'a8', day: 11, client:'Júlia Mendes',    service:'Spa Day',           start:'09:30', dur:90, resp:'fj', source:'whatsapp', status:'confirmado', byAI: false, type:'Atendimento',  local:'Espaço Spa', phone:'(85) 9 9456-7788', obs:'Sessão de 1h30. Reservar sala exclusiva. Cliente VIP — oferecer welcome drink.' },
  { id:'a9', day: 12, client:'Roberto Lima',    service:'Reunião',           start:'16:00', dur:60, resp:'kz', source:'whatsapp', status:'agendado', byAI: true,  type:'Treinamento',  local:'Online · Google Meet', phone:'(85) 9 9567-3344', obs:'Treinamento de onboarding da plataforma. Compartilhar tela durante a sessão.' },
  { id:'a10', day: 14, client:'Fátima Coelho',  service:'Limpeza de pele',   start:'10:30', dur:60, resp:'mv', source:'whatsapp', status:'agendado', byAI: false, type:'Atendimento',  local:'Sala 2', phone:'(85) 9 9678-2255', obs:'Indicação da Patrícia Furtado. Aplicar desconto de primeira visita.' },
  { id:'a11', day: 18, client:'Magno Vieira',   service:'Retorno',           start:'14:00', dur:30, resp:'kz', source:'whatsapp', status:'agendado', byAI: false, type:'Atendimento',  local:'Sala 1', phone:'(85) 9 9712-3344', obs:'Retorno de acompanhamento. Verificar evolução do tratamento.' },
  { id:'a12', day: 22, client:'Patrícia Furtado',service:'Drenagem',         start:'11:00', dur:50, resp:'fj', source:'whatsapp', status:'agendado', byAI: true,  type:'Atendimento',  local:'Sala 1', phone:'(85) 9 9988-7766', obs:'4ª sessão do pacote. Cliente costuma chegar 10 min adiantada.' },
  { id:'a13', day: 11, client:'Bruno Tavares',   service:'Avaliação facial',  start:'15:00', dur:45, resp:'mv', source:'instagram', status:'agendado', byAI: true,  type:'Atendimento',  local:'Sala 2', phone:'(85) 9 9221-5566', obs:'Primeira avaliação. Interessado no protocolo de rejuvenescimento.' },
  { id:'a14', day: 11, client:'Equipe Iguabela', service:'Reunião de equipe', start:'17:30', dur:60, resp:'kz', source:'whatsapp', status:'confirmado', byAI: false, type:'Reunião',      local:'Sala de Reuniões', phone:'—', obs:'Alinhamento semanal. Revisar metas de maio e agenda da semana.' },
  { id:'a15', day: 13, client:'Renata Bittencourt',service:'Massagem relaxante',start:'10:00', dur:60, resp:'fj', source:'whatsapp', status:'confirmado', byAI: true,  type:'Atendimento',  local:'Sala 3', phone:'(85) 9 9334-7788', obs:'Gestante (5 meses). Usar protocolo específico e travesseiro de apoio.' },
  { id:'a16', day: 13, client:'Otávio Prado',    service:'Consultoria comercial',start:'14:00', dur:90, resp:'mv', source:'facebook', status:'agendado', byAI: false, type:'Comercial',   local:'Online · Google Meet', phone:'(85) 9 9445-1199', obs:'Apresentar planos para franquia. Levar tabela de comissões.' },
  { id:'a17', day: 15, client:'Camila Nogueira', service:'Pacote Noiva (2ª)', start:'09:00', dur:120, resp:'kz', source:'instagram', status:'confirmado', byAI: true,  type:'Atendimento',  local:'Sala VIP', phone:'(85) 9 9556-2233', obs:'Segunda sessão do pacote. Teste de maquiagem e penteado.' },
  { id:'a18', day: 20, client:'Gravação Conteúdo',service:'Reels institucional',start:'16:00', dur:60, resp:'mv', source:'instagram', status:'agendado', byAI: false, type:'Gravação',    local:'Estúdio', phone:'—', obs:'Gravar 3 reels para campanha de junho. Preparar roteiro e iluminação.' },
];

// Tasks
const TASKS = [
  { id:'t1', title:'Ligar para Sara', due:'Hoje 16:00', resp:'kz', important:true,  urgent:true,  cat:'Ligação',   done:false },
  { id:'t2', title:'Follow-up Wilemson', due:'Amanhã 10:00', resp:'mv', important:true,  urgent:false, cat:'Follow-up', done:false },
  { id:'t3', title:'Enviar contrato Construma', due:'Hoje', resp:'ph', important:true,  urgent:true,  cat:'Interno',  done:false },
  { id:'t4', title:'Planejar campanha de Junho', due:'Próx. semana', resp:'kz', important:true,  urgent:false, cat:'Marketing', done:false },
  { id:'t5', title:'Responder dúvidas no Instagram', due:'Hoje', resp:'mv', important:false, urgent:true,  cat:'Social',    done:false },
  { id:'t6', title:'Confirmar agendamentos do dia', due:'Hoje 09:00', resp:'ph', important:false, urgent:true,  cat:'Interno', done:false },
  { id:'t7', title:'Reorganizar pastas antigas', due:'Sem prazo', resp:'kz', important:false, urgent:false, cat:'Interno', done:false },
  { id:'t8', title:'Avaliar nova ferramenta de design', due:'Sem prazo', resp:'mv', important:false, urgent:false, cat:'Pesquisa', done:false },
];

// Tenants (Super Admin)
const TENANTS = [
  { id:'t01', name:'Iguabela Beleza', plan:'Pro',     start:'01/03/2025', renew:'01/03/2027', status:'ativo',     conv: 1284, mrr: 397 },
  { id:'t02', name:'Construma',       plan:'Business',start:'10/05/2025', renew:'10/05/2026', status:'ativo',     conv: 3210, mrr: 897 },
  { id:'t03', name:'Casa das Lentes', plan:'Pro',     start:'15/06/2025', renew:'15/06/2026', status:'ativo',     conv: 654,  mrr: 397 },
  { id:'t04', name:'Óticas Morais',   plan:'Starter', start:'01/08/2025', renew:'01/08/2026', status:'trial',     conv: 124,  mrr: 0 },
  { id:'t05', name:'Biofarma IBLATU', plan:'Starter', start:'12/09/2025', renew:'12/02/2026', status:'atrasado',  conv: 412,  mrr: 197 },
  { id:'t06', name:'Escola Modelo',   plan:'Pro',     start:'05/10/2025', renew:'05/10/2026', status:'ativo',     conv: 980,  mrr: 397 },
  { id:'t07', name:'Duft Solar',      plan:'Business',start:'12/05/2026', renew:'12/05/2027', status:'ativo',     conv: 245,  mrr: 897 },
  { id:'t08', name:'Joalheria Mimi',  plan:'Starter', start:'01/11/2025', renew:'01/11/2026', status:'suspenso',  conv: 0,    mrr: 0 },
];

const PLANS = [
  { id:'starter',  name:'Starter',  price:197, conv:500,   users:2, channels:'WhatsApp', features:'IA básica, CRM 1 board, Agenda', active: 4 },
  { id:'pro',      name:'Pro',      price:397, conv:2000,  users:5, channels:'WhatsApp + Instagram + Facebook', features:'IA avançada, CRM ilimitado, Agenda, Catálogo', active: 12 },
  { id:'business', name:'Business', price:897, conv:8000,  users:15,channels:'Todos + API própria', features:'Tudo do Pro + integrações + relatórios avançados + suporte prioritário', active: 6 },
];

// System logs
const LOGS = [
  { time:'14:32:18', tenant:'Iguabela Beleza',  type:'erro',  severity:'alta',    msg:'Webhook Instagram falhou — timeout (status 504)' },
  { time:'14:28:01', tenant:'Construma',        type:'auth',  severity:'baixa',   msg:'Login admin@construma.com — 187.41.x.x' },
  { time:'14:14:53', tenant:'Óticas Morais',    type:'admin', severity:'media',   msg:'Plano alterado: Starter → Pro' },
  { time:'13:52:09', tenant:'Iguabela Beleza',  type:'auth',  severity:'baixa',   msg:'Falha de login — credenciais inválidas (3ª tentativa)' },
  { time:'13:31:44', tenant:'Casa das Lentes',  type:'erro',  severity:'media',   msg:'Token Claude API próximo do limite mensal (87%)' },
  { time:'12:58:21', tenant:'Biofarma IBLATU',  type:'admin', severity:'alta',    msg:'Tenant suspenso por inadimplência (5 dias)' },
];

// Notifications
const NOTIFICATIONS = [
  { id:'n1', kind:'queue',    text:'Francisco Junior está na fila há 7 min', time:'agora', read:false },
  { id:'n2', kind:'urgent',   text:'Patrícia Furtado marcada como urgente pela IA', time:'2 min', read:false },
  { id:'n3', kind:'transfer', text:'Magno Vieira transferiu a conversa de Carlos Endwer para você', time:'12 min', read:false },
  { id:'n4', kind:'schedule', text:'Novo agendamento criado pela IA: Magno Vieira amanhã às 10h', time:'18 min', read:true },
  { id:'n5', kind:'queue',    text:'2 conversas novas na fila de transferência', time:'1 h', read:true },
];

// Contacts (full address book — clients, prospects, leads)
const CONTACTS = [
  { id:'k1',  name:'Paulo Franco',       phone:'+55 (88) 99898-2323', tag:'CLIENTE',  channel:'whatsapp' },
  { id:'k2',  name:'Paloma Andrade',     phone:'+55 (88) 99898-2324', tag:'CLIENTE',  channel:'whatsapp' },
  { id:'k3',  name:'Maria Vitória',      phone:'+55 (88) 99898-2325', tag:'PROSPECT', channel:'whatsapp' },
  { id:'k4',  name:'Gastorina Musaka',   phone:'+55 (88) 99898-2326', tag:'CLIENTE',  channel:'whatsapp' },
  { id:'k5',  name:'Magno Vieira',       phone:'+55 (85) 99999-9999', tag:'PROSPECT', channel:'whatsapp' },
  { id:'k6',  name:'Karla Zambelly',     phone:'+55 (85) 99848-1212', tag:'CLIENTE',  channel:'whatsapp' },
  { id:'k7',  name:'Francisco Junior',   phone:'+55 (11) 98765-1432', tag:'PROSPECT', channel:'instagram' },
  { id:'k8',  name:'Carlos Endwer',      phone:'+55 (21) 99100-5566', tag:'PROSPECT', channel:'whatsapp' },
  { id:'k9',  name:'Airton Silva',       phone:'+55 (47) 98233-7711', tag:'CLIENTE',  channel:'facebook' },
  { id:'k10', name:'Patrícia Furtado',   phone:'+55 (62) 99777-3344', tag:'PROSPECT', channel:'whatsapp' },
  { id:'k11', name:'Silvio Sobreira',    phone:'+55 (81) 98455-9988', tag:'CLIENTE',  channel:'instagram' },
  { id:'k12', name:'Daniel Gerente',     phone:'+55 (31) 99566-1010', tag:'PROSPECT', channel:'whatsapp' },
  { id:'k13', name:'Júlia Mendes',       phone:'+55 (51) 98322-4477', tag:'CLIENTE',  channel:'instagram' },
  { id:'k14', name:'Roberto Lima',       phone:'+55 (85) 99711-8822', tag:'PROSPECT', channel:'whatsapp' },
  { id:'k15', name:'Fátima Coelho',      phone:'+55 (85) 98144-6633', tag:'PROSPECT', channel:'facebook' },
  { id:'k16', name:'Letícia Maranhão',   phone:'+55 (85) 99988-3344', tag:'CLIENTE',  channel:'whatsapp' },
  { id:'k17', name:'Henrique Castro',    phone:'+55 (32) 98455-1212', tag:'PROSPECT', channel:'facebook' },
  { id:'k18', name:'Sandra Vieira',      phone:'+55 (27) 99311-5544', tag:'CLIENTE',  channel:'instagram' },
  { id:'k19', name:'Pedro Mafra',        phone:'+55 (71) 98277-9966', tag:'PROSPECT', channel:'whatsapp' },
  { id:'k20', name:'Talita Souto',       phone:'+55 (85) 99100-2233', tag:'PROSPECT', channel:'whatsapp' },
  { id:'k21', name:'Eduardo Pacheco',    phone:'+55 (61) 98744-1188', tag:'CLIENTE',  channel:'instagram' },
  { id:'k22', name:'Renata Bastos',      phone:'+55 (41) 99811-5577', tag:'CLIENTE',  channel:'whatsapp' },
  { id:'k23', name:'Otávio Ramires',     phone:'+55 (31) 98244-3322', tag:'PROSPECT', channel:'facebook' },
  { id:'k24', name:'Beatriz Almeida',    phone:'+55 (85) 99655-2244', tag:'CLIENTE',  channel:'whatsapp' },
  { id:'k25', name:'Gustavo Tavares',    phone:'+55 (11) 99877-6612', tag:'PROSPECT', channel:'whatsapp' },
  { id:'k26', name:'Camila Nogueira',    phone:'+55 (21) 99344-7755', tag:'CLIENTE',  channel:'instagram' },
  { id:'k27', name:'Lucas Bittencourt',  phone:'+55 (51) 98199-3311', tag:'PROSPECT', channel:'whatsapp' },
  { id:'k28', name:'Vanessa Pires',      phone:'+55 (85) 99422-7799', tag:'CLIENTE',  channel:'whatsapp' },
];

// AI metrics for dashboard
const AI_METRICS = {
  resolved: 847,
  resolvedPct: 73,
  transferred: 182,
  avgResponseSec: 2.4,
  tokensToday: 124800,
  tokensCost: 12.4,
  topAsked: [
    { q:'Quanto custa a limpeza de pele?', count: 124 },
    { q:'Vocês atendem aos sábados?',     count: 98 },
    { q:'Aceitam cartão?',                count: 76 },
    { q:'Qual o endereço?',               count: 54 },
    { q:'Pacote de noiva, valores',       count: 43 },
  ],
};

Object.assign(window, {
  TENANT, TEAM, CONVERSATIONS, LEADS, LEAD_STAGES,
  CRM_BOARDS, CRM_PHASES, CRM_CARDS, CONTACTS, CONTRACTS, CATALOG,
  QUICK_REPLIES, TRANSFER_RULES, APPOINTMENTS, TASKS,
  TENANTS, PLANS, LOGS, NOTIFICATIONS, AI_METRICS,
  colorFor, initials,
});
