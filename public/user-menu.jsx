// user-menu.jsx — Account dropdown menu in topbar + Help widget (Receba Ajuda)

function UserMenu() {
  const { tweaks, setTweak, setRoute, auth } = useStore();
  const [open, setOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const closeTimer = React.useRef(null);
  const wrapRef = React.useRef(null);

  const profile = tweaks.profile;
  // Identidade REAL do usuário logado (do /auth/me) — independente do "Ver como".
  const me = {
    name: auth.nome || auth.email || 'Usuário',
    role: auth.cargo || auth.papelNome || '—',
    email: auth.email || '',
  };

  const isAtendente = profile === 'atendente';
  const [first, second] = me.name.split(' ');

  // Hover open with slight close delay so cursor can travel into the menu
  const openNow = () => {clearTimeout(closeTimer.current);setOpen(true);};
  const closeSoon = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  };

  // Close on outside click / Escape
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);};
    const onKey = (e) => {if (e.key === 'Escape') setOpen(false);};
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {document.removeEventListener('mousedown', onDoc);document.removeEventListener('keydown', onKey);};
  }, [open]);

  const go = (route) => {setOpen(false);setRoute(route);};
  const openHelp = () => {setOpen(false);setHelpOpen(true);};
  const toggleDark = () => setTweak('theme', tweaks.theme === 'dark' ? 'light' : 'dark');

  // Menu items per spec, with atendente exclusions
  const items = [
  { id: 'profile', label: 'Perfil Usuário', icon: 'user', onClick: () => go('user-profile') },
  { id: 'integ', label: 'Integrações', icon: 'link', onClick: () => go('integrations'), hidden: isAtendente },
  { id: 'plans', label: 'Planos', icon: 'wallet', onClick: () => go('finance'), hidden: isAtendente },
  { id: 'help', label: 'Receba Ajuda', icon: 'help', onClick: openHelp },
  { id: 'dark', label: 'Dark Mode', icon: tweaks.theme === 'dark' ? 'moon' : 'sun', onClick: toggleDark, kind: 'toggle' },
  { id: 'settings', label: 'Configurações', icon: 'settings', onClick: () => go('settings'), hidden: isAtendente },
  { id: 'logout', label: 'Sair', icon: 'logout', onClick: () => go('login'), danger: true, sep: true }].
  filter((i) => !i.hidden);

  return (
    <>
      <div
        ref={wrapRef}
        className="user-menu-wrap"
        onMouseEnter={openNow}
        onMouseLeave={closeSoon}>
        
        <div className={`user-menu-trigger ${open ? 'is-open' : ''}`} onClick={() => setOpen((o) => !o)}>
          <Avatar name={me.name} size="sm" online />
          <div className="user-menu-id">
            <div className="user-menu-name">{first}{second ? ` ${second}` : ''}</div>
            <div className="user-menu-role">{me.role}</div>
          </div>
          <span className="user-menu-caret"><Ic name="chevron-down" size={14} /></span>
        </div>

        {open &&
        <div className="user-menu-dropdown" onMouseEnter={openNow} onMouseLeave={closeSoon}>
            <div className="um-head">
              <Avatar name={me.name} size="lg" />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="um-head-name">{me.name}</div>
                <div className="um-head-email" style={{ fontWeight: 600, color: 'var(--text)' }}>{me.role}</div>
                <div className="um-head-email">{me.email}</div>
              </div>
            </div>

            <div className="um-items">
              {items.map((it) =>
            <React.Fragment key={it.id}>
                  {it.sep && <div className="um-sep" />}
                  <button
                type="button"
                className={`um-item ${it.danger ? 'um-danger' : ''}`}
                onClick={it.onClick}>
                
                    <span className="um-ic"><Ic name={it.icon} size={16} /></span>
                    <span className="um-label">{it.label}</span>
                    {it.kind === 'toggle' &&
                <span className={`um-switch ${tweaks.theme === 'dark' ? 'on' : ''}`}>
                        <span className="um-switch-knob" />
                      </span>
                }
                  </button>
                </React.Fragment>
            )}
            </div>
          </div>
        }
      </div>

      {helpOpen && <HelpWidget onClose={() => setHelpOpen(false)} />}
    </>);

}

