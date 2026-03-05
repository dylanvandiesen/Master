[CmdletBinding()]
param(
    [string]$RepoRoot = "",
    [string]$Project = "",
    [string]$SessionId = "",
    [ValidateSet("quick", "standard", "full")]
    [string]$Mode = "quick",
    [switch]$SkipMcpPrep,
    [switch]$SkipBriefingRefresh,
    [switch]$SkipContextExport
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

function Get-LatestSessionId {
    param([Parameter(Mandatory)][string]$SessionsRoot)

    if (-not (Test-Path -LiteralPath $SessionsRoot)) {
        return ""
    }

    $latest = Get-ChildItem -Path $SessionsRoot -Directory -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTimeUtc -Descending |
        Select-Object -First 1
    if ($null -eq $latest) {
        return ""
    }
    return [string]$latest.Name
}

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $RepoRoot = Join-Path $scriptDir "..\.."
}
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path

Assert-PathExists (Join-Path $RepoRoot "package.json")
Assert-PathExists (Join-Path $RepoRoot "agency.config.json")

$agencyConfig = Get-Content -Raw -Path (Join-Path $RepoRoot "agency.config.json") | ConvertFrom-Json
if ([string]::IsNullOrWhiteSpace($Project)) {
    $Project = [string]$env:npm_config_project
}
if ([string]::IsNullOrWhiteSpace($Project)) {
    $Project = [string]$agencyConfig.activeProject
}
if ([string]::IsNullOrWhiteSpace($Project)) {
    $Project = "csscroll"
}

$chatScript = switch ($Mode) {
    "quick" { "chat:new:quick" }
    "full" { "chat:new:full" }
    default { "chat:new:standard" }
}

$forwardArgs = @("--project=$Project")
if (-not $SkipContextExport) {
    # Avoid duplicate context generation during chat:new; bootstrap exports final context after MCP/briefing refresh.
    $forwardArgs += "--nosupercontext=true"
}
if (-not [string]::IsNullOrWhiteSpace($SessionId)) {
    $forwardArgs += "--session=$SessionId"
}

$chatCommand = "npm run $chatScript -- $($forwardArgs -join ' ')"
Invoke-CmdOrThrow -WorkingDirectory $RepoRoot -Command $chatCommand

if (-not $SkipMcpPrep) {
    Invoke-CmdOrThrow -WorkingDirectory $RepoRoot -Command "npm run mcp:prep"
}

if (-not $SkipBriefingRefresh) {
    Invoke-CmdOrThrow -WorkingDirectory $RepoRoot -Command "npm run chat:briefing"
}

$sessionsRoot = Join-Path $RepoRoot ".agency/chat/sessions"
$effectiveSessionId = $SessionId
if ([string]::IsNullOrWhiteSpace($effectiveSessionId)) {
    $effectiveSessionId = Get-LatestSessionId -SessionsRoot $sessionsRoot
}

if (-not $SkipContextExport) {
    $contextScript = Join-Path $RepoRoot "scripts/chat/export-super-agent-context.ps1"
    Assert-PathExists $contextScript

    & $contextScript `
        -RepoRoot $RepoRoot `
        -Project $Project `
        -SessionId $effectiveSessionId `
        -Mode $Mode `
        -OutputPath ".agency/chat/latest-super-context.json" `
        -EmitMarkdown `
        -MarkdownOutputPath ".agency/chat/latest-super-context.md" | Out-Host

    if (-not [string]::IsNullOrWhiteSpace($effectiveSessionId)) {
        $sessionContextJson = ".agency/chat/sessions/$effectiveSessionId/super-context.json"
        $sessionContextMarkdown = ".agency/chat/sessions/$effectiveSessionId/super-context.md"

        & $contextScript `
            -RepoRoot $RepoRoot `
            -Project $Project `
            -SessionId $effectiveSessionId `
            -Mode $Mode `
            -OutputPath $sessionContextJson `
            -EmitMarkdown `
            -MarkdownOutputPath $sessionContextMarkdown | Out-Host
    }
}

Write-Host ""
Write-Host "Super-agent bootstrap complete:"
Write-Host "  Mode: $Mode"
Write-Host "  Project: $Project"
if (-not [string]::IsNullOrWhiteSpace($effectiveSessionId)) {
    Write-Host "  Session: $effectiveSessionId"
}
Write-Host "  Latest context: .agency/chat/latest-super-context.json"
Write-Host "  Latest context markdown: .agency/chat/latest-super-context.md"
