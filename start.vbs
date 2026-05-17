Option Explicit

Dim shell, fso, projectDir, scriptPath, logDir, logPath, cmd
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

projectDir = fso.GetParentFolderName(WScript.ScriptFullName)
scriptPath = fso.BuildPath(projectDir, "start-windows.cmd")
logDir = shell.ExpandEnvironmentStrings("%USERPROFILE%") & "\.wechat-opencode\logs"
logPath = fso.BuildPath(logDir, "windows-startup.log")

EnsureFolder logDir

cmd = "cmd.exe /c " & Quote(Quote(scriptPath) & " --no-pause > " & Quote(logPath) & " 2>&1")

shell.Run cmd, 0, False

Function Quote(value)
  Quote = Chr(34) & value & Chr(34)
End Function

Sub EnsureFolder(path)
  Dim parent
  If fso.FolderExists(path) Then Exit Sub
  parent = fso.GetParentFolderName(path)
  If Len(parent) > 0 And Not fso.FolderExists(parent) Then EnsureFolder parent
  fso.CreateFolder path
End Sub
