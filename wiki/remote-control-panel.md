# Remote Control Panel

## 1) What This Is

`remote-console/server.mjs` provides a secure web UI to control this local workspace remotely.

Core capabilities:
- authenticated command control (no arbitrary shell input)
- start/stop dev watchers
- build/scaffold/chat bootstrap actions
- live logs over SSE
- realtime chat over WebSocket (`/ws`)
- mobile-first chat shell (dark theme, pinned composer, hamburger panel nav)
- one-click external tunnel control (Cloudflared) from panel
- preview proxy from `.agency/dev-servers/*.json`
- remote note dropbox to `.agency/remote/inbox/`
- Codex relay status in `.agency/remote/agent-status.json`
- Codex response outbox in `.agency/remote/outbox/`
- Codex session registry in `.agency/remote/codex-sessions.json`

## 2) Commands

From `C:\Users\SKIKK\Documents\websites\Playground`:

```powershell
cmd /c npm run remote:panel
cmd /c npm run remote:panel:lan
cmd /c npm run remote:panel:mobile
cmd /c npm run remote:panel -- --port=4380
cmd /c npm run remote:panel:lan -- --port=4380
cmd /c npm run remote:agent:status -- --state=working --message="Investigating panel issue"
cmd /c npm run remote:agent:reply -- --message="Implemented fix. Restart panel."
cmd /c npm run remote:relay:codex:watch
cmd /c npm run remote:relay:codex:once -- --dry-run=true
```

Interactive relay notes:
- Starts as an additive module; does not replace panel behavior.
- Default behavior is safe: starts from latest inbox/outbox markers to avoid replaying old backlog.
- Default Codex target is registry alias `codex-chat` from `.agency/remote/codex-sessions.json`.
- Current explicit session id for that thread: `019c7841-51ba-7470-877f-7d429a491392`.
- For project-scoped memory/docs, run relay with `--project=<slug>`.
- To process backlog intentionally: add `--start-from-latest=false`.
- To bind to a different Codex session: add `--codex-use-last=false --codex-session-id=<thread-id-or-name>`.
- Persistent session registry file: `.agency/remote/codex-sessions.json`.

## 3) Security Model

Implemented controls:
- Password login (`REMOTE_PANEL_PASSWORD`).
- Signed HttpOnly session cookie (`REMOTE_PANEL_SESSION_SECRET`).
- CSRF token required for every non-GET API call.
- Login rate limiting per IP.
- Optional session-IP binding (`REMOTE_PANEL_BIND_SESSION_IP=true`).
- Security mode:
  - `REMOTE_PANEL_SECURITY_MODE=off` (HTTP allowed local/LAN)
  - `REMOTE_PANEL_SECURITY_MODE=on` (HTTPS required)
  - `REMOTE_PANEL_SECURITY_MODE=auto` (HTTP for private/local IPs, HTTPS for public IPs)
- Legacy toggle still supported: `REMOTE_PANEL_REQUIRE_HTTPS=true` maps to security mode `on`.
- Optional source allowlist (`REMOTE_PANEL_ALLOWLIST`).
- Persistent panel auth sessions by default (`REMOTE_PANEL_PERSIST_SESSIONS=true`).
- Preview proxy restricted to manifest IDs in `.agency/dev-servers/`.
- Preview upstream restricted to local hosts only (`127.0.0.1`, `localhost`, `::1`, `0.0.0.0`).
- No endpoint accepts raw shell commands.

Command actions are fixed allowlist routes:
- `POST /api/command/scaffold`
- `POST /api/command/build`
- `POST /api/command/build-all`
- `POST /api/dev/start`
- `POST /api/dev/stop`
- `POST /api/chat/quick`
- `POST /api/chat/briefing`
- `POST /api/note`

## 4) Environment Variables

Add to `.env`:

```dotenv
REMOTE_PANEL_PASSWORD=replace_with_long_unique_password
REMOTE_PANEL_SESSION_SECRET=replace_with_64_char_random_secret
REMOTE_PANEL_HOST=127.0.0.1
REMOTE_PANEL_PORT=8787
REMOTE_PANEL_SECURITY_MODE=off
REMOTE_PANEL_PUBLIC_HOST=
REMOTE_PANEL_RUNTIME_CONFIG=.agency/remote/panel-runtime.json
REMOTE_PANEL_CLOUDFLARED_BIN=
REMOTE_PANEL_ALLOWLIST=
REMOTE_PANEL_BIND_SESSION_IP=true
REMOTE_PANEL_PERSIST_SESSIONS=true
REMOTE_PANEL_SESSION_STORE=.agency/remote/panel-sessions.json
REMOTE_PREVIEW_REFRESH_MS=3000
```

