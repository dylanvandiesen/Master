[CmdletBinding()]
param(
    [string]$RepoRoot = "",
    [switch]$SkipEnvLoad,
    [ValidateSet("none", "filesystem", "memory", "github", "github-legacy", "github-modern-docker")]
    [string]$StartServer = "none"
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

function Import-DotEnvFile {
    param([Parameter(Mandatory)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        Write-Warning "No .env file found at $Path. Continuing with current environment."
        return
    }

    foreach ($line in Get-Content -Path $Path) {
        $trimmed = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($trimmed)) { continue }
        if ($trimmed.StartsWith("#")) { continue }

        $parts = $trimmed -split "=", 2
        if ($parts.Count -ne 2) { continue }

        $name = $parts[0].Trim()
        $value = $parts[1].Trim().Trim('"').Trim("'")
        if ([string]::IsNullOrWhiteSpace($name)) { continue }

        $current = [Environment]::GetEnvironmentVariable($name, "Process")
        if ([string]::IsNullOrWhiteSpace($current)) {
            Set-Item -Path "Env:$name" -Value $value
        }
    }
}

function Test-TokenSet {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) { return $false }
    if ($Value -match "^replace_with") { return $false }
    return $true
}

function Resolve-GithubMcpToken {
    param(
        [Parameter(Mandatory)][string]$RepoRoot
    )

    $resolverScript = Join-Path $RepoRoot "scripts/mcp/github-token-resolver.mjs"
    if (-not (Test-Path -LiteralPath $resolverScript)) {
        return [pscustomobject]@{
            ok = $false
            source = "none"
            token = ""
            expiresAt = ""
            reason = "Resolver script not found."
        }
    }

    Write-Host ">> node $resolverScript --format=json --allow-missing=true"
    $raw = & node $resolverScript --format=json --allow-missing=true
    if ($LASTEXITCODE -ne 0) {
        throw "GitHub token resolver failed with exit code ${LASTEXITCODE}."
    }
    $payload = ($raw -join [Environment]::NewLine).Trim()
    if ([string]::IsNullOrWhiteSpace($payload)) {
        return [pscustomobject]@{
            ok = $false
            source = "none"
            token = ""
            expiresAt = ""
            reason = "Resolver returned empty output."
        }
    }
    try {
        return ($payload | ConvertFrom-Json)
    } catch {
        throw "GitHub token resolver returned invalid JSON."
    }
}

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $RepoRoot = Join-Path $scriptDir "..\.."
}
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
$mcpRoot = Join-Path $RepoRoot "mcp"

Assert-PathExists (Join-Path $RepoRoot "config.toml")
Assert-PathExists (Join-Path $RepoRoot ".vscode/mcp.json")
Assert-PathExists (Join-Path $mcpRoot "package.json")

if (-not $SkipEnvLoad) {
    Import-DotEnvFile -Path (Join-Path $RepoRoot ".env")
}

if ([string]::IsNullOrWhiteSpace($env:MEMORY_FILE_PATH)) {
    $env:MEMORY_FILE_PATH = "mcp/data/memory.jsonl"
}

$githubTokenResolution = $null
$githubTokenSource = "none"
$githubTokenExpiresAt = ""
$githubTokenResolutionError = ""
try {
    $githubTokenResolution = Resolve-GithubMcpToken -RepoRoot $RepoRoot
} catch {
    $githubTokenResolutionError = $_.Exception.Message
}

if (-not [string]::IsNullOrWhiteSpace($githubTokenResolutionError)) {
    Write-Warning "GitHub token resolver failed: $githubTokenResolutionError"
} elseif ($null -ne $githubTokenResolution -and [bool]$githubTokenResolution.ok -and (Test-TokenSet $githubTokenResolution.token)) {
    Set-Item -Path "Env:GITHUB_PERSONAL_ACCESS_TOKEN" -Value ([string]$githubTokenResolution.token)
    if (-not (Test-TokenSet $env:GITHUB_MCP_PAT)) {
        Set-Item -Path "Env:GITHUB_MCP_PAT" -Value ([string]$githubTokenResolution.token)
    }
    $githubTokenSource = [string]$githubTokenResolution.source
    $githubTokenExpiresAt = [string]$githubTokenResolution.expiresAt
} elseif ($null -ne $githubTokenResolution -and -not [string]::IsNullOrWhiteSpace([string]$githubTokenResolution.reason)) {
    Write-Warning "GitHub token unavailable: $([string]$githubTokenResolution.reason)"
}

$memoryPath = $env:MEMORY_FILE_PATH
if (-not [System.IO.Path]::IsPathRooted($memoryPath)) {
    $memoryPath = Join-Path $RepoRoot $memoryPath
}

