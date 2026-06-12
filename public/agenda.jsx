// agenda.jsx — Agenda: two-column layout (mini-cal sidebar + view canvas)

const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WD_FULL_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const WD_MINI_PT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

// Tipos de agendamento — ícones no padrão de linha do sistema (Ic), sem emoji colorido
const APPOINTMENT_TYPES = [
{ label: 'Reunião', icon: 'users', color: '#3b82f6' },
{ label: 'Atendimento', icon: 'phone', color: '#16a34a' },
{ label: 'Comercial', icon: 'commercial', color: '#7c3aed' },
{ label: 'Treinamento', icon: 'star', color: '#f59e0b' },
{ label: 'Projeto', icon: 'columns', color: '#06b6d4' },
{ label: 'Evento', icon: 'calendar', color: '#ec4899' },
{ label: 'Viagem', icon: 'send', color: '#14b8a6' },
{ label: 'Ausência', icon: 'sun', color: '#64748b' },
{ label: 'Pessoal', icon: 'user', color: '#6366f1' },
{ label: 'Tarefa', icon: 'check-double', color: '#10b981' },
{ label: 'Financeiro', icon: 'coins', color: '#eab308' },
{ label: 'Gravação', icon: 'video', color: '#ef4444' },
{ label: 'Outro', icon: 'pin', color: '#94a3b8' }];

// ── Categorias dinâmicas: padrão (acima) + personalizadas (do banco) ──────────
// 20 ícones corporativos/tarefa para o popup de nova categoria.
const CATEGORY_ICONS = ['users', 'phone', 'commercial', 'star', 'columns', 'calendar', 'send', 'coins', 'video', 'check-double', 'chat', 'mail', 'file-text', 'contracts', 'team', 'megaphone', 'building', 'clock', 'flag', 'reports'];
const DEFAULT_LABELS = new Set(APPOINTMENT_TYPES.map((t) => t.label));
let CUSTOM_CATEGORIES = []; // linhas do banco: override de padrão (label de padrão) OU categoria do usuário
const CATEGORY_LISTENERS = new Set();
function notifyCategories() { CATEGORY_LISTENERS.forEach((fn) => fn()); }
function setCustomCategories(arr) { CUSTOM_CATEGORIES = arr; notifyCategories(); }
function addCustomCategory(cat) { CUSTOM_CATEGORIES = [...CUSTOM_CATEGORIES, cat]; notifyCategories(); }
function upsertCustomCategory(cat) {
  const exists = CUSTOM_CATEGORIES.some((c) => c.id === cat.id);
  CUSTOM_CATEGORIES = exists ? CUSTOM_CATEGORIES.map((c) => c.id === cat.id ? cat : c) : [...CUSTOM_CATEGORIES, cat];
  notifyCategories();
}
function removeCustomCategory(id) { CUSTOM_CATEGORIES = CUSTOM_CATEGORIES.filter((c) => c.id !== id); notifyCategories(); }
// Mescla padrão (código) + banco: linha do banco com label de padrão = override (padrao, não exclui);
// linha do banco com label próprio = categoria do usuário (exclui).
function allCategories() {
  const ovByLabel = {};
  CUSTOM_CATEGORIES.forEach((c) => { ovByLabel[c.label] = c; });
  const out = APPOINTMENT_TYPES.map((def) => {
    const ov = ovByLabel[def.label];
    return ov
      ? { label: def.label, icon: ov.icon || def.icon, color: ov.color || def.color, id: ov.id, padrao: true }
      : { label: def.label, icon: def.icon, color: def.color, padrao: true };
  });
  CUSTOM_CATEGORIES.forEach((c) => { if (!DEFAULT_LABELS.has(c.label)) out.push({ label: c.label, icon: c.icon, color: c.color, id: c.id, padrao: false }); });
  return out;
}
function catColor(type) { return (allCategories().find((c) => c.label === type) || {}).color || 'var(--accent)'; }
function useAgendaCategories() {
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => { CATEGORY_LISTENERS.add(force); return () => { CATEGORY_LISTENERS.delete(force); }; }, []);
  return allCategories();
}

const typeIcon = (label) => (allCategories().find((t) => t.label === label) || { icon: 'tag' }).icon;

// ── Configuração da agenda (compartilhada): horário comercial, intervalo, dias úteis… ──
const AGENDA_CONFIG_DEFAULTS = {
  timezone: 'America/Fortaleza', defaultDur: 60, primeiroDia: 'Domingo', visaoInicial: 'month', corPadrao: '#16a34a',
  horaInicio: '08:00', horaFim: '19:00', diasUteis: [false, true, true, true, true, true, false],
  intervalo: 10, overbooking: false, notifEmail: true, notifPush: true, notifWhatsapp: true,
  antecedencia: 60, notifInterna: true, google: true,
};
let AGENDA_CONFIG = { ...AGENDA_CONFIG_DEFAULTS };
const AGENDA_CONFIG_LISTENERS = new Set();
function setAgendaConfig(c) { AGENDA_CONFIG = { ...AGENDA_CONFIG_DEFAULTS, ...(c || {}) }; AGENDA_CONFIG_LISTENERS.forEach((fn) => fn()); }
function useAgendaConfig() {
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => { AGENDA_CONFIG_LISTENERS.add(force); return () => { AGENDA_CONFIG_LISTENERS.delete(force); }; }, []);
  return AGENDA_CONFIG;
}
// Dia útil? (diasUteis indexado por getDay(): 0=Dom … 6=Sáb)
function isDiaUtil(isoDate, cfg) {
  if (!isoDate) return true;
  const d = new Date(isoDate + 'T00:00:00');
  if (isNaN(d)) return true;
  const arr = (cfg && cfg.diasUteis) || AGENDA_CONFIG.diasUteis;
  return arr ? !!arr[d.getDay()] : true;
}
function _toMin(t) { const p = String(t || '').split(':'); return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0); }
// Há conflito de horário? (mesmo dia + sobreposição de horário + mesmo responsável)
function hasConflict(appts, novo, ignoreId) {
  if (!novo.data || !novo.start) return false;
  const s = _toMin(novo.start), e = s + (novo.dur || 60);
  return (appts || []).some((a) => {
    if (a.id && a.id === ignoreId) return false;
    if (a.data !== novo.data) return false;
    if (novo.resp && a.resp && a.resp !== novo.resp) return false;
    const as = _toMin(a.start), ae = as + (a.dur || 60);
    return s < ae && as < e;
  });
}
// Data/hora já passou? Compara com o INÍCIO do minuto atual (permite o minuto corrente).
function isPast(isoDate, hora) {
  if (!isoDate) return false;
  const dt = new Date(`${isoDate}T${hora && String(hora).length === 5 ? hora : '00:00'}:00`);
  if (isNaN(dt)) return false;
  const nowMin = Math.floor(Date.now() / 60000) * 60000;
  return dt.getTime() < nowMin;
}
// Primeiro dia da semana (config): 0=Domingo, 1=Segunda.
function firstDow(cfg) { return (cfg && cfg.primeiroDia === 'Segunda') ? 1 : 0; }
// Início da semana que contém `date`, respeitando o primeiro dia configurado.
function weekStartDate(date, fdow) { const s = new Date(date); s.setDate(s.getDate() - ((s.getDay() - fdow + 7) % 7)); return s; }

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
  const TYPES = useAgendaCategories();
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
          {TYPES.map((t) =>
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
              <Ic name={t.icon} size={16} style={t.color && t.label !== value ? { color: t.color } : undefined} />
              <span style={{ flex: 1 }}>{t.label}</span>
              {t.hint && <span style={{ fontSize: 11, opacity: .65 }}>{t.hint}</span>}
            </div>)}
        </div>}
    </div>);

}