// Help widget — floating chat panel in bottom-right
function HelpWidget({ onClose }) {
  const [msgs, setMsgs] = React.useState([
  { from: 'agent', text: 'Olá! Sou o assistente do ATENDE.IA. Em que posso te ajudar?' }]
  );
  const [input, setInput] = React.useState('');
  const [menu, setMenu] = React.useState(null); // 'emoji' | 'attach'
  const [recording, setRecording] = React.useState(false);
  const scrollRef = React.useRef(null);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, recording]);

  const pushAgentReply = () => {
    setTimeout(() => {
      setMsgs((m) => [...m, { from: 'agent', text: 'Anotado! Já estou verificando isso pra você. Em instantes um especialista entra em contato por aqui mesmo.' }]);
    }, 800);
  };

  const send = (override) => {
    const text = (override ?? input).trim();
    if (!text) return;
    setMsgs((m) => [...m, { from: 'me', kind: 'text', text }]);
    setInput('');
    pushAgentReply();
  };

  const fmtTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const onPickEmoji = (e) => {
    setInput((prev) => (prev || '') + e);
    setMenu(null);
    inputRef.current?.focus();
  };

  const onPickAttach = (opt) => {
    setMenu(null);
    // Use a file input for real attach types; "Contato" / "Áudio" send a placeholder
    if (opt.id === 'foto' || opt.id === 'video' || opt.id === 'documento' || opt.id === 'audio') {
      const inp = document.createElement('input');
      inp.type = 'file';
      const acceptMap = { foto: 'image/*', video: 'video/*', audio: 'audio/*', documento: '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt' };
      inp.accept = acceptMap[opt.id] || '*/*';
      inp.onchange = () => {
        const f = inp.files && inp.files[0];
        if (!f) return;
        const sizeKB = Math.max(1, Math.round(f.size / 1024));
        setMsgs((m) => [...m, { from: 'me', kind: 'file', label: opt.label, name: f.name, size: sizeKB }]);
        pushAgentReply();
      };
      inp.click();
    } else {
      setMsgs((m) => [...m, { from: 'me', kind: 'file', label: opt.label, name: opt.label, size: 0 }]);
      pushAgentReply();
    }
  };

  const onSendAudio = (t) => {
    setRecording(false);
    setMsgs((m) => [...m, { from: 'me', kind: 'audio', dur: fmtTime(t) }]);
    pushAgentReply();
  };

  const quick = [
  'Como conectar o WhatsApp?',
  'Mudar plano',
  'Falar com humano'];


  const HasInbox = typeof EmojiPicker !== 'undefined' && typeof AttachPicker !== 'undefined' && typeof VoiceRecorder !== 'undefined';

  return (
    <div className="help-widget">
      <div className="hw-head">
        <div className="hw-head-l">
          <div className="hw-logo"><Ic name="sparkles" size={16} /></div>
          <div>
            <div className="hw-title">Suporte ATENDE.IA</div>
            <div className="hw-sub"><span className="dot dot-online" style={{ boxShadow: 'none' }} /> Resposta em ~2 min</div>
          </div>
        </div>
        <div className="hw-actions">
          <button className="btn btn-ghost btn-icon" title="Minimizar" onClick={onClose}><Ic name="chevron-down" size={14} /></button>
          <button className="btn btn-ghost btn-icon" title="Fechar" onClick={onClose}><Ic name="x" size={14} /></button>
        </div>
      </div>

      <div className="hw-body scroll" ref={scrollRef}>
        {msgs.map((m, i) => {
          const isMe = m.from === 'me';
          return (
            <div key={i} className={`hw-msg ${isMe ? 'hw-me' : 'hw-them'}`}>
              {m.kind === 'audio' ?
              <div className="hw-bubble hw-audio">
                  <span className="hw-audio-play"><Ic name="play" size={12} /></span>
                  <span className="hw-audio-wave">
                    {Array.from({ length: 18 }).map((_, k) =>
                  <span key={k} style={{ height: `${20 + k * 7 % 60}%` }} />
                  )}
                  </span>
                  <span className="hw-audio-time tnum">{m.dur}</span>
                </div> :
              m.kind === 'file' ?
              <div className="hw-bubble hw-file">
                  <span className="hw-file-ic"><Ic name="paperclip" size={14} /></span>
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{m.name}</span>
                    <span style={{ fontSize: 11, opacity: .85 }}>{m.label}{m.size ? ` · ${m.size} KB` : ''}</span>
                  </span>
                </div> :

              <div className="hw-bubble">{m.text}</div>
              }
            </div>);

        })}
        {msgs.length <= 2 &&
        <div className="hw-quick">
            {quick.map((q) =>
          <button key={q} className="hw-chip" onClick={() => {send(q);}}>{q}</button>
          )}
          </div>
        }
      </div>

      <div className="hw-input">
        {recording && HasInbox ?
        <VoiceRecorder onCancel={() => setRecording(false)} onSend={onSendAudio} /> :

        <>
            <div className="hw-actions-row">
              <div style={{ position: 'relative' }}>
                <button
                type="button"
                className="btn btn-ghost btn-icon"
                title="Anexar"
                onClick={() => setMenu(menu === 'attach' ? null : 'attach')}
                style={{ background: menu === 'attach' ? 'var(--accent-soft)' : '' }}>
                
                  <Ic name="paperclip" size={16} />
                </button>
                {menu === 'attach' && HasInbox &&
              <AttachPicker onPick={onPickAttach} onClose={() => setMenu(null)} />
              }
              </div>
              <div style={{ position: 'relative' }}>
                <button
                type="button"
                className="btn btn-ghost btn-icon"
                title="Emoji"
                onClick={() => setMenu(menu === 'emoji' ? null : 'emoji')}
                style={{ background: menu === 'emoji' ? 'var(--accent-soft)' : '' }}>
                
                  <Ic name="smile" size={16} />
                </button>
                {menu === 'emoji' && HasInbox &&
              <EmojiPicker onPick={onPickEmoji} onClose={() => setMenu(null)} />
              }
              </div>
              <button
              type="button"
              className="btn btn-ghost btn-icon"
              title="Gravar áudio"
              onClick={() => {setMenu(null);setRecording(true);}}>
              
                <Ic name="mic" size={16} />
              </button>
            </div>

            <input
            ref={inputRef}
            className="input hw-input-text"
            placeholder="Envie uma mensagem..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {if (e.key === 'Enter') {e.preventDefault();send();}}} />
          

            <button className="btn btn-primary btn-icon" onClick={() => send()} title="Enviar" disabled={!input.trim()}>
              <Ic name="send" size={14} />
            </button>
          </>
        }
      </div>
    </div>);

}

