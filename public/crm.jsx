// crm.jsx — CRM Kanban: list, board, card detail

// Data de criação do card no formato "04 JUN 26" (dia, mês PT abreviado, ano 2 dígitos).
const CRM_MESES3 = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
function fmtCardDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mmm = CRM_MESES3[d.getMonth()];
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd} ${mmm} ${yy}`;
}

// Estilos do card do CRM (injetados uma vez):
//  • rodapé: força os 5 ícones ao MESMO tamanho (cada glifo tem override próprio no icons.jsx)
//  • linha de tags: ícone de overflow menor + popover das tags ocultas
(function injectCrmCardStyles() {
  if (typeof document === 'undefined' || document.getElementById('__crm_card_styles')) return;
  const s = document.createElement('style');
  s.id = '__crm_card_styles';
  s.textContent = `
    .crm-foot-ic svg { width: 20px !important; height: 20px !important; }
    .crm-tagmore svg { width: 16px !important; height: 16px !important; }
    /* ícone na frente dos campos do card — altura = 1em (proporcional à fonte) */
    .crm-fic { width: 1em !important; height: 1em !important; flex-shrink: 0; color: var(--text-faint); }
    .crm-tagpop { position: fixed; z-index: 1000; display: flex; flex-wrap: wrap; gap: 4px;
      max-width: 240px; padding: 8px; border-radius: 10px;
      background: var(--surface); border: 1px solid var(--border);
      box-shadow: 0 14px 36px -10px rgba(15,23,42,.30), 0 4px 10px -4px rgba(15,23,42,.12); }
  `;
  document.head.appendChild(s);
})();

function BoardCard({ board, onOpen, onEdit, onDelete }) {
  const [hover, setHover] = React.useState(false);
  const totalValue = (board.columns || []).reduce((s, c) => s + (c.value || 0), 0);
  const totalCards = (board.columns || []).reduce((s, c) => s + (c.count || 0), 0) || board.cards;
  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="card"
      style={{
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hover ?
        '0 14px 32px -12px rgba(15,23,42,.22), 0 4px 10px -4px rgba(15,23,42,.10)' :
        '0 1px 2px rgba(15,23,42,.04)',
        borderColor: hover ? `color-mix(in oklab, ${board.color} 40%, var(--border))` : undefined,
        transition: 'transform .18s ease, box-shadow .18s ease, border-color .18s ease'
      }}>
      <div style={{ height: 6, background: board.color }} />
      <div className="card-pad" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: 16 }}>
        <div className="row">
          <div className="h3" style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{board.name}</div>
          <span className="badge badge-accent" style={{ flexShrink: 0, marginLeft: 8 }}>{totalCards} cards</span>
        </div>
        <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4, height: 34, lineHeight: '17px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{board.desc}</div>

        {/* Área de colunas — altura FIXA sempre (em branco quando o funil não tem colunas) */}
        <div style={{ boxSizing: 'border-box', height: 106, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', overflow: 'hidden' }}>
          {board.columns && board.columns.length > 0 &&
          <>
            <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${board.columns.length}, 1fr)`,
            gap: 6,
            alignItems: 'end'
          }}>
              {board.columns.map((c, i) => {
              // Bar height scaled to its share of value (min 14, max 36)
              const maxVal = Math.max(...board.columns.map((x) => x.value || 0)) || 1;
              const h = 14 + Math.round((c.value || 0) / maxVal * 22);
              return (
                <div key={i} title={`${c.label} · ${c.count} cards · ${formatBRL(c.value)}`}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
                    <div style={{
                    width: 3, height: h, background: c.color, borderRadius: 2,
                    boxShadow: hover ? `0 0 0 2px color-mix(in oklab, ${c.color} 18%, transparent)` : 'none',
                    transition: 'box-shadow .18s ease'
                  }} />
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{c.count}</div>
                    <div style={{ fontSize: 9.5, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums', lineHeight: 1, whiteSpace: 'nowrap' }}>
                      {c.value >= 1000 ? `${(c.value / 1000).toFixed(c.value >= 10000 ? 0 : 1)}k` : c.value}
                    </div>
                  </div>);

            })}
            </div>
            <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 8, fontSize: 10.5, color: 'var(--text-faint)', letterSpacing: '.04em'
          }}>
              <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{board.columns.length} colunas</span>
              <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 12 }}>{formatBRL(totalValue)}</span>
            </div>
          </>
          }
        </div>

        <div className="row" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', gap: 10, fontSize: 'var(--type-xs)', color: 'var(--text-faint)' }}>
          <span className="row" style={{ gap: 4 }}><Ic name="clock" size={12} /> {board.updated}</span>
          <div className="spacer" />
          <button
            className="btn btn-ghost btn-icon"
            title="Editar funil"
            onClick={(e) => {e.stopPropagation();onEdit && onEdit();}}>
            <Ic name="edit" size={13} />
          </button>
          <button
            className="btn btn-ghost btn-icon crm-del-btn"
            title="Excluir funil"
            onClick={(e) => {e.stopPropagation();onDelete && onDelete();}}>
            <Ic name="trash" size={13} />
          </button>
        </div>
      </div>
    </div>);

}

function BoardFormModal({ mode, initial, onClose, onSave }) {
  const isEdit = mode === 'edit';
  const [name, setName] = React.useState(initial?.name || '');
  const [desc, setDesc] = React.useState(initial?.desc || '');
  const [color, setColor] = React.useState(initial?.color || null);
  return (
    <Modal
      title={isEdit ? `Editar funil · ${initial?.name || ''}` : 'Novo CRM'}
      onClose={onClose}
      size="sm"
      footer={(close) => <>
        <button className="btn fin-btn-back" onClick={() => close()}>Voltar</button>
        <button className="btn btn-save" disabled={!name.trim() || !color} onClick={() => close(() => onSave({ name: name.trim(), desc: desc.trim(), color }))}>
          {isEdit ? 'Salvar' : 'Criar'}
        </button>
      </>}>
      <div className="col" style={{ gap: 12 }}>
        <div>
          <label className="label">Nome</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Ex: Funil de vendas" />
        </div>
        <div>
          <label className="label">Descrição</label>
          <textarea className="input" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Para que serve este funil?" />
        </div>
        <div>
          <label className="label">Cor</label>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {PHASE_PALETTE.map((c) =>
            <ColorSwatch key={c} color={c} selected={color === c} onClick={() => setColor(c)} />
            )}
          </div>
        </div>
      </div>
    </Modal>);

}

// ── Skeletons (esqueleto de carregamento) ──
function SkelCard() {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Skeleton circle w={28} h={28} />
        <Skeleton w="60%" h={11} />
      </div>
      <Skeleton w="85%" h={9} />
      <Skeleton w="45%" h={9} />
    </div>);
}
function BoardSkeleton({ cols = 4 }) {
  return (
    <div className="scroll" style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '12px 16px', background: '#F1F4F8' }}>
      <div style={{ display: 'flex', gap: 10, height: '100%' }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} style={{ width: 325, minWidth: 278, flexShrink: 0, display: 'flex', flexDirection: 'column', padding: 8, borderRadius: 12, background: '#E6EBF1', height: '100%' }}>
            <Skeleton h={34} r={8} style={{ width: '100%' }} />
            <Skeleton w={90} h={14} style={{ margin: '8px auto 4px' }} />
            <Skeleton w={28} h={28} r={100} style={{ alignSelf: 'flex-end', marginBottom: 6 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
              {Array.from({ length: 3 + (i % 3) }).map((_, k) => <SkelCard key={k} />)}
            </div>
          </div>
        ))}
      </div>
    </div>);
}
function FunisSkeleton({ count = 3 }) {
  // Replica a estrutura exata do BoardCard (só os cards — vão DENTRO do grid real, herdando a responsividade)
  return (<>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Skeleton h={6} r={0} style={{ width: '100%' }} />
          <div className="card-pad" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: 16 }}>
            <div className="row" style={{ alignItems: 'center' }}>
              <Skeleton w="55%" h={18} /><div style={{ flex: 1 }} /><Skeleton w={54} h={20} r={6} />
            </div>
            <div style={{ height: 34, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skeleton w="95%" h={9} /><Skeleton w="78%" h={9} />
            </div>
            <div style={{ boxSizing: 'border-box', height: 106, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 44 }}>
                {[20, 36, 16, 30, 24].map((bh, k) => (
                  <div key={k} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <Skeleton w={3} h={bh} r={2} /><Skeleton w={16} h={9} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
                <Skeleton w={56} h={9} /><div style={{ flex: 1 }} /><Skeleton w={46} h={11} />
              </div>
            </div>
            <div className="row" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <Skeleton w="45%" h={10} />
            </div>
          </div>
        </div>
      ))}
    </>);
}

function CRMList() {
  const { setRoute, auth } = useStore();
  // CRM (funis) via cache por empresa (api.jsx): revisita instantânea + revalida no
  // fundo. boards === null = carregando (sem cache); erro vira lista vazia (como antes).
  const { data: boardsData, setData: setBoards, error: boardsError } = useCachedQuery(
    ['funis'],
    async () => {
      const r = await API.getFunis();
      const list = r.funis || [];
      if (list.length && typeof skelRemember === 'function') skelRemember('funis', list.length);
      return list;
    },
    { empresaId: auth.empresaId, initialData: null },
  );
  const boards = boardsError ? [] : boardsData; // erro -> trata como vazio (igual ao .catch antigo)
  const [showNew, setShowNew] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [deleting, setDeleting] = React.useState(null);

  const handleCreate = async (data) => {
    setShowNew(false);
    try { const r = await API.createFunil(data.name, data.desc, data.color); setBoards((bs) => [...(bs || []), r.funil]); window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Funil criado', descricao: data.name }); } catch (e) { window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao criar funil', descricao: (e && e.message) || 'Tente novamente.' }); }
  };
  const handleSaveEdit = async (data) => {
    const id = editing.id; setEditing(null);
    try { await API.updateFunil(id, data.name, data.desc, data.color); setBoards((bs) => (bs || []).map((b) => b.id === id ? { ...b, name: data.name, desc: data.desc, color: data.color } : b)); window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Funil atualizado', descricao: data.name }); } catch (e) { window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao salvar funil', descricao: (e && e.message) || 'Tente novamente.' }); }
  };
  const handleDelete = async (board) => {
    setDeleting(null);
    try { await API.deleteFunil(board.id); setBoards((bs) => (bs || []).filter((b) => b.id !== board.id)); window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Funil excluído', descricao: board.name }); } catch (e) { window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao excluir funil', descricao: (e && e.message) || 'Tente novamente.' }); }
  };

  return (
    <Page title="CRM Kanban" subtitle="Boards independentes para diferentes funis" actions={<FabNovo size="sm" label="Novo CRM" onClick={() => setShowNew(true)} />}>
      <style>{`.crm-del-btn:hover { color: #dc2626 !important; background: #fef2f2 !important; }`}</style>
      {(boards !== null && boards.length === 0) ?
      <EmptyState icon="reports" title="Nenhum funil ainda" desc="Crie seu primeiro CRM no botão acima." /> :
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 'var(--pad-3)' }}>
        {boards === null
        ? <FunisSkeleton count={skelCount('funis', 3)} />
        : boards.map((b) =>
        <BoardCard
          key={b.id}
          board={b}
          onOpen={() => setRoute('crm-board', b.id)}
          onEdit={() => setEditing(b)}
          onDelete={() => setDeleting(b)} />
        )}
      </div>}
      {showNew && <BoardFormModal mode="new" onClose={() => setShowNew(false)} onSave={handleCreate} />}
      {editing && <BoardFormModal mode="edit" initial={editing} onClose={() => setEditing(null)} onSave={handleSaveEdit} />}
      {deleting &&
      <Modal title="Excluir funil" onClose={() => setDeleting(null)} size="sm" footer={(close) => <>
          <button className="btn fin-btn-back" onClick={() => close()}>Voltar</button>
          <button className="btn btn-delete" onClick={() => close(() => handleDelete(deleting))}>Excluir</button>
        </>}>
          <div style={{ fontSize: 'var(--type-sm)' }}>Tem certeza que deseja excluir o funil <strong>{deleting.name}</strong>? Todas as fases e os cards deste funil também serão removidos. Esta ação não pode ser desfeita.</div>
        </Modal>
      }
    </Page>);

}

