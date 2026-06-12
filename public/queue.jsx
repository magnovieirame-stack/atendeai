// queue.jsx — Fila de Transferências (atendente)
// Lista de conversas que a IA transferiu e aguardam atendimento humano.

function Queue() {
  const { setRoute, tweaks } = useStore();
  const me = tweaks.profile === 'super' ? 'mv' : tweaks.profile === 'atendente' ? 'kz' : 'ph';

  // ------------ motivos/cores (usados pelo filtro e pelo chip de motivo — IA liga depois) ------------
  const REASONS = [
  'Agendar consulta',
  'Cliente pediu humano',
  'Reclamação',
  'Pagamento / cobrança',
  'Negociação de desconto',
  'IA não compreendeu',
  'Pedido acima de R$ 5.000',
  'Fora do horário comercial'];

  const REASON_COLORS = {
    'Agendar consulta': { c: 'var(--hue-teal)', ic: 'agenda' },
    'Cliente pediu humano': { c: 'var(--hue-blue)', ic: 'user' },
    'Reclamação': { c: 'var(--hue-rose)', ic: 'flag' },
    'Pagamento / cobrança': { c: 'var(--hue-violet)', ic: 'finance' },
    'Negociação de desconto': { c: 'var(--hue-orange)', ic: 'commercial' },
    'IA não compreendeu': { c: 'var(--ai)', ic: 'sparkles' },
    'Pedido acima de R$ 5.000': { c: 'var(--accent)', ic: 'leads' },
    'Fora do horário comercial': { c: 'var(--text-faint)', ic: 'clock' }
  };

  // ===== Fila REAL — vem de GET /chatbot/contatos (PENDENTES do atendente) =====
  // O backend já isola por usuário: conversas atribuídas a mim (transferidas pra mim)
  // + o pool pendente dos meus departamentos. Aqui ficamos só com as PENDENTES.
  // OBS IA: 'reason' e '_summary' (Resumo da IA) ficam vazios DE PROPÓSITO — a IA
  //        será ligada depois; o visual/código de IA permanece intacto.
  const mapContatoToQueue = React.useCallback((c) => {
    const t = c.ultimaMsg ? new Date(c.ultimaMsg) : null;
    const wait = t ? Math.max(0, Math.round((Date.now() - t.getTime()) / 60000)) : 0;
    const priority = wait > 25 ? 'alta' : wait > 10 ? 'media' : 'baixa';
    const lastTime = t ? `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}` : '';
    const tagNome = (c.tags && c.tags[0] && String(c.tags[0].nome || '').toUpperCase()) || '';
    return {
      id: c.id,
      client: c.nome || 'Contato sem nome',
      photo: c.foto || null,
      channel: c.canal || 'whatsapp',
      status: c.status,
      lastTime,
      tag: tagNome,
      preview: c.ultimaMensagem || '',
      unread: c.naoLidas || 0,
      _wait: wait,
      priority,
      _raw: c, // contato cru — usado pra abrir a conversa REAL (ConvThread) no mesmo formato do inbox
    };
  }, []);

  // local mutable queue (as ações removem/atualizam na hora; o back persiste por baixo)
  const [items, setItems] = React.useState([]);
  const [selectedIds, setSelectedIds] = React.useState([]);
  const [filterChannel, setFilterChannel] = React.useState('all');
  const [filterReason, setFilterReason] = React.useState('all');
  const [filterPriority, setFilterPriority] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState('wait-desc');
  const [viewMode, setViewMode] = React.useState('list');
  const [tick, setTick] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [resolvedToday, setResolvedToday] = React.useState(0); // saídas da fila NESTA sessão (real)

  // Listas reais p/ transferência (atendentes + departamentos) — popup "Atribuir".
  const [listas, setListas] = React.useState(null);
  React.useEffect(() => { API.getTransferenciaListas().then(setListas).catch(() => {}); }, []);

  // Busca a fila real. Filtra os PENDENTES do escopo que o backend já devolve.
  const refetch = React.useCallback(() => {
    return API.getContatos()
      .then((r) => {
        const fila = (r.contatos || []).filter((c) => c.status === 'pendente').map(mapContatoToQueue);
        setItems(fila);
        setTick(0);
        if (fila.length) skelRemember('fila', fila.length);
      })
      .catch((e) => { window.showToast?.({ tipo: 'erro', titulo: 'Erro ao carregar a fila', descricao: e.message || 'Tente recarregar.' }); })
      .finally(() => setLoading(false));
  }, [mapContatoToQueue]);
  React.useEffect(() => { refetch(); }, [refetch]);

  // Polling leve: re-busca a cada 10s quando a aba está visível (igual ao inbox).
  React.useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') { setTick((t) => t + 1); refetch(); }
    }, 10000);
    return () => clearInterval(id);
  }, [refetch]);

  // Mapeia as listas reais p/ os formatos que os popups já esperam.
  const QUEUE_DEPT_COLORS = ['#16a34a', '#0ea5e9', '#f59e0b', '#a855f7', '#ef4444', '#14b8a6'];
  const assignTeam = React.useMemo(() => listas ? (listas.atendentes || []).map((u) => ({
    id: u.id, name: u.nome, role: u.papelNome || 'Atendente', status: u.emPausa ? 'pausa' : 'ativo',
  })) : null, [listas]);
  const transferAgents = React.useMemo(() => listas ? (listas.atendentes || []).map((u) => ({
    id: u.id, name: u.nome, role: u.papelNome || 'Atendente', status: u.emPausa ? 'offline' : 'available', queue: 0,
  })) : null, [listas]);
  const transferDepts = React.useMemo(() => listas ? (listas.departamentos || []).map((d, i) => ({
    id: d.id, name: d.nome, desc: 'Departamento', icon: 'team', color: QUEUE_DEPT_COLORS[i % QUEUE_DEPT_COLORS.length],
  })) : null, [listas]);

  // modals & drawers
  const [assignModal, setAssignModal] = React.useState(null); // conv | { bulk: true }
  const [returnModal, setReturnModal] = React.useState(null); // conv | { bulk: true }
  const [closeModal, setCloseModal] = React.useState(null);
  const [previewConv, setPreviewConv] = React.useState(null);

  // ----- filtering / sorting -----
  const filtered = items.
  filter((c) => filterChannel === 'all' ? true : c.channel === filterChannel).
  filter((c) => filterReason === 'all' ? true : c.reason === filterReason).
  filter((c) => filterPriority === 'all' ? true : c.priority === filterPriority).
  filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.client.toLowerCase().includes(q) || c.preview?.toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'wait-desc') return b._wait - a._wait;
    if (sort === 'wait-asc') return a._wait - b._wait;
    if (sort === 'priority') {
      const w = { alta: 3, media: 2, baixa: 1 };
      return w[b.priority] - w[a.priority] || b._wait - a._wait;
    }
    return 0;
  });

  // ----- KPIs -----
  const avgWait = items.length ? Math.round(items.reduce((s, c) => s + c._wait, 0) / items.length) : 0;
  const longest = items.length ? Math.max(...items.map((c) => c._wait)) : 0;
  const longestC = items.find((c) => c._wait === longest);
  const highPrio = items.filter((c) => c.priority === 'alta').length;

  // ----- channel counts for chips -----
  const channelCount = (ch) => ch === 'all' ? items.length : items.filter((c) => c.channel === ch).length;

  // ----- actions -----
  const removeIds = (ids) => {
    setItems((prev) => prev.filter((c) => !ids.includes(c.id)));
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
  };

  // Assumir = vira dono e a conversa fica 'ativo' (sai da fila). Persiste no back.
  const handleAssume = (conv) => {
    removeIds([conv.id]);
    setResolvedToday((n) => n + 1);
    API.assumirContato(conv.id)
      .then(() => window.showToast({ tipo: 'sucesso', titulo: 'Conversa assumida', descricao: `Você assumiu a conversa com ${conv.client}` }))
      .catch((e) => { window.showToast({ tipo: 'erro', titulo: 'Erro ao assumir', descricao: e.message || 'Tente novamente.' }); setResolvedToday((n) => Math.max(0, n - 1)); refetch(); });
  };

  const handleBulkAssume = () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    removeIds(ids);
    Promise.allSettled(ids.map((id) => API.assumirContato(id))).then((rs) => {
      const ok = rs.filter((r) => r.status === 'fulfilled').length;
      setResolvedToday((n) => n + ok);
      window.showToast({ tipo: ok ? 'sucesso' : 'erro', titulo: 'Conversas assumidas', descricao: `${ok} de ${ids.length} assumida${ids.length > 1 ? 's' : ''}` });
      if (ok < ids.length) refetch();
    });
  };

  // Atribuir = transfere p/ atendente (kind padrão) ou departamento. Persiste no back.
  const handleAssign = ({ memberId, memberName, kind, conv, bulk, note }) => {
    const ids = bulk ? [...selectedIds] : [conv.id];
    if (!ids.length) return;
    const dto = kind === 'dept'
      ? { departamentoId: memberId, departamentoNome: memberName, nota: note || undefined }
      : { atendenteId: memberId, atendenteNome: memberName, nota: note || undefined };
    removeIds(ids);
    Promise.allSettled(ids.map((id) => API.transferirContato(id, dto))).then((rs) => {
      const ok = rs.filter((r) => r.status === 'fulfilled').length;
      setResolvedToday((n) => n + ok);
      window.showToast({ tipo: ok ? 'sucesso' : 'erro', titulo: 'Conversa atribuída', descricao: ids.length > 1 ?
      `${ok} de ${ids.length} atribuída(s) a ${memberName}` :
      `Conversa atribuída a ${memberName}` });
      if (ok < ids.length) refetch();
    });
    setAssignModal(null);
  };

  // "Devolver à IA" — INTACTO (visual/local). Será ligado quando a IA entrar.
  const handleReturn = ({ reason, conv, bulk }) => {
    const ids = bulk ? selectedIds : [conv.id];
    removeIds(ids);
    window.showToast({ tipo: 'info', titulo: 'Devolvida à IA', descricao: ids.length > 1 ?
    `${ids.length} conversas devolvidas à IA` :
    `Conversa devolvida à IA` });
    setReturnModal(null);
  };

  // Encerrar = statuschat 'finalizado'. Persiste no back.
  const handleClose = ({ label, conv }) => {
    removeIds([conv.id]);
    setResolvedToday((n) => n + 1);
    API.setContatoStatus(conv.id, 'finalizado')
      .then(() => window.showToast({ tipo: 'sucesso', titulo: 'Conversa encerrada', descricao: label }))
      .catch((e) => { window.showToast({ tipo: 'erro', titulo: 'Erro ao encerrar', descricao: e.message || 'Tente novamente.' }); setResolvedToday((n) => Math.max(0, n - 1)); refetch(); });
    setCloseModal(null);
  };

  const toggleSelect = (id) =>
  setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleAll = () =>
  setSelectedIds(selectedIds.length === sorted.length ? [] : sorted.map((c) => c.id));

  return (
    <Page
      title="Fila de transferências"
      subtitle={`${items.length} conversa${items.length === 1 ? '' : 's'} aguardando atendimento humano · atualizado há ${tick === 0 ? 'instantes' : `${tick * 10}s`}`}
      actions={
      <div className="row" style={{ gap: 6 }}>
          <button className="btn" onClick={() => { setLoading(true); refetch(); }} title="Recarregar">
            <Ic name="history" size={14} /> Recarregar
          </button>
        </div>
      }>
      
      {/* ============ KPI row ============ */}
      <div className="stat-grid">
        {loading ? Array.from({ length: 4 }).map((_, i) => <QKpiSkeleton key={i} />) : <>
        <QKpi
          icon="clock"
          label="Aguardando agora"
          value={items.length}
          accent="default"
          foot={`${highPrio} em alta prioridade`} />

        <QKpi
          icon="clock"
          label="Tempo médio de espera"
          value={`${avgWait} min`}
          accent={avgWait > 15 ? 'warn' : 'ok'}
          foot="meta < 10 min" />

        <QKpi
          icon="flag"
          label="Maior espera"
          value={`${longest} min`}
          accent={longest > 25 ? 'danger' : longest > 10 ? 'warn' : 'ok'}
          foot={longestC ? longestC.client : '—'} />

        <QKpi
          icon="check"
          label="Atendidas hoje (saídas da fila)"
          value={resolvedToday}
          accent="ai"
          foot={resolvedToday + items.length ? `${Math.round(resolvedToday / (resolvedToday + items.length) * 100)}% taxa de resolução` : 'nesta sessão'} />
        </>}
      </div>

      {/* ============ Filter bar ============ */}
      <div className="card" style={{ padding: '12px 14px', position: 'sticky', top: 0, zIndex: 4 }}>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200, maxWidth: 360 }}>
            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }}>
              <Ic name="search" size={15} />
            </span>
            <input
              className="input"
              style={{ paddingLeft: 40, height: 34 }}
              placeholder="Buscar por cliente ou mensagem..."
              value={search}
              onChange={(e) => setSearch(e.target.value)} />
            
          </div>

          {/* Channel chips */}
          <ChannelChips
            value={filterChannel}
            onChange={setFilterChannel}
            options={[
            ['all', 'Todos', null],
            ['whatsapp', 'WhatsApp', 'whatsapp'],
            ['instagram', 'Instagram', 'instagram'],
            ['facebook', 'Facebook', 'facebook']]
            }
            counts={channelCount} />
          

          <select className="input" style={{ width: 200, height: 34 }} value={filterReason} onChange={(e) => setFilterReason(e.target.value)}>
            <option value="all">Todos os motivos</option>
            {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>

          <select className="input" style={{ width: 160, height: 34 }} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="all">Todas prioridades</option>
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>

          <div className="spacer" />

          <select className="input" style={{ width: 180, height: 34 }} value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="wait-desc">Maior espera primeiro</option>
            <option value="wait-asc">Menor espera primeiro</option>
            <option value="priority">Por prioridade</option>
          </select>

          <div className="row" style={{ gap: 0, border: '1px solid var(--border)', borderRadius: 8, padding: 2 }}>
            <button
              onClick={() => setViewMode('list')}
              className="btn-icon"
              title="Lista"
              style={{
                height: 28, width: 32, padding: 0, border: 0,
                background: viewMode === 'list' ? 'var(--surface-3)' : 'transparent',
                color: viewMode === 'list' ? 'var(--text)' : 'var(--text-muted)',
                cursor: 'pointer', borderRadius: 6,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
              }}>
              <Ic name="list" size={14} />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className="btn-icon"
              title="Cartões"
              style={{
                height: 28, width: 32, padding: 0, border: 0,
                background: viewMode === 'cards' ? 'var(--surface-3)' : 'transparent',
                color: viewMode === 'cards' ? 'var(--text)' : 'var(--text-muted)',
                cursor: 'pointer', borderRadius: 6,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
              }}>
              <Ic name="dashboard" size={14} />
            </button>
          </div>
        </div>

        {/* Active filters chips + select all */}
        {(filterChannel !== 'all' || filterReason !== 'all' || filterPriority !== 'all' || search) &&
        <div className="row" style={{ gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <span className="muted" style={{ fontSize: 'var(--type-xs)' }}>Filtros ativos:</span>
            {search &&
          <span className="chip">"{search}" <Ic name="x" size={10} style={{ cursor: 'pointer' }} onClick={() => setSearch('')} /></span>
          }
            {filterChannel !== 'all' &&
          <span className="chip">{filterChannel} <Ic name="x" size={10} style={{ cursor: 'pointer' }} onClick={() => setFilterChannel('all')} /></span>
          }
            {filterReason !== 'all' &&
          <span className="chip">{filterReason} <Ic name="x" size={10} style={{ cursor: 'pointer' }} onClick={() => setFilterReason('all')} /></span>
          }
            {filterPriority !== 'all' &&
          <span className="chip">prioridade {filterPriority} <Ic name="x" size={10} style={{ cursor: 'pointer' }} onClick={() => setFilterPriority('all')} /></span>
          }
            <button
            className="btn btn-ghost"
            style={{ height: 24, padding: '0 8px', fontSize: 'var(--type-xs)' }}
            onClick={() => {setSearch('');setFilterChannel('all');setFilterReason('all');setFilterPriority('all');}}>
            
              Limpar
            </button>
          </div>
        }
      </div>

      {/* ============ Bulk action bar ============ */}
      {selectedIds.length > 0 &&
      <div
        className="card row"
        style={{
          padding: '10px 14px', gap: 10,
          background: 'color-mix(in oklab, var(--accent) 8%, var(--surface))',
          borderColor: 'color-mix(in oklab, var(--accent) 30%, var(--border))',
          position: 'sticky', top: 92, zIndex: 3,
          animation: 'pop .18s ease'
        }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent)', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>
            {selectedIds.length}
          </span>
          <span style={{ fontWeight: 500 }}>
            {selectedIds.length} conversa{selectedIds.length > 1 ? 's' : ''} selecionada{selectedIds.length > 1 ? 's' : ''}
          </span>
          <div className="spacer" />
          <button className="btn btn-sm fin-btn-back" onClick={() => setSelectedIds([])}>Voltar</button>
          <button className="btn btn-sm" onClick={() => setReturnModal({ bulk: true })}>
            <Ic name="sparkles" size={13} /> Devolver à IA
          </button>
          <button className="btn btn-sm" onClick={() => setAssignModal({ bulk: true })}>
            <Ic name="team" size={13} /> Atribuir
          </button>
          <button className="btn btn-sm btn-primary" onClick={handleBulkAssume}>
            <Ic name="arrow-right" size={13} /> Assumir todas
          </button>
        </div>
      }

      {/* ============ Queue list ============ */}
      {loading ?
      <div
        className="queue-scroll"
        style={{
          display: 'flex', flexDirection: 'column', gap: 4,
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 360px)',
          padding: 4,
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 10
        }}>
        {Array.from({ length: skelCount('fila') }).map((_, i) => <QueueRowSkeleton key={i} />)}
      </div> :
      sorted.length === 0 ?
      <EmptyState
        icon="clock"
        title={items.length === 0 ? 'Fila vazia 🎉' : 'Nenhuma conversa nos filtros atuais'}
        desc={items.length === 0 ?
        'Quando o agente IA precisar transferir uma conversa, ela aparecerá aqui.' :
        'Tente ajustar os filtros ou limpe a busca.'} /> :

      viewMode === 'list' ?
      <div className="col" style={{ gap: 0 }}>
          {/* select-all header */}
          <div
          className="row"
          style={{
            padding: '10px 16px', gap: 12,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            marginBottom: 6
          }}>
          
            <Checkbox
            checked={selectedIds.length === sorted.length && sorted.length > 0}
            indeterminate={selectedIds.length > 0 && selectedIds.length < sorted.length}
            onChange={toggleAll} />
          
            <span style={{ fontSize: 'var(--type-xs)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
              {sorted.length} conversa{sorted.length > 1 ? 's' : ''}
            </span>
            <div className="spacer" />
            <span className="muted" style={{ fontSize: 'var(--type-xs)' }}>Ordenado por: {sort === 'wait-desc' ? 'maior espera' : sort === 'wait-asc' ? 'menor espera' : 'prioridade'}</span>
          </div>

          {/* scrollable list — each row is its own card with 4px gap */}
          <div
          className="queue-scroll"
          style={{
            display: 'flex', flexDirection: 'column', gap: 4,
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 360px)',
            padding: 4,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 10
          }}>
          
            {sorted.map((c) =>
          <QueueRow
            key={c.id}
            conv={c}
            selected={selectedIds.includes(c.id)}
            onToggleSelect={() => toggleSelect(c.id)}
            onAssume={() => handleAssume(c)}
            onAssign={() => setAssignModal(c)}
            onReturn={() => setReturnModal(c)}
            onClose={() => setCloseModal(c)}
            onPreview={() => setPreviewConv(c)}
            reasonColor={REASON_COLORS[c.reason]} />

          )}
          </div>
          <style>{`
            .queue-scroll::-webkit-scrollbar { width: 8px; }
            .queue-scroll::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 4px; }
            .queue-scroll::-webkit-scrollbar-track { background: transparent; }
          `}</style>
        </div> :

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--pad-3)' }}>
          {sorted.map((c) =>
        <QueueCard
          key={c.id}
          conv={c}
          selected={selectedIds.includes(c.id)}
          onToggleSelect={() => toggleSelect(c.id)}
          onAssume={() => handleAssume(c)}
          onAssign={() => setAssignModal(c)}
          onReturn={() => setReturnModal(c)}
          onClose={() => setCloseModal(c)}
          onPreview={() => setPreviewConv(c)}
          reasonColor={REASON_COLORS[c.reason]} />

        )}
        </div>
      }

      {/* ============ Modals ============ */}
      {assignModal &&
      <AssignToColleagueModal
        target={assignModal}
        team={assignTeam}
        onClose={() => setAssignModal(null)}
        onConfirm={({ memberId, memberName, note }) => {
          if (assignModal.bulk) handleAssign({ memberId, memberName, bulk: true, note });else
          handleAssign({ memberId, memberName, conv: assignModal, note });
        }} />

      }
      {returnModal &&
      <ReturnToAIModal
        target={returnModal}
        onClose={() => setReturnModal(null)}
        onConfirm={({ reason }) => {
          if (returnModal.bulk) handleReturn({ reason, bulk: true });else
          handleReturn({ reason, conv: returnModal });
        }} />

      }
      {closeModal &&
      <CloseQueueConvModal
        conv={closeModal}
        onClose={() => setCloseModal(null)}
        onConfirm={({ label }) => handleClose({ label, conv: closeModal })} />

      }
      {previewConv && (
        <QueueConversation
          raw={previewConv._raw}
          onClose={() => setPreviewConv(null)}
          onChanged={refetch} />
      )}

    </Page>);

}

