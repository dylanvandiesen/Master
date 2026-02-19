# MCP Setup Wiki

## 1) Goals

This guide documents MCP wiring in this repo with command-first workflows:

- Install and run local MCP servers from `mcp/`.
- Use official modern GitHub MCP remote endpoint.
- Keep legacy local GitHub MCP as fallback.
- Wire both `.vscode/mcp.json` and root `config.toml`.
- Keep tokens out of source control.

## 2) Current MCP Architecture

### Workspace (VS Code)

File: `.vscode/mcp.json`

Configured servers:

- `gh-pull_requests` (HTTP)
- `github_modern_remote` (HTTP, preferred)
- `filesystem_local` (local command)
- `memory_local` (local command with memory file path)
- `github_legacy_local` (local command fallback)

### Root Runtime (Agent)

File: `config.toml`

Configured servers:

- `mcp_servers.filesystem_local`
- `mcp_servers.memory_local`
- `mcp_servers.github_local` (legacy local fallback)
- `mcp_servers.github_modern_docker` (modern local runtime via Docker)

### Local MCP Hub

Folder: `mcp/`

- Local packages in `mcp/node_modules`.
- Scripts in `mcp/package.json`.
- Memory file path default: `mcp/data/memory.jsonl`.

## 3) Modern vs Legacy GitHub MCP Strategy

Recommended order:

1. `github_modern_remote` (official modern endpoint).
2. `github_modern_docker` (local modern runtime if Docker available).
3. `github_legacy_local` / `github_local` fallback.

Why:

- modern path tracks the maintained GitHub MCP stack.
- fallback keeps local GitHub connectivity available if modern path is blocked.

## 4) Required Secrets and `.env`

`.env` includes:

- `GITHUB_PERSONAL_ACCESS_TOKEN`
- `GITHUB_MCP_PAT`
- `MEMORY_FILE_PATH`

`.gitignore` includes `.env`.

Session setup:

```powershell
$env:GITHUB_PERSONAL_ACCESS_TOKEN = "ghp_xxx"
$env:GITHUB_MCP_PAT = "ghp_xxx"
```

If needed, persist for user profile:

```powershell
[Environment]::SetEnvironmentVariable("GITHUB_PERSONAL_ACCESS_TOKEN","ghp_xxx","User")
[Environment]::SetEnvironmentVariable("GITHUB_MCP_PAT","ghp_xxx","User")
```

## 5) MCP Command Reference

From repo root:

- `Set-Location C:\Users\SKIKK\Documents\websites\Playground`
- `Set-Location .\mcp`
- `cmd /c npm run list`
- `cmd /c npm run start:filesystem`
- `cmd /c npm run start:memory`
- `cmd /c npm run start:github`
- `cmd /c npm run start:github:legacy`
- `cmd /c npm run start:github:modern:docker`

Validation helpers:

- `Get-Content ..\config.toml`
- `Get-Content ..\.vscode\mcp.json`
- `node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('.vscode/mcp.json','utf8')); console.log('ok')"`

## 6) `.vscode/mcp.json` Notes

Key points:

- `github_modern_remote` uses prompt input `github_mcp_pat`.
- `github_legacy_local` uses env variable `GITHUB_PERSONAL_ACCESS_TOKEN`.
- `memory_local` stores data in `${workspaceFolder}/mcp/data/memory.jsonl`.

When editing this file:

- keep valid JSON (no trailing commas).
- keep server names stable to avoid client/tool mismatch.

## 7) `config.toml` Notes

Key points:

- `filesystem_local` runs local filesystem MCP server.
- `memory_local` runs memory server with explicit `MEMORY_FILE_PATH`.
- `github_local` is legacy local GitHub MCP server.
- `github_modern_docker` runs official modern GitHub MCP server via Docker.

## 8) MCP Usage Cookbook (45 Commands)

### Environment and setup

