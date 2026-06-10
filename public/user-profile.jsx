// user-profile.jsx — Perfil do Usuário (account screen)

function UserProfile() {
  const { auth, setTweak, tweaks, setRoute, reloadAuth } = useStore();

  const [tab, setTab] = React.useState('dados');
  const [f, setF] = React.useState(null);   // dados do form (null = carregando)
  const [saving, setSaving] = React.useState(false);
  const fileRef = React.useRef(null);
  // Preferências (Fase 2) — guardadas em user_metadata.preferencias.
  const PREFS_DEFAULT = { receberConversas: true, notifSonoras: true, emailDiario: false, notifNovaMensagem: true, notifTransferida: true, notifAguardando: true, notifResumoEmail: false, notifPlataforma: false };
  const [prefs, setPrefs] = React.useState(null);
  const pf = prefs || PREFS_DEFAULT;
  // Troca de senha (Fase 3).
  const [pw, setPw] = React.useState({ atual: '', nova: '', conf: '' });
  const [trocandoPw, setTrocandoPw] = React.useState(false);
  const setPwK = (k, v) => setPw(p => ({ ...p, [k]: v }));
  // Sessões / logins recentes (Fase 4).
  const [sessoes, setSessoes] = React.useState(null);
  // Departamentos vinculados (perfil + responsável) — só exibição, o usuário não edita.
  const [deptosVinc, setDeptosVinc] = React.useState([]);
  React.useEffect(() => {
    let alive = true;
    API.getSessoes().then(r => { if (alive) setSessoes(r.sessoes || []); }).catch(() => { if (alive) setSessoes([]); });
    API.getMeusDepartamentos().then(r => { if (alive) setDeptosVinc(r.departamentos || []); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const parseUA = (ua) => {
    ua = ua || '';
    const b = /Edg/.test(ua) ? 'Edge' : /OPR|Opera/.test(ua) ? 'Opera' : /Chrome/.test(ua) ? 'Chrome' : /Firefox/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : 'Navegador';
    const o = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /(iPhone|iPad|iOS)/.test(ua) ? 'iOS' : /(Mac OS X|Macintosh)/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
    return o ? `${b} · ${o}` : b;
  };
  const sairDeTodos = async () => {
    try {
      await API.sairDeTodos();
      window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Sessões encerradas', descricao: 'Você saiu de todos os dispositivos.' });
      setRoute('login');
    } catch (e) {
      window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao encerrar sessões', descricao: (e && e.message) || 'Tente novamente.' });
    }
  };
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  // Máscara dd/mm/aaaa (mantém o nascimento como texto BR, sem calendário/ISO).
  const maskData = (v) => {
    const n = (v || '').replace(/\D/g, '').slice(0, 8);
    if (n.length <= 2) return n;
    if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`;
    return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`;
  };

  // Carrega o perfil REAL — os campos vêm do user_metadata via /auth/me (sem query nova no banco).
  React.useEffect(() => {
    let alive = true;
    API.me().then((r) => {
      const u = (r && r.user) || {};
      if (!alive) return;
      setF({
        name: u.name || '', nomeCompleto: u.nomeCompleto || '', email: u.email || '',
        telefone: u.telefone || '', cargo: u.cargo || '', departamento: u.departamento || '',
        nascimento: u.nascimento || '', endereco: u.endereco || '', bio: u.bio || '',
        fotoUrl: u.fotoUrl || '', papelNome: u.papelNome || '',
      });
      setPrefs({ ...PREFS_DEFAULT, ...((u.preferencias && typeof u.preferencias === 'object') ? u.preferencias : {}) });
    }).catch(() => { if (alive) setF({}); });
    return () => { alive = false; };
  }, []);

  // Salva uma preferência na hora (toggle/aparência) — envia só o patch; o backend faz merge.
  const salvarPrefs = async (patch) => {
    setPrefs(p => ({ ...(p || PREFS_DEFAULT), ...patch }));
    try { await API.updatePerfil({ preferencias: patch }); }
    catch (e) { window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao salvar preferência', descricao: (e && e.message) || 'Tente novamente.' }); }
  };

  const initials = (n) => (n || '?').split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
  const d = f || {};
  const displayName = d.name || d.nomeCompleto || auth.nome || '';

  const tabs = [
    { id: 'dados', label: 'Dados pessoais', icon: 'user' },
    { id: 'seg',   label: 'Segurança',      icon: 'shield' },
    { id: 'pref',  label: 'Preferências',   icon: 'settings' },
    { id: 'sessoes', label: 'Sessões',      icon: 'activity' },
  ];

  const salvar = async () => {
    if (!f) return;
    setSaving(true);
    try {
      await API.updatePerfil({
        // cargo e departamento NÃO vão (são definidos pela administração; só leitura aqui).
        name: f.name, nomeCompleto: f.nomeCompleto, telefone: f.telefone,
        nascimento: f.nascimento, endereco: f.endereco, bio: f.bio,
      });
      await reloadAuth(); // atualiza nome/cargo na sidebar e topbar
      window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Perfil salvo', descricao: 'Suas alterações foram aplicadas.' });
    } catch (e) {
      window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao salvar', descricao: (e && e.message) || 'Tente novamente.' });
    } finally { setSaving(false); }
  };

  const sair = async () => { try { await API.logout(); } catch (e) {} setRoute('login'); };

  const escolherFoto = () => fileRef.current && fileRef.current.click();
  const enviarFoto = async (file) => {
    if (!file) return;
    try {
      const r = await API.uploadFotoPerfil(file);
      set('fotoUrl', r.fotoUrl);
      await reloadAuth();
      window.carregarFotosUsuarios && window.carregarFotosUsuarios(true); // reflete em todos os avatares
      window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Foto atualizada' });
    } catch (e) {
      window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao enviar foto', descricao: (e && e.message) || 'Tente novamente.' });
    }
  };
  const removerFoto = async () => {
    try {
      await API.removeFotoPerfil();
      set('fotoUrl', '');
      await reloadAuth();
      window.carregarFotosUsuarios && window.carregarFotosUsuarios(true);
      window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Foto removida' });
    } catch (e) {
      window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao remover foto' });
    }
  };

  const trocarSenha = async () => {
    if (!pw.atual || !pw.nova) { window.showToast && window.showToast({ tipo: 'aviso', titulo: 'Preencha os campos', descricao: 'Informe a senha atual e a nova.' }); return; }
    if (pw.nova.length < 8) { window.showToast && window.showToast({ tipo: 'aviso', titulo: 'Senha muito curta', descricao: 'A nova senha precisa de ao menos 8 caracteres.' }); return; }
    if (pw.nova !== pw.conf) { window.showToast && window.showToast({ tipo: 'erro', titulo: 'As senhas não conferem', descricao: 'A confirmação não bate com a nova senha.' }); return; }
    setTrocandoPw(true);
    try {
      await API.atualizarSenha(pw.atual, pw.nova);
      setPw({ atual: '', nova: '', conf: '' });
      window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Senha atualizada', descricao: 'Use a nova senha no próximo login.' });
    } catch (e) {
      window.showToast && window.showToast({ tipo: 'erro', titulo: 'Não foi possível trocar a senha', descricao: (e && e.message) || 'Tente novamente.' });
    } finally { setTrocandoPw(false); }
  };

  // Avatar: foto real (se houver) ou as iniciais.
  const Foto = () => d.fotoUrl
    ? <img src={d.fotoUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
    : <span>{initials(displayName)}</span>;

  return (
    <Page title="Perfil Usuário" subtitle="Gerencie seus dados, segurança e preferências">
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={(e) => { const file = e.target.files && e.target.files[0]; e.target.value = ''; enviarFoto(file); }} />
      {/* Header card */}
      <div className="card card-pad up-head">
        <div className="up-head-l">
          <div className="up-avatar" style={{ background: colorFor ? colorFor(displayName) : '#6366f1' }}>
            <Foto />
            <button className="up-cam" title="Trocar foto" onClick={escolherFoto}><Ic name="camera" size={12} /></button>
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="up-name">{displayName || '—'}</div>
            <div className="up-role muted">{[d.cargo, d.departamento].filter(Boolean).join(' · ') || d.papelNome || '—'}</div>
            <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {d.email && <span className="chip"><Ic name="mail" size={11} /> {d.email}</span>}
              {d.telefone && <span className="chip"><Ic name="phone" size={11} /> {d.telefone}</span>}
              <span className="badge badge-success"><span className="dot dot-online" style={{ boxShadow: 'none' }} /> Ativo</span>
            </div>
          </div>
        </div>
        <div className="up-head-r">
          <button className="btn" onClick={sair}><Ic name="logout" size={13} /> Sair</button>
          <button className="btn btn-primary" disabled={saving || !f} onClick={salvar}><Ic name="check" size={13} /> {saving ? 'Salvando…' : 'Salvar alterações'}</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="up-tabs">
        {tabs.map(t => (
          <div key={t.id} className={`up-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <Ic name={t.icon} size={14} /> {t.label}
          </div>
        ))}
      </div>

      {tab === 'dados' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 'var(--pad-3)', alignItems: 'flex-start' }}>
          <div className="card card-pad col" style={{ gap: 14 }}>
            <div className="h3">Informações pessoais</div>
            {!f ? (
              <div className="col" style={{ gap: 12 }}>
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} w="100%" h={38} />)}
              </div>
            ) : (<>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label className="label">Nome completo</label><input className="input" value={d.nomeCompleto} onChange={e => set('nomeCompleto', e.target.value)} /></div>
              <div><label className="label">Como prefere ser chamada(o)</label><input className="input" value={d.name} onChange={e => set('name', e.target.value)} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label className="label">E-mail</label><EmailInput value={d.email} onChange={() => {}} disabled readOnly title="Para trocar o e-mail é preciso verificação — em breve." style={{ opacity: .7, cursor: 'not-allowed' }} /></div>
              <div><label className="label">Telefone / WhatsApp</label><PhoneInput value={d.telefone} onChange={(v) => set('telefone', v)} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label className="label">Cargo</label><input className="input" value={d.cargo || '—'} disabled readOnly title="Definido pela administração da loja." style={{ opacity: .8, cursor: 'not-allowed' }} /></div>
              <div>
                <label className="label">Departamento{deptosVinc.length > 1 ? 's' : ''}</label>
                {deptosVinc.length > 0 ? (
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap', minHeight: 38, alignItems: 'center', padding: '0 2px' }}>
                    {deptosVinc.map((nome) => (
                      <span key={nome} className="row" style={{ gap: 5, padding: '5px 10px', background: 'var(--accent-soft)', color: 'var(--accent-700)', border: '1px solid color-mix(in oklab, var(--accent) 28%, transparent)', borderRadius: 999, fontSize: 'var(--type-sm)', fontWeight: 600 }}>
                        <Ic name="folder" size={12} />{nome}
                      </span>
                    ))}
                  </div>
                ) : (
                  <input className="input" value="—" disabled readOnly title="Definido pela administração da loja." style={{ opacity: .8, cursor: 'not-allowed' }} />
                )}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label className="label">Data de nascimento</label><input className="input" value={d.nascimento} onChange={e => set('nascimento', maskData(e.target.value))} inputMode="numeric" maxLength={10} placeholder="dd/mm/aaaa" /></div>
              <div><label className="label">Endereço</label><input className="input" value={d.endereco} onChange={e => set('endereco', e.target.value)} /></div>
            </div>
            <div>
              <label className="label">Bio / observações</label>
              <textarea className="input" rows={3} value={d.bio} onChange={e => set('bio', e.target.value)} />
            </div>
            </>)}
          </div>

          <div className="col" style={{ gap: 'var(--pad-3)' }}>
            <div className="card card-pad">
              <div className="h3">Foto de perfil</div>
              <div className="col" style={{ gap: 10, marginTop: 10, alignItems: 'center' }}>
                <div className="up-avatar lg" style={{ background: colorFor ? colorFor(displayName) : '#6366f1' }}><Foto /></div>
                <div className="muted" style={{ fontSize: 'var(--type-sm)', textAlign: 'center' }}>PNG ou JPG · até 2MB</div>
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn" onClick={escolherFoto}><Ic name="upload" size={13} /> Carregar</button>
                  <button className="btn" onClick={removerFoto} disabled={!d.fotoUrl}>Remover</button>
                </div>
              </div>
            </div>

            <div className="card card-pad">
              <div className="h3">Disponibilidade</div>
              <div className="col" style={{ gap: 8, marginTop: 10 }}>
                {[['receberConversas', 'Receber novas conversas'], ['notifSonoras', 'Notificações sonoras'], ['emailDiario', 'E-mail diário de resumo']].map(([k, l]) => (
                  <div key={k} className="row" style={{ justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 'var(--type-sm)' }}>{l}</span>
                    <Toggle on={!!pf[k]} compact onChange={(v) => salvarPrefs({ [k]: v })} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'seg' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--pad-3)', alignItems: 'flex-start' }}>
          <div className="card card-pad col" style={{ gap: 12 }}>
            <div className="h3">Alterar senha</div>
            <div><label className="label">Senha atual</label><input className="input" type="password" placeholder="••••••••" value={pw.atual} onChange={e => setPwK('atual', e.target.value)} autoComplete="current-password" /></div>
            <div><label className="label">Nova senha</label><input className="input" type="password" placeholder="Mínimo 8 caracteres" value={pw.nova} onChange={e => setPwK('nova', e.target.value)} autoComplete="new-password" /></div>
            <div><label className="label">Confirmar nova senha</label><input className="input" type="password" value={pw.conf} onChange={e => setPwK('conf', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') trocarSenha(); }} autoComplete="new-password" /></div>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={trocandoPw} onClick={trocarSenha}>{trocandoPw ? 'Atualizando…' : 'Atualizar senha'}</button>
          </div>
          <div className="col" style={{ gap: 'var(--pad-3)' }}>
            <div className="card card-pad">
              <div className="row"><div className="h3">Autenticação em dois fatores</div><div className="spacer" /><Toggle on={false} /></div>
              <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 6 }}>Adicione uma camada extra de proteção exigindo um código de 6 dígitos no login.</div>
            </div>
            <div className="card card-pad">
              <div className="h3">Login recente</div>
              <div className="col" style={{ marginTop: 8, gap: 6 }}>
                {!sessoes ? <Skeleton w="100%" h={16} /> :
                  sessoes.length === 0 ? <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>Sem registros ainda.</div> :
                    sessoes.slice(0, 4).map((s) => (
                      <div key={s.id} className="row" style={{ fontSize: 'var(--type-sm)' }}>
                        <span style={{ width: 80 }}>{relativeTime(s.createdAt)}</span>
                        <span className="muted" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{parseUA(s.userAgent)}{s.ip ? ' · ' + s.ip : ''}</span>
                      </div>
                    ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'pref' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--pad-3)' }}>
          <div className="card card-pad">
            <div className="h3">Aparência</div>
            <div className="col" style={{ gap: 10, marginTop: 10 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: 'var(--type-sm)' }}>Tema</span>
                <div className="row" style={{ gap: 6 }}>
                  {[['light', 'Claro'], ['dark', 'Escuro']].map(([id, l]) => (
                    <button key={id} className="btn btn-sm" onClick={() => { setTweak('theme', id); salvarPrefs({ tema: id }); }} style={{ background: tweaks.theme === id ? 'var(--accent-soft)' : '', borderColor: tweaks.theme === id ? 'var(--accent)' : '' }}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: 'var(--type-sm)' }}>Densidade</span>
                <div className="row" style={{ gap: 6 }}>
                  {[['compact', 'Compacta'], ['regular', 'Regular'], ['comfy', 'Confortável']].map(([id, l]) => (
                    <button key={id} className="btn btn-sm" onClick={() => { setTweak('density', id); salvarPrefs({ densidade: id }); }} style={{ background: tweaks.density === id ? 'var(--accent-soft)' : '', borderColor: tweaks.density === id ? 'var(--accent)' : '' }}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="card card-pad">
            <div className="h3">Notificações</div>
            <div className="col" style={{ gap: 10, marginTop: 10 }}>
              {[['notifNovaMensagem', 'Nova mensagem'], ['notifTransferida', 'Conversa transferida para mim'], ['notifAguardando', 'Cliente aguardando há +5 min'], ['notifResumoEmail', 'Resumo diário por e-mail'], ['notifPlataforma', 'Atualizações da plataforma']].map(([k, l]) => (
                <div key={k} className="row" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 'var(--type-sm)' }}>{l}</span>
                  <Toggle on={!!pf[k]} compact onChange={(v) => salvarPrefs({ [k]: v })} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'sessoes' && (
        <div className="card card-pad">
          <div className="row"><div className="h3">Acessos recentes</div><div className="spacer" /><button className="btn btn-sm" onClick={sairDeTodos}><Ic name="logout" size={13} /> Sair de todos os dispositivos</button></div>
          <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>Últimos logins na sua conta. "Sair de todos" encerra a sessão em todos os aparelhos — inclusive este.</div>
          {!sessoes ? (
            <div className="col" style={{ gap: 8, marginTop: 12 }}>{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} w="100%" h={32} />)}</div>
          ) : sessoes.length === 0 ? (
            <EmptyState icon="activity" title="Sem acessos registrados" desc="Os logins na sua conta vão aparecer aqui." />
          ) : (
            <table className="table" style={{ marginTop: 10 }}>
              <thead><tr><th>Dispositivo</th><th>IP</th><th>Quando</th></tr></thead>
              <tbody>
                {sessoes.map((s, i) => (
                  <tr key={s.id}>
                    <td><strong>{parseUA(s.userAgent)}</strong>{i === 0 && <span className="badge badge-success" style={{ marginLeft: 6 }}>mais recente</span>}</td>
                    <td className="muted">{s.ip || '—'}</td>
                    <td className="muted">{relativeTime(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </Page>
  );
}

Object.assign(window, { UserProfile });
