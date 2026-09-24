const http=require('http');
const {execFile}=require('child_process');
const PORT=18765;
const HOST='127.0.0.1';
const STARTED_AT=new Date().toISOString();
let displayState={line1:'WELCOME!',line2:'',chars:20,updatedAt:new Date().toISOString()};
let displayWindowOpened=false;
function ps(script,args=[]){return new Promise((resolve,reject)=>{execFile('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',script,'--',...args],{windowsHide:true,maxBuffer:1024*1024},(e,stdout,stderr)=>e?reject(new Error((stderr||e.message).trim())):resolve(stdout.trim()))})}
function json(res,status,obj){const body=JSON.stringify(obj);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'});res.end(body)}
function readBody(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>2e6)reject(Error('Body too large'))});req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}})})}
const rawScript=`
param([string]$Printer,[string]$Text,[int]$Copies=1,[string]$Bytes,[string]$OptionsJson)
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
public static void Send(string p, byte[] b){IntPtr h; if(!OpenPrinter(p,out h,IntPtr.Zero)) throw new Exception("OpenPrinter failed: "+Marshal.GetLastWin32Error()); try{var d=new DOCINFO{pDocName="SP-Manager",pDataType="RAW"}; if(StartDocPrinter(h,1,d)==0)throw new Exception("StartDocPrinter failed"); try{if(StartPagePrinter(h)==0)throw new Exception("StartPagePrinter failed"); IntPtr m=Marshal.AllocHGlobal(b.Length); try{Marshal.Copy(b,0,m,b.Length); int w; if(!WritePrinter(h,m,b.Length,out w))throw new Exception("WritePrinter failed: "+Marshal.GetLastWin32Error());}finally{Marshal.FreeHGlobal(m);} if(!EndPagePrinter(h))throw new Exception("EndPagePrinter failed");}finally{EndDocPrinter(h);}}finally{ClosePrinter(h);}}
}
'@
if($Bytes){$data=($Bytes -split ',')|ForEach-Object{[byte]$_};[RawPrinter]::Send($Printer,$data)}else{
 $o=@{};if($OptionsJson){try{$o=$OptionsJson|ConvertFrom-Json}catch{}}
 $cp=437;if($o.codePage){[void][int]::TryParse([string]$o.codePage,[ref]$cp)}
 try{$enc=[Text.Encoding]::GetEncoding($cp)}catch{$enc=[Text.Encoding]::UTF8}
 $all=New-Object System.Collections.Generic.List[byte]
 function AddRasterLogo([System.Collections.Generic.List[byte]]$buf,[string]$data,[int]$maxDots){
   if([string]::IsNullOrWhiteSpace($data)){return}
   try{
     $raw=$data -replace '^data:image/[^;]+;base64,','';$bytes=[Convert]::FromBase64String($raw);$ms=New-Object IO.MemoryStream(,$bytes);$bmp=[Drawing.Bitmap]::FromStream($ms);
     $scale=[Math]::Min(1.0,$maxDots/[double]$bmp.Width);$w=[Math]::Max(1,[int]($bmp.Width*$scale));$h=[Math]::Max(1,[int]($bmp.Height*$scale));$img=New-Object Drawing.Bitmap($w,$h);$g=[Drawing.Graphics]::FromImage($img);$g.DrawImage($bmp,0,0,$w,$h);$g.Dispose();$bmp.Dispose();$ms.Dispose();
     $rowBytes=[int][Math]::Ceiling($w/8.0);$buf.AddRange([byte[]](29,118,48,0,[byte]($rowBytes%256),[byte]([Math]::Floor($rowBytes/256)),[byte]($h%256),[byte]([Math]::Floor($h/256))));
     for($y=0;$y -lt $h;$y++){for($x=0;$x -lt $rowBytes;$x++){[byte]$v=0;for($b=0;$b -lt 8;$b++){ $px=$x*8+$b;if($px -lt $w){$c=$img.GetPixel($px,$y);$gray=(0.299*$c.R+0.587*$c.G+0.114*$c.B);if($gray -lt 180){$v=$v -bor (1 -shl (7-$b))}}};$buf.Add($v)}};$img.Dispose()
   }catch{}
 }
 1..([Math]::Max(1,$Copies))|ForEach-Object{
   $all.AddRange([byte[]](27,64))
   if($o.characterSet -and $o.characterSet -ne 'None'){
     $map=@{'USA'=0;'France'=1;'Germany'=2;'UK'=3;'Denmark I'=4;'Sweden'=5;'Italy'=6;'Spain I'=7;'Japan'=8;'Norway'=9;'Denmark II'=10;'Spain II'=11;'Latin America'=12;'Korea'=13;'Slovenia / Croatia'=18;'China'=15;'Vietnam'=16;'Arabia'=19};$cs=$map[[string]$o.characterSet];if($null -ne $cs){$all.AddRange([byte[]](27,82,[byte]$cs))}
   }
   $fontSize=[Math]::Max(50,[Math]::Min(200,[int]($(if($null -eq $o.fontSize){100}else{$o.fontSize}))));$mode=0;if($fontSize -ge 140){$mode=17}elseif($fontSize -le 80){$mode=1};$all.AddRange([byte[]](29,33,[byte]$mode))
   $align=0;if([string]$o.alignment -eq 'Center'){$align=1}elseif([string]$o.alignment -eq 'Right'){$align=2};$all.AddRange([byte[]](27,97,[byte]$align))
   $top=[Math]::Max(0,[Math]::Min(20,[int]($o.marginTop)));if($top -gt 0){$all.AddRange([byte[]](27,100,[byte]$top))}
   if($o.printBitmap -ne $false -and $o.logoData){$maxDots=([Math]::Max(32,[Math]::Min(576,[int]($o.charactersPerLine)*12)));AddRasterLogo $all ([string]$o.logoData) $maxDots;$all.Add(10)}
   $left=[Math]::Max(0,[Math]::Min(40,[int]($o.marginLeft)));$right=[Math]::Max(0,[Math]::Min(40,[int]($o.marginRight)));$lines=String($Text).Split([char]10)
   foreach($line in $lines){$clean=$line.TrimEnd([char]13);if($o.rightToLeft){$clean=($clean.ToCharArray() -join '')};if($left -gt 0){$clean=(' ' * $left)+$clean};if($right -gt 0){$clean=$clean+(' ' * $right)};$all.AddRange($enc.GetBytes($clean));$all.Add(10)}
   if($o.printBarcode -ne $false -and $o.barcodeData){$bd=[Text.Encoding]::ASCII.GetBytes([string]$o.barcodeData);$payload=[byte[]](123,66)+$bd;$all.AddRange([byte[]](29,107,73,[byte]$payload.Length));$all.AddRange($payload);$all.Add(10)}
   $feed=[Math]::Max(0,[Math]::Min(20,[int]($o.feedLines)));if($feed -gt 0){$all.AddRange([byte[]](27,100,[byte]$feed))}
   if($o.cutPaper -ne $false){$all.AddRange([byte[]](29,86,65,3))}
  }
 [RawPrinter]::Send($Printer,$all.ToArray())
}
`

