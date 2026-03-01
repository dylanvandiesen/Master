param(
    [int]$Port = 8787,
    [Alias("UpdateRemoteRedirect")]
    [switch]$UpdateRemoteFrontend,
    [string]$RemoteHost = "diesign.dev",
    [string]$RemoteUser = "root",
    [string]$RemoteKeyPath = "C:\Users\SKIKK\.ssh\root_2a01_239_491_ee00__1.tmp"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$tmpDir = Join-Path $repoRoot ".tmp"
$null = New-Item -ItemType Directory -Force -Path $tmpDir

$panelOut = Join-Path $tmpDir "commander-local.out.log"
$panelErr = Join-Path $tmpDir "commander-local.err.log"
$tunnelOut = Join-Path $tmpDir "cloudflared-local.out.log"
$tunnelErr = Join-Path $tmpDir "cloudflared-local.err.log"
$updateScript = Join-Path $PSScriptRoot "update-commander-local-redirect.ps1"

function Test-CommanderPanel {
    param([int]$PanelPort)
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri ("http://127.0.0.1:{0}/api/health" -f $PanelPort) -TimeoutSec 3
        return ($response.StatusCode -eq 200)
    } catch {
        return $false
    }
}

function Get-TunnelUrlFromLog {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        return $null
    }
    $match = Select-String -Path $Path -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -Last 1
    if (-not $match) {
        return $null
    }
    return $match.Matches.Value
}

function Test-TunnelUrl {
    param([string]$Url)
    if (-not $Url) {
        return $false
    }
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 8
        return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500)
    } catch {
        return $false
    }
}

if (-not (Test-CommanderPanel -PanelPort $Port)) {
    Remove-Item $panelOut, $panelErr -ErrorAction SilentlyContinue
    $panel = Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c", "npm run commander -- --port=$Port" `
        -WorkingDirectory $repoRoot `
        -WindowStyle Hidden `
        -RedirectStandardOutput $panelOut `
        -RedirectStandardError $panelErr `
        -PassThru

    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Seconds 1
        if (Test-CommanderPanel -PanelPort $Port) {
            break
        }
    }
}

if (-not (Test-CommanderPanel -PanelPort $Port)) {
    throw "Local commander did not start on 127.0.0.1:$Port"
}

$existingTunnelProcess = Get-CimInstance Win32_Process |
    Where-Object { $_.Name -eq "cloudflared.exe" -and $_.CommandLine -match "127\.0\.0\.1:$Port" } |
    Select-Object -First 1

$tunnelUrl = Get-TunnelUrlFromLog -Path $tunnelErr
if ($existingTunnelProcess -and (Test-TunnelUrl -Url $tunnelUrl)) {
    Write-Output "Reusing local quick tunnel: $tunnelUrl"
} else {
    Remove-Item $tunnelOut, $tunnelErr -ErrorAction SilentlyContinue
    Start-Process -FilePath "C:\Program Files (x86)\cloudflared\cloudflared.exe" `
        -ArgumentList "tunnel", "--url", "http://127.0.0.1:$Port", "--no-autoupdate" `
        -WindowStyle Hidden `
        -RedirectStandardOutput $tunnelOut `
        -RedirectStandardError $tunnelErr | Out-Null

    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Seconds 1
        $tunnelUrl = Get-TunnelUrlFromLog -Path $tunnelErr
        if ($tunnelUrl -and (Test-TunnelUrl -Url $tunnelUrl)) {
            break
        }
    }
}

if (-not $tunnelUrl) {
    throw "Quick tunnel URL was not detected in $tunnelErr"
}

if (-not (Test-TunnelUrl -Url $tunnelUrl)) {
    throw "Quick tunnel URL is not reachable: $tunnelUrl"
}

if ($UpdateRemoteFrontend) {
    & powershell -ExecutionPolicy Bypass -File $updateScript `
        -TunnelUrl $tunnelUrl `
        -RemoteHost $RemoteHost `
        -RemoteUser $RemoteUser `
        -RemoteKeyPath $RemoteKeyPath
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to update local-commander.diesign.dev frontend"
    }
}

Write-Output "Local commander: http://127.0.0.1:$Port"
Write-Output "Quick tunnel: $tunnelUrl"
if ($UpdateRemoteFrontend) {
    Write-Output "Remote frontend: https://local-commander.diesign.dev"
}
