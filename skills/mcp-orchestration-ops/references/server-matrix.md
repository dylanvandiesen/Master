# MCP Server Matrix

## Preferred Order
1. `github_modern_remote` (preferred)
2. `github_modern_docker` (optional local modern runtime)
3. `github_legacy_local` / `github_local` (fallback)

## Config Locations
- Root runtime config: `config.toml`
- VS Code config: `.vscode/mcp.json`
- MCP command scripts: `mcp/package.json`

## Required Environment Values
- `GITHUB_MCP_PAT`
- `GITHUB_PERSONAL_ACCESS_TOKEN`
- `MEMORY_FILE_PATH` (defaults to `mcp/data/memory.jsonl`)

## Quick Commands
- `cmd /c npm --prefix mcp run list`
- `cmd /c npm --prefix mcp run start:filesystem`
- `cmd /c npm --prefix mcp run start:memory`
- `cmd /c npm --prefix mcp run start:github:legacy`
- `cmd /c npm --prefix mcp run start:github:modern:docker`
