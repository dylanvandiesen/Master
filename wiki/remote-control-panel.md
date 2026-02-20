# Remote Control Panel

## 1) What It Is

The remote control panel is a secure web app for operating this repository from desktop or phone.

It combines four things in one interface:

- realtime Codex chat (inbox/outbox relay)
- dev preview controls
- Codex session + prep controls
- remote/tunnel + security controls

Primary implementation files:

- `remote-console/server.mjs`
- `remote-console/public/index.html`
- `remote-console/public/app.js`
- `remote-console/public/styles.css`
- `scripts/remote/codex-interactive-relay.mjs`
- `scripts/remote/start-panel-stack.mjs`

## 2) Core Architecture

### Server

`remote-console/server.mjs` is a Node HTTP server that provides:

- authenticated JSON API
- CSRF-protected mutations
- SSE logs (`/api/events`)
- WebSocket chat + activity stream (`/ws`)
- preview reverse proxy (`/preview/<manifest-id>/...`)

### UI

`remote-console/public/*` is a single-page control UI with:

- chat composer with `Live`, `Queue`, `Stop` prompt modes
- quick numeric reply chips for Codex "1/2/3" prompts
- live activity feed (`thinking`, `working`, tool progress)
- collapsible utility panels (preview/activity/sessions/remote/output)

### Relay

`scripts/remote/codex-interactive-relay.mjs` watches inbox notes, resumes Codex, and writes:

- assistant replies to outbox
- status to `.agency/remote/agent-status.json`
- activity events to `.agency/remote/activity.jsonl`

### Dev Preview

Panel reads manifests from `.agency/dev-servers/*.json` and safely proxies only local dev hosts.

### Tunnel

Cloudflared tunnel management is integrated in panel:

- `Quick` mode (ephemeral URL)
- `Token` mode (account token)
- `Named` mode (named tunnel)

## 3) Storage and Runtime Files

Chat and relay state:

- `.agency/remote/inbox/*.md` (user prompts)
- `.agency/remote/outbox/*.md` (assistant replies)
- `.agency/remote/agent-status.json`
- `.agency/remote/activity.jsonl`
- `.agency/remote/codex-sessions.json`

Panel runtime/auth state:

- `.agency/remote/panel-runtime.json` (security/tunnel mode + host hint)
- `.agency/remote/panel-sessions.json` (persisted auth sessions when enabled)

Dev manifests:

- `.agency/dev-servers/*.json`

## 4) End-to-End Message Flow

1. User sends a message in chat composer.
2. UI sends message through WebSocket (`chat:send`) or fallback HTTP (`POST /api/note`).
3. Server stores prompt in `.agency/remote/inbox/<timestamp>.md`.
4. Relay watcher detects new inbox note.
5. Relay runs `codex exec resume ... --json`.
6. Relay writes response to `.agency/remote/outbox/<timestamp>.md`.
7. Server broadcasts updated chat snapshot over WebSocket.
8. UI updates chat stream, token estimate, activity feed, and runtime strip.

## 5) Security Model

Implemented controls:

- password login (`REMOTE_PANEL_PASSWORD`)
- signed HttpOnly session cookie (`REMOTE_PANEL_SESSION_SECRET`)
- CSRF token required for all non-GET API routes
- login rate limiting by source IP
- optional session-IP binding (`REMOTE_PANEL_BIND_SESSION_IP=true`)
- optional IP allowlist (`REMOTE_PANEL_ALLOWLIST`)
- strict preview proxy host restrictions (loopback/local only)
- command execution via allowlisted actions only (no raw shell endpoint)

Security mode values:

- `off`: HTTP allowed
- `on`: HTTPS required for remote clients
- `auto`: private/local IPs allowed over HTTP, public IPs require HTTPS

Legacy compatibility:

- `REMOTE_PANEL_REQUIRE_HTTPS=true` maps to security mode `on`

## 6) Remote Settings and Precedence