function Agenda() {
  const { auth } = useStore();
  const [view, setView] = React.useState('month');
  const [cursor, setCursor] = React.useState(new Date());
  const [showNew, setShowNew] = React.useState(false);
  const [newAt, setNewAt] = React.useState(null); // { date, time } prefill from empty slot
  const openNewAt = (date, time) => setNewAt({ date, time });
  const [showNewTask, setShowNewTask] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [showMyAgenda, setShowMyAgenda] = React.useState(false);
  const [animKey, setAnimKey] = React.useState(0);
  const [animDir, setAnimDir] = React.useState('right');
  const [active, setActive] = React.useState(null); // { appt, mode: 'view' | 'edit' }
  // Agendamentos e tarefas via cache por empresa (api.jsx): revisita instantânea
  // + revalida no fundo. setAppts/setTasks aplicam as edições otimistas no cache.
  const { data: appts, setData: setAppts, loading: apptsLoading, reload: reloadAppts } = useCachedQuery(
    ['agenda'],
    async () => { try { const r = await API.getAgenda(); return r.agenda || []; } catch (e) { return []; } },
    { empresaId: auth.empresaId, initialData: [] },
  );
  // TEMPO REAL (leve): re-busca a agenda a cada 15s com a aba visível. Assim, se OUTRA
  // pessoa criar/editar/remover, os envolvidos veem sem precisar sair e voltar.
  React.useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') reloadAppts(); }, 15000);
    return () => clearInterval(id);
  }, [reloadAppts]);
  const { data: tasks, setData: setTasks, loading: tasksLoading } = useCachedQuery(
    ['agenda-tarefas'],
    async () => { try { const r = await API.getTarefas(); return r.tarefas || []; } catch (e) { return []; } },
    { empresaId: auth.empresaId, initialData: [] },
  );
  const [me, setMe] = React.useState(null);
  const loaded = !apptsLoading && !tasksLoading; // skeleton some quando agenda+tarefas chegam
  const cfg = useAgendaConfig();
  const [catFilter, setCatFilter] = React.useState(() => new Set()); // labels marcadas; vazio = mostra todos
  const toggleCat = (label) => setCatFilter((s) => { const n = new Set(s); n.has(label) ? n.delete(label) : n.add(label); return n; });
  // Cancelados (status='cancelado') somem do calendário, mas continuam no banco (histórico do contato).
  const filteredAppts = (catFilter.size ? appts.filter((a) => catFilter.has(a.type)) : appts).filter((a) => a.status !== 'cancelado');
  // Categorias, identidade (me) e config da agenda — busca leve secundária, fora do
  // cache (não bloqueia o skeleton; agendamentos/tarefas já vêm do cache acima).
  React.useEffect(() => {
    API.getCategorias().then((r) => setCustomCategories((r.categorias || []).map((c) => ({ id: c.id, label: c.nome, icon: c.icone, color: c.cor || null })))).catch(() => {});
    API.me().then((r) => setMe(r.user)).catch(() => {});
    API.getAgendaConfig().then((r) => { setAgendaConfig(r.config); const v = r.config && r.config.visaoInicial; if (v === 'week' || v === 'day' || v === 'month') setView(v); }).catch(() => {});
  }, []);
  // lembra a qtd de agendamentos/tarefas pro skeleton mostrar nº real
  React.useEffect(() => { if (loaded) skelRemember('agenda', Math.max(appts.length, tasks.length)); }, [loaded, appts.length, tasks.length]);
  const openView = (appt) => setActive({ appt, mode: 'view' });
  const openEdit = (appt) => setActive({ appt, mode: 'edit' });
  // Cancelar = SUAVE: marca status='cancelado' (não apaga). Otimista; reverte se falhar.
  const removeAppt = async (appt) => {
    setAppts((list) => list.map((x) => x.id === appt.id ? { ...x, status: 'cancelado' } : x));
    setActive(null);
    try { await API.updateApptApi(appt.id, { status: 'cancelado' }); window.showToast({ tipo: 'sucesso', titulo: 'Agendamento cancelado' }); }
    catch (e) { setAppts((list) => list.map((x) => x.id === appt.id ? { ...x, status: appt.status } : x)); window.showToast({ tipo: 'erro', titulo: 'Erro ao cancelar', descricao: e.message || 'Tente novamente.' }); }
  };
  const addAppt = async (dto) => { try { const r = await API.createAppt(dto); setAppts((list) => [...list, r.appt]); window.showToast({ tipo: 'sucesso', titulo: 'Agendamento criado' }); } catch (e) { window.showToast({ tipo: 'erro', titulo: 'Erro ao criar agendamento', descricao: e.message || 'Tente novamente.' }); } };
  const updateAppt = async (updated) => {
    try {
      const r = await API.updateApptApi(updated.id, { participante: updated.client, participanteTipo: updated.participanteTipo, clienteId: updated.clienteId || null, service: updated.service, data: updated.data, start: updated.start, dur: updated.dur, resp: updated.resp, respNome: updated.respNome, participantes: updated.participantes, type: updated.type, status: updated.status, local: updated.local, phone: updated.phone, obs: updated.obs });
      setAppts((list) => list.map((x) => x.id === r.appt.id ? r.appt : x));
      setActive(null); // salvou -> fecha a aba de imediato (não volta pra visualização)
      window.showToast({ tipo: 'sucesso', titulo: 'Agendamento atualizado' });
    } catch (e) { window.showToast({ tipo: 'erro', titulo: 'Erro ao atualizar', descricao: e.message || 'Tente novamente.' }); }
  };
  const addTask = async (dto) => { try { const r = await API.createTarefa(dto); setTasks((tt) => [...tt, r.tarefa]); window.showToast({ tipo: 'sucesso', titulo: 'Tarefa criada' }); } catch (e) { window.showToast({ tipo: 'erro', titulo: 'Erro ao criar tarefa', descricao: e.message || 'Tente novamente.' }); } };
  const toggleTask = async (t) => { const done = !t.done; setTasks((tt) => tt.map((x) => x.id === t.id ? { ...x, done } : x)); try { await API.updateTarefa(t.id, { done }); if (done) window.showToast({ tipo: 'sucesso', titulo: 'Tarefa concluída' }); } catch (e) { window.showToast({ tipo: 'erro', titulo: 'Erro ao atualizar tarefa', descricao: e.message || 'Tente novamente.' }); } };
  const deleteTask = async (id) => { setTasks((tt) => tt.filter((x) => x.id !== id)); try { await API.deleteTarefa(id); window.showToast({ tipo: 'sucesso', titulo: 'Tarefa excluída' }); } catch (e) { window.showToast({ tipo: 'erro', titulo: 'Erro ao excluir tarefa', descricao: e.message || 'Tente novamente.' }); } };

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
    const start = weekStartDate(cursor, firstDow(cfg));
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
          catFilter={catFilter}
          onToggleCat={toggleCat}
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
            <button className="btn btn-ghost btn-sm" onClick={() => setCursor(new Date())}>Hoje</button>}
          </div>
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <div key={animKey} className={`view-anim view-anim-${animDir}`} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
              {!loaded ? (view === 'tasks' ? <TasksSkeleton /> : <MonthSkeleton cursor={cursor} />) : <>
              {view === 'month' && <MonthView cursor={cursor} appts={filteredAppts} onView={openView} onEdit={openEdit} onDelete={removeAppt} onNewAt={openNewAt} onOpenDay={openDay} meId={me && me.id} />}
              {view === 'week' && <WeekView cursor={cursor} appts={filteredAppts} onView={openView} onEdit={openEdit} onDelete={removeAppt} onNewAt={openNewAt} meId={me && me.id} />}
              {view === 'day' && <DayView cursor={cursor} appts={filteredAppts} onView={openView} onEdit={openEdit} onDelete={removeAppt} onNewAt={openNewAt} meId={me && me.id} />}
              {view === 'tasks' && <TasksView cursor={cursor} setCursor={updateCursor} tasks={tasks} onToggle={toggleTask} onDelete={deleteTask} />}
              </>}
            </div>
          </div>
        </div>
      </div>
      {showNew && <NewAppointment appts={appts} defaultResponsible={me ? me.name : ''} onClose={() => setShowNew(false)} onSave={(a) => {addAppt(a);setShowNew(false);}} />}
      {newAt && <NewAppointment appts={appts} defaultResponsible={me ? me.name : ''} defaultDate={newAt.date} defaultTime={newAt.time} onClose={() => setNewAt(null)} onSave={(a) => {addAppt(a);setNewAt(null);}} />}
      {showNewTask && <NewTask onClose={() => setShowNewTask(false)} onCreate={(dto) => { addTask(dto); setShowNewTask(false); }} />}
      {active && active.mode === 'view' &&
      <AppointmentDetailDrawer
        appt={active.appt}
        meId={me && me.id}
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

function AgendaSidebar({ view, changeView, cursor, setCursor, onNew, onSettings, catFilter, onToggleCat }) {
  const cats = useAgendaCategories();
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
      <FabNovo size="sm" aberto label={view === 'tasks' ? 'Nova tarefa' : 'Novo agendamento'} onClick={onNew} />
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
      <div style={{ marginTop: 56, display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: 'var(--text-faint)', textTransform: 'uppercase', padding: '0 2px' }}>Categorias</div>
        <div className="cat-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', flex: 1, minHeight: 0, paddingRight: 2 }}>
          {cats.map((k, i) => {
          const on = catFilter && catFilter.has(k.label);
          return (
            <div key={k.id || ('def-' + i)} className="cat-row" onClick={() => onToggleCat && onToggleCat(k.label)}>
              <span className="cat-dot" style={{ background: k.color || 'var(--text-muted)' }} />
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.label}</span>
              <span className="cat-check" style={{ background: on ? 'var(--accent)' : 'transparent', border: on ? '1px solid var(--accent)' : '1px solid var(--border-strong)', color: on ? '#fff' : 'transparent' }}>{on && <Ic name="check" size={11} />}</span>
            </div>);
          })}
        </div>
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

function useEvPopover({ onView, onEdit, onDelete, meId }) {
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
      meId={meId}
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
              <button className="btn fin-btn-back" onClick={() => setConfirmDel(null)}>Voltar</button>
              <button className="btn btn-danger" onClick={() => {onDelete && onDelete(confirmDel);setConfirmDel(null);}}>
                <Ic name="x" size={14} /> Cancelar
              </button>
            </>
      }>
        
        <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5 }}>
          O agendamento de <strong>{confirmDel.client}</strong> — {confirmDel.service}, dia {(confirmDel.data || '').split('-').reverse().slice(0, 2).join('/')} às {confirmDel.start} — será cancelado. Esta ação não pode ser desfeita.
        </div>
      </Modal>
    }
    </>;


  return { evProps, layer };
}

