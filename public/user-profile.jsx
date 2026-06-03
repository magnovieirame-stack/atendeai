// user-profile.jsx — Perfil do Usuário (account screen)

function UserProfile() {
  const { tweaks, setTweak, setRoute } = useStore();
  const profile = tweaks.profile;
  const base = profile === 'super'
    ? { name: 'Magno Vieira', role: 'Super Admin', email: 'magno@atende.ia', phone: '+55 11 9 9999-0001', dept: 'Plataforma' }
    : profile === 'atendente'
      ? { name: 'Karla Zambelly', role: 'Atendente sênior', email: 'karla@iguabela.com', phone: '+55 85 9 9123-4567', dept: 'Atendimento' }
      : { name: 'Paulo Henrique', role: 'Administrador', email: 'paulo@iguabela.com', phone: '+55 85 9 9876-5432', dept: 'Comercial' };

  const [tab, setTab] = React.useState('dados');
  const [f, setF] = React.useState({ ...base, nickname: base.name.split(' ')[0], birth: '15/03/1988', address: 'Av. Beira-Mar, 1500 — Fortaleza/CE', bio: 'Cuida da operação de atendimento da Iguabela Beleza.' });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const initials = (n) => n.split(' ').filter(Boolean).slice(0,2).map(s => s[0]).join('').toUpperCase();

  const tabs = [
    { id: 'dados', label: 'Dados pessoais', icon: 'user' },
    { id: 'seg',   label: 'Segurança',      icon: 'shield' },
    { id: 'pref',  label: 'Preferências',   icon: 'settings' },
    { id: 'sessoes', label: 'Sessões',      icon: 'activity' },
  ];

  return (
    <Page title="Perfil Usuário" subtitle="Gerencie seus dados, segurança e preferências">
      {/* Header card */}
      <div className="card card-pad up-head">
        <div className="up-head-l">
          <div className="up-avatar" style={{ background: colorFor ? colorFor(f.name) : '#6366f1' }}>
            {initials(f.name)}
            <button className="up-cam" title="Trocar foto"><Ic name="camera" size={12} /></button>
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="up-name">{f.name}</div>
            <div className="up-role muted">{f.role} · {f.dept}</div>
            <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <span className="chip"><Ic name="mail" size={11} /> {f.email}</span>
              <span className="chip"><Ic name="phone" size={11} /> {f.phone}</span>
              <span className="badge badge-success"><span className="dot dot-online" style={{ boxShadow: 'none' }} /> Ativo</span>
            </div>
          </div>
        </div>
        <div className="up-head-r">
          <button className="btn"><Ic name="logout" size={13} /> Sair</button>
          <button className="btn btn-primary"><Ic name="check" size={13} /> Salvar alterações</button>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label className="label">Nome completo</label><input className="input" value={f.name} onChange={e => set('name', e.target.value)} /></div>
              <div><label className="label">Como prefere ser chamada(o)</label><input className="input" value={f.nickname} onChange={e => set('nickname', e.target.value)} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label className="label">E-mail</label><EmailInput value={f.email} onChange={(v) => set('email', v)} /></div>
              <div><label className="label">Telefone / WhatsApp</label><PhoneInput value={f.phone} onChange={(v) => set('phone', v)} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label className="label">Cargo</label><input className="input" value={f.role} onChange={e => set('role', e.target.value)} /></div>
              <div><label className="label">Departamento</label><input className="input" value={f.dept} onChange={e => set('dept', e.target.value)} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label className="label">Data de nascimento</label><input className="input" value={f.birth} onChange={e => set('birth', e.target.value)} /></div>
              <div><label className="label">Endereço</label><input className="input" value={f.address} onChange={e => set('address', e.target.value)} /></div>
            </div>
            <div>
              <label className="label">Bio / observações</label>
              <textarea className="input" rows={3} value={f.bio} onChange={e => set('bio', e.target.value)} />
            </div>
          </div>

          <div className="col" style={{ gap: 'var(--pad-3)' }}>
            <div className="card card-pad">
              <div className="h3">Foto de perfil</div>
              <div className="col" style={{ gap: 10, marginTop: 10, alignItems: 'center' }}>
                <div className="up-avatar lg" style={{ background: colorFor ? colorFor(f.name) : '#6366f1' }}>{initials(f.name)}</div>
                <div className="muted" style={{ fontSize: 'var(--type-sm)', textAlign: 'center' }}>PNG ou JPG · até 2MB</div>
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn"><Ic name="upload" size={13} /> Carregar</button>
                  <button className="btn">Remover</button>
                </div>
              </div>
            </div>

            <div className="card card-pad">
              <div className="h3">Disponibilidade</div>
              <div className="col" style={{ gap: 8, marginTop: 10 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 'var(--type-sm)' }}>Receber novas conversas</span>
                  <Toggle on={true} compact />
                </div>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 'var(--type-sm)' }}>Notificações sonoras</span>
                  <Toggle on={true} compact />
                </div>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 'var(--type-sm)' }}>E-mail diário de resumo</span>
                  <Toggle on={false} compact />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'seg' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--pad-3)', alignItems: 'flex-start' }}>
          <div className="card card-pad col" style={{ gap: 12 }}>
            <div className="h3">Alterar senha</div>
            <div><label className="label">Senha atual</label><input className="input" type="password" placeholder="••••••••" /></div>
            <div><label className="label">Nova senha</label><input className="input" type="password" placeholder="Mínimo 8 caracteres" /></div>
            <div><label className="label">Confirmar nova senha</label><input className="input" type="password" /></div>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Atualizar senha</button>
          </div>
          <div className="col" style={{ gap: 'var(--pad-3)' }}>
            <div className="card card-pad">
              <div className="row"><div className="h3">Autenticação em dois fatores</div><div className="spacer" /><Toggle on={false} /></div>
              <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 6 }}>Adicione uma camada extra de proteção exigindo um código de 6 dígitos no login.</div>
            </div>
            <div className="card card-pad">
              <div className="h3">Login recente</div>
              <div className="col" style={{ marginTop: 8, gap: 6 }}>
                {[['Hoje, 09:14', 'Fortaleza/CE · Chrome'], ['Ontem, 18:02', 'Fortaleza/CE · Chrome'], ['12 mai, 14:33', 'iPhone · Safari']].map(([t, l], i) => (
                  <div key={i} className="row" style={{ fontSize: 'var(--type-sm)' }}>
                    <span style={{ width: 130 }}>{t}</span>
                    <span className="muted">{l}</span>
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
                    <button key={id} className="btn btn-sm" onClick={() => setTweak('theme', id)} style={{ background: tweaks.theme === id ? 'var(--accent-soft)' : '', borderColor: tweaks.theme === id ? 'var(--accent)' : '' }}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: 'var(--type-sm)' }}>Densidade</span>
                <div className="row" style={{ gap: 6 }}>
                  {[['compact', 'Compacta'], ['regular', 'Regular'], ['comfy', 'Confortável']].map(([id, l]) => (
                    <button key={id} className="btn btn-sm" onClick={() => setTweak('density', id)} style={{ background: tweaks.density === id ? 'var(--accent-soft)' : '', borderColor: tweaks.density === id ? 'var(--accent)' : '' }}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="card card-pad">
            <div className="h3">Notificações</div>
            <div className="col" style={{ gap: 10, marginTop: 10 }}>
              {['Nova mensagem', 'Conversa transferida para mim', 'Cliente aguardando há +5 min', 'Resumo diário por e-mail', 'Atualizações da plataforma'].map((l, i) => (
                <div key={l} className="row" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 'var(--type-sm)' }}>{l}</span>
                  <Toggle on={i < 3} compact />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'sessoes' && (
        <div className="card card-pad">
          <div className="row"><div className="h3">Sessões ativas</div><div className="spacer" /><button className="btn btn-sm">Encerrar todas</button></div>
          <table className="table" style={{ marginTop: 10 }}>
            <thead><tr><th>Dispositivo</th><th>Localização</th><th>Último acesso</th><th></th></tr></thead>
            <tbody>
              <tr><td><strong>Chrome · macOS</strong> <span className="badge badge-success" style={{ marginLeft: 6 }}>esta sessão</span></td><td>Fortaleza/CE</td><td>agora</td><td></td></tr>
              <tr><td>Safari · iPhone</td><td>Fortaleza/CE</td><td>há 3h</td><td style={{ textAlign: 'right' }}><button className="btn btn-sm">Encerrar</button></td></tr>
              <tr><td>Chrome · Windows</td><td>São Paulo/SP</td><td>há 2 dias</td><td style={{ textAlign: 'right' }}><button className="btn btn-sm">Encerrar</button></td></tr>
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}

Object.assign(window, { UserProfile });