Notes:
- If password/secret are missing, the server generates one-time values at startup.
- For outside-network access, set `REMOTE_PANEL_SECURITY_MODE=on` and run behind a TLS tunnel/proxy.
- For phone use, set `REMOTE_PANEL_PUBLIC_HOST=<lan-ip-or-host[:port]>` so the panel shows a concrete mobile URL.
- Runtime security changes from the panel are persisted in `REMOTE_PANEL_RUNTIME_CONFIG` (default `.agency/remote/panel-runtime.json`).
- Tunnel actions from the panel use `cloudflared` on `PATH` and target `http://127.0.0.1:<panel-port>` by default.
- On Windows, panel auto-detects `C:\Program Files\cloudflared\cloudflared.exe` and `C:\Program Files (x86)\cloudflared\cloudflared.exe`; override with `REMOTE_PANEL_CLOUDFLARED_BIN`.

## 5) Local-Only Start (Recommended Default)

```powershell
$env:REMOTE_PANEL_HOST='127.0.0.1'
$env:REMOTE_PANEL_PORT='4380'
$env:REMOTE_PANEL_PASSWORD='set-a-strong-password'
$env:REMOTE_PANEL_SESSION_SECRET='set-a-long-random-secret'
cmd /c npm run remote:panel
```

Open:
- `http://127.0.0.1:4380`

## 6) LAN Access (Phone On Same Wi-Fi)

```powershell
$env:REMOTE_PANEL_HOST='0.0.0.0'
$env:REMOTE_PANEL_PORT='4380'
$env:REMOTE_PANEL_PASSWORD='set-a-strong-password'
$env:REMOTE_PANEL_SESSION_SECRET='set-a-long-random-secret'
$env:REMOTE_PANEL_ALLOWLIST='192.168.1.*,10.0.0.*'
cmd /c npm run remote:panel:lan
```

Mobile-friendly adaptive mode:

```powershell
$env:REMOTE_PANEL_HOST='0.0.0.0'
$env:REMOTE_PANEL_PORT='8787'
$env:REMOTE_PANEL_SECURITY_MODE='auto'
$env:REMOTE_PANEL_PUBLIC_HOST='172.23.176.1:8787'
cmd /c npm run remote:panel:mobile
```

Then browse to:
- `http://<your-computer-lan-ip>:4380`
- On phones, use the top-right hamburger button to open panel navigation.
- Chat composer stays pinned at the bottom so send controls remain visible.

Find LAN IP:

```powershell
ipconfig | Select-String 'IPv4 Address'
```

If you see multiple IPs, prefer your active Wi-Fi/Ethernet adapter address (often `192.168.x.x` or `10.x.x.x`) instead of virtual adapters (for example WSL/Hyper-V `172.x.x.x` addresses).

## 7) Outside Network Access (Preferred: Tunnel)

Do not open router port forwarding directly to the panel.
Use an HTTPS tunnel with identity controls.

Minimal secure pattern:
1. Run panel bound to localhost.
2. Enable HTTPS requirement.
3. Publish through Cloudflared/Ngrok/Tailscale Funnel.
4. Or use panel buttons in `Remote Access` (`Start Tunnel`, `Stop Tunnel`, `Tunnel Status`).

Example:

```powershell
$env:REMOTE_PANEL_HOST='127.0.0.1'
$env:REMOTE_PANEL_PORT='4380'
$env:REMOTE_PANEL_SECURITY_MODE='on'
cmd /c npm run remote:panel
```

In another terminal, tunnel localhost 4380 via your provider.

## 8) Live Preview Path

The panel reads `.agency/dev-servers/*.json` and exposes each manifest through:
- `/preview/<manifest-id>/...`

That means phone/tunnel clients can load previews from the panel host even when manifests contain `127.0.0.1` URLs.

