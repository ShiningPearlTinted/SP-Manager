import React,{useEffect,useMemo,useRef,useState} from 'react';
import PayslipPanel from './payslip-panel.jsx';
import OperationsPanel from './operations-panel.jsx';

const permitted=(user,key)=>user?.role==='Administrator'||user?.permissions?.[key]===true;
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kuala_Lumpur'});
const blankEmployee=()=>({staff_code:'',full_name:'',department_id:'',position_id:'',employment_type_id:'',employment_status_id:'',join_date:today(),gender:'',nationality:'Malaysian',marital_status:'',emergency_contact_relationship:'',primary_outlet_id:'',user_id:'',reporting_manager_id:''});
const fieldLabels={staff_code:'Staff Code',full_name:'Full Name',identity_number:'IC / Passport',date_of_birth:'Date of Birth',gender:'Gender',nationality:'Nationality',marital_status:'Marital Status',phone:'Phone',email:'Email',address:'Address',emergency_contact_name:'Emergency Contact',emergency_contact_phone:'Emergency Phone',emergency_contact_relationship:'Relationship',join_date:'Join Date',confirmation_date:'Confirmation Date',contract_start:'Contract Start',contract_end:'Contract End',resignation_date:'Resignation Date',termination_date:'Termination Date'};
const masterLabels={departments:'Departments',positions:'Positions',employment_types:'Employment Types',employment_statuses:'Employment Statuses'};
const employeeChoices={
  gender:['Female','Male','Other','Prefer not to say'],
  nationality:['Malaysian','Singaporean','Indonesian','Thai','Filipino','Bruneian','Vietnamese','Cambodian','Myanmar','Indian','Pakistani','Bangladeshi','Chinese','Japanese','South Korean','Australian','British','American','Other'],
  marital_status:['Single','Married','Divorced','Widowed','Separated'],
  emergency_contact_relationship:['Spouse','Parent','Child','Sibling','Guardian','Relative','Friend','Other']
};
const tabs=['HR Dashboard','Employees','Attendance','Shift & Schedule','Leave Management','Overtime','Payroll','Payslip','Claims & Advances','HR Documents','HR Reports','HR Settings'];
const money=value=>Number(value||0).toLocaleString('en-MY',{style:'currency',currency:'MYR'});

function Field({label,children}) {return <label className="hr-field"><span>{label}</span>{children}</label>;}
function Select({label,value,onChange,items,required=false,empty='Select',name='name',disabled=false}) {
  return <Field label={label}><select value={value??''} onChange={event=>onChange(event.target.value)} required={required} disabled={disabled}><option value="">{empty}</option>{items.map(item=><option key={item.id} value={item.id}>{item[name]}{String(item.active)==='0'?' (Inactive)':''}</option>)}</select></Field>;
}
function ErrorMessage({error}) {return error?<div className="hr-error" role="alert">{error}</div>:null;}
function Dialog({title,onClose,children,busy}) {
  const element=useRef(null);
  useEffect(()=>{
    const prior=document.activeElement;
    element.current?.showModal();
    return ()=>{element.current?.close();prior?.focus?.();};
  },[]);
  return <dialog ref={element} className="hr-dialog hr-module" onCancel={event=>{event.preventDefault();if(!busy)onClose();}}><div className="hr-dialog-head"><h2>{title}</h2><button type="button" aria-label="Close" disabled={busy} onClick={onClose}>×</button></div>{children}</dialog>;
}

