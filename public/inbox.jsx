// inbox.jsx — Atendente: tela principal de atendimento, fila, perfil cliente, notificações

const AWAY_REASONS = [
{ id: 'lunch', label: 'Pausa para almoço', icon: 'cart', color: '#f59e0b', desc: 'Retorno em 1h' },
{ id: 'rest', label: 'Pausa para descanso', icon: 'pause', color: '#0ea5e9', desc: 'Retorno em 15 min' },
{ id: 'emergency', label: 'Pausa de emergência', icon: 'flag', color: '#dc2626', desc: 'Retorno breve' },
{ id: 'shift', label: 'Encerrar expediente', icon: 'logout', color: '#64748b', desc: 'Volto amanhã' }];


function fmtElapsed(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor(s % 3600 / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function AwayModal({ onConfirm, onClose }) {
  const [reason, setReason] = React.useState(null);
  const [note, setNote] = React.useState('');
  const submit = () => {
    if (!reason) return;
    onConfirm({ reason: reason.id, label: reason.label, color: reason.color, note, since: Date.now() });
  };
  return (
    <Modal title="Definir como indisponível" onClose={onClose} size="md" footer={
    <>
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!reason} onClick={submit} style={{ opacity: reason ? 1 : 0.5 }}><Ic name="check" size={13} /> Confirmar pausa</button>
      </>
    }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: -4 }}>Suas conversas em andamento permanecem com você. Novas conversas serão direcionadas para outros atendentes.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {AWAY_REASONS.map((r) => {
            const on = reason?.id === r.id;
            return (
              <div key={r.id} onClick={() => setReason(r)} className="card" style={{ padding: 12, cursor: 'default', borderColor: on ? r.color : 'var(--border)', background: on ? `color-mix(in oklab, ${r.color} 8%, var(--surface))` : 'var(--surface)', transition: 'border-color .15s, background .15s' }}>
                <div className="row" style={{ gap: 10 }}>
                  <span style={{ width: 36, height: 36, borderRadius: 10, background: `color-mix(in oklab, ${r.color} 14%, transparent)`, color: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ic name={r.icon} size={18} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--type-sm)' }}>{r.label}</div>
                    <div className="muted" style={{ fontSize: 'var(--type-xs)' }}>{r.desc}</div>
                  </div>
                  {on && <span style={{ width: 18, height: 18, borderRadius: '50%', background: r.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ic name="check" size={11} /></span>}
                </div>
              </div>);

          })}
        </div>
        <div>
          <label className="label">Observação <span className="muted" style={{ fontWeight: 400 }}>(opcional)</span></label>
          <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: levando filho ao médico, volto às 14h..." style={{ resize: 'none' }} />
        </div>
      </div>
    </Modal>);

}

function AwayBadge({ away, onResume }) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {const t = setInterval(() => setNow(Date.now()), 1000);return () => clearInterval(t);}, []);
  const elapsed = now - away.since;
  return (
    <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: `color-mix(in oklab, ${away.color} 8%, var(--surface))`, display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: away.color, animation: 'pulse 1.6s ease-in-out infinite', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: away.color }}>{away.label}</div>
        {away.note && <div className="muted" style={{ fontSize: 'var(--type-xs)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{away.note}</div>}
      </div>
      <span className="tnum" style={{ fontSize: 'var(--type-sm)', fontWeight: 600, color: away.color, fontVariantNumeric: 'tabular-nums' }}>{fmtElapsed(elapsed)}</span>
      <button className="btn btn-sm" onClick={onResume} style={{ borderColor: away.color, color: away.color }}>Voltar</button>
    </div>);

}

function FilterPopover({ filter, tags, phases, selectedTags, selectedPhases, onToggleTag, onTogglePhase, onClear, onClose }) {
  const [tab, setTab] = React.useState('tags');
  const ref = React.useRef(null);
  React.useEffect(() => {
    const onDoc = (e) => {if (ref.current && !ref.current.contains(e.target)) onClose();};
    const t = setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    return () => {clearTimeout(t);document.removeEventListener('mousedown', onDoc);};
  }, [onClose]);
  const filterName = { alert: 'Alertas', ai: 'IA', active: 'Ativas', pending: 'Pendentes', closed: 'Encerradas' }[filter] || 'todas';
  const totalSel = selectedTags.length + selectedPhases.length;
  return (
    <div ref={ref} style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 260, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 10px 32px rgba(0,0,0,.18)', zIndex: 60, animation: 'popIn .18s ease', overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px 0' }}>
        <div className="muted" style={{ fontSize: 'var(--type-xs)' }}>Filtrando aba <strong style={{ color: 'var(--text)' }}>{filterName}</strong></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border)', marginTop: 8, position: 'relative' }}>
        {[['tags', 'TAGS'], ['phases', 'FUNIL']].map(([id, l]) =>
        <div key={id} onClick={() => setTab(id)} style={{ padding: '10px 0', textAlign: 'center', fontSize: 'var(--type-xs)', fontWeight: 700, letterSpacing: '.06em', color: tab === id ? 'var(--text)' : 'var(--text-muted)', cursor: 'default', transition: 'color .15s' }}>{l}</div>
        )}
        <div style={{ position: 'absolute', bottom: -1, height: 2, width: '50%', left: tab === 'tags' ? '0%' : '50%', background: 'var(--accent)', transition: 'left .25s cubic-bezier(.5,1.4,.4,1)' }} />
      </div>
      <div className="scroll" style={{ maxHeight: 280, overflow: 'auto', padding: 6 }}>
        {tab === 'tags' && (tags.length === 0 ? <div className="muted" style={{ padding: 16, fontSize: 'var(--type-sm)', textAlign: 'center' }}>Nenhuma tag</div> :
        tags.map((t) => {
          const on = selectedTags.includes(t);
          return (
            <div key={t} className="filter-row" onClick={() => onToggleTag(t)}>
                <span className="cb" data-on={on}>{on && <Ic name="check" size={12} />}</span>
                <span style={{ flex: 1, fontSize: 'var(--type-sm)', fontWeight: on ? 600 : 500 }}>{t}</span>
              </div>);

        }))
        }
        {tab === 'phases' && phases.map((p) => {
          const on = selectedPhases.includes(p.id);
          return (
            <div key={p.id} className="filter-row" onClick={() => onTogglePhase(p.id)}>
              <span className="cb" data-on={on}>{on && <Ic name="check" size={12} />}</span>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 'var(--type-sm)', fontWeight: on ? 600 : 500 }}>{p.label}</span>
            </div>);

        })}
      </div>
      {totalSel > 0 &&
      <div style={{ borderTop: '1px solid var(--border)', padding: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)' }}>
          <span className="muted" style={{ fontSize: 'var(--type-xs)' }}>{totalSel} filtro{totalSel > 1 ? 's' : ''} ativo{totalSel > 1 ? 's' : ''}</span>
          <button className="btn btn-sm btn-ghost" onClick={onClear} style={{ color: 'var(--accent-700)' }}>Limpar</button>
        </div>
      }
    </div>);

}

function InboxHeader({ available, away, onSetAway, onResume, filter, tags, phases, selectedTags, selectedPhases, onToggleTag, onTogglePhase, onClear }) {
  const [showFilter, setShowFilter] = React.useState(false);
  const totalSel = selectedTags.length + selectedPhases.length;
  return (
    <div style={{ padding: '10px 14px 12px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', height: "80px" }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #0EFF9B 0%, #C0FF33 100%)', color: '#0a3a1f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 6px rgba(14,255,155,.25)' }}>
          <Ic name="inbox" size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0, fontWeight: 600, letterSpacing: '-0.01em', paddingTop: 7, fontSize: "18px" }}>The List Bate Papo</div>
        <button onClick={() => available ? onSetAway() : onResume()} className={`switch ${available ? 'on' : 'off'}`} title={available ? 'Disponível para receber novas conversas' : `Indisponível: ${away?.label || ''}`}>
          <span className="switch-track">
            <span className="switch-text switch-on">ON</span>
            <span className="switch-text switch-off">OFF</span>
            <span className="switch-knob" />
          </span>
        </button>
        <div style={{ position: 'relative' }}>
          <button className="btn btn-icon btn-sm" onClick={() => setShowFilter((s) => !s)} style={{ height: 24, width: 28, padding: 0, background: totalSel > 0 ? 'var(--accent-soft)' : 'transparent', borderColor: totalSel > 0 ? 'var(--accent)' : 'var(--border)', color: totalSel > 0 ? 'var(--accent-700)' : 'var(--text-muted)', position: 'relative' }}>
            <Ic name="filter" size={13} />
            {totalSel > 0 && <span style={{ position: 'absolute', top: -5, right: -5, background: 'var(--accent)', color: 'white', borderRadius: 999, minWidth: 14, height: 14, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '2px solid var(--surface)' }}>{totalSel}</span>}
          </button>
          {showFilter &&
          <FilterPopover
            filter={filter}
            tags={tags}
            phases={phases}
            selectedTags={selectedTags}
            selectedPhases={selectedPhases}
            onToggleTag={onToggleTag}
            onTogglePhase={onTogglePhase}
            onClear={onClear}
            onClose={() => setShowFilter(false)} />

          }
        </div>
      </div>
      <div className="muted" style={{ fontSize: 11, letterSpacing: '.01em', marginTop: 6, paddingLeft: 2 }}></div>
    </div>);

}

function FilterPills({ filter, setFilter, counts }) {
  const items = [
  ['alert', null, 'alert', counts.alert, 'Alertas — não visualizadas'],
  ['ai', null, 'sparkles', counts.ai, 'Atendidas pela IA'],
  ['active', 'Ativas', null, null, 'Atendendo agora'],
  ['pending', 'Pendentes', null, counts.pending, 'Aguardando atendimento'],
  ['closed', 'Encerradas', null, null, 'Encerradas']];

  const refs = React.useRef([]);
  const [pos, setPos] = React.useState({ left: 0, width: 0 });
  const idx = items.findIndex((it) => it[0] === filter);
  React.useLayoutEffect(() => {
    const el = refs.current[idx];
    if (!el) return;
    setPos({ left: el.offsetLeft, width: el.offsetWidth });
  }, [idx, filter]);
  return (
    <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0, marginTop: 8, padding: 4, background: 'var(--surface-2)', borderRadius: 8 }}>
      <div style={{ position: 'absolute', top: 4, bottom: 4, left: pos.left, width: pos.width, background: '#E7F4E9', borderRadius: 6, transition: 'left .32s cubic-bezier(.5,1.4,.4,1), width .32s cubic-bezier(.5,1.4,.4,1)', boxShadow: '0 1px 2px rgba(15,23,42,.08)', pointerEvents: 'none' }} />
      {items.map(([id, label, icon, badge, title], i) => {
        const on = filter === id;
        return (
          <div key={id} ref={(el) => refs.current[i] = el} title={title} onClick={() => setFilter(id)} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, fontSize: 'var(--type-xs)', fontWeight: 600, cursor: 'default', color: on ? 'var(--accent-700)' : 'var(--text-muted)', transition: 'color .2s ease', zIndex: 1, whiteSpace: 'nowrap' }}>
            {icon && <Ic name={icon} size={14} style={{ color: id === 'alert' ? '#dc2626' : 'var(--ai)' }} />}
            {label}
            {badge ? <span style={{ background: id === 'alert' ? '#dc2626' : id === 'ai' ? 'var(--ai)' : 'var(--accent)', color: 'white', borderRadius: 999, padding: '0 5px', fontSize: 9, lineHeight: '14px', fontWeight: 700, minWidth: 14, textAlign: 'center' }}>{badge}</span> : null}
          </div>);

      })}
    </div>);

}

function ContactsPanel({ open, onClose, onStartConv }) {
  const [q, setQ] = React.useState('');
  const [showNew, setShowNew] = React.useState(false);
  const [list, setList] = React.useState([]);     // clientes da API
  const [loading, setLoading] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    const t = setTimeout(() => {
      API.getClientes(q)
        .then((r) => setList((r.clientes || []).map((c) => ({ id: c.id, name: c.nome, phone: c.telefone, foto: c.foto }))))
        .catch(() => setList([]))
        .finally(() => setLoading(false));
    }, 220); // debounce
    return () => clearTimeout(t);
  }, [open, q]);
  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'var(--surface)', zIndex: 30,
      display: 'flex', flexDirection: 'column',
      transform: open ? 'translateX(0)' : 'translateX(-100%)',
      transition: open ?
      'transform .32s cubic-bezier(.4, 0, .2, 1), visibility 0s linear 0s' :
      'transform .32s cubic-bezier(.4, 0, .2, 1), visibility 0s linear .32s',
      visibility: open ? 'visible' : 'hidden',
      pointerEvents: open ? 'auto' : 'none',
      boxShadow: open ? '8px 0 24px rgba(0,0,0,.06)' : 'none'
    }}>
      {/* Header */}
      <div style={{ padding: '14px 14px 10px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}>
        <button className="btn btn-ghost btn-icon" onClick={onClose} title="Voltar"><Ic name="arrow-left" size={18} /></button>
        <h2 className="h2" style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Contatos</h2>
        <span className="muted" style={{ fontSize: 11, marginLeft: 'auto' }}>{list.length} {list.length === 1 ? 'contato' : 'contatos'}</span>
      </div>
      {/* Search + new conv */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }}><Ic name="search" size={14} /></span>
          <input
            className="input"
            autoFocus
            placeholder="Pesquisar nome ou número…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ paddingLeft: 34, height: 38, borderRadius: 999, fontSize: 'var(--type-sm)' }} />
          
          {q && <button onClick={() => setQ('')} className="btn btn-ghost btn-icon" style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28 }}><Ic name="x" size={14} /></button>}
        </div>
        <button
          onClick={() => setShowNew(true)}
          title="Iniciar nova conversa"
          className="btn btn-icon"
          style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--accent-soft)', borderColor: 'var(--accent-soft)', color: 'var(--accent-700)' }}>
          <Ic name="chat-plus" size={17} /></button>
      </div>
      {/* List */}
      <div className="scroll" style={{ flex: 1, overflow: 'auto' }}>
        {loading && list.length === 0 ?
        <div className="muted" style={{ padding: '40px 20px', textAlign: 'center', fontSize: 13 }}>Carregando clientes…</div> :
        list.length === 0 ?
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div className="muted" style={{ fontSize: 13 }}>{q ? `Nenhum cliente encontrado para "${q}"` : 'Nenhum cliente cadastrado.'}</div>
            <button onClick={() => setShowNew(true)} className="btn btn-sm" style={{ marginTop: 12 }}><Ic name="chat-plus" size={14} /> Nova conversa</button>
          </div> :
        list.map((c) =>
        <ContactRow key={c.id} c={c} onStart={() => onStartConv(c)} />
        )}
      </div>
      {/* Floating "new conversation" FAB inside panel (matches reference) */}
      <button
        onClick={() => setShowNew(true)}
        className="fab-mini"
        title="Nova conversa"
        style={{
          position: 'absolute', bottom: 4, right: 4,
          width: 44, height: 44, borderRadius: '50%',
          background: 'transparent', border: 0, padding: 0, cursor: 'default',
          color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0.7, transition: 'opacity .15s, transform .15s'
        }}
        onMouseEnter={(e) => {e.currentTarget.style.opacity = '1';e.currentTarget.style.transform = 'scale(1.08)';}}
        onMouseLeave={(e) => {e.currentTarget.style.opacity = '0.7';e.currentTarget.style.transform = 'scale(1)';}}>
        <Ic name="plus-circle" size={26} /></button>
      {showNew && <NewConversationDialog onClose={() => setShowNew(false)} onStart={(payload) => {setShowNew(false);onStartConv(payload);}} />}
    </div>);

}

