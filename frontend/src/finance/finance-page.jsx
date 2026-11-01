import React,{useEffect,useMemo,useState} from 'react';
import {createFinanceRequest} from './finance-api.js';

// Finance follows the CmPro workbook: Profit & Loss (monthly, yearly and a 12-month summary) and Tax & Zakat.
// Sales, cost of goods sold, payslips and staff claims come from SP-Manager; everything else is an
// Income & Expenses entry whose category decides where it lands in the statement.
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const GROUP_LABEL={sales:'Sales',other_income:'Miscellaneous income',direct:'Direct cost',admin:'Administrative expenses',selling:'Selling and forwarding expenses',financial:'Financial charges',zakat:'Zakat paid (Tax & Zakat)',excluded:'Not in Profit & Loss (capital, loans, drawings)'};
const rm=n=>{const v=Number(n)||0;const s=Math.abs(v).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2});return v<0?`(${s})`:s};
const money=n=>'RM '+rm(n);
const sum=a=>a.reduce((t,v)=>t+(Number(v)||0),0);
const zero=()=>Array(12).fill(0);
const addInto=(t,a)=>t.map((v,i)=>v+(Number(a?.[i])||0));

// Individual resident tax rates (Year of Assessment 2023 onwards).
const INDIVIDUAL_BANDS=[[5000,0],[15000,1],[15000,3],[15000,6],[20000,11],[30000,19],[300000,25],[200000,26],[1400000,28],[Infinity,30]];
// Sdn Bhd: SME (paid-up capital ≤ RM2.5 million, gross income ≤ RM50 million) and other companies.
const SME_BANDS=[[150000,15],[450000,17],[Infinity,24]];
const COMPANY_BANDS=[[Infinity,24]];
const bandTax=(income,bands)=>{let left=Math.max(0,income),tax=0;const rows=[];for(const[size,rate] of bands){if(left<=0)break;const part=Math.min(left,size);const t=part*rate/100;rows.push({part,rate,tax:t});tax+=t;left-=part}return{tax,rows}};
// Reliefs from the CmPro Tax & Zakat sheet. "count" items are claimed per person (rate × number).
const RELIEFS=[
 {id:'self',label:'Individu / diri sendiri',limit:9000,fixed:true},
 {id:'parentsMedical',label:'Perbelanjaan rawatan perubatan, keperluan khas dan penjaga untuk ibu bapa',limit:5000},
 {id:'mother',label:'Ibu (bahagian anda)',limit:1500},
 {id:'father',label:'Bapa (bahagian anda)',limit:1500},
 {id:'disabledEquipment',label:'Peralatan sokongan asas untuk orang kurang upaya',limit:6000},
 {id:'disabledSelf',label:'Individu yang kurang upaya',limit:6000},
 {id:'education',label:'Yuran pengajian (sendiri)',limit:7000},
 {id:'medical',label:'Perubatan penyakit serius, rawatan kesuburan, vaksin dan pemeriksaan penuh',limit:8000},
 {id:'lifestyle',label:'Gaya hidup – buku, internet, komputer, telefon pintar atau tablet',limit:2500},
 {id:'sports',label:'Gaya hidup – aktiviti sukan',limit:500},
 {id:'breastfeeding',label:'Peralatan penyusuan ibu (anak 2 tahun dan ke bawah)',limit:1000},
 {id:'childcare',label:'Yuran taman asuhan / tadika berdaftar (anak 6 tahun dan ke bawah)',limit:3000},
 {id:'sspn',label:'Tabungan bersih SSPN',limit:8000},
 {id:'spouse',label:'Suami / isteri / bayaran alimoni',limit:4000},
 {id:'spouseDisabled',label:'Suami / isteri yang kurang upaya',limit:5000},
 {id:'kidsUnder18',label:'Anak di bawah 18 tahun',rate:2000,count:true},
 {id:'kidsPreU',label:'Anak 18 tahun ke atas – matrikulasi / pra-ijazah / sijil',rate:2000,count:true},
 {id:'kidsDiploma',label:'Anak 18 tahun ke atas – diploma dan ke atas',rate:8000,count:true},
 {id:'kidsDisabled',label:'Anak kurang upaya',rate:6000,count:true},
 {id:'kidsDisabledStudy',label:'Anak kurang upaya – diploma dan ke atas',rate:8000,count:true},
 {id:'lifeEpf',label:'Insurans nyawa dan KWSP',limit:7000},
 {id:'prs',label:'Skim persaraan swasta (PRS) dan anuiti tertangguh',limit:3000},
 {id:'eduMedInsurance',label:'Insurans pendidikan dan perubatan',limit:3000},
 {id:'socso',label:'Caruman PERKESO',limit:250},
 {id:'tourism',label:'Penginapan berdaftar dan tempat tarikan pelancong',limit:1000},
];
const PRINT_CSS=`*{box-sizing:border-box}html,body{margin:0;background:#fff;color:#111;font:10.5px/1.4 Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.rep-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;padding-bottom:8px;margin-bottom:12px;border-bottom:2px solid #087ea4}
.rep-head h1{margin:0;font-size:16px}.rep-head .co{color:#555;font-size:10px}.rep-head h2{margin:0;font-size:14px;color:#087ea4;text-align:right}.rep-head p{margin:2px 0 0;text-align:right;color:#444}
.rep-foot{margin-top:14px;padding-top:6px;border-top:1px solid #ccc;color:#777;font-size:9px;display:flex;justify-content:space-between}
.fin-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}.fin-kpi{border:1px solid #d6dde3;border-radius:6px;padding:7px 9px}.fin-kpi span{display:block;color:#555;font-size:9.5px}.fin-kpi b{display:block;font-size:13px;margin:2px 0}.fin-kpi small{color:#777;font-size:8.5px}
.fin-card{border:1px solid #d6dde3;border-radius:6px;margin-bottom:12px;break-inside:auto;overflow:hidden}.fin-card-head{display:flex;justify-content:space-between;align-items:center;padding:7px 10px;border-bottom:1px solid #e3e8ec;background:#f6f8fa}.fin-card-head h3{margin:0;font-size:12px}.fin-card-head small{display:block;color:#666;font-size:9px}
table{width:100%;border-collapse:collapse;font-size:inherit;font-variant-numeric:tabular-nums}th,td{padding:4px 8px;text-align:right;border-bottom:1px solid #eef1f3;white-space:nowrap}th{background:#f6f8fa;color:#555;font-size:9.5px}th:first-child,td:first-child{text-align:left;white-space:normal}
tr{break-inside:avoid}.fin-head-row td{color:#087ea4;font-weight:700;font-size:9.5px;padding-top:9px;border-bottom:0}.fin-sub-row td{font-weight:700;border-bottom:0}.fin-empty-sub td{color:#999;font-weight:400}.fin-line td:first-child{padding-left:20px}
.fin-total td{font-weight:700;border-top:1px solid #c9d2da;background:#fafbfc}.fin-grand td{font-weight:800;background:#eef7fa;color:#0b5d78}.fin-final td{background:#087ea4;color:#fff;font-weight:800}
.fin-margin{display:block;font-size:8.5px;font-weight:400;opacity:.8}.neg{color:#b42318}.pos{color:#0f7a43}.fin-final td.neg{color:#ffd6d6}
.fin-wide th,.fin-wide td{padding:3px 4px;font-size:8.3px}.fin-wide td:first-child{min-width:120px}
.fin-notes{color:#555;font-size:9px}.fin-notes p{margin:0 0 4px}
.fin-tax-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.fin-form-rows{padding:4px 10px 8px}.fin-kv{display:flex;justify-content:space-between;gap:10px;padding:4px 0;border-bottom:1px dashed #dde3e8}.fin-kv.strong{font-weight:700}.fin-kv.final{margin-top:4px;padding:6px 8px;border:0;border-radius:4px;background:#087ea4;color:#fff}
.fin-band{margin:6px 0}.fin-band td,.fin-band th{padding:3px 6px;font-size:9.5px}.fin-relief-total{color:#087ea4;font-size:12px}.fin-fixed{color:#666}
.fin-save-bar{margin-top:6px;color:#666;font-size:9px;font-style:italic}.fin-save-bar p{margin:0}`;
const DEFAULT_TAX={entity:'individual',zakatRate:2.5,zakatPaidExtra:0,reliefs:{}};

