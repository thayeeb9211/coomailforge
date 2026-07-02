' COO Mail Forge — Silent background launcher
' Pulls latest code from GitHub then starts the server (no console window)
Dim WshShell, dir
Set WshShell = CreateObject("WScript.Shell")
dir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\") - 1)
WshShell.CurrentDirectory = dir
' Pull latest code silently before starting
WshShell.Run "git -C """ & dir & """ pull origin main", 0, True
' Start server with no window
WshShell.Run "pythonw.exe serve.py", 0, False
Set WshShell = Nothing
