$ErrorActionPreference = 'Stop'

$taskProject = (Get-Item -LiteralPath (Join-Path $PSScriptRoot '..')).FullName
$taskReleaseRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($taskProject, 'release'))
$taskPackageName = '朋友圈生产-Windows-便携版'
$taskPackage = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($taskReleaseRoot, $taskPackageName))
$taskZip = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($taskReleaseRoot, $taskPackageName + '.zip'))
$taskCompiler = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$taskFramework = [System.IO.Path]::GetDirectoryName($taskCompiler)

if ([System.IO.Directory]::GetParent($taskReleaseRoot).FullName -ne $taskProject -or
    [System.IO.Directory]::GetParent($taskPackage).FullName -ne $taskReleaseRoot -or
    [System.IO.Directory]::GetParent($taskZip).FullName -ne $taskReleaseRoot) {
    throw '打包路径不在项目的 release 目录内。'
}
if (Test-Path -LiteralPath $taskPackage) { throw "目标目录已存在，未覆盖：$taskPackage" }
if (Test-Path -LiteralPath $taskZip) { throw "目标压缩包已存在，未覆盖：$taskZip" }
if (-not (Test-Path -LiteralPath $taskCompiler -PathType Leaf)) { throw '未找到 Windows .NET Framework C# 编译器。' }

Push-Location -LiteralPath $taskProject
try {
    & pnpm build
    if ($LASTEXITCODE -ne 0) { throw '网页构建失败。' }

    $taskDist = (Get-Item -LiteralPath (Join-Path $taskProject 'dist') -ErrorAction Stop).FullName
    if ([System.IO.Directory]::GetParent($taskDist).FullName -ne $taskProject -or
        -not (Test-Path -LiteralPath (Join-Path $taskDist 'index.html') -PathType Leaf)) {
        throw '构建目录不完整。'
    }
    if (-not (Test-Path -LiteralPath $taskReleaseRoot)) { New-Item -ItemType Directory -Path $taskReleaseRoot -ErrorAction Stop | Out-Null }
    New-Item -ItemType Directory -Path $taskPackage -ErrorAction Stop | Out-Null
    $taskApp = [System.IO.Path]::Combine($taskPackage, 'app')
    $taskLicenses = [System.IO.Path]::Combine($taskPackage, 'licenses')
    New-Item -ItemType Directory -Path $taskApp -ErrorAction Stop | Out-Null
    New-Item -ItemType Directory -Path $taskLicenses -ErrorAction Stop | Out-Null
    foreach ($taskEntry in Get-ChildItem -LiteralPath $taskDist -Force) {
        Copy-Item -LiteralPath $taskEntry.FullName -Destination $taskApp -Recurse -ErrorAction Stop
    }

    $taskExe = [System.IO.Path]::Combine($taskPackage, '朋友圈生产.exe')
    $taskSource = [System.IO.Path]::Combine($taskProject, 'launcher', 'Program.cs')
    & $taskCompiler /nologo /utf8output /target:winexe /platform:anycpu /optimize+ /codepage:65001 "/out:$taskExe" "/reference:$taskFramework\System.Windows.Forms.dll" "/reference:$taskFramework\System.Drawing.dll" $taskSource
    if ($LASTEXITCODE -ne 0) { throw '启动器编译失败。' }

    $taskScheduler = (& node --input-type=module -e 'import {createRequire} from "node:module";import {realpathSync} from "node:fs";import {dirname,join} from "node:path";const root=createRequire(process.cwd()+"/package.json");const reactDom=realpathSync(root.resolve("react-dom/package.json"));const dependencies=createRequire(reactDom);process.stdout.write(join(dirname(dependencies.resolve("scheduler/package.json")),"LICENSE"));')
    if ($LASTEXITCODE -ne 0 -or -not $taskScheduler) { throw '未找到 scheduler 的许可证。' }
    $taskLicenseSources = [ordered]@{
        'Noto-Sans-SC-OFL.txt' = [System.IO.Path]::Combine($taskProject, 'src', 'assets', 'fonts', 'OFL.txt')
        'React-MIT.txt' = [System.IO.Path]::Combine($taskProject, 'node_modules', 'react', 'LICENSE')
        'React-DOM-MIT.txt' = [System.IO.Path]::Combine($taskProject, 'node_modules', 'react-dom', 'LICENSE')
        'Scheduler-MIT.txt' = $taskScheduler
        'html-to-image-MIT.txt' = [System.IO.Path]::Combine($taskProject, 'node_modules', 'html-to-image', 'LICENSE')
        'Vite-MIT.txt' = [System.IO.Path]::Combine($taskProject, 'node_modules', 'vite', 'LICENSE.md')
    }
    foreach ($taskLicense in $taskLicenseSources.GetEnumerator()) {
        if (-not (Test-Path -LiteralPath $taskLicense.Value -PathType Leaf)) { throw "未找到许可证：$($taskLicense.Key)" }
        Copy-Item -LiteralPath $taskLicense.Value -Destination ([System.IO.Path]::Combine($taskLicenses, $taskLicense.Key)) -ErrorAction Stop
    }

    $taskReadme = @'
朋友圈生产 Windows 便携版

1. 完整解压压缩包，双击“朋友圈生产.exe”。
2. 启动器会打开默认浏览器；如没有自动打开，请在启动器中点击“打开网页”。
3. 使用完毕后，点击“停止并退出”或关闭启动器窗口，即可停止本地服务。

网页与素材都在本机运行，不需要安装 Node.js。草稿保存在打开网页的浏览器中。
使用其他浏览器时，草稿不会自动共享；如需继续使用 Codex 内置浏览器中的草稿，
启动便携版后，在该浏览器打开 http://127.0.0.1:5178/。

若提示端口 5178 已被占用，请先关闭占用该端口的网页服务，再启动便携版。
不要单独移动 exe，app 和 licenses 文件夹需要与 exe 保持在一起。
'@
    Set-Content -LiteralPath ([System.IO.Path]::Combine($taskPackage, '使用说明.txt')) -Value $taskReadme -Encoding utf8BOM -ErrorAction Stop
    [System.IO.Compression.ZipFile]::CreateFromDirectory($taskPackage, $taskZip, [System.IO.Compression.CompressionLevel]::Optimal, $false, [System.Text.Encoding]::UTF8)
    [pscustomobject]@{Directory=$taskPackage;Executable=$taskExe;Archive=$taskZip;ArchiveBytes=(Get-Item -LiteralPath $taskZip).Length} | ConvertTo-Json -Compress
} finally {
    Pop-Location
}