function buildStatement(cur,cats,months){
 const pick=a=>months.reduce((t,m)=>t+(Number(a?.[m])||0),0);
 const byGroup=g=>Object.entries(cur?.entries||{}).filter(([n])=>cats[n]?.group===g).map(([n,a])=>({label:n,value:pick(a)})).filter(r=>Math.abs(r.value)>=.005).sort((a,b)=>a.label.localeCompare(b.label));
 const posSales=pick(cur?.pos_sales),invSales=pick(cur?.invoice_sales),otherSales=sum(byGroup('sales').map(r=>r.value)),refunds=pick(cur?.refunds);
 const sales=posSales+invSales+otherSales-refunds;
 const cogsPos=pick(cur?.cogs)-pick(cur?.refund_cogs),cogsInv=pick(cur?.invoice_cogs),direct=byGroup('direct');
 const costOfSales=cogsPos+cogsInv+sum(direct.map(r=>r.value));
 const gross=sales-costOfSales;
 const admin=[...(pick(cur?.payroll)?[{label:'Gaji (payslip)',value:pick(cur?.payroll),auto:true}]:[]),...(pick(cur?.claims)?[{label:'Tuntutan staf (HR claims)',value:pick(cur?.claims),auto:true}]:[]),...byGroup('admin')];
 const selling=byGroup('selling'),financial=byGroup('financial');
 const opex=sum(admin.map(r=>r.value))+sum(selling.map(r=>r.value))+sum(financial.map(r=>r.value));
 const operating=gross-opex;
 const misc=byGroup('other_income');const miscTotal=sum(misc.map(r=>r.value));
 const net=operating+miscTotal;
 return{posSales,invSales,otherSales,refunds,sales,cogsPos,cogsInv,direct,costOfSales,gross,admin,selling,financial,opex,operating,misc,miscTotal,net,purchases:pick(cur?.purchases),zakatPaid:sum(byGroup('zakat').map(r=>r.value)),excluded:byGroup('excluded')};
}

