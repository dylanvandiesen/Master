[CmdletBinding()]
param(
    [string]$RepoRoot = "",
    [string]$Project,
    [string]$OutputPath,
    [ValidateSet("project", "commander", "system")]
    [string]$Mode = "project"
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

function Get-ObjectPropertyValue {
    param(
        [AllowNull()]$Object,
        [Parameter(Mandatory)][string]$Name,
        [string]$Fallback = ""
    )

    if ($null -eq $Object) { return $Fallback }
    $prop = $Object.PSObject.Properties[$Name]
    if ($null -eq $prop) { return $Fallback }
    if ($null -eq $prop.Value) { return $Fallback }
    return [string]$prop.Value
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
            $currentItems = $summary[$currentSection]
            if ((Get-ItemCount -Value $currentItems) -lt $MaxItemsPerSection) {
                $summary[$currentSection] += $Matches[1].Trim()
            }
            continue
        }

        if ($trimmed -match "^-+\s+(.+)$") {
            $currentItems = $summary[$currentSection]
            if ((Get-ItemCount -Value $currentItems) -lt $MaxItemsPerSection) {
                $summary[$currentSection] += $Matches[1].Trim()
            }
        }
    }

    return $summary
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
                foreach ($line in Get-Content -Path $skillPath -TotalCount 20) {
                    if ($line -match "^\s*description:\s*(.+)$") {
                        $description = $Matches[1].Trim()
                        break
                    }
                }
            } catch {
                $description = ""
            }
        }

        $items += [pscustomobject]@{
            Name = $skillDir.Name
            Description = $description
            Path = "skills/$($skillDir.Name)/SKILL.md"
        }
    }

    return $items
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

function ConvertTo-Slug {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return "" }
    $slug = $Value.ToLowerInvariant()
    $slug = [regex]::Replace($slug, "[^a-z0-9]+", "-")
    $slug = $slug.Trim("-")
    return $slug
}

function Resolve-ProjectSnapshot {
    param(
        [Parameter(Mandatory)][string]$RepoRootPath,
        [Parameter(Mandatory)][string]$ProjectsDir,
        [Parameter(Mandatory)][string]$ProjectValue,
        [string]$DistDir = "dist/projects"
    )

    $requestedSlug = ConvertTo-Slug -Value $ProjectValue
    $snapshot = [ordered]@{
        Requested = $ProjectValue
        Name = $ProjectValue
        Slug = $requestedSlug
        Exists = $false
        ProjectPath = ""
        SrcPath = ""
        ConfigPath = ""
        DistPath = ""
    }

    $distRoot = $DistDir
    if (-not [System.IO.Path]::IsPathRooted($distRoot)) {
        $distRoot = Join-Path $RepoRootPath $distRoot
    }

    if (-not (Test-Path -LiteralPath $ProjectsDir)) {
        $snapshot.DistPath = Join-Path $distRoot $requestedSlug
        return $snapshot
    }

    $projectDirs = Get-ChildItem -Path $ProjectsDir -Directory -ErrorAction SilentlyContinue
    $resolved = $null

    if ($projectDirs) {
        $resolved = $projectDirs | Where-Object { $_.Name -ieq $ProjectValue } | Select-Object -First 1
        if ($null -eq $resolved -and -not [string]::IsNullOrWhiteSpace($requestedSlug)) {
            $resolved = $projectDirs |
                Where-Object { (ConvertTo-Slug -Value $_.Name) -eq $requestedSlug } |
                Select-Object -First 1
        }
    }

    if ($null -ne $resolved) {
        $snapshot.Name = $resolved.Name
        $snapshot.Slug = ConvertTo-Slug -Value $resolved.Name
        $snapshot.Exists = $true
        $snapshot.ProjectPath = $resolved.FullName
    } else {
        $snapshot.ProjectPath = Join-Path $ProjectsDir $ProjectValue
    }

    $snapshot.SrcPath = Join-Path $snapshot.ProjectPath "src"
    $snapshot.ConfigPath = Join-Path $snapshot.ProjectPath "project.config.json"
    $snapshot.DistPath = Join-Path $distRoot $snapshot.Slug

    return $snapshot
}

function Get-ProjectConfigSummary {
    param([Parameter(Mandatory)][string]$ConfigPath)

    $summary = [ordered]@{
        Exists = $false
        ParseError = ""
        TopLevelKeys = @()
        ScriptsEngine = ""
        ScriptsMode = ""
    }

    if (-not (Test-Path -LiteralPath $ConfigPath)) {
        return $summary
    }

    $summary.Exists = $true
    try {
        $json = Get-Content -Raw -Path $ConfigPath | ConvertFrom-Json
        if ($null -ne $json) {
            $summary.TopLevelKeys = @($json.PSObject.Properties.Name | Sort-Object)
            if ($null -ne $json.PSObject.Properties["scripts"] -and $null -ne $json.scripts) {
                $summary.ScriptsEngine = Get-ObjectPropertyValue -Object $json.scripts -Name "engine"
                $summary.ScriptsMode = Get-ObjectPropertyValue -Object $json.scripts -Name "mode"
            }
        }
    } catch {
        $summary.ParseError = $_.Exception.Message
    }

    return $summary
}

