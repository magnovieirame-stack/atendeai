// admin.jsx — Admin screens: Dashboard, Configurações, Catálogo, Integrações, Equipe, Regras, Respostas, Relatórios, Histórico, Financeiro

// Deterministic pseudo-random in [0,1) — keeps charts stable across re-renders
function dashRand(i, salt) {
  const x = Math.sin((i + 1) * 12.9898 + (salt || 0) * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Period presets driving the whole dashboard
const DASH_PERIODS = {
  hoje: { label: 'Hoje', volumeTitle: 'Volume por hora · últimas 24h', convos: 274, resolvedPct: 73, avgSec: 2.4,
    bars: 24, barLabel: (i) => `${String(i).padStart(2, '0')}h`, barShown: (i) => i % 4 === 0,
    delta: '↑ 18%', deltaTone: 'up', vs: 'vs ontem', topFactor: 0.32, channels: { wa: 68, ig: 22, fb: 10 } },
  '7d': { label: '7 dias', volumeTitle: 'Volume por dia · últimos 7 dias', convos: 1694, resolvedPct: 72, avgSec: 2.6,
    bars: 7, barLabel: (i) => ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][i], barShown: () => true,
    delta: '↑ 11%', deltaTone: 'up', vs: 'vs semana anterior', topFactor: 1, channels: { wa: 65, ig: 24, fb: 11 } },
  '30d': { label: '30 dias', volumeTitle: 'Volume por dia · últimos 30 dias', convos: 7320, resolvedPct: 71, avgSec: 2.8,
    bars: 30, barLabel: (i) => `${i + 1}`, barShown: (i) => i % 5 === 0, 
    delta: '↑ 7%', deltaTone: 'up', vs: 'vs mês anterior', topFactor: 4.2, channels: { wa: 63, ig: 25, fb: 12 } } };

const fmtMil = (n) => Math.round(n).toLocaleString('pt-BR');

function AdminDashboard() {
  const { tweaks, setRoute } = useStore();
  const empty = tweaks.dataState === 'empty';
  const [period, setPeriod] = React.useState('hoje');
  const [tip, setTip] = React.useState(null); // { x, y, title, rows }
  const [donutHover, setDonutHover] = React.useState(-1);

  const showTip = (e, title, rows) => setTip({ x: e.clientX, y: e.clientY, title, rows });
  const moveTip = (e) => setTip((t) => t ? { ...t, x: e.clientX, y: e.clientY } : t);
  const hideTip = () => setTip(null);

  if (empty) return <Page title="Dashboard" subtitle="Visão executiva do atendimento">
    <EmptyState icon="dashboard" title="Sem dados ainda" desc="Conecte o WhatsApp para começar a receber conversas e ver métricas aqui." action={<button className="btn btn-primary" onClick={() => setRoute('integrations')}>Conectar WhatsApp</button>} />
  </Page>;

  const M = AI_METRICS;
  const heavy = tweaks.dataState === 'heavy';
  const cfg = DASH_PERIODS[period];
  const heavyMul = heavy ? 11.6 : 1;

  // ---- Derived metrics ----
  const convos = Math.round(cfg.convos * heavyMul);
  const resolved = Math.round(convos * cfg.resolvedPct / 100);
  const transferred = convos - resolved;

  // ---- Volume series (deterministic) ----
  const series = React.useMemo(() => {
    const n = cfg.bars;
    const raw = Array.from({ length: n }, (_, i) => {
      const peak = period === 'hoje' ? (i > 9 && i < 19 ? 35 : 0) : 0;
      const base = 22 + Math.sin(i / (n / 7 + 1)) * 16 + Math.cos(i / 2.3) * 10 + peak + dashRand(i, 1) * 14;
      return Math.max(6, base);
    });
    const sum = raw.reduce((s, v) => s + v, 0);
    return raw.map((v, i) => {
      const total = Math.round(v / sum * convos);
      const ai = Math.round(total * (cfg.resolvedPct / 100) * (0.92 + dashRand(i, 2) * 0.16));
      return { i, total, ai: Math.min(ai, total), human: total - Math.min(ai, total), raw: v };
    });
  }, [period, convos, cfg.bars, cfg.resolvedPct]);
  const maxRaw = Math.max(...series.map((s) => s.raw));

  // ---- Channel split ----
  const channels = [
    { key: 'wa', l: 'WhatsApp', c: '#25d366', pct: cfg.channels.wa },
    { key: 'ig', l: 'Instagram', c: '#e4405f', pct: cfg.channels.ig },
    { key: 'fb', l: 'Facebook', c: '#1877f2', pct: cfg.channels.fb }].
    map((r) => ({ ...r, n: Math.round(convos * r.pct / 100) }));

  // ---- Top asked ----
  const topAsked = M.topAsked.map((q) => ({ ...q, count: Math.max(1, Math.round(q.count * cfg.topFactor * heavyMul)) }));
  const topMax = topAsked[0].count;
  const topTotal = topAsked.reduce((s, q) => s + q.count, 0);

  return (
    <Page title="Dashboard" subtitle="Visão executiva do atendimento — atualizado há 1 min" actions={
    <div className="row" style={{ gap: 6 }}>
        <select className="input" style={{ width: 150, height: 34 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="hoje">Hoje</option>
          <option value="7d">7 dias</option>
          <option value="30d">30 dias</option>
        </select>
      </div>
    }>
      <div className="stat-grid">
        <Stat label="Conversas no período" value={fmtMil(convos)} foot={<span style={{ color: 'var(--accent-700)' }}>{cfg.delta} {cfg.vs}</span>} icon="inbox" />
        <Stat label="Resolvidas pela IA" value={`${cfg.resolvedPct}%`} foot={`${fmtMil(resolved)} de ${fmtMil(convos)} conversas`} icon="sparkles" accent={{ bg: 'var(--ai-soft)', fg: 'var(--ai-strong)' }} />
        <Stat label="Tempo médio de resposta" value={`${cfg.avgSec.toString().replace('.', ',')}s`} foot="Meta: < 3s" icon="clock" />
        <Stat label="Transferidas para humano" value={fmtMil(transferred)} foot={`${Math.round(transferred / convos * 100)}% do volume`} icon="user" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--pad-3)' }}>
        <div className="card card-pad">
          <div className="row"><div className="h3">{cfg.volumeTitle}</div><div className="spacer" /><span className="badge badge-ai"><Ic name="sparkles" size={11} /> IA · {cfg.resolvedPct}%</span></div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: cfg.bars > 12 ? 3 : 6, height: 160, marginTop: 14, padding: '0 4px' }}>
            {series.map((s) => {
              const h = s.raw / maxRaw * 100;
              const aiPct = s.total ? s.ai / s.total * 100 : 0;
              return (
                <div key={s.i}
                  onMouseEnter={(e) => showTip(e, cfg.barLabel(s.i), [
                    { label: 'Total', value: fmtMil(s.total), color: 'var(--accent)' },
                    { label: 'Resolvidas pela IA', value: fmtMil(s.ai), color: 'var(--ai)' },
                    { label: 'Transferidas', value: fmtMil(s.human), color: 'var(--accent-soft)' }])}
                  onMouseMove={moveTip}
                  onMouseLeave={hideTip}
                  className="dash-bar-col"
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', position: 'relative', cursor: 'pointer' }}>
                  <div className="dash-bar" style={{ height: `${h}%`, background: 'var(--accent-soft)', borderTopLeftRadius: 3, borderTopRightRadius: 3, position: 'relative', transition: 'filter .15s' }}>
                    <div style={{ height: `${aiPct}%`, background: 'var(--ai)', borderTopLeftRadius: 3, borderTopRightRadius: 3, position: 'absolute', left: 0, right: 0, bottom: 0, opacity: .7 }} />
                  </div>
                  {cfg.barShown(s.i) && <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-faint)', marginTop: 4, whiteSpace: 'nowrap' }}>{cfg.barLabel(s.i)}</div>}
                </div>);
            })}
          </div>
          <div className="row" style={{ gap: 14, marginTop: 10, fontSize: 'var(--type-sm)', color: 'var(--text-muted)' }}>
            <span className="row" style={{ gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--ai)' }} />Resolvidas pela IA</span>
            <span className="row" style={{ gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent-soft)' }} />Transferidas / humano</span>
          </div>
        </div>

        <div className="card card-pad">
          <div className="h3">Conversas por canal</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 18, justifyContent: 'center' }}>
            <DonutChart
              data={channels.map((r) => ({ label: r.l, value: r.pct, color: r.c }))}
              activeIndex={donutHover}
              onHover={(idx, e) => { setDonutHover(idx); const r = channels[idx]; showTip(e, r.l, [{ label: 'Participação', value: `${r.pct}%`, color: r.c }, { label: 'Conversas', value: fmtMil(r.n), color: r.c }]); }}
              onMove={moveTip}
              onLeave={() => { setDonutHover(-1); hideTip(); }} />
            <div className="col" style={{ gap: 8 }}>
              {channels.map((r, idx) =>
              <div key={r.key} className="row dash-legend-row" style={{ gap: 10, fontSize: 'var(--type-sm)', cursor: 'pointer', opacity: donutHover === -1 || donutHover === idx ? 1 : .45, transition: 'opacity .15s' }}
                  onMouseEnter={(e) => { setDonutHover(idx); showTip(e, r.l, [{ label: 'Participação', value: `${r.pct}%`, color: r.c }, { label: 'Conversas', value: fmtMil(r.n), color: r.c }]); }}
                  onMouseMove={moveTip}
                  onMouseLeave={() => { setDonutHover(-1); hideTip(); }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: r.c }} />
                  <span style={{ minWidth: 80 }}>{r.l}</span>
                  <span style={{ color: 'var(--text-faint)' }}>{fmtMil(r.n)}</span>
                  <span style={{ fontWeight: 600 }}>{r.pct}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 'var(--pad-3)' }}>
        <div className="card card-pad">
          <div className="row"><div className="h3">Mais perguntados no período</div><div className="spacer" /><span className="badge badge-ai"><Ic name="sparkles" size={11} /> Insight da IA</span></div>
          <div className="col" style={{ marginTop: 12, gap: 6 }}>
            {topAsked.map((q, i) =>
              <div key={i} className="row dash-top-row" style={{ gap: 10, cursor: 'pointer', borderRadius: 8, padding: '3px 6px', margin: '0 -6px', transition: 'background .15s' }}
                onMouseEnter={(e) => showTip(e, q.q, [{ label: 'Perguntas', value: fmtMil(q.count), color: 'var(--accent)' }, { label: '% do total', value: `${Math.round(q.count / topTotal * 100)}%`, color: 'var(--accent)' }])}
                onMouseMove={moveTip}
                onMouseLeave={hideTip}>
                <span style={{ width: 18, color: 'var(--text-faint)', fontSize: 'var(--type-sm)', fontWeight: 600 }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 'var(--type-sm)' }}>{q.q}</span>
                <div style={{ width: 120 }} className="bar"><div style={{ width: `${q.count / topMax * 100}%` }} /></div>
                <span className="tnum" style={{ minWidth: 48, textAlign: 'right', fontSize: 'var(--type-sm)' }}>{fmtMil(q.count)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="card card-pad">
          <div className="h3">Últimas transferências</div>
          <div className="col" style={{ marginTop: 10, gap: 0 }}>
            {CONVERSATIONS.filter((c) => c.handler !== 'agent').slice(0, 4).map((c) =>
            <div key={c.id} className="row" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', gap: 10 }}>
                <Avatar name={c.client} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 'var(--type-sm)' }}>{c.client}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{c.preview}</div>
                </div>
                <ChannelIcon ch={c.channel} />
                <span className="muted" style={{ fontSize: 11 }}>{c.lastTime}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card card-pad">
        <div className="row"><div className="h3">Saúde do agente</div><div className="spacer" /><span className="badge badge-success">Tudo certo</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 'var(--pad-3)', marginTop: 12 }}>
          <KV label="Tokens no período" value={`${(M.tokensToday * heavyMul * cfg.topFactor / 1000).toFixed(1)}k`} foot={`R$ ${(M.tokensCost * heavyMul * cfg.topFactor).toFixed(2)}`} />
          <KV label="Mensagens processadas" value={fmtMil(convos)} foot="multimodal: texto, áudio, imagem" />
          <KV label="Falhas" value="0" foot="últimas 24h" ok />
          <KV label="Versão do prompt" value="v12" foot="atualizado há 3 dias" />
        </div>
      </div>

      {tip &&
        <div className="dash-tip" style={{ left: tip.x, top: tip.y }}>
          <div className="dash-tip-title">{tip.title}</div>
          {tip.rows.map((r, i) =>
            <div key={i} className="dash-tip-row">
              <span className="dash-tip-dot" style={{ background: r.color }} />
              <span className="dash-tip-l">{r.label}</span>
              <span className="dash-tip-v">{r.value}</span>
            </div>
          )}
        </div>
      }
    </Page>);

}