function CRMBoard() {
  const { setRoute, back, routeParam } = useStore();
  const funilId = routeParam; // id do funil vindo da lista
  const [openCard, setOpenCard] = React.useState(null);
  const [view, setView] = React.useState('funnel');
  const [chatCard, setChatCard] = React.useState(null);
  const [apptCard, setApptCard] = React.useState(null);
  const [contractCard, setContractCard] = React.useState(null);
  const [cards, setCards] = React.useState([]);
  const [phases, setPhases] = React.useState([]);
  const [funil, setFunil] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => { if (phases.length) skelRemember('crm-phases', phases.length); }, [phases]);

  const cardFromApi = (c) => ({ _id: 'c' + c.id, _cardId: c.id, clienteId: c.clienteId, phase: c.faseId, name: c.name, company: c.company, phone: c.phone, email: c.email, value: c.value, foto: c.foto, date: fmtCardDate(c.criadoEm), tags: c.tags || [], tipo: c.tipo || 'cliente', pinned: c.fixado === true, pinnedAt: c.fixado === true ? 1 : null });

  React.useEffect(() => {
    let alive = true;
    if (!funilId) { setLoading(false); return; }
    setLoading(true);
    API.getFunil(funilId)
      .then((r) => {
        if (!alive) return;
        setFunil(r.funil);
        setPhases((r.fases || []).map((f) => ({ id: f.id, label: f.label, color: f.color, pos: f.pos })));
        setCards((r.cards || []).map(cardFromApi));
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [funilId]);
  const [confirmDel, setConfirmDel] = React.useState(null);
  const [editPhase, setEditPhase] = React.useState(null);
  const [addingTo, setAddingTo] = React.useState(null);
  const [addingPhase, setAddingPhase] = React.useState(false);
  const [draggingId, setDraggingId] = React.useState(null);
  const [dragOverPhase, setDragOverPhase] = React.useState(null);
  const [dragPreview, setDragPreview] = React.useState(null); // { card, width, height, x, y, offsetX, offsetY }
  const phaseRefs = React.useRef({});

  const findPhaseAt = React.useCallback((clientX, clientY) => {
    for (const [pid, el] of Object.entries(phaseRefs.current)) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return pid;
    }
    return null;
  }, []);

  // Window listeners while dragging
  React.useEffect(() => {
    if (!draggingId) return;
    const onMove = (e) => {
      setDragPreview((p) => p ? { ...p, x: e.clientX, y: e.clientY } : p);
      const over = findPhaseAt(e.clientX, e.clientY);
      setDragOverPhase(over);
    };
    const onUp = (e) => {
      const over = findPhaseAt(e.clientX, e.clientY);
      if (over && draggingId) moveCardToPhase(draggingId, over);
      setDraggingId(null);
      setDragOverPhase(null);
      setDragPreview(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [draggingId, findPhaseAt]);

  const togglePin = (id) => setCards((cs) => cs.map((c) => {
    if (c._id !== id) return c;
    const nv = !c.pinned;
    if (c._cardId) API.toggleCardFixar(c._cardId, nv).catch(() => { window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao fixar card' }); }); // persiste no banco (best-effort)
    return { ...c, pinned: nv, pinnedAt: nv ? Date.now() : null };
  }));
  const removeCard = (id) => setCards((cs) => { const card = cs.find((c) => c._id === id); if (card && card._cardId) API.deleteCard(card._cardId).then(() => { window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Card excluído', descricao: card.name }); }).catch((e) => { window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao excluir card', descricao: (e && e.message) || 'Tente novamente.' }); }); return cs.filter((c) => c._id !== id); });
  const moveCardToPhase = (cardId, phaseId) => {
    // o phaseId do arrasto pode vir como string; normaliza p/ o id real da fase (número)
    const ph = phases.find((p) => String(p.id) === String(phaseId));
    const target = ph ? ph.id : phaseId;
    setCards((cs) => cs.map((c) => {
      if (c._id !== cardId) return c;
      if (c._cardId && c.phase !== target) API.moveCard(c._cardId, target).catch(() => { window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao mover card' }); });
      return { ...c, phase: target };
    }));
  };
  const renamePhase = (id, label) => { API.updateFase(id, { nome: label }).catch(() => {}); setPhases((ps) => ps.map((p) => p.id === id ? { ...p, label } : p)); };
  const reorderPhase = (id, newIndex) => setPhases((ps) => {
    const arr = [...ps];
    const i = arr.findIndex((p) => p.id === id);
    if (i < 0) return arr;
    const [item] = arr.splice(i, 1);
    arr.splice(Math.max(0, Math.min(newIndex, arr.length)), 0, item);
    return arr;
  });
  const addCard = async (phaseId, data) => {
    try {
      const r = await API.addCardCliente(phaseId, { nome: data.name, empresa: data.company, telefone: data.phone, email: data.email, valor: data.value, tags: data.tags || [], tipo: data.tipo || 'cliente' });
      setCards((cs) => [...cs, cardFromApi(r.card)]);
      window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Card criado', descricao: data.name || 'Novo card' });
    } catch (e) { window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao criar card', descricao: (e && e.message) || 'Tente novamente.' }); }
  };

  return (
    <div className="screen">
      <Topbar title={funil ? funil.name : (loading ? 'Carregando…' : 'Funil')} subtitle={funil ? (funil.desc || 'Funil de vendas') : ''} left={<button className="btn btn-ghost btn-icon" onClick={back}><Ic name="chevron-left" size={16} /></button>} right={
      <div className="row" style={{ gap: 6 }}>
          <FabNovo size="sm" label="Nova coluna" onClick={() => setAddingPhase(true)} />
          <div style={{ position: 'relative', display: 'flex', gap: 0, background: 'var(--surface-2)', borderRadius: 10, padding: 4, height: 38, backgroundColor: "rgb(244, 244, 244)" }}>
            <div style={{ position: 'absolute', top: 4, left: 4 + ['funnel', 'list', 'chart'].indexOf(view) * 32, width: 32, height: 30, background: '#BFE6CE', borderRadius: 6, transition: 'left .22s cubic-bezier(.4,.0,.2,1)', pointerEvents: 'none' }} />
            {[
          { k: 'funnel', icon: 'funnel', title: 'Funil (kanban)' },
          { k: 'list', icon: 'list', title: 'Lista' },
          { k: 'chart', icon: 'reports', title: 'Gráfico' }].
          map((b) =>
          <button key={b.k} onClick={() => setView(b.k)} title={b.title} className="btn btn-icon" style={{ ...{ position: 'relative', height: 30, width: 32, padding: 0, background: 'transparent', border: 'none', boxShadow: 'none', color: view === b.k ? 'var(--text)' : 'var(--text-muted)', transition: 'color .18s ease' }, color: "rgb(46, 62, 87)" }}><Ic name={b.icon} size={15} /></button>
          )}
          </div>
        </div>
      } />
      <div key={view} className="page-enter" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {view === 'funnel' && loading && <BoardSkeleton cols={skelCount('crm-phases', 4)} />}
      {view === 'funnel' && !loading &&
        <div
          className="scroll" style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '12px 16px', background: '#F1F4F8', scrollBehavior: 'smooth' }}
          onWheel={(e) => {
            // If cursor is over a column, let the column handle its own vertical scroll
            // and don't drive the horizontal scroll in parallel.
            if (e.target.closest && e.target.closest('.phase-column')) return;
            if (e.deltaX !== 0) return;
            e.currentTarget.scrollLeft += e.deltaY * 0.6;
          }}>
        
        <div style={{ display: 'flex', gap: 10, height: '100%' }}>
          {phases.map((ph) => {
              const phaseCards = cards.filter((c) => c.phase === ph.id);
              const pinned = phaseCards.filter((c) => c.pinned).sort((a, b) => (b.pinnedAt || 0) - (a.pinnedAt || 0));
              const rest = phaseCards.filter((c) => !c.pinned);
              const ordered = [...pinned, ...rest];
              const total = phaseCards.reduce((s, c) => s + (c.value || 0), 0);
              const isOver = String(dragOverPhase) === String(ph.id);
              return (
                <div
                  key={ph.id}
                  ref={(el) => {phaseRefs.current[ph.id] = el;}}
                  className="phase-column"
                  style={{
                    minWidth: 278, flexShrink: 0,
                    display: 'flex', flexDirection: 'column',
                    padding: 8,
                    borderRadius: 12,
                    background: isOver ? `color-mix(in oklab, ${ph.color} 14%, #E6EBF1)` : '#E6EBF1',
                    border: isOver ? `2px dashed ${ph.color}` : '2px dashed transparent',
                    transition: 'background .15s ease, border-color .15s ease',
                    height: '100%',
                    minHeight: 0, width: "325px"
                  }}>
                
                {/* Header pill */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: ph.color, color: '#fff',
                    padding: '8px 12px', borderRadius: 8,
                    boxShadow: '0 2px 6px -2px rgba(15,23,42,.18)',
                    fontWeight: 700, letterSpacing: '.04em', fontSize: 12,
                    flexShrink: 0
                  }}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ph.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: "18px" }}>{phaseCards.length}</span>
                    <button
                        onClick={() => setEditPhase(ph)}
                        title="Editar fase"
                        style={{ background: 'rgba(255,255,255,.18)', border: 'none', cursor: 'default', color: '#fff', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .12s ease', width: "24px", height: "24px" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,.32)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,.18)'}>
                      
                      <Ic name="edit" size={11} />
                    </button>
                  </div>
                </div>

                {/* Total value */}
                <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, color: 'var(--text)', padding: '6px 0 4px', flexShrink: 0 }}>{formatBRL(total)}</div>

                {/* Add card button — retangular (36px, largura do cartão); no hover o contorno + (+) ficam na cor da coluna e o (+) gira 180° */}
                <div style={{ flexShrink: 0, marginBottom: 6 }}>
                  <button className="crm-addcard" style={{ '--col': ph.color }} onClick={() => setAddingTo(ph)} title="Adicionar card" aria-label="Adicionar card">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5.5v13M5.5 12h13" /></svg>
                  </button>
                </div>

                {/* Cards (scrollable area) */}
                <div className="col phase-cards" style={{ gap: 8, overflowY: 'auto', overflowX: 'hidden', flex: 1, minHeight: 0, paddingRight: 2, paddingTop: 12, scrollBehavior: 'smooth' }}>
                  {ordered.map((c) =>
                    draggingId === c._id && dragPreview ?
                    <div key={c._id} style={{
                      height: dragPreview.height,
                      borderRadius: 8,
                      border: '2px dashed var(--border-strong)',
                      background: 'color-mix(in oklab, var(--surface-2) 70%, transparent)',
                      flexShrink: 0
                    }} /> :
                    <CRMCard
                      key={c._id}
                      card={c}
                      phaseColor={ph.color}
                      isDragging={false}
                      onStartDrag={(info) => {
                        setDraggingId(c._id);
                        setDragPreview({
                          card: c,
                          phaseColor: ph.color,
                          width: info.width,
                          height: info.height,
                          offsetX: info.offsetX,
                          offsetY: info.offsetY,
                          x: info.x,
                          y: info.y
                        });
                      }}
                      onOpen={() => setOpenCard(c)}
                      onChat={() => setChatCard(c)}
                      onAppointment={() => setApptCard(c)}
                      onContract={() => setContractCard(c)}
                      onPin={() => togglePin(c._id)}
                      onDelete={() => setConfirmDel(c)} />
                    )}
                </div>
              </div>);

            })}
        </div>
      </div>
        }
      {view === 'list' && window.CRMListView &&
        <window.CRMListView
          phases={phases}
          cards={cards}
          onOpenCard={(c) => setOpenCard(c)}
          onChat={(c) => setChatCard(c)}
          onAppointment={(c) => setApptCard(c)}
          onTogglePin={(id) => togglePin(id)}
          onDelete={(id) => setConfirmDel(cards.find((x) => x._id === id))} />
        }
      {view === 'chart' && window.CRMChartView &&
        <window.CRMChartView phases={phases} cards={cards} />
        }
      </div>
      {openCard && <CRMCardDetail
        card={cards.find((c) => c._id === openCard._id) || openCard}
        onClose={() => setOpenCard(null)}
        phases={phases}
        onMovePhase={moveCardToPhase} />}
      {apptCard && window.NewAppointment &&
      <window.NewAppointment
        onClose={() => setApptCard(null)}
        defaultParticipante={{ name: apptCard.name, clienteId: apptCard.clienteId || null, phone: apptCard.phone || '', tipo: apptCard.tipo || null }}
        onSave={(dto) => { API.createAppt(dto).catch(() => {}); setApptCard(null); }}
        defaultResponsible={apptCard.attendant && apptCard.attendant !== '—' && apptCard.attendant !== 'Agente IA' ? apptCard.attendant : ''} />}
      {chatCard && window.QueuePreviewDrawer && (() => {
        const chatChannel = chatCard.channel || 'whatsapp';
        const chatConv = {
          id: chatCard._id || `crm-${chatCard.name}`,
          client: chatCard.name,
          avatar: (chatCard.name || '').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase(),
          channel: chatChannel,
          status: 'em-andamento',
          lastTime: chatCard.date || 'agora',
          tag: chatCard.tag || 'PROSPECT',
          preview: chatCard.lastMessage || `Quero saber mais sobre ${chatCard.company || 'a proposta'}.`,
          unread: 0,
          handler: 'human',
          phone: chatCard.phone,
          email: chatCard.email,
          aiSummary: chatCard.aiNote || `Card no CRM · ${chatCard.company || ''}. Valor estimado: R$ ${(chatCard.value || 0).toLocaleString('pt-BR')}.`,
          _wait: 0,
          reason: 'Cliente pediu humano',
          priority: 'media',
          _summary: chatCard.aiNote || `Card no CRM · ${chatCard.company || ''}. Valor estimado: R$ ${(chatCard.value || 0).toLocaleString('pt-BR')}.`
        };
        const QPD = window.QueuePreviewDrawer;
        return (
          <QPD
            conv={chatConv}
            reasonColor={{ c: 'var(--hue-blue)', ic: 'user' }}
            onClose={() => setChatCard(null)}
            onAssume={() => {}}
            onReturnConfirm={() => setChatCard(null)}
            onAssignConfirm={() => setChatCard(null)}
            onCloseConfirm={() => setChatCard(null)} />);


      })()}
      {dragPreview && ReactDOM.createPortal(
        <CRMCard
          card={dragPreview.card}
          phaseColor={dragPreview.phaseColor}
          floating={true}
          floatingX={dragPreview.x - dragPreview.offsetX}
          floatingY={dragPreview.y - dragPreview.offsetY}
          floatingWidth={dragPreview.width} />,
        document.body
      )}
      {confirmDel &&
      <Modal title="Excluir card" onClose={() => setConfirmDel(null)} size="sm" footer={(close) => <>
          <button className="btn fin-btn-back" onClick={() => close()}>Voltar</button>
          <button className="btn btn-delete" onClick={() => close(() => removeCard(confirmDel._id))}>Excluir</button>
        </>}>
          <div style={{ fontSize: 'var(--type-sm)' }}>Tem certeza que deseja excluir o card de <strong>{confirmDel.name}</strong>? Esta ação não pode ser desfeita.</div>
        </Modal>
      }
      {editPhase && <EditPhaseModal phase={editPhase} phases={phases} onSave={(label, idx, color) => {API.updateFase(editPhase.id, { nome: label, cor_funil: color }).then(() => { window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Fase atualizada', descricao: label }); }).catch((e) => { window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao salvar fase', descricao: (e && e.message) || 'Tente novamente.' }); });setPhases((ps) => ps.map((p) => p.id === editPhase.id ? { ...p, label, color } : p));reorderPhase(editPhase.id, idx);setEditPhase(null);}} onDelete={() => {API.deleteFase(editPhase.id).then(() => { window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Fase excluída', descricao: editPhase.label }); }).catch((e) => { window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao excluir fase', descricao: (e && e.message) || 'Tente novamente.' }); });setPhases((ps) => ps.filter((p) => p.id !== editPhase.id));setCards((cs) => cs.filter((c) => c.phase !== editPhase.id));setEditPhase(null);}} onClose={() => setEditPhase(null)} />}
      {addingPhase && <NewPhaseModal phases={phases} onSave={async (p, idx) => {setAddingPhase(false);try {const r = await API.addFase(funilId, p.label, p.color);setPhases((ps) => {const arr = [...ps];arr.splice(idx, 0, { id: r.fase.id, label: r.fase.label, color: r.fase.color, pos: r.fase.pos });return arr;});window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Coluna criada', descricao: p.label });} catch (e) { window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao criar coluna', descricao: (e && e.message) || 'Tente novamente.' }); }}} onClose={() => setAddingPhase(false)} />}
      {addingTo && <AddCardModal phase={addingTo} onSave={(d) => {addCard(addingTo.id, d);setAddingTo(null);}} onClose={() => setAddingTo(null)} />}
      {contractCard && <NewContractDrawer card={contractCard} onClose={() => setContractCard(null)} />}
    </div>);

}