function ContactRow({ c, onStart }) {
  return (
    <div className="contact-row" style={{
      padding: '10px 14px', borderBottom: '1px solid var(--border)',
      display: 'flex', gap: 12, alignItems: 'center',
      transition: 'background .12s'
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
      
      <div style={{ position: 'relative' }}>
        <Avatar name={c.name} src={c.foto} />
        <span style={{ position: 'absolute', left: -2, top: '50%', transform: 'translateY(-50%)', width: 3, height: 22, background: c.tag === 'CLIENTE' ? '#10b981' : 'var(--hue-violet)', borderRadius: 2 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 'var(--type-sm)', letterSpacing: '.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase' }}>{c.name}</div>
        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{c.phone}</div>
      </div>
      <button
        onClick={onStart}
        className="btn btn-ghost btn-icon"
        title="Iniciar conversa"
        style={{ width: 32, height: 32, borderRadius: '50%', color: 'var(--accent)' }}>
        <Ic name="arrow-right" size={16} /></button>
    </div>);

}

function NewConversationDialog({ onClose, onStart }) {
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const formatPhone = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 13);
    if (d.length <= 2) return d;
    if (d.length <= 4) return `+${d.slice(0, 2)} ${d.slice(2)}`;
    if (d.length <= 6) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4)}`;
    if (d.length <= 11) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
    return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9, 13)}`;
  };
  const valid = name.trim().length >= 2 && phone.replace(/\D/g, '').length >= 10;
  const submit = () => {if (valid) onStart({ name: name.trim(), phone, tag: 'PROSPECT', channel: 'whatsapp' });};
  return (
    <Modal title={null} onClose={onClose} size="sm">
      <div style={{ padding: '8px 4px 4px', textAlign: 'center' }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Iniciar Nova Conversa</h3>
        <div className="muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.4 }}>Iniciar uma conversa com um contato<br />que não está na sua lista</div>
        <div style={{ height: 1, background: 'var(--border)', margin: '16px -20px 16px' }} />
        <div style={{ textAlign: 'left' }}>
          <label className="muted" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.04em' }}>NOME A SER SALVO</label>
          <div style={{ position: 'relative', marginTop: 6 }}>
            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }}><Ic name="user" size={15} /></span>
            <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: João Silva" style={{ paddingLeft: 36, height: 42, borderRadius: 999 }} />
          </div>
          <label className="muted" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.04em', marginTop: 14, display: 'block' }}>NÚMERO DO WHATSAPP</label>
          <div style={{ position: 'relative', marginTop: 6 }}>
            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }}><Ic name="whatsapp" size={15} /></span>
            <input className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="+55 (00) 00000-0000" style={{ paddingLeft: 36, height: 42, borderRadius: 999 }} />
          </div>
        </div>
        <button
          onClick={submit}
          disabled={!valid}
          style={{
            marginTop: 22, height: 46, width: '100%', border: 0, borderRadius: 999, cursor: valid ? 'default' : 'not-allowed',
            background: valid ? 'linear-gradient(135deg, #0EFF9B 0%, #C0FF33 100%)' : 'color-mix(in oklab, #94a3b8 30%, var(--surface-2))',
            color: valid ? '#064e3b' : 'var(--text-faint)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform .15s, filter .15s',
            opacity: valid ? 1 : 0.7
          }}
          onMouseEnter={(e) => {if (valid) {e.currentTarget.style.transform = 'translateY(-1px)';e.currentTarget.style.filter = 'saturate(1.1) brightness(1.05)';}}}
          onMouseLeave={(e) => {e.currentTarget.style.transform = 'translateY(0)';e.currentTarget.style.filter = 'none';}}>
          <Ic name="send" size={20} /></button>
      </div>
    </Modal>);

}

function Inbox() {
  const { tweaks, routeParam, route } = useStore();
  const [selectedId, setSelectedId] = React.useState('c1');
  const [showContacts, setShowContacts] = React.useState(false);
  const [extraConvs, setExtraConvs] = React.useState([]);
  // Conversas reais (API). null = ainda carregando.
  const [dbConvs, setDbConvs] = React.useState(null);
  const [convError, setConvError] = React.useState('');
  const refetchContatos = React.useCallback(() => {
    return API.getContatos()
      .then((r) => setDbConvs((r.contatos || []).map(dbContatoToConv)))
      .catch((e) => { setDbConvs((p) => p || []); setConvError(e.message || 'Erro ao carregar conversas'); });
  }, []);
  React.useEffect(() => { refetchContatos(); }, [refetchContatos]);
  // todas as tags da empresa (para o filtro), independente de estarem ou não em uma conversa
  const [tagList, setTagList] = React.useState([]);
  React.useEffect(() => { API.getTags().then((r) => setTagList((r.tags || []).map((t) => t.nome))).catch(() => {}); }, []);
  // Seleciona a primeira conversa real assim que carregar.
  React.useEffect(() => {
    if (dbConvs && dbConvs.length && selectedId === 'c1') setSelectedId(dbConvs[0].id);
  }, [dbConvs]);
  const startConvWith = React.useCallback(async (payload) => {
    setShowContacts(false);
    try {
      let contato = null;
      if (payload && payload.id) {
        // cliente existente -> abre a conversa (ou cria o contato se não existir)
        contato = (await API.openContato(payload.id)).contato;
      } else if (payload && payload.name) {
        // nova conversa -> cria cliente + contato
        contato = (await API.createClienteContato(payload.name, payload.phone || '', payload.channel || 'whatsapp')).contato;
      }
      if (contato) { await refetchContatos(); setSelectedId(contato.id); }
    } catch (e) { /* silencioso */ }
  }, [refetchContatos]);

  // If routed in with a lead/contact payload, open that chat directly
  const lastHandledParamRef = React.useRef(null);
  React.useEffect(() => {
    if (route !== 'inbox') return;
    if (!routeParam || typeof routeParam !== 'object' || !routeParam.name) return;
    if (lastHandledParamRef.current === routeParam) return;
    lastHandledParamRef.current = routeParam;
    startConvWith(routeParam);
  }, [route, routeParam, startConvWith]);

  const [filter, setFilter] = React.useState('active');
  const [showAI, setShowAI] = React.useState(tweaks.showAIPanel);
  const [composing, setComposing] = React.useState('');
  const [available, setAvailable] = React.useState(true);
  const [away, setAway] = React.useState(null);
  const [showAwayModal, setShowAwayModal] = React.useState(false);
  const [selectedTags, setSelectedTags] = React.useState([]);
  const [selectedPhases, setSelectedPhases] = React.useState([]);

  const empty = tweaks.dataState === 'empty';
  const matchesFilter = (c) => {
    if (filter === 'alert') return c.unread > 0 && (c.handler === 'agent' || c.handler === 'human' && c.status === 'em-andamento');
    if (filter === 'ai') return c.handler === 'agent' && c.status !== 'encerrada';
    if (filter === 'active') return c.handler === 'human' && c.status === 'em-andamento';
    if (filter === 'pending') return c.status === 'pendente' || c.handler === 'queue';
    if (filter === 'closed') return c.status === 'encerrada';
    return true;
  };
  const matchesRefine = (c) => {
    if (selectedTags.length && !(c.tags || []).some((t) => selectedTags.includes(t.nome))) return false;
    if (selectedPhases.length && !selectedPhases.includes(c.phaseId || 'prospec')) return false;
    return true;
  };
  const SOURCE = dbConvs || []; // fonte real de conversas
  const allTags = tagList; // todas as tags da empresa
  const allPhases = (typeof CRM_PHASES !== 'undefined' ? CRM_PHASES : []).map((p) => ({ id: p.id, label: p.label, color: p.color }));
  const ALL_CONVS = [...extraConvs, ...SOURCE];
  const list = empty ? [] : ALL_CONVS.filter((c) => matchesFilter(c) && matchesRefine(c));
  const conv = ALL_CONVS.find((c) => c.id === selectedId) || ALL_CONVS[0];
  const counts = {
    alert: SOURCE.filter((c) => c.unread > 0).length,
    ai: 0,
    pending: SOURCE.filter((c) => c.status === 'pendente').length
  };

  return (
    <div className="screen" style={{ height: '100%' }}>
      <Topbar title="Mensagens" subtitle="Inbox completo do Whatsapp, Instagram e Facebook" />
      <div style={{ display: 'grid', gridTemplateColumns: showAI ? '370px 1fr 350px' : '370px 1fr', flex: 1, minHeight: 0 }}>
        {/* LEFT: list */}
        <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--surface)', position: 'relative', overflow: 'hidden' }}>
          <InboxHeader
            available={available}
            away={away}
            onSetAway={() => setShowAwayModal(true)}
            onResume={() => {setAvailable(true);setAway(null);}}
            filter={filter}
            tags={allTags}
            phases={allPhases}
            selectedTags={selectedTags}
            selectedPhases={selectedPhases}
            onToggleTag={(t) => setSelectedTags((s) => s.includes(t) ? s.filter((x) => x !== t) : [...s, t])}
            onTogglePhase={(p) => setSelectedPhases((s) => s.includes(p) ? s.filter((x) => x !== p) : [...s, p])}
            onClear={() => {setSelectedTags([]);setSelectedPhases([]);}} />
          
          {!available && away && <AwayBadge away={away} onResume={() => {setAvailable(true);setAway(null);}} />}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }}><Ic name="search" size={14} /></span>
              <input className="input" placeholder="Buscar conversas..." style={{ paddingLeft: 40, height: 32, fontSize: 'var(--type-sm)' }} />
            </div>
            <FilterPills filter={filter} setFilter={setFilter} counts={counts} />
          </div>
          <div className="scroll" style={{ flex: 1, overflow: 'auto' }}>
            {dbConvs === null ? <div className="muted" style={{ padding: 20, textAlign: 'center' }}>Carregando conversas…</div> :
             convError ? <EmptyState icon="inbox" title="Erro ao carregar" desc={convError} /> :
             list.length === 0 ? <EmptyState icon="inbox" title="Sem conversas" desc="Conecte um canal para começar." /> : list.map((c) =>
            <ConvRow key={c.id} c={c} active={c.id === selectedId} onClick={() => setSelectedId(c.id)} />
            )}
          </div>
          {/* Floating action button — open contacts */}
          <button
            onClick={() => setShowContacts(true)}
            title="Contatos"
            style={{
              position: 'absolute', bottom: 4, right: 4, zIndex: 5,
              borderRadius: '50%', border: 0, padding: 0, cursor: 'default',
              background: 'radial-gradient(circle at 30% 30%, #1f2937 0%, #0f172a 70%)',
              boxShadow: '0 6px 22px rgba(0,0,0,.30), inset 0 0 0 1px rgba(255,255,255,.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'transform .18s ease, box-shadow .18s ease', width: "48px", height: "48px"
            }}
            onMouseEnter={(e) => {e.currentTarget.style.transform = 'translateY(-2px) scale(1.04)';e.currentTarget.style.boxShadow = '0 10px 28px rgba(14,255,155,.25), inset 0 0 0 1px rgba(255,255,255,.06)';}}
            onMouseLeave={(e) => {e.currentTarget.style.transform = 'translateY(0) scale(1)';e.currentTarget.style.boxShadow = '0 6px 22px rgba(0,0,0,.30), inset 0 0 0 1px rgba(255,255,255,.04)';}}>
            
            {/* Concentric ring + plus */}
            <span style={{
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0EFF9B 0%, #C0FF33 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 3px rgba(14,255,155,.25)', width: "32px", height: "32px"
            }}>
              <span style={{ width: 14, height: 14, position: 'relative' }}>
                <span style={{ position: 'absolute', left: '50%', top: '50%', width: 12, height: 2, background: '#064e3b', borderRadius: 1, transform: 'translate(-50%,-50%)' }} />
                <span style={{ position: 'absolute', left: '50%', top: '50%', width: 2, height: 12, background: '#064e3b', borderRadius: 1, transform: 'translate(-50%,-50%)' }} />
              </span>
            </span>
          </button>
          {/* Contacts overlay */}
          <ContactsPanel open={showContacts} onClose={() => setShowContacts(false)} onStartConv={startConvWith} />
        </div>

        {/* CENTER: thread */}
        {conv && <ConvThread conv={conv} composing={composing} setComposing={setComposing} onOpenContext={() => setShowAI(true)} onConvChanged={refetchContatos} />}

        {/* RIGHT: AI panel or context */}
        {showAI && conv && <AIPanel conv={conv} setComposing={setComposing} inline={true} onDataChanged={refetchContatos} />}
      </div>
      {showAwayModal && <AwayModal onClose={() => setShowAwayModal(false)} onConfirm={(a) => {setAway(a);setAvailable(false);setShowAwayModal(false);}} />}
    </div>);

}

