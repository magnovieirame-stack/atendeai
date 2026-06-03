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
    const [items, setItems] = React.useState(() => SEED.slice());
    const [showNew, setShowNew] = React.useState(false);
    const [editItem, setEditItem] = React.useState(null);
    const [hidden, setHidden] = React.useState({}); // visibility per card
    const [confirmDel, setConfirmDel] = React.useState(null);
    const [moveModal, setMoveModal] = React.useState(null); // {kind:'aporte'|'retirada'|'transferir', account}
    const [statementAcc, setStatementAcc] = React.useState(null); // movimento drawer

    const filtered = items;

    const toggleHide = (id) => setHidden((p) => ({ ...p, [id]: !p[id] }));

    const handleSave = (data) => {
      if (editItem) {
        setItems((prev) => prev.map((it) => it.id === editItem.id ? { ...it, ...data } : it));
      } else {
        const id = 'a' + Date.now().toString(36);
        setItems((prev) => [...prev, { id, ...data }]);
      }
      setShowNew(false);setEditItem(null);
    };

    const handleDelete = (item) => {
      setItems((prev) => prev.filter((it) => it.id !== item.id));
      setConfirmDel(null);
    };

    const handleMovement = ({ kind, account, amount, destId, obs }) => {
      const n = Number(amount) || 0;
      if (!n) {setMoveModal(null);return;}
      setItems((prev) => prev.map((it) => {
        if (it.id === account.id) {
          if (kind === 'aporte') return { ...it, saldo: (it.saldo || 0) + n };
          if (kind === 'retirada') return { ...it, saldo: (it.saldo || 0) - n };
          if (kind === 'transferir') return { ...it, saldo: (it.saldo || 0) - n };
        }
        if (kind === 'transferir' && it.id === destId) {
          return { ...it, saldo: (it.saldo || 0) + n };
        }
        return it;
      }));
      setMoveModal(null);
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
            const nat = NATUREZAS.find((n) => n.id === it.natureza)?.label || 'CONTA';
            return (
              <div key={it.id} className="acc-card" style={{ '--acc-color': it.cor }}>
                {/* Header (white) */}
                <div className="acc-card-head">
                  <div className="acc-card-bank">
                    <span className="acc-card-bank-ic"><Ic name="bank" size={20} /></span>
                    <div className="acc-card-bank-text">
                      <div className="acc-card-bank-title">
                        <span className="tnum" style={{ fontWeight: 700, color: 'var(--text)' }}>{it.banco}</span>
                        <span style={{ opacity: .5, margin: '0 6px' }}>—</span>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }} title={it.descricao}>{it.descricao}</span>
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
                        <Ic name={isHidden ? 'eye-off' : 'eye'} size={14} />
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
                    <AccAction icon="trash" label="ENCERRAR" danger onClick={() => setConfirmDel(it)} />
                  </div>

                  <div className="acc-nature" style={{ color: it.cor, fontSize: "20px" }}>
                    {nat}
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
        <Modal title="Encerrar conta" onClose={() => setConfirmDel(null)} size="sm"
        footer={<>
              <div style={{ flex: 1 }} />
              <button className="btn" onClick={() => setConfirmDel(null)}>Cancelar</button>
              <button className="btn" style={{ background: '#dc2626', borderColor: '#dc2626', color: 'white' }} onClick={() => handleDelete(confirmDel)}>
                <Ic name="trash" size={13} /> Encerrar
              </button>
            </>}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'color-mix(in oklab, #dc2626 12%, white)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Ic name="trash" size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>Encerrar {confirmDel.descricao}?</div>
                <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>
                  A conta será removida da lista. Lançamentos vinculados permanecem.
                </div>
              </div>
            </div>
          </Modal>
        }

        {moveModal &&
        <MoveModal
          data={moveModal}
          accounts={items}
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

  function AccAction({ icon, label, onClick, danger }) {
    return (
      <button className={'acc-action' + (danger ? ' is-danger' : '')} onClick={onClick} style={{ height: "80px", width: "80px", borderRadius: "8px" }}>
        <span className="acc-action-ic"><Ic name={icon} size={18} /></span>
        <span className="acc-action-label" style={{ fontFamily: "Poppins", fontWeight: "500" }}>{label}</span>
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

    const valid = f.descricao.trim().length >= 2;

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
            <IconField label="DESCRIÇÃO DA CONTA" icon="file-text" full>
              <input className="input" value={f.descricao} onChange={(e) => set('descricao', e.target.value)} placeholder="Ex.: Itaú PJ Operacional" />
            </IconField>
            <IconField label="SALDO INICIAL" icon="dollar">
              <MoneyInput value={f.saldoInicial} onChange={(v) => set('saldoInicial', v)} disabled={isEdit} />
            </IconField>
            <IconField label="DATA DO SALDO" icon="calendar">
              <DateField value={f.dataSaldo} onChange={(e) => set('dataSaldo', e.target.value)} />
            </IconField>
            <IconField label="NATUREZA" icon="reports">
              <select className="input" value={f.natureza} onChange={(e) => set('natureza', e.target.value)}>
                {NATUREZAS.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
              </select>
            </IconField>
          </div>
        </div>

        <div className="fin-section-title">INFORMAÇÕES BANCÁRIAS</div>
        <div className="fin-section">
          <div className="acc-grid-3">
            <IconField label="BANCO" icon="bank">
              <select className="input" value={f.banco} onChange={(e) => set('banco', e.target.value)}>
                <option value="">Selecione…</option>
                {BANCOS.map((b) => <option key={b.code} value={b.code}>{b.code} — {b.name}</option>)}
              </select>
            </IconField>
            <IconField label="AGÊNCIA-DÍGITO" icon="building">
              <input className="input tnum" value={f.agencia} onChange={(e) => set('agencia', e.target.value)} placeholder="0000-0" />
            </IconField>
            <IconField label="CONTA-DÍGITO" icon="wallet">
              <input className="input tnum" value={f.conta} onChange={(e) => set('conta', e.target.value)} placeholder="00000-0" />
            </IconField>
            <IconField label="TIPO DE CONTA" icon="list">
              <select className="input" value={f.tipo} onChange={(e) => set('tipo', e.target.value)}>
                {TIPOS_CONTA.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </IconField>
            <IconField label="FÍSICA OU JURÍDICA" icon="users">
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

  // ---------- Movement modal (Aporte / Retirada / Transferir) ----------
  function MoveModal({ data, accounts, onClose, onConfirm }) {
    const { kind, account } = data;
    const [amount, setAmount] = React.useState(0);
    const [destId, setDestId] = React.useState('');
    const [obs, setObs] = React.useState('');

    const meta = {
      aporte: { title: 'Aporte (entrada)', ic: 'arrow-down-to-line', color: '#10b981', verb: 'Aportar' },
      retirada: { title: 'Retirada (saída)', ic: 'arrow-up-from-line', color: '#f43f5e', verb: 'Retirar' },
      transferir: { title: 'Transferir entre contas', ic: 'arrows-h', color: '#3b82f6', verb: 'Transferir' }
    }[kind];

    const dests = accounts.filter((a) => a.id !== account.id);
    const valid = amount > 0 && (kind !== 'transferir' || destId);

    return (
      <Modal title={meta.title} onClose={onClose} size="sm"
      footer={<>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!valid} style={{ background: meta.color, borderColor: meta.color, opacity: valid ? 1 : .55 }}
        onClick={() => onConfirm({ kind, account, amount, destId, obs })}>
            <Ic name="check" size={13} /> {meta.verb}
          </button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="acc-move-summary">
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

          <div>
            <label className="label">VALOR</label>
            <MoneyInput value={amount} onChange={setAmount} />
          </div>

          {kind === 'transferir' &&
          <div>
              <label className="label">CONTA DE DESTINO</label>
              <select className="input" value={destId} onChange={(e) => setDestId(e.target.value)}>
                <option value="">Selecione…</option>
                {dests.map((d) => <option key={d.id} value={d.id}>{d.descricao} ({bankShort(d.banco)})</option>)}
              </select>
            </div>
          }

          <div>
            <label className="label">OBSERVAÇÕES</label>
            <input className="input" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" />
          </div>
        </div>
      </Modal>);

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
          <DateRangeField from={fromDate} to={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); onChange('periodo'); }} placeholder="Período" style={{ width: 218, marginLeft: 4 }} />
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

    // Mock movements for the selected account
    const moves = React.useMemo(() => generateMoves(account), [account]);

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
      return moves.filter((m) => {
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

          {/* Period filter */}
          <StmPeriodFilter
            value={period}
            onChange={setPeriod}
            fromDate={from}
            toDate={to}
            setFromDate={setFrom}
            setToDate={setTo} />
          
        </div>

        <div className="stm-section-title">LANÇAMENTOS</div>
        <div className="stm-section stm-list-wrap">
          {filtered.length === 0 ?
          <div className="stm-empty">
              <Ic name="reports" size={36} style={{ opacity: .35 }} />
              <div style={{ marginTop: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                Sem lançamentos no período
              </div>
              <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>
                Ajuste o filtro acima para visualizar os movimentos da conta.
              </div>
            </div> :

          <div className="stm-list">
              <div className="stm-row stm-row-head">
                <div>DATA</div>
                <div>DESCRIÇÃO</div>
                <div>CATEGORIA</div>
                <div>STATUS</div>
                <div style={{ textAlign: 'right' }}>VALOR</div>
              </div>
              {filtered.map((m) =>
            <div key={m.id} className={'stm-row ' + (m.type === 'in' ? 'is-in' : 'is-out')}>
                  <div className="tnum" style={{ fontWeight: 600 }}>{m.date}</div>
                  <div className="row" style={{ gap: 10, minWidth: 0 }}>
                    <span className={'stm-row-ic ' + (m.type === 'in' ? 'is-in' : 'is-out')}>
                      <Ic name={m.type === 'in' ? 'arrow-down-to-line' : 'arrow-up-from-line'} size={14} />
                    </span>
                    <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.desc}
                    </span>
                  </div>
                  <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>{m.category}</div>
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
  function generateMoves(account) {
    const seed = (account.id || 'a').split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    const rng = (i) => {
      const x = Math.sin(seed + i * 137) * 10000;
      return x - Math.floor(x);
    };
    const cats = ['Venda de Serviço', 'Aluguel', 'Fornecedor', 'Comissão', 'Energia', 'Internet', 'Folha', 'Marketing'];
    const descs = [
    ['in', 'PIX recebido — Júlia Mendes'],
    ['in', 'Pacote noiva — Marcela Tavares'],
    ['in', 'Repasse Mercado Pago'],
    ['out', 'Aluguel sala comercial'],
    ['out', 'Fornecedor Cosmédica'],
    ['out', 'Energisa Ceará'],
    ['out', 'Tarifa bancária'],
    ['in', 'Consultoria — Roberto Lima'],
    ['out', 'Folha de pagamento — Karla'],
    ['in', 'Venda balcão'],
    ['out', 'Google Ads'],
    ['in', 'Transferência recebida'],
    ['out', 'Materiais de escritório']];

    const today = new Date();
    const list = [];
    for (let i = 0; i < descs.length; i++) {
      const [type, desc] = descs[i];
      const back = Math.floor(rng(i) * 18); // up to 18 days back
      const ahead = Math.floor(rng(i + 50) * 10); // up to 10 days ahead
      const isFuture = rng(i + 100) > 0.7;
      const d = new Date(today);
      d.setDate(d.getDate() + (isFuture ? ahead : -back));
      const val = Math.round((40 + rng(i + 200) * 1800) * 100) / 100;
      list.push({
        id: 'm' + i,
        type,
        desc,
        category: cats[i % cats.length],
        value: val,
        status: isFuture ? 'pending' : 'paid',
        dateObj: d,
        date: d.toLocaleDateString('pt-BR')
      });
    }
    return list.sort((a, b) => b.dateObj - a.dateObj);
  }

  // ---------- Styles ----------
  function AccountsStyles() {
    return (
      <style>{`
        /* Grid de cards */
        .acc-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
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
          width: 24px; height: 24px;
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
        .acc-balance-hidden { letter-spacing: .12em; font-size: 22px; color: var(--text-muted); }

        /* Grade de ações — botões 80x70, raio 5px, gap 8px lateral e inferior */
        .acc-actions-grid {
          display: grid;
          grid-template-columns: repeat(3, 80px);
          gap: 8px;
          justify-content: center;
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
        .acc-action-ic { display: flex; align-items: center; justify-content: center; }
        .acc-action-label { font-size: var(--type-xs); font-weight: 600; letter-spacing: .04em; }

        .acc-nature {
          text-align: center;
          font-size: var(--type-xs); font-weight: 700; letter-spacing: .14em;
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

        .acc-field { display: flex; flex-direction: column; gap: 4px; }
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
        .stm-period-row {
          position: relative;
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px;
          background: var(--surface-3);
          border: 1px solid var(--border);
          border-radius: 10px;
          flex-wrap: wrap;
        }
        [data-theme="dark"] .stm-period-row { background: #1a1f25; border-color: #262c34; }

        /* Sliding active pill */
        .stm-period-pill {
          position: absolute;
          top: 4px;
          bottom: 4px;
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
          grid-template-columns: 110px minmax(0, 2fr) minmax(140px, 1fr) 120px 140px;
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
          .stm-row { grid-template-columns: 90px minmax(0, 1.6fr) 110px 130px; }
          .stm-row > div:nth-child(3) { display: none; }
        }
      `}</style>);

  }

  // ---------- Exports ----------
  function FinAccounts() {return <AccountsPage />;}
  Object.assign(window, { FinAccounts });
})();