const PHASE_PALETTE = ['#EC2B8E', '#F43F5E', '#FB923C', '#FACC15', '#22C55E', '#14B8A6', '#3B82F6', '#1D4ED8', '#7C3AED', '#9333EA'];

function ColorSwatch({ color, selected, onClick }) {
  const [hover, setHover] = React.useState(false);
  const active = selected || hover;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={color}
      style={{
        width: 34, height: 34, padding: 0, borderRadius: '50%',
        border: `3px solid ${active ? `color-mix(in oklab, ${color} 28%, transparent)` : 'transparent'}`,
        background: 'transparent', cursor: 'default',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'border-color .12s ease',
        flexShrink: 0
      }}>
      <span style={{
        width: 22, height: 22, borderRadius: '50%', background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
      }}>
        {active && <Ic name="check" size={14} />}
      </span>
    </button>);

}

function NewPhaseModal({ phases, onSave, onClose }) {
  const [label, setLabel] = React.useState('');
  const [color, setColor] = React.useState(null);
  const [idx, setIdx] = React.useState(phases.length);
  return (
    <Modal title="Nova coluna" onClose={onClose} size="sm" footer={<>
      <button className="btn fin-btn-back" onClick={onClose}>Voltar</button>
      <button className="btn btn-primary" disabled={!label.trim() || !color} onClick={() => onSave({ id: `ph-${Date.now()}`, label: label.toUpperCase(), color, value: 0 }, idx)}>Criar</button>
    </>}>
      <div className="col" style={{ gap: 12 }}>
        <div>
          <label className="label">Nome da coluna/fase</label>
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} autoFocus placeholder="Ex: NEGOCIAÇÃO" />
        </div>
        <div>
          <label className="label">Posição no funil</label>
          <select className="input" value={idx} onChange={(e) => setIdx(parseInt(e.target.value, 10))}>
            {phases.map((p, i) =>
            <option key={p.id} value={i}>{i + 1}º — antes de {p.label}</option>
            )}
            <option value={phases.length}>{phases.length + 1}º — no final{phases.length > 0 ? ` (depois de ${phases[phases.length - 1].label})` : ''}</option>
          </select>
        </div>
        <div>
          <label className="label">Cor</label>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {PHASE_PALETTE.map((c) =>
            <ColorSwatch key={c} color={c} selected={color === c} onClick={() => setColor(c)} />
            )}
          </div>
        </div>
      </div>
    </Modal>);

}

function EditPhaseModal({ phase, phases, onSave, onDelete, onClose }) {
  const currentIdx = phases.findIndex((p) => p.id === phase.id);
  const [label, setLabel] = React.useState(phase.label);
  const [idx, setIdx] = React.useState(currentIdx);
  const [color, setColor] = React.useState(phase.color);
  const [confirmDel, setConfirmDel] = React.useState(false);
  return (
    <Modal title="Editar fase" onClose={onClose} size="sm" footer={(close) => <>
      <button className="btn btn-delete-soft" onClick={() => setConfirmDel(true)} style={{ marginRight: 'auto' }}><Ic name="trash" size={13} /> Excluir</button>
      <button className="btn fin-btn-back" onClick={() => close()}>Voltar</button>
      <button className="btn btn-save" onClick={() => close(() => onSave(label, idx, color))}>Salvar</button>
    </>}>
      <div className="col" style={{ gap: 12 }}>
        <div>
          <label className="label">Nome da fase</label>
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="label">Posição no funil</label>
          <select className="input" value={idx} onChange={(e) => setIdx(parseInt(e.target.value, 10))}>
            {phases.map((p, i) => <option key={p.id} value={i}>{i + 1}º — {i === currentIdx ? 'posição atual' : `antes de ${phases[i === currentIdx ? i + 1 : i]?.label || 'fim'}`}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Cor</label>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {PHASE_PALETTE.map((c) =>
            <ColorSwatch key={c} color={c} selected={color === c} onClick={() => setColor(c)} />
            )}
          </div>
        </div>
      </div>
      {confirmDel &&
      <Modal title="Excluir fase" onClose={() => setConfirmDel(false)} size="sm" footer={(close) => <>
          <button className="btn fin-btn-back" onClick={() => close()}>Voltar</button>
          <button className="btn btn-delete" onClick={() => close(() => { onDelete && onDelete(); })}>Excluir fase</button>
        </>}>
          <div style={{ fontSize: 'var(--type-sm)' }}>Tem certeza que deseja excluir a fase <strong>{phase.label}</strong>? Os cards desta fase também serão removidos. Esta ação não pode ser desfeita.</div>
        </Modal>
      }
    </Modal>);

}

const CRM_TAG_PRESETS = [
{ label: 'VIP', color: '#A855F7' },
{ label: 'Quente', color: '#EF4444' },
{ label: 'Frio', color: '#0EA5E9' },
{ label: 'Indicação', color: '#10B981' },
{ label: 'Reagendar', color: '#F59E0B' },
{ label: 'Demonstração agendada', color: '#6366F1' },
{ label: 'GTM', color: '#EC4899' },
{ label: 'Negociação', color: '#14B8A6' }];


function TagPicker({ value = [], onChange, presets = CRM_TAG_PRESETS }) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const wrapRef = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const click = (e) => {if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);};
    document.addEventListener('mousedown', click);
    return () => document.removeEventListener('mousedown', click);
  }, [open]);
  const has = (label) => value.some((t) => t.label === label);
  const toggle = (t) => onChange(has(t.label) ? value.filter((x) => x.label !== t.label) : [...value, t]);
  const remove = (label) => onChange(value.filter((x) => x.label !== label));
  const addCustom = () => {
    const v = draft.trim();
    if (!v || has(v)) {setDraft('');return;}
    const palette = ['#A855F7', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899', '#14B8A6'];
    onChange([...value, { label: v, color: palette[value.length % palette.length] }]);
    setDraft('');
  };
  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div className="input" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 40, alignItems: 'center', cursor: 'text', paddingTop: 6, paddingBottom: 6 }} onClick={() => setOpen(true)}>
        {value.length === 0 && <span style={{ color: 'var(--text-faint)', fontSize: 'var(--type-sm)' }}>Selecione ou digite uma tag...</span>}
        {value.map((t) =>
        <span key={t.label} style={{
          fontSize: 11, fontWeight: 600, textTransform: 'uppercase', padding: '3px 8px 3px 10px', borderRadius: 12,
          background: `color-mix(in oklab, ${t.color} 14%, #fff)`, color: t.color,
          border: `1px solid color-mix(in oklab, ${t.color} 30%, #fff)`,
          display: 'inline-flex', alignItems: 'center', gap: 6
        }}>
            {t.label}
            <span onClick={(e) => {e.stopPropagation();remove(t.label);}} style={{ cursor: 'pointer', fontSize: 13, lineHeight: 1, opacity: .7 }}>×</span>
          </span>
        )}
        <span style={{ flex: 1, minWidth: 80 }} />
        <Ic name="chevron-down" size={12} style={{ color: 'var(--text-faint)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </div>
      {open &&
      <div style={{
        position: 'absolute', zIndex: 1000, top: 'calc(100% + 4px)', left: 0, right: 0,
        background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 10,
        boxShadow: '0 12px 32px rgba(0,0,0,.18)', padding: 8, animation: 'fmtFadeIn .15s ease-out', maxHeight: 280, overflowY: 'auto'
      }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '.06em', padding: '4px 6px 6px' }}>SUGESTÕES</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 4px 8px' }}>
            {presets.map((t) => {
            const on = has(t.label);
            return (
              <span key={t.label} onClick={() => toggle(t)} style={{
                fontSize: 11, fontWeight: 600, textTransform: 'uppercase', padding: '4px 10px', borderRadius: 12, cursor: 'pointer',
                background: on ? t.color : `color-mix(in oklab, ${t.color} 10%, #fff)`,
                color: on ? '#fff' : t.color,
                border: `1px solid ${on ? t.color : `color-mix(in oklab, ${t.color} 30%, #fff)`}`,
                transition: 'all .12s'
              }}>{on ? '✓ ' : ''}{t.label}</span>);

          })}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, display: 'flex', gap: 6 }}>
            <input className="input" placeholder="Nova tag personalizada..." value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => {if (e.key === 'Enter') {e.preventDefault();addCustom();}}} style={{ flex: 1 }} />
            <button className="btn btn-sm" onClick={addCustom}>Adicionar</button>
          </div>
        </div>
      }
    </div>);

}

