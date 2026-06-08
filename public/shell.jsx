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
{ id: 'dashboard', label: 'Dashboard', icon: 'dashboard', perm: 'relatorios.ver' },
{ id: 'g-backoffice', label: 'Backoffice', icon: 'contracts', perm: 'config.gerenciar', children: [
  { id: 'bo-pendencias', label: 'Central de Pendências' },
  { id: 'bo-legal', label: 'Jurídico' },
  { id: 'bo-hr', label: 'RH' },
  { id: 'bo-fiscal', label: 'Fiscal' },
  { id: 'bo-accounting', label: 'Contábil' }]
},
{ id: 'g-finance', label: 'Financeiro', icon: 'coins', perm: 'financeiro.ver', children: [
  { id: 'fin-receivables', label: 'Receitas' },
  { id: 'fin-payables', label: 'Despesas' },
  { id: 'fin-accounts', label: 'Contas' },
  { id: 'fin-dre', label: 'DRE' },
  { id: 'fin-cashflow', label: 'Fluxo de Caixa' },
  { id: 'fin-commissions', label: 'Comissões' }]
},
{ id: 'g-commercial', label: 'Comercial', icon: 'commercial', children: [
  { id: 'com-dashboard', label: 'Dashboard', perm: 'relatorios.ver' },
  { id: 'com-sales', label: 'Vendas', perm: 'vendas.ver' },
  { id: 'com-clients', label: 'Clientes', perm: 'clientes.ver' },
  { id: 'leads', label: 'Leads', perm: 'leads.ver' },
  { id: 'team', label: 'Equipe', perm: 'config.gerenciar' },
  { id: 'catalog', label: 'Catálogo', perm: 'catalogo.ver' }]
},
{ id: 'crm', label: 'CRM', icon: 'columns', perm: 'crm.ver' },
{ id: 'g-marketing', label: 'Marketing', icon: 'megaphone', perm: 'marketing.ver', children: [
  { id: 'mkt-agent', label: 'Agente de Mkt' },
  { id: 'mkt-campaigns', label: 'Campanhas' },
  { id: 'mkt-flow-ai', label: 'Fluxo IA' }]
},
{ id: 'inbox', label: 'Chatbot', icon: 'chat', perm: 'atendimento.ver' },
{ id: 'agent', label: 'Agente IA', icon: 'sparkles', perm: 'config.gerenciar' },
{ id: 'reports', label: 'Relatórios', icon: 'reports', perm: 'relatorios.ver' }];

// Filtra um nav pelas permissões (can). Itens/filhos sem `perm` sempre aparecem;
// um grupo some se tiver `perm` que falta OU se nenhum filho restar visível.
// Enquanto as permissões não carregaram, mostra tudo (evita menu vazio piscando).
function filtrarNav(items, can, loaded) {
  if (!loaded) return items;
  const out = [];
  for (const it of items) {
    if (it.perm && !can(it.perm)) continue;
    if (it.children) {
      const kids = it.children.filter((c) => !c.perm || can(c.perm));
      if (!kids.length) continue;
      out.push({ ...it, children: kids });
    } else {
      out.push(it);
    }
  }
  return out;
}


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
{ id: 'inbox', label: 'Mensagens', icon: 'inbox', perm: 'atendimento.ver' },
{ id: 'queue', label: 'Fila', icon: 'clock', perm: 'atendimento.ver' },
{ id: 'agenda', label: 'Agenda', icon: 'agenda', perm: 'agenda.ver' },
{ id: 'crm', label: 'CRM Kanban', icon: 'columns', perm: 'crm.ver' }];


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
  const { tweaks, setTweak, route, setRoute, auth, can } = useStore();

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

  // Menu dirigido pelo simulador "ver como" (tweaks.profile) — que ao logar
  // espelha o papel REAL — e filtrado pelas permissões reais (can()). Alternar o
  // simulador pré-visualiza outro papel; o backend continua usando o papel real.
  const navBase = tweaks.profile === 'super' ? NAV_SUPER : tweaks.profile === 'atendente' ? NAV_ATEND : NAV_ADMIN;
  const nav = filtrarNav(navBase, can, auth.loaded);
  const me = {
    name: auth.nome || auth.email || 'Usuário',
    role: tweaks.profile === 'super' ? 'Super Admin' : tweaks.profile === 'atendente' ? 'Atendente' : (auth.papelNome || 'Admin da Loja'),
  };

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
        <div className="brand-name">Pk360<small>{(tweaks.profile === 'super' ? 'PLATAFORMA' : (auth.empresaNome || 'ATENDE.IA')).toUpperCase()}</small></div>
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
      <div className="drawer" style={{ maxWidth: width, height: '100%', maxHeight: '100%' }} onClick={(e) => e.stopPropagation()}>
        <div className="drawer-hd" style={{ height: "54px", flexShrink: 0 }}>
          {leftHead}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--type-md)' }}>{title}</div>
            {subtitle && <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          {rightHead}
          <div className="btn btn-ghost btn-icon" onClick={close}><Ic name="x" size={16} /></div>
        </div>
        {belowHead}
        <div className="drawer-bd" style={{ flex: 1, minHeight: 0 }}>{children}</div>
        {footer && <div className="drawer-ft" style={{ flexShrink: 0 }}>{typeof footer === 'function' ? footer(close) : footer}</div>}
      </div>
    </div>);

}

