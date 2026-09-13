const http=require('http');
const {execFile,spawn}=require('child_process');
const PORT=18765;
const HOST='127.0.0.1';
function ps(script,args=[]){return new Promise((resolve,reject)=>{execFile('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',script,'--',...args],{windowsHide:true,maxBuffer:1024*1024},(e,stdout,stderr)=>e?reject(new Error(stderr||e.message)):resolve(stdout.trim()))})}
function json(res,status,obj){const body=JSON.stringify(obj);res.writeHead(status,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'});res.end(body)}
function readBody(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>2e6)reject(Error('Body too large'))});req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}})})}
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
[DllImport("winspool.drv", SetLastError=true)] static extern bool WritePrinter(IntPtr h, IntPtr b,int n,out int w);
public static void Send(string p, byte[] b){IntPtr h; if(!OpenPrinter(p,out h,IntPtr.Zero)) throw new Exception("OpenPrinter failed: "+Marshal.GetLastWin32Error()); try{var d=new DOCINFO{pDocName="SP-Manager",pDataType="RAW"}; if(StartDocPrinter(h,1,d)==0)throw new Exception("StartDocPrinter failed"); try{StartPagePrinter(h); IntPtr m=Marshal.AllocHGlobal(b.Length); try{Marshal.Copy(b,0,m,b.Length); int w; if(!WritePrinter(h,m,b.Length,out w))throw new Exception("WritePrinter failed");}finally{Marshal.FreeHGlobal(m);} EndPagePrinter(h);}finally{EndDocPrinter(h);}}finally{ClosePrinter(h);}}
}
'@
if($Bytes){$data=($Bytes -split ',')|ForEach-Object{[byte]$_};[RawPrinter]::Send($Printer,$data)}else{$b=[Text.Encoding]::UTF8.GetBytes($Text);$all=New-Object System.Collections.Generic.List[byte];1..([Math]::Max(1,$Copies))|ForEach-Object{$all.AddRange($b);$all.Add(10);$all.AddRange([byte[]](27,100,3))};[RawPrinter]::Send($Printer,$all.ToArray())}
`;
async function printers(){const out=await ps(`Get-Printer | Select-Object Name,PrinterStatus,WorkOffline | ConvertTo-Json -Compress`);if(!out)return[];const x=JSON.parse(out);return Array.isArray(x)?x:[x]}
async function route(req,res){if(req.method==='OPTIONS')return json(res,204,{});try{if(req.method==='GET'&&req.url==='/status')return json(res,200,{connected:true,agent:'SP-Manager Local Agent',version:'1.0.0',port:PORT,platform:process.platform});if(req.method==='GET'&&req.url==='/printers')return json(res,200,{connected:true,printers:await printers()});if(req.method==='POST'&&req.url==='/print'){const b=await readBody(req);if(!b.printer)throw Error('Printer is required');const text=String(b.text||'');await ps(rawScript,[String(b.printer),text,String(Math.max(1,Number(b.copies||1))),'']);return json(res,200,{ok:true});}if(req.method==='POST'&&req.url==='/cash-drawer'){const b=await readBody(req);if(!b.printer)throw Error('Cash drawer printer is required');const bytes=(b.bytes||[27,112,0,25,250]).map(Number);await ps(rawScript,[String(b.printer),'','1',bytes.join(',')]);return json(res,200,{ok:true});}if(req.method==='POST'&&req.url==='/display'){const b=await readBody(req);if(!b.port)throw Error('COM port is required');const chars=Math.max(8,Number(b.chars||20));const line=(v)=>String(v||'').padEnd(chars,' ').slice(0,chars);const script=`$p=New-Object System.IO.Ports.SerialPort('${String(b.port).replace(/'/g,"''")}',${Number(b.baud||9600)},'None',8,'One');$p.Open();$p.Write([char]12);$p.Write('${line(b.line1).replace(/'/g,"''")}');$p.Write('${line(b.line2).replace(/'/g,"''")}');$p.Close()`;await ps(script);return json(res,200,{ok:true});}return json(res,404,{ok:false,error:'Not found'});}catch(e){return json(res,500,{ok:false,error:e.message})}}
http.createServer(route).listen(PORT,HOST,()=>console.log(`SP-Manager Local Agent listening on http://${HOST}:${PORT}`));
