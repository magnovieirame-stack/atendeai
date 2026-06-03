// my-agenda-drawer.jsx — Painel "Minha Agenda" do agente.
// Permite configurar horário de atendimento por dia da semana,
// bloquear/liberar slots manualmente e compartilhar um link público
// para que clientes possam agendar diretamente.

const MY_AG_WD = [
  { id: 1, abbr: 'SEG', full: 'Segunda' },
  { id: 2, abbr: 'TER', full: 'Terça' },
  { id: 3, abbr: 'QUA', full: 'Quarta' },
  { id: 4, abbr: 'QUI', full: 'Quinta' },
  { id: 5, abbr: 'SEX', full: 'Sexta' },
  { id: 6, abbr: 'SÁB', full: 'Sábado' },
  { id: 0, abbr: 'DOM', full: 'Domingo' },
];

const MY_AG_DEFAULT_AVAIL = {
  1: { on: true,  ranges: [{ from: '09:00', to: '12:00' }, { from: '14:00', to: '18:00' }] },
  2: { on: true,  ranges: [{ from: '09:00', to: '12:00' }, { from: '14:00', to: '18:00' }] },
  3: { on: true,  ranges: [{ from: '09:00', to: '12:00' }, { from: '14:00', to: '18:00' }] },
  4: { on: true,  ranges: [{ from: '09:00', to: '12:00' }, { from: '14:00', to: '18:00' }] },
  5: { on: true,  ranges: [{ from: '09:00', to: '12:00' }, { from: '14:00', to: '17:00' }] },
  6: { on: false, ranges: [{ from: '09:00', to: '12:00' }] },
  0: { on: false, ranges: [{ from: '09:00', to: '12:00' }] },
};

// Generate slot times like 08:00, 08:30, …, 19:30
function myAgGenSlots(stepMin = 30, dayStart = 7, dayEnd = 20) {
  const out = [];
  for (let m = dayStart * 60; m < dayEnd * 60; m += stepMin) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return out;
}

function myAgTimeToMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Build "default availability map" from weekly availability config
function myAgBuildAvailMap(avail, slots) {
  const map = {};
  MY_AG_WD.forEach(wd => {
    map[wd.id] = {};
    const cfg = avail[wd.id];
    slots.forEach(slot => {
      if (!cfg.on) { map[wd.id][slot] = 'blocked'; return; }
      const m = myAgTimeToMin(slot);
      const inside = cfg.ranges.some(r => m >= myAgTimeToMin(r.from) && m < myAgTimeToMin(r.to));
      map[wd.id][slot] = inside ? 'available' : 'blocked';
    });
  });
  return map;
}