// ── Skeletons (esqueleto de carregamento) — mesma estrutura/grid do conteúdo real ──
// Grade do mês: reusa .month-view/.month-grid/.month-cell, células com 1-2 barrinhas
function MonthSkeleton({ cursor = new Date() }) {
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const startWd = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return (
    <div className="month-view scroll">
      <div className="month-wd-row">
        {WD_FULL_PT.map((w) => <div key={w} className="month-wd">{w.toUpperCase()}</div>)}
      </div>
      <div className="month-grid">
        {Array.from({ length: 42 }).map((_, i) => {
          const cur = i >= startWd && i < startWd + daysInMonth;
          const nEv = cur ? [0, 1, 2, 0, 1, 0, 2][i % 7] : 0; // 0-2 barrinhas variadas
          return (
            <div key={i} className="month-cell" data-current={cur}>
              <div className="month-cell-day" style={{ height: '14px' }}><Skeleton w={16} h={11} /></div>
              <div className="month-cell-evs">
                {Array.from({ length: nEv }).map((_, j) => <Skeleton key={j} h={16} r={4} style={{ width: `${70 + (j * 13) % 25}%`, marginTop: 2 }} />)}
              </div>
            </div>);
        })}
      </div>
    </div>);
}
// Lista de tarefas: reusa .eis-wrap/.eis-grid/.eis-quad com cards skeleton
function TasksSkeleton() {
  const order = ['fazer', 'agendar', 'delegar', 'eliminar'];
  return (
    <div className="eis-wrap scroll">
      <div className="eis-grid">
        {order.map((qid) => {
          const q = EISENHOWER[qid];
          return (
            <div key={qid} className="eis-quad" style={{ '--qc': q.color }}>
              <div className="eis-quad-head">
                <span className="eis-quad-ic"><Ic name={q.icon} size={16} /></span>
                <div className="eis-quad-titles">
                  <div className="eis-quad-name">{q.label}</div>
                  <div className="eis-quad-axis">{q.axis}</div>
                </div>
                <span className="eis-quad-count"><Skeleton w={14} h={14} r={4} /></span>
              </div>
              <div className="eis-quad-tip">{q.tip}</div>
              <div className="eis-quad-list">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="eis-card">
                    <Skeleton w={18} h={18} r={5} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Skeleton w={`${55 + (i * 11) % 35}%`} h={13} />
                      <Skeleton w="40%" h={10} style={{ marginTop: 6 }} />
                    </div>
                    <Skeleton circle w={24} h={24} />
                  </div>
                ))}
              </div>
            </div>);
        })}
      </div>
    </div>);
}