/* ===================================================================
   Conversa REAL da fila — reaproveita o MESMO ConvThread do chatbot.
   Rodapé/composer, transferir, encerrar, emoji, áudio, mídia e respostas
   rápidas ficam IDÊNTICOS ao inbox (é o mesmo componente). Quando a conversa
   está pendente, o próprio ConvThread mostra o botão "Atender" (assumir).
   =================================================================== */
function QueueConversation({ raw, onClose, onChanged }) {
  const [composing, setComposing] = React.useState('');
  const [aiOpen, setAiOpen] = React.useState(false); // a ficha abre POR CIMA do chat -> nasce fechada (cai no bate-papo)
  const conv = React.useMemo(() => (raw && typeof dbContatoToConv === 'function') ? dbContatoToConv(raw) : null, [raw]);
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!conv) return null;
  const leave = () => { onChanged && onChanged(); onClose && onClose(); };
  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', justifyContent: 'flex-end', animation: 'popIn .14s ease' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,.45)' }} />
      <div style={{
        position: 'relative', height: '100%', width: 'min(560px, 96vw)',
        display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', minHeight: 0, overflow: 'hidden',
        background: 'var(--surface)', boxShadow: '-12px 0 40px rgba(15,23,42,.18)',
      }}>
        <ConvThread
          conv={conv}
          composing={composing}
          setComposing={setComposing}
          onOpenContext={() => setAiOpen(true)}
          aiOpen={aiOpen}
          onToggleAI={() => setAiOpen((o) => !o)}
          onConvChanged={onChanged}
          onSent={() => {}}
          onLeave={leave}
          onBack={onClose} />
        {/* Ficha do cliente: abre POR CIMA da conversa (mesmo efeito de slide), com X pra
            fechar e voltar ao bate-papo. Fica clipada fora da tela (translateX) quando fechada. */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 5, background: 'var(--surface)',
          display: 'flex', flexDirection: 'column', minHeight: 0,
          transform: aiOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform .28s ease',
          boxShadow: aiOpen ? '-12px 0 40px rgba(15,23,42,.18)' : 'none',
          pointerEvents: aiOpen ? 'auto' : 'none',
        }}>
          <div className="row" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', gap: 8, flexShrink: 0, background: 'var(--surface)' }}>
            <span style={{ fontWeight: 600, fontSize: 'var(--type-sm)' }}>Ficha do cliente</span>
            <div className="spacer" />
            <button className="btn btn-ghost btn-icon" onClick={() => setAiOpen(false)} title="Fechar ficha" style={{ width: 30, height: 30 }}><Ic name="x" size={16} /></button>
          </div>
          <AIPanel conv={conv} setComposing={setComposing} inline onDataChanged={onChanged} />
        </div>
      </div>
    </div>, document.body);
}

