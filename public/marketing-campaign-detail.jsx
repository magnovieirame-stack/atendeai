// marketing-campaign-detail.jsx — Campaign detail drawer
// Opens at 80vw; shows campaign metrics, performance, recipient sample and timeline.

(function () {

  // ── helpers ──────────────────────────────────────────────────────────

  const pct = (n) => `${(n * 100).toFixed(1).replace('.', ',')}%`;
  const fmtN = (n) => (n || 0).toLocaleString('pt-BR');

  const ChannelChip = ({ kind }) => {
    const map = {
      whatsapp: { icon: 'whatsapp', label: 'WhatsApp', color: '#16A34A', bg: '#DCFCE7' },
      email:    { icon: 'mail',     label: 'E-mail',   color: '#1D4ED8', bg: '#DBEAFE' },
      sms:      { icon: 'phone',    label: 'SMS',      color: '#7C3AED', bg: '#EDE9FE' }
    };
    const m = map[kind] || map.email;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: m.bg, color: m.color, fontSize: 12, fontWeight: 700 }}>
        <Ic name={m.icon} size={12} />{m.label}
      </span>);
  };

  const StatusBadge = ({ s }) => {
    const map = {
      active:    { cls: 'badge-success', label: 'Ativa' },
      scheduled: { cls: 'badge-info',    label: 'Agendada' },
      completed: { cls: 'badge-neutral', label: 'Concluída' },
      draft:     { cls: 'badge-warning', label: 'Rascunho' },
      paused:    { cls: 'badge-danger',  label: 'Pausada' }
    };
    const m = map[s] || map.draft;
    return <span className={`badge ${m.cls}`}>{m.label}</span>;
  };

  // Deterministic synthetic daily timeseries based on campaign
  function buildSeries(c) {
    const seed = c.id.charCodeAt(c.id.length - 1) || 1;
    const days = 14;
    const out = [];
    for (let i = 0; i < days; i++) {
      const t = (i + seed) * 0.7;
      const base = c.sent / days;
      const wave = Math.sin(t) * .35 + Math.cos(t / 1.6) * .25;
      const sent = Math.max(0, Math.round(base * (1 + wave) * (c.status === 'paused' && i > 7 ? 0 : 1)));
      const opened = Math.round(sent * (c.open || 0));
      const clicked = Math.round(sent * (c.click || 0));
      const conv = Math.round(sent * (c.conv || 0));
      out.push({ d: i + 1, sent, opened, clicked, conv });
    }
    return out;
  }

  // ── Tiny multi-series area chart (SVG) ───────────────────────────────

  function PerfChart({ series }) {
    const [hover, setHover] = React.useState(null);
    const W = 560, H = 200, P = { l: 36, r: 12, t: 14, b: 24 };
    const max = Math.max(1, ...series.map((s) => s.sent));
    const lines = [
      { key: 'sent',    color: '#0EA5E9', label: 'Enviados',  fill: 'rgba(14,165,233,.12)' },
      { key: 'opened',  color: '#16A34A', label: 'Aberturas', fill: 'rgba(22,163,74,.12)' },
      { key: 'clicked', color: '#F59E0B', label: 'Cliques',   fill: 'none' },
      { key: 'conv',    color: '#7C3AED', label: 'Conversões', fill: 'none' }
    ];
    const x = (i) => P.l + (i / (series.length - 1)) * (W - P.l - P.r);
    const y = (v) => P.t + (1 - v / max) * (H - P.t - P.b);
    const path = (key) => series.map((s, i) => `${i === 0 ? 'M' : 'L'} ${x(i)},${y(s[key])}`).join(' ');
    const area = (key) => `${path(key)} L ${x(series.length - 1)},${H - P.b} L ${x(0)},${H - P.b} Z`;

    const onMove = (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * W;
      const i = Math.round(((px - P.l) / (W - P.l - P.r)) * (series.length - 1));
      setHover(Math.max(0, Math.min(series.length - 1, i)));
    };

    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 200, display: 'block' }}
          onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          {/* Y gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) =>
            <g key={i}>
              <line x1={P.l} x2={W - P.r} y1={y(max * t)} y2={y(max * t)} stroke="var(--border)" strokeWidth=".5" />
              <text x={P.l - 6} y={y(max * t) + 3} fontSize="9" textAnchor="end" fill="var(--text-faint)">{Math.round(max * t)}</text>
            </g>)}
          {/* Series */}
          {lines.map((ln) =>
            <g key={ln.key}>
              {ln.fill !== 'none' && <path d={area(ln.key)} fill={ln.fill} />}
              <path d={path(ln.key)} fill="none" stroke={ln.color} strokeWidth="1.5" strokeLinejoin="round" />
            </g>)}
          {/* Hover */}
          {hover !== null &&
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="var(--border-strong)" strokeWidth=".5" strokeDasharray="2 2" />
              {lines.map((ln) =>
                <circle key={ln.key} cx={x(hover)} cy={y(series[hover][ln.key])} r="3" fill={ln.color} stroke="white" strokeWidth="1.5" />)}
            </g>}
          {/* X labels (every 2 days) */}
          {series.map((s, i) => i % 2 === 0 &&
            <text key={i} x={x(i)} y={H - 8} fontSize="9" textAnchor="middle" fill="var(--text-faint)">D{s.d}</text>)}
        </svg>

        {/* Tooltip */}
        {hover !== null &&
          <div style={{
            position: 'absolute',
            left: `${(x(hover) / W) * 100}%`,
            top: 8,
            transform: 'translate(-50%, 0)',
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '8px 10px', fontSize: 11, lineHeight: 1.5,
            boxShadow: '0 6px 20px -8px rgba(15,23,42,.2)', pointerEvents: 'none', whiteSpace: 'nowrap'
          }}>
            <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4, fontSize: 11 }}>Dia {series[hover].d}</div>
            {lines.map((ln) =>
              <div key={ln.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: ln.color }} />
                <span style={{ color: 'var(--text-muted)', minWidth: 70 }}>{ln.label}</span>
                <span className="tnum" style={{ fontWeight: 700, color: 'var(--text)' }}>{fmtN(series[hover][ln.key])}</span>
              </div>)}
          </div>}

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 6, fontSize: 11.5 }}>
          {lines.map((ln) =>
            <span key={ln.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontWeight: 600 }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: ln.color }} />
              {ln.label}
            </span>)}
        </div>
      </div>);
  }

  // ── Funnel bars ──────────────────────────────────────────────────────

  function Funnel({ c }) {
    const stages = [
      { label: 'Enviadas',     count: c.sent,                      color: '#0EA5E9' },
      { label: 'Entregues',    count: Math.round(c.sent * 0.97),   color: '#0284C7' },
      { label: 'Abertas',      count: Math.round(c.sent * c.open), color: '#16A34A' },
      { label: 'Clicadas',     count: Math.round(c.sent * c.click),color: '#F59E0B' },
      { label: 'Converteram',  count: Math.round(c.sent * c.conv), color: '#7C3AED' }
    ].filter((s) => s.count > 0);
    if (!stages.length) return <div className="muted" style={{ fontSize: 13 }}>Sem dados de funil ainda.</div>;
    const top = stages[0].count;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {stages.map((s, i) => {
          const w = (s.count / top) * 100;
          const prev = i > 0 ? stages[i - 1].count : null;
          const dropRate = prev ? ((prev - s.count) / prev) : null;
          return (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 110, fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
              <div style={{ flex: 1, height: 24, background: 'var(--surface-2)', borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
                <div style={{ width: `${w}%`, height: '100%', background: `linear-gradient(90deg, ${s.color}, color-mix(in oklab, ${s.color} 70%, white))`, borderRadius: 6, transition: 'width .4s' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
                  <span className="tnum" style={{ fontSize: 12, fontWeight: 800, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,.18)' }}>{fmtN(s.count)}</span>
                </div>
              </div>
              <div style={{ width: 78, textAlign: 'right' }}>
                <div className="tnum" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{pct(s.count / top)}</div>
                {dropRate !== null && <div style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>−{pct(dropRate)} vs. anterior</div>}
              </div>
            </div>);
        })}
      </div>);
  }

  // ── Devices / sources donut ──────────────────────────────────────────

  function MiniBars({ data }) {
    const max = Math.max(...data.map((d) => d.v));
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map((d, i) =>
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 50px', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{d.label}</span>
            <div style={{ height: 10, background: 'var(--surface-2)', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ width: `${(d.v / max) * 100}%`, height: '100%', background: d.color, borderRadius: 5 }} />
            </div>
            <span className="tnum" style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'right', fontWeight: 600 }}>{pct(d.v / max * (d.total || 1))}</span>
          </div>)}
      </div>);
  }

  // ── KPI tile ─────────────────────────────────────────────────────────

  function Tile({ label, value, hint, color = 'var(--text)', icon }) {
    return (
      <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon &&
            <span style={{ width: 24, height: 24, borderRadius: 7, background: `color-mix(in oklab, ${color} 14%, var(--surface))`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ic name={icon} size={12} />
            </span>}
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>
        </div>
        <div className="tnum" style={{ fontSize: 24, fontWeight: 800, color, letterSpacing: '-.02em' }}>{value}</div>
        {hint && <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{hint}</div>}
      </div>);
  }

  // ── Recipients sample ────────────────────────────────────────────────

  const RECIPIENT_NAMES = [
    'Aurora Cosméticos', 'Studio Glam', 'Espaço Vitória', 'Beleza Natural ME', 'Lumière Estética',
    'Mariana Castro', 'Salão Bella Rosa', 'Camila Andrade', 'Carolina Mendes', 'Fernanda Costa',
    'Renata Souza', 'Patrícia Lima', 'Atelier Aurora', 'Studio Maquiagem RJ', 'Beleza & Cia',
    'Daniela Rocha', 'Juliana Pereira', 'Letícia Albuquerque', 'Sofía Vieira', 'Beatriz Moreira',
    'Empresa Verde Vivo', 'Luiza Fontes', 'Studio Pink', 'Bella Linda Studio', 'Camilla Ferraz',
    'Lorena Diniz', 'Thaís Magalhães', 'Vanessa Castro', 'Esmalteria Glow', 'Centro Estético Lux',
    'Pri Cabeleireira', 'Mônica Tavóra', 'Ana Beatriz Lima', 'Loja da Suê', 'Aline Bittencourt',
    'Bruna Pacheco', 'Cláudia Mello', 'Esmaltería Rosa', 'Fernanda Borges', 'Glamour Studio',
    'Hérica Sampaio', 'Indústria Bella', 'Joana Cardoso', 'Kelly Nogueira', 'Larissa Domingues',
    'Marta Reis', 'Nádia Soares', 'Olívia Cardim', 'Paula Vasconcelos', 'Quitanda Beleza',
    'Raquel Tavares', 'Sandra Pinheiro', 'Tatiane Oliveira', 'Ursula Ramos', 'Vitória Castro'
  ];
  const STATUSES = ['delivered', 'opened', 'clicked', 'converted', 'failed', 'pending'];
  const STATUS_CFG = {
    delivered: { label: 'Entregue',  color: '#0EA5E9', icon: 'check' },
    opened:    { label: 'Abriu',     color: '#16A34A', icon: 'mail' },
    clicked:   { label: 'Clicou',    color: '#F59E0B', icon: 'arrow-up-right' },
    converted: { label: 'Converteu', color: '#7C3AED', icon: 'star' },
    failed:    { label: 'Falhou',    color: '#DC2626', icon: 'x' },
    pending:   { label: 'Pendente',  color: '#94A3B8', icon: 'clock' }
  };

  // Simple deterministic PRNG so each campaign id gets a stable but distinct distribution
  function makeRng(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
  }

  function buildRecipients(c) {
    const seed = c.id.split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0;
    const rng = makeRng(seed);
    if (c.status === 'draft')        return [];

    // Target distribution based on the campaign's metrics. Always include at least one of each
    // major status so the user sees the spectrum.
    const total = RECIPIENT_NAMES.length;
    const targetConv      = Math.max(1, Math.round(total * (c.conv  || 0.05)));
    const targetClickOnly = Math.max(1, Math.round(total * Math.max(0, (c.click || 0.15) - (c.conv || 0.05))));
    const targetOpenOnly  = Math.max(2, Math.round(total * Math.max(0, (c.open  || 0.55) - (c.click || 0.15))));
    const targetFailed    = Math.max(1, Math.round(total * 0.04));
    const targetPending   = c.status === 'scheduled' ? total :
                            c.status === 'active'    ? Math.max(2, Math.round(total * 0.10)) :
                                                       Math.max(1, Math.round(total * 0.02));
    // Remaining are delivered-only
    const usedNonDelivered = targetConv + targetClickOnly + targetOpenOnly + targetFailed + targetPending;
    const targetDelivered  = Math.max(1, total - usedNonDelivered);

    const seq = [];
    const pushN = (n, st) => { for (let i = 0; i < n; i++) seq.push(st); };
    if (c.status === 'scheduled') {
      pushN(total, 'pending');
    } else {
      pushN(targetConv, 'converted');
      pushN(targetClickOnly, 'clicked');
      pushN(targetOpenOnly, 'opened');
      pushN(targetDelivered, 'delivered');
      pushN(targetFailed, 'failed');
      pushN(targetPending, 'pending');
    }
    // Shuffle deterministically
    for (let i = seq.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [seq[i], seq[j]] = [seq[j], seq[i]];
    }

    return RECIPIENT_NAMES.slice(0, seq.length).map((name, i) => {
      const day = Math.max(1, 14 - Math.floor(i / 5));
      const hh = String(8 + Math.floor(rng() * 12)).padStart(2, '0');
      const mm = String(Math.floor(rng() * 60)).padStart(2, '0');
      const phone = `(${11 + (i % 88)}) 9${String(1000 + Math.floor(rng() * 8999)).slice(0, 4)}-${String(1000 + Math.floor(rng() * 8999)).slice(0, 4)}`;
      return { name, st: seq[i], day, time: `${hh}:${mm}`, phone };
    });
  }

  function RecipientList({ c }) {
    const [filter, setFilter] = React.useState('all');
    const all = React.useMemo(() => buildRecipients(c), [c]);
    const shown = filter === 'all' ? all : all.filter((r) => r.st === filter);

    const counts = React.useMemo(() => {
      const m = { all: all.length };
      STATUSES.forEach((s) => { m[s] = all.filter((r) => r.st === s).length; });
      return m;
    }, [all]);

    if (!all.length) {
      return <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 10 }}>
        Esta campanha ainda não foi disparada — nenhum destinatário na lista.
      </div>;
    }

    return (
      <>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {[['all', 'Todos']].concat(STATUSES.map((s) => [s, STATUS_CFG[s].label])).map(([id, l]) =>
            <span key={id} onClick={() => setFilter(id)} className="chip" style={{
              cursor: 'pointer', padding: '4px 10px', height: 26, fontSize: 11.5,
              background: filter === id ? 'var(--accent-soft)' : 'var(--surface-3)',
              color: filter === id ? 'var(--accent-700)' : 'var(--text-muted)',
              fontWeight: filter === id ? 700 : 500
            }}>
              {l} <span className="tnum" style={{ opacity: .65, marginLeft: 2 }}>{counts[id] || 0}</span>
            </span>)}
        </div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'var(--surface)' }}>
          {/* Sticky column header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 130px 36px', gap: 10, padding: '9px 14px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
            <span>Destinatário</span>
            <span>Contato</span>
            <span>Status</span>
            <span />
          </div>
          {/* Scrollable body */}
          <div className="scroll" style={{ maxHeight: 420, overflowY: 'auto' }}>
            {shown.map((r, i) => {
              const cfg = STATUS_CFG[r.st];
              const initials = r.name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 130px 36px', gap: 10, alignItems: 'center', padding: '10px 14px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>{initials}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 1 }}>D{r.day} · {r.time}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono, ui-monospace, monospace)' }}>{r.phone}</div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: cfg.color, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: `color-mix(in oklab, ${cfg.color} 14%, var(--surface))`, alignSelf: 'center', justifySelf: 'start' }}>
                    <Ic name={cfg.icon} size={11} />{cfg.label}
                  </span>
                  <button className="btn btn-ghost btn-icon" title="Ver conversa" style={{ justifySelf: 'end' }}><Ic name="chat" size={13} /></button>
                </div>);
            })}
            {!shown.length &&
              <div style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>Nenhum destinatário nesta categoria.</div>}
          </div>
        </div>
      </>);
  }

  // ── Timeline ─────────────────────────────────────────────────────────

  function Timeline({ c }) {
    const events = [
      { d: '25 mai · 09:00', t: 'Campanha criada por Mariana Castro',           icon: 'plus',    color: '#0EA5E9' },
      { d: '25 mai · 09:14', t: 'Audiência segmentada · 1.240 contatos elegíveis', icon: 'team',    color: '#6366F1' },
      { d: '25 mai · 09:18', t: 'Aprovada e enviada para fila de envio',         icon: 'check',   color: '#16A34A' },
      { d: '25 mai · 09:32', t: 'Primeiros 50 disparos enviados',                icon: 'send',    color: '#0EA5E9' },
      { d: '25 mai · 10:05', t: 'IA ajustou copy da variante B (+12% abertura)', icon: 'sparkles', color: '#7C3AED' },
      c.status === 'paused'   ? { d: '26 mai · 14:22', t: 'Campanha pausada manualmente', icon: 'pause', color: '#DC2626' } : null,
      c.status === 'completed'? { d: '02 jun · 22:00', t: 'Campanha concluída · todos os disparos finalizados', icon: 'check', color: '#16A34A' } : null
    ].filter(Boolean);
    return (
      <div style={{ position: 'relative', paddingLeft: 8 }}>
        <div style={{ position: 'absolute', left: 16, top: 6, bottom: 6, width: 1.5, background: 'var(--border)' }} />
        {events.map((e, i) =>
          <div key={i} style={{ position: 'relative', display: 'flex', gap: 14, paddingBottom: i === events.length - 1 ? 0 : 14 }}>
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: e.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 7, zIndex: 1, boxShadow: '0 0 0 3px var(--surface)' }}>
              <Ic name={e.icon} size={9} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>{e.t}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 2 }}>{e.d}</div>
            </div>
          </div>)}
      </div>);
  }

  // ── Message preview ──────────────────────────────────────────────────

  function MessagePreview({ c }) {
    const body = c.channel === 'email'
      ? 'Boa tarde, Mariana!\n\nPreparamos uma seleção especial pensando exatamente em você. Aproveite os benefícios exclusivos antes que acabem.'
      : c.name.includes('Reativação') ? 'Oi {nome}! Sentimos sua falta 💛 Liberamos um cupom especial de 15% só pra você — válido até domingo. Aproveita?'
      : c.name.includes('Cross-sell') ? 'Olá {nome}! Vi que você ama o Esmalte Premium 💅 Pra um acabamento perfeito, conheça o nosso Top Coat — em promoção essa semana.'
      : c.name.includes('Aniversariantes') ? 'Feliz aniversário, {nome}! 🎉 Liberamos um cupom de 20% só pra você. Válido por 7 dias.'
      : c.name.includes('NPS') ? 'Oi {nome}! De 0 a 10, o quanto você indicaria a Atende.ia para uma amiga?'
      : 'Oi {nome}! Faz tempo que a gente não te vê 💛 Que tal voltar com uma vantagem exclusiva?';
    const preview = body.replace(/\{nome\}/g, 'Mariana');

    if (c.channel === 'email') {
      return (
        <div style={{ background: 'white', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
            <div><strong style={{ color: 'var(--text)' }}>Assunto:</strong> {c.name}</div>
          </div>
          <div style={{ padding: 14, fontSize: 13, color: '#111', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
            {preview}
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'inline-block', background: 'var(--accent)', color: 'white', padding: '10px 18px', borderRadius: 6, fontWeight: 700, fontSize: 13 }}>Aproveitar oferta</div>
            </div>
          </div>
        </div>);
    }
    return (
      <div style={{ background: '#E5DDD5', borderRadius: 10, padding: 14, backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,.3), transparent 40%)' }}>
        <div style={{ background: '#DCF8C6', borderRadius: '10px 10px 2px 10px', padding: '8px 11px', marginLeft: 'auto', maxWidth: '90%', boxShadow: '0 1px 1px rgba(0,0,0,.08)' }}>
          <div style={{ fontSize: 13, color: '#111', whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>{preview}</div>
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,.08)', color: '#0aa', fontSize: 12.5, textAlign: 'center', fontWeight: 600 }}>Quero meu cupom ›</div>
          <div style={{ fontSize: 10, color: '#777', textAlign: 'right', marginTop: 4 }}>09:32 ✓✓</div>
        </div>
      </div>);
  }

  // ── Section heading ──────────────────────────────────────────────────

  function H({ icon, children, action }) {
    return (
      <div className="row" style={{ alignItems: 'center', gap: 10, marginBottom: 12 }}>
        {icon && <span style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--accent-soft)', color: 'var(--accent-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic name={icon} size={13} /></span>}
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0, letterSpacing: '-.01em' }}>{children}</h3>
        <span className="spacer" />
        {action}
      </div>);
  }

  // ── MAIN DRAWER ──────────────────────────────────────────────────────

  function CampaignDetailDrawer({ campaign, onClose, onDuplicate, onToggleStatus }) {
    const [tab, setTab] = React.useState('overview');
    const [toast, setToast] = React.useState(null);
    const showToast = (msg, kind = 'success') => {
      setToast({ msg, kind });
      setTimeout(() => setToast(null), 2600);
    };
    const series = React.useMemo(() => buildSeries(campaign), [campaign]);

    const sent = campaign.sent;
    const opened = Math.round(sent * (campaign.open || 0));
    const clicked = Math.round(sent * (campaign.click || 0));
    const conv = Math.round(sent * (campaign.conv || 0));
    const undelivered = Math.max(0, Math.round(sent * 0.03));

    const channelLabel = { whatsapp: 'WhatsApp', email: 'E-mail', sms: 'SMS' }[campaign.channel] || campaign.channel;

    const isLive = campaign.status === 'active' || campaign.status === 'scheduled';
    const headlineColor = campaign.channel === 'whatsapp' ? '#16A34A' : campaign.channel === 'email' ? '#1D4ED8' : '#7C3AED';

    const handleDuplicate = () => {
      if (onDuplicate) onDuplicate(campaign);
      showToast(`Campanha "${campaign.name}" duplicada como rascunho.`);
    };

    const handleExport = () => {
      const recipients = buildRecipients(campaign);
      const header = ['Destinatario', 'Telefone', 'Status', 'Dia', 'Horario'];
      const lines = recipients.map((r) => [r.name, r.phone, STATUS_CFG[r.st]?.label || r.st, 'D' + r.day, r.time]);
      const csv = [header, ...lines].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const safeName = campaign.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      const a = document.createElement('a');
      a.href = url; a.download = `campanha-${safeName}-${campaign.id}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast(`Relatório exportado · ${recipients.length} destinatários.`);
    };

    const handlePause = () => {
      if (onToggleStatus) onToggleStatus(campaign, 'paused');
      showToast(`Campanha pausada. Os disparos pendentes foram suspensos.`, 'warning');
    };
    const handleResume = () => {
      if (onToggleStatus) onToggleStatus(campaign, 'active');
      showToast(`Campanha retomada. Os disparos voltarão a ser enviados.`);
    };
    const handlePublish = () => {
      if (onToggleStatus) onToggleStatus(campaign, 'active');
      showToast(`Campanha publicada e disparos iniciados.`);
    };

    return (
      <Drawer
        width="80vw"
        title={campaign.name}
        subtitle={`${channelLabel} · ${campaign.audience} · ${campaign.scheduled}`}
        leftHead={
          <div style={{ width: 44, height: 44, borderRadius: 11, background: `linear-gradient(135deg, ${headlineColor}, color-mix(in oklab, ${headlineColor} 60%, var(--accent)))`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <Ic name={campaign.channel === 'whatsapp' ? 'whatsapp' : campaign.channel === 'email' ? 'mail' : 'phone'} size={20} />
          </div>
        }
        onClose={onClose}
        footer={
          <>
            <StatusBadge s={campaign.status} />
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {isLive ? 'Acompanhe os resultados em tempo real.' : 'Histórico finalizado.'}
            </div>
            <div className="spacer" />
            <button className="btn" onClick={handleDuplicate}><Ic name="file" size={13} /> Duplicar</button>
            <button className="btn" onClick={handleExport}><Ic name="download" size={13} /> Exportar</button>
            {campaign.status === 'active' &&
              <button className="btn btn-danger" onClick={handlePause}><Ic name="pause" size={13} /> Pausar</button>}
            {campaign.status === 'paused' &&
              <button className="btn btn-primary" onClick={handleResume}><Ic name="play" size={13} /> Retomar</button>}
            {campaign.status === 'draft' &&
              <button className="btn btn-primary" onClick={handlePublish}><Ic name="send" size={13} /> Publicar</button>}
            {campaign.status === 'scheduled' &&
              <button className="btn"><Ic name="settings" size={13} /> Editar</button>}
          </>
        }>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 18, marginTop: -8 }}>
          {[
            { id: 'overview',    label: 'Visão geral',    icon: 'reports' },
            { id: 'audience',    label: 'Destinatários',  icon: 'team' },
            { id: 'message',     label: 'Mensagem',       icon: 'chat' },
            { id: 'timeline',    label: 'Histórico',      icon: 'clock' }
          ].map((t) =>
            <div key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '10px 16px', cursor: 'pointer',
              fontSize: 13.5, fontWeight: 600,
              color: tab === t.id ? 'var(--accent-700)' : 'var(--text-muted)',
              borderBottom: '2px solid ' + (tab === t.id ? 'var(--accent)' : 'transparent'),
              marginBottom: -1,
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              <Ic name={t.icon} size={13} />{t.label}
            </div>)}
        </div>

        {tab === 'overview' &&
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {/* KPI tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
              <Tile label="Enviadas"   value={fmtN(sent)}                            icon="send"  color="#0EA5E9" hint={`${fmtN(undelivered)} falharam`} />
              <Tile label="Aberturas"  value={sent ? pct(campaign.open) : '—'}        icon="mail"  color="#16A34A" hint={`${fmtN(opened)} pessoas`} />
              <Tile label="Cliques"    value={sent ? pct(campaign.click) : '—'}       icon="arrow-up-right" color="#F59E0B" hint={`${fmtN(clicked)} cliques únicos`} />
              <Tile label="Conversões" value={sent ? pct(campaign.conv) : '—'}        icon="star"  color="#7C3AED" hint={`${fmtN(conv)} vendas/agendas`} />
              <Tile label="Receita gerada" value={'R$ ' + fmtN(Math.round(conv * 287))} icon="finance" color="var(--accent-700)" hint="ticket médio R$ 287" />
            </div>

            {/* Chart */}
            <div className="card card-pad">
              <H icon="reports" action={
                <div className="row" style={{ gap: 4 }}>
                  <button className="btn btn-sm">7d</button>
                  <button className="btn btn-sm" style={{ background: 'var(--accent-soft)', color: 'var(--accent-700)', borderColor: 'var(--accent)' }}>14d</button>
                  <button className="btn btn-sm">30d</button>
                </div>}>Performance ao longo do tempo</H>
              <PerfChart series={series} />
            </div>

            {/* Funnel + insights */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, alignItems: 'flex-start' }} className="mkt-detail-row">
              <div className="card card-pad">
                <H icon="funnel">Funil de conversão</H>
                <Funnel c={campaign} />
              </div>

              <div className="card card-pad">
                <H icon="sparkles">Insights da IA</H>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <InsightItem color="#16A34A" icon="check" title="Performance acima da média"
                    body={`Taxa de abertura ${pct(campaign.open)} é 18% maior que a média das campanhas de ${channelLabel}.`} />
                  <InsightItem color="#F59E0B" icon="clock" title="Janela ideal"
                    body="Disparos entre 09h–11h tiveram 24% mais conversão. Considere migrar próximos envios para esse horário." />
                  <InsightItem color="#7C3AED" icon="star" title="Oportunidade de remarketing"
                    body={`${fmtN(opened - clicked)} pessoas abriram mas não clicaram. Crie um follow-up segmentado pra elas.`} />
                </div>
              </div>
            </div>

            {/* Devices + sources */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="mkt-detail-row">
              <div className="card card-pad">
                <H icon="phone">Aberturas por dispositivo</H>
                <MiniBars data={[
                  { label: 'Mobile',  v: 78, color: '#16A34A', total: 1 },
                  { label: 'Desktop', v: 18, color: '#0EA5E9', total: 1 },
                  { label: 'Tablet',  v: 4,  color: '#7C3AED', total: 1 }
                ]} />
              </div>
              <div className="card card-pad">
                <H icon="leads">Origem dos cliques</H>
                <MiniBars data={[
                  { label: 'Direto',     v: 62, color: '#0EA5E9', total: 1 },
                  { label: 'CTA botão',  v: 28, color: '#7C3AED', total: 1 },
                  { label: 'Link inline',v: 10, color: '#F59E0B', total: 1 }
                ]} />
              </div>
            </div>
          </div>}

        {tab === 'audience' &&
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              <Tile label="Audiência" value={fmtN(sent + Math.max(0, 1240 - sent))} icon="team" color="var(--accent-700)" hint="contatos elegíveis" />
              <Tile label="Alcançados" value={fmtN(sent - undelivered)} icon="check" color="#16A34A" hint={`${pct((sent - undelivered) / Math.max(1, sent))} de entrega`} />
              <Tile label="Engajaram" value={fmtN(opened)} icon="mail" color="#0EA5E9" hint={`${pct(opened / Math.max(1, sent))} dos envios`} />
              <Tile label="Pendentes" value={fmtN(Math.max(0, 1240 - sent))} icon="clock" color="#94A3B8" hint="ainda na fila" />
            </div>
            <div className="card card-pad">
              <H icon="team" action={
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn btn-sm"><Ic name="upload" size={12} /> Exportar CSV</button>
                  <button className="btn btn-sm"><Ic name="filter" size={12} /> Filtros</button>
                </div>}>Destinatários ({fmtN(RECIPIENT_NAMES.length)} de {fmtN(sent)})</H>
              <RecipientList c={campaign} />
            </div>
          </div>}

        {tab === 'message' &&
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 18, alignItems: 'flex-start' }} className="mkt-detail-row">
            <div className="card card-pad">
              <H icon="chat" action={<button className="btn btn-sm"><Ic name="settings" size={12} /> Editar</button>}>Conteúdo enviado</H>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <KeyVal label="Canal">{channelLabel}</KeyVal>
                <KeyVal label="Audiência">{campaign.audience}</KeyVal>
                <KeyVal label="Disparo">{campaign.scheduled}</KeyVal>
                <KeyVal label="CTA principal">Quero meu cupom · atende.ia/cupom-volta</KeyVal>
                <KeyVal label="UTM">utm_campaign={campaign.id}, utm_medium={campaign.channel}, utm_source=atende-ia</KeyVal>
                <KeyVal label="Follow-up">Ativado · 3 dias após sem resposta</KeyVal>
                <KeyVal label="A/B test">{campaign.id === 'c1' ? 'Variante B venceu por +12%' : 'Desativado'}</KeyVal>
              </div>
            </div>
            <div style={{ position: 'sticky', top: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8 }}>Pré-visualização</div>
              <MessagePreview c={campaign} />
            </div>
          </div>}

        {tab === 'timeline' &&
          <div className="card card-pad">
            <H icon="clock">Histórico da campanha</H>
            <Timeline c={campaign} />
          </div>}

        <style>{`
          @media (max-width: 900px) {
            .mkt-detail-row { grid-template-columns: 1fr !important; }
          }
          @keyframes mktToastIn { from { transform: translate(-50%, 12px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        `}</style>

        {toast &&
          <div style={{
            position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)',
            background: toast.kind === 'warning' ? '#fef3c7' : toast.kind === 'error' ? '#fee2e2' : 'var(--text)',
            color: toast.kind === 'warning' ? '#92400e' : toast.kind === 'error' ? '#991b1b' : 'white',
            padding: '10px 16px', borderRadius: 10,
            boxShadow: '0 12px 30px -10px rgba(15,23,42,.35)',
            fontSize: 13, fontWeight: 600, zIndex: 200,
            display: 'flex', alignItems: 'center', gap: 8,
            animation: 'mktToastIn .25s ease both'
          }}>
            <Ic name={toast.kind === 'warning' ? 'pause' : toast.kind === 'error' ? 'x' : 'check'} size={13} />
            {toast.msg}
          </div>}
      </Drawer>);
  }

  function InsightItem({ color, icon, title, body }) {
    return (
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 10, borderRadius: 10, background: `color-mix(in oklab, ${color} 8%, var(--surface))`, border: `1px solid color-mix(in oklab, ${color} 22%, var(--border))` }}>
        <span style={{ width: 24, height: 24, borderRadius: 7, background: color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Ic name={icon} size={12} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.45 }}>{body}</div>
        </div>
      </div>);
  }

  function KeyVal({ label, children }) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 14, alignItems: 'baseline', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>
        <span style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 500 }}>{children}</span>
      </div>);
  }

  window.CampaignDetailDrawer = CampaignDetailDrawer;
})();
