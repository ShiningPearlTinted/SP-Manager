$script:SPDisplayHandle=[IntPtr]::Zero
$script:SPDisplayOwner=0
function Open-SPDisplayWindow($Body) {
  Add-Type -AssemblyName System.Windows.Forms
  if(-not ('SPDisplayWindow' -as [type])) {
    Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
public static class SPDisplayWindow {
 [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h,IntPtr z,int x,int y,int w,int t,uint f);
 [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr h,int n);
}
'@
  }
  $screens=[System.Windows.Forms.Screen]::AllScreens
  if($screens.Count -lt 2){throw 'No secondary monitor detected. Set Windows display mode to Extend displays.'}
  $screen=@($screens|Where-Object {-not $_.Primary}|Select-Object -First 1)[0]
  if($null -eq $screen){throw 'No secondary monitor is available.'}
  $profile=Join-Path $env:LOCALAPPDATA 'SP-Manager\CustomerDisplayBrowser'
  $browser=$null
  foreach($cmd in @('msedge.exe','chrome.exe')){if(-not $browser){$browser=(Get-Command $cmd -ErrorAction SilentlyContinue).Source}}
  if(-not $browser){$browser=@(
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
  )|Where-Object{Test-Path -LiteralPath $_}|Select-Object -First 1}
  if(-not $browser){throw 'Microsoft Edge or Google Chrome was not found on this Windows PC.'}
  $owned=@(Get-CimInstance Win32_Process|Where-Object{ $_.Name -in @('msedge.exe','chrome.exe') -and $_.CommandLine -and $_.CommandLine.Contains($profile) })
  $handle=[IntPtr]::Zero
  if([SPDisplayWindow]::IsWindow($script:SPDisplayHandle)){
    [uint32]$ownerId=0;[SPDisplayWindow]::GetWindowThreadProcessId($script:SPDisplayHandle,[ref]$ownerId)|Out-Null
    if($ownerId -eq $script:SPDisplayOwner -and $owned.ProcessId -contains $ownerId){$handle=$script:SPDisplayHandle}
  }
  if($handle -eq [IntPtr]::Zero){foreach($proc in $owned){$p=Get-Process -Id $proc.ProcessId -ErrorAction SilentlyContinue;if($p -and $p.MainWindowHandle -ne 0){$handle=$p.MainWindowHandle;break}}}
  $reused=$handle -ne [IntPtr]::Zero
  if(-not $reused){
    $url="http://127.0.0.1:$Port/customer-display?key=$DisplayToken"
    $arguments=@("--app=$url",'--new-window',('--user-data-dir="'+$profile+'"'),"--window-position=$($screen.Bounds.X),$($screen.Bounds.Y)","--window-size=$($screen.Bounds.Width),$($screen.Bounds.Height)",'--disable-session-crashed-bubble','--no-first-run')
    Start-Process -FilePath $browser -ArgumentList $arguments -WindowStyle Normal | Out-Null
    for($i=0;$i -lt 30 -and $handle -eq [IntPtr]::Zero;$i++){
      Start-Sleep -Milliseconds 350
      $owned=@(Get-CimInstance Win32_Process|Where-Object{ $_.Name -in @('msedge.exe','chrome.exe') -and $_.CommandLine -and $_.CommandLine.Contains($profile) })
      foreach($proc in $owned){$p=Get-Process -Id $proc.ProcessId -ErrorAction SilentlyContinue;if($p -and $p.MainWindowHandle -ne 0){$handle=$p.MainWindowHandle;break}}
    }
  }
  if($handle -eq [IntPtr]::Zero){throw 'Display browser started but its dedicated window was not detected. Check the secondary monitor.'}
  # Reusing a window must not overwrite an active cart/payment with welcome data.
  if(-not $reused -or -not $script:DisplayState.ContainsKey('state')){$script:DisplayState=@{line1=[string]$Body.line1;line2=[string]$Body.line2;chars=[int]$Body.chars;companyName=[string]$Body.companyName;logo=[string]$Body.logo;items=@($Body.items);total=[double]$Body.total;currency=[string]$Body.currency;customerName=[string]$Body.customerName;state=[string]$Body.state;updatedAt=(Get-Date).ToUniversalTime().ToString('o')}}
  [SPDisplayWindow]::ShowWindowAsync($handle,4)|Out-Null
  if(-not [SPDisplayWindow]::SetWindowPos($handle,[IntPtr]::Zero,$screen.Bounds.X,$screen.Bounds.Y,$screen.Bounds.Width,$screen.Bounds.Height,0x0014)){throw 'Windows could not place the customer display on the secondary monitor.'}
  [uint32]$ownerId=0;[SPDisplayWindow]::GetWindowThreadProcessId($handle,[ref]$ownerId)|Out-Null
  $script:SPDisplayHandle=$handle;$script:SPDisplayOwner=$ownerId
  return @{ok=$true;mode='secondary';details=@{monitor=$screen.DeviceName;x=$screen.Bounds.X;y=$screen.Bounds.Y;width=$screen.Bounds.Width;height=$screen.Bounds.Height;windowFound=$true;reused=$reused}}
}