/* ===================================================================
   Sub-components
   =================================================================== */

function ChannelChips({ value, onChange, options, counts }) {
  const refs = React.useRef({});
  const [pill, setPill] = React.useState({ left: 0, width: 0, ready: false });

  const updatePill = React.useCallback(() => {
    const el = refs.current[value];
    if (!el) return;
    setPill({ left: el.offsetLeft, width: el.offsetWidth, ready: true });
  }, [value]);

  React.useLayoutEffect(() => {
    updatePill();
  }, [updatePill]);

  React.useEffect(() => {
    const onResize = () => updatePill();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updatePill]);

  return (
    <div
      className="row"
      style={{
        position: 'relative',
        gap: 4,

        borderRadius: 8,
        padding: 3,
        border: '1px solid var(--border)', background: 'var(--surface)'
      }}>
      
      {/* sliding indicator */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 3,
          bottom: 3,
          left: pill.left,
          width: pill.width,
          background: '#E7F4E9',
          borderRadius: 6,
          boxShadow: 'inset 0 0 0 1px color-mix(in oklab, #16a34a 22%, transparent)',
          transition: pill.ready ? 'left .22s cubic-bezier(.4,.0,.2,1), width .22s cubic-bezier(.4,.0,.2,1)' : 'none',
          opacity: pill.ready ? 1 : 0,
          pointerEvents: 'none',
          zIndex: 0
        }} />
      
      {options.map(([id, l, ic]) => {
        const on = value === id;
        const n = counts(id);
        return (
          <div
            key={id}
            ref={(el) => {refs.current[id] = el;}}
            onClick={() => onChange(id)}
            style={{
              position: 'relative',
              zIndex: 1,
              padding: '4px 10px',
              fontSize: 'var(--type-sm)',
              fontWeight: 500,
              borderRadius: 6,
              background: 'transparent',
              color: on ? '#166534' : 'var(--text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              transition: 'color .18s ease',
              userSelect: 'none'
            }}>
            
            {ic && <ChannelIcon ch={ic} size={12} />} {l}
            <span className="tnum muted" style={{ fontSize: 11 }}>({n})</span>
          </div>);

      })}
    </div>);

}

function QKpi({ icon, label, value, accent = 'default', foot }) {
  const map = {
    default: { bg: 'var(--surface-3)', fg: 'var(--text-muted)' },
    ok: { bg: 'color-mix(in oklab, var(--accent) 14%, white)', fg: 'var(--accent-700)' },
    warn: { bg: 'color-mix(in oklab, var(--hue-amber) 18%, white)', fg: '#854d0e' },
    danger: { bg: 'color-mix(in oklab, var(--hue-rose)  16%, white)', fg: '#9f1239' },
    ai: { bg: 'var(--ai-soft)', fg: 'var(--ai-strong)' }
  };
  const m = map[accent] || map.default;
  return (
    <div className="stat">
      <div className="stat-label">
        <span>{label}</span>
        <span className="stat-icon" style={{ background: m.bg, color: m.fg }}><Ic name={icon} size={15} /></span>
      </div>
      <div className="stat-value tnum" style={{ color: m.fg }}>{value}</div>
      {foot && <div className="stat-foot">{foot}</div>}
    </div>);

}

// Skeleton do KPI — mesma estrutura/classes do QKpi (dentro do mesmo .stat-grid)
function QKpiSkeleton() {
  return (
    <div className="stat">
      <div className="stat-label">
        <Skeleton w="55%" h={12} />
        <span className="stat-icon" style={{ background: 'var(--surface-3)' }}><Skeleton w={15} h={15} r={4} /></span>
      </div>
      <div className="stat-value"><Skeleton w={80} h={28} /></div>
      <div className="stat-foot"><Skeleton w="70%" h={10} /></div>
    </div>);

}

function Checkbox({ checked, indeterminate, onChange }) {
  return (
    <span
      onClick={(e) => {e.stopPropagation();onChange?.();}}
      style={{
        width: 18, height: 18, borderRadius: 5,
        border: '1.5px solid ' + (checked || indeterminate ? 'var(--accent)' : 'var(--border-strong)'),
        background: checked || indeterminate ? 'var(--accent)' : 'var(--surface)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, cursor: 'pointer',
        transition: 'border-color .12s, background .12s'
      }}>
      
      {checked && <Ic name="check" size={12} style={{ color: 'white' }} />}
      {!checked && indeterminate && <span style={{ width: 8, height: 2, background: 'white', borderRadius: 1 }} />}
    </span>);

}

function WaitBadge({ minutes }) {
  let bg = 'color-mix(in oklab, var(--accent) 14%, white)';
  let fg = 'var(--accent-700)';
  if (minutes > 25) {bg = 'color-mix(in oklab, var(--hue-rose) 16%, white)';fg = '#9f1239';} else
  if (minutes > 10) {bg = 'color-mix(in oklab, var(--hue-amber) 18%, white)';fg = '#854d0e';}
  return (
    <span className="tnum" style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px', borderRadius: 999,
      background: bg, color: fg,
      fontSize: 'var(--type-xs)', fontWeight: 600
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: fg, animation: minutes > 25 ? 'pulse 1.2s ease-in-out infinite' : 'none' }} />
      {minutes} min
    </span>);

}

function PriorityBadge({ priority }) {
  const map = {
    alta: { c: '#dc2626', l: 'Alta', ic: 'flag' },
    media: { c: '#d97706', l: 'Média', ic: null },
    baixa: { c: '#16a34a', l: 'Baixa', ic: null }
  };
  const m = map[priority];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 7px', borderRadius: 4,
      background: `color-mix(in oklab, ${m.c} 14%, transparent)`,
      color: m.c, fontSize: 10, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase'
    }}>
      {m.ic && <Ic name={m.ic} size={10} />} {m.l}
    </span>);

}

function ReasonChip({ reason, info }) {
  if (!info) return <span className="chip">{reason}</span>;
  return (
    <span className="chip" style={{ background: `color-mix(in oklab, ${info.c} 14%, transparent)`, color: info.c }}>
      <Ic name={info.ic} size={11} /> {reason}
    </span>);

}

function ActionMenu({ items }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {if (ref.current && !ref.current.contains(e.target)) setOpen(false);};
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="btn btn-ghost btn-icon" onClick={(e) => {e.stopPropagation();setOpen((o) => !o);}} title="Mais ações">
        <Ic name="more" size={16} />
      </button>
      {open &&
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0,
          width: 220, background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, boxShadow: 'var(--shadow-lg)', zIndex: 30, padding: 4,
          animation: 'popIn .14s ease'
        }}>
          {items.map((it, i) =>
        <div
          key={i}
          onClick={() => {setOpen(false);it.onClick?.();}}
          style={{
            padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 'var(--type-sm)',
            color: it.danger ? '#dc2626' : 'var(--text)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = it.danger ? 'color-mix(in oklab, #dc2626 8%, white)' : 'var(--surface-2)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          
              <Ic name={it.icon} size={14} />
              {it.label}
            </div>
        )}
        </div>
      }
    </div>);

}

function QueueRow({ conv, selected, onToggleSelect, onAssume, onAssign, onReturn, onClose, onPreview, reasonColor }) {
  return (
    <div
      className="row"
      onClick={onPreview}
      style={{
        padding: '14px 16px', gap: 14,
        border: '1px solid ' + (selected ? 'color-mix(in oklab, var(--accent) 30%, var(--border))' : 'var(--border)'),
        borderRadius: 10,
        background: selected ? 'color-mix(in oklab, var(--accent) 6%, var(--surface))' : 'var(--surface)',
        cursor: 'pointer',
        transition: 'background .12s, box-shadow .12s, border-color .12s',
        alignItems: 'flex-start',
        flexShrink: 0
      }}
      onMouseEnter={(e) => {if (!selected) {e.currentTarget.style.background = 'var(--surface)';e.currentTarget.style.boxShadow = '0 2px 10px rgba(15,23,42,.06)';e.currentTarget.style.borderColor = 'var(--border-strong)';}}}
      onMouseLeave={(e) => {if (!selected) {e.currentTarget.style.background = 'var(--surface)';e.currentTarget.style.boxShadow = 'none';e.currentTarget.style.borderColor = 'var(--border)';}}}>
      
      <Checkbox checked={selected} onChange={onToggleSelect} />

      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Avatar name={conv.client} src={conv.photo} size="lg" />
        <span style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: '50%', background: 'var(--surface)', border: '2px solid var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChannelIcon ch={conv.channel} size={13} />
        </span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row" style={{ gap: 8, marginBottom: 4 }}>
          <span style={{ fontWeight: 600 }}>{conv.client}</span>
          <PriorityBadge priority={conv.priority} />
          {conv.tag && <span className="chip" style={conv.tag === 'CLIENTE' ? { background: 'var(--accent-soft)', color: 'var(--accent-700)' } : {}}>{conv.tag}</span>}
          <div className="spacer" />
          <WaitBadge minutes={conv._wait} />
        </div>

        <div className="muted" style={{ fontSize: 'var(--type-sm)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          "{conv.preview}"
        </div>

        <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          <ReasonChip reason={conv.reason} info={reasonColor} />
          <span className="chip"><Ic name="clock" size={11} /> recebida {conv.lastTime}</span>
          <span className="chip"><Ic name="inbox" size={11} /> da IA</span>
        </div>

        <div className="row" style={{ gap: 8, padding: '8px 10px', background: 'var(--ai-soft)', border: '1px solid color-mix(in oklab, var(--ai) 24%, var(--border))', borderRadius: 8 }}>
          <Ic name="sparkles" size={14} style={{ color: 'var(--ai-strong)', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 'var(--type-sm)', color: 'var(--ai-strong)', lineHeight: 1.4 }}>
            <strong>Resumo da IA:</strong> AI em breve estará em funcionamento, e aqui você visualizará, o que ela lhe orientará antes do atendimento
          </div>
        </div>
      </div>

      <div className="col" style={{ gap: 6, flexShrink: 0, minWidth: 130 }} onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ gap: 4 }}>
          <button className="btn btn-sm" style={{ flex: 1, justifyContent: 'center', padding: '0 8px' }} onClick={onPreview} title="Ver conversa">
            <Ic name="eye" size={13} />
          </button>
          <button className="btn btn-sm" style={{ flex: 1, justifyContent: 'center', padding: '0 8px' }} onClick={onAssign} title="Atribuir">
            <Ic name="team" size={13} />
          </button>
          <ActionMenu items={[
          { icon: 'sparkles', label: 'Devolver à IA', onClick: onReturn },
          { icon: 'flag', label: 'Marcar urgente', onClick: () => {} },
          { icon: 'history', label: 'Ver histórico', onClick: onPreview },
          { icon: 'x', label: 'Encerrar conversa', onClick: onClose, danger: true }]
          } />
        </div>
      </div>
    </div>);

}

