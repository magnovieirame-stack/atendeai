// leads.jsx — Leads list page (modeled after the reference design)

(function () {
  // Enrich base LEADS with extra mock fields for the rich list
  const TAGS_POOL = [
  { name: 'Inbouding', color: '#10b981' },
  { name: 'Funil Formul.', color: '#0ea5e9' },
  { name: 'Atendimento...', color: '#a855f7' },
  { name: 'Isca: aula gr...', color: '#f59e0b' },
  { name: 'Isca: estudo ...', color: '#f43f5e' }];

  const STAGES_LABEL = {
    novo: { label: 'Novo', color: '#7c3aed' },
    contatado: { label: 'Contatado', color: '#3b82f6' },
    qualificado: { label: 'Qualificado', color: '#f59e0b' },
    proposta: { label: 'Proposta', color: '#14b8a6' },
    negociacao: { label: 'Negociação', color: '#8b5cf6' },
    perdido: { label: 'Perdido', color: '#ef4444' }
  };

  const ATTENDANTS = ['Karla Zambelly', 'Magno Vieira', 'Paulo Henrique', 'Francisco Junior', 'Agente IA', '—'];
  const AVATAR_BG = ['#fde68a', '#fbcfe8', '#bfdbfe', '#bbf7d0', '#e9d5ff', '#fed7aa', '#fecaca'];

  // 20 mocked leads
  const MOCK_LEADS = [
    { name: 'Airton Silva',       company: 'Joalheria Mimi Deus',     phone: '(85) 9 9870-5043', value: 3890,  source: 'Instagram',  date: '20/06/2026', stage: 'novo' },
    { name: 'Patrícia Furtado',   company: 'Cristal Forma',           phone: '(85) 9 9863-2754', value: 5500,  source: 'Indicação',  date: '19/06/2026', stage: 'contatado' },
    { name: 'Carlos Endwer',      company: 'Endwer Construções',      phone: '(85) 9 9821-4476', value: 12800, source: 'WhatsApp',   date: '19/06/2026', stage: 'qualificado' },
    { name: 'Sara Pereira',       company: 'Fre Damião',              phone: '(88) 9 2143-8549', value: 3890,  source: 'Instagram',  date: '18/06/2026', stage: 'novo' },
    { name: 'Júlia Mendes',       company: 'Estética Júlia',          phone: '(85) 9 9912-3344', value: 7400,  source: 'Google',     date: '18/06/2026', stage: 'proposta' },
    { name: 'Roberto Lima',       company: 'Lima Advocacia',          phone: '(85) 9 9745-2210', value: 15600, source: 'Site',       date: '17/06/2026', stage: 'negociacao' },
    { name: 'Fátima Coelho',      company: 'Coelho Modas',            phone: '(85) 9 9614-7723', value: 4200,  source: 'Facebook',   date: '17/06/2026', stage: 'contatado' },
    { name: 'Karla Cavalcante',   company: 'Emabrest',                phone: '(88) 9 8170-0005', value: 5500,  source: 'Indicação',  date: '16/06/2026', stage: 'qualificado' },
    { name: 'Matheus Gestor',     company: 'Inova Fit',               phone: '(88) 9 8753-9176', value: 3890,  source: 'WhatsApp',   date: '16/06/2026', stage: 'novo' },
    { name: 'Thaís Aragão',       company: 'Planeta Calçados',        phone: '(88) 9 9739-1900', value: 3890,  source: 'Instagram',  date: '15/06/2026', stage: 'proposta' },
    { name: 'Sueline Barros',     company: 'Escola Modelo',           phone: '(88) 9 5391-1822', value: 6750,  source: 'Site',       date: '15/06/2026', stage: 'qualificado' },
    { name: 'Wilemson Pinto',     company: 'Óticas Morais',           phone: '(88) 9 8451-5076', value: 3890,  source: 'Google',     date: '14/06/2026', stage: 'contatado' },
    { name: 'Ricardo Daniel',     company: 'Duft Solar',              phone: '(88) 9 8713-2876', value: 8900,  source: 'Indicação',  date: '14/06/2026', stage: 'negociacao' },
    { name: 'Francisco Aguiar',   company: 'Biofarma Iblatu',         phone: '(88) 9 9870-8246', value: 4500,  source: 'WhatsApp',   date: '13/06/2026', stage: 'qualificado' },
    { name: 'Iany Maia',          company: 'Casa das Lentes',         phone: '(88) 9 9826-5497', value: 3890,  source: 'Facebook',   date: '13/06/2026', stage: 'proposta' },
    { name: 'Alex Soares',        company: 'Construma',               phone: '(88) 9 8724-8113', value: 11200, source: 'Site',       date: '12/06/2026', stage: 'negociacao' },
    { name: 'Jefferson Castro',   company: 'Casa das Lentes',         phone: '(88) 9 8015-3339', value: 3890,  source: 'Indicação',  date: '12/06/2026', stage: 'qualificado' },
    { name: 'Bruno Aragão',       company: 'Aragão Imóveis',          phone: '(85) 9 9847-1126', value: 18900, source: 'Google',     date: '11/06/2026', stage: 'negociacao' },
    { name: 'Letícia Maranhão',   company: 'Studio Letícia',          phone: '(85) 9 9512-3870', value: 4980,  source: 'Instagram',  date: '11/06/2026', stage: 'contatado' },
    { name: 'Pedro Mafra',        company: 'Mafra Distribuidora',     phone: '(85) 9 9760-4421', value: 22300, source: 'WhatsApp',   date: '10/06/2026', stage: 'novo' }
  ];

  function enrichLead(l, i) {
    const initial = (l.name || '?')[0].toUpperCase();
    const colorIdx = (l.name || '').length % AVATAR_BG.length;
    const tags = Array.isArray(l.tags) ? l.tags : [];
    const email = l.email || `${(l.name || 'lead').toLowerCase().split(' ')[0].normalize('NFD').replace(/[\u0300-\u036f]/g, '')}@email.com`;
    const dur = ['18 min', '34 min', '1h 12min', '52 min', '8 min', '2h 04min', '12 min'][i % 7];
    const hh = String((7 + i * 3) % 24).padStart(2, '0');
    const mm = String(i * 7 % 60).padStart(2, '0');
    const timeStr = `${hh}h${mm}min`;
    // Spread attendants — every 3rd lead handled by Agente IA
    const attendant = l.attendant || (i % 3 === 0 ? 'Agente IA' : ATTENDANTS[i % (ATTENDANTS.length - 2)]);
    return {
      id: 'l' + i,
      ...l,
      avatarBg: AVATAR_BG[colorIdx],
      initial,
      email,
      tags,
      ticket: l.value,
      total: l.value,
      attendant,
      duration: dur,
      time: timeStr
    };
  }

  function buildLeads() {
    return MOCK_LEADS.map((l, i) => enrichLead(l, i));
  }

  function fmtBRL(v) {
    return 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Filter panel — column visibility + quick filters
  const ALL_COLUMNS = [
  { id: 'nome', label: 'Nome', required: true },
  { id: 'contatos', label: 'Contatos' },
  { id: 'tags', label: 'Tags' },
  { id: 'dados', label: 'Dados (Total e fase do funil)' },
  { id: 'atendente', label: 'Atendente' },
  { id: 'data', label: 'Data de criação' },
  { id: 'duracao', label: 'Duração' }];


  function AdminLeads() {
    const { setRoute, auth } = useStore();
    const [query, setQuery] = React.useState('');
    const [showFilters, setShowFilters] = React.useState(false);
    const [showNew, setShowNew] = React.useState(false);
    const [showImport, setShowImport] = React.useState(false);
    const [selected, setSelected] = React.useState(new Set());
    // Leads via cache por empresa (api.jsx): revisita instantânea + revalida no fundo.
    const { data: allLeads, setData: setAllLeads, loading: leadsLoading } = useCachedQuery(
      ['leads'],
      async () => {
        let list;
        try { const r = await API.getLeads(); list = (r.leads || []).map((l, i) => enrichLead(l, i)); }
        catch (e) { list = []; } // erro -> lista vazia (igual ao .catch antigo)
        if (list.length && typeof skelRemember === 'function') skelRemember('leads', list.length);
        return list;
      },
      { empresaId: auth.empresaId, initialData: [] },
    );
    const loaded = !leadsLoading;
    const [visibleCols, setVisibleCols] = React.useState(() => new Set(ALL_COLUMNS.map((c) => c.id)));
    const [filterStages, setFilterStages] = React.useState(() => new Set());
    const [filterTags, setFilterTags] = React.useState(() => new Set());
    const [filterAttendants, setFilterAttendants] = React.useState(() => new Set());
    const [openMenuId, setOpenMenuId] = React.useState(null);
    const [pinnedIds, setPinnedIds] = React.useState(() => new Set());
    const [apptFor, setApptFor] = React.useState(null);
    const [pdvFor, setPdvFor] = React.useState(null);
    const [confirmDelete, setConfirmDelete] = React.useState(null);
    const [viewLead, setViewLead] = React.useState(null);

    const togglePin = (id) => {
      const s = new Set(pinnedIds);
      if (s.has(id)) s.delete(id); else s.add(id);
      setPinnedIds(s);
    };
    const deleteLead = (id) => {
      API.deleteLead(id).then(() => { window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Lead excluído' }); }).catch((e) => { window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao excluir lead', descricao: (e && e.message) || 'Tente novamente.' }); });
      setAllLeads((prev) => prev.filter((l) => l.id !== id));
      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
      setPinnedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      setConfirmDelete(null);
    };
    const handleOpenChat = (lead) => {
      setOpenMenuId(null);
      setRoute('inbox', { name: lead.name, phone: lead.phone, email: lead.email, company: lead.company });
    };

    const toggleSetVal = (setter, val) => {
      setter((prev) => {
        const next = new Set(prev);
        if (next.has(val)) next.delete(val); else next.add(val);
        return next;
      });
    };

    const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const digits = (s) => (s || '').replace(/\D/g, '');
    const filtered = React.useMemo(() => {
      const q = norm(query.trim());
      const dq = digits(query.trim());
      const base = allLeads.filter((l) => {
        if (q) {
          const inName = norm(l.name).includes(q);
          const inCompany = norm(l.company || '').includes(q);
          const inEmail = norm(l.email).includes(q);
          const inPhone = dq.length >= 3 && digits(l.phone).includes(dq);
          if (!inName && !inCompany && !inEmail && !inPhone) return false;
        }
        if (filterStages.size > 0 && !filterStages.has(l.stage)) return false;
        if (filterAttendants.size > 0 && !filterAttendants.has(l.attendant)) return false;
        if (filterTags.size > 0) {
          const hasTag = l.tags.some((t) => filterTags.has(t.name));
          if (!hasTag) return false;
        }
        return true;
      });
      // Pinned leads first
      return [...base].sort((a, b) => (pinnedIds.has(b.id) ? 1 : 0) - (pinnedIds.has(a.id) ? 1 : 0));
    }, [allLeads, query, filterStages, filterAttendants, filterTags, pinnedIds]);

    const toggleAll = () => {
      if (selected.size === filtered.length) setSelected(new Set()); else
      setSelected(new Set(filtered.map((l) => l.id)));
    };
    const toggleOne = (id) => {
      const s = new Set(selected);
      if (s.has(id)) s.delete(id); else s.add(id);
      setSelected(s);
    };

    const activeFilters = filterStages.size + filterTags.size + filterAttendants.size;
    const clearFilters = () => { setFilterStages(new Set()); setFilterTags(new Set()); setFilterAttendants(new Set()); };

    const colVisible = (id) => visibleCols.has(id);

    return (
      <Page
        title="Leads"
        subtitle="Consulte, crie, modifique ou remova seus leads"
        actions={
        <FabNovo size="sm" label="Novo Lead" onClick={() => setShowNew(true)} />
        }>

        <LeadStyles />

        {/* Toolbar */}
        <div className="card" style={{ padding: 12 }}>
          <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: 220, maxWidth: 360 }}>
              <Ic name="search" size={13} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }} />
              <input className="input" placeholder="Pesquisar nome, empresa, e-mail ou telefone..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ paddingLeft: 40, width: '100%' }} />
              {query &&
                <button onClick={() => setQuery('')} className="btn btn-ghost btn-icon" style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 26, height: 26 }} title="Limpar">
                  <Ic name="x" size={12} />
                </button>}
            </div>
            <span className="muted" style={{ fontSize: 'var(--type-sm)', display: 'inline-flex', alignItems: 'center', lineHeight: 1, whiteSpace: 'nowrap' }}>
              {filtered.length.toLocaleString('pt-BR')} resultado{filtered.length === 1 ? '' : 's'}
            </span>
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

              <div className="lead-filter-grid">
                {/* Status (funil) */}
                <div className="lead-fblock">
                  <div className="lead-fcat">Status (funil)</div>
                  <div className="lead-fchips">
                    {Object.entries(STAGES_LABEL).map(([id, s]) => {
                      const on = filterStages.has(id);
                      return (
                        <span key={id} onClick={() => toggleSetVal(setFilterStages, id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, border: `1px solid ${on ? s.color : 'var(--border)'}`, background: on ? `color-mix(in oklab, ${s.color} 16%, white)` : 'var(--surface)', color: on ? s.color : 'var(--text-muted)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />{s.label}
                        </span>);
                    })}
                  </div>
                </div>

                {/* Tags */}
                <div className="lead-fblock">
                  <div className="lead-fcat">Tags</div>
                  <div className="lead-fchips">
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
                <div className="lead-fblock">
                  <div className="lead-fcat">Atendente</div>
                  <div className="lead-fchips">
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

                {/* Columns visibility */}
                <div className="lead-fblock">
                  <div className="lead-fcat">Colunas visíveis</div>
                  <div className="lead-fchips">
                    {ALL_COLUMNS.map((c) => {
                      const on = visibleCols.has(c.id);
                      const disabled = c.required;
                      return (
                        <span key={c.id}
                          onClick={() => {
                            if (disabled) return;
                            const next = new Set(visibleCols);
                            if (next.has(c.id)) next.delete(c.id); else next.add(c.id);
                            setVisibleCols(next);
                          }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--accent-soft)' : 'var(--surface)', color: disabled ? 'var(--text-faint)' : on ? 'var(--accent-700)' : 'var(--text-muted)', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 600 }}>
                          <Ic name={on ? 'check' : 'plus'} size={10} />{c.label.replace(' (Total e fase do funil)', '')}
                        </span>);
                    })}
                  </div>
                </div>
              </div>
            </div>}
        </div>

        {/* Table */}
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="lead-row lead-head">
            <div className="lead-cell lead-cell-check">
              <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
            </div>
            {colVisible('nome') && <div className="lead-cell lead-cell-name">Nome</div>}
            {colVisible('contatos') && <div className="lead-cell lead-cell-contacts">Contatos</div>}
            {colVisible('tags') && <div className="lead-cell lead-cell-tags">Tags</div>}
            {colVisible('dados') && <div className="lead-cell lead-cell-data">Total / Funil</div>}
            {colVisible('atendente') && <div className="lead-cell lead-cell-att">Atendente</div>}
            {colVisible('data') && <div className="lead-cell lead-cell-date">Data de criação</div>}
            {colVisible('duracao') && <div className="lead-cell lead-cell-dur">Duração</div>}
            <div className="lead-cell lead-cell-actions"></div>
          </div>

          <div className="lead-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 0', background: 'var(--surface-2)' }}>
            {!loaded ?
              Array.from({ length: skelCount('leads', 3) }).map((_, i) =>
                <div key={'sk' + i} className="lead-row lead-body" style={{ pointerEvents: 'none' }}>
                  <div className="lead-cell lead-cell-check"><Skeleton w={14} h={14} r={4} /></div>
                  {colVisible('nome') &&
                    <div className="lead-cell lead-cell-name">
                      <Skeleton circle w={30} h={30} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <Skeleton w="70%" h={12} /><Skeleton w="45%" h={9} style={{ marginTop: 5 }} />
                      </div>
                    </div>}
                  {colVisible('contatos') &&
                    <div className="lead-cell lead-cell-contacts"><Skeleton w="80%" h={11} /><Skeleton w="90%" h={11} style={{ marginTop: 5 }} /></div>}
                  {colVisible('tags') &&
                    <div className="lead-cell lead-cell-tags"><Skeleton w={64} h={18} r={999} /></div>}
                  {colVisible('dados') &&
                    <div className="lead-cell lead-cell-data"><Skeleton w="60%" h={13} /><Skeleton w={70} h={18} r={999} style={{ marginTop: 5 }} /></div>}
                  {colVisible('atendente') &&
                    <div className="lead-cell lead-cell-att"><div className="row" style={{ gap: 6 }}><Skeleton circle w={26} h={26} /><Skeleton w="55%" h={11} /></div></div>}
                  {colVisible('data') &&
                    <div className="lead-cell lead-cell-date"><Skeleton w="70%" h={11} /><Skeleton w="50%" h={9} style={{ marginTop: 5 }} /></div>}
                  {colVisible('duracao') &&
                    <div className="lead-cell lead-cell-dur"><Skeleton w="60%" h={11} /></div>}
                  <div className="lead-cell lead-cell-actions"><Skeleton w={32} h={32} r={8} /></div>
                </div>) :
            filtered.length === 0 ?
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-faint)', background: 'var(--surface)' }}>
                <Ic name="leads" size={36} style={{ opacity: .4 }} />
                <div style={{ marginTop: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Nenhum lead encontrado</div>
                <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>Ajuste os filtros ou crie um novo lead.</div>
              </div> :

              filtered.map((l) => {
                const stage = STAGES_LABEL[l.stage] || { label: l.stage, color: '#94a3b8' };
                const checked = selected.has(l.id);
                const isAI = l.attendant === 'Agente IA';
                return (
                  <div key={l.id} className={`lead-row lead-body${pinnedIds.has(l.id) ? ' lead-pinned' : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setViewLead(l)}>
                    <div className="lead-cell lead-cell-check" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={checked} onChange={() => toggleOne(l.id)} />
                    </div>
                    {colVisible('nome') &&
                      <div className="lead-cell lead-cell-name">
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: l.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 'var(--type-sm)', color: 'var(--text)', flexShrink: 0 }}>{l.initial}</div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="lead-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</span>
                            {l.fonte === 'chatbot' &&
                              <span title={`Lead do chatbot · ${l.source || 'Chatbot'}`} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 7px', borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent-700)', fontSize: 10, fontWeight: 700 }}>
                                <Ic name="chat" size={9} />{l.source || 'Chatbot'}
                              </span>}
                          </div>
                          <div className="lead-sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.company || '—'}</div>
                        </div>
                      </div>}

                    {colVisible('contatos') &&
                      <div className="lead-cell lead-cell-contacts">
                        <div className="row" style={{ gap: 4, color: 'var(--text-muted)', fontSize: 'var(--type-sm)' }}>
                          <Ic name="phone" size={11} />{l.phone}
                        </div>
                        <div className="row" style={{ gap: 4, color: 'var(--text-muted)', fontSize: 'var(--type-sm)' }}>
                          <Ic name="mail" size={11} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.email}</span>
                        </div>
                      </div>}

                    {colVisible('tags') &&
                      <div className="lead-cell lead-cell-tags">
                        <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
                          {l.tags.map((t, i) =>
                            <span key={i} style={{ padding: '3px 8px', borderRadius: 999, background: `color-mix(in oklab, ${t.color} 16%, white)`, color: t.color, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{t.name}</span>)}
                        </div>
                      </div>}

                    {colVisible('dados') &&
                      <div className="lead-cell lead-cell-data">
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="muted" style={{ fontSize: 10 }}>Total</span>
                          <span className="tnum" style={{ fontSize: 'var(--type-sm)', fontWeight: 700 }}>{fmtBRL(l.total)}</span>
                        </div>
                        <span style={{ alignSelf: 'flex-start', padding: '3px 10px', borderRadius: 999, background: `color-mix(in oklab, ${stage.color} 16%, white)`, color: stage.color, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {stage.label}
                        </span>
                      </div>}

                    {colVisible('atendente') &&
                      <div className="lead-cell lead-cell-att">
                        <div className="row" style={{ gap: 6, fontSize: 'var(--type-sm)' }}>
                          {isAI ?
                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--ai-soft)', color: 'var(--ai-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Ic name="sparkles" size={12} />
                            </div> :
                            l.attendant !== '—' && <Avatar name={l.attendant} size="sm" />}
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isAI ? 'var(--ai-strong)' : 'var(--text-muted)', fontWeight: isAI ? 600 : 500 }}>{l.attendant}</span>
                        </div>
                      </div>}

                    {colVisible('data') &&
                      <div className="lead-cell lead-cell-date">
                        <span className="tnum" style={{ fontSize: 'var(--type-sm)', color: 'var(--text)', fontWeight: 500 }}>{l.date}</span>
                        <span className="tnum muted" style={{ fontSize: 11 }}>{l.time}</span>
                      </div>}

                    {colVisible('duracao') &&
                      <div className="lead-cell lead-cell-dur">
                        <span className="row" style={{ gap: 4, color: 'var(--text-muted)', fontSize: 'var(--type-sm)' }}>
                          <Ic name="clock" size={11} />{l.duration}
                        </span>
                      </div>}

                    <div className="lead-cell lead-cell-actions" style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                      <LeadRowMenu
                        pinned={pinnedIds.has(l.id)}
                        onChat={() => handleOpenChat(l)}
                        onPdv={() => setPdvFor(l)}
                        onPin={() => togglePin(l.id)}
                        onAppointment={() => setApptFor(l)}
                        onDelete={() => l.fonte === 'chatbot'
                          ? (window.showToast && window.showToast({ tipo: 'info', titulo: 'Lead do chatbot', descricao: 'Veio de uma conversa — gerencie pelo Chatbot/Inbox.' }))
                          : setConfirmDelete(l)} />
                    </div>
                  </div>);
              })}
          </div>
        </div>

        {showNew && <NewLeadDrawer onClose={() => setShowNew(false)} onSave={async (l) => { setShowNew(false); try { const r = await API.createLead(l); setAllLeads((p) => [enrichLead(r.lead, 0), ...p]); window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Lead criado', descricao: l.name }); } catch (e) { window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao criar lead', descricao: (e && e.message) || 'Tente novamente.' }); } }} />}
        {viewLead && window.CRMCardDetail && <window.CRMCardDetail
          card={{
            name: viewLead.name,
            company: viewLead.company || '—',
            email: viewLead.email,
            phone: viewLead.phone,
            value: viewLead.total,
            tags: (viewLead.tags || []).map((t) => ({ label: t.name, color: t.color }))
          }}
          onClose={() => setViewLead(null)} />}
        {showImport && <ImportLeadsDrawer onClose={() => setShowImport(false)} />}
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
          <Modal title="Excluir lead" onClose={() => setConfirmDelete(null)} size="sm"
            footer={(close) => <>
              <div style={{ flex: 1 }} />
              <button className="btn fin-btn-back" onClick={() => close()}>Voltar</button>
              <button className="btn btn-delete" onClick={() => close(() => deleteLead(confirmDelete.id))}>
                <Ic name="trash" size={13} /> Excluir
              </button>
            </>}>
            <div style={{ display: 'flex', gap: 12, padding: '6px 4px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'color-mix(in oklab, #dc2626 12%, white)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Ic name="trash" size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>Excluir o lead {confirmDelete.name}?</div>
                <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>Esta ação não pode ser desfeita. O histórico de conversas permanecerá no sistema.</div>
              </div>
            </div>
          </Modal>}
      </Page>);
  }

  function LeadRowMenu({ pinned, onChat, onPdv, onPin, onAppointment, onDelete }) {
    const [open, setOpen] = React.useState(false);
    const [pos, setPos] = React.useState(null);
    const btnRef = React.useRef(null);
    const openMenu = (e) => {
      e.stopPropagation();
      const r = btnRef.current.getBoundingClientRect();
      const MENU_W = 190;
      const left = Math.min(r.left, window.innerWidth - MENU_W - 12);
      setPos({ top: r.bottom + 2, left: Math.max(12, left) });
      setOpen((o) => !o);
    };
    React.useEffect(() => {
      if (!open) return;
      const close = () => setOpen(false);
      window.addEventListener('click', close);
      window.addEventListener('resize', close);
      window.addEventListener('scroll', close, true);
      return () => {
        window.removeEventListener('click', close);
        window.removeEventListener('resize', close);
        window.removeEventListener('scroll', close, true);
      };
    }, [open]);
    const run = (fn) => (e) => { e.stopPropagation(); setOpen(false); fn(); };
    return (
      <>
        <button ref={btnRef} className={'sale-iconbtn' + (open ? ' on' : '')} title="Ações" onClick={openMenu} style={{ width: 32, height: 32 }}>
          <Ic name="more" size={18} />
        </button>
        {open && pos && ReactDOM.createPortal(
          <div className="sale-menu" style={{ top: pos.top, left: pos.left }} onClick={(e) => e.stopPropagation()}>
            <button className="sale-menu-item" onClick={run(onChat)}><Ic name="chat" size={15} /> Bate Papo</button>
            <button className="sale-menu-item" onClick={run(onPdv)}><Ic name="cart" size={15} /> PDV de Venda</button>
            <button className="sale-menu-item" onClick={run(onPin)}><Ic name={pinned ? 'pin-off' : 'pin'} size={15} /> {pinned ? 'Desafixar' : 'Fixar'}</button>
            <button className="sale-menu-item" onClick={run(onAppointment)}><Ic name="agenda" size={15} /> Agendamento</button>
            <div className="sale-menu-sep" />
            <button className="sale-menu-item danger" onClick={run(onDelete)}><Ic name="trash" size={15} /> Excluir</button>
          </div>,
          document.body)
        }
      </>);
  }

  function NewLeadDrawer({ onClose, onSave }) {
    const [f, setF] = React.useState({ name: '', phone: '', email: '', company: '', value: 0, source: 'Instagram', stage: 'novo', date: new Date().toLocaleDateString('pt-BR'), attendant: ATTENDANTS[0], obs: '' });
    const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
    const valid = f.name.trim().length >= 2;
    return (
      <Drawer title="Novo Lead" subtitle="Cadastre uma nova oportunidade no funil" onClose={onClose} width="50vw"
      footer={(close) => <>
          <div style={{ flex: 1 }} />
          <ActionButton action="salvar" size="md" label="Criar lead" disabled={!valid} style={{ opacity: valid ? 1 : .5 }} onClick={() => close(() => onSave(f))} />
        </>}>
        <div className="tpc-flat">
          <div className="fin-section-title">IDENTIFICAÇÃO</div>
          <div className="fin-section">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label className="label">Nome *</label><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex: Mariana Sousa" /></div>
              <div><label className="label">Empresa</label><input className="input" value={f.company} onChange={(e) => set('company', e.target.value)} /></div>
            </div>
          </div>

          <div className="fin-section-title">CONTATO</div>
          <div className="fin-section">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label className="label">Telefone</label><PhoneInput value={f.phone} onChange={(v) => set('phone', v)} /></div>
              <div><label className="label">E-mail</label><EmailInput value={f.email} onChange={(v) => set('email', v)} /></div>
            </div>
          </div>

          <div className="fin-section-title">COMERCIAL</div>
          <div className="fin-section">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label className="label">Valor estimado (R$)</label><input className="input" type="number" value={f.value} onChange={(e) => set('value', Number(e.target.value) || 0)} /></div>
              <div><label className="label">Origem</label><select className="input" value={f.source} onChange={(e) => set('source', e.target.value)}><option>Instagram</option><option>WhatsApp</option><option>Facebook</option><option>Google</option><option>Indicação</option><option>Site</option></select></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="label">Status inicial</label>
                <select className="input" value={f.stage} onChange={(e) => set('stage', e.target.value)}>
                  {Object.entries(STAGES_LABEL).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}
                </select>
              </div>
              <div><label className="label">Atendente</label><select className="input" value={f.attendant} onChange={(e) => set('attendant', e.target.value)}>{ATTENDANTS.filter((a) => a !== '—').map((a) => <option key={a} value={a}>{a}</option>)}</select></div>
            </div>
          </div>

          <div className="fin-section-title">OBSERVAÇÕES</div>
          <div className="fin-section">
            <div><label className="label">Observações</label><textarea className="input" rows={3} value={f.obs} onChange={(e) => set('obs', e.target.value)} /></div>
          </div>
        </div>
      </Drawer>);
  }

  function ImportLeadsDrawer({ onClose }) {
    return (
      <Drawer title="Importar Leads" subtitle="Importe leads de uma planilha (CSV/XLSX)" onClose={onClose} width="40vw"
      footer={<><div style={{ flex: 1 }} /><ActionButton action="salvar" size="md" label="Importar" icon="upload" onClick={() => { window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Leads importados' }); onClose(); }} /></>}>
        <div className="col" style={{ gap: 14 }}>
          <div style={{ padding: 24, border: '2px dashed var(--border-strong)', borderRadius: 12, textAlign: 'center', background: 'var(--surface-2)' }}>
            <Ic name="upload" size={28} style={{ color: 'var(--text-faint)' }} />
            <div style={{ marginTop: 8, fontWeight: 700 }}>Arraste seu arquivo aqui</div>
            <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>ou clique para selecionar (CSV, XLSX até 10MB)</div>
            <button className="btn" style={{ marginTop: 12 }}><Ic name="upload" size={13} /> Selecionar arquivo</button>
          </div>
          <div style={{ padding: 14, background: 'var(--accent-soft)', borderRadius: 10, fontSize: 'var(--type-sm)', color: 'var(--accent-700)' }}>
            <div className="row" style={{ gap: 8 }}><Ic name="info" size={14} /><strong>Campos esperados:</strong></div>
            <div style={{ marginTop: 6 }}>Nome, telefone, e-mail, empresa, origem, valor, status. <a href="#" style={{ color: 'inherit', textDecoration: 'underline' }}>Baixar modelo</a></div>
          </div>
        </div>
      </Drawer>);
  }

  function LeadStyles() {
    return (
      <style>{`
        .lead-row { display: grid; grid-template-columns: 36px 1.6fr 1.4fr 1.2fr 1.4fr 1fr 1.2fr .8fr 40px; gap: 14px; padding: 10px 16px; align-items: center; }
        .lead-body { background: var(--surface); border: 1px solid var(--border); border-left-width: 2px; border-radius: 10px; margin: 0 8px; transition: background .15s, box-shadow .15s, transform .15s, border-color .15s; }
        .lead-body:hover { background: var(--surface); box-shadow: 0 2px 10px rgba(15,23,42,.06); border-color: var(--border-strong); }
        .lead-pinned { background: #E3F3E5 !important; border-color: #16A872 !important; box-shadow: 0 1px 2px rgba(22,168,114,.12); }
        .lead-pinned:hover { background: #E3F3E5 !important; border-color: #16A872 !important; box-shadow: 0 4px 14px rgba(22,168,114,.18); }
        .lead-head { background: var(--surface-2); font-size: 11px; font-weight: 600; color: var(--text-muted); padding: 10px 16px; border-bottom: 1px solid var(--border); }
        .lead-cell { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .lead-cell-name { display: flex; flex-direction: row; gap: 10px; align-items: center; }
        .lead-name { font-weight: 600; font-size: var(--type-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .lead-sub { font-size: 11px; color: var(--text-faint); }
        .lead-cell-actions { display: flex; justify-content: flex-end; }
        .lead-mini { display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .lead-fcat { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .04em; margin-bottom: 6px; }
        .lead-fblock { min-width: 0; }
        .lead-fchips { display: flex; flex-wrap: wrap; gap: 4px; }
        .lead-filter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px 18px; }
        .lead-scroll::-webkit-scrollbar { width: 8px; }
        .lead-scroll::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 4px; }
        .lead-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>);
  }

  window.AdminLeads = AdminLeads;
})();