function MonthView({ cursor, appts = APPOINTMENTS, onView, onEdit, onDelete, onNewAt, onOpenDay, meId }) {
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

  const today = new Date(); // dia atual real -> realça o "hoje" em verde claro
  const { evProps, layer } = useEvPopover({ onView, onEdit, onDelete, meId });

  return (
    <div className="month-view scroll">
      <div className="month-wd-row">
        {WD_FULL_PT.map((w) => <div key={w} className="month-wd">{w.toUpperCase()}</div>)}
      </div>
      <div className="month-grid">
        {cells.map((c, i) => {
          const isToday = c.cur && c.d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const evs = c.cur ? appts.filter((a) => a.data === ymd(new Date(year, month, c.d))) : [];
          return (
            <div
              key={i}
              className={'month-cell' + (c.cur ? ' month-cell-click' : '')}
              data-current={c.cur}
              data-today={isToday}
              onClick={c.cur && onNewAt ? () => onNewAt(ymd(new Date(year, month, c.d))) : undefined}
              title={c.cur ? 'Novo agendamento neste dia' : undefined}>
              <div className="month-cell-day" style={{ height: "14px" }}>{c.d.toString().padStart(2, '0')}</div>
              <div className="month-cell-evs">
                {evs.slice(0, 3).map((e, j) =>
                <div
                  key={j}
                  className="month-ev"
                  style={{ background: `color-mix(in oklab, ${catColor(e.type)} 16%, var(--surface))`, color: catColor(e.type), borderLeft: `3px solid ${catColor(e.type)}`, fontSize: "10px", cursor: 'pointer' }}
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

function MonthEvPopover({ ev, rect, onEnter, onLeave, onView, onEdit, onDelete, meId }) {
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

  const respNome = ev.respNome || (TEAM.find((m) => m.id === ev.resp) || {}).name || null;
  const outros = (ev.participantes || []).filter((p) => p.papel !== 'responsavel' && (p.nome || '').trim());
  const canEdit = !meId || ev.resp === meId;
  const accent = catColor(ev.type);
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
        {respNome &&
        <div className="mep-row">
            <Ic name="team" size={13} />
            <span>{respNome}</span>
          </div>
        }
        {outros.length > 0 &&
        <div className="mep-row">
            <Ic name="participants" size={13} />
            <span>{outros.map((p) => p.nome).join(', ')}</span>
          </div>
        }
      </div>
      <div className="mep-chips">
        <span className="mep-chip" data-status={ev.status}>{ev.status}</span>
        {ev.byAI && <span className="mep-chip mep-ai"><Ic name="sparkles" size={11} /> IA</span>}
      </div>
      <div className="mep-foot">
        {canEdit &&
        <button className="mep-act mep-act-danger" title="Cancelar agendamento" onClick={stop(onDelete)}>
          <Ic name="x" size={15} />
        </button>}
        {canEdit &&
        <button className="mep-act" title="Editar agendamento" onClick={stop(onEdit)}>
          <Ic name="edit" size={15} />
        </button>}
        <button className="mep-act" title="Visualizar detalhes" onClick={stop(onView)}>
          <Ic name="eye" size={15} />
        </button>
      </div>
    </div>,
    document.body);

}

// Faixa de horas da grade (semana/dia): parte das horas de trabalho (config) e EXPANDE
// para incluir QUALQUER agendamento fora do intervalo — assim nada fica cortado/escondido.
function gridHours(cfg, dayAppts) {
  const hh = (s) => { const n = parseInt(String(s || '').split(':')[0], 10); return Number.isFinite(n) ? n : null; };
  const mm = (s) => { const p = String(s || '').split(':'); const h = parseInt(p[0], 10), m = parseInt(p[1], 10); return Number.isFinite(h) ? h * 60 + (Number.isFinite(m) ? m : 0) : null; };
  let lo = 7, hi = 19; // piso histórico (07–19)
  const cs = hh(cfg && cfg.horaInicio); if (cs != null) lo = Math.min(lo, cs);
  const ce = hh(cfg && cfg.horaFim);    if (ce != null) hi = Math.max(hi, ce);
  (dayAppts || []).forEach((a) => {
    const sm = mm(a.start); if (sm == null) return;
    lo = Math.min(lo, Math.floor(sm / 60));
    hi = Math.max(hi, Math.ceil((sm + (a.dur || 60)) / 60) - 1);
  });
  lo = Math.max(0, Math.min(lo, 23));
  hi = Math.min(23, Math.max(hi, lo));
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
}

function WeekView({ cursor, appts = APPOINTMENTS, onView, onEdit, onDelete, onNewAt, meId }) {
  const cfg = useAgendaConfig();
  const start = weekStartDate(cursor, firstDow(cfg));
  const days = Array.from({ length: 7 }, (_, i) => {const d = new Date(start);d.setDate(d.getDate() + i);return d;});
  const hours = gridHours(cfg, appts.filter((a) => days.some((d) => a.data === ymd(d)))); // dinâmico: horas de trabalho + agendamentos da semana
  const DAY_START = hours[0] * 60;
  const HOUR_H = 56;
  const today = new Date(); // dia atual real -> realça o "hoje" no cabeçalho em verde claro
  const { evProps, layer } = useEvPopover({ onView, onEdit, onDelete, meId });
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
          const evs = appts.filter((a) => a.data === ymd(d));
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
                      background: `color-mix(in oklab, ${catColor(ev.type)} 16%, var(--surface))`,
                      color: catColor(ev.type),
                      borderLeft: `3px solid ${catColor(ev.type)}`
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

function DayView({ cursor, appts = APPOINTMENTS, onView, onEdit, onDelete, onNewAt, meId }) {
  const cfg = useAgendaConfig();
  const hours = gridHours(cfg, appts.filter((a) => a.data === ymd(cursor))); // dinâmico: horas de trabalho + agendamentos do dia
  const DAY_START = hours[0] * 60;
  const HOUR_H = 76;
  const inMay = cursor.getMonth() === 4 && cursor.getFullYear() === 2026;
  const evs = appts.filter((a) => a.data === ymd(cursor));
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
              const respNome = ev.respNome || (TEAM.find((m) => m.id === ev.resp) || {}).name || null;
              const outros = (ev.participantes || []).filter((p) => p.papel !== 'responsavel' && (p.nome || '').trim());
              const canEdit = !meId || ev.resp === meId;
              const compact = height < 64;
              return (
                <div
                  key={ev.id}
                  className="day-ev"
                  onClick={() => onView && onView(ev)}
                  style={{
                    top: top + 2, height: Math.max(30, height - 4),
                    left: `calc(${lane * w}% + 2px)`, width: `calc(${w}% - 4px)`,
                    background: `color-mix(in oklab, ${catColor(ev.type)} 16%, var(--surface))`,
                    color: catColor(ev.type),
                    borderLeft: `4px solid ${catColor(ev.type)}`
                  }}>
                  <div className="day-ev-main">
                    <div className="day-ev-time"><Ic name="clock" size={12} /> {ev.start}–{fmtEndTime(ev.start, ev.dur)} <span style={{ opacity: .7 }}>· {ev.dur} min</span></div>
                    <div className="day-ev-client">{ev.client}</div>
                    {!compact &&
                    <div className="day-ev-meta">
                        <span><Ic name={typeIcon(ev.type)} size={12} /> {ev.type}</span>
                        <span><Ic name="map-pin" size={12} /> {ev.local}</span>
                        {respNome && <span><Ic name="team" size={12} /> {respNome}</span>}
                        {outros.length > 0 && <span><Ic name="participants" size={12} /> {outros.map((p) => p.nome).join(', ')}</span>}
                      </div>
                    }
                  </div>
                  <div className="day-ev-actions" onClick={(e) => e.stopPropagation()}>
                    {canEdit && <button className="day-ev-act day-ev-act-danger" title="Cancelar agendamento" onClick={() => setConfirmDel(ev)}><Ic name="x" size={14} /></button>}
                    {canEdit && <button className="day-ev-act" title="Editar agendamento" onClick={() => onEdit && onEdit(ev)}><Ic name="edit" size={14} /></button>}
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
            <button className="btn fin-btn-back" onClick={() => setConfirmDel(null)}>Voltar</button>
            <button className="btn btn-danger" onClick={() => {onDelete && onDelete(confirmDel);setConfirmDel(null);}}>
              <Ic name="x" size={14} /> Cancelar
            </button>
          </>
        }>
        
        <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5 }}>
          O agendamento de <strong>{confirmDel.client}</strong> — {confirmDel.service}, dia {(confirmDel.data || '').split('-').reverse().slice(0, 2).join('/')} às {confirmDel.start} — será cancelado. Esta ação não pode ser desfeita.
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

function TasksView({ cursor, setCursor, tasks = [], onToggle, onDelete }) {
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
                    <div key={t.id} className={`eis-card ${t.done ? 'done' : ''}`} onClick={() => onToggle && onToggle(t)}>
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

function ClientCombo({ defaultValue = '', onChange, onPick }) {
  const [q, setQ] = React.useState(defaultValue);
  const setQv = (v) => {setQ(v);if (onChange) onChange(v);};
  const [open, setOpen] = React.useState(false);
  const [hi, setHi] = React.useState(0);
  const [list, setList] = React.useState([]);
  const wrapRef = React.useRef(null);
  // Busca clientes reais no banco (debounce simples).
  React.useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      API.getClientes(q).then((r) => { if (alive) setList((r.clientes || []).slice(0, 50)); }).catch(() => { if (alive) setList([]); });
    }, 180);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);
  React.useEffect(() => {
    const onDoc = (e) => {if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);};
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const pick = (c) => {setQv(c.nome);setOpen(false);if (onPick) onPick(c);};
  const onKey = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {setOpen(true);return;}
    if (e.key === 'ArrowDown') {e.preventDefault();setHi((h) => Math.min(h + 1, list.length - 1));} else
    if (e.key === 'ArrowUp') {e.preventDefault();setHi((h) => Math.max(h - 1, 0));} else
    if (e.key === 'Enter') {e.preventDefault();if (list[hi]) pick(list[hi]);} else
    if (e.key === 'Escape') {setOpen(false);}
  };
  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        className="input"
        placeholder="Buscar cliente por nome ou telefone..."
        value={q}
        onChange={(e) => {setQv(e.target.value);setOpen(true);setHi(0);}}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey} />
      {open &&
      <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 12px 28px rgba(15,23,42,.16)', zIndex: 20, maxHeight: 280, overflow: 'auto' }}>
          {list.length === 0 ?
        <div style={{ padding: '14px 14px', fontSize: 'var(--type-sm)', color: 'var(--text-faint)' }}>Nenhum cliente encontrado</div> :
        list.map((c, i) =>
        <div key={c.id}
        onMouseDown={(e) => {e.preventDefault();pick(c);}}
        onMouseEnter={() => setHi(i)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', background: i === hi ? 'var(--surface-2)' : 'transparent' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                  {(c.nome || '?').split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--type-sm)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{c.telefone || 'sem telefone'}</div>
                </div>
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

// Seletor de participante do agendamento: tipo (Cliente/Lead/Usuário/Outros) + lista respectiva.
// onChange recebe { name, tipo, clienteId, phone }.
function ParticipantPicker({ onChange, defaultValue }) {
  const TYPES = [
    { id: 'cliente', label: 'Cliente' },
    { id: 'lead', label: 'Lead' },
    { id: 'usuario', label: 'Usuário' },
    { id: 'outro', label: 'Outros' },
  ];
  const [tipo, setTipo] = React.useState('cliente');
  const [q, setQ] = React.useState(defaultValue && defaultValue.name ? defaultValue.name : '');
  const [open, setOpen] = React.useState(false);
  const [list, setList] = React.useState([]);
  const [hi, setHi] = React.useState(0);
  const wrapRef = React.useRef(null);

  React.useEffect(() => {
    if (tipo === 'outro') { setList([]); return; }
    let alive = true;
    const t = setTimeout(async () => {
      try {
        let items = [];
        if (tipo === 'cliente') {
          const r = await API.getClientes(q);
          items = (r.clientes || []).map((c) => ({ id: c.id, name: c.nome, phone: c.telefone }));
        } else if (tipo === 'lead') {
          const r = await API.getLeads();
          items = (r.leads || []).map((l) => ({ id: l.id, name: l.name, phone: l.phone }));
        } else if (tipo === 'usuario') {
          const r = await API.getUsuarios();
          items = (r.usuarios || []).map((u) => ({ id: u.id, name: u.nome, phone: '' }));
        }
        const nq = (q || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        if (nq && tipo !== 'cliente') items = items.filter((it) => (it.name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(nq));
        if (alive) setList(items.slice(0, 50));
      } catch (e) { if (alive) setList([]); }
    }, 180);
    return () => { alive = false; clearTimeout(t); };
  }, [tipo, q]);

  React.useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Pré-preenche a partir de um card (CRM): detecta se a pessoa é Lead ou Cliente.
  React.useEffect(() => {
    if (!defaultValue || !defaultValue.name) return;
    let alive = true;
    const dv = defaultValue;
    (async () => {
      const nm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
      const dg = (s) => (s || '').replace(/\D/g, '');
      let lead = null;
      // Se o card já sabe que é cliente, não procura nos leads (evita falso-positivo).
      if (dv.tipo !== 'cliente') {
        try {
          const r = await API.getLeads();
          lead = (r.leads || []).find((l) => nm(l.name) === nm(dv.name) || (dv.phone && dg(l.phone) && dg(l.phone) === dg(dv.phone)));
        } catch (e) {}
      }
      if (!alive) return;
      // Abre como Lead se o card é explicitamente lead OU se encontrou correspondência nos leads.
      if (dv.tipo === 'lead' || lead) { setTipo('lead'); setQ((lead && lead.name) || dv.name); onChange && onChange({ name: (lead && lead.name) || dv.name, tipo: 'lead', clienteId: null, participanteId: lead ? lead.id : null, phone: (lead && lead.phone) || dv.phone || '' }); }
      else { setTipo('cliente'); setQ(dv.name); onChange && onChange({ name: dv.name, tipo: 'cliente', clienteId: dv.clienteId || null, participanteId: dv.clienteId || null, phone: dv.phone || '' }); }
    })();
    return () => { alive = false; };
  }, []);
  const changeType = (nt) => { setTipo(nt); setQ(''); setList([]); setOpen(false); onChange && onChange({ name: '', tipo: nt, clienteId: null, participanteId: null, phone: '' }); };
  const typed = (v) => { setQ(v); setHi(0); if (tipo !== 'outro') setOpen(true); onChange && onChange({ name: v, tipo, clienteId: null, participanteId: null, phone: '' }); };
  const pick = (it) => { setQ(it.name); setOpen(false); onChange && onChange({ name: it.name, tipo, clienteId: tipo === 'cliente' ? it.id : null, participanteId: it.id || null, phone: it.phone || '' }); };
  const onKey = (e) => {
    if (tipo === 'outro') return;
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { setOpen(true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, list.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (list[hi]) pick(list[hi]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };
  const curLabel = (TYPES.find((t) => t.id === tipo) || {}).label || '';

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div className="row" style={{ gap: 8 }}>
        <select className="input" style={{ width: 130, flexShrink: 0 }} value={tipo} onChange={(e) => changeType(e.target.value)}>
          {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <input className="input" style={{ flex: 1 }}
          placeholder={tipo === 'outro' ? 'Digite o nome…' : `Buscar ${curLabel.toLowerCase()}…`}
          value={q}
          onChange={(e) => typed(e.target.value)}
          onFocus={() => { if (tipo !== 'outro') setOpen(true); }}
          onKeyDown={onKey} />
      </div>
      {open && tipo !== 'outro' &&
      <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 138, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 12px 28px rgba(15,23,42,.16)', zIndex: 20, maxHeight: 260, overflow: 'auto' }}>
        {list.length === 0 ?
        <div style={{ padding: '12px 14px', fontSize: 'var(--type-sm)', color: 'var(--text-faint)' }}>Nenhum {curLabel.toLowerCase()} encontrado</div> :
        list.map((it, i) =>
        <div key={it.id}
          onMouseDown={(e) => { e.preventDefault(); pick(it); }}
          onMouseEnter={() => setHi(i)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', background: i === hi ? 'var(--surface-2)' : 'transparent' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
            {(it.name || '?').split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 'var(--type-sm)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}</div>
            {it.phone && <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{it.phone}</div>}
          </div>
        </div>)}
      </div>}
    </div>);
}

// Aba lateral (mesma largura do "Novo agendamento") com os agendamentos de um contato.
// Card no padrão do kit (.card) + faixa esquerda na cor do status e chip de status.
// Filtro por status no topo. NOTA: agendas SIMULADAS (mock) só para validar o layout.
function AgendaContato({ participante, onClose }) {
  const p = participante || {};
  const nome = p.name || 'Lucas Ros';
  // Status: Agendado (azul) · Cumprido (verde) · Cancelado (vermelho).
  const ST = {
    agendado:  { cor: '#165EEE', label: 'Agendado' },
    cumprido:  { cor: '#16A34A', label: 'Cumprido' },
    cancelado: { cor: '#FF452A', label: 'Cancelado' },
  };
  // Mapeia o status do backend (agendado/confirmado/realizado/cancelado) para os 3 buckets.
  const mapStatus = (s) => {
    const v = String(s || '').toLowerCase();
    if (v === 'realizado' || v === 'cumprido' || v === 'concluido') return 'cumprido';
    if (v === 'cancelado' || v === 'cancelada') return 'cancelado';
    return 'agendado'; // agendado, confirmado, etc.
  };
  const fmtDataCurta = (d) => (d ? d.split('-').reverse().slice(0, 2).join('/') : '');

  // Dados REAIS: agenda do contato (filtra por cliente/nome/telefone). null = carregando.
  const [appts, setAppts] = React.useState(null);
  React.useEffect(() => {
    let alive = true;
    const foneDig = (s) => String(s || '').replace(/\D/g, '');
    const alvoFone = foneDig(p.phone);
    const alvoNome = (p.name || '').trim().toLowerCase();
    window.API.getAgenda()
      .then((r) => {
        if (!alive) return;
        const meus = (r.agenda || []).filter((a) =>
          (p.clienteId && a.clienteId && a.clienteId === p.clienteId) ||
          (!p.clienteId && alvoNome && (a.client || '').trim().toLowerCase() === alvoNome) ||
          (alvoFone && foneDig(a.phone) && foneDig(a.phone) === alvoFone));
        setAppts(meus.map((a) => ({ ...a, _st: mapStatus(a.status) })));
      })
      .catch(() => { if (alive) setAppts([]); });
    return () => { alive = false; };
  }, [p.clienteId, p.name, p.phone]);

  const [filtros, setFiltros] = React.useState([]); // status ativos; vazio = todos
  const toggle = (k) => setFiltros((f) => f.includes(k) ? f.filter((x) => x !== k) : [...f, k]);
  const todas = appts || [];
  const lista = filtros.length ? todas.filter((a) => filtros.includes(a._st)) : todas;

  // Card no padrão do kit (.card): superfície branca, borda colorida + faixa esquerda 3px
  // na cor do status; chip de status (campo na cor da borda) no canto superior direito.
  const Card = (a) => {
    const cor = (ST[a._st] || ST.agendado).cor;
    const respName = a.respNome || (TEAM.find((m) => m.id === a.resp) || {}).name || a.resp || '—';
    return (
      <div key={a.id} className="card" style={{ position: 'relative', padding: '12px 14px', boxShadow: 'var(--shadow-sm)', borderColor: `color-mix(in oklab, ${cor} 38%, var(--border))`, borderLeftWidth: 3, borderLeftColor: cor }}>
        <span style={{ position: 'absolute', top: 11, right: 11, background: cor, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '.02em', padding: '3px 9px', borderRadius: 999 }}>{(ST[a._st] || {}).label || a._st}</span>
        <div className="mep-title" style={{ paddingRight: 86 }}>{a.service || a.type || 'Agendamento'}</div>
        <div className="mep-rows" style={{ gap: 8, marginTop: 9 }}>
          <div className="mep-row"><Ic name="clock" size={13} /><span>{fmtDataCurta(a.data)} · {a.start} – {fmtEndTime(a.start, a.dur)} <span className="mep-dim">({a.dur} min)</span></span></div>
          <div className="mep-row"><Ic name={typeIcon(a.type)} size={13} /><span>{a.type}</span></div>
          <div className="mep-row"><Ic name="map-pin" size={13} /><span>{a.local || '—'}</span></div>
          <div className="mep-row"><Ic name="team" size={13} /><span>{respName}</span></div>
        </div>
      </div>
    );
  };

  // Filtro por status (abaixo do cabeçalho): pílulas na cor de cada status.
  const filtroBar = (
    <div style={{ display: 'flex', gap: 8, padding: '10px 22px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
      {Object.keys(ST).map((k) => {
        const on = filtros.includes(k); const cor = ST[k].cor;
        return (
          <button key={k} onClick={() => toggle(k)} style={{
            fontSize: 'var(--type-xs)', fontWeight: 600, padding: '5px 12px', borderRadius: 999, cursor: 'pointer',
            border: `1px solid ${on ? cor : `color-mix(in oklab, ${cor} 40%, var(--border))`}`,
            background: on ? cor : `color-mix(in oklab, ${cor} 10%, var(--surface))`,
            color: on ? '#fff' : cor, transition: 'all .12s ease',
          }}>{ST[k].label}</button>
        );
      })}
    </div>
  );

  return (
    <Drawer title={`Agendamentos de ${nome}`} onClose={onClose} width={DRAWER_W} className="appt-drawer" belowHead={filtroBar}
      footer={<><div style={{ flex: 1 }} /><ActionButton action="voltar" size="md" label="Fechar" onClick={onClose} /></>}>
      {appts === null ? (
        <div className="col" style={{ gap: 12 }}>{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} h={92} r={14} />)}</div>
      ) : todas.length === 0 ? (
        <EmptyState icon="agenda" title="Nenhum agendamento" desc="Este contato ainda não tem agendamentos." />
      ) : (
        <div className="col" style={{ gap: 12 }}>
          {lista.length ? lista.map(Card) : <div className="muted" style={{ fontSize: 'var(--type-sm)', textAlign: 'center', padding: 20 }}>Nenhum agendamento neste filtro.</div>}
        </div>
      )}
    </Drawer>
  );
}

function NewAppointment({ onClose, onSave, defaultClient = '', defaultResponsible = '', defaultDate, defaultTime, appts = [], defaultParticipante, lockResponsible = false }) {
  const _now = new Date();
  const [date, setDate] = React.useState(defaultDate || ymd(_now));
  const [time, setTime] = React.useState(defaultTime || `${String(_now.getHours()).padStart(2, '0')}:${String(_now.getMinutes()).padStart(2, '0')}`);
  const [duration, setDuration] = React.useState('60');
  const [apptType, setApptType] = React.useState('Atendimento');
  const [client, setClient] = React.useState(defaultParticipante ? (defaultParticipante.name || '') : defaultClient);
  const [clienteId, setClienteId] = React.useState(null);
  const [participanteTipo, setParticipanteTipo] = React.useState('cliente');
  const [participanteId, setParticipanteId] = React.useState(null);
  const [service, setService] = React.useState('');
  const [local, setLocal] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [obs, setObs] = React.useState('');
  const [status, setStatus] = React.useState('agendado');
  const [showAgenda, setShowAgenda] = React.useState(false); // aba lateral c/ agendamentos do contato
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

  // Responsável: usuários REAIS da empresa; default = você (usuário logado).
  const [users, setUsers] = React.useState([]);
  const [respId, setRespId] = React.useState('');
  const [respName, setRespName] = React.useState(defaultResponsible || '');
  // Participantes adicionais (além do principal): usuário, cliente, lead ou externo.
  const [extras, setExtras] = React.useState([]);
  const [pendingExtra, setPendingExtra] = React.useState(null);
  const [extraKey, setExtraKey] = React.useState(0);
  React.useEffect(() => {
    let alive = true;
    Promise.all([API.getUsuarios().catch(() => ({})), API.me().catch(() => ({}))]).then(([ru, rm]) => {
      if (!alive) return;
      const us = (ru.usuarios || []).map((u) => ({ id: u.id, nome: u.nome }));
      setUsers(us);
      const meId = rm.user && rm.user.id;
      const meU = us.find((u) => u.id === meId) || us[0];
      if (meU) { setRespId(meU.id); setRespName(meU.nome); }
    });
    return () => { alive = false; };
  }, []);
  const addExtra = () => { if (pendingExtra && (pendingExtra.name || '').trim()) { setExtras((xs) => [...xs, pendingExtra]); setPendingExtra(null); setExtraKey((k) => k + 1); } };
  const removeExtra = (i) => setExtras((xs) => xs.filter((_, idx) => idx !== i));
  const STATUSES = ['agendado', 'confirmado', 'realizado'];

  const cfg = useAgendaConfig();
  const conflito = !cfg.overbooking && hasConflict(appts, { data: date, start: time, dur: parseInt(duration, 10) || 60, resp: respId });
  const valid = client.trim() && service.trim() && isDiaUtil(date, cfg) && !conflito && !isPast(date, time);
  const submit = () => {
    if (!valid || !onSave) {onClose();return;}
    // participante PRINCIPAL (dirige o título/exibição) + adicionais -> lista completa.
    const principal = { tipo: participanteTipo, userId: participanteTipo === 'usuario' ? participanteId : null, clienteId: (participanteTipo === 'cliente' || participanteTipo === 'lead') ? (clienteId || participanteId) : null, nome: client.trim() };
    const participantes = [principal, ...extras.map((p) => ({ tipo: p.tipo, userId: p.tipo === 'usuario' ? p.participanteId : null, clienteId: (p.tipo === 'cliente' || p.tipo === 'lead') ? (p.clienteId || p.participanteId) : null, nome: p.name }))];
    onSave({
      participante: client.trim(),
      participanteTipo,
      participanteId,
      respNome: respName,
      clienteId,
      client: client.trim(),
      service: service.trim(),
      data: date,
      start: time,
      dur: parseInt(duration, 10),
      resp: respId,
      participantes,
      source: 'manual',
      status,
      byAI: false,
      type: apptType,
      local: local.trim() || '—',
      phone: phone.trim() || '—',
      obs: obs.trim()
    });
  };

  return (
    <>
    <Drawer title="Novo agendamento" subtitle="Cadastre um compromisso" onClose={onClose} width={DRAWER_W}
    rightHead={defaultParticipante ? <ActionButton action="editar" size="sm" label="Agenda" icon="agenda" className="ag-head-ic" onClick={() => setShowAgenda(true)} style={{ height: 30, padding: '0 10px', fontSize: 'var(--type-xs)' }} /> : null}
    footer={(close) => <><div style={{ flex: 1 }} /><ActionButton action="salvar" size="md" label="Criar" disabled={!valid} onClick={() => close(submit)} /></>}>
      <div className="col" style={{ gap: 14 }}>
        <div><label className="label">Participante</label><ParticipantPicker defaultValue={defaultParticipante} onChange={(p) => { setClient(p.name); setParticipanteTipo(p.tipo); setClienteId(p.clienteId); setParticipanteId(p.participanteId); if (p.phone && !phone) setPhone(p.phone); }} /></div>
        <div>
          <label className="label">Outros participantes <span className="muted" style={{ fontWeight: 400 }}>(opcional)</span></label>
          {extras.length > 0 &&
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {extras.map((p, i) => <PartChip key={i} p={p} onRemove={() => removeExtra(i)} />)}
          </div>}
          <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}><ParticipantPicker key={extraKey} onChange={setPendingExtra} /></div>
            <ActionButton action="salvar" icon="plus" label="" efeito={false} size="md" onClick={addExtra} disabled={!pendingExtra || !(pendingExtra.name || '').trim()} title="Adicionar participante" style={{ flexShrink: 0 }} />
          </div>
        </div>
        <div><label className="label">Serviço</label><input className="input" value={service} onChange={(e) => setService(e.target.value)} placeholder="Ex.: Limpeza de pele" /></div>
        <div className="row" style={{ gap: 10 }}>
          <div style={{ flex: 1 }}><label className="label">Data</label><DateInput value={date} onChange={setDate} /></div>
          <div style={{ flex: 1 }}><label className="label">Hora</label><TimeInput value={time} onChange={setTime} startTime={cfg.horaInicio} endTime={cfg.horaFim} step={cfg.intervalo || 15} /></div>
        </div>
        {isPast(date, time) && <div style={{ fontSize: 'var(--type-xs)', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 5 }}><Ic name="alert" size={12} /> Data/hora no passado — escolha um horário futuro.</div>}
        {!isDiaUtil(date, cfg) && <div style={{ fontSize: 'var(--type-xs)', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 5 }}><Ic name="alert" size={12} /> Esse dia não é um dia útil na configuração da agenda — escolha outra data.</div>}
        {conflito && <div style={{ fontSize: 'var(--type-xs)', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 5 }}><Ic name="alert" size={12} /> Já existe um compromisso nesse horário para o responsável. Ative "Permitir overbooking" nas Configurações para marcar mesmo assim.</div>}
        <div className="row" style={{ gap: 10 }}>
          <div style={{ flex: 1 }}><label className="label">Duração</label><DurationSelect value={duration} onChange={setDuration} options={DURATIONS} /></div>
          <div style={{ flex: 1 }}><label className="label">Categoria</label><TypeSelect value={apptType} onChange={setApptType} /></div>
        </div>
        <div><label className="label">Local</label><input className="input" value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex.: Sala 1" /></div>
        <div className="row" style={{ gap: 10 }}>
          <div style={{ flex: 1 }}><label className="label">Responsável</label>
            <select className="input" value={respId} onChange={(e) => { setRespId(e.target.value); setRespName((users.find((u) => u.id === e.target.value) || {}).nome || ''); }}>
              {users.length === 0 && <option value="">—</option>}
              {users.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}><label className="label">Status</label><select className="input" value={status} onChange={(e) => setStatus(e.target.value)} style={{ textTransform: 'capitalize' }}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
        </div>
        <div><label className="label">Telefone</label><PhoneInput value={phone} onChange={setPhone} /></div>
        <div><label className="label">Observações</label><textarea className="input" rows={4} value={obs} onChange={(e) => setObs(e.target.value)} /></div>
      </div>
    </Drawer>
    {showAgenda && <AgendaContato participante={{ name: client || (defaultParticipante && defaultParticipante.name) || '', clienteId: clienteId || (defaultParticipante && defaultParticipante.clienteId) || null, phone: phone || (defaultParticipante && defaultParticipante.phone) || '' }} onClose={() => setShowAgenda(false)} />}
    </>);

}

function NewTask({ onClose, onCreate }) {
  const _now = new Date();
  const [title, setTitle] = React.useState('');
  const [cat, setCat] = React.useState('Tarefa');
  const [date, setDate] = React.useState(ymd(_now));
  const [time, setTime] = React.useState(`${String(_now.getHours()).padStart(2, '0')}:${String(_now.getMinutes()).padStart(2, '0')}`);
  const [important, setImportant] = React.useState(null);
  const [urgent, setUrgent] = React.useState(null);
  const cfg = useAgendaConfig();
  const decided = important !== null && urgent !== null;
  const valid = decided && title.trim() && isDiaUtil(date, cfg) && !isPast(date, time);
  const submit = () => {
    if (!valid) return;
    const due = date ? `${date.split('-').reverse().join('/')}${time ? ' ' + time : ''}` : '';
    if (onCreate) onCreate({ title: title.trim(), cat, important: !!important, urgent: !!urgent, due, resp: '' });
    else onClose();
  };
  const qid = !decided ? null : quadrantOf({ important, urgent });
  const q = qid ? EISENHOWER[qid] : null;

  const YesNo = ({ value, onChange }) =>
  <div className="ynseg">
      <button type="button" className={`ynbtn ${value === true ? 'on' : ''}`} onClick={() => onChange(true)}>Sim</button>
      <button type="button" className={`ynbtn ${value === false ? 'on' : ''}`} onClick={() => onChange(false)}>Não</button>
    </div>;

  return (
    <Drawer title="Nova tarefa" subtitle="Criar tarefa na agenda" onClose={onClose} width={DRAWER_W} footer={(close) => <><div style={{ flex: 1 }} /><ActionButton action="salvar" size="md" label="Criar" disabled={!valid} onClick={() => close(submit)} /></>}>
      <div className="col" style={{ gap: 14 }}>
        <div><label className="label">Título</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Ligar para Sara" /></div>
        <div><label className="label">Categoria</label><TypeSelect value={cat} onChange={setCat} /></div>
        <div className="row" style={{ gap: 10 }}>
          <div style={{ flex: 1 }}><label className="label">Data</label><DateInput value={date} onChange={setDate} /></div>
          <div style={{ flex: 1 }}><label className="label">Hora</label><TimeInput value={time} onChange={setTime} startTime={cfg.horaInicio} endTime={cfg.horaFim} step={cfg.intervalo || 15} /></div>
        </div>
        {isPast(date, time) && <div style={{ fontSize: 'var(--type-xs)', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 5 }}><Ic name="alert" size={12} /> Data/hora no passado — escolha um horário futuro.</div>}
        {!isDiaUtil(date, cfg) && <div style={{ fontSize: 'var(--type-xs)', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 5 }}><Ic name="alert" size={12} /> Esse dia não é um dia útil na configuração da agenda — escolha outra data.</div>}

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

function AppointmentDetailDrawer({ appt, onClose, onEdit, onDelete, meId }) {
  const respNome = appt.respNome || (TEAM.find((m) => m.id === appt.resp) || {}).name || null;
  const outros = (appt.participantes || []).filter((p) => p.papel !== 'responsavel' && (p.nome || '').trim());
  const canEdit = !meId || appt.resp === meId;
  const accent = appt.byAI ? 'var(--ai)' : 'var(--accent)';
  const [confirmDel, setConfirmDel] = React.useState(false);
  const dateObj = appt.data ? new Date(appt.data + 'T00:00:00') : new Date();
  const dateLabel = `${WD_FULL_PT[dateObj.getDay()]}, ${dateObj.getDate().toString().padStart(2, '0')} de ${MONTHS_PT[dateObj.getMonth()]} de ${dateObj.getFullYear()}`;
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
      canEdit ?
      <>
          <ActionButton action="cancelar" size="md" label="Cancelar agendamento" onClick={() => setConfirmDel(true)} />
          <div style={{ flex: 1 }} />
          <ActionButton action="editar" size="md" onClick={onEdit} />
        </> :
      <div className="muted" style={{ fontSize: 'var(--type-xs)', padding: '0 4px', display: 'flex', alignItems: 'center', gap: 6 }}><Ic name="lock" size={13} /> Somente o responsável pode editar ou cancelar.</div>
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
        {respNome && <Row icon="team" label="Responsável">{respNome}</Row>}
        {outros.length > 0 && <Row icon="participants" label="Participantes">{outros.map((p) => p.nome).join(', ')}</Row>}
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
            <button className="btn fin-btn-back" onClick={() => setConfirmDel(false)}>Voltar</button>
            <button className="btn btn-danger" onClick={() => {setConfirmDel(false);onDelete && onDelete();}}>
              <Ic name="x" size={14} /> Cancelar
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

// Chip de participante: hover -> tinta vermelha + (X) pra remover.
function PartChip({ p, onRemove }) {
  const [h, setH] = React.useState(false);
  const icon = p.tipo === 'usuario' ? 'user' : p.tipo === 'lead' ? 'leads' : p.tipo === 'cliente' ? 'team' : 'user';
  return (
    <span onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px 4px 10px', borderRadius: 999, fontSize: 'var(--type-xs)', fontWeight: 600, whiteSpace: 'nowrap', cursor: 'default', border: '1px solid ' + (h ? '#FF452A' : 'var(--border)'), background: h ? '#FFEBEC' : 'var(--surface-2)', color: h ? '#FF452A' : 'var(--text)', transition: 'background .12s, border-color .12s, color .12s' }}>
      <Ic name={icon} size={11} style={{ flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{p.name}</span>
      <button onClick={onRemove} title="Remover participante" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: h ? '#FF452A' : 'var(--text-faint)', display: 'flex', padding: 0, marginLeft: 2, flexShrink: 0, transition: 'color .12s' }}><Ic name="x" size={12} /></button>
    </span>);
}

function AppointmentEditDrawer({ appt, onClose, onBack, onSave }) {
  const DURATIONS = [
  { v: '15', l: '15 min' }, { v: '30', l: '30 min' }, { v: '45', l: '45 min' },
  { v: '60', l: '60 min' }, { v: '75', l: '75 min' }, { v: '90', l: '90 min' },
  { v: '120', l: '2 horas' }, { v: '180', l: '3 horas' }, { v: '240', l: '4 horas' }, { v: '300', l: '5 horas' }];

  const [client, setClient] = React.useState(appt.client);
  const [service, setService] = React.useState(appt.service);
  const [date, setDate] = React.useState(appt.data || ymd(new Date()));
  const [time, setTime] = React.useState(appt.start);
  const [duration, setDuration] = React.useState(String(appt.dur));
  const [type, setType] = React.useState(appt.type);
  const [local, setLocal] = React.useState(appt.local);
  const [respId, setRespId] = React.useState(appt.resp);
  const [respName, setRespName] = React.useState(appt.respNome || '');
  const [users, setUsers] = React.useState([]);
  React.useEffect(() => {
    let alive = true;
    API.getUsuarios().then((r) => { if (alive) setUsers((r.usuarios || []).map((u) => ({ id: u.id, nome: u.nome }))); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  // Participantes (papel 'participante') -> editáveis em tags. Normaliza p/ o formato do picker.
  const [parts, setParts] = React.useState(() => (appt.participantes || []).filter((p) => p.papel !== 'responsavel').map((p) => ({ tipo: p.tipo, participanteId: p.userId || null, clienteId: p.clienteId || null, name: p.nome || '' })));
  const [pendingExtra, setPendingExtra] = React.useState(null);
  const [extraKey, setExtraKey] = React.useState(0);
  const addPart = () => { if (pendingExtra && (pendingExtra.name || '').trim()) { setParts((xs) => [...xs, pendingExtra]); setPendingExtra(null); setExtraKey((k) => k + 1); } };
  const removePart = (i) => setParts((xs) => xs.filter((_, idx) => idx !== i));
  const [phone, setPhone] = React.useState(appt.phone || '');
  const [obs, setObs] = React.useState(appt.obs || '');
  const [status, setStatus] = React.useState(appt.status);

  const STATUSES = ['agendado', 'confirmado', 'realizado'];

  const save = () => {
    if (!onSave) {onBack();return;}
    onSave({
      ...appt,
      data: date,
      client: client.trim() || appt.client,
      service: service.trim() || appt.service,
      start: time,
      dur: parseInt(duration, 10),
      type,
      local: local.trim() || '—',
      resp: respId,
      respNome: respName,
      participantes: parts.map((p) => ({ tipo: p.tipo, userId: p.tipo === 'usuario' ? p.participanteId : null, clienteId: (p.tipo === 'cliente' || p.tipo === 'lead') ? (p.clienteId || p.participanteId) : null, nome: p.name })),
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
      footer={<><div style={{ flex: 1 }} /><ActionButton action="voltar" size="md" onClick={onBack} /><ActionButton action="salvar" size="md" onClick={save} /></>}>
      
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
            <select className="input" value={respId} onChange={(e) => { setRespId(e.target.value); setRespName((users.find((u) => u.id === e.target.value) || {}).nome || ''); }}>
              {!users.some((u) => u.id === respId) && <option value={respId}>{respName || '—'}</option>}
              {users.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} style={{ textTransform: 'capitalize' }}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
          </div>
        </div>
        <div>
          <label className="label">Participantes</label>
          {parts.length > 0 &&
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {parts.map((p, i) => <PartChip key={i} p={p} onRemove={() => removePart(i)} />)}
          </div>}
          <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}><ParticipantPicker key={extraKey} onChange={setPendingExtra} /></div>
            <ActionButton action="salvar" icon="plus" label="" efeito={false} size="md" onClick={addPart} disabled={!pendingExtra || !(pendingExtra.name || '').trim()} title="Adicionar participante" style={{ flexShrink: 0 }} />
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
  const cats = useAgendaCategories();
  const [catModal, setCatModal] = React.useState(null); // null | 'new' | categoria (editar)
  const [cfg, setCfg] = React.useState(() => ({ ...AGENDA_CONFIG }));
  const setC = (k, v) => setCfg((p) => ({ ...p, [k]: v }));
  React.useEffect(() => { API.getAgendaConfig().then((r) => { if (r && r.config && Object.keys(r.config).length) setCfg((p) => ({ ...p, ...r.config })); }).catch(() => {}); }, []);
  const save = () => { setAgendaConfig(cfg); API.saveAgendaConfig({ config: cfg })
    .then(() => window.showToast({ tipo: 'sucesso', titulo: 'Configurações salvas' }))
    .catch(() => window.showToast({ tipo: 'erro', titulo: 'Erro ao salvar', descricao: 'Não foi possível salvar as configurações.' })); };
  const delCat = (id) => { removeCustomCategory(id); API.deleteCategoria(id)
    .then(() => window.showToast({ tipo: 'sucesso', titulo: 'Categoria excluída' }))
    .catch(() => window.showToast({ tipo: 'erro', titulo: 'Erro ao excluir categoria', descricao: 'Tente novamente.' })); };
  const tabs = [
  { id: 'geral', label: 'Geral', icon: 'settings' },
  { id: 'horario', label: 'Horário', icon: 'clock' },
  { id: 'notif', label: 'Notificações', icon: 'bell' },
  { id: 'integ', label: 'Integrações', icon: 'link' },
  { id: 'cat', label: 'Categorias', icon: 'tag' }];

  return (
    <Drawer title="Configurações da agenda" subtitle="Personalize sua agenda" onClose={onClose} width={620}
    footer={(close) => <><div style={{ flex: 1 }} /><ActionButton action="voltar" size="md" onClick={() => close()} /><ActionButton action="salvar" size="md" label="Salvar alterações" onClick={() => close(save)} /></>}>
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
                <select className="input" value={cfg.timezone} onChange={(e) => setC('timezone', e.target.value)}>
                  <option value="America/Noronha">America/Noronha (-02:00)</option>
                  <option value="America/Sao_Paulo">America/Sao_Paulo (-03:00)</option>
                  <option value="America/Fortaleza">America/Fortaleza (-03:00)</option>
                  <option value="America/Recife">America/Recife (-03:00)</option>
                  <option value="America/Bahia">America/Bahia (-03:00)</option>
                  <option value="America/Belem">America/Belem (-03:00)</option>
                  <option value="America/Manaus">America/Manaus (-04:00)</option>
                  <option value="America/Cuiaba">America/Cuiaba (-04:00)</option>
                  <option value="America/Campo_Grande">America/Campo_Grande (-04:00)</option>
                  <option value="America/Porto_Velho">America/Porto_Velho (-04:00)</option>
                  <option value="America/Boa_Vista">America/Boa_Vista (-04:00)</option>
                  <option value="America/Rio_Branco">America/Rio_Branco (-05:00)</option>
                  <option value="America/Eirunepe">America/Eirunepe (-05:00)</option>
                </select>
              </SetRow>
              <SetRow label="Visão do Calendário" desc="Com qual visão o calendário abre">
                <select className="input" value={cfg.visaoInicial || 'month'} onChange={(e) => setC('visaoInicial', e.target.value)}>
                  <option value="month">Mês</option>
                  <option value="week">Semana</option>
                  <option value="day">Dia</option>
                </select>
              </SetRow>
              <SetRow label="Primeiro dia da semana">
                <select className="input" value={cfg.primeiroDia} onChange={(e) => setC('primeiroDia', e.target.value)}><option>Domingo</option><option>Segunda</option></select>
              </SetRow>
            </>
          }
          {tab === 'horario' &&
          <>
              <SetRow label="Horário comercial">
                <div className="row" style={{ gap: 8 }}>
                  <TimeInput value={cfg.horaInicio} onChange={(v) => setC('horaInicio', v)} style={{ width: 120 }} />
                  <span className="muted">até</span>
                  <TimeInput value={cfg.horaFim} onChange={(v) => setC('horaFim', v)} style={{ width: 120 }} />
                </div>
              </SetRow>
              <SetRow label="Dias úteis" desc="Selecione os dias atendidos">
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>{['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <button key={i} className={`day-btn ${cfg.diasUteis[i] ? 'on' : ''}`} onClick={() => setC('diasUteis', cfg.diasUteis.map((x, j) => j === i ? !x : x))}>{d}</button>)}</div>
              </SetRow>
              <SetRow label="Intervalo entre eventos" desc="Passo do campo de horário">
                <select className="input" value={cfg.intervalo} onChange={(e) => setC('intervalo', +e.target.value)} style={{ width: 120 }}>
                  <option value={10}>10 min</option>
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                </select>
              </SetRow>
              <SetRow label="Permitir overbooking" desc="Marcação dupla de agenda">
                <Toggle on={cfg.overbooking} onChange={() => setC('overbooking', !cfg.overbooking)} />
              </SetRow>
            </>
          }
          {tab === 'notif' &&
          <>
              <SetRow label="E-mail" desc="Lembrete 1 hora antes">
                <Toggle on={cfg.notifEmail} onChange={() => setC('notifEmail', !cfg.notifEmail)} />
              </SetRow>
              <SetRow label="Push no navegador">
                <Toggle on={cfg.notifPush} onChange={() => setC('notifPush', !cfg.notifPush)} />
              </SetRow>
              <SetRow label="WhatsApp para o cliente" desc="Confirmação automática">
                <Toggle on={cfg.notifWhatsapp} onChange={() => setC('notifWhatsapp', !cfg.notifWhatsapp)} />
              </SetRow>
              <SetRow label="Notificação interna" desc="No sino e na página de Notificações do sistema">
                <Toggle on={cfg.notifInterna !== false} onChange={() => setC('notifInterna', cfg.notifInterna === false)} />
              </SetRow>
              <SetRow label="Antecedência do lembrete" desc="Quando avisar antes do compromisso (vale p/ todos os canais marcados)">
                <select className="input" value={cfg.antecedencia} onChange={(e) => setC('antecedencia', +e.target.value)}>
                  <option value={5}>5 minutos</option>
                  <option value={10}>10 minutos</option>
                  <option value={15}>15 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>1 hora</option>
                  <option value={120}>2 horas</option>
                  <option value={180}>3 horas</option>
                  <option value={300}>5 horas</option>
                  <option value={480}>8 horas</option>
                  <option value={1440}>24 horas</option>
                  <option value={2880}>48 horas</option>
                </select>
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
                <Toggle on={cfg.google} onChange={() => setC('google', !cfg.google)} />
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
              <div className="row" style={{ alignItems: 'center', gap: 10 }}>
                <div className="muted" style={{ fontSize: 12, flex: 1 }}>Categorias usadas ao criar agendamentos e tarefas. As padrão são fixas; as suas você pode excluir.</div>
                <button className="fin-new-btn" title="Nova categoria" onClick={() => setCatModal('new')} style={{ flexShrink: 0 }}>
                  <span className="fin-new-plus" style={{ width: "36px", height: "36px" }}><Ic name="plus" size={18} /></span>
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
                {cats.map((k, i) =>
              <div key={k.id || ('def-' + i)} className="integ-card" onClick={() => setCatModal(k)} style={{ cursor: 'pointer' }} title="Editar categoria">
                    <span style={{ width: 30, height: 30, borderRadius: 8, background: k.color ? `color-mix(in oklab, ${k.color} 16%, var(--surface))` : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color || 'var(--text-muted)', flexShrink: 0 }}><Ic name={k.icon} size={16} /></span>
                    <div style={{ flex: 1, fontWeight: 500 }}>{k.label}</div>
                    {k.padrao ?
                  <span className="badge" style={{ fontSize: 10 }}>padrão</span> :
                  <button className="btn btn-ghost btn-icon" title="Excluir categoria" onClick={(e) => { e.stopPropagation(); delCat(k.id); }}><Ic name="trash" size={14} /></button>}
                  </div>
              )}
              </div>
            </>
          }
        </div>
      </div>
      {catModal && <NewCategoryModal categoria={catModal === 'new' ? null : catModal} onClose={() => setCatModal(null)} />}
    </Drawer>);

}

// Popup de nova categoria: nome + grade de 20 ícones corporativos.
function NewCategoryModal({ onClose, categoria }) {
  const editing = !!categoria;
  const isPadrao = editing && categoria.padrao;
  const [nome, setNome] = React.useState(editing ? categoria.label : '');
  const [icone, setIcone] = React.useState(editing ? (categoria.icon || CATEGORY_ICONS[0]) : CATEGORY_ICONS[0]);
  const [cor, setCor] = React.useState(editing ? (categoria.color || '#3b82f6') : '#3b82f6');
  const valid = nome.trim().length >= 1;
  const submit = async () => {
    if (!valid) return;
    try {
      if (editing && categoria.id) {
        const r = await API.updateCategoria(categoria.id, { nome: nome.trim(), icone, cor });
        const c = r.categoria;
        upsertCustomCategory({ id: c.id, label: c.nome, icon: c.icone, color: c.cor || cor });
        window.showToast({ tipo: 'sucesso', titulo: 'Categoria atualizada', descricao: c.nome });
      } else {
        const r = await API.createCategoria({ nome: nome.trim(), icone, cor });
        const c = r.categoria;
        addCustomCategory({ id: c.id, label: c.nome, icon: c.icone, color: c.cor || cor });
        window.showToast({ tipo: 'sucesso', titulo: 'Categoria criada', descricao: c.nome });
      }
    } catch (e) { window.showToast({ tipo: 'erro', titulo: editing ? 'Erro ao atualizar categoria' : 'Erro ao criar categoria', descricao: e.message || 'Tente novamente.' }); }
    onClose();
  };
  return (
    <Modal title={editing ? 'Editar categoria' : 'Nova categoria'} onClose={onClose} size="sm" footer={
    <><button className="btn fin-btn-back" onClick={onClose}>Voltar</button><div style={{ flex: 1 }} /><button className="btn btn-primary" disabled={!valid} onClick={submit}><Ic name="check" size={13} /> Salvar</button></>
    }>
      <div className="col" style={{ gap: 14 }}>
        <div><label className="label">Nome da categoria</label><input className="input" value={nome} onChange={(e) => setNome(e.target.value)} disabled={isPadrao} autoFocus={!isPadrao} placeholder="Ex.: Visita técnica" style={isPadrao ? { opacity: .7 } : null} />{isPadrao && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>O nome das categorias padrão não pode ser alterado.</div>}</div>
        <div>
          <label className="label">Cor</label>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(cor) ? cor : '#3b82f6'} onChange={(e) => setCor(e.target.value)} title="Escolher qualquer cor" style={{ width: 46, height: 38, padding: 2, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: 'var(--surface)', flexShrink: 0 }} />
            <input className="input" value={cor} onChange={(e) => setCor(e.target.value)} placeholder="#FFFFFF" maxLength={7} style={{ flex: 1, fontFamily: 'monospace', textTransform: 'uppercase' }} />
            <span title="Prévia" style={{ width: 38, height: 38, borderRadius: 8, background: cor, border: '1px solid var(--border)', flexShrink: 0 }} />
          </div>
        </div>
        <div>
          <label className="label">Ícone</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
            {CATEGORY_ICONS.map((ic) =>
            <button key={ic} type="button" onClick={() => setIcone(ic)}
            style={{ height: 38, borderRadius: 8, border: `1px solid ${icone === ic ? 'var(--accent)' : 'var(--border)'}`, background: icone === ic ? 'var(--accent-soft)' : 'var(--surface)', color: icone === ic ? 'var(--accent-700)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Ic name={ic} size={17} />
            </button>)}
          </div>
        </div>
      </div>
    </Modal>);

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
      .cat-scroll { scrollbar-width:thin; scrollbar-color:var(--border-strong) transparent; }
      .cat-scroll::-webkit-scrollbar { width:8px; }
      .cat-scroll::-webkit-scrollbar-track { background:transparent; }
      .cat-scroll::-webkit-scrollbar-thumb { background:var(--border-strong); border-radius:4px; }
      .cat-scroll::-webkit-scrollbar-thumb:hover { background:var(--text-faint); }

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
      .month-cell[data-today="true"] { background:color-mix(in oklab, var(--accent) 8%, var(--surface)); }
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
      .mep-chip[data-status="agendada"] { background:color-mix(in oklab, var(--accent) 14%, var(--surface)); color:var(--accent-700); }
      .mep-chip[data-status="marcada"] { background:color-mix(in oklab, #165EEE 14%, var(--surface)); color:#165EEE; }
      .mep-chip[data-status="cancelada"] { background:color-mix(in oklab, #FF452A 14%, var(--surface)); color:#c0341c; }
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
      .daystrip-day[data-selected="true"] { background:color-mix(in oklab, var(--accent) 8%, var(--surface)); border-color:var(--accent); box-shadow:none; }
      .daystrip-day[data-selected="true"] .daystrip-wd, .daystrip-day[data-selected="true"] .daystrip-dn { color:var(--accent-700); }

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