function KV({ label, value, foot, ok }) {
  return (
    <div>
      <div style={{ fontSize: 'var(--type-sm)', color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: 'var(--type-xl)', fontWeight: 600, letterSpacing: '-.01em', color: ok ? 'var(--accent-700)' : 'var(--text)' }}>{value}</div>
      {foot && <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{foot}</div>}
    </div>);

}

function DonutChart({ data, size = 140, thickness = 22, onHover, onMove, onLeave, activeIndex = -1 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const cx = size / 2,cy = size / 2;
  const C = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={thickness} />
      {data.map((d, i) => {
        const len = d.value / total * C;
        const active = i === activeIndex;
        const dim = activeIndex !== -1 && !active;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color}
            strokeWidth={active ? thickness + 6 : thickness}
            strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset}
            style={{ opacity: dim ? 0.4 : 1, cursor: 'pointer', transition: 'stroke-width .15s ease, opacity .15s ease' }}
            onMouseEnter={(e) => onHover && onHover(i, e)}
            onMouseMove={(e) => onMove && onMove(e)}
            onMouseLeave={() => onLeave && onLeave()} />
        );
        offset += len;
        return el;
      })}
    </svg>);

}

// AI Agents — list / hub
function AdminAgentList() {
  const { setRoute, tweaks } = useStore();
  const [showNew, setShowNew] = React.useState(false);
  const empty = tweaks.dataState === 'empty';
  const agents = empty ? [] : [
  { id: 'julia', name: 'Júlia', role: 'Atendimento geral', status: 'ativo', convos: 1284, resolved: 73, channels: ['whatsapp', 'instagram'], updated: 'há 3 dias', version: 'v12', tone: 'Amigável', desc: 'Tira dúvidas sobre serviços, agenda horários e qualifica leads.' },
  { id: 'fernando', name: 'Fernando', role: 'Pós-venda · suporte', status: 'ativo', convos: 312, resolved: 81, channels: ['whatsapp'], updated: 'há 8 dias', version: 'v4', tone: 'Formal', desc: 'Cuida de reclamações, garantia e acompanhamento de pedidos.' },
  { id: 'lara', name: 'Lara', role: 'Qualificação de leads', status: 'pausado', convos: 98, resolved: 64, channels: ['instagram', 'facebook'], updated: 'há 21 dias', version: 'v2', tone: 'Informal', desc: 'Recebe leads do Instagram, classifica e encaminha para o time.' },
  { id: 'rascunho', name: 'Beto', role: 'Cobrança (rascunho)', status: 'rascunho', convos: 0, resolved: 0, channels: [], updated: 'criado agora', version: '—', tone: 'Formal', desc: 'Em construção — ainda não conectado a nenhum canal.' }];


  const statusMap = {
    ativo: { label: 'Ativo', cls: 'badge-success' },
    pausado: { label: 'Pausado', cls: 'badge-neutral' },
    rascunho: { label: 'Rascunho', cls: 'badge-warning' }
  };

  return (
    <Page title="Agentes de IA" subtitle="Crie e gerencie os agentes que respondem em seus canais">
      {/* Summary strip */}
      {!empty &&
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--pad-3)' }}>
          <div className="card card-pad"><div className="muted" style={{ fontSize: 'var(--type-sm)' }}>Agentes ativos</div><div style={{ fontSize: 'var(--type-xl)', fontWeight: 600, marginTop: 4 }}>2<span className="muted" style={{ fontSize: 'var(--type-sm)', fontWeight: 400 }}> / 4</span></div></div>
          <div className="card card-pad"><div className="muted" style={{ fontSize: 'var(--type-sm)' }}>Conversas (7d)</div><div style={{ fontSize: 'var(--type-xl)', fontWeight: 600, marginTop: 4 }}>1.694</div></div>
          <div className="card card-pad"><div className="muted" style={{ fontSize: 'var(--type-sm)' }}>Resolução média</div><div style={{ fontSize: 'var(--type-xl)', fontWeight: 600, marginTop: 4, color: 'var(--accent-700)' }}>72,6%</div></div>
          <div className="card card-pad"><div className="muted" style={{ fontSize: 'var(--type-sm)' }}>Tokens hoje</div><div style={{ fontSize: 'var(--type-xl)', fontWeight: 600, marginTop: 4 }}>184,2k<span className="muted" style={{ fontSize: 'var(--type-sm)', fontWeight: 400 }}> · R$ 3,21</span></div></div>
        </div>
      }

      {empty ?
      <EmptyState icon="sparkles" title="Nenhum agente configurado" desc="Crie seu primeiro agente para começar a atender automaticamente em todos os canais."
      action={<button className="btn btn-primary" onClick={() => setShowNew(true)}><Ic name="plus" size={14} /> Configurar novo agente</button>} /> :

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--pad-3)' }}>
          {/* Create new card — always first */}
          <div
          className="card card-new-agent"
          onClick={() => setShowNew(true)}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
            e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
          }}>
          
            <div className="na-icon"><Ic name="plus" size={22} /></div>
            <div className="na-title">Configurar novo agente</div>
            <div className="na-desc muted">Comece do zero ou use um modelo pronto (vendas, suporte, agendamento).</div>
          </div>
          {agents.map((a) => {
          const st = statusMap[a.status];
          const initials = a.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
          return (
            <div key={a.id} className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'transform .12s, box-shadow .12s' }}
            onClick={() => setRoute('agent-config', a.id)}
            onMouseEnter={(e) => {e.currentTarget.style.transform = 'translateY(-2px)';e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,.06)';}}
            onMouseLeave={(e) => {e.currentTarget.style.transform = '';e.currentTarget.style.boxShadow = '';}}>
                <div style={{ padding: 'var(--pad-3)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, var(--ai), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                      <div style={{ fontWeight: 600, fontSize: 'var(--type-md)' }}>{a.name}</div>
                      <span className={`badge ${st.cls}`}>{a.status === 'ativo' && <span className="dot dot-online" style={{ boxShadow: 'none' }} />}{st.label}</span>
                    </div>
                    <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>{a.role}</div>
                  </div>
                  <button className="btn btn-ghost btn-icon" onClick={(e) => {e.stopPropagation();}} title="Mais opções"><Ic name="more" size={16} /></button>
                </div>

                <div style={{ padding: '0 var(--pad-3) 12px', fontSize: 'var(--type-sm)', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                  {a.desc}
                </div>

                <div style={{ padding: '0 var(--pad-3) 12px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className="chip" style={{ cursor: 'default' }}>{a.tone}</span>
                  {a.channels.length === 0 ?
                <span className="chip" style={{ cursor: 'default', color: 'var(--text-faint)' }}>Sem canais</span> :
                a.channels.map((ch) =>
                <span key={ch} className="chip" style={{ cursor: 'default', textTransform: 'capitalize' }}><Ic name={ch} size={11} /> {ch}</span>
                )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                  <div style={{ padding: '10px 12px', borderRight: '1px solid var(--border)' }}>
                    <div className="muted" style={{ fontSize: 11 }}>Conversas (7d)</div>
                    <div className="tnum" style={{ fontWeight: 600, fontSize: 'var(--type-sm)' }}>{a.convos.toLocaleString('pt-BR')}</div>
                  </div>
                  <div style={{ padding: '10px 12px', borderRight: '1px solid var(--border)' }}>
                    <div className="muted" style={{ fontSize: 11 }}>Resolução</div>
                    <div className="tnum" style={{ fontWeight: 600, fontSize: 'var(--type-sm)', color: a.resolved >= 70 ? 'var(--accent-700)' : 'var(--text)' }}>{a.resolved ? `${a.resolved}%` : '—'}</div>
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <div className="muted" style={{ fontSize: 11 }}>Versão</div>
                    <div className="tnum" style={{ fontWeight: 600, fontSize: 'var(--type-sm)' }}>{a.version}</div>
                  </div>
                </div>

                <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="muted" style={{ fontSize: 11 }}>Atualizado {a.updated}</span>
                  <div className="spacer" />
                  <span style={{ fontSize: 'var(--type-sm)', color: 'var(--accent)', fontWeight: 500 }}>Abrir <Ic name="arrow-right" size={12} /></span>
                </div>
              </div>);

        })}
        </div>
      }
      {showNew && <NewAgentDrawer onClose={() => setShowNew(false)} />}
    </Page>);

}

// AI Agent configuration — moved to agent-config.jsx
// (Original implementation kept below for reference/fallback — not registered.)
function _AdminAgent_legacy() {
  const { setRoute, routeParam } = useStore();
  const isNew = routeParam === 'new';
  const agentName = isNew ? 'Novo agente' :
  routeParam === 'fernando' ? 'Fernando' :
  routeParam === 'lara' ? 'Lara' :
  routeParam === 'rascunho' ? 'Beto' :
  'Júlia';

  const [tone, setTone] = React.useState('amigavel');
  const [active, setActive] = React.useState(!isNew);
  const [showTest, setShowTest] = React.useState(false);
  return (
    <Page title={isNew ? 'Configurar novo agente' : `Agente · ${agentName}`} subtitle="Personalize o comportamento, voz e regras do agente" actions={
    <button className="btn fin-btn-back" onClick={() => setRoute('agent')}><Ic name="arrow-left" size={14} /> Voltar para agentes</button>
    }>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 'var(--pad-3)', alignItems: 'flex-start' }}>
        <div className="col" style={{ gap: 'var(--pad-3)' }}>
          <div className="card card-pad">
            <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, var(--ai), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <Ic name="sparkles" size={28} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="label">Nome do agente</label>
                <input className="input" defaultValue={isNew ? '' : agentName} placeholder="Ex: Júlia" />
              </div>
              <div style={{ minWidth: 170 }}>
                <label className="label">Status</label>
                <Toggle on={active} onChange={setActive} label={active ? 'Ativo' : 'Desativado'} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--pad-3)', marginTop: 14 }}>
              <div><label className="label">Tom de voz</label>
                <div className="row" style={{ gap: 6 }}>
                  {[['formal', 'Formal'], ['amigavel', 'Amigável'], ['informal', 'Informal']].map(([id, l]) =>
                  <div key={id} onClick={() => setTone(id)} style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border-strong)', borderRadius: 8, cursor: 'default', textAlign: 'center', fontSize: 'var(--type-sm)', background: tone === id ? 'var(--accent-soft)' : 'var(--surface)', borderColor: tone === id ? 'var(--accent)' : 'var(--border-strong)', fontWeight: tone === id ? 600 : 500, color: tone === id ? 'var(--accent-700)' : 'var(--text)' }}>{l}</div>
                  )}
                </div>
              </div>
              <div><label className="label">Idioma principal</label>
                <select className="input"><option>Português (BR)</option><option>Espanhol</option><option>Inglês</option></select>
              </div>
            </div>
          </div>

          <div className="card card-pad">
            <div className="h3">Mensagens automáticas</div>
            <div style={{ marginTop: 10 }}>
              <label className="label">Mensagem de boas-vindas</label>
              <textarea className="input" defaultValue="Oi! Eu sou a Júlia, assistente da Iguabela Beleza ✨ Em que posso te ajudar hoje?" rows={2} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label className="label">Fora do horário (use {'{horario_abertura}'})</label>
              <textarea className="input" defaultValue="Olá! Estamos fora do horário no momento. Voltamos a atender {horario_abertura}. Pode deixar sua dúvida que eu retomo na abertura!" rows={2} />
            </div>
          </div>

          <div className="card card-pad">
            <div className="h3">Horário de funcionamento</div>
            <div className="col" style={{ marginTop: 10, gap: 6 }}>
              {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map((d, i) =>
              <div key={d} className="row" style={{ gap: 12, padding: '6px 0' }}>
                  <Toggle on={i < 6} compact />
                  <span style={{ width: 90, fontSize: 'var(--type-sm)' }}>{d}</span>
                  <span className="muted" style={{ fontSize: 'var(--type-sm)' }}>{i === 6 ? 'Fechado' : i === 5 ? '08:00 — 14:00' : '08:00 — 19:00'}</span>
                </div>
              )}
            </div>
          </div>

          <div className="card card-pad">
            <div className="h3">Tópicos vetados</div>
            <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>O agente NUNCA fala sobre estes tópicos.</div>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {['política', 'religião', 'concorrentes', 'preços de outras lojas'].map((t) =>
              <span key={t} className="chip">{t} <Ic name="x" size={11} /></span>
              )}
              <span className="chip" style={{ cursor: 'default' }}><Ic name="plus" size={11} /> adicionar</span>
            </div>
          </div>
        </div>

        <div className="col" style={{ gap: 'var(--pad-3)', position: 'sticky', top: 0 }}>
          <div className="card card-pad" style={{ background: 'linear-gradient(135deg, color-mix(in oklab, var(--ai) 8%, var(--surface)), var(--surface))', borderColor: 'color-mix(in oklab, var(--ai) 25%, var(--border))' }}>
            <div className="row"><span className="ai-grad" style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase' }}>Powered by Claude</span><div className="spacer" /><Ic name="sparkles" size={16} style={{ color: 'var(--ai)' }} /></div>
            <div style={{ fontSize: 'var(--type-md)', fontWeight: 600, marginTop: 8 }}>Multimodal · texto, áudio e imagem</div>
            <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>O agente lê PDFs, transcreve áudios pelo Whisper e analisa fotos enviadas pelo cliente.</div>
            <button className="btn btn-primary" style={{ marginTop: 12, width: '100%', background: 'var(--ai)', borderColor: 'var(--ai)' }} onClick={() => setShowTest(true)}><Ic name="play" size={14} /> Testar agente</button>
          </div>

          <div className="card card-pad">
            <div className="h3">Versões salvas</div>
            <div className="col" style={{ marginTop: 10, gap: 6 }}>
              {[
              ['v12', 'Há 3 dias', 'Paulo Henrique', 'atual'],
              ['v11', 'Há 12 dias', 'Paulo Henrique'],
              ['v10', 'Há 28 dias', 'Karla Zambelly'],
              ['v9', 'Há 45 dias', 'Paulo Henrique']].
              map(([v, t, a, c], i) =>
              <div key={i} className="row" style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 'var(--type-sm)' }}>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                  <span className="muted">{t} · {a}</span>
                  <div className="spacer" />
                  {c === 'atual' ? <span className="badge badge-success">atual</span> : <span className="muted" style={{ fontSize: 11, cursor: 'default' }}>reverter</span>}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn fin-btn-back" style={{ flex: 1 }}>Voltar</button>
            <button className="btn btn-primary" style={{ flex: 1 }}>Salvar e publicar</button>
          </div>
        </div>
      </div>

      {showTest && <AgentTester onClose={() => setShowTest(false)} />}
    </Page>);

}

