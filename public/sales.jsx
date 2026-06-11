// sales.jsx — Página de Vendas (lista no padrão de Catálogo/Clientes/Leads)

(function () {
  const fmtBRL = (v) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtInt = (v) => Number(v || 0).toLocaleString('pt-BR');

  // Deterministic real-photo avatar per client name (randomuser.me static portraits).
  const avatarUrl = (name) => {
    const str = String(name || '');
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = (h * 31 + str.charCodeAt(i)) >>> 0; }
    const gender = (h & 1) ? 'men' : 'women';
    const idx = h % 100;
    return `https://randomuser.me/api/portraits/${gender}/${idx}.jpg`;
  };

  const PAY_METHODS = {
    'PIX': { color: '#10b981', icon: 'zap' },
    'Cartão Crédito': { color: '#6366f1', icon: 'wallet' },
    'Cartão Débito': { color: '#0ea5e9', icon: 'wallet' },
    'Boleto': { color: '#f59e0b', icon: 'file-text' },
    'Dinheiro': { color: '#22c55e', icon: 'coins' },
    'Transferência': { color: '#06b6d4', icon: 'bank' }
  };

  const SELLERS = ['Karla Zambelly', 'Magno Vieira', 'Paulo Henrique', 'Francisco Junior', 'Larissa Souza', 'Daniel Costa', 'Agente IA'];
  const LOJAS = ['Ótica Scalloop – Iguatu', 'Loja Centro · Fortaleza', 'Filial Sobral', 'E-commerce', 'Quiosque Shopping Aldeota', 'Filial Crato'];

  // ─── Floating row-action menu (3-dot popover) ───────────────────────────
  function SaleRowMenu({ isCanc, onPrint, onCancel }) {
    const [open, setOpen] = React.useState(false);
    const [pos, setPos] = React.useState(null);
    const btnRef = React.useRef(null);
    const openMenu = (e) => {
      e.stopPropagation();
      const r = btnRef.current.getBoundingClientRect();
      const MENU_W = 190;
      // Right-align: the menu's right edge sits under the button's right edge.
      const left = Math.min(r.right - MENU_W, window.innerWidth - MENU_W - 12);
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
    const run = (fn, disabled) => (e) => {e.stopPropagation();if (disabled) return;setOpen(false);fn();};
    return (
      <>
        <button ref={btnRef} className={'sale-iconbtn' + (open ? ' on' : '')} title="Ações" onClick={openMenu} style={{ width: "36px", height: "36px" }}>
          <Ic name="more-vert" size={18} />
        </button>
        {open && pos && ReactDOM.createPortal(
          <div className="sale-menu" style={{ top: pos.top, left: pos.left }} onClick={(e) => e.stopPropagation()}>
            <button className="sale-menu-item" onClick={run(onPrint)}><Ic name="file-text" size={15} /> Imprimir</button>
            <button className="sale-menu-item warn" onClick={run(onCancel, isCanc)} disabled={isCanc}><Ic name="x" size={15} /> Cancelar</button>
          </div>,
          document.body)
        }
      </>);

  }

  // DTO da API (mapVenda) -> linha que a tela de Vendas renderiza.
  // Campos que o banco ainda não tem (cidade/loja/notes) ficam vazios (degradação).
  const _METODO_LABEL = { dinheiro: 'Dinheiro', pix: 'PIX', debito: 'Cartão Débito', credito: 'Cartão Crédito', boleto: 'Boleto', carne: 'Carnê', transferencia: 'Transferência' };
  function vendaDtoToRow(v) {
    const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const d = v.criadoEm ? new Date(v.criadoEm) : null;
    let dateStr = '';
    if (d && !isNaN(d)) {
      const p = (n) => String(n).padStart(2, '0');
      dateStr = `${p(d.getDate())}/${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(-2)} - ${p(d.getHours())}h${p(d.getMinutes())}`;
    }
    const pags = Array.isArray(v.pagamentos) ? v.pagamentos : [];
    const method = pags.length > 1 ? 'Múltiplas' : (_METODO_LABEL[(pags[0] && pags[0].metodo) || ''] || (pags[0] && pags[0].metodo) || '—');
    return {
      id: v.id,
      code: v.codigo || '',
      client: v.clienteNome || '',
      cidade: '',
      loja: '',
      seller: v.vendedor || '',
      dateStr,
      dateObj: d || new Date(),
      method,
      installments: (pags[0] && pags[0].parcelas) || 1,
      items: (v.itens || []).map((i) => ({ name: i.nome, qty: i.quantidade, price: i.preco })),
      subtotal: Number(v.subtotal) || 0,
      discount: Number(v.desconto) || 0,
      value: Number(v.total) || 0,
      status: v.status || 'concluida',
      notes: '',
    };
  }

  function SalesPage() {
    const { auth } = useStore();
    const [query, setQuery] = React.useState('');
    const [showFilters, setShowFilters] = React.useState(false);
    const [filterStatus, setFilterStatus] = React.useState('all');
    const [filterMethod, setFilterMethod] = React.useState(new Set());
    const [filterSeller, setFilterSeller] = React.useState(new Set());
    const [filterStore, setFilterStore] = React.useState(new Set());
    // Vendas (lista REAL por tenant, alimentada pelo PDV) via cache por empresa.
    const { data: sales, setData: setSales, loading, reload } = useCachedQuery(
      ['vendas'],
      async () => {
        try {
          const r = await window.API.getVendas();
          return (r.vendas || []).map(vendaDtoToRow);
        } catch (e) {
          window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao carregar vendas', descricao: (e && e.message) || 'Tente novamente.' });
          throw e; // mantém estado de erro do hook (não cacheia) -> remonta tenta de novo
        }
      },
      { empresaId: auth.empresaId, initialData: [] },
    );
    const [selected, setSelected] = React.useState(new Set());
    const [viewOf, setViewOf] = React.useState(null);
    const [printOf, setPrintOf] = React.useState(null);
    const [cancelOf, setCancelOf] = React.useState(null);
    const [showPDV, setShowPDV] = React.useState(false);

    const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const filtered = React.useMemo(() => {
      const q = norm(query.trim());
      return sales.filter((s) => {
        if (q && !(norm(s.client).includes(q) || norm(s.code).includes(q) || norm(s.loja).includes(q) || norm(s.seller).includes(q))) return false;
        if (filterStatus === 'concluida' && s.status !== 'concluida') return false;
        if (filterStatus === 'cancelada' && s.status !== 'cancelada') return false;
        if (filterStatus === 'pendente' && s.status !== 'pendente') return false;
        if (filterMethod.size > 0 && !filterMethod.has(s.method)) return false;
        if (filterSeller.size > 0 && !filterSeller.has(s.seller)) return false;
        if (filterStore.size > 0 && !filterStore.has(s.loja)) return false;
        return true;
      });
    }, [sales, query, filterStatus, filterMethod, filterSeller, filterStore]);

    React.useEffect(() => { if (!loading) skelRemember('sales', filtered.length); }, [loading, filtered.length]);

    const kpis = React.useMemo(() => {
      const active = sales.filter((s) => s.status !== 'cancelada');
      const total = active.reduce((a, s) => a + s.value, 0);
      const count = active.length;
      const ticket = count > 0 ? total / count : 0;
      const days = 30;
      const daily = total / days;
      const canc = sales.filter((s) => s.status === 'cancelada').length;
      return { total, count, ticket, daily, canc };
    }, [sales]);

    const toggleSetVal = (setter, val) => setter((p) => {const n = new Set(p);if (n.has(val)) n.delete(val);else n.add(val);return n;});
    const activeFilters = filterMethod.size + filterSeller.size + filterStore.size + (filterStatus !== 'all' ? 1 : 0);
    const clearFilters = () => {setFilterMethod(new Set());setFilterSeller(new Set());setFilterStore(new Set());setFilterStatus('all');};

    const cancelSale = async (id, reason) => {
      const v = sales.find((s) => s.id === id);
      try {
        await window.API.cancelarVenda(id, reason);
        window.showToast({ tipo: 'sucesso', titulo: 'Venda cancelada', descricao: v ? 'Nº ' + v.code : '' });
        reload(); // recarrega do servidor (status, estoque e financeiro já estornados)
      } catch (e) {
        window.showToast({ tipo: 'erro', titulo: 'Erro ao cancelar', descricao: (e && e.message) || 'Tente novamente.' });
      }
    };

    const toggleAll = () => selected.size === filtered.length ? setSelected(new Set()) : setSelected(new Set(filtered.map((s) => s.id)));
    const toggleOne = (id) => {const s = new Set(selected);if (s.has(id)) s.delete(id);else s.add(id);setSelected(s);};

    return (
      <Page title="Vendas" subtitle="Histórico de vendas · faturamento, pagamento e desempenho da equipe"
      actions={
      <FabNovo size="sm" label="Nova venda" onClick={() => setShowPDV(true)} />
      }>

        <SalesStyles />

        {/* 5 indicadores */}
        <div className="sales-kpis">
          {loading ? (
            [
              { icon: 'coins',  label: 'Total Bruto',   tone: '#047857', bg: '#ecfdf5' },
              { icon: 'dollar', label: 'Ticket Médio',  tone: '#1d4ed8', bg: '#eff6ff' },
              { icon: 'cart',   label: 'Nº de Vendas',  tone: '#a21caf', bg: '#fdf4ff' },
              { icon: 'agenda', label: 'Média Diária',  tone: '#b45309', bg: '#fef3c7' },
              { icon: 'x',      label: 'Canceladas',    tone: '#b91c1c', bg: '#fef2f2' }
            ].map((k) => <SaleKpiSkeleton key={k.label} icon={k.icon} label={k.label} tone={k.tone} bg={k.bg} />)
          ) : (
            <>
              <SaleKpi icon="coins" label="Total Bruto" value={fmtBRL(kpis.total)} sub={`${kpis.count} concluídas`} tone="#047857" bg="#ecfdf5" />
              <SaleKpi icon="dollar" label="Ticket Médio" value={fmtBRL(kpis.ticket)} sub="por venda" tone="#1d4ed8" bg="#eff6ff" />
              <SaleKpi icon="cart" label="Nº de Vendas" value={fmtInt(kpis.count)} sub={`${sales.length} no total`} tone="#a21caf" bg="#fdf4ff" />
              <SaleKpi icon="agenda" label="Média Diária" value={fmtBRL(kpis.daily)} sub="últimos 30 dias" tone="#b45309" bg="#fef3c7" />
              <SaleKpi icon="x" label="Canceladas" value={fmtInt(kpis.canc)} sub={`${sales.length ? (kpis.canc / sales.length * 100).toFixed(1).replace('.', ',') : 0}% do total`} tone="#b91c1c" bg="#fef2f2" />
            </>
          )}
        </div>

        {/* Toolbar */}
        <div className="card" style={{ padding: 12 }}>
          <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: 220, maxWidth: 360 }}>
              <Ic name="search" size={13} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }} />
              <input className="input" placeholder="Buscar por código, cliente, loja ou vendedor..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ paddingLeft: 40, width: '100%' }} />
              {query && <button onClick={() => setQuery('')} className="btn btn-ghost btn-icon" style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 26, height: 26 }}><Ic name="x" size={12} /></button>}
            </div>
            <span className="muted" style={{ fontSize: 'var(--type-sm)', whiteSpace: 'nowrap' }}>{filtered.length.toLocaleString('pt-BR')} venda{filtered.length === 1 ? '' : 's'}</span>
            <SalesStatusPills value={filterStatus} onChange={setFilterStatus} />
            <div style={{ flex: 1 }} />
            <button className="btn"><Ic name="download" size={13} /> Exportar</button>
            <button className="btn" onClick={() => setShowFilters((s) => !s)}
            style={{ borderColor: showFilters || activeFilters ? 'var(--accent)' : undefined, color: showFilters || activeFilters ? 'var(--accent-700)' : undefined, background: showFilters || activeFilters ? 'var(--accent-soft)' : undefined }}>
              <Ic name="filter" size={13} /> Filtros
              {activeFilters > 0 && <span style={{ marginLeft: 4, background: 'var(--accent)', color: 'white', borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>{activeFilters}</span>}
              <Ic name={showFilters ? 'chevron-up' : 'chevron-down'} size={11} />
            </button>
          </div>
          {showFilters &&
          <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10, animation: 'pop .2s ease' }}>
              <div className="row" style={{ alignItems: 'center', marginBottom: 8, gap: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Filtros</span>
                <div className="spacer" />
                {activeFilters > 0 && <button className="btn btn-sm" onClick={clearFilters} style={{ height: 26, fontSize: 11 }}><Ic name="x" size={11} /> Limpar</button>}
              </div>
              <div className="sales-filter-grid">
                <div className="sales-fblock">
                  <div className="sales-fcat">Forma de Pagamento</div>
                  <div className="sales-fchips">
                    {Object.entries(PAY_METHODS).map(([m, cfg]) => {
                    const on = filterMethod.has(m);
                    return <span key={m} onClick={() => toggleSetVal(setFilterMethod, m)} className={`sales-chip ${on ? 'on' : ''}`}
                    style={on ? { borderColor: cfg.color, background: `color-mix(in oklab, ${cfg.color} 14%, white)`, color: cfg.color } : null}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />{m}</span>;
                  })}
                  </div>
                </div>
                <div className="sales-fblock">
                  <div className="sales-fcat">Vendedor</div>
                  <div className="sales-fchips">
                    {SELLERS.map((s) => {
                    const on = filterSeller.has(s);
                    const ai = s === 'Agente IA';
                    return <span key={s} onClick={() => toggleSetVal(setFilterSeller, s)} className={`sales-chip ${on ? 'on' : ''}`}>
                        {ai && <Ic name="sparkles" size={10} />} {s}</span>;
                  })}
                  </div>
                </div>
                <div className="sales-fblock">
                  <div className="sales-fcat">Loja</div>
                  <div className="sales-fchips">
                    {LOJAS.map((l) => {
                    const on = filterStore.has(l);
                    return <span key={l} onClick={() => toggleSetVal(setFilterStore, l)} className={`sales-chip ${on ? 'on' : ''}`}>{l}</span>;
                  })}
                  </div>
                </div>
              </div>
            </div>}
        </div>

        {/* List */}
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="sale-row sale-head">
            <div className="sale-cell sale-cell-check">
              <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
            </div>
            <div className="sale-cell sale-cell-code">Código</div>
            <div className="sale-cell sale-cell-client">Cliente</div>
            <div className="sale-cell sale-cell-spacer" aria-hidden="true"></div>
            <div className="sale-cell sale-cell-date">Data/Hora</div>
            <div className="sale-cell sale-cell-seller">Vendedor</div>
            <div className="sale-cell sale-cell-pay">Pagamento</div>
            <div className="sale-cell sale-cell-value">Valor</div>
            <div className="sale-cell sale-cell-spacer" aria-hidden="true"></div>
            <div className="sale-cell sale-cell-actions">Ações</div>
          </div>

          <div className="sale-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 0', background: 'var(--surface-2)' }}>
            {loading ?
            Array.from({ length: skelCount('sales', 3) }).map((_, i) => <SaleRowSkeleton key={'skel-' + i} />) :
            filtered.length === 0 ?
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-faint)', background: 'var(--surface)' }}>
                <Ic name="cart" size={36} style={{ opacity: .4 }} />
                <div style={{ marginTop: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Nenhuma venda encontrada</div>
              </div> :
            filtered.map((s) => {
              const pay = PAY_METHODS[s.method] || { color: '#64748b', icon: 'wallet' };
              const stColor = s.status === 'concluida' ? '#10b981' : s.status === 'cancelada' ? '#ef4444' : '#f59e0b';
              const isCanc = s.status === 'cancelada';
              const initials = s.client.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
              return (
                <div key={s.id} className={`sale-row sale-body ${isCanc ? 'sale-canceled' : ''}`} style={{ borderLeft: `2px solid ${stColor}`, cursor: 'pointer' }} onClick={() => setViewOf(s)} title="Ver venda">
                    <div className="sale-cell sale-cell-check" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleOne(s.id)} /></div>
                    <div className="sale-cell sale-cell-code">
                      <span className="sale-code-l" style={{ color: "rgb(86, 86, 86)" }}>Código</span>
                      <span className="sale-code-v" style={{ fontSize: "12px", height: "22px", fontWeight: "700" }}>{s.code}</span>
                    </div>
                    <div className="sale-cell sale-cell-client">
                      <div className="sale-avatar" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
                        <span className="sale-avatar-i">{initials}</span>
                        <img className="sale-avatar-img" src={avatarUrl(s.client)} alt="" onError={(e)=>{e.currentTarget.style.display='none';}} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="sale-client-n">{s.client.length > 35 ? s.client.slice(0, 35).trimEnd() + '…' : s.client}</div>
                        <div className="sale-client-s"><Ic name="map-pin" size={11} style={{ flexShrink: 0, opacity: .8 }} /><span>{s.cidade}</span></div>
                      </div>
                    </div>
                    <div className="sale-cell sale-cell-spacer" aria-hidden="true"></div>
                    <div className="sale-cell sale-cell-date">
                      <div className="sale-line"><Ic name="calendar" size={12} /><span className="sale-line-l">DATA/HORA</span></div>
                      <span className="sale-line-v">{s.dateStr}</span>
                    </div>
                    <div className="sale-cell sale-cell-seller">
                      <div className="sale-line">
                        {s.seller === 'Agente IA' ? <Ic name="sparkles" size={12} style={{ color: '#a855f7' }} /> : <Ic name="user" size={12} />}
                        <span className="sale-line-l">VENDEDOR</span>
                      </div>
                      <span className="sale-line-v" style={s.seller === 'Agente IA' ? { color: '#a21caf', fontWeight: 700 } : null}>{s.seller}</span>
                    </div>
                    <div className="sale-cell sale-cell-pay">
                      <span className="sale-pay-pill" style={{ background: `color-mix(in oklab, ${pay.color} 14%, white)`, color: pay.color, border: `1px solid color-mix(in oklab, ${pay.color} 30%, transparent)` }}>
                        <Ic name={pay.icon} size={11} />{s.method}{s.installments > 1 ? ` · ${s.installments}x` : ''}
                      </span>
                      {s.status === 'cancelada' && <span className="sale-status-pill canc">CANCELADA</span>}
                      {s.status === 'pendente' && <span className="sale-status-pill pen">PENDENTE</span>}
                    </div>
                    <div className="sale-cell sale-cell-value">
                      <div className="sale-line"><Ic name="dollar" size={12} /><span className="sale-line-l">VALOR</span></div>
                      <span className="sale-value-v" style={isCanc ? { textDecoration: 'line-through', color: 'var(--text-faint)' } : null}>{fmtBRL(s.value)}</span>
                    </div>
                    <div className="sale-cell sale-cell-spacer" aria-hidden="true"></div>
                    <div className="sale-cell sale-cell-actions" onClick={(e) => e.stopPropagation()}>
                      <SaleRowMenu
                      isCanc={isCanc}
                      onPrint={() => setPrintOf(s)}
                      onCancel={() => setCancelOf(s)} />
                    </div>
                  </div>);
            })}
          </div>
        </div>

        {viewOf && <SaleViewDrawer sale={viewOf} onClose={() => setViewOf(null)} onPrint={() => {setViewOf(null);setPrintOf(viewOf);}} />}
        {printOf && <SalePrintDrawer sale={printOf} onClose={() => setPrintOf(null)} />}
        {showPDV && window.PDVDrawer && <window.PDVDrawer cliente={{ name: '', clienteId: null, phone: '' }} onClose={() => { setShowPDV(false); reload(); }} />}
        {cancelOf && <SaleCancelModal sale={cancelOf} onClose={() => setCancelOf(null)} onConfirm={(reason) => {cancelSale(cancelOf.id, reason);setCancelOf(null);}} />}
      </Page>);
  }

  function SaleKpi({ icon, label, value, sub, tone, bg }) {
    return (
      <div className="sales-kpi">
        <div className="sales-kpi-ic" style={{ background: bg, color: tone }}><Ic name={icon} size={16} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sales-kpi-l">{label}</div>
          <div className="sales-kpi-v">{value}</div>
          <div className="sales-kpi-s">{sub}</div>
        </div>
      </div>);
  }

  // Skeleton do KPI — mesma estrutura/medidas do SaleKpi real (valor/sub viram blocos).
  function SaleKpiSkeleton({ icon, label, tone, bg }) {
    return (
      <div className="sales-kpi">
        <div className="sales-kpi-ic" style={{ background: bg, color: tone }}><Ic name={icon} size={16} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sales-kpi-l">{label}</div>
          <div className="sales-kpi-v" style={{ display: 'flex', alignItems: 'center' }}><Skeleton w={84} h={19} r={6} /></div>
          <div className="sales-kpi-s" style={{ display: 'flex', alignItems: 'center', marginTop: 3 }}><Skeleton w={64} h={11} /></div>
        </div>
      </div>);
  }

  // Skeleton da linha — reusa o mesmo grid (.sale-row) e suas colunas/células.
  function SaleRowSkeleton() {
    return (
      <div className="sale-row sale-body" style={{ borderLeft: '2px solid var(--border)' }}>
        <div className="sale-cell sale-cell-check"><Skeleton w={16} h={16} r={4} /></div>
        <div className="sale-cell sale-cell-code">
          <span className="sale-code-l" style={{ color: 'rgb(86, 86, 86)' }}>Código</span>
          <Skeleton w={62} h={22} r={6} style={{ alignSelf: 'center' }} />
        </div>
        <div className="sale-cell sale-cell-client">
          <Skeleton circle w={36} h={36} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <Skeleton w={'80%'} h={13} />
            <Skeleton w={'55%'} h={11} style={{ marginTop: 4 }} />
          </div>
        </div>
        <div className="sale-cell sale-cell-spacer" aria-hidden="true"></div>
        <div className="sale-cell sale-cell-date">
          <Skeleton w={70} h={10} />
          <Skeleton w={110} h={12} style={{ marginTop: 4 }} />
        </div>
        <div className="sale-cell sale-cell-seller">
          <Skeleton w={64} h={10} />
          <Skeleton w={90} h={12} style={{ marginTop: 4 }} />
        </div>
        <div className="sale-cell sale-cell-pay">
          <Skeleton w={108} h={20} r={999} />
        </div>
        <div className="sale-cell sale-cell-value">
          <Skeleton w={50} h={10} />
          <Skeleton w={84} h={15} style={{ marginTop: 4 }} />
        </div>
        <div className="sale-cell sale-cell-spacer" aria-hidden="true"></div>
        <div className="sale-cell sale-cell-actions">
          <Skeleton w={30} h={30} r={8} />
        </div>
      </div>);
  }

  function SalesStatusPills({ value, onChange }) {
    const wrapRef = React.useRef(null);
    const btnRefs = React.useRef({});
    const options = [
    { id: 'all', label: 'Todas', dot: null },
    { id: 'concluida', label: 'Concluídas', dot: '#10b981' },
    { id: 'pendente', label: 'Pendentes', dot: '#f59e0b' },
    { id: 'cancelada', label: 'Canceladas', dot: '#ef4444' }];

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
      <div ref={wrapRef} className="sales-status-pills">
        <span className="sales-status-thumb" style={{ transform: `translateX(${thumb.left}px)`, width: thumb.width }} />
        {options.map((o) =>
        <button key={o.id} ref={(el) => {btnRefs.current[o.id] = el;}} className={value === o.id ? 'on' : ''} onClick={() => onChange(o.id)}>
            {o.dot && <span className="dot" style={{ background: o.dot }} />}{o.label}
          </button>)}
      </div>);
  }

  // ─── View Drawer ────────────────────────────────────────────────────────
  function SaleViewDrawer({ sale, onClose, onPrint }) {
    const pay = PAY_METHODS[sale.method] || { color: '#64748b', icon: 'wallet' };
    const initials = sale.client.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
    return (
      <Drawer title={`Venda Nº ${sale.code}`} subtitle={`${sale.dateStr} · ${sale.loja}`} onClose={onClose} width={560}
      footer={<><div style={{ flex: 1 }} />
          <ActionButton action="salvar" size="md" label="Imprimir" icon="file-text" efeito={false} onClick={onPrint} />
        </>}>
        <div className="col" style={{ gap: 14 }}>
          {/* Client header */}
          <div style={{ display: 'flex', gap: 12, padding: 14, background: 'var(--surface-2)', borderRadius: 12, alignItems: 'center' }}>
            <div className="sale-avatar" style={{ width: 48, height: 48, fontSize: 16, background: '#dbeafe', color: '#1d4ed8' }}>
              <span className="sale-avatar-i">{initials}</span>
              <img className="sale-avatar-img" src={avatarUrl(sale.client)} alt="" onError={(e)=>{e.currentTarget.style.display='none';}} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{sale.client}</div>
              <div className="muted" style={{ fontSize: 12 }}>Cliente · vendedor {sale.seller}</div>
            </div>
            {sale.status === 'cancelada' && <span className="sale-status-pill canc">CANCELADA</span>}
            {sale.status === 'pendente' && <span className="sale-status-pill pen">PENDENTE</span>}
            {sale.status === 'concluida' && <span className="sale-status-pill ok">CONCLUÍDA</span>}
          </div>

          {/* Items */}
          <div>
            <div className="sale-section-h">Itens da venda</div>
            <div className="sale-items">
              {sale.items.map((it, i) =>
              <div key={i} className="sale-item-row">
                  <div className="sale-item-qty">{it.qty}×</div>
                  <div style={{ flex: 1 }}>
                    <div className="sale-item-n">{it.name}</div>
                    <div className="sale-item-p">{fmtBRL(it.price)} cada</div>
                  </div>
                  <div className="sale-item-t">{fmtBRL(it.price * it.qty)}</div>
                </div>)}
            </div>
          </div>

          {/* Totals */}
          <div className="sale-totals">
            <div className="sale-tot-line"><span>Subtotal</span><span>{fmtBRL(sale.subtotal)}</span></div>
            {sale.discount > 0 && <div className="sale-tot-line"><span>Desconto</span><span style={{ color: '#dc2626' }}>− {fmtBRL(sale.discount)}</span></div>}
            <div className="sale-tot-line big"><span>Total</span><span>{fmtBRL(sale.value)}</span></div>
          </div>

          {/* Payment + meta */}
          <div className="sale-meta-grid">
            <div>
              <div className="sale-meta-l">Pagamento</div>
              <span className="sale-pay-pill" style={{ background: `color-mix(in oklab, ${pay.color} 14%, white)`, color: pay.color, border: `1px solid color-mix(in oklab, ${pay.color} 30%, transparent)`, fontSize: 12 }}>
                <Ic name={pay.icon} size={12} />{sale.method}{sale.installments > 1 ? ` · ${sale.installments}x` : ''}
              </span>
            </div>
            <div>
              <div className="sale-meta-l">Loja</div>
              <div className="sale-meta-v">{sale.loja}</div>
            </div>
            <div>
              <div className="sale-meta-l">Data/Hora</div>
              <div className="sale-meta-v">{sale.dateStr}</div>
            </div>
            <div>
              <div className="sale-meta-l">Vendedor</div>
              <div className="sale-meta-v">{sale.seller}</div>
            </div>
          </div>

          {sale.notes &&
          <div style={{ padding: 12, background: 'var(--accent-soft)', borderRadius: 10, fontSize: 12, color: 'var(--accent-700)' }}>
              <strong>Observação: </strong>{sale.notes}
            </div>}

          {sale.cancelReason &&
          <div style={{ padding: 12, background: '#fef2f2', borderRadius: 10, fontSize: 12, color: '#b91c1c', border: '1px solid #fecaca' }}>
              <strong>Motivo do cancelamento: </strong>{sale.cancelReason}
            </div>}
        </div>
      </Drawer>);
  }

  // ─── Edit Drawer ────────────────────────────────────────────────────────
  // ─── Print Drawer ───────────────────────────────────────────────────────
  function SalePrintDrawer({ sale, onClose }) {
    const pay = PAY_METHODS[sale.method] || { color: '#64748b', icon: 'wallet' };
    const handlePrint = () => {window.print && window.print();};
    return (
      <Drawer title={`Impressão · Nº ${sale.code}`} subtitle="Pré-visualização do comprovante" onClose={onClose} width={480}
      footer={<><div style={{ flex: 1 }} />
          <ActionButton action="salvar" size="md" label="Imprimir" icon="file-text" onClick={handlePrint} /></>}>
        <div className="sale-print-paper">
          <div className="sale-print-hd">
            <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: '.06em' }}>ATENDE.IA</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Comprovante de Venda</div>
          </div>
          <div className="sale-print-row"><span>Venda</span><strong>Nº {sale.code}</strong></div>
          <div className="sale-print-row"><span>Data/Hora</span><strong>{sale.dateStr}</strong></div>
          <div className="sale-print-row"><span>Loja</span><strong>{sale.loja}</strong></div>
          <div className="sale-print-row"><span>Vendedor</span><strong>{sale.seller}</strong></div>
          <div className="sale-print-row"><span>Cliente</span><strong>{sale.client}</strong></div>
          <div className="sale-print-divider" />
          {sale.items.map((it, i) =>
          <div key={i} className="sale-print-item">
              <span>{it.qty}× {it.name}</span>
              <strong>{fmtBRL(it.price * it.qty)}</strong>
            </div>)}
          <div className="sale-print-divider" />
          <div className="sale-print-row"><span>Subtotal</span><strong>{fmtBRL(sale.subtotal)}</strong></div>
          {sale.discount > 0 && <div className="sale-print-row"><span>Desconto</span><strong>− {fmtBRL(sale.discount)}</strong></div>}
          <div className="sale-print-row big"><span>TOTAL</span><strong>{fmtBRL(sale.value)}</strong></div>
          <div className="sale-print-divider" />
          <div className="sale-print-row"><span>Pagamento</span><strong>{sale.method}{sale.installments > 1 ? ` · ${sale.installments}x` : ''}</strong></div>
          {sale.status === 'cancelada' && <div className="sale-print-canc">⚠ VENDA CANCELADA</div>}
          <div className="sale-print-ft">Obrigado pela preferência! · atende.ia/recibo/{sale.code}</div>
        </div>
      </Drawer>);
  }

  // ─── Cancel Modal ───────────────────────────────────────────────────────
  function SaleCancelModal({ sale, onClose, onConfirm }) {
    const REASONS = ['Desistência do cliente', 'Produto indisponível', 'Erro de cadastro', 'Pagamento não confirmado', 'Devolução', 'Outro'];
    const [reason, setReason] = React.useState(REASONS[0]);
    const [notes, setNotes] = React.useState('');
    return (
      <Modal title="Cancelar venda" onClose={onClose} size="md"
      footer={<><div style={{ flex: 1 }} /><button className="btn fin-btn-back" onClick={onClose}>Voltar</button>
          <button className="btn" style={{ background: '#dc2626', borderColor: '#dc2626', color: 'white' }} onClick={() => onConfirm(notes ? `${reason} — ${notes}` : reason)}><Ic name="x" size={13} /> Cancelar venda</button></>}>
        <div style={{ display: 'flex', gap: 12, padding: '4px 0 12px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fef2f2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ic name="x" size={18} /></div>
          <div>
            <div style={{ fontWeight: 700 }}>Cancelar a venda Nº {sale.code}?</div>
            <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>A venda será marcada como cancelada e o estoque dos itens será reposto. O registro permanece para auditoria.</div>
          </div>
        </div>
        <div className="col" style={{ gap: 10 }}>
          <div><label className="label">Motivo do cancelamento</label><select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>{REASONS.map((r) => <option key={r}>{r}</option>)}</select></div>
          <div><label className="label">Observações (opcional)</label><textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Adicione detalhes que ajudem a auditoria..." /></div>
        </div>
      </Modal>);
  }

  function SalesStyles() {
    return (
      <style>{`
        /* Botão expansível Nova venda (mesmo padrão de Nova receita / Nova despesa) */
        .fin-new-btn {
          display: inline-flex; align-items: center; justify-content: flex-end;
          height: 36px; padding: 0; border: none; cursor: pointer;
          border-radius: 100px; overflow: hidden;
          background: linear-gradient(90deg, #4DFC83 0%, #d3fd37 100%);
          color: #1a1a1a;
          box-shadow: 0 1px 3px rgba(0,0,0,.18);
          transition: box-shadow .2s ease, filter .2s ease;
        }
        .fin-new-btn:hover { box-shadow: 0 3px 10px rgba(0,0,0,.22); }
        .fin-new-btn:active { filter: brightness(.96); }
        .fin-new-label {
          max-width: 0; opacity: 0; overflow: hidden; white-space: nowrap;
          font-family: 'Poppins', sans-serif; font-size: 15px; font-weight: 400; letter-spacing: -.01em;
          padding-left: 0; line-height: 36px;
          transition: max-width .34s cubic-bezier(.4,0,.2,1), opacity .26s ease, padding-left .34s cubic-bezier(.4,0,.2,1);
        }
        .fin-new-btn:hover .fin-new-label,
        .fin-new-btn:focus-visible .fin-new-label {
          max-width: 220px; opacity: 1; padding-left: 18px;
        }
        .fin-new-plus {
          flex: 0 0 36px; width: 36px; height: 36px;
          display: inline-flex; align-items: center; justify-content: center;
        }
        .fin-new-plus svg {
          width: 22px; height: 22px;
          border: 2px solid #1a1a1a; border-radius: 50%;
          padding: 4px; box-sizing: border-box;
          stroke: #1a1a1a;
          transition: transform .5s cubic-bezier(.34,1.56,.64,1);
        }
        .fin-new-btn:hover .fin-new-plus svg,
        .fin-new-btn:focus-visible .fin-new-plus svg { transform: rotate(180deg); }

        .sales-kpis { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; margin-bottom: 10px; }
        @media (max-width: 1280px) { .sales-kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (max-width: 760px) { .sales-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        .sales-kpi { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; transition: box-shadow .15s, border-color .15s; }
        .sales-kpi:hover { box-shadow: 0 4px 14px rgba(15,23,42,.06); border-color: var(--border-strong); }
        .sales-kpi-ic { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .sales-kpi-l { font-size: 10.5px; font-weight: 700; color: var(--text-muted); letter-spacing: .04em; text-transform: uppercase; }
        .sales-kpi-v { font-size: 19px; font-weight: 800; color: var(--text); letter-spacing: -0.01em; line-height: 1.1; }
        .sales-kpi-s { font-size: 11px; color: var(--text-faint); font-weight: 500; margin-top: 2px; }

        .sales-status-pills { position: relative; display: inline-flex; background: var(--surface-2); border: 1px solid var(--border); border-radius: 999px; padding: 3px; gap: 2px; }
        .sales-status-thumb { position: absolute; top: 3px; bottom: 3px; left: 0; background: #E5F6ED; border-radius: 999px; transition: transform .28s cubic-bezier(.4,0,.2,1), width .28s cubic-bezier(.4,0,.2,1); z-index: 0; pointer-events: none; box-shadow: inset 0 0 0 1px color-mix(in oklab, #10b981 28%, transparent); }
        .sales-status-pills button { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 5px; padding: 4px 11px; border-radius: 999px; border: none; background: transparent; color: var(--text-muted); font-size: 11px; font-weight: 600; cursor: pointer; transition: color .2s ease; }
        .sales-status-pills button:hover { color: var(--text); }
        .sales-status-pills button.on { color: #047857; }
        .sales-status-pills .dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }

        .sales-fcat { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .04em; margin-bottom: 6px; }
        .sales-fblock { min-width: 0; }
        .sales-fchips { display: flex; flex-wrap: wrap; gap: 4px; }
        .sales-filter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px 18px; }
        .sales-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); font-size: 11px; font-weight: 600; cursor: pointer; transition: all .15s; }
        .sales-chip:hover { border-color: var(--border-strong); color: var(--text); }
        .sales-chip.on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent-700); }

        .sale-row { display: grid; grid-template-columns: min-content 116px minmax(249px, 0.75fr) minmax(16px, 1fr) minmax(0, 130px) minmax(0, 124px) minmax(0, 136px) minmax(0, 110px) minmax(16px, 1fr) 44px; gap: 16px; padding: 12px 16px; align-items: center; }
        .sale-body { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; margin: 0 8px; transition: box-shadow .15s, border-color .15s; }
        .sale-body:hover { box-shadow: 0 2px 10px rgba(15,23,42,.06); border-color: var(--border-strong); }
        .sale-body.sale-canceled { opacity: .68; }
        .sale-head { background: var(--surface-2); font-size: 11px; font-weight: 600; color: var(--text-muted); padding: 12px 16px; margin: 0 8px; border-bottom: 1px solid var(--border); border-left: 2px solid transparent; text-transform: uppercase; letter-spacing: .03em; }
        .sale-cell { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .sale-cell-check { align-items: flex-start; }
        .sale-cell-code { align-items: flex-start; text-align: center; margin-left: -4px; }
        .sale-code-l { font-size: 9.5px; font-weight: 700; color: var(--text-faint); letter-spacing: .08em; text-transform: uppercase; align-self: center; }
        .sale-code-v { font-size: 14px; font-weight: 800; color: var(--text); font-variant-numeric: tabular-nums; padding: 4px 8px; background: var(--surface-2); border-radius: 6px; align-self: center; min-width: 56px; text-align: center; }
        .sale-cell-client { display: flex; flex-direction: row; align-items: center; gap: 10px; }
        .sale-avatar { position: relative; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; flex-shrink: 0; overflow: hidden; border: 2px solid var(--surface); box-shadow: 0 0 0 1px var(--border); }
        .sale-avatar-i { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
        .sale-avatar-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
        .sale-client-n { font-weight: 700; font-size: 13px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sale-client-s { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sale-client-s > span { overflow: hidden; text-overflow: ellipsis; }

        .sale-line { display: inline-flex; align-items: center; gap: 5px; color: var(--text-faint); }
        .sale-line-l { font-size: 9.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
        .sale-line-v { font-size: 12.5px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sale-value-v { font-size: 15px; font-weight: 800; color: var(--text); font-variant-numeric: tabular-nums; }
        .sale-cell-value { background: color-mix(in oklab, #10b981 5%, transparent); border-radius: 8px; padding: 6px 10px; margin: -6px 0; }

        .sale-pay-pill { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; align-self: flex-start; }
        .sale-status-pill { display: inline-flex; align-items: center; padding: 2px 7px; border-radius: 999px; font-size: 9px; font-weight: 800; letter-spacing: .06em; margin-top: 4px; align-self: flex-start; }
        .sale-status-pill.canc { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
        .sale-status-pill.pen  { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
        .sale-status-pill.ok   { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }

        .sale-cell-actions { display: flex; flex-direction: row; align-items: center; gap: 4px; justify-content: flex-end; }
        .sale-iconbtn { width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--border); background: var(--surface); border-radius: 8px; color: var(--text-muted); cursor: pointer; transition: all .15s; }
        .sale-iconbtn:hover:not(:disabled) { color: var(--accent-700); border-color: var(--accent); background: var(--accent-soft); transform: translateY(-1px); box-shadow: 0 3px 8px rgba(15,23,42,.06); }
        .sale-iconbtn-warn:hover:not(:disabled) { color: #b45309; border-color: #f59e0b; background: #fef3c7; }
        .sale-iconbtn-danger:hover:not(:disabled) { color: #dc2626; border-color: #dc2626; background: #fef2f2; }
        .sale-iconbtn:disabled { cursor: not-allowed; }
        .sale-iconbtn.on { color: var(--accent-700); border-color: var(--accent); background: var(--accent-soft); }

        /* Floating row-action menu */
        .sale-menu {
          position: fixed; z-index: 1000; width: 190px;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 12px; padding: 6px;
          box-shadow: 0 16px 40px -8px rgba(15,23,42,.3), 0 3px 10px rgba(15,23,42,.12);
          display: flex; flex-direction: column; gap: 2px;
          animation: sale-menu-pop .14s ease;
        }
        [data-theme="dark"] .sale-menu { background: #11161c; border-color: #2a323c; }
        @keyframes sale-menu-pop { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
        .sale-menu-item {
          display: flex; align-items: center; gap: 10px;
          width: 100%; text-align: left; cursor: pointer;
          background: none; border: none; border-radius: 8px;
          padding: 9px 10px; font-size: var(--type-sm); font-weight: 500; color: var(--text);
          transition: background .12s ease, color .12s ease;
        }
        .sale-menu-item:hover:not(:disabled) { background: var(--surface-2); }
        .sale-menu-item.warn:hover:not(:disabled) { background: #fef3c7; color: #b45309; }
        .sale-menu-item.danger { color: #dc2626; }
        .sale-menu-item.danger:hover:not(:disabled) { background: #fef2f2; }
        .sale-menu-item:disabled { opacity: .4; cursor: not-allowed; }
        .sale-menu-sep { height: 1px; background: var(--border); margin: 4px 2px; }

        /* Overlay scrollbar: consumes 0 layout width so the action column's
           16px right inset reads identically as 16px to the card border on
           every platform (otherwise a classic scrollbar doubles the gap). */
        .sale-scroll { scrollbar-width: none; }
        .sale-scroll::-webkit-scrollbar { width: 0; height: 0; }

        /* Drawer · view */
        .sale-section-h { font-size: 11px; font-weight: 700; color: var(--text-muted); letter-spacing: .04em; text-transform: uppercase; margin-bottom: 6px; padding: 0 2px; }
        .sale-items { display: flex; flex-direction: column; gap: 6px; }
        .sale-item-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; }
        .sale-item-qty { width: 36px; height: 36px; border-radius: 8px; background: var(--surface-2); color: var(--text-muted); font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
        .sale-item-n { font-weight: 600; font-size: 13px; }
        .sale-item-p { font-size: 11px; color: var(--text-faint); margin-top: 2px; }
        .sale-item-t { font-weight: 700; font-variant-numeric: tabular-nums; }

        .sale-totals { background: var(--surface-2); border-radius: 12px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; }
        .sale-tot-line { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--text-muted); font-variant-numeric: tabular-nums; }
        .sale-tot-line span:last-child { font-weight: 700; color: var(--text); }
        .sale-tot-line.big { font-size: 16px; font-weight: 800; color: var(--text); padding-top: 8px; margin-top: 4px; border-top: 1px dashed var(--border-strong); }
        .sale-tot-line.big span { color: var(--text); font-weight: 800; }

        .sale-meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .sale-meta-l { font-size: 10.5px; font-weight: 700; color: var(--text-muted); letter-spacing: .04em; text-transform: uppercase; margin-bottom: 4px; }
        .sale-meta-v { font-size: 13px; font-weight: 600; color: var(--text); }

        /* Edit row */
        .sale-edit-row { display: flex; gap: 6px; align-items: center; }
        .sale-edit-row .input { padding: 6px 10px; height: 34px; font-size: 12px; }

        /* Print paper */
        .sale-print-paper { background: #fff; border: 1px solid var(--border); border-radius: 10px; padding: 20px 22px; font-family: 'Courier New', monospace; max-width: 420px; margin: 0 auto; box-shadow: 0 4px 18px rgba(15,23,42,.08); }
        .sale-print-hd { text-align: center; padding-bottom: 12px; border-bottom: 2px dashed #1e293b; margin-bottom: 12px; }
        .sale-print-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; color: #1e293b; }
        .sale-print-row.big { font-size: 15px; font-weight: 800; padding: 6px 0; }
        .sale-print-item { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; }
        .sale-print-divider { height: 0; border-top: 2px dashed #1e293b; margin: 10px 0; }
        .sale-print-canc { text-align: center; padding: 8px; margin-top: 8px; background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; border-radius: 6px; font-weight: 800; font-size: 12px; }
        .sale-print-ft { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 12px; }
      `}</style>);
  }

  window.SalesPage = SalesPage;
})();