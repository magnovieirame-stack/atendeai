// store.jsx — global app state (router, profile, tweaks)

const ATENDE_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#16a34a",
  "theme": "light",
  "density": "regular",
  "profile": "admin",
  "dataState": "rich",
  "showAIPanel": true
}/*EDITMODE-END*/;

const ACCENT_PRESETS = {
  "verde":  "#16a34a",
  "roxo":   "#7c3aed",
  "azul":   "#2563eb",
  "rosa":   "#ec4899",
  "âmbar":  "#f59e0b",
  "grafite":"#1f2937",
};

// MODO DEMO — botões "Entrar como" do login. Identidade fake (só front, p/ a UI
// refletir o papel escolhido) e home de cada papel. NÃO concede acesso real:
// o backend continua exigindo o papel verdadeiro do cookie de sessão.
const DEMO_IDENTITY = {
  admin:     { papel: 'admin_loja',  papelNome: 'Admin da Loja', empresaNome: 'Iguabela Beleza · DEMO', nome: 'Visitante (demo)', email: 'demo@pk360.app', cargo: null },
  atendente: { papel: 'atendente',   papelNome: 'Atendente',     empresaNome: 'Iguabela Beleza · DEMO', nome: 'Visitante (demo)', email: 'demo@pk360.app', cargo: null },
  super:     { papel: 'super_admin', papelNome: 'Super Admin',   empresaNome: null,                     nome: 'Visitante (demo)', email: 'demo@pk360.app', cargo: null },
};
const DEMO_HOME = { super: 'super-dashboard', atendente: 'atendente-dashboard', admin: 'dashboard' };

// Global navigation context
const RouterCtx = React.createContext(null);
const StoreCtx = React.createContext(null);

function useRouter() { return React.useContext(RouterCtx); }
function useStore() { return React.useContext(StoreCtx); }

