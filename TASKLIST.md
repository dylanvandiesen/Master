# TASKLIST

Shared, persistent task board for this repository.

## Active
- [ ] Run `cmd /c npm run chat:new:full` once with real tokens to verify end-to-end first-time bootstrap.
- [ ] Validate `github_modern_remote` auth flow inside VS Code MCP panel with `github_mcp_pat` input.
- [ ] Install `esbuild` when network policy allows, then verify JS pipeline runs primary engine instead of legacy fallback.
- [ ] Add at least one real second project under `projects/` and validate multi-project watch/build in `dev:all`.
- [ ] Validate LAN + HTTPS tunnel operator access flow with explicit allowlists and no direct public port exposure.
- [ ] Run final end-to-end remote-panel command execution checks on a non-restricted shell host.

## Backlog
- [ ] Add Pester tests for `scripts/chat/*.ps1` bootstrap tooling.
- [ ] Add `-Json` mode to `scripts/chat/new-chat-briefing.ps1` for machine-readable startup context.
- [ ] Add stale-manifest cleanup policy for `.agency/dev-servers/*.json`.
- [ ] Add optional one-command VS Code MCP health check script.
- [ ] Add skill-install helper command for promoting `skills/*` into Codex home.
- [ ] Add remote panel command audit export endpoint for long-running ops history.
- [ ] Add rate-limit and account lockout metrics dashboard for remote panel auth endpoints.

## Archived
- [x] Documented secure remote control panel runbook and command contract (`wiki/remote-control-panel.md`, `wiki/README.md`, `AGENTS.md`).
- [x] Implemented secure remote control web panel with auth, CSRF, allowlisted control actions, and preview proxy (`remote-console/server.mjs`, `remote-console/public/*`).
- [x] Replaced single-project pipeline with root-controlled agency orchestration (`gulpfile.mjs`, `agency.config.json`).
- [x] Implemented auto-scaffold + legacy folder migration for `projects/*`.
- [x] Added centralized per-project dist output and dashboard (`dist/index.html`).
- [x] Added auto-generated dev server with manifest output in `.agency/dev-servers/`.
- [x] Installed local MCP hub in `mcp/` with filesystem/memory/github packages.
- [x] Added modern+legacy GitHub MCP strategy across `.vscode/mcp.json` and `config.toml`.
- [x] Added complete wiki docs for agency and MCP usage with command examples.
