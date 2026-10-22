import React,{useEffect,useMemo,useState} from 'react';

const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kuala_Lumpur'});
const currentMonth=()=>today().slice(0,7);
const money=value=>Number(value||0).toLocaleString('en-MY',{style:'currency',currency:'MYR'});
const operations=['Attendance','Shift & Schedule','Leave Management','Overtime','Claims & Advances','HR Documents'];
const field=(key,label,type='text',required=true,extra={})=>({key,label,type,required,...extra});
const definitions={
 Attendance:{action:'attendance',fields:[field('work_date','Work date','date'),field('clock_in','Clock in','time',false),field('clock_out','Clock out','time',false),field('attendance_status','Status','select',true,{options:['PRESENT','LATE','ABSENT','OFF','ON LEAVE']}),field('notes','Notes','text',false)]},
 'Shift & Schedule':{action:'shift',fields:[field('shift_date','Shift date','date'),field('start_time','Start time','time'),field('end_time','End time','time'),field('break_minutes','Break (minutes)','number',true,{min:0,step:1}),field('notes','Notes','text',false)]},
 'Leave Management':{action:'leave',fields:[field('leave_type','Leave type','select',true,{options:['Annual leave','Medical leave','Emergency leave','Unpaid leave','Maternity leave','Paternity leave','Other']}),field('start_date','Start date','date'),field('end_date','End date','date'),field('days','Days','number',true,{min:0.01,step:0.01}),field('reason','Reason','text')]},
 Overtime:{action:'overtime',fields:[field('work_date','Work date','date'),field('hours','Hours','number',true,{min:0.01,max:24,step:0.01}),field('reason','Reason','text')]},
 'Claims & Advances':{action:'claim',fields:[field('claim_date','Claim date','date'),field('category','Category','select',true,{options:['Travel','Meals','Accommodation','Supplies','Medical','Other']}),field('amount','Amount (MYR)','number',true,{min:0.01,step:0.01}),field('description','Description','text')]}
};
const blank=tab=>Object.fromEntries((definitions[tab]?.fields||[]).map(item=>[item.key,item.key==='work_date'||item.key==='shift_date'||item.key==='claim_date'?today():item.key==='break_minutes'?'0':'']));
const text=value=>value===null||value===undefined||value===''?'—':String(value);

