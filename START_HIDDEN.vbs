' COO Mail Forge — Silent background launcher
' Runs the server with no console window visible
Dim WshShell
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\") - 1)
WshShell.Run "pythonw.exe serve.py", 0, False
Set WshShell = Nothing
