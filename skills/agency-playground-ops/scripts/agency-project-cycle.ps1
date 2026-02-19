[CmdletBinding()]
param(
    [string]$RepoRoot = "",
    [string]$Project = "csscroll",
    [ValidateSet("build", "dev", "dev-all", "build-all", "list", "scaffold")]
    [string]$Mode = "build",
    [string]$Port = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

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

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $RepoRoot = Join-Path $scriptDir "..\..\.."
}
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path

switch ($Mode) {
    "scaffold" {
        Invoke-CmdOrThrow -WorkingDirectory $RepoRoot -Command "npm run scaffold"
        break
    }
    "list" {
        Invoke-CmdOrThrow -WorkingDirectory $RepoRoot -Command "npm run list:projects"
        break
    }
    "build" {
        Invoke-CmdOrThrow -WorkingDirectory $RepoRoot -Command "npm run scaffold"
        Invoke-CmdOrThrow -WorkingDirectory $RepoRoot -Command "npm run build -- --project=$Project"
        break
    }
    "build-all" {
        Invoke-CmdOrThrow -WorkingDirectory $RepoRoot -Command "npm run scaffold"
        Invoke-CmdOrThrow -WorkingDirectory $RepoRoot -Command "npm run build:all"
        break
    }
    "dev" {
        Invoke-CmdOrThrow -WorkingDirectory $RepoRoot -Command "npm run scaffold"
        if ([string]::IsNullOrWhiteSpace($Port)) {
            Invoke-CmdOrThrow -WorkingDirectory $RepoRoot -Command "npm run dev -- --project=$Project"
        } else {
            Invoke-CmdOrThrow -WorkingDirectory $RepoRoot -Command "npm run dev -- --project=$Project --port=$Port"
        }
        break
    }
    "dev-all" {
        Invoke-CmdOrThrow -WorkingDirectory $RepoRoot -Command "npm run scaffold"
        if ([string]::IsNullOrWhiteSpace($Port)) {
            Invoke-CmdOrThrow -WorkingDirectory $RepoRoot -Command "npm run dev:all"
        } else {
            Invoke-CmdOrThrow -WorkingDirectory $RepoRoot -Command "npm run dev:all -- --port=$Port"
        }
        break
    }
    default {
        throw "Unsupported mode: $Mode"
    }
}
