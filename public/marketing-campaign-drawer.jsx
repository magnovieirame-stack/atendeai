// marketing-campaign-drawer.jsx — Full campaign creation wizard (Meta Ads style)
// Opens at 80vw from right; multi-step wizard with audience targeting, channel/copy,
// media, scheduling, A/B and review.

(function () {

  // ── Mock data ─────────────────────────────────────────────────────────

  const CRM_STAGES = [
    { id: 'novo',          label: 'Novos leads',     color: '#0EA5E9', count: 142 },
    { id: 'prospeccao',    label: 'Prospecção',      color: '#6366F1', count: 86 },
    { id: 'qualificacao',  label: 'Qualificação',    color: '#F59E0B', count: 54 },
    { id: 'negociacao',    label: 'Negociação',      color: '#A855F7', count: 32 },
    { id: 'fechamento',    label: 'Fechamento',      color: '#22C55E', count: 21 },
    { id: 'inativos',      label: 'Inativos 60d+',   color: '#94A3B8', count: 318 }
  ];

  const TAGS = [
    { id: 'novo-lead',     label: 'novo-lead',     count: 142 },
    { id: 'aniversario',   label: 'aniversário',   count: 96 },
    { id: 'vip',           label: 'VIP',           count: 24 },
    { id: 'recompra',      label: 'recompra',      count: 187 },
    { id: 'inadimplente',  label: 'inadimplente',  count: 12 },
    { id: 'instagram',     label: 'instagram',     count: 211 },
    { id: 'indicacao',     label: 'indicação',     count: 64 },
    { id: 'evento-2025',   label: 'evento-2025',   count: 89 }
  ];

  const OBJECTIVES = [
    { id: 'conversion',  icon: 'check',     label: 'Conversão',        desc: 'Gerar vendas ou agendamentos diretos.' },
    { id: 'reactivation',icon: 'rotate',    label: 'Reativação',       desc: 'Trazer de volta clientes inativos.' },
    { id: 'retention',   icon: 'star',      label: 'Retenção',         desc: 'Fidelizar, NPS e pós-venda.' },
    { id: 'awareness',   icon: 'megaphone', label: 'Reconhecimento',   desc: 'Comunicar novidades, lançamentos.' },
    { id: 'crosssell',   icon: 'tag',       label: 'Cross-sell / Upsell', desc: 'Indicar produtos complementares.' },
    { id: 'event',       icon: 'calendar',  label: 'Evento / Promoção',desc: 'Promover data, oferta ou prazo curto.' }
  ];

  const CHANNELS = [
    { id: 'whatsapp', icon: 'whatsapp', label: 'WhatsApp',  desc: 'Mensagem direta · alta abertura',     color: '#16A34A' },
    { id: 'email',    icon: 'mail',     label: 'E-mail',    desc: 'Mais espaço pra mídia e copy',         color: '#1D4ED8' },
    { id: 'sms',      icon: 'phone',    label: 'SMS',       desc: 'Direto e curto, sem necessidade de app', color: '#7C3AED' },
    { id: 'push',     icon: 'bell',     label: 'Notificação push', desc: 'Para clientes com o app instalado', color: '#EA580C' }
  ];

  // ── Component ─────────────────────────────────────────────────────────

  function NewCampaignDrawer({ onClose, initial }) {
    const [step, setStep] = React.useState(initial?.startStep != null ? initial.startStep : 0);
    const [vw, setVw] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1440);
    React.useEffect(() => {
      const onR = () => setVw(window.innerWidth);
      window.addEventListener('resize', onR);
      return () => window.removeEventListener('resize', onR);
    }, []);
    const drawerWidth = vw * 0.8;
    // budget inside drawer-bd (drawer width - 22*2 padding)
    const innerWidth = drawerWidth - 44;
    const showPreview = innerWidth > 920;
    const showSteps = innerWidth > 700;
    const railW = 200, prevW = 300, gap = 18;
    const cols = showPreview && showSteps ? `${railW}px minmax(0, 1fr) ${prevW}px` :
                 showSteps                 ? `${railW}px minmax(0, 1fr)` :
                                             `minmax(0, 1fr)`;

    // form state
    const [name, setName] = React.useState(initial?.name || '');
    const [objective, setObjective] = React.useState(initial?.objective || 'conversion');
    const [channel, setChannel] = React.useState(initial?.channel || 'whatsapp');

    const [audience, setAudience] = React.useState({
      source: 'segment',           // 'segment' | 'tags' | 'crm' | 'list' | 'ai'
      stages: ['inativos'],
      tags: [],
      include: { clients: true, leads: true },
      filters: {
        ticketMin: '', ticketMax: '',
        lastBuyDays: '', city: '',
        recompraOpen: false, vip: false
      },
      aiQuery: 'Clientes que compraram Esmalte Premium nos últimos 30 dias e ainda não compraram Top Coat.'
    });

    const [content, setContent] = React.useState({
      template: initial?.templateId || null,
      headline: initial?.headline || '',
      body: initial?.body || 'Oi {nome}! Vi que faz tempo que você não passa por aqui 💛 Liberamos um cupom especial de 15% pra você. Aproveita?',
      cta: initial?.cta || 'Quero meu cupom',
      ctaUrl: initial?.ctaUrl || 'https://atende.ia/cupom-volta',
      media: null,        // { name, kind }
      attachments: []
    });

    const [schedule, setSchedule] = React.useState({
      mode: 'scheduled',  // 'now' | 'scheduled' | 'recurring'
      date: '2026-05-28',
      time: '09:00',
      timezone: 'America/Sao_Paulo',
      respectWindow: true,
      windowFrom: '08:00',
      windowTo: '20:00',
      throttle: 'normal'  // 'gentle' | 'normal' | 'aggressive'
    });
    const [recUntil, setRecUntil] = React.useState('2026-12-31');

    const [advanced, setAdvanced] = React.useState({
      abTest: false,
      abPercent: 20,
      followup: true,
      followupDays: 3,
      stopOnReply: true,
      utm: { source: 'atende-ia', medium: 'whatsapp', campaign: '' },
      budget: { enabled: false, value: '500,00' }
    });

    const steps = [
      { id: 'objective', label: 'Objetivo',     icon: 'leads' },
      { id: 'audience',  label: 'Público',      icon: 'team' },
      { id: 'content',   label: 'Mensagem',     icon: 'chat' },
      { id: 'media',     label: 'Mídia',        icon: 'image' },
      { id: 'schedule',  label: 'Agendamento',  icon: 'calendar' },
      { id: 'advanced',  label: 'Avançado',     icon: 'settings' },
      { id: 'review',    label: 'Revisão',      icon: 'check' }
    ];

    // Audience reach estimation
    const reach = React.useMemo(() => {
      if (audience.source === 'segment')
        return audience.stages.reduce((s, id) => s + (CRM_STAGES.find((x) => x.id === id)?.count || 0), 0);
      if (audience.source === 'tags')
        return audience.tags.reduce((s, id) => s + (TAGS.find((x) => x.id === id)?.count || 0), 0);
      if (audience.source === 'crm')
        return (audience.include.clients ? 1820 : 0) + (audience.include.leads ? 437 : 0);
      if (audience.source === 'list') return 0;
      if (audience.source === 'ai') return 47;
      return 0;
    }, [audience]);

    // ── reusable bits ───────────────────────────────────────────────────

    const SectionCard = ({ title, desc, children }) =>
      <div className="card card-pad" style={{ marginBottom: 14 }}>
        <div className="h3" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
        {desc && <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>{desc}</div>}
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
      </div>;

    const Field = ({ label, hint, children, cols }) =>
      <div style={{ flex: cols || 1, minWidth: 0 }}>
        {label && <label className="label">{label}</label>}
        {children}
        {hint && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{hint}</div>}
      </div>;

    const Row = ({ children, gap = 12 }) =>
      <div style={{ display: 'flex', gap, alignItems: 'flex-start' }}>{children}</div>;

    const Seg = ({ value, onChange, options }) =>
      <div style={{ display: 'inline-flex', border: '1px solid var(--border-strong)', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
        {options.map(([id, l]) =>
          <div key={id} onClick={() => onChange(id)}
            style={{ padding: '8px 14px', fontSize: 'var(--type-sm)', cursor: 'pointer',
              background: value === id ? 'var(--accent-soft)' : 'var(--surface)',
              color: value === id ? 'var(--accent-700)' : 'var(--text)',
              fontWeight: value === id ? 600 : 500,
              borderRight: '1px solid var(--border)' }}>{l}</div>)}
      </div>;

    const toggle = (arr, id) => arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];

    // ── STEPS ───────────────────────────────────────────────────────────

    const StepObjective = () =>
      <>
        <SectionCard title="Nome da campanha" desc="Use um nome interno claro para encontrar depois nos relatórios.">
          <Field label="Nome *">
            <input className="input" placeholder="Ex: Reativação · Maio 2026" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </SectionCard>

        <SectionCard title="Qual é o objetivo desta campanha?" desc="Escolha o que você quer alcançar. Isso ajuda a IA a otimizar copy, horário e CTA.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {OBJECTIVES.map((o) => {
              const on = objective === o.id;
              return (
                <div key={o.id} onClick={() => setObjective(o.id)} style={{
                  padding: 14, borderRadius: 10, cursor: 'pointer',
                  border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border-strong)'),
                  background: on ? 'var(--accent-soft)' : 'var(--surface)',
                  display: 'flex', flexDirection: 'column', gap: 8,
                  transition: 'border-color .15s, background .15s'
                }}>
                  <span style={{ width: 32, height: 32, borderRadius: 9, background: on ? 'var(--accent)' : 'var(--surface-3)', color: on ? 'white' : 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Ic name={o.icon} size={15} />
                  </span>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{o.label}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>{o.desc}</div>
                </div>);
            })}
          </div>
        </SectionCard>

        <SectionCard title="Canal de disparo" desc="Onde a mensagem vai chegar.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {CHANNELS.map((c) => {
              const on = channel === c.id;
              return (
                <div key={c.id} onClick={() => setChannel(c.id)} style={{
                  padding: 12, borderRadius: 10, cursor: 'pointer',
                  border: '1px solid ' + (on ? c.color : 'var(--border-strong)'),
                  background: on ? `color-mix(in oklab, ${c.color} 8%, var(--surface))` : 'var(--surface)',
                  display: 'flex', alignItems: 'center', gap: 10
                }}>
                  <span style={{ width: 34, height: 34, borderRadius: 9, background: `color-mix(in oklab, ${c.color} 14%, var(--surface))`, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Ic name={c.icon} size={16} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>{c.label}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{c.desc}</div>
                  </div>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid ' + (on ? c.color : 'var(--border-strong)'), background: on ? c.color : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {on && <Ic name="check" size={10} style={{ color: 'white' }} />}
                  </span>
                </div>);
            })}
          </div>
        </SectionCard>
      </>;

    // ── Audience ────────────────────────────────────────────────────────

    const StepAudience = () => {
      const sources = [
        { id: 'segment', icon: 'columns',  label: 'Por fase do CRM',   desc: 'Selecione fases do funil para segmentar.' },
        { id: 'tags',    icon: 'tag',      label: 'Por tags',           desc: 'Use tags atribuídas a clientes ou leads.' },
        { id: 'crm',     icon: 'team',     label: 'Toda a base',        desc: 'Todos os clientes e/ou leads ativos.' },
        { id: 'list',    icon: 'upload',   label: 'Lista importada',    desc: 'Envie um CSV com a audiência específica.' },
        { id: 'ai',      icon: 'sparkles', label: 'Consulta IA',        desc: 'Descreva quem quer atingir e a IA segmenta.' }
      ];

      return (
        <>
          <SectionCard title="Como segmentar o público?" desc="Escolha a forma de definir quem vai receber a campanha.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {sources.map((s) => {
                const on = audience.source === s.id;
                return (
                  <div key={s.id} onClick={() => setAudience({ ...audience, source: s.id })} style={{
                    padding: 12, borderRadius: 10, cursor: 'pointer',
                    border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border-strong)'),
                    background: on ? 'var(--accent-soft)' : 'var(--surface)',
                    display: 'flex', alignItems: 'center', gap: 10
                  }}>
                    <span style={{ width: 30, height: 30, borderRadius: 8, background: on ? 'var(--accent)' : 'var(--surface-3)', color: on ? 'white' : 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Ic name={s.icon} size={14} />
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>{s.label}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.3 }}>{s.desc}</div>
                    </div>
                  </div>);
              })}
            </div>
          </SectionCard>

          {audience.source === 'segment' &&
            <SectionCard title="Fases do funil" desc="Marque uma ou mais fases. O total estimado aparece no resumo.">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                {CRM_STAGES.map((st) => {
                  const on = audience.stages.includes(st.id);
                  return (
                    <div key={st.id} onClick={() => setAudience({ ...audience, stages: toggle(audience.stages, st.id) })} style={{
                      padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                      border: '1px solid ' + (on ? st.color : 'var(--border-strong)'),
                      background: on ? `color-mix(in oklab, ${st.color} 9%, var(--surface))` : 'var(--surface)',
                      display: 'flex', alignItems: 'center', gap: 10
                    }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: st.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', flex: 1, minWidth: 0 }}>{st.label}</span>
                      <span className="tnum" style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{st.count}</span>
                      <span style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid ' + (on ? st.color : 'var(--border-strong)'), background: on ? st.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {on && <Ic name="check" size={9} style={{ color: 'white' }} />}
                      </span>
                    </div>);
                })}
              </div>
            </SectionCard>}

          {audience.source === 'tags' &&
            <SectionCard title="Tags" desc="Selecione uma ou mais tags. Filtros somam (OR).">
              <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                {TAGS.map((t) => {
                  const on = audience.tags.includes(t.id);
                  return (
                    <span key={t.id} onClick={() => setAudience({ ...audience, tags: toggle(audience.tags, t.id) })}
                      className={'chip ' + (on ? 'chip-accent' : '')}
                      style={{ cursor: 'pointer', padding: '4px 10px', height: 26, fontSize: 12.5 }}>
                      <Ic name="tag" size={10} /> {t.label}
                      <span className="tnum" style={{ marginLeft: 4, opacity: .65 }}>{t.count}</span>
                    </span>);
                })}
              </div>
            </SectionCard>}

          {audience.source === 'crm' &&
            <SectionCard title="Toda a base" desc="Restrinja por tipo de cadastro e adicione filtros opcionais.">
              <Row>
                <label className="row" style={{ gap: 8, cursor: 'pointer', flex: 1, padding: '10px 14px', border: '1px solid var(--border-strong)', borderRadius: 8, background: audience.include.clients ? 'var(--accent-soft)' : 'var(--surface)' }}>
                  <input type="checkbox" checked={audience.include.clients} onChange={(e) => setAudience({ ...audience, include: { ...audience.include, clients: e.target.checked } })} />
                  <span style={{ fontWeight: 600 }}>Clientes</span>
                  <span style={{ flex: 1 }} />
                  <span className="tnum" style={{ color: 'var(--text-muted)', fontSize: 12 }}>1.820</span>
                </label>
                <label className="row" style={{ gap: 8, cursor: 'pointer', flex: 1, padding: '10px 14px', border: '1px solid var(--border-strong)', borderRadius: 8, background: audience.include.leads ? 'var(--accent-soft)' : 'var(--surface)' }}>
                  <input type="checkbox" checked={audience.include.leads} onChange={(e) => setAudience({ ...audience, include: { ...audience.include, leads: e.target.checked } })} />
                  <span style={{ fontWeight: 600 }}>Leads</span>
                  <span style={{ flex: 1 }} />
                  <span className="tnum" style={{ color: 'var(--text-muted)', fontSize: 12 }}>437</span>
                </label>
              </Row>
            </SectionCard>}

          {audience.source === 'list' &&
            <SectionCard title="Importar lista" desc="Envie um CSV com colunas: nome, telefone, e-mail (opcional).">
              <div style={{ border: '1.5px dashed var(--border-strong)', borderRadius: 12, padding: '26px 16px', textAlign: 'center', background: 'var(--surface-2)', cursor: 'pointer' }}>
                <div style={{ width: 44, height: 44, margin: '0 auto 10px', borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ic name="upload" size={20} />
                </div>
                <div style={{ fontWeight: 600 }}>Arraste o CSV aqui ou clique para enviar</div>
                <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>Tamanho máx: 10 MB · até 50 mil contatos</div>
              </div>
            </SectionCard>}

          {audience.source === 'ai' &&
            <SectionCard title="Consulta IA" desc="Descreva quem você quer atingir; a IA cruza CRM, vendas, agenda e histórico.">
              <Field>
                <textarea className="input" rows={3} value={audience.aiQuery} onChange={(e) => setAudience({ ...audience, aiQuery: e.target.value })}
                  placeholder='Ex: "Clientes que compraram Esmalte Premium nos últimos 30 dias e ainda não compraram Top Coat."' />
              </Field>
              <div style={{ padding: 10, borderRadius: 10, background: 'var(--ai-soft)', border: '1px solid color-mix(in oklab, var(--ai) 22%, var(--border))', color: 'var(--ai-strong)', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Ic name="sparkles" size={14} /> A IA identificou <strong>47 contatos</strong> compatíveis com esses critérios.
              </div>
            </SectionCard>}

          <SectionCard title="Filtros adicionais (opcional)" desc="Refine ainda mais a audiência. Filtros combinam com AND.">
            <Row>
              <Field label="Ticket mínimo (R$)">
                <input className="input" placeholder="0,00" value={audience.filters.ticketMin} onChange={(e) => setAudience({ ...audience, filters: { ...audience.filters, ticketMin: e.target.value } })} />
              </Field>
              <Field label="Ticket máximo (R$)">
                <input className="input" placeholder="9.999,00" value={audience.filters.ticketMax} onChange={(e) => setAudience({ ...audience, filters: { ...audience.filters, ticketMax: e.target.value } })} />
              </Field>
              <Field label="Última compra (dias)">
                <input className="input" placeholder="ex: 30" value={audience.filters.lastBuyDays} onChange={(e) => setAudience({ ...audience, filters: { ...audience.filters, lastBuyDays: e.target.value } })} />
              </Field>
              <Field label="Cidade">
                <input className="input" placeholder="ex: São Paulo" value={audience.filters.city} onChange={(e) => setAudience({ ...audience, filters: { ...audience.filters, city: e.target.value } })} />
              </Field>
            </Row>
            <Row gap={8}>
              <label className="chip" style={{ cursor: 'pointer', padding: '6px 12px', height: 30, fontSize: 12.5, background: audience.filters.vip ? 'var(--accent-soft)' : 'var(--surface-3)', color: audience.filters.vip ? 'var(--accent-700)' : 'var(--text-muted)' }}>
                <input type="checkbox" style={{ display: 'none' }} checked={audience.filters.vip} onChange={(e) => setAudience({ ...audience, filters: { ...audience.filters, vip: e.target.checked } })} />
                <Ic name="star" size={11} /> Apenas VIP
              </label>
              <label className="chip" style={{ cursor: 'pointer', padding: '6px 12px', height: 30, fontSize: 12.5, background: audience.filters.recompraOpen ? 'var(--accent-soft)' : 'var(--surface-3)', color: audience.filters.recompraOpen ? 'var(--accent-700)' : 'var(--text-muted)' }}>
                <input type="checkbox" style={{ display: 'none' }} checked={audience.filters.recompraOpen} onChange={(e) => setAudience({ ...audience, filters: { ...audience.filters, recompraOpen: e.target.checked } })} />
                <Ic name="rotate" size={11} /> Janela de recompra aberta
              </label>
            </Row>
          </SectionCard>
        </>);
    };

    // ── Content ─────────────────────────────────────────────────────────

    const QUICK_TEMPLATES = [
      { id: 'reactivation', name: 'Reativação · cupom 15%', body: 'Oi {nome}! Faz tempo que a gente não te vê 💛 Liberamos um cupom de 15% só pra você — válido até domingo. Aproveita?' },
      { id: 'crosssell',    name: 'Cross-sell · Top Coat',  body: 'Olá {nome}! Vi que você ama o Esmalte Premium 💅 Pra um acabamento perfeito, conheça o nosso Top Coat — em promoção essa semana.' },
      { id: 'birthday',     name: 'Aniversário · 20% off',  body: 'Feliz aniversário, {nome}! 🎉 Liberamos um cupom de 20% só pra você. Válido por 7 dias.' },
      { id: 'reminder',     name: 'Lembrete · recompra',    body: 'Oi {nome}! Faz {dias} dias da sua última compra. Quer repor o seu favorito com 10% off?' }
    ];

    const StepContent = () =>
      <>
        <SectionCard title="Templates rápidos" desc="Comece de um template — você pode editar tudo depois.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
            {QUICK_TEMPLATES.map((t) =>
              <div key={t.id} onClick={() => { setContent({ ...content, template: t.id, body: t.body }); }} style={{
                padding: 12, borderRadius: 10, cursor: 'pointer',
                border: '1px solid ' + (content.template === t.id ? 'var(--accent)' : 'var(--border)'),
                background: content.template === t.id ? 'var(--accent-soft)' : 'var(--surface)'
              }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{t.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.body}</div>
              </div>)}
            <div style={{ padding: 12, borderRadius: 10, cursor: 'pointer', border: '1.5px dashed var(--border-strong)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--ai-strong)' }}>
              <Ic name="sparkles" size={16} />
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>Gerar com IA</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>baseado no objetivo + público</div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Conteúdo da mensagem" desc='Use variáveis como {nome}, {empresa}, {dias} — elas são preenchidas no envio.'>
          {channel === 'email' &&
            <Field label="Assunto do e-mail">
              <input className="input" placeholder="Ex: A oferta da semana é sua, {nome} ✨" value={content.headline} onChange={(e) => setContent({ ...content, headline: e.target.value })} />
            </Field>}
          <Field label="Corpo da mensagem" hint={`${content.body.length} caracteres · ideal até 320 no WhatsApp`}>
            <textarea className="input" rows={6} value={content.body} onChange={(e) => setContent({ ...content, body: e.target.value })} />
          </Field>
          <Row>
            <Field label="Texto do CTA">
              <input className="input" placeholder="Ex: Quero meu cupom" value={content.cta} onChange={(e) => setContent({ ...content, cta: e.target.value })} />
            </Field>
            <Field label="Link / destino do CTA">
              <input className="input" placeholder="https://..." value={content.ctaUrl} onChange={(e) => setContent({ ...content, ctaUrl: e.target.value })} />
            </Field>
          </Row>
          <Row gap={8}>
            <button className="btn btn-sm"><Ic name="sparkles" size={12} /> Ajustar tom com IA</button>
            <button className="btn btn-sm"><Ic name="rotate" size={12} /> Gerar variantes</button>
            <button className="btn btn-sm"><Ic name="check" size={12} /> Revisar gramática</button>
          </Row>
        </SectionCard>
      </>;

    // ── Media ───────────────────────────────────────────────────────────

    const fileRef = React.useRef(null);
    const onMedia = (fl) => {
      const f = fl?.[0];
      if (f) setContent({ ...content, media: { name: f.name, size: f.size, type: f.type } });
    };

    const StepMedia = () =>
      <>
        <SectionCard title="Mídia principal" desc="Imagem, vídeo ou documento que acompanha a mensagem. Opcional.">
          {!content.media ?
            <div onClick={() => fileRef.current?.click()} style={{ border: '1.5px dashed var(--border-strong)', borderRadius: 12, padding: '34px 16px', textAlign: 'center', cursor: 'pointer', background: 'var(--surface-2)' }}>
              <div style={{ width: 52, height: 52, margin: '0 auto 12px', borderRadius: 14, background: 'var(--accent-soft)', color: 'var(--accent-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ic name="image" size={24} />
              </div>
              <div style={{ fontWeight: 600 }}>Arraste mídia aqui ou clique para enviar</div>
              <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>JPG, PNG, MP4, PDF · até 16 MB</div>
              <input ref={fileRef} type="file" accept="image/*,video/*,application/pdf" style={{ display: 'none' }} onChange={(e) => onMedia(e.target.files)} />
            </div> :
            <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ic name="image" size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{content.media.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>{content.media.type || 'arquivo'} · pronto para envio</div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setContent({ ...content, media: null })} title="Remover"><Ic name="trash" size={14} /></button>
            </div>}
        </SectionCard>

        <SectionCard title="Anexos adicionais" desc="Catálogo em PDF, cupom, ficha técnica, etc.">
          <Row gap={8}>
            <button className="btn btn-sm"><Ic name="paperclip" size={12} /> Anexar do computador</button>
            <button className="btn btn-sm"><Ic name="file-text" size={12} /> Escolher do catálogo</button>
            <button className="btn btn-sm"><Ic name="image" size={12} /> Banco de mídia</button>
          </Row>
        </SectionCard>
      </>;

    // ── Schedule ────────────────────────────────────────────────────────

    const StepSchedule = () =>
      <>
        <SectionCard title="Quando disparar?">
          <Seg value={schedule.mode} onChange={(v) => setSchedule({ ...schedule, mode: v })}
            options={[['now', 'Imediatamente'], ['scheduled', 'Agendar data e hora'], ['recurring', 'Recorrente']]} />

          {schedule.mode === 'scheduled' &&
            <Row>
              <Field label="Data" cols={1}>
                <DateField value={schedule.date} onChange={(e) => setSchedule({ ...schedule, date: e.target.value })} />
              </Field>
              <Field label="Hora" cols={1}>
                <input className="input" type="time" value={schedule.time} onChange={(e) => setSchedule({ ...schedule, time: e.target.value })} />
              </Field>
              <Field label="Fuso horário" cols={2}>
                <select className="input" value={schedule.timezone} onChange={(e) => setSchedule({ ...schedule, timezone: e.target.value })}>
                  <option value="America/Sao_Paulo">Brasília (UTC-3)</option>
                  <option value="America/Manaus">Manaus (UTC-4)</option>
                  <option value="America/Noronha">Noronha (UTC-2)</option>
                </select>
              </Field>
            </Row>}

          {schedule.mode === 'recurring' &&
            <div style={{ padding: 12, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <Row>
                <Field label="Recorrência">
                  <select className="input"><option>Toda segunda-feira</option><option>Toda terça-feira</option><option>Todo dia 1 do mês</option><option>Personalizada</option></select>
                </Field>
                <Field label="Hora">
                  <input className="input" type="time" defaultValue="09:00" />
                </Field>
                <Field label="Até">
                  <DateField value={recUntil} onChange={(e) => setRecUntil(e.target.value)} />
                </Field>
              </Row>
            </div>}
        </SectionCard>

        <SectionCard title="Janela de horário permitida" desc="Mensagens só são enviadas dentro desse intervalo. Bom pro engajamento e evita reclamação.">
          <Row>
            <Field label="">
              <label className="row" style={{ gap: 8, cursor: 'pointer', padding: '10px 12px', border: '1px solid var(--border-strong)', borderRadius: 8, background: schedule.respectWindow ? 'var(--accent-soft)' : 'var(--surface)' }}>
                <input type="checkbox" checked={schedule.respectWindow} onChange={(e) => setSchedule({ ...schedule, respectWindow: e.target.checked })} />
                <span style={{ fontWeight: 600, fontSize: 13 }}>Respeitar janela de horário</span>
              </label>
            </Field>
            <Field label="Das">
              <input className="input" type="time" value={schedule.windowFrom} disabled={!schedule.respectWindow} onChange={(e) => setSchedule({ ...schedule, windowFrom: e.target.value })} />
            </Field>
            <Field label="Até">
              <input className="input" type="time" value={schedule.windowTo} disabled={!schedule.respectWindow} onChange={(e) => setSchedule({ ...schedule, windowTo: e.target.value })} />
            </Field>
          </Row>
        </SectionCard>

        <SectionCard title="Velocidade de envio" desc="Distribuição dos disparos ao longo do tempo. Mais lento = menor risco de bloqueio.">
          <Seg value={schedule.throttle} onChange={(v) => setSchedule({ ...schedule, throttle: v })}
            options={[['gentle', '🐢 Lento (60/h)'], ['normal', '⚖️ Normal (200/h)'], ['aggressive', '🚀 Acelerado (500/h)']]} />
        </SectionCard>
      </>;

    // ── Advanced ────────────────────────────────────────────────────────

    const StepAdvanced = () =>
      <>
        <SectionCard title="Teste A/B" desc="Compare duas variantes e a IA promove a melhor automaticamente.">
          <label className="row" style={{ gap: 10, cursor: 'pointer', padding: '10px 14px', border: '1px solid var(--border-strong)', borderRadius: 8, background: advanced.abTest ? 'var(--accent-soft)' : 'var(--surface)' }}>
            <input type="checkbox" checked={advanced.abTest} onChange={(e) => setAdvanced({ ...advanced, abTest: e.target.checked })} />
            <span style={{ fontWeight: 600 }}>Ativar teste A/B</span>
            <span className="spacer" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>com {advanced.abPercent}% da audiência</span>
          </label>
          {advanced.abTest &&
            <Field label={`% da audiência no teste: ${advanced.abPercent}%`}>
              <input type="range" min="10" max="50" step="5" value={advanced.abPercent} onChange={(e) => setAdvanced({ ...advanced, abPercent: Number(e.target.value) })} style={{ width: '100%' }} />
            </Field>}
        </SectionCard>

        <SectionCard title="Follow-up automático" desc="Se o contato não responder, dispare um lembrete depois de alguns dias.">
          <Row>
            <Field>
              <label className="row" style={{ gap: 8, cursor: 'pointer', padding: '10px 14px', border: '1px solid var(--border-strong)', borderRadius: 8, background: advanced.followup ? 'var(--accent-soft)' : 'var(--surface)' }}>
                <input type="checkbox" checked={advanced.followup} onChange={(e) => setAdvanced({ ...advanced, followup: e.target.checked })} />
                <span style={{ fontWeight: 600, fontSize: 13 }}>Enviar follow-up</span>
              </label>
            </Field>
            <Field label="Após (dias)">
              <input className="input" type="number" min="1" max="30" value={advanced.followupDays} disabled={!advanced.followup} onChange={(e) => setAdvanced({ ...advanced, followupDays: Number(e.target.value) })} />
            </Field>
            <Field>
              <label className="row" style={{ gap: 8, cursor: 'pointer', padding: '10px 14px', border: '1px solid var(--border-strong)', borderRadius: 8, background: advanced.stopOnReply ? 'var(--accent-soft)' : 'var(--surface)' }}>
                <input type="checkbox" checked={advanced.stopOnReply} onChange={(e) => setAdvanced({ ...advanced, stopOnReply: e.target.checked })} />
                <span style={{ fontWeight: 600, fontSize: 13 }}>Parar se cliente responder</span>
              </label>
            </Field>
          </Row>
        </SectionCard>

        <SectionCard title="Rastreio UTM" desc="Adicione parâmetros nos links para rastrear performance.">
          <Row>
            <Field label="utm_source"><input className="input" value={advanced.utm.source} onChange={(e) => setAdvanced({ ...advanced, utm: { ...advanced.utm, source: e.target.value } })} /></Field>
            <Field label="utm_medium"><input className="input" value={advanced.utm.medium} onChange={(e) => setAdvanced({ ...advanced, utm: { ...advanced.utm, medium: e.target.value } })} /></Field>
            <Field label="utm_campaign"><input className="input" placeholder="ex: reativacao-maio26" value={advanced.utm.campaign} onChange={(e) => setAdvanced({ ...advanced, utm: { ...advanced.utm, campaign: e.target.value } })} /></Field>
          </Row>
        </SectionCard>

        <SectionCard title="Orçamento (opcional)" desc="Para campanhas com mídia paga vinculada.">
          <Row>
            <Field>
              <label className="row" style={{ gap: 8, cursor: 'pointer', padding: '10px 14px', border: '1px solid var(--border-strong)', borderRadius: 8, background: advanced.budget.enabled ? 'var(--accent-soft)' : 'var(--surface)' }}>
                <input type="checkbox" checked={advanced.budget.enabled} onChange={(e) => setAdvanced({ ...advanced, budget: { ...advanced.budget, enabled: e.target.checked } })} />
                <span style={{ fontWeight: 600, fontSize: 13 }}>Definir orçamento</span>
              </label>
            </Field>
            <Field label="Valor (R$)">
              <input className="input" placeholder="0,00" value={advanced.budget.value} disabled={!advanced.budget.enabled} onChange={(e) => setAdvanced({ ...advanced, budget: { ...advanced.budget, value: e.target.value } })} />
            </Field>
            <div style={{ flex: 2 }} />
          </Row>
        </SectionCard>
      </>;

    // ── Review ──────────────────────────────────────────────────────────

    const StepReview = () => {
      const ch = CHANNELS.find((c) => c.id === channel);
      const obj = OBJECTIVES.find((o) => o.id === objective);
      const SumRow = ({ label, value }) =>
        <div style={{ display: 'flex', alignItems: 'baseline', padding: '10px 0', borderBottom: '1px solid var(--border)', gap: 16 }}>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600, minWidth: 150, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>
          <span style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 500, textAlign: 'right', flex: 1 }}>{value}</span>
        </div>;

      const audienceLabel = audience.source === 'segment' ? audience.stages.map((id) => CRM_STAGES.find((s) => s.id === id)?.label).join(', ') || 'Nenhuma fase selecionada' :
        audience.source === 'tags' ? audience.tags.map((id) => TAGS.find((t) => t.id === id)?.label).join(', ') || 'Nenhuma tag selecionada' :
        audience.source === 'crm' ? `${audience.include.clients ? 'Clientes' : ''}${audience.include.clients && audience.include.leads ? ' + ' : ''}${audience.include.leads ? 'Leads' : ''}` :
        audience.source === 'list' ? 'Lista CSV importada' :
        'Consulta IA';

      return (
        <>
          <SectionCard title="Pronto para publicar" desc="Confira os detalhes antes de disparar.">
            <SumRow label="Nome" value={name || <span style={{ color: 'var(--text-faint)' }}>Sem nome</span>} />
            <SumRow label="Objetivo" value={<span><Ic name={obj?.icon} size={12} /> {obj?.label}</span>} />
            <SumRow label="Canal" value={<span style={{ color: ch?.color, fontWeight: 700 }}>{ch?.label}</span>} />
            <SumRow label="Público" value={`${audienceLabel} · ~${reach.toLocaleString('pt-BR')} contatos`} />
            <SumRow label="Quando" value={schedule.mode === 'now' ? 'Imediatamente' : schedule.mode === 'recurring' ? 'Recorrente' : `${schedule.date} às ${schedule.time}`} />
            <SumRow label="Follow-up" value={advanced.followup ? `Sim · após ${advanced.followupDays} dias` : 'Não'} />
            <SumRow label="A/B" value={advanced.abTest ? `Sim · ${advanced.abPercent}%` : 'Não'} />
          </SectionCard>

          <div style={{ padding: 14, borderRadius: 12, background: 'var(--ai-soft)', border: '1px solid color-mix(in oklab, var(--ai) 22%, var(--border))', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--ai)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Ic name="sparkles" size={15} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ai-strong)' }}>Análise da IA</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>
                Esta campanha tem <strong style={{ color: 'var(--text)' }}>alta probabilidade de conversão (78%)</strong> com base no histórico de campanhas similares.
                Sugestão: o horário 09h de quinta-feira tem 14% mais abertura que o agendado. Quer ajustar?
              </div>
            </div>
          </div>
        </>);
    };

    // ── Preview panel (right side) ─────────────────────────────────────

    const Preview = () => {
      const ch = CHANNELS.find((c) => c.id === channel);
      const previewBody = content.body.replace(/\{nome\}/g, 'Mariana').replace(/\{dias\}/g, '32').replace(/\{empresa\}/g, 'Atende.ia');

      return (
        <div style={{ position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Pré-visualização</div>

          <div style={{ background: 'var(--surface-2)', borderRadius: 16, padding: 16, border: '1px solid var(--border)' }}>
            {channel === 'whatsapp' &&
              <div style={{ background: '#E5DDD5', borderRadius: 10, padding: 14, minHeight: 280, position: 'relative', backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,.3), transparent 40%)' }}>
                <div style={{ background: '#DCF8C6', borderRadius: '10px 10px 2px 10px', padding: '8px 11px', marginLeft: 'auto', maxWidth: '85%', boxShadow: '0 1px 1px rgba(0,0,0,.08)' }}>
                  {content.media && <div style={{ background: '#bbb', borderRadius: 6, height: 110, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Ic name="image" size={28} /></div>}
                  <div style={{ fontSize: 13, color: '#111', whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>{previewBody}</div>
                  {content.cta &&
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,.08)', color: '#0aa', fontSize: 12.5, textAlign: 'center', fontWeight: 600 }}>{content.cta} ›</div>}
                  <div style={{ fontSize: 10, color: '#777', textAlign: 'right', marginTop: 4 }}>09:32 ✓✓</div>
                </div>
              </div>}

            {channel === 'email' &&
              <div style={{ background: 'white', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
                  <div><strong style={{ color: 'var(--text)' }}>De:</strong> Atende.ia &lt;contato@atende.ia&gt;</div>
                  <div style={{ marginTop: 2 }}><strong style={{ color: 'var(--text)' }}>Para:</strong> mariana@email.com</div>
                  <div style={{ marginTop: 2 }}><strong style={{ color: 'var(--text)' }}>Assunto:</strong> {content.headline || '(sem assunto)'}</div>
                </div>
                <div style={{ padding: 16, fontSize: 13, color: '#111', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
                  {content.media && <div style={{ background: 'var(--surface-3)', borderRadius: 6, height: 130, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}><Ic name="image" size={32} /></div>}
                  {previewBody}
                  {content.cta &&
                    <div style={{ marginTop: 14 }}>
                      <div style={{ display: 'inline-block', background: 'var(--accent)', color: 'white', padding: '10px 18px', borderRadius: 6, fontWeight: 700, fontSize: 13 }}>{content.cta}</div>
                    </div>}
                </div>
              </div>}

            {channel === 'sms' &&
              <div style={{ background: '#E9E9EB', borderRadius: 18, padding: 12, fontSize: 13, color: '#111', lineHeight: 1.4, maxWidth: '90%' }}>{previewBody}</div>}

            {channel === 'push' &&
              <div style={{ background: 'rgba(255,255,255,.85)', backdropFilter: 'blur(10px)', borderRadius: 14, padding: '12px 14px', boxShadow: '0 4px 12px rgba(0,0,0,.1)', border: '1px solid var(--border)' }}>
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <span style={{ width: 22, height: 22, borderRadius: 5, background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic name="bell" size={11} /></span>
                  <span style={{ fontSize: 11.5, fontWeight: 700 }}>ATENDE.IA</span>
                  <span className="spacer" />
                  <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>agora</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>{content.headline || 'Notificação'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{previewBody.slice(0, 120)}{previewBody.length > 120 ? '…' : ''}</div>
              </div>}
          </div>

          <div style={{ padding: 12, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Estimativa</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
              <span className="tnum" style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em' }}>{reach.toLocaleString('pt-BR')}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>contatos</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
              <Mini label="Abertura est." value="~72%" color="#16A34A" />
              <Mini label="Conversão est." value="~14%" color="#7C3AED" />
            </div>
          </div>
        </div>);
    };

    const Mini = ({ label, value, color }) =>
      <div style={{ padding: '8px 10px', borderRadius: 8, background: `color-mix(in oklab, ${color} 10%, var(--surface))`, border: `1px solid color-mix(in oklab, ${color} 24%, var(--border))` }}>
        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
        <div className="tnum" style={{ fontSize: 15, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
      </div>;

    // ── Render ──────────────────────────────────────────────────────────

    const stepRenderers = [StepObjective, StepAudience, StepContent, StepMedia, StepSchedule, StepAdvanced, StepReview];
    const Current = stepRenderers[step];

    return (
      <Drawer
        width="80vw"
        title={name || 'Nova campanha'}
        subtitle={`Etapa ${step + 1} de ${steps.length} · ${steps[step].label}`}
        leftHead={
          <div style={{ width: 44, height: 44, borderRadius: 11, background: 'linear-gradient(135deg, var(--ai), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <Ic name="megaphone" size={22} />
          </div>
        }
        onClose={onClose}
        footer={
          <>
            <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>
              <Ic name="sparkles" size={12} /> Você pode salvar como rascunho a qualquer momento.
            </div>
            <div className="spacer" />
            <button className="btn" onClick={onClose}>Cancelar</button>
            <button className="btn" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}><Ic name="arrow-left" size={13} /> Anterior</button>
            {step < steps.length - 1 ?
              <button className="btn btn-primary" onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}>Próximo <Ic name="arrow-right" size={13} /></button> :
              <>
                <button className="btn">Salvar rascunho</button>
                <button className="btn btn-primary"><Ic name="send" size={13} /> Publicar campanha</button>
              </>}
          </>
        }>

        {/* Three-column body: stepper · form · live preview */}
        <div style={{ display: 'grid', gridTemplateColumns: cols, gap, alignItems: 'flex-start' }}>
          {/* Left rail · steps */}
          {showSteps && <div style={{ position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
            {steps.map((s, i) => {
              const on = step === i;
              const done = step > i;
              return (
                <div key={s.id} onClick={() => setStep(i)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  background: on ? 'var(--accent-soft)' : 'transparent',
                  color: on ? 'var(--accent-700)' : 'var(--text)',
                  fontWeight: on ? 600 : 500, fontSize: 'var(--type-sm)'
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: on ? 'var(--accent)' : done ? 'color-mix(in oklab, var(--accent) 50%, var(--surface))' : 'var(--surface-3)',
                    color: on || done ? 'white' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0
                  }}>
                    {done ? <Ic name="check" size={11} /> : i + 1}
                  </div>
                  <span>{s.label}</span>
                </div>);
            })}

            <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: 'var(--accent-soft)', border: '1px solid color-mix(in oklab, var(--accent) 24%, var(--border))' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--accent-700)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Audiência atual</div>
              <div className="tnum" style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginTop: 4, letterSpacing: '-.02em' }}>{reach.toLocaleString('pt-BR')}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>contatos elegíveis</div>
            </div>
          </div>}

          {/* Center · form */}
          <div style={{ minWidth: 0 }}>
            {!showSteps &&
              <div style={{ marginBottom: 14, display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                {steps.map((s, i) => {
                  const on = step === i;
                  return (
                    <div key={s.id} onClick={() => setStep(i)} style={{
                      flexShrink: 0, padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
                      fontSize: 12, fontWeight: 600,
                      background: on ? 'var(--accent)' : 'var(--surface-2)',
                      color: on ? 'white' : 'var(--text-muted)',
                      border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)')
                    }}>{i + 1}. {s.label}</div>);
                })}
              </div>}
            <Current />
          </div>

          {/* Right · live preview */}
          {showPreview && <Preview />}
        </div>
      </Drawer>);
  }

  window.NewCampaignDrawer = NewCampaignDrawer;
})();
