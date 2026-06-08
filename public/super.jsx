// super.jsx — Super Admin screens


function SuperDashboard() {
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => setLoading(false), []);
  return (
    <Page title="Visão geral da plataforma" subtitle="Dados em tempo real · atualizado há 12s">
      {/* TEMP · preview do FabNovo nos 3 tamanhos (passe o mouse) */}
      <div className="card card-pad" style={{ marginBottom: 'var(--pad-3)' }}>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>Botão "Nova X" expansível <span className="badge badge-neutral" style={{ marginLeft: 6 }}>preview</span></div>
        <div className="muted" style={{ fontSize: 'var(--type-sm)', marginBottom: 16 }}>Recolhido só com o (+); passe o mouse pra ver o rótulo deslizar e o (+) girar. 3 tamanhos do Kit (Small 36 · Medium 40 · Large 56).</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 460 }}>
          {[['lg', 'Large'], ['md', 'Medium'], ['sm', 'Small'], ['mini', 'Mini']].map(([sz, nome]) => (
            <div key={sz} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="muted" style={{ width: 70, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{nome}</span>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}><FabNovo size={sz} label="Nova receita" /></div>
            </div>
          ))}
        </div>
      </div>
      <div className="stat-grid">
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card card-pad">
            <Skeleton w={90} h={11} />
            <Skeleton w="60%" h={26} style={{ marginTop: 10 }} />
            <Skeleton w={120} h={11} style={{ marginTop: 10 }} />
          </div>
        )) : <>
        <Stat label="Clientes ativos" value="42" foot="↑ 3 este mês" icon="building" accent={{bg:'var(--accent-soft)', fg:'var(--accent-700)'}}/>
        <Stat label="MRR consolidada" value="R$ 28.4k" foot="↑ 12% MoM" icon="wallet"/>
        <Stat label="Conversas agora" value="1.284" foot="em todos os clientes" icon="inbox"/>
        <Stat label="Tokens Claude (24h)" value="3.2M" foot="≈ R$ 124,80" icon="sparkles" accent={{bg:'var(--ai-soft)', fg:'var(--ai-strong)'}}/>
        </>}
      </div>
      <div className="card card-pad" style={{background:'color-mix(in oklab, var(--hue-rose) 8%, var(--surface))', borderColor:'color-mix(in oklab, var(--hue-rose) 30%, var(--border))'}}>
        <div className="row"><Ic name="flag" size={16} style={{color:'var(--hue-rose)'}}/><div className="h3" style={{marginLeft:6}}>2 alertas críticos</div></div>
        <div className="col" style={{marginTop:10, gap:6, fontSize:'var(--type-sm)'}}>
          <div className="row" style={{gap:8}}><span className="dot" style={{background:'var(--hue-rose)'}}/>Biofarma IBLATU — pagamento atrasado há 5 dias</div>
          <div className="row" style={{gap:8}}><span className="dot" style={{background:'var(--hue-rose)'}}/>Iguabela Beleza — webhook Instagram falhou (504)</div>
        </div>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:'var(--pad-3)'}}>
        <div className="card card-pad">
          <div className="h3">Crescimento de clientes · 12 meses</div>
          {loading ? (
          <div style={{marginTop:14}}><Skeleton w="100%" h={160} r={8} /></div>
          ) : (
          <div style={{display:'flex', alignItems:'flex-end', gap:6, height:160, marginTop:14}}>
            {[8,12,15,18,22,25,28,32,35,38,40,42].map((v,i)=>(
              <div key={i} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4}}>
                <div style={{width:'100%', height:`${v*3.5}px`, background:'var(--accent)', borderRadius:'4px 4px 0 0'}}/>
                <span style={{fontSize:10, color:'var(--text-faint)'}}>{['J','F','M','A','M','J','J','A','S','O','N','D'][i]}</span>
              </div>
            ))}
          </div>
          )}
        </div>
        <div className="card card-pad">
          <div className="h3">Top 5 por volume</div>
          <div className="col" style={{marginTop:10, gap:6}}>
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="row" style={{padding:'6px 0', gap:8, fontSize:'var(--type-sm)'}}>
                <Skeleton w={18} h={14} />
                <span style={{flex:1}}><Skeleton w="70%" h={14} /></span>
                <Skeleton w={44} h={14} />
              </div>
            )) : TENANTS.slice(0,5).sort((a,b)=>b.conv-a.conv).map((t,i)=>(
              <div key={t.id} className="row" style={{padding:'6px 0', gap:8, fontSize:'var(--type-sm)'}}>
                <span className="muted tnum" style={{width:18, fontWeight:600}}>{i+1}</span>
                <span style={{flex:1, fontWeight:500}}>{t.name}</span>
                <span className="tnum">{t.conv.toLocaleString('pt-BR')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Page>
  );
}

function ClientDrawer({ initial, onClose, onSave, onDelete }) {
  const isEdit = !!initial;
  const blank = {
    type: 'pj',
    // PJ
    razao: '', fantasia: '', cnpj: '', ie: '', segment: 'Beleza & Estética',
    // PF
    nome: '', cpf: '', rg: '', birth: '',
    // contato
    email: '', phone: '', whatsapp: '',
    // endereço
    cep: '', address: '', city: '', uf: '',
    // responsável
    respName: '', respRole: 'Sócio', respEmail: '', respPhone: '',
    // plano
    plan: 'Pro', billingCycle: 'mensal', mrr: 397, start: new Date().toLocaleDateString('pt-BR'), renew: '',
    discount: 0,
    // pagamento
    paymentMethod: 'cartao', cardLast: '', dueDay: 5,
    // limites & customizações
    convLimit: 2000, userLimit: 5, channels: ['whatsapp','instagram','facebook'], aiTokens: 1000000,
    // acesso
    subdomain: '', adminEmail: '', sendCredentials: true, force2fa: false,
    // operação
    notes: '', tags: [],
    status: 'ativo',
    conv: 0,
  };
  const [f, setF] = React.useState(() => initial ? { ...blank, ...initial } : blank);
  const [tab, setTab] = React.useState('dados');
  const [confirmDel, setConfirmDel] = React.useState(false);
  const [delClosing, setDelClosing] = React.useState(false);
  const drawerClose = React.useRef(null);
  const set = (k,v) => setF(p => ({...p, [k]:v}));
  const toggle = (k, val) => setF(p => ({...p, [k]: p[k].includes(val) ? p[k].filter(x=>x!==val) : [...p[k], val]}));
  const tabs = [
    { id:'dados',     label:'Dados', icon:'card-id' },
    { id:'contato',   label:'Contato & Endereço', icon:'phone' },
    { id:'plano',     label:'Plano', icon:'wallet' },
    { id:'pagamento', label:'Pagamento', icon:'wallet' },
    { id:'acesso',    label:'Acesso', icon:'shield' },
    { id:'operacao',  label:'Operação', icon:'settings' },
  ];
  const planOpts = (typeof PLANS !== 'undefined' ? PLANS : [{name:'Starter', price:197},{name:'Pro', price:397},{name:'Business', price:897}]);
  const handleSave = () => {
    const displayName = f.type === 'pj' ? (f.fantasia || f.razao) : f.nome;
    if (!displayName) { setTab('dados'); return; }
    const member = {
      ...f,
      id: f.id || ('c' + Date.now().toString(36)),
      name: displayName,
      mrr: Number(f.mrr) || 0,
      conv: Number(f.conv) || 0,
    };
    onSave(member);
  };
  const headColor = colorFor(f.fantasia || f.razao || f.nome || 'Cliente');
  return (
    <Drawer
      title={isEdit ? `Editar cliente · ${initial.name}` : 'Cadastrar novo cliente'}
      subtitle={isEdit ? `${f.plan} · ${f.status}` : 'Preencha as abas abaixo. Campos com * são obrigatórios.'}
      onClose={onClose}
      width={760}
      leftHead={
        <div style={{width:42, height:42, borderRadius:10, background:headColor, color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, flexShrink:0}}>
          {initials(f.fantasia || f.razao || f.nome || 'CL')}
        </div>
      }
      footer={(close) => {
        drawerClose.current = close;
        return <>
        {isEdit && <ActionButton action="excluir" size="md" onClick={()=>setConfirmDel(true)} />}
        <div style={{flex:1}}/>
        <ActionButton action="voltar" size="md" onClick={() => close()} />
        {!isEdit && <ActionButton action="salvar" size="md" label="Salvar e enviar boas-vindas" icon="mail" onClick={() => close(() => { handleSave(); window.showToast({ tipo:'sucesso', titulo:'Boas-vindas enviadas', descricao:'Cliente cadastrado e e-mail de boas-vindas enviado.', duracao:4000 }); })} />}
        <ActionButton action="salvar" size="md" label={isEdit ? 'Salvar alterações' : 'Cadastrar cliente'} onClick={() => close(() => { handleSave(); window.showToast(isEdit ? { tipo:'sucesso', titulo:'Alterações salvas', descricao:'As alterações do cliente foram salvas.', duracao:4000 } : { tipo:'sucesso', titulo:'Cliente criado!', descricao:'Novo cliente cadastrado com sucesso.', duracao:4000 }); })} />
      </>;
      }}
    >
      <div style={{display:'flex', flexWrap:'wrap', borderBottom:'1px solid var(--border)', gap:18, marginBottom:18, padding:'0 2px'}}>
        {tabs.map(t => (
          <div key={t.id} onClick={()=>setTab(t.id)} style={{display:'flex', alignItems:'center', gap:6, padding:'10px 0', fontSize:'var(--type-sm)', fontWeight:tab===t.id?600:500, color: tab===t.id?'var(--text)':'var(--text-muted)', borderBottom: tab===t.id?'2px solid var(--accent)':'2px solid transparent', marginBottom:-1, cursor:'default'}}>
            <Ic name={t.icon} size={14}/>{t.label}
          </div>
        ))}
      </div>

      {tab==='dados' && (
        <div className="col" style={{gap:14}}>
          <div>
            <label className="label">Tipo de cliente *</label>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
              {[['pj','Pessoa Jurídica','CNPJ, razão social, IE'],['pf','Pessoa Física','CPF, RG, nascimento']].map(([id,l,d])=>{
                const on = f.type===id;
                return (
                  <label key={id} onClick={()=>set('type',id)} className="card" style={{padding:12, cursor:'default', borderColor: on?'var(--accent)':'var(--border)', background: on?'var(--accent-soft)':'var(--surface)'}}>
                    <div className="row" style={{gap:8}}><input type="radio" name="ctype" checked={on} onChange={()=>set('type',id)}/><span style={{fontWeight:600, fontSize:'var(--type-sm)'}}>{l}</span></div>
                    <div className="muted" style={{fontSize:'var(--type-xs)', marginTop:4}}>{d}</div>
                  </label>
                );
              })}
            </div>
          </div>
          {f.type==='pj' ? (
            <>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                <div><label className="label">Razão social *</label><input className="input" value={f.razao} onChange={e=>set('razao',e.target.value)} placeholder="Iguabela Beleza Comércio Ltda"/></div>
                <div><label className="label">Nome fantasia *</label><input className="input" value={f.fantasia} onChange={e=>set('fantasia',e.target.value)} placeholder="Iguabela Beleza"/></div>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10}}>
                <div><label className="label">CNPJ *</label><CnpjInput value={f.cnpj} onChange={v=>set('cnpj',v)}/></div>
                <div><label className="label">Inscrição estadual</label><input className="input" value={f.ie} onChange={e=>set('ie',e.target.value)} placeholder="Isento"/></div>
                <div><label className="label">Segmento</label><select className="input" value={f.segment} onChange={e=>set('segment',e.target.value)}><option>Beleza & Estética</option><option>Saúde & Clínicas</option><option>Educação</option><option>Varejo</option><option>Construção</option><option>Serviços</option><option>Alimentação</option><option>Outro</option></select></div>
              </div>
            </>
          ) : (
            <>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                <div><label className="label">Nome completo *</label><input className="input" value={f.nome} onChange={e=>set('nome',e.target.value)}/></div>
                <div><label className="label">Data de nascimento</label><DateInput value={f.birth} onChange={v=>set('birth',v)}/></div>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10}}>
                <div><label className="label">CPF *</label><CpfInput value={f.cpf} onChange={v=>set('cpf',v)}/></div>
                <div><label className="label">RG</label><input className="input" value={f.rg} onChange={e=>set('rg',e.target.value)}/></div>
                <div><label className="label">Segmento</label><select className="input" value={f.segment} onChange={e=>set('segment',e.target.value)}><option>Beleza & Estética</option><option>Saúde</option><option>Educação</option><option>Serviços</option><option>Outro</option></select></div>
              </div>
            </>
          )}
          <div style={{padding:12, background:'var(--accent-soft)', borderRadius:8, fontSize:'var(--type-sm)', color:'var(--accent-700)'}}>
            <div className="row" style={{gap:8}}><Ic name="sparkles" size={14}/>A IA pode preencher automaticamente os dados via {f.type==='pj'?'CNPJ':'CPF'} se a integração estiver ativa.</div>
          </div>
        </div>
      )}

      {tab==='contato' && (
        <div className="col" style={{gap:14}}>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
            <div><label className="label">E-mail principal *</label><EmailInput value={f.email} onChange={v=>set('email',v)}/></div>
            <div><label className="label">Telefone *</label><PhoneInput value={f.phone} onChange={v=>set('phone',v)}/></div>
          </div>
          <div><label className="label">WhatsApp comercial</label><PhoneInput value={f.whatsapp} onChange={v=>set('whatsapp',v)}/></div>
          <div style={{padding:'8px 0', fontWeight:600, fontSize:'var(--type-sm)', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em'}}>Endereço</div>
          <div style={{display:'grid', gridTemplateColumns:'120px 1fr', gap:10}}>
            <div><label className="label">CEP</label><CepInput value={f.cep} onChange={v=>set('cep',v)} onResolve={(r)=>{ set('address', `${r.logradouro}, ${r.bairro}`); set('city', r.cidade); set('uf', r.uf); }}/></div>
            <div><label className="label">Logradouro, número, bairro</label><input className="input" value={f.address} onChange={e=>set('address',e.target.value)}/></div>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 100px', gap:10}}>
            <div><label className="label">Cidade</label><input className="input" value={f.city} onChange={e=>set('city',e.target.value)}/></div>
            <div><label className="label">UF</label><UFSelect value={f.uf} onChange={v=>set('uf',v)}/></div>
          </div>
          <div style={{padding:'8px 0', fontWeight:600, fontSize:'var(--type-sm)', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em'}}>Responsável / Contato comercial</div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
            <div><label className="label">Nome</label><input className="input" value={f.respName} onChange={e=>set('respName',e.target.value)}/></div>
            <div><label className="label">Cargo</label><select className="input" value={f.respRole} onChange={e=>set('respRole',e.target.value)}><option>Sócio</option><option>Diretor</option><option>Gerente</option><option>Marketing</option><option>Outro</option></select></div>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
            <div><label className="label">E-mail do responsável</label><EmailInput value={f.respEmail} onChange={v=>set('respEmail',v)}/></div>
            <div><label className="label">Telefone do responsável</label><PhoneInput value={f.respPhone} onChange={v=>set('respPhone',v)}/></div>
          </div>
        </div>
      )}

      {tab==='plano' && (
        <div className="col" style={{gap:14}}>
          <div><label className="label">Plano *</label>
            <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8}}>
              {planOpts.map((p)=>{
                const on = f.plan===p.name;
                return (
                  <label key={p.id||p.name} onClick={()=>{ set('plan',p.name); set('mrr',p.price); }} className="card" style={{padding:12, cursor:'default', borderColor: on?'var(--accent)':'var(--border)', background: on?'var(--accent-soft)':'var(--surface)'}}>
                    <div className="row"><span style={{fontWeight:600}}>{p.name}</span><div className="spacer"/><input type="radio" name="plan" checked={on} onChange={()=>{ set('plan',p.name); set('mrr',p.price); }}/></div>
                    <div className="h2 tnum" style={{marginTop:6}}>{formatBRL(p.price)}<span style={{fontSize:'var(--type-xs)', color:'var(--text-muted)', fontWeight:400}}>/mês</span></div>
                    {p.conv && <div className="muted" style={{fontSize:'var(--type-xs)', marginTop:4}}>{p.conv.toLocaleString('pt-BR')} conversas · {p.users} usuários</div>}
                  </label>
                );
              })}
            </div>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10}}>
            <div><label className="label">Ciclo de cobrança</label><select className="input" value={f.billingCycle} onChange={e=>set('billingCycle',e.target.value)}><option value="mensal">Mensal</option><option value="trimestral">Trimestral (-5%)</option><option value="anual">Anual (-15%)</option></select></div>
            <div><label className="label">Valor mensal (R$)</label><MoneyInput value={Number(f.mrr)||0} onChange={(_,n)=>set('mrr',n)}/></div>
            <div><label className="label">Desconto (%)</label><input className="input" type="number" value={f.discount} onChange={e=>set('discount',e.target.value)}/></div>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
            <div><label className="label">Início do contrato</label><DateInput value={f.start} onChange={v=>set('start',v)}/></div>
            <div><label className="label">Renovação</label><DateInput value={f.renew} onChange={v=>set('renew',v)}/></div>
          </div>
          <div style={{padding:'8px 0', fontWeight:600, fontSize:'var(--type-sm)', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em'}}>Limites operacionais</div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10}}>
            <div><label className="label">Limite de conversas/mês</label><input className="input" type="number" value={f.convLimit} onChange={e=>set('convLimit',e.target.value)}/></div>
            <div><label className="label">Usuários simultâneos</label><input className="input" type="number" value={f.userLimit} onChange={e=>set('userLimit',e.target.value)}/></div>
            <div><label className="label">Tokens IA/mês</label><input className="input" type="number" value={f.aiTokens} onChange={e=>set('aiTokens',e.target.value)}/></div>
          </div>
          <div><label className="label">Canais habilitados</label>
            <div className="row" style={{gap:8, flexWrap:'wrap'}}>
              {[['whatsapp','WhatsApp'],['instagram','Instagram'],['facebook','Facebook']].map(([ic,l])=>{
                const on = f.channels.includes(ic);
                return (
                  <label key={ic} className="row" style={{gap:6, padding:'6px 12px', border:`1px solid ${on?'var(--accent)':'var(--border)'}`, background: on?'var(--accent-soft)':'transparent', borderRadius:14, fontSize:'var(--type-sm)', cursor:'default'}}><input type="checkbox" checked={on} onChange={()=>toggle('channels',ic)}/><Ic name={ic} size={13}/>{l}</label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab==='pagamento' && (
        <div className="col" style={{gap:14}}>
          <div><label className="label">Forma de pagamento</label>
            <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8}}>
              {[['cartao','Cartão','wallet'],['pix','Pix','dollar'],['boleto','Boleto','file'],['transferencia','Transferência','bank']].map(([id,l,ic])=>{
                const on = f.paymentMethod===id;
                return (
                  <label key={id} onClick={()=>set('paymentMethod',id)} className="card" style={{padding:10, cursor:'default', borderColor: on?'var(--accent)':'var(--border)', background: on?'var(--accent-soft)':'var(--surface)', textAlign:'center'}}>
                    <div style={{fontSize:'var(--type-sm)', fontWeight:600}}>{l}</div>
                    <div className="muted" style={{fontSize:'var(--type-xs)', marginTop:2}}>{id==='cartao'?'recorrente':id==='pix'?'cobrança auto':id==='boleto'?'+3 dias':'manual'}</div>
                  </label>
                );
              })}
            </div>
          </div>
          {f.paymentMethod==='cartao' && (
            <div style={{display:'grid', gridTemplateColumns:'1fr 120px', gap:10}}>
              <div><label className="label">Cartão (últimos 4 dígitos)</label><input className="input" value={f.cardLast} onChange={e=>set('cardLast',e.target.value)} placeholder="••• •••• •••• 4242" maxLength={4}/></div>
              <div><label className="label">Dia do venc.</label><input className="input" type="number" value={f.dueDay} onChange={e=>set('dueDay',e.target.value)} min={1} max={28}/></div>
            </div>
          )}
          {f.paymentMethod!=='cartao' && (
            <div><label className="label">Dia do vencimento</label><input className="input" type="number" value={f.dueDay} onChange={e=>set('dueDay',e.target.value)} min={1} max={28} style={{maxWidth:120}}/></div>
          )}
          <div style={{padding:14, background:'var(--surface-2)', borderRadius:8}}>
            <div className="row"><span style={{fontWeight:600, fontSize:'var(--type-sm)'}}>Resumo financeiro</span><div className="spacer"/></div>
            <div className="col" style={{gap:6, marginTop:10, fontSize:'var(--type-sm)'}}>
              <div className="row"><span className="muted">Plano</span><div className="spacer"/><span>{f.plan}</span></div>
              <div className="row"><span className="muted">Valor mensal</span><div className="spacer"/><span className="tnum">{formatBRL(f.mrr)}</span></div>
              <div className="row"><span className="muted">Desconto</span><div className="spacer"/><span className="tnum">{f.discount}%</span></div>
              <div style={{borderTop:'1px solid var(--border)', margin:'4px 0', paddingTop:6}}/>
              <div className="row"><span style={{fontWeight:600}}>Total mensal</span><div className="spacer"/><span className="tnum" style={{fontWeight:700}}>R$ {(Number(f.mrr) * (1 - f.discount/100)).toFixed(2)}</span></div>
            </div>
          </div>
        </div>
      )}

      {tab==='acesso' && (
        <div className="col" style={{gap:14}}>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
            <div><label className="label">Subdomínio *</label>
              <div className="row" style={{gap:0, alignItems:'stretch'}}>
                <input className="input" value={f.subdomain} onChange={e=>set('subdomain',e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))} placeholder="iguabela" style={{borderTopRightRadius:0, borderBottomRightRadius:0, borderRight:'none'}}/>
                <span style={{padding:'8px 12px', background:'var(--surface-2)', border:'1px solid var(--border-strong)', borderTopRightRadius:8, borderBottomRightRadius:8, fontSize:'var(--type-sm)', color:'var(--text-muted)', display:'flex', alignItems:'center'}}>.atende.ia</span>
              </div>
            </div>
            <div><label className="label">E-mail do administrador *</label><EmailInput value={f.adminEmail} onChange={v=>set('adminEmail',v)}/></div>
          </div>
          <div className="col" style={{gap:8, padding:12, border:'1px solid var(--border)', borderRadius:8}}>
            <label className="row" style={{gap:8, fontSize:'var(--type-sm)'}}><input type="checkbox" checked={f.sendCredentials} onChange={e=>set('sendCredentials',e.target.checked)}/>Enviar e-mail com credenciais de acesso</label>
            <label className="row" style={{gap:8, fontSize:'var(--type-sm)'}}><input type="checkbox" checked={f.force2fa} onChange={e=>set('force2fa',e.target.checked)}/>Exigir autenticação em dois fatores para todos os usuários</label>
          </div>
          <div><label className="label">Status inicial</label>
            <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8}}>
              {[['trial','Trial 14d'],['ativo','Ativo'],['pendente','Pendente'],['inativo','Inativo']].map(([id,l])=>{
                const on = f.status===id;
                return (
                  <label key={id} onClick={()=>set('status',id)} className="card" style={{padding:8, cursor:'default', borderColor: on?'var(--accent)':'var(--border)', background: on?'var(--accent-soft)':'var(--surface)', textAlign:'center', fontSize:'var(--type-sm)', fontWeight:on?600:500}}>{l}</label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab==='operacao' && (
        <div className="col" style={{gap:14}}>
          <div><label className="label">Tags / categorias internas</label>
            <div className="row" style={{gap:6, flexWrap:'wrap'}}>
              {['VIP','Indicação','Onboarding','Caso de sucesso','Risco churn','Multi-loja','Beta tester'].map(tg=>{
                const on = f.tags.includes(tg);
                return (
                  <label key={tg} className="row" style={{gap:6, padding:'6px 10px', border:`1px solid ${on?'var(--accent)':'var(--border)'}`, background: on?'var(--accent-soft)':'transparent', borderRadius:14, fontSize:'var(--type-sm)', cursor:'default'}}><input type="checkbox" checked={on} onChange={()=>toggle('tags',tg)}/>{tg}</label>
                );
              })}
            </div>
          </div>
          <div><label className="label">Observações internas (não visíveis ao cliente)</label><textarea className="input" rows={4} value={f.notes} onChange={e=>set('notes',e.target.value)} placeholder="Histórico, particularidades do contrato, contatos importantes..."/></div>
          {isEdit && (
            <div><label className="label">Conversas no mês atual</label><input className="input" type="number" value={f.conv} onChange={e=>set('conv',e.target.value)} style={{maxWidth:200}}/></div>
          )}
        </div>
      )}

      {confirmDel && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, animation: delClosing ? 'fade-out .18s ease forwards' : 'fade .15s ease'}} onClick={()=>setConfirmDel(false)}>
          <div className="card" onClick={e=>e.stopPropagation()} style={{padding:22, maxWidth:420, animation: delClosing ? 'pop-out .18s ease forwards' : 'pop .22s ease'}}>
            <div className="row" style={{gap:10}}>
              <span style={{width:36, height:36, borderRadius:'50%', background:'#fee2e2', color:'#dc2626', display:'flex', alignItems:'center', justifyContent:'center'}}><Ic name="trash" size={16}/></span>
              <div style={{fontWeight:600, fontSize:'var(--type-md)'}}>Excluir cliente?</div>
            </div>
            <div className="muted" style={{fontSize:'var(--type-sm)', marginTop:10}}>Tem certeza que deseja excluir <strong style={{color:'var(--text)'}}>{initial?.name}</strong>? Essa ação remove o tenant da plataforma. Histórico de pagamentos e conversas permanecem arquivados conforme a política de retenção.</div>
            <div className="row" style={{gap:8, marginTop:18, justifyContent:'flex-end'}}>
              <button className="btn fin-btn-back" onClick={()=>setConfirmDel(false)}>Voltar</button>
              <button className="btn btn-delete" onClick={()=>{
                setDelClosing(true);
                setTimeout(() => {
                  setConfirmDel(false); setDelClosing(false);
                  const finish = () => { onDelete(initial.id); window.showToast({ tipo:'sucesso', titulo:'Cliente excluído', descricao:`${initial.name} foi removido da plataforma.`, duracao:4000 }); };
                  const close = drawerClose.current;
                  if (close) close(finish);
                  else finish();
                }, 180);
              }}><Ic name="trash" size={13}/> Excluir cliente</button>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}

function FinanceDrawer({ client, onClose }) {
  if (!client) return null;
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const today = new Date();
  const payments = Array.from({length:8}).map((_,i)=>{
    const d = new Date(today.getFullYear(), today.getMonth()-i, client.dueDay || 5);
    const isLate = i===0 && client.status==='atrasado';
    return {
      date: d.toLocaleDateString('pt-BR'),
      ref: months[d.getMonth()] + '/' + d.getFullYear(),
      value: client.mrr,
      method: client.paymentMethod || 'cartao',
      status: isLate ? 'atrasado' : i===0 ? 'pendente' : 'pago',
      tx: 'tx_' + Math.random().toString(36).slice(2,10),
    };
  });
  const totalPago = payments.filter(p=>p.status==='pago').reduce((s,p)=>s+p.value,0);
  const totalPend = payments.filter(p=>p.status!=='pago').reduce((s,p)=>s+p.value,0);
  return (
    <Drawer
      title={`Financeiro · ${client.name}`}
      subtitle={`Plano ${client.plan} · R$ ${client.mrr}/mês · Próx. cobrança dia ${client.dueDay||5}`}
      onClose={onClose}
      width={780}
      leftHead={<div style={{width:42, height:42, borderRadius:10, background:'var(--accent-soft)', color:'var(--accent-700)', display:'flex', alignItems:'center', justifyContent:'center'}}><Ic name="wallet" size={18}/></div>}
      footer={<>
        <div style={{flex:1}}/>
        <ActionButton action="salvar" size="md" label="Exportar CSV" icon="download" onClick={() => window.showToast({ tipo:'sucesso', titulo:'Exportação iniciada', descricao:'O arquivo CSV está sendo gerado.', duracao:4000 })} />
        <ActionButton action="salvar" size="md" label="Gerar nova cobrança" icon="plus" onClick={() => window.showToast({ tipo:'sucesso', titulo:'Cobrança gerada', descricao:`Nova cobrança criada para ${client.name}.`, duracao:4000 })} />
      </>}
    >
      <div className="stat-grid" style={{gridTemplateColumns:'repeat(4,1fr)', marginBottom:14}}>
        <Stat label="MRR" value={formatBRL(client.mrr)} icon="wallet"/>
        <Stat label="Total recebido (8m)" value={formatBRL(totalPago)} icon="circle-check" accent={{bg:'var(--accent-soft)', fg:'var(--accent-700)'}}/>
        <Stat label="Em aberto" value={formatBRL(totalPend)} icon="clock" accent={totalPend>0?{bg:'#fef3c7', fg:'#b45309'}:undefined}/>
        <Stat label="Forma" value={(client.paymentMethod||'cartao')[0].toUpperCase()+(client.paymentMethod||'cartao').slice(1)} icon="card-id"/>
      </div>
      <div className="card" style={{marginBottom:14}}>
        <div style={{padding:'14px 18px', borderBottom:'1px solid var(--border)'}} className="row"><span className="h3">Histórico de pagamentos</span><div className="spacer"/><span className="muted" style={{fontSize:'var(--type-xs)'}}>Últimos 8 meses</span></div>
        <table className="table">
          <thead><tr><th>Data</th><th>Referência</th><th>Valor</th><th>Método</th><th>Status</th><th>Transação</th><th></th></tr></thead>
          <tbody>{payments.map((p,i)=>(
            <tr key={i}>
              <td className="muted" style={{fontSize:'var(--type-sm)'}}>{p.date}</td>
              <td style={{fontWeight:500}}>{p.ref}</td>
              <td className="tnum">{formatBRL(p.value)}</td>
              <td className="muted" style={{fontSize:'var(--type-sm)'}}>{p.method}</td>
              <td>{p.status==='pago' ? <span className="badge badge-success">Pago</span> : p.status==='atrasado' ? <span className="badge badge-danger">Atrasado</span> : <span className="badge badge-warning">Pendente</span>}</td>
              <td className="mono muted" style={{fontSize:'var(--type-xs)'}}>{p.tx}</td>
              <td style={{textAlign:'right'}}><span className="btn btn-ghost btn-sm"><Ic name="download" size={12}/></span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="card card-pad">
        <div className="h3">Próximas ações</div>
        <div className="col" style={{gap:8, marginTop:10, fontSize:'var(--type-sm)'}}>
          <div className="row" style={{gap:8}}><span className="dot" style={{background:'var(--accent)'}}/>Próxima fatura: {(new Date(today.getFullYear(), today.getMonth()+1, client.dueDay||5)).toLocaleDateString('pt-BR')} · R$ {client.mrr}</div>
          <div className="row" style={{gap:8}}><span className="dot" style={{background:'var(--text-faint)'}}/>Renovação do contrato em {client.renew || '—'}</div>
          {client.status==='atrasado' && <div className="row" style={{gap:8, color:'#dc2626'}}><span className="dot" style={{background:'#dc2626'}}/>Cobrança em atraso · enviar lembrete</div>}
        </div>
      </div>
    </Drawer>
  );
}

// ===== Clientes / Lojas (Camada 1 do super admin) — SOMENTE VISUAL (mock) =====
const _fmtBRL = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const LOJA_STATUS = {
  ativa:        { c: 'badge-success', t: 'Ativa' },
  inadimplente: { c: 'badge-danger',  t: 'Inadimplente' },
  teste:        { c: 'badge-info',    t: 'Em teste' },
  cancelada:    { c: 'badge-neutral', t: 'Cancelada' },
};
const LojaBadge = ({ s }) => { const m = LOJA_STATUS[s] || LOJA_STATUS.ativa; return <span className={`badge ${m.c}`}>{m.t}</span>; };

// Enriquece o mock TENANTS (sem alterá-lo) com dados de ficha p/ a tela de lojas.
const _ST_FROM_TENANT = { ativo: 'ativa', atrasado: 'inadimplente', trial: 'teste', suspenso: 'cancelada' };
const _PLAN_LIM = { Starter: { users: 2, conv: 500 }, Pro: { users: 5, conv: 2000 }, Business: { users: 15, conv: 8000 } };
const _DONOS = [
  { nome: 'Mariana Sousa',     email: 'mariana@iguabela.com',     tel: '(85) 9 9870-5043' },
  { nome: 'Alex Soares',       email: 'alex@construma.com',       tel: '(85) 9 8724-8113' },
  { nome: 'Iany Maia',         email: 'iany@casadaslentes.com',   tel: '(88) 9 9826-5497' },
  { nome: 'Wilemson Pinto',    email: 'wilemson@oticasmorais.com',tel: '(88) 9 8451-5076' },
  { nome: 'Francisco Aguiar',  email: 'francisco@biofarma.com',   tel: '(88) 9 9870-8246' },
  { nome: 'Sueline Barros',    email: 'sueline@escolamodelo.com', tel: '(88) 9 5391-1822' },
  { nome: 'Ricardo Daniel',    email: 'ricardo@duftsolar.com',    tel: '(88) 9 8713-2876' },
  { nome: 'Júlia Mendes',      email: 'julia@joalheriamimi.com',  tel: '(85) 9 9912-3344' },
];
const _SEG = ['Estética', 'Construção', 'Óptica', 'Óptica', 'Farmácia', 'Educação', 'Energia solar', 'Joalheria'];
const _CID = ['Fortaleza-CE', 'Maracanaú-CE', 'Sobral-CE', 'Sobral-CE', 'Crato-CE', 'Iguatu-CE', 'Fortaleza-CE', 'Fortaleza-CE'];
const _CARGOS = ['Proprietária', 'Sócio-diretor', 'Gerente', 'Proprietário', 'Diretor', 'Coordenadora', 'CEO', 'Proprietária'];
const _CNPJS = ['12.345.678/0001-90', '23.456.789/0001-01', '34.567.890/0001-12', '45.678.901/0001-23', '56.789.012/0001-34', '67.890.123/0001-45', '78.901.234/0001-56', '89.012.345/0001-67'];
const _ORIGENS = ['Anúncio no Instagram', 'Indicação de cliente', 'Busca no Google', 'Inbound (site)', 'Indicação', 'Evento / feira', 'LinkedIn', 'Indicação'];
const _CEPS = ['60150-160', '61900-000', '62010-200', '62011-300', '63100-000', '63500-000', '60540-000', '60110-000'];
const _RUAS = ['Av. Beira Mar', 'Rua das Flores', 'Av. Dom José', 'Rua Cel. Linhares', 'Av. Padre Cícero', 'Rua São Pedro', 'Av. Washington Soares', 'Rua Major Facundo'];
const _BAIRROS = ['Meireles', 'Centro', 'Centro', 'Aldeota', 'São Miguel', 'Junco', 'Edson Queiroz', 'Centro'];

// Funis do MEU negócio (vender o sistema p/ lojas) — mesmo mecanismo do CRM. Mock.
const LOJA_FUNIS = [
  { id: 'f-aquisicao', nome: 'Aquisição de lojas', fases: [
    { id: 'p-lead',     label: 'Lead',          color: '#94a3b8' },
    { id: 'p-demo',     label: 'Demo agendada', color: '#0ea5e9' },
    { id: 'p-trial',    label: 'Em trial',      color: '#8b5cf6' },
    { id: 'p-proposta', label: 'Proposta',      color: '#f59e0b' },
    { id: 'p-cliente',  label: 'Cliente ativo', color: '#10b981' },
  ] },
  { id: 'f-expansao', nome: 'Expansão / Upsell', fases: [
    { id: 'e-ativo',    label: 'Cliente ativo',         color: '#10b981' },
    { id: 'e-qualif',   label: 'Qualificado p/ upgrade',color: '#0ea5e9' },
    { id: 'e-proposta', label: 'Proposta de upgrade',   color: '#f59e0b' },
    { id: 'e-fechado',  label: 'Upgrade fechado',       color: '#7c3aed' },
  ] },
];
function lojaFunilInicial(loja) {
  const fase = { ativa: 'p-cliente', teste: 'p-trial', inadimplente: 'p-cliente', cancelada: 'p-lead' }[loja.status] || 'p-cliente';
  return { funilId: 'f-aquisicao', faseId: fase };
}
function mesesDesde(d) {
  const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(d || '');
  if (!m) return 0;
  const ini = new Date(+m[3], +m[2] - 1, +m[1]);
  const ref = new Date(2026, 5, 1); // referência: jun/2026
  return Math.max(0, (ref.getFullYear() - ini.getFullYear()) * 12 + (ref.getMonth() - ini.getMonth()));
}
function _pagamentos(mrr, st) {
  const meses = ['Mai/2026', 'Abr/2026', 'Mar/2026', 'Fev/2026'];
  return meses.map((mes, k) => ({
    mes, metodo: k % 2 ? 'Cartão de Crédito' : 'Boleto', valor: mrr || 0,
    status: st === 'teste' ? 'isento' : (st === 'inadimplente' && k === 0) ? 'atrasado' : 'pago',
  }));
}
function lojasMock() {
  return TENANTS.map((t, i) => {
    const lim = _PLAN_LIM[t.plan] || _PLAN_LIM.Starter;
    const st = _ST_FROM_TENANT[t.status] || 'ativa';
    return {
      id: t.id, name: t.name, plan: t.plan, mrr: t.mrr, status: st, start: t.start, renew: t.renew,
      dono: { ..._DONOS[i % _DONOS.length], cargo: _CARGOS[i % _CARGOS.length] }, segmento: _SEG[i % _SEG.length], cidade: _CID[i % _CID.length],
      cnpj: _CNPJS[i % _CNPJS.length], origem: _ORIGENS[i % _ORIGENS.length],
      endereco: { cep: _CEPS[i % _CEPS.length], logradouro: _RUAS[i % _RUAS.length], numero: String(100 + i * 13), bairro: _BAIRROS[i % _BAIRROS.length], uf: (_CID[i % _CID.length].split('-')[1] || 'CE') },
      usuarios: Math.max(1, Math.min(lim.users, ((i * 2) % lim.users) + 1)), usuariosMax: lim.users,
      conversas: t.conv, conversasMax: lim.conv,
      planoHist: i % 3 === 0
        ? [{ ev: 'Plano atual', plano: t.plan, de: 'desde ' + t.start }, { ev: 'Upgrade', plano: 'Pro', de: '12/2025' }, { ev: 'Plano inicial', plano: 'Starter', de: t.start }]
        : [{ ev: 'Plano atual', plano: t.plan, de: 'desde ' + t.start }],
      pagamentos: _pagamentos(t.mrr, st),
    };
  });
}

function SumCard({ ic, cor, label, val }) {
  return (
    <div className="lj-sum-card">
      <div className="lj-sum-ic" style={{ background: `color-mix(in oklab, ${cor} 14%, var(--surface))`, color: cor }}><Ic name={ic} size={18} /></div>
      <div><div className="lj-sum-l">{label}</div><div className="lj-sum-v">{val}</div></div>
    </div>
  );
}
function LjField({ label, v }) { return <div><div className="lj-flabel">{label}</div><div className="lj-fval">{v || '—'}</div></div>; }
function UsoBar({ label, v, max, cor }) {
  const pct = max ? Math.min(100, Math.round((v / max) * 100)) : 0;
  return (
    <div className="lj-uso">
      <div className="lj-uso-top"><span>{label}</span><span className="tnum">{Number(v).toLocaleString('pt-BR')}{max ? ' / ' + Number(max).toLocaleString('pt-BR') : ''}</span></div>
      <div className="lj-uso-track"><div className="lj-uso-fill" style={{ width: pct + '%', background: cor }} /></div>
    </div>
  );
}
function FichaSec({ titulo, ic, children }) {
  return (
    <div className="lj-sec">
      <div className="lj-sec-h"><span className="lj-sec-ic"><Ic name={ic} size={14} /></span>{titulo}</div>
      <div className="lj-sec-body">{children}</div>
    </div>
  );
}

function LojaAcoesMenu({ loja, onClose }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose]);
  const reativar = loja.status === 'cancelada';
  const itens = [
    { id: 'plano',   label: 'Mudar plano',          ic: 'wallet' },
    { id: 'susp',    label: reativar ? 'Reativar loja' : 'Suspender loja', ic: reativar ? 'check' : 'pause-circle', danger: !reativar },
    { id: 'veras',   label: 'Ver como a loja',       ic: 'eye' },
    { id: 'contato', label: 'Entrar em contato',     ic: 'chat' },
  ];
  return (
    <div ref={ref} className="lj-menu">
      {itens.map((it) => (
        <button key={it.id} type="button" className={'lj-menu-item' + (it.danger ? ' is-danger' : '')} onClick={() => {
          if (it.id === 'susp') {
            window.showToast(reativar
              ? { tipo:'sucesso', titulo:'Loja reativada', descricao:`${loja.name} foi reativada.`, duracao:4000 }
              : { tipo:'sucesso', titulo:'Loja suspensa', descricao:`${loja.name} foi suspensa.`, duracao:4000 });
          }
          onClose();
        }}>
          <Ic name={it.ic} size={14} /> {it.label}
        </button>
      ))}
    </div>
  );
}

function Metric({ ic, cor, label, val }) {
  return (
    <div className="lf-metric">
      <div className="lf-metric-top"><span className="lf-metric-ic" style={{ background: `color-mix(in oklab, ${cor} 14%, var(--surface))`, color: cor }}><Ic name={ic} size={13} /></span><span className="lf-metric-l">{label}</span></div>
      <div className="lf-metric-v">{val}</div>
    </div>
  );
}

function LojaHistoricoTab({ loja }) {
  const ev = [
    { icon: 'sparkles', color: '#8b5cf6', title: 'Entrou em trial', source: 'Cadastro pelo site', date: loja.start },
    { icon: 'building', color: '#10b981', title: 'Assinou o plano ' + loja.plan, source: 'Assinatura confirmada', date: loja.start },
    { icon: 'wallet', color: '#0ea5e9', title: 'Upgrade de plano · Starter → ' + loja.plan, source: 'Time comercial', date: '12/2025' },
    { icon: 'coins', color: '#16a34a', title: 'Pagamento recebido · ' + _fmtBRL(loja.mrr), source: 'Cobrança automática', date: (loja.pagamentos[1] || {}).mes },
    { icon: 'chat', color: '#f59e0b', title: 'Chamado de suporte aberto', source: 'Suporte · resolvido em 2h', date: '04/2026' },
    loja.status === 'inadimplente' ? { icon: 'alert', color: '#ef4444', title: 'Pagamento em atraso', source: 'Régua de cobrança disparada', date: (loja.pagamentos[0] || {}).mes } : null,
    loja.status === 'cancelada' ? { icon: 'x', color: '#64748b', title: 'Assinatura cancelada', source: 'Solicitado pela loja', date: '05/2026' } : null,
  ].filter(Boolean);
  return (
    <div>
      <div className="lf-th">Histórico</div>
      <div className="muted" style={{ fontSize: 13, marginTop: -8, marginBottom: 16 }}>A vida útil da loja na plataforma</div>
      {ev.map((e, i) => <LeadHistoryItem key={i} icon={e.icon} color={e.color} title={e.title} source={e.source} date={e.date} />)}
    </div>
  );
}

function LojaAtividadesTab({ onNova, extras = [] }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 18 }}>Atividades</div>
          <div className="muted" style={{ fontSize: 13 }}>Veja as atividades com a loja</div>
        </div>
        <div style={{ flex: 1 }} />
        <FabNovo size="mini" label="Adicionar" onClick={onNova} />
      </div>
      {extras.length > 0 && <>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>Novas</div>
        {extras.map((a, i) => <LeadActivityCard key={'x' + i} day="Nova" date={a.date} time="—" dur="—" title={a.titulo} person={a.person} color="#10B981" status="pending" />)}
      </>}
      <div style={{ fontSize: 12, fontWeight: 600, marginTop: extras.length ? 18 : 0, marginBottom: 8, color: 'var(--text-muted)' }}>Atrasados</div>
      <LeadActivityCard day="Quinta" date="29/05" time="10:00" dur="30m" title="Reunião de renovação" person="Você" color="#EF4444" status="overdue" />
      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 18, marginBottom: 8, color: 'var(--text-muted)' }}>Completadas</div>
      <LeadActivityCard day="Terça" date="20/05" time="14:30" dur="45m" title="Demo do sistema" person="Você" color="#0EA5E9" status="done" />
      <LeadActivityCard day="Quinta" date="08/05" time="09:15" dur="20m" title="Ligar sobre upgrade" person="Comercial" color="#0EA5E9" status="done" />
      <LeadActivityCard day="Segunda" date="28/04" time="16:00" dur="—" title="Enviar proposta Business" person="Você" color="#0EA5E9" status="done" />
    </div>);
}

function LojaAssinaturaTab({ loja, onMudarPlano }) {
  const ativos = loja.status === 'ativa' || loja.status === 'inadimplente';
  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 600, fontSize: 18 }}>Assinatura & negócios</div>
        <div className="muted" style={{ fontSize: 13 }}>Plano atual, valor e mudanças de plano</div>
      </div>

      {/* Assinatura atual */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, border: '1px solid var(--border)', borderRadius: 12, marginBottom: 18, background: 'var(--surface)' }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'color-mix(in oklab, var(--accent) 14%, var(--surface))', color: 'var(--accent-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic name="wallet" size={18} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Plano {loja.plan}</div>
          <div className="muted" style={{ fontSize: 12 }}>Assinatura {ativos ? 'ativa' : loja.status === 'teste' ? 'em teste' : 'cancelada'} · renova em {loja.renew}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--accent-700)' }}>{loja.status === 'teste' ? 'Em teste' : _fmtBRL(loja.mrr)}</div>
          <div className="muted" style={{ fontSize: 11 }}>por mês</div>
        </div>
        <FabNovo size="mini" label="Mudar plano" onClick={onMudarPlano} />
      </div>

      {/* Mudanças de plano */}
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>Mudanças de plano</div>
      {[
        { tipo: 'Upgrade', de: 'Starter', para: loja.plan, data: '12/2025', cor: '#10B981' },
        { tipo: 'Assinatura inicial', de: '—', para: 'Starter', data: loja.start, cor: '#0EA5E9' },
      ].map((m, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8, background: 'var(--surface)' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `color-mix(in oklab, ${m.cor} 14%, #fff)`, color: m.cor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic name="arrow-up-right" size={14} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{m.tipo} · {m.de} → {m.para}</div>
            <div className="muted" style={{ fontSize: 11 }}>{m.data}</div>
          </div>
        </div>
      ))}
    </div>);
}