// ============================================================================
// Main drawer
// ============================================================================
function MyAgendaDrawer({ agentName = 'Júlia', agentTitle = 'Atendimento', onClose }) {
  const [tab, setTab] = React.useState('horarios');
  const [slotDuration, setSlotDuration] = React.useState(30);
  const [bufferMin, setBufferMin] = React.useState(0);
  const [advanceMin, setAdvanceMin] = React.useState(60);
  const [horizon, setHorizon] = React.useState(30); // days ahead
  const [avail, setAvail] = React.useState(MY_AG_DEFAULT_AVAIL);
  // overrides: { 'wd-slot': 'blocked' | 'available' } — per-weekday template overrides
  const [overrides, setOverrides] = React.useState({
    '2-10:00': 'blocked', // exemplo: ter 10h ocupado
    '4-15:30': 'blocked', // exemplo: qui 15h30 ocupado
  });

  const slots = React.useMemo(() => myAgGenSlots(slotDuration), [slotDuration]);
  const baseMap = React.useMemo(() => myAgBuildAvailMap(avail, slots), [avail, slots]);

  // Final state per slot: blocked|available|busy
  const stateFor = (wdId, slot) => {
    const key = `${wdId}-${slot}`;
    if (overrides[key]) return overrides[key];
    return baseMap[wdId][slot];
  };

  const toggleSlot = (wdId, slot) => {
    const cur = stateFor(wdId, slot);
    const key = `${wdId}-${slot}`;
    setOverrides(prev => {
      const next = { ...prev };
      if (cur === 'available') next[key] = 'blocked';
      else if (cur === 'blocked' && baseMap[wdId][slot] === 'available') next[key] = 'available';
      else delete next[key];
      return next;
    });
  };

  const publicLink = `atende.ai/agendar/${agentName.toLowerCase()}-iguabela`;
  const fullLink = `https://${publicLink}`;

  return (
    <Drawer
      title="Minha Agenda"
      subtitle={`Configure horários disponíveis e compartilhe seu link público de agendamento`}
      onClose={onClose}
      width={920}
      footer={
        <>
          <div className="muted" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Ic name="check" size={12} style={{ color: 'var(--accent)' }} /> Salvo automaticamente
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>Fechar</button>
          <button className="btn btn-primary" onClick={onClose}><Ic name="check" size={14} /> Aplicar configuração</button>
        </>
      }
    >
      <MyAgendaStyles />

      {/* Public link banner — always visible */}
      <MyAgPublicLinkCard link={fullLink} display={publicLink} agentName={agentName} agentTitle={agentTitle} />

      {/* Tab nav */}
      <div className="myag-tabs">
        {[
          ['horarios',   'Disponibilidade',   'clock'],
          ['semana',     'Esta semana',       'calendar'],
          ['preview',    'Página pública',    'external-link'],
          ['regras',     'Regras',            'settings'],
        ].map(([id, label, icon]) => (
          <button key={id} className={`myag-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            <Ic name={icon} size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'horarios' && (
        <MyAgHoursPanel avail={avail} setAvail={setAvail} slotDuration={slotDuration} />
      )}

      {tab === 'semana' && (
        <MyAgWeekPanel
          slots={slots}
          stateFor={stateFor}
          toggleSlot={toggleSlot}
          overrides={overrides}
          clearOverrides={() => setOverrides({})}
        />
      )}

      {tab === 'preview' && (
        <MyAgPublicPreview
          link={fullLink}
          agentName={agentName}
          agentTitle={agentTitle}
          slots={slots}
          stateFor={stateFor}
        />
      )}

      {tab === 'regras' && (
        <MyAgRulesPanel
          slotDuration={slotDuration} setSlotDuration={setSlotDuration}
          bufferMin={bufferMin} setBufferMin={setBufferMin}
          advanceMin={advanceMin} setAdvanceMin={setAdvanceMin}
          horizon={horizon} setHorizon={setHorizon}
        />
      )}
    </Drawer>
  );
}

// ============================================================================
// Public link card
// ============================================================================
function MyAgPublicLinkCard({ link, display, agentName, agentTitle }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    try { navigator.clipboard?.writeText(link); } catch (_) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="myag-link-card">
      <div className="myag-link-icon">
        <Ic name="link" size={20} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent-700)' }}>
          Link público de agendamento
        </div>
        <div className="myag-link-url" title={link}>
          <Ic name="lock" size={11} style={{ color: 'var(--accent-700)' }} /> {display}
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          Envie este link para clientes — eles escolhem um horário livre e agendam direto com {agentName}.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-sm" onClick={() => window.open(link, '_blank')} title="Abrir em nova aba">
          <Ic name="external-link" size={13} /> Abrir
        </button>
        <button
          className={`btn btn-sm ${copied ? '' : 'btn-primary'}`}
          onClick={copy}
          style={copied ? { background: 'var(--accent-soft)', color: 'var(--accent-700)', borderColor: 'var(--accent)' } : {}}
        >
          <Ic name={copied ? 'check' : 'copy'} size={13} /> {copied ? 'Copiado!' : 'Copiar link'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Tab 1 — Hours per weekday
// ============================================================================
function MyAgHoursPanel({ avail, setAvail, slotDuration }) {
  const setDay = (id, patch) => setAvail(a => ({ ...a, [id]: { ...a[id], ...patch } }));
  const addRange = (id) => {
    const last = avail[id].ranges[avail[id].ranges.length - 1];
    const start = last ? last.to : '14:00';
    const end = last ? '18:00' : '17:00';
    setDay(id, { ranges: [...avail[id].ranges, { from: start, to: end }] });
  };
  const removeRange = (id, idx) =>
    setDay(id, { ranges: avail[id].ranges.filter((_, i) => i !== idx) });
  const updateRange = (id, idx, patch) =>
    setDay(id, { ranges: avail[id].ranges.map((r, i) => i === idx ? { ...r, ...patch } : r) });

  const copyToAll = (sourceId) => {
    const src = avail[sourceId];
    const next = { ...avail };
    [1, 2, 3, 4, 5].forEach(id => { if (id !== sourceId) next[id] = { on: true, ranges: src.ranges.map(r => ({ ...r })) }; });
    setAvail(next);
  };

  return (
    <div className="myag-panel">
      <div className="myag-panel-head">
        <div>
          <div className="myag-h3">Horário de atendimento</div>
          <div className="muted" style={{ fontSize: 13 }}>
            Defina quando você está disponível em cada dia da semana. Os horários fora destas faixas ficam <strong style={{ color: 'var(--text)' }}>automaticamente bloqueados</strong>.
          </div>
        </div>
        <div className="myag-chip"><Ic name="clock" size={12} /> Slots de {slotDuration} min</div>
      </div>

      <div className="myag-days">
        {MY_AG_WD.map(wd => {
          const cfg = avail[wd.id];
          return (
            <div key={wd.id} className="myag-day-row" data-on={cfg.on}>
              <div className="myag-day-tag">
                <Toggle on={cfg.on} onChange={(v) => setDay(wd.id, { on: v })} compact />
                <div className="myag-day-name">
                  <div style={{ fontWeight: 600 }}>{wd.full}</div>
                  <div className="muted" style={{ fontSize: 11 }}>
                    {cfg.on
                      ? cfg.ranges.map(r => `${r.from}–${r.to}`).join(' · ')
                      : 'Indisponível'}
                  </div>
                </div>
              </div>

              {cfg.on ? (
                <div className="myag-ranges">
                  {cfg.ranges.map((r, i) => (
                    <div key={i} className="myag-range">
                      <TimeInput value={r.from} onChange={(v) => updateRange(wd.id, i, { from: v })} step={15} />
                      <span className="muted" style={{ fontSize: 12 }}>até</span>
                      <TimeInput value={r.to} onChange={(v) => updateRange(wd.id, i, { to: v })} step={15} />
                      {cfg.ranges.length > 1 && (
                        <button className="btn btn-ghost btn-icon" title="Remover faixa" onClick={() => removeRange(wd.id, i)}>
                          <Ic name="trash" size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button className="btn btn-sm myag-add-range" onClick={() => addRange(wd.id)}>
                    <Ic name="plus" size={11} /> Faixa
                  </button>
                </div>
              ) : (
                <div className="myag-off">
                  <Ic name="lock" size={12} /> Dia inteiro bloqueado
                </div>
              )}

              {wd.id >= 1 && wd.id <= 5 && cfg.on && (
                <button className="btn btn-ghost btn-sm myag-copy" title="Copiar para todos os dias úteis" onClick={() => copyToAll(wd.id)}>
                  <Ic name="copy" size={11} /> Aplicar a Seg–Sex
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="myag-hint">
        <Ic name="info" size={13} />
        <span>Os clientes só verão slots dentro destas faixas. Para bloquear um horário específico dentro da disponibilidade, vá em <strong>Esta semana</strong>.</span>
      </div>
    </div>
  );
}

// ============================================================================
// Tab 2 — Week grid for manual blocking
// ============================================================================
function MyAgWeekPanel({ slots, stateFor, toggleSlot, overrides, clearOverrides }) {
  // visible week ordered Seg→Dom
  const weekOrder = [1, 2, 3, 4, 5, 6, 0];
  const overrideCount = Object.keys(overrides).length;

  return (
    <div className="myag-panel">
      <div className="myag-panel-head">
        <div>
          <div className="myag-h3">Esta semana</div>
          <div className="muted" style={{ fontSize: 13 }}>
            Clique em qualquer slot para <strong style={{ color: 'var(--text)' }}>ocupar</strong> ou liberar. Slots verdes ficam visíveis no link público.
          </div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <div className="myag-legend">
            <span><span className="myag-dot avail" /> Livre</span>
            <span><span className="myag-dot busy" /> Ocupado</span>
            <span><span className="myag-dot blocked" /> Fora do horário</span>
          </div>
          {overrideCount > 0 && (
            <button className="btn btn-sm" onClick={clearOverrides}>
              <Ic name="refresh" size={12} /> Limpar ({overrideCount})
            </button>
          )}
        </div>
      </div>

      <div className="myag-week-wrap">
        <div className="myag-week-grid" style={{ gridTemplateColumns: `64px repeat(7, 1fr)` }}>
          <div />
          {weekOrder.map(id => {
            const wd = MY_AG_WD.find(w => w.id === id);
            return (
              <div key={id} className="myag-week-head">
                <div className="myag-wh-abbr">{wd.abbr}</div>
              </div>
            );
          })}

          {slots.map(slot => (
            <React.Fragment key={slot}>
              <div className="myag-week-hour">{slot}</div>
              {weekOrder.map(id => {
                const st = stateFor(id, slot);
                const key = `${id}-${slot}`;
                const isOverride = !!overrides[key];
                return (
                  <button
                    key={id}
                    className={`myag-slot myag-slot-${st}`}
                    onClick={() => toggleSlot(id, slot)}
                    title={`${MY_AG_WD.find(w => w.id === id).full} · ${slot} — ${st === 'available' ? 'Disponível' : st === 'blocked' ? 'Fora do horário' : 'Ocupado'}`}
                  >
                    {st === 'available' && '✓'}
                    {st === 'busy' && '×'}
                    {isOverride && <span className="myag-slot-edit" />}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Tab 3 — Public page preview (Calendly-style)
// ============================================================================
const MY_AG_MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MY_AG_WD_LONG = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const MY_AG_WD_MINI = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function MyAgPublicPreview({ link, agentName, agentTitle, slots, stateFor }) {
  const [phase, setPhase] = React.useState('pick'); // pick | form | done
  const [picked, setPicked] = React.useState(null);
  const [form, setForm] = React.useState({ nome: '', sobrenome: '', contato: '', email: '', local: 'Videochamada', assunto: '' });
  const [showCal, setShowCal] = React.useState(false);
  const [tz, setTz] = React.useState('Americas/Fortaleza');
  // start = monday of visible week
  const [weekStart, setWeekStart] = React.useState(() => {
    const today = new Date(2026, 4, 25); // segunda
    const d = new Date(today);
    const wd = d.getDay();
    const diff = wd === 0 ? -6 : 1 - wd;
    d.setDate(d.getDate() + diff);
    return d;
  });

  const visibleWeek = React.useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart); d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const monthLabel = `${MY_AG_MONTHS[weekStart.getMonth()]} ${weekStart.getFullYear()}`;

  const shiftWeek = (dir) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d);
  };

  const pickSlot = (date, slot) => {
    setPicked({ wd: date.getDay(), slot, date });
    setPhase('form');
  };

  const submit = (e) => {
    e?.preventDefault();
    if (!form.nome || !form.sobrenome || !form.contato || !form.email || !form.assunto) return;
    setPhase('done');
  };

  const goToDate = (d) => {
    const nd = new Date(d);
    const wd = nd.getDay();
    const diff = wd === 0 ? -6 : 1 - wd;
    nd.setDate(nd.getDate() + diff);
    setWeekStart(nd);
    setShowCal(false);
  };

  // For display: only show 6 time slots per day (10,11,14,15,16,17 like reference)
  const displaySlots = React.useMemo(() => {
    const wanted = ['10:00','11:00','14:00','15:00','16:00','17:00'];
    return wanted;
  }, []);

  return (
    <div className="myag-panel">
      <div className="myag-panel-head">
        <div>
          <div className="myag-h3">Pré-visualização da página pública</div>
          <div className="muted" style={{ fontSize: 13 }}>É exatamente o que seu cliente vê ao abrir o link.</div>
        </div>
        <div className="myag-chip" style={{ background: 'var(--ai-soft)', color: 'var(--ai-strong)' }}>
          <Ic name="sparkles" size={12} /> Demonstração
        </div>
      </div>

      {/* Browser-frame */}
      <div className="myag-browser">
        <div className="myag-browser-head">
          <div className="myag-browser-dots">
            <span /><span /><span />
          </div>
          <div className="myag-browser-bar">
            <Ic name="lock" size={11} /> {link}
          </div>
          <div style={{ width: 60 }} />
        </div>

        <div className="myag-pp2">
          {phase === 'pick' && (
            <>
              {/* Header */}
              <div className="myag-pp2-header">
                <div className="myag-pp2-logo">
                  <div className="myag-pp2-logo-inner">{(agentName || 'A').slice(0,1)}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="myag-pp2-name">
                    {agentName} <span style={{ color: 'var(--text-muted)' }}>|</span> {agentTitle}
                  </div>
                  <div className="myag-pp2-sub">Escolha um horário adequado para você.</div>
                </div>
              </div>

              {/* Toolbar */}
              <div className="myag-pp2-toolbar">
                <div className="myag-pp2-tz">
                  <Ic name="globe" size={13} />
                  <select value={tz} onChange={(e) => setTz(e.target.value)}>
                    <option>Americas/Fortaleza</option>
                    <option>America/Sao_Paulo</option>
                    <option>America/Recife</option>
                    <option>Europe/Lisbon</option>
                  </select>
                  <Ic name="chevron-down" size={12} />
                </div>
                <div style={{ flex: 1 }} />
                <div className="myag-pp2-month-label">{monthLabel}</div>
                <div style={{ position: 'relative' }}>
                  <button className="myag-pp2-iconbtn" onClick={() => setShowCal(s => !s)} title="Selecionar mês">
                    <Ic name="calendar" size={14} />
                  </button>
                  {showCal && (
                    <MyAgPopoverCalendar
                      anchorDate={weekStart}
                      onPick={goToDate}
                      onClose={() => setShowCal(false)}
                    />
                  )}
                </div>
                <button className="myag-pp2-iconbtn" onClick={() => shiftWeek(-1)} title="Semana anterior">
                  <Ic name="arrow-left" size={13} />
                </button>
                <button className="myag-pp2-iconbtn" onClick={() => shiftWeek(1)} title="Próxima semana">
                  <Ic name="arrow-right" size={13} />
                </button>
              </div>

              {/* Grid */}
              <div className="myag-pp2-grid">
                {visibleWeek.map((d, i) => {
                  const wd = d.getDay();
                  const isWeekend = wd === 0 || wd === 6;
                  const dayLabel = MY_AG_WD_LONG[wd];
                  return (
                    <div key={i} className="myag-pp2-col" data-faded={isWeekend}>
                      <div className="myag-pp2-col-head">
                        <div className="myag-pp2-col-wd">{dayLabel}</div>
                        <div className="myag-pp2-col-day">{String(d.getDate()).padStart(2, '0')}</div>
                      </div>
                      <div className="myag-pp2-col-slots">
                        {displaySlots.map(slot => {
                          const st = stateFor(wd, slot);
                          const ok = st === 'available';
                          return (
                            <button
                              key={slot}
                              className="myag-pp2-slot"
                              data-state={st}
                              disabled={!ok}
                              onClick={() => ok && pickSlot(d, slot)}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {phase === 'form' && (
            <div className="myag-pp2-form-wrap">
              <div className="myag-pp2-header">
                <div className="myag-pp2-logo">
                  <div className="myag-pp2-logo-inner">{(agentName || 'A').slice(0,1)}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="myag-pp2-name">{agentName} <span style={{ color: 'var(--text-muted)' }}>|</span> {agentTitle}</div>
                  <div className="myag-pp2-sub">
                    {picked && (
                      <>
                        <Ic name="clock" size={12} style={{ verticalAlign: '-2px', marginRight: 4, color: 'var(--accent)' }} />
                        {picked.date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} · {picked.slot}
                      </>
                    )}
                  </div>
                </div>
                <button className="btn btn-sm" onClick={() => { setPhase('pick'); setPicked(null); }}>
                  <Ic name="arrow-left" size={12} /> Trocar horário
                </button>
              </div>

              <form onSubmit={submit} className="myag-pp2-form">
                <div className="myag-pp2-form-title">Confirme seus dados</div>
                <div className="myag-form-grid">
                  <div>
                    <label className="label">Nome *</label>
                    <input className="input" placeholder="Maria" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Sobrenome *</label>
                    <input className="input" placeholder="Silva" value={form.sobrenome} onChange={e => setForm({ ...form, sobrenome: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Contato (WhatsApp) *</label>
                    <PhoneInput value={form.contato} onChange={v => setForm({ ...form, contato: v })} />
                  </div>
                  <div>
                    <label className="label">E-mail *</label>
                    <EmailInput value={form.email} onChange={v => setForm({ ...form, email: v })} placeholder="maria@email.com" />
                  </div>
                  <div>
                    <label className="label">Local</label>
                    <select className="input" value={form.local} onChange={e => setForm({ ...form, local: e.target.value })}>
                      <option>Videochamada</option>
                      <option>Presencial</option>
                      <option>Telefone</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="label">Assunto *</label>
                    <textarea className="input" rows={3} placeholder="Descreva brevemente o motivo do agendamento" value={form.assunto} onChange={e => setForm({ ...form, assunto: e.target.value })} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop: 16, height: 44, width: '100%' }}>
                  <Ic name="check" size={14} /> Confirmar agendamento
                </button>
              </form>
            </div>
          )}

          {phase === 'done' && (
            <div className="myag-pp-done" style={{ padding: '50px 30px' }}>
              <div className="myag-pp-done-icon"><Ic name="check" size={28} /></div>
              <div className="myag-pp-title" style={{ marginTop: 14 }}>Agendamento confirmado!</div>
              <div className="muted" style={{ fontSize: 14, marginTop: 6 }}>
                Enviamos os detalhes para <strong style={{ color: 'var(--text)' }}>{form.email}</strong> e um lembrete via WhatsApp.
              </div>
              <div className="myag-pp-receipt">
                <div className="row"><span className="muted">Quando</span><div className="spacer" />{picked.date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} · {picked.slot}</div>
                <div className="row"><span className="muted">Com</span><div className="spacer" />{agentName}</div>
                <div className="row"><span className="muted">Local</span><div className="spacer" />{form.local}</div>
                <div className="row"><span className="muted">Assunto</span><div className="spacer" style={{ minWidth: 8 }} /><span style={{ maxWidth: 260, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.assunto}</span></div>
              </div>
              <button className="btn" style={{ marginTop: 14 }} onClick={() => { setPhase('pick'); setPicked(null); setForm({ nome: '', sobrenome: '', contato: '', email: '', local: 'Videochamada', assunto: '' }); }}>
                <Ic name="refresh" size={13} /> Reiniciar demo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Mini popover calendar shown when clicking calendar icon
function MyAgPopoverCalendar({ anchorDate, onPick, onClose }) {
  const [cursor, setCursor] = React.useState(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1));
  const wrapRef = React.useRef(null);
  React.useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWd = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWd; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length < 42) cells.push(null);

  const weekStart = new Date(anchorDate);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
  const inWeek = (d) => {
    if (!d) return false;
    const date = new Date(year, month, d);
    return date >= weekStart && date <= weekEnd;
  };

  return (
    <div ref={wrapRef} className="myag-pp2-popover">
      <div className="myag-pp2-popover-head">
        <button className="myag-pp2-iconbtn" onClick={() => setCursor(new Date(year, month - 1, 1))}>
          <Ic name="arrow-left" size={12} />
        </button>
        <div className="myag-pp2-popover-title">{MY_AG_MONTHS[month]} {year}</div>
        <button className="myag-pp2-iconbtn" onClick={() => setCursor(new Date(year, month + 1, 1))}>
          <Ic name="arrow-right" size={12} />
        </button>
      </div>
      <div className="myag-pp2-popover-wd">
        {MY_AG_WD_MINI.map((w, i) => <div key={i}>{w}</div>)}
      </div>
      <div className="myag-pp2-popover-grid">
        {cells.map((c, i) => (
          <button
            key={i}
            className="myag-pp2-popover-day"
            data-active={inWeek(c)}
            disabled={!c}
            onClick={() => c && onPick(new Date(year, month, c))}
          >
            {c || ''}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Tab 4 — Rules
// ============================================================================
function MyAgRulesPanel({ slotDuration, setSlotDuration, bufferMin, setBufferMin, advanceMin, setAdvanceMin, horizon, setHorizon }) {
  return (
    <div className="myag-panel">
      <div className="myag-panel-head">
        <div>
          <div className="myag-h3">Regras de agendamento</div>
          <div className="muted" style={{ fontSize: 13 }}>Como o link público se comporta para os clientes.</div>
        </div>
      </div>

      <div className="myag-rules">
        <div className="myag-rule">
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>Duração de cada slot</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Tamanho de cada compromisso oferecido no link.</div>
          </div>
          <select className="input" value={slotDuration} onChange={e => setSlotDuration(Number(e.target.value))} style={{ width: 140 }}>
            <option value={15}>15 minutos</option>
            <option value={30}>30 minutos</option>
            <option value={45}>45 minutos</option>
            <option value={60}>60 minutos</option>
            <option value={90}>90 minutos</option>
          </select>
        </div>

        <div className="myag-rule">
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>Intervalo entre atendimentos</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Tempo de respiro entre um agendamento e outro.</div>
          </div>
          <select className="input" value={bufferMin} onChange={e => setBufferMin(Number(e.target.value))} style={{ width: 140 }}>
            <option value={0}>Sem intervalo</option>
            <option value={5}>5 minutos</option>
            <option value={10}>10 minutos</option>
            <option value={15}>15 minutos</option>
            <option value={30}>30 minutos</option>
          </select>
        </div>

        <div className="myag-rule">
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>Antecedência mínima</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Quanto antes o cliente precisa marcar.</div>
          </div>
          <select className="input" value={advanceMin} onChange={e => setAdvanceMin(Number(e.target.value))} style={{ width: 140 }}>
            <option value={0}>Pode agendar agora</option>
            <option value={30}>30 minutos</option>
            <option value={60}>1 hora</option>
            <option value={240}>4 horas</option>
            <option value={1440}>1 dia</option>
          </select>
        </div>

        <div className="myag-rule">
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>Janela de agendamento</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Quantos dias à frente ficam visíveis no link.</div>
          </div>
          <select className="input" value={horizon} onChange={e => setHorizon(Number(e.target.value))} style={{ width: 140 }}>
            <option value={7}>7 dias</option>
            <option value={14}>14 dias</option>
            <option value={30}>30 dias</option>
            <option value={60}>60 dias</option>
            <option value={90}>90 dias</option>
          </select>
        </div>

        <div className="myag-rule myag-rule-block">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Ic name="link" size={14} style={{ color: 'var(--accent)' }} /> <strong>Integrações de calendário</strong>
          </div>
          <div className="myag-integ-row">
            <div className="myag-integ-ic" style={{ background: '#fff', border: '1px solid var(--border)' }}>G</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>Google Calendar</div>
              <div className="muted" style={{ fontSize: 12 }}>Conflitos detectados automaticamente · sincronizado há 2 min</div>
            </div>
            <span className="badge badge-success">conectado</span>
          </div>
          <div className="myag-integ-row">
            <div className="myag-integ-ic" style={{ background: '#0078d4', color: 'white' }}>O</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>Outlook</div>
              <div className="muted" style={{ fontSize: 12 }}>Não conectado</div>
            </div>
            <button className="btn btn-sm">Conectar</button>
          </div>
        </div>

        <div className="myag-rule myag-rule-block">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Ic name="bell" size={14} style={{ color: 'var(--accent)' }} /> <strong>Notificações</strong>
          </div>
          <label className="myag-check"><input type="checkbox" defaultChecked /> Enviar confirmação por e-mail ao cliente</label>
          <label className="myag-check"><input type="checkbox" defaultChecked /> Enviar lembrete por WhatsApp 1h antes</label>
          <label className="myag-check"><input type="checkbox" defaultChecked /> Me notificar quando novo agendamento for criado</label>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================
function MyAgendaStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      .myag-link-card {
        display: flex; align-items: center; gap: 14px;
        padding: 14px 16px;
        border: 1px solid color-mix(in oklab, var(--accent) 32%, var(--border));
        background: linear-gradient(135deg, var(--accent-soft), color-mix(in oklab, var(--accent) 4%, var(--surface)));
        border-radius: 12px; margin-bottom: 16px;
      }
      .myag-link-icon {
        width: 40px; height: 40px; border-radius: 10px;
        background: var(--accent); color: white;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0; box-shadow: 0 4px 10px -2px color-mix(in oklab, var(--accent) 45%, transparent);
      }
      .myag-link-url {
        display: inline-flex; align-items: center; gap: 6px;
        margin-top: 6px; padding: 6px 10px;
        background: var(--surface); border: 1px solid var(--border);
        border-radius: 7px; font-family: ui-monospace, 'JetBrains Mono', monospace;
        font-size: 12.5px; color: var(--text);
        max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }

      .myag-tabs {
        display: flex; gap: 4px; padding: 4px; background: var(--surface-2);
        border: 1px solid var(--border); border-radius: 10px; margin-bottom: 18px;
      }
      .myag-tab {
        flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        height: 36px; padding: 0 10px; border: none; background: transparent;
        color: var(--text-muted); font-weight: 500; font-size: 13px;
        border-radius: 7px; cursor: pointer; transition: all .15s;
      }
      .myag-tab:hover { background: var(--surface); color: var(--text); }
      .myag-tab.active {
        background: var(--surface); color: var(--accent-700);
        font-weight: 600;
        box-shadow: 0 1px 3px rgba(0,0,0,.06), 0 0 0 1px var(--border);
      }

      .myag-panel { display: flex; flex-direction: column; gap: 14px; }
      .myag-panel-head {
        display: flex; align-items: flex-start; gap: 14px; flex-wrap: wrap;
      }
      .myag-panel-head > div:first-child { flex: 1; min-width: 0; }
      .myag-h3 {
        font-size: 16px; font-weight: 600; letter-spacing: -0.01em;
        margin: 0 0 4px;
      }
      .myag-chip {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 5px 10px; background: var(--accent-soft); color: var(--accent-700);
        border-radius: 999px; font-size: 11.5px; font-weight: 600;
      }

      /* Hours panel */
      .myag-days {
        display: flex; flex-direction: column; gap: 1px;
        background: var(--border); border: 1px solid var(--border);
        border-radius: 10px; overflow: hidden;
      }
      .myag-day-row {
        display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
        padding: 14px 16px; background: var(--surface);
      }
      .myag-day-row[data-on="false"] { background: var(--surface-2); }
      .myag-day-tag {
        display: flex; align-items: center; gap: 12px; min-width: 180px;
      }
      .myag-day-name { line-height: 1.2; }
      .myag-ranges {
        display: flex; align-items: center; gap: 10px; flex-wrap: wrap; flex: 1;
      }
      .myag-range {
        display: flex; align-items: center; gap: 6px;
        padding: 4px 6px 4px 4px; border: 1px solid var(--border); border-radius: 8px;
        background: var(--surface);
      }
      .myag-range .input { height: 32px; width: 92px; }
      .myag-add-range { color: var(--accent-700); border-color: var(--border-strong); }
      .myag-off {
        display: inline-flex; align-items: center; gap: 6px;
        font-size: 12.5px; color: var(--text-faint); font-style: italic;
        flex: 1;
      }
      .myag-copy { color: var(--text-muted); }

      .myag-hint {
        display: flex; align-items: flex-start; gap: 8px;
        padding: 10px 12px; border-radius: 8px;
        background: var(--surface-2); border: 1px dashed var(--border-strong);
        font-size: 12.5px; color: var(--text-muted);
      }
      .myag-hint > svg { margin-top: 2px; flex-shrink: 0; color: var(--accent); }

      /* Week panel */
      .myag-legend {
        display: inline-flex; gap: 12px; font-size: 11.5px; color: var(--text-muted);
        align-items: center;
      }
      .myag-legend > span { display: inline-flex; align-items: center; gap: 5px; }
      .myag-dot {
        width: 12px; height: 12px; border-radius: 4px; display: inline-block;
      }
      .myag-dot.avail { background: color-mix(in oklab, var(--accent) 22%, white); border: 1px solid color-mix(in oklab, var(--accent) 50%, white); }
      .myag-dot.busy { background: color-mix(in oklab, var(--hue-rose) 22%, white); border: 1px solid color-mix(in oklab, var(--hue-rose) 50%, white); }
      .myag-dot.blocked { background: var(--surface-3); border: 1px solid var(--border-strong); }

      .myag-week-wrap {
        border: 1px solid var(--border); border-radius: 10px;
        overflow: auto; max-height: 460px; background: var(--surface);
      }
      .myag-week-grid {
        display: grid; gap: 2px;
        background: var(--border); padding: 2px;
      }
      .myag-week-head {
        background: var(--surface-2); padding: 8px 4px; text-align: center;
        position: sticky; top: -2px; z-index: 2;
        border-bottom: 1px solid var(--border);
      }
      .myag-wh-abbr {
        font-size: 11px; font-weight: 700; letter-spacing: .08em; color: var(--text-muted);
      }
      .myag-week-hour {
        background: var(--surface-2); padding: 0; height: 28px;
        font-size: 10.5px; font-variant-numeric: tabular-nums;
        color: var(--text-faint); display: flex; align-items: center; justify-content: flex-end;
        padding-right: 8px;
        position: sticky; left: -2px;
      }
      .myag-slot {
        background: var(--surface); border: none; height: 28px;
        font-size: 11px; font-weight: 600; cursor: pointer;
        position: relative; transition: all .12s;
        color: transparent;
      }
      .myag-slot-available {
        background: color-mix(in oklab, var(--accent) 14%, white);
        color: var(--accent-700);
      }
      .myag-slot-available:hover {
        background: color-mix(in oklab, var(--accent) 26%, white);
      }
      .myag-slot-busy {
        background: color-mix(in oklab, var(--hue-rose) 16%, white);
        color: #be123c;
      }
      .myag-slot-busy:hover {
        background: color-mix(in oklab, var(--hue-rose) 26%, white);
      }
      .myag-slot-blocked {
        background: var(--surface-2); cursor: not-allowed;
      }
      .myag-slot-blocked:hover { background: var(--surface-3); }
      .myag-slot-edit {
        position: absolute; top: 2px; right: 3px;
        width: 5px; height: 5px; border-radius: 50%;
        background: var(--accent-700);
      }

      /* Browser frame for public preview */
      .myag-browser {
        border: 1px solid var(--border-strong); border-radius: 12px; overflow: hidden;
        background: var(--surface); box-shadow: 0 10px 30px -10px rgba(15,23,42,.18);
      }
      .myag-browser-head {
        display: flex; align-items: center; gap: 10px;
        padding: 8px 12px; background: var(--surface-2);
        border-bottom: 1px solid var(--border);
      }
      .myag-browser-dots { display: inline-flex; gap: 5px; width: 60px; }
      .myag-browser-dots span {
        width: 10px; height: 10px; border-radius: 50%; background: var(--border-strong);
      }
      .myag-browser-dots span:first-child { background: #ff5f57; }
      .myag-browser-dots span:nth-child(2) { background: #febc2e; }
      .myag-browser-dots span:nth-child(3) { background: #28c840; }
      .myag-browser-bar {
        flex: 1; height: 26px; border-radius: 6px;
        background: var(--surface); border: 1px solid var(--border);
        display: inline-flex; align-items: center; gap: 6px; padding: 0 10px;
        font-family: ui-monospace, monospace; font-size: 11.5px;
        color: var(--text-muted);
      }
      .myag-browser-body {
        display: grid; grid-template-columns: 240px 1fr; min-height: 420px;
      }

      /* === Calendly-style public preview === */
      .myag-pp2 {
        background: #fff;
        min-height: 560px;
        display: flex; flex-direction: column;
      }
      [data-theme="dark"] .myag-pp2 { background: var(--surface); }

      .myag-pp2-header {
        display: flex; align-items: center; gap: 22px;
        padding: 30px 56px 18px; background: #fff;
      }
      [data-theme="dark"] .myag-pp2-header { background: var(--surface); }

      .myag-pp2-logo {
        width: 88px; height: 88px; border-radius: 50%;
        background: #fff; border: 1px solid var(--border);
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0; box-shadow: 0 2px 10px rgba(15,23,42,.06);
      }
      .myag-pp2-logo-inner {
        width: 74px; height: 74px; border-radius: 50%;
        background: #15366b; color: #fff;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: 36px; letter-spacing: -0.04em;
        text-transform: lowercase;
      }
      .myag-pp2-name {
        font-size: 22px; font-weight: 700; letter-spacing: -0.01em;
        color: var(--text); line-height: 1.2;
      }
      .myag-pp2-sub {
        margin-top: 6px; color: var(--text-muted); font-size: 14px;
      }

      .myag-pp2-toolbar {
        display: flex; align-items: center; gap: 10px;
        padding: 16px 56px;
        background: #fff;
      }
      [data-theme="dark"] .myag-pp2-toolbar { background: var(--surface); }

      .myag-pp2-tz {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 8px 12px; border: 1px solid var(--border-strong);
        background: #fff; border-radius: 6px;
        font-size: 13px; color: var(--text);
        position: relative;
      }
      [data-theme="dark"] .myag-pp2-tz { background: var(--surface); }
      .myag-pp2-tz svg:first-child { color: var(--text-muted); }
      .myag-pp2-tz select {
        appearance: none; border: none; background: transparent;
        font: inherit; color: inherit; outline: none;
        padding-right: 14px; cursor: pointer; min-width: 140px;
      }
      .myag-pp2-tz > svg:last-child { color: var(--text-muted); pointer-events: none; }

      .myag-pp2-month-label {
        font-size: 14px; font-weight: 500; color: var(--text);
        padding: 0 8px;
      }
      .myag-pp2-iconbtn {
        width: 30px; height: 30px; border-radius: 6px;
        border: 1px solid transparent; background: transparent;
        color: var(--text-muted); display: inline-flex;
        align-items: center; justify-content: center;
        cursor: pointer; transition: all .12s;
      }
      .myag-pp2-iconbtn:hover {
        background: var(--surface-2); color: var(--text);
        border-color: var(--border);
      }

      .myag-pp2-grid {
        flex: 1; display: grid; grid-template-columns: repeat(7, 1fr);
        background: #f4f6f8; padding: 22px 56px 40px;
        gap: 24px;
      }
      [data-theme="dark"] .myag-pp2-grid { background: var(--surface-2); }

      .myag-pp2-col { display: flex; flex-direction: column; }
      .myag-pp2-col[data-faded="true"] { opacity: 0.4; pointer-events: none; }

      .myag-pp2-col-head {
        text-align: center; margin-bottom: 10px;
      }
      .myag-pp2-col-wd {
        font-size: 13px; font-weight: 500; color: var(--text-muted);
        margin-bottom: 2px;
      }
      .myag-pp2-col-day {
        font-size: 32px; font-weight: 600; color: var(--text);
        letter-spacing: -0.02em; line-height: 1.1;
        font-variant-numeric: tabular-nums;
      }

      .myag-pp2-col-slots {
        display: flex; flex-direction: column; gap: 10px;
      }
      .myag-pp2-slot {
        height: 38px; padding: 0 6px;
        border: 1.5px solid #1d4ed8;
        background: #fff; color: #1d4ed8;
        font-size: 14px; font-weight: 500; font-variant-numeric: tabular-nums;
        border-radius: 4px; cursor: pointer;
        transition: all .12s;
        font-family: inherit;
      }
      [data-theme="dark"] .myag-pp2-slot {
        background: var(--surface); color: color-mix(in oklab, #3b82f6 80%, white);
        border-color: color-mix(in oklab, #3b82f6 70%, var(--surface));
      }
      .myag-pp2-slot:hover:not(:disabled) {
        background: #1d4ed8; color: #fff;
      }
      .myag-pp2-slot:disabled, .myag-pp2-slot[data-state="blocked"], .myag-pp2-slot[data-state="busy"] {
        border-color: #cbd5e1; color: #94a3b8; background: transparent;
        cursor: not-allowed;
      }
      [data-theme="dark"] .myag-pp2-slot:disabled {
        border-color: var(--border); color: var(--text-faint); background: transparent;
      }

      /* Popover calendar */
      .myag-pp2-popover {
        position: absolute; top: calc(100% + 6px); right: 0;
        width: 260px; padding: 12px;
        background: #fff; border: 1px solid var(--border);
        border-radius: 10px; box-shadow: 0 12px 32px rgba(15,23,42,.15);
        z-index: 30;
      }
      [data-theme="dark"] .myag-pp2-popover { background: var(--surface); }
      .myag-pp2-popover-head {
        display: flex; align-items: center; gap: 6px;
        padding: 0 4px 10px;
      }
      .myag-pp2-popover-title {
        flex: 1; text-align: center;
        font-size: 13px; font-weight: 500; color: var(--text);
      }
      .myag-pp2-popover-wd {
        display: grid; grid-template-columns: repeat(7, 1fr);
        font-size: 11px; color: var(--text-muted); font-weight: 500;
        text-align: center; padding-bottom: 4px;
      }
      .myag-pp2-popover-grid {
        display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;
      }
      .myag-pp2-popover-day {
        aspect-ratio: 1; border: none; background: transparent;
        font-size: 12px; color: var(--text);
        font-variant-numeric: tabular-nums;
        border-radius: 50%; cursor: pointer;
        font-family: inherit;
        transition: all .12s;
      }
      .myag-pp2-popover-day:hover:not(:disabled) {
        background: var(--surface-3);
      }
      .myag-pp2-popover-day:disabled { color: transparent; cursor: default; }
      .myag-pp2-popover-day[data-active="true"] {
        background: color-mix(in oklab, #1d4ed8 14%, white);
        color: #1d4ed8; font-weight: 600;
      }

      /* Form & done states */
      .myag-pp2-form-wrap {
        padding: 30px 56px 40px;
      }
      .myag-pp2-form {
        max-width: 640px; margin: 30px auto 0;
        padding: 28px;
        background: var(--surface-2); border: 1px solid var(--border);
        border-radius: 12px;
      }
      .myag-pp2-form-title {
        font-size: 18px; font-weight: 600; letter-spacing: -0.01em;
        margin-bottom: 16px;
      }
      .myag-pp-title {
        font-size: 20px; font-weight: 600; letter-spacing: -0.015em;
      }
      .myag-pp-done {
        text-align: center; padding: 50px 30px;
      }
      .myag-pp-done-icon {
        width: 64px; height: 64px; border-radius: 50%;
        background: var(--accent-soft); color: var(--accent);
        display: inline-flex; align-items: center; justify-content: center;
        margin: 0 auto;
      }
      .myag-pp-receipt {
        margin: 18px auto 0; max-width: 480px;
        padding: 14px 16px;
        background: var(--surface-2); border: 1px solid var(--border);
        border-radius: 10px; text-align: left;
        display: flex; flex-direction: column; gap: 8px;
        font-size: 13px;
      }
      .myag-pp-receipt .spacer { flex: 1; }

      .myag-form-grid {
        display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
      }

      .myag-pp-done {
        text-align: center; padding: 30px 20px;
      }
      .myag-pp-done-icon {
        width: 64px; height: 64px; border-radius: 50%;
        background: var(--accent-soft); color: var(--accent);
        display: inline-flex; align-items: center; justify-content: center;
        margin: 0 auto;
      }
      .myag-pp-receipt {
        margin-top: 18px; padding: 14px 16px;
        background: var(--surface-2); border: 1px solid var(--border);
        border-radius: 10px; text-align: left;
        display: flex; flex-direction: column; gap: 8px;
        font-size: 13px;
      }
      .myag-pp-receipt .spacer { flex: 1; }

      /* Rules panel */
      .myag-rules {
        display: flex; flex-direction: column; gap: 1px;
        background: var(--border); border: 1px solid var(--border);
        border-radius: 10px; overflow: hidden;
      }
      .myag-rule {
        display: flex; align-items: center; gap: 14px;
        padding: 14px 16px; background: var(--surface);
      }
      .myag-rule-block { display: block; }
      .myag-integ-row {
        display: flex; align-items: center; gap: 10px;
        padding: 8px 0;
      }
      .myag-integ-row + .myag-integ-row { border-top: 1px dashed var(--border); }
      .myag-integ-ic {
        width: 32px; height: 32px; border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: 13px;
      }
      .myag-check {
        display: flex; align-items: center; gap: 8px;
        padding: 6px 0; font-size: 13px; cursor: pointer;
      }
    ` }} />
  );
}

Object.assign(window, { MyAgendaDrawer });
