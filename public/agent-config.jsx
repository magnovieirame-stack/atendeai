// agent-config.jsx — full configuration page for an EXISTING AI agent.
// Mirrors the 7-block structure of NewAgentDrawer (Identity, Mission, Operation,
// Knowledge, Communication, Technology, Result) plus per-agent telemetry, version
// history, and inline tester. Replaces the previous AdminAgent.

// ---- mock per-agent profile data ----
const AGENT_PROFILES = {
  julia: {
    name: 'Júlia',
    title: 'Atendimento · Iguabela Beleza',
    initials: 'JU',
    status: 'ativo',
    publishedAt: 'há 3 dias',
    version: 'v12',
    identity: {
      name: 'Júlia',
      persona: 'Atendente calorosa e organizada, com toque carioca, da Iguabela Beleza.',
      tone: 'amigavel', language: 'pt-BR', emoji: 'moderado', length: 'medio',
    },
    mission: {
      role: 'Atender clientes da clínica, tirar dúvidas sobre procedimentos e agendar horários.',
      primaryGoal: 'Agendar consulta de avaliação',
      secondaryGoal: 'Capturar e-mail e WhatsApp do lead',
      channels: { whatsapp: true, instagram: true, facebook: false, webchat: true, api: false },
    },
    operation: {
      schedule: 'business',
      triggers: ['Cliente envia primeira mensagem', 'Palavra-chave: agendar', 'Palavra-chave: preço'],
      escalation: 'humano', onError: 'avisar',
      greeting: 'Oi! Eu sou a Júlia, assistente da Iguabela Beleza ✨ Em que posso te ajudar hoje?',
      farewell: 'Foi um prazer te atender! Qualquer coisa, é só chamar 💛',
    },
    knowledge: {
      files: [
        { name: 'FAQ_Iguabela_2026.pdf',     size: 1840 * 1024, type: 'pdf' },
        { name: 'Tabela_de_pacotes.pdf',     size: 612  * 1024, type: 'pdf' },
        { name: 'Procedimentos_estetica.docx', size: 256  * 1024, type: 'docx' },
        { name: 'Politica_de_cancelamento.txt', size: 12 * 1024, type: 'txt' },
      ],
      qualifyQs: [
        'Você já é cliente da Iguabela ou primeira visita?',
        'Qual tratamento te interessou?',
        'Tem alguma preferência de dia/horário?',
      ],
      objections: [
        { q: 'Tá caro',          a: 'Entendo! Posso te explicar o que está incluso e mostrar os pacotes que cabem no seu orçamento.' },
        { q: 'Vou pensar e te respondo',   a: 'Claro! Posso já reservar um horário sem compromisso? Você confirma até amanhã.' },
      ],
      vetoed: ['política', 'religião', 'concorrentes', 'preços de outras clínicas'],
    },
    comms: {
      autoMsgs: {
        wait:     'Estou checando aqui rapidinho, só um instante 🙏',
        transfer: 'Vou te conectar com nossa equipe humana, só um momento.',
        closed:   'Olá! Estamos fora do horário. Voltamos {horario_abertura}. Deixe sua dúvida que eu retomo na abertura!',
        followup: 'Oi! Vi que nossa conversa pausou — ainda quer seguir com o agendamento?',
      },
      scripts: [
        { name: 'Apresentação de serviços',  body: '1. Cumprimentar pelo nome\n2. Perguntar o objetivo\n3. Apresentar 2–3 pacotes adequados\n4. Convidar para agendamento' },
        { name: 'Pós-atendimento',           body: '1. Confirmar satisfação\n2. Pedir avaliação curta (1–5)\n3. Oferecer próximo agendamento' },
      ],
      ctas: {
        discovery: 'Quer ver nossos pacotes de avaliação?',
        proposal:  'Te mando o orçamento por aqui mesmo?',
        closing:   'Posso já reservar seu horário?',
      },
    },
    tech: {
      integrations: { crm: true, agenda: true, catalog: true, payments: true, erp: false },
      platform: 'claude-haiku-4-5',
      lgpd: { storePII: false, retentionDays: 90, anonymize: true },
    },
    result: {
      metrics: { resolution: true, tma: true, csat: true, conversion: true },
      reportFreq: 'semanal', reviewTrigger: 'resolution<70',
    },
    health: {
      conversations7d: 1284, resolutionRate: 0.78, csat: 4.6, avgTokens: 920, tmaSeconds: 142,
    },
    versions: [
      ['v12', 'Há 3 dias',   'Paulo Henrique',    'atual'],
      ['v11', 'Há 12 dias',  'Paulo Henrique'],
      ['v10', 'Há 28 dias',  'Karla Zambelly'],
      ['v9',  'Há 45 dias',  'Paulo Henrique'],
    ],
  },
  fernando: {
    name: 'Fernando',
    title: 'Suporte técnico · Iguabela Beleza',
    initials: 'FE',
    status: 'ativo',
    publishedAt: 'há 8 dias',
    version: 'v6',
    identity: { name: 'Fernando', persona: 'Especialista em suporte técnico, objetivo e didático.', tone: 'tecnico', language: 'pt-BR', emoji: 'nenhum', length: 'longo' },
    mission: { role: 'Resolver dúvidas técnicas sobre produtos pós-venda.', primaryGoal: 'Resolver o problema na primeira mensagem', secondaryGoal: 'Coletar feedback de bug', channels: { whatsapp: true, instagram: false, facebook: false, webchat: true, api: true } },
    operation: { schedule: '247', triggers: ['Palavra-chave: defeito', 'Palavra-chave: não funciona'], escalation: 'especialista', onError: 'repetir', greeting: 'Olá, sou o Fernando, suporte técnico da Iguabela. Pode me descrever o problema?', farewell: 'Resolvido? Qualquer coisa, retorne aqui que eu acompanho.' },
    knowledge: { files: [{ name: 'Manual_pos_venda.pdf', size: 3 * 1024 * 1024, type: 'pdf' }], qualifyQs: ['Qual o número do pedido?', 'O que aconteceu exatamente?'], objections: [{ q: 'Já tentei isso', a: 'Sem problema, vamos para o próximo passo.' }], vetoed: ['políticas internas confidenciais'] },
    comms: { autoMsgs: { wait: 'Um momento, checando aqui.', transfer: 'Vou te encaminhar para o técnico especialista.', closed: '', followup: 'Conseguiu resolver?' }, scripts: [{ name: 'Diagnóstico', body: '1. Coletar info\n2. Aplicar checklist\n3. Sugerir solução' }], ctas: { discovery: 'Quer que eu abra um chamado?', proposal: 'Posso registrar a solução proposta?', closing: 'Confirma que está resolvido?' } },
    tech: { integrations: { crm: true, agenda: false, catalog: true, payments: false, erp: true }, platform: 'claude-sonnet-4-5', lgpd: { storePII: true, retentionDays: 180, anonymize: true } },
    result: { metrics: { resolution: true, tma: true, csat: true, conversion: false }, reportFreq: 'diario', reviewTrigger: 'csat<4' },
    health: { conversations7d: 412, resolutionRate: 0.84, csat: 4.4, avgTokens: 1320, tmaSeconds: 218 },
    versions: [['v6', 'Há 8 dias', 'Karla Zambelly', 'atual'], ['v5', 'Há 22 dias', 'Karla Zambelly']],
  },
  lara: {
    name: 'Lara',
    title: 'Vendas · Iguabela Beleza',
    initials: 'LA',
    status: 'ativo',
    publishedAt: 'há 5 dias',
    version: 'v9',
    identity: { name: 'Lara', persona: 'Consultora de vendas consultiva, persuasiva sem ser invasiva.', tone: 'informal', language: 'pt-BR', emoji: 'expressivo', length: 'medio' },
    mission: { role: 'Converter leads em vendas e qualificar oportunidades.', primaryGoal: 'Fechar venda no primeiro contato', secondaryGoal: 'Agendar demonstração', channels: { whatsapp: true, instagram: true, facebook: true, webchat: false, api: false } },
    operation: { schedule: 'business', triggers: ['Lead novo do site', 'Cliente clicou em "Quero saber mais"'], escalation: 'humano', onError: 'avisar', greeting: 'Oi! Sou a Lara, vi que você se interessou pelos nossos pacotes 😊', farewell: 'Adoraria seguir conversando. Te chamo amanhã, pode ser?' },
    knowledge: { files: [{ name: 'Pitch_de_vendas.pdf', size: 1024 * 1024, type: 'pdf' }, { name: 'Casos_sucesso.docx', size: 480 * 1024, type: 'docx' }], qualifyQs: ['O que você procura?', 'Qual seu orçamento aproximado?'], objections: [{ q: 'Tá caro', a: 'Olha, vou te mostrar o ROI…' }], vetoed: ['desconto agressivo', 'concorrentes'] },
    comms: { autoMsgs: { wait: 'Já te respondo 😊', transfer: 'Te passo para minha gerente, beleza?', closed: '', followup: 'Oi! Cheguei a te enviar a proposta — ela ainda faz sentido?' }, scripts: [{ name: 'Discovery', body: '1. Perguntar dor\n2. Mostrar caso similar\n3. Pedir agendamento' }], ctas: { discovery: 'Vamos marcar 15min pra te mostrar?', proposal: 'Te envio uma proposta personalizada?', closing: 'Fechamos hoje com 10% de desconto?' } },
    tech: { integrations: { crm: true, agenda: true, catalog: true, payments: true, erp: false }, platform: 'claude-sonnet-4-5', lgpd: { storePII: true, retentionDays: 365, anonymize: false } },
    result: { metrics: { resolution: false, tma: true, csat: false, conversion: true }, reportFreq: 'semanal', reviewTrigger: 'never' },
    health: { conversations7d: 736, resolutionRate: 0.62, csat: 4.2, avgTokens: 1100, tmaSeconds: 175 },
    versions: [['v9', 'Há 5 dias', 'Paulo Henrique', 'atual'], ['v8', 'Há 21 dias', 'Karla Zambelly']],
  },
};