function AddCardModal({ phase, onSave, onClose }) {
  const [name, setName] = React.useState('');
  const [company, setCompany] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [value, setValue] = React.useState('');
  const [tipo, setTipo] = React.useState('cliente');
  const [tags, setTags] = React.useState([]);
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
  return (
    <Modal title={`Novo card · ${phase.label}`} onClose={onClose} size="md" footer={(close) => <>
      <button className="btn fin-btn-back" onClick={() => close()}>Voltar</button>
      <button className="btn btn-save" onClick={() => close(() => onSave({ name: name || 'Sem nome', company, phone, email, value: Mask.moneyToNumber(value), tipo, tags, date: today, ai: false }))}>Adicionar</button>
    </>}>
      <div className="col" style={{ gap: 12 }}>
        <div className="row" style={{ gap: 10 }}>
          <div style={{ flex: 1 }}><label className="label">Nome</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Ex: João Silva" /></div>
          <div style={{ flex: 1 }}><label className="label">Empresa</label><input className="input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Ex: ACME LTDA" /></div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <div style={{ flex: 1 }}><label className="label">Telefone</label><PhoneInput value={phone} onChange={setPhone} /></div>
          <div style={{ flex: 1 }}><label className="label">E-mail</label><EmailInput value={email} onChange={setEmail} placeholder="cliente@empresa.com" /></div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <div style={{ flex: 1 }}><label className="label">Valor estimado</label><MoneyInput value={value} onChange={(v) => setValue(v)} /></div>
          <div style={{ flex: 1 }}>
            <label className="label">Tipo de contato</label>
            <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="cliente">Cliente</option>
              <option value="lead">Lead</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Tags</label>
          <TagPicker value={tags} onChange={setTags} />
        </div>
        <div style={{ fontSize: 'var(--type-xs)', color: 'var(--text-faint)' }}>Card será adicionado à fase <strong style={{ color: phase.color }}>{phase.label}</strong> com data {today}.{tipo === 'lead' ? ' Também será cadastrado na página de Leads.' : ''}</div>
      </div>
    </Modal>);

}

function CRMCard({ card, phaseColor, isDragging, floating, floatingX, floatingY, floatingWidth, onStartDrag, onOpen, onPin, onDelete, onChat, onAppointment, onContract }) {
  const [hover, setHover] = React.useState(false);
  const stop = (e, fn) => {e.stopPropagation();fn && fn();};
  const wrapRef = React.useRef(null);
  const downRef = React.useRef(null);

  // Linha de tags: mantém 1 linha só e detecta overflow p/ mostrar o ícone "mais tags".
  const tagsRef = React.useRef(null);
  const [tagOverflow, setTagOverflow] = React.useState(false);
  const [tagPop, setTagPop] = React.useState(null); // {top,left} do popover, ou null
  React.useLayoutEffect(() => {
    const el = tagsRef.current;
    if (!el) return;
    const check = () => setTagOverflow(el.scrollWidth - el.clientWidth > 1);
    check();
    let ro;
    if (window.ResizeObserver) { ro = new ResizeObserver(check); ro.observe(el); }
    return () => { if (ro) ro.disconnect(); };
  }, [card.tags]);
  React.useEffect(() => {
    if (!tagPop) return;
    const close = () => setTagPop(null);
    window.addEventListener('click', close);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => { window.removeEventListener('click', close); window.removeEventListener('resize', close); window.removeEventListener('scroll', close, true); };
  }, [tagPop]);
  const openTagPop = (e) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    setTagPop({ top: r.bottom + 4, left: Math.max(8, Math.min(r.left, window.innerWidth - 252)) });
  };

  const handleMouseDown = (e) => {
    if (floating) return;
    if (e.button !== 0) return;
    if (e.target.closest('button')) return;
    downRef.current = { x: e.clientX, y: e.clientY, started: false };
    const onMove = (mv) => {
      if (!downRef.current) return;
      const dx = mv.clientX - downRef.current.x;
      const dy = mv.clientY - downRef.current.y;
      if (!downRef.current.started && Math.hypot(dx, dy) > 5) {
        downRef.current.started = true;
        const rect = wrapRef.current.getBoundingClientRect();
        onStartDrag && onStartDrag({
          card,
          width: rect.width,
          height: rect.height,
          offsetX: rect.width / 2,
          offsetY: rect.height / 2,
          x: mv.clientX,
          y: mv.clientY
        });
      }
    };
    const onUp = (up) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      const wasDrag = downRef.current && downRef.current.started;
      const startX = downRef.current ? downRef.current.x : 0;
      const startY = downRef.current ? downRef.current.y : 0;
      downRef.current = null;
      if (!wasDrag) {
        const dx = up.clientX - startX;
        const dy = up.clientY - startY;
        if (Math.hypot(dx, dy) < 5) onOpen && onOpen();
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    e.preventDefault();
  };
  const iconBtn = (name, title, onClick, tint, sz) =>
  <button
    className="crm-foot-ic"
    onClick={(e) => stop(e, onClick)}
    title={title}
    style={{
      width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'default',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'transparent', color: tint || 'var(--text-faint)',
      transition: 'background .12s ease, color .12s ease',
      padding: 0
    }}
    onMouseEnter={(e) => {e.currentTarget.style.background = 'var(--surface-2)';e.currentTarget.style.color = tint || 'var(--text)';}}
    onMouseLeave={(e) => {e.currentTarget.style.background = 'transparent';e.currentTarget.style.color = tint || 'var(--text-faint)';}}>
    
      <Ic name={name} size={sz || 15} />
    </button>;

  return (
    <div
      ref={wrapRef}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => !floating && setHover(true)}
      onMouseLeave={() => !floating && setHover(false)}
      style={floating ? {
        position: 'fixed',
        top: 0, left: 0,
        width: floatingWidth,
        transform: `translate(${floatingX}px, ${floatingY}px) rotate(2.5deg)`,
        pointerEvents: 'none',
        zIndex: 9999,
        background: card.pinned ? '#E3F3E5' : 'var(--surface)',
        color: 'var(--text)',
        padding: '12px 14px 10px 16px',
        cursor: 'grabbing',
        boxShadow: '0 24px 48px -8px rgba(15,23,42,.40), 0 8px 16px -8px rgba(15,23,42,.22)',
        opacity: 1,
        transition: 'none',
        border: card.pinned ? '1px solid #16A872' : '1px solid var(--border)',
        borderLeftWidth: 2,
        borderLeftColor: card.pinned ? '#16A872' : 'var(--border-strong)',
        overflow: 'visible', borderRadius: '8px'
      } : {
        position: 'relative',
        flexShrink: 0,
        background: card.pinned ? '#E3F3E5' : 'var(--surface)',
        color: 'var(--text)',

        padding: '12px 14px 10px 16px',
        cursor: 'grab',
        boxShadow: hover ? card.pinned ? '0 8px 22px -10px rgba(22,168,114,.30)' : '0 8px 22px -10px rgba(15,23,42,.18)' : '0 1px 2px rgba(15,23,42,.04)',
        transform: hover ? 'translateY(-1px)' : 'translateY(0)',
        opacity: 1,
        transition: 'transform .15s ease, box-shadow .15s ease, border-color .15s ease, background .15s ease',
        border: card.pinned ? '1px solid #16A872' : '1px solid var(--border)',
        borderLeftWidth: 2,
        borderLeftColor: card.pinned ? '#16A872' : 'var(--border-strong)',
        overflow: 'visible', borderRadius: "8px",
        userSelect: 'none'
      }}>

      {/* Header: name + date */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 13, minWidth: 0 }}>
            <Ic name="user" className="crm-fic" style={{ marginLeft: -2 }} />
            <span style={{ fontWeight: 700, letterSpacing: '.02em', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}>{card.name}</span>
          </div>
          {/* empresa/telefone/e-mail SEMPRE renderizam (ícone fixo; sem dado fica só o
              ícone) -> todos os cartões ficam com a MESMA altura. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, marginTop: 3, minWidth: 0 }}>
            <Ic name="building" className="crm-fic" />
            <span style={{ color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.company || ''}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, marginTop: 2, minWidth: 0 }}>
            <Ic name="phone" className="crm-fic" />
            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.phone || ''}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, marginTop: 2, minWidth: 0 }}>
            <Ic name="mail" className="crm-fic" />
            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.email || ''}</span>
          </div>
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.04em', color: 'var(--text-faint)', whiteSpace: 'nowrap', paddingTop: 1, flexShrink: 0 }}>{card.date}</div>
      </div>

      {/* Tags — altura fixa (igual com/sem tag), sempre 1 linha. Ícone de overflow
          fica invisível e só aparece quando as tags não cabem; clicando, abre o popover. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, marginBottom: 2, height: 24 }}>
        <div ref={tagsRef} style={{ display: 'flex', flexWrap: 'nowrap', gap: 4, flex: 1, minWidth: 0, overflow: 'hidden', alignItems: 'center' }}>
          {(card.tags || []).map((t, i) =>
          <span key={i} style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
            padding: '2px 6px', borderRadius: 999,
            background: `${t.color}1A`, color: t.color,
            border: `1px solid ${t.color}33`,
            whiteSpace: 'nowrap', flexShrink: 0
          }}>{t.label}</span>
          )}
        </div>
        <button
          className="crm-tagmore"
          onClick={openTagPop}
          title="Mostrar todas as tags"
          style={{ background: 'transparent', border: 'none', cursor: 'default', color: 'var(--text-faint)', padding: '2px 4px', display: 'flex', alignItems: 'center', borderRadius: 6, transition: 'background .12s ease, color .12s ease', flexShrink: 0, visibility: tagOverflow ? 'visible' : 'hidden' }}
          onMouseEnter={(e) => {e.currentTarget.style.background = 'var(--surface-2)';e.currentTarget.style.color = 'var(--text)';}}
          onMouseLeave={(e) => {e.currentTarget.style.background = 'transparent';e.currentTarget.style.color = 'var(--text-faint)';}}>
          <Ic name="more" size={16} />
        </button>
      </div>
      {tagPop && ReactDOM.createPortal(
        <div className="crm-tagpop" style={{ top: tagPop.top, left: tagPop.left }} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          {(card.tags || []).map((t, i) =>
          <span key={i} style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
            padding: '2px 6px', borderRadius: 999,
            background: `${t.color}1A`, color: t.color,
            border: `1px solid ${t.color}33`,
            whiteSpace: 'nowrap'
          }}>{t.label}</span>
          )}
        </div>,
        document.body)
      }

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border)', margin: '2px -4px 8px' }} />

      {/* Footer: 5 icons left-aligned with 4px gap, value right */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: -6, gap: "0px" }}>
          {iconBtn('chat', 'Bate-papo', onChat)}
          {iconBtn('file-text', 'Novo contrato', onContract)}
          {iconBtn(card.pinned ? 'pin-off' : 'pin', card.pinned ? 'Desafixar' : 'Fixar', onPin, card.pinned ? '#16A872' : null, 18)}
          {iconBtn('agenda', 'Agendar', onAppointment)}
          {iconBtn('trash', 'Excluir', onDelete)}
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-700)', whiteSpace: 'nowrap' }}>{formatBRL(card.value)}</span>
      </div>
    </div>);

}