function LojaArquivosTab() {
  const files = [
    { name: 'Contrato_assinatura.pdf', kind: 'PDF', size: '248 KB', date: '01/03/2025', by: 'Você' },
    { name: 'Proposta_comercial.pdf', kind: 'PDF', size: '180 KB', date: '20/02/2025', by: 'Você' },
    { name: 'Termo_LGPD.pdf', kind: 'PDF', size: '92 KB', date: '01/03/2025', by: 'Loja' },
    { name: 'Logo_da_loja.png', kind: 'PNG', size: '120 KB', date: '03/03/2025', by: 'Loja' },
  ];
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 18 }}>Arquivos</div>
          <div className="muted" style={{ fontSize: 13 }}>Arquivos anexados à loja</div>
        </div>
        <div style={{ flex: 1 }} />
        <FabNovo size="mini" label="Anexar" />
      </div>
      {files.map((f) => (
        <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8, background: 'var(--surface)' }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: f.kind === 'PDF' ? '#FEE2E2' : f.kind === 'PNG' ? '#DBEAFE' : '#FEF3C7', color: f.kind === 'PDF' ? '#DC2626' : f.kind === 'PNG' ? '#2563EB' : '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{f.kind}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{f.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.size} · {f.date} · por {f.by}</div>
          </div>
          <button className="btn btn-icon btn-sm"><Ic name="download" size={14} /></button>
          <button className="btn btn-icon btn-sm"><Ic name="more" size={14} /></button>
        </div>
      ))}
    </div>);
}

