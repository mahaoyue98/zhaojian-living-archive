$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$HostAddress = '127.0.0.1'
$Port = 4173
$Url = "http://${HostAddress}:$Port"
$LogDirectory = Join-Path $ProjectRoot '.runtime'
$OutputLog = Join-Path $LogDirectory 'noema-server.log'
$ErrorLog = Join-Path $LogDirectory 'noema-server.error.log'

function Write-Step([string]$Message) {
    Write-Host "[照见] $Message" -ForegroundColor Cyan
}

function Test-Port([int]$TargetPort) {
    $listener = Get-NetTCPConnection -LocalPort $TargetPort -State Listen -ErrorAction SilentlyContinue
    return $null -ne $listener
}

function Test-NoemaServer([string]$TargetUrl) {
    try {
        $response = Invoke-WebRequest -Uri $TargetUrl -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -eq 200 -and $response.Content.Contains('lang="zh-CN"')
    } catch {
        return $false
    }
}

function Wait-ForServer([string]$TargetUrl, [int]$TimeoutSeconds = 30) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        try {
            $response = Invoke-WebRequest -Uri $TargetUrl -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return $true
            }
        } catch {
            Start-Sleep -Milliseconds 350
        }
    } while ((Get-Date) -lt $deadline)
    return $false
}

Set-Location $ProjectRoot
New-Item -ItemType Directory -Force $LogDirectory | Out-Null

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw '未检测到 Node.js。请先安装 Node.js 20 或更高版本。'
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw '未检测到 npm。请重新安装完整的 Node.js。'
}

$majorVersion = [int]((node --version).TrimStart('v').Split('.')[0])
if ($majorVersion -lt 20) {
    throw "Node.js 版本过低：当前 v$majorVersion，需要 v20 或更高版本。"
}

if (Test-Port $Port) {
    Write-Step "检测到服务已在运行，正在打开浏览器。"
    Start-Process $Url
    exit 0
}

if (-not (Test-Path (Join-Path $ProjectRoot 'node_modules'))) {
    Write-Step '首次运行，正在安装依赖……'
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) { throw '依赖安装失败。' }
}

Write-Step '正在生成生产版本……'
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw '生产构建失败。' }

Remove-Item -LiteralPath $OutputLog, $ErrorLog -Force -ErrorAction SilentlyContinue
Write-Step "正在后台启动服务：$Url"
$process = Start-Process -FilePath 'npm.cmd' `
    -ArgumentList @('run', 'preview', '--', '--port', $Port) `
    -WorkingDirectory $ProjectRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $OutputLog `
    -RedirectStandardError $ErrorLog `
    -PassThru

if (-not (Wait-ForServer $Url 30)) {
    if (-not $process.HasExited) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue }
    $details = if (Test-Path $ErrorLog) { Get-Content -Raw $ErrorLog } else { '没有错误日志。' }
    throw "服务未能在 30 秒内启动。`n$details"
}

Write-Step '启动成功，正在打开浏览器。'
Start-Process $Url
Write-Host "`nNOEMA 正在后台运行。" -ForegroundColor Green
Write-Host "地址：$Url"
Write-Host "日志：$OutputLog"
Write-Host '再次双击启动程序可重新打开页面。'
