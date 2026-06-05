// shell.jsx — Sidebar, Topbar, Avatar, common shells

const Avatar = ({ name, size, src, color, online }) => {
  const cls = size === 'sm' ? 'avatar avatar-sm' : size === 'lg' ? 'avatar avatar-lg' : size === 'xl' ? 'avatar avatar-xl' : 'avatar';
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <div className={cls} style={{ background: color || colorFor(name) }}>
        {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }} /> : initials(name)}
      </div>
      {online && <span className="dot dot-online" style={{ position: 'absolute', right: 0, bottom: 0, width: 9, height: 9, border: '2px solid var(--surface)' }} />}
    </div>);

};

const ChannelIcon = ({ ch, size = 14 }) => {
  const map = { whatsapp: { name: 'whatsapp', color: '#25d366' }, instagram: { name: 'instagram', color: '#e4405f' }, facebook: { name: 'facebook', color: '#1877f2' } };
  const m = map[ch] || { name: 'inbox', color: '#94a3b8' };
  return <span style={{ color: m.color, display: 'inline-flex' }}><Ic name={m.name} size={size} /></span>;
};

const StatusBadge = ({ status }) => {
  const map = {
    'ativo': { c: 'badge-success', t: 'Ativo' },
    'pendente': { c: 'badge-warning', t: 'Pendente' },
    'vencendo': { c: 'badge-warning', t: 'Vencendo' },
    'inativo': { c: 'badge-neutral', t: 'Inativo' },
    'trial': { c: 'badge-info', t: 'Trial' },
    'suspenso': { c: 'badge-neutral', t: 'Suspenso' },
    'atrasado': { c: 'badge-danger', t: 'Atrasado' },
    'agendado': { c: 'badge-info', t: 'Agendado' },
    'confirmado': { c: 'badge-success', t: 'Confirmado' },
    'realizado': { c: 'badge-neutral', t: 'Realizado' },
    'cancelado': { c: 'badge-danger', t: 'Cancelado' }
  };
  const m = map[status] || { c: 'badge-neutral', t: status };
  return <span className={`badge ${m.c}`}>{m.t}</span>;
};