function LojaAgendaTab({ onNovo, extras = [] }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 18 }}>Agenda</div>
          <div className="muted" style={{ fontSize: 13 }}>Agende demos, reuniões e ligações com a loja</div>
        </div>
        <div style={{ flex: 1 }} />
        <FabNovo size="mini" label="Agendar" onClick={onNovo} />
      </div>

      {/* Agendar rapidamente */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, background: 'var(--surface)', marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Agendar rapidamente</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div>
            <label className="label">Tipo</label>
            <select className="input">
              <option>🎥 Demo do sistema</option>
              <option>🔁 Reunião de renovação</option>
              <option>📞 Ligação</option>
              <option>🚀 Onboarding</option>
              <option>✅ Tarefa</option>
            </select>
          </div>
          <div><label className="label">Data</label><DateInput value="2026-06-20" onChange={() => {}} /></div>
          <div><label className="label">Hora</label><TimeInput value="14:30" onChange={() => {}} /></div>
        </div>
        <div style={{ marginTop: 10 }}>
          <label className="label">Descrição</label>
          <textarea className="input" rows={2} placeholder="Detalhes do compromisso..." defaultValue="Apresentar os planos e tirar dúvidas sobre a migração de dados." />
        </div>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" defaultChecked /> Lembrar 30 min antes</label>
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" /> Enviar convite por WhatsApp</label>
        </div>
      </div>

      {/* Próximos compromissos */}
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>Próximos compromissos</div>
      {extras.map((e, i) => (
        <div key={'x' + i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8, background: 'var(--surface)' }}>
          <div style={{ minWidth: 52, textAlign: 'center', padding: '6px 0', borderRadius: 8, background: 'color-mix(in oklab, #10B981 12%, #fff)', border: '1px solid color-mix(in oklab, #10B981 25%, transparent)' }}>
            <div style={{ fontSize: 10, color: '#10B981', fontWeight: 600 }}>{e.day}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#10B981' }}>{e.date}</div>
            <div style={{ fontSize: 10, color: '#10B981' }}>{e.month}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{e.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{e.desc}</div>
            <div style={{ fontSize: 11, color: '#10B981', marginTop: 4, fontWeight: 500 }}><Ic name="clock" size={10} /> {e.time}</div>
          </div>
          <button className="btn btn-icon btn-sm"><Ic name="edit" size={13} /></button>
          <button className="btn btn-icon btn-sm"><Ic name="more" size={14} /></button>
        </div>
      ))}
      {[
        { day: 'SEX', date: '20', month: 'Jun', time: '14:30', title: 'Demo do sistema', desc: 'Reunião online via Google Meet', color: '#10B981' },
        { day: 'TER', date: '24', month: 'Jun', time: '10:00', title: 'Reunião de renovação', desc: 'Renovação do plano anual', color: '#0EA5E9' },
        { day: 'SEX', date: '27', month: 'Jun', time: '16:00', title: 'Onboarding da loja', desc: 'Treinamento da equipe da loja', color: '#8B5CF6' },
      ].map((e, i) => (
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
      ))}
    </div>);
}

function LojaAutomacaoTab() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 18 }}>Automação</div>
          <div className="muted" style={{ fontSize: 13 }}>Programe cobranças, lembretes e gatilhos para esta loja</div>
        </div>
        <div style={{ flex: 1 }} />
        <FabNovo size="mini" label="Nova automação" />
      </div>

      {/* Disparo programado */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, background: 'var(--surface)', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic name="zap" size={14} /></div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Disparo programado</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Envie uma mensagem para a loja em um horário específico</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label className="label">Canal</label><select className="input"><option>💬 WhatsApp</option><option>📧 E-mail</option><option>📱 SMS</option></select></div>
          <div><label className="label">Template</label><select className="input"><option>Lembrete de renovação</option><option>Cobrança em atraso</option><option>Boas-vindas da loja</option><option>Pesquisa NPS</option><option>Mensagem personalizada</option></select></div>
          <div><label className="label">Disparo em</label><input className="input" type="datetime-local" defaultValue="2026-06-25T09:00" /></div>
          <div><label className="label">Fuso</label><select className="input"><option>America/Fortaleza (BRT)</option><option>America/São_Paulo (BRT)</option></select></div>
        </div>
        <div style={{ marginTop: 10 }}>
          <label className="label">Mensagem</label>
          <textarea className="input" rows={3} defaultValue="Olá {{loja}}! Seu plano {{plano}} renova em breve. Qualquer dúvida, estamos à disposição." />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Variáveis disponíveis: <code>{'{{loja}}'}</code> <code>{'{{dono}}'}</code> <code>{'{{plano}}'}</code></div>
        </div>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" defaultChecked /> Cancelar se a loja pagar antes</label>
          <div style={{ flex: 1 }} />
          <button className="btn btn-sm">Salvar rascunho</button>
          <button className="btn btn-save btn-sm"><Ic name="send" size={12} /> Programar</button>
        </div>
      </div>

      {/* Automações ativas */}
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>Automações ativas para esta loja</div>
      {[
        { ic: 'repeat', color: '#10B981', name: 'Cobrança recorrente', desc: 'Gera a fatura todo dia 1º e tenta o cartão', status: 'ativa', next: 'Próx. 01 Jul' },
        { ic: 'agenda', color: '#0EA5E9', name: 'Lembrete de renovação', desc: 'Avisa o dono 7 dias antes da renovação', status: 'ativa', next: '23 Jun · 09:00' },
        { ic: 'bell', color: '#EF4444', name: 'Régua de inadimplência', desc: 'E-mail + WhatsApp após 3 dias de atraso', status: 'aguardando', next: '—' },
        { ic: 'star', color: '#F59E0B', name: 'Pesquisa de satisfação (NPS)', desc: 'Envia a cada 90 dias', status: 'pausada', next: '—' },
      ].map((a, i) => {
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

      {/* Gatilhos */}
      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 18, marginBottom: 8, color: 'var(--text-muted)' }}>Gatilhos disponíveis</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          ['Mudou de fase no funil', 'arrow-up-right'],
          ['Plano prestes a renovar', 'repeat'],
          ['Pagamento em atraso', 'alert'],
          ['Loja inativa por X dias', 'clock'],
          ['Fez upgrade de plano', 'arrow-up-right'],
          ['Trial terminando', 'clock'],
        ].map(([t, ic], i) => (
          <button key={i} className="btn btn-sm" style={{ justifyContent: 'flex-start', padding: '10px 12px', textAlign: 'left' }}><Ic name={ic} size={13} /> {t}</button>
        ))}
      </div>
    </div>);
}

// Helpers de data p/ os itens criados pelos drawers (mock).
const _MES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const _DIA_ABREV = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
function _badgeData(ymd) {
  const m = /(\d{4})-(\d{2})-(\d{2})/.exec(ymd || '');
  if (!m) return { day: '—', date: '--', month: '' };
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return { day: _DIA_ABREV[d.getDay()], date: m[3], month: _MES_ABREV[+m[2] - 1] };
}
function _ddmm(ymd) { const m = /(\d{4})-(\d{2})-(\d{2})/.exec(ymd || ''); return m ? `${m[3]}/${m[2]}` : '--/--'; }

