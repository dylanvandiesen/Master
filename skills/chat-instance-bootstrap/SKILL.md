---
name: chat-instance-bootstrap
description: Bootstrap a fresh Codex session for this Playground workspace before implementation. Use at chat start, after handoff, or whenever context is stale and you need a fast preflight of cwd, project discovery, active agency config, npm command surface, MCP wiring, multi-agent readiness, environment prerequisites, and a generated startup briefing.
---

# Chat Instance Bootstrap

Use this skill to establish a repeatable startup baseline before doing feature work.

## Bootstrap Sequence
1. Confirm workspace and project inventory.
2. Run chat bootstrap commands.
3. Run MCP prep checks.
4. Generate a briefing artifact for handoff continuity.

Run:

```powershell
Set-Location C:\Users\SKIKK\Documents\websites\Playground
cmd /c npm run chat:new:quick
cmd /c npm run chat:briefing
```

## Multi-Agent Rules
- Confirm `config.toml` includes `multi_agent = true`.
- Use explorer agents for discovery and code search.
- Use worker agents for scoped implementation.
- Assign explicit file ownership before worker execution.

## Use Resource Files
- For startup checks, read `references/startup-checklist.md`.
- For deterministic bootstrap, run `scripts/bootstrap-session.ps1`.

## Repo Guardrails
- Use `cmd /c npm run ...` if PowerShell blocks `npm.ps1`.
- Treat root `package.json` as authoritative command surface.
- Keep MCP token values in environment variables, never in tracked docs.