$memoryDir = Split-Path -Parent $memoryPath
$null = New-Item -ItemType Directory -Path $memoryDir -Force
if (-not (Test-Path -LiteralPath $memoryPath)) {
    $null = New-Item -ItemType File -Path $memoryPath -Force
}

$requiredTomlEntries = @(
    "mcp_servers.filesystem_local"
    "mcp_servers.memory_local"
    "mcp_servers.github_local"
    "mcp_servers.github_modern_docker"
)
$missingTomlEntries = @()
foreach ($entry in $requiredTomlEntries) {
    if (-not (Select-String -Path (Join-Path $RepoRoot "config.toml") -Pattern ([regex]::Escape($entry)) -Quiet)) {
        $missingTomlEntries += $entry
    }
}

$vscodeConfig = Get-Content -Raw -Path (Join-Path $RepoRoot ".vscode/mcp.json") | ConvertFrom-Json
$vscodeServers = @($vscodeConfig.servers.PSObject.Properties.Name)
$requiredVscodeServers = @("github_modern_remote", "filesystem_local", "memory_local", "github_legacy_local")
$missingVscodeServers = @($requiredVscodeServers | Where-Object { $_ -notin $vscodeServers })

Invoke-CmdOrThrow -WorkingDirectory $mcpRoot -Command "npm run list"

$serverScripts = @{
    "filesystem" = "start:filesystem"
    "memory" = "start:memory"
    "github" = "start:github"
    "github-legacy" = "start:github:legacy"
    "github-modern-docker" = "start:github:modern:docker"
}

if ($StartServer -eq "github-modern-docker") {
    Write-Host ">> cmd /c docker --version"
    cmd /c docker --version
    if ($LASTEXITCODE -ne 0) {
        throw "Docker is required for StartServer=github-modern-docker."
    }
}

$status = [ordered]@{
    preparedAtUtc = (Get-Date).ToUniversalTime().ToString("o")
    repoRoot = $RepoRoot
    mcpRoot = $mcpRoot
    memoryFile = $memoryPath
    githubTokenLoaded = [bool](Test-TokenSet $env:GITHUB_PERSONAL_ACCESS_TOKEN)
    githubPatLoaded = [bool](Test-TokenSet $env:GITHUB_MCP_PAT)
    githubTokenSource = $githubTokenSource
    githubTokenExpiresAt = $githubTokenExpiresAt
    githubAppFallbackUsed = [bool]($githubTokenSource -eq "github_app")
    githubTokenResolverError = $githubTokenResolutionError
    missingTomlEntries = $missingTomlEntries
    missingVscodeServers = $missingVscodeServers
}
$statusPath = Join-Path $RepoRoot ".agency/chat/mcp-status.json"
$null = New-Item -ItemType Directory -Path (Split-Path -Parent $statusPath) -Force
$status | ConvertTo-Json -Depth 6 | Set-Content -Path $statusPath -Encoding UTF8

Write-Host ""
Write-Host "MCP preparation summary"
Write-Host "  Repo root: $RepoRoot"
Write-Host "  MCP root: $mcpRoot"
Write-Host "  Memory file: $memoryPath"
Write-Host "  GITHUB_PERSONAL_ACCESS_TOKEN loaded: $(Test-TokenSet $env:GITHUB_PERSONAL_ACCESS_TOKEN)"
Write-Host "  GITHUB_MCP_PAT loaded: $(Test-TokenSet $env:GITHUB_MCP_PAT)"
Write-Host "  GitHub token source: $githubTokenSource"
if (-not [string]::IsNullOrWhiteSpace($githubTokenExpiresAt)) {
    Write-Host "  GitHub token expires at: $githubTokenExpiresAt"
}
if (-not [string]::IsNullOrWhiteSpace($githubTokenResolutionError)) {
    Write-Host "  GitHub token resolver error: $githubTokenResolutionError"
}
Write-Host "  Status JSON: $statusPath"

if ($missingTomlEntries.Count -gt 0) {
    Write-Warning "Missing config.toml entries: $($missingTomlEntries -join ', ')"
}
if ($missingVscodeServers.Count -gt 0) {
    Write-Warning "Missing .vscode/mcp.json servers: $($missingVscodeServers -join ', ')"
}

if ($StartServer -ne "none") {
    $scriptName = $serverScripts[$StartServer]
    Write-Host ""
    Write-Host "Starting MCP server '$StartServer' (foreground process)..."
    Invoke-CmdOrThrow -WorkingDirectory $mcpRoot -Command "npm run $scriptName"
} else {
    Write-Host ""
    Write-Host "Start a server on demand:"
    foreach ($name in @("filesystem", "memory", "github-legacy", "github-modern-docker")) {
        Write-Host "  $name -> cmd /c npm --prefix mcp run $($serverScripts[$name])"
    }
}
