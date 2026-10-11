param([Parameter(Mandatory=$true)][long]$WindowHandle,[Parameter(Mandatory=$true)][uint32]$OwnerId)
$ErrorActionPreference='Stop'
$mutex=$null;$locked=$false
try {
  # One controller per dedicated Customer Display window. It never sends keys to POS.
  $mutex=New-Object Threading.Mutex($false,('Local\SPManagerDisplayFullscreen-'+$WindowHandle))
  $locked=$mutex.WaitOne(0)
  if(-not $locked){exit 0}
  Add-Type -AssemblyName System.Windows.Forms
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class SPDisplayFullscreen {
 [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern bool IsChild(IntPtr parent,IntPtr child);
 [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int key);
 [DllImport("user32.dll",EntryPoint="GetWindowLongW")] static extern int GetLong32(IntPtr h,int i);
 [DllImport("user32.dll",EntryPoint="GetWindowLongPtrW")] static extern IntPtr GetLong64(IntPtr h,int i);
 [DllImport("user32.dll",EntryPoint="SetWindowLongW")] static extern int SetLong32(IntPtr h,int i,int v);
 [DllImport("user32.dll",EntryPoint="SetWindowLongPtrW")] static extern IntPtr SetLong64(IntPtr h,int i,IntPtr v);
 [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h,IntPtr z,int x,int y,int w,int t,uint f);
 [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr h,int n);
 public static long Style(IntPtr h,int i){return IntPtr.Size==8?GetLong64(h,i).ToInt64():GetLong32(h,i);}
 public static void Style(IntPtr h,int i,long v){if(IntPtr.Size==8)SetLong64(h,i,new IntPtr(v));else SetLong32(h,i,unchecked((int)v));}
 public static long Borderless(long v){return v & ~0x00CF0000L;}
 public static bool EscapeRequested(bool pressed,bool wasPressed,bool focused){return pressed && !wasPressed && focused;}
}
'@
  $handle=[IntPtr]$WindowHandle
  [uint32]$actualOwner=0
  [SPDisplayFullscreen]::GetWindowThreadProcessId($handle,[ref]$actualOwner)|Out-Null
  if(-not [SPDisplayFullscreen]::IsWindow($handle) -or $actualOwner -ne $OwnerId){throw 'Customer Display window owner changed.'}
  $screen=[System.Windows.Forms.Screen]::FromHandle($handle)
  if($screen.Primary){throw 'Fullscreen requires the Customer Display on a secondary monitor.'}
  $bounds=$screen.Bounds;$work=$screen.WorkingArea
  $style=[SPDisplayFullscreen]::Style($handle,-16)
  $exStyle=[SPDisplayFullscreen]::Style($handle,-20)
  $entered=$false
  try {
    [SPDisplayFullscreen]::ShowWindowAsync($handle,4)|Out-Null
    [SPDisplayFullscreen]::Style($handle,-16,[SPDisplayFullscreen]::Borderless($style))
    $entered=$true
    # Frame change + no activation: keep cashier keyboard focus on the POS.
    if(-not [SPDisplayFullscreen]::SetWindowPos($handle,[IntPtr](-1),$bounds.X,$bounds.Y,$bounds.Width,$bounds.Height,0x0030)){throw 'Windows could not enter Customer Display fullscreen.'}
    $wasPressed=([SPDisplayFullscreen]::GetAsyncKeyState(27) -band 0x8000) -ne 0
    while([SPDisplayFullscreen]::IsWindow($handle)) {
      [uint32]$currentOwner=0
      [SPDisplayFullscreen]::GetWindowThreadProcessId($handle,[ref]$currentOwner)|Out-Null
      if($currentOwner -ne $OwnerId){break}
      $foreground=[SPDisplayFullscreen]::GetForegroundWindow()
      $focused=$foreground -eq $handle -or [SPDisplayFullscreen]::IsChild($handle,$foreground)
      $pressed=([SPDisplayFullscreen]::GetAsyncKeyState(27) -band 0x8000) -ne 0
      if([SPDisplayFullscreen]::EscapeRequested($pressed,$wasPressed,$focused)){break}
      $wasPressed=$pressed
      Start-Sleep -Milliseconds 40
    }
  } finally {
    [uint32]$currentOwner=0
    [SPDisplayFullscreen]::GetWindowThreadProcessId($handle,[ref]$currentOwner)|Out-Null
    if($entered -and [SPDisplayFullscreen]::IsWindow($handle) -and $currentOwner -eq $OwnerId) {
      [SPDisplayFullscreen]::Style($handle,-16,$style)
      [SPDisplayFullscreen]::Style($handle,-20,$exStyle)
      # Esc restores the title bar, buttons and visible taskbar on this monitor.
      [SPDisplayFullscreen]::SetWindowPos($handle,[IntPtr](-2),$work.X,$work.Y,$work.Width,$work.Height,0x0030)|Out-Null
    }
  }
} catch {
  $log=Join-Path $env:LOCALAPPDATA 'SP-Manager\customer-display-fullscreen.log'
  Add-Content -LiteralPath $log -Value ((Get-Date).ToString('o')+' '+$_.Exception.Message)
} finally {
  if($locked -and $mutex){$mutex.ReleaseMutex()}
  if($mutex){$mutex.Dispose()}
}
