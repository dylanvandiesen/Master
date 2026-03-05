[CmdletBinding()]
param(
    [string]$RepoRoot = "",
    [string]$Project,
    [string]$SessionId,
    [ValidateSet("quick", "standard", "full")]
    [string]$Mode = "standard",
    [switch]$InstallRootDeps,
    [switch]$InstallMcpDeps,
    [switch]$PrepareMcp,
    [switch]$SkipScaffold,
    [switch]$SkipBuild,
    [switch]$NoBriefing,
    [switch]$NoSuperContext
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

function Write-TextNoBom {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Content
    )

    $parent = Split-Path -Parent $Path
    if (-not [string]::IsNullOrWhiteSpace($parent)) {
        $null = New-Item -ItemType Directory -Path $parent -Force
    }
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
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

Write-Host "Preparing chat session '$SessionId' for project '$Project' (mode: $Mode)"

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
$commanderBriefingPath = Join-Path $sessionRoot "commander-briefing.md"
$systemBriefingPath = Join-Path $sessionRoot "system-briefing.md"
$superContextPath = Join-Path $sessionRoot "super-context.json"
$superContextMarkdownPath = Join-Path $sessionRoot "super-context.md"
$latestSuperContextPath = Join-Path $RepoRoot ".agency/chat/latest-super-context.json"
$latestSuperContextMarkdownPath = Join-Path $RepoRoot ".agency/chat/latest-super-context.md"
if (-not $NoBriefing) {
    $briefingScript = Join-Path $RepoRoot "scripts/chat/new-chat-briefing.ps1"
    Assert-PathExists $briefingScript
    & $briefingScript -RepoRoot $RepoRoot -Project $Project -Mode "project" -OutputPath $briefingPath | Out-Host
    & $briefingScript -RepoRoot $RepoRoot -Project $Project -Mode "commander" -OutputPath $commanderBriefingPath | Out-Host
    & $briefingScript -RepoRoot $RepoRoot -Project $Project -Mode "system" -OutputPath $systemBriefingPath | Out-Host
}

if (-not $NoSuperContext) {
    $contextScript = Join-Path $RepoRoot "scripts/chat/export-super-agent-context.ps1"
    if (Test-Path -LiteralPath $contextScript) {
        & $contextScript `
            -RepoRoot $RepoRoot `
            -Project $Project `
            -SessionId $SessionId `
            -Mode $Mode `
            -OutputPath $superContextPath `
            -EmitMarkdown `
            -MarkdownOutputPath $superContextMarkdownPath | Out-Host

        $null = New-Item -ItemType Directory -Path (Split-Path -Parent $latestSuperContextPath) -Force
        Copy-Item -LiteralPath $superContextPath -Destination $latestSuperContextPath -Force
        if (Test-Path -LiteralPath $superContextMarkdownPath) {
            Copy-Item -LiteralPath $superContextMarkdownPath -Destination $latestSuperContextMarkdownPath -Force
        }
    } else {
        Write-Warning "Super context export script not found: $contextScript"
    }
}

$summary = [ordered]@{
    sessionId      = $SessionId
    preparedAtUtc  = (Get-Date).ToUniversalTime().ToString("o")
    repoRoot       = $RepoRoot
    project        = $Project
    mode           = $Mode
    briefingPath   = $briefingPath
    commanderBriefingPath = $commanderBriefingPath
    systemBriefingPath = $systemBriefingPath
    superContextPath = $superContextPath
    superContextMarkdownPath = $superContextMarkdownPath
    latestSuperContextPath = $latestSuperContextPath
    latestSuperContextMarkdownPath = $latestSuperContextMarkdownPath
    installRoot    = [bool]$InstallRootDeps
    installMcp     = [bool]$InstallMcpDeps
    prepareMcp     = [bool]$PrepareMcp
    superContextGenerated = [bool](-not $NoSuperContext)
    commands       = @(
        "cmd /c npm run scaffold"
        "cmd /c npm run list:projects"
        "cmd /c npm run build -- --project=$Project"
        "cmd /c npm run dev -- --project=$Project"
    )
}
$summaryJson = $summary | ConvertTo-Json -Depth 6
Write-TextNoBom -Path (Join-Path $sessionRoot "session.json") -Content $summaryJson

Write-Host ""
Write-Host "Session prepared:"
Write-Host "  Session folder: $sessionRoot"
Write-Host "  Session metadata: $(Join-Path $sessionRoot "session.json")"
if (-not $NoBriefing) {
    Write-Host "  Briefing: $briefingPath"
    Write-Host "  Commander briefing: $commanderBriefingPath"
    Write-Host "  System briefing: $systemBriefingPath"
}
if (-not $NoSuperContext) {
    Write-Host "  Super context: $superContextPath"
    Write-Host "  Super context markdown: $superContextMarkdownPath"
    Write-Host "  Latest super context: $latestSuperContextPath"
}
Write-Host "  Start dev: cmd /c npm run dev -- --project=$Project"
