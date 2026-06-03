// backoffice-hr.jsx — Módulo RH
// Recrutamento, colaboradores, férias e desenvolvimento humano.

(function () {
  const { fmtBRL, fmtBRLcompact, daysUntil, data } = window.BO;

  const CST = {
    ativo:    { color: '#10b981', label: 'Ativo' },
    ferias:   { color: '#3b82f6', label: 'Em férias' },
    afastado: { color: '#f59e0b', label: 'Afastado' }
  };
  const ETAPAS = ['Inscrito', 'Triagem', 'Entrevista', 'Teste', 'Aprovação', 'Contratação'];
  const ETAPA_COLOR = { Inscrito: '#94a3b8', Triagem: '#3b82f6', Entrevista: '#8b5cf6', Teste: '#f59e0b', 'Aprovação': '#10b981', 'Contratação': '#14b8a6' };

  // ───────── Drawer de colaborador ─────────
  function ColabDrawer({ colab, onClose }) {
    const c = colab;
    const st = CST[c.status] || CST.ativo;
    const Row = ({ label, children }) => (
      <div className="hr-dl-row"><div className="hr-dl-label">{label}</div><div className="hr-dl-val">{children}</div></div>);
    return (
      <Drawer
        title={<span className="row" style={{ gap: 12 }}><Avatar name={c.nome} /><span>{c.nome}</span></span>}
        subtitle={c.cargo + ' · ' + c.depto}
        onClose={onClose} width={680}
        rightHead={<BoChip color={st.color} label={st.label} solid />}
        footer={(close) => (<><button className="btn fin-btn-back btn-fixed" onClick={() => close()}><Ic name="arrow-left" size={13} /> Voltar</button><div style={{ flex: 1 }} /><button className="btn btn-save btn-fixed"><Ic name="edit" size={13} /> Editar</button></>)}>
        <style>{`
          .hr-dl-row { display: grid; grid-template-columns: 150px 1fr; gap: 14px; padding: 11px 0; border-bottom: 1px solid var(--border); align-items: center; }
          .hr-dl-row:last-child { border-bottom: 0; }
          .hr-dl-label { font-size: var(--type-sm); color: var(--text-muted); font-weight: 500; }
          .hr-dl-val { font-weight: 500; }
        `}</style>
        <BoSectionTitle>Dados profissionais</BoSectionTitle>
        <div className="bo-panel" style={{ padding: '4px 18px', marginBottom: 16 }}>
          <Row label="Cargo">{c.cargo}</Row>
          <Row label="Departamento">{c.depto}</Row>
          <Row label="Gestor direto">{c.gestor}</Row>
          <Row label="Data de admissão"><span className="tnum">{c.admissao}</span></Row>
          <Row label="Salário"><span className="bo-cell-num" style={{ color: '#1d4ed8' }}>{fmtBRL(c.salario)}</span></Row>
          <Row label="E-mail">{c.email}</Row>
        </div>
        <BoSectionTitle>Documentos</BoSectionTitle>
        <div className="bo-panel" style={{ padding: 14 }}>
          {['Contrato de trabalho', 'Documentos pessoais', 'Certificados', 'Avaliações de desempenho'].map((d) => (
            <div key={d} className="bo-mini">
              <span className="bo-mini-ic" style={{ background: 'color-mix(in oklab,#3b82f6 12%,white)', color: '#1d4ed8' }}><Ic name="file-text" size={16} /></span>
              <div className="bo-mini-main"><div className="bo-mini-title">{d}</div></div>
              <button className="btn btn-sm btn-ghost"><Ic name="download" size={13} /></button>
            </div>))}
        </div>
      </Drawer>);
  }

  // ───────── Aba: Colaboradores ─────────
  function ColaboradoresTab({ onOpen }) {
    const [query, setQuery] = React.useState('');
    const [dep, setDep] = React.useState('todos');
    const filtered = React.useMemo(() => {
      const q = (query || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return data.colaboradores.filter((c) => {
        if (dep !== 'todos' && c.depto !== dep) return false;
        if (q) { const hay = (c.nome + ' ' + c.cargo + ' ' + c.depto).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); if (!hay.includes(q)) return false; }
        return true;
      });
    }, [query, dep]);
    const COLS = 'minmax(0, 2fr) 150px 130px 130px 130px 40px';
    return (
      <>
        <div className="bo-toolbar">
          <div className="bo-toolbar-row">
            <BoSearch value={query} onChange={setQuery} placeholder="Pesquisar colaborador, cargo..." />
            <div style={{ flex: 1 }} />
            <span className="muted" style={{ fontSize: 'var(--type-sm)' }}>{filtered.length} colaboradores</span>
          </div>
          <div className="bo-toolbar-row">
            <BoPill on={dep === 'todos'} onClick={() => setDep('todos')}>Todos</BoPill>
            {window.BO.DEPTOS.map((d) => <BoPill key={d} on={dep === d} onClick={() => setDep(d)}>{d}</BoPill>)}
          </div>
        </div>
        <div className="bo-list-card">
          <div className="bo-row bo-row-head" style={{ gridTemplateColumns: COLS }}>
            <div>Colaborador</div><div>Departamento</div><div>Admissão</div><div>Salário</div><div>Status</div><div></div>
          </div>
          <div className="bo-list-body">
            {filtered.map((c) => (
              <div key={c.nome} className="bo-row bo-row-body" style={{ gridTemplateColumns: COLS, borderLeftColor: (CST[c.status] || CST.ativo).color }} onClick={() => onOpen(c)}>
                <div className="row" style={{ gap: 11, minWidth: 0 }}>
                  <Avatar name={c.nome} />
                  <div className="bo-cell"><span className="bo-cell-strong">{c.nome}</span><span className="bo-cell-sub">{c.cargo}</span></div>
                </div>
                <div className="bo-cell"><span style={{ fontSize: 'var(--type-sm)' }}>{c.depto}</span><span className="bo-cell-sub">Gestor: {c.gestor.split(' ')[0]}</span></div>
                <div className="bo-cell"><span className="tnum" style={{ fontSize: 'var(--type-sm)' }}>{c.admissao}</span></div>
                <div className="bo-cell"><span className="bo-cell-num">{fmtBRLcompact(c.salario)}</span></div>
                <div className="bo-cell"><BoChip color={(CST[c.status] || CST.ativo).color} label={(CST[c.status] || CST.ativo).label} /></div>
                <div className="bo-cell bo-cell-act"><span className="btn btn-ghost btn-icon" style={{ width: 28, height: 28, color: 'var(--text-faint)' }}><Ic name="chevron-right" size={16} /></span></div>
              </div>))}
          </div>
        </div>
      </>);
  }

  // ───────── Aba: Recrutamento ─────────
  function RecrutamentoTab() {
    return (
      <div className="bo-dash-grid" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <BoSectionTitle>Vagas abertas · {data.vagas.length}</BoSectionTitle>
          {data.vagas.map((v) => {
            const col = ETAPA_COLOR[v.etapa] || '#94a3b8';
            const prog = (ETAPAS.indexOf(v.etapa) + 1) / ETAPAS.length;
            return (
              <div key={v.titulo} className="bo-panel" style={{ padding: 16 }}>
                <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, letterSpacing: '-.01em' }}>{v.titulo}</div>
                    <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 2 }}>{v.area} · {v.regime} · {fmtBRLcompact(v.salario)} · {v.resp.split(' ')[0]}</div>
                  </div>
                  <BoChip color={col} label={v.etapa} />
                </div>
                <div className="row" style={{ marginTop: 12, gap: 10 }}>
                  <div className="bo-track" style={{ flex: 1 }}><div style={{ width: (prog * 100) + '%', background: col }} /></div>
                  <span className="muted" style={{ fontSize: 'var(--type-xs)', whiteSpace: 'nowrap' }}><b style={{ color: 'var(--text)' }}>{v.inscritos}</b> inscritos</span>
                </div>
              </div>);
          })}
        </div>
        <BoPanel title="Banco de Talentos" icon="users" iconColor="#3b82f6">
          {data.candidatos.map((c) => (
            <div key={c.nome} className="bo-mini">
              <Avatar name={c.nome} size="sm" />
              <div className="bo-mini-main"><div className="bo-mini-title">{c.nome}</div><div className="bo-mini-sub">{c.cargo} · {c.origem}</div></div>
              <span className="bo-cell-num" style={{ fontSize: 'var(--type-sm)', color: '#1d4ed8' }}>{fmtBRLcompact(c.pretensao)}</span>
            </div>))}
        </BoPanel>
      </div>);
  }

  // ───────── Aba: Férias & Benefícios ─────────
  function FeriasTab() {
    const aniversariantes = data.colaboradores.filter((c) => c.aniversario.endsWith('/06') || c.aniversario.endsWith('/05'));
    return (
      <div className="bo-dash-grid">
        <BoPanel title="Solicitações de férias" icon="agenda" iconColor="#3b82f6">
          {data.ferias.map((f) => (
            <div key={f.colaborador + f.inicio} className="bo-mini">
              <Avatar name={f.colaborador} size="sm" />
              <div className="bo-mini-main">
                <div className="bo-mini-title">{f.colaborador}</div>
                <div className="bo-mini-sub tnum">{f.inicio} → {f.fim} · {f.dias} dias</div>
              </div>
              {f.status === 'pendente'
                ? <button className="btn btn-sm btn-save"><Ic name="check" size={13} /> Aprovar</button>
                : <BoChip color="#10b981" label="Aprovada" />}
            </div>))}
        </BoPanel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <BoPanel title="Aniversariantes" icon="star" iconColor="#f59e0b">
            {aniversariantes.map((c) => (
              <div key={c.nome} className="bo-mini">
                <Avatar name={c.nome} size="sm" />
                <div className="bo-mini-main"><div className="bo-mini-title">{c.nome}</div><div className="bo-mini-sub">{c.cargo}</div></div>
                <span className="chip chip-accent tnum">{c.aniversario}</span>
              </div>))}
          </BoPanel>
          <BoPanel title="Benefícios ativos" icon="card-id" iconColor="#14b8a6">
            {[['Vale Transporte', 12], ['Vale Alimentação', 12], ['Plano de Saúde', 9], ['Plano Odontológico', 7]].map(([b, n]) => (
              <div key={b} className="bo-mini">
                <span className="bo-mini-ic" style={{ background: 'color-mix(in oklab,#14b8a6 12%,white)', color: '#0f766e' }}><Ic name="check-double" size={15} /></span>
                <div className="bo-mini-main"><div className="bo-mini-title">{b}</div></div>
                <span className="muted" style={{ fontSize: 'var(--type-sm)' }}><b style={{ color: 'var(--text)' }}>{n}</b> colab.</span>
              </div>))}
          </BoPanel>
        </div>
      </div>);
  }

  function BackofficeHR() {
    const [tab, setTab] = React.useState('colab');
    const [open, setOpen] = React.useState(null);
    const kpis = React.useMemo(() => {
      const c = data.colaboradores;
      return {
        ativos: c.length,
        novos: data.admissoes.length,
        vagas: data.vagas.length,
        ferias: data.ferias.length,
        aniver: c.filter((x) => x.aniversario.endsWith('/06')).length,
        turnover: '4,2%'
      };
    }, []);
    return (
      <Page title="RH" subtitle="Recrutamento, colaboradores e desenvolvimento humano"
        actions={<BoNewBtn label="Novo colaborador" onClick={() => {}} />}>
        <BoStyles />
        <div className="bo-kpi-grid">
          <BoKpi tone="blue" icon="users" label="Colaboradores ativos" value={kpis.ativos} foot="Headcount" />
          <BoKpi tone="teal" icon="user" label="Novas contratações" value={kpis.novos} foot="Em admissão" />
          <BoKpi tone="violet" icon="funnel" label="Vagas abertas" value={kpis.vagas} foot="Recrutamento" />
          <BoKpi tone="amber" icon="agenda" label="Férias programadas" value={kpis.ferias} foot="Próximas" />
          <BoKpi tone="orange" icon="star" label="Aniversariantes" value={kpis.aniver} foot="Este mês" />
          <BoKpi tone="slate" icon="activity" label="Turnover" value={kpis.turnover} foot="12 meses" />
        </div>
        <div className="tabs">
          {[['colab', 'Colaboradores'], ['recrut', 'Recrutamento'], ['ferias', 'Férias & Benefícios']].map(([id, label]) => (
            <div key={id} className={'tab' + (tab === id ? ' active' : '')} onClick={() => setTab(id)}>{label}</div>))}
        </div>
        {tab === 'colab' && <ColaboradoresTab onOpen={setOpen} />}
        {tab === 'recrut' && <RecrutamentoTab />}
        {tab === 'ferias' && <FeriasTab />}
        {open && <ColabDrawer colab={open} onClose={() => setOpen(null)} />}
      </Page>);
  }

  window.BackofficeHR = BackofficeHR;
})();