function AgentTester({ onClose, greeting, agentName }) {
  const initialGreeting = greeting || `Oi! Eu sou a ${agentName || 'Júlia'}, assistente da Iguabela Beleza ✨ Em que posso te ajudar hoje?`;
  const [msgs, setMsgs] = React.useState([
  { from: 'agent', text: initialGreeting }]
  );
  const [input, setInput] = React.useState('');
  const send = () => {
    if (!input.trim()) return;
    setMsgs((m) => [...m, { from: 'client', text: input }]);
    setInput('');
    setTimeout(() => {
      setMsgs((m) => [...m, { from: 'agent', text: 'Claro! Posso te dar mais detalhes. Você quer saber sobre os pacotes ou os procedimentos avulsos?' }]);
    }, 700);
  };
  return (
    <Modal title="Simulador do agente" onClose={onClose} size="md" footer={<><div className="muted" style={{ fontSize: 'var(--type-sm)', flex: 1 }}>Não consome tokens de produção.</div><button className="btn" onClick={onClose}>Fechar</button></>}>
      <div className="col" style={{ gap: 8, minHeight: 380, maxHeight: 500 }}>
        <div className="scroll" style={{ flex: 1, padding: '8px 4px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {msgs.map((m, i) =>
          <div key={i} style={{ alignSelf: m.from === 'client' ? 'flex-end' : 'flex-start', maxWidth: '80%', padding: '8px 12px', borderRadius: 12, background: m.from === 'client' ? 'var(--accent-soft)' : 'var(--surface-3)', fontSize: 'var(--type-sm)' }}>
              {m.text}
            </div>
          )}
        </div>
        <div className="row" style={{ gap: 6 }}>
          <input className="input" placeholder="Digite como cliente..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
          <button className="btn btn-primary" onClick={send}><Ic name="send" size={14} /></button>
        </div>
      </div>
    </Modal>);

}

function Toggle({ on, onChange, label, compact }) {
  const [v, setV] = React.useState(on ?? false);
  React.useEffect(() => setV(on), [on]);
  const toggle = () => {const nv = !v;setV(nv);onChange?.(nv);};
  return (
    <div className="row" style={{ gap: 8, cursor: 'default' }} onClick={toggle}>
      <div style={{ width: compact ? 32 : 40, height: compact ? 18 : 22, borderRadius: 999, background: v ? 'var(--accent)' : 'var(--surface-3)', position: 'relative', transition: 'background .15s' }}>
        <div style={{ position: 'absolute', top: 2, left: v ? compact ? 16 : 20 : 2, width: compact ? 14 : 18, height: compact ? 14 : 18, borderRadius: '50%', background: 'white', transition: 'left .15s', boxShadow: '0 1px 2px rgba(0,0,0,.2)' }} />
      </div>
      {label && <span style={{ fontSize: 'var(--type-sm)', fontWeight: 500 }}>{label}</span>}
    </div>);

}

