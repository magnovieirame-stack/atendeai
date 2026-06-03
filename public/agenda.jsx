// agenda.jsx — Agenda: two-column layout (mini-cal sidebar + view canvas)

const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WD_FULL_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const WD_MINI_PT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

// Tipos de agendamento — ícones no padrão de linha do sistema (Ic), sem emoji colorido
const APPOINTMENT_TYPES = [
{ label: 'Reunião', icon: 'users' },
{ label: 'Atendimento', icon: 'phone' },
{ label: 'Comercial', icon: 'commercial' },
{ label: 'Treinamento', icon: 'star' },
{ label: 'Projeto', icon: 'columns' },
{ label: 'Evento', icon: 'calendar' },
{ label: 'Viagem', icon: 'send' },
{ label: 'Ausência', icon: 'sun' },
{ label: 'Pessoal', icon: 'user' },
{ label: 'Tarefa', icon: 'check-double' },
{ label: 'Financeiro', icon: 'coins' },
{ label: 'Gravação', icon: 'video' },
{ label: 'Outro', icon: 'pin' }];

const typeIcon = (label) => (APPOINTMENT_TYPES.find((t) => t.label === label) || { icon: 'tag' }).icon;

const ymd = (d) => `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

const DRAWER_W = 440; // largura unificada das abas de agendamento (novo / editar / visualizar)

// Inline: ícone + nome do tipo
function TypeTag({ type, size = 14 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Ic name={typeIcon(type)} size={size} /> {type}
    </span>);

}

// Lista suspensa de tipo de agendamento (com ícones)
function TypeSelect({ value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const click = (e) => {if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);};
    document.addEventListener('mousedown', click);
    return () => document.removeEventListener('mousedown', click);
  }, [open]);
  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button type="button" className="input" onClick={() => setOpen((o) => !o)}
      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
        <Ic name={typeIcon(value)} size={15} />
        <span style={{ flex: 1 }}>{value}</span>
        <Ic name="chevron-down" size={16} style={{ color: 'var(--text-muted)' }} />
      </button>
      {open &&
      <div style={{
        position: 'absolute', zIndex: 1000, top: 'calc(100% + 4px)', left: 0,
        background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 10,
        boxShadow: '0 12px 32px rgba(0,0,0,.18)', maxHeight: 280, overflowY: 'auto', width: '100%',
        animation: 'fmtFadeIn .15s ease-out', padding: 4
      }}>
          {APPOINTMENT_TYPES.map((t) =>
        <div key={t.label} data-active={t.label === value}
        onClick={() => {onChange(t.label);setOpen(false);}}
        style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '8px 11px', borderRadius: 6, cursor: 'pointer', fontSize: 'var(--type-sm)',
          background: t.label === value ? 'var(--accent)' : 'transparent',
          color: t.label === value ? '#fff' : 'var(--text)'
        }}
        onMouseEnter={(e) => {if (t.label !== value) e.currentTarget.style.background = 'var(--accent-soft)';}}
        onMouseLeave={(e) => {if (t.label !== value) e.currentTarget.style.background = 'transparent';}}>
              <Ic name={t.icon} size={16} />
              <span style={{ flex: 1 }}>{t.label}</span>
              {t.hint && <span style={{ fontSize: 11, opacity: .65 }}>{t.hint}</span>}
            </div>)}
        </div>}
    </div>);

}

function Agenda() {
  const [view, setView] = React.useState('month');
  const [cursor, setCursor] = React.useState(new Date(2026, 4, 11));
  const [showNew, setShowNew] = React.useState(false);
  const [newAt, setNewAt] = React.useState(null); // { date, time } prefill from empty slot
  const openNewAt = (date, time) => setNewAt({ date, time });
  const [showNewTask, setShowNewTask] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [showMyAgenda, setShowMyAgenda] = React.useState(false);
  const [animKey, setAnimKey] = React.useState(0);
  const [animDir, setAnimDir] = React.useState('right');
  const [active, setActive] = React.useState(null); // { appt, mode: 'view' | 'edit' }
  const [appts, setAppts] = React.useState(() => APPOINTMENTS.map((a) => ({ ...a })));
  const openView = (appt) => setActive({ appt, mode: 'view' });
  const openEdit = (appt) => setActive({ appt, mode: 'edit' });
  const removeAppt = (appt) => {setAppts((list) => list.filter((x) => x.id !== appt.id));setActive(null);};
  const addAppt = (appt) => setAppts((list) => [...list, appt]);
  const updateAppt = (updated) => {setAppts((list) => list.map((x) => x.id === updated.id ? updated : x));setActive({ appt: updated, mode: 'view' });};

  const animate = (dir = 'right') => {
    setAnimDir(dir);
    setAnimKey((k) => k + 1);
  };

  const changeView = (v) => {
    if (v === view) return;
    animate('right');
    setView(v);
  };

  const openDay = (date) => {
    setCursor(date);
    animate('right');
    setView('day');
  };

  const updateCursor = (next) => {
    setCursor(next);
    animate(next > cursor ? 'right' : 'left');
  };

  const shiftCursor = (dir) => {
    const d = new Date(cursor);
    if (view === 'month') d.setMonth(d.getMonth() + dir);else
    if (view === 'week') d.setDate(d.getDate() + 7 * dir);else
    d.setDate(d.getDate() + dir);
    setCursor(d);
    animate(dir > 0 ? 'right' : 'left');
  };

  const headerTitle = () => {
    if (view === 'tasks') return 'TAREFAS';
    if (view === 'month') return `${MONTHS_PT[cursor.getMonth()].toUpperCase()} DE ${cursor.getFullYear()}`;
    if (view === 'day') return `${cursor.getDate().toString().padStart(2, '0')} ${MONTHS_PT[cursor.getMonth()].toUpperCase()} ${cursor.getFullYear()}`;
    const start = new Date(cursor);start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);end.setDate(end.getDate() + 6);
    return `${start.getDate().toString().padStart(2, '0')} – ${end.getDate().toString().padStart(2, '0')} ${MONTHS_PT[end.getMonth()].toUpperCase()} ${end.getFullYear()}`;
  };

  return (
    <div className="screen">
      <AgendaStyles />
      <Topbar title="Agenda" subtitle="Agendamentos e tarefas" right={
      <div className="row" style={{ gap: 8 }}>
          <button
          className="btn"
          onClick={() => setShowMyAgenda(true)}
          style={{
            borderColor: 'color-mix(in oklab, var(--accent) 36%, var(--border))',
            color: 'var(--accent-700)',
            background: 'color-mix(in oklab, var(--accent) 8%, var(--surface))',
            fontWeight: 600,
            gap: 6
          }}
          title="Configurar horários e gerar link público de agendamento">
          
            <Ic name="agenda" size={14} /> Minha agenda
            <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 999,
            background: 'var(--accent)', color: 'white', letterSpacing: '.04em', textTransform: 'uppercase'
          }}>link público</span>
          </button>
        </div>
      } />
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '296px 1fr', overflow: 'hidden' }}>
        <AgendaSidebar
          view={view}
          changeView={changeView}
          cursor={cursor}
          setCursor={updateCursor}
          onSettings={() => setShowSettings(true)}
          onNew={() => view === 'tasks' ? setShowNewTask(true) : setShowNew(true)} />
        
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', background: 'var(--surface-2)' }}>
          <div className="agenda-header">
            <div className="agenda-title">{headerTitle()}</div>
            {view !== 'tasks' &&
            <div className="row" style={{ gap: 6 }}>
                <button className="agenda-nav" onClick={() => shiftCursor(-1)} title="Anterior"><Ic name="arrow-left" size={13} /></button>
                <button className="agenda-nav" onClick={() => shiftCursor(1)} title="Próximo"><Ic name="arrow-right" size={13} /></button>
              </div>
            }
            {view === 'tasks' &&
            <div className="agenda-header-strip"><DayStrip cursor={cursor} setCursor={updateCursor} /></div>
            }
            {view !== 'tasks' && <div style={{ flex: 1 }} />}
            {view === 'tasks' ?
            <MonthYearPicker cursor={cursor} onPick={updateCursor} /> :
            <button className="btn btn-ghost btn-sm" onClick={() => setCursor(new Date(2026, 4, 11))}>Hoje</button>}
          </div>
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <div key={animKey} className={`view-anim view-anim-${animDir}`} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
              {view === 'month' && <MonthView cursor={cursor} appts={appts} onView={openView} onEdit={openEdit} onDelete={removeAppt} onNewAt={openNewAt} onOpenDay={openDay} />}
              {view === 'week' && <WeekView cursor={cursor} appts={appts} onView={openView} onEdit={openEdit} onDelete={removeAppt} onNewAt={openNewAt} />}
              {view === 'day' && <DayView cursor={cursor} appts={appts} onView={openView} onEdit={openEdit} onDelete={removeAppt} onNewAt={openNewAt} />}
              {view === 'tasks' && <TasksView cursor={cursor} setCursor={updateCursor} />}
            </div>
          </div>
        </div>
      </div>
      {showNew && <NewAppointment onClose={() => setShowNew(false)} onSave={(a) => {addAppt(a);setShowNew(false);}} />}
      {newAt && <NewAppointment defaultDate={newAt.date} defaultTime={newAt.time} onClose={() => setNewAt(null)} onSave={(a) => {addAppt(a);setNewAt(null);}} />}
      {showNewTask && <NewTask onClose={() => setShowNewTask(false)} />}
      {active && active.mode === 'view' &&
      <AppointmentDetailDrawer
        appt={active.appt}
        onClose={() => setActive(null)}
        onDelete={() => removeAppt(active.appt)}
        onEdit={() => setActive({ appt: active.appt, mode: 'edit' })} />
      }
      {active && active.mode === 'edit' &&
      <AppointmentEditDrawer
        appt={active.appt}
        onClose={() => setActive(null)}
        onSave={updateAppt}
        onBack={() => setActive({ appt: active.appt, mode: 'view' })} />
      }
      {showSettings && <AgendaSettingsDrawer onClose={() => setShowSettings(false)} />}
      {showMyAgenda && <MyAgendaDrawer onClose={() => setShowMyAgenda(false)} agentName="Karla" agentTitle="Iguabela Beleza · Atendimento" />}
    </div>);

}

function AgendaSidebar({ view, changeView, cursor, setCursor, onNew, onSettings }) {
  const tabs = [
  { id: 'month', label: 'MÊS', icon: 'calendar' },
  { id: 'week', label: 'SEMANA', icon: 'calendar' },
  { id: 'day', label: 'DIA', icon: 'calendar' },
  { id: 'tasks', label: 'TAREFAS', icon: 'circle-check' }];

  return (
    <div className="agenda-side">
      <div className="agenda-side-head">
        <Ic name="dashboard" size={14} />
        <span style={{ flex: 1, fontSize: "16px" }}>MINHA AGENDA</span>
        <button className="agenda-cog" onClick={onSettings} title="Configurações"><Ic name="settings" size={15} /></button>
      </div>
      <button className="btn-novo" onClick={onNew} style={{ background: "linear-gradient(120deg, #4dfc83 0%, #fff943 100%)", color: "#111813" }}>
        {view === 'tasks' ? 'NOVA TAREFA' : 'NOVO AGENDAMENTO'}
      </button>
      <div className="view-tab-group">
        <div className="view-tab-ind" style={{ '--idx': Math.max(0, tabs.findIndex((t) => t.id === view)) }} />
        {tabs.map((t) =>
        <button key={t.id} className={`view-tab ${view === t.id ? 'active' : ''}`} onClick={() => changeView(t.id)} style={{ color: "rgb(26, 29, 33)" }}>
            <Ic name={t.icon} size={20} />
            <span>{t.label}</span>
          </button>
        )}
      </div>
      <MiniCalendar cursor={cursor} setCursor={setCursor} />
      <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: 'var(--text-faint)', textTransform: 'uppercase', padding: '0 2px' }}>Categorias</div>
        {[
        { c: 'var(--accent)', l: 'Atendimentos' },
        { c: 'var(--ai)', l: 'Agendado pela IA' },
        { c: 'var(--hue-amber)', l: 'Pessoal' },
        { c: 'var(--hue-rose)', l: 'Bloqueio' }].
        map((k, i) =>
        <div key={i} className="cat-row">
            <span className="cat-dot" style={{ background: k.c }} />
            <span style={{ flex: 1 }}>{k.l}</span>
            <span className="cat-check"><Ic name="check" size={11} /></span>
          </div>
        )}
      </div>
    </div>);

}

function MiniCalendar({ cursor, setCursor }) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startWd = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWd; i++) cells.push({ d: prevDays - startWd + 1 + i, cur: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ d, cur: true });
  while (cells.length < 42) cells.push({ d: cells.length - (startWd + daysInMonth) + 1, cur: false });

  const today = new Date(2026, 4, 11);
  const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const isSelected = (d) => d === cursor.getDate();

  const prev = () => setCursor(new Date(year, month - 1, Math.min(cursor.getDate(), 28)));
  const next = () => setCursor(new Date(year, month + 1, Math.min(cursor.getDate(), 28)));

  return (
    <div className="mini-cal">
      <div className="mini-cal-head">
        <button className="mini-nav" onClick={prev}><Ic name="arrow-left" size={11} /></button>
        <div className="mini-cal-title">{MONTHS_PT[month].toUpperCase()} {year}</div>
        <button className="mini-nav" onClick={next}><Ic name="arrow-right" size={11} /></button>
      </div>
      <div className="mini-cal-wd">
        {WD_MINI_PT.map((w, i) => <div key={i}>{w}</div>)}
      </div>
      <div className="mini-cal-grid">
        {cells.map((c, i) =>
        <button key={i} className="mini-day"
        data-current={c.cur} data-today={c.cur && isToday(c.d)} data-selected={c.cur && isSelected(c.d)}
        onClick={() => {if (c.cur) setCursor(new Date(year, month, c.d));}}>
            {c.d.toString().padStart(2, '0')}
          </button>
        )}
      </div>
    </div>);

}

function useEvPopover({ onView, onEdit, onDelete }) {
  const [hover, setHover] = React.useState(null); // { ev, rect }
  const [confirmDel, setConfirmDel] = React.useState(null);
  const closeTimer = React.useRef(null);

  const cancelHide = () => {if (closeTimer.current) {clearTimeout(closeTimer.current);closeTimer.current = null;}};
  const showPop = (ev, e) => {cancelHide();setHover({ ev, rect: e.currentTarget.getBoundingClientRect() });};
  const scheduleHide = () => {cancelHide();closeTimer.current = setTimeout(() => setHover(null), 140);};
  const hidePop = () => {cancelHide();setHover(null);};
  React.useEffect(() => () => cancelHide(), []);

  const evProps = (ev) => ({
    onMouseEnter: (e) => showPop(ev, e),
    onMouseLeave: scheduleHide,
    onClick: (e) => {if (e) e.stopPropagation();hidePop();onView && onView(ev);}
  });

  const layer =
  <>
      {hover &&
    <MonthEvPopover
      ev={hover.ev}
      rect={hover.rect}
      onEnter={cancelHide}
      onLeave={scheduleHide}
      onView={() => {hidePop();onView && onView(hover.ev);}}
      onEdit={() => {hidePop();onEdit && onEdit(hover.ev);}}
      onDelete={() => {setConfirmDel(hover.ev);hidePop();}} />
    }
      {confirmDel &&
    <Modal
      title="Cancelar agendamento?"
      onClose={() => setConfirmDel(null)}
      size="sm"
      footer={
      <>
              <div style={{ flex: 1 }} />
              <button className="btn" onClick={() => setConfirmDel(null)}>Voltar</button>
              <button className="btn btn-danger" onClick={() => {onDelete && onDelete(confirmDel);setConfirmDel(null);}}>
                <Ic name="trash" size={14} /> Excluir
              </button>
            </>
      }>
        
        <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5 }}>
          O agendamento de <strong>{confirmDel.client}</strong> — {confirmDel.service}, dia {confirmDel.day.toString().padStart(2, '0')}/05 às {confirmDel.start} — será cancelado. Esta ação não pode ser desfeita.
        </div>
      </Modal>
    }
    </>;


  return { evProps, layer };
}

function MonthView({ cursor, appts = APPOINTMENTS, onView, onEdit, onDelete, onNewAt, onOpenDay }) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startWd = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWd; i++) cells.push({ d: prevDays - startWd + 1 + i, cur: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ d, cur: true });
  while (cells.length < 42) cells.push({ d: cells.length - (startWd + daysInMonth) + 1, cur: false });

  const today = new Date(2026, 4, 11);
  const { evProps, layer } = useEvPopover({ onView, onEdit, onDelete });

  return (
    <div className="month-view scroll">
      <div className="month-wd-row">
        {WD_FULL_PT.map((w) => <div key={w} className="month-wd">{w.toUpperCase()}</div>)}
      </div>
      <div className="month-grid">
        {cells.map((c, i) => {
          const isToday = c.cur && c.d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const evs = c.cur && month === 4 && year === 2026 ? appts.filter((a) => a.day === c.d) : [];
          return (
            <div
              key={i}
              className={'month-cell' + (c.cur ? ' month-cell-click' : '')}
              data-current={c.cur}
              data-today={isToday}
              onClick={c.cur && onOpenDay ? () => onOpenDay(new Date(year, month, c.d)) : undefined}
              title={c.cur ? 'Abrir dia' : undefined}>
              <div className="month-cell-day" style={{ height: "14px" }}>{c.d.toString().padStart(2, '0')}</div>
              <div className="month-cell-evs">
                {evs.slice(0, 3).map((e, j) =>
                <div
                  key={j}
                  className="month-ev"
                  style={{ background: e.byAI ? 'var(--ai-soft)' : 'var(--accent-soft)', color: e.byAI ? 'var(--ai-strong)' : 'var(--accent-700)', borderLeft: `3px solid ${e.byAI ? 'var(--ai)' : 'var(--accent)'}`, fontSize: "10px", cursor: 'pointer' }}
                  {...evProps(e)}>
                    <strong className="tnum">{e.start}</strong> {e.client}
                  </div>
                )}
                {evs.length > 3 && <div style={{ fontSize: 10, color: 'var(--text-faint)', padding: '1px 5px' }}>+ {evs.length - 3} mais</div>}
              </div>
            </div>);

        })}
      </div>
      {layer}
    </div>);

}

function fmtEndTime(start, dur) {
  const [h, m] = start.split(':').map(Number);
  const total = h * 60 + m + (dur || 0);
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  return `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;
}

