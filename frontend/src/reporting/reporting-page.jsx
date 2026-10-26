import React,{useEffect,useMemo,useRef,useState} from 'react';
import {downloadExcel,printReport} from './report-exports.js';
import './reporting.css';

function localDate(date=new Date()) {return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
function Filter({label,value,onChange,items,disabled=false}) {return <label className="reporting-field"><span>{label}</span><select value={value} onChange={e=>onChange(e.target.value)} disabled={disabled}><option value="">{disabled?'Not applicable':'All'}</option>{items.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>;}
function formatted(value,type) {if(value===null||value===undefined)return '—';if(type==='money')return Number(value).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2});if(type==='number')return Number(value).toLocaleString('en-MY',{maximumFractionDigits:3});return String(value);}
export default function ReportingPage({canView,apiBase,headers,outlet}) {
  const requestRef=useRef({apiBase,headers,outlet});requestRef.current={apiBase,headers,outlet};
  const [catalog,setCatalog]=useState([]),[options,setOptions]=useState({customers:[],suppliers:[],users:[],products:[],groups:[],terminals:[]});
  const [selected,setSelected]=useState(''),[search,setSearch]=useState(''),[filters,setFilters]=useState({customer:'',supplier:'',user:'',terminal:'',product:'',group:'',include_subgroups:'1',start:localDate().slice(0,7)+'-01',end:localDate()});
  const [result,setResult]=useState(null),[resultKey,setResultKey]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[exporting,setExporting]=useState(false),[page,setPage]=useState(1);
  const generation=useRef(0);
  const definition=catalog.find(report=>report.id===selected);
  const queryKey=JSON.stringify({selected,filters,outlet});
  const ready=Boolean(result&&queryKey===resultKey&&!busy);
  async function request(action,payload={}) {
    const current=requestRef.current;const params=new URLSearchParams({action,outlet_id:String(current.outlet),...payload});
    const response=await fetch(current.apiBase+'?'+params,{cache:'no-store',headers:current.headers({'Content-Type':'application/json'})});
    if(response.status===401){sessionStorage.removeItem('sp_api_token');sessionStorage.removeItem('sp_auth');sessionStorage.removeItem('sp_auth_version');window.dispatchEvent(new Event('sp-api-session-expired'));}
    if(action==='report-pdf'){
      if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||'PDF could not be generated.');}return response.blob();
    }
    const data=await response.json().catch(()=>null);if(!response.ok||!data?.ok)throw new Error(data?.error||'Reports could not be loaded.');return data;
  }
  useEffect(()=>{
    let active=true;generation.current++;setLoading(true);setError('');setResult(null);setSelected('');
    if(!canView){setLoading(false);return;}
    Promise.all([request('report-catalog'),request('report-options')]).then(([c,o])=>{if(active){setCatalog(c.reports);setOptions(o.options);}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;generation.current++;};
  },[outlet,canView]);
  const grouped=useMemo(()=>{
    const groups={};for(const report of catalog){if(!((report.category+' '+report.title).toLowerCase().includes(search.trim().toLowerCase())))continue;(groups[report.category]??=[]).push(report);}return groups;
  },[catalog,search]);
  function choose(id) {
    generation.current++;setBusy(false);setError('');setSelected(id);setResult(null);setPage(1);
    const report=catalog.find(r=>r.id===id);setFilters(previous=>{const next={...previous};for(const key of ['customer','supplier','user','terminal','product','group'])if(!report.filters.includes(key))next[key]='';return next;});
  }
  function change(key,value) {generation.current++;setBusy(false);setError('');setFilters(previous=>({...previous,[key]:value}));}
  function payload() {const values={report:selected,...filters};for(const [key,value] of Object.entries(values))if(value==='')delete values[key];return values;}
  async function show(event) {
    event?.preventDefault();if(!definition||busy)return;const token=++generation.current;const key=queryKey;setBusy(true);setError('');
    try {const data=await request('run-report',payload());if(token===generation.current){setResult(data);setResultKey(key);setPage(1);}}
    catch(e){if(token===generation.current)setError(e.message);}finally{if(token===generation.current)setBusy(false);}
  }
  async function exportFile(kind) {
    if(!ready||exporting)return;setExporting(true);setError('');
    try {
      if(kind==='excel')await downloadExcel(result);
      else if(kind==='print')printReport(result);
      else {const blob=await request('report-pdf',payload());const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='SP-Manager-'+selected+'-'+filters.start+'.pdf';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    }catch(e){setError(e.message);}finally{setExporting(false);}
  }
  if(!canView)return <section className="content reporting-page"><div className="reporting-error" role="alert">You do not have permission to view Reports.</div></section>;
  const applies=key=>Boolean(definition?.filters.includes(key));
  const pages=result?Math.max(1,Math.ceil(result.rows.length/50)):1;
  return <section className="content reporting-page">
    {error&&<div className="reporting-error" role="alert">{error}<button type="button" onClick={()=>setError('')} aria-label="Dismiss error">×</button></div>}
    {loading?<p role="status">Loading report catalogue…</p>:<div className="reporting-layout">
      <div className="reporting-main">
        {!result?<div className="reporting-catalog"><div className="reporting-catalog-head"><h2>Select report</h2><label><span className="reporting-sr">Search reports</span><input type="search" placeholder="Search reports" value={search} onChange={e=>setSearch(e.target.value)}/></label></div>
          <nav aria-label="Report catalogue" className="reporting-report-list">{Object.entries(grouped).map(([category,reports])=><div key={category} className="reporting-category"><h3>{category}</h3>{reports.map(report=><button type="button" key={report.id} aria-pressed={selected===report.id} className={'reporting-report-option'+(selected===report.id?' is-selected':'')} onClick={()=>choose(report.id)}><span aria-hidden="true">▤</span><span>{report.title}</span>{selected===report.id&&<span aria-hidden="true">✓</span>}</button>)}</div>)}{!Object.keys(grouped).length&&<p>No reports match your search.</p>}</nav>
        </div>:<div className="reporting-preview"><div className="reporting-preview-actions"><button onClick={()=>{generation.current++;setBusy(false);setResult(null);}}>← Report list</button><span>{result.row_count} rows · Page {page} of {pages}</span></div>
          <div className="reporting-paper"><div className="reporting-paper-header"><strong>{result.company.company_name}</strong><h2>{result.report.category} · {result.report.title}</h2><p>{result.outlet.outlet_code} · {result.outlet.outlet_name}</p><p>{result.report.period?result.period.start+' — '+result.period.end:'Current stock snapshot'}</p>{result.applied_filter_labels.length>0&&<p>{result.applied_filter_labels.join(' · ')}</p>}<small>Generated {new Date(result.generated_at).toLocaleString('en-MY')}</small></div>
            {!ready&&<div className="reporting-warning">Filters changed. Select Show report to refresh the preview.</div>}
            <div className="reporting-table-wrap"><table><thead><tr>{result.columns.map(col=><th key={col.key} className={col.type!=='text'?'reporting-number':''}>{col.label}</th>)}</tr></thead><tbody>{result.rows.slice((page-1)*50,page*50).map((row,i)=><tr key={i}>{result.columns.map(col=><td key={col.key} className={col.type!=='text'?'reporting-number':''}>{formatted(row[col.key],col.type)}</td>)}</tr>)}{!result.rows.length&&<tr><td colSpan={result.columns.length}>No records match the selected filters.</td></tr>}</tbody><tfoot><tr>{result.columns.map((col,i)=><th key={col.key} className={col.type!=='text'?'reporting-number':''}>{Object.hasOwn(result.totals,col.key)?formatted(result.totals[col.key],col.type):i===0?'TOTAL':''}</th>)}</tr></tfoot></table></div>
            <p className="reporting-muted">Currency: {result.company.currency_code||'MYR'}.</p>
            {result.warnings.length>0&&<details className="reporting-notes"><summary>Notes</summary>{result.warnings.map(warning=><p key={warning}>{warning}</p>)}</details>}
          </div><div className="reporting-pagination"><button disabled={page<=1} onClick={()=>setPage(value=>value-1)}>Previous</button><span>{page} / {pages}</span><button disabled={page>=pages} onClick={()=>setPage(value=>value+1)}>Next</button></div>
        </div>}
      </div>
      <form className="reporting-filters" onSubmit={show}><h3>Filter</h3><div className="reporting-selected">{definition?definition.category+' · '+definition.title:'Select a report'}</div>
        <Filter label="Customers & suppliers" value={applies('supplier')?filters.supplier:filters.customer} onChange={value=>change(applies('supplier')?'supplier':'customer',value)} items={applies('supplier')?options.suppliers:options.customers} disabled={!applies('customer')&&!applies('supplier')}/>
        <Filter label="User" value={filters.user} onChange={value=>change('user',value)} items={options.users} disabled={!applies('user')}/>
        <Filter label="Cash register" value={filters.terminal} onChange={value=>change('terminal',value)} items={options.terminals} disabled={!applies('terminal')}/>
        <Filter label="Product" value={filters.product} onChange={value=>change('product',value)} items={options.products} disabled={!applies('product')}/>
        <Filter label="Product group" value={filters.group} onChange={value=>change('group',value)} items={options.groups} disabled={!applies('group')}/>
        <label className="reporting-check"><input type="checkbox" checked={filters.include_subgroups==='1'} onChange={e=>change('include_subgroups',e.target.checked?'1':'0')} disabled={!applies('group')}/>Include subgroups</label>
        <div className="reporting-date-range"><label className="reporting-field"><span>From</span><input type="date" required value={filters.start} max={filters.end} disabled={!definition?.period} onChange={e=>change('start',e.target.value)}/></label><label className="reporting-field"><span>To</span><input type="date" required min={filters.start} value={filters.end} disabled={!definition?.period} onChange={e=>change('end',e.target.value)}/></label></div>
        <div className="reporting-actions"><button className="primary" type="submit" disabled={!definition||busy}>{busy?'Loading…':'⌕ Show report'}</button><button type="button" disabled={!ready||exporting} onClick={()=>exportFile('print')}>▤ Print</button><button type="button" disabled={!ready||exporting} onClick={()=>exportFile('excel')}>▦ Excel</button><button type="button" disabled={!ready||exporting} onClick={()=>exportFile('pdf')}>↓ PDF</button></div>
        {exporting&&<p role="status">Preparing export…</p>}
      </form>
    </div>}
  </section>;
}