// ============================================================
// SidebarUserMenu — same items as UserMenu, but in sidebar footer (pops upward)
// ============================================================
function SidebarUserMenu({ collapsed = false }) {
  const { tweaks, setTweak, setRoute, auth } = useStore();
  const [open, setOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const closeTimer = React.useRef(null);
  const wrapRef = React.useRef(null);

  // Identidade REAL do usuário logado (do /auth/me) — independente do "Ver como".
  const me = {
    name: auth.nome || auth.email || 'Usuário',
    role: auth.cargo || auth.papelNome || '—',
    email: auth.email || '',
  };
  const inicial = initials(me.name);
  const isAtendente = tweaks.profile === 'atendente';

  const openNow = () => {clearTimeout(closeTimer.current);setOpen(true);};
  const closeSoon = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  };

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);};
    const onKey = (e) => {if (e.key === 'Escape') setOpen(false);};
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {document.removeEventListener('mousedown', onDoc);document.removeEventListener('keydown', onKey);};
  }, [open]);

  const go = (route) => {setOpen(false);setRoute(route);};
  const openHelp = () => {setOpen(false);setHelpOpen(true);};
  const toggleDark = () => setTweak('theme', tweaks.theme === 'dark' ? 'light' : 'dark');

  const items = [
  { id: 'profile', label: 'Perfil Usuário', icon: 'user', onClick: () => go('user-profile') },
  { id: 'integ', label: 'Integrações', icon: 'link', onClick: () => go('integrations'), hidden: isAtendente },
  { id: 'plans', label: 'Planos', icon: 'wallet', onClick: () => go('finance'), hidden: isAtendente },
  { id: 'help', label: 'Receba Ajuda', icon: 'help', onClick: openHelp },
  { id: 'dark', label: 'Dark Mode', icon: tweaks.theme === 'dark' ? 'moon' : 'sun', onClick: toggleDark, kind: 'toggle' },
  { id: 'settings', label: 'Configurações', icon: 'settings', onClick: () => go('settings'), hidden: isAtendente },
  { id: 'logout', label: 'Sair', icon: 'logout', onClick: () => go('login'), danger: true, sep: true }].
  filter((i) => !i.hidden);

  return (
    <>
      <div
        ref={wrapRef}
        className="sidebar-user-wrap"
        onMouseEnter={openNow}
        onMouseLeave={closeSoon}>
        <div
          className={`sidebar-user ${open ? 'is-open' : ''}`}
          onClick={() => setOpen((o) => !o)}
          title={collapsed ? `${me.name} · ${me.role}` : ''}>
          <div className="sidebar-user-avatar">
            <span style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colorFor(me.name), color: '#fff', fontWeight: 700, fontSize: 13 }}>{inicial}</span>
            <span className="sidebar-user-dot" aria-hidden="true" />
          </div>
          <div className="sidebar-user-id">
            <div className="sidebar-user-name">{me.name}</div>
            <div className="sidebar-user-role">{me.role}</div>
          </div>
          <span className="sidebar-user-caret"><Ic name="chevron-down" size={14} /></span>
        </div>

        {open &&
        <div className="sidebar-user-dropdown" onMouseEnter={openNow} onMouseLeave={closeSoon}>
            <div className="um-head">
              <div className="sidebar-user-avatar lg">
                <span style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colorFor(me.name), color: '#fff', fontWeight: 700, fontSize: 16 }}>{inicial}</span>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="um-head-name">{me.name}</div>
                <div className="um-head-email" style={{ fontWeight: 600, color: 'var(--text)' }}>{me.role}</div>
                <div className="um-head-email">{me.email}</div>
              </div>
            </div>

            <div className="um-items">
              {items.map((it) =>
            <React.Fragment key={it.id}>
                  {it.sep && <div className="um-sep" />}
                  <button
                type="button"
                className={`um-item ${it.danger ? 'um-danger' : ''}`}
                onClick={it.onClick}>
                    <span className="um-ic"><Ic name={it.icon} size={16} /></span>
                    <span className="um-label">{it.label}</span>
                    {it.kind === 'toggle' &&
                <span className={`um-switch ${tweaks.theme === 'dark' ? 'on' : ''}`}>
                        <span className="um-switch-knob" />
                      </span>
                }
                  </button>
                </React.Fragment>
            )}
            </div>
          </div>
        }
      </div>

      {helpOpen && <HelpWidget onClose={() => setHelpOpen(false)} />}
    </>);

}