// ── DesignerAba01 ("designer aba 01") ────────────────────────────────────────
// Aba lateral PADRÃO de visualização de dados em blocos. Reutilizável em
// qualquer tela: passe
//     blocos = [{ titulo, campos: [{ ic, label, v, full }] }]
// Renderiza um Drawer (largura 60vw por padrão) com seções "fin-section" flat
// (sem destaque verde à esquerda, cantos 6px) e os campos em 3 colunas
// (rótulo + caixa com ícone + valor). Rodapé: Voltar + (opcional) Editar quando
// `onEditar` é passado. `full: true` no campo faz ele ocupar a linha inteira.
function DA01Campo({ ic, label, v, full, col, editing, k, ro, area, grow, onChange }) {
  const style = full ? { gridColumn: '1 / -1' } : (col ? { gridColumn: 'span ' + col } : undefined);
  const editavel = editing && !ro;
  const cls = 'da01-campo' + (grow ? ' da01-grow' : '');
  if (area) {
    return (
      <div className={cls} style={style}>
        {label && <div className="da01-lbl">{label}</div>}
        {editavel
          ? <textarea className="da01-area is-edit" value={v == null ? '' : v} onChange={(ev) => onChange(k, ev.target.value)} />
          : <div className="da01-area">{v === undefined || v === null || v === '' ? '—' : v}</div>}
      </div>);
  }
  return (
    <div className={cls} style={style}>
      {label && <div className="da01-lbl">{label}</div>}
      <div className={'da01-box' + (editavel ? ' is-edit' : '')}>
        {ic && <Ic name={ic} size={13} />}
        {editavel
          ? <input className="da01-input" value={v == null ? '' : v} onChange={(ev) => onChange(k, ev.target.value)} />
          : <span className="da01-v">{v === undefined || v === null || v === '' ? '—' : v}</span>}
      </div>
    </div>);
}
// onSalvar -> habilita EDIÇÃO INLINE (botão Editar libera os campos + mostra Salvar,
// sem abrir outra aba). onEditar -> ação externa (compat). Campo com ro:true não edita.
function DesignerAba01({ title, subtitle, width = '60vw', blocos = [], onClose, onSalvar, onEditar, editarLabel = 'Editar' }) {
  const [editing, setEditing] = React.useState(false);
  const [vals, setVals] = React.useState({});
  const keyOf = (c, bi, ci) => c.k || (bi + ':' + ci);
  const startEdit = () => {
    const init = {};
    blocos.forEach((b, bi) => (b.campos || []).forEach((c, ci) => { init[keyOf(c, bi, ci)] = c.v; }));
    setVals(init); setEditing(true);
  };
  const setVal = (key, val) => setVals((s) => ({ ...s, [key]: val }));
  const salvar = () => { setEditing(false); onSalvar && onSalvar(vals); };
  const footer = editing
    ? <><div style={{ flex: 1 }} /><ActionButton action="cancelar" size="md" onClick={() => setEditing(false)} /><ActionButton action="salvar" size="md" onClick={salvar} /></>
    : <><div style={{ flex: 1 }} /><ActionButton action="voltar" size="md" onClick={onClose} />{(onSalvar || onEditar) && <ActionButton action="editar" size="md" label={editarLabel} onClick={onSalvar ? startEdit : onEditar} />}</>;
  return (
    <Drawer title={title} subtitle={subtitle} onClose={onClose} width={width} footer={footer}>
      <div className="tpc-flat da01">
        {blocos.map((b, bi) => {
          const grow = (b.campos || []).some((c) => c.grow);
          return (
            <React.Fragment key={bi}>
              <div className="fin-section-title">{b.titulo}</div>
              <div className={'fin-section' + (grow ? ' da01-secgrow' : '')} style={{ marginBottom: 16 }}>
                <div className="da01-grid">
                  {(b.campos || []).map((c, ci) => {
                    const key = keyOf(c, bi, ci);
                    return <DA01Campo key={ci} {...c} editing={editing} k={key} v={editing ? vals[key] : c.v} onChange={setVal} />;
                  })}
                </div>
              </div>
            </React.Fragment>);
        })}
      </div>
    </Drawer>);
}