function LeadProfileLeft({ data, tags = [], editing, setField, canEdit, saving, onEdit, onCancel, onSave, subtab, setSubtab }) {
  const SEG_OPTS = [
    { value: 'bronze', label: 'Bronze' }, { value: 'prata', label: 'Prata' },
    { value: 'ouro', label: 'Ouro' }, { value: 'platina', label: 'Platina' }, { value: 'diamante', label: 'Diamante' },
  ];
  const estagio = data.estagio === 'cliente' ? 'cliente' : 'lead';
  const fmtMoney = (v) => (v != null && v !== '') ? 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

  // Renderiza um campo: texto (leitura) ou input/select/textarea (edição).
  const fieldRow = (label, k, opts = {}) => {
    const val = data[k];
    let control;
    if (editing) {
      if (opts.options) {
        control = (
          <select className="input" style={{ height: 32, fontSize: 12 }} value={val || ''} onChange={(e) => setField(k, e.target.value)}>
            {opts.placeholder && <option value="">{opts.placeholder}</option>}
            {opts.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>);
      } else if (opts.textarea) {
        control = <textarea className="input" rows={3} style={{ fontSize: 12 }} value={val || ''} onChange={(e) => setField(k, e.target.value)} placeholder={opts.placeholder} />;
      } else {
        control = <input className="input" style={{ height: 32, fontSize: 12 }} value={val || ''} onChange={(e) => setField(k, e.target.value)} placeholder={opts.placeholder} />;
      }
    } else {
      control = <div style={{ fontSize: 13, color: val ? 'var(--text)' : 'var(--text-faint)' }}>{val || '—'}</div>;
    }
    return <div key={k}><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{label}</div>{control}</div>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid var(--border)', background: 'var(--surface)' }}>
      {/* Avatar + estágio + ações */}
      <div style={{ background: 'linear-gradient(180deg, #DCEEFE 0%, #EAF4FE 100%)', padding: '22px 20px 16px', position: 'relative' }}>
        <div style={{ borderRadius: '50%', background: 'rgba(255,255,255,.85)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 600, color: '#0EA5E9', boxShadow: '0 4px 14px rgba(14,165,233,.12)', width: 80, height: 80 }}>
          {(data.nome || '?').charAt(0).toUpperCase()}
        </div>
        <div style={{ textAlign: 'center', marginTop: 12, fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>{data.nome || '—'}</div>

        {tags.length > 0 && !editing &&
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', marginTop: 8 }}>
            {tags.map((t, i) =>
              <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: `color-mix(in oklab, ${t.color} 14%, #fff)`, color: t.color, fontWeight: 600, textTransform: 'uppercase', border: `1px solid color-mix(in oklab, ${t.color} 30%, transparent)` }}>{t.label}</span>)}
          </div>}

        {/* Estágio (lead/cliente) */}
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          {editing ?
            <select className="input" style={{ height: 30, fontSize: 12, width: 170, margin: '0 auto' }} value={estagio} onChange={(e) => setField('estagio', e.target.value)}>
              <option value="lead">Lead</option>
              <option value="cliente">Cliente</option>
            </select> :
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', padding: '3px 12px', borderRadius: 999,
              background: estagio === 'cliente' ? 'color-mix(in oklab, #10b981 16%, #fff)' : 'color-mix(in oklab, #f59e0b 16%, #fff)',
              color: estagio === 'cliente' ? '#047857' : '#b45309',
              border: '1px solid ' + (estagio === 'cliente' ? 'color-mix(in oklab, #10b981 30%, transparent)' : 'color-mix(in oklab, #f59e0b 30%, transparent)') }}>
              {estagio === 'cliente' ? 'Cliente' : 'Lead'}
            </span>}
        </div>

        {canEdit &&
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
            {editing ?
              <>
                <button className="btn btn-sm" style={{ background: '#fff' }} onClick={onCancel} disabled={saving}>Cancelar</button>
                <button className="btn btn-sm btn-primary" style={{ background: '#0EA5E9', borderColor: '#0EA5E9' }} onClick={onSave} disabled={saving}><Ic name="check" size={12} /> {saving ? 'Salvando…' : 'Salvar'}</button>
              </> :
              <button className="btn btn-sm" style={{ background: '#fff' }} onClick={onEdit}><Ic name="edit" size={12} /> Editar ficha</button>}
          </div>}
      </div>

      {/* Stat grid (vendas/ticket/ciclo entram com o PDV) */}
      <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { ic: 'wallet', color: '#10B981', label: 'Total comprado', val: fmtMoney(data.ltv != null ? data.ltv : data.valor) },
          { ic: 'leads', color: '#0EA5E9', label: 'Ticket médio', val: (data.orders > 0 ? fmtMoney((Number(data.ltv) || 0) / data.orders) : '—') },
          { ic: 'cart', color: '#8B5CF6', label: 'Pedidos', val: data.orders != null ? String(data.orders) : '0' },
          { ic: 'package', color: '#F472B6', label: 'Última compra', val: data.ultimaCompra ? new Date(data.ultimaCompra).toLocaleDateString('pt-BR') : '—' }].
          map((s, i) =>
            <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', background: 'var(--surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: `color-mix(in oklab, ${s.color} 14%, #fff)`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic name={s.ic} size={13} /></div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginTop: 6, color: 'var(--text)' }}>{s.val}</div>
            </div>)}
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 16px' }}>
        {[['perfil', 'Perfil'], ['endereco', 'Endereço'], ['mais', 'Mais']].map(([id, label]) => {
          const on = subtab === id;
          return (
            <button key={id} onClick={() => setSubtab(id)}
              style={{ flex: 1, padding: '10px 4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12,
                color: on ? 'var(--accent)' : 'var(--text-muted)', fontWeight: on ? 600 : 500,
                borderBottom: on ? '2px solid var(--accent)' : '2px solid transparent' }}>{label}</button>);
        })}
      </div>

      {/* Conteúdo das sub-abas */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>
        {subtab === 'perfil' &&
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {fieldRow('Nome', 'nome', { placeholder: 'Nome completo' })}
            {fieldRow('Empresa', 'empresa', { placeholder: 'Empresa' })}
            {fieldRow('Tipo', 'tipoPessoa', { options: [{ value: 'pf', label: 'Pessoa Física' }, { value: 'pj', label: 'Pessoa Jurídica' }] })}
            {data.tipoPessoa === 'pj' ? fieldRow('CNPJ', 'cnpj', { placeholder: '00.000.000/0000-00' }) : fieldRow('CPF', 'cpf', { placeholder: '000.000.000-00' })}
            {fieldRow('E-mail', 'email', { placeholder: 'email@exemplo.com' })}
            {fieldRow('Telefone', 'telefone', { placeholder: '(00) 00000-0000' })}
            {fieldRow('Origem', 'origemLead', { placeholder: 'Como conheceu a empresa' })}
            {fieldRow('Site', 'site', { placeholder: 'www.exemplo.com' })}
            {fieldRow('Segmento', 'segmento', { options: SEG_OPTS, placeholder: '—' })}
            {fieldRow('Atendente', 'atendente', { placeholder: 'Responsável' })}
          </div>}
        {subtab === 'endereco' &&
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {fieldRow('CEP', 'cep', { placeholder: '00000-000' })}
            {fieldRow('Logradouro', 'logradouro', { placeholder: 'Rua / Avenida' })}
            {fieldRow('Número', 'numero')}
            {fieldRow('Complemento', 'complemento')}
            {fieldRow('Bairro', 'bairro')}
            {fieldRow('Cidade', 'cidade')}
            {fieldRow('Estado (UF)', 'uf', { placeholder: 'CE' })}
          </div>}
        {subtab === 'mais' &&
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {fieldRow('Aniversário', 'aniversario', { placeholder: 'AAAA-MM-DD' })}
            {fieldRow('Observações', 'observacoes', { textarea: true, placeholder: 'Anotações sobre o cliente...' })}
          </div>}
      </div>
    </div>);

}

function LeadHistoryItem({ icon, color, title, parts, source, date }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
      <div style={{ width: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 4px color-mix(in oklab, ' + color + ' 12%, transparent)' }}><Ic name={icon} size={13} /></div>
        <div style={{ flex: 1, width: 2, background: 'var(--border)', marginTop: 4, minHeight: 24 }} />
      </div>
      <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13 }}>{title}</span>
          {parts && parts.map((p, i) => <span key={i} style={{ fontSize: 13, color: p.link ? 'var(--accent)' : 'var(--text)' }}>{p.text}</span>)}
          <div style={{ flex: 1 }} />
          <Ic name="chevron-down" size={14} style={{ color: 'var(--text-faint)' }} />
        </div>
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          <Ic name="sparkles" size={11} /><span style={{ flex: 1 }}>{source}</span>
          <span>{date}</span>
        </div>
      </div>
    </div>);

}

function LeadHistoryTab({ card }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 18 }}>Histórico</div>
          <div className="muted" style={{ fontSize: 13 }}>Veja o histórico do seu lead</div>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-sm"><Ic name="filter" size={12} /> Todos</button>
        <button className="btn btn-sm" style={{ color: '#0EA5E9' }}><Ic name="plus" size={12} /> Comentário</button>
      </div>
      <LeadHistoryItem icon="dollar" color="#10B981" title="Total do negócio" parts={[{ text: '#50', link: true }, { text: ' alterado ' }, { text: 'R$ 0,00', link: true }, { text: ' para ' }, { text: `R$ ${(Number(card.value) || 0).toLocaleString('pt-BR')}`, link: true }]} source="Automação" date="14/10/2024 20:27" />
      <LeadHistoryItem icon="users" color="#0EA5E9" title="" parts={[{ text: 'Tag ' }, { text: 'VIP', link: true }, { text: ' adicionada ao lead' }]} source="Automação" date="14/10/2024 20:27" />
      <LeadHistoryItem icon="users" color="#0EA5E9" title="" parts={[{ text: 'Tag ' }, { text: 'GTM', link: true }, { text: ' removida do lead' }]} source="Automação" date="14/10/2024 20:25" />
      <LeadHistoryItem icon="dollar" color="#10B981" title="" parts={[{ text: 'Negócio ' }, { text: '#50', link: true }, { text: ' criado ' }, { text: 'R$ 0,00', link: true }]} source="Automação" date="14/10/2024 20:23" />
      <LeadHistoryItem icon="users" color="#0EA5E9" title="" parts={[{ text: 'Tag ' }, { text: 'Demonstração agendada', link: true }, { text: ' adicionada ao lead' }]} source="Automação" date="14/10/2024 20:23" />
      <LeadHistoryItem icon="phone" color="#0EA5E9" title="" parts={[{ text: 'Telefone do lead alterado de: ' }, { text: '+55 (98) 991270706', link: true }, { text: ' para ' }, { text: '+5598991270706', link: true }]} source="Automação" date="14/10/2024 20:23" />
    </div>);

}

function LeadActivityCard({ day, date, time, dur, title, person, color, status }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10, background: 'var(--surface)' }}>
      <div style={{ minWidth: 60 }}>
        <div style={{ fontSize: 11, color: color, fontWeight: 500 }}>{day}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: color }}>{date}</div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
          <Ic name="clock" size={12} /><span>{time} | {dur}</span>
          <span style={{ marginLeft: 14, fontWeight: 600, color: 'var(--text)' }}>{title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
          <Ic name="agenda" size={12} /><span>{date}/2024</span>
          <span style={{ marginLeft: 14 }}>👤 {person}</span>
        </div>
      </div>
      <button className="btn btn-icon btn-sm"><Ic name="more" size={14} /></button>
      <button className="btn btn-icon btn-sm" style={{ color: status === 'done' ? '#10B981' : 'var(--text-faint)' }}><Ic name={status === 'done' ? 'check' : 'x'} size={14} /></button>
    </div>);

}

function LeadActivitiesTab() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 18 }}>Atividades</div>
          <div className="muted" style={{ fontSize: 13 }}>Veja as atividades do lead</div>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-sm" style={{ color: '#0EA5E9' }}><Ic name="plus" size={12} /> Adicionar</button>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>Atrasados</div>
      <LeadActivityCard day="Quinta" date="26/09" time="14:37" dur="38m" title="Reunião de proposta" person="Karla Z." color="#EF4444" status="overdue" />
      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 18, marginBottom: 8, color: 'var(--text-muted)' }}>Completadas</div>
      <LeadActivityCard day="Segunda" date="30/09" time="23:00" dur="30m" title="Ligar" person="Karla Z." color="#0EA5E9" status="done" />
      <LeadActivityCard day="Quinta" date="29/08" time="16:29" dur="—" title="Teste" person="Karla Z." color="#0EA5E9" status="done" />
      <LeadActivityCard day="Domingo" date="11/08" time="22:10" dur="1 dia" title="LIGAÇÃO" person="Karla Z." color="#0EA5E9" status="done" />
    </div>);

}

