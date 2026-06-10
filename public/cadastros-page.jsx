// cadastros-page.jsx — Hub de Cadastros. Grid fixo de 4 colunas, cartões grandes no
// estilo CRM: borda superior 2px (degradê verde→amarelo da marca) · cabeçalho fixo
// (título grande + descrição pequena) · meio flexível · rodapé fixo numa linha
// (ativos · círculo 56px com o ícone · inativos). Hover com sombra; clique abre a página.
// "Usuários" abre a página real e traz contagem real; os demais são provisórios.

function CadastrosPage() {
  const { setRoute, back } = useStore();
  const [counts, setCounts] = React.useState({}); // { <id>: { ativos, inativos } }

  // Contagem REAL de Usuários (ativos/inativos).
  React.useEffect(() => {
    let alive = true;
    window.API.getUsuarios().then((r) => {
      if (!alive) return;
      const us = r.usuarios || [];
      const ativos = us.filter((u) => (u.status || 'ativo') === 'ativo').length;
      setCounts((c) => ({ ...c, usuarios: { ativos, inativos: us.length - ativos } }));
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const itens = [
    { id: 'usuarios', label: 'Usuários', desc: 'Equipe com acesso à loja', icon: 'users', route: 'users' },
    { id: 'lojas', label: 'Lojas', desc: 'Filiais e unidades da rede', icon: 'building' },
    { id: 'fornecedores', label: 'Fornecedores', desc: 'Parceiros e distribuidores', icon: 'package' },
    { id: 'categorias', label: 'Categorias', desc: 'Agrupamento de produtos', icon: 'list' },
    { id: 'materiais', label: 'Materiais', desc: 'Insumos e componentes', icon: 'cube' },
    { id: 'marcas', label: 'Marcas', desc: 'Fabricantes e grifes', icon: 'tag' },
    { id: 'unidades', label: 'Unidades', desc: 'Unidades de medida', icon: 'reports' },
    { id: 'departamentos', label: 'Departamentos', desc: 'Setores internos', icon: 'folder', route: 'cad-departamentos' },
  ];

  const abrir = (it) => {
    if (it.route) setRoute(it.route);
    else window.showToast && window.showToast({ tipo: 'info', titulo: it.label, descricao: 'Cadastro em construção.' });
  };

  return (
    <Page title="Cadastros" subtitle="Cadastros gerais do sistema" actions={<ActionButton action="voltar" size="sm" onClick={back} />}>
      <style>{`
        .cad-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
        .cad-card { position: relative; display: flex; flex-direction: column; min-height: 250px; border-radius: 16px; background: var(--surface); border: 1px solid var(--border); overflow: hidden; cursor: pointer; transition: transform .15s ease, box-shadow .15s ease; }
        .cad-card:hover { transform: translateY(-3px); box-shadow: 0 16px 34px rgba(15,23,42,.13); }
        .cad-bar { height: 2px; flex-shrink: 0; background: linear-gradient(90deg, #3DA767 0%, #a7e84f 52%, #e9f23a 100%); }
        .cad-head { padding: 18px 18px 0; flex-shrink: 0; }
        .cad-title { font-size: 21px; font-weight: 800; letter-spacing: -.01em; line-height: 1.15; }
        .cad-desc { font-size: var(--type-xs); color: var(--text-muted); margin-top: 6px; line-height: 1.4; }
        .cad-mid { flex: 1 1 auto; display: flex; align-items: center; justify-content: center; }
        .cad-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 14px 18px; border-top: 1px solid var(--border); flex-shrink: 0; }
        .cad-ic { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--accent-soft); color: var(--accent); flex-shrink: 0; }
        .cad-pill { display: inline-flex; align-items: center; justify-content: center; border-radius: 100px; padding: 5px 12px; font-size: 12px; font-weight: 700; border: 1.5px solid; white-space: nowrap; }
        .cad-pill-on { color: #2E9E5B; background: color-mix(in oklab, #3DA767 12%, white); border-color: #3DA767; }
        .cad-pill-off { color: #E03A22; background: color-mix(in oklab, #FF452A 12%, white); border-color: #FF452A; }
      `}</style>

      <div className="card card-pad">
        <div className="row" style={{ alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Ic name="lines-3" size={16} style={{ color: 'var(--text-faint)' }} />
          <div style={{ fontWeight: 700, fontSize: 'var(--type-md)', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)' }}>Cadastros</div>
        </div>

        <div className="cad-grid">
          {itens.map((it) => {
            const c = counts[it.id] || { ativos: 0, inativos: 0 };
            return (
              <div key={it.id} className="cad-card" onClick={() => abrir(it)} title={it.label}>
                <div className="cad-bar" />
                <div className="cad-head">
                  <div className="cad-title">{it.label}</div>
                  <div className="cad-desc">{it.desc}</div>
                </div>
                <div className="cad-mid"><div className="cad-ic"><Ic name={it.icon} size={28} /></div></div>
                <div className="cad-foot">
                  <span className="cad-pill cad-pill-on">{c.ativos} ativos</span>
                  <span className="cad-pill cad-pill-off">{c.inativos} inativos</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Page>
  );
}

Object.assign(window, { CadastrosPage });