// Skeleton de linha — replica a estrutura/medidas do QueueRow (mesmo container/gap da lista)
function QueueRowSkeleton() {
  return (
    <div
      className="row"
      style={{
        padding: '14px 16px', gap: 14,
        border: '1px solid var(--border)',
        borderRadius: 10,
        background: 'var(--surface)',
        alignItems: 'flex-start',
        flexShrink: 0
      }}>

      <Skeleton w={18} h={18} r={5} />

      <Skeleton circle w={44} h={44} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row" style={{ gap: 8, marginBottom: 4 }}>
          <Skeleton w={140} h={14} />
          <Skeleton w={52} h={16} r={4} />
          <div className="spacer" />
          <Skeleton w={70} h={20} r={999} />
        </div>

        <div style={{ marginBottom: 8 }}>
          <Skeleton w="80%" h={10} />
        </div>

        <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          <Skeleton w={120} h={20} r={999} />
          <Skeleton w={100} h={20} r={999} />
          <Skeleton w={64} h={20} r={999} />
        </div>

        <div className="row" style={{ gap: 8, padding: '8px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8 }}>
          <Skeleton w={14} h={14} r={4} style={{ marginTop: 2 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Skeleton w="92%" h={9} />
            <Skeleton w="60%" h={9} />
          </div>
        </div>
      </div>

      <div className="col" style={{ gap: 6, flexShrink: 0, minWidth: 130 }}>
        <Skeleton w="100%" h={30} r={8} />
        <div className="row" style={{ gap: 4 }}>
          <Skeleton w={40} h={30} r={8} style={{ flex: 1 }} />
          <Skeleton w={40} h={30} r={8} style={{ flex: 1 }} />
          <Skeleton w={40} h={30} r={8} style={{ flex: 1 }} />
        </div>
      </div>
    </div>);

}

function QueueCard({ conv, selected, onToggleSelect, onAssume, onAssign, onReturn, onClose, onPreview, reasonColor }) {
  return (
    <div
      className="card card-pad"
      style={{
        display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer',
        background: selected ? 'color-mix(in oklab, var(--accent) 6%, var(--surface))' : 'var(--surface)',
        borderColor: selected ? 'color-mix(in oklab, var(--accent) 30%, var(--border))' : 'var(--border)',
        transition: 'background .12s, border-color .12s'
      }}
      onClick={onPreview}>
      
      <div className="row" style={{ gap: 10 }}>
        <Checkbox checked={selected} onChange={onToggleSelect} />
        <div style={{ position: 'relative' }}>
          <Avatar name={conv.client} src={conv.photo} size="lg" />
          <span style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: '50%', background: 'var(--surface)', border: '2px solid var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChannelIcon ch={conv.channel} size={13} />
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>{conv.client}</div>
          <div className="row" style={{ gap: 4, marginTop: 4 }}>
            <PriorityBadge priority={conv.priority} />
            {conv.tag && <span className="chip" style={conv.tag === 'CLIENTE' ? { background: 'var(--accent-soft)', color: 'var(--accent-700)' } : {}}>{conv.tag}</span>}
          </div>
        </div>
        <WaitBadge minutes={conv._wait} />
      </div>

      <div className="muted" style={{ fontSize: 'var(--type-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        "{conv.preview}"
      </div>

      <ReasonChip reason={conv.reason} info={reasonColor} />

      <div className="row" style={{ gap: 8, padding: '8px 10px', background: 'var(--ai-soft)', border: '1px solid color-mix(in oklab, var(--ai) 24%, var(--border))', borderRadius: 8 }}>
        <Ic name="sparkles" size={12} style={{ color: 'var(--ai-strong)', flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 'var(--type-xs)', color: 'var(--ai-strong)', lineHeight: 1.4 }}>
          AI em breve estará em funcionamento, e aqui você visualizará, o que ela lhe orientará antes do atendimento
        </div>
      </div>

      <div className="row" style={{ gap: 6, marginTop: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <button className="btn btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={onAssign} title="Atribuir">
          <Ic name="team" size={13} />
        </button>
        <ActionMenu items={[
        { icon: 'eye', label: 'Ver conversa', onClick: onPreview },
        { icon: 'sparkles', label: 'Devolver à IA', onClick: onReturn },
        { icon: 'flag', label: 'Marcar urgente', onClick: () => {} },
        { icon: 'x', label: 'Encerrar conversa', onClick: onClose, danger: true }]
        } />
      </div>
    </div>);

}

/* ===================================================================
   Modals
   =================================================================== */

function AssignToColleagueModal({ target, onClose, onConfirm, team: propTeam }) {
  const bulk = target && target.bulk;
  const [selected, setSelected] = React.useState(null);
  const [note, setNote] = React.useState('');
  const [q, setQ] = React.useState('');

  // Lista real (vinda da API) quando disponível; senão cai no mock TEAM.
  const team = (propTeam || (typeof TEAM !== 'undefined' ? TEAM : [])).
  filter((m) => m.status === 'ativo' && m.role !== 'Administrador');

  const filtered = q ?
  team.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()) || (m.role || '').toLowerCase().includes(q.toLowerCase())) :
  team;

  return (
    <Modal
      title={bulk ? 'Atribuir conversas selecionadas' : `Atribuir conversa de ${target.client}`}
      size="md"
      onClose={onClose}
      footer={<>
        <button className="btn fin-btn-back" onClick={onClose}>Voltar</button>
        <button
          className="btn btn-primary"
          disabled={!selected}
          onClick={() => selected && onConfirm({ memberId: selected.id, memberName: selected.name, note })}
          style={{ opacity: selected ? 1 : .5 }}>
          
          <Ic name="check" size={13} /> Atribuir{bulk ? ' todas' : ''}
        </button>
      </>}>
      
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }}>
          <Ic name="search" size={15} />
        </span>
        <input
          className="input"
          style={{ paddingLeft: 40 }}
          placeholder="Buscar colega..."
          value={q}
          onChange={(e) => setQ(e.target.value)} />
        
      </div>

      <div className="col" style={{ gap: 4, maxHeight: 280, overflow: 'auto', margin: '0 -4px', padding: '0 4px' }}>
        {filtered.length === 0 ?
        <div className="empty" style={{ padding: '24px 8px' }}>
            <div style={{ color: 'var(--text-faint)' }}>Nenhum colega encontrado.</div>
          </div> :
        filtered.map((m) => {
          const sel = selected?.id === m.id;
          return (
            <div
              key={m.id}
              onClick={() => setSelected(m)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                border: '1px solid ' + (sel ? 'var(--accent)' : 'var(--border)'),
                background: sel ? 'var(--accent-soft)' : 'var(--surface)',
                transition: 'border-color .12s, background .12s'
              }}>
              
              <Avatar name={m.name} size="sm" online />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 'var(--type-sm)' }}>{m.name}</div>
                <div className="muted" style={{ fontSize: 'var(--type-xs)' }}>{m.role}</div>
              </div>
              <span className="muted" style={{ fontSize: 'var(--type-xs)' }}>
                <Ic name="inbox" size={11} /> {Math.floor(Math.random() * 8) + 1} ativas
              </span>
              {sel && <Ic name="check" size={16} style={{ color: 'var(--accent-700)' }} />}
            </div>);

        })}
      </div>

      <label className="label" style={{ marginTop: 14 }}>Observação interna (opcional)</label>
      <textarea
        className="input"
        rows={2}
        placeholder="Ex: cliente já enviou orçamento, falta confirmar horário"
        value={note}
        onChange={(e) => setNote(e.target.value)} />
      
    </Modal>);

}

function ReturnToAIModal({ target, onClose, onConfirm }) {
  const bulk = target && target.bulk;
  const [reason, setReason] = React.useState('Cliente já foi atendido pela IA');
  const reasons = [
  'Cliente já foi atendido pela IA',
  'Pergunta simples — IA pode resolver',
  'Cliente perguntou novamente após resposta',
  'Transferência por engano',
  'Outro'];

  return (
    <Modal
      title={bulk ? 'Devolver conversas selecionadas à IA' : `Devolver para a IA: ${target.client}`}
      size="sm"
      onClose={onClose}
      footer={<>
        <button className="btn fin-btn-back" onClick={onClose}>Voltar</button>
        <button className="btn btn-primary" style={{ background: 'var(--ai)', borderColor: 'var(--ai)' }} onClick={() => onConfirm({ reason })}>
          <Ic name="sparkles" size={13} /> Devolver à IA
        </button>
      </>}>
      
      <div className="row" style={{ gap: 10, padding: 12, background: 'var(--ai-soft)', border: '1px solid color-mix(in oklab, var(--ai) 24%, var(--border))', borderRadius: 8, marginBottom: 14 }}>
        <Ic name="sparkles" size={18} style={{ color: 'var(--ai)', flexShrink: 0 }} />
        <div style={{ fontSize: 'var(--type-sm)', color: 'var(--ai-strong)' }}>
          A IA voltará a responder essa conversa. O cliente verá uma resposta automática avisando que o agente assumiu novamente.
        </div>
      </div>

      <label className="label">Motivo da devolução</label>
      <div className="col" style={{ gap: 6 }}>
        {reasons.map((r) =>
        <label key={r} className="row" style={{ gap: 8, padding: '8px 10px', border: '1px solid ' + (reason === r ? 'var(--accent)' : 'var(--border)'), borderRadius: 8, background: reason === r ? 'var(--accent-soft)' : 'var(--surface)', cursor: 'pointer' }}>
            <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} />
            <span style={{ fontSize: 'var(--type-sm)' }}>{r}</span>
          </label>
        )}
      </div>
    </Modal>);

}

