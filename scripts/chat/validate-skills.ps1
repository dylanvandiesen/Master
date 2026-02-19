[CmdletBinding()]
param(
    [string]$RepoRoot = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $RepoRoot = Join-Path $scriptDir "..\.."
}
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
$skillsRoot = Join-Path $RepoRoot "skills"
$validator = "C:/Users/SKIKK/.codex/skills/.system/skill-creator/scripts/quick_validate.py"

if (-not (Test-Path -LiteralPath $skillsRoot)) {
    throw "skills folder not found at $skillsRoot"
}

if (-not (Test-Path -LiteralPath $validator)) {
    throw "quick_validate.py not found at $validator"
}

$skillFolders = Get-ChildItem -Path $skillsRoot -Directory | Sort-Object Name
if ($skillFolders.Count -eq 0) {
    Write-Host "No skills found under $skillsRoot"
    exit 0
}

$failed = @()
foreach ($skill in $skillFolders) {
    Write-Host "Validating skill: $($skill.Name)"
    & python $validator $skill.FullName
    if ($LASTEXITCODE -ne 0) {
        $failed += $skill.Name
    }
}

if ($failed.Count -gt 0) {
    Write-Error "Skill validation failed: $($failed -join ', ')"
    exit 1
}

Write-Host "All skills validated successfully."
