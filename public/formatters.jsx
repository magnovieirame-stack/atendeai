// formatters.jsx — Smart input components with masks, validation and popups.
// Provides:
//   <CpfInput>, <CnpjInput>, <DocInput> (CPF/CNPJ auto)
//   <PhoneInput> (celular ou fixo)
//   <EmailInput> (com validação)
//   <MoneyInput> (R$ 0.000,00)
//   <DateInput> (popup calendário)
//   <TimeInput> (popup horários 15 em 15 min)
//   <CepInput> (busca endereço — simulado)
//
// Helpers globais:
//   Mask.cpf(v), Mask.cnpj(v), Mask.phone(v), Mask.cep(v), Mask.money(v)
//   isValidEmail(v), isValidCpf(v), isValidCnpj(v)
//   lookupCep(cep) → {logradouro, bairro, cidade, uf, complemento}
//
// Usage: <CpfInput value={f.cpf} onChange={v=>set('cpf',v)} /> (onChange recebe valor já formatado)

const { useState, useRef, useEffect, useCallback, useMemo } = React;

// ─────────────────────────────────────────── Máscaras ───────────────────────────────────────────
const onlyDigits = (s) => (s || '').replace(/\D+/g, '');

const Mask = {
  cpf: (v) => {
    const d = onlyDigits(v).slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
  },
  cnpj: (v) => {
    const d = onlyDigits(v).slice(0, 14);
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`;
    if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`;
    if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`;
    return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
  },
  phone: (v) => {
    const d = onlyDigits(v).slice(0, 11);
    if (d.length === 0) return '';
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
    if (d.length <= 10) {
      // Fixo: (00) 0000-0000
      return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
    }
    // Celular: (00) 0.0000-0000
    return `(${d.slice(0,2)}) ${d.slice(2,3)}.${d.slice(3,7)}-${d.slice(7)}`;
  },
  cep: (v) => {
    const d = onlyDigits(v).slice(0, 8);
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`;
    return `${d.slice(0,2)}.${d.slice(2,5)}-${d.slice(5)}`;
  },
  money: (v) => {
    const d = onlyDigits(v);
    if (!d) return '';
    const n = parseInt(d, 10);
    const reais = Math.floor(n / 100);
    const cents = String(n % 100).padStart(2, '0');
    return `${reais.toLocaleString('pt-BR')},${cents}`;
  },
  moneyToNumber: (v) => {
    if (typeof v === 'number') return v;
    const d = onlyDigits(v);
    return d ? parseInt(d, 10) / 100 : 0;
  },
};

