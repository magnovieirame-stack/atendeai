// accounts.jsx — Contas (módulo financeiro)
// Lista de contas bancárias / gerenciais com cards e drawer de cadastro.

(function () {
  // ---------- Catálogos ----------
  const BANCOS = [
  { code: '001', name: 'Banco do Brasil' },
  { code: '033', name: 'Santander' },
  { code: '104', name: 'Caixa Econômica Federal' },
  { code: '237', name: 'Bradesco' },
  { code: '341', name: 'Itaú Unibanco' },
  { code: '260', name: 'Nubank' },
  { code: '077', name: 'Inter' },
  { code: '212', name: 'Banco Original' },
  { code: '380', name: 'PicPay' },
  { code: '323', name: 'Mercado Pago' },
  { code: '000', name: 'Caixa / Carteira' }];


  const TIPOS_CONTA = [
  'Corrente', 'Poupança', 'Pagamento', 'Investimento', 'Salário', 'Caixa / Carteira'];


  const NATUREZAS = [
  { id: 'gerencial', label: 'GERENCIAL' },
  { id: 'capital', label: 'CAPITAL DE GIRO' },
  { id: 'reserva', label: 'RESERVA' },
  { id: 'investimento', label: 'INVESTIMENTO' },
  { id: 'caixa', label: 'CAIXA' }];


  const COR_BORDA = [
  '#ec4899', '#f43f5e', '#f97316', '#facc15',
  '#22c55e', '#14b8a6', '#0ea5e9', '#3b82f6',
  '#a855f7', '#7c3aed'];


  // ---------- Mock inicial ----------
  const SEED = [
  { id: 'a1', descricao: 'Itaú PJ Operacional', banco: '341', agencia: '4521-0', conta: '34568-1', tipo: 'Corrente', pessoa: 'Jurídica', operacao: '', saldo: 38420.55, natureza: 'gerencial', cor: '#22c55e', obs: '' }];


  // ---------- Helpers ----------
  function fmtBRL(v) {
    return (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function bankName(code) {
    return BANCOS.find((b) => b.code === code)?.name || '—';
  }
  function bankShort(code) {
    const n = bankName(code);
    return n.length > 22 ? n.slice(0, 22) + '…' : n;
  }
  function totalSaldo(arr) {
    return arr.reduce((s, a) => s + (Number(a.saldo) || 0), 0);
  }

  // ---------- Page ----------
  function AccountsPage() {
    const [items, setItems] = React.useState([]);
    const [hidden, setHidden] = React.useState({}); // saldo oculto por conta (carregado do banco)
    const contaToUi = (c) => ({ id: c.id, descricao: c.descricao, banco: c.banco, agencia: c.agencia, conta: c.conta, tipo: c.tipoConta || 'Corrente', pessoa: c.fisicaJuridica || 'Jurídica', operacao: '', saldo: c.saldo, natureza: c.gerencial ? 'gerencial' : 'capital', cor: c.cor || '#22c55e', obs: c.observacoes || '', gerencialDefault: !!c.gerencialDefault, saldoOculto: !!c.saldoOculto });
    const loadContas = React.useCallback(() => API.getContas().then((r) => {
      const ui = (r.contas || []).map(contaToUi);
      setItems(ui);
      setHidden(Object.fromEntries(ui.map((c) => [c.id, !!c.saldoOculto])));
    }).catch(() => {}), []);
    React.useEffect(() => { loadContas(); }, [loadContas]);
    // Usuário atual — usado como "Responsável" (travado) nas movimentações.
    const [userName, setUserName] = React.useState('');
    React.useEffect(() => { API.me().then((r) => setUserName((r.user && (r.user.name || r.user.email)) || '')).catch(() => {}); }, []);
    const [showNew, setShowNew] = React.useState(false);
    const [editItem, setEditItem] = React.useState(null);
    const [confirmDel, setConfirmDel] = React.useState(null);
    const [moveModal, setMoveModal] = React.useState(null); // {kind:'aporte'|'retirada'|'transferir', account}
    const [statementAcc, setStatementAcc] = React.useState(null); // movimento drawer
    // Categorias de movimentação (4 padrão; usuário pode criar novas via "+").
    const [categories, setCategories] = React.useState([
      { id: 'cat-aporte',   nome: 'Aporte de Sócio',      tipo: 'Financeira' },
      { id: 'cat-receita',  nome: 'Receita Operacional',  tipo: 'Financeira' },
      { id: 'cat-produto',  nome: 'Venda de Produto',     tipo: 'Produto' },
      { id: 'cat-cliente',  nome: 'Pagamento de Cliente', tipo: 'Cliente' },
    ]);
    React.useEffect(() => { API.getFinCategorias().then((r) => { if (r.categorias && r.categorias.length) setCategories(r.categorias); }).catch(() => {}); }, []);
    // Cria a categoria persistindo no backend; cai para local se a API/migration ainda não estiver pronta.
    const addCategory = async ({ nome, tipo }) => {
      try {
        const r = await API.createFinCategoria({ nome, tipo });
        setCategories((prev) => [...prev, r.categoria]);
        return r.categoria;
      } catch (e) {
        const cat = { id: 'cat-' + Math.random().toString(36).slice(2, 9), nome, tipo };
        setCategories((prev) => [...prev, cat]);
        return cat;
      }
    };

    const filtered = items;

    const toggleHide = (id) => {
      const next = !hidden[id];
      setHidden((p) => ({ ...p, [id]: next }));
      API.setContaVisibilidade(id, next).catch(() => {}); // persiste no banco (ignora se a coluna ainda não existir)
    };

    const toDto = (d) => ({
      descricao: d.descricao,
      banco: bankName(d.banco) !== '—' ? bankName(d.banco) : (d.banco || ''),
      numero: d.conta || '',
      saldoInicial: Number(d.saldoInicial != null ? d.saldoInicial : d.saldo) || 0,
      cor: d.cor || '#22c55e',
      tipoConta: d.tipo || '',
      fisicaJuridica: d.pessoa || '',
      agencia: d.agencia || '',
      conta: d.conta || '',
      gerencial: d.natureza === 'gerencial',
      observacoes: d.obs || '',
    });
    const handleSave = async (data) => {
      try {
        if (editItem && editItem.id) await API.updateConta(editItem.id, toDto(data));
        else await API.createConta(toDto(data));
        await loadContas();
      } catch (e) {}
      setShowNew(false); setEditItem(null);
    };

    // Aporte/Retirada => lançamento (entrada/saída) pago na conta. Transferência => endpoint próprio.
    // Lança erro em falha (a aba lateral exibe a mensagem e permanece aberta).
    const handleMovement = async ({ kind, account, amount, destId, dataRegistro, categoria, descricao }) => {
      const n = Number(amount) || 0;
      if (!n) return;
      if (kind === 'transferir') {
        await API.transferir({ origemId: account.id, destId, valor: n, data: dataRegistro, descricao });
      } else {
        await API.createEntrada({
          tipo: kind === 'aporte' ? 'entrada' : 'saida',
          valor: n, contaId: account.id, descricao,
          categoria: categoria ? categoria.nome : '',
          responsavel: userName, pago: true,
          emissao: dataRegistro, vencimento: dataRegistro, competencia: dataRegistro,
        });
      }
      await loadContas();
    };

    // Encerramento: backend valida a regra de saldo (transfere se necessário) e remove a conta.
    const handleEncerrar = async ({ account, dataRegistro, destId, motivo }) => {
      await API.encerrarConta(account.id, { destId: destId || null, data: dataRegistro, motivo });
      await loadContas();
      setConfirmDel(null);
    };

    const sum = totalSaldo(filtered);

    return (
      <Page
        title="Contas"
        subtitle="Suas contas bancárias, caixas e reservas">
        <AccountsStyles />

        {/* Grid de cartões */}
        <div className="acc-grid">
          {filtered.map((it) => {
            const isHidden = hidden[it.id];
            return (
              <div key={it.id} className="acc-card" style={{ '--acc-color': it.cor }}>
                {/* Header (white) */}
                <div className="acc-card-head">
                  <div className="acc-card-bank">
                    <span className="acc-card-bank-ic"><Ic name="bank" size={20} /></span>
                    <div className="acc-card-bank-text">
                      <div className="acc-card-bank-title">
                        <span className="tnum" style={{ fontWeight: 700, color: 'var(--text)' }}>{it.banco}</span>
                      </div>
                      <div className="acc-card-bank-sub">
                        <span>AG: <strong className="tnum">{it.agencia || '—'}</strong></span>
                        <span>N°: <strong className="tnum">{it.conta || '—'}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Body (dark) */}
                <div className="acc-card-body">
                  <div className="acc-balance">
                    <div className="acc-balance-row">
                      <span className="acc-balance-label">SALDO EM CONTA</span>
                      <button className="acc-eye" onClick={() => toggleHide(it.id)} title={isHidden ? 'Mostrar saldo' : 'Ocultar saldo'}>
                        <Ic name={isHidden ? 'eye-off' : 'eye-on'} size={26} />
                      </button>
                    </div>
                    <div className="acc-balance-value">
                      <span className="acc-balance-rs">R$</span>
                      {isHidden ? <span className="acc-balance-hidden">••••••</span> : <span className="tnum">{fmtBRL(it.saldo)}</span>}
                    </div>
                  </div>

                  <div className="acc-actions-grid">
                    <AccAction icon="arrow-down-to-line" label="APORTE" onClick={() => setMoveModal({ kind: 'aporte', account: it })} />
                    <AccAction icon="arrow-up-from-line" label="RETIRADA" onClick={() => setMoveModal({ kind: 'retirada', account: it })} />
                    <AccAction icon="arrows-h" label="TRANSFERIR" onClick={() => setMoveModal({ kind: 'transferir', account: it })} />
                    <AccAction icon="repeat" label="MOVIMENTO" onClick={() => setStatementAcc(it)} />
                    <AccAction icon="edit" label="EDITOR" onClick={() => {setEditItem(it);setShowNew(true);}} />
                    <AccAction icon="trash" label="ENCERRAR" danger disabled={it.gerencialDefault} tip={it.gerencialDefault ? 'A conta GERENCIAL é a conta padrão do sistema e não pode ser encerrada — por ela passa todo o fluxo de entradas e saídas.' : undefined} onClick={() => setConfirmDel(it)} />
                  </div>

                  <div className="acc-nature" style={{ color: it.cor, fontSize: "20px", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={it.descricao}>
                    {(it.descricao || '').toUpperCase()}
                  </div>
                </div>
              </div>);

          })}

          {/* "Add" tile */}
          <button className="acc-card acc-card-add" onClick={() => {setEditItem(null);setShowNew(true);}}>
            <div className="acc-card-add-circle">
              <Ic name="plus" size={28} />
            </div>
            <div className="acc-card-add-title">Cadastrar conta</div>
            <div className="acc-card-add-sub">Adicione uma conta bancária, caixa ou reserva</div>
          </button>

          {filtered.length === 0 &&
          <div style={{ gridColumn: '1 / -1', padding: 60, textAlign: 'center', color: 'var(--text-faint)' }}>
              <Ic name="bank" size={36} style={{ opacity: .35 }} />
              <div style={{ marginTop: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                Nenhuma conta encontrada
              </div>
            </div>
          }
        </div>

        {showNew &&
        <AccountDrawer
          entry={editItem}
          onClose={() => {setShowNew(false);setEditItem(null);}}
          onSave={handleSave} />

        }

        {confirmDel &&
        <CloseAccountDrawer
          account={confirmDel}
          accounts={items}
          userName={userName}
          onClose={() => setConfirmDel(null)}
          onConfirm={handleEncerrar} />

        }

        {moveModal &&
        <MovementDrawer
          data={moveModal}
          accounts={items}
          categories={categories}
          addCategory={addCategory}
          userName={userName}
          onClose={() => setMoveModal(null)}
          onConfirm={handleMovement} />

        }

        {statementAcc &&
        <StatementDrawer
          account={statementAcc}
          onClose={() => setStatementAcc(null)} />

        }
      </Page>);

  }

  function AccAction({ icon, label, onClick, danger, disabled, tip, title }) {
    const ref = React.useRef(null);
    const [tipPos, setTipPos] = React.useState(null);
    // Tooltip via position:fixed (escapa do overflow:hidden do cartão). Não usamos o atributo
    // 'disabled' para que o hover e o balão continuem disparando — a função é bloqueada no onClick.
    const onEnter = () => { if (tip && ref.current) { const r = ref.current.getBoundingClientRect(); setTipPos({ left: r.left + r.width / 2, top: r.top - 8 }); } };
    return (
      <button ref={ref}
        className={'acc-action' + (danger && !disabled ? ' is-danger' : '') + (disabled ? ' is-disabled' : '')}
        onClick={disabled ? undefined : onClick}
        aria-disabled={disabled || undefined}
        title={tip ? undefined : title}
        onMouseEnter={onEnter}
        onMouseLeave={() => setTipPos(null)}
        style={{ height: "80px", width: "100%", borderRadius: "8px", opacity: disabled ? .45 : 1, cursor: disabled ? 'not-allowed' : undefined }}>
        <span className="acc-action-ic"><Ic name={icon} size={18} /></span>
        <span className="acc-action-label" style={{ fontFamily: "Poppins", fontWeight: "500" }}>{label}</span>
        {tip && tipPos && <span className="acc-action-tip" style={{ position: 'fixed', left: tipPos.left, top: tipPos.top }}>{tip}</span>}
      </button>);

  }

  // ---------- Drawer de cadastro ----------
  function AccountDrawer({ entry, onClose, onSave }) {
    const today = new Date();
    const todayISO = today.toISOString().slice(0, 10);
    const [f, setF] = React.useState(() => entry || {
      descricao: '', saldoInicial: 0, dataSaldo: todayISO,
      banco: '', agencia: '', conta: '',
      tipo: 'Corrente', pessoa: 'Jurídica', operacao: '',
      natureza: 'gerencial', cor: COR_BORDA[4], obs: ''
    });
    const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
    const isEdit = !!entry;

    // Todos os campos são obrigatórios, exceto Observação e Operação.
    // Saldo Inicial não bloqueia: se vazio, salva ZERO.
    const valid = f.descricao.trim().length >= 2 &&
      String(f.banco).trim() !== '' &&
      String(f.agencia).trim() !== '' &&
      String(f.conta).trim() !== '' &&
      String(f.dataSaldo).trim() !== '' &&
      String(f.tipo).trim() !== '' &&
      String(f.pessoa).trim() !== '' &&
      String(f.natureza).trim() !== '';

    const handleSave = () => {
      onSave({
        descricao: f.descricao.trim(),
        banco: f.banco || '000',
        agencia: f.agencia, conta: f.conta,
        tipo: f.tipo, pessoa: f.pessoa, operacao: f.operacao,
        saldo: isEdit ? entry.saldo : Number(f.saldoInicial) || 0,
        saldoInicial: Number(f.saldoInicial) || 0,
        dataSaldo: f.dataSaldo,
        natureza: f.natureza,
        cor: f.cor,
        obs: f.obs
      });
    };

    return (
      <Drawer
        title={
        <span className="row" style={{ gap: 10 }}>
            <span className="fin-drawer-ic"><Ic name="building" size={16} /></span>
            <span>{isEdit ? 'EDITAR CONTA' : 'CADASTRAR CONTA'}</span>
          </span>
        }
        onClose={onClose}
        width={820}
        footer={(close) => <>
          <div style={{ flex: 1 }} />
          <button className="btn fin-btn-back" onClick={() => close()}>Voltar</button>
          <button className="btn btn-save" disabled={!valid} style={{ opacity: valid ? 1 : .55 }} onClick={() => close(handleSave)}>
            <Ic name="check" size={13} /> Salvar
          </button>
        </>}>

        <div className="fin-section-title">IDENTIFICAÇÃO</div>
        <div className="fin-section">
          <div className="acc-grid-3">
            <IconField label="DESCRIÇÃO DA CONTA *" icon="file-text" full>
              <input className="input" value={f.descricao} onChange={(e) => set('descricao', e.target.value)} placeholder="Ex.: Itaú PJ Operacional" />
            </IconField>
            <IconField label="SALDO INICIAL" icon="dollar">
              <MoneyInput value={f.saldoInicial} onChange={(v) => set('saldoInicial', v)} disabled={isEdit} />
            </IconField>
            <IconField label="DATA DO SALDO *" icon="calendar">
              <DateField value={f.dataSaldo} onChange={(e) => set('dataSaldo', e.target.value)} />
            </IconField>
            <IconField label="NATUREZA *" icon="reports">
              <select className="input" value={f.natureza} onChange={(e) => set('natureza', e.target.value)}>
                {NATUREZAS.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
              </select>
            </IconField>
          </div>
        </div>

        <div className="fin-section-title">INFORMAÇÕES BANCÁRIAS</div>
        <div className="fin-section">
          <div className="acc-grid-3">
            <IconField label="BANCO *" icon="bank">
              <select className="input" value={f.banco} onChange={(e) => set('banco', e.target.value)}>
                <option value="">Selecione…</option>
                {BANCOS.map((b) => <option key={b.code} value={b.code}>{b.code} — {b.name}</option>)}
              </select>
            </IconField>
            <IconField label="AGÊNCIA-DÍGITO *" icon="building">
              <input className="input tnum" value={f.agencia} onChange={(e) => set('agencia', e.target.value)} placeholder="0000-0" />
            </IconField>
            <IconField label="CONTA-DÍGITO *" icon="wallet">
              <input className="input tnum" value={f.conta} onChange={(e) => set('conta', e.target.value)} placeholder="00000-0" />
            </IconField>
            <IconField label="TIPO DE CONTA *" icon="list">
              <select className="input" value={f.tipo} onChange={(e) => set('tipo', e.target.value)}>
                {TIPOS_CONTA.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </IconField>
            <IconField label="FÍSICA OU JURÍDICA *" icon="users">
              <select className="input" value={f.pessoa} onChange={(e) => set('pessoa', e.target.value)}>
                <option value="Jurídica">Jurídica</option>
                <option value="Física">Física</option>
              </select>
            </IconField>
            <IconField label="OPERAÇÃO (CEF)" icon="hash">
              <input className="input tnum" value={f.operacao} onChange={(e) => set('operacao', e.target.value)} placeholder="001 / 013 / 023..." />
            </IconField>
          </div>
        </div>

        <div className="fin-section-title">COR DA BORDA</div>
        <div className="fin-section" style={{ padding: 14 }}>
          <div className="acc-color-row">
            {COR_BORDA.map((c) =>
            <button key={c} type="button"
            className={'acc-color-dot' + (f.cor === c ? ' on' : '')}
            style={{ '--c': c }}
            onClick={() => set('cor', c)}
            aria-label={c}>
              
                {f.cor === c && <Ic name="check" size={14} />}
              </button>
            )}
          </div>
        </div>

        <div className="fin-section-title">OBSERVAÇÕES</div>
        <div className="fin-section">
          <textarea className="input" rows={3} value={f.obs} onChange={(e) => set('obs', e.target.value)} placeholder="Observações..." />
        </div>
      </Drawer>);

  }

  function IconField({ label, icon, children, full }) {
    return (
      <div className="acc-field" style={{ gridColumn: full ? '1 / -1' : undefined }}>
        <label className="label">{label}</label>
        <div className="acc-field-wrap">
          <span className="acc-field-ic"><Ic name={icon} size={14} /></span>
          <div className="acc-field-input">{children}</div>
        </div>
      </div>);

  }

  function MoneyInput({ value, onChange, disabled }) {
    const display = (Number(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (
      <input
        type="text"
        inputMode="decimal"
        className="input tnum"
        disabled={disabled}
        value={display}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '');
          const n = digits ? Number(digits) / 100 : 0;
          onChange(n);
        }} />);


  }

  // ---------- Seletor de categoria (grupo suspenso + criar nova) ----------
  const TIPO_CORES = { Financeira: '#3b82f6', Produto: '#f59e0b', Cliente: '#10b981' };
  function CategoryField({ value, categories, onPick, onNew }) {
    const [open, setOpen] = React.useState(false);
    return (
      <div style={{ position: 'relative' }}>
        <button type="button" className="input" onClick={() => setOpen((o) => !o)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%', cursor: 'pointer', textAlign: 'left' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0, color: value ? 'var(--text)' : 'var(--text-faint)' }}>
            {value && <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: TIPO_CORES[value.tipo] || '#64748b' }} />}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value ? value.nome : 'Selecione uma categoria…'}</span>
          </span>
          <Ic name="chevron-down" size={14} style={{ flexShrink: 0, color: 'var(--text-faint)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
        </button>
        {open && <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 60 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 61, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', padding: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: 8 }}>Categorias</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {categories.map((cat) => {
                const on = value && value.id === cat.id;
                const c = TIPO_CORES[cat.tipo] || '#64748b';
                return (
                  <button key={cat.id} type="button" onClick={() => { onPick(cat); setOpen(false); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--type-sm)', fontWeight: 500,
                    border: '1px solid ' + (on ? c : 'var(--border-strong)'),
                    background: on ? 'color-mix(in oklab, ' + c + ' 12%, var(--surface))' : 'var(--surface)',
                    color: on ? c : 'var(--text)' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />
                    {cat.nome}
                  </button>);
              })}
              <button type="button" onClick={() => { setOpen(false); onNew(); }} title="Criar nova categoria"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--type-sm)', fontWeight: 600,
                border: '1px dashed var(--border-strong)', background: 'transparent', color: 'var(--accent)' }}>
                <Ic name="plus" size={13} /> Nova
              </button>
            </div>
          </div>
        </>}
      </div>);
  }

  // ---------- Popup: nova categoria ----------
  function NewCategoryModal({ onClose, onCreate }) {
    const [nome, setNome] = React.useState('');
    const [tipo, setTipo] = React.useState('Financeira');
    const valid = nome.trim().length >= 2;
    return (
      <Modal title="Nova categoria" onClose={onClose} size="sm"
      footer={<>
          <div style={{ flex: 1 }} />
          <button className="btn fin-btn-back" onClick={onClose}>Voltar</button>
          <button className="btn btn-save" disabled={!valid} style={{ opacity: valid ? 1 : .55 }} onClick={() => onCreate({ nome: nome.trim(), tipo })}>
            <Ic name="check" size={13} /> Criar
          </button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">NOME DA CATEGORIA</label>
            <input className="input" value={nome} autoFocus onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Aporte de Sócio" />
          </div>
          <div>
            <label className="label">TIPO</label>
            <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="Financeira">Financeira</option>
              <option value="Produto">Produto</option>
              <option value="Cliente">Cliente</option>
            </select>
          </div>
        </div>
      </Modal>);
  }

  // ---------- Movement drawer (Aporte / Retirada / Transferir) ----------
  function MovementDrawer({ data, accounts, categories, addCategory, userName, onClose, onConfirm }) {
    const { kind, account } = data;
    const todayISO = new Date().toISOString().slice(0, 10);
    const [amount, setAmount] = React.useState(0);
    const [destId, setDestId] = React.useState('');
    const [obs, setObs] = React.useState('');
    const [dataRegistro] = React.useState(todayISO); // sempre a data atual (travada)
    const [categoria, setCategoria] = React.useState(null);
    const [descricao, setDescricao] = React.useState('');
    const [newCatOpen, setNewCatOpen] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [err, setErr] = React.useState('');

    const meta = {
      aporte: { title: 'APORTE (ENTRADA)', ic: 'arrow-down-to-line', color: '#10b981', verb: 'Aportar' },
      retirada: { title: 'RETIRADA (SAÍDA)', ic: 'arrow-up-from-line', color: '#f43f5e', verb: 'Retirar' },
      transferir: { title: 'TRANSFERIR ENTRE CONTAS', ic: 'arrows-h', color: '#3b82f6', verb: 'Transferir' }
    }[kind];

    const dests = accounts.filter((a) => a.id !== account.id);
    const dataBR = dataRegistro.split('-').reverse().join('/');
    // Obrigatórios: valor + descrição (sempre); categoria (aporte/retirada); conta destino (transferência).
    const valid = amount > 0 && descricao.trim().length > 0 && (kind === 'transferir' ? !!destId : !!categoria);

    const submit = async (close) => {
      setErr(''); setSaving(true);
      try {
        await onConfirm({ kind, account, amount, destId, obs, dataRegistro, categoria, descricao });
        close();
      } catch (e) {
        setErr((e && e.message) || 'Falha ao salvar a movimentação.');
        setSaving(false);
      }
    };

    return (<>
      <Drawer
        title={
        <span className="row" style={{ gap: 10, alignItems: 'center' }}>
            <span className="acc-move-ic" style={{ width: 30, height: 30, background: 'color-mix(in oklab, ' + meta.color + ' 14%, white)', color: meta.color }}><Ic name={meta.ic} size={16} /></span>
            <span>{meta.title}</span>
          </span>
        }
        onClose={onClose}
        width={560}
        footer={(close) => <>
          <div style={{ flex: 1 }} />
          <button className="btn fin-btn-back" onClick={() => close()} disabled={saving}>Voltar</button>
          <button className="btn btn-primary" disabled={!valid || saving} style={{ background: meta.color, borderColor: meta.color, opacity: (!valid || saving) ? .55 : 1 }}
        onClick={() => submit(close)}>
            <Ic name="check" size={13} /> {saving ? 'Salvando…' : meta.verb}
          </button>
        </>}>

        <div className="fin-section-title">MOVIMENTO</div>
        <div className="fin-section">
          <div className="acc-move-summary" style={{ marginBottom: 16 }}>
            <div className="acc-move-ic" style={{ background: 'color-mix(in oklab, ' + meta.color + ' 14%, white)', color: meta.color }}>
              <Ic name={meta.ic} size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 'var(--type-md)' }}>{account.descricao}</div>
              <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                Saldo atual: <span className="tnum" style={{ fontWeight: 600, color: 'var(--text)' }}>R$ {fmtBRL(account.saldo)}</span>
              </div>
            </div>
          </div>

          <div className="acc-grid-2">
            <IconField label="DATA DO REGISTRO" icon="calendar">
              <input className="input tnum" value={dataBR} disabled readOnly />
            </IconField>
            <IconField label="VALOR *" icon="dollar">
              <MoneyInput value={amount} onChange={setAmount} />
            </IconField>
            <IconField label="RESPONSÁVEL" icon="user">
              <input className="input" value={userName || '—'} disabled readOnly title="Usuário atual (não editável)" />
            </IconField>
            {kind === 'transferir' &&
            <IconField full label="CONTA DE DESTINO *" icon="arrows-h">
              <select className="input" value={destId} onChange={(e) => setDestId(e.target.value)}>
                <option value="">Selecione…</option>
                {dests.map((d) => <option key={d.id} value={d.id}>{(d.descricao || '').toUpperCase()} - {(d.banco || '').toUpperCase()}</option>)}
              </select>
            </IconField>}
            {kind !== 'transferir' &&
            <div className="acc-field" style={{ gridColumn: '1 / -1' }}>
              <label className="label">CATEGORIA *</label>
              <CategoryField value={categoria} categories={categories} onPick={setCategoria} onNew={() => setNewCatOpen(true)} />
            </div>}
            <div className="acc-field" style={{ gridColumn: '1 / -1' }}>
              <label className="label">DESCRIÇÃO *</label>
              <input className="input" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição do movimento" />
            </div>
          </div>
          {err &&
          <div style={{ marginTop: 12, color: '#dc2626', fontSize: 'var(--type-sm)', display: 'flex', gap: 6, alignItems: 'center' }}>
            <Ic name="info" size={14} /> {err}
          </div>}
        </div>

        <div className="fin-section-title">OBSERVAÇÕES</div>
        <div className="fin-section">
          <textarea className="input" rows={3} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observações..." />
        </div>
      </Drawer>

      {newCatOpen &&
      <NewCategoryModal
        onClose={() => setNewCatOpen(false)}
        onCreate={async (d) => {
          const created = await addCategory(d);
          setCategoria(created);
          setNewCatOpen(false);
        }} />
      }
    </>);

  }

  // ---------- Encerrar conta (aba lateral + popup de confirmação) ----------
  function CloseAccountDrawer({ account, accounts, userName, onClose, onConfirm }) {
    const todayISO = new Date().toISOString().slice(0, 10);
    const [dataRegistro] = React.useState(todayISO); // sempre a data atual (travada)
    const [destId, setDestId] = React.useState('');
    const [motivo, setMotivo] = React.useState('');
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [err, setErr] = React.useState('');

    const dests = accounts.filter((a) => a.id !== account.id);
    const temSaldo = Math.abs(account.saldo || 0) > 0.005;
    const destNome = (dests.find((d) => d.id === destId) || {}).descricao;
    const dataBR = dataRegistro.split('-').reverse().join('/');
    // Obrigatórios: motivo; e — havendo saldo — a conta destino.
    const valid = motivo.trim().length > 0 && (!temSaldo || !!destId);

    const submit = async () => {
      setErr(''); setSaving(true);
      try {
        await onConfirm({ account, dataRegistro, destId, motivo });
      } catch (e) {
        setErr((e && e.message) || 'Falha ao encerrar a conta.');
        setSaving(false);
      }
    };

    return (<>
      <Drawer
        title={
        <span className="row" style={{ gap: 10, alignItems: 'center' }}>
            <span className="acc-move-ic" style={{ width: 30, height: 30, background: 'color-mix(in oklab, #dc2626 14%, white)', color: '#dc2626' }}><Ic name="trash" size={16} /></span>
            <span>ENCERRAR CONTA</span>
          </span>
        }
        onClose={onClose}
        width={560}
        footer={(close) => <>
          <div style={{ flex: 1 }} />
          <button className="btn fin-btn-back" onClick={() => close()}>Voltar</button>
          <button className="btn" disabled={!valid} style={{ background: '#dc2626', borderColor: '#dc2626', color: 'white', opacity: valid ? 1 : .55 }} onClick={() => setConfirmOpen(true)}>
            <Ic name="trash" size={13} /> Encerrar
          </button>
        </>}>

        <div className="fin-section-title">CONTA A ENCERRAR</div>
        <div className="fin-section">
          <div className="acc-move-summary" style={{ marginBottom: 16 }}>
            <div className="acc-move-ic" style={{ background: 'color-mix(in oklab, #dc2626 14%, white)', color: '#dc2626' }}>
              <Ic name="bank" size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 'var(--type-md)' }}>{account.descricao}</div>
              <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                Saldo atual: <span className="tnum" style={{ fontWeight: 600, color: temSaldo ? '#dc2626' : 'var(--text)' }}>R$ {fmtBRL(account.saldo)}</span>
              </div>
            </div>
          </div>

          <div className="acc-grid-2">
            <IconField label="DATA DO REGISTRO" icon="calendar">
              <input className="input tnum" value={dataBR} disabled readOnly />
            </IconField>
            <IconField label="RESPONSÁVEL" icon="user">
              <input className="input" value={userName || '—'} disabled readOnly title="Usuário atual (não editável)" />
            </IconField>
            <IconField full label={temSaldo ? 'CONTA DESTINO DO SALDO *' : 'CONTA DESTINO DO SALDO'} icon="arrows-h">
              <select className="input" value={destId} onChange={(e) => setDestId(e.target.value)} disabled={!temSaldo}>
                <option value="">{temSaldo ? 'Selecione…' : 'Sem saldo a transferir'}</option>
                {dests.map((d) => <option key={d.id} value={d.id}>{(d.descricao || '').toUpperCase()} - {(d.banco || '').toUpperCase()}</option>)}
              </select>
            </IconField>
            <div className="acc-field" style={{ gridColumn: '1 / -1' }}>
              <label className="label">MOTIVO DO ENCERRAMENTO *</label>
              <textarea className="input" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Descreva o motivo do encerramento..." />
            </div>
          </div>
          {temSaldo &&
          <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Ic name="info" size={14} style={{ marginTop: 2, flexShrink: 0, color: 'var(--hue-amber)' }} />
            <span>Esta conta tem saldo. Selecione uma conta destino para transferir o saldo antes do encerramento.</span>
          </div>}
        </div>
      </Drawer>

      {confirmOpen &&
      <Modal title="Confirmar encerramento" onClose={() => setConfirmOpen(false)} size="sm"
      footer={<>
          <div style={{ flex: 1 }} />
          <button className="btn fin-btn-back" onClick={() => setConfirmOpen(false)} disabled={saving}>Voltar</button>
          <button className="btn" disabled={saving} style={{ background: '#dc2626', borderColor: '#dc2626', color: 'white', opacity: saving ? .55 : 1 }} onClick={submit}>
            <Ic name="trash" size={13} /> {saving ? 'Encerrando…' : 'Encerrar conta'}
          </button>
        </>}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'color-mix(in oklab, #dc2626 12%, white)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Ic name="trash" size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>Encerrar {account.descricao}?</div>
            <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>
              {temSaldo && destNome
                ? 'O saldo de R$ ' + fmtBRL(account.saldo) + ' será transferido para "' + destNome + '" e a conta será removida.'
                : 'A conta será removida da lista. Lançamentos vinculados permanecem.'}
            </div>
            {err && <div style={{ marginTop: 8, color: '#dc2626', fontSize: 'var(--type-sm)' }}>{err}</div>}
          </div>
        </div>
      </Modal>
      }
    </>);

  }

  // ---------- Period filter (compact, sliding-pill — matches Receitas/Despesas) ----------
  const STM_PERIOD_OPTIONS = [
  { id: 'todos', label: 'TODOS', sub: '', icon: 'check-double' },
  { id: 'mes', label: 'MÊS', sub: '', icon: 'calendar' },
  { id: '7d', label: '07', sub: 'DIAS', icon: null },
  { id: '15d', label: '15', sub: 'DIAS', icon: null },
  { id: '30d', label: '30', sub: 'DIAS', icon: null },
  { id: 'periodo', label: 'DATA', sub: '', icon: 'calendar' }];


  function StmPeriodFilter({ value, onChange, fromDate, toDate, setFromDate, setToDate }) {
    const rowRef = React.useRef(null);
    const btnRefs = React.useRef({});
    const [pill, setPill] = React.useState({ x: 0, w: 0, ready: false });

    const updatePill = React.useCallback(() => {
      const row = rowRef.current;
      const btn = btnRefs.current[value];
      if (!row || !btn) {setPill((p) => ({ ...p, ready: false }));return;}
      const rRect = row.getBoundingClientRect();
      const bRect = btn.getBoundingClientRect();
      setPill({ x: bRect.left - rRect.left, w: bRect.width, ready: true });
    }, [value]);

    React.useLayoutEffect(() => {updatePill();}, [updatePill]);
    React.useEffect(() => {
      const onResize = () => updatePill();
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }, [updatePill]);

    return (
      <div className="stm-period">
        <div className="stm-period-row" ref={rowRef}>
          <span
            className="stm-period-pill"
            style={{
              transform: `translateX(${pill.x}px)`,
              width: pill.w ? pill.w + 'px' : 0,
              opacity: pill.ready ? 1 : 0
            }}
            aria-hidden="true" />
          
          {STM_PERIOD_OPTIONS.filter((opt) => opt.id !== 'periodo').map((opt) =>
          <button
            key={opt.id}
            ref={(el) => {btnRefs.current[opt.id] = el;}}
            type="button"
            className={'stm-period-btn' + (value === opt.id ? ' on' : '')}
            onClick={() => onChange(opt.id)}
            title={opt.label + (opt.sub ? ' ' + opt.sub : '')}>
            
              {opt.icon &&
            <span className="stm-period-ic"><Ic name={opt.icon} size={15} /></span>
            }
              <span className="stm-period-num">{opt.label}</span>
              {opt.sub && <span className="stm-period-sub">{opt.sub}</span>}
            </button>
          )}
          <DateRangeField from={fromDate} to={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); onChange('periodo'); }} placeholder="Período" style={{ width: 218 }} />
        </div>
      </div>);

  }

  // ---------- Movimento drawer (Fluxo Operacional Financeiro) ----------
  function StatementDrawer({ account, onClose }) {
    const today = new Date();
    const todayISO = today.toISOString().slice(0, 10);
    const [period, setPeriod] = React.useState('mes');
    const [from, setFrom] = React.useState(todayISO);
    const [to, setTo] = React.useState(todayISO);
    const [showFuturos, setShowFuturos] = React.useState(false); // lista nasce só com efetivados

    // Lançamentos REAIS da conta — financeiro-entradas vinculados a esta conta.
    // A data que rege o extrato é o VENCIMENTO (fallback emissão/competência).
    const entradaToMove = (e) => {
      // dateObj = vencimento (ordena/filtra). 'date' (exibição) = DATA/HORA da operação (created_at).
      const vIso = e.vencimento || e.emissao || e.competencia || null;
      const dObj = vIso ? new Date(vIso + 'T00:00:00') : new Date();
      const cts = e.criadoEm || vIso;
      const dh = cts ? new Date(String(cts).length <= 10 ? cts + 'T00:00:00' : cts) : new Date();
      const p2 = (n) => String(n).padStart(2, '0');
      const dataHora = p2(dh.getDate()) + '/' + p2(dh.getMonth() + 1) + '/' + String(dh.getFullYear()).slice(-2) + ' às ' + p2(dh.getHours()) + 'h' + p2(dh.getMinutes());
      return {
        id: e.id,
        type: e.tipo === 'saida' ? 'out' : 'in',
        desc: e.descricao || e.categoria || (e.tipo === 'saida' ? 'Saída' : 'Entrada'),
        category: e.categoria || '—',
        responsavel: e.responsavel || '—',
        value: e.valor || 0,
        status: e.pago ? 'paid' : 'pending',
        dateObj: dObj,
        date: dataHora,
      };
    };
    const [moves, setMoves] = React.useState(null); // null = carregando
    React.useEffect(() => {
      let alive = true;
      setMoves(null);
      API.getEntradasDaConta(account.id)
        .then((r) => { if (alive) setMoves((r.entradas || []).map(entradaToMove)); })
        .catch(() => { if (alive) setMoves([]); });
      return () => { alive = false; };
    }, [account.id]);

    const filtered = React.useMemo(() => {
      let fromD = null,toD = null;
      if (period === 'mes') {
        fromD = new Date(today.getFullYear(), today.getMonth(), 1);
        toD = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      } else if (period === '7d') {
        const d = new Date(today);d.setDate(today.getDate() - 7);
        const d2 = new Date(today);d2.setDate(today.getDate() + 7);
        fromD = d;toD = d2;
      } else if (period === '15d') {
        const d = new Date(today);d.setDate(today.getDate() - 15);
        const d2 = new Date(today);d2.setDate(today.getDate() + 15);
        fromD = d;toD = d2;
      } else if (period === '30d') {
        const d = new Date(today);d.setDate(today.getDate() - 30);
        const d2 = new Date(today);d2.setDate(today.getDate() + 30);
        fromD = d;toD = d2;
      } else if (period === 'periodo') {
        fromD = from ? new Date(from) : null;
        toD = to ? new Date(to) : null;
      }
      return (moves || []).filter((m) => {
        if (period === 'todos') return true;
        const d = m.dateObj;
        if (fromD && d < new Date(fromD.getFullYear(), fromD.getMonth(), fromD.getDate())) return false;
        if (toD && d > new Date(toD.getFullYear(), toD.getMonth(), toD.getDate(), 23, 59, 59)) return false;
        return true;
      });
    }, [moves, period, from, to]);

    const entradas = filtered.filter((m) => m.type === 'in' && m.status === 'paid').reduce((s, m) => s + m.value, 0);
    const saidas = filtered.filter((m) => m.type === 'out' && m.status === 'paid').reduce((s, m) => s + m.value, 0);
    const prevIn = filtered.filter((m) => m.type === 'in' && m.status === 'pending').reduce((s, m) => s + m.value, 0);
    const prevOut = filtered.filter((m) => m.type === 'out' && m.status === 'pending').reduce((s, m) => s + m.value, 0);
    const previsao = prevIn - prevOut;
    const totalEntr = entradas + prevIn;
    const totalSai = saidas + prevOut;
    const pctEntr = totalEntr > 0 ? Math.round(entradas / totalEntr * 100) : 0;
    const pctSai = totalSai > 0 ? Math.round(saidas / totalSai * 100) : 0;
    const pctPrev = entradas + saidas > 0 ? Math.round(Math.abs(previsao) / (entradas + saidas) * 100) : 0;
    // A LISTA nasce só com EFETIVADOS; o botão "Lançamentos Futuros" inclui os previstos.
    const listMoves = showFuturos ? filtered : filtered.filter((m) => m.status === 'paid');

    return (
      <Drawer
        title={
        <span className="row" style={{ gap: 12, alignItems: 'center' }}>
            <button className="btn btn-ghost btn-icon" onClick={onClose} title="Voltar"
          style={{ width: 32, height: 32, background: 'transparent', border: 0 }}>
              <Ic name="arrow-left" size={18} />
            </button>
            <span style={{ fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' }}>
              Fluxo Operacional Financeiro
            </span>
          </span>
        }
        onClose={onClose}
        width="80vw">

        {/* Drawer body becomes a flex column so the LANÇAMENTOS list owns the scroll */}
        <style>{`.drawer-bd:has(> .stm-section-title) { display: flex; flex-direction: column; overflow: hidden; }`}</style>

        <div className="stm-section-title">EXTRATO DE CONTA</div>

        <div className="stm-section">
          <div className="stm-cards">
            {/* Saldo em Conta */}
            <div className="stm-card stm-card-balance" style={{ height: "150px" }}>
              <div className="stm-balance-ic"><Ic name="dollar" size={28} /></div>
              <div className="stm-balance-label">Saldo em Conta</div>
              <div className="stm-balance-value">
                <span style={{ opacity: .65, fontSize: 14, marginRight: 4 }}>R$</span>
                <span className="tnum">{fmtBRL(account.saldo)}</span>
              </div>
            </div>

            {/* Entradas */}
            <StmKpi
              icon="arrow-down-to-line"
              label="ENTRADAS"
              tone="green"
              value={entradas}
              pct={pctEntr}
              left={{ label: 'PREVISTO', value: prevIn, color: '#10b981' }}
              right={{ label: 'RESTANTE', value: Math.max(prevIn, 0), color: 'var(--text-muted)' }} />
            

            {/* Saídas */}
            <StmKpi
              icon="arrow-up-from-line"
              label="SAÍDAS"
              tone="red"
              value={saidas}
              pct={pctSai}
              left={{ label: 'PREVISTO', value: prevOut, color: '#ef4444' }}
              right={{ label: 'RESTANTE', value: Math.max(prevOut, 0), color: 'var(--text-muted)' }} />
            

            {/* Previsão */}
            <StmKpi
              icon="reports"
              label="PREVISÃO"
              tone="blue"
              value={previsao}
              pct={pctPrev}
              left={{ label: 'EXECUTADO', value: entradas - saidas, color: '#3b82f6' }}
              right={{ label: 'RESTANTE', value: previsao, color: 'var(--text-muted)' }} />
            
          </div>

          {/* Period filter + botão Lançamentos Futuros */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <StmPeriodFilter
              value={period}
              onChange={setPeriod}
              fromDate={from}
              toDate={to}
              setFromDate={setFrom}
              setToDate={setTo} />
            <button type="button" className={'stm-futuros-btn' + (showFuturos ? ' on' : '')} onClick={() => setShowFuturos((v) => !v)} title={showFuturos ? 'Ocultar lançamentos futuros' : 'Incluir lançamentos futuros (previstos)'}>
              <Ic name="calendar" size={14} /> Lançamentos Futuros
            </button>
          </div>

        </div>

        <div className="stm-section-title">LANÇAMENTOS</div>
        <div className="stm-section stm-list-wrap">
          {moves === null ?
          <div className="stm-empty">
              <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>Carregando lançamentos…</div>
            </div> :
          listMoves.length === 0 ?
          <div className="stm-empty">
              <Ic name="reports" size={36} style={{ opacity: .35 }} />
              <div style={{ marginTop: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                {showFuturos ? 'Sem lançamentos no período' : 'Sem lançamentos efetivados no período'}
              </div>
              <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>
                {showFuturos ? 'Ajuste o filtro acima para visualizar os movimentos da conta.' : 'Clique em “Lançamentos Futuros” para incluir os previstos.'}
              </div>
            </div> :

          <div className="stm-list">
              <div className="stm-row stm-row-head">
                <div>DATA / HORA</div>
                <div>DESCRIÇÃO</div>
                <div>CATEGORIA</div>
                <div>RESPONSÁVEL</div>
                <div>STATUS</div>
                <div style={{ textAlign: 'right' }}>VALOR</div>
              </div>
              {listMoves.map((m) =>
            <div key={m.id} className={'stm-row ' + (m.type === 'in' ? 'is-in' : 'is-out')}>
                  <div className="muted tnum" style={{ fontSize: 'var(--type-sm)' }}>{m.date}</div>
                  <div className="row" style={{ gap: 10, minWidth: 0 }}>
                    <span className={'stm-row-ic ' + (m.type === 'in' ? 'is-in' : 'is-out')}>
                      <Ic name={m.type === 'in' ? 'arrow-down-to-line' : 'arrow-up-from-line'} size={11} />
                    </span>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.desc}
                    </span>
                  </div>
                  <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>{m.category}</div>
                  <div className="muted" style={{ fontSize: 'var(--type-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{m.responsavel}</div>
                  <div>
                    <span className={'stm-status ' + (m.status === 'paid' ? 'is-paid' : 'is-pending')}>
                      {m.status === 'paid' ? 'EFETIVADO' : 'PREVISTO'}
                    </span>
                  </div>
                  <div className="tnum" style={{ textAlign: 'right', fontWeight: 700, color: m.type === 'in' ? '#047857' : '#b91c1c' }}>
                    {m.type === 'in' ? '+ ' : '− '}R$ {fmtBRL(m.value)}
                  </div>
                </div>
            )}
            </div>
          }
        </div>
      </Drawer>);

  }

  function StmKpi({ icon, label, tone, value, pct, left, right }) {
    const tones = {
      green: { ic: '#10b981', bar: '#10b981', pct: '#10b981' },
      red: { ic: '#ef4444', bar: '#ef4444', pct: '#ef4444' },
      blue: { ic: '#3b82f6', bar: '#3b82f6', pct: '#3b82f6' }
    };
    const t = tones[tone] || tones.green;
    return (
      <div className="stm-card stm-kpi" style={{ height: "150px" }}>
        <div className="stm-kpi-head">
          <span className="stm-kpi-ic" style={{ color: t.ic }}>
            <Ic name={icon} size={16} />
          </span>
          <span className="stm-kpi-label">{label}</span>
          <span className="stm-kpi-pct tnum" style={{ color: t.pct, fontSize: "15px" }}>{pct}%</span>
        </div>
        <div className="stm-kpi-value">
          <span style={{ opacity: .55, fontSize: 13, marginRight: 4 }}>R$</span>
          <span className="tnum">{fmtBRL(value)}</span>
        </div>
        <div className="stm-kpi-bar">
          <div className="stm-kpi-bar-fill" style={{ width: Math.min(100, Math.max(0, pct)) + '%', background: t.bar }} />
        </div>
        <div className="stm-kpi-foot">
          <div>
            <div className="stm-kpi-foot-label" style={{ color: left.color }}>{left.label}</div>
            <div className="stm-kpi-foot-value tnum">R$ {fmtBRL(left.value)}</div>
          </div>
          <div>
            <div className="stm-kpi-foot-label">{right.label}</div>
            <div className="stm-kpi-foot-value tnum">R$ {fmtBRL(right.value)}</div>
          </div>
        </div>
      </div>);

  }

  // Mock generator — pseudo-random list of movements per account
  // generateMoves (mock) removido — o extrato agora usa os lançamentos reais (financeiro-entradas).

  // ---------- Styles ----------
  function AccountsStyles() {
    return (
      <style>{`
        /* Grid de cards */
        .acc-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(296px, 1fr));
          gap: 16px;
          align-items: stretch;
        }

        /* Cartão de conta — respeita tema atual (light/dark) */
        .acc-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          display: flex; flex-direction: column;
          box-shadow: 0 1px 3px rgba(15,23,42,.05);
          transition: transform .18s, box-shadow .18s;
          position: relative;
          /* barra colorida na MARGEM SUPERIOR */
          border-top: 4px solid var(--acc-color, var(--accent));
        }
        .acc-card:hover { transform: translateY(-2px); box-shadow: 0 10px 22px rgba(15,23,42,.08); }

        /* Header — banco / agência / nº (mesma superfície do card) */
        .acc-card-head {
          background: var(--surface);
          padding: 14px 16px 12px;
          border-bottom: 1px solid var(--border);
        }
        .acc-card-bank { display: flex; gap: 10px; align-items: flex-start; }
        .acc-card-bank-ic {
          color: var(--text-muted);
          flex-shrink: 0;
          width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
        }
        .acc-card-bank-text { min-width: 0; flex: 1; }
        .acc-card-bank-title {
          font-size: var(--type-md); line-height: 1.25;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .acc-card-bank-sub {
          display: flex; gap: 16px;
          font-size: var(--type-xs); color: var(--text-muted);
          margin-top: 4px;
          letter-spacing: .02em;
        }
        .acc-card-bank-sub strong { color: var(--text); font-weight: 600; }

        /* Body — herda fundo do tema */
        .acc-card-body {
          background: var(--surface-2);
          color: var(--text);
          padding: 14px 16px 16px;
          display: flex; flex-direction: column; gap: 12px;
          flex: 1;
        }

        .acc-balance { display: flex; flex-direction: column; gap: 4px; }
        .acc-balance-row {
          display: flex; justify-content: space-between; align-items: center;
        }
        .acc-balance-label {
          font-size: var(--type-xs); font-weight: 600; letter-spacing: .1em;
          color: var(--text-muted);
        }
        .acc-eye {
          appearance: none; background: transparent; border: 0;
          color: var(--text-muted); cursor: pointer;
          width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 6px;
          transition: background .15s, color .15s;
        }
        .acc-eye:hover { background: var(--surface-3); color: var(--text); }
        .acc-balance-value {
          display: flex; align-items: baseline; gap: 4px;
          font-size: 26px; font-weight: 700; letter-spacing: -0.02em;
          color: var(--text);
        }
        .acc-balance-rs { font-size: 13px; font-weight: 600; color: var(--text-muted); }
        /* mesmo tamanho do valor visível → altura do cartão não muda ao ocultar/mostrar */
        .acc-balance-hidden { letter-spacing: .12em; font-size: 26px; color: var(--text-muted); }

        /* Grade de ações — botões 80x70, raio 5px, gap 8px lateral e inferior */
        .acc-actions-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr); /* botões acompanham a largura do cartão */
          gap: 8px;
        }
        .acc-action {
          appearance: none; cursor: pointer;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text-muted);
          width: 80px; height: 70px;
          border-radius: 5px;
          padding: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
          font-family: inherit;
          transition: background .15s, color .15s, border-color .15s;
        }
        .acc-action:hover { background: var(--accent-soft); color: var(--accent-700); border-color: var(--accent); }
        .acc-action.is-danger:hover {
          background: color-mix(in oklab, #ef4444 12%, var(--surface));
          color: #b91c1c;
          border-color: #ef4444;
        }
        [data-theme="dark"] .acc-action.is-danger:hover { color: #fecaca; }
        /* Botão desabilitado (GERENCIAL): hover laranja, mantendo o resto do estilo */
        .acc-action.is-disabled:hover {
          background: color-mix(in oklab, #f97316 14%, var(--surface));
          color: #ea580c;
          border-color: #f97316;
        }
        /* Balão de aviso (tooltip) — position: fixed p/ escapar do overflow do cartão */
        .acc-action-tip {
          transform: translate(-50%, -100%);
          background: #1f2937; color: #fff;
          font-size: 11px; line-height: 1.35; font-weight: 500; letter-spacing: 0; text-transform: none;
          padding: 7px 10px; border-radius: 7px;
          width: max-content; max-width: 220px; text-align: center;
          box-shadow: 0 8px 24px rgba(0,0,0,.28);
          z-index: 1000; pointer-events: none;
        }
        .acc-action-tip::after {
          content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
          border: 5px solid transparent; border-top-color: #1f2937;
        }
        .acc-action-ic { display: flex; align-items: center; justify-content: center; }
        .acc-action-label { font-size: var(--type-xs); font-weight: 600; letter-spacing: .04em; }

        .acc-nature {
          text-align: center;
          font-size: var(--type-xs); font-weight: 600; letter-spacing: normal;
          padding-top: 10px;
          margin-top: 2px;
          border-top: 1px solid var(--border);
        }

        /* Add tile */
        .acc-card-add {
          appearance: none; cursor: pointer; font-family: inherit;
          background: var(--surface);
          border: 2px dashed var(--border-strong);
          border-radius: 16px;
          min-height: 320px;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
          padding: 24px; text-align: center;
          color: var(--text-muted);
          transition: border-color .18s, color .18s, transform .18s;
        }
        .acc-card-add:hover { border-color: var(--accent); color: var(--accent-700); transform: translateY(-2px); }
        .acc-card-add-circle {
          width: 56px; height: 56px; border-radius: 50%;
          background: var(--accent-grad); color: var(--accent-grad-ink);
          display: flex; align-items: center; justify-content: center;
          transition: transform .5s cubic-bezier(.34,1.56,.64,1);
        }
        .acc-card-add:hover .acc-card-add-circle { transform: rotate(180deg); }
        .acc-card-add-title { font-weight: 700; font-size: var(--type-md); color: var(--text); }
        .acc-card-add-sub { font-size: var(--type-sm); max-width: 220px; line-height: 1.4; }

        /* Cadastro — campos com ícone à esquerda */
        .acc-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        @media (max-width: 720px) { .acc-grid-3 { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 480px) { .acc-grid-3 { grid-template-columns: 1fr; } }
        .acc-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        @media (max-width: 480px) { .acc-grid-2 { grid-template-columns: 1fr; } }

        .acc-field { display: flex; flex-direction: column; gap: 2px; }
        .acc-field .label { margin-bottom: 0; } /* só os 2px do gap entre rótulo e campo */
        .acc-field-wrap {
          display: flex; align-items: stretch;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
          transition: border-color .15s, box-shadow .15s;
        }
        .acc-field-wrap:focus-within {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-soft);
        }
        .acc-field-ic {
          display: flex; align-items: center; justify-content: center;
          width: 36px;
          background: var(--surface-2);
          color: var(--text-faint);
          border-right: 1px solid var(--border);
          flex-shrink: 0;
        }
        .acc-field-input { flex: 1; min-width: 0; }
        .acc-field-input .input {
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          width: 100%;
        }
        .acc-field-input .input:focus { box-shadow: none !important; }

        /* Cor da borda */
        .acc-color-row {
          display: flex; flex-wrap: wrap; gap: 14px; align-items: center;
          padding: 4px;
        }
        .acc-color-dot {
          appearance: none; border: 0; cursor: pointer;
          width: 28px; height: 28px;
          border-radius: 50%;
          background: var(--c);
          color: white;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 1px 3px rgba(0,0,0,.18);
          transition: transform .15s, box-shadow .15s;
          padding: 0;
        }
        .acc-color-dot:hover { transform: scale(1.1); }
        .acc-color-dot.on {
          box-shadow: 0 0 0 3px var(--surface), 0 0 0 5px var(--c);
        }

        /* Movement modal */
        .acc-move-summary {
          display: flex; gap: 10px; align-items: center;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 10px 12px;
        }
        .acc-move-ic {
          width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        /* ===== StatementDrawer (Fluxo Operacional Financeiro) ===== */
        .stm-section-title {
          font-size: var(--type-xs); font-weight: 700; letter-spacing: .12em;
          color: var(--text-muted); text-transform: uppercase;
          margin: 14px 2px 8px;
        }
        .stm-section {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          display: flex; flex-direction: column; gap: 14px;
        }

        .stm-cards {
          display: grid;
          grid-template-columns: 1.1fr 1fr 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 980px) { .stm-cards { grid-template-columns: 1fr 1fr; } }

        .stm-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 14px 16px;
          display: flex; flex-direction: column; gap: 8px;
          min-height: 150px;
        }

        /* Saldo em conta (gradiente) */
        .stm-card-balance {
          background: linear-gradient(135deg, #22c55e 0%, #bef264 100%);
          color: #0a0f0a;
          border: 0;
          align-items: center; justify-content: center; text-align: center;
          padding: 18px;
        }
        .stm-balance-ic {
          width: 56px; height: 56px; border-radius: 50%;
          background: rgba(255,255,255,.28);
          display: flex; align-items: center; justify-content: center;
          color: #052e16;
        }
        .stm-balance-label {
          font-size: var(--type-md);
          font-weight: 600; color: #052e16; opacity: .85;
          margin-top: 4px;
        }
        .stm-balance-value {
          display: flex; align-items: baseline; gap: 4px;
          font-size: 22px; font-weight: 700; color: #052e16;
          letter-spacing: -.01em;
        }

        /* KPI cards (Entradas / Saídas / Previsão) */
        .stm-kpi-head {
          display: flex; align-items: center; gap: 6px;
        }
        .stm-kpi-ic { display: flex; align-items: center; justify-content: center; }
        .stm-kpi-label {
          font-size: var(--type-xs); font-weight: 700; letter-spacing: .1em;
          color: var(--text); text-transform: uppercase;
        }
        .stm-kpi-pct { margin-left: auto; font-size: var(--type-xs); font-weight: 700; }
        .stm-kpi-value {
          display: flex; align-items: baseline; gap: 2px;
          font-size: 20px; font-weight: 700; letter-spacing: -.01em;
          color: var(--text);
        }
        .stm-kpi-bar {
          height: 3px; background: var(--surface-3);
          border-radius: 999px; overflow: hidden;
        }
        .stm-kpi-bar-fill { height: 100%; border-radius: 999px; transition: width .4s; }
        .stm-kpi-foot {
          display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
          margin-top: auto;
        }
        .stm-kpi-foot-label {
          font-size: 10px; font-weight: 700; letter-spacing: .1em;
          color: var(--text-muted); text-transform: uppercase;
        }
        .stm-kpi-foot-value {
          font-size: var(--type-sm); font-weight: 600; color: var(--text);
          margin-top: 2px;
        }

        /* Period filter inside drawer — sliding-pill, matches Receitas/Despesas */
        .stm-period { display: inline-flex; max-width: 100%; }
        /* Botão "Lançamentos Futuros" — estilo tag azul (fonte/contorno fortes, hover escurece leve) */
        .stm-futuros-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 8px 14px; border-radius: 8px;
          font-family: inherit; font-size: var(--type-sm); font-weight: 700;
          cursor: pointer; white-space: nowrap;
          background: color-mix(in oklab, #3b82f6 14%, var(--surface));
          color: #1d4ed8;
          border: 1.5px solid color-mix(in oklab, #3b82f6 55%, transparent);
          transition: background .15s, border-color .15s, color .15s;
        }
        .stm-futuros-btn:hover { background: color-mix(in oklab, #3b82f6 22%, var(--surface)); border-color: #3b82f6; }
        .stm-futuros-btn.on { background: #3b82f6; color: #fff; border-color: #3b82f6; }
        .stm-futuros-btn.on:hover { background: #2563eb; }
        .stm-period-row {
          position: relative;
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px;
          background: var(--surface-3);
          border: 1px solid var(--border);
          border-radius: 10px;
          flex-wrap: nowrap;
        }
        [data-theme="dark"] .stm-period-row { background: #1a1f25; border-color: #262c34; }

        /* Sliding active pill */
        .stm-period-pill {
          position: absolute;
          top: 6px;
          bottom: 6px;
          left: 0;
          border-radius: 7px;
          background: #E7F4E9;
          box-shadow: 0 1px 3px rgba(16,185,129,.18), inset 0 0 0 1px rgba(16,185,129,.28);
          transition: transform .32s cubic-bezier(.5,.2,.2,1), width .32s cubic-bezier(.5,.2,.2,1), opacity .2s;
          pointer-events: none;
          z-index: 0;
        }

        .stm-period-btn {
          position: relative;
          z-index: 1;
          appearance: none; border: 0; background: transparent;
          color: var(--text-muted); font-family: inherit; cursor: pointer;
          padding: 6px 10px; border-radius: 7px;
          display: inline-flex; flex-direction: column; align-items: center; gap: 0;
          line-height: 1.1; min-width: 44px;
          transition: color .2s;
        }
        .stm-period-btn .stm-period-ic { color: inherit; }
        .stm-period-btn .stm-period-num { font-weight: 700; font-size: 10px; letter-spacing: .04em; }
        .stm-period-btn .stm-period-sub { font-weight: 600; font-size: 9px; letter-spacing: .08em; opacity: .8; margin-top: 1px; }
        .stm-period-btn:hover { color: var(--text); }
        .stm-period-btn.on {
          color: #047857;
          text-shadow: none;
        }
        .stm-period-btn.on:hover { color: #047857; }

        .stm-period-date {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 8px; border-radius: 7px;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text-muted);
        }
        [data-theme="dark"] .stm-period-date { background: #232932; border-color: #34404d; color: var(--text-muted); }
        .stm-period-date.on { border-color: var(--accent); color: var(--text); }
        .stm-period-date input[type="date"] {
          appearance: none; border: 0; background: transparent;
          color: inherit; font: inherit; font-variant-numeric: tabular-nums;
          padding: 4px 0; min-width: 110px;
        }
        .stm-period-date input[type="date"]:focus { outline: none; }
        [data-theme="dark"] .stm-period-date input::-webkit-calendar-picker-indicator { filter: invert(.7); }

        /* Lançamentos list — cards with left accent border (matches leads/clients pattern) */
        .stm-list-wrap {
          padding: 0; background: transparent; border: 0; box-shadow: none;
          flex: 1; min-height: 0;
          overflow-y: auto;
        }
        .stm-list { display: flex; flex-direction: column; gap: 4px; padding: 0 4px 4px; }
        .stm-row {
          display: grid;
          grid-template-columns: 150px minmax(0, 2fr) minmax(120px, 1fr) minmax(120px, 1fr) 110px 130px;
          gap: 14px;
          padding: 12px 16px;
          align-items: center;
          background: var(--surface);
          border: 1px solid var(--border);
          border-left-width: 2px;
          border-radius: 5px;
          transition: background .15s, box-shadow .15s, border-color .15s;
        }
        .stm-row:hover {
          box-shadow: 0 2px 10px rgba(15,23,42,.06);
          border-color: var(--border-strong);
        }
        /* Entradas → borda esquerda verde · Saídas → borda esquerda vermelha */
        .stm-row.is-in  { border-left-color: #10b981; }
        .stm-row.is-out { border-left-color: #ef4444; }

        .stm-row-head {
          position: sticky;
          top: 0;
          z-index: 2;
          background: var(--surface-3);
          font-size: var(--type-xs); font-weight: 700; letter-spacing: .08em;
          color: var(--text-faint); text-transform: uppercase;
          padding: 10px 16px;
          border-left-color: var(--border) !important;
          box-shadow: 0 1px 0 var(--border);
        }
        .stm-row-head:hover { box-shadow: 0 1px 0 var(--border); border-color: var(--border); }
        .stm-row-ic {
          width: 26px; height: 26px; border-radius: 50%;
          display: inline-flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .stm-row-ic.is-in  { background: color-mix(in oklab, #10b981 14%, var(--surface)); color: #047857; }
        .stm-row-ic.is-out { background: color-mix(in oklab, #ef4444 14%, var(--surface)); color: #b91c1c; }

        .stm-status {
          display: inline-flex; align-items: center;
          padding: 3px 9px; border-radius: 999px;
          font-size: 10px; font-weight: 700; letter-spacing: .06em;
        }
        .stm-status.is-paid    { background: color-mix(in oklab, #10b981 16%, var(--surface)); color: #047857; }
        .stm-status.is-pending { background: color-mix(in oklab, #f59e0b 18%, var(--surface)); color: #b45309; }

        .stm-empty {
          padding: 60px 16px; text-align: center; color: var(--text-faint);
        }

        @media (max-width: 900px) {
          .stm-row { grid-template-columns: 110px minmax(0, 1.6fr) 100px 120px; }
          .stm-row > div:nth-child(3), .stm-row > div:nth-child(4) { display: none; } /* esconde Categoria e Responsável no estreito */
        }
      `}</style>);

  }

  // ---------- Exports ----------
  function FinAccounts() {return <AccountsPage />;}
  Object.assign(window, { FinAccounts });
})();