1. `Set-Location C:\Users\SKIKK\Documents\websites\Playground`
2. `Get-ChildItem .\mcp -Force`
3. `Get-ChildItem .\mcp\node_modules\@modelcontextprotocol`
4. `Get-Content .\config.toml`
5. `Get-Content .\.vscode\mcp.json`
6. `Get-Content .\.env`
7. `$env:GITHUB_PERSONAL_ACCESS_TOKEN = "ghp_xxx"`
8. `$env:GITHUB_MCP_PAT = "ghp_xxx"`
9. `Get-ChildItem Env:GITHUB_PERSONAL_ACCESS_TOKEN`
10. `Get-ChildItem Env:GITHUB_MCP_PAT`

### MCP hub commands

11. `Set-Location .\mcp`
12. `cmd /c npm run list`
13. `cmd /c npm run start:filesystem`
14. `cmd /c npm run start:memory`
15. `cmd /c npm run start:github`
16. `cmd /c npm run start:github:legacy`
17. `cmd /c npm run start:github:modern:docker`
18. `cmd /c npm ls --depth=0`
19. `cmd /c npm install @modelcontextprotocol/server-filesystem`
20. `cmd /c npm install @modelcontextprotocol/server-memory`
21. `cmd /c npm install @modelcontextprotocol/server-github`
22. `cmd /c npm update @modelcontextprotocol/server-filesystem`
23. `cmd /c npm update @modelcontextprotocol/server-memory`
24. `cmd /c npm update @modelcontextprotocol/server-github`

### Validation and smoke tests

25. `node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('.vscode/mcp.json','utf8')); console.log('mcp json valid')"`
26. `Test-Path .\mcp\data\memory.jsonl`
27. `if (!(Test-Path .\mcp\data\memory.jsonl)) { New-Item -ItemType File .\mcp\data\memory.jsonl | Out-Null }`
28. `Get-ChildItem .\mcp\data`
29. `docker --version`
30. `Test-NetConnection api.github.com -Port 443`
31. `Invoke-RestMethod https://api.github.com/user -Headers @{Authorization="Bearer $env:GITHUB_PERSONAL_ACCESS_TOKEN"}`
32. `Get-Process | Where-Object { $_.ProcessName -match "node|docker" }`
33. `netstat -ano | Select-String ':5173|:35729|:3000'`

### Config and fallback operations

34. `Copy-Item .\config.toml .\config.toml.bak`
35. `Copy-Item .\.vscode\mcp.json .\.vscode\mcp.json.bak`
36. `Select-String -Path .\config.toml -Pattern "github_modern_docker|github_local|memory_local|filesystem_local"`
37. `Select-String -Path .\.vscode\mcp.json -Pattern "github_modern_remote|github_legacy_local|memory_local|filesystem_local"`
38. `Get-FileHash .\config.toml`
39. `Get-FileHash .\.vscode\mcp.json`
40. `Remove-Item Env:GITHUB_PERSONAL_ACCESS_TOKEN`
41. `Remove-Item Env:GITHUB_MCP_PAT`

### Project-level checks while MCP is active

42. `Set-Location ..`
43. `cmd /c npm run list:projects`
44. `cmd /c npm run dev -- --project csscroll`
45. `Get-ChildItem .\.agency\dev-servers -File`

## 9) Troubleshooting

### `npm.ps1 cannot be loaded`

Use `cmd /c npm ...`:

```powershell
cmd /c npm run list
```

### `GITHUB_PERSONAL_ACCESS_TOKEN` auth errors

Check env value in current shell:

```powershell
Get-ChildItem Env:GITHUB_PERSONAL_ACCESS_TOKEN
```

Re-test GitHub API:

```powershell
Invoke-RestMethod https://api.github.com/user -Headers @{Authorization="Bearer $env:GITHUB_PERSONAL_ACCESS_TOKEN"}
```

### Docker not available for modern local server

Use `github_modern_remote` in `.vscode/mcp.json` as primary and keep `github_legacy_local` fallback.

### MCP JSON parse errors

Validate with:

```powershell
node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('.vscode/mcp.json','utf8')); console.log('ok')"
```

## 10) Recommended Daily Workflow

1. Load env tokens.
2. Start/verify MCP servers needed for session.
3. Run agency dev mode for project work.
4. Use modern GitHub MCP first, fallback only if needed.
5. Keep `config.toml` and `.vscode/mcp.json` aligned when changing server names.
