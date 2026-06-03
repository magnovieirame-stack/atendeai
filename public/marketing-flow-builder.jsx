// marketing-flow-builder.jsx — Visual flow builder drawer for Fluxo IA
// Opens at ~1080px wide. Three configurable nodes (Gatilho → Análise IA → Ação)
// + live simulation panel with estimated reach, revenue & conversion score.

(function () {

  const fmtBRL = (n) => 'R$ ' + (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtN   = (n) => (n || 0).toLocaleString('pt-BR');
  const pct    = (n) => `${(n * 100).toFixed(1).replace('.', ',')}%`;

  // Trigger catalogue
  const TRIGGER_TYPES = [
    { id: 'cycle',    icon: 'rotate',    label: 'Ciclo de recompra',     desc: 'IA detecta o intervalo médio entre compras de cada cliente', base: 1842 },
    { id: 'inactive', icon: 'clock',     label: 'Inatividade',           desc: 'Clientes sem comprar há N dias',                              base: 612  },
    { id: 'tag',      icon: 'tag',       label: 'Entrada em tag',        desc: 'Cliente recebeu uma tag específica',                          base: 218  },
    { id: 'phase',    icon: 'columns',   label: 'Mudança de fase no CRM',desc: 'Cliente avançou ou recuou no funil',                          base: 96   },
    { id: 'ticket',   icon: 'coins',     label: 'Ticket atingido',       desc: 'Compra acima de um valor (upsell candidate)',                 base: 184  },
    { id: 'product',  icon: 'package',   label: 'Compra de produto X',   desc: 'Cliente comprou um produto específico',                        base: 426  }
  ];

  const ACTION_TYPES = [
    { id: 'wa',     icon: 'whatsapp', label: 'WhatsApp',           desc: 'Mensagem personalizada por IA com base no perfil', color: '#16a34a' },
    { id: 'email',  icon: 'mail',     label: 'E-mail',             desc: 'E-mail com copy + oferta gerados automaticamente',  color: '#1d4ed8' },
    { id: 'task',   icon: 'check',    label: 'Tarefa comercial',   desc: 'Cria tarefa para humano com contexto do cliente',    color: '#7c3aed' },
    { id: 'tag',    icon: 'tag',      label: 'Alterar tag',        desc: 'Marca o cliente com tag de comportamento',           color: '#0ea5e9' },
    { id: 'phase',  icon: 'columns',  label: 'Mover de fase CRM',  desc: 'Empurra cliente para próxima fase do funil',          color: '#f59e0b' },
    { id: 'coupon', icon: 'star',     label: 'Gerar cupom',        desc: 'Cupom dinâmico válido por janela definida',           color: '#ec4899' }
  ];

  const ANALYSIS_SIGNALS = [
    { id: 'profile',  label: 'Perfil comportamental',  on: true  },
    { id: 'history',  label: 'Histórico de compras',   on: true  },
    { id: 'ticket',   label: 'Ticket médio',           on: true  },
    { id: 'freq',     label: 'Frequência de compra',   on: true  },
    { id: 'cycle',    label: 'Ciclo de compra',        on: true  },
    { id: 'products', label: 'Produtos consumidos',    on: true  },
    { id: 'service',  label: 'Últimos atendimentos',   on: false },
    { id: 'sched',    label: 'Agendamentos',           on: false },
    { id: 'tags',     label: 'Tags ativas',            on: true  },
    { id: 'phase',    label: 'Fase do funil',          on: true  },
    { id: 'inactive', label: 'Tempo sem comprar',      on: true  },
    { id: 'interactions', label: 'Interações anteriores', on: false }
  ];

  // ─────────────────────────────────────────────────────────────────────
  //  Component
  // ─────────────────────────────────────────────────────────────────────

  function FlowBuilder({ flowId, flows, agents, onClose }) {
    const existing = flowId ? flows.find((f) => f.id === flowId) : null;

    // Local builder state
    const [name, setName] = React.useState(existing ? existing.name : 'Novo fluxo IA');
    const [active, setActive] = React.useState('trigger'); // which node is selected
    const [trigger, setTrigger] = React.useState(existing ? 'cycle' : 'cycle');
    const [triggerDays, setTriggerDays] = React.useState(27);
    const [action, setAction] = React.useState('wa');
    const [agent, setAgent] = React.useState(existing ? existing.agent : agents[0].id);
    const [signals, setSignals] = React.useState(ANALYSIS_SIGNALS);
    const [limitPerDay, setLimitPerDay] = React.useState(80);
    const [aiCopy, setAiCopy] = React.useState(true);
    const [escalate, setEscalate] = React.useState(true);

    const toggleSignal = (id) => setSignals((s) => s.map((x) => x.id === id ? { ...x, on: !x.on } : x));

    const trig = TRIGGER_TYPES.find((t) => t.id === trigger);
    const act = ACTION_TYPES.find((a) => a.id === action);
    const ag  = agents.find((a) => a.id === agent);
    const onSignals = signals.filter((s) => s.on).length;

    // Simulation math
    const reach = Math.round(trig.base * (limitPerDay / 80));
    const rate  = Math.min(0.45, 0.06 + onSignals * 0.012 + (aiCopy ? 0.04 : 0) + (escalate ? 0.02 : 0));
    const conv  = Math.round(reach * rate);
    const ticket = 152;
    const revenue = conv * ticket;
    const score = Math.round(45 + onSignals * 3.5 + (aiCopy ? 8 : 0) + (escalate ? 5 : 0));

    return (
      <div className="fb-back" onClick={onClose}>
        <div className="fb-drawer" onClick={(e) => e.stopPropagation()}>
          {/* ── Header ──────────────────────────────────── */}
          <div className="fb-hd">
            <span style={{
              width: 38, height: 38, borderRadius: 11,
              background: 'linear-gradient(135deg, var(--ai), var(--accent))',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 20px -6px color-mix(in oklab, var(--ai) 50%, transparent)'
            }}>
              <Ic name="sparkles" size={17} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%', font: 'inherit', fontSize: 17, fontWeight: 700, color: 'var(--text)',
                  background: 'transparent', border: 'none', outline: 'none', padding: 0,
                  letterSpacing: '-.015em'
                }} />
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {existing ? `Editando · ${existing.id}` : 'Novo fluxo · rascunho'} · A IA decide passo a passo a partir do gatilho
              </div>
            </div>
            <button className="btn btn-sm">Cancelar</button>
            <button className="btn btn-sm">Salvar rascunho</button>
            <button className="btn btn-primary btn-sm"><Ic name="zap" size={12} /> Ativar fluxo</button>
            <button className="btn btn-ghost btn-icon" onClick={onClose}><Ic name="x" size={16} /></button>
          </div>

          {/* ── Body: canvas + config panel ─────────────── */}
          <div className="fb-body">
            {/* Canvas */}
            <div className="fb-canvas scroll">
              <div className="fb-canvas-bg" />

              <div className="fb-flow">
                {/* Trigger node */}
                <Node
                  idx={1}
                  active={active === 'trigger'}
                  onClick={() => setActive('trigger')}
                  icon="zap"
                  color="#f59e0b"
                  label="Gatilho"
                  title={trig.label}
                  body={
                    trigger === 'cycle' ? `Cliente está a ${triggerDays} dias do ciclo médio de recompra` :
                    trigger === 'inactive' ? 'Cliente está há 60+ dias sem comprar' :
                    trig.desc
                  }
                  meta={<span>~{fmtN(trig.base)} clientes elegíveis/mês</span>}
                />

                <Connector />

                {/* AI Analysis node */}
                <Node
                  idx={2}
                  active={active === 'ai'}
                  onClick={() => setActive('ai')}
                  icon="sparkles"
                  color="var(--ai)"
                  label="Análise IA"
                  title={ag ? `${ag.name} · ${ag.role}` : 'Agente'}
                  body={`Cruza ${onSignals} sinais do cliente para decidir o melhor momento, canal e abordagem`}
                  meta={
                    <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
                      {signals.filter((s) => s.on).slice(0, 3).map((s) => (
                        <span key={s.id} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--ai-soft)', color: 'var(--ai-strong)', fontWeight: 600 }}>{s.label}</span>
                      ))}
                      {onSignals > 3 && <span style={{ fontSize: 10, color: 'var(--text-faint)', padding: '2px 6px' }}>+{onSignals - 3}</span>}
                    </span>
                  }
                  brain
                />

                <Connector />

                {/* Action node */}
                <Node
                  idx={3}
                  active={active === 'action'}
                  onClick={() => setActive('action')}
                  icon={act.icon}
                  color={act.color}
                  label="Ação"
                  title={act.label}
                  body={aiCopy ? `Copy gerada por IA · personalizada por cliente` : 'Template fixo escolhido manualmente'}
                  meta={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                    <Ic name="clock" size={11} /> Até {limitPerDay} envios por dia · janela 09h-21h
                  </span>}
                />
              </div>

              {/* Simulation strip */}
              <div className="fb-sim">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <Ic name="sparkles" size={14} style={{ color: 'var(--ai)' }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Simulação · antes de ativar</div>
                  <span style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 999, background: 'var(--ai-soft)', color: 'var(--ai-strong)', fontWeight: 700 }}>previsto pela IA</span>
                  <div className="spacer" />
                  <button className="btn btn-sm"><Ic name="rotate" size={12} /> Recalcular</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 14, alignItems: 'center' }}>
                  <SimStat label="Contatos no 1º mês" value={fmtN(reach)} sub={`~${Math.round(reach / 30)} por dia`} />
                  <SimStat label="Conversão prevista" value={pct(rate)} sub={`${fmtN(conv)} vendas`} accent />
                  <SimStat label="Receita estimada" value={fmtBRL(revenue)} sub={`ticket ~ ${fmtBRL(ticket)}`} />
                  <SimStat label="Tempo poupado" value={`${Math.round(reach * 1.2 / 60)} h`} sub={`vs. operação manual`} />
                  <ScoreBig score={score} />
                </div>

                <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'flex-start', gap: 8, lineHeight: 1.5 }}>
                  <Ic name="alert" size={12} style={{ color: 'var(--text-faint)', marginTop: 2, flexShrink: 0 }} />
                  <span>
                    Estimativas baseadas no histórico dos últimos 90 dias e em fluxos similares.
                    A IA recalcula a cada execução conforme aprende com as respostas reais.
                  </span>
                </div>
              </div>
            </div>

            {/* Right config panel */}
            <div className="fb-config scroll">
              <div className="fb-config-head">
                {active === 'trigger' && <ConfigHead icon="zap" color="#f59e0b" title="Configurar gatilho" sub="O que faz a IA começar este fluxo" />}
                {active === 'ai'      && <ConfigHead icon="sparkles" color="var(--ai)" title="Configurar agente e análise" sub="Quem decide e com base em quais dados" />}
                {active === 'action'  && <ConfigHead icon="send" color="var(--accent)" title="Configurar ação" sub="O que a IA executa quando aborda" />}
              </div>

              <div className="fb-config-body">
                {active === 'trigger' && (
                  <>
                    <Sec label="Tipo de gatilho">
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {TRIGGER_TYPES.map((t) => (
                          <button key={t.id} onClick={() => setTrigger(t.id)} className={`fb-pick ${trigger === t.id ? 'on' : ''}`}>
                            <span className="fb-pick-ic" style={{ background: trigger === t.id ? 'color-mix(in oklab, #f59e0b 14%, white)' : 'var(--surface-3)', color: trigger === t.id ? '#b45309' : 'var(--text-muted)' }}>
                              <Ic name={t.icon} size={14} />
                            </span>
                            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{t.label}</div>
                              <div style={{ fontSize: 10.5, color: 'var(--text-faint)', marginTop: 1, lineHeight: 1.3 }}>{t.desc}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </Sec>

                    {trigger === 'cycle' && (
                      <Sec label="Antecipação (dias antes do ciclo)">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <input type="range" min="0" max="14" value={triggerDays - 20} onChange={(e) => setTriggerDays(parseInt(e.target.value, 10) + 20)} style={{ flex: 1 }} />
                          <span className="tnum" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', minWidth: 50, textAlign: 'right' }}>D-{Math.max(0, 30 - triggerDays)}</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6 }}>
                          A IA irá abordar quando o cliente estiver a <strong>{Math.max(0, 30 - triggerDays)} dias</strong> da recompra prevista.
                        </div>
                      </Sec>
                    )}

                    <Sec label="Filtros adicionais (opcional)">
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {['Apenas clientes ativos', 'LTV > R$ 500', 'Que aceitam WhatsApp', 'Sem fluxo ativo'].map((c, i) => (
                          <span key={i} className="chip" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', height: 26, padding: '0 10px' }}>
                            <Ic name="check" size={10} /> {c}
                          </span>
                        ))}
                        <span className="chip" style={{ background: 'transparent', border: '1px dashed var(--border-strong)', height: 26, padding: '0 10px', color: 'var(--text-muted)' }}>+ Adicionar filtro</span>
                      </div>
                    </Sec>
                  </>
                )}

                {active === 'ai' && (
                  <>
                    <Sec label="Agente responsável">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {agents.map((a) => {
                          const sel = agent === a.id;
                          const grad = `linear-gradient(135deg, oklch(0.72 .15 ${a.hue}), oklch(0.55 .18 ${(a.hue + 35) % 360}))`;
                          return (
                            <button key={a.id} onClick={() => setAgent(a.id)} className={`fb-agent ${sel ? 'on' : ''}`}>
                              <span style={{ width: 32, height: 32, borderRadius: 9, background: grad, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{a.name[0]}</span>
                              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{a.name} <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}>· {a.role}</span></div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.tone}</div>
                              </div>
                              <span style={{
                                width: 16, height: 16, borderRadius: '50%',
                                border: `2px solid ${sel ? 'var(--accent)' : 'var(--border-strong)'}`,
                                background: sel ? 'var(--accent)' : 'transparent',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0
                              }}>{sel && <Ic name="check" size={9} />}</span>
                            </button>);
                        })}
                      </div>
                    </Sec>

                    <Sec label={`Dados que a IA vai analisar · ${onSignals} de ${signals.length}`}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        {signals.map((s) => (
                          <button key={s.id} onClick={() => toggleSignal(s.id)} className={`fb-sig ${s.on ? 'on' : ''}`}>
                            <span className={`fb-sig-cb ${s.on ? 'on' : ''}`}>{s.on && <Ic name="check" size={9} />}</span>
                            <span>{s.label}</span>
                          </button>
                        ))}
                      </div>
                    </Sec>

                    <Sec label="Estratégia de decisão">
                      <Toggle label="A IA pode adiar contato para horário melhor" value={true} />
                      <Toggle label="Aprender com respostas (memória)" value={true} />
                      <Toggle label="Escalar para humano se cliente premium responder" value={escalate} onChange={setEscalate} />
                    </Sec>
                  </>
                )}

                {active === 'action' && (
                  <>
                    <Sec label="Tipo de ação">
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {ACTION_TYPES.map((a) => (
                          <button key={a.id} onClick={() => setAction(a.id)} className={`fb-pick ${action === a.id ? 'on' : ''}`}>
                            <span className="fb-pick-ic" style={{
                              background: action === a.id ? `color-mix(in oklab, ${a.color} 14%, white)` : 'var(--surface-3)',
                              color: action === a.id ? a.color : 'var(--text-muted)'
                            }}>
                              <Ic name={a.icon} size={14} />
                            </span>
                            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{a.label}</div>
                              <div style={{ fontSize: 10.5, color: 'var(--text-faint)', marginTop: 1, lineHeight: 1.3 }}>{a.desc}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </Sec>

                    <Sec label="Geração de conteúdo">
                      <Toggle label="Copy gerada por IA (personalizada por cliente)" value={aiCopy} onChange={setAiCopy} />
                      {aiCopy && (
                        <div style={{
                          marginTop: 8, padding: 12, borderRadius: 10,
                          background: 'var(--ai-soft)', border: '1px solid color-mix(in oklab, var(--ai) 24%, var(--border))',
                          fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ai-strong)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>Exemplo gerado</div>
                          “Oi <strong>Aurora</strong> 👋 Vi aqui que faz quase 30 dias desde o seu último kit shampoo + máscara. Reservei <strong>10% off</strong> só para você, válido por 3 dias. Quer que eu já confirme o mesmo combo de antes?”
                        </div>
                      )}
                    </Sec>

                    <Sec label="Limites de automação">
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 6 }}>Envios máximos por dia · {limitPerDay}</div>
                      <input type="range" min="10" max="300" step="10" value={limitPerDay} onChange={(e) => setLimitPerDay(parseInt(e.target.value, 10))} style={{ width: '100%' }} />
                      <Toggle label="Pausar fluxo se taxa de resposta cair > 30%" value={true} />
                      <Toggle label="Não abordar cliente mais de 1× a cada 7 dias" value={true} />
                    </Sec>

                    <Sec label="Produtos prioritários">
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {['Esmalte Premium Gel', 'Kit Top Coat', 'Shampoo Reparação'].map((p) => (
                          <span key={p} className="chip chip-accent" style={{ height: 26, padding: '0 10px' }}>
                            <Ic name="package" size={10} /> {p}
                          </span>
                        ))}
                        <span className="chip" style={{ background: 'transparent', border: '1px dashed var(--border-strong)', height: 26, padding: '0 10px', color: 'var(--text-muted)' }}>+ Adicionar produto</span>
                      </div>
                    </Sec>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <style>{`
          .fb-back {
            position: fixed; inset: 0; z-index: 110;
            background: rgba(15, 23, 42, .42); backdrop-filter: blur(6px);
            display: flex; justify-content: flex-end; align-items: stretch;
            animation: fade .2s ease;
          }
          .fb-drawer {
            background: var(--surface);
            width: 100%; max-width: 1280px;
            height: 100vh;
            border-radius: 0;
            box-shadow: -16px 0 48px rgba(15,23,42,.22);
            display: flex; flex-direction: column;
            overflow: hidden;
            animation: slide-in-right .32s cubic-bezier(.4,0,.2,1);
          }
          @keyframes fbPop {
            from { opacity: 0; transform: translateY(20px) scale(.97); }
            to   { opacity: 1; transform: none; }
          }
          .fb-hd {
            display: flex; align-items: center; gap: 12px;
            padding: 16px 20px; border-bottom: 1px solid var(--border);
            background: linear-gradient(180deg, var(--surface), var(--surface-2));
          }
          .fb-body {
            flex: 1; min-height: 0;
            display: grid; grid-template-columns: minmax(0, 1fr) 380px;
            overflow: hidden;
          }
          .fb-canvas {
            position: relative; overflow: auto;
            padding: 28px 32px 24px;
            display: flex; flex-direction: column; gap: 20px;
            background: var(--surface-2);
          }
          .fb-canvas-bg {
            position: absolute; inset: 0; pointer-events: none;
            background-image:
              radial-gradient(circle, color-mix(in oklab, var(--text-faint) 18%, transparent) 1px, transparent 1.5px);
            background-size: 22px 22px;
            background-position: 0 0;
            opacity: .35;
            mask-image: radial-gradient(ellipse at center, black 40%, transparent 100%);
          }
          .fb-flow {
            position: relative;
            display: grid; grid-template-columns: 1fr 60px 1fr 60px 1fr;
            gap: 8px; align-items: stretch;
          }
          .fb-node {
            position: relative; background: var(--surface);
            border: 1.5px solid var(--border); border-radius: 14px;
            padding: 16px 16px 14px;
            cursor: pointer;
            transition: border-color .15s, transform .15s, box-shadow .15s;
            display: flex; flex-direction: column; gap: 10px;
            min-height: 188px;
          }
          .fb-node:hover { border-color: var(--border-strong); transform: translateY(-1px); }
          .fb-node.on {
            border-color: var(--ai);
            box-shadow: 0 0 0 4px color-mix(in oklab, var(--ai) 14%, transparent),
                        0 10px 24px -12px color-mix(in oklab, var(--ai) 40%, transparent);
          }
          .fb-node-tag {
            display: inline-flex; align-items: center; gap: 6px;
            font-size: 10px; letter-spacing: .08em; text-transform: uppercase;
            font-weight: 800; color: var(--text-faint);
          }
          .fb-node-idx {
            width: 18px; height: 18px; border-radius: 50%;
            background: var(--surface-3); color: var(--text-muted);
            font-size: 10px; font-weight: 800;
            display: inline-flex; align-items: center; justify-content: center;
          }
          .fb-node.on .fb-node-idx { background: var(--ai); color: white; }
          .fb-node-ic {
            width: 40px; height: 40px; border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            box-shadow: inset 0 1px 0 rgba(255,255,255,.4);
          }
          .fb-conn {
            position: relative; display: flex; align-items: center; justify-content: center;
          }
          .fb-conn::before {
            content: ''; height: 2px; width: 100%;
            background: linear-gradient(90deg, transparent, var(--border-strong) 20%, var(--border-strong) 80%, transparent);
            border-radius: 2px;
          }
          .fb-conn::after {
            content: ''; position: absolute; right: 6px; top: 50%;
            width: 0; height: 0;
            border-top: 5px solid transparent; border-bottom: 5px solid transparent;
            border-left: 7px solid var(--border-strong);
            transform: translateY(-50%);
          }

          /* AI brain ripple */
          .fb-brain {
            position: absolute; right: -8px; top: -8px;
            width: 42px; height: 42px; border-radius: 50%;
            background: radial-gradient(circle, color-mix(in oklab, var(--ai) 50%, transparent), transparent 70%);
            animation: fbBrain 2.5s infinite ease-in-out;
            pointer-events: none;
          }
          @keyframes fbBrain {
            0%, 100% { transform: scale(.85); opacity: .5; }
            50%      { transform: scale(1.1); opacity: .9; }
          }

          .fb-sim {
            background: var(--surface);
            border: 1px solid var(--border); border-radius: 14px;
            padding: 16px 18px;
          }

          .fb-config {
            border-left: 1px solid var(--border);
            background: var(--surface);
            display: flex; flex-direction: column;
            min-height: 0;
          }
          .fb-config-head {
            padding: 16px 20px; border-bottom: 1px solid var(--border);
            background: linear-gradient(180deg, var(--surface), var(--surface-2));
          }
          .fb-config-body { padding: 16px 20px 24px; display: flex; flex-direction: column; gap: 18px; }

          .fb-sec-label {
            font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase;
            color: var(--text-faint); font-weight: 700; margin-bottom: 8px;
          }

          .fb-pick {
            display: flex; gap: 10px; align-items: center;
            padding: 10px 12px; border-radius: 10px;
            background: var(--surface); border: 1px solid var(--border);
            cursor: pointer; font-family: inherit;
            transition: border-color .12s, background .12s;
          }
          .fb-pick:hover { border-color: var(--border-strong); }
          .fb-pick.on { border-color: var(--ai); background: var(--ai-soft); }
          .fb-pick-ic { width: 30px; height: 30px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background .12s, color .12s; }

          .fb-agent {
            display: flex; align-items: center; gap: 10px;
            padding: 8px 12px; border-radius: 10px;
            background: var(--surface); border: 1px solid var(--border);
            cursor: pointer; font-family: inherit; width: 100%;
            transition: border-color .12s, background .12s;
          }
          .fb-agent:hover { background: var(--surface-2); }
          .fb-agent.on { border-color: var(--accent); background: color-mix(in oklab, var(--accent) 5%, var(--surface)); }

          .fb-sig {
            display: flex; align-items: center; gap: 8px;
            padding: 7px 10px; border-radius: 8px;
            background: var(--surface); border: 1px solid var(--border);
            cursor: pointer; font-family: inherit;
            font-size: 12px; color: var(--text-muted);
            transition: all .12s;
          }
          .fb-sig:hover { border-color: var(--border-strong); color: var(--text); }
          .fb-sig.on { background: var(--ai-soft); border-color: color-mix(in oklab, var(--ai) 24%, var(--border)); color: var(--ai-strong); font-weight: 600; }
          .fb-sig-cb {
            width: 14px; height: 14px; border-radius: 4px;
            border: 1.5px solid var(--border-strong); background: var(--surface);
            display: inline-flex; align-items: center; justify-content: center;
            color: white; flex-shrink: 0;
          }
          .fb-sig-cb.on { background: var(--ai); border-color: var(--ai); }

          .fb-tog {
            display: flex; align-items: center; gap: 10px;
            padding: 8px 0; cursor: pointer; font-family: inherit;
            background: transparent; border: 0; width: 100%; text-align: left;
          }
          .fb-tog-track {
            width: 32px; height: 18px; border-radius: 999px;
            background: var(--border-strong); position: relative;
            transition: background .15s;
            flex-shrink: 0;
          }
          .fb-tog.on .fb-tog-track { background: var(--accent); }
          .fb-tog-knob {
            position: absolute; top: 2px; left: 2px;
            width: 14px; height: 14px; border-radius: 50%;
            background: white; transition: left .15s;
          }
          .fb-tog.on .fb-tog-knob { left: 16px; }
          .fb-tog-label { font-size: 12.5px; color: var(--text); flex: 1; }

          @media (max-width: 1100px) {
            .fb-body { grid-template-columns: 1fr; }
            .fb-config { border-left: 0; border-top: 1px solid var(--border); }
            .fb-flow { grid-template-columns: 1fr; }
            .fb-conn { display: none; }
          }
        `}</style>
      </div>);
  }

  // ─────────────────────────────────────────────────────────────────────
  //  Bits
  // ─────────────────────────────────────────────────────────────────────

  function Node({ idx, active, onClick, icon, color, label, title, body, meta, brain }) {
    return (
      <div className={`fb-node ${active ? 'on' : ''}`} onClick={onClick}>
        {brain && <span className="fb-brain" />}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="fb-node-ic" style={{ background: `color-mix(in oklab, ${color} 14%, white)`, color }}>
            <Ic name={icon} size={17} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="fb-node-tag">
              <span className="fb-node-idx">{idx}</span>{label}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginTop: 2, letterSpacing: '-.01em' }}>{title}</div>
          </div>
          {active && <Ic name="edit" size={13} style={{ color: 'var(--ai)' }} />}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, flex: 1 }}>{body}</div>
        <div style={{ fontSize: 11, color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: 6 }}>{meta}</div>
      </div>);
  }

  function Connector() {
    return <div className="fb-conn" />;
  }

  function SimStat({ label, value, sub, accent }) {
    return (
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{label}</div>
        <div className="tnum" style={{ fontSize: 22, fontWeight: 800, color: accent ? 'var(--accent-700)' : 'var(--text)', marginTop: 4, letterSpacing: '-.02em' }}>{value}</div>
        <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{sub}</div>
      </div>);
  }

  function ScoreBig({ score }) {
    const size = 78;
    const r = size / 2 - 6;
    const c = 2 * Math.PI * r;
    const v = Math.max(0, Math.min(100, score));
    const off = c - (v / 100) * c;
    const hue = v >= 75 ? 160 : v >= 50 ? 80 : v >= 25 ? 40 : 20;
    const stroke = `oklch(0.62 .16 ${hue})`;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{ position: 'relative', width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth="5" />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={off}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ transition: 'stroke-dashoffset .5s ease' }} />
          </svg>
          <span style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em', lineHeight: 1 }}>{v}</span>
            <span style={{ fontSize: 9, color: 'var(--text-faint)', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', marginTop: 2 }}>de 100</span>
          </span>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Score IA</span>
      </div>);
  }

  function ConfigHead({ icon, color, title, sub }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, background: `color-mix(in oklab, ${color} 14%, white)`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Ic name={icon} size={15} />
        </span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.01em' }}>{title}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>
        </div>
      </div>);
  }

  function Sec({ label, children }) {
    return (
      <div>
        <div className="fb-sec-label">{label}</div>
        {children}
      </div>);
  }

  function Toggle({ label, value, onChange }) {
    const [v, setV] = React.useState(value);
    const click = () => { const nv = !v; setV(nv); onChange && onChange(nv); };
    React.useEffect(() => setV(value), [value]);
    return (
      <button className={`fb-tog ${v ? 'on' : ''}`} onClick={click}>
        <span className="fb-tog-track"><span className="fb-tog-knob" /></span>
        <span className="fb-tog-label">{label}</span>
      </button>);
  }

  window.FlowBuilder = FlowBuilder;
})();
