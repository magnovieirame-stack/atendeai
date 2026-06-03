// team-drawer.jsx — Drawer (80vw) for creating/editing a Team

function TeamDrawer({ initial, allMembers, onClose, onSave, onDelete }) {
  const isEdit = !!initial && !!initial.id;
  const blank = React.useMemo(() => ({
    id: '',
    teamName: '',
    responsibleId: '',
    description: '',
    region: '',
    status: 'ativo',
    color: '#16a34a',
    meta: 40000,
    vendido: 0,
    metaAtend: 200,
    conv: 35,
    tmr: 5,
    commType: '% sobre vendas',
    commPct: '5%',
    commBonus: 'R$ 500',
    channels: ['whatsapp', 'instagram'],
    funnels: ['Pré-Venda'],
    memberIds: [],
    memberMetas: {}, // { [memberId]: { meta, vendido, conv } }
    notes: ''
  }), []);

  const [f, setF] = React.useState(() => {
    if (initial && initial.id) {
      const defaultMemberIds = initial.memberIds || allMembers.filter((m) => m.id !== initial.id).slice(0, 3).map((m) => m.id);
      const defaultMetas = initial.memberMetas || {};
      // Fill defaults so existing members get a meta from their own record
      defaultMemberIds.forEach((id) => {
        if (!defaultMetas[id]) {
          const mb = allMembers.find((m) => m.id === id);
          defaultMetas[id] = { meta: mb?.meta || 15000, vendido: mb?.vendido || 0, conv: 30 };
        }
      });
      return {
        ...blank,
        ...initial,
        teamName: initial.teamName || `Equipe ${initial.name?.split(' ')[0] || ''}`,
        responsibleId: initial.responsibleId || initial.id,
        description: initial.description || `Equipe responsável por ${(initial.role || '').toLowerCase()} — atende clientes ativos e prospects nos canais conectados.`,
        memberIds: defaultMemberIds,
        memberMetas: defaultMetas,
        color: initial.color || '#16a34a'
      };
    }
    return blank;
  });
  const [tab, setTab] = React.useState('dados');
  const [confirmDel, setConfirmDel] = React.useState(false);
  const [delClosing, setDelClosing] = React.useState(false);
  const drawerClose = React.useRef(null);
  const [showAddMember, setShowAddMember] = React.useState(false);
  const [memberSearch, setMemberSearch] = React.useState('');
  const [pendingMemberId, setPendingMemberId] = React.useState('');
  const [pendingMeta, setPendingMeta] = React.useState({ meta: 15000, vendido: 0, conv: 30 });
  const [expandedMemberId, setExpandedMemberId] = React.useState(null);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggleArr = (k, val) => setF((p) => ({ ...p, [k]: p[k].includes(val) ? p[k].filter((x) => x !== val) : [...p[k], val] }));
  const setMemberMeta = (id, patch) => setF((p) => ({ ...p, memberMetas: { ...p.memberMetas, [id]: { ...(p.memberMetas[id] || { meta: 0, vendido: 0, conv: 0 }), ...patch } } }));
  const removeMember = (id) => setF((p) => {
    const mm = { ...p.memberMetas };
    delete mm[id];
    return { ...p, memberIds: p.memberIds.filter((x) => x !== id), memberMetas: mm };
  });

  const responsible = allMembers.find((m) => m.id === f.responsibleId);
  const members = f.memberIds.map((id) => allMembers.find((m) => m.id === id)).filter(Boolean);

  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const available = allMembers.filter((m) =>
    m.id !== f.responsibleId &&
    !f.memberIds.includes(m.id) &&
    (memberSearch.trim() === '' || norm(m.name).includes(norm(memberSearch)))
  );

  const handleAddMember = () => {
    if (!pendingMemberId) return;
    setF((p) => ({
      ...p,
      memberIds: [...p.memberIds, pendingMemberId],
      memberMetas: { ...p.memberMetas, [pendingMemberId]: { ...pendingMeta } }
    }));
    setPendingMemberId('');
    setPendingMeta({ meta: 15000, vendido: 0, conv: 30 });
    setMemberSearch('');
    setShowAddMember(false);
  };

  const handleSave = () => {
    if (!f.teamName.trim()) { setTab('dados'); return; }
    if (!f.responsibleId) { setTab('dados'); return; }
    const out = {
      ...f,
      id: f.id || 't' + Date.now().toString(36),
      name: responsible ? responsible.name : f.teamName,
      role: responsible ? responsible.role : 'Equipe',
      email: responsible?.email || '',
      phone: responsible?.phone || '',
      meta: Number(f.meta) || 0,
      vendido: Number(f.vendido) || 0,
      metaAtend: Number(f.metaAtend) || 0,
      conv: Number(f.conv) || 0,
      tmr: Number(f.tmr) || 0
    };
    onSave(out);
  };

  const valid = f.teamName.trim().length >= 2 && f.responsibleId;
  const pct = Number(f.meta) > 0 ? Math.round((Number(f.vendido) || 0) / Number(f.meta) * 100) : 0;
  const COLORS = ['#16a34a', '#0ea5e9', '#a855f7', '#f59e0b', '#ec4899', '#ef4444', '#14b8a6', '#6366f1', '#f97316'];
  const CHANNELS = [['whatsapp', 'WhatsApp'], ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['mail', 'E-mail']];
  const FUNNELS = ['Pré-Venda', 'Pós-Venda', 'Recuperação', 'Indicações', 'Suporte'];

  const TABS = [
    { id: 'dados',     label: 'Dados gerais',         icon: 'user' },
    { id: 'membros',   label: 'Membros & Metas',      icon: 'team' },
    { id: 'canais',    label: 'Canais, funis & obs.', icon: 'link' }
  ];

  return (
    <Drawer
      title={isEdit ? `Editar equipe · ${f.teamName || initial.name}` : 'Cadastrar nova equipe'}
      subtitle={isEdit ? 'Atualize informações, membros e metas da equipe' : 'Preencha os dados abaixo para criar uma nova equipe'}
      onClose={onClose}
      width="80vw"
      footer={(close) => {
        drawerClose.current = close;
        return <>
        {isEdit &&
          <button className="btn btn-delete-soft" onClick={() => setConfirmDel(true)}>
            <Ic name="trash" size={13} /> Excluir equipe
          </button>}
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={() => close()}>Cancelar</button>
        <button className="btn btn-save" onClick={() => close(handleSave)} disabled={!valid} style={{ opacity: valid ? 1 : .5 }}>
          <Ic name="check" size={13} /> {isEdit ? 'Salvar alterações' : 'Criar equipe'}
        </button>
      </>;
      }}>

      {/* Header */}
      <div style={{ marginBottom: 14, padding: 16, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface-2)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: f.color }} />
        <div className="row" style={{ gap: 14, alignItems: 'center', marginTop: 6 }}>
          <Avatar name={responsible?.name || '?'} size="xl" color={f.color} online={f.status === 'ativo'} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 'var(--type-lg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {f.teamName || 'Nova equipe'}
              </div>
              <span className={`badge ${f.status === 'ativo' ? 'badge-success' : 'badge-neutral'}`}>{f.status === 'ativo' ? 'Ativa' : 'Inativa'}</span>
            </div>
            <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 2 }}>
              {responsible ? `Responsável: ${responsible.name}` : 'Sem responsável definido'}
              {members.length > 0 && ` · ${members.length} membro${members.length > 1 ? 's' : ''}`}
              {' · Meta '} {pct}%
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: 4, marginBottom: 20, position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 5 }}>
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <div key={t.id} onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
                fontSize: 'var(--type-sm)', fontWeight: on ? 700 : 500,
                color: on ? 'var(--accent-700)' : 'var(--text-muted)',
                borderBottom: on ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1, cursor: 'pointer'
              }}>
              <Ic name={t.icon} size={15} />{t.label}
            </div>);
        })}
      </div>

      {/* === TAB 1: Dados gerais + Responsável === */}
      {tab === 'dados' &&
        <div>
          <TeamSection title="Dados gerais" icon="user">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="label">Nome da equipe *</label>
                <input className="input" value={f.teamName} onChange={(e) => set('teamName', e.target.value)} placeholder="Ex: Equipe Comercial" />
              </div>
              <div>
                <label className="label">Área / Região</label>
                <input className="input" value={f.region} onChange={(e) => set('region', e.target.value)} placeholder="Ex: Fortaleza" />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label className="label">Descrição</label>
              <textarea className="input" rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="O que esta equipe faz, áreas de atuação, observações..." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div>
                <label className="label">Status da equipe</label>
                <div className="row" style={{ gap: 6 }}>
                  {[['ativo', 'Ativa'], ['inativo', 'Inativa']].map(([id, l]) => {
                    const on = f.status === id;
                    return (
                      <div key={id} onClick={() => set('status', id)} style={{ flex: 1, padding: '9px 12px', border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--accent-soft)' : 'transparent', borderRadius: 8, cursor: 'pointer', textAlign: 'center', fontSize: 'var(--type-sm)', fontWeight: on ? 600 : 500, color: on ? 'var(--accent-700)' : 'var(--text)' }}>
                        {l}
                      </div>);
                  })}
                </div>
              </div>
              <div>
                <label className="label">Cor da equipe</label>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  {COLORS.map((c) =>
                    <span key={c} onClick={() => set('color', c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: c === f.color ? '3px solid var(--text)' : '3px solid transparent', transition: 'border .15s' }} />)}
                </div>
              </div>
            </div>
          </TeamSection>

          <TeamSection title="Responsável pela equipe" icon="shield">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'flex-start' }}>
              <div>
                <label className="label">Selecionar responsável *</label>
                <select className="input" value={f.responsibleId} onChange={(e) => set('responsibleId', e.target.value)}>
                  <option value="">— Selecione —</option>
                  {allMembers.map((m) =>
                    <option key={m.id} value={m.id}>{m.name} · {m.role}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Foto do responsável</label>
                <div className="row" style={{ gap: 12, alignItems: 'center' }}>
                  <div style={{ position: 'relative' }}>
                    <Avatar name={responsible?.name || '?'} size="lg" color={f.color} />
                    <button className="btn btn-icon btn-sm" style={{ position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, padding: 0, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border-strong)' }}><Ic name="camera" size={11} /></button>
                  </div>
                  <button className="btn" style={{ flex: 1 }}><Ic name="upload" size={13} /> Carregar foto</button>
                </div>
              </div>
            </div>
            {responsible &&
              <div style={{ marginTop: 12, padding: 12, background: 'var(--surface-2)', borderRadius: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 'var(--type-sm)' }}>
                <div className="row" style={{ gap: 6, color: 'var(--text-muted)' }}><Ic name="mail" size={13} />{responsible.email}</div>
                <div className="row" style={{ gap: 6, color: 'var(--text-muted)' }}><Ic name="phone" size={13} />{responsible.phone}</div>
              </div>}
          </TeamSection>
        </div>}

      {/* === TAB 2: Membros & Metas === */}
      {tab === 'membros' &&
        <div>
          <TeamSection title="Meta consolidada da equipe" icon="reports">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="label">Meta mensal de vendas (R$)</label>
                <input className="input" type="number" value={f.meta} onChange={(e) => set('meta', e.target.value)} />
              </div>
              <div>
                <label className="label">Vendas realizadas no mês (R$)</label>
                <input className="input" type="number" value={f.vendido} onChange={(e) => set('vendido', e.target.value)} />
              </div>
            </div>
            <div style={{ marginTop: 12, padding: 10, background: 'var(--surface-2)', borderRadius: 8 }}>
              <div className="row" style={{ alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 'var(--type-xs)', fontWeight: 700, color: 'var(--text-muted)' }}>Atingimento</span>
                <div className="spacer" />
                <span className="tnum" style={{ fontWeight: 700, fontSize: 'var(--type-sm)', color: pct >= 100 ? 'var(--accent-700)' : 'var(--text)' }}>{pct}%</span>
              </div>
              <div className="bar" style={{ height: 8 }}><div style={{ width: `${Math.min(pct, 100)}%`, background: pct >= 100 ? 'var(--accent)' : f.color }} /></div>
            </div>
          </TeamSection>

          <TeamSection
            title={`Membros e metas individuais (${members.length})`}
            icon="team"
            actions={
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddMember((s) => !s)}>
                <Ic name={showAddMember ? 'x' : 'plus'} size={12} /> {showAddMember ? 'Fechar' : 'Adicionar membro'}
              </button>}>

            {/* Add member panel (drop-down) */}
            {showAddMember &&
              <div style={{ marginBottom: 14, padding: 14, border: '1px solid var(--accent)', borderRadius: 12, background: 'var(--accent-soft)', animation: 'pop .2s ease' }}>
                <div style={{ fontSize: 'var(--type-sm)', fontWeight: 700, marginBottom: 10, color: 'var(--accent-700)' }}>
                  Novo membro na equipe
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr auto', gap: 10, alignItems: 'flex-end' }}>
                  <div>
                    <label className="label">Colaborador</label>
                    <select className="input" value={pendingMemberId} onChange={(e) => setPendingMemberId(e.target.value)}>
                      <option value="">— Selecione —</option>
                      {available.map((m) =>
                        <option key={m.id} value={m.id}>{m.name} · {m.role}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Meta (R$)</label>
                    <input className="input" type="number" value={pendingMeta.meta} onChange={(e) => setPendingMeta((p) => ({ ...p, meta: Number(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <label className="label">Realizado (R$)</label>
                    <input className="input" type="number" value={pendingMeta.vendido} onChange={(e) => setPendingMeta((p) => ({ ...p, vendido: Number(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <label className="label">Conversão (%)</label>
                    <input className="input" type="number" value={pendingMeta.conv} onChange={(e) => setPendingMeta((p) => ({ ...p, conv: Number(e.target.value) || 0 }))} />
                  </div>
                  <button className="btn btn-primary" onClick={handleAddMember} disabled={!pendingMemberId} style={{ opacity: pendingMemberId ? 1 : .5, height: 38 }}>
                    <Ic name="check" size={13} /> Adicionar
                  </button>
                </div>
              </div>}

            {/* Member cards grid */}
            {members.length === 0 ?
              <div className="muted" style={{ fontSize: 'var(--type-sm)', padding: 28, textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 12 }}>
                Nenhum membro nesta equipe. Clique em <strong>"Adicionar membro"</strong> para começar.
              </div> :
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {members.map((m) => {
                  const mm = f.memberMetas[m.id] || { meta: 0, vendido: 0, conv: 0 };
                  const mpct = mm.meta > 0 ? Math.round((mm.vendido || 0) / mm.meta * 100) : 0;
                  const expanded = expandedMemberId === m.id;
                  const stripe = m.color || f.color;
                  return (
                    <div key={m.id} className="card team-card" style={{ overflow: 'hidden', cursor: 'pointer', transition: 'transform .2s ease, box-shadow .2s ease' }}
                      onClick={() => setExpandedMemberId(expanded ? null : m.id)}>
                      <div style={{ height: 3, background: stripe }} />
                      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                          <Avatar name={m.name} size="lg" color={m.color} online={m.status === 'ativo'} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 'var(--type-md)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                            <div className="muted" style={{ fontSize: 11 }}>{m.role}</div>
                          </div>
                          <button className="btn btn-ghost btn-icon" title="Remover" onClick={(e) => { e.stopPropagation(); removeMember(m.id); }} style={{ color: '#dc2626' }}>
                            <Ic name="trash" size={13} />
                          </button>
                        </div>
                        <div>
                          <div className="row" style={{ alignItems: 'center', fontSize: 11, marginBottom: 4 }}>
                            <span className="muted">Meta {`R$ ${(mm.meta / 1000).toFixed(0)}k`}</span>
                            <div className="spacer" />
                            <span className="tnum" style={{ fontWeight: 700, color: mpct >= 100 ? 'var(--accent-700)' : 'var(--text)' }}>{mpct}%</span>
                          </div>
                          <div className="bar" style={{ height: 6 }}><div style={{ width: `${Math.min(mpct, 100)}%`, background: mpct >= 100 ? 'var(--accent)' : stripe }} /></div>
                          <div className="muted" style={{ fontSize: 10, marginTop: 4 }}>Vendas {formatBRL(mm.vendido || 0)} · Conv. {mm.conv || 0}%</div>
                        </div>
                        {expanded &&
                          <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 4, padding: 12, background: 'var(--surface-2)', borderRadius: 10, animation: 'pop .2s ease' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Editar meta individual</div>
                            <div className="col" style={{ gap: 8 }}>
                              <div>
                                <label className="label" style={{ fontSize: 10 }}>Meta (R$)</label>
                                <input className="input" type="number" value={mm.meta} onChange={(e) => setMemberMeta(m.id, { meta: Number(e.target.value) || 0 })} style={{ height: 32 }} />
                              </div>
                              <div>
                                <label className="label" style={{ fontSize: 10 }}>Realizado (R$)</label>
                                <input className="input" type="number" value={mm.vendido} onChange={(e) => setMemberMeta(m.id, { vendido: Number(e.target.value) || 0 })} style={{ height: 32 }} />
                              </div>
                              <div>
                                <label className="label" style={{ fontSize: 10 }}>Conversão (%)</label>
                                <input className="input" type="number" value={mm.conv} onChange={(e) => setMemberMeta(m.id, { conv: Number(e.target.value) || 0 })} style={{ height: 32 }} />
                              </div>
                              <div className="row" style={{ gap: 6, fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                <Ic name="mail" size={11} /><span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</span>
                              </div>
                              <div className="row" style={{ gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                                <Ic name="phone" size={11} />{m.phone}
                              </div>
                            </div>
                          </div>}
                      </div>
                    </div>);
                })}
              </div>}
          </TeamSection>

          <TeamSection title="Comissão da equipe" icon="reports">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={f.commType} onChange={(e) => set('commType', e.target.value)}>
                  <option>% sobre vendas</option><option>Valor fixo</option><option>Escalonada</option>
                </select>
              </div>
              <div>
                <label className="label">Percentual base</label>
                <input className="input" value={f.commPct} onChange={(e) => set('commPct', e.target.value)} />
              </div>
              <div>
                <label className="label">Bônus por meta</label>
                <input className="input" value={f.commBonus} onChange={(e) => set('commBonus', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 10 }}>
              <div>
                <label className="label">Meta de atendimentos / mês</label>
                <input className="input" type="number" value={f.metaAtend} onChange={(e) => set('metaAtend', e.target.value)} />
              </div>
              <div>
                <label className="label">Meta de conversões (%)</label>
                <input className="input" type="number" value={f.conv} onChange={(e) => set('conv', e.target.value)} />
              </div>
              <div>
                <label className="label">Tempo médio resp. (min)</label>
                <input className="input" type="number" value={f.tmr} onChange={(e) => set('tmr', e.target.value)} />
              </div>
            </div>
          </TeamSection>
        </div>}

      {/* === TAB 3: Canais, Funis & Observações === */}
      {tab === 'canais' &&
        <div>
          <TeamSection title="Canais de atendimento" icon="link">
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {CHANNELS.map(([ic, l]) => {
                const on = f.channels.includes(ic);
                return (
                  <label key={ic} onClick={() => toggleArr('channels', ic)} className="row" style={{ gap: 6, padding: '10px 14px', border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--accent-soft)' : 'transparent', borderRadius: 20, fontSize: 'var(--type-sm)', cursor: 'pointer', color: on ? 'var(--accent-700)' : 'var(--text)', fontWeight: on ? 600 : 500 }}>
                    <Ic name={ic} size={14} />{l}
                  </label>);
              })}
            </div>
          </TeamSection>

          <TeamSection title="Funis atribuídos" icon="reports">
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {FUNNELS.map((fn) => {
                const on = f.funnels.includes(fn);
                return (
                  <label key={fn} onClick={() => toggleArr('funnels', fn)} className="row" style={{ gap: 6, padding: '10px 14px', border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--accent-soft)' : 'transparent', borderRadius: 20, fontSize: 'var(--type-sm)', cursor: 'pointer', color: on ? 'var(--accent-700)' : 'var(--text)', fontWeight: on ? 600 : 500 }}>
                    {fn}
                  </label>);
              })}
            </div>
          </TeamSection>

          <TeamSection title="Observações internas" icon="settings">
            <textarea className="input" rows={6} value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Anotações visíveis apenas para administradores..." />
          </TeamSection>
        </div>}

      {/* Delete confirmation */}
      {confirmDel &&
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, animation: delClosing ? 'fade-out .18s ease forwards' : 'fade .15s ease' }} onClick={() => setConfirmDel(false)}>
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ padding: 22, maxWidth: 420, animation: delClosing ? 'pop-out .18s ease forwards' : 'pop .2s ease' }}>
            <div style={{ fontWeight: 700, fontSize: 'var(--type-md)' }}>Excluir a equipe {f.teamName}?</div>
            <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 6 }}>Esta ação remove a equipe permanentemente. Os membros não serão excluídos da plataforma.</div>
            <div className="row" style={{ gap: 8, marginTop: 18, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setConfirmDel(false)}>Cancelar</button>
              <button className="btn btn-delete" onClick={() => {
                setDelClosing(true);
                setTimeout(() => {
                  setConfirmDel(false);
                  setDelClosing(false);
                  const close = drawerClose.current;
                  if (close) close(() => onDelete(initial.id));
                  else onDelete(initial.id);
                }, 180);
              }}>
                <Ic name="trash" size={13} /> Excluir equipe
              </button>
            </div>
          </div>
        </div>}
    </Drawer>);
}

function TeamSection({ title, icon, actions, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div className="row" style={{ gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-700)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <Ic name={icon} size={14} />
        </span>
        <div style={{ fontSize: 'var(--type-md)', fontWeight: 700 }}>{title}</div>
        <div style={{ flex: 1 }} />
        {actions}
      </div>
      {children}
    </div>);
}

Object.assign(window, { TeamDrawer });