Resolution order for runtime-configurable network settings:

1. CLI args (`--security=...`, `--tunnel-mode=...`, etc.)
2. runtime config file (`REMOTE_PANEL_RUNTIME_CONFIG`)
3. environment variables (`.env` / shell)

Default runtime config path:

- `.agency/remote/panel-runtime.json`

### Key Environment Variables

```dotenv
REMOTE_PANEL_PASSWORD=replace_with_long_unique_password
REMOTE_PANEL_SESSION_SECRET=replace_with_64_char_random_secret
REMOTE_PANEL_HOST=127.0.0.1
REMOTE_PANEL_PORT=8787
REMOTE_PANEL_SECURITY_MODE=off
REMOTE_PANEL_PUBLIC_HOST=
REMOTE_PANEL_RUNTIME_CONFIG=.agency/remote/panel-runtime.json
REMOTE_PANEL_ALLOWLIST=
REMOTE_PANEL_BIND_SESSION_IP=true
REMOTE_PANEL_PERSIST_SESSIONS=true
REMOTE_PANEL_SESSION_STORE=.agency/remote/panel-sessions.json
REMOTE_PANEL_TUNNEL_MODE=quick
REMOTE_PANEL_CLOUDFLARED_TUNNEL_TOKEN=
REMOTE_PANEL_CLOUDFLARED_TUNNEL_NAME=
REMOTE_PANEL_CLOUDFLARED_CONFIG=
REMOTE_PANEL_CLOUDFLARED_BIN=
```

`REMOTE_PANEL_PUBLIC_HOST` is the host hint shown as mobile/public URL when tunnel auto-discovery is unavailable.

If `REMOTE_PANEL_PASSWORD` or `REMOTE_PANEL_SESSION_SECRET` is missing, the server generates one-time values at startup and logs them.

## 7) Commands

From repo root:

```powershell
cmd /c npm run remote:panel
cmd /c npm run remote:panel:local
cmd /c npm run remote:panel:remote
cmd /c npm run remote:stack
cmd /c npm run remote:stack:remote
cmd /c npm run remote:stack -- --project=csscroll
cmd /c npm run remote:stack:remote -- --project=csscroll --panel-port=8787
cmd /c npm run remote:relay:codex:watch
cmd /c npm run remote:relay:codex:once -- --dry-run=true
cmd /c npm run remote:agent:status -- --state=working --message="Investigating issue"
cmd /c npm run remote:agent:reply -- --message="Implemented fix"
```

Stack presets:

- `remote:stack`: panel (local profile) + dev + relay watcher
- `remote:stack:remote`: panel (LAN/adaptive profile) + dev + relay watcher
- optional: `--no-dev=true` or `--no-relay=true`

## 8) Panel Controls (What They Do)

### Chat

- `Send`: send prompt now (unless in queue/stop mode)
- `Sync`: manual chat refresh
- `Live`: send prompts immediately
- `Queue`: store prompts, flush in order when switched back to `Live`
- `Stop`: pause sending

Composer lock behavior:

- while send is in progress, textarea/send/sync are disabled to prevent duplicate submit

Quick replies:

- numeric chips appear for explicit assistant choice prompts (for example `1. 2. 3.`)
- selecting a chip sends that value directly

### Sessions & Prep

- manage registered Codex session aliases
- set defaults by project/global
- run quick/full prep from panel
- start/stop relay watcher

### Remote Access

- refresh computed connection guidance
- copy mobile URL
- select tunnel mode (`Quick` / `Token` / `Named`)
- start/stop tunnel
- set security mode (`Enable HTTPS` or `Use Adaptive`)

### Preview

- choose manifest
- open preview in-panel/fullscreen/new tab
- auto-refresh interval control

## 9) API and WS Contract

