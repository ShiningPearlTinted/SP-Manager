$ErrorActionPreference='Stop'
$Port=18765
$HostName='127.0.0.1'
$StartedAt=(Get-Date).ToUniversalTime().ToString('o')
$AgentDir=Split-Path -Parent $MyInvocation.MyCommand.Path
$PowerShell=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
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
function Test-AutoStartInstalled {
  try {
    $task = Get-ScheduledTask -TaskName 'SP-Manager Local Agent Watchdog' -ErrorAction Stop
    return ($task.State -ne 'Disabled')
  } catch {
    try {
      $q = & schtasks.exe /Query /TN 'SP-Manager Local Agent Watchdog' /FO CSV /NH 2>$null
      return ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace(($q -join '')))
    } catch { return $false }
  }
}
function Install-AutoStart {
  $watchdog=Join-Path $AgentDir 'watchdog.ps1'
  if(-not (Test-Path $watchdog)){ throw 'watchdog.ps1 was not found.' }
  $taskName='SP-Manager Local Agent Watchdog'
  try {
    $action = New-ScheduledTaskAction -Execute $PowerShell -Argument ('-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $watchdog + '"')
    $principalUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $principalUser
    $principal = New-ScheduledTaskPrincipal -UserId $principalUser -LogonType Interactive -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Keeps the SP-Manager Local Agent running and restarts it if it stops.' -Force | Out-Null
  } catch {
    # Fallback to schtasks without embedded-quote parsing problems by using a generated launcher BAT.
    $launcher=Join-Path $AgentDir 'run-watchdog.bat'
    $launcherText='@echo off' + "`r`n" + '"' + $PowerShell + '" -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $watchdog + '"' + "`r`n"
    [IO.File]::WriteAllText($launcher,$launcherText,(New-Object Text.UTF8Encoding($false)))
    & schtasks.exe /Delete /TN $taskName /F 2>$null | Out-Null
    & schtasks.exe /Create /TN $taskName /SC ONLOGON /TR $launcher /RU $env:USERNAME /RL LIMITED /F 2>&1 | Out-Null
    if($LASTEXITCODE -ne 0){ throw ('Windows could not register the Local Agent auto-start task. '+$_.Exception.Message) }
  }
  if(-not (Test-AutoStartInstalled)){ throw 'Windows task was not created or is disabled.' }
  try {
    $flagDir=Join-Path $env:ProgramData 'SP-Manager'
    if(-not (Test-Path $flagDir)){New-Item -ItemType Directory -Path $flagDir -Force | Out-Null}
    'SP-Manager Local Agent Auto-Start installed' | Set-Content -LiteralPath (Join-Path $flagDir 'agent-autostart.flag') -Encoding UTF8
  } catch {}
  return $true
}
function Handle($req){
  $s=$req.stream
  try{
    if($req.method -eq 'OPTIONS'){Send-Json $s 204 @{};return}
    if($req.method -eq 'GET' -and ($req.path -eq '/' -or $req.path -eq '/status')){Send-Json $s 200 @{connected=$true;agentDetected=$true;agent='SP-Manager Local Agent';version='1.1.10';port=$Port;host=$HostName;platform='win32';pid=$PID;startedAt=$StartedAt;uptimeSeconds=[int]((Get-Date)-[datetime]$StartedAt).TotalSeconds;autoStartInstalled=(Test-AutoStartInstalled)};return}
    if($req.method -eq 'POST' -and $req.path -eq '/install-autostart'){Install-AutoStart|Out-Null;Send-Json $s 200 @{ok=$true;autoStartInstalled=$true;message='Auto-start + auto-restart is installed.'};return}
    if($req.method -eq 'GET' -and $req.path -eq '/printers'){$ps=Get-Printer|Select-Object Name,PrinterStatus,WorkOffline;Send-Json $s 200 @{connected=$true;printers=@($ps)};return}
    $b=if($req.body){$req.body|ConvertFrom-Json}else{[pscustomobject]@{}}
    if($req.method -eq 'POST' -and $req.path -eq '/price-tags/raw'){$printer=[string]$b.printer;if(!$printer){throw 'Printer is required'};$lang=[string]$b.language;if(@('ZPL','TSPL') -notcontains $lang.ToUpper()){throw 'Unsupported Price Tags printer language'};$data=[Text.Encoding]::UTF8.GetBytes([string]$b.data);$copies=[Math]::Max(1,[int]$b.copies);$all=New-Object Collections.Generic.List[byte];1..$copies|%{$all.AddRange($data)};[SPRawPrinter]::Send($printer,$all.ToArray());Send-Json $s 200 @{ok=$true;language=$lang.ToUpper()};return}
    if($req.method -eq 'POST' -and $req.path -eq '/print'){$printer=[string]$b.printer;if(!$printer){throw 'Printer is required'};$copies=[Math]::Max(1,[int]$b.copies);$txt=[string]$b.text;$data=[Text.Encoding]::UTF8.GetBytes($txt);$all=New-Object Collections.Generic.List[byte];1..$copies|%{$all.AddRange($data);$all.Add(10);$all.AddRange([byte[]](27,100,3))};[SPRawPrinter]::Send($printer,$all.ToArray());Send-Json $s 200 @{ok=$true};return}
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
          $proc=Start-Process -FilePath $edge -ArgumentList $args -Wait -PassThru -WindowStyle Hidden
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
    if($req.method -eq 'GET' -and $req.path -eq '/display-state'){
      Send-Json $s 200 $script:DisplayState;return
    }
    if($req.method -eq 'GET' -and $req.path -eq '/customer-display'){
      $html=@'
<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SP-Manager Customer Display</title><style>
:root{--gold:#d6b36a;--gold2:#f4d58c;--red:#c1121f;--bg:#07090d;--panel:rgba(255,255,255,.055);--line:rgba(255,255,255,.1);--muted:#9aa3b2}*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:radial-gradient(circle at 15% 10%,rgba(193,18,31,.18),transparent 30%),radial-gradient(circle at 85% 90%,rgba(214,179,106,.12),transparent 32%),var(--bg);color:#fff;font-family:Segoe UI,Arial,sans-serif}body{display:flex;align-items:center;justify-content:center;padding:clamp(28px,5vw,80px)}.shell{width:min(1500px,100%);height:min(88vh,900px);display:flex;flex-direction:column;position:relative}.top{display:flex;align-items:center;gap:22px;padding:10px 4px 28px;border-bottom:1px solid var(--line)}.logo{width:74px;height:74px;border-radius:18px;object-fit:contain;background:#fff;padding:7px;display:none;box-shadow:0 10px 35px rgba(0,0,0,.35)}.logo.show{display:block}.fallback{width:74px;height:74px;border-radius:18px;background:linear-gradient(145deg,#171b25,#090b10);border:1px solid rgba(214,179,106,.5);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:var(--gold2);letter-spacing:-2px}.brand{font-size:clamp(15px,1.5vw,22px);font-weight:800;letter-spacing:.16em;text-transform:uppercase}.sub{margin-top:6px;color:var(--muted);font-size:clamp(11px,1vw,15px);letter-spacing:.08em}.main{flex:1;display:flex;align-items:center;justify-content:center}.welcome{text-align:center}.welcome .eyebrow{color:var(--gold2);font-size:clamp(13px,1.3vw,19px);font-weight:700;letter-spacing:.22em;text-transform:uppercase}.welcome h1{font-size:clamp(54px,8vw,128px);line-height:.95;margin:22px 0 12px;font-weight:900;letter-spacing:-.04em}.welcome p{margin:0;color:var(--muted);font-size:clamp(15px,1.5vw,24px)}.sale{width:100%;max-width:1250px;background:linear-gradient(145deg,rgba(255,255,255,.075),rgba(255,255,255,.025));border:1px solid var(--line);border-radius:30px;padding:clamp(28px,4vw,55px);box-shadow:0 30px 90px rgba(0,0,0,.35);backdrop-filter:blur(16px)}.sale-head{display:flex;justify-content:space-between;align-items:flex-start;gap:30px;margin-bottom:26px}.sale-title{font-size:clamp(28px,3.5vw,58px);font-weight:850;line-height:1.05}.sale-label{color:var(--gold2);font-size:clamp(12px,1.1vw,17px);font-weight:700;letter-spacing:.15em;text-transform:uppercase;margin-bottom:8px}.items{display:flex;flex-direction:column;gap:10px;max-height:42vh;overflow:hidden}.item{display:grid;grid-template-columns:1fr auto auto;gap:25px;align-items:center;padding:17px 0;border-bottom:1px solid rgba(255,255,255,.08)}.item-name{font-size:clamp(18px,1.8vw,29px);font-weight:650}.qty{color:var(--muted);font-size:clamp(14px,1.3vw,20px)}.price{font-size:clamp(18px,1.8vw,29px);font-weight:750}.total-row{display:flex;align-items:flex-end;justify-content:space-between;gap:30px;margin-top:28px;padding-top:25px;border-top:1px solid rgba(214,179,106,.35)}.total-label{color:var(--muted);font-size:clamp(14px,1.2vw,19px);text-transform:uppercase;letter-spacing:.14em}.total{font-size:clamp(44px,6vw,92px);line-height:.9;font-weight:950;letter-spacing:-.045em;color:#fff}.footer{display:flex;justify-content:space-between;color:#697386;font-size:12px;letter-spacing:.08em;text-transform:uppercase;padding-top:20px}.accent{color:var(--gold2)}@media(max-width:700px){.top{padding-bottom:18px}.logo,.fallback{width:52px;height:52px}.fallback{font-size:21px}.sale{border-radius:20px;padding:22px}.item{grid-template-columns:1fr auto;gap:10px}.price{grid-column:2}.qty{grid-column:1}.sale-head{margin-bottom:12px}.total-row{flex-direction:column;align-items:flex-start}.total{font-size:58px}}
</style></head><body><div class="shell"><header class="top"><img id="logo" class="logo" alt="Company logo"><div id="fallback" class="fallback">SP</div><div><div id="brand" class="brand">SHINING PEARL TINTED</div><div class="sub">Customer Display</div></div></header><main class="main"><section id="welcome" class="welcome"><div class="eyebrow">Welcome</div><h1 id="welcomeTitle">WELCOME!</h1><p id="welcomeText">Thank you for visiting <span class="accent">Shining Pearl Tinted</span></p></section><section id="sale" class="sale" style="display:none"><div class="sale-head"><div><div class="sale-label">Your order</div><div id="saleTitle" class="sale-title">Thank you for your purchase</div></div></div><div id="items" class="items"></div><div class="total-row"><div class="total-label">Total</div><div id="total" class="total">RM 0.00</div></div></section></main><footer class="footer"><span>SP-MANAGER</span><span id="status">Ready</span></footer></div><script>
const $=id=>document.getElementById(id);function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}function money(v,c='RM'){return c+' '+Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}function render(d){const logo=$('logo'),fb=$('fallback');if(d.logo){logo.src=d.logo;logo.classList.add('show');fb.style.display='none'}else{logo.classList.remove('show');fb.style.display='flex'}$('brand').textContent=d.companyName||'SHINING PEARL TINTED';const items=Array.isArray(d.items)?d.items:[];if(items.length){$('welcome').style.display='none';$('sale').style.display='block';$('saleTitle').textContent=d.customerName?('Thank you, '+d.customerName):'Your order';$('items').innerHTML=items.map(i=>`<div class="item"><div class="item-name">${esc(i.name||'Item')}</div><div class="qty">× ${esc(i.qty||1)}</div><div class="price">${money((Number(i.price)||0)*(Number(i.qty)||1),d.currency||'RM')}</div></div>`).join('');$('total').textContent=money(d.total,d.currency||'RM')}else{$('sale').style.display='none';$('welcome').style.display='block';$('welcomeTitle').textContent=d.line1||'WELCOME!';$('welcomeText').innerHTML='Thank you for visiting <span class="accent">'+esc(d.companyName||'Shining Pearl Tinted')+'</span>'}$('status').textContent='Ready'}async function tick(){try{const r=await fetch('/display-state',{cache:'no-store'});const d=await r.json();render(d)}catch(e){}}tick();setInterval(tick,400)</script></body></html>
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
      $chars=[Math]::Max(8,[int]$b.chars);$line1=([string]$b.line1).PadRight($chars).Substring(0,$chars);$line2=([string]$b.line2).PadRight($chars).Substring(0,$chars);$script:DisplayState=@{line1=$line1;line2=$line2;chars=$chars;companyName=[string]$b.companyName;logo=[string]$b.logo;items=@($b.items);total=[double]$b.total;currency=([string]$b.currency);customerName=[string]$b.customerName;updatedAt=(Get-Date).ToUniversalTime().ToString('o')}
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
    if($req.method -eq 'POST' -and $req.path -eq '/display'){$chars=[Math]::Max(8,[int]$b.chars);$line1=([string]$b.line1).PadRight($chars).Substring(0,$chars);$line2=([string]$b.line2).PadRight($chars).Substring(0,$chars);$script:DisplayState=@{line1=$line1;line2=$line2;chars=$chars;companyName=[string]$b.companyName;logo=[string]$b.logo;items=@($b.items);total=[double]$b.total;currency=([string]$b.currency);customerName=[string]$b.customerName;updatedAt=(Get-Date).ToUniversalTime().ToString('o')};$portName=[string]$b.port;if(!$portName){throw 'COM port is required'};$chars=[Math]::Max(8,[int]$b.chars);$baud=[int]$b.baud;if(!$baud){$baud=9600};$sp=New-Object IO.Ports.SerialPort($portName,$baud,'None',8,'One');$sp.Open();$line1=([string]$b.line1).PadRight($chars).Substring(0,$chars);$line2=([string]$b.line2).PadRight($chars).Substring(0,$chars);$sp.Write([char]12);$sp.Write($line1+$line2);$sp.Close();Send-Json $s 200 @{ok=$true};return}
    Send-Json $s 404 @{ok=$false;error='Not found'}
  }catch{Send-Json $s 500 @{ok=$false;error=$_.Exception.Message}}
}
$listener=New-Object Net.Sockets.TcpListener([Net.IPAddress]::Parse($HostName),$Port);$listener.Start()
while($true){$client=$listener.AcceptTcpClient();try{$req=Read-Request $client;Handle $req}catch{try{Send-Text $client.GetStream() 500 $_.Exception.Message}catch{}}finally{$client.Close()}}