// ── ActionButton — sistema de botões PADRÃO (cor + ícone por ação, 3 tamanhos) ──
// Estilo pílula com fundo tint + ícone/texto na cor cheia da mesma família.
// Uso: <ActionButton action="salvar|voltar|excluir|cancelar|editar|atencao" size="lg|md|sm" onClick=.. />
// `label`/`icon` opcionais sobrescrevem o padrão da ação.
const ACTION_BTN = {
  salvar:   { cor: '#3DA767', bg: '#C9F0D3', icon: 'check',      label: 'Salvar' },
  voltar:   { cor: '#FF452A', bg: '#FFEBEC', icon: 'arrow-left', label: 'Voltar' },
  excluir:  { cor: '#FF452A', bg: '#FFEBEC', icon: 'trash',      label: 'Excluir' },
  cancelar: { cor: '#FF452A', bg: '#FFEBEC', icon: 'x',          label: 'Cancelar' },
  editar:   { cor: '#165EEE', bg: '#EAF0FE', icon: 'edit',       label: 'Editar' },
  anterior: { cor: '#FF452A', bg: '#FFEBEC', icon: 'arrow-left', label: 'Anterior' },
  proximo:  { cor: '#3DA767', bg: '#C9F0D3', icon: 'arrow-right', label: 'Próximo', iconRight: true },
  atencao:  { cor: '#FF8B30', bg: '#FDEEE7', icon: 'alert',      label: 'Atenção' },
};
const ACTION_BTN_SIZE = {
  lg: { h: 56, px: 20, gap: 8, fs: 18, ic: 24 },
  md: { h: 40, px: 16, gap: 8, fs: 16, ic: 20 },
  sm: { h: 36, px: 12, gap: 6, fs: 14, ic: 16 },
};
// "Botão Salvar efeito" (onda de pontinhos -> confete) embutido: padrão em action="salvar".
const ACTION_CONFETE = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
function ActionButton({ action = 'salvar', size = 'md', label, icon, onClick, disabled, type = 'button', title, className = '', style, efeito }) {
  const a = ACTION_BTN[action] || ACTION_BTN.salvar;
  const s = ACTION_BTN_SIZE[size] || ACTION_BTN_SIZE.md;
  const ic = icon === undefined ? a.icon : icon;
  const txt = label === undefined ? a.label : label;
  // efeito de salvar: ligado por padrão em "salvar" (desligue com efeito={false}). onClick roda ao FIM do efeito.
  const comEfeito = (efeito === undefined ? action === 'salvar' : efeito) && !disabled;
  const [estado, setEstado] = React.useState('idle'); // idle | loading | done
  const ref = React.useRef(null);
  const [lockW, setLockW] = React.useState(null);
  const pecas = React.useMemo(() => Array.from({ length: 22 }, (_, i) => {
    const ang = (Math.PI * (i + 0.5)) / 11, dist = 40 + (i % 5) * 16;
    return { tx: Math.round(Math.cos(ang) * dist) + 'px', ty: Math.round(-Math.abs(Math.sin(ang)) * dist - 14 - (i % 4) * 8) + 'px', rot: ((i * 53) % 360) + 'deg', d: ((i % 7) * 16) + 'ms', cor: ACTION_CONFETE[i % ACTION_CONFETE.length], sz: 5 + (i % 4) * 2 };
  }), []);
  const handle = () => {
    if (!comEfeito) { onClick && onClick(); return; }
    if (estado !== 'idle') return;
    if (ref.current) setLockW(ref.current.offsetWidth);
    setEstado('loading');
    setTimeout(() => setEstado('done'), 1100);
    setTimeout(() => { setEstado('idle'); setLockW(null); onClick && onClick(); }, 2050);
  };
  return (
    <button ref={ref} type={type} title={title} onClick={handle} disabled={disabled}
      className={'ab' + (comEfeito ? ' ab-fx' : '') + (className ? ' ' + className : '')}
      style={{ height: s.h, padding: `0 ${s.px}px`, gap: s.gap, fontSize: s.fs, color: a.cor, background: a.bg, borderColor: `color-mix(in oklab, ${a.cor} 28%, transparent)`, minWidth: lockW || undefined, ...style }}>
      {estado === 'idle' && <>{ic && !a.iconRight && <Ic name={ic} size={s.ic} />}{txt !== '' && txt != null && <span>{txt}</span>}{ic && a.iconRight && <Ic name={ic} size={s.ic} />}</>}
      {estado === 'loading' && <span className="ab-dots"><i /><i /><i /></span>}
      {estado === 'done' && <span className="ab-confetti">{pecas.map((p, i) => <span key={i} className="ab-piece" style={{ '--tx': p.tx, '--ty': p.ty, '--rot': p.rot, '--d': p.d, background: p.cor, width: p.sz, height: p.sz }} />)}</span>}
    </button>);
}