export default function OperationsPanel({tab,api,can,onNavigate}) {
 const [month,setMonth]=useState(currentMonth()),[rows,setRows]=useState([]),[employees,setEmployees]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[form,setForm]=useState(null),[editing,setEditing]=useState(null),[receipt,setReceipt]=useState(null),[reportType,setReportType]=useState('Attendance');
 const isReport=tab==='HR Reports',module=isReport?reportType:tab,isPayroll=tab==='Payroll'||(isReport&&reportType==='Payroll'),config=definitions[module],canSalary=can('viewHrSalary'),canManage=module==='Claims & Advances'?can('manageHrSalary'):can('manageHrEmployees');
 const load=async()=>{
   setLoading(true);setError('');
   try{
     if(isPayroll){
       const response=await api('list-payslips',{period_start:month+'-01'});setRows(response.payslips||[]);return;
     }
     if(module==='HR Reports'&&!operations.includes(reportType))return;
     const [response,options]=await Promise.all([api('operations',{module,month}),api('operations-options')]);setRows(response.records||[]);setEmployees(options.employees||[]);
   }catch(e){setError(e.message||'Could not load HR records.');}
   finally{setLoading(false);}
 };
 useEffect(()=>{setForm(null);setEditing(null);load();},[tab,month,reportType]);
 const totals=useMemo(()=>rows.reduce((result,row)=>({gross:result.gross+Number(row.gross_pay||0),deductions:result.deductions+Number(row.total_deductions||0),net:result.net+Number(row.net_pay||0)}),{gross:0,deductions:0,net:0}),[rows]);
 const save=async event=>{
   event.preventDefault();if(!form||!canManage)return;setBusy(true);setError('');
   try{
     if(module==='HR Documents'){
       if(!receipt)throw new Error('Choose a PDF, JPG or PNG document first.');
       const data=String(await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Could not read the selected file.'));reader.readAsDataURL(receipt);})).split(',')[1]||'';
       await api('upload-hr-document',{...form,file_name:receipt.name,mime_type:receipt.type,file_data:data,request_id:crypto.randomUUID()},true);
     }else if(module==='Claims & Advances'&&form.record_type==='ADVANCE'){
       await api('create-salary-advance',{employee_id:form.employee_id,advance_date:form.claim_date,amount:form.amount,reason:form.description,request_id:crypto.randomUUID()},true);
     }else await api('save-operation',{...form,module,id:editing||undefined,request_id:crypto.randomUUID()},true);
     setNotice(editing?'Record updated.':'Record saved.');setForm(null);setEditing(null);setReceipt(null);await load();
   }catch(e){setError(e.message||'Could not save this HR record.');}finally{setBusy(false);}
 };
 const decide=async(row,status)=>{
   const answer=status==='REJECTED'?window.prompt('Reason for rejection (optional):'):'';
   if(status==='REJECTED'&&answer===null)return;const note=answer||'';setBusy(true);setError('');
   try{await api('decide-operation',{module,id:row.id,status,decision_note:note,request_id:crypto.randomUUID()},true);setNotice(`Request ${status.toLowerCase()}.`);await load();}
   catch(e){setError(e.message||'Could not update request.');}finally{setBusy(false);}
 };
 const payClaim=async row=>{
   if(!window.confirm(`Mark the approved claim for ${money(row.amount)} as paid?`))return;setBusy(true);setError('');
   try{await api('pay-claim',{id:row.id,request_id:crypto.randomUUID()},true);setNotice('Claim marked as paid.');await load();}
   catch(e){setError(e.message||'Could not mark the claim as paid.');}finally{setBusy(false);}
 };
 const remove=async row=>{
   if(!window.confirm('Delete this pending record?'))return;setBusy(true);setError('');
   try{await api('delete-operation',{module,id:row.id,request_id:crypto.randomUUID()},true);setNotice('Record deleted.');await load();}
   catch(e){setError(e.message||'Could not delete record.');}finally{setBusy(false);}
 };
 const download=async row=>{
   try{const file=await api('operation-download',{id:row.id});const url=URL.createObjectURL(file.blob);const a=document.createElement('a');a.href=url;a.download=file.filename;document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);}
   catch(e){setError(e.message||'Could not download document.');}
 };
 const deleteDocument=async row=>{
   if(!window.confirm(`Permanently delete HR document “${row.title}”?`))return;setBusy(true);setError('');
   try{await api('delete-hr-document',{id:row.id,request_id:crypto.randomUUID()},true);setNotice('HR document deleted.');await load();}
   catch(e){setError(e.message||'Could not delete the document.');}finally{setBusy(false);}
 };
 const exportCsv=()=>{
   const columns=module==='Attendance'?['work_date','staff_code','full_name','clock_in','clock_out','attendance_status','notes']:module==='Shift & Schedule'?['shift_date','staff_code','full_name','start_time','end_time','break_minutes','notes']:module==='Leave Management'?['start_date','end_date','staff_code','full_name','leave_type','days','status','reason']:module==='Overtime'?['work_date','staff_code','full_name','hours','status','reason']:module==='Claims & Advances'?['date','staff_code','full_name','category','amount','status','description']:module==='HR Documents'?['created_at','staff_code','full_name','document_type','title','file_name']:['payslip_no','staff_code_snapshot','full_name_snapshot','pay_date','gross_pay','total_deductions','net_pay','status'];
   const cell=value=>{let text=String(value??'');if(/^[=+\-@\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
   const csv=[columns.map(cell).join(','),...rows.map(row=>columns.map(key=>cell(row[key])).join(','))].join('\r\n');const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`HR-${module.replaceAll(' ','-')}-${month}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 if(isPayroll)return <div className="hr-ops">
   <div className="hr-toolbar"><label className="hr-field"><span>Pay month</span><input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label>{tab==='Payroll'&&canSalary&&<button type="button" className="primary" onClick={()=>onNavigate('Payslip')}>Create / manage payslips</button>}<button type="button" onClick={exportCsv} disabled={!rows.length}>Export CSV</button></div>
   {error&&<div className="hr-error" role="alert">{error}</div>}{notice&&<div className="hr-success" role="status">{notice}</div>}
   <div className="hr-stats"><div className="panel"><span>Payslips</span><strong>{rows.length}</strong></div><div className="panel"><span>Gross payroll</span><strong>{money(totals.gross)}</strong></div><div className="panel"><span>Net payroll</span><strong>{money(totals.net)}</strong></div></div>
   <div className="panel hr-table-wrap"><h3>Payroll · {month}</h3>{loading?<p>Loading payroll…</p>:<table><thead><tr><th>Payslip</th><th>Employee</th><th>Pay date</th><th>Gross</th><th>Deductions</th><th>Net pay</th><th>Status</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td>{row.payslip_no}</td><td>{row.staff_code_snapshot} · {row.full_name_snapshot}</td><td>{row.pay_date}</td><td>{money(row.gross_pay)}</td><td>{money(row.total_deductions)}</td><td>{money(row.net_pay)}</td><td><span className={'hr-badge '+(row.status==='ISSUED'?'active':'')}>{row.status}</span></td></tr>)}{!rows.length&&<tr><td colSpan="7">No payroll records for this month. Create payslip drafts first.</td></tr>}</tbody></table>}</div>
 </div>;
 if(!config&&tab!=='HR Reports')return null;
 const columns=module==='Attendance'?['work_date','staff_code','full_name','clock_in','clock_out','attendance_status','notes']:module==='Shift & Schedule'?['shift_date','staff_code','full_name','start_time','end_time','break_minutes','notes']:module==='Leave Management'?['start_date','end_date','staff_code','full_name','leave_type','days','status','reason']:module==='Overtime'?['work_date','staff_code','full_name','hours','status','reason']:module==='Claims & Advances'?['date','staff_code','full_name','record_type','category','amount','balance','status','description']:['created_at','staff_code','full_name','document_type','title','file_name'];
 const headers=module==='Attendance'?['Date','Staff code','Employee','Clock in','Clock out','Status','Notes']:module==='Shift & Schedule'?['Date','Staff code','Employee','Start','End','Break (min)','Notes']:module==='Leave Management'?['From','To','Staff code','Employee','Type','Days','Status','Reason']:module==='Overtime'?['Date','Staff code','Employee','Hours','Status','Reason']:module==='Claims & Advances'?['Date','Staff code','Employee','Type','Category','Amount','Balance','Status','Description']:['Uploaded','Staff code','Employee','Type','Title','File'];
 const title=tab==='HR Reports'?'HR Reports':tab;
 return <div className="hr-ops">
   <div className="hr-toolbar">
     {isReport&&<label className="hr-field"><span>Report</span><select value={reportType} onChange={e=>setReportType(e.target.value)}>{operations.filter(item=>item!=='Claims & Advances'||canSalary).filter(item=>item!=='HR Documents'||can('viewHrSensitive')).map(item=><option key={item}>{item}</option>)}{canSalary&&<option>Payroll</option>}</select></label>}
     <label className="hr-field"><span>Month</span><input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label>
     {!isReport&&canManage&&module!=='HR Documents'&&<button type="button" className="primary" onClick={()=>{const next=blank(module);if(module==='Claims & Advances')next.record_type='CLAIM';setForm(next);setEditing(null);}}>Add {module==='Claims & Advances'?'Claim':module==='Leave Management'?'Leave request':module==='Overtime'?'Overtime':module==='Shift & Schedule'?'Shift':'Attendance'}</button>}
     {module==='Claims & Advances'&&can('manageHrSalary')&&<button type="button" onClick={()=>{setForm({...blank(module),record_type:'ADVANCE'});setEditing(null);}}>Record Salary Advance</button>}
     {module==='HR Documents'&&canManage&&<button type="button" className="primary" onClick={()=>{setForm({employee_id:'',document_type:'Employment contract',title:''});setReceipt(null);}}>Upload Document</button>}
     <button type="button" onClick={exportCsv} disabled={!rows.length}>Export CSV</button>
   </div>
   {error&&<div className="hr-error" role="alert">{error}</div>}{notice&&<div className="hr-success" role="status">{notice}<button type="button" onClick={()=>setNotice('')}>×</button></div>}
   {form&&<form className="panel hr-ops-form" onSubmit={save}><div className="hr-toolbar"><h3>{module==='HR Documents'?'Upload HR document':form.record_type==='ADVANCE'?'Record salary advance':editing?'Edit record':`New ${module==='Claims & Advances'?'claim':module==='Leave Management'?'leave request':module==='Overtime'?'overtime request':module==='Shift & Schedule'?'shift':'attendance record'}`}</h3><button type="button" onClick={()=>{setForm(null);setReceipt(null);}}>Close</button></div>
     <div className="hr-form-grid"><label className="hr-field"><span>Employee</span><select value={form.employee_id||''} onChange={e=>setForm({...form,employee_id:e.target.value})} required><option value="">Select employee</option>{employees.map(person=><option key={person.id} value={person.id}>{person.staff_code} · {person.full_name}</option>)}</select></label>
       {module==='HR Documents'?<><label className="hr-field"><span>Document type</span><select value={form.document_type} onChange={e=>setForm({...form,document_type:e.target.value})}>{['Employment contract','Identity document','Certificate','Bank document','Warning letter','Other'].map(x=><option key={x}>{x}</option>)}</select></label><label className="hr-field"><span>Document title</span><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} maxLength="180" required/></label><label className="hr-field"><span>File (PDF, JPG or PNG · up to 5 MB)</span><input type="file" accept="application/pdf,image/jpeg,image/png" onChange={e=>setReceipt(e.target.files?.[0]||null)} required/></label></>:<>
       {module==='Claims & Advances'&&form.record_type==='ADVANCE'?<><label className="hr-field"><span>Advance date</span><input type="date" value={form.claim_date} onChange={e=>setForm({...form,claim_date:e.target.value})} required/></label><label className="hr-field"><span>Amount (MYR)</span><input type="number" min="0.01" step="0.01" value={form.amount||''} onChange={e=>setForm({...form,amount:e.target.value})} required/></label><label className="hr-field"><span>Reason</span><input value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})} maxLength="500" required/></label></>:definitions[module].fields.map(item=><label className="hr-field" key={item.key}><span>{item.label}</span>{item.type==='select'?<select value={form[item.key]||''} onChange={e=>setForm({...form,[item.key]:e.target.value})} required={item.required}><option value="">Select</option>{item.options.map(option=><option key={option}>{option}</option>)}</select>:<input type={item.type} value={form[item.key]??''} min={item.min} max={item.max} step={item.step} maxLength={item.type==='text'?1000:undefined} onChange={e=>setForm({...form,[item.key]:e.target.value})} required={item.required}/>}</label>)}
       </>}
     </div><div className="hr-form-actions"><button type="button" disabled={busy} onClick={()=>{setForm(null);setReceipt(null);}}>Cancel</button><button className="primary" type="submit" disabled={busy}>{busy?'Saving…':'Save'}</button></div>
   </form>}
   <div className="panel hr-table-wrap"><h3>{title} · {month}</h3>{loading?<p>Loading records…</p>:<table><thead><tr>{headers.map(label=><th key={label}>{label}</th>)}{!isReport&&<th>Actions</th>}</tr></thead><tbody>{rows.map(row=><tr key={row.record_type+':'+row.id}>{columns.map(key=><td key={key}>{key==='amount'||key==='balance'?money(row[key]):key==='status'?<span className={'hr-badge '+(row[key]==='APPROVED'||row[key]==='ISSUED'||row[key]==='PAID'?'active':'')}>{text(row[key])}</span>:text(row[key])}</td>)}{!isReport&&<td><div className="hr-ops-actions">{module==='HR Documents'&&<><button type="button" onClick={()=>download(row)}>Download</button>{canManage&&can('viewHrSensitive')&&<button type="button" className="danger" disabled={busy} onClick={()=>deleteDocument(row)}>Delete</button>}</>}{module==='Claims & Advances'&&row.record_type==='ADVANCE'&&<span className="hr-muted">Repay through Payslip</span>}{module==='Claims & Advances'&&row.record_type==='CLAIM'&&row.status==='APPROVED'&&canManage&&<button type="button" className="primary" disabled={busy} onClick={()=>payClaim(row)}>Mark Paid</button>}{['Attendance','Shift & Schedule'].includes(module)&&canManage&&<><button type="button" disabled={busy} onClick={()=>{setEditing(row.id);setForm({...row});}}>Edit</button><button type="button" className="danger" disabled={busy} onClick={()=>remove(row)}>Delete</button></>}{['Leave Management','Overtime','Claims & Advances'].includes(module)&&row.status==='PENDING'&&canManage&&<><button type="button" disabled={busy} onClick={()=>decide(row,'APPROVED')}>Approve</button><button type="button" className="danger" disabled={busy} onClick={()=>decide(row,'REJECTED')}>Reject</button><button type="button" className="danger" disabled={busy} onClick={()=>remove(row)}>Delete</button></>}</div></td>}</tr>)}{!rows.length&&<tr><td colSpan={headers.length+(isReport?0:1)}>No records for this month.</td></tr>}</tbody></table>}</div>
 </div>;
}