function MonthEvPopover({ ev, rect, onEnter, onLeave, onView, onEdit, onDelete }) {
  const popRef = React.useRef(null);
  const [pos, setPos] = React.useState({ left: rect.right + 10, top: rect.top, ready: false });

  React.useLayoutEffect(() => {
    const el = popRef.current;
    if (!el) return;
    const pw = el.offsetWidth,ph = el.offsetHeight;
    const vw = window.innerWidth,vh = window.innerHeight;
    let left = rect.right + 10;
    if (left + pw > vw - 8) left = rect.left - pw - 10; // flip to left side
    if (left < 8) left = 8;
    let top = rect.top - 6;
    if (top + ph > vh - 8) top = vh - ph - 8;
    if (top < 8) top = 8;
    setPos({ left, top, ready: true });
  }, [rect, ev]);

  const resp = TEAM.find((m) => m.id === ev.resp);
  const accent = ev.byAI ? 'var(--ai)' : 'var(--accent)';
  const stop = (fn) => (e) => {e.stopPropagation();fn && fn();};

  return ReactDOM.createPortal(
    <div
      ref={popRef}
      className="month-ev-pop"
      style={{ left: pos.left, top: pos.top, opacity: pos.ready ? 1 : 0, cursor: 'pointer' }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onView}>
      <div className="mep-head" style={{ borderLeft: `3px solid ${accent}` }}>
        <div className="mep-title">{ev.client}</div>
        <div className="mep-sub">{ev.service}</div>
      </div>
      <div className="mep-rows">
        <div className="mep-row">
          <Ic name="clock" size={13} />
          <span>{ev.start} – {fmtEndTime(ev.start, ev.dur)} <span className="mep-dim">({ev.dur} min)</span></span>
        </div>
        <div className="mep-row">
          <Ic name={typeIcon(ev.type)} size={13} />
          <span>{ev.type}</span>
        </div>
        <div className="mep-row">
          <Ic name="map-pin" size={13} />
          <span>{ev.local}</span>
        </div>
        {resp &&
        <div className="mep-row">
            <Ic name="team" size={13} />
            <span>{resp.name}</span>
          </div>
        }
      </div>
      <div className="mep-chips">
        <span className="mep-chip" data-status={ev.status}>{ev.status}</span>
        {ev.byAI && <span className="mep-chip mep-ai"><Ic name="sparkles" size={11} /> IA</span>}
      </div>
      <div className="mep-foot">
        <button className="mep-act mep-act-danger" title="Excluir agendamento" onClick={stop(onDelete)}>
          <Ic name="trash" size={15} />
        </button>
        <button className="mep-act" title="Editar agendamento" onClick={stop(onEdit)}>
          <Ic name="edit" size={15} />
        </button>
        <button className="mep-act" title="Visualizar detalhes" onClick={stop(onView)}>
          <Ic name="eye" size={15} />
        </button>
      </div>
    </div>,
    document.body);

}