// Sidebar items by profile — supports nested children (submenus)
const NAV_ADMIN = [
{ id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
{ id: 'g-backoffice', label: 'Backoffice', icon: 'contracts', children: [
  { id: 'bo-pendencias', label: 'Central de Pendências' },
  { id: 'bo-legal', label: 'Jurídico' },
  { id: 'bo-hr', label: 'RH' },
  { id: 'bo-fiscal', label: 'Fiscal' },
  { id: 'bo-accounting', label: 'Contábil' }]
},
{ id: 'g-finance', label: 'Financeiro', icon: 'coins', children: [
  { id: 'fin-receivables', label: 'Receitas' },
  { id: 'fin-payables', label: 'Despesas' },
  { id: 'fin-accounts', label: 'Contas' },
  { id: 'fin-dre', label: 'DRE' },
  { id: 'fin-cashflow', label: 'Fluxo de Caixa' },
  { id: 'fin-commissions', label: 'Comissões' }]
},
{ id: 'g-commercial', label: 'Comercial', icon: 'commercial', children: [
  { id: 'com-dashboard', label: 'Dashboard' },
  { id: 'com-sales', label: 'Vendas' },
  { id: 'com-clients', label: 'Clientes' },
  { id: 'leads', label: 'Leads' },
  { id: 'team', label: 'Equipe' },
  { id: 'catalog', label: 'Catálogo' }]
},
{ id: 'crm', label: 'CRM', icon: 'columns' },
{ id: 'g-marketing', label: 'Marketing', icon: 'megaphone', children: [
  { id: 'mkt-agent', label: 'Agente de Mkt' },
  { id: 'mkt-campaigns', label: 'Campanhas' },
  { id: 'mkt-flow-ai', label: 'Fluxo IA' }]
},
{ id: 'inbox', label: 'Chatbot', icon: 'chat' },
{ id: 'agent', label: 'Agente IA', icon: 'sparkles' },
{ id: 'reports', label: 'Relatórios', icon: 'reports' }];


// Routes that actually have a screen wired up (others render as "em breve")
const AVAILABLE_ROUTES = new Set([
'dashboard', 'inbox', 'queue', 'notifs', 'agent', 'agent-config', 'crm', 'crm-board', 'agenda',
'leads', 'team', 'catalog', 'finance', 'reports', 'history', 'rules', 'replies', 'integrations',
'settings', 'atendente-dashboard', 'client-profile', 'user-profile', 'com-clients', 'com-dashboard', 'com-sales',
'mkt-agent', 'mkt-campaigns', 'mkt-flow-ai',
'bo-pendencias', 'bo-legal', 'bo-hr', 'bo-fiscal', 'bo-accounting',
'fin-receivables', 'fin-payables', 'fin-accounts', 'fin-dre', 'fin-commissions',
'super-dashboard', 'super-tenants', 'super-plans', 'super-usage', 'super-logs', 'super-billing']
);

const NAV_ATEND = [
{ id: 'atendente-dashboard', label: 'Painel', icon: 'dashboard' },
{ id: 'inbox', label: 'Mensagens', icon: 'inbox' },
{ id: 'queue', label: 'Fila', icon: 'clock' },
{ id: 'agenda', label: 'Agenda', icon: 'agenda' },
{ id: 'crm', label: 'CRM Kanban', icon: 'columns' }];


const NAV_SUPER = [
{ id: 'super-dashboard', label: 'Visão geral', icon: 'dashboard' },
{ id: 'super-tenants', label: 'Clientes', icon: 'building' },
{ id: 'super-plans', label: 'Planos', icon: 'wallet' },
{ id: 'super-usage', label: 'Monitoramento', icon: 'activity' },
{ id: 'super-logs', label: 'Logs', icon: 'database' },
{ id: 'super-billing', label: 'Faturamento', icon: 'wallet' }];


// NavSub — animates height from 0 → content height (measured via ref)
function NavSub({ isOpen, children }) {
  const ref = React.useRef(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (isOpen) {
      const inner = el.firstElementChild;
      const h = inner ? inner.scrollHeight : 0;
      el.style.height = h + 'px';
      const onEnd = (e) => {
        if (e.propertyName !== 'height') return;
        el.style.height = 'auto';
        el.removeEventListener('transitionend', onEnd);
      };
      el.addEventListener('transitionend', onEnd);
      return () => el.removeEventListener('transitionend', onEnd);
    } else {
      // Set explicit height first (in case it was 'auto'), then 0 on next frame
      el.style.height = el.scrollHeight + 'px';
      // Force reflow
      void el.offsetHeight;
      el.style.height = '0px';
    }
  }, [isOpen, children]);
  return (
    <div ref={ref} className={`nav-sub ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen}>
      {children}
    </div>);

}

// NavSubInner — wraps submenu items and animates a sliding highlight pill
function NavSubInner({ children }) {
  const innerRef = React.useRef(null);
  const [pos, setPos] = React.useState({ top: 0, height: 0, visible: false });

  React.useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => {
      const active = el.querySelector('.nav-sub-item.active');
      if (!active) {
        setPos((p) => p.visible ? { ...p, visible: false } : p);
        return;
      }
      const innerRect = el.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      const next = {
        top: activeRect.top - innerRect.top - 3,
        height: activeRect.height + 6,
        visible: true
      };
      setPos((p) => p.top === next.top && p.height === next.height && p.visible === next.visible ? p : next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children]);

  return (
    <div ref={innerRef} className="nav-sub-inner">
      <div
        className={`nav-sub-highlight ${pos.visible ? 'is-visible' : ''}`}
        style={{ transform: `translateY(${pos.top}px)`, height: `${pos.height}px` }}
        aria-hidden="true" />
      {children}
    </div>);

}

function Sidebar({ collapsed = false, setCollapsed = () => {}, isMobile = false, onNavigate = () => {} }) {
  const { tweaks, setTweak, route, setRoute } = useStore();

  // Routes that should keep the parent nav item highlighted (e.g. drilling into a board
  // from the CRM list view should keep "CRM" lit because we're still inside the module).
  const ROUTE_SCOPE = {
    'crm': ['crm', 'crm-board'],
    'agent': ['agent', 'agent-config']
  };
  const isItemActive = (id) => {
    const scope = ROUTE_SCOPE[id];
    return scope ? scope.includes(route) : route === id;
  };

  const nav = tweaks.profile === 'super' ? NAV_SUPER : tweaks.profile === 'atendente' ? NAV_ATEND : NAV_ADMIN;
  const me = tweaks.profile === 'super' ?
  { name: 'Magno Vieira', role: 'Super Admin' } :
  tweaks.profile === 'atendente' ?
  { name: 'Karla Zambelly', role: 'Atendente' } :
  { name: 'Paulo Henrique', role: 'Administrador' };

  // Track open groups; auto-open the group whose child matches the active route
  const initialOpen = () => {
    for (const it of nav) {
      if (it.children && it.children.some((c) => c.id === route)) return { [it.id]: true };
    }
    return {};
  };
  const [open, setOpen] = React.useState(initialOpen);
  React.useEffect(() => {
    for (const it of nav) {
      if (it.children && it.children.some((c) => c.id === route)) {
        setOpen({ [it.id]: true });
        return;
      }
    }
    // Active route is not inside any submenu → collapse all groups
    setOpen({});
  }, [route, tweaks.profile]);

  const toggleGroup = (id) => {
    if (collapsed) {
      setCollapsed(false);
      setOpen({ [id]: true });
      return;
    }
    setOpen((o) => o[id] ? {} : { [id]: true });
  };

  const goto = (id) => {
    if (!AVAILABLE_ROUTES.has(id)) return;
    setRoute(id);
    onNavigate(); // fecha o drawer no mobile após escolher um item
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand" style={{ height: "65px" }}>
        <div
          className="brand-logo"
          aria-hidden="true"
          onClick={() => {if (collapsed) {setOpen({});setCollapsed(false);}}}
          title={collapsed ? 'Expandir menu' : ''}>
          <img src="assets/simbolo.png" alt="Pk360" style={{ width: "36px", height: "36px" }} />
        </div>
        <div className="brand-name">Pk360<small>{TENANT.name.toUpperCase()}</small></div>
        <div className="menu-toggle brand-toggle" onClick={() => { if (isMobile) { onNavigate(); return; } setOpen({}); setCollapsed(!collapsed); }} title={isMobile ? 'Fechar menu' : (collapsed ? 'Expandir menu' : 'Recolher menu')}>
          <Ic name={isMobile ? 'x' : (collapsed ? 'menu-closed' : 'menu-open')} size={20} />
        </div>
      </div>
      <nav className="sidebar-nav scroll">
        {nav.map((it) => {
          if (it.children) {
            const isOpen = !!open[it.id] && !collapsed;
            const hasActiveChild = it.children.some((c) => isItemActive(c.id));
            return (
              <div key={it.id} className={`nav-group ${isOpen ? 'is-open' : ''}`}>
                <div
                  className={`nav-item nav-group-head ${hasActiveChild ? 'has-active' : ''}`}
                  onClick={() => toggleGroup(it.id)}
                  title={it.label}>
                  
                  <span className="ni-icon"><Ic name={it.icon} size={22} /></span>
                  <span style={{ fontSize: "15px", fontWeight: "400" }}>{it.label}</span>
                  <span className={`ni-chev ${isOpen ? 'open' : ''}`}><Ic name="chevron-down" size={14} /></span>
                </div>
                <NavSub isOpen={isOpen}>
                  <NavSubInner>
                    {it.children.map((c) => {
                      const avail = AVAILABLE_ROUTES.has(c.id);
                      const active = isItemActive(c.id);
                      return (
                        <div
                          key={c.id}
                          className={`nav-sub-item ${active ? 'active' : ''} ${avail ? '' : 'is-disabled'}`}
                          onClick={() => avail && goto(c.id)}
                          title={avail ? c.label : `${c.label} · em breve`} style={{ height: "28px", margin: "0px 11px", padding: "5px 10px 5px 25px" }}>
                          
                          <span className="nav-sub-bullet" />
                          <span className="nav-sub-label">{c.label}</span>
                          {!avail && <span className="nav-sub-tag">em breve</span>}
                        </div>);

                    })}
                  </NavSubInner>
                </NavSub>
              </div>);

          }
          return (
            <div key={it.id} className={`nav-item ${isItemActive(it.id) ? 'active' : ''}`} onClick={() => goto(it.id)} title={it.label}>
              <span className="ni-icon"><Ic name={it.icon} size={22} /></span>
              <span style={{ fontSize: "15px", fontWeight: "400" }}>{it.label}</span>
              {it.badge != null && <span className="ni-badge"><span className="badge badge-accent">{it.badge}</span></span>}
            </div>);

        })}
      </nav>
      <div className="sidebar-foot">
        <SidebarUserMenu collapsed={collapsed} />
      </div>
    </aside>);

}

function Topbar({ title, subtitle, right, left }) {
  const { tweaks, setTweak, setRoute, route } = useStore();
  return (
    <div className="topbar">
      {left}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="h2">{title}</div>
        {subtitle && <div className="topbar-sub">{subtitle}</div>}
      </div>
      {right}
      <div className="row" style={{ gap: 6 }}>
        <div className="btn btn-ghost btn-icon" title="Agenda" onClick={() => setRoute('agenda')} style={{ width: "32px", height: "32px", transform: "translateY(-4px)" }}><Ic name="agenda" size={22} /></div>
        <NotifMenu />
      </div>
    </div>);

}

function Page({ title, subtitle, actions, children, padded = true }) {
  return (
    <div className="screen">
      <Topbar title={title} subtitle={subtitle} right={actions} />
      {padded ? <div className="page scroll" style={{ flex: 1, overflow: 'auto' }}>{children}</div> : children}
    </div>);

}

function EmptyState({ icon = 'inbox', title, desc, action }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Ic name={icon} size={26} /></div>
      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{title}</div>
      {desc && <div style={{ fontSize: 'var(--type-sm)', maxWidth: 340 }}>{desc}</div>}
      {action}
    </div>);

}

function Stat({ label, value, foot, icon, accent }) {
  return (
    <div className="stat">
      <div className="stat-label">
        <span>{label}</span>
        {icon && <span className="stat-icon" style={accent ? { background: accent.bg, color: accent.fg } : undefined}><Ic name={icon} size={15} /></span>}
      </div>
      <div className="stat-value tnum" style={accent ? { color: accent.fg } : undefined}>{value}</div>
      {foot && <div className="stat-foot">{foot}</div>}
    </div>);

}

function Modal({ title, onClose, children, footer, size = 'md' }) {
  const w = { sm: 420, md: 540, lg: 720, xl: 920 }[size];
  const [closing, setClosing] = React.useState(false);
  // close() animates out, then runs an optional callback, then onClose.
  // (backdrop/X pass a SyntheticEvent — guarded by typeof check.)
  const close = React.useCallback((cb) => {
    setClosing(true);
    setTimeout(() => {
      if (typeof cb === 'function') cb();
      onClose && onClose();
    }, 180);
  }, [onClose]);
  return (
    <div className={`modal-back ${closing ? 'closing' : ''}`} onClick={close}>
      <div className="modal" style={{ maxWidth: w }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd">
          <div style={{ fontWeight: 600, fontSize: 'var(--type-md)' }}>{title}</div>
          <div className="modal-x btn btn-ghost btn-icon" onClick={close}><Ic name="x" size={16} /></div>
        </div>
        <div className="modal-bd scroll">{children}</div>
        {footer && <div className="modal-ft">{typeof footer === 'function' ? footer(close) : footer}</div>}
      </div>
    </div>);

}

function Drawer({ title, subtitle, onClose, children, footer, width = 720, leftHead, rightHead, belowHead }) {
  const [closing, setClosing] = React.useState(false);
  // close() animates the panel out, then runs an optional callback, then onClose.
  const close = React.useCallback((cb) => {
    setClosing(true);
    setTimeout(() => {
      if (typeof cb === 'function') cb();
      onClose && onClose();
    }, 240);
  }, [onClose]);
  return (
    <div className={`drawer-back ${closing ? 'closing' : ''}`} onClick={close}>
      <div className="drawer" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div className="drawer-hd" style={{ height: "54px" }}>
          {leftHead}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--type-md)' }}>{title}</div>
            {subtitle && <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          {rightHead}
          <div className="btn btn-ghost btn-icon" onClick={close}><Ic name="x" size={16} /></div>
        </div>
        {belowHead}
        <div className="drawer-bd">{children}</div>
        {footer && <div className="drawer-ft">{typeof footer === 'function' ? footer(close) : footer}</div>}
      </div>
    </div>);

}

Object.assign(window, { Avatar, ChannelIcon, StatusBadge, Sidebar, Topbar, Page, EmptyState, Stat, Modal, Drawer });