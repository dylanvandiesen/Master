[CmdletBinding()]
param(
    [string]$RepoRoot = "",
    [string]$Project,
    [string]$OutputPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-GitText {
    param(
        [Parameter(Mandatory)][string]$RepoRootPath,
        [Parameter(Mandatory)][string[]]$Args,
        [string]$Fallback = "unknown"
    )

    $result = & git -C $RepoRootPath @Args 2>$null
    if ($LASTEXITCODE -ne 0) { return $Fallback }
    if ($null -eq $result) { return $Fallback }
    if ($result -is [array]) { return (($result -join "`n").Trim()) }
    return ([string]$result).Trim()
}

function Get-TasklistSummary {
    param(
        [Parameter(Mandatory)][string]$TasklistPath,
        [int]$MaxItemsPerSection = 6
    )

    $summary = [ordered]@{
        Active = @()
        Backlog = @()
        Archived = @()
    }

    if (-not (Test-Path -LiteralPath $TasklistPath)) {
        return $summary
    }

    $currentSection = $null
    foreach ($line in Get-Content -Path $TasklistPath) {
        $trimmed = $line.Trim()
        if ($trimmed -match "^##\s+(Active|Backlog|Archived)\b") {
            $currentSection = $Matches[1]
            continue
        }
        if (-not $currentSection) { continue }

        if ($trimmed -match "^-+\s+\[[xX ]\]\s+(.+)$") {
            if ($summary[$currentSection].Count -lt $MaxItemsPerSection) {
                $summary[$currentSection] += $Matches[1].Trim()
            }
            continue
        }

        if ($trimmed -match "^-+\s+(.+)$") {
            if ($summary[$currentSection].Count -lt $MaxItemsPerSection) {
                $summary[$currentSection] += $Matches[1].Trim()
            }
        }
    }

    return $summary
}

function Get-DevServerManifestSummary {
    param([Parameter(Mandatory)][string]$ManifestDir)

    $items = @()
    if (-not (Test-Path -LiteralPath $ManifestDir)) {
        return $items
    }

    foreach ($file in Get-ChildItem -Path $ManifestDir -Filter "*.json" -File | Sort-Object Name) {
        try {
            $json = Get-Content -Raw -Path $file.FullName | ConvertFrom-Json
            $items += [pscustomobject]@{
                Id = [string]$json.id
                Mode = [string]$json.mode
                Url = [string]$json.url
                GeneratedAt = [string]$json.generatedAt
            }
        } catch {
            Write-Warning "Skipping unreadable manifest: $($file.FullName)"
        }
    }

    return $items
}

function Test-TokenSet {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $false }
    if ($Value -match "^replace_with") { return $false }
    return $true
}

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $RepoRoot = Join-Path $scriptDir "..\.."
}
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
$agencyConfigPath = Join-Path $RepoRoot "agency.config.json"
if (-not (Test-Path -LiteralPath $agencyConfigPath)) {
    throw "agency.config.json not found at $agencyConfigPath"
}

$agencyConfig = Get-Content -Raw -Path $agencyConfigPath | ConvertFrom-Json
if ([string]::IsNullOrWhiteSpace($Project)) {
    $Project = [string]$agencyConfig.activeProject
}
if ([string]::IsNullOrWhiteSpace($Project)) {
    $Project = "csscroll"
}

$projectsDir = Join-Path $RepoRoot "projects"
$projectNames = @()
if (Test-Path -LiteralPath $projectsDir) {
    $projectNames = @(
        Get-ChildItem -Path $projectsDir -Directory |
        Sort-Object Name |
        Select-Object -ExpandProperty Name
    )
}

$gitDir = Join-Path $RepoRoot ".git"
$branch = "unknown"
$commit = "unknown"
$dirtyCount = 0
if (Test-Path -LiteralPath $gitDir) {
    $branch = Get-GitText -RepoRootPath $RepoRoot -Args @("rev-parse", "--abbrev-ref", "HEAD")
    $commit = Get-GitText -RepoRootPath $RepoRoot -Args @("rev-parse", "--short", "HEAD")
    try {
        $statusLines = & git -C $RepoRoot status --short 2>$null
        if ($LASTEXITCODE -eq 0 -and $statusLines) {
            $dirtyCount = @($statusLines).Count
        }
    } catch {
        $dirtyCount = 0
    }
}

