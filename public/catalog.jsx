// catalog.jsx — Catálogo de produtos/serviços (lista no estilo de Leads/Clientes)

(function () {
  const fmtBRL = (v) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtInt = (v) => Number(v || 0).toLocaleString('pt-BR');
  const fmtDataHora = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} · ${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  const CAT_COLORS = {
    'Pacote':       { color: '#a855f7', icon: 'cube' },
    'Procedimento': { color: '#0ea5e9', icon: 'sparkles' },
    'Produto':      { color: '#10b981', icon: 'package' },
    'Serviço':      { color: '#f59e0b', icon: 'star' }
  };

  function CatalogPage() {
    const { can } = useStore();
    const [query, setQuery] = React.useState('');
    const [showFilters, setShowFilters] = React.useState(false);
    const [filterCat, setFilterCat] = React.useState('all');
    const [filterStatus, setFilterStatus] = React.useState('all');
    const [items, setItems] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [selected, setSelected] = React.useState(new Set());
    const [historyOf, setHistoryOf] = React.useState(null);
    const [editOf, setEditOf] = React.useState(null);
    const [cartOf, setCartOf] = React.useState(null);
    const [confirmDel, setConfirmDel] = React.useState(null);

    // Carrega o catálogo do backend (tabela catalogo-produtos, por empresa).
    const reload = React.useCallback(async () => {
      setLoading(true); setError('');
      try {
        const r = await window.API.getProdutos();
        const rows = (r.produtos || []).map((p, i) => window.produtoDtoToRow(p, i));
        setItems(rows);
        if (rows.length) skelRemember('catalogo', rows.length);
      } catch (e) {
        setError((e && e.message) || 'Falha ao carregar o catálogo.');
      } finally {
        setLoading(false);
      }
    }, []);
    React.useEffect(() => { reload(); }, [reload]);

    const cats = React.useMemo(() => Array.from(new Set(items.map((i) => i.cat))).sort(), [items]);

    const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const filtered = React.useMemo(() => {
      const q = norm(query.trim());
      return items.filter((it) => {
        if (q && !(norm(it.name).includes(q) || norm(it.desc || '').includes(q))) return false;
        if (filterCat !== 'all' && it.cat !== filterCat) return false;
        if (filterStatus === 'ativo' && !it.active) return false;
        if (filterStatus === 'inativo' && it.active) return false;
        return true;
      });
    }, [items, query, filterCat, filterStatus]);

    const toggleActive = async (id) => {
      const it = items.find((x) => x.id === id);
      if (!it) return;
      const next = !it.active;
      setItems((p) => p.map((x) => x.id === id ? { ...x, active: next } : x)); // otimista
      try {
        await window.API.updateProduto(id, { ativo: next });
        window.showToast && window.showToast({ tipo: 'sucesso', titulo: next ? 'Item ativado' : 'Item desativado', descricao: next ? 'O item voltou a aparecer no catálogo.' : 'O item foi ocultado do catálogo.' });
      } catch (e) {
        setItems((p) => p.map((x) => x.id === id ? { ...x, active: !next } : x)); // reverte
        window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao alterar status', descricao: (e && e.message) || 'Não foi possível alterar o status.' });
      }
    };

    const deleteItem = async (id) => {
      const prev = items;
      setItems((p) => p.filter((it) => it.id !== id)); // otimista
      setConfirmDel(null);
      try {
        await window.API.deleteProduto(id);
        window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Item excluído', descricao: 'O item foi removido do catálogo.' });
      } catch (e) {
        setItems(prev); // reverte
        window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao excluir', descricao: (e && e.message) || 'Não foi possível excluir o item.' });
      }
    };

    // Salvar (criar ou editar) — chamado pelo drawer com o objeto do formulário.
    const saveItem = async (form) => {
      const dto = window.produtoFormToDto(form);
      if (!dto.nome) { setEditOf(null); return; }
      const target = editOf; // capturado por closure (o drawer já vai fechar)
      try {
        if (target && target.id) {
          const r = await window.API.updateProduto(target.id, dto);
          const row = window.produtoDtoToRow(r.produto, 0);
          setItems((p) => p.map((x) => x.id === target.id ? { ...row, img: x.img } : x));
          window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Item salvo', descricao: 'As alterações foram aplicadas.' });
        } else {
          const r = await window.API.createProduto(dto);
          setItems((p) => [window.produtoDtoToRow(r.produto, 0), ...p]); // entra no topo
          window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Item criado', descricao: 'O novo item já está no catálogo.' });
        }
      } catch (e) {
        window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao salvar', descricao: (e && e.message) || 'Não foi possível salvar o item.' });
      }
    };

    const kpis = React.useMemo(() => {
      const total = items.length;
      const ativos = items.filter((i) => i.active).length;
      const ttlSales = items.reduce((s, i) => s + (i.sales || 0), 0);
      const ttlStock = items.reduce((s, i) => s + (i.stockQty || 0), 0);
      return { total, ativos, ttlSales, ttlStock };
    }, [items]);

    const toggleAll = () => {
      if (selected.size === filtered.length) setSelected(new Set());
      else setSelected(new Set(filtered.map((c) => c.id)));
    };
    const toggleOne = (id) => {
      const s = new Set(selected);
      if (s.has(id)) s.delete(id); else s.add(id);
      setSelected(s);
    };

    return (
      <Page
        title="Catálogo"
        subtitle="Produtos e serviços · base usada pelo agente e pelo PDV"
        actions={can('catalogo.criar') &&
          <FabNovo size="sm" label={'Servi\u00E7o/Produto'} onClick={() => setEditOf({})} />
        }>

        <CatalogStyles />

        {/* Mini summary strip */}
        <div className="cat-summary">
          <div className="cat-sum-card">
            <div className="cat-sum-ic" style={{ background: '#ecfdf5', color: '#047857' }}><Ic name="package" size={16} /></div>
            <div><div className="cat-sum-l">Total de itens</div><div className="cat-sum-v">{fmtInt(kpis.total)}</div></div>
          </div>
          <div className="cat-sum-card">
            <div className="cat-sum-ic" style={{ background: '#eff6ff', color: '#1d4ed8' }}><Ic name="check" size={16} /></div>
            <div><div className="cat-sum-l">Ativos</div><div className="cat-sum-v">{fmtInt(kpis.ativos)} <span className="cat-sum-pct">/ {fmtInt(kpis.total)}</span></div></div>
          </div>
          <div className="cat-sum-card">
            <div className="cat-sum-ic" style={{ background: '#fef3c7', color: '#b45309' }}><Ic name="cart" size={16} /></div>
            <div><div className="cat-sum-l">Vendas totais</div><div className="cat-sum-v">{fmtInt(kpis.ttlSales)}</div></div>
          </div>
          <div className="cat-sum-card">
            <div className="cat-sum-ic" style={{ background: '#fdf4ff', color: '#a21caf' }}><Ic name="cube" size={16} /></div>
            <div><div className="cat-sum-l">Estoque (un.)</div><div className="cat-sum-v">{fmtInt(kpis.ttlStock)}</div></div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="card" style={{ padding: 12 }}>
          <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: 220, maxWidth: 360 }}>
              <Ic name="search" size={13} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }} />
              <input className="input" placeholder="Buscar produto ou serviço..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ paddingLeft: 40, width: '100%' }} />
              {query &&
                <button onClick={() => setQuery('')} className="btn btn-ghost btn-icon" style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 26, height: 26 }} title="Limpar">
                  <Ic name="x" size={12} />
                </button>}
            </div>
            <span className="muted" style={{ fontSize: 'var(--type-sm)', whiteSpace: 'nowrap' }}>
              {filtered.length.toLocaleString('pt-BR')} ite{filtered.length === 1 ? 'm' : 'ns'}
            </span>

            {/* Status quick toggle */}
            <CatStatusPills value={filterStatus} onChange={setFilterStatus} />

            <div style={{ flex: 1 }} />
            <button className="btn" onClick={() => window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'CSV importado', descricao: 'Os itens da planilha foram adicionados ao catálogo.' })}><Ic name="upload" size={13} /> Importar CSV</button>
            <button className="btn" onClick={() => window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'API sincronizada', descricao: 'O catálogo foi atualizado com a fonte externa.' })}><Ic name="link" size={13} /> Sincronizar API</button>
            <button className="btn">
              <Ic name="download" size={13} /> Exportar
            </button>
            <button
              className="btn"
              onClick={() => setShowFilters((s) => !s)}
              style={{ borderColor: showFilters || filterCat !== 'all' ? 'var(--accent)' : undefined, color: showFilters || filterCat !== 'all' ? 'var(--accent-700)' : undefined, background: showFilters || filterCat !== 'all' ? 'var(--accent-soft)' : undefined }}>
              <Ic name="filter" size={13} /> Filtros
              {filterCat !== 'all' && <span style={{ marginLeft: 4, background: 'var(--accent)', color: 'white', borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>1</span>}
              <Ic name={showFilters ? 'chevron-up' : 'chevron-down'} size={11} />
            </button>
          </div>

          {showFilters &&
            <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10, animation: 'pop .2s ease' }}>
              <div className="row" style={{ alignItems: 'center', marginBottom: 8, gap: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Categoria</span>
                <div className="spacer" />
                {filterCat !== 'all' &&
                  <button className="btn btn-sm" onClick={() => setFilterCat('all')} style={{ height: 26, fontSize: 11 }}>
                    <Ic name="x" size={11} /> Limpar
                  </button>}
              </div>
              <div className="cat-fchips">
                <span onClick={() => setFilterCat('all')} className={`cat-chip ${filterCat === 'all' ? 'on' : ''}`}>Todas</span>
                {cats.map((c) => {
                  const cfg = CAT_COLORS[c] || { color: '#64748b', icon: 'tag' };
                  return (
                    <span key={c} onClick={() => setFilterCat(c)} className={`cat-chip ${filterCat === c ? 'on' : ''}`}
                      style={filterCat === c ? { borderColor: cfg.color, background: `color-mix(in oklab, ${cfg.color} 14%, white)`, color: cfg.color } : null}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />{c}
                    </span>);
                })}
              </div>
            </div>}
        </div>

        {/* List */}
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="prod-row prod-head">
            <div className="prod-cell prod-cell-check">
              <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
            </div>
            <div className="prod-cell prod-cell-name">Item</div>
            <div className="prod-cell prod-cell-cat">Categoria</div>
            <div className="prod-cell prod-cell-price">Preço</div>
            <div className="prod-cell prod-cell-stock">Estoque</div>
            <div className="prod-cell prod-cell-sales">Vendas</div>
            <div className="prod-cell prod-cell-toggle">Status</div>
            <div className="prod-cell prod-cell-actions">Ações</div>
          </div>

          <div className="prod-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 0', background: 'var(--surface-2)' }}>
            {loading ?
              Array.from({ length: skelCount('catalogo', 3) }).map((_, i) =>
                <div key={'sk' + i} className="prod-row prod-body" style={{ borderLeft: '2px solid var(--border)', pointerEvents: 'none' }}>
                  <div className="prod-cell prod-cell-check"><Skeleton w={14} h={14} r={4} /></div>
                  <div className="prod-cell prod-cell-name">
                    <Skeleton w={44} h={44} r={10} />
                    <div style={{ minWidth: 0, flex: 1 }}><Skeleton w="65%" h={13} /><Skeleton w="85%" h={10} style={{ marginTop: 5 }} /></div>
                  </div>
                  <div className="prod-cell prod-cell-cat"><Skeleton w={80} h={20} r={999} /></div>
                  <div className="prod-cell prod-cell-price"><Skeleton w="60%" h={13} /></div>
                  <div className="prod-cell prod-cell-stock"><Skeleton w="55%" h={12} /><Skeleton w="70%" h={9} style={{ marginTop: 5 }} /></div>
                  <div className="prod-cell prod-cell-sales"><Skeleton w={48} h={20} r={999} /></div>
                  <div className="prod-cell prod-cell-toggle"><Skeleton w={40} h={22} r={999} /></div>
                  <div className="prod-cell prod-cell-actions"><div className="row" style={{ gap: 6 }}><Skeleton w={28} h={28} r={8} /><Skeleton w={28} h={28} r={8} /><Skeleton w={28} h={28} r={8} /></div></div>
                </div>) :
            error ?
              <div style={{ padding: 60, textAlign: 'center', background: 'var(--surface)' }}>
                <Ic name="package" size={36} style={{ opacity: .4, color: '#ef4444' }} />
                <div style={{ marginTop: 12, fontWeight: 700, color: '#b91c1c' }}>{error}</div>
                <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>Verifique a conexão e tente novamente.</div>
                <button className="btn" style={{ marginTop: 12 }} onClick={reload}><Ic name="history" size={13} /> Tentar de novo</button>
              </div> :
            filtered.length === 0 ?
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-faint)', background: 'var(--surface)' }}>
                <Ic name="package" size={36} style={{ opacity: .4 }} />
                <div style={{ marginTop: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{items.length === 0 ? 'Catálogo vazio' : 'Nenhum item encontrado'}</div>
                <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>{items.length === 0 ? 'Cadastre o primeiro produto ou serviço no botão "Novo item".' : 'Ajuste os filtros ou cadastre um novo produto/serviço.'}</div>
              </div> :

              filtered.map((it) => {
                const cfg = CAT_COLORS[it.cat] || { color: '#64748b', icon: 'tag' };
                const statusColor = it.active ? '#10b981' : '#ef4444';
                const isLow = it.stockQty > 0 && it.stockQty <= 5;
                return (
                  <div key={it.id}
                    className="prod-row prod-body"
                    style={{ borderLeft: `2px solid ${statusColor}` }}>
                    <div className="prod-cell prod-cell-check">
                      <input type="checkbox" checked={selected.has(it.id)} onChange={() => toggleOne(it.id)} />
                    </div>

                    <div className="prod-cell prod-cell-name">
                      <div className="prod-thumb" style={{ background: it.img }}>
                        <Ic name={cfg.icon} size={20} style={{ color: cfg.color, opacity: .9 }} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="prod-name">{it.name}</div>
                        <div className="prod-desc">{it.desc}</div>
                      </div>
                    </div>

                    <div className="prod-cell prod-cell-cat">
                      <span className="prod-cat-pill" style={{ background: `color-mix(in oklab, ${cfg.color} 14%, white)`, color: cfg.color, border: `1px solid color-mix(in oklab, ${cfg.color} 30%, transparent)` }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />{it.cat}
                      </span>
                    </div>

                    <div className="prod-cell prod-cell-price">
                      <span className="prod-price">{fmtBRL(it.priceN)}</span>
                    </div>

                    <div className="prod-cell prod-cell-stock">
                      {it.controla === false ?
                        <span className="prod-stock-livre"><Ic name="check" size={11} /> Livre</span> :
                      it.stockQty > 0 ?
                        <>
                          <span className="prod-stock-n" style={{ color: isLow ? '#b45309' : 'var(--text)' }}>{fmtInt(it.stockQty)}</span>
                          <span className="prod-stock-l" style={{ color: isLow ? '#b45309' : 'var(--text-faint)' }}>{isLow ? 'estoque baixo' : 'em estoque'}</span>
                        </> :
                        <span className="prod-stock-out"><Ic name="x" size={11} /> Esgotado</span>}
                    </div>

                    <div className="prod-cell prod-cell-sales">
                      <span className="prod-sales-pill">
                        <Ic name="cart" size={11} />
                        <span style={{ fontWeight: 700 }}>{fmtInt(it.sales)}</span>
                      </span>
                    </div>

                    <div className="prod-cell prod-cell-toggle">
                      {can('catalogo.editar') ?
                      <button
                        className={`cat-toggle ${it.active ? 'on' : 'off'}`}
                        onClick={() => toggleActive(it.id)}
                        title={it.active ? 'Desativar item' : 'Reativar item'}
                        aria-pressed={it.active}>
                        <span className="cat-toggle-knob" />
                      </button> :
                      <span style={{ fontSize: 11, fontWeight: 700, color: it.active ? '#047857' : '#b91c1c' }}>{it.active ? 'Ativo' : 'Inativo'}</span>}
                    </div>

                    <div className="prod-cell prod-cell-actions">
                      <button className="prod-iconbtn" title="Histórico" onClick={() => setHistoryOf(it)}>
                        <Ic name="history" size={15} />
                      </button>
                      {can('catalogo.editar') &&
                      <button className="prod-iconbtn" title="Editar" onClick={() => setEditOf(it)}>
                        <Ic name="edit" size={15} />
                      </button>}
                      <button className="prod-iconbtn" title="Vender (PDV)" onClick={() => setCartOf(it)}>
                        <Ic name="cart" size={15} />
                      </button>
                      {can('catalogo.excluir') &&
                      <button className="prod-iconbtn prod-iconbtn-danger" title="Excluir" onClick={() => setConfirmDel(it)}>
                        <Ic name="trash" size={15} />
                      </button>}
                    </div>
                  </div>);
              })}
          </div>
        </div>

        {/* Side drawers — already animated via shell's Drawer (slide from right) */}
        {historyOf && <ProductHistoryDrawer item={historyOf} onClose={() => setHistoryOf(null)} />}
        {editOf && window.CatalogItemDrawer &&
          <window.CatalogItemDrawer
            initial={editOf.id ? window.produtoDtoToForm(editOf._dto) : null}
            onClose={() => setEditOf(null)}
            onSave={saveItem} />}
        {cartOf && <PdvComingSoonDrawer item={cartOf} onClose={() => setCartOf(null)} />}
        {confirmDel &&
          <Modal title="Excluir item" onClose={() => setConfirmDel(null)} size="sm"
            footer={<>
              <div style={{ flex: 1 }} />
              <button className="btn fin-btn-back" onClick={() => setConfirmDel(null)}>Voltar</button>
              <button className="btn" style={{ background: '#dc2626', borderColor: '#dc2626', color: 'white' }} onClick={() => deleteItem(confirmDel.id)}>
                <Ic name="trash" size={13} /> Excluir
              </button>
            </>}>
            <div style={{ display: 'flex', gap: 12, padding: '6px 4px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'color-mix(in oklab, #dc2626 12%, white)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Ic name="trash" size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>Excluir <strong>{confirmDel.name}</strong>?</div>
                <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>Esta ação não pode ser desfeita. O histórico de vendas permanecerá no sistema.</div>
              </div>
            </div>
          </Modal>}
      </Page>);
  }

  // ─── Status pills with sliding thumb (like clients page) ────────────────
  function CatStatusPills({ value, onChange }) {
    const wrapRef = React.useRef(null);
    const btnRefs = React.useRef({});
    const options = [
      { id: 'all',     label: 'Todos',    dot: null },
      { id: 'ativo',   label: 'Ativos',   dot: '#10b981' },
      { id: 'inativo', label: 'Inativos', dot: '#ef4444' }
    ];
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
      <div ref={wrapRef} className="cat-status-pills">
        <span className="cat-status-thumb" style={{ transform: `translateX(${thumb.left}px)`, width: thumb.width }} />
        {options.map((o) =>
          <button
            key={o.id}
            ref={(el) => { btnRefs.current[o.id] = el; }}
            className={value === o.id ? 'on' : ''}
            onClick={() => onChange(o.id)}>
            {o.dot && <span className="dot" style={{ background: o.dot }} />}
            {o.label}
          </button>)}
      </div>);
  }

  // ─── History side drawer ────────────────────────────────────────────────
  function ProductHistoryDrawer({ item, onClose }) {
    const [histDate, setHistDate] = React.useState('');
    const [events, setEvents] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    // Carrega a timeline real do backend (cadastro, edições e — futuramente — vendas).
    React.useEffect(() => {
      let alive = true;
      const TIPO_UI = { cadastro: 'created', edicao: 'edit', entrada: 'stock', saida: 'out', venda: 'sale' };
      setLoading(true);
      window.API.getMovimentacoes(item.id)
        .then((r) => {
          if (!alive) return;
          setEvents((r.movimentacoes || []).map((m) => ({
            kind: TIPO_UI[m.tipo] || 'edit',
            when: fmtDataHora(m.criadoEm),
            who: m.autor || 'Sistema',
            qty: m.quantidade,
            value: m.valor,
            note: m.descricao || '',
          })));
          if (Array.isArray(r.movimentacoes) && r.movimentacoes.length) skelRemember('prod-hist', r.movimentacoes.length);
        })
        .catch(() => { if (alive) setEvents([]); })
        .finally(() => { if (alive) setLoading(false); });
      return () => { alive = false; };
    }, [item.id]);

    const KIND = {
      sale:    { ic: 'cart',   color: '#10b981', label: 'Venda' },
      stock:   { ic: 'plus',   color: '#0ea5e9', label: 'Entrada de estoque' },
      out:     { ic: 'arrow-left', color: '#f59e0b', label: 'Saída' },
      edit:    { ic: 'edit',   color: '#8b5cf6', label: 'Edição' },
      created: { ic: 'star',   color: '#a855f7', label: 'Cadastrado' }
    };
    const cfg = CAT_COLORS[item.cat] || { color: '#64748b', icon: 'tag' };
    const totalSales = events.filter((e) => e.kind === 'sale').reduce((s, e) => s + (e.value || 0), 0);
    const qtySales = events.filter((e) => e.kind === 'sale').reduce((s, e) => s + (e.qty || 0), 0);
    return (
      <Drawer
        title={`Histórico · ${item.name}`}
        subtitle={`Movimentações e vendas · cadastrado em ${item.since}`}
        onClose={onClose}
        width={560}
        footer={<><div style={{ flex: 1 }} /><ActionButton action="voltar" size="md" label="Fechar" onClick={onClose} /><ActionButton action="salvar" size="md" label="Exportar histórico" icon="download" /></>}>
        <div className="col" style={{ gap: 12 }}>
          {/* Product summary */}
          <div style={{ display: 'flex', gap: 12, padding: 12, background: 'var(--surface-2)', borderRadius: 12, alignItems: 'center' }}>
            <div className="prod-thumb" style={{ background: item.img, width: 48, height: 48 }}>
              <Ic name={cfg.icon} size={22} style={{ color: cfg.color }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700 }}>{item.name}</div>
              <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>{item.cat} · {fmtBRL(item.priceN)} · Estoque {item.stockQty}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 700 }}>Vendido</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#047857' }}>{fmtBRL(totalSales)}</div>
              <div className="muted" style={{ fontSize: 11 }}>{qtySales} unidades</div>
            </div>
          </div>

          {/* Filters */}
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <button className="btn btn-sm" style={{ height: 28 }}><Ic name="filter" size={11} /> Todos</button>
            <button className="btn btn-sm" style={{ height: 28 }}><Ic name="cart" size={11} /> Vendas</button>
            <button className="btn btn-sm" style={{ height: 28 }}><Ic name="cube" size={11} /> Estoque</button>
            <button className="btn btn-sm" style={{ height: 28 }}><Ic name="edit" size={11} /> Edições</button>
            <div className="spacer" />
            <DateField value={histDate} onChange={(e) => setHistDate(e.target.value)} style={{ height: 28, fontSize: 11, width: 150 }} />
          </div>

          {/* Timeline */}
          <div className="prod-hist-list">
            {loading ?
              Array.from({ length: skelCount('prod-hist', 3) }).map((_, i, arr) =>
                <div key={'sk' + i} className="prod-hist-row">
                  <div className="prod-hist-rail">
                    <Skeleton circle w={22} h={22} />
                    {i < arr.length - 1 && <div className="prod-hist-line" />}
                  </div>
                  <div className="prod-hist-card">
                    <div className="row" style={{ gap: 8 }}>
                      <Skeleton w={90} h={11} />
                      <div className="spacer" />
                      <Skeleton w={56} h={13} />
                    </div>
                    <Skeleton w="80%" h={12} style={{ marginTop: 6 }} />
                    <Skeleton w="45%" h={10} style={{ marginTop: 6 }} />
                  </div>
                </div>) :
            events.length === 0 ?
              <div style={{ padding: 28, textAlign: 'center' }}>
                <Ic name="history" size={28} style={{ opacity: .4 }} />
                <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 8 }}>Nenhuma movimentação ainda.<br />Cadastro, edições e (em breve) vendas aparecem aqui.</div>
              </div> :
            events.map((e, i) => {
              const k = KIND[e.kind] || KIND.edit;
              return (
                <div key={i} className="prod-hist-row">
                  <div className="prod-hist-rail">
                    <div className="prod-hist-dot" style={{ background: k.color, boxShadow: `0 0 0 4px color-mix(in oklab, ${k.color} 14%, transparent)` }}>
                      <Ic name={k.ic} size={11} style={{ color: '#fff' }} />
                    </div>
                    {i < events.length - 1 && <div className="prod-hist-line" />}
                  </div>
                  <div className="prod-hist-card">
                    <div className="row" style={{ gap: 8 }}>
                      <span className="prod-hist-kind" style={{ color: k.color }}>{k.label}</span>
                      {e.qty != null && <span className="prod-hist-qty">{e.qty > 0 ? '+' : ''}{e.qty} un.</span>}
                      <div className="spacer" />
                      {e.value != null && <span className="prod-hist-val">{fmtBRL(e.value)}</span>}
                    </div>
                    <div className="prod-hist-note">{e.note}</div>
                    <div className="prod-hist-foot">
                      <Ic name="user" size={11} /> {e.who}
                      <span style={{ margin: '0 6px', opacity: .4 }}>·</span>
                      <Ic name="clock" size={11} /> {e.when}
                    </div>
                  </div>
                </div>);
            })}
          </div>
        </div>
      </Drawer>);
  }

  function PdvComingSoonDrawer({ item, onClose }) {
    const cfg = CAT_COLORS[item.cat] || { color: '#64748b', icon: 'tag' };
    return (
      <Drawer
        title="PDV · Nova venda"
        subtitle={`Iniciar venda de "${item.name}"`}
        onClose={onClose}
        width={420}
        footer={<><div style={{ flex: 1 }} /><ActionButton action="voltar" size="md" label="Fechar" onClick={onClose} /><ActionButton action="salvar" size="md" label="Em breve" icon="cart" disabled /></>}>
        <div className="col" style={{ gap: 14, alignItems: 'center', padding: '14px 8px', textAlign: 'center' }}>
          <div className="prod-thumb" style={{ background: item.img, width: 72, height: 72 }}>
            <Ic name={cfg.icon} size={30} style={{ color: cfg.color }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{item.name}</div>
            <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>{item.cat} · {fmtBRL(item.priceN)}</div>
          </div>
          <div style={{ padding: 16, background: 'var(--accent-soft)', borderRadius: 12, color: 'var(--accent-700)', fontSize: 'var(--type-sm)' }}>
            O PDV ainda está em construção. Em breve você poderá lançar vendas, escolher forma de pagamento e gerar comprovante direto por aqui.
          </div>
        </div>
      </Drawer>);
  }

  function CatalogStyles() {
    return (
      <style>{`
        .cat-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 10px; }
        @media (max-width: 900px) { .cat-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        .cat-sum-card { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; transition: box-shadow .15s; }
        .cat-sum-card:hover { box-shadow: 0 4px 14px rgba(15,23,42,.06); border-color: var(--border-strong); }
        .cat-sum-ic { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .cat-sum-l { font-size: 11px; font-weight: 700; color: var(--text-muted); letter-spacing: .04em; text-transform: uppercase; }
        .cat-sum-v { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.01em; }
        .cat-sum-pct { font-size: 13px; color: var(--text-faint); font-weight: 500; }

        .cat-status-pills { position: relative; display: inline-flex; background: var(--surface-2); border: 1px solid var(--border); border-radius: 999px; padding: 3px; gap: 2px; }
        .cat-status-thumb { position: absolute; top: 3px; bottom: 3px; left: 0; background: #E5F6ED; border-radius: 999px; transition: transform .28s cubic-bezier(.4,0,.2,1), width .28s cubic-bezier(.4,0,.2,1); z-index: 0; pointer-events: none; box-shadow: inset 0 0 0 1px color-mix(in oklab, #10b981 28%, transparent); }
        .cat-status-pills button { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 5px; padding: 4px 11px; border-radius: 999px; border: none; background: transparent; color: var(--text-muted); font-size: 11px; font-weight: 600; cursor: pointer; transition: color .2s ease; }
        .cat-status-pills button:hover { color: var(--text); }
        .cat-status-pills button.on { color: #047857; }
        .cat-status-pills .dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }

        .cat-fchips { display: flex; flex-wrap: wrap; gap: 6px; }
        .cat-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; border-radius: 999px; border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); font-size: 11px; font-weight: 600; cursor: pointer; transition: all .15s; }
        .cat-chip:hover { border-color: var(--border-strong); color: var(--text); }
        .cat-chip.on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent-700); }

        .prod-row { display: grid; grid-template-columns: 32px 2.2fr 1fr 1fr .9fr .8fr 64px 160px; gap: 12px; padding: 12px; align-items: center; }
        .prod-body { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; margin: 0 8px; transition: box-shadow .15s, border-color .15s; }
        .prod-body:hover { box-shadow: 0 2px 10px rgba(15,23,42,.06); border-color: var(--border-strong); }
        .prod-head { background: var(--surface-2); font-size: 11px; font-weight: 600; color: var(--text-muted); padding: 12px; margin: 0 8px; border-bottom: 1px solid var(--border); border-left: 2px solid transparent; text-transform: uppercase; letter-spacing: .03em; }
        .prod-cell { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .prod-cell-check { align-items: flex-start; }
        .prod-cell-name { display: flex; flex-direction: row; gap: 12px; align-items: center; }
        .prod-cell-toggle, .prod-cell-actions { flex-direction: row; align-items: center; }
        .prod-cell-actions { gap: 4px; justify-content: flex-end; }
        .prod-thumb { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: inset 0 0 0 1px rgba(0,0,0,.04); }
        .prod-name { font-weight: 700; font-size: var(--type-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text); }
        .prod-desc { font-size: 11px; color: var(--text-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .prod-cat-pill { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 999px; font-size: 10.5px; font-weight: 700; letter-spacing: .02em; align-self: flex-start; }
        .prod-price { font-size: 14px; font-weight: 700; color: var(--text); font-variant-numeric: tabular-nums; }
        .prod-stock-n { font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1; }
        .prod-stock-l { font-size: 10.5px; font-weight: 500; }
        .prod-stock-out { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 999px; background: #fef2f2; color: #b91c1c; font-size: 10.5px; font-weight: 700; align-self: flex-start; }
        .prod-stock-livre { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 999px; background: #eef2ff; color: #4338ca; font-size: 10.5px; font-weight: 700; align-self: flex-start; }
        .prod-sales-pill { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 999px; background: #f0fdf4; color: #047857; border: 1px solid color-mix(in oklab, #10b981 26%, transparent); font-size: 11px; font-variant-numeric: tabular-nums; align-self: flex-start; }

        .cat-toggle { width: 40px; height: 22px; border-radius: 999px; border: none; padding: 2px; cursor: pointer; display: inline-flex; align-items: center; transition: background .15s; flex-shrink: 0; }
        .cat-toggle.on  { background: #10b981; justify-content: flex-end; }
        .cat-toggle.off { background: #cbd5e1; justify-content: flex-start; }
        .cat-toggle-knob { width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.18); transition: transform .18s ease; }

        .prod-iconbtn { width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--border); background: var(--surface); border-radius: 8px; color: var(--text-muted); cursor: pointer; transition: all .15s; }
        .prod-iconbtn:hover { color: var(--accent-700); border-color: var(--accent); background: var(--accent-soft); transform: translateY(-1px); box-shadow: 0 3px 8px rgba(15,23,42,.06); }
        .prod-iconbtn-danger:hover { color: #dc2626; border-color: #dc2626; background: #fef2f2; }

        .prod-scroll::-webkit-scrollbar { width: 8px; }
        .prod-scroll::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 4px; }
        .prod-scroll::-webkit-scrollbar-track { background: transparent; }

        /* History timeline */
        .prod-hist-list { display: flex; flex-direction: column; gap: 4px; }
        .prod-hist-row { display: grid; grid-template-columns: 28px 1fr; gap: 10px; }
        .prod-hist-rail { display: flex; flex-direction: column; align-items: center; }
        .prod-hist-dot { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .prod-hist-line { width: 2px; flex: 1; background: var(--border); margin-top: 4px; min-height: 14px; }
        .prod-hist-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 9px 12px; margin-bottom: 8px; }
        .prod-hist-kind { font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
        .prod-hist-qty { font-size: 11px; font-weight: 700; color: var(--text-muted); font-variant-numeric: tabular-nums; }
        .prod-hist-val { font-size: 13px; font-weight: 800; color: var(--text); font-variant-numeric: tabular-nums; }
        .prod-hist-note { font-size: 12px; color: var(--text); margin-top: 4px; }
        .prod-hist-foot { font-size: 10.5px; color: var(--text-faint); margin-top: 4px; display: flex; align-items: center; gap: 4px; }
      `}</style>);
  }

  // Expose. The old AdminCatalog in admin.jsx will defer to this if present.
  window.CatalogPage = CatalogPage;
})();
