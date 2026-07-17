Set WinScriptHost = CreateObject("WScript.Shell")
' Xác định thư mục chứa file VBS này và chạy StartApp.bat ở chế độ ẩn (tham số 0)
currentDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptPosition)
WinScriptHost.Run Chr(34) & currentDir & "\StartApp.bat" & Chr(34), 0, False
