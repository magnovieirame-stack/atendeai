// app.jsx — main app entry, router, tweaks panel

function TweaksUI() {
  const { tweaks, setTweak } = useStore();
  return (
    <TweaksPanel title="Tweaks · ATENDE.IA">
      <TweakSection label="Perfil" />
      <TweakRadio label="Logado como" value={tweaks.profile} options={[{value:'admin',label:'Admin'},{value:'atendente',label:'Atendente'},{value:'super',label:'Super'}]} onChange={v=>setTweak('profile',v)} />
      <TweakSection label="Aparência" />
      <TweakRadio label="Tema" value={tweaks.theme} options={[{value:'light',label:'Claro'},{value:'dark',label:'Escuro'}]} onChange={v=>setTweak('theme',v)} />
      <TweakRadio label="Densidade" value={tweaks.density} options={[{value:'compact',label:'Compacta'},{value:'regular',label:'Regular'},{value:'comfy',label:'Confortável'}]} onChange={v=>setTweak('density',v)} />
      <TweakSection label="Cor de destaque" />
      <div style={{display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:6}}>
        {Object.entries(ACCENT_PRESETS).map(([n,c])=>(
          <div key={n} title={n} onClick={()=>setTweak('accent',c)} style={{height:24, borderRadius:6, background:c, cursor:'default', border: tweaks.accent===c ? '2px solid var(--text)' : '1px solid rgba(0,0,0,.1)'}}/>
        ))}
      </div>
      <TweakColor label="Custom" value={tweaks.accent} onChange={v=>setTweak('accent',v)} />
      <TweakSection label="Estado dos dados" />
      <TweakRadio label="Conteúdo" value={tweaks.dataState} options={[{value:'empty',label:'Vazio'},{value:'rich',label:'Normal'},{value:'heavy',label:'Cheio'}]} onChange={v=>setTweak('dataState',v)} />
      <TweakSection label="Inbox" />
      <TweakToggle label="Painel IA visível" value={tweaks.showAIPanel} onChange={v=>setTweak('showAIPanel',v)} />
    </TweaksPanel>
  );
}

function App() {
  return (
    <Provider>
      <AppInner/>
    </Provider>
  );
}

