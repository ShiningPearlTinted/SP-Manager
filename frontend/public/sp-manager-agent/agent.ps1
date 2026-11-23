$ErrorActionPreference='Stop'
$Port=18765
$HostName='127.0.0.1'

$TokenDir=Join-Path $env:LOCALAPPDATA 'SP-Manager'
if(-not(Test-Path -LiteralPath $TokenDir)){New-Item -ItemType Directory -Path $TokenDir -Force|Out-Null}
$TokenPath=Join-Path $TokenDir 'agent-pairing-token.txt'
if(-not(Test-Path -LiteralPath $TokenPath)){$random=New-Object byte[] 32;$rng=[Security.Cryptography.RandomNumberGenerator]::Create();try{$rng.GetBytes($random)}finally{$rng.Dispose()};[IO.File]::WriteAllText($TokenPath,([BitConverter]::ToString($random).Replace('-','').ToLower()))}
$AgentToken=[IO.File]::ReadAllText($TokenPath).Trim()
if($AgentToken -notmatch '^[a-f0-9]{64}$'){throw 'Invalid pairing token file.'}
$AllowedOrigins=@('https://apps.shiningpearltinted.com','https://app.shiningpearltinted.com','https://shiningpearltinted.com','https://www.shiningpearltinted.com','https://shiningpearltinted.github.io')
$DisplayToken=([BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes('display:'+ $AgentToken))).Replace('-','').ToLower())
$script:ResponseOrigin=''