function WeekView({ cursor, appts = APPOINTMENTS, onView, onEdit, onDelete, onNewAt }) {
  const start = new Date(cursor);start.setDate(start.getDate() - start.getDay());
  const days = Array.from({ length: 7 }, (_, i) => {const d = new Date(start);d.setDate(d.getDate() + i);return d;});
  const hours = Array.from({ length: 13 }, (_, i) => i + 7); // 07:00 .. 19:00
  const DAY_START = hours[0] * 60;
  const HOUR_H = 56;
  const today = new Date(2026, 4, 11);
  const { evProps, layer } = useEvPopover({ onView, onEdit, onDelete });
  const toMin = (s) => {const [h, m] = s.split(':').map(Number);return h * 60 + m;};

  // Empacota eventos sobrepostos em colunas (lanes)
  const layoutDay = (evs) => {
    const sorted = [...evs].sort((a, b) => toMin(a.start) - toMin(b.start));
    const laneEnds = [];
    const placed = sorted.map((ev) => {
      const s = toMin(ev.start),e = s + ev.dur;
      let lane = laneEnds.findIndex((end) => end <= s);
      if (lane === -1) {lane = laneEnds.length;laneEnds.push(e);} else laneEnds[lane] = e;
      return { ev, s, lane };
    });
    return { placed, lanes: laneEnds.length || 1 };
  };

  return (
    <div className="week-view scroll">
      <div className="week-head">
        <div />
        {days.map((d, i) => {
          const isToday = d.toDateString() === today.toDateString();
          return (
            <div key={i} className="week-day-head" data-today={isToday}>
              <div className="week-wd">{WD_FULL_PT[d.getDay()].slice(0, 3).toUpperCase()}</div>
              <div className="week-dn">{d.getDate().toString().padStart(2, '0')}</div>
            </div>);

        })}
      </div>
      <div className="week-grid" style={{ height: hours.length * HOUR_H }}>
        <div className="week-gutter">
          {hours.map((h) => <div key={h} className="week-hour" style={{ height: HOUR_H }}>{h.toString().padStart(2, '0')}:00</div>)}
        </div>
        {days.map((d, di) => {
          const isToday = d.toDateString() === today.toDateString();
          const inMay = d.getMonth() === 4 && d.getFullYear() === 2026;
          const evs = inMay ? appts.filter((a) => a.day === d.getDate()) : [];
          const { placed, lanes } = layoutDay(evs);
          return (
            <div key={di} className="week-col" data-today={isToday}>
              {hours.map((h) =>
              <div
                key={h}
                className="week-slot"
                style={{ height: HOUR_H }}
                title="Novo agendamento"
                onClick={onNewAt ? () => onNewAt(ymd(d), h.toString().padStart(2, '0') + ':00') : undefined} />
              )}
              {placed.map(({ ev, s, lane }) => {
                const top = (s - DAY_START) / 60 * HOUR_H;
                const height = ev.dur / 60 * HOUR_H;
                const w = 100 / lanes;
                return (
                  <div
                    key={ev.id}
                    className="week-ev"
                    {...evProps(ev)}
                    style={{
                      top: top + 2, height: Math.max(20, height - 4),
                      left: `calc(${lane * w}% + 2px)`, width: `calc(${w}% - 4px)`,
                      background: ev.byAI ? 'var(--ai-soft)' : 'var(--accent-soft)',
                      color: ev.byAI ? 'var(--ai-strong)' : 'var(--accent-700)',
                      borderLeft: `3px solid ${ev.byAI ? 'var(--ai)' : 'var(--accent)'}`
                    }}>
                    <div className="week-ev-time">{ev.start}–{fmtEndTime(ev.start, ev.dur)}</div>
                    <div className="week-ev-client">{ev.client}</div>
                    {height > 38 && <div className="week-ev-svc">{ev.service}</div>}
                  </div>);

              })}
            </div>);

        })}
        {(() => {
          const now = new Date();
          const nowMin = now.getHours() * 60 + now.getMinutes();
          const lastMin = (hours[hours.length - 1] + 1) * 60;
          if (nowMin < DAY_START || nowMin > lastMin) return null;
          const top = (nowMin - DAY_START) / 60 * HOUR_H;
          return (
            <div className="week-now" style={{ top }}>
              <span className="week-now-dot" />
              <span className="week-now-line" />
            </div>);

        })()}
      </div>
      {layer}
    </div>);

}

function DayView({ cursor, appts = APPOINTMENTS, onView, onEdit, onDelete, onNewAt }) {
  const hours = Array.from({ length: 13 }, (_, i) => i + 7); // 07:00 .. 19:00
  const DAY_START = hours[0] * 60;
  const HOUR_H = 76;
  const inMay = cursor.getMonth() === 4 && cursor.getFullYear() === 2026;
  const evs = inMay ? appts.filter((a) => a.day === cursor.getDate()) : [];
  const today = new Date(2026, 4, 11);
  const isToday = cursor.toDateString() === today.toDateString();
  const [confirmDel, setConfirmDel] = React.useState(null);
  const toMin = (s) => {const [h, m] = s.split(':').map(Number);return h * 60 + m;};

  // Empacota eventos sobrepostos em colunas (lanes)
  const sorted = [...evs].sort((a, b) => toMin(a.start) - toMin(b.start));
  const laneEnds = [];
  const placed = sorted.map((ev) => {
    const s = toMin(ev.start),e = s + ev.dur;
    let lane = laneEnds.findIndex((end) => end <= s);
    if (lane === -1) {lane = laneEnds.length;laneEnds.push(e);} else laneEnds[lane] = e;
    return { ev, s, lane };
  });
  const lanes = laneEnds.length || 1;

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNow = isToday && nowMin >= DAY_START && nowMin <= (hours[hours.length - 1] + 1) * 60;

  return (
    <div className="day-view scroll">
      <div className="day-head">
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', letterSpacing: '.08em' }}>{WD_FULL_PT[cursor.getDay()].toUpperCase()}</div>
          <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{cursor.getDate().toString().padStart(2, '0')} <span style={{ color: 'var(--text-muted)', fontSize: 18, fontWeight: 500 }}>{MONTHS_PT[cursor.getMonth()]}</span></div>
        </div>
        <div style={{ flex: 1 }} />
        <div className="row" style={{ gap: 14 }}>
          <div className="day-kpi"><div className="day-kpi-v tnum">{evs.length}</div><div className="day-kpi-l">Agendamentos</div></div>
          <div className="day-kpi"><div className="day-kpi-v tnum">{evs.filter((a) => a.status === 'confirmado').length}</div><div className="day-kpi-l">Confirmados</div></div>
          <div className="day-kpi"><div className="day-kpi-v tnum">{evs.filter((a) => a.byAI).length}</div><div className="day-kpi-l">Via IA</div></div>
        </div>
      </div>
      <div className="day-body">
        <div className="day-grid" style={{ height: hours.length * HOUR_H }}>
          <div className="day-gutter">
            {hours.map((h) => <div key={h} className="day-hour" style={{ height: HOUR_H }}>{h.toString().padStart(2, '0')}:00</div>)}
          </div>
          <div className="day-track">
            {hours.map((h) =>
            <div
              key={h}
              className="day-slot"
              style={{ height: HOUR_H }}
              title="Novo agendamento"
              onClick={onNewAt ? () => onNewAt(ymd(cursor), h.toString().padStart(2, '0') + ':00') : undefined} />
            )}
            {placed.map(({ ev, s, lane }) => {
              const top = (s - DAY_START) / 60 * HOUR_H;
              const height = ev.dur / 60 * HOUR_H;
              const w = 100 / lanes;
              const resp = TEAM.find((m) => m.id === ev.resp);
              const compact = height < 64;
              return (
                <div
                  key={ev.id}
                  className="day-ev"
                  onClick={() => onView && onView(ev)}
                  style={{
                    top: top + 2, height: Math.max(30, height - 4),
                    left: `calc(${lane * w}% + 2px)`, width: `calc(${w}% - 4px)`,
                    background: ev.byAI ? 'var(--ai-soft)' : 'var(--accent-soft)',
                    color: ev.byAI ? 'var(--ai-strong)' : 'var(--accent-700)',
                    borderLeft: `4px solid ${ev.byAI ? 'var(--ai)' : 'var(--accent)'}`
                  }}>
                  <div className="day-ev-main">
                    <div className="day-ev-time"><Ic name="clock" size={12} /> {ev.start}–{fmtEndTime(ev.start, ev.dur)} <span style={{ opacity: .7 }}>· {ev.dur} min</span></div>
                    <div className="day-ev-client">{ev.client}</div>
                    {!compact &&
                    <div className="day-ev-meta">
                        <span><Ic name={typeIcon(ev.type)} size={12} /> {ev.type}</span>
                        <span><Ic name="map-pin" size={12} /> {ev.local}</span>
                        {resp && <span><Ic name="team" size={12} /> {resp.name}</span>}
                      </div>
                    }
                  </div>
                  <div className="day-ev-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="day-ev-act day-ev-act-danger" title="Cancelar agendamento" onClick={() => setConfirmDel(ev)}><Ic name="trash" size={14} /></button>
                    <button className="day-ev-act" title="Editar agendamento" onClick={() => onEdit && onEdit(ev)}><Ic name="edit" size={14} /></button>
                    <button className="day-ev-act" title="Visualizar detalhes" onClick={() => onView && onView(ev)}><Ic name="eye" size={14} /></button>
                  </div>
                </div>);

            })}
            {showNow &&
            <div className="day-now" style={{ top: (nowMin - DAY_START) / 60 * HOUR_H }}>
                <span className="week-now-dot" style={{ left: -4 }} />
                <span className="week-now-line" style={{ left: 0 }} />
              </div>
            }
          </div>
        </div>
      </div>
      {confirmDel &&
      <Modal
        title="Cancelar agendamento?"
        onClose={() => setConfirmDel(null)}
        size="sm"
        footer={
        <>
            <div style={{ flex: 1 }} />
            <button className="btn" onClick={() => setConfirmDel(null)}>Voltar</button>
            <button className="btn btn-danger" onClick={() => {onDelete && onDelete(confirmDel);setConfirmDel(null);}}>
              <Ic name="trash" size={14} /> Excluir
            </button>
          </>
        }>
        
        <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5 }}>
          O agendamento de <strong>{confirmDel.client}</strong> — {confirmDel.service}, dia {confirmDel.day.toString().padStart(2, '0')}/05 às {confirmDel.start} — será cancelado. Esta ação não pode ser desfeita.
        </div>
      </Modal>
      }
    </div>);

}

const EISENHOWER = {
  fazer: { label: 'FAZER', icon: 'zap', color: 'var(--hue-rose)', tip: 'Execute imediatamente', axis: 'Importante + Urgente' },
  agendar: { label: 'AGENDAR', icon: 'calendar', color: 'var(--hue-blue)', tip: 'Agende uma data e horário', axis: 'Importante + Não urgente' },
  delegar: { label: 'DELEGAR', icon: 'team', color: 'var(--hue-amber)', tip: 'Delegue para a equipe', axis: 'Não importante + Urgente' },
  eliminar: { label: 'ELIMINAR', icon: 'x', color: 'var(--text-faint)', tip: 'Considere remover da lista', axis: 'Não importante + Não urgente' }
};
function quadrantOf(t) {
  if (t.important && t.urgent) return 'fazer';
  if (t.important && !t.urgent) return 'agendar';
  if (!t.important && t.urgent) return 'delegar';
  return 'eliminar';
}

