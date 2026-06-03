// commercial-dashboard.jsx — Dashboard Comercial with 9 sub-pages + Premium

(function () {
  // ────────────────────────────────────────────────────────────────────────────
  // Reusable chart primitives (pure SVG, hover tooltips, modern styling)
  // ────────────────────────────────────────────────────────────────────────────

  function useTip() {
    const [tip, setTip] = React.useState(null);
    return [tip, setTip];
  }

  function ChartFrame({ title, sub, right, height = 230, children }) {
    return (
      <div className="cd-chart">
        <div className="cd-chart-hd">
          <div>
            <div className="cd-chart-title">{title}</div>
            {sub && <div className="cd-chart-sub">{sub}</div>}
          </div>
          {right}
        </div>
        <div className="cd-chart-bd" style={{ height }}>{children}</div>
      </div>);
  }

  // Smooth path-line chart with area fill + dots
  function LineChart({ data, color = '#10b981', height = 200, yFmt = (v) => v, label = '' }) {
    const W = 480, H = height, PAD = { l: 36, r: 12, t: 16, b: 24 };
    const max = Math.max(...data.map((d) => d.v)) * 1.15 || 1;
    const min = 0;
    const innerW = W - PAD.l - PAD.r;
    const innerH = H - PAD.t - PAD.b;
    const x = (i) => PAD.l + (data.length === 1 ? innerW / 2 : (i * innerW) / (data.length - 1));
    const y = (v) => PAD.t + innerH - ((v - min) / (max - min)) * innerH;
    const pts = data.map((d, i) => [x(i), y(d.v)]);
    const path = pts.reduce((acc, [px, py], i) => acc + (i === 0 ? `M${px},${py}` : ` L${px},${py}`), '');
    const area = path + ` L${pts[pts.length - 1][0]},${H - PAD.b} L${pts[0][0]},${H - PAD.b} Z`;
    const [tip, setTip] = useTip();
    const yTicks = 4;
    return (
      <div className="cd-svg-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="cd-svg">
          <defs>
            <linearGradient id={`lg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.32" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* gridlines */}
          {Array.from({ length: yTicks + 1 }).map((_, i) => {
            const ty = PAD.t + (i * innerH) / yTicks;
            const v = max - (i * (max - min)) / yTicks;
            return (
              <g key={i}>
                <line x1={PAD.l} y1={ty} x2={W - PAD.r} y2={ty} stroke="var(--border)" strokeDasharray="3 3" />
                <text x={PAD.l - 6} y={ty + 3} textAnchor="end" fontSize="9" fill="var(--text-faint)">{yFmt(Math.round(v))}</text>
              </g>);
          })}
          {/* area */}
          <path d={area} fill={`url(#lg-${color.replace('#','')})`} />
          {/* line */}
          <path d={path} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
          {/* dots */}
          {pts.map(([px, py], i) =>
            <g key={i}>
              <circle cx={px} cy={py} r={tip?.i === i ? 5 : 3.2} fill={color} stroke="#fff" strokeWidth="1.8" style={{ transition: 'r .15s' }} />
              <rect x={px - 16} y={PAD.t} width={32} height={innerH} fill="transparent"
                onMouseEnter={() => setTip({ i, x: px, y: py, d: data[i] })}
                onMouseLeave={() => setTip(null)} />
            </g>)}
          {/* x labels */}
          {data.map((d, i) =>
            <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="9.5" fill="var(--text-faint)">{d.l}</text>)}
        </svg>
        {tip &&
          <div className="cd-tip" style={{ left: `${(tip.x / W) * 100}%`, top: `${(tip.y / H) * 100}%` }}>
            <div className="cd-tip-l">{tip.d.l}{label && ` · ${label}`}</div>
            <div className="cd-tip-v" style={{ color }}>{yFmt(tip.d.v)}</div>
          </div>}
      </div>);
  }

  function BarChart({ data, color = '#0ea5e9', height = 200, yFmt = (v) => v }) {
    const W = 480, H = height, PAD = { l: 36, r: 12, t: 16, b: 24 };
    const max = Math.max(...data.map((d) => d.v)) * 1.15 || 1;
    const innerW = W - PAD.l - PAD.r;
    const innerH = H - PAD.t - PAD.b;
    const bw = innerW / data.length;
    const [tip, setTip] = useTip();
    const yTicks = 4;
    return (
      <div className="cd-svg-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="cd-svg">
          {Array.from({ length: yTicks + 1 }).map((_, i) => {
            const ty = PAD.t + (i * innerH) / yTicks;
            const v = max - (i * max) / yTicks;
            return (
              <g key={i}>
                <line x1={PAD.l} y1={ty} x2={W - PAD.r} y2={ty} stroke="var(--border)" strokeDasharray="3 3" />
                <text x={PAD.l - 6} y={ty + 3} textAnchor="end" fontSize="9" fill="var(--text-faint)">{yFmt(Math.round(v))}</text>
              </g>);
          })}
          {data.map((d, i) => {
            const bh = (d.v / max) * innerH;
            const bx = PAD.l + i * bw + 4;
            const by = H - PAD.b - bh;
            const isHov = tip?.i === i;
            return (
              <g key={i}
                onMouseEnter={() => setTip({ i, x: bx + (bw - 8) / 2, y: by, d })}
                onMouseLeave={() => setTip(null)}>
                <rect x={bx} y={by} width={bw - 8} height={bh} rx="4"
                  fill={d.color || color} opacity={isHov ? 1 : 0.85}
                  style={{ transition: 'opacity .15s' }} />
                <text x={bx + (bw - 8) / 2} y={H - 6} textAnchor="middle" fontSize="9.5" fill="var(--text-faint)">{d.l}</text>
              </g>);
          })}
        </svg>
        {tip &&
          <div className="cd-tip" style={{ left: `${(tip.x / W) * 100}%`, top: `${(tip.y / H) * 100}%` }}>
            <div className="cd-tip-l">{tip.d.l}</div>
            <div className="cd-tip-v" style={{ color: tip.d.color || color }}>{yFmt(tip.d.v)}</div>
          </div>}
      </div>);
  }

  function HBarChart({ data, color = '#8b5cf6', height = 240, vFmt = (v) => v }) {
    const W = 480, H = height, PAD = { l: 110, r: 36, t: 8, b: 8 };
    const max = Math.max(...data.map((d) => d.v)) * 1.15 || 1;
    const innerW = W - PAD.l - PAD.r;
    const rowH = (H - PAD.t - PAD.b) / data.length;
    const [tip, setTip] = useTip();
    return (
      <div className="cd-svg-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="cd-svg">
          {data.map((d, i) => {
            const bw = (d.v / max) * innerW;
            const by = PAD.t + i * rowH + rowH * 0.15;
            const bh = rowH * 0.7;
            const isHov = tip?.i === i;
            return (
              <g key={i}
                onMouseEnter={() => setTip({ i, x: PAD.l + bw, y: by + bh / 2, d })}
                onMouseLeave={() => setTip(null)}>
                <text x={PAD.l - 8} y={by + bh / 2 + 3} textAnchor="end" fontSize="10" fill="var(--text)" fontWeight={isHov ? 700 : 500}>{d.l}</text>
                <rect x={PAD.l} y={by} width={innerW} height={bh} fill="var(--surface-2)" rx="3" />
                <rect x={PAD.l} y={by} width={bw} height={bh} fill={d.color || color} opacity={isHov ? 1 : 0.85} rx="3" style={{ transition: 'opacity .15s' }} />
                <text x={PAD.l + bw + 6} y={by + bh / 2 + 3} fontSize="10" fontWeight="700" fill="var(--text)">{vFmt(d.v)}</text>
              </g>);
          })}
        </svg>
      </div>);
  }

  function Donut({ data, total, totalLabel, size = 200 }) {
    const R = size / 2 - 12;
    const cx = size / 2, cy = size / 2;
    const totalV = data.reduce((s, d) => s + d.v, 0) || 1;
    let acc = 0;
    const [tip, setTip] = useTip();
    return (
      <div className="cd-donut-wrap">
        <svg viewBox={`0 0 ${size} ${size}`} className="cd-donut-svg">
          {data.map((d, i) => {
            const start = (acc / totalV) * Math.PI * 2 - Math.PI / 2;
            acc += d.v;
            const end = (acc / totalV) * Math.PI * 2 - Math.PI / 2;
            const lg = end - start > Math.PI ? 1 : 0;
            const isHov = tip?.i === i;
            const r0 = isHov ? R + 4 : R;
            const r1 = R - 26;
            const sx0 = cx + r0 * Math.cos(start), sy0 = cy + r0 * Math.sin(start);
            const ex0 = cx + r0 * Math.cos(end),   ey0 = cy + r0 * Math.sin(end);
            const sx1 = cx + r1 * Math.cos(end),   sy1 = cy + r1 * Math.sin(end);
            const ex1 = cx + r1 * Math.cos(start), ey1 = cy + r1 * Math.sin(start);
            const path = `M${sx0},${sy0} A${r0},${r0} 0 ${lg} 1 ${ex0},${ey0} L${sx1},${sy1} A${r1},${r1} 0 ${lg} 0 ${ex1},${ey1} Z`;
            return (
              <path key={i} d={path} fill={d.color} style={{ transition: 'all .15s' }}
                onMouseEnter={() => setTip({ i, d })}
                onMouseLeave={() => setTip(null)} />);
          })}
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fill="var(--text-faint)" fontWeight="600">{tip ? tip.d.l : totalLabel}</text>
          <text x={cx} y={cy + 16} textAnchor="middle" fontSize="20" fill="var(--text)" fontWeight="700">{tip ? `${Math.round((tip.d.v / totalV) * 100)}%` : total}</text>
        </svg>
        <div className="cd-donut-legend">
          {data.map((d, i) =>
            <div key={i} className={`cd-leg ${tip?.i === i ? 'on' : ''}`}
              onMouseEnter={() => setTip({ i, d })}
              onMouseLeave={() => setTip(null)}>
              <span className="cd-leg-sw" style={{ background: d.color }} />
              <span className="cd-leg-l">{d.l}</span>
              <span className="cd-leg-v">{d.v}</span>
            </div>)}
        </div>
      </div>);
  }

  function Gauge({ value, max = 100, target, label, color = '#10b981', size = 200 }) {
    const pct = Math.min(Math.max(value / max, 0), 1);
    const R = size / 2 - 18;
    const cx = size / 2, cy = size / 2 + 14;
    const sa = Math.PI, ea = sa + pct * Math.PI;
    const ta = target != null ? sa + Math.min(target / max, 1) * Math.PI : null;
    const arc = (a0, a1, r) => {
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      const lg = a1 - a0 > Math.PI ? 1 : 0;
      return `M${x0},${y0} A${r},${r} 0 ${lg} 1 ${x1},${y1}`;
    };
    return (
      <div className="cd-gauge">
        <svg viewBox={`0 0 ${size} ${size * 0.7}`} preserveAspectRatio="xMidYMid meet" className="cd-gauge-svg">
          <path d={arc(sa, sa + Math.PI, R)} fill="none" stroke="var(--surface-3)" strokeWidth="14" strokeLinecap="round" />
          <path d={arc(sa, ea, R)} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" style={{ transition: 'stroke-dasharray .4s' }} />
          {ta && <line x1={cx + (R - 12) * Math.cos(ta)} y1={cy + (R - 12) * Math.sin(ta)} x2={cx + (R + 12) * Math.cos(ta)} y2={cy + (R + 12) * Math.sin(ta)} stroke="#dc2626" strokeWidth="2.5" />}
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="28" fontWeight="700" fill="var(--text)">{Math.round(pct * 100)}%</text>
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--text-faint)" style={{ textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</text>
        </svg>
      </div>);
  }

  function Heatmap({ rows, cols, data, color = '#0ea5e9' }) {
    const max = Math.max(...data.flat()) || 1;
    const [tip, setTip] = useTip();
    const W = 480, H = 200;
    const cellW = (W - 38) / cols.length;
    const cellH = (H - 22) / rows.length;
    return (
      <div className="cd-svg-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="cd-svg">
          {rows.map((r, ri) =>
            <text key={ri} x={32} y={18 + ri * cellH + cellH / 2 + 3} textAnchor="end" fontSize="9.5" fill="var(--text-faint)">{r}</text>)}
          {cols.map((c, ci) =>
            <text key={ci} x={38 + ci * cellW + cellW / 2} y={12} textAnchor="middle" fontSize="9" fill="var(--text-faint)">{c}</text>)}
          {data.map((row, ri) => row.map((v, ci) => {
            const op = 0.10 + (v / max) * 0.9;
            const isHov = tip?.r === ri && tip?.c === ci;
            return (
              <rect key={`${ri}-${ci}`}
                x={38 + ci * cellW + 1.5}
                y={18 + ri * cellH + 1.5}
                width={cellW - 3}
                height={cellH - 3}
                rx="3"
                fill={color}
                opacity={op}
                stroke={isHov ? color : 'none'}
                strokeWidth="2"
                onMouseEnter={() => setTip({ r: ri, c: ci, v, x: 38 + ci * cellW + cellW / 2, y: 18 + ri * cellH + cellH / 2 })}
                onMouseLeave={() => setTip(null)}
                style={{ transition: 'all .15s' }} />);
          }))}
        </svg>
        {tip &&
          <div className="cd-tip" style={{ left: `${(tip.x / W) * 100}%`, top: `${(tip.y / H) * 100}%` }}>
            <div className="cd-tip-l">{rows[tip.r]} · {cols[tip.c]}</div>
            <div className="cd-tip-v" style={{ color }}>{tip.v}</div>
          </div>}
      </div>);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // KPI mini card
  // ────────────────────────────────────────────────────────────────────────────
  function MiniKpi({ icon, label, value, delta, deltaTone, tone = '#0ea5e9', sub }) {
    const isUp = deltaTone === 'up';
    const isDown = deltaTone === 'down';
    return (
      <div className="cd-mini">
        <div className="cd-mini-bar" style={{ background: tone }} />
        <div className="cd-mini-body">
          <div className="cd-mini-head">
            <span className="cd-mini-ic" style={{ background: `color-mix(in oklab, ${tone} 14%, white)`, color: tone }}>{icon}</span>
            <span className="cd-mini-l">{label}</span>
          </div>
          <div className="cd-mini-v">{value}</div>
          {(delta || sub) &&
            <div className="cd-mini-foot">
              {delta && <span className={`cd-mini-d ${isUp ? 'up' : isDown ? 'down' : ''}`}>{isUp ? '▲' : isDown ? '▼' : ''} {delta}</span>}
              {sub && <span className="cd-mini-s">{sub}</span>}
            </div>}
        </div>
      </div>);
  }

  const fmtBRL = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtCompact = (v) => {
    const n = Number(v) || 0;
    if (n >= 1_000_000) return 'R$ ' + (n / 1_000_000).toFixed(2).replace('.', ',') + ' Mi';
    if (n >= 1_000) return 'R$ ' + (n / 1_000).toFixed(1).replace('.', ',') + 'k';
    return fmtBRL(n);
  };
  const pct = (v) => (Number(v) || 0).toFixed(1).replace('.', ',') + '%';

  // ────────────────────────────────────────────────────────────────────────────
  // Sub-pages
  // ────────────────────────────────────────────────────────────────────────────
  const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  // ─── Mini chart primitives for varied KPI cards (white, solid) ──────────
  const fmtBRL2 = (v) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtInt = (v) => Number(v || 0).toLocaleString('pt-BR');

  function MiniSpark({ data, color = '#10b981', fill = true }) {
    const W = 100, H = 40, PAD = 3;
    const max = Math.max(...data) || 1;
    const min = Math.min(...data);
    const span = max - min || 1;
    const x = (i) => PAD + (i * (W - 2 * PAD)) / Math.max(1, data.length - 1);
    const y = (v) => PAD + (H - 2 * PAD) - ((v - min) / span) * (H - 2 * PAD);
    const pts = data.map((v, i) => [x(i), y(v)]);
    const path = pts.reduce((acc, [px, py], i) => acc + (i === 0 ? `M${px},${py}` : ` L${px},${py}`), '');
    const area = path + ` L${pts[pts.length-1][0]},${H-PAD} L${pts[0][0]},${H-PAD} Z`;
    const last = pts[pts.length-1];
    return (
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
        {fill && <path d={area} fill={color} fillOpacity="0.12" />}
        <path d={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={last[0]} cy={last[1]} r="2.2" fill={color} stroke="#fff" strokeWidth="1.2" />
      </svg>);
  }

  function MiniBars({ data, color = '#10b981', highlightIdx, labels }) {
    const W = 100, H = 46, PAD = 2;
    const max = Math.max(...data) || 1;
    const innerH = H - 12;
    const bw = (W - 2 * PAD) / data.length;
    const gap = 2;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
        {data.map((v, i) => {
          const bh = Math.max(2, (v / max) * (innerH - 4));
          const bx = PAD + i * bw + gap / 2;
          const by = innerH - bh;
          const isH = highlightIdx === i;
          return (
            <g key={i}>
              <rect x={bx} y={by} width={bw - gap} height={bh} rx="1.5" fill={isH ? color : '#cbd5e1'} />
              {labels && <text x={bx + (bw - gap)/2} y={H - 2} textAnchor="middle" fontSize="6" fill={isH ? color : '#94a3b8'} fontWeight={isH ? 700 : 600}>{labels[i]}</text>}
            </g>);
        })}
      </svg>);
  }

  function Bar({ pct, color = '#10b981', height = 6 }) {
    return (
      <div style={{ height, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: '100%', background: color, borderRadius: 999, transition: 'width .45s cubic-bezier(.4,0,.2,1)' }} />
      </div>);
  }

  function SplitBar({ segments, height = 8 }) {
    const total = segments.reduce((s, x) => s + x.v, 0) || 1;
    return (
      <div style={{ display: 'flex', height, borderRadius: 999, overflow: 'hidden', gap: 2, background: '#f1f5f9' }}>
        {segments.map((s, i) =>
          <div key={i} style={{ width: `${(s.v / total) * 100}%`, background: s.color, height: '100%', transition: 'width .4s ease' }} />)}
      </div>);
  }

  function AvatarStack({ items, max = 4, size = 22 }) {
    const overlap = -8;
    return (
      <div style={{ display: 'inline-flex' }}>
        {items.slice(0, max).map((a, i) =>
          <div key={i}
            title={a.name}
            style={{ width: size, height: size, borderRadius: '50%', background: a.color || '#94a3b8', color: '#fff', fontSize: Math.round(size * 0.36), fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', marginLeft: i > 0 ? overlap : 0, boxShadow: '0 1px 2px rgba(0,0,0,.08)' }}>{a.t}</div>)}
        {items.length > max &&
          <div style={{ width: size, height: size, borderRadius: '50%', background: '#e2e8f0', color: '#475569', fontSize: Math.round(size * 0.36), fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', marginLeft: overlap }}>+{items.length - max}</div>}
      </div>);
  }

  function Delta({ tone, label }) {
    const isUp = tone === 'up'; const isDown = tone === 'down';
    return (
      <span className={`cd-vd ${isUp ? 'up' : isDown ? 'down' : ''}`}>
        <span className="cd-vd-ic">{isUp ? '↗' : isDown ? '↘' : '•'}</span>{label}
      </span>);
  }

  function VCard({ title, hint, children }) {
    return (
      <div className="cd-vcard">
        <div className="cd-vcard-hd">
          <span className="cd-vcard-t">{title}</span>
          {hint && <span className="cd-vcard-h">{hint}</span>}
        </div>
        <div className="cd-vcard-bd">{children}</div>
      </div>);
  }

  function PageVisao() {
    const wrapRef = React.useRef(null);
    const [isFull, setIsFull] = React.useState(false);
    React.useEffect(() => {
      const onChange = () => setIsFull(!!document.fullscreenElement);
      document.addEventListener('fullscreenchange', onChange);
      return () => document.removeEventListener('fullscreenchange', onChange);
    }, []);
    const togglePanel = () => {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else wrapRef.current?.requestFullscreen?.();
    };

    // Mock series data
    const trendRevenue = [312000, 348000, 395000, 372000, 421000, 458000, 487234];
    const trendNet     = [268000, 298000, 342000, 318000, 364000, 396000, 422120];
    const salesMonths  = [58, 72, 81, 76, 92, 98];
    const hoursToday   = [4, 8, 14, 22, 38, 32, 18, 12];
    const leadsBars    = [142, 198, 184, 226, 248, 290, 318];
    const productBars  = [22, 28, 36, 32, 41, 25];
    const retencao     = [42, 58, 68, 74, 71, 64];

    const topSellers = [
      { t: 'KZ', name: 'Karla Z.', color: '#0EA5A4' },
      { t: 'MV', name: 'Magno V.', color: '#6366F1' },
      { t: 'PH', name: 'Paulo H.', color: '#F59E0B' },
      { t: 'FJ', name: 'Francisco', color: '#8B5CF6' },
      { t: 'LS', name: 'Larissa',  color: '#EC4899' },
      { t: 'DC', name: 'Daniel',   color: '#10B981' }
    ];

    const topTeamMembers = [
      { name: 'Karla Zambelly', t: 'KZ', value: 118400.00, color: '#0EA5A4' },
      { name: 'Magno Vieira',   t: 'MV', value:  98200.00, color: '#6366F1' },
      { name: 'Paulo Henrique', t: 'PH', value:  84500.00, color: '#F59E0B' }
    ];

    return (
      <div ref={wrapRef} className={`cd-visao ${isFull ? 'cd-visao-full' : ''}`}>
        <div className="cd-visao-head">
          <div>
            <div className="cd-visao-t">Resumo Executivo</div>
            <div className="cd-visao-s">20 indicadores em tempo real · maio de 2026</div>
          </div>
          <button className="cd-panel-btn" onClick={togglePanel} title={isFull ? 'Sair do modo painel' : 'Modo painel · tela cheia'}>
            {isFull ?
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg> Sair do painel</> :
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg> Modo Painel</>}
          </button>
        </div>

        <div className="cd-visao-grid">
          {/* ─── Linha 1 · Receita / Vendas ─── */}
          <VCard title="Receita Bruta" hint="MAIO">
            <div className="cd-v-row">
              <div className="cd-v-big">{fmtBRL2(487234.00)}</div>
              <Delta tone="up" label="12,4%" />
            </div>
            <div className="cd-v-sub">vs. abril · {fmtBRL2(433520.00)}</div>
            <div className="cd-v-spark"><MiniSpark data={trendRevenue} color="#059669" /></div>
          </VCard>

          <VCard title="Receita Líquida" hint="MAIO">
            <div className="cd-v-row">
              <div className="cd-v-big">{fmtBRL2(422118.40)}</div>
              <Delta tone="up" label="11,2%" />
            </div>
            <div className="cd-v-sub">86,7% da receita bruta</div>
            <div className="cd-v-spark"><MiniSpark data={trendNet} color="#10b981" /></div>
          </VCard>

          <VCard title="Margem">
            <div className="cd-v-row">
              <div className="cd-v-big">34,2<span className="cd-v-unit">%</span></div>
              <Delta tone="up" label="+1,4 pp" />
            </div>
            <div className="cd-v-bar-block">
              <Bar pct={34.2} color="#16a34a" height={8} />
              <div className="cd-v-bar-foot">
                <span>Custos {fmtBRL2(320615.92)}</span>
                <span>Lucro {fmtBRL2(166618.08)}</span>
              </div>
            </div>
          </VCard>

          <VCard title="Total de Vendas" hint="6 MESES">
            <div className="cd-v-row">
              <div className="cd-v-big">{fmtInt(781)}</div>
              <Delta tone="up" label="+58 vs Abr" />
            </div>
            <div className="cd-v-sub">média {fmtInt(26)}/dia · 2.184 itens</div>
            <div className="cd-v-spark"><MiniBars data={salesMonths} color="#22c55e" highlightIdx={5} labels={['Dez','Jan','Fev','Mar','Abr','Mai']} /></div>
          </VCard>

          <VCard title="Vendidos Hoje" hint="HOJE">
            <div className="cd-v-row">
              <div className="cd-v-big">{fmtBRL2(18432.50)}</div>
              <Delta tone="up" label="+R$ 2.140" />
            </div>
            <div className="cd-v-sub">24 pedidos · pico 14h</div>
            <div className="cd-v-spark"><MiniBars data={hoursToday} color="#65a30d" highlightIdx={4} labels={['8h','10h','12h','14h','16h','18h','20h','22h']} /></div>
          </VCard>

          {/* ─── Linha 2 · Clientes / Carteira ─── */}
          <VCard title="Total de Clientes">
            <div className="cd-v-row">
              <div className="cd-v-big">{fmtInt(1284)}</div>
              <Delta tone="up" label="+38" />
            </div>
            <div className="cd-v-sub">novos no mês · 12 cidades</div>
            <div className="cd-v-foot-row">
              <AvatarStack items={[
                { t: 'AB', color: '#6366F1' }, { t: 'PF', color: '#EC4899' }, { t: 'CE', color: '#F59E0B' },
                { t: 'SP', color: '#10B981' }, { t: '+5', color: '#94A3B8' }
              ]} max={4} />
              <span className="cd-v-foot-l">+ 34 esta semana</span>
            </div>
          </VCard>

          <VCard title="Clientes Ativos">
            <div className="cd-v-row">
              <div className="cd-v-big">892</div>
              <Delta tone="up" label="69,5%" />
            </div>
            <div className="cd-v-bar-block">
              <SplitBar segments={[
                { v: 892, color: '#10b981' },
                { v: 392, color: '#e2e8f0' }
              ]} />
              <div className="cd-v-bar-foot">
                <span className="cd-v-legend"><span style={{ background: '#10b981' }} />Ativos 892</span>
                <span className="cd-v-legend"><span style={{ background: '#e2e8f0' }} />Inativos 392</span>
              </div>
            </div>
          </VCard>

          <VCard title="LTV Médio">
            <div className="cd-v-row">
              <div className="cd-v-big">{fmtBRL2(8420.00)}</div>
              <Delta tone="up" label="+9,2%" />
            </div>
            <div className="cd-v-sub">VIPs: 74 · LTV {fmtBRL2(18900.00)}</div>
            <div className="cd-v-spark"><MiniSpark data={[6200, 6800, 7100, 7400, 7900, 8200, 8420]} color="#a855f7" /></div>
          </VCard>

          <VCard title="Ticket Médio">
            <div className="cd-v-row">
              <div className="cd-v-big">{fmtBRL2(624.00)}</div>
              <Delta tone="up" label="+R$ 38,00" />
            </div>
            <div className="cd-v-sub">por pedido · maio</div>
            <div className="cd-v-spark"><MiniSpark data={[542, 568, 594, 587, 612, 605, 624]} color="#ec4899" /></div>
          </VCard>

          <VCard title="Retenção Média">
            <div className="cd-v-row">
              <div className="cd-v-big">14<span className="cd-v-unit"> meses</span></div>
              <Delta tone="up" label="+1,2 m" />
            </div>
            <div className="cd-v-sub">por cohort · 6 últimas safras</div>
            <div className="cd-v-spark"><MiniBars data={retencao} color="#8b5cf6" highlightIdx={3} labels={['Nov','Dez','Jan','Fev','Mar','Abr']} /></div>
          </VCard>

          {/* ─── Linha 3 · Marketing / Aquisição ─── */}
          <VCard title="Leads Gerados" hint="7 DIAS">
            <div className="cd-v-row">
              <div className="cd-v-big">{fmtInt(1842)}</div>
              <Delta tone="up" label="+248" />
            </div>
            <div className="cd-v-sub">qualificados: 482 · 26%</div>
            <div className="cd-v-spark"><MiniBars data={leadsBars} color="#0ea5e9" highlightIdx={6} labels={['Q','S','D','S','T','Q','Q']} /></div>
          </VCard>

          <VCard title="CAC">
            <div className="cd-v-row">
              <div className="cd-v-big">{fmtBRL2(84.00)}</div>
              <Delta tone="up" label="-R$ 12,00" />
            </div>
            <div className="cd-v-sub">custo por cliente adquirido</div>
            <div className="cd-v-foot-rows">
              <div className="cd-v-rline"><span>Orgânico</span><strong>{fmtBRL2(42.00)}</strong></div>
              <div className="cd-v-rline"><span>Pago</span><strong>{fmtBRL2(128.50)}</strong></div>
            </div>
          </VCard>

          <VCard title="CPL">
            <div className="cd-v-row">
              <div className="cd-v-big">{fmtBRL2(18.00)}</div>
              <Delta tone="up" label="-R$ 3,00" />
            </div>
            <div className="cd-v-sub">custo por lead</div>
            <div className="cd-v-foot-rows">
              <div className="cd-v-rline"><span>WhatsApp</span><strong>{fmtBRL2(12.40)}</strong></div>
              <div className="cd-v-rline"><span>Google Ads</span><strong>{fmtBRL2(24.80)}</strong></div>
            </div>
          </VCard>

          <VCard title="ROI">
            <div className="cd-v-row">
              <div className="cd-v-big">4,7<span className="cd-v-unit">x</span></div>
              <Delta tone="up" label="+0,8x" />
            </div>
            <div className="cd-v-bar-block">
              <Bar pct={94} color="#0369a1" height={8} />
              <div className="cd-v-bar-foot">
                <span>Investido {fmtBRL2(103660.00)}</span>
                <span>Retorno {fmtBRL2(487234.00)}</span>
              </div>
            </div>
          </VCard>

          <VCard title="Conversão">
            <div className="cd-v-row" style={{ gap: 14 }}>
              <div>
                <div className="cd-v-big" style={{ fontSize: 22, lineHeight: 1.1 }}>24,7%</div>
                <Delta tone="up" label="+1,8 pp" />
              </div>
              <div>
                <div className="cd-v-big" style={{ fontSize: 22, lineHeight: 1.1, color: '#94a3b8' }}>75,3%</div>
                <span className="cd-v-sub" style={{ display: 'block', marginTop: 0 }}>não convertidos</span>
              </div>
            </div>
            <div className="cd-v-bar-block">
              <SplitBar segments={[
                { v: 24.7, color: '#0891b2' },
                { v: 75.3, color: '#e2e8f0' }
              ]} />
              <div className="cd-v-bar-foot">
                <span className="cd-v-legend"><span style={{ background: '#0891b2' }} />Clientes 482</span>
                <span className="cd-v-legend"><span style={{ background: '#e2e8f0' }} />Leads 1.842</span>
              </div>
            </div>
          </VCard>

          {/* ─── Linha 4 · Performance / Metas / Top ─── */}
          <VCard title="Meta da Empresa" hint="MAIO 2026">
            <div className="cd-v-row">
              <div className="cd-v-big">87<span className="cd-v-unit">%</span></div>
              <Delta tone="up" label="No ritmo" />
            </div>
            <div className="cd-v-bar-block">
              <Bar pct={87} color="#d97706" height={10} />
              <div className="cd-v-bar-foot">
                <span>Atingido {fmtBRL2(487234.00)}</span>
                <span>Meta {fmtBRL2(560000.00)}</span>
              </div>
              <div className="cd-v-sub" style={{ marginTop: 4 }}>Faltam {fmtBRL2(72766.00)} · 9 dias</div>
            </div>
          </VCard>

          <VCard title="Top Vendedor">
            <div className="cd-v-seller">
              <div className="cd-v-seller-av" style={{ background: '#0EA5A4' }}>KZ</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="cd-v-seller-n">Karla Zambelly</div>
                <div className="cd-v-seller-r">Gerente Comercial</div>
              </div>
            </div>
            <div className="cd-v-row" style={{ marginTop: 8 }}>
              <div className="cd-v-big" style={{ fontSize: 22 }}>{fmtBRL2(118400.00)}</div>
              <Delta tone="up" label="98%" />
            </div>
            <div className="cd-v-foot-row" style={{ marginTop: 6 }}>
              <span className="cd-v-foot-l">Demais</span>
              <AvatarStack items={topSellers.slice(1)} max={4} size={20} />
            </div>
          </VCard>

          <VCard title="Top Equipe">
            <div className="cd-v-row">
              <div>
                <div className="cd-v-big" style={{ fontSize: 20 }}>Time Alpha</div>
                <span className="cd-v-sub" style={{ display: 'block', marginTop: 1 }}>{fmtBRL2(289100.00)} · 4 vendedores</span>
              </div>
              <Delta tone="up" label="59% receita" />
            </div>
            <div className="cd-v-team-list">
              {topTeamMembers.map((m, i) =>
                <div key={i} className="cd-v-team-row">
                  <span className="cd-v-team-av" style={{ background: m.color }}>{m.t}</span>
                  <span className="cd-v-team-n">{m.name}</span>
                  <span className="cd-v-team-v">{fmtBRL2(m.value)}</span>
                </div>)}
            </div>
          </VCard>

          <VCard title="Top Produto">
            <div className="cd-v-row">
              <div>
                <div className="cd-v-big" style={{ fontSize: 20 }}>Pacote Pro</div>
                <span className="cd-v-sub" style={{ display: 'block', marginTop: 1 }}>184 vendas · {fmtBRL2(70840.00)}</span>
              </div>
              <Delta tone="up" label="+34%" />
            </div>
            <div className="cd-v-spark"><MiniBars data={productBars} color="#ca8a04" highlightIdx={4} labels={['Dez','Jan','Fev','Mar','Abr','Mai']} /></div>
          </VCard>

          <VCard title="Taxa de Recompra">
            <div className="cd-v-row">
              <div className="cd-v-big">58,3<span className="cd-v-unit">%</span></div>
              <Delta tone="up" label="+3,1 pp" />
            </div>
            <div className="cd-v-bar-block">
              <SplitBar segments={[
                { v: 58.3, color: '#b45309' },
                { v: 41.7, color: '#fde68a' }
              ]} />
              <div className="cd-v-bar-foot">
                <span className="cd-v-legend"><span style={{ background: '#b45309' }} />Recompram 749</span>
                <span className="cd-v-legend"><span style={{ background: '#fde68a' }} />1 compra 535</span>
              </div>
            </div>
          </VCard>
        </div>
      </div>);
  }

  function PageVendas() {
    const kpis = [
      { icon: '🛒', label: 'Total Vendas', value: '781', delta: '+12,4%', deltaTone: 'up', tone: '#10b981' },
      { icon: '💳', label: 'Vendido Hoje', value: 'R$ 18,4k', delta: '+4 pedidos', deltaTone: 'up', tone: '#0ea5e9' },
      { icon: '📅', label: 'Vendido Mês', value: 'R$ 487,2k', delta: '+12,4%', deltaTone: 'up', tone: '#6366f1' },
      { icon: '📈', label: 'Média Diária', value: 'R$ 16,2k', tone: '#f59e0b' },
      { icon: '🧾', label: 'Nº Pedidos', value: '781', delta: '+58', deltaTone: 'up', tone: '#8b5cf6' },
      { icon: '💵', label: 'Ticket Médio', value: 'R$ 624', delta: '+R$ 38', deltaTone: 'up', tone: '#22c55e' },
      { icon: '📦', label: 'Itens Vendidos', value: '2.184', tone: '#06b6d4' },
      { icon: '⚡', label: 'Pico', value: '14h-16h', sub: '38% das vendas', tone: '#ef4444' },
      { icon: '🧠', label: 'Upsell', value: '18,4%', delta: '+2,1 pp', deltaTone: 'up', tone: '#f43f5e' },
      { icon: '🎁', label: 'Cross Sell', value: '12,7%', delta: '+1,4 pp', deltaTone: 'up', tone: '#a855f7' }
    ];
    const byMonth = MONTHS.slice(0, 6).map((m, i) => ({ l: m, v: [58, 72, 81, 76, 92, 98][i] }));
    const byHour = ['08h', '10h', '12h', '14h', '16h', '18h', '20h'].map((l, i) => ({ l, v: [22, 38, 47, 88, 92, 64, 28][i] }));
    return (
      <div className="cd-page">
        <div className="cd-kpi-grid">{kpis.map((k, i) => <MiniKpi key={i} {...k} />)}</div>
        <div className="cd-charts cd-charts-2">
          <ChartFrame title="Vendas por Mês" sub="Quantidade de pedidos" height={220}>
            <BarChart data={byMonth} color="#10b981" height={220} />
          </ChartFrame>
          <ChartFrame title="Vendas por Hora" sub="Distribuição média semanal" height={220}>
            <BarChart data={byHour} color="#f59e0b" height={220} />
          </ChartFrame>
        </div>
      </div>);
  }

  function PageClientes() {
    const kpis = [
      { icon: '👤', label: 'Novos', value: '38', delta: '+8 mês', deltaTone: 'up', tone: '#10b981' },
      { icon: '🔁', label: 'Recorrentes', value: '748', delta: '58,3%', tone: '#0ea5e9' },
      { icon: '❤️', label: 'Ativos', value: '892', delta: '69,5%', tone: '#f43f5e' },
      { icon: '💤', label: 'Inativos', value: '392', delta: '30,5%', deltaTone: 'down', tone: '#94a3b8' },
      { icon: '🏆', label: 'VIP', value: '74', sub: 'LTV > R$ 15k', tone: '#a855f7' },
      { icon: '⚠️', label: 'Em Risco', value: '47', sub: '60d sem compra', tone: '#ef4444' },
      { icon: '📍', label: 'Cidades', value: '38', tone: '#06b6d4' },
      { icon: '📱', label: 'Top Origem', value: 'WhatsApp', sub: '42%', tone: '#22c55e' },
      { icon: '📆', label: 'Retenção Méd.', value: '14 meses', tone: '#8b5cf6' },
      { icon: '⭐', label: 'NPS', value: '78', sub: '+4 vs Q1', tone: '#f59e0b' }
    ];
    const origens = [
      { l: 'WhatsApp',  v: 540, color: '#25d366' },
      { l: 'Instagram', v: 312, color: '#e4405f' },
      { l: 'Indicação', v: 198, color: '#10b981' },
      { l: 'Google',    v: 134, color: '#0ea5e9' },
      { l: 'Facebook',  v:  82, color: '#1877f2' }
    ];
    const regioes = [
      { l: 'Fortaleza',   v: 472, color: '#10b981' },
      { l: 'Caucaia',     v: 184, color: '#0ea5e9' },
      { l: 'Sobral',      v: 142, color: '#6366f1' },
      { l: 'Crato',       v:  98, color: '#f59e0b' },
      { l: 'Iguatu',      v:  74, color: '#a855f7' },
      { l: 'Maracanaú',   v:  68, color: '#ef4444' }
    ];
    return (
      <div className="cd-page">
        <div className="cd-kpi-grid">{kpis.map((k, i) => <MiniKpi key={i} {...k} />)}</div>
        <div className="cd-charts cd-charts-2">
          <ChartFrame title="Origem dos Clientes" sub="Canal de aquisição" height={240}>
            <Donut data={origens} total="1.266" totalLabel="CLIENTES" />
          </ChartFrame>
          <ChartFrame title="Clientes por Região" sub="Top cidades" height={240}>
            <HBarChart data={regioes} height={240} />
          </ChartFrame>
        </div>
      </div>);
  }

  const SELLERS = [
    { name: 'Karla Zambelly',     role: 'Gerente Comercial', team: 'Time Alpha',   meta: 120000, sold: 118400, conv: 32.4, avatar: 'KZ', color: '#0EA5A4' },
    { name: 'Magno Vieira',       role: 'Closer Senior',     team: 'Time Alpha',   meta: 100000, sold:  98200, conv: 28.6, avatar: 'MV', color: '#6366F1' },
    { name: 'Paulo Henrique',     role: 'Consultor Pleno',   team: 'Time Beta',    meta:  90000, sold:  84500, conv: 26.8, avatar: 'PH', color: '#F59E0B' },
    { name: 'Francisco Junior',   role: 'SDR Senior',        team: 'Time Alpha',   meta:  80000, sold:  72300, conv: 24.1, avatar: 'FJ', color: '#8B5CF6' },
    { name: 'Larissa Souza',      role: 'Consultora Pleno',  team: 'Time Beta',    meta:  70000, sold:  64800, conv: 22.7, avatar: 'LS', color: '#EC4899' },
    { name: 'Daniel Costa',       role: 'Consultor Junior',  team: 'Time Beta',    meta:  60000, sold:  49000, conv: 18.4, avatar: 'DC', color: '#10B981' },
    { name: 'Renata Oliveira',    role: 'Closer Pleno',      team: 'Time Alpha',   meta:  60000, sold:  42100, conv: 17.2, avatar: 'RO', color: '#F43F5E' },
    { name: 'Bruno Tavares',      role: 'SDR Pleno',         team: 'Time Beta',    meta:  50000, sold:  38400, conv: 15.8, avatar: 'BT', color: '#0284C7' },
    { name: 'Camila Ferreira',    role: 'Consultora Junior', team: 'Time Beta',    meta:  45000, sold:  32200, conv: 14.6, avatar: 'CF', color: '#7C3AED' },
    { name: 'Diego Almeida',      role: 'SDR Junior',        team: 'Time Alpha',   meta:  40000, sold:  28700, conv: 13.2, avatar: 'DA', color: '#DC2626' }
  ];

  function SellerCard({ s, place }) {
    const medalCfg = {
      1: { c: '#F5C518', shadow: 'rgba(245,197,24,.35)', label: '1º', name: 'OURO',   gradient: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)' },
      2: { c: '#B8C0CC', shadow: 'rgba(184,192,204,.35)', label: '2º', name: 'PRATA', gradient: 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)' },
      3: { c: '#CD7F32', shadow: 'rgba(205,127,50,.35)',  label: '3º', name: 'BRONZE',gradient: 'linear-gradient(135deg, #FED7AA 0%, #FDBA74 100%)' }
    };
    const m = medalCfg[place];
    const pctVal = Math.min(100, Math.round((s.sold / s.meta) * 100));
    const remaining = Math.max(0, s.meta - s.sold);
    return (
      <div className={`cd-podium-card cd-podium-${place}`} style={{ background: m.gradient, borderColor: m.c }}>
        <div className="cd-podium-medal" style={{ background: m.c, boxShadow: `0 4px 14px ${m.shadow}` }}>
          <span className="cd-podium-place">{m.label}</span>
          <span className="cd-podium-name">{m.name}</span>
        </div>
        <div className="cd-podium-avatar" style={{ background: s.color }}>{s.avatar}</div>
        <div className="cd-podium-info">
          <div className="cd-podium-n">{s.name}</div>
          <div className="cd-podium-r">{s.role}</div>
          <div className="cd-podium-t">{s.team}</div>
        </div>
        <div className="cd-podium-stats">
          <div className="cd-podium-pct">{pctVal}%</div>
          <div className="cd-podium-bar"><div style={{ width: `${pctVal}%`, background: m.c }} /></div>
          <div className="cd-podium-grid">
            <div><span>Meta</span><strong>{fmtCompact(s.meta)}</strong></div>
            <div><span>Vendas</span><strong>{fmtCompact(s.sold)}</strong></div>
            <div><span>Falta</span><strong>{fmtCompact(remaining)}</strong></div>
            <div><span>Conv.</span><strong>{s.conv.toFixed(1).replace('.', ',')}%</strong></div>
          </div>
        </div>
      </div>);
  }

  function SellerRow({ s, place }) {
    const pctVal = Math.min(100, Math.round((s.sold / s.meta) * 100));
    const remaining = Math.max(0, s.meta - s.sold);
    const barColor = pctVal >= 90 ? '#10B981' : pctVal >= 70 ? '#F59E0B' : '#EF4444';
    return (
      <div className="cd-seller-row">
        <div className="cd-seller-place">{place}º</div>
        <div className="cd-seller-avatar" style={{ background: s.color }}>{s.avatar}</div>
        <div className="cd-seller-info">
          <div className="cd-seller-n">{s.name}</div>
          <div className="cd-seller-r">{s.role} · <span style={{ color: 'var(--text-faint)' }}>{s.team}</span></div>
        </div>
        <div className="cd-seller-bars">
          <div className="cd-seller-bar-head">
            <span>Meta {fmtCompact(s.meta)}</span>
            <span className="cd-seller-bar-pct" style={{ color: barColor }}>{pctVal}%</span>
          </div>
          <div className="cd-seller-bar"><div style={{ width: `${pctVal}%`, background: barColor }} /></div>
          <div className="cd-seller-bar-foot">Vendas {fmtBRL(s.sold)} · Conv. {s.conv.toFixed(1).replace('.', ',')}% · Falta {fmtCompact(remaining)}</div>
        </div>
      </div>);
  }

  function PageEquipe() {
    const kpis = [
      { icon: '🏆', label: 'Top Vendedor', value: 'Karla Z.', sub: 'R$ 118k', tone: '#f59e0b' },
      { icon: '💰', label: 'Receita Equipe', value: 'R$ 487k', delta: '+12%', deltaTone: 'up', tone: '#10b981' },
      { icon: '📞', label: 'Ligações', value: '1.842', delta: '+148', deltaTone: 'up', tone: '#0ea5e9' },
      { icon: '💬', label: 'Conversas', value: '3.218', tone: '#6366f1' },
      { icon: '📈', label: 'Conv. Média', value: '24,7%', delta: '+1,8 pp', deltaTone: 'up', tone: '#22c55e' },
      { icon: '🎯', label: 'Meta Atingida', value: '4/10', sub: 'vendedores', tone: '#a855f7' },
      { icon: '🔥', label: 'Melhor Conv.', value: '32,4%', sub: 'Karla Z.', tone: '#ef4444' },
      { icon: '⏳', label: 'T. Médio Fech.', value: '4,8 dias', tone: '#06b6d4' },
      { icon: '🚀', label: 'Vendas/Dia', value: '26', tone: '#f43f5e' },
      { icon: '🧠', label: 'Follow-ups', value: '184', tone: '#8b5cf6' }
    ];
    const top3 = SELLERS.slice(0, 3);
    const rest = SELLERS.slice(3);
    return (
      <div className="cd-page">
        <div className="cd-kpi-grid">{kpis.map((k, i) => <MiniKpi key={i} {...k} />)}</div>
        <div className="cd-charts cd-charts-2">
          <div className="cd-chart">
            <div className="cd-chart-hd">
              <div>
                <div className="cd-chart-title">🏆 Ranking de Vendedores</div>
                <div className="cd-chart-sub">Faturamento individual · maio 2026</div>
              </div>
              <span className="cd-pill">{SELLERS.length} vendedores</span>
            </div>
            <div className="cd-chart-bd cd-team-block" style={{ overflow: 'visible' }}>
              <div className="cd-podium">
                {[top3[1], top3[0], top3[2]].map((s, i) => <SellerCard key={s.name} s={s} place={[2, 1, 3][i]} />)}
              </div>
              <div className="cd-seller-list-head">
                <span>Demais vendedores</span>
                <span className="muted">{rest.length} no ranking</span>
              </div>
              <div className="cd-seller-list">
                {rest.map((s, i) => <SellerRow key={s.name} s={s} place={i + 4} />)}
              </div>
            </div>
          </div>
          <div className="cd-chart cd-chart-empty">
            <div className="cd-chart-hd">
              <div>
                <div className="cd-chart-title">Espaço reservado</div>
                <div className="cd-chart-sub">Bloco 2 · em construção</div>
              </div>
            </div>
            <div className="cd-chart-bd cd-empty-placeholder">
              <div className="cd-empty-ic">⏳</div>
              <div className="cd-empty-t">Bloco em branco</div>
              <div className="cd-empty-s">Vamos preencher este espaço em breve.</div>
            </div>
          </div>
        </div>
      </div>);
  }

  function PageProdutos() {
    const kpis = [
      { icon: '🏆', label: 'Top Produto', value: 'Pacote Pro', sub: '184 vendas', tone: '#f59e0b' },
      { icon: '💰', label: 'Mais Lucrativo', value: 'Consultoria', sub: 'Margem 68%', tone: '#10b981' },
      { icon: '📈', label: 'Em Alta', value: 'Plano Anual', delta: '+34%', deltaTone: 'up', tone: '#0ea5e9' },
      { icon: '📉', label: 'Em Queda', value: 'Basic', delta: '-18%', deltaTone: 'down', tone: '#ef4444' },
      { icon: '🔁', label: 'Recompra', value: 'Plano Pro', sub: '64% recompram', tone: '#06b6d4' },
      { icon: '📦', label: 'Estoque Crítico', value: '4 itens', tone: '#f43f5e' },
      { icon: '💵', label: 'Ticket/Prod.', value: 'R$ 384', tone: '#8b5cf6' },
      { icon: '⭐', label: 'Avaliação', value: '4,7/5', sub: '128 reviews', tone: '#22c55e' },
      { icon: '🛒', label: 'Abandono', value: '14,2%', deltaTone: 'down', delta: '-2,1 pp', tone: '#a855f7' },
      { icon: '🎯', label: 'Conv. Produto', value: '28,4%', tone: '#6366f1' }
    ];
    const top = [
      { l: 'Pacote Pro',       v: 184, color: '#10b981' },
      { l: 'Plano Anual',      v: 142, color: '#0ea5e9' },
      { l: 'Consultoria 1h',   v:  98, color: '#6366f1' },
      { l: 'Mentoria Premium', v:  74, color: '#f59e0b' },
      { l: 'Curso Avançado',   v:  62, color: '#a855f7' },
      { l: 'Pack Iniciante',   v:  48, color: '#ef4444' }
    ];
    return (
      <div className="cd-page">
        <div className="cd-kpi-grid">{kpis.map((k, i) => <MiniKpi key={i} {...k} />)}</div>
        <div className="cd-charts cd-charts-1">
          <ChartFrame title="Top Produtos Vendidos" sub="Volume de unidades · mês" height={260}>
            <HBarChart data={top} height={260} />
          </ChartFrame>
        </div>
      </div>);
  }

  function PageMarketing() {
    const kpis = [
      { icon: '📱', label: 'Leads Gerados', value: '1.842', delta: '+248', deltaTone: 'up', tone: '#10b981' },
      { icon: '💰', label: 'CAC', value: 'R$ 84', delta: '-R$ 12', deltaTone: 'up', tone: '#0ea5e9' },
      { icon: '🎯', label: 'ROI', value: '4,7x', delta: '+0,8', deltaTone: 'up', tone: '#22c55e' },
      { icon: '📈', label: 'Top Conv.', value: 'Indicação', sub: '38,4%', tone: '#a855f7' },
      { icon: '🔥', label: 'Melhor Camp.', value: '"Black 2026"', sub: 'ROI 7,2x', tone: '#f43f5e' },
      { icon: '📊', label: 'CPL', value: 'R$ 18', tone: '#6366f1' },
      { icon: '👀', label: 'Cliques', value: '34,2k', delta: '+18%', deltaTone: 'up', tone: '#06b6d4' },
      { icon: '💬', label: 'Leads Qualif.', value: '482', sub: '26% MQL', tone: '#f59e0b' },
      { icon: '📍', label: 'Top Cidade', value: 'Fortaleza', sub: '42%', tone: '#ef4444' },
      { icon: '🧠', label: 'Funil', value: '24,7%', sub: 'Lead → Cliente', tone: '#8b5cf6' }
    ];
    const canais = [
      { l: 'WhatsApp',  v: 38.4, color: '#25d366' },
      { l: 'Indicação', v: 32.1, color: '#10b981' },
      { l: 'Instagram', v: 22.6, color: '#e4405f' },
      { l: 'Google',    v: 18.2, color: '#0ea5e9' },
      { l: 'Facebook',  v: 12.4, color: '#1877f2' }
    ];
    const funil = [
      { l: 'Visitas',     v: 12480, color: '#0ea5e9' },
      { l: 'Leads',       v: 1842,  color: '#6366f1' },
      { l: 'Qualif.',     v: 482,   color: '#a855f7' },
      { l: 'Propostas',   v: 248,   color: '#f59e0b' },
      { l: 'Clientes',    v: 124,   color: '#10b981' }
    ];
    return (
      <div className="cd-page">
        <div className="cd-kpi-grid">{kpis.map((k, i) => <MiniKpi key={i} {...k} />)}</div>
        <div className="cd-charts cd-charts-2">
          <ChartFrame title="Conversão por Canal" sub="% de leads que viram cliente" height={240}>
            <BarChart data={canais} height={240} yFmt={(v) => v + '%'} color="#0ea5e9" />
          </ChartFrame>
          <ChartFrame title="Funil de Aquisição" sub="Volume por etapa" height={240}>
            <HBarChart data={funil} height={240} />
          </ChartFrame>
        </div>
      </div>);
  }

  function PageFinanceiro() {
    const kpis = [
      { icon: '💰', label: 'Receita Bruta', value: 'R$ 487k', delta: '+12,4%', deltaTone: 'up', tone: '#10b981' },
      { icon: '💵', label: 'Receita Líquida', value: 'R$ 422k', tone: '#22c55e' },
      { icon: '📉', label: 'Descontos', value: 'R$ 38k', sub: '7,8% do bruto', tone: '#f59e0b' },
      { icon: '🚫', label: 'Inadimplência', value: '2,4%', delta: '-0,3 pp', deltaTone: 'up', tone: '#ef4444' },
      { icon: '⏳', label: 'A Receber', value: 'R$ 184k', sub: '48 contas', tone: '#0ea5e9' },
      { icon: '💳', label: 'Top Pgto.', value: 'PIX', sub: '64%', tone: '#06b6d4' },
      { icon: '📊', label: 'Margem', value: '34,2%', delta: '+1,4 pp', deltaTone: 'up', tone: '#8b5cf6' },
      { icon: '🧾', label: 'Comissões', value: 'R$ 48k', sub: '9,8%', tone: '#a855f7' },
      { icon: '📅', label: 'Próx. 30d', value: 'R$ 92k', tone: '#f43f5e' },
      { icon: '🔁', label: 'MRR', value: 'R$ 184k', delta: '+8,2%', deltaTone: 'up', tone: '#6366f1' }
    ];
    const pagamentos = [
      { l: 'PIX',         v: 312, color: '#10b981' },
      { l: 'Cartão Cred', v: 184, color: '#6366f1' },
      { l: 'Boleto',      v:  98, color: '#f59e0b' },
      { l: 'Débito',      v:  64, color: '#0ea5e9' },
      { l: 'Dinheiro',    v:  38, color: '#a855f7' }
    ];
    const fluxo = MONTHS.slice(0, 6).map((m, i) => ({ l: m, v: [320, 360, 410, 380, 440, 487][i] * 1000 }));
    return (
      <div className="cd-page">
        <div className="cd-kpi-grid">{kpis.map((k, i) => <MiniKpi key={i} {...k} />)}</div>
        <div className="cd-charts cd-charts-2">
          <ChartFrame title="Fluxo de Caixa" sub="Receita por mês" height={240}>
            <LineChart data={fluxo} color="#10b981" height={240} yFmt={(v) => 'R$ ' + (v / 1000).toFixed(0) + 'k'} />
          </ChartFrame>
          <ChartFrame title="Formas de Pagamento" sub="Distribuição · maio" height={240}>
            <Donut data={pagamentos} total="696" totalLabel="PEDIDOS" />
          </ChartFrame>
        </div>
      </div>);
  }

  function PageFunil() {
    const kpis = [
      { icon: '👀', label: 'Leads no Funil', value: '1.842', tone: '#0ea5e9' },
      { icon: '📞', label: 'Contatos', value: '1.218', delta: '+148', deltaTone: 'up', tone: '#06b6d4' },
      { icon: '💬', label: 'Propostas', value: '482', tone: '#6366f1' },
      { icon: '🤝', label: 'Negociações', value: '184', sub: 'ativas', tone: '#a855f7' },
      { icon: '📝', label: 'Fechados', value: '124', delta: '+18', deltaTone: 'up', tone: '#10b981' },
      { icon: '❌', label: 'Perdidos', value: '58', sub: 'mês', tone: '#ef4444' },
      { icon: '⏳', label: 'T. Médio', value: '11,2 dias', deltaTone: 'down', delta: '-1,4 dias', tone: '#f59e0b' },
      { icon: '🎯', label: 'Fechamento', value: '24,7%', delta: '+1,8 pp', deltaTone: 'up', tone: '#22c55e' },
      { icon: '🔥', label: 'Maior Perda', value: 'Proposta', sub: '32% caem', tone: '#f43f5e' },
      { icon: '🚀', label: 'Quentes', value: '42', sub: '> 80% score', tone: '#8b5cf6' }
    ];
    const funil = [
      { l: 'Leads',         v: 1842, color: '#0ea5e9' },
      { l: 'Contatados',    v: 1218, color: '#6366f1' },
      { l: 'Qualificados',  v:  642, color: '#a855f7' },
      { l: 'Propostas',     v:  482, color: '#f59e0b' },
      { l: 'Negociação',    v:  184, color: '#f43f5e' },
      { l: 'Fechados',      v:  124, color: '#10b981' }
    ];
    return (
      <div className="cd-page">
        <div className="cd-kpi-grid">{kpis.map((k, i) => <MiniKpi key={i} {...k} />)}</div>
        <div className="cd-charts cd-charts-1">
          <ChartFrame title="Pipeline Comercial" sub="Volume por etapa do funil" height={260}>
            <HBarChart data={funil} height={260} />
          </ChartFrame>
        </div>
      </div>);
  }

  function PageGraficos() {
    const evolucao = MONTHS.map((m, i) => ({ l: m, v: [180, 220, 260, 310, 340, 380, 410, 440, 460, 472, 487, 510][i] * 1000 }));
    const vendasMes = MONTHS.slice(0, 6).map((m, i) => ({ l: m, v: [58, 72, 81, 76, 92, 98][i] }));
    const origens = [
      { l: 'WhatsApp',  v: 540, color: '#25d366' },
      { l: 'Instagram', v: 312, color: '#e4405f' },
      { l: 'Indicação', v: 198, color: '#10b981' },
      { l: 'Google',    v: 134, color: '#0ea5e9' },
      { l: 'Facebook',  v:  82, color: '#1877f2' }
    ];
    const churn = MONTHS.slice(0, 7).map((m, i) => ({ l: m, v: [5.8, 5.4, 5.1, 4.8, 4.6, 4.3, 4.1][i] }));
    const hoursDays = [[8, 14, 22, 38, 32, 18, 6], [12, 24, 38, 58, 52, 28, 8], [18, 32, 48, 72, 68, 38, 14], [22, 42, 64, 88, 82, 48, 22], [24, 48, 72, 92, 88, 54, 28], [12, 18, 28, 42, 38, 24, 12], [6, 8, 12, 18, 16, 10, 4]];
    return (
      <div className="cd-page">
        <div className="cd-charts cd-charts-3">
          <ChartFrame title="📈 Evolução do Faturamento" sub="Linha · 12 meses" height={200}>
            <LineChart data={evolucao} color="#10b981" height={200} yFmt={(v) => 'R$ ' + (v / 1000).toFixed(0) + 'k'} />
          </ChartFrame>
          <ChartFrame title="📊 Vendas por Mês" sub="Barras · pedidos" height={200}>
            <BarChart data={vendasMes} color="#0ea5e9" height={200} />
          </ChartFrame>
          <ChartFrame title="🥧 Clientes por Origem" sub="Pizza · aquisição" height={200}>
            <Donut data={origens} total="1.266" totalLabel="CLIENTES" size={170} />
          </ChartFrame>
          <ChartFrame title="📉 Churn Rate" sub="Linha · % por mês" height={200}>
            <LineChart data={churn} color="#ef4444" height={200} yFmt={(v) => v.toFixed(1) + '%'} />
          </ChartFrame>
          <ChartFrame title="🕒 Vendas por Horário" sub="Heatmap · semana × hora" height={200}>
            <Heatmap rows={['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']} cols={['08h', '10h', '12h', '14h', '16h', '18h', '20h']} data={hoursDays} />
          </ChartFrame>
          <ChartFrame title="🎯 Meta vs Resultado" sub="Gauge · maio" height={200}>
            <Gauge value={87} max={100} target={100} label="Meta R$ 560k" color="#10b981" size={180} />
          </ChartFrame>
        </div>
      </div>);
  }

  function PagePremium() {
    const kpis = [
      { icon: '🤖', label: 'Forecast IA', value: 'R$ 612k', sub: 'Junho · 92% conf.', tone: '#a855f7' },
      { icon: '⚠️', label: 'Alertas', value: '14', sub: '3 críticos', tone: '#ef4444' },
      { icon: '🔥', label: 'Quentes', value: '42', sub: 'Score > 80', tone: '#f43f5e' },
      { icon: '🧠', label: 'Score Cliente', value: '78/100', sub: 'Média carteira', tone: '#8b5cf6' },
      { icon: '🚀', label: 'Score Lead', value: '64/100', tone: '#0ea5e9' },
      { icon: '📉', label: 'Prev. Churn', value: '47', sub: 'risco 30d', tone: '#dc2626' },
      { icon: '💡', label: 'Upsell IA', value: '124', sub: 'sugestões', tone: '#22c55e' },
      { icon: '⏳', label: 'Sem Contato', value: '184', sub: '> 60 dias', tone: '#f59e0b' },
      { icon: '❤️', label: 'Saúde Carteira', value: '74%', delta: '+3 pp', deltaTone: 'up', tone: '#10b981' },
      { icon: '📊', label: 'Histórico', value: '+18,4%', sub: 'YoY', deltaTone: 'up', tone: '#06b6d4' }
    ];
    const forecast = MONTHS.map((m, i) => ({ l: m, v: [180, 220, 260, 310, 340, 380, 410, 440, 460, 472, 487, 612][i] * 1000 }));
    const riscos = [
      { l: 'Alex Soares · 28d',          v: 92, color: '#dc2626' },
      { l: 'Pedro Mafra · 22d',          v: 84, color: '#ef4444' },
      { l: 'Letícia Maranhão · 18d',     v: 78, color: '#f43f5e' },
      { l: 'Bruno Aragão · 15d',         v: 72, color: '#f59e0b' },
      { l: 'Júlia Mendes · 12d',         v: 64, color: '#fb923c' }
    ];
    return (
      <div className="cd-page cd-premium">
        <div className="cd-prem-banner">
          <span className="cd-prem-ic">👑</span>
          <div>
            <div className="cd-prem-t">Área Premium · Diferenciais</div>
            <div className="cd-prem-s">Forecast, scores e alertas alimentados por IA</div>
          </div>
        </div>
        <div className="cd-kpi-grid">{kpis.map((k, i) => <MiniKpi key={i} {...k} />)}</div>
        <div className="cd-charts cd-charts-2">
          <ChartFrame title="🤖 Forecast IA · 12 meses" sub="Projeção com 92% de confiança" height={200}>
            <LineChart data={forecast} color="#a855f7" height={200} yFmt={(v) => 'R$ ' + (v / 1000).toFixed(0) + 'k'} />
          </ChartFrame>
          <ChartFrame title="🔥 Top Clientes em Risco" sub="Score de churn · próximos 30d" height={200}>
            <HBarChart data={riscos} height={200} vFmt={(v) => v + '%'} />
          </ChartFrame>
        </div>
      </div>);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Tab navigation with sliding indicator
  // ────────────────────────────────────────────────────────────────────────────
  function TabNav({ tab, setTab, tabs }) {
    const wrapRef = React.useRef(null);
    const btnRefs = React.useRef({});
    const [thumb, setThumb] = React.useState({ left: 0, width: 0 });
    React.useLayoutEffect(() => {
      const btn = btnRefs.current[tab];
      const wrap = wrapRef.current;
      if (!btn || !wrap) return;
      const wrect = wrap.getBoundingClientRect();
      const brect = btn.getBoundingClientRect();
      setThumb({ left: brect.left - wrect.left, width: brect.width });
    }, [tab]);
    return (
      <div ref={wrapRef} className="cd-nav">
        <span className="cd-nav-thumb" style={{ transform: `translateX(${thumb.left}px)`, width: thumb.width }} />
        {tabs.map((t) =>
          <button
            key={t.id}
            ref={(el) => { btnRefs.current[t.id] = el; }}
            className={tab === t.id ? 'on' : ''}
            onClick={() => setTab(t.id)}>
            <span className="cd-nav-ic">{t.ic}</span>
            <span>{t.label}</span>
          </button>)}
      </div>);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Main page
  // ────────────────────────────────────────────────────────────────────────────
  const TABS = [
    { id: 'visao',     label: 'Visão Geral',  ic: '🧠', Page: PageVisao },
    { id: 'vendas',    label: 'Vendas',       ic: '💰', Page: PageVendas },
    { id: 'clientes',  label: 'Clientes',     ic: '👥', Page: PageClientes },
    { id: 'equipe',    label: 'Equipe',       ic: '🧑‍💼', Page: PageEquipe },
    { id: 'produtos',  label: 'Produtos',     ic: '📦', Page: PageProdutos },
    { id: 'marketing', label: 'Marketing',    ic: '📣', Page: PageMarketing },
    { id: 'financeiro',label: 'Financeiro',   ic: '🧾', Page: PageFinanceiro },
    { id: 'funil',     label: 'Funil',        ic: '🚀', Page: PageFunil },
    { id: 'graficos',  label: 'Gráficos',     ic: '📊', Page: PageGraficos }
  ];

  function CommercialDashboard() {
    const [tab, setTab] = React.useState('visao');
    const [premium, setPremium] = React.useState(false);
    const fullTabs = premium ? [...TABS, { id: 'premium', label: 'Premium', ic: '👑', Page: PagePremium }] : TABS;
    const activePage = fullTabs.find((t) => t.id === tab) || TABS[0];
    const Active = activePage.Page;
    return (
      <div className="screen">
        <CommDashStyles />
        <Topbar
          title="Dashboard Comercial"
          subtitle="Visão estratégica · KPIs, vendas e pipeline em tempo real"
          right={
            <div className="row" style={{ gap: 8 }}>
              <button
                className={`cd-prem-btn ${premium ? 'on' : ''}`}
                onClick={() => { setPremium(true); setTab('premium'); }}>
                <span>👑</span> Premium
              </button>
            </div>
          } />
        <div className="cd-wrap">
          <TabNav tab={tab} setTab={setTab} tabs={fullTabs} />
          <div className="cd-content scroll">
            <Active />
          </div>
        </div>
      </div>);
  }

  function CommDashStyles() {
    return (
      <style>{`
        .cd-wrap { flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; padding: 12px 18px 16px; gap: 12px; }
        .cd-nav { position: relative; display: inline-flex; flex-wrap: wrap; gap: 2px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; padding: 4px; align-self: flex-start; }
        .cd-nav-thumb { position: absolute; top: 4px; bottom: 4px; left: 0; background: #E5F6ED; border-radius: 8px; transition: transform .28s cubic-bezier(.4,0,.2,1), width .28s cubic-bezier(.4,0,.2,1); z-index: 0; pointer-events: none; box-shadow: inset 0 0 0 1px color-mix(in oklab, #10b981 28%, transparent); }
        .cd-nav button { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; border: none; background: transparent; color: var(--text-muted); font-size: 12px; font-weight: 600; cursor: pointer; transition: color .2s ease; }
        .cd-nav button:hover { color: var(--text); }
        .cd-nav button.on { color: #047857; }
        .cd-nav-ic { font-size: 14px; }

        .cd-prem-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 999px; border: 1px solid transparent;
          background: linear-gradient(135deg, #facc15 0%, #fb923c 50%, #ec4899 100%); color: #fff; font-weight: 700; font-size: 12px; cursor: pointer;
          box-shadow: 0 4px 14px -2px rgba(236,72,153,.35), inset 0 1px 0 rgba(255,255,255,.4); letter-spacing: .02em; transition: transform .15s, box-shadow .15s; }
        .cd-prem-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 22px -4px rgba(236,72,153,.45), inset 0 1px 0 rgba(255,255,255,.5); }
        .cd-prem-btn.on { animation: cdPremPulse 2s ease-in-out infinite; }
        @keyframes cdPremPulse { 0%,100% { box-shadow: 0 4px 14px -2px rgba(236,72,153,.35), inset 0 1px 0 rgba(255,255,255,.4); } 50% { box-shadow: 0 6px 22px -2px rgba(236,72,153,.6), inset 0 1px 0 rgba(255,255,255,.5); } }

        .cd-content { flex: 1; min-height: 0; overflow: auto; }
        .cd-page { display: flex; flex-direction: column; gap: 12px; height: 100%; }

        .cd-kpi-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
        @media (max-width: 1280px) { .cd-kpi-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        @media (max-width: 1000px) { .cd-kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }

        .cd-mini { display: flex; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; transition: box-shadow .15s, transform .15s, border-color .15s; min-height: 78px; }
        .cd-mini:hover { box-shadow: 0 6px 16px rgba(15,23,42,.08); transform: translateY(-1px); border-color: var(--border-strong); }
        .cd-mini-bar { width: 3px; flex-shrink: 0; }
        .cd-mini-body { flex: 1; padding: 8px 10px; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .cd-mini-head { display: flex; align-items: center; gap: 6px; }
        .cd-mini-ic { width: 22px; height: 22px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
        .cd-mini-l { font-size: 10px; font-weight: 700; color: var(--text-muted); letter-spacing: .03em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cd-mini-v { font-size: 18px; font-weight: 700; color: var(--text); letter-spacing: -0.01em; line-height: 1.1; }
        .cd-mini-foot { display: flex; align-items: center; gap: 6px; font-size: 10px; margin-top: auto; }
        .cd-mini-d { font-weight: 700; color: var(--text-faint); }
        .cd-mini-d.up { color: #059669; }
        .cd-mini-d.down { color: #dc2626; }
        .cd-mini-s { color: var(--text-faint); font-weight: 500; }

        .cd-charts { display: grid; gap: 12px; flex: 1; min-height: 0; }
        .cd-charts-1 { grid-template-columns: 1fr; }
        .cd-charts-2 { grid-template-columns: 1fr 1fr; }
        .cd-charts-3 { grid-template-columns: repeat(3, 1fr); grid-template-rows: 1fr 1fr; }
        @media (max-width: 1100px) { .cd-charts-2, .cd-charts-3 { grid-template-columns: 1fr; } .cd-charts-3 { grid-template-rows: none; } }

        .cd-chart { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; display: flex; flex-direction: column; min-width: 0; min-height: 0; transition: box-shadow .15s; }
        .cd-chart:hover { box-shadow: 0 4px 16px rgba(15,23,42,.06); }
        .cd-chart-hd { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
        .cd-chart-title { font-size: 13px; font-weight: 700; color: var(--text); }
        .cd-chart-sub { font-size: 11px; color: var(--text-faint); margin-top: 2px; }
        .cd-chart-bd { flex: 1; position: relative; }
        .cd-pill { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 999px; background: var(--accent-soft); color: var(--accent-700); letter-spacing: .04em; }

        .cd-svg-wrap { position: relative; width: 100%; height: 100%; }
        .cd-svg { width: 100%; height: 100%; display: block; overflow: visible; }
        .cd-tip { position: absolute; transform: translate(-50%, -110%); background: var(--text); color: var(--surface); padding: 5px 9px; border-radius: 6px; font-size: 10px; font-weight: 600; pointer-events: none; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,.18); animation: cdTipIn .15s ease-out; }
        .cd-tip-l { font-size: 9.5px; opacity: .75; }
        .cd-tip-v { font-size: 12px; font-weight: 800; margin-top: 1px; }
        @keyframes cdTipIn { from { opacity: 0; transform: translate(-50%, -100%); } to { opacity: 1; transform: translate(-50%, -110%); } }

        .cd-donut-wrap { display: flex; align-items: center; gap: 18px; height: 100%; padding: 0 14px; }
        .cd-donut-svg { width: 200px; height: 200px; flex-shrink: 0; }
        .cd-donut-legend { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 0; }
        .cd-leg { display: flex; align-items: center; gap: 8px; padding: 4px 8px; border-radius: 6px; cursor: pointer; transition: background .12s; }
        .cd-leg:hover, .cd-leg.on { background: var(--surface-2); }
        .cd-leg-sw { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
        .cd-leg-l { font-size: 12px; flex: 1; color: var(--text); }
        .cd-leg-v { font-size: 12px; font-weight: 700; color: var(--text-muted); font-variant-numeric: tabular-nums; }

        .cd-gauge { display: flex; align-items: center; justify-content: center; height: 100%; }
        .cd-gauge-svg { max-width: 100%; max-height: 100%; }

        .cd-premium { background: linear-gradient(180deg, color-mix(in oklab, #a855f7 4%, transparent) 0%, transparent 240px); margin: -8px -10px 0; padding: 8px 10px; border-radius: 12px; }
        .cd-prem-banner { display: flex; align-items: center; gap: 14px; padding: 10px 16px; background: linear-gradient(135deg, color-mix(in oklab, #facc15 16%, var(--surface)) 0%, color-mix(in oklab, #ec4899 16%, var(--surface)) 100%); border: 1px solid color-mix(in oklab, #ec4899 30%, var(--border)); border-radius: 12px; }
        .cd-prem-ic { font-size: 26px; }
        .cd-prem-t { font-weight: 700; font-size: 14px; color: var(--text); }
        .cd-prem-s { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

        /* Team page · podium + list */
        .cd-team-block { display: flex; flex-direction: column; gap: 10px; min-height: 0; height: 100%; }
        .cd-podium { display: grid; grid-template-columns: 1fr 1.08fr 1fr; gap: 10px; flex-shrink: 0; padding-top: 18px; align-items: end; }
        .cd-podium-card { position: relative; border: 2px solid; border-radius: 12px; padding: 26px 10px 10px; display: flex; flex-direction: column; align-items: center; gap: 6px; transition: transform .15s ease, box-shadow .15s ease; overflow: visible; }
        .cd-podium-card.cd-podium-1 { padding-top: 30px; box-shadow: 0 8px 22px -10px rgba(245,197,24,.45); }
        .cd-podium-card:hover { transform: translateY(-2px); box-shadow: 0 8px 22px -8px rgba(0,0,0,.12); }
        .cd-podium-medal { position: absolute; top: -16px; left: 50%; transform: translateX(-50%); display: inline-flex; align-items: center; gap: 5px; padding: 5px 13px; border-radius: 999px; color: #fff; font-weight: 800; font-size: 10px; letter-spacing: .06em; border: 2px solid #fff; z-index: 2; }
        .cd-podium-place { font-size: 13px; line-height: 1; }
        .cd-podium-name { font-size: 9px; opacity: .92; letter-spacing: .12em; }
        .cd-podium-avatar { width: 48px; height: 48px; border-radius: 50%; color: #fff; font-weight: 700; font-size: 16px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,.15), 0 0 0 3px #fff; }
        .cd-podium-info { text-align: center; min-width: 0; width: 100%; }
        .cd-podium-n { font-weight: 700; font-size: 13px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cd-podium-r { font-size: 10.5px; color: var(--text-muted); margin-top: 1px; }
        .cd-podium-t { font-size: 10px; color: var(--text-faint); margin-top: 1px; font-weight: 600; }
        .cd-podium-stats { width: 100%; margin-top: 4px; }
        .cd-podium-pct { font-size: 22px; font-weight: 800; color: var(--text); text-align: center; letter-spacing: -0.02em; line-height: 1; }
        .cd-podium-bar { height: 6px; background: rgba(255,255,255,.55); border-radius: 999px; margin-top: 4px; overflow: hidden; }
        .cd-podium-bar > div { height: 100%; border-radius: 999px; transition: width .35s cubic-bezier(.4,0,.2,1); }
        .cd-podium-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 8px; margin-top: 8px; font-size: 10px; }
        .cd-podium-grid > div { display: flex; flex-direction: column; line-height: 1.2; }
        .cd-podium-grid span { color: var(--text-faint); font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
        .cd-podium-grid strong { color: var(--text); font-size: 11.5px; font-weight: 700; font-variant-numeric: tabular-nums; }

        .cd-seller-list-head { display: flex; align-items: center; justify-content: space-between; padding: 0 4px; font-size: 11px; font-weight: 700; color: var(--text-muted); letter-spacing: .04em; text-transform: uppercase; flex-shrink: 0; }
        .cd-seller-list-head .muted { color: var(--text-faint); font-weight: 500; text-transform: none; letter-spacing: 0; }
        .cd-seller-list { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding: 2px; }
        .cd-seller-list::-webkit-scrollbar { width: 6px; }
        .cd-seller-list::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }
        .cd-seller-list::-webkit-scrollbar-track { background: transparent; }

        .cd-seller-row { display: grid; grid-template-columns: 28px 36px 1.4fr 1.6fr; gap: 10px; align-items: center; padding: 8px 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; transition: box-shadow .15s, border-color .15s; }
        .cd-seller-row:hover { border-color: var(--border-strong); box-shadow: 0 2px 8px rgba(15,23,42,.05); }
        .cd-seller-place { font-size: 13px; font-weight: 700; color: var(--text-muted); text-align: center; font-variant-numeric: tabular-nums; }
        .cd-seller-avatar { width: 36px; height: 36px; border-radius: 50%; color: #fff; font-weight: 700; font-size: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .cd-seller-info { min-width: 0; }
        .cd-seller-n { font-weight: 700; font-size: 12.5px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cd-seller-r { font-size: 11px; color: var(--text-muted); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cd-seller-bars { min-width: 0; }
        .cd-seller-bar-head { display: flex; justify-content: space-between; align-items: baseline; font-size: 10px; color: var(--text-muted); font-weight: 600; }
        .cd-seller-bar-pct { font-size: 12px; font-weight: 800; }
        .cd-seller-bar { height: 8px; background: var(--surface-2); border-radius: 999px; margin-top: 3px; overflow: hidden; }
        .cd-seller-bar > div { height: 100%; border-radius: 999px; transition: width .4s cubic-bezier(.4,0,.2,1); }
        .cd-seller-bar-foot { font-size: 10px; color: var(--text-faint); margin-top: 3px; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .cd-chart-empty { background: repeating-linear-gradient(45deg, var(--surface) 0 10px, var(--surface-2) 10px 20px); border-style: dashed; }
        .cd-empty-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; height: 100%; color: var(--text-faint); }
        .cd-empty-ic { font-size: 32px; opacity: .6; }
        .cd-empty-t { font-weight: 700; font-size: 13px; color: var(--text-muted); }
        .cd-empty-s { font-size: 11px; }

        /* Visão Geral · 20 KPIs 5×4 com modo painel */
        .cd-visao { display: flex; flex-direction: column; gap: 12px; height: 100%; background: var(--surface-2); }
        .cd-visao-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; padding: 2px 2px 0; flex-shrink: 0; }
        .cd-visao-t { font-size: 15px; font-weight: 700; color: var(--text); letter-spacing: -0.01em; }
        .cd-visao-s { font-size: 12px; color: var(--text-faint); margin-top: 2px; }
        .cd-visao-legend { display: inline-flex; align-items: center; gap: 10px; font-size: 11px; color: var(--text-muted); font-weight: 600; }
        .cd-visao-legend .dot { width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; display: inline-block; }
        .cd-panel-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 999px; border: 1px solid var(--border-strong); background: var(--surface); color: var(--text); font-size: 12px; font-weight: 700; cursor: pointer; transition: all .15s; }
        .cd-panel-btn:hover { background: #1e293b; color: #fff; border-color: #1e293b; box-shadow: 0 6px 18px -6px rgba(15,23,42,.45); }
        .cd-panel-btn svg { display: block; }

        .cd-visao-grid { flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); grid-template-rows: repeat(4, minmax(0, 1fr)); gap: 10px; }
        @media (max-width: 1280px) { .cd-visao-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); grid-template-rows: repeat(5, minmax(0, 1fr)); } }
        @media (max-width: 980px)  { .cd-visao-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); grid-template-rows: auto; } }

        /* Visão Geral · cards solid white com layouts variados */
        .cd-vcard { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; min-height: 0; min-width: 0; transition: box-shadow .2s ease, transform .2s ease, border-color .2s ease; }
        .cd-vcard:hover { box-shadow: 0 8px 24px -10px rgba(15,23,42,.10); border-color: #d1d5db; transform: translateY(-2px); }
        .cd-vcard-hd { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-shrink: 0; }
        .cd-vcard-t { font-size: 13px; font-weight: 700; color: #0f172a; letter-spacing: -0.005em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cd-vcard-h { font-size: 9.5px; font-weight: 700; color: #64748b; letter-spacing: .08em; padding: 2px 7px; border-radius: 999px; background: #f1f5f9; flex-shrink: 0; }
        .cd-vcard-bd { display: flex; flex-direction: column; gap: 6px; flex: 1; min-height: 0; justify-content: space-between; }

        .cd-v-row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
        .cd-v-big { font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; line-height: 1.05; font-variant-numeric: tabular-nums; }
        .cd-v-unit { font-size: 14px; font-weight: 700; color: #94a3b8; margin-left: 1px; }
        .cd-v-sub { font-size: 10.5px; color: #94a3b8; font-weight: 500; line-height: 1.3; }
        .cd-v-spark { height: 40px; margin-top: auto; }
        .cd-v-bar-block { display: flex; flex-direction: column; gap: 4px; margin-top: auto; }
        .cd-v-bar-foot { display: flex; justify-content: space-between; font-size: 10px; color: #64748b; font-variant-numeric: tabular-nums; font-weight: 600; gap: 6px; flex-wrap: wrap; }
        .cd-v-legend { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; color: #64748b; font-weight: 600; }
        .cd-v-legend span { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }

        .cd-v-foot-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: auto; }
        .cd-v-foot-l { font-size: 10px; color: #94a3b8; font-weight: 600; }
        .cd-v-foot-rows { display: flex; flex-direction: column; gap: 3px; margin-top: auto; }
        .cd-v-rline { display: flex; align-items: center; justify-content: space-between; font-size: 11px; }
        .cd-v-rline span { color: #64748b; font-weight: 500; }
        .cd-v-rline strong { color: #0f172a; font-weight: 700; font-variant-numeric: tabular-nums; }

        .cd-v-seller { display: flex; align-items: center; gap: 8px; }
        .cd-v-seller-av { width: 36px; height: 36px; border-radius: 50%; color: #fff; font-weight: 700; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .cd-v-seller-n { font-weight: 700; font-size: 13px; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cd-v-seller-r { font-size: 10.5px; color: #94a3b8; font-weight: 500; }

        .cd-v-team-list { display: flex; flex-direction: column; gap: 4px; margin-top: auto; }
        .cd-v-team-row { display: grid; grid-template-columns: 22px 1fr auto; gap: 8px; align-items: center; padding: 3px 0; font-size: 11px; }
        .cd-v-team-av { width: 22px; height: 22px; border-radius: 50%; color: #fff; font-weight: 700; font-size: 9px; display: inline-flex; align-items: center; justify-content: center; }
        .cd-v-team-n { color: #334155; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cd-v-team-v { color: #0f172a; font-weight: 700; font-variant-numeric: tabular-nums; font-size: 11px; }

        .cd-vd { display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #f1f5f9; color: #475569; flex-shrink: 0; }
        .cd-vd.up   { background: #ecfdf5; color: #047857; }
        .cd-vd.down { background: #fef2f2; color: #b91c1c; }
        .cd-vd-ic { font-size: 12px; line-height: 1; }

        /* Modo painel · fullscreen para exibir em TV */
        .cd-visao:fullscreen { padding: 32px 40px; background: linear-gradient(180deg, #0b1220 0%, #111827 100%); gap: 22px; }
        .cd-visao:fullscreen .cd-visao-t { color: #fff; font-size: 24px; }
        .cd-visao:fullscreen .cd-visao-s { color: rgba(255,255,255,.55); font-size: 14px; }
        .cd-visao:fullscreen .cd-panel-btn { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.2); color: #fff; }
        .cd-visao:fullscreen .cd-panel-btn:hover { background: rgba(255,255,255,.16); }
        .cd-visao:fullscreen .cd-visao-grid { gap: 16px; }
        .cd-visao:fullscreen .cd-vcard { background: #fff; border-color: transparent; padding: 20px 22px; }
        .cd-visao:fullscreen .cd-vcard-t { font-size: 16px; }
        .cd-visao:fullscreen .cd-v-big { font-size: 42px; }
        .cd-visao:fullscreen .cd-v-unit { font-size: 20px; }
        .cd-visao:fullscreen .cd-v-sub { font-size: 13px; }
        .cd-visao:fullscreen .cd-v-spark { height: 56px; }
        .cd-visao:fullscreen .cd-v-seller-av { width: 48px; height: 48px; font-size: 16px; }
        .cd-visao:fullscreen .cd-v-seller-n { font-size: 16px; }
        .cd-visao:fullscreen .cd-vd { font-size: 14px; padding: 4px 12px; }
      `}</style>);
  }

  window.CommercialDashboard = CommercialDashboard;
})();
