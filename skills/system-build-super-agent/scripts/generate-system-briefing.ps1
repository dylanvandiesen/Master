[CmdletBinding()]
param(
    [string]$RepoRoot = "",
    [string]$Project = "",
    [string]$OutputPath = ".agency/chat/latest-system-briefing.md",
    [switch]$EmitContextBundle,
    [string]$ContextOutputPath = ".agency/chat/latest-super-context.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $RepoRoot = Join-Path $scriptDir "..\..\.."
}
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path

$briefingScript = Join-Path $RepoRoot "scripts/chat/new-chat-briefing.ps1"
if (-not (Test-Path -LiteralPath $briefingScript)) {
    throw "new-chat-briefing.ps1 not found at $briefingScript"
}

$args = @{
    RepoRoot = $RepoRoot
    Mode = "system"
    OutputPath = $OutputPath
}
if (-not [string]::IsNullOrWhiteSpace($Project)) {
    $args.Project = $Project
}

& $briefingScript @args

if ($EmitContextBundle) {
    $contextScript = Join-Path $RepoRoot "scripts/chat/export-super-agent-context.ps1"
    if (-not (Test-Path -LiteralPath $contextScript)) {
        throw "export-super-agent-context.ps1 not found at $contextScript"
    }

    $contextArgs = @{
        RepoRoot = $RepoRoot
        OutputPath = $ContextOutputPath
        EmitMarkdown = $true
    }
    if (-not [string]::IsNullOrWhiteSpace($Project)) {
        $contextArgs.Project = $Project
    }
    & $contextScript @contextArgs
}
