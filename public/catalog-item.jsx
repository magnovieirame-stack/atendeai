// catalog-item.jsx — Drawer to add/edit a product or service (with AI training fields)

// Unidades de medida padrão do sistema (o usuário pode cadastrar outras pelo "+").
const DEFAULT_UNIDADES = [
  { sigla: 'UN',  nome: 'Unidade' },
  { sigla: 'CX',  nome: 'Caixa' },
  { sigla: 'PCT', nome: 'Pacote' },
  { sigla: 'FD',  nome: 'Fardo' },
  { sigla: 'KG',  nome: 'Quilograma' },
  { sigla: 'G',   nome: 'Grama' },
  { sigla: 'L',   nome: 'Litro' },
  { sigla: 'ML',  nome: 'Mililitro' },
  { sigla: 'M',   nome: 'Metro' },
  { sigla: 'PAR', nome: 'Par' },
  { sigla: 'DZ',  nome: 'Dúzia' },
];

// Popup: cadastrar nova unidade (Nome + Sigla). Mesma cara do "Nova categoria".
function NewUnitModal({ onClose, onCreate }) {
  const [nome, setNome] = React.useState('');
  const [sigla, setSigla] = React.useState('');
  const valid = nome.trim().length >= 2 && sigla.trim().length >= 1;
  return (
    <Modal title="Nova unidade" onClose={onClose} size="sm"
      footer={<>
        <div style={{ flex: 1 }} />
        <button className="btn fin-btn-back" onClick={onClose}>Voltar</button>
        <button className="btn btn-save" disabled={!valid} style={{ opacity: valid ? 1 : .55 }} onClick={() => onCreate({ nome: nome.trim(), sigla: sigla.trim().toUpperCase() })}>
          <Ic name="check" size={13} /> Criar
        </button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="label">NOME DA UNIDADE</label>
          <input className="input" value={nome} autoFocus onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Galão" />
        </div>
        <div>
          <label className="label">SIGLA</label>
          <input className="input" value={sigla} onChange={(e) => setSigla(e.target.value)} maxLength={8} placeholder="Ex.: GL" style={{ textTransform: 'uppercase' }} />
        </div>
      </div>
    </Modal>
  );
}

function CatalogItemDrawer({ initial, onClose, onSave }) {
  const isEdit = !!initial;
  const blank = {
    kind: 'produto', // 'produto' | 'servico'
    name: '',
    sku: '',
    cat: '',
    short: '',
    desc: '',
    price: 0,
    promoPrice: 0,
    cost: 0,
    unit: 'UN',
    stock: 0,
    stockMin: 0,
    controlaEstoque: true,
    active: true,
    showInCatalog: true,
    // service-only
    duration: 60,
    location: 'No salão',
    requiresBooking: true,
    // commerce
    images: [],
    tags: [],
    variants: [],
    link: '', // link externo (loja, vídeo, landing) — salvo em extras

    // AI training
    aiSummary: '',
    aiTone: 'Amigável',
    aiKeywords: [],
    aiFaq: [{ q: '', a: '' }],
    aiUpsell: '',
    aiContraindications: '',
    aiNotShare: '',
    aiAttachments: [],
  };
  const [f, setF] = React.useState(() => initial ? { ...blank, ...initial } : blank);
  const [tab, setTab] = React.useState('basico');
  const [tagInput, setTagInput] = React.useState('');
  const [kwInput, setKwInput] = React.useState('');
  const [cats, setCats] = React.useState([]);          // todas as categorias (Produto + Serviço)
  const [newCatOpen, setNewCatOpen] = React.useState(false);
  const [unidades, setUnidades] = React.useState(DEFAULT_UNIDADES); // padrão + personalizadas
  const [newUnitOpen, setNewUnitOpen] = React.useState(false);
  const [tried, setTried] = React.useState(false); // marca se já tentou salvar (mostra erros)

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const isService = f.kind === 'servico';
  const catTipo = isService ? 'Serviço' : 'Produto';            // tipo conforme produto/serviço
  const catOptions = cats.filter((c) => c.tipo === catTipo);    // só as do tipo atual

  // Categorias vêm do sistema compartilhado (financeiro-categorias).
  React.useEffect(() => {
    let alive = true;
    if (window.API && window.API.getFinCategorias) {
      window.API.getFinCategorias()
        .then((r) => { if (alive) setCats(r.categorias || []); })
        .catch(() => {});
    }
    return () => { alive = false; };
  }, []);

  // Cria a categoria pelo popup compartilhado (no tipo atual) e já a seleciona.
  const addCategoria = async (d) => {
    try {
      const r = await window.API.createFinCategoria({ nome: d.nome, tipo: d.tipo || catTipo });
      const cat = r && r.categoria;
      if (cat) {
        setCats((p) => p.some((x) => x.id === cat.id) ? p : [...p, cat]);
        set('cat', cat.nome);
        window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Categoria criada', descricao: cat.nome });
      }
    } catch (e) {
      window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao criar categoria', descricao: (e && e.message) || 'Não foi possível criar a categoria.' });
    } finally {
      setNewCatOpen(false);
    }
  };

  // Unidades: junta as padrão com as personalizadas (do banco), dedup por sigla.
  React.useEffect(() => {
    let alive = true;
    if (window.API && window.API.getUnidades) {
      window.API.getUnidades()
        .then((r) => {
          if (!alive) return;
          const bySigla = {};
          DEFAULT_UNIDADES.forEach((u) => { bySigla[u.sigla] = u; });
          (r.unidades || []).forEach((u) => { bySigla[u.sigla] = u; });
          setUnidades(Object.values(bySigla));
        })
        .catch(() => {});
    }
    return () => { alive = false; };
  }, []);

  // Cria a unidade pelo popup e já a seleciona no campo.
  const addUnidade = async (d) => {
    try {
      const r = await window.API.createUnidade({ nome: d.nome, sigla: d.sigla });
      const u = r && r.unidade;
      if (u) {
        setUnidades((p) => p.some((x) => x.sigla === u.sigla) ? p.map((x) => x.sigla === u.sigla ? u : x) : [...p, u]);
        set('unit', u.sigla);
        window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Unidade criada', descricao: u.nome + ' (' + u.sigla + ')' });
      }
    } catch (e) {
      window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao criar unidade', descricao: (e && e.message) || 'Não foi possível criar a unidade.' });
    } finally {
      setNewUnitOpen(false);
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!f.tags.includes(t)) setF(p => ({ ...p, tags: [...p.tags, t] }));
    setTagInput('');
  };
  const removeTag = (t) => setF(p => ({ ...p, tags: p.tags.filter(x => x !== t) }));
  const addKw = () => {
    const t = kwInput.trim();
    if (!t) return;
    if (!f.aiKeywords.includes(t)) setF(p => ({ ...p, aiKeywords: [...p.aiKeywords, t] }));
    setKwInput('');
  };
  const removeKw = (t) => setF(p => ({ ...p, aiKeywords: p.aiKeywords.filter(x => x !== t) }));

  const updateFaq = (i, k, v) => setF(p => ({ ...p, aiFaq: p.aiFaq.map((row, idx) => idx === i ? { ...row, [k]: v } : row) }));
  const addFaq = () => setF(p => ({ ...p, aiFaq: [...p.aiFaq, { q: '', a: '' }] }));
  const removeFaq = (i) => setF(p => ({ ...p, aiFaq: p.aiFaq.filter((_, idx) => idx !== i) }));

  const updateVariant = (i, k, v) => setF(p => ({ ...p, variants: p.variants.map((row, idx) => idx === i ? { ...row, [k]: v } : row) }));
  const addVariant = () => setF(p => ({ ...p, variants: [...p.variants, { name: '', price: '', stock: 0 }] }));
  const removeVariant = (i) => setF(p => ({ ...p, variants: p.variants.filter((_, idx) => idx !== i) }));

  const tabs = [
    { id: 'basico',   label: 'Informações básicas', icon: 'tag' },
    { id: 'preco',    label: 'Preço & estoque',     icon: 'wallet' },
    { id: 'midia',    label: 'Mídia',               icon: 'image' },
    { id: 'ai',       label: 'Treinamento da IA',   icon: 'sparkles' },
  ];

  // Obrigatórios: Nome, Categoria e Valor (preço de venda). Marca em vermelho
  // (sem trocar de aba) e avisa por toast; só fecha/salva quando válido.
  const RED = { borderColor: '#FF452A', background: '#FFEBEC' };
  const errName = tried && !f.name.trim();
  const errCat = tried && !f.cat;
  const errPrice = tried && !(Number(f.price) > 0);
  const validate = () => {
    const miss = [];
    if (!f.name.trim()) miss.push('Nome');
    if (!f.cat) miss.push('Categoria');
    if (!(Number(f.price) > 0)) miss.push('Valor');
    if (miss.length) {
      setTried(true);
      window.showToast && window.showToast({ tipo: 'erro', titulo: 'Campos obrigatórios', descricao: 'Preencha: ' + miss.join(', ') + '.' });
      return false;
    }
    return true;
  };
  const commitSave = () => onSave({ ...f, name: f.name.trim() });

  return (
    <Drawer
      title={isEdit ? `Editar ${f.kind === 'servico' ? 'serviço' : 'produto'} · ${f.name}` : `Cadastrar ${f.kind === 'servico' ? 'serviço' : 'produto'}`}
      subtitle="Os dados abaixo são usados pelo Agente IA para responder dúvidas e vender este item"
      onClose={onClose}
      width="50vw"
      footer={(close) => <>
        <div className="muted" style={{ fontSize: 'var(--type-sm)', flex: 1 }}>
          <span className="row" style={{ gap: 6 }}>
            <Ic name="sparkles" size={12} style={{ color: 'var(--ai)' }} />
            Quanto mais detalhado, melhor o agente vende e tira dúvidas.
          </span>
        </div>
        <ActionButton action="salvar" size="md" efeito={false} label={isEdit ? 'Salvar alterações' : 'Salvar item'} onClick={() => { if (validate()) close(commitSave); }} />
      </>}
    >
      {/* Kind switch — Product vs Service */}
      <div className="cat-kind">
        {[
          { id: 'produto', label: 'Produto', icon: 'cart', desc: 'Item físico vendido com estoque' },
          { id: 'servico', label: 'Serviço', icon: 'agenda', desc: 'Atendimento agendado por duração' },
        ].map(k => {
          const on = f.kind === k.id;
          return (
            <button
              type="button"
              key={k.id}
              className={`cat-kind-card ${on ? 'on' : ''}`}
              onClick={() => set('kind', k.id)}
            >
              <span className="cat-kind-ic"><Ic name={k.icon} size={18} /></span>
              <span className="cat-kind-text">
                <span className="cat-kind-l">{k.label}</span>
                <span className="cat-kind-d muted">{k.desc}</span>
              </span>
              <span className={`cat-kind-radio ${on ? 'on' : ''}`}>
                {on && <span />}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="cat-tabs">
        {tabs.map(t => (
          <div key={t.id} className={`cat-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <Ic name={t.icon} size={13} /> {t.label}
          </div>
        ))}
      </div>

      {/* Basic */}
      {tab === 'basico' && (
        <div className="col" style={{ gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <div>
              <label className="label">Nome {isService ? 'do serviço' : 'do produto'} *</label>
              <input className="input" value={f.name} onChange={e => set('name', e.target.value)} placeholder={isService ? 'Ex: Limpeza de pele profunda' : 'Ex: Sérum facial vitamina C'} style={errName ? RED : undefined} />
              {errName && <div className="row" style={{ gap: 4, color: '#FF452A', fontSize: 11, fontWeight: 600, marginTop: 4 }}><Ic name="alert" size={11} /> Informe o nome.</div>}
            </div>
            <div>
              <label className="label">{isService ? 'Código interno' : 'SKU / código'}</label>
              <input className="input" value={f.sku} onChange={e => set('sku', e.target.value)} placeholder={isService ? 'SERV-001' : 'PRD-001'} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="label">Categoria *</label>
              <div className="row" style={{ gap: 6 }}>
                <select className="input" value={f.cat || ''} onChange={e => set('cat', e.target.value)} style={{ flex: 1, ...(errCat ? RED : {}) }}>
                  <option value="">Selecione uma categoria…</option>
                  {f.cat && !catOptions.some(c => c.nome === f.cat) && <option value={f.cat}>{f.cat}</option>}
                  {catOptions.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                </select>
                <button className="btn" type="button" onClick={() => setNewCatOpen(true)} title="Cadastrar categoria"><Ic name="plus" size={13} /></button>
              </div>
              {errCat && <div className="row" style={{ gap: 4, color: '#FF452A', fontSize: 11, fontWeight: 600, marginTop: 4 }}><Ic name="alert" size={11} /> Selecione uma categoria.</div>}
            </div>
            <div>
              <label className="label">Etiquetas</label>
              <div className="row" style={{ gap: 6 }}>
                <input
                  className="input"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="Pressione Enter para adicionar"
                />
                <button className="btn" onClick={addTag} type="button"><Ic name="plus" size={13} /></button>
              </div>
              {f.tags.length > 0 && (
                <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {f.tags.map(t => (
                    <span key={t} className="chip" onClick={() => removeTag(t)} style={{ cursor: 'pointer' }}>
                      {t} <Ic name="x" size={10} />
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="label">Descrição curta · usada em listas e atalhos</label>
            <input className="input" value={f.short} onChange={e => set('short', e.target.value)} maxLength={140} placeholder="Uma frase que resume o item (até 140 caracteres)" />
            <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{f.short.length}/140</div>
          </div>

          <div>
            <label className="label">Descrição completa</label>
            <textarea className="input" rows={5} value={f.desc} onChange={e => set('desc', e.target.value)} placeholder={isService ? 'Descreva o serviço, passo a passo, técnica utilizada, indicações, resultados esperados...' : 'Descreva o produto, composição, modo de uso, indicações, benefícios...'} />
          </div>

          {isService && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label className="label">Duração (min)</label>
                <input className="input" type="number" value={f.duration} onChange={e => set('duration', e.target.value)} />
              </div>
              <div>
                <label className="label">Local</label>
                <select className="input" value={f.location} onChange={e => set('location', e.target.value)}>
                  <option>No salão</option>
                  <option>A domicílio</option>
                  <option>Online</option>
                  <option>Híbrido</option>
                </select>
              </div>
              <div>
                <label className="label">Requer agendamento</label>
                <div style={{ paddingTop: 6 }}><Toggle on={f.requiresBooking} onChange={v => set('requiresBooking', v)} label={f.requiresBooking ? 'Sim' : 'Não'} /></div>
              </div>
            </div>
          )}

          <div className="row" style={{ gap: 24 }}>
            <Toggle on={f.active} onChange={v => set('active', v)} label="Ativo (em vendas)" />
            <Toggle on={f.showInCatalog} onChange={v => set('showInCatalog', v)} label="Aparece no catálogo público" />
          </div>
        </div>
      )}

      {/* Price & stock */}
      {tab === 'preco' && (
        <div className="col" style={{ gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label className="label">Preço de venda *</label>
              <window.MoneyInput value={f.price} onChange={(v, n) => set('price', n)} style={errPrice ? RED : undefined} />
              {errPrice && <div className="row" style={{ gap: 4, color: '#FF452A', fontSize: 11, fontWeight: 600, marginTop: 4 }}><Ic name="alert" size={11} /> Informe o valor.</div>}
            </div>
            <div>
              <label className="label">Preço promocional</label>
              <window.MoneyInput value={f.promoPrice} onChange={(v, n) => set('promoPrice', n)} />
            </div>
            <div>
              <label className="label">Custo</label>
              <window.MoneyInput value={f.cost} onChange={(v, n) => set('cost', n)} />
            </div>
          </div>

          {!isService ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'start' }}>
                <div>
                  <label className="label">Unidade</label>
                  <div className="row" style={{ gap: 6 }}>
                    <select className="input" value={f.unit} onChange={e => set('unit', e.target.value)} style={{ flex: 1 }}>
                      {!unidades.some(u => u.sigla === f.unit) && f.unit && <option value={f.unit}>{f.unit}</option>}
                      {unidades.map(u => <option key={u.sigla} value={u.sigla}>{u.nome} ({u.sigla})</option>)}
                    </select>
                    <button className="btn" type="button" onClick={() => setNewUnitOpen(true)} title="Cadastrar unidade"><Ic name="plus" size={13} /></button>
                  </div>
                </div>
                <div>
                  <label className="label">Controlar estoque</label>
                  <div style={{ paddingTop: 6 }}>
                    <Toggle on={f.controlaEstoque} onChange={v => set('controlaEstoque', v)} label={f.controlaEstoque ? 'Sim — controla entradas e saídas' : 'Não — vende sem estoque'} />
                  </div>
                </div>
              </div>

              {f.controlaEstoque && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="label">Estoque atual</label>
                    <input className="input" type="number" value={f.stock} onChange={e => set('stock', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Estoque mínimo (alerta)</label>
                    <input className="input" type="number" value={f.stockMin} onChange={e => set('stockMin', e.target.value)} />
                  </div>
                </div>
              )}

              <div className="card card-pad" style={{ background: 'var(--surface-2)' }}>
                <div className="row">
                  <div className="h3" style={{ fontSize: 'var(--type-md)' }}>Variantes</div>
                  <div className="muted" style={{ fontSize: 'var(--type-sm)', marginLeft: 8 }}>cor, tamanho, kit...</div>
                  <div className="spacer" />
                  <button className="btn btn-sm" type="button" onClick={addVariant}><Ic name="plus" size={12} /> Adicionar variante</button>
                </div>
                {f.variants.length === 0 ? (
                  <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 8 }}>Nenhuma variante — o produto é vendido como item único.</div>
                ) : (
                  <div className="col" style={{ gap: 6, marginTop: 10 }}>
                    {f.variants.map((v, i) => (
                      <div key={i} className="row" style={{ gap: 6 }}>
                        <input className="input" placeholder="Nome (ex: 50ml)" value={v.name} onChange={e => updateVariant(i, 'name', e.target.value)} style={{ flex: 2 }} />
                        <input className="input" placeholder="Preço" value={v.price} onChange={e => updateVariant(i, 'price', e.target.value)} style={{ flex: 1 }} />
                        <input className="input" type="number" placeholder="Estoque" value={v.stock} onChange={e => updateVariant(i, 'stock', e.target.value)} style={{ flex: 1 }} />
                        <button className="btn btn-ghost btn-icon" type="button" onClick={() => removeVariant(i)}><Ic name="x" size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="card card-pad" style={{ background: 'var(--surface-2)' }}>
              <div className="h3" style={{ fontSize: 'var(--type-md)' }}>Pacotes / sessões</div>
              <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>Crie variações com preços diferentes (ex: 1 sessão, pacote de 5).</div>
              <div className="row" style={{ marginTop: 10 }}>
                <div className="spacer" />
                <button className="btn btn-sm" type="button" onClick={addVariant}><Ic name="plus" size={12} /> Adicionar pacote</button>
              </div>
              {f.variants.length > 0 && (
                <div className="col" style={{ gap: 6, marginTop: 10 }}>
                  {f.variants.map((v, i) => (
                    <div key={i} className="row" style={{ gap: 6 }}>
                      <input className="input" placeholder="Nome (ex: Pacote 5 sessões)" value={v.name} onChange={e => updateVariant(i, 'name', e.target.value)} style={{ flex: 2 }} />
                      <input className="input" placeholder="Preço" value={v.price} onChange={e => updateVariant(i, 'price', e.target.value)} style={{ flex: 1 }} />
                      <button className="btn btn-ghost btn-icon" type="button" onClick={() => removeVariant(i)}><Ic name="x" size={13} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Media */}
      {tab === 'midia' && (
        <div className="col" style={{ gap: 14 }}>
          <div className="card card-pad" style={{ background: 'var(--surface-2)' }}>
            <div className="h3" style={{ fontSize: 'var(--type-md)' }}>Fotos e vídeos</div>
            <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>A primeira mídia é a capa, mostrada nas mensagens e no catálogo. Arraste para reordenar.</div>
            <CatalogMediaUploader media={f.images} onChange={(arr) => set('images', arr)} />
          </div>

          <div className="card card-pad">
            <div className="h3" style={{ fontSize: 'var(--type-md)' }}>Documentos de apoio</div>
            <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 4 }}>Fichas técnicas, bulas, manuais — o agente lê e usa para responder.</div>
            <CatalogDocUploader docs={f.aiAttachments} onChange={(arr) => set('aiAttachments', arr)} />
          </div>

          <div>
            <label className="label">Link externo (loja, vídeo, landing page)</label>
            <input className="input" value={f.link} onChange={e => set('link', e.target.value)} placeholder="https://..." />
          </div>
        </div>
      )}

      {/* AI training */}
      {tab === 'ai' && (
        <div className="col" style={{ gap: 14 }}>
          <div className="card card-pad" style={{ background: 'linear-gradient(135deg, color-mix(in oklab, var(--ai) 8%, var(--surface)), var(--surface))', borderColor: 'color-mix(in oklab, var(--ai) 25%, var(--border))' }}>
            <div className="row" style={{ gap: 8 }}>
              <span className="badge badge-ai"><Ic name="sparkles" size={11} /> Powered by Claude</span>
              <div className="spacer" />
              <button type="button" className="btn btn-sm"><Ic name="sparkles" size={12} /> Gerar com IA</button>
            </div>
            <div style={{ fontSize: 'var(--type-md)', fontWeight: 600, marginTop: 8 }}>Resumo para o agente</div>
            <div className="muted" style={{ fontSize: 'var(--type-sm)' }}>Como o agente deve apresentar este item ao cliente. Use linguagem natural, como se explicasse a um vendedor novo.</div>
            <textarea className="input" rows={4} style={{ marginTop: 10 }} value={f.aiSummary} onChange={e => set('aiSummary', e.target.value)} placeholder={isService ? 'Este serviço é indicado para... Os principais benefícios são... Tem duração de... Costuma ser combinado com...' : 'Este produto resolve... É indicado para... O diferencial é... Costumamos vender junto com...'} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="label">Tom de voz ao apresentar</label>
              <select className="input" value={f.aiTone} onChange={e => set('aiTone', e.target.value)}>
                <option>Amigável</option>
                <option>Formal</option>
                <option>Informal</option>
                <option>Consultivo</option>
                <option>Direto</option>
              </select>
            </div>
            <div>
              <label className="label">Sugestão de upsell / cross-sell</label>
              <input className="input" value={f.aiUpsell} onChange={e => set('aiUpsell', e.target.value)} placeholder="Ex: oferecer pacote de 5 sessões; combinar com sérum X" />
            </div>
          </div>

          <div>
            <label className="label">Palavras-chave que disparam este item</label>
            <div className="muted" style={{ fontSize: 'var(--type-sm)', marginBottom: 6 }}>Quando o cliente mencionar esses termos, o agente sugere este item.</div>
            <div className="row" style={{ gap: 6 }}>
              <input
                className="input"
                value={kwInput}
                onChange={e => setKwInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKw(); } }}
                placeholder="Ex: acne, manchas, hidratação..."
              />
              <button className="btn" type="button" onClick={addKw}><Ic name="plus" size={13} /></button>
            </div>
            {f.aiKeywords.length > 0 && (
              <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {f.aiKeywords.map(t => (
                  <span key={t} className="chip" onClick={() => removeKw(t)} style={{ cursor: 'pointer' }}>
                    {t} <Ic name="x" size={10} />
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="card card-pad">
            <div className="row">
              <div className="h3" style={{ fontSize: 'var(--type-md)' }}>Perguntas frequentes (FAQ)</div>
              <div className="muted" style={{ fontSize: 'var(--type-sm)', marginLeft: 8 }}>treina o agente com respostas prontas</div>
              <div className="spacer" />
              <button className="btn btn-sm" type="button" onClick={addFaq}><Ic name="plus" size={12} /> Pergunta</button>
            </div>
            <div className="col" style={{ gap: 10, marginTop: 10 }}>
              {f.aiFaq.map((row, i) => (
                <div key={i} className="cat-faq-row">
                  <div className="cat-faq-num">{i + 1}</div>
                  <div className="col" style={{ flex: 1, gap: 6 }}>
                    <input className="input" placeholder="Pergunta do cliente (ex: 'Esse procedimento dói?')" value={row.q} onChange={e => updateFaq(i, 'q', e.target.value)} />
                    <textarea className="input" rows={2} placeholder="Como o agente deve responder" value={row.a} onChange={e => updateFaq(i, 'a', e.target.value)} />
                  </div>
                  {f.aiFaq.length > 1 && (
                    <button type="button" className="btn btn-ghost btn-icon" onClick={() => removeFaq(i)}><Ic name="trash" size={13} /></button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="label">{isService ? 'Contraindicações / cuidados' : 'Restrições / contraindicações'}</label>
              <textarea className="input" rows={3} value={f.aiContraindications} onChange={e => set('aiContraindications', e.target.value)} placeholder={isService ? 'Gestantes, pele em processo inflamatório...' : 'Crianças, alérgicos a X...'} />
            </div>
            <div>
              <label className="label">O agente NÃO deve falar sobre</label>
              <textarea className="input" rows={3} value={f.aiNotShare} onChange={e => set('aiNotShare', e.target.value)} placeholder="Ex: custo, fornecedor, comparações com concorrentes específicos" />
            </div>
          </div>

          <div className="cat-ai-tip">
            <Ic name="sparkles" size={14} style={{ color: 'var(--ai)' }} />
            <span><strong>Dica:</strong> ao salvar, este item será adicionado à base de conhecimento de todos os agentes ativos. Você pode editar os detalhes de treinamento a qualquer momento.</span>
          </div>
        </div>
      )}

      {/* Popup de cadastrar categoria — reaproveitado do sistema (accounts.jsx) */}
      {newCatOpen && window.NewCategoryModal &&
        <window.NewCategoryModal defaultTipo={catTipo} onClose={() => setNewCatOpen(false)} onCreate={addCategoria} />}

      {/* Popup de cadastrar unidade (Nome + Sigla) */}
      {newUnitOpen &&
        <NewUnitModal onClose={() => setNewUnitOpen(false)} onCreate={addUnidade} />}
    </Drawer>
  );
}

Object.assign(window, { CatalogItemDrawer });

// ============================================================
// Media uploader — photos & videos (drag, picker, preview, reorder, remove)
// ============================================================
function CatalogMediaUploader({ media = [], onChange }) {
  const inputRef = React.useRef(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [dragIdx, setDragIdx] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const fmtSize = (b) => {
    if (b > 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + ' MB';
    return Math.max(1, Math.round(b / 1024)) + ' KB';
  };

  // Sobe cada arquivo pro Storage (via API) e guarda a URL real. Em falha real,
  // avisa e cai pra preview local (blob); no demo, idem (não persiste).
  const ingest = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (!files.length) return;
    setBusy(true);
    const out = [];
    for (const f of files) {
      const base = { id: 'm' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), name: f.name, size: f.size, type: f.type.startsWith('video/') ? 'video' : 'image' };
      try {
        const r = await window.API.uploadCatalogoMidia(f);
        if (r && r.midia && r.midia.url) { base.url = r.midia.url; base.path = r.midia.path; }
        else { base.url = URL.createObjectURL(f); base._local = true; } // demo / sem URL
      } catch (e) {
        base.url = URL.createObjectURL(f); base._local = true;
        window.showToast && window.showToast({ tipo: 'erro', titulo: 'Falha ao enviar mídia', descricao: (e && e.message) || f.name });
      }
      out.push(base);
    }
    onChange([...media, ...out]);
    setBusy(false);
  };

  const onPick = () => inputRef.current?.click();
  const onFiles = (e) => {
    ingest(e.target.files);
    e.target.value = '';
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files?.length) ingest(e.dataTransfer.files);
  };

  const remove = (id) => {
    const m = media.find(x => x.id === id);
    if (m?.url?.startsWith('blob:')) { try { URL.revokeObjectURL(m.url); } catch {} }
    onChange(media.filter(x => x.id !== id));
  };

  const onSlotDragStart = (i) => setDragIdx(i);
  const onSlotDragOver = (e) => { e.preventDefault(); };
  const onSlotDrop = (i) => {
    if (dragIdx == null || dragIdx === i) { setDragIdx(null); return; }
    const next = [...media];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(i, 0, moved);
    onChange(next);
    setDragIdx(null);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        style={{ display: 'none' }}
        onChange={onFiles}
      />
      <div
        className={`cat-media-grid ${dragOver ? 'is-dragover' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {media.map((m, i) => (
          <div
            key={m.id}
            className={`cat-media-item ${i === 0 ? 'is-cover' : ''}`}
            draggable
            onDragStart={() => onSlotDragStart(i)}
            onDragOver={onSlotDragOver}
            onDrop={() => onSlotDrop(i)}
            title={m.name}
          >
            {m.type === 'video' ? (
              <>
                <video src={m.url} muted playsInline />
                <span className="cat-media-badge"><Ic name="play" size={10} /> Vídeo</span>
              </>
            ) : (
              <img src={m.url} alt={m.name} />
            )}
            {i === 0 && <span className="cat-media-cover">Capa</span>}
            <span className="cat-media-size">{fmtSize(m.size)}</span>
            <button type="button" className="cat-media-x" onClick={() => remove(m.id)} title="Remover">
              <Ic name="x" size={12} />
            </button>
          </div>
        ))}
        <button type="button" className="cat-media-slot cat-media-add" onClick={onPick} disabled={busy} style={busy ? { opacity: .7, cursor: 'wait' } : null}>
          <Ic name={busy ? 'history' : 'plus'} size={18} />
          <span>{busy ? 'Enviando…' : (media.length ? 'Adicionar' : 'Carregar mídia')}</span>
          <span className="cat-media-hint muted">ou arraste aqui</span>
        </button>
      </div>
      {media.length === 0 && (
        <div className="cat-media-empty-tip muted">
          Aceita JPG, PNG, WEBP, MP4. Adicione pelo menos 1 foto — o agente envia para o cliente.
        </div>
      )}
    </>
  );
}

// ============================================================
// Document uploader — PDFs / DOCs the agent reads
// ============================================================
function CatalogDocUploader({ docs = [], onChange }) {
  const inputRef = React.useRef(null);
  const [busy, setBusy] = React.useState(false);
  const fmtSize = (b) => b > 1024 * 1024 ? (b / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
  const onFiles = async (e) => {
    const list = Array.from(e.target.files || []);
    e.target.value = '';
    if (!list.length) return;
    setBusy(true);
    const out = [];
    for (const f of list) {
      const base = { id: 'd' + Date.now() + '-' + Math.random().toString(36).slice(2, 6), name: f.name, size: f.size, kind: (f.name.split('.').pop() || '').toUpperCase() };
      try {
        const r = await window.API.uploadCatalogoMidia(f);
        if (r && r.midia && r.midia.url) { base.url = r.midia.url; base.path = r.midia.path; }
      } catch (err) {
        window.showToast && window.showToast({ tipo: 'erro', titulo: 'Falha ao enviar documento', descricao: (err && err.message) || f.name });
      }
      out.push(base);
    }
    onChange([...docs, ...out]);
    setBusy(false);
  };
  const remove = (id) => onChange(docs.filter(x => x.id !== id));
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
        multiple
        style={{ display: 'none' }}
        onChange={onFiles}
      />
      <button type="button" className="btn" style={{ marginTop: 10 }} onClick={() => inputRef.current?.click()} disabled={busy}>
        <Ic name={busy ? 'history' : 'upload'} size={13} /> {busy ? 'Enviando…' : 'Carregar arquivo (PDF, DOC)'}
      </button>
      {docs.length > 0 && (
        <div className="col" style={{ gap: 6, marginTop: 10 }}>
          {docs.map(d => (
            <div key={d.id} className="cat-doc-row">
              <span className="cat-doc-ext">{d.kind || 'DOC'}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--type-sm)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
              <span className="muted" style={{ fontSize: 11 }}>{fmtSize(d.size)}</span>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => remove(d.id)}><Ic name="x" size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

Object.assign(window, { CatalogMediaUploader, CatalogDocUploader });