function CloseQueueConvModal({ conv, onClose, onConfirm }) {
  const [label, setLabel] = React.useState('Sem resposta do cliente');
  const labels = [
  'Sem resposta do cliente',
  'Cliente desistiu',
  'Não era prospect',
  'Resolvido fora do canal',
  'Spam / inválido'];

  return (
    <Modal
      title={`Encerrar conversa com ${conv.client}`}
      size="sm"
      onClose={onClose}
      footer={<>
        <button className="btn fin-btn-back" onClick={onClose}>Voltar</button>
        <button className="btn btn-primary" style={{ background: '#dc2626', borderColor: '#dc2626' }} onClick={() => onConfirm({ label })}>
          <Ic name="x" size={13} /> Encerrar
        </button>
      </>}>
      
      <div className="muted" style={{ fontSize: 'var(--type-sm)', marginBottom: 12 }}>
        Selecione o motivo do encerramento. Isso ajuda nos relatórios de fila.
      </div>
      <div className="col" style={{ gap: 6 }}>
        {labels.map((l) =>
        <label key={l} className="row" style={{ gap: 8, padding: '8px 10px', border: '1px solid ' + (label === l ? 'var(--accent)' : 'var(--border)'), borderRadius: 8, background: label === l ? 'var(--accent-soft)' : 'var(--surface)', cursor: 'pointer' }}>
            <input type="radio" name="closeLabel" checked={label === l} onChange={() => setLabel(l)} />
            <span style={{ fontSize: 'var(--type-sm)' }}>{l}</span>
          </label>
        )}
      </div>
    </Modal>);

}

