# TASKLIST

Shared, persistent task board for this repository.

## Active


## Backlog
- [ ] Add Pester tests for `scripts/chat/*.ps1` bootstrap tooling.
- [ ] Add `-Json` mode to `scripts/chat/new-chat-briefing.ps1` for machine-readable startup context.
- [ ] Add stale-manifest cleanup policy for `.agency/dev-servers/*.json`.
- [ ] Add optional one-command VS Code MCP health check script.
- [ ] Add skill-install helper command for promoting `skills/*` into Codex home.
- [ ] Add remote panel command audit export endpoint for long-running ops history.
- [ ] Add rate-limit and account lockout metrics dashboard for remote panel auth endpoints.

## Archived
- [x] Finalized remote panel runbook/docs cleanup and startup ergonomics (`wiki/remote-control-panel.md`, `wiki/README.md`, `wiki/chat-session-bootstrap.md`, `scripts/chat/run-prepare-chat-instance.mjs`, `package.json`).
- [x] Ran `cmd /c npm run chat:new:full` with real tokens and verified end-to-end bootstrap (`GITHUB_PERSONAL_ACCESS_TOKEN loaded: True`, `GITHUB_MCP_PAT loaded: True`).
- [x] Validated `github_modern_remote` auth flow with `github_mcp_pat` input (unauthenticated request returned `401`; authenticated request reached `github-mcp-server-remote` and returned `400`, confirming token-authenticated endpoint access).
- [x] Validated LAN + HTTPS tunnel operator access flow with explicit allowlists and local-only tunnel posture (`0.0.0.0` allowlist allow/deny checks and `127.0.0.1` binding verification against LAN IP).
- [x] Ran final end-to-end remote-panel command execution checks on a non-restricted shell host (auth, CSRF, build-all, dev start/stop, manifest verification).
- [x] Installed `esbuild` and verified `npm run build:all` uses primary JS pipeline without legacy fallback.
- [x] Added a real second project (`projects/NeonTerrain`) and validated multi-project build/watch in `dev:all`.
- [x] Documented secure remote control panel runbook and command contract (`wiki/remote-control-panel.md`, `wiki/README.md`, `AGENTS.md`).
- [x] Implemented secure remote control web panel with auth, CSRF, allowlisted control actions, and preview proxy (`remote-console/server.mjs`, `remote-console/public/*`).
- [x] Replaced single-project pipeline with root-controlled agency orchestration (`gulpfile.mjs`, `agency.config.json`).
- [x] Implemented auto-scaffold + legacy folder migration for `projects/*`.
- [x] Added centralized per-project dist output and dashboard (`dist/index.html`).
- [x] Added auto-generated dev server with manifest output in `.agency/dev-servers/`.
- [x] Installed local MCP hub in `mcp/` with filesystem/memory/github packages.
- [x] Added modern+legacy GitHub MCP strategy across `.vscode/mcp.json` and `config.toml`.
- [x] Added complete wiki docs for agency and MCP usage with command examples.
