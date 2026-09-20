Option Explicit
Dim sh, fso, root, ps, script, log, errlog, cmd, i, http, ok, q
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)
ps = sh.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\WindowsPowerShell\v1.0\powershell.exe"
script = fso.BuildPath(root, "fastreport-price-tags.ps1")
log = fso.BuildPath(root, "fastreport-startup.log")
errlog = fso.BuildPath(root, "fastreport-startup-error.log")

' Stop only the SP-Manager FastReport bridge on port 18767.
cmd = "Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 18767 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
sh.Run Chr(34) & ps & Chr(34) & " -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -Command " & Chr(34) & cmd & Chr(34), 0, True

' Start the actual FastReport PowerShell bridge directly.
' Do not use nested Start-Process here: that was the source of the silent startup failure.
q = Chr(34)
cmd = q & ps & q & " -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File " & q & script & q
sh.Run cmd, 0, False

' Wait silently until the bridge is ready (up to 30 seconds).
ok = False
For i = 1 To 60
  WScript.Sleep 500
  On Error Resume Next
  Set http = CreateObject("MSXML2.XMLHTTP")
  http.Open "GET", "http://127.0.0.1:18767/status", False
  http.send
  ok = (Err.Number = 0 And http.Status = 200)
  Err.Clear
  On Error GoTo 0
  If ok Then Exit For
Next

If Not ok Then
  On Error Resume Next
  Dim f
  Set f = fso.OpenTextFile(errlog, 8, True)
  f.WriteLine Now & " - FastReport bridge did not become ready within 30 seconds."
  f.Close
  On Error GoTo 0
End If
