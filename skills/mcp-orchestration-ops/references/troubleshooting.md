# MCP Troubleshooting

## JSON Validity
```powershell
node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('.vscode/mcp.json','utf8')); console.log('mcp json valid')"
```

## Config Presence
```powershell
Get-Content .\config.toml
Select-String -Path .\config.toml -Pattern "mcp_servers.filesystem_local|mcp_servers.memory_local|mcp_servers.github_local|mcp_servers.github_modern_docker"
```

## Token Checks
```powershell
Get-ChildItem Env:GITHUB_PERSONAL_ACCESS_TOKEN
Get-ChildItem Env:GITHUB_MCP_PAT
```

## Docker Check
```powershell
docker --version
```

## MCP Package Check
```powershell
cmd /c npm --prefix mcp run list
```