function QueuePreviewDrawer({ conv, reasonColor, transferAgents, transferDepts, onClose, onAssume, onReturnConfirm, onAssignConfirm, onCloseConfirm }) {
  const [assumed, setAssumed] = React.useState(false);
  const [showContact, setShowContact] = React.useState(false);
  const [contactClosing, setContactClosing] = React.useState(false);
  const [composing, setComposing] = React.useState('');
  const [menu, setMenu] = React.useState(null);          // 'emoji' | 'attach' | null
  const [recording, setRecording] = React.useState(false);
  const [showSlashPicker, setShowSlashPicker] = React.useState(false);
  const [popover, setPopover] = React.useState(null);    // 'return' | 'assign' | 'close' | null
  const [showContactPicker, setShowContactPicker] = React.useState(false);
  const [contactPickerClosing, setContactPickerClosing] = React.useState(false);
  const [showAppointment, setShowAppointment] = React.useState(false);
  const [appointmentClosing, setAppointmentClosing] = React.useState(false);
  const inputRef = React.useRef(null);
  const fileInputs = {
    foto:      React.useRef(null),
    video:     React.useRef(null),
    documento: React.useRef(null),
    audio:     React.useRef(null),
  };
  const [messages, setMessages] = React.useState([
    { from: 'client', text: conv.preview, time: conv.lastTime },
    { from: 'agent',  text: 'Oi! Posso te ajudar. Você gostaria de marcar uma sessão de avaliação?', time: conv.lastTime, ai: true },
    { from: 'client', text: 'Sim, mas quero falar com alguém antes. Tem como?', time: conv.lastTime },
    { from: 'agent',  text: 'Claro, vou transferir agora para um atendente humano.', time: conv.lastTime, ai: true, transfer: true },
  ]);
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  const fmtTime = () => { const d = new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };
  const fmtRec = (s) => { const m = Math.floor(s/60); const sec = Math.floor(s%60); return `${m}:${String(sec).padStart(2,'0')}`; };
  const addAgentMsg = (m) => setMessages(prev => [...prev, { from: 'agent', time: fmtTime(), ...m }]);

  const handleAssumeClick = () => {
    setAssumed(true);
    setMessages(m => [...m, { from: 'system', text: 'Você assumiu esta conversa' }]);
    onAssume?.();
  };

  const sendMsg = () => {
    const t = composing.trim();
    if (!t) return;
    addAgentMsg({ kind: 'text', text: t });
    setComposing('');
  };

  const onComposingChange = (e) => {
    const v = e.target.value;
    setComposing(v);
    if (v.endsWith('/') && (v.length === 1 || /\s$/.test(v.charAt(v.length - 2)))) {
      setShowSlashPicker(true);
    } else if (!v.includes('/')) {
      setShowSlashPicker(false);
    }
  };

  const onKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } };
  const onPickEmoji = (em) => { setComposing(c => (c || '') + em); inputRef.current?.focus(); };
  const onPickAttach = (o) => {
    setMenu(null);
    if (o.id === 'contato') { setShowContactPicker(true); return; }
    fileInputs[o.id]?.current?.click();
  };

  const fmtSize = (bytes) => {
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    if (bytes >= 1024)        return `${Math.round(bytes / 1024)} KB`;
    return `${bytes} B`;
  };

  const onFileChosen = (kindId, e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const url = URL.createObjectURL(f);
    const size = fmtSize(f.size);
    if (kindId === 'foto')           addAgentMsg({ kind: 'image', filename: f.name, meta: `Imagem · ${size}`, url });
    else if (kindId === 'video')     addAgentMsg({ kind: 'video', filename: f.name, meta: `Vídeo · ${size}`,  url });
    else if (kindId === 'audio')     addAgentMsg({ kind: 'audio', filename: f.name, meta: size, url });
    else if (kindId === 'documento') {
      const ext = (f.name.split('.').pop() || 'doc').toUpperCase();
      addAgentMsg({ kind: 'doc', filename: f.name, meta: `${ext} · ${size}`, url, ext });
    }
  };

  const closeContact = () => {
    setContactClosing(true);
    setTimeout(() => { setShowContact(false); setContactClosing(false); }, 260);
  };

  const closeContactPicker = () => {
    setContactPickerClosing(true);
    setTimeout(() => { setShowContactPicker(false); setContactPickerClosing(false); }, 260);
  };

  const closeAppointment = () => {
    setAppointmentClosing(true);
    setTimeout(() => { setShowAppointment(false); setAppointmentClosing(false); }, 260);
  };

  return (
    <>
      <Drawer
        title={conv.client}
        subtitle={
          assumed
            ? <span>{conv.tag || 'PROSPECT'} · {conv.channel} · <span style={{ color: '#15803d', fontWeight: 600 }}>você atendendo</span></span>
            : `${conv.tag || 'PROSPECT'} · ${conv.channel} · aguardando há ${conv._wait} min`
        }
        width={560}
        onClose={onClose}
        leftHead={<Avatar name={conv.client} src={conv.photo} />}
        footer={
          <div style={{ position: 'relative', width: '100%', zIndex: 5 }}>
            {/* Inline popovers anchored above the footer */}
            {popover === 'return' && (
              <ReturnPopover
                conv={conv}
                anchor={assumed ? 'left' : 'left'}
                onClose={() => setPopover(null)}
                onConfirm={(payload) => { setPopover(null); onReturnConfirm?.(payload); }}
              />
            )}
            {popover === 'assign' && (
              <TransferPopover
                anchor={assumed ? 'left-2' : 'left-2'}
                agents={transferAgents}
                depts={transferDepts}
                onClose={() => setPopover(null)}
                onConfirm={(payload) => { setPopover(null); onAssignConfirm?.(payload); }}
              />
            )}
            {popover === 'close' && (
              <ClosePopover
                conv={conv}
                onClose={() => setPopover(null)}
                onConfirm={(payload) => { setPopover(null); onCloseConfirm?.(payload); }}
              />
            )}
            {showSlashPicker && (
              <SlashPicker
                initialQuery={composing.match(/(?:^|\s)\/([^\s]*)$/)?.[1] || ''}
                onPick={(r) => {
                  const body = r.body || r.text || '';
                  addAgentMsg({ kind: 'text', text: body });
                  setComposing('');
                  setShowSlashPicker(false);
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
                onClose={() => setShowSlashPicker(false)}
              />
            )}

            {assumed ? (
              <div className="col" style={{ gap: 8, width: '100%' }}>
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn btn-sm btn-ghost" data-on={popover === 'return'} onClick={() => setPopover(popover === 'return' ? null : 'return')}>
                    <Ic name="sparkles" size={13} /> Devolver à IA
                  </button>
                  <button className="btn btn-sm btn-ghost" data-on={popover === 'assign'} onClick={() => setPopover(popover === 'assign' ? null : 'assign')}>
                    <Ic name="team" size={13} /> Transferir
                  </button>
                  <div className="spacer" />
                  <button className="btn btn-sm btn-ghost" data-on={popover === 'close'} onClick={() => setPopover(popover === 'close' ? null : 'close')}>
                    <Ic name="check" size={13} /> Encerrar
                  </button>
                </div>
                <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                  <div style={{ position: 'relative' }}>
                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={() => setMenu(menu === 'emoji' ? null : 'emoji')}
                      style={{ width: 30, height: 30, background: menu === 'emoji' ? 'var(--accent-soft)' : 'transparent', color: menu === 'emoji' ? 'var(--accent)' : undefined }}
                      title="Emoji"
                    >
                      <Ic name="smile" size={17} />
                    </button>
                    {menu === 'emoji' && typeof EmojiPicker !== 'undefined' && <EmojiPicker onPick={onPickEmoji} onClose={() => setMenu(null)} />}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={() => setMenu(menu === 'attach' ? null : 'attach')}
                      style={{ width: 30, height: 30, background: menu === 'attach' ? 'var(--accent-soft)' : 'transparent', color: menu === 'attach' ? 'var(--accent)' : undefined }}
                      title="Anexar"
                    >
                      <Ic name="paperclip" size={17} />
                    </button>
                    {menu === 'attach' && typeof AttachPicker !== 'undefined' && <AttachPicker onPick={onPickAttach} onClose={() => setMenu(null)} />}
                  </div>
                  <button
                    className="btn btn-ghost btn-icon"
                    onClick={() => { setMenu(null); setRecording(true); }}
                    title="Gravar áudio"
                    style={{ width: 30, height: 30, background: recording ? 'color-mix(in oklab, #ef4444 14%, transparent)' : 'transparent', color: recording ? '#dc2626' : undefined }}
                  >
                    <Ic name="mic" size={17} />
                  </button>
                  {recording && typeof VoiceRecorder !== 'undefined' ? (
                    <VoiceRecorder
                      onCancel={() => setRecording(false)}
                      onSend={(t) => { setRecording(false); addAgentMsg({ kind: 'audio', dur: fmtRec(t) }); }}
                    />
                  ) : (
                    <>
                      <input
                        ref={inputRef}
                        className="input"
                        style={{ flex: 1 }}
                        placeholder="Digite sua mensagem · / para respostas rápidas · Enter envia"
                        value={composing}
                        onChange={onComposingChange}
                        onKeyDown={onKeyDown}
                      />
                      <button
                        className="btn btn-primary btn-icon"
                        onClick={sendMsg}
                        disabled={!composing.trim()}
                        style={{ width: 36, height: 36, opacity: composing.trim() ? 1 : 0.5 }}
                        title="Enviar"
                      >
                        <Ic name="send" size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="row" style={{ gap: 8, width: '100%' }}>
                <button className="btn" data-on={popover === 'return'} onClick={() => setPopover(popover === 'return' ? null : 'return')}>
                  <Ic name="sparkles" size={13} /> Devolver à IA
                </button>
                <button className="btn" data-on={popover === 'assign'} onClick={() => setPopover(popover === 'assign' ? null : 'assign')}>
                  <Ic name="team" size={13} /> Atribuir
                </button>
                <div className="spacer" />
                <ActionButton action="proximo" size="md" label="Assumir conversa" onClick={handleAssumeClick} />
              </div>
            )}
          </div>
        }
      >
        <style>{`.drawer-bd { padding-bottom: 16px !important; }`}</style>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
          {/* status row + contact panel toggle */}
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {assumed ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 999, background: 'color-mix(in oklab, #16a34a 14%, white)', color: '#15803d', fontSize: 'var(--type-xs)', fontWeight: 600 }}>
                <Ic name="user" size={11} /> Você atendendo
              </span>
            ) : (
              <WaitBadge minutes={conv._wait} />
            )}
            <PriorityBadge priority={conv.priority} />
            <ReasonChip reason={conv.reason} info={reasonColor} />
            <div className="spacer" />
            <button
              className="btn btn-ghost btn-icon"
              title="Painel do contato"
              onClick={() => setShowContact(true)}
              style={{ width: 34, height: 34, background: 'var(--accent-soft)', color: 'var(--accent-700)', border: '1px solid color-mix(in oklab, var(--accent) 22%, var(--border))' }}
            >
              <Ic name="card-id" size={15} />
            </button>
          </div>

          {/* AI summary */}
          <div style={{ padding: 12, background: 'var(--ai-soft)', border: '1px solid color-mix(in oklab, var(--ai) 24%, var(--border))', borderRadius: 10 }}>
            <div className="row" style={{ gap: 6, marginBottom: 6 }}>
              <Ic name="sparkles" size={14} style={{ color: 'var(--ai-strong)' }} />
              <span style={{ fontSize: 'var(--type-xs)', fontWeight: 700, letterSpacing: '.05em', color: 'var(--ai-strong)', textTransform: 'uppercase' }}>Resumo da IA</span>
            </div>
            <div style={{ fontSize: 'var(--type-sm)', color: 'var(--ai-strong)', lineHeight: 1.5 }}>
              AI em breve estará em funcionamento, e aqui você visualizará, o que ela lhe orientará antes do atendimento
            </div>
          </div>

          {/* Chat messages */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div style={{ fontSize: 'var(--type-xs)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 8 }}>
              Conversa
            </div>
            <div ref={scrollRef} className="col" style={{ gap: 8, flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '4px 2px' }}>
              {messages.map((m, i) => {
                if (m.from === 'system') {
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'center' }}>
                      <div style={{ padding: '4px 12px', borderRadius: 999, background: 'color-mix(in oklab, #16a34a 14%, white)', color: '#15803d', fontSize: 11, fontWeight: 600, letterSpacing: '.03em' }}>
                        <Ic name="user" size={10} /> {m.text}
                      </div>
                    </div>
                  );
                }
                const isClient = m.from === 'client';
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: isClient ? 'flex-start' : 'flex-end' }}>
                    <div style={{
                      maxWidth: '78%', padding: '8px 12px', borderRadius: 12,
                      borderBottomLeftRadius: isClient ? 4 : 12,
                      borderBottomRightRadius: isClient ? 12 : 4,
                      background: isClient ? 'var(--surface-3)' : m.ai ? 'var(--ai)' : 'var(--accent)',
                      color: isClient ? 'var(--text)' : 'white',
                      fontSize: 'var(--type-sm)',
                    }}>
                      {m.ai && <div style={{ fontSize: 10, fontWeight: 700, opacity: .85, letterSpacing: '.04em', marginBottom: 3 }}>JÚLIA · IA</div>}
                      {m.kind === 'audio' ? (
                        <div className="row" style={{ gap: 8 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Ic name="play" size={11} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {Array.from({ length: 16 }).map((_, j) => (
                              <div key={j} style={{ width: 2, height: `${4 + Math.sin(j) * 6 + 6}px`, background: 'rgba(255,255,255,.7)', borderRadius: 1 }} />
                            ))}
                          </div>
                          <span style={{ fontSize: 11, opacity: .85 }}>{m.dur || m.meta || ''}</span>
                        </div>
                      ) : m.kind === 'image' ? (
                        <div style={{ minWidth: 180, maxWidth: 240 }}>
                          <img src={m.url} alt={m.filename} style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
                          <div style={{ marginTop: 6, fontSize: 10, opacity: .85 }}>{m.meta}</div>
                        </div>
                      ) : m.kind === 'video' ? (
                        <div style={{ minWidth: 200, maxWidth: 280 }}>
                          <video src={m.url} controls style={{ width: '100%', maxHeight: 220, borderRadius: 8, display: 'block', background: '#000' }} />
                          <div style={{ marginTop: 6, fontSize: 10, opacity: .85 }}>{m.filename} · {m.meta?.split('·').pop()?.trim()}</div>
                        </div>
                      ) : m.kind === 'doc' ? (
                        <div className="row" style={{ gap: 8 }}>
                          <div style={{ width: 32, height: 38, background: 'rgba(255,255,255,.2)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700 }}>{m.ext || 'PDF'}</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 'var(--type-xs)' }}>{m.filename}</div>
                            <div style={{ fontSize: 10, opacity: .8 }}>{m.meta}</div>
                          </div>
                        </div>
                      ) : m.kind === 'contact' ? (
                        <div style={{ minWidth: 200 }}>
                          <div className="row" style={{ gap: 8 }}>
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,.22)', color: m.from === 'client' ? 'var(--text)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Ic name="user" size={15} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, lineHeight: 1.2, fontSize: 'var(--type-xs)' }}>{m.contactName}</div>
                              <div style={{ fontSize: 10, opacity: .85, marginTop: 2 }}>{m.contactPhone}</div>
                            </div>
                          </div>
                          <div style={{ marginTop: 6, padding: '4px 8px', background: 'rgba(255,255,255,.18)', borderRadius: 6, fontSize: 10, fontWeight: 600, letterSpacing: '.03em', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Ic name="card-id" size={10} /> CONTATO
                          </div>
                        </div>
                      ) : (
                        m.text
                      )}
                      {m.transfer && (
                        <div style={{ marginTop: 6, padding: '4px 8px', background: 'rgba(255,255,255,.15)', borderRadius: 6, fontSize: 10, fontWeight: 600, letterSpacing: '.04em', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Ic name="arrow-right" size={10} /> TRANSFERIR
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Drawer>

      {/* Contact panel overlay — same size as drawer, animated open & close */}
      {showContact && (
        <div
          onClick={closeContact}
          style={{
            position: 'fixed', inset: 0, zIndex: 105,
            background: 'rgba(15,23,42,.22)', backdropFilter: 'blur(2px)',
            display: 'flex', justifyContent: 'flex-end',
            animation: contactClosing ? 'fade-out .25s ease forwards' : 'fade .18s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 560, height: '100vh',
              background: 'var(--surface)',
              boxShadow: '-10px 0 40px rgba(0,0,0,.22)',
              display: 'flex', flexDirection: 'column', minHeight: 0,
              animation: contactClosing
                ? 'slide-out-right .26s cubic-bezier(.4,0,1,1) forwards'
                : 'slide-in-right .26s cubic-bezier(.4,0,.2,1)',
            }}
          >
            <div className="row" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', gap: 10, flexShrink: 0 }}>
              <Ic name="card-id" size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: 'var(--type-xs)', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Painel do contato</span>
              <div className="spacer" />
              <button className="btn btn-ghost btn-icon" onClick={closeContact} style={{ width: 30, height: 30 }} title="Fechar">
                <Ic name="x" size={15} />
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
              {typeof AIPanel !== 'undefined'
                ? <AIPanel conv={conv} setComposing={setComposing} inline onAppointmentRequest={() => setShowAppointment(true)} />
                : <div className="muted" style={{ padding: 20 }}>Painel indisponível.</div>}

              {/* Inline appointment overlay — constrained to painel area */}
              {showAppointment && (
                <div
                  style={{
                    position: 'absolute', inset: 0, zIndex: 10,
                    background: 'var(--surface)',
                    display: 'flex', flexDirection: 'column', minHeight: 0,
                    animation: appointmentClosing
                      ? 'slide-out-right .26s cubic-bezier(.4,0,1,1) forwards'
                      : 'slide-in-right .26s cubic-bezier(.4,0,.2,1)',
                    boxShadow: '-6px 0 24px rgba(15,23,42,.10)',
                  }}
                >
                  <InlineAppointmentForm conv={conv} onClose={closeAppointment} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contact picker popup — appears INSIDE the drawer area as a centered balloon */}
      {showContactPicker && (
        <div
          onClick={closeContactPicker}
          style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 560,
            zIndex: 106,
            background: 'rgba(15,23,42,.32)', backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
            animation: contactPickerClosing ? 'fade-out .25s ease forwards' : 'fade .18s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 440, maxHeight: '88%',
              background: 'var(--surface)',
              borderRadius: 14,
              boxShadow: '0 24px 60px rgba(15,23,42,.28)',
              border: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column', minHeight: 0,
              animation: contactPickerClosing
                ? 'pop-out .22s ease forwards'
                : 'pop .2s cubic-bezier(.4,0,.2,1)',
              overflow: 'hidden',
            }}
          >
            <ContactPickerPanel
              onClose={closeContactPicker}
              onPick={(c) => {
                addAgentMsg({ kind: 'contact', contactName: c.name, contactPhone: c.phone, contactTag: c.tag, contactChannel: c.channel });
                closeContactPicker();
              }}
            />
          </div>
        </div>
      )}

      {/* Hidden file inputs for foto / video / documento / audio */}
      <input ref={fileInputs.foto}      type="file" accept="image/*"                                                 style={{ display: 'none' }} onChange={e => onFileChosen('foto', e)} />
      <input ref={fileInputs.video}     type="file" accept="video/*"                                                 style={{ display: 'none' }} onChange={e => onFileChosen('video', e)} />
      <input ref={fileInputs.audio}     type="file" accept="audio/*"                                                 style={{ display: 'none' }} onChange={e => onFileChosen('audio', e)} />
      <input ref={fileInputs.documento} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar" style={{ display: 'none' }} onChange={e => onFileChosen('documento', e)} />
    </>
  );
}

function ContactPickerPanel({ onClose, onPick }) {
  const [q, setQ] = React.useState('');
  const [selected, setSelected] = React.useState(null);
  const inputRef = React.useRef(null);
  React.useEffect(() => { inputRef.current?.focus(); }, []);

  const list = (typeof CONTACTS !== 'undefined' ? CONTACTS : []);
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const filtered = q
    ? list.filter(c => norm(c.name).includes(norm(q)) || norm(c.phone).includes(norm(q)))
    : list;

  return (
    <>
      {/* Header */}
      <div className="row" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', gap: 10, flexShrink: 0 }}>
        <span style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--accent-soft)', color: 'var(--accent-700)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Ic name="card-id" size={14} />
        </span>
        <span style={{ fontSize: 'var(--type-md)', fontWeight: 600 }}>Enviar contato</span>
        <div className="spacer" />
        <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ width: 30, height: 30 }} title="Fechar">
          <Ic name="x" size={15} />
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }}>
            <Ic name="search" size={15} />
          </span>
          <input
            ref={inputRef}
            className="input"
            placeholder="Buscar por nome ou telefone..."
            style={{ paddingLeft: 40 }}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="scroll" style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
        {filtered.length === 0 ? (
          <div className="empty" style={{ padding: '32px 8px', textAlign: 'center' }}>
            <div className="empty-icon"><Ic name="user" size={22} /></div>
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>Nenhum contato encontrado</div>
            <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>Tente outro termo de busca.</div>
          </div>
        ) : filtered.map(c => {
          const isSel = selected?.id === c.id;
          return (
            <div
              key={c.id}
              onClick={() => setSelected(c)}
              onDoubleClick={() => onPick(c)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                background: isSel ? 'var(--accent-soft)' : 'transparent',
                border: '1px solid ' + (isSel ? 'color-mix(in oklab, var(--accent) 30%, var(--border))' : 'transparent'),
                marginBottom: 2,
                transition: 'background .12s, border-color .12s',
              }}
              onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = 'var(--surface-2)'; }}
              onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
            >
              <Avatar name={c.name} size="sm" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row" style={{ gap: 6 }}>
                  <span style={{ fontWeight: 500, fontSize: 'var(--type-sm)' }}>{c.name}</span>
                  <ChannelIcon ch={c.channel} size={11} />
                </div>
                <div className="muted" style={{ fontSize: 'var(--type-xs)' }}>{c.phone}</div>
              </div>
              <span className="chip" style={c.tag === 'CLIENTE' ? { background: 'var(--accent-soft)', color: 'var(--accent-700)' } : {}}>{c.tag}</span>
              {isSel && <Ic name="check" size={15} style={{ color: 'var(--accent-700)' }} />}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="row" style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', flexShrink: 0, gap: 8 }}>
        <div className="muted" style={{ fontSize: 'var(--type-sm)', flex: 1 }}>
          {selected ? `Selecionado: ${selected.name}` : `${filtered.length} contato${filtered.length === 1 ? '' : 's'}`}
        </div>
        <button className="btn fin-btn-back" onClick={onClose}>Voltar</button>
        <button
          className="btn btn-primary"
          disabled={!selected}
          style={{ opacity: selected ? 1 : .5 }}
          onClick={() => selected && onPick(selected)}
        >
          <Ic name="send" size={13} /> Enviar
        </button>
      </div>
    </>
  );
}

function ReturnPopover({ conv, onClose, onConfirm }) {
  const [reason, setReason] = React.useState('');
  const [keepNotes, setKeepNotes] = React.useState(true);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose?.(); };
    setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose]);
  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', bottom: 'calc(100% + 10px)', left: 0, width: 340,
        background: 'var(--surface)', border: '1px solid var(--border-strong)',
        borderRadius: 12, boxShadow: '0 18px 42px rgba(15,23,42,.18)',
        animation: 'pop .16s ease', zIndex: 20,
      }}
    >
      {/* Header */}
      <div className="row" style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', gap: 8 }}>
        <span style={{ fontSize: 'var(--type-sm)', fontWeight: 600 }}>Devolver para a IA</span>
        <div className="spacer" />
        <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ width: 24, height: 24 }} title="Fechar">
          <Ic name="x" size={13} />
        </button>
      </div>

      {/* Body */}
      <div className="col" style={{ gap: 10, padding: 12 }}>
        <div className="row" style={{ gap: 8, padding: 10, background: 'color-mix(in oklab, var(--ai) 8%, var(--surface))', border: '1px solid color-mix(in oklab, var(--ai) 24%, var(--border))', borderRadius: 8 }}>
          <Ic name="sparkles" size={15} style={{ color: 'var(--ai)', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 'var(--type-xs)', lineHeight: 1.45 }}>
            A IA assumirá <strong>{conv.client}</strong> e seguirá com o atendimento de acordo com a base de conhecimento.
          </div>
        </div>
        <div>
          <label className="label" style={{ fontSize: 11 }}>Motivo da devolução <span className="muted" style={{ fontWeight: 400 }}>(opcional)</span></label>
          <textarea
            className="input"
            rows={2}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Ex: cliente quer apenas tirar dúvidas iniciais"
            style={{ resize: 'none', fontSize: 'var(--type-sm)' }}
          />
        </div>
        <label className="row" style={{ gap: 8, cursor: 'pointer' }}>
          <span onClick={() => setKeepNotes(!keepNotes)} style={{
            width: 16, height: 16, borderRadius: 4,
            border: '1.5px solid ' + (keepNotes ? 'var(--accent)' : 'var(--border-strong)'),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: keepNotes ? 'var(--accent)' : 'var(--surface)',
            color: 'white', flexShrink: 0,
          }}>
            {keepNotes && <Ic name="check" size={11} />}
          </span>
          <span style={{ fontSize: 'var(--type-xs)' }} onClick={() => setKeepNotes(!keepNotes)}>
            Manter histórico e notas internas visíveis para a IA
          </span>
        </label>
      </div>

      {/* Footer */}
      <div className="row" style={{ gap: 6, padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
        <div className="spacer" />
        <button className="btn btn-sm fin-btn-back" onClick={onClose}>Voltar</button>
        <button
          className="btn btn-sm btn-primary"
          style={{ background: 'var(--ai)', borderColor: 'var(--ai)' }}
          onClick={() => onConfirm({ reason, keepNotes })}
        >
          <Ic name="sparkles" size={12} /> Devolver à IA
        </button>
      </div>

      <span aria-hidden style={{
        position: 'absolute', bottom: -6, left: 18, width: 12, height: 12,
        background: 'var(--surface)', borderRight: '1px solid var(--border-strong)',
        borderBottom: '1px solid var(--border-strong)', transform: 'rotate(45deg)',
      }} />
    </div>
  );
}

