// users-page.jsx — Página de Usuários (lista) + drawer "Novo usuário".
// A lista é REAL (GET /api/agenda/usuarios). O drawer replica as sub-abas do
// Perfil do Usuário (Dados pessoais · Segurança · Preferências — sem Sessões).
// A CRIAÇÃO ainda não tem endpoint no back (decisões pendentes) → "Criar usuário"
// é placeholder honesto por enquanto.

// ID no padrão do sistema: PK + UF + "-" + 6 dígitos ESTÁVEIS (hash do id, não
// muda a cada render; único por usuário). Ex.: PKCE-236358. UF real quando houver
// (default BR enquanto o cadastro não traz o estado).
function userCode(id, uf) {
  const s = String(id || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
  const u = (String(uf || 'BR').toUpperCase().replace(/[^A-Z]/g, '') + 'BR').slice(0, 2);
  return 'PK' + u + '-' + String(h % 1000000).padStart(6, '0');
}

// CSS da lista de Usuários (padrão Clientes: grid de colunas, linha com hover,
// ações cinza com hover colorido — ver=verde, editar=azul, excluir=vermelho).
function UsersStyles() {
  return (
    <style>{`
      .usr-row { display: grid; grid-template-columns: 92px 1.6fr 1.5fr 150px 120px 132px; align-items: center; gap: 12px; padding: 11px 16px; }
      .usr-head { background: var(--surface); border-bottom: 1px solid var(--border); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); }
      .usr-scroll { background: var(--surface-2); padding: 4px; display: flex; flex-direction: column; gap: 4px; }
      .usr-body { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; transition: box-shadow .12s ease, background .12s ease; }
      .usr-body:hover { background: var(--surface-2); box-shadow: 0 2px 8px rgba(15,23,42,.06); }
      .usr-fcat { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .04em; margin-bottom: 6px; }
      .usr-idcell { display: flex; align-items: center; gap: 8px; min-width: 0; }
      .usr-id { font-family: ui-monospace, Menlo, monospace; font-size: 12px; font-weight: 700; color: var(--text-muted); letter-spacing: .02em; white-space: nowrap; }
      .usr-sep { width: 1px; height: 28px; background: var(--border); flex-shrink: 0; margin-left: auto; }
      .usr-name { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; }
      .usr-sub { display: flex; align-items: center; gap: 5px; color: var(--text-muted); font-size: var(--type-sm); min-width: 0; }
      .usr-sub span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .usr-acts { display: flex; gap: 6px; }
      .usr-act { width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s ease; }
      .usr-act-view:hover { color: #3DA767; border-color: #3DA767; background: #C9F0D3; }
      .usr-act-edit:hover { color: #165EEE; border-color: #165EEE; background: #EAF0FE; }
      .usr-act-del:hover  { color: #FF452A; border-color: #FF452A; background: #FFEBEC; }
      .usr-pill { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 999px; border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); cursor: pointer; font-size: 11px; font-weight: 600; white-space: nowrap; }
      .usr-pill.on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent-700); }
    `}</style>
  );
}

function UsersPage() {
  const { back } = useStore();
  const [users, setUsers] = React.useState([]);
  const [loaded, setLoaded] = React.useState(false);
  const [drawer, setDrawer] = React.useState(null);   // { modo, inicial }
  const [excluir, setExcluir] = React.useState(null); // usuário a excluir (confirmação)
  const [criado, setCriado] = React.useState(null);   // resultado de criação/reset (mostra a senha 1x)
  const [query, setQuery] = React.useState('');
  const [filterTipo, setFilterTipo] = React.useState('all');
  const [filterStatus, setFilterStatus] = React.useState('all'); // all | ativo | inativo
  const [showFilters, setShowFilters] = React.useState(false);

  const reload = React.useCallback(async () => {
    setLoaded(false);
    try {
      const r = await window.API.getUsuarios();
      const list = (r.usuarios || []).map((u) => ({
        id: u.id,
        code: userCode(u.id, u.uf),
        name: u.nome || '—', nomeCompleto: u.nomeCompleto || '', email: u.email || '', telefone: u.telefone || '',
        cpf: u.cpf || '', cargo: u.cargo || '', departamento: u.departamento || '', nascimento: u.nascimento || '',
        endereco: u.endereco || '', bio: u.bio || '', cidade: u.cidade || '', uf: u.uf || '', fotoUrl: u.fotoUrl || '',
        tipo: u.papelNome || u.papel || '—', papelCodigo: u.papel || 'atendente',
        status: u.status || 'ativo',
      }));
      setUsers(list);
      if (window.semearFotosUsuarios) window.semearFotosUsuarios(r.usuarios); // foto única em todo Avatar
      if (list.length) skelRemember('usuarios', list.length);
    } catch (e) { setUsers([]); }
    finally { setLoaded(true); }
  }, []);
  React.useEffect(() => { reload(); }, [reload]);

  const tipos = React.useMemo(() => Array.from(new Set(users.map((u) => u.tipo).filter((t) => t && t !== '—'))), [users]);
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (filterTipo !== 'all' && u.tipo !== filterTipo) return false;
      if (filterStatus !== 'all' && u.status !== filterStatus) return false;
      if (!q) return true;
      return (u.name || '').toLowerCase().includes(q) || (u.code || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
    });
  }, [users, query, filterTipo, filterStatus]);

  const cidadeUF = (u) => [u.cidade, u.uf].filter(Boolean).join(' - ') || '—';
  const setAtivoUsuario = async (u, v) => {
    try { await window.API.editarUsuario(u.id, { ativo: v }); reload(); }
    catch (e) { window.showToast && window.showToast({ tipo: 'erro', titulo: 'Não foi possível alterar', descricao: (e && e.message) || 'Tente novamente.' }); }
  };
  const activeFilters = (filterTipo !== 'all' ? 1 : 0) + (filterStatus !== 'all' ? 1 : 0);
  const clearFilters = () => { setFilterTipo('all'); setFilterStatus('all'); };
  const showSkel = !loaded;

  return (
    <Page title="Usuários" subtitle="Membros com acesso à sua loja"
      actions={<div className="row" style={{ gap: 8 }}><ActionButton action="voltar" size="sm" onClick={back} /><FabNovo size="sm" label="Novo usuário" onClick={() => setDrawer({ modo: 'novo' })} /></div>}>

      <UsersStyles />

      {/* Toolbar: busca (nome/ID) + filtros Tipo e Status */}
      <div className="card" style={{ padding: 12, marginBottom: 'var(--pad-3)' }}>
        <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: 220, maxWidth: 360 }}>
            <Ic name="search" size={13} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }} />
            <input className="input" placeholder="Buscar por nome ou ID..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ paddingLeft: 40, width: '100%' }} />
            {query &&
              <button onClick={() => setQuery('')} className="btn btn-ghost btn-icon" style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 26, height: 26 }} title="Limpar"><Ic name="x" size={12} /></button>}
          </div>
          <span className="muted" style={{ fontSize: 'var(--type-sm)', whiteSpace: 'nowrap' }}>{filtered.length} usuário{filtered.length === 1 ? '' : 's'}</span>
          <div style={{ flex: 1 }} />

          <button className="btn" onClick={() => setShowFilters((s) => !s)}
            style={{ borderColor: activeFilters > 0 || showFilters ? 'var(--accent)' : undefined, color: activeFilters > 0 || showFilters ? 'var(--accent-700)' : undefined, background: activeFilters > 0 || showFilters ? 'var(--accent-soft)' : undefined }}>
            <Ic name="filter" size={13} /> Filtros
            {activeFilters > 0 && <span style={{ marginLeft: 4, background: 'var(--accent)', color: 'white', borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>{activeFilters}</span>}
            <Ic name={showFilters ? 'chevron-up' : 'chevron-down'} size={11} />
          </button>
        </div>

        {showFilters &&
          <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10, animation: 'pop .2s ease' }}>
            <div className="row" style={{ alignItems: 'center', marginBottom: 8, gap: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Filtros</span>
              <div className="spacer" />
              {activeFilters > 0 &&
                <button className="btn btn-sm" onClick={clearFilters} style={{ height: 26, fontSize: 11 }}><Ic name="x" size={11} /> Limpar</button>}
            </div>
            <div className="col" style={{ gap: 12 }}>
              <div>
                <div className="usr-fcat">Tipo</div>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  <span className={'usr-pill' + (filterTipo === 'all' ? ' on' : '')} onClick={() => setFilterTipo('all')}>Todos</span>
                  {tipos.map((t) => <span key={t} className={'usr-pill' + (filterTipo === t ? ' on' : '')} onClick={() => setFilterTipo(t)}>{t}</span>)}
                </div>
              </div>
              <div>
                <div className="usr-fcat">Status</div>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  {[['all', 'Todos'], ['ativo', 'Ativo'], ['inativo', 'Inativo']].map(([id, l]) =>
                    <span key={id} className={'usr-pill' + (filterStatus === id ? ' on' : '')} onClick={() => setFilterStatus(id)}>{l}</span>)}
                </div>
              </div>
            </div>
          </div>}
      </div>

      {/* Tabela */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="usr-row usr-head">
          <div className="usr-idcell"><span>ID</span><span className="usr-sep" /></div>
          <div>Usuário</div>
          <div>Contato</div>
          <div>Tipo</div>
          <div>Status</div>
          <div style={{ textAlign: 'right' }}>Ações</div>
        </div>

        <div className="usr-scroll">
        {showSkel ? (
          Array.from({ length: skelCount('usuarios', 4) }).map((_, i) =>
            <div key={'sk' + i} className="usr-row usr-body" style={{ pointerEvents: 'none' }}>
              <Skeleton w={56} h={12} />
              <div className="row" style={{ gap: 10 }}><Skeleton circle w={40} h={40} /><div style={{ flex: 1 }}><Skeleton w="60%" h={12} /><Skeleton w="45%" h={9} style={{ marginTop: 5 }} /></div></div>
              <div><Skeleton w="80%" h={11} /><Skeleton w="90%" h={11} style={{ marginTop: 5 }} /></div>
              <Skeleton w={90} h={20} r={999} />
              <Skeleton w={70} h={20} r={999} />
              <div className="usr-acts" style={{ justifyContent: 'flex-end' }}><Skeleton w={30} h={30} r={8} /><Skeleton w={30} h={30} r={8} /><Skeleton w={30} h={30} r={8} /></div>
            </div>)
        ) : filtered.length === 0 ? (
          <EmptyState icon="team" title={users.length === 0 ? 'Nenhum usuário ainda' : 'Nenhum usuário encontrado'} desc={users.length === 0 ? 'Clique em “Novo usuário” para cadastrar o primeiro membro.' : 'Ajuste a busca ou os filtros.'} />
        ) : (
          filtered.map((u) => {
            const cor = colorFor ? colorFor(u.name) : '#6366f1';
            const statusColor = u.status === 'ativo' ? '#10b981' : '#ef4444';
            return (
              <div key={u.id} className="usr-body usr-row" style={{ borderLeft: `2px solid ${statusColor}` }}>
                {/* ID */}
                <div className="usr-idcell"><span className="usr-id">{u.code}</span><span className="usr-sep" /></div>

                {/* Avatar + Nome + Cidade-UF */}
                <div className="row" style={{ gap: 10, minWidth: 0 }}>
                  {u.fotoUrl
                    ? <img src={u.fotoUrl} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    : <Avatar name={u.name} size="lg" color={cor} online={u.status === 'ativo'} />}
                  <div style={{ minWidth: 0 }}>
                    <div className="usr-name">{u.name}</div>
                    <div className="usr-sub"><Ic name="building" size={11} /><span>{cidadeUF(u)}</span></div>
                  </div>
                </div>

                {/* Telefone + e-mail */}
                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div className="usr-sub"><Ic name="phone" size={11} /><span>{u.telefone || '—'}</span></div>
                  <div className="usr-sub"><Ic name="mail" size={11} /><span>{u.email || '—'}</span></div>
                </div>

                {/* Tipo */}
                <div><span className="badge badge-neutral">{u.tipo}</span></div>

                {/* Status + ativar/desativar */}
                <div className="row" style={{ gap: 8, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                  <Toggle on={u.status === 'ativo'} compact onChange={(v) => setAtivoUsuario(u, v)} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: u.status === 'ativo' ? '#3DA767' : '#FF452A' }}>{u.status === 'ativo' ? 'Ativo' : 'Inativo'}</span>
                </div>

                {/* Ações */}
                <div className="usr-acts" style={{ justifyContent: 'flex-end' }}>
                  <button className="usr-act usr-act-view" title="Ver" onClick={() => setDrawer({ modo: 'ver', inicial: u })}><Ic name="eye" size={15} /></button>
                  <button className="usr-act usr-act-edit" title="Editar" onClick={() => setDrawer({ modo: 'editar', inicial: u })}><Ic name="edit" size={15} /></button>
                  <button className="usr-act usr-act-del" title="Excluir" onClick={() => setExcluir(u)}><Ic name="trash" size={15} /></button>
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>

      {drawer && <NovoUsuarioDrawer modo={drawer.modo} inicial={drawer.inicial} onClose={() => setDrawer(null)} onResultado={(r) => { reload(); setCriado(r); }} onChanged={reload} />}
      {criado && <ResultadoUsuario info={criado} onClose={() => setCriado(null)} />}
      {excluir && <ConfirmExcluirUsuario user={excluir} onClose={() => setExcluir(null)} onDone={reload} />}
    </Page>
  );
}

// Confirmação de exclusão — desvincula o membro da loja (não apaga o Auth global).
function ConfirmExcluirUsuario({ user, onClose, onDone }) {
  const [removendo, setRemovendo] = React.useState(false);
  const remover = async (close) => {
    setRemovendo(true);
    try {
      await window.API.excluirUsuario(user.id);
      window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Usuário removido', descricao: `${user.name} foi desvinculado da loja.` });
      onDone && onDone();
      if (close) close(); else onClose && onClose();
    } catch (e) {
      window.showToast && window.showToast({ tipo: 'erro', titulo: 'Não foi possível remover', descricao: (e && e.message) || 'Tente novamente.' });
    } finally { setRemovendo(false); }
  };
  return (
    <Modal title="Remover usuário" size="sm" onClose={onClose}
      footer={(close) => <><ActionButton action="cancelar" size="md" label="Cancelar" onClick={() => close()} /><div style={{ flex: 1 }} /><ActionButton action="excluir" size="md" label={removendo ? 'Removendo…' : 'Remover'} disabled={removendo} onClick={() => remover(close)} /></>}>
      <div className="col" style={{ gap: 8 }}>
        <div>Remover <strong>{user.name}</strong> da sua loja?</div>
        <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>Ele perde o acesso a esta empresa. A conta em si não é apagada (pode pertencer a outras lojas).</div>
      </div>
    </Modal>
  );
}

// Modal de confirmação pós-criação — mostra a senha provisória UMA vez (copiável).
function ResultadoUsuario({ info, onClose }) {
  const copiar = () => {
    const txt = `E-mail: ${info.email}` + (info.senhaProvisoria ? `\nSenha provisória: ${info.senhaProvisoria}` : '');
    try { navigator.clipboard.writeText(txt); window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Copiado' }); } catch (e) {}
  };
  return (
    <Modal title={info.convidado ? 'Convite enviado' : info.reset ? 'Senha redefinida' : 'Usuário criado'} size="sm" onClose={onClose}
      footer={(close) => <><div style={{ flex: 1 }} /><ActionButton action="salvar" size="md" label="Concluir" efeito={false} onClick={() => close()} /></>}>
      {info.convidado ? (
        <div className="col" style={{ gap: 10 }}>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}><Ic name="mail" size={16} style={{ color: 'var(--accent-700)' }} /><strong>Convite enviado para {info.email}</strong></div>
          <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>O usuário vai receber um e-mail com um link para <strong>criar a senha</strong> e acessar. O link expira em 24 horas.</div>
        </div>
      ) : (
        <div className="col" style={{ gap: 12 }}>
          <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>Entregue estes dados ao usuário. <strong>A senha não será exibida de novo.</strong></div>
          <div className="card card-pad col" style={{ gap: 8, background: 'var(--surface-2)' }}>
            <div className="row" style={{ gap: 6 }}><Ic name="mail" size={13} /><span style={{ fontWeight: 600 }}>{info.email}</span></div>
            <div className="row" style={{ gap: 6 }}><Ic name="lock" size={13} /><span className="tnum" style={{ fontWeight: 700, letterSpacing: '.02em' }}>{info.senhaProvisoria}</span></div>
          </div>
          <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={copiar}><Ic name="copy" size={13} /> Copiar e-mail e senha</button>
        </div>
      )}
    </Modal>
  );
}

// Drawer "Novo usuário" — réplica das sub-abas do Perfil (sem Sessões).
function NovoUsuarioDrawer({ modo = 'novo', inicial = null, onClose, onResultado, onChanged }) {
  const ro = modo === 'ver';      // só leitura
  const ed = modo === 'editar';
  const novo = modo === 'novo';
  const [tab, setTab] = React.useState('dados');
  const [f, setF] = React.useState(() => ({
    nomeCompleto: (inicial && (inicial.nomeCompleto || inicial.name || inicial.nome)) || '',
    name: (inicial && (inicial.name || inicial.nome)) || '',
    email: (inicial && inicial.email) || '',
    telefone: (inicial && inicial.telefone) || '',
    cpf: (inicial && inicial.cpf) || '',
    papel: 'atendente',
    cargo: (inicial && inicial.cargo) || '',
    departamento: (inicial && inicial.departamento) || '',
    nascimento: (inicial && inicial.nascimento) || '',
    endereco: (inicial && inicial.endereco) || '',
    bio: (inicial && inicial.bio) || '',
    cidade: (inicial && inicial.cidade) || '',
    uf: (inicial && inicial.uf) || '',
  }));
  const [pw, setPw] = React.useState({ nova: '', conf: '' });
  const [salvando, setSalvando] = React.useState(false);
  const [prefs, setPrefs] = React.useState({ tema: 'light', densidade: 'regular', notifNovaMensagem: true, notifTransferida: true, notifAguardando: true, notifResumoEmail: false, notifPlataforma: false });
  const set = (k, v) => { if (ro) return; setF((p) => ({ ...p, [k]: v })); };
  const setPwK = (k, v) => setPw((p) => ({ ...p, [k]: v }));
  const setPref = (k, v) => { if (ro) return; setPrefs((p) => ({ ...p, [k]: v })); };
  const maskData = (v) => { const n = (v || '').replace(/\D/g, '').slice(0, 8); if (n.length <= 2) return n; if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`; return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`; };
  const initials = (n) => (n || '?').split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase() || 'NU';
  const [foto, setFoto] = React.useState(() => (inicial && inicial.fotoUrl) || ''); // preview (URL salva ou data URL local)
  const [fotoFile, setFotoFile] = React.useState(null);   // arquivo a subir (se trocou)
  const [fotoRemovida, setFotoRemovida] = React.useState(false);
  const fileRef = React.useRef(null);
  const escolherFoto = () => { if (!ro) fileRef.current && fileRef.current.click(); };
  const enviarFoto = (file) => { if (!file) return; setFotoFile(file); setFotoRemovida(false); const r = new FileReader(); r.onload = () => setFoto(r.result); r.readAsDataURL(file); };
  const removerFoto = () => { setFoto(''); setFotoFile(null); setFotoRemovida(true); };

  const EmailInput = window.EmailInput || ((p) => <input className="input" {...p} />);
  const PhoneInput = window.PhoneInput || ((p) => <input className="input" value={p.value} disabled={p.disabled} onChange={(e) => p.onChange && p.onChange(e.target.value)} />);
  const CpfInput = window.CpfInput || ((p) => <input className="input" value={p.value} disabled={p.disabled} onChange={(e) => p.onChange && p.onChange(e.target.value)} placeholder="000.000.000-00" />);

  const displayName = f.nomeCompleto || f.name || (novo ? 'Novo usuário' : 'Usuário');
  const titulo = novo ? 'Novo usuário' : ed ? 'Editar usuário' : 'Usuário';
  const subt = novo ? 'Cadastre um membro com acesso à loja' : ed ? 'Atualize os dados do membro' : 'Detalhes do membro';

  const tabs = [
    { id: 'dados', label: 'Dados pessoais', icon: 'user' },
    { id: 'seg', label: 'Segurança', icon: 'shield' },
    { id: 'pref', label: 'Preferências', icon: 'settings' },
  ];

  // Obrigatórios: nome, apelido, e-mail, telefone e CPF.
  const obrigatorios = [
    ['nomeCompleto', 'o nome completo'], ['name', 'como prefere ser chamado(a)'],
    ['email', 'o e-mail'], ['telefone', 'o telefone'], ['cpf', 'o CPF'],
  ];
  const validar = () => {
    const falta = obrigatorios.find(([k]) => !(f[k] || '').trim());
    if (falta) { setTab('dados'); window.showToast && window.showToast({ tipo: 'aviso', titulo: 'Campo obrigatório', descricao: `Informe ${falta[1]}.` }); return false; }
    return true;
  };
  const criar = async (close) => {
    if (!validar()) return;
    setSalvando(true);
    try {
      const r = await window.API.criarUsuario({
        nomeCompleto: f.nomeCompleto, name: f.name, email: f.email, telefone: f.telefone,
        cpf: f.cpf, cargo: f.cargo, papel: f.papel,
        departamento: f.departamento, nascimento: f.nascimento, endereco: f.endereco, bio: f.bio, cidade: f.cidade, uf: f.uf,
      });
      if (fotoFile && r.userId) { try { await window.API.uploadFotoUsuario(r.userId, fotoFile); } catch (e) {} }
      window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Convite enviado', descricao: 'O usuário vai receber um e-mail para criar a senha e acessar.' });
      onResultado && onResultado(r);
      if (close) close(); else onClose && onClose();
    } catch (e) {
      window.showToast && window.showToast({ tipo: 'erro', titulo: 'Não foi possível criar', descricao: (e && e.message) || 'Tente novamente.' });
    } finally { setSalvando(false); }
  };
  const salvarEdicao = async (close) => {
    if (!validar()) return;
    setSalvando(true);
    try {
      await window.API.editarUsuario(inicial.id, {
        nomeCompleto: f.nomeCompleto, name: f.name, telefone: f.telefone, cpf: f.cpf, cargo: f.cargo,
        departamento: f.departamento, nascimento: f.nascimento, endereco: f.endereco, bio: f.bio, cidade: f.cidade, uf: f.uf,
        removerFoto: fotoRemovida,
      });
      if (fotoFile) { try { await window.API.uploadFotoUsuario(inicial.id, fotoFile); } catch (e) {} }
      window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Usuário atualizado', descricao: 'Alterações salvas.' });
      onChanged && onChanged();
      if (close) close(); else onClose && onClose();
    } catch (e) {
      window.showToast && window.showToast({ tipo: 'erro', titulo: 'Não foi possível salvar', descricao: (e && e.message) || 'Tente novamente.' });
    } finally { setSalvando(false); }
  };
  const resetar = async () => {
    setSalvando(true);
    try {
      const r = await window.API.resetSenhaUsuario(inicial.id);
      onResultado && onResultado(r); // mostra a nova senha no modal
    } catch (e) {
      window.showToast && window.showToast({ tipo: 'erro', titulo: 'Não foi possível resetar', descricao: (e && e.message) || 'Tente novamente.' });
    } finally { setSalvando(false); }
  };

  const footer = ro ? undefined : (close) => <><div style={{ flex: 1 }} /><ActionButton action="salvar" size="md" label={salvando ? 'Salvando…' : (novo ? 'Criar usuário' : 'Salvar alterações')} efeito={false} disabled={salvando} onClick={() => (novo ? criar(close) : salvarEdicao(close))} /></>;

  return (
    <Drawer
      title={titulo}
      subtitle={subt}
      onClose={onClose}
      width={680}
      footer={footer}>

      {/* input de arquivo (oculto) — alimenta a pré-visualização da foto */}
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={(e) => { const file = e.target.files && e.target.files[0]; e.target.value = ''; enviarFoto(file); }} />

      {/* cabeçalho do membro */}
      <div className="row" style={{ gap: 14, alignItems: 'center', paddingBottom: 14, borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
        <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', background: colorFor ? colorFor(displayName) : '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20 }}>
            {foto ? <img src={foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(displayName)}
          </div>
          {!ro && <button type="button" onClick={escolherFoto} title="Carregar / trocar foto" style={{ position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}><Ic name="camera" size={12} /></button>}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 'var(--type-md)' }}>{displayName}</div>
          <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>{f.email || 'Preencha os dados abaixo · campos com * são obrigatórios'}</div>
        </div>
      </div>

      {/* sub-abas */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: 18, marginBottom: 16, padding: '0 2px' }}>
        {tabs.map((t) =>
          <div key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 0', fontSize: 'var(--type-sm)', fontWeight: tab === t.id ? 600 : 500, color: tab === t.id ? 'var(--text)' : 'var(--text-muted)', borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: -1, cursor: 'pointer' }}>
            <Ic name={t.icon} size={14} /> {t.label}
          </div>)}
      </div>

      {tab === 'dados' && (
        <div className="col" style={{ gap: 12 }}>
          {/* Foto de perfil — avatar + carregar/trocar/remover (preview local) */}
          <div className="row" style={{ gap: 14, alignItems: 'center', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10 }}>
            <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', background: colorFor ? colorFor(displayName) : '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 24 }}>
                {foto ? <img src={foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(displayName)}
              </div>
              {!ro && <button type="button" onClick={escolherFoto} title="Carregar / trocar foto" style={{ position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}><Ic name="camera" size={13} /></button>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 'var(--type-sm)' }}>Foto de perfil</div>
              <div className="muted" style={{ fontSize: 'var(--type-xs)', marginBottom: 8 }}>PNG, JPG ou WebP · até 2MB</div>
              {!ro && <div className="row" style={{ gap: 6 }}>
                <button className="btn btn-sm" onClick={escolherFoto}><Ic name="upload" size={13} /> {foto ? 'Trocar' : 'Carregar'}</button>
                <button className="btn btn-sm" onClick={removerFoto} disabled={!foto}>Remover</button>
              </div>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="label">Nome completo *</label><input className="input" value={f.nomeCompleto} disabled={ro} onChange={(e) => set('nomeCompleto', e.target.value)} placeholder="Ex: Mariana Sousa" /></div>
            <div><label className="label">Como prefere ser chamada(o) *</label><input className="input" value={f.name} disabled={ro} onChange={(e) => set('name', e.target.value)} placeholder="Ex: Mari" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="label">E-mail de acesso *</label><EmailInput value={f.email} disabled={ro || ed} readOnly={ro || ed} onChange={(v) => set('email', typeof v === 'string' ? v : (v && v.target ? v.target.value : ''))} /></div>
            <div><label className="label">Telefone / WhatsApp *</label><PhoneInput value={f.telefone} disabled={ro} onChange={(v) => set('telefone', v)} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="label">CPF *</label><CpfInput value={f.cpf} disabled={ro} onChange={(v) => set('cpf', v)} /></div>
            <div><label className="label">Perfil de acesso</label>
              {novo ? (
                <select className="input" value={f.papel} onChange={(e) => set('papel', e.target.value)}>
                  <option value="atendente">Vendedor</option>
                </select>
              ) : (
                <input className="input" value={(inicial && inicial.tipo) || 'Vendedor'} disabled readOnly />
              )}
              <div className="muted" style={{ fontSize: 'var(--type-xs)', marginTop: 4 }}>Vendedor acessa a tela de atendente.</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="label">Cargo</label><input className="input" value={f.cargo} disabled={ro} onChange={(e) => set('cargo', e.target.value)} /></div>
            <div><label className="label">Departamento</label><input className="input" value={f.departamento} disabled={ro} onChange={(e) => set('departamento', e.target.value)} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="label">Data de nascimento</label><input className="input" value={f.nascimento} disabled={ro} onChange={(e) => set('nascimento', maskData(e.target.value))} inputMode="numeric" maxLength={10} placeholder="dd/mm/aaaa" /></div>
            <div><label className="label">Endereço</label><input className="input" value={f.endereco} disabled={ro} onChange={(e) => set('endereco', e.target.value)} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 10 }}>
            <div><label className="label">Cidade</label><input className="input" value={f.cidade} disabled={ro} onChange={(e) => set('cidade', e.target.value)} placeholder="Ex: Fortaleza" /></div>
            <div><label className="label">UF</label><input className="input" value={f.uf} disabled={ro} maxLength={2} onChange={(e) => set('uf', e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2))} placeholder="CE" /></div>
          </div>
          <div><label className="label">Bio / observações</label><textarea className="input" rows={3} value={f.bio} disabled={ro} onChange={(e) => set('bio', e.target.value)} /></div>
        </div>
      )}

      {tab === 'seg' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--pad-3)', alignItems: 'flex-start' }}>
          <div className="card card-pad col" style={{ gap: 10 }}>
            <div className="row" style={{ gap: 8, alignItems: 'center' }}><Ic name="lock" size={16} style={{ color: 'var(--accent-700)' }} /><div className="h3" style={{ margin: 0 }}>Senha de acesso</div></div>
            {novo ? (<>
              <div className="muted" style={{ fontSize: 'var(--type-sm)', lineHeight: 1.5 }}>O acesso é por <strong>convite por e-mail</strong>. Ao criar, enviamos um link para <strong>{f.email || 'o e-mail informado'}</strong> e o próprio usuário <strong>define a senha</strong> (link válido por 24h).</div>
            </>) : (<>
              <div className="muted" style={{ fontSize: 'var(--type-sm)', lineHeight: 1.5 }}>Gere uma <strong>nova senha provisória</strong> para este usuário. A senha aparece uma vez para você entregar; ele pode trocá-la depois.</div>
              {!ro && <button className="btn" style={{ alignSelf: 'flex-start' }} disabled={salvando} onClick={resetar}><Ic name="lock" size={13} /> {salvando ? 'Gerando…' : 'Resetar senha'}</button>}
            </>)}
          </div>
          <div className="card card-pad">
            <div className="row"><div className="h3">Autenticação em dois fatores</div><div className="spacer" /><Toggle on={false} /></div>
            <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 6 }}>Adicione uma camada extra de proteção exigindo um código de 6 dígitos no login.</div>
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
                  {[['light', 'Claro'], ['dark', 'Escuro']].map(([id, l]) =>
                    <button key={id} className="btn btn-sm" onClick={() => setPref('tema', id)} style={{ background: prefs.tema === id ? 'var(--accent-soft)' : '', borderColor: prefs.tema === id ? 'var(--accent)' : '' }}>{l}</button>)}
                </div>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: 'var(--type-sm)' }}>Densidade</span>
                <div className="row" style={{ gap: 6 }}>
                  {[['compact', 'Compacta'], ['regular', 'Regular'], ['comfy', 'Confortável']].map(([id, l]) =>
                    <button key={id} className="btn btn-sm" onClick={() => setPref('densidade', id)} style={{ background: prefs.densidade === id ? 'var(--accent-soft)' : '', borderColor: prefs.densidade === id ? 'var(--accent)' : '' }}>{l}</button>)}
                </div>
              </div>
            </div>
          </div>
          <div className="card card-pad">
            <div className="h3">Notificações</div>
            <div className="col" style={{ gap: 10, marginTop: 10 }}>
              {[['notifNovaMensagem', 'Nova mensagem'], ['notifTransferida', 'Conversa transferida para mim'], ['notifAguardando', 'Cliente aguardando há +5 min'], ['notifResumoEmail', 'Resumo diário por e-mail'], ['notifPlataforma', 'Atualizações da plataforma']].map(([k, l]) =>
                <div key={k} className="row" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 'var(--type-sm)' }}>{l}</span>
                  <Toggle on={!!prefs[k]} compact onChange={(v) => setPref(k, v)} />
                </div>)}
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}

Object.assign(window, { UsersPage, NovoUsuarioDrawer });
