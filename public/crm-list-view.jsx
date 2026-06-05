// crm-list-view.jsx — CRM funnel rendered as a list (alternate view of the kanban board)

(function () {
  function fmtBRL(v) {
    return 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Small action icon-button, same vocabulary as the kanban card footer
  function ActionBtn({ icon, title, onClick, tint, size }) {
    const [hov, setHov] = React.useState(false);
    return (
      <button
        className="crml-actbtn"
        onClick={(e) => {e.stopPropagation();onClick && onClick();}}
        title={title}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: hov ? 'var(--surface-2)' : 'transparent',
          color: hov ? tint || 'var(--text)' : tint || 'var(--text-faint)',
          transition: 'background .12s ease, color .12s ease', padding: 0, flexShrink: 0
        }}>
        <Ic name={icon} size={size || 15} />
      </button>);
  }

  // initials → tint pair for avatar
  const AVATAR_BG = ['#fde68a', '#fbcfe8', '#bfdbfe', '#bbf7d0', '#e9d5ff', '#fed7aa', '#fecaca', '#a7f3d0', '#fde2e2'];
  function avatarColor(name) {
    const n = (name || '?').length;
    return AVATAR_BG[n % AVATAR_BG.length];
  }

  // Deterministic attendant pick for human-handled cards (skips inactive members)
  function pickAttendant(card) {
    if (card.attendant) return card.attendant;
    const team = (window.TEAM || []).filter((m) => m.status === 'ativo');
    if (team.length === 0) return null;
    const key = (card._id || card.name || '');
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    return team[h % team.length];
  }

  // Date "15 Jun 2026" + synthetic time → "15/06/26 às 16h30"
  const PT_MONTHS = { jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06', jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12' };
  function formatCardDateTime(card) {
    const raw = (card.date || '').trim();
    let dd = '01', mm = '01', yy = '26';
    const parts = raw.split(/\s+/);
    if (parts.length >= 3) {
      dd = parts[0].padStart(2, '0');
      const mKey = parts[1].toLowerCase().slice(0, 3);
      mm = PT_MONTHS[mKey] || '01';
      yy = parts[2].slice(-2);
    }
    // Synthetic time, stable per card
    const key = (card._id || card.name || '');
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    const hour = String(8 + h % 12).padStart(2, '0');
    const minute = String(h * 7 % 4 * 15).padStart(2, '0');
    return `${dd}/${mm}/${yy} às ${hour}h${minute}`;
  }

  const ALL_COLUMNS = [
  { id: 'nome', label: 'Nome', required: true },
  { id: 'contatos', label: 'Contatos' },
  { id: 'tags', label: 'Valor / Tags' },
  { id: 'fase', label: 'Fase' },
  { id: 'data', label: 'Data' }];


  function PhaseStrip({ phases, cards, selectedPhase, onSelectPhase }) {
    const totalCount = cards.length;
    const totalValue = cards.reduce((s, c) => s + (c.value || 0), 0);
    const all = [{ id: 'all', label: 'TODOS', color: 'var(--text-muted)' }, ...phases];
    return (
      <div className="crml-phasestrip">
        {all.map((p, i) => {
          const isAll = p.id === 'all';
          const phaseCards = isAll ? cards : cards.filter((c) => c.phase === p.id);
          const v = phaseCards.reduce((s, c) => s + (c.value || 0), 0);
          const n = isAll ? totalCount : phaseCards.length;
          const sel = selectedPhase === p.id;
          const isFirst = i === 0;
          const isLast = i === all.length - 1;
          const cls = `crml-phase ${isFirst ? 'is-first' : ''} ${isLast ? 'is-last' : ''} ${sel ? 'is-selected' : ''}`.trim();
          const color = isAll ? 'var(--text-muted)' : p.color;
          return (
            <div key={p.id}
            className={cls}
            onClick={() => onSelectPhase(p.id)}
            style={{ '--ph': color, background: sel ? color : 'var(--border-strong)' }}>
              <div className="crml-phase-inner" style={{ background: sel ? `color-mix(in oklab, ${color} 10%, white)` : 'var(--surface)' }}>
                <div className="row" style={{ gap: 8, alignItems: 'center', minWidth: 0 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 0 2px color-mix(in oklab, ${color} 25%, transparent)` }} />
                  <span style={{ fontWeight: 700, fontSize: 'var(--type-sm)', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-.01em' }}>{isAll ? 'Todos' : p.label.charAt(0) + p.label.slice(1).toLowerCase()}</span>
                </div>
                <div className="row" style={{ gap: 10, alignItems: 'baseline', marginTop: 4 }}>
                  <span className="tnum" style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{fmtBRL(v).replace(',00', ',00')}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{n === 0 ? 'Nenhum negócio' : `${n} negócio${n > 1 ? 's' : ''}`}</span>
                </div>
              </div>
            </div>);
        })}
      </div>);
  }

  function CRMListView({ phases, cards, onOpenCard, onChat, onAppointment, onTogglePin, onDelete }) {
    const [query, setQuery] = React.useState('');
    const [phaseFilter, setPhaseFilter] = React.useState('all');
    const [showFilters, setShowFilters] = React.useState(false);
    const [filterTags, setFilterTags] = React.useState(() => new Set());
    const [filterAttendance, setFilterAttendance] = React.useState(() => new Set()); // 'ia' or 'humano'
    const [pinnedOnly, setPinnedOnly] = React.useState(false);
    const [visibleCols, setVisibleCols] = React.useState(() => new Set(ALL_COLUMNS.map((c) => c.id)));

    const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const phaseById = React.useMemo(() => Object.fromEntries(phases.map((p) => [p.id, p])), [phases]);

    // Unique tag pool from cards
    const tagPool = React.useMemo(() => {
      const map = new Map();
      cards.forEach((c) => (c.tags || []).forEach((t) => {if (!map.has(t.label)) map.set(t.label, t);}));
      return Array.from(map.values());
    }, [cards]);

    const filtered = React.useMemo(() => {
      const q = norm(query.trim());
      const base = cards.filter((c) => {
        if (phaseFilter !== 'all' && c.phase !== phaseFilter) return false;
        if (q) {
          const inName = norm(c.name).includes(q);
          const inCompany = norm(c.company || '').includes(q);
          const inEmail = norm(c.email || '').includes(q);
          const inPhone = (c.phone || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''));
          if (!inName && !inCompany && !inEmail && !inPhone) return false;
        }
        if (filterTags.size > 0) {
          const has = (c.tags || []).some((t) => filterTags.has(t.label));
          if (!has) return false;
        }
        if (filterAttendance.size > 0) {
          const kind = c.ai ? 'ia' : 'humano';
          if (!filterAttendance.has(kind)) return false;
        }
        if (pinnedOnly && !c.pinned) return false;
        return true;
      });
      // Pinned cards first (most recently pinned at top), preserve relative order for the rest
      return base.slice().sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        if (a.pinned && b.pinned) return (b.pinnedAt || 0) - (a.pinnedAt || 0);
        return 0;
      });
    }, [cards, query, phaseFilter, filterTags, filterAttendance, pinnedOnly]);

    const toggleSetVal = (setter, val) => setter((prev) => {const n = new Set(prev);n.has(val) ? n.delete(val) : n.add(val);return n;});
    const activeFilters = filterTags.size + filterAttendance.size + (pinnedOnly ? 1 : 0);
    const clearFilters = () => {setFilterTags(new Set());setFilterAttendance(new Set());setPinnedOnly(false);};
    const colVisible = (id) => visibleCols.has(id);

    // Build grid template based on visible columns
    const gridTemplate = React.useMemo(() => {
      const cols = [];
      if (colVisible('nome')) cols.push('1.6fr');
      if (colVisible('contatos')) cols.push('1.3fr');
      if (colVisible('tags')) cols.push('1.3fr');
      if (colVisible('fase')) cols.push('1.1fr');
      if (colVisible('data')) cols.push('.9fr');
      cols.push('220px'); // actions
      return cols.join(' ');
    }, [visibleCols]);

    return (
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '12px 16px', background: '#F1F4F8' }}>
        <CRMListStyles gridTemplate={gridTemplate} />

        {/* Toolbar */}
        <div className="card" style={{ padding: 12, marginBottom: 10 }}>
          <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: 220, maxWidth: 360 }}>
              <Ic name="search" size={13} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }} />
              <input className="input" placeholder="Pesquisar nome, empresa, e-mail ou telefone..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ paddingLeft: 40, width: '100%' }} />
              {query &&
              <button onClick={() => setQuery('')} className="btn btn-ghost btn-icon" style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 26, height: 26 }} title="Limpar">
                  <Ic name="x" size={12} />
                </button>}
            </div>
            <span className="muted" style={{ fontSize: 'var(--type-sm)', whiteSpace: 'nowrap' }}>
              {filtered.length.toLocaleString('pt-BR')} card{filtered.length === 1 ? '' : 's'}
            </span>
            <div className="spacer" />
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

              <div className="crml-filter-grid">
                {/* Destaque */}
                <div className="crml-fblock">
                  <div className="crml-fcat">Destaque</div>
                  <div className="crml-fchips">
                    <span
                      onClick={() => setPinnedOnly((v) => !v)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 9px', borderRadius: 999,
                        border: `1px solid ${pinnedOnly ? '#16A872' : 'var(--border)'}`,
                        background: pinnedOnly ? '#E3F3E5' : 'var(--surface)',
                        color: pinnedOnly ? '#0f7a52' : 'var(--text-muted)',
                        cursor: 'pointer', fontSize: 11, fontWeight: 600
                      }}>
                      <Ic name="pin" size={10} />Fixados
                    </span>
                  </div>
                </div>

                {/* Tags */}
                <div className="crml-fblock">
                  <div className="crml-fcat">Tags</div>
                  <div className="crml-fchips">
                    {tagPool.length === 0 ?
                  <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Nenhuma tag nos cards.</span> :

                  tagPool.map((t) => {
                    const on = filterTags.has(t.label);
                    return (
                      <span key={t.label} onClick={() => toggleSetVal(setFilterTags, t.label)} style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 999, background: on ? `color-mix(in oklab, ${t.color} 22%, white)` : `color-mix(in oklab, ${t.color} 12%, white)`, color: t.color, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${on ? t.color : 'transparent'}` }}>
                          {t.label}
                        </span>);
                  })}
                  </div>
                </div>

                {/* Atendimento */}
                <div className="crml-fblock">
                  <div className="crml-fcat">Atendimento</div>
                  <div className="crml-fchips">
                    {[
                  { id: 'ia', label: 'Agente IA', icon: 'sparkles' },
                  { id: 'humano', label: 'Humano', icon: 'user' }].
                  map((a) => {
                    const on = filterAttendance.has(a.id);
                    return (
                      <span key={a.id} onClick={() => toggleSetVal(setFilterAttendance, a.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--accent-soft)' : 'var(--surface)', color: on ? 'var(--accent-700)' : 'var(--text-muted)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                          <Ic name={a.icon} size={10} />{a.label}
                        </span>);
                  })}
                  </div>
                </div>

                {/* Columns visibility */}
                <div className="crml-fblock">
                  <div className="crml-fcat">Colunas visíveis</div>
                  <div className="crml-fchips">
                    {ALL_COLUMNS.map((c) => {
                    const on = visibleCols.has(c.id);
                    const disabled = c.required;
                    return (
                      <span key={c.id}
                      onClick={() => {
                        if (disabled) return;
                        const next = new Set(visibleCols);
                        if (next.has(c.id)) next.delete(c.id);else
                        next.add(c.id);
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

        {/* Phase strip (filter by phase) */}
        <PhaseStrip phases={phases} cards={cards} selectedPhase={phaseFilter} onSelectPhase={setPhaseFilter} />

        {/* List */}
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, marginTop: 10 }}>
          <div className="crml-row crml-head">
            {colVisible('nome') && <div className="crml-cell crml-cell-name">Nome</div>}
            {colVisible('contatos') && <div className="crml-cell crml-cell-contacts">Contatos</div>}
            {colVisible('tags') && <div className="crml-cell crml-cell-tags">Valor / Tags</div>}
            {colVisible('fase') && <div className="crml-cell crml-cell-data">Fase</div>}
            {colVisible('data') && <div className="crml-cell crml-cell-date">Data</div>}
            <div className="crml-cell crml-cell-actions">Ações</div>
          </div>

          <div className="crml-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 0', background: 'var(--surface-2)' }}>
            {filtered.length === 0 ?
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-faint)', background: 'var(--surface)' }}>
                <Ic name="leads" size={36} style={{ opacity: .4 }} />
                <div style={{ marginTop: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Nenhum card encontrado</div>
                <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>Ajuste a busca ou o filtro de fase.</div>
              </div> :

            filtered.map((c) => {
              const phase = phaseById[c.phase] || { label: c.phase, color: '#94a3b8' };
              const phaseIdx = phases.findIndex((p) => p.id === c.phase);
              const phaseCount = phases.length || 1;
              const initial = (c.name || '?')[0].toUpperCase();
              return (
                <div key={c._id} className={`crml-row crml-body${c.pinned ? ' crml-pinned' : ''}`} style={{ cursor: 'pointer' }} onClick={() => onOpenCard && onOpenCard(c)}>
                    {colVisible('nome') &&
                  <div className="crml-cell crml-cell-name">
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: avatarColor(c.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 'var(--type-sm)', color: 'var(--text)', flexShrink: 0 }}>{initial}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="crml-name">{c.name}</div>
                        <div className="crml-sub row" style={{ gap: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <Ic name="building" size={11} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.company || '—'}</span>
                        </div>
                      </div>
                    </div>}

                    {colVisible('contatos') &&
                  <div className="crml-cell crml-cell-contacts">
                      <div className="row" style={{ gap: 4, color: 'var(--text-muted)', fontSize: 'var(--type-sm)' }}>
                        <Ic name="phone" size={11} />{c.phone}
                      </div>
                      {c.email &&
                    <div className="row" style={{ gap: 4, color: 'var(--text-muted)', fontSize: 'var(--type-sm)' }}>
                        <Ic name="mail" size={11} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email}</span>
                      </div>}
                    </div>}

                    {colVisible('tags') &&
                  <div className="crml-cell crml-cell-tags">
                      <span className="tnum" style={{ fontSize: 'var(--type-md)', fontWeight: 800, color: 'var(--accent-700)', letterSpacing: '-.01em' }}>{fmtBRL(c.value)}</span>
                      <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
                        {(c.tags || []).map((t, i) =>
                      <span key={i} style={{ padding: '3px 8px', borderRadius: 999, background: `color-mix(in oklab, ${t.color} 14%, white)`, color: t.color, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', border: `1px solid color-mix(in oklab, ${t.color} 26%, transparent)` }}>{t.label}</span>)}
                      </div>
                    </div>}

                    {colVisible('fase') &&
                  <div className="crml-cell crml-cell-data">
                      <span style={{
                      alignSelf: 'flex-start',
                      display: 'inline-block',
                      padding: '4px 10px',

                      border: `1.5px solid ${phase.color}`,
                      background: `color-mix(in oklab, ${phase.color} 12%, white)`,
                      color: phase.color,
                      fontWeight: 700,
                      fontSize: 'var(--type-sm)',
                      letterSpacing: '.03em',
                      whiteSpace: 'nowrap',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis', borderRadius: "999px"
                    }}>{phase.label}</span>
                      <div className="crml-progress" title={`${phaseIdx + 1} de ${phaseCount} fases`}>
                        {phases.map((_p, i) =>
                      <span key={i} className={`crml-seg${i <= phaseIdx ? ' crml-seg-on' : ''}`} />)}
                      </div>
                    </div>}

                    {colVisible('data') &&
                  <div className="crml-cell crml-cell-date">
                      <span className="tnum" style={{ fontSize: 'var(--type-sm)', color: 'var(--text)', fontWeight: 500, whiteSpace: 'nowrap' }}>{formatCardDateTime(c)}</span>
                      {c.ai ?
                      <span className="row" style={{ gap: 4, fontSize: 11, color: 'var(--ai-strong)', marginTop: 2 }}>
                        <Ic name="sparkles" size={11} /> IA atendendo
                      </span> :
                      (() => {
                        const att = pickAttendant(c);
                        if (!att) return null;
                        return (
                          <span className="row" style={{ gap: 4, fontSize: 11, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={att.name}>
                            <Ic name="user" size={11} />
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{att.name}</span>
                          </span>);
                      })()}
                    </div>}

                    {/* 5 action icons + vertical divider on the left of chat */}
                    <div className="crml-cell crml-cell-actions" onClick={(e) => e.stopPropagation()}>
                      <span className="crml-actions-divider" aria-hidden="true" />
                      <ActionBtn icon="chat" title="Bate-papo" onClick={() => onChat && onChat(c)} />
                      <ActionBtn icon="file-text" title="Proposta" onClick={() => {}} />
                      <ActionBtn icon={c.pinned ? 'pin-off' : 'pin'} title={c.pinned ? 'Desafixar' : 'Fixar'} onClick={() => onTogglePin && onTogglePin(c._id)} tint={c.pinned ? '#16A872' : null} size={17} />
                      <ActionBtn icon="agenda" title="Agendar" onClick={() => onAppointment && onAppointment(c)} />
                      <ActionBtn icon="trash" title="Excluir" onClick={() => onDelete && onDelete(c._id)} />
                    </div>
                  </div>);
            })}
          </div>
        </div>
      </div>);
  }

  function CRMListStyles({ gridTemplate }) {
    return (
      <style>{`
        .crml-row { display: grid; grid-template-columns: ${gridTemplate}; gap: 14px; padding: 10px 16px; align-items: center; }
        /* Uniformiza os 5 ícones de ação da linha (cada glifo tem tamanho próprio no icons.jsx). */
        .crml-actbtn svg { width: 20px !important; height: 20px !important; }
        .crml-body { background: var(--surface); border: 1px solid var(--border); border-left-width: 2px; border-radius: 10px; margin: 0 8px; transition: background .15s, box-shadow .15s, transform .15s, border-color .15s; position: relative; overflow: visible; }
        .crml-body.crml-pinned { margin-top: 0; }
        .crml-body:hover { background: var(--surface); box-shadow: 0 2px 10px rgba(15,23,42,.06); border-color: var(--border-strong); transform: translateY(-1px); }
        .crml-pinned { background: #E3F3E5 !important; border-color: #16A872 !important; box-shadow: 0 1px 2px rgba(22,168,114,.12); }
        .crml-pinned:hover { box-shadow: 0 4px 14px rgba(22,168,114,.18); border-color: #16A872 !important; }
        .crml-head { background: var(--surface-2); font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .04em; padding: 12px 16px; border-bottom: 1px solid var(--border); }
        .crml-cell { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .crml-cell-name { display: flex; flex-direction: row; gap: 10px; align-items: center; }
        .crml-name { font-weight: 700; font-size: var(--type-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: .01em; }
        .crml-sub { font-size: 11px; color: var(--text-muted); font-weight: 500; }

        .crml-progress { display: flex; gap: 3px; align-items: center; margin-top: 6px; }
        .crml-seg { display: inline-block; width: 12px; height: 7px; border-radius: 2px; background: var(--surface-3); border: 1px solid color-mix(in oklab, var(--border-strong) 60%, transparent); transition: background .2s ease, border-color .2s ease; }
        .crml-seg-on { background: var(--accent); border-color: var(--accent); box-shadow: 0 1px 2px color-mix(in oklab, var(--accent) 50%, transparent); }

        .crml-cell-actions { flex-direction: row !important; align-items: center; justify-content: flex-end; gap: 2px; padding-right: 8px; position: relative; overflow: visible; align-self: stretch; }
        .crml-head .crml-cell-actions { justify-content: flex-start; padding-right: 0; padding-left: 45px; }
        .crml-actions-divider { width: 1px; height: 40px; background: var(--border-strong); margin: 0 8px 0 0; align-self: center; flex-shrink: 0; }

        .crml-scroll { scrollbar-width: thin; scrollbar-color: var(--border-strong) transparent; }
        .crml-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
        .crml-scroll::-webkit-scrollbar-track { background: transparent; }
        .crml-scroll::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 6px; border: 2px solid transparent; background-clip: content-box; }
        .crml-scroll::-webkit-scrollbar-thumb:hover { background: var(--text-faint); border: 2px solid transparent; background-clip: content-box; }

        .crml-fcat { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .04em; margin-bottom: 6px; }
        .crml-fblock { min-width: 0; }
        .crml-fchips { display: flex; flex-wrap: wrap; gap: 4px; }
        .crml-filter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px 18px; }

        /* Phase chevron strip */
        .crml-phasestrip { display: flex; gap: 4px; padding: 4px 0 2px; overflow-x: auto; overflow-y: visible; scrollbar-width: thin; }
        .crml-phasestrip::-webkit-scrollbar { height: 6px; }
        .crml-phasestrip::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }
        .crml-phase {
          flex: 1 1 0; min-width: 150px;
          padding: 1.5px;
          clip-path: polygon(
            1.6px 3.7px,
            4px 0,
            calc(100% - 18px) 0,
            calc(100% - 12.4px) 3.7px,
            calc(100% - 1.6px) calc(50% - 3.7px),
            calc(100% - 1.6px) calc(50% + 3.7px),
            calc(100% - 12.4px) calc(100% - 3.7px),
            calc(100% - 18px) 100%,
            4px 100%,
            1.6px calc(100% - 3.7px),
            12.4px calc(50% + 3.7px),
            12.4px calc(50% - 3.7px)
          );
          background: var(--border-strong);
          cursor: pointer;
          transition: background .14s ease, transform .14s ease, filter .14s ease;
        }
        .crml-phase.is-first {
          clip-path: polygon(
            0 4px,
            4px 0,
            calc(100% - 18px) 0,
            calc(100% - 12.4px) 3.7px,
            calc(100% - 1.6px) calc(50% - 3.7px),
            calc(100% - 1.6px) calc(50% + 3.7px),
            calc(100% - 12.4px) calc(100% - 3.7px),
            calc(100% - 18px) 100%,
            4px 100%,
            0 calc(100% - 4px)
          );
        }
        .crml-phase.is-last {
          clip-path: polygon(
            1.6px 3.7px,
            4px 0,
            calc(100% - 4px) 0,
            100% 4px,
            100% calc(100% - 4px),
            calc(100% - 4px) 100%,
            4px 100%,
            1.6px calc(100% - 3.7px),
            12.4px calc(50% + 3.7px),
            12.4px calc(50% - 3.7px)
          );
        }
        .crml-phase:hover { background: var(--ph); filter: brightness(1.02); }
        .crml-phase.is-selected { background: var(--ph); }
        .crml-phase-inner {
          clip-path: inherit;
          background: var(--surface);
          padding: 10px 24px 10px 26px;
          height: 64px;
          display: flex; flex-direction: column; justify-content: center;
          transition: background .14s ease;
        }
        .crml-phase.is-first .crml-phase-inner { padding-left: 14px; }
        .crml-phase.is-last .crml-phase-inner { padding-right: 14px; }
      `}</style>);
  }

  window.CRMListView = CRMListView;
})();