export default function HrModule({activeUser,initialOutlet,request}) {
  // HR outlet selection is local to HR and never changes the POS outlet/session.
  const requestRef=useRef(request); requestRef.current=request;
  const [outlet,setOutlet]=useState(String(initialOutlet));
  const [tab,setTab]=useState('HR Dashboard');
  const [menuOpen,setMenuOpen]=useState(false);
  const [masters,setMasters]=useState({departments:[],positions:[],employment_types:[],employment_statuses:[]});
  const [options,setOptions]=useState({outlets:[],users:[],managers:[]});
  const [canSettings,setCanSettings]=useState(false);
  const [summary,setSummary]=useState({statuses:[],contract_expiry:[]});
  const [employees,setEmployees]=useState([]),[total,setTotal]=useState(0);
  const [page,setPage]=useState(1),[q,setQ]=useState(''),[department,setDepartment]=useState(''),[status,setStatus]=useState('');
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [refresh,setRefresh]=useState(0),[selected,setSelected]=useState(null),[dialog,setDialog]=useState(null),[detailBusy,setDetailBusy]=useState(false);
  const loadVersion=useRef(0),detailVersion=useRef(0);
  const api=(action,payload={},write=false)=>requestRef.current(action,{...payload,outlet_id:outlet},write);
  const can=key=>permitted(activeUser,key);
  useEffect(()=>{
    let active=true;const version=++loadVersion.current;
    setLoading(true);setError('');setSelected(null);setDialog(null);detailVersion.current++;
    const timer=setTimeout(async()=>{
      try {
        const [m,o,s,e]=await Promise.all([
          requestRef.current('masters',{outlet_id:outlet}),requestRef.current('options',{outlet_id:outlet}),
          requestRef.current('summary',{outlet_id:outlet}),requestRef.current('list-employees',{outlet_id:outlet,q,department_id:department,employment_status_id:status,page})
        ]);
        if(!active||version!==loadVersion.current)return;
        setMasters(m.masters);setCanSettings(m.can_manage_settings);setOptions(o);setSummary(s);setEmployees(e.employees);setTotal(e.total);
        if(String(o.outlet_id)!==outlet)setOutlet(String(o.outlet_id));
      } catch(e) {if(active)setError(e.message);}
      finally {if(active)setLoading(false);}
    },q?250:0);
    return ()=>{active=false;clearTimeout(timer);};
  },[outlet,q,department,status,page,refresh]);
  const openEmployee=async id=>{
    const version=++detailVersion.current;setDetailBusy(true);setError('');
    try {
      const [e,h,s,a]=await Promise.all([api('employee',{employee_id:id}),api('outlet-history',{employee_id:id}),can('viewHrSalary')?api('salary-history',{employee_id:id}):Promise.resolve({history:[]}),can('viewHrSalary')?api('salary-advances',{employee_id:id}):Promise.resolve({advances:[]})]);
      if(version===detailVersion.current)setSelected({...e.employee,outlet_history:h.history,salary_history:s.history,salary_advances:a.advances});
    } catch(e) {if(version===detailVersion.current)setError(e.message);}
    finally {if(version===detailVersion.current)setDetailBusy(false);}
  };
  const complete=message=>{setDialog(null);setSelected(null);setNotice(message);setRefresh(value=>value+1);};
  const masterName=(kind,id)=>masters[kind]?.find(item=>String(item.id)===String(id))?.name||'—';
  const activeItems=(kind,current)=>masters[kind].filter(item=>String(item.active)==='1'||String(item.id)===String(current));
  const totals=useMemo(()=>summary.statuses.reduce((result,row)=>({all:result.all+Number(row.total),active:result.active+(Number(row.is_active_employment)?Number(row.total):0)}),{all:0,active:0}),[summary]);
  const availableTabs=tabs.filter(name=>name==='HR Settings'?canSettings:['Payslip','Payroll','Claims & Advances'].includes(name)?can('viewHrSalary'):name==='HR Documents'?can('viewHrSensitive'):true);
  return <section className="hr-module content hr-layout">
    <div className="hr-sidebar-shell">
      <button type="button" className="hr-menu-toggle" aria-expanded={menuOpen} aria-controls="hr-navigation" onClick={()=>setMenuOpen(value=>!value)}><span>{tab}</span><span>{menuOpen?'Close menu':'HR Menu'} ▾</span></button>
      <nav id="hr-navigation" className={'hr-sidebar'+(menuOpen?' is-open':'')} aria-label="HR management"><span className="hr-sidebar-label">HR MANAGEMENT</span>{availableTabs.map(name=><button type="button" key={name} aria-current={tab===name?'page':undefined} className={tab===name?'primary':''} onClick={()=>{setTab(name);setMenuOpen(false);setSelected(null);detailVersion.current++;setDetailBusy(false);}}><span>{name}</span></button>)}</nav>
    </div>
    <div className="hr-workspace">
    <div className="hr-toolbar"><Select label="Outlet" value={outlet} onChange={value=>{if(value){setOutlet(value);setPage(1);setNotice('');}}} items={options.outlets.length?options.outlets:[{id:outlet,outlet_name:'Current outlet'}]} name="outlet_name" required/><button type="button" disabled={loading} onClick={()=>setRefresh(value=>value+1)}>Refresh</button></div>
    <ErrorMessage error={error}/>{notice&&<div className="hr-success" role="status">{notice}<button type="button" aria-label="Dismiss" onClick={()=>setNotice('')}>×</button></div>}
    {loading?<p role="status">Loading HR records…</p>:!error&&<>
      {tab==='HR Dashboard'&&<><div className="hr-stats"><div className="panel"><span>Total Employees</span><strong>{totals.all}</strong></div><div className="panel"><span>Active Employees</span><strong>{totals.active}</strong></div><div className="panel"><span>Contracts Expiring in 30 Days</span><strong>{summary.contract_expiry.length}</strong></div></div><div className="hr-grid"><div className="panel"><h3>Employment Status</h3>{summary.statuses.length?summary.statuses.map(row=><p key={row.name} className="hr-summary-row"><span>{row.name}</span><b>{row.total}</b></p>):<p>No employees in this outlet.</p>}</div><div className="panel"><h3>Contract Expiry</h3>{summary.contract_expiry.length?summary.contract_expiry.map(row=><p key={row.id} className="hr-summary-row"><span>{row.staff_code} · {row.full_name}</span><time>{row.contract_end}</time></p>):<p>No contracts expiring within 30 days.</p>}</div></div></>}
      {tab==='Employees'&&<>
        <div className="hr-toolbar"><Field label="Search"><input type="search" value={q} onChange={event=>{setQ(event.target.value);setPage(1);}} placeholder="Name or staff code"/></Field><Select label="Department" value={department} onChange={value=>{setDepartment(value);setPage(1);}} items={masters.departments} empty="All departments"/><Select label="Status" value={status} onChange={value=>{setStatus(value);setPage(1);}} items={masters.employment_statuses} empty="All statuses"/>{can('manageHrEmployees')&&<button type="button" className="primary" onClick={()=>setDialog({kind:'employee',data:blankEmployee()})}>Add Employee</button>}</div>
        <div className="panel hr-table-wrap"><table><thead><tr><th>Staff Code</th><th>Name</th><th>Department</th><th>Position</th><th>Status</th><th>Join Date</th><th>Action</th></tr></thead><tbody>{employees.map(row=><tr key={row.id}><td>{row.staff_code}</td><td>{row.full_name}</td><td>{row.department_name||'—'}</td><td>{row.position_name||'—'}</td><td><span className={'hr-badge '+(Number(row.is_active_employment)?'active':'')}>{row.employment_status_name}</span></td><td>{row.join_date}</td><td><button type="button" disabled={detailBusy} onClick={()=>openEmployee(row.id)}>View</button></td></tr>)}{!employees.length&&<tr><td colSpan="7">No employees found.</td></tr>}</tbody></table></div>
        <div className="hr-pagination"><span>{total} employees · Page {page} of {Math.max(1,Math.ceil(total/25))}</span><button disabled={page===1} onClick={()=>setPage(value=>value-1)}>Previous</button><button disabled={page*25>=total} onClick={()=>setPage(value=>value+1)}>Next</button></div>
        {detailBusy&&<p role="status">Loading employee…</p>}
        {selected&&<div className="panel hr-detail"><div className="hr-toolbar"><h3>{selected.full_name}</h3>{can('manageHrEmployees')&&<button onClick={()=>setDialog({kind:'employee',data:selected})}>Edit</button>}{can('transferHrEmployees')&&<><button onClick={()=>setDialog({kind:'transfer',data:selected})}>Transfer</button><button onClick={()=>setDialog({kind:'temporary',data:selected})}>Temporary Assignment</button></>}{can('manageHrSalary')&&<><button onClick={()=>setDialog({kind:'salary',data:selected})}>Revise Salary</button><button className="primary" onClick={()=>setDialog({kind:'advance',data:selected})}>Record Salary Advance</button></>}<button onClick={()=>setSelected(null)}>Close Profile</button></div>
          <dl className="hr-facts"><dt>Employee ID</dt><dd>{selected.employee_uid}</dd><dt>Staff Code</dt><dd>{selected.staff_code}</dd><dt>Primary Outlet</dt><dd>{options.outlets.find(o=>String(o.id)===String(selected.primary_outlet_id))?.outlet_code||selected.primary_outlet_id}</dd><dt>Department</dt><dd>{masterName('departments',selected.department_id)}</dd><dt>Position</dt><dd>{masterName('positions',selected.position_id)}</dd><dt>Employment Type</dt><dd>{masterName('employment_types',selected.employment_type_id)}</dd><dt>Status</dt><dd>{masterName('employment_statuses',selected.employment_status_id)}</dd>{Object.entries(fieldLabels).filter(([key])=>!['full_name','staff_code'].includes(key)).map(([key,label])=><React.Fragment key={key}><dt>{label}</dt><dd>{key==='identity_number'&&!can('viewHrSensitive')?(selected.identity_present?'Protected':'—'):(selected[key]||'—')}</dd></React.Fragment>)}</dl>
          <h3>Outlet History</h3><div className="hr-table-wrap"><table><thead><tr><th>Type</th><th>From</th><th>To</th><th>Effective</th><th>End</th><th>Reason</th></tr></thead><tbody>{selected.outlet_history.map(row=><tr key={row.id}><td>{row.assignment_kind}</td><td>{row.previous_outlet}</td><td>{row.new_outlet}</td><td>{row.effective_from}</td><td>{row.effective_to||'—'}</td><td>{row.reason}</td></tr>)}{!selected.outlet_history.length&&<tr><td colSpan="6">No outlet assignments recorded.</td></tr>}</tbody></table></div>
          {can('viewHrSalary')&&<><h3>Salary History</h3><div className="hr-table-wrap"><table><thead><tr><th>Effective</th><th>Type</th><th>Basic</th><th>Fixed Allowance</th><th>Bank</th><th>Account</th><th>KWSP</th><th>PERKESO</th><th>Tax</th><th>Reason</th></tr></thead><tbody>{selected.salary_history.map(row=><tr key={row.id}><td>{row.effective_from}</td><td>{row.salary_type}</td><td>{money(row.basic_rate)}</td><td>{money(row.fixed_allowance)}</td><td>{row.bank_name||'—'}</td><td>{row.bank_account||'—'}</td><td>{row.epf_number||'—'}</td><td>{row.socso_number||'—'}</td><td>{row.tax_number||'—'}</td><td>{row.reason}</td></tr>)}{!selected.salary_history.length&&<tr><td colSpan="10">No salary revisions recorded.</td></tr>}</tbody></table></div></>}
          {can('viewHrSalary')&&<><h3>Salary Advances</h3><div className="hr-table-wrap"><table><thead><tr><th>Advance date</th><th>Amount</th><th>Outstanding</th><th>Status</th><th>Reason</th></tr></thead><tbody>{(selected.salary_advances||[]).map(row=><tr key={row.id}><td>{row.advance_date}</td><td>{money(row.amount)}</td><td>{money(row.balance)}</td><td>{row.status}</td><td>{row.reason}</td></tr>)}{!(selected.salary_advances||[]).length&&<tr><td colSpan="5">No salary advances recorded.</td></tr>}</tbody></table></div></>}
        </div>}
      </>}
      {tab==='HR Settings'&&canSettings&&<Settings masters={masters} api={api} isAdmin={activeUser?.role==='Administrator'} adminUserId={activeUser?.id} onComplete={message=>{setNotice(message);setRefresh(value=>value+1);}} onEdit={(kind,data)=>setDialog({kind:'master',master:kind,data})}/>}
      {tab==='Payslip'&&<PayslipPanel api={api} outlet={outlet} outletName={options.outlets.find(item=>String(item.id)===String(outlet))?.outlet_name||'SP-Manager'} can={can}/>}
      {['Attendance','Shift & Schedule','Leave Management','Overtime','Payroll','Claims & Advances','HR Documents','HR Reports'].includes(tab)&&<OperationsPanel tab={tab} api={api} can={can} onNavigate={setTab}/>}
    </>}
    </div>
    {dialog&&<Editor key={dialog.kind+String(dialog.data?.id||'new')} dialog={dialog} masters={masters} options={options} activeItems={activeItems} can={can} outlet={outlet} api={api} onClose={()=>setDialog(null)} onComplete={complete}/>}
  </section>;
}

