$ErrorActionPreference='Stop'
$Port=18765
$HostName='127.0.0.1'
$StartedAt=(Get-Date).ToUniversalTime().ToString('o')
$script:DisplayState=@{line1='WELCOME!';line2='';chars=20;updatedAt=$StartedAt}
function Send-Bytes($stream,[int]$status,[string]$contentType,[byte[]]$bytes,[string]$disposition=''){
  $reason=if($status -eq 200){'OK'}elseif($status -eq 204){'No Content'}else{'Error'}
  $extra=if($disposition){"Content-Disposition: $disposition`r`n"}else{''}
  $hdr="HTTP/1.1 $status $reason`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-store`r`nAccess-Control-Allow-Origin: *`r`nAccess-Control-Allow-Headers: Content-Type`r`nAccess-Control-Allow-Methods: GET,POST,OPTIONS`r`nConnection: close`r`n$extra`r`n"
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
    if($req.method -eq 'GET' -and ($req.path -eq '/' -or $req.path -eq '/status')){Send-Json $s 200 @{connected=$true;agentDetected=$true;agent='SP-Manager Local Agent';version='1.1.5';port=$Port;host=$HostName;platform='win32';pid=$PID;startedAt=$StartedAt;uptimeSeconds=[int]((Get-Date)-[datetime]$StartedAt).TotalSeconds};return}
    if($req.method -eq 'GET' -and $req.path -eq '/printers'){$ps=Get-Printer|Select-Object Name,PrinterStatus,WorkOffline;Send-Json $s 200 @{connected=$true;printers=@($ps)};return}
    $b=if($req.body){$req.body|ConvertFrom-Json}else{[pscustomobject]@{}}
    if($req.method -eq 'POST' -and $req.path -eq '/price-tags/raw'){$printer=[string]$b.printer;if(!$printer){throw 'Printer is required'};$lang=[string]$b.language;if(@('ZPL','TSPL') -notcontains $lang.ToUpper()){throw 'Unsupported Price Tags printer language'};$data=[Text.Encoding]::UTF8.GetBytes([string]$b.data);$copies=[Math]::Max(1,[int]$b.copies);$all=New-Object Collections.Generic.List[byte];1..$copies|%{$all.AddRange($data)};[SPRawPrinter]::Send($printer,$all.ToArray());Send-Json $s 200 @{ok=$true;language=$lang.ToUpper()};return}
    if($req.method -eq 'POST' -and $req.path -eq '/print'){$printer=[string]$b.printer;if(!$printer){throw 'Printer is required'};$copies=[Math]::Max(1,[int]$b.copies);$txt=[string]$b.text;$data=[Text.Encoding]::UTF8.GetBytes($txt);$all=New-Object Collections.Generic.List[byte];1..$copies|%{$all.AddRange($data);$all.Add(10);$all.AddRange([byte[]](27,100,3))};[SPRawPrinter]::Send($printer,$all.ToArray());Send-Json $s 200 @{ok=$true};return}
    if($req.method -eq 'POST' -and $req.path -eq '/cash-drawer'){$printer=[string]$b.printer;if(!$printer){throw 'Cash drawer printer is required'};$bytes=@($b.bytes|%{[byte][int]$_});if(!$bytes.Count){$bytes=[byte[]](27,112,0,25,250)};[SPRawPrinter]::Send($printer,$bytes);Send-Json $s 200 @{ok=$true};return}
    if($req.method -eq 'GET' -and $req.path -eq '/display-state'){
      Send-Json $s 200 $script:DisplayState;return
    }
    if($req.method -eq 'GET' -and $req.path -eq '/customer-display'){
      $html=@'
<!doctype html><html><head><meta charset="utf-8"><title>SP-Manager Customer Display</title>
<style>html,body{margin:0;width:100%;height:100%;background:#05080c;color:#fff;font-family:Segoe UI,Arial,sans-serif;overflow:hidden}body{display:flex;flex-direction:column;justify-content:center;padding:4vw;box-sizing:border-box}.line1{font-size:clamp(24px,5vw,72px);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.line2{margin-top:3vh;font-size:clamp(28px,6vw,90px);font-weight:800;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.brand{position:fixed;left:24px;top:18px;font-size:12px;letter-spacing:.18em;opacity:.55}</style></head>
<body><div class="brand">SP-MANAGER</div><div class="line1" id="l1">WELCOME!</div><div class="line2" id="l2"></div>
<script>async function tick(){try{const r=await fetch('/display-state',{cache:'no-store'});const d=await r.json();document.getElementById('l1').textContent=d.line1||'';document.getElementById('l2').textContent=d.line2||''}catch(e){}}tick();setInterval(tick,400)</script></body></html>
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
    if($req.method -eq 'POST' -and $req.path -eq '/display-window'){
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class SPDisplayWindow {
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
}
'@
      $screens=[System.Windows.Forms.Screen]::AllScreens
      if($screens.Count -lt 2){throw 'No secondary monitor detected. Windows must be set to Extend displays.'}
      $screen=@($screens|Where-Object{$_.Primary -eq $false}|Select-Object -First 1)[0]
      if($null -eq $screen){$screen=$screens[1]}
      $browser=$null
      foreach($cmd in @('msedge.exe','chrome.exe')){
        if(-not $browser){$browser=(Get-Command $cmd -ErrorAction SilentlyContinue).Source}
      }
      if(-not $browser){
        $candidates=@(
          "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
          "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe",
          "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe",
          "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
          "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe",
          "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
        )
        $browser=$candidates|Where-Object{Test-Path $_}|Select-Object -First 1
      }
      if(-not $browser){throw 'Microsoft Edge or Google Chrome was not found on this Windows PC.'}
      $chars=[Math]::Max(8,[int]$b.chars);$line1=([string]$b.line1).PadRight($chars).Substring(0,$chars);$line2=([string]$b.line2).PadRight($chars).Substring(0,$chars);$script:DisplayState=@{line1=$line1;line2=$line2;chars=$chars;updatedAt=(Get-Date).ToUniversalTime().ToString('o')}
      $url="http://127.0.0.1:$Port/customer-display"
      $args=@("--app=$url","--new-window","--window-position=$($screen.Bounds.X),$($screen.Bounds.Y)","--window-size=$($screen.Bounds.Width),$($screen.Bounds.Height)",'--disable-session-crashed-bubble')
      $started=Start-Process -FilePath $browser -ArgumentList $args -PassThru
      Start-Sleep -Milliseconds 1800
      $hwnd=[IntPtr]::Zero
      for($i=0;$i -lt 20 -and $hwnd -eq [IntPtr]::Zero;$i++){
        try{
          $started.Refresh()
          $rawHandle=$started.MainWindowHandle
          if($null -ne $rawHandle -and [string]$rawHandle -ne ''){
            try{$hwnd=[IntPtr]::new([long]$rawHandle)}catch{$hwnd=[IntPtr]::Zero}
          }
        }catch{}
        if($hwnd -eq [IntPtr]::Zero){
          $name=[IO.Path]::GetFileNameWithoutExtension($browser)
          $candidate=Get-Process -Name $name -ErrorAction SilentlyContinue|Where-Object{$_.MainWindowHandle -ne 0}|Sort-Object StartTime -Descending|Select-Object -First 1
          if($candidate){
            try{
              $rawCandidate=$candidate.MainWindowHandle
              if($null -ne $rawCandidate -and [string]$rawCandidate -ne ''){$hwnd=[IntPtr]::new([long]$rawCandidate)}
            }catch{$hwnd=[IntPtr]::Zero}
          }
        }
        if($hwnd -eq [IntPtr]::Zero){Start-Sleep -Milliseconds 300}
      }
      if($hwnd -eq [IntPtr]::Zero){throw 'Customer display browser started, but Windows did not return a usable window handle.'}
      [SPDisplayWindow]::ShowWindowAsync([IntPtr]$hwnd,3)|Out-Null
      [SPDisplayWindow]::SetWindowPos([IntPtr]$hwnd,[IntPtr]::Zero,$screen.Bounds.X,$screen.Bounds.Y,$screen.Bounds.Width,$screen.Bounds.Height,0x0040)|Out-Null
      Send-Json $s 200 @{ok=$true;mode='secondary';details=@{monitor=$screen.DeviceName;x=$screen.Bounds.X;y=$screen.Bounds.Y;width=$screen.Bounds.Width;height=$screen.Bounds.Height;windowFound=$true;browser=$browser}};return
    }
    if($req.method -eq 'POST' -and $req.path -eq '/display'){$chars=[Math]::Max(8,[int]$b.chars);$line1=([string]$b.line1).PadRight($chars).Substring(0,$chars);$line2=([string]$b.line2).PadRight($chars).Substring(0,$chars);$script:DisplayState=@{line1=$line1;line2=$line2;chars=$chars;updatedAt=(Get-Date).ToUniversalTime().ToString('o')};$portName=[string]$b.port;if(!$portName){throw 'COM port is required'};$chars=[Math]::Max(8,[int]$b.chars);$baud=[int]$b.baud;if(!$baud){$baud=9600};$sp=New-Object IO.Ports.SerialPort($portName,$baud,'None',8,'One');$sp.Open();$line1=([string]$b.line1).PadRight($chars).Substring(0,$chars);$line2=([string]$b.line2).PadRight($chars).Substring(0,$chars);$sp.Write([char]12);$sp.Write($line1+$line2);$sp.Close();Send-Json $s 200 @{ok=$true};return}
    Send-Json $s 404 @{ok=$false;error='Not found'}
  }catch{Send-Json $s 500 @{ok=$false;error=$_.Exception.Message}}
}
$listener=New-Object Net.Sockets.TcpListener([Net.IPAddress]::Parse($HostName),$Port);$listener.Start()
while($true){$client=$listener.AcceptTcpClient();try{$req=Read-Request $client;Handle $req}catch{try{Send-Text $client.GetStream() 500 $_.Exception.Message}catch{}}finally{$client.Close()}}
