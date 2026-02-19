[CmdletBinding()]
param(
    [string]$RepoRoot = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $RepoRoot = Join-Path $scriptDir "..\..\.."
}
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
$prepScript = Join-Path $RepoRoot "scripts/chat/prepare-mcp.ps1"

if (-not (Test-Path -LiteralPath $prepScript)) {
    throw "prepare-mcp.ps1 not found at $prepScript"
}

& $prepScript -RepoRoot $RepoRoot
