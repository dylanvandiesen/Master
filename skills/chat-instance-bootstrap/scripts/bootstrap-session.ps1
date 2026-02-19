[CmdletBinding()]
param(
    [string]$RepoRoot = "",
    [string]$Project = "csscroll",
    [switch]$Full
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $RepoRoot = Join-Path $scriptDir "..\..\.."
}
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
$bootstrapScript = Join-Path $RepoRoot "scripts/chat/prepare-chat-instance.ps1"

if (-not (Test-Path -LiteralPath $bootstrapScript)) {
    throw "prepare-chat-instance.ps1 not found at $bootstrapScript"
}

if ($Full) {
    & $bootstrapScript -RepoRoot $RepoRoot -Project $Project -InstallRootDeps -InstallMcpDeps -PrepareMcp
} else {
    & $bootstrapScript -RepoRoot $RepoRoot -Project $Project -PrepareMcp
}
