// marketing.jsx — Marketing module (Agente de Mkt + Campanhas)

(function () {

  // ─────────────────────────────────────────────────────────────────────
  //  Mock data
  // ─────────────────────────────────────────────────────────────────────

  const SUGGESTED_PROMPTS = [
    { icon: 'cart',      title: 'Quem comprou nos últimos 15 dias',     desc: 'Liste clientes, produtos, ticket e canal de origem.' },
    { icon: 'activity',  title: 'Padrões de consumo por região',        desc: 'Mostre frequência média e categorias preferidas.' },
    { icon: 'reports',   title: 'Ticket médio por canal',               desc: 'Comparativo WhatsApp, e-mail, loja e site.' },
    { icon: 'clock',     title: 'Clientes inativos há mais de 60 dias', desc: 'Segmente por LTV e fase do CRM para reativação.' },
    { icon: 'star',      title: 'Top 10 clientes por LTV',              desc: 'Receita acumulada, recompras e potencial estimado.' },
    { icon: 'funnel',    title: 'Potencial de recompra por produto',    desc: 'Identifique cohorts com janela de recompra aberta.' }
  ];

  const SAMPLE_THREAD = [
    {
      role: 'user',
      text: 'Quais clientes compraram "Esmalte Premium Linha Gel" nos últimos 15 dias? Quero entender o perfil pra montar uma campanha de cross-sell.'
    },
    {
      role: 'assistant',
      text: 'Encontrei **47 clientes** que compraram o Esmalte Premium Linha Gel entre 10 e 24/maio. Eis o recorte com os principais insights:',
      insights: [
        { label: 'Compradores no período', value: '47',        delta: '+18% vs. quinzena anterior', good: true },
        { label: 'Ticket médio',           value: 'R$ 312,80', delta: '+7,2%',                     good: true },
        { label: 'Recompra estimada',      value: '63%',       delta: 'janela de 45 dias',         good: null }
      ],
      table: {
        title: 'Top 5 compradores no período',
        cols: ['Cliente', 'Última compra', 'Ticket', 'LTV', 'Fase CRM'],
        rows: [
          ['Aurora Cosméticos',  '23 mai', 'R$ 1.840,00', 'R$ 12.430', 'Fechamento'],
          ['Studio Glam',         '22 mai', 'R$ 1.260,00', 'R$ 9.870',  'Qualificação'],
          ['Espaço Vitória',      '21 mai', 'R$ 980,00',   'R$ 7.310',  'Fechamento'],
          ['Beleza Natural ME',   '19 mai', 'R$ 720,00',   'R$ 4.560',  'Prospecção'],
          ['Lumière Estética',    '16 mai', 'R$ 640,00',   'R$ 3.290',  'Qualificação']
        ]
      },
      tip: 'Sugiro disparar uma campanha **Cross-sell — Kit Top Coat** segmentando esses 47 clientes via WhatsApp. Posso gerar o template já personalizado por fase do CRM, é só pedir.'
    }
  ];

  const CAMPAIGNS = [
    { id: 'c1', name: 'Reativação · Clientes inativos 60d',  channel: 'whatsapp', audience: 'CRM · Inativos',     status: 'active',    sent: 1240, open: 0.68, click: 0.34, conv: 0.12, scheduled: 'Em curso' },
    { id: 'c2', name: 'Cross-sell · Esmalte → Top Coat',     channel: 'whatsapp', audience: 'Compradores 15d',    status: 'scheduled', sent: 0,    open: 0,    click: 0,    conv: 0,    scheduled: '28 mai · 09h' },
    { id: 'c3', name: 'Boas-vindas · Novos leads',           channel: 'email',    audience: 'Tag · novo-lead',    status: 'active',    sent: 482,  open: 0.74, click: 0.41, conv: 0.18, scheduled: 'Fluxo contínuo' },
    { id: 'c4', name: 'Aniversariantes do mês · Maio',       channel: 'whatsapp', audience: 'Tag · aniversário',  status: 'completed', sent: 318,  open: 0.81, click: 0.52, conv: 0.27, scheduled: 'Concluída · 02 mai' },
    { id: 'c5', name: 'Black Friday Antecipada',             channel: 'email',    audience: 'Top 20% LTV',        status: 'draft',     sent: 0,    open: 0,    click: 0,    conv: 0,    scheduled: 'Rascunho' },
    { id: 'c6', name: 'Pós-venda · NPS automático',          channel: 'whatsapp', audience: 'CRM · Fechamento',   status: 'active',    sent: 96,   open: 0.92, click: 0.61, conv: 0.43, scheduled: 'Fluxo contínuo' },
    { id: 'c7', name: 'Recompra · janela 45 dias',           channel: 'whatsapp', audience: 'Padrão de recompra', status: 'paused',    sent: 540,  open: 0.55, click: 0.22, conv: 0.09, scheduled: 'Pausada' }
  ];

  const TEMPLATES = [
    { id: 't1', name: 'Cross-sell · Kit Top Coat',     channel: 'whatsapp', uses: 12, updated: '21 mai', preview: 'Oi {nome}! Vi que você ama o Esmalte Premium 💅 Para um acabamento perfeito, conheça o nosso Top Coat exclusivo…' },
    { id: 't2', name: 'Reativação · Sentimos sua falta', channel: 'whatsapp', uses: 28, updated: '18 mai', preview: 'Faz tempo que a gente não te vê, {nome}. Preparamos um cupom especial de 15% — válido até domingo.' },
    { id: 't3', name: 'Boas-vindas · Novos leads',     channel: 'email',    uses: 41, updated: '02 mai', preview: 'Bem-vinda à família, {nome}! Comece pelos kits mais amados pela nossa comunidade…' },
    { id: 't4', name: 'Aniversário · Cupom 20%',       channel: 'whatsapp', uses: 64, updated: '01 mai', preview: 'Feliz aniversário, {nome}! 🎉 Liberamos um cupom de 20% só pra você — válido por 7 dias.' },
    { id: 't5', name: 'NPS Pós-venda',                 channel: 'whatsapp', uses: 96, updated: '12 mai', preview: 'De 0 a 10, o quanto você indicaria {empresa} para uma amiga?' },
    { id: 't6', name: 'Black Friday Prévia',           channel: 'email',    uses: 4,  updated: '20 mai', preview: 'Acesso antecipado: as ofertas que separamos pra você começam 24h antes…' }
  ];

  const FLOWS = [
    { id: 'f1', name: 'Onboarding · novo cliente',  steps: ['Bem-vindas', 'Indicação produto', 'Cupom 10%', 'Pedido feedback'],  trigger: 'Tag · novo-lead',     active: true },
    { id: 'f2', name: 'Recompra · janela 45 dias',  steps: ['Lembrete D-7', 'Sugestão produto', 'Cupom 15% D-2'],                 trigger: 'Padrão de recompra',  active: true },
    { id: 'f3', name: 'Reativação · inativos 60d',  steps: ['Sentimos sua falta', 'Pesquisa rápida', 'Oferta personalizada'],     trigger: 'CRM · Inativos',      active: true },
    { id: 'f4', name: 'NPS pós-venda',              steps: ['NPS', 'Agradecimento', 'Pedido de review'],                          trigger: 'CRM · Fechamento',    active: false }
  ];

  // ─────────────────────────────────────────────────────────────────────
  //  Shared bits
  // ─────────────────────────────────────────────────────────────────────

  const ChannelChip = ({ kind }) => {
    const map = {
      whatsapp: { icon: 'whatsapp', label: 'WhatsApp', color: '#16A34A', bg: '#DCFCE7' },
      email:    { icon: 'mail',     label: 'E-mail',   color: '#1D4ED8', bg: '#DBEAFE' },
      sms:      { icon: 'phone',    label: 'SMS',      color: '#7C3AED', bg: '#EDE9FE' }
    };
    const m = map[kind] || map.email;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 999, background: m.bg, color: m.color, fontSize: 11, fontWeight: 700 }}>
        <Ic name={m.icon} size={11} />{m.label}
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

  const pct = (n) => `${(n * 100).toFixed(0)}%`;

  // ─────────────────────────────────────────────────────────────────────
  //  MarketingAgent — chat with the AI marketing agent
  // ─────────────────────────────────────────────────────────────────────

  function MarketingAgent() {
    const [thread, setThread] = React.useState([]);
    const [input, setInput] = React.useState('');
    const [thinking, setThinking] = React.useState(false);
    const scrollRef = React.useRef(null);

    React.useEffect(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [thread, thinking]);

    const send = (text) => {
      const q = (text ?? input).trim();
      if (!q) return;
      setInput('');
      setThread((t) => [...t, { role: 'user', text: q }]);
      setThinking(true);
      // Simulated response
      setTimeout(() => {
        setThinking(false);
        setThread((t) => [...t, SAMPLE_THREAD[1]]);
      }, 1100);
    };

    const reset = () => { setThread([]); setInput(''); };

    const recent = [
      'Top 10 clientes por LTV',
      'Compras de Esmalte nos últimos 15 dias',
      'Clientes inativos há 60+ dias',
      'Ticket médio por canal · maio',
      'Cohort recompra Linha Capilar',
      'Tags mais frequentes nos leads quentes'
    ];

    return (
      <Page
        title="Agente de Marketing"
        subtitle="Pergunte em linguagem natural — o agente acessa CRM, vendas, agenda e histórico para gerar insights."
        actions={
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-sm" onClick={reset}><Ic name="plus" size={14} /> Nova consulta</button>
            <button className="btn btn-sm"><Ic name="reports" size={14} /> Exportar relatório</button>
          </div>
        }
        padded={false}>
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: 0 }}>

          {/* Left rail · histórico */}
          <aside style={{ borderRight: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Consultas recentes</div>
            </div>
            <div className="scroll" style={{ flex: 1, overflow: 'auto', padding: 8 }}>
              {recent.map((r, i) =>
                <div key={i} onClick={() => send(r)} style={{
                  padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  fontSize: 13, color: 'var(--text)', lineHeight: 1.35,
                  display: 'flex', alignItems: 'flex-start', gap: 8
                }} className="mkt-recent">
                  <Ic name="search" size={12} style={{ color: 'var(--text-faint)', marginTop: 3, flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r}</span>
                </div>)}
            </div>
            <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--ai-soft)', color: 'var(--ai-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ic name="sparkles" size={14} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>Conectado</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>CRM · Vendas · Agenda</div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main · chat */}
          <section style={{ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
            <div ref={scrollRef} className="scroll" style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>
              {thread.length === 0 ?
                <Welcome onPick={(p) => send(p)} /> :
                <Thread thread={thread} thinking={thinking} />}
            </div>

            {/* Composer */}
            <div style={{ borderTop: '1px solid var(--border)', padding: '14px 28px', background: 'var(--surface)' }}>
              <div style={{
                display: 'flex', alignItems: 'flex-end', gap: 10,
                border: '1px solid var(--border-strong)', borderRadius: 14, padding: '8px 8px 8px 14px',
                background: 'var(--surface)',
                boxShadow: '0 1px 2px rgba(15,23,42,.04)'
              }}>
                <Ic name="sparkles" size={16} style={{ color: 'var(--ai-strong)', marginBottom: 8, flexShrink: 0 }} />
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Pergunte algo sobre clientes, vendas, padrões de consumo, potencial de recompra…"
                  rows={1}
                  style={{
                    flex: 1, border: 'none', outline: 'none', resize: 'none',
                    background: 'transparent', font: 'inherit', color: 'var(--text)',
                    padding: '8px 0', minHeight: 22, maxHeight: 140, lineHeight: 1.5
                  }} />
                <div className="row" style={{ gap: 4 }}>
                  <button className="btn btn-ghost btn-icon" title="Anexar arquivo"><Ic name="paperclip" size={16} /></button>
                  <button className="btn btn-primary btn-icon" onClick={() => send()} disabled={!input.trim()} title="Enviar">
                    <Ic name="send" size={15} />
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 8, textAlign: 'center' }}>
                As respostas são geradas com base nos dados reais do seu CRM · revise antes de tomar decisões críticas.
              </div>
            </div>
          </section>
        </div>

        <style>{`
          .mkt-recent:hover { background: var(--surface-3); }
        `}</style>
      </Page>);
  }

  // — Welcome state ———————————————————————————

  function Welcome({ onPick }) {
    return (
      <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28, paddingTop: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, var(--ai), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
            boxShadow: '0 8px 24px -8px color-mix(in oklab, var(--ai) 45%, transparent)'
          }}>
            <Ic name="sparkles" size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', margin: 0, letterSpacing: '-.02em' }}>
              Como posso ajudar com sua estratégia hoje?
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '6px 0 0', maxWidth: 560, lineHeight: 1.5 }}>
              Faça perguntas em linguagem natural sobre clientes, vendas, agendamentos e padrões de consumo.
              Eu cruzo os dados e retorno insights prontos para virar campanha.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {SUGGESTED_PROMPTS.map((s, i) =>
            <div key={i} onClick={() => onPick(s.title)} className="mkt-prompt-card" style={{
              border: '1px solid var(--border)', borderRadius: 12, padding: '14px 14px',
              background: 'var(--surface)', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: 8,
              transition: 'transform .15s ease, border-color .15s ease, box-shadow .15s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'var(--ai-soft)', color: 'var(--ai-strong)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Ic name={s.icon} size={14} />
                </span>
                <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>{s.title}</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.45 }}>{s.desc}</div>
            </div>)}
        </div>

        <style>{`
          .mkt-prompt-card:hover {
            transform: translateY(-2px);
            border-color: color-mix(in oklab, var(--ai) 40%, var(--border));
            box-shadow: 0 10px 24px -12px color-mix(in oklab, var(--ai) 25%, transparent);
          }
        `}</style>
      </div>);
  }

  // — Chat thread ————————————————————————————

  function Thread({ thread, thinking }) {
    return (
      <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {thread.map((m, i) => m.role === 'user' ? <UserMsg key={i} m={m} /> : <AssistantMsg key={i} m={m} />)}
        {thinking && <ThinkingBubble />}
      </div>);
  }

  function UserMsg({ m }) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          maxWidth: '75%',
          background: 'var(--accent)', color: 'white',
          padding: '10px 14px', borderRadius: '14px 14px 4px 14px',
          fontSize: 14, lineHeight: 1.5,
          boxShadow: '0 1px 2px rgba(15,23,42,.06)'
        }}>{m.text}</div>
      </div>);
  }

  function AssistantMsg({ m }) {
    return (
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'linear-gradient(135deg, var(--ai), var(--accent))',
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          boxShadow: '0 4px 12px -4px color-mix(in oklab, var(--ai) 40%, transparent)'
        }}>
          <Ic name="sparkles" size={15} />
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <RichText text={m.text} />
          {m.insights && <InsightsRow items={m.insights} />}
          {m.table && <ResultTable t={m.table} />}
          {m.tip && (
            <div style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              padding: '10px 14px', borderRadius: 10,
              background: 'var(--ai-soft)', border: '1px solid color-mix(in oklab, var(--ai) 22%, var(--border))',
              color: 'var(--ai-strong)', fontSize: 13, lineHeight: 1.5
            }}>
              <Ic name="sparkles" size={14} style={{ marginTop: 2, flexShrink: 0 }} />
              <RichText text={m.tip} />
            </div>)}
          <div className="row" style={{ gap: 4, color: 'var(--text-faint)' }}>
            <button className="btn btn-ghost btn-sm" title="Copiar"><Ic name="file" size={12} /> Copiar</button>
            <button className="btn btn-ghost btn-sm" title="Criar campanha"><Ic name="zap" size={12} /> Criar campanha</button>
            <button className="btn btn-ghost btn-sm" title="Exportar"><Ic name="reports" size={12} /> Exportar</button>
          </div>
        </div>
      </div>);
  }

  function ThinkingBubble() {
    return (
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'linear-gradient(135deg, var(--ai), var(--accent))',
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <Ic name="sparkles" size={15} />
        </div>
        <div style={{ display: 'inline-flex', gap: 4, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 12 }}>
          <span className="mkt-dot" /><span className="mkt-dot" /><span className="mkt-dot" />
        </div>
        <style>{`
          .mkt-dot {
            width: 6px; height: 6px; border-radius: 50%;
            background: var(--ai); opacity: .4;
            animation: mktBlink 1.2s infinite ease-in-out;
          }
          .mkt-dot:nth-child(2) { animation-delay: .15s; }
          .mkt-dot:nth-child(3) { animation-delay: .3s; }
          @keyframes mktBlink { 0%, 80%, 100% { opacity: .25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-3px); } }
        `}</style>
      </div>);
  }

  function RichText({ text }) {
    // Minimal **bold** rendering
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return (
      <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--text)' }}>
        {parts.map((p, i) => p.startsWith('**') && p.endsWith('**')
          ? <strong key={i} style={{ color: 'var(--text)', fontWeight: 700 }}>{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>)}
      </div>);
  }

  function InsightsRow({ items }) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, gap: 10 }}>
        {items.map((it, i) =>
          <div key={i} style={{
            border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px',
            background: 'var(--surface)'
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{it.label}</div>
            <div className="tnum" style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginTop: 4, letterSpacing: '-.02em' }}>{it.value}</div>
            <div style={{ fontSize: 11.5, color: it.good === true ? 'var(--accent-700)' : it.good === false ? '#9f1239' : 'var(--text-faint)', marginTop: 2, fontWeight: 600 }}>{it.delta}</div>
          </div>)}
      </div>);
  }

  function ResultTable({ t }) {
    return (
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--surface)' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.02em' }}>{t.title}</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                {t.cols.map((c, i) =>
                  <th key={i} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '8px 14px', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.04em' }}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {t.rows.map((r, i) =>
                <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                  {r.map((c, j) =>
                    <td key={j} className={j > 0 && j < 4 ? 'tnum' : ''} style={{ padding: '10px 14px', textAlign: j === 0 ? 'left' : 'right', color: j === 0 ? 'var(--text)' : 'var(--text-muted)', fontWeight: j === 0 ? 600 : 500 }}>{c}</td>)}
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>);
  }

  // ─────────────────────────────────────────────────────────────────────
  //  MarketingCampaigns — campaigns + templates + flows
  // ─────────────────────────────────────────────────────────────────────

  function MarketingCampaigns() {
    const [tab, setTab] = React.useState('campaigns');
    const [showNew, setShowNew] = React.useState(false);
    const [campaignInitial, setCampaignInitial] = React.useState(null);
    const [viewing, setViewing] = React.useState(null);
    const [campaigns, setCampaigns] = React.useState(CAMPAIGNS);
    const [templates, setTemplates] = React.useState(TEMPLATES);
    const [flows, setFlows] = React.useState(FLOWS);
    const [editingTemplate, setEditingTemplate] = React.useState(null); // {} for new, template obj for edit, null = closed

    const duplicateCampaign = (c) => {
      const copy = {
        ...c,
        id: 'c' + Date.now(),
        name: c.name + ' (cópia)',
        status: 'draft',
        sent: 0, open: 0, click: 0, conv: 0,
        scheduled: 'Rascunho'
      };
      setCampaigns((prev) => [copy, ...prev]);
    };

    const toggleStatus = (c, newStatus) => {
      const next = { ...c, status: newStatus };
      if (newStatus === 'active' && c.status === 'scheduled') next.scheduled = 'Em curso';
      if (newStatus === 'paused')                              next.scheduled = 'Pausada';
      if (newStatus === 'active' && c.status === 'paused')    next.scheduled = 'Em curso';
      setCampaigns((prev) => prev.map((x) => x.id === c.id ? next : x));
      setViewing(next);
    };

    const openNewCampaign = (initial) => {
      setCampaignInitial(initial || null);
      setShowNew(true);
    };

    // ── Template handlers ──
    const editTemplate     = (t) => setEditingTemplate(t);
    const newTemplate      = ()  => setEditingTemplate({}); // empty obj = new
    const saveTemplate     = (t) => {
      setTemplates((prev) => {
        const i = prev.findIndex((x) => x.id === t.id);
        return i >= 0 ? prev.map((x) => x.id === t.id ? t : x) : [t, ...prev];
      });
    };
    const duplicateTemplate = (t) => {
      const copy = { ...t, id: 't' + Date.now(), name: t.name + ' (cópia)', uses: 0, updated: 'agora' };
      setTemplates((prev) => [copy, ...prev]);
    };
    const useTemplate = (t) => {
      openNewCampaign({
        name: t.name,
        channel: t.channel,
        body: t.preview,
        headline: t.subject || '',
        cta: t.cta || 'Saiba mais',
        templateId: t.id,
        startStep: 2 // jump straight to "Mensagem"
      });
    };

    // ── Flow handlers ──
    const toggleFlow = (id) => setFlows((prev) => prev.map((f) => f.id === id ? { ...f, active: !f.active } : f));

    const summary = {
      active: campaigns.filter((c) => c.status === 'active').length,
      sent: campaigns.reduce((s, c) => s + c.sent, 0),
      avgOpen: (() => {
        const sent = campaigns.filter((c) => c.sent > 0);
        return sent.length ? sent.reduce((s, c) => s + c.open, 0) / sent.length : 0;
      })(),
      conv: campaigns.reduce((s, c) => s + Math.round(c.sent * c.conv), 0)
    };

    return (
      <Page
        title="Campanhas"
        subtitle="Crie disparos automáticos, gerencie templates e fluxos de follow-up segmentados pelo CRM."
        actions={
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-sm"><Ic name="reports" size={14} /> Exportar</button>
            <button className="fin-new-btn" onClick={() => openNewCampaign()} aria-label="Nova campanha"><span className="fin-new-label">{'Nova campanha\u00A0'}</span><span className="fin-new-plus" style={{ width: "38px", height: "38px" }}><Ic name="plus" size={18} /></span></button>
          </div>
        }>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
          <Stat label="Campanhas ativas" value={summary.active} icon="zap" accent={{ bg: 'var(--accent-soft)', fg: 'var(--accent-700)' }} foot={<span>de {campaigns.length} no total</span>} />
          <Stat label="Mensagens enviadas" value={summary.sent.toLocaleString('pt-BR')} icon="send" foot={<span style={{ color: 'var(--accent-700)' }}>+12% vs. mês passado</span>} />
          <Stat label="Taxa de abertura média" value={pct(summary.avgOpen)} icon="mail" foot={<span>meta: 65%</span>} />
          <Stat label="Conversões geradas" value={summary.conv.toLocaleString('pt-BR')} icon="check" accent={{ bg: 'var(--ai-soft)', fg: 'var(--ai-strong)' }} foot={<span>nos últimos 30 dias</span>} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
          {[
            { id: 'campaigns', label: 'Campanhas', icon: 'zap' },
            { id: 'templates', label: 'Templates', icon: 'file-text' },
            { id: 'flows',     label: 'Fluxos de follow-up', icon: 'funnel' }
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

        {tab === 'campaigns' && <CampaignsTable rows={campaigns} onNew={() => openNewCampaign()} onOpen={(c) => setViewing(c)} />}
        {tab === 'templates' && <TemplatesGrid items={templates} onEdit={editTemplate} onUse={useTemplate} onDuplicate={duplicateTemplate} onNew={newTemplate} />}
        {tab === 'flows'     && <FlowsList items={flows} onToggle={toggleFlow} />}

        {showNew && window.NewCampaignDrawer && <window.NewCampaignDrawer initial={campaignInitial} onClose={() => { setShowNew(false); setCampaignInitial(null); }} />}
        {editingTemplate !== null && window.TemplateEditorDrawer &&
          <window.TemplateEditorDrawer
            template={editingTemplate && editingTemplate.id ? editingTemplate : null}
            onClose={() => setEditingTemplate(null)}
            onSave={saveTemplate} />}
        {viewing && window.CampaignDetailDrawer &&
          <window.CampaignDetailDrawer
            campaign={viewing}
            onClose={() => setViewing(null)}
            onDuplicate={duplicateCampaign}
            onToggleStatus={toggleStatus} />}
      </Page>);
  }

  function CampaignsTable({ rows, onNew, onOpen }) {
    const [q, setQ] = React.useState('');
    const [statusFilter, setStatusFilter]   = React.useState([]); // multi
    const [channelFilter, setChannelFilter] = React.useState([]); // multi
    const [segmentFilter, setSegmentFilter] = React.useState([]); // multi
    const [openMenu, setOpenMenu] = React.useState(null); // 'status' | 'channel' | 'segment' | null
    const menuRef = React.useRef(null);

    React.useEffect(() => {
      const onDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null); };
      document.addEventListener('mousedown', onDown);
      return () => document.removeEventListener('mousedown', onDown);
    }, []);

    const toggleIn = (setter) => (id) => setter((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

    const statusOpts  = [
      { id: 'active',    label: 'Ativa' },
      { id: 'scheduled', label: 'Agendada' },
      { id: 'completed', label: 'Concluída' },
      { id: 'draft',     label: 'Rascunho' },
      { id: 'paused',    label: 'Pausada' }
    ];
    const channelOpts = [
      { id: 'whatsapp', label: 'WhatsApp' },
      { id: 'email',    label: 'E-mail' },
      { id: 'sms',      label: 'SMS' }
    ];
    const segmentOpts = Array.from(new Set(rows.map((r) => r.audience))).map((a) => ({ id: a, label: a }));

    const filtered = rows.filter((r) => {
      if (q && !(r.name + ' ' + r.audience).toLowerCase().includes(q.trim().toLowerCase())) return false;
      if (statusFilter.length  && !statusFilter.includes(r.status))   return false;
      if (channelFilter.length && !channelFilter.includes(r.channel)) return false;
      if (segmentFilter.length && !segmentFilter.includes(r.audience)) return false;
      return true;
    });

    const hasFilters = q || statusFilter.length || channelFilter.length || segmentFilter.length;
    const clearAll = () => { setQ(''); setStatusFilter([]); setChannelFilter([]); setSegmentFilter([]); setOpenMenu(null); };

    const FilterButton = ({ id, icon, label, count }) => (
      <button
        className="btn btn-sm"
        onClick={() => setOpenMenu(openMenu === id ? null : id)}
        style={count ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)', color: 'var(--accent-700)' } : {}}>
        <Ic name={icon} size={13} /> {label}
        {count > 0 && (
          <span style={{
            marginLeft: 4, padding: '0 6px', borderRadius: 999,
            background: 'var(--accent)', color: 'white',
            fontSize: 10.5, fontWeight: 700, minWidth: 16, height: 16,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
          }}>{count}</span>
        )}
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2 }}><path d="m6 9 6 6 6-6" /></svg>
      </button>
    );

    const FilterMenu = ({ options, value, onToggle, onClear }) => (
      <div style={{
        position: 'absolute', top: 'calc(100% + 6px)', left: 0,
        minWidth: 220, maxHeight: 320, overflowY: 'auto',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 10, boxShadow: '0 14px 30px -10px rgba(15,23,42,.18)',
        padding: 6, zIndex: 10
      }}>
        {options.length === 0 && <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-faint)' }}>Sem opções</div>}
        {options.map((o) => {
          const on = value.includes(o.id);
          return (
            <div key={o.id} onClick={() => onToggle(o.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 10px', borderRadius: 7, cursor: 'pointer',
              fontSize: 13, color: 'var(--text)'
            }} className="mkt-filter-opt">
              <span style={{
                width: 15, height: 15, borderRadius: 4,
                border: '1.5px solid ' + (on ? 'var(--accent)' : 'var(--border-strong)'),
                background: on ? 'var(--accent)' : 'var(--surface)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', flexShrink: 0
              }}>{on && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-12" /></svg>}</span>
              <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.label}</span>
            </div>);
        })}
        {value.length > 0 && (
          <>
            <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
            <div onClick={onClear} style={{ padding: '7px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }} className="mkt-filter-opt">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              Limpar
            </div>
          </>
        )}
      </div>
    );

    return (
      <div className="card" style={{ overflow: 'visible' }}>
        <div ref={menuRef} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', position: 'relative' }}>
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220, maxWidth: 380, height: 34 }}>
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
              placeholder="Buscar campanha por nome ou segmento..."
              style={{ paddingLeft: 34, paddingRight: q ? 30 : 12, width: '100%', height: 34 }} />
            {q && (
              <button onClick={() => setQ('')} title="Limpar busca" style={{
                position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                width: 22, height: 22, border: 'none', background: 'transparent',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', cursor: 'pointer', borderRadius: 6
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <FilterButton id="status"  icon="filter" label="Status"   count={statusFilter.length} />
            {openMenu === 'status'  && <FilterMenu options={statusOpts}  value={statusFilter}  onToggle={toggleIn(setStatusFilter)}  onClear={() => setStatusFilter([])} />}
          </div>
          <div style={{ position: 'relative' }}>
            <FilterButton id="channel" icon="filter" label="Canal"    count={channelFilter.length} />
            {openMenu === 'channel' && <FilterMenu options={channelOpts} value={channelFilter} onToggle={toggleIn(setChannelFilter)} onClear={() => setChannelFilter([])} />}
          </div>
          <div style={{ position: 'relative' }}>
            <FilterButton id="segment" icon="tag"    label="Segmento" count={segmentFilter.length} />
            {openMenu === 'segment' && <FilterMenu options={segmentOpts} value={segmentFilter} onToggle={toggleIn(setSegmentFilter)} onClear={() => setSegmentFilter([])} />}
          </div>

          <div className="spacer" />
          <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            <strong style={{ color: 'var(--text)', fontWeight: 700 }}>{filtered.length}</strong> de {rows.length}
          </div>
          {hasFilters && (
            <button className="btn btn-ghost btn-sm" onClick={clearAll} style={{ color: 'var(--text-muted)' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              Limpar filtros
            </button>
          )}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                {['Campanha', 'Canal', 'Segmentação', 'Status', 'Enviados', 'Abertura', 'Clique', 'Conversão', 'Disparo', ''].map((h, i) =>
                  <th key={i} style={{ textAlign: i === 0 || i === 1 || i === 2 || i === 3 ? 'left' : (i === 9 ? 'right' : 'right'), padding: '10px 14px', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '36px 14px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.5-4.5" /></svg>
                      </span>
                      <div style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 600 }}>Nenhuma campanha encontrada</div>
                      <div style={{ fontSize: 12.5 }}>Ajuste os filtros ou limpe a busca.</div>
                    </div>
                  </td>
                </tr>
              ) : filtered.map((c) =>
                <tr key={c.id} style={{ borderTop: '1px solid var(--border)', cursor: 'pointer' }} className="mkt-row" onClick={() => onOpen && onOpen(c)}>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text)' }}>{c.name}</td>
                  <td style={{ padding: '12px 14px' }}><ChannelChip kind={c.channel} /></td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>{c.audience}</td>
                  <td style={{ padding: '12px 14px' }}><StatusBadge s={c.status} /></td>
                  <td className="tnum" style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text)', fontWeight: 600 }}>{c.sent ? c.sent.toLocaleString('pt-BR') : '—'}</td>
                  <td className="tnum" style={{ padding: '12px 14px', textAlign: 'right', color: c.open ? 'var(--text)' : 'var(--text-faint)' }}>{c.open ? pct(c.open) : '—'}</td>
                  <td className="tnum" style={{ padding: '12px 14px', textAlign: 'right', color: c.click ? 'var(--text)' : 'var(--text-faint)' }}>{c.click ? pct(c.click) : '—'}</td>
                  <td className="tnum" style={{ padding: '12px 14px', textAlign: 'right', color: c.conv ? 'var(--accent-700)' : 'var(--text-faint)', fontWeight: c.conv ? 700 : 400 }}>{c.conv ? pct(c.conv) : '—'}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: 12.5 }}>{c.scheduled}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-icon" title="Mais"><Ic name="more" size={14} /></button>
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
        <style>{`
          .mkt-row:hover { background: var(--surface-2); }
          .mkt-filter-opt:hover { background: var(--surface-2); }
        `}</style>
      </div>);
  }

  function TemplatesGrid({ items, onEdit, onUse, onDuplicate, onNew }) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {items.map((t) =>
          <div key={t.id} className="card mkt-tpl" onClick={() => onEdit && onEdit(t)} style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer', transition: 'border-color .15s ease, transform .15s ease' }}>
            <div className="row" style={{ alignItems: 'center', gap: 8 }}>
              <ChannelChip kind={t.channel} />
              <div className="spacer" />
              <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{t.uses} usos</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', letterSpacing: '-.01em' }}>{t.name}</div>
            <div style={{
              fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5,
              background: 'var(--surface-2)', borderRadius: 8, padding: '10px 12px',
              borderLeft: '3px solid color-mix(in oklab, var(--accent) 40%, var(--border))',
              minHeight: 70
            }}>{t.preview}</div>
            <div className="row" style={{ alignItems: 'center', gap: 6 }} onClick={(e) => e.stopPropagation()}>
              <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>Atualizado em {t.updated}</span>
              <div className="spacer" />
              <button className="btn btn-ghost btn-icon" title="Editar" onClick={() => onEdit && onEdit(t)}><Ic name="edit" size={13} /></button>
              <button className="btn btn-ghost btn-icon" title="Duplicar" onClick={() => onDuplicate && onDuplicate(t)}><Ic name="file" size={13} /></button>
              <button className="btn btn-sm" onClick={() => onUse && onUse(t)}><Ic name="send" size={12} /> Usar</button>
            </div>
          </div>)}

        {/* New template card */}
        <div className="card mkt-tpl-new" onClick={() => onNew && onNew()} style={{
          padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          borderStyle: 'dashed', minHeight: 200,
          transition: 'border-color .15s ease, background .15s ease'
        }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ic name="plus" size={18} />
          </div>
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>Novo template</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 220 }}>Crie do zero ou peça para o agente gerar a partir de um briefing.</div>
        </div>

        <style>{`
          .mkt-tpl:hover { border-color: color-mix(in oklab, var(--accent) 35%, var(--border)); transform: translateY(-1px); }
          .mkt-tpl-new:hover { border-color: var(--accent); background: var(--accent-soft); }
        `}</style>
      </div>);
  }

  function FlowsList({ items, onToggle }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((f) =>
          <div key={f.id} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="row" style={{ alignItems: 'center', gap: 10 }}>
              <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--ai-soft)', color: 'var(--ai-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ic name="funnel" size={15} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{f.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Gatilho: <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{f.trigger}</strong></div>
              </div>
              <span className={`badge ${f.active ? 'badge-success' : 'badge-neutral'}`}>{f.active ? 'Ativo' : 'Pausado'}</span>
              <button className="btn btn-ghost btn-icon" title="Editar"><Ic name="edit" size={13} /></button>
              <button className="btn btn-ghost btn-icon" title={f.active ? 'Pausar' : 'Retomar'} onClick={() => onToggle && onToggle(f.id)}>
                <Ic name={f.active ? 'pause' : 'play'} size={13} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {f.steps.map((s, i) =>
                <React.Fragment key={i}>
                  <div style={{
                    padding: '6px 12px', borderRadius: 999,
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    fontSize: 12.5, color: 'var(--text)', fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', gap: 6
                  }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent-700)', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                    {s}
                  </div>
                  {i < f.steps.length - 1 && <Ic name="chevron-right" size={12} style={{ color: 'var(--text-faint)' }} />}
                </React.Fragment>)}
            </div>
          </div>)}
      </div>);
  }

  window.MarketingAgent = MarketingAgent;
  window.MarketingCampaigns = MarketingCampaigns;
})();