const QUEUE_TRANSFER_AGENTS = [
  { id: 'a1', name: 'Karla Zambelly', role: 'Atendente',  status: 'available', queue: 3 },
  { id: 'a2', name: 'Pedro Rocha',    role: 'Atendente',  status: 'available', queue: 1 },
  { id: 'a3', name: 'Maria Souza',    role: 'Supervisor', status: 'busy',      queue: 8 },
  { id: 'a4', name: 'João Lima',      role: 'Atendente',  status: 'offline',   queue: 0 },
];
const QUEUE_TRANSFER_DEPTS = [
  { id: 'd1', name: 'Comercial',  desc: 'Vendas, propostas, fechamento', icon: 'commercial', color: '#16a34a' },
  { id: 'd2', name: 'Financeiro', desc: 'Cobrança, pagamentos, NF',       icon: 'finance',    color: '#0ea5e9' },
  { id: 'd3', name: 'Suporte',    desc: 'Dúvidas técnicas e SAC',         icon: 'help',       color: '#f59e0b' },
  { id: 'd4', name: 'Pós-venda',  desc: 'Acompanhamento, fidelização',    icon: 'star',       color: '#a855f7' },
];

function TransferPopover({ onClose, onConfirm, agents, depts }) {
  const AGENTS = agents || QUEUE_TRANSFER_AGENTS; // listas reais quando disponíveis; senão mock
  const DEPTS = depts || QUEUE_TRANSFER_DEPTS;
  const [tab, setTab] = React.useState('agent');
  const [selected, setSelected] = React.useState(null);
  const [note, setNote] = React.useState('');
  const ref = React.useRef(null);
  React.useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose?.(); };
    setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose]);
  const submit = () => { if (selected) onConfirm({ kind: tab, target: selected, note }); };

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', bottom: 'calc(100% + 10px)', left: 110, width: 360,
        background: 'var(--surface)', border: '1px solid var(--border-strong)',
        borderRadius: 12, boxShadow: '0 18px 42px rgba(15,23,42,.18)',
        animation: 'pop .16s ease', zIndex: 20,
      }}
    >
      <div className="row" style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', gap: 8 }}>
        <span style={{ fontSize: 'var(--type-sm)', fontWeight: 600 }}>Transferir conversa</span>
        <div className="spacer" />
        <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ width: 24, height: 24 }}>
          <Ic name="x" size={13} />
        </button>
      </div>

      <div className="col" style={{ padding: 12, gap: 10 }}>
        {/* tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border)', position: 'relative' }}>
          {[['agent', 'Atendente', 'user'], ['dept', 'Departamento', 'team']].map(([id, l, ic]) => (
            <div
              key={id}
              onClick={() => { setTab(id); setSelected(null); }}
              style={{
                padding: '7px 0', textAlign: 'center', fontSize: 'var(--type-xs)', fontWeight: 600,
                color: tab === id ? 'var(--text)' : 'var(--text-muted)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'color .15s',
              }}
            >
              <Ic name={ic} size={12} /> {l}
            </div>
          ))}
          <div style={{
            position: 'absolute', bottom: -1, height: 2, width: '50%',
            left: tab === 'agent' ? '0%' : '50%',
            background: 'var(--accent)', transition: 'left .25s cubic-bezier(.5,1.4,.4,1)',
          }} />
        </div>

        {/* list */}
        <div className="col" style={{ gap: 4, maxHeight: 200, overflow: 'auto', margin: '0 -2px', padding: '0 2px' }}>
          {tab === 'agent' && AGENTS.map(a => {
            const on = selected?.id === a.id;
            const dot = a.status === 'available' ? '#16a34a' : a.status === 'busy' ? '#f59e0b' : '#9ca3af';
            const disabled = a.status === 'offline';
            return (
              <div
                key={a.id}
                onClick={() => !disabled && setSelected(a)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 9px', borderRadius: 8,
                  border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'),
                  background: on ? 'var(--accent-soft)' : 'var(--surface)',
                  opacity: disabled ? 0.5 : 1,
                  cursor: disabled ? 'default' : 'pointer',
                }}
              >
                <Avatar name={a.name} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 5 }}>
                    <span style={{ fontWeight: 600, fontSize: 'var(--type-xs)' }}>{a.name}</span>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot }} />
                  </div>
                  <div className="muted" style={{ fontSize: 10 }}>{a.role} · {a.queue} na fila</div>
                </div>
                {on && <Ic name="check" size={13} style={{ color: 'var(--accent-700)' }} />}
              </div>
            );
          })}
          {tab === 'dept' && DEPTS.map(d => {
            const on = selected?.id === d.id;
            return (
              <div
                key={d.id}
                onClick={() => setSelected(d)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 9px', borderRadius: 8,
                  border: '1px solid ' + (on ? d.color : 'var(--border)'),
                  background: on ? `color-mix(in oklab, ${d.color} 8%, var(--surface))` : 'var(--surface)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ width: 28, height: 28, borderRadius: 7, background: `color-mix(in oklab, ${d.color} 14%, transparent)`, color: d.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Ic name={d.icon} size={13} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--type-xs)' }}>{d.name}</div>
                  <div className="muted" style={{ fontSize: 10 }}>{d.desc}</div>
                </div>
                {on && <Ic name="check" size={13} style={{ color: d.color }} />}
              </div>
            );
          })}
        </div>

        <div>
          <label className="label" style={{ fontSize: 11 }}>Nota para quem receber <span className="muted" style={{ fontWeight: 400 }}>(opcional)</span></label>
          <textarea
            className="input"
            rows={2}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Ex: cliente já recebeu orçamento, falta confirmar pagamento..."
            style={{ resize: 'none', fontSize: 'var(--type-sm)' }}
          />
        </div>
      </div>

      <div className="row" style={{ gap: 6, padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
        <div className="spacer" />
        <button className="btn btn-sm fin-btn-back" onClick={onClose}>Voltar</button>
        <button
          className="btn btn-sm btn-primary"
          disabled={!selected}
          style={{ opacity: selected ? 1 : 0.5 }}
          onClick={submit}
        >
          <Ic name="team" size={12} /> Transferir
        </button>
      </div>

      <span aria-hidden style={{
        position: 'absolute', bottom: -6, left: 28, width: 12, height: 12,
        background: 'var(--surface)', borderRight: '1px solid var(--border-strong)',
        borderBottom: '1px solid var(--border-strong)', transform: 'rotate(45deg)',
      }} />
    </div>
  );
}

