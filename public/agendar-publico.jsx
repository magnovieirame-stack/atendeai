// agendar-publico.jsx — PÁGINA PÚBLICA de agendamento (/agendar/:slug).
// Standalone: renderiza SEM login (o app.jsx desvia pra cá quando a URL é /agendar/...).
// Busca os horários livres reais do dono (resolvido pelo slug) e cria a reserva.
// Autossuficiente: estilos próprios (não depende do drawer), só usa window.API e <Ic>.

const AGP_MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const AGP_WD = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

// 'YYYY-MM-DD' -> Date local (sem deslocar fuso).
function agpParse(s) { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); }
function agpYmd(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function agpSegunda(d) { const n = new Date(d); const wd = n.getDay(); const diff = wd === 0 ? -6 : 1 - wd; n.setDate(n.getDate() + diff); n.setHours(0, 0, 0, 0); return n; }

function AgendarPublico({ slug }) {
  const [estado, setEstado] = React.useState('loading'); // loading | ok | erro
  const [erro, setErro] = React.useState('');
  const [dados, setDados] = React.useState(null);        // { publica, regras, disponibilidade }
  const [fase, setFase] = React.useState('pick');        // pick | form | done
  const [picked, setPicked] = React.useState(null);      // { data, hora }
  const [weekStart, setWeekStart] = React.useState(null);
  const [form, setForm] = React.useState({ nome: '', sobrenome: '', contato: '', email: '', local: 'Videochamada', assunto: '' });
  const [enviando, setEnviando] = React.useState(false);

  React.useEffect(() => {
    let vivo = true;
    window.API.getAgendaPublica(slug)
      .then((r) => {
        if (!vivo) return;
        setDados(r);
        // posiciona na semana do primeiro dia com horário livre (ou na semana de hoje).
        const prim = (r.disponibilidade || []).find((d) => d.slots && d.slots.length);
        setWeekStart(agpSegunda(prim ? agpParse(prim.data) : new Date()));
        setEstado('ok');
      })
      .catch((e) => { if (!vivo) return; setErro((e && e.message) || 'Não foi possível carregar.'); setEstado('erro'); });
    return () => { vivo = false; };
  }, [slug]);

  // mapa data -> slots, e limites (primeiro/último dia ofertado)
  const mapa = React.useMemo(() => {
    const m = {};
    (dados?.disponibilidade || []).forEach((d) => { m[d.data] = d.slots || []; });
    return m;
  }, [dados]);
  const limites = React.useMemo(() => {
    const ds = (dados?.disponibilidade || []).map((d) => d.data).sort();
    return { min: ds[0], max: ds[ds.length - 1] };
  }, [dados]);
  const dias = React.useMemo(() => {
    if (!weekStart) return [];
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d; });
  }, [weekStart]);

  if (estado === 'loading') return <AgpShell><div className="agp-msg"><div className="agp-spin" /> Carregando horários…</div></AgpShell>;
  if (estado === 'erro') return (
    <AgpShell>
      <div className="agp-msg agp-erro">
        <Ic name="x" size={26} />
        <div style={{ fontWeight: 600, fontSize: 17, marginTop: 8 }}>Link indisponível</div>
        <div className="agp-muted" style={{ marginTop: 4 }}>{erro}</div>
      </div>
    </AgpShell>
  );

  const titulo = dados?.publica?.titulo || 'Agendamento';
  const dur = dados?.regras?.slotDuration || 30;

  const podeVoltar = weekStart && limites.min && agpYmd(weekStart) > limites.min;
  const podeAvancar = weekStart && limites.max && agpYmd(dias[6] || weekStart) < limites.max;
  const shift = (dir) => { const d = new Date(weekStart); d.setDate(d.getDate() + dir * 7); setWeekStart(d); };

  const escolher = (dataStr, hora) => { setPicked({ data: dataStr, hora }); setFase('form'); };

  const enviar = async (e) => {
    e?.preventDefault();
    if (!form.nome || !form.contato || !form.email || !form.assunto || !picked) return;
    setEnviando(true);
    try {
      await window.API.reservarAgendaPublica(slug, { ...form, data: picked.data, hora: picked.hora });
      setFase('done');
    } catch (err) {
      if (err && err.status === 409) {
        window.showToast && window.showToast({ tipo: 'erro', titulo: 'Horário indisponível', descricao: 'Esse horário acabou de ser ocupado. Escolha outro.' });
        // recarrega a disponibilidade e volta pra seleção
        try { const r = await window.API.getAgendaPublica(slug); setDados(r); } catch (_) {}
        setFase('pick'); setPicked(null);
      } else {
        window.showToast && window.showToast({ tipo: 'erro', titulo: 'Não foi possível agendar', descricao: (err && err.message) || 'Tente novamente.' });
      }
    } finally { setEnviando(false); }
  };

  const mLabel = weekStart ? `${AGP_MESES[weekStart.getMonth()]} ${weekStart.getFullYear()}` : '';

  return (
    <AgpShell>
      <div className="agp-card">
        {/* Cabeçalho */}
        <div className="agp-head">
          <div className="agp-logo">{(titulo || 'A').slice(0, 1).toUpperCase()}</div>
          <div style={{ minWidth: 0 }}>
            <div className="agp-title">{titulo}</div>
            <div className="agp-muted">{fase === 'pick' ? 'Escolha um horário disponível.' : fase === 'form' ? 'Confirme seus dados.' : 'Pronto!'}</div>
          </div>
        </div>

        {fase === 'pick' && (
          <>
            <div className="agp-toolbar">
              <span className="agp-month">{mLabel}</span>
              <div style={{ flex: 1 }} />
              <button className="agp-iconbtn" disabled={!podeVoltar} onClick={() => shift(-1)} title="Semana anterior"><Ic name="arrow-left" size={15} /></button>
              <button className="agp-iconbtn" disabled={!podeAvancar} onClick={() => shift(1)} title="Próxima semana"><Ic name="arrow-right" size={15} /></button>
            </div>
            <div className="agp-grid">
              {dias.map((d, i) => {
                const ds = agpYmd(d);
                const slots = mapa[ds] || [];
                const foraDoIntervalo = (limites.min && ds < limites.min) || (limites.max && ds > limites.max);
                return (
                  <div key={i} className="agp-col" data-empty={!slots.length}>
                    <div className="agp-col-head">
                      <div className="agp-col-wd">{AGP_WD[d.getDay()]}</div>
                      <div className="agp-col-day">{String(d.getDate()).padStart(2, '0')}</div>
                    </div>
                    <div className="agp-slots">
                      {foraDoIntervalo
                        ? null
                        : slots.length
                          ? slots.map((s) => <button key={s} className="agp-slot" onClick={() => escolher(ds, s)}>{s}</button>)
                          : <div className="agp-none">—</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="agp-foot agp-muted">Cada horário dura {dur} minutos.</div>
          </>
        )}

        {fase === 'form' && picked && (
          <form className="agp-form" onSubmit={enviar}>
            <button type="button" className="agp-back" onClick={() => { setFase('pick'); setPicked(null); }}>
              <Ic name="arrow-left" size={13} /> Trocar horário
            </button>
            <div className="agp-when">
              <Ic name="clock" size={14} /> {agpParse(picked.data).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} · {picked.hora}
            </div>
            <div className="agp-fgrid">
              <div><label className="agp-label">Nome *</label><input className="agp-input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Maria" /></div>
              <div><label className="agp-label">Sobrenome</label><input className="agp-input" value={form.sobrenome} onChange={(e) => setForm({ ...form, sobrenome: e.target.value })} placeholder="Silva" /></div>
              <div><label className="agp-label">Contato (WhatsApp) *</label><input className="agp-input" type="tel" value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} placeholder="(11) 99999-9999" /></div>
              <div><label className="agp-label">E-mail *</label><input className="agp-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="maria@email.com" /></div>
              <div><label className="agp-label">Local</label>
                <select className="agp-input" value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })}>
                  <option>Videochamada</option><option>Presencial</option><option>Telefone</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}><label className="agp-label">Assunto *</label>
                <textarea className="agp-input" rows={3} value={form.assunto} onChange={(e) => setForm({ ...form, assunto: e.target.value })} placeholder="Descreva brevemente o motivo do agendamento" />
              </div>
            </div>
            <button type="submit" className="agp-btn" disabled={enviando}>
              <Ic name="check" size={15} /> {enviando ? 'Confirmando…' : 'Confirmar agendamento'}
            </button>
          </form>
        )}

        {fase === 'done' && picked && (
          <div className="agp-done">
            <div className="agp-done-ic"><Ic name="check" size={30} /></div>
            <div className="agp-done-title">Agendamento confirmado!</div>
            <div className="agp-muted" style={{ marginTop: 6 }}>Enviamos os detalhes para <strong>{form.email}</strong>.</div>
            <div className="agp-receipt">
              <div className="agp-rrow"><span className="agp-muted">Quando</span><span>{agpParse(picked.data).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} · {picked.hora}</span></div>
              <div className="agp-rrow"><span className="agp-muted">Com</span><span>{titulo}</span></div>
              <div className="agp-rrow"><span className="agp-muted">Local</span><span>{form.local}</span></div>
            </div>
          </div>
        )}
      </div>
      <div className="agp-brand">PK360 · Agendamento online</div>
    </AgpShell>
  );
}