function Get-ProjectSourceSummary {
    param(
        [Parameter(Mandatory)][string]$RepoRootPath,
        [Parameter(Mandatory)][string]$SrcPath,
        [int]$MaxExtensions = 8,
        [int]$MaxEntries = 8
    )

    $summary = [ordered]@{
        Exists = $false
        FileCount = 0
        DirectoryCount = 0
        TopLevelDirectories = @()
        ExtensionBreakdown = @()
        EntryFiles = @()
    }

    if (-not (Test-Path -LiteralPath $SrcPath)) {
        return $summary
    }

    $summary.Exists = $true
    $files = @(Get-ChildItem -Path $SrcPath -Recurse -File -ErrorAction SilentlyContinue)
    $dirs = @(Get-ChildItem -Path $SrcPath -Recurse -Directory -ErrorAction SilentlyContinue)

    $summary.FileCount = Get-ItemCount -Value $files
    $summary.DirectoryCount = Get-ItemCount -Value $dirs
    $summary.TopLevelDirectories = @(
        Get-ChildItem -Path $SrcPath -Directory -ErrorAction SilentlyContinue |
        Sort-Object Name |
        Select-Object -ExpandProperty Name
    )

    if ($summary.FileCount -gt 0) {
        $extGroups = $files |
            ForEach-Object {
                $ext = [string]$_.Extension
                if ([string]::IsNullOrWhiteSpace($ext)) { "[no-ext]" } else { $ext.ToLowerInvariant() }
            } |
            Group-Object |
            Sort-Object -Property @{Expression = "Count"; Descending = $true }, @{Expression = "Name"; Descending = $false }

        $extensionRows = @()
        foreach ($group in $extGroups | Select-Object -First $MaxExtensions) {
            $extensionRows += "$($group.Name): $($group.Count)"
        }
        $summary.ExtensionBreakdown = $extensionRows

        $entryFileNames = @(
            "index.html",
            "main.scss",
            "main.css",
            "main.js",
            "app.js",
            "app.ts",
            "index.js",
            "index.ts"
        )
        $entryFiles = @(
            $files |
            Where-Object { $_.Name -in $entryFileNames } |
            Sort-Object FullName |
            Select-Object -First $MaxEntries
        )
        $summary.EntryFiles = @(
            $entryFiles |
            ForEach-Object { Get-RepoRelativePath -RepoRootPath $RepoRootPath -Path $_.FullName }
        )
    }

    return $summary
}

function Get-DirectorySnapshot {
    param(
        [Parameter(Mandatory)][string]$RepoRootPath,
        [Parameter(Mandatory)][string]$Path,
        [int]$MaxSampleFiles = 8
    )

    $summary = [ordered]@{
        Exists = $false
        FileCount = 0
        DirectoryCount = 0
        SizeBytes = 0
        SampleFiles = @()
    }

    if (-not (Test-Path -LiteralPath $Path)) {
        return $summary
    }

    $summary.Exists = $true
    $files = @(Get-ChildItem -Path $Path -Recurse -File -ErrorAction SilentlyContinue)
    $dirs = @(Get-ChildItem -Path $Path -Recurse -Directory -ErrorAction SilentlyContinue)
    $summary.FileCount = Get-ItemCount -Value $files
    $summary.DirectoryCount = Get-ItemCount -Value $dirs
    if ($summary.FileCount -gt 0) {
        $size = ($files | Measure-Object -Property Length -Sum).Sum
        if ($null -eq $size) { $size = 0 }
        $summary.SizeBytes = [int64]$size
        $summary.SampleFiles = @(
            $files |
            Sort-Object FullName |
            Select-Object -First $MaxSampleFiles |
            ForEach-Object { Get-RepoRelativePath -RepoRootPath $RepoRootPath -Path $_.FullName }
        )
    }

    return $summary
}

