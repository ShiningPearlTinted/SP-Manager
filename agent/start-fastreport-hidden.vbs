Option Explicit
Dim sh, fso, root, ps, script, cmd, q
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)
ps = sh.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\WindowsPowerShell\v1.0\powershell.exe"
script = fso.BuildPath(root, "fastreport-price-tags.ps1")
q = Chr(34)
sh.CurrentDirectory = root
cmd = q & ps & q & " -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File " & q & script & q
sh.Run cmd, 0, False
Set fso = Nothing
Set sh = Nothing
