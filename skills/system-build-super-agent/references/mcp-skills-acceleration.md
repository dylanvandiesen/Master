# MCP and Skills Acceleration

## MCP Route Priority

1. `filesystem_local` for repository operations.
2. `memory_local` for durable decisions and continuity.
3. GitHub modern route first (`github_modern_remote` when available).
4. GitHub local fallback (`github_local` / `github_legacy_local`).

## MCP Baseline

Always run once per session:

- `cmd /c npm run super:bootstrap -- --project=<slug>`
- fallback manual: `cmd /c npm run mcp:prep`

Verify:

- `.agency/chat/mcp-status.json`
- `.agency/chat/latest-super-context.json`
- `GITHUB_PERSONAL_ACCESS_TOKEN loaded`
- `GITHUB_MCP_PAT loaded`

## Skills Routing

- `chat-instance-bootstrap`:
  Use for session initialization and baseline readiness.
- `mcp-orchestration-ops`:
  Use for auth/server route failures and MCP troubleshooting.
- `agency-playground-ops`:
  Use for build/scaffold/dev/project contract operations.
- `system-build-super-agent`:
  Use for system-wide orchestration and boundary-safe operations.

## High-Speed Fallbacks

1. GitHub auth fails:
   - Rerun `mcp:prep`
   - Switch to GitHub fallback route
2. Build path degrades:
   - Run `build:all`, then inspect dist + manifests
3. Session context stale:
   - Regenerate all briefings (`chat:briefing`)

## Persistence Model

- Keep durable state in `memory_local`.
- Keep runtime snapshots in `.agency/chat/*briefing*.md`.
- Keep coordination state in `TASKLIST.md`.