const EMPTY_PROFILE = {
  name: 'Novo agente', title: 'Sem configuração', initials: 'NA',
  status: 'rascunho', publishedAt: 'nunca publicado', version: 'rascunho',
  identity: { name: '', persona: '', tone: 'amigavel', language: 'pt-BR', emoji: 'moderado', length: 'medio' },
  mission: { role: '', primaryGoal: '', secondaryGoal: '', channels: { whatsapp: true, instagram: false, facebook: false, webchat: false, api: false } },
  operation: { schedule: 'business', triggers: [], escalation: 'humano', onError: 'avisar', greeting: '', farewell: '' },
  knowledge: { files: [], qualifyQs: ['', '', ''], objections: [{ q: '', a: '' }], vetoed: [] },
  comms: { autoMsgs: { wait: '', transfer: '', closed: '', followup: '' }, scripts: [{ name: '', body: '' }], ctas: { discovery: '', proposal: '', closing: '' } },
  tech: { integrations: { crm: false, agenda: false, catalog: false, payments: false, erp: false }, platform: 'claude-haiku-4-5', lgpd: { storePII: false, retentionDays: 90, anonymize: true } },
  result: { metrics: { resolution: true, tma: true, csat: false, conversion: true }, reportFreq: 'semanal', reviewTrigger: 'resolution<70' },
  health: { conversations7d: 0, resolutionRate: 0, csat: 0, avgTokens: 0, tmaSeconds: 0 },
  versions: [],
};

