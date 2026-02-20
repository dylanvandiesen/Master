# Chat Session Bootstrap

Use this workflow to fully prepare a fresh chat instance for agency + MCP work.

## One-Command Modes

- Standard prep:
  - `cmd /c npm run chat:new`
- Full prep (installs deps first):
  - `cmd /c npm run chat:new:full`
- Fast prep (skip build):
  - `cmd /c npm run chat:new:quick`

`chat:new:*` commands now run through `scripts/chat/run-prepare-chat-instance.mjs`, which normalizes forwarded args so this works reliably:

- `cmd /c npm run chat:new:quick -- --project=csscroll`

## What `chat:new` Does

`scripts/chat/run-prepare-chat-instance.mjs` normalizes CLI args and dispatches into:

`scripts/chat/prepare-chat-instance.ps1` performs:

1. Ensures `.env` exists (copies from `.env.example` if missing).
2. Runs scaffold and project discovery commands.
3. Builds selected project unless skipped.
4. Runs MCP preparation if requested.
5. Writes session artifacts:
   - `.agency/chat/sessions/<session-id>/session.json`
   - `.agency/chat/sessions/<session-id>/briefing.md`

## Briefing Command

- Generate latest briefing shortcut:
  - `cmd /c npm run chat:briefing`

Output:

- `.agency/chat/latest-briefing.md`

## MCP Preparation Command

- Validate MCP setup:
  - `cmd /c npm run mcp:prep`

Checks include:

1. `.vscode/mcp.json` and `config.toml` presence.
2. MCP package inventory from `mcp/`.
3. Memory file existence (`mcp/data/memory.jsonl`).
4. Token availability:
   - `GITHUB_PERSONAL_ACCESS_TOKEN`
   - `GITHUB_MCP_PAT`

Status output:

- `.agency/chat/mcp-status.json`

## Usage Examples

1. `cmd /c npm run chat:new`
2. `cmd /c npm run chat:new -- --project=csscroll`
3. `cmd /c npm run chat:new:full`
4. `cmd /c npm run chat:new:quick -- --project=csscroll`
5. `cmd /c npm run chat:briefing`
6. `cmd /c npm run mcp:prep`
7. `powershell -ExecutionPolicy Bypass -File scripts/chat/prepare-chat-instance.ps1 -Project csscroll -PrepareMcp`
8. `powershell -ExecutionPolicy Bypass -File scripts/chat/prepare-chat-instance.ps1 -InstallRootDeps -InstallMcpDeps -PrepareMcp`
9. `powershell -ExecutionPolicy Bypass -File scripts/chat/prepare-mcp.ps1 -StartServer memory`
10. `powershell -ExecutionPolicy Bypass -File scripts/chat/new-chat-briefing.ps1 -OutputPath .agency/chat/manual-briefing.md`

## Recommended Daily Start

1. `cmd /c npm run chat:new:quick`
2. `cmd /c npm run dev -- --project csscroll`
3. `cmd /c npm run mcp:prep`
4. `cmd /c npm run chat:briefing`