// Catalog
function AdminCatalog() {
  if (window.CatalogPage) return React.createElement(window.CatalogPage);
  const [q, setQ] = React.useState('');
  const [drawer, setDrawer] = React.useState(null); // null | {} (new) | item (edit)
  const [extra, setExtra] = React.useState([]);
  const all = [...extra, ...CATALOG];
  const items = all.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  const handleSave = (item) => {
    setExtra((s) => [{ ...item, _new: true, stock: item.stock > 0 ? 'Disponível' : item.kind === 'servico' ? 'Disponível' : 'Indisponível' }, ...s]);
    setDrawer(null);
  };
  return (
    <Page title="Catálogo" subtitle="Base de conhecimento que o agente usa nas conversas" actions={
    <button className="fin-new-btn" onClick={() => setDrawer({})} aria-label="Novo item"><span className="fin-new-label">{'Novo item\u00A0'}</span><span className="fin-new-plus" style={{ width: "38px", height: "38px" }}><Ic name="plus" size={18} /></span></button>
    }>
      <div className="row" style={{ gap: 8 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
          <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }}><Ic name="search" size={15} /></span>
          <input className="input" placeholder="Buscar produto ou serviço" style={{ paddingLeft: 40 }} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input" style={{ width: 160 }}><option>Todas categorias</option><option>Pacote</option><option>Procedimento</option></select>
        <div className="spacer" />
        <button className="btn"><Ic name="file" size={14} /> Importar CSV</button>
        <button className="btn"><Ic name="link" size={14} /> Sincronizar API</button>
      </div>
      <div className="card">
        <table className="table">
          <thead><tr><th>Item</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th></th></tr></thead>
          <tbody>
            {items.map((c, i) =>
            <tr key={i}>
                <td><div style={{ fontWeight: 600 }}>{c.name}</div><div className="muted" style={{ fontSize: 'var(--type-sm)' }}>{c.desc}</div></td>
                <td><span className="chip">{c.cat}</span></td>
                <td className="tnum">{c.price}</td>
                <td>{c.stock === 'Disponível' ? <span className="badge badge-success">{c.stock}</span> : <span className="badge badge-danger">{c.stock}</span>}</td>
                <td style={{ textAlign: 'right' }}><span className="btn btn-ghost btn-icon" onClick={() => setDrawer(c)}><Ic name="edit" size={14} /></span></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {drawer && <CatalogItemDrawer initial={drawer.name ? drawer : null} onClose={() => setDrawer(null)} onSave={handleSave} />}
    </Page>);

}

// Integrations
function AdminIntegrations() {
  const cards = [
  { name: 'WhatsApp Business', icon: 'whatsapp', color: '#25d366', status: 'conectado', detail: '+55 85 9 9999-9999 · 360dialog', last: 'última msg há 12s' },
  { name: 'Instagram Direct', icon: 'instagram', color: '#e4405f', status: 'conectado', detail: '@iguabelaoficial', last: 'última msg há 4 min' },
  { name: 'Facebook Messenger', icon: 'facebook', color: '#1877f2', status: 'desconectado', detail: 'Não configurado', last: '' },
  { name: 'API do sistema', icon: 'database', color: '#1f2937', status: 'conectado', detail: 'sistemainterno.com/api · Sync ok', last: 'última sync 11 min' },
  { name: 'Google Calendar', icon: 'agenda', color: '#4285f4', status: 'conectado', detail: 'paulo@iguabela.com · Calendário "Atendimentos"', last: 'sync ativo' }];

  return (
    <Page title="Integrações" subtitle="Canais de mensagens e sistemas externos">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--pad-3)' }}>
        {cards.map((c) =>
        <div key={c.name} className="card card-pad">
            <div className="row" style={{ gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: `color-mix(in oklab, ${c.color} 12%, var(--surface))`, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ic name={c.icon} size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{c.name}</div>
                <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>{c.detail}</div>
              </div>
              {c.status === 'conectado' ? <span className="badge badge-success"><span className="dot dot-online" style={{ boxShadow: 'none' }} /> Conectado</span> : <span className="badge badge-neutral">Desconectado</span>}
            </div>
            <div className="muted" style={{ fontSize: 'var(--type-xs)', marginTop: 10 }}>{c.last}</div>
            <div className="row" style={{ marginTop: 12, gap: 6 }}>
              <button className="btn btn-sm" style={{ flex: 1 }}>{c.status === 'conectado' ? 'Configurar' : 'Conectar'}</button>
              {c.status === 'conectado' && <button className="btn btn-sm btn-danger">Desconectar</button>}
            </div>
          </div>
        )}
      </div>
    </Page>);

}

// Team
function NewMemberModal({ onClose }) {
  return null; /* deprecated: replaced by MemberModal */
  // eslint-disable-next-line
  const [tab, setTab] = React.useState('dados');
  const [color, setColor] = React.useState('#6366f1');
  const tabs = [];
  return (
    <Modal title="" size="lg" onClose={onClose} footer={null}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '4px 0 14px', borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
        <div style={{ position: 'relative', width: 64, height: 64, borderRadius: '50%', background: color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 24, flexShrink: 0 }}>
          NM
          <button className="btn btn-icon btn-sm" style={{ position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, padding: 0, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border-strong)' }}><Ic name="camera" size={12} /></button>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 'var(--type-md)' }}>Novo membro</div>
          <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>Preencha as informações abaixo. Campos com * são obrigatórios.</div>
        </div>
      </div>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: 18, marginBottom: 16, marginTop: -4, padding: '0 2px' }}>
        {tabs.map((t) =>
        <div key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 0 10px', fontSize: 'var(--type-sm)', fontWeight: tab === t.id ? 600 : 500, color: tab === t.id ? 'var(--text)' : 'var(--text-muted)', borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: -1, cursor: 'default' }}>
            <Ic name={t.icon} size={14} />{t.label}
          </div>
        )}
      </div>
      {tab === 'dados' &&
      <div className="col" style={{ gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="label">Nome completo *</label><input className="input" placeholder="Ex: Mariana Sousa" /></div>
            <div><label className="label">Como prefere ser chamada(o)</label><input className="input" placeholder="Ex: Mari" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="label">CPF *</label><CpfInput /></div>
            <div><label className="label">Data de nascimento</label><DateInput /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="label">E-mail *</label><EmailInput placeholder="nome@iguabela.com" /></div>
            <div><label className="label">Telefone / WhatsApp *</label><PhoneInput /></div>
          </div>
          <div><label className="label">Endereço</label><input className="input" placeholder="Rua, número, bairro, cidade/UF" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="label">Cor de identificação</label><div className="row" style={{ gap: 6 }}>{['#6366f1', '#16a34a', '#f59e0b', '#ec4899', '#0ea5e9', '#a855f7'].map((c) => <span key={c} onClick={() => setColor(c)} style={{ width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'default', border: c === color ? '3px solid var(--text)' : '3px solid transparent', transition: 'border .15s' }} />)}</div></div>
            <div><label className="label">Foto de perfil</label><button className="btn" style={{ width: '100%' }}><Ic name="upload" size={13} /> Carregar foto</button></div>
          </div>
        </div>
      }
      {tab === 'acesso' &&
      <div className="col" style={{ gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="label">Cargo *</label><input className="input" placeholder="Ex: Atendente sênior" /></div>
            <div><label className="label">Departamento</label><select className="input"><option>Comercial</option><option>Atendimento</option><option>Administrativo</option><option>Marketing</option></select></div>
          </div>
          <div><label className="label">Perfil de acesso *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {[['admin', 'Administrador', 'Acesso total'], ['atendente', 'Atendente', 'Mensagens, agenda, CRM'], ['vis', 'Visualização', 'Apenas leitura']].map(([id, l, d], i) =>
            <label key={id} className="card" style={{ padding: 10, cursor: 'default', borderColor: i === 1 ? 'var(--accent)' : 'var(--border)', background: i === 1 ? 'var(--accent-soft)' : 'var(--surface)' }}>
                  <div className="row" style={{ gap: 6 }}><input type="radio" name="perfil" defaultChecked={i === 1} /><span style={{ fontWeight: 600, fontSize: 'var(--type-sm)' }}>{l}</span></div>
                  <div className="muted" style={{ fontSize: 'var(--type-xs)', marginTop: 4 }}>{d}</div>
                </label>
            )}
            </div>
          </div>
          <div><label className="label">Permissões específicas</label>
            <div className="col" style={{ gap: 6, padding: 10, border: '1px solid var(--border)', borderRadius: 8 }}>
              {['Pode editar agente IA', 'Pode exportar relatórios', 'Pode ver todas as conversas', 'Pode aprovar descontos', 'Acesso ao Financeiro'].map((p, i) =>
            <label key={i} className="row" style={{ gap: 8, fontSize: 'var(--type-sm)' }}><input type="checkbox" defaultChecked={i < 2} />{p}</label>
            )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="label">Horário de trabalho</label><input className="input" placeholder="Ex: Seg-Sex 09h–18h" /></div>
            <div><label className="label">Status inicial</label><select className="input"><option>Ativo</option><option>Em treinamento</option><option>Inativo</option></select></div>
          </div>
        </div>
      }
      {tab === 'metas' &&
      <div className="col" style={{ gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="label">Meta mensal de vendas (R$)</label><input className="input" type="number" placeholder="40000" /></div>
            <div><label className="label">Meta de atendimentos / mês</label><input className="input" type="number" placeholder="200" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="label">Meta de conversões (%)</label><input className="input" type="number" placeholder="35" /></div>
            <div><label className="label">Tempo médio de resposta (min)</label><input className="input" type="number" placeholder="5" /></div>
          </div>
          <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8 }}>
            <div style={{ fontSize: 'var(--type-sm)', fontWeight: 600, marginBottom: 8 }}>Comissão</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div><label className="label">Tipo</label><select className="input"><option>% sobre vendas</option><option>Valor fixo</option><option>Escalonada</option></select></div>
              <div><label className="label">Percentual base</label><input className="input" placeholder="5%" /></div>
              <div><label className="label">Bônus por meta</label><input className="input" placeholder="R$ 500" /></div>
            </div>
          </div>
          <div><label className="label">Salário fixo (R$)</label><input className="input" type="number" placeholder="2500" /></div>
        </div>
      }
      {tab === 'extra' &&
      <div className="col" style={{ gap: 12 }}>
          <div><label className="label">Funis atribuídos</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['Pré-Venda', 'Pós-Venda', 'Recuperação', 'Indicações'].map((f) =>
            <label key={f} className="row" style={{ gap: 6, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 14, fontSize: 'var(--type-sm)', cursor: 'default' }}><input type="checkbox" />{f}</label>
            )}
            </div>
          </div>
          <div><label className="label">Canais de atendimento</label>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {[['whatsapp', 'WhatsApp'], ['instagram', 'Instagram'], ['facebook', 'Facebook']].map(([ic, l]) =>
            <label key={ic} className="row" style={{ gap: 6, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 14, fontSize: 'var(--type-sm)', cursor: 'default' }}><input type="checkbox" defaultChecked /><Ic name={ic} size={13} />{l}</label>
            )}
            </div>
          </div>
          <div><label className="label">Observações internas</label><textarea className="input" rows={3} placeholder="Notas visíveis apenas para administradores..." /></div>
          <label className="row" style={{ gap: 8, fontSize: 'var(--type-sm)' }}><input type="checkbox" defaultChecked />Enviar e-mail de boas-vindas com credenciais</label>
          <label className="row" style={{ gap: 8, fontSize: 'var(--type-sm)' }}><input type="checkbox" defaultChecked />Forçar troca de senha no primeiro acesso</label>
          <label className="row" style={{ gap: 8, fontSize: 'var(--type-sm)' }}><input type="checkbox" />Habilitar autenticação em dois fatores</label>
        </div>
      }
    </Modal>);

}

function MemberModal({ initial, onClose, onSave, onDelete }) {
  const isEdit = !!initial;
  const blank = { name: '', nickname: '', cpf: '', birth: '', email: '', phone: '', address: '', color: '#6366f1', role: '', dept: 'Comercial', perfil: 'atendente', schedule: 'Seg-Sex 09h–18h', status: 'ativo', meta: 40000, metaAtend: 200, conv: 35, tmr: 5, commType: '% sobre vendas', commPct: '5%', commBonus: 'R$ 500', salary: 2500, perms: ['edit_ai', 'export_reports'], funnels: ['Pré-Venda'], channels: ['whatsapp', 'instagram'], notes: '', welcome: true, forcePwd: true, mfa: false, vendido: 0 };
  const [f, setF] = React.useState(() => initial ? { ...blank, ...initial } : blank);
  const [tab, setTab] = React.useState('dados');
  const [confirmDel, setConfirmDel] = React.useState(false);
  const [delClosing, setDelClosing] = React.useState(false);
  const modalClose = React.useRef(null);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggle = (k, val) => setF((p) => ({ ...p, [k]: p[k].includes(val) ? p[k].filter((x) => x !== val) : [...p[k], val] }));
  const tabs = [
  { id: 'dados', label: 'Dados pessoais', icon: 'user' },
  { id: 'acesso', label: 'Acesso & Perfil', icon: 'shield' },
  { id: 'metas', label: 'Metas & Comissão', icon: 'reports' },
  { id: 'extra', label: 'Adicional', icon: 'settings' }];

  const handleSave = () => {
    const member = {
      ...f,
      id: f.id || 'm' + Date.now().toString(36),
      meta: Number(f.meta) || 0,
      vendido: Number(f.vendido) || 0
    };
    if (!member.name) {setTab('dados');return;}
    onSave(member);
  };
  const initials = (n) => n.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase() || 'NM';
  return (
    <Modal
      title={isEdit ? `Editar membro · ${initial.name}` : 'Cadastrar novo membro da equipe'}
      size="lg"
      onClose={onClose}
      footer={(close) => {
        modalClose.current = close;
        return <>
        {isEdit && <button className="btn btn-delete-soft" onClick={() => setConfirmDel(true)}><Ic name="trash" size={13} /> Excluir</button>}
        <div style={{ flex: 1 }} />
        <button className="btn fin-btn-back" onClick={() => close()}>Voltar</button>
        {!isEdit && <button className="btn" onClick={() => close(handleSave)}><Ic name="mail" size={13} /> Salvar e enviar convite</button>}
        <button className="btn btn-save" onClick={() => close(handleSave)}><Ic name="check" size={13} /> {isEdit ? 'Salvar alterações' : 'Salvar membro'}</button>
      </>;
      }}>
      
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '4px 0 14px', borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
        <div style={{ position: 'relative', width: 64, height: 64, borderRadius: '50%', background: f.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 24, flexShrink: 0 }}>
          {initials(f.name)}
          <button className="btn btn-icon btn-sm" style={{ position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, padding: 0, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border-strong)' }}><Ic name="camera" size={12} /></button>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 'var(--type-md)' }}>{f.name || 'Novo membro'}</div>
          <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>{isEdit ? `${f.role || '—'} · ${f.email || ''}` : 'Preencha as informações abaixo. Campos com * são obrigatórios.'}</div>
        </div>
        {isEdit && <span className={`badge ${f.status === 'ativo' ? 'badge-success' : 'badge-neutral'}`}>{f.status}</span>}
      </div>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: 18, marginBottom: 16, padding: '0 2px' }}>
        {tabs.map((t) =>
        <div key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 0', fontSize: 'var(--type-sm)', fontWeight: tab === t.id ? 600 : 500, color: tab === t.id ? 'var(--text)' : 'var(--text-muted)', borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: -1, cursor: 'default' }}>
            <Ic name={t.icon} size={14} />{t.label}
          </div>
        )}
      </div>
      {tab === 'dados' &&
      <div className="col" style={{ gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="label">Nome completo *</label><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex: Mariana Sousa" /></div>
            <div><label className="label">Como prefere ser chamada(o)</label><input className="input" value={f.nickname} onChange={(e) => set('nickname', e.target.value)} placeholder="Ex: Mari" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="label">CPF *</label><CpfInput value={f.cpf} onChange={(v) => set('cpf', v)} /></div>
            <div><label className="label">Data de nascimento</label><DateInput value={f.birth} onChange={(v) => set('birth', v)} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="label">E-mail *</label><EmailInput value={f.email} onChange={(v) => set('email', v)} placeholder="nome@iguabela.com" /></div>
            <div><label className="label">Telefone / WhatsApp *</label><PhoneInput value={f.phone} onChange={(v) => set('phone', v)} /></div>
          </div>
          <div><label className="label">Endereço</label><input className="input" value={f.address} onChange={(e) => set('address', e.target.value)} placeholder="Rua, número, bairro, cidade/UF" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="label">Cor de identificação</label><div className="row" style={{ gap: 6 }}>{['#6366f1', '#16a34a', '#f59e0b', '#ec4899', '#0ea5e9', '#a855f7'].map((c) => <span key={c} onClick={() => set('color', c)} style={{ width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'default', border: c === f.color ? '3px solid var(--text)' : '3px solid transparent', transition: 'border .15s' }} />)}</div></div>
            <div><label className="label">Foto de perfil</label><button className="btn" style={{ width: '100%' }}><Ic name="upload" size={13} /> Carregar foto</button></div>
          </div>
        </div>
      }
      {tab === 'acesso' &&
      <div className="col" style={{ gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="label">Cargo *</label><input className="input" value={f.role} onChange={(e) => set('role', e.target.value)} placeholder="Ex: Atendente sênior" /></div>
            <div><label className="label">Departamento</label><select className="input" value={f.dept} onChange={(e) => set('dept', e.target.value)}><option>Comercial</option><option>Atendimento</option><option>Administrativo</option><option>Marketing</option></select></div>
          </div>
          <div><label className="label">Perfil de acesso *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {[['admin', 'Administrador', 'Acesso total'], ['atendente', 'Atendente', 'Mensagens, agenda, CRM'], ['vis', 'Visualização', 'Apenas leitura']].map(([id, l, d]) => {
              const on = f.perfil === id;
              return (
                <label key={id} onClick={() => set('perfil', id)} className="card" style={{ padding: 10, cursor: 'default', borderColor: on ? 'var(--accent)' : 'var(--border)', background: on ? 'var(--accent-soft)' : 'var(--surface)' }}>
                    <div className="row" style={{ gap: 6 }}><input type="radio" name="perfil" checked={on} onChange={() => set('perfil', id)} /><span style={{ fontWeight: 600, fontSize: 'var(--type-sm)' }}>{l}</span></div>
                    <div className="muted" style={{ fontSize: 'var(--type-xs)', marginTop: 4 }}>{d}</div>
                  </label>);

            })}
            </div>
          </div>
          <div><label className="label">Permissões específicas</label>
            <div className="col" style={{ gap: 6, padding: 10, border: '1px solid var(--border)', borderRadius: 8 }}>
              {[['edit_ai', 'Pode editar agente IA'], ['export_reports', 'Pode exportar relatórios'], ['see_all', 'Pode ver todas as conversas'], ['approve_disc', 'Pode aprovar descontos'], ['finance', 'Acesso ao Financeiro']].map(([id, label]) =>
            <label key={id} className="row" style={{ gap: 8, fontSize: 'var(--type-sm)' }}><input type="checkbox" checked={f.perms.includes(id)} onChange={() => toggle('perms', id)} />{label}</label>
            )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="label">Horário de trabalho</label><input className="input" value={f.schedule} onChange={(e) => set('schedule', e.target.value)} /></div>
            <div><label className="label">Status</label><select className="input" value={f.status} onChange={(e) => set('status', e.target.value)}><option value="ativo">Ativo</option><option value="treinamento">Em treinamento</option><option value="inativo">Inativo</option></select></div>
          </div>
        </div>
      }
      {tab === 'metas' &&
      <div className="col" style={{ gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="label">Meta mensal de vendas (R$)</label><input className="input" type="number" value={f.meta} onChange={(e) => set('meta', e.target.value)} /></div>
            <div><label className="label">Meta de atendimentos / mês</label><input className="input" type="number" value={f.metaAtend} onChange={(e) => set('metaAtend', e.target.value)} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="label">Meta de conversões (%)</label><input className="input" type="number" value={f.conv} onChange={(e) => set('conv', e.target.value)} /></div>
            <div><label className="label">Tempo médio de resposta (min)</label><input className="input" type="number" value={f.tmr} onChange={(e) => set('tmr', e.target.value)} /></div>
          </div>
          <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8 }}>
            <div style={{ fontSize: 'var(--type-sm)', fontWeight: 600, marginBottom: 8 }}>Comissão</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div><label className="label">Tipo</label><select className="input" value={f.commType} onChange={(e) => set('commType', e.target.value)}><option>% sobre vendas</option><option>Valor fixo</option><option>Escalonada</option></select></div>
              <div><label className="label">Percentual base</label><input className="input" value={f.commPct} onChange={(e) => set('commPct', e.target.value)} /></div>
              <div><label className="label">Bônus por meta</label><input className="input" value={f.commBonus} onChange={(e) => set('commBonus', e.target.value)} /></div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="label">Salário fixo (R$)</label><input className="input" type="number" value={f.salary} onChange={(e) => set('salary', e.target.value)} /></div>
            {isEdit && <div><label className="label">Vendas realizadas no mês (R$)</label><input className="input" type="number" value={f.vendido} onChange={(e) => set('vendido', e.target.value)} /></div>}
          </div>
        </div>
      }
      {tab === 'extra' &&
      <div className="col" style={{ gap: 12 }}>
          <div><label className="label">Funis atribuídos</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['Pré-Venda', 'Pós-Venda', 'Recuperação', 'Indicações'].map((fn) =>
            <label key={fn} className="row" style={{ gap: 6, padding: '6px 10px', border: `1px solid ${f.funnels.includes(fn) ? 'var(--accent)' : 'var(--border)'}`, background: f.funnels.includes(fn) ? 'var(--accent-soft)' : 'transparent', borderRadius: 14, fontSize: 'var(--type-sm)', cursor: 'default' }}><input type="checkbox" checked={f.funnels.includes(fn)} onChange={() => toggle('funnels', fn)} />{fn}</label>
            )}
            </div>
          </div>
          <div><label className="label">Canais de atendimento</label>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {[['whatsapp', 'WhatsApp'], ['instagram', 'Instagram'], ['facebook', 'Facebook']].map(([ic, l]) =>
            <label key={ic} className="row" style={{ gap: 6, padding: '6px 10px', border: `1px solid ${f.channels.includes(ic) ? 'var(--accent)' : 'var(--border)'}`, background: f.channels.includes(ic) ? 'var(--accent-soft)' : 'transparent', borderRadius: 14, fontSize: 'var(--type-sm)', cursor: 'default' }}><input type="checkbox" checked={f.channels.includes(ic)} onChange={() => toggle('channels', ic)} /><Ic name={ic} size={13} />{l}</label>
            )}
            </div>
          </div>
          <div><label className="label">Observações internas</label><textarea className="input" rows={3} value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Notas visíveis apenas para administradores..." /></div>
          <label className="row" style={{ gap: 8, fontSize: 'var(--type-sm)' }}><input type="checkbox" checked={f.welcome} onChange={(e) => set('welcome', e.target.checked)} />Enviar e-mail de boas-vindas com credenciais</label>
          <label className="row" style={{ gap: 8, fontSize: 'var(--type-sm)' }}><input type="checkbox" checked={f.forcePwd} onChange={(e) => set('forcePwd', e.target.checked)} />Forçar troca de senha no primeiro acesso</label>
          <label className="row" style={{ gap: 8, fontSize: 'var(--type-sm)' }}><input type="checkbox" checked={f.mfa} onChange={(e) => set('mfa', e.target.checked)} />Habilitar autenticação em dois fatores</label>
        </div>
      }
      {confirmDel &&
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, animation: delClosing ? 'fade-out .18s ease forwards' : 'fade .15s ease' }} onClick={() => setConfirmDel(false)}>
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ padding: 20, maxWidth: 380, animation: delClosing ? 'pop-out .18s ease forwards' : 'pop .2s ease' }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--type-md)' }}>Excluir {initial?.name}?</div>
            <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 6 }}>Essa ação removerá o membro permanentemente. As conversas e vendas associadas permanecem no histórico.</div>
            <div className="row" style={{ gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button className="btn fin-btn-back" onClick={() => setConfirmDel(false)}>Voltar</button>
              <button className="btn btn-delete" onClick={() => {
                setDelClosing(true);
                setTimeout(() => {
                  setConfirmDel(false); setDelClosing(false);
                  const close = modalClose.current;
                  if (close) close(() => onDelete(initial.id));
                  else onDelete(initial.id);
                }, 180);
              }}><Ic name="trash" size={13} /> Excluir</button>
            </div>
          </div>
        </div>
      }
    </Modal>);

}

function AdminTeam() {
  const [team, setTeam] = React.useState(() => [...TEAM]);
  const [editing, setEditing] = React.useState(null); // null | 'new' | memberId
  const open = team.find((m) => m.id === editing);
  const isOpen = editing !== null;
  return (
    <Page title="Equipe" subtitle="Gestão de colaboradores" actions={<button className="fin-new-btn" onClick={() => setEditing('new')} aria-label="Nova Equipe"><span className="fin-new-label">{'Nova Equipe\u00A0'}</span><span className="fin-new-plus" style={{ width: "38px", height: "38px" }}><Ic name="plus" size={18} /></span></button>}>
      {(() => {
        // Aggregate dashboard across all teams
        const totalMeta = team.reduce((s, t) => s + (t.meta || 0), 0);
        const totalVendido = team.reduce((s, t) => s + (t.vendido || 0), 0);
        const metaPct = totalMeta > 0 ? Math.round(totalVendido / totalMeta * 100) : 0;
        const negTot = team.reduce((s, t, i) => s + (t.vendido * 5.5 + (i + 1) * 12000), 0);
        const negGan = totalVendido;
        const negPer = team.reduce((s, t, i) => s + (t.meta * 0.6 + (i + 1) * 3500), 0);
        const negAbe = Math.max(0, negTot - negGan - negPer);
        const ativos = team.filter((t) => t.status === 'ativo').length;
        const fmtK = (v) => v >= 1000 ? `R$ ${(v / 1000).toFixed(v >= 10000 ? 1 : 2)}k` : `R$ ${Math.round(v)}`;
        const KPIs = [
        { id: 'tot', label: 'Total negócios', value: fmtK(negTot), count: `${Math.round(negTot / 120)} negócios`, delta: '+17.46%', up: true, icon: 'reports', rotate: 0 },
        { id: 'gan', label: 'Total ganhos', value: fmtK(negGan), count: `${Math.round(negGan / 500)} negócios`, delta: '+12.30%', up: true, icon: 'arrow-up-right', rotate: 0 },
        { id: 'per', label: 'Total perdidos', value: fmtK(negPer), count: `${Math.round(negPer / 280)} negócios`, delta: '-8.25%', up: false, icon: 'arrow-up-right', rotate: 90 },
        { id: 'abe', label: 'Total em aberto', value: fmtK(negAbe), count: `${Math.round(negAbe / 95)} negócios`, delta: '+7.40%', up: true, icon: 'activity', rotate: 0 },
        { id: 'eq', label: 'Equipes', value: `${team.length}`, count: `${ativos} ativa${ativos === 1 ? '' : 's'} · ${team.length - ativos} inativa${team.length - ativos === 1 ? '' : 's'}`, delta: '+1', up: true, icon: 'team', rotate: 0 }];

        return (
          <div className="card team-overview" style={{ overflow: 'hidden', marginBottom: 'var(--pad-3)', flexShrink: 0 }}>
            <div className="card-pad" style={{ paddingBottom: 18 }}>
              <div className="row" style={{ alignItems: 'flex-end', marginBottom: 16, gap: 12 }}>
                <div>
                  <div style={{ fontSize: 'var(--type-lg)', fontWeight: 700, letterSpacing: '-.01em' }}>Visão geral — Negócios das equipes</div>
                  <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 2 }}>Dados consolidados de todas as {team.length} equipes</div>
                </div>
                <div className="spacer" />
                <span className="badge badge-success" style={{ flexShrink: 0 }}>{ativos} ativa{ativos === 1 ? '' : 's'}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 }}>
                {KPIs.map((k) => {
                  const deltaBg = k.up ? 'color-mix(in oklab, var(--accent) 14%, white)' : 'color-mix(in oklab, var(--hue-rose) 14%, white)';
                  const deltaFg = k.up ? 'var(--accent-700)' : '#b91c1c';
                  const iconFg = k.up ? 'var(--accent)' : 'var(--hue-rose)';
                  return (
                    <div key={k.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                      <div className="row" style={{ alignItems: 'center', gap: 6 }}>
                        <div style={{ fontSize: 'var(--type-xs)', color: 'var(--text-muted)', fontWeight: 600, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.label}</div>
                        <span style={{ background: deltaBg, color: deltaFg, fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>{k.delta}</span>
                      </div>
                      <div className="row" style={{ alignItems: 'flex-end', gap: 8 }}>
                        <div className="tnum" style={{ fontSize: 'var(--type-xl)', fontWeight: 700, letterSpacing: '-.02em', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.1 }}>{k.value}</div>
                        <span style={{ color: iconFg, display: 'inline-flex', flexShrink: 0, transform: k.rotate ? `rotate(${k.rotate}deg)` : undefined }}><Ic name={k.icon} size={16} /></span>
                      </div>
                      <div className="muted" style={{ fontSize: 'var(--type-xs)' }}>{k.count}</div>
                    </div>);
                })}
              </div>
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div className="row" style={{ alignItems: 'center', marginBottom: 8, gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 'var(--type-sm)', fontWeight: 700 }}>Meta consolidada</div>
                    <div className="muted" style={{ fontSize: 'var(--type-xs)', marginTop: 2 }}>Vendas {formatBRL(totalVendido)} de {formatBRL(totalMeta)}</div>
                  </div>
                  <div className="spacer" />
                  <span className="tnum" style={{ fontWeight: 700, fontSize: 'var(--type-lg)', color: metaPct >= 100 ? 'var(--accent-700)' : 'var(--text)' }}>{metaPct}%</span>
                </div>
                <div className="bar" style={{ height: 10 }}><div style={{ width: `${Math.min(metaPct, 100)}%`, background: 'var(--accent)' }} /></div>
              </div>
            </div>
          </div>);
      })()}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--pad-3)' }}>
        {team.map((m, idx) => {
          const pct = Math.round(m.vendido / m.meta * 100);
          const stripe = m.color || colorFor(m.name) || 'var(--hue-orange)';
          const teamMembers = team.filter((x) => x.id !== m.id).slice(0, 4);
          const teamName = m.region || m.name.split(' ')[0] + 's'; // fallback when region not set
          const desc = m.description || `Equipe responsável por ${m.role.toLowerCase()} — atende clientes ativos e prospects nos canais conectados.`;
          // Negócios — mock derived from member data
          const seed = idx + 1;
          const totalVal = m.vendido * 5.5 + seed * 12000;
          const ganhosVal = m.vendido;
          const perdidosVal = m.meta * 0.6 + seed * 3500;
          const abertoVal = Math.max(0, totalVal - ganhosVal - perdidosVal);
          const fmtK = (v) => `R$ ${(v / 1000).toFixed(v >= 10000 ? 1 : 2)}k`;
          const negs = [
          { id: 'tot', label: 'Total negócios', value: fmtK(totalVal), count: `${Math.round(totalVal / 120)} negócios`, delta: '+17.46%', up: true, icon: 'reports', rotate: 0 },
          { id: 'gan', label: 'Total ganhos', value: fmtK(ganhosVal), count: `${Math.round(ganhosVal / 500)} negócios`, delta: '+12.30%', up: true, icon: 'arrow-up-right', rotate: 0 },
          { id: 'per', label: 'Total perdidos', value: fmtK(perdidosVal), count: `${Math.round(perdidosVal / 280)} negócios`, delta: '-8.25%', up: false, icon: 'arrow-up-right', rotate: 90 },
          { id: 'abe', label: 'Total em aberto', value: fmtK(abertoVal), count: `${Math.round(abertoVal / 95)} negócios`, delta: '+7.40%', up: true, icon: 'activity', rotate: 0 }];

          return (
            <div
              key={m.id}
              className="card team-card"
              style={{ overflow: 'hidden', cursor: 'pointer', transition: 'transform .2s ease, box-shadow .2s ease' }}
              onClick={() => setEditing(m.id)}>
              <div style={{ height: 4, background: stripe }} />
              <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="row" style={{ gap: 14, alignItems: 'center' }}>
                  <Avatar name={m.name} size="xl" color={m.color} online={m.status === 'ativo'} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: 'var(--type-lg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.15 }}>{m.name}</div>
                      <span className={`badge ${m.status === 'ativo' ? 'badge-success' : 'badge-neutral'}`} style={{ flexShrink: 0 }}>{m.status === 'ativo' ? 'Ativo' : 'Inativo'}</span>
                    </div>
                    <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 2 }}>Equipe {teamName}</div>
                  </div>
                </div>
                <div style={{ fontSize: 'var(--type-sm)', color: 'var(--text-muted)', lineHeight: 1.45 }}>{desc}</div>
                <div>
                  <div style={{ fontSize: 'var(--type-md)', fontWeight: 700, marginBottom: 8 }}>Negócios</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {negs.map((n) => {
                      const deltaBg = n.up ? 'color-mix(in oklab, var(--accent) 14%, white)' : 'color-mix(in oklab, var(--hue-rose) 14%, white)';
                      const deltaFg = n.up ? 'var(--accent-700)' : '#b91c1c';
                      const iconFg = n.up ? 'var(--accent)' : 'var(--hue-rose)';
                      return (
                        <div key={n.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', background: 'var(--surface)' }}>
                          <div className="row" style={{ alignItems: 'center', gap: 6 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.label}</div>
                            <span style={{ background: deltaBg, color: deltaFg, fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, whiteSpace: 'nowrap' }}>{n.delta}</span>
                          </div>
                          <div className="row" style={{ alignItems: 'flex-end', gap: 6, marginTop: 4 }}>
                            <div className="tnum" style={{ fontSize: 'var(--type-lg)', fontWeight: 700, letterSpacing: '-.01em', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.value}</div>
                            <span style={{ color: iconFg, display: 'inline-flex', flexShrink: 0, transform: n.rotate ? `rotate(${n.rotate}deg)` : undefined }}><Ic name={n.icon} size={14} /></span>
                          </div>
                          <div className="muted" style={{ fontSize: 10, marginTop: 2 }}>{n.count}</div>
                        </div>);
                    })}
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div className="row" style={{ alignItems: 'center', fontSize: 'var(--type-sm)', marginBottom: 6 }}>
                    <span className="muted">Meta R$ {(m.meta / 1000).toFixed(0)}k</span>
                    <div className="spacer" />
                  </div>
                  <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                    <div className="bar" style={{ flex: 1, height: 8 }}><div style={{ width: `${Math.min(pct, 100)}%`, background: pct >= 100 ? 'var(--accent)' : stripe }} /></div>
                    <span className="tnum" style={{ fontWeight: 700, fontSize: 'var(--type-sm)', minWidth: 38, textAlign: 'right' }}>{pct}%</span>
                  </div>
                  <div className="muted" style={{ fontSize: 'var(--type-xs)', marginTop: 6 }}>Vendas {formatBRL(m.vendido || 0)}</div>
                </div>
                <div className="row" style={{ gap: 0, alignItems: 'center', marginTop: 2 }}>
                  {teamMembers.map((tm, i) =>
                  <div key={tm.id} style={{ marginLeft: i === 0 ? 0 : -8, border: '2px solid var(--surface)', borderRadius: '50%', display: 'inline-flex' }}>
                      <Avatar name={tm.name} size="sm" color={tm.color} />
                    </div>)}
                  {teamMembers.length > 0 &&
                  <span className="muted" style={{ marginLeft: 10, fontSize: 'var(--type-xs)' }}>{teamMembers.length} membro{teamMembers.length > 1 ? 's' : ''}</span>}
                </div>
              </div>
            </div>);

        })}
      </div>
      {isOpen &&
      <TeamDrawer
        initial={editing === 'new' ? null : open}
        allMembers={[...TEAM]}
        onClose={() => setEditing(null)}
        onSave={(t) => {
          setTeam((prev) => prev.some((x) => x.id === t.id) ? prev.map((x) => x.id === t.id ? { ...x, ...t } : x) : [...prev, t]);
          setEditing(null);
        }}
        onDelete={(id) => {
          setTeam((prev) => prev.filter((x) => x.id !== id));
          setEditing(null);
        }} />

      }
    </Page>);

}

// Transfer rules
function AdminRules() {
  return (
    <Page title="Regras de transferência" subtitle="Quando e como o agente passa para um humano" actions={<button className="btn btn-primary"><Ic name="plus" size={14} /> Nova regra</button>}>
      <div className="card">
        <table className="table">
          <thead><tr><th style={{ width: 30 }}></th><th>Regra</th><th>Tipo</th><th>Configuração</th><th>Status</th><th></th></tr></thead>
          <tbody>{TRANSFER_RULES.map((r, i) =>
            <tr key={r.id}>
              <td className="muted tnum">{i + 1}</td>
              <td style={{ fontWeight: 600 }}>{r.name}</td>
              <td><span className="chip">{r.type}</span></td>
              <td className="muted" style={{ fontSize: 'var(--type-sm)' }}>{r.config}</td>
              <td>{r.active ? <span className="badge badge-success">Ativa</span> : <span className="badge badge-neutral">Inativa</span>}</td>
              <td style={{ textAlign: 'right' }}><span className="btn btn-ghost btn-icon"><Ic name="edit" size={14} /></span></td>
            </tr>
            )}</tbody>
        </table>
      </div>
    </Page>);

}

// Quick replies
function AdminReplies() {
  const cats = [...new Set(QUICK_REPLIES.map((q) => q.cat))];
  return (
    <Page title="Respostas rápidas" subtitle="Atendentes inserem com / na conversa" actions={<button className="btn btn-primary"><Ic name="plus" size={14} /> Nova resposta</button>}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 'var(--pad-3)' }}>
        {cats.map((c) =>
        <div key={c} className="card card-pad">
            <div className="h3">{c}</div>
            <div className="col" style={{ gap: 8, marginTop: 10 }}>
              {QUICK_REPLIES.filter((q) => q.cat === c).map((q) =>
            <div key={q.id} style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div className="row"><span className="kbd">{q.title}</span><div className="spacer" /><span className="btn btn-ghost btn-icon"><Ic name="edit" size={12} /></span></div>
                  <div style={{ fontSize: 'var(--type-sm)', marginTop: 6, color: 'var(--text-muted)' }}>{q.text}</div>
                </div>
            )}
            </div>
          </div>
        )}
      </div>
    </Page>);

}

// Reports
function AdminReports() {
  return (
    <Page title="Relatórios" subtitle="Análise de desempenho do atendimento" actions={
    <div className="row" style={{ gap: 6 }}>
        <select className="input" style={{ width: 140, height: 34 }}><option>30 dias</option></select>
        <button className="btn"><Ic name="file" size={14} /> Exportar CSV</button>
      </div>
    }>
      <div className="stat-grid">
        <Stat label="Total de conversas" value="1.284" foot="↑ 12% vs mês anterior" icon="inbox" />
        <Stat label="Resolução automática" value="73%" foot="↑ 4 pp" icon="sparkles" accent={{ bg: 'var(--ai-soft)', fg: 'var(--ai-strong)' }} />
        <Stat label="Tempo médio resp." value="2.4s" foot="meta < 3s" icon="clock" />
        <Stat label="Pico de horário" value="14h–16h" foot="média 38 conv./hora" icon="activity" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--pad-3)' }}>
        <div className="card card-pad">
          <div className="h3">Conversas por atendente</div>
          <div className="col" style={{ marginTop: 12, gap: 8 }}>
            {TEAM.filter((t) => t.status === 'ativo').map((t) => {
              const n = Math.round(40 + Math.random() * 120);
              return (
                <div key={t.id} className="row" style={{ gap: 10 }}>
                  <Avatar name={t.name} size="sm" />
                  <span style={{ flex: 1, fontSize: 'var(--type-sm)' }}>{t.name}</span>
                  <div style={{ width: 160 }} className="bar"><div style={{ width: `${n / 160 * 100}%` }} /></div>
                  <span className="tnum" style={{ minWidth: 32, fontSize: 'var(--type-sm)', textAlign: 'right' }}>{n}</span>
                </div>);

            })}
          </div>
        </div>
        <div className="card card-pad">
          <div className="h3">Gaps no catálogo (sem resposta)</div>
          <div className="col" style={{ marginTop: 12, gap: 6 }}>
            {[
            ['Pacote para gestantes', 18],
            ['Promoção de aniversário', 12],
            ['Brunch do dia da mãe', 9],
            ['Cartão fidelidade', 6]].
            map(([q, n], i) =>
            <div key={i} className="row" style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, gap: 10 }}>
                <span style={{ flex: 1, fontSize: 'var(--type-sm)' }}>{q}</span>
                <span className="badge badge-warning">{n} perguntas</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card card-pad" style={{ background: 'var(--ai-soft)', borderColor: 'color-mix(in oklab, var(--ai) 30%, var(--border))' }}>
        <div className="row"><Ic name="sparkles" size={18} style={{ color: 'var(--ai)' }} /><div className="h3" style={{ marginLeft: 8 }}>Resumo semanal por WhatsApp</div></div>
        <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 6 }}>A IA prepara um resumo executivo todo domingo às 20h e envia direto no seu WhatsApp.</div>
        <button className="btn" style={{ marginTop: 10 }}>Configurar envio</button>
      </div>
    </Page>);

}

