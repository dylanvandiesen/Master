[CmdletBinding()]
param(
    [switch]$ScanGitHistory
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-TrackedFiles {
    $files = & git ls-files 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to list tracked files via git."
    }
    return @($files | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}

function Is-PlaceholderValue {
    param([string]$Value)
    $v = [string]$Value
    if ([string]::IsNullOrWhiteSpace($v)) { return $true }
    $normalized = $v.Trim().ToLowerInvariant()
    if ($normalized -match '^(replace_with|your_|example|sample|dummy|changeme|todo|set_me)') { return $true }
    $trim = $v.Trim().TrimEnd(',', ';')
    if ($trim -match '^[A-Za-z_][A-Za-z0-9_.-]*$') { return $true }
    if ($trim -match '^\$\{?[A-Za-z_][A-Za-z0-9_]*\}?$') { return $true }
    if ($v.Contains('$') -or $v.Contains('%') -or $v.Contains('<') -or $v.Contains('>')) { return $true }
    return $false
}

function Add-Hit {
    param(
        [hashtable]$Bucket,
        [string]$Rule,
        [string]$File,
        [int]$LineNumber
    )
    if (-not $Bucket.ContainsKey($Rule)) {
        $Bucket[$Rule] = New-Object System.Collections.Generic.List[string]
    }
    $Bucket[$Rule].Add("${File}:$LineNumber")
}

$regexRules = @(
    @{
        Name = "private_key_block"
        Pattern = '-----BEGIN\s+(RSA|OPENSSH|EC|DSA|PGP)\s+PRIVATE\s+KEY-----'
    },
    @{
        Name = "github_token"
        Pattern = 'gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}'
    },
    @{
        Name = "cloud_provider_token"
        Pattern = 'AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|AIza[0-9A-Za-z\-_]{35}|xox[baprs]-[A-Za-z0-9\-]+'
    }
)

# Sensitive env-style assignment names with non-placeholder literal values.
$assignmentPattern = '\b([A-Z][A-Z0-9_]*(PASSWORD|PASSWD|SECRET|TOKEN|API_KEY|ACCESS_KEY)[A-Z0-9_]*)\b[ \t]*[:=][ \t]*["'']?([^ \t\r\n"''`]{8,})["'']?'

$hits = @{}
$trackedFiles = Get-TrackedFiles

foreach ($file in $trackedFiles) {
    if (-not (Test-Path -LiteralPath $file)) {
        continue
    }

    $content = ""
    try {
        $content = Get-Content -Raw -LiteralPath $file -ErrorAction Stop
    } catch {
        continue
    }

    foreach ($rule in $regexRules) {
        $matches = [regex]::Matches($content, $rule.Pattern)
        if ($matches.Count -gt 0) {
            foreach ($m in $matches) {
                $line = ($content.Substring(0, [Math]::Min($m.Index, $content.Length)) -split "`n").Count
                Add-Hit -Bucket $hits -Rule $rule.Name -File $file -LineNumber $line
            }
        }
    }

    $assignmentMatches = [regex]::Matches($content, $assignmentPattern)
    foreach ($m in $assignmentMatches) {
        $name = [string]$m.Groups[1].Value
        $value = [string]$m.Groups[3].Value
        if (Is-PlaceholderValue $value) {
            continue
        }
        $line = ($content.Substring(0, [Math]::Min($m.Index, $content.Length)) -split "`n").Count
        Add-Hit -Bucket $hits -Rule "suspicious_assignment:$name" -File $file -LineNumber $line
    }
}

if ($ScanGitHistory) {
    $commits = & git rev-list --all 2>$null
    if ($LASTEXITCODE -eq 0 -and $commits) {
        foreach ($rule in $regexRules) {
            foreach ($commit in $commits) {
                $results = & git grep -I -n -E -e $rule.Pattern $commit -- 2>$null
                if ($LASTEXITCODE -ne 0 -or -not $results) {
                    continue
                }
                foreach ($line in $results) {
                    # Keep output path+line only, never matched content.
                    $parts = [string]$line -split ':', 4
                    if ($parts.Length -ge 3) {
                        Add-Hit -Bucket $hits -Rule "history:$($rule.Name)" -File "$($parts[0]):$($parts[1])" -LineNumber ([int]$parts[2])
                    }
                }
            }
        }
    }
}

if ($hits.Keys.Count -gt 0) {
    Write-Host "Secret scan failed. Potential secret locations found:" -ForegroundColor Red
    foreach ($rule in ($hits.Keys | Sort-Object)) {
        Write-Host ""
        Write-Host "[$rule]" -ForegroundColor Yellow
        foreach ($entry in ($hits[$rule] | Select-Object -Unique | Sort-Object | Select-Object -First 50)) {
            Write-Host "  - $entry"
        }
    }
    exit 1
}

Write-Host "Secret scan passed. No high-signal secrets detected in tracked files." -ForegroundColor Green
exit 0
