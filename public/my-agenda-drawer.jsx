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

function myAgMinToStr(m) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// 'YYYY-MM-DD' no fuso local (sem deslocar).
function myAgYmd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// Segunda-feira da semana de uma data.
function myAgSegunda(d) {
  const n = new Date(d); const wd = n.getDay(); const diff = wd === 0 ? -6 : 1 - wd;
  n.setDate(n.getDate() + diff); n.setHours(0, 0, 0, 0); return n;
}
const MYAG_MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

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

// slug a partir de um texto (espelha o slugify do backend): minúsculas, sem acento, só [a-z0-9-].
function myAgSlugify(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

// Domínio público do PK360 (onde o app está hospedado) — usado no link de agendamento.
const MYAG_DOMINIO = 'www.pk360.app.br';

// Abas do drawer (ordem define a posição da barra de destaque deslizante).
const MYAG_TABS = [
  ['horarios', 'Disponibilidade', 'clock'],
  ['semana',   'Esta semana',     'calendar'],
  ['preview',  'Página pública',  'external-link'],
  ['regras',   'Regras',          'settings'],
];

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
  // Bloqueios manuais INDIVIDUAIS por data+hora: Set de 'YYYY-MM-DD-HH:MM'.
  // (a Disponibilidade é recorrente; estes bloqueios valem só na data exata.)
  const [bloqueios, setBloqueios] = React.useState(() => new Set());
  // Identidade da agenda PÚBLICA — por usuário, vinda do backend (slug do link, título, on/off).
  const [slug, setSlug] = React.useState('');
  const [titulo, setTitulo] = React.useState('');
  const [ativa, setAtiva] = React.useState(true);
  // Notificações (controladas — persistidas junto da config).
  const [notif, setNotif] = React.useState({ emailCliente: true, whatsappLembrete: true, meNotificar: true });
  const [saving, setSaving] = React.useState(false);
  // Só renderiza o conteúdo depois que a config real chega — evita o "flash" do
  // default (2 faixas) antes do salvo (1 faixa). Carregamento sem flicker.
  const [carregado, setCarregado] = React.useState(false);
  // Compromissos reais por data (só leitura, do módulo Agenda): { 'YYYY-MM-DD': [{ ini, dur }] }.
  // Alimenta a aba "Esta semana": um agendamento real aparece OCUPADO (vermelho, só leitura).
  const [apptsByDate, setApptsByDate] = React.useState({});

  // Carrega a config real do usuário ao abrir. Best-effort: em demo/sem backend, mantém os defaults.
  React.useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await window.API.getMinhaAgendaConfig();
        if (vivo && r && r.publica) {
          const p = r.publica; const c = p.config || {};
          setSlug(p.slug || '');
          setTitulo(p.titulo || '');
          setAtiva(p.ativa !== false);
          if (typeof c.slotDuration === 'number') setSlotDuration(c.slotDuration);
          if (typeof c.bufferMin === 'number') setBufferMin(c.bufferMin);
          if (typeof c.advanceMin === 'number') setAdvanceMin(c.advanceMin);
          if (typeof c.horizon === 'number') setHorizon(c.horizon);
          if (c.avail && typeof c.avail === 'object') setAvail(c.avail);
          if (Array.isArray(c.bloqueios)) setBloqueios(new Set(c.bloqueios));
          if (c.notif && typeof c.notif === 'object') setNotif({
            emailCliente: c.notif.emailCliente !== false,
            whatsappLembrete: c.notif.whatsappLembrete !== false,
            meNotificar: c.notif.meNotificar !== false,
          });
        }
      } catch (e) { /* sem backend (demo) — segue com os defaults locais */ }
      finally { if (vivo) setCarregado(true); }
    })();
    return () => { vivo = false; };
  }, []);

  // Lê (SÓ leitura) os compromissos reais da Agenda e indexa por data → [{ini,dur}].
  // Usado pra mostrar OCUPADO (vermelho) na "Esta semana". Não altera a Agenda.
  // Best-effort: em demo/sem backend, fica vazio.
  React.useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [meR, agR] = await Promise.all([window.API.me(), window.API.getAgenda()]);
        if (!vivo) return;
        const meId = meR && meR.user && meR.user.id;
        const map = {};
        ((agR && agR.agenda) || []).forEach((a) => {
          if (!a.data || !a.start) return;
          if (meId && a.resp && a.resp !== meId) return; // só os MEUS compromissos
          (map[a.data] = map[a.data] || []).push({ ini: myAgTimeToMin(a.start), dur: a.dur || 30 });
        });
        setApptsByDate(map);
      } catch (e) { /* demo/sem backend — sem compromissos reais */ }
    })();
    return () => { vivo = false; };
  }, []);

  // Horários candidatos = UNIÃO das faixas configuradas (só dias ligados), no passo = slotDuration.
  // Assim a grade da "Esta semana" e o preview usam EXATAMENTE o que foi configurado na Disponibilidade.
  const slots = React.useMemo(() => {
    const set = new Set();
    MY_AG_WD.forEach((wd) => {
      const cfg = avail[wd.id];
      if (!cfg || !cfg.on) return;
      (cfg.ranges || []).forEach((r) => {
        let m = myAgTimeToMin(r.from); const end = myAgTimeToMin(r.to);
        while (m < end) { set.add(myAgMinToStr(m)); m += slotDuration; }
      });
    });
    return [...set].sort();
  }, [avail, slotDuration]);

  // Estado base de um slot direto da disponibilidade (sem depender de grade pré-montada).
  const baseState = (wdId, slot) => {
    const cfg = avail[wdId];
    if (!cfg || !cfg.on) return 'blocked';
    const m = myAgTimeToMin(slot);
    return (cfg.ranges || []).some((r) => m >= myAgTimeToMin(r.from) && m < myAgTimeToMin(r.to)) ? 'available' : 'blocked';
  };

  // Liga/desliga um bloqueio manual INDIVIDUAL (data+hora específica).
  const toggleBloqueio = (dateStr, hhmm) => {
    setBloqueios((prev) => {
      const next = new Set(prev);
      const key = `${dateStr}-${hhmm}`;
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Link público a partir do slug real do usuário (fallback derivado do nome enquanto carrega).
  const slugEfetivo = slug || myAgSlugify(agentName) || 'agenda';
  const publicLink = `${MYAG_DOMINIO}/agendar/${slugEfetivo}`;
  const fullLink = `https://${publicLink}`;

  // Persiste a config no backend (por usuário). Chamado pelo "Aplicar configuração".
  const salvar = async () => {
    setSaving(true);
    try {
      const dto = { titulo, ativa, config: { slotDuration, bufferMin, advanceMin, horizon, avail, bloqueios: [...bloqueios], notif } };
      if (slug) dto.slug = slug;
      const r = await window.API.saveMinhaAgendaConfig(dto);
      if (r && r.publica && r.publica.slug) setSlug(r.publica.slug);
      window.showToast({ tipo: 'sucesso', titulo: 'Agenda atualizada' });
      onClose && onClose();
    } catch (e) {
      window.showToast({ tipo: 'erro', titulo: 'Não foi possível salvar', descricao: (e && e.message) || 'Tente novamente.' });
    } finally { setSaving(false); }
  };

  return (
    <Drawer
      title="Minha Agenda"
      subtitle={`Configure horários disponíveis e compartilhe seu link público de agendamento`}
      onClose={onClose}
      width="80vw"
      footer={
        <>
          <div className="muted" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Ic name="user" size={12} style={{ color: 'var(--accent)' }} /> Sua agenda pessoal de agendamento
          </div>
          <div style={{ flex: 1 }} />
          <ActionButton action="salvar" size="md" label={saving ? 'Salvando…' : 'Aplicar configuração'} disabled={saving} onClick={salvar} />
        </>
      }
    >
      <MyAgendaStyles />

      {/* Public link banner — always visible */}
      <MyAgPublicLinkCard link={fullLink} display={publicLink} slug={slugEfetivo} onSlugChange={(v) => setSlug(myAgSlugify(v))} ativa={ativa} onToggleAtiva={setAtiva} agentName={agentName} agentTitle={agentTitle} />

      {/* Tab nav — barra de destaque verde que desliza lateralmente até a aba ativa */}
      <div className="myag-tabs">
        <span className="myag-tab-ind" style={{ transform: `translateX(${Math.max(0, MYAG_TABS.findIndex((t) => t[0] === tab)) * 100}%)` }} />
        {MYAG_TABS.map(([id, label, icon]) => (
          <button key={id} className={`myag-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            <Ic name={icon} size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Conteúdo da aba com a animação padrão de entrada (mesma das telas: page-enter).
          Enquanto a config real não chega, mostra um loading — sem flash do default. */}
      <div key={carregado ? tab : '__load'} className="page-enter">
        {!carregado ? (
          <div className="myag-loading">
            <span className="myag-spin" />
            <span>Carregando sua agenda…</span>
          </div>
        ) : (<>
        {tab === 'horarios' && (
          <MyAgHoursPanel avail={avail} setAvail={setAvail} slotDuration={slotDuration} />
        )}

        {tab === 'semana' && (
          <MyAgWeekPanel
            slots={slots}
            avail={avail}
            slotDuration={slotDuration}
            baseState={baseState}
            bloqueios={bloqueios}
            toggleBloqueio={toggleBloqueio}
            apptsByDate={apptsByDate}
          />
        )}

        {tab === 'preview' && (
          <MyAgPublicPreview
            link={fullLink}
            agentName={agentName}
            agentTitle={agentTitle}
            slots={slots}
            slotDuration={slotDuration}
            baseState={baseState}
            bloqueios={bloqueios}
            apptsByDate={apptsByDate}
          />
        )}

        {tab === 'regras' && (
          <MyAgRulesPanel
            slotDuration={slotDuration} setSlotDuration={setSlotDuration}
            bufferMin={bufferMin} setBufferMin={setBufferMin}
            advanceMin={advanceMin} setAdvanceMin={setAdvanceMin}
            horizon={horizon} setHorizon={setHorizon}
            notif={notif} setNotif={setNotif}
          />
        )}
        </>)}
      </div>
    </Drawer>
  );
}

// ============================================================================
// Public link card
// ============================================================================
function MyAgPublicLinkCard({ link, display, slug, onSlugChange, ativa, onToggleAtiva, agentName, agentTitle }) {
  const [copied, setCopied] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(slug || '');
  React.useEffect(() => { setDraft(slug || ''); }, [slug]);
  const copy = () => {
    try { navigator.clipboard?.writeText(link); } catch (_) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const confirmar = () => {
    const limpo = (draft || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    if (limpo && limpo.length >= 2 && onSlugChange) onSlugChange(limpo);
    setEditing(false);
  };
  return (
    <div className="myag-link-card" data-off={ativa === false}>
      <div className="myag-link-icon">
        <Ic name="link" size={20} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent-700)' }}>
            Link público de agendamento
          </div>
          {onToggleAtiva && (
            <button
              className="myag-link-state"
              onClick={() => onToggleAtiva(!(ativa !== false))}
              title={ativa !== false ? 'Link ativo — clique para desativar' : 'Link desativado — clique para ativar'}
            >
              <span className="myag-link-dot" data-on={ativa !== false} />
              {ativa !== false ? 'Ativo' : 'Desativado'}
            </button>
          )}
        </div>
        {editing ? (
          <div className="myag-link-edit">
            <span className="myag-link-prefix">{MYAG_DOMINIO}/agendar/</span>
            <input
              className="input"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmar(); if (e.key === 'Escape') { setDraft(slug || ''); setEditing(false); } }}
              placeholder="seu-link"
              style={{ height: 30, width: 200 }}
            />
            <button className="btn btn-sm btn-primary" onClick={confirmar}><Ic name="check" size={12} /></button>
            <button className="btn btn-sm" onClick={() => { setDraft(slug || ''); setEditing(false); }}><Ic name="x" size={12} /></button>
          </div>
        ) : (
          <div className="myag-link-url" title={link}>
            <Ic name="lock" size={11} style={{ color: 'var(--accent-700)' }} /> {display}
            {onSlugChange && (
              <button className="myag-link-pencil" onClick={() => setEditing(true)} title="Personalizar o link">
                <Ic name="edit" size={12} />
              </button>
            )}
          </div>
        )}
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          Envie este link para clientes — eles escolhem um horário livre e agendam direto com {agentName}.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-sm" onClick={() => window.open(link, '_blank')} title="Abrir em nova aba">
          <Ic name="external-link" size={13} /> Abrir
        </button>
        <button className="btn btn-sm btn-primary" onClick={copy}>
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
    window.showToast({ tipo: 'sucesso', titulo: 'Configuração copiada', descricao: 'Aplicada de Seg a Sex.' });
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
                      <TimeInput value={r.from} onChange={(v) => updateRange(wd.id, i, { from: v })} step={slotDuration} />
                      <span className="muted" style={{ fontSize: 12 }}>até</span>
                      <TimeInput value={r.to} onChange={(v) => updateRange(wd.id, i, { to: v })} step={slotDuration} />
                      {cfg.ranges.length > 1 && (
                        <button className="btn btn-ghost btn-icon" title="Remover faixa" onClick={() => removeRange(wd.id, i)}>
                          <Ic name="trash" size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button className="btn btn-sm btn-icon myag-add-range" onClick={() => addRange(wd.id)} title="Adicionar faixa de horário">
                    <Ic name="plus" size={14} />
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
function MyAgWeekPanel({ slots, avail, slotDuration, baseState, bloqueios, toggleBloqueio, apptsByDate }) {
  const [weekStart, setWeekStart] = React.useState(() => myAgSegunda(new Date()));
  const [confirmar, setConfirmar] = React.useState(null); // { dateStr, hhmm, dateLabel, acao }
  const [info, setInfo] = React.useState(null);           // { dateLabel, hhmm }

  // 7 dias da semana exibida; só os dias LIGADOS na Disponibilidade aparecem (coluna some se off).
  const dias = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d; })
    .filter((d) => avail[d.getDay()] && avail[d.getDay()].on);

  // Tem compromisso real cobrindo (data, hora)? (sobreposição com a duração do compromisso)
  const realOcupado = (dateStr, hhmm) => {
    const arr = apptsByDate[dateStr] || [];
    const m = myAgTimeToMin(hhmm);
    return arr.some((a) => a.ini < m + slotDuration && a.ini + a.dur > m);
  };

  // Estado de cada célula: blocked (fora do horário) | available (livre) | manual (bloqueio seu) | real (agendamento).
  const cellState = (d, hhmm) => {
    if (baseState(d.getDay(), hhmm) === 'blocked') return 'blocked';
    const dateStr = myAgYmd(d);
    if (realOcupado(dateStr, hhmm)) return 'real';
    if (bloqueios.has(`${dateStr}-${hhmm}`)) return 'manual';
    return 'available';
  };

  const rotuloDia = (d) => `${MY_AG_WD_LONG[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

  const clicar = (d, hhmm, st) => {
    if (st === 'blocked') return;
    if (st === 'real') { setInfo({ dateLabel: rotuloDia(d), hhmm }); return; }     // B) só informa
    setConfirmar({ dateStr: myAgYmd(d), hhmm, dateLabel: rotuloDia(d), acao: st === 'available' ? 'ocupar' : 'liberar' });
  };
  const aplicar = () => { if (confirmar) toggleBloqueio(confirmar.dateStr, confirmar.hhmm); setConfirmar(null); };

  const shift = (dir) => { const d = new Date(weekStart); d.setDate(d.getDate() + dir * 7); setWeekStart(d); };
  const fim = new Date(weekStart); fim.setDate(weekStart.getDate() + 6);
  const labelSemana = `${weekStart.getDate()} ${MYAG_MESES[weekStart.getMonth()]} – ${fim.getDate()} ${MYAG_MESES[fim.getMonth()]} · ${fim.getFullYear()}`;

  // bloqueios manuais DESTA semana (para o botão "Limpar")
  const datasSemana = dias.map(myAgYmd);
  const bloqSemana = [...bloqueios].filter((k) => datasSemana.some((ds) => k.startsWith(ds + '-')));
  const limparSemana = () => bloqSemana.forEach((k) => { const i = k.lastIndexOf('-'); toggleBloqueio(k.slice(0, i), k.slice(i + 1)); });

  const semConteudo = dias.length === 0 || slots.length === 0;

  return (
    <div className="myag-panel">
      <div className="myag-panel-head">
        <div>
          <div className="myag-h3">Esta semana</div>
          <div className="muted" style={{ fontSize: 13 }}>
            Bloqueie horários específicos de um dia (vale só naquela data). Agendamentos reais aparecem em vermelho automaticamente.
          </div>
        </div>
        <div className="myag-legend">
          <span><span className="myag-dot avail" /> Livre</span>
          <span><span className="myag-dot busy" /> Ocupado</span>
          <span><span className="myag-dot blocked" /> Fora do horário</span>
        </div>
      </div>

      {/* Navegador de semana (datas reais) */}
      <div className="myag-weeknav">
        <button className="myag-weeknav-btn" onClick={() => shift(-1)} title="Semana anterior"><Ic name="arrow-left" size={15} /></button>
        <div className="myag-weeknav-label"><Ic name="calendar" size={13} /> {labelSemana}</div>
        <button className="myag-weeknav-btn" onClick={() => shift(1)} title="Próxima semana"><Ic name="arrow-right" size={15} /></button>
        <button className="myag-weeknav-btn" onClick={() => setWeekStart(myAgSegunda(new Date()))} title="Voltar para esta semana"><Ic name="refresh" size={13} /></button>
        <div style={{ flex: 1 }} />
        {bloqSemana.length > 0 && (
          <button className="btn btn-sm" onClick={limparSemana} title="Remover seus bloqueios desta semana">
            <Ic name="refresh" size={12} /> Limpar ({bloqSemana.length})
          </button>
        )}
      </div>

      {semConteudo ? (
        <div className="myag-hint" style={{ justifyContent: 'center' }}>
          <Ic name="info" size={13} />
          <span>Nenhum horário configurado ainda. Defina sua disponibilidade na aba <strong>Disponibilidade</strong>.</span>
        </div>
      ) : (
        <div className="myag-week-wrap">
          <div className="myag-week-grid" style={{ gridTemplateColumns: `64px repeat(${dias.length}, 1fr)` }}>
            <div />
            {dias.map((d, i) => (
              <div key={i} className="myag-week-head">
                <div className="myag-wh-abbr">{MY_AG_WD.find((w) => w.id === d.getDay()).abbr}</div>
                <div className="myag-wh-day">{String(d.getDate()).padStart(2, '0')}</div>
              </div>
            ))}

            {slots.map((slot) => (
              <React.Fragment key={slot}>
                <div className="myag-week-hour">{slot}</div>
                {dias.map((d, i) => {
                  const st = cellState(d, slot);
                  const cls = st === 'available' ? 'available' : st === 'blocked' ? 'blocked' : 'busy';
                  const titulo = st === 'available' ? 'Livre' : st === 'blocked' ? 'Fora do horário' : st === 'real' ? 'Ocupado (agendamento)' : 'Bloqueado por você';
                  return (
                    <button
                      key={i}
                      className={`myag-slot myag-slot-${cls}`}
                      disabled={st === 'blocked'}
                      onClick={() => clicar(d, slot, st)}
                      title={`${rotuloDia(d)} · ${slot} — ${titulo}`}
                    >
                      {st === 'available' && '✓'}
                      {(st === 'manual' || st === 'real') && '×'}
                      {st === 'manual' && <span className="myag-slot-edit" />}
                      {st === 'real' && <span className="myag-slot-lockmark"><Ic name="lock" size={9} /></span>}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* A) Popup de confirmação para BLOQUEIO MANUAL (ocupar/liberar) */}
      {confirmar && (
        <div className="myag-confirm-back" onClick={() => setConfirmar(null)}>
          <div className="myag-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="myag-confirm-ic" data-tipo={confirmar.acao === 'ocupar' ? 'ocupar' : 'liberar'}>
              <Ic name={confirmar.acao === 'ocupar' ? 'lock' : 'check'} size={22} />
            </div>
            <div className="myag-confirm-title">
              {confirmar.acao === 'ocupar' ? 'Bloquear este horário?' : 'Liberar este horário?'}
            </div>
            <div className="muted" style={{ fontSize: 13, textAlign: 'center' }}>
              {confirmar.dateLabel} · {confirmar.hhmm}
              {confirmar.acao === 'ocupar'
                ? ' — deixará de aparecer no seu link público (só nesta data).'
                : ' — voltará a ficar disponível no seu link público.'}
            </div>
            <div className="myag-confirm-acts">
              <ActionButton action="cancelar" size="sm" label="Cancelar" efeito={false} onClick={() => setConfirmar(null)} />
              <ActionButton action="salvar" size="sm" label="Confirmar" efeito={false} onClick={aplicar} />
            </div>
          </div>
        </div>
      )}

      {/* B) Popup só informativo para AGENDAMENTO REAL (não dá pra liberar aqui) */}
      {info && (
        <div className="myag-confirm-back" onClick={() => setInfo(null)}>
          <div className="myag-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="myag-confirm-ic" data-tipo="ocupar"><Ic name="calendar" size={22} /></div>
            <div className="myag-confirm-title">Horário ocupado</div>
            <div className="muted" style={{ fontSize: 13, textAlign: 'center' }}>
              {info.dateLabel} · {info.hhmm} — ocupado por um <strong>agendamento</strong> da sua Agenda. Para liberar, cancele o compromisso lá na Agenda.
            </div>
            <div className="myag-confirm-acts">
              <ActionButton action="salvar" size="sm" label="Entendi" efeito={false} onClick={() => setInfo(null)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Tab 3 — Public page preview (Calendly-style)
// ============================================================================
const MY_AG_MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MY_AG_WD_LONG = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const MY_AG_WD_MINI = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function MyAgPublicPreview({ link, agentName, agentTitle, slots, slotDuration, baseState, bloqueios, apptsByDate }) {
  const [phase, setPhase] = React.useState('pick'); // pick | form | done
  const [picked, setPicked] = React.useState(null);
  const [form, setForm] = React.useState({ nome: '', sobrenome: '', contato: '', email: '', local: 'Videochamada', assunto: '' });
  const [showCal, setShowCal] = React.useState(false);
  const [tz, setTz] = React.useState('Americas/Fortaleza');
  // semana atual (datas reais) — o preview é reflexo fiel do que o cliente vê.
  const [weekStart, setWeekStart] = React.useState(() => myAgSegunda(new Date()));

  // mesma lógica da "Esta semana": ocupado por compromisso real?
  const realOcupado = (dateStr, hhmm) => {
    const arr = (apptsByDate && apptsByDate[dateStr]) || [];
    const m = myAgTimeToMin(hhmm);
    return arr.some((a) => a.ini < m + slotDuration && a.ini + a.dur > m);
  };
  // horários LIVRES de um dia (disponível + não bloqueado manualmente + sem agendamento).
  const livresDoDia = (d) => {
    const wd = d.getDay(); const dateStr = myAgYmd(d);
    return slots.filter((s) => baseState(wd, s) === 'available' && !bloqueios.has(`${dateStr}-${s}`) && !realOcupado(dateStr, s));
  };

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
                  const dayLabel = MY_AG_WD_LONG[d.getDay()];
                  const livres = livresDoDia(d);
                  return (
                    <div key={i} className="myag-pp2-col" data-faded={livres.length === 0}>
                      <div className="myag-pp2-col-head">
                        <div className="myag-pp2-col-wd">{dayLabel}</div>
                        <div className="myag-pp2-col-day">{String(d.getDate()).padStart(2, '0')}</div>
                      </div>
                      <div className="myag-pp2-col-slots">
                        {livres.length
                          ? livres.map((slot) => (
                              <button key={slot} className="myag-pp2-slot" onClick={() => pickSlot(d, slot)}>{slot}</button>
                            ))
                          : <div className="myag-pp2-empty">—</div>}
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
function MyAgRulesPanel({ slotDuration, setSlotDuration, bufferMin, setBufferMin, advanceMin, setAdvanceMin, horizon, setHorizon, notif = {}, setNotif }) {
  const setN = (k, v) => setNotif && setNotif({ ...notif, [k]: v });
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
          <label className="myag-check"><input type="checkbox" checked={notif.emailCliente !== false} onChange={(e) => setN('emailCliente', e.target.checked)} /> Enviar confirmação por e-mail ao cliente</label>
          <label className="myag-check"><input type="checkbox" checked={notif.whatsappLembrete !== false} onChange={(e) => setN('whatsappLembrete', e.target.checked)} /> Enviar lembrete por WhatsApp 1h antes</label>
          <label className="myag-check"><input type="checkbox" checked={notif.meNotificar !== false} onChange={(e) => setN('meNotificar', e.target.checked)} /> Me notificar quando novo agendamento for criado</label>
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
      .myag-link-card[data-off="true"] { opacity: .72; filter: grayscale(.35); }
      .myag-link-pencil {
        border: none; background: transparent; cursor: pointer; padding: 2px;
        color: var(--text-muted); display: inline-flex; align-items: center;
        border-radius: 4px; margin-left: 2px;
      }
      .myag-link-pencil:hover { color: var(--accent-700); background: var(--accent-soft); }
      .myag-link-state {
        display: inline-flex; align-items: center; gap: 5px;
        border: 1px solid var(--border); background: var(--surface);
        border-radius: 999px; padding: 2px 8px; font-size: 10.5px; font-weight: 600;
        color: var(--text-muted); cursor: pointer;
      }
      .myag-link-state:hover { border-color: var(--border-strong); }
      .myag-link-dot {
        width: 7px; height: 7px; border-radius: 50%; background: var(--text-faint);
      }
      .myag-link-dot[data-on="true"] { background: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
      .myag-link-edit {
        display: flex; align-items: center; gap: 6px; margin-top: 6px; flex-wrap: wrap;
      }
      .myag-link-prefix {
        font-family: ui-monospace, monospace; font-size: 12px; color: var(--text-muted);
      }

      .myag-tabs {
        position: relative;
        display: flex; gap: 0; padding: 4px; background: var(--surface-2);
        border: 1px solid var(--border); border-radius: 10px; margin-bottom: 18px;
      }
      /* barra de destaque (verde do kit) que desliza lateralmente até a aba ativa */
      .myag-tab-ind {
        position: absolute; top: 4px; bottom: 4px; left: 4px;
        width: calc((100% - 8px) / 4);
        background: var(--accent-soft);
        border: 1px solid color-mix(in oklab, var(--accent) 42%, transparent);
        border-radius: 7px; pointer-events: none;
        box-shadow: 0 1px 5px color-mix(in oklab, var(--accent) 24%, transparent);
        transition: transform .3s cubic-bezier(.4, 0, .2, 1);
      }
      .myag-tab {
        position: relative; z-index: 1;
        flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        height: 36px; padding: 0 10px; border: none; background: transparent;
        color: var(--text-muted); font-weight: 500; font-size: 13px;
        border-radius: 7px; cursor: pointer; transition: color .2s;
      }
      .myag-tab:hover { color: var(--text); }
      .myag-tab.active { color: var(--accent-700); font-weight: 600; }

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
      /* botão "+" de faixa — verdinho claro do kit de rodapé (Salvar): #3DA767 sobre #C9F0D3 */
      .myag-add-range { width: 34px; background: #C9F0D3; color: #3DA767; border: 1px solid color-mix(in oklab, #3DA767 28%, transparent); }
      .myag-add-range:hover { background: color-mix(in oklab, #3DA767 26%, white); border-color: color-mix(in oklab, #3DA767 48%, transparent); color: #2f8f57; }
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
      .myag-wh-day {
        font-size: 16px; font-weight: 600; color: var(--text); font-variant-numeric: tabular-nums; margin-top: 1px;
      }
      /* Navegador de semana (datas reais) */
      .myag-weeknav { display: flex; align-items: center; gap: 8px; }
      .myag-weeknav-btn {
        width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--border);
        background: var(--surface); color: var(--text-muted); display: inline-flex;
        align-items: center; justify-content: center; cursor: pointer; transition: all .12s;
      }
      .myag-weeknav-btn:hover { background: var(--accent-soft); color: var(--accent-700); border-color: var(--accent); }
      .myag-weeknav-label {
        display: inline-flex; align-items: center; gap: 6px;
        font-size: 13.5px; font-weight: 600; color: var(--text);
        padding: 0 6px; min-width: 190px; justify-content: center;
      }
      .myag-weeknav-label > svg { color: var(--accent-700); }
      /* marca de cadeado nos slots ocupados por agendamento real (só leitura) */
      .myag-slot-lockmark { position: absolute; top: 2px; right: 3px; color: #be123c; opacity: .8; display: inline-flex; }
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
      .myag-slot:disabled { cursor: not-allowed; }

      /* Popup de confirmação (ocupar/liberar) */
      .myag-confirm-back {
        position: fixed; inset: 0; z-index: 400;
        background: rgba(15,23,42,.42); backdrop-filter: blur(2px);
        display: flex; align-items: center; justify-content: center;
        animation: fade .15s ease;
      }
      .myag-confirm {
        width: 370px; max-width: calc(100vw - 40px);
        background: var(--surface); border: 1px solid var(--border);
        border-radius: 14px; padding: 24px 22px;
        box-shadow: 0 20px 50px -12px rgba(15,23,42,.4);
        display: flex; flex-direction: column; align-items: center; gap: 10px;
        animation: myagPop .18s cubic-bezier(.4,0,.2,1);
      }
      @keyframes myagPop { from { opacity: 0; transform: translateY(8px) scale(.97); } to { opacity: 1; transform: none; } }
      .myag-confirm-ic {
        width: 50px; height: 50px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
      }
      .myag-confirm-ic[data-tipo="ocupar"] { background: color-mix(in oklab, var(--hue-rose) 16%, white); color: #be123c; }
      .myag-confirm-ic[data-tipo="liberar"] { background: var(--accent-soft); color: var(--accent-700); }
      .myag-confirm-title { font-size: 16px; font-weight: 600; }
      .myag-confirm-acts { display: flex; gap: 8px; margin-top: 10px; }

      /* Loading sem flicker (enquanto a config real não chega) */
      .myag-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 70px 0; color: var(--text-muted); font-size: 13px; }
      .myag-spin { width: 26px; height: 26px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: myagSpin .8s linear infinite; }
      @keyframes myagSpin { to { transform: rotate(360deg); } }

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
        background: #166534; color: #fff;
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
        border: 1.5px solid #16a34a;
        background: #fff; color: #16a34a;
        font-size: 14px; font-weight: 500; font-variant-numeric: tabular-nums;
        border-radius: 4px; cursor: pointer;
        transition: all .12s;
        font-family: inherit;
      }
      [data-theme="dark"] .myag-pp2-slot {
        background: var(--surface); color: color-mix(in oklab, #16a34a 80%, white);
        border-color: color-mix(in oklab, #16a34a 70%, var(--surface));
      }
      .myag-pp2-slot:hover:not(:disabled) {
        background: #dcfce7; color: #15803d; border-color: #16a34a;
      }
      .myag-pp2-empty { text-align: center; color: var(--text-faint); font-size: 13px; padding: 6px 0; }
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
        background: color-mix(in oklab, #16a34a 14%, white);
        color: #15803d; font-weight: 600;
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
