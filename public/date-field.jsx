// ============================================================================
// DateField — campo de data com popup suspenso que abre ao passar o mouse.
// Substitui <input type="date">. Mantém o mesmo contrato de props:
//   value: "YYYY-MM-DD"  ·  onChange: recebe { target: { value } }
// O popup replica o layout de referência: navegação de mês, grade de dias
// com o dia selecionado em círculo, e botões "Remover" / "Concluir".
// ============================================================================

const DF_MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DF_WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function dfParse(v) {
  if (!v || typeof v !== 'string') return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d) ? null : d;
}
function dfToValue(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function dfDisplay(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function dfSameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function DateField({ value, onChange, className, style, placeholder = 'Selecionar data', disabled, ...rest }) {
  const selected = dfParse(value);
  const [open, setOpen] = React.useState(false);
  const [cursor, setCursor] = React.useState(() => {
    const base = selected || new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [pos, setPos] = React.useState(null);
  const wrapRef = React.useRef(null);
  const popRef = React.useRef(null);
  const closeTimer = React.useRef(null);

  const emit = (v) => {if (onChange) onChange({ target: { value: v } });};

  const doOpen = () => {
    if (disabled) return;
    if (closeTimer.current) {clearTimeout(closeTimer.current);closeTimer.current = null;}
    const base = selected || new Date();
    setCursor(new Date(base.getFullYear(), base.getMonth(), 1));
    setOpen(true);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 160);
  };
  const cancelClose = () => {
    if (closeTimer.current) {clearTimeout(closeTimer.current);closeTimer.current = null;}
  };

  // Position the popup (fixed) so it never gets clipped by scroll containers.
  React.useLayoutEffect(() => {
    if (!open || !wrapRef.current) return;
    const compute = () => {
      const r = wrapRef.current.getBoundingClientRect();
      const popH = popRef.current ? popRef.current.offsetHeight : 340;
      const popW = 280;
      let top = r.bottom + 6;
      if (top + popH > window.innerHeight - 8 && r.top - popH - 6 > 8) top = r.top - popH - 6;
      let left = r.left;
      if (left + popW > window.innerWidth - 8) left = window.innerWidth - popW - 8;
      if (left < 8) left = 8;
      setPos({ top, left, width: Math.max(popW, r.width) });
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [open]);

  // Outside click / Esc
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && wrapRef.current.contains(e.target)) return;
      if (popRef.current && popRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {if (e.key === 'Escape') setOpen(false);};
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {document.removeEventListener('mousedown', onDoc);document.removeEventListener('keydown', onKey);};
  }, [open]);

  React.useEffect(() => () => {if (closeTimer.current) clearTimeout(closeTimer.current);}, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWd = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const cells = [];
  for (let i = 0; i < firstWd; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const pickDay = (d) => {
    const picked = new Date(year, month, d);
    emit(dfToValue(picked));
    setOpen(false);
  };

  const popup = open && pos ? ReactDOM.createPortal(
    <div
      ref={popRef}
      className="df-pop"
      style={{ top: pos.top, left: pos.left }}
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}>
      
      <div className="df-pop-head">
        <div className="df-pop-title">{DF_MONTHS[month]} {year}</div>
        <div className="df-pop-nav">
          <button type="button" className="df-nav-btn" onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="Mês anterior">
            <Ic name="chevron-left" size={16} />
          </button>
          <button type="button" className="df-nav-btn" onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Próximo mês">
            <Ic name="chevron-right" size={16} />
          </button>
        </div>
      </div>
      <div className="df-pop-wd">
        {DF_WD.map((w, i) => <div key={i}>{w}</div>)}
      </div>
      <div className="df-pop-grid">
        {cells.map((c, i) => {
          if (!c) return <div key={i} className="df-day df-day-empty" />;
          const date = new Date(year, month, c);
          const isSel = dfSameDay(date, selected);
          const isToday = dfSameDay(date, today);
          return (
            <button
              type="button"
              key={i}
              className={'df-day' + (isSel ? ' df-day-sel' : '') + (isToday && !isSel ? ' df-day-today' : '')}
              onClick={() => pickDay(c)}>
              
              {c}
            </button>);

        })}
      </div>
      <div className="df-pop-actions">
        <button type="button" className="df-btn df-btn-remove" onClick={() => {emit('');}}>Limpar</button>
        <button type="button" className="df-btn df-btn-done" onClick={() => {const t = new Date();emit(dfToValue(t));setCursor(new Date(t.getFullYear(), t.getMonth(), 1));setOpen(false);}}>Hoje</button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div
      ref={wrapRef}
      className={'df-wrap' + (disabled ? ' df-disabled' : '')}>
      
      <button
        type="button"
        className={'df-trigger' + (className ? ' ' + className : '') + (open ? ' df-open' : '')}
        style={style}
        onClick={() => open ? setOpen(false) : doOpen()}
        disabled={disabled}
        {...rest}>
        
        <Ic name="calendar" size={15} className="df-trigger-ic" />
        <span className={'df-trigger-val' + (selected ? '' : ' df-placeholder')}>
          {selected ? dfDisplay(selected) : placeholder}
        </span>
        <Ic name={open ? 'chevron-up' : 'chevron-down'} size={16} className="df-trigger-caret" />
      </button>
      {popup}
    </div>);

}

(function injectDateFieldStyles() {
  if (document.getElementById('df-styles')) return;
  const css = document.createElement('style');
  css.id = 'df-styles';
  css.textContent = `
    .df-wrap { position: relative; display: block; width: 100%; }
    .df-trigger {
      appearance: none; width: 100%; height: 36px;
      display: flex; align-items: center; gap: 8px;
      padding: 0 10px; border-radius: 8px;
      border: 1px solid var(--border-strong); background: var(--surface);
      color: var(--text); font: inherit; cursor: pointer; text-align: left;
      transition: border-color .12s ease, box-shadow .12s ease;
    }
    .df-trigger:hover { border-color: var(--text-muted); }
    .df-trigger.df-open { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
    .df-trigger-ic { color: var(--accent); flex-shrink: 0; }
    .df-trigger-val { flex: 1; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .df-trigger-val.df-placeholder { color: var(--text-faint); font-variant-numeric: normal; }
    .df-trigger-caret { color: var(--text-faint); flex-shrink: 0; }
    .df-disabled .df-trigger { opacity: .55; cursor: not-allowed; }

    .df-pop {
      position: fixed; z-index: 4000;
      width: 280px; padding: 16px;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 14px; box-shadow: 0 16px 44px rgba(15,23,42,.18), 0 2px 8px rgba(15,23,42,.08);
      animation: dfPopIn .14s ease;
    }
    [data-theme="dark"] .df-pop { box-shadow: 0 16px 44px rgba(0,0,0,.5); }
    @keyframes dfPopIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
    .df-pop-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .df-pop-title { font-size: 15px; font-weight: 600; color: var(--text); letter-spacing: -.01em; }
    .df-pop-nav { display: flex; align-items: center; gap: 2px; }
    .df-nav-btn {
      width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center;
      border: none; background: transparent; color: var(--text-muted);
      border-radius: 7px; cursor: pointer; transition: background .12s, color .12s;
    }
    .df-nav-btn:hover { background: var(--surface-3); color: var(--text); }
    .df-pop-wd {
      display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;
      margin-bottom: 4px;
    }
    .df-pop-wd > div {
      text-align: center; font-size: 11px; font-weight: 600;
      color: var(--text-faint); padding: 4px 0;
    }
    .df-pop-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
    .df-day {
      aspect-ratio: 1; min-height: 32px;
      display: inline-flex; align-items: center; justify-content: center;
      border: none; background: transparent; cursor: pointer;
      font: inherit; font-size: 13px; color: var(--text);
      font-variant-numeric: tabular-nums; border-radius: 50%;
      transition: background .12s, color .12s;
    }
    .df-day:hover { background: var(--surface-3); }
    .df-day-empty { cursor: default; }
    .df-day-today { font-weight: 700; color: var(--accent); }
    .df-day-sel, .df-day-sel:hover {
      background: var(--accent); color: #fff; font-weight: 600;
    }
    .df-pop-actions { display: flex; gap: 10px; margin-top: 14px; }
    .df-btn {
      flex: 1; height: 38px; border-radius: 9px; border: none;
      font: inherit; font-weight: 600; font-size: 13px; cursor: pointer;
      transition: background .12s, color .12s;
    }
    .df-btn-remove { background: var(--surface-3); color: var(--text-muted); }
    .df-btn-remove:hover { background: var(--border); color: var(--text); }
    .df-btn-done { background: var(--accent); color: #fff; }
    .df-btn-done:hover { background: var(--accent-600); }
  `;
  document.head.appendChild(css);
})();

window.DateField = DateField;

// ============================================================================
// DateRangeField — seletor de intervalo (Início → Fim) com dois meses lado a
// lado, faixa de seleção em verde, e botões Cancelar / Aplicar. Inspirado no
// modelo "Select Date Range", mantendo a marcação na cor da marca (verde).
//   from / to: "YYYY-MM-DD"
//   onChange(fromISO, toISO): chamado ao aplicar
// ============================================================================
const DRP_WD = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
function dfShort(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`;
}

function DateRangeField({ from, to, onChange, className, style, placeholder = 'Selecionar período', disabled }) {
  const [open, setOpen] = React.useState(false);
  const [draftFrom, setDraftFrom] = React.useState(dfParse(from));
  const [draftTo, setDraftTo] = React.useState(dfParse(to));
  const [cursor, setCursor] = React.useState(() => {
    const base = dfParse(from) || new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [pos, setPos] = React.useState(null);
  const wrapRef = React.useRef(null);
  const popRef = React.useRef(null);
  const closeTimer = React.useRef(null);
  const applyTimer = React.useRef(null);

  const doOpen = () => {
    if (disabled) return;
    if (closeTimer.current) {clearTimeout(closeTimer.current);closeTimer.current = null;}
    setDraftFrom(dfParse(from));
    setDraftTo(dfParse(to));
    const base = dfParse(from) || new Date();
    setCursor(new Date(base.getFullYear(), base.getMonth(), 1));
    setOpen(true);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 200);
  };
  const cancelClose = () => {
    if (closeTimer.current) {clearTimeout(closeTimer.current);closeTimer.current = null;}
  };

  // Anchor the popover near the trigger (fixed) so it isn't clipped.
  React.useLayoutEffect(() => {
    if (!open || !wrapRef.current) return;
    const compute = () => {
      const r = wrapRef.current.getBoundingClientRect();
      const popH = popRef.current ? popRef.current.offsetHeight : 380;
      const popW = popRef.current ? popRef.current.offsetWidth : 560;
      let top = r.bottom + 6;
      if (top + popH > window.innerHeight - 8 && r.top - popH - 6 > 8) top = r.top - popH - 6;
      let left = r.left;
      if (left + popW > window.innerWidth - 8) left = window.innerWidth - popW - 8;
      if (left < 8) left = 8;
      setPos({ top, left });
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {window.removeEventListener('resize', compute);window.removeEventListener('scroll', compute, true);};
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => {if (e.key === 'Escape') setOpen(false);};
    const onDoc = (e) => {
      if (wrapRef.current && wrapRef.current.contains(e.target)) return;
      if (popRef.current && popRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDoc);
    return () => {document.removeEventListener('keydown', onKey);document.removeEventListener('mousedown', onDoc);};
  }, [open]);

  React.useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (applyTimer.current) clearTimeout(applyTimer.current);
  }, []);

  const pickDay = (d) => {
    if (!draftFrom || draftFrom && draftTo) {
      setDraftFrom(d);setDraftTo(null);return;
    }
    let a = draftFrom,b = d;
    if (d < draftFrom) {a = d;b = draftFrom;}
    setDraftFrom(a);setDraftTo(b);
    // Seleção fica em rascunho; fecha somente ao clicar em "Aplicar".
  };

  const apply = () => {
    if (draftFrom && !draftTo) {onChange && onChange(dfToValue(draftFrom), dfToValue(draftFrom));} else
    if (draftFrom && draftTo) {onChange && onChange(dfToValue(draftFrom), dfToValue(draftTo));}
    setOpen(false);
  };

  const renderMonth = (monthDate, navDir) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstWd = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const cells = [];
    for (let i = 0; i < firstWd; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const years = [];
    for (let y = today.getFullYear() - 6; y <= today.getFullYear() + 2; y++) years.push(y);

    return (
      <div className="drp-cal">
        <div className={'drp-cal-head' + (navDir === 'next' ? ' is-next' : '')}>
          {navDir === 'prev' &&
          <button type="button" className="drp-nav" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Mês anterior">
              <Ic name="chevron-left" size={16} />
            </button>
          }
          <div className="drp-cal-title">
            <select
              className="drp-year"
              value={year}
              onChange={(e) => {
                const ny = Number(e.target.value);
                const delta = monthDate.getTime() === cursor.getTime() ? 0 : -1;
                setCursor(new Date(ny, month + delta, 1));
              }}>
              
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <span className="drp-month">{DF_MONTHS[month]}</span>
          </div>
          {navDir === 'next' &&
          <button type="button" className="drp-nav" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Próximo mês">
              <Ic name="chevron-right" size={16} />
            </button>
          }
        </div>
        <div className="drp-wd">{DRP_WD.map((w, i) => <div key={i}>{w}</div>)}</div>
        <div className="drp-grid">
          {cells.map((c, i) => {
            if (!c) return <div key={i} className="drp-day drp-day-empty" />;
            const date = new Date(year, month, c);
            const isFrom = dfSameDay(date, draftFrom);
            const isTo = dfSameDay(date, draftTo);
            const inRange = draftFrom && draftTo && date > draftFrom && date < draftTo;
            const isToday = dfSameDay(date, today);
            let cls = 'drp-day';
            if (inRange) cls += ' drp-in';
            if (isFrom) cls += ' drp-end drp-from' + (draftTo ? '' : ' drp-solo');
            if (isTo) cls += ' drp-end drp-to';
            if (isFrom && isTo) cls += ' drp-solo';
            if (isToday && !isFrom && !isTo && !inRange) cls += ' drp-today';
            return (
              <button type="button" key={i} className={cls} onClick={() => pickDay(date)}>
                <span style={{ width: "25px", height: "25px" }}>{c}</span>
              </button>);

          })}
        </div>
      </div>);

  };

  const rightCursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  const valFrom = dfParse(from);
  const valTo = dfParse(to);
  const triggerLabel = valFrom ?
  `DE ${dfShort(valFrom)} - Á ${valTo ? dfShort(valTo) : '…'}` :
  placeholder;
  const hasVal = !!valFrom;

  const modal = open && pos ? ReactDOM.createPortal(
    <div
      ref={popRef}
      className="drp-pop"
      style={{ top: pos.top, left: pos.left }}>
      
      <div className="drp-modal">
        <div className="drp-head">
          <div className="drp-head-title">
            <span className="drp-head-ic"><Ic name="calendar" size={16} /></span>
            Selecionar período
          </div>
          <button type="button" className="drp-x" onClick={() => setOpen(false)} aria-label="Fechar">
            <Ic name="x" size={18} />
          </button>
        </div>

        <div className="drp-boxes">
          <div className="drp-box-col">
            <div className="drp-box-label">Início</div>
            <div className={'drp-box' + (draftFrom ? ' on' : '')}>{draftFrom ? dfDisplay(draftFrom) : '—'}</div>
          </div>
          <div className="drp-box-col">
            <div className="drp-box-label">Fim</div>
            <div className={'drp-box' + (draftTo ? ' on' : '')}>{draftTo ? dfDisplay(draftTo) : '—'}</div>
          </div>
        </div>

        <div className="drp-cals">
          {renderMonth(cursor, 'prev')}
          <div className="drp-cal-div" aria-hidden="true" />
          {renderMonth(rightCursor, 'next')}
        </div>

        <div className="drp-foot">
          <button type="button" className="drp-btn drp-cancel" onClick={() => { setDraftFrom(null); setDraftTo(null); }}>Limpar</button>
          <button type="button" className="drp-btn drp-apply" onClick={apply} disabled={!draftFrom}>Aplicar</button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div
      ref={wrapRef}
      className={'df-wrap' + (disabled ? ' df-disabled' : '')}>
      
      <button
        type="button"
        className={'df-trigger' + (className ? ' ' + className : '') + (open ? ' df-open' : '')}
        style={{ ...style, width: "280px" }}
        onClick={() => open ? setOpen(false) : doOpen()}
        disabled={disabled}>
        
        <Ic name="calendar" size={15} className="df-trigger-ic" />
        <span className={'df-trigger-val' + (hasVal ? '' : ' df-placeholder')}>{triggerLabel}</span>
        <Ic name="chevron-down" size={16} className="df-trigger-caret" />
      </button>
      {modal}
    </div>);

}

(function injectDateRangeStyles() {
  if (document.getElementById('drp-styles')) return;
  const css = document.createElement('style');
  css.id = 'drp-styles';
  css.textContent = `
    .drp-pop {
      position: fixed; z-index: 4200;
      animation: drpPop .16s ease;
    }
    .drp-modal {
      width: 512px; max-width: calc(100vw - 16px);
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 18px; padding: 18px 20px 16px;
      box-shadow: 0 18px 56px rgba(15,23,42,.22), 0 2px 10px rgba(15,23,42,.10);
    }
    [data-theme="dark"] .drp-modal { box-shadow: 0 18px 56px rgba(0,0,0,.55); }
    @keyframes drpPop { from { opacity: 0; transform: translateY(6px) scale(.99); } to { opacity: 1; transform: none; } }

    .drp-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
    .drp-head-title { display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 600; color: var(--text); letter-spacing: -.01em; }
    .drp-head-ic {
      width: 30px; height: 30px; border-radius: 9px;
      display: inline-flex; align-items: center; justify-content: center;
      background: color-mix(in oklab, var(--accent) 14%, white); color: var(--accent);
    }
    [data-theme="dark"] .drp-head-ic { background: color-mix(in oklab, var(--accent) 26%, #11161c); color: #6ee7b7; }
    .drp-x { width: 30px; height: 30px; border: none; background: transparent; color: var(--text-faint); border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: background .12s, color .12s; }
    .drp-x:hover { background: var(--surface-3); color: var(--text); }

    .drp-boxes { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 16px; }
    .drp-box-col { display: flex; flex-direction: column; gap: 6px; }
    .drp-box-label { font-size: 12px; font-weight: 600; color: var(--text-muted); }
    .drp-box {
      height: 42px; border-radius: 11px; border: 1.5px solid var(--border-strong);
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; font-weight: 600; color: var(--text); font-variant-numeric: tabular-nums;
      letter-spacing: .02em; transition: border-color .12s, box-shadow .12s;
    }
    .drp-box.on { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }

    .drp-cals { display: grid; grid-template-columns: 1fr auto 1fr; gap: 18px; align-items: start; margin-bottom: 18px; }
    .drp-cal-div { width: 1px; background: var(--border); align-self: stretch; }
    .drp-nav { width: 28px; height: 28px; border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background .12s, color .12s, border-color .12s; }
    .drp-nav:hover { background: var(--surface-3); color: var(--text); border-color: var(--border-strong); }

    .drp-cal { min-width: 0; }
    .drp-cal-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; padding: 0 2px; }
    .drp-cal-head.is-next { justify-content: flex-end; }
    .drp-cal-title { display: flex; align-items: center; gap: 6px; min-width: 0; }
    .drp-year { appearance: none; border: none; background: transparent; font: inherit; font-size: 13px; font-weight: 600; color: var(--text); cursor: pointer; padding: 2px 2px; border-radius: 6px; }
    .drp-year:hover { background: var(--surface-3); }
    .drp-month { font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; }

    .drp-wd { display: grid; grid-template-columns: repeat(7, 1fr); }
    .drp-wd > div { text-align: center; font-size: 10px; font-weight: 600; color: var(--text-faint); padding: 4px 0; }
    .drp-grid { display: grid; grid-template-columns: repeat(7, 1fr); row-gap: 3px; column-gap: 0; }
    .drp-day {
      position: relative; height: 32px; min-width: 0; border: none; background: transparent;
      font: inherit; font-size: 12.5px; color: var(--text); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-variant-numeric: tabular-nums;
    }
    .drp-day > span { position: relative; z-index: 1; flex: 0 0 auto; width: 28px; height: 28px; aspect-ratio: 1 / 1; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; transition: background .1s; }
    .drp-day:not(.drp-end):not(.drp-in):hover > span { background: var(--surface-3); }
    .drp-day-empty { cursor: default; }
    .drp-today > span { font-weight: 700; color: var(--accent); }

    /* range band — faixa verde clara com pontas arredondadas (pílula) */
    .drp-in::before, .drp-end:not(.drp-solo)::before {
      content: ''; position: absolute; z-index: 0;
      top: 50%; left: 0; right: 0; transform: translateY(-50%);
      height: 28px; background: color-mix(in oklab, var(--accent) 15%, white);
    }
    [data-theme="dark"] .drp-in::before,
    [data-theme="dark"] .drp-end:not(.drp-solo)::before { background: color-mix(in oklab, var(--accent) 26%, #11161c); }
    .drp-end.drp-from:not(.drp-solo)::before { left: 50%; border-radius: 999px 0 0 999px; }
    .drp-end.drp-to:not(.drp-solo)::before { right: 50%; border-radius: 0 999px 999px 0; }
    /* Pontas arredondadas no início/fim de cada linha (semana) da faixa */
    .drp-grid > .drp-day:nth-child(7n+1).drp-in::before,
    .drp-grid > .drp-day:nth-child(7n+1).drp-end:not(.drp-solo)::before {
      border-top-left-radius: 999px; border-bottom-left-radius: 999px;
    }
    .drp-grid > .drp-day:nth-child(7n).drp-in::before,
    .drp-grid > .drp-day:nth-child(7n).drp-end:not(.drp-solo)::before {
      border-top-right-radius: 999px; border-bottom-right-radius: 999px;
    }
    .drp-end > span { background: var(--accent); color: #fff; font-weight: 600; }
    .drp-end:hover > span { background: var(--accent-600); }

    .drp-foot { display: grid; grid-template-columns: 1fr 1.6fr; gap: 12px; }
    .drp-btn { height: 42px; border-radius: 11px; font: inherit; font-weight: 600; font-size: 14px; cursor: pointer; transition: background .12s, color .12s, border-color .12s; }
    .drp-cancel { background: var(--surface); border: 1.5px solid var(--border-strong); color: var(--text); }
    .drp-cancel:hover { background: var(--surface-3); }
    .drp-apply { background: var(--accent); border: none; color: #fff; }
    .drp-apply:hover { background: var(--accent-600); }
    .drp-apply:disabled { opacity: .5; cursor: not-allowed; }

    @media (max-width: 560px) {
      .drp-cals { grid-template-columns: 1fr; }
      .drp-cal-div { display: none; }
      .drp-cal-head.is-next { justify-content: flex-start; }
      .drp-modal { width: 340px; }
    }
  `;
  document.head.appendChild(css);
})();

window.DateRangeField = DateRangeField;