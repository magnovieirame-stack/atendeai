// auth.jsx — Login, Forgot password, Onboarding wizard

function AuthShell({ children }) {
  return (
    <div style={{minHeight:'100vh', display:'flex', background:'var(--bg)'}}>
      <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:40}}>
        <div style={{width:'100%', maxWidth:380}}>{children}</div>
      </div>
      <div style={{flex:1, background:'#0a0e0a', display:'flex', alignItems:'center', justifyContent:'center', padding:40, color:'#e9f2d2', position:'relative', overflow:'hidden'}}>
        <div style={{position:'absolute', inset:0, background:'radial-gradient(circle at 20% 80%, rgba(120,230,90,.16), transparent 55%), radial-gradient(circle at 80% 20%, rgba(233,242,58,.12), transparent 55%)'}}/>
        <div style={{maxWidth:440, position:'relative', zIndex:1}}>
          <div style={{fontSize:42, fontWeight:700, letterSpacing:'-.025em', lineHeight:1.05, background:'linear-gradient(135deg, #57cf6e 0%, #a7e84f 55%, #e9f23a 100%)', WebkitBackgroundClip:'text', backgroundClip:'text', WebkitTextFillColor:'transparent', color:'transparent'}}>O atendimento que nunca dorme.</div>
          <div style={{marginTop:16, fontSize:16, opacity:.72, lineHeight:1.5, color:'#dbe8c8'}}>WhatsApp, Instagram e Facebook unificados, com agente Claude que entende texto, áudio e imagem. CRM, Agenda e relatórios — tudo num só lugar.</div>
          <div className="row" style={{gap:8, marginTop:32}}>
            <span className="badge" style={{background:'rgba(255,255,255,.08)', color:'#bfe88f'}}><Ic name="sparkles" size={11}/> Powered by Claude</span>
            <span className="badge" style={{background:'rgba(255,255,255,.08)', color:'#bfe88f'}}>Multi-tenant</span>
            <span className="badge" style={{background:'rgba(255,255,255,.08)', color:'#bfe88f'}}>RBAC</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Login() {
  const { setRoute, reloadAuth, enterDemo } = useStore();
  const [showPw, setShowPw] = React.useState(false);
  const [email, setEmail] = React.useState('teste@minhaempresa.com');
  const [senha, setSenha] = React.useState('Teste@Atende2026');
  const [erro, setErro] = React.useState('');
  const [carregando, setCarregando] = React.useState(false);
  const entrar = async () => {
    setErro(''); setCarregando(true);
    try {
      await API.login(email, senha);
      const papel = await reloadAuth(); // papel REAL de quem entrou (do /auth/me)
      window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Bem-vindo!', descricao: 'Login realizado com sucesso.' });
      if (papel === 'super_admin') setRoute('super-dashboard');
      else if (papel === 'atendente') setRoute('inbox');
      else setRoute('dashboard');
    } catch (e) {
      setErro(e.message || 'Não foi possível entrar.');
      window.showToast && window.showToast({ tipo: 'erro', titulo: 'Não foi possível entrar', descricao: e.message || 'Verifique seu e-mail e senha.' });
    } finally {
      setCarregando(false);
    }
  };
  return (
    <AuthShell>
      <img src="assets/simbolo.png" alt="Pk360" style={{width:48, height:48, objectFit:'contain', marginBottom:24}}/>
      <div className="h1">Entrar</div>
      <div className="muted" style={{marginTop:6}}>Use seu e-mail corporativo. O tenant é detectado automaticamente.</div>
      <div className="col" style={{gap:14, marginTop:28}}>
        <div><label className="label">E-mail</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com"/></div>
        <div>
          <label className="label">Senha</label>
          <div style={{position:'relative'}}>
            <input className="input" type={showPw?'text':'password'} value={senha} onChange={e=>setSenha(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')entrar();}} placeholder="Sua senha"/>
            <span onClick={()=>setShowPw(!showPw)} style={{position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-faint)', cursor:'default'}}><Ic name={showPw?'eye-off':'eye'} size={16}/></span>
          </div>
        </div>
        <div className="row" style={{justifyContent:'space-between', fontSize:'var(--type-sm)'}}>
          <label className="row" style={{gap:6}}><input type="checkbox" defaultChecked/> Manter conectado</label>
          <span className="muted" style={{cursor:'default'}} onClick={()=>setRoute('forgot')}>Esqueci minha senha</span>
        </div>
        {erro && <div style={{padding:'8px 12px', borderRadius:8, background:'color-mix(in oklab, #ef4444 10%, var(--surface))', border:'1px solid color-mix(in oklab, #ef4444 30%, var(--border))', color:'#dc2626', fontSize:'var(--type-sm)'}}>{erro}</div>}
        <button className="btn btn-primary" style={{height:42, opacity: carregando?0.6:1}} disabled={carregando} onClick={entrar}>{carregando ? 'Entrando…' : 'Entrar'}</button>
        <div className="col" style={{gap:6, alignItems:'center', marginTop:6}}>
          <div className="muted" style={{fontSize:'var(--type-xs)', color:'var(--text-faint)'}}>ou explore com dados simulados (demo):</div>
          <div className="row" style={{gap:6, justifyContent:'center', fontSize:'var(--type-sm)'}}>
            {[['admin','Admin'],['atendente','Atendente'],['super','Super Admin']].map(([id,l])=>(
              <span key={id} onClick={()=>enterDemo(id)} style={{padding:'4px 10px', borderRadius:6, background:'var(--surface-3)', color:'var(--text-muted)', fontWeight:500, cursor:'default'}}>{l}</span>
            ))}
          </div>
        </div>
      </div>
    </AuthShell>
  );
}

function Forgot() {
  const { setRoute } = useStore();
  return (
    <AuthShell>
      <button className="btn btn-ghost btn-sm fin-btn-back" onClick={()=>setRoute('login')} style={{marginBottom:14}}><Ic name="chevron-left" size={14}/> Voltar</button>
      <div className="h1">Recuperar senha</div>
      <div className="muted" style={{marginTop:6}}>Te enviamos um link de redefinição válido por 30 minutos.</div>
      <div className="col" style={{gap:14, marginTop:28}}>
        <div><label className="label">E-mail cadastrado</label><EmailInput placeholder="seu@email.com"/></div>
        <button className="btn btn-primary" style={{height:42}} onClick={()=>window.showToast && window.showToast({ tipo: 'info', titulo: 'Link enviado', descricao: 'Verifique seu e-mail para redefinir a senha.' })}>Enviar link de recuperação</button>
      </div>
    </AuthShell>
  );
}

function Onboarding() {
  const { setRoute } = useStore();
  const [step, setStep] = React.useState(1);
  const steps = [
    { n:1, t:'Dados da loja', d:'Nome, logo, segmento e horário' },
    { n:2, t:'Conectar WhatsApp', d:'Vincule seu número via API oficial' },
    { n:3, t:'Configurar agente', d:'Personalidade e mensagem inicial' },
    { n:4, t:'Subir catálogo', d:'Importar planilha ou conectar API' },
  ];
  return (
    <div style={{minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column'}}>
      <div className="topbar" style={{justifyContent:'center'}}>
        <div className="row" style={{gap:8}}>
          <div style={{width:32, height:32, borderRadius:8, background:'linear-gradient(135deg, var(--accent), var(--ai))', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700}}>A.</div>
          <div style={{fontWeight:600}}>Configuração inicial</div>
        </div>
      </div>
      <div style={{flex:1, display:'flex', justifyContent:'center', padding:'40px 20px', overflow:'auto'}}>
        <div style={{width:'100%', maxWidth:720}}>
          <div className="row" style={{gap:8, marginBottom:24}}>
            {steps.map(s=>(
              <div key={s.n} style={{flex:1}}>
                <div style={{height:4, borderRadius:2, background: step>=s.n ? 'var(--accent)':'var(--surface-3)'}}/>
                <div style={{marginTop:8, fontSize:'var(--type-xs)', fontWeight:600, color: step>=s.n?'var(--text)':'var(--text-faint)'}}>Passo {s.n} · {s.t}</div>
              </div>
            ))}
          </div>
          <div className="card card-pad">
            <div className="h1">{steps[step-1].t}</div>
            <div className="muted" style={{marginTop:6}}>{steps[step-1].d}</div>
            <div style={{marginTop:24, minHeight:280}}>
              {step===1 && <div className="col" style={{gap:14}}>
                <div><label className="label">Nome da loja</label><input className="input" defaultValue="Iguabela Beleza"/></div>
                <div className="row" style={{gap:14}}>
                  <div style={{flex:1}}><label className="label">Segmento</label><select className="input"><option>Beleza & Estética</option></select></div>
                  <div style={{flex:1}}><label className="label">Timezone</label><select className="input"><option>America/Fortaleza</option></select></div>
                </div>
                <div><label className="label">Horário padrão</label><input className="input" defaultValue="Segunda a sábado, 08h–19h"/></div>
              </div>}
              {step===2 && <div className="col" style={{gap:14, alignItems:'center', textAlign:'center', padding:'20px 0'}}>
                <div style={{width:72, height:72, borderRadius:18, background:'color-mix(in oklab, #25d366 12%, var(--surface))', color:'#25d366', display:'flex', alignItems:'center', justifyContent:'center'}}><Ic name="whatsapp" size={36}/></div>
                <div className="h2">Conectar WhatsApp Business</div>
                <div className="muted" style={{maxWidth:420}}>Use a API oficial via 360dialog. O processo leva ~5 minutos e mantém o número original.</div>
                <button className="btn btn-primary">Iniciar conexão</button>
              </div>}
              {step===3 && <div className="col" style={{gap:14}}>
                <div><label className="label">Nome do agente</label><input className="input" defaultValue="Júlia"/></div>
                <div><label className="label">Tom de voz</label><div className="row" style={{gap:6}}>{['Formal','Amigável','Informal'].map((t,i)=><div key={t} style={{flex:1, padding:'10px', border:`1px solid ${i===1?'var(--accent)':'var(--border-strong)'}`, background:i===1?'var(--accent-soft)':'var(--surface)', color:i===1?'var(--accent-700)':'var(--text)', borderRadius:8, textAlign:'center', fontSize:'var(--type-sm)', fontWeight: i===1?600:500}}>{t}</div>)}</div></div>
                <div><label className="label">Mensagem de boas-vindas</label><textarea className="input" rows={3} defaultValue="Oi! Eu sou a Júlia, assistente da Iguabela Beleza ✨ Em que posso te ajudar?"/></div>
              </div>}
              {step===4 && <div className="col" style={{gap:14, alignItems:'center', textAlign:'center', padding:'20px 0'}}>
                <div style={{width:72, height:72, borderRadius:18, background:'var(--accent-soft)', color:'var(--accent-700)', display:'flex', alignItems:'center', justifyContent:'center'}}><Ic name="brand" size={36}/></div>
                <div className="h2">Subir catálogo</div>
                <div className="muted" style={{maxWidth:420}}>Faça upload de uma planilha CSV ou conecte sua API própria. Você pode pular e adicionar depois.</div>
                <div className="row" style={{gap:8}}><button className="btn btn-primary"><Ic name="file" size={14}/> Importar CSV</button><button className="btn"><Ic name="link" size={14}/> Conectar API</button></div>
              </div>}
            </div>
            <div className="row" style={{borderTop:'1px solid var(--border)', paddingTop:14, marginTop:14}}>
              {step>1 && <button className="btn fin-btn-back" onClick={()=>setStep(step-1)}><Ic name="chevron-left" size={14}/> Voltar</button>}
              <span className="btn btn-ghost btn-sm" style={{cursor:'default'}} onClick={()=>step===4?setRoute('dashboard'):setStep(step+1)}>Pular esta etapa</span>
              <div className="spacer"/>
              <button className="btn btn-primary" onClick={()=>{ if(step===4){ window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Configuração concluída', descricao: 'Sua loja está pronta para começar.' }); setRoute('dashboard'); } else setStep(step+1); }}>{step===4?'Concluir':'Próximo'} {step<4 && <Ic name="chevron-right" size={14}/>}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Página de DEFINIR SENHA — onde o convidado cai ao clicar no link do e-mail.
// Layout no mesmo padrão do Login (AuthShell). Por enquanto é visual (será ligada
// ao token de convite real depois). Inclui a ACEITAÇÃO/confirmação do vínculo.
function SetPassword() {
  const { setRoute } = useStore();
  const [pw, setPw] = React.useState('');
  const [conf, setConf] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);
  const [aceite, setAceite] = React.useState(false);
  const [erro, setErro] = React.useState('');
  const email = 'novo.usuario@empresa.com'; // virá do token do convite
  const loja = 'sua loja';
  const forte = pw.length >= 8;
  const confere = pw.length > 0 && pw === conf;
  const podeCriar = forte && confere && aceite;
  const criar = () => {
    setErro('');
    if (!forte) return setErro('A senha precisa de ao menos 8 caracteres.');
    if (!confere) return setErro('As senhas não conferem.');
    if (!aceite) return setErro('Você precisa aceitar para continuar.');
    window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Senha criada', descricao: 'Tela visual — será ligada ao convite real na integração.' });
    setRoute('login');
  };
  return (
    <AuthShell>
      <img src="assets/simbolo.png" alt="Pk360" style={{ width: 48, height: 48, objectFit: 'contain', marginBottom: 24 }} />
      <div className="h1">Criar sua senha</div>
      <div className="muted" style={{ marginTop: 6 }}>Você foi convidado para acessar <strong>{loja}</strong>. Defina sua senha para entrar.</div>
      <div className="col" style={{ gap: 14, marginTop: 28 }}>
        <div><label className="label">E-mail</label><input className="input" value={email} disabled readOnly style={{ opacity: .7, cursor: 'not-allowed' }} /></div>
        <div>
          <label className="label">Nova senha</label>
          <div style={{ position: 'relative' }}>
            <input className="input" type={showPw ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
            <span onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', cursor: 'default' }}><Ic name={showPw ? 'eye-off' : 'eye'} size={16} /></span>
          </div>
        </div>
        <div><label className="label">Confirmar senha</label><input className="input" type={showPw ? 'text' : 'password'} value={conf} onChange={e => setConf(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') criar(); }} placeholder="Repita a senha" autoComplete="new-password" /></div>
        <label className="row" style={{ gap: 8, fontSize: 'var(--type-sm)', alignItems: 'flex-start' }}>
          <input type="checkbox" checked={aceite} onChange={e => setAceite(e.target.checked)} style={{ marginTop: 3 }} />
          <span>Li e aceito os <strong>Termos de Uso</strong> e confirmo o vínculo da minha conta a <strong>{loja}</strong>.</span>
        </label>
        {erro && <div style={{ padding: '8px 12px', borderRadius: 8, background: 'color-mix(in oklab, #ef4444 10%, var(--surface))', border: '1px solid color-mix(in oklab, #ef4444 30%, var(--border))', color: '#dc2626', fontSize: 'var(--type-sm)' }}>{erro}</div>}
        <button className="btn btn-primary" style={{ height: 42, opacity: podeCriar ? 1 : .6 }} disabled={!podeCriar} onClick={criar}>Criar senha e acessar</button>
        <div className="muted" style={{ fontSize: 'var(--type-xs)', textAlign: 'center', color: 'var(--text-faint)' }}>O link do convite expira em 24 horas.</div>
      </div>
    </AuthShell>
  );
}

Object.assign(window, { Login, Forgot, Onboarding, SetPassword });