export default function FinancePage({base,headers,setNotice,company}){
 const request=useMemo(()=>createFinanceRequest({base,headers}),[base,headers]);
 const now=new Date();
 const [tab,setTab]=useState('pl'),[view,setView]=useState('monthly'),[year,setYear]=useState(now.getFullYear()),[month,setMonth]=useState(now.getMonth());
 const [summary,setSummary]=useState(null),[catalog,setCatalog]=useState([]),[ready,setReady]=useState(true),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [entries,setEntries]=useState([]),[entryMonth,setEntryMonth]=useState(0),[form,setForm]=useState(null),[saving,setSaving]=useState(false);
 const [tax,setTax]=useState(DEFAULT_TAX),[taxDirty,setTaxDirty]=useState(false);
 const cats=useMemo(()=>Object.fromEntries(catalog.map(c=>[c.name,c])),[catalog]);
 const say=msg=>setNotice?setNotice(msg):setError(msg);
 const loadSummary=async()=>{setLoading(true);try{const [c,s]=await Promise.all([catalog.length?Promise.resolve(null):request('catalog'),request('summary',{year})]);if(c){setCatalog(c.categories||[]);setReady(c.ready!==false)}setSummary(s);setReady(s.ready!==false);setError('')}catch(e){setError(e.message||'Could not load Finance data.')}finally{setLoading(false)}};
 const loadEntries=async()=>{try{const r=await request('entries',{year,month:entryMonth});setEntries(r.entries||[])}catch(e){setError(e.message||'Could not load entries.')}};
 const loadTax=async()=>{try{const r=await request('tax-settings',{year});setTax({...DEFAULT_TAX,...(r.settings||{}),reliefs:{...(r.settings?.reliefs||{})}});setTaxDirty(false)}catch(e){setError(e.message||'Could not load tax settings.')}};
 useEffect(()=>{loadSummary()},[request,year]);
 useEffect(()=>{if(tab==='entries')loadEntries()},[request,year,entryMonth,tab]);
 useEffect(()=>{loadTax()},[request,year]);

 const allMonths=[0,1,2,3,4,5,6,7,8,9,10,11];
 const cur=summary?.current,prev=summary?.previous;
 const stMonth=useMemo(()=>buildStatement(cur,cats,[month]),[cur,cats,month]);
 const stYtd=useMemo(()=>buildStatement(cur,cats,allMonths.filter(m=>m<=month)),[cur,cats,month]);
 const stYear=useMemo(()=>buildStatement(cur,cats,allMonths),[cur,cats]);
 const stPrevYear=useMemo(()=>buildStatement(prev,cats,allMonths),[prev,cats]);
 const stMonths=useMemo(()=>allMonths.map(m=>buildStatement(cur,cats,[m])),[cur,cats]);
 const years=Array.from({length:8},(_,i)=>now.getFullYear()-6+i).filter(y=>y<=now.getFullYear()+1);

 // ---- Profit & Loss statement table. columns: [{title, st}]
 const lineRows=(columns)=>{
  const labels=new Map();const collect=key=>columns.forEach(c=>c.st[key].forEach(r=>labels.set(key+'|'+r.label,r.label)));
  ['direct','admin','selling','financial','misc'].forEach(collect);
  const detail=(key)=>[...labels.entries()].filter(([k])=>k.startsWith(key+'|')).map(([k,label])=>({label,values:columns.map(c=>c.st[key].find(r=>r.label===label)?.value||0),indent:true,cost:key!=='misc'}));
  const row=(label,get,o={})=>({label,values:columns.map(c=>get(c.st)),...o});
  return[
   {head:'SALES'},
   row('POS sales',s=>s.posSales,{indent:true}),
   row('Invoices',s=>s.invSales,{indent:true,hideZero:true}),
   row('Other sales',s=>s.otherSales,{indent:true,hideZero:true}),
   row('Less: refunds',s=>-s.refunds,{indent:true,hideZero:true,cost:true}),
   row('Total sales',s=>s.sales,{total:true}),
   {head:'(-) COST OF SALES'},
   row('Cost of goods sold',s=>s.cogsPos,{indent:true,cost:true}),
   row('Cost of invoiced goods',s=>s.cogsInv,{indent:true,hideZero:true,cost:true}),
   ...detail('direct'),
   row('Total cost of sales',s=>-s.costOfSales,{total:true,cost:true}),
   row('GROSS PROFIT',s=>s.gross,{grand:true,margin:s=>s.sales?s.gross/s.sales:null}),
   {head:'OPERATING EXPENSES'},
   {sub:'Administrative expenses'},...detail('admin'),
   {sub:'Selling and forwarding expenses'},...detail('selling'),
   {sub:'Financial charges'},...detail('financial'),
   row('Total operating expenses',s=>-s.opex,{total:true,cost:true}),
   row('OPERATING PROFIT',s=>s.operating,{grand:true}),
   {head:'MISCELLANEOUS INCOME'},...detail('misc'),
   row('Total miscellaneous income',s=>s.miscTotal,{total:true}),
   row('NET PROFIT / (LOSS) BEFORE TAX & ZAKAT',s=>s.net,{grand:true,final:true,margin:s=>s.sales?s.net/s.sales:null}),
  ].filter(r=>!(r.hideZero&&r.values.every(v=>Math.abs(v)<.005)));
 };
 const StatementTable=({columns,change})=>{const rows=lineRows(columns);const subsWithRows=new Set();rows.forEach((r,i)=>{if(r.sub){const next=rows[i+1];if(next&&next.indent)subsWithRows.add(i)}});return <div className="fin-table-wrap"><table className={'fin-table'+(columns.length>4?' fin-wide':'')}><thead><tr><th>Description</th>{columns.map(c=><th key={c.title}>{c.title}</th>)}{change&&<th>Change</th>}</tr></thead><tbody>{rows.map((r,i)=>{if(r.head)return <tr key={i} className="fin-head-row"><td colSpan={columns.length+1+(change?1:0)}>{r.head}</td></tr>;if(r.sub)return subsWithRows.has(i)?<tr key={i} className="fin-sub-row"><td colSpan={columns.length+1+(change?1:0)}>{r.sub}</td></tr>:<tr key={i} className="fin-sub-row fin-empty-sub"><td>{r.sub}</td>{columns.map(c=><td key={c.title}>–</td>)}{change&&<td/>}</tr>;const ch=change&&r.values.length>=2&&Math.abs(r.values[1])>=.005?(r.cost?(Math.abs(r.values[0])-Math.abs(r.values[1]))/Math.abs(r.values[1]):(r.values[0]-r.values[1])/Math.abs(r.values[1])):null;const good=ch===null?null:r.cost?ch<=0:ch>=0;return <tr key={i} className={(r.indent?'fin-line':'')+(r.total?' fin-total':'')+(r.grand?' fin-grand':'')+(r.final?' fin-final':'')}><td>{r.label}{r.margin&&columns.length<=3&&r.margin(columns[0].st)!==null&&<small className="fin-margin">{(r.margin(columns[0].st)*100).toFixed(1)}% margin</small>}</td>{r.values.map((v,j)=><td key={j} className={v<0?'neg':''}>{Math.abs(v)<.005?'–':rm(v)}</td>)}{change&&<td className={ch===null?'':good?'pos':'neg'}>{ch===null?'–':(ch>=0?'+':'')+(ch*100).toFixed(1)+'%'}</td>}</tr>})}</tbody></table></div>};
 const Kpis=({st,label})=><div className="fin-kpis">{[['Sales',st.sales],['Gross profit',st.gross,st.sales?st.gross/st.sales:null],['Operating expenses',st.opex],['Net profit before tax & zakat',st.net,st.sales?st.net/st.sales:null]].map(([t,v,m])=><div className={'fin-kpi'+(t.startsWith('Net')?(v>=0?' good':' bad'):'')} key={t}><span>{t}</span><b>{money(v)}</b><small>{m!=null?`${(m*100).toFixed(1)}% of sales · `:''}{label}</small></div>)}</div>;

 // ---- Income & Expenses
 const catOptions=dir=>Object.entries(GROUP_LABEL).map(([g,label])=>({g,label,items:catalog.filter(c=>c.direction===dir&&c.group===g)})).filter(x=>x.items.length);
 const openForm=row=>{setForm(row?{...row,amount:String(row.amount)}:{id:0,entry_date:new Date().toISOString().slice(0,10),direction:'OUT',category:'',details:'',amount:''})};
 const saveEntry=async e=>{e.preventDefault();if(!form.category){say('Select a category.');return}setSaving(true);try{await request('save-entry',{...form,amount:Number(form.amount)},true);setForm(null);say('Entry saved.');await Promise.all([loadEntries(),loadSummary()])}catch(err){say(err.message||'Entry could not be saved.')}finally{setSaving(false)}};
 const deleteEntry=async row=>{if(!window.confirm(`Delete ${row.category} ${money(row.amount)} on ${row.entry_date}?`))return;try{await request('delete-entry',{id:row.id},true);await Promise.all([loadEntries(),loadSummary()]);say('Entry deleted.')}catch(err){say(err.message||'Entry could not be deleted.')}};
 const totalIn=sum(entries.filter(r=>r.direction==='IN').map(r=>r.amount)),totalOut=sum(entries.filter(r=>r.direction==='OUT').map(r=>r.amount));

 // ---- Tax & Zakat
 const setTaxField=(k,v)=>{setTax(t=>({...t,[k]:v}));setTaxDirty(true)};
 const setRelief=(id,v)=>{setTax(t=>({...t,reliefs:{...t.reliefs,[id]:v}}));setTaxDirty(true)};
 const profit=stYear.net;
 const zakatRate=Math.max(0,Number(tax.zakatRate)||0);
 const zakatDue=Math.max(0,profit)*zakatRate/100;
 const zakatPaid=stYear.zakatPaid+Math.max(0,Number(tax.zakatPaidExtra)||0);
 const reliefRows=RELIEFS.map(r=>{const raw=Number(tax.reliefs?.[r.id])||0;const value=r.fixed?r.limit:r.count?Math.max(0,Math.floor(raw))*r.rate:Math.min(Math.max(0,raw),r.limit);return{...r,raw,value}});
 const totalReliefs=sum(reliefRows.map(r=>r.value));
 const individual=tax.entity==='individual';
 const zakatDeduction=individual?0:Math.min(zakatPaid,Math.max(0,profit)*0.025);
 const chargeable=Math.max(0,individual?profit-totalReliefs:profit-zakatDeduction);
 const bands=individual?INDIVIDUAL_BANDS:tax.entity==='sme'?SME_BANDS:COMPANY_BANDS;
 const taxCalc=bandTax(chargeable,bands);
 const zakatRebate=individual?Math.min(zakatPaid,taxCalc.tax):0;
 const taxPayable=Math.max(0,taxCalc.tax-zakatRebate);
 const afterAll=profit-Math.max(zakatDue,zakatPaid)-taxPayable;
 const printRef=React.useRef(null);
 const reportTitle=tab==='tax'?'Tax & Zakat Estimation':view==='monthly'?'Statement of Profit & Loss (Monthly)':view==='yearly'?'Statement of Profit & Loss (Yearly)':'Summary Statement of Profit & Loss';
 const reportPeriod=tab==='tax'?`For the year ended 31 December ${year} · Year of Assessment ${year}`:view==='monthly'?`For the month of ${MONTHS[month]} ${year}`:view==='yearly'?`For the year ended 31 December ${year}, compared with ${year-1}`:`January – December ${year}`;
 const printReport=()=>{const src=printRef.current;if(!src){say('Nothing to print yet.');return}
  const node=src.cloneNode(true);const fields=[...src.querySelectorAll('input,select')];
  node.querySelectorAll('input,select').forEach((el,i)=>{const orig=fields[i];const span=document.createElement('span');span.className='fin-print-value';span.textContent=orig?.tagName==='SELECT'?(orig.options[orig.selectedIndex]?.text||''):(orig?.value||'—');el.replaceWith(span)});
  node.querySelectorAll('.fin-reliefs tbody tr').forEach(tr=>{if(tr.lastElementChild?.textContent.trim()==='0.00')tr.remove()});
  node.querySelectorAll('.fin-save-bar button').forEach(b=>b.remove());
  node.querySelectorAll('button').forEach(b=>b.replaceWith(document.createTextNode(b.textContent)));
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const landscape=tab==='pl'&&view==='summary';
  const co=company||{};const address=[co.plotIdentification,co.streetName,[co.postalCode,co.district].filter(Boolean).join(' '),co.state].filter(Boolean).join(', ');const coLine=[address,co.phoneNumber||co.phone,co.email,co.taxNumber?'Tax No: '+co.taxNumber:''].filter(Boolean).map(esc).join(' · ');
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>${esc(reportTitle)} ${year}</title><style>@page{size:A4 ${landscape?'landscape':'portrait'};margin:12mm}${PRINT_CSS}</style></head><body><header class="rep-head"><div><h1>${esc(co.name||co.companyName||'')}</h1>${coLine?`<div class="co">${coLine}</div>`:''}</div><div><h2>${esc(reportTitle)}</h2><p>${esc(reportPeriod)} · RM</p></div></header>${node.innerHTML}<footer class="rep-foot"><span>Printed ${esc(new Date().toLocaleString('en-MY'))}</span><span>SP-Manager · Finance</span></footer></body></html>`;
  const f=document.createElement('iframe');f.setAttribute('aria-hidden','true');f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';document.body.appendChild(f);
  const w=f.contentWindow;w.document.open();w.document.write(html);w.document.close();
  w.addEventListener('afterprint',()=>setTimeout(()=>f.remove(),500));
  setTimeout(()=>{try{w.focus();w.print()}catch(e){say('Print failed: '+e.message)}setTimeout(()=>f.isConnected&&f.remove(),120000)},300);
 };
 const saveTax=async()=>{try{await request('save-tax-settings',{year,settings:tax},true);setTaxDirty(false);say('Tax & Zakat settings saved.')}catch(e){say(e.message||'Settings could not be saved.')}};

 return <section className="finance-page management-page">
  <div className="fin-toolbar">
   <div className="fin-tabs" role="tablist">{[['pl','Profit & Loss'],['entries','Income & Expenses'],['tax','Tax & Zakat']].map(([k,l])=><button key={k} type="button" role="tab" aria-selected={tab===k} className={tab===k?'active':''} onClick={()=>setTab(k)}>{l}</button>)}</div>
   <div className="fin-filters">
    {tab==='pl'&&<div className="fin-seg" role="group" aria-label="Profit & Loss view">{[['monthly','Monthly'],['yearly','Yearly'],['summary','12-month summary']].map(([k,l])=><button key={k} type="button" className={view===k?'active':''} onClick={()=>setView(k)}>{l}</button>)}</div>}
    {tab==='pl'&&view==='monthly'&&<select aria-label="Month" value={month} onChange={e=>setMonth(Number(e.target.value))}>{MONTHS.map((m,i)=><option key={m} value={i}>{m}</option>)}</select>}
    {tab==='entries'&&<select aria-label="Month" value={entryMonth} onChange={e=>setEntryMonth(Number(e.target.value))}><option value={0}>All months</option>{MONTHS.map((m,i)=><option key={m} value={i+1}>{m}</option>)}</select>}
    <select aria-label="Year" value={year} onChange={e=>setYear(Number(e.target.value))}>{years.map(y=><option key={y}>{y}</option>)}</select>
    <button type="button" className="fin-btn" onClick={()=>{loadSummary();if(tab==='entries')loadEntries()}} disabled={loading}>↻ Refresh</button>
    {tab!=='entries'&&<button type="button" className="fin-btn primary" onClick={printReport} disabled={!summary} title="Print or save as PDF">🖨 Print / PDF</button>}
    {tab==='entries'&&<button type="button" className="fin-btn primary" onClick={()=>openForm(null)} disabled={!ready}>＋ Add entry</button>}
   </div>
  </div>
  {error&&<div className="fin-alert" role="alert">{error}</div>}
  {!ready&&<div className="fin-alert warn">Finance tables are not installed yet. Run <b>database/migrations/finance-v1.sql</b> in phpMyAdmin to record income &amp; expenses and save Tax &amp; Zakat settings. Sales, cost of goods sold and payroll are already shown.</div>}

  {tab==='pl'&&(loading&&!summary?<div className="fin-empty">Loading…</div>:summary&&<div className="fin-print-area" ref={printRef}>
   {view==='monthly'&&<><Kpis st={stMonth} label={`${MONTHS[month]} ${year}`}/><div className="fin-card"><div className="fin-card-head"><div><h3>Statement of Profit &amp; Loss</h3><small>For the month of {MONTHS[month]} {year} · RM</small></div></div><StatementTable columns={[{title:`${SHORT[month]} ${year}`,st:stMonth},{title:`Year to date`,st:stYtd}]}/></div></>}
   {view==='yearly'&&<><Kpis st={stYear} label={`Year ${year}`}/><div className="fin-card"><div className="fin-card-head"><div><h3>Statement of Profit &amp; Loss</h3><small>For the year ended 31 Dec {year} · compared with {year-1} · RM</small></div></div><StatementTable columns={[{title:String(year),st:stYear},{title:String(year-1),st:stPrevYear}]} change/></div></>}
   {view==='summary'&&<div className="fin-card"><div className="fin-card-head"><div><h3>Summary Statement of Profit &amp; Loss</h3><small>January – December {year} · RM</small></div></div><StatementTable columns={[...stMonths.map((st,i)=>({title:SHORT[i],st})),{title:'Total',st:stYear}]}/></div>}
   <div className="fin-notes">
    <p><b>How these figures are built.</b> Sales are POS sales and invoices without SST, less refunds in the month they are made. Cost of goods sold uses each item's cost at the time of sale, so stock is expensed when it is sold. Payslips (issued) and approved staff claims are added to administrative expenses automatically; other income and expenses come from <button type="button" className="fin-link" onClick={()=>setTab('entries')}>Income &amp; Expenses</button>.</p>
    {(view==='monthly'?stMonth:stYear).purchases>0&&<p>Stock purchased in this period: <b>{money((view==='monthly'?stMonth:stYear).purchases)}</b>. It is not deducted here because it becomes cost of goods sold when the items are sold.</p>}
    {(view==='monthly'?stMonth:stYear).excluded.length>0&&<p>Not in Profit &amp; Loss: {(view==='monthly'?stMonth:stYear).excluded.map(r=>`${r.label} ${money(r.value)}`).join(' · ')}.</p>}
   </div>
  </div>)}

  {tab==='entries'&&<div className="fin-card">
   <div className="fin-card-head"><div><h3>Income &amp; Expenses</h3><small>{entryMonth?MONTHS[entryMonth-1]+' ':''}{year} · rent, bills, marketing, other income, zakat paid and similar items</small></div><div className="fin-entry-totals"><span>In <b className="pos">{money(totalIn)}</b></span><span>Out <b className="neg">{money(totalOut)}</b></span></div></div>
   <div className="fin-table-wrap"><table className="fin-table fin-entries"><thead><tr><th>Date</th><th>Category</th><th>Group</th><th>Details</th><th>In (RM)</th><th>Out (RM)</th><th></th></tr></thead><tbody>
    {entries.length?entries.map(r=><tr key={r.id}><td>{r.entry_date}</td><td>{r.category}</td><td><span className={'fin-tag g-'+(cats[r.category]?.group||'')}>{GROUP_LABEL[cats[r.category]?.group]||'—'}</span></td><td>{r.details||'—'}</td><td className="pos">{r.direction==='IN'?rm(r.amount):''}</td><td className="neg">{r.direction==='OUT'?rm(r.amount):''}</td><td className="fin-actions"><button type="button" onClick={()=>openForm(r)}>Edit</button><button type="button" className="danger" onClick={()=>deleteEntry(r)}>Delete</button></td></tr>):<tr><td colSpan="7" className="fin-empty">No entries for this period.</td></tr>}
   </tbody></table></div>
  </div>}

  {tab==='tax'&&summary&&<div className="fin-print-area" ref={printRef}>
   <div className="fin-kpis">{[['Profit before tax & zakat',profit],['Zakat',Math.max(zakatDue,zakatPaid)],['Tax payable',taxPayable],['Profit after tax & zakat',afterAll]].map(([t,v])=><div className={'fin-kpi'+(t.startsWith('Profit after')?(v>=0?' good':' bad'):'')} key={t}><span>{t}</span><b>{money(v)}</b><small>Year {year}</small></div>)}</div>
   <div className="fin-tax-grid">
    <div className="fin-card">
     <div className="fin-card-head"><div><h3>Zakat perniagaan</h3><small>Based on net profit for {year}</small></div></div>
     <div className="fin-form-rows">
      <div className="fin-kv"><span>Net profit / (loss) before tax &amp; zakat</span><b>{money(profit)}</b></div>
      <label className="fin-kv"><span>Zakat rate (%)</span><input type="number" min="0" max="100" step="0.01" value={tax.zakatRate} onChange={e=>setTaxField('zakatRate',e.target.value)}/></label>
      <div className="fin-kv strong"><span>Zakat payable</span><b>{money(zakatDue)}</b></div>
      <div className="fin-kv"><span>Zakat already paid (Income &amp; Expenses)</span><b>{money(stYear.zakatPaid)}</b></div>
      <label className="fin-kv"><span>Zakat / fitrah paid elsewhere</span><input type="number" min="0" step="0.01" value={tax.zakatPaidExtra} onChange={e=>setTaxField('zakatPaidExtra',e.target.value)}/></label>
      <div className="fin-kv strong"><span>{zakatPaid>=zakatDue?'Zakat fully paid':'Zakat balance to pay'}</span><b>{money(Math.max(0,zakatDue-zakatPaid))}</b></div>
     </div>
    </div>
    <div className="fin-card">
     <div className="fin-card-head"><div><h3>Income tax</h3><small>Estimate for Year of Assessment {year}</small></div></div>
     <div className="fin-form-rows">
      <label className="fin-kv"><span>Business type</span><select value={tax.entity} onChange={e=>setTaxField('entity',e.target.value)}><option value="individual">Enterprise / sole proprietor (individual)</option><option value="sme">Sdn Bhd – SME</option><option value="company">Sdn Bhd – other</option></select></label>
      <div className="fin-kv"><span>Net profit before tax &amp; zakat</span><b>{money(profit)}</b></div>
      {individual?<div className="fin-kv"><span>(-) Personal reliefs</span><b>{money(totalReliefs)}</b></div>:<div className="fin-kv"><span>(-) Zakat deduction (max 2.5% of profit)</span><b>{money(zakatDeduction)}</b></div>}
      <div className="fin-kv strong"><span>Chargeable income</span><b>{money(chargeable)}</b></div>
      <table className="fin-band"><thead><tr><th>Band</th><th>Rate</th><th>Tax (RM)</th></tr></thead><tbody>{taxCalc.rows.length?taxCalc.rows.map((b,i)=><tr key={i}><td>{rm(b.part)}</td><td>{b.rate}%</td><td>{rm(b.tax)}</td></tr>):<tr><td colSpan="3">No chargeable income</td></tr>}</tbody></table>
      <div className="fin-kv"><span>Tax charged</span><b>{money(taxCalc.tax)}</b></div>
      {individual&&<div className="fin-kv"><span>(-) Zakat rebate (zakat paid, up to the tax charged)</span><b>{money(zakatRebate)}</b></div>}
      <div className="fin-kv strong final"><span>Tax payable</span><b>{money(taxPayable)}</b></div>
     </div>
    </div>
   </div>
   {individual&&<div className="fin-card">
    <div className="fin-card-head"><div><h3>Personal tax reliefs</h3><small>Enter the amount claimed; it is capped at the limit. For children enter the number of children.</small></div><b className="fin-relief-total">{money(totalReliefs)}</b></div>
    <div className="fin-table-wrap"><table className="fin-table fin-reliefs"><thead><tr><th>Relief</th><th>Limit (RM)</th><th>Claim</th><th>Allowed (RM)</th></tr></thead><tbody>{reliefRows.map(r=><tr key={r.id}><td>{r.label}</td><td>{r.count?`${rm(r.rate)} each`:rm(r.limit)}</td><td>{r.fixed?<span className="fin-fixed">Automatic</span>:<input type="number" min="0" step={r.count?'1':'0.01'} aria-label={r.label} placeholder={r.count?'No. of children':'0.00'} value={tax.reliefs?.[r.id]??''} onChange={e=>setRelief(r.id,e.target.value)}/>}</td><td>{rm(r.value)}</td></tr>)}</tbody></table></div>
   </div>}
   <div className="fin-save-bar"><p>Estimate only, based on the rates in this page. Confirm the final figures with LHDN e-Filing, your zakat authority or your tax agent.</p><button type="button" className="fin-btn primary" onClick={saveTax} disabled={!ready||!taxDirty}>{taxDirty?'Save settings':'Saved'}</button></div>
  </div>}

  {form&&<div className="ar-modal-backdrop" onMouseDown={()=>{if(!saving)setForm(null)}}><div className="ar-modal fin-entry-modal" role="dialog" aria-modal="true" aria-labelledby="fin-entry-title" onMouseDown={e=>e.stopPropagation()}><div className="ar-modal-head"><div><small>FINANCE</small><h3 id="fin-entry-title">{form.id?'Edit Entry':'New Entry'}</h3></div><button type="button" aria-label="Close" onClick={()=>setForm(null)} disabled={saving}>×</button></div>
   <form onSubmit={saveEntry} className="fin-entry-form">
    <div className="fin-dir" role="group" aria-label="Type">{[['OUT','Expense / cash out'],['IN','Income / cash in']].map(([k,l])=><button key={k} type="button" className={form.direction===k?'active '+k.toLowerCase():''} onClick={()=>setForm({...form,direction:k,category:cats[form.category]?.direction===k?form.category:''})}>{l}</button>)}</div>
    <div className="editor-grid">
     <label>Date*<input type="date" required value={form.entry_date} onChange={e=>setForm({...form,entry_date:e.target.value})}/></label>
     <label>Amount (RM)*<input type="number" required min="0.01" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label>
     <label className="full">Category*<select required value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option value="">Select category</option>{catOptions(form.direction).map(g=><optgroup key={g.g} label={g.label}>{g.items.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}</optgroup>)}</select>{form.category&&<small className="fin-hint">Shown under: {GROUP_LABEL[cats[form.category]?.group]}</small>}</label>
     <label className="full">Details<input maxLength="255" value={form.details||''} onChange={e=>setForm({...form,details:e.target.value})} placeholder="Optional, e.g. TNB bill March"/></label>
    </div>
    <div className="form-actions"><button type="submit" disabled={saving}>{saving?'Saving…':form.id?'Save Changes':'Add Entry'}</button><button type="button" className="secondary" onClick={()=>setForm(null)} disabled={saving}>Cancel</button></div>
   </form></div></div>}
 </section>;
}
