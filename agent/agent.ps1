$ErrorActionPreference='Stop'
$Port=18765
$HostName='127.0.0.1'
$StartedAt=(Get-Date).ToUniversalTime().ToString('o')
function Send-Json($stream,[int]$status,$obj){
  $body=($obj|ConvertTo-Json -Compress -Depth 8)
  $reason=if($status -eq 200){'OK'}elseif($status -eq 204){'No Content'}else{'Error'}
  $bytes=[Text.Encoding]::UTF8.GetBytes($body)
  $hdr="HTTP/1.1 $status $reason`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-store`r`nAccess-Control-Allow-Origin: *`r`nAccess-Control-Allow-Headers: Content-Type`r`nAccess-Control-Allow-Methods: GET,POST,OPTIONS`r`nConnection: close`r`n`r`n"
  $hb=[Text.Encoding]::ASCII.GetBytes($hdr);$stream.Write($hb,0,$hb.Length);if($bytes.Length -gt 0){$stream.Write($bytes,0,$bytes.Length)};$stream.Flush()
}
function Send-Text($stream,[int]$status,$text){Send-Json $stream $status @{ok=$false;error=$text}}
Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
public static class SPRawPrinter { [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public class DOCINFO { public string pDocName; public string pOutputFile; public string pDataType; }
[DllImport("winspool.drv",EntryPoint="OpenPrinterW",SetLastError=true,CharSet=CharSet.Unicode)] static extern bool OpenPrinter(string p,out IntPtr h,IntPtr d);
[DllImport("winspool.drv",SetLastError=true)] static extern bool ClosePrinter(IntPtr h);
[DllImport("winspool.drv",EntryPoint="StartDocPrinterW",SetLastError=true,CharSet=CharSet.Unicode)] static extern int StartDocPrinter(IntPtr h,int l,DOCINFO d);
[DllImport("winspool.drv",SetLastError=true)] static extern bool EndDocPrinter(IntPtr h);
[DllImport("winspool.drv",SetLastError=true)] static extern int StartPagePrinter(IntPtr h);
[DllImport("winspool.drv",SetLastError=true)] static extern bool EndPagePrinter(IntPtr h);
[DllImport("winspool.drv",SetLastError=true)] static extern bool WritePrinter(IntPtr h,IntPtr b,int n,out int w);
public static void Send(string p,byte[] b){IntPtr h;if(!OpenPrinter(p,out h,IntPtr.Zero))throw new Exception("OpenPrinter failed: "+Marshal.GetLastWin32Error());try{var d=new DOCINFO{pDocName="SP-Manager",pDataType="RAW"};if(StartDocPrinter(h,1,d)==0)throw new Exception("StartDocPrinter failed");try{if(StartPagePrinter(h)==0)throw new Exception("StartPagePrinter failed");IntPtr m=Marshal.AllocHGlobal(b.Length);try{Marshal.Copy(b,0,m,b.Length);int w;if(!WritePrinter(h,m,b.Length,out w))throw new Exception("WritePrinter failed: "+Marshal.GetLastWin32Error());}finally{Marshal.FreeHGlobal(m);}if(!EndPagePrinter(h))throw new Exception("EndPagePrinter failed");}finally{EndDocPrinter(h);}}finally{ClosePrinter(h);}}
}
'@
function Read-Request($client){
  $stream=$client.GetStream();$buf=New-Object byte[] 8192;$ms=New-Object IO.MemoryStream
  do{$n=$stream.Read($buf,0,$buf.Length);if($n -le 0){break};$ms.Write($buf,0,$n);$raw=[Text.Encoding]::ASCII.GetString($ms.ToArray());$headerEnd=$raw.IndexOf("`r`n`r`n");}while($headerEnd -lt 0 -and $ms.Length -lt 2MB)
  if($headerEnd -lt 0){throw 'Invalid HTTP request'}
  $head=$raw.Substring(0,$headerEnd);$lines=$head -split "`r`n";$parts=$lines[0].Split(' ');$method=$parts[0];$path=$parts[1];$cl=0;foreach($l in $lines){if($l -match '^(?i)Content-Length:\s*(\d+)'){$cl=[int]$Matches[1]}}
  $headerBytes=$headerEnd+4;$bodyBytes=$ms.ToArray();$need=$headerBytes+$cl
  while($bodyBytes.Length -lt $need){$n=$stream.Read($buf,0,$buf.Length);if($n -le 0){break};$ms.Write($buf,0,$n);$bodyBytes=$ms.ToArray()}
  $body=if($cl -gt 0){[Text.Encoding]::UTF8.GetString($bodyBytes,$headerBytes,$cl)}else{''}
  return @{stream=$stream;method=$method;path=$path;body=$body}
}
function Handle($req){
  $s=$req.stream
  try{
    if($req.method -eq 'OPTIONS'){Send-Json $s 204 @{};return}
    if($req.method -eq 'GET' -and ($req.path -eq '/' -or $req.path -eq '/status')){Send-Json $s 200 @{connected=$true;agentDetected=$true;agent='SP-Manager Local Agent';version='1.0.12';port=$Port;host=$HostName;platform='win32';pid=$PID;startedAt=$StartedAt;uptimeSeconds=[int]((Get-Date)-[datetime]$StartedAt).TotalSeconds};return}
    if($req.method -eq 'GET' -and $req.path -eq '/printers'){$ps=Get-Printer|Select-Object Name,PrinterStatus,WorkOffline;Send-Json $s 200 @{connected=$true;printers=@($ps)};return}
    $b=if($req.body){$req.body|ConvertFrom-Json}else{[pscustomobject]@{}}
    if($req.method -eq 'POST' -and $req.path -eq '/print'){$printer=[string]$b.printer;if(!$printer){throw 'Printer is required'};$copies=[Math]::Max(1,[int]$b.copies);$txt=[string]$b.text;$data=[Text.Encoding]::UTF8.GetBytes($txt);$all=New-Object Collections.Generic.List[byte];1..$copies|%{$all.AddRange($data);$all.Add(10);$all.AddRange([byte[]](27,100,3))};[SPRawPrinter]::Send($printer,$all.ToArray());Send-Json $s 200 @{ok=$true};return}
    if($req.method -eq 'POST' -and $req.path -eq '/cash-drawer'){$printer=[string]$b.printer;if(!$printer){throw 'Cash drawer printer is required'};$bytes=@($b.bytes|%{[byte][int]$_});if(!$bytes.Count){$bytes=[byte[]](27,112,0,25,250)};[SPRawPrinter]::Send($printer,$bytes);Send-Json $s 200 @{ok=$true};return}
    if($req.method -eq 'POST' -and $req.path -eq '/display'){$portName=[string]$b.port;if(!$portName){throw 'COM port is required'};$chars=[Math]::Max(8,[int]$b.chars);$baud=[int]$b.baud;if(!$baud){$baud=9600};$sp=New-Object IO.Ports.SerialPort($portName,$baud,'None',8,'One');$sp.Open();$line1=([string]$b.line1).PadRight($chars).Substring(0,$chars);$line2=([string]$b.line2).PadRight($chars).Substring(0,$chars);$sp.Write([char]12);$sp.Write($line1+$line2);$sp.Close();Send-Json $s 200 @{ok=$true};return}
    Send-Json $s 404 @{ok=$false;error='Not found'}
  }catch{Send-Json $s 500 @{ok=$false;error=$_.Exception.Message}}
}
$frScript=Join-Path $PSScriptRoot 'fastreport-price-tags.ps1'
if(Test-Path $frScript){
  try{
    $frCheck=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:18766/status' -TimeoutSec 1 -ErrorAction Stop
  }catch{
    Start-Process -FilePath $PSHOME\powershell.exe -ArgumentList @('-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',$frScript) -WindowStyle Hidden
  }
}
$listener=New-Object Net.Sockets.TcpListener([Net.IPAddress]::Parse($HostName),$Port);$listener.Start()
while($true){$client=$listener.AcceptTcpClient();try{$req=Read-Request $client;Handle $req}catch{try{Send-Text $client.GetStream() 500 $_.Exception.Message}catch{}}finally{$client.Close()}}
