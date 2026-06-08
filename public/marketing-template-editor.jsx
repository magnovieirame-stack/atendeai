// marketing-template-editor.jsx — Create / edit message template drawer
// Right-side drawer with editor on the left and live preview (WhatsApp / e-mail) on the right.

(function () {

  const CHANNELS = [
    { id: 'whatsapp', icon: 'whatsapp', label: 'WhatsApp', color: '#16A34A' },
    { id: 'email',    icon: 'mail',     label: 'E-mail',   color: '#1D4ED8' },
    { id: 'sms',      icon: 'phone',    label: 'SMS',      color: '#7C3AED' }
  ];

  const VARIABLES = [
    { k: '{nome}',      label: 'Nome do cliente'  },
    { k: '{empresa}',   label: 'Nome da empresa'  },
    { k: '{produto}',   label: 'Último produto'   },
    { k: '{ticket}',    label: 'Ticket médio'     },
    { k: '{dias}',      label: 'Dias sem comprar' },
    { k: '{cupom}',     label: 'Cupom dinâmico'   }
  ];

  const AI_SUGGESTIONS = [
    'Mensagem mais curta',
    'Tom mais formal',
    'Mais emocional',
    'Adicionar urgência',
    'Adicionar prova social'
  ];

  function TemplateEditorDrawer({ template, onClose, onSave }) {
    const isNew = !template;
    const [name, setName]       = React.useState(template?.name || '');
    const [channel, setChannel] = React.useState(template?.channel || 'whatsapp');
    const [subject, setSubject] = React.useState(template?.subject || '');
    const [body, setBody]       = React.useState(template?.preview || template?.body || '');
    const [cta, setCta]         = React.useState(template?.cta || 'Quero saber mais');
    const [tags, setTags]       = React.useState(template?.tags || []);
    const [aiBusy, setAiBusy]   = React.useState(false);
    const textRef = React.useRef(null);

    const insertVar = (v) => {
      const ta = textRef.current;
      if (!ta) { setBody((b) => b + ' ' + v); return; }
      const start = ta.selectionStart, end = ta.selectionEnd;
      const next = body.slice(0, start) + v + body.slice(end);
      setBody(next);
      setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = start + v.length; }, 0);
    };

    const askAI = (hint) => {
      setAiBusy(true);
      setTimeout(() => {
        const suggestions = {
          'Mensagem mais curta':    'Oi {nome}! Cupom de 15% pra você 💛 Aproveita?',
          'Tom mais formal':        'Olá {nome}, identificamos que você é um(a) cliente especial. Reservamos um benefício exclusivo: 15% de desconto na próxima compra.',
          'Mais emocional':         'Oi {nome} 💛 Faz um tempinho que a gente não te vê por aqui e a gente lembra de você. Que tal voltar com um cupom de 15% só pra você?',
          'Adicionar urgência':     body + '\n\n⏰ Válido só até domingo!',
          'Adicionar prova social': body + '\n\n+2.300 clientes já aproveitaram este mês 💛'
        };
        setBody(suggestions[hint] || body);
        setAiBusy(false);
      }, 700);
    };

    const save = () => {
      const t = {
        id: template?.id || ('t' + Date.now()),
        name: name.trim() || 'Novo template',
        channel,
        subject,
        preview: body,
        body,
        cta,
        tags,
        uses: template?.uses || 0,
        updated: 'agora'
      };
      onSave && onSave(t);
      window.showToast && window.showToast(isNew
        ? { tipo: 'sucesso', titulo: 'Template criado', descricao: 'Já está disponível para usar nas campanhas.' }
        : { tipo: 'sucesso', titulo: 'Template salvo', descricao: 'As alterações foram aplicadas.' });
      onClose && onClose();
    };

    const chMeta = CHANNELS.find((c) => c.id === channel) || CHANNELS[0];

    return (
      <div className="te-back" onClick={onClose}>
        <div className="te-drawer" onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div className="te-hd">
            <span style={{
              width: 38, height: 38, borderRadius: 11,
              background: `color-mix(in oklab, ${chMeta.color} 14%, white)`,
              color: chMeta.color, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Ic name="file-text" size={17} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                {isNew ? 'Novo template' : 'Editar template'}
              </div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do template (ex: Cross-sell · Kit Top Coat)"
                style={{
                  width: '100%', font: 'inherit', fontSize: 17, fontWeight: 700, color: 'var(--text)',
                  background: 'transparent', border: 'none', outline: 'none', padding: 0, marginTop: 2,
                  letterSpacing: '-.015em'
                }} />
            </div>
            <button className="btn btn-sm fin-btn-back" onClick={onClose}>Voltar</button>
            <button className="btn btn-save btn-sm" onClick={save}>
              <Ic name="check" size={13} /> {isNew ? 'Criar template' : 'Salvar'}
            </button>
            <button className="btn btn-ghost btn-icon" onClick={onClose}><Ic name="x" size={16} /></button>
          </div>

          {/* Body */}
          <div className="te-body">

            {/* Editor */}
            <div className="te-edit scroll">
              {/* Channel selector */}
              <Sec label="Canal">
                <div style={{ display: 'flex', gap: 8 }}>
                  {CHANNELS.map((c) => {
                    const on = channel === c.id;
                    return (
                      <button key={c.id} onClick={() => setChannel(c.id)} className={`te-pick ${on ? 'on' : ''}`}
                        style={on ? { borderColor: c.color, background: `color-mix(in oklab, ${c.color} 8%, white)` } : {}}>
                        <span style={{ color: on ? c.color : 'var(--text-muted)' }}><Ic name={c.icon} size={14} /></span>
                        <span style={{ color: on ? c.color : 'var(--text)', fontWeight: on ? 700 : 600 }}>{c.label}</span>
                      </button>);
                  })}
                </div>
              </Sec>

              {channel === 'email' && (
                <Sec label="Assunto do e-mail">
                  <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex: A oferta da semana é sua, {nome} ✨" />
                </Sec>
              )}

              <Sec label="Corpo da mensagem" right={`${body.length} caracteres`}>
                <textarea
                  ref={textRef}
                  className="input"
                  rows={9}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Escreva a mensagem · use {nome}, {produto}, {cupom} para personalizar"
                  style={{ resize: 'vertical', lineHeight: 1.55, fontSize: 13.5 }} />
              </Sec>

              <Sec label="Variáveis dinâmicas" hint="Clique para inserir no cursor">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {VARIABLES.map((v) => (
                    <button key={v.k} className="te-chip" onClick={() => insertVar(v.k)} title={v.label}>
                      <code style={{ color: 'var(--accent-700)', fontWeight: 700 }}>{v.k}</code>
                      <span style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>{v.label}</span>
                    </button>
                  ))}
                </div>
              </Sec>

              <Sec label="Reescrever com IA">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {AI_SUGGESTIONS.map((s) => (
                    <button key={s} disabled={aiBusy} className="te-ai" onClick={() => askAI(s)}>
                      <Ic name="sparkles" size={11} />
                      {s}
                    </button>
                  ))}
                </div>
                {aiBusy && <div style={{ fontSize: 11.5, color: 'var(--ai-strong)', marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Ic name="sparkles" size={11} /> A IA está reescrevendo…
                </div>}
              </Sec>

              {channel !== 'sms' && (
                <Sec label="CTA (botão de ação)">
                  <input className="input" value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Ex: Quero meu cupom" />
                </Sec>
              )}

              <Sec label="Marcadores (opcional)" hint="Para encontrar o template depois">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['cross-sell', 'recompra', 'reativação', 'boas-vindas', 'aniversário', 'oferta'].map((g) => {
                    const on = tags.includes(g);
                    return (
                      <button key={g} className={`te-tag ${on ? 'on' : ''}`}
                        onClick={() => setTags((t) => on ? t.filter((x) => x !== g) : [...t, g])}>
                        {on && <Ic name="check" size={10} />}
                        {g}
                      </button>);
                  })}
                </div>
              </Sec>
            </div>

            {/* Preview */}
            <div className="te-prev scroll">
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 12 }}>
                Pré-visualização
              </div>
              {channel === 'whatsapp' && <WhatsAppPreview body={body} cta={cta} />}
              {channel === 'sms'      && <SmsPreview body={body} />}
              {channel === 'email'    && <EmailPreview subject={subject} body={body} cta={cta} />}

              <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--ai-soft)', border: '1px solid color-mix(in oklab, var(--ai) 22%, var(--border))', borderRadius: 10, color: 'var(--ai-strong)', fontSize: 11.5, display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5 }}>
                <Ic name="sparkles" size={12} style={{ marginTop: 2, flexShrink: 0 }} />
                <span>As variáveis ({'{nome}'}, {'{produto}'}…) serão substituídas automaticamente em cada disparo.</span>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          .te-back {
            position: fixed; inset: 0; z-index: 110;
            background: rgba(15, 23, 42, .42); backdrop-filter: blur(6px);
            display: flex; justify-content: flex-end; align-items: stretch;
            animation: fade .2s ease;
          }
          .te-drawer {
            background: var(--surface);
            width: 100%; max-width: 1080px; height: 100vh;
            box-shadow: -16px 0 48px rgba(15,23,42,.22);
            display: flex; flex-direction: column; overflow: hidden;
            animation: slide-in-right .32s cubic-bezier(.4,0,.2,1);
          }
          .te-hd {
            display: flex; align-items: center; gap: 12px;
            padding: 14px 20px; border-bottom: 1px solid var(--border);
            background: linear-gradient(180deg, var(--surface), var(--surface-2));
          }
          .te-body {
            flex: 1; min-height: 0;
            display: grid; grid-template-columns: minmax(0, 1fr) 380px;
            overflow: hidden;
          }
          .te-edit { padding: 22px 26px; display: flex; flex-direction: column; gap: 20px; overflow: auto; }
          .te-prev { padding: 22px 26px; border-left: 1px solid var(--border); background: var(--surface-2); overflow: auto; }

          .te-pick {
            display: inline-flex; align-items: center; gap: 8px;
            height: 36px; padding: 0 14px; border-radius: 9px;
            background: var(--surface); border: 1px solid var(--border-strong);
            cursor: pointer; font-family: inherit;
            font-size: 13px; transition: all .12s;
          }
          .te-pick:hover { border-color: var(--text-muted); }

          .te-chip {
            display: inline-flex; align-items: center; gap: 6px;
            height: 26px; padding: 0 10px; border-radius: 7px;
            background: var(--accent-soft); border: 1px solid color-mix(in oklab, var(--accent) 22%, var(--border));
            cursor: pointer; font-family: inherit;
            transition: all .12s;
          }
          .te-chip:hover { background: color-mix(in oklab, var(--accent) 14%, white); }

          .te-ai {
            display: inline-flex; align-items: center; gap: 6px;
            height: 28px; padding: 0 12px; border-radius: 999px;
            background: var(--surface); border: 1px solid color-mix(in oklab, var(--ai) 24%, var(--border));
            color: var(--ai-strong); font-family: inherit; font-size: 12px; font-weight: 600;
            cursor: pointer; transition: all .12s;
          }
          .te-ai:hover { background: var(--ai-soft); }
          .te-ai:disabled { opacity: .5; cursor: not-allowed; }

          .te-tag {
            display: inline-flex; align-items: center; gap: 5px;
            height: 26px; padding: 0 10px; border-radius: 999px;
            background: var(--surface); border: 1px solid var(--border);
            color: var(--text-muted); font-family: inherit; font-size: 11.5px; font-weight: 600;
            cursor: pointer; transition: all .12s;
          }
          .te-tag:hover { color: var(--text); border-color: var(--border-strong); }
          .te-tag.on { background: var(--accent-soft); border-color: var(--accent); color: var(--accent-700); }

          .te-sec-label {
            font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase;
            color: var(--text-faint); font-weight: 700; margin-bottom: 8px;
            display: flex; align-items: center; justify-content: space-between;
          }

          @media (max-width: 980px) {
            .te-body { grid-template-columns: 1fr; }
            .te-prev { border-left: 0; border-top: 1px solid var(--border); }
          }
        `}</style>
      </div>);
  }

  function Sec({ label, right, hint, children }) {
    return (
      <div>
        <div className="te-sec-label">
          <span>{label}</span>
          {right && <span style={{ color: 'var(--text-faint)', fontWeight: 600, letterSpacing: 0, textTransform: 'none', fontSize: 11 }}>{right}</span>}
        </div>
        {children}
        {hint && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6 }}>{hint}</div>}
      </div>);
  }

  // ─── Previews ──────────────────────────────────────────────────────────

  function fillVars(s) {
    return (s || '')
      .replace(/\{nome\}/g, 'Mariana')
      .replace(/\{empresa\}/g, 'Atende.ia')
      .replace(/\{produto\}/g, 'Esmalte Premium')
      .replace(/\{ticket\}/g, 'R$ 320,00')
      .replace(/\{dias\}/g, '32')
      .replace(/\{cupom\}/g, 'VOLTA15');
  }

  function WhatsAppPreview({ body, cta }) {
    return (
      <div style={{
        width: '100%', maxWidth: 320, margin: '0 auto',
        background: '#E5DDD5',
        border: '8px solid #1f2937', borderTopWidth: 28, borderBottomWidth: 28,
        borderRadius: 30, overflow: 'hidden',
        boxShadow: '0 14px 30px -10px rgba(15,23,42,.25)'
      }}>
        <div style={{ background: '#075E54', color: 'white', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>A</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Atende.ia</div>
            <div style={{ fontSize: 10.5, opacity: .75 }}>online agora</div>
          </div>
        </div>
        <div style={{ padding: 14, minHeight: 180, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.4) 1px, transparent 1px)', backgroundSize: '10px 10px' }}>
          <div style={{
            background: 'white', borderRadius: '12px 12px 12px 4px',
            padding: '10px 12px', maxWidth: 240,
            boxShadow: '0 1px 1px rgba(0,0,0,.1)',
            fontSize: 13, color: '#111', lineHeight: 1.45, whiteSpace: 'pre-wrap'
          }}>
            {fillVars(body) || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Escreva a mensagem ao lado…</span>}
            {cta && body && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e5e7eb', color: '#1d4ed8', fontWeight: 600, fontSize: 12.5, textAlign: 'center' }}>
                {cta}
              </div>
            )}
            <div style={{ fontSize: 9.5, color: '#9ca3af', textAlign: 'right', marginTop: 4 }}>14:32 ✓✓</div>
          </div>
        </div>
      </div>);
  }

  function SmsPreview({ body }) {
    return (
      <div style={{
        background: '#000', borderRadius: 24, padding: '24px 18px',
        maxWidth: 280, margin: '0 auto',
        boxShadow: '0 14px 30px -10px rgba(15,23,42,.25)'
      }}>
        <div style={{ background: '#1c1c1e', borderRadius: 12, padding: '14px 14px 10px', color: 'white' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 6 }}>Atende.ia</div>
          <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{fillVars(body) || <span style={{ color: '#666', fontStyle: 'italic' }}>Escreva a mensagem ao lado…</span>}</div>
        </div>
      </div>);
  }

  function EmailPreview({ subject, body, cta }) {
    return (
      <div style={{
        background: 'white', border: '1px solid var(--border)',
        borderRadius: 12, overflow: 'hidden',
        boxShadow: '0 14px 30px -16px rgba(15,23,42,.18)'
      }}>
        <div style={{ background: '#fafbfc', borderBottom: '1px solid var(--border)', padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 600 }}>De: Atende.ia &lt;hello@atende.ia&gt;</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>
            {fillVars(subject) || <span style={{ color: 'var(--text-faint)', fontWeight: 500, fontStyle: 'italic' }}>(sem assunto)</span>}
          </div>
        </div>
        <div style={{ padding: 18, fontSize: 13.5, color: '#1f2937', lineHeight: 1.6, whiteSpace: 'pre-wrap', minHeight: 160 }}>
          {fillVars(body) || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Escreva o corpo ao lado…</span>}
          {cta && body && (
            <div style={{ marginTop: 18, textAlign: 'center' }}>
              <span style={{ display: 'inline-block', padding: '10px 22px', background: '#1d4ed8', color: 'white', borderRadius: 8, fontWeight: 700, fontSize: 13 }}>{cta}</span>
            </div>
          )}
        </div>
      </div>);
  }

  window.TemplateEditorDrawer = TemplateEditorDrawer;
})();
