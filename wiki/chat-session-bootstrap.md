# Chat Session Bootstrap

Use this workflow to prepare the repo once, then launch or manage agents from either CLI or the Commander panel.

## Preferred Control Flow

Environment-first is now the recommended startup model:

1. Start an environment:
   - `cmd /c npm run env -- --context=project --project=csscroll`
   - `cmd /c npm run env -- --context=system`
   - `cmd /c npm run env -- --context=commander --project=csscroll`
2. Check current runtime state:
   - `cmd /c npm run env:status`
3. Spawn or manage agents after the environment is already up:
   - from CLI with `cmd /c npm run agent:spawn -- --project=csscroll`
   - from the Commander panel Control Plane

Saved environment profiles can be launched from CLI too:

- `cmd /c npm run env -- --env-profile=commander-remote --project=csscroll`

## Compatibility Bootstrap Commands

The older bootstrap surface still works and is still useful for focused prep-only flows:

- Standard prep:
  - `cmd /c npm run chat:new`
- Full prep (installs deps first):
  - `cmd /c npm run chat:new:full`
- Fast prep (skip build):
  - `cmd /c npm run chat:new:quick`
- Super-agent quick bootstrap (chat prep + MCP refresh + briefings + super context):
  - `cmd /c npm run super:bootstrap -- --project=csscroll`
- Super-agent full bootstrap (installs deps first):
  - `cmd /c npm run super:bootstrap:full -- --project=csscroll`

`chat:new:*` commands now run through `scripts/chat/run-prepare-chat-instance.mjs`, which normalizes forwarded args so this works reliably:

- `cmd /c npm run chat:new:quick -- --project=csscroll`

## What `chat:new` Does

`scripts/chat/run-prepare-chat-instance.mjs` normalizes CLI args and dispatches into:

`scripts/chat/prepare-chat-instance.ps1` performs:

1. Ensures `.env` exists (copies from `.env.example` if missing).
2. Runs scaffold and project discovery commands.
3. Builds selected project unless skipped.
4. Runs MCP preparation if requested.
5. Writes session artifacts:
   - `.agency/chat/sessions/<session-id>/session.json`
   - `.agency/chat/sessions/<session-id>/briefing.md`
   - `.agency/chat/sessions/<session-id>/commander-briefing.md`
   - `.agency/chat/sessions/<session-id>/system-briefing.md`
   - `.agency/chat/sessions/<session-id>/super-context.json`
   - `.agency/chat/sessions/<session-id>/super-context.md`

## Super-Agent Context Bundle

- Generate latest machine-readable + markdown super context:
  - `cmd /c npm run super:context`

- Latest outputs:
  - `.agency/chat/latest-super-context.json`
  - `.agency/chat/latest-super-context.md`

## Super-Agent Spawn (Desktop CLI)

- Quick spawn (runs quick bootstrap unless disabled):
  - `cmd /c npm run agent:spawn -- --project=csscroll`
  - compatibility: `cmd /c npm run super:agent -- --project=csscroll`

- Full spawn (runs full bootstrap unless disabled):
  - `cmd /c npm run agent:spawn:full -- --project=csscroll`
  - compatibility: `cmd /c npm run super:agent:full -- --project=csscroll`

- Common flags:
  - `--name=<session-name>`
  - `--model=<codex-model>`
  - `--notes="..."`
  - `--no-prep=true` (skip bootstrap step)
  - `--make-default=false` (avoid changing session default)

## Briefing Command

- Generate latest project + commander briefings:
  - `cmd /c npm run chat:briefing`

- Generate project-only briefing:
  - `cmd /c npm run chat:briefing:project`

- Generate commander-only briefing:
  - `cmd /c npm run chat:briefing:commander`

- Generate system-only briefing:
  - `cmd /c npm run chat:briefing:system`

Output:

- `.agency/chat/latest-briefing.md`
- `.agency/chat/latest-commander-briefing.md`
- `.agency/chat/latest-system-briefing.md`
- `.agency/chat/latest-super-context.json` (from `chat:new` or `super:context`)
- `.agency/chat/latest-super-context.md` (from `chat:new` or `super:context`)

## MCP Preparation Command

- Validate MCP setup:
  - `cmd /c npm run mcp:prep`

Checks include:

1. `.vscode/mcp.json` and `.codex/config.toml` presence.
2. MCP package inventory from `mcp/`.
3. Memory file existence (`mcp/data/memory.jsonl`).
4. Token availability:
   - `GITHUB_PERSONAL_ACCESS_TOKEN`
   - `GITHUB_MCP_PAT`

Status output:

- `.agency/chat/mcp-status.json`

## Usage Examples

1. `cmd /c npm run chat:new`
2. `cmd /c npm run chat:new -- --project=csscroll`
3. `cmd /c npm run chat:new:full`
4. `cmd /c npm run chat:new:quick -- --project=csscroll`
5. `cmd /c npm run chat:briefing`
6. `cmd /c npm run chat:briefing:commander`
7. `cmd /c npm run chat:briefing:system`
8. `cmd /c npm run mcp:prep`
9. `powershell -ExecutionPolicy Bypass -File scripts/chat/prepare-chat-instance.ps1 -Project csscroll -PrepareMcp`
10. `powershell -ExecutionPolicy Bypass -File scripts/chat/prepare-chat-instance.ps1 -InstallRootDeps -InstallMcpDeps -PrepareMcp`
11. `powershell -ExecutionPolicy Bypass -File scripts/chat/prepare-mcp.ps1 -StartServer memory`
12. `powershell -ExecutionPolicy Bypass -File scripts/chat/new-chat-briefing.ps1 -Mode project -OutputPath .agency/chat/manual-briefing.md`
13. `powershell -ExecutionPolicy Bypass -File scripts/chat/new-chat-briefing.ps1 -Mode commander -OutputPath .agency/chat/manual-commander-briefing.md`
14. `powershell -ExecutionPolicy Bypass -File scripts/chat/new-chat-briefing.ps1 -Mode system -OutputPath .agency/chat/manual-system-briefing.md`
15. `cmd /c npm run super:context`
16. `cmd /c npm run super:bootstrap -- --project=csscroll`
17. `cmd /c npm run super:bootstrap:full -- --project=csscroll`
18. `cmd /c npm run super:agent -- --project=csscroll`
19. `cmd /c npm run super:agent:full -- --project=csscroll`

## Recommended Daily Start

1. `cmd /c npm run env -- --context=commander --project=csscroll`
2. Open the Commander panel and use `Control Plane -> Environment / Agent Profiles / Session Aliases / Runs`.
3. Use `Plan Env`, `Plan Spawn`, or `Plan Run` when you want to inspect the exact launch request before mutating runtime state.
4. Spawn from CLI only when you want a direct one-shot flow: `cmd /c npm run agent:spawn -- --project=csscroll`
5. Use `cmd /c npm run env:status` whenever you need the current runtime snapshot.
6. Read `wiki/super-agent-mcp-skills-strategy.md` for speed-first MCP + skills orchestration.