function Get-ProjectDirtySummary {
    param(
        [AllowNull()]$StatusLines,
        [Parameter(Mandatory)][string]$ProjectName,
        [Parameter(Mandatory)][string]$ProjectSlug,
        [int]$MaxItems = 12
    )

    $prefixes = @()
    if (-not [string]::IsNullOrWhiteSpace($ProjectName)) {
        $prefixes += "projects/$ProjectName/"
    }
    if (-not [string]::IsNullOrWhiteSpace($ProjectSlug)) {
        $prefixes += "projects/$ProjectSlug/"
    }
    $prefixes = @($prefixes | ForEach-Object { $_.ToLowerInvariant() } | Sort-Object -Unique)

    $matches = @()
    if ((Get-ItemCount -Value $prefixes) -eq 0) {
        return $matches
    }

    foreach ($line in ConvertTo-Array $StatusLines) {
        $raw = [string]$line
        if ([string]::IsNullOrWhiteSpace($raw)) { continue }

        $trimmed = $raw.TrimEnd()
        $statusCode = if ($trimmed.Length -ge 2) { $trimmed.Substring(0, 2).Trim() } else { "?" }
        $pathPart = if ($trimmed.Length -gt 3) { $trimmed.Substring(3).Trim() } else { $trimmed.Trim() }
        if ($pathPart -match "\s+->\s+") {
            $pathPart = ($pathPart -split "\s+->\s+")[-1]
        }
        $normalizedPath = ($pathPart -replace "\\", "/")
        $lowerPath = $normalizedPath.ToLowerInvariant()

        $isProjectPath = $false
        foreach ($prefix in $prefixes) {
            if ($lowerPath.StartsWith($prefix)) {
                $isProjectPath = $true
                break
            }
        }
        if (-not $isProjectPath) { continue }

        $matches += "$statusCode $normalizedPath"
    }

    return @($matches | Select-Object -Unique | Select-Object -First $MaxItems)
}

function Test-TokenSet {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $false }
    if ($Value -match "^replace_with") { return $false }
    return $true
}