// ── Toast (notificação) — só o tipo "sucesso" por enquanto ───────────────────
// Dispare de qualquer lugar: window.showToast({ tipo:'sucesso', titulo, descricao, duracao })
// Cores da MESMA família da ação (sem preto): título/ícone na cor forte, descrição
// um pouco mais clara, fundo tint. Barrinha de contagem regressiva na base.
const TOAST_TIPO = {
  sucesso: { cor: '#3DA767', bg: '#C9F0D3', ic: 'check-double' },
  erro:    { cor: '#FF452A', bg: '#FFEBEC', ic: 'x-circle' },
  aviso:   { cor: '#FF8B30', bg: '#FDEEE7', ic: 'alert' },
  info:    { cor: '#165EEE', bg: '#EAF0FE', ic: 'info' },
  neutro:  { cor: '#4B5563', bg: '#EEF1F4', ic: 'bell' },
};
function Toast({ tipo = 'sucesso', titulo, descricao, duracao = 4000, onClose }) {
  const c = TOAST_TIPO[tipo] || TOAST_TIPO.sucesso;
  const [saindo, setSaindo] = React.useState(false);
  const fechar = React.useCallback(() => { setSaindo(true); setTimeout(() => onClose && onClose(), 240); }, [onClose]);
  React.useEffect(() => { const t = setTimeout(fechar, duracao); return () => clearTimeout(t); }, [duracao, fechar]);
  return (
    <div className={'toast' + (saindo ? ' is-out' : '')} style={{ background: c.bg, borderColor: `color-mix(in oklab, ${c.cor} 30%, transparent)` }}>
      <div className="toast-ic" style={{ color: c.cor }}><Ic name={c.ic} size={18} /></div>
      <div className="toast-body">
        <div className="toast-titulo" style={{ color: c.cor }}>{titulo}</div>
        {descricao && <div className="toast-desc" style={{ color: `color-mix(in oklab, ${c.cor} 72%, #fff)` }}>{descricao}</div>}
      </div>
      <button className="toast-x" style={{ color: c.cor }} onClick={fechar} aria-label="Fechar"><Ic name="x" size={15} /></button>
      <span className="toast-bar" style={{ background: c.cor, animationDuration: duracao + 'ms' }} />
    </div>);
}
function ToastHost() {
  const [toasts, setToasts] = React.useState([]);
  const idRef = React.useRef(1);
  React.useEffect(() => {
    const h = (e) => setToasts((ts) => [...ts, { id: idRef.current++, ...(e.detail || {}) }]);
    window.addEventListener('app-toast', h);
    return () => window.removeEventListener('app-toast', h);
  }, []);
  const remove = (id) => setToasts((ts) => ts.filter((t) => t.id !== id));
  return (
    <div className="toast-host">
      {toasts.map((t) => <Toast key={t.id} tipo={t.tipo} titulo={t.titulo} descricao={t.descricao} duracao={t.duracao} onClose={() => remove(t.id)} />)}
    </div>);
}
window.showToast = (opts) => { try { window.dispatchEvent(new CustomEvent('app-toast', { detail: opts || {} })); } catch (e) {} };

