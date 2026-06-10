// departamentos-page.jsx — Cadastro de Departamentos (padrão de página de cadastro:
// cabeçalho + Voltar + botão Criar + lista + busca). Drawer cria/edita; confirma exclusão.

function DepartamentosPage() {
  const { back } = useStore();
  const [itens, setItens] = React.useState([]);
  const [loaded, setLoaded] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [drawer, setDrawer] = React.useState(null);   // { modo, inicial }
  const [excluir, setExcluir] = React.useState(null);

  const reload = React.useCallback(async () => {
    setLoaded(false);
    try {
      const r = await window.API.getDepartamentos();
      setItens(r.departamentos || []);
      if ((r.departamentos || []).length) skelRemember('departamentos', r.departamentos.length);
    } catch (e) { setItens([]); }
    finally { setLoaded(true); }
  }, []);
  React.useEffect(() => { reload(); }, [reload]);

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
  // Responsável: no novo é o usuário ATUAL (travado); ao editar/ver mostra quem criou.
  const responsavel = novo ? ((auth && (auth.nome || auth.email)) || '—') : ((inicial && inicial.responsavel) || '—');

  const salvar = async (close) => {
    if (ro) return;
    if (!nome.trim()) { window.showToast && window.showToast({ tipo: 'aviso', titulo: 'Campo obrigatório', descricao: 'Informe o nome do departamento.' }); return; }
    setSalvando(true);
    try {
      if (novo) await window.API.criarDepartamento({ nome, descricao, ativo });
      else await window.API.editarDepartamento(inicial.id, { nome, descricao, ativo });
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
        <div><label className="label">Responsável</label><input className="input" value={responsavel} disabled readOnly title="Definido automaticamente com o usuário que cria o cadastro." style={{ opacity: .8 }} /></div>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--type-sm)', fontWeight: 600 }}>Ativo</span>
          <Toggle on={ativo} onChange={(v) => { if (!ro) setAtivo(v); }} />
        </div>
      </div>
    </Drawer>
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

Object.assign(window, { DepartamentosPage });
