// pdv.jsx — PDV de Venda (Balcão / varejo de produtos). SOMENTE VISUAL (mock).
// Aba lateral de 80% da largura, aberta pelo botão "PDV de Venda" do chatbot.
// Quando aprovado, ligamos no catálogo real + backend de vendas.

(function () {
  const fmtBRL = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtInt = (v) => Number(v || 0).toLocaleString('pt-BR');

  // Paleta para a "foto" do produto (placeholder enquanto não há imagem real).
  const PAL = ['#fde68a', '#fbcfe8', '#bfdbfe', '#bbf7d0', '#e9d5ff', '#fed7aa', '#fecaca', '#a7f3d0', '#fef3c7', '#dbeafe', '#f5d0fe'];

  const VENDEDORES = ['James Potter', 'Karla Zambelly', 'Magno Vieira', 'Paulo Henrique'];

  const METODOS = [
    { id: 'dinheiro', label: 'Dinheiro', ic: 'coins',    cor: '#10b981' },
    { id: 'pix',      label: 'PIX',      ic: 'zap',      cor: '#0ea5e9' },
    { id: 'debito',   label: 'Débito',   ic: 'card-id',  cor: '#6366f1' },
    { id: 'credito',  label: 'Crédito',  ic: 'card-id',  cor: '#8b5cf6' },
    { id: 'boleto',   label: 'Boleto',   ic: 'file-text',cor: '#f59e0b' },
    { id: 'carne',    label: 'Carnê',    ic: 'repeat',   cor: '#ec4899' },
  ];
  const PARCELAVEIS = ['credito', 'boleto', 'carne'];
  const metodoCfg = (id) => METODOS.find((m) => m.id === id) || METODOS[0];

  function PDVDrawer({ cliente, onClose }) {
    const Drawer = window.Drawer || globalThis.Drawer;
    const MoneyInput = window.MoneyInput;

    const [vendedor, setVendedor] = React.useState(VENDEDORES[0]);
    const [query, setQuery] = React.useState('');
    const [produtos, setProdutos] = React.useState([]);     // catálogo real
    const [loadingProd, setLoadingProd] = React.useState(true);
    const [submitting, setSubmitting] = React.useState(false);
    const [cart, setCart] = React.useState([]); // { id, nome, sku, preco, qty, cor, controla }

    // Carrega os produtos reais do catálogo.
    React.useEffect(() => {
      let alive = true;
      if (window.API && window.API.getProdutos) {
        window.API.getProdutos()
          .then((r) => {
            if (!alive) return;
            setProdutos((r.produtos || []).map((p, i) => ({
              id: p.id, nome: p.nome, sku: p.sku || '—',
              preco: Number(p.preco) || 0,
              controla: p.controlaEstoque !== false && p.tipo !== 'servico',
              estoque: (p.controlaEstoque !== false && p.tipo !== 'servico') ? (Number(p.estoque) || 0) : null,
              cor: PAL[i % PAL.length],
            })));
            if (Array.isArray(r.produtos) && r.produtos.length) skelRemember('pdv-prod', r.produtos.length);
          })
          .catch(() => {})
          .finally(() => { if (alive) setLoadingProd(false); });
      } else { setLoadingProd(false); }
      return () => { alive = false; };
    }, []);
    const [descTipo, setDescTipo] = React.useState('valor'); // 'valor' | 'percent'
    const [descValor, setDescValor] = React.useState(0);
    const [acrescimo, setAcrescimo] = React.useState(0);
    const [pagamentos, setPagamentos] = React.useState([{ metodo: 'dinheiro', valor: 0, parcelas: 1, recebido: 0 }]);
    const [done, setDone] = React.useState(null); // mensagem de conclusão (mock)

    const codigo = React.useMemo(() => 'PDV-' + (10000 + Math.floor(Math.abs(Math.sin(cart.length + 1) * 9000))), []);

    const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const q = norm(query.trim());
    const resultados = q ? produtos.filter((p) => norm(p.nome).includes(q) || norm(p.sku).includes(q)) : produtos;

    // ---- cálculos ----
    const subtotal = cart.reduce((s, i) => s + i.preco * i.qty, 0);
    const descontoCalc = descTipo === 'percent' ? subtotal * (Number(descValor) || 0) / 100 : (Number(descValor) || 0);
    const desconto = Math.min(descontoCalc, subtotal);
    const total = Math.max(0, subtotal - desconto + (Number(acrescimo) || 0));
    const pago = pagamentos.reduce((s, p) => s + (Number(p.valor) || 0), 0);
    const restante = total - pago;
    const itensQtd = cart.reduce((s, i) => s + i.qty, 0);

    // ---- ações de carrinho ----
    const addProduto = (p) => {
      setCart((prev) => {
        const ex = prev.find((x) => x.id === p.id);
        if (ex) return prev.map((x) => x.id === p.id ? { ...x, qty: x.qty + 1 } : x);
        return [...prev, { id: p.id, nome: p.nome, sku: p.sku, preco: p.preco, qty: 1, estoque: p.estoque, cor: p.cor, controla: p.controla }];
      });
    };
    const setQty = (id, d) => setCart((prev) => prev.map((x) => x.id === id ? { ...x, qty: Math.max(1, x.qty + d) } : x));
    const setQtyVal = (id, v) => setCart((prev) => prev.map((x) => x.id === id ? { ...x, qty: Math.max(1, parseInt(v, 10) || 1) } : x));
    const removeItem = (id) => setCart((prev) => prev.filter((x) => x.id !== id));
    const clearAll = () => { setCart([]); setDescValor(0); setAcrescimo(0); };
    const addAvulso = () => setCart((prev) => [...prev, { id: 'avulso-' + prev.length + '-' + cart.length, nome: 'Item avulso', sku: '—', preco: 0, qty: 1, avulso: true }]);
    const setItemField = (id, k, v) => setCart((prev) => prev.map((x) => x.id === id ? { ...x, [k]: v } : x));

    // ---- pagamentos ----
    React.useEffect(() => {
      // mantém a 1ª forma sincronizada com o total quando há só uma
      setPagamentos((prev) => prev.length === 1 ? [{ ...prev[0], valor: total }] : prev);
    }, [total]);
    const setPag = (i, k, v) => setPagamentos((prev) => prev.map((p, idx) => idx === i ? { ...p, [k]: v } : p));
    const addSegundaForma = () => setPagamentos((prev) => prev.length >= 2 ? prev : [
      { ...prev[0], valor: Math.max(0, total - restante > 0 ? total / 2 : total) },
      { metodo: 'pix', valor: Math.max(0, total - (prev[0].valor || total / 2)), parcelas: 1, recebido: 0 },
    ]);
    const removeForma = (i) => setPagamentos((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      return next.length ? [{ ...next[0], valor: total }] : [{ metodo: 'dinheiro', valor: total, parcelas: 1, recebido: 0 }];
    });

    const finalizar = (close) => {
      if (cart.length === 0) { window.showToast && window.showToast({ tipo: 'aviso', titulo: 'Carrinho vazio', descricao: 'Adicione ao menos um item.' }); return; }
      const dto = {
        clienteId: (cliente && cliente.clienteId) || null,
        clienteNome: (cliente && cliente.name) || '',
        vendedor,
        desconto, acrescimo: Number(acrescimo) || 0,
        itens: cart.map((it) => ({ produtoId: it.avulso ? null : it.id, nome: it.nome, preco: Number(it.preco) || 0, quantidade: it.qty })),
        pagamentos: pagamentos.map((p) => ({ metodo: p.metodo, valor: Number(p.valor) || 0, parcelas: Math.max(1, parseInt(p.parcelas, 10) || 1) })),
      };
      setSubmitting(true);
      window.API.createVenda(dto)
        .then((r) => {
          setDone('Venda ' + ((r.venda && r.venda.codigo) || '') + ' finalizada! Total ' + fmtBRL(total) + '.');
          window.showToast && window.showToast({ tipo: 'sucesso', titulo: 'Venda finalizada', descricao: 'Total ' + fmtBRL(total) + '.' });
          setTimeout(() => close && close(), 1500);
        })
        .catch((e) => { window.showToast && window.showToast({ tipo: 'erro', titulo: 'Erro ao finalizar venda', descricao: (e && e.message) || 'Não foi possível finalizar a venda.' }); })
        .finally(() => setSubmitting(false));
    };
    const aguardar = (close) => { setDone('Venda colocada em espera (demonstração).'); setTimeout(() => close && close(), 1000); };

    if (!Drawer) return null;

    return (
      <Drawer
        title={<span className="row" style={{ gap: 10 }}><span className="pdv-hd-ic"><Ic name="cart" size={16} /></span><span>PDV · Nova venda</span></span>}
        subtitle="Balcão · venda de produtos"
        onClose={onClose}
        width="80vw"
        rightHead={<div className="pdv-code">CÓDIGO<strong className="tnum">{codigo}</strong></div>}
        footer={(close) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
            <div>
              <div className="pdv-foot-l">TOTAL A PAGAR</div>
              <div className="pdv-foot-v tnum">{fmtBRL(total)}</div>
            </div>
            <div style={{ flex: 1 }} />
            <ActionButton action="cancelar" size="md" onClick={() => close()} />
            <ActionButton action="atencao" size="md" label="Aguardar" icon="clock" onClick={() => aguardar(close)} />
            <ActionButton action="salvar" size="md" label={submitting ? 'Finalizando…' : 'Finalizar venda'} disabled={submitting} onClick={() => finalizar(close)} />
          </div>
        )}>
        <PDVStyles />
        <div className="pdv-grid">
          {/* ===================== ESQUERDA ===================== */}
          <div className="pdv-left">
            {/* toolbar */}
            <div className="pdv-toolbar">
              <div className="pdv-search">
                <Ic name="search" size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
                <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, SKU ou código de barras..." style={{ paddingLeft: 38 }} />
              </div>
              <button className="btn"><Ic name="camera" size={14} /> Escanear</button>
              <div style={{ flex: 1 }} />
              <div className="pdv-biller">
                <label className="pdv-biller-l">Vendedor</label>
                <select className="input" value={vendedor} onChange={(e) => setVendedor(e.target.value)}>
                  {VENDEDORES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>

            {/* grade de produtos p/ adicionar */}
            <div className="pdv-prodgrid-wrap">
              <div className="pdv-section-t">Produtos {query && <span className="muted">· {resultados.length} resultado(s)</span>}</div>
              <div className="pdv-prodgrid">
                {resultados.map((p) => {
                  const semCtrl = p.controla === false || p.estoque == null;
                  const out = !semCtrl && p.estoque <= 0;
                  return (
                    <button key={p.id} type="button" className="pdv-prodcard" disabled={out} onClick={() => addProduto(p)} title={out ? 'Sem estoque' : 'Adicionar'}>
                      <div className="pdv-prodthumb" style={{ background: p.cor }}><Ic name="package" size={20} style={{ opacity: .85 }} /></div>
                      <div className="pdv-prodname">{p.nome}</div>
                      <div className="pdv-prodmeta">
                        <span className="pdv-prodprice tnum">{fmtBRL(p.preco)}</span>
                        <span className={'pdv-prodstock' + (out ? ' out' : (!semCtrl && p.estoque <= 10) ? ' low' : '')}>{semCtrl ? 'Livre' : (out ? 'Esgotado' : 'Estoque ' + fmtInt(p.estoque))}</span>
                      </div>
                    </button>);
                })}
                {loadingProd &&
                  Array.from({ length: skelCount('pdv-prod', 6) }).map((_, i) =>
                    <div key={'sk' + i} className="pdv-prodcard" style={{ pointerEvents: 'none' }}>
                      <Skeleton h={56} r={8} style={{ width: '100%' }} />
                      <Skeleton w="85%" h={12} />
                      <Skeleton w="55%" h={10} style={{ marginTop: 2 }} />
                      <div className="pdv-prodmeta">
                        <Skeleton w={48} h={13} /><Skeleton w={40} h={10} />
                      </div>
                    </div>)}
                {!loadingProd && resultados.length === 0 &&
                  <div className="muted" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 24 }}>{produtos.length === 0 ? 'Nenhum produto no catálogo ainda. Cadastre em Comercial · Catálogo.' : 'Nenhum produto encontrado.'}</div>}
              </div>
            </div>

            {/* carrinho */}
            <div className="pdv-cart card">
              <div className="pdv-cart-hd">
                <span className="pdv-cart-t">ITENS DA VENDA</span>
                <span className="pdv-itens-pill">Itens: {itensQtd}</span>
                <div style={{ flex: 1 }} />
                <button className="btn btn-sm" type="button" onClick={addAvulso}><Ic name="plus" size={12} /> Item avulso</button>
                {cart.length > 0 && <button className="pdv-clear" type="button" onClick={clearAll}><Ic name="x" size={12} /> Limpar tudo</button>}
              </div>
              <div className="pdv-row pdv-row-head">
                <div>Produto</div><div className="ta-r">Preço</div><div className="ta-c">Qtd</div><div className="ta-r">Subtotal</div><div />
              </div>
              <div className="pdv-cart-scroll">
                {cart.length === 0 ?
                  <div className="pdv-cart-empty">
                    <Ic name="cart" size={34} style={{ opacity: .35 }} />
                    <div style={{ marginTop: 10, fontWeight: 600, color: 'var(--text-muted)' }}>Carrinho vazio</div>
                    <div className="muted" style={{ fontSize: 'var(--type-sm)', marginTop: 2 }}>Clique num produto acima para adicionar.</div>
                  </div> :
                  cart.map((it) => (
                    <div key={it.id} className="pdv-row pdv-row-body">
                      <div className="pdv-cellname">
                        <div className="pdv-cellthumb" style={{ background: it.avulso ? 'var(--surface-3)' : (it.cor || '#e2e8f0') }}><Ic name="package" size={16} style={{ opacity: .8 }} /></div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          {it.avulso ?
                            <input className="input pdv-inline" value={it.nome} onChange={(e) => setItemField(it.id, 'nome', e.target.value)} placeholder="Nome do item" /> :
                            <div className="pdv-iname">{it.nome}</div>}
                          <div className="pdv-imeta">SKU {it.sku}{it.estoque != null && !it.avulso ? ' · Estoque ' + fmtInt(it.estoque) : ''}</div>
                        </div>
                      </div>
                      <div className="ta-r">
                        {it.avulso ?
                          (MoneyInput ? <MoneyInput value={it.preco} onChange={(v, n) => setItemField(it.id, 'preco', n)} /> : <input className="input" value={it.preco} onChange={(e) => setItemField(it.id, 'preco', Number(e.target.value) || 0)} />) :
                          <span className="tnum">{fmtBRL(it.preco)}</span>}
                      </div>
                      <div className="ta-c">
                        <div className="pdv-stepper">
                          <button type="button" onClick={() => setQty(it.id, -1)}>−</button>
                          <input value={it.qty} onChange={(e) => setQtyVal(it.id, e.target.value)} className="tnum" />
                          <button type="button" onClick={() => setQty(it.id, +1)}>+</button>
                        </div>
                      </div>
                      <div className="ta-r"><span className="pdv-sub tnum">{fmtBRL(it.preco * it.qty)}</span></div>
                      <div className="ta-c"><button className="pdv-del" type="button" onClick={() => removeItem(it.id)}><Ic name="trash" size={14} /></button></div>
                    </div>))}
              </div>
            </div>
          </div>

          {/* ===================== DIREITA ===================== */}
          <div className="pdv-right">
            {/* cliente */}
            <div className="fin-section-title">Cliente</div>
            <div className="fin-section">
              <div className="pdv-cliente">
                <div className="pdv-cli-avatar">{((cliente && cliente.name) || '?').charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="pdv-cli-name">{(cliente && cliente.name) || 'Consumidor'}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{(cliente && cliente.phone) || 'Sem cliente vinculado'}</div>
                </div>
                <button className="btn btn-sm"><Ic name="user" size={12} /> Trocar</button>
              </div>
            </div>

            {/* resumo */}
            <div className="fin-section-title">Resumo</div>
            <div className="fin-section">
              <div className="pdv-line"><span>Subtotal</span><span className="tnum">{fmtBRL(subtotal)}</span></div>

              <div className="pdv-adjust">
                <div className="pdv-adjust-row">
                  <span>Desconto</span>
                  <div className="pdv-seg">
                    <button className={descTipo === 'valor' ? 'on' : ''} onClick={() => setDescTipo('valor')}>R$</button>
                    <button className={descTipo === 'percent' ? 'on' : ''} onClick={() => setDescTipo('percent')}>%</button>
                  </div>
                  {descTipo === 'percent' ?
                    <div className="pdv-pctwrap"><input className="input tnum" type="number" min="0" max="100" value={descValor} onChange={(e) => setDescValor(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} /><span>%</span></div> :
                    (MoneyInput ? <MoneyInput value={descValor} onChange={(v, n) => setDescValor(n)} /> : <input className="input" value={descValor} onChange={(e) => setDescValor(Number(e.target.value) || 0)} />)}
                </div>
                {desconto > 0 && <div className="pdv-line pdv-line-sub"><span className="muted">Desconto aplicado</span><span className="tnum" style={{ color: '#dc2626' }}>− {fmtBRL(desconto)}</span></div>}

                <div className="pdv-adjust-row">
                  <span>Acréscimo</span>
                  <div style={{ flex: 1 }} />
                  {MoneyInput ? <MoneyInput value={acrescimo} onChange={(v, n) => setAcrescimo(n)} /> : <input className="input" value={acrescimo} onChange={(e) => setAcrescimo(Number(e.target.value) || 0)} />}
                </div>
              </div>

              <div className="pdv-total"><span>Total</span><span className="tnum">{fmtBRL(total)}</span></div>
            </div>

            {/* pagamento */}
            <div className="fin-section-title">Forma de pagamento</div>
            <div className="fin-section">
              {pagamentos.map((p, i) => {
                const cfg = metodoCfg(p.metodo);
                const parcelavel = PARCELAVEIS.includes(p.metodo);
                const nParc = Math.max(1, parseInt(p.parcelas, 10) || 1);
                return (
                  <div key={i} className="pdv-pay">
                    {pagamentos.length > 1 &&
                      <div className="pdv-pay-hd"><span>Forma {i + 1}</span><div style={{ flex: 1 }} /><button className="pdv-del" type="button" onClick={() => removeForma(i)}><Ic name="x" size={12} /></button></div>}
                    <div className="pdv-methods">
                      {METODOS.map((m) => {
                        const on = p.metodo === m.id;
                        return (
                          <button key={m.id} type="button" className={'pdv-method' + (on ? ' on' : '')} onClick={() => setPag(i, 'metodo', m.id)}
                            style={on ? { borderColor: m.cor, background: `color-mix(in oklab, ${m.cor} 12%, var(--surface))`, color: m.cor } : null}>
                            <Ic name={m.ic} size={16} /><span>{m.label}</span>
                          </button>);
                      })}
                    </div>

                    {pagamentos.length > 1 &&
                      <div className="pdv-adjust-row" style={{ marginTop: 10 }}>
                        <span>Valor</span><div style={{ flex: 1 }} />
                        {MoneyInput ? <MoneyInput value={p.valor} onChange={(v, n) => setPag(i, 'valor', n)} /> : <input className="input" value={p.valor} onChange={(e) => setPag(i, 'valor', Number(e.target.value) || 0)} />}
                      </div>}

                    {/* opções por método */}
                    {p.metodo === 'dinheiro' &&
                      <div className="pdv-opts">
                        <div className="pdv-adjust-row"><span>Valor recebido</span><div style={{ flex: 1 }} />
                          {MoneyInput ? <MoneyInput value={p.recebido} onChange={(v, n) => setPag(i, 'recebido', n)} /> : <input className="input" value={p.recebido} onChange={(e) => setPag(i, 'recebido', Number(e.target.value) || 0)} />}
                        </div>
                        <div className="pdv-line pdv-line-sub"><span className="muted">Troco</span><span className="tnum" style={{ fontWeight: 700 }}>{fmtBRL(Math.max(0, (Number(p.recebido) || 0) - (Number(p.valor) || total)))}</span></div>
                      </div>}
                    {p.metodo === 'pix' &&
                      <div className="pdv-pix"><div className="pdv-qr"><Ic name="zap" size={22} /></div><div className="muted" style={{ fontSize: 'var(--type-sm)' }}>QR Code / chave Pix gerado ao finalizar.</div></div>}
                    {parcelavel &&
                      <div className="pdv-opts">
                        <div className="pdv-adjust-row"><span>Parcelas</span><div style={{ flex: 1 }} />
                          <input className="input tnum" type="number" min="1" style={{ width: 90 }} value={p.parcelas} onChange={(e) => setPag(i, 'parcelas', Math.max(1, parseInt(e.target.value, 10) || 1))} />
                        </div>
                        <div className="pdv-line pdv-line-sub"><span className="muted">Valor da parcela</span><span className="tnum" style={{ fontWeight: 700 }}>{nParc}× de {fmtBRL((Number(p.valor) || total) / nParc)}</span></div>
                      </div>}
                  </div>);
              })}

              {pagamentos.length < 2 &&
                <button className="pdv-add2" type="button" onClick={addSegundaForma}><Ic name="plus" size={13} /> Adicionar 2ª forma de pagamento</button>}

              {pagamentos.length > 1 &&
                <div className="pdv-restante" style={{ color: Math.abs(restante) < 0.005 ? '#047857' : restante > 0 ? '#b45309' : '#dc2626' }}>
                  {restante > 0.005 ? 'Falta: ' + fmtBRL(restante) : restante < -0.005 ? 'Excede: ' + fmtBRL(-restante) : 'Valores conferem ✓'}
                </div>}
            </div>
          </div>
        </div>

        {done &&
          <div className="pdv-done"><div className="pdv-done-card"><div className="pdv-done-ic"><Ic name="check" size={26} /></div><div style={{ fontWeight: 700, marginTop: 8 }}>{done}</div></div></div>}
      </Drawer>);
  }

  function PDVStyles() {
    return <style>{`
      .pdv-hd-ic { width: 30px; height: 30px; border-radius: 8px; background: color-mix(in oklab, #10b981 14%, var(--surface)); color: #047857; display: flex; align-items: center; justify-content: center; }
      .pdv-code { display: flex; flex-direction: column; align-items: flex-end; font-size: 10px; font-weight: 600; color: var(--text-faint); letter-spacing: .06em; }
      .pdv-code strong { font-size: 13px; color: var(--text); }
      .pdv-grid { display: grid; grid-template-columns: 1.55fr 1fr; gap: 0; height: 100%; margin: -22px; min-height: 0; }
      .pdv-left { display: flex; flex-direction: column; min-height: 0; padding: 16px; gap: 12px; border-right: 1px solid var(--border); background: var(--surface-2); }
      .pdv-right { display: flex; flex-direction: column; min-height: 0; overflow-y: auto; padding: 16px; gap: 12px; background: var(--surface); }

      .pdv-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
      .pdv-search { position: relative; flex: 1; min-width: 220px; display: flex; align-items: center; }
      .pdv-biller { display: flex; align-items: center; gap: 8px; }
      .pdv-biller-l { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: .04em; }
      .pdv-biller .input { width: 180px; }

      .pdv-section-t { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 8px; }
      .pdv-prodgrid-wrap { flex-shrink: 0; }
      .pdv-prodgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; max-height: 232px; overflow-y: auto; padding-right: 2px; }
      .pdv-prodcard { display: flex; flex-direction: column; gap: 6px; padding: 10px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); cursor: pointer; text-align: left; transition: box-shadow .15s, border-color .15s, transform .1s; }
      .pdv-prodcard:hover:not(:disabled) { border-color: var(--accent); box-shadow: 0 4px 12px rgba(15,23,42,.07); transform: translateY(-1px); }
      .pdv-prodcard:disabled { opacity: .5; cursor: not-allowed; }
      .pdv-prodthumb { width: 100%; height: 56px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: rgba(0,0,0,.45); }
      .pdv-prodname { font-size: 12.5px; font-weight: 600; color: var(--text); line-height: 1.2; min-height: 30px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .pdv-prodmeta { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
      .pdv-prodprice { font-size: 13px; font-weight: 800; color: var(--text); }
      .pdv-prodstock { font-size: 10px; font-weight: 600; color: var(--text-faint); }
      .pdv-prodstock.low { color: #b45309; } .pdv-prodstock.out { color: #b91c1c; }

      .pdv-cart { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; }
      .pdv-cart-hd { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-bottom: 1px solid var(--border); }
      .pdv-cart-t { font-size: 12px; font-weight: 700; color: var(--text); letter-spacing: .03em; }
      .pdv-itens-pill { font-size: 11px; font-weight: 700; color: #047857; background: #ecfdf5; border: 1px solid color-mix(in oklab, #10b981 26%, transparent); border-radius: 999px; padding: 2px 9px; }
      .pdv-clear { display: inline-flex; align-items: center; gap: 4px; border: none; background: none; color: #dc2626; font-size: 11px; font-weight: 600; cursor: pointer; }
      .pdv-row { display: grid; grid-template-columns: 2.4fr .9fr 1fr .9fr 40px; gap: 10px; align-items: center; padding: 8px 14px; }
      .pdv-row-head { background: var(--surface-2); font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: .03em; border-bottom: 1px solid var(--border); }
      .pdv-cart-scroll { flex: 1; min-height: 0; overflow-y: auto; }
      .pdv-row-body { border-bottom: 1px solid var(--border); }
      .pdv-row-body:hover { background: var(--surface-2); }
      .ta-r { text-align: right; justify-self: end; } .ta-c { text-align: center; justify-self: center; }
      .pdv-cellname { display: flex; align-items: center; gap: 10px; min-width: 0; }
      .pdv-cellthumb { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: rgba(0,0,0,.4); }
      .pdv-iname { font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .pdv-imeta { font-size: 11px; color: var(--text-faint); }
      .pdv-inline { height: 28px; font-size: 12px; }
      .pdv-sub { font-size: 13px; font-weight: 700; }
      .pdv-stepper { display: inline-flex; align-items: center; border: 1px solid var(--border-strong); border-radius: 8px; overflow: hidden; }
      .pdv-stepper button { width: 26px; height: 28px; border: none; background: var(--surface-2); color: var(--text); font-size: 15px; cursor: pointer; }
      .pdv-stepper button:hover { background: var(--surface-3); }
      .pdv-stepper input { width: 36px; height: 28px; border: none; border-left: 1px solid var(--border); border-right: 1px solid var(--border); text-align: center; font-size: 13px; font-weight: 600; }
      .pdv-del { width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--border); background: var(--surface); border-radius: 7px; color: var(--text-muted); cursor: pointer; }
      .pdv-del:hover { color: #dc2626; border-color: #dc2626; background: #fef2f2; }
      .pdv-cart-empty { padding: 48px 16px; text-align: center; color: var(--text-faint); }

      .pdv-right .fin-section-title { margin: 0 0 4px; }
      .pdv-right .fin-section-title:not(:first-child) { margin-top: 6px; }
      .pdv-right .fin-section { border-left: 1px solid var(--border); border-radius: 8px; }
      .pdv-cliente { display: flex; align-items: center; gap: 10px; }
      .pdv-cli-avatar { width: 38px; height: 38px; border-radius: 50%; background: var(--accent-soft); color: var(--accent-700); display: flex; align-items: center; justify-content: center; font-weight: 700; }
      .pdv-cli-name { font-weight: 700; font-size: 14px; }
      .pdv-line { display: flex; align-items: center; justify-content: space-between; font-size: 13px; padding: 4px 0; }
      .pdv-line-sub { font-size: 12px; }
      .pdv-adjust { display: flex; flex-direction: column; gap: 6px; padding: 8px 0; border-top: 1px dashed var(--border); border-bottom: 1px dashed var(--border); margin: 6px 0; }
      .pdv-adjust-row { display: flex; align-items: center; gap: 8px; font-size: 13px; }
      .pdv-adjust-row > span:first-child { color: var(--text-muted); white-space: nowrap; }
      .pdv-adjust-row .input { width: 130px; }
      .pdv-pctwrap { display: inline-flex; align-items: center; gap: 4px; }
      .pdv-pctwrap .input { width: 80px; }
      .pdv-seg { display: inline-flex; background: var(--surface-3); border-radius: 8px; padding: 2px; }
      .pdv-seg button { border: none; background: none; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; color: var(--text-muted); cursor: pointer; }
      .pdv-seg button.on { background: var(--surface); color: var(--accent-700); box-shadow: var(--shadow-sm); }
      .pdv-total { display: flex; align-items: center; justify-content: space-between; font-size: 17px; font-weight: 800; color: var(--text); margin-top: 8px; }

      .pdv-methods { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
      .pdv-method { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 9px 4px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); color: var(--text-muted); font-size: 11px; font-weight: 600; cursor: pointer; transition: all .12s; }
      .pdv-method:hover { border-color: var(--border-strong); color: var(--text); }
      .pdv-pay { border: 1px solid var(--border); border-radius: 10px; padding: 10px; margin-bottom: 8px; background: var(--surface-2); }
      .pdv-pay-hd { display: flex; align-items: center; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px; }
      .pdv-opts { margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--border); display: flex; flex-direction: column; gap: 4px; }
      .pdv-pix { display: flex; align-items: center; gap: 10px; margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--border); }
      .pdv-qr { width: 44px; height: 44px; border-radius: 8px; background: color-mix(in oklab, #0ea5e9 12%, var(--surface)); color: #0284c7; display: flex; align-items: center; justify-content: center; }
      .pdv-add2 { width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px; border: 1px dashed var(--border-strong); border-radius: 10px; background: transparent; color: var(--accent); font-size: 12.5px; font-weight: 600; cursor: pointer; }
      .pdv-add2:hover { background: var(--accent-soft); }
      .pdv-restante { text-align: center; font-size: 12.5px; font-weight: 700; margin-top: 6px; }

      .pdv-foot-l { font-size: 10px; font-weight: 700; color: var(--text-faint); letter-spacing: .06em; }
      .pdv-foot-v { font-size: 20px; font-weight: 800; color: var(--text); }
      .pdv-btn-cancel { color: #dc2626; border-color: color-mix(in oklab, #dc2626 40%, var(--border)); }
      .pdv-btn-cancel:hover { background: #fef2f2; }
      .pdv-btn-hold { color: #b45309; border-color: color-mix(in oklab, #f59e0b 45%, var(--border)); background: color-mix(in oklab, #f59e0b 8%, var(--surface)); }
      .pdv-btn-pay { background: #10b981; border-color: #10b981; color: #fff; font-weight: 700; }
      .pdv-btn-pay:hover { background: #059669; border-color: #059669; }

      .pdv-done { position: absolute; inset: 0; background: rgba(15,23,42,.35); display: flex; align-items: center; justify-content: center; z-index: 5; animation: pop .2s ease; }
      .pdv-done-card { background: var(--surface); border-radius: 16px; padding: 28px 34px; text-align: center; box-shadow: var(--shadow-lg); max-width: 360px; }
      .pdv-done-ic { width: 56px; height: 56px; border-radius: 50%; background: #ecfdf5; color: #10b981; display: flex; align-items: center; justify-content: center; margin: 0 auto; }

      @media (max-width: 1000px) { .pdv-grid { grid-template-columns: 1fr; } .pdv-left { border-right: none; border-bottom: 1px solid var(--border); } }
    `}</style>;
  }

  window.PDVDrawer = PDVDrawer;
})();
