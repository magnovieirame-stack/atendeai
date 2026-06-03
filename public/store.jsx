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
  const [tweaks, setTweakRaw] = useTweaks(ATENDE_DEFAULTS);
  const setTweak = (k, v) => {
    if (typeof k === 'object') setTweakRaw(k);
    else setTweakRaw(k, v);
  };

  // initial route depends on profile
  const initialRoute = (() => {
    if (tweaks.profile === 'super') return 'super-dashboard';
    if (tweaks.profile === 'atendente') return 'atendente-dashboard';
    return 'dashboard';
  })();
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

  // when profile changes via tweaks, switch to a default route
  const prevProfile = React.useRef(tweaks.profile);
  React.useEffect(() => {
    if (prevProfile.current !== tweaks.profile) {
      prevProfile.current = tweaks.profile;
      if (tweaks.profile === 'super') setRouteRaw('super-dashboard');
      else if (tweaks.profile === 'atendente') setRouteRaw('atendente-dashboard');
      else setRouteRaw('dashboard');
      setHistory([]);
    }
  }, [tweaks.profile]);

  // Apply theme + density + accent to root
  React.useEffect(() => {
    const r = document.documentElement;
    r.setAttribute('data-theme', tweaks.theme);
    r.setAttribute('data-density', tweaks.density);
    r.style.setProperty('--accent', tweaks.accent);
  }, [tweaks.theme, tweaks.density, tweaks.accent]);

  const value = {
    tweaks, setTweak,
    route, routeParam, setRoute, back, history,
  };

  return (
    <StoreCtx.Provider value={value}>
      <RouterCtx.Provider value={value}>
        {children}
      </RouterCtx.Provider>
    </StoreCtx.Provider>
  );
}

Object.assign(window, { Provider, useRouter, useStore, ATENDE_DEFAULTS, ACCENT_PRESETS, RouterCtx, StoreCtx });
