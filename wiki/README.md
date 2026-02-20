# Wiki Index

## Start Here

- `wiki/agency-setup.md`: root build/dev architecture, project contracts, command surface
- `wiki/remote-control-panel.md`: complete remote panel architecture, security, runtime settings, tunnel flow
- `wiki/mcp-setup.md`: MCP server wiring, credential strategy, memory integration
- `wiki/chat-session-bootstrap.md`: session prep workflow and chat bootstrap commands
- `wiki/skills-catalog.md`: available repository skill packs

## Recommended Reading Order

1. `wiki/agency-setup.md`
2. `wiki/mcp-setup.md`
3. `wiki/chat-session-bootstrap.md`
4. `wiki/remote-control-panel.md`

## Operational Shortcuts

```powershell
cmd /c npm run remote:stack
cmd /c npm run remote:stack:remote -- --project=csscroll
cmd /c npm run chat:new:quick -- --project=csscroll
cmd /c npm run mcp:prep
```