Recommended flow:
1. Start `dev` or `dev:all`.
2. Open panel.
3. Select manifest in the preview section.
4. Keep auto-refresh enabled for quick visual updates.

## 9) API Reference

Auth/session:
- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/session`
- `GET /api/connection/help`
- `POST /api/security/mode`
- `GET /api/tunnel/status`
- `POST /api/tunnel/start`
- `POST /api/tunnel/stop`

Workspace/control:
- `GET /api/projects`
- `GET /api/manifests`
- `GET /api/logs`
- `GET /api/codex/sessions`
- `GET /api/inbox/latest`
- `GET /api/chat/history`
- `GET /api/agent/status`
- `GET /api/agent/reply/latest`
- `GET /api/agent/poller`
- `GET /api/relay/status`
- `GET /api/events`
- `WS /ws`
- `POST /api/command/scaffold`
- `POST /api/command/build`
- `POST /api/command/build-all`
- `POST /api/dev/start`
- `POST /api/dev/stop`
- `POST /api/chat/quick`
- `POST /api/chat/briefing`
- `POST /api/relay/start`
- `POST /api/relay/stop`
- `POST /api/codex/sessions/create`
- `POST /api/codex/sessions/upsert`
- `POST /api/codex/sessions/default`
- `POST /api/codex/sessions/retire`
- `POST /api/codex/sessions/prep`
- `POST /api/note`
- `POST /api/agent/status`
- `POST /api/agent/reply`

WebSocket message types:
- `chat:init`
- `chat:update`
- `chat:ack`
- `chat:error`
- `activity:event`

## 10) Quick Verification Commands

Health:

```powershell
Invoke-RestMethod http://127.0.0.1:4380/api/health
```

Login + session:

```powershell
$login = Invoke-RestMethod -Uri 'http://127.0.0.1:4380/api/auth/login' -Method Post -ContentType 'application/json' -Body '{"password":"<your-password>"}' -SessionVariable ws
$csrf = $login.csrfToken
Invoke-RestMethod -Uri 'http://127.0.0.1:4380/api/session' -WebSession $ws
```

Start single-project dev via API:

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:4380/api/dev/start' -Method Post -ContentType 'application/json' -WebSession $ws -Headers @{ 'x-csrf-token' = $csrf } -Body '{"mode":"single","project":"csscroll","port":"5173"}'
```

## 11) Troubleshooting

Panel cannot run commands in restricted environments:
- Error like `spawn EPERM` means process-spawn is blocked by host policy/sandbox.
- Run panel in your normal local shell session (outside restricted runner).

Port conflicts:

```powershell
netstat -ano | Select-String ':4380|:5173'
```

No preview manifests:
- Start `cmd /c npm run dev -- --project=csscroll` or `cmd /c npm run dev:all` first.
- Then refresh panel manifest list.

CSRF failures:
- Ensure non-GET calls include `x-csrf-token` from `GET /api/session` or login response.

Mobile UI:
- If panel navigation is open, tap outside the menu or press `Esc` (desktop) to close it.
- Utility dock opens as a slide-over panel on narrow viewports and can be hidden with `HIDE`.

## 12) Operational Notes

- Remote notes are stored at `.agency/remote/inbox/`.
- Codex responses can be published to `.agency/remote/outbox/`.
- Codex status is tracked in `.agency/remote/agent-status.json`.
- Optional interactive relay module: `scripts/remote/codex-interactive-relay.mjs`.
- Relay memory persistence uses `mcp/data/memory.jsonl` with entity `remote-chat-project:<project>` (or `remote-chat-session:<session-name>` when no project is set).
- Relay can auto-append project docs at `.agency/remote/project-memory/<project>.md` when `--project` is provided.
- Relay watcher can be started/stopped directly from panel UI (Sessions & Prep section) without terminal commands.
- Connection panel includes one-click security mode toggles (Enable HTTPS / Use Adaptive) via `POST /api/security/mode`.
- Connection panel includes one-click tunnel controls (Start/Stop/Status/Open) backed by `/api/tunnel/*`.
- Starting a tunnel from panel automatically switches runtime security mode to `on` and updates public host hint to the tunnel URL.
- Dev process lifecycle is managed by panel start/stop actions.
- Panel auth sessions persist across restarts in `.agency/remote/panel-sessions.json` by default.
