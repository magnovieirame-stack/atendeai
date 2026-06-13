// inbox.jsx — Atendente: tela principal de atendimento, fila, perfil cliente, notificações

const AWAY_REASONS = [
{ id: 'lunch', label: 'Pausa para almoço', icon: 'cart', color: '#f59e0b', desc: 'Retorno em 1h', min: 60 },
{ id: 'rest', label: 'Pausa para descanso', icon: 'pause', color: '#0ea5e9', desc: 'Retorno em 15 min', min: 15 },
{ id: 'emergency', label: 'Pausa de emergência', icon: 'flag', color: '#dc2626', desc: 'Retorno breve', min: 5 },
{ id: 'shift', label: 'Encerrar expediente', icon: 'logout', color: '#64748b', desc: 'Volto amanhã', min: 0 }]; // min:0 = sem regressiva


function fmtElapsed(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor(s % 3600 / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
// Contagem REGRESSIVA ("resta"): MM:SS (com HH só se passar de 1h).
function fmtCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
  const p = (n) => String(n).padStart(2, '0');
  return (h > 0 ? p(h) + ':' : '') + p(m) + ':' + p(sec);
}
// Quanto ESTOUROU do tempo previsto, em texto amigável de minutos.
function fmtOver(ms) {
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 1) return 'menos de 1 min';
  if (totalMin < 60) return totalMin + ' min';
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  return h + 'h' + (m ? ' ' + m + ' min' : '');
}

