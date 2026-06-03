// backoffice-accounting.jsx — Módulo Contábil
// Resultados financeiros e contábeis: DRE, Plano de Contas e Fluxo de Caixa.

(function () {
  const { fmtBRL, fmtBRLcompact, data, TONES } = window.BO;

  // ───────── Aba: DRE ─────────
  function DRETab() {
    return (
      <div className="bo-dash-grid" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <BoPanel title="Demonstrativo de Resultado do Exercício" icon="reports" iconColor="#10b981" action={<button className="btn btn-sm"><Ic name="download" size={13} /> Exportar</button>}>
          <div style={{ margin: '0 -4px' }}>
            {data.dre.map((l, i) => {
              const isBase = l.tipo === 'base' || l.tipo === 'resultado';
              const isResult = l.tipo === 'resultado';
              const neg = l.valor < 0;
              return (
                <div key={i} className="acc-dre-row" style={{
                  borderTop: isBase ? '1.5px solid var(--border-strong)' : '1px solid var(--border)',
                  background: isResult ? 'color-mix(in oklab,#10b981 8%,transparent)' : 'transparent',
                  fontWeight: l.bold ? 700 : 500
                }}>
                  <span style={{ color: isResult ? '#047857' : 'var(--text)' }}>{l.label}</span>
                  <span className="tnum" style={{ color: isResult ? '#047857' : neg ? '#b91c1c' : 'var(--text)', fontWeight: l.bold ? 700 : 600 }}>
                    {neg ? '−' : ''}{fmtBRL(Math.abs(l.valor)).replace('R$ ', 'R$ ')}
                  </span>
                </div>);
            })}
          </div>
        </BoPanel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <BoPanel title="Margens" icon="activity" iconColor="#10b981">
            {[['Margem bruta', 69.1, '#10b981'], ['Margem operacional', 38.2, '#3b82f6'], ['Margem líquida', 32.7, '#8b5cf6']].map(([label, v, c]) => (
              <div key={label} style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 7 }}>
                  <span style={{ fontSize: 'var(--type-sm)', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
                  <span className="bo-cell-num" style={{ color: c }}>{String(v).replace('.', ',')}%</span>
                </div>
                <div className="bo-track"><div style={{ width: v + '%', background: c }} /></div>
              </div>))}
          </BoPanel>
          <BoPanel title="Resumo do período" icon="coins" iconColor="#10b981">
            {[['Receita líquida', data.contabilKpis.receitaTotal, '#047857'], ['Despesas totais', -data.contabilKpis.despesaTotal, '#b91c1c'], ['Resultado operacional', data.contabilKpis.resultadoOperacional, '#1d4ed8'], ['Lucro líquido', data.contabilKpis.lucroLiquido, '#6d28d9']].map(([l, v, c]) => (
              <div key={l} className="bo-mini">
                <div className="bo-mini-main"><div className="bo-mini-title" style={{ fontWeight: 500, color: 'var(--text-muted)' }}>{l}</div></div>
                <span className="bo-cell-num" style={{ color: c }}>{v < 0 ? '−' : ''}{fmtBRLcompact(Math.abs(v))}</span>
              </div>))}
          </BoPanel>
        </div>
      </div>);
  }

  // ───────── Aba: Plano de Contas ─────────
  function PlanoTab() {
    const max = Math.max(...data.planoContas.map((g) => g.total));
    return (
      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        {data.planoContas.map((g) => {
          const t = TONES[g.tone] || TONES.slate;
          return (
            <BoPanel key={g.grupo} title={g.grupo} icon={g.tone === 'green' ? 'arrow-up-right' : g.tone === 'red' ? 'download' : g.tone === 'amber' ? 'package' : 'cube'} iconColor={t.bar}
              action={<span className="bo-cell-num" style={{ color: t.fg }}>{fmtBRLcompact(g.total)}</span>}>
              {g.contas.map((cc) => (
                <div key={cc.nome} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 'var(--type-sm)' }}>{cc.nome}</span>
                    <span className="tnum" style={{ fontWeight: 600, fontSize: 'var(--type-sm)' }}>{fmtBRLcompact(cc.valor)}</span>
                  </div>
                  <div className="bo-track" style={{ height: 6 }}><div style={{ width: (cc.valor / g.total * 100) + '%', background: t.bar }} /></div>
                </div>))}
            </BoPanel>);
        })}
      </div>);
  }

  // ───────── Aba: Fluxo de Caixa ─────────
  function FluxoTab() {
    const [view, setView] = React.useState('mensal');
    const maxV = Math.max(...data.fluxo.flatMap((f) => [f.entrada, f.saida]));
    const totEnt = data.fluxo.reduce((s, f) => s + f.entrada, 0);
    const totSai = data.fluxo.reduce((s, f) => s + f.saida, 0);
    return (
      <BoPanel title="Fluxo de Caixa" icon="activity" iconColor="#10b981"
        action={<div className="row" style={{ gap: 6 }}>{['diario', 'semanal', 'mensal', 'anual'].map((v) => (<BoPill key={v} on={view === v} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</BoPill>))}</div>}>
        <div className="row" style={{ gap: 22, marginBottom: 10 }}>
          <div><div className="bo-cell-sub">Entradas</div><div className="bo-cell-num" style={{ fontSize: 'var(--type-lg)', color: '#047857' }}>{fmtBRLcompact(totEnt)}</div></div>
          <div><div className="bo-cell-sub">Saídas</div><div className="bo-cell-num" style={{ fontSize: 'var(--type-lg)', color: '#b91c1c' }}>{fmtBRLcompact(totSai)}</div></div>
          <div><div className="bo-cell-sub">Saldo</div><div className="bo-cell-num" style={{ fontSize: 'var(--type-lg)', color: '#1d4ed8' }}>{fmtBRLcompact(totEnt - totSai)}</div></div>
          <div style={{ flex: 1 }} />
          <div className="row" style={{ gap: 14 }}>
            <span className="bo-legend"><span className="bo-legend-dot" style={{ background: '#10b981' }} /><span className="muted" style={{ fontSize: 'var(--type-sm)' }}>Entradas</span></span>
            <span className="bo-legend"><span className="bo-legend-dot" style={{ background: '#ef4444' }} /><span className="muted" style={{ fontSize: 'var(--type-sm)' }}>Saídas</span></span>
          </div>
        </div>
        <div className="bo-bars">
          {data.fluxo.map((f) => (
            <div key={f.mes} className="bo-bar-col">
              <div className="bo-bar-pair">
                <div className="bo-bar" style={{ height: (f.entrada / maxV * 100) + '%', background: '#10b981' }} title={'Entradas ' + fmtBRL(f.entrada)} />
                <div className="bo-bar" style={{ height: (f.saida / maxV * 100) + '%', background: '#ef4444' }} title={'Saídas ' + fmtBRL(f.saida)} />
              </div>
              <span className="bo-bar-lbl">{f.mes}</span>
            </div>))}
        </div>
      </BoPanel>);
  }

  function BackofficeAccounting() {
    const [tab, setTab] = React.useState('dre');
    const k = data.contabilKpis;
    return (
      <Page title="Contábil" subtitle="Resultados financeiros e contábeis da organização"
        actions={<button className="btn"><Ic name="download" size={14} /> Balancete</button>}>
        <BoStyles />
        <style>{`.acc-dre-row { display: flex; align-items: center; justify-content: space-between; padding: 11px 4px; font-size: var(--type-base); }`}</style>
        <div className="bo-kpi-grid">
          <BoKpi tone="green" icon="arrow-up-right" label="Receita total" value={fmtBRLcompact(k.receitaTotal)} foot="Receita líquida" />
          <BoKpi tone="red" icon="download" label="Despesas totais" value={fmtBRLcompact(k.despesaTotal)} foot="No período" />
          <BoKpi tone="violet" icon="coins" label="Lucro líquido" value={fmtBRLcompact(k.lucroLiquido)} foot="Do exercício" />
          <BoKpi tone="blue" icon="activity" label="Fluxo de caixa" value={fmtBRLcompact(k.fluxoCaixa)} foot="Saldo do mês" />
          <BoKpi tone="teal" icon="reports" label="Resultado operacional" value={fmtBRLcompact(k.resultadoOperacional)} foot="EBIT" />
          <BoKpi tone="amber" icon="star" label="Margem de lucro" value={String(k.margem).replace('.', ',') + '%'} foot="Líquida" />
        </div>
        <div className="tabs">
          {[['dre', 'DRE'], ['plano', 'Plano de Contas'], ['fluxo', 'Fluxo de Caixa']].map(([id, label]) => (
            <div key={id} className={'tab' + (tab === id ? ' active' : '')} onClick={() => setTab(id)}>{label}</div>))}
        </div>
        {tab === 'dre' && <DRETab />}
        {tab === 'plano' && <PlanoTab />}
        {tab === 'fluxo' && <FluxoTab />}
      </Page>);
  }

  window.BackofficeAccounting = BackofficeAccounting;
})();
