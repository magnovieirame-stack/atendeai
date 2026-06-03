// finance-dre.jsx — Demonstrativo de Resultados do Exercício (DRE)
// Estrutura: KPIs (Receita Bruta, Líquida, Lucro Bruto, Operacional, Lucro Líquido)
// + Blocos B1..B6 (Receita / Deduções / Custos / Operacional / Resultado Financeiro / Impostos)
// Suporta dark mode + light mode via tokens existentes.

(function() {
  const { Ic } = window;
  const Page = window.Page;

  // ---------- Helpers ----------
  function fmtBRL(v) {
    return (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtPct(v, opts = {}) {
    const n = Number(v) || 0;
    const sign = n > 0 ? '+' : (n < 0 ? '−' : '');
    const abs = Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (opts.noSign ? '' : (sign + ' ')) + abs + '%';
  }

  // ---------- Month helpers ----------
  const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const MONTHS_SHORT = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  /** Format month key "YYYY-MM" → "Abril/26" */
  function fmtMonthKey(key) {
    const [y, m] = key.split('-').map(Number);
    return MONTHS_FULL[m - 1] + '/' + String(y).slice(-2);
  }
  function fmtMonthShort(key) {
    const [y, m] = key.split('-').map(Number);
    return MONTHS_SHORT[m - 1] + '/' + String(y).slice(-2);
  }
  /** Build last N month keys ending at todayKey (inclusive). */
  function lastNMonths(n, anchorKey) {
    const [ay, am] = anchorKey.split('-').map(Number);
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      let mIdx = (am - 1) - i;
      let yOff = 0;
      while (mIdx < 0) { mIdx += 12; yOff -= 1; }
      const y = ay + yOff;
      out.push(String(y) + '-' + String(mIdx + 1).padStart(2, '0'));
    }
    return out;
  }
  /** Move a month key by N months (positive = forward, negative = backward). */
  function monthOffset(key, n) {
    const [y, m] = key.split('-').map(Number);
    const total = y * 12 + (m - 1) + n;
    const ny = Math.floor(total / 12);
    const nm = (total % 12 + 12) % 12;
    return String(ny) + '-' + String(nm + 1).padStart(2, '0');
  }
  /** Deterministic seeded random in [0,1) based on a string seed. */
  function seededRand(seed) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (((h >>> 0) % 100000) / 100000);
  }
  /** Vary a base value by ±maxPct using a seed (so toggling months changes numbers deterministically) */
  function varyValue(base, seed, maxPct = 0.30) {
    const r = seededRand(seed) * 2 - 1; // -1..1
    return Math.max(0, base * (1 + r * maxPct));
  }

  // ---------- Month picker dropdown ----------
  function MonthPicker({ value, onChange, label, accent, options, disabledKey }) {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef(null);
    React.useEffect(() => {
      if (!open) return;
      const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      document.addEventListener('mousedown', onDoc);
      return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);
    return (
      <div className="dre-mp" ref={ref}>
        <button
          type="button"
          className={'dre-mp-trigger' + (open ? ' is-open' : '')}
          style={{ '--mp-accent': accent || 'var(--accent)' }}
          onClick={() => setOpen(o => !o)}
        >
          <Ic name="calendar" size={13} />
          <span className="dre-mp-label">{label}:</span>
          <span className="dre-mp-value">{fmtMonthKey(value)}</span>
          <Ic name="chevron-down" size={12} />
        </button>
        {open && (
          <div className="dre-mp-menu">
            {options.map(opt => {
              const isCur = opt === value;
              const isDisabled = opt === disabledKey;
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={isDisabled}
                  className={'dre-mp-opt' + (isCur ? ' is-current' : '') + (isDisabled ? ' is-disabled' : '')}
                  onClick={() => { if (!isDisabled) { onChange(opt); setOpen(false); } }}
                >
                  <span>{fmtMonthKey(opt)}</span>
                  {isCur && <Ic name="check" size={12} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ---------- Period filter (sliding pill — matches Receitas/Despesas) ----------
  const PERIOD_OPTIONS = [
    { id: 'todos', label: 'TODOS', sub: '', icon: 'check-double' },
    { id: 'mes', label: 'MÊS', sub: '', icon: 'calendar' },
    { id: '7d', label: '07', sub: 'DIAS', icon: null },
    { id: '15d', label: '15', sub: 'DIAS', icon: null },
    { id: '30d', label: '30', sub: 'DIAS', icon: null },
    { id: 'periodo', label: 'DATA', sub: '', icon: 'calendar' },
  ];

  function PeriodFilter({ value, onChange, fromDate, toDate, setFromDate, setToDate }) {
    const rowRef = React.useRef(null);
    const btnRefs = React.useRef({});
    const [pill, setPill] = React.useState({ x: 0, w: 0, ready: false });

    const updatePill = React.useCallback(() => {
      const row = rowRef.current;
      const btn = btnRefs.current[value];
      if (!row || !btn) { setPill(p => ({ ...p, ready: false })); return; }
      const rRect = row.getBoundingClientRect();
      const bRect = btn.getBoundingClientRect();
      setPill({ x: bRect.left - rRect.left, w: bRect.width, ready: true });
    }, [value]);

    React.useLayoutEffect(() => { updatePill(); }, [updatePill]);
    React.useEffect(() => {
      const onResize = () => updatePill();
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }, [updatePill]);

    return (
      <div className="dre-period">
        <div className="dre-period-row" ref={rowRef}>
          <span
            className="dre-period-pill"
            style={{
              transform: `translateX(${pill.x}px)`,
              width: pill.w ? pill.w + 'px' : 0,
              opacity: pill.ready ? 1 : 0,
            }}
            aria-hidden="true"
          />
          {PERIOD_OPTIONS.filter(opt => opt.id !== 'periodo').map(opt => (
            <button
              key={opt.id}
              ref={el => { btnRefs.current[opt.id] = el; }}
              type="button"
              className={'dre-period-btn' + (value === opt.id ? ' on' : '')}
              onClick={() => onChange(opt.id)}
              title={opt.label + (opt.sub ? ' ' + opt.sub : '')}
            >
              {opt.icon && (
                <span className="dre-period-ic"><Ic name={opt.icon} size={15} /></span>
              )}
              <span className="dre-period-num">{opt.label}</span>
              {opt.sub && <span className="dre-period-sub">{opt.sub}</span>}
            </button>
          ))}
          <DateRangeField from={fromDate} to={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); onChange('periodo'); }} placeholder="Período" style={{ width: 218, marginLeft: 4 }} />
        </div>
      </div>
    );
  }

  // ---------- KPI card ----------
  function KpiCard({ label, value, variation, prevMonth, margin, accent, onClick }) {
    const isPos = variation >= 0;
    return (
      <button
        type="button"
        className="dre-kpi"
        style={{ '--kpi-accent': accent }}
        onClick={onClick}
      >
        <div className="dre-kpi-label">{label}</div>
        <div className="dre-kpi-value">
          <span className="dre-kpi-currency">R$</span>
          <span className="tnum">{fmtBRL(value)}</span>
        </div>
        <div className={'dre-kpi-var ' + (isPos ? 'is-pos' : 'is-neg')}>
          {fmtPct(variation)} <span className="dre-kpi-var-vs">vs {prevMonth}</span>
        </div>
        <div className="dre-kpi-margin">Margem {fmtPct(margin, { noSign: true })}</div>
        <span className="dre-kpi-cta" aria-hidden="true">
          <Ic name="chevron-down" size={14} />
        </span>
      </button>
    );
  }

  // ---------- Section row card ----------
  function DreRow({ title, accent, current, previous, pctVar, pctReceita, currentLabel, previousLabel }) {
    return (
      <div className="dre-row" style={{ '--row-accent': accent }}>
        <div className="dre-row-title">{title}</div>

        <div className="dre-row-cell">
          <div className="dre-row-cell-h">
            <Ic name="calendar" size={13} /> <span>{currentLabel}</span>
          </div>
          <div className="dre-row-cell-v">
            <span className="dre-row-cur">R$</span> <span className="tnum">{fmtBRL(current)}</span>
          </div>
        </div>

        <div className="dre-row-cell">
          <div className="dre-row-cell-h">
            <Ic name="calendar" size={13} /> <span>{previousLabel}</span>
          </div>
          <div className="dre-row-cell-v">
            <span className="dre-row-cur">R$</span> <span className="tnum">{fmtBRL(previous)}</span>
          </div>
        </div>

        <div className="dre-row-cell dre-row-cell-pill">
          <div className="dre-row-cell-h">
            <Ic name="reports" size={13} /> <span>VARIAÇÃO %</span>
          </div>
          <span className={'dre-pill ' + (pctVar >= 0 ? 'is-pos' : 'is-neg')}>{fmtPct(pctVar)}</span>
        </div>

        <div className="dre-row-cell dre-row-cell-pill">
          <div className="dre-row-cell-h">
            <Ic name="reports" size={13} /> <span>% DA RECEITA</span>
          </div>
          <span className="dre-pill is-pos">{fmtPct(pctReceita)}</span>
        </div>
      </div>
    );
  }

  // ---------- Section block (header + rows) ----------
  function DreBlock({ id, code, title, accent, rows, currentLabel, previousLabel, highlight }) {
    return (
      <div className={'dre-block' + (highlight ? ' is-highlight' : '')} id={id} data-block-id={id} style={{ '--row-accent': accent }}>
        <div className="dre-block-h">
          <span className="dre-block-code">{code}</span>
          <span className="dre-block-title">{title}</span>
        </div>
        <div className="dre-block-rows">
          {rows.map((r, i) => (
            <DreRow
              key={i}
              title={r.title}
              accent={r.accent || accent}
              current={r.current}
              previous={r.previous}
              pctVar={r.pctVar}
              pctReceita={r.pctReceita}
              currentLabel={currentLabel}
              previousLabel={previousLabel}
            />
          ))}
        </div>
      </div>
    );
  }

  // ---------- Mock data (base values — actual current/previous are varied per selected month) ----------
  const MOCK_BASE = {
    blocks: [
      {
        code: 'B1',
        title: 'Receita Bruta — Faturamento',
        accent: '#10b981',
        rows: [
          { title: 'Venda de Serviços',     base: 188340.00 },
          { title: 'Venda de Produtos',     base:  11505.00 },
          { title: 'Pacotes / Assinaturas', base:   7222.00 },
        ],
      },
      {
        code: 'B2',
        title: 'Deduções (impostos sobre serviço)',
        accent: '#0ea5e9',
        rows: [
          { title: 'ISS + PIS + COFINS + CSLL + IRPJ', base: 20900.00 },
          { title: 'Devoluções e cancelamentos',       base:  3700.00 },
        ],
      },
      {
        code: 'B3',
        title: 'Custo dos Serviços Prestados (CSP)',
        accent: '#f97316',
        rows: [
          { title: 'Freelance / Terceirização', base: 20900.00 },
          { title: 'Imposto Pago',              base: 19220.00 },
          { title: 'Materiais e insumos',       base:  6110.00 },
        ],
      },
      {
        code: 'B4',
        title: 'Despesas Operacionais',
        accent: '#ef4444',
        rows: [
          { title: 'Folha de Pagamento',  base: 37700.00 },
          { title: 'Aluguel + Energia',   base:  6330.00 },
          { title: 'Marketing e Vendas',  base:  5200.00 },
          { title: 'Outras Despesas',     base:  3045.00 },
        ],
      },
      {
        code: 'B5',
        title: 'Resultado Financeiro',
        accent: '#a855f7',
        rows: [
          { title: 'Receitas financeiras',         accent: '#10b981', base: 20900.00 },
          { title: 'Despesas financeiras',         accent: '#ef4444', base:  8760.00 },
          { title: 'Provisão devedores duvidosos', accent: '#f59e0b', base:  2310.00 },
        ],
      },
      {
        code: 'B6',
        title: 'Impostos sobre o resultado',
        accent: '#6366f1',
        rows: [
          { title: 'Contribuição Social sobre o Lucro Líquido (CSLL)', base: 20900.00 },
          { title: 'Imposto de Renda Pessoa Jurídica (IRPJ)',          base: 17700.00 },
        ],
      },
    ],
  };

  // (Old calcTotals helper kept for compatibility — not used after dynamic data)
  function calcTotals(blocks) {
    return blocks.map(b => ({
      code: b.code,
      title: b.title,
      total: b.rows.reduce((s, r) => s + (r.current || 0), 0),
      totalPrev: b.rows.reduce((s, r) => s + (r.previous || 0), 0),
    }));
  }

  // ---------- Main Component ----------
  function FinDRE() {
    const today = new Date();
    const todayISO = today.toISOString().slice(0, 10);
    const [period, setPeriod] = React.useState('mes');
    const [from, setFrom] = React.useState(todayISO);
    const [to, setTo] = React.useState(todayISO);
    const [highlight, setHighlight] = React.useState(null);
    const highlightTimer = React.useRef(null);
    const scrollAreaRef = React.useRef(null);

    // Anchor "today" → use the mock TODAY (April 2026) so picker defaults look sensible
    const anchorKey = '2026-04';
    const [currentMonth, setCurrentMonth] = React.useState(anchorKey);
    const [previousMonth, setPreviousMonth] = React.useState(monthOffset(anchorKey, -1));

    // 24-month list (oldest first); reverse so newest appears on top of dropdown
    const monthOptions = React.useMemo(() => lastNMonths(24, anchorKey).reverse(), []);

    const currentLabel  = fmtMonthKey(currentMonth);
    const previousLabel = fmtMonthKey(previousMonth);
    const prevShort     = fmtMonthShort(previousMonth);

    // Build dynamic mock data based on the two selected months
    const data = React.useMemo(() => {
      const blocks = MOCK_BASE.blocks.map(b => {
        const rows = b.rows.map(r => {
          const current  = varyValue(r.base, currentMonth + ':' + r.title);
          const previous = varyValue(r.base, previousMonth + ':' + r.title);
          const pctVar   = previous > 0 ? ((current - previous) / previous) * 100 : 0;
          // % da receita is computed against the block-1 (Receita Bruta) total of the current month
          return { ...r, current, previous, pctVar };
        });
        return { ...b, rows };
      });

      // Compute Receita Bruta total (block index 0) to derive % da receita for every row
      const receitaBrutaTotal = blocks[0].rows.reduce((s, r) => s + (r.current || 0), 0);
      blocks.forEach(b => {
        b.rows.forEach(r => {
          r.pctReceita = receitaBrutaTotal > 0 ? (r.current / receitaBrutaTotal) * 100 : 0;
        });
      });

      // KPIs derived from blocks:
      // B1 = Receita Bruta · B2 = Deduções · B3 = CSP · B4 = Op · B5 = Financeiro · B6 = Impostos
      const blockTotal = (i) => blocks[i].rows.reduce((s, r) => s + (r.current || 0), 0);
      const blockTotalPrev = (i) => blocks[i].rows.reduce((s, r) => s + (r.previous || 0), 0);

      const receitaBruta   = blockTotal(0);
      const receitaLiquida = receitaBruta - blockTotal(1);                                  // − Deduções
      const lucroBruto     = receitaLiquida - blockTotal(2);                                // − CSP
      const operacional    = lucroBruto - blockTotal(3) + blockTotal(4)                      // − Despesas Op + Resultado Fin
                              - blocks[4].rows.filter(r => r.title.toLowerCase().includes('despesa') || r.title.toLowerCase().includes('provisão')).reduce((s, r) => s + r.current, 0) * 2;
      const lucroLiquido   = operacional - blockTotal(5);                                   // − Impostos

      const receitaBrutaPrev   = blockTotalPrev(0);
      const receitaLiquidaPrev = receitaBrutaPrev - blockTotalPrev(1);
      const lucroBrutoPrev     = receitaLiquidaPrev - blockTotalPrev(2);
      const operacionalPrev    = lucroBrutoPrev - blockTotalPrev(3) + blockTotalPrev(4)
                                  - blocks[4].rows.filter(r => r.title.toLowerCase().includes('despesa') || r.title.toLowerCase().includes('provisão')).reduce((s, r) => s + r.previous, 0) * 2;
      const lucroLiquidoPrev   = operacionalPrev - blockTotalPrev(5);

      const variation = (cur, prev) => prev !== 0 ? ((cur - prev) / Math.abs(prev)) * 100 : 0;
      const margin = (val) => receitaBruta > 0 ? (val / receitaBruta) * 100 : 0;

      return {
        blocks,
        receitaBrutaTotal: receitaBruta,
        kpis: {
          receitaBruta:   { value: receitaBruta,   var: variation(receitaBruta,   receitaBrutaPrev),   margin: 100 },
          receitaLiquida: { value: receitaLiquida, var: variation(receitaLiquida, receitaLiquidaPrev), margin: margin(receitaLiquida) },
          lucroBruto:     { value: lucroBruto,     var: variation(lucroBruto,     lucroBrutoPrev),     margin: margin(lucroBruto) },
          operacional:    { value: operacional,    var: variation(operacional,    operacionalPrev),    margin: margin(operacional) },
          lucroLiquido:   { value: lucroLiquido,   var: variation(lucroLiquido,   lucroLiquidoPrev),   margin: margin(lucroLiquido) },
        },
      };
    }, [currentMonth, previousMonth]);

    const k = data.kpis;
    const blocks = data.blocks;
    const totals = blocks.map(b => ({
      code: b.code,
      title: b.title,
      total: b.rows.reduce((s, r) => s + (r.current || 0), 0),
    }));

    // KPI → Block mapping (5 cards aligned with B1..B5)
    const KPI_TO_BLOCK = ['b1', 'b2', 'b3', 'b4', 'b5'];

    const scrollToBlock = React.useCallback((blockId) => {
      const el = document.getElementById(blockId);
      if (!el) return;
      // Prefer the internal scroll area we own; fall back to nearest scrollable ancestor.
      let scroller = scrollAreaRef.current;
      if (!scroller) {
        scroller = el.parentElement;
        while (scroller && scroller !== document.body) {
          const cs = getComputedStyle(scroller);
          const overflowY = cs.overflowY;
          if ((overflowY === 'auto' || overflowY === 'scroll') && scroller.scrollHeight > scroller.clientHeight) break;
          scroller = scroller.parentElement;
        }
        if (!scroller || scroller === document.body) scroller = document.scrollingElement || document.documentElement;
      }
      const rect = el.getBoundingClientRect();
      const sRect = scroller.getBoundingClientRect();
      const target = scroller.scrollTop + (rect.top - sRect.top) - 12;
      scroller.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });

      setHighlight(blockId);
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => setHighlight(null), 1400);
    }, []);

    React.useEffect(() => () => { if (highlightTimer.current) clearTimeout(highlightTimer.current); }, []);

    return (
      <Page
        title="DRE — Demonstrativo de Resultados"
        subtitle="Análise de resultado por período · compara mês atual com anterior"
        actions={
          <>
            <button className="btn"><Ic name="download" size={13} /> Exportar</button>
            <button className="btn btn-primary"><Ic name="reports" size={13} /> Relatório</button>
          </>
        }
      >
        <DreStyles />
        {/* Make the .page.scroll wrapper become a flex column with no external scroll —
            only the blocks list scrolls internally. */}
        <style>{`.page.scroll:has(> .dre-shell) { display: flex; flex-direction: column; overflow: hidden !important; padding-bottom: 0 !important; }`}</style>

        <div className="dre-shell">
          {/* Fixed top: toolbar + KPI strip */}
          <div className="dre-fixed">
            {/* Toolbar */}
            <div className="card" style={{ padding: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
              <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>Período</span>
                <PeriodFilter
                  value={period}
                  onChange={setPeriod}
                  fromDate={from}
                  toDate={to}
                  setFromDate={setFrom}
                  setToDate={setTo}
                />
              </div>
              <div className="dre-compare">
                <MonthPicker
                  value={currentMonth}
                  onChange={(v) => {
                    setCurrentMonth(v);
                    // keep previousMonth one step before current if they collide
                    if (v === previousMonth) setPreviousMonth(monthOffset(v, -1));
                  }}
                  label="Atual"
                  accent="var(--accent)"
                  options={monthOptions}
                  disabledKey={previousMonth}
                />
                <span className="dre-compare-sep">vs</span>
                <MonthPicker
                  value={previousMonth}
                  onChange={(v) => {
                    setPreviousMonth(v);
                    if (v === currentMonth) setCurrentMonth(monthOffset(v, 1));
                  }}
                  label="Anterior"
                  accent="var(--text-muted)"
                  options={monthOptions}
                  disabledKey={currentMonth}
                />
              </div>
            </div>

            {/* KPI strip — 5 metrics, each clickable, scrolls to the corresponding block */}
            <div className="dre-kpi-grid">
              {[
                { label: 'Receita Bruta',    data: k.receitaBruta },
                { label: 'Receita Líquida',  data: k.receitaLiquida },
                { label: 'Lucro Bruto',      data: k.lucroBruto },
                { label: 'Operacional',      data: k.operacional },
                { label: 'Lucro Líquido',    data: k.lucroLiquido },
              ].map((kpi, i) => {
                const blockId = KPI_TO_BLOCK[i];
                const block = blocks.find(b => b.code.toLowerCase() === blockId);
                return (
                  <KpiCard
                    key={kpi.label}
                    label={kpi.label}
                    value={kpi.data.value}
                    variation={kpi.data.var}
                    margin={kpi.data.margin}
                    prevMonth={prevShort}
                    accent={block ? block.accent : '#10b981'}
                    onClick={() => scrollToBlock(blockId)}
                  />
                );
              })}
            </div>
          </div>

          {/* Scrollable area: blocks + summary */}
          <div className="dre-scroll" ref={scrollAreaRef}>
            <div className="dre-blocks">
              {blocks.map((b, i) => {
                const id = b.code.toLowerCase();
                return (
                  <DreBlock
                    key={i}
                    id={id}
                    code={b.code}
                    title={b.title}
                    accent={b.accent}
                    rows={b.rows}
                    currentLabel={currentLabel}
                    previousLabel={previousLabel}
                    highlight={highlight === id}
                  />
                );
              })}
            </div>

            {/* Summary footer — totals per block */}
            <div className="card dre-summary">
              <div className="dre-summary-h">
                <Ic name="reports" size={14} />
                <span>Síntese dos blocos · {currentLabel}</span>
              </div>
              <div className="dre-summary-grid">
                {totals.map((t, i) => (
                  <button
                    key={i}
                    type="button"
                    className="dre-summary-cell"
                    style={{ '--row-accent': blocks[i].accent }}
                    onClick={() => scrollToBlock(blocks[i].code.toLowerCase())}
                  >
                    <div className="dre-summary-code">{t.code}</div>
                    <div className="dre-summary-label">{t.title}</div>
                    <div className="dre-summary-value"><span className="muted" style={{ fontSize: 12 }}>R$</span> <span className="tnum">{fmtBRL(t.total)}</span></div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Page>
    );
  }

  // ---------- Styles ----------
  function DreStyles() {
    return (
      <style>{`
        /* Shell: split the page into a fixed top (toolbar + KPIs) and a scrollable area below */
        .dre-shell {
          flex: 1; min-height: 0;
          display: flex; flex-direction: column;
          gap: 14px;
        }
        .dre-fixed {
          flex-shrink: 0;
          display: flex; flex-direction: column; gap: 14px;
        }
        .dre-scroll {
          flex: 1; min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          /* Tasteful gradient mask at top so scrolling content fades behind the fixed header */
          padding: 4px 4px 24px;
          margin: -4px -4px 0;
          scroll-behavior: smooth;
        }
        .dre-scroll::-webkit-scrollbar { width: 10px; }
        .dre-scroll::-webkit-scrollbar-track { background: transparent; }
        .dre-scroll::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 6px; border: 2px solid transparent; background-clip: content-box; }
        .dre-scroll::-webkit-scrollbar-thumb:hover { background: var(--text-faint); border: 2px solid transparent; background-clip: content-box; }

        /* Period filter — same pattern as Receitas/Despesas */
        .dre-period { display: inline-flex; max-width: 100%; }
        .dre-period-row {
          position: relative;
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px;
          background: var(--surface-3);
          border: 1px solid var(--border);
          border-radius: 10px;
          flex-wrap: nowrap;
        }
        [data-theme="dark"] .dre-period-row { background: #1a1f25; border-color: #262c34; }

        .dre-period-pill {
          position: absolute;
          top: 4px; bottom: 4px; left: 0;
          border-radius: 7px;
          background: #E7F4E9;
          box-shadow: 0 1px 3px rgba(16,185,129,.18), inset 0 0 0 1px rgba(16,185,129,.28);
          transition: transform .32s cubic-bezier(.5,.2,.2,1), width .32s cubic-bezier(.5,.2,.2,1), opacity .2s;
          pointer-events: none;
          z-index: 0;
        }
        [data-theme="dark"] .dre-period-pill {
          background: color-mix(in oklab, #10b981 22%, #1a1f25);
          box-shadow: 0 1px 3px rgba(0,0,0,.3), inset 0 0 0 1px rgba(16,185,129,.45);
        }

        .dre-period-btn {
          position: relative; z-index: 1;
          appearance: none; border: 0; background: transparent;
          color: var(--text-muted); font-family: inherit; cursor: pointer;
          padding: 6px 10px; border-radius: 7px;
          display: inline-flex; flex-direction: column; align-items: center; gap: 0;
          line-height: 1.1; min-width: 44px;
          transition: color .2s;
        }
        .dre-period-btn .dre-period-ic { color: inherit; }
        .dre-period-btn .dre-period-num { font-weight: 700; font-size: 10px; letter-spacing: .04em; }
        .dre-period-btn .dre-period-sub { font-weight: 600; font-size: 9px; letter-spacing: .08em; opacity: .8; margin-top: 1px; }
        .dre-period-btn:hover { color: var(--text); }
        .dre-period-btn.on { color: #047857; text-shadow: none; }
        [data-theme="dark"] .dre-period-btn.on { color: #6ee7b7; }
        .dre-period-btn.on:hover { color: #047857; }
        [data-theme="dark"] .dre-period-btn.on:hover { color: #6ee7b7; }

        .dre-period-date {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 8px; border-radius: 7px;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text-muted);
        }
        [data-theme="dark"] .dre-period-date { background: #232932; border-color: #34404d; }
        .dre-period-date.on { border-color: var(--accent); color: var(--text); }
        .dre-period-date input[type="date"] {
          appearance: none; border: 0; background: transparent;
          color: inherit; font: inherit; font-variant-numeric: tabular-nums;
          padding: 4px 0; min-width: 110px;
        }
        .dre-period-date input[type="date"]:focus { outline: none; }
        [data-theme="dark"] .dre-period-date input::-webkit-calendar-picker-indicator { filter: invert(.7); }

        /* Comparison tags */
        .dre-compare {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: var(--type-sm); color: var(--text-muted);
          position: relative;
        }
        .dre-compare-tag {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 10px; border-radius: 999px;
          background: var(--accent-soft); color: var(--accent-700);
          font-weight: 600; font-size: 12px;
        }
        .dre-compare-tag.is-muted {
          background: var(--surface-3); color: var(--text-muted);
        }
        .dre-compare-sep { font-size: 11px; color: var(--text-faint); font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }

        /* Month picker */
        .dre-mp { position: relative; }
        .dre-mp-trigger {
          appearance: none;
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 10px;
          background: var(--accent-soft);
          color: var(--accent-700);
          border: 1px solid color-mix(in oklab, var(--mp-accent, var(--accent)) 26%, transparent);
          border-radius: 999px;
          font: inherit;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background .12s, border-color .12s, box-shadow .12s;
        }
        .dre-mp-trigger:hover { border-color: var(--mp-accent, var(--accent)); }
        .dre-mp-trigger.is-open {
          background: color-mix(in oklab, var(--mp-accent, var(--accent)) 18%, var(--surface));
          border-color: var(--mp-accent, var(--accent));
          box-shadow: 0 0 0 3px color-mix(in oklab, var(--mp-accent, var(--accent)) 18%, transparent);
        }
        .dre-mp-trigger:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px color-mix(in oklab, var(--mp-accent, var(--accent)) 22%, transparent);
        }
        .dre-mp-label { color: var(--text-muted); font-weight: 500; }
        .dre-mp-value {
          font-variant-numeric: tabular-nums;
          letter-spacing: .01em;
          color: var(--text);
        }

        /* When the trigger is "muted" (anterior), use neutral surface */
        .dre-mp-trigger[style*="--mp-accent: var(--text-muted)"] {
          background: var(--surface-3);
          color: var(--text-muted);
          border-color: var(--border);
        }
        .dre-mp-trigger[style*="--mp-accent: var(--text-muted)"] .dre-mp-value { color: var(--text); }
        .dre-mp-trigger[style*="--mp-accent: var(--text-muted)"]:hover { border-color: var(--border-strong); }
        .dre-mp-trigger[style*="--mp-accent: var(--text-muted)"].is-open {
          background: var(--surface);
          border-color: var(--border-strong);
          box-shadow: 0 0 0 3px color-mix(in oklab, var(--text-muted) 14%, transparent);
        }

        .dre-mp-menu {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          min-width: 160px;
          max-height: 280px;
          overflow-y: auto;
          background: var(--surface);
          border: 1px solid var(--border-strong);
          border-radius: 10px;
          box-shadow: 0 10px 28px rgba(15,23,42,.14);
          padding: 4px;
          z-index: 30;
        }
        [data-theme="dark"] .dre-mp-menu { box-shadow: 0 10px 28px rgba(0,0,0,.5); }
        .dre-mp-opt {
          appearance: none; background: transparent; border: 0;
          width: 100%;
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
          padding: 7px 10px;
          border-radius: 6px;
          font: inherit; font-size: 13px;
          color: var(--text);
          cursor: pointer;
          font-variant-numeric: tabular-nums;
          text-align: left;
        }
        .dre-mp-opt:hover { background: var(--surface-3); }
        .dre-mp-opt.is-current { background: var(--accent-soft); color: var(--accent-700); font-weight: 600; }
        .dre-mp-opt.is-disabled { opacity: .35; cursor: not-allowed; text-decoration: line-through; }
        .dre-mp-opt.is-disabled:hover { background: transparent; }

        /* KPI strip */
        .dre-kpi-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
        }
        @media (max-width: 1280px) { .dre-kpi-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 720px)  { .dre-kpi-grid { grid-template-columns: repeat(2, 1fr); } }

        .dre-kpi {
          position: relative;
          appearance: none;
          background: var(--surface);
          border: 1px solid var(--border);
          border-top: 3px solid var(--kpi-accent, #10b981);
          border-radius: 10px;
          padding: 16px 18px 18px;
          display: flex; flex-direction: column; gap: 6px;
          text-align: left;
          color: inherit;
          font: inherit;
          cursor: pointer;
          transition: transform .12s ease, border-color .15s, box-shadow .15s;
        }
        .dre-kpi:hover {
          transform: translateY(-1px);
          border-color: var(--border-strong);
          border-top-color: var(--kpi-accent, #10b981);
          box-shadow: 0 6px 18px rgba(15,23,42,.08), 0 0 0 1px var(--kpi-accent, transparent) inset;
        }
        .dre-kpi:active { transform: translateY(0); }
        .dre-kpi:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px color-mix(in oklab, var(--kpi-accent, var(--accent)) 30%, transparent);
          border-color: var(--kpi-accent, var(--accent));
        }
        .dre-kpi-cta {
          position: absolute;
          top: 14px; right: 14px;
          display: inline-flex; align-items: center; justify-content: center;
          width: 22px; height: 22px;
          border-radius: 50%;
          background: color-mix(in oklab, var(--kpi-accent, var(--accent)) 14%, transparent);
          color: var(--kpi-accent, var(--accent));
          opacity: .65;
          transition: opacity .15s, transform .2s;
        }
        .dre-kpi:hover .dre-kpi-cta {
          opacity: 1;
          transform: translateY(2px);
        }

        .dre-kpi-label {
          font-size: var(--type-sm);
          color: var(--text-muted);
          font-weight: 500;
          letter-spacing: .01em;
        }
        .dre-kpi-value {
          font-size: 24px;
          font-weight: 600;
          color: var(--text);
          letter-spacing: -0.015em;
          line-height: 1.1;
          margin-top: 4px;
          display: flex; align-items: baseline; gap: 4px;
        }
        .dre-kpi-currency { font-size: 13px; color: var(--text-muted); font-weight: 500; }

        .dre-kpi-var {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: .01em;
          margin-top: 2px;
        }
        .dre-kpi-var.is-pos { color: #10b981; }
        .dre-kpi-var.is-neg { color: #ef4444; }
        .dre-kpi-var-vs { color: var(--text-faint); font-weight: 500; margin-left: 2px; }

        .dre-kpi-margin {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 500;
        }

        /* Blocks */
        .dre-blocks { display: flex; flex-direction: column; gap: 22px; }

        .dre-block {
          scroll-margin-top: 16px;
          border-radius: 10px;
          padding: 4px;
          margin: -4px;
          transition: background .35s ease, box-shadow .35s ease;
        }
        .dre-block.is-highlight {
          background: color-mix(in oklab, var(--row-accent) 10%, transparent);
          box-shadow: 0 0 0 1px color-mix(in oklab, var(--row-accent) 28%, transparent);
          animation: dre-block-pulse 1.4s ease;
        }
        @keyframes dre-block-pulse {
          0%   { background: color-mix(in oklab, var(--row-accent) 22%, transparent); }
          100% { background: transparent; }
        }

        .dre-block-h {
          display: flex; align-items: center; gap: 10px;
          padding: 0 4px 8px;
        }
        .dre-block-code {
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; letter-spacing: .08em;
          color: var(--row-accent, var(--text-muted));
          background: color-mix(in oklab, var(--row-accent, var(--text-muted)) 14%, transparent);
          border: 1px solid color-mix(in oklab, var(--row-accent, var(--text-muted)) 32%, transparent);
          padding: 3px 8px; border-radius: 6px;
          min-width: 32px;
        }
        .dre-block-title {
          font-size: var(--type-base);
          font-weight: 600;
          color: var(--text);
          letter-spacing: -0.005em;
        }

        .dre-block-rows {
          display: flex; flex-direction: column; gap: 4px;
        }

        /* Row */
        .dre-row {
          display: grid;
          grid-template-columns: minmax(220px, 1.6fr) 1fr 1fr 1fr 1fr;
          gap: 18px;
          align-items: center;
          padding: 14px 18px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-left: 2px solid var(--row-accent, var(--text-faint));
          border-radius: 5px;
          transition: background .15s, box-shadow .15s, border-color .15s;
        }
        .dre-row:hover {
          box-shadow: 0 2px 10px rgba(15,23,42,.05);
          border-color: var(--border-strong);
          border-left-color: var(--row-accent, var(--text-faint));
        }

        .dre-row-title {
          font-size: var(--type-base);
          color: var(--text);
          font-weight: 500;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .dre-row-cell {
          display: flex; flex-direction: column; gap: 4px;
          min-width: 0;
        }
        .dre-row-cell-h {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px;
          color: var(--text-faint);
          font-weight: 600;
          letter-spacing: .04em;
          text-transform: none;
        }
        .dre-row-cell-h span { white-space: nowrap; }
        .dre-row-cell-h .dre-row-cell-h-uc { text-transform: uppercase; }

        .dre-row-cell-v {
          font-size: var(--type-lg);
          color: var(--text);
          font-weight: 500;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.01em;
          display: inline-flex; align-items: baseline; gap: 4px;
        }
        .dre-row-cur { font-size: 12px; color: var(--text-muted); font-weight: 500; }

        .dre-row-cell-pill .dre-row-cell-h { text-transform: uppercase; letter-spacing: .06em; }

        .dre-pill {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 12px; font-weight: 600;
          font-variant-numeric: tabular-nums;
          letter-spacing: .01em;
          width: fit-content;
          min-width: 92px;
        }
        .dre-pill.is-pos {
          background: #E7F4E9;
          color: #047857;
        }
        .dre-pill.is-neg {
          background: color-mix(in oklab, #ef4444 14%, white);
          color: #b91c1c;
        }
        [data-theme="dark"] .dre-pill.is-pos {
          background: color-mix(in oklab, #10b981 22%, var(--surface));
          color: #6ee7b7;
        }
        [data-theme="dark"] .dre-pill.is-neg {
          background: color-mix(in oklab, #ef4444 22%, var(--surface));
          color: #fca5a5;
        }

        /* Responsive collapse */
        @media (max-width: 1180px) {
          .dre-row { grid-template-columns: minmax(160px, 1.4fr) 1fr 1fr 1fr 1fr; gap: 12px; padding: 12px 14px; }
          .dre-row-cell-v { font-size: var(--type-base); }
        }
        @media (max-width: 920px) {
          .dre-row {
            grid-template-columns: 1fr 1fr;
          }
          .dre-row-title { grid-column: 1 / -1; padding-bottom: 4px; border-bottom: 1px dashed var(--border); margin-bottom: 4px; }
        }

        /* Summary footer */
        .dre-summary { padding: 16px 18px; margin-top: 22px; }
        .dre-summary-h {
          display: flex; align-items: center; gap: 8px;
          color: var(--text-muted);
          font-size: var(--type-sm);
          font-weight: 600;
          letter-spacing: .02em;
          margin-bottom: 14px;
        }
        .dre-summary-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 10px;
        }
        @media (max-width: 1280px) { .dre-summary-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 720px)  { .dre-summary-grid { grid-template-columns: repeat(2, 1fr); } }
        .dre-summary-cell {
          appearance: none;
          padding: 12px;
          border: 1px solid var(--border);
          border-left: 2px solid var(--row-accent, var(--text-faint));
          border-radius: 6px;
          background: var(--surface-2);
          display: flex; flex-direction: column; gap: 4px;
          text-align: left;
          color: inherit;
          font: inherit;
          cursor: pointer;
          transition: background .15s, border-color .15s, transform .12s;
        }
        .dre-summary-cell:hover {
          background: var(--surface);
          border-color: var(--border-strong);
          transform: translateY(-1px);
        }
        .dre-summary-cell:active { transform: translateY(0); }
        .dre-summary-cell:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px color-mix(in oklab, var(--row-accent, var(--accent)) 28%, transparent);
        }
        .dre-summary-code {
          font-size: 10px; font-weight: 700; letter-spacing: .08em;
          color: var(--row-accent, var(--text-muted));
        }
        .dre-summary-label {
          font-size: 11px; color: var(--text-muted);
          line-height: 1.3;
          min-height: 28px;
        }
        .dre-summary-value {
          font-size: var(--type-lg);
          color: var(--text);
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.01em;
        }
      `}</style>
    );
  }

  // ---------- Exports ----------
  Object.assign(window, { FinDRE });
})();