Object.assign(window, { UserMenu, HelpWidget, NotifMenu, SidebarUserMenu });

// ============================================================
// NotifMenu — bell dropdown in topbar, hover to open
// ============================================================
function NotifMenu() {
  const { setRoute } = useStore();
  const [open, setOpen] = React.useState(false);
  const items = useNotifs();
  React.useEffect(() => { if (typeof refreshNotifs === 'function') refreshNotifs(); }, []);
  const closeTimer = React.useRef(null);
  const wrapRef = React.useRef(null);

  const unread = items.filter((n) => !n.read).length;

  const openNow = () => {clearTimeout(closeTimer.current);setOpen(true);};
  const closeSoon = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  };

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);};
    const onKey = (e) => {if (e.key === 'Escape') setOpen(false);};
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {document.removeEventListener('mousedown', onDoc);document.removeEventListener('keydown', onKey);};
  }, [open]);

  const kindMap = {
    queue: { icon: 'inbox', color: 'var(--accent)' },
    urgent: { icon: 'flag', color: '#ef4444' },
    transfer: { icon: 'users', color: 'var(--hue-blue)' },
    schedule: { icon: 'agenda', color: 'var(--hue-violet)' },
    lead: { icon: 'leads', color: 'var(--accent)' },
    info: { icon: 'bell', color: 'var(--text-muted)' }
  };

  const markAll = (e) => {e.stopPropagation();markAllNotifsRead();};
  const markOne = (id) => markNotifRead(id);
  const seeAll = () => {setOpen(false);setRoute('notifs');};

  return (
    <div
      ref={wrapRef}
      className="notif-menu-wrap"
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}>
      
      <div className={`btn btn-ghost btn-icon notif-trigger ${open ? 'is-open' : ''}`} title="Notificações" onClick={() => setOpen((o) => !o)} style={{ position: 'relative', transform: 'translateY(-2px)' }}>
        <Ic name="bell" size={21} />
        {unread > 0 &&
        <span className="notif-dot" style={{ borderWidth: "1px" }}>{unread > 9 ? '9+' : unread}</span>
        }
      </div>

      {open &&
      <div className="notif-dropdown" onMouseEnter={openNow} onMouseLeave={closeSoon}>
          <div className="nm-head">
            <div>
              <div className="nm-title">Notificações</div>
              <div className="nm-sub muted">{unread > 0 ? `${unread} não lida${unread > 1 ? 's' : ''}` : 'Tudo em dia'}</div>
            </div>
            {unread > 0 &&
          <button type="button" className="nm-link" onClick={markAll}>Marcar todas</button>
          }
          </div>

          <div className="nm-list scroll">
            {items.length === 0 ?
          <div className="nm-empty">
                <Ic name="bell" size={20} />
                <div>Sem notificações</div>
              </div> :
          items.map((n) => {
            const k = kindMap[n.kind] || kindMap.queue;
            return (
              <button
                type="button"
                key={n.id}
                className={`nm-item ${n.read ? '' : 'unread'}`}
                onClick={() => markOne(n.id)}>
                
                  <span className="nm-ic" style={{ background: `color-mix(in oklab, ${k.color} 14%, white)`, color: k.color }}>
                    <Ic name={k.icon} size={14} />
                  </span>
                  <div className="nm-body">
                    <div className="nm-text">{n.text}</div>
                    <div className="nm-time">{relativeTime(n.createdAt)}</div>
                  </div>
                  {!n.read && <span className="nm-unread-dot" />}
                </button>);

          })}
          </div>

          <div className="nm-foot">
            <button type="button" className="nm-see-all" onClick={seeAll}>
              Ver todas as notificações <Ic name="arrow-right" size={12} />
            </button>
          </div>
        </div>
      }
    </div>);

}