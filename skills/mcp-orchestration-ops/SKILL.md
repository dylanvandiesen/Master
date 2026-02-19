---
name: mcp-orchestration-ops
description: Configure and operate MCP connectivity for this Playground repository. Use when tasks involve wiring or troubleshooting `config.toml`, `.vscode/mcp.json`, or `mcp/package.json`; starting local MCP servers (`start:filesystem`, `start:memory`, `start:github:legacy`, `start:github:modern:docker`); choosing GitHub MCP route priority (modern remote, docker, legacy fallback); validating `GITHUB_PERSONAL_ACCESS_TOKEN` and `GITHUB_MCP_PAT`; or fixing memory persistence at `mcp/data/memory.jsonl`.
---

# MCP Orchestration Ops

Use this skill whenever MCP server wiring, startup, or auth is in scope.

## Workflow
1. Validate MCP config files and server IDs.
2. Load env values from `.env` when needed.
3. Ensure memory persistence file exists.
4. Prefer modern GitHub route first, keep legacy fallback alive.
5. Start only required servers.

## MCP Topology
- Root runtime: `config.toml`
- VS Code runtime: `.vscode/mcp.json`
- Local hub scripts: `mcp/package.json`

Current server names:
- Modern remote: `github_modern_remote`
- Legacy local: `github_legacy_local` / `github_local`
- Local filesystem: `filesystem_local`
- Local memory: `memory_local`

## Use Resource Files
- For route priority and command matrix, read `references/server-matrix.md`.
- For troubleshooting commands, read `references/troubleshooting.md`.
- For deterministic validation, run `scripts/mcp-doctor.ps1`.

## Execution
```powershell
Set-Location C:\Users\SKIKK\Documents\websites\Playground
powershell -ExecutionPolicy Bypass -File scripts/chat/prepare-mcp.ps1
cmd /c npm --prefix mcp run start:filesystem
cmd /c npm --prefix mcp run start:memory
```

## Auth Rules
- Use `GITHUB_MCP_PAT` for `github_modern_remote`.
- Use `GITHUB_PERSONAL_ACCESS_TOKEN` for legacy local GitHub MCP.
- Do not hardcode tokens in tracked files.

## Fast Troubleshooting
- Validate JSON: `node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('.vscode/mcp.json','utf8')); console.log('ok')"`
- Validate MCP package install: `cmd /c npm --prefix mcp run list`
- Validate Docker path for modern local: `docker --version`
