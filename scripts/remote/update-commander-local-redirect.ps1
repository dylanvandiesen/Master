param(
    [Parameter(Mandatory = $true)]
    [string]$TunnelUrl,
    [string]$RemoteHost = "diesign.dev",
    [string]$RemoteUser = "root",
    [string]$RemoteKeyPath = "C:\Users\SKIKK\.ssh\root_2a01_239_491_ee00__1.tmp",
    [string]$RemoteSitePath = "/etc/nginx/sites-available/commander.diesign.dev",
    [string]$LocalCommanderSitePath = "/etc/nginx/sites-available/local-commander.diesign.dev",
    [string]$BasicAuthUser = "diesign_commander",
    [string]$BasicAuthPassword = "sPO7ELcR-BnoIvu5zA2WLHoeaErAlv1j"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($TunnelUrl -notmatch '^https://[^/\s]+/?$') {
    throw "TunnelUrl must be an HTTPS origin URL."
}

$normalizedTunnelUrl = $TunnelUrl.TrimEnd("/") + "/"
$tunnelUri = [uri]$normalizedTunnelUrl
$tunnelHost = $tunnelUri.Host
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$tmpDir = Join-Path $repoRoot ".tmp"
$null = New-Item -ItemType Directory -Force -Path $tmpDir
$localConfigPath = Join-Path $tmpDir "commander.diesign.dev.nginx.conf"
$localCommanderConfigPath = Join-Path $tmpDir "local-commander.diesign.dev.nginx.conf"
$localCommanderBootstrapConfigPath = Join-Path $tmpDir "local-commander.bootstrap.nginx.conf"

$config = @'
server {
    listen 80;
    listen [::]:80;
    server_name commander.diesign.dev;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name commander.diesign.dev;

    ssl_certificate /etc/letsencrypt/live/commander.diesign.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/commander.diesign.dev/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    access_log /var/log/nginx/commander.access.log;
    error_log /var/log/nginx/commander.error.log;

    auth_basic "Commander";
    auth_basic_user_file /etc/nginx/.htpasswd-commander;
    add_header X-Robots-Tag "noindex, nofollow" always;

    allow 127.0.0.1;
    allow ::1;
    allow 45.145.111.28;
    allow 2a0e:fdc1:1103:1c00:a8e8:821:f7dc:1363;
    deny all;

    location = /favicon.ico {
        access_log off;
        log_not_found off;
    }

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port 443;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;
        proxy_send_timeout 3600;
        proxy_buffering off;
    }
}
'@

$config = $config.Replace("__TUNNEL_URL__", $normalizedTunnelUrl)
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($localConfigPath, $config, $utf8NoBom)

$localCommanderBootstrapConfig = @'
server {
    listen 80;
    listen [::]:80;
    server_name local-commander.diesign.dev;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 302 https://$host$request_uri;
    }
}
'@

[System.IO.File]::WriteAllText($localCommanderBootstrapConfigPath, $localCommanderBootstrapConfig, $utf8NoBom)

$localCommanderConfig = @'
server {
    listen 80;
    listen [::]:80;
    server_name local-commander.diesign.dev;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name local-commander.diesign.dev;

    ssl_certificate /etc/letsencrypt/live/local-commander.diesign.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/local-commander.diesign.dev/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    access_log /var/log/nginx/local-commander.access.log;
    error_log /var/log/nginx/local-commander.error.log;

    auth_basic "Local Commander";
    auth_basic_user_file /etc/nginx/.htpasswd-commander;
    add_header X-Robots-Tag "noindex, nofollow" always;

    allow 127.0.0.1;
    allow ::1;
    allow 45.145.111.28;
    allow 2a0e:fdc1:1103:1c00:a8e8:821:f7dc:1363;
    deny all;

    location = /favicon.ico {
        access_log off;
        log_not_found off;
    }

    location / {
        proxy_pass __TUNNEL_URL__;
        proxy_http_version 1.1;
        proxy_ssl_server_name on;
        proxy_ssl_name __TUNNEL_HOST__;
        proxy_set_header Host __TUNNEL_HOST__;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port 443;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;
        proxy_send_timeout 3600;
        proxy_buffering off;
    }
}
'@

$localCommanderConfig = $localCommanderConfig.Replace("__TUNNEL_URL__", $normalizedTunnelUrl)
$localCommanderConfig = $localCommanderConfig.Replace("__TUNNEL_HOST__", $tunnelHost)
[System.IO.File]::WriteAllText($localCommanderConfigPath, $localCommanderConfig, $utf8NoBom)

$scpArgs = @(
    "-i", $RemoteKeyPath,
    $localConfigPath,
    "${RemoteUser}@${RemoteHost}:$RemoteSitePath"
)
& scp @scpArgs
if ($LASTEXITCODE -ne 0) {
    throw "scp failed with exit code $LASTEXITCODE"
}

$scpDedicatedArgs = @(
    "-i", $RemoteKeyPath,
    $localCommanderConfigPath,
    "${RemoteUser}@${RemoteHost}:${LocalCommanderSitePath}.full"
)
& scp @scpDedicatedArgs
if ($LASTEXITCODE -ne 0) {
    throw "scp failed with exit code $LASTEXITCODE for local commander site"
}

$scpBootstrapArgs = @(
    "-i", $RemoteKeyPath,
    $localCommanderBootstrapConfigPath,
    "${RemoteUser}@${RemoteHost}:${LocalCommanderSitePath}.bootstrap"
)
& scp @scpBootstrapArgs
if ($LASTEXITCODE -ne 0) {
    throw "scp failed with exit code $LASTEXITCODE for local commander bootstrap site"
}

$remoteCommand = @(
    "mkdir -p /var/www/certbot",
    "ln -sf $LocalCommanderSitePath /etc/nginx/sites-enabled/local-commander.diesign.dev",
    "if [ ! -f /etc/letsencrypt/live/local-commander.diesign.dev/fullchain.pem ]; then cp ${LocalCommanderSitePath}.bootstrap $LocalCommanderSitePath && nginx -t && systemctl reload nginx && certbot certonly --webroot -w /var/www/certbot -d local-commander.diesign.dev --non-interactive --agree-tos -m admin@diesign.dev --keep-until-expiring; fi",
    "cp ${LocalCommanderSitePath}.full $LocalCommanderSitePath",
    "nginx -t",
    "systemctl reload nginx",
    "curl -k -I --max-time 10 -u ${BasicAuthUser}:${BasicAuthPassword} https://commander.diesign.dev/",
    "curl -k -I --max-time 10 -u ${BasicAuthUser}:${BasicAuthPassword} https://local-commander.diesign.dev/api/health"
) -join " && "

$sshArgs = @(
    "-i", $RemoteKeyPath,
    "${RemoteUser}@${RemoteHost}",
    $remoteCommand
)
& ssh @sshArgs
if ($LASTEXITCODE -ne 0) {
    throw "ssh verification failed with exit code $LASTEXITCODE"
}

Write-Output "Updated commander.diesign.dev to subdomain-only routing"
Write-Output "Updated local-commander.diesign.dev proxy to $normalizedTunnelUrl"