$manifestItems = Get-DevServerManifestSummary -ManifestDir (Join-Path $RepoRoot ".agency/dev-servers")
$taskSummary = Get-TasklistSummary -TasklistPath (Join-Path $RepoRoot "TASKLIST.md")

$mcpConfigText = Get-Content -Raw -Path (Join-Path $RepoRoot "config.toml")
$mcpEnabled = @()
foreach ($entry in @("filesystem_local", "memory_local", "github_local", "github_modern_docker")) {
    if ($mcpConfigText -match ([regex]::Escape("mcp_servers.$entry"))) {
        $mcpEnabled += $entry
    }
}

$now = Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz"
$projectListText = if ($projectNames.Count -gt 0) { $projectNames -join ", " } else { "none" }
$mcpListText = if ($mcpEnabled.Count -gt 0) { $mcpEnabled -join ", " } else { "none" }

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("# New Chat Briefing")
$lines.Add("")
$lines.Add("- Generated: $now")
$lines.Add("- Repo root: $RepoRoot")
$lines.Add("- Git: branch $branch, commit $commit, dirty entries $dirtyCount")
$lines.Add("- Active project target: $Project")
$lines.Add("- Projects discovered: $projectListText")
$lines.Add("")
$lines.Add("## Commands To Run First")
$lines.Add("1. cmd /c npm run chat:new:quick")
$lines.Add("2. cmd /c npm run dev -- --project=$Project")
$lines.Add("3. cmd /c npm run mcp:prep")
$lines.Add("")
$lines.Add("## Agency Snapshot")
$lines.Add("- activeProject: $($agencyConfig.activeProject)")
$lines.Add("- distDir: $($agencyConfig.distDir)")
$lines.Add("- server.startPort: $($agencyConfig.server.startPort)")
$lines.Add("- watch.debounceMs: $($agencyConfig.watch.debounceMs)")
$lines.Add("")
$lines.Add("## MCP Snapshot")
$lines.Add("- Servers in config.toml: $mcpListText")
$lines.Add("- GITHUB_PERSONAL_ACCESS_TOKEN loaded: $(Test-TokenSet $env:GITHUB_PERSONAL_ACCESS_TOKEN)")
$lines.Add("- GITHUB_MCP_PAT loaded: $(Test-TokenSet $env:GITHUB_MCP_PAT)")
$lines.Add("")
$lines.Add("## Dev Server Manifests")
if ($manifestItems.Count -eq 0) {
    $lines.Add("- No .agency/dev-servers/*.json files found.")
} else {
    foreach ($item in $manifestItems) {
        $lines.Add("- $($item.Id) [$($item.Mode)] -> $($item.Url) ($($item.GeneratedAt))")
    }
}
$lines.Add("")
$lines.Add("## Shared Tasklist Snapshot")
foreach ($section in @("Active", "Backlog", "Archived")) {
    $lines.Add("### $section")
    $entries = $taskSummary[$section]
    if ($entries.Count -eq 0) {
        $lines.Add("- No entries found.")
    } else {
        foreach ($entry in $entries) {
            $lines.Add("- $entry")
        }
    }
    $lines.Add("")
}

$briefingText = [string]::Join("`n", $lines)

if (-not [string]::IsNullOrWhiteSpace($OutputPath)) {
    $resolvedOutput = $OutputPath
    if (-not [System.IO.Path]::IsPathRooted($resolvedOutput)) {
        $resolvedOutput = Join-Path $RepoRoot $resolvedOutput
    }

    $outputDir = Split-Path -Parent $resolvedOutput
    if (-not [string]::IsNullOrWhiteSpace($outputDir)) {
        $null = New-Item -ItemType Directory -Path $outputDir -Force
    }

    $briefingText | Set-Content -Path $resolvedOutput -Encoding UTF8
}

$briefingText