// History
function AdminHistory() {
  return (
    <Page title="Histórico de atendimentos" subtitle="Todas as conversas do tenant" actions={<button className="btn"><Ic name="file" size={14} /> Exportar CSV</button>}>
      <div className="row" style={{ gap: 8 }}>
        <input className="input" placeholder="Buscar por cliente ou conteúdo..." style={{ maxWidth: 340 }} />
        <select className="input" style={{ width: 140 }}><option>Todos canais</option></select>
        <select className="input" style={{ width: 140 }}><option>Todos status</option></select>
        <select className="input" style={{ width: 140 }}><option>Todos atendentes</option></select>
        <div className="spacer" />
        <span className="muted" style={{ fontSize: 'var(--type-sm)' }}>1.284 conversas</span>
      </div>
      <div className="card">
        <table className="table">
          <thead><tr><th>Cliente</th><th>Canal</th><th>Status</th><th>Atendente</th><th>Duração</th><th>Data</th></tr></thead>
          <tbody>
            {[...CONVERSATIONS, ...CONVERSATIONS].slice(0, 16).map((c, i) => {
              const handlers = { agent: 'IA Júlia', queue: '(fila)', human: c.assignee === 'kz' ? 'Karla Zambelly' : '—' };
              return (
                <tr key={i}>
                  <td><div className="row" style={{ gap: 8 }}><Avatar name={c.client} size="sm" /><span>{c.client}</span></div></td>
                  <td><div className="row" style={{ gap: 6 }}><ChannelIcon ch={c.channel} /><span style={{ fontSize: 'var(--type-sm)', textTransform: 'capitalize' }}>{c.channel}</span></div></td>
                  <td>{c.status === 'em-andamento' ? <span className="badge badge-info">Em andamento</span> : c.status === 'fila' ? <span className="badge badge-warning">Na fila</span> : <span className="badge badge-neutral">Encerrada</span>}</td>
                  <td>{c.handler === 'agent' ? <span className="row" style={{ gap: 6 }}><Ic name="sparkles" size={12} style={{ color: 'var(--ai)' }} /><span className="ai-grad">IA Júlia</span></span> : <span className="muted">{handlers[c.handler]}</span>}</td>
                  <td className="tnum muted" style={{ fontSize: 'var(--type-sm)' }}>{Math.round(2 + Math.random() * 18)} min</td>
                  <td className="muted" style={{ fontSize: 'var(--type-sm)' }}>{c.lastTime}</td>
                </tr>);

            })}
          </tbody>
        </table>
      </div>
    </Page>);

}