// Casca + estilos da página pública (fundo e card centralizado).
function AgpShell({ children }) {
  return (
    <div className="agp-bg">
      <AgpStyles />
      <div className="agp-wrap">{children}</div>
    </div>
  );
}

function AgpStyles() {
  return (<style dangerouslySetInnerHTML={{ __html: `
    .agp-bg { min-height: 100vh; background: #eef2f7; display: flex; align-items: flex-start; justify-content: center; padding: 40px 16px; font-family: 'Inter', system-ui, sans-serif; color: #0f172a; }
    .agp-wrap { width: 100%; max-width: 940px; }
    .agp-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 12px 40px -16px rgba(15,23,42,.25); overflow: hidden; }
    .agp-head { display: flex; align-items: center; gap: 16px; padding: 28px 32px 18px; }
    .agp-logo { width: 56px; height: 56px; border-radius: 50%; background: #166534; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 24px; flex-shrink: 0; }
    .agp-title { font-size: 21px; font-weight: 700; letter-spacing: -.01em; }
    .agp-muted { color: #64748b; font-size: 14px; }
    .agp-toolbar { display: flex; align-items: center; gap: 8px; padding: 8px 32px 4px; }
    .agp-month { font-size: 15px; font-weight: 600; }
    .agp-iconbtn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; color: #475569; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
    .agp-iconbtn:hover:not(:disabled) { background: #f1f5f9; }
    .agp-iconbtn:disabled { opacity: .4; cursor: not-allowed; }
    .agp-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 14px; padding: 16px 32px 8px; background: #f8fafc; }
    .agp-col { display: flex; flex-direction: column; }
    .agp-col[data-empty="true"] { opacity: .55; }
    .agp-col-head { text-align: center; margin-bottom: 8px; }
    .agp-col-wd { font-size: 12px; color: #64748b; font-weight: 500; }
    .agp-col-day { font-size: 26px; font-weight: 600; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
    .agp-slots { display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: auto; }
    .agp-slot { height: 36px; border: 1.5px solid #16a34a; background: #fff; color: #16a34a; font-size: 13px; font-weight: 600; border-radius: 6px; cursor: pointer; font-family: inherit; transition: all .12s; }
    .agp-slot:hover { background: #dcfce7; color: #15803d; border-color: #16a34a; }
    .agp-none { text-align: center; color: #cbd5e1; font-size: 13px; padding: 6px 0; }
    .agp-foot { padding: 12px 32px 24px; }
    .agp-form { padding: 22px 32px 30px; max-width: 680px; margin: 0 auto; }
    .agp-back { border: none; background: none; color: #475569; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; padding: 0 0 12px; }
    .agp-when { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px 12px; margin-bottom: 18px; }
    .agp-fgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .agp-label { display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 5px; }
    .agp-input { width: 100%; height: 42px; border: 1px solid #cbd5e1; border-radius: 9px; padding: 0 12px; font-size: 14px; font-family: inherit; background: #fff; color: #0f172a; box-sizing: border-box; }
    textarea.agp-input { height: auto; padding: 10px 12px; resize: vertical; }
    .agp-input:focus { outline: none; border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,.14); }
    .agp-btn { width: 100%; height: 46px; margin-top: 18px; border: none; border-radius: 10px; background: #16a34a; color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-family: inherit; }
    .agp-btn:hover:not(:disabled) { background: #15803d; }
    .agp-btn:disabled { opacity: .7; cursor: default; }
    .agp-done { text-align: center; padding: 44px 30px 50px; }
    .agp-done-ic { width: 66px; height: 66px; border-radius: 50%; background: #dcfce7; color: #16a34a; display: inline-flex; align-items: center; justify-content: center; }
    .agp-done-title { font-size: 21px; font-weight: 700; margin-top: 14px; }
    .agp-receipt { max-width: 420px; margin: 20px auto 0; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; text-align: left; display: flex; flex-direction: column; gap: 10px; }
    .agp-rrow { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
    .agp-rrow span:last-child { text-align: right; font-weight: 500; }
    .agp-msg { text-align: center; padding: 70px 20px; color: #475569; font-size: 15px; }
    .agp-msg.agp-erro { color: #b91c1c; }
    .agp-erro > svg { background: #fee2e2; border-radius: 50%; padding: 8px; width: 42px; height: 42px; }
    .agp-spin { width: 26px; height: 26px; border: 3px solid #cbd5e1; border-top-color: #16a34a; border-radius: 50%; display: inline-block; margin-bottom: 12px; animation: agpspin .8s linear infinite; }
    @keyframes agpspin { to { transform: rotate(360deg); } }
    .agp-brand { text-align: center; color: #94a3b8; font-size: 12.5px; margin-top: 18px; }
    @media (max-width: 720px) {
      .agp-grid { grid-template-columns: repeat(3, 1fr); }
      .agp-fgrid { grid-template-columns: 1fr; }
    }
  ` }} />);
}

Object.assign(window, { AgendarPublico });
