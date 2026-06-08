// atendente-dashboard.jsx — Dashboard pessoal do atendente
// Combina métricas de atendimento + comercial filtradas pelo usuário logado.

const SECTIONS = [
  { id:'geral',       label:'Visão geral',     icon:'dashboard' },
  { id:'atendimento', label:'Atendimento',     icon:'inbox' },
  { id:'comercial',   label:'Comercial',       icon:'commercial' },
  { id:'mapas',       label:'Mapas de calor',  icon:'reports' },
  { id:'funil',       label:'Funil & pipeline',icon:'leads' },
  { id:'agenda',      label:'Agenda & conversas', icon:'agenda' },
  { id:'vendas',      label:'Últimas vendas',  icon:'finance' },
];

function AtendenteDashboard() {
  const { tweaks } = useStore();
  const heavy = tweaks.dataState === 'heavy';
  const empty = tweaks.dataState === 'empty';

  const me = { id: 'kz', name: 'Karla Zambelly', role: 'Atendente sênior', meta: 40000, vendido: 35200 };
  const [period, setPeriod] = React.useState('semana');

  // ----- skeleton de carregamento (scaffolding pronto pra API real) -----
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => { setLoading(false); }, []);

  const scrollRef = React.useRef(null);
  const [activeId, setActiveId] = React.useState(SECTIONS[0].id);
  const programmaticUntil = React.useRef(0);

  // Scroll spy
  React.useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const onScroll = () => {
      if (Date.now() < programmaticUntil.current) return;
      const trigger = scroller.scrollTop + 140;
      let current = SECTIONS[0].id;
      for (const s of SECTIONS) {
        const el = document.getElementById(`sec-${s.id}`);
        if (!el) continue;
        const top = el.offsetTop;
        if (top <= trigger) current = s.id;
      }
      setActiveId(prev => prev === current ? prev : current);
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => scroller.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToSection = (id) => {
    const scroller = scrollRef.current;
    const el = document.getElementById(`sec-${id}`);
    if (!scroller || !el) return;
    setActiveId(id);
    programmaticUntil.current = Date.now() + 900;
    scroller.scrollTo({ top: el.offsetTop - 90, behavior: 'smooth' });
  };

  if (empty) return (
    <Page title="Meu painel" subtitle="Visão pessoal do seu desempenho">
      <EmptyState icon="dashboard" title="Sem dados ainda" desc="Quando você começar a atender e vender, suas métricas aparecerão aqui." />
    </Page>
  );

  // ---------- mock data (deterministic seeded random) ----------
  const seed = (i, j=0) => Math.abs(Math.sin(i*7.7 + j*3.3) * 10000) % 1;
  const days = ['seg','ter','qua','qui','sex','sáb','dom'];
  const dayLabels = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  const series7 = days.map((d,i) => ({
    day: dayLabels[i],
    conv:   Math.round(38 + seed(i) * 42 + (i<5 ? 22 : -10)),
    sales:  Math.round(2 + seed(i,2) * 6 + (i<5 ? 1 : 0)),
    revenue:Math.round((1800 + seed(i,3) * 2400 + (i<5 ? 1200 : 0)) * 1),
  }));
  const totConv  = series7.reduce((s,d)=>s+d.conv,0);
  const totSales = series7.reduce((s,d)=>s+d.sales,0);
  const totRev   = series7.reduce((s,d)=>s+d.revenue,0);

  const hours = Array.from({length:12}, (_,h)=>h+8);
  const heatmap = days.map((d,di) => hours.map((h,hi) => {
    const peak = (h>=10 && h<=12) || (h>=14 && h<=17) ? 1 : 0.45;
    const wk = di<5 ? 1 : 0.45;
    const noise = seed(di*13 + hi*5);
    return Math.round((4 + noise*8) * peak * wk);
  }));
  const heatMax = Math.max(...heatmap.flat());

  return (
    <Page title={null} subtitle={null} padded={false}>
      <div ref={scrollRef} className="page scroll" style={{flex:1, overflow:'auto', display:'flex', flexDirection:'column', gap:'var(--pad-4)', scrollBehavior:'smooth'}}>

        {/* ============ HEADER ============ */}
        <div className="row" style={{gap:14, flexWrap:'wrap'}}>
          <div style={{flex:1, minWidth:260}}>
            <div style={{fontSize:'var(--type-2xl)', fontWeight:600, letterSpacing:'-.02em', lineHeight:1.1}}>
              Olá, {me.name.split(' ')[0]} <span style={{display:'inline-block', transform:'rotate(8deg)'}}>👋</span>
            </div>
            <div className="muted" style={{fontSize:'var(--type-md)', marginTop:4}}>
              Aqui está seu desempenho — atendimento e vendas em um só lugar.
            </div>
          </div>
          <div className="row" style={{gap:6}}>
            <SegBtn options={[['hoje','Hoje'],['semana','7 dias'],['mes','Mês']]} value={period} onChange={setPeriod}/>
            <div className="btn"><Ic name="agenda" size={14}/> 12 — 18 mai</div>
            <button className="btn"><Ic name="arrow-up-right" size={14}/> Exportar</button>
          </div>
        </div>

        {/* Sticky anchor tabs */}
        <AnchorTabs sections={SECTIONS} activeId={activeId} onSelect={scrollToSection}/>

        {/* ============ VISÃO GERAL ============ */}
        <section id="sec-geral" style={{scrollMarginTop:90, display:'flex', flexDirection:'column', gap:'var(--pad-4)'}}>
          <SectionLabel icon="dashboard" title="VISÃO GERAL" sub="Resumo combinado de atendimento e comercial"/>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'var(--pad-3)'}}>
            {loading ? Array.from({length:4}).map((_,i)=><BigStatSkeleton key={i}/>) : <>
            <BigStat icon="inbox" label="Conversas atendidas" value={heavy ? '1.284' : '128'} delta="+12%" trend="up" foot="últimos 7 dias"/>
            <BigStat icon="commercial" label="Vendas no mês" value="22" delta="+5" trend="up" foot="R$ 35.200 faturado"/>
            <BigStat icon="sparkles" label="Resolução IA" value="86%" delta="+4 pp" trend="up" foot="sem transferir" accent="ai"/>
            <BigStat icon="reports" label="Meta mensal" value="88%" foot="R$ 35.200 / R$ 40.000" progress={me.vendido/me.meta}/>
            </>}
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:'var(--pad-3)'}}>
            {loading ? <><BlockSkeleton h={300}/><BlockSkeleton h={300}/></> : <>
            <TrendCard series7={series7} totConv={totConv} totSales={totSales} totRev={totRev} period={period}/>
            <CSATCard/>
            </>}
          </div>
        </section>

        {/* ============ ATENDIMENTO ============ */}
        <section id="sec-atendimento" style={{scrollMarginTop:90, display:'flex', flexDirection:'column', gap:'var(--pad-4)'}}>
          <SectionLabel icon="inbox" title="ATENDIMENTO" sub="Suas conversas, tempo de resposta e qualidade"/>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'var(--pad-3)'}}>
            {loading ? Array.from({length:4}).map((_,i)=><BigStatSkeleton key={i}/>) : <>
            <BigStat icon="inbox" label="Conversas atendidas" value={heavy ? '1.284' : '128'} delta="+12%" trend="up" foot="vs. semana anterior"/>
            <BigStat icon="clock" label="Tempo médio de resposta" value="1m 42s" delta="-18s" trend="up" foot="meta < 3 min"/>
            <BigStat icon="sparkles" label="Resolução sem transferir" value="86%" delta="+4 pp" trend="up" foot={`${heavy?'1.104':'110'} de ${heavy?'1.284':'128'}`} accent="ai"/>
            <BigStat icon="leads" label="Avaliação CSAT" value="4,8" delta="+0,2" trend="up" foot="32 avaliações" ratingMax={5}/>
            </>}
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1.1fr 1fr 1fr', gap:'var(--pad-3)'}}>
            {loading ? <><BlockSkeleton h={280}/><BlockSkeleton h={280}/><BlockSkeleton h={280}/></> : <>
            <ChannelCard heavy={heavy}/>
            <TopQuestionsCard/>
            <StatusBreakdownCard/>
            </>}
          </div>
        </section>

        {/* ============ COMERCIAL ============ */}
        <section id="sec-comercial" style={{scrollMarginTop:90, display:'flex', flexDirection:'column', gap:'var(--pad-4)'}}>
          <SectionLabel icon="commercial" title="COMERCIAL" sub="Suas vendas, conversões e ticket médio"/>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'var(--pad-3)'}}>
            {loading ? Array.from({length:4}).map((_,i)=><BigStatSkeleton key={i}/>) : <>
            <BigStat icon="commercial" label="Vendas fechadas no mês" value="22" delta="+5" trend="up" foot="vs. mês anterior"/>
            <BigStat icon="finance" label="Faturamento" value="R$ 35.200" delta="+8,2%" trend="up" foot="ticket médio R$ 1.600"/>
            <BigStat icon="leads" label="Taxa de conversão" value="34%" delta="+3 pp" trend="up" foot="leads → vendas"/>
            <BigStat icon="reports" label="Meta mensal" value="88%" foot="R$ 35.200 / R$ 40.000" progress={me.vendido/me.meta}/>
            </>}
          </div>
        </section>

        {/* ============ MAPAS DE CALOR — lado a lado ============ */}
        <section id="sec-mapas" style={{scrollMarginTop:90, display:'flex', flexDirection:'column', gap:'var(--pad-4)'}}>
          <SectionLabel icon="reports" title="MAPAS DE CALOR" sub="Quando você atende mais e quando mais converte"/>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--pad-3)'}}>
            {loading ? <><BlockSkeleton h={320}/><BlockSkeleton h={320}/></> : <>
            <AttendanceHeatCard heatmap={heatmap} heatMax={heatMax} hours={hours} dayLabels={dayLabels}/>
            <SalesHeatCard hours={hours} dayLabels={dayLabels}/>
            </>}
          </div>
        </section>

        {/* ============ FUNIL & PIPELINE ============ */}
        <section id="sec-funil" style={{scrollMarginTop:90, display:'flex', flexDirection:'column', gap:'var(--pad-4)'}}>
          <SectionLabel icon="leads" title="FUNIL & PIPELINE" sub="Conversão por etapa e oportunidades em aberto"/>
          <div style={{display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:'var(--pad-3)'}}>
            {loading ? <><BlockSkeleton h={340}/><BlockSkeleton h={340}/></> : <>
            <FunnelCard/>
            <GoalProgressCard me={me}/>
            </>}
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr', gap:'var(--pad-3)'}}>
            {loading ? <BlockSkeleton h={260}/> : <PipelineCard/>}
          </div>
        </section>

        {/* ============ AGENDA & CONVERSAS ============ */}
        <section id="sec-agenda" style={{scrollMarginTop:90, display:'flex', flexDirection:'column', gap:'var(--pad-4)'}}>
          <SectionLabel icon="agenda" title="AGENDA & CONVERSAS" sub="Próximos compromissos e mensagens recentes"/>
          <div style={{display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:'var(--pad-3)'}}>
            {loading ? <><BlockSkeleton h={360}/><BlockSkeleton h={360}/></> : <>
            <RecentConversationsCard/>
            <UpcomingScheduleCard/>
            </>}
          </div>
        </section>

        {/* ============ ÚLTIMAS VENDAS ============ */}
        <section id="sec-vendas" style={{scrollMarginTop:90, display:'flex', flexDirection:'column', gap:'var(--pad-4)'}}>
          <SectionLabel icon="finance" title="ÚLTIMAS VENDAS" sub="Negócios que você fechou nos últimos 7 dias"/>
          <div className="card" style={{padding:0}}>
            <div className="row" style={{padding:'14px 18px', borderBottom:'1px solid var(--border)'}}>
              <div>
                <div className="h3">Histórico de vendas</div>
                <div className="muted" style={{fontSize:'var(--type-sm)', marginTop:2}}>Negócios concluídos por você</div>
              </div>
              <div className="spacer"/>
            <div className="row" style={{gap:8}}>
              <div className="input" style={{maxWidth:240, height:32, display:'inline-flex', alignItems:'center', gap:6}}>
                <Ic name="search" size={14}/>
                <input placeholder="Buscar..." style={{border:'none', background:'transparent', flex:1, outline:'none', font:'inherit', color:'var(--text)'}}/>
              </div>
              <select className="input" style={{height:32, width:120}} defaultValue=""><option value="">Status</option><option>Fechada</option><option>Em curso</option></select>
            </div>
          </div>
          <table className="table">
            <thead><tr><th>ID</th><th>Cliente</th><th>Serviço/Produto</th><th>Origem</th><th>Data</th><th style={{textAlign:'right'}}>Valor</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {loading ? Array.from({length: skelCount('atend-dash', 6)}).map((_,i)=>(
                <tr key={i}>
                  <td><Skeleton w={40} h={11}/></td>
                  <td><div className="row" style={{gap:8}}><Skeleton circle w={28} h={28}/><Skeleton w={120} h={12}/></div></td>
                  <td><Skeleton w={140} h={11}/></td>
                  <td><Skeleton w={16} h={16} r={4}/></td>
                  <td><Skeleton w={80} h={11}/></td>
                  <td style={{textAlign:'right'}}><Skeleton w={70} h={12} style={{marginLeft:'auto'}}/></td>
                  <td><Skeleton w={64} h={18} r={6}/></td>
                  <td style={{textAlign:'right'}}><Skeleton w={24} h={24} r={6} style={{marginLeft:'auto'}}/></td>
                </tr>
              )) : [
                {id:'#3812', client:'Júlia Mendes',     prod:'Pacote Noiva',           src:'whatsapp',  date:'18 mai 2026', val:2450,  st:'fechada'},
                {id:'#3811', client:'Roberto Lima',     prod:'Consultoria Comercial',  src:'whatsapp',  date:'17 mai 2026', val:5500,  st:'fechada'},
                {id:'#3810', client:'Fátima Coelho',    prod:'Pacote Pré-Sal Premium', src:'instagram', date:'17 mai 2026', val:3890,  st:'fechada'},
                {id:'#3809', client:'Patrícia Furtado', prod:'Drenagem · 10 sessões',  src:'whatsapp',  date:'16 mai 2026', val:1500,  st:'fechada'},
                {id:'#3808', client:'Daniel Gerente',   prod:'Combo Spa Day',          src:'whatsapp',  date:'15 mai 2026', val:890,   st:'fechada'},
                {id:'#3807', client:'Cesar Veículos',   prod:'Pacote Noiva',           src:'whatsapp',  date:'15 mai 2026', val:2450,  st:'pendente'},
              ].map(r => (
                <tr key={r.id}>
                  <td className="tnum muted" style={{fontSize:'var(--type-sm)'}}>{r.id}</td>
                  <td><div className="row" style={{gap:8}}><Avatar name={r.client} size="sm"/><span style={{fontWeight:500}}>{r.client}</span></div></td>
                  <td className="muted">{r.prod}</td>
                  <td><ChannelIcon ch={r.src}/></td>
                  <td className="muted tnum" style={{fontSize:'var(--type-sm)'}}>{r.date}</td>
                  <td className="tnum" style={{textAlign:'right', fontWeight:600}}>R$ {r.val.toLocaleString('pt-BR')}</td>
                  <td>{r.st==='fechada' ? <span className="badge badge-success">Fechada</span> : <span className="badge badge-warning">Pendente</span>}</td>
                  <td style={{textAlign:'right'}}><span className="btn btn-ghost btn-icon" title="Ver"><Ic name="arrow-right" size={14}/></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </section>

        <div style={{height:8}}/>
      </div>
    </Page>
  );
}

/* ----------------------------------------------------------------
   Reusable sub-components
   ---------------------------------------------------------------- */

function AnchorTabs({ sections, activeId, onSelect }) {
  const refs = React.useRef({});
  const wrapRef = React.useRef(null);
  const [bar, setBar] = React.useState({ left: 0, width: 0, ready: false });

  const recompute = React.useCallback(() => {
    const el = refs.current[activeId];
    const wrap = wrapRef.current;
    if (!el || !wrap) return;
    setBar({ left: el.offsetLeft, width: el.offsetWidth, ready: true });
    // keep active tab in view horizontally
    const wRect = wrap.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    if (eRect.left < wRect.left + 20) wrap.scrollTo({ left: el.offsetLeft - 20, behavior: 'smooth' });
    else if (eRect.right > wRect.right - 20) wrap.scrollTo({ left: el.offsetLeft + el.offsetWidth - wrap.clientWidth + 20, behavior: 'smooth' });
  }, [activeId]);

  React.useLayoutEffect(() => { recompute(); }, [recompute]);
  React.useEffect(() => {
    const onResize = () => recompute();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [recompute]);

  return (
    <div style={{
      position:'sticky', top:0, zIndex:5,
      background:'var(--bg)',
      margin:'0 calc(-1 * var(--pad-5))',
      padding:'10px var(--pad-5) 0',
    }}>
      <div ref={wrapRef} className="anchor-tabs-scroll" style={{
        position:'relative',
        display:'flex', gap:2,
        borderBottom:'1px solid var(--border)',
        overflowX:'auto', overflowY:'hidden',
        scrollbarWidth:'none',
      }}>
        {sections.map(s => {
          const active = activeId === s.id;
          return (
            <button
              key={s.id}
              ref={el => { if (el) refs.current[s.id] = el; }}
              onClick={() => onSelect(s.id)}
              style={{
                display:'inline-flex', alignItems:'center', gap:7,
                padding:'10px 14px', whiteSpace:'nowrap',
                background:'transparent', border:0, cursor:'pointer',
                font:'inherit',
                fontSize:'var(--type-sm)',
                fontWeight: active ? 600 : 500,
                color: active ? 'var(--accent-700)' : 'var(--text-muted)',
                borderRadius:0,
                transition:'color .2s',
              }}
              onMouseEnter={(e)=>{ if(!active) e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={(e)=>{ if(!active) e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <Ic name={s.icon} size={14}/>
              {s.label}
            </button>
          );
        })}
        {/* animated underline */}
        <div style={{
          position:'absolute', bottom:0, height:2,
          background:'var(--accent)',
          borderRadius:2,
          left: bar.left,
          width: bar.width,
          opacity: bar.ready ? 1 : 0,
          transition: 'left .42s cubic-bezier(.22,.61,.36,1), width .42s cubic-bezier(.22,.61,.36,1), opacity .15s',
          pointerEvents:'none',
        }}/>
      </div>
    </div>
  );
}

function AttendanceHeatCard({ heatmap, heatMax, hours, dayLabels }) {
  return (
    <div className="card card-pad">
      <div className="row">
        <div>
          <div className="h3">Atendimentos por hora</div>
          <div className="muted" style={{fontSize:'var(--type-sm)', marginTop:2}}>Seus horários de pico de mensagens</div>
        </div>
        <div className="spacer"/>
        <span className="badge badge-accent"><Ic name="clock" size={11}/> 15h–17h</span>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'34px repeat(12, 1fr)', gap:3, marginTop:18}}>
        <div/>
        {hours.map(h => (
          <div key={h} style={{textAlign:'center', fontSize:10, color:'var(--text-faint)', fontVariantNumeric:'tabular-nums'}}>{h}h</div>
        ))}
        {heatmap.map((row,di) => (
          <React.Fragment key={di}>
            <div style={{fontSize:'var(--type-xs)', color:'var(--text-muted)', fontWeight:500, display:'flex', alignItems:'center'}}>{dayLabels[di]}</div>
            {row.map((v,hi) => {
              const t = v / heatMax;
              return (
                <div key={hi} title={`${dayLabels[di]} ${hours[hi]}h — ${v} conversas`}
                  style={{
                    aspectRatio:'1.4', borderRadius:5,
                    background:`color-mix(in oklab, var(--accent) ${Math.round(8 + t*82)}%, var(--surface))`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:10, fontWeight:600,
                    color: t > 0.55 ? 'white' : 'var(--text-muted)',
                    cursor:'default',
                  }}>
                  {v}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <div className="row" style={{marginTop:14, gap:10, fontSize:'var(--type-xs)', color:'var(--text-muted)', flexWrap:'wrap'}}>
        <span>Intensidade:</span>
        {[0.1,0.3,0.55,0.8,1].map((t,i)=>(
          <span key={i} style={{display:'inline-flex', alignItems:'center', gap:4}}>
            <span style={{width:16, height:12, borderRadius:3, background:`color-mix(in oklab, var(--accent) ${Math.round(8+t*82)}%, var(--surface))`, border:'1px solid var(--border)'}}/>
            {i===0?'baixa':i===4?'alta':''}
          </span>
        ))}
        <div className="spacer"/>
        <span>Total: <strong className="tnum">{heatmap.flat().reduce((a,b)=>a+b,0)}</strong></span>
      </div>
    </div>
  );
}

function SectionLabel({ icon, title, sub }) {
  return (
    <div className="row" style={{gap:10, marginTop:6, marginBottom:-4}}>
      <span style={{width:28, height:28, borderRadius:8, background:'var(--accent-soft)', color:'var(--accent-700)', display:'inline-flex', alignItems:'center', justifyContent:'center'}}>
        <Ic name={icon} size={14}/>
      </span>
      <div>
        <div style={{fontSize:11, fontWeight:700, letterSpacing:'.12em', color:'var(--text-faint)'}}>{title}</div>
        <div className="muted" style={{fontSize:'var(--type-sm)'}}>{sub}</div>
      </div>
    </div>
  );
}

function SegBtn({ options, value, onChange }) {
  return (
    <div className="row" style={{gap:0, background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:8, padding:3}}>
      {options.map(([id,l]) => (
        <div key={id} onClick={()=>onChange(id)}
          style={{
            padding:'4px 10px', fontSize:'var(--type-sm)', fontWeight:500, borderRadius:6, cursor:'default',
            background: value===id ? 'var(--surface)' : 'transparent',
            color:     value===id ? 'var(--text)'    : 'var(--text-muted)',
            boxShadow: value===id ? 'var(--shadow-sm)' : 'none',
          }}>{l}</div>
      ))}
    </div>
  );
}

function BigStat({ icon, label, value, delta, trend='up', foot, accent, progress, ratingMax }) {
  const isAI = accent==='ai';
  return (
    <div className="card" style={{padding:'var(--pad-4)', display:'flex', flexDirection:'column', gap:8, minHeight:128}}>
      <div className="row">
        <div className="muted" style={{fontSize:'var(--type-sm)', fontWeight:500}}>{label}</div>
        <div className="spacer"/>
        <span style={{width:30, height:30, borderRadius:9, display:'inline-flex', alignItems:'center', justifyContent:'center',
          background: isAI ? 'var(--ai-soft)' : 'var(--surface-3)',
          color:      isAI ? 'var(--ai-strong)' : 'var(--text-muted)'}}>
          <Ic name={icon} size={15}/>
        </span>
      </div>
      <div className="tnum" style={{fontSize:'var(--type-3xl)', fontWeight:600, letterSpacing:'-.03em', lineHeight:1, color: isAI?'var(--ai-strong)':'var(--text)'}}>
        {value}
        {ratingMax && <span style={{fontSize:'var(--type-md)', color:'var(--text-faint)', marginLeft:6, fontWeight:500}}>/ {ratingMax}</span>}
      </div>
      <div className="row" style={{gap:6, marginTop:'auto'}}>
        {delta && (
          <span className="badge" style={{
            background: trend==='up' ? 'color-mix(in oklab, var(--accent) 14%, white)' : 'color-mix(in oklab, var(--hue-rose) 14%, white)',
            color:      trend==='up' ? 'var(--accent-700)' : '#9f1239'}}>
            {trend==='up' ? '▲' : '▼'} {delta}
          </span>
        )}
        {foot && <span className="muted" style={{fontSize:'var(--type-xs)'}}>{foot}</span>}
      </div>
      {progress != null && (
        <div className="bar" style={{marginTop:2}}><div style={{width:`${Math.min(100,progress*100)}%`}}/></div>
      )}
    </div>
  );
}

// Skeleton do card BigStat — mesma classe/medidas (dentro do mesmo grid)
function BigStatSkeleton() {
  return (
    <div className="card" style={{padding:'var(--pad-4)', display:'flex', flexDirection:'column', gap:8, minHeight:128}}>
      <div className="row">
        <Skeleton w="55%" h={12}/>
        <div className="spacer"/>
        <Skeleton w={30} h={30} r={9}/>
      </div>
      <Skeleton w={90} h={30}/>
      <div className="row" style={{gap:6, marginTop:'auto'}}>
        <Skeleton w={48} h={18} r={6}/>
        <Skeleton w={80} h={10}/>
      </div>
    </div>
  );
}

// Skeleton de bloco simples — preenche um card (charts/heatmaps/listas no mesmo grid)
function BlockSkeleton({ h = 300 }) {
  return (
    <div className="card card-pad" style={{display:'flex', flexDirection:'column', gap:12, minHeight:h}}>
      <div className="row">
        <div style={{flex:1, display:'flex', flexDirection:'column', gap:6}}>
          <Skeleton w="45%" h={14}/>
          <Skeleton w="65%" h={10}/>
        </div>
        <Skeleton w={70} h={22} r={999}/>
      </div>
      <Skeleton w="100%" h={h - 90} r={10} style={{marginTop:'auto'}}/>
    </div>
  );
}

function TrendCard({ series7, totConv, totSales, totRev, period }) {
  const max = Math.max(...series7.map(d => d.conv));
  const [hover, setHover] = React.useState(2); // start hovering Wed
  const d = series7[hover];
  return (
    <div className="card card-pad" style={{display:'flex', flexDirection:'column', gap:14}}>
      <div className="row">
        <div>
          <div className="muted" style={{fontSize:'var(--type-sm)', fontWeight:500}}>Atendimento & vendas — últimos 7 dias</div>
          <div className="row" style={{gap:12, marginTop:4, alignItems:'flex-end'}}>
            <div className="tnum" style={{fontSize:'var(--type-3xl)', fontWeight:600, letterSpacing:'-.03em', lineHeight:1}}>{totConv}</div>
            <div className="muted" style={{fontSize:'var(--type-sm)', paddingBottom:6}}>conversas</div>
            <div className="tnum" style={{fontSize:'var(--type-xl)', fontWeight:600, letterSpacing:'-.02em', paddingBottom:0, color:'var(--ai-strong)'}}>R$ {(totRev/1000).toFixed(1)}k</div>
            <div className="muted" style={{fontSize:'var(--type-sm)', paddingBottom:6}}>· {totSales} vendas</div>
          </div>
        </div>
        <div className="spacer"/>
        <div className="row" style={{gap:14, fontSize:'var(--type-xs)', color:'var(--text-muted)'}}>
          <span className="row" style={{gap:6}}><span style={{width:10, height:10, borderRadius:3, background:'var(--accent)'}}/>Conversas</span>
          <span className="row" style={{gap:6}}><span style={{width:10, height:10, borderRadius:3, background:'var(--ai)'}}/>Vendas (R$)</span>
        </div>
      </div>

      <div style={{position:'relative', height:200, padding:'0 4px'}}>
        {/* y grid */}
        {[0,0.25,0.5,0.75,1].map(t => (
          <div key={t} style={{position:'absolute', left:0, right:0, top:`${t*100}%`, borderTop:'1px dashed var(--border)'}}/>
        ))}
        <div style={{position:'absolute', inset:0, display:'flex', alignItems:'flex-end', gap:14}}>
          {series7.map((d,i)=>{
            const h = d.conv / max * 100;
            const hSales = d.revenue / Math.max(...series7.map(x=>x.revenue)) * 100 * 0.85;
            const active = i===hover;
            return (
              <div key={i} onMouseEnter={()=>setHover(i)} style={{flex:1, height:'100%', display:'flex', alignItems:'flex-end', gap:4, justifyContent:'center', position:'relative', cursor:'default'}}>
                <div style={{
                  width:14, height:`${h}%`, borderRadius:'4px 4px 0 0',
                  background: active ? 'var(--accent)' : 'color-mix(in oklab, var(--accent) 35%, var(--surface-3))',
                  transition:'background .15s',
                }}/>
                <div style={{
                  width:14, height:`${hSales}%`, borderRadius:'4px 4px 0 0',
                  background: active ? 'var(--ai)' : 'color-mix(in oklab, var(--ai) 35%, var(--surface-3))',
                  transition:'background .15s',
                }}/>
                {active && (
                  <div style={{position:'absolute', bottom:`calc(${Math.max(h,hSales)}% + 8px)`, left:'50%', transform:'translateX(-50%)',
                    background:'var(--text)', color:'var(--surface)', borderRadius:8, padding:'8px 10px', whiteSpace:'nowrap',
                    fontSize:'var(--type-xs)', boxShadow:'var(--shadow-md)', zIndex:5}}>
                    <div style={{fontWeight:600, marginBottom:3}}>{d.day} · 2026</div>
                    <div className="tnum">● {d.conv} conversas</div>
                    <div className="tnum">● R$ {d.revenue.toLocaleString('pt-BR')}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="row" style={{padding:'0 4px'}}>
        {series7.map((d,i)=>(
          <div key={i} style={{flex:1, textAlign:'center', fontSize:'var(--type-xs)', color: i===hover ? 'var(--text)' : 'var(--text-faint)', fontWeight: i===hover?600:500}}>{d.day}</div>
        ))}
      </div>
    </div>
  );
}

function CSATCard() {
  const value = 86; // percent
  return (
    <div className="card card-pad" style={{display:'flex', flexDirection:'column'}}>
      <div className="row">
        <div className="muted" style={{fontSize:'var(--type-sm)', fontWeight:500}}>Taxa de sucesso</div>
        <div className="spacer"/>
        <div className="muted" style={{fontSize:'var(--type-xs)'}}>últimos 7 dias</div>
      </div>

      <SemiDonut value={value}/>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:14}}>
        <div className="card" style={{padding:'10px 12px', background:'var(--surface-2)'}}>
          <div className="row" style={{gap:6}}>
            <span style={{width:24, height:24, borderRadius:7, background:'var(--accent-soft)', color:'var(--accent-700)', display:'inline-flex', alignItems:'center', justifyContent:'center'}}><Ic name="arrow-up-right" size={12}/></span>
            <div className="muted" style={{fontSize:'var(--type-xs)'}}>Resolvidas</div>
          </div>
          <div className="tnum" style={{fontSize:'var(--type-lg)', fontWeight:600, marginTop:4}}>110</div>
          <div className="badge badge-success" style={{marginTop:2}}>+12%</div>
        </div>
        <div className="card" style={{padding:'10px 12px', background:'var(--surface-2)'}}>
          <div className="row" style={{gap:6}}>
            <span style={{width:24, height:24, borderRadius:7, background:'var(--ai-soft)', color:'var(--ai-strong)', display:'inline-flex', alignItems:'center', justifyContent:'center'}}><Ic name="commercial" size={12}/></span>
            <div className="muted" style={{fontSize:'var(--type-xs)'}}>Convertidas</div>
          </div>
          <div className="tnum" style={{fontSize:'var(--type-lg)', fontWeight:600, marginTop:4}}>22</div>
          <div className="badge badge-success" style={{marginTop:2}}>+8,2%</div>
        </div>
      </div>
    </div>
  );
}

function SemiDonut({ value }) {
  const size = 200, r = 76, t = 16;
  const cx = size/2, cy = size/2 + 10;
  const C = Math.PI * r;
  const len = value/100 * C;
  return (
    <div style={{position:'relative', display:'flex', justifyContent:'center', marginTop:6}}>
      <svg width={size} height={size/1.5} viewBox={`0 0 ${size} ${size/1.5}`}>
        <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`} stroke="var(--surface-3)" strokeWidth={t} fill="none" strokeLinecap="round"/>
        <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`} stroke="var(--accent)" strokeWidth={t} fill="none" strokeLinecap="round" strokeDasharray={`${len} ${C-len}`}/>
        {/* dotted ticks */}
        {Array.from({length:24}).map((_,i)=>{
          const a = Math.PI + (i/23)*Math.PI;
          const x1 = cx + Math.cos(a) * (r+t-2);
          const y1 = cy + Math.sin(a) * (r+t-2);
          const x2 = cx + Math.cos(a) * (r+t+6);
          const y2 = cy + Math.sin(a) * (r+t+6);
          const on = i/23*100 <= value;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={on ? 'var(--accent)' : 'var(--surface-3)'} strokeWidth={2.5} strokeLinecap="round" opacity={on?.85:.6}/>;
        })}
      </svg>
      <div style={{position:'absolute', top:60, left:0, right:0, textAlign:'center'}}>
        <div className="tnum" style={{fontSize:'var(--type-3xl)', fontWeight:600, letterSpacing:'-.03em'}}>{value}%</div>
        <div className="muted" style={{fontSize:'var(--type-sm)'}}>Resolução média</div>
      </div>
    </div>
  );
}

function ChannelCard({ heavy }) {
  const data = [
    {l:'WhatsApp',  v:74, n: heavy?'949':'95', c:'#25d366', ic:'whatsapp'},
    {l:'Instagram', v:18, n: heavy?'231':'23', c:'#e4405f', ic:'instagram'},
    {l:'Facebook',  v: 8, n: heavy?'104':'10', c:'#1877f2', ic:'facebook'},
  ];
  return (
    <div className="card card-pad">
      <div className="h3">Conversas por canal</div>
      <div className="muted" style={{fontSize:'var(--type-sm)', marginTop:2}}>Distribuição dos seus atendimentos</div>
      <div className="col" style={{gap:10, marginTop:14}}>
        {data.map(r => (
          <div key={r.l}>
            <div className="row" style={{gap:8, marginBottom:5}}>
              <span style={{width:26, height:26, borderRadius:7, background:`color-mix(in oklab, ${r.c} 14%, var(--surface))`, color:r.c, display:'inline-flex', alignItems:'center', justifyContent:'center'}}>
                <Ic name={r.ic} size={14}/>
              </span>
              <span style={{fontWeight:500, fontSize:'var(--type-sm)'}}>{r.l}</span>
              <div className="spacer"/>
              <span className="muted tnum" style={{fontSize:'var(--type-xs)'}}>{r.n}</span>
              <span className="tnum" style={{fontWeight:600, fontSize:'var(--type-sm)', minWidth:38, textAlign:'right'}}>{r.v}%</span>
            </div>
            <div className="bar"><div style={{width:`${r.v}%`, background:r.c}}/></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopQuestionsCard() {
  const qs = [
    {q:'Quanto custa a limpeza de pele?', n:42},
    {q:'Vocês atendem aos sábados?',      n:31},
    {q:'Aceitam parcelamento?',           n:24},
    {q:'Qual o endereço?',                n:18},
    {q:'Pacote noiva, valores',           n:14},
  ];
  const max = qs[0].n;
  return (
    <div className="card card-pad">
      <div className="row">
        <div className="h3">Mais perguntados</div>
        <div className="spacer"/>
        <span className="badge badge-ai"><Ic name="sparkles" size={11}/> IA</span>
      </div>
      <div className="muted" style={{fontSize:'var(--type-sm)', marginTop:2}}>Top perguntas que você recebeu</div>
      <div className="col" style={{gap:8, marginTop:12}}>
        {qs.map((q,i)=>(
          <div key={i} className="row" style={{gap:10}}>
            <span style={{width:18, color:'var(--text-faint)', fontSize:'var(--type-sm)', fontWeight:600}}>{i+1}</span>
            <span style={{flex:1, fontSize:'var(--type-sm)'}}>{q.q}</span>
            <div style={{width:64}} className="bar"><div style={{width:`${q.n/max*100}%`}}/></div>
            <span className="tnum" style={{minWidth:28, textAlign:'right', fontSize:'var(--type-sm)', fontWeight:600}}>{q.n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBreakdownCard() {
  const items = [
    {l:'Em andamento', v:12, c:'var(--accent)'},
    {l:'Aguardando você', v:3, c:'var(--hue-amber)'},
    {l:'Resolvidas hoje', v:34, c:'var(--ai)'},
    {l:'Transferidas', v:6, c:'var(--hue-blue)'},
  ];
  const tot = items.reduce((s,i)=>s+i.v,0);
  return (
    <div className="card card-pad">
      <div className="h3">Status agora</div>
      <div className="muted" style={{fontSize:'var(--type-sm)', marginTop:2}}>Snapshot da sua caixa de entrada</div>
      <div style={{display:'flex', height:10, borderRadius:5, overflow:'hidden', marginTop:14, background:'var(--surface-3)'}}>
        {items.map((i,k)=>(<div key={k} style={{flex:i.v, background:i.c}}/>))}
      </div>
      <div className="col" style={{gap:8, marginTop:14}}>
        {items.map((i,k)=>(
          <div key={k} className="row" style={{gap:10}}>
            <span style={{width:10, height:10, borderRadius:3, background:i.c}}/>
            <span style={{fontSize:'var(--type-sm)', flex:1}}>{i.l}</span>
            <span className="tnum muted" style={{fontSize:'var(--type-xs)'}}>{(i.v/tot*100).toFixed(0)}%</span>
            <span className="tnum" style={{fontWeight:600, fontSize:'var(--type-sm)', minWidth:26, textAlign:'right'}}>{i.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FunnelCard() {
  const stages = [
    {l:'Leads recebidos',    v:64, c:'var(--hue-orange)'},
    {l:'Contato feito',      v:54, c:'var(--hue-amber)'},
    {l:'Qualificados',       v:38, c:'var(--hue-teal)'},
    {l:'Proposta enviada',   v:29, c:'var(--hue-blue)'},
    {l:'Negociação',         v:22, c:'var(--hue-violet)'},
    {l:'Fechadas',           v:22, c:'var(--accent)'},
  ];
  const max = stages[0].v;
  return (
    <div className="card card-pad">
      <div className="row">
        <div>
          <div className="h3">Seu funil de vendas</div>
          <div className="muted" style={{fontSize:'var(--type-sm)', marginTop:2}}>Conversão por etapa — últimos 30 dias</div>
        </div>
        <div className="spacer"/>
        <span className="badge badge-success">Conversão geral 34%</span>
      </div>
      <div className="col" style={{gap:10, marginTop:16}}>
        {stages.map((s,i)=>{
          const w = s.v / max * 100;
          const next = stages[i+1];
          const drop = next ? Math.round((1 - next.v/s.v)*100) : null;
          return (
            <div key={i}>
              <div className="row" style={{gap:10, marginBottom:4}}>
                <span style={{fontSize:'var(--type-sm)', fontWeight:500, flex:1}}>{s.l}</span>
                <span className="tnum muted" style={{fontSize:'var(--type-xs)'}}>{(s.v/max*100).toFixed(0)}%</span>
                <span className="tnum" style={{fontWeight:600, fontSize:'var(--type-sm)', minWidth:34, textAlign:'right'}}>{s.v}</span>
              </div>
              <div style={{height:14, background:'var(--surface-3)', borderRadius:6, overflow:'hidden'}}>
                <div style={{height:'100%', width:`${w}%`, background:s.c, transition:'width .3s'}}/>
              </div>
              {drop != null && drop > 0 && (
                <div className="muted" style={{fontSize:'var(--type-xs)', marginTop:3, paddingLeft:2}}>↘ {drop}% perda para próxima etapa</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GoalProgressCard({ me }) {
  const pct = me.vendido / me.meta;
  const remaining = me.meta - me.vendido;
  return (
    <div className="card card-pad" style={{display:'flex', flexDirection:'column', gap:12}}>
      <div className="row">
        <div>
          <div className="h3">Meta de maio</div>
          <div className="muted" style={{fontSize:'var(--type-sm)', marginTop:2}}>Faltam 6 dias para o fechamento</div>
        </div>
        <div className="spacer"/>
        <span className="badge badge-success">No ritmo</span>
      </div>

      <div className="row" style={{gap:12, alignItems:'baseline'}}>
        <div className="tnum" style={{fontSize:'var(--type-3xl)', fontWeight:600, letterSpacing:'-.03em', lineHeight:1}}>
          R$ {(me.vendido/1000).toFixed(1)}k
        </div>
        <div className="muted" style={{fontSize:'var(--type-sm)'}}>de R$ {(me.meta/1000).toFixed(0)}k</div>
      </div>

      <div style={{position:'relative', height:14, background:'var(--surface-3)', borderRadius:8, overflow:'hidden'}}>
        <div style={{position:'absolute', left:0, top:0, bottom:0, width:`${pct*100}%`, background:'linear-gradient(90deg, var(--accent), color-mix(in oklab, var(--accent) 70%, var(--ai)))', borderRadius:8}}/>
        <div style={{position:'absolute', left:'80%', top:-4, bottom:-4, width:2, background:'var(--text-muted)', opacity:.4}}/>
      </div>
      <div className="row" style={{fontSize:'var(--type-xs)', color:'var(--text-faint)'}}>
        <span className="tnum">0</span>
        <div className="spacer"/>
        <span className="tnum" style={{color:'var(--text-muted)'}}>● ideal hoje: R$ 32k</span>
        <div className="spacer"/>
        <span className="tnum">R$ {(me.meta/1000).toFixed(0)}k</span>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:4}}>
        <KVCard label="Faltam" value={`R$ ${(remaining/1000).toFixed(1)}k`} foot="para bater a meta"/>
        <KVCard label="Comissão prevista" value="R$ 1.760" foot="5% sobre vendas" accent/>
      </div>

      <div style={{padding:'10px 12px', borderRadius:10, background:'var(--ai-soft)', border:'1px solid color-mix(in oklab, var(--ai) 25%, var(--border))', display:'flex', gap:10, alignItems:'flex-start'}}>
        <Ic name="sparkles" size={16} style={{color:'var(--ai-strong)', flexShrink:0, marginTop:2}}/>
        <div style={{fontSize:'var(--type-sm)', color:'var(--ai-strong)', lineHeight:1.4}}>
          <strong>Dica da IA:</strong> 4 leads em "Proposta enviada" estão parados há mais de 3 dias. Vale um follow-up — pode garantir ~R$ 7,5k.
        </div>
      </div>
    </div>
  );
}

function KVCard({ label, value, foot, accent }) {
  return (
    <div className="card" style={{padding:'10px 12px', background: accent ? 'var(--accent-soft)' : 'var(--surface-2)', borderColor: accent ? 'color-mix(in oklab, var(--accent) 30%, var(--border))':'var(--border)'}}>
      <div className="muted" style={{fontSize:'var(--type-xs)', color: accent?'var(--accent-700)':'var(--text-muted)'}}>{label}</div>
      <div className="tnum" style={{fontSize:'var(--type-lg)', fontWeight:600, marginTop:2, color: accent?'var(--accent-700)':'var(--text)'}}>{value}</div>
      <div className="muted" style={{fontSize:'var(--type-xs)', marginTop:1}}>{foot}</div>
    </div>
  );
}

function PipelineCard() {
  const items = [
    {l:'PROSPECÇÃO',     n:8,  v:21340, c:'var(--hue-orange)'},
    {l:'QUALIFICAÇÃO',   n:5,  v:14250, c:'var(--hue-amber)'},
    {l:'1º CONTATO',     n:6,  v:18900, c:'var(--hue-teal)'},
    {l:'PROPOSTA',       n:4,  v:12400, c:'var(--hue-blue)'},
    {l:'NEGOCIAÇÃO',     n:3,  v:11500, c:'var(--hue-violet)'},
  ];
  const tot = items.reduce((s,i)=>s+i.v,0);
  return (
    <div className="card card-pad">
      <div className="row">
        <div>
          <div className="h3">Pipeline em aberto</div>
          <div className="muted" style={{fontSize:'var(--type-sm)', marginTop:2}}>Valor potencial nas suas oportunidades</div>
        </div>
      </div>
      <div className="tnum" style={{fontSize:'var(--type-3xl)', fontWeight:600, letterSpacing:'-.03em', marginTop:12}}>
        R$ {(tot/1000).toFixed(1)}k
      </div>
      <div className="muted" style={{fontSize:'var(--type-xs)', marginBottom:14}}>26 oportunidades · valor médio R$ 3,1k</div>

      <div className="col" style={{gap:8}}>
        {items.map((s,i)=>(
          <div key={i} className="row" style={{gap:10, padding:'10px 12px', border:'1px solid var(--border)', borderRadius:8}}>
            <span style={{width:6, height:24, borderRadius:3, background:s.c}}/>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:'var(--type-xs)', fontWeight:700, letterSpacing:'.08em', color:'var(--text-muted)'}}>{s.l}</div>
              <div className="muted" style={{fontSize:'var(--type-xs)', marginTop:2}}>{s.n} oportunidade{s.n>1?'s':''}</div>
            </div>
            <div className="tnum" style={{fontWeight:600, fontSize:'var(--type-sm)'}}>R$ {s.v.toLocaleString('pt-BR')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SalesHeatCard({ hours, dayLabels }) {
  // sales heatmap — independent values
  const data = dayLabels.map((d,di) => hours.map((h,hi)=>{
    const peak = (h>=10 && h<=11) || (h>=15 && h<=18) ? 1 : 0.35;
    const wk = di<5 ? 1 : 0.4;
    const noise = Math.abs(Math.sin(di*5 + hi*9)) ;
    return Math.round(noise * 4 * peak * wk);
  }));
  const max = Math.max(...data.flat(), 1);
  return (
    <div className="card card-pad">
      <div className="row">
        <div>
          <div className="h3">Mapa de calor · vendas por hora</div>
          <div className="muted" style={{fontSize:'var(--type-sm)', marginTop:2}}>Quando você mais converte</div>
        </div>
        <div className="spacer"/>
        <span className="badge badge-ai"><Ic name="sparkles" size={11}/> Pico ter–qui · 15h–17h</span>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'48px repeat(12, 1fr)', gap:3, marginTop:18}}>
        <div/>
        {hours.map(h => (
          <div key={h} style={{textAlign:'center', fontSize:10, color:'var(--text-faint)', fontVariantNumeric:'tabular-nums'}}>{h}h</div>
        ))}
        {data.map((row,di)=>(
          <React.Fragment key={di}>
            <div style={{fontSize:'var(--type-xs)', color:'var(--text-muted)', display:'flex', alignItems:'center'}}>{dayLabels[di]}</div>
            {row.map((v,hi)=>{
              const t = v / max;
              return (
                <div key={hi} title={`${dayLabels[di]} ${hours[hi]}h — ${v} vendas`}
                  style={{aspectRatio:'1.4', borderRadius:5, background:`color-mix(in oklab, var(--ai) ${Math.round(6 + t*82)}%, var(--surface))`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:10, fontWeight:600, color: t>0.55 ? 'white' : 'var(--text-muted)', cursor:'default'}}>
                  {v || ''}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function RecentConversationsCard() {
  const rows = (typeof CONVERSATIONS !== 'undefined' ? CONVERSATIONS : []).slice(0,6);
  return (
    <div className="card" style={{padding:0}}>
      <div className="row" style={{padding:'14px 18px', borderBottom:'1px solid var(--border)'}}>
        <div>
          <div className="h3">Conversas recentes</div>
          <div className="muted" style={{fontSize:'var(--type-sm)', marginTop:2}}>Últimas mensagens da sua caixa</div>
        </div>
        <div className="spacer"/>
        <a className="btn btn-ghost" style={{fontSize:'var(--type-sm)'}}>Ver todas <Ic name="arrow-right" size={13}/></a>
      </div>
      <div>
        {rows.map(c => (
          <div key={c.id} className="row" style={{padding:'12px 18px', borderBottom:'1px solid var(--border)', gap:12}}>
            <Avatar name={c.client} size="sm"/>
            <div style={{flex:1, minWidth:0}}>
              <div className="row" style={{gap:8}}>
                <span style={{fontWeight:500, fontSize:'var(--type-sm)'}}>{c.client}</span>
                <ChannelIcon ch={c.channel} size={12}/>
                {c.tag === 'PROSPECT' ? <span className="chip">Prospect</span> : <span className="chip chip-accent">Cliente</span>}
              </div>
              <div className="muted" style={{fontSize:'var(--type-xs)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{c.preview}</div>
            </div>
            {c.unread ? <span className="badge badge-accent">{c.unread}</span> : null}
            <span className="muted tnum" style={{fontSize:'var(--type-xs)'}}>{c.lastTime}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UpcomingScheduleCard() {
  const items = [
    {time:'10:00', date:'Hoje',     client:'Magno Vieira',     service:'Reunião comercial', tone:'var(--accent)'},
    {time:'14:30', date:'Hoje',     client:'Karla Zambelly',   service:'Limpeza de pele',   tone:'var(--hue-blue)'},
    {time:'09:00', date:'Amanhã',   client:'Patrícia Furtado', service:'Drenagem',          tone:'var(--hue-violet)'},
    {time:'11:30', date:'Amanhã',   client:'Daniel Gerente',   service:'Massagem',          tone:'var(--hue-teal)'},
    {time:'15:00', date:'Qui · 21', client:'Cesar Veículos',   service:'Apresentação',      tone:'var(--hue-orange)'},
  ];
  return (
    <div className="card" style={{padding:0}}>
      <div className="row" style={{padding:'14px 18px', borderBottom:'1px solid var(--border)'}}>
        <div>
          <div className="h3">Próximos compromissos</div>
          <div className="muted" style={{fontSize:'var(--type-sm)', marginTop:2}}>Sua agenda dos próximos dias</div>
        </div>
        <div className="spacer"/>
        <span className="badge badge-info">{items.length}</span>
      </div>
      <div className="col" style={{gap:0}}>
        {items.map((it,i)=>(
          <div key={i} className="row" style={{padding:'10px 18px', borderBottom: i<items.length-1 ? '1px solid var(--border)':'none', gap:14}}>
            <div style={{width:54, textAlign:'center'}}>
              <div className="tnum" style={{fontWeight:600, fontSize:'var(--type-md)'}}>{it.time}</div>
              <div className="muted" style={{fontSize:'var(--type-xs)'}}>{it.date}</div>
            </div>
            <div style={{width:3, alignSelf:'stretch', borderRadius:2, background:it.tone, opacity:.7}}/>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontWeight:500, fontSize:'var(--type-sm)'}}>{it.client}</div>
              <div className="muted" style={{fontSize:'var(--type-xs)', marginTop:1}}>{it.service}</div>
            </div>
            <span className="btn btn-ghost btn-icon"><Ic name="chevron-right" size={14}/></span>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { AtendenteDashboard, AnchorTabs, AttendanceHeatCard });