// ─────────────────────────────────────────── Validação ────────────────────────────────────────
const isValidEmail = (v) => /^[\w.+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test((v || '').trim());

// R$ 1.256,23 — sempre 2 casas decimais
const formatBRL = (n, opts = {}) => {
  const num = typeof n === 'string' ? Mask.moneyToNumber(n) : Number(n || 0);
  const body = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return opts.noSymbol ? body : `R$ ${body}`;
};

const isValidCpf = (v) => {
  const d = onlyDigits(v);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(d[i]) * (10 - i);
  let r = (s * 10) % 11; if (r === 10) r = 0;
  if (r !== parseInt(d[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(d[i]) * (11 - i);
  r = (s * 10) % 11; if (r === 10) r = 0;
  return r === parseInt(d[10]);
};

const isValidCnpj = (v) => {
  const d = onlyDigits(v);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (base) => {
    const w = base.length === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    let s = 0;
    for (let i = 0; i < base.length; i++) s += parseInt(base[i]) * w[i];
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(d.slice(0,12)) === parseInt(d[12]) && calc(d.slice(0,13)) === parseInt(d[13]);
};

// ─────────────────────────────────────────── CEP API (simulado) ──────────────────────────────
const CEP_DB = {
  '60165121': { logradouro: 'Av. Beira Mar', bairro: 'Meireles',  cidade: 'Fortaleza', uf: 'CE' },
  '60150160': { logradouro: 'R. Barbosa de Freitas', bairro: 'Aldeota', cidade: 'Fortaleza', uf: 'CE' },
  '01310100': { logradouro: 'Av. Paulista',  bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP' },
  '20040020': { logradouro: 'Av. Rio Branco', bairro: 'Centro',   cidade: 'Rio de Janeiro', uf: 'RJ' },
  '40020010': { logradouro: 'R. Chile',       bairro: 'Centro',   cidade: 'Salvador', uf: 'BA' },
  '30130100': { logradouro: 'Av. Afonso Pena', bairro: 'Centro',  cidade: 'Belo Horizonte', uf: 'MG' },
};
async function lookupCep(cep) {
  const d = onlyDigits(cep);
  if (d.length !== 8) return null;
  // 1) API real (ViaCEP) — roda no navegador (viacep.com.br liberado no CSP do backend).
  try {
    const resp = await fetch(`https://viacep.com.br/ws/${d}/json/`, { headers: { Accept: 'application/json' } });
    if (resp.ok) {
      const j = await resp.json();
      if (j && !j.erro) return {
        logradouro: j.logradouro || '',
        bairro: j.bairro || '',
        cidade: j.localidade || '',
        uf: (j.uf || '').toUpperCase(),
        complemento: j.complemento || '',
      };
    }
  } catch (e) { /* offline/bloqueado → tenta a base local */ }
  // 2) Fallback offline: pequena base local de exemplo (se houver).
  if (CEP_DB[d]) return CEP_DB[d];
  // 3) Não achou: não preenche nada (deixa digitar) — sem inventar endereço.
  return null;
}

// ─────────────────────────────────────────── Base masked input ───────────────────────────────
function MaskedInput({ mask, value, defaultValue, onChange, validator, errorMsg, rightIcon, className, ...rest }) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(() => mask(defaultValue || ''));
  const [touched, setTouched] = useState(false);
  const display = controlled ? mask(value || '') : internal;
  const valid = !touched || !display || !validator || validator(display);
  const handle = (e) => {
    const v = mask(e.target.value);
    if (!controlled) setInternal(v);
    onChange && onChange(v);
  };
  return (
    <div style={{position:'relative'}}>
      <input
        {...rest}
        className={(className || 'input') + (valid ? '' : ' input--invalid')}
        value={display}
        onChange={handle}
        onBlur={(e)=>{ setTouched(true); rest.onBlur && rest.onBlur(e); }}
        style={{...(rest.style||{}), ...(rightIcon?{paddingRight:36}:{})}}
      />
      {rightIcon && <div style={{position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', display:'flex', alignItems:'center', pointerEvents:'none', color:'var(--text-faint)'}}>{rightIcon}</div>}
      {!valid && errorMsg && <div style={{fontSize:11, color:'var(--danger, #c0392b)', marginTop:3}}>{errorMsg}</div>}
    </div>
  );
}

// ─────────────────────────────────────────── CPF / CNPJ ──────────────────────────────────────
function CpfInput(props)  { return <MaskedInput mask={Mask.cpf}  validator={isValidCpf}  errorMsg="CPF inválido"  placeholder="000.000.000-00" inputMode="numeric" {...props}/>; }
function CnpjInput(props) { return <MaskedInput mask={Mask.cnpj} validator={isValidCnpj} errorMsg="CNPJ inválido" placeholder="00.000.000/0000-00" inputMode="numeric" {...props}/>; }

// Detecta automaticamente CPF ou CNPJ
function DocInput(props) {
  const mask = (v) => onlyDigits(v).length > 11 ? Mask.cnpj(v) : Mask.cpf(v);
  const validator = (v) => onlyDigits(v).length > 11 ? isValidCnpj(v) : isValidCpf(v);
  return <MaskedInput mask={mask} validator={validator} errorMsg="Documento inválido" placeholder="CPF ou CNPJ" inputMode="numeric" {...props}/>;
}

// ─────────────────────────────────────────── Telefone / WhatsApp ─────────────────────────────
function PhoneInput(props) {
  return <MaskedInput
    mask={Mask.phone}
    validator={(v)=>{ const d=onlyDigits(v); return d.length===10 || d.length===11; }}
    errorMsg="Telefone inválido"
    placeholder="(00) 0.0000-0000"
    inputMode="tel"
    {...props}/>;
}

// ─────────────────────────────────────────── Email ───────────────────────────────────────────
function EmailInput({ value, defaultValue, onChange, placeholder='nome@empresa.com', className, ...rest }) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue || '');
  const [touched, setTouched] = useState(false);
  const v = controlled ? (value || '') : internal;
  const valid = !touched || !v || isValidEmail(v);
  return (
    <div style={{position:'relative'}}>
      <input
        type="email"
        className={(className||'input') + (valid?'':' input--invalid')}
        value={v}
        placeholder={placeholder}
        onChange={(e)=>{ if(!controlled) setInternal(e.target.value); onChange && onChange(e.target.value); }}
        onBlur={()=>setTouched(true)}
        {...rest}
      />
      {!valid && <div style={{fontSize:11, color:'var(--danger, #c0392b)', marginTop:3}}>E-mail inválido</div>}
    </div>
  );
}

// ─────────────────────────────────────────── Money ───────────────────────────────────────────
function MoneyInput({ value, defaultValue, onChange, className, ...rest }) {
  const controlled = value !== undefined;
  const init = controlled ? value : defaultValue;
  const [internal, setInternal] = useState(() => typeof init === 'number' ? Mask.money(String(Math.round(init*100))) : Mask.money(init||''));
  const display = controlled
    ? (typeof value === 'number' ? Mask.money(String(Math.round(value*100))) : Mask.money(value||''))
    : internal;
  const handle = (e) => {
    const v = Mask.money(e.target.value);
    if (!controlled) setInternal(v);
    onChange && onChange(v, Mask.moneyToNumber(v));
  };
  return (
    <div style={{position:'relative'}}>
      <span style={{position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:'var(--type-sm)', pointerEvents:'none', fontWeight:500}}>R$</span>
      <input className={className||'input'} value={display} onChange={handle} inputMode="numeric" placeholder="0,00" {...rest} style={{...(rest.style||{}), paddingLeft:36, textAlign:'right'}}/>
    </div>
  );
}

// ─────────────────────────────────────────── CEP com autofill ────────────────────────────────
function CepInput({ value, onChange, onResolve, className, ...rest }) {
  const [loading, setLoading] = useState(false);
  const handle = async (v) => {
    onChange && onChange(v);
    if (onlyDigits(v).length === 8 && onResolve) {
      setLoading(true);
      try {
        const r = await lookupCep(v);
        if (r) onResolve(r, v);
      } finally { setLoading(false); }
    }
  };
  return <MaskedInput
    mask={Mask.cep}
    validator={(v)=>!v || onlyDigits(v).length===8}
    errorMsg="CEP inválido"
    placeholder="00.000-000"
    inputMode="numeric"
    value={value}
    onChange={handle}
    rightIcon={loading ? <span style={{fontSize:11}}>…</span> : null}
    {...rest}/>;
}

// ─────────────────────────────────────────── DateInput (popup) ───────────────────────────────
const WEEK = ['D','S','T','Q','Q','S','S'];
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
function formatBR(iso) {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
function brToIso(br) {
  const m = (br||'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}
function maskBR(v) {
  const d = onlyDigits(v).slice(0,8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0,2)}/${d.slice(2)}`;
  return `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`;
}

function DateInput({ value, onChange, placeholder='Selecionar data', className, ...rest }) {
  // Wrapper sobre o DateField global para padronizar todos os campos de data.
  // Mantém o contrato antigo: onChange recebe o valor ISO (string) direto.
  const DF = window.DateField;
  const [internal, setInternal] = useState(value || '');
  const controlled = value !== undefined;
  const iso = controlled ? (value || '') : internal;
  const handle = (e) => {
    const v = e && e.target ? e.target.value : '';
    if (!controlled) setInternal(v);
    onChange && onChange(v);
  };
  if (DF) {
    return <DF value={iso} onChange={handle} placeholder={placeholder} className={className} {...rest} />;
  }
  return null;
}

function DateInputLegacy({ value, onChange, placeholder='dd/mm/aaaa', className, ...rest }) {
  // value sempre em ISO yyyy-mm-dd para consistência; UI mostra dd/mm/aaaa
  const controlled = value !== undefined;
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState(value || '');
  const iso = controlled ? (value || '') : internal;
  const display = formatBR(iso);
  const today = new Date();
  const initDate = iso ? new Date(iso+'T00:00:00') : today;
  const [view, setView] = useState({ y: initDate.getFullYear(), m: initDate.getMonth() });
  const wrapRef = useRef(null);
  const set = (v) => { if (!controlled) setInternal(v); onChange && onChange(v); };

  useEffect(() => {
    if (!open) return;
    const click = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', click);
    return () => document.removeEventListener('mousedown', click);
  }, [open]);

  const onText = (e) => {
    const m = maskBR(e.target.value);
    if (m.length === 10) {
      const isoV = brToIso(m);
      if (isoV) { set(isoV); return; }
    }
    // edição parcial: mantemos em internal como texto (apenas se uncontrolled)
    if (!controlled) setInternal(brToIso(m) || m);
  };

  const firstDay = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m+1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  const isToday = (d) => today.getFullYear()===view.y && today.getMonth()===view.m && today.getDate()===d;
  const isSelected = (d) => {
    if (!iso) return false;
    const sel = new Date(iso+'T00:00:00');
    return sel.getFullYear()===view.y && sel.getMonth()===view.m && sel.getDate()===d;
  };
  const pick = (d) => {
    const isoV = `${view.y}-${String(view.m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    set(isoV);
    setOpen(false);
  };
  const nav = (delta) => {
    let m = view.m + delta, y = view.y;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setView({ y, m });
  };

  return (
    <div ref={wrapRef} style={{position:'relative'}}>
      <input
        className={className||'input'}
        value={display}
        onChange={onText}
        onFocus={()=>setOpen(true)}
        placeholder={placeholder}
        inputMode="numeric"
        style={{...(rest.style||{}), paddingRight:34, cursor:'pointer'}}
        readOnly
        {...rest}
      />
      <span onClick={()=>setOpen(o=>!o)} style={{position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', cursor:'pointer', fontSize:14}}>📅</span>
      {open && (
        <div style={{
          position:'absolute', zIndex:1000, top:'calc(100% + 4px)', left:0,
          background:'var(--surface)', border:'1px solid var(--border-strong)', borderRadius:10,
          boxShadow:'0 12px 32px rgba(0,0,0,.18)', padding:12, width:260,
          animation:'fmtFadeIn .15s ease-out'
        }}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
            <button type="button" onClick={()=>nav(-1)} style={navBtnStyle}>‹</button>
            <div style={{fontSize:'var(--type-sm)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.04em'}}>{MONTHS_PT[view.m]} {view.y}</div>
            <button type="button" onClick={()=>nav(1)} style={navBtnStyle}>›</button>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:2, fontSize:11, color:'var(--text-faint)', textAlign:'center', marginBottom:4}}>
            {WEEK.map((w,i)=><div key={i}>{w}</div>)}
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:2}}>
            {cells.map((d, i) => d === null
              ? <div key={i}/>
              : <button key={i} type="button" onClick={()=>pick(d)}
                  style={{
                    border:'none', background: isSelected(d) ? 'var(--accent)' : 'transparent',
                    color: isSelected(d) ? '#fff' : (isToday(d) ? 'var(--accent)' : 'var(--text)'),
                    fontWeight: isToday(d)||isSelected(d) ? 600 : 400,
                    padding:'6px 0', borderRadius:6, cursor:'pointer', fontSize:'var(--type-sm)',
                    outline: isToday(d) && !isSelected(d) ? '1px solid var(--accent)' : 'none'
                  }}>{d}</button>
            )}
          </div>
          <div style={{display:'flex', justifyContent:'space-between', marginTop:8, paddingTop:8, borderTop:'1px solid var(--border)'}}>
            <button type="button" onClick={()=>{ const t = new Date(); set(`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`); setOpen(false); }} style={miniBtnStyle}>Hoje</button>
            <button type="button" onClick={()=>{ set(''); setOpen(false); }} style={miniBtnStyle}>Limpar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────── TimeInput (popup) ───────────────────────────────
function maskTime(v) {
  const d = onlyDigits(v).slice(0,4);
  if (d.length <= 2) return d;
  return `${d.slice(0,2)}:${d.slice(2)}`;
}
function TimeInput({ value, onChange, placeholder='hh:mm', startHour=0, endHour=24, step=15, startTime, endTime, className, ...rest }) {
  const controlled = value !== undefined;
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState(value || '');
  const display = controlled ? (value || '') : internal;
  const wrapRef = useRef(null);
  const listRef = useRef(null);
  const closeTimer = useRef(null);
  const set = (v) => { if (!controlled) setInternal(v); onChange && onChange(v); };
  const hoverOpen = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; } setOpen(true); };
  const hoverClose = () => { if (closeTimer.current) clearTimeout(closeTimer.current); closeTimer.current = setTimeout(() => setOpen(false), 160); };
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);
  useEffect(() => {
    if (!open) return;
    const click = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', click);
    return () => document.removeEventListener('mousedown', click);
  }, [open]);

  const slots = useMemo(() => {
    const toMin = (t) => { const p = String(t || '').split(':'); return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0); };
    const from = startTime ? toMin(startTime) : startHour * 60;
    const to = endTime ? toMin(endTime) : endHour * 60 - 1;
    const st = Math.max(1, step | 0);
    const r = [];
    for (let mn = from; mn <= to; mn += st) {
      r.push(`${String(Math.floor(mn / 60)).padStart(2, '0')}:${String(mn % 60).padStart(2, '0')}`);
    }
    return r;
  }, [startHour, endHour, step, startTime, endTime]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector('[data-active="true"]');
    if (el) el.scrollIntoView ? listRef.current.scrollTop = el.offsetTop - 60 : null;
  }, [open]);

  return (
    <div ref={wrapRef} style={{position:'relative'}}>
      <input
        className={className||'input'}
        value={display}
        readOnly
        onFocus={()=>setOpen(true)}
        onClick={()=>setOpen(true)}
        onChange={(e)=>set(maskTime(e.target.value))}
        placeholder={placeholder}
        inputMode="numeric"
        style={{...(rest.style||{}), paddingRight:34, cursor:'pointer'}}
        {...rest}
      />
      <span onClick={()=>setOpen(o=>!o)} style={{position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', cursor:'pointer', fontSize:14}}>🕐</span>
      {open && (
        <div ref={listRef} style={{
          position:'absolute', zIndex:1000, top:'calc(100% + 4px)', left:0,
          background:'var(--surface)', border:'1px solid var(--border-strong)', borderRadius:10,
          boxShadow:'0 12px 32px rgba(0,0,0,.18)', maxHeight:220, overflowY:'auto', width:'100%', minWidth:140,
          animation:'fmtFadeIn .15s ease-out', padding:4
        }}>
          {slots.map(t => (
            <div key={t} data-active={t===display}
              onClick={()=>{ set(t); setOpen(false); }}
              style={{
                padding:'7px 12px', borderRadius:6, cursor:'pointer', fontSize:'var(--type-sm)',
                background: t===display ? 'var(--accent)' : 'transparent',
                color: t===display ? '#fff' : 'var(--text)',
                fontVariantNumeric:'tabular-nums', textAlign:'center'
              }}
              onMouseEnter={(e)=>{ if(t!==display) e.currentTarget.style.background='var(--accent-soft)'; }}
              onMouseLeave={(e)=>{ if(t!==display) e.currentTarget.style.background='transparent'; }}
            >{t}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────── Estilos auxiliares ──────────────────────────────
const navBtnStyle = {
  border:'1px solid var(--border)', background:'var(--surface-2, transparent)',
  borderRadius:6, width:26, height:26, cursor:'pointer', fontSize:14, color:'var(--text)'
};
const miniBtnStyle = {
  border:'none', background:'transparent', color:'var(--accent)', cursor:'pointer',
  fontSize:'var(--type-xs)', fontWeight:600
};

// ─────────────────────────────────────────── UF (estados + DF) ───────────────────────────────
// Lista oficial dos 26 estados + Distrito Federal, em ordem alfabética por sigla.
const UF_LIST = [
  { uf: 'AC', nome: 'Acre' }, { uf: 'AL', nome: 'Alagoas' }, { uf: 'AP', nome: 'Amapá' },
  { uf: 'AM', nome: 'Amazonas' }, { uf: 'BA', nome: 'Bahia' }, { uf: 'CE', nome: 'Ceará' },
  { uf: 'DF', nome: 'Distrito Federal' }, { uf: 'ES', nome: 'Espírito Santo' }, { uf: 'GO', nome: 'Goiás' },
  { uf: 'MA', nome: 'Maranhão' }, { uf: 'MT', nome: 'Mato Grosso' }, { uf: 'MS', nome: 'Mato Grosso do Sul' },
  { uf: 'MG', nome: 'Minas Gerais' }, { uf: 'PA', nome: 'Pará' }, { uf: 'PB', nome: 'Paraíba' },
  { uf: 'PR', nome: 'Paraná' }, { uf: 'PE', nome: 'Pernambuco' }, { uf: 'PI', nome: 'Piauí' },
  { uf: 'RJ', nome: 'Rio de Janeiro' }, { uf: 'RN', nome: 'Rio Grande do Norte' }, { uf: 'RS', nome: 'Rio Grande do Sul' },
  { uf: 'RO', nome: 'Rondônia' }, { uf: 'RR', nome: 'Roraima' }, { uf: 'SC', nome: 'Santa Catarina' },
  { uf: 'SP', nome: 'São Paulo' }, { uf: 'SE', nome: 'Sergipe' }, { uf: 'TO', nome: 'Tocantins' },
].sort((a, b) => a.uf.localeCompare(b.uf, 'pt-BR'));

function UFSelect({ value, defaultValue, onChange, placeholder = 'UF', showName = false, className, ...rest }) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue || '');
  const v = controlled ? (value || '') : internal;
  return (
    <select
      className={className || 'input'}
      value={v}
      onChange={(e) => { if (!controlled) setInternal(e.target.value); onChange && onChange(e.target.value); }}
      {...rest}>
      <option value="">{placeholder}</option>
      {UF_LIST.map((s) => <option key={s.uf} value={s.uf}>{showName ? `${s.uf} — ${s.nome}` : s.uf}</option>)}
    </select>);
}

// Injetar keyframes uma única vez
(function injectFmtStyles(){
  if (document.getElementById('__fmt_styles')) return;
  const s = document.createElement('style');
  s.id = '__fmt_styles';
  s.textContent = `
@keyframes fmtFadeIn { from {opacity:0; transform:translateY(-4px);} to {opacity:1; transform:translateY(0);} }
.input--invalid { border-color: #c0392b !important; box-shadow: 0 0 0 2px rgba(192,57,43,.12) !important; }
`;
  document.head.appendChild(s);
})();

// Expor globalmente
Object.assign(window, {
  Mask, isValidEmail, isValidCpf, isValidCnpj, lookupCep, formatBRL,
  CpfInput, CnpjInput, DocInput, PhoneInput, EmailInput, MoneyInput,
  CepInput, DateInput, TimeInput, UFSelect, UF_LIST,
});