$StartedAt=(Get-Date).ToUniversalTime().ToString('o')
$AgentVersion='1.4.0'
$AgentDir=Split-Path -Parent $MyInvocation.MyCommand.Path
$PowerShell=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$script:DisplayState=@{line1='WELCOME!';line2='';chars=20;updatedAt=$StartedAt}
$script:DisplayIdleImage='';$script:DisplayIdleVersion=0
function Send-Bytes($stream,[int]$status,[string]$contentType,[byte[]]$bytes,[string]$disposition=''){
  $reason=if($status -eq 200){'OK'}elseif($status -eq 204){'No Content'}else{'Error'}
  $extra=if($disposition){"Content-Disposition: $disposition`r`n"}else{''}
  $hdr="HTTP/1.1 $status $reason`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-store`r`nAccess-Control-Allow-Origin: $script:ResponseOrigin`r`nAccess-Control-Allow-Headers: Content-Type, Authorization`r`nAccess-Control-Allow-Methods: GET,POST,OPTIONS`r`nConnection: close`r`n$extra`r`n"
  $hb=[Text.Encoding]::ASCII.GetBytes($hdr);$stream.Write($hb,0,$hb.Length);if($bytes.Length -gt 0){$stream.Write($bytes,0,$bytes.Length)};$stream.Flush()
}
function Send-Json($stream,[int]$status,$obj){$body=($obj|ConvertTo-Json -Compress -Depth 12);Send-Bytes $stream $status 'application/json; charset=utf-8' ([Text.Encoding]::UTF8.GetBytes($body))}
function Send-Text($stream,[int]$status,[string]$text,[string]$contentType='text/plain; charset=utf-8'){Send-Bytes $stream $status $contentType ([Text.Encoding]::UTF8.GetBytes($text))}
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
 $client.ReceiveTimeout=5000;$client.SendTimeout=5000;$stream=$client.GetStream();$stream.ReadTimeout=5000;$stream.WriteTimeout=5000
 $buf=New-Object byte[] 8192;$ms=New-Object IO.MemoryStream;$timer=[Diagnostics.Stopwatch]::StartNew()
 try {
  do {if($timer.ElapsedMilliseconds -gt 10000){throw 'Request deadline exceeded'};$n=$stream.Read($buf,0,$buf.Length);if($n -le 0){throw 'Incomplete request'};$ms.Write($buf,0,$n);$raw=[Text.Encoding]::ASCII.GetString($ms.ToArray());$headerEnd=$raw.IndexOf("`r`n`r`n");if($headerEnd -lt 0 -and $ms.Length -gt 16384){throw 'Header too large'}} while($headerEnd -lt 0)
  if($headerEnd -gt 16384){throw 'Header too large'};$lines=$raw.Substring(0,$headerEnd) -split "`r`n";$parts=$lines[0].Split(' ');if($parts.Length -ne 3){throw 'Invalid request line'};$headers=@{}
  foreach($line in $lines|Select-Object -Skip 1){$colon=$line.IndexOf(':');if($colon -le 0){throw 'Invalid header'};$key=$line.Substring(0,$colon).Trim().ToLower();if($headers.ContainsKey($key)){throw 'Duplicate header'};$headers[$key]=$line.Substring($colon+1).Trim()}
  if($headers.ContainsKey('transfer-encoding')){throw 'Chunked requests are unsupported'};$cl=0;if($headers.ContainsKey('content-length')){if($headers['content-length'] -notmatch '^\d{1,8}$'){throw 'Invalid body length'};$cl=[int]$headers['content-length']};if($cl -gt 12582912){throw 'Body too large'}
  $offset=$headerEnd+4;$need=$offset+$cl;while($ms.Length -lt $need){if($timer.ElapsedMilliseconds -gt 10000){throw 'Request deadline exceeded'};$n=$stream.Read($buf,0,[Math]::Min($buf.Length,$need-$ms.Length));if($n -le 0){throw 'Incomplete body'};$ms.Write($buf,0,$n)}
  $bytes=$ms.ToArray();$body=if($cl -gt 0){[Text.Encoding]::UTF8.GetString($bytes,$offset,$cl)}else{''};return @{stream=$stream;method=$parts[0];path=$parts[1];body=$body;headers=$headers}
 } finally {$ms.Dispose();$timer.Stop()}
}
. (Join-Path $AgentDir 'autostart.ps1')
. (Join-Path $AgentDir 'display-window.ps1')
# ---- Remote printing (agent 1.3.0) ------------------------------------------------------------
# The print PC pairs once with SP-Manager, then a background runspace asks the SP-Manager API for
# print jobs over HTTPS (outbound only) and prints them on the Windows printer driver.
# Local printing routes above are unchanged.
$RemotePrintConfigPath=Join-Path $TokenDir 'remote-print.json'
$script:RP=[hashtable]::Synchronized(@{device=$null;stop=$false;running=$false;configVersion=0;lastPollAt='';lastHeartbeatAt='';lastError='';lastJob=$null;printers=@();startedAt='';jobsPrinted=0;jobsFailed=0})
$script:RPHandle=$null;$script:RPShell=$null;$script:RPCoreLoaded=$false
# API hosts the agent may pair with: the hosts of the SP-Manager origins this agent already trusts.
$RemotePrintApiHosts=@($AllowedOrigins|ForEach-Object{([Uri]$_).Host}|Select-Object -Unique)
$SPRemotePrintCore=@'
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Security
# WinRT loading never stops the agent; a PC without it reports the error when it prints.
try{Add-Type -AssemblyName System.Runtime.WindowsRuntime;$null=[Windows.Data.Pdf.PdfDocument,Windows.Data.Pdf,ContentType=WindowsRuntime];$null=[Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime];$null=[Windows.Storage.Streams.InMemoryRandomAccessStream,Windows.Storage.Streams,ContentType=WindowsRuntime]}catch{}
try{$script:SPAsTaskOp=[System.WindowsRuntimeSystemExtensions].GetMethods()|Where-Object{$_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'}|Select-Object -First 1
$script:SPAsTaskAction=[System.WindowsRuntimeSystemExtensions].GetMethods()|Where-Object{$_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction'}|Select-Object -First 1}catch{}
function SPAwait($op,[Type]$type){$task=$script:SPAsTaskOp.MakeGenericMethod($type).Invoke($null,@($op));if(-not $task.Wait(60000)){throw 'Timed out reading the PDF.'};$task.Result}
function SPAwaitAction($op){$task=$script:SPAsTaskAction.Invoke($null,@($op));if(-not $task.Wait(60000)){throw 'Timed out rendering the PDF.'}}
function Find-SPBrowser{
  $c=@("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe","$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe","$env:ProgramFiles\Google\Chrome\Application\chrome.exe","${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe","$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe")
  $b=$c|Where-Object{$_ -and (Test-Path -LiteralPath $_)}|Select-Object -First 1
  if(!$b){throw 'Microsoft Edge or Google Chrome is required on this PC for remote printing.'};$b
}
function Get-SPPrinterPaperSizes([string]$printer){
  $ps=New-Object System.Drawing.Printing.PrinterSettings;$ps.PrinterName=$printer
  if(-not $ps.IsValid){return @()}
  $out=@();foreach($k in @('A4','A5')){if(@($ps.PaperSizes|Where-Object{[string]$_.Kind -eq $k}).Count){$out+=$k}};$out
}
# Virtual printers (Print to PDF, XPS, OneNote, Fax) open a Save/Send window instead of printing on paper,
# so they are never offered for remote printing.
function Test-SPVirtualPrinter($p){
  $port=[string]$p.PortName;$driver=[string]$p.DriverName
  ($port -match '^(PORTPROMPT:|SHRFAX:|nul:|FILE:)$') -or ($driver -match 'Microsoft Software Printer Driver|OneNote|PDF|XPS Document Writer|Fax')
}
function Get-SPPrinters{
  $default='';try{$default=(New-Object System.Drawing.Printing.PrinterSettings).PrinterName}catch{}
  @(Get-Printer|Where-Object{-not (Test-SPVirtualPrinter $_)}|ForEach-Object{
    $st=if($_.WorkOffline){'Offline'}else{[string]$_.PrinterStatus}
    $port=[string]$_.PortName
    $conn=if($port -match '^USB'){'USB'}elseif(($port -match '^(WSD|IP_|TCP|HTTP)') -or ($port -match '^\d{1,3}(\.\d{1,3}){3}') -or ($port -match '^\\\\') -or ([string]$_.Type -eq 'Connection')){'Network'}elseif($port -match '^(LPT|COM)'){'Local'}else{'Other'}
    [ordered]@{name=[string]$_.Name;status=$st;isDefault=([string]$_.Name -eq $default);paperSizes=@(Get-SPPrinterPaperSizes ([string]$_.Name));connection=$conn;port=$port}
  })
}
# Device status for Settings > Hardware > Device Status. Reads only Windows version, uptime, CPU and memory load and the Print Spooler state.
function Get-SPDeviceInfo{
  $d=[ordered]@{}
  try{$os=Get-CimInstance Win32_OperatingSystem -ErrorAction Stop;$d.windows=[string]$os.Caption;$d.build=[string]$os.BuildNumber;$d.uptimeSeconds=[int64]((Get-Date)-$os.LastBootUpTime).TotalSeconds;$tot=[double]$os.TotalVisibleMemorySize;if($tot -gt 0){$d.ramTotalMb=[int]($tot/1024);$d.ramPercent=[int][Math]::Round(100*($tot-[double]$os.FreePhysicalMemory)/$tot)}}catch{}
  try{$l=@(Get-CimInstance Win32_Processor -ErrorAction Stop|ForEach-Object{$_.LoadPercentage}|Where-Object{$_ -ne $null});if($l.Count){$d.cpuPercent=[int][Math]::Round(($l|Measure-Object -Average).Average)}}catch{}
  try{$d.spooler=[string](Get-Service -Name Spooler -ErrorAction Stop).Status}catch{$d.spooler='Unknown'}
  $d
}
# No script and no network inside the document: only inline styles and data: images/fonts.
$script:SPPrintCsp='<meta http-equiv="Content-Security-Policy" content="default-src ''none''; style-src ''unsafe-inline''; img-src data:; font-src data:">'
function Protect-SPPrintHtml([string]$html){
  $h=[regex]::Replace($html,'<script\b[\s\S]*?</script\s*>','',[Text.RegularExpressions.RegexOptions]::IgnoreCase)
  if($h -match '(?i)<head[^>]*>'){return ([regex]'(?i)<head[^>]*>').Replace($h,{param($m) $m.Value+$script:SPPrintCsp},1)}
  return '<!doctype html><html><head><meta charset="utf-8">'+$script:SPPrintCsp+'</head><body>'+$h+'</body></html>'
}
function Convert-SPHtmlToPdf([string]$html,[string]$workDir){
  $browser=Find-SPBrowser
  $htmlPath=Join-Path $workDir 'document.html';$pdfPath=Join-Path $workDir 'document.pdf';$profile=Join-Path $workDir 'profile'
  [IO.File]::WriteAllText($htmlPath,(Protect-SPPrintHtml $html),(New-Object Text.UTF8Encoding($false)))
  $url='file:///'+($htmlPath -replace '\\','/')
  $args=@('--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-extensions','--disable-sync','--no-pdf-header-footer',"--user-data-dir=""$profile""","--print-to-pdf=""$pdfPath""",$url)
  $p=Start-Process -FilePath $browser -ArgumentList $args -PassThru -WindowStyle Hidden
  if(-not $p.WaitForExit(45000)){try{Stop-Process -Id $p.Id -Force}catch{};throw 'Creating the document timed out.'}
  for($i=0;$i -lt 20 -and -not (Test-Path -LiteralPath $pdfPath);$i++){Start-Sleep -Milliseconds 150}
  if(-not (Test-Path -LiteralPath $pdfPath)){throw 'The document could not be converted for printing.'}
  $pdfPath
}
function Get-SPPdfPages([string]$pdfPath,[int]$dpi=300){
  $file=SPAwait ([Windows.Storage.StorageFile]::GetFileFromPathAsync($pdfPath)) ([Windows.Storage.StorageFile])
  $doc=SPAwait ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument])
  $pages=New-Object Collections.Generic.List[object]
  for($i=0;$i -lt $doc.PageCount;$i++){
    $page=$doc.GetPage([uint32]$i)
    try{
      $w=[double]$page.Size.Width;$h=[double]$page.Size.Height
      $opt=New-Object Windows.Data.Pdf.PdfPageRenderOptions
      $opt.DestinationWidth=[uint32][Math]::Round($w*$dpi/96);$opt.DestinationHeight=[uint32][Math]::Round($h*$dpi/96)
      $stream=New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
      SPAwaitAction ($page.RenderToStreamAsync($stream,$opt))
      $net=[System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($stream)
      $ms=New-Object IO.MemoryStream;$net.CopyTo($ms);$ms.Position=0
      $pages.Add([pscustomobject]@{image=[System.Drawing.Image]::FromStream($ms);widthIn=$w/96;heightIn=$h/96;stream=$ms})
      $stream.Dispose()
    }finally{$page.Dispose()}
  }
  ,$pages
}
function Assert-SPPrinterPaper([string]$printer,[string]$paper){
  if(@('A4','A5') -notcontains $paper){throw "Unsupported paper size $paper."}
  $ps=New-Object System.Drawing.Printing.PrinterSettings;$ps.PrinterName=$printer
  if(-not $ps.IsValid){throw "Printer `"$printer`" is not installed on this PC."}
  $sizes=@(Get-SPPrinterPaperSizes $printer)
  if($sizes -notcontains $paper){$have=if($sizes.Count){$sizes -join ', '}else{'none of A4/A5'};throw "Printer `"$printer`" does not support $paper paper (driver supports: $have). Choose another paper size."}
  $q=Get-Printer -Name $printer -ErrorAction SilentlyContinue
  if($q -and (Test-SPVirtualPrinter $q)){throw "Printer `"$printer`" is a virtual printer (PDF/XPS/OneNote/Fax) and cannot print on paper. Choose a real printer."}
  if($q -and $q.WorkOffline){throw "Printer `"$printer`" is offline. Turn it on or set it online in Windows, then print again."}
}
function Send-SPPagesToPrinter([string]$printer,[string]$paper,$pages,[int]$copies=1,[string]$docName='SP-Manager',[string]$printToFile=''){
  $settings=New-Object System.Drawing.Printing.PrinterSettings;$settings.PrinterName=$printer
  $form=$settings.PaperSizes|Where-Object{[string]$_.Kind -eq $paper}|Select-Object -First 1
  if(-not $form){throw "Printer `"$printer`" does not support $paper paper."}
  $doc=New-Object System.Drawing.Printing.PrintDocument
  $doc.DocumentName=$docName;$doc.PrinterSettings=$settings
  $doc.PrintController=New-Object System.Drawing.Printing.StandardPrintController
  $doc.PrinterSettings.Copies=[int16][Math]::Max(1,[Math]::Min(10,$copies));$doc.PrinterSettings.Collate=$true
  if($printToFile){$doc.PrinterSettings.PrintToFile=$true;$doc.PrinterSettings.PrintFileName=$printToFile}
  $doc.DefaultPageSettings.PaperSize=$form
  $doc.DefaultPageSettings.Margins=New-Object System.Drawing.Printing.Margins(0,0,0,0)
  $first=$pages[0];$doc.DefaultPageSettings.Landscape=($first.widthIn -gt $first.heightIn)
  $doc.OriginAtMargins=$false
  $state=@{i=0;pages=$pages}
  $doc.add_PrintPage({param($sender,$e)
    $pg=$state.pages[$state.i]
    $g=$e.Graphics;$g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    # The graphics origin is the printable corner; move it back to the sheet corner so the template keeps its own margins (100% scale).
    $g.TranslateTransform(-[float]$e.PageSettings.HardMarginX,-[float]$e.PageSettings.HardMarginY)
    $b=$e.PageBounds
    $g.DrawImage($pg.image,(New-Object System.Drawing.RectangleF(0,0,[float]$b.Width,[float]$b.Height)))
    $state.i++;$e.HasMorePages=$state.i -lt $state.pages.Count
  })
  try{$doc.Print()}finally{$doc.Dispose()}
}
function Invoke-SPRemotePrintJob([string]$html,[string]$printer,[string]$paper,[int]$copies=1,[string]$docName='SP-Manager',[string]$printToFile=''){
  Assert-SPPrinterPaper $printer $paper
  $work=Join-Path ([IO.Path]::GetTempPath()) ('sp-print-'+[guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $work -Force|Out-Null
  $pages=$null
  try{
    $pdf=Convert-SPHtmlToPdf $html $work
    $pages=Get-SPPdfPages $pdf 300
    if(-not $pages.Count){throw 'The document has no pages.'}
    Send-SPPagesToPrinter $printer $paper $pages $copies $docName $printToFile
    $pages.Count
  }finally{
    if($pages){foreach($p in $pages){try{$p.image.Dispose();$p.stream.Dispose()}catch{}}}
    Start-Sleep -Milliseconds 300
    try{Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue}catch{}
  }
}
function Read-SPRemoteConfig([string]$path){
  if(-not (Test-Path -LiteralPath $path)){return $null}
  try{$c=[IO.File]::ReadAllText($path)|ConvertFrom-Json}catch{return $null}
  $token='';try{if($c.token){$token=[Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String([string]$c.token),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))}}catch{$token=''}
  [pscustomobject]@{apiUrl=[string]$c.apiUrl;token=$token;agentId=[int]$c.agentId;agentName=[string]$c.agentName;outletId=[int]$c.outletId;enabled=($c.enabled -ne $false);pairedAt=[string]$c.pairedAt}
}
function Invoke-SPApi([string]$url,[string]$token,$body){
  [Net.ServicePointManager]::SecurityProtocol=[Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
  $headers=@{};if($token){$headers['Authorization']='Bearer '+$token}
  $json=($body|ConvertTo-Json -Compress -Depth 8)
  try{
    $r=Invoke-WebRequest -Uri $url -Method Post -Headers $headers -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($json)) -UseBasicParsing -TimeoutSec 30
    return @{status=[int]$r.StatusCode;data=($r.Content|ConvertFrom-Json)}
  }catch [Net.WebException]{
    $resp=$_.Exception.Response
    if(-not $resp){throw ('Cannot reach SP-Manager: '+$_.Exception.Message)}
    $text='';try{$sr=New-Object IO.StreamReader($resp.GetResponseStream());$text=$sr.ReadToEnd();$sr.Dispose()}catch{}
    $data=$null;try{$data=$text|ConvertFrom-Json}catch{}
    return @{status=[int]$resp.StatusCode;data=$data}
  }
}
'@
$SPRemotePrintWorker=@'
# Remote printing log: %LOCALAPPDATA%\SP-Manager\remote-print.log (kept below 512 KB).
function Write-SPRemoteLog([string]$m){try{$d=Join-Path $env:LOCALAPPDATA 'SP-Manager';$f=Join-Path $d 'remote-print.log';if((Test-Path -LiteralPath $f) -and (Get-Item -LiteralPath $f).Length -gt 524288){Move-Item -LiteralPath $f -Destination ($f+'.old') -Force};((Get-Date -Format 'yyyy-MM-dd HH:mm:ss')+' '+$m)|Add-Content -LiteralPath $f -Encoding UTF8}catch{}}
Write-SPRemoteLog ('Remote printing worker started (agent '+$AgentVersion+').')
$lastLogged=''
$RP.running=$true;$RP.startedAt=(Get-Date).ToUniversalTime().ToString('o')
$cfg=$null;$cfgVersion=-1;$lastBeat=[datetime]::MinValue;$printerKey='';$pendingErr=''
while(-not $RP.stop){
  $sleep=5
  try{
    if($cfgVersion -ne $RP.configVersion){$cfgVersion=$RP.configVersion;$cfg=Read-SPRemoteConfig $ConfigPath;$lastBeat=[datetime]::MinValue}
    if(-not $cfg -or -not $cfg.enabled -or -not $cfg.token){Start-Sleep -Seconds 3;continue}
    $now=Get-Date
    if(($now-$lastBeat).TotalSeconds -ge 60){
      $printers=@(Get-SPPrinters);$RP.printers=$printers
      $device=$null;try{$device=Get-SPDeviceInfo;$RP.device=$device}catch{}
      $r=Invoke-SPApi $cfg.apiUrl $cfg.token @{action='heartbeat';agent_version=$AgentVersion;machine_name=$env:COMPUTERNAME;printers=$printers;device=$device;last_error=$pendingErr}
      if($r.status -eq 401){$RP.lastError='SP-Manager did not accept this print PC (HTTP 401). It keeps the pairing and tries again every minute; if this stays, pair it again in Settings > Hardware.';Write-SPRemoteLog ('401 from SP-Manager ('+$(if($r.data.error){$r.data.error}else{'no message'})+'). Pairing kept; retrying in 60 s.');$lastBeat=[datetime]::MinValue;for($i=0;$i -lt 240 -and -not $RP.stop -and $cfgVersion -eq $RP.configVersion;$i++){Start-Sleep -Milliseconds 250};continue}
      if($r.status -ne 200){throw ('Heartbeat failed: '+$(if($r.data.error){$r.data.error}else{'HTTP '+$r.status}))}
      $pendingErr='';$lastBeat=$now;$RP.lastHeartbeatAt=$now.ToUniversalTime().ToString('o');if($r.data.poll_seconds){$sleep=[Math]::Max(3,[Math]::Min(30,[int]$r.data.poll_seconds))}
    }
    $r=Invoke-SPApi $cfg.apiUrl $cfg.token @{action='claim'}
    $RP.lastPollAt=(Get-Date).ToUniversalTime().ToString('o')
    if($r.status -eq 401){$RP.lastError='SP-Manager did not accept this print PC (HTTP 401). It keeps the pairing and tries again every minute; if this stays, pair it again in Settings > Hardware.';Write-SPRemoteLog ('401 from SP-Manager ('+$(if($r.data.error){$r.data.error}else{'no message'})+'). Pairing kept; retrying in 60 s.');$lastBeat=[datetime]::MinValue;for($i=0;$i -lt 240 -and -not $RP.stop -and $cfgVersion -eq $RP.configVersion;$i++){Start-Sleep -Milliseconds 250};continue}
    if($r.status -ne 200){throw ('Job check failed: '+$(if($r.data.error){$r.data.error}else{'HTTP '+$r.status}))}
    if($lastLogged){Write-SPRemoteLog 'Connected to SP-Manager again.';$lastLogged=''}
    $RP.lastError=''
    $job=$r.data.job
    if($job){
      $status='PRINTED';$err=''
      try{$null=Invoke-SPApi $cfg.apiUrl $cfg.token @{action='progress';job_id=[int]$job.id;status='PRINTING'}}catch{}
      try{$name='SP-Manager '+$(if($job.document_no){$job.document_no}else{'job '+$job.id});$null=Invoke-SPRemotePrintJob ([string]$job.html) ([string]$job.printer) ([string]$job.paper_size) ([int]$job.copies) $name}catch{$status='FAILED';$err=$_.Exception.Message}
      $RP.lastJob=@{id=[int]$job.id;documentNo=[string]$job.document_no;printer=[string]$job.printer;paperSize=[string]$job.paper_size;status=$status;error=$err;at=(Get-Date).ToUniversalTime().ToString('o')}
      if($status -eq 'PRINTED'){$RP.jobsPrinted++}else{$RP.jobsFailed++}
      $null=Invoke-SPApi $cfg.apiUrl $cfg.token @{action='report';job_id=[int]$job.id;status=$status;error=$err}
      $sleep=0
    }
  }catch{$RP.lastError=$_.Exception.Message;$pendingErr=$RP.lastError;$sleep=15;if($RP.lastError -ne $lastLogged){Write-SPRemoteLog ('Error: '+$RP.lastError);$lastLogged=$RP.lastError}}
  if($sleep -gt 0){for($i=0;$i -lt $sleep*4 -and -not $RP.stop -and $cfgVersion -eq $RP.configVersion;$i++){Start-Sleep -Milliseconds 250}}
}
$RP.running=$false
'@
function Start-SPRemoteWorker{
  if($script:RPShell -and $script:RPShell.InvocationStateInfo.State -eq 'Running'){return}
  try{if($script:RPShell){$script:RPShell.Dispose()}}catch{}
  $rs=[runspacefactory]::CreateRunspace();$rs.ApartmentState='STA';$rs.Open()
  $rs.SessionStateProxy.SetVariable('RP',$script:RP);$rs.SessionStateProxy.SetVariable('ConfigPath',$RemotePrintConfigPath);$rs.SessionStateProxy.SetVariable('AgentVersion',$AgentVersion)
  $ps=[powershell]::Create();$ps.Runspace=$rs;[void]$ps.AddScript($SPRemotePrintCore+"`n"+$SPRemotePrintWorker)
  $script:RPShell=$ps;$script:RPHandle=$ps.BeginInvoke()
}
# The main thread uses the same core (status, pairing, test page); the worker runspace loads its own copy.
. ([scriptblock]::Create($SPRemotePrintCore))
function Import-SPRemotePrintCore{}
function Get-SPRemoteStatus{
  Start-SPRemoteWorker
  Import-SPRemotePrintCore
  $c=Read-SPRemoteConfig $RemotePrintConfigPath
  $state=if($script:RPShell){[string]$script:RPShell.InvocationStateInfo.State}else{'NotStarted'}
  $printers=@($script:RP.printers);if(-not $printers.Count){try{$printers=@(Get-SPPrinters);$script:RP.printers=$printers}catch{}}
  @{ok=$true;version=$AgentVersion;paired=[bool]($c -and $c.token);enabled=[bool]($c -and $c.enabled);agentId=$(if($c){$c.agentId}else{0});agentName=$(if($c){$c.agentName}else{''});outletId=$(if($c){$c.outletId}else{0});apiUrl=$(if($c){$c.apiUrl}else{''});pairedAt=$(if($c){$c.pairedAt}else{''});machineName=$env:COMPUTERNAME;worker=$state;lastPollAt=$script:RP.lastPollAt;lastHeartbeatAt=$script:RP.lastHeartbeatAt;lastError=$script:RP.lastError;lastJob=$script:RP.lastJob;jobsPrinted=$script:RP.jobsPrinted;jobsFailed=$script:RP.jobsFailed;printers=$printers}
}
function Save-SPRemoteConfig($cfg){
  Add-Type -AssemblyName System.Security
  $protected=[Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect([Text.Encoding]::UTF8.GetBytes([string]$cfg.token),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))
  $out=[ordered]@{apiUrl=$cfg.apiUrl;token=$protected;agentId=$cfg.agentId;agentName=$cfg.agentName;outletId=$cfg.outletId;enabled=$cfg.enabled;pairedAt=$cfg.pairedAt}
  [IO.File]::WriteAllText($RemotePrintConfigPath,($out|ConvertTo-Json -Compress),(New-Object Text.UTF8Encoding($false)))
  $script:RP.configVersion++
}
function Invoke-SPRemotePair($b){
  Import-SPRemotePrintCore
  $code=([string]$b.pairingCode).Trim();$api=([string]$b.apiUrl).Trim()
  if($code -notmatch '^[A-Za-z0-9-]{10,11}$'){throw 'Enter the pairing code from Settings > Hardware.'}
  $u=$null;if(-not [Uri]::TryCreate($api,[UriKind]::Absolute,[ref]$u)){throw 'Invalid SP-Manager API address.'}
  if($u.Scheme -ne 'https' -or $RemotePrintApiHosts -notcontains $u.Host -or $u.AbsolutePath -notmatch '/print-agent\.php$'){throw 'This SP-Manager API address is not allowed for this agent.'}
  $printers=@(Get-SPPrinters);$script:RP.printers=$printers
  $r=Invoke-SPApi $u.AbsoluteUri '' @{action='pair';pairing_code=$code;machine_name=$env:COMPUTERNAME;agent_version=$AgentVersion;printers=$printers}
  if($r.status -ne 200 -or -not $r.data.agent_token){throw $(if($r.data.error){[string]$r.data.error}else{'Pairing failed (HTTP '+$r.status+').'})}
  Save-SPRemoteConfig ([pscustomobject]@{apiUrl=$u.AbsoluteUri;token=[string]$r.data.agent_token;agentId=[int]$r.data.agent_id;agentName=[string]$r.data.agent_name;outletId=[int]$r.data.outlet_id;enabled=$true;pairedAt=(Get-Date).ToUniversalTime().ToString('o')})
  $script:RP.lastError='';Start-SPRemoteWorker
  @{ok=$true;agentId=[int]$r.data.agent_id;agentName=[string]$r.data.agent_name}
}
function Get-SPTestPageHtml([string]$paper,[string]$printer){
  $w=if($paper -eq 'A5'){148}else{210};$h=if($paper -eq 'A5'){210}else{297}
  $p=[Net.WebUtility]::HtmlEncode($printer);$t=(Get-Date).ToString('dd/MM/yyyy HH:mm')
  "<!doctype html><html><head><meta charset=`"utf-8`"><style>@page{size:$paper portrait;margin:0}html,body{margin:0}body{font-family:Arial,sans-serif;color:#111}.sheet{box-sizing:border-box;width:${w}mm;height:${h}mm;padding:10mm;position:relative}.frame{position:absolute;inset:10mm;border:0.4mm solid #111}.mark{position:absolute;font-size:3mm;color:#444}h1{margin:6mm 0 2mm;font-size:7mm}p{margin:1.5mm 0;font-size:3.6mm}.ruler{position:absolute;left:20mm;bottom:22mm;display:flex}.ruler i{display:block;box-sizing:border-box;width:10mm;height:4mm;border:0.3mm solid #111;border-left-width:0}.ruler i:first-child{border-left-width:0.3mm}</style></head><body><div class=`"sheet`"><div class=`"frame`"></div><div style=`"position:relative;padding:4mm`"><h1>SP-Manager test page</h1><p><b>Paper:</b> $paper (${w} x ${h} mm)</p><p><b>Printer:</b> $p</p><p><b>PC:</b> $env:COMPUTERNAME</p><p><b>Printed:</b> $t</p><p>The frame is 10 mm from every edge of the sheet. The ruler below is 100 mm long with a mark every 10 mm.</p></div><div class=`"ruler`"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class=`"mark`" style=`"left:19mm;bottom:17mm`">0</div><div class=`"mark`" style=`"left:114mm;bottom:17mm`">100 mm</div></div></body></html>"
}
function Handle($req){
  $s=$req.stream
  try{
    $script:ResponseOrigin='';$hostHeader=[string]$req.headers['host'];if($hostHeader -ne "127.0.0.1:$Port" -and $hostHeader -ne "localhost:$Port"){Send-Json $s 403 @{ok=$false;error='Invalid Host'};return}
    $origin=[string]$req.headers['origin'];if($origin -and $origin -ne "http://127.0.0.1:$Port" -and $AllowedOrigins -notcontains $origin){Send-Json $s 403 @{ok=$false;error='Origin denied'};return};if($origin){$script:ResponseOrigin=$origin}
    $uri=[Uri]("http://127.0.0.1:$Port"+$req.path);$displayRead=$req.method -eq 'GET' -and $uri.AbsolutePath -in @('/customer-display','/display-state','/display-image')
    $displayAuthorized=$displayRead -and $uri.Query -eq ('?key='+$DisplayToken)
    if($req.method -ne 'OPTIONS' -and -not $displayAuthorized){$received=[string]$req.headers['authorization'];$expected='Bearer '+$AgentToken;$different=$received.Length -bxor $expected.Length;for($i=0;$i -lt $expected.Length;$i++){$char=if($i -lt $received.Length){[int][char]$received[$i]}else{0};$different=$different -bor ($char -bxor [int][char]$expected[$i])};if($different -ne 0){Send-Json $s 401 @{ok=$false;error='Pair this computer using the local agent token'};return}}
    $req.path=$uri.AbsolutePath
    if($req.method -eq 'OPTIONS'){Send-Json $s 204 @{};return}
    if($req.method -eq 'GET' -and ($req.path -eq '/' -or $req.path -eq '/status')){Send-Json $s 200 @{connected=$true;agentDetected=$true;agent='SP-Manager Local Agent';version=$AgentVersion;remotePrint=$true;port=$Port;host=$HostName;platform='win32';pid=$PID;startedAt=$StartedAt;uptimeSeconds=[int]((Get-Date)-[datetime]$StartedAt).TotalSeconds;autoStartInstalled=(Test-AutoStartInstalled)};return}
    if($req.method -eq 'POST' -and $req.path -eq '/install-autostart'){Install-AutoStart|Out-Null;Send-Json $s 200 @{ok=$true;autoStartInstalled=$true;message='Auto-start + auto-restart is installed.'};return}
    if($req.method -eq 'GET' -and $req.path -eq '/printers'){$ps=Get-Printer|Select-Object Name,PrinterStatus,WorkOffline;Send-Json $s 200 @{connected=$true;printers=@($ps)};return}
    if($req.path -eq '/email'){Send-Json $s 410 @{ok=$false;error='Use authenticated server email endpoint'};return}
    $b=if($req.body){$req.body|ConvertFrom-Json}else{[pscustomobject]@{}}
    if($req.method -eq 'POST' -and $req.path -eq '/price-tags/raw'){$printer=[string]$b.printer;if(!$printer){throw 'Printer is required'};$lang=[string]$b.language;if(@('ZPL','TSPL') -notcontains $lang.ToUpper()){throw 'Unsupported Price Tags printer language'};$data=[Text.Encoding]::UTF8.GetBytes([string]$b.data);$copies=[Math]::Max(1,[Math]::Min(10,[int]$b.copies));$all=New-Object Collections.Generic.List[byte];1..$copies|%{$all.AddRange($data)};[SPRawPrinter]::Send($printer,$all.ToArray());Send-Json $s 200 @{ok=$true;language=$lang.ToUpper()};return}
    if($req.method -eq 'POST' -and $req.path -eq '/print'){$printer=[string]$b.printer;if(!$printer){throw 'Printer is required'};$copies=[Math]::Max(1,[Math]::Min(10,[int]$b.copies));$txt=[string]$b.text;$data=[Text.Encoding]::UTF8.GetBytes($txt);$all=New-Object Collections.Generic.List[byte];1..$copies|%{$all.AddRange($data);$all.Add(10);$all.AddRange([byte[]](27,100,3))};[SPRawPrinter]::Send($printer,$all.ToArray());Send-Json $s 200 @{ok=$true};return}
    if($req.method -eq 'POST' -and $req.path -eq '/cash-drawer'){$printer=[string]$b.printer;if(!$printer){throw 'Cash drawer printer is required'};$bytes=@($b.bytes|%{[byte][int]$_});if(!$bytes.Count){$bytes=[byte[]](27,112,0,25,250)};[SPRawPrinter]::Send($printer,$bytes);Send-Json $s 200 @{ok=$true};return}
    if($req.method -eq 'POST' -and $req.path -eq '/email'){
      $smtpHost=[string]$b.host
      $smtpPort=[int]$b.port
      $ssl=($b.ssl -ne $false)
      $from=[string]$b.from
      $displayName=[string]$b.displayName
      $username=[string]$b.username
      $password=[string]$b.password
      $to=[string]$b.to
      $subject=[string]$b.subject
      $body=[string]$b.body
      $bcc=[string]$b.bcc
      $pdfPath=''
      $pdfName=[string]$b.pdfFileName
      if(!$pdfName){$pdfName='SP-Manager-Invoice.pdf'}
      if(!$smtpHost){throw 'SMTP host is required'}
      if(!$from){throw 'Sender email is required'}
      if(!$to){throw 'Customer email is required'}
      if(!$password){throw 'SMTP password is required'}
      try{
        if([string]$b.pdfHtml){
          $tmp=[IO.Path]::GetTempPath()
          $base='SP-Manager-'+[Guid]::NewGuid().ToString('N')
          $htmlPath=Join-Path $tmp ($base+'.html')
          $pdfPath=Join-Path $tmp ($base+'.pdf')
          [IO.File]::WriteAllText($htmlPath,[string]$b.pdfHtml,(New-Object Text.UTF8Encoding($false)))
          $edge=$null
          # PDF engine: prefer Edge, then Chrome/Chromium-family browsers.
          foreach($cmdName in @('msedge.exe','chrome.exe','brave.exe')){
            if(!$edge){
              $cmd=Get-Command $cmdName -ErrorAction SilentlyContinue
              if($cmd){$edge=$cmd.Source}
            }
          }
          if(!$edge){
            $candidates=@(
              "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
              "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe",
              "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe",
              "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
              "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe",
              "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
              "$env:ProgramFiles\BraveSoftware\Brave-Browser\Application\brave.exe",
              "$env:ProgramFiles(x86)\BraveSoftware\Brave-Browser\Application\brave.exe",
              "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\Application\brave.exe"
            )
            $edge=$candidates|Where-Object{Test-Path $_}|Select-Object -First 1
          }
          if(!$edge){throw 'A Chromium browser (Microsoft Edge, Google Chrome, or Brave) is required to create PDF attachments.'}
          $fileUrl='file:///'+($htmlPath -replace '\\','/')
          $pdfArg='--print-to-pdf='+$pdfPath
          $args=@('--headless','--disable-gpu','--no-pdf-header-footer',$pdfArg,$fileUrl)
          $proc=Start-Process -FilePath $edge -ArgumentList $args -PassThru -WindowStyle Hidden
          if(-not $proc.WaitForExit(20000)){Stop-Process -Id $proc.Id -Force;throw "PDF render timeout"}
          Start-Sleep -Milliseconds 500
          if(!(Test-Path $pdfPath)){throw 'PDF generation failed.'}
          try{Remove-Item -LiteralPath $htmlPath -Force -ErrorAction SilentlyContinue}catch{}
        }
        $mail=New-Object System.Net.Mail.MailMessage
        try{
          $senderName=if([string]::IsNullOrWhiteSpace($displayName)){$from}else{$displayName}
          $mail.From=New-Object System.Net.Mail.MailAddress($from,$senderName)
          $mail.To.Add($to)
          if($bcc){$bcc.Split(',')|ForEach-Object{if($_.Trim()){$mail.Bcc.Add($_.Trim())}}}
          if($pdfPath -and (Test-Path $pdfPath)){$mail.Attachments.Add($pdfPath)|Out-Null}
          $mail.Subject=$subject
          $mail.SubjectEncoding=[Text.Encoding]::UTF8
          $mail.BodyEncoding=[Text.Encoding]::UTF8
          $mail.IsBodyHtml=$true
          $mail.Body=$body
          $smtp=New-Object System.Net.Mail.SmtpClient($smtpHost,$smtpPort)
          try{
            $smtp.EnableSsl=$ssl
            $login=if([string]::IsNullOrWhiteSpace($username)){$from}else{$username}
            $smtp.Credentials=New-Object System.Net.NetworkCredential($login,$password)
            $smtp.Send($mail)
          }finally{$smtp.Dispose()}
        }finally{$mail.Dispose()}
        Send-Json $s 200 @{ok=$true;attachment=[bool]$pdfPath;attachmentName=$pdfName};return
      }finally{
        if($pdfPath){try{Remove-Item -LiteralPath $pdfPath -Force -ErrorAction SilentlyContinue}catch{}}
      }
    }
    if($req.method -eq 'GET' -and $req.path -eq '/display-image'){
      Send-Json $s 200 @{ok=$true;image=$script:DisplayIdleImage;version=$script:DisplayIdleVersion};return
    }
    if($req.method -eq 'GET' -and $req.path -eq '/display-state'){
      Send-Json $s 200 $script:DisplayState;return
    }
    if($req.method -eq 'POST' -and $req.path -eq '/display-state'){
      $idle=[string]$b.idleImage;if($idle -ne $script:DisplayIdleImage){$script:DisplayIdleImage=$idle;$script:DisplayIdleVersion++};$script:DisplayState=@{line1=[string]$b.line1;line2=[string]$b.line2;chars=[int]$b.chars;companyName=[string]$b.companyName;logo=[string]$b.logo;items=@($b.items);total=[double]$b.total;currency=[string]$b.currency;customerName=[string]$b.customerName;state=[string]$b.state;paymentMethod=[string]$b.paymentMethod;paymentImage=[string]$b.paymentImage;paymentAmount=[double]$b.paymentAmount;change=[double]$b.change;subtotal=[double]$b.subtotal;discount=[double]$b.discount;tax=[double]$b.tax;deposit=[double]$b.deposit;idleImageVersion=$script:DisplayIdleVersion;updatedAt=(Get-Date).ToUniversalTime().ToString('o')};Send-Json $s 200 @{ok=$true};return
    }
    if($req.method -eq 'GET' -and $req.path -eq '/customer-display'){
      $html=@'
<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SP-Manager | Customer Display</title><style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#0a0a0b;color:#f5f5f6;font-family:Inter,"Segoe UI",system-ui,Arial,sans-serif}
.cdx{position:fixed;inset:0;display:grid;grid-template-rows:auto minmax(0,1fr);background:radial-gradient(55% 60% at 100% 0%,rgba(225,29,42,.16),transparent 70%),#0a0a0b}
.cdx h1,.cdx p{margin:0}
.top{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:clamp(12px,2vh,22px) clamp(20px,3vw,48px);border-bottom:1px solid rgba(255,255,255,.08)}
.brand{display:flex;align-items:center;gap:14px;min-width:0;font-size:clamp(16px,2vw,26px);font-weight:700}
.brand span{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.brand img{height:clamp(30px,5vh,48px);max-width:150px;object-fit:contain;display:none}
.brand img.show{display:block}
.status{display:flex;align-items:center;gap:16px;color:#a1a1aa;font-size:clamp(14px,1.5vw,20px);font-variant-numeric:tabular-nums}
.main{display:grid;grid-template-columns:minmax(0,1fr);gap:clamp(20px,3vw,48px);min-height:0;padding:clamp(16px,3vh,36px) clamp(20px,3vw,48px)}
.cdx.has-media .main{grid-template-columns:minmax(0,5fr) minmax(0,6fr)}
.media{display:none;align-items:center;justify-content:center;min-width:0;min-height:0}
.cdx.has-media .media{display:flex}
.media img{display:block;min-width:0;min-height:0;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;border-radius:clamp(14px,1.6vw,24px);box-shadow:0 18px 50px rgba(0,0,0,.55)}
.cdx.paying .media img{padding:clamp(8px,1vw,14px);background:#fff}
.welcome{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:0;text-align:center}
.welcome .mark{display:flex;align-items:center;justify-content:center;margin-bottom:clamp(16px,3vh,32px)}
.welcome .mark img{max-width:min(420px,70%);max-height:26vh;object-fit:contain;display:none}
.welcome .mark img.show{display:block}
.welcome .mark span{font-size:clamp(60px,10vw,130px);font-weight:900;color:#ff2f38}
.welcome h1{font-size:clamp(36px,6vw,86px);font-weight:800;letter-spacing:-.02em}
.welcome p{margin-top:8px;color:#a1a1aa;font-size:clamp(16px,2vw,28px)}
.order{display:none;flex-direction:column;min-width:0;min-height:0;width:100%;max-width:1100px;margin:0 auto;padding:clamp(18px,2.4vw,34px);border:1px solid rgba(255,255,255,.09);border-radius:clamp(14px,1.6vw,24px);background:linear-gradient(180deg,#19191c,#111113)}
.cdx.has-order .order{display:flex}.cdx.has-order .welcome{display:none}
.order-head{display:flex;align-items:baseline;justify-content:space-between;gap:16px;padding-bottom:clamp(10px,1.6vh,18px)}
.order-head h1{font-size:clamp(24px,3.2vw,44px);font-weight:800}
.order-head span{color:#a1a1aa;font-size:clamp(14px,1.5vw,20px);white-space:nowrap}
.items{flex:1 1 auto;min-height:0;overflow:auto;border-top:1px solid rgba(255,255,255,.1);scrollbar-width:none}
.items::-webkit-scrollbar{display:none}
.item{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:clamp(10px,1.6vh,18px) 0;border-bottom:1px solid rgba(255,255,255,.07)}
.item-name{min-width:0}
.item-name b{display:block;font-size:clamp(16px,1.8vw,26px);font-weight:600;line-height:1.25;overflow-wrap:anywhere}
.item-name small{display:block;margin-top:3px;color:#a1a1aa;font-size:clamp(13px,1.2vw,18px)}
.item>strong{flex:none;font-size:clamp(16px,1.9vw,27px);font-weight:700;font-variant-numeric:tabular-nums}
.totals{flex:none;padding-top:clamp(10px,1.6vh,18px)}
.line{display:flex;justify-content:space-between;gap:16px;padding:3px 0;color:#c7c7cc;font-size:clamp(15px,1.5vw,22px);font-variant-numeric:tabular-nums}
.line b{font-weight:600;color:#f5f5f6}
.grand{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:clamp(6px,1vh,12px) 0;padding:clamp(12px,1.8vh,20px) clamp(16px,1.8vw,26px);border-radius:clamp(10px,1vw,16px);background:linear-gradient(90deg,#ff2f38,#b80d16);box-shadow:0 10px 30px rgba(225,29,42,.28)}
.grand span{font-size:clamp(18px,2vw,30px);font-weight:700}
.grand b{font-size:clamp(30px,4.4vw,64px);font-weight:800;line-height:1.05;font-variant-numeric:tabular-nums}
.change b{color:#4ade80;font-weight:800}
.hide{display:none!important}
@media (max-width:820px),(orientation:portrait){.cdx.has-media .main{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,42%) minmax(0,1fr)}}
</style></head><body><div id="cdx" class="cdx">
<div class="top"><div class="brand"><img id="logo" alt=""><span id="brand">Shining Pearl Tinted</span></div><div class="status"><span id="clock"></span></div></div>
<div class="main"><div class="media"><img id="media" alt=""></div>
<div class="welcome"><div class="mark"><img id="welcomeLogo" alt=""><span id="welcomeMark">SP</span></div><h1>Welcome</h1><p id="welcomeName">Shining Pearl Tinted</p></div>
<div class="order"><div class="order-head"><h1 id="orderTitle">Your Order</h1><span id="itemCount">0 items</span></div><div id="items" class="items"></div>
<div class="totals"><div id="subtotalRow" class="line hide"><span>Subtotal</span><b id="subtotal"></b></div><div id="discountRow" class="line hide"><span>Discount</span><b id="discount"></b></div><div id="taxRow" class="line hide"><span>Tax</span><b id="tax"></b></div><div id="totalRow" class="line hide"><span>Total</span><b id="totalSmall"></b></div><div id="depositRow" class="line hide"><span>Deposit</span><b id="deposit"></b></div>
<div class="grand"><span id="grandLabel">Total</span><b id="grand">RM 0.00</b></div><div id="paidRow" class="line hide"><span>Received</span><b id="paid"></b></div><div id="changeRow" class="line change hide"><span>Change</span><b id="change"></b></div></div></div>
</div></div><script>
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=(v,c)=>(c||'RM')+' '+Number(v||0).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2});
const show=(id,on)=>$(id).classList.toggle('hide',!on);
let idleVersion=-1,idleImage='',lastItems=0;
async function loadIdleImage(version){try{const r=await fetch('/display-image'+location.search,{cache:'no-store'});const d=await r.json();idleImage=String(d.image||'');idleVersion=version}catch(e){}}
function setImg(img,src){if(src){if(img.getAttribute('src')!==src)img.src=src;img.classList.add('show')}else{img.removeAttribute('src');img.classList.remove('show')}}
function render(d){
 const c=d.currency||'RM',company=d.companyName||'Shining Pearl Tinted',items=Array.isArray(d.items)?d.items:[];
 const hasOrder=items.length>0,paying=d.state==='PAYMENT'&&hasOrder;
 $('brand').textContent=company;$('welcomeName').textContent=company;
 setImg($('logo'),d.logo||'');setImg($('welcomeLogo'),d.logo||'');show('welcomeMark',!d.logo);
 const media=paying&&d.paymentImage?d.paymentImage:idleImage;
 const root=$('cdx');root.classList.toggle('has-order',hasOrder);root.classList.toggle('paying',paying&&Boolean(d.paymentImage));root.classList.toggle('has-media',Boolean(media));
 if(media){if($('media').getAttribute('src')!==media)$('media').src=media}else $('media').removeAttribute('src');
 if(!hasOrder){lastItems=0;return}
 $('orderTitle').textContent=paying?'Payment':'Your Order';
 const count=items.reduce((a,i)=>a+Number(i.qty||1),0);$('itemCount').textContent=count+(count===1?' item':' items');
 $('items').innerHTML=items.map(i=>{const q=Number(i.qty||1),p=Number(i.price||0);return `<div class="item"><div class="item-name"><b>${esc(i.name||'Product')}</b><small>${esc(q)} &times; ${money(p,c)}</small></div><strong>${money(p*q,c)}</strong></div>`}).join('');
 if(items.length!==lastItems){$('items').scrollTop=$('items').scrollHeight;lastItems=items.length}
 const discount=Number(d.discount||0),tax=Number(d.tax||0),deposit=Number(d.deposit||0),total=Number(d.total||0);
 show('subtotalRow',discount>0||tax>0);$('subtotal').textContent=money(d.subtotal,c);
 show('discountRow',discount>0);$('discount').textContent='-'+money(discount,c);
 show('taxRow',tax>0);$('tax').textContent=money(tax,c);
 show('totalRow',deposit>0);$('totalSmall').textContent=money(total,c);
 show('depositRow',deposit>0);$('deposit').textContent='-'+money(deposit,c);
 const due=Math.max(0,total-deposit);$('grandLabel').textContent=deposit>0?'Balance':'Total';$('grand').textContent=money(due,c);
 const paid=Number(d.paymentAmount||0),change=Number(d.change||0);
 show('paidRow',paying&&paid>0&&Math.abs(paid-due)>0.005);$('paid').textContent=money(paid,c);
 show('changeRow',paying&&change>0);$('change').textContent=money(change,c);
}
async function tick(){try{const r=await fetch('/display-state'+location.search,{cache:'no-store'});const d=await r.json();const v=Number(d.idleImageVersion||0);if(v!==idleVersion)await loadIdleImage(v);render(d)}catch(e){}}
function clock(){$('clock').textContent=new Date().toLocaleTimeString('en-MY',{hour:'2-digit',minute:'2-digit'})}
clock();setInterval(clock,15000);tick();setInterval(tick,400);
</script></body></html>
'@
      Send-Text $s 200 $html 'text/html; charset=utf-8';return
    }
    if($req.method -eq 'GET' -and $req.path -eq '/display-monitors'){
      Add-Type -AssemblyName System.Windows.Forms
      $screens=[System.Windows.Forms.Screen]::AllScreens
      $items=@($screens)|ForEach-Object{
        [pscustomobject]@{index=[array]::IndexOf($screens,$_);primary=$_.Primary;x=$_.Bounds.X;y=$_.Bounds.Y;width=$_.Bounds.Width;height=$_.Bounds.Height;device=$_.DeviceName}
      }
      Send-Json $s 200 @{ok=$true;monitors=$items};return
    }
    if($req.method -eq 'POST' -and $req.path -eq '/display-window'){Send-Json $s 200 (Open-SPDisplayWindow $b);return}
    if($req.method -eq 'POST' -and $req.path -eq '/display'){$chars=[Math]::Max(8,[Math]::Min(80,[int]$b.chars));$line1=([string]$b.line1).PadRight($chars).Substring(0,$chars);$line2=([string]$b.line2).PadRight($chars).Substring(0,$chars);$script:DisplayState=@{line1=$line1;line2=$line2;chars=$chars;companyName=[string]$b.companyName;logo=[string]$b.logo;items=@($b.items);total=[double]$b.total;currency=([string]$b.currency);customerName=[string]$b.customerName;updatedAt=(Get-Date).ToUniversalTime().ToString('o')};$portName=[string]$b.port;if(!$portName){throw 'COM port is required'};$chars=[Math]::Max(8,[Math]::Min(80,[int]$b.chars));$baud=[int]$b.baud;if(!$baud){$baud=9600};$sp=New-Object IO.Ports.SerialPort($portName,$baud,'None',8,'One');$sp.ReadTimeout=5000;$sp.WriteTimeout=5000;$sp.Open();$line1=([string]$b.line1).PadRight($chars).Substring(0,$chars);$line2=([string]$b.line2).PadRight($chars).Substring(0,$chars);$sp.Write([char]12);$sp.Write($line1+$line2);$sp.Close();Send-Json $s 200 @{ok=$true};return}
    if($req.path -like '/remote-print/*'){
      if($req.method -eq 'GET' -and $req.path -eq '/remote-print/status'){Send-Json $s 200 (Get-SPRemoteStatus);return}
      if($req.method -eq 'POST' -and $req.path -eq '/remote-print/pair'){Send-Json $s 200 (Invoke-SPRemotePair $b);return}
      if($req.method -eq 'POST' -and $req.path -eq '/remote-print/unpair'){Import-SPRemotePrintCore;$c=Read-SPRemoteConfig $RemotePrintConfigPath;if($c -and $c.token){try{$null=Invoke-SPApi $c.apiUrl $c.token @{action='unpair'}}catch{}};Remove-Item -LiteralPath $RemotePrintConfigPath -Force -ErrorAction SilentlyContinue;$script:RP.configVersion++;$script:RP.lastError='';Send-Json $s 200 @{ok=$true};return}
      if($req.method -eq 'POST' -and $req.path -eq '/remote-print/enabled'){Import-SPRemotePrintCore;$c=Read-SPRemoteConfig $RemotePrintConfigPath;if(-not $c -or -not $c.token){throw 'This PC is not paired for remote printing.'};$c.enabled=($b.enabled -eq $true);Save-SPRemoteConfig $c;Send-Json $s 200 @{ok=$true;enabled=$c.enabled};return}
      if($req.method -eq 'POST' -and $req.path -eq '/remote-print/test'){Import-SPRemotePrintCore;$printer=[string]$b.printer;$paper=([string]$b.paperSize).ToUpper();if(!$printer){throw 'Choose a printer.'};$n=Invoke-SPRemotePrintJob (Get-SPTestPageHtml $paper $printer) $printer $paper 1 ('SP-Manager test page '+$paper);Send-Json $s 200 @{ok=$true;pages=$n;message="Test page sent to $printer ($paper)."};return}
    }
    Send-Json $s 404 @{ok=$false;error='Not found'}
  }catch{Send-Json $s 500 @{ok=$false;error=$_.Exception.Message}}
}
try{Start-SPRemoteWorker}catch{}
$listener=New-Object Net.Sockets.TcpListener([Net.IPAddress]::Parse($HostName),$Port);$listener.Start()
while($true){$client=$listener.AcceptTcpClient();try{$req=Read-Request $client;Handle $req}catch{try{Send-Text $client.GetStream() 500 $_.Exception.Message}catch{}}finally{$client.Close()}}
