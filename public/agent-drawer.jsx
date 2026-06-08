// agent-drawer.jsx — full configuration drawer for creating a new AI agent
// Opens at 80vw from right; 7 organized blocks + training docs upload.

function NewAgentDrawer({ onClose }) {
  // ---- form state ----
  const [step, setStep] = React.useState(0);
  const [identity, setIdentity] = React.useState({
    name: '', persona: '', tone: 'amigavel', language: 'pt-BR',
    emoji: 'moderado', length: 'medio'
  });
  const [mission, setMission] = React.useState({
    role: '', primaryGoal: '', secondaryGoal: '',
    channels: { whatsapp: true, instagram: false, facebook: false, webchat: false, api: false }
  });
  const [operation, setOperation] = React.useState({
    schedule: 'business',
    triggers: ['Cliente envia primeira mensagem', 'Palavra-chave: orçamento'],
    escalation: 'humano',
    onError: 'avisar',
    greeting: '',
    farewell: ''
  });
  const [knowledge, setKnowledge] = React.useState({
    files: [],
    qualifyQs: ['', '', ''],
    objections: [{ q: '', a: '' }],
    vetoed: ['política', 'religião']
  });
  const [comms, setComms] = React.useState({
    autoMsgs: { wait: '', transfer: '', closed: '', followup: '' },
    scripts: [{ name: 'Apresentação de serviços', body: '' }],
    ctas: { discovery: '', proposal: '', closing: '' }
  });
  const [tech, setTech] = React.useState({
    integrations: { crm: true, agenda: true, catalog: true, payments: false, erp: false },
    platform: 'claude-haiku-4-5',
    lgpd: { storePII: false, retentionDays: 90, anonymize: true }
  });
  const [result, setResult] = React.useState({
    metrics: { resolution: true, tma: true, csat: false, conversion: true },
    reportFreq: 'semanal',
    reviewTrigger: 'resolution<70'
  });

  const steps = [
    { id: 'identity',  label: '1 · Identidade',   icon: 'user' },
    { id: 'mission',   label: '2 · Missão',       icon: 'leads' },
    { id: 'operation', label: '3 · Operação',     icon: 'settings' },
    { id: 'knowledge', label: '4 · Conhecimento', icon: 'contracts' },
    { id: 'comms',     label: '5 · Comunicação',  icon: 'chat' },
    { id: 'tech',      label: '6 · Tecnologia',   icon: 'database' },
    { id: 'result',    label: '7 · Resultado',    icon: 'reports' },
  ];

  // ---- file upload helpers ----
  const fileInputRef = React.useRef(null);
  const [dragOver, setDragOver] = React.useState(false);
  const onFiles = (fileList) => {
    const added = Array.from(fileList).map(f => ({
      name: f.name,
      size: f.size,
      type: f.name.split('.').pop().toLowerCase()
    }));
    setKnowledge(k => ({ ...k, files: [...k.files, ...added] }));
  };
  const removeFile = (i) => setKnowledge(k => ({ ...k, files: k.files.filter((_, idx) => idx !== i) }));
  const fmtSize = (b) => b > 1024*1024 ? (b/1024/1024).toFixed(1) + ' MB' : (b/1024).toFixed(0) + ' KB';

  // ---- helpers ----
  const ChipTag = ({ children, onRemove }) => (
    <span className="chip" style={{ cursor: 'default' }}>{children} {onRemove && <span style={{ cursor: 'pointer' }} onClick={onRemove}><Ic name="x" size={11} /></span>}</span>
  );

  const Seg = ({ value, onChange, options }) => (
    <div style={{ display: 'inline-flex', border: '1px solid var(--border-strong)', borderRadius: 8, overflow: 'hidden' }}>
      {options.map(([id, l]) => (
        <div key={id} onClick={() => onChange(id)}
          style={{ padding: '8px 14px', fontSize: 'var(--type-sm)', cursor: 'pointer',
            background: value === id ? 'var(--accent-soft)' : 'var(--surface)',
            color: value === id ? 'var(--accent-700)' : 'var(--text)',
            fontWeight: value === id ? 600 : 500,
            borderRight: '1px solid var(--border)' }}>{l}</div>
      ))}
    </div>
  );

  const SectionCard = ({ title, desc, children }) => (
    <div className="card card-pad" style={{ marginBottom: 14 }}>
      <div className="h3">{title}</div>
      {desc && <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>{desc}</div>}
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </div>
  );

  const Field = ({ label, hint, children, cols }) => (
    <div style={{ flex: cols || 1, minWidth: 0 }}>
      <label className="label">{label}</label>
      {children}
      {hint && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{hint}</div>}
    </div>
  );

  const Row = ({ children, gap = 12 }) => (
    <div style={{ display: 'flex', gap, alignItems: 'flex-start' }}>{children}</div>
  );

  // ---- BLOCKS ----
  const Block1Identity = () => (
    <>
      <SectionCard title="Bloco 1 — Identidade" desc="Como o agente se apresenta e fala com os clientes.">
        <Row>
          <Field label="Nome do agente *" hint="Como ele se chama. Ex: Júlia">
            <input className="input" placeholder="Ex: Júlia" value={identity.name} onChange={e => setIdentity({ ...identity, name: e.target.value })} />
          </Field>
          <Field label="Persona / personalidade" hint="Frase curta que descreve o estilo.">
            <input className="input" placeholder="Ex: Atendente calorosa e organizada, com toque carioca." value={identity.persona} onChange={e => setIdentity({ ...identity, persona: e.target.value })} />
          </Field>
        </Row>
        <Row>
          <Field label="Tom de voz">
            <Seg value={identity.tone} onChange={v => setIdentity({ ...identity, tone: v })}
              options={[['formal','Formal'],['amigavel','Amigável'],['informal','Informal'],['tecnico','Técnico']]} />
          </Field>
          <Field label="Idioma principal">
            <select className="input" value={identity.language} onChange={e => setIdentity({ ...identity, language: e.target.value })}>
              <option value="pt-BR">Português (BR)</option>
              <option value="es">Espanhol</option>
              <option value="en">Inglês</option>
            </select>
          </Field>
        </Row>
        <Row>
          <Field label="Uso de emoji">
            <Seg value={identity.emoji} onChange={v => setIdentity({ ...identity, emoji: v })}
              options={[['nenhum','Nenhum'],['moderado','Moderado'],['expressivo','Expressivo']]} />
          </Field>
          <Field label="Tamanho das respostas">
            <Seg value={identity.length} onChange={v => setIdentity({ ...identity, length: v })}
              options={[['curto','Curtas'],['medio','Médias'],['longo','Detalhadas']]} />
          </Field>
        </Row>
      </SectionCard>
    </>
  );

  const Block2Mission = () => (
    <SectionCard title="Bloco 2 — Missão" desc="O que o agente faz e onde ele atua.">
      <Field label="Função principal *" hint="Resuma em uma frase a função do agente.">
        <input className="input" placeholder="Ex: Atender clientes da clínica, tirar dúvidas e agendar horários." value={mission.role} onChange={e => setMission({ ...mission, role: e.target.value })} />
      </Field>
      <Row>
        <Field label="Objetivo primário" hint="A meta nº 1 da conversa.">
          <input className="input" placeholder="Ex: Agendar consulta" value={mission.primaryGoal} onChange={e => setMission({ ...mission, primaryGoal: e.target.value })} />
        </Field>
        <Field label="Objetivo secundário" hint="O que o agente também tenta fazer.">
          <input className="input" placeholder="Ex: Capturar e-mail do lead" value={mission.secondaryGoal} onChange={e => setMission({ ...mission, secondaryGoal: e.target.value })} />
        </Field>
      </Row>
      <div>
        <label className="label">Canais de operação</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8, marginTop: 4 }}>
          {[
            ['whatsapp','WhatsApp','whatsapp','#25d366'],
            ['instagram','Instagram Direct','instagram','#e4405f'],
            ['facebook','Facebook Messenger','facebook','#1877f2'],
            ['webchat','Webchat do site','chat','#0EA5E9'],
            ['api','API externa','database','#6b7280'],
          ].map(([id, label, icon, color]) => {
            const on = mission.channels[id];
            return (
              <div key={id} onClick={() => setMission({ ...mission, channels: { ...mission.channels, [id]: !on }})}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
                  border: `1px solid ${on ? 'var(--accent)' : 'var(--border-strong)'}`,
                  background: on ? 'var(--accent-soft)' : 'var(--surface)', cursor: 'pointer' }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: `color-mix(in oklab, ${color} 14%, var(--surface))`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic name={icon} size={15} /></div>
                <span style={{ flex: 1, fontSize: 'var(--type-sm)', fontWeight: 500 }}>{label}</span>
                <input type="checkbox" checked={on} readOnly />
              </div>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );

  const Block3Operation = () => (
    <SectionCard title="Bloco 3 — Operação" desc="Quando e como o agente entra em ação.">
      <Field label="Horário de funcionamento">
        <Seg value={operation.schedule} onChange={v => setOperation({ ...operation, schedule: v })}
          options={[['247','24h · todos os dias'],['business','Comercial (Seg-Sex 8h-19h)'],['custom','Personalizado']]} />
      </Field>

      <div>
        <label className="label">Gatilhos de ativação</label>
        <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>O agente é ativado quando…</div>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {operation.triggers.map((t, i) => (
            <ChipTag key={i} onRemove={() => setOperation({ ...operation, triggers: operation.triggers.filter((_, idx) => idx !== i) })}>{t}</ChipTag>
          ))}
          <span className="chip" style={{ cursor: 'pointer' }} onClick={() => {
            const v = window.prompt('Novo gatilho:');
            if (v) setOperation({ ...operation, triggers: [...operation.triggers, v] });
          }}><Ic name="plus" size={11} /> adicionar gatilho</span>
        </div>
      </div>

      <Row>
        <Field label="Fluxo de escalada" hint="Quando ele transfere a conversa.">
          <select className="input" value={operation.escalation} onChange={e => setOperation({ ...operation, escalation: e.target.value })}>
            <option value="humano">Transferir para atendente humano</option>
            <option value="fila">Adicionar à fila de espera</option>
            <option value="ninguem">Encerrar conversa educadamente</option>
            <option value="especialista">Encaminhar para outro agente especialista</option>
          </select>
        </Field>
        <Field label="Comportamento em erro" hint="Se algo der errado na resposta…">
          <select className="input" value={operation.onError} onChange={e => setOperation({ ...operation, onError: e.target.value })}>
            <option value="avisar">Avisar e transferir para humano</option>
            <option value="repetir">Pedir para o cliente reformular</option>
            <option value="encerrar">Encerrar com mensagem padrão</option>
          </select>
        </Field>
      </Row>

      <Field label="Mensagem de apresentação" hint="Primeira mensagem ao iniciar a conversa.">
        <textarea className="input" rows={2} placeholder="Oi! Eu sou a [Nome], assistente da [Empresa]. Em que posso te ajudar?" value={operation.greeting} onChange={e => setOperation({ ...operation, greeting: e.target.value })} />
      </Field>
      <Field label="Mensagem de encerramento" hint="Despedida ao final do atendimento.">
        <textarea className="input" rows={2} placeholder="Foi um prazer te atender! Qualquer coisa, é só chamar 💛" value={operation.farewell} onChange={e => setOperation({ ...operation, farewell: e.target.value })} />
      </Field>
    </SectionCard>
  );

  const Block4Knowledge = () => (
    <SectionCard title="Bloco 4 — Conhecimento" desc="O material que treina o agente e os limites do que ele pode dizer.">
      <div>
        <label className="label">Base de conhecimento</label>
        <div className="muted" style={{ fontSize: 11, marginBottom: 8 }}>Envie PDFs, DOCs ou TXTs com informações de treinamento, manuais de produto, FAQ, etc.</div>
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); onFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
          style={{ border: `1.5px dashed ${dragOver ? 'var(--accent)' : 'var(--border-strong)'}`, borderRadius: 12,
            padding: '26px 16px', textAlign: 'center', cursor: 'pointer',
            background: dragOver ? 'var(--accent-soft)' : 'var(--surface-2)', transition: 'all .15s' }}>
          <div style={{ width: 44, height: 44, margin: '0 auto 10px', borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic name="file" size={22} /></div>
          <div style={{ fontWeight: 600 }}>Arraste arquivos aqui ou clique para enviar</div>
          <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>Aceitamos PDF, DOC, DOCX, TXT, MD · até 25 MB cada</div>
          <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.md" style={{ display: 'none' }} onChange={e => onFiles(e.target.files)} />
        </div>
        {knowledge.files.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {knowledge.files.map((f, i) => {
              const isPdf = f.type === 'pdf';
              const color = isPdf ? '#dc2626' : '#2563eb';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: `color-mix(in oklab, ${color} 14%, var(--surface))`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{f.type.toUpperCase().slice(0,4)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--type-sm)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{fmtSize(f.size)} · processando…</div>
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
          {knowledge.qualifyQs.map((q, i) => (
            <div key={i} className="row" style={{ gap: 6 }}>
              <span className="muted" style={{ width: 24, fontSize: 'var(--type-sm)' }}>#{i+1}</span>
              <input className="input" placeholder={i === 0 ? 'Ex: Como podemos te ajudar hoje?' : 'Outra pergunta…'} value={q} onChange={e => {
                const arr = [...knowledge.qualifyQs]; arr[i] = e.target.value;
                setKnowledge({ ...knowledge, qualifyQs: arr });
              }} />
              <button className="btn btn-ghost btn-icon" onClick={() => setKnowledge({ ...knowledge, qualifyQs: knowledge.qualifyQs.filter((_, idx) => idx !== i) })}><Ic name="x" size={14} /></button>
            </div>
          ))}
          <button className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setKnowledge({ ...knowledge, qualifyQs: [...knowledge.qualifyQs, ''] })}><Ic name="plus" size={12} /> Adicionar pergunta</button>
        </div>
      </div>

      <div>
        <label className="label">Respostas para objeções</label>
        <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>Como responder quando o cliente diz "tá caro", "vou pensar", etc.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {knowledge.objections.map((o, i) => (
            <div key={i} style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input className="input" placeholder='Objeção do cliente. Ex: "está caro"' value={o.q} onChange={e => {
                const arr = [...knowledge.objections]; arr[i] = { ...arr[i], q: e.target.value };
                setKnowledge({ ...knowledge, objections: arr });
              }} />
              <textarea className="input" rows={2} placeholder="Resposta que o agente deve dar." value={o.a} onChange={e => {
                const arr = [...knowledge.objections]; arr[i] = { ...arr[i], a: e.target.value };
                setKnowledge({ ...knowledge, objections: arr });
              }} />
            </div>
          ))}
          <button className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setKnowledge({ ...knowledge, objections: [...knowledge.objections, { q: '', a: '' }] })}><Ic name="plus" size={12} /> Adicionar objeção</button>
        </div>
      </div>

      <div>
        <label className="label">Tópicos vetados</label>
        <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>O agente NUNCA fala sobre estes tópicos.</div>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {knowledge.vetoed.map((t, i) => (
            <ChipTag key={i} onRemove={() => setKnowledge({ ...knowledge, vetoed: knowledge.vetoed.filter((_, idx) => idx !== i) })}>{t}</ChipTag>
          ))}
          <span className="chip" style={{ cursor: 'pointer' }} onClick={() => {
            const v = window.prompt('Tópico a vetar:');
            if (v) setKnowledge({ ...knowledge, vetoed: [...knowledge.vetoed, v] });
          }}><Ic name="plus" size={11} /> adicionar</span>
        </div>
      </div>
    </SectionCard>
  );

  const Block5Comms = () => (
    <SectionCard title="Bloco 5 — Comunicação" desc="As mensagens prontas e roteiros usados pelo agente.">
      <div>
        <label className="label">Mensagens automáticas por situação</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
          {[
            ['wait',     'Cliente esperando muito', 'Estou checando aqui rapidinho, só um instante 🙏'],
            ['transfer', 'Antes de transferir',      'Vou te conectar com nossa equipe. Só um momento.'],
            ['closed',   'Fora do horário',          'Estamos fora do horário. Voltamos {horario_abertura}.'],
            ['followup', 'Follow-up automático',     'Oi! Ainda quer seguir com o atendimento?'],
          ].map(([k, label, ph]) => (
            <div key={k}>
              <div style={{ fontSize: 'var(--type-sm)', fontWeight: 500, marginBottom: 4 }}>{label}</div>
              <textarea className="input" rows={2} placeholder={ph} value={comms.autoMsgs[k]} onChange={e => setComms({ ...comms, autoMsgs: { ...comms.autoMsgs, [k]: e.target.value } })} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Roteiros de conversa</label>
        <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>Fluxos pré-definidos que o agente pode seguir.</div>
        {comms.scripts.map((s, i) => (
          <div key={i} style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8 }}>
            <input className="input" placeholder="Nome do roteiro" value={s.name} onChange={e => {
              const arr = [...comms.scripts]; arr[i] = { ...arr[i], name: e.target.value };
              setComms({ ...comms, scripts: arr });
            }} style={{ marginBottom: 6, fontWeight: 600 }} />
            <textarea className="input" rows={3} placeholder="1. Cumprimentar&#10;2. Apresentar serviços&#10;3. Convidar para agendamento" value={s.body} onChange={e => {
              const arr = [...comms.scripts]; arr[i] = { ...arr[i], body: e.target.value };
              setComms({ ...comms, scripts: arr });
            }} />
          </div>
        ))}
        <button className="btn btn-sm" onClick={() => setComms({ ...comms, scripts: [...comms.scripts, { name: '', body: '' }] })}><Ic name="plus" size={12} /> Adicionar roteiro</button>
      </div>

      <div>
        <label className="label">CTAs por etapa da conversa</label>
        <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>Ações que o agente sugere ao cliente em cada momento.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[['discovery','Descoberta','Quer ver nossos pacotes?'], ['proposal','Proposta','Te mando o orçamento?'], ['closing','Fechamento','Posso já agendar?']].map(([k, l, ph]) => (
            <div key={k}>
              <div style={{ fontSize: 'var(--type-sm)', fontWeight: 500, marginBottom: 4 }}>{l}</div>
              <input className="input" placeholder={ph} value={comms.ctas[k]} onChange={e => setComms({ ...comms, ctas: { ...comms.ctas, [k]: e.target.value } })} />
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );

  const Block6Tech = () => (
    <SectionCard title="Bloco 6 — Tecnologia" desc="Modelo, integrações e regras de privacidade.">
      <div>
        <label className="label">Integrações ativas</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginTop: 4 }}>
          {[
            ['crm',      'CRM Kanban',         'columns',  '#0EA5E9'],
            ['agenda',   'Agenda',             'agenda',   '#10B981'],
            ['catalog',  'Catálogo',           'package',  '#8B5CF6'],
            ['payments', 'Pagamentos',         'wallet',   '#F472B6'],
            ['erp',      'ERP / API interna',  'database', '#6b7280'],
          ].map(([id, label, icon, color]) => {
            const on = tech.integrations[id];
            return (
              <div key={id} onClick={() => setTech({ ...tech, integrations: { ...tech.integrations, [id]: !on } })}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
                  border: `1px solid ${on ? 'var(--accent)' : 'var(--border-strong)'}`,
                  background: on ? 'var(--accent-soft)' : 'var(--surface)', cursor: 'pointer' }}>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: `color-mix(in oklab, ${color} 14%, var(--surface))`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic name={icon} size={14} /></div>
                <span style={{ flex: 1, fontSize: 'var(--type-sm)', fontWeight: 500 }}>{label}</span>
                <input type="checkbox" checked={on} readOnly />
              </div>
            );
          })}
        </div>
      </div>

      <Row>
        <Field label="Plataforma / Modelo" cols={2}>
          <select className="input" value={tech.platform} onChange={e => setTech({ ...tech, platform: e.target.value })}>
            <option value="claude-haiku-4-5">Claude Haiku 4.5 — rápido e econômico</option>
            <option value="claude-sonnet-4-5">Claude Sonnet 4.5 — equilíbrio</option>
            <option value="claude-opus-4">Claude Opus 4 — máxima qualidade</option>
          </select>
        </Field>
        <Field label="Histórico de versões">
          <div style={{ padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 'var(--type-sm)', color: 'var(--text-muted)' }}>
            Será criada a versão <strong style={{ color: 'var(--text)' }}>v1</strong> ao publicar
          </div>
        </Field>
      </Row>

      <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface-2)' }}>
        <div className="row" style={{ gap: 8, marginBottom: 10 }}>
          <Ic name="shield" size={16} style={{ color: 'var(--accent)' }} />
          <strong>Regras de LGPD</strong>
        </div>
        <div className="col" style={{ gap: 10 }}>
          <label className="row" style={{ gap: 8, cursor: 'pointer', fontSize: 'var(--type-sm)' }}>
            <input type="checkbox" checked={tech.lgpd.storePII} onChange={e => setTech({ ...tech, lgpd: { ...tech.lgpd, storePII: e.target.checked }})} />
            Armazenar dados pessoais (CPF, e-mail, telefone) nas conversas
          </label>
          <label className="row" style={{ gap: 8, cursor: 'pointer', fontSize: 'var(--type-sm)' }}>
            <input type="checkbox" checked={tech.lgpd.anonymize} onChange={e => setTech({ ...tech, lgpd: { ...tech.lgpd, anonymize: e.target.checked }})} />
            Anonimizar dados ao exportar transcrições
          </label>
          <Row>
            <Field label="Retenção das conversas">
              <select className="input" value={tech.lgpd.retentionDays} onChange={e => setTech({ ...tech, lgpd: { ...tech.lgpd, retentionDays: Number(e.target.value) }})}>
                <option value={30}>30 dias</option>
                <option value={90}>90 dias</option>
                <option value={180}>6 meses</option>
                <option value={365}>1 ano</option>
                <option value={0}>Indefinido</option>
              </select>
            </Field>
            <div style={{ flex: 1 }} />
          </Row>
        </div>
      </div>
    </SectionCard>
  );

  const Block7Result = () => (
    <SectionCard title="Bloco 7 — Resultado" desc="O que medir e quando revisar o agente.">
      <div>
        <label className="label">Métricas de desempenho a acompanhar</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 4 }}>
          {[
            ['resolution', 'Taxa de resolução pela IA', '% de conversas resolvidas sem humano'],
            ['tma',        'Tempo médio de atendimento', 'Quanto tempo leva por conversa'],
            ['csat',       'Satisfação do cliente (CSAT)', 'Nota de 1–5 ao final da conversa'],
            ['conversion', 'Taxa de conversão',           'Leads → agendamento / venda'],
          ].map(([k, l, desc]) => {
            const on = result.metrics[k];
            return (
              <div key={k} onClick={() => setResult({ ...result, metrics: { ...result.metrics, [k]: !on }})}
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
        <Field label="Frequência do relatório de atendimento">
          <Seg value={result.reportFreq} onChange={v => setResult({ ...result, reportFreq: v })}
            options={[['diario','Diário'],['semanal','Semanal'],['mensal','Mensal']]} />
        </Field>
        <Field label="Critério de revisão automática" hint="Quando o sistema vai sugerir revisar o agente.">
          <select className="input" value={result.reviewTrigger} onChange={e => setResult({ ...result, reviewTrigger: e.target.value })}>
            <option value="resolution<70">Se resolução cair abaixo de 70%</option>
            <option value="resolution<60">Se resolução cair abaixo de 60%</option>
            <option value="csat<4">Se CSAT cair abaixo de 4,0</option>
            <option value="failures>5">Se houver mais de 5 falhas em 24h</option>
            <option value="never">Nunca (revisar manualmente)</option>
          </select>
        </Field>
      </Row>
    </SectionCard>
  );

  const blocks = [Block1Identity, Block2Mission, Block3Operation, Block4Knowledge, Block5Comms, Block6Tech, Block7Result];
  const CurrentBlock = blocks[step];

  // ---- render ----
  return (
    <Drawer
      width="80vw"
      title="Configurar novo agente"
      subtitle={`Etapa ${step+1} de ${steps.length} · ${steps[step].label.replace(/^\d+ · /, '')}`}
      leftHead={
        <div style={{ width: 44, height: 44, borderRadius: 11, background: 'linear-gradient(135deg, var(--ai), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <Ic name="sparkles" size={22} />
        </div>
      }
      onClose={onClose}
      footer={
        <>
          <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>
            <Ic name="sparkles" size={12} /> Você pode salvar como rascunho a qualquer momento.
          </div>
          <div className="spacer" />
          <ActionButton action="voltar" size="md" onClick={onClose} />
          <ActionButton action="anterior" size="md" disabled={step === 0} onClick={() => setStep(s => Math.max(0, s - 1))} />
          {step < steps.length - 1 ? (
            <ActionButton action="proximo" size="md" onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))} />
          ) : (
            <>
              <ActionButton action="salvar" size="md" label="Salvar como rascunho" onClick={() => { window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Rascunho salvo', descricao: 'Você pode terminar de configurar o agente depois.' }); onClose && onClose(); }} />
              <ActionButton action="salvar" size="md" label="Criar e publicar" onClick={() => { window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Agente publicado', descricao: 'O agente já está ativo e atendendo.' }); onClose && onClose(); }} />
            </>
          )}
        </>
      }
    >
      {/* Two-column body: left rail (block index) + right content */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 22, alignItems: 'flex-start' }}>
        {/* Left rail */}
        <div style={{ position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {steps.map((s, i) => {
            const on = step === i;
            const done = step > i;
            return (
              <div key={s.id} onClick={() => setStep(i)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  background: on ? 'var(--accent-soft)' : 'transparent',
                  color: on ? 'var(--accent-700)' : 'var(--text)',
                  fontWeight: on ? 600 : 500, fontSize: 'var(--type-sm)' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%',
                  background: on ? 'var(--accent)' : done ? 'color-mix(in oklab, var(--accent) 50%, var(--surface))' : 'var(--surface-3)',
                  color: on || done ? 'white' : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {done ? <Ic name="check" size={11} /> : i + 1}
                </div>
                <span>{s.label.replace(/^\d+ · /, '')}</span>
              </div>
            );
          })}

          <div style={{ marginTop: 14, padding: 12, border: '1px dashed var(--border-strong)', borderRadius: 10, background: 'var(--surface-2)' }}>
            <div className="ai-grad" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>Dica da IA</div>
            <div style={{ fontSize: 'var(--type-sm)', color: 'var(--text-muted)', lineHeight: 1.45 }}>
              Quanto mais documentos você enviar no <strong style={{ color: 'var(--text)' }}>Bloco 4</strong>, mais preciso o agente fica. Comece com FAQ, tabela de preços e procedimentos.
            </div>
          </div>
        </div>

        {/* Right content */}
        <div>
          <CurrentBlock />
        </div>
      </div>
    </Drawer>
  );
}

Object.assign(window, { NewAgentDrawer });
