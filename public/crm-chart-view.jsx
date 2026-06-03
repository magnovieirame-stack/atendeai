// crm-chart-view.jsx — CRM funnel dashboard (charts & KPIs)

(function () {
  const C = {
    green: '#22C55E',
    greenStrong: '#16A34A',
    greenSoft: '#DCFCE7',
    greenSofter: '#E7F6ED',
    red: '#EF4444',
    redSoft: '#FEE2E2',
    blue: '#3B82F6',
    blueDeep: '#1E40AF',
    blueSky: '#38BDF8',
    blueSoft: '#DBEAFE',
    pink: '#F43F5E',
    coral: '#FB7185',
    orange: '#F97316',
    orangeLight: '#FB923C',
    teal: '#14B8A6',
    purple: '#7C3AED',
    yellow: '#FACC15',
    text: 'var(--text)',
    muted: 'var(--text-muted)',
    faint: 'var(--text-faint)',
    border: 'var(--border)',
    surface: 'var(--surface)',
    surface2: 'var(--surface-2)',
    surface3: 'var(--surface-3)'
  };

  const fmtBRL = (v, d = 2) =>
  'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtNum = (v) => Number(v || 0).toLocaleString('pt-BR');
  const fmtK = (v) => v >= 1000 ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : Math.round(v).toString();

  // — Card wrapper ————————————————————————————————————————

  function Card({ title, icon, right, children, style, bodyStyle, dense, headerStyle }) {
    return (
      <div className="card" style={{
        padding: dense ? '14px 16px' : 16,
        display: 'flex', flexDirection: 'column', gap: 12,
        minWidth: 0, minHeight: 0,
        ...style
      }}>
        {(title || right) &&
        <div className="row" style={{ alignItems: 'center', gap: 8, ...headerStyle }}>
            {icon &&
          <span style={{
            width: 26, height: 26, borderRadius: 7,
            background: C.greenSofter, color: C.greenStrong,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}><Ic name={icon} size={13} /></span>}
            {title && <span style={{ fontWeight: 700, fontSize: 'var(--type-md)', letterSpacing: '-.01em' }}>{title}</span>}
            <div className="spacer" />
            {right}
          </div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, ...bodyStyle }}>
          {children}
        </div>
      </div>);
  }

  // — Delta pill —————————————————————————————————————————

  function Delta({ value, dir = 'up', neutral }) {
    const color = neutral ? C.blue : dir === 'up' ? C.greenStrong : C.red;
    const bg = neutral ? '#DBEAFE' : dir === 'up' ? C.greenSofter : C.redSoft;
    const arrow = neutral ? '≡' : dir === 'up' ? '▲' : '▼';
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        padding: '2px 8px', borderRadius: 999,
        background: bg, color, fontSize: 11, fontWeight: 700, lineHeight: 1.4,
        width: 'fit-content'
      }}>
        <span style={{ fontSize: 9 }}>{arrow}</span>{value}
      </span>);
  }

  // — Hover-able 8 KPI tiles (top-right) —————————————————

  function KpiSmall({ label, value, delta, dir, icon }) {
    const [h, setH] = React.useState(false);
    return (
      <div
        onMouseEnter={() => setH(true)}
        onMouseLeave={() => setH(false)}
        style={{
          background: C.surface, border: '1px solid ' + C.border, borderRadius: 12,
          padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6,
          minWidth: 0,
          transform: h ? 'translateY(-2px)' : 'translateY(0)',
          boxShadow: h ?
          '0 14px 28px -14px rgba(15,23,42,.20), 0 4px 8px -4px rgba(15,23,42,.08)' :
          '0 1px 2px rgba(15,23,42,.03)',
          borderColor: h ? C.greenStrong : C.border,
          transition: 'transform .18s ease, box-shadow .18s ease, border-color .18s ease'
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, minHeight: 24 }}>
          <span style={{
            width: 18, height: 18, borderRadius: 5,
            background: C.greenSofter, color: C.greenStrong,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}><Ic name={icon || 'reports'} size={10} /></span>
          <span style={{
            fontSize: 10.5, color: C.muted, fontWeight: 600,
            letterSpacing: '.04em', textTransform: 'uppercase',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden', lineHeight: 1.2
          }}>{label}</span>
        </div>
        <div className="tnum" style={{ fontSize: 24, fontWeight: 700, color: C.text, letterSpacing: '-.02em', lineHeight: 1.05 }}>
          {value}
        </div>
        {delta && <Delta value={delta} dir={dir} />}
      </div>);
  }

  // — "Negócios" hero card with progress + 3 sub-tiles ——

  function NegociosBlock({ done, total, pct, ganhos, perdidos, abertos }) {
    const [h, setH] = React.useState(false);
    const ratio = pct != null ? pct : total ? done / total * 100 : 0;
    return (
      <Card icon="reports" title="Negócios" dense
      right={<span className="tnum" style={{ fontWeight: 800, fontSize: 22, color: C.greenStrong, letterSpacing: '-.02em' }}>{ratio.toFixed(2).replace('.', ',')}%</span>}>
        <div
          onMouseEnter={() => setH(true)}
          onMouseLeave={() => setH(false)}
          title={`${done} de ${total} negócios concluídos`}
          style={{
            height: 12, borderRadius: 999, background: C.surface3, overflow: 'hidden',
            cursor: 'help', position: 'relative'
          }}>
          <div style={{
            width: ratio + '%', height: '100%',
            background: `linear-gradient(90deg, ${C.green}, ${C.greenStrong})`,
            borderRadius: 999,
            boxShadow: h ? `0 0 0 3px color-mix(in oklab, ${C.green} 20%, transparent)` : 'none',
            transition: 'box-shadow .18s ease'
          }} />
        </div>
        <div className="muted" style={{ fontSize: 13, color: C.faint }}>Total {fmtNum(done)} de {fmtNum(total)}</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginTop: 4 }}>
          <SubTile label="Negócios Ganhos" value={fmtBRL(ganhos.value)} delta={ganhos.delta} dir="up" icon="arrow-up-right" iconRotate={0} countLabel={`${ganhos.count} Negócios`} accent={C.green} />
          <SubTile label="Negócios Perdidos" value={fmtBRL(perdidos.value)} delta={perdidos.delta} dir="down" icon="arrow-up-right" iconRotate={90} countLabel={`${perdidos.count} Negócios`} accent={C.red} />
          <SubTile label="Negócios Abertos" value={fmtBRL(abertos.value)} delta={abertos.delta} neutral icon="activity" countLabel={`${abertos.count} Negócios`} accent={C.blue} />
        </div>
      </Card>);
  }

  function SubTile({ label, value, delta, dir, neutral, icon, iconRotate, countLabel, accent }) {
    const [h, setH] = React.useState(false);
    return (
      <div
        onMouseEnter={() => setH(true)}
        onMouseLeave={() => setH(false)}
        style={{
          border: '1px solid ' + C.border, borderRadius: 10, padding: '10px 12px',
          background: C.surface, display: 'flex', flexDirection: 'column', gap: 5,
          minWidth: 0,
          transform: h ? 'translateY(-2px)' : 'translateY(0)',
          boxShadow: h ? '0 10px 24px -12px rgba(15,23,42,.18)' : 'none',
          borderColor: h ? accent : C.border,
          transition: 'transform .18s ease, box-shadow .18s ease, border-color .18s ease'
        }}>
        <div className="row" style={{ alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11.5, color: C.muted, fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
          <span style={{ color: accent, display: 'inline-flex', transform: iconRotate ? `rotate(${iconRotate}deg)` : 'none' }}><Ic name={icon} size={13} /></span>
        </div>
        <div className="tnum" style={{ fontSize: 19, fontWeight: 800, color: C.text, letterSpacing: '-.02em', lineHeight: 1.05 }}>{value}</div>
        <Delta value={delta} dir={dir} neutral={neutral} />
        <div style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>{countLabel}</div>
      </div>);
  }

  // — Funnel chart with conversion arrows ————————————————

  function FunnelChart({ stages, transitions }) {
    const [hover, setHover] = React.useState(null);
    const n = stages.length;
    // Tapering width: 100% at top → ~58% at bottom
    const widthAt = (i) => 100 - i / Math.max(n - 1, 1) * (n <= 4 ? 42 : 32);
    return (
      <div style={{
        flex: 1, minHeight: 0,
        display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 132px',
        gap: 8, padding: '4px 4px'
      }}>
        {/* Funnel column — stack of rounded blocks of decreasing width */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          minHeight: 0, gap: 6
        }}>
          {stages.map((s, i) => {
            const isH = hover === s.id;
            return (
              <div
                key={s.id}
                onMouseEnter={() => setHover(s.id)}
                onMouseLeave={() => setHover(null)}
                title={`${s.label}: ${fmtNum(s.count)} negócios`}
                style={{
                  flex: 1, minHeight: 0,
                  width: `${widthAt(i)}%`,
                  background: s.color,
                  borderRadius: 22,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  color: '#fff', cursor: 'default',
                  transform: isH ? 'scale(1.015)' : 'scale(1)',
                  filter: isH ? 'brightness(1.06) saturate(1.05)' : 'brightness(1)',
                  boxShadow: isH ?
                  `0 10px 24px -8px ${s.color}66, 0 2px 6px rgba(15,23,42,.08)` :
                  '0 2px 6px rgba(15,23,42,.06)',
                  transition: 'transform .2s ease, filter .2s ease, box-shadow .2s ease'
                }}>
                <div style={{ fontSize: n > 4 ? 10 : 11, fontWeight: 700, letterSpacing: '.08em', opacity: .95, padding: '0 12px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{s.label}</div>
                <div className="tnum" style={{ fontSize: n > 4 ? 26 : 30, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1 }}>{fmtNum(s.count)}</div>
                <div style={{ fontSize: n > 4 ? 10 : 11, opacity: .85, marginTop: 2 }}>Negócios</div>
              </div>);
          })}
        </div>

        {/* Transitions column — small cards positioned via percentages between stages */}
        <div style={{ position: 'relative' }}>
          {transitions.map((t, i) => {
            const pctTop = 100 / n * (i + 1);
            return (
              <TransitionCard
                key={i}
                topPct={pctTop}
                pct={t.pct}
                dir={t.dir}
                value={t.value}
                wait={t.wait}
                isFirst={i === 0}
                isLast={i === transitions.length - 1} />);

          })}
        </div>
      </div>);
  }

  function TransitionCard({ topPct, pct, dir, value, wait, isFirst, isLast }) {
    const [h, setH] = React.useState(false);
    const isUp = dir === 'up';
    const tone = isUp ? C.greenStrong : C.red;
    const toneSoft = isUp ? C.greenSofter : C.redSoft;
    const stroke = '#94A3B8';
    // Wrapper 88px tall, centered between stages.
    // Card sits inside with 10px margin on all 4 sides → ~68px tall, ~112px wide
    // Connector arrows are horizontally centered (vertical drop at x=66 of viewBox 132)
    return (
      <div style={{
        position: 'absolute',
        top: `calc(${topPct}% - 44px)`,
        left: 0, right: 0,
        height: 88,
        pointerEvents: 'none'
      }}>
        {/* Top connector: from funnel side (10px gap) → right to card center → down (ends 10px above card top) */}
        <svg width="100%" height="26" viewBox="0 0 132 26" preserveAspectRatio="none"
        style={{ position: 'absolute', top: -16, left: 0, overflow: 'visible' }}>
          <path d="M 10 4 L 66 4 L 66 16" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 62 12 L 66 16 L 70 12" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {/* Card — 10px margins on all sides */}
        <div
          onMouseEnter={() => setH(true)}
          onMouseLeave={() => setH(false)}
          style={{
            position: 'absolute',
            top: 10, left: 10, right: 10, bottom: 10,
            background: C.surface, border: `1px solid ${h ? tone : C.border}`,
            borderRadius: 10, padding: '6px 9px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2,
            boxShadow: h ? '0 10px 20px -10px rgba(15,23,42,.22)' : '0 1px 2px rgba(15,23,42,.04)',
            transform: h ? 'translateY(-1px)' : 'translateY(0)',
            transition: 'transform .18s ease, box-shadow .18s ease, border-color .18s ease',
            pointerEvents: 'auto',
            overflow: 'hidden'
          }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
            <span style={{
              width: 13, height: 13, borderRadius: 3, background: toneSoft, color: tone,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <span style={{ transform: isUp ? 'none' : 'rotate(90deg)', display: 'inline-flex' }}><Ic name="arrow-up-right" size={9} /></span>
            </span>
            <span style={{ fontSize: 9.5, color: tone, fontWeight: 700, whiteSpace: 'nowrap' }}>{pct}% conversão</span>
          </div>
          <div className="tnum" style={{ fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: '-.01em', whiteSpace: 'nowrap' }}>{value}</div>
          <div style={{ fontSize: 9, color: C.faint, lineHeight: 1.25 }}>
            Tempo de Espera: <span style={{ color: C.muted, fontWeight: 600, whiteSpace: 'nowrap' }}>{wait}</span>
          </div>
        </div>

        {/* Bottom connector: from below card center (10px gap) → down → left toward funnel (10px gap from wrapper edge) */}
        <svg width="100%" height="26" viewBox="0 0 132 26" preserveAspectRatio="none"
        style={{ position: 'absolute', bottom: -16, left: 0, overflow: 'visible' }}>
          <path d="M 66 10 L 66 22 L 10 22" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 16 18 L 10 22 L 16 26" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>);
  }

  // — Stacked monthly chart (Negócio Mensal) ——————————————

  function StackedMonthly({ data, totals }) {
    const [hover, setHover] = React.useState(null); // {idx, seg}
    const [mouse, setMouse] = React.useState(null); // {x, y} in container px coords
    const containerRef = React.useRef(null);
    const [size, setSize] = React.useState({ w: 720, h: 240 });
    React.useEffect(() => {
      if (!containerRef.current) return;
      const ro = new ResizeObserver((entries) => {
        const r = entries[0].contentRect;
        if (r.width > 0 && r.height > 0) setSize({ w: r.width, h: r.height });
      });
      ro.observe(containerRef.current);
      return () => ro.disconnect();
    }, []);
    const max = Math.max(...data.map((d) => d.total + d.won + d.lost)) * 1.08;
    const padL = 36,padR = 12,padT = 18,padB = 28;
    const W = size.w,H = size.h;

    const innerW = W - padL - padR,innerH = H - padT - padB;
    const barW = Math.min(34, innerW / data.length - 8);
    const step = innerW / data.length;

    const yTicks = 6;
    const ticks = Array.from({ length: yTicks + 1 }, (_, i) => Math.round(max / yTicks * i));

    const GAP = 3; // gap between stacked segments (px in viewBox)

    const SEG_META = {
      total: { color: C.blueSky, strong: C.blueDeep, label: 'Total Negócios', key: 'total' },
      won: { color: C.green, strong: C.greenStrong, label: 'Negócios ganhos', key: 'won' },
      lost: { color: C.coral, strong: C.red, label: 'Negócios perdidos', key: 'lost' }
    };

    const handleEnter = (i, seg, e) => {
      setHover({ idx: i, seg });
      const r = containerRef.current?.getBoundingClientRect();
      if (r) setMouse({ x: e.clientX - r.left, y: e.clientY - r.top });
    };
    const handleMove = (e) => {
      const r = containerRef.current?.getBoundingClientRect();
      if (r) setMouse({ x: e.clientX - r.left, y: e.clientY - r.top });
    };
    const handleLeave = () => {setHover(null);setMouse(null);};

    return (
      <div ref={containerRef} style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: '100%', height: '100%' }}>
          {ticks.map((t, i) => {
            const y = padT + innerH - innerH * (t / max);
            return (
              <g key={i}>
                <line x1={padL} y1={y} x2={W - padR} y2={y} stroke={C.border} strokeDasharray={i === 0 ? '0' : '2 4'} />
                <text x={padL - 8} y={y + 3} fontSize="10" fill={C.faint} textAnchor="end">{Math.round(t / 1000)}k</text>
              </g>);
          })}

          {data.map((d, i) => {
            const x = padL + i * step + (step - barW) / 2;
            const totalH = innerH * (d.total / max);
            const wonH = innerH * (d.won / max);
            const lostH = innerH * (d.lost / max);
            const ySum = padT + innerH;
            const totalTop = ySum - totalH;
            const wonTop = totalTop - GAP - wonH;
            const lostTop = wonTop - GAP - lostH;
            const anyH = hover && hover.idx === i;
            const segStyle = (key) => ({
              cursor: 'default',
              opacity: !anyH ? 0.92 : hover.seg === key ? 1 : 0.38,
              transition: 'opacity .15s ease'
            });
            return (
              <g key={i}>
                <rect x={x - 2} y={padT} width={barW + 4} height={innerH} fill="transparent" />
                {/* Total (blue, bottom) */}
                <rect x={x} y={totalTop} width={barW} height={totalH}
                fill={C.blueSky} rx="2"
                style={segStyle('total')}
                onMouseEnter={(e) => handleEnter(i, 'total', e)}
                onMouseMove={handleMove}
                onMouseLeave={handleLeave} />
                {/* Won (green, middle) */}
                <rect x={x} y={wonTop} width={barW} height={wonH}
                fill={C.green} rx="2"
                style={segStyle('won')}
                onMouseEnter={(e) => handleEnter(i, 'won', e)}
                onMouseMove={handleMove}
                onMouseLeave={handleLeave} />
                {/* Lost (pink, top) */}
                <rect x={x} y={lostTop} width={barW} height={lostH}
                fill={C.coral} rx="2"
                style={segStyle('lost')}
                onMouseEnter={(e) => handleEnter(i, 'lost', e)}
                onMouseMove={handleMove}
                onMouseLeave={handleLeave} />
                <text x={x + barW / 2} y={H - 8} fontSize="11" fill={anyH ? C.text : C.muted} textAnchor="middle" fontWeight={anyH ? 700 : 500}>{d.label}</text>
              </g>);
          })}
        </svg>

        {/* Tooltip — follows mouse, always above cursor */}
        {hover && mouse &&
        (() => {
          const d = data[hover.idx];
          const meta = SEG_META[hover.seg];
          const totalAll = d.total + d.won + d.lost || 1;
          const segValue = d[meta.key];
          // synthesize a count for display (mock data has only values)
          const segCount = Math.round(segValue / 1000);
          const cw = containerRef.current?.clientWidth || 0;
          // Clamp horizontal anchor so tooltip stays on-screen
          const TW = 180; // approx tooltip width
          let translateX = '-50%';
          if (mouse.x - TW / 2 < 4) translateX = '0%';else
          if (mouse.x + TW / 2 > cw - 4) translateX = '-100%';
          return (
            <div style={{
              position: 'absolute',
              left: mouse.x,
              top: mouse.y - 12,
              transform: `translate(${translateX}, -100%)`,
              background: C.surface, border: '1px solid ' + C.border, borderRadius: 10,
              padding: '10px 12px', minWidth: 170, maxWidth: 220,
              boxShadow: '0 12px 30px -10px rgba(15,23,42,.28), 0 2px 6px rgba(15,23,42,.06)',
              pointerEvents: 'none', zIndex: 5,
              transition: 'opacity .12s ease'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11.5, color: C.text, fontWeight: 600, whiteSpace: 'nowrap' }}>{meta.label}</span>
                  </div>
                  <span style={{ fontSize: 10, color: C.faint, fontWeight: 600, whiteSpace: 'nowrap' }}>{d.label}/26</span>
                </div>
                <div className="tnum" style={{ fontSize: 18, fontWeight: 800, color: meta.strong, marginTop: 4, letterSpacing: '-.02em' }}>{fmtBRL(segValue)}</div>
                <div style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>
                  Total <span style={{ color: C.text, fontWeight: 700 }}>{fmtNum(segCount)}</span>
                  <span style={{ margin: '0 4px' }}>·</span>
                  <span style={{ color: meta.strong, fontWeight: 700 }}>{(segValue / totalAll * 100).toFixed(2).replace('.', ',')}%</span>
                </div>
              </div>);
        })()
        }
      </div>);
  }

  // — Vertical bar chart (Receita Mensal) ———————————————

  function VBars({ data, color = C.green, formatVal }) {
    const [hover, setHover] = React.useState(null);
    const containerRef = React.useRef(null);
    const [size, setSize] = React.useState({ w: 460, h: 220 });
    React.useEffect(() => {
      if (!containerRef.current) return;
      const ro = new ResizeObserver((entries) => {
        const r = entries[0].contentRect;
        if (r.width > 0 && r.height > 0) setSize({ w: r.width, h: r.height });
      });
      ro.observe(containerRef.current);
      return () => ro.disconnect();
    }, []);
    const max = Math.max(...data.map((d) => d.v)) * 1.18;
    const padL = 36,padR = 8,padT = 22,padB = 26;
    const W = size.w,H = size.h;
    const innerW = W - padL - padR,innerH = H - padT - padB;
    const step = innerW / data.length;
    const barW = Math.min(22, step - 6);
    const ticks = [0, .25, .5, .75, 1].map((p) => Math.round(p * max));
    return (
      <div ref={containerRef} style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: '100%', height: '100%' }}>
        {ticks.map((t, i) => {
            const y = padT + innerH - innerH * (t / max);
            return (
              <g key={i}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke={C.border} strokeDasharray={i === 0 ? '0' : '2 4'} />
              <text x={padL - 6} y={y + 3} fontSize="9" fill={C.faint} textAnchor="end">{fmtK(t)}</text>
            </g>);
          })}
        {data.map((d, i) => {
            const x = padL + i * step + (step - barW) / 2;
            const h = innerH * (d.v / max);
            const y = padT + innerH - h;
            const isH = hover === i;
            return (
              <g key={i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'default' }}>
              <rect x={x - 3} y={padT} width={barW + 6} height={innerH} fill="transparent" />
              <rect x={x} y={y} width={barW} height={h} rx="3" fill={color} opacity={isH ? 1 : .9}
                style={{ transition: 'opacity .15s' }} />
              <text x={x + barW / 2} y={y - 6} fontSize="9.5" fill={isH ? C.text : C.muted} textAnchor="middle" fontWeight="700">{formatVal ? formatVal(d.v) : d.v}</text>
              <text x={x + barW / 2} y={H - 8} fontSize="10" fill={C.muted} textAnchor="middle">{d.label}</text>
            </g>);
          })}
        </svg>
      </div>);
  }

  // — Donut chart (Origem Dos Leads) ————————————————————

  function Donut({ data, size = 180, thickness = 30 }) {
    const [hover, setHover] = React.useState(null);
    const [mouse, setMouse] = React.useState(null);
    const containerRef = React.useRef(null);
    const total = data.reduce((s, d) => s + d.v, 0);
    const r = size / 2 - 4;
    const cx = size / 2, cy = size / 2;
    const innerR = r - thickness;
    let acc = 0;
    const slices = data.map((d, idx) => {
      const s0 = acc / total * Math.PI * 2 - Math.PI / 2;
      acc += d.v;
      const s1 = acc / total * Math.PI * 2 - Math.PI / 2;
      const large = s1 - s0 > Math.PI ? 1 : 0;
      const x1 = cx + r * Math.cos(s0), y1 = cy + r * Math.sin(s0);
      const x2 = cx + r * Math.cos(s1), y2 = cy + r * Math.sin(s1);
      const x3 = cx + innerR * Math.cos(s1), y3 = cy + innerR * Math.sin(s1);
      const x4 = cx + innerR * Math.cos(s0), y4 = cy + innerR * Math.sin(s0);
      const path = `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${innerR},${innerR} 0 ${large} 0 ${x4},${y4} Z`;
      const mid = (s0 + s1) / 2;
      return { path, color: d.color, mid, label: d.label, v: d.v, idx };
    });

    const updateMouse = (e) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    return (
      <div ref={containerRef} style={{ position: 'relative', width: size, height: size, maxHeight: 200, maxWidth: 200, flexShrink: 0 }}>
        <svg viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', display: 'block' }}>
          {slices.map((s) =>
            <path key={s.idx} d={s.path} fill={s.color}
              opacity={hover === null || hover === s.idx ? 1 : .42}
              transform={hover === s.idx ? `translate(${Math.cos(s.mid) * 4},${Math.sin(s.mid) * 4})` : ''}
              style={{ transition: 'opacity .18s, transform .18s', cursor: 'pointer' }}
              onMouseEnter={(e) => { setHover(s.idx); updateMouse(e); }}
              onMouseMove={(e) => { setHover(s.idx); updateMouse(e); }}
              onMouseLeave={() => { setHover(null); setMouse(null); }} />)}
        </svg>
        {hover !== null && mouse && (() => {
          const s = slices[hover];
          const pct = (s.v / total * 100).toFixed(1).replace('.', ',');
          return (
            <div style={{
              position: 'absolute',
              left: mouse.x - 12,
              top: mouse.y,
              transform: 'translate(-100%, -50%)',
              background: C.surface, border: '1px solid ' + C.border, borderRadius: 10,
              padding: '8px 12px',
              boxShadow: '0 12px 30px -10px rgba(15,23,42,.28), 0 2px 6px rgba(15,23,42,.06)',
              pointerEvents: 'none', zIndex: 5, whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{s.label}</span>
              <span className="tnum" style={{ fontSize: 13, fontWeight: 800, color: s.color, letterSpacing: '-.02em' }}>{pct}%</span>
            </div>);
        })()}
      </div>);
  }

  // — Tiny stacked sparkline (legend area for Negócio Mensal) ——

  function MiniStacked({ a, b, color1 = C.green, color2 = C.coral }) {
    // 36 micro vertical bars stacked
    const bars = Array.from({ length: 36 }, (_, i) => ({
      h1: 0.4 + 0.6 * Math.abs(Math.sin(i * 0.7)),
      h2: 0.2 + 0.55 * Math.abs(Math.cos(i * 0.5 + 1))
    }));
    return (
      <svg viewBox="0 0 144 36" style={{ width: 144, height: 36 }}>
        {bars.map((b, i) => {
          const x = i * 4;
          const h1 = 14 * b.h1,h2 = 14 * b.h2;
          return (
            <g key={i}>
              <rect x={x} y={36 - h1} width="3" height={h1} fill={color1} />
              <rect x={x} y={36 - h1 - h2 - 1} width="3" height={h2} fill={color2} />
            </g>);
        })}
      </svg>);
  }

  // — Main view ————————————————————————————————————————

  function CRMChartView({ phases, cards }) {
    // Responsive width detection
    const wrapRef = React.useRef(null);
    const [w, setW] = React.useState(1240);
    React.useEffect(() => {
      if (!wrapRef.current) return;
      const ro = new ResizeObserver((entries) => {
        setW(entries[0].contentRect.width);
      });
      ro.observe(wrapRef.current);
      return () => ro.disconnect();
    }, []);
    const narrow = w < 1100; // stack the two main rows into single column each
    const veryNarrow = w < 700; // also stack the 8 KPIs into 2 cols and Origem/Receita stack

    // Derive dynamics from data where reasonable
    const totalValue = cards.reduce((s, c) => s + (c.value || 0), 0);
    const cardCount = cards.length;
    const wonCount = cards.filter((c) => /fech|ganho/i.test(c.phase)).length || 17;
    const lostCount = 36;
    const openCount = Math.max(cardCount - wonCount, 0) || 527;

    // ── 8 KPIs (top-right) ───────────────────────────────
    const kpiTop = [
    { label: 'ROI (RET)', value: '1,78', delta: '12,25%', dir: 'up', icon: 'reports' },
    { label: 'CPA', value: 'R$ 56,69', delta: '8,54%', dir: 'down', icon: 'cart' },
    { label: 'Taxa de Conversão', value: '47,60%', delta: '8,31%', dir: 'up', icon: 'zap' },
    { label: 'LTV Estimado', value: 'R$ 1.840', delta: '3,12%', dir: 'up', icon: 'star' },
    { label: 'Ticket Médio', value: fmtBRL(2940, 0), delta: '8,06%', dir: 'up', icon: 'finance' },
    { label: 'Taxa de Clique (CTR)', value: '6,25%', delta: '1,84%', dir: 'up', icon: 'activity' },
    { label: 'CPC', value: 'R$ 416,93', delta: '5,01%', dir: 'down', icon: 'finance' },
    { label: 'Vendas 🚀', value: '474', delta: '12,25%', dir: 'up', icon: 'arrow-up-right' }];


    // ── Funnel stages — derived dynamically from board's phases + cards ──
    const stages = (phases || []).map((p) => {
      const inPhase = (cards || []).filter((c) => c.phase === p.id);
      return {
        id: p.id,
        label: (p.label || '').toUpperCase(),
        count: inPhase.length,
        value: inPhase.reduce((s, c) => s + (c.value || 0), 0),
        color: p.color
      };
    });
    // ── Transitions between consecutive stages (n-1) ─────
    const waitOptions = ['3 Dias', '5 Dias', '7 Dias', '12 Dias', '2 Semanas'];
    const transitions = stages.slice(0, -1).map((s, i) => {
      const next = stages[i + 1];
      const ratio = s.count > 0 ? next.count / s.count : 0;
      const pct = Math.round(ratio * 100);
      return {
        pct,
        dir: ratio >= 0.4 ? 'up' : 'down',
        value: fmtBRL(next.value || 0),
        wait: waitOptions[i % waitOptions.length]
      };
    });

    // ── Monthly stacked data (Negócio Mensal) ────────────
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const stacked = months.map((m, i) => {
      const base = [32, 52, 46, 68, 18, 46, 66, 42, 52, 32, 46, 58][i] * 1000;
      const won = [22, 28, 20, 30, 6, 18, 26, 18, 22, 16, 24, 28][i] * 1000;
      const lost = [18, 20, 24, 30, 12, 4, 18, 14, 18, 8, 16, 22][i] * 1000;
      return { label: m, total: base, won, lost };
    });

    // ── Origem dos Leads (donut) ─────────────────────────
    const origin = [
    { label: 'Orgânico', v: 35.6, color: C.green },
    { label: 'Paid Ads', v: 28.7, color: C.blue },
    { label: 'Referência', v: 17.8, color: C.purple },
    { label: 'Direto', v: 10.9, color: C.orangeLight },
    { label: 'Outros', v: 7.0, color: C.pink }];


    // ── Leads Gerados (green bars) ───────────────────────
    const leadsMensais = [
    { label: 'Jan', v: 286 },
    { label: 'Fev', v: 542 },
    { label: 'Mar', v: 418 },
    { label: 'Abr', v: 467 },
    { label: 'Mai', v: 521 },
    { label: 'Jun', v: 394 },
    { label: 'Jul', v: 348 },
    { label: 'Ago', v: 362 },
    { label: 'Set', v: 312 },
    { label: 'Out', v: 436 },
    { label: 'Nov', v: 241 },
    { label: 'Dez', v: 408 }];
    const totalLeads = leadsMensais.reduce((s, d) => s + d.v, 0);


    return (
      <div ref={wrapRef} style={{
        flex: 1, minHeight: 0,
        overflowY: 'auto', overflowX: 'hidden',
        background: '#F1F4F8', padding: 16,
        display: 'flex', flexDirection: 'column', gap: 12
      }}>
        {/* ─── Row 1: Negócios + 8 KPIs ─── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: narrow ? 'minmax(0, 1fr)' : 'minmax(0, 1.05fr) minmax(0, 1.55fr)',
          gap: 12,
          flexShrink: 0
        }}>
          <NegociosBlock
            done={473} total={725} pct={65.23}
            ganhos={{ value: 48950.23, delta: '12,56%', count: 17 }}
            perdidos={{ value: 75256.23, delta: '17,36%', count: 36 }}
            abertos={{ value: 145125.55, delta: '65,46%', count: 527 }} />

          <div style={{ display: 'grid', gridTemplateColumns: veryNarrow ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
            {kpiTop.map((k, i) =>
            <KpiSmall key={i} label={k.label} value={k.value} delta={k.delta} dir={k.dir} icon={k.icon} />)}
          </div>
        </div>

        {/* ─── Row 2: Funnel + (Monthly + (Origem | Receita)) ─── */}
        <div style={{
          flex: 1, minHeight: 380,
          display: 'grid',
          gridTemplateColumns: narrow ? 'minmax(0, 1fr)' : 'minmax(0, 1.05fr) minmax(0, 1.55fr)',
          gap: 12,
          alignItems: 'stretch'
        }}>
          {/* Funnel */}
          <Card style={{ height: '100%' }} bodyStyle={{ flex: 1, minHeight: 0 }}>
            <FunnelChart stages={stages} transitions={transitions} />
          </Card>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0, minHeight: 0 }}>
            <Card
              style={{ flex: 1.1, minHeight: 0 }}
              headerStyle={{ alignItems: 'flex-start' }}
              icon="reports"
              title={
              <span style={{ display: 'inline-flex', flexDirection: 'column', verticalAlign: 'middle', alignItems: 'flex-start', lineHeight: 1.15 }}>
                  <span style={{ fontWeight: 700, fontSize: "18px" }}>Negócio Mensal</span>
                  <span className="tnum" style={{ fontWeight: 800, color: C.greenStrong, letterSpacing: '-.02em', marginTop: 2, fontSize: "16px" }}>{fmtBRL(563236.26)}</span>
                </span>
              }
              right={
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 22 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: C.muted, fontWeight: 600 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.blueSky }} />
                        <span>Total Negócios</span>
                      </div>
                      <div className="tnum" style={{ fontSize: 15, fontWeight: 800, color: C.blueDeep, letterSpacing: '-.02em', paddingLeft: 14, alignSelf: 'stretch', textAlign: 'right' }}>2.569</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: C.muted, fontWeight: 600 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.green }} />
                        <span>Ganhos</span>
                      </div>
                      <div className="tnum" style={{ fontSize: 15, fontWeight: 800, color: C.greenStrong, letterSpacing: '-.02em', paddingLeft: 14, alignSelf: 'stretch', textAlign: 'right' }}>32,48%</div>
                      <div className="tnum" style={{ fontSize: 11, color: C.faint, fontWeight: 600, paddingLeft: 14, alignSelf: 'stretch', textAlign: 'right' }}>854</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: C.muted, fontWeight: 600 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.coral }} />
                        <span>Perdidos</span>
                      </div>
                      <div className="tnum" style={{ fontSize: 15, fontWeight: 800, color: C.red, letterSpacing: '-.02em', paddingLeft: 14, alignSelf: 'stretch', textAlign: 'right' }}>67,52%</div>
                      <div className="tnum" style={{ fontSize: 11, color: C.faint, fontWeight: 600, paddingLeft: 14, alignSelf: 'stretch', textAlign: 'right' }}>1.734</div>
                    </div>
                  </div>
                </div>
              }
              bodyStyle={{ paddingTop: 4, flex: 1, minHeight: 0 }}>
              <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
                <StackedMonthly data={stacked} />
              </div>
            </Card>

            <div style={{
              flex: 1, minHeight: 0,
              display: 'grid',
              gridTemplateColumns: veryNarrow ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) minmax(0, 1fr)',
              gap: 12, minWidth: 0
            }}>
              <Card icon="contracts" title="Origem Dos Leads" style={{ height: '100%' }} bodyStyle={{ flex: 1, minHeight: 0 }}>
                <div className="row" style={{ gap: 14, alignItems: 'center', flexWrap: 'nowrap', flex: 1, minHeight: 0 }}>
                  <div style={{ flex: '0 0 auto', minWidth: 0, height: '100%', display: 'flex', alignItems: 'center' }}>
                    <Donut data={origin} thickness={22} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
                    {origin.map((d, i) =>
                    <LegendRow key={i} color={d.color} label={d.label} pct={d.v} />)}
                  </div>
                </div>
              </Card>

              <Card icon="leads" title="Leads Gerados"
              style={{ height: '100%' }} bodyStyle={{ flex: 1, minHeight: 0 }}
              right={<span className="tnum" style={{ fontWeight: 800, fontSize: 14, color: C.greenStrong }}>{fmtNum(totalLeads)} Leads</span>}>
                <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
                  <VBars data={leadsMensais} color={C.green} formatVal={(v) => fmtNum(v)} />
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>);
  }

  // — Legend bits ———————————————————————————————————————

  function Legend({ color, label, right }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.muted, fontWeight: 600 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
        <span>{label}</span>
        {right && <span style={{ marginLeft: 4 }}>{right}</span>}
      </div>);
  }

  function LegendRow({ color, label, pct }) {
    const [h, setH] = React.useState(false);
    return (
      <div
        onMouseEnter={() => setH(true)}
        onMouseLeave={() => setH(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 8px', borderRadius: 8,
          background: h ? C.surface2 : 'transparent',
          transition: 'background .15s ease',
          cursor: 'default'
        }}>
        <span style={{ width: 12, height: 12, borderRadius: 4, background: color, flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: C.text, fontWeight: 600, flex: 1 }}>{label}</span>
        <span className="tnum" style={{ fontSize: 12.5, color: C.muted, fontWeight: 700 }}>{pct.toFixed(1)}%</span>
      </div>);
  }

  window.CRMChartView = CRMChartView;
})();