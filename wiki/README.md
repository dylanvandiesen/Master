# Wiki Index

## Start Here

- `wiki/agency-setup.md`: root build/dev architecture, project contracts, command surface
- `wiki/remote-control-panel.md`: complete remote panel architecture, security, runtime settings, tunnel flow
- `wiki/mcp-setup.md`: MCP server wiring, credential strategy, memory integration
- `wiki/chat-session-bootstrap.md`: session prep workflow and chat bootstrap commands
- `wiki/super-agent-mcp-skills-strategy.md`: speed-first MCP + skills orchestration model for high-context sessions
- `wiki/skills-catalog.md`: available repository skill packs

## Recommended Reading Order

1. `wiki/agency-setup.md`
2. `wiki/mcp-setup.md`
3. `wiki/chat-session-bootstrap.md`
4. `wiki/super-agent-mcp-skills-strategy.md`
5. `wiki/remote-control-panel.md`

## Workspace Note

- This workspace supports concurrent operator instances. Follow `AGENTS.md` and `wiki/remote-control-panel.md` concurrency guardrails when multiple Codex sessions are active.

## Operational Shortcuts

```powershell
cmd /c npm run commander:start
cmd /c npm run commander:start:remote -- --project=csscroll
cmd /c npm run chat:new:quick -- --project=csscroll
cmd /c npm run mcp:prep
```
