// departamentos-page.jsx — Cadastro de Departamentos (padrão de página de cadastro:
// cabeçalho + Voltar + botão Criar + lista + busca). Drawer cria/edita; confirma exclusão.

function DepartamentosPage() {
  const { back, auth } = useStore();
  // Departamentos via cache por empresa (api.jsx): revisita instantânea + revalida no fundo.
  const { data: itens, setData: setItens, loading: depLoading, reload } = useCachedQuery(
    ['departamentos'],
    async () => {
      let list;
      try { const r = await window.API.getDepartamentos(); list = r.departamentos || []; }
      catch (e) { list = []; } // erro -> vazio (igual ao .catch antigo)
      if (list.length && typeof skelRemember === 'function') skelRemember('departamentos', list.length);
      return list;
    },
    { empresaId: auth.empresaId, initialData: [] },
  );
  const loaded = !depLoading;
  const [query, setQuery] = React.useState('');
  const [drawer, setDrawer] = React.useState(null);   // { modo, inicial }
  const [excluir, setExcluir] = React.useState(null);

  // (A busca de departamentos e seu ciclo de vida vivem agora no hook useCachedQuery
  // acima: carrega no mount, cacheia por empresa, revalida no fundo e expõe `reload`.)

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return (itens || []).filter((d) => !q || (d.nome || '').toLowerCase().includes(q) || (d.descricao || '').toLowerCase().includes(q));
  }, [itens, query]);
  const setAtivoDep = async (d, v) => {
    try { await window.API.editarDepartamento(d.id, { ativo: v }); reload(); }
    catch (e) { window.showToast && window.showToast({ tipo: 'erro', titulo: 'Não foi possível alterar', descricao: (e && e.message) || 'Tente novamente.' }); }
  };
  const showSkel = !loaded;

  return (
    <Page title="Departamentos" subtitle="Setores internos da loja"
      actions={<div className="row" style={{ gap: 8 }}><ActionButton action="voltar" size="sm" onClick={back} /><FabNovo size="sm" label="Novo departamento" onClick={() => setDrawer({ modo: 'novo' })} /></div>}>

      <style>{`
        .dep-scroll { background: var(--surface-2); padding: 4px; display: flex; flex-direction: column; gap: 4px; }
        .dep-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; transition: box-shadow .12s ease, background .12s ease; }
        .dep-card:hover { background: var(--surface-2); box-shadow: 0 2px 8px rgba(15,23,42,.06); }
        .dep-act { width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s ease; }
        .dep-act-view:hover { color: #3DA767; border-color: #3DA767; background: #C9F0D3; }
        .dep-act-edit:hover { color: #165EEE; border-color: #165EEE; background: #EAF0FE; }
        .dep-act-del:hover  { color: #FF452A; border-color: #FF452A; background: #FFEBEC; }
      `}</style>

      <div className="card" style={{ padding: 12, marginBottom: 'var(--pad-3)' }}>
        <div className="row" style={{ gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: 220, maxWidth: 360 }}>
            <Ic name="search" size={13} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }} />
            <input className="input" placeholder="Buscar departamento..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ paddingLeft: 40, width: '100%' }} />
          </div>
          <span className="muted" style={{ fontSize: 'var(--type-sm)' }}>{filtered.length} departamento{filtered.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {showSkel ? (
          <div className="dep-scroll">
            {Array.from({ length: skelCount('departamentos', 4) }).map((_, i) =>
              <div key={i} className="row dep-card" style={{ gap: 12, padding: '12px 16px', borderLeft: '2px solid var(--border)' }}>
                <Skeleton w={36} h={36} r={10} />
                <div style={{ flex: 1 }}><Skeleton w="35%" h={13} /><Skeleton w="55%" h={10} style={{ marginTop: 6 }} /></div>
                <Skeleton w={70} h={20} r={999} />
              </div>)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="folder" title={itens.length === 0 ? 'Nenhum departamento ainda' : 'Nada encontrado'} desc={itens.length === 0 ? 'Clique em “Novo departamento” para cadastrar o primeiro.' : 'Ajuste a busca.'} />
        ) : (
          <div className="dep-scroll">
            {filtered.map((d) => (
              <div key={d.id} className="row dep-card" style={{ gap: 12, padding: '12px 16px', alignItems: 'center', borderLeft: `2px solid ${d.ativo ? '#10b981' : '#ef4444'}` }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ic name="folder" size={16} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.nome}</div>
                  {d.descricao && <div className="muted" style={{ fontSize: 'var(--type-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.descricao}</div>}
                </div>
                <div className="row" style={{ gap: 6, width: 160, flexShrink: 0, minWidth: 0 }}>
                  {d.responsavel
                    ? <><Avatar name={d.responsavel} size="sm" /><span style={{ fontSize: 'var(--type-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.responsavel}</span></>
                    : <span className="muted" style={{ fontSize: 'var(--type-sm)' }}>—</span>}
                </div>
                <div className="row" style={{ gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <Toggle on={d.ativo} compact onChange={(v) => setAtivoDep(d, v)} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: d.ativo ? '#3DA767' : '#FF452A' }}>{d.ativo ? 'Ativo' : 'Inativo'}</span>
                </div>
                <div className="row" style={{ gap: 6, flexShrink: 0 }}>
                  <button className="dep-act dep-act-view" title="Ver" onClick={() => setDrawer({ modo: 'ver', inicial: d })}><Ic name="eye" size={15} /></button>
                  <button className="dep-act dep-act-edit" title="Editar" onClick={() => setDrawer({ modo: 'editar', inicial: d })}><Ic name="edit" size={15} /></button>
                  <button className="dep-act dep-act-del" title="Excluir" onClick={() => setExcluir(d)}><Ic name="trash" size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {drawer && <DepartamentoDrawer modo={drawer.modo} inicial={drawer.inicial} onClose={() => setDrawer(null)} onSaved={reload} />}
      {excluir && <ConfirmExcluirDep dep={excluir} onClose={() => setExcluir(null)} onDone={reload} />}
    </Page>
  );
}

function DepartamentoDrawer({ modo, inicial, onClose, onSaved }) {
  const { auth } = useStore();
  const ro = modo === 'ver';
  const novo = modo === 'novo';
  const [nome, setNome] = React.useState((inicial && inicial.nome) || '');
  const [descricao, setDescricao] = React.useState((inicial && inicial.descricao) || '');
  const [ativo, setAtivo] = React.useState(inicial ? inicial.ativo !== false : true);
  const [salvando, setSalvando] = React.useState(false);
  // Responsável: escolhido da equipe. Novo -> default no usuário atual; editar ->
  // o que já estiver salvo (ou vazio nos antigos, pra você atribuir).
  const [usuarios, setUsuarios] = React.useState([]);
  const [responsavelId, setResponsavelId] = React.useState((inicial && inicial.responsavelId) || '');
  React.useEffect(() => {
    let alive = true;
    window.API.getUsuarios()
      .then((r) => {
        if (!alive) return;
        const us = (r.usuarios || []).map((u) => ({ id: u.id, nome: u.nome || u.email, email: (u.email || '').toLowerCase() }));
        setUsuarios(us);
        // Sem responsável definido: no NOVO, sugere o usuário logado (casa por e-mail).
        if (novo && !responsavelId) {
          const eu = us.find((u) => u.email === ((auth && auth.email) || '').toLowerCase());
          if (eu) setResponsavelId(eu.id);
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  const responsavelNome = (usuarios.find((u) => u.id === responsavelId) || {}).nome
    || (inicial && inicial.responsavel) || '';

  const salvar = async (close) => {
    if (ro) return;
    if (!nome.trim()) { window.showToast && window.showToast({ tipo: 'aviso', titulo: 'Campo obrigatório', descricao: 'Informe o nome do departamento.' }); return; }
    setSalvando(true);
    try {
      const payload = { nome, descricao, ativo, responsavelId: responsavelId || null, responsavelNome: responsavelNome || null };
      if (novo) await window.API.criarDepartamento(payload);
      else await window.API.editarDepartamento(inicial.id, payload);
      window.showToast && window.showToast({ tipo: 'sucesso', titulo: novo ? 'Departamento criado' : 'Departamento atualizado' });
      onSaved && onSaved();
      if (close) close(); else onClose && onClose();
    } catch (e) {
      window.showToast && window.showToast({ tipo: 'erro', titulo: 'Não foi possível salvar', descricao: (e && e.message) || 'Tente novamente.' });
    } finally { setSalvando(false); }
  };

  const titulo = novo ? 'Novo departamento' : ro ? 'Departamento' : 'Editar departamento';
  return (
    <Drawer
      title={titulo}
      subtitle="Setor interno da loja"
      onClose={onClose}
      width={520}
      footer={ro ? undefined : (close) => <><div style={{ flex: 1 }} /><ActionButton action="salvar" size="md" label={salvando ? 'Salvando…' : (novo ? 'Criar departamento' : 'Salvar alterações')} efeito={false} disabled={salvando} onClick={() => salvar(close)} /></>}>
      <div className="col" style={{ gap: 14 }}>
        <div><label className="label">Nome *</label><input className="input" value={nome} disabled={ro} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Comercial" autoFocus={!ro} /></div>
        <div><label className="label">Descrição</label><textarea className="input" rows={3} value={descricao} disabled={ro} onChange={(e) => setDescricao(e.target.value)} placeholder="Opcional" /></div>
        <div>
          <label className="label">Responsável</label>
          {ro ? (
            <input className="input" value={responsavelNome || '—'} disabled readOnly style={{ opacity: .8 }} />
          ) : (
            <select className="input" value={responsavelId} onChange={(e) => setResponsavelId(e.target.value)}>
              <option value="">— Selecione um responsável —</option>
              {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          )}
        </div>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--type-sm)', fontWeight: 600 }}>Ativo</span>
          <Toggle on={ativo} onChange={(v) => { if (!ro) setAtivo(v); }} />
        </div>
        {!novo && inicial && inicial.id && (
          <>
            <div style={{ height: 1, background: 'var(--border)', margin: '4px -20px' }} />
            <DepartamentoEquipes departamento={inicial} ro={ro} />
          </>
        )}
      </div>
    </Drawer>
  );
}

// Seção de Equipes dentro do drawer de Departamento.
// Cada equipe pertence a 1 departamento; aqui o admin cria/vincula equipes a ESTE
// departamento e gerencia os membros (atendentes) — base do isolamento de conversas.
function DepartamentoEquipes({ departamento, ro }) {
  const [equipes, setEquipes] = React.useState(null);   // equipes deste depto
  const [semDepto, setSemDepto] = React.useState([]);    // equipes sem departamento (p/ vincular)
  const [usuarios, setUsuarios] = React.useState([]);    // membros da loja (p/ atribuir)
  const [novaNome, setNovaNome] = React.useState('');
  const [criando, setCriando] = React.useState(false);
  const [expandida, setExpandida] = React.useState(null); // id da equipe expandida
  const [vincSel, setVincSel] = React.useState('');

  const nomeUsuario = (uid) => { const u = usuarios.find((x) => x.id === uid); return u ? (u.nome || u.email) : '—'; };

  const reload = React.useCallback(async () => {
    try {
      const [todas, us] = await Promise.all([
        window.API.getEquipes(),
        window.API.getUsuarios().catch(() => ({ usuarios: [] })),
      ]);
      const lista = todas.equipes || [];
      setEquipes(lista.filter((e) => e.departamentoId === departamento.id));
      setSemDepto(lista.filter((e) => !e.departamentoId));
      setUsuarios((us.usuarios || []).map((u) => ({ id: u.id, nome: u.nome, email: u.email })));
    } catch (e) { setEquipes([]); }
  }, [departamento.id]);
  React.useEffect(() => { reload(); }, [reload]);

  const criarEquipe = async () => {
    const nome = novaNome.trim();
    if (!nome) return;
    setCriando(true);
    try {
      await window.API.criarEquipe({ nome, departamentoId: departamento.id });
      setNovaNome('');
      window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Equipe criada' });
      reload();
    } catch (e) { window.showToast && window.showToast({ tipo: 'erro', titulo: 'Não foi possível criar', descricao: (e && e.message) || 'Tente novamente.' }); }
    finally { setCriando(false); }
  };
  const vincular = async () => {
    if (!vincSel) return;
    try { await window.API.editarEquipe(vincSel, { departamentoId: departamento.id }); setVincSel(''); window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Equipe vinculada' }); reload(); }
    catch (e) { window.showToast && window.showToast({ tipo: 'erro', titulo: 'Não foi possível vincular', descricao: (e && e.message) || 'Tente novamente.' }); }
  };
  const desvincular = async (eq) => {
    try { await window.API.editarEquipe(eq.id, { departamentoId: null }); window.showToast && window.showToast({ tipo: 'info', titulo: 'Equipe desvinculada' }); reload(); }
    catch (e) { window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro', descricao: (e && e.message) || 'Tente novamente.' }); }
  };
  const addMembro = async (eq, uid) => {
    if (!uid) return;
    try { await window.API.addEquipeMembro(eq.id, uid); reload(); }
    catch (e) { window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao adicionar', descricao: (e && e.message) || 'Tente novamente.' }); }
  };
  const removeMembro = async (eq, uid) => {
    try { await window.API.removeEquipeMembro(eq.id, uid); reload(); }
    catch (e) { window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao remover', descricao: (e && e.message) || 'Tente novamente.' }); }
  };

  return (
    <div className="col" style={{ gap: 10, marginTop: 6 }}>
      <div className="row" style={{ alignItems: 'center', gap: 8 }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-700)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Ic name="team" size={14} /></span>
        <div style={{ fontWeight: 700 }}>Equipes do departamento</div>
        <span className="muted" style={{ fontSize: 'var(--type-sm)', marginLeft: 'auto' }}>{equipes ? equipes.length : 0}</span>
      </div>
      <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: -4 }}>Os atendentes das equipes deste setor enxergam as conversas direcionadas a ele.</div>

      {equipes === null ? (
        <div className="col" style={{ gap: 6 }}>{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} w="100%" h={44} r={10} />)}</div>
      ) : equipes.length === 0 ? (
        <div className="muted" style={{ fontSize: 'var(--type-sm)', padding: 14, textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 10 }}>Nenhuma equipe neste departamento ainda.</div>
      ) : (
        <div className="col" style={{ gap: 8 }}>
          {equipes.map((eq) => {
            const aberta = expandida === eq.id;
            const disp = usuarios.filter((u) => !(eq.membros || []).includes(u.id));
            return (
              <div key={eq.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="row" style={{ gap: 10, padding: '10px 12px', alignItems: 'center', cursor: ro ? 'default' : 'pointer' }} onClick={() => !ro && setExpandida(aberta ? null : eq.id)}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: (eq.cor || 'var(--accent)'), opacity: .9, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ic name="team" size={14} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 'var(--type-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{eq.nome}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{(eq.membros || []).length} membro{(eq.membros || []).length === 1 ? '' : 's'}</div>
                  </div>
                  {!ro && <Ic name={aberta ? 'chevron-up' : 'chevron-down'} size={16} style={{ color: 'var(--text-faint)' }} />}
                </div>
                {aberta && !ro && (
                  <div className="col" style={{ gap: 10, padding: '0 12px 12px' }}>
                    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                      {(eq.membros || []).length === 0 ? <span className="muted" style={{ fontSize: 11 }}>Sem membros.</span> :
                        (eq.membros || []).map((uid) => (
                          <span key={uid} className="row" style={{ gap: 6, padding: '4px 8px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 999, fontSize: 12 }}>
                            {nomeUsuario(uid)}
                            <Ic name="x" size={12} style={{ cursor: 'pointer', color: '#FF452A' }} onClick={() => removeMembro(eq, uid)} />
                          </span>
                        ))}
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      <select className="input" defaultValue="" onChange={(e) => { addMembro(eq, e.target.value); e.target.value = ''; }} style={{ flex: 1, height: 34 }}>
                        <option value="">+ Adicionar membro…</option>
                        {disp.map((u) => <option key={u.id} value={u.id}>{u.nome || u.email}</option>)}
                      </select>
                      <button className="dep-act dep-act-del" title="Desvincular do departamento" onClick={() => desvincular(eq)} style={{ width: 34, height: 34 }}><Ic name="logout" size={14} /></button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!ro && (
        <div className="col" style={{ gap: 8, marginTop: 2 }}>
          <div className="row" style={{ gap: 6 }}>
            <input className="input" placeholder="Nome da nova equipe" value={novaNome} onChange={(e) => setNovaNome(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') criarEquipe(); }} style={{ flex: 1 }} />
            <button className="dep-act dep-act-view" title="Criar equipe" onClick={criarEquipe} disabled={criando || !novaNome.trim()} style={{ width: 38, height: 38, opacity: (criando || !novaNome.trim()) ? .5 : 1 }}><Ic name="plus" size={15} /></button>
          </div>
          {semDepto.length > 0 && (
            <div className="row" style={{ gap: 6 }}>
              <select className="input" value={vincSel} onChange={(e) => setVincSel(e.target.value)} style={{ flex: 1, height: 38 }}>
                <option value="">Vincular equipe existente…</option>
                {semDepto.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
              <button className="dep-act dep-act-edit" title="Vincular" onClick={vincular} disabled={!vincSel} style={{ width: 38, height: 38, opacity: vincSel ? 1 : .5 }}><Ic name="link" size={15} /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ConfirmExcluirDep({ dep, onClose, onDone }) {
  const [rm, setRm] = React.useState(false);
  const remover = async (close) => {
    setRm(true);
    try {
      await window.API.excluirDepartamento(dep.id);
      window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Departamento removido' });
      onDone && onDone();
      if (close) close(); else onClose && onClose();
    } catch (e) {
      window.showToast && window.showToast({ tipo: 'erro', titulo: 'Não foi possível remover', descricao: (e && e.message) || 'Tente novamente.' });
    } finally { setRm(false); }
  };
  return (
    <Modal title="Remover departamento" size="sm" onClose={onClose}
      footer={(close) => <><ActionButton action="cancelar" size="md" label="Cancelar" onClick={() => close()} /><div style={{ flex: 1 }} /><ActionButton action="excluir" size="md" label={rm ? 'Removendo…' : 'Remover'} disabled={rm} onClick={() => remover(close)} /></>}>
      <div className="col" style={{ gap: 8 }}>
        <div>Remover o departamento <strong>{dep.nome}</strong>?</div>
        <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>Esta ação não pode ser desfeita.</div>
      </div>
    </Modal>
  );
}

// =====================================================================
// RoteamentoPage — para onde o CONTATO NOVO vai primeiro (IA ou Departamento)
// + modo de distribuição de cada departamento (automática/manual). Puxada em Cadastros.
// =====================================================================
function RoteamentoPage() {
  const { back } = useStore();
  const [destinoTipo, setDestinoTipo] = React.useState('ia');     // 'ia' | 'departamento'
  const [destinoDep, setDestinoDep] = React.useState('');         // id do departamento (string)
  const [deps, setDeps] = React.useState([]);
  const [loaded, setLoaded] = React.useState(false);
  const [salvando, setSalvando] = React.useState(false);

  const reload = React.useCallback(async () => {
    setLoaded(false);
    try {
      const [rot, dd] = await Promise.all([window.API.getRoteamento(), window.API.getDepartamentos()]);
      setDestinoTipo(rot.destinoTipo === 'departamento' ? 'departamento' : 'ia');
      setDestinoDep(rot.destinoDepartamentoId ? String(rot.destinoDepartamentoId) : '');
      setDeps(dd.departamentos || []);
    } catch (e) { setDeps([]); }
    finally { setLoaded(true); }
  }, []);
  React.useEffect(() => { reload(); }, [reload]);

  const ativos = deps.filter((d) => d.ativo !== false);

  const salvar = async () => {
    if (destinoTipo === 'departamento' && !destinoDep) { window.showToast && window.showToast({ tipo: 'aviso', titulo: 'Escolha um departamento', descricao: 'Selecione o setor que recebe os contatos novos.' }); return; }
    setSalvando(true);
    try {
      await window.API.saveRoteamento({ destinoTipo, destinoDepartamentoId: destinoTipo === 'departamento' ? Number(destinoDep) : null });
      window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Roteamento salvo' });
    } catch (e) { window.showToast && window.showToast({ tipo: 'erro', titulo: 'Não foi possível salvar', descricao: (e && e.message) || 'Tente novamente.' }); }
    finally { setSalvando(false); }
  };
  const setDistrib = async (d, modo) => {
    const antes = d.distribuicao;
    setDeps((ds) => ds.map((x) => x.id === d.id ? { ...x, distribuicao: modo } : x));
    try { await window.API.editarDepartamento(d.id, { distribuicao: modo }); }
    catch (e) { setDeps((ds) => ds.map((x) => x.id === d.id ? { ...x, distribuicao: antes } : x)); window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao salvar', descricao: (e && e.message) || 'Tente novamente.' }); }
  };

  const DEST = [
    { id: 'ia', nome: 'Inteligência Artificial', desc: 'A IA recebe e conduz o primeiro contato', icon: 'sparkles', color: '#a855f7' },
    { id: 'departamento', nome: 'Departamento', desc: 'Cai direto na fila de um setor', icon: 'folder', color: '#16a34a' },
  ];

  return (
    <Page title="Roteamento de atendimento" subtitle="Para onde o contato novo vai primeiro e como é distribuído"
      actions={<div className="row" style={{ gap: 8 }}><ActionButton action="voltar" size="sm" onClick={back} /><ActionButton action="salvar" size="sm" label={salvando ? 'Salvando…' : 'Salvar'} efeito={false} disabled={salvando} onClick={salvar} /></div>}>

      {/* Destino inicial */}
      <div className="card" style={{ padding: 16, marginBottom: 'var(--pad-3)' }}>
        <div className="row" style={{ gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-700)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Ic name="filter" size={14} /></span>
          <div style={{ fontWeight: 700 }}>Quando um contato novo chega…</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {DEST.map((o) => {
            const on = destinoTipo === o.id;
            return (
              <div key={o.id} onClick={() => setDestinoTipo(o.id)} className="card" style={{ padding: 12, cursor: 'pointer', borderColor: on ? o.color : 'var(--border)', background: on ? `color-mix(in oklab, ${o.color} 8%, var(--surface))` : 'var(--surface)', transition: 'border-color .15s, background .15s' }}>
                <div className="row" style={{ gap: 10 }}>
                  <span style={{ width: 38, height: 38, borderRadius: 9, background: `color-mix(in oklab, ${o.color} 14%, transparent)`, color: o.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ic name={o.icon} size={18} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 'var(--type-sm)' }}>{o.nome}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{o.desc}</div>
                  </div>
                  {on && <Ic name="check" size={16} style={{ color: o.color }} />}
                </div>
              </div>
            );
          })}
        </div>
        {destinoTipo === 'departamento' && (
          <div style={{ marginTop: 12 }}>
            <label className="label">Departamento que recebe</label>
            <select className="input" value={destinoDep} onChange={(e) => setDestinoDep(e.target.value)} style={{ maxWidth: 360 }}>
              <option value="">— Selecione —</option>
              {ativos.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
            {ativos.length === 0 && <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 6 }}>Nenhum departamento ativo. Crie um em Cadastros › Departamentos.</div>}
          </div>
        )}
      </div>

      {/* Distribuição por departamento */}
      <div className="card" style={{ padding: 16 }}>
        <div className="row" style={{ gap: 8, alignItems: 'center', marginBottom: 4 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-700)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Ic name="team" size={14} /></span>
          <div style={{ fontWeight: 700 }}>Distribuição por departamento</div>
        </div>
        <div className="muted" style={{ fontSize: 'var(--type-sm)', marginBottom: 12 }}>Como as conversas da fila chegam aos atendentes do setor.</div>
        {!loaded ? (
          <div className="col" style={{ gap: 8 }}>{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} w="100%" h={52} r={10} />)}</div>
        ) : ativos.length === 0 ? (
          <EmptyState icon="folder" title="Nenhum departamento" desc="Crie departamentos para configurar a distribuição." />
        ) : (
          <div className="col" style={{ gap: 8 }}>
            {ativos.map((d) => {
              const modo = d.distribuicao === 'auto' ? 'auto' : 'manual';
              return (
                <div key={d.id} className="row" style={{ gap: 12, alignItems: 'center', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)' }}>
                  <span style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ic name="folder" size={15} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 'var(--type-sm)' }}>{d.nome}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{modo === 'auto' ? 'A IA distribui automaticamente (regras a definir)' : 'Os atendentes pegam da fila'}</div>
                  </div>
                  <div className="row" style={{ gap: 4, flexShrink: 0 }}>
                    {[['manual', 'Manual'], ['auto', 'Automática']].map(([id, l]) => {
                      const on = modo === id;
                      return <div key={id} onClick={() => setDistrib(d, id)} style={{ padding: '7px 12px', border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--accent-soft)' : 'transparent', borderRadius: 8, cursor: 'pointer', fontSize: 'var(--type-sm)', fontWeight: on ? 600 : 500, color: on ? 'var(--accent-700)' : 'var(--text-muted)' }}>{l}</div>;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Page>
  );
}

// =====================================================================
// OrigensPage — Cadastro de ORIGEM DO CLIENTE (2 campos: nome + descrição).
// =====================================================================
function OrigensPage() {
  const { back } = useStore();
  const [itens, setItens] = React.useState(null);
  const [query, setQuery] = React.useState('');
  const [modal, setModal] = React.useState(null);   // { modo, inicial }
  const [excluir, setExcluir] = React.useState(null);
  const reload = React.useCallback(() => { window.API.getOrigens().then((r) => setItens(r.origens || [])).catch(() => setItens([])); }, []);
  React.useEffect(() => { reload(); }, [reload]);
  const filtered = (itens || []).filter((o) => { const q = query.trim().toLowerCase(); return !q || (o.nome || '').toLowerCase().includes(q) || (o.descricao || '').toLowerCase().includes(q); });
  return (
    <Page title="Origem do Cliente" subtitle="De onde os clientes chegam (canais e origens)"
      actions={<div className="row" style={{ gap: 8 }}><ActionButton action="voltar" size="sm" onClick={back} /><FabNovo size="sm" label="Nova origem" onClick={() => setModal({ modo: 'novo' })} /></div>}>
      <style>{`
        .ori-scroll { background: var(--surface-2); padding: 4px; display: flex; flex-direction: column; gap: 4px; }
        .ori-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; transition: box-shadow .12s ease, background .12s ease; }
        .ori-card:hover { background: var(--surface-2); box-shadow: 0 2px 8px rgba(15,23,42,.06); }
        .ori-act { width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s ease; }
        .ori-act-edit:hover { color: #165EEE; border-color: #165EEE; background: #EAF0FE; }
        .ori-act-del:hover  { color: #FF452A; border-color: #FF452A; background: #FFEBEC; }
      `}</style>
      <div className="card" style={{ padding: 12, marginBottom: 'var(--pad-3)' }}>
        <div className="row" style={{ gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: 220, maxWidth: 360 }}>
            <Ic name="search" size={13} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }} />
            <input className="input" placeholder="Buscar origem..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ paddingLeft: 40, width: '100%' }} />
          </div>
          <span className="muted" style={{ fontSize: 'var(--type-sm)' }}>{filtered.length} origem{filtered.length === 1 ? '' : 's'}</span>
        </div>
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        {itens === null ? (
          <div className="ori-scroll">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="row ori-card" style={{ gap: 12, padding: '12px 16px' }}><Skeleton w={36} h={36} r={10} /><div style={{ flex: 1 }}><Skeleton w="35%" h={13} /><Skeleton w="55%" h={10} style={{ marginTop: 6 }} /></div></div>)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="tag" title={(itens.length === 0) ? 'Nenhuma origem ainda' : 'Nada encontrado'} desc={(itens.length === 0) ? 'Clique em “Nova origem” para cadastrar a primeira.' : 'Ajuste a busca.'} />
        ) : (
          <div className="ori-scroll">
            {filtered.map((o) => (
              <div key={o.id} className="row ori-card" style={{ gap: 12, padding: '12px 16px', alignItems: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ic name="tag" size={16} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.nome}</div>
                  {o.descricao && <div className="muted" style={{ fontSize: 'var(--type-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.descricao}</div>}
                </div>
                <div className="row" style={{ gap: 6, flexShrink: 0 }}>
                  <button className="ori-act ori-act-edit" title="Editar" onClick={() => setModal({ modo: 'editar', inicial: o })}><Ic name="edit" size={15} /></button>
                  <button className="ori-act ori-act-del" title="Excluir" onClick={() => setExcluir(o)}><Ic name="trash" size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {modal && <OrigemModal modo={modal.modo} inicial={modal.inicial} onClose={() => setModal(null)} onSaved={reload} />}
      {excluir && <ConfirmExcluirOrigem origem={excluir} onClose={() => setExcluir(null)} onDone={reload} />}
    </Page>
  );
}

function OrigemModal({ modo, inicial, onClose, onSaved }) {
  const novo = modo === 'novo';
  const [nome, setNome] = React.useState((inicial && inicial.nome) || '');
  const [descricao, setDescricao] = React.useState((inicial && inicial.descricao) || '');
  const [salvando, setSalvando] = React.useState(false);
  const salvar = async (close) => {
    if (!nome.trim()) { window.showToast && window.showToast({ tipo: 'aviso', titulo: 'Campo obrigatório', descricao: 'Informe o nome da origem.' }); return; }
    setSalvando(true);
    try {
      if (novo) await window.API.criarOrigem({ nome, descricao });
      else await window.API.editarOrigem(inicial.id, { nome, descricao });
      window.showToast && window.showToast({ tipo: 'sucesso', titulo: novo ? 'Origem criada' : 'Origem atualizada' });
      onSaved && onSaved();
      if (close) close(); else onClose && onClose();
    } catch (e) { window.showToast && window.showToast({ tipo: 'erro', titulo: 'Não foi possível salvar', descricao: (e && e.message) || 'Tente novamente.' }); }
    finally { setSalvando(false); }
  };
  return (
    <Modal title={novo ? 'Nova origem' : 'Editar origem'} size="sm" onClose={onClose}
      footer={(close) => <><ActionButton action="cancelar" size="md" label="Cancelar" onClick={() => close()} /><div style={{ flex: 1 }} /><ActionButton action="salvar" size="md" label={salvando ? 'Salvando…' : (novo ? 'Criar' : 'Salvar')} efeito={false} disabled={salvando} onClick={() => salvar(close)} /></>}>
      <div className="col" style={{ gap: 14 }}>
        <div><label className="label">Nome da origem *</label><input className="input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Instagram" autoFocus /></div>
        <div><label className="label">Descrição</label><textarea className="input" rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Opcional" /></div>
      </div>
    </Modal>
  );
}

function ConfirmExcluirOrigem({ origem, onClose, onDone }) {
  const [rm, setRm] = React.useState(false);
  const remover = async (close) => {
    setRm(true);
    try { await window.API.excluirOrigem(origem.id); window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Origem removida' }); onDone && onDone(); if (close) close(); else onClose && onClose(); }
    catch (e) { window.showToast && window.showToast({ tipo: 'erro', titulo: 'Não foi possível remover', descricao: (e && e.message) || 'Tente novamente.' }); }
    finally { setRm(false); }
  };
  return (
    <Modal title="Remover origem" size="sm" onClose={onClose}
      footer={(close) => <><ActionButton action="cancelar" size="md" label="Cancelar" onClick={() => close()} /><div style={{ flex: 1 }} /><ActionButton action="excluir" size="md" label={rm ? 'Removendo…' : 'Remover'} disabled={rm} onClick={() => remover(close)} /></>}>
      <div className="col" style={{ gap: 8 }}>
        <div>Remover a origem <strong>{origem.nome}</strong>?</div>
        <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>Esta ação não pode ser desfeita.</div>
      </div>
    </Modal>
  );
}

Object.assign(window, { DepartamentosPage, RoteamentoPage, OrigensPage });
