' ============================================================================
'  Khoi dong VieNeu-TTS Server ẨN HOÀN TOÀN (khong hien cua so terminal nao).
'
'  Vi sao dung .vbs ma khong phai .bat:
'    - File .bat LUON tao ra 1 cua so console khi chay, ke ca khi da dat
'      "start /min" hay PowerShell -WindowStyle Hidden (van nhap nhay 1 cai).
'    - WScript.Shell.Run voi tham so window style = 0 la cach DUY NHAT tren
'      Windows chay tien trinh ma khong he tao/nhap nhay cua so nao.
'
'  Van dung python.exe (KHONG phai pythonw.exe) roi cho cmd chuyen huong output
'  ra file log: pythonw.exe khong co console nen stdout/stderr bi vut bo hoan
'  toan — mat sach log, khong con gi de tra khi server loi. Cach nay giu duoc
'  ca 2: cua so bi an di, nhung log van ghi day du ra file.
'
'  Log: AGENT_TOOL\data\vieneu-server.log  (ghi de moi lan khoi dong)
'  Dung server: chay stop-vieneu-server.bat
' ============================================================================

Option Explicit

Dim sh, fso, root, pyExe, appPy, logFile, q, cmdLine, wmi, running

Set sh  = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

root    = fso.GetParentFolderName(WScript.ScriptFullName)
pyExe   = root & "\.venv\Scripts\python.exe"
appPy   = root & "\vieneu_server.py"
logFile = root & "\vieneu-server.log"

' --- Kiem tra moi truong truoc khi chay -------------------------------------
If Not fso.FileExists(pyExe) Then
    MsgBox "Khong tim thay Python trong moi truong ao:" & vbCrLf & pyExe & vbCrLf & vbCrLf & _
           "Hay chay start-vieneu-server.bat mot lan de tao/cai dat moi truong truoc.", _
           vbCritical, "VieNeu-TTS"
    WScript.Quit 1
End If

If Not fso.FileExists(appPy) Then
    MsgBox "Khong tim thay file server:" & vbCrLf & appPy, vbCritical, "VieNeu-TTS"
    WScript.Quit 1
End If

' --- Chan chay trung: server thu 2 se khong bind duoc port 8001 va chet ngay,
'     de lai log kho hieu neu khong bao truoc ---------------------------------
Set wmi = GetObject("winmgmts:\\.\root\cimv2")
Set running = wmi.ExecQuery( _
    "SELECT ProcessId FROM Win32_Process WHERE Name='python.exe' AND CommandLine LIKE '%vieneu_server.py%'")

If running.Count > 0 Then
    sh.Popup "VieNeu-TTS Server dang chay san roi (" & running.Count & " tien trinh)." & vbCrLf & vbCrLf & _
             "Muon khoi dong lai: chay stop-vieneu-server.bat truoc.", _
             6, "VieNeu-TTS", vbInformation
    WScript.Quit 0
End If

' --- Chay an ----------------------------------------------------------------
' Dang lenh cuoi cung: cmd /c ""<python>" "<app>" > "<log>" 2>&1"
' Cap ngoac kep ngoai cung la bat buoc cua cmd /c khi duong dan chuong trinh
' co dau cach; cmd se tu boc lop ngoac ngoai do ra.
q = Chr(34)
cmdLine = "cmd /c " & q & q & pyExe & q & " " & q & appPy & q & _
          " > " & q & logFile & q & " 2>&1" & q

' Tham so: (lenh, 0 = an cua so, False = khong cho chay xong moi tra ve)
sh.Run cmdLine, 0, False

' Dung Popup (tu dong dong sau 6 giay) thay cho MsgBox: MsgBox se treo cho toi khi
' nguoi dung bam OK — kho chiu neu file nay duoc goi tu 1 script khac hoac dat
' vao muc Startup de tu chay cung Windows.
sh.Popup "Da khoi dong VieNeu-TTS Server o che do an." & vbCrLf & vbCrLf & _
         "Model can vai chuc giay de nap xong. Kiem tra bang nut" & vbCrLf & _
         """Thu ket noi"" trong Cau hinh Giong doc cua app." & vbCrLf & vbCrLf & _
         "Log: " & logFile, _
         6, "VieNeu-TTS", vbInformation
