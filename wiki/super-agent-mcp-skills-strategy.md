# Super Agent MCP + Skills Strategy

Purpose: initialize a high-throughput Codex session that stays fast without losing context or capability.

## 1) Fast Startup Sequence (90 seconds)

1. `cmd /c npm run super:bootstrap -- --project=csscroll`
2. `cmd /c npm run super:context` (optional explicit refresh)
3. `cmd /c npm run commander:start:remote -- --project=csscroll --panel-port=8787` (only if remote panel flow is needed)

Spawn paths (both supported):

- Desktop CLI: `cmd /c npm run super:agent -- --project=csscroll` (or `super:agent:full`)
- Commander panel: Sessions & Prep -> `Spawn Super` / `Spawn Super Full`

Expected artifacts:

- `.agency/chat/latest-briefing.md`
- `.agency/chat/latest-commander-briefing.md`
- `.agency/chat/latest-system-briefing.md`
- `.agency/chat/latest-super-context.json`
- `.agency/chat/latest-super-context.md`
- `.agency/chat/mcp-status.json`
- `.agency/dev-servers/*.json`

## 2) MCP Utilization Strategy

Use the fastest authoritative MCP route first, then fallback quickly.

| Task type | First route | Fallback route | Notes |
|---|---|---|---|
| Local code read/write/search | `filesystem_local` | shell commands (`rg`, `Get-Content`) | Keep edits scoped and atomic. |
| Persistent context/decisions | `memory_local` | `.agency/remote/project-memory/*.md` | Write milestone observations, not noise. |
| GitHub repo/issues/PR | modern remote (`github_modern_remote`) | `github_local` / `github_legacy_local` | Keep PAT/token validation in `mcp:prep`. |
| Browser verification | `browser_eyes_local` | manual panel/browser checks | Use only when UI state matters. |

Speed guardrails:

1. Run `super:bootstrap` once per session and trust `mcp-status.json` + `latest-super-context.json`.
2. Do not start every MCP server when only one is needed.
3. Keep server names stable between `config.toml` and `.vscode/mcp.json`.
4. On auth failure, switch route immediately before deep debugging.

## 3) Skills Utilization Strategy

Use skills as deterministic workflow routers.

| Skill | Trigger | Core output |
|---|---|---|
| `chat-instance-bootstrap` | Fresh or stale chat session | Baseline session readiness and startup checks |
| `mcp-orchestration-ops` | MCP startup/auth/routing issues | Stable MCP topology, token path, fallback routing |
| `agency-playground-ops` | Build/scaffold/dev/project config tasks | Correct root-driven build and manifest outputs |
| `system-build-super-agent` | Root system orchestration and boundary-safe operations | System-only control plane with explicit boundary crossing prompt |

Execution pattern:

1. Open `SKILL.md`.
2. Use referenced scripts before ad-hoc reinvention.
3. Load only the specific references needed.
4. Return to direct task execution quickly.

## 4) Commander Panel Context Strategy

Commander operations should load only commander-relevant runtime context first:

1. `.agency/remote/panel-runtime.json`
2. `.agency/remote/codex-sessions.json`
3. `.agency/remote/relay-state-*.json`
4. `.agency/dev-servers/*.json`
5. `wiki/remote-control-panel.md`

Operational loop:

1. Verify panel health (`/api/health`).
2. Verify selected project manifest and relay session alias.
3. Execute allowlisted panel action.
4. Confirm result in activity/status feeds.
5. Persist key outcome into memory/project notes.

## 5) Zero-Context-Loss Protocol

1. Keep task movement in `TASKLIST.md` sections `Active`, `Backlog`, `Archived`.
2. Record durable decisions in `memory_local` as compact observations.
3. Keep project-specific context in `.agency/remote/project-memory/<project>.md`.
4. Generate all briefings plus super context whenever a new session starts.
5. Avoid destructive git cleanup in concurrent-instance workflows.

## 6) High-Speed Failure Routing

1. `super:bootstrap` fails: run `chat:new:quick`, `mcp:prep`, and `chat:briefing` separately.
2. `super:context` fails: run `powershell -ExecutionPolicy Bypass -File scripts/chat/export-super-agent-context.ps1 -EmitMarkdown`.
3. MCP auth fails: rerun `mcp:prep`, verify token environment, switch GitHub route.
4. Panel route fails: switch from `commander:start:remote` to `commander:local`.
5. Dev manifest stale: rerun `npm run dev -- --project=<slug>` or `npm run build:all`.

## 7) Super Agent Initialization Objective

Target state:

1. Both briefings generated.
2. System briefing generated.
3. Super context generated (`latest-super-context.json`).
4. MCP status verified.
5. Correct project manifest active.
6. Relay session naming unambiguous.
7. Memory and tasklist continuity preserved.

When this state is true, the session can run at maximum speed without sacrificing context coverage.