function LeadDealCard({ name, value, activity, pipeline, status, days }) {
  const won = status === 'won';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10, background: 'var(--surface)', position: 'relative' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic name="cart" size={14} /></div>
      <div style={{ minWidth: 140 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatBRL(value)}</div>
      </div>
      <div style={{ minWidth: 120, fontSize: 12, color: 'var(--text-muted)' }}>{activity}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, marginBottom: 4 }}>{pipeline}</div>
        <div style={{ display: 'flex', gap: 2 }}>
          {Array.from({ length: 6 }).map((_, i) =>
          <div key={i} style={{ flex: 1, height: 6, borderRadius: 2, background: i < (won ? 5 : 2) ? won ? '#EA580C' : '#0EA5E9' : 'var(--border)' }} />
          )}
        </div>
      </div>
      <div style={{ minWidth: 140, fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>
        <div style={{ color: won ? '#10B981' : '#EF4444', fontWeight: 600 }}>{won ? 'Ganho' : 'Perdido'} em {days} dias</div>
        <div>26 de setembro de 2024</div>
      </div>
      <button className="btn btn-icon btn-sm"><Ic name="more" size={14} /></button>
      <div style={{ position: 'absolute', top: 0, right: 42 }}>
        <div style={{ width: 22, height: 30, background: won ? '#10B981' : '#EF4444', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 75%, 0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', paddingBottom: 6 }}><Ic name={won ? 'check' : 'x'} size={11} /></div>
      </div>
    </div>);

}

function LeadDealsTab({ card }) {
  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 600, fontSize: 18 }}>Negócios</div>
        <div className="muted" style={{ fontSize: 13 }}>Veja qual a participação do lead</div>
      </div>
      <LeadDealCard name="ADSPLATINUM" value={2800} activity="Sem atividades" pipeline="Vendas AR" status="won" days={18} />
      <LeadDealCard name="ADSPLATINUM." value={7800} activity="Ligar 14:45" pipeline="Vendas AR" status="won" days={36} />
      <LeadDealCard name="ADSPLATINUM." value={15600} activity="Sem atividades" pipeline="Vendas AR" status="won" days={73} />
      <LeadDealCard name="ADSPLATINUM." value={7800} activity="Sem atividades" pipeline="Vendas AR" status="won" days={74} />
    </div>);

}

function LeadFilesTab() {
  const files = [
  { name: 'Proposta_2026_v3.pdf', kind: 'PDF', size: '2.4 MB', date: '15/06/2026', by: 'Karla Z.' },
  { name: 'Contrato_assinado.pdf', kind: 'PDF', size: '1.1 MB', date: '12/06/2026', by: 'Cliente' },
  { name: 'Print_pagamento.png', kind: 'PNG', size: '340 KB', date: '10/06/2026', by: 'Cliente' },
  { name: 'Briefing_inicial.docx', kind: 'DOCX', size: '85 KB', date: '02/06/2026', by: 'Karla Z.' }];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 18 }}>Arquivos</div>
          <div className="muted" style={{ fontSize: 13 }}>Arquivos anexados ao lead</div>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-sm" style={{ color: '#0EA5E9' }}><Ic name="upload" size={12} /> Anexar</button>
      </div>
      {files.map((f) =>
      <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8, background: 'var(--surface)' }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: f.kind === 'PDF' ? '#FEE2E2' : f.kind === 'PNG' ? '#DBEAFE' : '#FEF3C7', color: f.kind === 'PDF' ? '#DC2626' : f.kind === 'PNG' ? '#2563EB' : '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{f.kind}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{f.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.size} · {f.date} · por {f.by}</div>
          </div>
          <button className="btn btn-icon btn-sm"><Ic name="download" size={14} /></button>
          <button className="btn btn-icon btn-sm"><Ic name="more" size={14} /></button>
        </div>
      )}
    </div>);

}

function LeadAgendaTab() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 18 }}>Agenda</div>
          <div className="muted" style={{ fontSize: 13 }}>Agende reuniões, ligações e tarefas com o lead</div>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary btn-sm"><Ic name="plus" size={12} /> Novo agendamento</button>
      </div>

      {/* Quick scheduler */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, background: 'var(--surface)', marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Agendar rapidamente</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div>
            <label className="label">Tipo</label>
            <select className="input">
              <option>📞 Ligação</option>
              <option>📅 Reunião presencial</option>
              <option>🎥 Reunião online</option>
              <option>✉️ Envio de proposta</option>
              <option>✅ Tarefa</option>
            </select>
          </div>
          <div>
            <label className="label">Data</label>
            <DateInput value="2026-06-20" onChange={() => {}} />
          </div>
          <div>
            <label className="label">Hora</label>
            <TimeInput value="14:30" onChange={() => {}} />
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <label className="label">Descrição</label>
          <textarea className="input" rows={2} placeholder="Detalhes do compromisso..." defaultValue="Apresentar proposta de pacote pré-sal premium e tirar dúvidas técnicas." />
        </div>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" defaultChecked /> Lembrar 30 min antes</label>
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" /> Enviar convite por WhatsApp</label>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary btn-sm"><Ic name="agenda" size={12} /> Agendar</button>
        </div>
      </div>

      {/* Upcoming */}
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>Próximos compromissos</div>
      {[
      { day: 'SEX', date: '20', month: 'Jun', time: '14:30', title: 'Apresentação da proposta', desc: 'Reunião online via Google Meet', color: '#10B981' },
      { day: 'TER', date: '24', month: 'Jun', time: '10:00', title: 'Follow-up assinatura', desc: 'Ligação para confirmar contrato', color: '#0EA5E9' },
      { day: 'SEX', date: '27', month: 'Jun', time: '16:00', title: 'Onboarding inicial', desc: 'Reunião presencial — escritório do cliente', color: '#8B5CF6' }].
      map((e, i) =>
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8, background: 'var(--surface)' }}>
          <div style={{ minWidth: 52, textAlign: 'center', padding: '6px 0', borderRadius: 8, background: `color-mix(in oklab, ${e.color} 12%, #fff)`, border: `1px solid color-mix(in oklab, ${e.color} 25%, transparent)` }}>
            <div style={{ fontSize: 10, color: e.color, fontWeight: 600 }}>{e.day}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: e.color }}>{e.date}</div>
            <div style={{ fontSize: 10, color: e.color }}>{e.month}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{e.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{e.desc}</div>
            <div style={{ fontSize: 11, color: e.color, marginTop: 4, fontWeight: 500 }}><Ic name="clock" size={10} /> {e.time}</div>
          </div>
          <button className="btn btn-icon btn-sm"><Ic name="edit" size={13} /></button>
          <button className="btn btn-icon btn-sm"><Ic name="more" size={14} /></button>
        </div>
      )}
    </div>);

}

function LeadAutomationTab() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 18 }}>Automação</div>
          <div className="muted" style={{ fontSize: 13 }}>Programe disparos automáticos e gatilhos para este lead</div>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary btn-sm"><Ic name="zap" size={12} /> Nova automação</button>
      </div>

      {/* Quick blast */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, background: 'var(--surface)', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic name="zap" size={14} /></div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Disparo programado</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Envie uma mensagem em um horário específico</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label className="label">Canal</label>
            <select className="input">
              <option>💬 WhatsApp</option>
              <option>📧 E-mail</option>
              <option>📱 SMS</option>
              <option>📷 Instagram DM</option>
            </select>
          </div>
          <div>
            <label className="label">Template</label>
            <select className="input">
              <option>Boas-vindas</option>
              <option>Follow-up pós-reunião</option>
              <option>Lembrete de pagamento</option>
              <option>Aniversário do lead</option>
              <option>Mensagem personalizada</option>
            </select>
          </div>
          <div>
            <label className="label">Disparo em</label>
            <input className="input" type="datetime-local" defaultValue="2026-06-21T09:00" />
          </div>
          <div>
            <label className="label">Fuso</label>
            <select className="input">
              <option>America/Fortaleza (BRT)</option>
              <option>America/São_Paulo (BRT)</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <label className="label">Mensagem</label>
          <textarea className="input" rows={3} defaultValue="Olá {{nome}}! Tudo bem? Passando para lembrar da nossa conversa sobre o pacote pré-sal premium. Posso te ligar amanhã?" />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Variáveis disponíveis: <code>{'{{nome}}'}</code> <code>{'{{empresa}}'}</code> <code>{'{{atendente}}'}</code></div>
        </div>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" defaultChecked /> Cancelar se cliente responder antes</label>
          <div style={{ flex: 1 }} />
          <button className="btn btn-sm">Salvar rascunho</button>
          <button className="btn btn-primary btn-sm"><Ic name="send" size={12} /> Programar</button>
        </div>
      </div>

      {/* Active automations */}
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>Automações ativas para este lead</div>
      {[
      { ic: 'sparkles', color: '#8B5CF6', name: 'Aquecimento de lead frio', desc: '3 mensagens em 7 dias se sem resposta', status: 'ativa', next: 'Disparo em 2 dias' },
      { ic: 'agenda', color: '#0EA5E9', name: 'Lembrete pré-reunião', desc: 'Envia 30 min antes da reunião agendada', status: 'ativa', next: '20 Jun · 14:00' },
      { ic: 'star', color: '#F59E0B', name: 'NPS pós-fechamento', desc: 'Pesquisa de satisfação após 7 dias do ganho', status: 'aguardando', next: '—' },
      { ic: 'bell', color: '#EF4444', name: 'Alerta de inatividade', desc: 'Notifica responsável se 14 dias sem interação', status: 'pausada', next: '—' }].
      map((a, i) => {
        const colors = { ativa: '#10B981', aguardando: '#0EA5E9', pausada: '#94A3B8' };
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8, background: 'var(--surface)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: `color-mix(in oklab, ${a.color} 14%, #fff)`, color: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic name={a.ic} size={15} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{a.desc}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 10, background: `color-mix(in oklab, ${colors[a.status]} 14%, #fff)`, color: colors[a.status], fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors[a.status] }} />{a.status}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{a.next}</div>
            </div>
            <button className="btn btn-icon btn-sm"><Ic name="more" size={14} /></button>
          </div>);

      })}

      {/* Triggers */}
      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 18, marginBottom: 8, color: 'var(--text-muted)' }}>Gatilhos disponíveis</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
        ['Mudou de fase no funil', 'arrow-up-right'],
        ['Tag específica adicionada', 'tag'],
        ['Aniversário do lead', 'calendar'],
        ['Sem resposta por X dias', 'clock'],
        ['Valor do negócio acima de R$', 'dollar'],
        ['Atividade marcada como concluída', 'check']].
        map(([t, ic], i) =>
        <button key={i} className="btn btn-sm" style={{ justifyContent: 'flex-start', padding: '10px 12px', textAlign: 'left' }}><Ic name={ic} size={13} /> {t}</button>
        )}
      </div>
    </div>);

}

function CRMDetailTabs({ tabs, active, onChange }) {
  const wrapRef = React.useRef(null);
  const btnRefs = React.useRef({});
  const [bar, setBar] = React.useState({ left: 0, width: 0, ready: false });

  const measure = React.useCallback(() => {
    const wrap = wrapRef.current;
    const btn = btnRefs.current[active];
    if (!wrap || !btn) return;
    const wr = wrap.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    setBar({ left: br.left - wr.left, width: br.width, ready: true });
  }, [active]);

  React.useLayoutEffect(() => {measure();}, [measure]);
  React.useEffect(() => {
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener('resize', measure);
    return () => {ro.disconnect();window.removeEventListener('resize', measure);};
  }, [measure]);

  return (
    <div ref={wrapRef} style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 24px', gap: 0, flexShrink: 0, position: 'relative' }}>
      {tabs.map(([id, label, icon]) => {
        const on = active === id;
        return (
          <button key={id} ref={(el) => {if (el) btnRefs.current[id] = el;}} onClick={() => onChange(id)}
          style={{ padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13,
            color: on ? 'var(--accent)' : 'var(--text-muted)', fontWeight: on ? 600 : 500,
            display: 'flex', alignItems: 'center', gap: 6, transition: 'color .2s ease' }}>
            <Ic name={icon} size={13} />{label}
          </button>);
      })}
      <span aria-hidden style={{
        position: 'absolute', bottom: -1, height: 2, background: 'var(--accent)',
        left: 0, width: bar.width, transform: `translateX(${bar.left}px)`,
        transition: bar.ready ? 'transform .28s cubic-bezier(.5,1.25,.4,1), width .28s cubic-bezier(.5,1.25,.4,1)' : 'none',
        borderRadius: 2, pointerEvents: 'none'
      }} />
    </div>);
}