Auth/session:

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/session`
- `GET /api/connection/help`
- `POST /api/security/mode`

Chat/relay:

- `GET /api/chat/history`
- `POST /api/note`
- `GET /api/agent/status`
- `GET /api/agent/activity`
- `GET /api/relay/status`
- `POST /api/relay/start`
- `POST /api/relay/stop`

Tunnel:

- `GET /api/tunnel/status`
- `POST /api/tunnel/start`
- `POST /api/tunnel/stop`

Workspace:

- `GET /api/projects`
- `GET /api/manifests`
- `GET /api/logs`
- `POST /api/dev/start`
- `POST /api/dev/stop`
- `POST /api/command/scaffold`
- `POST /api/command/build`
- `POST /api/command/build-all`
- `POST /api/chat/quick`
- `POST /api/chat/briefing`
- `GET /api/codex/sessions`
- `POST /api/codex/sessions/create`
- `POST /api/codex/sessions/upsert`
- `POST /api/codex/sessions/default`
- `POST /api/codex/sessions/retire`
- `POST /api/codex/sessions/prep`
- `GET /api/inbox/latest`
- `GET /api/agent/reply/latest`
- `GET /api/agent/poller`
- `POST /api/agent/status`
- `POST /api/agent/reply`
- `GET /api/events` (SSE logs/state)

WebSocket:

- `chat:init`
- `chat:update`
- `chat:ack`
- `chat:error`
- `activity:event`

## 10) Recommended Profiles

### Local only (default)

```powershell
cmd /c npm run remote:panel
```

Open:

- `http://127.0.0.1:8787`

### Phone on same network

```powershell
cmd /c npm run remote:stack:remote -- --project=csscroll
```

Then use panel-provided Mobile URL.

### Outside home network (preferred)

1. Run panel local or remote profile.
2. Set security mode to `on` (or use tunnel start which enforces it).
3. Start tunnel from Remote Access panel.
4. Use tunnel URL + identity controls.

Do not expose raw router port forwarding directly to panel.

## 11) Troubleshooting

### `Missing --message for reply command`

`remote:agent:reply` needs a message:

```powershell
cmd /c npm run remote:agent:reply -- --message="Your reply text"
```

### `chat:new:quick` project arg fails

`chat:new:*` now routes through `scripts/chat/run-prepare-chat-instance.mjs`, which accepts:

```powershell
cmd /c npm run chat:new:quick -- --project=csscroll
```

### Phone says `connection refused`

- ensure panel host is `0.0.0.0` (`remote:panel:remote` or `remote:stack:remote`)
- verify firewall allows chosen port
- verify correct LAN IP (not stale virtual adapter IP)
- if outside LAN, use tunnel URL

### No tunnel URL shown for account tunnel

Set `REMOTE_PANEL_PUBLIC_HOST` to your real tunnel hostname so panel can show a clickable URL.

### Icons/fonts not rendering

Font assets are local under:

- `remote-console/public/vendor/fontello/`

If browser cache is stale, hard refresh.

## 12) Maintenance and Cleanup

Suggested periodic cleanup:

- rotate `REMOTE_PANEL_SESSION_SECRET`
- rotate Cloudflare token/credentials
- prune stale inbox/outbox notes if they grow too large
- review `.agency/remote/activity.jsonl` size
- validate `REMOTE_PANEL_ALLOWLIST` after network changes

## 13) Concurrent Operator Mode

This repository can be operated by multiple Codex instances in parallel.

Operational guardrails:

- Parallel edits are expected; do not use destructive git commands to "clean" unknown changes.
- Use scoped file ownership per task and keep commits small.
- Avoid duplicate process collisions:
  - run only one relay watcher per `session-name` unless you intentionally shard sessions
  - use unique panel ports when starting multiple panel processes
  - avoid starting two dev watchers on the same explicit port
- If both operators need the same file, coordinate first in `TASKLIST.md` (`Active`) before broad refactors.
- For remote panel testing in parallel, prefer one shared panel instance and separate feature branches for code changes.

***

If you change panel behavior, update this file first so operational docs stay source-of-truth aligned with code.
