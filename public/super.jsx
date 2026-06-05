// super.jsx — Super Admin screens
function SuperDashboard() {
  return (
    <Page title="Visão geral da plataforma" subtitle="Dados em tempo real · atualizado há 12s">
      <div className="stat-grid">
        <Stat label="Clientes ativos" value="42" foot="↑ 3 este mês" icon="building" accent={{bg:'var(--accent-soft)', fg:'var(--accent-700)'}}/>
        <Stat label="MRR consolidada" value="R$ 28.4k" foot="↑ 12% MoM" icon="wallet"/>
        <Stat label="Conversas agora" value="1.284" foot="em todos os clientes" icon="inbox"/>
        <Stat label="Tokens Claude (24h)" value="3.2M" foot="≈ R$ 124,80" icon="sparkles" accent={{bg:'var(--ai-soft)', fg:'var(--ai-strong)'}}/>
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
          <div style={{display:'flex', alignItems:'flex-end', gap:6, height:160, marginTop:14}}>
            {[8,12,15,18,22,25,28,32,35,38,40,42].map((v,i)=>(
              <div key={i} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4}}>
                <div style={{width:'100%', height:`${v*3.5}px`, background:'var(--accent)', borderRadius:'4px 4px 0 0'}}/>
                <span style={{fontSize:10, color:'var(--text-faint)'}}>{['J','F','M','A','M','J','J','A','S','O','N','D'][i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card card-pad">
          <div className="h3">Top 5 por volume</div>
          <div className="col" style={{marginTop:10, gap:6}}>
            {TENANTS.slice(0,5).sort((a,b)=>b.conv-a.conv).map((t,i)=>(
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
        {isEdit && <button className="btn btn-delete-soft" onClick={()=>setConfirmDel(true)}><Ic name="trash" size={13}/> Excluir</button>}
        <div style={{flex:1}}/>
        <button className="btn fin-btn-back" onClick={() => close()}>Voltar</button>
        {!isEdit && <button className="btn" onClick={() => close(handleSave)}><Ic name="mail" size={13}/> Salvar e enviar boas-vindas</button>}
        <button className="btn btn-save" onClick={() => close(handleSave)}><Ic name="check" size={13}/> {isEdit ? 'Salvar alterações' : 'Cadastrar cliente'}</button>
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
                  const close = drawerClose.current;
                  if (close) close(() => onDelete(initial.id));
                  else onDelete(initial.id);
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
        <button className="btn"><Ic name="download" size={13}/> Exportar CSV</button>
        <button className="btn btn-primary"><Ic name="plus" size={13}/> Gerar nova cobrança</button>
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

function SuperTenants() {
  const [list, setList] = React.useState(() => [...TENANTS]);
  const [editing, setEditing] = React.useState(null); // null | 'new' | id
  const [finance, setFinance] = React.useState(null);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('todos');
  const open = list.find(c => c.id === editing);
  const filtered = list.filter(c =>
    (statusFilter==='todos' || c.status===statusFilter) &&
    (!search || c.name.toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <Page title="Clientes" subtitle={`${list.length} clientes na plataforma`} actions={<button className="btn btn-primary" onClick={()=>setEditing('new')}><Ic name="plus" size={14}/> Novo cliente</button>}>
      <div className="row" style={{gap:8}}>
        <input className="input" placeholder="Buscar cliente..." value={search} onChange={e=>setSearch(e.target.value)} style={{maxWidth:280}}/>
        <select className="input" style={{width:160}} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
          <option value="todos">Todos status</option>
          <option value="ativo">Ativo</option>
          <option value="trial">Trial</option>
          <option value="pendente">Pendente</option>
          <option value="atrasado">Atrasado</option>
          <option value="suspenso">Suspenso</option>
        </select>
        <select className="input" style={{width:140}}><option>Todos planos</option></select>
      </div>
      <div className="card">
        <table className="table">
          <thead><tr><th>Cliente</th><th>Plano</th><th>Início</th><th>Renovação</th><th>Conv./mês</th><th>MRR</th><th>Status</th><th style={{textAlign:'right'}}>Ações</th></tr></thead>
          <tbody>{filtered.map(t=>(
            <tr key={t.id} style={{cursor:'default'}} onClick={()=>setEditing(t.id)}>
              <td><div className="row" style={{gap:8}}><div className="avatar avatar-sm" style={{background:colorFor(t.name)}}>{initials(t.name)}</div><span style={{fontWeight:500}}>{t.name}</span></div></td>
              <td><span className="chip">{t.plan}</span></td>
              <td className="muted" style={{fontSize:'var(--type-sm)'}}>{t.start}</td>
              <td className="muted" style={{fontSize:'var(--type-sm)'}}>{t.renew}</td>
              <td className="tnum">{(t.conv||0).toLocaleString('pt-BR')}</td>
              <td className="tnum">{formatBRL(t.mrr)}</td>
              <td><StatusBadge status={t.status}/></td>
              <td style={{textAlign:'right'}} onClick={e=>e.stopPropagation()}>
                <div className="row" style={{gap:4, justifyContent:'flex-end'}}>
                  <span className="btn btn-ghost btn-icon" title="Financeiro" onClick={()=>setFinance(t)}><Ic name="wallet" size={14}/></span>
                  <span className="btn btn-ghost btn-icon" title="Editar" onClick={()=>setEditing(t.id)}><Ic name="edit" size={14}/></span>
                  <span className="btn btn-ghost btn-icon" title="Excluir" style={{color:'#dc2626'}} onClick={()=>{ setEditing(t.id); setTimeout(()=>{ /* user opens trash from drawer */ }, 50); }}><Ic name="trash" size={14}/></span>
                  <span className="btn btn-ghost btn-sm" title="Acessar como" onClick={()=>{}}>Acessar</span>
                </div>
              </td>
            </tr>
          ))}
          {filtered.length===0 && <tr><td colSpan={8}><div className="empty" style={{padding:30}}><div style={{fontWeight:600}}>Nenhum cliente encontrado</div><div className="muted" style={{fontSize:'var(--type-sm)'}}>Ajuste os filtros ou cadastre um novo.</div></div></td></tr>}
          </tbody>
        </table>
      </div>
      {editing!==null && (
        <ClientDrawer
          initial={editing==='new' ? null : open}
          onClose={()=>setEditing(null)}
          onSave={(c)=>{ setList(prev => prev.some(x=>x.id===c.id) ? prev.map(x=>x.id===c.id?c:x) : [...prev, c]); setEditing(null); }}
          onDelete={(id)=>{ setList(prev => prev.filter(x=>x.id!==id)); setEditing(null); }}
        />
      )}
      {finance && <FinanceDrawer client={finance} onClose={()=>setFinance(null)}/>}
    </Page>
  );
}

function SuperPlans() {
  return (
    <Page title="Planos" subtitle="Catálogo de planos da plataforma" actions={<button className="btn btn-primary"><Ic name="plus" size={14}/> Novo plano</button>}>
      <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'var(--pad-3)'}}>
        {PLANS.map((p,i) => (
          <div key={p.id} className="card card-pad" style={i===1?{borderColor:'var(--accent)', background:'var(--accent-soft)'}:{}}>
            <div className="row"><div className="h3">{p.name}</div><div className="spacer"/><span className="badge badge-neutral">{p.active} ativos</span></div>
            <div className="h1" style={{marginTop:8}}>{formatBRL(p.price)}<span style={{fontSize:'var(--type-md)', color:'var(--text-muted)', fontWeight:400}}>/mês</span></div>
            <div className="col" style={{marginTop:14, gap:6, fontSize:'var(--type-sm)'}}>
              <div className="row" style={{gap:8}}><Ic name="inbox" size={13} style={{color:'var(--text-faint)'}}/>{p.conv.toLocaleString('pt-BR')} conversas/mês</div>
              <div className="row" style={{gap:8}}><Ic name="users" size={13} style={{color:'var(--text-faint)'}}/>{p.users} usuários</div>
              <div className="row" style={{gap:8}}><Ic name="link" size={13} style={{color:'var(--text-faint)'}}/>{p.channels}</div>
              <div className="muted" style={{fontSize:'var(--type-xs)', marginTop:6}}>{p.features}</div>
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}

function SuperUsage() {
  return (
    <Page title="Monitoramento de uso" subtitle="Consumo por tenant — últimas 24h">
      <div className="card">
        <table className="table">
          <thead><tr><th>Tenant</th><th>Tokens</th><th>Custo</th><th>Mensagens</th><th>Pico/h</th><th>Lucratividade</th></tr></thead>
          <tbody>{TENANTS.filter(t=>t.status!=='suspenso').map(t=>{
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
  return (
    <Page title="Logs do sistema" subtitle="Eventos técnicos e administrativos">
      <div className="row" style={{gap:8}}>
        <select className="input" style={{width:140}}><option>Todos tipos</option></select>
        <select className="input" style={{width:140}}><option>Todas severidades</option></select>
        <input className="input" placeholder="Buscar..." style={{maxWidth:240}}/>
      </div>
      <div className="card">
        {LOGS.map((l,i)=>(
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
  return (
    <Page title="Faturamento" subtitle="MRR e inadimplência">
      <div className="stat-grid">
        <Stat label="MRR atual" value="R$ 28.470" foot="42 clientes pagantes" icon="wallet"/>
        <Stat label="Projeção 3 meses" value="R$ 95.4k" icon="activity" accent={{bg:'var(--accent-soft)', fg:'var(--accent-700)'}}/>
        <Stat label="Inadimplência" value="R$ 1.291" foot="3 clientes" icon="flag"/>
        <Stat label="ARPU médio" value="R$ 678" icon="users"/>
      </div>
      <div className="card">
        <div style={{padding:'14px 18px', borderBottom:'1px solid var(--border)'}} className="h3">Pagamentos recentes</div>
        <table className="table">
          <thead><tr><th>Tenant</th><th>Plano</th><th>Valor</th><th>Data</th><th>Status</th></tr></thead>
          <tbody>{TENANTS.slice(0,8).map(t=>(
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