function Get-CommanderRuntimeSnapshot {
    param([Parameter(Mandatory)][string]$RepoRootPath)

    $remoteRoot = Join-Path $RepoRootPath ".agency/remote"
    $snapshot = [ordered]@{
        RuntimeConfig = $null
        CredentialsFileExists = $false
        SessionStoreExists = $false
        PanelSessionsFileExists = $false
        ActiveRelayStates = @()
        InboxCount = 0
        OutboxCount = 0
    }

    if (-not (Test-Path -LiteralPath $remoteRoot)) {
        return $snapshot
    }

    $runtimePath = Join-Path $remoteRoot "panel-runtime.json"
    if (Test-Path -LiteralPath $runtimePath) {
        try {
            $snapshot.RuntimeConfig = Get-Content -Raw -Path $runtimePath | ConvertFrom-Json
        } catch {
            $snapshot.RuntimeConfig = $null
        }
    }

    $snapshot.CredentialsFileExists = Test-Path -LiteralPath (Join-Path $remoteRoot "panel-credentials.json")
    $snapshot.SessionStoreExists = Test-Path -LiteralPath (Join-Path $remoteRoot "panel-sessions.json")
    $snapshot.PanelSessionsFileExists = Test-Path -LiteralPath (Join-Path $remoteRoot "codex-sessions.json")

    $relayStates = @()
    foreach ($relayFile in Get-ChildItem -Path $remoteRoot -Filter "relay-state-*.json" -File -ErrorAction SilentlyContinue | Sort-Object Name) {
        try {
            $relayJson = Get-Content -Raw -Path $relayFile.FullName | ConvertFrom-Json
            $sessionName = Get-ObjectPropertyValue -Object $relayJson -Name "sessionName"
            if ([string]::IsNullOrWhiteSpace($sessionName)) {
                $sessionName = Get-ObjectPropertyValue -Object $relayJson -Name "session"
            }

            $lastPrompt = Get-ObjectPropertyValue -Object $relayJson -Name "lastPromptAt"
            if ([string]::IsNullOrWhiteSpace($lastPrompt)) {
                $lastPrompt = Get-ObjectPropertyValue -Object $relayJson -Name "lastInboxFile"
            }

            $lastReply = Get-ObjectPropertyValue -Object $relayJson -Name "lastReplyAt"
            if ([string]::IsNullOrWhiteSpace($lastReply)) {
                $lastReply = Get-ObjectPropertyValue -Object $relayJson -Name "lastOutboxFile"
            }

            $relayStates += [pscustomobject]@{
                File = $relayFile.Name
                SessionName = $sessionName
                LastPromptAt = $lastPrompt
                LastReplyAt = $lastReply
            }
        } catch {
            $relayStates += [pscustomobject]@{
                File = $relayFile.Name
                SessionName = "unreadable"
                LastPromptAt = ""
                LastReplyAt = ""
            }
        }
    }
    $snapshot.ActiveRelayStates = $relayStates

    $snapshot.InboxCount = Get-ItemCount (Get-ChildItem -Path (Join-Path $remoteRoot "inbox") -File -ErrorAction SilentlyContinue)
    $snapshot.OutboxCount = Get-ItemCount (Get-ChildItem -Path (Join-Path $remoteRoot "outbox") -File -ErrorAction SilentlyContinue)

    return $snapshot
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
$statusLines = @()
if (Test-Path -LiteralPath $gitDir) {
    $branch = Get-GitText -RepoRootPath $RepoRoot -Args @("rev-parse", "--abbrev-ref", "HEAD")
    $commit = Get-GitText -RepoRootPath $RepoRoot -Args @("rev-parse", "--short", "HEAD")
    try {
        $statusLines = @(& git -C $RepoRoot status --short 2>$null)
        if ($LASTEXITCODE -eq 0 -and $statusLines) {
            $dirtyCount = @($statusLines).Count
        }
    } catch {
        $dirtyCount = 0
    }
}

$manifestItems = Get-DevServerManifestSummary -ManifestDir (Join-Path $RepoRoot ".agency/dev-servers")
$taskSummary = Get-TasklistSummary -TasklistPath (Join-Path $RepoRoot "TASKLIST.md")
$skillSummary = Get-SkillSummary -SkillsDir (Join-Path $RepoRoot "skills")
$commanderSnapshot = Get-CommanderRuntimeSnapshot -RepoRootPath $RepoRoot
$codexConfigPath = Join-Path $RepoRoot ".codex/config.toml"
$mcpEnabled = Get-CodexMcpServerNames -RepoRootPath $RepoRoot

$packageScriptNames = @()
$systemScriptNames = @()
$commanderScriptNames = @()
$packageJsonPath = Join-Path $RepoRoot "package.json"
if (Test-Path -LiteralPath $packageJsonPath) {
    try {
        $packageJson = Get-Content -Raw -Path $packageJsonPath | ConvertFrom-Json
        if ($null -ne $packageJson -and $null -ne $packageJson.PSObject.Properties["scripts"] -and $null -ne $packageJson.scripts) {
            $packageScriptNames = @($packageJson.scripts.PSObject.Properties.Name | Sort-Object)
            $systemScriptNames = @(
                $packageScriptNames |
                Where-Object {
                    $_ -match "^(scaffold|list:projects|build(:|$)|dev(:|$)|clean$|chat:new(:|$)|chat:briefing(:|$)|mcp:prep$|mcp:start:|skills:list$|skills:validate$|super(:|$))"
                } |
                Sort-Object
            )
            $commanderScriptNames = @($packageScriptNames | Where-Object { $_ -match "^commander(:|$)" } | Sort-Object)
        }
    } catch {
        $packageScriptNames = @()
    }
}

$projectScriptNames = @(
    $packageScriptNames |
    Where-Object {
        $_ -match "^(scaffold|list:projects|build(:|$)|dev(:|$)|chat:new(:|$)|chat:briefing(:project|$)|mcp:prep$|super:bootstrap(:|$)|super:context$)"
    } |
    Sort-Object
)

$projectSnapshot = Resolve-ProjectSnapshot -RepoRootPath $RepoRoot -ProjectsDir $projectsDir -ProjectValue $Project -DistDir ([string]$agencyConfig.distDir)
if ($projectSnapshot.Exists -and -not [string]::IsNullOrWhiteSpace([string]$projectSnapshot.Name)) {
    $Project = [string]$projectSnapshot.Name
}

$projectTargetText = if ($projectSnapshot.Exists) {
    "$($projectSnapshot.Name) (slug $($projectSnapshot.Slug))"
} else {
    "$Project (unresolved)"
}
$projectRootText = if ([string]::IsNullOrWhiteSpace($projectSnapshot.ProjectPath)) { "unknown" } else { Get-RepoRelativePath -RepoRootPath $RepoRoot -Path $projectSnapshot.ProjectPath }
$projectSrcText = if ([string]::IsNullOrWhiteSpace($projectSnapshot.SrcPath)) { "unknown" } else { Get-RepoRelativePath -RepoRootPath $RepoRoot -Path $projectSnapshot.SrcPath }
$projectConfigText = if ([string]::IsNullOrWhiteSpace($projectSnapshot.ConfigPath)) { "unknown" } else { Get-RepoRelativePath -RepoRootPath $RepoRoot -Path $projectSnapshot.ConfigPath }
$projectDistText = if ([string]::IsNullOrWhiteSpace($projectSnapshot.DistPath)) { "unknown" } else { Get-RepoRelativePath -RepoRootPath $RepoRoot -Path $projectSnapshot.DistPath }

$projectConfigSummary = Get-ProjectConfigSummary -ConfigPath $projectSnapshot.ConfigPath
$projectSourceSummary = Get-ProjectSourceSummary -RepoRootPath $RepoRoot -SrcPath $projectSnapshot.SrcPath
$projectDistSummary = Get-DirectorySnapshot -RepoRootPath $RepoRoot -Path $projectSnapshot.DistPath
$projectDirtySummary = Get-ProjectDirtySummary -StatusLines $statusLines -ProjectName $projectSnapshot.Name -ProjectSlug $projectSnapshot.Slug
$projectCommandTarget = if ([string]::IsNullOrWhiteSpace([string]$projectSnapshot.Slug)) { $Project } else { [string]$projectSnapshot.Slug }

$projectManifestItems = @(
    ConvertTo-Array $manifestItems |
    Where-Object {
        $id = [string]$_.Id
        $url = [string]$_.Url
        $slug = [string]$projectSnapshot.Slug
        if ([string]::IsNullOrWhiteSpace($slug)) { return $false }
        return (
            $id.ToLowerInvariant() -like "*$($slug.ToLowerInvariant())*" -or
            $url.ToLowerInvariant() -like "*/$($slug.ToLowerInvariant())/*" -or
            $url.ToLowerInvariant().EndsWith("/$($slug.ToLowerInvariant())")
        )
    }
)

$projectScopedSkills = @(
    ConvertTo-Array $skillSummary |
    Where-Object { $_.Name -in @("agency-playground-ops", "chat-instance-bootstrap", "mcp-orchestration-ops") }
)
if ((Get-ItemCount -Value $projectScopedSkills) -eq 0) {
    $projectScopedSkills = ConvertTo-Array $skillSummary
}

$now = Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz"
$projectListText = if ((Get-ItemCount $projectNames) -gt 0) { (ConvertTo-Array $projectNames) -join ", " } else { "none" }
$mcpListText = if ((Get-ItemCount $mcpEnabled) -gt 0) { (ConvertTo-Array $mcpEnabled) -join ", " } else { "none" }

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("# New Chat Briefing ($Mode)")
$lines.Add("")
$lines.Add("- Generated: $now")
$lines.Add("- Repo root: $RepoRoot")
$lines.Add("- Git: branch $branch, commit $commit, dirty entries $dirtyCount")
$lines.Add("- Active project target: $projectTargetText")
$lines.Add("- Projects discovered: $projectListText")
$lines.Add("- Codex project config: $(Get-RepoRelativePath -RepoRootPath $RepoRoot -Path $codexConfigPath)")
$lines.Add("- Effective Codex MCP servers: $mcpListText")
$lines.Add("")
$lines.Add("## MCP + Skills Super-Agent Strategy")
$lines.Add("1. Establish baseline: cmd /c npm run super:bootstrap -- --project=$projectCommandTarget (fallback: mcp:prep + chat:briefing).")
$lines.Add("2. Prioritize tool route per task:")
$lines.Add("   - filesystem_local for all repo reads/writes/search before shell fallbacks.")
$lines.Add("   - memory_local for durable findings, decisions, and relay context continuity.")
$lines.Add("   - github_modern_remote first for hosted GitHub ops; github_local fallback when remote auth/path fails.")
$lines.Add("3. Use local skills intentionally (not passively):")
$lines.Add("   - chat-instance-bootstrap for fresh-session prep and startup guardrails.")
$lines.Add("   - mcp-orchestration-ops for token/server routing and MCP incident response.")
$lines.Add("   - agency-playground-ops for scaffold/build/dev/project-contract tasks.")
$lines.Add("4. Preserve context without sacrificing speed:")
$lines.Add("   - Keep task deltas in TASKLIST.md (Active/Backlog/Archived only).")
$lines.Add("   - Keep relay memory in mcp/data/memory.jsonl and project notes in .agency/remote/project-memory/*.md.")
if ($Mode -eq "project") {
    $lines.Add("   - Keep project briefings current: .agency/chat/latest-briefing.md and session briefing.md files.")
} else {
    $lines.Add("   - Keep system bundle in .agency/chat/latest-super-context.json for machine-readable startup state.")
}
$lines.Add("   - Use short command loops: scaffold -> list:projects -> build -> dev only when needed.")
$lines.Add("5. Maintain concurrency safety:")
$lines.Add("   - Never revert unknown changes; re-read target files before edits.")
$lines.Add("   - Use unique relay session names and explicit file ownership in parallel work.")
$lines.Add("")

if ($Mode -eq "project") {
    $lines.Add("## Project Scope")
    $lines.Add("This briefing is project-only for `projects/$($projectSnapshot.Name)` and excludes commander/runtime internals.")
    $lines.Add("- Included: selected project source, config, manifests, and dist output.")
    $lines.Add("- Excluded by default: other project implementations and commander internals (remote-console/**, .agency/remote/**).")
    $lines.Add("")
    $lines.Add("## Project Startup Sequence")
    $lines.Add("1. cmd /c npm run super:bootstrap -- --project=$($projectSnapshot.Slug)")
    $lines.Add("2. cmd /c npm run dev -- --project=$($projectSnapshot.Slug)")
    $lines.Add("3. cmd /c npm run build -- --project=$($projectSnapshot.Slug)")
    $lines.Add("4. cmd /c npm run chat:briefing:project")
    $lines.Add("")
    $lines.Add("## Project Identity Snapshot")
    $lines.Add("- project.name: $($projectSnapshot.Name)")
    $lines.Add("- project.slug: $($projectSnapshot.Slug)")
    $lines.Add("- project.root: $projectRootText")
    $lines.Add("- project.src: $projectSrcText (exists: $($projectSourceSummary.Exists))")
    $lines.Add("- project.config: $projectConfigText (exists: $($projectConfigSummary.Exists))")
    $lines.Add("- project.dist: $projectDistText (exists: $($projectDistSummary.Exists))")
    $lines.Add("- agency.activeProject: $($agencyConfig.activeProject)")
    $lines.Add("")
    $lines.Add("## Project Config Snapshot")
    if (-not $projectConfigSummary.Exists) {
        $lines.Add("- No project.config.json found; root defaults apply.")
    } elseif (-not [string]::IsNullOrWhiteSpace([string]$projectConfigSummary.ParseError)) {
        $lines.Add("- project.config.json exists but could not be parsed: $($projectConfigSummary.ParseError)")
    } else {
        $topLevelKeys = ConvertTo-Array $projectConfigSummary.TopLevelKeys
        $keysText = if ((Get-ItemCount -Value $topLevelKeys) -gt 0) { $topLevelKeys -join ", " } else { "none" }
        $engineText = if ([string]::IsNullOrWhiteSpace([string]$projectConfigSummary.ScriptsEngine)) { "default" } else { [string]$projectConfigSummary.ScriptsEngine }
        $modeText = if ([string]::IsNullOrWhiteSpace([string]$projectConfigSummary.ScriptsMode)) { "default" } else { [string]$projectConfigSummary.ScriptsMode }
        $lines.Add("- top-level keys: $keysText")
        $lines.Add("- scripts.engine override: $engineText")
        $lines.Add("- scripts.mode override: $modeText")
    }
    $lines.Add("")
    $lines.Add("## Project Command Surface")
    if ((Get-ItemCount -Value $projectScriptNames) -eq 0) {
        $lines.Add("- No project command scripts parsed from package.json.")
    } else {
        foreach ($scriptName in ConvertTo-Array $projectScriptNames) {
            $lines.Add("- npm run $scriptName")
        }
    }
    $lines.Add("")
    $lines.Add("## Project Source Snapshot")
    if (-not $projectSourceSummary.Exists) {
        $lines.Add("- Source directory not found for selected project.")
    } else {
        $lines.Add("- src file count: $($projectSourceSummary.FileCount)")
        $lines.Add("- src directory count: $($projectSourceSummary.DirectoryCount)")
        $topDirs = ConvertTo-Array $projectSourceSummary.TopLevelDirectories
        $lines.Add("- src top-level folders: $(if ((Get-ItemCount -Value $topDirs) -gt 0) { $topDirs -join ', ' } else { 'none' })")
        $extRows = ConvertTo-Array $projectSourceSummary.ExtensionBreakdown
        if ((Get-ItemCount -Value $extRows) -gt 0) {
            $lines.Add("- extension breakdown:")
            foreach ($row in $extRows) {
                $lines.Add("  - $row")
            }
        } else {
            $lines.Add("- extension breakdown: none")
        }
        $entryFiles = ConvertTo-Array $projectSourceSummary.EntryFiles
        if ((Get-ItemCount -Value $entryFiles) -gt 0) {
            $lines.Add("- key entry files:")
            foreach ($entry in $entryFiles) {
                $lines.Add("  - $entry")
            }
        }
    }
    $lines.Add("")
    $lines.Add("## Project Dist Snapshot")
    if (-not $projectDistSummary.Exists) {
        $lines.Add("- Dist output folder does not exist yet; run build/dev first.")
    } else {
        $distSizeMb = [Math]::Round(([double]$projectDistSummary.SizeBytes / 1MB), 2)
        $lines.Add("- dist file count: $($projectDistSummary.FileCount)")
        $lines.Add("- dist directory count: $($projectDistSummary.DirectoryCount)")
        $lines.Add("- dist size (MB): $distSizeMb")
        $sampleFiles = ConvertTo-Array $projectDistSummary.SampleFiles
        if ((Get-ItemCount -Value $sampleFiles) -gt 0) {
            $lines.Add("- dist sample files:")
            foreach ($sample in $sampleFiles) {
                $lines.Add("  - $sample")
            }
        }
    }
    $lines.Add("")
    $lines.Add("## Project Dev Manifest Snapshot")
    if ((Get-ItemCount -Value $projectManifestItems) -eq 0) {
        $lines.Add("- No matching dev manifest found for slug '$($projectSnapshot.Slug)'.")
    } else {
        foreach ($item in ConvertTo-Array $projectManifestItems) {
            $lines.Add("- $($item.Id) [$($item.Mode)] -> $($item.Url) ($($item.GeneratedAt))")
        }
    }
    $lines.Add("")
    $lines.Add("## Project Working Tree Snapshot")
    if ((Get-ItemCount -Value $projectDirtySummary) -eq 0) {
        $lines.Add("- No dirty files detected under this project path.")
    } else {
        foreach ($dirty in ConvertTo-Array $projectDirtySummary) {
            $lines.Add("- $dirty")
        }
    }
    $lines.Add("")
    $lines.Add("## Project Skills Snapshot")
    if ((Get-ItemCount -Value $projectScopedSkills) -eq 0) {
        $lines.Add("- No local skills found under skills/.")
    } else {
        foreach ($skill in ConvertTo-Array $projectScopedSkills) {
            $desc = [string]$skill.Description
            if ([string]::IsNullOrWhiteSpace($desc)) { $desc = "No description parsed." }
            $lines.Add("- $($skill.Name): $desc ($($skill.Path))")
        }
    }
    $lines.Add("")
    $lines.Add("## Shared Tasklist Snapshot")
    foreach ($section in @("Active", "Backlog", "Archived")) {
        $lines.Add("### $section")
        $entries = ConvertTo-Array $taskSummary[$section]
        if ((Get-ItemCount $entries) -eq 0) {
            $lines.Add("- No entries found.")
        } else {
            foreach ($entry in $entries) {
                $lines.Add("- $entry")
            }
        }
        $lines.Add("")
    }
    $lines.Add("## Strategic References")
    $lines.Add("- wiki/chat-session-bootstrap.md")
    $lines.Add("- wiki/super-agent-mcp-skills-strategy.md")
    $lines.Add("- skills/agency-playground-ops/SKILL.md")
} elseif ($Mode -eq "commander") {
    $lines.Add("## Commander Panel Initialization")
    $lines.Add("1. cmd /c npm run commander:start:remote -- --project=$Project --panel-port=8787")
    $lines.Add("2. Open panel and authenticate; verify /api/health and runtime status strip.")
    $lines.Add("3. Confirm relay session target and dev manifest selection before command execution.")
    $lines.Add("4. Start tunnel only when required; keep security mode aligned with exposure.")
    $lines.Add("")
    $lines.Add("## Commander Runtime Snapshot")
    $runtime = $commanderSnapshot.RuntimeConfig
    if ($null -eq $runtime) {
        $lines.Add("- Runtime config: unavailable (.agency/remote/panel-runtime.json missing or unreadable).")
    } else {
        $lines.Add("- runtime.securityMode: $(Get-ObjectPropertyValue -Object $runtime -Name 'securityMode')")
        $lines.Add("- runtime.tunnelMode: $(Get-ObjectPropertyValue -Object $runtime -Name 'tunnelMode')")
        $lines.Add("- runtime.hostHint: $(Get-ObjectPropertyValue -Object $runtime -Name 'publicHost')")
    }
    $lines.Add("- panel-credentials file exists: $($commanderSnapshot.CredentialsFileExists)")
    $lines.Add("- panel session store exists: $($commanderSnapshot.SessionStoreExists)")
    $lines.Add("- codex session registry exists: $($commanderSnapshot.PanelSessionsFileExists)")
    $lines.Add("- inbox note count: $($commanderSnapshot.InboxCount)")
    $lines.Add("- outbox note count: $($commanderSnapshot.OutboxCount)")
    $lines.Add("")
    $lines.Add("## Relay State Snapshot")
    $relayStates = ConvertTo-Array $commanderSnapshot.ActiveRelayStates
    if ((Get-ItemCount $relayStates) -eq 0) {
        $lines.Add("- No relay-state-*.json files found.")
    } else {
        foreach ($relay in $relayStates) {
            $lines.Add("- $($relay.File): session=$($relay.SessionName), lastPrompt=$($relay.LastPromptAt), lastReply=$($relay.LastReplyAt)")
        }
    }
    $lines.Add("")
    $lines.Add("## Speed + Reliability Operating Loop")
    $lines.Add("1. Preflight once: chat:new:quick, mcp:prep, chat:briefing.")
    $lines.Add("2. Keep one panel process + one dev watcher + one relay per session name.")
    $lines.Add("3. Use allowlisted panel actions for state changes; avoid raw shell injection paths.")
    $lines.Add("4. Persist key findings to memory_local after each major task milestone.")
    $lines.Add("5. Rotate to fallback routes quickly:")
    $lines.Add("   - GitHub modern remote -> github_local fallback.")
    $lines.Add("   - commander:start:remote -> commander:local for LAN/debug issues.")
    $lines.Add("   - dev project manifest -> rebuild + refresh manifests.")
    $lines.Add("")
    $lines.Add("## Strategic References")
    $lines.Add("- wiki/super-agent-mcp-skills-strategy.md")
    $lines.Add("- wiki/remote-control-panel.md")
    $lines.Add("- wiki/mcp-setup.md")
} else {
    $lines.Add("## Full System Super-Agent Scope")
    $lines.Add("This mode is system-only and excludes project-source and commander-panel implementation context by default.")
    $lines.Add("- Build system: full context enabled.")
    $lines.Add("- Project source files (projects/*/src/**): excluded unless user requests boundary crossing.")
    $lines.Add("- Commander internals (remote-console/**, .agency/remote/**): awareness-only unless user requests boundary crossing.")
    $lines.Add("")
    $lines.Add("## System Startup Sequence")
    $lines.Add("1. cmd /c npm run chat:new:quick -- --project=$Project")
    $lines.Add("2. cmd /c npm run mcp:prep")
    $lines.Add("3. cmd /c npm run chat:briefing:system")
    $lines.Add("4. cmd /c npm run list:projects")
    $lines.Add("")
    $lines.Add("## Build System Knowledge Snapshot")
    $lines.Add("- agency.config.activeProject: $($agencyConfig.activeProject)")
    $lines.Add("- agency.config.distDir: $($agencyConfig.distDir)")
    $lines.Add("- scripts.engine: $($agencyConfig.scripts.engine)")
    $lines.Add("- scripts.mode: $($agencyConfig.scripts.mode)")
    $lines.Add("- server.host: $($agencyConfig.server.host)")
    $lines.Add("- server.startPort: $($agencyConfig.server.startPort)")
    $lines.Add("- watch.debounceMs: $($agencyConfig.watch.debounceMs)")
    $lines.Add("- scaffold.migrateLegacyLayout: $($agencyConfig.scaffold.migrateLegacyLayout)")
    $lines.Add("")
    $lines.Add("## Dynamic Project Build Rules")
    $lines.Add("- Root owns dependency install, build orchestration, and dev serving.")
    $lines.Add("- Any folder under projects/ is treated as a project candidate.")
    $lines.Add("- Missing source structure is scaffolded from templates/project.")
    $lines.Add("- Dist output is centralized: dist/projects/<slug>/.")
    $lines.Add("- Dev manifests are written to .agency/dev-servers/*.json.")
    $lines.Add("")
    $lines.Add("## System Command Surface")
    if ((Get-ItemCount $systemScriptNames) -eq 0) {
        $lines.Add("- No system scripts were parsed from package.json.")
    } else {
        foreach ($scriptName in ConvertTo-Array $systemScriptNames) {
            $lines.Add("- npm run $scriptName")
        }
    }
    $lines.Add("")
    $lines.Add("## Skills Available For System Operation")
    if ((Get-ItemCount $skillSummary) -eq 0) {
        $lines.Add("- No local skills found under skills/.")
    } else {
        foreach ($skill in ConvertTo-Array $skillSummary) {
            $lines.Add("- $($skill.Name)")
        }
    }
    $lines.Add("")
    $lines.Add("## Commander Awareness (Boundary-Limited)")
    if ((Get-ItemCount $commanderScriptNames) -eq 0) {
        $lines.Add("- No commander:* scripts parsed from package.json.")
    } else {
        $lines.Add("- Commander scripts detected: $($commanderScriptNames -join ', ')")
    }
    $lines.Add("- If work requires commander internals, request explicit context first.")
    $lines.Add("")
    $lines.Add("## Boundary Crossing Protocol")
    $lines.Add("Use this exact question before crossing boundaries:")
    $lines.Add('`This task touches excluded context (<projects source|commander internals>). Please confirm scope and target files so I can proceed safely.`')
    $lines.Add("")
    $lines.Add("## Strategic References")
    $lines.Add("- wiki/super-agent-mcp-skills-strategy.md")
    $lines.Add("- skills/system-build-super-agent/SKILL.md")
    $lines.Add("- wiki/agency-setup.md")
    $lines.Add("- wiki/mcp-setup.md")
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
