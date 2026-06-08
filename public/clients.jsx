// clients.jsx — Clients (compradores) list page, modeled after Leads

(function () {
  const TAGS_POOL = [
  { name: 'VIP', color: '#a855f7' },
  { name: 'Recorrente', color: '#10b981' },
  { name: 'Atacado', color: '#0ea5e9' },
  { name: 'Inadimplente', color: '#ef4444' },
  { name: 'Cashback', color: '#f59e0b' },
  { name: 'Newsletter', color: '#6366f1' }];


  const SEGMENTS = {
    bronze: { label: 'Bronze', color: '#b45309' },
    prata: { label: 'Prata', color: '#64748b' },
    ouro: { label: 'Ouro', color: '#d97706' },
    platina: { label: 'Platina', color: '#0ea5e9' },
    diamante: { label: 'Diamante', color: '#7c3aed' }
  };

  const ATTENDANTS = ['Karla Zambelly', 'Magno Vieira', 'Paulo Henrique', 'Francisco Junior', 'Agente IA', '—'];
  const AVATAR_BG = ['#fde68a', '#fbcfe8', '#bfdbfe', '#bbf7d0', '#e9d5ff', '#fed7aa', '#fecaca', '#a7f3d0'];

  // 24 mocked clients (buyers)
  const MOCK_CLIENTS = [
  { name: 'Abdiel Ferreira de Lima', company: 'Construrápida', phone: '(85) 9 9870-5043', city: 'Quixeramobim-CE', email: 'abdiel@email.com', orders: 12, sales: 18, ticket: 286.40, ltv: 3436.80, lastOrder: '12/05/2026', cycle: 28, segment: 'ouro', active: true, since: '12/03/2024', source: 'Indicação' },
  { name: 'Patrícia Furtado', company: 'Cristal Forma', phone: '(85) 9 9863-2754', city: 'Fortaleza-CE', email: 'patricia@email.com', orders: 4, sales: 4, ticket: 1375.00, ltv: 5500.00, lastOrder: '08/05/2026', cycle: 62, segment: 'prata', active: true, since: '04/11/2024', source: 'Site' },
  { name: 'Carlos Endwer', company: 'Endwer Construções', phone: '(85) 9 9821-4476', city: 'Sobral-CE', email: 'carlos@endwer.com', orders: 18, sales: 22, ticket: 711.10, ltv: 12800, lastOrder: '14/05/2026', cycle: 18, segment: 'platina', active: true, since: '22/01/2023', source: 'WhatsApp' },
  { name: 'Sara Pereira', company: 'Frei Damião', phone: '(88) 9 2143-8549', city: 'Juazeiro do Norte-CE', email: 'sara@email.com', orders: 0, sales: 0, ticket: 0, ltv: 0, lastOrder: '—', cycle: 0, segment: 'bronze', active: false, since: '02/02/2026', source: 'Instagram' },
  { name: 'Júlia Mendes', company: 'Estética Júlia', phone: '(85) 9 9912-3344', city: 'Fortaleza-CE', email: 'julia@email.com', orders: 9, sales: 11, ticket: 822.20, ltv: 7400, lastOrder: '02/05/2026', cycle: 21, segment: 'ouro', active: true, since: '10/04/2024', source: 'Google' },
  { name: 'Roberto Lima', company: 'Lima Advocacia', phone: '(85) 9 9745-2210', city: 'Fortaleza-CE', email: 'roberto@lima.com', orders: 25, sales: 31, ticket: 624.00, ltv: 15600, lastOrder: '15/05/2026', cycle: 14, segment: 'diamante', active: true, since: '05/06/2022', source: 'Site' },
  { name: 'Fátima Coelho', company: 'Coelho Modas', phone: '(85) 9 9614-7723', city: 'Caucaia-CE', email: 'fatima@modas.com', orders: 7, sales: 9, ticket: 600.00, ltv: 4200, lastOrder: '21/04/2026', cycle: 38, segment: 'prata', active: false, since: '15/08/2024', source: 'Facebook' },
  { name: 'Karla Cavalcante', company: 'Emabrest', phone: '(88) 9 8170-0005', city: 'Crato-CE', email: 'karla@email.com', orders: 5, sales: 6, ticket: 1100.00, ltv: 5500, lastOrder: '06/05/2026', cycle: 45, segment: 'prata', active: true, since: '03/01/2025', source: 'Indicação' },
  { name: 'Matheus Gestor', company: 'Inova Fit', phone: '(88) 9 8753-9176', city: 'Iguatu-CE', email: 'matheus@inova.com', orders: 14, sales: 17, ticket: 278.00, ltv: 3892, lastOrder: '11/05/2026', cycle: 19, segment: 'ouro', active: true, since: '20/07/2024', source: 'WhatsApp' },
  { name: 'Thaís Aragão', company: 'Planeta Calçados', phone: '(88) 9 9739-1900', city: 'Crato-CE', email: 'thais@email.com', orders: 3, sales: 3, ticket: 1296.66, ltv: 3890, lastOrder: '28/04/2026', cycle: 30, segment: 'bronze', active: true, since: '14/12/2025', source: 'Instagram' },
  { name: 'Sueline Barros', company: 'Escola Modelo', phone: '(88) 9 5391-1822', city: 'Iguatu-CE', email: 'sueline@email.com', orders: 11, sales: 13, ticket: 519.20, ltv: 6750, lastOrder: '10/05/2026', cycle: 25, segment: 'ouro', active: true, since: '07/09/2024', source: 'Site' },
  { name: 'Wilemson Pinto', company: 'Óticas Morais', phone: '(88) 9 8451-5076', city: 'Sobral-CE', email: 'wilemson@email.com', orders: 2, sales: 2, ticket: 1945.00, ltv: 3890, lastOrder: '03/02/2026', cycle: 0, segment: 'bronze', active: false, since: '01/10/2024', source: 'Google' },
  { name: 'Ricardo Daniel', company: 'Duft Solar', phone: '(88) 9 8713-2876', city: 'Fortaleza-CE', email: 'ricardo@duft.com', orders: 16, sales: 20, ticket: 556.25, ltv: 8900, lastOrder: '13/05/2026', cycle: 22, segment: 'platina', active: true, since: '12/02/2024', source: 'Indicação' },
  { name: 'Francisco Aguiar', company: 'Biofarma Iblatu', phone: '(88) 9 9870-8246', city: 'Crato-CE', email: 'francisco@bio.com', orders: 6, sales: 7, ticket: 750.00, ltv: 4500, lastOrder: '04/05/2026', cycle: 35, segment: 'prata', active: true, since: '28/06/2025', source: 'WhatsApp' },
  { name: 'Iany Maia', company: 'Casa das Lentes', phone: '(88) 9 9826-5497', city: 'Sobral-CE', email: 'iany@email.com', orders: 4, sales: 5, ticket: 972.50, ltv: 3890, lastOrder: '29/04/2026', cycle: 33, segment: 'bronze', active: true, since: '11/11/2024', source: 'Facebook' },
  { name: 'Alex Soares', company: 'Construma', phone: '(88) 9 8724-8113', city: 'Maracanaú-CE', email: 'alex@constru.com', orders: 21, sales: 26, ticket: 533.30, ltv: 11200, lastOrder: '15/05/2026', cycle: 16, segment: 'diamante', active: true, since: '08/04/2023', source: 'Site' },
  { name: 'Jefferson Castro', company: 'Casa das Lentes', phone: '(88) 9 8015-3339', city: 'Sobral-CE', email: 'jefferson@email.com', orders: 0, sales: 0, ticket: 0, ltv: 0, lastOrder: '—', cycle: 0, segment: 'bronze', active: false, since: '17/03/2026', source: 'Indicação' },
  { name: 'Bruno Aragão', company: 'Aragão Imóveis', phone: '(85) 9 9847-1126', city: 'Fortaleza-CE', email: 'bruno@aragao.com', orders: 32, sales: 40, ticket: 590.62, ltv: 18900, lastOrder: '16/05/2026', cycle: 11, segment: 'diamante', active: true, since: '02/05/2022', source: 'Google' },
  { name: 'Letícia Maranhão', company: 'Studio Letícia', phone: '(85) 9 9512-3870', city: 'Caucaia-CE', email: 'leticia@studio.com', orders: 8, sales: 10, ticket: 622.50, ltv: 4980, lastOrder: '09/05/2026', cycle: 27, segment: 'ouro', active: true, since: '21/08/2024', source: 'Instagram' },
  { name: 'Pedro Mafra', company: 'Mafra Distribuidora', phone: '(85) 9 9760-4421', city: 'Fortaleza-CE', email: 'pedro@mafra.com', orders: 38, sales: 47, ticket: 586.84, ltv: 22300, lastOrder: '14/05/2026', cycle: 9, segment: 'diamante', active: true, since: '18/09/2021', source: 'WhatsApp' },
  { name: 'Marcela Tavares', company: 'Tavares Beauty', phone: '(85) 9 9342-1180', city: 'Fortaleza-CE', email: 'marcela@beauty.com', orders: 1, sales: 1, ticket: 2150.00, ltv: 2150, lastOrder: '18/03/2026', cycle: 0, segment: 'bronze', active: false, since: '02/03/2026', source: 'Site' },
  { name: 'Cesar Veículos', company: 'Cesar Veículos', phone: '(85) 9 9012-4477', city: 'Maracanaú-CE', email: 'cesar@veiculos.com', orders: 15, sales: 19, ticket: 1066.66, ltv: 16000, lastOrder: '12/05/2026', cycle: 20, segment: 'platina', active: true, since: '14/01/2024', source: 'Indicação' },
  { name: 'Henrique Castro', company: 'Castro Modas', phone: '(85) 9 9700-3322', city: 'Fortaleza-CE', email: 'henrique@castro.com', orders: 6, sales: 8, ticket: 716.66, ltv: 4300, lastOrder: '01/05/2026', cycle: 31, segment: 'prata', active: true, since: '25/05/2025', source: 'Facebook' },
  { name: 'Talita Souto', company: 'Souto Acessórios', phone: '(85) 9 9665-4488', city: 'Eusébio-CE', email: 'talita@souto.com', orders: 3, sales: 4, ticket: 866.66, ltv: 2600, lastOrder: '24/04/2026', cycle: 0, segment: 'bronze', active: false, since: '12/12/2025', source: 'Google' }];


  function enrichClient(c, i) {
    const initial = (c.name || '?').split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();
    const colorIdx = (c.name || '').length % AVATAR_BG.length;
    const tagsCount = c.orders > 15 ? 2 : c.orders > 0 ? 1 + i % 2 : 0;
    const tagsStart = i % TAGS_POOL.length;
    const tags = [];
    for (let k = 0; k < tagsCount; k++) tags.push(TAGS_POOL[(tagsStart + k) % TAGS_POOL.length]);
    const attendant = i % 4 === 0 ? 'Agente IA' : ATTENDANTS[i % (ATTENDANTS.length - 2)];
    return {
      id: 'cli' + i,
      ...c,
      avatarBg: AVATAR_BG[colorIdx],
      initial,
      tags,
      attendant
    };
  }

  function buildClients() {
    return MOCK_CLIENTS.map((c, i) => enrichClient(c, i));
  }

  // DTO da API (ficha completa) -> linha que a lista renderiza.
  // KPIs comerciais (pedidos/vendas/ticket/última compra/ciclo) ficam zerados
  // até o PDV existir; LTV usa o campo `valor` do cadastro por ora.
  function clienteDtoToRow(d, i) {
    const name = d.nome || (d.tipoPessoa === 'pj' ? (d.nomeFantasia || d.razaoSocial) : '') || 'Sem nome';
    const company = d.empresa || (d.tipoPessoa === 'pj' ? (d.razaoSocial || '') : '') || '';
    const city = d.cidade ? (d.cidade + (d.uf ? '-' + d.uf : '')) : '';
    const initial = (name || '?').split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();
    const colorIdx = (name || '').length % AVATAR_BG.length;
    return {
      id: d.id,
      name, company,
      phone: d.telefone || '',
      email: d.email || '',
      city,
      segment: d.segmento || 'bronze',
      active: d.ativo !== false,
      source: d.origemLead || '',
      attendant: d.atendente || '—',
      since: d.criadoEm ? new Date(d.criadoEm).toLocaleDateString('pt-BR') : '',
      orders: Number(d.orders) || 0,
      sales: Number(d.orders) || 0,
      ticket: (d.orders > 0 ? (Number(d.ltv) || 0) / d.orders : 0),
      ltv: Number(d.ltv) || 0,
      lastOrder: d.ultimaCompra ? new Date(d.ultimaCompra).toLocaleDateString('pt-BR') : '—',
      cycle: 0,
      avatarBg: AVATAR_BG[colorIdx],
      initial,
      tags: [], // tags ficam no CRM (crm-clientesfunil) — integrar depois
      _dto: d,
    };
  }

  // Form do NewClientDrawer -> corpo (nomes de coluna) que a API espera.
  function clientFormToDto(f) {
    const isPJ = f.tipo === 'pj';
    return {
      nome: f.name,
      empresa: isPJ ? (f.razao || null) : (f.company && f.company !== '—' ? f.company : null),
      telefone: f.phone || null,
      email: f.email || null,
      tipo_pessoa: isPJ ? 'pj' : 'pf',
      cpf: !isPJ ? (f.cpf || null) : null,
      rg: !isPJ ? (f.rg || null) : null,
      aniversario: !isPJ ? (f.birth || null) : null,
      cnpj: isPJ ? (f.cnpj || null) : null,
      razao_social: isPJ ? (f.razao || null) : null,
      nome_fantasia: isPJ ? (f.fantasia || null) : null,
      inscricao_estadual: isPJ ? (f.ie || null) : null,
      responsavel_nome: isPJ ? (f.respName || null) : null,
      responsavel_cargo: isPJ ? (f.respRole || null) : null,
      responsavel_cpf: isPJ ? (f.respCpf || null) : null,
      responsavel_email: isPJ ? (f.respEmail || null) : null,
      responsavel_telefone: isPJ ? (f.respPhone || null) : null,
      cep: f.cep || null, logradouro: f.logradouro || null, numero: f.numero || null,
      complemento: f.complemento || null, bairro: f.bairro || null, cidade: f.cidade || null,
      uf: f.uf ? f.uf.toUpperCase() : null,
      origemlead: f.source || null,
      segmento: f.segment || null,
      atendente: f.attendant && f.attendant !== '—' ? f.attendant : null,
      observacoes: f.obs || null,
      ativo: true,
    };
  }

  function fmtBRL(v) {
    return 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtBRLcompact(v) {
    const n = Number(v) || 0;
    if (n >= 1_000_000) return 'R$ ' + (n / 1_000_000).toFixed(1).replace('.', ',') + ' Mi';
    if (n >= 1_000) return 'R$ ' + (n / 1_000).toFixed(1).replace('.', ',') + ' mil';
    return fmtBRL(n);
  }

  const ALL_COLUMNS = [
  { id: 'nome', label: 'Cliente', required: true },
  { id: 'contatos', label: 'Contatos' },
  { id: 'tags', label: 'Tags' },
  { id: 'compras', label: 'Vendas' },
  { id: 'valores', label: 'LTV / Ticket' },
  { id: 'ultima', label: 'Última compra' },
  { id: 'atendente', label: 'Atendente' }];


  function AdminClients() {
    const { setRoute } = useStore();
    const [query, setQuery] = React.useState('');
    const [showFilters, setShowFilters] = React.useState(false);
    const [showNew, setShowNew] = React.useState(false);
    const [showImport, setShowImport] = React.useState(false);
    const [selected, setSelected] = React.useState(new Set());
    const [allClients, setAllClients] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [loadErr, setLoadErr] = React.useState('');
    const [visibleCols, setVisibleCols] = React.useState(() => new Set(ALL_COLUMNS.map((c) => c.id)));
    const [filterSegments, setFilterSegments] = React.useState(() => new Set());
    const [filterTags, setFilterTags] = React.useState(() => new Set());
    const [filterAttendants, setFilterAttendants] = React.useState(() => new Set());
    const [filterStatus, setFilterStatus] = React.useState('all'); // all | ativo | inativo
    const [openMenuId, setOpenMenuId] = React.useState(null);
    const [pinnedIds, setPinnedIds] = React.useState(() => new Set());
    const [apptFor, setApptFor] = React.useState(null);
    const [pdvFor, setPdvFor] = React.useState(null);
    const [confirmDelete, setConfirmDelete] = React.useState(null);
    const [viewClient, setViewClient] = React.useState(null);
    const [chatClient, setChatClient] = React.useState(null);

    // Carrega os clientes do backend (tabela clientes, por empresa).
    const reload = React.useCallback(async () => {
      setLoading(true); setLoadErr('');
      try {
        const r = await window.API.getClientes();
        const rows = (r.clientes || []).map((d, i) => clienteDtoToRow(d, i));
        setAllClients(rows);
        if (rows.length) skelRemember('clientes', rows.length);
      } catch (e) {
        setLoadErr((e && e.message) || 'Falha ao carregar os clientes.');
      } finally {
        setLoading(false);
      }
    }, []);
    React.useEffect(() => { reload(); }, [reload]);

    const togglePin = (id) => {
      const s = new Set(pinnedIds);
      if (s.has(id)) s.delete(id);else s.add(id);
      setPinnedIds(s);
    };
    const toggleActive = async (id) => {
      const c = allClients.find((x) => x.id === id);
      if (!c) return;
      const next = !c.active;
      setAllClients((prev) => prev.map((x) => x.id === id ? { ...x, active: next } : x));
      try {
        await window.API.updateCliente(id, { ativo: next });
        window.showToast && window.showToast({ tipo: 'sucesso', titulo: next ? 'Cliente ativado' : 'Cliente desativado', descricao: c.name });
      } catch (e) {
        setAllClients((prev) => prev.map((x) => x.id === id ? { ...x, active: !next } : x));
        window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao alterar status', descricao: (e && e.message) || 'Não foi possível alterar o status.' });
      }
    };
    const deleteClient = async (id) => {
      const prev = allClients;
      const cli = allClients.find((c) => c.id === id);
      setAllClients((p) => p.filter((c) => c.id !== id));
      setSelected((p) => {const n = new Set(p);n.delete(id);return n;});
      setPinnedIds((p) => {const n = new Set(p);n.delete(id);return n;});
      setConfirmDelete(null);
      try {
        await window.API.deleteCliente(id);
        window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Cliente excluído', descricao: cli && cli.name });
      } catch (e) {
        setAllClients(prev);
        window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao excluir cliente', descricao: (e && e.message) || 'Não foi possível excluir o cliente.' });
      }
    };
    const handleOpenChat = (cli) => {
      setOpenMenuId(null);
      setChatClient(cli);
    };

    const toggleSetVal = (setter, val) => {
      setter((prev) => {
        const next = new Set(prev);
        if (next.has(val)) next.delete(val);else next.add(val);
        return next;
      });
    };

    const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const digits = (s) => (s || '').replace(/\D/g, '');

    // KPIs computed from current dataset
    const kpis = React.useMemo(() => {
      const total = allClients.length;
      const ativos = allClients.filter((c) => c.active).length;
      const compradoresMaisDeUma = allClients.filter((c) => c.orders > 1).length;
      const compradores = allClients.filter((c) => c.orders >= 1).length;
      const totalLTV = allClients.reduce((s, c) => s + (c.ltv || 0), 0);
      const totalOrders = allClients.reduce((s, c) => s + (c.orders || 0), 0);
      const ltvMedio = compradores > 0 ? totalLTV / compradores : 0;
      const ticketMedio = totalOrders > 0 ? totalLTV / totalOrders : 0;
      const recompra = compradores > 0 ? compradoresMaisDeUma / compradores * 100 : 0;
      return { total, ativos, ltvMedio, ticketMedio, recompra };
    }, [allClients]);

    const filtered = React.useMemo(() => {
      const q = norm(query.trim());
      const dq = digits(query.trim());
      const base = allClients.filter((cli) => {
        if (q) {
          const inName = norm(cli.name).includes(q);
          const inCompany = norm(cli.company || '').includes(q);
          const inEmail = norm(cli.email).includes(q);
          const inPhone = dq.length >= 3 && digits(cli.phone).includes(dq);
          const inCity = norm(cli.city || '').includes(q);
          if (!inName && !inCompany && !inEmail && !inPhone && !inCity) return false;
        }
        if (filterStatus === 'ativo' && !cli.active) return false;
        if (filterStatus === 'inativo' && cli.active) return false;
        if (filterSegments.size > 0 && !filterSegments.has(cli.segment)) return false;
        if (filterAttendants.size > 0 && !filterAttendants.has(cli.attendant)) return false;
        if (filterTags.size > 0) {
          const hasTag = cli.tags.some((t) => filterTags.has(t.name));
          if (!hasTag) return false;
        }
        return true;
      });
      return [...base].sort((a, b) => (pinnedIds.has(b.id) ? 1 : 0) - (pinnedIds.has(a.id) ? 1 : 0));
    }, [allClients, query, filterStatus, filterSegments, filterAttendants, filterTags, pinnedIds]);

    const toggleAll = () => {
      if (selected.size === filtered.length) setSelected(new Set());else
      setSelected(new Set(filtered.map((c) => c.id)));
    };
    const toggleOne = (id) => {
      const s = new Set(selected);
      if (s.has(id)) s.delete(id);else s.add(id);
      setSelected(s);
    };

    const activeFilters = filterSegments.size + filterTags.size + filterAttendants.size + (filterStatus !== 'all' ? 1 : 0);
    const clearFilters = () => {setFilterSegments(new Set());setFilterTags(new Set());setFilterAttendants(new Set());setFilterStatus('all');};

    const colVisible = (id) => visibleCols.has(id);

    return (
      <Page
        title="Clientes"
        subtitle="Carteira de compradores · histórico, recompra e segmentação"
        actions={
        <FabNovo size="sm" label="Novo Cliente" onClick={() => setShowNew(true)} />
        }>

        <ClientStyles />

        {/* KPI strip */}
        <div className="client-kpis">
          <KpiCard
            icon="coins"
            label="LTV Médio"
            value={fmtBRLcompact(kpis.ltvMedio)}
            sub="Lifetime Value por cliente"
            tone="emerald" />
          <KpiCard
            icon="users"
            label="Total de Clientes"
            value={kpis.total.toLocaleString('pt-BR')}
            sub="Cadastrados na carteira"
            tone="indigo" />
          <KpiCard
            icon="repeat"
            label="Taxa de Recompra"
            value={kpis.recompra.toFixed(1).replace('.', ',') + '%'}
            sub="Clientes com 2+ pedidos"
            tone="violet" />
          <KpiCard
            icon="cart"
            label="Ticket Médio"
            value={fmtBRLcompact(kpis.ticketMedio)}
            sub="Por pedido"
            tone="amber" />
          <KpiCard
            icon="activity"
            label="Clientes Ativos"
            value={kpis.ativos.toLocaleString('pt-BR')}
            sub={`Compraram nos últimos 90d · ${kpis.total > 0 ? Math.round(kpis.ativos / kpis.total * 100) : 0}%`}
            tone="rose" />
        </div>

        {/* Toolbar */}
        <div className="card" style={{ padding: 12 }}>
          <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: 220, maxWidth: 360 }}>
              <Ic name="search" size={13} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }} />
              <input className="input" placeholder="Pesquisar nome, empresa, e-mail, telefone ou cidade..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ paddingLeft: 40, width: '100%' }} />
              {query &&
              <button onClick={() => setQuery('')} className="btn btn-ghost btn-icon" style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 26, height: 26 }} title="Limpar">
                  <Ic name="x" size={12} />
                </button>}
            </div>
            <span className="muted" style={{ fontSize: 'var(--type-sm)', whiteSpace: 'nowrap' }}>
              {filtered.length.toLocaleString('pt-BR')} cliente{filtered.length === 1 ? '' : 's'}
            </span>

            {/* Status quick toggle */}
            <StatusPills value={filterStatus} onChange={setFilterStatus} />

            <div style={{ flex: 1 }} />
            <FabNovo size="mini" label="Importar" onClick={() => setShowImport(true)} />
            <button className="btn">
              <Ic name="download" size={13} /> Exportar
            </button>
            <button
              className="btn"
              onClick={() => setShowFilters((s) => !s)}
              style={{ borderColor: activeFilters > 0 || showFilters ? 'var(--accent)' : undefined, color: activeFilters > 0 || showFilters ? 'var(--accent-700)' : undefined, background: activeFilters > 0 || showFilters ? 'var(--accent-soft)' : undefined }}>
              <Ic name="filter" size={13} /> Filtros
              {activeFilters > 0 &&
              <span style={{ marginLeft: 4, background: 'var(--accent)', color: 'white', borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>{activeFilters}</span>}
              <Ic name={showFilters ? 'chevron-up' : 'chevron-down'} size={11} />
            </button>
          </div>

          {showFilters &&
          <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10, animation: 'pop .2s ease' }}>
              <div className="row" style={{ alignItems: 'center', marginBottom: 8, gap: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Filtros e colunas</span>
                <div className="spacer" />
                {activeFilters > 0 &&
              <button className="btn btn-sm" onClick={clearFilters} style={{ height: 26, fontSize: 11 }}>
                    <Ic name="x" size={11} /> Limpar
                  </button>}
              </div>

              <div className="client-filter-grid">
                {/* Segmento */}
                <div className="client-fblock">
                  <div className="client-fcat">Segmento</div>
                  <div className="client-fchips">
                    {Object.entries(SEGMENTS).map(([id, s]) => {
                    const on = filterSegments.has(id);
                    return (
                      <span key={id} onClick={() => toggleSetVal(setFilterSegments, id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, border: `1px solid ${on ? s.color : 'var(--border)'}`, background: on ? `color-mix(in oklab, ${s.color} 16%, white)` : 'var(--surface)', color: on ? s.color : 'var(--text-muted)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />{s.label}
                        </span>);
                  })}
                  </div>
                </div>

                {/* Tags */}
                <div className="client-fblock">
                  <div className="client-fcat">Tags</div>
                  <div className="client-fchips">
                    {TAGS_POOL.map((t) => {
                    const on = filterTags.has(t.name);
                    return (
                      <span key={t.name} onClick={() => toggleSetVal(setFilterTags, t.name)} style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 999, background: on ? `color-mix(in oklab, ${t.color} 22%, white)` : `color-mix(in oklab, ${t.color} 12%, white)`, color: t.color, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${on ? t.color : 'transparent'}` }}>
                          {t.name}
                        </span>);
                  })}
                  </div>
                </div>

                {/* Atendente */}
                <div className="client-fblock">
                  <div className="client-fcat">Atendente</div>
                  <div className="client-fchips">
                    {ATTENDANTS.filter((a) => a !== '—').map((a) => {
                    const on = filterAttendants.has(a);
                    const isAI = a === 'Agente IA';
                    return (
                      <span key={a} onClick={() => toggleSetVal(setFilterAttendants, a)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--accent-soft)' : 'var(--surface)', color: on ? 'var(--accent-700)' : 'var(--text-muted)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                          {isAI && <Ic name="sparkles" size={10} />}
                          {a}
                        </span>);
                  })}
                  </div>
                </div>

                {/* Columns */}
                <div className="client-fblock">
                  <div className="client-fcat">Colunas visíveis</div>
                  <div className="client-fchips">
                    {ALL_COLUMNS.map((c) => {
                    const on = visibleCols.has(c.id);
                    const disabled = c.required;
                    return (
                      <span key={c.id}
                      onClick={() => {
                        if (disabled) return;
                        const next = new Set(visibleCols);
                        if (next.has(c.id)) next.delete(c.id);else next.add(c.id);
                        setVisibleCols(next);
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--accent-soft)' : 'var(--surface)', color: disabled ? 'var(--text-faint)' : on ? 'var(--accent-700)' : 'var(--text-muted)', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 600 }}>
                          <Ic name={on ? 'check' : 'plus'} size={10} />{c.label}
                        </span>);
                  })}
                  </div>
                </div>
              </div>
            </div>}
        </div>

        {/* Table */}
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="client-row client-head">
            <div className="client-cell client-cell-check">
              <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
            </div>
            {colVisible('nome') && <div className="client-cell client-cell-name">Cliente</div>}
            {colVisible('contatos') && <div className="client-cell client-cell-contacts">Contatos</div>}
            {colVisible('tags') && <div className="client-cell client-cell-tags">Tags / Segmento</div>}
            {colVisible('compras') && <div className="client-cell client-cell-orders">Vendas</div>}
            {colVisible('valores') && <div className="client-cell client-cell-values">LTV / Ticket médio</div>}
            {colVisible('ultima') && <div className="client-cell client-cell-last">Última compra</div>}
            {colVisible('atendente') && <div className="client-cell client-cell-att">Atendente</div>}
            <div className="client-cell client-cell-toggle">Status</div>
            <div className="client-cell client-cell-actions"></div>
          </div>

          <div className="client-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 0', background: 'var(--surface-2)' }}>
            {loading ?
            Array.from({ length: skelCount('clientes', 3) }).map((_, i) =>
              <div key={'sk' + i} className="client-row client-body" style={{ borderLeft: '2px solid var(--border)', pointerEvents: 'none' }}>
                  <div className="client-cell client-cell-check"><Skeleton w={14} h={14} r={4} /></div>
                  {colVisible('nome') &&
                    <div className="client-cell client-cell-name">
                      <Skeleton circle w={36} h={36} />
                      <div style={{ minWidth: 0, flex: 1 }}><Skeleton w="70%" h={12} /><Skeleton w="50%" h={9} style={{ marginTop: 5 }} /></div>
                    </div>}
                  {colVisible('contatos') &&
                    <div className="client-cell client-cell-contacts"><Skeleton w="80%" h={11} /><Skeleton w="90%" h={11} style={{ marginTop: 5 }} /></div>}
                  {colVisible('tags') &&
                    <div className="client-cell client-cell-tags"><Skeleton w={70} h={18} r={999} /><Skeleton w={50} h={16} r={999} style={{ marginTop: 5 }} /></div>}
                  {colVisible('compras') &&
                    <div className="client-cell client-cell-orders"><Skeleton w={72} h={22} r={999} /></div>}
                  {colVisible('valores') &&
                    <div className="client-cell client-cell-values"><Skeleton w="70%" h={12} /><Skeleton w="55%" h={10} style={{ marginTop: 5 }} /></div>}
                  {colVisible('ultima') &&
                    <div className="client-cell client-cell-last"><Skeleton w="70%" h={12} /><Skeleton w="55%" h={10} style={{ marginTop: 5 }} /></div>}
                  {colVisible('atendente') &&
                    <div className="client-cell client-cell-att"><div className="row" style={{ gap: 6 }}><Skeleton circle w={26} h={26} /><Skeleton w="55%" h={11} /></div></div>}
                  <div className="client-cell client-cell-toggle"><Skeleton w={40} h={22} r={999} /></div>
                  <div className="client-cell client-cell-actions"><Skeleton w={28} h={28} r={8} /></div>
                </div>) :
            loadErr ?
            <div style={{ padding: 60, textAlign: 'center', background: 'var(--surface)' }}>
                <Ic name="users" size={36} style={{ opacity: .4, color: '#ef4444' }} />
                <div style={{ marginTop: 12, fontWeight: 700, color: '#b91c1c' }}>{loadErr}</div>
                <button className="btn" style={{ marginTop: 12 }} onClick={reload}>Tentar de novo</button>
              </div> :
            filtered.length === 0 ?
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-faint)', background: 'var(--surface)' }}>
                <Ic name="users" size={36} style={{ opacity: .4 }} />
                <div style={{ marginTop: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{allClients.length === 0 ? 'Nenhum cliente cadastrado' : 'Nenhum cliente encontrado'}</div>
                <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>{allClients.length === 0 ? 'Cadastre o primeiro cliente no botão "Novo cliente".' : 'Ajuste os filtros ou cadastre um novo cliente.'}</div>
              </div> :

            filtered.map((cli) => {
              const seg = SEGMENTS[cli.segment] || SEGMENTS.bronze;
              const checked = selected.has(cli.id);
              const isAI = cli.attendant === 'Agente IA';
              const statusColor = cli.active ? '#10b981' : '#ef4444';
              return (
                <div key={cli.id}
                className={`client-row client-body${pinnedIds.has(cli.id) ? ' client-pinned' : ''}`}
                style={{ cursor: 'pointer', borderLeft: `2px solid ${pinnedIds.has(cli.id) ? '#16A872' : statusColor}` }}
                onClick={() => setViewClient(cli)}>
                    <div className="client-cell client-cell-check" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={checked} onChange={() => toggleOne(cli.id)} />
                    </div>

                    {colVisible('nome') &&
                  <div className="client-cell client-cell-name">
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: cli.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 'var(--type-sm)', color: 'var(--text)', flexShrink: 0, position: 'relative' }}>
                          {cli.initial}
                          <span style={{ position: 'absolute', right: -1, bottom: -1, width: 11, height: 11, borderRadius: '50%', background: statusColor, border: '2px solid var(--surface)' }} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="client-name">{cli.name}</div>
                          <div className="client-city">
                            <Ic name="building" size={11} />
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cli.city}</span>
                          </div>
                        </div>
                      </div>}

                    {colVisible('contatos') &&
                  <div className="client-cell client-cell-contacts">
                        <div className="row" style={{ gap: 4, color: 'var(--text-muted)', fontSize: 'var(--type-sm)' }}>
                          <Ic name="phone" size={11} />{cli.phone}
                        </div>
                        <div className="row" style={{ gap: 4, color: 'var(--text-muted)', fontSize: 'var(--type-sm)' }}>
                          <Ic name="mail" size={11} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cli.email}</span>
                        </div>
                      </div>}

                    {colVisible('tags') &&
                  <div className="client-cell client-cell-tags">
                        <span className="client-seg" style={{ background: `color-mix(in oklab, ${seg.color} 16%, white)`, color: seg.color, border: `1px solid color-mix(in oklab, ${seg.color} 35%, transparent)` }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: seg.color }} />{seg.label}
                        </span>
                        <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
                          {cli.tags.map((t, i) =>
                      <span key={i} style={{ padding: '2px 7px', borderRadius: 999, background: `color-mix(in oklab, ${t.color} 16%, white)`, color: t.color, fontSize: 10.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{t.name}</span>)}
                        </div>
                      </div>}

                    {colVisible('compras') &&
                  <div className="client-cell client-cell-orders">
                        <span className="pill-stat pill-sales">
                          <Ic name="cart" size={11} />
                          <span className="pill-l">VENDAS</span>
                          <span className="pill-n">{cli.sales}</span>
                        </span>
                      </div>}

                    {colVisible('valores') &&
                  <div className="client-cell client-cell-values">
                        <div className="value-pair">
                          <span className="muted" style={{ fontSize: 10 }}>LTV</span>
                          <span className="tnum" style={{ fontSize: 'var(--type-sm)', fontWeight: 700, color: '#059669' }}>{fmtBRL(cli.ltv)}</span>
                        </div>
                        <div className="value-pair">
                          <span className="muted" style={{ fontSize: 10 }}>Ticket</span>
                          <span className="tnum" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtBRL(cli.ticket)}</span>
                        </div>
                      </div>}

                    {colVisible('ultima') &&
                  <div className="client-cell client-cell-last">
                        <span className="tnum" style={{ fontSize: 'var(--type-sm)', fontWeight: 500 }}>{cli.lastOrder}</span>
                        <span className="muted" style={{ fontSize: 11 }}>{cli.cycle > 0 ? `Ciclo ${cli.cycle} Dias` : 'Sem compras'}</span>
                      </div>}

                    {colVisible('atendente') &&
                  <div className="client-cell client-cell-att">
                        <div className="row" style={{ gap: 6, fontSize: 'var(--type-sm)' }}>
                          {isAI ?
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--ai-soft)', color: 'var(--ai-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Ic name="sparkles" size={12} />
                            </div> :
                      cli.attendant !== '—' && <Avatar name={cli.attendant} size="sm" />}
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isAI ? 'var(--ai-strong)' : 'var(--text-muted)', fontWeight: isAI ? 600 : 500 }}>{cli.attendant}</span>
                        </div>
                      </div>}

                    <div className="client-cell client-cell-toggle" onClick={(e) => e.stopPropagation()}>
                      <button
                      className={`client-toggle ${cli.active ? 'on' : 'off'}`}
                      onClick={() => toggleActive(cli.id)}
                      title={cli.active ? 'Desativar cliente' : 'Reativar cliente'}
                      aria-pressed={cli.active}>
                        <span className="client-toggle-knob" />
                      </button>
                    </div>

                    <div className="client-cell client-cell-actions" style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                      {pinnedIds.has(cli.id) &&
                    <span title="Fixado" style={{ display: 'none' }}>
                          <Ic name="pin" size={12} />
                        </span>}
                      <button className="btn btn-ghost btn-icon" title="Mais ações"
                    onClick={(e) => {e.stopPropagation();setOpenMenuId(openMenuId === cli.id ? null : cli.id);}}>
                        <Ic name="more" size={14} />
                      </button>
                      {openMenuId === cli.id &&
                    <ClientActionsMenu
                      client={cli}
                      pinned={pinnedIds.has(cli.id)}
                      onClose={() => setOpenMenuId(null)}
                      onChat={() => {setOpenMenuId(null);handleOpenChat(cli);}}
                      onPdv={() => {setOpenMenuId(null);setPdvFor(cli);}}
                      onPin={() => {togglePin(cli.id);setOpenMenuId(null);}}
                      onAppointment={() => {setOpenMenuId(null);setApptFor(cli);}}
                      onDelete={() => {setOpenMenuId(null);setConfirmDelete(cli);}} />}
                    </div>
                  </div>);
            })}
          </div>
        </div>

        {showNew && <NewClientDrawer onClose={() => setShowNew(false)} onSave={async (c) => {
          try {
            const r = await window.API.createCliente(clientFormToDto(c));
            setAllClients((p) => [clienteDtoToRow(r.cliente, 0), ...p]);
            window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Cliente criado', descricao: c.name });
          } catch (e) {
            window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao criar cliente', descricao: (e && e.message) || 'Não foi possível criar o cliente.' });
          }
        }} />}
        {viewClient && window.CRMCardDetail && <window.CRMCardDetail
          card={{
            clienteId: viewClient.id,
            name: viewClient.name,
            company: viewClient.company || '—',
            email: viewClient.email,
            phone: viewClient.phone,
            value: viewClient.ltv,
            tags: (viewClient.tags || []).map((t) => ({ label: t.name, color: t.color }))
          }}
          onSaved={(c) => {
            setAllClients((p) => p.map((x) => x.id === c.id ? { ...clienteDtoToRow(c, 0), avatarBg: x.avatarBg } : x));
            setViewClient((v) => (v && v.id === c.id) ? { ...v, ...clienteDtoToRow(c, 0) } : v);
            window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Cliente atualizado', descricao: c.nome || c.name });
          }}
          onClose={() => setViewClient(null)} />}
        {showImport && <ImportClientsDrawer onClose={() => setShowImport(false)} />}
        {chatClient && window.QueuePreviewDrawer && (() => {
          const QPD = window.QueuePreviewDrawer;
          const chatConv = {
            id: chatClient.id || `cli-${chatClient.name}`,
            client: chatClient.name,
            avatar: (chatClient.name || '').split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase(),
            channel: 'whatsapp',
            status: 'em-andamento',
            lastTime: chatClient.lastOrder || 'agora',
            tag: 'CLIENTE',
            preview: `Cliente ativo · ${chatClient.orders} pedidos · LTV ${fmtBRL(chatClient.ltv)}`,
            unread: 0,
            handler: 'human',
            phone: chatClient.phone,
            email: chatClient.email,
            aiSummary: `Cliente ${chatClient.segment ? 'segmento ' + (SEGMENTS[chatClient.segment]?.label || chatClient.segment) : ''} · ${chatClient.company || ''}. LTV total ${fmtBRL(chatClient.ltv)} em ${chatClient.orders} pedidos, ticket médio ${fmtBRL(chatClient.ticket)}. Última compra: ${chatClient.lastOrder}.`,
            _wait: 0,
            reason: 'Histórico de cliente',
            priority: 'media',
            _summary: `Carteira · ${chatClient.company || ''}. ${chatClient.orders} pedidos · LTV ${fmtBRL(chatClient.ltv)}.`
          };
          return (
            <QPD
              conv={chatConv}
              reasonColor={{ c: 'var(--hue-blue)', ic: 'user' }}
              onClose={() => setChatClient(null)}
              onAssume={() => {}}
              onReturnConfirm={() => setChatClient(null)}
              onAssignConfirm={() => setChatClient(null)}
              onCloseConfirm={() => setChatClient(null)} />);
        })()}
        {apptFor && window.NewAppointment &&
        <window.NewAppointment
          onClose={() => setApptFor(null)}
          defaultClient={apptFor.name}
          defaultResponsible={apptFor.attendant && apptFor.attendant !== '—' && apptFor.attendant !== 'Agente IA' ? apptFor.attendant : ''} />}
        {pdvFor &&
        <Modal title="PDV de Venda" onClose={() => setPdvFor(null)} size="sm"
        footer={<><div style={{ flex: 1 }} /><button className="btn fin-btn-back" onClick={() => setPdvFor(null)}>Voltar</button><button className="btn btn-primary" onClick={() => setPdvFor(null)}><Ic name="cart" size={13} /> Iniciar venda</button></>}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '14px 8px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ic name="cart" size={26} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 'var(--type-md)' }}>Abrir PDV para {pdvFor.name}?</div>
                <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>{pdvFor.company || '—'} · Ticket médio {fmtBRL(pdvFor.ticket)}</div>
              </div>
            </div>
          </Modal>}
        {confirmDelete &&
        <Modal title="Excluir cliente" onClose={() => setConfirmDelete(null)} size="sm"
        footer={(close) => <>
              <div style={{ flex: 1 }} />
              <button className="btn fin-btn-back" onClick={() => close()}>Voltar</button>
              <button className="btn btn-delete" onClick={() => close(() => deleteClient(confirmDelete.id))}>
                <Ic name="trash" size={13} /> Excluir
              </button>
            </>}>
            <div style={{ display: 'flex', gap: 12, padding: '6px 4px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'color-mix(in oklab, #dc2626 12%, white)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Ic name="trash" size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>Excluir o cliente {confirmDelete.name}?</div>
                <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>Esta ação não pode ser desfeita. O histórico de compras permanecerá no sistema.</div>
              </div>
            </div>
          </Modal>}
      </Page>);
  }

  function KpiCard({ icon, label, value, sub, tone }) {
    const tones = {
      emerald: { bg: 'color-mix(in oklab, #10b981 12%, white)', fg: '#047857', bar: '#10b981' },
      indigo: { bg: 'color-mix(in oklab, #6366f1 12%, white)', fg: '#4338ca', bar: '#6366f1' },
      violet: { bg: 'color-mix(in oklab, #8b5cf6 12%, white)', fg: '#6d28d9', bar: '#8b5cf6' },
      amber: { bg: 'color-mix(in oklab, #f59e0b 14%, white)', fg: '#b45309', bar: '#f59e0b' },
      rose: { bg: 'color-mix(in oklab, #f43f5e 12%, white)', fg: '#be123c', bar: '#f43f5e' }
    };
    const t = tones[tone] || tones.indigo;
    return (
      <div className="kpi-card">
        <div className="kpi-bar" style={{ background: t.bar }} />
        <div className="kpi-body">
          <div className="kpi-head">
            <div className="kpi-icon" style={{ background: t.bg, color: t.fg }}><Ic name={icon} size={16} /></div>
            <div className="kpi-label">{label}</div>
          </div>
          <div className="kpi-value tnum" style={{ color: t.fg }}>{value}</div>
          <div className="kpi-sub">{sub}</div>
        </div>
      </div>);
  }

  function StatusPills({ value, onChange }) {
    const wrapRef = React.useRef(null);
    const btnRefs = React.useRef({});
    const options = [
    { id: 'all', label: 'Todos', dot: null },
    { id: 'ativo', label: 'Ativos', dot: '#10b981' },
    { id: 'inativo', label: 'Inativos', dot: '#ef4444' }];

    const [thumb, setThumb] = React.useState({ left: 0, width: 0 });
    React.useLayoutEffect(() => {
      const btn = btnRefs.current[value];
      const wrap = wrapRef.current;
      if (!btn || !wrap) return;
      const wrect = wrap.getBoundingClientRect();
      const brect = btn.getBoundingClientRect();
      setThumb({ left: brect.left - wrect.left, width: brect.width });
    }, [value]);
    return (
      <div ref={wrapRef} className="client-status-pills">
        <span className="client-status-thumb" style={{ transform: `translateX(${thumb.left}px)`, width: thumb.width }} />
        {options.map((o) =>
        <button
          key={o.id}
          ref={(el) => {btnRefs.current[o.id] = el;}}
          className={value === o.id ? 'on' : ''}
          onClick={() => onChange(o.id)}>
            {o.dot && <span className="dot" style={{ background: o.dot }} />}
            {o.label}
          </button>)}
      </div>);
  }

  function ClientActionsMenu({ client, pinned, onClose, onChat, onPdv, onPin, onAppointment, onDelete }) {
    const { can } = useStore();
    const wrapRef = React.useRef(null);
    React.useEffect(() => {
      const onDoc = (e) => {if (wrapRef.current && !wrapRef.current.contains(e.target)) onClose();};
      const onKey = (e) => {if (e.key === 'Escape') onClose();};
      const t = setTimeout(() => {
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
      }, 0);
      return () => {clearTimeout(t);document.removeEventListener('mousedown', onDoc);document.removeEventListener('keydown', onKey);};
    }, [onClose]);
    const items = [
    { id: 'chat', label: 'Bate Papo', icon: 'chat', onClick: onChat },
    { id: 'pdv', label: 'Nova venda', icon: 'cart', onClick: onPdv },
    { id: 'pin', label: pinned ? 'Desafixar' : 'Fixar', icon: 'pin', onClick: onPin },
    { id: 'appt', label: 'Agendamento', icon: 'agenda', onClick: onAppointment },
    can('clientes.excluir') && { id: 'del', label: 'Excluir', icon: 'trash', onClick: onDelete, danger: true }].filter(Boolean);

    return (
      <div ref={wrapRef}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute', top: 'calc(100% + 4px)', right: 8,
        minWidth: 180, background: 'var(--surface)', border: '1px solid var(--border-strong)',
        borderRadius: 10, boxShadow: '0 14px 32px rgba(15,23,42,.18)',
        zIndex: 50, padding: 4, animation: 'pop .15s ease'
      }}>
        {items.map((it, i) =>
        <div key={it.id}
        onClick={() => it.onClick && it.onClick()}
        onMouseEnter={(e) => {e.currentTarget.style.background = it.danger ? 'color-mix(in oklab, #dc2626 10%, white)' : 'var(--surface-2)';}}
        onMouseLeave={(e) => {e.currentTarget.style.background = 'transparent';}}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
          borderRadius: 7, cursor: 'pointer', fontSize: 'var(--type-sm)', fontWeight: 500,
          color: it.danger ? '#dc2626' : 'var(--text)',
          borderTop: it.danger && i > 0 ? '1px solid var(--border)' : 'none', marginTop: it.danger && i > 0 ? 4 : 0, paddingTop: it.danger && i > 0 ? 10 : '8px'
        }}>
            <Ic name={it.icon} size={14} />
            <span style={{ flex: 1 }}>{it.label}</span>
          </div>)}
      </div>);
  }

  // Segmented PF/PJ com pílula deslizante (efeito lateral, CSS puro)
  function TypeToggle({ value, onChange }) {
    const isPJ = value === 'pj';
    return (
      <div className={'cli-seg' + (isPJ ? ' is-pj' : '')}>
        <span className="cli-seg-pill" aria-hidden="true" />
        <button className={!isPJ ? 'on' : ''} onClick={() => onChange('pf')}><Ic name="user" size={15} /> Pessoa Física</button>
        <button className={isPJ ? 'on' : ''} onClick={() => onChange('pj')}><Ic name="building" size={15} /> Pessoa Jurídica</button>
      </div>);
  }

  // Bloco visual do formulário (definido fora do render p/ não remontar inputs)
  // Bloco de tópico no padrão global (título com marcador verde acima da caixa).
  // icon/color mantidos na assinatura por compatibilidade, mas o visual segue o padrão único.
  function CliBlock({ icon, title, color, children }) {
    return (
      <>
        <div className="fin-section-title">{title}</div>
        <div className="fin-section">
          <div className="col" style={{ gap: 10 }}>{children}</div>
        </div>
      </>);
  }

  function NewClientDrawer({ onClose, onSave }) {
    const today = new Date().toLocaleDateString('pt-BR');
    const [f, setF] = React.useState({
      tipo: 'pf',
      // PF
      name: '', cpf: '', rg: '', birth: '',
      // PJ
      razao: '', fantasia: '', cnpj: '', ie: '',
      // contato
      phone: '', email: '',
      // responsável (PJ)
      respName: '', respRole: 'Sócio', respCpf: '', respEmail: '', respPhone: '',
      // endereço
      cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
      // comercial
      source: 'Instagram', segment: 'bronze', attendant: ATTENDANTS[0], obs: '',
      // defaults p/ a carteira/tabela
      orders: 0, sales: 0, ticket: 0, ltv: 0, lastOrder: today, cycle: 0, active: true, since: today
    });
    const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
    const isPJ = f.tipo === 'pj';
    const valid = isPJ ? f.razao.trim().length >= 2 : f.name.trim().length >= 2;

    const handleSave = () => {
      const displayName = isPJ ? (f.fantasia || f.razao) : f.name;
      const company = isPJ ? f.razao : '—';
      const city = f.cidade ? `${f.cidade}${f.uf ? '-' + f.uf.toUpperCase() : ''}` : '';
      onSave({ ...f, name: displayName, company, city, doc: isPJ ? f.cnpj : f.cpf });
    };

    return (
      <Drawer title="Nova ficha de cliente" subtitle="Cadastro completo da carteira de clientes" onClose={onClose} width={760}
      footer={(close) => <>
          <div style={{ flex: 1 }} />
          <ActionButton action="voltar" size="md" onClick={() => close()} />
          <ActionButton action="salvar" size="md" label="Criar cliente" disabled={!valid} style={{ opacity: valid ? 1 : .5 }} onClick={() => close(() => handleSave())} />
        </>}>
        <div className="tpc-flat">
        <style>{`
          .cli-typebar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 2px 14px; flex-wrap: wrap; }
          .cli-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .cli-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
          .cli-grid-cep { display: grid; grid-template-columns: 150px 1fr 110px; gap: 10px; }
          .cli-grid-city { display: grid; grid-template-columns: 1fr 110px; gap: 10px; }
          @media (max-width: 640px) { .cli-grid-2, .cli-grid-3, .cli-grid-cep, .cli-grid-city { grid-template-columns: 1fr !important; } }
          .cli-seg { position: relative; display: grid; grid-template-columns: 1fr 1fr; background: var(--surface-3); border-radius: 9px; padding: 3px; }
          .cli-seg-pill { position: absolute; top: 3px; bottom: 3px; left: 3px; width: calc(50% - 3px); border-radius: 7px; background: var(--surface); box-shadow: var(--shadow-sm); transition: transform .3s cubic-bezier(.4,0,.2,1); pointer-events: none; z-index: 0; }
          .cli-seg.is-pj .cli-seg-pill { transform: translateX(100%); }
          .cli-seg button { position: relative; z-index: 1; border: none; background: none; padding: 8px 16px; border-radius: 7px; font: inherit; font-size: var(--type-sm); font-weight: 600; color: var(--text-muted); cursor: pointer; transition: color .2s ease; display: inline-flex; align-items: center; justify-content: center; gap: 7px; white-space: nowrap; }
          .cli-seg button.on { color: var(--text); }
        `}</style>

        {/* Tipo de cliente */}
        <div className="cli-typebar">
          <span style={{ fontSize: 'var(--type-sm)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Tipo de cliente</span>
          <TypeToggle value={f.tipo} onChange={(v) => set('tipo', v)} />
        </div>

        {/* Dados */}
        {!isPJ ? (
          <CliBlock icon="user" title="Dados pessoais" color="#3b82f6">
            <div className="cli-grid-2">
              <div><label className="label">Nome completo *</label><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex: Mariana Sousa" /></div>
              <div><label className="label">Data de nascimento</label><DateInput value={f.birth} onChange={(v) => set('birth', v)} /></div>
            </div>
            <div className="cli-grid-2">
              <div><label className="label">CPF</label><CpfInput value={f.cpf} onChange={(v) => set('cpf', v)} /></div>
              <div><label className="label">RG</label><input className="input" value={f.rg} onChange={(e) => set('rg', e.target.value)} placeholder="00.000.000-0" /></div>
            </div>
            <div className="cli-grid-2">
              <div><label className="label">Telefone</label><PhoneInput value={f.phone} onChange={(v) => set('phone', v)} /></div>
              <div><label className="label">E-mail</label><EmailInput value={f.email} onChange={(v) => set('email', v)} /></div>
            </div>
          </CliBlock>
        ) : (
          <>
            <CliBlock icon="building" title="Dados da empresa" color="#8b5cf6">
              <div className="cli-grid-2">
                <div><label className="label">Razão social *</label><input className="input" value={f.razao} onChange={(e) => set('razao', e.target.value)} placeholder="Ex: Bella Pele Cosméticos LTDA" /></div>
                <div><label className="label">Nome fantasia</label><input className="input" value={f.fantasia} onChange={(e) => set('fantasia', e.target.value)} placeholder="Ex: Bella Pele" /></div>
              </div>
              <div className="cli-grid-2">
                <div><label className="label">CNPJ</label><CnpjInput value={f.cnpj} onChange={(v) => set('cnpj', v)} /></div>
                <div><label className="label">Inscrição estadual</label><input className="input" value={f.ie} onChange={(e) => set('ie', e.target.value)} placeholder="Isento / número" /></div>
              </div>
              <div className="cli-grid-2">
                <div><label className="label">Telefone comercial</label><PhoneInput value={f.phone} onChange={(v) => set('phone', v)} /></div>
                <div><label className="label">E-mail comercial</label><EmailInput value={f.email} onChange={(v) => set('email', v)} /></div>
              </div>
            </CliBlock>
            <CliBlock icon="user" title="Responsável" color="#3b82f6">
              <div className="cli-grid-2">
                <div><label className="label">Nome do responsável</label><input className="input" value={f.respName} onChange={(e) => set('respName', e.target.value)} placeholder="Ex: João Pereira" /></div>
                <div><label className="label">Cargo</label><select className="input" value={f.respRole} onChange={(e) => set('respRole', e.target.value)}><option>Sócio</option><option>Diretor</option><option>Gerente</option><option>Comprador</option><option>Marketing</option><option>Outro</option></select></div>
              </div>
              <div className="cli-grid-3">
                <div><label className="label">CPF</label><CpfInput value={f.respCpf} onChange={(v) => set('respCpf', v)} /></div>
                <div><label className="label">E-mail</label><EmailInput value={f.respEmail} onChange={(v) => set('respEmail', v)} /></div>
                <div><label className="label">Telefone</label><PhoneInput value={f.respPhone} onChange={(v) => set('respPhone', v)} /></div>
              </div>
            </CliBlock>
          </>
        )}

        {/* Endereço */}
        <CliBlock icon="map-pin" title="Endereço" color="#10b981">
          <div className="cli-grid-cep">
            <div><label className="label">CEP</label><CepInput value={f.cep} onChange={(v) => set('cep', v)} onResolve={(r) => { set('logradouro', r.logradouro || ''); set('bairro', r.bairro || ''); set('cidade', r.cidade || ''); set('uf', r.uf || ''); }} /></div>
            <div><label className="label">Logradouro</label><input className="input" value={f.logradouro} onChange={(e) => set('logradouro', e.target.value)} placeholder="Rua / Avenida" /></div>
            <div><label className="label">Número</label><input className="input" value={f.numero} onChange={(e) => set('numero', e.target.value)} placeholder="Nº" /></div>
          </div>
          <div className="cli-grid-2">
            <div><label className="label">Complemento</label><input className="input" value={f.complemento} onChange={(e) => set('complemento', e.target.value)} placeholder="Sala, bloco, andar..." /></div>
            <div><label className="label">Bairro</label><input className="input" value={f.bairro} onChange={(e) => set('bairro', e.target.value)} /></div>
          </div>
          <div className="cli-grid-city">
            <div><label className="label">Cidade</label><input className="input" value={f.cidade} onChange={(e) => set('cidade', e.target.value)} placeholder="Ex: Fortaleza" /></div>
            <div><label className="label">UF</label><UFSelect value={f.uf} onChange={(v) => set('uf', v)} /></div>
          </div>
        </CliBlock>

        {/* Informações comerciais */}
        <CliBlock icon="tag" title="Informações comerciais" color="#f59e0b">
          <div className="cli-grid-3">
            <div><label className="label">Origem</label><select className="input" value={f.source} onChange={(e) => set('source', e.target.value)}><option>Instagram</option><option>WhatsApp</option><option>Facebook</option><option>Google</option><option>Indicação</option><option>Site</option></select></div>
            <div><label className="label">Segmento</label><select className="input" value={f.segment} onChange={(e) => set('segment', e.target.value)}>{Object.entries(SEGMENTS).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}</select></div>
            <div><label className="label">Atendente</label><select className="input" value={f.attendant} onChange={(e) => set('attendant', e.target.value)}>{ATTENDANTS.filter((a) => a !== '—').map((a) => <option key={a} value={a}>{a}</option>)}</select></div>
          </div>
          <div><label className="label">Observações</label><textarea className="input" rows={3} value={f.obs} onChange={(e) => set('obs', e.target.value)} placeholder="Preferências, histórico, anotações..." /></div>
        </CliBlock>
        </div>
      </Drawer>);
  }

  function ImportClientsDrawer({ onClose }) {
    return (
      <Drawer title="Importar Clientes" subtitle="Importe sua base a partir de uma planilha (CSV/XLSX)" onClose={onClose} width="40vw"
      footer={<><div style={{ flex: 1 }} /><ActionButton action="voltar" size="md" onClick={onClose} /><ActionButton action="salvar" size="md" label="Importar" icon="upload" onClick={() => { window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Clientes importados' }); onClose(); }} /></>}>
        <div className="col" style={{ gap: 14 }}>
          <div style={{ padding: 24, border: '2px dashed var(--border-strong)', borderRadius: 12, textAlign: 'center', background: 'var(--surface-2)' }}>
            <Ic name="upload" size={28} style={{ color: 'var(--text-faint)' }} />
            <div style={{ marginTop: 8, fontWeight: 700 }}>Arraste seu arquivo aqui</div>
            <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>ou clique para selecionar (CSV, XLSX até 10MB)</div>
            <button className="btn" style={{ marginTop: 12 }}><Ic name="upload" size={13} /> Selecionar arquivo</button>
          </div>
          <div style={{ padding: 14, background: 'var(--accent-soft)', borderRadius: 10, fontSize: 'var(--type-sm)', color: 'var(--accent-700)' }}>
            <div className="row" style={{ gap: 8 }}><Ic name="info" size={14} /><strong>Campos esperados:</strong></div>
            <div style={{ marginTop: 6 }}>Nome, telefone, e-mail, empresa, cidade, segmento, LTV, ticket, total de pedidos, última compra. <a href="#" style={{ color: 'inherit', textDecoration: 'underline' }}>Baixar modelo</a></div>
          </div>
        </div>
      </Drawer>);
  }

  function ClientStyles() {
    return (
      <style>{`
        .client-kpis { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; margin-bottom: 12px; }
        @media (max-width: 1280px) { .client-kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (max-width: 760px)  { .client-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        .kpi-card { display: flex; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; transition: box-shadow .15s, transform .15s; }
        .kpi-card:hover { box-shadow: 0 6px 16px rgba(15,23,42,.06); transform: translateY(-1px); }
        .kpi-bar { width: 4px; flex-shrink: 0; }
        .kpi-body { flex: 1; padding: 12px 14px; min-width: 0; }
        .kpi-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .kpi-icon { width: 26px; height: 26px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .kpi-label { font-size: 11px; font-weight: 700; color: var(--text-muted); letter-spacing: .04em; text-transform: uppercase; }
        .kpi-value { font-size: 22px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.1; }
        .kpi-sub { font-size: 11px; color: var(--text-faint); margin-top: 4px; font-weight: 500; }

        .client-row { display: grid; grid-template-columns: 32px 1.5fr 1.3fr 1.1fr 1.1fr 1fr 1fr 1fr 64px 40px; gap: 12px; padding: 12px; align-items: center; }
        .client-body { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; margin: 0 8px; transition: background .15s, box-shadow .15s, border-color .15s; }
        .client-body:hover { box-shadow: 0 2px 10px rgba(15,23,42,.06); border-color: var(--border-strong); }
        .client-pinned { background: #E3F3E5 !important; border-color: #16A872 !important; box-shadow: 0 1px 2px rgba(22,168,114,.12); }
        .client-pinned:hover { background: #E3F3E5 !important; border-color: #16A872 !important; box-shadow: 0 4px 14px rgba(22,168,114,.18); }
        .client-head { background: var(--surface-2); font-size: 11px; font-weight: 600; color: var(--text-muted); padding: 12px; margin: 0 8px; border-bottom: 1px solid var(--border); border-left: 2px solid transparent; }
        .client-head .client-cell { align-items: flex-start; text-align: left; }
        .client-head .client-cell-orders, .client-head .client-cell-toggle, .client-head .client-cell-actions { justify-content: flex-start; }
        .client-cell { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
        .client-cell-name { display: flex; flex-direction: row; gap: 10px; align-items: center; }
        .client-name { font-weight: 600; font-size: var(--type-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .client-city { font-size: 11px; color: var(--text-faint); display: flex; align-items: center; gap: 4px; }
        .client-cell-actions { display: flex; justify-content: flex-end; }
        .client-cell-toggle { align-items: center; flex-direction: row; justify-content: center; }
        .client-cell-orders { align-items: center; justify-content: center; flex-direction: row; }
        .client-seg { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 999px; align-self: flex-start; letter-spacing: .02em; text-transform: uppercase; }

        .pill-stat { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 700; letter-spacing: .04em; }
        .pill-sales { background: color-mix(in oklab, #10b981 14%, white); color: #047857; border: 1px solid color-mix(in oklab, #10b981 30%, transparent); }
        .pill-orders { background: color-mix(in oklab, #0ea5e9 14%, white); color: #0369a1; border: 1px solid color-mix(in oklab, #0ea5e9 30%, transparent); }
        .pill-l { letter-spacing: .06em; }
        .pill-n { font-weight: 800; padding-left: 2px; font-variant-numeric: tabular-nums; }

        .value-pair { display: flex; align-items: baseline; gap: 6px; }

        .client-toggle { width: 40px; height: 22px; border-radius: 999px; border: none; padding: 2px; cursor: pointer; display: inline-flex; align-items: center; transition: background .15s; flex-shrink: 0; }
        .client-toggle.on  { background: #10b981; justify-content: flex-end; }
        .client-toggle.off { background: #cbd5e1; justify-content: flex-start; }
        .client-toggle-knob { width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.18); transition: transform .18s ease; }

        .client-status-pills { position: relative; display: inline-flex; background: var(--surface-2); border: 1px solid var(--border); border-radius: 999px; padding: 3px; gap: 2px; }
        .client-status-thumb { position: absolute; top: 3px; bottom: 3px; left: 0; background: #E5F6ED; border-radius: 999px; transition: transform .28s cubic-bezier(.4,0,.2,1), width .28s cubic-bezier(.4,0,.2,1); z-index: 0; pointer-events: none; box-shadow: inset 0 0 0 1px color-mix(in oklab, #10b981 22%, transparent); }
        .client-status-pills button { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 5px; padding: 4px 11px; border-radius: 999px; border: none; background: transparent; color: var(--text-muted); font-size: 11px; font-weight: 600; cursor: pointer; transition: color .2s ease; }
        .client-status-pills button:hover { color: var(--text); }
        .client-status-pills button.on { color: #047857; }
        .client-status-pills .dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }

        .client-fcat { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .04em; margin-bottom: 6px; }
        .client-fblock { min-width: 0; }
        .client-fchips { display: flex; flex-wrap: wrap; gap: 4px; }
        .client-filter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px 18px; }
        .client-scroll::-webkit-scrollbar { width: 8px; }
        .client-scroll::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 4px; }
        .client-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>);
  }

  window.AdminClients = AdminClients;
  window.NewClientFicha = NewClientDrawer;
})();