function MonthYearPicker({ cursor, onPick }) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef(null);
  const [yr, setYr] = React.useState(cursor.getFullYear());
  React.useEffect(() => {if (open) setYr(cursor.getFullYear());}, [open]);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);};
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  const pick = (m) => {onPick(new Date(yr, m, Math.min(cursor.getDate(), 28)));setOpen(false);};
  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button className="myp-btn" onClick={() => setOpen((o) => !o)}>
        {MONTHS_PT[cursor.getMonth()]} {cursor.getFullYear()}
        <Ic name="chevron-down" size={14} />
      </button>
      {open &&
      <div className="myp-pop">
        <div className="myp-yr">
          <button className="myp-yr-nav" onClick={() => setYr((y) => y - 1)}><Ic name="arrow-left" size={13} /></button>
          <span className="myp-yr-val">{yr}</span>
          <button className="myp-yr-nav" onClick={() => setYr((y) => y + 1)}><Ic name="arrow-right" size={13} /></button>
        </div>
        <div className="myp-grid">
          {MONTHS_PT.map((m, i) =>
          <button key={i} className="myp-month" data-active={i === cursor.getMonth() && yr === cursor.getFullYear()} onClick={() => pick(i)}>
            {m.slice(0, 3)}
          </button>)}
        </div>
      </div>}
    </div>);
}

function DayStrip({ cursor, setCursor }) {
  const today = new Date(2026, 4, 11);
  const [anim, setAnim] = React.useState({ key: 0, dir: 'next' });
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const days = [];
  for (let i = -4; i <= 4; i++) {
    const d = new Date(cursor);
    d.setDate(cursor.getDate() + i);
    days.push(d);
  }
  const shift = (n) => {
    setAnim((a) => ({ key: a.key + 1, dir: n > 0 ? 'next' : 'prev' }));
    const d = new Date(cursor);
    d.setDate(cursor.getDate() + n);
    setCursor(d);
  };
  return (
    <div className="daystrip">
      <button className="daystrip-nav" onClick={() => shift(-1)} title="Anterior"><Ic name="arrow-left" size={14} /></button>
      <div className="daystrip-days" key={anim.key} data-dir={anim.dir} style={{ height: "44px" }}>
        {days.map((d, i) => {
          const sel = sameDay(d, cursor);
          const isToday = sameDay(d, today);
          return (
            <button key={i} className="daystrip-day" data-selected={sel} data-today={isToday} onClick={() => setCursor(d)}>
              <span className="daystrip-wd">{WD_MINI_PT[d.getDay()]}</span>
              <span className="daystrip-dn">{d.getDate().toString().padStart(2, '0')}</span>
            </button>);
        })}
      </div>
      <button className="daystrip-nav" onClick={() => shift(1)} title="Próximo"><Ic name="arrow-right" size={14} /></button>
    </div>);
}

function TasksView({ cursor, setCursor }) {
  const [tasks, setTasks] = React.useState(TASKS.map((t) => ({ ...t })));
  const toggle = (id) => setTasks((tt) => tt.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  const order = ['fazer', 'agendar', 'delegar', 'eliminar'];

  return (
    <div className="eis-wrap scroll">
      <div className="eis-grid">
        {order.map((qid) => {
          const q = EISENHOWER[qid];
          const items = tasks.filter((t) => quadrantOf(t) === qid);
          const open = items.filter((t) => !t.done);
          return (
            <div key={qid} className="eis-quad" style={{ '--qc': q.color }}>
              <div className="eis-quad-head">
                <span className="eis-quad-ic"><Ic name={q.icon} size={16} /></span>
                <div className="eis-quad-titles">
                  <div className="eis-quad-name">{q.label}</div>
                  <div className="eis-quad-axis">{q.axis}</div>
                </div>
                <span className="eis-quad-count">{open.length}</span>
              </div>
              <div className="eis-quad-tip">{q.tip}</div>
              <div className="eis-quad-list">
                {items.length === 0 ?
                <div className="eis-empty">Nenhuma tarefa aqui</div> :
                items.map((t) => {
                  const m = TEAM.find((x) => x.id === t.resp);
                  return (
                    <div key={t.id} className={`eis-card ${t.done ? 'done' : ''}`} onClick={() => toggle(t.id)}>
                      <div className={`eis-cb ${t.done ? 'done' : ''}`}>{t.done && <Ic name="check" size={11} />}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="eis-card-title">{t.title}</div>
                        <div className="eis-card-meta">
                          <Ic name="clock" size={10} style={{ verticalAlign: '-1px', marginRight: 3 }} />
                          {t.due} · {t.cat}
                        </div>
                      </div>
                      {m && <span className="eis-resp" title={m.name}>{initials(m.name)}</span>}
                    </div>);
                })}
              </div>
            </div>);
        })}
      </div>
    </div>);

}

function ClientCombo({ defaultValue = '', onChange }) {
  const [q, setQ] = React.useState(defaultValue);
  const setQv = (v) => {setQ(v);if (onChange) onChange(v);};
  const [open, setOpen] = React.useState(false);
  const [hi, setHi] = React.useState(0);
  const wrapRef = React.useRef(null);
  const contacts = window.CONTACTS || [];
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const digits = (s) => (s || '').replace(/\D/g, '');
  const list = React.useMemo(() => {
    const nq = norm(q);
    const dq = digits(q);
    if (!nq) return contacts.slice(0, 50);
    return contacts.filter((c) => norm(c.name).includes(nq) || dq.length >= 2 && digits(c.phone).includes(dq)).slice(0, 50);
  }, [q, contacts]);
  React.useEffect(() => {
    const onDoc = (e) => {if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);};
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const pick = (c) => {setQv(c.name);setOpen(false);};
  const onKey = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {setOpen(true);return;}
    if (e.key === 'ArrowDown') {e.preventDefault();setHi((h) => Math.min(h + 1, list.length - 1));} else
    if (e.key === 'ArrowUp') {e.preventDefault();setHi((h) => Math.max(h - 1, 0));} else
    if (e.key === 'Enter') {e.preventDefault();if (list[hi]) pick(list[hi]);} else
    if (e.key === 'Escape') {setOpen(false);}
  };
  const channelColor = { whatsapp: '#25d366', instagram: '#e4405f', facebook: '#1877f2' };
  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        className="input"
        placeholder="Buscar contato por nome ou telefone..."
        value={q}
        onChange={(e) => {setQv(e.target.value);setOpen(true);setHi(0);}}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey} />
      {open &&
      <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 12px 28px rgba(15,23,42,.16)', zIndex: 20, maxHeight: 280, overflow: 'auto' }}>
          {list.length === 0 ?
        <div style={{ padding: '14px 14px', fontSize: 'var(--type-sm)', color: 'var(--text-faint)' }}>Nenhum contato encontrado</div> :
        list.map((c, i) =>
        <div key={c.id}
        onMouseDown={(e) => {e.preventDefault();pick(c);}}
        onMouseEnter={() => setHi(i)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', background: i === hi ? 'var(--surface-2)' : 'transparent' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                  {c.name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--type-sm)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: channelColor[c.channel] || '#94a3b8' }} />
                    {c.phone}
                  </div>
                </div>
                {c.tag && <span className="badge" style={{ fontSize: 10 }}>{c.tag}</span>}
              </div>)}
        </div>}
    </div>);
}

function DurationSelect({ value, onChange, options }) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef(null);
  const closeTimer = React.useRef(null);
  const display = (options.find((o) => o.v === value) || {}).l || '';
  const hoverOpen = () => {if (closeTimer.current) {clearTimeout(closeTimer.current);closeTimer.current = null;}setOpen(true);};
  const hoverClose = () => {if (closeTimer.current) clearTimeout(closeTimer.current);closeTimer.current = setTimeout(() => setOpen(false), 160);};
  React.useEffect(() => () => {if (closeTimer.current) clearTimeout(closeTimer.current);}, []);
  React.useEffect(() => {
    if (!open) return;
    const click = (e) => {if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);};
    document.addEventListener('mousedown', click);
    return () => document.removeEventListener('mousedown', click);
  }, [open]);
  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        className="input"
        value={display}
        readOnly
        onFocus={() => setOpen(true)}
        onClick={() => setOpen((o) => !o)}
        style={{ paddingRight: 34, cursor: 'pointer' }} />
      <span onClick={() => setOpen((o) => !o)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>⏱</span>
      {open &&
      <div style={{
        position: 'absolute', zIndex: 1000, top: 'calc(100% + 4px)', left: 0,
        background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 10,
        boxShadow: '0 12px 32px rgba(0,0,0,.18)', maxHeight: 220, overflowY: 'auto', width: '100%', minWidth: 140,
        animation: 'fmtFadeIn .15s ease-out', padding: 4
      }}>
          {options.map((o) =>
        <div key={o.v} data-active={o.v === value}
        onClick={() => {onChange(o.v);setOpen(false);}}
        style={{
          padding: '7px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 'var(--type-sm)',
          background: o.v === value ? 'var(--accent)' : 'transparent',
          color: o.v === value ? '#fff' : 'var(--text)',
          fontVariantNumeric: 'tabular-nums', textAlign: 'center'
        }}
        onMouseEnter={(e) => {if (o.v !== value) e.currentTarget.style.background = 'var(--accent-soft)';}}
        onMouseLeave={(e) => {if (o.v !== value) e.currentTarget.style.background = 'transparent';}}>
              {o.l}
            </div>)}
        </div>}
    </div>);

}