function PhasePickerStrip({ phases, currentPhaseId, onSelect }) {
  return (
    <div className="crmd-pp-strip">
      {phases.map((p, i) => {
        const sel = p.id === currentPhaseId;
        const isFirst = i === 0;
        const isLast = i === phases.length - 1;
        const cls = `crmd-pp-pill ${isFirst ? 'is-first' : ''} ${isLast ? 'is-last' : ''} ${sel ? 'is-selected' : ''}`.trim();
        return (
          <div
            key={p.id}
            className={cls}
            onClick={() => !sel && onSelect && onSelect(p.id)}
            style={{ '--ph': p.color, background: sel ? p.color : 'var(--border)' }}
            title={sel ? `${p.label} (atual)` : `Mover para ${p.label}`}>
            <div className="crmd-pp-inner" style={{ background: sel ? p.color : 'var(--surface)' }}>
              <span
                className="crmd-pp-dot"
                style={{ background: sel ? '#fff' : p.color, boxShadow: sel ? '0 0 0 2px rgba(255,255,255,.35)' : `0 0 0 2px color-mix(in oklab, ${p.color} 22%, transparent)` }} />
              <span
                className="crmd-pp-label"
                style={{ color: sel ? '#fff' : 'var(--text-muted)' }}>{p.label}</span>
            </div>
          </div>);
      })}
      <style>{`
        .crmd-pp-strip { display: flex; gap: 4px; padding: 10px 22px; background: var(--surface); border-bottom: 1px solid var(--border); overflow-x: auto; scrollbar-width: thin; }
        .crmd-pp-strip::-webkit-scrollbar { height: 4px; }
        .crmd-pp-strip::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 2px; }
        .crmd-pp-pill {
          flex: 1 1 0; min-width: 100px;
          padding: 1.5px;
          clip-path: polygon(
            1.2px 2.8px,
            3px 0,
            calc(100% - 13px) 0,
            calc(100% - 9px) 2.8px,
            calc(100% - 1.2px) calc(50% - 2.8px),
            calc(100% - 1.2px) calc(50% + 2.8px),
            calc(100% - 9px) calc(100% - 2.8px),
            calc(100% - 13px) 100%,
            3px 100%,
            1.2px calc(100% - 2.8px),
            9px calc(50% + 2.8px),
            9px calc(50% - 2.8px)
          );
          cursor: pointer;
          transition: background .14s ease, filter .14s ease, transform .14s ease;
        }
        .crmd-pp-pill.is-first {
          clip-path: polygon(
            0 3px,
            3px 0,
            calc(100% - 13px) 0,
            calc(100% - 9px) 2.8px,
            calc(100% - 1.2px) calc(50% - 2.8px),
            calc(100% - 1.2px) calc(50% + 2.8px),
            calc(100% - 9px) calc(100% - 2.8px),
            calc(100% - 13px) 100%,
            3px 100%,
            0 calc(100% - 3px)
          );
        }
        .crmd-pp-pill.is-last {
          clip-path: polygon(
            1.2px 2.8px,
            3px 0,
            calc(100% - 3px) 0,
            100% 3px,
            100% calc(100% - 3px),
            calc(100% - 3px) 100%,
            3px 100%,
            1.2px calc(100% - 2.8px),
            9px calc(50% + 2.8px),
            9px calc(50% - 2.8px)
          );
        }
        .crmd-pp-pill:hover:not(.is-selected) { background: var(--ph) !important; filter: brightness(1.03); }
        .crmd-pp-pill:hover:not(.is-selected) .crmd-pp-inner { background: color-mix(in oklab, var(--ph) 8%, var(--surface)) !important; }
        .crmd-pp-inner {
          clip-path: inherit;
          padding: 7px 18px 7px 20px;
          height: 38px;
          display: flex; flex-direction: row; align-items: center; gap: 7px;
          min-width: 0;
          transition: background .14s ease;
        }
        .crmd-pp-pill.is-first .crmd-pp-inner { padding-left: 12px; }
        .crmd-pp-pill.is-last .crmd-pp-inner { padding-right: 12px; }
        .crmd-pp-dot {
          width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
          transition: background .14s ease;
        }
        .crmd-pp-label {
          font-size: 10.5px; font-weight: 700; letter-spacing: .04em;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          min-width: 0;
        }
      `}</style>
    </div>);
}

// Converte o rascunho (camelCase) da ficha -> patch com NOMES DE COLUNA.
function clienteDraftToPatch(d) {
  d = d || {};
  const v = (x) => (x === undefined || x === '' ? null : x);
  const patch = {
    telefone: v(d.telefone), email: v(d.email), empresa: v(d.empresa),
    tipo_pessoa: d.tipoPessoa === 'pj' ? 'pj' : 'pf',
    cpf: v(d.cpf), cnpj: v(d.cnpj),
    site: v(d.site), origemlead: v(d.origemLead),
    segmento: v(d.segmento), atendente: v(d.atendente),
    observacoes: v(d.observacoes), aniversario: v(d.aniversario),
    cep: v(d.cep), logradouro: v(d.logradouro), numero: v(d.numero),
    complemento: v(d.complemento), bairro: v(d.bairro), cidade: v(d.cidade),
    uf: d.uf ? String(d.uf).toUpperCase() : null,
    estagio: d.estagio === 'cliente' ? 'cliente' : 'lead',
  };
  if (d.nome && d.nome.trim()) patch.nome = d.nome.trim();
  return patch;
}