function Provider({ children }) {
  // "Ver como" (preview de dev) lembra a última escolha entre F5 — só conveniência
  // visual, NÃO mexe no papel real (backend) nem no login de usuário real.
  const VERCOMO_KEY = 'atende_vercomo';
  const _verComoSalvo = () => { try { return localStorage.getItem(VERCOMO_KEY); } catch (e) { return null; } };
  // Mapeia o papel REAL (do backend) -> perfil/versão do app.
  const papelParaProfile = (p) => p === 'super_admin' ? 'super' : p === 'atendente' ? 'atendente' : 'admin';
  const initialTweaks = React.useMemo(() => {
    // Antes do /auth/me carregar, nasce no perfil mais restrito ('admin'); o sync
    // abaixo ajusta pro papel real assim que o auth chega.
    const v = _verComoSalvo() || 'admin';
    return { ...ATENDE_DEFAULTS, profile: v };
  }, []);
  const [tweaks, setTweakRaw] = useTweaks(initialTweaks);
  const setTweak = (k, v) => {
    if (typeof k === 'object') setTweakRaw(k);
    else setTweakRaw(k, v);
  };
  // Modo demo: dados simulados p/ testar a UI sem login real. Sai ao voltar pro login.
  const [demo, setDemo] = React.useState(false);
  // Troca MANUAL do "Ver como": muda o preview e PERSISTE a escolha (sobrevive ao
  // F5). Só o controle do painel chama isto — o sync automático abaixo não grava,
  // então usuário real (que nunca mexe no toggle) nunca cria um valor salvo.
  const setVerComo = (v) => { try { localStorage.setItem(VERCOMO_KEY, v); } catch (e) {} setTweak('profile', v); };

  // O app NASCE na tela de login; ao entrar, o usuário é levado pra home do papel.
  const initialRoute = 'login';
  const [route, setRouteRaw] = React.useState(initialRoute);
  const [routeParam, setRouteParam] = React.useState(null);
  const [history, setHistory] = React.useState([]);
  const setRoute = (r, param = null) => {
    setHistory(h => [...h, { route, routeParam }].slice(-20));
    setRouteRaw(r);
    setRouteParam(param);
  };
  const back = () => {
    setHistory(h => {
      if (!h.length) return h;
      const last = h[h.length-1];
      setRouteRaw(last.route); setRouteParam(last.routeParam);
      return h.slice(0,-1);
    });
  };

  // Entra no MODO DEMO a partir do login: liga o demo, ajusta o perfil/versão e os
  // dados ricos, e navega direto pra home do papel (driblando o guard de auth-route).
  const enterDemo = (profileId) => {
    // Liga a flag de demo SINCRONAMENTE (antes do render): o api.jsx lê window.__DEMO__
    // pra desviar TODA chamada de rede pros mocks locais. Se ligasse só via efeito,
    // o 1º load de uma tela poderia escapar pra rede real (efeitos rodam bottom-up).
    window.__DEMO__ = profileId || 'admin';
    setDemo(true);
    setTweak({ profile: profileId, dataState: 'rich' });
    setRouteRaw(DEMO_HOME[profileId] || 'dashboard');
    setRouteParam(null);
    setHistory([]);
  };

  // when profile changes via tweaks, switch to a default route — mas NUNCA tira o
  // usuário das telas de auth (login/forgot/onboarding); o login navega sozinho.
  const AUTH_ROUTES = ['login', 'forgot', 'onboarding', 'set-password'];
  const prevProfile = React.useRef(tweaks.profile);
  React.useEffect(() => {
    if (prevProfile.current !== tweaks.profile) {
      prevProfile.current = tweaks.profile;
      if (AUTH_ROUTES.includes(route)) return; // não navega enquanto está no login
      if (tweaks.profile === 'super') setRouteRaw('super-dashboard');
      else if (tweaks.profile === 'atendente') setRouteRaw('atendente-dashboard');
      else setRouteRaw('dashboard');
      setHistory([]);
    }
  }, [tweaks.profile, route]);

  // Apply theme + density + accent to root
  React.useEffect(() => {
    const r = document.documentElement;
    r.setAttribute('data-theme', tweaks.theme);
    r.setAttribute('data-density', tweaks.density);
    r.style.setProperty('--accent', tweaks.accent);
  }, [tweaks.theme, tweaks.density, tweaks.accent]);

  // Voltar pra tela de login (logout, "Sair", etc.) sempre encerra o modo demo.
  React.useEffect(() => { if (route === 'login' && demo) setDemo(false); }, [route, demo]);
  // ...e zera TODO o cache de leitura (o "Sair" do menu só faz go('login'), sem
  // passar pela API.logout) — pra nunca mostrar dado da sessão/loja anterior.
  React.useEffect(() => { if (route === 'login') { try { window.clearQueryCache && window.clearQueryCache(); } catch (e) {} try { window.__resetInboxSession && window.__resetInboxSession(); } catch (e) {} } }, [route]);
  // Espelha o fim do demo na flag global: ao sair do demo, volta ao fluxo REAL
  // (rede liberada, zero mock). Entrar é feito sincronamente em enterDemo.
  React.useEffect(() => { if (!demo) window.__DEMO__ = false; }, [demo]);

  // Papel + permissões REAIS (do backend, via /auth/me). Usado só para UX —
  // quem realmente bloqueia é o backend. `can('codigo')` consulta as permissões.
  const [auth, setAuth] = React.useState({ papel: null, papelNome: null, cargo: null, empresaId: null, empresaNome: null, nome: null, email: null, permissoes: new Set(), preferencias: null, loaded: false });
  const reloadAuth = React.useCallback(() => {
    if (!window.API || !window.API.me) return Promise.resolve(null);
    return window.API.me()
      .then((r) => {
        const u = (r && r.user) || {};
        setAuth({ papel: u.papel || null, papelNome: u.papelNome || null, cargo: u.cargo || null, empresaId: (u.empresa && u.empresa.id) || u.empresaId || null, empresaNome: (u.empresa && u.empresa.nome) || null, nome: u.name || null, email: u.email || null, foto: u.fotoUrl || null, departamentoId: (u.departamentoId != null ? u.departamentoId : null), ehResponsavel: !!u.ehResponsavel, permissoes: new Set(u.permissoes || []), preferencias: (u.preferencias && typeof u.preferencias === 'object') ? u.preferencias : null, loaded: true });
        return u.papel || null;
      })
      .catch(() => { setAuth((a) => ({ ...a, loaded: true })); return null; });
  }, []);
  React.useEffect(() => { reloadAuth(); }, [reloadAuth]);

  // Hidrata tema/densidade salvos no Perfil (cross-device) quando o auth carrega.
  // (Fica DEPOIS da declaração do `auth` — senão dá ReferenceError no render/TDZ.)
  // Deps só [auth.preferencias]: aplica o salvo ao logar — não revoga uma troca local
  // que o usuário faça depois (essa salva por conta própria e não recarrega o auth).
  React.useEffect(() => {
    const p = auth.preferencias;
    if (!p) return;
    if (p.tema && p.tema !== tweaks.theme) setTweak('theme', p.tema);
    if (p.densidade && p.densidade !== tweaks.density) setTweak('density', p.densidade);
  }, [auth.preferencias]);
  // No demo, libera tudo (só p/ o menu/telas renderizarem o papel escolhido); fora
  // do demo, usa as permissões REAIS. O backend nunca confia nisto.
  const can = React.useCallback((codigo) => (demo ? true : auth.permissoes.has(codigo)), [demo, auth]);
  // Identidade exibida: no demo, espelha o papel escolhido (mantém empresaId/permissoes
  // reais por baixo); fora do demo, é o auth real do /auth/me.
  const authView = demo ? { ...auth, loaded: true, ...(DEMO_IDENTITY[tweaks.profile] || DEMO_IDENTITY.admin) } : auth;

  // "Ver como": ao logar, o perfil/versão ESPELHA o papel REAL do /auth/me.
  //  - super_admin: pode usar o simulador "Ver como" e a escolha persiste (F5);
  //  - admin_loja / atendente: SEMPRE o papel real (não têm o simulador).
  // É só visual; o backend sempre usa o papel real (do cookie).
  const syncedRef = React.useRef(null);
  React.useEffect(() => {
    if (demo) return; // no demo o perfil é o escolhido nos botões — não sincroniza
    if (!auth.loaded || !auth.papel) return;
    if (syncedRef.current === auth.papel) return; // já sincronizou este papel
    syncedRef.current = auth.papel;
    if (auth.papel === 'super_admin') {
      setTweak('profile', _verComoSalvo() || 'super'); // respeita o "Ver como" salvo; senão, 'super'
    } else {
      setTweak('profile', papelParaProfile(auth.papel)); // espelha o papel real
    }
  }, [auth.loaded, auth.papel]);

  const value = {
    tweaks, setTweak, setVerComo,
    route, routeParam, setRoute, back, history,
    auth: authView, can, reloadAuth,
    demo, enterDemo,
  };

  return (
    <StoreCtx.Provider value={value}>
      <RouterCtx.Provider value={value}>
        {children}
      </RouterCtx.Provider>
    </StoreCtx.Provider>
  );
}

// Responsive breakpoint hook — true quando a viewport é de celular (<= maxWidth).
// Apenas leitura da largura da janela; não toca em rede, API ou dados.
function useIsMobile(maxWidth = 640) {
  const query = '(max-width: ' + maxWidth + 'px)';
  const read = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false);
  const [isMobile, setIsMobile] = React.useState(read);
  React.useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange); // fallback p/ engines antigas
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, [query]);
  return isMobile;
}

Object.assign(window, { Provider, useRouter, useStore, useIsMobile, ATENDE_DEFAULTS, ACCENT_PRESETS, RouterCtx, StoreCtx });