// ── "Botão Efeito Criar +" (FabNovo) ──────────────────────────────────────────
// Pílula gradiente verde-lima, recolhida só com o (+); no hover o rótulo desliza
// pra esquerda e o (+) gira 180° (molejo). Coloque o botão ANCORADO À DIREITA pra
// abrir o rótulo pra esquerda. Tamanhos: lg | md | sm | mini. CSS .fab-novo em styles.css.
function FabNovo({ size = 'md', label = 'Nova receita', onClick, title }) {
  return (
    <button type="button" className={'fab-novo fab-' + size} onClick={onClick} title={title} aria-label={label}>
      <span className="fab-label">{label + ' '}</span>
      <span className="fab-plus"><svg viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5.5v13M5.5 12h13" /></svg></span>
    </button>);
}

// ── AddCard — "card de criação" (tile tracejado, igual ao "Cadastrar conta") ──────
// Círculo gradiente com (+) que gira 180° no hover, título e subtítulo. Estica no grid
// pra acompanhar os cards irmãos. CSS .add-card em styles.css.
function AddCard({ title = 'Adicionar', subtitle, icon, onClick, compact, className = '', style }) {
  return (
    <button type="button" className={'add-card' + (compact ? ' add-card-sm' : '') + (className ? ' ' + className : '')} onClick={onClick} style={style}>
      <div className="add-card-circle">{icon ? <Ic name={icon} size={28} /> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5.5v13M5.5 12h13" /></svg>}</div>
      <div className="add-card-title">{title}</div>
      {subtitle && <div className="add-card-sub">{subtitle}</div>}
    </button>);
}

// ── Skeleton ("skeleton Carregamento") — bloco cinza com shimmer leve (--surface-3, respeita o tema) ──
// Reutilizável: <Skeleton w={120} h={12} /> · <Skeleton circle w={40} h={40} /> · r=raio.
// Regra: monte o skeleton com as MESMAS classes/medidas do conteúdo real, DENTRO do mesmo grid;
// quantidade via skelCount/skelRemember; some só quando os dados carregam (não por tempo fixo).
function Skeleton({ w, h = 12, r, circle, className = '', style }) {
  return <span className={'skeleton' + (className ? ' ' + className : '')} style={{ display: 'block', flexShrink: 0, width: w, height: h, borderRadius: circle ? '50%' : (r != null ? r : 6), ...style }} />;
}

// Lembra a última quantidade de itens por tela — pro skeleton mostrar o nº real (não a tela toda).
function skelCount(key, fallback = 3) { try { const v = parseInt(localStorage.getItem('skelN:' + key), 10); return v > 0 ? v : fallback; } catch (e) { return fallback; } }
function skelRemember(key, n) { try { if (n > 0) localStorage.setItem('skelN:' + key, String(n)); } catch (e) {} }

Object.assign(window, { Avatar, ChannelIcon, StatusBadge, Sidebar, Topbar, Page, EmptyState, Stat, Modal, Drawer, DesignerAba01, DA01Campo, ActionButton, ToastHost, Toast, FabNovo, AddCard, Skeleton, skelCount, skelRemember });