// Tira IDÊNTICA à ficha do super admin: "Funil" + select de funis + PhasePickerStrip.
// funis = [{id,nome,cor,fases:[{id,nome,cor,pos}]}]; card = {funilId,faseId}|null;
// onSelectFase(faseId) salva (atribui/move o contato no CRM).
function CrmFunilSelectStrip({ funis, card, onSelectFase }) {
  const safe = funis || [];
  const init = (card && card.funilId != null) ? String(card.funilId) : (safe[0] ? String(safe[0].id) : '');
  const [funilId, setFunilId] = React.useState(init);
  const funil = safe.find((f) => String(f.id) === String(funilId)) || safe[0] || null;
  const [faseId, setFaseId] = React.useState(() => {
    if (card && card.faseId != null) return card.faseId;
    return funil && funil.fases[0] ? funil.fases[0].id : null;
  });
  const trocarFunil = (id) => {
    setFunilId(id);
    const f = safe.find((x) => String(x.id) === String(id));
    setFaseId(f && f.fases[0] ? f.fases[0].id : null);
  };
  const selecionar = (fid) => { setFaseId(fid); onSelectFase && onSelectFase(fid); };
  const phases = funil ? funil.fases.map((fa) => ({ id: fa.id, label: fa.nome, color: fa.cor })) : [];
  return (
    <div className="lf-funilrow">
      <span className="lf-funillabel">Funil</span>
      {safe.length === 0 ?
        <span className="muted" style={{ fontSize: 12 }}>Nenhum funil cadastrado no CRM.</span> :
        <>
          <select className="input lf-funilsel" value={funilId} onChange={(e) => trocarFunil(e.target.value)}>
            {safe.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
          <div style={{ flex: 1, minWidth: 0 }}>
            {phases.length ? <PhasePickerStrip phases={phases} currentPhaseId={faseId} onSelect={selecionar} /> :
              <span className="muted" style={{ fontSize: 12 }}>Funil sem fases.</span>}
          </div>
        </>}
      <style>{`
        .lf-funilrow { display: flex; align-items: center; gap: 10px; padding: 8px 22px 2px; background: var(--surface); }
        .lf-funillabel { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); flex-shrink: 0; }
        .lf-funilsel { height: 30px; width: 200px; font-size: 12px; flex-shrink: 0; }
      `}</style>
    </div>);
}

// Lista horizontal dos FUNIS em que o contato está (multi-funil), + "Atribuir CRM".
// crmMulti = { cards:[{cardId,funilId,funilNome,funilCor,faseId,faseNome,faseCor}], funis, onAdd, onMove, onRemove }
function CrmFunisRow({ crmMulti }) {
  const { cards = [], funis = [] } = crmMulti || {};
  const [picker, setPicker] = React.useState(null); // {mode:'add'} | {mode:'move', card}
  const wrapRef = React.useRef(null);
  React.useEffect(() => {
    if (!picker) return;
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setPicker(null); };
    const t = setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', onDoc); };
  }, [picker]);
  return (
    <div ref={wrapRef} className="crmd-funis-row" style={{ position: 'relative', display: 'flex', gap: 8, alignItems: 'center', padding: '10px 22px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
      <button onClick={() => setPicker((p) => p && p.mode === 'add' ? null : { mode: 'add' })}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999, border: '1.5px dashed var(--accent)', background: 'var(--accent-soft)', color: 'var(--accent-700)', fontWeight: 700, fontSize: 'var(--type-xs)', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
        <Ic name="plus" size={13} /> Atribuir CRM
      </button>
      {cards.length === 0 ?
        <span className="muted" style={{ fontSize: 'var(--type-sm)' }}>Contato não está em nenhum funil.</span> :
        cards.map((c) => (
          <div key={c.cardId} onClick={() => setPicker({ mode: 'move', card: c })} title="Trocar fase / remover"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 999, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', background: `color-mix(in oklab, ${c.faseCor || '#94a3b8'} 12%, var(--surface))`, border: `1px solid color-mix(in oklab, ${c.faseCor || '#94a3b8'} 38%, transparent)`, fontSize: 'var(--type-sm)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: c.funilCor || '#22C55E', flexShrink: 0 }} />
            <strong>{c.funilNome || 'Funil'}</strong>
            <span style={{ color: c.faseCor || 'var(--text-muted)', fontWeight: 600 }}>· {c.faseNome || '—'}</span>
          </div>
        ))}
      {picker && <CrmFunilPicker mode={picker.mode} card={picker.card} funis={funis} crmMulti={crmMulti} onClose={() => setPicker(null)} />}
    </div>);
}

// Popup do CrmFunisRow: 'add' (escolhe funil -> fase -> Adicionar) ou 'move' (fases do
// funil do card -> Mover / Remover). Efeito de nascer + fases crescendo.
function CrmFunilPicker({ mode, card, funis, crmMulti, onClose }) {
  const isMove = mode === 'move';
  const moveFunil = isMove ? (funis || []).find((f) => String(f.id) === String(card.funilId)) : null;
  const [selFunilId, setSelFunilId] = React.useState(isMove ? (card.funilId != null ? card.funilId : null) : null);
  const [selFaseId, setSelFaseId] = React.useState(isMove ? (card.faseId != null ? card.faseId : null) : null);
  // 'move' já abre nas fases; 'add' começa nos funis e entra nas fases ao escolher.
  const [step, setStep] = React.useState(isMove ? 'fases' : 'funis');
  const selFunil = isMove ? moveFunil : (funis || []).find((f) => String(f.id) === String(selFunilId)) || null;
  const pickFunil = (fu) => { setSelFunilId(fu.id); setSelFaseId(fu.fases[0] ? fu.fases[0].id : null); setStep('fases'); };
  const salvar = () => {
    if (!selFaseId) return;
    if (isMove) crmMulti.onMove && crmMulti.onMove(card.cardId, selFaseId);
    else crmMulti.onAdd && crmMulti.onAdd(selFaseId);
    onClose();
  };
  return (
    <div className="funnel-pop" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 22, width: 270, zIndex: 60, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 12px 34px rgba(0,0,0,.18)', overflow: 'hidden' }}>
      {step === 'funis' ?
        <>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 'var(--type-sm)' }}>Atribuir a um funil</div>
          <div className="scroll" style={{ maxHeight: 300, overflow: 'auto', padding: 6 }}>
            {(funis || []).length === 0 ? <div className="muted" style={{ padding: 16, textAlign: 'center', fontSize: 'var(--type-sm)' }}>Nenhum funil.</div> :
             funis.map((fu) => (
               <div key={fu.id} className="crm-pop-item" onClick={() => pickFunil(fu)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 'var(--type-sm)' }}>
                 <span style={{ width: 10, height: 10, borderRadius: 3, background: fu.cor || '#22C55E', flexShrink: 0 }} />
                 <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fu.nome}</span>
                 <Ic name="chevron-down" size={14} style={{ color: 'var(--text-faint)', transform: 'rotate(-90deg)' }} />
               </div>))}
          </div>
        </> :
        <>
          <div className="row" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', gap: 8, alignItems: 'center' }}>
            {!isMove && <button onClick={() => setStep('funis')} title="Voltar aos funis" style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--text-muted)', display: 'inline-flex', padding: 2 }}><Ic name="arrow-left" size={16} /></button>}
            <span style={{ width: 9, height: 9, borderRadius: 3, background: (selFunil && selFunil.cor) || '#22C55E', flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: 'var(--type-sm)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selFunil ? selFunil.nome : (card && card.funilNome) || 'Funil'}</span>
            {isMove && <button onClick={() => { crmMulti.onRemove && crmMulti.onRemove(card.cardId); onClose(); }} title="Remover deste funil" style={{ background: 'transparent', border: 0, color: '#FF452A', cursor: 'pointer', display: 'inline-flex' }}><Ic name="trash" size={15} /></button>}
          </div>
          <div className="funnel-fases scroll" style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: 6, maxHeight: 280, overflow: 'auto' }}>
            {(selFunil && selFunil.fases.length) ? selFunil.fases.map((fa) => {
              const fon = String(fa.id) === String(selFaseId);
              return (
                <div key={fa.id} className="crm-pop-fase" onClick={() => setSelFaseId(fa.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 'var(--type-sm)', border: `1px solid ${fon ? (fa.cor || 'var(--accent)') : 'var(--border)'}`, background: fon ? `color-mix(in oklab, ${fa.cor || 'var(--accent)'} 12%, var(--surface))` : 'var(--surface)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: fa.cor || '#94a3b8', flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: fon ? 700 : 500 }}>{fa.nome}</span>
                  {fon && <Ic name="check" size={14} style={{ color: fa.cor || 'var(--accent)' }} />}
                </div>);
            }) : <div className="muted" style={{ fontSize: 'var(--type-xs)', padding: '8px 10px' }}>Sem fases.</div>}
          </div>
          <div style={{ padding: 8, borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            <ActionButton action="salvar" size="md" label={isMove ? 'Mover' : 'Adicionar'} efeito={false} disabled={!selFaseId} onClick={salvar} style={{ width: '100%', justifyContent: 'center', opacity: selFaseId ? 1 : .5 }} />
          </div>
        </>}
    </div>);
}

function CRMCardDetail({ card, onClose, phases, onMovePhase, onSaved, crmMulti, crmStrip }) {
  const [subtab, setSubtab] = React.useState('perfil');
  const [tab, setTab] = React.useState('historico');
  const clienteId = card.clienteId || card.id || null;
  const [cliente, setCliente] = React.useState(null);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const TABS = [
  ['historico', 'Histórico', 'history'],
  ['atividades', 'Atividades', 'check'],
  ['negocios', 'Negócios', 'dollar'],
  ['arquivos', 'Arquivos', 'paperclip'],
  ['agenda', 'Agenda', 'agenda'],
  ['automacao', 'Automação', 'zap']];

  // Carrega o cliente real (mesma ficha p/ lead e cliente).
  React.useEffect(() => {
    if (!clienteId || !window.API || !window.API.getCliente) return;
    let alive = true;
    window.API.getCliente(clienteId).then((r) => { if (alive) setCliente(r.cliente); }).catch(() => {});
    return () => { alive = false; };
  }, [clienteId]);

  // Dados exibidos: cliente real (DTO) mesclado com o card. O NOME segue o do card
  // (= nome que aparece na lista de conversas) e empresa/email/telefone caem no dado
  // da conversa quando o cliente estiver vazio. Sem cliente: usa só o card.
  const cardEmpresa = (card.company && card.company !== '—') ? card.company : '';
  const base = cliente ? {
    ...cliente,
    nome: card.name || cliente.nome,
    empresa: cliente.empresa || cardEmpresa,
    email: cliente.email || card.email || '',
    telefone: cliente.telefone || card.phone || '',
  } : {
    nome: card.name, empresa: cardEmpresa,
    email: card.email, telefone: card.phone, valor: card.value, tipoPessoa: 'pf', estagio: 'lead',
  };
  const view = (editing && draft) ? draft : base;
  const setField = (k, val) => setDraft((p) => ({ ...(p || {}), [k]: val }));
  const startEdit = () => { setDraft({ ...base }); setEditing(true); };
  const cancelEdit = () => { setEditing(false); setDraft(null); };
  const save = async () => {
    if (!clienteId) { setEditing(false); return; }
    if (!draft || !draft.nome || !draft.nome.trim()) { window.showToast && window.showToast({ tipo: 'aviso', titulo: 'Informe o nome', descricao: 'O nome do cliente é obrigatório.' }); return; }
    setSaving(true);
    try {
      const r = await window.API.updateCliente(clienteId, clienteDraftToPatch(draft));
      setCliente(r.cliente); onSaved && onSaved(r.cliente); setEditing(false); setDraft(null);
    } catch (e) {
      window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao salvar ficha', descricao: (e && e.message) || 'Não foi possível salvar a ficha.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      title={view.nome || card.name}
      subtitle={view.empresa || card.company}
      onClose={onClose}
      width="70vw"
      belowHead={crmStrip ?
      <CrmFunilSelectStrip funis={crmStrip.funis} card={crmStrip.card} onSelectFase={crmStrip.onSelectFase} /> :
      crmMulti ?
      <CrmFunisRow crmMulti={crmMulti} /> :
      phases && phases.length > 0 ?
      <PhasePickerStrip
        phases={phases}
        currentPhaseId={card.phase}
        onSelect={(phaseId) => onMovePhase && onMovePhase(card._id, phaseId)} /> :
      null}>
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', height: '100%', margin: -22 /* cancel drawer padding */ }}>
        <LeadProfileLeft
          data={view} tags={card.tags || []} editing={editing} setField={setField}
          canEdit={!!clienteId} saving={saving} onEdit={startEdit} onCancel={cancelEdit} onSave={save}
          subtab={subtab} setSubtab={setSubtab} />
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
          {/* Right tab bar */}
          <CRMDetailTabs tabs={TABS} active={tab} onChange={setTab} />
          <div style={{ flex: 1, overflow: 'auto', padding: '22px 24px' }}>
            {tab === 'historico' && <LeadHistoryTab card={card} />}
            {tab === 'atividades' && <LeadActivitiesTab />}
            {tab === 'negocios' && <LeadDealsTab card={card} />}
            {tab === 'arquivos' && <LeadFilesTab />}
            {tab === 'agenda' && <LeadAgendaTab />}
            {tab === 'automacao' && <LeadAutomationTab />}
          </div>
        </div>
      </div>
    </Drawer>);

}

// ───────── Drawer: cadastrar novo contrato (a partir do card do CRM) ─────────
function NewContractDrawer({ card, onClose }) {
  const TIPOS = ['Prestação de serviços', 'Fornecimento', 'Licenciamento de software', 'Consultoria', 'Manutenção', 'Parceria comercial'];
  const STATUS = [
    { k: 'rascunho', label: 'Rascunho', color: '#64748b' },
    { k: 'negociacao', label: 'Em negociação', color: '#f59e0b' },
    { k: 'enviado', label: 'Enviado p/ assinatura', color: '#3b82f6' }
  ];
  const todayISO = new Date().toISOString().slice(0, 10);
  const addMonths = (iso, n) => { const d = new Date(iso); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); };

  const initials = (card.name || '').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  const num = React.useMemo(() => 'CT-2026-' + String(164 + Math.floor(Math.random() * 700)).padStart(4, '0'), []);

  const [f, setF] = React.useState({
    tipo: '', status: 'rascunho', desc: '',
    inicio: todayISO, fim: addMonths(todayISO, 12),
    valor: card.value || '', renovAuto: false, obs: ''
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const valid = f.tipo && f.inicio && f.fim && Number(f.valor) > 0;

  const Seg = ({ on, onYes, onNo }) => (
    <div style={{ position: 'relative', display: 'flex', background: 'var(--surface-2)', borderRadius: 9, padding: 3, width: '100%' }}>
      <div style={{ position: 'absolute', top: 3, bottom: 3, left: 3, width: 'calc(50% - 3px)', borderRadius: 7, background: 'var(--surface)', boxShadow: '0 1px 2px rgba(15,23,42,.10)', transform: on ? 'translateX(0)' : 'translateX(100%)', transition: 'transform .34s cubic-bezier(.34,1.3,.5,1)' }} />
      <button onClick={onYes} style={{ position: 'relative', zIndex: 1, flex: 1, border: 'none', background: 'none', padding: '7px 0', borderRadius: 7, font: 'inherit', fontSize: 13, fontWeight: 600, color: on ? 'var(--text)' : 'var(--text-muted)', cursor: 'pointer', transition: 'color .18s' }}>Sim</button>
      <button onClick={onNo} style={{ position: 'relative', zIndex: 1, flex: 1, border: 'none', background: 'none', padding: '7px 0', borderRadius: 7, font: 'inherit', fontSize: 13, fontWeight: 600, color: !on ? 'var(--text)' : 'var(--text-muted)', cursor: 'pointer', transition: 'color .18s' }}>Não</button>
    </div>);

  return (
    <Drawer
      title={<span className="row" style={{ gap: 10 }}><span style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'color-mix(in oklab, #8b5cf6 16%, white)', color: '#6d28d9' }}><Ic name="file-text" size={16} /></span><span>Novo contrato</span></span>}
      subtitle={`Cliente: ${card.name}`}
      onClose={onClose} width={620}
      rightHead={<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, marginRight: 6 }}><span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '.06em' }}>NÚMERO</span><strong className="tnum" style={{ fontSize: 12, color: 'var(--text)' }}>{num}</strong></div>}
      footer={(close) => <>
        <div style={{ flex: 1 }} />
        <ActionButton action="salvar" size="md" label="Salvar contrato" disabled={!valid} style={{ opacity: valid ? 1 : .55 }} onClick={() => close()} />
      </>}>

      {/* Cliente (do card) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface-2)', marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'color-mix(in oklab, var(--accent) 16%, #fff)', color: 'var(--accent-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{initials}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{card.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{[card.company, card.phone].filter(Boolean).join(' · ')}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label className="label">Tipo de contrato</label>
          <select className="input" value={f.tipo} onChange={(e) => set('tipo', e.target.value)}>
            <option value="">Selecione o tipo...</option>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={f.status} onChange={(e) => set('status', e.target.value)}>
            {STATUS.map((s) => <option key={s.k} value={s.k}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <label className="label">Descrição / Objeto</label>
        <input className="input" value={f.desc} onChange={(e) => set('desc', e.target.value)} placeholder="Objeto do contrato..." />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
        <div>
          <label className="label">Data de início</label>
          <DateInput value={f.inicio} onChange={(v) => set('inicio', v)} />
        </div>
        <div>
          <label className="label">Data de término</label>
          <DateInput value={f.fim} onChange={(v) => set('fim', v)} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12, alignItems: 'start' }}>
        <div>
          <label className="label">Valor contratual</label>
          <MoneyInput value={f.valor} onChange={(v) => set('valor', v)} />
        </div>
        <div>
          <label className="label">Renovação automática</label>
          <Seg on={f.renovAuto} onYes={() => set('renovAuto', true)} onNo={() => set('renovAuto', false)} />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <label className="label">Observações</label>
        <textarea className="input" rows={3} value={f.obs} onChange={(e) => set('obs', e.target.value)} placeholder="Observações internas..." />
      </div>
    </Drawer>);
}

Object.assign(window, { CRMList, CRMBoard, CRMCardDetail });