// ───────── Drawer: Mudar plano (proração mock) ─────────
function MudarPlanoDrawer({ loja, onClose }) {
  const atualNome = loja.plan;
  const atualPreco = loja.mrr || (PLANS.find((p) => p.name === loja.plan) || {}).price || 0;
  const [novo, setNovo] = React.useState(loja.plan);
  const [quando, setQuando] = React.useState('imediatamente');
  const [cobranca, setCobranca] = React.useState('agora');
  const [mudarData, setMudarData] = React.useState(false);
  const [obs, setObs] = React.useState('');

  const planoNovo = PLANS.find((p) => p.name === novo) || {};
  const novoPreco = planoNovo.price || 0;
  const mudou = novo !== atualNome;
  const diasRest = 12, ciclo = 30, frac = diasRest / ciclo; // proração mock
  const propNovo = novoPreco * frac;
  const credAtual = atualPreco * frac;
  const diff = propNovo - credAtual; // >0 paga · <0 crédito
  const mostraProracao = mudou && quando === 'imediatamente';

  const seg = (sel) => ({ flex: 1, borderColor: sel ? 'var(--accent)' : 'var(--border)', color: sel ? 'var(--accent-700)' : 'var(--text)', background: sel ? 'var(--accent-soft)' : 'var(--surface)' });

  return (
    <Drawer title="Mudar plano" subtitle={loja.name} onClose={onClose} width={520}
      footer={<><div style={{ flex: 1 }} /><ActionButton action="voltar" size="md" onClick={onClose} /><ActionButton action="salvar" size="md" label="Confirmar mudança" onClick={() => { window.showToast(mudou ? { tipo:'sucesso', titulo:'Plano alterado', descricao:`${atualNome} → ${novo}.`, duracao:4000 } : { tipo:'info', titulo:'Nada foi alterado', descricao:'O plano selecionado é o mesmo plano atual.', duracao:4000 }); onClose(); }} /></>}>
      <div className="col" style={{ gap: 16 }}>
        {/* Plano atual */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface-2)' }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: 'color-mix(in oklab, var(--accent) 14%, var(--surface))', color: 'var(--accent-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic name="wallet" size={17} /></div>
          <div style={{ flex: 1 }}>
            <div className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Plano atual</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{atualNome} · {_fmtBRL(atualPreco)}/mês</div>
            <div className="muted" style={{ fontSize: 12 }}>Ciclo mensal · próx. renovação {loja.renew}</div>
          </div>
        </div>

        {/* Escolher novo plano */}
        <div>
          <div className="label" style={{ marginBottom: 8 }}>Escolher o novo plano</div>
          <div className="col" style={{ gap: 8 }}>
            {PLANS.map((p) => {
              const sel = p.name === novo, atual = p.name === atualNome;
              const up = p.price > atualPreco, down = p.price < atualPreco;
              return (
                <button key={p.id} type="button" onClick={() => setNovo(p.name)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: `1.5px solid ${sel ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 11, background: sel ? 'var(--accent-soft)' : 'var(--surface)', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${sel ? 'var(--accent)' : 'var(--border-strong)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{sel && <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--accent)' }} />}</span>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{p.name}</div><div className="muted" style={{ fontSize: 12 }}>{(p.conv || 0).toLocaleString('pt-BR')} conversas · {p.users} usuários</div></div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800 }}>{_fmtBRL(p.price)}</div>
                    {atual ? <span className="badge badge-neutral">Atual</span> : up ? <span className="badge badge-success">Upgrade</span> : down ? <span className="badge badge-warning">Downgrade</span> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quando passa a valer */}
        <div>
          <div className="label" style={{ marginBottom: 8 }}>Quando passa a valer</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn" style={seg(quando === 'imediatamente')} onClick={() => setQuando('imediatamente')}>Imediatamente</button>
            <button type="button" className="btn" style={seg(quando === 'proximo')} onClick={() => setQuando('proximo')}>No próximo ciclo</button>
          </div>
        </div>

        {/* Proração */}
        {mostraProracao && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.03em' }}>Diferença a pagar · proração ({diasRest} dias restantes)</div>
            <div style={{ padding: 14 }}>
              <div style={{ display: 'flex', padding: '4px 0', fontSize: 13 }}><span>Proporcional do {novo}</span><div style={{ flex: 1 }} /><span className="tnum">{_fmtBRL(propNovo)}</span></div>
              <div style={{ display: 'flex', padding: '4px 0', fontSize: 13 }}><span>Crédito do {atualNome}</span><div style={{ flex: 1 }} /><span className="tnum" style={{ color: '#16a34a' }}>− {_fmtBRL(credAtual)}</span></div>
              <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
              <div style={{ display: 'flex', padding: '4px 0', fontWeight: 800 }}><span>{diff >= 0 ? 'Diferença a pagar agora' : 'Crédito a favor da loja'}</span><div style={{ flex: 1 }} /><span className="tnum" style={{ color: diff >= 0 ? 'var(--text)' : '#16a34a' }}>{_fmtBRL(Math.abs(diff))}</span></div>
            </div>
          </div>
        )}

        {/* Cobrança da diferença (upgrade imediato) */}
        {mostraProracao && diff > 0 && (
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Cobrança da diferença</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn" style={seg(cobranca === 'agora')} onClick={() => setCobranca('agora')}>Cobrar agora</button>
              <button type="button" className="btn" style={seg(cobranca === 'proxima')} onClick={() => setCobranca('proxima')}>Somar na próxima fatura</button>
            </div>
          </div>
        )}

        {/* Data de pagamento */}
        <div>
          <div className="label" style={{ marginBottom: 8 }}>Data de pagamento</div>
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginBottom: mudarData ? 10 : 0 }}><input type="checkbox" checked={mudarData} onChange={(e) => setMudarData(e.target.checked)} /> Alterar a data de pagamento (atual: dia 01)</label>
          {mudarData && <DateInput value="2026-07-01" onChange={() => {}} />}
        </div>

        {/* Observação */}
        <div>
          <label className="label">Observação (opcional)</label>
          <textarea className="input" rows={2} placeholder="Motivo da mudança..." value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>

        {/* Resumo */}
        <div style={{ border: '1px dashed var(--border-strong)', borderRadius: 12, padding: 14, background: 'var(--surface-2)' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Resumo</div>
          <div className="col" style={{ gap: 6, fontSize: 13 }}>
            <div style={{ display: 'flex' }}><span className="muted">Plano</span><div style={{ flex: 1 }} /><span style={{ fontWeight: 600 }}>{atualNome} → {novo}{!mudou && ' (sem mudança)'}</span></div>
            <div style={{ display: 'flex' }}><span className="muted">Novo valor</span><div style={{ flex: 1 }} /><span style={{ fontWeight: 600 }}>{_fmtBRL(novoPreco)}/mês</span></div>
            {mostraProracao && <div style={{ display: 'flex' }}><span className="muted">{diff >= 0 ? 'A pagar agora' : 'Crédito'}</span><div style={{ flex: 1 }} /><span style={{ fontWeight: 600 }}>{_fmtBRL(Math.abs(diff))}</span></div>}
            <div style={{ display: 'flex' }}><span className="muted">Passa a valer</span><div style={{ flex: 1 }} /><span style={{ fontWeight: 600 }}>{quando === 'imediatamente' ? 'Imediatamente' : 'No próximo ciclo'}</span></div>
            <div style={{ display: 'flex' }}><span className="muted">Próximo pagamento</span><div style={{ flex: 1 }} /><span style={{ fontWeight: 600 }}>{loja.renew}</span></div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

// ───────── Drawer: Nova atividade (alimenta a aba Atividades) ─────────
function NovaAtividadeDrawer({ loja, onClose, onSalvar }) {
  const [tipo, setTipo] = React.useState('ligacao');
  const [titulo, setTitulo] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [data, setData] = React.useState('2026-06-25');
  const [resp, setResp] = React.useState('Você');
  const [fase, setFase] = React.useState('');
  const TIPOS = [['ligacao', '📞 Ligação'], ['reuniao', '📅 Reunião'], ['email', '✉️ E-mail'], ['tarefa', '✅ Tarefa'], ['nota', '📝 Nota']];
  const salvar = () => { onSalvar && onSalvar({ titulo: titulo || 'Atividade', date: _ddmm(data), person: resp }); window.showToast({ tipo:'sucesso', titulo:'Atividade criada', descricao:`${titulo || 'Atividade'} foi adicionada.`, duracao:4000 }); };
  return (
    <Drawer title="Nova atividade" subtitle={loja.name} onClose={onClose} width={460}
      footer={<><div style={{ flex: 1 }} /><ActionButton action="voltar" size="md" onClick={onClose} /><ActionButton action="salvar" size="md" onClick={salvar} /></>}>
      <div className="col" style={{ gap: 14 }}>
        <div><label className="label">Tipo</label><select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>{TIPOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div><label className="label">Título / assunto</label><input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Ligar sobre renovação" /></div>
        <div><label className="label">Descrição</label><textarea className="input" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Detalhes da atividade..." /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label className="label">Data / prazo</label><DateInput value={data} onChange={setData} /></div>
          <div><label className="label">Responsável</label><select className="input" value={resp} onChange={(e) => setResp(e.target.value)}><option>Você</option><option>Comercial</option><option>Suporte</option></select></div>
        </div>
        <div><label className="label">Vincular à fase do funil (opcional)</label>
          <select className="input" value={fase} onChange={(e) => setFase(e.target.value)}>
            <option value="">— Nenhuma —</option>
            {LOJA_FUNIS[0].fases.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </div>
      </div>
    </Drawer>
  );
}

// ───────── Drawer: Agendamento (alimenta a aba Agenda) ─────────
function AgendamentoDrawer({ loja, onClose, onAgendar }) {
  const [titulo, setTitulo] = React.useState('');
  const [tipo, setTipo] = React.useState('reuniao');
  const [data, setData] = React.useState('2026-06-25');
  const [hora, setHora] = React.useState('14:30');
  const [dur, setDur] = React.useState('30');
  const [participantes, setParticipantes] = React.useState('');
  const [modo, setModo] = React.useState('online');
  const [local, setLocal] = React.useState('');
  const [obs, setObs] = React.useState('');
  const TIPOS = [['reuniao', '📅 Reunião'], ['demo', '🎥 Demonstração'], ['call', '📞 Call']];
  const seg = (sel) => ({ flex: 1, borderColor: sel ? 'var(--accent)' : 'var(--border)', color: sel ? 'var(--accent-700)' : 'var(--text)', background: sel ? 'var(--accent-soft)' : 'var(--surface)' });
  const agendar = () => { onAgendar && onAgendar({ title: titulo || 'Compromisso', desc: (local || (modo === 'online' ? 'Reunião online' : 'Presencial')), time: hora, ...(_badgeData(data)) }); window.showToast({ tipo:'sucesso', titulo:'Agendamento criado', descricao:`${titulo || 'Compromisso'} agendado para ${_ddmm ? _ddmm(data) : data} às ${hora}.`, duracao:4000 }); };
  return (
    <Drawer title="Novo agendamento" subtitle={loja.name} onClose={onClose} width={460}
      footer={<><div style={{ flex: 1 }} /><ActionButton action="voltar" size="md" onClick={onClose} /><ActionButton action="salvar" size="md" label="Agendar" icon="agenda" onClick={agendar} /></>}>
      <div className="col" style={{ gap: 14 }}>
        <div><label className="label">Título do compromisso</label><input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Demo do sistema" /></div>
        <div><label className="label">Tipo</label><select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>{TIPOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div><label className="label">Data</label><DateInput value={data} onChange={setData} /></div>
          <div><label className="label">Hora</label><TimeInput value={hora} onChange={setHora} /></div>
          <div><label className="label">Duração</label><select className="input" value={dur} onChange={(e) => setDur(e.target.value)}><option value="15">15 min</option><option value="30">30 min</option><option value="60">1 hora</option><option value="90">1h30</option></select></div>
        </div>
        <div><label className="label">Com quem / participantes</label><input className="input" value={participantes} onChange={(e) => setParticipantes(e.target.value)} placeholder={`Ex.: ${loja.dono.nome}, equipe`} /></div>
        <div>
          <label className="label">Formato</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button type="button" className="btn" style={seg(modo === 'online')} onClick={() => setModo('online')}>Online</button>
            <button type="button" className="btn" style={seg(modo === 'presencial')} onClick={() => setModo('presencial')}>Presencial</button>
          </div>
          <input className="input" value={local} onChange={(e) => setLocal(e.target.value)} placeholder={modo === 'online' ? 'Link da reunião (Meet, Zoom...)' : 'Endereço / local'} />
        </div>
        <div><label className="label">Observações</label><textarea className="input" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Pauta, materiais..." /></div>
      </div>
    </Drawer>
  );
}

// Campo estilo "print": rótulo em cima + caixa com ícone à esquerda e o valor.
// Campo padrão = o da "designer aba 01" (DesignerAba01) do design system.
const DadoCampo = DA01Campo;

// ───────── Drawer: Dados cadastrais — usa o componente padrão DesignerAba01 ─────────
function DadosCadastraisDrawer({ loja, onClose }) {
  const st = (LOJA_STATUS[loja.status] || {}).t || loja.status;
  const e = loja.endereco;
  const blocos = [
    { titulo: 'Dados da empresa', campos: [
      { ic: 'bank', label: 'Loja', v: loja.name, col: 6 },
      { ic: 'file-text', label: 'CNPJ', v: loja.cnpj, col: 6 },
      { ic: 'tag', label: 'Segmento', v: loja.segmento, col: 4 },
      { ic: 'megaphone', label: 'Origem', v: loja.origem, col: 4 },
      { ic: 'calendar', label: 'Cliente desde', v: loja.start, col: 4, ro: true },
      { ic: 'activity', label: 'Status', v: st, col: 6, ro: true },
      { ic: 'wallet', label: 'Plano', v: loja.plan, col: 6, ro: true },
    ] },
    { titulo: 'Responsável', campos: [
      { ic: 'user', label: 'Nome completo', v: loja.dono.nome },
      { ic: 'user', label: 'Nome social', v: loja.dono.nomeSocial },
      { ic: 'card-id', label: 'Cargo', v: loja.dono.cargo },
      { ic: 'phone', label: 'Telefone', v: loja.dono.tel },
      { ic: 'mail', label: 'E-mail', v: loja.dono.email, full: true },
    ] },
    { titulo: 'Endereço', campos: [
      { ic: 'map-pin', label: 'Logradouro', v: e.logradouro, col: 6 },
      { ic: 'globe', label: 'Bairro', v: e.bairro, col: 6 },
      { ic: 'hash', label: 'CEP', v: e.cep, col: 3 },
      { ic: 'bank', label: 'Cidade', v: loja.cidade, col: 3 },
      { ic: 'flag', label: 'UF', v: e.uf, col: 3 },
      { ic: 'pin', label: 'Número', v: e.numero, col: 3 },
    ] },
    { titulo: 'Observação', campos: [
      { label: 'Anotações', v: 'Cliente atende pelo WhatsApp comercial. Renovação anual em março; prefere contato por e-mail.', full: true, area: true, grow: true },
    ] },
  ];
  return <DesignerAba01 title="Dados cadastrais" subtitle={loja.name} blocos={blocos} onClose={onClose} onSalvar={() => {}} />;
}

// ───────── Drawer: Editar ficha da loja (mock) ─────────
function EditarFichaDrawer({ loja, onClose }) {
  const [f, setF] = React.useState({
    name: loja.name, segmento: loja.segmento, cidade: loja.cidade, cnpj: loja.cnpj, origem: loja.origem,
    donoNome: loja.dono.nome, donoCargo: loja.dono.cargo, donoEmail: loja.dono.email, donoTel: loja.dono.tel,
    cep: loja.endereco.cep, logradouro: loja.endereco.logradouro, numero: loja.endereco.numero, bairro: loja.endereco.bairro, uf: loja.endereco.uf,
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const inp = (label, k, ph) => <div><label className="label">{label}</label><input className="input" value={f[k] || ''} onChange={(e) => set(k, e.target.value)} placeholder={ph || ''} /></div>;
  const sub = (t) => <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text-muted)' }}>{t}</div>;
  return (
    <Drawer title="Editar ficha" subtitle={loja.name} onClose={onClose} width={520}
      footer={<><div style={{ flex: 1 }} /><ActionButton action="voltar" size="md" onClick={onClose} /><ActionButton action="salvar" size="md" onClick={() => { window.showToast({ tipo:'sucesso', titulo:'Ficha atualizada', descricao:`Os dados de ${f.name || loja.name} foram salvos.`, duracao:4000 }); onClose(); }} /></>}>
      <div className="col" style={{ gap: 14 }}>
        {sub('Dados da loja')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{inp('Loja', 'name')}{inp('Segmento', 'segmento')}{inp('CNPJ', 'cnpj')}{inp('Cidade', 'cidade')}</div>
        {inp('Origem (como virou cliente)', 'origem')}
        {sub('Dono / responsável')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{inp('Nome', 'donoNome')}{inp('Cargo', 'donoCargo')}{inp('E-mail', 'donoEmail')}{inp('Telefone', 'donoTel')}</div>
        {sub('Endereço')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{inp('CEP', 'cep')}{inp('UF', 'uf')}</div>
        {inp('Logradouro', 'logradouro')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{inp('Número', 'numero')}{inp('Bairro', 'bairro')}</div>
      </div>
    </Drawer>
  );
}

// Selos de status da Conta — cores do design system (mesmas dos toasts).
const CONTA_STATUS = {
  lead:     { label: 'Lead',     cor: '#165EEE', bg: '#EAF0FE' },
  trial:    { label: 'Em trial', cor: '#FF8B30', bg: '#FDEEE7' },
  ativo:    { label: 'Ativo',    cor: '#3DA767', bg: '#C9F0D3' },
  suspenso: { label: 'Suspenso', cor: '#FF452A', bg: '#FFEBEC' },
};
function ContaBloco({ titulo, children }) {
  return (<>
    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{titulo}</div>
    <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface)', marginBottom: 18 }}>{children}</div>
  </>);
}
function LojaContaTab({ loja, onMudarPlano, onProvisioned }) {
  const c = loja._cliente || {};
  const [provisionado, setProvisionado] = React.useState(!!c.empresaId);
  const [planoTrial, setPlanoTrial] = React.useState(false);
  const [planoTrialDias, setPlanoTrialDias] = React.useState(7);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [trialEscolha, setTrialEscolha] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [cred, setCred] = React.useState(null); // resultado do provisionamento — mostra a senha 1x

  // Trial do plano (pra default do toggle de confirmação).
  React.useEffect(() => {
    if (!c.planoId) return;
    API.getPlanos().then((r) => {
      const p = (r.planos || []).find((x) => x.id === c.planoId);
      if (p) { setPlanoTrial(!!p.trial); setPlanoTrialDias(p.trialDias || 7); }
    }).catch(() => {});
  }, [c.planoId]);

  const statusKey = provisionado ? 'ativo'
    : c.statusLoja === 'teste' ? 'trial'
    : c.statusLoja === 'ativa' ? 'ativo'
    : (c.statusLoja === 'suspenso' || c.statusLoja === 'cancelada') ? 'suspenso'
    : 'lead';
  const SS = CONTA_STATUS[statusKey];
  const emailLogin = (loja.dono && loja.dono.email) || c.email || '—';
  const subdom = c.subdominio || (loja.name || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
  const temPlano = loja.plan && loja.plan !== '—';

  const abrirConfirm = () => { setTrialEscolha(planoTrial); setShowConfirm(true); };
  const provisionar = () => {
    if (busy) return;
    setBusy(true);
    API.provisionarCliente(c.id, { trial: trialEscolha })
      .then((r) => {
        setShowConfirm(false); setProvisionado(true); setCred(r);
        window.showToast({ tipo: 'sucesso', titulo: 'Loja provisionada', descricao: `Acesso criado para ${loja.name}.`, duracao: 4000 });
        onProvisioned && onProvisioned();
      })
      .catch((e) => {
        const msg = (e && e.status === 409) ? 'Esta loja já foi provisionada.'
          : (e && e.status === 403) ? 'Acesso restrito ao Super Admin.'
          : ((e && e.data && e.data.error) || (e && e.message) || 'Tente novamente.');
        window.showToast({ tipo: 'erro', titulo: 'Erro ao provisionar', descricao: msg, duracao: 5000 });
      })
      .finally(() => setBusy(false));
  };
  const copiar = (txt) => { try { navigator.clipboard.writeText(txt); window.showToast({ tipo: 'sucesso', titulo: 'Copiado', duracao: 2000 }); } catch (e) {} };

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 600, fontSize: 18 }}>Conta</div>
        <div className="muted" style={{ fontSize: 13 }}>Situação, acesso e assinatura do cliente</div>
      </div>

      {/* 1 · Situação */}
      <ContaBloco titulo="Situação">
        <div className="row" style={{ gap: 12, alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 999, fontWeight: 700, fontSize: 13, color: SS.cor, background: SS.bg }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: SS.cor }} />{SS.label}
          </span>
          <span className="muted" style={{ fontSize: 13 }}>{provisionado ? 'Cliente com acesso ativo na plataforma.' : 'Cadastro comercial — ainda sem acesso provisionado.'}</span>
        </div>
      </ContaBloco>

      {/* 2 · Acesso */}
      <ContaBloco titulo="Acesso">
        <div className="col" style={{ gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label className="label">E-mail de login</label><input className="input" value={emailLogin} readOnly /></div>
            <div><label className="label">Subdomínio</label>
              <div style={{ display: 'flex', alignItems: 'stretch' }}>
                <input className="input" value={subdom} readOnly style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }} />
                <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', border: '1px solid var(--border)', borderLeft: 'none', borderTopRightRadius: 8, borderBottomRightRadius: 8, background: 'var(--surface-2)', color: 'var(--text-muted)', fontSize: 'var(--type-sm)', whiteSpace: 'nowrap' }}>.atende.ia</span>
              </div>
            </div>
          </div>
          <div className="row" style={{ gap: 10, alignItems: 'center', marginTop: 2 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: provisionado ? '#3DA767' : 'var(--text-muted)' }}>
              <Ic name={provisionado ? 'check' : 'shield'} size={15} /> {provisionado ? 'Acesso ativo' : 'Acesso ainda não criado'}
            </span>
            <div className="spacer" />
            {provisionado
              ? <span className="muted" style={{ fontSize: 13 }}>Loja já provisionada</span>
              : <ActionButton action="salvar" size="md" efeito={false} disabled={busy} label="Provisionar loja / Criar acesso" icon="shield" onClick={abrirConfirm} />}
          </div>
        </div>
      </ContaBloco>

      {/* 3 · Plano & Assinatura */}
      <ContaBloco titulo="Plano & Assinatura">
        <div className="col" style={{ gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'color-mix(in oklab, var(--accent) 14%, var(--surface))', color: 'var(--accent-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ic name="wallet" size={18} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{temPlano ? ('Plano ' + loja.plan) : 'Sem plano definido'}</div>
              <div className="muted" style={{ fontSize: 12 }}>Status: <b style={{ color: SS.cor }}>{SS.label}</b> · próximo pagamento: {provisionado ? '10/07/2026' : '—'}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--accent-700)' }}>{temPlano ? _fmtBRL(loja.mrr) : '—'}</div>
              <div className="muted" style={{ fontSize: 11 }}>por mês</div>
            </div>
          </div>
          <div className="row">
            <div className="spacer" />
            <ActionButton action="editar" size="md" efeito={false} label="Mudar plano" icon="wallet" onClick={onMudarPlano} />
          </div>
        </div>
      </ContaBloco>

      {/* Modal: confirmar provisionamento (escolha do trial) */}
      {showConfirm && <Modal title="Provisionar loja" size="sm" onClose={() => { if (!busy) setShowConfirm(false); }}
        footer={<><div style={{ flex: 1 }} /><ActionButton action="voltar" size="md" label="Cancelar" disabled={busy} onClick={() => setShowConfirm(false)} /><ActionButton action="salvar" size="md" efeito={false} disabled={busy} label={busy ? 'Provisionando…' : 'Provisionar'} icon="shield" onClick={provisionar} /></>}>
        <div className="col" style={{ gap: 12, fontSize: 'var(--type-sm)' }}>
          <div>Criar o acesso real de <b>{loja.name}</b>? Isso cria o <b>login do dono</b> ({emailLogin}) e a <b>empresa isolada</b> no banco.</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={trialEscolha} onChange={(e) => setTrialEscolha(e.target.checked)} />
            <span>Provisionar em <b>trial</b>{planoTrial ? ` · padrão do plano (${planoTrialDias} dias)` : ''}</span>
          </label>
          <div className="muted" style={{ fontSize: 12 }}>A senha provisória aparece <b>só uma vez</b> na próxima tela.</div>
        </div>
      </Modal>}

      {/* Modal: credenciais (mostra a senha 1x) */}
      {cred && <Modal title="Acesso criado" size="sm" onClose={() => setCred(null)}
        footer={<><div style={{ flex: 1 }} /><ActionButton action="salvar" size="md" efeito={false} label="Fechar" icon="check" onClick={() => setCred(null)} /></>}>
        <div className="col" style={{ gap: 12, fontSize: 'var(--type-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 9, background: 'color-mix(in oklab, #10b981 12%, var(--surface))', color: '#047857' }}>
            <Ic name="check" size={16} /> Loja provisionada — status <b style={{ marginLeft: 3 }}>{cred.status}</b>{cred.trialAte ? ` · trial até ${cred.trialAte}` : ''}.
          </div>
          <div><label className="label">E-mail de login</label>
            <div style={{ display: 'flex', gap: 8 }}><input className="input" value={cred.ownerEmail} readOnly style={{ flex: 1 }} /><button className="btn btn-sm" onClick={() => copiar(cred.ownerEmail)}>Copiar</button></div>
          </div>
          {cred.senhaProvisoria
            ? <div><label className="label">Senha provisória — anote agora, não será mostrada de novo</label>
                <div style={{ display: 'flex', gap: 8 }}><input className="input" value={cred.senhaProvisoria} readOnly style={{ flex: 1, fontFamily: 'monospace' }} /><button className="btn btn-sm" onClick={() => copiar(cred.senhaProvisoria)}>Copiar</button></div>
              </div>
            : <div className="muted">O e-mail já tinha um usuário no sistema — use a senha atual dele (não geramos uma nova).</div>}
        </div>
      </Modal>}
    </div>
  );
}

function LojaFicha({ loja, onClose, onChange }) {
  const ini = lojaFunilInicial(loja);
  const [tab, setTab] = React.useState('historico');
  const [funilId, setFunilId] = React.useState(ini.funilId);
  const [faseId, setFaseId] = React.useState(ini.faseId);
  const [drawer, setDrawer] = React.useState(null); // 'plano' | 'atividade' | 'agendamento'
  const [novasAtividades, setNovasAtividades] = React.useState([]);
  const [novosAgendamentos, setNovosAgendamentos] = React.useState([]);
  const [subtab, setSubtab] = React.useState('perfil'); // coluna esquerda: perfil | endereco | uso
  const funil = LOJA_FUNIS.find((f) => f.id === funilId) || LOJA_FUNIS[0];
  const TABS = [
    ['historico', 'Histórico', 'history'],
    ['atividades', 'Atividades', 'check'],
    ['assinatura', 'Assinatura', 'wallet'],
    ['arquivos', 'Arquivos', 'contracts'],
    ['agenda', 'Agenda', 'agenda'],
    ['automacao', 'Automação', 'repeat'],
    ['conta', 'Conta', 'shield'],
  ];
  const meses = mesesDesde(loja.start);
  const ltv = loja.status === 'teste' ? 0 : (loja.mrr || 0) * Math.max(1, meses);
  const ultimo = loja.pagamentos[0] || {};

  return (
    <>
    <Drawer title={loja.name} subtitle={`${loja.segmento} · ${loja.cidade}`} onClose={onClose} width="70vw"
      rightHead={<LojaBadge s={loja.status} />}
      belowHead={
        <div className="lf-funilrow">
          <span className="lf-funillabel">Funil</span>
          <select className="input lf-funilsel" value={funilId} onChange={(e) => { const f = LOJA_FUNIS.find((x) => x.id === e.target.value); setFunilId(e.target.value); setFaseId(f.fases[0].id); }}>
            {LOJA_FUNIS.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
          <div style={{ flex: 1, minWidth: 0 }}><PhasePickerStrip phases={funil.fases} currentPhaseId={faseId} onSelect={setFaseId} /></div>
        </div>
      }>
      <LojaFichaStyles />
      <div style={{ display: 'grid', gridTemplateColumns: '432px 1fr', height: '100%', margin: -22 }}>
        {/* ESQUERDA — perfil */}
        <div className="lf-left">
          <div className="lf-avatar" style={{ background: colorFor(loja.name) }}>{initials(loja.name)}</div>
          <div className="lf-name">{loja.name}</div>
          <div className="lf-tags">
            <span className="lf-tag" style={{ background: 'color-mix(in oklab, #0ea5e9 14%, var(--surface))', color: '#0369a1' }}>{loja.plan}</span>
            <span className="lf-tag" style={{ background: 'color-mix(in oklab, #a855f7 16%, var(--surface))', color: '#7e22ce' }}>VIP</span>
            {(loja.status === 'inadimplente' || loja.status === 'cancelada') &&
              <span className="lf-tag" style={{ background: 'color-mix(in oklab, #ef4444 16%, var(--surface))', color: '#b91c1c' }}>Risco de churn</span>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button className="btn btn-save btn-sm" onClick={() => setDrawer('editar')}><Ic name="edit" size={12} /> Editar ficha</button>
          </div>

          <div className="lf-metrics">
            <Metric ic="wallet" cor="#16a34a" label="Total pago (LTV)" val={_fmtBRL(ltv)} />
            <Metric ic="coins" cor="#8b5cf6" label="MRR" val={loja.status === 'teste' ? '—' : _fmtBRL(loja.mrr)} />
            <Metric ic="clock" cor="#0ea5e9" label="Tempo como cliente" val={meses + (meses === 1 ? ' mês' : ' meses')} />
            <Metric ic="agenda" cor="#f59e0b" label="Último pagamento" val={ultimo.mes || '—'} />
          </div>

          {/* sub-abas da coluna esquerda */}
          <div className="lf-subtabs">
            {[['perfil', 'Perfil'], ['endereco', 'Endereço'], ['uso', 'Uso e consumo']].map(([id, label]) => (
              <button key={id} type="button" className={'lf-subtab' + (subtab === id ? ' on' : '')} onClick={() => setSubtab(id)}>{label}</button>
            ))}
            <span className="lf-subtab-bar" style={{ width: (100 / 3) + '%', transform: `translateX(${['perfil', 'endereco', 'uso'].indexOf(subtab) * 100}%)` }} />
          </div>

          <div className="lf-subbody" key={subtab}>
            {subtab === 'perfil' &&
              <div className="col" style={{ gap: 12 }}>
                <div className="lf-resp">
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: colorFor(loja.dono.nomeSocial || loja.dono.nome), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 17, flexShrink: 0 }}>{initials(loja.dono.nomeSocial || loja.dono.nome)}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{loja.dono.nomeSocial || loja.dono.nome}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{loja.dono.nomeSocial && loja.dono.nomeSocial !== loja.dono.nome ? loja.dono.nome + ' · ' : ''}{loja.dono.cargo}</div>
                  </div>
                  <button className="lf-eye" title="Ver todos os dados cadastrais" onClick={() => setDrawer('dados')}><Ic name="eye" size={14} /></button>
                </div>
                <DadoCampo ic="mail" label="E-mail" v={loja.dono.email} />
                <DadoCampo ic="phone" label="Telefone" v={loja.dono.tel} />
                <div className="lf-bloco-grid">
                  <DadoCampo ic="file-text" label="CNPJ" v={loja.cnpj} />
                  <DadoCampo ic="calendar" label="Cliente desde" v={loja.start} />
                </div>
                <button className="btn btn-save btn-sm" style={{ width: '100%' }}><Ic name="chat" size={12} /> Falar com o dono</button>
              </div>}

            {subtab === 'endereco' &&
              <div className="lf-bloco-grid">
                <DadoCampo ic="hash" label="CEP" v={loja.endereco.cep} />
                <DadoCampo ic="flag" label="UF" v={loja.endereco.uf} />
                <DadoCampo ic="map-pin" label="Logradouro" v={loja.endereco.logradouro} full />
                <DadoCampo ic="pin" label="Número" v={loja.endereco.numero} />
                <DadoCampo ic="globe" label="Bairro" v={loja.endereco.bairro} />
                <DadoCampo ic="bank" label="Cidade" v={loja.cidade} full />
              </div>}

            {subtab === 'uso' &&
              <div className="col" style={{ gap: 12 }}>
                <UsoBar label="Usuários" v={loja.usuarios} max={loja.usuariosMax} cor="#0ea5e9" />
                <UsoBar label="Conversas / mês" v={loja.conversas} max={loja.conversasMax} cor="#10b981" />
              </div>}
          </div>
        </div>

        {/* DIREITA — abas de conteúdo */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
          <CRMDetailTabs tabs={TABS} active={tab} onChange={setTab} />
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '22px 24px' }}>
            <div key={tab} className="lf-tabanim">
              {tab === 'historico' && <LojaHistoricoTab loja={loja} />}
              {tab === 'atividades' && <LojaAtividadesTab onNova={() => setDrawer('atividade')} extras={novasAtividades} />}
              {tab === 'assinatura' && <LojaAssinaturaTab loja={loja} onMudarPlano={() => setDrawer('plano')} />}
              {tab === 'arquivos' && <LojaArquivosTab />}
              {tab === 'agenda' && <LojaAgendaTab onNovo={() => setDrawer('agendamento')} extras={novosAgendamentos} />}
              {tab === 'automacao' && <LojaAutomacaoTab />}
              {tab === 'conta' && <LojaContaTab loja={loja} onMudarPlano={() => setDrawer('plano')} onProvisioned={onChange} />}
            </div>
          </div>
        </div>
      </div>
    </Drawer>
    {drawer === 'editar' && <EditarFichaDrawer loja={loja} onClose={() => setDrawer(null)} />}
    {drawer === 'dados' && <CadastroFicha cliente={loja._cliente || {}} onClose={() => setDrawer(null)} />}
    {drawer === 'plano' && <MudarPlanoDrawer loja={loja} onClose={() => setDrawer(null)} />}
    {drawer === 'atividade' && <NovaAtividadeDrawer loja={loja} onClose={() => setDrawer(null)} onSalvar={(a) => { setNovasAtividades((l) => [a, ...l]); setDrawer(null); setTab('atividades'); }} />}
    {drawer === 'agendamento' && <AgendamentoDrawer loja={loja} onClose={() => setDrawer(null)} onAgendar={(a) => { setNovosAgendamentos((l) => [a, ...l]); setDrawer(null); setTab('agenda'); }} />}
    </>
  );
}

function LojaFichaStyles() {
  return <style>{`
    .lf-funilrow { display: flex; align-items: center; gap: 10px; padding: 8px 22px 2px; background: var(--surface); }
    .lf-funillabel { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted); flex-shrink: 0; }
    .lf-funilsel { height: 30px; width: 200px; font-size: 12px; flex-shrink: 0; }
    .lf-left { border-right: 1px solid var(--border); overflow: hidden; padding: 16px 16px; display: flex; flex-direction: column; gap: 10px; background: var(--surface); }
    .lf-avatar { width: 72px; height: 72px; aspect-ratio: 1; flex-shrink: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 26px; margin: 0 auto; }
    .lf-subtabs { display: flex; border-bottom: 1px solid var(--border); position: relative; }
    .lf-subtab { flex: 1; padding: 9px 4px; background: none; border: none; cursor: pointer; font: inherit; font-size: 12px; font-weight: 500; color: var(--text-muted); transition: color .2s; }
    .lf-subtab.on { color: var(--accent); font-weight: 600; }
    .lf-subtab-bar { position: absolute; bottom: -1px; left: 0; height: 2px; background: var(--accent); border-radius: 2px; transition: transform .28s cubic-bezier(.5,1.25,.4,1); pointer-events: none; }
    .lf-subbody { padding-top: 8px; animation: lfSlideIn .26s cubic-bezier(.4,0,.2,1); }
    .lf-tabanim { animation: lfSlideIn .26s cubic-bezier(.4,0,.2,1); }
    @keyframes lfSlideIn { from { opacity: 0; transform: translateX(18px); } to { opacity: 1; transform: translateX(0); } }
    .lf-bloco-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .lf-resp { display: flex; align-items: flex-start; gap: 12px; }
    .lf-eye { flex-shrink: 0; width: 30px; height: 30px; border-radius: 8px; border: 1px solid color-mix(in oklab, var(--accent) 28%, transparent); background: color-mix(in oklab, var(--accent) 13%, var(--surface)); color: var(--accent-700); display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; transition: background .15s; }
    .lf-eye:hover { background: color-mix(in oklab, var(--accent) 22%, var(--surface)); }
    .lf-eye:hover svg { animation: lfBlink 1.3s ease-in-out infinite; }
    @keyframes lfBlink { 0%, 86%, 100% { transform: scaleY(1); } 93% { transform: scaleY(0.12); } }
    .lf-name { text-align: center; font-weight: 800; font-size: 17px; }
    .lf-tags { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
    .lf-tag { font-size: 10px; font-weight: 800; padding: 3px 9px; border-radius: 999px; text-transform: uppercase; letter-spacing: .03em; }
    .lf-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .lf-metric { border: 1px solid var(--border); border-radius: 10px; padding: 9px 10px; background: var(--surface); }
    .lf-metric-top { display: flex; align-items: center; gap: 6px; }
    .lf-metric-ic { width: 22px; height: 22px; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .lf-metric-l { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .02em; line-height: 1.15; }
    .lf-metric-v { font-weight: 800; font-size: 15px; margin-top: 6px; letter-spacing: -.01em; }
    .lf-th { font-weight: 700; font-size: 16px; margin-bottom: 12px; }
    .lf-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); }
    .lf-card { padding: 12px 14px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); }
    .lf-check { width: 18px; height: 18px; border-radius: 5px; border: 1.5px solid var(--border-strong); display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; }
    .lf-check.on { background: var(--accent); border-color: var(--accent); }
    .lf-ext { font-size: 9px; font-weight: 800; color: #b91c1c; background: color-mix(in oklab, #ef4444 12%, var(--surface)); border-radius: 5px; padding: 4px 6px; flex-shrink: 0; }
    .lf-cal { width: 28px; height: 28px; border-radius: 7px; display: flex; align-items: center; justify-content: center; background: var(--accent-soft); color: var(--accent-700); flex-shrink: 0; }
    .lf-switch { width: 38px; height: 22px; border-radius: 999px; background: var(--border-strong); position: relative; flex-shrink: 0; transition: background .2s; }
    .lf-switch.on { background: var(--accent); }
    .lf-knob { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: left .2s; }
    .lf-switch.on .lf-knob { left: 18px; }
  `}</style>;
}

// Tabela de lojas reutilizável (Clientes/Lojas e detalhe do plano).
// colunas: 'loja' | 'plano' | 'status' | 'valor' | 'desde' | 'acoes'
function LojasTabela({ lojas, onRow, colunas = ['loja', 'plano', 'status', 'valor', 'acoes'], skeletonRows = 0 }) {
  const [menuId, setMenuId] = React.useState(null);
  const has = (c) => colunas.includes(c);
  return (
    <div className="card" style={{ overflow: 'visible' }}>
      <table className="table">
        <thead><tr>
          {has('loja') && <th>Loja</th>}
          {has('plano') && <th>Plano</th>}
          {has('status') && <th>Status</th>}
          {has('valor') && <th style={{ textAlign: 'right' }}>Valor mensal</th>}
          {has('desde') && <th>Cliente desde</th>}
          {has('acoes') && <th style={{ width: 48 }}></th>}
        </tr></thead>
        <tbody>
          {skeletonRows > 0 && Array.from({ length: skeletonRows }).map((_, i) => (
            <tr key={'sk' + i}>
              {has('loja') && <td><div className="row" style={{ gap: 10 }}><Skeleton circle w={32} h={32} /><div style={{ minWidth: 0 }}><Skeleton w={120} h={14} /><Skeleton w={90} h={11} style={{ marginTop: 4 }} /></div></div></td>}
              {has('plano') && <td><Skeleton w={56} h={20} r={10} /></td>}
              {has('status') && <td><Skeleton w={64} h={20} r={10} /></td>}
              {has('valor') && <td style={{ textAlign: 'right' }}><Skeleton w={70} h={14} style={{ marginLeft: 'auto' }} /></td>}
              {has('desde') && <td><Skeleton w={80} h={12} /></td>}
              {has('acoes') && <td style={{ textAlign: 'right' }}><Skeleton w={24} h={24} r={6} style={{ marginLeft: 'auto' }} /></td>}
            </tr>
          ))}
          {skeletonRows === 0 && lojas.map((l) => (
            <tr key={l.id} style={{ cursor: 'default' }} onClick={() => onRow && onRow(l)}>
              {has('loja') && <td><div className="row" style={{ gap: 10 }}><div className="avatar avatar-sm" style={{ background: colorFor(l.name) }}>{initials(l.name)}</div><div style={{ minWidth: 0 }}><div style={{ fontWeight: 600 }}>{l.name}</div><div className="muted" style={{ fontSize: 11 }}>{l.segmento} · {l.cidade}</div></div></div></td>}
              {has('plano') && <td><span className="chip">{l.plan}</span></td>}
              {has('status') && <td><LojaBadge s={l.status} /></td>}
              {has('valor') && <td className="tnum" style={{ textAlign: 'right', fontWeight: 700 }}>{l.status === 'teste' ? '—' : _fmtBRL(l.mrr)}</td>}
              {has('desde') && <td className="muted" style={{ fontSize: 'var(--type-sm)' }}>{l.start}</td>}
              {has('acoes') && <td style={{ textAlign: 'right', position: 'relative' }} onClick={(e) => e.stopPropagation()}><button className="btn btn-ghost btn-icon" title="Ações" onClick={() => setMenuId(menuId === l.id ? null : l.id)}><Ic name="more-vert" size={16} /></button>{menuId === l.id && <LojaAcoesMenu loja={l} onClose={() => setMenuId(null)} />}</td>}
            </tr>
          ))}
          {skeletonRows === 0 && lojas.length === 0 &&
            <tr><td colSpan={colunas.length}><div style={{ padding: 30, textAlign: 'center' }}><div style={{ fontWeight: 600 }}>Nenhuma loja encontrada</div><div className="muted" style={{ fontSize: 'var(--type-sm)' }}>Ajuste os filtros.</div></div></td></tr>}
        </tbody>
      </table>
    </div>);
}

// ── Nova ficha de cliente (loja) — modelo do "Nova ficha de cliente" do Admin, adaptado p/ loja ──
function NovaLojaToggle({ value, onChange }) {
  const isPJ = value === 'pj';
  return (
    <div className={'cli-seg' + (isPJ ? ' is-pj' : '')}>
      <span className="cli-seg-pill" aria-hidden="true" />
      <button className={!isPJ ? 'on' : ''} onClick={() => onChange('pf')}><Ic name="user" size={15} /> Pessoa Física</button>
      <button className={isPJ ? 'on' : ''} onClick={() => onChange('pj')}><Ic name="building" size={15} /> Pessoa Jurídica</button>
    </div>);
}
function NovaLojaDrawer({ onClose, onSaved, initial }) {
  const SEG = { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro', platina: 'Platina', diamante: 'Diamante' };
  const ATEND = ['Karla Zambelly', 'Magno Vieira', 'Paulo Henrique', 'Francisco Junior', 'Agente IA'];
  const isEdit = !!initial;
  const [f, setF] = React.useState(() => {
    const base = {
      tipo: 'pf',
      name: '', nomeSocial: '', cpf: '', rg: '', birth: '',
      razao: '', fantasia: '', cnpj: '', ie: '',
      phone: '', email: '',
      respName: '', respRole: 'Sócio', respCpf: '', respEmail: '', respPhone: '',
      cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
      subdomain: '', plan: '', status: 'ativa', planoId: '',
      source: 'Instagram', segment: 'bronze', attendant: 'Karla Zambelly', obs: ''
    };
    if (!initial) return base;
    return {
      ...base,
      tipo: initial.tipo || 'pf',
      name: initial.name || '', nomeSocial: initial.nomeSocial || '', cpf: initial.cpf || '', rg: initial.rg || '', birth: initial.birth || '',
      razao: initial.razao || '', fantasia: initial.fantasia || '', cnpj: initial.cnpj || '', ie: initial.ie || '',
      phone: initial.phone || '', email: initial.email || '',
      respName: initial.respName || '', respRole: initial.respRole || 'Sócio', respCpf: initial.respCpf || '', respEmail: initial.respEmail || '', respPhone: initial.respPhone || '',
      cep: initial.cep || '', logradouro: initial.logradouro || '', numero: initial.numero || '', complemento: initial.complemento || '', bairro: initial.bairro || '', cidade: initial.cidade || '', uf: initial.uf || '',
      subdomain: initial.subdominio || '', plan: initial.plano || '', status: initial.statusLoja || 'ativa', planoId: initial.planoId || '',
      source: initial.source || 'Instagram', segment: initial.segment || 'bronze', attendant: initial.attendant || 'Karla Zambelly', obs: initial.obs || ''
    };
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const [planosList, setPlanosList] = React.useState([]);
  React.useEffect(() => { API.getPlanos().then((r) => setPlanosList(r.planos || [])).catch(() => {}); }, []);
  const isPJ = f.tipo === 'pj';
  const nome = isPJ ? f.razao : f.name;
  const doc = isPJ ? f.cnpj : f.cpf;
  const displayName = isPJ ? (f.fantasia || f.razao) : f.name;
  const [saving, setSaving] = React.useState(false);
  const salvar = async (close) => {
    const aviso = (titulo, descricao) => window.showToast({ tipo: 'aviso', titulo, descricao, duracao: 4000 });
    if (!nome.trim()) return aviso(isPJ ? 'Razão social obrigatória' : 'Nome obrigatório', isPJ ? 'Informe a razão social da loja.' : 'Informe o nome do cliente.');
    if (!doc.trim()) return aviso(isPJ ? 'CNPJ obrigatório' : 'CPF obrigatório', 'Preencha o documento.');
    if (!f.email.trim()) return aviso('E-mail obrigatório', isPJ ? 'Informe o e-mail comercial.' : 'Informe o e-mail.');
    if (isPJ && !f.respName.trim()) return aviso('Nome do responsável obrigatório', 'Informe o nome completo do responsável.');
    if (isPJ && !f.nomeSocial.trim()) return aviso('Nome social obrigatório', 'Informe o nome social do responsável.');
    if (saving) return;
    setSaving(true);
    try {
      if (isEdit) await API.updatePlataformaCliente(initial.id, f);
      else await API.createPlataformaCliente(f);
      close(() => {
        window.showToast({ tipo: 'sucesso', titulo: isEdit ? 'Cliente atualizado' : 'Cliente criado', descricao: `${displayName || 'Cliente'} foi ${isEdit ? 'atualizado' : 'cadastrado'} na plataforma.`, duracao: 4000 });
        onSaved && onSaved();
      });
    } catch (e) {
      setSaving(false);
      const msg = (e && e.status === 403)
        ? 'Acesso restrito ao Super Admin — entre com a conta de super admin.'
        : ((e && e.data && e.data.error) || (e && e.message) || 'Tente novamente.');
      window.showToast({ tipo: 'erro', titulo: isEdit ? 'Erro ao salvar' : 'Erro ao criar cliente', descricao: msg, duracao: 5000 });
    }
  };
  return (
    <Drawer title={isEdit ? 'Editar cadastro' : 'Nova ficha de cliente'} subtitle={isEdit ? 'Edite os dados do cliente da plataforma.' : 'Cadastre uma loja (cliente da plataforma). Campos com * são obrigatórios.'} onClose={onClose} width={760}
      footer={(close) => <>
        <div style={{ flex: 1 }} />
        <ActionButton action="voltar" size="md" onClick={() => close()} />
        <ActionButton action="salvar" size="md" label={saving ? 'Salvando…' : (isEdit ? 'Salvar alterações' : 'Criar cliente')} efeito={false} disabled={saving} onClick={() => salvar(close)} />
      </>}>
      <div className="tpc-flat">
      <style>{`
        .nl-typebar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 2px 14px; flex-wrap: wrap; }
        .cli-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .cli-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
        .cli-grid-cep { display: grid; grid-template-columns: 150px 1fr 110px; gap: 10px; }
        .cli-grid-city { display: grid; grid-template-columns: 1fr 110px; gap: 10px; }
        @media (max-width: 640px) { .cli-grid-2, .cli-grid-3, .cli-grid-cep, .cli-grid-city { grid-template-columns: 1fr !important; } }
        .cli-seg { position: relative; display: grid; grid-template-columns: 1fr 1fr; background: var(--surface-3); border-radius: 9px; padding: 3px; }
        .cli-seg-pill { position: absolute; top: 3px; bottom: 3px; left: 3px; width: calc(50% - 3px); border-radius: 7px; background: var(--surface); box-shadow: var(--shadow-sm); transition: transform .3s cubic-bezier(.4,0,.2,1); pointer-events: none; z-index: 0; }
        .cli-seg.is-pj .cli-seg-pill { transform: translateX(100%); }
        .cli-seg button { position: relative; z-index: 1; border: none; background: none; padding: 8px 16px; border-radius: 7px; font: inherit; font-size: var(--type-sm); font-weight: 600; color: var(--text-muted); cursor: pointer; transition: color .2s ease; display: inline-flex; align-items: center; justify-content: center; gap: 7px; white-space: nowrap; }
        .cli-seg button.on { color: var(--text); }
        .nl-sub { display: flex; align-items: stretch; }
        .nl-sub .input { border-top-right-radius: 0; border-bottom-right-radius: 0; }
        .nl-sub-suffix { display: flex; align-items: center; padding: 0 12px; border: 1px solid var(--border); border-left: none; border-top-right-radius: 8px; border-bottom-right-radius: 8px; background: var(--surface-2); color: var(--text-muted); font-size: var(--type-sm); white-space: nowrap; }
      `}</style>

      <div className="nl-typebar">
        <span style={{ fontSize: 'var(--type-sm)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Tipo de cadastro</span>
        <NovaLojaToggle value={f.tipo} onChange={(v) => set('tipo', v)} />
      </div>

      {!isPJ ? (
      <>
      <div className="fin-section-title">Dados pessoais</div>
      <div className="fin-section"><div className="col" style={{ gap: 10 }}>
        <div className="cli-grid-2">
          <div><label className="label">Nome completo *</label><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex: Mariana Sousa" /></div>
          <div><label className="label">Data de nascimento</label><DateInput value={f.birth} onChange={(v) => set('birth', v)} /></div>
        </div>
        <div><label className="label">Nome social</label><input className="input" value={f.nomeSocial} onChange={(e) => set('nomeSocial', e.target.value)} placeholder="Nome curto de exibição (ex.: Mari)" /></div>
        <div className="cli-grid-2">
          <div><label className="label">CPF *</label><CpfInput value={f.cpf} onChange={(v) => set('cpf', v)} /></div>
          <div><label className="label">RG</label><input className="input" value={f.rg} onChange={(e) => set('rg', e.target.value)} placeholder="00.000.000-0" /></div>
        </div>
        <div className="cli-grid-2">
          <div><label className="label">Telefone</label><PhoneInput value={f.phone} onChange={(v) => set('phone', v)} /></div>
          <div><label className="label">E-mail *</label><EmailInput value={f.email} onChange={(v) => set('email', v)} /></div>
        </div>
      </div></div>
      </>
      ) : (
      <>
      <div className="fin-section-title">Dados da empresa</div>
      <div className="fin-section"><div className="col" style={{ gap: 10 }}>
        <div className="cli-grid-2">
          <div><label className="label">Razão social *</label><input className="input" value={f.razao} onChange={(e) => set('razao', e.target.value)} placeholder="Ex: Bella Pele Cosméticos LTDA" /></div>
          <div><label className="label">Nome fantasia</label><input className="input" value={f.fantasia} onChange={(e) => set('fantasia', e.target.value)} placeholder="Ex: Bella Pele" /></div>
        </div>
        <div className="cli-grid-2">
          <div><label className="label">CNPJ *</label><CnpjInput value={f.cnpj} onChange={(v) => set('cnpj', v)} /></div>
          <div><label className="label">Inscrição estadual</label><input className="input" value={f.ie} onChange={(e) => set('ie', e.target.value)} placeholder="Isento / número" /></div>
        </div>
        <div className="cli-grid-2">
          <div><label className="label">Telefone comercial</label><PhoneInput value={f.phone} onChange={(v) => set('phone', v)} /></div>
          <div><label className="label">E-mail comercial *</label><EmailInput value={f.email} onChange={(v) => set('email', v)} /></div>
        </div>
      </div></div>
      <div className="fin-section-title">Responsável</div>
      <div className="fin-section"><div className="col" style={{ gap: 10 }}>
        <div className="cli-grid-2">
          <div><label className="label">Nome completo *</label><input className="input" value={f.respName} onChange={(e) => set('respName', e.target.value)} placeholder="Ex: João Pereira" /></div>
          <div><label className="label">Nome social *</label><input className="input" value={f.nomeSocial} onChange={(e) => set('nomeSocial', e.target.value)} placeholder="Nome curto (ex.: João)" /></div>
        </div>
        <div className="cli-grid-3">
          <div><label className="label">Cargo</label><select className="input" value={f.respRole} onChange={(e) => set('respRole', e.target.value)}><option>Sócio</option><option>Diretor</option><option>Gerente</option><option>Comprador</option><option>Marketing</option><option>Outro</option></select></div>
          <div><label className="label">CPF</label><CpfInput value={f.respCpf} onChange={(v) => set('respCpf', v)} /></div>
          <div><label className="label">Telefone</label><PhoneInput value={f.respPhone} onChange={(v) => set('respPhone', v)} /></div>
        </div>
        <div><label className="label">E-mail</label><EmailInput value={f.respEmail} onChange={(v) => set('respEmail', v)} /></div>
      </div></div>
      </>
      )}

      <div className="fin-section-title">Endereço</div>
      <div className="fin-section"><div className="col" style={{ gap: 10 }}>
        <div className="cli-grid-cep">
          <div><label className="label">CEP</label><CepInput value={f.cep} onChange={(v) => set('cep', v)} onResolve={(r) => { set('logradouro', r.logradouro || ''); set('bairro', r.bairro || ''); set('cidade', r.cidade || ''); set('uf', r.uf || ''); }} /></div>
          <div><label className="label">Logradouro</label><input className="input" value={f.logradouro} onChange={(e) => set('logradouro', e.target.value)} placeholder="Rua / Avenida" /></div>
          <div><label className="label">Número</label><input className="input" value={f.numero} onChange={(e) => set('numero', e.target.value)} placeholder="Nº" /></div>
        </div>
        <div className="cli-grid-2">
          <div><label className="label">Complemento</label><input className="input" value={f.complemento} onChange={(e) => set('complemento', e.target.value)} placeholder="Sala, bloco, andar..." /></div>
          <div><label className="label">Bairro</label><input className="input" value={f.bairro} onChange={(e) => set('bairro', e.target.value)} /></div>
        </div>
        <div className="cli-grid-city">
          <div><label className="label">Cidade</label><input className="input" value={f.cidade} onChange={(e) => set('cidade', e.target.value)} placeholder="Ex: Fortaleza" /></div>
          <div><label className="label">UF</label><UFSelect value={f.uf} onChange={(v) => set('uf', v)} /></div>
        </div>
      </div></div>

      <div className="fin-section-title">Informações comerciais</div>
      <div className="fin-section"><div className="col" style={{ gap: 10 }}>
        <div className="cli-grid-3">
          <div><label className="label">Origem</label><select className="input" value={f.source} onChange={(e) => set('source', e.target.value)}><option>Instagram</option><option>WhatsApp</option><option>Facebook</option><option>Google</option><option>Indicação</option><option>Site</option></select></div>
          <div><label className="label">Segmento</label><select className="input" value={f.segment} onChange={(e) => set('segment', e.target.value)}>{Object.entries(SEG).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div>
          <div><label className="label">Atendente</label><select className="input" value={f.attendant} onChange={(e) => set('attendant', e.target.value)}>{ATEND.map((a) => <option key={a} value={a}>{a}</option>)}</select></div>
        </div>
        <div><label className="label">Observações</label><textarea className="input" rows={3} value={f.obs} onChange={(e) => set('obs', e.target.value)} placeholder="Preferências, histórico, anotações..." /></div>
      </div></div>

      <div className="fin-section-title">Dados da plataforma</div>
      <div className="fin-section"><div className="col" style={{ gap: 10 }}>
        <div><label className="label">Plano</label>
          <select className="input" value={f.planoId} onChange={(e) => { const p = planosList.find((x) => x.id === e.target.value); set('planoId', e.target.value); set('plan', p ? p.name : ''); }}>
            <option value="">Sem plano definido</option>
            {planosList.map((p) => <option key={p.id} value={p.id}>{p.name} — {formatBRL(p.price)}/{p.ciclo === 'anual' ? 'ano' : 'mês'}</option>)}
          </select>
        </div>
      </div></div>

      </div>
    </Drawer>);
}

// ── Ficha de detalhe (read-only) de um cadastro da plataforma ──
function FichaCampo({ label, value, full }) {
  return (
    <div style={{ minWidth: 0, gridColumn: full ? '1 / -1' : 'auto' }}>
      <div style={{ fontSize: 'var(--type-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 'var(--type-sm)', color: 'var(--text)', wordBreak: 'break-word' }}>{value || '—'}</div>
    </div>);
}
function CadastroFicha({ cliente, onClose, onEdit, onDeleted }) {
  const c = cliente;
  const isPJ = c.tipo === 'pj';
  const [confirmDel, setConfirmDel] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 };
  const excluir = (close) => {
    if (deleting) return;
    setDeleting(true);
    API.deletePlataformaCliente(c.id)
      .then(() => close(() => {
        window.showToast({ tipo: 'sucesso', titulo: 'Cadastro excluído', descricao: `${c.name} foi removido da plataforma.`, duracao: 4000 });
        onDeleted && onDeleted();
      }))
      .catch((e) => {
        setDeleting(false);
        const msg = (e && e.status === 403) ? 'Acesso restrito ao Super Admin.' : ((e && e.data && e.data.error) || (e && e.message) || 'Tente novamente.');
        window.showToast({ tipo: 'erro', titulo: 'Erro ao excluir', descricao: msg, duracao: 5000 });
      });
  };
  return (
    <Drawer
      title={c.name} subtitle={`${isPJ ? 'Pessoa Jurídica' : 'Pessoa Física'} · cadastrado em ${c.date || '—'}`}
      onClose={onClose} width={680}
      leftHead={<div style={{ width: 42, height: 42, borderRadius: 10, background: colorFor(c.name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>{initials(c.name)}</div>}
      footer={(close) => confirmDel ? (
        <>
          <span style={{ fontSize: 'var(--type-sm)', color: 'var(--text-muted)', flex: 1 }}>Excluir este cadastro? Não dá pra desfazer.</span>
          <ActionButton action="voltar" size="md" label="Cancelar" onClick={() => setConfirmDel(false)} />
          <ActionButton action="excluir" size="md" label={deleting ? 'Excluindo…' : 'Excluir'} disabled={deleting} onClick={() => excluir(close)} />
        </>
      ) : (
        <>
          {onDeleted && <ActionButton action="excluir" size="md" onClick={() => setConfirmDel(true)} />}
          <div style={{ flex: 1 }} />
          <ActionButton action="voltar" size="md" label={(onEdit || onDeleted) ? 'Voltar' : 'Fechar'} onClick={() => close()} />
          {onEdit && <ActionButton action="editar" size="md" onClick={() => close(() => onEdit && onEdit(c))} />}
        </>
      )}>
      <div className="tpc-flat">
        {!isPJ ? (
          <>
            <div className="fin-section-title">Dados pessoais</div>
            <div className="fin-section"><div style={grid2}>
              <FichaCampo label="Nome completo" value={c.name} />
              <FichaCampo label="Nome social" value={c.nomeSocial} />
              <FichaCampo label="Data de nascimento" value={c.birth} />
              <FichaCampo label="CPF" value={c.cpf} />
              <FichaCampo label="RG" value={c.rg} />
              <FichaCampo label="Telefone" value={c.phone} />
              <FichaCampo label="E-mail" value={c.email} />
            </div></div>
          </>
        ) : (
          <>
            <div className="fin-section-title">Dados da empresa</div>
            <div className="fin-section"><div style={grid2}>
              <FichaCampo label="Razão social" value={c.razao} />
              <FichaCampo label="Nome fantasia" value={c.fantasia} />
              <FichaCampo label="CNPJ" value={c.cnpj} />
              <FichaCampo label="Inscrição estadual" value={c.ie} />
              <FichaCampo label="Telefone comercial" value={c.phone} />
              <FichaCampo label="E-mail comercial" value={c.email} />
            </div></div>
            <div className="fin-section-title">Responsável</div>
            <div className="fin-section"><div style={grid2}>
              <FichaCampo label="Nome completo" value={c.respName} />
              <FichaCampo label="Nome social" value={c.nomeSocial} />
              <FichaCampo label="Cargo" value={c.respRole} />
              <FichaCampo label="CPF" value={c.respCpf} />
              <FichaCampo label="Telefone" value={c.respPhone} />
              <FichaCampo label="E-mail" value={c.respEmail} />
            </div></div>
          </>
        )}
        <div className="fin-section-title">Endereço</div>
        <div className="fin-section"><div style={grid2}>
          <FichaCampo label="CEP" value={c.cep} />
          <FichaCampo label="Logradouro" value={c.logradouro ? (c.logradouro + (c.numero ? ', ' + c.numero : '')) : ''} />
          <FichaCampo label="Bairro" value={c.bairro} />
          <FichaCampo label="Complemento" value={c.complemento} />
          <FichaCampo label="Cidade" value={c.cidade ? (c.cidade + (c.uf ? '-' + c.uf : '')) : ''} />
        </div></div>
        <div className="fin-section-title">Informações comerciais</div>
        <div className="fin-section"><div style={grid2}>
          <FichaCampo label="Origem" value={c.source} />
          <FichaCampo label="Segmento" value={c.segment} />
          <FichaCampo label="Atendente" value={c.attendant} />
          <FichaCampo label="Observações" value={c.obs} full />
        </div></div>
        <div className="fin-section-title">Dados da plataforma</div>
        <div className="fin-section"><div style={grid2}>
          <FichaCampo label="Plano" value={c.plano ? (c.plano + (c.planoPreco != null ? ' — ' + formatBRL(c.planoPreco) : '')) : ''} />
          {c.subdominio && <FichaCampo label="Subdomínio" value={c.subdominio} />}
          {c.statusLoja && <FichaCampo label="Status" value={c.statusLoja} />}
        </div></div>
      </div>
    </Drawer>);
}

// Mapeia um cadastro (plataforma_clientes) p/ o shape de "loja" que a LojaFicha (6 abas)
// espera — dados reais onde dá + defaults seguros pras partes ainda mock (uso/pagamentos).
function clienteParaLoja(c) {
  const isPJ = c.tipo === 'pj';
  return {
    id: c.id,
    name: c.name,
    plan: c.plano || '—',
    mrr: c.planoPreco || 0,
    status: 'ativa',
    start: c.date || '',
    renew: '',
    dono: { nome: c.respName || c.name || '', nomeSocial: c.nomeSocial || '', email: c.respEmail || c.email || '', tel: c.respPhone || c.phone || '', cargo: c.respRole || (isPJ ? 'Responsável' : 'Titular') },
    segmento: c.segment || '—',
    cidade: c.cidade ? (c.cidade + (c.uf ? '-' + c.uf : '')) : '—',
    cnpj: c.doc || '',
    origem: c.source || '',
    endereco: { cep: c.cep || '', logradouro: c.logradouro || '', numero: c.numero || '', bairro: c.bairro || '', uf: c.uf || '' },
    usuarios: 0, usuariosMax: 5,
    conversas: 0, conversasMax: 2000,
    planoHist: c.plano ? [{ ev: 'Plano atual', plano: c.plano, de: 'desde ' + (c.date || '') }] : [],
    pagamentos: [],
    _cliente: c,
  };
}

function SuperTenants() {
  const [clientes, setClientes] = React.useState(null); // null = carregando
  const [erro, setErro] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [tipoFilter, setTipoFilter] = React.useState('todos');
  const [editing, setEditing] = React.useState(null);   // 'new' | cliente | null
  const [hub, setHub] = React.useState(null);           // loja (ficha 6 abas) aberta — clique na linha
  const [viewing, setViewing] = React.useState(null);   // cliente em LEITURA (CadastroFicha) — ícone Ver
  const [deleting, setDeleting] = React.useState(null); // cliente a apagar (confirmação)
  const [delBusy, setDelBusy] = React.useState(false);

  const reload = React.useCallback(() => {
    setClientes(null); setErro('');
    API.getPlataformaClientes()
      .then((r) => setClientes(r.clientes || []))
      .catch((e) => { setClientes([]); setErro(e && e.status === 403 ? '403' : 'erro'); });
  }, []);
  React.useEffect(() => { reload(); }, [reload]);

  const confirmarApagar = () => {
    if (!deleting || delBusy) return;
    setDelBusy(true);
    API.deletePlataformaCliente(deleting.id)
      .then(() => { window.showToast({ tipo: 'sucesso', titulo: 'Cadastro excluído', descricao: `${deleting.name} foi removido da plataforma.`, duracao: 4000 }); setDeleting(null); reload(); })
      .catch((e) => { const msg = (e && e.status === 403) ? 'Acesso restrito ao Super Admin.' : ((e && e.data && e.data.error) || (e && e.message) || 'Tente novamente.'); window.showToast({ tipo: 'erro', titulo: 'Erro ao excluir', descricao: msg, duracao: 5000 }); })
      .finally(() => setDelBusy(false));
  };

  const loading = clientes === null;
  const lista = clientes || [];
  const norm = (s) => (s || '').toLowerCase();
  const filtered = lista.filter((c) =>
    (!search || norm(c.name).includes(norm(search)) || norm(c.email).includes(norm(search)) || norm(c.cidade).includes(norm(search))) &&
    (tipoFilter === 'todos' || c.tipo === tipoFilter)
  );
  React.useEffect(() => { if (!loading) skelRemember('super-lojas', filtered.length); });

  const mesAtual = lista.filter((c) => { const x = new Date(c.createdAt); const n = new Date(); return !isNaN(x) && x.getMonth() === n.getMonth() && x.getFullYear() === n.getFullYear(); }).length;
  const kpis = { total: lista.length, pf: lista.filter((c) => c.tipo === 'pf').length, pj: lista.filter((c) => c.tipo === 'pj').length, mes: mesAtual };
  const localCidade = (c) => c.cidade ? (c.cidade + (c.uf ? '-' + c.uf : '')) : '';

  return (
    <Page title="Clientes / Lojas" subtitle="Cadastros de clientes da plataforma" actions={<FabNovo size="md" label="Novo cliente" onClick={() => setEditing('new')} />}>
      <SuperTenantsStyles />

      {/* 4 cards de resumo */}
      <div className="lj-summary">
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="lj-sum-card">
            <Skeleton w={38} h={38} r={10} />
            <div><Skeleton w={80} h={11} /><Skeleton w={60} h={20} style={{ marginTop: 6 }} /></div>
          </div>
        )) : <>
        <SumCard ic="building" cor="#0ea5e9" label="Total de cadastros"   val={kpis.total.toLocaleString('pt-BR')} />
        <SumCard ic="user"     cor="#10b981" label="Pessoa Física"        val={kpis.pf.toLocaleString('pt-BR')} />
        <SumCard ic="building" cor="#8b5cf6" label="Pessoa Jurídica"       val={kpis.pj.toLocaleString('pt-BR')} />
        <SumCard ic="check"    cor="#f59e0b" label="Cadastrados no mês"    val={kpis.mes.toLocaleString('pt-BR')} />
        </>}
      </div>

      {/* filtros */}
      <div className="card" style={{ padding: 12 }}>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 340, display: 'flex', alignItems: 'center' }}>
            <Ic name="search" size={13} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
            <input className="input" placeholder="Buscar por nome, e-mail, cidade..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 38, width: '100%' }} />
          </div>
          <select className="input" style={{ width: 180 }} value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value)}>
            <option value="todos">Todos os tipos</option>
            <option value="pf">Pessoa Física</option>
            <option value="pj">Pessoa Jurídica</option>
          </select>
          <div className="spacer" />
          <span className="muted" style={{ fontSize: 'var(--type-sm)' }}>{filtered.length} cadastro{filtered.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      {/* tabela de cadastros */}
      <div className="card" style={{ overflow: 'visible' }}>
        <table className="table">
          <thead><tr><th>Cliente</th><th>Tipo</th><th>Documento</th><th>Contato</th><th>Cadastrado em</th><th style={{ width: 116 }}></th></tr></thead>
          <tbody>
            {loading && Array.from({ length: skelCount('super-lojas') }).map((_, i) => (
              <tr key={'sk' + i}>
                <td><div className="row" style={{ gap: 10 }}><Skeleton circle w={32} h={32} /><div><Skeleton w={120} h={14} /><Skeleton w={90} h={11} style={{ marginTop: 4 }} /></div></div></td>
                <td><Skeleton w={90} h={20} r={10} /></td>
                <td><Skeleton w={120} h={12} /></td>
                <td><Skeleton w={140} h={12} /></td>
                <td><Skeleton w={80} h={12} /></td>
                <td style={{ textAlign: 'right' }}><Skeleton w={92} h={26} r={6} style={{ marginLeft: 'auto' }} /></td>
              </tr>
            ))}
            {!loading && filtered.map((c) => (
              <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setHub(clienteParaLoja(c))}>
                <td><div className="row" style={{ gap: 10 }}><div className="avatar avatar-sm" style={{ background: colorFor(c.name) }}>{initials(c.name)}</div><div style={{ minWidth: 0 }}><div style={{ fontWeight: 600 }}>{c.name}</div><div className="muted" style={{ fontSize: 11 }}>{[c.segment, localCidade(c)].filter(Boolean).join(' · ') || '—'}</div></div></div></td>
                <td><span className="chip">{c.tipo === 'pj' ? 'Pessoa Jurídica' : 'Pessoa Física'}</span></td>
                <td className="tnum muted" style={{ fontSize: 'var(--type-sm)' }}>{c.doc || '—'}</td>
                <td className="muted" style={{ fontSize: 'var(--type-sm)' }}>{c.email || c.phone || '—'}</td>
                <td className="muted" style={{ fontSize: 'var(--type-sm)' }}>{c.date || '—'}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                  <button className="btn btn-sm btn-icon" title="Ver cadastro" onClick={() => setViewing(c)}><Ic name="eye" size={14} /></button>
                  <button className="btn btn-sm btn-icon" title="Editar cadastro" style={{ color: '#165EEE' }} onClick={() => setEditing(c)}><Ic name="edit" size={14} /></button>
                  <button className="btn btn-sm btn-icon" title="Apagar cadastro" style={{ color: '#dc2626' }} onClick={() => setDeleting(c)}><Ic name="trash" size={14} /></button>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6}><div style={{ padding: 30, textAlign: 'center' }}>
                {erro === '403'
                  ? <><div style={{ fontWeight: 600 }}>Acesso restrito ao Super Admin</div><div className="muted" style={{ fontSize: 'var(--type-sm)' }}>Entre com a conta de super admin (scalloop.io) para ver os cadastros.</div></>
                  : erro
                  ? <><div style={{ fontWeight: 600 }}>Não foi possível carregar</div><div className="muted" style={{ fontSize: 'var(--type-sm)' }}>Tente recarregar a página.</div></>
                  : <><div style={{ fontWeight: 600 }}>Nenhum cadastro ainda</div><div className="muted" style={{ fontSize: 'var(--type-sm)' }}>Clique em "Novo cliente" para cadastrar a primeira loja.</div></>}
              </div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {hub && <LojaFicha loja={hub} onClose={() => setHub(null)} onChange={reload} />}
      {viewing && <CadastroFicha cliente={viewing} onClose={() => setViewing(null)} />}
      {editing && <NovaLojaDrawer initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={reload} />}
      {deleting && <Modal title="Apagar cadastro" size="sm" onClose={() => setDeleting(null)}
        footer={<><div style={{ flex: 1 }} /><ActionButton action="voltar" size="md" label="Cancelar" onClick={() => setDeleting(null)} /><ActionButton action="excluir" size="md" label={delBusy ? 'Apagando…' : 'Apagar'} disabled={delBusy} onClick={confirmarApagar} /></>}>
        <div style={{ fontSize: 'var(--type-sm)' }}>Apagar o cadastro de <b>{deleting.name}</b>? Essa ação não pode ser desfeita.</div>
      </Modal>}
    </Page>
  );
}

function SuperTenantsStyles() {
  return <style>{`
    .lj-summary { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; margin-bottom: 10px; }
    @media (max-width: 900px) { .lj-summary { grid-template-columns: repeat(2, minmax(0,1fr)); } }
    .lj-sum-card { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; }
    .lj-sum-ic { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .lj-sum-l { font-size: 11px; font-weight: 700; color: var(--text-muted); letter-spacing: .04em; text-transform: uppercase; }
    .lj-sum-v { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -.01em; }

    .lj-menu { position: absolute; top: calc(100% + 4px); right: 0; z-index: 50; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; box-shadow: var(--shadow-lg); padding: 4px; min-width: 190px; text-align: left; }
    .lj-menu-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 10px; border: none; background: transparent; border-radius: 7px; font: inherit; font-size: var(--type-sm); color: var(--text); cursor: pointer; }
    .lj-menu-item:hover { background: var(--surface-2); }
    .lj-menu-item.is-danger { color: #dc2626; }

    .lj-sec { border: 1px solid var(--border); border-radius: 12px; overflow: hidden; background: var(--surface); }
    .lj-sec-h { display: flex; align-items: center; gap: 8px; padding: 11px 14px; background: var(--surface-2); border-bottom: 1px solid var(--border); font-size: 12px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; color: var(--text); }
    .lj-sec-ic { width: 24px; height: 24px; border-radius: 7px; display: flex; align-items: center; justify-content: center; background: var(--accent-soft); color: var(--accent-700); }
    .lj-sec-body { padding: 14px; }
    .lj-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .lj-flabel { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .04em; margin-bottom: 2px; }
    .lj-fval { font-size: 14px; color: var(--text); }
    .lj-divider { height: 1px; background: var(--border); margin: 14px 0; }
    .lj-owner { display: flex; align-items: center; gap: 12px; }
    .lj-plan { display: flex; align-items: center; gap: 12px; }
    .lj-plan-name { font-size: 16px; font-weight: 800; color: var(--text); }
    .lj-plan-val { font-size: 15px; font-weight: 700; color: var(--accent-700); }
    .lj-hist { display: flex; flex-direction: column; gap: 10px; }
    .lj-hist-row { display: flex; gap: 10px; align-items: flex-start; }
    .lj-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--accent); margin-top: 4px; flex-shrink: 0; box-shadow: 0 0 0 3px var(--accent-soft); }
    .lj-pays { display: flex; flex-direction: column; gap: 8px; }
    .lj-pay-row { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border: 1px solid var(--border); border-radius: 9px; background: var(--surface); }
    .lj-uso-top { display: flex; align-items: center; justify-content: space-between; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; }
    .lj-uso-track { height: 8px; border-radius: 999px; background: var(--surface-3); overflow: hidden; }
    .lj-uso-fill { height: 100%; border-radius: 999px; transition: width .3s; }
  `}</style>;
}

// ───────── Helpers do drawer de plano ─────────
function PlToggle({ on, onClick }) {
  return <span onClick={onClick} className={'pl-switch' + (on ? ' on' : '')}><span className="pl-knob" /></span>;
}
function PlSeg({ val, set, opts }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {opts.map(([v, lbl]) => (
        <button key={v} type="button" className="btn btn-sm" style={{ flex: 1, borderColor: val === v ? 'var(--accent)' : 'var(--border)', color: val === v ? 'var(--accent-700)' : 'var(--text)', background: val === v ? 'var(--accent-soft)' : 'var(--surface)' }} onClick={() => set(v)}>{lbl}</button>
      ))}
    </div>);
}
function PlRec({ label, desc, children }) {
  return (
    <div className="pl-rec">
      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>{desc && <div className="muted" style={{ fontSize: 11 }}>{desc}</div>}</div>
      {children}
    </div>);
}
function PlanoDrawerStyles() {
  return <style>{`
    .pl-rec { display: flex; align-items: center; gap: 12px; padding: 9px 0; border-bottom: 1px solid var(--border); }
    .pl-rec:last-child { border-bottom: none; }
    .pl-switch { width: 38px; height: 22px; border-radius: 999px; background: var(--border-strong); position: relative; flex-shrink: 0; cursor: pointer; transition: background .2s; }
    .pl-switch.on { background: var(--accent); }
    .pl-knob { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: left .2s; }
    .pl-switch.on .pl-knob { left: 18px; }
    .pw-grid { display: grid; grid-template-columns: 210px 1fr; height: 100%; margin: -22px; min-height: 0; }
    .pw-steps { border-right: 1px solid var(--border); background: var(--surface-2); padding: 16px 10px; display: flex; flex-direction: column; gap: 4px; overflow-y: auto; }
    .pw-step { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border: none; background: transparent; border-radius: 9px; cursor: pointer; font: inherit; font-size: 13px; color: var(--text-muted); text-align: left; }
    .pw-step:hover { background: var(--surface-3); }
    .pw-step.is-cur { background: var(--accent-soft); color: var(--accent-700); font-weight: 600; }
    .pw-step.is-done { color: var(--text); }
    .pw-num { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; background: var(--surface-3); color: var(--text-muted); flex-shrink: 0; }
    .pw-step.is-cur .pw-num, .pw-step.is-done .pw-num { background: var(--accent); color: #fff; }
    .pw-content { overflow-y: auto; overflow-x: hidden; padding: 20px 22px; }
    .pw-anim-next { animation: pwSlideNext .26s cubic-bezier(.2,.8,.3,1); }
    .pw-anim-prev { animation: pwSlidePrev .26s cubic-bezier(.2,.8,.3,1); }
    @keyframes pwSlideNext { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes pwSlidePrev { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
  `}</style>;
}

// ───────── Drawer: Novo plano / Editar plano (mock) ─────────
// Helpers de campo do formulário de plano (reutilizáveis)
function PlField({ label, hint, children }) {
  return <div><label className="label">{label}{hint && <span className="muted" style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}> · {hint}</span>}</label>{children}</div>;
}
function PlDrop({ value, onChange, opts }) {
  return <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>;
}
function PlNum({ value, onValue, ilim, onIlim }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <input className="input tnum" type="number" min="0" value={ilim ? '' : value} disabled={ilim} placeholder={ilim ? 'Ilimitado' : ''} onChange={(e) => onValue(e.target.value)} style={{ flex: 1, opacity: ilim ? .5 : 1 }} />
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, whiteSpace: 'nowrap', cursor: 'pointer', color: 'var(--text-muted)' }}><input type="checkbox" checked={ilim} onChange={(e) => onIlim(e.target.checked)} /> Ilimitado</label>
    </div>);
}
function PlToggleGrid({ items, vals, onToggle }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 24 }}>
      {items.map(([k, lbl, desc]) => <PlRec key={k} label={lbl} desc={desc}><PlToggle on={!!vals[k]} onClick={() => onToggle(k)} /></PlRec>)}
    </div>);
}

function RevLinha({ label, v, ultimo }) {
  return <div style={{ display: 'flex', gap: 12, padding: '7px 0', borderBottom: ultimo ? 'none' : '1px solid var(--border)', fontSize: 13 }}><span className="muted" style={{ minWidth: 150 }}>{label}</span><span style={{ fontWeight: 600, flex: 1, textAlign: 'right' }}>{v}</span></div>;
}
const PLANO_STEPS = [
  { id: 'basico', label: 'Dados básicos' },
  { id: 'limites', label: 'Limites & IA' },
  { id: 'recursos', label: 'Recursos' },
  { id: 'config', label: 'Configurações' },
  { id: 'revisao', label: 'Revisão' },
];
function PlanoDrawer({ plano, onClose, onSaved }) {
  const novo = !plano;
  const [step, setStep] = React.useState(0);
  const [dir, setDir] = React.useState(1);
  const [saving, setSaving] = React.useState(false);
  const goTo = (i) => { setDir(i >= step ? 1 : -1); setStep(i); };
  const [f, setF] = React.useState(() => {
    const p = plano || {};
    return {
      nome: p.name || '', descricao: p.features || '',
      preco: p.price != null ? p.price : '', ciclo: p.ciclo || 'mensal', cor: p.cor || '#22C55E',
      conversas: p.conv != null ? p.conv : 2000, conversasIlim: !!p.conversasIlim,
      usuarios: p.users != null ? p.users : 5, usuariosIlim: !!p.usuariosIlim,
      canais: p.canais || { whatsapp: true, instagram: false, facebook: false, site: false },
      iaNivel: p.iaNivel || 'avancada', iaAgentes: p.iaAgentes != null ? p.iaAgentes : 1,
      modulos: p.modulos || { comercial: true, financeiro: true, agenda: true, catalogo: true, marketing: false },
      crm: p.crm || 'ilimitado', relatorios: p.relatorios || 'basico', suporte: p.suporte || 'padrao',
      avancados: p.avancados || { api: false, automacoes: false, whitelabel: false, dominio: false },
      trial: plano ? !!p.trial : true, trialDias: p.trialDias != null ? p.trialDias : 7,
      destaque: !!p.destaque, status: plano ? !!p.status : true,
    };
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const setIn = (grp, k) => setF((s) => ({ ...s, [grp]: { ...s[grp], [k]: !s[grp][k] } }));
  const SUPORTE = { padrao: 'Padrão', prioritario: 'Prioritário', dedicado: 'Dedicado' };
  const L_CANAIS = { whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook', site: 'Chat de site' };
  const L_MOD = { comercial: 'Comercial/PDV', financeiro: 'Financeiro', agenda: 'Agenda', catalogo: 'Catálogo', marketing: 'Marketing' };
  const L_AV = { api: 'API própria', automacoes: 'Automações avançadas', whitelabel: 'White label', dominio: 'Domínio próprio' };
  const join = (obj, labels) => Object.entries(obj).filter(([, v]) => v).map(([k]) => labels[k]).join(' · ') || '—';
  const last = PLANO_STEPS.length - 1;

  const salvar = async (close) => {
    if (!f.nome.trim()) { window.showToast({ tipo: 'aviso', titulo: 'Nome obrigatório', descricao: 'Dê um nome ao plano.', duracao: 4000 }); setStep(0); return; }
    if (saving) return;
    setSaving(true);
    try {
      if (novo) await API.createPlano(f);
      else await API.updatePlano(plano.id, f);
      close(() => {
        window.showToast({ tipo: 'sucesso', titulo: novo ? 'Plano criado' : 'Plano atualizado', descricao: `O plano ${f.nome} foi ${novo ? 'criado' : 'atualizado'}.`, duracao: 4000 });
        onSaved && onSaved();
      });
    } catch (e) {
      setSaving(false);
      const msg = (e && e.status === 403) ? 'Acesso restrito ao Super Admin.' : ((e && e.data && e.data.error) || (e && e.message) || 'Tente novamente.');
      window.showToast({ tipo: 'erro', titulo: 'Erro ao salvar', descricao: msg, duracao: 5000 });
    }
  };

  return (
    <Drawer title={novo ? 'Novo plano' : 'Editar plano'} subtitle={`Etapa ${step + 1} de ${PLANO_STEPS.length} · ${PLANO_STEPS[step].label}`} onClose={onClose} width="60vw"
      footer={(close) => <>
        <ActionButton action="voltar" size="md" onClick={close} />
        <div style={{ flex: 1 }} />
        {step > 0 && <ActionButton action="anterior" size="md" onClick={() => goTo(step - 1)} />}
        {step < last
          ? <ActionButton action="proximo" size="md" onClick={() => goTo(step + 1)} />
          : <ActionButton action="salvar" size="md" disabled={saving} efeito={false} onClick={() => salvar(close)} />}
      </>}>
      <PlanoDrawerStyles />
      <div className="pw-grid">
        <div className="pw-steps">
          {PLANO_STEPS.map((s, i) => (
            <button key={s.id} type="button" className={'pw-step' + (i === step ? ' is-cur' : '') + (i < step ? ' is-done' : '')} onClick={() => goTo(i)}>
              <span className="pw-num">{i < step ? <Ic name="check" size={13} /> : i + 1}</span>{s.label}
            </button>
          ))}
        </div>

        <div className="pw-content tpc-flat da01">
          <div className={'pw-anim ' + (dir > 0 ? 'pw-anim-next' : 'pw-anim-prev')} key={step}>
          {step === 0 && <>
            <div className="fin-section-title">DADOS BÁSICOS</div>
            <div className="fin-section">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                <PlField label="Nome do plano"><input className="input" value={f.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Ex.: Pro" /></PlField>
                <PlField label="Descrição curta" hint="frase do card"><input className="input" value={f.descricao} onChange={(e) => set('descricao', e.target.value)} placeholder="Ex.: IA avançada, CRM ilimitado, Agenda, Catálogo" /></PlField>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <PlField label="Preço / mês"><MoneyInput value={f.preco} onChange={(v, n) => set('preco', n)} /></PlField>
                <PlField label="Ciclo de cobrança"><PlDrop value={f.ciclo} onChange={(v) => set('ciclo', v)} opts={[['mensal', 'Mensal'], ['anual', 'Anual']]} /></PlField>
              </div>
              <PlField label="Cor do plano">
                <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {PHASE_PALETTE.map((c) => <ColorSwatch key={c} color={c} selected={f.cor === c} onClick={() => set('cor', c)} />)}
                </div>
              </PlField>
            </div>
          </>}

          {step === 1 && <>
            <div className="fin-section-title">LIMITES / COTAS</div>
            <div className="fin-section">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <PlField label="Conversas por mês"><PlNum value={f.conversas} onValue={(v) => set('conversas', v)} ilim={f.conversasIlim} onIlim={(v) => set('conversasIlim', v)} /></PlField>
                <PlField label="Nº de usuários"><PlNum value={f.usuarios} onValue={(v) => set('usuarios', v)} ilim={f.usuariosIlim} onIlim={(v) => set('usuariosIlim', v)} /></PlField>
              </div>
            </div>
            <div className="fin-section-title">INTELIGÊNCIA ARTIFICIAL</div>
            <div className="fin-section">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <PlField label="Nível da IA"><PlDrop value={f.iaNivel} onChange={(v) => set('iaNivel', v)} opts={[['basica', 'Básica'], ['avancada', 'Avançada']]} /></PlField>
                <PlField label="Nº de agentes de IA"><input className="input tnum" type="number" min="0" value={f.iaAgentes} onChange={(e) => set('iaAgentes', e.target.value)} /></PlField>
              </div>
            </div>
          </>}

          {step === 2 && <>
            <div className="fin-section-title">CANAIS DE ATENDIMENTO</div>
            <div className="fin-section">
              <PlToggleGrid items={[['whatsapp', 'WhatsApp'], ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['site', 'Chat de site']]} vals={f.canais} onToggle={(k) => setIn('canais', k)} />
            </div>
            <div className="fin-section-title">MÓDULOS LIBERADOS</div>
            <div className="fin-section">
              <PlToggleGrid items={[['comercial', 'Comercial / PDV'], ['financeiro', 'Financeiro'], ['agenda', 'Agenda'], ['catalogo', 'Catálogo'], ['marketing', 'Marketing']]} vals={f.modulos} onToggle={(k) => setIn('modulos', k)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
                <PlField label="CRM"><PlDrop value={f.crm} onChange={(v) => set('crm', v)} opts={[['1funil', '1 funil'], ['ilimitado', 'Ilimitado']]} /></PlField>
                <PlField label="Relatórios"><PlDrop value={f.relatorios} onChange={(v) => set('relatorios', v)} opts={[['basico', 'Básico'], ['avancado', 'Avançado']]} /></PlField>
              </div>
            </div>
            <div className="fin-section-title">SUPORTE & RECURSOS AVANÇADOS</div>
            <div className="fin-section">
              <div style={{ maxWidth: 300 }}>
                <PlField label="Nível de suporte"><PlDrop value={f.suporte} onChange={(v) => set('suporte', v)} opts={[['padrao', 'Padrão'], ['prioritario', 'Prioritário'], ['dedicado', 'Dedicado']]} /></PlField>
              </div>
              <PlToggleGrid items={[['api', 'API própria'], ['automacoes', 'Automações avançadas'], ['whitelabel', 'White label'], ['dominio', 'Domínio próprio']]} vals={f.avancados} onToggle={(k) => setIn('avancados', k)} />
            </div>
          </>}

          {step === 3 && <>
            <div className="fin-section-title">CONFIGURAÇÕES DO PLANO</div>
            <div className="fin-section">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 24, alignItems: 'center' }}>
                <PlRec label="Oferecer teste grátis (trial)"><PlToggle on={f.trial} onClick={() => set('trial', !f.trial)} /></PlRec>
                {f.trial
                  ? <PlField label="Dias de trial"><input className="input tnum" type="number" min="0" value={f.trialDias} onChange={(e) => set('trialDias', e.target.value)} style={{ maxWidth: 120 }} /></PlField>
                  : <div />}
                <PlRec label="Plano em destaque" desc="Aparece destacado, como o Pro"><PlToggle on={f.destaque} onClick={() => set('destaque', !f.destaque)} /></PlRec>
                <PlRec label="Status do plano" desc={f.status ? 'Ativo — vendendo' : 'Inativo — aposentado'}><PlToggle on={f.status} onClick={() => set('status', !f.status)} /></PlRec>
              </div>
            </div>
          </>}

          {step === 4 && <>
            <div className="fin-section-title">REVISÃO</div>
            <div className="fin-section">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ width: 44, height: 44, borderRadius: 12, background: f.cor, flexShrink: 0, boxShadow: `0 0 0 3px color-mix(in oklab, ${f.cor} 22%, transparent)` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>{f.nome || 'Sem nome'}{f.destaque && <span className="badge badge-success">Destaque</span>}{!f.status && <span className="badge badge-neutral">Inativo</span>}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{f.descricao || '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--accent-700)' }}>{_fmtBRL(f.preco || 0)}</div>
                  <div className="muted" style={{ fontSize: 11 }}>/ {f.ciclo === 'anual' ? 'ano' : 'mês'}</div>
                </div>
              </div>
            </div>
            <div className="fin-section">
              <RevLinha label="Limites" v={(f.conversasIlim ? 'Conversas ilimitadas' : Number(f.conversas || 0).toLocaleString('pt-BR') + ' conversas') + ' · ' + (f.usuariosIlim ? 'usuários ilimitados' : f.usuarios + ' usuários')} />
              <RevLinha label="Inteligência Artificial" v={(f.iaNivel === 'avancada' ? 'Avançada' : 'Básica') + ' · ' + f.iaAgentes + ' agente(s)'} />
              <RevLinha label="Canais" v={join(f.canais, L_CANAIS)} />
              <RevLinha label="Módulos" v={join(f.modulos, L_MOD)} />
              <RevLinha label="CRM / Relatórios" v={(f.crm === 'ilimitado' ? 'CRM ilimitado' : 'CRM 1 funil') + ' · Relatórios ' + (f.relatorios === 'avancado' ? 'avançado' : 'básico')} />
              <RevLinha label="Suporte" v={SUPORTE[f.suporte]} />
              <RevLinha label="Recursos avançados" v={join(f.avancados, L_AV)} />
              <RevLinha label="Trial" v={f.trial ? f.trialDias + ' dias grátis' : 'Não oferece'} />
              <RevLinha label="Status" v={f.status ? 'Ativo' : 'Inativo'} ultimo />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 9, fontSize: 13, background: 'color-mix(in oklab, #10b981 12%, var(--surface))', color: '#047857' }}><Ic name="check" size={16} /> Tudo certo! Clique em <b style={{ marginLeft: 3 }}>Salvar plano</b> para concluir.</div>
          </>}
          </div>
        </div>
      </div>
    </Drawer>);
}

// ───────── Drawer: Apagar plano (fluxo guiado — migrar → apagar) ─────────
function ApagarPlanoStyles() {
  return <style>{`
    .ap-warn { display: flex; gap: 12px; align-items: flex-start; padding: 12px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 14px;
      background: color-mix(in oklab, #f59e0b 12%, var(--surface)); border: 1px solid color-mix(in oklab, #f59e0b 30%, transparent); }
    .ap-warn-ic { width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
      background: color-mix(in oklab, #f59e0b 16%, var(--surface)); color: #b45309; }
    .ap-ok { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 9px; font-size: 13px; margin-bottom: 12px;
      background: color-mix(in oklab, #10b981 12%, var(--surface)); color: #047857; }
    .ap-danger { display: flex; align-items: flex-start; gap: 8px; font-size: 12.5px; color: #b91c1c; line-height: 1.5; }
    .ap-lojarow { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-bottom: 1px solid var(--border); }
    .ap-lojarow:last-child { border-bottom: none; }
  `}</style>;
}
function ApagarPlanoDrawer({ plano, planos, onClose, onDeleted }) {
  const [migrado, setMigrado] = React.useState(false);
  const [destino, setDestino] = React.useState('');
  const [verLojas, setVerLojas] = React.useState(false);
  const [lojas, setLojas] = React.useState(null); // lista carregada sob demanda
  const [confirmo, setConfirmo] = React.useState(false);
  const [nomeConfirma, setNomeConfirma] = React.useState('');
  const [migrando, setMigrando] = React.useState(false);
  const [apagando, setApagando] = React.useState(false);

  const restantes = migrado ? 0 : (plano.active || 0);
  const podeApagar = restantes === 0 && (confirmo || nomeConfirma.trim() === plano.name);
  const outros = (planos || []).filter((p) => p.name !== plano.name);
  const destinoNome = (outros.find((p) => p.id === destino) || {}).name || '';

  const verQuais = () => {
    setVerLojas((v) => !v);
    if (lojas === null) API.getPlanoLojas(plano.id).then((r) => setLojas(r.lojas || [])).catch(() => setLojas([]));
  };
  const migrar = () => {
    if (!destino || migrando) return;
    setMigrando(true);
    API.migrarPlano(plano.id, destino)
      .then((r) => { setMigrado(true); window.showToast({ tipo: 'sucesso', titulo: 'Lojas migradas', descricao: `${r.migradas} loja${r.migradas === 1 ? '' : 's'} migrada${r.migradas === 1 ? '' : 's'} para ${r.para}.`, duracao: 4000 }); })
      .catch((e) => window.showToast({ tipo: 'erro', titulo: 'Erro ao migrar', descricao: (e && e.data && e.data.error) || (e && e.message) || 'Tente novamente.', duracao: 5000 }))
      .finally(() => setMigrando(false));
  };
  const apagar = (close) => {
    if (!podeApagar || apagando) return;
    setApagando(true);
    API.deletePlano(plano.id)
      .then(() => close(() => { window.showToast({ tipo: 'sucesso', titulo: 'Plano apagado', descricao: `O plano ${plano.name} foi removido do catálogo.`, duracao: 4000 }); onDeleted && onDeleted(); }))
      .catch((e) => { setApagando(false); window.showToast({ tipo: 'erro', titulo: 'Erro ao apagar', descricao: (e && e.data && e.data.error) || (e && e.message) || 'Tente novamente.', duracao: 5000 }); });
  };

  return (
    <Drawer title="Apagar plano" subtitle={plano.name} onClose={onClose} width={520}
      footer={(close) => <><div style={{ flex: 1 }} /><ActionButton action="voltar" size="md" onClick={() => close()} />
        <ActionButton action="excluir" size="md" label={apagando ? 'Apagando…' : 'Apagar plano'} disabled={!podeApagar || apagando} onClick={() => apagar(close)} /></>}>
      <ApagarPlanoStyles />

      {restantes > 0 ? (
        <>
          <div className="ap-warn">
            <div className="ap-warn-ic"><Ic name="alert" size={18} /></div>
            <div>Este plano tem <b>{restantes} loja{restantes === 1 ? '' : 's'}</b> usando ele. Antes de apagar, é preciso <b>migrar essas lojas para outro plano</b>.</div>
          </div>

          <div className="fin-section-title">1 · MIGRAR LOJAS</div>
          <div className="fin-section">
            <div className="row" style={{ alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{restantes}</div>
              <div className="muted" style={{ fontSize: 13 }}>loja{restantes === 1 ? '' : 's'} neste plano</div>
              <div className="spacer" />
              <button className="btn btn-sm" onClick={verQuais}><Ic name="eye" size={12} /> {verLojas ? 'Ocultar' : 'Ver quais'}</button>
            </div>
            {verLojas && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', maxHeight: 220, overflowY: 'auto' }}>
                {lojas === null ? <div className="ap-lojarow muted" style={{ fontSize: 13 }}>Carregando…</div>
                  : lojas.length === 0 ? <div className="ap-lojarow muted" style={{ fontSize: 13 }}>Nenhuma loja.</div>
                  : lojas.map((l) => (
                    <div key={l.id} className="ap-lojarow">
                      <div className="avatar avatar-sm" style={{ background: colorFor(l.name) }}>{initials(l.name)}</div>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{l.name}</span><div className="spacer" /><span className="badge badge-neutral">{l.tipo === 'pj' ? 'PJ' : 'PF'}</span>
                    </div>
                  ))}
              </div>
            )}
            <div>
              <label className="label">Migrar para</label>
              <select className="input" value={destino} onChange={(e) => setDestino(e.target.value)}>
                <option value="">Selecione o plano de destino…</option>
                {outros.map((p) => <option key={p.id} value={p.id}>{p.name} — {formatBRL(p.price)}/{p.ciclo === 'anual' ? 'ano' : 'mês'}</option>)}
              </select>
            </div>
            <button className="btn btn-save" disabled={!destino || migrando} onClick={migrar} style={(!destino || migrando) ? { opacity: .55, cursor: 'not-allowed' } : undefined}>
              <Ic name="repeat" size={13} /> {migrando ? 'Migrando…' : `Migrar ${restantes} loja${restantes === 1 ? '' : 's'}${destino ? ' → ' + destinoNome : ''}`}
            </button>
          </div>

          <div className="fin-section-title" style={{ opacity: .45 }}>2 · APAGAR <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>(liberado após migrar)</span></div>
        </>
      ) : (
        <>
          {migrado && <div className="ap-ok"><Ic name="check" size={16} /> Lojas migradas para <b style={{ marginLeft: 3 }}>{destinoNome}</b>.</div>}
          <div className="ap-warn" style={{ background: 'color-mix(in oklab, #10b981 10%, var(--surface))', borderColor: 'color-mix(in oklab, #10b981 28%, transparent)' }}>
            <div className="ap-warn-ic" style={{ background: 'color-mix(in oklab, #10b981 16%, var(--surface))', color: '#047857' }}><Ic name="check" size={18} /></div>
            <div><b>Nenhuma loja neste plano.</b> Pode apagar.</div>
          </div>

          <div className="fin-section-title">CONFIRMAÇÃO</div>
          <div className="fin-section">
            <div className="ap-danger"><Ic name="alert" size={15} /><span>Esta ação é <b>permanente</b> e não pode ser desfeita. O plano <b>{plano.name}</b> será removido do catálogo.</span></div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={confirmo} onChange={(e) => setConfirmo(e.target.checked)} /> Entendo que é permanente
            </label>
            <div>
              <label className="label">Ou digite o nome do plano para confirmar</label>
              <input className="input" value={nomeConfirma} onChange={(e) => setNomeConfirma(e.target.value)} placeholder={plano.name} />
            </div>
          </div>
        </>
      )}
    </Drawer>);
}

// ───────── Página: detalhe de um plano ─────────
function PlanoDetalhe({ plano, onBack, onEditar, onApagar }) {
  const [lojas, setLojas] = React.useState(null);
  React.useEffect(() => { API.getPlanoLojas(plano.id).then((r) => setLojas(r.lojas || [])).catch(() => setLojas([])); }, [plano.id]);
  const lista = lojas || [];
  const limTxt = (v) => v == null ? 'Ilimitado' : Number(v).toLocaleString('pt-BR');
  const onTxt = (obj, labels) => Object.entries(obj || {}).filter(([, v]) => v).map(([k]) => labels[k]).join(' · ') || '—';
  const L_CAN = { whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook', site: 'Chat de site' };
  const L_MOD = { comercial: 'Comercial/PDV', financeiro: 'Financeiro', agenda: 'Agenda', catalogo: 'Catálogo', marketing: 'Marketing' };
  const L_AV = { api: 'API própria', automacoes: 'Automações', whitelabel: 'White label', dominio: 'Domínio próprio' };
  const SUP = { padrao: 'Padrão', prioritario: 'Prioritário', dedicado: 'Dedicado' };
  return (
    <>
      <SuperTenantsStyles />
      <Page title={plano.name} subtitle={`${formatBRL(plano.price)}/${plano.ciclo === 'anual' ? 'ano' : 'mês'} · ${limTxt(plano.conv)} conversas · ${limTxt(plano.users)} usuários`}
        actions={<><button className="btn fin-btn-back" onClick={onBack}><Ic name="arrow-left" size={14} /> Voltar</button><button className="btn btn-save" onClick={onEditar}><Ic name="edit" size={13} /> Editar plano</button><button className="btn" title="Apagar plano" style={{ color: '#dc2626' }} onClick={onApagar}><Ic name="trash" size={14} /> Apagar</button></>}>
        <div className="lj-summary">
          <SumCard ic="building" cor="#0ea5e9" label="Lojas no plano" val={plano.active} />
          <SumCard ic="coins" cor="#10b981" label="Preço" val={formatBRL(plano.price)} />
          <SumCard ic="inbox" cor="#8b5cf6" label="Conversas/mês" val={limTxt(plano.conv)} />
          <SumCard ic="users" cor="#f59e0b" label="Usuários" val={limTxt(plano.users)} />
        </div>
        <div className="card card-pad" style={{ marginBottom: 10 }}>
          <div className="row" style={{ gap: 8, marginBottom: 8, alignItems: 'center' }}><span style={{ width: 14, height: 14, borderRadius: 4, background: plano.cor }} /><b>{plano.name}</b>{plano.destaque && <span className="badge badge-success">Destaque</span>}{!plano.status && <span className="badge badge-neutral">Inativo</span>}</div>
          <div className="muted" style={{ fontSize: 'var(--type-sm)', marginBottom: 10 }}>{plano.features || '—'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 'var(--type-sm)' }}>
            <div><b>Canais:</b> {onTxt(plano.canais, L_CAN)}</div>
            <div><b>Módulos:</b> {onTxt(plano.modulos, L_MOD)}</div>
            <div><b>IA:</b> {plano.iaNivel === 'avancada' ? 'Avançada' : 'Básica'} · {plano.iaAgentes} agente(s)</div>
            <div><b>CRM / Relatórios:</b> {plano.crm === 'ilimitado' ? 'CRM ilimitado' : 'CRM 1 funil'} · {plano.relatorios === 'avancado' ? 'avançados' : 'básicos'}</div>
            <div><b>Suporte:</b> {SUP[plano.suporte] || plano.suporte}</div>
            <div><b>Avançados:</b> {onTxt(plano.avancados, L_AV)}</div>
            <div><b>Trial:</b> {plano.trial ? plano.trialDias + ' dias grátis' : 'Não oferece'}</div>
            <div><b>Status:</b> {plano.status ? 'Ativo' : 'Inativo'}</div>
          </div>
        </div>
        <div style={{ fontWeight: 600, margin: '4px 0 8px' }}>Lojas neste plano <span className="muted" style={{ fontWeight: 400 }}>· {lista.length}</span></div>
        <div className="card" style={{ overflow: 'visible' }}>
          <table className="table">
            <thead><tr><th>Loja</th><th>Tipo</th></tr></thead>
            <tbody>
              {lojas === null && <tr><td colSpan={2}><div style={{ padding: 16 }} className="muted">Carregando…</div></td></tr>}
              {lojas !== null && lista.map((l) => (
                <tr key={l.id}><td><div className="row" style={{ gap: 10 }}><div className="avatar avatar-sm" style={{ background: colorFor(l.name) }}>{initials(l.name)}</div><span style={{ fontWeight: 600 }}>{l.name}</span></div></td><td><span className="chip">{l.tipo === 'pj' ? 'Pessoa Jurídica' : 'Pessoa Física'}</span></td></tr>
              ))}
              {lojas !== null && lista.length === 0 && <tr><td colSpan={2}><div style={{ padding: 24, textAlign: 'center' }} className="muted">Nenhuma loja neste plano ainda.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </Page>
    </>);
}

function SuperPlans() {
  const [planos, setPlanos] = React.useState(null); // null = carregando
  const [erro, setErro] = React.useState('');
  const [detail, setDetail] = React.useState(null);
  const [editing, setEditing] = React.useState(null); // plano | 'new' | null
  const [deleting, setDeleting] = React.useState(null);

  const reload = React.useCallback(() => {
    setPlanos(null); setErro('');
    API.getPlanos().then((r) => setPlanos(r.planos || [])).catch((e) => { setPlanos([]); setErro(e && e.status === 403 ? '403' : 'erro'); });
  }, []);
  React.useEffect(() => { reload(); }, [reload]);
  const loading = planos === null;
  const lista = planos || [];
  React.useEffect(() => { if (!loading) skelRemember('super-planos', lista.length || 3); });
  const limTxt = (v) => v == null ? 'Ilimitado' : Number(v).toLocaleString('pt-BR');

  if (detail) {
    const atual = lista.find((p) => p.id === detail.id) || detail;
    return (<>
      <PlanoDetalhe plano={atual} onBack={() => setDetail(null)} onEditar={() => setEditing(atual)} onApagar={() => setDeleting(atual)} />
      {editing && <PlanoDrawer plano={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      {deleting && <ApagarPlanoDrawer plano={deleting} planos={lista} onClose={() => setDeleting(null)} onDeleted={() => { setDeleting(null); setDetail(null); reload(); }} />}
    </>);
  }
  return (
    <Page title="Planos" subtitle="Catálogo de planos da plataforma" actions={<FabNovo size="sm" label="Novo plano" onClick={() => setEditing('new')} />}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--pad-3)' }}>
        {loading ? Array.from({ length: skelCount('super-planos') }).map((_, i) => (
          <div key={i} className="card card-pad">
            <div className="row"><Skeleton w={90} h={18} /><div className="spacer" /><Skeleton w={56} h={20} r={10} /></div>
            <Skeleton w="55%" h={30} style={{ marginTop: 8 }} />
            <div className="col" style={{ marginTop: 14, gap: 8 }}>
              <Skeleton w="80%" h={13} /><Skeleton w="60%" h={13} /><Skeleton w="70%" h={13} /><Skeleton w="90%" h={11} style={{ marginTop: 6 }} />
            </div>
            <div className="row" style={{ gap: 8, marginTop: 14 }}>
              <Skeleton w="100%" h={30} r={8} style={{ flex: 1 }} /><Skeleton w={70} h={30} r={8} /><Skeleton w={30} h={30} r={8} />
            </div>
          </div>
        )) : lista.map((p) => (
          <div key={p.id} className="card card-pad" style={{ cursor: 'pointer', ...(p.destaque ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : {}), ...(!p.status ? { opacity: .68 } : {}) }} onClick={() => setDetail(p)}>
            <div className="row"><div className="h3">{p.name}</div><div className="spacer" />{p.destaque && <span className="badge badge-success" style={{ marginRight: 6 }}>Destaque</span>}{!p.status && <span className="badge badge-neutral" style={{ marginRight: 6 }}>Inativo</span>}<span className="badge badge-neutral">{p.active} loja{p.active === 1 ? '' : 's'}</span></div>
            <div className="h1" style={{ marginTop: 8 }}>{formatBRL(p.price)}<span style={{ fontSize: 'var(--type-md)', color: 'var(--text-muted)', fontWeight: 400 }}>/{p.ciclo === 'anual' ? 'ano' : 'mês'}</span></div>
            <div className="col" style={{ marginTop: 14, gap: 6, fontSize: 'var(--type-sm)' }}>
              <div className="row" style={{ gap: 8 }}><Ic name="inbox" size={13} style={{ color: 'var(--text-faint)' }} />{limTxt(p.conv)} conversas/mês</div>
              <div className="row" style={{ gap: 8 }}><Ic name="users" size={13} style={{ color: 'var(--text-faint)' }} />{limTxt(p.users)} usuários</div>
              <div className="row" style={{ gap: 8 }}><Ic name="link" size={13} style={{ color: 'var(--text-faint)' }} />{p.channels}</div>
              <div className="muted" style={{ fontSize: 'var(--type-xs)', marginTop: 6 }}>{p.features}</div>
            </div>
            <div className="row" style={{ gap: 8, marginTop: 14 }}>
              <button className="btn btn-sm" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); setDetail(p); }}><Ic name="eye" size={12} /> Ver detalhe</button>
              <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); setEditing(p); }}><Ic name="edit" size={12} /> Editar</button>
              <button className="btn btn-sm btn-icon" title="Apagar plano" style={{ color: '#dc2626' }} onClick={(e) => { e.stopPropagation(); setDeleting(p); }}><Ic name="trash" size={14} /></button>
            </div>
          </div>
        ))}
      </div>
      {!loading && lista.length === 0 && (
        <div className="card card-pad" style={{ textAlign: 'center', marginTop: 10 }}>
          {erro === '403'
            ? <><div style={{ fontWeight: 600 }}>Acesso restrito ao Super Admin</div><div className="muted" style={{ fontSize: 'var(--type-sm)' }}>Entre com a conta de super admin (scalloop.io).</div></>
            : <><div style={{ fontWeight: 600 }}>Nenhum plano</div><div className="muted" style={{ fontSize: 'var(--type-sm)' }}>Clique em "Novo plano" para criar o primeiro.</div></>}
        </div>
      )}
      {editing && <PlanoDrawer plano={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      {deleting && <ApagarPlanoDrawer plano={deleting} planos={lista} onClose={() => setDeleting(null)} onDeleted={() => { setDeleting(null); reload(); }} />}
    </Page>
  );
}

function SuperUsage() {
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => setLoading(false), []);
  const rows = TENANTS.filter(t=>t.status!=='suspenso');
  React.useEffect(() => { if (!loading) skelRemember('super-uso', rows.length); });
  return (
    <Page title="Monitoramento de uso" subtitle="Consumo por tenant — últimas 24h">
      <div className="card">
        <table className="table">
          <thead><tr><th>Tenant</th><th>Tokens</th><th>Custo</th><th>Mensagens</th><th>Pico/h</th><th>Lucratividade</th></tr></thead>
          <tbody>{loading ? Array.from({ length: skelCount('super-uso') }).map((_, i) => (
            <tr key={i}>
              <td><Skeleton w={140} h={14} /></td>
              <td><Skeleton w={70} h={14} /></td>
              <td><Skeleton w={60} h={14} /></td>
              <td><Skeleton w={70} h={14} /></td>
              <td><Skeleton w={40} h={14} /></td>
              <td><Skeleton w={70} h={14} /></td>
            </tr>
          )) : rows.map(t=>{
            const tokens = Math.round(t.conv*120 + Math.random()*5000);
            const cost = (tokens/100000*4).toFixed(2);
            const profit = t.mrr - parseFloat(cost)*30;
            return (
              <tr key={t.id}>
                <td style={{fontWeight:500}}>{t.name}</td>
                <td className="tnum">{tokens.toLocaleString('pt-BR')}</td>
                <td className="tnum">{formatBRL(cost)}</td>
                <td className="tnum">{Math.round(t.conv*1.8).toLocaleString('pt-BR')}</td>
                <td className="tnum muted">{Math.round(20+Math.random()*60)}</td>
                <td className="tnum" style={{color: profit>0?'var(--accent-700)':'var(--hue-rose)', fontWeight:600}}>{formatBRL(profit)}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </Page>
  );
}

function SuperLogs() {
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => setLoading(false), []);
  React.useEffect(() => { if (!loading) skelRemember('super-logs', LOGS.length); });
  return (
    <Page title="Logs do sistema" subtitle="Eventos técnicos e administrativos">
      <div className="row" style={{gap:8}}>
        <select className="input" style={{width:140}}><option>Todos tipos</option></select>
        <select className="input" style={{width:140}}><option>Todas severidades</option></select>
        <input className="input" placeholder="Buscar..." style={{maxWidth:240}}/>
      </div>
      <div className="card">
        {loading ? Array.from({ length: skelCount('super-logs') }).map((_,i)=>(
          <div key={i} className="row" style={{padding:'12px 16px', borderBottom:'1px solid var(--border)', gap:12}}>
            <span style={{minWidth:78}}><Skeleton w={70} h={11} /></span>
            <Skeleton w={60} h={20} r={10} />
            <span style={{minWidth:160}}><Skeleton w={120} h={13} /></span>
            <span style={{flex:1}}><Skeleton w="80%" h={13} /></span>
          </div>
        )) : LOGS.map((l,i)=>(
          <div key={i} className="row" style={{padding:'12px 16px', borderBottom:'1px solid var(--border)', gap:12}}>
            <span className="mono muted" style={{fontSize:11, minWidth:78}}>{l.time}</span>
            <span className={`badge ${l.severity==='alta'?'badge-danger':l.severity==='media'?'badge-warning':'badge-neutral'}`}>{l.type}</span>
            <span className="muted" style={{fontSize:'var(--type-sm)', minWidth:160}}>{l.tenant}</span>
            <span style={{flex:1, fontSize:'var(--type-sm)'}}>{l.msg}</span>
          </div>
        ))}
      </div>
    </Page>
  );
}

function SuperBilling() {
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => setLoading(false), []);
  const rows = TENANTS.slice(0,8);
  React.useEffect(() => { if (!loading) skelRemember('super-billing', rows.length); });
  return (
    <Page title="Faturamento" subtitle="MRR e inadimplência">
      <div className="stat-grid">
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card card-pad">
            <Skeleton w={90} h={11} />
            <Skeleton w="60%" h={26} style={{ marginTop: 10 }} />
            <Skeleton w={120} h={11} style={{ marginTop: 10 }} />
          </div>
        )) : <>
        <Stat label="MRR atual" value="R$ 28.470" foot="42 clientes pagantes" icon="wallet"/>
        <Stat label="Projeção 3 meses" value="R$ 95.4k" icon="activity" accent={{bg:'var(--accent-soft)', fg:'var(--accent-700)'}}/>
        <Stat label="Inadimplência" value="R$ 1.291" foot="3 clientes" icon="flag"/>
        <Stat label="ARPU médio" value="R$ 678" icon="users"/>
        </>}
      </div>
      <div className="card">
        <div style={{padding:'14px 18px', borderBottom:'1px solid var(--border)'}} className="h3">Pagamentos recentes</div>
        <table className="table">
          <thead><tr><th>Tenant</th><th>Plano</th><th>Valor</th><th>Data</th><th>Status</th></tr></thead>
          <tbody>{loading ? Array.from({ length: skelCount('super-billing') }).map((_, i) => (
            <tr key={i}>
              <td><Skeleton w={140} h={14} /></td>
              <td><Skeleton w={56} h={20} r={10} /></td>
              <td><Skeleton w={70} h={14} /></td>
              <td><Skeleton w={80} h={12} /></td>
              <td><Skeleton w={64} h={20} r={10} /></td>
            </tr>
          )) : rows.map(t=>(
            <tr key={t.id}>
              <td style={{fontWeight:500}}>{t.name}</td>
              <td><span className="chip">{t.plan}</span></td>
              <td className="tnum">{formatBRL(t.mrr)}</td>
              <td className="muted">{t.start}</td>
              <td><StatusBadge status={t.status==='atrasado'?'atrasado':t.status==='trial'?'trial':'ativo'}/></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </Page>
  );
}

Object.assign(window, { SuperDashboard, SuperTenants, SuperPlans, SuperUsage, SuperLogs, SuperBilling });
