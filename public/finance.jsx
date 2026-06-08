// finance.jsx — Receitas e Despesas (módulo financeiro)
// Compartilha: KPI cards, barra de filtros por período, lista de lançamentos
// e drawer "Nova Entrada".

(function () {
  // ---------- Catálogos compartilhados ----------
  const CONTAS = [
  'Carteira', 'Conta Corrente Itaú', 'Conta Corrente BB', 'Caixa Loja', 'Cofre', 'Mercado Pago'];


  const FORMAS_PAGAMENTO = [
  'Dinheiro', 'PIX', 'Cartão de Débito', 'Cartão de Crédito', 'Boleto', 'Transferência', 'Carnê'];
  // Formas que abrem o parcelamento (divide o valor líquido em N vezes).
  const FORMAS_PARCELAVEIS = ['Boleto', 'Carnê', 'Cartão de Crédito'];


  const FUNCIONARIOS = [
  'Karla Zambelly', 'Magno Vieira', 'Paulo Henrique', 'Francisco Junior', 'Carlos Endwer'];


  const CATEGORIES_RECEITAS = [
  'Venda de Serviço', 'Venda de Produto', 'Pacote / Assinatura',
  'Comissão', 'Curso / Treinamento', 'Outras Receitas'];


  const CATEGORIES_DESPESAS = [
  'Aluguel', 'Fornecedor', 'Folha de Pagamento', 'Energia', 'Internet', 'Marketing',
  'Materiais', 'Impostos', 'Pró-labore', 'Manutenção', 'Outras Despesas'];


  const TIPOS = [
  { id: 'unica', label: 'Entrada Única' },
  { id: 'recorrente', label: 'Recorrente' },
  { id: 'carne', label: 'Carnê (parcelado)' }];


  const STATUS_LIST = [
  { id: 'aberto', label: 'Em aberto', color: '#1d4ed8', dot: '#3b82f6' },
  { id: 'paga', label: 'Paga', color: '#047857', dot: '#10b981' },
  { id: 'vence-hoje', label: 'Hoje', color: '#b45309', dot: '#f59e0b' },
  { id: 'atraso', label: 'Atrasada', color: '#b91c1c', dot: '#ef4444' }];


  // ---------- Usuário logado (exibido na sidebar) ----------
  const CURRENT_USER = 'Magnno Vieira';

  // ---------- Catálogo de serviços / produtos por CATEGORIA ----------
  const CATALOGO_RECEITAS = {
    'Venda de Serviço': ['Corte de Cabelo', 'Coloração', 'Escova / Hidratação', 'Manicure & Pedicure', 'Limpeza de Pele', 'Drenagem Linfática'],
    'Venda de Produto': ['Shampoo Profissional', 'Máscara Hidratante', 'Kit Linha Premium', 'Óleo de Tratamento', 'Esmalte em Gel'],
    'Pacote / Assinatura': ['Pacote Noiva', 'Pacote Spa Day', 'Assinatura Mensal', 'Plano Trimestral'],
    'Comissão': ['Comissão de Indicação', 'Comissão de Parceria'],
    'Curso / Treinamento': ['Workshop de Estética', 'Curso de Maquiagem', 'Mentoria'],
    'Outras Receitas': []
  };

  const CATALOGO_DESPESAS = {
    'Aluguel': ['Aluguel do Salão', 'Aluguel de Equipamento'],
    'Fornecedor': ['Fornecedor de Cosméticos', 'Fornecedor de Descartáveis'],
    'Folha de Pagamento': ['Salário', 'Adiantamento', 'Férias'],
    'Energia': ['Conta de Luz'],
    'Internet': ['Plano de Internet', 'Telefonia'],
    'Marketing': ['Tráfego Pago', 'Material Gráfico', 'Influenciador'],
    'Materiais': ['Material de Consumo', 'Material de Limpeza'],
    'Impostos': ['Simples Nacional', 'ISS', 'INSS'],
    'Pró-labore': ['Pró-labore Sócios'],
    'Manutenção': ['Manutenção de Equipamento', 'Reforma'],
    'Outras Despesas': []
  };


  // ---------- Mock de lançamentos ----------
  // Hoje é 27/05/2026 — montamos status realistas em torno disso.
  const TODAY = '27/05/2026';

  const MOCK_RECEITAS = [
  { codigo: 'RCB-88451', cliente: 'Cícera Vanderlânia da Silva Paz', funcionario: 'Karla Zambelly', categoria: 'Pacote / Assinatura', conta: 'Conta Corrente Itaú', tipo: 'carne', status: 'atraso', venc: '27/03/2026', valor: 426.32, parcAtual: 0, parcTotal: 4, forma: 'Carnê', desc: 'Pacote Noiva — entrada' },
  { codigo: 'RCB-88452', cliente: 'Roberto Lima Advocacia', funcionario: 'Paulo Henrique', categoria: 'Venda de Serviço', conta: 'Conta Corrente Itaú', tipo: 'unica', status: 'aberto', venc: '02/06/2026', valor: 1850.00, forma: 'Boleto', desc: 'Consultoria de marca' },
  { codigo: 'RCB-88453', cliente: 'Cesar Veículos', funcionario: 'Magno Vieira', categoria: 'Venda de Serviço', conta: 'Mercado Pago', tipo: 'unica', status: 'paga', venc: '12/05/2026', valor: 980.00, forma: 'PIX', desc: 'Pacote de marketing digital' },
  { codigo: 'RCB-88454', cliente: 'Patrícia Furtado', funcionario: 'Karla Zambelly', categoria: 'Venda de Serviço', conta: 'Conta Corrente Itaú', tipo: 'unica', status: 'vence-hoje', venc: TODAY, valor: 320.00, forma: 'PIX', desc: 'Limpeza de pele profunda' },
  { codigo: 'RCB-88455', cliente: 'Júlia Mendes', funcionario: 'Francisco Junior', categoria: 'Pacote / Assinatura', conta: 'Conta Corrente BB', tipo: 'carne', status: 'aberto', venc: '05/06/2026', valor: 540.00, parcAtual: 2, parcTotal: 5, forma: 'Carnê', desc: 'Microagulhamento — 3ª parcela' },
  { codigo: 'RCB-88456', cliente: 'Bruno Aragão Imóveis', funcionario: 'Paulo Henrique', categoria: 'Venda de Serviço', conta: 'Conta Corrente Itaú', tipo: 'unica', status: 'paga', venc: '20/05/2026', valor: 4500.00, forma: 'Transferência', desc: 'Consultoria + plano anual' },
  { codigo: 'RCB-88457', cliente: 'Fátima Coelho — Coelho Modas', funcionario: 'Magno Vieira', categoria: 'Venda de Produto', conta: 'Carteira', tipo: 'unica', status: 'atraso', venc: '15/04/2026', valor: 286.40, forma: 'Dinheiro', desc: 'Kit produtos linha premium' },
  { codigo: 'RCB-88458', cliente: 'Iany Maia — Casa das Lentes', funcionario: 'Karla Zambelly', categoria: 'Pacote / Assinatura', conta: 'Mercado Pago', tipo: 'carne', status: 'paga', venc: '10/05/2026', valor: 778.00, parcAtual: 2, parcTotal: 4, forma: 'Carnê', desc: 'Pacote Drenagem — 2ª parcela' },
  { codigo: 'RCB-88459', cliente: 'Letícia Maranhão Studio', funcionario: 'Francisco Junior', categoria: 'Curso / Treinamento', conta: 'Conta Corrente BB', tipo: 'unica', status: 'vence-hoje', venc: TODAY, valor: 297.00, forma: 'Boleto', desc: 'Workshop estética 2026' },
  { codigo: 'RCB-88460', cliente: 'Alex Soares — Construma', funcionario: 'Paulo Henrique', categoria: 'Venda de Serviço', conta: 'Conta Corrente Itaú', tipo: 'unica', status: 'aberto', venc: '14/06/2026', valor: 5500.00, forma: 'Boleto', desc: 'Pacote anual de gestão' },
  { codigo: 'RCB-88461', cliente: 'Talita Souto Acessórios', funcionario: 'Magno Vieira', categoria: 'Venda de Produto', conta: 'Carteira', tipo: 'unica', status: 'paga', venc: '24/05/2026', valor: 180.00, forma: 'PIX', desc: 'Repasse comissão fornecedor' },
  { codigo: 'RCB-88462', cliente: 'Henrique Castro Modas', funcionario: 'Karla Zambelly', categoria: 'Comissão', conta: 'Conta Corrente Itaú', tipo: 'unica', status: 'aberto', venc: '30/05/2026', valor: 420.00, forma: 'PIX', desc: 'Comissão de indicação' },
  { codigo: 'RCB-88463', cliente: 'Pedro Mafra Distribuidora', funcionario: 'Paulo Henrique', categoria: 'Venda de Serviço', conta: 'Conta Corrente BB', tipo: 'unica', status: 'paga', venc: '18/05/2026', valor: 2100.00, forma: 'Transferência', desc: 'Reestruturação de catálogo' },
  { codigo: 'RCB-88464', cliente: 'Sueline Barros — Escola Modelo', funcionario: 'Francisco Junior', categoria: 'Pacote / Assinatura', conta: 'Conta Corrente Itaú', tipo: 'carne', status: 'atraso', venc: '20/04/2026', valor: 389.00, parcAtual: 1, parcTotal: 6, forma: 'Carnê', desc: 'Pacote Spa Day — 2ª parcela' },
  { codigo: 'RCB-88465', cliente: 'Marcela Tavares Beauty', funcionario: 'Karla Zambelly', categoria: 'Venda de Serviço', conta: 'Mercado Pago', tipo: 'unica', status: 'aberto', venc: '08/06/2026', valor: 720.00, forma: 'Cartão de Crédito', desc: 'Pacote noiva — sessão extra' }];


  const MOCK_DESPESAS = [
  { codigo: 'DSP-10101', cliente: 'Imobiliária Centro', funcionario: '', categoria: 'Aluguel', conta: 'Conta Corrente Itaú', tipo: 'recorrente', status: 'aberto', venc: '05/06/2026', valor: 3800.00, forma: 'Boleto', desc: 'Aluguel sala comercial — junho/2026' },
  { codigo: 'DSP-10102', cliente: 'Energisa Ceará', funcionario: '', categoria: 'Energia', conta: 'Conta Corrente Itaú', tipo: 'recorrente', status: 'vence-hoje', venc: TODAY, valor: 612.40, forma: 'Boleto', desc: 'Conta de energia — 05/2026' },
  { codigo: 'DSP-10103', cliente: 'Vivo Empresas', funcionario: '', categoria: 'Internet', conta: 'Conta Corrente BB', tipo: 'recorrente', status: 'paga', venc: '15/05/2026', valor: 289.90, forma: 'Boleto', desc: 'Internet fibra 500MB — 05/2026' },
  { codigo: 'DSP-10104', cliente: 'Folha Maio 2026', funcionario: 'Karla Zambelly', categoria: 'Folha de Pagamento', conta: 'Conta Corrente Itaú', tipo: 'unica', status: 'paga', venc: '05/05/2026', valor: 4200.00, forma: 'Transferência', desc: 'Salário + benefícios' },
  { codigo: 'DSP-10105', cliente: 'Folha Maio 2026', funcionario: 'Magno Vieira', categoria: 'Folha de Pagamento', conta: 'Conta Corrente Itaú', tipo: 'unica', status: 'paga', venc: '05/05/2026', valor: 3100.00, forma: 'Transferência', desc: 'Salário + comissão maio' },
  { codigo: 'DSP-10106', cliente: 'Fornecedor Cosmédica', funcionario: '', categoria: 'Fornecedor', conta: 'Conta Corrente BB', tipo: 'unica', status: 'aberto', venc: '10/06/2026', valor: 1860.50, forma: 'Boleto', desc: 'Reposição linha estética' },
  { codigo: 'DSP-10107', cliente: 'Google Ads', funcionario: '', categoria: 'Marketing', conta: 'Conta Corrente Itaú', tipo: 'recorrente', status: 'paga', venc: '20/05/2026', valor: 480.00, forma: 'Cartão de Crédito', desc: 'Campanhas Maio 2026' },
  { codigo: 'DSP-10108', cliente: 'Meta Ads', funcionario: '', categoria: 'Marketing', conta: 'Conta Corrente Itaú', tipo: 'recorrente', status: 'paga', venc: '20/05/2026', valor: 360.00, forma: 'Cartão de Crédito', desc: 'Instagram + Facebook Ads' },
  { codigo: 'DSP-10109', cliente: 'Prefeitura de Fortaleza', funcionario: '', categoria: 'Impostos', conta: 'Conta Corrente Itaú', tipo: 'unica', status: 'atraso', venc: '15/04/2026', valor: 920.00, forma: 'Boleto', desc: 'ISS competência 03/2026' },
  { codigo: 'DSP-10110', cliente: 'Contador Silva & Associados', funcionario: '', categoria: 'Pró-labore', conta: 'Conta Corrente BB', tipo: 'recorrente', status: 'aberto', venc: '10/06/2026', valor: 690.00, forma: 'PIX', desc: 'Honorários contábeis junho' },
  { codigo: 'DSP-10111', cliente: 'AR Manutenção', funcionario: '', categoria: 'Manutenção', conta: 'Carteira', tipo: 'unica', status: 'paga', venc: '12/05/2026', valor: 240.00, forma: 'Dinheiro', desc: 'Higienização ar-condicionado' },
  { codigo: 'DSP-10112', cliente: 'Distribuidora Bella Pele', funcionario: '', categoria: 'Fornecedor', conta: 'Conta Corrente BB', tipo: 'unica', status: 'aberto', venc: '03/06/2026', valor: 1245.80, forma: 'Boleto', desc: 'Produtos consumíveis' },
  { codigo: 'DSP-10113', cliente: 'Folha Maio 2026', funcionario: 'Francisco Junior', categoria: 'Folha de Pagamento', conta: 'Conta Corrente Itaú', tipo: 'unica', status: 'paga', venc: '05/05/2026', valor: 2400.00, forma: 'Transferência', desc: 'Salário maio' },
  { codigo: 'DSP-10114', cliente: 'Tarifa bancária Itaú', funcionario: '', categoria: 'Outras Despesas', conta: 'Conta Corrente Itaú', tipo: 'recorrente', status: 'paga', venc: '01/05/2026', valor: 89.90, forma: 'Transferência', desc: 'Pacote PJ' },
  { codigo: 'DSP-10115', cliente: 'Materiais de Escritório', funcionario: '', categoria: 'Materiais', conta: 'Carteira', tipo: 'unica', status: 'vence-hoje', venc: TODAY, valor: 138.50, forma: 'Cartão de Débito', desc: 'Reposição papelaria' }];


  // ---------- Helpers ----------
  function fmtBRL(v) {
    return 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtBRLcompact(v) {
    const n = Number(v) || 0;
    if (n >= 1_000_000) return 'R$ ' + (n / 1_000_000).toFixed(1).replace('.', ',') + ' Mi';
    if (n >= 10_000) return 'R$ ' + (n / 1_000).toFixed(1).replace('.', ',') + ' mil';
    return fmtBRL(n);
  }
  // Converte 'dd/mm/yyyy' -> Date
  function parseBR(s) {
    if (!s) return null;
    const [d, m, y] = s.split('/').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }
  // Conversões entre ISO (banco: 'YYYY-MM-DD') e BR ('dd/mm/yyyy')
  function isoToBR(s) { if (!s) return ''; const p = String(s).slice(0, 10).split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : ''; }
  function brToIso(s) { if (!s) return null; const p = String(s).split('/'); return p.length === 3 ? `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}` : null; }
  const TODAY_DATE = parseBR(TODAY);
  function diffDays(a, b) {
    return Math.round((a - b) / 86400000);
  }
  function inRange(itemDate, from, to) {
    if (!itemDate) return false;
    if (from && itemDate < from) return false;
    if (to && itemDate > to) return false;
    return true;
  }

  // Reavalia status vs hoje (em caso de mock de filtro)
  function effectiveStatus(item) {
    if (item.status === 'paga') return 'paga';
    const d = parseBR(item.venc);
    if (!d) return item.status;
    const delta = diffDays(d, TODAY_DATE);
    if (delta < 0) return 'atraso';
    if (delta === 0) return 'vence-hoje';
    return 'aberto';
  }

  // ---------- KPI card ----------
  const KPI_TONES = {
    total: { bar: '#a855f7', bg: 'color-mix(in oklab, #a855f7 12%, white)', fg: '#7e22ce' },
    aberto: { bar: '#3b82f6', bg: 'color-mix(in oklab, #3b82f6 12%, white)', fg: '#1d4ed8' },
    paga: { bar: '#10b981', bg: 'color-mix(in oklab, #10b981 12%, white)', fg: '#047857' },
    'vence-hoje': { bar: '#f59e0b', bg: 'color-mix(in oklab, #f59e0b 16%, white)', fg: '#b45309' },
    atraso: { bar: '#ef4444', bg: 'color-mix(in oklab, #ef4444 12%, white)', fg: '#b91c1c' }
  };

  function FinKpiCard({ tone, icon, label, value }) {
    const t = KPI_TONES[tone] || KPI_TONES.total;
    return (
      <div className="fin-kpi" style={{ borderTopColor: t.bar }}>
        <div className="fin-kpi-head">
          <div className="fin-kpi-icon" style={{ background: t.bg, color: t.fg }}>
            <Ic name={icon} size={18} />
          </div>
          <div className="fin-kpi-label">{label}</div>
        </div>
        <div className="fin-kpi-value tnum" style={{ color: t.fg }}>{value}</div>
      </div>);

  }

  // Skeleton do KPI — mesma estrutura/medidas do FinKpiCard real (só o valor vira bloco).
  function FinKpiCardSkeleton({ tone, icon, label }) {
    const t = KPI_TONES[tone] || KPI_TONES.total;
    return (
      <div className="fin-kpi" style={{ borderTopColor: t.bar }}>
        <div className="fin-kpi-head">
          <div className="fin-kpi-icon" style={{ background: t.bg, color: t.fg }}>
            <Ic name={icon} size={18} />
          </div>
          <div className="fin-kpi-label">{label}</div>
        </div>
        <div className="fin-kpi-value tnum" style={{ display: 'flex', alignItems: 'center' }}>
          <Skeleton w={92} h={20} r={6} />
        </div>
      </div>);

  }

  // Skeleton da linha — reusa o mesmo grid (.fin-row) e as colunas do real.
  function FinRowSkeleton({ isReceita }) {
    return (
      <div className="fin-row fin-row-body" style={{ borderLeft: '2px solid var(--border)' }}>
        <div className="fin-c fin-c-code">
          <span className="muted" style={{ fontSize: 10, letterSpacing: '.06em', fontWeight: 600 }}>CÓDIGO</span>
          <Skeleton w={84} h={14} />
        </div>
        <div className="fin-c fin-c-name">
          <Skeleton w={'70%'} h={14} />
          <Skeleton w={'90%'} h={11} style={{ marginTop: 4 }} />
        </div>
        <div className="fin-c fin-c-venc">
          <Skeleton w={140} h={12} />
          <Skeleton w={80} h={18} r={999} style={{ marginTop: 6 }} />
        </div>
        <div className="fin-c fin-c-tipo">
          <Skeleton w={90} h={12} />
          <Skeleton w={70} h={11} style={{ marginTop: 4 }} />
        </div>
        <div className="fin-c fin-c-val">
          <div className="fin-val-pill"><Skeleton w={88} h={16} /></div>
        </div>
        <div className="fin-c fin-c-act" style={{ display: 'flex', gap: 6 }}>
          <Skeleton circle w={28} h={28} />
          <Skeleton circle w={28} h={28} />
          <Skeleton circle w={28} h={28} />
        </div>
      </div>);

  }

  // ---------- Period filter ----------
  const PERIOD_OPTIONS = [
  { id: 'todos', label: 'TODOS', sub: '', icon: 'check-double' },
  { id: 'mes', label: 'MÊS', sub: '', icon: 'calendar' },
  { id: '7d', label: '07', sub: 'DIAS', icon: null },
  { id: '15d', label: '15', sub: 'DIAS', icon: null },
  { id: '30d', label: '30', sub: 'DIAS', icon: null },
  { id: 'periodo', label: 'DATA', sub: '', icon: 'calendar' }];


  function PeriodFilter({ value, onChange, fromDate, toDate, setFromDate, setToDate }) {
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
      <div className="fin-period">
        <div className="fin-period-row" ref={rowRef}>
          <span
            className="fin-period-pill"
            style={{
              transform: `translateX(${pill.x}px)`,
              width: pill.w ? pill.w + 'px' : 0,
              opacity: pill.ready ? 1 : 0
            }}
            aria-hidden="true" />
          
          {PERIOD_OPTIONS.filter((opt) => opt.id !== 'periodo').map((opt) =>
          <button
            key={opt.id}
            ref={(el) => {btnRefs.current[opt.id] = el;}}
            type="button"
            className={'fin-period-btn' + (value === opt.id ? ' on' : '')}
            onClick={() => onChange(opt.id)}
            title={opt.label + (opt.sub ? ' ' + opt.sub : '')}>
            
              {opt.icon &&
            <span className="fin-period-ic"><Ic name={opt.icon} size={15} /></span>
            }
              <span className="fin-period-num" style={{ fontSize: "10px" }}>{opt.label}</span>
              {opt.sub && <span className="fin-period-sub">{opt.sub}</span>}
            </button>
          )}

          <DateRangeField from={fromDate} to={toDate} onChange={(f, t) => {setFromDate(f);setToDate(t);onChange('periodo');}} placeholder="Período" className="fin-period-range" style={{ width: 218, marginLeft: 4 }} />
        </div>
      </div>);

  }

  // ---------- Status pill (compact, on the row) ----------
  function StatusPill({ status }) {
    const map = {
      aberto: { bg: 'color-mix(in oklab, #3b82f6 14%, white)', fg: '#1d4ed8', label: 'EM ABERTO' },
      paga: { bg: 'color-mix(in oklab, #10b981 16%, white)', fg: '#047857', label: 'PAGA' },
      'vence-hoje': { bg: 'color-mix(in oklab, #f59e0b 22%, white)', fg: '#b45309', label: 'HOJE' },
      atraso: { bg: 'color-mix(in oklab, #ef4444 18%, white)', fg: '#b91c1c', label: 'ATRASADA' }
    };
    const s = map[status] || map.aberto;
    return (
      <span className="fin-status" style={{ background: s.bg, color: s.fg, fontWeight: 700, width: '80px' }}>{s.label}</span>);

  }

  // ---------- Status select (dropdown colorido, usado no drawer) ----------
  function StatusSelect({ value, onChange }) {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef(null);
    const cur = STATUS_LIST.find((s) => s.id === value) || STATUS_LIST[0];
    React.useEffect(() => {
      if (!open) return;
      const onDoc = (e) => {if (ref.current && !ref.current.contains(e.target)) setOpen(false);};
      document.addEventListener('mousedown', onDoc);
      return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);
    return (
      <div className="fin-status-select" ref={ref}>
        <button type="button" className="input fin-status-trigger" onClick={() => setOpen((o) => !o)}>
          <span className="fin-status-chip" style={{ background: `color-mix(in oklab, ${cur.dot} 16%, white)`, color: cur.color }}>
            <span className="fin-status-dot" style={{ background: cur.dot }} />
            {cur.label}
          </span>
          <Ic name="chevron-down" size={15} style={{ color: 'var(--text-faint)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s ease' }} />
        </button>
        {open &&
        <div className="fin-status-menu">
            {STATUS_LIST.map((s) =>
          <button key={s.id} type="button" className={'fin-status-opt' + (s.id === value ? ' on' : '')} onClick={() => {onChange(s.id);setOpen(false);}}>
                <span className="fin-status-chip" style={{ background: `color-mix(in oklab, ${s.dot} 16%, white)`, color: s.color }}>
                  <span className="fin-status-dot" style={{ background: s.dot }} />
                  {s.label}
                </span>
                {s.id === value && <Ic name="check" size={14} style={{ color: s.color, marginLeft: 'auto' }} />}
              </button>
          )}
          </div>
        }
      </div>);

  }

  // ---------- Main list ----------
  function FinanceList({ kind }) {
    const isReceita = kind === 'receivables';
    const cfg = {
      title: isReceita ? 'Receitas' : 'Despesas',
      subtitle: isReceita ?
      'Todas as entradas financeiras · contas a receber' :
      'Todas as saídas financeiras · contas a pagar',
      newLabel: isReceita ? 'Nova receita' : 'Nova despesa',
      drawerTitle: isReceita ? 'Nova Receita' : 'Nova Despesa',
      drawerKind: isReceita ? 'entrada' : 'saida',
      personLabel: isReceita ? 'Cliente / Origem' : 'Fornecedor / Destino',
      personPh: isReceita ? 'Origem...' : 'Fornecedor...',
      valueLabel: isReceita ? 'DADOS DO RECEBIMENTO' : 'DADOS DO PAGAMENTO',
      codePrefix: isReceita ? 'RCB' : 'DSP',
      categorias: isReceita ? CATEGORIES_RECEITAS : CATEGORIES_DESPESAS,
      headerIcon: isReceita ? 'arrow-up-right' : 'download',
      payIcon: 'dollar',
      payColor: isReceita ? '#10b981' : '#3b82f6'
    };

    const [period, setPeriod] = React.useState('mes');
    const [from, setFrom] = React.useState('');
    const [to, setTo] = React.useState('');
    const [query, setQuery] = React.useState('');
    const [items, setItems] = React.useState([]);
    const [loaded, setLoaded] = React.useState(false);
    const [contasMap, setContasMap] = React.useState({ byId: {}, byName: {} });
    // API entrada -> linha da UI
    const entradaToRow = (e) => ({
      _id: e.id, codigo: e.codigo,
      cliente: e.clienteOrigem || '—', funcionario: e.responsavel || '',
      categoria: e.categoria || '', conta: e.contaNome || '',
      tipo: e.recorrente ? 'recorrente' : 'unica',
      status: e.pago ? 'paga' : 'aberto',
      venc: isoToBR(e.vencimento), valor: e.valor || 0,
      forma: e.forma || '', desc: e.descricao || '',
      parcelas: e.parcelas || null,
      parcTotal: e.parcelas || undefined,
      parcAtual: e.parcelas ? 0 : undefined,
    });
    const skelKey = 'fin-entradas';
    React.useEffect(() => {
      let alive = true;
      setLoaded(false);
      API.getContas().then((r) => {
        if (!alive) return;
        const byId = {}, byName = {};
        (r.contas || []).forEach((c) => { byId[c.id] = c.descricao; byName[(c.descricao || '').toLowerCase()] = c.id; });
        setContasMap({ byId, byName });
      }).catch(() => {});
      API.getEntradas(isReceita ? 'entrada' : 'saida')
        .then((r) => {
          if (!alive) return;
          const rows = (r.entradas || []).map(entradaToRow);
          setItems(rows);
          skelRemember(skelKey, rows.length);
        })
        .catch(() => {})
        .finally(() => { if (alive) setLoaded(true); });
      return () => { alive = false; };
    }, [isReceita]);
    const [showNew, setShowNew] = React.useState(false);
    const [editItem, setEditItem] = React.useState(null);
    const [drawerMode, setDrawerMode] = React.useState('new'); // 'new' | 'view' | 'edit'
    const [confirmPay, setConfirmPay] = React.useState(null);
    const [faturItem, setFaturItem] = React.useState(null);
    const [confirmDel, setConfirmDel] = React.useState(null);
    const [statusFilter, setStatusFilter] = React.useState('todos'); // 'todos' | aberto | paga | vence-hoje | atraso

    // Lista com status reavaliado
    const evaluated = React.useMemo(() =>
    items.map((it) => ({ ...it, _status: effectiveStatus(it) })),
    [items]);

    // Filtro por período
    const filtered = React.useMemo(() => {
      let fromD = null,toD = null;
      if (period === 'mes') {
        fromD = new Date(TODAY_DATE.getFullYear(), TODAY_DATE.getMonth(), 1);
        toD = new Date(TODAY_DATE.getFullYear(), TODAY_DATE.getMonth() + 1, 0);
      } else if (period === '7d') {
        fromD = new Date(TODAY_DATE);fromD.setDate(TODAY_DATE.getDate() - 7);
        toD = new Date(TODAY_DATE);toD.setDate(TODAY_DATE.getDate() + 7);
      } else if (period === '15d') {
        fromD = new Date(TODAY_DATE);fromD.setDate(TODAY_DATE.getDate() - 15);
        toD = new Date(TODAY_DATE);toD.setDate(TODAY_DATE.getDate() + 15);
      } else if (period === '30d') {
        fromD = new Date(TODAY_DATE);fromD.setDate(TODAY_DATE.getDate() - 30);
        toD = new Date(TODAY_DATE);toD.setDate(TODAY_DATE.getDate() + 30);
      } else if (period === 'periodo') {
        fromD = from ? new Date(from) : null;
        toD = to ? new Date(to) : null;
      }
      const q = (query || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return evaluated.filter((it) => {
        const d = parseBR(it.venc);
        if (period !== 'todos' && !inRange(d, fromD, toD)) return false;
        if (statusFilter !== 'todos' && it._status !== statusFilter) return false;
        if (q) {
          const hay = (it.cliente + ' ' + it.codigo + ' ' + it.desc + ' ' + it.categoria).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (!hay.includes(q)) return false;
        }
        return true;
      });
    }, [evaluated, period, from, to, query, statusFilter]);

    // KPIs (sobre filtered)
    const kpis = React.useMemo(() => {
      const sum = (arr) => arr.reduce((s, x) => s + (x.valor || 0), 0);
      return {
        total: sum(filtered),
        aberto: sum(filtered.filter((x) => x._status === 'aberto')),
        paga: sum(filtered.filter((x) => x._status === 'paga')),
        'vence-hoje': sum(filtered.filter((x) => x._status === 'vence-hoje')),
        atraso: sum(filtered.filter((x) => x._status === 'atraso'))
      };
    }, [filtered]);

    // linha/entry da UI -> DTO da API
    const rowToDto = (entry) => ({
      tipo: cfg.drawerKind,
      descricao: entry.desc || '',
      valor: Number(entry.valor) || 0,
      categoria: entry.categoria || '',
      contaId: contasMap.byName[(entry.conta || '').toLowerCase()] || null,
      forma: entry.forma || '',
      responsavel: entry.funcionario || '',
      clienteOrigem: entry.cliente || '',
      recorrente: entry.tipo === 'recorrente',
      pago: entry.status === 'paga',
      parcelas: entry.parcelas || null,
      vencimento: entry.venc ? brToIso(entry.venc) : null,
    });

    const onSave = async (entry) => {
      const editing = !!(editItem && editItem._id);
      const nome = isReceita ? 'Receita' : 'Despesa';
      try {
        if (editing) {
          const r = await API.updateEntrada(editItem._id, rowToDto(entry));
          setItems((prev) => prev.map((it) => it._id === editItem._id ? entradaToRow(r.entrada) : it));
        } else {
          const r = await API.createEntrada(rowToDto(entry));
          setItems((prev) => [entradaToRow(r.entrada), ...prev]);
        }
        window.showToast({ tipo: 'sucesso', titulo: editing ? nome + ' atualizada' : nome + ' criada', descricao: entry.cliente || entry.desc || '' });
      } catch (e) {
        window.showToast({ tipo: 'erro', titulo: 'Falha ao salvar ' + nome.toLowerCase(), descricao: (e && e.message) || 'Tente novamente.' });
      }
      setShowNew(false); setEditItem(null);
    };

    const onPay = async (item, extra) => {
      const dto = { pago: true };
      if (extra && extra.forma) dto.forma = extra.forma;
      if (extra && extra.conta && contasMap.byName[(extra.conta || '').toLowerCase()]) dto.contaId = contasMap.byName[extra.conta.toLowerCase()];
      try {
        const r = await API.updateEntrada(item._id, dto);
        setItems((prev) => prev.map((it) => it._id === item._id ? entradaToRow(r.entrada) : it));
        window.showToast({ tipo: 'sucesso', titulo: isReceita ? 'Recebimento registrado' : 'Pagamento registrado', descricao: (item.cliente || item.codigo || '') + ' · ' + fmtBRL(item.valor) });
      } catch (e) {
        window.showToast({ tipo: 'erro', titulo: isReceita ? 'Falha ao receber' : 'Falha ao pagar', descricao: (e && e.message) || 'Tente novamente.' });
      }
      setConfirmPay(null);
      setFaturItem(null);
    };
    const onDelete = async (item) => {
      try {
        if (item._id) await API.deleteEntrada(item._id);
        window.showToast({ tipo: 'sucesso', titulo: 'Lançamento excluído', descricao: item.codigo || '' });
      } catch (e) {
        window.showToast({ tipo: 'erro', titulo: 'Falha ao excluir', descricao: (e && e.message) || 'Tente novamente.' });
      }
      setItems((prev) => prev.filter((it) => it._id !== item._id));
      setConfirmDel(null);
    };

    return (
      <Page
        title={cfg.title}
        subtitle={cfg.subtitle}
        actions={
        <FabNovo size="sm" label={cfg.newLabel} onClick={() => {setEditItem(null);setDrawerMode('new');setShowNew(true);}} />
        }>
        <FinStyles />

        {/* KPI strip */}
        <div className="fin-kpi-grid">
          {!loaded ? (
            [
              { tone: 'total', icon: 'reports', label: 'TOTAL' },
              { tone: 'aberto', icon: 'reports', label: 'EM ABERTO' },
              { tone: 'paga', icon: 'check-circle', label: isReceita ? 'PAGA' : 'PAGO' },
              { tone: 'vence-hoje', icon: 'wallet', label: 'VENCE HOJE' },
              { tone: 'atraso', icon: 'alert', label: 'EM ATRASO' }
            ].map((k) => <FinKpiCardSkeleton key={k.tone} tone={k.tone} icon={k.icon} label={k.label} />)
          ) : (
            <>
              <FinKpiCard tone="total" icon="reports" label="TOTAL" value={fmtBRLcompact(kpis.total)} />
              <FinKpiCard tone="aberto" icon="reports" label="EM ABERTO" value={fmtBRLcompact(kpis.aberto)} />
              <FinKpiCard tone="paga" icon="check-circle" label={isReceita ? 'PAGA' : 'PAGO'} value={fmtBRLcompact(kpis.paga)} />
              <FinKpiCard tone="vence-hoje" icon="wallet" label="VENCE HOJE" value={fmtBRLcompact(kpis['vence-hoje'])} />
              <FinKpiCard tone="atraso" icon="alert" label="EM ATRASO" value={fmtBRLcompact(kpis.atraso)} />
            </>
          )}
        </div>

        {/* Toolbar: search + period filter + status pills */}
        <div className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: 240, maxWidth: 420 }}>
              <Ic name="search" size={13} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }} />
              <input className="input" placeholder={`Pesquisar ${isReceita ? 'cliente' : 'fornecedor'}, código, descrição...`} value={query} onChange={(e) => setQuery(e.target.value)} style={{ paddingLeft: 36 }} />
              {query &&
              <button onClick={() => setQuery('')} className="btn btn-ghost btn-icon" style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 26, height: 26 }} title="Limpar">
                  <Ic name="x" size={12} />
                </button>
              }
            </div>

            <PeriodFilter
              value={period}
              onChange={setPeriod}
              fromDate={from}
              toDate={to}
              setFromDate={setFrom}
              setToDate={setTo} />
            
          </div>

          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700, marginRight: 4 }}>Status:</span>
            {[
            { id: 'todos', label: 'Todos', dot: null },
            { id: 'aberto', label: 'Em aberto', dot: '#3b82f6' },
            { id: 'paga', label: isReceita ? 'Paga' : 'Pago', dot: '#10b981' },
            { id: 'vence-hoje', label: 'Vence hoje', dot: '#f59e0b' },
            { id: 'atraso', label: 'Em atraso', dot: '#ef4444' }].
            map((s) =>
            <button key={s.id} className={'fin-stat-pill' + (statusFilter === s.id ? ' on' : '')} onClick={() => setStatusFilter(s.id)}>
                {s.dot && <span className="dot" style={{ background: s.dot }} />}
                {s.label}
              </button>
            )}
            <div style={{ flex: 1 }} />
            <span className="muted" style={{ fontSize: 'var(--type-sm)' }}>
              {filtered.length.toLocaleString('pt-BR')} {filtered.length === 1 ? 'lançamento' : 'lançamentos'}
            </span>
          </div>
        </div>

        {/* List */}
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="fin-row fin-row-head">
            <div className="fin-c fin-c-code">CÓDIGO</div>
            <div className="fin-c fin-c-name">{isReceita ? 'CLIENTE / ORIGEM' : 'FORNECEDOR / DESTINO'}</div>
            <div className="fin-c fin-c-venc">VENCIMENTO</div>
            <div className="fin-c fin-c-tipo">TIPO</div>
            <div className="fin-c fin-c-val">VALOR</div>
            <div className="fin-c fin-c-act"></div>
          </div>

          <div className="fin-list scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {!loaded ?
            Array.from({ length: skelCount('fin-entradas', 3) }).map((_, i) =>
            <FinRowSkeleton key={'skel-' + i} isReceita={isReceita} />
            ) :
            filtered.length === 0 ?
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-faint)' }}>
                <Ic name={isReceita ? 'coins' : 'wallet'} size={36} style={{ opacity: .35 }} />
                <div style={{ marginTop: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                  Nenhum lançamento encontrado
                </div>
                <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>
                  Ajuste o período ou cadastre uma nova {isReceita ? 'receita' : 'despesa'}.
                </div>
              </div> :

            filtered.map((it) => {
              const stat = it._status;
              const borderColor = stat === 'atraso' ? '#ef4444' : stat === 'vence-hoje' ? '#f59e0b' : stat === 'paga' ? '#10b981' : '#3b82f6';
              const tipoLabel = TIPOS.find((t) => t.id === it.tipo)?.label || it.tipo;
              const isCarne = it.tipo === 'carne';
              return (
                <div key={it._id || it.codigo} className="fin-row fin-row-body fin-row-click" style={{ borderLeft: `2px solid ${borderColor}`, cursor: 'pointer' }} onClick={() => {setEditItem(it);setDrawerMode('view');setShowNew(true);}} title="Ver detalhes">
                    <div className="fin-c fin-c-code">
                      <span className="muted" style={{ fontSize: 10, letterSpacing: '.06em', fontWeight: 600 }}>CÓDIGO</span>
                      <span className="tnum" style={{ fontWeight: 700, fontSize: 'var(--type-sm)' }}>{it.codigo}</span>
                    </div>

                    <div className="fin-c fin-c-name">
                      <div className="fin-cliente">{it.cliente}</div>
                      <div className="muted" style={{ marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: "12px" }}>
                        {it.categoria}{it.desc ? ' · ' + it.desc : ''}
                      </div>
                    </div>

                    <div className="fin-c fin-c-venc">
                      <div className="row" style={{ gap: 6, color: 'var(--text-muted)', fontSize: 11 }}>
                        <Ic name="calendar" size={12} />
                        <span>VENCIMENTO <span className="tnum" style={{ color: 'var(--text)', fontWeight: 600 }}>{it.venc}</span></span>
                      </div>
                      <StatusPill status={stat} />
                    </div>

                    <div className="fin-c fin-c-tipo">
                      <div className="row" style={{ gap: 6, color: 'var(--text-muted)', fontSize: 11 }}>
                        <Ic name={isCarne ? 'file-text' : it.tipo === 'recorrente' ? 'repeat' : 'file'} size={12} />
                        <span style={{ textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>
                          {isCarne ? 'CARNÊ' : it.tipo === 'recorrente' ? 'RECORRENTE' : 'ÚNICA'}
                        </span>
                      </div>
                      {isCarne &&
                    <div className="row" style={{ gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                          <Ic name="check" size={11} style={{ color: 'var(--accent)' }} />
                          PAGAS: <span className="tnum" style={{ fontWeight: 600, color: 'var(--text)' }}>{it.parcAtual || 0} DE {it.parcTotal}</span>
                        </div>
                    }
                      {!isCarne &&
                    <div className="muted" style={{ fontSize: 11 }}>{it.forma}</div>
                    }
                    </div>

                    <div className="fin-c fin-c-val">
                      <div className="fin-val-pill" style={{ color: isReceita ? '#047857' : '#b91c1c' }}>
                        <span style={{ opacity: .6, marginRight: 4, fontSize: 11, color: "rgb(128, 128, 128)" }}>R$</span>
                        <span className="tnum" style={{ color: "rgb(128, 128, 128)" }}>{(it.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <div className="fin-c fin-c-act">
                      <button className="btn btn-ghost btn-icon" title="Editar" onClick={(e) => {e.stopPropagation();setEditItem(it);setDrawerMode('edit');setShowNew(true);}}>
                        <Ic name="edit" size={14} />
                      </button>
                      <button
                      className="btn btn-ghost btn-icon fin-pay"
                      title={stat === 'paga' ? 'Já está paga' : 'Faturar / dar baixa'}
                      disabled={stat === 'paga'}
                      onClick={(e) => {e.stopPropagation();setFaturItem(it);}}
                      style={{ color: stat === 'paga' ? 'var(--text-faint)' : cfg.payColor }}>
                      
                        <Ic name="dollar" size={14} />
                      </button>
                      <button className="btn btn-ghost btn-icon" title="Excluir" onClick={(e) => {e.stopPropagation();setConfirmDel(it);}}>
                        <Ic name="trash" size={14} />
                      </button>
                    </div>
                  </div>);

            })
            }
          </div>
        </div>

        {showNew &&
        <NewEntryDrawer
          kind={cfg.drawerKind}
          title={cfg.drawerTitle}
          personLabel={cfg.personLabel}
          personPh={cfg.personPh}
          valueSection={cfg.valueLabel}
          categorias={cfg.categorias}
          codePrefix={cfg.codePrefix}
          entry={editItem}
          mode={drawerMode}
          onClose={() => {setShowNew(false);setEditItem(null);}}
          onSave={onSave} />

        }

        {faturItem &&
        <FaturarDrawer
          isReceita={isReceita}
          item={faturItem}
          onClose={() => setFaturItem(null)}
          onConfirm={(extra) => onPay(faturItem, extra)} />
        }

        {confirmPay &&
        <Modal title={isReceita ? 'Confirmar recebimento' : 'Confirmar pagamento'} onClose={() => setConfirmPay(null)} size="sm"
        footer={<>
              <div style={{ flex: 1 }} />
              <button className="btn fin-btn-back" onClick={() => setConfirmPay(null)}>Voltar</button>
              <button className="btn btn-primary" onClick={() => onPay(confirmPay)}>
                <Ic name="check" size={13} /> {isReceita ? 'Receber' : 'Pagar'} {fmtBRL(confirmPay.valor)}
              </button>
            </>}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'color-mix(in oklab, #10b981 14%, white)', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Ic name="dollar" size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{isReceita ? 'Marcar como recebido?' : 'Marcar como pago?'}</div>
                <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>
                  {confirmPay.cliente} · {confirmPay.categoria} · Venc. {confirmPay.venc}
                </div>
              </div>
            </div>
          </Modal>
        }

        {confirmDel &&
        <Modal title={`Excluir ${isReceita ? 'receita' : 'despesa'}`} onClose={() => setConfirmDel(null)} size="sm"
        footer={<>
              <div style={{ flex: 1 }} />
              <button className="btn fin-btn-back" onClick={() => setConfirmDel(null)}>Voltar</button>
              <button className="btn" style={{ background: '#dc2626', borderColor: '#dc2626', color: 'white' }} onClick={() => onDelete(confirmDel)}>
                <Ic name="trash" size={13} /> Excluir
              </button>
            </>}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'color-mix(in oklab, #dc2626 12%, white)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Ic name="trash" size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>Excluir lançamento {confirmDel.codigo}?</div>
                <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>
                  Esta ação não pode ser desfeita.
                </div>
              </div>
            </div>
          </Modal>
        }
      </Page>);

  }

  // ---------- New Entry drawer (form) ----------
  // Busca de produto/serviço por nome (autocomplete) — puxa do catálogo (window.API.getProdutos).
  function ProdutoAutocomplete({ value, onChange, onPick, placeholder }) {
    const [produtos, setProdutos] = React.useState([]);
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState(value || '');
    const ref = React.useRef(null);

    React.useEffect(() => { setQuery(value || ''); }, [value]);
    React.useEffect(() => {
      let alive = true;
      if (window.API && window.API.getProdutos) {
        window.API.getProdutos().then((r) => { if (alive) setProdutos(r.produtos || []); }).catch(() => {});
      }
      return () => { alive = false; };
    }, []);
    React.useEffect(() => {
      const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      document.addEventListener('mousedown', onDoc);
      return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const q = norm(query.trim());
    const matches = (q ? produtos.filter((p) => norm(p.nome).includes(q)) : produtos).slice(0, 8);
    const moeda = (v) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const pick = (p) => { setQuery(p.nome); setOpen(false); onChange && onChange(p.nome); onPick && onPick(p); };

    return (
      <div ref={ref} style={{ position: 'relative' }}>
        <input
          className="input"
          value={query}
          placeholder={placeholder || 'Digite para buscar...'}
          onChange={(e) => { setQuery(e.target.value); onChange && onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)} />
        {open && matches.length > 0 &&
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 70, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', padding: 4, maxHeight: 280, overflowY: 'auto' }}>
            {matches.map((p) =>
              <button key={p.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(p)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 8, fontFamily: 'inherit' }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--type-sm)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</span>
                <span className="muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.03em' }}>{p.tipo === 'servico' ? 'Serviço' : 'Produto'}</span>
                <span className="tnum" style={{ fontSize: 'var(--type-sm)', fontWeight: 700 }}>{moeda(p.preco)}</span>
              </button>)}
          </div>}
      </div>);
  }

  function NewEntryDrawer({ kind, title, personLabel, personPh, valueSection, categorias, codePrefix, entry, mode = 'new', onClose, onSave }) {
    const isEntrada = kind === 'entrada';
    const today = TODAY;

    // Converte "DD/MM/YYYY" -> "YYYY-MM-DD" (formato do DateField)
    const toISO = (d) => {
      if (!d || typeof d !== 'string') return today;
      if (d.includes('-')) return d;
      const p = d.split('/');
      return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : today;
    };

    // Modo de visualização (somente leitura) vs edição
    const [readOnly, setReadOnly] = React.useState(mode === 'view');

    const [f, setF] = React.useState(() => {
      if (entry) {
        // Preenche TODOS os campos com dados simulados a partir do lançamento
        const valor = Number(entry.valor) || 0;
        return {
          cliente: entry.cliente || '',
          funcionario: entry.funcionario || CURRENT_USER,
          status: entry.status || 'aberto',
          categoria: entry.categoria || '',
          conta: entry.conta || CONTAS[0],
          tipo: entry.tipo || 'unica',
          desc: entry.desc || entry.item || entry.categoria || '',
          item: entry.item || '',
          subtotal: entry.subtotal != null ? entry.subtotal : valor,
          desconto: entry.desconto || 0,
          acrescimo: entry.acrescimo || 0,
          forma: entry.forma || FORMAS_PAGAMENTO[0],
          parcelas: entry.parcTotal || 1,
          emissao: toISO(entry.emissao || entry.venc),
          venc: toISO(entry.venc),
          competencia: toISO(entry.competencia || entry.venc),
          obs: entry.obs || ''
        };
      }
      return {
        cliente: '', funcionario: CURRENT_USER, status: 'aberto', categoria: '',
        conta: '', tipo: 'unica', desc: '',
        item: '',
        subtotal: 0, desconto: 0, acrescimo: 0,
        forma: '', parcelas: 1, emissao: today, venc: today, competencia: today,
        obs: ''
      };
    });
    const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

    // Categorias + catálogo de itens (editáveis no próprio drawer)
    const [categoriasList, setCategoriasList] = React.useState(categorias);
    const [catalogo, setCatalogo] = React.useState(isEntrada ? CATALOGO_RECEITAS : CATALOGO_DESPESAS);
    const [showCatModal, setShowCatModal] = React.useState(false);

    // Garante que o usuário logado apareça nas opções de funcionário
    const funcionariosOpts = React.useMemo(
      () => FUNCIONARIOS.includes(CURRENT_USER) ? FUNCIONARIOS : [CURRENT_USER, ...FUNCIONARIOS],
      []
    );

    const addCategoria = (nome) => {
      const label = (nome || '').trim();
      if (!label) return;
      setCategoriasList((p) => p.includes(label) ? p : [...p, label]);
      setCatalogo((p) => ({ ...p, [label]: p[label] || [] }));
      setF((p) => ({ ...p, categoria: label, item: '' }));
      setShowCatModal(false);
      window.showToast({ tipo: 'sucesso', titulo: 'Categoria criada', descricao: label });
    };

    const liquido = (Number(f.subtotal) || 0) - (Number(f.desconto) || 0) + (Number(f.acrescimo) || 0);

    // Parcelamento (boleto/carnê/cartão): valor da parcela = líquido ÷ parcelas.
    const isParcelavel = FORMAS_PARCELAVEIS.includes(f.forma);
    const nParc = Math.max(1, parseInt(f.parcelas, 10) || 1);
    const valorParcela = isParcelavel ? liquido / nParc : liquido;

    // Ao escolher um produto/serviço do catálogo, puxa o preço para o subtotal.
    const pickProduto = (prod) => setF((p) => ({
      ...p,
      item: prod.nome,
      subtotal: Number(prod.preco) || 0,
      desc: (p.desc && p.desc.trim()) ? p.desc : prod.nome,
    }));

    const code = React.useMemo(
      () => entry?.codigo ? entry.codigo : codePrefix + '-' + Math.floor(10000 + Math.random() * 90000),
      [entry, codePrefix]
    );

    const valid = f.cliente.trim().length >= 2 && liquido > 0;

    const drawerTitle =
    mode === 'new' ? title :
    readOnly ? isEntrada ? 'Detalhes da Receita' : 'Detalhes da Despesa' :
    isEntrada ? 'Editar Receita' : 'Editar Despesa';

    // Cor do código interno: nasce cinza (nova) e ganha cor conforme o status salvo
    const CODE_COLORS = { paga: '#10b981', 'vence-hoje': '#f59e0b', aberto: '#3b82f6', atraso: '#ef4444' };
    const codeColor = mode === 'new' ? null : CODE_COLORS[f.status] || null;
    const codePillStyle = codeColor ? {
      background: `color-mix(in oklab, ${codeColor} 14%, transparent)`,
      borderColor: codeColor,
      color: codeColor
    } : {};

    const handleSave = () => {
      const item = {
        cliente: f.cliente,
        funcionario: f.funcionario,
        item: f.item,
        categoria: f.categoria || categorias[0],
        conta: f.conta || CONTAS[0],
        tipo: f.tipo,
        status: f.status,
        venc: f.venc.includes('-') ? f.venc.split('-').reverse().join('/') : f.venc,
        valor: liquido,
        forma: f.forma || FORMAS_PAGAMENTO[0],
        desc: f.desc,
        parcelas: isParcelavel && nParc > 1 ? nParc : null,
        parcTotal: isParcelavel && nParc > 1 ? nParc : undefined,
        parcAtual: isParcelavel && nParc > 1 ? 0 : undefined
      };
      onSave(item);
    };

    return (
      <Drawer
        title={
        <span className="row" style={{ gap: 10 }}>
            <span className="fin-drawer-ic">
              <Ic name={isEntrada ? 'arrow-up-right' : 'download'} size={16} />
            </span>
            <span>{drawerTitle}</span>
          </span>
        }
        onClose={onClose}
        width={780}
        leftHead={null}
        rightHead={
        <div className="fin-drawer-code fin-drawer-code-head">
            <span style={{ fontWeight: "500", height: "12px" }}>CÓDIGO</span>
            <strong className="tnum fin-code-pill" style={codePillStyle}>{code}</strong>
          </div>
        }
        footer={(close) => readOnly ?
        <>
          <div style={{ flex: 1 }} />
          <ActionButton action="voltar" size="md" onClick={() => close()} />
          <ActionButton action="editar" size="md" onClick={() => setReadOnly(false)} />
        </> :
        <>
          <div style={{ flex: 1 }} />
          <ActionButton action="voltar" size="md" onClick={() => close()} />
          <ActionButton action="salvar" size="md" disabled={!valid} onClick={() => close(handleSave)} />
        </>}>
        <fieldset disabled={readOnly} className={'fin-form-fieldset tpc-flat' + (readOnly ? ' is-view' : '')} style={{ border: 'none', margin: 0, padding: 0, minWidth: 0 }}>
        <SectionTitle>DADOS PRINCIPAIS</SectionTitle>
        <div className="fin-section">
          {/* Linha 1 — Cliente */}
          <Field label={personLabel}>
            <input className="input" value={f.cliente} onChange={(e) => set('cliente', e.target.value)} placeholder={personPh} />
          </Field>

          {/* Linha 2 — Serviço / Produto (busca no catálogo) */}
          <Field label="Serviço / Produto">
            <ProdutoAutocomplete
              value={f.item}
              onChange={(nome) => set('item', nome)}
              onPick={pickProduto}
              placeholder="Digite para buscar no catálogo..." />
          </Field>

          {/* Linha 3 — Categoria + Funcionário */}
          <div className="fin-grid-2">
            <Field label="Categoria">
              <div className="row" style={{ gap: 6 }}>
                <select className="input" value={f.categoria} onChange={(e) => set('categoria', e.target.value)} style={{ flex: 1 }}>
                  <option value="">Selecione a categoria...</option>
                  {categoriasList.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button type="button" className="btn fin-cat-add" title="Cadastrar categoria" onClick={() => setShowCatModal(true)}>
                  <Ic name="plus" size={14} />
                </button>
              </div>
            </Field>
            <Field label="Funcionário">
              <select className="input" value={f.funcionario} onChange={(e) => set('funcionario', e.target.value)}>
                <option value="">Funcionário...</option>
                {funcionariosOpts.map((x) => <option key={x} value={x}>{x === CURRENT_USER ? `${x} (você)` : x}</option>)}
              </select>
            </Field>
          </div>

          {/* Linha 4 — Status */}
          <Field label="Status">
            <StatusSelect value={f.status} onChange={(v) => set('status', v)} />
          </Field>

          <Field label="Descrição">
            <input className="input" value={f.desc} onChange={(e) => set('desc', e.target.value)} placeholder="Descrição..." />
          </Field>
        </div>

        <SectionTitle>{valueSection}</SectionTitle>
        <div className="fin-section">
          <div className="fin-money-grid">
            <MoneyField label="SUB TOTAL" tone="blue" value={f.subtotal} onChange={(v) => set('subtotal', v)} />
            <MoneyField label="DESCONTO" tone="pink" value={f.desconto} onChange={(v) => set('desconto', v)} />
            <MoneyField label="ACRÉSCIMO" tone="amber" value={f.acrescimo} onChange={(v) => set('acrescimo', v)} />
            <MoneyField label="V. LÍQUIDO" tone="green" value={liquido} readOnly />
          </div>

          <div className="fin-grid-3">
            <Field label="Conta">
              <select className="input" value={f.conta} onChange={(e) => set('conta', e.target.value)}>
                <option value="">Conta...</option>
                {CONTAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Forma de Pagamento">
              <select className="input" value={f.forma} onChange={(e) => set('forma', e.target.value)}>
                <option value="">Forma de pagamento...</option>
                {FORMAS_PAGAMENTO.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Emissão">
              <DateField value={f.emissao} onChange={(e) => set('emissao', e.target.value)} />
            </Field>
            <Field label="Vencimento">
              <DateField value={f.venc} onChange={(e) => set('venc', e.target.value)} />
            </Field>
            <Field label="Data de Competência">
              <DateField value={f.competencia} onChange={(e) => set('competencia', e.target.value)} />
            </Field>
          </div>

          {isParcelavel &&
            <div className="fin-grid-3">
              <Field label="Parcelas">
                <input className="input tnum" type="number" min="1" value={f.parcelas}
                  onChange={(e) => set('parcelas', Math.max(1, parseInt(e.target.value, 10) || 1))} />
              </Field>
              <Field label="Valor da parcela">
                <div className="input tnum" style={{ display: 'flex', alignItems: 'center', fontWeight: 700, background: 'var(--surface-2)', color: 'var(--text)' }}>
                  {nParc}× de {'R$ ' + Number(valorParcela || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </Field>
            </div>}

          <Field label="Observações">
            <textarea className="input" rows={3} value={f.obs} onChange={(e) => set('obs', e.target.value)} placeholder="Observações..." />
          </Field>
        </div>
        </fieldset>

        {showCatModal &&
        <CategoriaModal isEntrada={isEntrada} onClose={() => setShowCatModal(false)} onSave={addCategoria} />}
      </Drawer>);

  }

  // ---------- Faturar (dar baixa) drawer ----------
  function FaturarDrawer({ isReceita, item, onClose, onConfirm }) {
    const p2 = (n) => String(n).padStart(2, '0');
    const isoToday = (() => {
      const d = parseBR(TODAY) || new Date();
      return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
    })();
    const original = Number(item.valor) || 0;
    const [desconto, setDesconto] = React.useState(0);
    const [juros, setJuros] = React.useState(0);
    const [conta, setConta] = React.useState(item.conta || CONTAS[0] || '');
    const [forma, setForma] = React.useState(item.forma || FORMAS_PAGAMENTO[0] || '');
    const [data, setData] = React.useState(isoToday);
    const [obs, setObs] = React.useState('');
    const [confirm, setConfirm] = React.useState(false);

    const total = Math.max(0, original - (Number(desconto) || 0) + (Number(juros) || 0));
    const verbo = isReceita ? 'Receber' : 'Pagar';
    const fmtData = data.includes('-') ? data.split('-').reverse().join('/') : data;
    const stat = item._status || item.status;

    const summaryRows = [
    [isReceita ? 'Cliente / Origem' : 'Fornecedor / Destino', item.cliente],
    ['Categoria', item.categoria + (item.desc ? ' · ' + item.desc : '')],
    ['Vencimento', item.venc],
    ['Valor original', fmtBRL(original)]];


    return (
      <Drawer
        title={
        <span className="row" style={{ gap: 10 }}>
            <span className="fin-drawer-ic" style={{ background: 'color-mix(in oklab, #10b981 16%, white)', color: '#047857' }}>
              <Ic name="dollar" size={16} />
            </span>
            <span>Faturar {isReceita ? 'receita' : 'despesa'}</span>
          </span>
        }
        onClose={onClose}
        width={680}
        leftHead={null}
        footer={<>
          <div style={{ flex: 1 }} />
          <ActionButton action="voltar" size="md" onClick={onClose} />
          <ActionButton action="salvar" size="md" icon="dollar" label={`${verbo} ${fmtBRL(total)}`} onClick={() => setConfirm(true)} />
        </>}>
        <div className="fin-drawer-code">
          <span>CÓDIGO</span>
          <strong className="tnum">{item.codigo}</strong>
        </div>

        <SectionTitle>RESUMO DO LANÇAMENTO</SectionTitle>
        <div className="fin-section">
          <div className="fin-fatura-summary">
            {summaryRows.map(([k, v], i) =>
            <div key={i} className="fin-fatura-row">
                <span className="fin-fatura-k">{k}</span>
                <span className="fin-fatura-v">{v}</span>
              </div>
            )}
            <div className="fin-fatura-row">
              <span className="fin-fatura-k">Situação</span>
              <span className="fin-fatura-v"><StatusPill status={stat} /></span>
            </div>
          </div>
        </div>

        <SectionTitle>DADOS DO {isReceita ? 'RECEBIMENTO' : 'PAGAMENTO'}</SectionTitle>
        <div className="fin-section">
          <div className="fin-money-grid">
            <MoneyField label="VALOR ORIGINAL" tone="blue" value={original} readOnly />
            <MoneyField label="DESCONTO" tone="pink" value={desconto} onChange={setDesconto} />
            <MoneyField label="JUROS / MULTA" tone="amber" value={juros} onChange={setJuros} />
            <MoneyField label={isReceita ? 'TOTAL A RECEBER' : 'TOTAL A PAGAR'} tone="green" value={total} readOnly />
          </div>

          <div className="fin-grid-3">
            <Field label="Conta">
              <select className="input" value={conta} onChange={(e) => setConta(e.target.value)}>
                <option value="">Conta...</option>
                {CONTAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Forma de Pagamento">
              <select className="input" value={forma} onChange={(e) => setForma(e.target.value)}>
                <option value="">Forma de pagamento...</option>
                {FORMAS_PAGAMENTO.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label={isReceita ? 'Data do recebimento' : 'Data do pagamento'}>
              <DateField value={data} onChange={(e) => setData(e.target.value)} />
            </Field>
          </div>

          <Field label="Observações">
            <textarea className="input" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observações da baixa..." />
          </Field>
        </div>

        {confirm &&
        <Modal title={isReceita ? 'Confirmar recebimento' : 'Confirmar pagamento'} onClose={() => setConfirm(false)} size="sm"
        footer={<>
              <div style={{ flex: 1 }} />
              <button className="btn fin-btn-back" onClick={() => setConfirm(false)}>Voltar</button>
              <button className="btn btn-primary" onClick={() => onConfirm({ total, juros: Number(juros) || 0, desconto: Number(desconto) || 0, data: fmtData, forma, conta })}>
                <Ic name="check" size={13} /> {verbo} {fmtBRL(total)}
              </button>
            </>}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'color-mix(in oklab, #10b981 14%, white)', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Ic name="dollar" size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{isReceita ? 'Marcar como recebido?' : 'Marcar como pago?'}</div>
                <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>
                  {item.cliente} · {fmtBRL(total)} · {fmtData}
                </div>
                {(Number(juros) > 0 || Number(desconto) > 0) &&
              <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 2 }}>
                  {Number(desconto) > 0 ? `Desconto ${fmtBRL(desconto)}` : ''}{Number(desconto) > 0 && Number(juros) > 0 ? ' · ' : ''}{Number(juros) > 0 ? `Juros/Multa ${fmtBRL(juros)}` : ''}
                </div>
              }
              </div>
            </div>
          </Modal>
        }
      </Drawer>);

  }

  function CategoriaModal({ isEntrada, onClose, onSave }) {
    const [nome, setNome] = React.useState('');
    const valid = nome.trim().length >= 2;
    const save = () => {if (valid) onSave(nome.trim());};
    return (
      <Modal
        title={`Nova categoria de ${isEntrada ? 'receita' : 'despesa'}`}
        size="sm"
        onClose={onClose}
        footer={(close) => <>
          <div style={{ flex: 1 }} />
          <button className="btn fin-btn-back" onClick={() => close()}>Voltar</button>
          <button className="btn btn-save" disabled={!valid} style={{ opacity: valid ? 1 : .55 }} onClick={() => close(save)}>
            <Ic name="check" size={13} /> Cadastrar
          </button>
        </>}>
        <Field label="Nome da categoria">
          <input className="input" autoFocus value={nome} onChange={(e) => setNome(e.target.value)}
          placeholder={isEntrada ? 'Ex.: Venda de Serviço, Curso...' : 'Ex.: Aluguel, Marketing...'}
          onKeyDown={(e) => {if (e.key === 'Enter') save();}} />
        </Field>
        <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 8, lineHeight: 1.4 }}>
          A categoria fica disponível na lista e você pode vincular serviços/produtos a ela.
        </div>
      </Modal>);

  }

  function Field({ label, children, full }) {
    return (
      <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
        <label className="label" style={{ marginBottom: 4, margin: "0px" }}>{label}</label>
        {children}
      </div>);

  }

  function SectionTitle({ children }) {
    return <div className="fin-section-title">{children}</div>;
  }

  function MoneyField({ label, tone, value, onChange, readOnly }) {
    const tones = {
      blue: { bg: 'color-mix(in oklab, #3b82f6 14%, white)', fg: '#1d4ed8', bd: 'color-mix(in oklab, #3b82f6 30%, var(--border))' },
      pink: { bg: 'color-mix(in oklab, #ec4899 14%, white)', fg: '#9d174d', bd: 'color-mix(in oklab, #ec4899 30%, var(--border))' },
      amber: { bg: 'color-mix(in oklab, #f59e0b 16%, white)', fg: '#92400e', bd: 'color-mix(in oklab, #f59e0b 30%, var(--border))' },
      green: { bg: 'color-mix(in oklab, #10b981 16%, white)', fg: '#065f46', bd: 'color-mix(in oklab, #10b981 30%, var(--border))' }
    };
    const t = tones[tone] || tones.blue;
    const display = 'R$ ' + (Number(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (
      <div className="fin-money">
        <label className="label" style={{ fontSize: 10, letterSpacing: '.08em', fontWeight: 700, color: t.fg, margin: "0px" }}>{label}</label>
        {readOnly ?
        <div className="fin-money-input fin-money-read tnum" style={{ background: t.bg, color: t.fg, borderColor: t.bd }}>{display}</div> :

        <input
          type="text"
          inputMode="decimal"
          className="fin-money-input tnum"
          style={{ background: t.bg, color: t.fg, borderColor: t.bd }}
          value={display}
          onFocus={(e) => {e.target.select();}}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '');
            const n = digits ? Number(digits) / 100 : 0;
            onChange(n);
          }} />

        }
      </div>);

  }

  // ---------- Styles ----------
  function FinStyles() {
    return (
      <style>{`
        /* Botão expansível Nova Receita / Nova Despesa */
        .fin-new-btn {
          display: inline-flex; align-items: center; justify-content: flex-end;
          height: 36px; padding: 0; border: none; cursor: pointer;
          border-radius: 100px; overflow: hidden;
          background: linear-gradient(90deg, #4DFC83 0%, #d3fd37 100%);
          color: #1a1a1a;
          box-shadow: 0 1px 3px rgba(0,0,0,.18);
          transition: box-shadow .2s ease, filter .2s ease;
        }
        .fin-new-btn:hover { box-shadow: 0 3px 10px rgba(0,0,0,.22); }
        .fin-new-btn:active { filter: brightness(.96); }
        .fin-new-label {
          max-width: 0; opacity: 0; overflow: hidden; white-space: nowrap;
          font-family: 'Poppins', sans-serif; font-size: 15px; font-weight: 400; letter-spacing: -.01em;
          padding-left: 0; line-height: 36px;
          transition: max-width .34s cubic-bezier(.4,0,.2,1), opacity .26s ease, padding-left .34s cubic-bezier(.4,0,.2,1);
        }
        .fin-new-btn:hover .fin-new-label,
        .fin-new-btn:focus-visible .fin-new-label {
          max-width: 220px; opacity: 1; padding-left: 18px;
        }
        .fin-new-plus {
          flex: 0 0 36px; width: 36px; height: 36px;
          display: inline-flex; align-items: center; justify-content: center;
        }
        .fin-new-plus svg {
          width: 22px; height: 22px;
          border: 2px solid #1a1a1a; border-radius: 50%;
          padding: 4px; box-sizing: border-box;
          stroke: #1a1a1a;
          transition: transform .5s cubic-bezier(.34,1.56,.64,1);
        }
        .fin-new-btn:hover .fin-new-plus svg,
        .fin-new-btn:focus-visible .fin-new-plus svg { transform: rotate(180deg); }

        /* KPI strip */
        .fin-kpi-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0,1fr));
          gap: 12px;
        }
        @media (max-width: 1280px) { .fin-kpi-grid { grid-template-columns: repeat(3, minmax(0,1fr)); } }
        @media (max-width: 720px)  { .fin-kpi-grid { grid-template-columns: repeat(2, minmax(0,1fr)); } }
        .fin-kpi {
          background: var(--surface);
          border: 1px solid var(--border);
          border-top: 3px solid #999;
          border-radius: 14px;
          padding: 14px 16px 16px;
          display: flex; flex-direction: column; gap: 14px;
          min-height: 110px;
          box-shadow: 0 1px 2px rgba(15,23,42,.04);
        }
        .fin-kpi-head { display: flex; align-items: center; gap: 10px; }
        .fin-kpi-icon { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .fin-kpi-label { font-size: 11px; font-weight: 700; letter-spacing: .08em; color: var(--text-muted); text-transform: uppercase; }
        .fin-kpi-value { font-size: 22px; font-weight: 700; letter-spacing: -0.01em; }

        /* Period filter */
        .fin-period { display: inline-flex; }
        .fin-period-row {
          position: relative;
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px;
          background: var(--surface-3);
          border: 1px solid var(--border);
          border-radius: 10px;
        }
        [data-theme="dark"] .fin-period-row { background: #1a1f25; border-color: #262c34; }

        /* Sliding active pill */
        .fin-period-pill {
          position: absolute;
          top: 4px;
          bottom: 4px;
          left: 0;
          border-radius: 7px;
          background: #10b981;
          box-shadow: 0 2px 6px rgba(16,185,129,.35), inset 0 1px 0 rgba(255,255,255,.18);
          transition: transform .32s cubic-bezier(.5,.2,.2,1), width .32s cubic-bezier(.5,.2,.2,1), opacity .2s;
          pointer-events: none;
          z-index: 0;
        }

        .fin-period-btn {
          position: relative;
          z-index: 1;
          appearance: none; border: 0; background: transparent;
          color: var(--text-muted); font-family: inherit; cursor: pointer;
          padding: 6px 10px; border-radius: 7px;
          display: inline-flex; flex-direction: column; align-items: center; gap: 0;
          line-height: 1.1; min-width: 44px;
          transition: color .2s;
        }
        .fin-period-btn .fin-period-ic { color: inherit; }
        .fin-period-btn .fin-period-num { font-weight: 700; font-size: 12px; letter-spacing: .04em; }
        .fin-period-btn .fin-period-sub { font-weight: 600; font-size: 9px; letter-spacing: .08em; opacity: .8; margin-top: 1px; }
        .fin-period-btn:hover { color: var(--text); }
        .fin-period-btn.on {
          color: white;
          text-shadow: 0 1px 0 rgba(0,0,0,.06);
        }
        .fin-period-btn.on:hover { color: white; }

        .fin-period-date {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 8px; border-radius: 7px;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text-muted);
        }
        [data-theme="dark"] .fin-period-date { background: #232932; border-color: #34404d; color: var(--text-muted); }
        .fin-period-date.on { border-color: var(--accent); color: var(--text); }
        .fin-period-date input[type="date"] {
          appearance: none; border: 0; background: transparent;
          color: inherit; font: inherit; padding: 4px 0; min-width: 110px;
          font-variant-numeric: tabular-nums;
        }
        .fin-period-date input[type="date"]:focus { outline: none; }
        [data-theme="dark"] .fin-period-date input::-webkit-calendar-picker-indicator { filter: invert(.7); }

        /* Status pills */
        .fin-stat-pill {
          appearance: none; cursor: pointer; font-family: inherit;
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 11px; border-radius: 999px;
          background: var(--surface); border: 1px solid var(--border-strong);
          color: var(--text-muted); font-size: 12px; font-weight: 600;
          transition: all .15s;
        }
        .fin-stat-pill:hover { color: var(--text); border-color: var(--text-muted); }
        .fin-stat-pill.on {
          background: var(--accent-soft); border-color: var(--accent); color: var(--accent-700);
        }
        .fin-stat-pill .dot { width: 7px; height: 7px; border-radius: 50%; }

        /* List */
        .fin-row {
          display: grid;
          grid-template-columns: 110px minmax(0, 2fr) minmax(180px, 1fr) minmax(150px, 1fr) 160px 132px;
          gap: 14px;
          padding: 12px;
          align-items: center;
        }
        .fin-row-head {
          background: var(--surface-2);
          border-bottom: 1px solid var(--border);
          font-size: 10px; font-weight: 700; letter-spacing: .08em; color: var(--text-faint);
          text-transform: uppercase;
          padding: 12px;
        }
        .fin-list { background: var(--surface-2); display: flex; flex-direction: column; gap: 4px; padding: 4px 0; }
        .fin-row-body {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          margin: 0 8px;
          transition: background .12s, box-shadow .12s, border-color .12s;
        }
        .fin-row-body:hover { background: var(--surface); box-shadow: 0 2px 10px rgba(15,23,42,.06); border-color: var(--border-strong); }

        .fin-c { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
        .fin-c-code { gap: 2px; }
        .fin-c-act { flex-direction: row; align-items: center; gap: 4px; justify-content: flex-end; }
        .fin-cliente {
          font-family: 'Poppins', sans-serif;
          font-weight: 600; font-size: var(--type-sm);
          text-transform: uppercase; letter-spacing: .01em;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .fin-status {
          display: inline-flex; align-items: center;
          padding: 2px 8px; border-radius: 999px;
          font-size: 10px; font-weight: 700; letter-spacing: .04em;
          width: fit-content;
          justify-content: center;
        }
        /* ── Status select colorido (drawer) ─────────────────── */
        .fin-status-select { position: relative; width: 100%; }
        .fin-status-trigger {
          display: flex; align-items: center; justify-content: space-between;
          gap: 8px; cursor: pointer; text-align: left;
        }
        .fin-status-chip {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 4px 12px; border-radius: 999px;
          font-size: var(--type-sm); font-weight: 700; letter-spacing: .01em;
          white-space: nowrap;
        }
        .fin-status-dot { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 8px; }
        .fin-status-menu {
          position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 40;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 12px; padding: 6px;
          box-shadow: 0 12px 32px -8px rgba(15,23,42,.3), 0 2px 8px rgba(15,23,42,.12);
          display: flex; flex-direction: column; gap: 2px;
          animation: fin-status-pop .14s ease;
        }
        [data-theme="dark"] .fin-status-menu { background: #11161c; border-color: #2a323c; }
        @keyframes fin-status-pop { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
        .fin-status-opt {
          display: flex; align-items: center; gap: 8px;
          background: none; border: none; cursor: pointer;
          padding: 6px 8px; border-radius: 8px; width: 100%; text-align: left;
          transition: background .12s ease;
        }
        .fin-status-opt:hover { background: var(--surface-2); }
        .fin-status-opt.on { background: var(--surface-2); }
        .fin-val-pill {
          display: inline-flex; align-items: center; gap: 2px;
          padding: 7px 14px;
          background: var(--surface-3);
          border-radius: 999px;
          font-size: var(--type-md); font-weight: 700;
          letter-spacing: -.01em;
          justify-self: end;
        }
        [data-theme="dark"] .fin-val-pill { background: color-mix(in oklab, currentColor 14%, var(--surface)); }

        .fin-pay:disabled { opacity: .35; cursor: not-allowed; }

        @media (max-width: 1100px) {
          .fin-row { grid-template-columns: 100px minmax(0, 2fr) minmax(160px, 1fr) 160px 120px; }
          .fin-c-tipo { display: none; }
        }

        /* Drawer (Nova Entrada) */
        .fin-drawer-ic {
          width: 32px; height: 32px; border-radius: 8px;
          background: var(--accent-soft); color: var(--accent-700);
          display: inline-flex; align-items: center; justify-content: center;
        }
        .fin-drawer-code {
          display: flex; flex-direction: column;
          align-items: center;
          gap: 2px;
          width: fit-content;
          font-size: 11px; color: var(--text-faint);
          letter-spacing: .08em; font-weight: 600;
          text-transform: uppercase;
          margin: -8px 0 14px auto;
        }
        .fin-drawer-code-head {
          flex-direction: row;
          align-items: center;
          gap: 8px;
          margin: 0 6px 0 0;
          flex: 0 0 auto;
        }
        .fin-drawer-code-head .fin-code-pill { margin: 0; padding: 4px 14px; }
        .fin-code-pill {
          display: inline-flex; align-items: center;
          padding: 6px 16px; margin: 0 4px 4px;
          border-radius: 100px;
          background: color-mix(in oklab, var(--text-muted) 14%, transparent);
          border: 1.5px solid var(--text-muted);
          color: var(--text-muted);
          font-size: var(--type-sm); font-weight: 700; letter-spacing: .04em;
          line-height: 1.4;
          transition: background .2s ease, border-color .2s ease, color .2s ease;
        }

        /* Modo visualização (somente leitura) */
        .fin-form-fieldset.is-view .input {
          background: var(--surface-2);
          color: var(--text);
          opacity: 1 !important;
          cursor: default;
          border-color: var(--border);
          -webkit-text-fill-color: var(--text);
        }
        .fin-form-fieldset.is-view select.input { appearance: none; -webkit-appearance: none; background-image: none; padding-right: 12px; }
        .fin-form-fieldset.is-view .fin-cat-add { display: none; }
        .fin-form-fieldset.is-view .row > .input { flex: 1 1 auto; }
        .fin-form-fieldset:disabled { opacity: 1; }
        .fin-fatura-summary {
          display: flex; flex-direction: column;
          border: 1px solid var(--border); border-radius: 12px;
          overflow: hidden; background: var(--surface-2);
        }
        .fin-fatura-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; padding: 10px 14px;
          border-bottom: 1px solid var(--border);
        }
        .fin-fatura-row:last-child { border-bottom: 0; }
        .fin-fatura-k {
          font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
          color: var(--text-muted); flex-shrink: 0;
        }
        .fin-fatura-v {
          font-size: var(--type-sm); font-weight: 600; color: var(--text);
          text-align: right; min-width: 0;
        }
        /* .fin-section-title e .fin-section agora são globais (styles.css) — tópicos coloridos */
        .fin-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .fin-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        @media (max-width: 640px) { .fin-grid-2, .fin-grid-3 { grid-template-columns: 1fr; } }
        .fin-cat-add {
          height: 36px; width: 36px; padding: 0;
          display: inline-flex; align-items: center; justify-content: center;
          background: var(--accent); border-color: var(--accent); color: white;
          flex-shrink: 0;
        }
        .fin-cat-add:hover { background: var(--accent-600); border-color: var(--accent-600); color: white; }

        .fin-money-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
        }
        @media (max-width: 720px) { .fin-money-grid { grid-template-columns: repeat(2, 1fr); } }
        .fin-money { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .fin-money-input {
          width: 100%; min-width: 0; box-sizing: border-box;
          height: 38px; padding: 0 12px;
          border-radius: 8px; border: 1px solid;
          font-weight: 700; font-size: 13.5px; letter-spacing: -.01em;
        }
        .fin-money-input:focus { outline: none; box-shadow: 0 0 0 3px color-mix(in oklab, currentColor 18%, transparent); }
        .fin-money-read { display: flex; align-items: center; }

        .fin-btn-back {
          background: color-mix(in oklab, #f43f5e 14%, white);
          border-color: color-mix(in oklab, #f43f5e 30%, transparent);
          color: #be123c;
        }
        .fin-btn-back:hover { background: color-mix(in oklab, #f43f5e 20%, white); border-color: #f43f5e; color: #be123c; }
        .fin-btn-save { background: var(--accent-grad); border-color: transparent; color: var(--accent-grad-ink); }
        .fin-btn-save:hover:not(:disabled) { filter: brightness(1.04) saturate(1.05); border-color: transparent; }
      `}</style>);

  }

  // ---------- Exports ----------
  function FinReceivables() {return <FinanceList kind="receivables" />;}
  function FinPayables() {return <FinanceList kind="payables" />;}

  Object.assign(window, { FinReceivables, FinPayables });
})();