const http=require('http');
const {execFile}=require('child_process');
const fs=require('fs');
const path=require('path');
const PORT=18765;
const HOST='127.0.0.1';
const FR_PORT=18766;
const FR_HOST='127.0.0.1';
const STARTED_AT=new Date().toISOString();
const FR_SCRIPT=path.join(__dirname,'fastreport-price-tags.ps1');
let frStarting=false;

function ps(script,args=[]){return new Promise((resolve,reject)=>{execFile('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',script,'--',...args],{windowsHide:true,maxBuffer:4*1024*1024},(e,stdout,stderr)=>e?reject(new Error((stderr||e.message).trim())):resolve(stdout.trim()))})}
function json(res,status,obj){const body=JSON.stringify(obj);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'});res.end(body)}
function binary(res,status,type,body,disposition=''){const h={'Content-Type':type||'application/octet-stream','Content-Length':body.length,'Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};if(disposition)h['Content-Disposition']=disposition;res.writeHead(status,h);res.end(body)}
function readBody(req){return new Promise((resolve,reject)=>{const chunks=[];let n=0;req.on('data',c=>{n+=c.length;if(n>2e6){reject(Error('Body too large'));req.destroy();return}chunks.push(c)});req.on('end',()=>{try{const s=Buffer.concat(chunks).toString('utf8');resolve(s?JSON.parse(s):{})}catch(e){reject(e)}})})}
function wait(ms){return new Promise(r=>setTimeout(r,ms))}
async function startFastReport(){
 if(frStarting || !fs.existsSync(FR_SCRIPT)) return;
 frStarting=true;
 try{
  await ps(`$u='http://${FR_HOST}:${FR_PORT}/status'; try{$r=Invoke-WebRequest -UseBasicParsing $u -TimeoutSec 1; exit 0}catch{}`);
 }catch{
  try{execFile('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',FR_SCRIPT],{windowsHide:true,detached:true,stdio:'ignore'}).unref()}catch{}
 }
 finally{frStarting=false}
}
function httpRequest(method,url,body){return new Promise((resolve,reject)=>{
 const u=new URL(url);const req=http.request({hostname:u.hostname,port:u.port,path:u.pathname+u.search,method,headers:body!==undefined?{'Content-Type':'application/json; charset=utf-8','Content-Length':Buffer.byteLength(body)}:{}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode||500,type:res.headers['content-type']||'application/octet-stream',body:Buffer.concat(chunks)}))});req.on('error',reject);req.setTimeout(20000,()=>req.destroy(Error('FastReport bridge timeout')));if(body!==undefined)req.write(body);req.end();
})}
async function fr(method,pathName,body){
 await startFastReport();
 let last;
 for(let i=0;i<3;i++){
  try{const r=await httpRequest(method,`http://${FR_HOST}:${FR_PORT}${pathName}`,body);if(r.status<500)return r;last=Error(`FastReport HTTP ${r.status}`)}catch(e){last=e}
  await wait(300*(i+1));
 }
 throw last||Error('FastReport bridge unavailable');
}
async function printers(){const out=await ps('Get-Printer | Select-Object Name,PrinterStatus,WorkOffline | ConvertTo-Json -Compress');if(!out)return[];const x=JSON.parse(out);return Array.isArray(x)?x:[x]}
const rawScript=`
param([string]$Printer,[string]$Text,[int]$Copies=1,[string]$Bytes)
Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
public static class RawPrinter { [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public class DOCINFO { public string pDocName; public string pOutputFile; public string pDataType; }
[DllImport("winspool.drv", EntryPoint="OpenPrinterW", SetLastError=true, CharSet=CharSet.Unicode)] static extern bool OpenPrinter(string p, out IntPtr h, IntPtr d);
[DllImport("winspool.drv", SetLastError=true)] static extern bool ClosePrinter(IntPtr h);
[DllImport("winspool.drv", EntryPoint="StartDocPrinterW", SetLastError=true, CharSet=CharSet.Unicode)] static extern int StartDocPrinter(IntPtr h,int l,DOCINFO d);
[DllImport("winspool.drv", SetLastError=true)] static extern bool EndDocPrinter(IntPtr h);
[DllImport("winspool.drv", SetLastError=true)] static extern int StartPagePrinter(IntPtr h);
[DllImport("winspool.drv", SetLastError=true)] static extern bool EndPagePrinter(IntPtr h);
[DllImport("winspool.drv", SetLastError=true)] static extern bool WritePrinter(IntPtr h,IntPtr b,int n,out int w);
public static void Send(string p, byte[] b){IntPtr h;if(!OpenPrinter(p,out h,IntPtr.Zero))throw new Exception("OpenPrinter failed: "+Marshal.GetLastWin32Error());try{var d=new DOCINFO{pDocName="SP-Manager",pDataType="RAW"};if(StartDocPrinter(h,1,d)==0)throw new Exception("StartDocPrinter failed");try{if(StartPagePrinter(h)==0)throw new Exception("StartPagePrinter failed");IntPtr m=Marshal.AllocHGlobal(b.Length);try{Marshal.Copy(b,0,m,b.Length);int w;if(!WritePrinter(h,m,b.Length,out w))throw new Exception("WritePrinter failed: "+Marshal.GetLastWin32Error());}finally{Marshal.FreeHGlobal(m);}if(!EndPagePrinter(h))throw new Exception("EndPagePrinter failed");}finally{EndDocPrinter(h);}}finally{ClosePrinter(h);}}
}
'@
if($Bytes){$data=($Bytes -split ',')|ForEach-Object{[byte]$_};[RawPrinter]::Send($Printer,$data)}else{$b=[Text.Encoding]::UTF8.GetBytes($Text);$all=New-Object System.Collections.Generic.List[byte];1..([Math]::Max(1,$Copies))|ForEach-Object{$all.AddRange($b);$all.Add(10);$all.AddRange([byte[]](27,100,3))};[RawPrinter]::Send($Printer,$all.ToArray())}
`;
async function route(req,res){
 if(req.method==='OPTIONS')return json(res,204,{});
 try{
  if(req.method==='GET'&&(req.url==='/'||req.url==='/status')){
   let frReady=false;try{const r=await fr('GET','/status');frReady=r.status===200}catch{}
   return json(res,200,{connected:true,agentDetected:true,agent:'SP-Manager Local Agent',version:'1.2.0',port:PORT,host:HOST,platform:process.platform,pid:process.pid,startedAt:STARTED_AT,uptimeSeconds:Math.floor(process.uptime()),fastReport:frReady,fastReportPort:FR_PORT});
  }
  if(req.method==='GET'&&req.url==='/fastreport/status'){
   const r=await fr('GET','/status');return binary(res,r.status,r.type,r.body);
  }
  if(req.method==='POST'&&req.url==='/price-tags/pdf'){
   const b=await readBody(req);const r=await fr('POST','/price-tags/pdf',JSON.stringify(b));return binary(res,r.status,r.type,r.body,'inline; filename="Price-Tags-FastReport.pdf"');
  }
  if(req.method==='GET'&&req.url==='/printers')return json(res,200,{connected:true,printers:await printers()});
  if(req.method==='POST'&&req.url==='/print'){const b=await readBody(req);if(!b.printer)throw Error('Printer is required');await ps(rawScript,[String(b.printer),String(b.text||''),String(Math.max(1,Number(b.copies||1))),'']);return json(res,200,{ok:true});}
  if(req.method==='POST'&&req.url==='/cash-drawer'){const b=await readBody(req);if(!b.printer)throw Error('Cash drawer printer is required');const bytes=(b.bytes||[27,112,0,25,250]).map(Number);await ps(rawScript,[String(b.printer),'','1',bytes.join(',')]);return json(res,200,{ok:true});}
  if(req.method==='POST'&&req.url==='/display'){const b=await readBody(req);if(!b.port)throw Error('COM port is required');const chars=Math.max(8,Number(b.chars||20));const line=v=>String(v||'').padEnd(chars,' ').slice(0,chars);const script=`$p=New-Object System.IO.Ports.SerialPort('${String(b.port).replace(/'/g,"''")}',${Number(b.baud||9600)},'None',8,'One');$p.Open();$p.Write([char]12);$p.Write('${line(b.line1).replace(/'/g,"''")}');$p.Write('${line(b.line2).replace(/'/g,"''")}');$p.Close()`;await ps(script);return json(res,200,{ok:true});}
  return json(res,404,{ok:false,error:'Not found'});
 }catch(e){return json(res,500,{ok:false,error:e.message||String(e)})}
}
const server=http.createServer(route);
server.on('error',e=>{console.error(e);process.exitCode=1});
server.listen(PORT,HOST,()=>console.log(`SP-Manager Local Agent 1.2.0 listening on http://${HOST}:${PORT}`));
