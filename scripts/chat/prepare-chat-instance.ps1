[CmdletBinding()]
param(
    [string]$RepoRoot = "",
    [string]$Project,
    [string]$SessionId,
    [switch]$InstallRootDeps,
    [switch]$InstallMcpDeps,
    [switch]$PrepareMcp,
    [switch]$SkipScaffold,
    [switch]$SkipBuild,
    [switch]$NoBriefing
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Assert-PathExists {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Required path not found: $Path"
    }
}

function Invoke-CmdOrThrow {
    param(
        [Parameter(Mandatory)][string]$WorkingDirectory,
        [Parameter(Mandatory)][string]$Command
    )

    Write-Host ">> cmd /c $Command"
    Push-Location $WorkingDirectory
    try {
        cmd /c $Command
        if ($LASTEXITCODE -ne 0) {
            throw "Command failed with exit code ${LASTEXITCODE}: cmd /c $Command"
        }
    } finally {
        Pop-Location
    }
}

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $RepoRoot = Join-Path $scriptDir "..\.."
}
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
Assert-PathExists (Join-Path $RepoRoot "package.json")
Assert-PathExists (Join-Path $RepoRoot "agency.config.json")

$envFile = Join-Path $RepoRoot ".env"
$envExample = Join-Path $RepoRoot ".env.example"
if ((-not (Test-Path -LiteralPath $envFile)) -and (Test-Path -LiteralPath $envExample)) {
    Copy-Item -LiteralPath $envExample -Destination $envFile
    Write-Host "Created .env from .env.example"
}

$agencyConfig = Get-Content -Raw -Path (Join-Path $RepoRoot "agency.config.json") | ConvertFrom-Json
if ([string]::IsNullOrWhiteSpace($Project)) {
    $Project = [string]$agencyConfig.activeProject
}
if ([string]::IsNullOrWhiteSpace($Project)) {
    $Project = "csscroll"
}

if ([string]::IsNullOrWhiteSpace($SessionId)) {
    $SessionId = Get-Date -Format "yyyyMMdd-HHmmss"
}

$sessionRoot = Join-Path $RepoRoot ".agency/chat/sessions/$SessionId"
$null = New-Item -ItemType Directory -Path $sessionRoot -Force

Write-Host "Preparing chat session '$SessionId' for project '$Project'"

if ($InstallRootDeps -or (-not (Test-Path -LiteralPath (Join-Path $RepoRoot "node_modules")))) {
    Invoke-CmdOrThrow -WorkingDirectory $RepoRoot -Command "npm install"
}

$mcpRoot = Join-Path $RepoRoot "mcp"
if ($InstallMcpDeps -or (-not (Test-Path -LiteralPath (Join-Path $mcpRoot "node_modules")))) {
    Invoke-CmdOrThrow -WorkingDirectory $mcpRoot -Command "npm install"
}

if (-not $SkipScaffold) {
    Invoke-CmdOrThrow -WorkingDirectory $RepoRoot -Command "npm run scaffold"
}
Invoke-CmdOrThrow -WorkingDirectory $RepoRoot -Command "npm run list:projects"

if (-not $SkipBuild) {
    Invoke-CmdOrThrow -WorkingDirectory $RepoRoot -Command "npm run build -- --project=$Project"
}

if ($PrepareMcp) {
    $prepareMcpScript = Join-Path $RepoRoot "scripts/chat/prepare-mcp.ps1"
    Assert-PathExists $prepareMcpScript
    & $prepareMcpScript -RepoRoot $RepoRoot
}

$briefingPath = Join-Path $sessionRoot "briefing.md"
if (-not $NoBriefing) {
    $briefingScript = Join-Path $RepoRoot "scripts/chat/new-chat-briefing.ps1"
    Assert-PathExists $briefingScript
    & $briefingScript -RepoRoot $RepoRoot -Project $Project -OutputPath $briefingPath | Out-Host
}

$summary = [ordered]@{
    sessionId      = $SessionId
    preparedAtUtc  = (Get-Date).ToUniversalTime().ToString("o")
    repoRoot       = $RepoRoot
    project        = $Project
    briefingPath   = $briefingPath
    installRoot    = [bool]$InstallRootDeps
    installMcp     = [bool]$InstallMcpDeps
    prepareMcp     = [bool]$PrepareMcp
    commands       = @(
        "cmd /c npm run scaffold"
        "cmd /c npm run list:projects"
        "cmd /c npm run build -- --project=$Project"
        "cmd /c npm run dev -- --project=$Project"
    )
}
$summary | ConvertTo-Json -Depth 6 | Set-Content -Path (Join-Path $sessionRoot "session.json") -Encoding UTF8

Write-Host ""
Write-Host "Session prepared:"
Write-Host "  Session folder: $sessionRoot"
Write-Host "  Session metadata: $(Join-Path $sessionRoot "session.json")"
if (-not $NoBriefing) {
    Write-Host "  Briefing: $briefingPath"
}
Write-Host "  Start dev: cmd /c npm run dev -- --project=$Project"