// Finance
function AdminFinance() {
  return (
    <Page title="Financeiro" subtitle="Plano contratado e faturas">
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 'var(--pad-3)' }}>
        <div className="card card-pad" style={{ background: 'linear-gradient(135deg, var(--accent-soft), var(--surface))', borderColor: 'color-mix(in oklab, var(--accent) 30%, var(--border))' }}>
          <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>PLANO ATUAL</div>
          <div className="h1" style={{ marginTop: 4 }}>Pro · R$ 697,50/mês</div>
          <div className="muted" style={{ marginTop: 6 }}>Próximo vencimento: 01/06/2026</div>
          <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted" style={{ fontSize: 'var(--type-sm)' }}>Conversas</span><span className="tnum" style={{ fontWeight: 600 }}>1.284 / 2.000</span></div>
              <div className="bar" style={{ marginTop: 4 }}><div style={{ width: '64%' }} /></div>
            </div>
            <div>
              <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted" style={{ fontSize: 'var(--type-sm)' }}>Usuários</span><span className="tnum" style={{ fontWeight: 600 }}>5 / 5</span></div>
              <div className="bar" style={{ marginTop: 4 }}><div style={{ width: '100%', background: 'var(--hue-amber)' }} /></div>
            </div>
          </div>
          <div className="row" style={{ marginTop: 16, gap: 8 }}>
            <button className="btn btn-primary">Solicitar upgrade</button>
            <button className="btn">Ver detalhes do plano</button>
          </div>
        </div>
        <div className="card card-pad">
          <div className="h3">Recursos inclusos</div>
          <div className="col" style={{ marginTop: 10, gap: 6, fontSize: 'var(--type-sm)' }}>
            {['IA avançada (Claude + multimodal)', 'CRM ilimitado', 'Catálogo até 2.000 produtos', 'WhatsApp + Instagram + Facebook', 'Agenda + Google Calendar', 'Relatórios completos', 'Suporte por e-mail'].map((r) =>
            <div key={r} className="row" style={{ gap: 8 }}><Ic name="check" size={14} style={{ color: 'var(--accent)' }} />{r}</div>
            )}
          </div>
        </div>
      </div>
      <div className="card">
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }} className="h3">Histórico de faturas</div>
        <table className="table">
          <thead><tr><th>Mês de referência</th><th>Valor</th><th>Vencimento</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {['Maio 2026', 'Abril 2026', 'Março 2026', 'Fevereiro 2026', 'Janeiro 2026'].map((m, i) =>
            <tr key={i}>
                <td style={{ fontWeight: 500 }}>{m}</td>
                <td className="tnum">R$ 397,00</td>
                <td className="muted">01/{['06', '05', '04', '03', '02'][i]}/2026</td>
                <td>{i === 0 ? <span className="badge badge-warning">Aberto</span> : <span className="badge badge-success">Pago</span>}</td>
                <td style={{ textAlign: 'right' }}><span className="muted" style={{ fontSize: 'var(--type-sm)', cursor: 'default' }}>Boleto · Nota</span></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Page>);

}