const emailScript=`
param([string]$Host,[int]$Port,[bool]$Ssl,[string]$From,[string]$DisplayName,[string]$Username,[string]$Password,[string]$To,[string]$Subject,[string]$Body,[string]$Bcc,[string]$AttachmentPath,[string]$AttachmentName)
if([string]::IsNullOrWhiteSpace($Host)){throw 'SMTP host is required'}
if([string]::IsNullOrWhiteSpace($From)){throw 'Sender email is required'}
if([string]::IsNullOrWhiteSpace($To)){throw 'Customer email is required'}
if([string]::IsNullOrWhiteSpace($Password)){throw 'SMTP password is required'}
$mail=New-Object System.Net.Mail.MailMessage
try{
 $mail.From=New-Object System.Net.Mail.MailAddress($From,$(if([string]::IsNullOrWhiteSpace($DisplayName)){$From}else{$DisplayName}))
 $mail.To.Add($To)
 if($Bcc){$Bcc.Split(',')|ForEach-Object{if($_.Trim()){$mail.Bcc.Add($_.Trim())}}}
 if($AttachmentPath -and (Test-Path $AttachmentPath)){$mail.Attachments.Add($AttachmentPath) | Out-Null}
 $mail.Subject=$Subject
 $mail.SubjectEncoding=[Text.Encoding]::UTF8
 $mail.BodyEncoding=[Text.Encoding]::UTF8
 $mail.IsBodyHtml=$true
 $mail.Body=$Body
 $smtp=New-Object System.Net.Mail.SmtpClient($Host,$Port)
 try{$smtp.EnableSsl=$Ssl;$smtp.Credentials=New-Object System.Net.NetworkCredential($(if([string]::IsNullOrWhiteSpace($Username)){$From}else{$Username}),$Password);$smtp.Send($mail)}finally{$smtp.Dispose()}
}finally{$mail.Dispose()}
`;
async function printers(){const out=await ps('Get-Printer | Select-Object Name,PrinterStatus,WorkOffline | ConvertTo-Json -Compress');if(!out)return[];const x=JSON.parse(out);return Array.isArray(x)?x:[x]}
async function route(req,res){
 if(req.method==='OPTIONS')return json(res,204,{});
 try{
  if(req.method==='POST'&&req.url==='/price-tags/raw'){const b=await readBody(req);if(!b.printer)throw Error('Printer is required');const data=String(b.data||'');const copies=Math.max(1,Number(b.copies||1));const lang=String(b.language||'TSPL').toUpperCase();if(!['ZPL','TSPL'].includes(lang))throw Error('Unsupported Price Tags printer language');await ps(rawScript,[String(b.printer),data,copies,'']);return json(res,200,{ok:true,language:lang});}
  if(req.method==='GET'&&(req.url==='/'||req.url==='/status'))return json(res,200,{connected:true,agentDetected:true,agent:'SP-Manager Local Agent',version:'1.0.7',port:PORT,host:HOST,platform:process.platform,pid:process.pid,startedAt:STARTED_AT,uptimeSeconds:Math.floor(process.uptime())});
  if(req.method==='GET'&&req.url==='/printers')return json(res,200,{connected:true,printers:await printers()});
  if(req.method==='POST'&&req.url==='/print'){const b=await readBody(req);if(!b.printer)throw Error('Printer is required');await ps(rawScript,[String(b.printer),String(b.text||''),String(Math.max(1,Number(b.copies||1))),'',JSON.stringify(b.options||{})]);return json(res,200,{ok:true,advancedApplied:true});}
  if(req.method==='POST'&&req.url==='/cash-drawer'){const b=await readBody(req);if(!b.printer)throw Error('Cash drawer printer is required');const bytes=(b.bytes||[27,112,0,25,250]).map(Number);await ps(rawScript,[String(b.printer),'','1',bytes.join(',')]);return json(res,200,{ok:true});}
  if(req.method==='POST'&&req.url==='/email'){const b=await readBody(req);let pdfPath='';let pdfName=String(b.pdfFileName||'SP-Manager-Invoice.pdf');if(b.pdfHtml){const tmp=process.env.TEMP||process.env.TMP||'.';const base=String(Date.now())+'-'+Math.random().toString(36).slice(2);const fs=require('fs');const path=require('path');const htmlPath=path.join(tmp,base+'.html');pdfPath=path.join(tmp,base+'.pdf');fs.writeFileSync(htmlPath,String(b.pdfHtml),'utf8');const edge=await ps(`$e=(Get-Command msedge.exe -ErrorAction SilentlyContinue).Source;if(-not $e){$c=@("$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe","$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe","$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe");$e=$c|Where-Object{Test-Path $_}|Select-Object -First 1};if(-not $e){throw 'Microsoft Edge is required to create PDF attachments.'};Write-Output $e`);const url='file:///'+htmlPath.replace(/\\/g,'/').replace(/ /g,'%20');await ps(`Start-Process -FilePath '${edge.replace(/'/g,"''")}' -ArgumentList '--headless','--disable-gpu','--no-pdf-header-footer','--print-to-pdf=${pdfPath.replace(/'/g,"''")}','${url.replace(/'/g,"''")}' -Wait;Start-Sleep -Milliseconds 500;if(-not(Test-Path '${pdfPath.replace(/'/g,"''")}')){throw 'PDF generation failed.'}`);try{fs.unlinkSync(htmlPath)}catch{}}await ps(emailScript,[String(b.host||''),String(Number(b.port||0)),String(b.ssl!==false),String(b.from||''),String(b.displayName||''),String(b.username||''),String(b.password||''),String(b.to||''),String(b.subject||''),String(b.body||''),String(b.bcc||''),pdfPath,pdfName]);if(pdfPath){try{require('fs').unlinkSync(pdfPath)}catch{}}return json(res,200,{ok:true,attachment:Boolean(pdfPath),attachmentName:pdfName});}
  if(req.method==='GET'&&req.url==='/display-state')return json(res,200,displayState);
  if(req.method==='GET'&&req.url==='/customer-display'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(`<!doctype html><html><head><meta charset="utf-8"><title>SP-Manager Customer Display</title><style>html,body{margin:0;width:100%;height:100%;background:#05080c;color:#fff;font-family:Segoe UI,Arial,sans-serif;overflow:hidden}body{display:flex;flex-direction:column;justify-content:center;padding:4vw;box-sizing:border-box}.line1{font-size:clamp(24px,5vw,72px);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.line2{margin-top:3vh;font-size:clamp(28px,6vw,90px);font-weight:800;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.brand{position:fixed;left:24px;top:18px;font-size:12px;letter-spacing:.18em;opacity:.55}</style></head><body><div class="brand">SP-MANAGER</div><div class="line1" id="l1">WELCOME!</div><div class="line2" id="l2"></div><script>async function tick(){try{const r=await fetch('/display-state',{cache:'no-store'});const d=await r.json();document.getElementById('l1').textContent=d.line1||'';document.getElementById('l2').textContent=d.line2||''}catch(e){}}tick();setInterval(tick,400)</script></body></html>`)}
  if(req.method==='GET'&&req.url==='/display-monitors'){const displayScript=`Add-Type -AssemblyName System.Windows.Forms;$screens=[System.Windows.Forms.Screen]::AllScreens;@($screens)|ForEach-Object{[pscustomobject]@{index=[array]::IndexOf($screens,$_);primary=$_.Primary;x=$_.Bounds.X;y=$_.Bounds.Y;width=$_.Bounds.Width;height=$_.Bounds.Height;device=$_.DeviceName}}|ConvertTo-Json -Compress`;const out=await ps(displayScript);let monitors=[];if(out){try{const x=JSON.parse(out);monitors=Array.isArray(x)?x:[x]}catch{}};return json(res,200,{ok:true,monitors});}
  if(req.method==='POST'&&req.url==='/display-window'){const displayScript=`$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Windows.Forms;Add-Type @'
using System; using System.Runtime.InteropServices;
public static class SPWindow { [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd,IntPtr hWndInsertAfter,int X,int Y,int cx,int cy,uint uFlags); [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd,int nCmdShow); }
'@
$screens=[System.Windows.Forms.Screen]::AllScreens;if($screens.Count -lt 2){throw 'No secondary monitor detected. In Windows press Win+P and select Extend.'};$s=$screens[1];$url='http://127.0.0.1:${PORT}/customer-display';$edge=(Get-Command msedge.exe -ErrorAction SilentlyContinue).Source;if(-not $edge){$candidates=@("$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe","$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe","$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe");$edge=$candidates|Where-Object{Test-Path $_}|Select-Object -First 1};if(-not $edge){$chrome=(Get-Command chrome.exe -ErrorAction SilentlyContinue).Source;if($chrome){$edge=$chrome}};if(-not $edge){throw 'Microsoft Edge or Google Chrome was not found.'};$args=@("--app=$url","--new-window","--window-position=$($s.Bounds.X),$($s.Bounds.Y)","--window-size=$($s.Bounds.Width),$($s.Bounds.Height)",'--disable-session-crashed-bubble');$proc=Start-Process -FilePath $edge -ArgumentList $args -PassThru;Start-Sleep -Milliseconds 1200;$hwnd=[IntPtr]::Zero;for($i=0;$i -lt 10 -and $hwnd -eq [IntPtr]::Zero;$i++){try{$proc.Refresh();$hwnd=$proc.MainWindowHandle}catch{};if($hwnd -eq [IntPtr]::Zero){Start-Sleep -Milliseconds 300}};if($hwnd -ne [IntPtr]::Zero){[SPWindow]::ShowWindowAsync($hwnd,3)|Out-Null;[SPWindow]::SetWindowPos($hwnd,[IntPtr]::Zero,$s.Bounds.X,$s.Bounds.Y,$s.Bounds.Width,$s.Bounds.Height,0x0040)|Out-Null};Write-Output (@{monitor=$s.DeviceName;x=$s.Bounds.X;y=$s.Bounds.Y;width=$s.Bounds.Width;height=$s.Bounds.Height;windowFound=($hwnd -ne [IntPtr]::Zero)}|ConvertTo-Json -Compress)`;const out=await ps(displayScript);let info={};if(out){try{info=JSON.parse(out)}catch{}};return json(res,200,{ok:true,monitor:'secondary',details:info});}

  if(req.method==='POST'&&req.url==='/display'){const b=await readBody(req);const chars=Math.max(8,Number(b.chars||20));const line=v=>String(v||'').padEnd(chars,' ').slice(0,chars);displayState={line1:line(b.line1),line2:line(b.line2),chars,updatedAt:new Date().toISOString()};if(String(b.mode||'com')==='secondary')return json(res,200,{ok:true,mode:'secondary'});if(!b.port)throw Error('COM port is required');const script=`$p=New-Object System.IO.Ports.SerialPort('${String(b.port).replace(/'/g,"''")}',${Number(b.baud||9600)},'None',${Number(b.dataBits||8)},${Number(b.stopBits||1)===2?'Two':'One'});$p.Open();$p.Write([char]12);$p.Write('${line(b.line1).replace(/'/g,"''")}');$p.Write('${line(b.line2).replace(/'/g,"''")}');$p.Close()`;await ps(script);return json(res,200,{ok:true,mode:'com'});}
  return json(res,404,{ok:false,error:'Not found'});
 }catch(e){return json(res,500,{ok:false,error:e.message})}
}
const server=http.createServer(route);
server.on('error',e=>{console.error(e);process.exitCode=1});
server.listen(PORT,HOST,()=>console.log(`SP-Manager Local Agent 1.0.7 listening on http://${HOST}:${PORT}`));
