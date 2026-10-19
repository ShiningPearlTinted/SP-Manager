import React,{useEffect,useRef,useState} from 'react';

const amount=(value,currency='MYR')=>Number(value||0).toLocaleString('en-MY',{style:'currency',currency});
const monthStart=month=>`${month}-01`;
const monthEnd=month=>new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).toISOString().slice(0,10);
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kuala_Lumpur'});
const cleanLines=lines=>lines.map(line=>({label:String(line.label||'').trim(),amount:String(line.amount||'')}));
const htmlEscape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function PayslipField({label,children}) {return <label className="hr-field"><span>{label}</span>{children}</label>;}
function LinesEditor({title,lines,onChange}) {
  const update=(index,key,value)=>onChange(lines.map((line,i)=>i===index?{...line,[key]:value}:line));
  return <div className="hr-payslip-lines"><div className="hr-toolbar"><h4>{title}</h4><button type="button" onClick={()=>onChange([...lines,{label:'',amount:''}])}>Add line</button></div>
    {lines.map((line,index)=><div className="hr-payslip-line" key={index}>
      <input aria-label={`${title} description ${index+1}`} value={line.label} maxLength="100" placeholder="Description (e.g. EPF, overtime)" onChange={event=>update(index,'label',event.target.value)}/>
      <input aria-label={`${title} amount ${index+1}`} type="number" min="0" step="0.01" value={line.amount} placeholder="0.00" onChange={event=>update(index,'amount',event.target.value)}/>
      <button type="button" aria-label={`Remove ${title} line ${index+1}`} onClick={()=>onChange(lines.filter((_,i)=>i!==index))}>Remove</button>
    </div>)}
    {!lines.length&&<p className="hr-muted">No {title.toLowerCase()} added.</p>}
  </div>;
}

