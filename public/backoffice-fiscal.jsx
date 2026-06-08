// backoffice-fiscal.jsx — Módulo Fiscal
// Obrigações tributárias, guias/impostos, obrigações acessórias e calendário fiscal.

(function () {
  const { fmtBRL, fmtBRLcompact, daysUntil, fmtDateLong, data } = window.BO;

  const IST = {
    pago:   { color: '#10b981', label: 'Pago' },
    aberto: { color: '#3b82f6', label: 'Em aberto' },
    atraso: { color: '#ef4444', label: 'Atrasado' }
  };
  const OST = {
    entregue: { color: '#10b981', label: 'Entregue' },
    pendente: { color: '#3b82f6', label: 'Pendente' },
    atraso:   { color: '#ef4444', label: 'Em atraso' }
  };
  const DST = {
    valido:   { color: '#10b981', label: 'Válido' },
    vencendo: { color: '#f59e0b', label: 'Vencendo' },
    vencido:  { color: '#ef4444', label: 'Vencido' }
  };

  function effImposto(i) {
    if (i.status !== 'aberto') return i.status;
    const d = daysUntil(i.venc);
    return d != null && d < 0 ? 'atraso' : 'aberto';
  }

  // ───────── Skeletons ─────────
  function BoKpiSkeleton({ count = 5 }) {
    return Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bo-kpi" style={{ borderTopColor: 'var(--border-strong)' }}>
        <div className="bo-kpi-head">
          <span className="bo-kpi-icon" style={{ background: 'var(--surface-3)' }}><Skeleton w={17} h={17} r={4} /></span>
          <span className="bo-kpi-label"><Skeleton w="70%" h={12} /></span>
        </div>
        <div className="bo-kpi-value"><Skeleton w="55%" h={24} /></div>
        <div className="bo-kpi-foot"><Skeleton w="45%" h={11} /></div>
      </div>));
  }

  // ───────── Aba: Guias & Impostos ─────────
  function ImpostosTab({ loading }) {
    const [query, setQuery] = React.useState('');
    const [stf, setStf] = React.useState('todos');
    const filtered = React.useMemo(() => {
      const q = (query || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return data.impostos.filter((i) => {
        const st = effImposto(i);
        if (stf !== 'todos' && st !== stf) return false;
        if (q) { const hay = (i.nome + ' ' + i.competencia).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); if (!hay.includes(q)) return false; }
        return true;
      });
    }, [query, stf]);
    const COLS = 'minmax(0, 2fr) 150px 160px 140px 130px 40px';
    return (
      <>
        <div className="bo-toolbar">
          <div className="bo-toolbar-row">
            <BoSearch value={query} onChange={setQuery} placeholder="Pesquisar imposto, competência..." />
            <div style={{ flex: 1 }} />
            <span className="muted" style={{ fontSize: 'var(--type-sm)' }}>{filtered.length} guias</span>
          </div>
          <div className="bo-toolbar-row">
            {[['todos', 'Todos', null], ['aberto', 'Em aberto', '#3b82f6'], ['pago', 'Pagos', '#10b981'], ['atraso', 'Atrasados', '#ef4444']].map(([id, label, dot]) => (
              <BoPill key={id} on={stf === id} dot={dot} onClick={() => setStf(id)}>{label}</BoPill>))}
          </div>
        </div>
        <div className="bo-list-card">
          <div className="bo-row bo-row-head" style={{ gridTemplateColumns: COLS }}>
            <div>Guia / Imposto</div><div>Competência</div><div>Vencimento</div><div>Valor</div><div>Status</div><div></div>
          </div>
          <div className="bo-list-body">
            {loading ? Array.from({ length: skelCount('bo-impostos', 3) }).map((_, i) => (
              <div key={i} className="bo-row" style={{ gridTemplateColumns: COLS, borderLeftColor: 'var(--border-strong)' }}>
                <div className="bo-cell"><Skeleton w="75%" h={14} /></div>
                <div className="bo-cell"><Skeleton w="70%" h={13} /></div>
                <div className="bo-cell"><Skeleton w="65%" h={13} /><Skeleton w="40%" h={11} /></div>
                <div className="bo-cell"><Skeleton w="60%" h={14} /></div>
                <div className="bo-cell"><Skeleton w={70} h={20} /></div>
                <div className="bo-cell bo-cell-act"><Skeleton w={28} h={28} r={6} /></div>
              </div>
            )) : filtered.map((i, idx) => {
              const st = effImposto(i);
              const meta = IST[st];
              const d = daysUntil(i.venc);
              return (
                <div key={idx} className="bo-row" style={{ gridTemplateColumns: COLS, borderLeftColor: meta.color }}>
                  <div className="bo-cell"><span className="bo-cell-strong">{i.nome}</span></div>
                  <div className="bo-cell"><span className="tnum" style={{ fontSize: 'var(--type-sm)' }}>{i.competencia}</span></div>
                  <div className="bo-cell">
                    <span className="tnum" style={{ fontSize: 'var(--type-sm)' }}>{i.venc}</span>
                    {st !== 'pago' && d != null && <span className="bo-cell-sub" style={{ color: d < 0 ? '#b91c1c' : d <= 7 ? '#b45309' : 'var(--text-muted)', fontWeight: 600 }}>{d < 0 ? `há ${Math.abs(d)}d` : d === 0 ? 'hoje' : `em ${d}d`}</span>}
                  </div>
                  <div className="bo-cell"><span className="bo-cell-num">{fmtBRL(i.valor)}</span></div>
                  <div className="bo-cell"><BoChip color={meta.color} label={meta.label} /></div>
                  <div className="bo-cell bo-cell-act">
                    {st === 'pago'
                      ? <span className="btn btn-ghost btn-icon" style={{ width: 28, height: 28, color: '#10b981' }}><Ic name="check" size={15} /></span>
                      : <button className="btn btn-sm btn-edit" title="Pagar guia"><Ic name="dollar" size={13} /></button>}
                  </div>
                </div>);
            })}
          </div>
        </div>
      </>);
  }

  // ───────── Aba: Obrigações acessórias ─────────
  function ObrigacoesTab() {
    const COLS = 'minmax(0, 2fr) 150px 170px 150px';
    return (
      <div className="bo-list-card" style={{ flex: 'none' }}>
        <div className="bo-row bo-row-head" style={{ gridTemplateColumns: COLS }}>
          <div>Obrigação</div><div>Competência</div><div>Entrega</div><div>Status</div>
        </div>
        <div>
          {data.obrigacoes.map((o, idx) => {
            const meta = OST[o.status];
            const d = daysUntil(o.entrega);
            return (
              <div key={idx} className="bo-row" style={{ gridTemplateColumns: COLS, borderLeft: `2px solid ${meta.color}`, borderBottom: '1px solid var(--border)' }}>
                <div className="row" style={{ gap: 10, minWidth: 0 }}>
                  <span className="bo-mini-ic" style={{ width: 30, height: 30, background: `color-mix(in oklab,${meta.color} 12%,white)`, color: meta.color }}><Ic name="file-text" size={15} /></span>
                  <span className="bo-cell-strong">{o.nome}</span>
                </div>
                <div className="bo-cell"><span className="tnum" style={{ fontSize: 'var(--type-sm)' }}>{o.competencia}</span></div>
                <div className="bo-cell">
                  <span className="tnum" style={{ fontSize: 'var(--type-sm)' }}>{o.entrega}</span>
                  {o.status !== 'entregue' && d != null && <span className="bo-cell-sub" style={{ color: d < 0 ? '#b91c1c' : 'var(--text-muted)', fontWeight: 600 }}>{d < 0 ? `atrasada ${Math.abs(d)}d` : `em ${d}d`}</span>}
                </div>
                <div className="bo-cell"><BoChip color={meta.color} label={meta.label} /></div>
              </div>);
          })}
        </div>
      </div>);
  }

  // ───────── Aba: Calendário & Documentos ─────────
  function CalendarioTab() {
    const eventos = React.useMemo(() => {
      const evs = [];
      data.impostos.filter((i) => i.status !== 'pago').forEach((i) => evs.push({ tipo: 'Imposto', nome: i.nome, date: i.venc, valor: i.valor, color: '#f97316', icon: 'dollar' }));
      data.obrigacoes.filter((o) => o.status !== 'entregue').forEach((o) => evs.push({ tipo: 'Obrigação', nome: o.nome, date: o.entrega, color: '#3b82f6', icon: 'file-text' }));
      return evs.sort((a, b) => (daysUntil(a.date) ?? 999) - (daysUntil(b.date) ?? 999));
    }, []);
    return (
      <div className="bo-dash-grid">
        <BoPanel title="Calendário tributário" icon="agenda" iconColor="#f97316">
          {eventos.map((e, i) => {
            const d = daysUntil(e.date);
            return (
              <div key={i} className="bo-mini">
                <span className="bo-mini-ic" style={{ background: `color-mix(in oklab,${e.color} 12%,white)`, color: e.color }}><Ic name={e.icon} size={15} /></span>
                <div className="bo-mini-main">
                  <div className="bo-mini-title">{e.nome}</div>
                  <div className="bo-mini-sub">{e.tipo}{e.valor ? ' · ' + fmtBRLcompact(e.valor) : ''}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="tnum" style={{ fontWeight: 600, fontSize: 'var(--type-sm)' }}>{fmtDateLong(e.date)}</div>
                  <div className="bo-cell-sub" style={{ color: d != null && d < 0 ? '#b91c1c' : d != null && d <= 7 ? '#b45309' : 'var(--text-muted)' }}>{d == null ? '' : d < 0 ? `há ${Math.abs(d)}d` : d === 0 ? 'hoje' : `em ${d}d`}</div>
                </div>
              </div>);
          })}
        </BoPanel>
        <BoPanel title="Documentos & Certidões" icon="shield" iconColor="#10b981">
          {data.documentos.map((doc, i) => {
            const meta = DST[doc.status];
            return (
              <div key={i} className="bo-mini">
                <span className="bo-mini-ic" style={{ background: `color-mix(in oklab,${meta.color} 12%,white)`, color: meta.color }}><Ic name="shield" size={15} /></span>
                <div className="bo-mini-main"><div className="bo-mini-title">{doc.nome}</div><div className="bo-mini-sub">{doc.tipo} · vence {doc.venc}</div></div>
                <BoChip color={meta.color} label={meta.label} />
              </div>);
          })}
        </BoPanel>
      </div>);
  }

  function BackofficeFiscal() {
    const [tab, setTab] = React.useState('impostos');
    const [loading, setLoading] = React.useState(true);  // skeleton no mount (scaffolding p/ API real)
    React.useEffect(() => setLoading(false), []);
    React.useEffect(() => { if (data.impostos.length) skelRemember('bo-impostos', data.impostos.length); }, []);
    const kpis = React.useMemo(() => {
      const im = data.impostos;
      const aVencer = im.filter((i) => effImposto(i) === 'aberto');
      const atraso = im.filter((i) => effImposto(i) === 'atraso');
      const pago = im.filter((i) => i.status === 'pago');
      return {
        aVencer: aVencer.length, aVencerVal: aVencer.reduce((s, i) => s + i.valor, 0),
        pagoVal: pago.reduce((s, i) => s + i.valor, 0),
        atraso: atraso.length, atrasoVal: atraso.reduce((s, i) => s + i.valor, 0),
        obrig: data.obrigacoes.filter((o) => o.status !== 'entregue').length,
        docs: data.documentos.filter((d) => d.status !== 'valido').length
      };
    }, []);
    return (
      <Page title="Fiscal" subtitle="Obrigações tributárias e fiscais da empresa"
        actions={<button className="btn"><Ic name="download" size={14} /> Relatório fiscal</button>}>
        <BoStyles />
        <div className="bo-kpi-grid">
          {loading ? <BoKpiSkeleton count={5} /> : <>
          <BoKpi tone="orange" icon="dollar" label="Impostos a vencer" value={kpis.aVencer} foot={fmtBRLcompact(kpis.aVencerVal)} />
          <BoKpi tone="green" icon="check-circle" label="Impostos pagos" value={fmtBRLcompact(kpis.pagoVal)} foot="No período" />
          <BoKpi tone="red" icon="alert" label="Em atraso" value={kpis.atraso} foot={fmtBRLcompact(kpis.atrasoVal)} />
          <BoKpi tone="blue" icon="list" label="Obrigações pendentes" value={kpis.obrig} foot="Acessórias" />
          <BoKpi tone="amber" icon="shield" label="Documentos vencendo" value={kpis.docs} foot="Certidões/licenças" />
          </>}
        </div>
        <div className="tabs">
          {[['impostos', 'Guias & Impostos'], ['obrig', 'Obrigações Acessórias'], ['cal', 'Calendário & Documentos']].map(([id, label]) => (
            <div key={id} className={'tab' + (tab === id ? ' active' : '')} onClick={() => setTab(id)}>{label}</div>))}
        </div>
        {tab === 'impostos' && <ImpostosTab loading={loading} />}
        {tab === 'obrig' && <ObrigacoesTab />}
        {tab === 'cal' && <CalendarioTab />}
      </Page>);
  }

  window.BackofficeFiscal = BackofficeFiscal;
})();
