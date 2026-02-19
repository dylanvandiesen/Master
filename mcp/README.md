# MCP Hub

This folder is the local MCP runtime hub for this workspace.

## What Is Installed
- `@modelcontextprotocol/server-filesystem`
- `@modelcontextprotocol/server-memory`
- `@modelcontextprotocol/server-github` (legacy fallback)

## GitHub MCP Strategy
- Preferred: `github_modern_remote` in `.vscode/mcp.json` (official remote MCP endpoint).
- Fallback: local legacy package (`@modelcontextprotocol/server-github`) via `github_legacy_local`.
- Optional local modern runtime: Docker image `ghcr.io/github/github-mcp-server`.

## Wiring Locations
- IDE workspace wiring: `.vscode/mcp.json`
- Root runtime wiring: `config.toml`
- Memory store path: `mcp/data/memory.jsonl`

## Required Env
```powershell
$env:GITHUB_PERSONAL_ACCESS_TOKEN = "YOUR_GITHUB_TOKEN"
```

## Commands
Run from `mcp/`:

```powershell
cmd /c npm run list
cmd /c npm run start:filesystem
cmd /c npm run start:memory
cmd /c npm run start:github
cmd /c npm run start:github:legacy
cmd /c npm run start:github:modern:docker
```

From repo root:

```powershell
cmd /c npm run mcp:prep
cmd /c npm run chat:new
```

## More Docs
- `wiki/mcp-setup.md`
- `wiki/agency-setup.md`