function NewAppointment({ onClose, onSave, defaultClient = '', defaultResponsible = '', defaultDate = '2026-05-11', defaultTime = '10:00' }) {
  const [date, setDate] = React.useState(defaultDate);
  const [time, setTime] = React.useState(defaultTime);
  const [duration, setDuration] = React.useState('60');
  const [apptType, setApptType] = React.useState('Atendimento');
  const [client, setClient] = React.useState(defaultClient);
  const [service, setService] = React.useState('');
  const [local, setLocal] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [obs, setObs] = React.useState('');
  const [status, setStatus] = React.useState('agendado');
  const DURATIONS = [
  { v: '15', l: '15 min' },
  { v: '30', l: '30 min' },
  { v: '45', l: '45 min' },
  { v: '60', l: '60 min' },
  { v: '75', l: '75 min' },
  { v: '90', l: '90 min' },
  { v: '120', l: '2 horas' },
  { v: '180', l: '3 horas' },
  { v: '240', l: '4 horas' },
  { v: '300', l: '5 horas' }];

  const responsibles = ['Karla Zambelly', 'Magno Vieira', 'Paulo Henrique', 'Francisco Junior'];
  const respList = defaultResponsible && !responsibles.includes(defaultResponsible) ?
  [defaultResponsible, ...responsibles] :
  responsibles;
  const [respName, setRespName] = React.useState(defaultResponsible || respList[0]);
  const STATUSES = ['agendado', 'confirmado', 'realizado'];

  const valid = client.trim() && service.trim();
  const submit = () => {
    if (!valid || !onSave) {onClose();return;}
    const resp = TEAM.find((m) => m.name === respName);
    onSave({
      id: 'a' + Date.now(),
      day: parseInt(date.slice(8, 10), 10),
      client: client.trim(),
      service: service.trim(),
      start: time,
      dur: parseInt(duration, 10),
      resp: resp ? resp.id : 'kz',
      source: 'whatsapp',
      status,
      byAI: false,
      type: apptType,
      local: local.trim() || '—',
      phone: phone.trim() || '—',
      obs: obs.trim()
    });
  };

  return (
    <Drawer title="Novo agendamento" subtitle="Cadastre um compromisso" onClose={onClose} width={DRAWER_W}
    footer={<><div style={{ flex: 1 }} /><button className="btn" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={!valid} onClick={submit}><Ic name="check" size={14} /> Criar</button></>}>
      <div className="col" style={{ gap: 14 }}>
        <div><label className="label">Cliente</label><ClientCombo defaultValue={defaultClient} onChange={setClient} /></div>
        <div><label className="label">Serviço</label><input className="input" value={service} onChange={(e) => setService(e.target.value)} placeholder="Ex.: Limpeza de pele" /></div>
        <div className="row" style={{ gap: 10 }}>
          <div style={{ flex: 1 }}><label className="label">Data</label><DateInput value={date} onChange={setDate} /></div>
          <div style={{ flex: 1 }}><label className="label">Hora</label><TimeInput value={time} onChange={setTime} /></div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <div style={{ flex: 1 }}><label className="label">Duração</label><DurationSelect value={duration} onChange={setDuration} options={DURATIONS} /></div>
          <div style={{ flex: 1 }}><label className="label">Tipo</label><TypeSelect value={apptType} onChange={setApptType} /></div>
        </div>
        <div><label className="label">Local</label><input className="input" value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex.: Sala 1" /></div>
        <div className="row" style={{ gap: 10 }}>
          <div style={{ flex: 1 }}><label className="label">Responsável</label><select className="input" value={respName} onChange={(e) => setRespName(e.target.value)}>{respList.map((r) => <option key={r}>{r}</option>)}</select></div>
          <div style={{ flex: 1 }}><label className="label">Status</label><select className="input" value={status} onChange={(e) => setStatus(e.target.value)} style={{ textTransform: 'capitalize' }}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
        </div>
        <div><label className="label">Telefone</label><PhoneInput value={phone} onChange={setPhone} /></div>
        <div><label className="label">Observações</label><textarea className="input" rows={4} value={obs} onChange={(e) => setObs(e.target.value)} /></div>
      </div>
    </Drawer>);

}

function NewTask({ onClose }) {
  const [important, setImportant] = React.useState(null);
  const [urgent, setUrgent] = React.useState(null);
  const decided = important !== null && urgent !== null;
  const qid = !decided ? null : quadrantOf({ important, urgent });
  const q = qid ? EISENHOWER[qid] : null;

  const YesNo = ({ value, onChange }) =>
  <div className="ynseg">
      <button type="button" className={`ynbtn ${value === true ? 'on' : ''}`} onClick={() => onChange(true)}>Sim</button>
      <button type="button" className={`ynbtn ${value === false ? 'on' : ''}`} onClick={() => onChange(false)}>Não</button>
    </div>;

  return (
    <Drawer title="Nova tarefa" subtitle="Criar tarefa na agenda" onClose={onClose} width={DRAWER_W} footer={<><button className="btn" onClick={onClose}>Cancelar</button><div style={{ flex: 1 }} /><button className="btn btn-primary" disabled={!decided} onClick={onClose}>Criar</button></>}>
      <div className="col" style={{ gap: 14 }}>
        <div><label className="label">Título</label><input className="input" placeholder="Ex.: Ligar para Sara" /></div>
        <div><label className="label">Categoria</label><select className="input"><option>Ligação</option><option>Follow-up</option><option>Interno</option><option>Reunião</option></select></div>

        <div className="ynq">
          <div className="ynq-row">
            <span className="ynq-label">Esta tarefa é importante?</span>
            <YesNo value={important} onChange={setImportant} />
          </div>
          <div className="ynq-row">
            <span className="ynq-label">Esta tarefa é urgente?</span>
            <YesNo value={urgent} onChange={setUrgent} />
          </div>
        </div>

        {q ?
        <div className="ynresult" style={{ '--qc': q.color }}>
          <span className="ynresult-ic"><Ic name={q.icon} size={18} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ynresult-name">{q.label}</div>
            <div className="ynresult-tip">{q.tip}</div>
          </div>
        </div> :
        <div className="ynresult ynresult-empty">
          Responda as duas perguntas para classificar a tarefa.
        </div>}

        {qid === 'agendar' &&
        <div className="row" style={{ gap: 10 }}>
          <div style={{ flex: 1 }}><label className="label">Vencimento</label><DateInput value="2026-05-11" onChange={() => {}} /></div>
          <div style={{ flex: 1 }}><label className="label">Hora</label><TimeInput value="16:00" onChange={() => {}} /></div>
        </div>}

        <div><label className="label">Responsável</label><select className="input"><option>Karla Zambelly</option><option>Magno Vieira</option><option>Paulo Henrique</option></select></div>
        <div><label className="label">Descrição</label><textarea className="input" rows={2} /></div>
      </div>
    </Drawer>);

}

function AppointmentDetailDrawer({ appt, onClose, onEdit, onDelete }) {
  const resp = TEAM.find((m) => m.id === appt.resp);
  const accent = appt.byAI ? 'var(--ai)' : 'var(--accent)';
  const [confirmDel, setConfirmDel] = React.useState(false);
  const dateObj = new Date(2026, 4, appt.day);
  const dateLabel = `${WD_FULL_PT[dateObj.getDay()]}, ${appt.day.toString().padStart(2, '0')} de ${MONTHS_PT[dateObj.getMonth()]} de ${dateObj.getFullYear()}`;
  const sourceLabel = { whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook' }[appt.source] || appt.source;

  const Row = ({ icon, label, children }) =>
  <div className="apd-row">
      <span className="apd-ic"><Ic name={icon} size={16} /></span>
      <div className="apd-row-bd">
        <div className="apd-label">{label}</div>
        <div className="apd-val">{children}</div>
      </div>
    </div>;


  return (
    <Drawer
      title={appt.client}
      subtitle={appt.service}
      onClose={onClose}
      width={DRAWER_W}
      leftHead={<Avatar name={appt.client} />}
      footer={
      <>
          <button className="btn btn-ghost btn-icon" title="Cancelar agendamento" onClick={() => setConfirmDel(true)}><Ic name="trash" size={16} /></button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={onEdit}><Ic name="edit" size={14} /> Editar</button>
        </>
      }>
      
      <div className="apd-chips">
        <span className="mep-chip" data-status={appt.status}>{appt.status}</span>
        {appt.byAI && <span className="mep-chip mep-ai"><Ic name="sparkles" size={11} /> agendado pela IA</span>}
      </div>

      <div className="apd-rows">
        <Row icon="calendar" label="Data">{dateLabel}</Row>
        <Row icon="clock" label="Horário">{appt.start} – {fmtEndTime(appt.start, appt.dur)} <span className="mep-dim">({appt.dur} min)</span></Row>
        <Row icon={typeIcon(appt.type)} label="Tipo">{appt.type}</Row>
        <Row icon="map-pin" label="Local">{appt.local}</Row>
        {resp && <Row icon="team" label="Responsável">{resp.name} <span className="mep-dim">· {resp.role}</span></Row>}
        <Row icon="chat" label="Origem">{sourceLabel}</Row>
        {appt.phone && <Row icon="phone" label="Telefone">{appt.phone}</Row>}
      </div>

      <div className="apd-obs">
        <div className="apd-obs-head"><Ic name="lines-3" size={14} /> Observações</div>
        <div className="apd-obs-bd">{appt.obs || 'Sem observações para este agendamento.'}</div>
      </div>
      {confirmDel &&
      <Modal
        title="Cancelar agendamento?"
        onClose={() => setConfirmDel(false)}
        size="sm"
        footer={
        <>
            <div style={{ flex: 1 }} />
            <button className="btn" onClick={() => setConfirmDel(false)}>Voltar</button>
            <button className="btn btn-danger" onClick={() => {setConfirmDel(false);onDelete && onDelete();}}>
              <Ic name="trash" size={14} /> Excluir
            </button>
          </>
        }>
        
        <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5 }}>
          O agendamento de <strong>{appt.client}</strong> — {appt.service}, dia {appt.day.toString().padStart(2, '0')}/05 às {appt.start} — será cancelado. Esta ação não pode ser desfeita.
        </div>
      </Modal>
      }
    </Drawer>);

}