const QUEUE_CLOSE_OUTCOMES = [
  { id: 'resolved',   label: 'Resolvido',          desc: 'Cliente foi atendido com sucesso', color: '#16a34a', icon: 'check' },
  { id: 'sale',       label: 'Convertido (venda)', desc: 'Resultou em compra ou contrato',   color: '#a855f7', icon: 'cart' },
  { id: 'unresolved', label: 'Não resolvido',      desc: 'Não foi possível ajudar',          color: '#dc2626', icon: 'x' },
  { id: 'noreply',    label: 'Sem resposta',       desc: 'Cliente não retornou',             color: '#64748b', icon: 'clock' },
];

function ClosePopover({ conv, onClose, onConfirm }) {
  const [outcome, setOutcome] = React.useState(null);
  const [note, setNote] = React.useState('');
  const ref = React.useRef(null);
  React.useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose?.(); };
    setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose]);
  const submit = () => { if (outcome) onConfirm({ outcome: outcome.id, label: outcome.label, note }); };

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', bottom: 'calc(100% + 10px)', right: 0, width: 340,
        background: 'var(--surface)', border: '1px solid var(--border-strong)',
        borderRadius: 12, boxShadow: '0 18px 42px rgba(15,23,42,.18)',
        animation: 'pop .16s ease', zIndex: 20,
      }}
    >
      <div className="row" style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', gap: 8 }}>
        <span style={{ fontSize: 'var(--type-sm)', fontWeight: 600 }}>Encerrar conversa</span>
        <div className="spacer" />
        <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ width: 24, height: 24 }}>
          <Ic name="x" size={13} />
        </button>
      </div>

      <div className="col" style={{ gap: 10, padding: 12 }}>
        <div className="muted" style={{ fontSize: 'var(--type-xs)', lineHeight: 1.45 }}>
          Confirme o desfecho do atendimento de <strong style={{ color: 'var(--text)' }}>{conv.client}</strong>. Você pode retomar depois se o cliente voltar a interagir.
        </div>
        <div className="col" style={{ gap: 4 }}>
          {QUEUE_CLOSE_OUTCOMES.map(o => {
            const on = outcome?.id === o.id;
            return (
              <div
                key={o.id}
                onClick={() => setOutcome(o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 9px', borderRadius: 8,
                  border: '1px solid ' + (on ? o.color : 'var(--border)'),
                  background: on ? `color-mix(in oklab, ${o.color} 8%, var(--surface))` : 'var(--surface)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ width: 26, height: 26, borderRadius: 7, background: `color-mix(in oklab, ${o.color} 14%, transparent)`, color: o.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Ic name={o.icon} size={12} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--type-xs)' }}>{o.label}</div>
                  <div className="muted" style={{ fontSize: 10 }}>{o.desc}</div>
                </div>
                {on && <Ic name="check" size={13} style={{ color: o.color }} />}
              </div>
            );
          })}
        </div>
        <div>
          <label className="label" style={{ fontSize: 11 }}>Observação <span className="muted" style={{ fontWeight: 400 }}>(opcional)</span></label>
          <textarea
            className="input"
            rows={2}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Ex: cliente solicitou retorno em 3 dias..."
            style={{ resize: 'none', fontSize: 'var(--type-sm)' }}
          />
        </div>
      </div>

      <div className="row" style={{ gap: 6, padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
        <div className="spacer" />
        <button className="btn btn-sm fin-btn-back" onClick={onClose}>Voltar</button>
        <button
          className="btn btn-sm btn-primary"
          disabled={!outcome}
          style={{ opacity: outcome ? 1 : 0.5 }}
          onClick={submit}
        >
          <Ic name="check" size={12} /> Encerrar
        </button>
      </div>

      <span aria-hidden style={{
        position: 'absolute', bottom: -6, right: 18, width: 12, height: 12,
        background: 'var(--surface)', borderRight: '1px solid var(--border-strong)',
        borderBottom: '1px solid var(--border-strong)', transform: 'rotate(45deg)',
      }} />
    </div>
  );
}

function InlineAppointmentForm({ conv, onClose }) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const [client, setClient] = React.useState(conv.client);
  const [service, setService] = React.useState('Reunião comercial');
  const [date, setDate] = React.useState(`${yyyy}-${mm}-${dd}`);
  const [time, setTime] = React.useState('10:00');
  const [duration, setDuration] = React.useState('60');
  const [resp, setResp] = React.useState('Karla Zambelly');
  const [notes, setNotes] = React.useState('');
  const [saved, setSaved] = React.useState(false);

  const SERVICES = ['Reunião comercial', 'Limpeza de pele', 'Massagem', 'Drenagem linfática', 'Consultoria', 'Outro'];
  const DURATIONS = [['15', '15 min'], ['30', '30 min'], ['45', '45 min'], ['60', '60 min'], ['90', '90 min'], ['120', '2 horas'], ['180', '3 horas']];
  const RESPONSIBLES = ['Karla Zambelly', 'Paulo Henrique', 'Magno Vieira', 'Francisco Junior'];

  const save = () => {
    setSaved(true);
    setTimeout(() => onClose?.(), 900);
  };

  return (
    <>
      {/* Header */}
      <div className="row" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', gap: 10, flexShrink: 0 }}>
        <span style={{ width: 26, height: 26, borderRadius: 7, background: 'color-mix(in oklab, var(--hue-violet) 14%, white)', color: 'var(--hue-violet)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Ic name="agenda" size={14} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 'var(--type-md)' }}>Novo agendamento</div>
          <div className="muted" style={{ fontSize: 11 }}>Cliente: {client}</div>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ width: 30, height: 30 }} title="Fechar">
          <Ic name="x" size={15} />
        </button>
      </div>

      {/* Body */}
      <div className="scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 16 }}>
        {saved ? (
          <div className="col" style={{ gap: 12, alignItems: 'center', textAlign: 'center', padding: '40px 12px' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'color-mix(in oklab, #16a34a 18%, white)', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ic name="check" size={22} />
            </div>
            <div style={{ fontWeight: 600 }}>Agendamento criado!</div>
            <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>{service} · {date} às {time}</div>
          </div>
        ) : (
          <div className="col" style={{ gap: 12 }}>
            <div>
              <label className="label">Cliente</label>
              <input className="input" value={client} onChange={e => setClient(e.target.value)} />
            </div>
            <div>
              <label className="label">Tipo de serviço</label>
              <select className="input" value={service} onChange={e => setService(e.target.value)}>
                {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label className="label">Data</label>
                <DateField value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="label">Hora</label>
                <input type="time" className="input" value={time} onChange={e => setTime(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Duração</label>
              <select className="input" value={duration} onChange={e => setDuration(e.target.value)}>
                {DURATIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Responsável</label>
              <select className="input" value={resp} onChange={e => setResp(e.target.value)}>
                {RESPONSIBLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Observações</label>
              <textarea className="input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anotações sobre o agendamento..." style={{ resize: 'none' }} />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {!saved && (
        <div className="row" style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', gap: 8, flexShrink: 0 }}>
          <div className="spacer" />
          <button className="btn fin-btn-back" onClick={onClose}>Voltar</button>
          <button className="btn btn-save" disabled={!client.trim() || !date || !time} style={{ opacity: (client.trim() && date && time) ? 1 : .5 }} onClick={save}>
            <Ic name="check" size={13} /> Criar
          </button>
        </div>
      )}
    </>
  );
}

function SlashPicker({ initialQuery, onPick, onClose }) {
  const [q, setQ] = React.useState(initialQuery || '');
  const ref = React.useRef(null);
  const inputRef = React.useRef(null);
  React.useEffect(() => { inputRef.current?.focus(); }, []);
  React.useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose?.(); };
    setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose]);

  const replies = (typeof QUICK_REPLIES !== 'undefined' ? QUICK_REPLIES : []);
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const filtered = q.trim()
    ? replies.filter(r => norm(r.title).includes(norm(q)))
    : replies;

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0,
        background: 'var(--surface)', border: '1px solid var(--border-strong)',
        borderRadius: 12, boxShadow: '0 18px 42px rgba(15,23,42,.18)',
        animation: 'pop .16s ease', zIndex: 21,
        maxHeight: 360, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}
    >
      <div className="row" style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', gap: 8 }}>
        <span style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--accent-soft)', color: 'var(--accent-700)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <Ic name="zap" size={12} />
        </span>
        <span style={{ fontSize: 'var(--type-sm)', fontWeight: 600 }}>Respostas rápidas</span>
        <span className="muted" style={{ fontSize: 11 }}>{filtered.length} de {replies.length}</span>
        <div className="spacer" />
        <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ width: 24, height: 24 }} title="Fechar">
          <Ic name="x" size={13} />
        </button>
      </div>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }}>
            <Ic name="search" size={13} />
          </span>
          <input
            ref={inputRef}
            className="input"
            placeholder="Buscar pelo título..."
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ paddingLeft: 36, height: 30, fontSize: 'var(--type-sm)' }}
          />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 4 }}>
        {filtered.length === 0 ? (
          <div className="muted" style={{ padding: 20, textAlign: 'center', fontSize: 'var(--type-sm)' }}>
            Nenhuma resposta encontrada.
          </div>
        ) : filtered.map(r => (
          <div
            key={r.id}
            onClick={() => onPick(r)}
            style={{ padding: '8px 10px', borderRadius: 6, cursor: 'pointer', transition: 'background .12s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div className="row" style={{ gap: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 'var(--type-sm)', flex: 1 }}>{r.title}</span>
              {r.shortcut && (
                <span className="mono" style={{ fontSize: 10, color: 'var(--accent-700)', background: 'var(--accent-soft)', padding: '1px 6px', borderRadius: 4 }}>{r.shortcut}</span>
              )}
            </div>
            <div className="muted" style={{ fontSize: 'var(--type-xs)', marginTop: 3, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {r.body || r.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { Queue, QueuePreviewDrawer });