function AwayModal({ onConfirm, onClose }) {
  const [reason, setReason] = React.useState(null);
  const [note, setNote] = React.useState('');
  const submit = () => {
    if (!reason) return;
    onConfirm({ reason: reason.id, label: reason.label, color: reason.color, note, since: Date.now(), min: reason.min });
  };
  return (
    <Modal title="Definir como indisponível" onClose={onClose} size="md" footer={
    <>
        <button className="btn fin-btn-back" onClick={onClose}>Voltar</button>
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
  const elapsed = now - away.since;                 // ms desde o início da pausa
  const totalMs = (away.min || 0) * 60000;          // tempo previsto (0 = sem regressiva)
  const temContagem = totalMs > 0;
  const restante = totalMs - elapsed;
  const estourou = temContagem && restante <= 0;
  // Dentro do tempo: regressiva ("resta MM:SS"). Estourou: "passou X min da pausa" (vermelho).
  // Sem tempo previsto (ex.: encerrar expediente): conta pra cima como antes.
  const texto = !temContagem ? fmtElapsed(elapsed)
    : !estourou ? 'resta ' + fmtCountdown(restante)
    : 'passou ' + fmtOver(-restante) + ' da pausa';
  const cor = estourou ? '#dc2626' : away.color;
  return (
    <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: `color-mix(in oklab, ${cor} 8%, var(--surface))`, display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: cor, animation: 'pulse 1.6s ease-in-out infinite', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: cor }}>{away.label}</div>
        {away.note && <div className="muted" style={{ fontSize: 'var(--type-xs)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{away.note}</div>}
      </div>
      <span className="tnum" style={{ fontSize: 'var(--type-sm)', fontWeight: 600, color: cor, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{texto}</span>
      <button className="btn btn-sm fin-btn-back" onClick={onResume} style={{ borderColor: cor, color: cor }}>Voltar</button>
    </div>);

}

function FilterPopover({ filter, tags, phases, atendentes, departamentos, podeVerAtendentes, selectedTags, selectedPhases, selectedAtendentes = [], selectedDepartamentos = [], onToggleTag, onTogglePhase, onToggleAtendente, onToggleDepartamento, onClear, onClose }) {
  // abas: TAGS, FUNIL e (só p/ Admin de Loja / responsável de depto) ATENDENTE + DEPTO
  const TABS = [['tags', 'TAGS'], ['phases', 'FUNIL']];
  if (podeVerAtendentes) { TABS.push(['atendentes', 'ATENDENTE']); TABS.push(['departamentos', 'DEPTO']); }
  const [tab, setTab] = React.useState('tags');
  const ref = React.useRef(null);
  React.useEffect(() => {
    const onDoc = (e) => {if (ref.current && !ref.current.contains(e.target)) onClose();};
    const t = setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    return () => {clearTimeout(t);document.removeEventListener('mousedown', onDoc);};
  }, [onClose]);
  const filterName = { alert: 'Alertas', ai: 'IA', active: 'Ativas', pending: 'Pendentes', closed: 'Encerradas' }[filter] || 'todas';
  const totalSel = selectedTags.length + selectedPhases.length + selectedAtendentes.length + selectedDepartamentos.length;
  const cols = TABS.length;
  const tabIdx = Math.max(0, TABS.findIndex((t) => t[0] === tab));
  return (
    <div ref={ref} style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: cols >= 4 ? 320 : 260, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 10px 32px rgba(0,0,0,.18)', zIndex: 60, animation: 'popIn .18s ease', overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px 0' }}>
        <div className="muted" style={{ fontSize: 'var(--type-xs)' }}>Filtrando aba <strong style={{ color: 'var(--text)' }}>{filterName}</strong></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, borderBottom: '1px solid var(--border)', marginTop: 8, position: 'relative' }}>
        {TABS.map(([id, l]) =>
        <div key={id} onClick={() => setTab(id)} style={{ padding: '10px 0', textAlign: 'center', fontSize: 'var(--type-xs)', fontWeight: 700, letterSpacing: '.06em', color: tab === id ? 'var(--text)' : 'var(--text-muted)', cursor: 'default', transition: 'color .15s' }}>{l}</div>
        )}
        <div style={{ position: 'absolute', bottom: -1, height: 2, width: `${100 / cols}%`, left: `${(tabIdx * 100) / cols}%`, background: 'var(--accent)', transition: 'left .25s cubic-bezier(.5,1.4,.4,1)' }} />
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
        {tab === 'atendentes' && ((atendentes || []).length === 0 ? <div className="muted" style={{ padding: 16, fontSize: 'var(--type-sm)', textAlign: 'center' }}>Nenhum atendente</div> :
        atendentes.map((a) => {
          const on = selectedAtendentes.includes(a.id);
          return (
            <div key={a.id} className="filter-row" onClick={() => onToggleAtendente(a.id)}>
              <span className="cb" data-on={on}>{on && <Ic name="check" size={12} />}</span>
              <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--surface-3)', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ic name="user" size={10} /></span>
              <span style={{ flex: 1, fontSize: 'var(--type-sm)', fontWeight: on ? 600 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nome}</span>
            </div>);

        }))
        }
        {tab === 'departamentos' && ((departamentos || []).length === 0 ? <div className="muted" style={{ padding: 16, fontSize: 'var(--type-sm)', textAlign: 'center' }}>Nenhum departamento</div> :
        departamentos.map((d) => {
          const on = selectedDepartamentos.includes(d.id);
          const liberado = d.podeFiltrar; // responsável só filtra os que lidera; admin filtra todos
          return (
            <div key={d.id} className="filter-row" data-off={liberado ? undefined : 'true'} onClick={() => liberado && onToggleDepartamento(d.id)} title={liberado ? '' : 'Você não é responsável por este departamento'} style={{ opacity: liberado ? 1 : 0.5, cursor: liberado ? 'default' : 'not-allowed' }}>
              <span className="cb" data-on={on}>{on && <Ic name="check" size={12} />}</span>
              <span style={{ width: 16, height: 16, borderRadius: 4, background: 'var(--surface-3)', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ic name="folder" size={10} /></span>
              <span style={{ flex: 1, fontSize: 'var(--type-sm)', fontWeight: on ? 600 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome}</span>
              {!liberado && <Ic name="lock" size={12} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />}
            </div>);

        }))
        }
      </div>
      {totalSel > 0 &&
      <div style={{ borderTop: '1px solid var(--border)', padding: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)' }}>
          <span className="muted" style={{ fontSize: 'var(--type-xs)' }}>{totalSel} filtro{totalSel > 1 ? 's' : ''} ativo{totalSel > 1 ? 's' : ''}</span>
          <button className="btn btn-sm btn-ghost" onClick={onClear} style={{ color: 'var(--accent-700)' }}>Limpar</button>
        </div>
      }
    </div>);

}

function InboxHeader({ available, away, onSetAway, onResume, onConfig, podeConfig }) {
  return (
    <div style={{ padding: '10px 14px 12px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', height: "80px" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #0EFF9B 0%, #C0FF33 100%)', color: '#0a3a1f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 6px rgba(14,255,155,.25)' }}>
          <Ic name="inbox" size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0, fontWeight: 600, letterSpacing: '-0.01em', fontSize: "18px" }}>The List Bate Papo</div>
        <button onClick={() => available ? onSetAway() : onResume()} className={`switch ${available ? 'on' : 'off'}`} title={available ? 'Disponível para receber novas conversas' : `Indisponível: ${away?.label || ''}`}>
          <span className="switch-track">
            <span className="switch-text switch-on">ON</span>
            <span className="switch-text switch-off">OFF</span>
            <span className="switch-knob" />
          </span>
        </button>
        {/* botão de Configurações do chatbot — só Admin de Loja / quem tem a permissão */}
        {podeConfig && <button onClick={onConfig} title="Configurações do chatbot" style={{ height: 32, width: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'default', flexShrink: 0, transition: 'background .15s, border-color .15s, color .15s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
          <Ic name="settings" size={15} />
        </button>}
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

  const wrapRef = React.useRef(null);
  const refs = React.useRef([]);          // células (clique)
  const contentRefs = React.useRef([]);   // conteúdo (a "fonte") — referência da pílula
  const [pos, setPos] = React.useState({ left: 0, width: 0 });
  const idx = items.findIndex((it) => it[0] === filter);
  React.useLayoutEffect(() => {
    const wrap = wrapRef.current, content = contentRefs.current[idx];
    if (!wrap || !content) return;
    const wr = wrap.getBoundingClientRect(), cr = content.getBoundingClientRect();
    // pílula = largura do CONTEÚDO (a fonte) + 8px de margem em cada lado.
    setPos({ left: cr.left - wr.left - 8, width: cr.width + 16 });
  }, [idx, filter, counts.alert, counts.ai, counts.pending]);
  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0, marginTop: 8, padding: 4, background: 'var(--surface-2)', borderRadius: 8 }}>
      <div style={{ position: 'absolute', top: 4, bottom: 4, left: pos.left, width: pos.width, background: '#E7F4E9', borderRadius: 6, transition: 'left .32s cubic-bezier(.5,1.4,.4,1), width .32s cubic-bezier(.5,1.4,.4,1)', boxShadow: '0 1px 2px rgba(15,23,42,.08)', pointerEvents: 'none' }} />
      {items.map(([id, label, icon, badge, title], i) => {
        const on = filter === id;
        return (
          <div key={id} ref={(el) => refs.current[i] = el} title={title} onClick={() => setFilter(id)} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px 10px', borderRadius: 6, fontSize: 'var(--type-xs)', fontWeight: 600, cursor: 'default', color: on ? 'var(--accent-700)' : 'var(--text-muted)', transition: 'color .2s ease', zIndex: 1, whiteSpace: 'nowrap' }}>
            <span ref={(el) => contentRefs.current[i] = el} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              {icon && <Ic name={icon} size={14} style={{ color: id === 'alert' ? '#dc2626' : 'var(--ai)' }} />}
              {label}
              {badge ? <span style={{ background: id === 'alert' ? '#dc2626' : id === 'ai' ? 'var(--ai)' : 'var(--accent)', color: 'white', borderRadius: 999, padding: '0 5px', fontSize: 9, lineHeight: '14px', fontWeight: 700, minWidth: 14, textAlign: 'center' }}>{badge}</span> : null}
            </span>
          </div>);

      })}
    </div>);

}

// ── Skeletons (esqueleto de carregamento) — mesmas medidas/estrutura do conteúdo real ──
// Linha de conversa (espelha ConvRow: avatar + nome + prévia + hora)
function ConvRowSkeleton() {
  return (
    <div style={{ padding: '10px 12px 10px 9px', borderLeft: '3px solid transparent', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <Skeleton circle w={40} h={40} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row" style={{ gap: 6 }}>
          <Skeleton w="55%" h={13} style={{ flex: 1 }} />
          <Skeleton w={28} h={11} />
        </div>
        <div className="row" style={{ gap: 4, marginTop: 6 }}>
          <Skeleton w="80%" h={11} style={{ flex: 1 }} />
        </div>
        <div className="row" style={{ marginTop: 8, gap: 4 }}>
          <Skeleton w={48} h={14} r={999} /><Skeleton w={40} h={14} r={999} />
        </div>
      </div>
    </div>);
}
function ConvListSkeleton({ count }) {
  return <>{Array.from({ length: count }).map((_, i) => <ConvRowSkeleton key={i} />)}</>;
}
// Linha de contato (espelha ContactRow: avatar + nome + telefone)
function ContactRowSkeleton() {
  return (
    <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center' }}>
      <Skeleton circle w={40} h={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Skeleton w="50%" h={13} />
        <Skeleton w="35%" h={11} style={{ marginTop: 5 }} />
      </div>
      <Skeleton circle w={32} h={32} />
    </div>);
}
function ContactListSkeleton({ count }) {
  return <>{Array.from({ length: count }).map((_, i) => <ContactRowSkeleton key={i} />)}</>;
}
// Balões de chat (espelha o container das mensagens: alterna lado, larguras variadas)
function ChatSkeleton({ count = 6 }) {
  const rows = [['client', '52%'], ['agent', '38%'], ['client', '64%'], ['agent', '70%'], ['client', '44%'], ['agent', '56%'], ['client', '60%'], ['agent', '48%']];
  return (<>
    {rows.slice(0, count).map(([side, w], i) => {
      const isClient = side === 'client';
      return (
        <div key={i} style={{ display: 'flex', flexDirection: isClient ? 'row' : 'row-reverse', gap: 8, alignItems: 'flex-end' }}>
          <Skeleton circle w={28} h={28} />
          <div style={{ maxWidth: '70%' }}>
            <Skeleton w={w} h={38} r={14} style={{ minWidth: 90 }} />
            <Skeleton w={40} h={9} style={{ marginTop: 4, marginLeft: isClient ? 0 : 'auto' }} />
          </div>
        </div>);
    })}
  </>);
}
// Ficha do cliente (espelha TabFicha: título + linhas label/valor)
function FichaSkeleton() {
  return (
    <div style={{ padding: '14px 16px' }}>
      <div className="row"><Skeleton w={110} h={12} /></div>
      <div style={{ marginTop: 8 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
            <Skeleton w={60} h={10} />
            <Skeleton w={`${50 + (i * 7) % 40}%`} h={13} />
          </div>
        ))}
      </div>
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
        .then((r) => { const l = (r.clientes || []).map((c) => ({ id: c.id, name: c.nome, phone: c.telefone, foto: c.foto })); setList(l); if (l.length) skelRemember('inbox-contatos', l.length); })
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
      <div style={{ padding: '12px 12px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(calc(-50% + 2px))', color: 'var(--text-faint)' }}><Ic name="search" size={14} /></span>
          <input
            className="input"
            autoFocus
            placeholder="Pesquisar nome ou número…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ paddingLeft: 30, height: 38, borderRadius: 999, fontSize: 'var(--type-sm)' }} />

          {q && <button onClick={() => setQ('')} className="btn btn-ghost btn-icon" style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28 }}><Ic name="x" size={14} /></button>}
        </div>
        <FabNovo size="sm" iconOnly label="Nova conversa" onClick={() => setShowNew(true)} title="Iniciar nova conversa" />
      </div>
      {/* List */}
      <div className="scroll" style={{ flex: 1, overflow: 'auto' }}>
        {loading && list.length === 0 ?
        <ContactListSkeleton count={skelCount('inbox-contatos', 6)} /> :
        list.length === 0 ?
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div className="muted" style={{ fontSize: 13 }}>{q ? `Nenhum cliente encontrado para "${q}"` : 'Nenhum cliente cadastrado.'}</div>
            <button onClick={() => setShowNew(true)} className="btn btn-sm" style={{ marginTop: 12 }}><Ic name="chat-plus" size={14} /> Nova conversa</button>
          </div> :
        list.map((c) =>
        <ContactRow key={c.id} c={c} onStart={() => onStartConv(c)} />
        )}
      </div>
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
      
      <Avatar name={c.name} src={c.foto} style={{ width: 40, height: 40, fontSize: 14 }} />
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

// Sessão do inbox (vive enquanto logado; some no logout via window.__resetInboxSession).
// 1ª visita ao chatbot na sessão -> nenhuma conversa (tela orientativa). Depois guarda a
// última aberta pra restaurar ao navegar e voltar.
let _inboxSession = { visited: false, lastConvId: null };
if (typeof window !== 'undefined') window.__resetInboxSession = () => { _inboxSession = { visited: false, lastConvId: null }; };

function Inbox() {
  const { tweaks, routeParam, route, auth, can } = useStore();
  // 1ª visita = null (tela orientativa); retorno na mesma sessão = restaura a última.
  const [selectedId, setSelectedId] = React.useState(() => (_inboxSession.visited ? (_inboxSession.lastConvId || null) : null));
  React.useEffect(() => { _inboxSession.visited = true; }, []);
  React.useEffect(() => { _inboxSession.lastConvId = selectedId; }, [selectedId]);
  const [showContacts, setShowContacts] = React.useState(false);
  const [showConfig, setShowConfig] = React.useState(false);
  // só Admin de Loja (ou quem tem a permissão de gerenciar atendimento) vê as Configurações.
  const podeConfig = auth.papel === 'admin_loja' || (can && can('atendimento.gerenciar'));
  const [extraConvs, setExtraConvs] = React.useState([]);
  // Conversas reais (API) com CACHE de tela: voltar ao inbox é INSTANTÂNEO e o polling
  // revalida em segundo plano. As mutações abaixo seguem usando setDbConvs (agora escreve no
  // cache) e refetchContatos (agora = reload do cache) — render, polling e filhos ficam IGUAIS.
  const { data: _convData, setData: setDbConvs, reload: refetchContatos, error: _convErr } =
    useCachedQuery(['inbox-convs'], async () => {
      const r = await API.getContatos();
      return (r.contatos || []).map(dbContatoToConv);
    }, { empresaId: auth.empresaId });
  const convError = _convErr || '';
  const dbConvs = convError ? (_convData || []) : _convData; // erro -> lista vazia (igual antes); senão null = carregando
  // Atualização automática: re-busca a lista de conversas a cada 6s (mensagens
  // novas chegam pelo webhook no Supabase; sem realtime, fazemos polling leve).
  // Pausa quando a aba não está visível pra economizar.
  React.useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') refetchContatos();
    }, 6000);
    return () => clearInterval(id);
  }, [refetchContatos]);
  // lembra a qtd de conversas pra o skeleton mostrar o nº real
  React.useEffect(() => { if (Array.isArray(dbConvs) && dbConvs.length) skelRemember('inbox-convs', dbConvs.length); }, [dbConvs]);
  // Ações do menu de cada conversa (atualiza local na hora + persiste no back).
  const fixarConv = (id, fixar) => {
    setDbConvs((cs) => (cs || []).map((x) => x.id === id ? { ...x, fixado: fixar } : x));
    API.fixarContato(id, fixar)
      .then(() => window.showToast({ tipo: 'sucesso', titulo: fixar ? 'Conversa fixada' : 'Conversa desafixada' }))
      .catch(() => window.showToast({ tipo: 'erro', titulo: 'Erro ao atualizar', descricao: 'Não foi possível fixar a conversa.' }));
  };
  const bloquearConv = (id, bloquear) => {
    setDbConvs((cs) => (cs || []).map((x) => x.id === id ? { ...x, blocked: bloquear } : x));
    API.bloquearContato(id, bloquear)
      .then(() => window.showToast({ tipo: 'sucesso', titulo: bloquear ? 'Conversa bloqueada' : 'Conversa desbloqueada' }))
      .catch(() => window.showToast({ tipo: 'erro', titulo: 'Erro ao atualizar', descricao: 'Não foi possível bloquear a conversa.' }));
  };
  const limparConv = (id) => {
    setDbConvs((cs) => (cs || []).map((x) => x.id === id ? { ...x, preview: '', midiaTipo: null, sentByMe: false, messages: null } : x));
    API.limparContato(id)
      .then(() => window.showToast({ tipo: 'sucesso', titulo: 'Conversa limpa' }))
      .catch(() => window.showToast({ tipo: 'erro', titulo: 'Erro ao limpar', descricao: 'Não foi possível limpar a conversa.' }));
  };
  const apagarConv = (id) => {
    setDbConvs((cs) => (cs || []).filter((x) => x.id !== id));
    setSelectedId((sid) => sid === id ? null : sid);
    API.apagarContato(id)
      .then(() => window.showToast({ tipo: 'sucesso', titulo: 'Conversa apagada' }))
      .catch(() => window.showToast({ tipo: 'erro', titulo: 'Erro ao apagar', descricao: 'Não foi possível apagar a conversa.' }));
  };
  // FECHAR = apenas FECHA a conversa aberta (cai na tela orientativa). O cartão CONTINUA
  // na lista; não encerra, não apaga, não chama o backend.
  const fecharConv = (id) => { setSelectedId((sid) => sid === id ? null : sid); };
  // Abrir uma conversa = LER: zera o badge verde de não-lidas na hora (otimista).
  // O backend zera de fato ao buscar as mensagens (GET .../mensagens); o poll mantém em 0.
  const marcarLida = (id) => setDbConvs((cs) => (cs || []).map((x) => (x.id === id && x.unread) ? { ...x, unread: 0 } : x));
  // Ao enviar qualquer mensagem: atualiza hora e joga a conversa pro topo na hora
  // (a ordenação fixados-primeiro mantém as fixadas acima). Depois sincroniza com o back.
  const onConvSent = (id) => {
    setDbConvs((cs) => {
      if (!cs) return cs;
      const i = cs.findIndex((x) => x.id === id);
      if (i < 0) return cs;
      const d = new Date();
      const hora = String(d.getHours()).padStart(2, '0') + 'h' + String(d.getMinutes()).padStart(2, '0');
      const moved = { ...cs[i], lastTime: hora };
      return [moved, ...cs.filter((x) => x.id !== id)];
    });
    refetchContatos();
  };
  // todas as tags da empresa (para o filtro), independente de estarem ou não em uma conversa
  const [tagList, setTagList] = React.useState([]);
  React.useEffect(() => { API.getTags().then((r) => setTagList((r.tags || []).map((t) => t.nome))).catch(() => {}); }, []);
  // funis REAIS da empresa (para o filtro por fase/coluna) — cada funil traz suas colunas com id.
  const [funis, setFunis] = React.useState([]);
  React.useEffect(() => { API.getFunis().then((r) => setFunis(r.funis || [])).catch(() => {}); }, []);
  // atendentes da empresa (aba "Atendente" do filtro) — só Admin de Loja / responsável de depto.
  const podeVerAtendentes = auth.papel === 'admin_loja' || !!auth.ehResponsavel;
  const [atendentesList, setAtendentesList] = React.useState([]);
  React.useEffect(() => { if (!podeVerAtendentes) return; API.getAtendentesFiltro().then((r) => setAtendentesList(r.atendentes || [])).catch(() => {}); }, [podeVerAtendentes]);
  // departamentos (aba "Departamento" do filtro) — vêm com flag podeFiltrar (admin=todos / responsável=os dele).
  const [departamentosList, setDepartamentosList] = React.useState([]);
  React.useEffect(() => { if (!podeVerAtendentes) return; API.getDepartamentosFiltro().then((r) => setDepartamentosList(r.departamentos || [])).catch(() => {}); }, [podeVerAtendentes]);
  // (Sem auto-seleção: na 1ª visita mostramos a tela orientativa; nas demais, restauramos
  // a última conversa pela sessão acima — nunca caímos numa conversa que o usuário não escolheu.)
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
      if (contato) { await refetchContatos(); setSelectedId(contato.id); window.showToast({ tipo: 'sucesso', titulo: 'Conversa iniciada' }); }
    } catch (e) { window.showToast({ tipo: 'erro', titulo: 'Erro ao iniciar conversa', descricao: e.message || 'Não foi possível iniciar a conversa.' }); }
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

  const [filter, setFilter] = React.useState('active'); // abre em Ativas (em atendimento)
  const [showAI, setShowAI] = React.useState(true); // coluna 3 nasce VISÍVEL
  // Abrir/fechar = animar a LARGURA das colunas: a do meio (2) e a 3 se movem JUNTAS
  // (transition no grid-template-columns). Nada de slide separado que dessincroniza.
  const toggleAI = () => setShowAI((s) => !s);
  const [composing, setComposing] = React.useState('');
  const [available, setAvailable] = React.useState(true);
  const [away, setAway] = React.useState(null);
  const [showAwayModal, setShowAwayModal] = React.useState(false);
  // Presença persiste no backend (sobrevive ao F5 e tira do pool/transferências).
  React.useEffect(() => {
    API.getPresenca().then((r) => {
      const p = r && r.presenca;
      if (p && p.status === 'pausa') {
        const rz = AWAY_REASONS.find((x) => x.id === p.motivo); // recupera a duração (min) pelo motivo
        setAvailable(false);
        setAway({ reason: p.motivo, label: p.motivo_label || (rz && rz.label) || 'Em pausa', color: p.cor || (rz && rz.color) || '#64748b', note: p.nota || '', since: p.desde ? Date.parse(p.desde) : Date.now(), min: rz ? rz.min : 0 });
      }
    }).catch(() => {});
  }, []);
  const resumir = () => {
    API.setPresenca({ status: 'disponivel' }).catch(() => {});
    setAvailable(true); setAway(null);
    window.showToast({ tipo: 'sucesso', titulo: 'Você está disponível' });
  };
  const pausar = (a) => {
    setShowAwayModal(false);
    setAvailable(false); setAway(a);
    API.setPresenca({ status: 'pausa', motivo: a.reason, motivoLabel: a.label, cor: a.color, nota: a.note })
      .then((r) => { const p = r && r.presenca; if (p && p.desde) setAway((prev) => ({ ...(prev || a), since: Date.parse(p.desde) })); })
      .catch(() => {});
    window.showToast({ tipo: 'info', titulo: 'Você está ausente' });
  };
  const [selectedTags, setSelectedTags] = React.useState([]);
  const [selectedPhases, setSelectedPhases] = React.useState([]);
  const [selectedAtendentes, setSelectedAtendentes] = React.useState([]); // filtro por dono da conversa
  const [selectedDepartamentos, setSelectedDepartamentos] = React.useState([]); // filtro por departamento da conversa
  const [busca, setBusca] = React.useState('');             // pesquisa de conversa por nome/telefone
  const [showFilter, setShowFilter] = React.useState(false); // popover de filtro (tag/funil), agora ao lado da busca
  const singlePane = useIsMobile(900);     // <=900 (celular + tablet retrato): um painel por vez
  const isNarrow = useIsMobile(1100);      // 901–1100 (tablet paisagem): lista + conversa, sem a 3ª coluna (IA)
  // Quando single-pane, mostramos um painel por vez: 'list' (conversas) | 'thread' (chat) | 'ai' (contexto).
  const [mobilePane, setMobilePane] = React.useState('list');

  const empty = tweaks.dataState === 'empty';
  const matchesFilter = (c) => {
    if (filter === 'alert') return c.unread > 0 && c.status !== 'encerrada';     // não-lidas (em aberto)
    if (filter === 'ai') return c.handler === 'agent' && c.status !== 'encerrada'; // IA (quando a IA entrar)
    if (filter === 'active') return c.handler === 'human' && c.status === 'em-andamento'; // em atendimento (tem dono)
    if (filter === 'pending') return c.status === 'pendente' || c.handler === 'queue';     // fila (sem dono)
    if (filter === 'closed') return c.status === 'encerrada';
    return true;
  };
  const matchesRefine = (c) => {
    if (selectedTags.length && !(c.tags || []).some((t) => selectedTags.includes(t.nome))) return false;
    // filtra pela fase REAL do CRM: a conversa traz faseIds (pode estar em vários funis);
    // casa se QUALQUER uma das fases dela estiver entre as selecionadas (comparação por string p/ tolerar tipo).
    if (selectedPhases.length && !(c.faseIds || []).some((id) => selectedPhases.some((s) => String(s) === String(id)))) return false;
    // filtro por atendente (dono da conversa)
    if (selectedAtendentes.length && !selectedAtendentes.some((a) => String(a) === String(c.ownerId))) return false;
    // filtro por departamento da conversa
    if (selectedDepartamentos.length && !selectedDepartamentos.some((d) => String(d) === String(c.departamentoId))) return false;
    return true;
  };
  const SOURCE = dbConvs || []; // fonte real de conversas
  const allTags = tagList; // todas as tags da empresa
  // fases reais (colunas) de todos os funis, rotuladas com o nome do funil p/ não confundir
  // colunas homônimas de funis diferentes.
  const allPhases = (funis || []).flatMap((fu) => (fu.columns || []).map((col) => ({ id: col.id, label: (funis.length > 1 ? (fu.name + ' · ') : '') + col.label, color: col.color })));
  const ALL_CONVS = [...extraConvs, ...SOURCE];
  const totalSel = selectedTags.length + selectedPhases.length + selectedAtendentes.length + selectedDepartamentos.length; // qtd de filtros ativos
  // Busca por NOME (e telefone) — acento-insensível. Aplica dentro da aba ativa.
  const _normBusca = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const buscaTermo = _normBusca(busca.trim());
  const buscaDig = busca.replace(/\D/g, '');
  const matchesBusca = (c) => !buscaTermo ? true : (_normBusca(c.client).includes(buscaTermo) || (!!buscaDig && (c.phone || '').replace(/\D/g, '').includes(buscaDig)));
  // fixados primeiro (igual CRM); sort estável preserva a ordem por recência dentro de cada grupo.
  const list = empty ? [] : ALL_CONVS.filter((c) => matchesFilter(c) && matchesRefine(c) && matchesBusca(c)).sort((a, b) => (b.fixado ? 1 : 0) - (a.fixado ? 1 : 0));
  const conv = ALL_CONVS.find((c) => c.id === selectedId) || null; // sem dono -> NÃO cai em outra conversa (mostra a tela vazia)
  // Rede de segurança: se a conversa selecionada saiu da lista (transferida/encerrada/
  // apagada), zera a seleção -> tela orientativa. NUNCA cai em outra que não foi escolhida.
  React.useEffect(() => { if (selectedId && dbConvs !== null && !conv) setSelectedId(null); }, [conv, selectedId, dbConvs]);
  const counts = {
    alert: SOURCE.filter((c) => c.unread > 0).length,
    ai: 0,
    pending: SOURCE.filter((c) => c.status === 'pendente').length
  };

  return (
    <div className="screen" style={{ height: '100%' }}>
      <Topbar title="Mensagens" subtitle="Inbox completo do Whatsapp, Instagram e Facebook" />
      <div style={{ display: 'grid', gridTemplateColumns: singlePane ? '1fr' : (conv && !isNarrow ? ('350px 1fr ' + (showAI ? '350px' : '0px')) : '350px 1fr'), transition: 'grid-template-columns .28s ease', flex: 1, minHeight: 0 }}>
        {/* LEFT: list (no mobile só aparece quando mobilePane==='list') */}
        {(!singlePane || mobilePane === 'list') && (
        <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--surface)', position: 'relative', overflow: 'hidden' }}>
          <InboxHeader
            available={available}
            away={away}
            onSetAway={() => setShowAwayModal(true)}
            onResume={resumir}
            podeConfig={podeConfig}
            onConfig={() => setShowConfig(true)} />
          
          {!available && away && <AwayBadge away={away} onResume={resumir} />}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                <span style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(calc(-50% + 2px))', color: 'var(--text-faint)' }}><Ic name="search" size={14} /></span>
                <input className="input" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar conversas pelo nome..." style={{ paddingLeft: 30, paddingRight: 12, height: 32, fontSize: 'var(--type-sm)', width: '100%' }} />
              </div>
              {/* filtro tag/funil — agora à direita da busca (mesma altura, ícone quadrado 32x32, hover) */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <button onClick={() => setShowFilter((s) => !s)} title="Filtrar por tag / funil"
                  style={{ height: 32, width: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid ' + (totalSel > 0 ? 'var(--accent)' : 'var(--border)'), background: totalSel > 0 ? 'var(--accent-soft)' : 'transparent', color: totalSel > 0 ? 'var(--accent-700)' : 'var(--text-muted)', cursor: 'default', position: 'relative', transition: 'background .15s, border-color .15s, color .15s' }}
                  onMouseEnter={(e) => { if (totalSel === 0) { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)'; } }}
                  onMouseLeave={(e) => { if (totalSel === 0) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; } }}>
                  <Ic name="filter" size={15} />
                  {totalSel > 0 && <span style={{ position: 'absolute', top: -5, right: -5, background: 'var(--accent)', color: 'white', borderRadius: 999, minWidth: 14, height: 14, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '2px solid var(--surface)' }}>{totalSel}</span>}
                </button>
                {showFilter &&
                <FilterPopover
                  filter={filter}
                  tags={allTags}
                  phases={allPhases}
                  atendentes={atendentesList}
                  departamentos={departamentosList}
                  podeVerAtendentes={podeVerAtendentes}
                  selectedTags={selectedTags}
                  selectedPhases={selectedPhases}
                  selectedAtendentes={selectedAtendentes}
                  selectedDepartamentos={selectedDepartamentos}
                  onToggleTag={(t) => setSelectedTags((s) => s.includes(t) ? s.filter((x) => x !== t) : [...s, t])}
                  onTogglePhase={(p) => setSelectedPhases((s) => s.includes(p) ? s.filter((x) => x !== p) : [...s, p])}
                  onToggleAtendente={(a) => setSelectedAtendentes((s) => s.includes(a) ? s.filter((x) => x !== a) : [...s, a])}
                  onToggleDepartamento={(d) => setSelectedDepartamentos((s) => s.includes(d) ? s.filter((x) => x !== d) : [...s, d])}
                  onClear={() => {setSelectedTags([]);setSelectedPhases([]);setSelectedAtendentes([]);setSelectedDepartamentos([]);}}
                  onClose={() => setShowFilter(false)} />
                }
              </div>
            </div>
            <FilterPills filter={filter} setFilter={setFilter} counts={counts} />
          </div>
          <div className="scroll" style={{ flex: 1, overflow: 'auto' }}>
            {dbConvs === null ? <ConvListSkeleton count={skelCount('inbox-convs', 6)} /> :
             convError ? <EmptyState icon="inbox" title="Erro ao carregar" desc={convError} /> :
             list.length === 0 ? <EmptyState icon="inbox" title="Sem conversas" desc="Conecte um canal para começar." /> : list.map((c) =>
            <ConvRow key={c.id} c={c} active={c.id === selectedId} onClick={() => { setSelectedId(c.id); marcarLida(c.id); if (singlePane) setMobilePane('thread'); }}
              onFixar={(v) => fixarConv(c.id, v)} onBloquear={(v) => bloquearConv(c.id, v)} onLimpar={() => limparConv(c.id)} onApagar={() => apagarConv(c.id)} onFechar={() => fecharConv(c.id)} />
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
          <ContactsPanel open={showContacts} onClose={() => setShowContacts(false)} onStartConv={(x) => { startConvWith(x); if (singlePane) setMobilePane('thread'); }} />
        </div>
        )}

        {/* CENTER: thread (no mobile só aparece quando mobilePane==='thread') */}
        {conv && (!singlePane || mobilePane === 'thread') && <ConvThread conv={conv} composing={composing} setComposing={setComposing} onOpenContext={() => { setShowAI(true); if (singlePane) setMobilePane('ai'); }} aiOpen={showAI} onToggleAI={toggleAI} onConvChanged={refetchContatos} onSent={onConvSent} onLeave={() => setSelectedId(null)} onBack={singlePane ? () => setMobilePane('list') : null} />}

        {/* Tela vazia (nenhuma conversa selecionada — ex.: após transferir/sair) */}
        {!conv && (!singlePane || mobilePane === 'thread') && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: 'var(--surface-2)', padding: 32, animation: 'popIn .28s ease' }}>
          <div style={{ position: 'relative', width: 138, height: 138, marginBottom: 12 }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--accent-soft)' }} />
            <div style={{ position: 'absolute', inset: 20, borderRadius: '50%', background: 'linear-gradient(135deg, #0EFF9B 0%, #C0FF33 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a3a1f', boxShadow: '0 14px 32px rgba(14,255,155,.32)' }}>
              <Ic name="chat" size={52} />
            </div>
            <div style={{ position: 'absolute', right: 4, top: 6, width: 38, height: 38, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}><Ic name="sparkles" size={17} style={{ color: 'var(--accent)' }} /></div>
            <div style={{ position: 'absolute', left: 2, bottom: 10, width: 28, height: 28, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}><Ic name="smile" size={13} style={{ color: 'var(--text-muted)' }} /></div>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>Tela de Bate Papo</div>
          <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 8, maxWidth: 340, lineHeight: 1.5 }}>Escolha um contato e clique para iniciar uma nova conversa</div>
        </div>
        )}

        {/* RIGHT (desktop): col3 SEMPRE montada quando há conversa — a LARGURA do grid anima
            (abre/fecha) e o painel (350px fixo, ancorado à direita) é revelado/empurrado, sem reflow. */}
        {conv && !singlePane && !isNarrow &&
        <div style={{ overflow: 'hidden', minWidth: 0, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 350, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <AIPanel conv={conv} setComposing={setComposing} inline={true} onDataChanged={refetchContatos} />
          </div>
        </div>}
        {conv && singlePane && mobilePane === 'ai' && <AIPanel conv={conv} setComposing={setComposing} inline={true} onDataChanged={refetchContatos} onBack={() => setMobilePane('thread')} />}
      </div>
      {showAwayModal && <AwayModal onClose={() => setShowAwayModal(false)} onConfirm={pausar} />}
      {showConfig && <ChatbotConfigDrawer onClose={() => setShowConfig(false)} />}
    </div>);

}

// ───────── Drawer de Configuração do Chatbot (60% da tela, só visual por enquanto) ─────────
// Reaproveita o <Drawer> global (slide-in/out embutido). 8 abas no estilo do perfil,
// com barra de destaque deslizante e efeito lateral ao trocar de aba.
const CHATBOT_CFG_TABS = [
  { id: 'alerta',       label: 'Regras de Alerta',        icon: 'alert',        desc: 'O que faz uma conversa cair na aba de Alerta.', long: 'Defina o gatilho do alerta: mensagem não-lida, tempo de espera (SLA), tag de urgência, canal ou nº mínimo de não-lidas.' },
  { id: 'pausas',       label: 'Tempos de Pausa',          icon: 'pause',        desc: 'Duração de cada motivo de pausa e retorno automático.', long: 'Configure os minutos de almoço, descanso e emergência, e se a pessoa volta a ficar disponível automaticamente ao fim do tempo.' },
  { id: 'atualizacao',  label: 'Atualização (Polling)',    icon: 'refresh',      desc: 'De quanto em quanto tempo a lista e as mensagens atualizam.', long: 'Ajuste o intervalo de atualização das conversas e mensagens — mais rápido para alto volume, mais lento para economizar requisições.' },
  { id: 'expediente',   label: 'Horário de Expediente',    icon: 'clock',        desc: 'Dias e horas de funcionamento do atendimento.', long: 'Fora do horário, envie uma mensagem automática e/ou direcione direto para a IA. Define quando há atendimento humano.' },
  { id: 'roteamento',   label: 'Roteamento',               icon: 'bot',          desc: 'Para onde vai a conversa nova: IA ou departamento.', long: 'Configure o destino inicial do contato e a distribuição automática entre atendentes (rodízio, por carga ou por tag).' },
  { id: 'mensagens',    label: 'Mensagens Automáticas',    icon: 'chat',         desc: 'Saudação, fora do horário, transferência.', long: 'Padronize o primeiro contato: mensagem de boas-vindas, aviso de fora do horário e aviso de "transferido para um atendente".' },
  { id: 'encerramento', label: 'Encerramento Automático',  icon: 'check-double', desc: 'Encerrar conversas paradas após X dias.', long: 'Limpe a fila automaticamente: conversas sem interação por um período definido são encerradas sozinhas.' },
  { id: 'abas',         label: 'Abas Visíveis',            icon: 'columns',      desc: 'Quais abas aparecem e em que ordem.', long: 'Esconda ou reordene as abas (Alerta, IA, Ativas, Pendentes, Encerradas) conforme a operação da loja.' },
];
function ChatbotConfigDrawer({ onClose }) {
  const [tab, setTab] = React.useState(CHATBOT_CFG_TABS[0].id);
  const idx = Math.max(0, CHATBOT_CFG_TABS.findIndex((t) => t.id === tab));
  const atual = CHATBOT_CFG_TABS[idx];
  const STRIDE = 48; // altura (44) + gap (4) de cada aba
  return (
    <Drawer title="Configuração de Chatbot" subtitle="Ajustes do atendimento · somente Admin" width="60vw" onClose={onClose}>
      <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
        {/* nav lateral das abas */}
        <div style={{ width: 250, flexShrink: 0, borderRight: '1px solid var(--border)', padding: 10, position: 'relative', overflow: 'auto', background: 'var(--surface-2)' }}>
          {/* barra de destaque deslizante (cartão claro atrás da aba ativa) */}
          <div style={{ position: 'absolute', left: 10, right: 10, height: 44, top: 10 + idx * STRIDE, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 1px 2px rgba(15,23,42,.06)', transition: 'top .28s cubic-bezier(.5,1.4,.4,1)', pointerEvents: 'none' }} />
          {/* barrinha accent à esquerda */}
          <div style={{ position: 'absolute', left: 12, width: 3, height: 22, top: 10 + idx * STRIDE + 11, background: 'var(--accent)', borderRadius: 2, transition: 'top .28s cubic-bezier(.5,1.4,.4,1)', pointerEvents: 'none' }} />
          {CHATBOT_CFG_TABS.map((t) => {
            const on = t.id === tab;
            return (
              <div key={t.id} onClick={() => setTab(t.id)} style={{ position: 'relative', zIndex: 1, height: 44, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', borderRadius: 10, cursor: 'default', color: on ? 'var(--text)' : 'var(--text-muted)', fontWeight: on ? 600 : 500, fontSize: 'var(--type-sm)' }}>
                <Ic name={t.icon} size={16} style={{ color: on ? 'var(--accent)' : 'var(--text-faint)', flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.label}</span>
              </div>);
          })}
        </div>
        {/* conteúdo da aba — efeito lateral ao trocar (key={tab}) */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: 24 }}>
          <div key={tab} className="cfg-pane">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <span style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ic name={atual.icon} size={18} /></span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 'var(--type-lg)' }}>{atual.label}</div>
                <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>{atual.desc}</div>
              </div>
            </div>
            <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
            <div style={{ padding: '48px 24px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 12, background: 'var(--surface-2)' }}>
              <span style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}><Ic name={atual.icon} size={24} /></span>
              <div style={{ fontWeight: 700, marginTop: 12 }}>Em breve</div>
              <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 6, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>{atual.long}</div>
            </div>
          </div>
        </div>
      </div>
    </Drawer>);
}

function ConvRow({ c, active, onClick, onFixar, onBloquear, onLimpar, onApagar, onFechar }) {
  const [hover, setHover] = React.useState(false);
  const [menu, setMenu] = React.useState(null);     // {top,left} | null
  const [confirm, setConfirm] = React.useState(null); // 'limpar' | 'apagar' | null
  const btnRef = React.useRef(null);
  // tags em 1 LINHA só (altura fixa). Quando estouram a largura, aparece uma seta;
  // cada clique rola lateralmente até o próximo tag (e volta ao início ao chegar no fim).
  const tagsRef = React.useRef(null);
  const [tagOv, setTagOv] = React.useState({ over: false, atEnd: false });
  const measureTags = React.useCallback(() => {
    const el = tagsRef.current; if (!el) return;
    setTagOv({ over: el.scrollWidth - el.clientWidth > 2, atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 });
  }, []);
  React.useEffect(() => { measureTags(); }, [measureTags, (c.tags || []).length]);
  const scrollTags = (e) => {
    e.stopPropagation();
    const el = tagsRef.current; if (!el) return;
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 1) { el.scrollTo({ left: 0, behavior: 'smooth' }); } // no fim -> volta ao início
    else {
      const next = Array.from(el.children).find((k) => k.offsetLeft > el.scrollLeft + 1); // próximo tag ainda escondido
      el.scrollTo({ left: next ? next.offsetLeft : el.scrollLeft + 64, behavior: 'smooth' });
    }
    setTimeout(measureTags, 280);
  };
  const openMenu = (e) => {
    e.stopPropagation();
    const r = btnRef.current.getBoundingClientRect();
    setMenu({ top: r.top, left: r.right + 8 }); // popup ao lado direito do ícone/contato
  };
  const closeMenu = () => setMenu(null);
  const act = (e, fn) => { e.stopPropagation(); closeMenu(); fn(); };
  // fundo: ativo > fixado (verde, igual CRM) > hover > normal
  const bg = active ? 'var(--accent-soft)' : (c.fixado ? (hover ? '#DDF1E3' : '#E8F6EC') : (hover ? '#FAFBFD' : 'transparent'));
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ padding: '10px 12px 4px 10px', borderLeft: '4px solid ' + (c.fixado ? '#16A872' : '#AEB7C2'), borderBottom: '1px solid var(--border)', cursor: 'default', background: bg, display: 'flex', gap: 10, position: 'relative', transition: 'background .12s ease, border-color .12s ease' }}>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <Avatar name={c.client} src={c.photo} style={{ width: 46, height: 46, fontSize: 17 }} />
          <span style={{ position: 'absolute', bottom: -2, right: -2, background: 'var(--surface)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--surface)', lineHeight: 0, height: 21, width: 21, boxSizing: 'border-box' }}>
            <ChannelIcon ch={c.channel} size={15} />
          </span>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Linha 1: nome + data/hora */}
        <div className="row" style={{ gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 'var(--type-sm)', flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
            {c.fixado && <Ic name="pin" size={12} style={{ color: '#16A872', flexShrink: 0 }} />}
            <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.client}</span>
          </span>
          <span className="muted" style={{ fontSize: 11, flexShrink: 0 }}>{c.lastTime}</span>
        </div>
        {/* Linha 2: prévia + (não-lidas e seta, abaixo da data/hora) */}
        <div className="row" style={{ gap: 4, marginTop: 2, height: 18, alignItems: 'center' }}>
          {c.sentByMe && c.preview && <Ic name={c.delivered ? 'check-double' : 'check'} size={14} style={{ color: c.delivered ? '#53BDEB' : 'var(--text-faint)', flexShrink: 0 }} />}
          {c.midiaTipo && <Ic name={{ imagem: 'image', audio: 'mic', video: 'video', arquivo: 'file-text' }[c.midiaTipo] || 'file'} className="conv-midia-ic" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
          {c.blocked && <Ic name="lock" size={12} style={{ color: '#b45309', flexShrink: 0 }} />}
          <span className="muted" style={{ fontSize: 'var(--type-xs)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.preview}</span>
          {c.unread > 0 && <span style={{ background: 'var(--accent)', color: 'white', minWidth: 16, height: 16, borderRadius: 999, fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', boxSizing: 'border-box', flexShrink: 0 }}>{c.unread}</span>}
        </div>
        {/* Linha 3 (altura FIXA): ícone humano/IA + tags em 1 linha (com seta de rolagem
            quando estouram a largura) + seta do menu. */}
        <div className="row" style={{ marginTop: 6, gap: 4, alignItems: 'center', height: 20 }}>
          <div ref={tagsRef} onScroll={measureTags} style={{ display: 'flex', flexWrap: 'nowrap', gap: 4, flex: 1, minWidth: 0, overflow: 'hidden', alignItems: 'center', transform: 'translateY(-2px)' }}>
            {/* tags reais do contato (atendente/departamento já removidos) */}
            {(c.tags || []).map((t) => { const col = t.cor || '#64748b'; return <span key={t.id} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 999, background: `${col}1A`, color: col, border: `1px solid ${col}33`, whiteSpace: 'nowrap', flexShrink: 0 }}>{t.nome}</span>; })}
          </div>
          {tagOv.over && <button onClick={scrollTags} title="Ver mais tags" style={{ background: 'var(--surface-2)', border: 0, cursor: 'default', color: 'var(--text-muted)', padding: '1px 2px', display: 'flex', alignItems: 'center', borderRadius: 5, flexShrink: 0 }}><Ic name={tagOv.atEnd ? 'chevron-left' : 'chevron-right'} size={14} /></button>}
          <button ref={btnRef} onClick={openMenu} title="Opções" className="conv-menu-btn" style={{ border: 0, cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: (hover || menu) ? 1 : 0, transition: 'opacity .12s ease, background .14s ease' }}>
            <Ic name="chevron-down" size={26} className="conv-menu-ic" />
          </button>
        </div>
      </div>
      {menu && ReactDOM.createPortal(
        <>
          <div onClick={(e) => { e.stopPropagation(); closeMenu(); }} style={{ position: 'fixed', inset: 0, zIndex: 999 }} />
          <div className="sale-menu conv-row-menu" style={{ top: menu.top, left: menu.left, width: 180 }} onClick={(e) => e.stopPropagation()}>
            <button className="sale-menu-item" onClick={(e) => act(e, () => onFixar(!c.fixado))}><Ic name={c.fixado ? 'pin-off' : 'pin'} size={16} /> {c.fixado ? 'Desafixar' : 'Fixar'}</button>
            <button className="sale-menu-item" onClick={(e) => act(e, () => onBloquear(!c.blocked))}><Ic name="lock" size={16} /> {c.blocked ? 'Desbloquear' : 'Bloquear'}</button>
            <button className="sale-menu-item" onClick={(e) => act(e, () => setConfirm('limpar'))}><Ic name="refresh" size={16} /> Limpar</button>
            <button className="sale-menu-item" onClick={(e) => act(e, () => onFechar())}><Ic name="check-double" size={16} /> Fechar</button>
            <div className="sale-menu-sep" />
            <button className="sale-menu-item danger" onClick={(e) => act(e, () => setConfirm('apagar'))}><Ic name="trash" size={16} /> Apagar</button>
          </div>
        </>,
        document.body)}
      {confirm === 'limpar' && ReactDOM.createPortal(
        <Modal title="Limpar conversa" size="sm" onClose={() => setConfirm(null)} footer={(close) => <>
          <button className="btn fin-btn-back" onClick={() => close()}>Voltar</button>
          <button className="btn btn-delete" onClick={() => close(() => onLimpar())}><Ic name="refresh" size={12} /> Limpar</button>
        </>}>
          <div style={{ fontSize: 'var(--type-sm)' }}>Tem certeza que deseja limpar as mensagens da conversa com <strong>{c.client}</strong>? As mensagens serão apagadas, mas a conversa permanece.</div>
        </Modal>, document.body)}
      {confirm === 'apagar' && ReactDOM.createPortal(
        <Modal title="Apagar conversa" size="sm" onClose={() => setConfirm(null)} footer={(close) => <>
          <button className="btn fin-btn-back" onClick={() => close()}>Voltar</button>
          <button className="btn btn-delete" onClick={() => close(() => onApagar())}><Ic name="trash" size={12} /> Apagar</button>
        </>}>
          <div style={{ fontSize: 'var(--type-sm)' }}>Tem certeza que deseja apagar a conversa com <strong>{c.client}</strong>? Esta ação não pode ser desfeita.</div>
        </Modal>, document.body)}
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


// Detecta emojis que a fonte do sistema NÃO renderiza (viram "tofu"/quadradinho) —
// desenha no canvas e compara com um caractere garantidamente inexistente.
let _emojiCheck = null;
function emojiRenderizavel(ch) {
  try {
    if (!_emojiCheck) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 18;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.textBaseline = 'top';
      ctx.font = '16px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';
      const desenha = (s) => { ctx.clearRect(0, 0, 18, 18); ctx.fillText(s, 0, 0); return ctx.getImageData(0, 0, 18, 18).data.join(','); };
      const tofu = desenha('􏿿'); // U+10FFFF: sempre "tofu"
      const branco = desenha(' ');
      _emojiCheck = (s) => { const r = desenha(s); return r !== tofu && r !== branco; };
    }
    return _emojiCheck(ch);
  } catch (e) { return true; }
}

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
  // esconde os emojis que a fonte do sistema não consegue desenhar (apareciam como quadradinho)
  const emojisVisiveis = React.useMemo(() => (active.emojis || []).filter(emojiRenderizavel), [active]);
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
          {emojisVisiveis.map((e, i) =>
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

  // Lista REAL de contatos da empresa (com telefone). null = ainda carregando.
  const [list, setList] = React.useState(null);
  React.useEffect(() => {
    window.API.getContatos()
      .then((r) => setList((r.contatos || [])
        .map((x) => ({
          id: x.id,
          name: x.nome || 'Contato sem nome',
          phone: x.telefone || '',
          channel: x.canal || 'whatsapp',
          tag: (x.tags && x.tags[0] && String(x.tags[0].nome || x.tags[0].label || '').toUpperCase()) || '',
        }))
        .filter((x) => x.phone)))   // sem telefone n\u00e3o d\u00e1 pra mandar cart\u00e3o
      .catch(() => setList([]));
  }, []);
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const base = list || [];
  const filtered = q
    ? base.filter(c => norm(c.name).includes(norm(q)) || norm(c.phone).includes(norm(q)))
    : base;

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
        <button className="btn fin-btn-back" onClick={onClose}>Voltar</button>
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
        {list === null ? (
          <div className="empty" style={{ padding: '32px 8px' }}>
            <div className="empty-icon"><Ic name="user" size={22} /></div>
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>Carregando contatos…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty" style={{ padding: '32px 8px' }}>
            <div className="empty-icon"><Ic name="user" size={22} /></div>
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>{base.length === 0 ? 'Nenhum contato com telefone' : 'Nenhum contato encontrado'}</div>
            <div style={{ fontSize: 'var(--type-sm)' }}>{base.length === 0 ? 'Cadastre contatos com telefone para enviar.' : 'Tente outro termo de busca.'}</div>
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
      <button className="btn fin-btn-back" onClick={onClose}>Voltar</button>
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

// Paleta p/ colorir os cards de departamento (eles não têm cor própria no banco).
const DEPT_COLORS = ['#16a34a', '#0ea5e9', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#6366f1', '#f97316'];

function TransferirModal({ conv, onClose, onConfirm }) {
  const { auth } = useStore();
  const [tab, setTab] = React.useState('agent');
  const [selected, setSelected] = React.useState(null);
  const [note, setNote] = React.useState('');
  const [atendentes, setAtendentes] = React.useState(null); // null = carregando
  const [colegas, setColegas] = React.useState([]);          // do meu setor (backend já filtra + exclui eu)
  const [deptos, setDeptos] = React.useState(null);
  const [meusDeptos, setMeusDeptos] = React.useState([]);    // ids dos meus setores (do backend)
  React.useEffect(() => {
    let alive = true;
    const mapU = (u) => ({ id: u.id, name: u.nome, role: u.papelNome || 'Atendente', departamentoId: u.departamentoId != null ? u.departamentoId : null, emPausa: !!u.emPausa, pausaLabel: u.pausaLabel || null });
    API.getTransferenciaListas()
      .then((r) => {
        if (!alive) return;
        setAtendentes((r.atendentes || []).map(mapU));
        setColegas((r.colegas || []).map(mapU));
        setDeptos((r.departamentos || []).map((d, i) => ({ id: d.id, name: d.nome, desc: 'Departamento', color: DEPT_COLORS[i % DEPT_COLORS.length] })));
        setMeusDeptos(r.meusDepartamentos || []);
      })
      .catch(() => { if (alive) { setAtendentes([]); setDeptos([]); } });
    return () => { alive = false; };
  }, []);
  const meusSet = new Set((meusDeptos || []).map(String));
  const submit = () => {
    if (!selected) return;
    const kind = tab === 'dept' ? 'dept' : 'agent';
    let target = selected;
    if (kind === 'agent') {
      // a conversa passa a seguir o DEPARTAMENTO de quem recebe (carimba setor do dono).
      const dep = (deptos || []).find((d) => String(d.id) === String(selected.departamentoId));
      target = { ...selected, departamentoId: selected.departamentoId != null ? selected.departamentoId : null, departamentoNome: dep ? dep.name : null };
    }
    onConfirm({ kind, target, note });
  };
  // Atendente: TODOS os usuários, menos eu (backend já exclui).
  const listaAtendentes = atendentes || [];
  // Meu departamento: colegas do(s) meu(s) setor(es) (backend já resolve perfil+equipe+responsável).
  const listaMeuDepto = colegas;
  // Departamento: todos os setores, menos o(s) meu(s).
  const listaDeptos = (deptos || []).filter((d) => !meusSet.has(String(d.id)));
  // card de atendente reutilizado nas abas "Atendente" e "Meu departamento"
  const renderUser = (a) => {
    const on = selected?.id === a.id;
    const pausado = a.emPausa; // em pausa: não recebe transferência (cinza + aviso ao clicar)
    // Aviso de acordo com a pausa: usa o rótulo (= label do AWAY_REASONS) p/ pegar a previsão de retorno.
    const avisarPausa = () => {
      const r = AWAY_REASONS.find((x) => x.label === a.pausaLabel);
      const motivo = (a.pausaLabel || (r && r.label) || 'pausa').toLowerCase();
      const retorno = (r && r.desc) ? ` · ${r.desc.toLowerCase()}` : '';
      window.showToast && window.showToast({ tipo: 'aviso', titulo: `${a.name} está indisponível`, descricao: `Entrou em ${motivo}${retorno}.`, duracao: 5000 });
    };
    return (
      <div key={a.id} onClick={() => { if (pausado) avisarPausa(); else setSelected(a); }} className="card" style={{ padding: 10, cursor: 'default', opacity: pausado ? 0.55 : 1, borderColor: on ? 'var(--accent)' : 'var(--border)', background: on ? 'var(--accent-soft)' : 'var(--surface)', transition: 'border-color .15s, background .15s' }}>
        <div className="row" style={{ gap: 10 }}>
          <Avatar name={a.name} size="sm" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row" style={{ gap: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 'var(--type-sm)' }}>{a.name}</span>
              {pausado && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', padding: '1px 6px', borderRadius: 999, background: 'var(--surface-3)', color: 'var(--text-muted)', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{a.pausaLabel || 'Em pausa'}</span>}
            </div>
            <div className="muted" style={{ fontSize: 11 }}>{a.role}</div>
          </div>
          {on && <Ic name="check" size={16} style={{ color: 'var(--accent)' }} />}
        </div>
      </div>);
  };
  const TABS = [['agent', 'Atendente', 'user'], ['dept', 'Departamento', 'team'], ['mydept', 'Meu departamento', 'folder']];
  const tabIdx = Math.max(0, TABS.findIndex((t) => t[0] === tab));
  return (
    <Modal title="Transferir conversa" onClose={onClose} size="md" footer={<>
      <button className="btn fin-btn-back" onClick={onClose}>Voltar</button>
      <button className="btn btn-primary" disabled={!selected} onClick={submit} style={{ opacity: selected ? 1 : 0.5 }}><Ic name="users" size={13} /> Transferir</button>
    </>}>
      <div className="col" style={{ gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid var(--border)', position: 'relative' }}>
          {TABS.map(([id, l, ic]) =>
          <div key={id} onClick={() => {setTab(id);setSelected(null);}} style={{ padding: '10px 4px', textAlign: 'center', fontSize: 'var(--type-xs)', fontWeight: 600, color: tab === id ? 'var(--text)' : 'var(--text-muted)', cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'color .15s', whiteSpace: 'nowrap' }}><Ic name={ic} size={13} />{l}</div>
          )}
          <div style={{ position: 'absolute', bottom: -1, height: 2, width: '33.333%', left: `${tabIdx * 33.333}%`, background: 'var(--accent)', transition: 'left .25s cubic-bezier(.5,1.4,.4,1)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflow: 'auto' }}>
          {tab === 'agent' && (atendentes === null ?
            <ContactListSkeleton count={3} /> :
            listaAtendentes.length === 0 ?
            <div className="muted" style={{ padding: 20, textAlign: 'center', fontSize: 'var(--type-sm)' }}>Nenhum outro atendente disponível.</div> :
            listaAtendentes.map(renderUser))}
          {tab === 'mydept' && (atendentes === null ?
            <ContactListSkeleton count={3} /> :
            meusDeptos.length === 0 ?
            <div className="muted" style={{ padding: 20, textAlign: 'center', fontSize: 'var(--type-sm)' }}>Você não está atribuído a um departamento.</div> :
            listaMeuDepto.length === 0 ?
            <div className="muted" style={{ padding: 20, textAlign: 'center', fontSize: 'var(--type-sm)' }}>Nenhum outro colega no seu departamento.</div> :
            listaMeuDepto.map(renderUser))}
          {tab === 'dept' && (deptos === null ?
            <ContactListSkeleton count={3} /> :
            listaDeptos.length === 0 ?
            <div className="muted" style={{ padding: 20, textAlign: 'center', fontSize: 'var(--type-sm)' }}>Nenhum outro departamento disponível.</div> :
            listaDeptos.map((d) => {
            const on = selected?.id === d.id;
            return (
              <div key={d.id} onClick={() => setSelected(d)} className="card" style={{ padding: 10, cursor: 'default', borderColor: on ? d.color : 'var(--border)', background: on ? `color-mix(in oklab, ${d.color} 8%, var(--surface))` : 'var(--surface)', transition: 'border-color .15s, background .15s' }}>
                <div className="row" style={{ gap: 10 }}>
                  <span style={{ width: 36, height: 36, borderRadius: 9, background: `color-mix(in oklab, ${d.color} 14%, transparent)`, color: d.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ic name="folder" size={16} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--type-sm)' }}>{d.name}</div>
                    <div className="muted" style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.desc}</div>
                  </div>
                  {on && <Ic name="check" size={16} style={{ color: d.color }} />}
                </div>
              </div>);

          }))}
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
      <button className="btn fin-btn-back" onClick={onClose}>Voltar</button>
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

// Opções de tempo de fixação (estilo WhatsApp). ms = duração da fixação.
const PIN_DURATIONS = [
  { label: '24 horas', ms: 24 * 36e5, color: '#165EEE' },
  { label: '7 dias', ms: 7 * 864e5, color: '#16a34a' },
  { label: '15 dias', ms: 15 * 864e5, color: '#FF8B30' },
  { label: '30 dias', ms: 30 * 864e5, color: '#a855f7' },
  { label: '60 dias', ms: 60 * 864e5, color: '#ec4899' },
  { label: '90 dias', ms: 90 * 864e5, color: '#0ea5e9' },
];

// Botão da barra de seleção: 32x32 cinza (padrão config/filtro), hover na cor da ação.
function SelIconBtn({ icon, color, title, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      style={{ height: 32, width: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: disabled ? 'default' : 'pointer', flexShrink: 0, opacity: disabled ? .4 : 1, transition: 'background .15s, border-color .15s, color .15s' }}
      onMouseEnter={(e) => { if (disabled) return; e.currentTarget.style.background = 'color-mix(in oklab, ' + color + ' 12%, transparent)'; e.currentTarget.style.borderColor = color; e.currentTarget.style.color = color; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
      <Ic name={icon} size={15} />
    </button>);
}

function ConvThread({ conv, composing, setComposing, onOpenContext, onConvChanged, onSent, onBack, aiOpen, onToggleAI, onLeave }) {
  const { auth } = useStore(); // p/ o avatar/nome do atendente nas bolhas
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
  const atBottomRef = React.useRef(true);   // o usuário está "colado" no fim da conversa?
  const prevConvRef = React.useRef(conv.id);
  const scrollToBottom = React.useCallback(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, []);
  const onScrollMsgs = () => { const el = scrollRef.current; if (el) atBottomRef.current = (el.scrollHeight - el.scrollTop - el.clientHeight) < 80; };
  const [qrIndex, setQrIndex] = React.useState(0); // item realçado na lista de respostas rápidas (modo "/")
  const [replyingTo, setReplyingTo] = React.useState(null); // mensagem sendo respondida (citação)
  const [selecting, setSelecting] = React.useState(false);  // modo seleção (checkbox nas bolhas)
  const [selectedIds, setSelectedIds] = React.useState([]); // ids selecionados
  const [pinIdx, setPinIdx] = React.useState(0);            // índice da fixada atual (ciclo estilo WhatsApp)
  const [confirmApagar, setConfirmApagar] = React.useState(null); // { msg } (uma) | { bulk:true } (selecionadas)
  const [pinDurMsg, setPinDurMsg] = React.useState(null);   // mensagem aguardando escolha do tempo de fixação
  const [lightbox, setLightbox] = React.useState(null);     // mídia (imagem/vídeo) aberta no popup
  // só mensagens REAIS (com id do banco) aceitam fixar/favoritar/apagar.
  const isRealMsg = (m) => m && m._id && !/^(tmp-|mk-|up-)/.test(String(m._id));

  React.useEffect(() => {
    setLocalStatus(conv.status);
    setLocalHandler(conv.handler);
    setMenu(null);setRecording(false);setModal(null);setToast(null);setReplyingTo(null);setSelecting(false);setSelectedIds([]);setPinIdx(0);setConfirmApagar(null);setPinDurMsg(null);setLightbox(null);
    if (conv._db) {
      // conversa real: SEMEIA do cache leve (revisita instantânea) e busca na API pra atualizar.
      const cached = window.screenCacheGet && window.screenCacheGet('msgs-' + conv.id);
      if (cached !== undefined) { setMessages(cached); setLoadingMsgs(false); }
      else { setLoadingMsgs(true); }
      let alive = true;
      API.getMensagens(conv.id)
        .then((r) => { if (alive) setMessages((r.mensagens || []).map(dbMsgToUi)); })
        .catch(() => { if (alive && cached === undefined) setMessages([]); })
        .finally(() => { if (alive) setLoadingMsgs(false); });
      return () => { alive = false; };
    } else {
      setMessages(conv.messages || [{ from: 'client', kind: 'text', text: conv.preview, time: conv.lastTime }]);
    }
  }, [conv.id]);

  // Atualização automática: re-busca as mensagens da conversa aberta a cada 4s.
  // Só troca o estado se realmente mudou (evita re-render/scroll à toa).
  React.useEffect(() => {
    if (!conv._db) return;
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      API.getMensagens(conv.id)
        .then((r) => {
          const novas = (r.mensagens || []).map(dbMsgToUi);
          setMessages((prev) => {
            // preserva mensagens otimistas ainda "em voo" (não derruba o que acabou de enviar)
            const pendentes = prev.filter((m) => m._pending);
            const a = prev[prev.length - 1], b = novas[novas.length - 1];
            if (!pendentes.length && prev.length === novas.length && (!b || (a && a._id === b._id))) return prev;
            return pendentes.length ? [...novas, ...pendentes] : novas;
          });
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(id);
  }, [conv.id, conv._db]);

  // Grava as mensagens no cache leve -> revisita da conversa é instantânea (inclui updates do poll/envio).
  React.useEffect(() => {
    if (conv._db && !loadingMsgs && messages && messages.length && window.screenCacheSet) window.screenCacheSet('msgs-' + conv.id, messages);
  }, [messages, conv.id, loadingMsgs, conv._db]);

  // Rola pro FIM (última mensagem). Ao ABRIR/trocar de conversa, sempre nasce no fim
  // — depois dos balões renderizarem (loadingMsgs false), não na skeleton. Em mensagem
  // nova (envio/poll), só rola se você JÁ estava no fim (não atrapalha quem lê o
  // histórico). useLayoutEffect = aplica antes de pintar, sem "pulo" visível.
  React.useLayoutEffect(() => {
    if (loadingMsgs) return;
    const trocou = prevConvRef.current !== conv.id;
    prevConvRef.current = conv.id;
    if (trocou || atBottomRef.current) { scrollToBottom(); atBottomRef.current = true; }
  }, [conv.id, messages, loadingMsgs]);

  // Mídia (imagem/áudio/vídeo) carrega depois e aumenta a altura -> reancora no fim
  // se ainda estávamos no fim (corrige o "scroll parado no meio" quando há imagens).
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onMediaLoad = (e) => { const t = e.target; if (t && /^(IMG|VIDEO|AUDIO)$/.test(t.tagName || '') && atBottomRef.current) scrollToBottom(); };
    el.addEventListener('load', onMediaLoad, true); // capture: o 'load' de mídia não borbulha
    return () => el.removeEventListener('load', onMediaLoad, true);
  }, [conv.id]);

  React.useEffect(() => {if (toast) {const t = setTimeout(() => setToast(null), 2400);return () => clearTimeout(t);}}, [toast]);

  const now = () => {const d = new Date();return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;};
  const addAgentMessage = (m) => setMessages((prev) => [...prev, { from: 'agent', time: now(), ...m }]);
  // Marcador OTIMISTA (início/transferência/encerramento): aparece na hora; o poll de 4s
  // reconcilia com o registro real do backend (os ids não batem -> substitui sem duplicar).
  const addMarcador = (kind, marca) => {
    const iso = new Date().toISOString();
    setMessages((prev) => [...prev, { _id: 'mk-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), from: 'agent', kind, marca, text: (marca && marca.nota) || '', origem: (marca && marca.de && marca.de.dept) || null, autor: (marca && (marca.por || marca.atend)) || (auth.nome || 'Você'), data: fmtDataMarcador(iso), horaMarcador: fmtHoraMarcador(iso), time: now() }]);
  };

  const handleSend = async () => {
    const t = composing.trim();
    if (!t) return;
    setComposing('');
    const rep = replyingTo; setReplyingTo(null);                  // Responder: citação
    const repId = rep && isRealMsg(rep) ? rep._id : null;
    if (!conv._db) { addAgentMessage({ kind: 'text', text: t, respondeA: repId }); return; }
    // Otimista: mostra na hora (sem esperar o backend/Meta). Depois reconcilia.
    const tempId = 'tmp-' + Date.now();
    setMessages((prev) => [...prev, { _id: tempId, from: 'agent', kind: 'text', text: t, time: now(), _pending: true, respondeA: repId }]);
    if (onSent) onSent(conv.id); // joga a conversa pro topo + atualiza a hora
    try {
      const r = await API.sendTexto(conv.id, t, repId || undefined);
      // troca a provisória pela definitiva (com _id real) — sem duplicar
      setMessages((prev) => prev.map((m) => m._id === tempId ? dbMsgToUi(r.mensagem) : m));
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      setComposing(t); // devolve o texto pro campo
      window.showToast({ tipo: 'erro', titulo: 'Falha ao enviar', descricao: e.message || 'Não foi possível enviar a mensagem.' });
    }
  };

  // ---- Ações do popup por mensagem (Copiar/Baixar/Responder/Selecionar/Fixar/Favoritar/Apagar) ----
  const baixarMidia = (m) => {
    if (!m.mediaUrl) { window.showToast({ tipo: 'aviso', titulo: 'Sem arquivo para baixar' }); return; }
    baixarMidiaUrl(m.mediaUrl, m.filename);
  };
  const toggleFlag = (m, field) => {
    if (!conv._db || !isRealMsg(m)) { window.showToast({ tipo: 'aviso', titulo: 'Aguarde a mensagem ser enviada' }); return; }
    const novo = !m[field];
    if (field === 'fixada' && novo && messages.filter((x) => x.fixada).length >= 5) { window.showToast({ tipo: 'aviso', titulo: 'Limite de 5 fixadas', descricao: 'Desafixe uma para fixar outra.' }); return; }
    setMessages((prev) => prev.map((x) => x._id === m._id ? { ...x, [field]: novo } : x));
    API.patchMensagem(conv.id, m._id, field === 'fixada' ? { fixada: novo } : { favoritada: novo })
      .catch(() => { setMessages((prev) => prev.map((x) => x._id === m._id ? { ...x, [field]: !novo } : x)); window.showToast({ tipo: 'erro', titulo: 'Não foi possível atualizar' }); });
  };
  const apagarMsg = (m) => {
    if (!conv._db || !isRealMsg(m)) { window.showToast({ tipo: 'aviso', titulo: 'Aguarde a mensagem ser enviada' }); return; }
    setMessages((prev) => prev.map((x) => x._id === m._id ? { ...x, apagado: true } : x));
    API.patchMensagem(conv.id, m._id, { apagada: true })
      .catch(() => { setMessages((prev) => prev.map((x) => x._id === m._id ? { ...x, apagado: false } : x)); window.showToast({ tipo: 'erro', titulo: 'Não foi possível apagar' }); });
  };
  const onMsgAction = (id, m) => {
    if (id === 'copiar') { const txt = m.text || m.filename || ''; if (navigator.clipboard && txt) navigator.clipboard.writeText(txt).then(() => window.showToast({ tipo: 'sucesso', titulo: 'Copiado' })).catch(() => {}); return; }
    if (id === 'baixar') { baixarMidia(m); return; }
    if (id === 'responder') { setReplyingTo(m); setTimeout(() => inputRef.current && inputRef.current.focus(), 0); return; }
    if (id === 'selecionar') { setSelecting(true); setSelectedIds((s) => s.includes(m._id) ? s : [...s, m._id]); return; }
    if (id === 'fixar') { if (ativaFix(m)) toggleFlag(m, 'fixada'); else setPinDurMsg(m); return; }
    if (id === 'favoritar') { toggleFlag(m, 'favoritada'); return; }
    if (id === 'apagar') { setConfirmApagar({ msg: m }); return; }
  };
  const apagarSelecionadas = () => {
    const ids = selectedIds.slice(); setSelecting(false); setSelectedIds([]);
    ids.forEach((mid) => { const m = messages.find((x) => x._id === mid); if (m && isRealMsg(m)) apagarMsg(m); });
  };
  // Fixada ATIVA = fixada, não apagada e dentro do prazo (fixada_ate no futuro, ou sem prazo).
  const agoraMs = Date.now();
  const ativaFix = (m) => m.fixada && !m.apagado && (!m.fixadaAte || new Date(m.fixadaAte).getTime() > agoraMs);
  const fixadas = messages.filter(ativaFix); // faixa de fixadas (só as não-expiradas)
  // Fixar com PRAZO (24h/7d/.../90d): grava fixada + data de expiração.
  const fixarComPrazo = (m, ms) => {
    if (!conv._db || !isRealMsg(m)) { window.showToast({ tipo: 'aviso', titulo: 'Aguarde a mensagem ser enviada' }); return; }
    if (messages.filter(ativaFix).length >= 5) { window.showToast({ tipo: 'aviso', titulo: 'Limite de 5 fixadas', descricao: 'Desafixe uma para fixar outra.' }); return; }
    const ate = new Date(Date.now() + ms).toISOString();
    setMessages((prev) => prev.map((x) => x._id === m._id ? { ...x, fixada: true, fixadaAte: ate } : x));
    API.patchMensagem(conv.id, m._id, { fixada: true, fixadaAte: ate })
      .then(() => window.showToast({ tipo: 'sucesso', titulo: 'Mensagem fixada' }))
      .catch(() => { setMessages((prev) => prev.map((x) => x._id === m._id ? { ...x, fixada: false, fixadaAte: null } : x)); window.showToast({ tipo: 'erro', titulo: 'Não foi possível fixar' }); });
  };
  const pinIdxSafe = fixadas.length ? (pinIdx % fixadas.length) : 0;
  const pinAtual = fixadas[pinIdxSafe] || null; // fixada exibida na faixa (ciclo ao clicar)
  const copiarSelecionadas = () => {
    const txt = selectedIds.map((mid) => messages.find((x) => x._id === mid)).filter(Boolean).map((m) => m.text || m.filename || '').filter(Boolean).join('\n');
    if (txt && navigator.clipboard) navigator.clipboard.writeText(txt).then(() => window.showToast({ tipo: 'sucesso', titulo: 'Copiado' })).catch(() => {});
    setSelecting(false); setSelectedIds([]);
  };
  const favoritarSelecionadas = () => {
    const ids = selectedIds.slice(); setSelecting(false); setSelectedIds([]);
    ids.forEach((mid) => { const m = messages.find((x) => x._id === mid); if (m && isRealMsg(m) && !m.favoritada) toggleFlag(m, 'favoritada'); });
  };
  // --- Respostas rápidas estilo WhatsApp Web: digitar "/" abre a lista; o texto após
  // a barra filtra pelo TÍTULO; clicar/Enter joga a mensagem completa no campo. ---
  const slashOpen = composing.startsWith('/');
  const slashQuery = slashOpen ? composing.slice(1).toLowerCase().trim() : '';
  // título normalizado (minúsculo, sem barra inicial caso o comando tenha sido salvo com "/")
  const _qrTitulo = (q) => (q.comando || '').toLowerCase().replace(/^\/+/, '').trim();
  const qrList = slashOpen
    ? quickReplies.filter((q) => !slashQuery || _qrTitulo(q).includes(slashQuery))
    : [];
  const pickQuickReply = (q) => { if (!q) return; setComposing(q.mensagem); inputRef.current && inputRef.current.focus(); };
  React.useEffect(() => { setQrIndex(0); }, [composing]); // realça o 1º conforme o filtro muda

  const onKeyDown = (e) => {
    if (slashOpen && qrList.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setQrIndex((i) => Math.min(i + 1, qrList.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setQrIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); pickQuickReply(qrList[qrIndex] || qrList[0]); return; }
      if (e.key === 'Escape')    { e.preventDefault(); setComposing(''); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };
  const onPickEmoji = (e) => {setComposing((composing || '') + e);inputRef.current?.focus();};
  // digitar só atualiza o texto; a inserção da resposta vem do painel "/" (clique/Enter).
  const onComposeChange = (val) => { setComposing(val); };
  // dispara o seletor de arquivo do sistema
  const triggerFile = (accept) => { setPendingAccept(accept); setTimeout(() => fileRef.current && fileRef.current.click(), 0); };
  // faz upload do arquivo escolhido (ou áudio gravado) via API
  // Envia mídia com PRÉVIA + barra de progresso (%) + cancelar. Usa XHR pra ter o
  // progresso de upload (o fetch não expõe). A bolha "enviando" aparece na hora —
  // assim a pessoa vê que foi enviado e não manda 2x.
  const enviarArquivo = (file) => {
    if (!file) return;
    if (!conv._db) { addAgentMessage({ kind: 'doc', filename: file.name || 'arquivo', meta: fmtTamanho(file.size) }); return; }
    const tempId = 'up-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const mime = file.type || '';
    const kind = mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : mime.startsWith('audio/') ? 'audio' : 'doc';
    const localUrl = (kind === 'image' || kind === 'video') ? URL.createObjectURL(file) : null;
    const xhr = new XMLHttpRequest();
    // bolha otimista de upload (prévia + progresso + cancelar)
    setMessages((prev) => [...prev, { _id: tempId, from: 'agent', kind, _uploading: true, _progress: 0, _xhr: xhr, _localUrl: localUrl, mediaUrl: localUrl, filename: file.name || 'arquivo', meta: fmtTamanho(file.size), time: now() }]);
    const cleanup = () => { if (localUrl) { try { URL.revokeObjectURL(localUrl); } catch (e) {} } };
    xhr.open('POST', '/api/chatbot/contatos/' + conv.id + '/midia');
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const pct = Math.round((e.loaded / e.total) * 100);
      setMessages((prev) => prev.map((m) => m._id === tempId ? { ...m, _progress: pct } : m));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        let data = null; try { data = JSON.parse(xhr.responseText); } catch (e) {}
        const real = data && data.mensagem ? dbMsgToUi(data.mensagem) : null;
        setMessages((prev) => prev.map((m) => m._id === tempId ? (real || { ...m, _uploading: false }) : m));
        cleanup();
        if (onSent) onSent(conv.id);
      } else {
        let msg = 'Não foi possível enviar a mídia.';
        try { const d = JSON.parse(xhr.responseText); if (d && d.error) msg = d.error; } catch (e) {}
        if (xhr.status === 413 && !/grande/i.test(msg)) msg = 'Arquivo muito grande para enviar.';
        setMessages((prev) => prev.filter((m) => m._id !== tempId)); cleanup();
        window.showToast({ tipo: 'erro', titulo: 'Falha no upload', descricao: msg });
      }
    };
    xhr.onerror = () => { setMessages((prev) => prev.filter((m) => m._id !== tempId)); cleanup(); window.showToast({ tipo: 'erro', titulo: 'Falha no upload', descricao: 'Erro de conexão.' }); };
    xhr.onabort = () => { setMessages((prev) => prev.filter((m) => m._id !== tempId)); cleanup(); };
    const fd = new FormData(); fd.append('arquivo', file, file.name || 'arquivo');
    xhr.send(fd);
  };
  // Envia um cartão de contato (otimista + backend, igual ao texto/mídia).
  const enviarContato = async (c) => {
    const card = { nome: c.name || c.nome || 'Contato', telefone: c.phone || c.telefone || '' };
    if (!conv._db) { addAgentMessage({ kind: 'contact', contactName: card.nome, contactPhone: card.telefone, contactChannel: c.channel }); return; }
    const tempId = 'tmp-' + Date.now();
    setMessages((prev) => [...prev, { _id: tempId, from: 'agent', kind: 'contact', contactName: card.nome, contactPhone: card.telefone, contactChannel: c.channel, time: now(), _pending: true }]);
    if (onSent) onSent(conv.id);
    try {
      const r = await API.sendContato(conv.id, card);
      setMessages((prev) => prev.map((m) => m._id === tempId ? dbMsgToUi(r.mensagem) : m));
      if (r && r.aviso) window.showToast({ tipo: 'aviso', titulo: 'Contato enviado, mas não entregue', descricao: r.aviso });
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      window.showToast({ tipo: 'erro', titulo: 'Erro ao enviar contato', descricao: e.message || 'Não foi possível enviar o contato.' });
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

  const isPending = localStatus === 'pendente' || handler === 'queue';
  // Card "Conversa Recebida": enquanto PENDENTE fica só no rodapé (com o Atender);
  // ao atender, ele "pula" para dentro do histórico (com efeito). Sem duplicar.
  const ultimaTransf = (() => { for (let i = messages.length - 1; i >= 0; i--) { if (messages[i].kind === 'nota') return messages[i]; } return null; })();
  const bubbles = (isPending && ultimaTransf) ? messages.filter((m) => m !== ultimaTransf) : messages;

  // grava o status no banco (ativo/finalizado) e atualiza a lista de conversas
  const mudarStatus = async (dbStatus) => {
    if (!conv._db) return;
    try { await API.setContatoStatus(conv.id, dbStatus); if (onConvChanged) onConvChanged(); }
    catch (e) { window.showToast({ tipo: 'erro', titulo: 'Erro ao alterar status', descricao: e.message || 'Não foi possível atualizar o status.' }); }
  };
  // iniciar atendimento: assume a conversa (vira dono) — a partir daqui só você + o responsável do setor veem.
  const assumir = async (titulo) => {
    setLocalStatus('em-andamento'); setLocalHandler('human');
    if (!conv._db) { window.showToast({ tipo: 'sucesso', titulo }); return; }
    addMarcador('inicio', { dept: conv.dept || null, atend: auth.nome || 'Você' });
    try { await API.assumirContato(conv.id); window.showToast({ tipo: 'sucesso', titulo }); if (onConvChanged) onConvChanged(); }
    catch (e) { window.showToast({ tipo: 'erro', titulo: 'Erro ao iniciar', descricao: e.message || 'Não foi possível assumir a conversa.' }); }
  };

  return (
    <div className="conv-mid" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--surface-2)', position: 'relative' }}>
      <div onClick={onOpenContext} title="Abrir contexto do cliente" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', cursor: 'default', transition: 'background .12s', height: "80px" }} className="row conv-head">
        {onBack && <button className="btn btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); onBack(); }} title="Voltar" style={{ width: "30px", height: "30px", marginRight: 2, flexShrink: 0 }}><Ic name="arrow-left" size={18} /></button>}
        <Avatar name={conv.client} src={conv.photo} />
        <div style={{ flex: 1, marginLeft: 10, minWidth: 0 }}>
          <div className="row" style={{ gap: 8 }}><span style={{ fontWeight: 600 }}>{conv.client}</span><ChannelIcon ch={conv.channel} size={13} /></div>
          <div className="row" style={{ gap: 6, marginTop: 2, alignItems: 'center', color: 'var(--text-muted)', fontSize: 'var(--type-xs)' }}>
            {/* 1º humano/IA · 2º DEPARTAMENTO (caixa alta) · 3º Atendente — tudo na mesma cor cinza */}
            <Ic name={conv.aiHandled ? 'sparkles' : 'user'} size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            {[(conv.dept || '').toUpperCase(), conv.owner].filter(Boolean).map((txt, i) =>
            <span key={i} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>· {txt}</span>
            )}
          </div>
        </div>
        {handler === 'agent' && <span className="badge badge-ai"><Ic name="sparkles" size={11} /> IA respondendo</span>}
        {handler === 'queue' && <span className="badge badge-warning"><Ic name="clock" size={11} /> Aguardando há {conv.waitMin || 3} min</span>}
        {handler === 'human' && <span className="badge badge-success"><Ic name="user" size={11} /> Você atendendo</span>}
        {/* Ligação (hover verde) e Ligação de vídeo (hover vermelho) — visual no formato do botão de config; sem função ainda */}
        <button title="Ligação" onClick={(e) => e.stopPropagation()} style={{ height: 32, width: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'default', flexShrink: 0, transition: 'background .15s, border-color .15s, color .15s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-soft)'; e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent-700)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
          <Ic name="phone" size={15} />
        </button>
        <button title="Ligação de vídeo" onClick={(e) => e.stopPropagation()} style={{ height: 32, width: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'default', flexShrink: 0, transition: 'background .15s, border-color .15s, color .15s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'color-mix(in oklab, #FF452A 12%, transparent)'; e.currentTarget.style.borderColor = '#FF452A'; e.currentTarget.style.color = '#FF452A'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
          <Ic name="video" size={15} />
        </button>
        {/* abrir/fechar a coluna 3 (painel) — a seta muda de lado; fechar = vermelho, abrir = azul */}
        <button title={aiOpen ? 'Fechar painel' : 'Abrir painel'} onClick={(e) => { e.stopPropagation(); onToggleAI && onToggleAI(); }} style={{ height: 32, width: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'default', flexShrink: 0, transition: 'background .15s, border-color .15s, color .15s' }}
          onMouseEnter={(e) => { const c = aiOpen ? '#FF452A' : '#165EEE'; e.currentTarget.style.background = 'color-mix(in oklab, ' + c + ' 12%, transparent)'; e.currentTarget.style.borderColor = c; e.currentTarget.style.color = c; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
          <Ic name={aiOpen ? 'panel-right-close' : 'panel-right-open'} size={17} />
        </button>
      </div>
      {/* Faixa de FIXADA (estilo WhatsApp): hover muda a cor; clica -> rola até ela e cicla pra próxima */}
      {!selecting && pinAtual &&
      <div onClick={() => { scrollToMessage(pinAtual._id); if (fixadas.length > 1) setPinIdx((i) => (i + 1) % fixadas.length); }} title="Ir para a mensagem fixada"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)', padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, cursor: 'pointer', transition: 'background .12s' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-soft)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)'; }}>
        <Ic name="pin" size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-700)', letterSpacing: '.03em' }}>FIXADA{fixadas.length > 1 ? ` ${pinIdxSafe + 1}/${fixadas.length}` : ''}</div>
          <div style={{ fontSize: 'var(--type-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><strong style={{ color: 'var(--text)' }}>{pinAtual.from === 'client' ? conv.client : (auth.nome || 'Você')}: </strong>{pinAtual.kind === 'text' ? (pinAtual.text || '') : (pinAtual.kind === 'image' ? '📷 Foto' : pinAtual.kind === 'video' ? '🎬 Vídeo' : pinAtual.kind === 'audio' ? '🎙️ Áudio' : '📄 ' + (pinAtual.filename || 'Documento'))}</div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); toggleFlag(pinAtual, 'fixada'); }} title="Desafixar"
          style={{ border: 'none', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .15s, color .15s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'color-mix(in oklab, #FF452A 16%, transparent)'; e.currentTarget.style.color = '#FF452A'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-faint)'; }}>
          <Ic name="x" size={14} />
        </button>
      </div>}
      <div ref={scrollRef} onScroll={onScrollMsgs} className="scroll" style={{ flex: 1, overflow: 'auto', padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {loadingMsgs ? <ChatSkeleton /> :
         bubbles.length === 0 ? <div className="muted" style={{ margin: 'auto' }}>Nenhuma mensagem ainda.</div> :
         bubbles.map((m, i) => <Bubble key={m._id || i} m={m} client={conv.client} clientPhoto={conv.photo} agentName={auth.nome || 'Você'} agentPhoto={auth.foto || null}
           quoted={m.respondeA ? messages.find((x) => String(x._id) === String(m.respondeA)) : null}
           onAction={onMsgAction}
           selecting={selecting} selected={selectedIds.includes(m._id)}
           onToggleSelect={() => setSelectedIds((s) => s.includes(m._id) ? s.filter((x) => x !== m._id) : [...s, m._id])}
           onOpenMedia={(mm) => setLightbox(mm)} />)}
      </div>
      {slashOpen && qrList.length > 0 &&
      <div className="qr-slash">
        <style>{`@keyframes qrSlideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}} .qr-slash{border-top:1px solid var(--border);background:var(--surface);max-height:46%;overflow:auto;box-shadow:0 -8px 18px rgba(15,23,42,.07);animation:qrSlideUp .16s ease-out}`}</style>
        <div style={{ padding: '8px 14px', fontSize: 'var(--type-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.4px', position: 'sticky', top: 0, background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Ic name="zap" size={12} style={{ color: 'var(--accent)' }} /> Respostas rápidas{slashQuery ? ` · “${slashQuery}”` : ''}
        </div>
        {qrList.map((q, i) =>
        <div key={q.id} onMouseEnter={() => setQrIndex(i)} onClick={() => pickQuickReply(q)}
          style={{ padding: '9px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2, background: i === qrIndex ? 'var(--accent-soft)' : 'transparent', borderLeft: i === qrIndex ? '3px solid var(--accent)' : '3px solid transparent' }}>
          <span style={{ fontWeight: 600, fontSize: 'var(--type-sm)' }}>{q.comando}</span>
          <span className="muted" style={{ fontSize: 'var(--type-xs)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.mensagem}</span>
        </div>
        )}
      </div>
      }
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        {selecting ?
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => { setSelecting(false); setSelectedIds([]); }} title="Cancelar" style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 0, marginRight: 4 }}><Ic name="x" size={18} /></button>
          <span style={{ fontWeight: 600, flex: 1 }}>{selectedIds.length} selecionada{selectedIds.length === 1 ? '' : 's'}</span>
          <SelIconBtn icon="copy" color="#165EEE" title="Copiar" onClick={copiarSelecionadas} disabled={!selectedIds.length} />
          <SelIconBtn icon="star" color="#16a34a" title="Favoritar" onClick={favoritarSelecionadas} disabled={!selectedIds.length} />
          <SelIconBtn icon="trash" color="#FF452A" title="Apagar" onClick={() => selectedIds.length && setConfirmApagar({ bulk: true })} disabled={!selectedIds.length} />
        </div>
        : isPending ?
        (ultimaTransf ?
          <ReceivedCard m={ultimaTransf}>
            <div className="row" style={{ justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 2 }}>
              <span className="muted" style={{ fontSize: 'var(--type-sm)', marginRight: 'auto' }}>Inicie o atendimento para continuar.</span>
              <button className="btn btn-primary" onClick={() => assumir('Atendimento iniciado')}><Ic name="user" size={14} /> Atender</button>
            </div>
          </ReceivedCard> :
          <div className="row" style={{ gap: 10, padding: 14, border: '1px dashed color-mix(in oklab, var(--hue-amber) 50%, var(--border))', borderRadius: 10, background: 'color-mix(in oklab, var(--hue-amber) 6%, var(--surface))' }}>
            <Ic name="clock" size={18} style={{ color: 'var(--hue-amber)' }} />
            <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>Conversa recebida</div><div className="muted" style={{ fontSize: 'var(--type-sm)' }}>Inicie o atendimento para continuar.</div></div>
            <button className="btn btn-primary" onClick={() => assumir('Atendimento iniciado')}><Ic name="user" size={14} /> Atender</button>
          </div>) :
        localStatus === 'encerrada' ?
        <div className="row" style={{ gap: 10, padding: 14, border: '1px dashed var(--border-strong)', borderRadius: 10, background: 'var(--surface-2)' }}>
            <Ic name="check-double" size={18} style={{ color: 'var(--text-faint)' }} />
            <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>Conversa encerrada</div><div className="muted" style={{ fontSize: 'var(--type-sm)' }}>Você pode retomar o atendimento se o cliente voltar a interagir.</div></div>
            <button className="btn btn-primary" onClick={() => assumir('Atendimento retomado')}><Ic name="repeat" size={14} /> Retomar</button>
          </div> :
        <>
            <div className="row" style={{ gap: 6, marginBottom: 8 }}>
              <button className="btn btn-sm btn-ghost" onClick={() => setModal('devolver')}><Ic name="bot" size={13} /> Devolver à IA</button>
              <button className="btn btn-sm btn-ghost" onClick={() => setModal('transferir')}><Ic name="users" size={13} /> Transferir</button>
              <div className="spacer" />
              <button className="btn btn-sm btn-ghost" onClick={() => setModal('encerrar')}><Ic name="check" size={13} /> Encerrar</button>
            </div>
            {replyingTo && !selecting &&
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', marginBottom: 6, background: 'var(--surface-2)', borderLeft: '3px solid var(--accent)', borderRadius: 8 }}>
              <Ic name="reply" size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-700)' }}>Respondendo a {replyingTo.from === 'client' ? conv.client : (auth.nome || 'Você')}</div>
                <div className="muted" style={{ fontSize: 'var(--type-xs)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{replyingTo.kind === 'text' ? (replyingTo.text || '') : (replyingTo.kind === 'image' ? '📷 Foto' : replyingTo.kind === 'video' ? '🎬 Vídeo' : replyingTo.kind === 'audio' ? '🎙️ Áudio' : '📄 ' + (replyingTo.filename || 'Documento'))}</div>
              </div>
              <button onClick={() => setReplyingTo(null)} title="Cancelar resposta" style={{ border: 'none', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0 }}><Ic name="x" size={15} /></button>
            </div>}
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
            <VoiceRecorder onCancel={() => setRecording(false)} onSend={(blob) => {setRecording(false); if (blob && blob.size) { const ext = ((blob.type.split('/')[1] || 'webm').split(';')[0]).replace('mpeg', 'mp3'); enviarArquivo(new File([blob], 'audio.' + ext, { type: blob.type || 'audio/webm' })); } else { window.showToast({ tipo: 'erro', titulo: 'Falha na gravação', descricao: 'Não foi possível gravar o áudio (microfone?).' }); }}} /> :

            <>
                  <input ref={inputRef} className="input" placeholder="Digite sua mensagem · / abre as respostas rápidas · Enter envia" value={composing} onChange={(e) => onComposeChange(e.target.value)} onKeyDown={onKeyDown} />
                  <button className="btn btn-primary btn-icon" onClick={handleSend} disabled={!composing.trim()} style={{ width: 36, height: 36, borderStyle: "solid", opacity: composing.trim() ? 1 : 0.5 }}><Ic name="send" size={15} /></button>
                </>
            }
            </div>
          </>
        }
      </div>

      {modal === 'devolver' && <DevolverIAModal conv={conv} onClose={() => setModal(null)} onConfirm={({ reason }) => {setModal(null);setLocalHandler('agent');setLocalStatus('ativa');addAgentMessage({ kind: 'text', text: reason ? `Conversa devolvida à IA · motivo: ${reason}` : 'Conversa devolvida à IA', system: true });window.showToast({ tipo: 'info', titulo: 'Devolvida à IA', descricao: 'A IA voltou a responder esta conversa.' });}} />}
      {modal === 'transferir' && <TransferirModal conv={conv} onClose={() => setModal(null)} onConfirm={async ({ kind, target, note }) => {
        setModal(null);
        if (!conv._db) { setLocalStatus('pendente'); setLocalHandler('queue'); window.showToast({ tipo: 'sucesso', titulo: 'Conversa transferida', descricao: `Transferida para ${target.name}` }); return; }
        try {
          const notaTxt = (note || '').trim();             // nota é OPCIONAL: vazia -> não envia (sem erro)
          const dto = kind === 'agent'
            ? { atendenteId: target.id, atendenteNome: target.name, departamentoId: target.departamentoId != null ? target.departamentoId : null, departamentoNome: target.departamentoNome || null, ...(notaTxt ? { nota: notaTxt } : {}) } // a conversa segue o setor do dono
            : { departamentoId: target.id, departamentoNome: target.name, atendenteId: null, ...(notaTxt ? { nota: notaTxt } : {}) }; // depto -> volta pro pool do setor
          await API.transferirContato(conv.id, dto);
          addMarcador('nota', { de: { dept: conv.dept || null, atend: conv.owner || null }, para: { dept: kind === 'agent' ? (target.departamentoNome || null) : (target.name || null), atend: kind === 'agent' ? (target.name || null) : null }, nota: notaTxt || null, por: auth.nome || 'Você' });
          window.showToast({ tipo: 'sucesso', titulo: 'Transferência feita com sucesso', descricao: `Transferida para ${target.name}` });
          if (onConvChanged) onConvChanged(); // re-busca a lista (a conversa pode sair da minha visão pelo isolamento)
          if (onLeave) onLeave(); // deseleciona -> cai na "Tela de Bate Papo" (sem pular pra outra)
        } catch (e) {
          window.showToast({ tipo: 'erro', titulo: 'Falha ao transferir', descricao: e.message || 'Não foi possível transferir.' });
        }
      }} />}
      {modal === 'encerrar' && <EncerrarModal conv={conv} onClose={() => setModal(null)} onConfirm={({ label }) => {setModal(null);setLocalStatus('encerrada');addMarcador('encerramento', { dept: conv.dept || null, atend: conv.owner || auth.nome || 'Você' });mudarStatus('finalizado');window.showToast({ tipo: 'sucesso', titulo: 'Conversa encerrada', descricao: label });}} />}
      {confirmApagar && ReactDOM.createPortal(
        <Modal title={confirmApagar.bulk ? 'Apagar mensagens' : 'Apagar mensagem'} size="sm" onClose={() => setConfirmApagar(null)} footer={(close) => <>
          <button className="btn fin-btn-back" onClick={() => close()}>Voltar</button>
          <button className="btn btn-delete" onClick={() => close(() => { if (confirmApagar.bulk) apagarSelecionadas(); else if (confirmApagar.msg) apagarMsg(confirmApagar.msg); })}><Ic name="trash" size={12} /> Apagar</button>
        </>}>
          <div style={{ fontSize: 'var(--type-sm)' }}>{confirmApagar.bulk ? `Apagar ${selectedIds.length} mensagem${selectedIds.length === 1 ? '' : 's'} selecionada${selectedIds.length === 1 ? '' : 's'}?` : 'Tem certeza que deseja apagar esta mensagem?'} Ela será marcada como <strong>apagada</strong> para todos.</div>
        </Modal>, document.body)}
      {pinDurMsg && ReactDOM.createPortal(
        <Modal title="Fixar mensagem" size="sm" onClose={() => setPinDurMsg(null)} footer={(close) => <button className="btn fin-btn-back" onClick={() => close()}>Cancelar</button>}>
          <div style={{ fontSize: 'var(--type-sm)', color: 'var(--text-muted)', marginBottom: 12 }}>Por quanto tempo deseja fixar esta mensagem?</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {PIN_DURATIONS.map((d) => <button key={d.label} onClick={() => { const msg = pinDurMsg; setPinDurMsg(null); fixarComPrazo(msg, d.ms); }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '13px 10px', borderRadius: 12, border: '1.5px solid ' + d.color, background: 'color-mix(in oklab, ' + d.color + ' 12%, transparent)', color: d.color, fontWeight: 700, fontSize: 'var(--type-sm)', cursor: 'pointer', transition: 'background .15s, transform .1s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'color-mix(in oklab, ' + d.color + ' 24%, transparent)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'color-mix(in oklab, ' + d.color + ' 12%, transparent)'; e.currentTarget.style.transform = 'none'; }}>
              <Ic name="pin" size={15} /> {d.label}
            </button>)}
          </div>
        </Modal>, document.body)}
      {lightbox && ReactDOM.createPortal(
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,.82)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, animation: 'popIn .18s ease' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: '90vw', maxHeight: '78vh' }}>
            {lightbox.kind === 'image'
              ? <img src={lightbox.mediaUrl} alt={lightbox.filename || ''} style={{ maxWidth: '90vw', maxHeight: '78vh', borderRadius: 10, objectFit: 'contain', boxShadow: '0 12px 48px rgba(0,0,0,.5)' }} />
              : <video src={lightbox.mediaUrl} controls autoPlay playsInline style={{ maxWidth: '90vw', maxHeight: '78vh', borderRadius: 10, background: '#000' }} />}
          </div>
          {/* rodapé (56px) com os botões — cinza, hover colorido */}
          <div onClick={(e) => e.stopPropagation()} style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'var(--surface)', borderRadius: 14, padding: '0 18px', boxShadow: 'var(--shadow-lg)' }}>
            <SelIconBtn icon="download" color="#16a34a" title="Baixar" onClick={() => baixarMidiaUrl(lightbox.mediaUrl, lightbox.filename)} />
            <SelIconBtn icon="trash" color="#FF452A" title="Apagar" onClick={() => { const m = lightbox; setLightbox(null); setConfirmApagar({ msg: m }); }} />
            <SelIconBtn icon="x" color="#165EEE" title="Fechar" onClick={() => setLightbox(null)} />
          </div>
        </div>, document.body)}
      {showContactPicker && <ContactPickerModal onClose={() => setShowContactPicker(false)} onPick={(c) => { setShowContactPicker(false); enviarContato(c); }} /> }

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

// Card "Conversa Recebida" — usado no rodapé (enquanto pendente) e no histórico (após atender).
function ReceivedCard({ m, children }) {
  const temNota = (m.text || '').trim();
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
      <div className="row" style={{ gap: 8, alignItems: 'center', padding: '9px 14px', background: 'color-mix(in oklab, var(--hue-amber) 8%, var(--surface))', borderBottom: '1px solid var(--border)' }}>
        <Ic name="inbox" size={15} style={{ color: 'var(--hue-amber)', flexShrink: 0 }} />
        <strong style={{ fontSize: 'var(--type-sm)' }}>Conversa Recebida</strong>
        <span className="muted" style={{ marginLeft: 'auto', fontSize: 11 }}>{m.time}</span>
      </div>
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>Transferida por <strong style={{ color: 'var(--text)' }}>{m.autor || 'IA'}</strong>{m.origem ? <> · de <strong style={{ color: 'var(--text)' }}>{m.origem}</strong></> : ''}</div>
        {temNota &&
          <div className="row" style={{ gap: 10, alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: '#FDEEE7', color: '#FF8B30', border: '1px solid color-mix(in oklab, #FF8B30 24%, transparent)' }}>
            <div style={{ flex: 1, minWidth: 0, whiteSpace: 'pre-wrap', fontWeight: 500, fontSize: 'var(--type-sm)', lineHeight: 1.4 }}>{m.text}</div>
            <Ic name="alert" size={20} style={{ color: '#FF8B30', flexShrink: 0 }} />
          </div>
        }
        {children}
      </div>
    </div>);
}

// Rola até a mensagem citada (pelo data-msg-id) e dá um "flash" de destaque.
function scrollToMessage(id) {
  if (!id) return;
  const key = (window.CSS && CSS.escape) ? CSS.escape(String(id)) : String(id);
  const el = document.querySelector('[data-msg-id="' + key + '"]');
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.remove('msg-flash'); void el.offsetWidth; el.classList.add('msg-flash'); // reinicia a animação
  setTimeout(() => el.classList.remove('msg-flash'), 1500);
}

// Baixa a mídia VIA SERVIDOR (force attachment) -> download direto no PC, sem CORS.
function baixarMidiaUrl(url, nome) {
  if (!url) return;
  const u = '/api/chatbot/midia/download?url=' + encodeURIComponent(url) + '&nome=' + encodeURIComponent(nome || 'arquivo');
  const a = document.createElement('a'); a.href = u; a.download = nome || 'arquivo'; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
}

const MSG_MENU_ITEMS = [
  { id: 'responder', label: 'Responder', icon: 'reply' },
  { id: 'copiar', label: 'Copiar', icon: 'copy' },
  { id: 'fixar', label: 'Fixar', icon: 'pin' },
  { id: 'favoritar', label: 'Favoritar', icon: 'star' },
  { sep: true },
  { id: 'selecionar', label: 'Selecionar', icon: 'check-square' },
  { id: 'baixar', label: 'Baixar', icon: 'download' },
  { sep: true },
  { id: 'apagar', label: 'Apagar', icon: 'trash', danger: true },
];
// Popup renderizado via PORTAL (acima de tudo) e POSICIONADO em coordenadas fixas, com
// CLAMP dentro da coluna do meio (.conv-mid): nunca ultrapassa laterais/topo/rodapé.
function MessageMenu({ anchorRect, side, kind, onPick, onClose }) {
  const ref = React.useRef(null);
  const [pos, setPos] = React.useState(null);
  const isMedia = kind === 'image' || kind === 'video' || kind === 'audio' || kind === 'doc';
  const items = MSG_MENU_ITEMS.filter((it) => it.sep ? true : (it.id === 'baixar' ? isMedia : it.id === 'copiar' ? kind === 'text' : true));
  React.useLayoutEffect(() => {
    const el = ref.current; if (!el || !anchorRect) return;
    const menu = el.getBoundingClientRect();
    const midEl = document.querySelector('.conv-mid');
    const mid = midEl ? midEl.getBoundingClientRect() : { left: 0, right: window.innerWidth, top: 0, bottom: window.innerHeight };
    const W = menu.width || 214, H = menu.height || 290, PAD = 8;
    let left = side === 'right' ? (anchorRect.right - W) : anchorRect.left;
    let top = anchorRect.bottom + 4;                       // abre pra BAIXO do ícone
    if (top + H > mid.bottom - PAD) top = anchorRect.top - H - 4; // sem espaço embaixo -> abre pra CIMA
    left = Math.min(Math.max(left, mid.left + PAD), mid.right - W - PAD);  // clamp lateral
    top = Math.min(Math.max(top, mid.top + PAD), mid.bottom - H - PAD);    // clamp vertical
    setPos({ left, top });
  }, [anchorRect, side]);
  React.useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [onClose]);
  return ReactDOM.createPortal(
    <div ref={ref} className="msg-menu" onClick={(e) => e.stopPropagation()}
      style={{ position: 'fixed', zIndex: 9999, left: pos ? pos.left : (anchorRect ? anchorRect.left : 0), top: pos ? pos.top : (anchorRect ? anchorRect.bottom + 4 : 0), visibility: pos ? 'visible' : 'hidden' }}>
      {items.map((it, i) => it.sep ?
      <div key={'s' + i} className="msg-menu-sep" /> :
      <button key={it.id} className={'msg-menu-item' + (it.danger ? ' danger' : '')} onClick={() => onPick(it.id)}>
        <Ic name={it.icon} size={17} />{it.label}
      </button>)}
    </div>,
    document.body);
}

function Bubble({ m, client, clientPhoto, agentName, agentPhoto, quoted, onAction, selecting, selected, onToggleSelect, onOpenMedia }) {
  const [hover, setHover] = React.useState(false);   // mostra o ícone de opções no hover do balão
  const [menuAnchor, setMenuAnchor] = React.useState(null); // rect do botão (abre o popup) | null
  // ---- Marcadores de sistema (centrados): início · transferência · encerramento ----
  if (m.kind === 'nota' || m.kind === 'inicio' || m.kind === 'encerramento') {
    const chip = { fontSize: 'var(--type-xs)', padding: '5px 12px', borderRadius: 999, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: 6, textAlign: 'center', maxWidth: '92%', lineHeight: 1.4 };
    if (m.kind === 'nota') {
      // TRANSFERÊNCIA: de DEPTO (Atendente) para DEPTO (Atendente) · data às hora.
      // Mensagens antigas (sem JSON) caem no card "Conversa Recebida".
      if (!m.marca) {
        return (<div style={{ display: 'flex', justifyContent: 'center' }}><div style={{ maxWidth: '92%', width: '100%', animation: 'recebidaIn .42s cubic-bezier(.34,1.56,.64,1)' }}><ReceivedCard m={m} /></div></div>);
      }
      const parte = (p) => `${((p && p.dept) || '—').toUpperCase()}${(p && p.atend) ? ' (' + p.atend + ')' : ''}`;
      return (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <span className="muted" style={chip}>
            <Ic name="refresh" size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> Atendimento Transferido de {parte(m.marca.de)} para {parte(m.marca.para)} · {m.data} às {m.horaMarcador}
          </span>
        </div>);
    }
    // INÍCIO / ENCERRAMENTO: mesmo formato — data · Às hora · DEPTO (Atendente).
    const dept = m.marca && m.marca.dept;
    const atend = (m.marca && m.marca.atend) || m.autor;
    const ini = m.kind === 'inicio';
    return (
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <span className="muted" style={chip}>
          <Ic name={ini ? 'check' : 'check-double'} size={12} style={{ color: ini ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} /> {ini ? 'Atendimento iniciado' : 'Atendimento encerrado'} {m.data} · Às {m.horaMarcador}{dept ? ' · ' + (dept || '').toUpperCase() : ''}{atend ? ' (' + atend + ')' : ''}
        </span>
      </div>);
  }
  const isClient = m.from === 'client';
  const isAI = m.ai;
  const bgClient = 'var(--surface)';
  const bgAgent = isAI ? 'linear-gradient(135deg, var(--ai), color-mix(in oklab, var(--ai) 65%, var(--accent)))' : 'var(--accent)';
  return (
    <div data-msg-id={m._id} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={selecting ? onToggleSelect : undefined} style={{ display: 'flex', flexDirection: isClient ? 'row' : 'row-reverse', gap: 8, alignItems: 'flex-end', cursor: selecting ? 'pointer' : 'default', background: selecting && selected ? 'var(--accent-soft)' : 'transparent', borderRadius: 10, padding: selecting ? '3px 4px' : 0, transition: 'background .12s' }}>
      {selecting && <span style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid ' + (selected ? 'var(--accent)' : 'var(--border)'), background: selected ? 'var(--accent)' : 'transparent', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, alignSelf: 'center' }}>{selected && <Ic name="check" size={13} />}</span>}
      {isClient ? <Avatar name={client} src={clientPhoto} size="sm" /> : isAI ? <div className="avatar avatar-sm" style={{ background: 'linear-gradient(135deg, var(--ai), var(--accent))' }}><Ic name="sparkles" size={12} /></div> : <Avatar name={agentName || 'Você'} src={agentPhoto} size="sm" />}
      <div style={{ maxWidth: '70%' }}>
        {!isClient && isAI && <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ai-strong)', marginBottom: 3, letterSpacing: '.04em' }}>JÚLIA · IA</div>}
        <div style={{ position: 'relative', padding: '10px 14px', borderRadius: 14, borderBottomRightRadius: !isClient ? 4 : 14, borderBottomLeftRadius: isClient ? 4 : 14, background: isClient ? bgClient : bgAgent, color: isClient ? 'var(--text)' : 'white', fontSize: 'var(--type-sm)', boxShadow: isClient ? 'var(--shadow-sm)' : 'none', border: isClient ? '1px solid var(--border)' : 'none', pointerEvents: selecting ? 'none' : undefined }}>
          {/* botão de opções (invisível; aparece no hover do balão) — escondido em apagada/seleção */}
          {!selecting && !m.apagado && <button onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setMenuAnchor((a) => a ? null : r); }} title="Opções da mensagem" aria-label="Opções da mensagem"
            style={{ position: 'absolute', top: -8, [isClient ? 'left' : 'right']: -8, zIndex: 2, width: 26, height: 26, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, opacity: hover || menuAnchor ? 1 : 0, transform: hover || menuAnchor ? 'scale(1)' : 'scale(.8)', pointerEvents: hover || menuAnchor ? 'auto' : 'none', transition: 'opacity .15s ease, transform .15s ease' }}>
            <Ic name="chevron-down" size={14} />
          </button>}
          {menuAnchor && <MessageMenu anchorRect={menuAnchor} side={isClient ? 'left' : 'right'} kind={m.kind} onPick={(id) => { setMenuAnchor(null); onAction && onAction(id, m); }} onClose={() => setMenuAnchor(null)} />}
          {m.apagado ?
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontStyle: 'italic', opacity: .8 }}><Ic name="x-circle" size={14} /> Esta mensagem foi apagada</div>
          : m._uploading ?
          /* PRÉVIA DE UPLOAD: miniatura + barra de progresso (%) + cancelar */
          <div style={{ position: 'relative', minWidth: 200 }}>
            {(m.kind === 'image' || m.kind === 'video') && m._localUrl ?
            <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', maxWidth: 240 }}>
              {m.kind === 'image'
              ? <img src={m._localUrl} alt="" style={{ maxWidth: 240, maxHeight: 240, display: 'block', filter: 'brightness(.62)' }} />
              : <video src={m._localUrl} muted style={{ maxWidth: 240, maxHeight: 240, display: 'block', filter: 'brightness(.62)' }} />}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button onClick={() => m._xhr && m._xhr.abort()} title="Cancelar envio" style={{ width: 46, height: 46, borderRadius: '50%', border: '3px solid rgba(255,255,255,.9)', background: 'rgba(0,0,0,.35)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default' }}><Ic name="x" size={18} /></button>
              </div>
            </div> :
            <div className="row" style={{ gap: 10, alignItems: 'center', minWidth: 220 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ic name={m.kind === 'audio' ? 'mic' : 'file-text'} size={18} /></div>
              <div style={{ minWidth: 0, flex: 1 }}><div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.filename}</div><div style={{ fontSize: 11, opacity: .8 }}>{m.meta}</div></div>
              <button onClick={() => m._xhr && m._xhr.abort()} title="Cancelar envio" style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(255,255,255,.6)', background: 'transparent', color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default', flexShrink: 0 }}><Ic name="x" size={13} /></button>
            </div>
            }
            <div style={{ marginTop: 8 }}>
              <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,.3)', overflow: 'hidden' }}><div style={{ height: '100%', width: (m._progress || 0) + '%', background: 'white', borderRadius: 999, transition: 'width .15s ease' }} /></div>
              <div style={{ fontSize: 10, opacity: .9, marginTop: 3, textAlign: 'right' }}>{m._progress || 0}%</div>
            </div>
          </div>
          :
          <>
          {quoted && <div onClick={(e) => { e.stopPropagation(); scrollToMessage(quoted._id); }} title="Ir para a mensagem" style={{ cursor: 'pointer', borderLeft: '3px solid ' + (isClient ? 'var(--accent)' : 'rgba(255,255,255,.85)'), background: isClient ? 'var(--surface-2)' : 'rgba(255,255,255,.18)', borderRadius: 6, padding: '4px 8px', marginBottom: 6, maxWidth: 250 }}>
            <div style={{ fontSize: 11, fontWeight: 600, opacity: .95 }}>{quoted.from === 'client' ? client : (agentName || 'Você')}</div>
            <div style={{ fontSize: 11, opacity: .82, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{quoted.apagado ? 'Mensagem apagada' : (quoted.kind === 'text' ? (quoted.text || '') : (quoted.kind === 'image' ? '📷 Foto' : quoted.kind === 'video' ? '🎬 Vídeo' : quoted.kind === 'audio' ? '🎙️ Áudio' : '📄 ' + (quoted.filename || 'Documento')))}</div>
          </div>}
          {m.kind === 'text' && <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>}
          {m.kind === 'image' && m.mediaUrl &&
          <img src={m.mediaUrl} alt={m.filename || 'imagem'} onClick={() => onOpenMedia && onOpenMedia(m)} style={{ maxWidth: 240, maxHeight: 240, borderRadius: 8, display: 'block', cursor: 'pointer' }} />
          }
          {m.kind === 'video' && m.mediaUrl &&
          <div onClick={() => onOpenMedia && onOpenMedia(m)} style={{ position: 'relative', cursor: 'pointer', display: 'inline-block', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
            <video src={m.mediaUrl} muted playsInline preload="metadata" style={{ maxWidth: 260, maxHeight: 320, display: 'block' }} />
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}><span style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(0,0,0,.5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic name="play" size={20} /></span></span>
          </div>
          }
          {m.kind === 'audio' && (m.mediaUrl ?
          <AudioPlayer src={m.mediaUrl} isClient={isClient} avatarName={isClient ? client : (agentName || 'Você')} avatarSrc={isClient ? clientPhoto : agentPhoto} /> :
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
          </>}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 4, textAlign: isClient ? 'left' : 'right' }}>{m.fixada && <Ic name="pin" size={11} style={{ verticalAlign: 'middle', color: 'var(--accent)', marginRight: 3 }} />}{m.favoritada && <Ic name="star" size={11} style={{ verticalAlign: 'middle', color: '#f59e0b', marginRight: 3 }} />}{!isAI ? (isClient ? client : (agentName || 'Você')) + ' - ' : ''}{m.time}{!isClient && ' '}{!isClient && <Ic name="check-double" size={14} style={{ verticalAlign: 'middle' }} />}</div>
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


// Faixa verde (topo do painel): mostra o funil/fase REAL do contato no CRM e abre o
// popup pra atribuir/trocar. crm = { card|null, funis:[...] } (null = carregando).
function FunnelBar({ crm, onSave }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const t = setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', onDoc); };
  }, [open]);
  const loading = crm == null;
  const card = crm && crm.card;
  const incluso = !!card;
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => !loading && setOpen((o) => !o)}
        title={loading ? '' : (incluso ? 'Trocar fase/funil no CRM' : 'Atribuir ao CRM')}
        style={{ height: 40, minHeight: 40, boxSizing: 'border-box', padding: incluso ? '0 30px 0 14px' : '0 14px', background: incluso ? (card.faseCor || '#16a34a') : '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700, letterSpacing: '.04em', fontSize: 'var(--type-sm)', cursor: loading ? 'default' : 'pointer', position: 'relative', transition: 'background .2s ease' }}>
        {loading ? <span style={{ opacity: .8 }}>Carregando CRM…</span> :
         incluso ? <><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%' }}>{card.funilNome || 'Funil'}</span><span style={{ opacity: .9, fontWeight: 500, whiteSpace: 'nowrap' }}>({card.faseNome || '—'})</span></> :
         <><span>NÃO INCLUSO NO CRM</span><Ic name="plus" size={15} style={{ marginLeft: 2 }} /></>}
        {!loading && incluso && <Ic name="chevron-down" size={14} style={{ position: 'absolute', right: 12, opacity: .9, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s ease' }} />}
      </div>
      {open && crm && <FunnelPopup crm={crm} onSave={(fid) => { setOpen(false); onSave(fid); }} />}
    </div>);
}

// Popup (passo-a-passo): lista de funis -> escolhe um -> abre as colunas (fases) com
// "Voltar" no topo. Justificado à direita; sempre na 1ª fase (ou na atual).
function FunnelPopup({ crm, onSave }) {
  const funis = crm.funis || [];
  const card = crm.card;
  const [selFunilId, setSelFunilId] = React.useState(card && card.funilId != null ? card.funilId : null);
  const [selFaseId, setSelFaseId] = React.useState(card && card.faseId != null ? card.faseId : null);
  const [step, setStep] = React.useState(card && card.funilId != null ? 'fases' : 'funis');
  const selFunil = funis.find((f) => String(f.id) === String(selFunilId)) || null;
  const pickFunil = (fu) => {
    setSelFunilId(fu.id);
    const faseAtualAqui = (card && String(card.funilId) === String(fu.id)) ? card.faseId : null;
    setSelFaseId(faseAtualAqui != null ? faseAtualAqui : (fu.fases[0] ? fu.fases[0].id : null));
    setStep('fases');
  };
  return (
    <div className="funnel-pop" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 60, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 12px 34px rgba(0,0,0,.18)', overflow: 'hidden', animation: 'funnelGrowDown .2s ease-out' }}>
      {/* topo fica ESTÁTICO; o conteúdo empurra a altura pra baixo (anima max-height, não move o bloco) */}
      <style>{`@keyframes funnelGrowDown{from{max-height:0;opacity:.35}to{max-height:560px;opacity:1}}`}</style>
      {step === 'funis' ?
        <>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 'var(--type-sm)' }}>{card ? 'Mover no CRM' : 'Atribuir ao CRM'}</div>
          <div className="scroll" style={{ maxHeight: 320, overflow: 'auto', padding: 6 }}>
            {funis.length === 0 ? <div className="muted" style={{ padding: 18, textAlign: 'center', fontSize: 'var(--type-sm)' }}>Nenhum funil cadastrado no CRM.</div> :
             funis.map((fu) => (
               <div key={fu.id} className="crm-pop-item" onClick={() => pickFunil(fu)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 'var(--type-sm)' }}>
                 <span style={{ width: 10, height: 10, borderRadius: 3, background: fu.cor || '#22C55E', flexShrink: 0 }} />
                 <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fu.nome}</span>
                 <Ic name="chevron-down" size={14} style={{ color: 'var(--text-faint)', transform: 'rotate(-90deg)' }} />
               </div>))}
          </div>
        </> :
        <>
          <div className="row" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setStep('funis')} title="Voltar aos funis" style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--text-muted)', display: 'inline-flex', padding: 2 }}><Ic name="arrow-left" size={16} /></button>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: (selFunil && selFunil.cor) || '#22C55E', flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: 'var(--type-sm)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selFunil ? selFunil.nome : 'Funil'}</span>
          </div>
          <div className="funnel-fases scroll" style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: 6, maxHeight: 300, overflow: 'auto' }}>
            {(selFunil && selFunil.fases.length) ? selFunil.fases.map((fa) => {
              const fon = String(fa.id) === String(selFaseId);
              return (
                <div key={fa.id} className="crm-pop-fase" onClick={() => setSelFaseId(fa.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 'var(--type-sm)', border: `1px solid ${fon ? (fa.cor || 'var(--accent)') : 'var(--border)'}`, background: fon ? `color-mix(in oklab, ${fa.cor || 'var(--accent)'} 12%, var(--surface))` : 'var(--surface)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: fa.cor || '#94a3b8', flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: fon ? 700 : 500 }}>{fa.nome}</span>
                  {fon && <Ic name="check" size={14} style={{ color: fa.cor || 'var(--accent)' }} />}
                </div>);
            }) : <div className="muted" style={{ fontSize: 'var(--type-xs)', padding: '8px 10px' }}>Sem fases.</div>}
          </div>
          <div style={{ padding: 8, borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            <ActionButton action="salvar" size="md" label="Salvar" efeito={false} disabled={!selFaseId} onClick={() => selFaseId && onSave(selFaseId)} style={{ width: '100%', justifyContent: 'center', opacity: selFaseId ? 1 : .5 }} />
          </div>
        </>}
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
  const [showPDV, setShowPDV] = React.useState(false);
  const NewAppointment = window.NewAppointment;
  const PDVDrawer = window.PDVDrawer;
  const handleAppt = () => {
    // Se o pai delega (ex.: fila usa formulário próprio), encaminha; senão abre aqui (inbox).
    if (onAppointmentRequest) onAppointmentRequest();
    else setShowNewAppt(true);
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border)', gap: 0 }}>
      <button className="btn-action" onClick={() => setShowPDV(true)}><Ic name="cart" size={15} /> PDV de Venda</button>
      <span style={{ width: 1, height: 18, background: 'var(--border-strong)', margin: '0 14px' }} />
      <button className="btn-action" onClick={handleAppt}><Ic name="agenda" size={15} /> Agendamento</button>
      {showPDV && PDVDrawer &&
        <PDVDrawer
          cliente={{ name: conv?.client || '', clienteId: conv?.clienteId || null, phone: conv?.phone || '' }}
          onClose={() => setShowPDV(false)} />}
      {showNewAppt && NewAppointment &&
        <NewAppointment
          onClose={() => setShowNewAppt(false)}
          defaultParticipante={{ name: conv?.client || '', clienteId: conv?.clienteId || null, phone: conv?.phone || '' }}
          onSave={(dto) => { API.createAppt(dto)
            .then(() => window.showToast({ tipo: 'sucesso', titulo: 'Agendamento criado' }))
            .catch((e) => window.showToast({ tipo: 'erro', titulo: 'Erro ao agendar', descricao: e.message || 'Não foi possível criar o agendamento.' })); setShowNewAppt(false); }}
          defaultResponsible={currentUser || ''}
          lockResponsible={true} />}
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
  const [origens, setOrigens] = React.useState([]); // lista p/ o dropdown de Origem

  React.useEffect(() => {
    let alive = true;
    if (!conv.clienteId) { setCliente(null); setLoading(false); return; }
    const ck = 'cliente-' + conv.clienteId;
    const cached = window.screenCacheGet && window.screenCacheGet(ck);
    if (cached !== undefined) { setCliente(cached); setLoading(false); } else { setLoading(true); } // semeia do cache (instantâneo)
    API.getCliente(conv.clienteId)
      .then((r) => { if (alive) { setCliente(r.cliente); window.screenCacheSet && window.screenCacheSet(ck, r.cliente); } })
      .catch(() => { if (alive && cached === undefined) setCliente(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [conv.clienteId]);
  React.useEffect(() => { API.getOrigensLista().then((r) => setOrigens(r.origens || [])).catch(() => setOrigens([])); }, []);

  // [chave do DTO, rótulo, editável]
  const campos = [
    ['nome', 'Nome', true], ['telefone', 'Telefone', true], ['email', 'E-mail', true],
    ['empresa', 'Empresa', true], ['cargo', 'Cargo', true], ['produtoInteresse', 'Produto', true],
    ['origemLead', 'Origem', true], ['valor', 'Valor', false], ['criadoEm', 'Cadastro', false],
  ];
  // chave do DTO -> coluna do banco (só as editáveis)
  const COL = { nome: 'nome', telefone: 'telefone', email: 'email', empresa: 'empresa', cargo: 'cargo', produtoInteresse: 'produtointeresse', origemLead: 'origemlead' };
  const fmtTelefone = (v) => {
    let d = (v || '').replace(/\D/g, '');
    if (!d) return '—';
    if (d.length > 11 && d.startsWith('55')) d = d.slice(2); // tira o +55
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`; // celular c/ DDD
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`; // fixo c/ DDD
    if (d.length === 9) return `${d.slice(0, 5)}-${d.slice(5)}`;                     // celular s/ DDD
    if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4)}`;                     // fixo s/ DDD
    return v;
  };
  // Máscara AO VIVO p/ o input (limita a 11 dígitos: DDD + 9 e formata enquanto digita).
  const maskTelefone = (v) => {
    let d = (v || '').replace(/\D/g, '');
    if (d.length > 11 && d.startsWith('55')) d = d.slice(2); // tira o +55 colado
    d = d.slice(0, 11);                                       // teto: 2 (DDD) + 9 dígitos
    if (!d) return '';
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };
  const fmtVal = (k, v) => {
    if (k === 'valor') return v != null ? 'R$ ' + Number(v).toLocaleString('pt-BR') : '—';
    if (k === 'criadoEm') return v ? new Date(v).toLocaleDateString('pt-BR') : '—';
    if (k === 'telefone') return fmtTelefone(v);
    if (k === 'email') return v ? String(v).trim().toLowerCase() : '—';
    return v || '—';
  };
  const save = async () => {
    setSaving(true);
    const patch = {};
    Object.keys(COL).forEach((k) => { if ((draft[k] || '') !== (cliente[k] || '')) patch[COL[k]] = draft[k] === '' ? null : draft[k]; });
    try {
      if (Object.keys(patch).length) { const r = await API.updateCliente(conv.clienteId, patch); setCliente(r.cliente); window.screenCacheSet && window.screenCacheSet('cliente-' + conv.clienteId, r.cliente); }
      setEditing(false);
    } catch (e) { /* mantém em edição */ }
    setSaving(false);
  };

  if (loading) return <FichaSkeleton />;
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
            <button className="btn btn-sm btn-ghost fin-btn-back" style={{ padding: '4px 8px' }} onClick={() => setEditing(false)}>Voltar</button>
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
              {k === 'origemLead' ? (
                <select className="input" style={{ height: 28, fontSize: 'var(--type-sm)' }} value={draft[k] || ''} onChange={e => setDraft(d => ({ ...d, [k]: e.target.value }))}>
                  <option value="">— Selecione —</option>
                  {origens.map((o) => <option key={o.id} value={o.nome}>{o.nome}</option>)}
                  {draft[k] && !origens.some((o) => o.nome === draft[k]) && <option value={draft[k]}>{draft[k]}</option>}
                </select>
              ) : k === 'telefone' ? (
                <input className="input" style={{ height: 28, fontSize: 'var(--type-sm)' }} value={draft[k] || ''} inputMode="tel" maxLength={16} placeholder="(00) 00000-0000" onChange={e => setDraft(d => ({ ...d, telefone: maskTelefone(e.target.value) }))} />
              ) : k === 'email' ? (
                <input className="input" style={{ height: 28, fontSize: 'var(--type-sm)' }} type="email" value={draft[k] || ''} onChange={e => setDraft(d => ({ ...d, [k]: e.target.value }))} onBlur={e => setDraft(d => ({ ...d, email: e.target.value.trim().toLowerCase() }))} />
              ) : (
                <input className="input" style={{ height: 28, fontSize: 'var(--type-sm)' }} value={draft[k] || ''} onChange={e => setDraft(d => ({ ...d, [k]: e.target.value }))} />
              )}
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
            <button className="btn btn-sm fin-btn-back" onClick={() => { setShowNew(false); setDraft({ shortcut: '', title: '', body: '' }); }}>Voltar</button>
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
              <button className="btn btn-sm fin-btn-back" onClick={() => setEditingId(null)}>Voltar</button>
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
  const [showManage, setShowManage] = React.useState(false);
  const [draftName, setDraftName] = React.useState('');
  const [draftColor, setDraftColor] = React.useState('#3b82f6');

  const loadTags = () => API.getTags().then((r) => setAllTags((r.tags || []).map(t => ({ id: t.id, name: t.nome, color: t.cor })))).catch(() => {});
  React.useEffect(() => { loadTags(); }, []);
  React.useEffect(() => { setClientTags((conv.tags || []).map(t => t.nome)); }, [conv.id]);
  const idOf = (name) => { const t = allTags.find(x => x.name === name); return t && t.id; };
  const colorOf = (name) => { const t = allTags.find(x => x.name === name); return (t && t.color) || '#71717a'; };
  const notify = () => { if (onDataChanged) onDataChanged(); };

  // adiciona a tag selecionada ao contato
  const addToClient = async (name) => {
    if (clientTags.includes(name)) return;
    const tagId = idOf(name); if (!tagId) return;
    setClientTags(t => [...t, name]);
    try { await API.assignTag(conv.id, { tagId }); notify(); window.showToast({ tipo: 'sucesso', titulo: 'Tag adicionada', descricao: name }); }
    catch (e) { window.showToast({ tipo: 'erro', titulo: 'Erro ao adicionar tag', descricao: e.message || 'Tente novamente.' }); }
  };
  const removeFromClient = async (name) => {
    const tagId = idOf(name);
    setClientTags(t => t.filter(x => x !== name));
    try { if (tagId) await API.removeTag(conv.id, tagId); notify(); window.showToast({ tipo: 'sucesso', titulo: 'Tag removida', descricao: name }); }
    catch (e) { window.showToast({ tipo: 'erro', titulo: 'Erro ao remover tag', descricao: e.message || 'Tente novamente.' }); }
  };
  // cria uma tag NOVA no catálogo (só na lista; não vincula ao contato automaticamente)
  const createTag = async () => {
    const nome = draftName.trim(); if (!nome) return;
    try { await API.createTag(nome, draftColor); await loadTags(); window.showToast({ tipo: 'sucesso', titulo: 'Tag criada', descricao: nome }); }
    catch (e) { window.showToast({ tipo: 'erro', titulo: 'Erro ao criar tag', descricao: e.message || 'Tente novamente.' }); }
    setDraftName(''); setDraftColor('#3b82f6');
  };
  // apaga a tag do catálogo (e remove do contato, se estiver)
  const deleteTag = async (name) => {
    const tagId = idOf(name); if (!tagId) return;
    try { await API.deleteTag(tagId); await loadTags(); setClientTags(t => t.filter(x => x !== name)); notify(); window.showToast({ tipo: 'sucesso', titulo: 'Tag excluída', descricao: name }); }
    catch (e) { window.showToast({ tipo: 'erro', titulo: 'Erro ao excluir tag', descricao: e.message || 'Tente novamente.' }); }
  };
  // chip estilo CRM: fundo claro + fonte na cor, sem borda
  const chip = (color) => ({ padding: '4px 10px', borderRadius: 999, fontSize: 'var(--type-xs)', fontWeight: 700, background: `${color}1A`, color, display: 'inline-flex', alignItems: 'center', gap: 6, lineHeight: 1.4 });

  return (
    <div style={{ padding: '14px 16px' }}>
      <div className="row">
        <span style={{ fontSize: 'var(--type-xs)', fontWeight: 700, letterSpacing: '.06em', color: 'var(--text-faint)' }}>TAGS</span>
        <div className="spacer" />
        <button className="btn btn-sm btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setShowManage(true)} title="Criar / gerenciar tags">
          <Ic name="plus" size={13} />
        </button>
      </div>

      {/* UMA lista COLETIVA: TODAS as tags da empresa. As ativas (no contato) ficam preenchidas;
          clique numa tag para adicionar/remover do contato. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {allTags.length === 0 && (
          <div className="muted" style={{ fontSize: 'var(--type-sm)', padding: 14, textAlign: 'center', border: '1px dashed var(--border-strong)', borderRadius: 8, width: '100%' }}>
            Nenhuma tag cadastrada · clique em + para criar
          </div>
        )}
        {allTags.map(t => {
          const isOn = clientTags.includes(t.name);
          return (
            <span key={t.id} onClick={() => isOn ? removeFromClient(t.name) : addToClient(t.name)} title={isOn ? 'Remover do contato' : 'Adicionar ao contato'}
              onMouseEnter={(e) => { e.currentTarget.style.background = isOn ? `${t.color}2E` : `${t.color}14`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = isOn ? `${t.color}1A` : 'transparent'; }}
              style={{ cursor: 'pointer', padding: '4px 10px', borderRadius: 999, fontSize: 'var(--type-xs)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, lineHeight: 1.4, background: isOn ? `${t.color}1A` : 'transparent', color: isOn ? t.color : 'var(--text-muted)', border: `1.5px solid ${isOn ? t.color + '55' : 'var(--border)'}`, transition: 'background .12s, color .12s' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: isOn ? t.color : 'transparent', border: `1.5px solid ${t.color}`, flexShrink: 0 }} />
              {t.name}
              {isOn && <Ic name="x" size={11} style={{ opacity: .8 }} />}
            </span>
          );
        })}
      </div>

      {/* Modal "Gerenciar tags" — cadastra/apaga no catálogo e seleciona p/ adicionar ao contato */}
      {showManage && ReactDOM.createPortal(
        <Modal title="Gerenciar tags" onClose={() => setShowManage(false)} footer={<><button className="btn fin-btn-back" onClick={() => setShowManage(false)}>Fechar</button></>}>
          <div className="col" style={{ gap: 14 }}>
            <div>
              <label className="label">Nova tag</label>
              <div className="row" style={{ gap: 6 }}>
                <input className="input" placeholder="Nome da tag" value={draftName} onChange={e => setDraftName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') createTag(); }} style={{ flex: 1 }} />
                <input type="color" className="input" value={draftColor} onChange={e => setDraftColor(e.target.value)} style={{ width: 46, padding: 2 }} />
                <button className="btn btn-primary" disabled={!draftName.trim()} style={{ opacity: draftName.trim() ? 1 : .5 }} onClick={createTag}><Ic name="plus" size={13} /></button>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--type-xs)', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Disponíveis · clique para adicionar</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {allTags.length === 0 && <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>Nenhuma tag cadastrada ainda.</div>}
                {allTags.map(t => {
                  const isOn = clientTags.includes(t.name);
                  return (
                    <span key={t.id} style={{ ...chip(t.color), opacity: isOn ? .55 : 1 }}>
                      <span onClick={() => !isOn && addToClient(t.name)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: isOn ? 'default' : 'pointer' }} title={isOn ? 'Já adicionada' : 'Adicionar ao contato'}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: isOn ? t.color : 'transparent', border: `1.5px solid ${t.color}`, flexShrink: 0 }} />
                        {t.name}
                      </span>
                      <Ic name="trash" size={11} style={{ opacity: .7, cursor: 'pointer' }} onClick={() => deleteTag(t.name)} title="Excluir tag" />
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </Modal>, document.body)}
    </div>
  );
}

function TabMidias({ conv }) {
  const [sub, setSub] = React.useState('foto');
  const [midias, setMidias] = React.useState(null); // null = carregando
  React.useEffect(() => {
    let alive = true;
    if (!conv || !conv._db) { setMidias([]); return; }
    const ck = 'midias-' + conv.id;
    const cached = window.screenCacheGet && window.screenCacheGet(ck);
    setMidias(cached !== undefined ? cached : null); // semeia do cache (instantâneo) ou null = carregando
    API.getMidias(conv.id)
      .then((r) => { if (alive) { const ui = (r.midias || []).map((m) => ({ ...m, _id: m.id, filename: m.titulo || 'arquivo', meta: [m.formato, m.tamanho ? fmtTamanho(m.tamanho) : null].filter(Boolean).join(' · '), time: fmtHora(m.criadoEm) })); setMidias(ui); window.screenCacheSet && window.screenCacheSet(ck, ui); } })
      .catch(() => { if (alive && cached === undefined) setMidias([]); });
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
              <div key={m._id} className="midia-item" onClick={() => scrollToMessage(m._id)} title="Ir para a mensagem" style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', background: 'var(--surface-2)' }}>
                <img src={m.midiaUrl} alt={m.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <span style={{ position: 'absolute', bottom: 6, left: 6, fontSize: 10, color: 'rgba(0,0,0,.6)', background: 'rgba(255,255,255,.7)', padding: '1px 5px', borderRadius: 3, fontWeight: 500 }}>{m.time}</span>
                <button className="midia-dl" title="Baixar" onClick={(e) => { e.stopPropagation(); baixarMidiaUrl(m.midiaUrl, m.filename); }}><Ic name="download" size={14} /></button>
              </div>
            )}
          </div> :
         sub === 'video' ?
          <div className="col" style={{ gap: 8 }}>
            {items.map((m) =>
              <div key={m._id} className="midia-item row" onClick={() => scrollToMessage(m._id)} title="Ir para a mensagem" style={{ gap: 10, padding: 10, background: 'var(--surface-2)', borderRadius: 8 }}>
                <div style={{ width: 54, height: 40, background: '#0a0a0a', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}><Ic name="play" size={14} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--type-sm)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.filename}</div>
                  <div className="muted" style={{ fontSize: 'var(--type-xs)' }}>{m.meta || m.time}</div>
                </div>
                <button className="midia-dl" title="Baixar" onClick={(e) => { e.stopPropagation(); baixarMidiaUrl(m.midiaUrl, m.filename); }}><Ic name="download" size={14} /></button>
              </div>
            )}
          </div> :
          <div className="col" style={{ gap: 6 }}>
            {items.map((m) =>
              <div key={m._id} className="midia-item row" onClick={() => scrollToMessage(m._id)} title="Ir para a mensagem" style={{ gap: 10, padding: 10, border: '1px solid var(--border)', borderRadius: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--accent-soft)', color: 'var(--accent-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ic name="file" size={15} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--type-sm)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.filename}</div>
                  <div className="muted" style={{ fontSize: 'var(--type-xs)' }}>{m.meta || m.time}</div>
                </div>
                <button className="midia-dl" title="Baixar" onClick={(e) => { e.stopPropagation(); baixarMidiaUrl(m.midiaUrl, m.filename); }}><Ic name="download" size={14} /></button>
              </div>
            )}
          </div>
        }
      </div>
    </div>);

}

function TabHistorico({ conv }) {
  const [hist, setHist] = React.useState(null); // null = carregando
  React.useEffect(() => {
    let alive = true;
    if (!conv || !conv._db) { setHist([]); return; }
    const ck = 'hist-' + conv.id;
    const cached = window.screenCacheGet && window.screenCacheGet(ck);
    setHist(cached !== undefined ? cached : null); // semeia do cache (instantâneo) ou null = carregando
    API.getHistorico(conv.id).then((r) => { if (alive) { const h = r.historico || []; setHist(h); window.screenCacheSet && window.screenCacheSet(ck, h); } }).catch(() => { if (alive && cached === undefined) setHist([]); });
    return () => { alive = false; };
  }, [conv && conv.id]);
  const fmtWhen = (at) => {
    if (!at) return '';
    const d = new Date(at); if (isNaN(d)) return '';
    const dd = String(d.getDate()).padStart(2, '0'), mm = String(d.getMonth() + 1).padStart(2, '0'), yy = String(d.getFullYear()).slice(2);
    const hh = String(d.getHours()).padStart(2, '0'), mi = String(d.getMinutes()).padStart(2, '0');
    return (d.toDateString() === new Date().toDateString() ? 'Hoje' : (dd + '/' + mm + '/' + yy)) + ' · ' + hh + 'h' + mi;
  };
  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ fontSize: 'var(--type-xs)', fontWeight: 700, letterSpacing: '.06em', color: 'var(--text-faint)' }}>LINHA DO TEMPO</div>
      {hist === null ? <div className="muted" style={{ padding: 14, textAlign: 'center' }}>Carregando…</div> :
       hist.length === 0 ? <div className="muted" style={{ padding: 18, textAlign: 'center', fontSize: 'var(--type-sm)' }}>Sem histórico ainda.</div> :
      <div style={{ marginTop: 14, position: 'relative', paddingLeft: 24 }}>
        <div style={{ position: 'absolute', left: 9, top: 0, bottom: 0, width: 2, background: 'var(--border)' }} />
        {hist.map((h, i) =>
        <div key={i} style={{ position: 'relative', paddingBottom: 14 }}>
            <div style={{ position: 'absolute', left: -21, top: 1, width: 20, height: 20, borderRadius: '50%', background: `color-mix(in oklab, ${h.color} 18%, var(--surface))`, color: h.color, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--surface)' }}>
              <Ic name={h.icon} size={11} />
            </div>
            <div style={{ fontSize: 'var(--type-sm)', fontWeight: 600 }}>{h.title}</div>
            {h.desc && <div className="muted" style={{ fontSize: 'var(--type-xs)', marginTop: 1 }}>{h.desc}</div>}
            <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 3, fontWeight: 500 }}>{fmtWhen(h.at)}</div>
          </div>
        )}
      </div>}
    </div>);
}

function NewQuickReplyModal({ onClose }) {
  return (
    <Modal title="Nova resposta rápida" onClose={onClose} footer={(close) => <><button className="btn fin-btn-back" onClick={() => close()}>Voltar</button><button className="btn btn-save" onClick={() => close()}>Salvar</button></>}>
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

function AIPanel({ conv, setComposing, inline, onAppointmentRequest, onDataChanged, onBack }) {
  const { tweaks, auth } = useStore();
  // Responsável = usuário REAL logado (auth.nome). Fallback p/ os nomes do modo demo.
  const currentUser = (auth && auth.nome) || (tweaks.profile === 'super'
    ? 'Magno Vieira'
    : tweaks.profile === 'atendente'
      ? 'Karla Zambelly'
      : 'Paulo Henrique');
  const [tab, setTab] = React.useState('ia');
  const [showQR, setShowQR] = React.useState(false);
  const [showTags, setShowTags] = React.useState(false);
  const [showUpload, setShowUpload] = React.useState(false);
  const [showCard, setShowCard] = React.useState(false);

  // CRM REAL do contato (funil/fase) — casa por clienteId. null = carregando.
  const [crm, setCrm] = React.useState(null);
  const reloadCrm = React.useCallback(() => {
    if (!conv.clienteId) { setCrm({ card: null, cards: [], funis: [] }); return; }
    API.getCrmDoContato(conv.clienteId)
      .then((r) => setCrm({ card: r.card || null, cards: r.cards || [], funis: r.funis || [] }))
      .catch(() => setCrm({ card: null, cards: [], funis: [] }));
  }, [conv.clienteId]);
  React.useEffect(() => { setCrm(null); reloadCrm(); }, [reloadCrm]);
  const salvarCrm = (faseId) => {
    if (!conv.clienteId) { window.showToast({ tipo: 'aviso', titulo: 'Contato sem cadastro', descricao: 'Este contato ainda não tem ficha de cliente.' }); return; }
    API.setCrmDoContato(conv.clienteId, faseId)
      .then(() => { reloadCrm(); window.showToast({ tipo: 'sucesso', titulo: crm && crm.card ? 'Movido no CRM' : 'Atribuído ao CRM' }); })
      .catch((e) => window.showToast({ tipo: 'erro', titulo: 'Erro no CRM', descricao: e.message || 'Não foi possível salvar.' }));
  };
  const fichaCard = {
    clienteId: conv.clienteId, _id: crm && crm.card ? crm.card.cardId : null,
    name: conv.client, company: '—', email: conv.email || '', phone: conv.phone || '',
    phase: crm && crm.card ? crm.card.faseId : null, value: 0, tags: [],
  };
  // Tira de funil/fases na ficha (+): modelo idêntico ao da ficha do super admin.
  const crmStrip = crm ? {
    funis: crm.funis || [],
    card: crm.card ? { funilId: crm.card.funilId, faseId: crm.card.faseId } : null,
    onSelectFase: (faseId) => salvarCrm(faseId),
  } : null;

  return (
    <div style={{ borderLeft: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      {onBack && <div className="row" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', gap: 8, flexShrink: 0 }}><button className="btn btn-ghost btn-icon" onClick={onBack} title="Voltar" style={{ width: "30px", height: "30px" }}><Ic name="arrow-left" size={18} /></button><span style={{ fontWeight: 600, fontSize: 'var(--type-sm)' }}>Contexto do cliente</span></div>}
      <FunnelBar crm={crm} onSave={salvarCrm} />
      <AvatarHero conv={conv} onUpload={() => setShowUpload(true)} onAddCard={() => setShowCard(true)} />
      <ActionButtons conv={conv} currentUser={currentUser} inline={inline} onAppointmentRequest={onAppointmentRequest} />
      <TabBar active={tab} onChange={setTab} />
      <div className="scroll" style={{ flex: 1, overflow: 'auto' }}>
        {tab === 'ia' && <TabIA conv={conv} setComposing={setComposing} />}
        {tab === 'ficha' && <TabFicha conv={conv} />}
        {tab === 'respostas' && <TabRespostas setComposing={setComposing} onNew={() => setShowQR(true)} inline={inline} />}
        {tab === 'tags' && <TabTags conv={conv} onManage={() => setShowTags(true)} inline={inline} onDataChanged={onDataChanged} />}
        {tab === 'midias' && <TabMidias conv={conv} />}
        {tab === 'historico' && <TabHistorico conv={conv} />}
      </div>
      {showQR && !inline && <NewQuickReplyModal onClose={() => setShowQR(false)} />}
      {showTags && !inline && <TagsManagerModal onClose={() => setShowTags(false)} />}
      {showCard && <CRMCardDetail card={fichaCard} crmStrip={crmStrip} onSaved={() => reloadCrm()} onClose={() => setShowCard(false)} />}
      {showUpload && !inline &&
      <Modal title="Foto do cliente" onClose={() => setShowUpload(false)} footer={(close) => <><button className="btn fin-btn-back" onClick={() => close()}>Voltar</button><button className="btn btn-save" onClick={() => close()}>Salvar</button></>}>
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
  const items = useNotifs();
  React.useEffect(() => { if (typeof refreshNotifs === 'function') refreshNotifs(); }, []);
  const map = { queue: ['inbox', 'var(--accent)'], urgent: ['flag', '#ef4444'], transfer: ['users', 'var(--hue-blue)'], schedule: ['agenda', 'var(--hue-violet)'], lead: ['leads', 'var(--accent)'], info: ['bell', 'var(--text-muted)'] };
  const unread = items.filter((n) => !n.read).length;
  return (
    <Page title="Notificações" subtitle="Alertas em tempo real" actions={unread > 0 ? <button className="btn" onClick={() => markAllNotifsRead()}><Ic name="check-double" size={14} /> Marcar todas como lidas</button> : null}>
      <div className="card">
        {items.length === 0 ?
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }}>
          <Ic name="bell" size={28} style={{ opacity: .4 }} />
          <div style={{ marginTop: 10, fontWeight: 600, color: 'var(--text-muted)' }}>Nenhuma notificação</div>
        </div> :
        items.map((n) => {
          const [ic, col] = map[n.kind] || ['bell', 'var(--text-muted)'];
          return (
            <div key={n.id} onClick={() => !n.read && markNotifRead(n.id)} className="row" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', gap: 12, background: n.read ? 'transparent' : 'var(--accent-soft)', cursor: n.read ? 'default' : 'pointer' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `color-mix(in oklab, ${col} 15%, var(--surface))`, color: col, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic name={ic} size={16} /></div>
              <div style={{ flex: 1 }}><div style={{ fontWeight: n.read ? 500 : 600, fontSize: 'var(--type-sm)' }}>{n.text}</div><div className="muted" style={{ fontSize: 'var(--type-xs)' }}>{relativeTime(n.createdAt)}</div></div>
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
    <Page title="Perfil do cliente" actions={<button className="btn fin-btn-back" onClick={back}><Ic name="chevron-left" size={14} /> Voltar</button>}>
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