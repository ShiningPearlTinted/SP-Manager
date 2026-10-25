let workbookLoader;
export async function downloadExcel(report) {
  if(!window.XLSX){
    workbookLoader??=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src=(import.meta.env.BASE_URL||'/SP-Manager/')+'vendor/xlsx.full.min.js';
      script.onload=()=>window.XLSX?resolve():reject(new Error('Excel library did not load.'));
      script.onerror=()=>{script.remove();workbookLoader=null;reject(new Error('Excel library could not be loaded.'));};
      document.head.appendChild(script);
    });await workbookLoader;
  }
  const XLSX=window.XLSX;
  const values=[
    [report.company.company_name],[report.report.category+' - '+report.report.title],
    [report.outlet.outlet_code+' - '+report.outlet.outlet_name],[report.period.start+' to '+report.period.end],
    ...report.applied_filter_labels.map(value=>[value]),[],report.columns.map(col=>col.label),
    ...report.rows.map(row=>report.columns.map(col=>row[col.key]===null?null:col.type==='text'?String(row[col.key]??''):Number(row[col.key]))),
    report.columns.map((col,index)=>Object.hasOwn(report.totals,col.key)?(report.totals[col.key]===null?null:Number(report.totals[col.key])):(index===0?'TOTAL':'')),
    [],['Notes'],...report.warnings.map(warning=>[warning]),['Generated',report.generated_at]
  ];
  const sheet=XLSX.utils.aoa_to_sheet(values);sheet['!cols']=report.columns.map(col=>({wch:col.type==='text'?26:18}));
  const headerRow=5+report.applied_filter_labels.length;
  for(let r=headerRow+1;r<headerRow+1+report.rows.length+1;r++)report.columns.forEach((col,c)=>{
    const cell=sheet[XLSX.utils.encode_cell({r,c})];if(cell&&col.type==='money')cell.z='#,##0.00';
  });
  const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,'Report');XLSX.writeFile(book,'SP-Manager-'+report.report.id+'-'+report.period.start+'.xlsx');
}
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function printReport(report) {
  const printWindow=window.open('','_blank','width=1200,height=850');if(!printWindow)throw new Error('Allow pop-ups to open the print preview.');
  printWindow.opener=null;
  const cell=(row,col)=>row[col.key]===null?'—':col.type==='money'?Number(row[col.key]||0).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2}):String(row[col.key]??'');
  printWindow.document.write('<!doctype html><html lang="en"><meta charset="utf-8"><title>'+escape(report.report.title)+'</title><style>@page{size:A4 landscape;margin:12mm}body{font:11px Arial,sans-serif;color:#202733}h1{font-size:20px;margin:0 0 8px}h2{font-size:15px}p{margin:4px 0}table{border-collapse:collapse;width:100%;margin-top:16px}th,td{padding:6px;text-align:left;border-bottom:1px solid #ddd;overflow-wrap:anywhere}th{background:#eee}thead{display:table-header-group}tr{break-inside:avoid}.number{text-align:right}.notes{margin-top:18px;font-size:10px}.actions{margin:15px 0}@media print{.actions{display:none}}</style><body><h1>'+escape(report.company.company_name)+'</h1><p>'+escape([report.company.building_number,report.company.street_name,report.company.postal_code,report.company.city,report.company.state].filter(Boolean).join(', '))+'</p><h2>'+escape(report.report.category+' - '+report.report.title)+'</h2><p>'+escape(report.outlet.outlet_code+' - '+report.outlet.outlet_name)+'</p><p>'+escape(report.report.period?report.period.start+' to '+report.period.end:'Current stock snapshot')+'</p><p>'+escape(report.applied_filter_labels.join(' | '))+'</p><p>'+escape('Generated '+report.generated_at)+'</p><div class="actions"><button onclick="window.print()">Print / Save PDF</button></div><table><thead><tr>'+report.columns.map(col=>'<th class="'+(col.type==='text'?'':'number')+'">'+escape(col.label)+'</th>').join('')+'</tr></thead><tbody>'+report.rows.map(row=>'<tr>'+report.columns.map(col=>'<td class="'+(col.type==='text'?'':'number')+'">'+escape(cell(row,col))+'</td>').join('')+'</tr>').join('')+'</tbody><tfoot><tr>'+report.columns.map((col,i)=>'<th class="'+(col.type==='text'?'':'number')+'">'+escape(Object.hasOwn(report.totals,col.key)?cell(report.totals,col):i===0?'TOTAL':'')+'</th>').join('')+'</tr></tfoot></table>'+(!report.rows.length?'<p>No records match these filters.</p>':'')+'<div class="notes">'+report.warnings.map(warning=>'<p>'+escape(warning)+'</p>').join('')+'</div></body></html>');
  printWindow.document.close();printWindow.focus();
}
