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
  // Código/referência do item: 3 letras - 6 números (ex.: GHY-526589).
  // Determinístico por id (estável entre renders) — o catálogo não tem coluna própria.
  const prodCode = (id) => {
    const s = String(id || '');
    let h = 0;
    for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
    const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const letters = L[h % 24] + L[Math.floor(h / 24) % 24] + L[Math.floor(h / 576) % 24];
    return letters + '-' + String(h % 1000000).padStart(6, '0');
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
    const [filterStock, setFilterStock] = React.useState('all'); // all | com | sem | livre
    const [items, setItems] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [selected, setSelected] = React.useState(new Set());
    const [historyOf, setHistoryOf] = React.useState(null);
    const [viewOf, setViewOf] = React.useState(null);
    const [editOf, setEditOf] = React.useState(null);
    const [cartOf, setCartOf] = React.useState(null);
    const [confirmDel, setConfirmDel] = React.useState(null);
    const [exportOpen, setExportOpen] = React.useState(false);
    const [importOpen, setImportOpen] = React.useState(false);

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
      const qCode = q.replace(/[^a-z0-9]/g, ''); // código sem traço/espaço p/ casar "ghy-526" e "ghy526"
      return items.filter((it) => {
        if (q) {
          const code = prodCode(it.id).toLowerCase().replace(/[^a-z0-9]/g, '');
          const hit = norm(it.name).includes(q) || norm(it.desc || '').includes(q) || (qCode && code.includes(qCode));
          if (!hit) return false;
        }
        if (filterCat !== 'all' && it.cat !== filterCat) return false;
        if (filterStatus === 'ativo' && !it.active) return false;
        if (filterStatus === 'inativo' && it.active) return false;
        if (filterStock !== 'all') {
          const livre = it.controla === false;            // não controla estoque -> "Livre"
          if (filterStock === 'livre' && !livre) return false;
          if (filterStock === 'com' && (livre || !(it.stockQty > 0))) return false;   // controla e tem saldo
          if (filterStock === 'sem' && (livre || it.stockQty > 0)) return false;       // controla e esgotado
        }
        return true;
      });
    }, [items, query, filterCat, filterStatus, filterStock]);

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
              <input className="input" placeholder="Buscar por descrição ou código..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ paddingLeft: 40, width: '100%' }} />
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
            <button className="btn" onClick={() => setImportOpen(true)}><Ic name="upload" size={13} /> Importar</button>
            <button className="btn" onClick={() => window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'API sincronizada', descricao: 'O catálogo foi atualizado com a fonte externa.' })}><Ic name="link" size={13} /> Sincronizar API</button>
            <button className="btn" onClick={() => setExportOpen(true)}>
              <Ic name="download" size={13} /> Exportar
            </button>
            {(() => { const ativos = (filterCat !== 'all' ? 1 : 0) + (filterStock !== 'all' ? 1 : 0); return (
            <button
              className="btn"
              onClick={() => setShowFilters((s) => !s)}
              style={{ borderColor: showFilters || ativos ? 'var(--accent)' : undefined, color: showFilters || ativos ? 'var(--accent-700)' : undefined, background: showFilters || ativos ? 'var(--accent-soft)' : undefined }}>
              <Ic name="filter" size={13} /> Filtros
              {ativos > 0 && <span style={{ marginLeft: 4, background: 'var(--accent)', color: 'white', borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>{ativos}</span>}
              <Ic name={showFilters ? 'chevron-up' : 'chevron-down'} size={11} />
            </button>); })()}
          </div>

          {showFilters &&
            <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10, animation: 'pop .2s ease' }}>
              <div className="row" style={{ gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 240 }}>
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
              </div>

              <div style={{ flex: 1, minWidth: 240 }}>
              <div className="row" style={{ alignItems: 'center', marginBottom: 8, gap: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Estoque</span>
                <div className="spacer" />
                {filterStock !== 'all' &&
                  <button className="btn btn-sm" onClick={() => setFilterStock('all')} style={{ height: 26, fontSize: 11 }}>
                    <Ic name="x" size={11} /> Limpar
                  </button>}
              </div>
              <div className="cat-fchips">
                {[{ id: 'all', label: 'Todos', dot: null }, { id: 'com', label: 'Com estoque', dot: '#10b981' }, { id: 'sem', label: 'Sem estoque', dot: '#ef4444' }, { id: 'livre', label: 'Livre', dot: '#4338ca' }].map((o) =>
                  <span key={o.id} onClick={() => setFilterStock(o.id)} className={`cat-chip ${filterStock === o.id ? 'on' : ''}`}
                    style={filterStock === o.id && o.dot ? { borderColor: o.dot, background: `color-mix(in oklab, ${o.dot} 14%, white)`, color: o.dot } : null}>
                    {o.dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: o.dot }} />}{o.label}
                  </span>)}
              </div>
              </div>
              </div>
            </div>}
        </div>

        {/* List */}
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="prod-row prod-head">
            <div className="prod-cell prod-cell-check">
              <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
            </div>
            <div className="prod-cell prod-cell-code"><span>Código</span><span className="prod-code-sep" /></div>
            <div className="prod-cell prod-cell-name">Descrição</div>
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
                  <div className="prod-cell prod-cell-code"><Skeleton w={64} h={12} /><span className="prod-code-sep" /></div>
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
                    onClick={() => setViewOf(it)}
                    title="Ver detalhes do item"
                    style={{ borderLeft: `2px solid ${statusColor}`, cursor: 'pointer' }}>
                    <div className="prod-cell prod-cell-check" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(it.id)} onChange={() => toggleOne(it.id)} />
                    </div>

                    <div className="prod-cell prod-cell-code">
                      <span className="prod-code">{prodCode(it.id)}</span>
                      <span className="prod-code-sep" />
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

                    <div className="prod-cell prod-cell-toggle" onClick={(e) => e.stopPropagation()}>
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

                    <div className="prod-cell prod-cell-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="prod-iconbtn" title="Histórico" onClick={() => setHistoryOf(it)}>
                        <Ic name="history" size={15} />
                      </button>
                      {can('catalogo.editar') &&
                      <button className="prod-iconbtn prod-iconbtn-edit" title="Editar" onClick={() => setEditOf(it)}>
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
        {viewOf && <ProductViewDrawer item={viewOf} onClose={() => setViewOf(null)} onEdit={(it) => { setViewOf(null); setEditOf(it); }} />}
        {historyOf && <ProductHistoryDrawer item={historyOf} onClose={() => setHistoryOf(null)} />}
        {editOf && window.CatalogItemDrawer &&
          <window.CatalogItemDrawer
            initial={editOf.id ? window.produtoDtoToForm(editOf._dto) : null}
            onClose={() => setEditOf(null)}
            onSave={saveItem} />}
        {cartOf && window.PDVDrawer && <window.PDVDrawer cliente={{ name: '', clienteId: null, phone: '' }} onClose={() => setCartOf(null)} />}
        {exportOpen && <ExportModal items={items} filtered={filtered} onClose={() => setExportOpen(false)} />}
        {importOpen && <ImportModal items={items} onImported={reload} onClose={() => setImportOpen(false)} />}
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
  // Visualização (somente leitura) de TODOS os dados do produto, no padrão
  // DesignerAba01 (aba lateral em blocos). Botão "Editar" abre o drawer de edição.
  function ProductViewDrawer({ item, onClose, onEdit }) {
    const d = item._dto || {};
    const ex = (d.extras && typeof d.extras === 'object') ? d.extras : {};
    const isServ = d.tipo === 'servico';
    const money = (v) => (v == null || v === '') ? '—' : fmtBRL(Number(v));
    const simNao = (b) => b ? 'Sim' : 'Não';
    const imgs = Array.isArray(ex.images) ? ex.images : [];
    const docs = Array.isArray(ex.docs) ? ex.docs : [];
    const variants = Array.isArray(ex.variants) ? ex.variants : [];
    const faq = Array.isArray(ex.aiFaq) ? ex.aiFaq.filter((x) => x && (x.q || x.a)) : [];

    const blocos = [
      { titulo: 'Identificação', campos: [
        { ic: 'tag', label: 'Código', v: prodCode(item.id) },
        { ic: 'tag', label: 'SKU / código interno', v: d.sku || '—' },
        { ic: isServ ? 'agenda' : 'cart', label: 'Tipo', v: isServ ? 'Serviço' : 'Produto' },
        { ic: 'filter', label: 'Categoria', v: d.categoria || '—' },
        { ic: 'edit', label: 'Nome', v: d.nome || item.name, full: true },
        { ic: 'check', label: 'Status', v: (d.ativo !== false) ? 'Ativo' : 'Inativo' },
        { ic: 'commercial', label: 'No catálogo público', v: simNao(d.apareceCatalogo !== false) },
        { ic: 'brand', label: 'Etiquetas', v: (Array.isArray(d.tags) && d.tags.length) ? d.tags.join(', ') : '—', full: true },
      ] },
      { titulo: 'Descrição', campos: [
        { label: 'Descrição curta', v: d.descricaoCurta || '—', area: true, full: true },
        { label: 'Descrição completa', v: d.descricao || '—', area: true, full: true },
      ] },
      { titulo: 'Preço & estoque', campos: [
        { ic: 'wallet', label: 'Preço de venda', v: money(d.preco) },
        { ic: 'wallet', label: 'Preço promocional', v: d.precoPromo ? money(d.precoPromo) : '—' },
        { ic: 'wallet', label: 'Custo', v: d.custo ? money(d.custo) : '—' },
        { ic: 'cube', label: 'Unidade', v: d.unidade || '—' },
        { ic: 'cube', label: 'Controla estoque', v: isServ ? 'Não (serviço)' : simNao(d.controlaEstoque !== false) },
        ...(!isServ && d.controlaEstoque !== false ? [
          { ic: 'cube', label: 'Estoque atual', v: String(Number(d.estoque) || 0) },
          { ic: 'alert', label: 'Estoque mínimo', v: String(Number(d.estoqueMin) || 0) },
        ] : []),
        { ic: 'cart', label: 'Vendas (unidades)', v: String(Number(item.sales) || 0) },
        { ic: 'agenda', label: 'Criado em', v: item.since || '—' },
      ] },
    ];

    if (isServ) {
      blocos.push({ titulo: 'Serviço', campos: [
        { ic: 'agenda', label: 'Duração (min)', v: d.duracao != null ? String(d.duracao) : '—' },
        { ic: 'commercial', label: 'Local', v: d.local || '—' },
        { ic: 'check', label: 'Requer agendamento', v: simNao(d.requerAgendamento !== false) },
      ] });
    }

    if (variants.length) {
      blocos.push({ titulo: isServ ? 'Pacotes / sessões' : 'Variantes', campos: variants.map((vr, i) => ({
        label: vr.name || ('Variante ' + (i + 1)),
        v: [vr.price ? ('R$ ' + vr.price) : null, (!isServ && vr.stock != null) ? (vr.stock + ' un.') : null].filter(Boolean).join(' · ') || '—',
      })) });
    }

    blocos.push({ titulo: 'Mídia & links', campos: [
      { label: 'Link externo', area: true, full: true, v: ex.link ? <a href={ex.link} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-700)', wordBreak: 'break-all' }}>{ex.link}</a> : '—' },
      { label: 'Fotos e vídeos', area: true, full: true, v: imgs.length
        ? <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>{imgs.map((m, i) => m.type === 'video'
            ? <video key={i} src={m.url} muted style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', background: '#000' }} />
            : <img key={i} src={m.url} alt={m.name || ''} style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover' }} />)}</div>
        : 'Nenhuma' },
      { label: 'Documentos', area: true, full: true, v: docs.length
        ? <div className="col" style={{ gap: 4 }}>{docs.map((x, i) => <div key={i}>{x.kind ? '[' + x.kind + '] ' : ''}{x.url ? <a href={x.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-700)' }}>{x.name}</a> : x.name}</div>)}</div>
        : 'Nenhum' },
    ] });

    blocos.push({ titulo: 'Treinamento da IA', campos: [
      { label: 'Resumo para o agente', v: ex.aiSummary || '—', area: true, full: true },
      { ic: 'sparkles', label: 'Tom de voz', v: ex.aiTone || '—' },
      { ic: 'sparkles', label: 'Upsell / cross-sell', v: ex.aiUpsell || '—' },
      { label: 'Palavras-chave', v: (Array.isArray(ex.aiKeywords) && ex.aiKeywords.length) ? ex.aiKeywords.join(', ') : '—', full: true },
      { label: 'FAQ', area: true, full: true, v: faq.length
        ? <div className="col" style={{ gap: 8 }}>{faq.map((x, i) => <div key={i}><strong>{i + 1}. {x.q}</strong><br />{x.a}</div>)}</div>
        : '—' },
      { label: 'Contraindicações / restrições', v: ex.aiContraindications || '—', area: true, full: true },
      { label: 'O agente NÃO deve falar sobre', v: ex.aiNotShare || '—', area: true, full: true },
    ] });

    return (
      <DesignerAba01
        title={d.nome || item.name}
        subtitle={`${isServ ? 'Serviço' : 'Produto'} · ${d.categoria || 'sem categoria'} · ${money(d.preco)}`}
        width={640}
        blocos={blocos}
        onClose={onClose}
        onEditar={() => onEdit(item)}
        editarLabel="Editar" />
    );
  }

  function ProductHistoryDrawer({ item, onClose }) {
    const [histFrom, setHistFrom] = React.useState(''); // período: início (YYYY-MM-DD)
    const [histTo, setHistTo] = React.useState('');     // período: fim
    const [histFilter, setHistFilter] = React.useState('all'); // all | sale | stock | edit
    const [histExportOpen, setHistExportOpen] = React.useState(false);
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
            at: m.criadoEm || null,          // data crua (ISO) p/ o filtro por período
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
    // Filtros de tipo (toggle) no padrão ActionButton: Venda=verde, Estoque=laranja, Edição=azul.
    const FILTERS = [
      { id: 'all',   label: 'Todos',   action: 'editar',  icon: 'filter', gray: true }, // reset (cinza)
      { id: 'sale',  label: 'Vendas',  action: 'salvar',  icon: 'cart' },
      { id: 'stock', label: 'Estoque', action: 'atencao', icon: 'cube' },
      { id: 'edit',  label: 'Edições', action: 'editar',  icon: 'edit' },
    ];
    // Filtro por TIPO + por PERÍODO (DateRangeField). Sem período definido = tudo.
    const parseDay = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
    const pFrom = parseDay(histFrom), pTo = parseDay(histTo);
    const inPeriod = (atISO) => {
      if (!pFrom && !pTo) return true;
      const d = atISO ? new Date(atISO) : null;
      if (!d || isNaN(d)) return false;
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (pFrom && day < pFrom) return false;
      if (pTo && day > pTo) return false;
      return true;
    };
    const matchKind = (e) => histFilter === 'all' ? true
      : histFilter === 'stock' ? (e.kind === 'stock' || e.kind === 'out')
      : e.kind === histFilter;
    const shown = events.filter((e) => matchKind(e) && inPeriod(e.at));
    return (
      <>
      <Drawer
        title={`Histórico · ${item.name}`}
        subtitle={`Movimentações e vendas · cadastrado em ${item.since}`}
        onClose={onClose}
        width={616}
        footer={<><div style={{ flex: 1 }} /><ActionButton action="salvar" size="md" label="Exportar histórico" icon="download" efeito={false} onClick={() => setHistExportOpen(true)} /></>}>
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

          {/* Filtros — calendário primeiro da fila; tipos no padrão ActionButton (sm), como toggle */}
          <div className="col" style={{ gap: 10 }}>
            {/* Linha 1: tipos, justificados à direita */}
            <div className="row" style={{ gap: 12, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {FILTERS.map((f) => {
                const on = histFilter === f.id;
                const gray = f.gray ? { color: '#4B5563', background: '#EEF1F4', borderColor: 'color-mix(in oklab, #4B5563 28%, transparent)' } : {};
                return (
                  <ActionButton key={f.id} action={f.action} size="sm" icon={f.icon} label={f.label} efeito={false}
                    className="hist-fbtn"
                    onClick={() => { setHistFilter(f.id); if (f.id === 'all') { setHistFrom(''); setHistTo(''); } }}
                    style={{ height: 28, padding: '0 10px', fontSize: 12, gap: 5, ...gray, boxShadow: on ? '0 0 0 2px color-mix(in oklab, currentColor 40%, transparent)' : 'none' }} />);
              })}
            </div>
            {/* Linha 2: período, justificado à esquerda */}
            <div style={{ width: 280, maxWidth: '100%' }}>
              <DateRangeField from={histFrom} to={histTo} onChange={(f, t) => { setHistFrom(f || ''); setHistTo(t || ''); }} style={{ height: 32, fontSize: 12 }} />
            </div>
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
            shown.length === 0 ?
              <div style={{ padding: 28, textAlign: 'center' }}>
                <Ic name="history" size={28} style={{ opacity: .4 }} />
                <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 8 }}>{histFilter === 'all' ? <>Nenhuma movimentação ainda.<br />Cadastro, edições e (em breve) vendas aparecem aqui.</> : 'Nenhum evento deste tipo.'}</div>
              </div> :
            shown.map((e, i) => {
              const k = KIND[e.kind] || KIND.edit;
              return (
                <div key={i} className="prod-hist-row">
                  <div className="prod-hist-rail">
                    <div className="prod-hist-dot" style={{ background: k.color, boxShadow: `0 0 0 4px color-mix(in oklab, ${k.color} 14%, transparent)` }}>
                      <Ic name={k.ic} size={11} style={{ color: '#fff' }} />
                    </div>
                    {i < shown.length - 1 && <div className="prod-hist-line" />}
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
      </Drawer>
      {histExportOpen && <HistoryExportModal item={item} events={events} shown={shown} onClose={() => setHistExportOpen(false)} />}
      </>);
  }

  function PdvComingSoonDrawer({ item, onClose }) {
    const cfg = CAT_COLORS[item.cat] || { color: '#64748b', icon: 'tag' };
    return (
      <Drawer
        title="PDV · Nova venda"
        subtitle={`Iniciar venda de "${item.name}"`}
        onClose={onClose}
        width={420}
        footer={<><div style={{ flex: 1 }} /><ActionButton action="salvar" size="md" label="Em breve" icon="cart" disabled /></>}>
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

  // ─── Exportação (Excel / CSV) ───────────────────────────────────────────
  const _tipoLabel = (t) => t === 'servico' ? 'Serviço' : 'Produto';
  // Linhas planas (chaves em PT-BR) a partir das linhas do catálogo. Usa o _dto
  // (DTO completo da API) pra precisão; cai no row visível quando faltar.
  function exportRows(list) {
    return list.map((it) => {
      const d = it._dto || {};
      return {
        'Código': prodCode(it.id),
        'Nome': d.nome || it.name || '',
        'Tipo': _tipoLabel(d.tipo),
        'Categoria': d.categoria || it.cat || '',
        'Descrição curta': d.descricaoCurta || '',
        'Preço': Number(d.preco != null ? d.preco : it.priceN) || 0,
        'Preço promocional': d.precoPromo != null ? Number(d.precoPromo) : '',
        'Custo': d.custo != null ? Number(d.custo) : '',
        'Unidade': d.unidade || '',
        'Estoque': Number(d.estoque) || 0,
        'Estoque mínimo': Number(d.estoqueMin) || 0,
        'Controla estoque': d.controlaEstoque === false ? 'Não' : 'Sim',
        'Status': (d.ativo !== false) ? 'Ativo' : 'Inativo',
        'Vendas (un.)': Number(it.sales) || 0,
        'Criado em': it.since || '',
      };
    });
  }
  function _toCSV(rows) {
    if (!rows.length) return '﻿';
    const headers = Object.keys(rows[0]);
    const esc = (v) => {
      const s = String(v == null ? '' : v);
      return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [headers.join(';')];
    rows.forEach((r) => lines.push(headers.map((h) => esc(r[h])).join(';')));
    return '﻿' + lines.join('\r\n'); // BOM => acentos certos no Excel; ';' p/ PT-BR
  }
  function _download(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  function _todayStr() {
    const d = new Date(); const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function ExportModal({ items, filtered, onClose }) {
    const hasFilter = filtered.length !== items.length;
    const [fmt, setFmt] = React.useState('xlsx');
    const [scope, setScope] = React.useState(hasFilter ? 'filtrados' : 'todos');
    const list = scope === 'filtrados' ? filtered : items;
    const FORMATS = [
      { id: 'xlsx', label: 'Excel (.xlsx)', desc: 'Planilha pronta pro Excel/Sheets', icon: 'cube' },
      { id: 'csv', label: 'CSV (.csv)', desc: 'Texto universal (separado por ;)', icon: 'file-text' },
    ];
    const doExport = () => {
      const rows = exportRows(list);
      if (!rows.length) { window.showToast && window.showToast({ tipo: 'aviso', titulo: 'Nada para exportar', descricao: 'Não há itens na seleção atual.' }); return; }
      const base = 'catalogo-' + _todayStr();
      try {
        if (fmt === 'xlsx') {
          if (!window.XLSX) { window.showToast && window.showToast({ tipo: 'erro', titulo: 'Excel indisponível', descricao: 'A biblioteca de Excel não carregou — use CSV ou recarregue a página.' }); return; }
          const ws = window.XLSX.utils.json_to_sheet(rows);
          ws['!cols'] = Object.keys(rows[0]).map((h) => ({ wch: Math.max(12, h.length + 2) }));
          const wb = window.XLSX.utils.book_new();
          window.XLSX.utils.book_append_sheet(wb, ws, 'Catálogo');
          window.XLSX.writeFile(wb, base + '.xlsx');
        } else {
          _download(base + '.csv', new Blob([_toCSV(rows)], { type: 'text/csv;charset=utf-8;' }));
        }
        window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Exportação concluída', descricao: rows.length + (rows.length === 1 ? ' item exportado' : ' itens exportados') + ' em ' + (fmt === 'xlsx' ? 'Excel' : 'CSV') + '.' });
        onClose();
      } catch (e) {
        window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao exportar', descricao: (e && e.message) || 'Não foi possível gerar o arquivo.' });
      }
    };
    return (
      <Modal title="Exportar catálogo" onClose={onClose} size="sm"
        footer={<>
          <div style={{ flex: 1 }} />
          <ActionButton action="voltar" size="md" label="Cancelar" onClick={onClose} />
          <ActionButton action="salvar" size="md" label={'Exportar ' + list.length} icon="download" efeito={false} onClick={doExport} />
        </>}>
        <div className="col" style={{ gap: 14, padding: '4px 2px' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Formato</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {FORMATS.map((f) =>
                <button key={f.id} onClick={() => setFmt(f.id)}
                  style={{ textAlign: 'left', padding: 12, borderRadius: 10, cursor: 'pointer',
                    border: '1px solid ' + (fmt === f.id ? 'var(--accent)' : 'var(--border)'),
                    background: fmt === f.id ? 'var(--accent-soft)' : 'var(--surface)' }}>
                  <Ic name={f.icon} size={18} style={{ color: fmt === f.id ? 'var(--accent-700)' : 'var(--text-muted)' }} />
                  <div style={{ fontWeight: 700, marginTop: 6, color: fmt === f.id ? 'var(--accent-700)' : 'var(--text)' }}>{f.label}</div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{f.desc}</div>
                </button>)}
            </div>
          </div>
          {hasFilter &&
            <div>
              <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Itens</div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn-sm" onClick={() => setScope('filtrados')} style={scope === 'filtrados' ? { borderColor: 'var(--accent)', color: 'var(--accent-700)', background: 'var(--accent-soft)' } : null}>Filtrados ({filtered.length})</button>
                <button className="btn btn-sm" onClick={() => setScope('todos')} style={scope === 'todos' ? { borderColor: 'var(--accent)', color: 'var(--accent-700)', background: 'var(--accent-soft)' } : null}>Todos ({items.length})</button>
              </div>
            </div>}
          <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>
            Serão exportadas {list.length} {list.length === 1 ? 'linha' : 'linhas'} com Código, Nome, Categoria, Preço, Estoque, Status e mais.
          </div>
        </div>
      </Modal>);
  }

  // ─── Importação (Excel / CSV) ───────────────────────────────────────────
  const _parseNum = (s) => {
    if (typeof s === 'number') return s;
    let t = String(s == null ? '' : s).replace(/[^\d,.-]/g, '');
    if (t.indexOf(',') > -1 && t.indexOf('.') > -1) t = t.replace(/\./g, '').replace(',', '.'); // 1.234,56
    else if (t.indexOf(',') > -1) t = t.replace(',', '.'); // 1234,56
    return Number(t);
  };
  // Modelo (mesmas colunas do export) com 1 linha de exemplo.
  const IMPORT_TEMPLATE = [{
    'Código': '', 'Nome': 'Exemplo Produto', 'Tipo': 'Produto', 'Categoria': 'Skincare',
    'Descrição curta': 'Descrição breve do item', 'Preço': 99.9, 'Preço promocional': '', 'Custo': 40,
    'Unidade': 'UN', 'Estoque': 10, 'Estoque mínimo': 2, 'Controla estoque': 'Sim',
    'Status': 'Ativo', 'Vendas (un.)': '', 'Criado em': '',
  }];

  // Valida e mapeia as linhas cruas do arquivo -> { status, dto, ... }.
  // Regra de duplicado: mesmo CÓDIGO de um item já existente OU repetido no arquivo
  // (nomes PODEM repetir). Linhas sem código nunca são duplicadas.
  function validateImport(raw, items) {
    const existing = new Set(items.map((it) => prodCode(it.id)));
    const seen = new Set();
    return raw.map((r, idx) => {
      const get = (k) => { const v = r[k]; return v == null ? '' : String(v).trim(); };
      const val = (keys) => { for (let j = 0; j < keys.length; j++) { const v = get(keys[j]); if (v) return v; } return ''; };
      const nome = val(['Nome', 'nome', 'NOME']);
      const codigo = val(['Código', 'Codigo', 'código', 'codigo', 'CÓDIGO']);
      const precoRaw = val(['Preço', 'Preco', 'preço', 'preco', 'PREÇO']);
      const errors = [];
      if (!nome) errors.push('Nome vazio');
      const preco = precoRaw ? _parseNum(precoRaw) : 0;
      if (precoRaw && (isNaN(preco) || preco < 0)) errors.push('Preço inválido');
      let dup = false;
      if (codigo) {
        if (existing.has(codigo) || seen.has(codigo)) dup = true;
        seen.add(codigo);
      }
      const promoRaw = val(['Preço promocional', 'Preco promocional']);
      const custoRaw = val(['Custo', 'custo']);
      const dto = {
        tipo: /servi/i.test(val(['Tipo', 'tipo'])) ? 'servico' : 'produto',
        nome,
        categoria: val(['Categoria', 'categoria']),
        descricaoCurta: val(['Descrição curta', 'Descricao curta', 'descrição curta']),
        preco: isNaN(preco) ? 0 : preco,
        precoPromo: promoRaw ? _parseNum(promoRaw) : null,
        custo: custoRaw ? _parseNum(custoRaw) : null,
        unidade: val(['Unidade', 'unidade']) || 'un',
        estoque: _parseNum(val(['Estoque', 'estoque'])) || 0,
        estoqueMin: _parseNum(val(['Estoque mínimo', 'Estoque minimo', 'estoque mínimo'])) || 0,
        controlaEstoque: !/n[ãa]o/i.test(val(['Controla estoque', 'controla estoque'])),
        ativo: !/inativo/i.test(val(['Status', 'status'])),
      };
      const status = errors.length ? 'erro' : dup ? 'duplicado' : 'ok';
      return { idx: idx + 2, nome, codigo, errors, dup, status, dto }; // idx+2: linha real (1 = cabeçalho)
    });
  }

  function ImportModal({ items, onImported, onClose }) {
    const [step, setStep] = React.useState('pick'); // pick | preview | importing | done
    const [parsing, setParsing] = React.useState(false);
    const [fileName, setFileName] = React.useState('');
    const [rows, setRows] = React.useState([]);
    const [progress, setProgress] = React.useState({ done: 0, total: 0 });
    const [result, setResult] = React.useState(null);
    const inputRef = React.useRef(null);

    const handleFile = async (file) => {
      if (!file) return;
      if (!window.XLSX) { window.showToast && window.showToast({ tipo: 'erro', titulo: 'Leitor indisponível', descricao: 'A biblioteca de planilhas não carregou — recarregue a página.' }); return; }
      setFileName(file.name); setParsing(true);
      try {
        const buf = await file.arrayBuffer();
        const wb = window.XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = window.XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (!raw.length) { window.showToast && window.showToast({ tipo: 'aviso', titulo: 'Planilha vazia', descricao: 'Não encontrei linhas no arquivo.' }); setParsing(false); return; }
        setRows(validateImport(raw, items));
        setStep('preview');
      } catch (e) {
        window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao ler arquivo', descricao: (e && e.message) || 'Formato não reconhecido. Use .xlsx ou .csv.' });
      } finally { setParsing(false); }
    };

    const counts = React.useMemo(() => ({
      ok: rows.filter((r) => r.status === 'ok').length,
      dup: rows.filter((r) => r.status === 'duplicado').length,
      err: rows.filter((r) => r.status === 'erro').length,
    }), [rows]);

    const doImport = async () => {
      const toCreate = rows.filter((r) => r.status === 'ok');
      if (!toCreate.length) return;
      setStep('importing'); setProgress({ done: 0, total: toCreate.length });
      let created = 0, failed = 0;
      for (let k = 0; k < toCreate.length; k++) {
        try { await window.API.createProduto(toCreate[k].dto); created++; }
        catch (e) { failed++; }
        setProgress({ done: k + 1, total: toCreate.length });
      }
      setResult({ created, failed, skipped: counts.dup + counts.err });
      setStep('done');
      if (created && onImported) onImported();
    };

    const baixarModelo = () => {
      try {
        if (window.XLSX) {
          const ws = window.XLSX.utils.json_to_sheet(IMPORT_TEMPLATE);
          const wb = window.XLSX.utils.book_new();
          window.XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
          window.XLSX.writeFile(wb, 'catalogo-modelo.xlsx');
        } else {
          _download('catalogo-modelo.csv', new Blob([_toCSV(IMPORT_TEMPLATE)], { type: 'text/csv;charset=utf-8;' }));
        }
      } catch (e) {}
    };

    const STATUS_CFG = {
      ok: { color: '#10b981', label: 'OK', ic: 'check' },
      duplicado: { color: '#f59e0b', label: 'Duplicado', ic: 'alert' },
      erro: { color: '#ef4444', label: 'Erro', ic: 'x' },
    };

    return (
      <Drawer title="Importar catálogo" subtitle="Excel (.xlsx) ou CSV · cria itens em lote" onClose={onClose} width={680}
        footer={
          step === 'preview' ? <>
            <ActionButton action="editar" size="md" icon="download" label="Baixar modelo" onClick={baixarModelo} />
            <div style={{ flex: 1 }} />
            <ActionButton action="salvar" size="md" label={'Importar ' + counts.ok} icon="check" efeito={false} onClick={doImport} disabled={!counts.ok} />
          </> : step === 'done' ? <>
            <div style={{ flex: 1 }} />
            <ActionButton action="salvar" size="md" label="Concluir" icon="check" efeito={false} onClick={onClose} />
          </> : <>
            <ActionButton action="editar" size="md" icon="download" label="Baixar modelo" onClick={baixarModelo} />
            <div style={{ flex: 1 }} />
          </>
        }>
        {step === 'pick' &&
          <div className="col" style={{ gap: 14 }}>
            <div onClick={() => inputRef.current && inputRef.current.click()} className="cat-import-drop">
              <Ic name="upload" size={32} className="cat-import-ic" />
              <div style={{ fontWeight: 700, marginTop: 10 }}>{parsing ? 'Lendo arquivo…' : 'Clique para escolher um arquivo'}</div>
              <div className="muted cat-import-sub" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>Aceita .xlsx, .xls ou .csv{fileName ? ' · ' + fileName : ''}</div>
              <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files && e.target.files[0])} />
            </div>
            <div className="muted" style={{ fontSize: 'var(--type-sm)', lineHeight: 1.5 }}>
              O arquivo deve ter as colunas do modelo (Nome, Tipo, Categoria, Preço, Estoque…). <strong>Nome</strong> é obrigatório. Itens com o <strong>mesmo Código</strong> de um já existente (ou repetido no arquivo) são marcados como duplicados e <strong>não</strong> são importados — nomes podem repetir.
            </div>
          </div>}

        {step === 'preview' &&
          <div className="col" style={{ gap: 12 }}>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="prod-sales-pill">{counts.ok} prontos</span>
              {counts.dup > 0 && <span className="prod-stock-livre" style={{ background: '#fffbeb', color: '#b45309' }}>{counts.dup} duplicados</span>}
              {counts.err > 0 && <span className="prod-stock-out">{counts.err} com erro</span>}
              <div className="spacer" />
              <span className="muted" style={{ fontSize: 'var(--type-sm)' }}>{rows.length} linhas no arquivo</span>
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div className="col" style={{ maxHeight: 440, overflowY: 'auto' }}>
                {rows.map((r) => {
                  const c = STATUS_CFG[r.status];
                  return (
                    <div key={r.idx} className="row" style={{ gap: 10, padding: '8px 12px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: c.color, fontWeight: 700, fontSize: 11, minWidth: 92 }}>
                        <Ic name={c.ic} size={12} /> {c.label}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.nome || <span className="muted">(sem nome)</span>}</div>
                        <div className="muted" style={{ fontSize: 11 }}>
                          linha {r.idx}{r.codigo ? ' · cód ' + r.codigo : ''}{r.dto.categoria ? ' · ' + r.dto.categoria : ''} · {fmtBRL(r.dto.preco)}
                          {r.errors.length ? ' · ' + r.errors.join(', ') : ''}
                          {r.dup ? ' · código já existe' : ''}
                        </div>
                      </div>
                    </div>);
                })}
              </div>
            </div>
          </div>}

        {step === 'importing' &&
          <div className="col" style={{ gap: 12, alignItems: 'center', padding: '24px 8px' }}>
            <div style={{ fontWeight: 700 }}>Importando… {progress.done}/{progress.total}</div>
            <div style={{ width: '100%', height: 8, background: 'var(--surface-3)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: (progress.total ? Math.round(progress.done / progress.total * 100) : 0) + '%', height: '100%', background: 'var(--accent)', transition: 'width .2s' }} />
            </div>
          </div>}

        {step === 'done' && result &&
          <div className="col" style={{ gap: 8, alignItems: 'center', padding: '24px 8px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#ecfdf5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic name="check-double" size={26} /></div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{result.created} {result.created === 1 ? 'item importado' : 'itens importados'}</div>
            <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>
              {result.skipped > 0 ? result.skipped + ' ignorados (duplicados/erros). ' : ''}{result.failed > 0 ? result.failed + ' falharam ao gravar.' : ''}
              {!result.skipped && !result.failed ? 'Tudo certo!' : ''}
            </div>
          </div>}
      </Drawer>);
  }

  // ─── Exportação do HISTÓRICO (mesmo modelo do ExportModal da lista) ─────
  const _HIST_KIND_LABEL = { sale: 'Venda', stock: 'Entrada de estoque', out: 'Saída', edit: 'Edição', created: 'Cadastro' };
  function historyRows(list) {
    return list.map((e) => ({
      'Data': e.when || '',
      'Tipo': _HIST_KIND_LABEL[e.kind] || e.kind || '',
      'Quantidade': e.qty != null ? e.qty : '',
      'Valor': e.value != null ? Number(e.value) : '',
      'Autor': e.who || '',
      'Descrição': e.note || '',
    }));
  }

  function HistoryExportModal({ item, events, shown, onClose }) {
    const hasFilter = shown.length !== events.length;
    const [fmt, setFmt] = React.useState('xlsx');
    const [scope, setScope] = React.useState(hasFilter ? 'filtrados' : 'todos');
    const list = scope === 'filtrados' ? shown : events;
    const FORMATS = [
      { id: 'xlsx', label: 'Excel (.xlsx)', desc: 'Planilha pronta pro Excel/Sheets', icon: 'cube' },
      { id: 'csv', label: 'CSV (.csv)', desc: 'Texto universal (separado por ;)', icon: 'file-text' },
    ];
    const doExport = () => {
      const rows = historyRows(list);
      if (!rows.length) { window.showToast && window.showToast({ tipo: 'aviso', titulo: 'Nada para exportar', descricao: 'Não há eventos na seleção atual.' }); return; }
      const slug = ((item && item.name) || 'item').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'item';
      const base = 'historico-' + slug + '-' + _todayStr();
      try {
        if (fmt === 'xlsx') {
          if (!window.XLSX) { window.showToast && window.showToast({ tipo: 'erro', titulo: 'Excel indisponível', descricao: 'A biblioteca de Excel não carregou — use CSV ou recarregue a página.' }); return; }
          const ws = window.XLSX.utils.json_to_sheet(rows);
          ws['!cols'] = Object.keys(rows[0]).map((h) => ({ wch: Math.max(12, h.length + 2) }));
          const wb = window.XLSX.utils.book_new();
          window.XLSX.utils.book_append_sheet(wb, ws, 'Histórico');
          window.XLSX.writeFile(wb, base + '.xlsx');
        } else {
          _download(base + '.csv', new Blob([_toCSV(rows)], { type: 'text/csv;charset=utf-8;' }));
        }
        window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Exportação concluída', descricao: rows.length + (rows.length === 1 ? ' evento exportado' : ' eventos exportados') + ' em ' + (fmt === 'xlsx' ? 'Excel' : 'CSV') + '.' });
        onClose();
      } catch (e) {
        window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao exportar', descricao: (e && e.message) || 'Não foi possível gerar o arquivo.' });
      }
    };
    return (
      <Modal title="Exportar histórico" onClose={onClose} size="sm"
        footer={<>
          <div style={{ flex: 1 }} />
          <ActionButton action="voltar" size="md" label="Cancelar" onClick={onClose} />
          <ActionButton action="salvar" size="md" label={'Exportar ' + list.length} icon="download" efeito={false} onClick={doExport} />
        </>}>
        <div className="col" style={{ gap: 14, padding: '4px 2px' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Formato</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {FORMATS.map((f) =>
                <button key={f.id} onClick={() => setFmt(f.id)}
                  style={{ textAlign: 'left', padding: 12, borderRadius: 10, cursor: 'pointer',
                    border: '1px solid ' + (fmt === f.id ? 'var(--accent)' : 'var(--border)'),
                    background: fmt === f.id ? 'var(--accent-soft)' : 'var(--surface)' }}>
                  <Ic name={f.icon} size={18} style={{ color: fmt === f.id ? 'var(--accent-700)' : 'var(--text-muted)' }} />
                  <div style={{ fontWeight: 700, marginTop: 6, color: fmt === f.id ? 'var(--accent-700)' : 'var(--text)' }}>{f.label}</div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{f.desc}</div>
                </button>)}
            </div>
          </div>
          {hasFilter &&
            <div>
              <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Eventos</div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn-sm" onClick={() => setScope('filtrados')} style={scope === 'filtrados' ? { borderColor: 'var(--accent)', color: 'var(--accent-700)', background: 'var(--accent-soft)' } : null}>Filtrados ({shown.length})</button>
                <button className="btn btn-sm" onClick={() => setScope('todos')} style={scope === 'todos' ? { borderColor: 'var(--accent)', color: 'var(--accent-700)', background: 'var(--accent-soft)' } : null}>Todos ({events.length})</button>
              </div>
            </div>}
          <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>
            Exporta {list.length} {list.length === 1 ? 'evento' : 'eventos'} com Data, Tipo, Quantidade, Valor, Autor e Descrição.
          </div>
        </div>
      </Modal>);
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

        /* Código com largura FIXA (não 'auto'): cada linha é um grid próprio, então
           'auto' dava larguras diferentes entre cabeçalho e linhas e desalinhava
           TODAS as colunas seguintes + o separador. Fixo => todos os grids iguais. */
        .prod-row { display: grid; grid-template-columns: 32px 96px 2.2fr 1fr 1fr .9fr .8fr 64px 160px; gap: 6px; padding: 12px; align-items: center; }
        /* Categoria/Preço/Estoque/Vendas/Status mais juntos (gap menor acima);
           o espaço economizado vai pro vão Descrição→Categoria via esta margem. */
        .prod-cell-cat { margin-left: 16px; }
        .prod-body { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; margin: 0 8px; transition: box-shadow .15s, border-color .15s; }
        .prod-body:hover { box-shadow: 0 2px 10px rgba(15,23,42,.06); border-color: var(--border-strong); }
        .prod-head { background: var(--surface-2); font-size: 11px; font-weight: 600; color: var(--text-muted); padding: 12px; margin: 0 8px; border-bottom: 1px solid var(--border); border-left: 2px solid transparent; text-transform: uppercase; letter-spacing: .03em; }
        .prod-cell { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .prod-cell-check { align-items: flex-start; }
        .prod-cell-name { display: flex; flex-direction: row; gap: 12px; align-items: center; }
        .prod-cell-toggle, .prod-cell-actions { flex-direction: row; align-items: center; }
        .prod-cell-actions { gap: 4px; justify-content: flex-end; }
        /* Coluna Código: valor + separador vertical. 12px número↔separador (gap do flex);
           12px separador↔Descrição (margin-right 6 + column-gap 6 = 12). */
        .prod-cell-code { flex-direction: row; align-items: center; gap: 12px; margin-right: 6px; }
        .prod-code { font-size: 12px; font-weight: 700; color: var(--text-muted); font-variant-numeric: tabular-nums; letter-spacing: .02em; white-space: nowrap; }
        /* margin-left:auto cola o separador na BORDA DIREITA da coluna em ambos
           (cabeçalho e linha) -> ficam no MESMO x, alinhados verticalmente.
           Na linha (célula mais larga) não há folga, então os 12px do código→sep
           se mantêm; no cabeçalho a folga é absorvida e o sep encosta na direita. */
        .prod-code-sep { width: 1px; height: 28px; background: var(--border); flex-shrink: 0; margin-left: auto; }
        /* Cabeçalho alinhado com o TEXTO do valor (1ª letra do título sobre a 1ª
           letra do valor): recua cada título pelo "respiro" do conteúdo da coluna.
           Escopo .prod-head -> só o cabeçalho; as linhas não se mexem. */
        .prod-head .prod-cell-name  { padding-left: 52px; }  /* nome (thumb 40 + gap 12) */
        .prod-head .prod-cell-cat   { padding-left: 20px; }  /* pílula: pad 9 + ponto 6 + gap 5 */
        .prod-head .prod-cell-stock { padding-left: 23px; }  /* pílula: pad 8 + ícone 11 + gap 4 */
        .prod-head .prod-cell-sales { padding-left: 25px; }  /* pílula: pad 9 + ícone 11 + gap 5 */
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
        /* Editar: cinza no repouso (igual aos demais); azul do kit só no hover. */
        .prod-iconbtn-edit:hover { color: #165EEE; border-color: #165EEE; background: #EAF0FE; }

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

        /* Dropzone do Importar: hover no verde do kit (fundo #C9F0D3 + fonte #3DA767). */
        .cat-import-drop { border: 2px dashed var(--border-strong); border-radius: 12px; padding: 32px; text-align: center; cursor: pointer; background: var(--surface-2); transition: background .15s, border-color .15s, color .15s; }
        .cat-import-drop:hover { background: #C9F0D3; border-color: #3DA767; color: #3DA767; }
        .cat-import-ic { opacity: .5; transition: opacity .15s; }
        .cat-import-drop:hover .cat-import-ic { opacity: 1; }
        .cat-import-drop:hover .cat-import-sub { color: #3DA767; }

        /* Filtros do Histórico: ícone proporcional ao botão reduzido (CSS vence o attr do svg). */
        .hist-fbtn svg { width: 14px; height: 14px; }
      `}</style>);
  }

  // Expose. The old AdminCatalog in admin.jsx will defer to this if present.
  window.CatalogPage = CatalogPage;
})();
