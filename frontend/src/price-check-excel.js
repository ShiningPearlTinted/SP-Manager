export const BATTERY_HEADERS=['Car_Brand','Model',...Array.from({length:5},(_,i)=>[`Size_Option${i+1}`,`Price_Option${i+1}`]).flat()];
export const batteryKey=r=>JSON.stringify([String(r.car_brand||'').trim().toLowerCase(),String(r.model||'').trim().toLowerCase()]);
export const emptyBattery=()=>Object.fromEntries([['car_brand',''],['model',''],...Array.from({length:5},(_,i)=>[[`size_option${i+1}`,'-'],[`price_option${i+1}`,0]]).flat()]);
export function validateBattery(input){
 const row={...input};
 for(const [key,max] of [['car_brand',100],['model',180],...Array.from({length:5},(_,i)=>[`size_option${i+1}`,64])]){
  row[key]=String(row[key]??'').trim();
  if(key.startsWith('size_')&&!row[key])row[key]='-';
  if(!row[key]||[...row[key]].length>max||/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(row[key]))throw Error(`${key}: enter text up to ${max} characters.`);
 }
 for(let i=1;i<=5;i++){
  const key=`price_option${i}`,value=row[key];
  if(value===null||value===undefined||String(value).trim()===''||typeof value==='boolean'||!Number.isFinite(Number(value))||Number(value)<0||Number(value)>9999999999)throw Error(`Price_Option${i}: enter a valid non-negative price.`);
  row[key]=Math.round((Number(value)+Number.EPSILON)*100)/100;
  if(row[`size_option${i}`]==='-'&&row[key]>0)throw Error(`Size_Option${i}: a size is required for this price.`);
 }
 return row;
}
export function parseBatterySheet(XLSX,workbook,currentRows=[],outletId=null){
 const sheet=workbook.Sheets[workbook.SheetNames[0]];
 if(!sheet)throw Error('The workbook has no worksheet.');
 const range=XLSX.utils.decode_range(sheet['!ref']||'A1');
 if(range.e.r>10000||range.e.c>50)throw Error('Use a sheet with at most 10000 data rows and 51 columns.');
 const matrix=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:true,blankrows:true});
 const headers=(matrix.shift()||[]).map(x=>String(x).trim());
 if(new Set(headers.filter(Boolean).map(x=>x.toLowerCase())).size!==headers.filter(Boolean).length)throw Error('Duplicate column headers are not supported.');
 const indexes=BATTERY_HEADERS.map(h=>headers.findIndex(x=>x.toLowerCase()===h.toLowerCase()));
 if(indexes.some(x=>x<0))throw Error('Required Excel columns: '+BATTERY_HEADERS.join(', '));
 const revisionColumn=headers.findIndex(x=>x==='_Revision'),outletColumn=headers.findIndex(x=>x==='_Outlet_ID');
 const existing=new Map(currentRows.map(r=>[batteryKey(r),r])),seen=new Set(),rows=[];
 matrix.forEach((values,n)=>{
  if(!values.some(v=>String(v??'').trim()!==''))return;
  try{
   indexes.forEach(i=>{const address=XLSX.utils.encode_cell({r:n+1,c:i});if(sheet[address]?.f)throw Error('Formula cells are not supported. Paste values first.');});
   const raw=Object.fromEntries(BATTERY_HEADERS.map((h,i)=>[h.toLowerCase(),values[indexes[i]]]));
   const row=validateBattery(raw),key=batteryKey(row);
   if(seen.has(key))throw Error('Duplicate Car_Brand / Model.');seen.add(key);
   const old=existing.get(key);
   const origin=outletColumn>=0?String(values[outletColumn]??'').trim():'';
   if(origin&&String(outletId)!==origin)throw Error('This export belongs to another outlet.');
   const rev=revisionColumn>=0?values[revisionColumn]:'';
   const revision=rev!==''&&rev!==undefined?Number(rev):Number(old?.revision||0);
   if(!Number.isInteger(revision)||revision<0||revision>4294967294)throw Error('Invalid revision metadata.');
   rows.push({...row,id:old?.id||0,revision});
  }catch(e){throw Error(`Excel row ${n+2}: ${e.message}`);}
 });
 if(!rows.length)throw Error('The worksheet has no battery records.');
 return {rows,added:rows.filter(r=>!r.id).length,updated:rows.filter(r=>r.id).length};
}
export function batteryWorkbook(XLSX,rows,outletId=null){
 const headings=rows.length?[...BATTERY_HEADERS,'_Revision','_Outlet_ID']:BATTERY_HEADERS;
 const data=rows.map(r=>[...BATTERY_HEADERS.map(h=>h.startsWith('Price')?Number(r[h.toLowerCase()]||0):String(r[h.toLowerCase()]??'-')),Number(r.revision),Number(outletId)]);
 const sheet=XLSX.utils.aoa_to_sheet([headings,...data]);
 sheet['!cols']=headings.map((_,i)=>({wch:i<2?28:18,hidden:i>=12}));
 data.forEach((_,r)=>{[3,5,7,9,11].forEach(c=>{const cell=sheet[XLSX.utils.encode_cell({r:r+1,c})];if(cell)cell.z='0.00';});});
 const workbook=XLSX.utils.book_new();XLSX.utils.book_append_sheet(workbook,sheet,'Car Battery');return workbook;
}
