import React,{useEffect,useRef,useState} from 'react';

const amount=(value,currency='MYR')=>Number(value||0).toLocaleString('en-MY',{style:'currency',currency});
const monthStart=month=>`${month}-01`;
const monthEnd=month=>new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).toISOString().slice(0,10);
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kuala_Lumpur'});
const cleanLines=lines=>lines.map(line=>({label:String(line.label||'').trim(),amount:String(line.amount||'')}));

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
  const selectedEmployee=employees.find(employee=>String(employee.id)===String(employeeId));
  const net=()=>{
    const sum=lines=>lines.reduce((total,line)=>total+Number(line.amount||0),0);
    return Number(basicPay||0)+Number(fixedAllowance||0)+sum(earnings)-sum(deductions);
  };
  const resetForm=()=>{setEditingId(null);setEmployeeId('');setPayDate(today());setBasicPay('');setFixedAllowance('0.00');setEarnings([]);setDeductions([]);setNotes('');};
  const editDraft=row=>{
    setSelected(row);setEditingId(row.id);setEmployeeId(String(row.employee_id));setPayDate(row.pay_date);
    setBasicPay(String(row.basic_pay));setFixedAllowance(String(row.fixed_allowance));setEarnings(cleanLines(row.earnings||[]));setDeductions(cleanLines(row.deductions||[]));setNotes(row.notes||'');
    window.scrollTo({top:0,behavior:'smooth'});
  };
  const save=async event=>{
    event.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');
    try {
      const payload={request_id:crypto.randomUUID(),basic_pay:basicPay,fixed_allowance:fixedAllowance,
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
  if(!canView)return <div className="panel"><h3>Payslip</h3><p>You need HR Salary Access permission to view payslips.</p></div>;
  return <div className="hr-payslip-module">
    <div className="hr-toolbar"><PayslipField label="Pay month"><input type="month" value={period} onChange={event=>setPeriod(event.target.value)} required/></PayslipField></div>
    {error&&<div className="hr-error" role="alert">{error}</div>}{notice&&<div className="hr-success" role="status">{notice}<button type="button" onClick={()=>setNotice('')}>×</button></div>}
    {canManage&&<form className="panel hr-payslip-form" onSubmit={save}>
      <h3>{editingId?'Edit Draft Payslip':'Create Payslip Draft'}</h3>
      <div className="hr-form-grid">
        <PayslipField label="Employee"><select value={employeeId} disabled={Boolean(editingId)||busy} onChange={event=>{const id=event.target.value;setEmployeeId(id);const item=employees.find(row=>String(row.id)===id);setBasicPay(item?.salary_type==='monthly'?String(item.basic_rate||''):'');setFixedAllowance(String(item?.fixed_allowance||'0.00'));}} required><option value="">Select employee</option>{employees.map(item=><option key={item.id} value={item.id}>{item.staff_code} · {item.full_name}{!item.salary_history_id?' — no salary profile':''}</option>)}</select></PayslipField>
        <PayslipField label="Pay date"><input type="date" value={payDate} disabled={Boolean(editingId)||busy} onChange={event=>setPayDate(event.target.value)} required/></PayslipField>
        <PayslipField label="Basic pay for this period (MYR)"><input type="number" min="0" step="0.01" value={basicPay} onChange={event=>setBasicPay(event.target.value)} required/></PayslipField>
        <PayslipField label="Fixed allowance for this period (MYR)"><input type="number" min="0" step="0.01" value={fixedAllowance} onChange={event=>setFixedAllowance(event.target.value)} required/></PayslipField>
      </div>
      {selectedEmployee&&<p className="hr-muted">Salary profile: {selectedEmployee.salary_type||'not set'} · {selectedEmployee.department_name||'No department'} · {selectedEmployee.position_name||'No position'}. Monthly basic and fixed allowance are prefilled; verify amounts before saving.</p>}
      <LinesEditor title="Additional earnings" lines={earnings} onChange={setEarnings}/>
      <LinesEditor title="Deductions" lines={deductions} onChange={setDeductions}/>
      <PayslipField label="Notes"><textarea maxLength="1000" rows="2" value={notes} onChange={event=>setNotes(event.target.value)}/></PayslipField>
      <p className="hr-muted">Enter approved statutory deductions (such as EPF, SOCSO, EIS and PCB) as deduction lines. This version does not calculate statutory rates automatically.</p>
      <p><strong>Estimated net pay: {amount(net())}</strong></p>
      <div className="hr-form-actions"><button type="button" disabled={busy} onClick={resetForm}>Clear</button><button type="submit" className="primary" disabled={busy}>{busy?'Saving…':editingId?'Update Draft':'Save Draft'}</button></div>
    </form>}
    <div className="panel hr-table-wrap"><h3>Payslips · {period}</h3>{loading?<p role="status">Loading payslips…</p>:<table><thead><tr><th>Payslip</th><th>Employee</th><th>Pay date</th><th>Gross</th><th>Deductions</th><th>Net pay</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      {rows.map(row=><tr key={row.id}><td>{row.payslip_no}</td><td>{row.staff_code_snapshot} · {row.full_name_snapshot}</td><td>{row.pay_date}</td><td>{amount(row.gross_pay,row.currency_code)}</td><td>{amount(row.total_deductions,row.currency_code)}</td><td>{amount(row.net_pay,row.currency_code)}</td><td><span className={'hr-badge '+(row.status==='ISSUED'?'active':'')}>{row.status}</span></td><td className="hr-payslip-actions"><button type="button" disabled={busy} onClick={()=>openRow(row)}>View / Print</button>{row.status==='DRAFT'&&canManage&&<><button type="button" disabled={busy} onClick={()=>editDraft(row)}>Edit</button><button type="button" className="primary" disabled={busy} onClick={()=>issue(row)}>Issue</button></>}{row.status!=='VOID'&&canManage&&<button type="button" disabled={busy} onClick={()=>voidPayslip(row)}>Void</button>}</td></tr>)}
      {!rows.length&&<tr><td colSpan="8">No payslips for this month yet.</td></tr>}</tbody></table>}</div>
    {selected&&<section className="panel hr-payslip-paper" aria-label="Payslip preview"><div className="hr-payslip-head"><div><h2>{outletName}</h2><p>Payslip · {selected.payslip_no} · {selected.status}</p></div><button className="hr-no-print" type="button" onClick={()=>window.print()}>Print payslip</button></div>
      <div className="hr-payslip-facts"><div><b>Employee</b><span>{selected.full_name_snapshot}</span></div><div><b>Staff code</b><span>{selected.staff_code_snapshot}</span></div><div><b>Department</b><span>{selected.department_snapshot||'—'}</span></div><div><b>Position</b><span>{selected.position_snapshot||'—'}</span></div><div><b>Period</b><span>{selected.period_start} – {selected.period_end}</span></div><div><b>Pay date</b><span>{selected.pay_date}</span></div></div>
      <h3>Earnings</h3><table><tbody><tr><td>Basic pay</td><td>{amount(selected.basic_pay,selected.currency_code)}</td></tr><tr><td>Fixed allowance</td><td>{amount(selected.fixed_allowance,selected.currency_code)}</td></tr>{(selected.earnings||[]).map((line,index)=><tr key={index}><td>{line.label}</td><td>{amount(line.amount,selected.currency_code)}</td></tr>)}<tr className="hr-payslip-total"><th>Gross pay</th><th>{amount(selected.gross_pay,selected.currency_code)}</th></tr></tbody></table>
      <h3>Deductions</h3><table><tbody>{(selected.deductions||[]).map((line,index)=><tr key={index}><td>{line.label}</td><td>{amount(line.amount,selected.currency_code)}</td></tr>)}<tr className="hr-payslip-total"><th>Total deductions</th><th>{amount(selected.total_deductions,selected.currency_code)}</th></tr></tbody></table>
      <div className="hr-payslip-net"><span>Net pay</span><strong>{amount(selected.net_pay,selected.currency_code)}</strong></div>{selected.notes&&<p><b>Notes:</b> {selected.notes}</p>}{selected.void_reason&&<p><b>Void reason:</b> {selected.void_reason}</p>}
    </section>}
  </div>;
}
