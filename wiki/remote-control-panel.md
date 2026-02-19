# Remote Control Panel

## 1) What This Is

`remote-console/server.mjs` provides a secure web UI to control this local workspace remotely.

Core capabilities:
- authenticated command control (no arbitrary shell input)
- start/stop dev watchers
- build/scaffold/chat bootstrap actions
- live logs over SSE
- preview proxy from `.agency/dev-servers/*.json`
- remote note dropbox to `.agency/remote/inbox/`

## 2) Commands

From `C:\Users\SKIKK\Documents\websites\Playground`:

```powershell
cmd /c npm run remote:panel
cmd /c npm run remote:panel:lan
cmd /c npm run remote:panel -- --port=4380
cmd /c npm run remote:panel:lan -- --port=4380
```

## 3) Security Model

Implemented controls:
- Password login (`REMOTE_PANEL_PASSWORD`).
- Signed HttpOnly session cookie (`REMOTE_PANEL_SESSION_SECRET`).
- CSRF token required for every non-GET API call.
- Login rate limiting per IP.
- Optional session-IP binding (`REMOTE_PANEL_BIND_SESSION_IP=true`).
- Optional HTTPS enforcement (`REMOTE_PANEL_REQUIRE_HTTPS=true`).
- Optional source allowlist (`REMOTE_PANEL_ALLOWLIST`).
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
REMOTE_PANEL_REQUIRE_HTTPS=false
REMOTE_PANEL_ALLOWLIST=
REMOTE_PANEL_BIND_SESSION_IP=true
REMOTE_PREVIEW_REFRESH_MS=3000
```

Notes:
- If password/secret are missing, the server generates one-time values at startup.
- For outside-network access, set `REMOTE_PANEL_REQUIRE_HTTPS=true` and run behind a TLS tunnel/proxy.

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

Then browse to:
- `http://<your-computer-lan-ip>:4380`

Find LAN IP:

```powershell
ipconfig | Select-String 'IPv4 Address'
```

## 7) Outside Network Access (Preferred: Tunnel)

Do not open router port forwarding directly to the panel.
Use an HTTPS tunnel with identity controls.

Minimal secure pattern:
1. Run panel bound to localhost.
2. Enable HTTPS requirement.
3. Publish through Cloudflared/Ngrok/Tailscale Funnel.

Example:

```powershell
$env:REMOTE_PANEL_HOST='127.0.0.1'
$env:REMOTE_PANEL_PORT='4380'
$env:REMOTE_PANEL_REQUIRE_HTTPS='true'
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

Workspace/control:
- `GET /api/projects`
- `GET /api/manifests`
- `GET /api/logs`
- `GET /api/events`
- `POST /api/command/scaffold`
- `POST /api/command/build`
- `POST /api/command/build-all`
- `POST /api/dev/start`
- `POST /api/dev/stop`
- `POST /api/chat/quick`
- `POST /api/chat/briefing`
- `POST /api/note`

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

## 12) Operational Notes

- Remote notes are stored at `.agency/remote/inbox/`.
- Dev process lifecycle is managed by panel start/stop actions.
- Session cookies are in-memory only and reset when panel restarts.
