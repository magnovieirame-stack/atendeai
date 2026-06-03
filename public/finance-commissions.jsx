// finance-commissions.jsx — Gestão de Comissionamento
// Página completa: dashboard, lista de comissões, regras, pagamentos.
// Segue o mesmo design system: cards, tabs, drawers, sliding-pill filter,
// row cards com borda lateral, badges, dark/light mode.

(function() {
  const { Ic, Drawer, Modal, Avatar, Page } = window;

  // ---------- Helpers ----------
  const fmtBRL = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtBRLcompact = (v) => {
    const n = Number(v) || 0;
    if (n >= 1_000_000) return 'R$ ' + (n / 1_000_000).toFixed(1).replace('.', ',') + ' Mi';
    if (n >= 10_000) return 'R$ ' + (n / 1_000).toFixed(1).replace('.', ',') + ' mil';
    return fmtBRL(n);
  };
  const fmtPct = (v) => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + '%';
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);

  // ---------- Mock data ----------
  const TEAMS = ['Equipe Alpha', 'Equipe Beta', 'Equipe Gamma'];
  const SELLERS = [
    { id: 's1', name: 'Karla Zambelly',     team: 'Equipe Alpha' },
    { id: 's2', name: 'Paulo Henrique',     team: 'Equipe Alpha' },
    { id: 's3', name: 'Francisco Junior',   team: 'Equipe Beta' },
    { id: 's4', name: 'Mariana Costa',      team: 'Equipe Beta' },
    { id: 's5', name: 'Rafael Oliveira',    team: 'Equipe Gamma' },
    { id: 's6', name: 'Beatriz Lima',       team: 'Equipe Gamma' },
  ];
  const TYPE_LABELS = {
    percentual:    { label: 'Percentual',     icon: 'reports',         accent: '#10b981' },
    fixa:          { label: 'Valor Fixo',     icon: 'dollar',          accent: '#0ea5e9' },
    meta:          { label: 'Por Meta',       icon: 'star',            accent: '#f59e0b' },
    progressiva:   { label: 'Progressiva',    icon: 'reports',         accent: '#f97316' },
    equipe:        { label: 'Por Equipe',     icon: 'users',           accent: '#6366f1' },
    individual:    { label: 'Individual',     icon: 'user',            accent: '#8b5cf6' },
    produto:       { label: 'Por Produto',    icon: 'package',         accent: '#06b6d4' },
    campanha:      { label: 'Por Campanha',   icon: 'megaphone',       accent: '#ec4899' },
    recorrencia:   { label: 'Recorrência',    icon: 'repeat',          accent: '#14b8a6' },
    indicacao:     { label: 'Indicação',      icon: 'user',       accent: '#a855f7' },
  };
  const STATUS_LABELS = {
    pendente:  { label: 'Pendente',  bg: '#3b82f6', soft: '#dbeafe', text: '#1d4ed8', icon: 'clock' },
    aprovada:  { label: 'Aprovada',  bg: '#10b981', soft: '#d1fae5', text: '#047857', icon: 'check' },
    paga:      { label: 'Paga',      bg: '#14b8a6', soft: '#ccfbf1', text: '#0f766e', icon: 'check-double' },
    bloqueada: { label: 'Bloqueada', bg: '#f59e0b', soft: '#fef3c7', text: '#b45309', icon: 'shield' },
    cancelada: { label: 'Cancelada', bg: '#ef4444', soft: '#fee2e2', text: '#b91c1c', icon: 'x' },
  };

  const MOCK_RULES = [
    { id: 'r1', name: 'Comissão padrão de venda',   type: 'percentual',  percent: 8,  fixed: 0,    team: 'Equipe Alpha', sellers: ['s1','s2'], status: 'ativa',  priority: 1, start: '2026-01-01', end: '2026-12-31', desc: '8% sobre o valor da venda concretizada.' },
    { id: 'r2', name: 'Meta trimestral premium',     type: 'meta',        percent: 0,  fixed: 1500, team: 'Equipe Beta',  sellers: ['s3','s4'], status: 'ativa',  priority: 2, start: '2026-04-01', end: '2026-06-30', desc: 'R$ 1.500 ao bater R$ 50.000 em vendas no trimestre.' },
    { id: 'r3', name: 'Progressiva — vendas',        type: 'progressiva', percent: 0,  fixed: 0,    team: 'Equipe Gamma', sellers: ['s5','s6'], status: 'ativa',  priority: 3, start: '2026-01-01', end: '2026-12-31', desc: 'Até 20k = 5% · 20–50k = 8% · acima = 12%.', tiers: [{ from: 0, to: 20000, pct: 5 }, { from: 20000, to: 50000, pct: 8 }, { from: 50000, to: null, pct: 12 }] },
    { id: 'r4', name: 'Campanha Black Friday',       type: 'campanha',    percent: 12, fixed: 0,    team: '',             sellers: [],          status: 'pausada', priority: 4, start: '2026-11-20', end: '2026-11-30', desc: 'Campanha sazonal · todos os vendedores · 12%.' },
    { id: 'r5', name: 'Indicação cliente novo',      type: 'indicacao',   percent: 0,  fixed: 250,  team: '',             sellers: [],          status: 'ativa',  priority: 5, start: '2026-01-01', end: '2026-12-31', desc: 'R$ 250 por cliente novo trazido via indicação.' },
    { id: 'r6', name: 'Comissão produto premium',    type: 'produto',     percent: 15, fixed: 0,    team: 'Equipe Alpha', sellers: [],          status: 'ativa',  priority: 6, start: '2026-03-01', end: '2026-12-31', desc: '15% sobre venda da linha Premium.' },
  ];

  // generate commissions
  const MOCK_COMMISSIONS = (() => {
    const base = [
      { seller: 's1', saleValue: 12450.00, sale: 'Venda #35088451', ruleId: 'r1', date: '15/04/2026', status: 'paga'      },
      { seller: 's1', saleValue:  8900.00, sale: 'Venda #35088460', ruleId: 'r1', date: '18/04/2026', status: 'aprovada'  },
      { seller: 's2', saleValue: 15200.00, sale: 'Venda #35088471', ruleId: 'r1', date: '20/04/2026', status: 'pendente'  },
      { seller: 's2', saleValue:  6750.00, sale: 'Venda #35088482', ruleId: 'r6', date: '22/04/2026', status: 'aprovada'  },
      { seller: 's3', saleValue: 58000.00, sale: 'Meta Q2 atingida', ruleId: 'r2', date: '12/04/2026', status: 'paga'      },
      { seller: 's3', saleValue: 11400.00, sale: 'Venda #35088488', ruleId: 'r1', date: '23/04/2026', status: 'pendente'  },
      { seller: 's4', saleValue: 22500.00, sale: 'Venda #35088495', ruleId: 'r3', date: '24/04/2026', status: 'aprovada'  },
      { seller: 's4', saleValue:  3200.00, sale: 'Venda #35088501', ruleId: 'r5', date: '25/04/2026', status: 'bloqueada' },
      { seller: 's5', saleValue: 19800.00, sale: 'Venda #35088510', ruleId: 'r3', date: '18/04/2026', status: 'paga'      },
      { seller: 's5', saleValue: 41200.00, sale: 'Venda #35088514', ruleId: 'r3', date: '22/04/2026', status: 'aprovada'  },
      { seller: 's6', saleValue:  7600.00, sale: 'Indicação — Lucas Mendes', ruleId: 'r5', date: '14/04/2026', status: 'paga' },
      { seller: 's6', saleValue: 13800.00, sale: 'Venda #35088522', ruleId: 'r1', date: '24/04/2026', status: 'pendente'  },
      { seller: 's2', saleValue:  4200.00, sale: 'Venda #35088528', ruleId: 'r6', date: '26/04/2026', status: 'cancelada' },
      { seller: 's4', saleValue:  9100.00, sale: 'Venda #35088534', ruleId: 'r1', date: '27/04/2026', status: 'pendente'  },
    ];
    return base.map((b, i) => {
      const rule = MOCK_RULES.find(r => r.id === b.ruleId);
      let commission = 0;
      let pct = 0;
      if (rule) {
        if (rule.type === 'percentual' || rule.type === 'campanha' || rule.type === 'produto') {
          pct = rule.percent;
          commission = b.saleValue * (rule.percent / 100);
        } else if (rule.type === 'meta' || rule.type === 'indicacao') {
          commission = rule.fixed;
        } else if (rule.type === 'progressiva' && rule.tiers) {
          const tier = rule.tiers.find(t => b.saleValue >= t.from && (t.to == null || b.saleValue < t.to)) || rule.tiers[0];
          pct = tier.pct;
          commission = b.saleValue * (tier.pct / 100);
        }
      }
      return {
        id: 'c' + (i + 1).toString().padStart(3, '0'),
        ...b,
        rule,
        pct,
        commission,
      };
    });
  })();

  // ---------- Period filter (sliding pill) ----------
  const PERIOD_OPTIONS = [
    { id: 'todos', label: 'TODOS', icon: 'check-double' },
    { id: 'mes',   label: 'MÊS',   icon: 'calendar' },
    { id: '7d',    label: '07', sub: 'DIAS' },
    { id: '15d',   label: '15', sub: 'DIAS' },
    { id: '30d',   label: '30', sub: 'DIAS' },
    { id: 'periodo', label: 'DATA', icon: 'calendar' },
  ];

  function PeriodFilter({ value, onChange, fromDate, toDate, setFromDate, setToDate }) {
    const rowRef = React.useRef(null);
    const btnRefs = React.useRef({});
    const [pill, setPill] = React.useState({ x: 0, w: 0, ready: false });
    const updatePill = React.useCallback(() => {
      const row = rowRef.current; const btn = btnRefs.current[value];
      if (!row || !btn) { setPill(p => ({ ...p, ready: false })); return; }
      const rRect = row.getBoundingClientRect();
      const bRect = btn.getBoundingClientRect();
      setPill({ x: bRect.left - rRect.left, w: bRect.width, ready: true });
    }, [value]);
    React.useLayoutEffect(() => { updatePill(); }, [updatePill]);
    React.useEffect(() => {
      const onR = () => updatePill();
      window.addEventListener('resize', onR);
      return () => window.removeEventListener('resize', onR);
    }, [updatePill]);
    return (
      <div className="com-period">
        <div className="com-period-row" ref={rowRef}>
          <span className="com-period-pill"
            style={{ transform: `translateX(${pill.x}px)`, width: pill.w ? pill.w + 'px' : 0, opacity: pill.ready ? 1 : 0 }} />
          {PERIOD_OPTIONS.filter(opt => opt.id !== 'periodo').map(opt => (
            <button key={opt.id} ref={el => { btnRefs.current[opt.id] = el; }} type="button"
              className={'com-period-btn' + (value === opt.id ? ' on' : '')}
              onClick={() => onChange(opt.id)} title={opt.label}>
              {opt.icon && <span className="com-period-ic"><Ic name={opt.icon} size={15} /></span>}
              <span className="com-period-num">{opt.label}</span>
              {opt.sub && <span className="com-period-sub">{opt.sub}</span>}
            </button>
          ))}
        </div>
        <div className="com-period-dates">
          <DateRangeField from={fromDate} to={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); onChange('periodo'); }} placeholder="Período" className="com-period-range" />
        </div>
      </div>
    );
  }

  // ---------- KPI Card ----------
  function ComKpi({ label, value, sub, tone = 'neutral', icon, trend }) {
    return (
      <div className={'com-kpi com-kpi-' + tone}>
        <div className="com-kpi-top">
          <span className="com-kpi-ic"><Ic name={icon} size={16} /></span>
          <span className="com-kpi-label">{label}</span>
        </div>
        <div className="com-kpi-value tnum">{value}</div>
        {sub && <div className="com-kpi-sub">{sub}</div>}
        {trend != null && (
          <div className={'com-kpi-trend ' + (trend >= 0 ? 'is-pos' : 'is-neg')}>
            <Ic name={trend >= 0 ? 'arrow-up-right' : 'arrow-down-to-line'} size={11} />
            {(trend >= 0 ? '+' : '') + fmtPct(trend)}
          </div>
        )}
      </div>
    );
  }

  // ---------- Status / Type pills ----------
  function StatusPill({ status }) {
    const m = STATUS_LABELS[status] || STATUS_LABELS.pendente;
    return (
      <span className="com-status" style={{ background: m.soft, color: m.text }}>
        <Ic name={m.icon} size={11} /> {m.label}
      </span>
    );
  }
  function TypePill({ type, compact }) {
    const m = TYPE_LABELS[type] || { label: type, icon: 'reports', accent: 'var(--text-muted)' };
    return (
      <span className="com-type" style={{ '--type-accent': m.accent }}>
        <Ic name={m.icon} size={11} /> {compact ? m.label.split(' ')[0] : m.label}
      </span>
    );
  }

  // ---------- Empty / Loading ----------
  function EmptyState({ icon = 'reports', title, sub, actionLabel, onAction }) {
    return (
      <div className="com-empty">
        <span className="com-empty-ic"><Ic name={icon} size={32} /></span>
        <div className="com-empty-title">{title}</div>
        {sub && <div className="com-empty-sub">{sub}</div>}
        {actionLabel && <button className="btn btn-primary" onClick={onAction}><Ic name="plus" size={13} /> {actionLabel}</button>}
      </div>
    );
  }
  function SkeletonRow() {
    return (
      <div className="com-skel-row">
        <div className="com-skel-line" style={{ width: '24%' }} />
        <div className="com-skel-line" style={{ width: '18%' }} />
        <div className="com-skel-line" style={{ width: '14%' }} />
        <div className="com-skel-line" style={{ width: '12%' }} />
        <div className="com-skel-line" style={{ width: '14%' }} />
        <div className="com-skel-line" style={{ width: '10%' }} />
      </div>
    );
  }

  // ---------- Toast / inline confirmation ----------
  function useToast() {
    const [toast, setToast] = React.useState(null);
    const timer = React.useRef(null);
    const show = React.useCallback((msg, tone = 'success') => {
      setToast({ msg, tone });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setToast(null), 2800);
    }, []);
    const node = toast && (
      <div className={'com-toast com-toast-' + toast.tone} role="status">
        <Ic name={toast.tone === 'success' ? 'circle-check' : 'alert'} size={14} />
        {toast.msg}
      </div>
    );
    return { show, node };
  }

  // ---------- Tabs (sliding pill) ----------
  function Tabs({ tabs, value, onChange }) {
    const rowRef = React.useRef(null);
    const btnRefs = React.useRef({});
    const [pill, setPill] = React.useState({ x: 0, w: 0, ready: false });

    const updatePill = React.useCallback(() => {
      const row = rowRef.current;
      const btn = btnRefs.current[value];
      if (!row || !btn) { setPill(p => ({ ...p, ready: false })); return; }
      const rRect = row.getBoundingClientRect();
      const bRect = btn.getBoundingClientRect();
      setPill({ x: bRect.left - rRect.left, w: bRect.width, ready: true });
    }, [value]);

    React.useLayoutEffect(() => { updatePill(); }, [updatePill]);
    React.useEffect(() => {
      const onR = () => updatePill();
      window.addEventListener('resize', onR);
      return () => window.removeEventListener('resize', onR);
    }, [updatePill]);

    return (
      <div className="com-tabs" role="tablist" ref={rowRef}>
        <span
          className="com-tabs-pill"
          style={{
            transform: `translateX(${pill.x}px)`,
            width: pill.w ? pill.w + 'px' : 0,
            opacity: pill.ready ? 1 : 0,
          }}
          aria-hidden="true"
        />
        {tabs.map(t => (
          <button
            key={t.id}
            ref={el => { btnRefs.current[t.id] = el; }}
            className={'com-tab' + (value === t.id ? ' on' : '')}
            role="tab"
            aria-selected={value === t.id}
            onClick={() => onChange(t.id)}
          >
            <Ic name={t.icon} size={13} /> {t.label}
            {t.count != null && <span className="com-tab-count">{t.count}</span>}
          </button>
        ))}
      </div>
    );
  }

  // ---------- Main page ----------
  function FinCommissions() {
    const { show: showToast, node: toastNode } = useToast();
    const [tab, setTab] = React.useState('dashboard'); // dashboard | comissoes | regras | pagamentos
    const [tabDir, setTabDir] = React.useState('right'); // animation direction
    const TAB_ORDER = ['dashboard', 'comissoes', 'regras', 'pagamentos'];
    const setTabAnimated = React.useCallback((next) => {
      setTab(prev => {
        const a = TAB_ORDER.indexOf(prev), b = TAB_ORDER.indexOf(next);
        setTabDir(b > a ? 'right' : 'left');
        return next;
      });
    }, []);
    const [commissions, setCommissions] = React.useState(MOCK_COMMISSIONS.slice());
    const [rules, setRules] = React.useState(MOCK_RULES.slice());
    const [drawerComm, setDrawerComm] = React.useState(null);
    const [drawerRule, setDrawerRule] = React.useState(null);
    const [drawerSeller, setDrawerSeller] = React.useState(null);
    const [confirmGroupPay, setConfirmGroupPay] = React.useState(null); // seller group object
    const [confirmGroupAction, setConfirmGroupAction] = React.useState(null); // { group, action: 'pay' | 'cancel' }
    const [showPayModal, setShowPayModal] = React.useState(false);
    const [confirmRule, setConfirmRule] = React.useState(null); // { rule, action: 'delete' | 'suspend' | 'activate' }
    const [confirmComm, setConfirmComm] = React.useState(null); // { commission, action: 'cancel' | 'pay' }
    const [loading, setLoading] = React.useState(true);

    // Simulate initial load
    React.useEffect(() => {
      const t = setTimeout(() => setLoading(false), 600);
      return () => clearTimeout(t);
    }, []);

    // KPI computation
    const kpis = React.useMemo(() => {
      const total = commissions.reduce((s, c) => s + c.commission, 0);
      const paga = commissions.filter(c => c.status === 'paga').reduce((s, c) => s + c.commission, 0);
      const pendente = commissions.filter(c => c.status === 'pendente' || c.status === 'aprovada').reduce((s, c) => s + c.commission, 0);
      const prevista = commissions.filter(c => c.status !== 'cancelada' && c.status !== 'bloqueada').reduce((s, c) => s + c.commission, 0);
      const vendedores = new Set(commissions.map(c => c.seller)).size;
      const porEquipe = {};
      commissions.forEach(c => {
        const s = SELLERS.find(s => s.id === c.seller);
        if (!s) return;
        porEquipe[s.team] = (porEquipe[s.team] || 0) + c.commission;
      });
      const topEquipe = Object.entries(porEquipe).sort((a, b) => b[1] - a[1])[0];
      const media = vendedores > 0 ? total / vendedores : 0;
      return { total, paga, pendente, prevista, vendedores, topEquipe, media, porEquipe };
    }, [commissions]);

    const updateCommission = (id, patch) => {
      setCommissions(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    };

    return (
      <Page
        title="Gestão de Comissionamento"
        subtitle="Controle regras, metas, pagamentos e comissões de vendedores e equipes."
        actions={
          <></>
        }
      >
        <CommissionsStyles />
        {/* Make the .page.scroll wrapper into a flex column with no external scroll —
            tabs stay fixed on top and the active tab content owns the internal scroll. */}
        <style>{`.page.scroll:has(> .com-shell) { display: flex; flex-direction: column; overflow: hidden !important; padding: var(--pad-4) 36px 16px !important; }`}</style>

        <div className="com-shell">
          {/* Fixed top: tabs */}
          <Tabs
            tabs={[
              { id: 'dashboard',  label: 'Dashboard',  icon: 'dashboard', count: null },
              { id: 'comissoes',  label: 'Comissões',  icon: 'reports',   count: commissions.length },
              { id: 'regras',     label: 'Regras',     icon: 'flag',      count: rules.length },
              { id: 'pagamentos', label: 'Pagamentos', icon: 'dollar',    count: commissions.filter(c => c.status === 'aprovada' || c.status === 'pendente').length },
            ]}
            value={tab}
            onChange={setTabAnimated}
          />

          {/* Scrollable tab body */}
          <div className="com-tab-body">
            <div key={tab} className={'com-tab-anim com-tab-anim-' + tabDir}>
              {tab === 'dashboard' && (
                <DashboardTab
                  commissions={commissions}
                  rules={rules}
                  kpis={kpis}
                />
              )}
              {tab === 'comissoes' && (
                <CommissionsTab
                  loading={loading}
                  commissions={commissions}
                  onOpen={c => setDrawerComm(c)}
                />
              )}
              {tab === 'regras' && (
                <RulesTab
                  loading={loading}
                  rules={rules}
                  onCreate={() => setDrawerRule({ id: null })}
                  onOpen={r => setDrawerRule(r)}
                  onAction={(rule, action) => setConfirmRule({ rule, action })}
                />
              )}
              {tab === 'pagamentos' && (
                <PaymentsTab
                  commissions={commissions}
                  onPay={() => setShowPayModal(true)}
                  updateCommission={updateCommission}
                  showToast={showToast}
                  onOpen={g => setDrawerSeller(g)}
                  onConfirmPay={g => setConfirmGroupPay(g)}
                />
              )}
            </div>
          </div>
        </div>

        {drawerSeller && (() => {
          // Recompute the group from the latest commissions so cancel/pay updates the drawer live
          const liveItems = commissions.filter(c => c.seller === drawerSeller.seller.id && (c.status === 'aprovada' || c.status === 'pendente'));
          if (liveItems.length === 0) {
            // Auto-close the drawer if everything was paid/cancelled
            setTimeout(() => setDrawerSeller(null), 0);
            return null;
          }
          const liveGroup = {
            seller: drawerSeller.seller,
            items: liveItems,
            total: liveItems.reduce((s, c) => s + c.commission, 0),
          };
          return (
            <SellerGroupDrawer
              group={liveGroup}
              onClose={() => setDrawerSeller(null)}
              onOpenCommission={(c) => { setDrawerComm(c); }}
              onPayAll={() => {
                liveGroup.items.forEach(c => updateCommission(c.id, { status: 'paga', paidAt: todayISO }));
                showToast(`${liveGroup.items.length} comissão(ões) pagas para ${liveGroup.seller.name}`);
                setDrawerSeller(null);
              }}
              onCancelMany={(items) => {
                if (items.length === 0) return;
                setConfirmGroupAction({ group: { ...liveGroup, items }, action: 'cancel' });
              }}
              onPayMany={(items) => {
                if (items.length === 0) return;
                setConfirmGroupAction({ group: { ...liveGroup, items }, action: 'pay' });
              }}
              showToast={showToast}
            />
          );
        })()}

        {drawerComm && (
          <CommissionDetailDrawer
            commission={drawerComm}
            onClose={() => setDrawerComm(null)}
            onUpdate={(patch) => { updateCommission(drawerComm.id, patch); setDrawerComm(c => ({ ...c, ...patch })); }}
            onConfirm={(action) => setConfirmComm({ commission: drawerComm, action })}
            onEdit={() => { /* edit hook — open same drawer in edit mode (placeholder) */ showToast('Modo de edição em breve', 'success'); }}
            showToast={showToast}
          />
        )}
        {drawerRule && (
          <RuleDrawer
            rule={drawerRule}
            onClose={() => setDrawerRule(null)}
            onSave={(r) => {
              if (drawerRule.id) {
                setRules(prev => prev.map(x => x.id === drawerRule.id ? { ...x, ...r } : x));
                showToast('Regra atualizada com sucesso');
              } else {
                setRules(prev => [{ ...r, id: 'r' + (prev.length + 1), status: 'ativa', priority: prev.length + 1 }, ...prev]);
                showToast('Nova regra criada');
              }
              setDrawerRule(null);
            }}
          />
        )}
        {showPayModal && (
          <PayCommissionsModal
            commissions={commissions.filter(c => c.status === 'aprovada' || c.status === 'pendente')}
            onClose={() => setShowPayModal(false)}
            onPay={(ids, info) => {
              setCommissions(prev => prev.map(c => ids.includes(c.id) ? { ...c, status: 'paga', paidAt: info.date, payMethod: info.method, payNote: info.note } : c));
              setShowPayModal(false);
              showToast(`${ids.length} comissão(ões) paga(s) com sucesso`);
            }}
          />
        )}

        {confirmGroupPay && (
          <PayGroupConfirmModal
            group={confirmGroupPay}
            onClose={() => setConfirmGroupPay(null)}
            onConfirm={(info) => {
              confirmGroupPay.items.forEach(c => updateCommission(c.id, { status: 'paga', paidAt: info.date, payMethod: info.method, payNote: info.note }));
              showToast(`${confirmGroupPay.items.length} comissão(ões) pagas para ${confirmGroupPay.seller.name}`, 'success');
              setConfirmGroupPay(null);
            }}
          />
        )}

        {confirmGroupAction && confirmGroupAction.action === 'pay' && (
          <PayGroupConfirmModal
            group={confirmGroupAction.group}
            onClose={() => setConfirmGroupAction(null)}
            onConfirm={(info) => {
              confirmGroupAction.group.items.forEach(c => updateCommission(c.id, { status: 'paga', paidAt: info.date, payMethod: info.method, payNote: info.note }));
              showToast(`${confirmGroupAction.group.items.length} comissão(ões) pagas`, 'success');
              setConfirmGroupAction(null);
            }}
          />
        )}

        {confirmGroupAction && confirmGroupAction.action === 'cancel' && (
          <ConfirmModal
            tone="danger"
            title="Cancelar comissões?"
            message={`${confirmGroupAction.group.items.length} comissão(ões) selecionada(s) de ${confirmGroupAction.group.seller.name} serão marcadas como canceladas. A ação pode ser revertida manualmente.`}
            confirmLabel={`Sim, cancelar ${confirmGroupAction.group.items.length}`}
            onConfirm={() => {
              confirmGroupAction.group.items.forEach(c => updateCommission(c.id, { status: 'cancelada' }));
              showToast(`${confirmGroupAction.group.items.length} comissão(ões) cancelada(s)`, 'success');
              setConfirmGroupAction(null);
            }}
            onClose={() => setConfirmGroupAction(null)}
          />
        )}

        {confirmRule && (
          <ConfirmModal
            tone={confirmRule.action === 'delete' ? 'danger' : confirmRule.action === 'suspend' ? 'warn' : 'success'}
            title={
              confirmRule.action === 'delete'   ? 'Excluir regra?' :
              confirmRule.action === 'suspend'  ? 'Suspender regra?' :
              'Reativar regra?'
            }
            message={
              confirmRule.action === 'delete'
                ? `A regra "${confirmRule.rule.name}" será removida. Comissões já calculadas não serão afetadas, mas novas vendas deixarão de gerar comissão por essa regra.`
                : confirmRule.action === 'suspend'
                ? `A regra "${confirmRule.rule.name}" ficará pausada e novas vendas não gerarão comissão até ela ser reativada.`
                : `A regra "${confirmRule.rule.name}" voltará a estar ativa e novas vendas voltarão a gerar comissão por ela.`
            }
            confirmLabel={
              confirmRule.action === 'delete'   ? 'Sim, excluir' :
              confirmRule.action === 'suspend'  ? 'Suspender' :
              'Reativar'
            }
            onConfirm={() => {
              if (confirmRule.action === 'delete') {
                setRules(prev => prev.filter(r => r.id !== confirmRule.rule.id));
                showToast('Regra excluída', 'success');
              } else if (confirmRule.action === 'suspend') {
                setRules(prev => prev.map(r => r.id === confirmRule.rule.id ? { ...r, status: 'pausada' } : r));
                showToast('Regra suspensa', 'success');
              } else {
                setRules(prev => prev.map(r => r.id === confirmRule.rule.id ? { ...r, status: 'ativa' } : r));
                showToast('Regra reativada', 'success');
              }
              setConfirmRule(null);
            }}
            onClose={() => setConfirmRule(null)}
          />
        )}

        {confirmComm && (() => {
          const cfg = (() => {
            switch (confirmComm.action) {
              case 'cancel':
                return {
                  tone: 'danger',
                  title: 'Cancelar comissão?',
                  message: 'Esta comissão será marcada como cancelada. A ação pode ser revertida manualmente.',
                  confirmLabel: 'Sim, cancelar',
                  apply: () => ({ status: 'cancelada' }),
                  toast: 'Comissão cancelada',
                };
              case 'pay':
                return {
                  tone: 'success',
                  title: 'Pagar comissão?',
                  message: `Marcar a comissão de ${fmtBRL(confirmComm.commission.commission)} como paga?`,
                  confirmLabel: 'Pagar agora',
                  apply: () => ({ status: 'paga', paidAt: todayISO }),
                  toast: 'Comissão paga',
                };
              case 'approve':
                return {
                  tone: 'success',
                  title: 'Aprovar comissão?',
                  message: `A comissão de ${fmtBRL(confirmComm.commission.commission)} ficará liberada para pagamento.`,
                  confirmLabel: 'Sim, aprovar',
                  apply: () => ({ status: 'aprovada' }),
                  toast: 'Comissão aprovada',
                };
              case 'block':
                return {
                  tone: 'warn',
                  title: 'Bloquear comissão?',
                  message: 'A comissão ficará bloqueada para revisão e não poderá ser paga até ser liberada.',
                  confirmLabel: 'Sim, bloquear',
                  apply: () => ({ status: 'bloqueada' }),
                  toast: 'Comissão bloqueada',
                };
              case 'release':
                return {
                  tone: 'success',
                  title: 'Liberar comissão?',
                  message: 'A comissão voltará para o status pendente e poderá ser analisada novamente.',
                  confirmLabel: 'Liberar',
                  apply: () => ({ status: 'pendente' }),
                  toast: 'Comissão liberada',
                };
              default:
                return null;
            }
          })();
          if (!cfg) return null;
          return (
            <ConfirmModal
              tone={cfg.tone}
              title={cfg.title}
              message={cfg.message}
              confirmLabel={cfg.confirmLabel}
              onConfirm={() => {
                const patch = cfg.apply();
                updateCommission(confirmComm.commission.id, patch);
                setDrawerComm(c => c ? { ...c, ...patch } : c);
                showToast(cfg.toast, 'success');
                setConfirmComm(null);
              }}
              onClose={() => setConfirmComm(null)}
            />
          );
        })()}

        {toastNode}
      </Page>
    );
  }

  // ---------- Charts (lightweight, system-styled) ----------
  function BarsByTeam({ data, total }) {
    const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return <div className="com-empty-mini">Sem dados</div>;
    const max = Math.max(...entries.map(([, v]) => v));
    return (
      <div className="com-bars">
        {entries.map(([k, v]) => (
          <div key={k} className="com-bar-row">
            <span className="com-bar-label">{k}</span>
            <div className="com-bar-track">
              <span className="com-bar-fill" style={{ width: (max > 0 ? (v / max) * 100 : 0) + '%' }} />
            </div>
            <span className="com-bar-value tnum">{fmtBRLcompact(v)}</span>
          </div>
        ))}
      </div>
    );
  }
  function SplitBar({ parts }) {
    const total = parts.reduce((s, p) => s + p.value, 0);
    if (total === 0) return <div className="com-empty-mini">Sem dados</div>;
    return (
      <div className="com-split">
        <div className="com-split-bar">
          {parts.map((p, i) => (
            <span key={i} className="com-split-seg" style={{ width: (p.value / total) * 100 + '%', background: p.color }} title={`${p.label}: ${fmtBRLcompact(p.value)}`} />
          ))}
        </div>
        <div className="com-split-legend">
          {parts.map((p, i) => (
            <span key={i} className="com-split-leg">
              <span className="com-split-dot" style={{ background: p.color }} />
              <span className="com-split-leg-l">{p.label}</span>
              <span className="com-split-leg-v tnum">{fmtBRLcompact(p.value)}</span>
            </span>
          ))}
        </div>
      </div>
    );
  }
  function TopSellers({ commissions }) {
    const map = {};
    commissions.forEach(c => { map[c.seller] = (map[c.seller] || 0) + c.commission; });
    const top = Object.entries(map).map(([id, v]) => ({ seller: SELLERS.find(s => s.id === id), value: v }))
      .filter(x => x.seller).sort((a, b) => b.value - a.value).slice(0, 4);
    const max = Math.max(...top.map(t => t.value), 1);
    return (
      <div className="com-top">
        {top.map((t, i) => (
          <div key={i} className="com-top-row">
            <span className="com-top-rank">#{i + 1}</span>
            <Avatar name={t.seller.name} size="sm" />
            <div className="com-top-mid">
              <div className="com-top-name">{t.seller.name}</div>
              <div className="com-top-team muted">{t.seller.team}</div>
            </div>
            <div className="com-top-bar"><span style={{ width: (t.value / max) * 100 + '%' }} /></div>
            <span className="com-top-val tnum">{fmtBRLcompact(t.value)}</span>
          </div>
        ))}
      </div>
    );
  }

  // ---------- Tab: Dashboard ----------
  function DashboardTab({ commissions, rules, kpis }) {
    const [period, setPeriod] = React.useState('mes');
    const [from, setFrom] = React.useState(todayISO);
    const [to, setTo] = React.useState(todayISO);
    const [team, setTeam] = React.useState('todos');

    // Extra metrics for the dashboard
    const aprovada = commissions.filter(c => c.status === 'aprovada').reduce((s, c) => s + c.commission, 0);
    const pendenteRaw = commissions.filter(c => c.status === 'pendente').reduce((s, c) => s + c.commission, 0);
    const bloqueada = commissions.filter(c => c.status === 'bloqueada').reduce((s, c) => s + c.commission, 0);
    const ticketMedio = commissions.length > 0 ? commissions.reduce((s, c) => s + c.saleValue, 0) / commissions.length : 0;
    const taxaPagamento = kpis.total > 0 ? (kpis.paga / kpis.total) * 100 : 0;
    const regrasAtivas = rules.filter(r => r.status === 'ativa').length;
    const previstaProx = kpis.total * 1.08;
    const metaMes = 75000;
    const metaPct = kpis.total > 0 ? Math.min(100, (kpis.paga / metaMes) * 100) : 0;

    return (
      <div className="com-dash">
        {/* Dashboard filter */}
        <div className="card com-dash-filter">
          <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
            <span style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>Período</span>
            <PeriodFilter value={period} onChange={setPeriod} fromDate={from} toDate={to} setFromDate={setFrom} setToDate={setTo} />
            <select className="com-select" value={team} onChange={e => setTeam(e.target.value)}>
              <option value="todos">Todas equipes</option>
              {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button className="btn"><Ic name="download" size={13} /> Exportar</button>
        </div>

        {/* KPI strip — 6 main metrics */}
        <div className="com-kpi-grid">
          <ComKpi tone="brand"     icon="reports"      label="TOTAL DE COMISSÕES"   value={fmtBRLcompact(kpis.total)}     sub={`${commissions.length} registros · abril/26`} />
          <ComKpi tone="paga"      icon="check-double" label="PAGAS"                value={fmtBRLcompact(kpis.paga)}      sub={`${commissions.filter(c=>c.status==='paga').length} comissões`} />
          <ComKpi tone="pendente"  icon="clock"        label="A PAGAR"              value={fmtBRLcompact(kpis.pendente)}  sub={`${commissions.filter(c=>c.status==='pendente'||c.status==='aprovada').length} pendentes`} />
          <ComKpi tone="prev"      icon="star"         label="PREVISTA NO MÊS"      value={fmtBRLcompact(kpis.prevista)}  sub="Excluindo bloqueadas/canceladas" />
          <ComKpi tone="team"      icon="users"        label="VENDEDORES"           value={String(kpis.vendedores)}       sub={kpis.topEquipe ? `Top equipe: ${kpis.topEquipe[0]}` : '—'} />
          <ComKpi tone="avg"       icon="user"         label="MÉDIA POR VENDEDOR"   value={fmtBRLcompact(kpis.media)}     sub="Comissão média no período" />
        </div>

        {/* Secondary KPI strip — extras */}
        <div className="com-kpi-grid com-kpi-grid-sm">
          <ComKpi tone="brand"   icon="reports"      label="TICKET MÉDIO"          value={fmtBRLcompact(ticketMedio)} sub="Valor médio das vendas" />
          <ComKpi tone="paga"    icon="check-double" label="TAXA PAGAMENTO"        value={taxaPagamento.toFixed(1).replace('.', ',') + '%'} sub={`${commissions.filter(c=>c.status==='paga').length} / ${commissions.length}`} />
          <ComKpi tone="pendente" icon="shield"      label="BLOQUEADAS"            value={fmtBRLcompact(bloqueada)} sub={`${commissions.filter(c=>c.status==='bloqueada').length} comissões`} />
          <ComKpi tone="prev"    icon="reports"      label="PREVISTA PRÓX. MÊS"   value={fmtBRLcompact(previstaProx)} sub="Estimativa (+8%)" />
          <ComKpi tone="team"    icon="flag"         label="REGRAS ATIVAS"         value={String(regrasAtivas) + ' / ' + rules.length} sub="Em uso no momento" />
          <ComKpi tone="avg"     icon="star"         label="META DO MÊS"           value={fmtBRLcompact(metaMes)} sub={`${metaPct.toFixed(0)}% atingido`} />
        </div>

        {/* Meta progress bar */}
        <div className="card com-meta-card">
          <div className="com-meta-h">
            <div>
              <div className="com-meta-label">Progresso da meta · Abril 2026</div>
              <div className="com-meta-sub muted">{fmtBRL(kpis.paga)} de {fmtBRL(metaMes)}</div>
            </div>
            <div className="com-meta-pct">{metaPct.toFixed(1)}%</div>
          </div>
          <div className="com-meta-bar">
            <span className="com-meta-fill" style={{ width: metaPct + '%' }} />
            <span className="com-meta-marker" style={{ left: '100%' }} title="Meta" />
          </div>
        </div>

        {/* Charts row */}
        <div className="com-charts">
          <div className="card com-chart-card">
            <div className="com-chart-h">
              <span className="com-chart-title"><Ic name="reports" size={14} /> Comissão por equipe</span>
              <span className="muted" style={{ fontSize: 11 }}>abril/26</span>
            </div>
            <BarsByTeam data={kpis.porEquipe} total={kpis.total} />
          </div>
          <div className="card com-chart-card">
            <div className="com-chart-h">
              <span className="com-chart-title"><Ic name="reports" size={14} /> Distribuição</span>
              <span className="muted" style={{ fontSize: 11 }}>pago × pendente</span>
            </div>
            <SplitBar
              parts={[
                { label: 'Paga',      value: kpis.paga,  color: '#10b981' },
                { label: 'Aprovada',  value: aprovada,   color: '#3b82f6' },
                { label: 'Pendente',  value: pendenteRaw, color: '#f59e0b' },
                { label: 'Bloqueada', value: bloqueada,  color: '#ef4444' },
              ]}
            />
          </div>
          <div className="card com-chart-card">
            <div className="com-chart-h">
              <span className="com-chart-title"><Ic name="reports" size={14} /> Top vendedores</span>
              <span className="muted" style={{ fontSize: 11 }}>por comissão</span>
            </div>
            <TopSellers commissions={commissions} />
          </div>
        </div>
      </div>
    );
  }

  // ---------- Confirmation Modal ----------
  function ConfirmModal({ title, message, confirmLabel, onConfirm, onClose, tone = 'danger' }) {
    return (
      <Modal
        title={title}
        size="sm"
        onClose={onClose}
        footer={(close) =>
          <>
            <button className="btn" onClick={() => close()}>Cancelar</button>
            <span className="spacer" style={{ flex: 1 }} />
            <button className={'btn ' + (tone === 'danger' ? 'btn-delete' : tone === 'warn' ? 'btn-warn' : 'btn-save')} onClick={() => close(onConfirm)}>
              <Ic name={tone === 'danger' ? 'trash' : tone === 'warn' ? 'alert' : 'check'} size={12} /> {confirmLabel}
            </button>
          </>
        }
      >
        <div className="com-confirm">
          <span className={'com-confirm-ic com-confirm-' + tone}>
            <Ic name={tone === 'danger' ? 'alert' : tone === 'warn' ? 'shield' : 'check'} size={22} />
          </span>
          <div className="com-confirm-msg">{message}</div>
        </div>
      </Modal>
    );
  }

  // ---------- Tab: Comissões (list) ----------
  function CommissionsTab({ loading, commissions, onOpen }) {
    const [period, setPeriod] = React.useState('mes');
    const [from, setFrom] = React.useState(todayISO);
    const [to, setTo] = React.useState(todayISO);
    const [query, setQuery] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('todos');
    const [teamFilter, setTeamFilter] = React.useState('todos');
    const [sort, setSort] = React.useState({ col: 'date', dir: 'desc' });
    const [page, setPage] = React.useState(1);
    const PAGE_SIZE = 10;
    const [selected, setSelected] = React.useState(new Set());

    const filtered = React.useMemo(() => {
      const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return commissions.filter(c => {
        const seller = SELLERS.find(s => s.id === c.seller);
        if (statusFilter !== 'todos' && c.status !== statusFilter) return false;
        if (teamFilter !== 'todos' && (!seller || seller.team !== teamFilter)) return false;
        if (q) {
          const hay = ((seller && seller.name) + ' ' + c.sale + ' ' + c.id + ' ' + (c.rule && c.rule.name || '')).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (!hay.includes(q)) return false;
        }
        return true;
      }).sort((a, b) => {
        const dir = sort.dir === 'asc' ? 1 : -1;
        if (sort.col === 'commission') return (a.commission - b.commission) * dir;
        if (sort.col === 'saleValue') return (a.saleValue - b.saleValue) * dir;
        if (sort.col === 'seller') {
          const sa = (SELLERS.find(s => s.id === a.seller) || {}).name || '';
          const sb = (SELLERS.find(s => s.id === b.seller) || {}).name || '';
          return sa.localeCompare(sb) * dir;
        }
        if (sort.col === 'date') {
          const da = a.date.split('/').reverse().join('-');
          const db = b.date.split('/').reverse().join('-');
          return da.localeCompare(db) * dir;
        }
        return 0;
      });
    }, [commissions, query, statusFilter, teamFilter, sort]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    React.useEffect(() => { setPage(1); }, [query, statusFilter, teamFilter]);

    const toggleSel = (id) => {
      setSelected(prev => {
        const n = new Set(prev);
        if (n.has(id)) n.delete(id); else n.add(id);
        return n;
      });
    };
    const toggleAll = () => {
      setSelected(prev => {
        if (slice.every(c => prev.has(c.id))) {
          const n = new Set(prev);
          slice.forEach(c => n.delete(c.id));
          return n;
        }
        const n = new Set(prev);
        slice.forEach(c => n.add(c.id));
        return n;
      });
    };

    const setSortCol = (col) => setSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'desc' });

    return (
      <>
        {/* Toolbar */}
        <div className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: 240, maxWidth: 420 }}>
              <Ic name="search" size={13} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
              <input className="input" placeholder="Buscar vendedor, venda, regra..." value={query} onChange={e => setQuery(e.target.value)} style={{ paddingLeft: 36 }} />
              {query && (
                <button onClick={() => setQuery('')} className="btn btn-ghost btn-icon" style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 26, height: 26 }}>
                  <Ic name="x" size={12} />
                </button>
              )}
            </div>
            <PeriodFilter value={period} onChange={setPeriod} fromDate={from} toDate={to} setFromDate={setFrom} setToDate={setTo} />
            <select className="com-select" value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
              <option value="todos">Todas equipes</option>
              {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700, marginRight: 4 }}>Status:</span>
            {[
              { id: 'todos', label: 'Todos', dot: null },
              { id: 'pendente', label: 'Pendente', dot: '#3b82f6' },
              { id: 'aprovada', label: 'Aprovada', dot: '#10b981' },
              { id: 'paga', label: 'Paga', dot: '#14b8a6' },
              { id: 'bloqueada', label: 'Bloqueada', dot: '#f59e0b' },
              { id: 'cancelada', label: 'Cancelada', dot: '#ef4444' },
            ].map(s => (
              <button key={s.id} className={'com-stat-pill' + (statusFilter === s.id ? ' on' : '')} onClick={() => setStatusFilter(s.id)}>
                {s.dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: s.dot, display: 'inline-block' }} />}
                {s.label}
              </button>
            ))}
            {selected.size > 0 && (
              <div className="com-bulk">
                <span><strong>{selected.size}</strong> selecionadas</span>
                <button className="btn btn-sm"><Ic name="check" size={12} /> Aprovar</button>
                <button className="btn btn-sm"><Ic name="dollar" size={12} /> Pagar</button>
                <button className="btn btn-sm" onClick={() => setSelected(new Set())}><Ic name="x" size={12} /> Limpar</button>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="card com-list-wrap">
          <div className="com-list-head">
            <div className="com-th com-th-check">
              <input type="checkbox" onChange={toggleAll} checked={slice.length > 0 && slice.every(c => selected.has(c.id))} />
            </div>
            <SortHead col="seller" sort={sort} onClick={() => setSortCol('seller')}>Vendedor / Equipe</SortHead>
            <div className="com-th">Tipo</div>
            <SortHead col="saleValue" sort={sort} onClick={() => setSortCol('saleValue')}>Venda / Valor</SortHead>
            <div className="com-th">% Aplicado</div>
            <SortHead col="commission" sort={sort} onClick={() => setSortCol('commission')}>Comissão</SortHead>
            <div className="com-th">Status</div>
            <SortHead col="date" sort={sort} onClick={() => setSortCol('date')}>Data</SortHead>
            <div className="com-th com-th-actions" style={{ textAlign: 'right' }}>Ações</div>
          </div>

          {loading ? (
            <div className="com-list">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : slice.length === 0 ? (
            <EmptyState icon="reports" title="Nenhuma comissão encontrada" sub="Ajuste os filtros ou crie uma nova regra." />
          ) : (
            <div className="com-list">
              {slice.map(c => {
                const seller = SELLERS.find(s => s.id === c.seller);
                const tipoAccent = (TYPE_LABELS[c.rule && c.rule.type] || {}).accent || '#10b981';
                return (
                  <div key={c.id} className={'com-row' + (selected.has(c.id) ? ' is-selected' : '')} style={{ '--row-accent': tipoAccent }} onClick={() => onOpen(c)}>
                    <div className="com-td com-td-check" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSel(c.id)} />
                    </div>
                    <div className="com-td com-td-seller">
                      <Avatar name={seller ? seller.name : '—'} size="sm" />
                      <div style={{ minWidth: 0 }}>
                        <div className="com-seller-name">{seller ? seller.name : '—'}</div>
                        <div className="muted" style={{ fontSize: 11 }}>{seller ? seller.team : '—'}</div>
                      </div>
                    </div>
                    <div className="com-td"><TypePill type={c.rule && c.rule.type} compact /></div>
                    <div className="com-td">
                      <div className="com-sale-title">{c.sale}</div>
                      <div className="muted tnum" style={{ fontSize: 11 }}>{fmtBRL(c.saleValue)}</div>
                    </div>
                    <div className="com-td tnum">{c.pct > 0 ? c.pct.toFixed(1) + '%' : '—'}</div>
                    <div className="com-td tnum com-commission">{fmtBRL(c.commission)}</div>
                    <div className="com-td"><StatusPill status={c.status} /></div>
                    <div className="com-td muted tnum" style={{ fontSize: 12 }}>{c.date}</div>
                    <div className="com-td com-td-actions" onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-icon" title="Ver detalhes" onClick={() => onOpen(c)}>
                        <Ic name="chevron-right" size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!loading && slice.length > 0 && (
            <div className="com-pagination">
              <span className="muted" style={{ fontSize: 12 }}>
                Mostrando <strong>{(page - 1) * PAGE_SIZE + 1}</strong>–<strong>{Math.min(page * PAGE_SIZE, filtered.length)}</strong> de <strong>{filtered.length}</strong>
              </span>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn btn-sm" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}><Ic name="chevron-left" size={12} /> Anterior</button>
                <span className="com-page-num">{page} / {totalPages}</span>
                <button className="btn btn-sm" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Próxima <Ic name="chevron-right" size={12} /></button>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  function SortHead({ col, sort, onClick, children }) {
    const active = sort.col === col;
    return (
      <button className={'com-th com-th-sort' + (active ? ' is-active' : '')} onClick={onClick}>
        {children}
        <Ic name={active ? (sort.dir === 'asc' ? 'chevron-up' : 'chevron-down') : 'chevron-down'} size={11} />
      </button>
    );
  }

  // ---------- Tab: Regras ----------
  function RulesTab({ loading, rules, onCreate, onOpen, onAction }) {
    const [query, setQuery] = React.useState('');
    const [type, setType] = React.useState('todos');
    const filtered = rules.filter(r => {
      if (type !== 'todos' && r.type !== type) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!(r.name.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q))) return false;
      }
      return true;
    });

    return (
      <>
        <div className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: 240, maxWidth: 420 }}>
            <Ic name="search" size={13} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
            <input className="input" placeholder="Buscar regra..." value={query} onChange={e => setQuery(e.target.value)} style={{ paddingLeft: 36 }} />
          </div>
          <select className="com-select" value={type} onChange={e => setType(e.target.value)}>
            <option value="todos">Todos os tipos</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <span className="spacer" style={{ flex: 1 }} />
          <button className="fin-new-btn" onClick={onCreate} aria-label="Nova Regra"><span className="fin-new-label">{'Nova Regra\u00A0'}</span><span className="fin-new-plus" style={{ width: "38px", height: "38px" }}><Ic name="plus" size={18} /></span></button>
        </div>

        {loading ? (
          <div className="com-rules-grid">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="com-rule-skeleton" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="flag" title="Sem regras cadastradas" sub="Crie uma regra para começar a calcular comissões automaticamente." actionLabel="Criar Nova Regra" onAction={onCreate} />
        ) : (
          <div className="com-rules-grid">
            {filtered.map(r => {
              const t = TYPE_LABELS[r.type] || {};
              return (
                <div key={r.id} className="com-rule-card" style={{ '--rule-accent': t.accent }}>
                  <button type="button" className="com-rule-body" onClick={() => onOpen(r)}>
                    <div className="com-rule-h">
                      <span className="com-rule-ic"><Ic name={t.icon} size={16} /></span>
                      <span className={'com-rule-status ' + (r.status === 'ativa' ? 'is-on' : 'is-off')}>
                        <span className="dot" /> {r.status === 'ativa' ? 'Ativa' : 'Pausada'}
                      </span>
                    </div>
                    <div className="com-rule-title">{r.name}</div>
                    <div className="com-rule-desc">{r.desc}</div>
                    <div className="com-rule-foot">
                      <TypePill type={r.type} />
                      {r.team && <span className="com-rule-meta"><Ic name="users" size={11} /> {r.team}</span>}
                      {r.sellers && r.sellers.length > 0 && <span className="com-rule-meta"><Ic name="user" size={11} /> {r.sellers.length} vend.</span>}
                    </div>
                  </button>
                  <div className="com-rule-actions">
                    <button className="com-rule-act" title="Editar" onClick={() => onOpen(r)}>
                      <Ic name="edit" size={12} /> Editar
                    </button>
                    {r.status === 'ativa' ? (
                      <button className="com-rule-act" title="Suspender" onClick={() => onAction(r, 'suspend')}>
                        <Ic name="pause-circle" size={12} /> Suspender
                      </button>
                    ) : (
                      <button className="com-rule-act is-pos" title="Reativar" onClick={() => onAction(r, 'activate')}>
                        <Ic name="play" size={12} /> Reativar
                      </button>
                    )}
                    <button className="com-rule-act is-danger" title="Excluir" onClick={() => onAction(r, 'delete')}>
                      <Ic name="trash" size={12} /> Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  }

  // ---------- Tab: Pagamentos ----------
  function PaymentsTab({ commissions, onPay, updateCommission, showToast, onOpen, onConfirmPay }) {
    const [q, setQ] = React.useState('');
    const pendentes = commissions.filter(c => c.status === 'pendente' || c.status === 'aprovada');
    const total = pendentes.reduce((s, c) => s + c.commission, 0);
    const porVendedor = {};
    pendentes.forEach(c => {
      const s = SELLERS.find(s => s.id === c.seller);
      if (!s) return;
      if (!porVendedor[s.id]) porVendedor[s.id] = { seller: s, items: [], total: 0 };
      porVendedor[s.id].items.push(c);
      porVendedor[s.id].total += c.commission;
    });
    const allGroups = Object.values(porVendedor).sort((a, b) => b.total - a.total);
    const groups = q.trim()
      ? allGroups.filter(g => g.seller.name.toLowerCase().includes(q.trim().toLowerCase()))
      : allGroups;

    return (
      <>
        <div className="card com-pay-summary">
          <div>
            <div className="com-pay-label">Total a pagar</div>
            <div className="com-pay-total tnum">{fmtBRL(total)}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{pendentes.length} comissão(ões) · {groups.length} vendedor(es)</div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" disabled={pendentes.length === 0}><Ic name="download" size={13} /> Exportar relatório</button>
            <button className="btn btn-primary" disabled={pendentes.length === 0} onClick={onPay}>
              <Ic name="dollar" size={13} /> Pagar todas
            </button>
          </div>
        </div>

        <div className="row" style={{ position: 'relative', margin: '4px 0 2px' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', pointerEvents: 'none' }}><Ic name="search" size={15} /></span>
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar comissão pelo nome do vendedor..."
            style={{ width: '100%', height: 38, paddingLeft: 34 }} />
        </div>

        {groups.length === 0 ? (
          q.trim()
            ? <EmptyState icon="search" title="Nenhuma comissão encontrada" sub={`Nenhum vendedor corresponde a "${q.trim()}".`} />
            : <EmptyState icon="check-circle" title="Tudo em dia!" sub="Não há comissões pendentes de pagamento." />
        ) : (
          <div className="com-pay-groups">
            {groups.map(g => (
              <button
                key={g.seller.id}
                type="button"
                className="card com-pay-group"
                onClick={() => onOpen && onOpen(g)}
              >
                <div className="com-pay-group-h">
                  <Avatar name={g.seller.name} size="sm" />
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <div style={{ fontWeight: 600 }}>{g.seller.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{g.seller.team} · {g.items.length} comissão(ões)</div>
                  </div>
                  <div className="com-pay-group-total tnum">{fmtBRL(g.total)}</div>
                </div>
                <div className="com-pay-group-summary">
                  <div className="com-pay-summary-l">
                    <span className="com-pay-chip">
                      <Ic name="reports" size={11} />
                      <strong>{g.items.length}</strong> {g.items.length === 1 ? 'Venda' : 'Vendas'}
                    </span>
                    <span className="com-pay-chip">
                      <Ic name="user" size={11} />
                      <strong>1</strong> Vendedor
                    </span>
                    <span className="com-pay-chip is-muted">
                      <Ic name="users" size={11} />
                      <strong>1</strong> Equipe
                    </span>
                    <span className="com-pay-group-hint muted">
                      <Ic name="chevron-right" size={11} /> Clique para ver detalhes
                    </span>
                  </div>
                  <div className="com-pay-summary-r">
                    <span className="com-pay-chip is-warn">
                      <Ic name="clock" size={11} />
                      <strong>{g.items.filter(c => c.status === 'pendente').length}</strong> Pendentes
                    </span>
                    <span className="com-pay-chip is-pos">
                      <Ic name="check" size={11} />
                      <strong>{g.items.filter(c => c.status === 'aprovada').length}</strong> Aprovadas
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </>
    );
  }

  // ---------- Drawer: Commission detail ----------
  function CommissionDetailDrawer({ commission, onClose, onUpdate, onConfirm, onEdit, showToast }) {
    const seller = SELLERS.find(s => s.id === commission.seller);
    const rule = commission.rule;
    const [note, setNote] = React.useState(commission.note || '');
    const [timeline] = React.useState([
      { date: commission.date, label: 'Comissão gerada', icon: 'plus', tone: 'neutral' },
      ...(commission.status === 'aprovada' || commission.status === 'paga' ? [{ date: commission.date, label: 'Aprovada pelo gestor', icon: 'check', tone: 'success' }] : []),
      ...(commission.status === 'paga' ? [{ date: commission.paidAt || commission.date, label: 'Pagamento efetuado', icon: 'dollar', tone: 'success' }] : []),
      ...(commission.status === 'bloqueada' ? [{ date: commission.date, label: 'Bloqueada para revisão', icon: 'shield', tone: 'warn' }] : []),
      ...(commission.status === 'cancelada' ? [{ date: commission.date, label: 'Cancelada', icon: 'x', tone: 'danger' }] : []),
    ]);

    const calc = (() => {
      if (!rule) return [];
      const lines = [];
      lines.push({ label: 'Valor da venda', value: fmtBRL(commission.saleValue) });
      lines.push({ label: 'Regra aplicada', value: rule.name });
      if (rule.type === 'percentual' || rule.type === 'campanha' || rule.type === 'produto') {
        lines.push({ label: 'Percentual', value: rule.percent.toFixed(1) + '%' });
        lines.push({ label: 'Cálculo', value: fmtBRL(commission.saleValue) + ' × ' + rule.percent + '% = ' + fmtBRL(commission.commission) });
      } else if (rule.type === 'meta' || rule.type === 'indicacao') {
        lines.push({ label: 'Valor fixo', value: fmtBRL(rule.fixed) });
      } else if (rule.type === 'progressiva') {
        lines.push({ label: 'Faixa aplicada', value: commission.pct.toFixed(1) + '%' });
        lines.push({ label: 'Cálculo', value: fmtBRL(commission.saleValue) + ' × ' + commission.pct + '% = ' + fmtBRL(commission.commission) });
      }
      return lines;
    })();

    return (
      <Drawer
        title={`Comissão ${commission.id.toUpperCase()}`}
        subtitle={seller ? seller.name + ' · ' + seller.team : ''}
        onClose={onClose}
        width={680}
        footer={
          <>
            <button className="btn" onClick={onEdit}><Ic name="edit" size={12} /> Editar</button>
            {commission.status === 'pendente' && (
              <>
                <button className="btn" onClick={() => onConfirm('cancel')}><Ic name="x" size={12} /> Cancelar</button>
                <button className="btn" onClick={() => onConfirm('block')}><Ic name="shield" size={12} /> Bloquear</button>
                <span className="spacer" style={{ flex: 1 }} />
                <button className="btn btn-primary" onClick={() => onConfirm('approve')}><Ic name="check" size={12} /> Aprovar</button>
              </>
            )}
            {commission.status === 'aprovada' && (
              <>
                <button className="btn" onClick={() => onConfirm('cancel')}><Ic name="x" size={12} /> Cancelar</button>
                <button className="btn" onClick={() => onConfirm('block')}><Ic name="shield" size={12} /> Bloquear</button>
                <span className="spacer" style={{ flex: 1 }} />
                <button className="btn btn-primary" onClick={() => onConfirm('pay')}><Ic name="dollar" size={12} /> Pagar comissão</button>
              </>
            )}
            {commission.status === 'bloqueada' && (
              <>
                <span className="spacer" style={{ flex: 1 }} />
                <button className="btn btn-primary" onClick={() => onConfirm('release')}><Ic name="check" size={12} /> Liberar para análise</button>
              </>
            )}
            {(commission.status === 'paga' || commission.status === 'cancelada') && (
              <>
                <span className="spacer" style={{ flex: 1 }} />
                <button className="btn" onClick={onClose}>Fechar</button>
              </>
            )}
          </>
        }
      >
        <div className="com-dt">
          {/* Big value */}
          <div className="com-dt-hero">
            <div className="com-dt-hero-l">
              <div className="muted" style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700 }}>Valor da comissão</div>
              <div className="com-dt-amount tnum">{fmtBRL(commission.commission)}</div>
              <StatusPill status={commission.status} />
            </div>
            <div className="com-dt-hero-r">
              <Avatar name={seller ? seller.name : '—'} />
              <div>
                <div style={{ fontWeight: 600 }}>{seller ? seller.name : '—'}</div>
                <div className="muted" style={{ fontSize: 12 }}>{seller ? seller.team : '—'}</div>
              </div>
            </div>
          </div>

          {/* Cálculo */}
          <div className="com-dt-card">
            <div className="com-dt-title"><Ic name="reports" size={12} /> Cálculo</div>
            <div className="com-dt-calc">
              {calc.map((l, i) => (
                <div key={i} className="com-dt-calc-row">
                  <span className="muted">{l.label}</span>
                  <span className="tnum" style={{ fontWeight: 500 }}>{l.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Regra */}
          {rule && (
            <div className="com-dt-card">
              <div className="com-dt-title"><Ic name="rules" size={12} /> Regra aplicada</div>
              <div className="row" style={{ gap: 10 }}>
                <TypePill type={rule.type} />
                <span style={{ fontWeight: 500 }}>{rule.name}</span>
              </div>
              <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>{rule.desc}</div>
            </div>
          )}

          {/* Timeline */}
          <div className="com-dt-card">
            <div className="com-dt-title"><Ic name="clock" size={12} /> Histórico</div>
            <div className="com-tl">
              {timeline.map((it, i) => (
                <div key={i} className={'com-tl-row com-tl-' + it.tone}>
                  <span className="com-tl-dot"><Ic name={it.icon} size={10} /></span>
                  <div className="com-tl-mid">
                    <div className="com-tl-label">{it.label}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{it.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Observações */}
          <div className="com-dt-card">
            <div className="com-dt-title"><Ic name="note" size={12} /> Observações</div>
            <textarea className="input" placeholder="Adicionar nota interna..." value={note} onChange={e => setNote(e.target.value)} rows={3} />
          </div>
        </div>
      </Drawer>
    );
  }

  // ---------- Drawer: Rule create / edit ----------
  function RuleDrawer({ rule, onClose, onSave }) {
    const isEdit = !!rule.id;
    const [form, setForm] = React.useState({
      name: rule.name || '',
      desc: rule.desc || '',
      type: rule.type || 'percentual',
      percent: rule.percent || 0,
      fixed: rule.fixed || 0,
      team: rule.team || '',
      sellers: rule.sellers || [],
      start: rule.start || todayISO,
      end: rule.end || '',
      meta: rule.meta || 0,
      tiers: rule.tiers || [{ from: 0, to: 20000, pct: 5 }, { from: 20000, to: 50000, pct: 8 }, { from: 50000, to: null, pct: 12 }],
      priority: rule.priority || 1,
    });

    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const canSave = form.name.trim().length > 1;

    const setTier = (i, k, v) => setForm(f => ({ ...f, tiers: f.tiers.map((t, idx) => idx === i ? { ...t, [k]: v } : t) }));
    const addTier = () => setForm(f => ({ ...f, tiers: [...f.tiers, { from: 0, to: null, pct: 0 }] }));
    const rmTier = (i) => setForm(f => ({ ...f, tiers: f.tiers.filter((_, idx) => idx !== i) }));

    return (
      <Drawer
        title={isEdit ? 'Editar regra' : 'Nova regra de comissão'}
        subtitle="Defina como a comissão será calculada e a quem se aplica"
        onClose={onClose}
        width={720}
        footer={(close) =>
          <>
            <button className="btn" onClick={() => close()}>Cancelar</button>
            <span className="spacer" style={{ flex: 1 }} />
            <button className="btn btn-save" disabled={!canSave} onClick={() => close(() => onSave(form))}>
              <Ic name="check" size={12} /> {isEdit ? 'Salvar alterações' : 'Criar regra'}
            </button>
          </>
        }
      >
        <div className="com-rd">
          {/* Type picker */}
          <div className="com-rd-section">
            <div className="com-rd-h">Tipo da comissão</div>
            <div className="com-type-grid">
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <button key={k} type="button"
                  className={'com-type-pick' + (form.type === k ? ' on' : '')}
                  style={{ '--type-accent': v.accent }}
                  onClick={() => setField('type', k)}>
                  <span className="com-type-pick-ic"><Ic name={v.icon} size={14} /></span>
                  <span>{v.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Basic info */}
          <div className="com-rd-section">
            <div className="com-rd-h">Informações</div>
            <div className="col" style={{ gap: 10 }}>
              <div>
                <label className="label">Nome da regra *</label>
                <input className="input" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Ex.: Comissão padrão de venda" />
              </div>
              <div>
                <label className="label">Descrição</label>
                <textarea className="input" rows={2} value={form.desc} onChange={e => setField('desc', e.target.value)} placeholder="Como essa comissão funciona..." />
              </div>
              <div className="row" style={{ gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label className="label">Prioridade</label>
                  <input className="input" type="number" min={1} value={form.priority} onChange={e => setField('priority', Number(e.target.value))} />
                </div>
                <div style={{ flex: 2 }}>
                  <label className="label">Equipe vinculada</label>
                  <select className="com-select" style={{ width: '100%', height: 36 }} value={form.team} onChange={e => setField('team', e.target.value)}>
                    <option value="">Sem equipe (todas)</option>
                    {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic fields by type */}
          <div className="com-rd-section">
            <div className="com-rd-h">Parâmetros</div>
            {(form.type === 'percentual' || form.type === 'campanha' || form.type === 'produto') && (
              <div className="row" style={{ gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label className="label">Percentual aplicado</label>
                  <div className="com-suffix-input">
                    <input className="input" type="number" min={0} max={100} step={0.1} value={form.percent} onChange={e => setField('percent', Number(e.target.value))} />
                    <span>%</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="label">Meta mínima (opcional)</label>
                  <div className="com-suffix-input">
                    <span>R$</span>
                    <input className="input" type="number" min={0} value={form.meta} onChange={e => setField('meta', Number(e.target.value))} />
                  </div>
                </div>
              </div>
            )}

            {(form.type === 'fixa' || form.type === 'meta' || form.type === 'indicacao') && (
              <div className="row" style={{ gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label className="label">Valor fixo da comissão</label>
                  <div className="com-suffix-input">
                    <span>R$</span>
                    <input className="input" type="number" min={0} step={0.01} value={form.fixed} onChange={e => setField('fixed', Number(e.target.value))} />
                  </div>
                </div>
                {form.type === 'meta' && (
                  <div style={{ flex: 1 }}>
                    <label className="label">Meta a bater</label>
                    <div className="com-suffix-input">
                      <span>R$</span>
                      <input className="input" type="number" min={0} value={form.meta} onChange={e => setField('meta', Number(e.target.value))} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {form.type === 'progressiva' && (
              <div className="col" style={{ gap: 8 }}>
                <label className="label">Faixas progressivas</label>
                {form.tiers.map((t, i) => (
                  <div key={i} className="com-tier">
                    <div className="com-tier-grid">
                      <div className="com-suffix-input"><span>R$</span><input className="input" type="number" value={t.from} onChange={e => setTier(i, 'from', Number(e.target.value))} placeholder="de" /></div>
                      <div className="com-suffix-input"><span>até</span><input className="input" type="number" value={t.to == null ? '' : t.to} onChange={e => setTier(i, 'to', e.target.value === '' ? null : Number(e.target.value))} placeholder="∞" /></div>
                      <div className="com-suffix-input"><input className="input" type="number" step={0.1} value={t.pct} onChange={e => setTier(i, 'pct', Number(e.target.value))} placeholder="%" /><span>%</span></div>
                    </div>
                    <button className="btn btn-ghost btn-icon" onClick={() => rmTier(i)} title="Remover"><Ic name="trash" size={12} /></button>
                  </div>
                ))}
                <button className="btn btn-sm" onClick={addTier}><Ic name="plus" size={11} /> Adicionar faixa</button>
              </div>
            )}

            {(form.type === 'equipe' || form.type === 'recorrencia') && (
              <div className="row" style={{ gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label className="label">Percentual</label>
                  <div className="com-suffix-input"><input className="input" type="number" min={0} max={100} step={0.1} value={form.percent} onChange={e => setField('percent', Number(e.target.value))} /><span>%</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Validity */}
          <div className="com-rd-section">
            <div className="com-rd-h">Validade</div>
            <div className="row" style={{ gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label className="label">Início</label>
                <DateField value={form.start} onChange={e => setField('start', e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="label">Fim</label>
                <DateField value={form.end} onChange={e => setField('end', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Vendedores */}
          <div className="com-rd-section">
            <div className="com-rd-h">Vendedores vinculados</div>
            <div className="com-sellers-grid">
              {SELLERS.filter(s => !form.team || s.team === form.team).map(s => {
                const on = form.sellers.includes(s.id);
                return (
                  <button key={s.id} type="button" className={'com-seller-pick' + (on ? ' on' : '')}
                    onClick={() => setField('sellers', on ? form.sellers.filter(x => x !== s.id) : [...form.sellers, s.id])}>
                    <Avatar name={s.name} size="sm" />
                    <span style={{ flex: 1, textAlign: 'left' }}>
                      <span style={{ display: 'block', fontWeight: 500, fontSize: 13 }}>{s.name}</span>
                      <span className="muted" style={{ fontSize: 11 }}>{s.team}</span>
                    </span>
                    {on && <span className="com-seller-on"><Ic name="check" size={11} /></span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Drawer>
    );
  }

  // ---------- Drawer: Seller group (payments) ----------
  function SellerGroupDrawer({ group, onClose, onOpenCommission, onPayAll, onCancelMany, onPayMany, showToast }) {
    const seller = group.seller;
    const items = group.items;
    const [selected, setSelected] = React.useState(() => new Set());

    // Keep selection in sync as items change live
    React.useEffect(() => {
      setSelected(prev => new Set([...prev].filter(id => items.some(c => c.id === id))));
    }, [items]);

    const toggle = (id) => setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
    const allChecked = items.length > 0 && items.every(c => selected.has(c.id));
    const someChecked = items.some(c => selected.has(c.id));
    const toggleAll = () => setSelected(allChecked ? new Set() : new Set(items.map(c => c.id)));

    const selectedItems = items.filter(c => selected.has(c.id));
    const selectedTotal = selectedItems.reduce((s, c) => s + c.commission, 0);

    const totalPag = items.reduce((s, c) => s + c.commission, 0);
    const aprovadas = items.filter(c => c.status === 'aprovada');
    const pendentes = items.filter(c => c.status === 'pendente');

    return (
      <Drawer
        title={seller.name}
        subtitle={`${seller.team} · ${items.length} comissão(ões) pendente(s)`}
        onClose={onClose}
        width={680}
        leftHead={<Avatar name={seller.name} />}
        footer={
          <>
            <button className="btn" onClick={onClose}>Fechar</button>
            <span className="spacer" style={{ flex: 1 }} />
            <button
              className="btn"
              disabled={selectedItems.length === 0}
              onClick={() => onCancelMany(selectedItems)}
            >
              <Ic name="x" size={12} /> Cancelar ({selectedItems.length})
            </button>
            <button
              className="btn btn-primary"
              disabled={selectedItems.length === 0}
              onClick={() => onPayMany(selectedItems)}
            >
              <Ic name="dollar" size={12} /> Pagar {selectedItems.length > 0 ? fmtBRL(selectedTotal) : ''} ({selectedItems.length})
            </button>
          </>
        }
      >
        <div className="com-sg">
          {/* Hero */}
          <div className="com-sg-hero">
            <div className="com-sg-hero-l">
              <div className="muted" style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700 }}>Total a pagar</div>
              <div className="com-sg-amount tnum">{fmtBRL(totalPag)}</div>
            </div>
            <div className="com-sg-hero-r">
              <div className="com-sg-stat">
                <div className="com-sg-stat-v tnum">{aprovadas.length}</div>
                <div className="com-sg-stat-l muted">Aprovadas</div>
              </div>
              <div className="com-sg-stat">
                <div className="com-sg-stat-v tnum">{pendentes.length}</div>
                <div className="com-sg-stat-l muted">Pendentes</div>
              </div>
              <div className="com-sg-stat">
                <div className="com-sg-stat-v tnum">{items.length}</div>
                <div className="com-sg-stat-l muted">Total</div>
              </div>
            </div>
          </div>

          {/* Commissions list with row checkbox + clickable row to open details */}
          <div className="com-sg-card">
            <div className="com-sg-list-head">
              <label className="com-sg-checkall">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={el => { if (el) el.indeterminate = !allChecked && someChecked; }}
                  onChange={toggleAll}
                />
                <span>Marcar todas</span>
              </label>
              <div className="com-sg-title" style={{ marginLeft: 'auto' }}>
                <Ic name="reports" size={12} /> {selectedItems.length} de {items.length} selecionada(s)
              </div>
            </div>

            <div className="com-sg-list">
              {items.map(c => {
                const accent = (TYPE_LABELS[c.rule && c.rule.type] || {}).accent || '#10b981';
                const isOn = selected.has(c.id);
                return (
                  <div key={c.id} className={'com-sg-item' + (isOn ? ' is-checked' : '')} style={{ '--row-accent': accent }}>
                    <label className="com-sg-check" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isOn} onChange={() => toggle(c.id)} />
                    </label>
                    <button type="button" className="com-sg-item-body" onClick={() => onOpenCommission(c)}>
                      <div className="com-sg-item-l">
                        <div className="com-sg-item-sale">{c.sale}</div>
                        <div className="row" style={{ gap: 6, alignItems: 'center', marginTop: 4 }}>
                          <TypePill type={c.rule && c.rule.type} compact />
                          <StatusPill status={c.status} />
                          <span className="muted" style={{ fontSize: 11 }}>{c.date}</span>
                          {c.pct > 0 && <span className="muted" style={{ fontSize: 11 }}>· {c.pct.toFixed(1)}%</span>}
                        </div>
                      </div>
                      <div className="com-sg-item-r">
                        <div className="muted" style={{ fontSize: 11 }}>Venda</div>
                        <div className="tnum" style={{ fontSize: 12 }}>{fmtBRL(c.saleValue)}</div>
                        <div className="com-sg-item-val tnum">{fmtBRL(c.commission)}</div>
                      </div>
                      <span className="com-sg-item-cta" aria-hidden="true">
                        <Ic name="chevron-right" size={14} />
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary card */}
          <div className="com-sg-card">
            <div className="com-sg-title"><Ic name="user" size={12} /> Resumo do vendedor</div>
            <div className="com-sg-resume">
              <div className="com-sg-resume-row">
                <span className="muted">Equipe</span>
                <span>{seller.team}</span>
              </div>
              <div className="com-sg-resume-row">
                <span className="muted">Comissões aprovadas</span>
                <span className="tnum">{fmtBRL(aprovadas.reduce((s, c) => s + c.commission, 0))} · {aprovadas.length}</span>
              </div>
              <div className="com-sg-resume-row">
                <span className="muted">Comissões pendentes</span>
                <span className="tnum">{fmtBRL(pendentes.reduce((s, c) => s + c.commission, 0))} · {pendentes.length}</span>
              </div>
              <div className="com-sg-resume-row">
                <span className="muted">Total bruto vendido</span>
                <span className="tnum">{fmtBRL(items.reduce((s, c) => s + c.saleValue, 0))}</span>
              </div>
            </div>
          </div>
        </div>
      </Drawer>
    );
  }

  // ---------- Modal: Pay group confirmation ----------
  function PayGroupConfirmModal({ group, onClose, onConfirm }) {
    const [date, setDate] = React.useState(todayISO);
    const [method, setMethod] = React.useState('PIX');
    const [note, setNote] = React.useState('');
    const total = group.items.reduce((s, c) => s + c.commission, 0);
    const aprovadas = group.items.filter(c => c.status === 'aprovada');
    const pendentes = group.items.filter(c => c.status === 'pendente');

    return (
      <Modal
        title="Confirmar pagamento"
        size="lg"
        onClose={onClose}
        footer={
          <>
            <button className="btn" onClick={onClose}>Cancelar</button>
            <span className="spacer" style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={() => onConfirm({ date, method, note })}>
              <Ic name="dollar" size={12} /> Confirmar pagamento · {fmtBRL(total)}
            </button>
          </>
        }
      >
        <div className="com-pgc">
          {/* Hero: seller + total */}
          <div className="com-pgc-hero">
            <div className="com-pgc-hero-l">
              <Avatar name={group.seller.name} />
              <div>
                <div className="com-pgc-name">{group.seller.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>{group.seller.team}</div>
              </div>
            </div>
            <div className="com-pgc-hero-r">
              <div className="muted" style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700 }}>Total a pagar</div>
              <div className="com-pgc-total tnum">{fmtBRL(total)}</div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="com-pgc-stats">
            <div className="com-pgc-stat">
              <div className="com-pgc-stat-v tnum">{group.items.length}</div>
              <div className="com-pgc-stat-l muted">Comissões</div>
            </div>
            <div className="com-pgc-stat">
              <div className="com-pgc-stat-v tnum">{aprovadas.length}</div>
              <div className="com-pgc-stat-l muted">Aprovadas</div>
            </div>
            <div className="com-pgc-stat">
              <div className="com-pgc-stat-v tnum">{pendentes.length}</div>
              <div className="com-pgc-stat-l muted">Pendentes</div>
            </div>
            <div className="com-pgc-stat">
              <div className="com-pgc-stat-v tnum">{fmtBRLcompact(group.items.reduce((s, c) => s + c.saleValue, 0))}</div>
              <div className="com-pgc-stat-l muted">Vendas</div>
            </div>
          </div>

          {/* Detail list of commissions to be paid */}
          <div className="com-pgc-card">
            <div className="com-pgc-title"><Ic name="reports" size={12} /> Comissões neste pagamento</div>
            <div className="com-pgc-list">
              {group.items.map(c => {
                const accent = (TYPE_LABELS[c.rule && c.rule.type] || {}).accent || '#10b981';
                return (
                  <div key={c.id} className="com-pgc-row" style={{ '--row-accent': accent }}>
                    <div className="com-pgc-row-l">
                      <div className="com-pgc-row-sale">{c.sale}</div>
                      <div className="row" style={{ gap: 6, alignItems: 'center', marginTop: 3 }}>
                        <TypePill type={c.rule && c.rule.type} compact />
                        <StatusPill status={c.status} />
                        <span className="muted" style={{ fontSize: 11 }}>{c.date}</span>
                        {c.pct > 0 && <span className="muted" style={{ fontSize: 11 }}>· {c.pct.toFixed(1)}%</span>}
                      </div>
                    </div>
                    <div className="com-pgc-row-r">
                      <div className="muted tnum" style={{ fontSize: 11 }}>Venda {fmtBRL(c.saleValue)}</div>
                      <div className="com-pgc-row-val tnum">{fmtBRL(c.commission)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment info form */}
          <div className="com-pgc-card">
            <div className="com-pgc-title"><Ic name="dollar" size={12} /> Dados do pagamento</div>
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label className="label">Data do pagamento</label>
                <DateField value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label className="label">Forma de pagamento</label>
                <select className="com-select" style={{ width: '100%', height: 36 }} value={method} onChange={e => setMethod(e.target.value)}>
                  <option>PIX</option>
                  <option>Transferência</option>
                  <option>Dinheiro</option>
                  <option>Holerite (folha)</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label className="label">Observações</label>
              <textarea className="input" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Notas internas para este pagamento..." />
            </div>
          </div>

          {/* Final summary */}
          <div className="com-pgc-final">
            <div>
              <div className="muted" style={{ fontSize: 11 }}>Após a confirmação, todas as comissões acima serão marcadas como <strong>Pagas</strong>.</div>
            </div>
            <div className="com-pgc-final-total tnum">{fmtBRL(total)}</div>
          </div>
        </div>
      </Modal>
    );
  }

  // ---------- Modal: Pay commissions (batch) ----------
  function PayCommissionsModal({ commissions, onClose, onPay }) {
    const [selected, setSelected] = React.useState(new Set(commissions.map(c => c.id)));
    const [date, setDate] = React.useState(todayISO);
    const [method, setMethod] = React.useState('PIX');
    const [note, setNote] = React.useState('');
    const total = commissions.filter(c => selected.has(c.id)).reduce((s, c) => s + c.commission, 0);
    const toggle = (id) => {
      setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };

    return (
      <Modal
        title="Pagar comissões"
        size="lg"
        onClose={onClose}
        footer={
          <>
            <button className="btn" onClick={onClose}>Cancelar</button>
            <span className="spacer" style={{ flex: 1 }} />
            <button className="btn btn-primary" disabled={selected.size === 0} onClick={() => onPay(Array.from(selected), { date, method, note })}>
              <Ic name="dollar" size={12} /> Pagar {fmtBRL(total)} ({selected.size})
            </button>
          </>
        }
      >
        <div className="row" style={{ gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label className="label">Data do pagamento</label>
            <DateField value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label className="label">Forma de pagamento</label>
            <select className="com-select" style={{ width: '100%', height: 36 }} value={method} onChange={e => setMethod(e.target.value)}>
              <option>PIX</option>
              <option>Transferência</option>
              <option>Dinheiro</option>
              <option>Holerite (folha)</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Observações</label>
          <textarea className="input" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Notas internas para esta remessa..." />
        </div>

        <div className="com-pay-modal-list">
          <div className="com-pay-modal-head">
            <input type="checkbox" checked={selected.size === commissions.length && commissions.length > 0}
              onChange={() => setSelected(s => s.size === commissions.length ? new Set() : new Set(commissions.map(c => c.id)))} />
            <span>Vendedor</span>
            <span>Venda</span>
            <span>Status</span>
            <span style={{ textAlign: 'right' }}>Valor</span>
          </div>
          {commissions.length === 0 ? (
            <div className="muted" style={{ padding: 20, textAlign: 'center' }}>Sem comissões pendentes.</div>
          ) : commissions.map(c => {
            const seller = SELLERS.find(s => s.id === c.seller);
            return (
              <label key={c.id} className={'com-pay-modal-row' + (selected.has(c.id) ? ' is-on' : '')}>
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                <span>{seller ? seller.name : '—'}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.sale}</span>
                <StatusPill status={c.status} />
                <span className="tnum" style={{ textAlign: 'right', fontWeight: 600 }}>{fmtBRL(c.commission)}</span>
              </label>
            );
          })}
        </div>

        <div className="com-pay-modal-total">
          <span className="muted">Total selecionado</span>
          <span className="tnum" style={{ fontSize: 22, fontWeight: 600 }}>{fmtBRL(total)}</span>
        </div>
      </Modal>
    );
  }

  // ---------- Styles ----------
  function CommissionsStyles() {
    return (
      <style>{`
        /* Shell: split into fixed tabs + scrollable body */
        .com-shell {
          flex: 1; min-height: 0;
          display: flex; flex-direction: column;
          gap: 12px;
        }
        .com-tab-body {
          flex: 1; min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 4px 4px 0;
          margin: -4px -4px 0;
          display: flex; flex-direction: column; gap: 14px;
        }
        /* Animated tab wrapper — slides in from left/right when tab changes */
        .com-tab-anim {
          flex: 1; min-height: 0;
          display: flex; flex-direction: column; gap: 14px;
          animation-duration: .32s;
          animation-timing-function: cubic-bezier(.4, 0, .2, 1);
          animation-fill-mode: both;
        }
        .com-tab-anim-right { animation-name: com-slide-from-right; }
        .com-tab-anim-left  { animation-name: com-slide-from-left; }
        @keyframes com-slide-from-right {
          from { transform: translateX(40px); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
        @keyframes com-slide-from-left {
          from { transform: translateX(-40px); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .com-tab-anim { animation: none; }
        }
        /* When dashboard is active, the inner wrapper needs to forward the constrained layout */
        .com-tab-body:has(.com-dash) .com-tab-anim { gap: 0; }
        .com-tab-body::-webkit-scrollbar { width: 10px; }
        .com-tab-body::-webkit-scrollbar-track { background: transparent; }
        .com-tab-body::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 6px; border: 2px solid transparent; background-clip: content-box; }
        .com-tab-body::-webkit-scrollbar-thumb:hover { background: var(--text-faint); border: 2px solid transparent; background-clip: content-box; }

        /* Dashboard sections */
        .com-dash {
          display: flex; flex-direction: column;
          gap: 10px;
          flex: 1; min-height: 0;
        }
        /* When dashboard is the active tab, lock the body to fit without scroll */
        .com-tab-body:has(.com-dash) {
          overflow: hidden !important;
          padding-bottom: 4px !important;
          gap: 0 !important;
        }
        .com-dash-filter {
          padding: 10px 12px;
          display: flex; align-items: center; gap: 12px;
          flex-wrap: wrap;
          flex-shrink: 0;
        }
        .com-kpi-grid-sm .com-kpi-value { font-size: 17px; }
        .com-kpi-grid-sm .com-kpi { padding: 10px 12px 12px; gap: 2px; }
        .com-kpi-grid-sm .com-kpi-sub { font-size: 10px; }
        .com-dash .com-kpi-grid { flex-shrink: 0; }
        .com-dash .com-kpi { padding: 12px 14px 14px; }
        .com-dash .com-kpi-value { font-size: 20px; }
        .com-dash .com-charts {
          flex: 1; min-height: 0;
        }
        .com-dash .com-chart-card {
          min-height: 0;
          overflow: hidden;
        }
        .com-dash .com-bars,
        .com-dash .com-top,
        .com-dash .com-split {
          overflow-y: auto;
          flex: 1; min-height: 0;
        }

        /* Meta progress */
        .com-meta-card { padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }
        .com-meta-h { display: flex; align-items: center; justify-content: space-between; }
        .com-meta-label { font-size: 13px; font-weight: 600; color: var(--text); }
        .com-meta-sub { font-size: 11px; }
        .com-meta-pct { font-size: 20px; font-weight: 600; color: var(--accent-700); font-variant-numeric: tabular-nums; }
        .com-meta-bar {
          position: relative;
          height: 10px; border-radius: 999px;
          background: var(--surface-3);
          overflow: hidden;
        }
        .com-meta-fill {
          display: block; height: 100%;
          background: linear-gradient(90deg, var(--accent), color-mix(in oklab, var(--accent) 70%, #10b981));
          border-radius: 999px;
          transition: width .5s cubic-bezier(.4,.2,.2,1);
        }
        .com-meta-marker {
          position: absolute; top: -2px; bottom: -2px; width: 2px;
          background: var(--text-muted);
          transform: translateX(-1px);
        }

        /* Confirm modal */
        .com-confirm {
          display: flex; align-items: flex-start; gap: 14px;
          padding: 4px 0;
        }
        .com-confirm-ic {
          flex-shrink: 0;
          display: inline-flex; align-items: center; justify-content: center;
          width: 44px; height: 44px; border-radius: 12px;
        }
        .com-confirm-danger { background: color-mix(in oklab, #ef4444 14%, var(--surface)); color: #b91c1c; }
        .com-confirm-warn   { background: color-mix(in oklab, #f59e0b 14%, var(--surface)); color: #b45309; }
        .com-confirm-success { background: color-mix(in oklab, #10b981 14%, var(--surface)); color: #047857; }
        .com-confirm-msg { font-size: 14px; color: var(--text); line-height: 1.5; }
        .btn-danger {
          background: #ef4444; color: white; border-color: #ef4444;
          box-shadow: 0 1px 0 rgba(255,255,255,.15) inset, 0 1px 2px rgba(0,0,0,.1);
        }
        .btn-danger:hover { background: #dc2626; border-color: #dc2626; }
        .btn-warn {
          background: #f59e0b; color: white; border-color: #f59e0b;
        }
        .btn-warn:hover { background: #d97706; border-color: #d97706; }

        /* Rule card with actions */
        .com-rule-body {
          appearance: none;
          background: transparent; border: 0; padding: 0;
          font: inherit; color: inherit; cursor: pointer;
          display: flex; flex-direction: column; gap: 8px;
          text-align: left;
          flex: 1;
        }
        .com-rule-actions {
          display: flex; gap: 4px;
          padding-top: 10px;
          border-top: 1px dashed var(--border);
          margin-top: 4px;
        }
        .com-rule-act {
          appearance: none;
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-muted);
          font: inherit;
          font-size: 11px;
          font-weight: 500;
          padding: 5px 10px;
          border-radius: 6px;
          display: inline-flex; align-items: center; gap: 4px;
          cursor: pointer;
          transition: all .12s;
          flex: 1;
          justify-content: center;
        }
        .com-rule-act:hover { color: var(--text); background: var(--surface-3); border-color: var(--text-muted); }
        .com-rule-act.is-danger:hover { color: #b91c1c; background: color-mix(in oklab, #ef4444 10%, var(--surface)); border-color: #ef4444; }
        .com-rule-act.is-pos:hover { color: #047857; background: color-mix(in oklab, #10b981 10%, var(--surface)); border-color: #10b981; }
        [data-theme="dark"] .com-rule-act.is-danger:hover { color: #fecaca; }
        [data-theme="dark"] .com-rule-act.is-pos:hover { color: #6ee7b7; }

        /* ============ Period filter (sliding pill) ============ */
        .com-period { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; max-width: 100%; }
        .com-period-row {
          position: relative;
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px;
          background: var(--surface-3);
          border: 1px solid var(--border);
          border-radius: 10px;
          flex-wrap: nowrap; flex: 0 0 auto;
        }
        .com-period-dates {
          display: inline-flex; align-items: center; gap: 6px; flex: 0 0 auto;
        }
        .com-period-dates .df-wrap { width: auto; }
        .com-period-range { width: 220px; height: 32px; border-radius: 8px; }
        .com-period-sep {
          font-size: 11px; font-weight: 600; color: var(--text-faint);
          flex-shrink: 0;
        }
        [data-theme="dark"] .com-period-row { background: #1a1f25; border-color: #262c34; }
        .com-period-pill {
          position: absolute; top: 4px; bottom: 4px; left: 0;
          border-radius: 7px;
          background: #E7F4E9;
          box-shadow: 0 1px 3px rgba(16,185,129,.18), inset 0 0 0 1px rgba(16,185,129,.28);
          transition: transform .32s cubic-bezier(.5,.2,.2,1), width .32s cubic-bezier(.5,.2,.2,1), opacity .2s;
          pointer-events: none; z-index: 0;
        }
        [data-theme="dark"] .com-period-pill {
          background: color-mix(in oklab, #10b981 22%, #1a1f25);
          box-shadow: 0 1px 3px rgba(0,0,0,.3), inset 0 0 0 1px rgba(16,185,129,.45);
        }
        .com-period-btn {
          position: relative; z-index: 1;
          appearance: none; border: 0; background: transparent;
          color: var(--text-muted); font-family: inherit; cursor: pointer;
          padding: 6px 10px; border-radius: 7px;
          display: inline-flex; flex-direction: column; align-items: center; gap: 0;
          line-height: 1.1; min-width: 44px;
        }
        .com-period-btn .com-period-num { font-weight: 700; font-size: 10px; letter-spacing: .04em; }
        .com-period-btn .com-period-sub { font-weight: 600; font-size: 9px; letter-spacing: .08em; opacity: .8; margin-top: 1px; }
        .com-period-btn:hover { color: var(--text); }
        .com-period-btn.on { color: #047857; }
        [data-theme="dark"] .com-period-btn.on { color: #6ee7b7; }
        .com-period-date {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 8px; border-radius: 7px;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text-muted);
        }
        [data-theme="dark"] .com-period-date { background: #232932; border-color: #34404d; }
        .com-period-date.on { border-color: var(--accent); color: var(--text); }
        .com-period-date input[type="date"] {
          appearance: none; border: 0; background: transparent;
          color: inherit; font: inherit; font-variant-numeric: tabular-nums;
          padding: 4px 0; min-width: 110px;
        }
        .com-period-date input[type="date"]:focus { outline: none; }
        [data-theme="dark"] .com-period-date input::-webkit-calendar-picker-indicator { filter: invert(.7); }

        /* ============ Select ============ */
        .com-select {
          appearance: none;
          background: var(--surface);
          border: 1px solid var(--border-strong);
          color: var(--text);
          border-radius: 8px;
          height: 36px; padding: 0 32px 0 12px;
          font: inherit;
          background-image: linear-gradient(45deg, transparent 50%, var(--text-muted) 50%), linear-gradient(135deg, var(--text-muted) 50%, transparent 50%);
          background-position: calc(100% - 16px) 50%, calc(100% - 11px) 50%;
          background-size: 5px 5px, 5px 5px;
          background-repeat: no-repeat;
        }
        .com-select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }

        /* ============ KPI grid ============ */
        .com-kpi-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 10px;
        }
        @media (max-width: 1380px) { .com-kpi-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 720px)  { .com-kpi-grid { grid-template-columns: repeat(2, 1fr); } }

        .com-kpi {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 14px 14px 16px;
          display: flex; flex-direction: column; gap: 4px;
          transition: border-color .15s, box-shadow .15s, transform .12s;
          position: relative;
        }
        .com-kpi:hover { border-color: var(--border-strong); box-shadow: 0 2px 10px rgba(15,23,42,.05); }
        .com-kpi-top { display: flex; align-items: center; gap: 6px; }
        .com-kpi-ic {
          display: inline-flex; align-items: center; justify-content: center;
          width: 26px; height: 26px; border-radius: 7px;
          background: var(--surface-3); color: var(--text-muted);
        }
        .com-kpi-label { font-size: 10px; font-weight: 700; letter-spacing: .08em; color: var(--text-faint); text-transform: uppercase; }
        .com-kpi-value { font-size: 22px; font-weight: 600; color: var(--text); letter-spacing: -0.01em; margin-top: 2px; line-height: 1.1; }
        .com-kpi-sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
        .com-kpi-trend { position: absolute; top: 14px; right: 14px; display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 999px; }
        .com-kpi-trend.is-pos { background: color-mix(in oklab, #10b981 14%, white); color: #047857; }
        .com-kpi-trend.is-neg { background: color-mix(in oklab, #ef4444 14%, white); color: #b91c1c; }
        [data-theme="dark"] .com-kpi-trend.is-pos { background: color-mix(in oklab, #10b981 24%, var(--surface)); color: #6ee7b7; }
        [data-theme="dark"] .com-kpi-trend.is-neg { background: color-mix(in oklab, #ef4444 24%, var(--surface)); color: #fca5a5; }

        .com-kpi-brand .com-kpi-ic { background: var(--accent-soft); color: var(--accent-700); }
        .com-kpi-paga .com-kpi-ic { background: color-mix(in oklab, #14b8a6 16%, var(--surface)); color: #0f766e; }
        .com-kpi-pendente .com-kpi-ic { background: color-mix(in oklab, #f59e0b 16%, var(--surface)); color: #b45309; }
        .com-kpi-prev .com-kpi-ic { background: color-mix(in oklab, #6366f1 16%, var(--surface)); color: #4338ca; }
        .com-kpi-team .com-kpi-ic { background: color-mix(in oklab, #8b5cf6 16%, var(--surface)); color: #6d28d9; }
        .com-kpi-avg .com-kpi-ic { background: color-mix(in oklab, #0ea5e9 16%, var(--surface)); color: #0369a1; }

        /* ============ Charts row ============ */
        .com-charts {
          display: grid;
          grid-template-columns: 1.2fr 1fr 1.2fr;
          gap: 12px;
        }
        @media (max-width: 1180px) { .com-charts { grid-template-columns: 1fr; } }
        .com-chart-card { padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
        .com-chart-h { display: flex; align-items: center; justify-content: space-between; }
        .com-chart-title { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; font-size: 13px; }

        .com-bars { display: flex; flex-direction: column; gap: 10px; }
        .com-bar-row { display: grid; grid-template-columns: 120px 1fr auto; align-items: center; gap: 10px; }
        .com-bar-label { font-size: 12px; color: var(--text-muted); }
        .com-bar-track {
          height: 8px; border-radius: 999px;
          background: var(--surface-3);
          overflow: hidden;
        }
        .com-bar-fill {
          display: block; height: 100%;
          background: linear-gradient(90deg, var(--accent), color-mix(in oklab, var(--accent) 70%, #10b981));
          border-radius: 999px;
          transition: width .4s ease;
        }
        .com-bar-value { font-size: 12px; font-weight: 600; min-width: 70px; text-align: right; }

        .com-split { display: flex; flex-direction: column; gap: 10px; }
        .com-split-bar { display: flex; height: 14px; border-radius: 999px; overflow: hidden; background: var(--surface-3); }
        .com-split-seg { height: 100%; transition: width .4s ease; }
        .com-split-legend { display: flex; flex-wrap: wrap; gap: 12px; }
        .com-split-leg { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-muted); }
        .com-split-dot { width: 8px; height: 8px; border-radius: 50%; }
        .com-split-leg-v { color: var(--text); font-weight: 600; }

        .com-top { display: flex; flex-direction: column; gap: 8px; }
        .com-top-row { display: grid; grid-template-columns: 24px 28px 1fr 80px auto; align-items: center; gap: 10px; }
        .com-top-rank { font-size: 11px; color: var(--text-faint); font-weight: 700; }
        .com-top-mid { min-width: 0; }
        .com-top-name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .com-top-team { font-size: 11px; }
        .com-top-bar { background: var(--surface-3); height: 6px; border-radius: 999px; overflow: hidden; }
        .com-top-bar span { display: block; height: 100%; background: var(--accent); border-radius: 999px; transition: width .4s ease; }
        .com-top-val { font-size: 12px; font-weight: 600; }

        /* ============ Tabs (sliding pill) ============ */
        .com-tabs {
          position: relative;
          display: inline-flex; gap: 4px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 4px;
          margin-top: 4px;
          align-self: flex-start;
          flex-shrink: 0;
        }
        .com-tabs-pill {
          position: absolute;
          top: 4px;
          bottom: 4px;
          left: 0;
          border-radius: 7px;
          background: var(--accent-soft);
          box-shadow: 0 1px 3px color-mix(in oklab, var(--accent) 18%, transparent), inset 0 0 0 1px color-mix(in oklab, var(--accent) 22%, transparent);
          transition: transform .32s cubic-bezier(.5,.2,.2,1), width .32s cubic-bezier(.5,.2,.2,1), opacity .2s;
          pointer-events: none;
          z-index: 0;
        }
        .com-tab {
          position: relative;
          z-index: 1;
          appearance: none; border: 0; background: transparent; cursor: pointer;
          padding: 7px 12px; border-radius: 7px;
          font: inherit; font-size: 13px; font-weight: 500;
          color: var(--text-muted);
          display: inline-flex; align-items: center; gap: 6px;
          transition: color .2s;
          white-space: nowrap;
        }
        .com-tab:hover { color: var(--text); }
        .com-tab.on { color: var(--accent-700); font-weight: 600; }
        .com-tab-count {
          font-size: 10px; padding: 1px 6px; border-radius: 999px;
          background: var(--surface-3); color: var(--text-muted);
          font-weight: 700;
        }
        .com-tab.on .com-tab-count { background: color-mix(in oklab, var(--accent) 24%, transparent); color: var(--accent-700); }

        /* ============ Status / Type pills ============ */
        .com-status {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 8px; border-radius: 999px;
          font-size: 10px; font-weight: 700; letter-spacing: .04em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        [data-theme="dark"] .com-status { background: color-mix(in oklab, currentColor 18%, var(--surface)) !important; }
        .com-type {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 2px 8px; border-radius: 999px;
          font-size: 11px; font-weight: 600;
          background: color-mix(in oklab, var(--type-accent, var(--accent)) 12%, var(--surface));
          color: var(--type-accent, var(--accent));
          border: 1px solid color-mix(in oklab, var(--type-accent, var(--accent)) 28%, transparent);
          white-space: nowrap;
        }

        /* ============ List / table ============ */
        .com-list-wrap { padding: 0; overflow: hidden; }
        .com-list-head {
          display: grid;
          grid-template-columns: 34px minmax(180px, 1.6fr) 110px minmax(180px, 1.6fr) 90px 130px 110px 100px 60px;
          gap: 10px;
          align-items: center;
          padding: 12px 14px;
          background: var(--surface-3);
          border-bottom: 1px solid var(--border);
          font-size: 10px; font-weight: 700; letter-spacing: .08em;
          color: var(--text-faint); text-transform: uppercase;
        }
        .com-th { display: flex; align-items: center; }
        .com-th-sort {
          appearance: none; background: transparent; border: 0; padding: 0;
          font: inherit; color: inherit; cursor: pointer;
          display: inline-flex; align-items: center; gap: 4px;
          letter-spacing: inherit; text-transform: inherit;
        }
        .com-th-sort:hover { color: var(--text); }
        .com-th-sort.is-active { color: var(--accent-700); }

        .com-list {
          display: flex; flex-direction: column;
          padding: 6px;
          gap: 4px;
        }
        .com-row {
          display: grid;
          grid-template-columns: 34px minmax(180px, 1.6fr) 110px minmax(180px, 1.6fr) 90px 130px 110px 100px 60px;
          gap: 10px;
          align-items: center;
          padding: 10px 14px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-left: 2px solid var(--row-accent, var(--accent));
          border-radius: 5px;
          cursor: pointer;
          transition: background .15s, box-shadow .15s, border-color .15s;
        }
        .com-row:hover { box-shadow: 0 2px 10px rgba(15,23,42,.06); border-color: var(--border-strong); border-left-color: var(--row-accent, var(--accent)); }
        .com-row.is-selected { background: var(--accent-soft); }
        .com-td { font-size: 13px; color: var(--text); min-width: 0; }
        .com-td-check { display: flex; align-items: center; justify-content: center; }
        .com-td-seller { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .com-seller-name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .com-sale-title { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .com-commission { font-weight: 700; color: #047857; }
        [data-theme="dark"] .com-commission { color: #6ee7b7; }
        .com-td-actions { display: flex; justify-content: flex-end; }

        @media (max-width: 1180px) {
          .com-list-head, .com-row { grid-template-columns: 34px minmax(160px, 1.4fr) 100px minmax(150px, 1.4fr) 100px 110px 80px 40px; }
          .com-list-head > div:nth-child(8), .com-row > div:nth-child(8) { display: none; }
          .com-th-actions, .com-td-actions { display: none; }
        }

        /* ============ Status pills (table) ============ */
        .com-stat-pill {
          appearance: none; border: 1px solid var(--border-strong); background: var(--surface);
          color: var(--text-muted); font-family: inherit; cursor: pointer;
          padding: 5px 12px; border-radius: 999px;
          font-size: 11px; font-weight: 600;
          display: inline-flex; align-items: center; gap: 6px;
          transition: all .15s;
        }
        .com-stat-pill:hover { color: var(--text); border-color: var(--text-muted); }
        .com-stat-pill.on {
          background: var(--accent-soft); color: var(--accent-700); border-color: color-mix(in oklab, var(--accent) 28%, transparent);
        }

        /* ============ Bulk bar ============ */
        .com-bulk {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 5px 12px; border-radius: 8px;
          background: var(--accent-soft); color: var(--accent-700);
          font-size: 12px; font-weight: 500;
          margin-left: auto;
        }

        /* ============ Pagination ============ */
        .com-pagination {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 14px; border-top: 1px solid var(--border);
          background: var(--surface-2);
        }
        .com-page-num { font-size: 12px; color: var(--text-muted); padding: 0 8px; font-variant-numeric: tabular-nums; }

        /* ============ Empty / Skeleton ============ */
        .com-empty {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 60px 16px; text-align: center; gap: 8px;
          color: var(--text-faint);
        }
        .com-empty-ic { display: inline-flex; opacity: .35; }
        .com-empty-title { font-weight: 600; color: var(--text-muted); font-size: 15px; margin-top: 8px; }
        .com-empty-sub { font-size: 13px; color: var(--text-faint); }
        .com-empty-mini { padding: 30px 0; text-align: center; color: var(--text-faint); font-size: 13px; }
        .com-skel-row {
          display: grid;
          grid-template-columns: 34px 1.6fr 1fr 1.4fr 1fr 1fr 1fr 1fr 60px;
          gap: 10px; padding: 12px 14px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 5px;
          margin: 4px 6px;
        }
        .com-skel-line {
          height: 12px;
          border-radius: 4px;
          background: linear-gradient(90deg, var(--surface-3) 0%, color-mix(in oklab, var(--surface-3) 60%, var(--surface)) 50%, var(--surface-3) 100%);
          background-size: 200% 100%;
          animation: com-shimmer 1.4s ease infinite;
        }
        @keyframes com-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .com-rule-skeleton {
          height: 150px; border-radius: 10px;
          background: linear-gradient(90deg, var(--surface-3) 0%, color-mix(in oklab, var(--surface-3) 60%, var(--surface)) 50%, var(--surface-3) 100%);
          background-size: 200% 100%;
          animation: com-shimmer 1.4s ease infinite;
        }

        /* ============ Rules grid ============ */
        .com-rules-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }
        .com-rule-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-top: 3px solid var(--rule-accent, var(--accent));
          border-radius: 10px;
          padding: 14px;
          display: flex; flex-direction: column;
          transition: transform .12s, border-color .15s, box-shadow .15s;
        }
        .com-rule-card:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(15,23,42,.08); border-color: var(--border-strong); border-top-color: var(--rule-accent, var(--accent)); }
        .com-rule-h { display: flex; align-items: center; justify-content: space-between; }
        .com-rule-ic { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; background: color-mix(in oklab, var(--rule-accent, var(--accent)) 12%, var(--surface)); color: var(--rule-accent, var(--accent)); }
        .com-rule-status { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px; }
        .com-rule-status .dot { width: 6px; height: 6px; border-radius: 50%; }
        .com-rule-status.is-on { color: #047857; background: color-mix(in oklab, #10b981 14%, var(--surface)); }
        .com-rule-status.is-on .dot { background: #10b981; }
        .com-rule-status.is-off { color: var(--text-muted); background: var(--surface-3); }
        .com-rule-status.is-off .dot { background: var(--text-faint); }
        .com-rule-title { font-weight: 600; font-size: 14px; }
        .com-rule-desc { font-size: 12px; color: var(--text-muted); line-height: 1.4; min-height: 32px; }
        .com-rule-foot { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 4px; }
        .com-rule-meta { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-muted); }

        /* ============ Payments ============ */
        .com-pay-summary { padding: 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .com-pay-label { font-size: 10px; font-weight: 700; letter-spacing: .08em; color: var(--text-faint); text-transform: uppercase; }
        .com-pay-total { font-size: 30px; font-weight: 600; letter-spacing: -0.015em; color: var(--text); }
        .com-pay-groups { display: flex; flex-direction: column; gap: 10px; }
        .com-pay-group {
          appearance: none;
          padding: 14px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          font: inherit;
          color: inherit;
          text-align: left;
          cursor: pointer;
          width: 100%;
          display: block;
          transition: background .15s, border-color .15s, box-shadow .15s, transform .12s;
        }
        .com-pay-group:hover {
          border-color: var(--border-strong);
          box-shadow: 0 6px 18px rgba(15,23,42,.10);
          transform: translateY(-1px);
        }
        [data-theme="dark"] .com-pay-group:hover { box-shadow: 0 6px 18px rgba(0,0,0,.45); }
        .com-pay-group:active { transform: translateY(0); }
        .com-pay-group:focus-visible {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-soft);
        }
        .com-pay-group-h { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .com-pay-group-total { font-size: 17px; font-weight: 700; color: var(--text); }
        .com-pay-group-summary {
          display: flex; gap: 12px;
          padding-top: 10px;
          border-top: 1px dashed var(--border);
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
        }
        .com-pay-summary-l {
          display: flex; flex-wrap: wrap; gap: 6px;
          align-items: center;
          flex: 1;
          min-width: 0;
        }
        .com-pay-summary-r {
          display: flex; gap: 6px;
          align-items: center;
          justify-content: flex-end;
          flex-shrink: 0;
        }
        .com-pay-chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px;
          border-radius: 999px;
          background: var(--surface-3);
          color: var(--text);
          font-size: 11px;
          font-weight: 500;
        }
        .com-pay-chip strong { font-weight: 700; font-variant-numeric: tabular-nums; }
        .com-pay-chip.is-pos {
          background: color-mix(in oklab, #10b981 14%, var(--surface));
          color: #047857;
        }
        .com-pay-chip.is-warn {
          background: color-mix(in oklab, #f59e0b 16%, var(--surface));
          color: #b45309;
        }
        .com-pay-chip.is-muted {
          background: var(--surface-3);
          color: var(--text-muted);
        }
        [data-theme="dark"] .com-pay-chip.is-pos { background: color-mix(in oklab, #10b981 24%, var(--surface)); color: #6ee7b7; }
        [data-theme="dark"] .com-pay-chip.is-warn { background: color-mix(in oklab, #f59e0b 24%, var(--surface)); color: #fde68a; }
        .com-pay-group-hint {
          margin-left: auto;
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 11px;
          opacity: 0;
          transition: opacity .15s, transform .15s;
        }
        .com-pay-group:hover .com-pay-group-hint { opacity: 1; transform: translateX(2px); }
        .com-pay-group-list { display: flex; flex-direction: column; gap: 4px; margin-top: 4px; padding-top: 8px; border-top: 1px dashed var(--border); }
        .com-pay-line {
          display: grid;
          grid-template-columns: 1.6fr auto auto auto;
          gap: 10px; align-items: center;
          padding: 8px 12px;
          background: var(--surface-2);
          border-radius: 6px;
          font-size: 13px;
        }
        .com-pay-line-sale { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
        .com-pay-line-val { font-weight: 600; }

        /* ============ Modal: Pay group confirmation ============ */
        .com-pgc { display: flex; flex-direction: column; gap: 12px; }
        .com-pgc-hero {
          padding: 14px 16px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--accent-soft) 0%, color-mix(in oklab, var(--accent) 5%, var(--surface)) 100%);
          border: 1px solid color-mix(in oklab, var(--accent) 18%, var(--border));
          display: flex; justify-content: space-between; align-items: center; gap: 12px;
          flex-wrap: wrap;
        }
        .com-pgc-hero-l { display: flex; align-items: center; gap: 10px; }
        .com-pgc-hero-r { text-align: right; }
        .com-pgc-name { font-weight: 600; font-size: 15px; color: var(--text); }
        .com-pgc-total { font-size: 26px; font-weight: 700; color: var(--text); letter-spacing: -0.015em; line-height: 1.1; margin-top: 2px; }

        .com-pgc-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        @media (max-width: 600px) { .com-pgc-stats { grid-template-columns: repeat(2, 1fr); } }
        .com-pgc-stat {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 10px;
          text-align: center;
        }
        .com-pgc-stat-v { font-size: 18px; font-weight: 700; color: var(--text); }
        .com-pgc-stat-l { font-size: 10px; letter-spacing: .06em; text-transform: uppercase; font-weight: 600; margin-top: 2px; }

        .com-pgc-card {
          padding: 12px 14px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--surface);
          display: flex; flex-direction: column; gap: 8px;
        }
        .com-pgc-title { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: .08em; color: var(--text-faint); text-transform: uppercase; }

        .com-pgc-list { display: flex; flex-direction: column; gap: 5px; max-height: 220px; overflow-y: auto; padding-right: 2px; }
        .com-pgc-row {
          display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;
          padding: 9px 12px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-left: 2px solid var(--row-accent, var(--accent));
          border-radius: 6px;
        }
        .com-pgc-row-l { flex: 1; min-width: 0; }
        .com-pgc-row-r { text-align: right; flex-shrink: 0; }
        .com-pgc-row-sale { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px; }
        .com-pgc-row-val { font-size: 15px; font-weight: 700; color: var(--text); margin-top: 2px; }

        .com-pgc-final {
          display: flex; justify-content: space-between; align-items: center; gap: 12px;
          padding: 12px 16px;
          background: color-mix(in oklab, #10b981 8%, var(--surface));
          border: 1px solid color-mix(in oklab, #10b981 22%, var(--border));
          border-radius: 8px;
        }
        [data-theme="dark"] .com-pgc-final {
          background: color-mix(in oklab, #10b981 18%, var(--surface));
        }
        .com-pgc-final-total { font-size: 20px; font-weight: 700; color: #047857; }
        [data-theme="dark"] .com-pgc-final-total { color: #6ee7b7; }

        /* ============ Pay modal ============ */
        .com-pay-modal-list {
          margin-top: 14px;
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
          max-height: 300px;
          overflow-y: auto;
        }
        .com-pay-modal-head, .com-pay-modal-row {
          display: grid;
          grid-template-columns: 24px 1fr 1.6fr 100px 100px;
          gap: 10px; align-items: center;
          padding: 8px 12px;
        }
        .com-pay-modal-head {
          background: var(--surface-3);
          font-size: 10px; font-weight: 700; letter-spacing: .08em;
          color: var(--text-faint); text-transform: uppercase;
        }
        .com-pay-modal-row { border-top: 1px solid var(--border); cursor: pointer; transition: background .15s; font-size: 13px; }
        .com-pay-modal-row:hover { background: var(--surface-3); }
        .com-pay-modal-row.is-on { background: var(--accent-soft); }
        .com-pay-modal-total {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 0 0;
          margin-top: 14px;
          border-top: 1px solid var(--border);
        }

        /* ============ Drawer: Seller group (payments) ============ */
        .com-sg { display: flex; flex-direction: column; gap: 14px; }
        .com-sg-hero {
          padding: 16px; border-radius: 10px;
          background: linear-gradient(135deg, var(--accent-soft) 0%, color-mix(in oklab, var(--accent) 5%, var(--surface)) 100%);
          border: 1px solid color-mix(in oklab, var(--accent) 18%, var(--border));
          display: flex; justify-content: space-between; align-items: center; gap: 12px;
          flex-wrap: wrap;
        }
        .com-sg-hero-l { display: flex; flex-direction: column; gap: 4px; }
        .com-sg-amount { font-size: 30px; font-weight: 600; letter-spacing: -0.015em; }
        .com-sg-hero-r { display: flex; gap: 14px; }
        .com-sg-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 60px; }
        .com-sg-stat-v { font-size: 20px; font-weight: 600; color: var(--text); }
        .com-sg-stat-l { font-size: 10px; letter-spacing: .06em; text-transform: uppercase; font-weight: 600; }

        .com-sg-card {
          padding: 12px 14px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--surface);
          display: flex; flex-direction: column; gap: 10px;
        }
        .com-sg-title { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: .08em; color: var(--text-faint); text-transform: uppercase; }

        .com-sg-list { display: flex; flex-direction: column; gap: 6px; }
        .com-sg-list-head {
          display: flex; align-items: center; gap: 12px;
          padding: 6px 8px;
          background: var(--surface-2);
          border-radius: 6px;
          border: 1px solid var(--border);
        }
        .com-sg-checkall {
          display: inline-flex; align-items: center; gap: 8px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          user-select: none;
        }
        .com-sg-checkall input { cursor: pointer; }
        .com-sg-item {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-left: 2px solid var(--row-accent, var(--accent));
          border-radius: 6px;
          padding: 10px 12px;
          display: flex; align-items: stretch; gap: 10px;
          transition: background .15s, border-color .15s, box-shadow .15s;
        }
        .com-sg-item:hover { background: var(--surface); border-color: var(--border-strong); box-shadow: 0 2px 8px rgba(15,23,42,.06); }
        .com-sg-item.is-checked {
          background: var(--accent-soft);
          border-color: color-mix(in oklab, var(--accent) 28%, var(--border));
        }
        .com-sg-check {
          display: inline-flex; align-items: center;
          padding-right: 4px;
          cursor: pointer;
          border-right: 1px dashed var(--border);
        }
        .com-sg-check input { cursor: pointer; width: 16px; height: 16px; }
        .com-sg-item-body {
          appearance: none; background: transparent; border: 0; padding: 0;
          font: inherit; color: inherit; cursor: pointer;
          display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
          text-align: left;
          width: 100%;
          flex: 1;
        }
        .com-sg-item-l { flex: 1; min-width: 0; }
        .com-sg-item-sale { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .com-sg-item-r { text-align: right; flex-shrink: 0; }
        .com-sg-item-val { font-size: 15px; font-weight: 700; color: var(--text); margin-top: 2px; }
        .com-sg-item-cta {
          display: inline-flex; align-items: center; justify-content: center;
          color: var(--text-faint);
          opacity: 0;
          transition: opacity .15s, transform .15s;
          align-self: center;
        }
        .com-sg-item-body:hover .com-sg-item-cta { opacity: 1; transform: translateX(2px); color: var(--accent-700); }

        .com-sg-resume { display: flex; flex-direction: column; gap: 6px; }
        .com-sg-resume-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; border-bottom: 1px dashed var(--border); }
        .com-sg-resume-row:last-child { border-bottom: 0; font-weight: 600; }

        /* ============ Drawer: detail ============ */
        .com-dt { display: flex; flex-direction: column; gap: 14px; }
        .com-dt-hero {
          padding: 16px; border-radius: 10px;
          background: linear-gradient(135deg, var(--accent-soft) 0%, color-mix(in oklab, var(--accent) 5%, var(--surface)) 100%);
          border: 1px solid color-mix(in oklab, var(--accent) 18%, var(--border));
          display: flex; justify-content: space-between; align-items: center; gap: 12px;
          flex-wrap: wrap;
        }
        .com-dt-hero-l { display: flex; flex-direction: column; gap: 6px; }
        .com-dt-amount { font-size: 30px; font-weight: 600; letter-spacing: -0.015em; }
        .com-dt-hero-r { display: flex; align-items: center; gap: 10px; }
        .com-dt-card {
          padding: 12px 14px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--surface);
          display: flex; flex-direction: column; gap: 8px;
        }
        .com-dt-title { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: .08em; color: var(--text-faint); text-transform: uppercase; }
        .com-dt-calc { display: flex; flex-direction: column; gap: 4px; }
        .com-dt-calc-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; border-bottom: 1px dashed var(--border); }
        .com-dt-calc-row:last-child { border-bottom: 0; font-weight: 600; }

        /* Timeline */
        .com-tl { display: flex; flex-direction: column; gap: 10px; }
        .com-tl-row { display: flex; gap: 10px; }
        .com-tl-dot {
          flex-shrink: 0;
          width: 22px; height: 22px; border-radius: 50%;
          display: inline-flex; align-items: center; justify-content: center;
          background: var(--surface-3); color: var(--text-muted);
        }
        .com-tl-success .com-tl-dot { background: color-mix(in oklab, #10b981 16%, var(--surface)); color: #047857; }
        .com-tl-warn    .com-tl-dot { background: color-mix(in oklab, #f59e0b 16%, var(--surface)); color: #b45309; }
        .com-tl-danger  .com-tl-dot { background: color-mix(in oklab, #ef4444 16%, var(--surface)); color: #b91c1c; }
        .com-tl-label { font-size: 13px; font-weight: 500; }

        /* ============ Rule drawer ============ */
        .com-rd { display: flex; flex-direction: column; gap: 18px; }
        .com-rd-section { padding-bottom: 14px; border-bottom: 1px solid var(--border); }
        .com-rd-section:last-child { border-bottom: 0; }
        .com-rd-h { font-size: 10px; font-weight: 700; letter-spacing: .08em; color: var(--text-faint); text-transform: uppercase; margin-bottom: 10px; }

        .com-type-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 6px;
        }
        @media (max-width: 720px) { .com-type-grid { grid-template-columns: repeat(2, 1fr); } }
        .com-type-pick {
          appearance: none;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 10px 6px;
          font: inherit; font-size: 11px; font-weight: 500;
          color: var(--text-muted);
          cursor: pointer;
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          transition: all .15s;
        }
        .com-type-pick:hover { color: var(--text); border-color: var(--text-muted); }
        .com-type-pick.on {
          background: color-mix(in oklab, var(--type-accent) 12%, var(--surface));
          border-color: var(--type-accent);
          color: var(--type-accent);
          font-weight: 600;
        }
        .com-type-pick-ic {
          display: inline-flex; align-items: center; justify-content: center;
          width: 28px; height: 28px; border-radius: 7px;
          background: color-mix(in oklab, var(--type-accent) 14%, var(--surface));
          color: var(--type-accent);
        }

        .com-suffix-input {
          display: inline-flex; align-items: center;
          background: var(--surface);
          border: 1px solid var(--border-strong);
          border-radius: 8px;
          padding: 0 10px;
          height: 36px;
          width: 100%;
        }
        .com-suffix-input:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
        .com-suffix-input > span { font-size: 13px; color: var(--text-faint); }
        .com-suffix-input > input {
          flex: 1; min-width: 0;
          appearance: none; border: 0; background: transparent;
          font: inherit; color: var(--text); height: 100%; padding: 0 6px;
          font-variant-numeric: tabular-nums;
        }
        .com-suffix-input > input:focus { outline: none; }

        .com-tier {
          display: flex; gap: 6px; align-items: stretch;
        }
        .com-tier-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 90px;
          gap: 6px;
          flex: 1;
        }

        .com-sellers-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
        }
        @media (max-width: 600px) { .com-sellers-grid { grid-template-columns: 1fr; } }
        .com-seller-pick {
          appearance: none;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px 10px;
          display: flex; align-items: center; gap: 10px;
          cursor: pointer;
          font: inherit;
          transition: all .15s;
          position: relative;
        }
        .com-seller-pick:hover { border-color: var(--text-muted); }
        .com-seller-pick.on {
          border-color: var(--accent);
          background: var(--accent-soft);
        }
        .com-seller-on {
          display: inline-flex; align-items: center; justify-content: center;
          width: 18px; height: 18px; border-radius: 50%;
          background: var(--accent); color: white;
        }

        /* ============ Toast ============ */
        .com-toast {
          position: fixed; bottom: 24px; right: 24px;
          background: var(--surface);
          border: 1px solid var(--border-strong);
          color: var(--text);
          padding: 10px 16px;
          border-radius: 10px;
          box-shadow: 0 10px 30px rgba(15,23,42,.18);
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 13px;
          font-weight: 500;
          z-index: 1000;
          animation: com-toast-in .3s cubic-bezier(.2, .8, .2, 1);
        }
        .com-toast-success { border-left: 3px solid #10b981; }
        .com-toast-error   { border-left: 3px solid #ef4444; }
        @keyframes com-toast-in {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    );
  }

  // ---------- Exports ----------
  Object.assign(window, { FinCommissions });
})();
