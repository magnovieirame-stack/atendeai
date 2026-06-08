// marketing-flow-ai.jsx — Marketing · Fluxo IA
// Autonomous AI agents that run automation flows over CRM/sales data.

(function () {

  // ─────────────────────────────────────────────────────────────────────
  //  Mock data
  // ─────────────────────────────────────────────────────────────────────

  const AGENTS = [
    { id: 'ag-lia',   name: 'Lia',    role: 'Recompra',     hue: 162, tone: 'Empática · Próxima',     objective: 'Identificar ciclos de compra e iniciar nova venda no momento ideal.',                strategy: 'Aborda 3 dias antes do ciclo médio · usa histórico de produto · oferece reposição.', triggers: ['Ciclo de recompra próximo'],                  channels: ['whatsapp'],          flows: 3 },
    { id: 'ag-zoe',   name: 'Zoé',    role: 'Oferta',       hue:  28, tone: 'Direta · Persuasiva',    objective: 'Vender um produto específico de forma contínua para a base certa.',                  strategy: 'Foco em escassez + benefício · prova social · CTA único.',                          triggers: ['Tag · interessado-X', 'Visitou produto'],     channels: ['whatsapp', 'email'], flows: 2 },
    { id: 'ag-nora',  name: 'Nora',   role: 'Recuperação',  hue: 282, tone: 'Acolhedora · Curiosa',   objective: 'Trazer de volta clientes inativos sem soar invasiva.',                                strategy: 'Reabre conversa com pergunta · oferece benefício leve · escala se houver resposta.', triggers: ['60+ dias sem comprar', 'Saiu de fluxo ativo'],channels: ['whatsapp'],          flows: 2 },
    { id: 'ag-theo',  name: 'Theo',   role: 'Upsell',       hue: 220, tone: 'Consultiva · Especialista', objective: 'Aumentar ticket médio sugerindo produtos complementares com base no histórico.',  strategy: 'Sugestão baseada em LTV · pacote/kit · ancoragem de preço.',                        triggers: ['Compra acima da média', 'Aceitou cupom'],     channels: ['whatsapp', 'email'], flows: 2 },
    { id: 'ag-iris',  name: 'Iris',   role: 'Relacionamento', hue: 340, tone: 'Calorosa · Pessoal',  objective: 'Manter conversa viva entre compras · construir lembrança de marca.',                strategy: 'Conteúdo, dica, atendimento humano · sem oferta direta.',                            triggers: ['Aniversário', 'Aniversário de cliente (12m)'],channels: ['whatsapp'],          flows: 1 }
  ];

  const FLOWS = [
    {
      id: 'fa1',
      name: 'Recuperação por ciclo de compra',
      desc: 'IA identifica clientes próximos do período médio de recompra e inicia a abordagem no momento ideal.',
      agent: 'ag-lia',
      status: 'running',
      trigger: { label: 'Ciclo de recompra próximo (D-3)', detail: 'Avaliado diariamente · base de 3.214 clientes ativos' },
      analysis: ['Perfil de consumo', 'Janela ideal', 'Produto preferido', 'Tom de voz'],
      action:  { label: 'WhatsApp personalizado + cupom dinâmico', channels: ['whatsapp'] },
      kpis: { contacts: 1842, conversions: 312, revenue: 48720, rate: 0.169, score: 78 },
      lastRun: 'há 4 min',
      trend: [38, 42, 51, 44, 58, 64, 71, 68, 79, 84, 92, 88, 96, 103],
      memory: 'Aprendeu que clientes do Linha Capilar respondem 23% mais entre 19h-21h.',
      examples: 4286
    },
    {
      id: 'fa2',
      name: 'Reativação · inativos 60d+',
      desc: 'Nora reabre a conversa com clientes inativos usando perguntas leves antes de qualquer oferta.',
      agent: 'ag-nora',
      status: 'running',
      trigger: { label: '60+ dias sem comprar', detail: 'Avaliado semanalmente · 612 clientes na fila' },
      analysis: ['Último pedido', 'Motivo provável', 'Canal preferido'],
      action:  { label: 'Mensagem leve + oferta condicional', channels: ['whatsapp'] },
      kpis: { contacts: 612, conversions: 74, revenue: 12480, rate: 0.121, score: 64 },
      lastRun: 'há 2 h',
      trend: [12, 18, 22, 19, 24, 28, 31, 27, 33, 35, 38, 42, 39, 44],
      memory: 'Mensagens com pergunta convertem 2,4× mais que ofertas diretas neste segmento.',
      examples: 612
    },
    {
      id: 'fa3',
      name: 'Upsell pós-compra · ticket alto',
      desc: 'Theo sugere kits e produtos complementares 5 dias após compras acima do ticket médio.',
      agent: 'ag-theo',
      status: 'running',
      trigger: { label: 'Compra > R$ 400 · D+5', detail: 'Avaliado diariamente · 184 clientes elegíveis' },
      analysis: ['Histórico de produtos', 'Cross-sell possível', 'Pacote ideal'],
      action:  { label: 'E-mail com kit + WhatsApp follow-up', channels: ['email', 'whatsapp'] },
      kpis: { contacts: 184, conversions: 41, revenue: 23480, rate: 0.223, score: 82 },
      lastRun: 'há 18 min',
      trend: [4, 6, 8, 7, 10, 12, 11, 14, 16, 18, 17, 21, 23, 25],
      memory: 'Pacotes de 2 itens com 8% de desconto têm a maior taxa de aceite.',
      examples: 184
    },
    {
      id: 'fa4',
      name: 'Oferta contínua · Esmalte Premium',
      desc: 'Zoé promove o esmalte top de linha para clientes com perfil compatível, sem saturar.',
      agent: 'ag-zoe',
      status: 'paused',
      trigger: { label: 'Tag · interessado-esmalte', detail: 'Pausado em 22 mai · revisão de copy pendente' },
      analysis: ['Perfil compatível', 'Histórico de cor', 'Última interação'],
      action:  { label: 'WhatsApp com oferta + e-mail de reforço', channels: ['whatsapp', 'email'] },
      kpis: { contacts: 426, conversions: 38, revenue: 7920, rate: 0.089, score: 52 },
      lastRun: 'há 3 dias',
      trend: [22, 28, 32, 35, 41, 38, 44, 49, 52, 48, 46, 0, 0, 0],
      memory: 'Conversão cai 35% quando o agente envia 2 mensagens na mesma semana.',
      examples: 426
    },
    {
      id: 'fa5',
      name: 'Aniversário · cupom 20%',
      desc: 'Iris parabeniza no dia e oferece um cupom válido por 7 dias com mensagem personalizada.',
      agent: 'ag-iris',
      status: 'active',
      trigger: { label: 'Data de aniversário do cliente', detail: 'Avaliado diariamente · 23 aniversariantes hoje' },
      analysis: ['Histórico', 'Fase do CRM', 'Tom adequado'],
      action:  { label: 'WhatsApp pessoal + cupom 20% (7d)', channels: ['whatsapp'] },
      kpis: { contacts: 318, conversions: 86, revenue: 19840, rate: 0.270, score: 91 },
      lastRun: 'há 9 min',
      trend: [8, 11, 9, 12, 14, 13, 16, 18, 15, 19, 22, 24, 26, 28],
      memory: 'Mensagem enviada às 09h tem 41% mais resposta que após o almoço.',
      examples: 318
    },
    {
      id: 'fa6',
      name: 'Upsell agressivo · LTV top',
      desc: 'Theo aborda o top 5% de LTV com ofertas premium e atendimento prioritário.',
      agent: 'ag-theo',
      status: 'error',
      trigger: { label: 'LTV > R$ 8.000 · janela mensal', detail: 'Integração de catálogo offline desde 14h' },
      analysis: ['LTV', 'Histórico premium', 'Categoria preferida'],
      action:  { label: 'WhatsApp consultivo · transferir para humano', channels: ['whatsapp'] },
      kpis: { contacts: 28, conversions: 9, revenue: 14320, rate: 0.321, score: 0 },
      lastRun: 'erro · há 1 h',
      trend: [2, 3, 4, 5, 4, 6, 7, 8, 9, 7, 0, 0, 0, 0],
      memory: 'Aguardando reconexão do catálogo · execuções pausadas para evitar inconsistência.',
      examples: 28
    }
  ];

  const LOGS = [
    { id: 'l1',  t: '14:42', flow: 'fa1', agent: 'ag-lia',  kind: 'send',     text: 'Enviou WhatsApp para Aurora Cosméticos · template "ciclo-shampoo-D3"',                            outcome: 'ok'  },
    { id: 'l2',  t: '14:41', flow: 'fa3', agent: 'ag-theo', kind: 'decision', text: 'Decidiu não abordar Studio Glam · histórico recente de upsell',                                   outcome: 'skip'},
    { id: 'l3',  t: '14:39', flow: 'fa5', agent: 'ag-iris', kind: 'send',     text: 'Mensagem de aniversário enviada para Lumière Estética · cupom ANIV20-…',                          outcome: 'ok'  },
    { id: 'l4',  t: '14:35', flow: 'fa1', agent: 'ag-lia',  kind: 'tag',      text: 'Adicionou tag "ciclo-detectado" em 12 clientes',                                                  outcome: 'ok'  },
    { id: 'l5',  t: '14:28', flow: 'fa6', agent: 'ag-theo', kind: 'error',    text: 'Falha ao buscar catálogo · integração offline · execução pausada',                                outcome: 'err' },
    { id: 'l6',  t: '14:22', flow: 'fa1', agent: 'ag-lia',  kind: 'reply',    text: 'Resposta recebida de Espaço Vitória · classificada como "interesse alto"',                         outcome: 'ok'  },
    { id: 'l7',  t: '14:18', flow: 'fa3', agent: 'ag-theo', kind: 'send',     text: 'E-mail enviado · "Kit completo para sua próxima rotina"',                                          outcome: 'ok'  },
    { id: 'l8',  t: '14:11', flow: 'fa2', agent: 'ag-nora', kind: 'decision', text: 'Adiou contato de Beleza Natural ME para amanhã · janela melhor (19h)',                              outcome: 'wait'},
    { id: 'l9',  t: '14:04', flow: 'fa5', agent: 'ag-iris', kind: 'reply',    text: 'Lia recebeu agradecimento · sem oferta, conversa continua',                                        outcome: 'ok'  },
    { id: 'l10', t: '13:58', flow: 'fa1', agent: 'ag-lia',  kind: 'task',     text: 'Criou tarefa comercial para Karla · cliente premium pediu ligação',                                outcome: 'ok'  }
  ];

  // ─────────────────────────────────────────────────────────────────────
  //  Helpers
  // ─────────────────────────────────────────────────────────────────────

  const fmtBRL = (n) => 'R$ ' + (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtN   = (n) => (n || 0).toLocaleString('pt-BR');
  const pct    = (n) => `${(n * 100).toFixed(1).replace('.', ',')}%`;
  const agentOf = (id) => AGENTS.find((a) => a.id === id);

  // Status pill — running has a pulsing dot, error is red, etc.
  const statusMap = {
    running: { label: 'Em execução', color: '#16a34a', bg: 'color-mix(in oklab, #16a34a 14%, white)', pulse: true },
    active:  { label: 'Ativo',       color: '#16a34a', bg: 'color-mix(in oklab, #16a34a 12%, white)', pulse: false },
    paused:  { label: 'Pausado',     color: '#6b7280', bg: 'var(--surface-3)',                         pulse: false },
    error:   { label: 'Erro',        color: '#dc2626', bg: 'color-mix(in oklab, #dc2626 12%, white)',  pulse: false, blink: true }
  };

  function StatusPill({ s, size = 'sm' }) {
    const m = statusMap[s] || statusMap.active;
    const small = size === 'sm';
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: small ? '3px 9px' : '5px 11px',
        borderRadius: 999, background: m.bg, color: m.color,
        fontSize: small ? 11 : 12, fontWeight: 700, letterSpacing: '.01em', whiteSpace: 'nowrap'
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%', background: m.color,
          boxShadow: m.pulse ? `0 0 0 0 ${m.color}` : 'none',
          animation: m.pulse ? 'flowAiPulse 1.8s infinite' : m.blink ? 'flowAiBlink 1.2s infinite' : 'none'
        }} />
        {m.label}
      </span>);
  }

  function AgentChip({ agent, withName = true, size = 28 }) {
    if (!agent) return null;
    const bg = `linear-gradient(135deg, oklch(0.74 .14 ${agent.hue}), oklch(0.58 .17 ${(agent.hue + 30) % 360}))`;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{
          width: size, height: size, borderRadius: size / 2.4,
          background: bg, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: Math.round(size * 0.42), letterSpacing: '-.01em', flexShrink: 0,
          boxShadow: `0 6px 14px -6px oklch(0.6 .15 ${agent.hue} / .55), inset 0 1px 0 rgba(255,255,255,.25)`
        }}>{agent.name[0]}</span>
        {withName && (
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, lineHeight: 1.2 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{agent.name}</span>
            <span style={{ fontSize: 10.5, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600 }}>{agent.role}</span>
          </span>
        )}
      </span>);
  }

  // Sparkline ─ tiny bar chart for flow trend
  function Sparkline({ data, color = 'var(--accent)', height = 28 }) {
    const max = Math.max(1, ...data);
    return (
      <svg viewBox={`0 0 ${data.length * 6} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
        {data.map((v, i) => {
          const h = Math.max(1, (v / max) * (height - 2));
          const opacity = v === 0 ? .2 : .35 + (i / data.length) * .65;
          return <rect key={i} x={i * 6} y={height - h} width="4" height={h} rx="1.5" fill={color} opacity={opacity} />;
        })}
      </svg>);
  }

  // Conversion score ring
  function ScoreRing({ score, size = 44 }) {
    const r = size / 2 - 4;
    const c = 2 * Math.PI * r;
    const v = Math.max(0, Math.min(100, score));
    const off = c - (v / 100) * c;
    const hue = v >= 75 ? 160 : v >= 50 ? 80 : v >= 25 ? 40 : 20;
    const stroke = `oklch(0.62 .15 ${hue})`;
    return (
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth="3" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={off}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset .6s ease' }} />
        </svg>
        <span style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: Math.round(size * 0.3), fontWeight: 800, color: 'var(--text)', letterSpacing: '-.01em'
        }}>{v}</span>
      </div>);
  }

  // Channel mini-icon row
  function ChannelDots({ channels }) {
    const map = {
      whatsapp: { name: 'whatsapp', color: '#25d366' },
      email:    { name: 'mail',     color: '#1d4ed8' }
    };
    return (
      <span style={{ display: 'inline-flex', gap: 4 }}>
        {channels.map((c, i) => {
          const m = map[c] || map.email;
          return (
            <span key={i} style={{
              width: 22, height: 22, borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--border)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: m.color
            }}><Ic name={m.name} size={11} /></span>);
        })}
      </span>);
  }

  // ─────────────────────────────────────────────────────────────────────
  //  Page
  // ─────────────────────────────────────────────────────────────────────

  function MarketingFlowAI() {
    const [tab, setTab] = React.useState('flows');
    const [openFlow, setOpenFlow] = React.useState(null);
    const [builderFor, setBuilderFor] = React.useState(null); // null | 'new' | flowId
    const [flows, setFlows] = React.useState(FLOWS);
    const [loading, setLoading] = React.useState(true);
    React.useEffect(() => { setLoading(false); }, []);
    React.useEffect(() => { if (flows.length) skelRemember('flows', flows.length); }, [flows]);

    const toggleFlow = (id) => {
      setFlows((prev) => prev.map((f) => {
        if (f.id !== id) return f;
        const status = f.status === 'paused' ? 'running' : f.status === 'running' ? 'paused' : f.status === 'active' ? 'paused' : f.status;
        if (status !== f.status && window.showToast) {
          if (status === 'paused') window.showToast({ tipo: 'sucesso', titulo: 'Fluxo pausado', descricao: `"${f.name}" não vai mais executar até ser retomado.` });
          else window.showToast({ tipo: 'sucesso', titulo: 'Fluxo retomado', descricao: `"${f.name}" voltou a executar.` });
        }
        return { ...f, status };
      }));
    };

    // Aggregate KPIs across all flows
    const totals = flows.reduce((acc, f) => ({
      contacts: acc.contacts + f.kpis.contacts,
      conversions: acc.conversions + f.kpis.conversions,
      revenue: acc.revenue + f.kpis.revenue,
      active: acc.active + (f.status === 'running' || f.status === 'active' ? 1 : 0)
    }), { contacts: 0, conversions: 0, revenue: 0, active: 0 });
    const avgRate = totals.contacts > 0 ? totals.conversions / totals.contacts : 0;

    return (
      <Page
        title="Fluxo IA"
        subtitle="Agentes autônomos que tomam decisões, conversam e vendem dentro do CRM — sem você precisar disparar nada."
        actions={
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-sm" title="Ver memória aprendida"><Ic name="sparkles" size={13} /> Memória da IA</button>
            <FabNovo size="sm" label="Novo fluxo" onClick={() => setBuilderFor('new')} />
          </div>
        }>

        {/* ── KPI strip ─────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <Stat label="Fluxos ativos" value={`${totals.active}`} icon="zap"
            accent={{ bg: 'var(--accent-soft)', fg: 'var(--accent-700)' }}
            foot={<span>de {flows.length} fluxos no total</span>} />
          <Stat label="Contatos realizados · 30d" value={fmtN(totals.contacts)} icon="send"
            foot={<span style={{ color: 'var(--accent-700)' }}>+24% vs. mês passado</span>} />
          <Stat label="Receita gerada · 30d" value={fmtBRL(totals.revenue)} icon="coins"
            accent={{ bg: 'var(--ai-soft)', fg: 'var(--ai-strong)' }}
            foot={<span>ROI estimado: 8,4×</span>} />
          <Stat label="Conversão média" value={pct(avgRate)} icon="check"
            foot={<span>{fmtN(totals.conversions)} vendas geradas pela IA</span>} />
        </div>

        {/* ── Tabs ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginTop: 4 }}>
          {[
            { id: 'flows',   label: 'Fluxos',      icon: 'funnel', count: flows.length },
            { id: 'agents',  label: 'Agentes',     icon: 'bot',    count: AGENTS.length },
            { id: 'logs',    label: 'Histórico',   icon: 'history',count: null },
            { id: 'perf',    label: 'Performance', icon: 'reports',count: null }
          ].map((t) =>
            <div key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '10px 16px', cursor: 'pointer',
              fontSize: 13.5, fontWeight: 600,
              color: tab === t.id ? 'var(--accent-700)' : 'var(--text-muted)',
              borderBottom: '2px solid ' + (tab === t.id ? 'var(--accent)' : 'transparent'),
              marginBottom: -1,
              display: 'flex', alignItems: 'center', gap: 7
            }}>
              <Ic name={t.icon} size={13} />{t.label}
              {t.count != null && <span style={{ fontSize: 10.5, padding: '1px 7px', borderRadius: 999, background: tab === t.id ? 'var(--accent-soft)' : 'var(--surface-3)', color: tab === t.id ? 'var(--accent-700)' : 'var(--text-faint)', fontWeight: 700 }}>{t.count}</span>}
            </div>)}
        </div>

        {tab === 'flows'  && (loading ? <FlowsListSkeleton count={skelCount('flows', 3)} /> : <FlowsList flows={flows} onOpen={(f) => setOpenFlow(f)} onToggle={toggleFlow} onEdit={(id) => setBuilderFor(id)} />)}
        {tab === 'agents' && (loading ? <AgentsGridSkeleton count={skelCount('flow-agentes', AGENTS.length)} onEdit={() => setBuilderFor('new')} /> : <AgentsGrid agents={AGENTS} flows={flows} onEdit={() => setBuilderFor('new')} />)}
        {tab === 'logs'   && (loading ? <LogsTimelineSkeleton count={skelCount('flow-logs', 3)} /> : <LogsTimeline logs={LOGS} flows={flows} />)}
        {tab === 'perf'   && <PerformanceView flows={flows} />}

        {openFlow && <FlowDetailDrawer flow={openFlow} onClose={() => setOpenFlow(null)} onEdit={() => { setBuilderFor(openFlow.id); setOpenFlow(null); }} />}
        {builderFor && window.FlowBuilder && <window.FlowBuilder flowId={builderFor === 'new' ? null : builderFor} flows={flows} agents={AGENTS} onClose={() => setBuilderFor(null)} />}

        <style>{`
          @keyframes flowAiPulse {
            0%   { box-shadow: 0 0 0 0 currentColor; opacity: 1; }
            70%  { box-shadow: 0 0 0 6px transparent; opacity: .9; }
            100% { box-shadow: 0 0 0 0 transparent; opacity: 1; }
          }
          @keyframes flowAiBlink {
            0%, 100% { opacity: 1; }
            50%      { opacity: .4; }
          }
          .fai-card { transition: border-color .15s ease, transform .15s ease, box-shadow .15s ease; }
          .fai-card:hover { border-color: color-mix(in oklab, var(--ai) 30%, var(--border)); transform: translateY(-1px); box-shadow: 0 10px 24px -16px rgba(15,23,42,.12); }
          .fai-step { padding: 5px 10px; border-radius: 999px; background: var(--surface-2); border: 1px solid var(--border); font-size: 11.5px; color: var(--text-muted); font-weight: 600; white-space: nowrap; display: inline-flex; align-items: center; gap: 5px; }
          .fai-conn { color: var(--text-faint); display: inline-flex; align-items: center; }
        `}</style>
      </Page>);
  }

  // ─────────────────────────────────────────────────────────────────────
  //  FlowsList — vertical list of flow cards
  // ─────────────────────────────────────────────────────────────────────

  // ── Skeletons (scaffolding p/ API real) ──
  function FlowsListSkeleton({ count }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Filter row (mesma estrutura da real) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Skeleton w={280} h={34} r={8} style={{ flex: '1 1 280px', maxWidth: 360 }} />
          <Skeleton w={300} h={34} r={9} />
          <div className="spacer" />
          <Skeleton w={84} h={34} r={8} />
          <Skeleton w={90} h={34} r={8} />
        </div>
        {Array.from({ length: count }).map((_, k) =>
          <div key={k} className="card fai-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 24, alignItems: 'center' }}>
              {/* Left */}
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                  <Skeleton w={200} h={15} /><Skeleton w={88} h={20} r={999} />
                </div>
                <Skeleton w="80%" h={13} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Skeleton w={150} h={24} r={999} /><Skeleton w={120} h={24} r={999} /><Skeleton w={180} h={24} r={999} />
                </div>
                <div className="row" style={{ gap: 14, alignItems: 'center', paddingTop: 4, borderTop: '1px dashed var(--border)' }}>
                  <Skeleton w={28} h={28} r={8} /><Skeleton w={110} h={12} />
                  <div style={{ width: 1, height: 22, background: 'var(--border)' }} />
                  <Skeleton w="40%" h={11} />
                </div>
              </div>
              {/* Right */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><Skeleton w={52} h={9} /><Skeleton w={48} h={17} /></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><Skeleton w={56} h={9} /><Skeleton w={44} h={17} /></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><Skeleton w={48} h={9} /><Skeleton w={60} h={17} /></div>
                  <Skeleton w={42} h={42} circle />
                </div>
                <Skeleton w="100%" h={48} r={10} />
                <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                  <Skeleton w={104} h={30} r={8} /><Skeleton w={28} h={28} r={8} /><Skeleton w={28} h={28} r={8} /><Skeleton w={28} h={28} r={8} />
                </div>
              </div>
            </div>
          </div>)}
      </div>);
  }

  function AgentsGridSkeleton({ count, onEdit }) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        <AddCard title="Criar novo agente" subtitle="Defina personalidade, objetivo e estratégia. A IA aprende com cada interação." onClick={onEdit} style={{ minHeight: 320 }} />
        {Array.from({ length: count }).map((_, i) =>
          <div key={i} className="card fai-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '18px 18px 14px', background: 'var(--surface-2)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <Skeleton w={54} h={54} r={16} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Skeleton w="50%" h={18} /><Skeleton w="40%" h={11} />
                </div>
                <Skeleton w={52} h={18} r={999} />
              </div>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}><Skeleton w={60} h={9} /><Skeleton w="90%" h={12} /><Skeleton w="70%" h={12} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}><Skeleton w={56} h={9} /><Skeleton w="80%" h={12} /></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}><Skeleton w={48} h={9} /><Skeleton w="80%" h={12} /></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}><Skeleton w={70} h={9} /><Skeleton w="92%" h={11} /><Skeleton w="65%" h={11} /></div>
              <div className="spacer" />
              <div className="row" style={{ gap: 6, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                <Skeleton h={30} r={8} style={{ flex: 1 }} /><Skeleton h={30} r={8} style={{ flex: 1 }} />
              </div>
            </div>
          </div>)}
      </div>);
  }

  function LogsTimelineSkeleton({ count }) {
    return (
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Skeleton w={14} h={14} r={4} /><Skeleton w={240} h={14} /><Skeleton w={64} h={20} r={999} />
          <div className="spacer" />
          <Skeleton w={76} h={30} r={8} /><Skeleton w={110} h={30} r={8} />
        </div>
        <div style={{ padding: '4px 0' }}>
          {Array.from({ length: count }).map((_, i) =>
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '64px 32px minmax(0, 1fr) auto', gap: 12, padding: '12px 18px', borderTop: i === 0 ? 'none' : '1px solid var(--border)', alignItems: 'center' }}>
              <Skeleton w={40} h={12} />
              <Skeleton w={28} h={28} r={9} />
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Skeleton w="75%" h={13} /><Skeleton w="40%" h={11} />
              </div>
              <Skeleton w={56} h={20} r={999} />
            </div>)}
        </div>
      </div>);
  }

  function FlowsList({ flows, onOpen, onToggle, onEdit }) {
    const [q, setQ] = React.useState('');
    const [filter, setFilter] = React.useState('all');

    const filtered = flows.filter((f) => {
      if (filter !== 'all' && f.status !== filter) return false;
      if (q && !(f.name + f.desc).toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });

    const tabs = [
      { id: 'all',     label: 'Todos',        count: flows.length },
      { id: 'running', label: 'Em execução',  count: flows.filter((f) => f.status === 'running').length },
      { id: 'paused',  label: 'Pausados',     count: flows.filter((f) => f.status === 'paused').length },
      { id: 'error',   label: 'Com erro',     count: flows.filter((f) => f.status === 'error').length }
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Filter row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 360, height: 34 }}>
            <span style={{
              position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-faint)', pointerEvents: 'none',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 16, height: 16
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m20 20-4.5-4.5" />
              </svg>
            </span>
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar fluxo por nome ou descrição..."
              style={{ paddingLeft: 34, paddingRight: q ? 30 : 12, height: 34, width: '100%' }} />
            {q && (
              <button
                onClick={() => setQ('')}
                title="Limpar busca"
                aria-label="Limpar busca"
                style={{
                  position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                  width: 22, height: 22, border: 'none', background: 'transparent',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-muted)', cursor: 'pointer', borderRadius: 6
                }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 2, background: 'var(--surface-2)', padding: 3, borderRadius: 9, border: '1px solid var(--border)', height: 34, alignItems: 'center' }}>
            {tabs.map((t) =>
              <button key={t.id} onClick={() => setFilter(t.id)} className="btn btn-sm"
                style={{
                  height: 26, padding: '0 12px', border: 'none',
                  background: filter === t.id ? 'var(--surface)' : 'transparent',
                  color: filter === t.id ? 'var(--text)' : 'var(--text-muted)',
                  boxShadow: filter === t.id ? '0 1px 2px rgba(15,23,42,.06)' : 'none',
                  fontWeight: 600
                }}>{t.label} <span style={{ fontSize: 10.5, color: 'var(--text-faint)', marginLeft: 4 }}>{t.count}</span></button>)}
          </div>
          <div className="spacer" />
          <button className="btn btn-sm" style={{ height: 34 }}><Ic name="filter" size={13} /> Agente</button>
          <button className="btn btn-sm" style={{ height: 34 }}><Ic name="reports" size={13} /> Ordenar</button>
        </div>

        {/* Cards */}
        {filtered.length === 0 ? <EmptyState icon="funnel" title="Nenhum fluxo encontrado" desc="Ajuste os filtros ou crie um novo fluxo." /> :
          filtered.map((f) => <FlowRow key={f.id} flow={f} onOpen={onOpen} onToggle={onToggle} onEdit={onEdit} />)}
      </div>);
  }

  function FlowRow({ flow, onOpen, onToggle, onEdit }) {
    const ag = agentOf(flow.agent);
    const trendColor = flow.status === 'error' ? '#dc2626' : flow.status === 'paused' ? 'var(--text-faint)' : 'var(--accent)';

    return (
      <div className="card fai-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 24, alignItems: 'center' }}>

          {/* ── Left: identity + flow chips ───────────── */}
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 700, fontSize: 15.5, color: 'var(--text)', letterSpacing: '-.01em' }}>{flow.name}</div>
              <StatusPill s={flow.status} />
              {flow.status === 'running' && (
                <span style={{ fontSize: 11, color: 'var(--text-faint)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Ic name="clock" size={11} /> {flow.lastRun}
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: 720 }}>{flow.desc}</div>

            {/* Flow chain (Gatilho → IA → Ação) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="fai-step">
                <Ic name="zap" size={11} style={{ color: '#f59e0b' }} />
                {flow.trigger.label}
              </span>
              <span className="fai-conn"><Ic name="chevron-right" size={12} /></span>
              <span className="fai-step" style={{ background: 'var(--ai-soft)', borderColor: 'color-mix(in oklab, var(--ai) 24%, var(--border))', color: 'var(--ai-strong)' }}>
                <Ic name="sparkles" size={11} />
                Análise IA · {flow.analysis.length} sinais
              </span>
              <span className="fai-conn"><Ic name="chevron-right" size={12} /></span>
              <span className="fai-step" style={{ background: 'color-mix(in oklab, var(--accent) 10%, white)', borderColor: 'color-mix(in oklab, var(--accent) 28%, var(--border))', color: 'var(--accent-700)' }}>
                <Ic name="send" size={11} />
                {flow.action.label}
              </span>
            </div>

            {/* Agent + memory tip */}
            <div className="row" style={{ gap: 14, alignItems: 'center', paddingTop: 4, borderTop: '1px dashed var(--border)', flexWrap: 'wrap' }}>
              <AgentChip agent={ag} />
              <div style={{ width: 1, height: 22, background: 'var(--border)' }} />
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                <Ic name="sparkles" size={11} style={{ color: 'var(--ai)', flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <strong style={{ color: 'var(--text)', fontWeight: 600 }}>Memória:</strong> {flow.memory}
                </span>
              </div>
            </div>
          </div>

          {/* ── Right: KPIs + score + actions ─────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'center' }}>
              <Mini label="Contatos" value={fmtN(flow.kpis.contacts)} />
              <Mini label="Conversão" value={pct(flow.kpis.rate)} highlight />
              <Mini label="Receita" value={fmtBRL(flow.kpis.revenue)} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <ScoreRing score={flow.kpis.score} size={42} />
                <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Score IA</span>
              </div>
            </div>

            {/* Sparkline */}
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-faint)', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 2 }}>
                <span>Últimos 14 dias</span>
                <span>{fmtN(flow.kpis.conversions)} conversões</span>
              </div>
              <Sparkline data={flow.trend} color={trendColor} height={24} />
            </div>

            <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
              <button className="btn btn-sm" onClick={() => onOpen(flow)}><Ic name="eye" size={12} /> Ver detalhes</button>
              <button className="btn btn-ghost btn-icon" title="Editar fluxo" onClick={() => onEdit(flow.id)}><Ic name="edit" size={13} /></button>
              <button className="btn btn-ghost btn-icon" title={flow.status === 'paused' ? 'Retomar' : 'Pausar'} onClick={() => onToggle(flow.id)}>
                <Ic name={flow.status === 'paused' ? 'play' : 'pause'} size={13} />
              </button>
              <button className="btn btn-ghost btn-icon" title="Mais"><Ic name="more-vert" size={14} /></button>
            </div>
          </div>
        </div>
      </div>);
  }

  function Mini({ label, value, highlight }) {
    return (
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{label}</div>
        <div className="tnum" style={{ fontSize: 17, fontWeight: 700, color: highlight ? 'var(--accent-700)' : 'var(--text)', letterSpacing: '-.02em', marginTop: 2, whiteSpace: 'nowrap' }}>{value}</div>
      </div>);
  }

  // ─────────────────────────────────────────────────────────────────────
  //  AgentsGrid
  // ─────────────────────────────────────────────────────────────────────

  function AgentsGrid({ agents, flows, onEdit }) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        <AddCard title="Criar novo agente" subtitle="Defina personalidade, objetivo e estratégia. A IA aprende com cada interação." onClick={onEdit} style={{ minHeight: 320 }} />
        {agents.map((a) => {
          const inFlows = flows.filter((f) => f.agent === a.id);
          const grad = `linear-gradient(135deg, oklch(0.72 .15 ${a.hue}) 0%, oklch(0.55 .18 ${(a.hue + 35) % 360}) 100%)`;
          return (
            <div key={a.id} className="card fai-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '18px 18px 14px', background: grad, color: 'white', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, opacity: .18, backgroundImage: 'radial-gradient(circle at 80% 20%, white 0, transparent 50%), radial-gradient(circle at 20% 80%, white 0, transparent 50%)' }} />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 54, height: 54, borderRadius: 16,
                    background: 'rgba(255,255,255,.22)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, fontWeight: 700, color: 'white',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.3)'
                  }}>{a.name[0]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.01em', lineHeight: 1.15 }}>{a.name}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', opacity: .85, marginTop: 4 }}>
                      Agente · {a.role}
                    </div>
                  </div>
                  <span style={{ fontSize: 10.5, padding: '3px 8px', borderRadius: 999, background: 'rgba(255,255,255,.25)', fontWeight: 700 }}>
                    {inFlows.length} {inFlows.length === 1 ? 'fluxo' : 'fluxos'}
                  </span>
                </div>
              </div>

              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Objetivo</div>
                  <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 4, lineHeight: 1.45 }}>{a.objective}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <FieldChip label="Tom de voz" value={a.tone} />
                  <FieldChip label="Canais" value={a.channels.map((c) => c === 'whatsapp' ? 'WhatsApp' : 'E-mail').join(' · ')} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Estratégia</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>{a.strategy}</div>
                </div>
                <div className="spacer" />
                <div className="row" style={{ gap: 6, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                  <button className="btn btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={onEdit}><Ic name="settings" size={12} /> Configurar</button>
                  <button className="btn btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={onEdit}><Ic name="plus" size={12} /> Usar em fluxo</button>
                </div>
              </div>
            </div>);
        })}
      </div>);
  }

  function FieldChip({ label, value }) {
    return (
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 4, fontWeight: 600 }}>{value}</div>
      </div>);
  }

  // ─────────────────────────────────────────────────────────────────────
  //  LogsTimeline — activity stream
  // ─────────────────────────────────────────────────────────────────────

  function LogsTimeline({ logs, flows }) {
    const kindMap = {
      send:     { icon: 'send',     color: '#16a34a', label: 'Envio' },
      decision: { icon: 'sparkles', color: '#6d57ff', label: 'Decisão IA' },
      tag:      { icon: 'tag',      color: '#0ea5e9', label: 'Tag' },
      error:    { icon: 'alert',    color: '#dc2626', label: 'Erro' },
      reply:    { icon: 'chat',     color: '#0ea5e9', label: 'Resposta' },
      task:     { icon: 'check',    color: '#7c3aed', label: 'Tarefa criada' }
    };

    return (
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Ic name="history" size={14} style={{ color: 'var(--ai)' }} />
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>Histórico de execução · em tempo real</div>
          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 999, background: 'color-mix(in oklab, #16a34a 14%, white)', color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', animation: 'flowAiPulse 1.8s infinite' }} />
            ao vivo
          </span>
          <div className="spacer" />
          <button className="btn btn-sm"><Ic name="filter" size={12} /> Filtrar</button>
          <button className="btn btn-sm" onClick={() => window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Logs exportados', descricao: 'O histórico de execução foi baixado.' })}><Ic name="download" size={12} /> Exportar logs</button>
        </div>
        <div style={{ padding: '4px 0' }}>
          {logs.map((l, i) => {
            const k = kindMap[l.kind] || kindMap.send;
            const flow = flows.find((f) => f.id === l.flow);
            const agent = agentOf(l.agent);
            return (
              <div key={l.id} style={{
                display: 'grid', gridTemplateColumns: '64px 32px minmax(0, 1fr) auto',
                gap: 12, padding: '12px 18px',
                borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                alignItems: 'center'
              }}>
                <span className="tnum mono" style={{ fontSize: 11.5, color: 'var(--text-faint)', fontWeight: 600 }}>{l.t}</span>
                <span style={{
                  width: 28, height: 28, borderRadius: 9,
                  background: `color-mix(in oklab, ${k.color} 14%, white)`,
                  color: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}><Ic name={k.icon} size={13} /></span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>{l.text}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 11, color: 'var(--text-faint)' }}>
                    <span style={{ fontWeight: 600 }}>{k.label}</span>
                    <span>·</span>
                    <span>{flow ? flow.name : l.flow}</span>
                    {agent && (<><span>·</span><AgentChip agent={agent} withName={false} size={16} /><span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{agent.name}</span></>)}
                  </div>
                </div>
                <span style={{
                  fontSize: 10.5, padding: '3px 8px', borderRadius: 999, fontWeight: 700,
                  background: l.outcome === 'ok'   ? 'color-mix(in oklab, #16a34a 12%, white)' :
                              l.outcome === 'err'  ? 'color-mix(in oklab, #dc2626 12%, white)' :
                              l.outcome === 'skip' ? 'var(--surface-3)' :
                                                     'color-mix(in oklab, #f59e0b 14%, white)',
                  color: l.outcome === 'ok'   ? '#16a34a' :
                         l.outcome === 'err'  ? '#dc2626' :
                         l.outcome === 'skip' ? 'var(--text-muted)' :
                                                '#92400e'
                }}>
                  {l.outcome === 'ok' ? 'OK' : l.outcome === 'err' ? 'erro' : l.outcome === 'skip' ? 'pulado' : 'aguardando'}
                </span>
              </div>);
          })}
        </div>
      </div>);
  }

  // ─────────────────────────────────────────────────────────────────────
  //  PerformanceView — global perf panel
  // ─────────────────────────────────────────────────────────────────────

  function PerformanceView({ flows }) {
    const top = [...flows].sort((a, b) => b.kpis.revenue - a.kpis.revenue).slice(0, 5);

    const hours = ['00','03','06','09','12','15','18','21'];
    const heatmap = hours.map((h, i) => {
      const v = Math.round(Math.abs(Math.sin((i + 1) * 0.9) * 0.5 + Math.cos(i * 1.3) * 0.4 + 0.4) * 100);
      return { h, v };
    });
    const maxH = Math.max(...heatmap.map((h) => h.v));

    const totalRev = flows.reduce((s, f) => s + f.kpis.revenue, 0);

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Top performers */}
          <div className="card" style={{ padding: 18 }}>
            <div className="row" style={{ alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Ic name="star" size={14} style={{ color: '#f59e0b' }} />
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>Top fluxos por receita</div>
              <div className="spacer" />
              <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>últimos 30 dias</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {top.map((f, i) => {
                const w = (f.kpis.revenue / top[0].kpis.revenue) * 100;
                return (
                  <div key={f.id} style={{ display: 'grid', gridTemplateColumns: '20px minmax(0,1fr) 100px 110px', gap: 14, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-faint)', textAlign: 'center' }}>#{i + 1}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
                      <div style={{ height: 6, marginTop: 6, borderRadius: 999, background: 'var(--surface-3)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${w}%`, background: 'linear-gradient(90deg, var(--accent), var(--ai))', borderRadius: 999, transition: 'width .5s' }} />
                      </div>
                    </div>
                    <div className="tnum" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', textAlign: 'right' }}>{fmtBRL(f.kpis.revenue)}</div>
                    <div className="tnum" style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-700)', textAlign: 'right' }}>{pct(f.kpis.rate)} conv</div>
                  </div>);
              })}
            </div>
          </div>

          {/* Best hour heatmap */}
          <div className="card" style={{ padding: 18 }}>
            <div className="row" style={{ alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Ic name="clock" size={14} style={{ color: 'var(--ai)' }} />
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>Melhores horários de resposta</div>
              <div className="spacer" />
              <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>aprendizado do agente</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${hours.length}, 1fr)`, gap: 6, alignItems: 'end', height: 120 }}>
              {heatmap.map((h, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                    <div style={{
                      width: '100%', height: `${(h.v / maxH) * 100}%`,
                      background: `linear-gradient(180deg, color-mix(in oklab, var(--ai) ${Math.round(h.v * 0.7)}%, var(--surface-3)), var(--accent))`,
                      borderRadius: 8,
                      transition: 'height .4s'
                    }} />
                  </div>
                  <span style={{ fontSize: 10.5, color: 'var(--text-faint)', fontWeight: 600 }}>{h.h}h</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--ai-soft)', border: '1px solid color-mix(in oklab, var(--ai) 24%, var(--border))', borderRadius: 10, color: 'var(--ai-strong)', fontSize: 12.5, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Ic name="sparkles" size={13} style={{ marginTop: 2, flexShrink: 0 }} />
              <span>A IA detectou que <strong>19h-21h</strong> tem 2,1× mais resposta no segmento de recompra. Os fluxos foram ajustados automaticamente.</span>
            </div>
          </div>
        </div>

        {/* Right: summary card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ padding: 18, background: 'linear-gradient(135deg, color-mix(in oklab, var(--ai) 8%, var(--surface)), var(--surface))', borderColor: 'color-mix(in oklab, var(--ai) 22%, var(--border))' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai-strong)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Resumo do agente</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', marginTop: 8, letterSpacing: '-.02em' }} className="tnum">{fmtBRL(totalRev)}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Receita total gerada pela IA · 30 dias</div>
            <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <PerfMini label="ROI estimado" value="8,4×" />
              <PerfMini label="Tempo poupado" value="142 h" />
              <PerfMini label="Mensagens IA" value="4.286" />
              <PerfMini label="Taxa de resposta" value="64,2%" />
            </div>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div className="row" style={{ alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Ic name="package" size={13} style={{ color: 'var(--accent-700)' }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Produtos com maior conversão</div>
            </div>
            {[
              { p: 'Esmalte Premium · Linha Gel',   v: 0.34, rev: 28430 },
              { p: 'Kit Top Coat',                  v: 0.27, rev: 18920 },
              { p: 'Shampoo Reparação Total',       v: 0.22, rev: 14380 },
              { p: 'Máscara Hidratação Profunda',   v: 0.18, rev: 9240 }
            ].map((it, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>#{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.p}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{fmtBRL(it.rev)}</div>
                </div>
                <span className="tnum" style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-700)' }}>{pct(it.v)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>);
  }

  function PerfMini({ label, value }) {
    return (
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{label}</div>
        <div className="tnum" style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginTop: 2, letterSpacing: '-.01em' }}>{value}</div>
      </div>);
  }

  // ─────────────────────────────────────────────────────────────────────
  //  FlowDetailDrawer — read-only deep dive for one flow
  // ─────────────────────────────────────────────────────────────────────

  function FlowDetailDrawer({ flow, onClose, onEdit }) {
    const ag = agentOf(flow.agent);
    return (
      <Drawer
        width={720}
        onClose={onClose}
        title={flow.name}
        subtitle={`Agente: ${ag ? ag.name : '—'} · ${ag ? ag.role : ''}`}
        leftHead={<span style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--ai-soft)', color: 'var(--ai-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic name="funnel" size={16} /></span>}
        belowHead={
          <div style={{ padding: '10px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-2)' }}>
            <StatusPill s={flow.status} size="md" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Última execução {flow.lastRun}</span>
            <div className="spacer" />
            <button className="btn btn-sm" onClick={onEdit}><Ic name="edit" size={12} /> Editar fluxo</button>
            <button className="btn btn-sm"><Ic name={flow.status === 'paused' ? 'play' : 'pause'} size={12} /> {flow.status === 'paused' ? 'Retomar' : 'Pausar'}</button>
          </div>
        }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Big KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            <BigKPI label="Contatos" value={fmtN(flow.kpis.contacts)} />
            <BigKPI label="Conversão" value={pct(flow.kpis.rate)} accent />
            <BigKPI label="Receita" value={fmtBRL(flow.kpis.revenue)} />
            <BigKPI label="Vendas IA" value={fmtN(flow.kpis.conversions)} />
          </div>

          {/* Score + trend */}
          <div className="card" style={{ padding: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
            <ScoreRing score={flow.kpis.score} size={68} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Score de conversão previsto</div>
              <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 4 }}>
                A IA estima <strong>{flow.kpis.score}/100</strong> de chance de o próximo ciclo deste fluxo bater a meta de conversão. {flow.kpis.score >= 75 ? 'Acima do esperado.' : flow.kpis.score >= 50 ? 'Dentro do esperado.' : 'Reveja o gatilho ou agente.'}
              </div>
            </div>
          </div>

          {/* Trigger / AI / Action breakdown */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 12 }}>Etapas do fluxo</div>
            <StepBlock idx={1} icon="zap" color="#f59e0b" title="Gatilho" body={flow.trigger.label} sub={flow.trigger.detail} />
            <StepConn />
            <StepBlock idx={2} icon="sparkles" color="var(--ai)" title="Análise IA" body={flow.analysis.join(' · ')} sub={`A IA cruza ${flow.analysis.length} sinais antes de decidir abordar`} />
            <StepConn />
            <StepBlock idx={3} icon="send" color="var(--accent)" title="Ação automática" body={flow.action.label} sub={`Canais: ${flow.action.channels.map((c) => c === 'whatsapp' ? 'WhatsApp' : 'E-mail').join(', ')}`} />
          </div>

          {/* Memory */}
          <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--ai-soft)', border: '1px solid color-mix(in oklab, var(--ai) 24%, var(--border))', display: 'flex', gap: 12 }}>
            <Ic name="sparkles" size={16} style={{ color: 'var(--ai)', marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai-strong)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Memória aprendida</div>
              <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 4, lineHeight: 1.5 }}>{flow.memory}</div>
            </div>
          </div>
        </div>
      </Drawer>);
  }

  function BigKPI({ label, value, accent }) {
    return (
      <div style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{label}</div>
        <div className="tnum" style={{ fontSize: 22, fontWeight: 800, color: accent ? 'var(--accent-700)' : 'var(--text)', marginTop: 4, letterSpacing: '-.02em' }}>{value}</div>
      </div>);
  }

  function StepBlock({ idx, icon, color, title, body, sub }) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '36px minmax(0, 1fr)', gap: 12, alignItems: 'flex-start' }}>
        <span style={{
          width: 36, height: 36, borderRadius: 10,
          background: `color-mix(in oklab, ${color} 14%, white)`, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative'
        }}>
          <Ic name={icon} size={15} />
          <span style={{ position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: '50%', background: 'var(--surface)', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: 'var(--text-muted)' }}>{idx}</span>
        </span>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{title}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>{body}</div>
          {sub && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
        </div>
      </div>);
  }
  function StepConn() {
    return <div style={{ width: 36, display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
      <span style={{ width: 1.5, height: 18, background: 'linear-gradient(180deg, var(--border-strong), var(--border))', borderRadius: 1 }} />
    </div>;
  }

  // Expose to global so app.jsx + builder file can use
  window.MarketingFlowAI = MarketingFlowAI;
  window.FlowAI = { AGENTS, FLOWS, agentOf, fmtBRL, fmtN, pct, StatusPill, AgentChip, ScoreRing, Sparkline, ChannelDots };
})();