export default function PayslipPanel({api,outlet,outletName,can}) {
  const apiRef=useRef(api);apiRef.current=api;
  const [period,setPeriod]=useState(today().slice(0,7));
  const [rows,setRows]=useState([]),[employees,setEmployees]=useState([]);
  const [employeeId,setEmployeeId]=useState(''),[payDate,setPayDate]=useState(today());
  const [advances,setAdvances]=useState([]),[advanceId,setAdvanceId]=useState(''),[advanceRepayment,setAdvanceRepayment]=useState('');
  const [basicPay,setBasicPay]=useState(''),[fixedAllowance,setFixedAllowance]=useState('0.00');
  const [earnings,setEarnings]=useState([]),[deductions,setDeductions]=useState([]),[notes,setNotes]=useState('');
  const [selected,setSelected]=useState(null),[editingId,setEditingId]=useState(null);
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[refresh,setRefresh]=useState(0);
  const canView=can('viewHrSalary'),canManage=can('manageHrSalary')&&canView;
  useEffect(()=>{
    if(!canView){setLoading(false);return;}
    let active=true;setLoading(true);setError('');setSelected(null);setEditingId(null);
    Promise.all([
      apiRef.current('list-payslips',{period_start:monthStart(period)}),
      apiRef.current('payslip-employees',{period_start:monthStart(period)})
    ]).then(([p,e])=>{if(active){setRows(p.payslips||[]);setEmployees(e.employees||[]);setEmployeeId('');setBasicPay('');setFixedAllowance('0.00');setEarnings([]);setDeductions([]);setNotes('');}})
      .catch(e=>{if(active)setError(e.message);})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[period,outlet,refresh,canView]);
  useEffect(()=>{
    let active=true;setAdvances([]);
    if(!employeeId){if(!editingId){setAdvanceId('');setAdvanceRepayment('');}return ()=>{active=false;};}
    apiRef.current('salary-advances',{employee_id:employeeId}).then(response=>{if(active)setAdvances((response.advances||[]).filter(row=>row.status==='OPEN'&&Number(row.balance)>0));}).catch(()=>{if(active)setAdvances([]);});
    return ()=>{active=false;};
  },[employeeId,outlet,editingId]);
  const selectedEmployee=employees.find(employee=>String(employee.id)===String(employeeId));
  const net=()=>{
    const sum=lines=>lines.reduce((total,line)=>total+Number(line.amount||0),0);
    return Number(basicPay||0)+Number(fixedAllowance||0)+sum(earnings)-sum(deductions)-Number(advanceRepayment||0);
  };
  const resetForm=()=>{setEditingId(null);setEmployeeId('');setPayDate(today());setBasicPay('');setFixedAllowance('0.00');setEarnings([]);setDeductions([]);setNotes('');setAdvanceId('');setAdvanceRepayment('');};
  const editDraft=row=>{
    setSelected(row);setEditingId(row.id);setEmployeeId(String(row.employee_id));setPayDate(row.pay_date);
    setBasicPay(String(row.basic_pay));setFixedAllowance(String(row.fixed_allowance));setEarnings(cleanLines(row.earnings||[]));setDeductions(cleanLines((row.deductions||[]).filter(line=>line.label!=='Salary advance repayment')));setNotes(row.notes||'');
    setAdvanceId(row.salary_advance_id?String(row.salary_advance_id):'');setAdvanceRepayment(row.salary_advance_repayment&&Number(row.salary_advance_repayment)>0?String(row.salary_advance_repayment):'');
    window.scrollTo({top:0,behavior:'smooth'});
  };
  const save=async event=>{
    event.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');
    try {
      const payload={request_id:crypto.randomUUID(),basic_pay:basicPay,fixed_allowance:fixedAllowance,advance_id:advanceId||null,advance_repayment:advanceId?advanceRepayment:'0.00',
        earnings:cleanLines(earnings),deductions:cleanLines(deductions),notes};
      let result;
      if(editingId) result=await apiRef.current('update-payslip',{...payload,id:editingId},true);
      else {
        if(!employeeId)throw new Error('Select an employee.');
        if(!selectedEmployee?.salary_history_id)throw new Error('The employee needs a salary profile effective from the first day of this month.');
        result=await apiRef.current('create-payslip',{...payload,employee_id:employeeId,period_start:monthStart(period),period_end:monthEnd(period),pay_date:payDate},true);
      }
      setNotice(editingId?'Draft payslip updated.':'Payslip draft created. Review it, then issue it.');resetForm();setRefresh(value=>value+1);
      if(result?.id)setSelectedIdAfterRefresh(result.id);
    } catch(e){setError(e.message);} finally {setBusy(false);}
  };
  const [selectAfterRefresh,setSelectAfterRefresh]=useState(null);
  const setSelectedIdAfterRefresh=id=>setSelectAfterRefresh(id);
  useEffect(()=>{if(selectAfterRefresh){const row=rows.find(item=>Number(item.id)===Number(selectAfterRefresh));if(row){setSelected(row);setSelectAfterRefresh(null);}}},[rows,selectAfterRefresh]);
  const issue=async row=>{
    if(!window.confirm(`Issue payslip ${row.payslip_no}? An issued payslip is locked.`))return;
    setBusy(true);setError('');
    try {await apiRef.current('issue-payslip',{id:row.id,request_id:crypto.randomUUID()},true);setNotice('Payslip issued.');setRefresh(value=>value+1);setSelected({...row,status:'ISSUED'});}
    catch(e){setError(e.message);}finally{setBusy(false);}
  };
  const voidPayslip=async row=>{
    const reason=window.prompt(`Reason for voiding ${row.payslip_no}:`);
    if(!reason?.trim())return;
    if(!window.confirm('Void this payslip? It will remain in the record as VOID.'))return;
    setBusy(true);setError('');
    try {await apiRef.current('void-payslip',{id:row.id,reason:reason.trim(),request_id:crypto.randomUUID()},true);setNotice('Payslip voided. You can create a replacement for this month.');setRefresh(value=>value+1);setSelected({...row,status:'VOID',void_reason:reason.trim()});}
    catch(e){setError(e.message);}finally{setBusy(false);}
  };
  const openRow=async row=>{
    setBusy(true);setError('');
    try {const response=await apiRef.current('payslip',{id:row.id});setSelected(response.payslip);}
    catch(e){setError(e.message);}finally{setBusy(false);}
  };
  const printPayslip=()=>{
    if(!selected)return;
    const popup=window.open('','_blank','width=900,height=900');
    if(!popup){setError('Benarkan pop-up untuk mencetak payslip.');return;}
    const cell=(label,value)=>`<tr><td>${htmlEscape(label)}</td><td class="money">${htmlEscape(value)}</td></tr>`;
    const earningRows=[cell('Basic pay',amount(selected.basic_pay,selected.currency_code)),cell('Fixed allowance',amount(selected.fixed_allowance,selected.currency_code)),...(selected.earnings||[]).map(line=>cell(line.label,amount(line.amount,selected.currency_code)))].join('');
    const deductionRows=(selected.deductions||[]).map(line=>cell(line.label,amount(line.amount,selected.currency_code))).join('')||'<tr><td colspan="2" class="empty">No deductions</td></tr>';
    popup.document.open();
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Payslip ${htmlEscape(selected.payslip_no)}</title><style>
      @page{size:A4;margin:16mm}*{box-sizing:border-box}body{font:14px Arial,sans-serif;color:#172033;margin:0}.sheet{max-width:780px;margin:0 auto}.top{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;border-bottom:2px solid #1683a5;padding-bottom:16px}.top h1{font-size:23px;margin:0 0 8px}.top p{margin:4px 0;color:#526174}.tag{border:1px solid #9aa9b8;border-radius:20px;padding:6px 12px;font-size:11px}.facts{display:grid;grid-template-columns:repeat(3,1fr);gap:18px 24px;margin:24px 0}.fact span{display:block;color:#64748b;font-size:11px;margin-bottom:5px}.fact strong{overflow-wrap:anywhere}.section{margin-top:22px}.section h2{font-size:15px;margin:0 0 8px;padding-bottom:7px;border-bottom:1px solid #d8e0e8}table{width:100%;border-collapse:collapse}td{padding:9px 8px;border-bottom:1px solid #e5eaf0}.money{text-align:right;font-variant-numeric:tabular-nums}.total td{font-weight:700;border-top:1px solid #98a6b5}.net{display:flex;justify-content:space-between;background:#f1f6f8;padding:15px 12px;margin-top:20px;font-size:17px}.notes{margin-top:18px;white-space:pre-wrap}.empty{color:#64748b;text-align:center}.footer{margin-top:32px;padding-top:10px;border-top:1px solid #d8e0e8;color:#64748b;font-size:10px;text-align:center}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.sheet{max-width:none}}
    </style></head><body><main class="sheet"><header class="top"><div><h1>${htmlEscape(outletName||'Company')}</h1><p>Payslip: <strong>${htmlEscape(selected.payslip_no)}</strong></p><p>Pay period: ${htmlEscape(selected.period_start)} – ${htmlEscape(selected.period_end)}</p></div><span class="tag">${htmlEscape(selected.status)}</span></header>
      <section class="facts"><div class="fact"><span>Employee</span><strong>${htmlEscape(selected.full_name_snapshot)}</strong></div><div class="fact"><span>Staff code</span><strong>${htmlEscape(selected.staff_code_snapshot)}</strong></div><div class="fact"><span>Pay date</span><strong>${htmlEscape(selected.pay_date)}</strong></div><div class="fact"><span>Department</span><strong>${htmlEscape(selected.department_snapshot||'—')}</strong></div><div class="fact"><span>Position</span><strong>${htmlEscape(selected.position_snapshot||'—')}</strong></div></section>
      <section class="section"><h2>Earnings</h2><table>${earningRows}<tr class="total"><td>Gross pay</td><td class="money">${htmlEscape(amount(selected.gross_pay,selected.currency_code))}</td></tr></table></section>
      <section class="section"><h2>Deductions</h2><table>${deductionRows}<tr class="total"><td>Total deductions</td><td class="money">${htmlEscape(amount(selected.total_deductions,selected.currency_code))}</td></tr></table></section>
      <div class="net"><strong>Net pay</strong><strong>${htmlEscape(amount(selected.net_pay,selected.currency_code))}</strong></div>${selected.notes?`<p class="notes"><strong>Notes:</strong> ${htmlEscape(selected.notes)}</p>`:''}${selected.void_reason?`<p class="notes"><strong>Void reason:</strong> ${htmlEscape(selected.void_reason)}</p>`:''}<footer class="footer">This payslip is system generated.</footer></main></body></html>`);
    popup.document.close();popup.focus();popup.setTimeout(()=>popup.print(),250);
  };
  if(!canView)return <div className="panel"><h3>Payslip</h3><p>You need HR Salary Access permission to view payslips.</p></div>;
  return <div className="hr-payslip-module">
    <div className="hr-toolbar"><PayslipField label="Pay month"><input type="month" value={period} onChange={event=>setPeriod(event.target.value)} required/></PayslipField></div>
    {error&&<div className="hr-error" role="alert">{error}</div>}{notice&&<div className="hr-success" role="status">{notice}<button type="button" onClick={()=>setNotice('')}>×</button></div>}
    {canManage&&<form className="panel hr-payslip-form" onSubmit={save}>
      <h3>{editingId?'Edit Draft Payslip':'Create Payslip Draft'}</h3>
      <div className="hr-form-grid">
        <PayslipField label="Employee"><select value={employeeId} disabled={Boolean(editingId)||busy} onChange={event=>{const id=event.target.value;setEmployeeId(id);setAdvanceId('');setAdvanceRepayment('');const item=employees.find(row=>String(row.id)===id);setBasicPay(item?.salary_type==='monthly'?String(item.basic_rate||''):'');setFixedAllowance(String(item?.fixed_allowance||'0.00'));}} required><option value="">Select employee</option>{employees.map(item=><option key={item.id} value={item.id}>{item.staff_code} · {item.full_name}{!item.salary_history_id?' — no salary profile':''}</option>)}</select></PayslipField>
        <PayslipField label="Pay date"><input type="date" value={payDate} disabled={Boolean(editingId)||busy} onChange={event=>setPayDate(event.target.value)} required/></PayslipField>
        <PayslipField label="Basic pay for this period (MYR)"><input type="number" min="0" step="0.01" value={basicPay} onChange={event=>setBasicPay(event.target.value)} required/></PayslipField>
        <PayslipField label="Fixed allowance for this period (MYR)"><input type="number" min="0" step="0.01" value={fixedAllowance} onChange={event=>setFixedAllowance(event.target.value)} required/></PayslipField>
      </div>
      {selectedEmployee&&<p className="hr-muted">Salary profile: {selectedEmployee.salary_type||'not set'} · {selectedEmployee.department_name||'No department'} · {selectedEmployee.position_name||'No position'}. Monthly basic and fixed allowance are prefilled; verify amounts before saving.</p>}
      <div className="hr-advance-repayment"><PayslipField label="Outstanding salary advance"><select value={advanceId} onChange={event=>{setAdvanceId(event.target.value);setAdvanceRepayment('');}} disabled={!employeeId||busy}><option value="">No advance repayment</option>{advances.map(item=><option key={item.id} value={item.id}>Advance {item.advance_date} · balance {amount(item.balance)}</option>)}</select></PayslipField><PayslipField label="Repayment this payslip (MYR)"><input type="number" min="0.01" max={advances.find(item=>String(item.id)===advanceId)?.balance||undefined} step="0.01" value={advanceRepayment} required={Boolean(advanceId)} disabled={!advanceId||busy} onChange={event=>setAdvanceRepayment(event.target.value)} placeholder="Example: 100.50"/></PayslipField></div>
      <LinesEditor title="Additional earnings" lines={earnings} onChange={setEarnings}/>
      <LinesEditor title="Deductions" lines={deductions} onChange={setDeductions}/>
      <PayslipField label="Notes"><textarea maxLength="1000" rows="2" value={notes} onChange={event=>setNotes(event.target.value)}/></PayslipField>
      <p className="hr-muted">Enter approved statutory deductions (such as EPF, SOCSO, EIS and PCB) as deduction lines. This version does not calculate statutory rates automatically.</p>
      <p><strong>Estimated net pay: {amount(net())}</strong></p>
      <div className="hr-form-actions"><button type="button" disabled={busy} onClick={resetForm}>Clear</button><button type="submit" className="primary" disabled={busy}>{busy?'Saving…':editingId?'Update Draft':'Save Draft'}</button></div>
    </form>}
    <div className="panel hr-table-wrap"><h3>Payslips · {period}</h3>{loading?<p role="status">Loading payslips…</p>:<table className="hr-payslip-table"><thead><tr><th>Payslip</th><th>Employee</th><th>Pay date</th><th>Gross</th><th>Deductions</th><th>Net pay</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      {rows.map(row=><tr key={row.id}><td>{row.payslip_no}</td><td>{row.staff_code_snapshot} · {row.full_name_snapshot}</td><td>{row.pay_date}</td><td>{amount(row.gross_pay,row.currency_code)}</td><td>{amount(row.total_deductions,row.currency_code)}</td><td>{amount(row.net_pay,row.currency_code)}</td><td><span className={'hr-badge '+(row.status==='ISSUED'?'active':'')}>{row.status}</span></td><td><div className="hr-payslip-actions"><button type="button" disabled={busy} onClick={()=>openRow(row)}>View / Print</button>{row.status==='DRAFT'&&canManage&&<><button type="button" disabled={busy} onClick={()=>editDraft(row)}>Edit</button><button type="button" className="primary" disabled={busy} onClick={()=>issue(row)}>Issue</button></>}{row.status!=='VOID'&&canManage&&<button type="button" disabled={busy} onClick={()=>voidPayslip(row)}>Void</button>}</div></td></tr>)}
      {!rows.length&&<tr><td colSpan="8">No payslips for this month yet.</td></tr>}</tbody></table>}</div>
    {selected&&<section className="panel hr-payslip-paper" aria-label="Payslip preview"><div className="hr-payslip-head"><div><h2>{outletName}</h2><p>Payslip · {selected.payslip_no} · {selected.status}</p></div><button className="hr-no-print" type="button" onClick={printPayslip}>Print payslip</button></div>
      <div className="hr-payslip-facts"><div><b>Employee</b><span>{selected.full_name_snapshot}</span></div><div><b>Staff code</b><span>{selected.staff_code_snapshot}</span></div><div><b>Department</b><span>{selected.department_snapshot||'—'}</span></div><div><b>Position</b><span>{selected.position_snapshot||'—'}</span></div><div><b>Period</b><span>{selected.period_start} – {selected.period_end}</span></div><div><b>Pay date</b><span>{selected.pay_date}</span></div></div>
      <h3>Earnings</h3><table><tbody><tr><td>Basic pay</td><td>{amount(selected.basic_pay,selected.currency_code)}</td></tr><tr><td>Fixed allowance</td><td>{amount(selected.fixed_allowance,selected.currency_code)}</td></tr>{(selected.earnings||[]).map((line,index)=><tr key={index}><td>{line.label}</td><td>{amount(line.amount,selected.currency_code)}</td></tr>)}<tr className="hr-payslip-total"><th>Gross pay</th><th>{amount(selected.gross_pay,selected.currency_code)}</th></tr></tbody></table>
      <h3>Deductions</h3><table><tbody>{(selected.deductions||[]).map((line,index)=><tr key={index}><td>{line.label}</td><td>{amount(line.amount,selected.currency_code)}</td></tr>)}<tr className="hr-payslip-total"><th>Total deductions</th><th>{amount(selected.total_deductions,selected.currency_code)}</th></tr></tbody></table>
      <div className="hr-payslip-net"><span>Net pay</span><strong>{amount(selected.net_pay,selected.currency_code)}</strong></div>{selected.notes&&<p><b>Notes:</b> {selected.notes}</p>}{selected.void_reason&&<p><b>Void reason:</b> {selected.void_reason}</p>}
    </section>}
  </div>;
}