function AppInner() {
  const { route, tweaks } = useStore();
  const [collapsed, setCollapsed] = React.useState(false);
  const isMobile = useIsMobile();              // true em telas de celular (<= 768px)
  const [navOpen, setNavOpen] = React.useState(false); // drawer mobile aberto?

  // Fecha o drawer ao navegar para outra tela.
  React.useEffect(() => { setNavOpen(false); }, [route]);
  // Ao voltar para desktop, garante que o drawer não fique "preso" aberto.
  React.useEffect(() => { if (!isMobile) setNavOpen(false); }, [isMobile]);

  // Auth/onboarding routes — full-screen, no shell
  const fullscreen = ['login','forgot','onboarding'];
  if (fullscreen.includes(route)) {
    return (<>
      {route==='login' && <Login/>}
      {route==='forgot' && <Forgot/>}
      {route==='onboarding' && <Onboarding/>}
      <TweaksUI/>
    </>);
  }

  let screen = null;
  // Admin
  switch(route){
    case 'dashboard':       screen = <AdminDashboard/>; break;
    case 'agent':           screen = <AdminAgentList/>; break;
    case 'agent-config':    screen = <AdminAgent/>; break;
    case 'catalog':         screen = <AdminCatalog/>; break;
    case 'integrations':    screen = <AdminIntegrations/>; break;
    case 'team':            screen = <AdminTeam/>; break;
    case 'rules':           screen = <AdminRules/>; break;
    case 'replies':         screen = <AdminReplies/>; break;
    case 'reports':         screen = <AdminReports/>; break;
    case 'history':         screen = <AdminHistory/>; break;
    case 'finance':         screen = <AdminFinance/>; break;
    case 'fin-receivables': screen = window.FinReceivables ? React.createElement(window.FinReceivables) : null; break;
    case 'fin-payables':    screen = window.FinPayables ? React.createElement(window.FinPayables) : null; break;
    case 'fin-accounts':    screen = window.FinAccounts ? React.createElement(window.FinAccounts) : null; break;
    case 'fin-dre':         screen = window.FinDRE ? React.createElement(window.FinDRE) : null; break;
    case 'fin-commissions': screen = window.FinCommissions ? React.createElement(window.FinCommissions) : null; break;
    // Backoffice
    case 'bo-pendencias':   screen = window.BackofficePendencias ? React.createElement(window.BackofficePendencias) : null; break;
    case 'bo-legal':        screen = window.BackofficeLegal ? React.createElement(window.BackofficeLegal) : null; break;
    case 'bo-hr':           screen = window.BackofficeHR ? React.createElement(window.BackofficeHR) : null; break;
    case 'bo-fiscal':       screen = window.BackofficeFiscal ? React.createElement(window.BackofficeFiscal) : null; break;
    case 'bo-accounting':   screen = window.BackofficeAccounting ? React.createElement(window.BackofficeAccounting) : null; break;
    case 'settings':        screen = <AdminSettings/>; break;
    case 'user-profile':    screen = <UserProfile/>; break;
    case 'leads':           screen = <AdminLeads/>; break;
    case 'com-clients':     screen = <AdminClients/>; break;
    case 'com-sales':       screen = window.SalesPage ? React.createElement(window.SalesPage) : null; break;
    case 'com-dashboard':   screen = <CommercialDashboard/>; break;
    case 'atendente-dashboard': screen = <AtendenteDashboard/>; break;
    // Inbox / shared
    case 'inbox':           screen = <Inbox/>; break;
    case 'queue':           screen = <Queue/>; break;
    case 'notifs':          screen = <Notifs/>; break;
    case 'client-profile':  screen = <ClientProfile/>; break;
    // CRM
    case 'crm':             screen = <CRMList/>; break;
    case 'crm-board':       screen = <CRMBoard/>; break;
    // Marketing
    case 'mkt-agent':       screen = window.MarketingAgent ? React.createElement(window.MarketingAgent) : null; break;
    case 'mkt-campaigns':   screen = window.MarketingCampaigns ? React.createElement(window.MarketingCampaigns) : null; break;
    case 'mkt-flow-ai':     screen = window.MarketingFlowAI ? React.createElement(window.MarketingFlowAI) : null; break;
    // Agenda
    case 'agenda':          screen = <Agenda/>; break;
    // Super
    case 'super-dashboard': screen = <SuperDashboard/>; break;
    case 'super-tenants':   screen = <SuperTenants/>; break;
    case 'super-plans':     screen = <SuperPlans/>; break;
    case 'super-usage':     screen = <SuperUsage/>; break;
    case 'super-logs':      screen = <SuperLogs/>; break;
    case 'super-billing':   screen = <SuperBilling/>; break;
    default: screen = <AdminDashboard/>;
  }

  return (
    <div className={`app-shell ${collapsed ? 'collapsed' : ''} ${navOpen ? 'nav-open' : ''}`}>
      {isMobile && (
        <button className="app-mobile-menu-btn" onClick={() => setNavOpen(true)} aria-label="Abrir menu">
          <Ic name="menu-closed" size={22}/>
        </button>
      )}
      {isMobile && <div className="app-nav-backdrop" onClick={() => setNavOpen(false)}/>}
      <Sidebar collapsed={collapsed && !isMobile} setCollapsed={setCollapsed} isMobile={isMobile} onNavigate={() => setNavOpen(false)}/>
      <main className="app-main">
        {tweaks.profile==='super' && <div className="impersonate-ribbon"><Ic name="shield" size={13}/> Modo Super Admin · você está vendo a plataforma como operador</div>}
        <div key={route} className="page-enter" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {screen}
        </div>
      </main>
      <TweaksUI/>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