function AppointmentEditDrawer({ appt, onClose, onBack, onSave }) {
  const DURATIONS = [
  { v: '15', l: '15 min' }, { v: '30', l: '30 min' }, { v: '45', l: '45 min' },
  { v: '60', l: '60 min' }, { v: '75', l: '75 min' }, { v: '90', l: '90 min' },
  { v: '120', l: '2 horas' }, { v: '180', l: '3 horas' }, { v: '240', l: '4 horas' }, { v: '300', l: '5 horas' }];

  const [client, setClient] = React.useState(appt.client);
  const [service, setService] = React.useState(appt.service);
  const [date, setDate] = React.useState(`2026-05-${appt.day.toString().padStart(2, '0')}`);
  const [time, setTime] = React.useState(appt.start);
  const [duration, setDuration] = React.useState(String(appt.dur));
  const [type, setType] = React.useState(appt.type);
  const [local, setLocal] = React.useState(appt.local);
  const [respId, setRespId] = React.useState(appt.resp);
  const [phone, setPhone] = React.useState(appt.phone || '');
  const [obs, setObs] = React.useState(appt.obs || '');
  const [status, setStatus] = React.useState(appt.status);

  const STATUSES = ['agendado', 'confirmado', 'realizado'];

  const save = () => {
    if (!onSave) {onBack();return;}
    onSave({
      ...appt,
      day: parseInt(date.slice(8, 10), 10),
      client: client.trim() || appt.client,
      service: service.trim() || appt.service,
      start: time,
      dur: parseInt(duration, 10),
      type,
      local: local.trim() || '—',
      resp: respId,
      status,
      phone: phone.trim() || '—',
      obs: obs.trim()
    });
  };

  return (
    <Drawer
      title="Editar agendamento"
      subtitle={appt.client}
      onClose={onClose}
      width={DRAWER_W}
      leftHead={<button className="btn btn-ghost btn-icon" title="Voltar aos detalhes" onClick={onBack}><Ic name="arrow-left" size={16} /></button>}
      footer={<><div style={{ flex: 1 }} /><button className="btn" onClick={onBack}>Cancelar</button><button className="btn btn-save" onClick={save}><Ic name="check" size={14} /> Salvar</button></>}>
      
      <div className="col" style={{ gap: 14 }}>
        <div>
          <label className="label">Cliente</label>
          <input className="input" value={client} onChange={(e) => setClient(e.target.value)} />
        </div>
        <div>
          <label className="label">Serviço</label>
          <input className="input" value={service} onChange={(e) => setService(e.target.value)} />
        </div>
        <div className="row" style={{ gap: 10 }}>
          <div style={{ flex: 1 }}><label className="label">Data</label><DateInput value={date} onChange={setDate} /></div>
          <div style={{ flex: 1 }}><label className="label">Hora</label><TimeInput value={time} onChange={setTime} /></div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <div style={{ flex: 1 }}><label className="label">Duração</label><DurationSelect value={duration} onChange={setDuration} options={DURATIONS} /></div>
          <div style={{ flex: 1 }}>
            <label className="label">Tipo</label>
            <TypeSelect value={type} onChange={setType} />
          </div>
        </div>
        <div>
          <label className="label">Local</label>
          <input className="input" value={local} onChange={(e) => setLocal(e.target.value)} />
        </div>
        <div className="row" style={{ gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label className="label">Responsável</label>
            <select className="input" value={respId} onChange={(e) => setRespId(e.target.value)}>{TEAM.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} style={{ textTransform: 'capitalize' }}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
          </div>
        </div>
        <div>
          <label className="label">Telefone</label>
          <PhoneInput value={phone} onChange={setPhone} />
        </div>
        <div>
          <label className="label">Observações</label>
          <textarea className="input" rows={4} value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
      </div>
    </Drawer>);

}

function AgendaSettingsDrawer({ onClose }) {
  const [tab, setTab] = React.useState('geral');
  const [notif, setNotif] = React.useState({ email: true, push: true, whatsapp: true });
  const [google, setGoogle] = React.useState(true);
  const [defaultDur, setDefaultDur] = React.useState(60);
  const [start, setStart] = React.useState('08:00');
  const [end, setEnd] = React.useState('19:00');
  const tabs = [
  { id: 'geral', label: 'Geral', icon: 'settings' },
  { id: 'horario', label: 'Horário', icon: 'clock' },
  { id: 'notif', label: 'Notificações', icon: 'bell' },
  { id: 'integ', label: 'Integrações', icon: 'link' },
  { id: 'cat', label: 'Categorias', icon: 'tag' }];

  return (
    <Drawer title="Configurações da agenda" subtitle="Personalize sua agenda" onClose={onClose} width={620}
    footer={(close) => <><div style={{ flex: 1 }} /><button className="btn" onClick={() => close()}>Cancelar</button><button className="btn btn-save" onClick={() => close()}>Salvar alterações</button></>}>
      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 18, height: '100%' }}>
        <div className="col" style={{ gap: 2 }}>
          {tabs.map((t) =>
          <button key={t.id} className={`set-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              <Ic name={t.icon} size={15} /> {t.label}
            </button>
          )}
        </div>
        <div className="col" style={{ gap: 14 }}>
          {tab === 'geral' &&
          <>
              <SetRow label="Fuso horário" desc="Usado em lembretes e exportações">
                <select className="input" defaultValue="-03:00"><option>America/Sao_Paulo (-03:00)</option><option>America/Fortaleza (-03:00)</option></select>
              </SetRow>
              <SetRow label="Duração padrão" desc="Em minutos">
                <input className="input" type="number" value={defaultDur} onChange={(e) => setDefaultDur(+e.target.value)} style={{ width: 120 }} />
              </SetRow>
              <SetRow label="Primeiro dia da semana">
                <select className="input"><option>Domingo</option><option>Segunda</option></select>
              </SetRow>
              <SetRow label="Cor padrão">
                <div className="row" style={{ gap: 6 }}>{['#16a34a', '#6d57ff', '#f59e0b', '#3b82f6', '#f43f5e'].map((c) => <div key={c} className="color-sw" style={{ background: c }} />)}</div>
              </SetRow>
            </>
          }
          {tab === 'horario' &&
          <>
              <SetRow label="Horário comercial">
                <div className="row" style={{ gap: 8 }}>
                  <TimeInput value={start} onChange={setStart} style={{ width: 120 }} />
                  <span className="muted">até</span>
                  <TimeInput value={end} onChange={setEnd} style={{ width: 120 }} />
                </div>
              </SetRow>
              <SetRow label="Dias úteis" desc="Selecione os dias atendidos">
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>{['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <button key={i} className={`day-btn ${i > 0 && i < 6 ? 'on' : ''}`}>{d}</button>)}</div>
              </SetRow>
              <SetRow label="Intervalo entre eventos" desc="Em minutos">
                <input className="input" type="number" defaultValue={10} style={{ width: 120 }} />
              </SetRow>
              <SetRow label="Permitir overbooking">
                <Toggle />
              </SetRow>
            </>
          }
          {tab === 'notif' &&
          <>
              <SetRow label="E-mail" desc="Lembrete 1 hora antes">
                <Toggle on={notif.email} onChange={() => setNotif((n) => ({ ...n, email: !n.email }))} />
              </SetRow>
              <SetRow label="Push no navegador">
                <Toggle on={notif.push} onChange={() => setNotif((n) => ({ ...n, push: !n.push }))} />
              </SetRow>
              <SetRow label="WhatsApp para o cliente" desc="Confirmação automática">
                <Toggle on={notif.whatsapp} onChange={() => setNotif((n) => ({ ...n, whatsapp: !n.whatsapp }))} />
              </SetRow>
              <SetRow label="Antecedência do lembrete">
                <select className="input"><option>15 minutos</option><option>30 minutos</option><option>1 hora</option><option>1 dia</option></select>
              </SetRow>
            </>
          }
          {tab === 'integ' &&
          <>
              <div className="integ-card">
                <div className="integ-ic" style={{ background: '#fff', border: '1px solid var(--border)' }}>G</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>Google Calendar</div>
                  <div className="muted" style={{ fontSize: 12 }}>Sincronização bidirecional</div>
                </div>
                <Toggle on={google} onChange={() => setGoogle((g) => !g)} />
              </div>
              <div className="integ-card">
                <div className="integ-ic" style={{ background: '#0078d4', color: 'white' }}>O</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>Outlook</div>
                  <div className="muted" style={{ fontSize: 12 }}>Não conectado</div>
                </div>
                <button className="btn btn-sm">Conectar</button>
              </div>
              <div className="integ-card">
                <div className="integ-ic" style={{ background: 'var(--ai-soft)', color: 'var(--ai-strong)' }}><Ic name="sparkles" size={16} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>Agendamentos via IA</div>
                  <div className="muted" style={{ fontSize: 12 }}>Permitir que a IA crie agendamentos</div>
                </div>
                <Toggle on />
              </div>
            </>
          }
          {tab === 'cat' &&
          <>
              <div className="muted" style={{ fontSize: 12 }}>Personalize as categorias da agenda. Arraste para reordenar.</div>
              {[
            { c: '#16a34a', l: 'Atendimentos' },
            { c: '#6d57ff', l: 'Agendado pela IA' },
            { c: '#f59e0b', l: 'Pessoal' },
            { c: '#f43f5e', l: 'Bloqueio' }].
            map((k, i) =>
            <div key={i} className="integ-card">
                  <div style={{ width: 18, height: 18, borderRadius: 6, background: k.c }} />
                  <input className="input" defaultValue={k.l} style={{ flex: 1 }} />
                  <button className="btn btn-ghost btn-icon"><Ic name="trash" size={14} /></button>
                </div>
            )}
              <button className="btn"><Ic name="plus" size={13} /> Nova categoria</button>
            </>
          }
        </div>
      </div>
    </Drawer>);

}

function SetRow({ label, desc, children }) {
  return (
    <div className="set-row">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 'var(--type-base)' }}>{label}</div>
        {desc && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>);

}

function AgendaStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      .agenda-side { display:flex; flex-direction:column; gap:14px; padding:18px; background:var(--surface); border-right:1px solid var(--border); overflow:auto; min-height:0; }
      .agenda-side-head { display:flex; align-items:center; gap:8px; color:var(--text-muted); font-size:13px; font-weight:600; letter-spacing:.06em; }
      .agenda-cog { width:30px; height:30px; border-radius:8px; border:1px solid var(--border); background:var(--surface); color:var(--text-muted); display:inline-flex; align-items:center; justify-content:center; cursor:pointer; transition:all .15s; }
      .agenda-cog:hover { background:var(--surface-3); color:var(--text); border-color:var(--border-strong); }
      .btn-novo { height:48px; border-radius:10px; background:var(--accent-grad); color:var(--accent-grad-ink); font-weight:700; font-size:13px; letter-spacing:.06em; border:none; cursor:pointer; transition: all .18s; box-shadow:0 1px 2px rgba(0,0,0,.08); }
      .btn-novo:hover { filter:brightness(1.04) saturate(1.05); transform: translateY(-1px); box-shadow:0 4px 12px rgba(0,0,0,.12); }
      .btn-novo:active { transform: translateY(0); }
      .view-tab-group { position:relative; display:grid; grid-template-columns: repeat(4,1fr); gap:6px; background:var(--surface-2); border:1px solid var(--border); border-radius:12px; padding:6px; }
      .view-tab-ind { position:absolute; top:6px; bottom:6px; width:calc((100% - 30px) / 4); left:calc(6px + var(--idx) * ((100% - 30px) / 4 + 6px)); background:#DCEFE1; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,.06); transition:left .28s cubic-bezier(.4,0,.2,1); z-index:0; }
      .view-tab { position:relative; z-index:1; display:flex; flex-direction:column; align-items:center; gap:5px; padding:10px 4px; border:none; background:transparent; color:var(--text-muted); font-size:10px; font-weight:600; letter-spacing:.06em; border-radius:8px; cursor:pointer; transition:color .15s; }
      .view-tab:hover { color:var(--text); }
      .view-tab.active { color:var(--text); }

      .mini-cal { border:1px solid var(--border); border-radius:12px; padding:12px; background:var(--surface-2); }
      .mini-cal-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
      .mini-cal-title { font-size:11px; font-weight:600; letter-spacing:.08em; color:var(--text-muted); }
      .mini-nav { width:24px; height:24px; border-radius:50%; border:1px solid var(--border-strong); background:var(--surface); color:var(--text-muted); display:inline-flex; align-items:center; justify-content:center; cursor:pointer; transition:all .15s; }
      .mini-nav:hover { background:var(--accent-soft); color:var(--accent-700); border-color:var(--accent); }
      .mini-cal-wd { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; font-size:10px; color:var(--text-faint); font-weight:700; text-align:center; margin-bottom:4px; }
      .mini-cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; }
      .mini-day { aspect-ratio:1; border:none; background:transparent; color:var(--text); font-size:11px; font-weight:500; border-radius:6px; cursor:pointer; transition:all .12s; }
      .mini-day[data-current="false"] { color:var(--text-faint); opacity:.5; }
      .mini-day:hover { background:var(--accent-soft); color:var(--accent-700); }
      .mini-day[data-today="true"] { background:var(--surface-3); color:var(--text); font-weight:700; }
      .mini-day[data-selected="true"] { background:var(--accent); color:white; font-weight:700; }
      .mini-day[data-selected="true"]:hover { background:var(--accent-600); }

      .cat-row { display:flex; align-items:center; gap:8px; padding:6px 8px; border-radius:6px; font-size:12px; color:var(--text); cursor:pointer; transition:background .12s; }
      .cat-row:hover { background:var(--surface-2); }
      .cat-dot { width:10px; height:10px; border-radius:3px; flex-shrink:0; }
      .cat-check { width:18px; height:18px; border-radius:4px; background:var(--accent); color:white; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }

      .agenda-header { display:flex; align-items:center; gap:14px; padding:14px 26px; background:var(--surface); border-bottom:1px solid var(--border); }
      .agenda-header-strip { flex:1; min-width:0; }
      .agenda-header-strip .daystrip { max-width:none; margin:4px 0; }
      .agenda-header-strip .daystrip-nav { height:44px; }
      .agenda-title { font-size:18px; font-weight:600; letter-spacing:.04em; color:var(--text); }
      .agenda-nav { width:32px; height:32px; border-radius:50%; border:1px solid var(--border-strong); background:var(--surface); color:var(--text-muted); display:inline-flex; align-items:center; justify-content:center; cursor:pointer; transition:all .15s; }
      .agenda-nav:hover { background:var(--accent-soft); color:var(--accent-700); border-color:var(--accent); transform:scale(1.05); }

      @keyframes slideInRight { from { transform: translateX(40px); opacity:0; } to { transform:none; opacity:1; } }
      @keyframes slideInLeft  { from { transform: translateX(-40px); opacity:0; } to { transform:none; opacity:1; } }
      .view-anim { animation-duration: .32s; animation-timing-function: cubic-bezier(.4,0,.2,1); animation-fill-mode: both; }
      .view-anim-right { animation-name: slideInRight; }
      .view-anim-left  { animation-name: slideInLeft; }

      .month-view { padding:18px 22px; display:flex; flex-direction:column; gap:8px; height:100%; }
      .month-wd-row { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; }
      .month-wd { text-align:center; padding:10px 12px; font-size:11px; font-weight:600; color:var(--text-muted); letter-spacing:.1em; background:var(--surface); border:1px solid var(--border); border-radius:8px; }
      .month-grid { display:grid; grid-template-columns:repeat(7,1fr); grid-auto-rows: minmax(108px, 1fr); gap:2px; flex:1; }
      .month-cell { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:8px 10px; display:flex; flex-direction:column; min-width:0; transition: all .2s ease; cursor:pointer; }
      .month-cell[data-current="false"] { background:var(--surface-2); opacity:.55; }
      .month-cell[data-today="true"] { background:color-mix(in oklab, var(--accent) 7%, var(--surface)); border-color:var(--accent); box-shadow:0 0 0 1px var(--accent) inset; }
      .month-cell:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(15,23,42,.08); border-color:var(--accent); z-index:2; }
      .month-cell-day { font-size:13px; color:var(--text-muted); font-weight:600; font-variant-numeric: tabular-nums; }
      .month-cell[data-today="true"] .month-cell-day { color:var(--accent-700); }
      .month-cell-evs { display:flex; flex-direction:column; gap:3px; margin-top:3px; }
      .month-ev { padding:2px 6px; border-radius:4px; font-size:10.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; cursor:default; transition:filter .12s; }
      .month-ev:hover { filter:brightness(.97); }

      .month-ev-pop {
        position:fixed; z-index:2400; width:248px;
        background:var(--surface); border:1px solid var(--border);
        border-radius:12px; box-shadow:0 12px 32px rgba(15,23,42,.16), 0 2px 8px rgba(15,23,42,.08);
        padding:12px 13px;
        transition:opacity .12s ease;
        font-size:12px; color:var(--text);
      }
      [data-theme="dark"] .month-ev-pop { box-shadow:0 14px 36px rgba(0,0,0,.5); }
      .mep-head { padding:0 0 9px 9px; margin:0 0 9px; border-bottom:1px solid var(--border); }
      .mep-title { font-size:13.5px; font-weight:700; color:var(--text); line-height:1.25; }
      .mep-sub { font-size:11.5px; color:var(--text-muted); margin-top:2px; }
      .mep-rows { display:flex; flex-direction:column; gap:7px; }
      .mep-row { display:flex; align-items:center; gap:8px; color:var(--text); line-height:1.3; }
      .mep-row svg { color:var(--text-faint); flex-shrink:0; }
      .mep-dim { color:var(--text-faint); }
      .mep-chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:11px; }
      .mep-chip {
        display:inline-flex; align-items:center; gap:4px;
        font-size:10.5px; font-weight:600; padding:3px 8px; border-radius:999px;
        background:var(--surface-3); color:var(--text-muted); text-transform:capitalize;
      }
      .mep-chip[data-status="confirmado"] { background:color-mix(in oklab, #16a34a 14%, var(--surface)); color:#15803d; }
      .mep-chip[data-status="agendado"] { background:color-mix(in oklab, var(--accent) 14%, var(--surface)); color:var(--accent-700); }
      .mep-chip[data-status="realizado"] { background:var(--surface-3); color:var(--text-muted); }
      .mep-chip.mep-ai { background:var(--ai-soft); color:var(--ai-strong); text-transform:none; }
      .mep-foot { display:flex; justify-content:flex-end; gap:6px; margin-top:11px; padding-top:10px; border-top:1px solid var(--border); }
      .mep-act {
        width:30px; height:30px; display:inline-flex; align-items:center; justify-content:center;
        border:1px solid var(--border); background:var(--surface); border-radius:8px;
        color:var(--text-muted); cursor:pointer; transition:all .12s;
      }
      .mep-act:hover { color:var(--accent-700); border-color:var(--accent); background:var(--accent-soft); transform:translateY(-1px); box-shadow:0 3px 8px rgba(15,23,42,.06); }
      .mep-act-danger:hover { color:#dc2626; border-color:#dc2626; background:#fef2f2; }

      /* Appointment detail drawer */
      .apd-chips { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:18px; }
      .apd-rows { display:flex; flex-direction:column; gap:2px; }
      .apd-row { display:flex; gap:12px; padding:11px 0; border-bottom:1px solid var(--border); }
      .apd-row:first-child { padding-top:0; }
      .apd-ic { color:var(--text-faint); flex-shrink:0; margin-top:1px; }
      .apd-row-bd { min-width:0; }
      .apd-label { font-size:10.5px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--text-faint); margin-bottom:3px; }
      .apd-val { font-size:13px; color:var(--text); line-height:1.4; }
      .apd-obs { margin-top:18px; padding:14px; border-radius:10px; background:var(--surface-2); border:1px solid var(--border); }
      .apd-obs-head { display:flex; align-items:center; gap:7px; font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--text-muted); margin-bottom:9px; }
      .apd-obs-head svg { color:var(--text-faint); }
      .apd-obs-bd { font-size:13px; color:var(--text); line-height:1.5; }

      .week-view { padding:0; height:100%; display:flex; flex-direction:column; }
      .week-head { position:sticky; top:0; display:grid; grid-template-columns: 64px repeat(7,1fr); background:var(--surface); border-bottom:1px solid var(--border); z-index:2; }
      .week-day-head { padding:12px 8px; text-align:center; border-left:1px solid var(--border); }
      .week-day-head[data-today="true"] { background:color-mix(in oklab, var(--accent) 8%, var(--surface)); }
      .week-wd { font-size:10px; font-weight:600; letter-spacing:.08em; color:var(--text-faint); }
      .week-dn { font-size:18px; font-weight:600; margin-top:2px; }
      .week-day-head[data-today="true"] .week-dn { color:var(--accent); }
      .week-body { flex:1; }
      .week-grid { display:grid; grid-template-columns: 64px repeat(7,1fr); position:relative; }
      .week-gutter { display:flex; flex-direction:column; }
      .week-hour { padding:3px 8px 0 0; font-size:10.5px; color:var(--text-faint); text-align:right; font-variant-numeric: tabular-nums; box-sizing:border-box; }
      .week-col { position:relative; border-left:1px solid var(--border); }
      .week-col[data-today="true"] { background: color-mix(in oklab, var(--accent) 4%, var(--surface)); }
      .week-slot { border-bottom:1px solid var(--border); box-sizing:border-box; cursor:pointer; transition:background .1s; }
      .week-slot:hover { background: color-mix(in oklab, var(--text) 7%, transparent); }
      .week-ev { position:absolute; padding:4px 7px; border-radius:6px; cursor:pointer; overflow:hidden; box-sizing:border-box; box-shadow:0 1px 2px rgba(15,23,42,.06); transition: box-shadow .15s, filter .12s; }
      .week-ev:hover { box-shadow:0 5px 14px rgba(0,0,0,.13); filter:brightness(.98); z-index:5; }
      .week-ev-time { font-size:9.5px; font-weight:700; opacity:.85; font-variant-numeric: tabular-nums; }
      .week-ev-client { font-size:11px; font-weight:600; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .week-ev-svc { font-size:10px; opacity:.8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:1px; }
      .week-now { position:absolute; left:0; right:0; height:0; z-index:6; pointer-events:none; }
      .week-now-dot { position:absolute; left:60px; top:50%; width:8px; height:8px; border-radius:50%; background:var(--danger,#dc2626); transform:translate(-50%,-50%); box-shadow:0 0 0 3px color-mix(in oklab, var(--danger,#dc2626) 22%, transparent); }
      .week-now-line { position:absolute; left:64px; right:0; top:50%; height:2px; background:var(--danger,#dc2626); transform:translateY(-50%); border-radius:2px; }

      .day-view { padding:0; display:flex; flex-direction:column; height:100%; }
      .day-head { display:flex; align-items:flex-end; gap:18px; padding:20px 28px; background:var(--surface); border-bottom:1px solid var(--border); }
      .day-kpi { text-align:center; }
      .day-kpi-v { font-size:22px; font-weight:600; color:var(--accent-700); letter-spacing:-0.01em; }
      .day-kpi-l { font-size:10px; font-weight:600; color:var(--text-faint); letter-spacing:.06em; text-transform:uppercase; }
      .day-body { flex:1; overflow:auto; padding-bottom:40px; }
      .day-grid { display:grid; grid-template-columns: 80px 1fr; position:relative; }
      .day-gutter { display:flex; flex-direction:column; border-right:1px solid var(--border); }
      .day-hour { padding:4px 14px 0 0; font-size:11px; color:var(--text-faint); text-align:right; font-variant-numeric: tabular-nums; box-sizing:border-box; }
      .day-track { position:relative; }
      .day-slot { border-bottom:1px solid var(--border); box-sizing:border-box; cursor:pointer; transition:background .1s; }
      .day-slot:hover { background: color-mix(in oklab, var(--text) 6%, transparent); }
      .day-ev { position:absolute; padding:8px 12px; border-radius:8px; cursor:pointer; overflow:hidden; box-sizing:border-box; box-shadow:0 1px 3px rgba(15,23,42,.07); transition: box-shadow .15s, filter .12s; display:flex; align-items:flex-start; gap:8px; }
      .day-ev:hover { box-shadow:0 6px 18px rgba(0,0,0,.13); filter:brightness(.98); z-index:5; }
      .day-ev-main { flex:1; min-width:0; }
      .day-ev-time { font-size:11px; font-weight:700; display:flex; align-items:center; gap:5px; font-variant-numeric: tabular-nums; }
      .day-ev-time svg { opacity:.8; }
      .day-ev-client { font-size:14px; font-weight:600; line-height:1.25; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .day-ev-meta { display:flex; flex-wrap:wrap; gap:4px 14px; margin-top:5px; font-size:11.5px; opacity:.9; }
      .day-ev-meta span { display:inline-flex; align-items:center; gap:5px; white-space:nowrap; }
      .day-ev-meta svg { opacity:.75; }
      .day-ev-actions { display:flex; gap:5px; flex-shrink:0; opacity:0; transform:translateX(4px); transition:opacity .14s, transform .14s; pointer-events:none; }
      .day-ev:hover .day-ev-actions { opacity:1; transform:none; pointer-events:auto; }
      .day-ev-act { width:28px; height:28px; display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--border); background:var(--surface); border-radius:7px; color:var(--text-muted); cursor:pointer; transition:all .12s; }
      .day-ev-act:hover { color:var(--accent-700); border-color:var(--accent); background:var(--accent-soft); }
      .day-ev-act-danger:hover { color:#dc2626; border-color:#dc2626; background:#fef2f2; }
      .day-now { position:absolute; left:0; right:0; height:0; z-index:6; pointer-events:none; }

      .tasks-view { padding:22px 28px; display:flex; flex-direction:column; gap:22px; max-width:900px; width:100%; margin:0 auto; }
      .eis-wrap { padding:18px 24px 20px; width:100%; height:100%; box-sizing:border-box; overflow-x:hidden; overflow-y:auto; display:flex; flex-direction:column; gap:16px; }
      .eis-grid { display:grid; grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr; gap:16px; flex:1; min-height:520px; max-width:1100px; width:100%; margin:0 auto; box-sizing:border-box; }

      .daystrip { display:flex; align-items:center; gap:10px; max-width:1100px; width:100%; margin:0 auto; box-sizing:border-box; }
      .daystrip-nav { width:30px; height:44px; flex-shrink:0; border:1px solid var(--border); background:var(--surface); border-radius:9px; color:var(--text-muted); display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .15s; }
      .daystrip-nav:hover { border-color:var(--accent); color:var(--accent-700); }
      .daystrip-days { display:grid; grid-template-columns:repeat(9,minmax(30px,1fr)); gap:6px; flex:1; min-width:0; height:44px; overflow-x:auto; overflow-y:hidden; scrollbar-width:none; }
      .daystrip-days::-webkit-scrollbar { display:none; }
      .daystrip-days[data-dir="next"] { animation:dsNext .26s ease; }
      .daystrip-days[data-dir="prev"] { animation:dsPrev .26s ease; }
      @keyframes dsNext { from { transform:translateX(34px); opacity:.35; } to { transform:translateX(0); opacity:1; } }
      @keyframes dsPrev { from { transform:translateX(-34px); opacity:.35; } to { transform:translateX(0); opacity:1; } }
      .daystrip-day { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; margin:4px 0; padding:4px 2px; border:1px solid var(--border); background:var(--surface); border-radius:9px; cursor:pointer; transition:all .15s; min-width:0; }
      .daystrip-day:hover { border-color:var(--accent); transform:translateY(-1px); }
      .daystrip-wd { font-size:10px; font-weight:600; letter-spacing:.04em; color:var(--text-faint); text-transform:uppercase; }
      .daystrip-dn { font-size:15px; font-weight:700; color:var(--text); font-variant-numeric:tabular-nums; }
      .daystrip-day[data-today="true"] .daystrip-dn { color:var(--accent-700); }
      .daystrip-day[data-selected="true"] { background:linear-gradient(120deg, #4dfc83 0%, #FFF943 100%); border-color:#7df76a; box-shadow:0 4px 12px rgba(120,230,90,.35); }
      .daystrip-day[data-selected="true"] .daystrip-wd, .daystrip-day[data-selected="true"] .daystrip-dn { color:#1a3d12; }

      .myp-btn { display:inline-flex; align-items:center; gap:7px; height:32px; padding:0 12px; border:1px solid var(--border); background:var(--surface); border-radius:8px; font-size:13px; font-weight:600; color:var(--text); cursor:pointer; transition:all .15s; }
      .myp-btn:hover { border-color:var(--accent); color:var(--accent-700); }
      .myp-pop { position:absolute; top:calc(100% + 6px); right:0; z-index:40; width:240px; background:var(--surface); border:1px solid var(--border-strong); border-radius:12px; box-shadow:0 16px 38px rgba(15,23,42,.18); padding:12px; }
      .myp-yr { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
      .myp-yr-nav { width:28px; height:28px; border:1px solid var(--border); background:var(--surface); border-radius:7px; color:var(--text-muted); display:flex; align-items:center; justify-content:center; cursor:pointer; }
      .myp-yr-nav:hover { border-color:var(--accent); color:var(--accent-700); }
      .myp-yr-val { font-size:14px; font-weight:700; color:var(--text); font-variant-numeric:tabular-nums; }
      .myp-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; }
      .myp-month { padding:9px 4px; border:1px solid transparent; background:var(--surface-2); border-radius:8px; font-size:12px; font-weight:600; color:var(--text-muted); cursor:pointer; text-transform:capitalize; transition:all .14s; }
      .myp-month:hover { background:var(--accent-soft); color:var(--accent-700); }
      .myp-month[data-active="true"] { background:var(--accent); color:#fff; }
      .eis-quad { display:flex; flex-direction:column; min-height:0; min-width:0; box-sizing:border-box; background:var(--surface); border:1px solid var(--border); border-top:3px solid var(--qc); border-radius:12px; padding:14px 16px; }
      .eis-quad-head { display:flex; align-items:center; gap:10px; }
      .eis-quad-ic { width:30px; height:30px; flex-shrink:0; border-radius:8px; display:flex; align-items:center; justify-content:center; color:var(--qc); background:color-mix(in oklab, var(--qc) 14%, var(--surface)); }
      .eis-quad-titles { flex:1; min-width:0; }
      .eis-quad-name { font-size:13px; font-weight:700; letter-spacing:.08em; color:var(--text); }
      .eis-quad-axis { font-size:10.5px; color:var(--text-faint); margin-top:1px; }
      .eis-quad-count { font-size:13px; font-weight:700; color:var(--qc); font-variant-numeric:tabular-nums; min-width:22px; text-align:center; }
      .eis-quad-tip { font-size:11.5px; color:var(--text-muted); margin:8px 0 10px; padding-left:2px; }
      .eis-quad-list { display:flex; flex-direction:column; gap:7px; overflow-y:auto; flex:1; min-height:0; padding-right:2px; }
      .eis-card { display:flex; align-items:center; gap:10px; padding:9px 11px; background:var(--surface-2); border:1px solid var(--border); border-radius:9px; cursor:pointer; transition:all .16s; }
      .eis-card:hover { border-color:var(--qc); transform:translateX(3px); box-shadow:0 3px 10px rgba(0,0,0,.05); }
      .eis-card.done { opacity:.55; }
      .eis-card.done .eis-card-title { text-decoration:line-through; color:var(--text-faint); }
      .eis-card-title { font-size:13px; font-weight:500; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .eis-card-meta { font-size:10.5px; color:var(--text-faint); margin-top:2px; }
      .eis-cb { width:18px; height:18px; border-radius:5px; border:1.5px solid var(--border-strong); display:inline-flex; align-items:center; justify-content:center; color:white; flex-shrink:0; transition:all .15s; }
      .eis-cb.done { background:var(--qc); border-color:var(--qc); }
      .eis-resp { width:24px; height:24px; flex-shrink:0; border-radius:50%; background:var(--surface-3); color:var(--text-muted); font-size:9.5px; font-weight:700; display:flex; align-items:center; justify-content:center; }
      .eis-empty { padding:14px; text-align:center; color:var(--text-faint); font-size:11.5px; background:var(--surface-2); border:1px dashed var(--border); border-radius:9px; }

      .ynq { display:flex; flex-direction:column; gap:12px; padding:14px; background:var(--surface-2); border:1px solid var(--border); border-radius:10px; }
      .ynq-row { display:flex; align-items:center; justify-content:space-between; gap:12px; }
      .ynq-label { font-size:13px; font-weight:500; color:var(--text); }
      .ynseg { display:flex; gap:4px; background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:3px; flex-shrink:0; }
      .ynbtn { border:none; background:transparent; padding:5px 16px; border-radius:6px; font-size:12.5px; font-weight:600; color:var(--text-muted); cursor:pointer; transition:all .15s; }
      .ynbtn:hover { color:var(--text); }
      .ynbtn.on { background:var(--accent); color:#fff; }
      .ynresult { display:flex; align-items:center; gap:12px; padding:13px 14px; border-radius:10px; border:1px solid color-mix(in oklab, var(--qc) 40%, var(--border)); background:color-mix(in oklab, var(--qc) 9%, var(--surface)); }
      .ynresult-ic { width:34px; height:34px; flex-shrink:0; border-radius:9px; display:flex; align-items:center; justify-content:center; color:#fff; background:var(--qc); }
      .ynresult-name { font-size:13px; font-weight:700; letter-spacing:.08em; color:var(--text); }
      .ynresult-tip { font-size:12px; color:var(--text-muted); margin-top:1px; }
      .ynresult-empty { display:block; padding:13px 14px; text-align:center; font-size:12px; color:var(--text-faint); background:var(--surface-2); border:1px dashed var(--border); }

      .set-tab { display:flex; align-items:center; gap:8px; padding:9px 12px; border-radius:8px; border:none; background:transparent; color:var(--text-muted); font-size:13px; font-weight:500; cursor:pointer; text-align:left; }
      .set-tab:hover { background:var(--surface-2); color:var(--text); }
      .set-tab.active { background:var(--accent-soft); color:var(--accent-700); font-weight:600; }
      .set-row { display:flex; align-items:center; gap:14px; padding:14px 0; border-bottom:1px solid var(--border); }
      .set-row:last-child { border-bottom:none; }
      .integ-card { display:flex; align-items:center; gap:12px; padding:12px 14px; border:1px solid var(--border); border-radius:10px; background:var(--surface); }
      .integ-ic { width:36px; height:36px; border-radius:9px; display:flex; align-items:center; justify-content:center; font-weight:700; }
      .color-sw { width:24px; height:24px; border-radius:50%; cursor:pointer; border:2px solid var(--surface); box-shadow:0 0 0 1px var(--border); transition:transform .15s; }
      .color-sw:hover { transform:scale(1.15); }
      .day-btn { width:34px; height:34px; border-radius:50%; border:1px solid var(--border-strong); background:var(--surface); color:var(--text-muted); font-size:12px; font-weight:600; cursor:pointer; }
      .day-btn.on { background:var(--accent); color:white; border-color:var(--accent); }
    ` }} />);

}

Object.assign(window, { Agenda, NewAppointment });