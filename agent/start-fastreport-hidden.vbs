Option Explicit
Dim sh, fso, root, ps, cmd, log, i
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)
ps = sh.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\WindowsPowerShell\v1.0\powershell.exe"
log = fso.BuildPath(root, "fastreport-startup.log")
Dim errlog
errlog = fso.BuildPath(root, "fastreport-startup-error.log")

' Stop only the SP-Manager FastReport bridge on port 18767.
cmd = "Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 18767 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
sh.Run Chr(34) & ps & Chr(34) & " -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -Command " & Chr(34) & cmd & Chr(34), 0, True

' Start the real FastReport .NET bridge completely hidden.
cmd = "Get-ChildItem -LiteralPath '" & Replace(root,"'","''") & "' -Recurse -File | Where-Object { $_.Extension -in '.dll','.ps1','.frx','.bat' } | Unblock-File -ErrorAction SilentlyContinue; Start-Process -FilePath '" & Replace(ps,"'","''") & "' -ArgumentList '-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File','" & Replace(fso.BuildPath(root,"fastreport-price-tags.ps1"),"'","''") & "' -WindowStyle Hidden -RedirectStandardOutput '" & Replace(log,"'","''") & "' -RedirectStandardError '" & Replace(errlog,"'","''") & "' -WindowStyle Hidden"
sh.Run Chr(34) & ps & Chr(34) & " -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -Command " & Chr(34) & cmd & Chr(34), 0, True

' Wait silently until the bridge is ready, then exit.
For i = 1 To 15
  WScript.Sleep 500
  On Error Resume Next
  Dim http, ok
  Set http = CreateObject("MSXML2.XMLHTTP")
  http.Open "GET", "http://127.0.0.1:18767/status", False
  http.send
  ok = (Err.Number = 0 And http.Status = 200)
  Err.Clear
  On Error GoTo 0
  If ok Then Exit For
Next