// Settings
function AdminSettings() {
  return (
    <Page title="Configurações da loja" subtitle="Dados cadastrais e preferências">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--pad-3)' }}>
        <div className="card card-pad">
          <div className="h3">Identidade</div>
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: 16, background: 'linear-gradient(135deg, var(--accent), var(--ai))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 28 }}>I</div>
            <div className="col" style={{ gap: 8 }}>
              <div><label className="label">Nome</label><input className="input" defaultValue="Iguabela Beleza" /></div>
              <div><label className="label">Segmento</label><select className="input"><option>Beleza & Estética</option></select></div>
            </div>
          </div>
        </div>
        <div className="card card-pad">
          <div className="h3">Contato</div>
          <div className="col" style={{ marginTop: 10, gap: 8 }}>
            <div><label className="label">Endereço</label><input className="input" defaultValue="Rua das Flores, 123 — Fortaleza/CE" /></div>
            <div className="row" style={{ gap: 8 }}>
              <div style={{ flex: 1 }}><label className="label">Telefone</label><PhoneInput defaultValue="(85) 9 9999-9999" /></div>
              <div style={{ flex: 1 }}><label className="label">Timezone</label><select className="input"><option>America/Fortaleza</option></select></div>
            </div>
          </div>
        </div>
        <div className="card card-pad">
          <div className="h3">Notificações do admin</div>
          <div className="col" style={{ marginTop: 10, gap: 10 }}>
            <div className="row" style={{ gap: 10 }}><Toggle on /><span style={{ fontSize: 'var(--type-sm)' }}>E-mail diário com resumo</span></div>
            <div className="row" style={{ gap: 10 }}><Toggle on /><span style={{ fontSize: 'var(--type-sm)' }}>Alerta de erro de integração</span></div>
            <div className="row" style={{ gap: 10 }}><Toggle /><span style={{ fontSize: 'var(--type-sm)' }}>WhatsApp diário com KPIs</span></div>
          </div>
        </div>
        <div className="card card-pad">
          <div className="h3">Equipe</div>
          <div className="col" style={{ marginTop: 10, gap: 6 }}>
            {TEAM.slice(0, 4).map((m) =>
            <div key={m.id} className="row" style={{ gap: 8, padding: '4px 0' }}>
                <Avatar name={m.name} size="sm" />
                <span style={{ fontSize: 'var(--type-sm)', flex: 1 }}>{m.name}</span>
                <span className="muted" style={{ fontSize: 'var(--type-xs)' }}>{m.role}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn fin-btn-back">Voltar</button>
        <button className="btn btn-primary">Salvar alterações</button>
      </div>
    </Page>);

}

Object.assign(window, { AdminDashboard, AdminAgentList, AdminCatalog, AdminIntegrations, AdminTeam, AdminRules, AdminReplies, AdminReports, AdminHistory, AdminFinance, AdminSettings, Toggle, AgentTester });