// ============================================================================
// Main page
// ============================================================================
function AdminAgent() {
  const { setRoute, routeParam } = useStore();
  const isNew = routeParam === 'new';
  const profileKey = isNew ? null : (AGENT_PROFILES[routeParam] ? routeParam : 'julia');
  const initial = profileKey ? AGENT_PROFILES[profileKey] : EMPTY_PROFILE;

  // form state
  const [identity,  setIdentity]  = React.useState(initial.identity);
  const [mission,   setMission]   = React.useState(initial.mission);
  const [operation, setOperation] = React.useState(initial.operation);
  const [knowledge, setKnowledge] = React.useState(initial.knowledge);
  const [comms,     setComms]     = React.useState(initial.comms);
  const [tech,      setTech]      = React.useState(initial.tech);
  const [result,    setResult]    = React.useState(initial.result);
  const [active,    setActive]    = React.useState(initial.status === 'ativo');
  const [step,      setStep]      = React.useState('identity');
  const [showTest,  setShowTest]  = React.useState(false);

  const blockSteps = [
    { id: 'identity',  label: 'Identidade',   icon: 'user',       hint: 'Como o agente se apresenta' },
    { id: 'mission',   label: 'Missão',       icon: 'leads',      hint: 'O que faz e onde atua' },
    { id: 'operation', label: 'Operação',     icon: 'settings',   hint: 'Quando e como age' },
    { id: 'knowledge', label: 'Conhecimento', icon: 'contracts',  hint: 'Material de treinamento' },
    { id: 'comms',     label: 'Comunicação',  icon: 'chat',       hint: 'Mensagens e roteiros' },
    { id: 'tech',      label: 'Tecnologia',   icon: 'database',   hint: 'Modelo e integrações' },
    { id: 'result',    label: 'Resultado',    icon: 'reports',    hint: 'Métricas e revisões' },
  ];

  return (
    <Page
      title={isNew ? 'Configurar novo agente' : `Agente · ${initial.name}`}
      subtitle={isNew ? 'Personalize o comportamento, voz e regras do agente' : initial.title}
      actions={
        <>
          <button className="btn fin-btn-back" onClick={() => setRoute('agent')}><Ic name="arrow-left" size={14} /> Voltar</button>
          <button className="btn" onClick={() => setShowTest(true)}><Ic name="play" size={14} /> Testar agente</button>
          <button className="btn btn-primary" onClick={() => window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Agente publicado', descricao: 'A nova versão está no ar.' })}><Ic name="check" size={14} /> Salvar e publicar</button>
        </>
      }
    >
      {/* ============ HEADER STRIP ============ */}
      <AgentHeader profile={initial} active={active} setActive={(v) => { setActive(v); window.showToast && window.showToast({ tipo: 'sucesso', titulo: v ? 'Agente ativado' : 'Agente desativado', descricao: v ? 'O agente voltou a atender as conversas.' : 'O agente parou de atender novas conversas.' }); }} identity={identity} />

      {/* ============ BODY: responsive 3-column ============ */}
      <div className="agent-cfg-grid">
        {/* --- LEFT RAIL --- */}
        <div className="agent-cfg-rail">
          {blockSteps.map((s, i) => {
            const on = step === s.id;
            return (
              <div key={s.id} onClick={() => setStep(s.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                  background: on ? 'var(--accent-soft)' : 'transparent',
                  color: on ? 'var(--accent-700)' : 'var(--text)',
                  fontWeight: on ? 600 : 500, fontSize: 'var(--type-sm)',
                  transition: 'background .15s',
                }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: on ? 'var(--accent)' : 'var(--surface-3)',
                  color: on ? 'white' : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div>{s.label}</div>
                  <div className="muted" style={{ fontSize: 11, fontWeight: 400, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.hint}</div>
                </div>
              </div>
            );
          })}

          {/* AI tip */}
          <div className="agent-cfg-tip" style={{ marginTop: 12, padding: 12, border: '1px dashed var(--border-strong)', borderRadius: 10, background: 'var(--surface-2)' }}>
            <div className="ai-grad" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>Dica da IA</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Atualize o <strong style={{ color: 'var(--text)' }}>Bloco 4</strong> sempre que mudar preços ou procedimentos — o agente recalcula a base em segundos.
            </div>
          </div>
        </div>

        {/* --- CENTER --- */}
        <div className="agent-cfg-content">
          {step === 'identity'  && <BlockIdentity  v={identity}  set={setIdentity} />}
          {step === 'mission'   && <BlockMission   v={mission}   set={setMission} />}
          {step === 'operation' && <BlockOperation v={operation} set={setOperation} />}
          {step === 'knowledge' && <BlockKnowledge v={knowledge} set={setKnowledge} />}
          {step === 'comms'     && <BlockComms     v={comms}     set={setComms} />}
          {step === 'tech'      && <BlockTech      v={tech}      set={setTech} />}
          {step === 'result'    && <BlockResult    v={result}    set={setResult} />}

          {/* Step nav under content */}
          <div className="row" style={{ gap: 8, marginTop: 4 }}>
            {(() => {
              const idx = blockSteps.findIndex(s => s.id === step);
              return (
                <>
                  <button className="btn" disabled={idx === 0} onClick={() => setStep(blockSteps[Math.max(0, idx - 1)].id)}>
                    <Ic name="arrow-left" size={13} /> {idx > 0 ? blockSteps[idx - 1].label : 'Anterior'}
                  </button>
                  <div className="spacer" />
                  <button className="btn" disabled={idx === blockSteps.length - 1} onClick={() => setStep(blockSteps[Math.min(blockSteps.length - 1, idx + 1)].id)}>
                    {idx < blockSteps.length - 1 ? blockSteps[idx + 1].label : 'Final'} <Ic name="arrow-right" size={13} />
                  </button>
                </>
              );
            })()}
          </div>
        </div>

        {/* --- RIGHT RAIL --- */}
        <div className="agent-cfg-side">
          <PoweredByClaude onTest={() => setShowTest(true)} />
          {!isNew && <HealthCard h={initial.health} />}
          {!isNew && <VersionsCard versions={initial.versions} />}
        </div>
      </div>

      {showTest && <AgentTester onClose={() => setShowTest(false)} greeting={operation.greeting} agentName={identity.name || initial.name} />}
    </Page>
  );
}

// ============================================================================
// Header strip
// ============================================================================
function AgentHeader({ profile, active, setActive, identity }) {
  const statusBg = profile.status === 'ativo'
    ? 'color-mix(in oklab, var(--accent) 12%, var(--surface))'
    : profile.status === 'rascunho'
      ? 'var(--surface-2)' : 'var(--surface-2)';
  return (
    <div className="card" style={{ padding: 'var(--pad-3) var(--pad-4)', background: statusBg, borderColor: profile.status === 'ativo' ? 'color-mix(in oklab, var(--accent) 22%, var(--border))' : 'var(--border)' }}>
      <div className="row" style={{ gap: 16, alignItems: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg, var(--ai), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 22, flexShrink: 0, boxShadow: '0 6px 16px -4px color-mix(in oklab, var(--ai) 40%, transparent)' }}>
          {profile.initials || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontSize: 'var(--type-xl)', fontWeight: 600, letterSpacing: '-0.01em' }}>{identity.name || profile.name}</div>
            <span className={`badge ${profile.status === 'ativo' ? 'badge-success' : 'badge-neutral'}`}>
              {profile.status === 'ativo' && <span className="dot dot-online" style={{ boxShadow: 'none' }} />}
              {profile.status === 'ativo' ? 'ativo' : profile.status === 'rascunho' ? 'rascunho' : 'pausado'}
            </span>
            <span className="chip" style={{ cursor: 'default' }}><Ic name="sparkles" size={11} /> Powered by Claude</span>
            <span className="chip" style={{ cursor: 'default' }}>{profile.version}</span>
          </div>
          <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>
            {profile.title} · publicado <strong style={{ color: 'var(--text)' }}>{profile.publishedAt}</strong>
          </div>
        </div>
        <div style={{ minWidth: 170, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
          <span className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600 }}>Status</span>
          <Toggle on={active} onChange={setActive} label={active ? 'Ativo' : 'Desativado'} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Right-rail cards
// ============================================================================
function PoweredByClaude({ onTest }) {
  return (
    <div className="card card-pad" style={{ background: 'linear-gradient(135deg, color-mix(in oklab, var(--ai) 8%, var(--surface)), var(--surface))', borderColor: 'color-mix(in oklab, var(--ai) 25%, var(--border))' }}>
      <div className="row" style={{ gap: 6 }}>
        <span className="ai-grad" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>Powered by Claude</span>
        <div className="spacer" />
        <Ic name="sparkles" size={16} style={{ color: 'var(--ai)' }} />
      </div>
      <div style={{ fontSize: 'var(--type-md)', fontWeight: 600, marginTop: 10, letterSpacing: '-0.005em' }}>Multimodal · texto, áudio e imagem</div>
      <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4, lineHeight: 1.5 }}>O agente lê PDFs, transcreve áudios pelo Whisper e analisa fotos enviadas pelo cliente.</div>
      <button className="btn btn-primary" style={{ marginTop: 14, width: '100%', background: 'var(--ai)', borderColor: 'var(--ai)' }} onClick={onTest}>
        <Ic name="play" size={14} /> Testar agente agora
      </button>
    </div>
  );
}

function HealthCard({ h }) {
  const stats = [
    { label: 'Conversas (7d)',   value: h.conversations7d.toLocaleString('pt-BR') },
    { label: 'Resolução',        value: `${Math.round(h.resolutionRate * 100)}%`, tone: h.resolutionRate >= 0.7 ? 'good' : 'warn' },
    { label: 'CSAT',             value: h.csat.toFixed(1), tone: h.csat >= 4.3 ? 'good' : 'warn' },
    { label: 'Tokens · média',   value: `${(h.avgTokens / 1000).toFixed(1)}k` },
    { label: 'TMA',              value: `${Math.floor(h.tmaSeconds / 60)}m ${h.tmaSeconds % 60}s` },
  ];
  return (
    <div className="card card-pad">
      <div className="row"><div className="h3">Saúde do agente</div><div className="spacer" /><span className="badge badge-success">Tudo certo</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)' }}>
            <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 'var(--type-lg)', fontWeight: 600, marginTop: 2, color: s.tone === 'warn' ? 'var(--hue-amber-fg, #b45309)' : 'var(--text)' }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VersionsCard({ versions }) {
  if (!versions || versions.length === 0) return null;
  return (
    <div className="card card-pad">
      <div className="h3">Versões salvas</div>
      <div className="col" style={{ marginTop: 10, gap: 6 }}>
        {versions.map(([v, t, a, c], i) => (
          <div key={i} className="row" style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 'var(--type-sm)' }}>
            <span style={{ fontWeight: 600 }}>{v}</span>
            <span className="muted">{t} · {a}</span>
            <div className="spacer" />
            {c === 'atual' ? <span className="badge badge-success">atual</span> : <span className="muted" style={{ fontSize: 11, cursor: 'pointer' }} onClick={() => window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Versão revertida', descricao: `O agente voltou para a versão ${v}.` })}>reverter</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Shared form primitives (mirrors NewAgentDrawer)
// ============================================================================
const Section = ({ title, desc, n, total, children, foot }) => (
  <div className="card card-pad">
    <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <span className="muted" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>Bloco {n} / {total}</span>
        </div>
        <div className="h2" style={{ fontSize: 'var(--type-lg)', fontWeight: 600, marginTop: 4, letterSpacing: '-0.005em' }}>{title}</div>
        {desc && <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>{desc}</div>}
      </div>
    </div>
    <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    {foot && <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>{foot}</div>}
  </div>
);

const Field = ({ label, hint, children }) => (
  <div style={{ flex: 1, minWidth: 0 }}>
    <label className="label">{label}</label>
    {children}
    {hint && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{hint}</div>}
  </div>
);

const Row = ({ children, gap = 12 }) => (
  <div style={{ display: 'flex', gap, alignItems: 'flex-start' }}>{children}</div>
);

const Seg = ({ value, onChange, options }) => (
  <div style={{ display: 'inline-flex', border: '1px solid var(--border-strong)', borderRadius: 8, overflow: 'hidden' }}>
    {options.map(([id, l], i) => (
      <div key={id} onClick={() => onChange(id)}
        style={{
          padding: '8px 14px', fontSize: 'var(--type-sm)', cursor: 'pointer',
          background: value === id ? 'var(--accent-soft)' : 'var(--surface)',
          color: value === id ? 'var(--accent-700)' : 'var(--text)',
          fontWeight: value === id ? 600 : 500,
          borderRight: i < options.length - 1 ? '1px solid var(--border)' : 'none',
        }}>{l}</div>
    ))}
  </div>
);

const ChipTag = ({ children, onRemove }) => (
  <span className="chip" style={{ cursor: 'default' }}>
    {children} {onRemove && <span style={{ cursor: 'pointer', display: 'inline-flex' }} onClick={onRemove}><Ic name="x" size={11} /></span>}
  </span>
);

// ============================================================================
// Block 1 — Identity
// ============================================================================
function BlockIdentity({ v, set }) {
  return (
    <Section n={1} total={7} title="Identidade" desc="Como o agente se apresenta e fala com os clientes.">
      <Row>
        <Field label="Nome do agente *" hint="Como ele se chama. Ex: Júlia">
          <input className="input" placeholder="Ex: Júlia" value={v.name} onChange={e => set({ ...v, name: e.target.value })} />
        </Field>
        <Field label="Persona / personalidade" hint="Frase curta que descreve o estilo.">
          <input className="input" placeholder="Ex: Atendente calorosa e organizada, com toque carioca." value={v.persona} onChange={e => set({ ...v, persona: e.target.value })} />
        </Field>
      </Row>
      <Row>
        <Field label="Tom de voz">
          <Seg value={v.tone} onChange={x => set({ ...v, tone: x })}
            options={[['formal','Formal'],['amigavel','Amigável'],['informal','Informal'],['tecnico','Técnico']]} />
        </Field>
        <Field label="Idioma principal">
          <select className="input" value={v.language} onChange={e => set({ ...v, language: e.target.value })}>
            <option value="pt-BR">Português (BR)</option>
            <option value="es">Espanhol</option>
            <option value="en">Inglês</option>
          </select>
        </Field>
      </Row>
      <Row>
        <Field label="Uso de emoji">
          <Seg value={v.emoji} onChange={x => set({ ...v, emoji: x })}
            options={[['nenhum','Nenhum'],['moderado','Moderado'],['expressivo','Expressivo']]} />
        </Field>
        <Field label="Tamanho das respostas">
          <Seg value={v.length} onChange={x => set({ ...v, length: x })}
            options={[['curto','Curtas'],['medio','Médias'],['longo','Detalhadas']]} />
        </Field>
      </Row>
    </Section>
  );
}

// ============================================================================
// Block 2 — Mission
// ============================================================================
function BlockMission({ v, set }) {
  const channelDefs = [
    ['whatsapp',  'WhatsApp',           'whatsapp',  '#25d366'],
    ['instagram', 'Instagram Direct',   'instagram', '#e4405f'],
    ['facebook',  'Facebook Messenger', 'facebook',  '#1877f2'],
    ['webchat',   'Webchat do site',    'chat',      '#0EA5E9'],
    ['api',       'API externa',        'database',  '#6b7280'],
  ];
  return (
    <Section n={2} total={7} title="Missão" desc="O que o agente faz e onde ele atua.">
      <Field label="Função principal *" hint="Resuma em uma frase a função do agente.">
        <input className="input" placeholder="Ex: Atender clientes da clínica, tirar dúvidas e agendar horários." value={v.role} onChange={e => set({ ...v, role: e.target.value })} />
      </Field>
      <Row>
        <Field label="Objetivo primário" hint="A meta nº 1 da conversa.">
          <input className="input" placeholder="Ex: Agendar consulta" value={v.primaryGoal} onChange={e => set({ ...v, primaryGoal: e.target.value })} />
        </Field>
        <Field label="Objetivo secundário" hint="O que o agente também tenta fazer.">
          <input className="input" placeholder="Ex: Capturar e-mail do lead" value={v.secondaryGoal} onChange={e => set({ ...v, secondaryGoal: e.target.value })} />
        </Field>
      </Row>
      <div>
        <label className="label">Canais de operação</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginTop: 4 }}>
          {channelDefs.map(([id, label, icon, color]) => {
            const on = v.channels[id];
            return (
              <div key={id} onClick={() => set({ ...v, channels: { ...v.channels, [id]: !on } })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
                  border: `1px solid ${on ? 'var(--accent)' : 'var(--border-strong)'}`,
                  background: on ? 'var(--accent-soft)' : 'var(--surface)', cursor: 'pointer',
                  transition: 'border-color .12s, background .12s',
                }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: `color-mix(in oklab, ${color} 14%, var(--surface))`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic name={icon} size={15} /></div>
                <span style={{ flex: 1, fontSize: 'var(--type-sm)', fontWeight: 500 }}>{label}</span>
                <input type="checkbox" checked={on} readOnly />
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

// ============================================================================
// Block 3 — Operation
// ============================================================================
function BlockOperation({ v, set }) {
  const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  return (
    <Section n={3} total={7} title="Operação" desc="Quando e como o agente entra em ação.">
      <Field label="Horário de funcionamento">
        <Seg value={v.schedule} onChange={x => set({ ...v, schedule: x })}
          options={[['247','24h · todos os dias'],['business','Comercial'],['custom','Personalizado']]} />
      </Field>

      {v.schedule === 'custom' && (
        <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface-2)' }}>
          <div className="col" style={{ gap: 6 }}>
            {days.map((d, i) => (
              <div key={d} className="row" style={{ gap: 12, padding: '4px 0' }}>
                <Toggle on={i < 6} compact />
                <span style={{ width: 90, fontSize: 'var(--type-sm)' }}>{d}</span>
                <span className="muted" style={{ fontSize: 'var(--type-sm)' }}>{i === 6 ? 'Fechado' : i === 5 ? '08:00 — 14:00' : '08:00 — 19:00'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="label">Gatilhos de ativação</label>
        <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>O agente é ativado quando…</div>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {v.triggers.map((t, i) => (
            <ChipTag key={i} onRemove={() => set({ ...v, triggers: v.triggers.filter((_, idx) => idx !== i) })}>{t}</ChipTag>
          ))}
          <span className="chip" style={{ cursor: 'pointer' }} onClick={() => {
            const val = window.prompt('Novo gatilho:');
            if (val) set({ ...v, triggers: [...v.triggers, val] });
          }}><Ic name="plus" size={11} /> adicionar gatilho</span>
        </div>
      </div>

      <Row>
        <Field label="Fluxo de escalada" hint="Quando ele transfere a conversa.">
          <select className="input" value={v.escalation} onChange={e => set({ ...v, escalation: e.target.value })}>
            <option value="humano">Transferir para atendente humano</option>
            <option value="fila">Adicionar à fila de espera</option>
            <option value="ninguem">Encerrar conversa educadamente</option>
            <option value="especialista">Encaminhar para outro agente especialista</option>
          </select>
        </Field>
        <Field label="Comportamento em erro" hint="Se algo der errado na resposta…">
          <select className="input" value={v.onError} onChange={e => set({ ...v, onError: e.target.value })}>
            <option value="avisar">Avisar e transferir para humano</option>
            <option value="repetir">Pedir para o cliente reformular</option>
            <option value="encerrar">Encerrar com mensagem padrão</option>
          </select>
        </Field>
      </Row>

      <Field label="Mensagem de apresentação" hint="Primeira mensagem ao iniciar a conversa.">
        <textarea className="input" rows={2} placeholder="Oi! Eu sou a [Nome]…" value={v.greeting} onChange={e => set({ ...v, greeting: e.target.value })} />
      </Field>
      <Field label="Mensagem de encerramento" hint="Despedida ao final do atendimento.">
        <textarea className="input" rows={2} placeholder="Foi um prazer te atender!" value={v.farewell} onChange={e => set({ ...v, farewell: e.target.value })} />
      </Field>
    </Section>
  );
}

// ============================================================================
// Block 4 — Knowledge
// ============================================================================
function BlockKnowledge({ v, set }) {
  const fileInputRef = React.useRef(null);
  const [dragOver, setDragOver] = React.useState(false);
  const onFiles = (fileList) => {
    const added = Array.from(fileList).map(f => ({ name: f.name, size: f.size, type: f.name.split('.').pop().toLowerCase() }));
    set({ ...v, files: [...v.files, ...added] });
  };
  const removeFile = (i) => set({ ...v, files: v.files.filter((_, idx) => idx !== i) });
  const fmtSize = (b) => b > 1024*1024 ? (b/1024/1024).toFixed(1) + ' MB' : (b/1024).toFixed(0) + ' KB';

  return (
    <Section n={4} total={7} title="Conhecimento" desc="O material que treina o agente e os limites do que ele pode dizer.">
      <div>
        <label className="label">Base de conhecimento</label>
        <div className="muted" style={{ fontSize: 11, marginBottom: 8 }}>Envie PDFs, DOCs ou TXTs com informações de treinamento, manuais de produto, FAQ, etc.</div>
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); onFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `1.5px dashed ${dragOver ? 'var(--accent)' : 'var(--border-strong)'}`, borderRadius: 12,
            padding: '24px 16px', textAlign: 'center', cursor: 'pointer',
            background: dragOver ? 'var(--accent-soft)' : 'var(--surface-2)', transition: 'all .15s',
          }}>
          <div style={{ width: 44, height: 44, margin: '0 auto 10px', borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic name="file" size={22} /></div>
          <div style={{ fontWeight: 600 }}>Arraste arquivos aqui ou clique para enviar</div>
          <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>PDF, DOC, DOCX, TXT, MD · até 25 MB cada</div>
          <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.md" style={{ display: 'none' }} onChange={e => onFiles(e.target.files)} />
        </div>
        {v.files.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {v.files.map((f, i) => {
              const isPdf = f.type === 'pdf';
              const color = isPdf ? '#dc2626' : '#2563eb';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: `color-mix(in oklab, ${color} 14%, var(--surface))`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{f.type.toUpperCase().slice(0,4)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--type-sm)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{fmtSize(f.size)} · <span style={{ color: 'var(--accent-700)' }}>processado</span></div>
                  </div>
                  <button className="btn btn-ghost btn-icon" onClick={() => removeFile(i)}><Ic name="trash" size={14} /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <label className="label">Perguntas de qualificação</label>
        <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>O agente faz estas perguntas para entender o cliente antes de transferir/agendar.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {v.qualifyQs.map((q, i) => (
            <div key={i} className="row" style={{ gap: 6 }}>
              <span className="muted" style={{ width: 24, fontSize: 'var(--type-sm)' }}>#{i+1}</span>
              <input className="input" placeholder="Pergunta…" value={q} onChange={e => {
                const arr = [...v.qualifyQs]; arr[i] = e.target.value;
                set({ ...v, qualifyQs: arr });
              }} />
              <button className="btn btn-ghost btn-icon" onClick={() => set({ ...v, qualifyQs: v.qualifyQs.filter((_, idx) => idx !== i) })}><Ic name="x" size={14} /></button>
            </div>
          ))}
          <button className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => set({ ...v, qualifyQs: [...v.qualifyQs, ''] })}><Ic name="plus" size={12} /> Adicionar pergunta</button>
        </div>
      </div>

      <div>
        <label className="label">Respostas para objeções</label>
        <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>Como responder quando o cliente diz "tá caro", "vou pensar", etc.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {v.objections.map((o, i) => (
            <div key={i} style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input className="input" placeholder='Objeção do cliente. Ex: "está caro"' value={o.q} onChange={e => {
                const arr = [...v.objections]; arr[i] = { ...arr[i], q: e.target.value };
                set({ ...v, objections: arr });
              }} />
              <textarea className="input" rows={2} placeholder="Resposta que o agente deve dar." value={o.a} onChange={e => {
                const arr = [...v.objections]; arr[i] = { ...arr[i], a: e.target.value };
                set({ ...v, objections: arr });
              }} />
            </div>
          ))}
          <button className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => set({ ...v, objections: [...v.objections, { q: '', a: '' }] })}><Ic name="plus" size={12} /> Adicionar objeção</button>
        </div>
      </div>

      <div>
        <label className="label">Tópicos vetados</label>
        <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>O agente NUNCA fala sobre estes tópicos.</div>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {v.vetoed.map((t, i) => (
            <ChipTag key={i} onRemove={() => set({ ...v, vetoed: v.vetoed.filter((_, idx) => idx !== i) })}>{t}</ChipTag>
          ))}
          <span className="chip" style={{ cursor: 'pointer' }} onClick={() => {
            const val = window.prompt('Tópico a vetar:');
            if (val) set({ ...v, vetoed: [...v.vetoed, val] });
          }}><Ic name="plus" size={11} /> adicionar</span>
        </div>
      </div>
    </Section>
  );
}

// ============================================================================
// Block 5 — Communication
// ============================================================================
function BlockComms({ v, set }) {
  const autoDefs = [
    ['wait',     'Cliente esperando muito', 'Estou checando aqui rapidinho, só um instante 🙏'],
    ['transfer', 'Antes de transferir',      'Vou te conectar com nossa equipe. Só um momento.'],
    ['closed',   'Fora do horário',          'Estamos fora do horário. Voltamos {horario_abertura}.'],
    ['followup', 'Follow-up automático',     'Oi! Ainda quer seguir com o atendimento?'],
  ];
  return (
    <Section n={5} total={7} title="Comunicação" desc="As mensagens prontas e roteiros usados pelo agente.">
      <div>
        <label className="label">Mensagens automáticas por situação</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
          {autoDefs.map(([k, label, ph]) => (
            <div key={k}>
              <div style={{ fontSize: 'var(--type-sm)', fontWeight: 500, marginBottom: 4 }}>{label}</div>
              <textarea className="input" rows={2} placeholder={ph} value={v.autoMsgs[k]} onChange={e => set({ ...v, autoMsgs: { ...v.autoMsgs, [k]: e.target.value } })} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Roteiros de conversa</label>
        <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>Fluxos pré-definidos que o agente pode seguir.</div>
        {v.scripts.map((s, i) => (
          <div key={i} style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8 }}>
            <input className="input" placeholder="Nome do roteiro" value={s.name} onChange={e => {
              const arr = [...v.scripts]; arr[i] = { ...arr[i], name: e.target.value };
              set({ ...v, scripts: arr });
            }} style={{ marginBottom: 6, fontWeight: 600 }} />
            <textarea className="input" rows={3} placeholder="1. Cumprimentar&#10;2. Apresentar serviços&#10;3. Convidar para agendamento" value={s.body} onChange={e => {
              const arr = [...v.scripts]; arr[i] = { ...arr[i], body: e.target.value };
              set({ ...v, scripts: arr });
            }} />
          </div>
        ))}
        <button className="btn btn-sm" onClick={() => set({ ...v, scripts: [...v.scripts, { name: '', body: '' }] })}><Ic name="plus" size={12} /> Adicionar roteiro</button>
      </div>

      <div>
        <label className="label">CTAs por etapa da conversa</label>
        <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>Ações que o agente sugere ao cliente em cada momento.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[['discovery','Descoberta','Quer ver nossos pacotes?'], ['proposal','Proposta','Te mando o orçamento?'], ['closing','Fechamento','Posso já agendar?']].map(([k, l, ph]) => (
            <div key={k}>
              <div style={{ fontSize: 'var(--type-sm)', fontWeight: 500, marginBottom: 4 }}>{l}</div>
              <input className="input" placeholder={ph} value={v.ctas[k]} onChange={e => set({ ...v, ctas: { ...v.ctas, [k]: e.target.value } })} />
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ============================================================================
// Block 6 — Technology
// ============================================================================
function BlockTech({ v, set }) {
  const integDefs = [
    ['crm',      'CRM Kanban',        'columns',  '#0EA5E9'],
    ['agenda',   'Agenda',            'agenda',   '#10B981'],
    ['catalog',  'Catálogo',          'package',  '#8B5CF6'],
    ['payments', 'Pagamentos',        'wallet',   '#F472B6'],
    ['erp',      'ERP / API interna', 'database', '#6b7280'],
  ];
  return (
    <Section n={6} total={7} title="Tecnologia" desc="Modelo, integrações e regras de privacidade.">
      <div>
        <label className="label">Integrações ativas</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8, marginTop: 4 }}>
          {integDefs.map(([id, label, icon, color]) => {
            const on = v.integrations[id];
            return (
              <div key={id} onClick={() => set({ ...v, integrations: { ...v.integrations, [id]: !on } })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
                  border: `1px solid ${on ? 'var(--accent)' : 'var(--border-strong)'}`,
                  background: on ? 'var(--accent-soft)' : 'var(--surface)', cursor: 'pointer',
                  transition: 'border-color .12s, background .12s',
                }}>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: `color-mix(in oklab, ${color} 14%, var(--surface))`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic name={icon} size={14} /></div>
                <span style={{ flex: 1, fontSize: 'var(--type-sm)', fontWeight: 500 }}>{label}</span>
                <input type="checkbox" checked={on} readOnly />
              </div>
            );
          })}
        </div>
      </div>

      <Field label="Plataforma / Modelo">
        <select className="input" value={v.platform} onChange={e => set({ ...v, platform: e.target.value })}>
          <option value="claude-haiku-4-5">Claude Haiku 4.5 — rápido e econômico</option>
          <option value="claude-sonnet-4-5">Claude Sonnet 4.5 — equilíbrio</option>
          <option value="claude-opus-4">Claude Opus 4 — máxima qualidade</option>
        </select>
      </Field>

      <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface-2)' }}>
        <div className="row" style={{ gap: 8, marginBottom: 10 }}>
          <Ic name="shield" size={16} style={{ color: 'var(--accent)' }} />
          <strong>Regras de LGPD</strong>
        </div>
        <div className="col" style={{ gap: 10 }}>
          <label className="row" style={{ gap: 8, cursor: 'pointer', fontSize: 'var(--type-sm)' }}>
            <input type="checkbox" checked={v.lgpd.storePII} onChange={e => set({ ...v, lgpd: { ...v.lgpd, storePII: e.target.checked }})} />
            Armazenar dados pessoais (CPF, e-mail, telefone) nas conversas
          </label>
          <label className="row" style={{ gap: 8, cursor: 'pointer', fontSize: 'var(--type-sm)' }}>
            <input type="checkbox" checked={v.lgpd.anonymize} onChange={e => set({ ...v, lgpd: { ...v.lgpd, anonymize: e.target.checked }})} />
            Anonimizar dados ao exportar transcrições
          </label>
          <Field label="Retenção das conversas">
            <select className="input" value={v.lgpd.retentionDays} onChange={e => set({ ...v, lgpd: { ...v.lgpd, retentionDays: Number(e.target.value) }})}>
              <option value={30}>30 dias</option>
              <option value={90}>90 dias</option>
              <option value={180}>6 meses</option>
              <option value={365}>1 ano</option>
              <option value={0}>Indefinido</option>
            </select>
          </Field>
        </div>
      </div>
    </Section>
  );
}

// ============================================================================
// Block 7 — Result
// ============================================================================
function BlockResult({ v, set }) {
  const metricDefs = [
    ['resolution', 'Taxa de resolução pela IA', '% de conversas resolvidas sem humano'],
    ['tma',        'Tempo médio de atendimento', 'Quanto tempo leva por conversa'],
    ['csat',       'Satisfação do cliente (CSAT)', 'Nota de 1–5 ao final da conversa'],
    ['conversion', 'Taxa de conversão',           'Leads → agendamento / venda'],
  ];
  return (
    <Section n={7} total={7} title="Resultado" desc="O que medir e quando revisar o agente.">
      <div>
        <label className="label">Métricas de desempenho a acompanhar</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 4 }}>
          {metricDefs.map(([k, l, desc]) => {
            const on = v.metrics[k];
            return (
              <div key={k} onClick={() => set({ ...v, metrics: { ...v.metrics, [k]: !on }})}
                style={{ padding: 10, border: `1px solid ${on ? 'var(--accent)' : 'var(--border-strong)'}`, borderRadius: 10, background: on ? 'var(--accent-soft)' : 'var(--surface)', cursor: 'pointer' }}>
                <div className="row" style={{ gap: 8 }}>
                  <input type="checkbox" checked={on} readOnly />
                  <strong style={{ fontSize: 'var(--type-sm)' }}>{l}</strong>
                </div>
                <div className="muted" style={{ fontSize: 11, marginTop: 4, paddingLeft: 22 }}>{desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      <Row>
        <Field label="Frequência do relatório">
          <Seg value={v.reportFreq} onChange={x => set({ ...v, reportFreq: x })}
            options={[['diario','Diário'],['semanal','Semanal'],['mensal','Mensal']]} />
        </Field>
        <Field label="Critério de revisão automática" hint="Quando o sistema vai sugerir revisar o agente.">
          <select className="input" value={v.reviewTrigger} onChange={e => set({ ...v, reviewTrigger: e.target.value })}>
            <option value="resolution<70">Se resolução cair abaixo de 70%</option>
            <option value="resolution<60">Se resolução cair abaixo de 60%</option>
            <option value="csat<4">Se CSAT cair abaixo de 4,0</option>
            <option value="failures>5">Se houver mais de 5 falhas em 24h</option>
            <option value="never">Nunca (revisar manualmente)</option>
          </select>
        </Field>
      </Row>
    </Section>
  );
}

Object.assign(window, { AdminAgent });
