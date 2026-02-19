# Startup Checklist

## Mandatory
1. Run `npm run chat:new:quick`.
2. Confirm project list with `npm run list:projects`.
3. Confirm MCP readiness with `npm run mcp:prep`.
4. Generate briefing with `npm run chat:briefing`.

## Optional Full Setup
1. Run `npm run chat:new:full` for dependency install + build prep.
2. Start dev server: `npm run dev -- --project=<slug>`.

## Handoff Artifacts
- Session metadata: `.agency/chat/sessions/<id>/session.json`
- Session briefing: `.agency/chat/sessions/<id>/briefing.md`
- Latest briefing shortcut: `.agency/chat/latest-briefing.md`
- MCP status: `.agency/chat/mcp-status.json`
- Shared task board: `TASKLIST.md`
