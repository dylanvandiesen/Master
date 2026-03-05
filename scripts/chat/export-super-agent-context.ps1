[CmdletBinding()]
param(
    [string]$RepoRoot = "",
    [string]$Project = "",
    [string]$SessionId = "",
    [ValidateSet("quick", "standard", "full")]
    [string]$Mode = "standard",
    [string]$OutputPath = ".agency/chat/latest-super-context.json",
    [switch]$EmitMarkdown,
    [string]$MarkdownOutputPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function ConvertTo-Array {
    param([AllowNull()]$Value)
    if ($null -eq $Value) { return @() }
    return @($Value)
}

function Get-ItemCount {
    param([AllowNull()]$Value)
    if ($null -eq $Value) { return 0 }
    return @($Value).Count
}

function Assert-PathExists {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Required path not found: $Path"
    }
}

function Resolve-OutputPath {
    param(
        [Parameter(Mandatory)][string]$RepoRootPath,
        [Parameter(Mandatory)][string]$Path
    )

    if ([System.IO.Path]::IsPathRooted($Path)) {
        return $Path
    }
    return (Join-Path $RepoRootPath $Path)
}

function Get-RepoRelativePath {
    param(
        [Parameter(Mandatory)][string]$RepoRootPath,
        [Parameter(Mandatory)][string]$Path
    )

    $root = $RepoRootPath.TrimEnd("\", "/")
    $absolute = $Path
    if (-not [System.IO.Path]::IsPathRooted($absolute)) {
        $absolute = Join-Path $RepoRootPath $absolute
    }
    if (-not $absolute.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $absolute
    }
    $relative = $absolute.Substring($root.Length).TrimStart("\", "/")
    return ($relative -replace "\\", "/")
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

function Get-SkillSummary {
    param([Parameter(Mandatory)][string]$SkillsDir)

    $items = @()
    if (-not (Test-Path -LiteralPath $SkillsDir)) {
        return $items
    }

    foreach ($skillDir in Get-ChildItem -Path $SkillsDir -Directory | Sort-Object Name) {
        $skillPath = Join-Path $skillDir.FullName "SKILL.md"
        $description = ""
        if (Test-Path -LiteralPath $skillPath) {
            try {
                foreach ($line in Get-Content -Path $skillPath -TotalCount 24) {
                    if ($line -match "^\s*description:\s*(.+)$") {
                        $description = $Matches[1].Trim()
                        break
                    }
                }
            } catch {
                $description = ""
            }
        }

        $items += [ordered]@{
            name = $skillDir.Name
            description = $description
            skillFile = "skills/$($skillDir.Name)/SKILL.md"
        }
    }

    return $items
}

function Get-TasklistCounts {
    param([Parameter(Mandatory)][string]$TasklistPath)

    $counts = [ordered]@{
        active = 0
        backlog = 0
        archived = 0
    }

    if (-not (Test-Path -LiteralPath $TasklistPath)) {
        return $counts
    }

    $currentSection = ""
    foreach ($line in Get-Content -Path $TasklistPath) {
        $trimmed = $line.Trim()
        if ($trimmed -match "^##\s+(Active|Backlog|Archived)\b") {
            $currentSection = $Matches[1].ToLowerInvariant()
            continue
        }
        if ([string]::IsNullOrWhiteSpace($currentSection)) { continue }
        if ($trimmed -match "^-+\s+(\[[xX ]\]\s+)?(.+)$") {
            $counts[$currentSection] = [int]$counts[$currentSection] + 1
        }
    }

    return $counts
}

function Get-DevServerManifestSummary {
    param(
        [Parameter(Mandatory)][string]$RepoRootPath,
        [Parameter(Mandatory)][string]$ManifestDir
    )

    $items = @()
    if (-not (Test-Path -LiteralPath $ManifestDir)) {
        return $items
    }

    foreach ($file in Get-ChildItem -Path $ManifestDir -Filter "*.json" -File | Sort-Object Name) {
        try {
            $json = Get-Content -Raw -Path $file.FullName | ConvertFrom-Json
            $items += [ordered]@{
                file = (Get-RepoRelativePath -RepoRootPath $RepoRootPath -Path $file.FullName)
                id = [string]$json.id
                mode = [string]$json.mode
                url = [string]$json.url
                generatedAt = [string]$json.generatedAt
            }
        } catch {
            $items += [ordered]@{
                file = (Get-RepoRelativePath -RepoRootPath $RepoRootPath -Path $file.FullName)
                id = "unreadable"
                mode = ""
                url = ""
                generatedAt = ""
            }
        }
    }

    return $items
}

function Get-CodexMcpServerNames {
    param([Parameter(Mandatory)][string]$RepoRootPath)

    Push-Location $RepoRootPath
    try {
        $raw = & codex mcp list --json 2>$null
        if ($LASTEXITCODE -ne 0) {
            return @()
        }
    } finally {
        Pop-Location
    }

    $payload = ($raw -join [Environment]::NewLine).Trim()
    if ([string]::IsNullOrWhiteSpace($payload)) {
        return @()
    }

    try {
        return @(
            ($payload | ConvertFrom-Json) |
            Where-Object { $_.enabled } |
            ForEach-Object { [string]$_.name } |
            Sort-Object -Unique
        )
    } catch {
        return @()
    }
}

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $RepoRoot = Join-Path $scriptDir "..\.."
}
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path

Assert-PathExists (Join-Path $RepoRoot "agency.config.json")
Assert-PathExists (Join-Path $RepoRoot "package.json")

$agencyConfigPath = Join-Path $RepoRoot "agency.config.json"
$packageJsonPath = Join-Path $RepoRoot "package.json"
$tasklistPath = Join-Path $RepoRoot "TASKLIST.md"
$mcpStatusPath = Join-Path $RepoRoot ".agency/chat/mcp-status.json"
$manifestDir = Join-Path $RepoRoot ".agency/dev-servers"
$skillsDir = Join-Path $RepoRoot "skills"
$configTomlPath = Join-Path $RepoRoot ".codex/config.toml"

$agencyConfig = Get-Content -Raw -Path $agencyConfigPath | ConvertFrom-Json
if ([string]::IsNullOrWhiteSpace($Project)) {
    $Project = [string]$env:npm_config_project
}
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

$branch = Get-GitText -RepoRootPath $RepoRoot -Args @("rev-parse", "--abbrev-ref", "HEAD")
$commit = Get-GitText -RepoRootPath $RepoRoot -Args @("rev-parse", "--short", "HEAD")
$dirtyCount = 0
try {
    $statusLines = & git -C $RepoRoot status --short 2>$null
    if ($LASTEXITCODE -eq 0 -and $statusLines) {
        $dirtyCount = @($statusLines).Count
    }
} catch {
    $dirtyCount = 0
}

$scriptMap = [ordered]@{}
$scriptNames = @()
try {
    $packageJson = Get-Content -Raw -Path $packageJsonPath | ConvertFrom-Json
    if ($null -ne $packageJson -and $null -ne $packageJson.scripts) {
        foreach ($entry in $packageJson.scripts.PSObject.Properties | Sort-Object Name) {
            $scriptMap[$entry.Name] = [string]$entry.Value
        }
        $scriptNames = @($scriptMap.Keys)
    }
} catch {
    $scriptMap = [ordered]@{}
    $scriptNames = @()
}

$coreScripts = @(
    $scriptNames |
    Where-Object { $_ -match "^(scaffold|list:projects|build(:|$)|dev(:|$)|clean$)" } |
    Sort-Object
)
$chatScripts = @($scriptNames | Where-Object { $_ -match "^chat:" } | Sort-Object)
$mcpScripts = @($scriptNames | Where-Object { $_ -match "^mcp:" } | Sort-Object)
$commanderScripts = @($scriptNames | Where-Object { $_ -match "^commander(:|$)" } | Sort-Object)
$superScripts = @($scriptNames | Where-Object { $_ -match "^super(:|$)" } | Sort-Object)

$configuredMcpServers = Get-CodexMcpServerNames -RepoRootPath $RepoRoot

$mcpStatus = $null
if (Test-Path -LiteralPath $mcpStatusPath) {
    try {
        $mcpStatus = Get-Content -Raw -Path $mcpStatusPath | ConvertFrom-Json
    } catch {
        $mcpStatus = $null
    }
}

$taskCounts = Get-TasklistCounts -TasklistPath $tasklistPath
$skillSummary = Get-SkillSummary -SkillsDir $skillsDir
$devManifests = Get-DevServerManifestSummary -RepoRootPath $RepoRoot -ManifestDir $manifestDir

$latestProjectBriefing = Join-Path $RepoRoot ".agency/chat/latest-briefing.md"
$latestCommanderBriefing = Join-Path $RepoRoot ".agency/chat/latest-commander-briefing.md"
$latestSystemBriefing = Join-Path $RepoRoot ".agency/chat/latest-system-briefing.md"

$sessionRoot = ""
if (-not [string]::IsNullOrWhiteSpace($SessionId)) {
    $sessionRoot = Join-Path $RepoRoot ".agency/chat/sessions/$SessionId"
}

$boundaryPrompt = "This task touches excluded context (<projects source|commander internals>). Please confirm scope and target files so I can proceed safely."
$resolvedOutputPath = Resolve-OutputPath -RepoRootPath $RepoRoot -Path $OutputPath
$resolvedMarkdownPath = ""
if ($EmitMarkdown) {
    if ([string]::IsNullOrWhiteSpace($MarkdownOutputPath)) {
        if ($resolvedOutputPath.ToLowerInvariant().EndsWith(".json")) {
            $resolvedMarkdownPath = "$($resolvedOutputPath.Substring(0, $resolvedOutputPath.Length - 5)).md"
        } else {
            $resolvedMarkdownPath = "$resolvedOutputPath.md"
        }
    } else {
        $resolvedMarkdownPath = Resolve-OutputPath -RepoRootPath $RepoRoot -Path $MarkdownOutputPath
    }
}

$context = [ordered]@{
    schemaVersion = "1.0.0"
    generatedAtUtc = (Get-Date).ToUniversalTime().ToString("o")
    bootstrap = [ordered]@{
        mode = $Mode
        sessionId = $SessionId
    }
    repo = [ordered]@{
        root = $RepoRoot
        branch = $branch
        commit = $commit
        dirtyEntryCount = $dirtyCount
        selectedProject = $Project
        activeProject = [string]$agencyConfig.activeProject
        discoveredProjects = $projectNames
    }
    buildSystem = [ordered]@{
        distDir = [string]$agencyConfig.distDir
        scriptsEngine = [string]$agencyConfig.scripts.engine
        scriptsMode = [string]$agencyConfig.scripts.mode
        serverHost = [string]$agencyConfig.server.host
        serverStartPort = [int]$agencyConfig.server.startPort
        watchDebounceMs = [int]$agencyConfig.watch.debounceMs
        scaffoldMigrateLegacyLayout = [bool]$agencyConfig.scaffold.migrateLegacyLayout
        contracts = @(
            "Root owns dependencies, scripts, and orchestration.",
            "projects/<name>/project.config.json overrides root defaults.",
            "Outputs live in dist/projects/<slug>/.",
            "Dev manifests live in .agency/dev-servers/*.json."
        )
    }
    commands = [ordered]@{
        core = $coreScripts
        chat = $chatScripts
        mcp = $mcpScripts
        commander = $commanderScripts
        super = $superScripts
        scriptMap = $scriptMap
    }
    mcp = [ordered]@{
        projectConfigPath = (Get-RepoRelativePath -RepoRootPath $RepoRoot -Path $configTomlPath)
        configuredServers = $configuredMcpServers
        prepCommand = "cmd /c npm run mcp:prep"
        statusPath = (Get-RepoRelativePath -RepoRootPath $RepoRoot -Path $mcpStatusPath)
        status = $mcpStatus
    }
    skills = $skillSummary
    artifacts = [ordered]@{
        latestBriefings = [ordered]@{
            project = [ordered]@{
                path = (Get-RepoRelativePath -RepoRootPath $RepoRoot -Path $latestProjectBriefing)
                exists = [bool](Test-Path -LiteralPath $latestProjectBriefing)
            }
            commander = [ordered]@{
                path = (Get-RepoRelativePath -RepoRootPath $RepoRoot -Path $latestCommanderBriefing)
                exists = [bool](Test-Path -LiteralPath $latestCommanderBriefing)
            }
            system = [ordered]@{
                path = (Get-RepoRelativePath -RepoRootPath $RepoRoot -Path $latestSystemBriefing)
                exists = [bool](Test-Path -LiteralPath $latestSystemBriefing)
            }
        }
        session = [ordered]@{
            id = $SessionId
            path = if ([string]::IsNullOrWhiteSpace($sessionRoot)) { "" } else { Get-RepoRelativePath -RepoRootPath $RepoRoot -Path $sessionRoot }
            exists = if ([string]::IsNullOrWhiteSpace($sessionRoot)) { $false } else { [bool](Test-Path -LiteralPath $sessionRoot) }
        }
        devServerManifests = $devManifests
        tasklist = [ordered]@{
            path = (Get-RepoRelativePath -RepoRootPath $RepoRoot -Path $tasklistPath)
            counts = $taskCounts
        }
    }
    boundaries = [ordered]@{
        excludedByDefault = @(
            "projects/*/src/**",
            "remote-console/**",
            ".agency/remote/**"
        )
        crossingPrompt = $boundaryPrompt
        notes = @(
            "Commander is awareness-only unless explicit boundary confirmation is provided.",
            "Project source implementation is excluded unless explicit boundary confirmation is provided."
        )
    }
    strategy = [ordered]@{
        startupQuick = @(
            "cmd /c npm run super:bootstrap -- --project=$Project"
        )
        startupFull = @(
            "cmd /c npm run super:bootstrap:full -- --project=$Project"
        )
        speedRules = @(
            "Run mcp:prep once early, then trust mcp-status.json.",
            "Prefer the shortest command sequence that proves behavior.",
            "Persist only durable milestones in memory/tasklist artifacts."
        )
        fallbackRoutes = @(
            "GitHub modern route -> github_local fallback.",
            "commander:start:remote -> commander:local for LAN/debug fallback.",
            "Rebuild manifests by running dev/build if routing is stale."
        )
    }
}

$resolvedOutputDir = Split-Path -Parent $resolvedOutputPath
if (-not [string]::IsNullOrWhiteSpace($resolvedOutputDir)) {
    $null = New-Item -ItemType Directory -Path $resolvedOutputDir -Force
}

$contextJson = $context | ConvertTo-Json -Depth 10
Write-TextNoBom -Path $resolvedOutputPath -Content $contextJson

if ($EmitMarkdown) {
    $markdownDir = Split-Path -Parent $resolvedMarkdownPath
    if (-not [string]::IsNullOrWhiteSpace($markdownDir)) {
        $null = New-Item -ItemType Directory -Path $markdownDir -Force
    }

    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add("# Super Agent Context Bundle")
    $lines.Add("")
    $lines.Add("- Generated (UTC): $($context.generatedAtUtc)")
    $lines.Add("- Selected project: $Project")
    $lines.Add("- Bootstrap mode: $Mode")
    $lines.Add("- Git: branch $branch, commit $commit, dirty entries $dirtyCount")
    $lines.Add("- MCP servers configured: $([string]::Join(', ', (ConvertTo-Array $configuredMcpServers)))")
    $lines.Add("")
    $lines.Add("## Core Startup")
    $lines.Add("1. cmd /c npm run super:bootstrap -- --project=$Project")
    $lines.Add("2. cmd /c npm run super:bootstrap:full -- --project=$Project")
    $lines.Add("")
    $lines.Add("## Command Surface")
    $lines.Add("- Core: $([string]::Join(', ', (ConvertTo-Array $coreScripts)))")
    $lines.Add("- Chat: $([string]::Join(', ', (ConvertTo-Array $chatScripts)))")
    $lines.Add("- MCP: $([string]::Join(', ', (ConvertTo-Array $mcpScripts)))")
    $lines.Add("- Commander: $([string]::Join(', ', (ConvertTo-Array $commanderScripts)))")
    $lines.Add("- Super: $([string]::Join(', ', (ConvertTo-Array $superScripts)))")
    $lines.Add("")
    $lines.Add("## Boundaries")
    $lines.Add("- Excluded by default: projects/*/src/**")
    $lines.Add("- Excluded by default: remote-console/** and .agency/remote/**")
    $lines.Add("- Crossing prompt: $boundaryPrompt")
    $lines.Add("")
    $lines.Add("## Key Artifacts")
    $lines.Add("- .agency/chat/latest-briefing.md")
    $lines.Add("- .agency/chat/latest-commander-briefing.md")
    $lines.Add("- .agency/chat/latest-system-briefing.md")
    $lines.Add("- .agency/chat/mcp-status.json")
    $lines.Add("- .agency/chat/latest-super-context.json")

    [string]::Join("`n", $lines) | Set-Content -Path $resolvedMarkdownPath -Encoding UTF8
}

Write-Host "Super-agent context export complete."
Write-Host "  JSON: $resolvedOutputPath"
if ($EmitMarkdown) {
    Write-Host "  Markdown: $resolvedMarkdownPath"
}
if (-not [string]::IsNullOrWhiteSpace($SessionId)) {
    Write-Host "  Session: $SessionId"
}
