// backoffice.jsx — Núcleo compartilhado do módulo Backoffice
// Tokens visuais (bo-*), helpers, dataset corporativo (window.BO) e componentes
// reutilizados por Central de Pendências, Jurídico, RH, Fiscal e Contábil.
// Segue rigorosamente o Design System (styles.css) e o padrão do Financeiro.

(function () {
  // ───────────────────────── Helpers ─────────────────────────
  const TODAY = '28/05/2026';
  function parseBR(s) {
    if (!s) return null;
    const [d, m, y] = s.split('/').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }
  const TODAY_DATE = parseBR(TODAY);
  function diffDays(a, b) { return Math.round((a - b) / 86400000); }
  function daysUntil(dStr) {
    const d = parseBR(dStr);
    return d ? diffDays(d, TODAY_DATE) : null;
  }
  function fmtBRL(v) {
    return 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtBRLcompact(v) {
    const n = Number(v) || 0;
    const neg = n < 0 ? '-' : '';
    const a = Math.abs(n);
    if (a >= 1_000_000) return neg + 'R$ ' + (a / 1_000_000).toFixed(1).replace('.', ',') + ' Mi';
    if (a >= 1_000) return neg + 'R$ ' + (a / 1_000).toFixed(1).replace('.', ',') + ' mil';
    return fmtBRL(n);
  }
  function fmtDateLong(dStr) {
    const d = parseBR(dStr);
    if (!d) return dStr || '—';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  }

  // Tom de cor por identidade de módulo (usado em ícones, chips, agrupamentos)
  const MODULES = {
    legal:      { id: 'bo-legal',      label: 'Jurídico',  icon: 'contracts', color: '#8b5cf6' },
    hr:         { id: 'bo-hr',         label: 'RH',        icon: 'users',     color: '#3b82f6' },
    fiscal:     { id: 'bo-fiscal',     label: 'Fiscal',    icon: 'file-text', color: '#f97316' },
    accounting: { id: 'bo-accounting', label: 'Contábil',  icon: 'coins',     color: '#10b981' }
  };

  // Paletas de KPI (mesma linguagem do Financeiro)
  const TONES = {
    violet: { bar: '#8b5cf6', bg: 'color-mix(in oklab, #8b5cf6 14%, white)', fg: '#6d28d9' },
    blue:   { bar: '#3b82f6', bg: 'color-mix(in oklab, #3b82f6 14%, white)', fg: '#1d4ed8' },
    green:  { bar: '#10b981', bg: 'color-mix(in oklab, #10b981 16%, white)', fg: '#047857' },
    amber:  { bar: '#f59e0b', bg: 'color-mix(in oklab, #f59e0b 20%, white)', fg: '#b45309' },
    orange: { bar: '#f97316', bg: 'color-mix(in oklab, #f97316 16%, white)', fg: '#c2410c' },
    red:    { bar: '#ef4444', bg: 'color-mix(in oklab, #ef4444 14%, white)', fg: '#b91c1c' },
    teal:   { bar: '#14b8a6', bg: 'color-mix(in oklab, #14b8a6 16%, white)', fg: '#0f766e' },
    slate:  { bar: '#64748b', bg: 'color-mix(in oklab, #64748b 14%, white)', fg: '#475569' },
    purple: { bar: '#a855f7', bg: 'color-mix(in oklab, #a855f7 14%, white)', fg: '#7e22ce' }
  };

  // ──────────────────── Dataset corporativo ────────────────────
  // Empresa de serviços (rede de estética/beleza Pk360) — coerente com o Financeiro.
  const EMPRESA = 'Pk360 Serviços de Estética LTDA';
  const RESPS = ['Paulo Henrique', 'Magno Vieira', 'Karla Zambelly', 'Francisco Junior', 'Carlos Endwer'];

  const TIPOS_CONTRATO = ['Prestação de Serviços', 'Consultoria', 'Marketing', 'Parceria', 'Representação Comercial', 'Fornecedor', 'Terceirização'];

  // status: rascunho | negociacao | enviado | aguardando | assinado | ativo | encerrado | cancelado
  const contratos = [
    { num: 'CT-2026-0148', cliente: 'Cesar Veículos',                 resp: 'Magno Vieira',     tipo: 'Prestação de Serviços',    inicio: '01/06/2025', fim: '01/06/2026', valor: 38400,  status: 'ativo',       assinatura: '28/05/2025', renovAuto: true },
    { num: 'CT-2026-0149', cliente: 'Roberto Lima Advocacia',         resp: 'Paulo Henrique',   tipo: 'Consultoria',              inicio: '15/06/2025', fim: '14/06/2026', valor: 54000,  status: 'ativo',       assinatura: '10/06/2025', renovAuto: false },
    { num: 'CT-2026-0150', cliente: 'Bruno Aragão Imóveis',           resp: 'Paulo Henrique',   tipo: 'Marketing',                inicio: '20/05/2025', fim: '08/06/2026', valor: 27600,  status: 'ativo',       assinatura: '18/05/2025', renovAuto: true },
    { num: 'CT-2026-0151', cliente: 'Distribuidora Bella Pele',       resp: 'Karla Zambelly',   tipo: 'Fornecedor',               inicio: '01/02/2026', fim: '31/01/2027', valor: 96000,  status: 'ativo',       assinatura: '28/01/2026', renovAuto: true },
    { num: 'CT-2026-0152', cliente: 'Alex Soares — Construma',        resp: 'Paulo Henrique',   tipo: 'Prestação de Serviços',    inicio: '14/06/2025', fim: '13/06/2026', valor: 66000,  status: 'ativo',       assinatura: '12/06/2025', renovAuto: false },
    { num: 'CT-2026-0153', cliente: 'Letícia Maranhão Studio',        resp: 'Francisco Junior', tipo: 'Parceria',                 inicio: '01/07/2025', fim: '30/06/2026', valor: 18000,  status: 'ativo',       assinatura: '26/06/2025', renovAuto: false },
    { num: 'CT-2026-0154', cliente: 'Henrique Castro Modas',          resp: 'Karla Zambelly',   tipo: 'Representação Comercial',  inicio: '10/05/2026', fim: '10/05/2027', valor: 42000,  status: 'aguardando',  assinatura: null,         renovAuto: false },
    { num: 'CT-2026-0155', cliente: 'Pedro Mafra Distribuidora',      resp: 'Magno Vieira',     tipo: 'Fornecedor',               inicio: '01/06/2026', fim: '31/05/2027', valor: 120000, status: 'aguardando',  assinatura: null,         renovAuto: true },
    { num: 'CT-2026-0156', cliente: 'Marcela Tavares Beauty',         resp: 'Karla Zambelly',   tipo: 'Consultoria',              inicio: '05/06/2026', fim: '05/12/2026', valor: 14400,  status: 'enviado',     assinatura: null,         renovAuto: false },
    { num: 'CT-2026-0157', cliente: 'Talita Souto Acessórios',        resp: 'Francisco Junior', tipo: 'Marketing',                inicio: '01/06/2026', fim: '30/11/2026', valor: 9600,   status: 'negociacao',  assinatura: null,         renovAuto: false },
    { num: 'CT-2026-0158', cliente: 'Sueline Barros — Escola Modelo', resp: 'Paulo Henrique',   tipo: 'Terceirização',            inicio: '01/07/2026', fim: '30/06/2027', valor: 72000,  status: 'rascunho',    assinatura: null,         renovAuto: false },
    { num: 'CT-2026-0159', cliente: 'Fátima Coelho — Coelho Modas',   resp: 'Magno Vieira',     tipo: 'Prestação de Serviços',    inicio: '01/05/2025', fim: '30/04/2026', valor: 21600,  status: 'encerrado',   assinatura: '28/04/2025', renovAuto: false },
    { num: 'CT-2026-0160', cliente: 'Iany Maia — Casa das Lentes',    resp: 'Karla Zambelly',   tipo: 'Parceria',                 inicio: '01/03/2025', fim: '28/02/2026', valor: 16800,  status: 'encerrado',   assinatura: '26/02/2025', renovAuto: false },
    { num: 'CT-2026-0161', cliente: 'Júlia Mendes Eventos',           resp: 'Francisco Junior', tipo: 'Prestação de Serviços',    inicio: '20/01/2026', fim: '12/06/2026', valor: 30000,  status: 'ativo',       assinatura: '16/01/2026', renovAuto: false },
    { num: 'CT-2026-0162', cliente: 'Cosmédica Fornecimentos',        resp: 'Magno Vieira',     tipo: 'Fornecedor',               inicio: '01/04/2026', fim: '24/06/2026', valor: 48000,  status: 'ativo',       assinatura: '28/03/2026', renovAuto: true },
    { num: 'CT-2026-0163', cliente: 'AgênciaPic Publicidade',         resp: 'Paulo Henrique',   tipo: 'Marketing',                inicio: '10/05/2026', fim: '10/05/2027', valor: 36000,  status: 'cancelado',   assinatura: null,         renovAuto: false }
  ];

  const modelosContrato = [
    { nome: 'Prestação de Serviços', desc: 'Contrato padrão de prestação de serviços recorrentes', usos: 42, icon: 'file-text' },
    { nome: 'Consultoria',           desc: 'Consultoria especializada com escopo e entregáveis',   usos: 18, icon: 'briefcase' },
    { nome: 'Marketing',             desc: 'Gestão de mídia, tráfego e conteúdo',                  usos: 23, icon: 'megaphone' },
    { nome: 'Parceria',              desc: 'Parceria comercial e permuta de serviços',             usos: 11, icon: 'link' },
    { nome: 'Representação Comercial',desc: 'Representação e comissionamento de vendas',            usos: 7,  icon: 'commercial' },
    { nome: 'Fornecedor',            desc: 'Fornecimento de insumos e produtos',                   usos: 31, icon: 'package' },
    { nome: 'Terceirização',         desc: 'Terceirização de mão de obra e serviços',              usos: 9,  icon: 'users' }
  ];

  // ───────── RH ─────────
  const DEPTOS = ['Atendimento', 'Comercial', 'Marketing', 'Financeiro', 'Administrativo', 'Estética'];
  const colaboradores = [
    { nome: 'Karla Zambelly',     cargo: 'Coordenadora de Atendimento', depto: 'Atendimento',    gestor: 'Paulo Henrique', admissao: '12/03/2022', salario: 4200, status: 'ativo',    aniversario: '12/06', email: 'karla.z@pk360.com.br' },
    { nome: 'Magno Vieira',       cargo: 'Gerente Comercial',           depto: 'Comercial',      gestor: 'Paulo Henrique', admissao: '03/08/2021', salario: 6800, status: 'ativo',    aniversario: '02/06', email: 'magno.v@pk360.com.br' },
    { nome: 'Francisco Junior',   cargo: 'Analista de Marketing',       depto: 'Marketing',      gestor: 'Magno Vieira',   admissao: '21/01/2023', salario: 3600, status: 'ferias',   aniversario: '30/05', email: 'francisco.j@pk360.com.br' },
    { nome: 'Carlos Endwer',      cargo: 'Analista Financeiro',         depto: 'Financeiro',     gestor: 'Paulo Henrique', admissao: '15/05/2023', salario: 3900, status: 'ativo',    aniversario: '18/09', email: 'carlos.e@pk360.com.br' },
    { nome: 'Patrícia Furtado',   cargo: 'Esteticista Sênior',          depto: 'Estética',       gestor: 'Karla Zambelly', admissao: '08/02/2021', salario: 3200, status: 'ativo',    aniversario: '05/06', email: 'patricia.f@pk360.com.br' },
    { nome: 'Júlia Mendes',       cargo: 'Recepcionista',               depto: 'Atendimento',    gestor: 'Karla Zambelly', admissao: '19/09/2024', salario: 2100, status: 'ativo',    aniversario: '22/11', email: 'julia.m@pk360.com.br' },
    { nome: 'Marcela Tavares',    cargo: 'Social Media',                depto: 'Marketing',      gestor: 'Francisco Junior',admissao: '02/04/2024', salario: 2600, status: 'ativo',    aniversario: '14/07', email: 'marcela.t@pk360.com.br' },
    { nome: 'Letícia Maranhão',   cargo: 'Esteticista',                 depto: 'Estética',       gestor: 'Karla Zambelly', admissao: '11/11/2023', salario: 2800, status: 'ativo',    aniversario: '01/06', email: 'leticia.m@pk360.com.br' },
    { nome: 'Henrique Castro',    cargo: 'Auxiliar Administrativo',     depto: 'Administrativo', gestor: 'Paulo Henrique', admissao: '27/06/2022', salario: 2300, status: 'afastado', aniversario: '09/03', email: 'henrique.c@pk360.com.br' },
    { nome: 'Talita Souto',       cargo: 'Consultora de Vendas',        depto: 'Comercial',      gestor: 'Magno Vieira',   admissao: '05/05/2025', salario: 2500, status: 'ativo',    aniversario: '28/05', email: 'talita.s@pk360.com.br' },
    { nome: 'Iany Maia',          cargo: 'Esteticista',                 depto: 'Estética',       gestor: 'Karla Zambelly', admissao: '14/08/2024', salario: 2700, status: 'ativo',    aniversario: '17/12', email: 'iany.m@pk360.com.br' },
    { nome: 'Pedro Mafra',        cargo: 'Estoquista',                  depto: 'Administrativo', gestor: 'Paulo Henrique', admissao: '03/03/2025', salario: 2050, status: 'ativo',    aniversario: '03/06', email: 'pedro.m@pk360.com.br' }
  ];

  const vagas = [
    { titulo: 'Esteticista Pleno',          area: 'Estética',    depto: 'Estética',       salario: 3200, regime: 'CLT',     resp: 'Karla Zambelly',   etapa: 'Entrevista', inscritos: 23 },
    { titulo: 'Consultor(a) de Vendas',     area: 'Comercial',   depto: 'Comercial',      salario: 2500, regime: 'CLT',     resp: 'Magno Vieira',     etapa: 'Triagem',    inscritos: 41 },
    { titulo: 'Designer de Conteúdo',       area: 'Marketing',   depto: 'Marketing',      salario: 3400, regime: 'PJ',      resp: 'Francisco Junior', etapa: 'Teste',      inscritos: 18 },
    { titulo: 'Recepcionista',              area: 'Atendimento', depto: 'Atendimento',    salario: 2100, regime: 'CLT',     resp: 'Karla Zambelly',   etapa: 'Inscrito',   inscritos: 56 },
    { titulo: 'Auxiliar Financeiro',        area: 'Financeiro',  depto: 'Financeiro',     salario: 2400, regime: 'CLT',     resp: 'Carlos Endwer',    etapa: 'Aprovação',  inscritos: 12 }
  ];

  const ferias = [
    { colaborador: 'Francisco Junior', inicio: '26/05/2026', fim: '14/06/2026', dias: 20, status: 'aprovada' },
    { colaborador: 'Patrícia Furtado', inicio: '02/06/2026', fim: '21/06/2026', dias: 20, status: 'pendente' },
    { colaborador: 'Carlos Endwer',    inicio: '10/06/2026', fim: '24/06/2026', dias: 15, status: 'pendente' },
    { colaborador: 'Talita Souto',     inicio: '01/07/2026', fim: '15/07/2026', dias: 15, status: 'pendente' },
    { colaborador: 'Letícia Maranhão', inicio: '15/07/2026', fim: '03/08/2026', dias: 20, status: 'aprovada' }
  ];

  const admissoes = [
    { nome: 'Roberta Nunes',  cargo: 'Esteticista Pleno', depto: 'Estética',  inicio: '02/06/2026', status: 'pendente' },
    { nome: 'Diego Albuquerque', cargo: 'Consultor de Vendas', depto: 'Comercial', inicio: '09/06/2026', status: 'pendente' }
  ];
  const desligamentos = [
    { nome: 'Henrique Castro', cargo: 'Auxiliar Administrativo', depto: 'Administrativo', data: '31/05/2026', status: 'pendente' }
  ];
  const candidatos = [
    { nome: 'Roberta Nunes',     area: 'Estética',   cargo: 'Esteticista Pleno',  pretensao: 3000, origem: 'Indicação' },
    { nome: 'Diego Albuquerque', area: 'Comercial',  cargo: 'Consultor de Vendas',pretensao: 2600, origem: 'LinkedIn' },
    { nome: 'Bianca Rocha',      area: 'Marketing',  cargo: 'Social Media',       pretensao: 2800, origem: 'Instagram' },
    { nome: 'Felipe Andrade',    area: 'Financeiro', cargo: 'Auxiliar Financeiro',pretensao: 2400, origem: 'Site' },
    { nome: 'Camila Dias',       area: 'Estética',   cargo: 'Esteticista',        pretensao: 2700, origem: 'Indicação' }
  ];

  // ───────── Fiscal ─────────
  // status: pago | aberto | atraso
  const impostos = [
    { nome: 'DAS — Simples Nacional', competencia: '04/2026', venc: '20/05/2026', valor: 4860.00, status: 'pago' },
    { nome: 'ISS',                    competencia: '04/2026', venc: '10/05/2026', valor: 1320.00, status: 'pago' },
    { nome: 'FGTS',                   competencia: '04/2026', venc: '07/05/2026', valor: 1985.40, status: 'pago' },
    { nome: 'INSS',                   competencia: '04/2026', venc: '20/05/2026', valor: 3120.00, status: 'pago' },
    { nome: 'DAS — Simples Nacional', competencia: '05/2026', venc: '20/06/2026', valor: 5120.00, status: 'aberto' },
    { nome: 'ISS',                    competencia: '05/2026', venc: '10/06/2026', valor: 1410.00, status: 'aberto' },
    { nome: 'FGTS',                   competencia: '05/2026', venc: '07/06/2026', valor: 2040.00, status: 'aberto' },
    { nome: 'INSS',                   competencia: '05/2026', venc: '30/05/2026', valor: 3210.00, status: 'aberto' },
    { nome: 'IRPJ',                   competencia: '1T/2026', venc: '29/05/2026', valor: 2680.00, status: 'aberto' },
    { nome: 'CSLL',                   competencia: '1T/2026', venc: '29/05/2026', valor: 1610.00, status: 'aberto' },
    { nome: 'ISS',                    competencia: '03/2026', venc: '10/04/2026', valor: 1280.00, status: 'atraso' },
    { nome: 'COFINS',                 competencia: '03/2026', venc: '25/04/2026', valor: 980.00,  status: 'atraso' }
  ];

  // Obrigações acessórias — status: entregue | pendente | atraso
  const obrigacoes = [
    { nome: 'SPED Fiscal',  competencia: '04/2026', entrega: '20/05/2026', status: 'entregue' },
    { nome: 'DCTFWeb',      competencia: '04/2026', entrega: '15/05/2026', status: 'entregue' },
    { nome: 'EFD Contribuições', competencia: '04/2026', entrega: '12/05/2026', status: 'entregue' },
    { nome: 'DCTFWeb',      competencia: '05/2026', entrega: '15/06/2026', status: 'pendente' },
    { nome: 'SPED Fiscal',  competencia: '05/2026', entrega: '20/06/2026', status: 'pendente' },
    { nome: 'DEFIS',        competencia: '2025',    entrega: '31/05/2026', status: 'pendente' },
    { nome: 'DIRF',         competencia: '2025',    entrega: '27/02/2026', status: 'atraso' }
  ];

  // ───────── Gestão documental / certidões ─────────
  // status: valido | vencendo | vencido
  const documentos = [
    { nome: 'Certidão Negativa Federal (CND)', tipo: 'Certidão', venc: '12/06/2026', status: 'vencendo' },
    { nome: 'Certidão FGTS (CRF)',             tipo: 'Certidão', venc: '04/06/2026', status: 'vencendo' },
    { nome: 'Alvará de Funcionamento',         tipo: 'Licença',  venc: '30/04/2026', status: 'vencido' },
    { nome: 'Certidão Municipal (ISS)',        tipo: 'Certidão', venc: '18/07/2026', status: 'valido' },
    { nome: 'Licença Sanitária',               tipo: 'Licença',  venc: '08/06/2026', status: 'vencendo' },
    { nome: 'Certificado Digital e-CNPJ A1',   tipo: 'Certificado', venc: '22/06/2026', status: 'vencendo' }
  ];

  // ───────── Contábil ─────────
  const contabilKpis = {
    receitaTotal: 318450, despesaTotal: 214300, lucroLiquido: 104150,
    resultadoOperacional: 121800, margem: 32.7, fluxoCaixa: 86240
  };
  // DRE — tipo: receita | deducao | base | custo | despesa | resultado
  const dre = [
    { label: 'Receita Bruta de Vendas',  valor: 372600,  tipo: 'receita' },
    { label: '(–) Impostos sobre Vendas',valor: -54150,  tipo: 'deducao' },
    { label: 'Receita Líquida',          valor: 318450,  tipo: 'base',     bold: true },
    { label: '(–) Custos dos Serviços',  valor: -98300,  tipo: 'custo' },
    { label: 'Lucro Bruto',              valor: 220150,  tipo: 'base',     bold: true },
    { label: '(–) Despesas Operacionais',valor: -98350,  tipo: 'despesa' },
    { label: 'Resultado Operacional',    valor: 121800,  tipo: 'base',     bold: true },
    { label: '(–) Despesas Financeiras', valor: -9200,   tipo: 'despesa' },
    { label: '(–) IRPJ / CSLL',          valor: -8450,   tipo: 'deducao' },
    { label: 'Lucro Líquido do Exercício',valor: 104150, tipo: 'resultado',bold: true }
  ];
  const planoContas = [
    { grupo: 'Receitas', tone: 'green', total: 372600, contas: [
      { nome: 'Vendas de Serviços', valor: 246800 }, { nome: 'Vendas de Produtos', valor: 78400 },
      { nome: 'Pacotes / Assinaturas', valor: 39200 }, { nome: 'Outras Receitas', valor: 8200 } ] },
    { grupo: 'Despesas', tone: 'red', total: 196700, contas: [
      { nome: 'Operacional', valor: 86300 }, { nome: 'Administrativa', valor: 42800 },
      { nome: 'Comercial', valor: 38600 }, { nome: 'Marketing', valor: 29000 } ] },
    { grupo: 'Custos', tone: 'amber', total: 98300, contas: [
      { nome: 'Custos Diretos', valor: 71200 }, { nome: 'Custos Indiretos', valor: 27100 } ] },
    { grupo: 'Investimentos', tone: 'blue', total: 54600, contas: [
      { nome: 'Expansão', valor: 28000 }, { nome: 'Tecnologia', valor: 16400 }, { nome: 'Infraestrutura', valor: 10200 } ] }
  ];
  const fluxo = [
    { mes: 'Jan', entrada: 58200, saida: 41300 }, { mes: 'Fev', entrada: 54100, saida: 39800 },
    { mes: 'Mar', entrada: 61400, saida: 44200 }, { mes: 'Abr', entrada: 67800, saida: 46100 },
    { mes: 'Mai', entrada: 72300, saida: 48600 }, { mes: 'Jun', entrada: 64900, saida: 43200 }
  ];

  // ───────── Clientes (carteira) — usado no cadastro de contratos ─────────
  const clientes = [
    { nome: 'Cesar Veículos',                 tipo: 'PJ', doc: '12.345.678/0001-90', email: 'contato@cesarveiculos.com.br', tel: '(85) 3232-1010' },
    { nome: 'Roberto Lima Advocacia',         tipo: 'PJ', doc: '23.456.789/0001-12', email: 'roberto@limaadv.com.br',       tel: '(85) 3232-2020' },
    { nome: 'Bruno Aragão Imóveis',           tipo: 'PJ', doc: '34.567.890/0001-34', email: 'bruno@aragaoimoveis.com.br',   tel: '(85) 3232-3030' },
    { nome: 'Distribuidora Bella Pele',       tipo: 'PJ', doc: '45.678.901/0001-56', email: 'compras@bellapele.com.br',     tel: '(85) 3232-4040' },
    { nome: 'Alex Soares — Construma',        tipo: 'PJ', doc: '56.789.012/0001-78', email: 'alex@construma.com.br',        tel: '(85) 3232-5050' },
    { nome: 'Letícia Maranhão Studio',        tipo: 'PJ', doc: '67.890.123/0001-90', email: 'leticia@studiolm.com.br',      tel: '(85) 99888-1122' },
    { nome: 'Henrique Castro Modas',          tipo: 'PJ', doc: '78.901.234/0001-11', email: 'henrique@castromodas.com.br',  tel: '(85) 99888-3344' },
    { nome: 'Pedro Mafra Distribuidora',      tipo: 'PJ', doc: '89.012.345/0001-22', email: 'pedro@mafradist.com.br',       tel: '(85) 3232-6060' },
    { nome: 'Marcela Tavares Beauty',         tipo: 'PJ', doc: '90.123.456/0001-33', email: 'contato@marcelabeauty.com.br', tel: '(85) 99777-5566' },
    { nome: 'Talita Souto Acessórios',        tipo: 'PJ', doc: '01.234.567/0001-44', email: 'talita@soutoacessorios.com',   tel: '(85) 99777-7788' },
    { nome: 'Sueline Barros — Escola Modelo', tipo: 'PJ', doc: '11.222.333/0001-55', email: 'sueline@escolamodelo.com.br',  tel: '(85) 3232-7070' },
    { nome: 'Fátima Coelho — Coelho Modas',   tipo: 'PJ', doc: '22.333.444/0001-66', email: 'fatima@coelhomodas.com.br',    tel: '(85) 99666-9900' },
    { nome: 'Iany Maia — Casa das Lentes',    tipo: 'PJ', doc: '33.444.555/0001-77', email: 'iany@casadaslentes.com.br',    tel: '(85) 99666-1212' },
    { nome: 'Júlia Mendes Eventos',           tipo: 'PJ', doc: '44.555.666/0001-88', email: 'julia@mendeseventos.com.br',   tel: '(85) 99555-3434' },
    { nome: 'Cosmédica Fornecimentos',        tipo: 'PJ', doc: '55.666.777/0001-99', email: 'vendas@cosmedica.com.br',      tel: '(85) 3232-8080' },
    { nome: 'AgênciaPic Publicidade',         tipo: 'PJ', doc: '66.777.888/0001-10', email: 'contato@agenciapic.com.br',    tel: '(85) 99444-5656' },
    { nome: 'Patrícia Furtado',               tipo: 'PF', doc: '123.456.789-00',     email: 'patricia.furtado@gmail.com',   tel: '(85) 99333-7878' }
  ];

  window.BO = {
    TODAY, TODAY_DATE, EMPRESA, RESPS, DEPTOS,
    parseBR, diffDays, daysUntil, fmtBRL, fmtBRLcompact, fmtDateLong,
    MODULES, TONES, TIPOS_CONTRATO,
    data: {
      contratos, modelosContrato, colaboradores, vagas, ferias, admissoes,
      desligamentos, candidatos, impostos, obrigacoes, documentos,
      contabilKpis, dre, planoContas, fluxo, clientes
    }
  };

  // ──────────────────── Componentes compartilhados ────────────────────
  function BoKpi({ tone = 'slate', icon, label, value, foot, onClick }) {
    const t = TONES[tone] || TONES.slate;
    return (
      <div className={'bo-kpi' + (onClick ? ' is-click' : '')} style={{ borderTopColor: t.bar }} onClick={onClick}>
        <div className="bo-kpi-head">
          <span className="bo-kpi-icon" style={{ background: t.bg, color: t.fg }}><Ic name={icon} size={17} /></span>
          <span className="bo-kpi-label">{label}</span>
        </div>
        <div className="bo-kpi-value tnum" style={{ color: t.fg }}>{value}</div>
        {foot && <div className="bo-kpi-foot">{foot}</div>}
      </div>);
  }

  // Chip de status genérico
  function BoChip({ color, label, solid }) {
    const style = solid
      ? { background: color, color: '#fff' }
      : { background: `color-mix(in oklab, ${color} 15%, white)`, color: `color-mix(in oklab, ${color} 78%, black)` };
    return (
      <span className="bo-chip" style={style}>
        {!solid && <span className="bo-chip-dot" style={{ background: color }} />}
        {label}
      </span>);
  }

  // Pílula segmentada (filtros)
  function BoPill({ on, onClick, children, dot }) {
    return (
      <button className={'bo-pill' + (on ? ' on' : '')} onClick={onClick} type="button">
        {dot && <span className="bo-pill-dot" style={{ background: dot }} />}
        {children}
      </button>);
  }

  // Barra de busca padrão
  function BoSearch({ value, onChange, placeholder }) {
    return (
      <div className="bo-search">
        <Ic name="search" size={13} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }} />
        <input className="input" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} style={{ paddingLeft: 36 }} />
        {value && (
          <button onClick={() => onChange('')} className="btn btn-ghost btn-icon" style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 26, height: 26 }} title="Limpar">
            <Ic name="x" size={12} />
          </button>)}
      </div>);
  }

  function BoPanel({ title, icon, iconColor, action, children, pad = true, style }) {
    return (
      <div className="bo-panel" style={style}>
        {title && (
          <div className="bo-panel-hd">
            {icon && <span className="bo-panel-ic" style={iconColor ? { background: `color-mix(in oklab, ${iconColor} 14%, white)`, color: iconColor } : undefined}><Ic name={icon} size={15} /></span>}
            <span className="bo-panel-title">{title}</span>
            <div style={{ flex: 1 }} />
            {action}
          </div>)}
        <div style={pad ? undefined : { margin: '0 -18px -18px' }}>{children}</div>
      </div>);
  }

  function BoSectionTitle({ children, right }) {
    return (
      <div className="bo-sec-title">
        <span>{children}</span>
        <div style={{ flex: 1 }} />
        {right}
      </div>);
  }

  // Botão "Novo" expansível (mesmo padrão do Financeiro)
  function BoNewBtn({ label, onClick }) {
    return (
      <button className="fin-new-btn" onClick={onClick} aria-label={label}>
        <span className="fin-new-label">{label + '\u00A0'}</span>
        <span className="fin-new-plus" style={{ width: 38, height: 38 }}><Ic name="plus" size={18} /></span>
      </button>);
  }

  function BoStyles() {
    return (
      <style>{`
        .bo-kpi-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(196px, 1fr)); }
        .bo-kpi { background: var(--surface); border: 1px solid var(--border); border-top: 3px solid var(--border); border-radius: var(--radius-lg); padding: 14px 16px; display: flex; flex-direction: column; gap: 9px; min-width: 0; transition: box-shadow .15s, transform .15s; }
        .bo-kpi.is-click { cursor: pointer; }
        .bo-kpi.is-click:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
        .bo-kpi-head { display: flex; align-items: center; gap: 10px; }
        .bo-kpi-icon { width: 32px; height: 32px; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .bo-kpi-label { font-size: var(--type-xs); letter-spacing: .04em; text-transform: uppercase; color: var(--text-muted); font-weight: 600; line-height: 1.25; }
        .bo-kpi-value { font-size: var(--type-2xl); font-weight: 600; letter-spacing: -.02em; line-height: 1.05; }
        .bo-kpi-foot { font-size: var(--type-xs); color: var(--text-faint); }

        .bo-chip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 999px; font-size: var(--type-xs); font-weight: 700; letter-spacing: .02em; white-space: nowrap; }
        .bo-chip-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

        .bo-pill { height: 30px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--border-strong); background: var(--surface); color: var(--text-muted); font-size: var(--type-sm); font-weight: 600; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; transition: all .12s; white-space: nowrap; }
        .bo-pill:hover { border-color: var(--text-muted); color: var(--text); }
        .bo-pill.on { background: var(--accent-soft); border-color: var(--accent); color: var(--accent-700); }
        .bo-pill-dot { width: 7px; height: 7px; border-radius: 50%; }

        .bo-search { position: relative; display: flex; align-items: center; flex: 1; min-width: 220px; max-width: 420px; }

        .bo-toolbar { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 12px; display: flex; flex-direction: column; gap: 10px; }
        .bo-toolbar-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

        .bo-panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 18px; min-width: 0; }
        .bo-panel-hd { display: flex; align-items: center; gap: 9px; margin-bottom: 14px; }
        .bo-panel-ic { width: 28px; height: 28px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; background: var(--accent-soft); color: var(--accent-700); flex-shrink: 0; }
        .bo-panel-title { font-weight: 600; font-size: var(--type-md); letter-spacing: -.01em; }

        .bo-dash-grid { display: grid; gap: 14px; grid-template-columns: 1.5fr 1fr; align-items: start; }
        @media (max-width: 1100px) { .bo-dash-grid { grid-template-columns: 1fr; } }

        .bo-sec-title { display: flex; align-items: center; gap: 8px; font-size: var(--type-xs); font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--text-faint); margin: 2px 0; }

        /* Lista genérica (cabeçalho fixo + linhas em cartão, 4px de espaçamento) */
        .bo-list-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; display: flex; flex-direction: column; flex: 1; min-height: 0; }
        .bo-row { display: grid; align-items: center; gap: 14px; padding: 12px 18px; }
        .bo-row-head { background: var(--surface-2); border-bottom: 1px solid var(--border); font-size: var(--type-xs); letter-spacing: .06em; text-transform: uppercase; color: var(--text-faint); font-weight: 600; padding: 12px 26px; }
        .bo-list-body { flex: 1; min-height: 0; overflow-y: auto; background: var(--surface-2); display: flex; flex-direction: column; gap: 4px; padding: 4px 0; }
        .bo-list-body .bo-row { background: var(--surface); border: 1px solid var(--border); border-left-width: 3px; border-radius: 10px; margin: 0 8px; }
        .bo-row-body { cursor: pointer; transition: background .12s, box-shadow .12s, border-color .12s; }
        .bo-row-body:hover { box-shadow: 0 2px 10px rgba(15,23,42,.06); border-color: var(--border-strong); }
        .bo-cell { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .bo-cell-strong { font-weight: 600; letter-spacing: -.01em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .bo-cell-sub { font-size: var(--type-xs); color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .bo-cell-num { font-variant-numeric: tabular-nums; font-weight: 700; }
        .bo-cell-act { flex-direction: row; align-items: center; justify-content: flex-end; gap: 4px; }

        .bo-empty { padding: 56px 20px; text-align: center; color: var(--text-faint); }
        .bo-empty-title { margin-top: 12px; font-weight: 600; color: var(--text-muted); }

        /* Mini list (dentro de painéis) */
        .bo-mini { display: flex; align-items: center; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--border); }
        .bo-mini:last-child { border-bottom: 0; }
        .bo-mini-ic { width: 34px; height: 34px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .bo-mini-main { flex: 1; min-width: 0; }
        .bo-mini-title { font-weight: 600; font-size: var(--type-sm); letter-spacing: -.01em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .bo-mini-sub { font-size: var(--type-xs); color: var(--text-muted); margin-top: 1px; }

        /* Barra horizontal de progresso de pipeline */
        .bo-track { height: 8px; border-radius: 999px; background: var(--surface-3); overflow: hidden; }
        .bo-track > div { height: 100%; border-radius: 999px; }

        /* Donut/legend rows */
        .bo-legend { display: flex; align-items: center; gap: 9px; padding: 7px 0; }
        .bo-legend-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }

        /* Bar chart (fluxo de caixa) */
        .bo-bars { display: flex; align-items: flex-end; gap: 14px; height: 168px; padding-top: 8px; }
        .bo-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end; }
        .bo-bar-pair { display: flex; align-items: flex-end; gap: 4px; width: 100%; justify-content: center; height: 100%; }
        .bo-bar { width: 16px; border-radius: 4px 4px 0 0; transition: height .4s ease; }
        .bo-bar-lbl { font-size: var(--type-xs); color: var(--text-muted); font-weight: 600; }

        @media (max-width: 980px) { .bo-row { gap: 10px; padding: 12px 14px; } }
      `}</style>);
  }

  Object.assign(window, { BoKpi, BoChip, BoPill, BoSearch, BoPanel, BoSectionTitle, BoNewBtn, BoStyles });
})();
