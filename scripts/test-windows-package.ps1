$ErrorActionPreference = 'Stop'
$taskProject = (Get-Item -LiteralPath (Join-Path $PSScriptRoot '..')).FullName
$taskArchive = [System.IO.Path]::Combine($taskProject, 'release', '朋友圈生产-Windows-便携版.zip')
$taskTemporary = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($taskProject, '.tmp'))
if ([System.IO.Directory]::GetParent($taskTemporary).FullName -ne $taskProject) { throw '测试目录不在项目内。' }
if (-not (Test-Path -LiteralPath $taskArchive -PathType Leaf)) { throw '未找到便携版压缩包。' }
if (Get-NetTCPConnection -LocalPort 5178 -State Listen -ErrorAction SilentlyContinue) { throw '端口 5178 已被占用，无法验证便携包。' }
if (-not (Test-Path -LiteralPath $taskTemporary)) { New-Item -ItemType Directory -Path $taskTemporary -ErrorAction Stop | Out-Null }
$taskExtracted = [System.IO.Path]::Combine($taskTemporary, 'portable-check-' + [guid]::NewGuid().ToString('N'))
[System.IO.Compression.ZipFile]::ExtractToDirectory($taskArchive, $taskExtracted, [System.Text.Encoding]::UTF8)
$taskExecutable = [System.IO.Path]::Combine($taskExtracted, '朋友圈生产.exe')
$taskApp = [System.IO.Path]::Combine($taskExtracted, 'app')
$taskRequired = @('朋友圈生产.exe', '使用说明.txt', 'app/index.html', 'licenses/Noto-Sans-SC-OFL.txt', 'licenses/React-MIT.txt', 'licenses/React-DOM-MIT.txt', 'licenses/Scheduler-MIT.txt', 'licenses/html-to-image-MIT.txt', 'licenses/Vite-MIT.txt')
foreach ($taskRelative in $taskRequired) {
    $taskRequiredPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($taskExtracted, $taskRelative))
    if (-not $taskRequiredPath.StartsWith($taskExtracted + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $taskRequiredPath -PathType Leaf)) {
        throw "压缩包解压后缺少必要文件：$taskRelative"
    }
}

Push-Location -LiteralPath $taskProject
$taskProcess = $null
try {
    $taskProcess = Start-Process -FilePath $taskExecutable -ArgumentList '--no-browser' -WindowStyle Hidden -PassThru
    $taskReady = $false
    for ($taskAttempt = 0; $taskAttempt -lt 40; $taskAttempt++) {
        $taskProcess.Refresh()
        if ($taskProcess.HasExited) { throw "启动器提前退出，退出码：$($taskProcess.ExitCode)" }
        try {
            $taskResponse = Invoke-WebRequest -Uri 'http://127.0.0.1:5178/' -UseBasicParsing -TimeoutSec 2
            if ($taskResponse.StatusCode -eq 200) { $taskReady = $true; break }
        } catch {
            Start-Sleep -Milliseconds 250
        }
    }
    if (-not $taskReady) { throw '启动器未在规定时间内启动本地网页。' }
    & node 'tests/portable-smoke.mjs'
    if ($LASTEXITCODE -ne 0) { throw '便携包浏览器验证失败。' }
} finally {
    if ($null -ne $taskProcess) {
        $taskProcess.Refresh()
        if (-not $taskProcess.HasExited) {
            $taskClosed = $taskProcess.CloseMainWindow()
            if (-not $taskClosed -or -not $taskProcess.WaitForExit(5000)) {
                Stop-Process -Id $taskProcess.Id -ErrorAction Stop
                $taskProcess.WaitForExit()
                Write-Output '隐藏的测试进程已结束。'
            } else {
                Write-Output '测试窗口已正常关闭。'
            }
        }
    }
    Pop-Location
}

$taskRemaining = Get-NetTCPConnection -LocalPort 5178 -State Listen -ErrorAction SilentlyContinue
if ($taskRemaining) { throw '测试结束后端口 5178 仍被占用，请检查服务状态。' }
$taskCompiler = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$taskFramework = [System.IO.Path]::GetDirectoryName($taskCompiler)
$taskHarness = [System.IO.Path]::Combine($taskTemporary, 'launcher-close-' + [guid]::NewGuid().ToString('N') + '.exe')
$taskSource = [System.IO.Path]::Combine($taskProject, 'launcher', 'Program.cs')
$taskHarnessSource = [System.IO.Path]::Combine($taskProject, 'tests', 'launcher-close.cs')
& $taskCompiler /nologo /utf8output /target:winexe /platform:anycpu /optimize+ /codepage:65001 /main:MomentsLauncher.LauncherCloseSmoke "/out:$taskHarness" "/reference:$taskFramework\System.Windows.Forms.dll" "/reference:$taskFramework\System.Drawing.dll" $taskSource $taskHarnessSource
if ($LASTEXITCODE -ne 0) { throw '关闭流程验证程序编译失败。' }
$taskHarnessProcess = Start-Process -FilePath $taskHarness -ArgumentList ('"' + $taskApp + '"') -WindowStyle Hidden -PassThru
if (-not $taskHarnessProcess.WaitForExit(15000)) {
    Stop-Process -Id $taskHarnessProcess.Id -ErrorAction Stop
    throw '关闭流程验证超时。'
}
if ($taskHarnessProcess.ExitCode -ne 0) { throw "关闭流程验证失败，退出码：$($taskHarnessProcess.ExitCode)" }
$taskRemaining = Get-NetTCPConnection -LocalPort 5178 -State Listen -ErrorAction SilentlyContinue
if ($taskRemaining) { throw '关闭流程验证后端口 5178 仍被占用。' }
Write-Output '启动器窗口关闭后释放端口的流程已验证。'
Write-Output '便携包验证完成，本地服务已停止。'
