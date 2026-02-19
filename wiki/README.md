# Playground Wiki

This wiki documents the full agency setup, dev/build automation, and MCP wiring for this repository.

## Documents
- `wiki/agency-setup.md`: architecture, build/dev system, config model, command reference, and usage cookbook.
- `wiki/mcp-setup.md`: MCP server setup, modern + legacy GitHub strategy, `.vscode/mcp.json`, `config.toml`, and command-heavy examples.
- `wiki/chat-session-bootstrap.md`: one-command new-chat preparation flow and generated artifacts.
- `wiki/remote-control-panel.md`: secure remote panel architecture and operations runbook (auth, CSRF, command allowlist, preview proxy, HTTPS tunnel access, troubleshooting).
- `wiki/skills-catalog.md`: local skill pack overview and skill command surface.
- `TASKLIST.md`: shared Active/Backlog/Archived task board.

## Quick Start
From `C:\Users\SKIKK\Documents\websites\Playground`:

```powershell
cmd /c npm run scaffold
cmd /c npm run list:projects
cmd /c npm run dev -- --project csscroll
```

For MCP:

```powershell
Set-Location .\mcp
cmd /c npm run list
```

For new chat bootstrap:

```powershell
cmd /c npm run chat:new:quick
cmd /c npm run chat:briefing
```

For remote control panel:

```powershell
$env:REMOTE_PANEL_PORT='4380'
$env:REMOTE_PANEL_HOST='127.0.0.1'
cmd /c npm run remote:panel
```
