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

  // when profile changes via tweaks, switch to a default route — mas NUNCA tira o
  // usuário das telas de auth (login/forgot/onboarding); o login navega sozinho.
  const AUTH_ROUTES = ['login', 'forgot', 'onboarding'];
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

  // Papel + permissões REAIS (do backend, via /auth/me). Usado só para UX —
  // quem realmente bloqueia é o backend. `can('codigo')` consulta as permissões.
  const [auth, setAuth] = React.useState({ papel: null, papelNome: null, cargo: null, empresaId: null, empresaNome: null, nome: null, email: null, permissoes: new Set(), loaded: false });
  const reloadAuth = React.useCallback(() => {
    if (!window.API || !window.API.me) return Promise.resolve(null);
    return window.API.me()
      .then((r) => {
        const u = (r && r.user) || {};
        setAuth({ papel: u.papel || null, papelNome: u.papelNome || null, cargo: u.cargo || null, empresaId: (u.empresa && u.empresa.id) || u.empresaId || null, empresaNome: (u.empresa && u.empresa.nome) || null, nome: u.name || null, email: u.email || null, permissoes: new Set(u.permissoes || []), loaded: true });
        return u.papel || null;
      })
      .catch(() => { setAuth((a) => ({ ...a, loaded: true })); return null; });
  }, []);
  React.useEffect(() => { reloadAuth(); }, [reloadAuth]);
  const can = React.useCallback((codigo) => auth.permissoes.has(codigo), [auth]);

  // "Ver como": ao logar, o perfil/versão ESPELHA o papel REAL do /auth/me.
  //  - super_admin: pode usar o simulador "Ver como" e a escolha persiste (F5);
  //  - admin_loja / atendente: SEMPRE o papel real (não têm o simulador).
  // É só visual; o backend sempre usa o papel real (do cookie).
  const syncedRef = React.useRef(null);
  React.useEffect(() => {
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
    auth, can, reloadAuth,
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
