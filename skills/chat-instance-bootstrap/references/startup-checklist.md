# Startup Checklist

## Mandatory
1. Run `npm run chat:new:quick`.
2. Confirm project list with `npm run list:projects`.
3. Confirm MCP readiness with `npm run mcp:prep`.
4. Generate briefing with `npm run chat:briefing`.
5. Generate system-only briefing with `npm run chat:briefing:system`.

## Optional Full Setup
1. Run `npm run chat:new:full` for dependency install + build prep.
2. Start dev server: `npm run dev -- --project=<slug>`.

## Handoff Artifacts
- Session metadata: `.agency/chat/sessions/<id>/session.json`
- Session briefing: `.agency/chat/sessions/<id>/briefing.md`
- Session commander briefing: `.agency/chat/sessions/<id>/commander-briefing.md`
- Session system briefing: `.agency/chat/sessions/<id>/system-briefing.md`
- Latest briefing shortcut: `.agency/chat/latest-briefing.md`
- Latest commander briefing: `.agency/chat/latest-commander-briefing.md`
- Latest system briefing: `.agency/chat/latest-system-briefing.md`
- MCP status: `.agency/chat/mcp-status.json`
- Shared task board: `TASKLIST.md`