function ConvRow({ c, active, onClick }) {
  const handlerIcon = c.handler === 'agent' ? <Ic name="sparkles" size={11} style={{ color: 'var(--ai)' }} /> : c.handler === 'queue' ? <Ic name="clock" size={11} style={{ color: 'var(--hue-amber)' }} /> : c.handler === 'human' ? <Ic name="user" size={11} style={{ color: 'var(--accent)' }} /> : <Ic name="check-double" size={11} />;
  return (
    <div
      onClick={onClick}
      onMouseEnter={(e) => {if (!active) e.currentTarget.style.background = '#FAFBFD';}}
      onMouseLeave={(e) => {if (!active) e.currentTarget.style.background = 'transparent';}}
      style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', cursor: 'default', background: active ? 'var(--accent-soft)' : 'transparent', display: 'flex', gap: 10, position: 'relative', transition: 'background .12s ease' }}>
      
      <div style={{ position: 'relative' }}>
        <Avatar name={c.client} src={c.photo} />
        <span style={{ position: 'absolute', bottom: -2, right: -2, background: 'var(--surface)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--surface)', fontSize: "16px", height: "22px", width: "22px" }}>
          <ChannelIcon ch={c.channel} size={10} />
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row" style={{ gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 'var(--type-sm)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.client}</span>
          <span className="muted" style={{ fontSize: 11 }}>{c.lastTime}</span>
        </div>
        <div className="row" style={{ gap: 6, marginTop: 2 }}>
          {handlerIcon}
          <span className="muted" style={{ fontSize: 'var(--type-xs)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.preview}</span>
          {c.unread > 0 && <span style={{ background: 'var(--accent)', color: 'white', borderRadius: 999, padding: '1px 6px', fontSize: 10, fontWeight: 600 }}>{c.unread}</span>}
        </div>
        {c.tags && c.tags.length > 0 && <div className="row" style={{ marginTop: 6, gap: 4, flexWrap: 'wrap' }}>
          {c.tags.map((t) => <span key={t.id} className="badge" style={{ background: t.cor || '#64748b', color: corContraste(t.cor), fontSize: 9, padding: '2px 6px', border: '1px solid rgba(0,0,0,.06)' }}>{t.nome}</span>)}
        </div>}
      </div>
    </div>);

}

function Modal({ title, onClose, children, footer, size = 'md' }) {
  const maxW = size === 'sm' ? 440 : size === 'md' ? 540 : 720;
  // close(cb): permite rodapé em função (footer(close)) — roda o callback e fecha.
  const close = React.useCallback((cb) => { if (typeof cb === 'function') cb(); onClose && onClose(); }, [onClose]);
  React.useEffect(() => {
    const onKey = (e) => {if (e.key === 'Escape') onClose();};
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" style={{ maxWidth: maxW }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd">
          <div style={{ fontWeight: 600, fontSize: 'var(--type-md)' }}>{title}</div>
          <button className="btn btn-ghost btn-icon modal-x" onClick={onClose}><Ic name="x" size={16} /></button>
        </div>
        <div className="modal-bd">{children}</div>
        {footer && <div className="modal-ft">{typeof footer === 'function' ? footer(close) : footer}</div>}
      </div>
    </div>);

}

const EMOJI_CATEGORIES = [
{ id: 'recent', icon: 'clock', label: 'Recentes', emojis: ['😀', '😂', '😍', '👍', '🙏', '❤️', '🔥', '✨', '🎉', '😊', '🥰', '👏'] },
{ id: 'smileys', icon: 'smile', label: 'Sorrisos & Emoções', emojis: [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '🫠', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🫢', '🫣', '🤫', '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '🫥', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '🫤', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '🥹', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾']
},
{ id: 'people', icon: 'users', label: 'Pessoas & Corpo', emojis: [
  '👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '🫦', '👶', '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔', '👩', '🧓', '👴', '👵', '🙍', '🙎', '🙅', '🙆', '💁', '🙋', '🧏', '🙇', '🤦', '🤷', '👮', '🕵️', '💂', '🥷', '👷', '🫅', '🤴', '👸', '👳', '👲', '🧕', '🤵', '👰', '🤰', '🫃', '🫄', '🤱', '👼', '🎅', '🤶', '🦸', '🦹', '🧙', '🧚', '🧛', '🧜', '🧝', '🧞', '🧟', '💆', '💇', '🚶', '🧍', '🧎', '🏃', '💃', '🕺', '👯', '🧖', '🧗', '🤺', '🏇', '⛷️', '🏂', '🏌️', '🏄', '🚣', '🏊', '⛹️', '🏋️', '🚴', '🚵', '🤸', '🤼', '🤽', '🤾', '🤹', '🧘', '🛀', '🛌']
},
{ id: 'nature', icon: 'leaf', label: 'Animais & Natureza', emojis: [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🦣', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐈', '🪶', '🐓', '🦃', '🦤', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦫', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔', '🌵', '🎄', '🌲', '🌳', '🌴', '🪵', '🌱', '🌿', '☘️', '🍀', '🎍', '🪴', '🎋', '🍃', '🍂', '🍁', '🍄', '🐚', '🪨', '🌾', '💐', '🌷', '🌹', '🥀', '🪷', '🌺', '🌸', '🌼', '🌻', '🌞', '🌝', '🌛', '🌜', '🌚', '🌕', '🌖', '🌗', '🌘', '🌑', '🌒', '🌓', '🌔', '🌙', '🌎', '🌍', '🌏', '🪐', '💫', '⭐', '🌟', '✨', '⚡', '☄️', '💥', '🔥', '🌪️', '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '💧', '💦', '🫧', '☔', '☂️', '🌊', '🌫️']
},
{ id: 'food', icon: 'leaf', label: 'Comida & Bebida', emojis: [
  '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '🫖', '☕', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊', '🥄', '🍴', '🍽️', '🥣', '🥡', '🥢', '🧂']
},
{ id: 'activities', icon: 'star', label: 'Atividades', emojis: [
  '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🪘', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩']
},
{ id: 'travel', icon: 'navigate', label: 'Viagens & Lugares', emojis: [
  '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🦯', '🦽', '🦼', '🩼', '🛴', '🚲', '🛵', '🏍️', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '🪝', '⛽', '🚧', '🚦', '🚥', '🚏', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏕️', '⛺', '🛖', '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛️', '⛪', '🕌', '🕍', '🛕', '🕋', '⛩️', '🛤️', '🛣️', '🗾', '🎑', '🏞️', '🌅', '🌄', '🌠', '🎇', '🎆', '🌇', '🌆', '🏙️', '🌃', '🌌', '🌉', '🌁']
},
{ id: 'objects', icon: 'briefcase', label: 'Objetos', emojis: [
  '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🪫', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🪛', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🪚', '🔩', '⚙️', '🪤', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '🪬', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🪠', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🛀', '🧼', '🪥', '🪒', '🧽', '🪣', '🧴', '🛎️', '🔑', '🗝️', '🚪', '🪑', '🛋️', '🛏️', '🛌', '🧸', '🪆', '🖼️', '🪞', '🪟', '🛍️', '🛒', '🎁', '🎈', '🎏', '🎀', '🪄', '🪅', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷️', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄', '📑', '🧾', '📊', '📈', '📉', '🗒️', '🗓️', '📆', '📅', '🗑️', '📇', '🗃️', '🗳️', '🗄️', '📋', '📁', '📂', '🗂️', '🗞️', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖', '🧷', '🔗', '📎', '🖇️', '📐', '📏', '🧮', '📌', '📍', '✂️', '🖊️', '🖋️', '✒️', '🖌️', '🖍️', '📝', '✏️', '🔍', '🔎', '🔏', '🔐', '🔒', '🔓']
},
{ id: 'symbols', icon: 'tag', label: 'Símbolos', emojis: [
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🛗', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '⚧', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '⏏️', '▶️', '⏸️', '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '🟰', '♾️', '💲', '💱', '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔝', '🔜', '✔️', '☑️', '🔘', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕', '📣', '📢', '💬', '💭', '🗯️', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛']
}];


const ATTACH_OPTS = [
{ id: 'foto', label: 'Fotos', desc: 'Imagens da galeria', icon: 'photo-library', color: '#a855f7' },
{ id: 'video', label: 'Vídeos', desc: 'Clipes ou arquivos de vídeo', icon: 'play', color: '#ec4899' },
{ id: 'documento', label: 'Documento', desc: 'PDF, DOC, planilhas', icon: 'contracts', color: '#0ea5e9' },
{ id: 'audio', label: 'Áudio', desc: 'Arquivo de áudio salvo', icon: 'mic', color: '#f59e0b' },
{ id: 'contato', label: 'Contato', desc: 'Compartilhar um cartão', icon: 'card-id', color: '#16a34a' }];


function EmojiPicker({ onPick, onClose }) {
  const ref = React.useRef(null);
  const [tab, setTab] = React.useState('smileys');
  const [hover, setHover] = React.useState(null);
  React.useEffect(() => {
    const onDoc = (e) => {if (ref.current && !ref.current.contains(e.target)) onClose();};
    const t = setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    return () => {clearTimeout(t);document.removeEventListener('mousedown', onDoc);};
  }, [onClose]);
  const active = EMOJI_CATEGORIES.find((c) => c.id === tab) || EMOJI_CATEGORIES[1];
  const tabIdx = EMOJI_CATEGORIES.findIndex((c) => c.id === tab);
  return (
    <div ref={ref} style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, width: 372, height: 380, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 12px 36px rgba(0,0,0,.20)', zIndex: 60, animation: 'popIn .18s ease', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Tab bar */}
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${EMOJI_CATEGORIES.length}, 1fr)`, borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
        {EMOJI_CATEGORIES.map((c) => {
          const isOn = c.id === tab;
          return (
            <div key={c.id} onClick={() => setTab(c.id)} title={c.label} style={{ height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default', color: isOn ? 'var(--accent)' : 'var(--text-muted)', transition: 'color .15s', position: 'relative' }}>
              {c.id === 'recent' ? <Ic name="clock" size={16} /> : <span style={{ fontSize: 17, filter: isOn ? 'none' : 'grayscale(.4)', opacity: isOn ? 1 : .8 }}>{c.emojis[0]}</span>}
            </div>);

        })}
        <div style={{ position: 'absolute', bottom: -1, height: 2, width: `${100 / EMOJI_CATEGORIES.length}%`, left: `${100 / EMOJI_CATEGORIES.length * tabIdx}%`, background: 'var(--accent)', transition: 'left .25s cubic-bezier(.5,1.4,.4,1)', borderRadius: 2 }} />
      </div>
      {/* Category label */}
      <div style={{ padding: '10px 14px 6px', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: 'var(--text-faint)', textTransform: 'uppercase', flexShrink: 0 }}>{active.label}</div>
      {/* Emoji grid */}
      <div className="scroll" style={{ flex: 1, overflow: 'auto', padding: '4px 12px 12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2 }}>
          {active.emojis.map((e, i) =>
          <button
            key={`${tab}-${i}`}
            onClick={() => onPick(e)}
            onMouseEnter={() => setHover(e)}
            onMouseLeave={() => setHover(null)}
            style={{ background: 'none', border: 0, padding: 0, borderRadius: 6, fontSize: 22, lineHeight: 1, cursor: 'default', transition: 'background .12s, transform .12s', height: 38, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseOver={(ev) => {ev.currentTarget.style.background = 'var(--surface-2)';ev.currentTarget.style.transform = 'scale(1.18)';}}
            onMouseOut={(ev) => {ev.currentTarget.style.background = 'transparent';ev.currentTarget.style.transform = 'scale(1)';}}>
            {e}</button>
          )}
        </div>
      </div>
      {/* Footer with hovered emoji preview */}
      <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, minHeight: 36 }}>
        {hover ?
        <>
            <span style={{ fontSize: 22, lineHeight: 1 }}>{hover}</span>
            <span className="muted" style={{ fontSize: 11 }}>{active.label}</span>
          </> :

        <span className="muted" style={{ fontSize: 11 }}>Passe o mouse para visualizar · clique para inserir</span>
        }
      </div>
    </div>);

}

function AttachPicker({ onPick, onClose }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const onDoc = (e) => {if (ref.current && !ref.current.contains(e.target)) onClose();};
    const t = setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    return () => {clearTimeout(t);document.removeEventListener('mousedown', onDoc);};
  }, [onClose]);
  return (
    <div ref={ref} style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, width: 240, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 10px 32px rgba(0,0,0,.18)', zIndex: 60, padding: 6, animation: 'popIn .18s ease' }}>
      {ATTACH_OPTS.map((o) =>
      <div key={o.id} onClick={() => onPick(o)} className="filter-row" style={{ padding: '8px 10px' }}>
          <span style={{ width: 32, height: 32, borderRadius: 8, background: `color-mix(in oklab, ${o.color} 14%, transparent)`, color: o.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ic name={o.icon} size={15} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--type-sm)' }}>{o.label}</div>
            <div className="muted" style={{ fontSize: 10 }}>{o.desc}</div>
          </div>
        </div>
      )}
    </div>);

}

function ContactPickerModal({ onClose, onPick }) {
  const [q, setQ] = React.useState('');
  const [selected, setSelected] = React.useState(null);
  const inputRef = React.useRef(null);
  React.useEffect(() => { inputRef.current?.focus(); }, []);

  const list = (typeof CONTACTS !== 'undefined' ? CONTACTS : []);
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const filtered = q
    ? list.filter(c => norm(c.name).includes(norm(q)) || norm(c.phone).includes(norm(q)))
    : list;

  const send = (c) => onPick(c);

  return (
    <Modal
      title="Enviar contato"
      size="sm"
      onClose={onClose}
      footer={<>
        <div className="muted" style={{ fontSize: 'var(--type-sm)', flex: 1 }}>
          {selected ? `Selecionado: ${selected.name}` : `${filtered.length} contato${filtered.length===1?'':'s'}`}
        </div>
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!selected} onClick={() => selected && send(selected)} style={{ opacity: selected ? 1 : .5 }}>
          <Ic name="send" size={13} /> Enviar
        </button>
      </>}>
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }}><Ic name="search" size={15} /></span>
        <input
          ref={inputRef}
          className="input"
          placeholder="Buscar por nome ou telefone..."
          style={{ paddingLeft: 40 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="scroll" style={{ maxHeight: 360, overflow: 'auto', margin: '0 -4px', padding: '0 4px' }}>
        {filtered.length === 0 ? (
          <div className="empty" style={{ padding: '32px 8px' }}>
            <div className="empty-icon"><Ic name="user" size={22} /></div>
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>Nenhum contato encontrado</div>
            <div style={{ fontSize: 'var(--type-sm)' }}>Tente outro termo de busca.</div>
          </div>
        ) : filtered.map(c => {
          const isSel = selected?.id === c.id;
          return (
            <div
              key={c.id}
              onClick={() => setSelected(c)}
              onDoubleClick={() => send(c)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 8, cursor: 'default',
                background: isSel ? 'var(--accent-soft)' : 'transparent',
                border: '1px solid ' + (isSel ? 'color-mix(in oklab, var(--accent) 30%, var(--border))' : 'transparent'),
                marginBottom: 2,
                transition: 'background .12s, border-color .12s',
              }}
              onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = 'var(--surface-2)'; }}
              onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
            >
              <Avatar name={c.name} size="sm" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row" style={{ gap: 6 }}>
                  <span style={{ fontWeight: 500, fontSize: 'var(--type-sm)' }}>{c.name}</span>
                  <ChannelIcon ch={c.channel} size={11} />
                </div>
                <div className="muted" style={{ fontSize: 'var(--type-xs)' }}>{c.phone}</div>
              </div>
              <span className="chip" style={c.tag === 'CLIENTE' ? { background: 'var(--accent-soft)', color: 'var(--accent-700)' } : {}}>{c.tag}</span>
              {isSel && <Ic name="check" size={15} style={{ color: 'var(--accent-700)' }} />}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

function fmtRecTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function VoiceRecorder({ onSend, onCancel }) {
  const [t, setT] = React.useState(0);
  const [erro, setErro] = React.useState('');
  const recRef = React.useRef(null);
  const chunksRef = React.useRef([]);
  const streamRef = React.useRef(null);
  React.useEffect(() => {
    const id = setInterval(() => setT((x) => x + 0.1), 100);
    (async () => {
      try {
        if (!navigator.mediaDevices || !window.MediaRecorder) { setErro('Gravação não suportada'); return; }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        // escolhe um formato suportado pelo navegador
        const cands = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
        const mime = cands.find((m) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '';
        const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
        mr.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
        mr.start(200); // emite chunks a cada 200ms (garante dados antes do stop)
        recRef.current = mr;
      } catch (e) {
        setErro('Sem acesso ao microfone');
      }
    })();
    return () => {
      clearInterval(id);
      try { streamRef.current && streamRef.current.getTracks().forEach((tr) => tr.stop()); } catch (e) {}
    };
  }, []);
  const parar = (enviar) => {
    const mr = recRef.current;
    if (!mr || mr.state === 'inactive') { onSend(enviar ? null : undefined); if (!enviar) onCancel(); return; }
    mr.onstop = () => {
      if (enviar) {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        onSend(blob.size ? blob : null);
      } else { onCancel(); }
    };
    mr.stop();
  };
  return (
    <div className="row voice-rec" style={{ gap: 10, flex: 1, padding: '0 10px', height: 36, background: 'color-mix(in oklab, #ef4444 8%, var(--surface))', border: '1px solid color-mix(in oklab, #ef4444 30%, var(--border))', borderRadius: 8, animation: 'slide-in-right .18s ease' }}>
      <button onClick={() => parar(false)} className="btn btn-ghost btn-icon" style={{ color: '#dc2626', width: 28, height: 28 }} title="Cancelar"><Ic name="trash" size={16} /></button>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', animation: 'pulse 1.2s ease-in-out infinite', flexShrink: 0 }} />
      <span className="tnum" style={{ fontSize: 'var(--type-sm)', fontWeight: 600, color: '#dc2626', fontVariantNumeric: 'tabular-nums', minWidth: 44 }}>{erro || fmtRecTime(t)}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, height: 22 }}>
        {Array.from({ length: 28 }).map((_, i) => {
          const phase = t * 4 + i * 0.6;
          const h = 4 + Math.abs(Math.sin(phase)) * 14 + Math.abs(Math.cos(phase * 1.3)) * 4;
          return <div key={i} style={{ width: 2, height: `${h}px`, background: '#dc2626', borderRadius: 1, opacity: 0.4 + Math.abs(Math.sin(phase)) * 0.6 }} />;
        })}
      </div>
      <button onClick={() => parar(true)} className="btn btn-primary btn-icon" style={{ width: 32, height: 32 }} title="Enviar áudio"><Ic name="send" size={14} /></button>
    </div>);

}

function DevolverIAModal({ conv, onClose, onConfirm }) {
  const [reason, setReason] = React.useState('');
  const [keepNotes, setKeepNotes] = React.useState(true);
  return (
    <Modal title="Devolver para a IA" onClose={onClose} size="sm" footer={<>
      <button className="btn" onClick={onClose}>Cancelar</button>
      <button className="btn btn-primary" onClick={() => onConfirm({ reason, keepNotes })}><Ic name="bot" size={13} /> Devolver à IA</button>
    </>}>
      <div className="col" style={{ gap: 12 }}>
        <div className="row" style={{ gap: 10, padding: 12, background: 'color-mix(in oklab, var(--ai) 8%, var(--surface))', border: '1px solid color-mix(in oklab, var(--ai) 24%, var(--border))', borderRadius: 8 }}>
          <Ic name="sparkles" size={18} style={{ color: 'var(--ai)', flexShrink: 0 }} />
          <div style={{ fontSize: 'var(--type-sm)' }}>A IA assumirá <strong>{conv.client}</strong> e seguirá com o atendimento de acordo com a base de conhecimento.</div>
        </div>
        <div>
          <label className="label">Motivo da devolução <span className="muted" style={{ fontWeight: 400 }}>(opcional)</span></label>
          <textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: cliente quer apenas tirar dúvidas iniciais" style={{ resize: 'none' }} />
        </div>
        <label className="row" style={{ gap: 8, cursor: 'default' }}>
          <span className="cb" data-on={keepNotes} onClick={() => setKeepNotes(!keepNotes)} style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: keepNotes ? 'var(--accent)' : 'var(--surface)', color: 'white', flexShrink: 0 }}>{keepNotes && <Ic name="check" size={11} />}</span>
          <span style={{ fontSize: 'var(--type-sm)' }}>Manter histórico e notas internas visíveis para a IA</span>
        </label>
      </div>
    </Modal>);

}

const TRANSFER_AGENTS = [
{ id: 'a1', name: 'Karla Zambelly', role: 'Atendente', status: 'available', queue: 3 },
{ id: 'a2', name: 'Pedro Rocha', role: 'Atendente', status: 'available', queue: 1 },
{ id: 'a3', name: 'Maria Souza', role: 'Supervisor', status: 'busy', queue: 8 },
{ id: 'a4', name: 'João Lima', role: 'Atendente', status: 'offline', queue: 0 }];

const TRANSFER_DEPTS = [
{ id: 'd1', name: 'Comercial', desc: 'Vendas, propostas, fechamento', icon: 'commercial', color: '#16a34a' },
{ id: 'd2', name: 'Financeiro', desc: 'Cobrança, pagamentos, NF', icon: 'finance', color: '#0ea5e9' },
{ id: 'd3', name: 'Suporte', desc: 'Dúvidas técnicas e SAC', icon: 'help', color: '#f59e0b' },
{ id: 'd4', name: 'Pós-venda', desc: 'Acompanhamento, fidelização', icon: 'star', color: '#a855f7' }];


function TransferirModal({ conv, onClose, onConfirm }) {
  const [tab, setTab] = React.useState('agent');
  const [selected, setSelected] = React.useState(null);
  const [note, setNote] = React.useState('');
  const submit = () => {
    if (!selected) return;
    onConfirm({ kind: tab, target: selected, note });
  };
  return (
    <Modal title="Transferir conversa" onClose={onClose} size="md" footer={<>
      <button className="btn" onClick={onClose}>Cancelar</button>
      <button className="btn btn-primary" disabled={!selected} onClick={submit} style={{ opacity: selected ? 1 : 0.5 }}><Ic name="users" size={13} /> Transferir</button>
    </>}>
      <div className="col" style={{ gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border)', position: 'relative' }}>
          {[['agent', 'Atendente', 'user'], ['dept', 'Departamento', 'team']].map(([id, l, ic]) =>
          <div key={id} onClick={() => {setTab(id);setSelected(null);}} style={{ padding: '10px 0', textAlign: 'center', fontSize: 'var(--type-sm)', fontWeight: 600, color: tab === id ? 'var(--text)' : 'var(--text-muted)', cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'color .15s' }}><Ic name={ic} size={13} />{l}</div>
          )}
          <div style={{ position: 'absolute', bottom: -1, height: 2, width: '50%', left: tab === 'agent' ? '0%' : '50%', background: 'var(--accent)', transition: 'left .25s cubic-bezier(.5,1.4,.4,1)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflow: 'auto' }}>
          {tab === 'agent' && TRANSFER_AGENTS.map((a) => {
            const on = selected?.id === a.id;
            const dot = a.status === 'available' ? '#16a34a' : a.status === 'busy' ? '#f59e0b' : '#9ca3af';
            return (
              <div key={a.id} onClick={() => a.status !== 'offline' && setSelected(a)} className="card" style={{ padding: 10, cursor: 'default', borderColor: on ? 'var(--accent)' : 'var(--border)', background: on ? 'var(--accent-soft)' : 'var(--surface)', opacity: a.status === 'offline' ? 0.5 : 1, transition: 'border-color .15s, background .15s' }}>
                <div className="row" style={{ gap: 10 }}>
                  <Avatar name={a.name} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ gap: 6 }}><span style={{ fontWeight: 600, fontSize: 'var(--type-sm)' }}>{a.name}</span><span style={{ width: 7, height: 7, borderRadius: '50%', background: dot }} /></div>
                    <div className="muted" style={{ fontSize: 11 }}>{a.role} · {a.queue} na fila</div>
                  </div>
                  {on && <Ic name="check" size={16} style={{ color: 'var(--accent)' }} />}
                </div>
              </div>);

          })}
          {tab === 'dept' && TRANSFER_DEPTS.map((d) => {
            const on = selected?.id === d.id;
            return (
              <div key={d.id} onClick={() => setSelected(d)} className="card" style={{ padding: 10, cursor: 'default', borderColor: on ? d.color : 'var(--border)', background: on ? `color-mix(in oklab, ${d.color} 8%, var(--surface))` : 'var(--surface)', transition: 'border-color .15s, background .15s' }}>
                <div className="row" style={{ gap: 10 }}>
                  <span style={{ width: 36, height: 36, borderRadius: 9, background: `color-mix(in oklab, ${d.color} 14%, transparent)`, color: d.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ic name={d.icon} size={16} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--type-sm)' }}>{d.name}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{d.desc}</div>
                  </div>
                  {on && <Ic name="check" size={16} style={{ color: d.color }} />}
                </div>
              </div>);

          })}
        </div>
        <div>
          <label className="label">Nota para quem receber <span className="muted" style={{ fontWeight: 400 }}>(opcional)</span></label>
          <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: cliente já recebeu orçamento, falta confirmar pagamento..." style={{ resize: 'none' }} />
        </div>
      </div>
    </Modal>);

}

const CLOSE_OUTCOMES = [
{ id: 'resolved', label: 'Resolvido', desc: 'Cliente foi atendido com sucesso', color: '#16a34a', icon: 'check' },
{ id: 'sale', label: 'Convertido (venda)', desc: 'Resultou em compra ou contrato', color: '#a855f7', icon: 'cart' },
{ id: 'unresolved', label: 'Não resolvido', desc: 'Não foi possível ajudar', color: '#dc2626', icon: 'x' },
{ id: 'noreply', label: 'Sem resposta', desc: 'Cliente não retornou', color: '#64748b', icon: 'clock' }];


function EncerrarModal({ conv, onClose, onConfirm }) {
  const [outcome, setOutcome] = React.useState(null);
  const [note, setNote] = React.useState('');
  const submit = () => {if (!outcome) return;onConfirm({ outcome: outcome.id, label: outcome.label, note });};
  return (
    <Modal title="Encerrar conversa" onClose={onClose} size="sm" footer={<>
      <button className="btn" onClick={onClose}>Cancelar</button>
      <button className="btn btn-primary" disabled={!outcome} onClick={submit} style={{ opacity: outcome ? 1 : 0.5 }}><Ic name="check" size={13} /> Encerrar</button>
    </>}>
      <div className="col" style={{ gap: 12 }}>
        <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>Confirme o desfecho do atendimento de <strong style={{ color: 'var(--text)' }}>{conv.client}</strong>. Você pode retomar depois se o cliente voltar a interagir.</div>
        <div className="col" style={{ gap: 6 }}>
          {CLOSE_OUTCOMES.map((o) => {
            const on = outcome?.id === o.id;
            return (
              <div key={o.id} onClick={() => setOutcome(o)} className="card" style={{ padding: 10, cursor: 'default', borderColor: on ? o.color : 'var(--border)', background: on ? `color-mix(in oklab, ${o.color} 8%, var(--surface))` : 'var(--surface)', transition: 'border-color .15s, background .15s' }}>
                <div className="row" style={{ gap: 10 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: `color-mix(in oklab, ${o.color} 14%, transparent)`, color: o.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ic name={o.icon} size={14} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--type-sm)' }}>{o.label}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{o.desc}</div>
                  </div>
                  {on && <Ic name="check" size={14} style={{ color: o.color }} />}
                </div>
              </div>);

          })}
        </div>
        <div>
          <label className="label">Observação <span className="muted" style={{ fontWeight: 400 }}>(opcional)</span></label>
          <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: cliente solicitou retorno em 3 dias..." style={{ resize: 'none' }} />
        </div>
      </div>
    </Modal>);

}

function ConvThread({ conv, composing, setComposing, onOpenContext, onConvChanged }) {
  const [messages, setMessages] = React.useState([]);
  const [loadingMsgs, setLoadingMsgs] = React.useState(false);
  const fileRef = React.useRef(null);
  const [pendingAccept, setPendingAccept] = React.useState('');
  // respostas rápidas (para expandir o atalho digitado no campo)
  const [quickReplies, setQuickReplies] = React.useState([]);
  React.useEffect(() => { API.getRespostas().then((r) => setQuickReplies(r.respostas || [])).catch(() => {}); }, []);
  const [localStatus, setLocalStatus] = React.useState(conv.status);
  const [localHandler, setLocalHandler] = React.useState(conv.handler);
  const [menu, setMenu] = React.useState(null); // 'emoji' | 'attach'
  const [recording, setRecording] = React.useState(false);
  const [showContactPicker, setShowContactPicker] = React.useState(false);
  const [modal, setModal] = React.useState(null); // 'devolver' | 'transferir' | 'encerrar'
  const [toast, setToast] = React.useState(null);
  const inputRef = React.useRef(null);
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    setLocalStatus(conv.status);
    setLocalHandler(conv.handler);
    setMenu(null);setRecording(false);setModal(null);setToast(null);
    if (conv._db) {
      // conversa real: busca as mensagens na API
      setLoadingMsgs(true);
      let alive = true;
      API.getMensagens(conv.id)
        .then((r) => { if (alive) setMessages((r.mensagens || []).map(dbMsgToUi)); })
        .catch(() => { if (alive) setMessages([]); })
        .finally(() => { if (alive) setLoadingMsgs(false); });
      return () => { alive = false; };
    } else {
      setMessages(conv.messages || [{ from: 'client', kind: 'text', text: conv.preview, time: conv.lastTime }]);
    }
  }, [conv.id]);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  React.useEffect(() => {if (toast) {const t = setTimeout(() => setToast(null), 2400);return () => clearTimeout(t);}}, [toast]);

  const now = () => {const d = new Date();return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;};
  const addAgentMessage = (m) => setMessages((prev) => [...prev, { from: 'agent', time: now(), ...m }]);

  const handleSend = async () => {
    const t = composing.trim();
    if (!t) return;
    if (conv._db) {
      setComposing('');
      try {
        const r = await API.sendTexto(conv.id, t);
        setMessages((prev) => [...prev, dbMsgToUi(r.mensagem)]);
      } catch (e) {
        setToast({ kind: 'error', text: e.message || 'Falha ao enviar' });
      }
    } else {
      addAgentMessage({ kind: 'text', text: t });
      setComposing('');
    }
  };
  const onKeyDown = (e) => {if (e.key === 'Enter' && !e.shiftKey) {e.preventDefault();handleSend();}};
  const onPickEmoji = (e) => {setComposing((composing || '') + e);inputRef.current?.focus();};
  // expande o atalho: se o texto digitado for exatamente um comando, troca pela mensagem completa
  const onComposeChange = (val) => {
    const exact = quickReplies.find((q) => q.comando && q.comando.trim().toLowerCase() === val.trim().toLowerCase());
    setComposing(exact ? exact.mensagem : val);
  };
  // sugestões enquanto digita o começo de um atalho
  const qrSuggestions = composing.trim()
    ? quickReplies.filter((q) => q.comando && q.comando.toLowerCase().startsWith(composing.trim().toLowerCase()) && q.comando.trim().toLowerCase() !== composing.trim().toLowerCase()).slice(0, 5)
    : [];
  // dispara o seletor de arquivo do sistema
  const triggerFile = (accept) => { setPendingAccept(accept); setTimeout(() => fileRef.current && fileRef.current.click(), 0); };
  // faz upload do arquivo escolhido (ou áudio gravado) via API
  const enviarArquivo = async (file) => {
    if (!file) return;
    if (!conv._db) { addAgentMessage({ kind: 'doc', filename: file.name || 'arquivo', meta: fmtTamanho(file.size) }); return; }
    setToast({ kind: 'success', text: 'Enviando…' });
    try {
      const r = await API.sendMidia(conv.id, file, file.name);
      setMessages((prev) => [...prev, dbMsgToUi(r.mensagem)]);
      setToast(null);
    } catch (e) {
      setToast({ kind: 'error', text: e.message || 'Falha no upload' });
    }
  };
  const onPickAttach = (o) => {
    setMenu(null);
    if (o.id === 'foto') triggerFile('image/*');
    else if (o.id === 'video') triggerFile('video/*');
    else if (o.id === 'audio') triggerFile('audio/*');
    else if (o.id === 'contato') { setShowContactPicker(true); }
    else triggerFile('');
  };

  const handler = localHandler;

  // grava o status no banco (ativo/finalizado) e atualiza a lista de conversas
  const mudarStatus = async (dbStatus) => {
    if (!conv._db) return;
    try { await API.setContatoStatus(conv.id, dbStatus); if (onConvChanged) onConvChanged(); } catch (e) {}
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--surface-2)', position: 'relative' }}>
      <div onClick={onOpenContext} title="Abrir contexto do cliente" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', cursor: 'default', transition: 'background .12s', height: "80px" }} className="row conv-head">
        <Avatar name={conv.client} src={conv.photo} />
        <div style={{ flex: 1, marginLeft: 10 }}>
          <div className="row" style={{ gap: 8 }}><span style={{ fontWeight: 600 }}>{conv.client}</span><ChannelIcon ch={conv.channel} size={13} /></div>
          <div className="muted" style={{ fontSize: 'var(--type-xs)' }}>{conv.tag || 'PROSPECT'}</div>
        </div>
        {handler === 'agent' && <span className="badge badge-ai"><Ic name="sparkles" size={11} /> IA respondendo</span>}
        {handler === 'queue' && <span className="badge badge-warning"><Ic name="clock" size={11} /> Aguardando há {conv.waitMin || 3} min</span>}
        {handler === 'human' && <span className="badge badge-success"><Ic name="user" size={11} /> Você atendendo</span>}
        <button className="btn btn-ghost btn-icon" onClick={(e) => e.stopPropagation()} style={{ width: "30px", height: "30px" }}><Ic name="phone" size={15} /></button>
        <button className="btn btn-ghost btn-icon" onClick={(e) => e.stopPropagation()} style={{ width: "30px", height: "30px" }}><Ic name="user" size={15} /></button>
      </div>
      <div ref={scrollRef} className="scroll" style={{ flex: 1, overflow: 'auto', padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {loadingMsgs ? <div className="muted" style={{ margin: 'auto' }}>Carregando mensagens…</div> :
         messages.length === 0 ? <div className="muted" style={{ margin: 'auto' }}>Nenhuma mensagem ainda.</div> :
         messages.map((m, i) => <Bubble key={m._id || i} m={m} client={conv.client} clientPhoto={conv.photo} />)}
      </div>
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        {localStatus === 'pendente' || handler === 'queue' ?
        <div className="row" style={{ gap: 10, padding: 14, border: '1px dashed color-mix(in oklab, var(--hue-amber) 50%, var(--border))', borderRadius: 10, background: 'color-mix(in oklab, var(--hue-amber) 6%, var(--surface))' }}>
            <Ic name="clock" size={18} style={{ color: 'var(--hue-amber)' }} />
            <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>Conversa pendente</div><div className="muted" style={{ fontSize: 'var(--type-sm)' }}>A IA transferiu para humano. Inicie o atendimento para continuar.</div></div>
            <button className="btn btn-primary" onClick={() => {setLocalStatus('em-andamento');setLocalHandler('human');mudarStatus('ativo');setToast({ kind: 'success', text: 'Atendimento iniciado' });}}><Ic name="user" size={14} /> Atender</button>
          </div> :
        localStatus === 'encerrada' ?
        <div className="row" style={{ gap: 10, padding: 14, border: '1px dashed var(--border-strong)', borderRadius: 10, background: 'var(--surface-2)' }}>
            <Ic name="check-double" size={18} style={{ color: 'var(--text-faint)' }} />
            <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>Conversa encerrada</div><div className="muted" style={{ fontSize: 'var(--type-sm)' }}>Você pode retomar o atendimento se o cliente voltar a interagir.</div></div>
            <button className="btn btn-primary" onClick={() => {setLocalStatus('em-andamento');setLocalHandler('human');mudarStatus('ativo');setToast({ kind: 'success', text: 'Atendimento retomado' });}}><Ic name="repeat" size={14} /> Retomar</button>
          </div> :
        <>
            <div className="row" style={{ gap: 6, marginBottom: 8 }}>
              <button className="btn btn-sm btn-ghost" onClick={() => setModal('devolver')}><Ic name="bot" size={13} /> Devolver à IA</button>
              <button className="btn btn-sm btn-ghost" onClick={() => setModal('transferir')}><Ic name="users" size={13} /> Transferir</button>
              <div className="spacer" />
              <button className="btn btn-sm btn-ghost" onClick={() => setModal('encerrar')}><Ic name="check" size={13} /> Encerrar</button>
            </div>
            {qrSuggestions.length > 0 &&
            <div style={{ marginBottom: 8, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
              {qrSuggestions.map((q) =>
              <div key={q.id} onClick={() => { setComposing(q.mensagem); inputRef.current && inputRef.current.focus(); }} className="filter-row" style={{ padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--accent-700)', background: 'var(--accent-soft)', padding: '1px 6px', borderRadius: 4, flexShrink: 0 }}>{q.comando}</span>
                <span className="muted" style={{ fontSize: 'var(--type-xs)', marginLeft: 8, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.mensagem}</span>
              </div>
              )}
            </div>
            }
            <div className="row" style={{ gap: 6, alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <button className="btn btn-ghost btn-icon" data-on={menu === 'emoji'} onClick={() => setMenu(menu === 'emoji' ? null : 'emoji')} style={{ background: menu === 'emoji' ? 'var(--accent-soft)' : 'transparent', color: menu === 'emoji' ? 'var(--accent)' : undefined, width: "30px", height: "30px" }}><Ic name="smile" size={17} /></button>
                {menu === 'emoji' && <EmojiPicker onPick={onPickEmoji} onClose={() => setMenu(null)} />}
              </div>
              <div style={{ position: 'relative' }}>
                <button className="btn btn-ghost btn-icon" data-on={menu === 'attach'} onClick={() => setMenu(menu === 'attach' ? null : 'attach')} style={{ background: menu === 'attach' ? 'var(--accent-soft)' : 'transparent', color: menu === 'attach' ? 'var(--accent)' : undefined, width: "30px", height: "30px" }}><Ic name="paperclip" size={17} /></button>
                {menu === 'attach' && <AttachPicker onPick={onPickAttach} onClose={() => setMenu(null)} />}
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => {setMenu(null);setRecording(true);}} title="Gravar áudio" style={{ background: recording ? 'color-mix(in oklab, #ef4444 14%, transparent)' : 'transparent', color: recording ? '#dc2626' : undefined, width: "30px", height: "30px" }}><Ic name="mic" size={17} /></button>
              {recording ?
            <VoiceRecorder onCancel={() => setRecording(false)} onSend={(blob) => {setRecording(false); if (blob && blob.size) { const ext = ((blob.type.split('/')[1] || 'webm').split(';')[0]).replace('mpeg', 'mp3'); enviarArquivo(new File([blob], 'audio.' + ext, { type: blob.type || 'audio/webm' })); } else { setToast({ kind: 'error', text: 'Não foi possível gravar o áudio (microfone?)' }); }}} /> :

            <>
                  <input ref={inputRef} className="input" placeholder="Digite sua mensagem · digite o atalho da resposta rápida · Enter envia" value={composing} onChange={(e) => onComposeChange(e.target.value)} onKeyDown={onKeyDown} />
                  <button className="btn btn-primary btn-icon" onClick={handleSend} disabled={!composing.trim()} style={{ width: 36, height: 36, borderStyle: "solid", opacity: composing.trim() ? 1 : 0.5 }}><Ic name="send" size={15} /></button>
                </>
            }
            </div>
          </>
        }
      </div>

      {modal === 'devolver' && <DevolverIAModal conv={conv} onClose={() => setModal(null)} onConfirm={({ reason }) => {setModal(null);setLocalHandler('agent');setLocalStatus('ativa');addAgentMessage({ kind: 'text', text: reason ? `Conversa devolvida à IA · motivo: ${reason}` : 'Conversa devolvida à IA', system: true });setToast({ kind: 'ai', text: 'Conversa devolvida para a IA' });}} />}
      {modal === 'transferir' && <TransferirModal conv={conv} onClose={() => setModal(null)} onConfirm={({ kind, target, note }) => {setModal(null);setLocalStatus('pendente');setLocalHandler('queue');setToast({ kind: 'success', text: kind === 'agent' ? `Transferida para ${target.name}` : `Transferida para ${target.name}` });}} />}
      {modal === 'encerrar' && <EncerrarModal conv={conv} onClose={() => setModal(null)} onConfirm={({ label }) => {setModal(null);setLocalStatus('encerrada');mudarStatus('finalizado');setToast({ kind: 'success', text: `Conversa encerrada · ${label}` });}} />}
      {showContactPicker && <ContactPickerModal onClose={() => setShowContactPicker(false)} onPick={(c) => { setShowContactPicker(false); addAgentMessage({ kind: 'contact', contactName: c.name, contactPhone: c.phone, contactTag: c.tag, contactChannel: c.channel }); setToast({ kind: 'success', text: `Contato ${c.name} enviado` }); }} /> }

      <input ref={fileRef} type="file" accept={pendingAccept} style={{ display: 'none' }} onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; enviarArquivo(f); }} />

      {toast &&
      <div style={{ position: 'absolute', bottom: 88, left: '50%', transform: 'translateX(-50%)', padding: '10px 14px', background: toast.kind === 'ai' ? 'var(--ai)' : toast.kind === 'error' ? '#dc2626' : '#16a34a', color: 'white', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,.18)', fontSize: 'var(--type-sm)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, animation: 'pop .22s ease', zIndex: 30 }}>
          <Ic name={toast.kind === 'ai' ? 'sparkles' : toast.kind === 'error' ? 'x' : 'check'} size={14} />{toast.text}
        </div>
      }
    </div>);

}

// Player de áudio estilo WhatsApp: play/pause, ondas clicáveis, avatar com
// selo de microfone e botão de velocidade. Sem download (áudio nativo oculto).
function AudioPlayer({ src, isClient, avatarName, avatarSrc }) {
  const audioRef = React.useRef(null);
  const fixingRef = React.useRef(false); // truque p/ duração de webm
  const [playing, setPlaying] = React.useState(false);
  const [cur, setCur] = React.useState(0);
  const [dur, setDur] = React.useState(0);
  const [rate, setRate] = React.useState(1);
  // ondas estáveis por áudio (geradas a partir do src)
  const bars = React.useMemo(() => {
    let seed = 0; for (let i = 0; i < src.length; i++) seed = (seed * 31 + src.charCodeAt(i)) >>> 0;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    return Array.from({ length: 32 }, () => 0.22 + rnd() * 0.78);
  }, [src]);

  const toggle = () => {
    const a = audioRef.current; if (!a) return;
    if (a.paused) { const p = a.play(); if (p && p.catch) p.catch(() => {}); } else { a.pause(); }
  };
  const cycleRate = () => { const r = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1; setRate(r); if (audioRef.current) audioRef.current.playbackRate = r; };
  const seek = (e) => { const a = audioRef.current; if (!a || !dur) return; const rect = e.currentTarget.getBoundingClientRect(); const f = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)); a.currentTime = f * dur; setCur(f * dur); };
  const fmt = (s) => { s = Math.floor(s || 0); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  // webm gravado costuma vir com duration = Infinity; força o cálculo real.
  const onMeta = () => {
    const a = audioRef.current; if (!a) return;
    if (a.duration === Infinity || isNaN(a.duration)) { fixingRef.current = true; try { a.currentTime = 1e101; } catch (e) {} }
    else setDur(a.duration);
  };
  const onDurChange = () => {
    const a = audioRef.current; if (!a) return;
    if (a.duration !== Infinity && !isNaN(a.duration)) {
      setDur(a.duration);
      if (fixingRef.current) { fixingRef.current = false; a.currentTime = 0; setCur(0); }
    }
  };
  const onTime = () => { const a = audioRef.current; if (!a || fixingRef.current) return; setCur(a.currentTime); };

  const prog = dur ? Math.min(1, cur / dur) : 0;
  const fg = isClient ? 'var(--text)' : 'white';
  const track = isClient ? 'color-mix(in oklab, var(--text) 22%, transparent)' : 'rgba(255,255,255,.4)';
  const fill = isClient ? 'var(--accent)' : 'white';
  return (
    <div className="row" style={{ gap: 9, alignItems: 'center', minWidth: 230 }}>
      <audio ref={audioRef} src={src} preload="metadata"
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCur(0); }}
        onTimeUpdate={onTime} onLoadedMetadata={onMeta} onDurationChange={onDurChange}
        style={{ display: 'none' }} />
      <Avatar name={avatarName} src={avatarSrc} size="sm" />
      <button onClick={toggle} title={playing ? 'Pausar' : 'Tocar'} style={{ width: 30, height: 30, border: 0, borderRadius: '50%', background: isClient ? 'var(--accent)' : 'rgba(255,255,255,.28)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default', flexShrink: 0 }}><Ic name={playing ? 'pause' : 'play'} size={13} /></button>
      <div style={{ flex: 1, minWidth: 80 }}>
        <div onClick={seek} style={{ display: 'flex', alignItems: 'center', gap: 2, height: 24, cursor: 'default' }}>
          {bars.map((h, i) => {
            const on = (i / bars.length) <= prog;
            return <div key={i} style={{ flex: 1, height: `${4 + h * 16}px`, background: on ? fill : track, borderRadius: 1, transition: 'background .08s' }} />;
          })}
        </div>
        <div style={{ fontSize: 10, opacity: .85, color: fg, marginTop: 1 }}>{fmt(cur || dur)}</div>
      </div>
      <button onClick={cycleRate} title="Velocidade" style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, border: 0, borderRadius: 10, padding: '3px 7px', background: isClient ? 'var(--surface-2)' : 'rgba(255,255,255,.28)', color: fg, cursor: 'default' }}>{rate}x</button>
    </div>);
}

function Bubble({ m, client, clientPhoto }) {
  const isClient = m.from === 'client';
  const isAI = m.ai;
  const bgClient = 'var(--surface)';
  const bgAgent = isAI ? 'linear-gradient(135deg, var(--ai), color-mix(in oklab, var(--ai) 65%, var(--accent)))' : 'var(--accent)';
  return (
    <div style={{ display: 'flex', flexDirection: isClient ? 'row' : 'row-reverse', gap: 8, alignItems: 'flex-end' }}>
      {isClient ? <Avatar name={client} size="sm" /> : isAI ? <div className="avatar avatar-sm" style={{ background: 'linear-gradient(135deg, var(--ai), var(--accent))' }}><Ic name="sparkles" size={12} /></div> : <Avatar name="Você" size="sm" />}
      <div style={{ maxWidth: '70%' }}>
        {!isClient && isAI && <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ai-strong)', marginBottom: 3, letterSpacing: '.04em' }}>JÚLIA · IA</div>}
        <div style={{ padding: '10px 14px', borderRadius: 14, borderBottomRightRadius: !isClient ? 4 : 14, borderBottomLeftRadius: isClient ? 4 : 14, background: isClient ? bgClient : bgAgent, color: isClient ? 'var(--text)' : 'white', fontSize: 'var(--type-sm)', boxShadow: isClient ? 'var(--shadow-sm)' : 'none', border: isClient ? '1px solid var(--border)' : 'none' }}>
          {m.kind === 'text' && <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>}
          {m.kind === 'image' && m.mediaUrl &&
          <a href={m.mediaUrl} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
              <img src={m.mediaUrl} alt={m.filename || 'imagem'} style={{ maxWidth: 240, maxHeight: 240, borderRadius: 8, display: 'block' }} />
            </a>
          }
          {m.kind === 'audio' && (m.mediaUrl ?
          <AudioPlayer src={m.mediaUrl} isClient={isClient} avatarName={isClient ? client : 'Você'} avatarSrc={isClient ? clientPhoto : null} /> :
          <div className="row" style={{ gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic name="play" size={12} /></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                {Array.from({ length: 24 }).map((_, j) => <div key={j} style={{ width: 2, height: `${4 + Math.sin(j) * 8 + 8}px`, background: 'rgba(255,255,255,.7)', borderRadius: 1 }} />)}
              </div>
              <span style={{ fontSize: 11, opacity: .85 }}>{m.dur}</span>
            </div>)
          }
          {m.kind === 'doc' &&
          <a href={m.mediaUrl || undefined} target="_blank" rel="noreferrer" download className="row" style={{ gap: 10, padding: '4px 0', color: 'inherit', textDecoration: 'none', cursor: m.mediaUrl ? 'pointer' : 'default' }}>
              <div style={{ width: 38, height: 46, background: 'rgba(255,255,255,.2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>{(m.meta && m.meta.split(' · ')[0]) || 'DOC'}</div>
              <div><div style={{ fontWeight: 600 }}>{m.filename}</div><div style={{ fontSize: 11, opacity: .8 }}>{m.meta}</div></div>
            </a>
          }
          {m.kind === 'contact' &&
          <div style={{ minWidth: 220, padding: '2px 0' }}>
              <div className="row" style={{ gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,.22)', color: isClient ? 'var(--text)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{initials(m.contactName)}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, lineHeight: 1.2 }}>{m.contactName}</div>
                  <div style={{ fontSize: 11, opacity: .85, marginTop: 2 }}>{m.contactPhone}</div>
                </div>
              </div>
              <div className="row" style={{ gap: 6, marginTop: 8, borderTop: '1px solid rgba(255,255,255,.15)', paddingTop: 6 }}>
                <span style={{ fontSize: 10, opacity: .8, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Ic name="user" size={11} /> Cartão de contato</span>
              </div>
            </div>
          }
          {m.flag &&
          <div style={{ marginTop: 6, padding: '4px 8px', background: 'rgba(255,255,255,.15)', borderRadius: 6, fontSize: 10, fontWeight: 600, letterSpacing: '.04em', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Ic name="zap" size={10} /> {m.flag}
            </div>
          }
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 4, textAlign: isClient ? 'left' : 'right' }}>{m.time} {!isClient && '· '}{!isClient && <Ic name="check-double" size={10} style={{ verticalAlign: 'middle' }} />}</div>
      </div>
    </div>);

}

const FUNNEL = { color: '#16a34a', name: 'PRÉ-VENDA', phase: 'Prospecção' };

const QUICK_REPLIES = [
{ id: 'qr1', shortcut: '/saudacao', title: 'Saudação inicial', body: 'Olá! Tudo bem? Sou a Júlia da Iguabela Beleza ✨ Em que posso te ajudar?' },
{ id: 'qr2', shortcut: '/horarios', title: 'Horários disponíveis', body: 'Temos horários disponíveis hoje às 10h, 14h e 16h. Qual prefere?' },
{ id: 'qr3', shortcut: '/endereco', title: 'Endereço da loja', body: 'Estamos na Av. Beira Mar, 1234 — Aldeota, Fortaleza/CE. Estacionamento próprio na frente.' },
{ id: 'qr4', shortcut: '/precos-base', title: 'Tabela de preços base', body: 'Limpeza de pele a partir de R$ 180 · Drenagem R$ 220 · Pacote premium R$ 850 (5 sessões).' }];


const CLIENT_TAGS = ['VIP', 'Indicação'];
const ALL_TAGS = [
{ name: 'VIP', color: '#f59e0b' }, { name: 'Indicação', color: '#3b82f6' }, { name: 'Recorrente', color: '#16a34a' },
{ name: 'Inativo 90d', color: '#71717a' }, { name: 'Pacote premium', color: '#a855f7' }, { name: 'Aniversariante', color: '#ec4899' },
{ name: 'Inadimplente', color: '#ef4444' }, { name: 'Lead frio', color: '#0ea5e9' }];


const MEDIA_FILES = {
  documento: [
  { name: 'orcamento-iguabela.pdf', size: '128 KB', date: '15/01' },
  { name: 'autorizacao-procedimento.pdf', size: '92 KB', date: '12/01' }],

  foto: [
  { name: 'antes_pele.jpg', date: '15/01' },
  { name: 'referencia.jpg', date: '15/01' },
  { name: 'pos_sessao.jpg', date: '10/01' },
  { name: 'comparativo.jpg', date: '08/01' }],

  video: [
  { name: 'depoimento.mp4', dur: '0:42', date: '14/01' }]

};

const CLIENT_HISTORY = [
{ kind: 'message', icon: 'inbox', color: 'var(--accent)', title: 'Nova conversa via WhatsApp', desc: 'Cliente perguntou sobre pacote premium', when: 'Hoje · 14:32' },
{ kind: 'transfer', icon: 'users', color: 'var(--hue-blue)', title: 'Transferida pela IA para Karla', desc: 'Motivo: agendar consulta', when: 'Hoje · 14:35' },
{ kind: 'sale', icon: 'cart', color: '#16a34a', title: 'Venda realizada — R$ 850', desc: 'Pacote premium · 5 sessões', when: '15/01 · 09:18' },
{ kind: 'schedule', icon: 'agenda', color: 'var(--hue-violet)', title: 'Agendamento confirmado', desc: 'Limpeza de pele · 16/01 às 14h com Karla', when: '15/01 · 09:22' },
{ kind: 'tag', icon: 'tag', color: '#f59e0b', title: 'Tag "VIP" adicionada', desc: 'por Karla Zambelly', when: '10/01 · 11:04' },
{ kind: 'entry', icon: 'plus', color: 'var(--text-faint)', title: 'Cliente cadastrada', desc: 'Origem: Instagram Direct', when: '02/12/2025' }];


const TABS = [
{ id: 'ia', label: 'PAINEL.IA', icon: 'sparkles' },
{ id: 'ficha', label: 'Ficha', icon: 'card-id' },
{ id: 'respostas', label: 'Rápidas', icon: 'zap' },
{ id: 'tags', label: 'Tags', icon: 'tag' },
{ id: 'midias', label: 'Mídias', icon: 'photo-library' },
{ id: 'historico', label: 'Story', icon: 'history' }];


function FunnelBar() {
  return (
    <div style={{ padding: '10px 14px', background: FUNNEL.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700, letterSpacing: '.04em', fontSize: 'var(--type-sm)' }}>
      <span>{FUNNEL.name}</span>
      <span style={{ opacity: .85, fontWeight: 500 }}>({FUNNEL.phase})</span>
    </div>);

}

function AvatarHero({ conv, onUpload, onAddCard }) {
  return (
    <div style={{ padding: '22px 16px 14px', textAlign: 'center', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div style={{ position: 'relative', width: 108, height: 108, margin: '0 auto' }}>
        <div onClick={onUpload} title="Clique para carregar foto" style={{ width: 108, height: 108, borderRadius: '50%', cursor: 'default', overflow: 'hidden', border: `3px solid ${FUNNEL.color}`, boxShadow: '0 0 0 4px var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colorFor(conv.client), color: 'white', fontWeight: 700, fontSize: 36 }}>
          {conv.photo ? <img src={conv.photo} alt={conv.client} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(conv.client)}
        </div>
        <button onClick={onAddCard} title="Abrir ficha completa" className="hero-add" style={{ position: 'absolute', bottom: -16, left: '50%', transform: 'translateX(-50%)', border: '3px solid var(--surface)', color: '#0a3a1f', display: 'flex', alignItems: 'center', cursor: 'default', boxShadow: '0 2px 6px rgba(0,0,0,.18)', justifyContent: "center", borderStyle: "solid", transition: 'transform .15s ease, box-shadow .15s ease, filter .15s ease', borderRadius: "30px", borderColor: "rgb(255, 255, 255)", background: "linear-gradient(135deg, rgb(14, 255, 155) 0%, rgb(192, 255, 51) 100%) 0% 0% / cover", width: "32px", height: "32px", borderWidth: "2px" }}>
          <Ic name="plus" size={16} />
        </button>
      </div>
      <div style={{ fontWeight: 600, fontSize: 'var(--type-md)', marginTop: 14 }}>{conv.client}</div>
      <div className="muted" style={{ marginTop: 2, fontSize: "12px" }}>{conv.lastTime ? 'Último atendimento: ' + conv.lastTime : 'Sem atendimentos ainda'}</div>
    </div>);

}

function ActionButtons({ conv, currentUser, inline, onAppointmentRequest }) {
  const [showNewAppt, setShowNewAppt] = React.useState(false);
  const NewAppointment = window.NewAppointment;
  const handleAppt = () => {
    if (inline) onAppointmentRequest?.();
    else setShowNewAppt(true);
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border)', gap: 0 }}>
      <button className="btn-action"><Ic name="cart" size={15} /> PDV de Venda</button>
      <span style={{ width: 1, height: 18, background: 'var(--border-strong)', margin: '0 14px' }} />
      <button className="btn-action" onClick={handleAppt}><Ic name="agenda" size={15} /> Agendamento</button>
      {showNewAppt && NewAppointment && !inline &&
        <NewAppointment
          onClose={() => setShowNewAppt(false)}
          defaultClient={conv?.client || ''}
          defaultResponsible={currentUser || ''} />}
    </div>);

}

function TabBar({ active, onChange }) {
  const idx = TABS.findIndex((t) => t.id === active);
  return (
    <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
      {TABS.map((t) => {
        const isActive = active === t.id;
        return (
          <div key={t.id} onClick={() => onChange(t.id)} className="ai-tab" data-active={isActive ? 'true' : 'false'} style={{ padding: '10px 4px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'default', color: isActive ? 'var(--text)' : 'var(--text-muted)', transition: 'color .18s, background .18s' }}>
            <Ic name={t.icon} size={17} />
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' }}>{t.label}</span>
          </div>);

      })}
      <div style={{ position: 'absolute', bottom: -1, height: 2, width: `${100 / TABS.length}%`, left: `${100 / TABS.length * idx}%`, background: FUNNEL.color, transition: 'left .32s cubic-bezier(.5,1.4,.4,1)', borderRadius: 2 }} />
    </div>);

}

function TabIA({ conv, setComposing }) {
  const sugg = [
  'Posso confirmar para amanhã às 10h com a Karla?',
  'Você prefere atendimento presencial ou online?',
  'Te envio o link para escolher o melhor horário.'];

  return (
    <>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div className="row" style={{ gap: 8, marginBottom: 8 }}>
          <span style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, var(--ai), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Ic name="sparkles" size={13} /></span>
          <span style={{ fontSize: 'var(--type-xs)', fontWeight: 700, letterSpacing: '.06em', color: 'var(--ai-strong)' }}>RESUMO PELA IA</span>
        </div>
        <div style={{ fontSize: 'var(--type-sm)', lineHeight: 1.5 }}>{conv.aiSummary || 'Cliente em primeiro contato. Agente coletou nome e canal de origem. Aguardando próxima mensagem.'}</div>
        <div className="row" style={{ gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          <span className="chip chip-accent">próximo passo: agendar</span>
          <span className="chip">tópico: pacote premium</span>
          <span className="chip">sentimento: positivo</span>
        </div>
      </div>
      <div style={{ padding: '14px 16px' }}>
        <div className="row"><span style={{ fontSize: 'var(--type-xs)', fontWeight: 700, letterSpacing: '.06em', color: 'var(--ai-strong)' }}>SUGESTÕES DE RESPOSTA</span><div className="spacer" /><Ic name="sparkles" size={12} style={{ color: 'var(--ai)' }} /></div>
        <div className="col" style={{ gap: 6, marginTop: 8 }}>
          {sugg.map((s, i) =>
          <div key={i} onClick={() => setComposing(s)} style={{ padding: '10px 12px', border: '1px solid color-mix(in oklab, var(--ai) 25%, var(--border))', borderRadius: 8, fontSize: 'var(--type-sm)', cursor: 'default', background: 'var(--ai-soft)' }}>{s}</div>
          )}
        </div>
      </div>
    </>);

}

function FichaRow({ label, value }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 'var(--type-sm)' }}>
      <span style={{ color: 'var(--text-faint)', fontSize: 'var(--type-xs)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600, paddingTop: 1 }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>);

}

function TabFicha({ conv }) {
  const [cliente, setCliente] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    if (!conv.clienteId) { setCliente(null); setLoading(false); return; }
    setLoading(true);
    API.getCliente(conv.clienteId)
      .then((r) => { if (alive) setCliente(r.cliente); })
      .catch(() => { if (alive) setCliente(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [conv.clienteId]);

  // [chave do DTO, rótulo, editável]
  const campos = [
    ['nome', 'Nome', true], ['telefone', 'Telefone', true], ['email', 'E-mail', true],
    ['empresa', 'Empresa', true], ['cargo', 'Cargo', true], ['produtoInteresse', 'Produto', true],
    ['origemLead', 'Origem', true], ['valor', 'Valor', false], ['criadoEm', 'Cadastro', false],
  ];
  // chave do DTO -> coluna do banco (só as editáveis)
  const COL = { nome: 'nome', telefone: 'telefone', email: 'email', empresa: 'empresa', cargo: 'cargo', produtoInteresse: 'produtointeresse', origemLead: 'origemlead' };
  const fmtVal = (k, v) => {
    if (k === 'valor') return v != null ? 'R$ ' + Number(v).toLocaleString('pt-BR') : '—';
    if (k === 'criadoEm') return v ? new Date(v).toLocaleDateString('pt-BR') : '—';
    return v || '—';
  };
  const save = async () => {
    setSaving(true);
    const patch = {};
    Object.keys(COL).forEach((k) => { if ((draft[k] || '') !== (cliente[k] || '')) patch[COL[k]] = draft[k] === '' ? null : draft[k]; });
    try {
      if (Object.keys(patch).length) { const r = await API.updateCliente(conv.clienteId, patch); setCliente(r.cliente); }
      setEditing(false);
    } catch (e) { /* mantém em edição */ }
    setSaving(false);
  };

  if (loading) return <div className="muted" style={{ padding: 16 }}>Carregando ficha…</div>;
  if (!cliente) return <div className="muted" style={{ padding: 16 }}>Sem cliente vinculado a este contato.</div>;

  return (
    <div style={{ padding: '14px 16px' }}>
      <div className="row">
        <span style={{ fontSize: 'var(--type-xs)', fontWeight: 700, letterSpacing: '.06em', color: 'var(--text-faint)' }}>FICHA DO CLIENTE</span>
        <div className="spacer" />
        {!editing ? (
          <button className="btn btn-sm btn-ghost" style={{ padding: '4px 8px' }} onClick={() => { setDraft({ ...cliente }); setEditing(true); }} title="Editar">
            <Ic name="edit" size={13} />
          </button>
        ) : (
          <div className="row" style={{ gap: 4 }}>
            <button className="btn btn-sm btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setEditing(false)}>Cancelar</button>
            <button className="btn btn-sm btn-save" style={{ padding: '4px 10px' }} disabled={saving} onClick={save}>
              <Ic name="check" size={12} /> {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        )}
      </div>
      <div style={{ marginTop: 8 }}>
        {campos.map(([k, label, editable]) => (
          editing && editable ? (
            <div key={k} style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8, padding: '6px 0', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
              <div className="muted" style={{ fontSize: 'var(--type-xs)' }}>{label}</div>
              <input className="input" style={{ height: 28, fontSize: 'var(--type-sm)' }} value={draft[k] || ''} onChange={e => setDraft(d => ({ ...d, [k]: e.target.value }))} />
            </div>
          ) : (
            <FichaRow key={k} label={label} value={fmtVal(k, cliente[k])} />
          )
        ))}
      </div>
    </div>
  );
}

function TabRespostas({ setComposing, onNew, inline }) {
  const [replies, setReplies] = React.useState([]);
  const [editingId, setEditingId] = React.useState(null);
  const [showNew, setShowNew] = React.useState(false);
  const [draft, setDraft] = React.useState({ shortcut: '', title: '', body: '' });
  // DB {id,comando,mensagem} -> formato da UI {id,shortcut,title,body}
  const toUi = (x) => ({ id: x.id, shortcut: x.comando, title: x.comando, body: x.mensagem });
  React.useEffect(() => {
    API.getRespostas().then((r) => setReplies((r.respostas || []).map(toUi))).catch(() => setReplies([]));
  }, []);

  const startEdit = (r) => { setEditingId(r.id); setDraft({ shortcut: r.shortcut, title: r.title, body: r.body }); setShowNew(false); };
  const saveEdit = async () => {
    const comando = (draft.shortcut || draft.title || '').trim();
    if (!comando || !draft.body.trim()) return;
    try { const r = await API.updateResposta(editingId, comando, draft.body.trim()); setReplies(rs => rs.map(x => x.id === editingId ? toUi(r.resposta) : x)); } catch (e) {}
    setEditingId(null); setDraft({ shortcut: '', title: '', body: '' });
  };
  const deleteReply = async (id) => { try { await API.deleteResposta(id); setReplies(rs => rs.filter(r => r.id !== id)); } catch (e) {} };
  const createNew = async () => {
    const comando = (draft.shortcut || draft.title || '').trim();
    if (!comando || !draft.body.trim()) return;
    try { const r = await API.createResposta(comando, draft.body.trim()); setReplies(rs => [...rs, toUi(r.resposta)]); } catch (e) {}
    setShowNew(false); setDraft({ shortcut: '', title: '', body: '' });
  };
  const handleNewClick = () => {
    if (inline) { setShowNew(s => !s); setEditingId(null); setDraft({ shortcut: '', title: '', body: '' }); }
    else onNew?.();
  };

  return (
    <div style={{ padding: '14px 16px' }}>
      <div className="row">
        <span style={{ fontSize: 'var(--type-xs)', fontWeight: 700, letterSpacing: '.06em', color: 'var(--text-faint)' }}>RESPOSTAS RÁPIDAS</span>
        <div className="spacer" />
        <button className="btn btn-sm btn-ghost" style={{ padding: '4px 8px' }} onClick={handleNewClick} title="Nova resposta">
          <Ic name={showNew ? 'x' : 'plus'} size={13} />
        </button>
      </div>

      {/* Inline new form */}
      {inline && showNew && (
        <div className="card" style={{ padding: 10, marginTop: 10, gap: 6, display: 'flex', flexDirection: 'column' }}>
          <input className="input" placeholder="/atalho" value={draft.shortcut} onChange={e => setDraft({ ...draft, shortcut: e.target.value })} style={{ height: 30, fontSize: 'var(--type-sm)' }} />
          <input className="input" placeholder="Título" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} style={{ height: 30, fontSize: 'var(--type-sm)' }} />
          <textarea className="input" rows={2} placeholder="Conteúdo da resposta..." value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} style={{ resize: 'none', fontSize: 'var(--type-sm)' }} />
          <div className="row" style={{ gap: 6 }}>
            <div className="spacer" />
            <button className="btn btn-sm" onClick={() => { setShowNew(false); setDraft({ shortcut: '', title: '', body: '' }); }}>Cancelar</button>
            <button className="btn btn-sm btn-primary" disabled={!draft.title.trim()} style={{ opacity: draft.title.trim() ? 1 : .5 }} onClick={createNew}>
              <Ic name="check" size={12} /> Adicionar
            </button>
          </div>
        </div>
      )}

      <div className="col" style={{ gap: 8, marginTop: 10 }}>
        {replies.map(r => editingId === r.id ? (
          <div key={r.id} className="card" style={{ padding: 10, gap: 6, display: 'flex', flexDirection: 'column', border: '1px solid var(--accent)' }}>
            <input className="input" value={draft.shortcut} onChange={e => setDraft({ ...draft, shortcut: e.target.value })} style={{ height: 30, fontSize: 'var(--type-sm)' }} />
            <input className="input" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} style={{ height: 30, fontSize: 'var(--type-sm)' }} />
            <textarea className="input" rows={2} value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} style={{ resize: 'none', fontSize: 'var(--type-sm)' }} />
            <div className="row" style={{ gap: 6 }}>
              <div className="spacer" />
              <button className="btn btn-sm" onClick={() => setEditingId(null)}>Cancelar</button>
              <button className="btn btn-sm btn-save" onClick={saveEdit}>
                <Ic name="check" size={12} /> Salvar
              </button>
            </div>
          </div>
        ) : (
          <div key={r.id} className="card qr-row" style={{ padding: '10px 12px', position: 'relative' }}>
            <div onClick={() => setComposing(r.body)} style={{ cursor: 'pointer' }}>
              <div className="row" style={{ gap: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 'var(--type-sm)', flex: 1 }}>{r.title}</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--accent-700)', background: 'var(--accent-soft)', padding: '1px 6px', borderRadius: 4 }}>{r.shortcut}</span>
              </div>
              <div className="muted" style={{ fontSize: 'var(--type-xs)', marginTop: 4, lineHeight: 1.4 }}>{r.body}</div>
            </div>
            {inline && (
              <div className="row" style={{ gap: 2, marginTop: 6 }}>
                <div className="spacer" />
                <button className="btn btn-ghost btn-icon" style={{ width: 24, height: 24 }} onClick={(e) => { e.stopPropagation(); startEdit(r); }} title="Editar">
                  <Ic name="edit" size={12} />
                </button>
                <button className="btn btn-ghost btn-icon" style={{ width: 24, height: 24, color: '#dc2626' }} onClick={(e) => { e.stopPropagation(); deleteReply(r.id); }} title="Excluir">
                  <Ic name="trash" size={12} />
                </button>
              </div>
            )}
          </div>
        ))}
        {replies.length === 0 && (
          <div className="muted" style={{ fontSize: 'var(--type-sm)', padding: 14, textAlign: 'center', border: '1px dashed var(--border-strong)', borderRadius: 8 }}>
            Nenhuma resposta rápida · clique em + para adicionar
          </div>
        )}
      </div>
    </div>
  );
}

function TabTags({ conv, onManage, inline, onDataChanged }) {
  const [clientTags, setClientTags] = React.useState((conv.tags || []).map(t => t.nome));
  const [allTags, setAllTags] = React.useState([]); // [{id,name,color}]
  const [showPicker, setShowPicker] = React.useState(false);
  const [draftName, setDraftName] = React.useState('');
  const [draftColor, setDraftColor] = React.useState('#3b82f6');
  const [editingTag, setEditingTag] = React.useState(null);

  const loadTags = () => API.getTags().then((r) => setAllTags((r.tags || []).map(t => ({ id: t.id, name: t.nome, color: t.cor })))).catch(() => {});
  React.useEffect(() => { loadTags(); }, []);
  React.useEffect(() => { setClientTags((conv.tags || []).map(t => t.nome)); }, [conv.id]);
  const idOf = (name) => { const t = allTags.find(x => x.name === name); return t && t.id; };
  const notify = () => { if (onDataChanged) onDataChanged(); };

  const addToClient = async (name) => {
    if (clientTags.includes(name)) return;
    const tagId = idOf(name); if (!tagId) return;
    setClientTags(t => [...t, name]);
    try { await API.assignTag(conv.id, { tagId }); notify(); } catch (e) {}
  };
  const removeFromClient = async (name) => {
    const tagId = idOf(name);
    setClientTags(t => t.filter(x => x !== name));
    try { if (tagId) await API.removeTag(conv.id, tagId); notify(); } catch (e) {}
  };
  const createTag = async () => {
    const nome = draftName.trim(); if (!nome) return;
    try { await API.assignTag(conv.id, { nome, cor: draftColor }); await loadTags(); setClientTags(t => t.includes(nome) ? t : [...t, nome]); notify(); } catch (e) {}
    setDraftName(''); setDraftColor('#3b82f6');
  };
  const deleteTag = async (name) => {
    const tagId = idOf(name); if (!tagId) return;
    try { await API.deleteTag(tagId); await loadTags(); setClientTags(t => t.filter(x => x !== name)); notify(); } catch (e) {}
  };
  const saveEditTag = async () => {
    const { name: old, draft } = editingTag;
    const tagId = idOf(old);
    try { if (tagId) { await API.updateTag(tagId, draft.name || old, draft.color); await loadTags(); setClientTags(t => t.map(x => x === old ? (draft.name || old) : x)); notify(); } } catch (e) {}
    setEditingTag(null);
  };
  const handleAddClick = () => {
    if (inline) setShowPicker(s => !s);
    else onManage?.();
  };

  return (
    <div style={{ padding: '14px 16px' }}>
      <div className="row">
        <span style={{ fontSize: 'var(--type-xs)', fontWeight: 700, letterSpacing: '.06em', color: 'var(--text-faint)' }}>TAGS DO CLIENTE</span>
        <div className="spacer" />
        <button className="btn btn-sm btn-ghost" style={{ padding: '4px 8px' }} onClick={handleAddClick} title="Adicionar tag">
          <Ic name={showPicker ? 'x' : 'plus'} size={13} />
        </button>
      </div>

      {/* Client tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {clientTags.map(name => {
          const cfg = allTags.find(t => t.name === name) || { color: '#71717a' };
          return (
            <span key={name} style={{ padding: '4px 10px', borderRadius: 14, fontSize: 'var(--type-xs)', fontWeight: 600, color: 'white', background: cfg.color, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {name}
              {inline && (
                <Ic name="x" size={11} style={{ opacity: .85, cursor: 'pointer' }} onClick={() => removeFromClient(name)} />
              )}
            </span>
          );
        })}
        {clientTags.length === 0 && (
          <div className="muted" style={{ fontSize: 'var(--type-sm)', padding: 14, textAlign: 'center', border: '1px dashed var(--border-strong)', borderRadius: 8, width: '100%' }}>
            Nenhuma tag · clique em + para adicionar
          </div>
        )}
      </div>

      {/* Inline picker / manager */}
      {inline && showPicker && (
        <div style={{ marginTop: 14, padding: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10 }}>
          {/* Create new tag */}
          <div>
            <div style={{ fontSize: 'var(--type-xs)', fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '.06em', marginBottom: 6 }}>NOVA TAG</div>
            <div className="row" style={{ gap: 6 }}>
              <input className="input" placeholder="Nome da tag" value={draftName} onChange={e => setDraftName(e.target.value)} style={{ flex: 1, height: 30, fontSize: 'var(--type-sm)' }} />
              <input type="color" className="input" value={draftColor} onChange={e => setDraftColor(e.target.value)} style={{ width: 38, height: 30, padding: 2 }} />
              <button className="btn btn-sm btn-primary" disabled={!draftName.trim()} style={{ opacity: draftName.trim() ? 1 : .5 }} onClick={createTag}>
                <Ic name="plus" size={12} />
              </button>
            </div>
          </div>

          {/* Available tags */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 'var(--type-xs)', fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '.06em', marginBottom: 6 }}>DISPONÍVEIS · CLIQUE PARA ADICIONAR</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {allTags.map(t => {
                const isOn = clientTags.includes(t.name);
                const isEditing = editingTag?.name === t.name;
                if (isEditing) {
                  return (
                    <div key={t.name} className="row" style={{ gap: 4, padding: '3px 6px', background: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: 14 }}>
                      <input className="input" value={editingTag.draft.name} onChange={e => setEditingTag({ ...editingTag, draft: { ...editingTag.draft, name: e.target.value } })} style={{ height: 22, fontSize: 11, padding: '0 6px', width: 100 }} />
                      <input type="color" value={editingTag.draft.color} onChange={e => setEditingTag({ ...editingTag, draft: { ...editingTag.draft, color: e.target.value } })} style={{ width: 22, height: 22, padding: 0, border: 'none', cursor: 'pointer' }} />
                      <button className="btn btn-ghost btn-icon" style={{ width: 22, height: 22 }} onClick={saveEditTag} title="Salvar">
                        <Ic name="check" size={11} />
                      </button>
                      <button className="btn btn-ghost btn-icon" style={{ width: 22, height: 22 }} onClick={() => setEditingTag(null)} title="Cancelar">
                        <Ic name="x" size={11} />
                      </button>
                    </div>
                  );
                }
                return (
                  <span key={t.name} className="row" style={{ padding: '4px 10px', borderRadius: 14, fontSize: 'var(--type-xs)', fontWeight: 600, color: 'white', background: t.color, gap: 6, alignItems: 'center', opacity: isOn ? .6 : 1 }}>
                    <span onClick={() => !isOn && addToClient(t.name)} style={{ cursor: isOn ? 'default' : 'pointer' }}>
                      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: isOn ? 'rgba(255,255,255,.95)' : 'transparent', border: '1px solid rgba(255,255,255,.7)', marginRight: 4, verticalAlign: 'middle' }} />
                      {t.name}
                    </span>
                    <Ic name="edit" size={10} style={{ opacity: .75, cursor: 'pointer' }} onClick={() => setEditingTag({ name: t.name, draft: { name: t.name, color: t.color } })} title="Editar" />
                    <Ic name="trash" size={10} style={{ opacity: .75, cursor: 'pointer' }} onClick={() => deleteTag(t.name)} title="Excluir" />
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabMidias({ conv }) {
  const [sub, setSub] = React.useState('foto');
  const [midias, setMidias] = React.useState(null); // null = carregando
  React.useEffect(() => {
    let alive = true;
    if (!conv || !conv._db) { setMidias([]); return; }
    setMidias(null);
    API.getMidias(conv.id)
      .then((r) => { if (alive) setMidias((r.midias || []).map((m) => ({ ...m, _id: m.id, filename: m.titulo || 'arquivo', meta: [m.formato, m.tamanho ? fmtTamanho(m.tamanho) : null].filter(Boolean).join(' · '), time: fmtHora(m.criadoEm) }))); })
      .catch(() => { if (alive) setMidias([]); });
    return () => { alive = false; };
  }, [conv && conv.id]);

  const groups = { foto: [], video: [], documento: [] };
  (midias || []).forEach((m) => {
    if (m.tipo === 'imagem') groups.foto.push(m);
    else if (m.tipo === 'video') groups.video.push(m);
    else groups.documento.push(m); // arquivo, pdf, docx, xlsx...
  });
  const subs = [['documento', 'Documentos', 'file'], ['foto', 'Fotos', 'image'], ['video', 'Vídeos', 'video']];
  const items = groups[sub];
  return (
    <div>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 16px', gap: 18 }}>
        {subs.map(([id, l, ic]) =>
        <div key={id} onClick={() => setSub(id)} style={{ padding: '10px 0 8px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--type-sm)', fontWeight: sub === id ? 600 : 500, color: sub === id ? 'var(--text)' : 'var(--text-muted)', borderBottom: sub === id ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: -1, cursor: 'default' }}>
            <Ic name={ic} size={13} />{l} <span style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 600 }}>{groups[id].length}</span>
          </div>
        )}
      </div>
      <div style={{ padding: '14px 16px' }}>
        {midias === null ? <div className="muted" style={{ textAlign: 'center', padding: 14 }}>Carregando…</div> :
         items.length === 0 ? <div className="muted" style={{ textAlign: 'center', padding: 14 }}>Nenhum item nesta conversa.</div> :
         sub === 'foto' ?
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {items.map((m) =>
              <a key={m._id} href={m.midiaUrl} target="_blank" rel="noreferrer" style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', position: 'relative', background: 'var(--surface-2)', display: 'block' }}>
                <img src={m.midiaUrl} alt={m.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <span style={{ position: 'absolute', bottom: 6, left: 6, fontSize: 10, color: 'rgba(0,0,0,.6)', background: 'rgba(255,255,255,.7)', padding: '1px 5px', borderRadius: 3, fontWeight: 500 }}>{m.time}</span>
              </a>
            )}
          </div> :
         sub === 'video' ?
          <div className="col" style={{ gap: 8 }}>
            {items.map((m) =>
              <a key={m._id} href={m.midiaUrl} target="_blank" rel="noreferrer" className="row" style={{ gap: 10, padding: 10, background: 'var(--surface-2)', borderRadius: 8, color: 'inherit', textDecoration: 'none' }}>
                <div style={{ width: 54, height: 40, background: '#0a0a0a', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Ic name="play" size={14} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--type-sm)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.filename}</div>
                  <div className="muted" style={{ fontSize: 'var(--type-xs)' }}>{m.meta || m.time}</div>
                </div>
              </a>
            )}
          </div> :
          <div className="col" style={{ gap: 6 }}>
            {items.map((m) =>
              <a key={m._id} href={m.midiaUrl} target="_blank" rel="noreferrer" download className="row" style={{ gap: 10, padding: 10, border: '1px solid var(--border)', borderRadius: 8, color: 'inherit', textDecoration: 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--accent-soft)', color: 'var(--accent-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic name="file" size={15} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--type-sm)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.filename}</div>
                  <div className="muted" style={{ fontSize: 'var(--type-xs)' }}>{m.meta || m.time}</div>
                </div>
              </a>
            )}
          </div>
        }
      </div>
    </div>);

}

function TabHistorico() {
  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ fontSize: 'var(--type-xs)', fontWeight: 700, letterSpacing: '.06em', color: 'var(--text-faint)' }}>LINHA DO TEMPO</div>
      <div style={{ marginTop: 14, position: 'relative', paddingLeft: 24 }}>
        <div style={{ position: 'absolute', left: 9, top: 0, bottom: 0, width: 2, background: 'var(--border)' }} />
        {CLIENT_HISTORY.map((h, i) =>
        <div key={i} style={{ position: 'relative', paddingBottom: 14 }}>
            <div style={{ position: 'absolute', left: -21, top: 1, width: 20, height: 20, borderRadius: '50%', background: `color-mix(in oklab, ${h.color} 18%, var(--surface))`, color: h.color, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--surface)' }}>
              <Ic name={h.icon} size={11} />
            </div>
            <div style={{ fontSize: 'var(--type-sm)', fontWeight: 600 }}>{h.title}</div>
            <div className="muted" style={{ fontSize: 'var(--type-xs)', marginTop: 1 }}>{h.desc}</div>
            <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 3, fontWeight: 500 }}>{h.when}</div>
          </div>
        )}
      </div>
    </div>);

}

function NewQuickReplyModal({ onClose }) {
  return (
    <Modal title="Nova resposta rápida" onClose={onClose} footer={(close) => <><button className="btn" onClick={() => close()}>Cancelar</button><button className="btn btn-save" onClick={() => close()}>Salvar</button></>}>
      <div className="col" style={{ gap: 10 }}>
        <div><label className="label">Atalho</label><input className="input" placeholder="/atalho" /></div>
        <div><label className="label">Título</label><input className="input" placeholder="Ex: Saudação inicial" /></div>
        <div><label className="label">Conteúdo</label><textarea className="input" rows={4} placeholder="Texto que será enviado..." /></div>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
          <div style={{ fontSize: 'var(--type-xs)', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Existentes</div>
          <div className="col" style={{ gap: 4, marginTop: 8 }}>
            {QUICK_REPLIES.map((r) =>
            <div key={r.id} className="row" style={{ padding: '6px 10px', background: 'var(--surface-2)', borderRadius: 6, gap: 8, fontSize: 'var(--type-sm)' }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--accent-700)', minWidth: 80 }}>{r.shortcut}</span>
                <span style={{ flex: 1 }}>{r.title}</span>
                <span className="btn btn-ghost btn-icon" style={{ padding: 3 }}><Ic name="trash" size={12} /></span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>);

}

function TagsManagerModal({ onClose }) {
  return (
    <Modal title="Gerenciar tags" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Fechar</button></>}>
      <div className="col" style={{ gap: 14 }}>
        <div>
          <label className="label">Nova tag</label>
          <div className="row" style={{ gap: 6 }}>
            <input className="input" placeholder="Nome da tag" style={{ flex: 1 }} />
            <input type="color" className="input" defaultValue="#3b82f6" style={{ width: 46, padding: 2 }} />
            <button className="btn btn-primary"><Ic name="plus" size={13} /></button>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 'var(--type-xs)', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Disponíveis · clique para adicionar</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ALL_TAGS.map((t) => {
              const isOn = CLIENT_TAGS.includes(t.name);
              return (
                <span key={t.name} style={{ padding: '5px 10px', borderRadius: 14, fontSize: 'var(--type-xs)', fontWeight: 600, color: 'white', background: t.color, display: 'inline-flex', alignItems: 'center', gap: 6, opacity: isOn ? .5 : 1, cursor: 'default' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: isOn ? 'rgba(255,255,255,.85)' : 'transparent', border: '1px solid rgba(255,255,255,.7)' }} />
                  {t.name}
                  <Ic name="trash" size={10} style={{ opacity: .65 }} />
                </span>);

            })}
          </div>
        </div>
      </div>
    </Modal>);

}

function AIPanel({ conv, setComposing, inline, onAppointmentRequest, onDataChanged }) {
  const { tweaks } = useStore();
  const currentUser = tweaks.profile === 'super'
    ? 'Magno Vieira'
    : tweaks.profile === 'atendente'
      ? 'Karla Zambelly'
      : 'Paulo Henrique';
  const [tab, setTab] = React.useState('ia');
  const [showQR, setShowQR] = React.useState(false);
  const [showTags, setShowTags] = React.useState(false);
  const [showUpload, setShowUpload] = React.useState(false);
  const [showCard, setShowCard] = React.useState(false);

  const leadCard = {
    name: conv.client,
    company: conv.tag === 'PROSPECT' ? 'Lead — primeira conversa' : conv.tag === 'CLIENTE' ? 'Cliente ativo' : conv.tag || '—',
    email: conv.email || `${conv.client.split(' ')[0].toLowerCase()}@email.com`,
    phone: conv.phone || '+55 (85) 9 9840-4185',
    value: 28000,
    tags: [
    { label: 'VIP', color: '#F59E0B' },
    { label: 'Demonstração agendada', color: '#0EA5E9' }]

  };

  return (
    <div style={{ borderLeft: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <FunnelBar />
      <AvatarHero conv={conv} onUpload={() => setShowUpload(true)} onAddCard={() => setShowCard(true)} />
      <ActionButtons conv={conv} currentUser={currentUser} inline={inline} onAppointmentRequest={onAppointmentRequest} />
      <TabBar active={tab} onChange={setTab} />
      <div className="scroll" style={{ flex: 1, overflow: 'auto' }}>
        {tab === 'ia' && <TabIA conv={conv} setComposing={setComposing} />}
        {tab === 'ficha' && <TabFicha conv={conv} />}
        {tab === 'respostas' && <TabRespostas setComposing={setComposing} onNew={() => setShowQR(true)} inline={inline} />}
        {tab === 'tags' && <TabTags conv={conv} onManage={() => setShowTags(true)} inline={inline} onDataChanged={onDataChanged} />}
        {tab === 'midias' && <TabMidias conv={conv} />}
        {tab === 'historico' && <TabHistorico />}
      </div>
      {showQR && !inline && <NewQuickReplyModal onClose={() => setShowQR(false)} />}
      {showTags && !inline && <TagsManagerModal onClose={() => setShowTags(false)} />}
      {showCard && <CRMCardDetail card={leadCard} onClose={() => setShowCard(false)} />}
      {showUpload && !inline &&
      <Modal title="Foto do cliente" onClose={() => setShowUpload(false)} footer={(close) => <><button className="btn" onClick={() => close()}>Cancelar</button><button className="btn btn-save" onClick={() => close()}>Salvar</button></>}>
          <div className="col" style={{ gap: 14, alignItems: 'center', textAlign: 'center', padding: '14px 0' }}>
            <div style={{ width: 120, height: 120, borderRadius: '50%', background: colorFor(conv.client), color: 'white', fontWeight: 700, fontSize: 42, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initials(conv.client)}</div>
            <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>Arraste uma imagem ou escolha do dispositivo</div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn"><Ic name="upload" size={14} /> Carregar arquivo</button>
              <button className="btn"><Ic name="camera" size={14} /> Webcam</button>
            </div>
          </div>
        </Modal>
      }
    </div>);

}

// Queue — moved to queue.jsx
// function Queue() removed; new implementation lives in queue.jsx

// Notifications
function Notifs() {
  const map = { queue: ['inbox', 'var(--accent)'], urgent: ['flag', '#ef4444'], transfer: ['users', 'var(--hue-blue)'], schedule: ['agenda', 'var(--hue-violet)'] };
  return (
    <Page title="Notificações" subtitle="Alertas em tempo real">
      <div className="card">
        {NOTIFICATIONS.map((n) => {
          const [ic, col] = map[n.kind] || ['bell', 'var(--text-muted)'];
          return (
            <div key={n.id} className="row" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', gap: 12, background: n.read ? 'transparent' : 'var(--accent-soft)' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `color-mix(in oklab, ${col} 15%, var(--surface))`, color: col, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic name={ic} size={16} /></div>
              <div style={{ flex: 1 }}><div style={{ fontWeight: n.read ? 500 : 600, fontSize: 'var(--type-sm)' }}>{n.text}</div><div className="muted" style={{ fontSize: 'var(--type-xs)' }}>{n.time}</div></div>
              {!n.read && <span className="dot dot-online" style={{ boxShadow: 'none' }} />}
            </div>);

        })}
      </div>
    </Page>);

}

// Client profile
function ClientProfile() {
  const c = CONVERSATIONS[0];
  const { back } = useStore();
  return (
    <Page title="Perfil do cliente" actions={<button className="btn" onClick={back}><Ic name="chevron-left" size={14} /> Voltar</button>}>
      <div className="card card-pad row" style={{ gap: 18, alignItems: 'flex-start' }}>
        <Avatar name={c.client} size="xl" online />
        <div style={{ flex: 1 }}>
          <div className="h2">{c.client}</div>
          <div className="muted">PROSPECT · primeiro contato em 02/12/2025</div>
          <div className="row" style={{ gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <span className="chip chip-accent">VIP</span>
            <span className="chip">interessada em pacote noiva</span>
            <span className="chip">indicada por @lucinhabh</span>
            <span className="chip" style={{ cursor: 'default' }}><Ic name="plus" size={11} /> tag</span>
          </div>
        </div>
        <div className="col" style={{ gap: 6 }}>
          <button className="btn btn-primary"><Ic name="inbox" size={14} /> Abrir conversa</button>
          <button className="btn"><Ic name="agenda" size={14} /> Agendar</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--pad-3)' }}>
        <div className="card card-pad">
          <div className="h3">Conversas anteriores</div>
          <div className="col" style={{ marginTop: 10, gap: 6 }}>
            {[['02/12/2025', 'agente', 'Resolvida'], ['18/01/2026', 'Karla Z.', 'Resolvida'], ['16/01/2026', 'agente', 'Em andamento']].map(([d, a, s], i) =>
            <div key={i} className="row" style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, gap: 10, fontSize: 'var(--type-sm)' }}>
                <Ic name="inbox" size={14} style={{ color: 'var(--text-faint)' }} />
                <span style={{ flex: 1 }}>Atendimento {d}</span>
                <span className="muted">{a}</span>
                <span className={`badge ${s === 'Resolvida' ? 'badge-success' : 'badge-info'}`}>{s}</span>
              </div>
            )}
          </div>
        </div>
        <div className="card card-pad">
          <div className="h3">Observações</div>
          <textarea className="input" placeholder="Adicione uma observação..." rows={3} style={{ marginTop: 10 }} />
          <div className="col" style={{ gap: 8, marginTop: 10 }}>
            {[['Karla Z.', '22/01', 'Cliente prefere atendimento aos sábados de manhã.'], ['Magno V.', '15/01', 'Indicada pela Lucinha. Já comprou o pacote noiva da irmã em 2024.']].map(([a, d, t], i) =>
            <div key={i} style={{ padding: 10, background: 'var(--surface-2)', borderRadius: 8 }}>
                <div className="row" style={{ fontSize: 'var(--type-xs)', color: 'var(--text-faint)' }}><span style={{ fontWeight: 600 }}>{a}</span><div className="spacer" /><span>{d}</span></div>
                <div style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>{t}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Page>);

}

Object.assign(window, { Inbox, Notifs, ClientProfile, EmojiPicker, AttachPicker, ContactPickerModal, VoiceRecorder, AIPanel });