function Settings({masters,onEdit,api,isAdmin,adminUserId,onComplete}) {
  const [kind,setKind]=useState('departments');
  const [payslipNo,setPayslipNo]=useState(''),[resetBusy,setResetBusy]=useState(false),[resetError,setResetError]=useState(''),[resetNotice,setResetNotice]=useState(''),[confirmReset,setConfirmReset]=useState(false);
  const adminId=String(adminUserId||'');
  const openResetConfirmation=event=>{event.preventDefault();setResetError('');setConfirmReset(true);};
  const resetIssuedPayslip=async()=>{
    if(resetBusy)return;
    setResetBusy(true);setResetError('');setResetNotice('');
    try{await api('reset-issued-payslip',{payslip_no:payslipNo.trim(),admin_id:adminId,request_id:crypto.randomUUID()},true);setResetNotice('Payslip reset to DRAFT. You can edit it again.');setPayslipNo('');setConfirmReset(false);onComplete('Issued payslip reset to draft.');}
    catch(error){setResetError(error.message);}
    finally{setResetBusy(false);}
  };
  return <><div className="panel"><div className="hr-toolbar"><Field label="Master"><select value={kind} onChange={event=>setKind(event.target.value)}>{Object.entries(masterLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></Field><button className="primary" onClick={()=>onEdit(kind,{code:'',name:'',active:true,is_active_employment:true,department_id:''})}>Add {masterLabels[kind]}</button></div><div className="hr-table-wrap"><table><thead><tr><th>Code</th><th>Name</th>{kind==='positions'&&<th>Department</th>}{kind==='employment_statuses'&&<th>Active Employment</th>}<th>Enabled</th><th>Action</th></tr></thead><tbody>{masters[kind].map(row=><tr key={row.id}><td>{row.code}</td><td>{row.name}</td>{kind==='positions'&&<td>{masters.departments.find(d=>String(d.id)===String(row.department_id))?.name||'—'}</td>}{kind==='employment_statuses'&&<td>{Number(row.is_active_employment)?'Yes':'No'}</td>}<td>{Number(row.active)?'Yes':'No'}</td><td><button onClick={()=>onEdit(kind,row)}>Edit</button></td></tr>)}{!masters[kind].length&&<tr><td colSpan="5">No records. Add your company master data first.</td></tr>}</tbody></table></div></div><section className="panel"><h3>Employment Notes</h3><p className="hr-muted">New Staff Codes use the outlet's final two digits and the next four digit sequence. Use Transfer for permanent outlet changes; Temporary Assignment leaves the primary outlet unchanged.</p><p className="hr-muted">Inactive or terminated employees remain in employee history.</p></section><section className="panel"><h3>Payroll</h3><p className="hr-muted">Statutory deductions such as EPF, SOCSO, EIS and PCB must be entered as deduction lines. The system does not calculate statutory rates automatically.</p><p className="hr-muted">Issued payslips are locked. Salary advance repayments are applied only when a payslip is issued; resetting or voiding the payslip restores the balance.</p></section>{isAdmin&&<section className="panel hr-payslip-reset"><h3>Reset Issued Payslip</h3><p className="hr-muted">Return an issued payslip to DRAFT so it can be edited. This action is recorded in the audit log. If it includes a salary advance repayment, the outstanding balance is restored.</p>{resetError&&<ErrorMessage error={resetError}/>}{resetNotice&&<div className="hr-success" role="status">{resetNotice}</div>}<form onSubmit={openResetConfirmation}><div className="hr-form-grid"><Field label="Payslip reference"><input value={payslipNo} onChange={event=>setPayslipNo(event.target.value)} placeholder="Example: PS-202610-000001" maxLength="40" required/></Field><Field label="Administrator ID"><input inputMode="numeric" value={adminId} readOnly aria-describedby="admin-id-help" required/><small id="admin-id-help" className="hr-muted">Signed-in Administrator account</small></Field></div><div className="hr-form-actions"><button type="submit" className="danger" disabled={resetBusy||!adminId}>Continue</button></div></form></section>}{confirmReset&&<Dialog title="Confirm Payslip Reset" busy={resetBusy} onClose={()=>setConfirmReset(false)}><div className="hr-confirm-body">{resetError&&<ErrorMessage error={resetError}/>}<p>Reset <strong>{payslipNo.trim()}</strong> from ISSUED to DRAFT? It will become editable again.</p><p className="hr-muted">The signed-in Administrator ID will be checked. This change is recorded in the audit log.</p></div><div className="hr-form-actions"><button type="button" disabled={resetBusy} onClick={()=>setConfirmReset(false)}>Cancel</button><button type="button" className="danger" disabled={resetBusy} onClick={resetIssuedPayslip}>{resetBusy?'Resetting…':'Reset Payslip'}</button></div></Dialog>}</>;
}

function Editor({dialog,masters,options,activeItems,can,outlet,api,onClose,onComplete}) {
  const employee=dialog.data;
  const initial=dialog.kind==='employee'?{...employee,identity_number:employee.identity_number||''}:dialog.kind==='master'?{...employee,active:Boolean(Number(employee.active)),is_active_employment:Boolean(Number(employee.is_active_employment))}:dialog.kind==='advance'?{advance_date:today(),amount:'',reason:''}:dialog.kind==='salary'?{
    effective_from:today(),salary_type:employee.salary_history?.[0]?.salary_type||'monthly',basic_rate:employee.salary_history?.[0]?.basic_rate||'',fixed_allowance:employee.salary_history?.[0]?.fixed_allowance||'0.00',bank_name:employee.salary_history?.[0]?.bank_name||'',bank_account:employee.salary_history?.[0]?.bank_account||'',epf_number:employee.salary_history?.[0]?.epf_number||'',socso_number:employee.salary_history?.[0]?.socso_number||'',tax_number:employee.salary_history?.[0]?.tax_number||'',statutory_category:employee.salary_history?.[0]?.statutory_category||'',overtime_eligible:Boolean(Number(employee.salary_history?.[0]?.overtime_eligible||0)),commission_eligible:Boolean(Number(employee.salary_history?.[0]?.commission_eligible||0)),reason:''
  }:{new_outlet_id:'',effective_from:today(),effective_to:today(),reason:''};
  const [form,setForm]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const pending=useRef(null);
  const change=(key,value)=>{pending.current=null;setForm(prev=>({...prev,[key]:value}));};
  const input=(key,{type='text',required=false,maxLength=150,min,step}={})=><Field key={key} label={fieldLabels[key]||key.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}><input type={type} value={form[key]??''} onChange={event=>change(key,event.target.value)} required={required} maxLength={maxLength} min={min} step={step}/></Field>;
  const choice=(key)=>{const label=fieldLabels[key],current=String(form[key]??''),items=employeeChoices[key],values=current&&!items.includes(current)?[current,...items]:items;return <Field key={key} label={label}><select value={current} onChange={event=>change(key,event.target.value)}><option value="">Select {label.toLowerCase()}</option>{values.map(value=><option key={value} value={value}>{value}</option>)}</select></Field>;};
  const save=async event=>{
    event.preventDefault();if(busy)return;setBusy(true);setError('');
    try {
      if(!pending.current) {
        let payload,action;
        if(dialog.kind==='employee') {
          const fields=[...Object.keys(fieldLabels),'department_id','position_id','employment_type_id','employment_status_id','reporting_manager_id','user_id'];
          payload=Object.fromEntries(fields.filter(key=>key!=='identity_number'||can('viewHrSensitive')).map(key=>[key,form[key]??'']));
          if(employee.id) {payload.id=employee.id;payload.revision=employee.revision;}
          payload.primary_outlet_id=outlet;action='save-employee';
        } else if(dialog.kind==='master') {payload={...form,kind:dialog.master};action='save-master';}
        else {
          payload={...form,employee_id:employee.id,revision:employee.revision};action=dialog.kind==='salary'?'revise-salary':dialog.kind==='advance'?'create-salary-advance':dialog.kind==='transfer'?'transfer':'temporary-assignment';
          if(dialog.kind==='salary'&&!can('viewHrSalary')) for(const key of ['bank_name','bank_account','epf_number','socso_number','tax_number','statutory_category']) if(!payload[key])delete payload[key];
        }
        pending.current={action,payload:{...payload,request_id:crypto.randomUUID()}};
      }
      await api(pending.current.action,pending.current.payload,true);
      onComplete(dialog.kind==='salary'?'Salary revision saved.':dialog.kind==='advance'?'Salary advance recorded.':dialog.kind==='transfer'?'Employee transfer approved.':dialog.kind==='temporary'?'Temporary assignment approved.':'Record saved.');
    } catch(e) {setError(e.message);} finally {setBusy(false);}
  };
  const title=dialog.kind==='employee'?(employee.id?'Edit Employee':'Add Employee'):dialog.kind==='master'?masterLabels[dialog.master]:dialog.kind==='salary'?'Salary Revision':dialog.kind==='advance'?'Record Salary Advance':dialog.kind==='transfer'?'Employee Transfer':'Temporary Assignment';
  return <Dialog title={title} busy={busy} onClose={onClose}><form onSubmit={save}><ErrorMessage error={error}/><fieldset disabled={busy}>
    {dialog.kind==='employee'&&<>
      <h3>Personal Information</h3><div className="hr-form-grid"><Field label="Staff Code"><input readOnly value={employee.id?form.staff_code||'':'Generated automatically on save'}/></Field>{input('full_name',{required:true})}{can('viewHrSensitive')&&input('identity_number',{maxLength:100})}{input('date_of_birth',{type:'date'})}{choice('gender')}{choice('nationality')}{choice('marital_status')}{input('phone',{type:'tel',maxLength:50})}{input('email',{type:'email'})}<Field label="Address"><textarea value={form.address??''} maxLength={2000} onChange={event=>change('address',event.target.value)}/></Field>{input('emergency_contact_name')}{input('emergency_contact_phone',{type:'tel',maxLength:50})}{choice('emergency_contact_relationship')}</div>
      <h3>Employment</h3><div className="hr-form-grid"><Field label="Primary Outlet"><input readOnly value={options.outlets.find(o=>String(o.id)===String(outlet))?.outlet_code||outlet}/></Field><Select label="Department" value={form.department_id} onChange={value=>{change('department_id',value);change('position_id','');}} items={activeItems('departments',form.department_id)}/><Select label="Position" value={form.position_id} onChange={value=>change('position_id',value)} items={activeItems('positions',form.position_id).filter(p=>!p.department_id||String(p.department_id)===String(form.department_id))}/><Select label="Employment Type" value={form.employment_type_id} onChange={value=>change('employment_type_id',value)} items={activeItems('employment_types',form.employment_type_id)} required/><Select label="Employment Status" value={form.employment_status_id} onChange={value=>change('employment_status_id',value)} items={activeItems('employment_statuses',form.employment_status_id)} required/>{['join_date','confirmation_date','contract_start','contract_end','resignation_date','termination_date'].map(key=>input(key,{type:'date',required:key==='join_date'}))}<Select label="Reporting Manager" value={form.reporting_manager_id} onChange={value=>change('reporting_manager_id',value)} items={options.managers.filter(item=>String(item.id)!==String(employee.id))} name="full_name" empty="None"/><Select label="Linked Login (Optional)" value={form.user_id} onChange={value=>change('user_id',value)} items={options.users} empty="None"/></div>
    </>}
    {dialog.kind==='master'&&<div className="hr-form-grid">{input('code',{required:true,maxLength:50})}{input('name',{required:true})}{dialog.master==='positions'&&<Select label="Department" value={form.department_id} onChange={value=>change('department_id',value)} items={activeItems('departments',form.department_id)}/>}<label className="hr-check"><input type="checkbox" checked={form.active} onChange={event=>change('active',event.target.checked)}/>Enabled</label>{dialog.master==='employment_statuses'&&<label className="hr-check"><input type="checkbox" checked={form.is_active_employment} onChange={event=>change('is_active_employment',event.target.checked)}/>Counts as active employment</label>}</div>}
    {['transfer','temporary'].includes(dialog.kind)&&<><p>{employee.staff_code} · {employee.full_name}</p><div className="hr-form-grid"><Select label="Destination Outlet" value={form.new_outlet_id} onChange={value=>change('new_outlet_id',value)} items={options.outlets.filter(item=>String(item.id)!==String(outlet))} name="outlet_name" required/>{input('effective_from',{type:'date',min:today(),required:true})}{dialog.kind==='temporary'&&input('effective_to',{type:'date',min:form.effective_from,required:true})}{input('reason',{required:true,maxLength:500})}</div></>}
    {dialog.kind==='salary'&&<><p>{employee.staff_code} · {employee.full_name}</p><div className="hr-form-grid">{input('effective_from',{type:'date',required:true})}<Field label="Salary Type"><select value={form.salary_type} onChange={event=>change('salary_type',event.target.value)}><option value="monthly">Monthly</option><option value="daily">Daily</option><option value="hourly">Hourly</option></select></Field>{input('basic_rate',{type:'number',min:'0',step:'0.01',required:true})}{input('fixed_allowance',{type:'number',min:'0',step:'0.01',required:true})}{['bank_name','bank_account','epf_number','socso_number','tax_number','statutory_category'].map(key=>input(key,{maxLength:key==='bank_name'?150:100}))}<label className="hr-check"><input type="checkbox" checked={form.overtime_eligible} onChange={event=>change('overtime_eligible',event.target.checked)}/>Overtime Eligible</label><label className="hr-check"><input type="checkbox" checked={form.commission_eligible} onChange={event=>change('commission_eligible',event.target.checked)}/>Commission Eligible</label>{input('reason',{required:true,maxLength:500})}</div></>}
    {dialog.kind==='advance'&&<><p>{employee.staff_code} · {employee.full_name}</p><div className="hr-form-grid">{input('advance_date',{type:'date',required:true})}{input('amount',{type:'number',min:'0.01',step:'0.01',required:true})}{input('reason',{required:true,maxLength:500})}</div></>}
    </fieldset><div className="hr-form-actions"><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" className="primary" disabled={busy}>{busy?'Saving…':'Save'}</button></div></form></Dialog>;
}

