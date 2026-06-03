// backoffice-pendencias.jsx — Central de Pendências (visão executiva consolidada)
// Entrada do Backoffice: indicadores executivos de todos os submódulos +
// lista inteligente unificada de tudo que exige ação, com filtros por
// módulo e severidade.

(function () {
  const { fmtBRLcompact, daysUntil, fmtDateLong, MODULES, data } = window.BO;

  // Constrói a lista unificada de pendências a partir dos datasets dos módulos
  function buildPendencias() {
    const out = [];
    const push = (p) => out.push(p);

    // ── Jurídico: contratos vencendo (ativos, fim ≤ 90 dias) ──
    data.contratos.forEach((c) => {
      if (c.status === 'ativo') {
        const d = daysUntil(c.fim);
        if (d != null && d <= 90) {
          push({
            mod: 'legal', sev: d <= 15 ? 'critico' : 'atencao',
            title: 'Contrato vencendo · ' + c.cliente,
            sub: c.num + ' · ' + c.tipo, date: c.fim, valor: c.valor, days: d,
            kind: 'Vencimento de contrato'
          });
        }
      }
      // ── Jurídico: aguardando assinatura ──
      if (c.status === 'aguardando' || c.status === 'enviado') {
        push({
          mod: 'legal', sev: c.status === 'aguardando' ? 'critico' : 'atencao',
          title: (c.status === 'aguardando' ? 'Aguardando assinatura · ' : 'Enviado p/ assinatura · ') + c.cliente,
          sub: c.num + ' · ' + c.tipo, date: c.inicio, valor: c.valor, days: daysUntil(c.inicio),
          kind: 'Assinatura pendente'
        });
      }
    });

    // ── RH: férias pendentes de aprovação ──
    data.ferias.filter((f) => f.status === 'pendente').forEach((f) => {
      push({
        mod: 'hr', sev: (daysUntil(f.inicio) ?? 99) <= 7 ? 'critico' : 'atencao',
        title: 'Férias a aprovar · ' + f.colaborador,
        sub: f.dias + ' dias · ' + f.inicio + ' a ' + f.fim, date: f.inicio, days: daysUntil(f.inicio),
        kind: 'Aprovação de férias'
      });
    });
    // ── RH: admissões pendentes ──
    data.admissoes.filter((a) => a.status === 'pendente').forEach((a) => {
      push({
        mod: 'hr', sev: (daysUntil(a.inicio) ?? 99) <= 7 ? 'critico' : 'atencao',
        title: 'Admissão pendente · ' + a.nome,
        sub: a.cargo + ' · ' + a.depto, date: a.inicio, days: daysUntil(a.inicio),
        kind: 'Admissão'
      });
    });
    // ── RH: desligamentos pendentes ──
    data.desligamentos.filter((d) => d.status === 'pendente').forEach((d) => {
      push({
        mod: 'hr', sev: 'critico',
        title: 'Desligamento pendente · ' + d.nome,
        sub: d.cargo + ' · ' + d.depto, date: d.data, days: daysUntil(d.data),
        kind: 'Desligamento'
      });
    });

    // ── Fiscal: impostos próximos do vencimento (aberto, ≤ 15 dias) ──
    data.impostos.forEach((i) => {
      const d = daysUntil(i.venc);
      if (i.status === 'atraso') {
        push({ mod: 'fiscal', sev: 'critico', title: 'Imposto em atraso · ' + i.nome, sub: 'Competência ' + i.competencia, date: i.venc, valor: i.valor, days: d, kind: 'Imposto atrasado' });
      } else if (i.status === 'aberto' && d != null && d <= 15) {
        push({ mod: 'fiscal', sev: d <= 5 ? 'critico' : 'atencao', title: 'Imposto a vencer · ' + i.nome, sub: 'Competência ' + i.competencia, date: i.venc, valor: i.valor, days: d, kind: 'Imposto a vencer' });
      }
    });
    // ── Fiscal: obrigações em atraso / pendentes próximas ──
    data.obrigacoes.forEach((o) => {
      const d = daysUntil(o.entrega);
      if (o.status === 'atraso') {
        push({ mod: 'fiscal', sev: 'critico', title: 'Obrigação em atraso · ' + o.nome, sub: 'Competência ' + o.competencia, date: o.entrega, days: d, kind: 'Obrigação acessória' });
      } else if (o.status === 'pendente' && d != null && d <= 30) {
        push({ mod: 'fiscal', sev: d <= 7 ? 'critico' : 'atencao', title: 'Obrigação pendente · ' + o.nome, sub: 'Competência ' + o.competencia, date: o.entrega, days: d, kind: 'Obrigação acessória' });
      }
    });

    // ── Documental: documentos vencidos / certificados vencendo ──
    data.documentos.forEach((doc) => {
      if (doc.status === 'vencido') {
        push({ mod: 'fiscal', sev: 'critico', title: 'Documento vencido · ' + doc.nome, sub: doc.tipo, date: doc.venc, days: daysUntil(doc.venc), kind: 'Documento vencido' });
      } else if (doc.status === 'vencendo') {
        push({ mod: 'fiscal', sev: (daysUntil(doc.venc) ?? 99) <= 7 ? 'critico' : 'atencao', title: 'Documento vencendo · ' + doc.nome, sub: doc.tipo, date: doc.venc, days: daysUntil(doc.venc), kind: 'Certidão / certificado' });
      }
    });

    // Ordena: críticos primeiro, depois por prazo (mais urgente no topo)
    const sevRank = { critico: 0, atencao: 1 };
    out.sort((a, b) => (sevRank[a.sev] - sevRank[b.sev]) || ((a.days ?? 999) - (b.days ?? 999)));
    return out;
  }

  const SEV = {
    critico: { color: '#ef4444', label: 'Crítico' },
    atencao: { color: '#f59e0b', label: 'Atenção' }
  };

  function PrazoText({ days }) {
    if (days == null) return <span className="muted">—</span>;
    if (days < 0) return <span style={{ color: '#b91c1c', fontWeight: 600 }}>há {Math.abs(days)} {Math.abs(days) === 1 ? 'dia' : 'dias'}</span>;
    if (days === 0) return <span style={{ color: '#b45309', fontWeight: 700 }}>hoje</span>;
    return <span style={{ color: days <= 7 ? '#b45309' : 'var(--text-muted)', fontWeight: days <= 7 ? 600 : 500 }}>em {days} {days === 1 ? 'dia' : 'dias'}</span>;
  }

  function BackofficePendencias() {
    const { setRoute } = useStore();
    const pend = React.useMemo(buildPendencias, []);
    const [modf, setModf] = React.useState('todos');
    const [sevf, setSevf] = React.useState('todas');
    const [query, setQuery] = React.useState('');

    // Indicadores executivos
    const ind = React.useMemo(() => {
      const c = data.contratos;
      const ativos = c.filter((x) => x.status === 'ativo');
      const vencendo = ativos.filter((x) => { const d = daysUntil(x.fim); return d != null && d >= 0 && d <= 90; });
      const assinaturas = c.filter((x) => x.status === 'aguardando' || x.status === 'enviado');
      const impAbertos = data.impostos.filter((i) => i.status === 'aberto' || i.status === 'atraso');
      const obrPend = data.obrigacoes.filter((o) => o.status === 'pendente' || o.status === 'atraso');
      const criticos = pend.filter((p) => p.sev === 'critico').length;
      return {
        contratosAtivos: ativos.length,
        contratosVencendo: vencendo.length,
        assinaturas: assinaturas.length,
        colaboradores: data.colaboradores.length,
        novasContratacoes: data.admissoes.length,
        processos: data.vagas.length,
        impostos: impAbertos.length,
        impostosValor: impAbertos.reduce((s, i) => s + i.valor, 0),
        obrigacoes: obrPend.length,
        receita: data.contabilKpis.receitaTotal,
        despesa: data.contabilKpis.despesaTotal,
        resultado: data.contabilKpis.resultadoOperacional,
        criticos
      };
    }, [pend]);

    const filtered = React.useMemo(() => {
      const q = (query || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return pend.filter((p) => {
        if (modf !== 'todos' && p.mod !== modf) return false;
        if (sevf !== 'todas' && p.sev !== sevf) return false;
        if (q) {
          const hay = (p.title + ' ' + p.sub + ' ' + p.kind).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (!hay.includes(q)) return false;
        }
        return true;
      });
    }, [pend, modf, sevf, query]);

    const countByMod = (m) => pend.filter((p) => m === 'todos' ? true : p.mod === m).length;
    const COLS = '40px minmax(0, 2.2fr) 132px 150px 104px 40px';

    return (
      <Page
        title="Central de Pendências"
        subtitle="Visão executiva consolidada · tudo que exige ação no Backoffice">
        <BoStyles />

        {/* ───── Indicadores executivos ───── */}
        <div className="bo-sec-title" style={{ marginTop: 2 }}><Ic name="activity" size={13} /> Indicadores</div>
        <div className="bo-kpi-grid">
          <BoKpi tone="violet" icon="contracts" label="Contratos ativos" value={ind.contratosAtivos} foot="Vigentes" onClick={() => setRoute('bo-legal')} />
          <BoKpi tone="amber" icon="clock" label="Próx. do vencimento" value={ind.contratosVencendo} foot="≤ 90 dias" onClick={() => setRoute('bo-legal')} />
          <BoKpi tone="orange" icon="edit" label="Assinaturas pendentes" value={ind.assinaturas} foot="Aguardando" onClick={() => setRoute('bo-legal')} />
          <BoKpi tone="blue" icon="users" label="Colaboradores ativos" value={ind.colaboradores} foot="Headcount atual" onClick={() => setRoute('bo-hr')} />
          <BoKpi tone="teal" icon="user" label="Novas contratações" value={ind.novasContratacoes} foot="Em admissão" onClick={() => setRoute('bo-hr')} />
          <BoKpi tone="purple" icon="funnel" label="Processos seletivos" value={ind.processos} foot="Em andamento" onClick={() => setRoute('bo-hr')} />
          <BoKpi tone="orange" icon="file-text" label="Impostos a vencer" value={ind.impostos} foot={fmtBRLcompact(ind.impostosValor)} onClick={() => setRoute('bo-fiscal')} />
          <BoKpi tone="amber" icon="list" label="Obrigações pendentes" value={ind.obrigacoes} foot="Acessórias" onClick={() => setRoute('bo-fiscal')} />
          <BoKpi tone="green" icon="arrow-up-right" label="Receita do período" value={fmtBRLcompact(ind.receita)} foot="Mês corrente" onClick={() => setRoute('bo-accounting')} />
          <BoKpi tone="red" icon="download" label="Despesas do período" value={fmtBRLcompact(ind.despesa)} foot="Mês corrente" onClick={() => setRoute('bo-accounting')} />
          <BoKpi tone="green" icon="coins" label="Resultado operacional" value={fmtBRLcompact(ind.resultado)} foot="EBIT" onClick={() => setRoute('bo-accounting')} />
          <BoKpi tone="red" icon="alert" label="Alertas críticos" value={ind.criticos} foot="Ação imediata" />
        </div>

        {/* ───── Lista inteligente de pendências ───── */}
        <div className="bo-sec-title" style={{ marginTop: 6 }}><Ic name="alert" size={13} /> Pendências · {pend.length} itens</div>

        <div className="bo-toolbar">
          <div className="bo-toolbar-row">
            <BoSearch value={query} onChange={setQuery} placeholder="Pesquisar pendência, contrato, colaborador..." />
            <div style={{ flex: 1 }} />
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {[{ id: 'todas', label: 'Todas', dot: null }, { id: 'critico', label: 'Crítico', dot: SEV.critico.color }, { id: 'atencao', label: 'Atenção', dot: SEV.atencao.color }].map((s) => (
                <BoPill key={s.id} on={sevf === s.id} dot={s.dot} onClick={() => setSevf(s.id)}>{s.label}</BoPill>))}
            </div>
          </div>
          <div className="bo-toolbar-row">
            <span style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700, marginRight: 2 }}>Módulo:</span>
            <BoPill on={modf === 'todos'} onClick={() => setModf('todos')}>Todos <span className="muted" style={{ fontWeight: 700 }}>· {countByMod('todos')}</span></BoPill>
            {Object.values(MODULES).map((m) => (
              <BoPill key={m.id} on={modf === m.id.replace('bo-', '')} dot={m.color} onClick={() => setModf(m.id.replace('bo-', ''))}>
                {m.label} <span className="muted" style={{ fontWeight: 700 }}>· {countByMod(m.id.replace('bo-', ''))}</span>
              </BoPill>))}
            <div style={{ flex: 1 }} />
            <span className="muted" style={{ fontSize: 'var(--type-sm)' }}>{filtered.length} {filtered.length === 1 ? 'pendência' : 'pendências'}</span>
          </div>
        </div>

        <div className="bo-list-card">
          <div className="bo-row bo-row-head" style={{ gridTemplateColumns: COLS }}>
            <div></div>
            <div>Pendência</div>
            <div>Módulo</div>
            <div>Prazo</div>
            <div>Severidade</div>
            <div></div>
          </div>
          <div className="bo-list-body">
            {filtered.length === 0 ? (
              <div className="bo-empty">
                <Ic name="circle-check" size={36} style={{ opacity: .4 }} />
                <div className="bo-empty-title">Nenhuma pendência nesse filtro</div>
                <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>Tudo em dia por aqui.</div>
              </div>
            ) : filtered.map((p, i) => {
              const mod = MODULES[p.mod] || MODULES.legal;
              const sev = SEV[p.sev];
              return (
                <div key={i} className="bo-row bo-row-body" style={{ gridTemplateColumns: COLS, borderLeftColor: sev.color }} onClick={() => setRoute(mod.id)} title={'Ir para ' + mod.label}>
                  <div className="bo-mini-ic" style={{ width: 32, height: 32, background: `color-mix(in oklab, ${mod.color} 14%, white)`, color: mod.color }}>
                    <Ic name={mod.icon} size={16} />
                  </div>
                  <div className="bo-cell">
                    <span className="bo-cell-strong">{p.title}</span>
                    <span className="bo-cell-sub">{p.kind} · {p.sub}{p.valor ? ' · ' + fmtBRLcompact(p.valor) : ''}</span>
                  </div>
                  <div className="bo-cell">
                    <BoChip color={mod.color} label={mod.label} />
                  </div>
                  <div className="bo-cell">
                    <span style={{ fontSize: 'var(--type-sm)' }}><PrazoText days={p.days} /></span>
                    <span className="bo-cell-sub tnum">{fmtDateLong(p.date)}</span>
                  </div>
                  <div className="bo-cell">
                    <BoChip color={sev.color} label={sev.label} solid />
                  </div>
                  <div className="bo-cell bo-cell-act">
                    <span className="btn btn-ghost btn-icon" style={{ width: 28, height: 28, color: 'var(--text-faint)' }}><Ic name="chevron-right" size={16} /></span>
                  </div>
                </div>);
            })}
          </div>
        </div>
      </Page>);
  }

  window.BackofficePendencias = BackofficePendencias;
})();
