// backoffice-legal.jsx — Módulo Jurídico
// Ciclo de vida contratual: dashboard de KPIs, Central de Contratos (lista +
// drawer de detalhes), cadastro/edição de contrato em blocos com seleção de
// cliente (+ cadastro de novo cliente), Renovações e Modelos.

(function () {
  const { fmtBRL, fmtBRLcompact, daysUntil, parseBR, TODAY, EMPRESA, RESPS, TIPOS_CONTRATO, data } = window.BO;

  const EMPRESAS = [EMPRESA, 'Pk360 Franchising LTDA', 'Pk360 Cosméticos LTDA'];
  const PRAZOS_RENOV = ['30 dias', '60 dias', '90 dias', '120 dias'];

  const ST = {
    rascunho:   { color: '#64748b', label: 'Rascunho' },
    negociacao: { color: '#f59e0b', label: 'Em negociação' },
    enviado:    { color: '#3b82f6', label: 'Enviado' },
    aguardando: { color: '#f97316', label: 'Aguard. assinatura' },
    assinado:   { color: '#14b8a6', label: 'Assinado' },
    ativo:      { color: '#10b981', label: 'Ativo' },
    encerrado:  { color: '#94a3b8', label: 'Encerrado' },
    cancelado:  { color: '#ef4444', label: 'Cancelado' }
  };
  const ST_ORDER = ['rascunho', 'negociacao', 'enviado', 'aguardando', 'assinado', 'ativo', 'encerrado', 'cancelado'];
  const SIGN_PROVIDERS = ['Clicksign', 'Autentique', 'DocuSign'];
  const LIFECYCLE = ['Criar', 'Enviar p/ assinatura', 'Acompanhar', 'Assinado', 'Ativo'];

  function StatusChip({ status, solid }) {
    const s = ST[status] || ST.rascunho;
    return <BoChip color={s.color} label={s.label} solid={solid} />;
  }

  // Datas: dd/mm/yyyy <-> yyyy-mm-dd
  const toISO = (d) => { if (!d) return ''; if (d.includes('-')) return d; const p = d.split('/'); return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : ''; };
  const toBR = (d) => { if (!d) return ''; if (d.includes('/')) return d; const p = d.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d; };
  const addMonthsISO = (iso, n) => { const d = new Date(iso); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); };
  function vigenciaMeses(isoA, isoB) {
    const a = new Date(isoA), b = new Date(isoB);
    if (isNaN(a) || isNaN(b) || b < a) return null;
    let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
    if (b.getDate() < a.getDate()) m -= 1;
    return Math.max(0, m);
  }

  // ───────── Campo de formulário ─────────
  function Field({ label, children, hint }) {
    return (
      <div style={{ minWidth: 0 }}>
        <label className="lg-field-label">{label}</label>
        {children}
        {hint && <div style={{ fontSize: 'var(--type-xs)', color: 'var(--text-faint)', marginTop: 4 }}>{hint}</div>}
      </div>);
  }
  function MoneyInput({ value, onChange, disabled }) {
    // Formatação por centavos: digita só números, preenche da direita p/ esquerda,
    // sempre 2 casas decimais e separador de milhar. Ex.: 100023 → 1.000,23
    const display = (value === '' || value == null || isNaN(value)) ? '' : Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const handle = (e) => { const d = e.target.value.replace(/\D+/g, ''); onChange(d ? parseInt(d, 10) / 100 : ''); };
    return (
      <div className="lg-money">
        <span className="lg-money-pre">R$</span>
        <input className="input" type="text" inputMode="numeric" disabled={disabled}
          value={display} onChange={handle} placeholder="0,00" />
      </div>);
  }

  // ───────── Modal: novo cliente ─────────
  function NewClientModal({ onClose, onSave }) {
    const [f, setF] = React.useState({ nome: '', tipo: 'PJ', doc: '', email: '', tel: '' });
    const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
    const valid = f.nome.trim().length >= 2;
    return (
      <Modal title="Cadastrar novo cliente" onClose={onClose} size="sm"
        footer={<><div style={{ flex: 1 }} /><button className="btn fin-btn-back" onClick={onClose}>Voltar</button><button className="btn btn-save" disabled={!valid} style={{ opacity: valid ? 1 : .55 }} onClick={() => { if (valid) onSave(f); }}><Ic name="check" size={13} /> Salvar cliente</button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Nome / Razão social"><input className="input" autoFocus value={f.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Nome do cliente..." /></Field>
          <div className="lg-grid-2">
            <Field label="Tipo">
              <div className="lg-seg" data-on={f.tipo === 'PJ' ? 0 : 1} style={{ width: '100%' }}>
                {['PJ', 'PF'].map((t) => <button key={t} className={f.tipo === t ? 'on' : ''} style={{ flex: 1 }} onClick={() => set('tipo', t)}>{t === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}</button>)}
              </div>
            </Field>
            <Field label={f.tipo === 'PJ' ? 'CNPJ' : 'CPF'}>{f.tipo === 'PJ' ? <CnpjInput value={f.doc} onChange={(v) => set('doc', v)} /> : <CpfInput value={f.doc} onChange={(v) => set('doc', v)} />}</Field>
          </div>
          <div className="lg-grid-2">
            <Field label="E-mail"><EmailInput value={f.email} onChange={(v) => set('email', v)} placeholder="email@cliente.com" /></Field>
            <Field label="Telefone"><PhoneInput value={f.tel} onChange={(v) => set('tel', v)} /></Field>
          </div>
        </div>
      </Modal>);
  }

  // ───────── Drawer: cadastro / edição de contrato ─────────
  function ContractFormDrawer({ entry, clientes, onAddClient, onClose, onSave }) {
    const isEdit = !!entry;
    const [showNewClient, setShowNewClient] = React.useState(false);
    const [f, setF] = React.useState(() => entry ? {
      cliente: entry.cliente, empresa: EMPRESA, resp: entry.resp, tipo: entry.tipo, status: entry.status,
      desc: entry.desc || '', inicio: toISO(entry.inicio), fim: toISO(entry.fim), valor: entry.valor, valorAdesao: entry.valorAdesao || '',
      renovAuto: !!entry.renovAuto, prazoRenov: entry.prazoRenov || '60 dias', obs: entry.obs || ''
    } : {
      cliente: '', empresa: EMPRESA, resp: RESPS[0], tipo: '', status: 'rascunho',
      desc: '', inicio: toISO(TODAY), fim: addMonthsISO(toISO(TODAY), 12), valor: '', valorAdesao: '',
      renovAuto: false, prazoRenov: '60 dias', obs: ''
    });
    const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

    const num = React.useMemo(() => entry ? entry.num : 'CT-2026-' + String(164 + Math.floor(Math.random() * 700)).padStart(4, '0'), [entry]);
    const vig = vigenciaMeses(f.inicio, f.fim);
    const cliObj = clientes.find((c) => c.nome === f.cliente);
    const valid = f.cliente && f.tipo && f.inicio && f.fim && vig != null && Number(f.valor) > 0;

    const handleSave = () => {
      onSave({
        num, cliente: f.cliente, resp: f.resp, tipo: f.tipo, status: f.status,
        inicio: toBR(f.inicio), fim: toBR(f.fim), valor: Number(f.valor),
        valorAdesao: Number(f.valorAdesao) || 0,
        assinatura: entry ? entry.assinatura : null, renovAuto: f.renovAuto, prazoRenov: f.prazoRenov,
        desc: f.desc, obs: f.obs, empresa: f.empresa
      }, isEdit);
    };

    return (
      <Drawer
        title={<span className="row" style={{ gap: 10 }}><span className="fin-drawer-ic" style={{ background: 'color-mix(in oklab, #8b5cf6 16%, white)', color: '#6d28d9' }}><Ic name="contracts" size={16} /></span><span>{isEdit ? 'Editar contrato' : 'Novo contrato'}</span></span>}
        onClose={onClose} width={780}
        rightHead={<div className="fin-drawer-code fin-drawer-code-head"><span style={{ fontWeight: 500 }}>NÚMERO</span><strong className="tnum fin-code-pill">{num}</strong></div>}
        footer={(close) => (<><button className="btn fin-btn-back btn-fixed" onClick={() => close()}><Ic name="arrow-left" size={13} /> Voltar</button><div style={{ flex: 1 }} /><button className="btn btn-save btn-fixed" disabled={!valid} style={{ opacity: valid ? 1 : .55 }} onClick={() => close(handleSave)}><Ic name="check" size={13} /> Salvar</button></>)}>
        <LegalFormStyles />

        {/* Bloco 1 — Cliente */}
        <div className="lg-block">
          <div className="lg-block-hd"><span className="lg-block-ic"><Ic name="user" size={15} /></span><span className="lg-block-title">Cliente</span></div>
          <Field label="Cliente / Parte contratada">
            <div className="row" style={{ gap: 6 }}>
              <select className="input" value={f.cliente} onChange={(e) => set('cliente', e.target.value)} style={{ flex: 1 }}>
                <option value="">Selecione o cliente...</option>
                {clientes.map((c) => <option key={c.nome} value={c.nome}>{c.nome}</option>)}
              </select>
              <button type="button" className="btn lg-cli-add" title="Cadastrar novo cliente" onClick={() => setShowNewClient(true)}><Ic name="plus" size={16} /></button>
            </div>
            {cliObj && <div className="lg-cli-chip"><span className="chip">{cliObj.tipo}</span><span className="tnum">{cliObj.doc}</span>{cliObj.email && <span>· {cliObj.email}</span>}</div>}
          </Field>
          <div className="lg-grid-2" style={{ marginTop: 12 }}>
            <Field label="Empresa contratante">
              <select className="input" value={f.empresa} onChange={(e) => set('empresa', e.target.value)}>
                {EMPRESAS.map((em) => <option key={em} value={em}>{em}</option>)}
              </select>
            </Field>
            <Field label="Responsável interno">
              <select className="input" value={f.resp} onChange={(e) => set('resp', e.target.value)}>
                {RESPS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
          </div>
        </div>

        {/* Bloco 2 — Detalhes do contrato */}
        <div className="lg-block">
          <div className="lg-block-hd"><span className="lg-block-ic"><Ic name="file-text" size={15} /></span><span className="lg-block-title">Detalhes do contrato</span></div>
          <div className="lg-grid-2">
            <Field label="Tipo de contrato">
              <select className="input" value={f.tipo} onChange={(e) => set('tipo', e.target.value)}>
                <option value="">Selecione o tipo...</option>
                {TIPOS_CONTRATO.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className="input" value={f.status} onChange={(e) => set('status', e.target.value)}>
                {ST_ORDER.map((s) => <option key={s} value={s}>{ST[s].label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Descrição / Objeto"><input className="input" value={f.desc} onChange={(e) => set('desc', e.target.value)} placeholder="Objeto do contrato..." /></Field>
        </div>

        {/* Bloco 3 — Condições e vigência */}
        <div className="lg-block">
          <div className="lg-block-hd"><span className="lg-block-ic"><Ic name="calendar" size={15} /></span><span className="lg-block-title">Condições e vigência</span></div>
          <div className="lg-grid-3">
            <Field label="Data de início"><DateField value={f.inicio} onChange={(e) => set('inicio', e.target.value)} /></Field>
            <Field label="Data de término"><DateField value={f.fim} onChange={(e) => set('fim', e.target.value)} /></Field>
            <Field label="Vigência"><input className="input" readOnly value={vig == null ? '—' : vig + (vig === 1 ? ' mês' : ' meses')} style={{ background: 'var(--surface-3)', fontWeight: 600 }} /></Field>
          </div>
          <div className="lg-grid-2" style={{ marginTop: 12 }}>
            <Field label="Valor de adesão" hint="Cobrança única na assinatura"><MoneyInput value={f.valorAdesao} onChange={(v) => set('valorAdesao', v)} /></Field>
            <Field label="Valor mensal" hint="Cobrança recorrente"><MoneyInput value={f.valor} onChange={(v) => set('valor', v)} /></Field>
          </div>
          <div className="lg-grid-2" style={{ marginTop: 12 }}>
            <Field label="Renovação automática">
              <div className="lg-seg" data-on={f.renovAuto ? 0 : 1} style={{ width: '100%' }}>
                <button className={f.renovAuto ? 'on' : ''} style={{ flex: 1 }} onClick={() => set('renovAuto', true)}>Sim</button>
                <button className={!f.renovAuto ? 'on' : ''} style={{ flex: 1 }} onClick={() => set('renovAuto', false)}>Não</button>
              </div>
            </Field>
          </div>
          {f.renovAuto && (
            <div className="lg-grid-2" style={{ marginTop: 12 }}>
              <Field label="Avisar para renovação com" hint="Antecedência do alerta de renovação">
                <select className="input" value={f.prazoRenov} onChange={(e) => set('prazoRenov', e.target.value)}>
                  {PRAZOS_RENOV.map((p) => <option key={p} value={p}>{p} de antecedência</option>)}
                </select>
              </Field>
            </div>)}
        </div>

        {/* Bloco 4 — Observações e anexos */}
        <div className="lg-block" style={{ marginBottom: 4 }}>
          <div className="lg-block-hd"><span className="lg-block-ic"><Ic name="paperclip" size={15} /></span><span className="lg-block-title">Observações e anexos</span></div>
          <Field label="Observações"><textarea className="input" rows={3} value={f.obs} onChange={(e) => set('obs', e.target.value)} placeholder="Observações internas..." /></Field>
          <div className="lg-upload" style={{ marginTop: 12 }}>
            <Ic name="upload" size={20} />
            <div style={{ fontWeight: 600, marginTop: 6, fontSize: 'var(--type-sm)' }}>Anexar documentos</div>
            <div style={{ fontSize: 'var(--type-xs)', color: 'var(--text-faint)', marginTop: 2 }}>PDF, DOC, DOCX, XLS, PNG, JPG</div>
          </div>
        </div>

        {showNewClient && (window.NewClientFicha
          ? React.createElement(window.NewClientFicha, {
              onClose: () => setShowNewClient(false),
              onSave: (c) => { const cli = { nome: c.name, tipo: c.tipo === 'pj' ? 'PJ' : 'PF', doc: c.doc || '', email: c.email || '', tel: c.phone || '' }; onAddClient(cli); set('cliente', cli.nome); setShowNewClient(false); }
            })
          : <NewClientModal onClose={() => setShowNewClient(false)} onSave={(c) => { onAddClient(c); set('cliente', c.nome); setShowNewClient(false); }} />)}
      </Drawer>);
  }

  // ───────── Drawer: detalhes do contrato ─────────
  function ContractDrawer({ contract, onClose, onEdit }) {
    const c = contract;
    const venc = daysUntil(c.fim);
    const stageIdx = { rascunho: 0, negociacao: 0, enviado: 1, aguardando: 2, assinado: 3, ativo: 4, encerrado: 4, cancelado: 1 }[c.status] ?? 0;
    const Row = ({ label, children }) => (<div className="lg-dl-row"><div className="lg-dl-label">{label}</div><div className="lg-dl-val">{children}</div></div>);

    return (
      <Drawer
        title={<span className="row" style={{ gap: 10 }}><span className="fin-drawer-ic" style={{ background: 'color-mix(in oklab, #8b5cf6 16%, white)', color: '#6d28d9' }}><Ic name="contracts" size={16} /></span><span>{c.cliente}</span></span>}
        subtitle={c.num + ' · ' + c.tipo}
        onClose={onClose} width={720}
        rightHead={<StatusChip status={c.status} solid />}
        footer={(close) => (
          <>
            <button className="btn fin-btn-back btn-fixed" onClick={() => close()}><Ic name="arrow-left" size={13} /> Voltar</button>
            <div style={{ flex: 1 }} />
            {(c.status === 'rascunho' || c.status === 'negociacao' || c.status === 'enviado') && <button className="btn btn-edit"><Ic name="send" size={13} /> Enviar p/ assinatura</button>}
            <button className="btn btn-save btn-fixed" onClick={() => close(() => onEdit(c))}><Ic name="edit" size={13} /> Editar</button>
          </>)}>
        <LegalFormStyles />
        <BoSectionTitle>Ciclo de vida</BoSectionTitle>
        <div className="lg-flow">
          {LIFECYCLE.map((step, i) => (
            <div key={step} className={'lg-flow-step ' + (i < stageIdx ? 'done' : i === stageIdx ? 'cur' : '')}>
              <span className="lg-flow-dot">{i < stageIdx ? <Ic name="check" size={13} /> : i + 1}</span>
              <span className="lg-flow-lbl">{step}</span>
            </div>))}
        </div>
        <BoSectionTitle>Dados do contrato</BoSectionTitle>
        <div className="bo-panel" style={{ padding: '4px 18px', marginBottom: 16 }}>
          <Row label="Empresa">{c.empresa || EMPRESA}</Row>
          <Row label="Cliente / Parte">{c.cliente}</Row>
          <Row label="Responsável">{c.resp}</Row>
          <Row label="Tipo de contrato">{c.tipo}</Row>
          <Row label="Vigência"><span className="tnum">{c.inicio}</span> <span className="muted">até</span> <span className="tnum">{c.fim}</span>{c.status === 'ativo' && venc != null && <span className="muted" style={{ marginLeft: 8 }}>· {venc < 0 ? `vencido há ${Math.abs(venc)}d` : `vence em ${venc}d`}</span>}</Row>
          <Row label="Valor contratual"><span className="bo-cell-num" style={{ color: '#6d28d9', fontSize: 'var(--type-md)' }}>{fmtBRL(c.valor)}</span></Row>
          <Row label="Renovação automática">{c.renovAuto ? <BoChip color="#10b981" label={'Ativada' + (c.prazoRenov ? ' · ' + c.prazoRenov : '')} /> : <span className="muted">Manual</span>}</Row>
          <Row label="Data de assinatura">{c.assinatura ? <span className="tnum">{c.assinatura}</span> : <span className="muted">Pendente</span>}</Row>
          {c.desc && <Row label="Objeto">{c.desc}</Row>}
        </div>
        {(c.status === 'aguardando' || c.status === 'enviado' || c.status === 'negociacao' || c.status === 'rascunho') && (
          <>
            <BoSectionTitle>Assinatura digital</BoSectionTitle>
            <div className="lg-prov" style={{ marginBottom: 8 }}>
              {SIGN_PROVIDERS.map((p) => <div key={p} className="lg-prov-btn"><Ic name="edit" size={16} />{p}</div>)}
            </div>
            <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>Envie o contrato para assinatura por uma das integrações.</div>
          </>)}
      </Drawer>);
  }

  // ───────── Aba: Contratos ─────────
  function ContratosTab({ contratos, onOpen, onNew }) {
    const [query, setQuery] = React.useState('');
    const [stf, setStf] = React.useState('todos');
    const kpis = React.useMemo(() => {
      const ativos = contratos.filter((x) => x.status === 'ativo');
      const vencendo = ativos.filter((x) => { const d = daysUntil(x.fim); return d != null && d >= 0 && d <= 90; });
      return {
        ativos: ativos.length, ativosVal: ativos.reduce((s, x) => s + x.valor, 0),
        vencendo: vencendo.length, encerrados: contratos.filter((x) => x.status === 'encerrado').length,
        negociacao: contratos.filter((x) => x.status === 'negociacao').length,
        assinaturas: contratos.filter((x) => x.status === 'aguardando' || x.status === 'enviado').length,
        renovacoes: vencendo.filter((x) => x.renovAuto).length
      };
    }, [contratos]);
    const filtered = React.useMemo(() => {
      const q = (query || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return contratos.filter((c) => {
        if (stf !== 'todos' && c.status !== stf) return false;
        if (q) { const hay = (c.cliente + ' ' + c.num + ' ' + c.tipo + ' ' + c.resp).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); if (!hay.includes(q)) return false; }
        return true;
      });
    }, [contratos, query, stf]);
    const COLS = '150px minmax(0, 2fr) 188px 130px 158px 40px';
    const STATUS_PILLS = [['todos', 'Todos'], ['ativo', 'Ativos'], ['aguardando', 'Aguardando'], ['negociacao', 'Negociação'], ['encerrado', 'Encerrados'], ['cancelado', 'Cancelados']];
    return (
      <>
        <div className="bo-kpi-grid">
          <BoKpi tone="green" icon="circle-check" label="Contratos ativos" value={kpis.ativos} foot={fmtBRLcompact(kpis.ativosVal) + ' em carteira'} />
          <BoKpi tone="amber" icon="clock" label="Vencendo" value={kpis.vencendo} foot="≤ 90 dias" />
          <BoKpi tone="orange" icon="edit" label="Assinaturas pendentes" value={kpis.assinaturas} foot="Aguardando" />
          <BoKpi tone="violet" icon="commercial" label="Em negociação" value={kpis.negociacao} foot="Pipeline" />
          <BoKpi tone="teal" icon="repeat" label="Renovações pendentes" value={kpis.renovacoes} foot="Auto-renov." />
          <BoKpi tone="slate" icon="file" label="Encerrados" value={kpis.encerrados} foot="Histórico" />
        </div>
        <div className="bo-toolbar">
          <div className="bo-toolbar-row">
            <BoSearch value={query} onChange={setQuery} placeholder="Pesquisar contrato, cliente, responsável..." />
            <div style={{ flex: 1 }} />
            <span className="muted" style={{ fontSize: 'var(--type-sm)' }}>{filtered.length} {filtered.length === 1 ? 'contrato' : 'contratos'}</span>
          </div>
          <div className="bo-toolbar-row">
            {STATUS_PILLS.map(([id, label]) => (<BoPill key={id} on={stf === id} dot={id === 'todos' ? null : (ST[id] && ST[id].color)} onClick={() => setStf(id)}>{label}</BoPill>))}
          </div>
        </div>
        <div className="bo-list-card">
          <div className="bo-row bo-row-head" style={{ gridTemplateColumns: COLS }}>
            <div>Nº / Tipo</div><div>Cliente · Responsável</div><div>Vigência</div><div>Valor</div><div>Status</div><div></div>
          </div>
          <div className="bo-list-body">
            {filtered.length === 0 ? (
              <div className="bo-empty">
                <Ic name="contracts" size={36} style={{ opacity: .4 }} />
                <div className="bo-empty-title">Nenhum contrato encontrado</div>
                <button className="btn btn-edit btn-sm" style={{ marginTop: 12 }} onClick={onNew}><Ic name="plus" size={13} /> Novo contrato</button>
              </div>
            ) : filtered.map((c) => {
              const venc = daysUntil(c.fim);
              return (
                <div key={c.num} className="bo-row bo-row-body" style={{ gridTemplateColumns: COLS, borderLeftColor: (ST[c.status] || ST.rascunho).color }} onClick={() => onOpen(c)}>
                  <div className="bo-cell"><span className="bo-cell-num" style={{ fontSize: 'var(--type-sm)' }}>{c.num}</span><span className="bo-cell-sub">{c.tipo}</span></div>
                  <div className="bo-cell"><span className="bo-cell-strong">{c.cliente}</span><span className="bo-cell-sub">{c.resp}</span></div>
                  <div className="bo-cell"><span className="tnum" style={{ fontSize: 'var(--type-sm)' }}>{c.inicio} → {c.fim}</span>{c.status === 'ativo' && venc != null && venc <= 90 && <span className="bo-cell-sub" style={{ color: venc <= 30 ? '#b45309' : 'var(--text-muted)', fontWeight: 600 }}>{venc < 0 ? `vencido` : `vence em ${venc}d`}</span>}</div>
                  <div className="bo-cell"><span className="bo-cell-num">{fmtBRLcompact(c.valor)}</span></div>
                  <div className="bo-cell"><StatusChip status={c.status} /></div>
                  <div className="bo-cell bo-cell-act"><span className="btn btn-ghost btn-icon" style={{ width: 28, height: 28, color: 'var(--text-faint)' }}><Ic name="chevron-right" size={16} /></span></div>
                </div>);
            })}
          </div>
        </div>
      </>);
  }

  // ───────── Aba: Renovações ─────────
  function RenovacoesTab({ contratos, onOpen }) {
    const buckets = React.useMemo(() => {
      const b = { d30: [], d60: [], d90: [], venc: [] };
      contratos.filter((c) => c.status === 'ativo').forEach((c) => {
        const d = daysUntil(c.fim); if (d == null) return;
        if (d < 0) b.venc.push(c); else if (d <= 30) b.d30.push(c); else if (d <= 60) b.d60.push(c); else if (d <= 90) b.d90.push(c);
      });
      return b;
    }, [contratos]);
    const Group = ({ title, color, items, icon }) => (
      <BoPanel title={title} icon={icon} iconColor={color} action={<span className="badge" style={{ background: `color-mix(in oklab,${color} 14%,white)`, color }}>{items.length}</span>}>
        {items.length === 0 ? <div className="muted" style={{ fontSize: 'var(--type-sm)', padding: '6px 0' }}>Nenhum contrato.</div> :
          items.map((c) => { const d = daysUntil(c.fim); return (
            <div key={c.num} className="bo-mini" onClick={() => onOpen(c)} style={{ cursor: 'pointer' }}>
              <span className="bo-mini-ic" style={{ background: `color-mix(in oklab,${color} 13%,white)`, color }}><Ic name="contracts" size={16} /></span>
              <div className="bo-mini-main"><div className="bo-mini-title">{c.cliente}</div><div className="bo-mini-sub">{c.num} · {fmtBRLcompact(c.valor)} · {d < 0 ? `vencido há ${Math.abs(d)}d` : `vence em ${d}d`}</div></div>
              <div className="row" style={{ gap: 6 }}><button className="btn btn-sm btn-edit" onClick={(e) => { e.stopPropagation(); onOpen(c); }}><Ic name="repeat" size={13} /> Renovar</button></div>
            </div>); })}
      </BoPanel>);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="bo-dash-grid"><Group title="Vencendo em 30 dias" color="#ef4444" icon="alert" items={buckets.d30} /><Group title="Vencidos" color="#b91c1c" icon="clock" items={buckets.venc} /></div>
        <div className="bo-dash-grid"><Group title="Vencendo em 60 dias" color="#f59e0b" icon="clock" items={buckets.d60} /><Group title="Vencendo em 90 dias" color="#3b82f6" icon="calendar" items={buckets.d90} /></div>
      </div>);
  }

  // ───────── Aba: Modelos ─────────
  function ModelosTab({ onUse }) {
    return (
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {data.modelosContrato.map((m) => (
          <div key={m.nome} className="bo-panel lg-model">
            <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
              <span className="bo-panel-ic" style={{ background: 'color-mix(in oklab,#8b5cf6 13%,white)', color: '#6d28d9', width: 38, height: 38, borderRadius: 10 }}><Ic name="file-text" size={18} /></span>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, letterSpacing: '-.01em' }}>{m.nome}</div><div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 3 }}>{m.desc}</div></div>
            </div>
            <div className="row" style={{ marginTop: 14, gap: 8 }}><span className="chip"><Ic name="copy" size={12} /> {m.usos} usos</span><div style={{ flex: 1 }} /><button className="btn btn-sm">Duplicar</button><button className="btn btn-sm btn-edit" onClick={() => onUse(m)}><Ic name="plus" size={13} /> Usar</button></div>
          </div>))}
        <div className="card-new-agent" style={{ minHeight: 0, padding: 18 }}><span className="na-icon" style={{ width: 38, height: 38 }}><Ic name="plus" size={18} /></span><div className="na-title" style={{ fontSize: 'var(--type-md)' }}>Novo modelo</div></div>
      </div>);
  }

  function LegalFormStyles() {
    return (
      <style>{`
        .lg-block { background: var(--surface-2); border: 1px solid var(--border); border-radius: 14px; padding: 16px; margin-bottom: 14px; }
        .lg-block-hd { display: flex; align-items: center; gap: 9px; margin-bottom: 13px; }
        .lg-block-ic { width: 28px; height: 28px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; background: color-mix(in oklab,#8b5cf6 14%,white); color: #6d28d9; flex-shrink: 0; }
        .lg-block-title { font-weight: 600; font-size: var(--type-md); letter-spacing: -.01em; }
        .lg-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .lg-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        @media (max-width: 680px) { .lg-grid-2, .lg-grid-3 { grid-template-columns: 1fr; } }
        .lg-field-label { font-size: var(--type-sm); font-weight: 500; color: var(--text-muted); display: block; margin-bottom: 6px; }
        .lg-block .lg-field-label { margin-top: 0; }
        .lg-block > div + div .lg-field-label, .lg-block .lg-grid-2 + .lg-grid-2 { margin-top: 0; }
        .lg-money { position: relative; }
        .lg-money input { padding-left: 38px; font-weight: 700; font-variant-numeric: tabular-nums; }
        .lg-money-pre { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-faint); font-weight: 600; pointer-events: none; }
        .lg-seg { position: relative; display: inline-flex; background: var(--surface-3); border-radius: 9px; padding: 3px; gap: 0; }
        .lg-seg::before { content: ''; position: absolute; top: 3px; bottom: 3px; left: 3px; width: calc(50% - 3px); border-radius: 7px; background: var(--surface); box-shadow: var(--shadow-sm); transform: translateX(0); transition: transform .34s cubic-bezier(.34,1.3,.5,1); z-index: 0; }
        .lg-seg[data-on="1"]::before { transform: translateX(100%); }
        .lg-seg button { position: relative; z-index: 1; border: none; background: none; padding: 7px 16px; border-radius: 7px; font: inherit; font-size: var(--type-sm); font-weight: 600; color: var(--text-muted); cursor: pointer; transition: color .18s; }
        .lg-seg button.on { color: var(--text); }
        .lg-cli-add { width: 36px; height: 36px; flex: 0 0 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center; }
        .lg-cli-chip { margin-top: 9px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; font-size: var(--type-sm); color: var(--text-muted); }
        .lg-upload { border: 1.5px dashed var(--border-strong); border-radius: 10px; padding: 18px; text-align: center; color: var(--text-muted); cursor: pointer; transition: all .15s; }
        .lg-upload:hover { border-color: #8b5cf6; color: #6d28d9; background: color-mix(in oklab,#8b5cf6 5%,white); }
        .lg-block .lg-field-label, .lg-block label.lg-field-label { }
        .lg-block > div > .lg-field-label { }
        .lg-block .lg-grid-2 > div, .lg-block .lg-grid-3 > div { min-width: 0; }
        .lg-block label + .row, .lg-block label + select, .lg-block label + .input { }
        .lg-block > *:not(:first-child) { margin-top: 12px; }
        .lg-block .lg-block-hd { margin-top: 0; }

        .lg-dl-row { display: grid; grid-template-columns: 160px 1fr; gap: 14px; padding: 11px 0; border-bottom: 1px solid var(--border); align-items: center; }
        .lg-dl-row:last-child { border-bottom: 0; }
        .lg-dl-label { font-size: var(--type-sm); color: var(--text-muted); font-weight: 500; }
        .lg-dl-val { font-size: var(--type-base); font-weight: 500; }
        .lg-flow { display: flex; align-items: flex-start; gap: 0; margin: 4px 0 16px; }
        .lg-flow-step { display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1; position: relative; }
        .lg-flow-dot { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--surface-3); color: var(--text-faint); border: 2px solid var(--border); z-index: 1; font-size: 12px; font-weight: 700; }
        .lg-flow-step.done .lg-flow-dot { background: #8b5cf6; border-color: #8b5cf6; color: #fff; }
        .lg-flow-step.cur .lg-flow-dot { background: color-mix(in oklab,#8b5cf6 16%,white); border-color: #8b5cf6; color: #6d28d9; }
        .lg-flow-step::before { content: ''; position: absolute; top: 13px; left: -50%; width: 100%; height: 2px; background: var(--border); }
        .lg-flow-step:first-child::before { display: none; }
        .lg-flow-step.done::before, .lg-flow-step.cur::before { background: #8b5cf6; }
        .lg-flow-lbl { font-size: 10.5px; color: var(--text-muted); text-align: center; line-height: 1.2; max-width: 76px; }
        .lg-flow-step.done .lg-flow-lbl, .lg-flow-step.cur .lg-flow-lbl { color: var(--text); font-weight: 600; }
        .lg-prov { display: flex; gap: 8px; }
        .lg-prov-btn { flex: 1; border: 1px solid var(--border-strong); border-radius: 10px; padding: 10px; display: flex; flex-direction: column; align-items: center; gap: 5px; font-size: var(--type-sm); font-weight: 600; color: var(--text-muted); cursor: pointer; transition: all .12s; background: var(--surface); }
        .lg-prov-btn:hover { border-color: #8b5cf6; color: #6d28d9; background: color-mix(in oklab,#8b5cf6 6%,white); }
        .lg-model { transition: box-shadow .15s, transform .15s, border-color .15s; }
        .lg-model:hover { box-shadow: var(--shadow-md); border-color: var(--border-strong); }
      `}</style>);
  }

  // ───────── Página Jurídico ─────────
  function BackofficeLegal() {
    const [tab, setTab] = React.useState('contratos');
    const [contratos, setContratos] = React.useState(() => data.contratos.slice());
    const [clientes, setClientes] = React.useState(() => data.clientes.slice());
    const [detail, setDetail] = React.useState(null);   // contrato em visualização
    const [form, setForm] = React.useState(null);        // { entry } cadastro/edição; entry=null => novo

    const addClient = (c) => setClientes((prev) => prev.some((x) => x.nome === c.nome) ? prev : [c, ...prev]);
    const saveContract = (c, isEdit) => {
      setContratos((prev) => isEdit ? prev.map((x) => x.num === c.num ? { ...x, ...c } : x) : [c, ...prev]);
      setForm(null);
    };

    return (
      <Page title="Jurídico" subtitle="Gestão do ciclo de vida contratual"
        actions={<BoNewBtn label="Novo contrato" onClick={() => setForm({ entry: null })} />}>
        <BoStyles />
        <div className="tabs" style={{ marginTop: -4 }}>
          {[['contratos', 'Central de Contratos'], ['renovacoes', 'Renovações'], ['modelos', 'Modelos']].map(([id, label]) => (
            <div key={id} className={'tab' + (tab === id ? ' active' : '')} onClick={() => setTab(id)}>{label}</div>))}
        </div>

        {tab === 'contratos' && <ContratosTab contratos={contratos} onOpen={setDetail} onNew={() => setForm({ entry: null })} />}
        {tab === 'renovacoes' && <RenovacoesTab contratos={contratos} onOpen={setDetail} />}
        {tab === 'modelos' && <ModelosTab onUse={(m) => setForm({ entry: null, tipo: m.nome })} />}

        {detail && <ContractDrawer contract={detail} onClose={() => setDetail(null)} onEdit={(c) => { setDetail(null); setForm({ entry: c }); }} />}
        {form && <ContractFormDrawer entry={form.entry} clientes={clientes} onAddClient={addClient} onClose={() => setForm(null)} onSave={saveContract} />}
      </Page>);
  }

  window.BackofficeLegal = BackofficeLegal;
})();
