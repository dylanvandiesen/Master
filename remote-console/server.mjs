import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import readline from "node:readline";
import os from "node:os";
import { spawn } from "node:child_process";
import { WebSocketServer } from "ws";
import {
  DEFAULT_CODEX_SESSION_REGISTRY_FILE,
  listCodexSessions,
  normalizeSessionName,
  readCodexSessionRegistry,
  resolveCodexSessionTarget,
  retireCodexSession,
  setDefaultCodexSession,
  upsertCodexSession,
  validateSessionName,
  validateSessionTarget,
  validateProjectRef as validateCodexProjectRef,
  writeCodexSessionRegistry,
} from "../scripts/remote/codex-session-registry.mjs";
import {
  listAgentProfiles,
  readAgentProfileRegistry,
  resolveAgentProfile,
  retireAgentProfile,
  setDefaultAgentProfile,
  upsertAgentProfile,
} from "../scripts/remote/agent-profile-registry.mjs";
import {
  appendLaunchRun,
  getLaunchRunById,
  mergeEnvRuntime,
  readEnvProfiles,
  readEnvRuntime,
  readLaunchRuns,
  retireEnvProfile,
  setDefaultEnvProfile,
  upsertEnvProfile,
} from "../scripts/env/lib/env-registry.mjs";
import {
  buildPublicUrl as buildManagedPublicUrl,
  canManageRemoteRedirect,
  resolvePublicHostAutomationConfig,
  runRemoteRedirectUpdate,
  verifyPublicHost,
} from "../scripts/remote/commander-public-host.mjs";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "remote-console", "public");
const DOMTERM_ASSET_ROOT = path.join(ROOT, "node_modules", "DomTerm");
const XTERM_ASSET_CANDIDATES = {
  "/vendor/xterm/xterm.js": [
    path.join(ROOT, "node_modules", "xterm", "lib", "xterm.js"),
    path.join(ROOT, "node_modules", "@xterm", "xterm", "lib", "xterm.js"),
  ],
  "/vendor/xterm/xterm.css": [
    path.join(ROOT, "node_modules", "xterm", "css", "xterm.css"),
    path.join(ROOT, "node_modules", "@xterm", "xterm", "css", "xterm.css"),
  ],
};
const MANIFEST_DIR = path.join(ROOT, ".agency", "dev-servers");
const INBOX_DIR = path.join(ROOT, ".agency", "remote", "inbox");
const OUTBOX_DIR = path.join(ROOT, ".agency", "remote", "outbox");
const AGENT_STATUS_FILE = path.join(ROOT, ".agency", "remote", "agent-status.json");
const ACTIVITY_LOG_FILE = path.join(ROOT, ".agency", "remote", "activity.jsonl");
const PANEL_RUNTIME_CONFIG_FILE = path.resolve(
  ROOT,
  process.env.REMOTE_PANEL_RUNTIME_CONFIG || ".agency/remote/panel-runtime.json"
);
const PANEL_CREDENTIALS_FILE = path.resolve(
  ROOT,
  process.env.REMOTE_PANEL_CREDENTIALS_FILE || ".agency/remote/panel-credentials.json"
);

const SESSION_COOKIE_NAME = "rc_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const SESSION_TOUCH_PERSIST_THRESHOLD_MS = 5 * 60 * 1000;
const SESSION_SWEEP_INTERVAL_MS = 60 * 1000;
const WS_HEARTBEAT_INTERVAL_MS = 30 * 1000;
const MAX_LOGIN_ATTEMPTS = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_BODY_BYTES = 1_000_000;
const MAX_LOG_LINES = 1500;
const SAFE_MANIFEST_ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,100}$/;
const SAFE_PROJECT_REF = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
const LOCAL_PREVIEW_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "0.0.0.0"]);
const AGENT_STATES = new Set(["idle", "pending", "thinking", "working", "blocked"]);
const CHAT_MAX_MESSAGES = 120;
const WS_PATH = "/ws";
const TERMINAL_WS_PATH = "/terminal-ws";
const TERMINAL_OUTPUT_MAX_BYTES = 4 * 1024 * 1024;
const TERMINAL_OUTPUT_MAX_CHUNKS = 8000;
const TERMINAL_INITIAL_HISTORY_MAX_BYTES = 512 * 1024;
const TERMINAL_INITIAL_HISTORY_MAX_CHUNKS = 320;
const TERMINAL_DEFAULT_COLS = 120;
const TERMINAL_DEFAULT_ROWS = 32;
const TERMINAL_MIN_COLS = 20;
const TERMINAL_MAX_COLS = 320;
const TERMINAL_MIN_ROWS = 8;
const TERMINAL_MAX_ROWS = 200;
const TERMINAL_MAX_INPUT_BYTES = 64 * 1024;
const TERMINAL_SHARED_SESSION_ID = "__shared__";
const TUNNEL_DISCOVERY_TIMEOUT_MS = 45_000;
const URL_IN_TEXT_REGEX = /https:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?::\d+)?(?:\/[^\s]*)?/g;
const TUNNEL_MODES = new Set(["quick", "token", "named"]);
const TUNNEL_PROVIDERS = new Set(["cloudflared", "server"]);
const TERMINAL_USE_CONPTY = parseBool(process.env.REMOTE_PANEL_TERMINAL_USE_CONPTY, false);
const WINDOWS_CLOUDFLARED_CANDIDATES = [
  "C:\\Program Files\\cloudflared\\cloudflared.exe",
  "C:\\Program Files (x86)\\cloudflared\\cloudflared.exe",
];

const state = {
  logs: [],
  sessions: new Map(),
  loginAttempts: new Map(),
  sseClients: new Set(),
  wsClients: new Set(),
  wsSessionBySocket: new Map(),
  terminalWsClients: new Set(),
  terminalWsSessionBySocket: new Map(),
  terminalSessions: new Map(),
  commandRunning: false,
  activeEnvironment: null,
  activeDev: null,
  activeRelay: null,
  activeRelays: new Map(),
  activeTunnel: null,
  publicHostVerification: null,
  lastChatSignature: "",
};

let nodePtyModulePromise = null;

function loadDotEnvFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const index = trimmed.indexOf("=");
      if (index <= 0) {
        continue;
      }
      const name = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[name]) {
        process.env[name] = value;
      }
    }
  } catch {
    // No .env file or unreadable file. Environment variables can still come from the shell.
  }
}

loadDotEnvFile(path.join(ROOT, ".env"));

function parseArgValue(name) {
  const prefixed = `--${name}=`;
  for (let i = 2; i < process.argv.length; i += 1) {
    const arg = process.argv[i];
    if (arg.startsWith(prefixed)) {
      return arg.slice(prefixed.length);
    }
    if (arg === `--${name}`) {
      return process.argv[i + 1] ?? "";
    }
  }
  return "";
}

function parseBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseTunnelMode(value, fallback = "quick") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (TUNNEL_MODES.has(normalized)) {
    return normalized;
  }
  return fallback;
}

function parseTunnelProvider(value, fallback = "cloudflared") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (TUNNEL_PROVIDERS.has(normalized)) {
    return normalized;
  }
  return fallback;
}

function resolveFirstExistingFile(candidates = []) {
  for (const candidate of candidates) {
    try {
      if (candidate && fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {
      // ignore candidate lookup errors and continue
    }
  }
  return "";
}

function resolveDomTermAsset(resolvedPath) {
  const prefix = "/vendor/domterm/";
  if (!resolvedPath.startsWith(prefix)) {
    return "";
  }
  const relativePath = resolvedPath.slice(prefix.length);
  if (!relativePath || relativePath.includes("\0")) {
    return "";
  }
  const normalized = path.normalize(relativePath).replace(/\\/g, "/");
  if (normalized === ".." || normalized.startsWith("../")) {
    return "";
  }
  const fsPath = path.join(DOMTERM_ASSET_ROOT, normalized);
  if (!fsPath.startsWith(DOMTERM_ASSET_ROOT)) {
    return "";
  }
  try {
    if (!fs.existsSync(fsPath)) {
      return "";
    }
  } catch {
    return "";
  }
  return fsPath;
}

function normalizeIp(rawIp) {
  if (!rawIp) {
    return "";
  }
  if (rawIp.startsWith("::ffff:")) {
    return rawIp.slice(7);
  }
  if (rawIp === "::1") {
    return "127.0.0.1";
  }
  return rawIp;
}

function isLikelyVirtualInterface(name) {
  const label = String(name || "").toLowerCase();
  if (!label) {
    return false;
  }
  return (
    label.includes("vethernet") ||
    label.includes("hyper-v") ||
    label.includes("vmware") ||
    label.includes("virtualbox") ||
    label.includes("docker") ||
    label.includes("wsl") ||
    label.includes("loopback")
  );
}

function listLanIpv4Addresses() {
  const network = os.networkInterfaces();
  const preferred = [];
  const fallback = [];
  for (const [name, iface] of Object.entries(network)) {
    for (const candidate of iface || []) {
      if (!candidate || candidate.family !== "IPv4" || candidate.internal) {
        continue;
      }
      if (!candidate.address || candidate.address.startsWith("169.254.")) {
        continue;
      }
      if (isLikelyVirtualInterface(name)) {
        fallback.push(candidate.address);
      } else {
        preferred.push(candidate.address);
      }
    }
  }
  const addresses = [...preferred, ...fallback];
  return [...new Set(addresses)].sort((left, right) => left.localeCompare(right));
}

function parseAllowlist(raw) {
  return String(raw ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function loadRuntimeConfigSync(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
}

function loadPanelCredentialsSync(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
}

function persistPanelCredentialsSync(filePath, credentials) {
  try {
    const payload = credentials && typeof credentials === "object" ? credentials : {};
    const parentDir = path.dirname(filePath);
    fs.mkdirSync(parentDir, { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  } catch {
    // ignore credential persistence failures
  }
}

function parseSecurityMode(value, fallback = "off") {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  if (["on", "true", "https", "required"].includes(normalized)) {
    return "on";
  }
  if (["off", "false", "http", "disabled"].includes(normalized)) {
    return "off";
  }
  if (["auto", "adaptive"].includes(normalized)) {
    return "auto";
  }
  return fallback;
}

function normalizePublicHost(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/^https?:\/\//i, "");
  if (!normalized) {
    return "";
  }
  return normalized.replace(/\/+$/, "");
}

function normalizeBasePath(value) {
  const raw = String(value || "").trim();
  if (!raw || raw === "/") {
    return "";
  }
  const prefixed = raw.startsWith("/") ? raw : `/${raw}`;
  const normalized = prefixed.replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  return normalized === "/" ? "" : normalized;
}

function normalizeRequestPath(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "/";
  }
  const prefixed = raw.startsWith("/") ? raw : `/${raw}`;
  const normalized = prefixed.replace(/\/{2,}/g, "/");
  return normalized || "/";
}

function buildPublicUrl(rawHost, protocol) {
  const input = normalizePublicHost(rawHost);
  if (!input) {
    return "";
  }
  if (/^https?:\/\//i.test(input)) {
    try {
      const parsed = new URL(input);
      if (settings.basePath && (!parsed.pathname || parsed.pathname === "/")) {
        parsed.pathname = withBasePath("/");
      }
      return parsed.toString().replace(/\/$/, parsed.pathname === "/" ? "/" : "");
    } catch {
      return input;
    }
  }
  const hasPort = /:\d+$/.test(input);
  const built = hasPort ? `${protocol}://${input}` : `${protocol}://${input}:${settings.port}`;
  if (!settings.basePath) {
    return built;
  }
  const parsed = new URL(built);
  parsed.pathname = withBasePath("/");
  return parsed.toString();
}

const legacyRequireHttps = parseBool(process.env.REMOTE_PANEL_REQUIRE_HTTPS, false);
const defaultSecurityMode = legacyRequireHttps ? "on" : "off";
const runtimeConfig = loadRuntimeConfigSync(PANEL_RUNTIME_CONFIG_FILE);
const publicHostAutomation = resolvePublicHostAutomationConfig(process.env);
const securityModeInput = parseArgValue("security") || runtimeConfig.securityMode || process.env.REMOTE_PANEL_SECURITY_MODE;
const tunnelModeInput = parseArgValue("tunnel-mode") || runtimeConfig.tunnelMode || process.env.REMOTE_PANEL_TUNNEL_MODE;
const settings = {
  host: parseArgValue("host") || process.env.REMOTE_PANEL_HOST || "127.0.0.1",
  port: parseInteger(parseArgValue("port") || process.env.REMOTE_PANEL_PORT, 8787),
  password: process.env.REMOTE_PANEL_PASSWORD || "",
  sessionSecret: process.env.REMOTE_PANEL_SESSION_SECRET || "",
  securityMode: parseSecurityMode(securityModeInput, defaultSecurityMode),
  allowlist: parseAllowlist(process.env.REMOTE_PANEL_ALLOWLIST),
  previewRefreshMs: Math.max(1000, Math.min(20000, parseInteger(process.env.REMOTE_PREVIEW_REFRESH_MS, 3000))),
  bindSessionIp: parseBool(process.env.REMOTE_PANEL_BIND_SESSION_IP, true),
  publicHost:
    normalizePublicHost(parseArgValue("public-host")) ||
    normalizePublicHost(runtimeConfig.publicHost) ||
    normalizePublicHost(process.env.REMOTE_PANEL_PUBLIC_HOST) ||
    normalizePublicHost(process.env.REMOTE_PANEL_MOBILE_IP),
  basePath:
    normalizeBasePath(parseArgValue("base-path")) ||
    normalizeBasePath(runtimeConfig.basePath) ||
    normalizeBasePath(process.env.REMOTE_PANEL_BASE_PATH),
  persistSessions: parseBool(process.env.REMOTE_PANEL_PERSIST_SESSIONS, true),
  sessionStoreFile: path.resolve(ROOT, process.env.REMOTE_PANEL_SESSION_STORE || ".agency/remote/panel-sessions.json"),
  runtimeConfigFile: PANEL_RUNTIME_CONFIG_FILE,
  tunnelProvider: parseTunnelProvider(
    parseArgValue("tunnel-provider") || runtimeConfig.tunnelProvider || process.env.REMOTE_PANEL_TUNNEL_PROVIDER,
    "cloudflared"
  ),
  sharedTerminal: parseBool(process.env.REMOTE_PANEL_SHARED_TERMINAL, true),
  tunnelMode: parseTunnelMode(tunnelModeInput, "quick"),
  cloudflaredBin: String(parseArgValue("cloudflared-bin") || process.env.REMOTE_PANEL_CLOUDFLARED_BIN || "").trim(),
  cloudflaredTunnelToken: String(
    parseArgValue("cloudflared-token") || process.env.REMOTE_PANEL_CLOUDFLARED_TUNNEL_TOKEN || ""
  ).trim(),
  cloudflaredTunnelName: String(
    parseArgValue("cloudflared-name") || process.env.REMOTE_PANEL_CLOUDFLARED_TUNNEL_NAME || ""
  ).trim(),
  cloudflaredConfig: String(parseArgValue("cloudflared-config") || process.env.REMOTE_PANEL_CLOUDFLARED_CONFIG || "").trim(),
  credentialsFile: PANEL_CREDENTIALS_FILE,
  publicHostVerifyTimeoutMs: publicHostAutomation.publicHostVerifyTimeoutMs,
  publicAuthUser: publicHostAutomation.publicAuthUser,
  publicAuthPassword: publicHostAutomation.publicAuthPassword,
  autoRemoteRedirect: publicHostAutomation.autoRemoteRedirect,
  remoteRedirectHost: publicHostAutomation.remoteRedirectHost,
  remoteRedirectUser: publicHostAutomation.remoteRedirectUser,
  remoteRedirectKeyPath: publicHostAutomation.remoteRedirectKeyPath,
  remoteRedirectSitePath: publicHostAutomation.remoteRedirectSitePath,
  localCommanderSitePath: publicHostAutomation.localCommanderSitePath,
};

function withBasePath(pathname = "/") {
  const normalized = normalizeRequestPath(pathname);
  if (!settings.basePath) {
    return normalized;
  }
  if (normalized === "/") {
    return `${settings.basePath}/`;
  }
  return `${settings.basePath}${normalized}`;
}

function stripBasePath(pathname = "/") {
  const normalized = normalizeRequestPath(pathname);
  if (!settings.basePath) {
    return normalized;
  }
  if (normalized === settings.basePath || normalized === `${settings.basePath}/`) {
    return "/";
  }
  const prefix = `${settings.basePath}/`;
  if (!normalized.startsWith(prefix)) {
    return null;
  }
  const stripped = normalized.slice(settings.basePath.length);
  return stripped || "/";
}

function sessionCookiePath() {
  return settings.basePath || "/";
}

const PANEL_BOOT_AT = Date.now();
const PANEL_BOOT_ISO = new Date(PANEL_BOOT_AT).toISOString();
const PANEL_BOOT_TOKEN = String(process.env.REMOTE_PANEL_BOOT_TOKEN || "")
  .trim()
  || `${PANEL_BOOT_AT.toString(36)}-${crypto.randomBytes(6).toString("hex")}`;

function isPrivateIpv4(ip) {
  if (!ip || typeof ip !== "string") {
    return false;
  }
  if (ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("169.254.")) {
    return true;
  }
  const match172 = ip.match(/^172\.(\d{1,3})\./);
  if (match172) {
    const second = Number.parseInt(match172[1], 10);
    if (Number.isFinite(second) && second >= 16 && second <= 31) {
      return true;
    }
  }
  return false;
}

function isPrivateNetworkIp(ip) {
  return isLocalIp(ip) || isPrivateIpv4(ip);
}

function effectiveSecurityModeForIp(ip) {
  if (settings.securityMode !== "auto") {
    return settings.securityMode;
  }
  return isPrivateNetworkIp(ip) ? "off" : "on";
}

function securityModeLabel(mode) {
  if (mode === "on") {
    return "HTTPS required";
  }
  if (mode === "auto") {
    return "Adaptive: HTTPS for public clients";
  }
  return "HTTP allowed (local/LAN)";
}

function buildRuntimeConfigPayload() {
  return {
    updatedAt: timestamp(),
    securityMode: settings.securityMode,
    publicHost: settings.publicHost || "",
    basePath: settings.basePath || "",
    tunnelProvider: parseTunnelProvider(settings.tunnelProvider, "cloudflared"),
    tunnelMode: parseTunnelMode(settings.tunnelMode, "quick"),
  };
}

async function persistRuntimeConfig() {
  const payload = buildRuntimeConfigPayload();
  await fsp.mkdir(path.dirname(settings.runtimeConfigFile), { recursive: true });
  await fsp.writeFile(settings.runtimeConfigFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

if (!settings.password || settings.password.startsWith("replace_with")) {
  const persisted = loadPanelCredentialsSync(settings.credentialsFile);
  if (typeof persisted.password === "string" && persisted.password.trim()) {
    settings.password = persisted.password.trim();
    console.warn("[remote-panel] REMOTE_PANEL_PASSWORD is not set. Using persisted panel password.");
  } else {
    settings.password = crypto.randomBytes(18).toString("base64url");
    console.warn("[remote-panel] REMOTE_PANEL_PASSWORD is not set. Generated persistent password.");
    console.warn(`[remote-panel] Persistent password: ${settings.password}`);
    persistPanelCredentialsSync(settings.credentialsFile, {
      ...persisted,
      password: settings.password,
    });
  }
}

if (!settings.sessionSecret || settings.sessionSecret.startsWith("replace_with")) {
  const persisted = loadPanelCredentialsSync(settings.credentialsFile);
  if (typeof persisted.sessionSecret === "string" && persisted.sessionSecret.trim()) {
    settings.sessionSecret = persisted.sessionSecret.trim();
    console.warn("[remote-panel] REMOTE_PANEL_SESSION_SECRET is not set. Using persisted panel session secret.");
  } else {
    settings.sessionSecret = crypto.randomBytes(32).toString("base64url");
    console.warn("[remote-panel] REMOTE_PANEL_SESSION_SECRET is not set. Generated persistent secret.");
    persistPanelCredentialsSync(settings.credentialsFile, {
      ...persisted,
      sessionSecret: settings.sessionSecret,
    });
  }
}

function timestamp() {
  return new Date().toISOString();
}

function normalizeAgentState(state) {
  const normalized = String(state || "").trim().toLowerCase();
  if (AGENT_STATES.has(normalized)) {
    return normalized;
  }
  return "idle";
}

function buildConnectionHelpPayload() {
  const lanIps = listLanIpv4Addresses();
  const securityMode = settings.securityMode;
  const tunnelProvider = parseTunnelProvider(settings.tunnelProvider, "cloudflared");
  const lanProtocol = securityMode === "on" ? "https" : "http";
  const canDirectLan = settings.host === "0.0.0.0" && securityMode !== "on";
  const directLanUrls = canDirectLan
    ? lanIps.map((ip) => {
        const url = new URL(`${lanProtocol}://${ip}:${settings.port}`);
        if (settings.basePath) {
          url.pathname = withBasePath("/");
        }
        return url.toString();
      })
    : [];
  const publicUrl = buildManagedPublicUrl(settings.publicHost, securityMode === "on" ? "https" : "http", settings.basePath);
  const tunnel = publicTunnelState();
  const configuredTunnelMode = parseTunnelMode(settings.tunnelMode, "quick");
  const tunnelUrl = String(tunnel?.url || "").trim();
  const stablePublicUrl = String(tunnel?.publicUrl || publicUrl || "").trim();
  const publicVerification = state.publicHostVerification && typeof state.publicHostVerification === "object"
    ? state.publicHostVerification
    : null;
  const localUrlObject = new URL(`http://127.0.0.1:${settings.port}`);
  const bindUrlObject = new URL(`http://${settings.host}:${settings.port}`);
  if (settings.basePath) {
    localUrlObject.pathname = withBasePath("/");
    bindUrlObject.pathname = withBasePath("/");
  }
  const localUrl = localUrlObject.toString();
  const bindUrl = bindUrlObject.toString();

  let action = "";
  if (publicVerification?.ok && stablePublicUrl) {
    action = `Stable HTTPS host is verified at ${stablePublicUrl}.`;
  } else if (tunnelProvider === "server" && settings.publicHost) {
    action = `Public server host is configured as ${settings.publicHost}. Verify that your reverse proxy forwards HTTPS traffic to this panel.`;
  } else if (tunnelUrl) {
    action = `External tunnel is live at ${tunnelUrl}. Use this URL outside your home network.`;
  } else if (tunnel?.mode && tunnel.mode !== "quick") {
    action =
      "Account tunnel is running but no public URL was detected. Set REMOTE_PANEL_PUBLIC_HOST to your tunnel hostname for a clickable link.";
  } else if (securityMode === "on") {
    action = "Use an HTTPS tunnel URL for phone access. Direct LAN HTTP requests are blocked.";
  } else if (settings.host !== "0.0.0.0") {
    action = "Restart in LAN mode with `npm run commander:remote` to allow phone access on your network.";
  } else if (securityMode === "auto") {
    action =
      "Adaptive security is enabled: local/LAN clients can use HTTP, while public clients must use HTTPS via tunnel/proxy.";
  } else {
    action = "Open one of the LAN URLs from your phone while connected to the same Wi-Fi.";
  }

  if (stablePublicUrl) {
    action = `Use ${stablePublicUrl} from your phone. ${action}`;
  }

  const recommendedMobileUrl = (publicVerification?.ok ? stablePublicUrl : "") || tunnelUrl || stablePublicUrl || directLanUrls[0] || "";

  return {
    panel: {
      host: settings.host,
      port: settings.port,
      requireHttps: securityMode === "on",
      securityMode,
      publicHost: settings.publicHost,
      basePath: settings.basePath,
      tunnelMode: configuredTunnelMode,
      tunnelProvider,
      bindSessionIp: settings.bindSessionIp,
      allowlist: settings.allowlist,
      persistSessions: settings.persistSessions,
      sessionStoreFile: path.relative(ROOT, settings.sessionStoreFile).replace(/\\/g, "/"),
      runtimeConfigFile: path.relative(ROOT, settings.runtimeConfigFile).replace(/\\/g, "/"),
    },
    security: {
      mode:
        securityMode === "on"
          ? "https_required"
          : securityMode === "auto"
            ? "adaptive_https_for_public"
            : "http_allowed",
      label: securityModeLabel(securityMode),
    },
    tunnel: {
      active: Boolean(tunnelUrl || stablePublicUrl),
      provider: tunnel?.provider || tunnelProvider,
      mode: tunnel?.mode || configuredTunnelMode,
      configuredMode: configuredTunnelMode,
      hasTokenConfig: tunnelProvider === "cloudflared" ? Boolean(settings.cloudflaredTunnelToken) : false,
      hasNamedConfig: tunnelProvider === "cloudflared" ? Boolean(settings.cloudflaredTunnelName) : Boolean(settings.publicHost),
      hasConfigFile: tunnelProvider === "cloudflared" ? Boolean(settings.cloudflaredConfig) : false,
      url: tunnelUrl,
      publicUrl: stablePublicUrl,
      pid: tunnel?.pid || 0,
      startedAt: tunnel?.startedAt || "",
      verification: publicVerification,
      automation: {
        remoteRedirectAvailable: remoteRedirectAutomationAvailable(),
        namedTunnelConfigured: hasNamedTunnelConfig(),
      },
    },
    urls: {
      local: localUrl,
      bind: bindUrl,
      directLan: directLanUrls,
      public: stablePublicUrl,
    },
    guidance: {
      canDirectLan,
      recommendedMobileUrl,
      action,
    },
    lanIps,
  };
}

function pushLog(source, message) {
  const entry = {
    time: timestamp(),
    source,
    message: String(message ?? ""),
  };
  state.logs.push(entry);
  if (state.logs.length > MAX_LOG_LINES) {
    state.logs.splice(0, state.logs.length - MAX_LOG_LINES);
  }
  const payload = `event: log\ndata: ${JSON.stringify(entry)}\n\n`;
  for (const res of state.sseClients) {
    res.write(payload);
  }
}

function publicDevState() {
  if (!state.activeDev) {
    return null;
  }
  return {
    mode: state.activeDev.mode,
    project: state.activeDev.project,
    port: state.activeDev.port,
    pid: state.activeDev.pid,
    startedAt: state.activeDev.startedAt,
  };
}

function relaySessionKey(sessionName) {
  return String(sessionName || "")
    .trim()
    .toLowerCase();
}

function relayPublicShape(relayState) {
  if (!relayState) {
    return null;
  }
  return {
    mode: relayState.mode,
    sessionName: relayState.sessionName,
    project: relayState.project,
    useLast: relayState.useLast,
    dryRun: relayState.dryRun,
    startFromLatest: relayState.startFromLatest,
    pollMs: relayState.pollMs,
    history: relayState.history,
    pid: relayState.pid,
    startedAt: relayState.startedAt,
  };
}

function syncLegacyActiveRelay() {
  const relays = [...state.activeRelays.values()];
  if (!relays.length) {
    state.activeRelay = null;
    return;
  }
  if (state.activeRelay) {
    const existing = relays.find((relay) => relay.pid === state.activeRelay.pid);
    if (existing) {
      state.activeRelay = existing;
      return;
    }
  }
  state.activeRelay = relays[0];
}

function publicRelayStates() {
  if (!state.activeRelays.size) {
    return state.activeRelay ? [relayPublicShape(state.activeRelay)] : [];
  }
  return [...state.activeRelays.values()]
    .map((relay) => relayPublicShape(relay))
    .filter(Boolean)
    .sort((a, b) => String(a.sessionName || "").localeCompare(String(b.sessionName || "")));
}

function publicRelayState() {
  if (state.activeRelays.size) {
    syncLegacyActiveRelay();
  }
  return relayPublicShape(state.activeRelay);
}

function publicTunnelState() {
  if (!state.activeTunnel) {
    return null;
  }
  return {
    provider: state.activeTunnel.provider,
    mode: state.activeTunnel.mode,
    requestedMode: state.activeTunnel.requestedMode || state.activeTunnel.mode,
    url: state.activeTunnel.url,
    publicUrl: state.activeTunnel.publicUrl || "",
    publicHost: state.activeTunnel.publicHost || "",
    targetUrl: state.activeTunnel.targetUrl,
    pid: state.activeTunnel.pid,
    startedAt: state.activeTunnel.startedAt,
    verification: state.activeTunnel.verification || null,
  };
}

function hasNamedTunnelConfig() {
  if (settings.tunnelProvider === "server") {
    return Boolean(String(settings.publicHost || "").trim());
  }
  return Boolean(String(settings.cloudflaredTunnelName || "").trim());
}

function remoteRedirectAutomationAvailable() {
  return canManageRemoteRedirect({
    autoRemoteRedirect: settings.autoRemoteRedirect,
    remoteRedirectHost: settings.remoteRedirectHost,
    remoteRedirectUser: settings.remoteRedirectUser,
    remoteRedirectKeyPath: settings.remoteRedirectKeyPath,
  });
}

async function verifyAndMaybeManagePublicHost({
  desiredMode = "off",
  publicHost = "",
  tunnelUrl = "",
} = {}) {
  const normalizedMode = normalizeEnvironmentRemoteMode(desiredMode, "off");
  const normalizedPublicHost = normalizePublicHost(publicHost);
  if (normalizedMode === "off" || !normalizedPublicHost) {
    state.publicHostVerification = null;
    return null;
  }

  let verification = await verifyPublicHost({
    publicHost: normalizedPublicHost,
    basePath: settings.basePath,
    timeoutMs: settings.publicHostVerifyTimeoutMs,
    authUser: settings.publicAuthUser,
    authPassword: settings.publicAuthPassword,
  });

  if (
    !verification.ok &&
    tunnelUrl &&
    remoteRedirectAutomationAvailable() &&
    normalizedPublicHost.toLowerCase() === "local-commander.diesign.dev"
  ) {
    const redirectResult = await runRemoteRedirectUpdate({
      tunnelUrl,
      remoteRedirectHost: settings.remoteRedirectHost,
      remoteRedirectUser: settings.remoteRedirectUser,
      remoteRedirectKeyPath: settings.remoteRedirectKeyPath,
      remoteRedirectSitePath: settings.remoteRedirectSitePath,
      localCommanderSitePath: settings.localCommanderSitePath,
    });
    pushLog("system", `Updated remote Commander redirect for ${normalizedPublicHost}.`);
    verification = await verifyPublicHost({
      publicHost: normalizedPublicHost,
      basePath: settings.basePath,
      timeoutMs: settings.publicHostVerifyTimeoutMs,
      authUser: settings.publicAuthUser,
      authPassword: settings.publicAuthPassword,
    });
    verification = {
      ...verification,
      redirected: true,
      redirectOutputTail: redirectResult.outputLines.slice(-10),
    };
  }

  state.publicHostVerification = verification;
  return verification;
}

function broadcastState() {
  const payload = {
    time: timestamp(),
    activeEnvironment: state.activeEnvironment,
    commandRunning: state.commandRunning,
    activeDev: publicDevState(),
    activeRelay: publicRelayState(),
    activeRelays: publicRelayStates(),
    activeTunnel: publicTunnelState(),
  };
  const body = `event: state\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of state.sseClients) {
    res.write(body);
  }
  persistEnvironmentRuntimeSnapshot().catch(() => null);
}

function parseCookies(req) {
  const raw = req.headers.cookie;
  if (!raw) {
    return {};
  }
  const parsed = {};
  for (const chunk of raw.split(";")) {
    const index = chunk.indexOf("=");
    if (index < 0) {
      continue;
    }
    const key = chunk.slice(0, index).trim();
    const value = chunk.slice(index + 1).trim();
    parsed[key] = value;
  }
  return parsed;
}

function signSessionId(sessionId) {
  return crypto.createHmac("sha256", settings.sessionSecret).update(sessionId).digest("base64url");
}

function sessionCookieValue(sessionId) {
  return `${sessionId}.${signSessionId(sessionId)}`;
}

function verifySessionCookie(cookieValue) {
  if (!cookieValue || typeof cookieValue !== "string") {
    return null;
  }
  const [sessionId, providedSignature] = cookieValue.split(".");
  if (!sessionId || !providedSignature) {
    return null;
  }
  const expectedSignature = signSessionId(sessionId);
  const lhs = Buffer.from(providedSignature);
  const rhs = Buffer.from(expectedSignature);
  if (lhs.length !== rhs.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(lhs, rhs)) {
    return null;
  }
  return sessionId;
}

function setSessionCookie(res, sessionId, secureCookie = false) {
  const attributes = [
    `${SESSION_COOKIE_NAME}=${sessionCookieValue(sessionId)}`,
    `Path=${sessionCookiePath()}`,
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (secureCookie) {
    attributes.push("Secure");
  }
  res.setHeader("Set-Cookie", attributes.join("; "));
}

function clearSessionCookie(res, secureCookie = false) {
  const attributes = [
    `${SESSION_COOKIE_NAME}=`,
    `Path=${sessionCookiePath()}`,
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=0",
  ];
  if (secureCookie) {
    attributes.push("Secure");
  }
  res.setHeader("Set-Cookie", attributes.join("; "));
}

function setSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Permissions-Policy", "unload=(self)");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "connect-src 'self'",
      "img-src 'self' data:",
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'none'",
    ].join("; ")
  );
}

function json(res, statusCode, payload) {
  setSecurityHeaders(res);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function forbidden(res, message = "Forbidden") {
  json(res, 403, { ok: false, error: message });
}

function unauthorized(res, message = "Unauthorized") {
  json(res, 401, { ok: false, error: message });
}

function badRequest(res, message = "Bad request") {
  json(res, 400, { ok: false, error: message });
}

function notFound(res) {
  json(res, 404, { ok: false, error: "Not found" });
}

function isLocalIp(ip) {
  return ip === "127.0.0.1" || ip === "::1" || ip === "";
}

function isIpAllowed(ip) {
  if (settings.allowlist.length === 0) {
    return true;
  }
  for (const rule of settings.allowlist) {
    if (rule.endsWith("*")) {
      const prefix = rule.slice(0, -1);
      if (ip.startsWith(prefix)) {
        return true;
      }
      continue;
    }
    if (ip === rule) {
      return true;
    }
  }
  return false;
}

function isHttpsRequest(req, ip) {
  if (req.socket.encrypted) {
    return true;
  }
  const forwarded = String(req.headers["x-forwarded-proto"] || "").toLowerCase();
  if (forwarded.includes("https")) {
    return true;
  }
  return isLocalIp(ip);
}

function shouldEnforceHttps(req, ip) {
  const mode = effectiveSecurityModeForIp(ip);
  if (mode !== "on") {
    return false;
  }
  return !isHttpsRequest(req, ip);
}

function shouldUseSecureCookie(req, ip) {
  if (effectiveSecurityModeForIp(ip) !== "on") {
    return false;
  }
  if (req?.socket?.encrypted) {
    return true;
  }
  const forwarded = String(req?.headers?.["x-forwarded-proto"] || "").toLowerCase();
  return forwarded.includes("https");
}

function parseTunnelTargetUrl(rawValue, fallbackPort) {
  const fallback = `http://127.0.0.1:${fallbackPort}`;
  const raw = String(rawValue || "").trim();
  if (!raw) {
    return fallback;
  }

  let parsed = null;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Tunnel target URL is invalid.");
  }

  const protocol = String(parsed.protocol || "").toLowerCase();
  if (!["http:", "https:"].includes(protocol)) {
    throw new Error("Tunnel target URL must use http or https.");
  }

  const host = String(parsed.hostname || "").toLowerCase();
  if (!LOCAL_PREVIEW_HOSTS.has(host)) {
    throw new Error("Tunnel target URL must point to a local host (127.0.0.1/localhost).");
  }

  if (parsed.username || parsed.password) {
    throw new Error("Tunnel target URL must not include credentials.");
  }

  return parsed.toString();
}

function resolveCloudflaredBin() {
  const explicit = String(settings.cloudflaredBin || "").trim();
  if (explicit) {
    return explicit;
  }
  if (process.platform === "win32") {
    for (const candidate of WINDOWS_CLOUDFLARED_CANDIDATES) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }
  return "cloudflared";
}

function normalizeSessionStoreEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const id = String(entry.id || "").trim();
  const ip = String(entry.ip || "").trim();
  const csrfToken = String(entry.csrfToken || "").trim();
  const createdAt = Number.parseInt(String(entry.createdAt || ""), 10);
  const expiresAt = Number.parseInt(String(entry.expiresAt || ""), 10);
  if (!id || !ip || !csrfToken) {
    return null;
  }
  if (!Number.isFinite(createdAt) || !Number.isFinite(expiresAt)) {
    return null;
  }
  return {
    id,
    ip,
    csrfToken,
    createdAt,
    expiresAt,
  };
}

function serializeSessionStore() {
  const sessions = [];
  for (const [id, record] of state.sessions.entries()) {
    sessions.push({
      id,
      ip: String(record.ip || ""),
      csrfToken: String(record.csrfToken || ""),
      createdAt: Number(record.createdAt || 0),
      expiresAt: Number(record.expiresAt || 0),
    });
  }
  return {
    updatedAt: timestamp(),
    sessions,
  };
}

async function persistSessionStore() {
  if (!settings.persistSessions) {
    return;
  }
  const payload = serializeSessionStore();
  await fsp.mkdir(path.dirname(settings.sessionStoreFile), { recursive: true });
  await fsp.writeFile(settings.sessionStoreFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

let persistSessionTimer = null;
function schedulePersistSessionStore() {
  if (!settings.persistSessions || persistSessionTimer) {
    return;
  }
  persistSessionTimer = setTimeout(() => {
    persistSessionTimer = null;
    persistSessionStore().catch((error) => {
      console.warn(`[remote-panel] Failed to persist session store: ${error?.message || error}`);
    });
  }, 150);
  if (typeof persistSessionTimer.unref === "function") {
    persistSessionTimer.unref();
  }
}

function loadSessionStoreSync() {
  if (!settings.persistSessions) {
    return;
  }
  let raw = "";
  try {
    raw = fs.readFileSync(settings.sessionStoreFile, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.warn(`[remote-panel] Failed to read session store: ${error?.message || error}`);
    }
    return;
  }

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.warn(`[remote-panel] Ignoring invalid session store JSON: ${error?.message || error}`);
    return;
  }

  const source = Array.isArray(parsed?.sessions) ? parsed.sessions : [];
  const now = Date.now();
  let loaded = 0;
  for (const item of source) {
    const normalized = normalizeSessionStoreEntry(item);
    if (!normalized) {
      continue;
    }
    if (normalized.expiresAt <= now) {
      continue;
    }
    state.sessions.set(normalized.id, {
      ip: normalized.ip,
      csrfToken: normalized.csrfToken,
      createdAt: normalized.createdAt,
      expiresAt: normalized.expiresAt,
    });
    loaded += 1;
  }
  if (loaded > 0) {
    console.log(`[remote-panel] Loaded ${loaded} persisted session(s).`);
  }
}

function pruneExpiredSessions() {
  const now = Date.now();
  let changed = false;
  for (const [sessionId, record] of state.sessions.entries()) {
    if (Number(record.expiresAt || 0) <= now) {
      state.sessions.delete(sessionId);
      cleanupTerminalAfterSessionRemoval(sessionId, "Session expired.");
      changed = true;
    }
  }
  if (changed) {
    schedulePersistSessionStore();
  }
}

function deleteSessionById(sessionId) {
  if (!sessionId) {
    return false;
  }
  const deleted = state.sessions.delete(sessionId);
  if (deleted) {
    cleanupTerminalAfterSessionRemoval(sessionId, "Session closed.");
    schedulePersistSessionStore();
  }
  return deleted;
}

function resolveTerminalSessionId(sessionId) {
  if (settings.sharedTerminal) {
    return TERMINAL_SHARED_SESSION_ID;
  }
  return String(sessionId || "").trim();
}

function cleanupTerminalAfterSessionRemoval(sessionId, reason = "session-ended") {
  const terminalSessionId = resolveTerminalSessionId(sessionId);
  if (!terminalSessionId) {
    return false;
  }
  if (settings.sharedTerminal) {
    if (state.sessions.size === 0) {
      return destroyTerminalSession(terminalSessionId, reason);
    }
    return false;
  }
  return destroyTerminalSession(terminalSessionId, reason);
}

function touchSessionById(sessionId) {
  const id = String(sessionId || "").trim();
  if (!id) {
    return null;
  }
  const session = state.sessions.get(id);
  if (!session) {
    return null;
  }
  const previousExpiresAt = Number(session.expiresAt || 0);
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  if (session.expiresAt - previousExpiresAt > SESSION_TOUCH_PERSIST_THRESHOLD_MS) {
    schedulePersistSessionStore();
  }
  return session;
}

function getSession(req, ip) {
  const cookies = parseCookies(req);
  const sessionToken = cookies[SESSION_COOKIE_NAME];
  const sessionId = verifySessionCookie(sessionToken);
  if (!sessionId) {
    return null;
  }
  const session = state.sessions.get(sessionId);
  if (!session) {
    return null;
  }
  if (session.expiresAt < Date.now()) {
    deleteSessionById(sessionId);
    return null;
  }
  if (settings.bindSessionIp && session.ip !== ip) {
    return null;
  }
  const touched = touchSessionById(sessionId);
  const activeSession = touched || session;
  return {
    id: sessionId,
    ...activeSession,
  };
}

function createSession(ip) {
  const sessionId = crypto.randomBytes(24).toString("base64url");
  const csrfToken = crypto.randomBytes(24).toString("base64url");
  const record = {
    ip,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
    csrfToken,
  };
  state.sessions.set(sessionId, record);
  schedulePersistSessionStore();
  return {
    id: sessionId,
    ...record,
  };
}

function normalizeTerminalDimension(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, parsed));
}

function resolveDefaultTerminalLaunch() {
  if (process.platform === "win32") {
    const pwsh7 = "C:\\Program Files\\PowerShell\\7\\pwsh.exe";
    if (fs.existsSync(pwsh7)) {
      return {
        file: pwsh7,
        args: ["-NoLogo"],
      };
    }
    return {
      file: "powershell.exe",
      args: ["-NoLogo"],
    };
  }

  const file = String(process.env.SHELL || "/bin/bash").trim() || "/bin/bash";
  const basename = path.basename(file).toLowerCase();
  const args = basename.includes("bash") ? ["--login"] : [];
  return { file, args };
}

function ensureTerminalSessionState(sessionId) {
  const id = String(sessionId || "").trim();
  if (!id) {
    throw new Error("Session is required.");
  }
  const existing = state.terminalSessions.get(id);
  if (existing) {
    return existing;
  }
  const created = {
    sessionId: id,
    generation: 0,
    pty: null,
    running: false,
    pid: 0,
    cols: TERMINAL_DEFAULT_COLS,
    rows: TERMINAL_DEFAULT_ROWS,
    startedAt: "",
    stoppedAt: "",
    exitCode: null,
    exitSignal: null,
    history: [],
    historyBytes: 0,
    nextSequence: 1,
    sockets: new Set(),
  };
  state.terminalSessions.set(id, created);
  return created;
}

function terminalStatusForResponse(terminal) {
  if (!terminal) {
    return {
      exists: false,
      running: false,
      mode: settings.sharedTerminal ? "shared" : "session",
      pid: 0,
      cols: TERMINAL_DEFAULT_COLS,
      rows: TERMINAL_DEFAULT_ROWS,
      startedAt: "",
      stoppedAt: "",
      exitCode: null,
      exitSignal: null,
      attachedClients: 0,
      historyBytes: 0,
      historyChunks: 0,
    };
  }
  return {
    exists: true,
    running: Boolean(terminal.running && terminal.pty),
    mode: settings.sharedTerminal ? "shared" : "session",
    pid: Number(terminal.pid || 0),
    cols: Number(terminal.cols || TERMINAL_DEFAULT_COLS),
    rows: Number(terminal.rows || TERMINAL_DEFAULT_ROWS),
    startedAt: String(terminal.startedAt || ""),
    stoppedAt: String(terminal.stoppedAt || ""),
    exitCode: terminal.exitCode === null ? null : Number(terminal.exitCode),
    exitSignal: terminal.exitSignal === null ? null : Number(terminal.exitSignal),
    attachedClients: terminal.sockets.size,
    historyBytes: Number(terminal.historyBytes || 0),
    historyChunks: terminal.history.length,
  };
}

function parseTerminalSequence(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function terminalHistoryForResponse(terminal, options = {}) {
  const requestedSince = parseTerminalSequence(options.since, 0);
  if (!terminal) {
    return {
      chunks: [],
      bytes: 0,
      maxBytes: TERMINAL_OUTPUT_MAX_BYTES,
      requestedSince,
      latestSeq: 0,
      availableFromSeq: 0,
      gap: null,
    };
  }
  const history = Array.isArray(terminal.history) ? terminal.history : [];
  const latestSeq = Math.max(0, Number(terminal.nextSequence || 1) - 1);
  const availableFromSeq = history.length ? parseTerminalSequence(history[0]?.seq, 0) : 0;
  let chunks = requestedSince > 0
    ? history.filter((chunk) => parseTerminalSequence(chunk?.seq, 0) > requestedSince)
    : history;
  if (requestedSince <= 0 && chunks.length > TERMINAL_INITIAL_HISTORY_MAX_CHUNKS) {
    chunks = chunks.slice(-TERMINAL_INITIAL_HISTORY_MAX_CHUNKS);
  }
  if (requestedSince <= 0 && chunks.length > 1) {
    let totalBytes = 0;
    const sized = chunks.map((chunk) => {
      const rawBytes = Number(chunk?.bytes || 0);
      const bytes = Number.isFinite(rawBytes) && rawBytes > 0 ? rawBytes : Buffer.byteLength(String(chunk?.data || ""), "utf8");
      totalBytes += bytes;
      return { chunk, bytes };
    });
    while (sized.length > 1 && totalBytes > TERMINAL_INITIAL_HISTORY_MAX_BYTES) {
      const removed = sized.shift();
      totalBytes = Math.max(0, totalBytes - Number(removed?.bytes || 0));
    }
    chunks = sized.map((entry) => entry.chunk);
  }
  let bytes = 0;
  for (const chunk of chunks) {
    const rawBytes = Number(chunk?.bytes || 0);
    if (Number.isFinite(rawBytes) && rawBytes > 0) {
      bytes += rawBytes;
      continue;
    }
    bytes += Buffer.byteLength(String(chunk?.data || ""), "utf8");
  }
  let gap = null;
  if (requestedSince > 0 && availableFromSeq > requestedSince + 1) {
    gap = {
      from: requestedSince + 1,
      to: availableFromSeq - 1,
      reason: "history-trimmed",
    };
  }
  return {
    chunks: chunks.map((chunk) => ({
      seq: chunk.seq,
      at: chunk.at,
      data: chunk.data,
    })),
    bytes,
    maxBytes: TERMINAL_OUTPUT_MAX_BYTES,
    requestedSince,
    latestSeq,
    availableFromSeq,
    gap,
  };
}

function trimTerminalHistory(terminal) {
  while (
    terminal.history.length > TERMINAL_OUTPUT_MAX_CHUNKS ||
    terminal.historyBytes > TERMINAL_OUTPUT_MAX_BYTES
  ) {
    const removed = terminal.history.shift();
    if (!removed) {
      break;
    }
    terminal.historyBytes = Math.max(0, terminal.historyBytes - Number(removed.bytes || 0));
  }
}

function clearTerminalHistory(terminal) {
  terminal.history = [];
  terminal.historyBytes = 0;
}

function broadcastTerminalPayload(terminal, payload) {
  for (const socket of terminal.sockets) {
    wsSend(socket, payload);
  }
}

function appendTerminalOutput(terminal, data) {
  const text = String(data ?? "");
  if (!text) {
    return;
  }
  const bytes = Buffer.byteLength(text, "utf8");
  const chunk = {
    seq: terminal.nextSequence,
    at: timestamp(),
    data: text,
    bytes,
  };
  terminal.nextSequence += 1;
  terminal.history.push(chunk);
  terminal.historyBytes += bytes;
  trimTerminalHistory(terminal);
  broadcastTerminalPayload(terminal, {
    type: "terminal:output",
    chunk: {
      seq: chunk.seq,
      at: chunk.at,
      data: chunk.data,
    },
  });
}

function attachTerminalSocket(sessionId, ws) {
  const terminal = ensureTerminalSessionState(sessionId);
  terminal.sockets.add(ws);
  state.terminalWsClients.add(ws);
  state.terminalWsSessionBySocket.set(ws, terminal.sessionId);
  return terminal;
}

function detachTerminalSocket(ws) {
  const sessionId = state.terminalWsSessionBySocket.get(ws);
  if (sessionId) {
    const terminal = state.terminalSessions.get(sessionId);
    if (terminal) {
      terminal.sockets.delete(ws);
    }
    state.terminalWsSessionBySocket.delete(ws);
  }
  state.terminalWsClients.delete(ws);
}

function closeTerminalSocket(ws, reason = "Session ended.") {
  wsSend(ws, {
    type: "terminal:closed",
    reason,
  });
  try {
    ws.close(1001, reason);
  } catch {
    // ignore close errors for socket cleanup paths
  }
}

function prepareSocketHeartbeat(ws, sessionId = "") {
  if (!ws) {
    return;
  }
  ws.__rcAlive = true;
  ws.on("pong", () => {
    ws.__rcAlive = true;
    if (sessionId) {
      touchSessionById(sessionId);
    }
  });
}

function heartbeatWebSocketClients(clients) {
  for (const ws of clients) {
    if (!ws || ws.readyState !== 1) {
      continue;
    }
    if (ws.__rcAlive === false) {
      try {
        ws.terminate();
      } catch {
        // ignore termination failures during heartbeat sweep
      }
      continue;
    }
    ws.__rcAlive = false;
    try {
      ws.ping();
    } catch {
      try {
        ws.terminate();
      } catch {
        // ignore termination failures during heartbeat sweep
      }
    }
  }
}

function stopTerminalSessionProcess(terminal, reason = "stop") {
  if (!terminal || !terminal.running || !terminal.pty) {
    return false;
  }
  try {
    terminal.pty.kill();
    pushLog("terminal", `Stop requested for session ${terminal.sessionId} (${reason}).`);
  } catch (error) {
    if (terminal.pid) {
      try {
        process.kill(terminal.pid, "SIGTERM");
      } catch {
        // ignore fallback kill errors
      }
    }
    pushLog(
      "terminal",
      `Stop fallback used for session ${terminal.sessionId}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  return true;
}

function destroyTerminalSession(sessionId, reason = "session-ended") {
  const terminal = state.terminalSessions.get(sessionId);
  if (!terminal) {
    return false;
  }
  const sockets = Array.from(terminal.sockets);
  for (const socket of sockets) {
    closeTerminalSocket(socket, reason);
    detachTerminalSocket(socket);
  }
  stopTerminalSessionProcess(terminal, reason);
  terminal.running = false;
  terminal.pty = null;
  terminal.pid = 0;
  terminal.stoppedAt = timestamp();
  state.terminalSessions.delete(sessionId);
  return true;
}

function destroyAllTerminalSessions(reason = "shutdown") {
  for (const sessionId of [...state.terminalSessions.keys()]) {
    destroyTerminalSession(sessionId, reason);
  }
}

async function loadNodePty() {
  if (!nodePtyModulePromise) {
    nodePtyModulePromise = import("node-pty")
      .then((module) => {
        const candidate = module?.default && typeof module.default.spawn === "function" ? module.default : module;
        if (!candidate || typeof candidate.spawn !== "function") {
          throw new Error("node-pty module does not expose spawn().");
        }
        return candidate;
      })
      .catch((error) => {
        nodePtyModulePromise = null;
        throw new Error(`node-pty is required for terminal support: ${error instanceof Error ? error.message : String(error)}`);
      });
  }
  return nodePtyModulePromise;
}

function isNodePtyUnavailableError(error) {
  const message = String(error instanceof Error ? error.message : error || "").toLowerCase();
  return message.includes("node-pty");
}

async function startTerminalForSession(sessionId, options = {}) {
  const terminal = ensureTerminalSessionState(sessionId);
  const clearHistory = parseBool(options.clearHistory, false);
  if (clearHistory) {
    clearTerminalHistory(terminal);
  }

  const nextCols = normalizeTerminalDimension(
    options.cols,
    Number(terminal.cols || TERMINAL_DEFAULT_COLS),
    TERMINAL_MIN_COLS,
    TERMINAL_MAX_COLS
  );
  const nextRows = normalizeTerminalDimension(
    options.rows,
    Number(terminal.rows || TERMINAL_DEFAULT_ROWS),
    TERMINAL_MIN_ROWS,
    TERMINAL_MAX_ROWS
  );

  if (terminal.running && terminal.pty) {
    if (nextCols !== terminal.cols || nextRows !== terminal.rows) {
      try {
        terminal.pty.resize(nextCols, nextRows);
        terminal.cols = nextCols;
        terminal.rows = nextRows;
      } catch (error) {
        throw new Error(
          `Failed to resize active terminal: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    return {
      started: false,
      terminal,
    };
  }

  const ptyApi = await loadNodePty();
  const launch = resolveDefaultTerminalLaunch();
  const env = {
    ...process.env,
    TERM: process.env.TERM || "xterm-256color",
  };
  const spawnOptions = {
    name: "xterm-256color",
    cols: nextCols,
    rows: nextRows,
    cwd: ROOT,
    env,
  };

  const generation = Number(terminal.generation || 0) + 1;
  terminal.generation = generation;

  let pty = null;
  let launchMode = process.platform === "win32" ? TERMINAL_USE_CONPTY : null;
  let lastSpawnError = null;
  if (process.platform === "win32") {
    const candidateModes = [TERMINAL_USE_CONPTY, !TERMINAL_USE_CONPTY].filter(
      (value, index, list) => list.indexOf(value) === index
    );
    for (const useConpty of candidateModes) {
      try {
        pty = ptyApi.spawn(launch.file, launch.args, {
          ...spawnOptions,
          useConpty,
        });
        launchMode = useConpty;
        break;
      } catch (error) {
        lastSpawnError = error;
      }
    }
  } else {
    try {
      pty = ptyApi.spawn(launch.file, launch.args, spawnOptions);
    } catch (error) {
      lastSpawnError = error;
    }
  }
  if (!pty) {
    const rawMessage = lastSpawnError instanceof Error ? lastSpawnError.message : String(lastSpawnError || "spawn failed");
    let hint = "";
    if (process.platform === "win32") {
      const lowered = rawMessage.toLowerCase();
      if (lowered.includes("winpty")) {
        hint = " Tried ConPTY fallback as well. Set REMOTE_PANEL_TERMINAL_USE_CONPTY=true to prefer ConPTY.";
      } else if (lowered.includes("conpty") || lowered.includes("eperm")) {
        hint = " Tried WinPTY fallback as well. Set REMOTE_PANEL_TERMINAL_USE_CONPTY=false to prefer WinPTY.";
      }
    }
    throw new Error(`Failed to start terminal shell '${launch.file}': ${rawMessage}${hint}`);
  }

  terminal.pty = pty;
  terminal.running = true;
  terminal.pid = Number(pty.pid || 0);
  terminal.cols = nextCols;
  terminal.rows = nextRows;
  terminal.exitCode = null;
  terminal.exitSignal = null;
  terminal.startedAt = timestamp();
  terminal.stoppedAt = "";

  if (process.platform === "win32" && launchMode !== null && launchMode !== TERMINAL_USE_CONPTY) {
    pushLog(
      "terminal",
      `PTY fallback applied for session ${sessionId}: ${TERMINAL_USE_CONPTY ? "ConPTY" : "WinPTY"} failed, using ${
        launchMode ? "ConPTY" : "WinPTY"
      }.`
    );
  }
  pushLog("terminal", `Started terminal for session ${sessionId} (pid=${terminal.pid || "n/a"}).`);

  pty.onData((data) => {
    if (terminal.generation !== generation) {
      return;
    }
    appendTerminalOutput(terminal, data);
  });

  pty.onExit((event = {}) => {
    if (terminal.generation !== generation) {
      return;
    }
    terminal.running = false;
    terminal.pty = null;
    terminal.pid = 0;
    terminal.exitCode = Number.isFinite(event.exitCode) ? event.exitCode : null;
    terminal.exitSignal = Number.isFinite(event.signal) ? event.signal : null;
    terminal.stoppedAt = timestamp();
    pushLog("terminal", `Terminal exited for session ${sessionId} (exit=${terminal.exitCode ?? -1}).`);
    broadcastTerminalPayload(terminal, {
      type: "terminal:exit",
      exitCode: terminal.exitCode,
      signal: terminal.exitSignal,
      terminal: terminalStatusForResponse(terminal),
    });
  });

  broadcastTerminalPayload(terminal, {
    type: "terminal:status",
    terminal: terminalStatusForResponse(terminal),
  });

  return {
    started: true,
    terminal,
  };
}

function writeTerminalInput(sessionId, input) {
  const terminal = state.terminalSessions.get(sessionId);
  if (!terminal || !terminal.running || !terminal.pty) {
    throw new Error("No active terminal for this session.");
  }
  const text = String(input ?? "");
  if (!text) {
    return;
  }
  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes > TERMINAL_MAX_INPUT_BYTES) {
    throw new Error(`Input chunk is too large (max ${TERMINAL_MAX_INPUT_BYTES} bytes).`);
  }
  terminal.pty.write(text);
}

function resizeTerminalForSession(sessionId, cols, rows) {
  const terminal = ensureTerminalSessionState(sessionId);
  const nextCols = normalizeTerminalDimension(
    cols,
    Number(terminal.cols || TERMINAL_DEFAULT_COLS),
    TERMINAL_MIN_COLS,
    TERMINAL_MAX_COLS
  );
  const nextRows = normalizeTerminalDimension(
    rows,
    Number(terminal.rows || TERMINAL_DEFAULT_ROWS),
    TERMINAL_MIN_ROWS,
    TERMINAL_MAX_ROWS
  );
  terminal.cols = nextCols;
  terminal.rows = nextRows;
  if (terminal.running && terminal.pty) {
    terminal.pty.resize(nextCols, nextRows);
  }
  return terminal;
}

function interruptTerminalForSession(sessionId) {
  const terminal = state.terminalSessions.get(sessionId);
  if (!terminal || !terminal.running || !terminal.pty) {
    return false;
  }

  try {
    // Ctrl+C is the most reliable interrupt path for Windows PTYs.
    terminal.pty.write("\u0003");
    pushLog("terminal", `Interrupt requested for session ${sessionId}.`);
    return true;
  } catch (error) {
    if (terminal.pid && process.platform !== "win32") {
      try {
        process.kill(terminal.pid, "SIGINT");
        pushLog("terminal", `Interrupt fallback SIGINT requested for session ${sessionId}.`);
        return true;
      } catch {
        // ignore fallback kill errors and surface the original failure
      }
    }
    throw new Error(`Failed to interrupt terminal: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function stopTerminalForSession(sessionId) {
  const terminal = state.terminalSessions.get(sessionId);
  if (!terminal) {
    return false;
  }
  return stopTerminalSessionProcess(terminal, "manual-stop");
}

async function readJsonBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) {
      throw new Error("Payload too large");
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) {
    return {};
  }
  return JSON.parse(raw);
}

function attachChildLogs(child, source, outputLines) {
  if (child.stdout) {
    const stdoutRl = readline.createInterface({ input: child.stdout });
    stdoutRl.on("line", (line) => {
      pushLog(source, line);
      if (outputLines) {
        outputLines.push(line);
        if (outputLines.length > 250) {
          outputLines.splice(0, outputLines.length - 250);
        }
      }
    });
  }
  if (child.stderr) {
    const stderrRl = readline.createInterface({ input: child.stderr });
    stderrRl.on("line", (line) => {
      pushLog(source, line);
      if (outputLines) {
        outputLines.push(line);
        if (outputLines.length > 250) {
          outputLines.splice(0, outputLines.length - 250);
        }
      }
    });
  }
}

function spawnNpm(script, args = []) {
  const npmArgs = ["/c", "npm", "run", script];
  if (args.length > 0) {
    npmArgs.push("--", ...args);
  }
  return spawn("cmd", npmArgs, {
    cwd: ROOT,
    env: process.env,
    windowsHide: true,
  });
}

function validateProjectRef(project) {
  if (!project) {
    return true;
  }
  return SAFE_PROJECT_REF.test(project);
}

function validatePort(port) {
  if (port === undefined || port === null || port === "") {
    return true;
  }
  const value = Number.parseInt(String(port), 10);
  return Number.isFinite(value) && value >= 1024 && value <= 65535;
}

async function runOneShot({ source, script, args = [], timeoutMs = 20 * 60 * 1000 }) {
  if (state.commandRunning) {
    throw new Error("Another command is already running.");
  }

  state.commandRunning = true;
  broadcastState();
  const outputLines = [];
  pushLog("system", `Starting command: npm run ${script}${args.length ? ` -- ${args.join(" ")}` : ""}`);

  const startedAt = Date.now();

  try {
    const result = await new Promise((resolve, reject) => {
      const child = spawnNpm(script, args);
      let settled = false;
      attachChildLogs(child, source, outputLines);

      const timeout = setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        terminateProcessTree(child.pid)
          .catch(() => null)
          .finally(() => reject(new Error(`Command timed out after ${timeoutMs}ms`)));
      }, timeoutMs);

      child.on("error", (error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        reject(error);
      });

      child.on("exit", (code) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        const durationMs = Date.now() - startedAt;
        resolve({
          ok: code === 0,
          exitCode: code ?? -1,
          durationMs,
          outputLines,
        });
      });
    });

    pushLog("system", `Finished command: npm run ${script} (exit ${result.exitCode})`);
    return result;
  } finally {
    state.commandRunning = false;
    broadcastState();
  }
}

async function runCodexOneShot({ source, args = [], input = "", timeoutMs = 10 * 60 * 1000 }) {
  if (state.commandRunning) {
    throw new Error("Another command is already running.");
  }

  state.commandRunning = true;
  broadcastState();
  const outputLines = [];
  pushLog("system", `Starting command: codex ${args.join(" ")}`.trim());
  const startedAt = Date.now();

  try {
    const result = await new Promise((resolve, reject) => {
      const child = spawn("codex", args, {
        cwd: ROOT,
        env: process.env,
        windowsHide: true,
        shell: process.platform === "win32",
      });
      let settled = false;
      attachChildLogs(child, source, outputLines);

      if (child.stdin) {
        if (input) {
          child.stdin.write(String(input));
        }
        child.stdin.end();
      }

      const timeout = setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        terminateProcessTree(child.pid)
          .catch(() => null)
          .finally(() => reject(new Error(`Command timed out after ${timeoutMs}ms`)));
      }, timeoutMs);

      child.on("error", (error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        reject(error);
      });

      child.on("exit", (code) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        resolve({
          ok: code === 0,
          exitCode: code ?? -1,
          durationMs: Date.now() - startedAt,
          outputLines,
        });
      });
    });

    pushLog("system", `Finished command: codex ${args.join(" ")} (exit ${result.exitCode})`.trim());
    return result;
  } finally {
    state.commandRunning = false;
    broadcastState();
  }
}

function extractCodexThreadIdFromOutput(lines = []) {
  for (const line of lines) {
    let parsed = null;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    if (parsed?.type === "thread.started" && parsed?.thread_id) {
      return String(parsed.thread_id);
    }
  }
  return "";
}

function superAgentSessionName(project = "", fallback = "super-agent") {
  const scope = String(project || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const base = normalizeSessionName(scope ? `super-${scope}` : "super-agent", fallback);
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return normalizeSessionName(`${base}-${stamp}`, base);
}

function buildSuperAgentContextArtifacts({ context = "project", mode = "quick" } = {}) {
  const selectedContext = normalizeEnvironmentContext(context, "project");
  const selectedMode = normalizeEnvironmentPrep(mode, "quick");
  const artifacts = [".agency/chat/latest-super-context.json"];
  if (selectedContext === "commander") {
    artifacts.push(".agency/chat/latest-commander-briefing.md");
    if (selectedMode === "full") {
      artifacts.push(".agency/chat/latest-system-briefing.md");
    }
    return artifacts;
  }
  if (selectedContext === "system") {
    artifacts.push(".agency/chat/latest-system-briefing.md");
    return artifacts;
  }
  if (selectedMode === "standard" || selectedMode === "full") {
    artifacts.push(".agency/chat/latest-system-briefing.md");
  }
  artifacts.push(".agency/chat/latest-briefing.md");
  return artifacts;
}

function buildSuperAgentInitPrompt({ project = "", mode = "quick", context = "project" } = {}) {
  const selectedProject = String(project || "").trim() || "workspace-default";
  const selectedMode = normalizeEnvironmentPrep(mode, "quick");
  const selectedContext = normalizeEnvironmentContext(context, "project");
  const contextArtifacts = buildSuperAgentContextArtifacts({
    context: selectedContext,
    mode: selectedMode,
  });
  return [
    "Initialize a Playground super agent session.",
    `Project focus: ${selectedProject}.`,
    `Launch context: ${selectedContext}.`,
    `Bootstrap mode completed: ${selectedMode}.`,
    "Load these context artifacts first:",
    ...contextArtifacts.map((artifact) => `- ${artifact}`),
    "Operate quickly and keep outputs deterministic.",
    "Boundary rule: ask for explicit scope confirmation before crossing unrelated project/commander internals.",
    "Reply exactly with READY when initialization is complete.",
  ].join("\n");
}

async function readCodexRegistrySafe() {
  return readCodexSessionRegistry(DEFAULT_CODEX_SESSION_REGISTRY_FILE);
}

async function writeCodexRegistrySafe(registry) {
  return writeCodexSessionRegistry(registry, DEFAULT_CODEX_SESSION_REGISTRY_FILE);
}

function normalizeEnvironmentContext(value, fallback = "commander") {
  const normalized = String(value || "").trim().toLowerCase();
  return ["project", "system", "commander"].includes(normalized) ? normalized : fallback;
}

function normalizeEnvironmentPrep(value, fallback = "quick") {
  const normalized = String(value || "").trim().toLowerCase();
  return ["none", "quick", "standard", "full"].includes(normalized) ? normalized : fallback;
}

function normalizeEnvironmentPanelMode(value, fallback = "remote") {
  const normalized = String(value || "").trim().toLowerCase();
  return ["off", "local", "remote"].includes(normalized) ? normalized : fallback;
}

function normalizeEnvironmentDevMode(value, fallback = "project") {
  const normalized = String(value || "").trim().toLowerCase();
  return ["off", "project", "all"].includes(normalized) ? normalized : fallback;
}

function normalizeEnvironmentRemoteMode(value, fallback = "named") {
  const normalized = String(value || "").trim().toLowerCase();
  return ["off", "quick", "named", "token"].includes(normalized) ? normalized : fallback;
}

function normalizeEnvironmentName(value, fallback = "environment") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return normalized || fallback;
}

function summarizeEnvironmentRequest(options = {}) {
  const parts = [
    `context=${options.context || "commander"}`,
    options.project ? `project=${options.project}` : "project=(default)",
    `prep=${options.prep || "quick"}`,
    `panel=${options.panelMode || "remote"}`,
    `dev=${options.devMode || "project"}`,
    `relay=${options.relayEnabled ? "on" : "off"}`,
    `remote=${options.remoteMode || "named"}`,
  ];
  return parts.join(" ");
}

async function readJsonFileSafe(filePath, fallback = null) {
  try {
    const raw = await fsp.readFile(filePath, "utf8");
    return JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

async function buildArtifactSnapshot() {
  const entries = [
    [".agency/chat/latest-briefing.md", "projectBriefing"],
    [".agency/chat/latest-system-briefing.md", "systemBriefing"],
    [".agency/chat/latest-commander-briefing.md", "commanderBriefing"],
    [".agency/chat/latest-super-context.json", "superContextJson"],
    [".agency/chat/latest-super-context.md", "superContextMarkdown"],
    [".agency/chat/mcp-status.json", "mcpStatus"],
  ];

  const result = {};
  for (const [relativePath, key] of entries) {
    const absolutePath = path.join(ROOT, relativePath);
    try {
      const stats = await fsp.stat(absolutePath);
      result[key] = {
        path: relativePath,
        exists: true,
        updatedAt: stats.mtime.toISOString(),
      };
    } catch {
      result[key] = {
        path: relativePath,
        exists: false,
        updatedAt: "",
      };
    }
  }

  const latestSession = await readLatestPreparedChatSession().catch(() => null);
  result.latestSession = latestSession || null;
  result.mcp = (await readJsonFileSafe(path.join(ROOT, ".agency", "chat", "mcp-status.json"), null)) || null;
  return result;
}

async function persistEnvironmentRuntimeSnapshot(partial = {}) {
  const connection = buildConnectionHelpPayload();
  const artifacts = await buildArtifactSnapshot();
  return mergeEnvRuntime({
    environment: partial.environment !== undefined ? partial.environment : state.activeEnvironment,
    panel: {
      host: settings.host,
      port: settings.port,
      securityMode: settings.securityMode,
      effectiveSecurityMode: effectiveSecurityModeForIp("127.0.0.1"),
      publicHost: settings.publicHost || "",
      basePath: settings.basePath || "",
      startedAt: PANEL_BOOT_ISO,
    },
    services: {
      dev: publicDevState(),
      relay: publicRelayState(),
      relays: publicRelayStates(),
      tunnel: publicTunnelState(),
    },
    urls: {
      local: connection?.urls?.local || "",
      bind: connection?.urls?.bind || "",
      directLan: connection?.urls?.directLan || [],
      public: connection?.urls?.public || "",
      recommendedMobileUrl: connection?.guidance?.recommendedMobileUrl || "",
    },
    artifacts,
    ...partial,
  });
}

async function ensureDevStateForEnvironment({ devMode = "off", project = "", devPort = "" } = {}) {
  const normalizedDevMode = normalizeEnvironmentDevMode(devMode, "off");
  const normalizedProject = String(project || "").trim();
  const normalizedPort = String(devPort || "").trim();

  if (normalizedDevMode === "off") {
    if (state.activeDev) {
      await stopDevProcess();
    }
    return null;
  }

  const desiredMode = normalizedDevMode === "all" ? "all" : "single";
  const current = publicDevState();
  const currentMode = current?.mode === "all" ? "all" : current?.mode === "single" ? "single" : "";
  const currentProject = String(current?.project || "").trim();
  const currentPort = String(current?.port || "").trim();

  if (
    current &&
    currentMode === desiredMode &&
    currentProject === (desiredMode === "single" ? normalizedProject : "") &&
    currentPort === normalizedPort
  ) {
    return current;
  }

  if (state.activeDev) {
    await stopDevProcess();
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return startDevProcess(desiredMode, desiredMode === "single" ? normalizedProject : "", normalizedPort);
}

async function ensureRelayStateForEnvironment({
  relayEnabled = false,
  sessionName = "codex-chat",
  project = "",
} = {}) {
  const normalizedSessionName = String(sessionName || "codex-chat").trim() || "codex-chat";
  const normalizedProject = String(project || "").trim();

  if (!relayEnabled) {
    if (publicRelayStates().length > 0) {
      await stopRelayWatcher({ all: true });
    }
    return [];
  }

  const currentRelays = publicRelayStates();
  const existing = currentRelays.find((entry) => String(entry?.sessionName || "").trim() === normalizedSessionName);
  if (existing) {
    return currentRelays;
  }

  await startRelayWatcher({
    sessionName: normalizedSessionName,
    project: normalizedProject,
    useLast: false,
    dryRun: false,
    startFromLatest: true,
    pollMs: 1200,
    history: 16,
  });

  return publicRelayStates();
}

async function ensureTunnelStateForEnvironment({
  panelMode = "remote",
  remoteMode = "off",
  publicHost = "",
} = {}) {
  const normalizedPanelMode = normalizeEnvironmentPanelMode(panelMode, "remote");
  const normalizedRemoteMode = normalizeEnvironmentRemoteMode(remoteMode, "off");
  const normalizedPublicHost = String(publicHost || "").trim();

  settings.publicHost = normalizedRemoteMode === "off" ? "" : normalizedPublicHost || settings.publicHost || "";
  settings.tunnelMode = normalizedRemoteMode === "off" ? settings.tunnelMode : normalizedRemoteMode;
  settings.securityMode = normalizedRemoteMode !== "off" ? "on" : normalizedPanelMode === "remote" ? "auto" : "off";
  await persistRuntimeConfig();

  if (normalizedRemoteMode === "off") {
    if (state.activeTunnel) {
      await stopTunnelProcess();
    }
    state.publicHostVerification = null;
    return publicTunnelState();
  }

  const effectiveMode = normalizedRemoteMode === "named" && !hasNamedTunnelConfig() && remoteRedirectAutomationAvailable()
    ? "quick"
    : normalizedRemoteMode;
  if (
    state.activeTunnel &&
    String(state.activeTunnel.provider || "").trim() === String(settings.tunnelProvider || "").trim() &&
    String(state.activeTunnel.requestedMode || state.activeTunnel.mode || "").trim() === normalizedRemoteMode &&
    String(state.activeTunnel.publicHost || "").trim() === settings.publicHost
  ) {
    return publicTunnelState();
  }

  if (state.activeTunnel) {
    await stopTunnelProcess();
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return startTunnelProcess({
    provider: settings.tunnelProvider,
    mode: effectiveMode,
    requestedMode: normalizedRemoteMode,
    targetUrl: `http://127.0.0.1:${settings.port}`,
    tunnelToken: settings.cloudflaredTunnelToken,
    tunnelName: settings.cloudflaredTunnelName,
    configFile: settings.cloudflaredConfig,
    publicHost: settings.publicHost,
    timeoutMs: TUNNEL_DISCOVERY_TIMEOUT_MS,
  });
}

async function runEnvironmentPrep({ prep = "quick", project = "" } = {}) {
  const normalizedPrep = normalizeEnvironmentPrep(prep, "quick");
  if (normalizedPrep === "none") {
    return null;
  }

  const scriptByPrep = {
    quick: "super:bootstrap",
    standard: "super:bootstrap:standard",
    full: "super:bootstrap:full",
  };
  const script = scriptByPrep[normalizedPrep] || "super:bootstrap";
  const args = project ? [`--project=${project}`] : [];
  const result = await runOneShot({
    source: script,
    script,
    args,
    timeoutMs: normalizedPrep === "full" ? 40 * 60 * 1000 : 30 * 60 * 1000,
  });
  if (!result.ok) {
    throw new Error(`${script} failed (exit ${result.exitCode}).`);
  }
  return result;
}

function buildEnvironmentLaunchPlan(options = {}) {
  const context = normalizeEnvironmentContext(options.context, "commander");
  const project = String(options.project || "").trim();
  const prep = normalizeEnvironmentPrep(options.prep, "quick");
  const devMode = normalizeEnvironmentDevMode(options.devMode, context === "system" ? "off" : "project");
  const panelMode = normalizeEnvironmentPanelMode(options.panelMode, context === "commander" ? "remote" : "local");
  const remoteMode = normalizeEnvironmentRemoteMode(options.remoteMode, context === "commander" ? "named" : "off");
  const relayEnabled = parseBool(options.relayEnabled, context === "commander");
  const sessionName = normalizeEnvironmentName(options.sessionName || "codex-chat", "codex-chat");
  const environmentProfileName = normalizeEnvironmentName(options.environmentProfileName || "", "");
  const publicHost = String(
    remoteMode === "off"
      ? ""
      : options.publicHost || settings.publicHost || (context === "commander" ? "local-commander.diesign.dev" : "")
  ).trim();
  const devPort = String(options.devPort || "").trim();
  const effectiveTunnelMode = remoteMode === "named" && !hasNamedTunnelConfig() && remoteRedirectAutomationAvailable()
    ? "quick"
    : remoteMode;

  return {
    kind: "environment",
    summary: summarizeEnvironmentRequest({
      context,
      project,
      prep,
      panelMode,
      devMode,
      relayEnabled,
      remoteMode,
    }),
    request: {
      context,
      project,
      prep,
      devMode,
      panelMode,
      remoteMode,
      relayEnabled,
      sessionName,
      publicHost,
      devPort,
      environmentProfileName,
    },
    tunnel: {
      requestedMode: remoteMode,
      effectiveMode: effectiveTunnelMode,
      publicHost,
      namedTunnelConfigured: hasNamedTunnelConfig(),
      remoteRedirectAvailable: remoteRedirectAutomationAvailable(),
    },
  };
}

async function launchEnvironment(options = {}) {
  const plan = buildEnvironmentLaunchPlan(options);
  const {
    context,
    project,
    prep,
    devMode,
    panelMode,
    remoteMode,
    relayEnabled,
    sessionName,
    publicHost,
    devPort,
    environmentProfileName,
  } = plan.request;

  const prepResult = await runEnvironmentPrep({ prep, project });
  const dev = await ensureDevStateForEnvironment({ devMode, project, devPort });
  const relays = await ensureRelayStateForEnvironment({ relayEnabled, sessionName, project });
  const tunnel = await ensureTunnelStateForEnvironment({ panelMode, remoteMode, publicHost });

  const runId = `${Date.now()}`;
  state.activeEnvironment = {
    id: runId,
    context,
    project,
    prep,
    devMode,
    environmentProfileName,
    panelMode,
    remoteMode,
    relayEnabled,
    sessionName,
    publicHost,
    startedAt: timestamp(),
    summary: summarizeEnvironmentRequest({
      context,
      project,
      prep,
      panelMode,
      devMode,
      relayEnabled,
      remoteMode,
    }),
  };

  const artifacts = await buildArtifactSnapshot();
  const connection = buildConnectionHelpPayload();
  const runtime = await persistEnvironmentRuntimeSnapshot();
  const runs = await appendLaunchRun({
    id: runId,
    environmentProfileName,
    context,
    project,
    prep,
    panelMode,
    remoteMode,
    relayEnabled,
    publicHost,
    sessionName,
    status: "ready",
    summary: state.activeEnvironment.summary,
    request: plan.request,
    urls: {
      local: connection?.urls?.local || "",
      bind: connection?.urls?.bind || "",
      directLan: connection?.urls?.directLan || [],
      public: connection?.urls?.public || "",
      recommendedMobileUrl: connection?.guidance?.recommendedMobileUrl || "",
    },
    artifacts,
  });

  return {
    environment: state.activeEnvironment,
    prep: prepResult,
    activeDev: dev,
    activeRelay: publicRelayState(),
    activeRelays: relays,
    activeTunnel: tunnel,
    connection,
    artifacts,
    runtime,
    runs: runs.runs.slice(0, 15),
  };
}

async function stopEnvironment({ stopPanel = false } = {}) {
  const relayResult = await stopRelayWatcher({ all: true });
  const tunnelStopped = await stopTunnelProcess().catch(() => false);
  const devStopped = await stopDevProcess().catch(() => false);

  state.activeEnvironment = null;
  const runtime = await persistEnvironmentRuntimeSnapshot({
    environment: null,
  });

  return {
    relay: relayResult,
    tunnelStopped,
    devStopped,
    stopPanel: Boolean(stopPanel),
    runtime,
  };
}

async function buildEnvironmentStatus() {
  const [profiles, runs, runtime, artifacts, agentProfiles] = await Promise.all([
    readEnvProfiles(),
    readLaunchRuns(),
    readEnvRuntime(),
    buildArtifactSnapshot(),
    readAgentProfilesSnapshot().catch(() => null),
  ]);
  return {
    ok: true,
    environment: state.activeEnvironment || runtime.environment || null,
    profiles,
    agentProfiles,
    runs: runs.runs.slice(0, 20),
    runtime,
    activeDev: publicDevState(),
    activeRelay: publicRelayState(),
    activeRelays: publicRelayStates(),
    activeTunnel: publicTunnelState(),
    connection: buildConnectionHelpPayload(),
    artifacts,
  };
}

async function readAgentProfilesSnapshot() {
  const registry = await readAgentProfileRegistry();
  return {
    registry,
    profiles: listAgentProfiles(registry, { includeRetired: true }),
    resolvedDefault: resolveAgentProfile(registry, {}) || null,
  };
}

async function resolveAgentLaunchProfile(input = {}) {
  const snapshot = await readAgentProfilesSnapshot();
  const project = String(input.project || "").trim();
  const profile = resolveAgentProfile(snapshot.registry, {
    name: input.agentProfileName,
    project,
  });
  return {
    ...snapshot,
    profile,
  };
}

async function createCodexSessionFromRequest(input = {}, { dryRun = false } = {}) {
  const requestedName = String(input.name || "").trim();
  const requestedProject = String(input.project || "").trim();
  const requestedNotes = String(input.notes || "").trim().slice(0, 5000);
  const requestedModel = String(input.model || "").trim();
  const requestedCodexProfile = String(input.codexProfile || input.profile || "").trim();
  const requestedMakeDefault = parseBool(input.makeDefault, false);
  const timeoutMs = Math.max(20_000, Math.min(15 * 60 * 1000, Number.parseInt(String(input.timeoutMs || ""), 10) || 8 * 60 * 1000));
  const agentProfileData = await resolveAgentLaunchProfile({
    agentProfileName: input.agentProfileName,
    project: requestedProject,
  });
  const agentProfile = agentProfileData.profile;

  const name = requestedName;
  const project = String(requestedProject || agentProfile?.project || "").trim();
  const notes = requestedNotes || "";
  const model = requestedModel || String(agentProfile?.model || "").trim();
  const codexProfile = requestedCodexProfile || String(agentProfile?.codexProfile || "").trim();
  const makeDefault = input.makeDefault !== undefined ? requestedMakeDefault : false;

  if (!validateSessionName(name)) {
    throw new Error("Invalid session name.");
  }
  if (!validateCodexProjectRef(project)) {
    throw new Error("Invalid project value.");
  }

  const args = ["exec", "--json"];
  if (model) {
    args.push("--model", model);
  }
  if (codexProfile) {
    args.push("--profile", codexProfile);
  }
  args.push("-");

  const prompt =
    String(input.prompt || "").trim() ||
    `Create a new Codex relay session for project '${project || "workspace"}'. Reply exactly with READY.`;
  const canonicalRequest = {
    name,
    project,
    notes,
    model,
    codexProfile,
    makeDefault,
    timeoutMs,
    prompt,
    agentProfileName: agentProfile?.name || "",
  };

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      kind: "session-create",
      summary: `Plan session create: ${name}${project ? ` (${project})` : ""}`,
      request: canonicalRequest,
      codexArgs: args,
      agentProfiles: agentProfileData,
    };
  }

  const codexResult = await runCodexOneShot({
    source: "codex:create",
    args,
    input: prompt,
    timeoutMs,
  });
  if (!codexResult.ok) {
    return {
      ok: false,
      error: `Codex create failed (exit ${codexResult.exitCode}).`,
      result: codexResult,
    };
  }

  const threadId = extractCodexThreadIdFromOutput(codexResult.outputLines);
  if (!threadId) {
    return {
      ok: false,
      error: "Codex create completed but no thread_id was found in output.",
      result: codexResult,
    };
  }

  const current = await readCodexRegistrySafe();
  const updated = upsertCodexSession(current, {
    name,
    target: threadId,
    threadId,
    project,
    notes,
    source: "panel-create",
    makeDefault,
  });
  const persisted = await writeCodexRegistrySafe(updated);
  pushLog("codex-sessions", `Created session ${name} -> ${threadId}`);
  await appendActivityEvent({
    type: "session_create",
    state: "working",
    message: `Session created: ${name}`,
    source: "panel-codex",
    meta: {
      name,
      threadId,
      project,
      model,
      codexProfile,
      agentProfileName: agentProfile?.name || "",
    },
  }).catch(() => null);
  const runs = await appendLaunchRun({
    id: `${Date.now()}`,
    kind: "session-create",
    environmentProfileName: normalizeEnvironmentName(state.activeEnvironment?.environmentProfileName || "", ""),
    agentProfileName: normalizeEnvironmentName(agentProfile?.name || "", ""),
    context: state.activeEnvironment?.context || "project",
    project,
    prep: state.activeEnvironment?.prep || "quick",
    panelMode: state.activeEnvironment?.panelMode || "remote",
    remoteMode: state.activeEnvironment?.remoteMode || "off",
    relayEnabled: Boolean(state.activeEnvironment?.relayEnabled),
    publicHost: String(state.activeEnvironment?.publicHost || "").trim(),
    sessionName: name,
    threadId,
    model,
    codexProfile,
    status: "session-created",
    summary: `Session created: ${name}${project ? ` (${project})` : ""}`,
    request: canonicalRequest,
    urls: {
      local: buildConnectionHelpPayload()?.urls?.local || "",
      public: buildConnectionHelpPayload()?.guidance?.recommendedMobileUrl || "",
    },
    artifacts: await buildArtifactSnapshot(),
  });
  await persistEnvironmentRuntimeSnapshot({
    environment: state.activeEnvironment,
  });

  return {
    ok: true,
    created: {
      name,
      target: threadId,
      model,
      codexProfile,
      agentProfileName: agentProfile?.name || "",
    },
    registry: persisted,
    runs: runs.runs.slice(0, 15),
    agentProfiles: agentProfileData,
    codex: {
      exitCode: codexResult.exitCode,
      durationMs: codexResult.durationMs,
      outputTail: codexResult.outputLines.slice(-25),
    },
  };
}

async function spawnSuperAgentFromRequest(input = {}, { dryRun = false } = {}) {
  const requestedProject = String(input.project || "").trim();
  const agentProfileData = await resolveAgentLaunchProfile({
    agentProfileName: input.agentProfileName,
    project: requestedProject,
  });
  const agentProfile = agentProfileData.profile;
  const agentKind = String(input.agentKind || agentProfile?.agentKind || "super").trim().toLowerCase();
  if (agentKind !== "super") {
    throw new Error(`Unsupported agent kind '${agentKind}'.`);
  }

  const project = String(requestedProject || agentProfile?.project || "").trim();
  const mode = normalizeEnvironmentPrep(input.mode, normalizeEnvironmentPrep(agentProfile?.mode, "quick"));
  const validMode = mode === "full" ? "full" : "quick";
  const name = normalizeSessionName(
    String(input.name || agentProfile?.sessionName || superAgentSessionName(project)).trim(),
    ""
  );
  const model = String(input.model || agentProfile?.model || "").trim();
  const codexProfile = String(input.codexProfile || input.profile || agentProfile?.codexProfile || "").trim();
  const notes = String(input.notes || agentProfile?.notes || "").trim().slice(0, 5000);
  const runPrep = input.runPrep !== undefined ? parseBool(input.runPrep, true) : Boolean(agentProfile?.runPrep ?? true);
  const startRelay = input.startRelay !== undefined ? parseBool(input.startRelay, true) : Boolean(agentProfile?.startRelay ?? true);
  const makeDefault = input.makeDefault !== undefined
    ? parseBool(input.makeDefault, true)
    : Boolean(agentProfile?.makeDefaultSession ?? true);
  const timeoutMs = Math.max(
    20_000,
    Math.min(15 * 60 * 1000, Number.parseInt(String(input.timeoutMs || agentProfile?.timeoutMs || ""), 10) || 8 * 60 * 1000)
  );

  if (!validateSessionName(name)) {
    throw new Error("Invalid session name.");
  }
  if (!validateCodexProjectRef(project)) {
    throw new Error("Invalid project value.");
  }

  const prompt = buildSuperAgentInitPrompt({
    project,
    mode: validMode,
    context: state.activeEnvironment?.context || "project",
  });
  const canonicalRequest = {
    agentKind: "super",
    mode: validMode,
    project,
    name,
    model,
    codexProfile,
    notes,
    runPrep,
    startRelay,
    makeDefault,
    timeoutMs,
    agentProfileName: agentProfile?.name || "",
  };

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      kind: "agent-spawn",
      summary: `Plan super agent: ${name}${project ? ` (${project})` : ""}`,
      request: canonicalRequest,
      prompt,
      agentProfiles: agentProfileData,
    };
  }

  let prep = null;
  if (runPrep) {
    prep = await runOneShot({
      source: validMode === "full" ? "super:bootstrap:full" : "super:bootstrap",
      script: validMode === "full" ? "super:bootstrap:full" : "super:bootstrap",
      args: project ? [`--project=${project}`] : [],
      timeoutMs: validMode === "full" ? 40 * 60 * 1000 : 30 * 60 * 1000,
    });
    if (!prep.ok) {
      return {
        ok: false,
        step: "prep",
        error: `Bootstrap failed (exit ${prep.exitCode}).`,
        prep,
      };
    }
  }

  const codexArgs = ["exec", "--json"];
  if (model) {
    codexArgs.push("--model", model);
  }
  if (codexProfile) {
    codexArgs.push("--profile", codexProfile);
  }
  codexArgs.push("-");

  const codexResult = await runCodexOneShot({
    source: "super-agent:create",
    args: codexArgs,
    input: prompt,
    timeoutMs,
  });
  if (!codexResult.ok) {
    return {
      ok: false,
      step: "codex",
      error: `Codex create failed (exit ${codexResult.exitCode}).`,
      result: codexResult,
      prep,
    };
  }

  const threadId = extractCodexThreadIdFromOutput(codexResult.outputLines);
  if (!threadId) {
    return {
      ok: false,
      step: "thread-id",
      error: "Codex create completed but no thread_id was found in output.",
      result: codexResult,
      prep,
    };
  }

  const current = await readCodexRegistrySafe();
  const updated = upsertCodexSession(current, {
    name,
    target: threadId,
    threadId,
    project,
    notes: notes || `Super agent (${validMode}) created via commander panel.`,
    source: "panel-super-agent",
    makeDefault,
  });
  const persisted = await writeCodexRegistrySafe(updated);

  let relay = null;
  let relayError = "";
  if (startRelay) {
    const existingRelay = publicRelayStates().find((entry) => String(entry?.sessionName || "") === name);
    if (existingRelay) {
      relay = existingRelay;
    } else {
      try {
        relay = await startRelayWatcher({
          sessionName: name,
          project,
          useLast: false,
          dryRun: false,
          startFromLatest: true,
          pollMs: 1200,
          history: 16,
        });
      } catch (error) {
        relayError = error instanceof Error ? error.message : "Failed to start relay watcher.";
      }
    }
  }

  const latestSession = runPrep ? await readLatestPreparedChatSession() : null;
  pushLog("codex-sessions", `Spawned super agent ${name} -> ${threadId}`);
  await appendActivityEvent({
    type: "super_agent_spawn",
    state: "working",
    message: `Super agent spawned: ${name}${project ? ` (${project})` : ""}`,
    source: "panel-codex",
    meta: {
      name,
      threadId,
      project,
      mode: validMode,
      model,
      codexProfile,
      agentProfileName: agentProfile?.name || "",
      runPrep,
      startRelay,
      relayError,
    },
  }).catch(() => null);
  const runs = await appendLaunchRun({
    id: `${Date.now()}`,
    kind: "agent-spawn",
    environmentProfileName: normalizeEnvironmentName(state.activeEnvironment?.environmentProfileName || "", ""),
    agentProfileName: normalizeEnvironmentName(agentProfile?.name || "", ""),
    context: state.activeEnvironment?.context || "commander",
    project,
    prep: validMode,
    panelMode: state.activeEnvironment?.panelMode || "remote",
    remoteMode: state.activeEnvironment?.remoteMode || "off",
    relayEnabled: startRelay,
    publicHost: String(state.activeEnvironment?.publicHost || "").trim(),
    sessionName: name,
    threadId,
    model,
    codexProfile,
    status: relayError ? "agent-ready-relay-warning" : "agent-ready",
    summary: `Super agent ready: ${name}${project ? ` (${project})` : ""}`,
    request: canonicalRequest,
    urls: {
      local: buildConnectionHelpPayload()?.urls?.local || "",
      public: buildConnectionHelpPayload()?.guidance?.recommendedMobileUrl || "",
    },
    artifacts: await buildArtifactSnapshot(),
  });
  await persistEnvironmentRuntimeSnapshot({
    environment: state.activeEnvironment,
  });

  return {
    ok: true,
    created: {
      name,
      target: threadId,
      threadId,
      project,
      mode: validMode,
      model,
      codexProfile,
      agentProfileName: agentProfile?.name || "",
    },
    registry: persisted,
    prep,
    latestSession,
    runs: runs.runs.slice(0, 15),
    agentProfiles: agentProfileData,
    codex: {
      exitCode: codexResult.exitCode,
      durationMs: codexResult.durationMs,
      outputTail: codexResult.outputLines.slice(-25),
    },
    relay: {
      activeRelay: publicRelayState(),
      activeRelays: publicRelayStates(),
      error: relayError,
    },
  };
}

async function terminateProcessTree(pid) {
  if (!pid) {
    return;
  }

  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const killer = spawn("taskkill", ["/PID", String(pid), "/T", "/F"], {
        windowsHide: true,
      });
      killer.on("exit", () => resolve());
      killer.on("error", () => resolve());
    });
    return;
  }

  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      return;
    }
  }
}

async function startDevProcess(mode, project, port) {
  if (state.activeDev) {
    throw new Error("A dev process is already running.");
  }

  const script = mode === "all" ? "dev:all" : "dev";
  const args = [];
  if (mode === "single" && project) {
    args.push(`--project=${project}`);
  }
  if (port) {
    args.push(`--port=${port}`);
  }

  const child = spawnNpm(script, args);
  const processState = {
    mode,
    project: project || null,
    port: port || null,
    pid: child.pid,
    startedAt: timestamp(),
    child,
  };

  state.activeDev = processState;
  attachChildLogs(child, `dev:${mode}`);
  pushLog("system", `Started dev process (${mode}) pid=${child.pid}`);
  broadcastState();

  child.on("exit", (code) => {
    pushLog("system", `Dev process exited (pid=${child.pid}, exit=${code ?? -1})`);
    if (state.activeDev && state.activeDev.pid === child.pid) {
      state.activeDev = null;
    }
    broadcastState();
  });

  child.on("error", (error) => {
    pushLog("system", `Dev process error: ${error.message}`);
    if (state.activeDev && state.activeDev.pid === child.pid) {
      state.activeDev = null;
    }
    broadcastState();
  });

  return publicDevState();
}

async function stopDevProcess() {
  if (!state.activeDev) {
    return false;
  }
  const { pid } = state.activeDev;
  pushLog("system", `Stopping dev process pid=${pid}`);
  await terminateProcessTree(pid);
  return true;
}

async function startRelayWatcher({
  sessionName = "codex-chat",
  project = "",
  useLast = false,
  dryRun = false,
  startFromLatest = true,
  pollMs = 1200,
  history = 16,
} = {}) {
  const sessionKey = relaySessionKey(sessionName);
  if (!sessionKey) {
    throw new Error("Session name is required.");
  }
  if (state.activeRelays.has(sessionKey)) {
    throw new Error(`Relay watcher is already running for session '${sessionName}'.`);
  }

  const args = [`--session-name=${sessionName}`];
  if (project) {
    args.push(`--project=${project}`);
  }
  args.push(`--codex-use-last=${useLast ? "true" : "false"}`);
  args.push(`--dry-run=${dryRun ? "true" : "false"}`);
  args.push(`--start-from-latest=${startFromLatest ? "true" : "false"}`);
  args.push(`--poll-ms=${pollMs}`);
  args.push(`--history=${history}`);

  const child = spawnNpm("commander:relay:codex:watch", args);
  const relayState = {
    mode: "watch",
    sessionName,
    project: project || "",
    useLast: Boolean(useLast),
    dryRun: Boolean(dryRun),
    startFromLatest: Boolean(startFromLatest),
    pollMs,
    history,
    pid: child.pid,
    startedAt: timestamp(),
    child,
  };

  state.activeRelays.set(sessionKey, relayState);
  syncLegacyActiveRelay();
  attachChildLogs(child, "relay:codex");
  pushLog(
    "system",
    `Started relay watcher pid=${child.pid} session=${sessionName}${project ? ` project=${project}` : ""}${
      dryRun ? " dry-run=true" : ""
    }`
  );
  broadcastState();

  child.on("exit", (code) => {
    pushLog("system", `Relay watcher exited (pid=${child.pid}, exit=${code ?? -1})`);
    const existing = state.activeRelays.get(sessionKey);
    if (existing && existing.pid === child.pid) {
      state.activeRelays.delete(sessionKey);
      syncLegacyActiveRelay();
    }
    broadcastState();
  });

  child.on("error", (error) => {
    pushLog("system", `Relay watcher error: ${error.message}`);
    const existing = state.activeRelays.get(sessionKey);
    if (existing && existing.pid === child.pid) {
      state.activeRelays.delete(sessionKey);
      syncLegacyActiveRelay();
    }
    broadcastState();
  });

  return relayPublicShape(relayState);
}

function resolveRelayStopTargets({ sessionName = "", all = false } = {}) {
  if (all) {
    if (state.activeRelays.size) {
      return [...state.activeRelays.values()];
    }
    return state.activeRelay ? [state.activeRelay] : [];
  }
  const name = String(sessionName || "").trim();
  if (name) {
    const byName = state.activeRelays.get(relaySessionKey(name));
    if (byName) {
      return [byName];
    }
    if (state.activeRelay && state.activeRelay.sessionName === name) {
      return [state.activeRelay];
    }
    return [];
  }
  if (state.activeRelay) {
    return [state.activeRelay];
  }
  if (state.activeRelays.size) {
    return [[...state.activeRelays.values()][0]];
  }
  return [];
}

async function stopRelayWatcher(options = {}) {
  const targets = resolveRelayStopTargets(options);
  if (!targets.length) {
    return {
      stopped: false,
      stoppedCount: 0,
      requestedSessionName: String(options.sessionName || "").trim(),
    };
  }
  const uniquePids = new Set();
  for (const relay of targets) {
    const pid = Number(relay?.pid || 0);
    if (!pid || uniquePids.has(pid)) {
      continue;
    }
    uniquePids.add(pid);
    pushLog(
      "system",
      `Stopping relay watcher pid=${pid}${relay?.sessionName ? ` session=${relay.sessionName}` : ""}`
    );
    await terminateProcessTree(pid);
  }
  return {
    stopped: uniquePids.size > 0,
    stoppedCount: uniquePids.size,
    requestedSessionName: String(options.sessionName || "").trim(),
  };
}

function extractHttpsUrlFromLine(line) {
  const text = String(line || "");
  const matches = text.match(URL_IN_TEXT_REGEX);
  if (!matches || matches.length === 0) {
    return "";
  }
  const preferred = [];
  const fallback = [];
  const blockedHosts = new Set([
    "www.cloudflare.com",
    "developers.cloudflare.com",
    "dash.cloudflare.com",
    "github.com",
  ]);
  for (const candidate of matches) {
    const normalized = String(candidate || "").trim();
    if (!normalized.startsWith("https://")) {
      continue;
    }
    if (normalized.includes("localhost") || normalized.includes("127.0.0.1")) {
      continue;
    }
    const cleaned = normalized.replace(/[),.;]+$/, "");
    let host = "";
    try {
      host = String(new URL(cleaned).hostname || "").toLowerCase();
    } catch {
      host = "";
    }
    if (blockedHosts.has(host)) {
      continue;
    }
    if (host.includes("trycloudflare.com") || host.includes("cfargotunnel.com")) {
      preferred.push(cleaned);
      continue;
    }
    fallback.push(cleaned);
  }
  return preferred[0] || fallback[0] || "";
}

function resolveTunnelPublicHintUrl() {
  const hintFromHost = buildManagedPublicUrl(settings.publicHost, "https", settings.basePath);
  return String(hintFromHost || "").trim();
}

function redactCloudflaredArgs(args) {
  const redacted = [];
  let redactNext = false;
  for (const arg of args || []) {
    const value = String(arg ?? "");
    if (redactNext) {
      redacted.push("<redacted>");
      redactNext = false;
      continue;
    }
    if (value === "--token") {
      redacted.push(value);
      redactNext = true;
      continue;
    }
    redacted.push(value);
  }
  return redacted;
}

function buildCloudflaredTunnelArgs({
  mode = "quick",
  targetUrl = `http://127.0.0.1:${settings.port}`,
  tunnelToken = "",
  tunnelName = "",
  configFile = "",
} = {}) {
  const normalizedMode = parseTunnelMode(mode, "");
  if (!normalizedMode) {
    throw new Error("Tunnel mode must be one of: quick, token, named.");
  }

  const args = [];
  if (configFile) {
    args.push("--config", configFile);
  }
  args.push("tunnel");

  if (normalizedMode === "quick") {
    args.push("--url", targetUrl);
  } else if (normalizedMode === "token") {
    const token = String(tunnelToken || "").trim();
    if (!token) {
      throw new Error("Token tunnel mode requires REMOTE_PANEL_CLOUDFLARED_TUNNEL_TOKEN.");
    }
    args.push("run", "--token", token);
  } else if (normalizedMode === "named") {
    const name = String(tunnelName || "").trim();
    if (!name) {
      throw new Error("Named tunnel mode requires REMOTE_PANEL_CLOUDFLARED_TUNNEL_NAME.");
    }
    args.push("run", name);
  }

  args.push("--no-autoupdate");
  return {
    mode: normalizedMode,
    args,
  };
}

async function startTunnelProcess({
  provider = "cloudflared",
  mode = "quick",
  requestedMode = "",
  targetUrl = `http://127.0.0.1:${settings.port}`,
  tunnelToken = "",
  tunnelName = "",
  configFile = "",
  publicHost = "",
  timeoutMs = TUNNEL_DISCOVERY_TIMEOUT_MS,
} = {}) {
  if (state.activeTunnel) {
    throw new Error("Tunnel is already running.");
  }

  const normalizedProvider = parseTunnelProvider(provider, "cloudflared");
  const normalizedMode = parseTunnelMode(mode, "");
  const normalizedRequestedMode = parseTunnelMode(requestedMode, normalizedMode);
  const normalizedPublicHost = normalizePublicHost(publicHost || settings.publicHost || "");

  if (normalizedProvider === "server") {
    if (!normalizedPublicHost) {
      throw new Error("Server remote provider requires a configured public host.");
    }
    const verification = await verifyAndMaybeManagePublicHost({
      desiredMode: normalizedRequestedMode,
      publicHost: normalizedPublicHost,
      tunnelUrl: "",
    }).catch((error) => ({
      ok: false,
      url: buildManagedPublicUrl(normalizedPublicHost, "https", settings.basePath).replace(/\/$/, "") || "",
      status: 0,
      error: error instanceof Error ? error.message : "Failed to verify remote public host.",
    }));

    settings.securityMode = "on";
    settings.tunnelMode = normalizedRequestedMode;
    settings.tunnelProvider = normalizedProvider;
    settings.publicHost = normalizedPublicHost;
    await persistRuntimeConfig().catch(() => null);

    state.activeTunnel = {
      provider: normalizedProvider,
      mode: normalizedMode || normalizedRequestedMode || "named",
      requestedMode: normalizedRequestedMode || normalizedMode || "named",
      url: "",
      publicUrl: buildManagedPublicUrl(normalizedPublicHost, "https", settings.basePath),
      publicHost: normalizedPublicHost,
      targetUrl,
      pid: 0,
      startedAt: timestamp(),
      verification,
    };
    state.publicHostVerification = verification;
    broadcastState();

    if (verification?.ok && state.activeTunnel.publicUrl) {
      pushLog("system", `External server host verified (${state.activeTunnel.publicUrl})`);
    } else {
      pushLog("system", `External server host configured but not yet verified (${normalizedPublicHost})`);
    }
    return publicTunnelState();
  }

  const tunnelBin = resolveCloudflaredBin();
  const tunnelSpec = buildCloudflaredTunnelArgs({
    mode,
    targetUrl,
    tunnelToken,
    tunnelName,
    configFile,
  });
  const args = tunnelSpec.args;
  const normalizedCloudflareMode = tunnelSpec.mode;
  const normalizedCloudflareRequestedMode = parseTunnelMode(requestedMode, normalizedCloudflareMode);
  const discoveredUrlHint = resolveTunnelPublicHintUrl();
  const child = spawn(tunnelBin, args, {
    cwd: ROOT,
    env: process.env,
    windowsHide: true,
  });

  const loggedArgs = redactCloudflaredArgs(args);
  pushLog("system", `Starting external tunnel (${normalizedCloudflareMode}): ${tunnelBin} ${loggedArgs.join(" ")}`);

  const discoveredUrl = await new Promise((resolve, reject) => {
    let settled = false;
    let discovered = "";
    const quickMode = normalizedCloudflareMode === "quick";
    const startupDelayMs = quickMode ? timeoutMs : Math.max(1500, Math.min(10000, Math.floor(timeoutMs / 3)));
    const stdoutRl = child.stdout ? readline.createInterface({ input: child.stdout }) : null;
    const stderrRl = child.stderr ? readline.createInterface({ input: child.stderr }) : null;

    const cleanup = () => {
      clearTimeout(timer);
      stdoutRl?.close();
      stderrRl?.close();
    };

    const finalizeResolve = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(discovered || discoveredUrlHint || "");
    };
    const finalizeReject = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const inspect = (line, streamLabel = "stdout") => {
      pushLog("tunnel:cloudflared", `[${streamLabel}] ${line}`);
      const url = extractHttpsUrlFromLine(line);
      if (!url) {
        return;
      }
      discovered = url;
      if (quickMode || normalizedCloudflareMode !== "quick") {
        finalizeResolve();
      }
    };

    stdoutRl?.on("line", (line) => inspect(line, "stdout"));
    stderrRl?.on("line", (line) => inspect(line, "stderr"));

    child.on("error", (error) => {
      if (error?.code === "ENOENT") {
        finalizeReject(new Error("cloudflared is not installed or not found on PATH. Set REMOTE_PANEL_CLOUDFLARED_BIN if needed."));
        return;
      }
      finalizeReject(new Error(`Tunnel launch failed: ${error.message}`));
    });

    child.on("exit", (code) => {
      if (settled) {
        return;
      }
      if (!quickMode && code === 0 && (discovered || discoveredUrlHint)) {
        finalizeResolve();
        return;
      }
      const reason = quickMode
        ? code === 0
          ? "Tunnel exited before URL discovery."
          : `Tunnel exited (exit ${code ?? -1}) before URL discovery.`
        : `Tunnel exited (exit ${code ?? -1}) before startup completed.`;
      finalizeReject(new Error(reason));
    });

    const timer = setTimeout(() => {
      if (quickMode) {
        finalizeReject(new Error(`Tunnel URL discovery timed out after ${timeoutMs}ms.`));
        return;
      }
      finalizeResolve();
    }, startupDelayMs);
  }).catch(async (error) => {
    await terminateProcessTree(child.pid).catch(() => null);
    throw error;
  });

  const tunnelState = {
    provider: normalizedProvider,
    mode: normalizedCloudflareMode,
    requestedMode: normalizedCloudflareRequestedMode,
    url: discoveredUrl,
    publicUrl: "",
    publicHost: normalizedPublicHost,
    targetUrl,
    pid: child.pid,
    startedAt: timestamp(),
    child,
  };

  state.activeTunnel = tunnelState;
  state.publicHostVerification = null;
  settings.securityMode = "on";
  settings.tunnelMode = normalizedCloudflareRequestedMode;
  settings.tunnelProvider = normalizedProvider;
  if (normalizedPublicHost) {
    settings.publicHost = normalizedPublicHost;
  } else if (discoveredUrl && normalizedCloudflareRequestedMode === "quick") {
    settings.publicHost = discoveredUrl;
  }
  await persistRuntimeConfig().catch(() => null);
  const verification = await verifyAndMaybeManagePublicHost({
    desiredMode: normalizedCloudflareRequestedMode,
    publicHost: normalizedPublicHost || settings.publicHost,
    tunnelUrl: discoveredUrl,
  }).catch((error) => ({
    ok: false,
    url: buildManagedPublicUrl(normalizedPublicHost || settings.publicHost, "https", settings.basePath).replace(/\/$/, "") || "",
    status: 0,
    error: error instanceof Error ? error.message : "Failed to verify remote public host.",
  }));
  state.activeTunnel.verification = verification;
  state.activeTunnel.publicUrl = verification?.ok
    ? buildManagedPublicUrl(normalizedPublicHost || settings.publicHost, "https", settings.basePath)
    : normalizedPublicHost
      ? buildManagedPublicUrl(normalizedPublicHost, "https", settings.basePath)
      : discoveredUrl;
  broadcastState();

  child.on("exit", async (code) => {
    pushLog("system", `Tunnel exited (pid=${child.pid}, exit=${code ?? -1})`);
      if (state.activeTunnel && state.activeTunnel.pid === child.pid) {
        state.activeTunnel = null;
        state.publicHostVerification = null;
        if (normalizedCloudflareMode === "quick" && settings.publicHost === discoveredUrl) {
          settings.publicHost = "";
        }
      await persistRuntimeConfig().catch(() => null);
    }
    broadcastState();
  });

  child.on("error", async (error) => {
    pushLog("system", `Tunnel error: ${error.message}`);
      if (state.activeTunnel && state.activeTunnel.pid === child.pid) {
        state.activeTunnel = null;
        state.publicHostVerification = null;
        if (normalizedCloudflareMode === "quick" && settings.publicHost === discoveredUrl) {
          settings.publicHost = "";
        }
      await persistRuntimeConfig().catch(() => null);
    }
    broadcastState();
  });

  if (verification?.ok && state.activeTunnel.publicUrl) {
    pushLog("system", `External tunnel ready (${normalizedCloudflareRequestedMode}->${normalizedCloudflareMode}): ${state.activeTunnel.publicUrl}`);
  } else if (discoveredUrl) {
    pushLog("system", `External tunnel live (${normalizedCloudflareRequestedMode}->${normalizedCloudflareMode}): ${discoveredUrl}`);
  } else {
    pushLog(
      "system",
      `External tunnel running (${normalizedCloudflareRequestedMode}->${normalizedCloudflareMode}) without detected URL. Set REMOTE_PANEL_PUBLIC_HOST for a clickable mobile URL.`
    );
  }
  return publicTunnelState();
}

async function stopTunnelProcess() {
  if (!state.activeTunnel) {
    return false;
  }
  const { pid } = state.activeTunnel;
  pushLog("system", `Stopping tunnel pid=${pid}`);
  if (pid) {
    await terminateProcessTree(pid);
  } else {
    state.activeTunnel = null;
    state.publicHostVerification = null;
    await persistRuntimeConfig().catch(() => null);
    broadcastState();
  }
  return true;
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-") || "project";
}

async function loadAgencyConfig() {
  const configPath = path.join(ROOT, "agency.config.json");
  try {
    const raw = await fsp.readFile(configPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function discoverProjects() {
  const projectsDir = path.join(ROOT, "projects");
  const agencyConfig = await loadAgencyConfig();
  const activeProject = String(agencyConfig.activeProject || "");

  let entries = [];
  try {
    entries = await fsp.readdir(projectsDir, { withFileTypes: true });
  } catch {
    return { activeProject, projects: [] };
  }

  const projects = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const folder = entry.name;
    const projectPath = path.join(projectsDir, folder);
    const configPath = path.join(projectPath, "project.config.json");

    let config = {};
    try {
      const configRaw = await fsp.readFile(configPath, "utf8");
      config = JSON.parse(configRaw);
    } catch {
      config = {};
    }

    projects.push({
      name: folder,
      slug: slugify(folder),
      distDir: path.posix.join("dist", "projects", slugify(folder)),
      hasConfig: fs.existsSync(configPath),
      jsEngine: config.scripts?.engine || config.build?.scripts?.engine || "default",
    });
  }

  projects.sort((a, b) => a.name.localeCompare(b.name));
  return { activeProject, projects };
}

async function readLatestPreparedChatSession() {
  const sessionsDir = path.join(ROOT, ".agency", "chat", "sessions");
  let entries = [];
  try {
    entries = await fsp.readdir(sessionsDir, { withFileTypes: true });
  } catch {
    return null;
  }

  const dirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => right.localeCompare(left));

  if (!dirs.length) {
    return null;
  }

  const folderName = dirs[0];
  const folderPath = path.join(sessionsDir, folderName);
  const sessionJsonPath = path.join(folderPath, "session.json");
  const briefingPath = path.join(folderPath, "briefing.md");

  let sessionJson = null;
  try {
    const raw = await fsp.readFile(sessionJsonPath, "utf8");
    sessionJson = JSON.parse(raw);
  } catch {
    sessionJson = null;
  }

  return {
    folderName,
    folderPath: path.relative(ROOT, folderPath).replace(/\\/g, "/"),
    sessionJsonPath: path.relative(ROOT, sessionJsonPath).replace(/\\/g, "/"),
    briefingPath: path.relative(ROOT, briefingPath).replace(/\\/g, "/"),
    sessionJson,
  };
}

async function readManifestFile(manifestId) {
  if (!SAFE_MANIFEST_ID.test(manifestId)) {
    return null;
  }
  const manifestPath = path.join(MANIFEST_DIR, `${manifestId}.json`);
  if (!manifestPath.startsWith(MANIFEST_DIR)) {
    return null;
  }
  try {
    const raw = await fsp.readFile(manifestPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function listManifests() {
  let files = [];
  try {
    files = await fsp.readdir(MANIFEST_DIR, { withFileTypes: true });
  } catch {
    return [];
  }

  const manifests = [];
  for (const entry of files) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }
    const id = entry.name.slice(0, -".json".length);
    const manifest = await readManifestFile(id);
    if (!manifest) {
      continue;
    }
    manifests.push({
      id: manifest.id || id,
      mode: manifest.mode || "unknown",
      project: manifest.project || null,
      host: manifest.host || "127.0.0.1",
      port: manifest.port || null,
      url: manifest.url || null,
      generatedAt: manifest.generatedAt || null,
      previewUrl: withBasePath(`/preview/${encodeURIComponent(manifest.id || id)}/`),
    });
  }

  manifests.sort((a, b) => {
    const lhs = Date.parse(a.generatedAt || "") || 0;
    const rhs = Date.parse(b.generatedAt || "") || 0;
    return rhs - lhs;
  });

  return manifests;
}

async function appendRemoteNote({ message, ip }) {
  await fsp.mkdir(INBOX_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${stamp}.md`;
  const filePath = path.join(INBOX_DIR, fileName);
  const body = [
    `# Remote Request`,
    "",
    `- Time: ${timestamp()}`,
    `- Source IP: ${ip}`,
    "",
    "## Message",
    "",
    String(message || "").trim(),
    "",
  ].join("\n");
  await fsp.writeFile(filePath, body, "utf8");
  return {
    fileName,
    filePath: path.relative(ROOT, filePath).replace(/\\/g, "/"),
  };
}

function extractRemoteNoteMessage(raw) {
  const marker = "## Message";
  const markerIndex = raw.indexOf(marker);
  if (markerIndex < 0) {
    return raw.trim();
  }
  return raw.slice(markerIndex + marker.length).trim();
}

async function readLatestMarkdownFile(directory) {
  let entries = [];
  try {
    entries = await fsp.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }

  const files = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .map((entry) => entry.name)
    .sort((a, b) => b.localeCompare(a));

  if (files.length === 0) {
    return null;
  }

  const fileName = files[0];
  const filePath = path.join(directory, fileName);
  const raw = await fsp.readFile(filePath, "utf8");
  const rawTrimmed = raw.trim();
  const maxLen = 20_000;
  const content = rawTrimmed.length > maxLen ? `${rawTrimmed.slice(0, maxLen)}\n...[truncated]` : rawTrimmed;

  return {
    fileName,
    filePath,
    filePathRelative: path.relative(ROOT, filePath).replace(/\\/g, "/"),
    rawTrimmed,
    content,
    contentTruncated: rawTrimmed.length > maxLen,
    noteTimestamp: fileName.replace(".md", ""),
  };
}

async function readLatestRemoteNote() {
  const latest = await readLatestMarkdownFile(INBOX_DIR);
  if (!latest) {
    return null;
  }

  return {
    fileName: latest.fileName,
    filePath: latest.filePathRelative,
    message: extractRemoteNoteMessage(latest.rawTrimmed),
    content: latest.content,
    contentTruncated: latest.contentTruncated,
    noteTimestamp: latest.noteTimestamp,
  };
}

function buildAgentReplyMarkdown({ message, inReplyTo = "" }) {
  return [
    "# Codex Response",
    "",
    `- Time: ${timestamp()}`,
    `- InReplyTo: ${inReplyTo || "(none)"}`,
    "",
    "## Message",
    "",
    String(message || "").trim(),
    "",
  ].join("\n");
}

async function appendAgentReply({ message, inReplyTo = "" }) {
  await fsp.mkdir(OUTBOX_DIR, { recursive: true });
  const stamp = timestamp().replace(/[:.]/g, "-");
  const fileName = `${stamp}.md`;
  const filePath = path.join(OUTBOX_DIR, fileName);
  const body = buildAgentReplyMarkdown({ message, inReplyTo });
  await fsp.writeFile(filePath, body, "utf8");
  return {
    fileName,
    filePath: path.relative(ROOT, filePath).replace(/\\/g, "/"),
  };
}

async function readLatestAgentReply() {
  const latest = await readLatestMarkdownFile(OUTBOX_DIR);
  if (!latest) {
    return null;
  }

  return {
    fileName: latest.fileName,
    filePath: latest.filePathRelative,
    message: extractRemoteNoteMessage(latest.rawTrimmed),
    content: latest.content,
    contentTruncated: latest.contentTruncated,
    noteTimestamp: latest.noteTimestamp,
  };
}

async function readAgentStatus() {
  try {
    const raw = await fsp.readFile(AGENT_STATUS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      state: normalizeAgentState(parsed.state),
      message: String(parsed.message || ""),
      updatedAt: String(parsed.updatedAt || ""),
      source: String(parsed.source || "unknown"),
    };
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {
        state: "idle",
        message: "No active Codex task.",
        updatedAt: "",
        source: "panel-default",
      };
    }
    throw error;
  }
}

async function writeAgentStatus({ state, message, source = "panel" }) {
  const payload = {
    state: normalizeAgentState(state),
    message: String(message || "").slice(0, 5000),
    updatedAt: timestamp(),
    source: String(source || "panel"),
  };
  await fsp.mkdir(path.dirname(AGENT_STATUS_FILE), { recursive: true });
  await fsp.writeFile(AGENT_STATUS_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
}

async function readRelaySnapshot() {
  const [status, latestInbox, latestReply] = await Promise.all([
    readAgentStatus(),
    readLatestRemoteNote(),
    readLatestAgentReply(),
  ]);

  return {
    status,
    latestInbox,
    latestReply,
  };
}

async function appendActivityEvent({
  type = "event",
  state = "",
  message = "",
  source = "panel",
  meta = {},
}) {
  const payload = {
    time: timestamp(),
    type: String(type || "event").slice(0, 80),
    state: state ? normalizeAgentState(state) : "",
    message: String(message || "").slice(0, 2000),
    source: String(source || "panel").slice(0, 120),
    meta: meta && typeof meta === "object" ? meta : {},
  };
  await fsp.mkdir(path.dirname(ACTIVITY_LOG_FILE), { recursive: true });
  await fsp.appendFile(ACTIVITY_LOG_FILE, `${JSON.stringify(payload)}\n`, "utf8");
  broadcastActivityUpdate(payload).catch(() => null);
  return payload;
}

async function readActivityEvents(limit = 160) {
  let raw = "";
  try {
    raw = await fsp.readFile(ACTIVITY_LOG_FILE, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-Math.max(1, Math.min(800, limit)));
  const events = [];
  for (const line of lines) {
    let parsed = null;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    if (!parsed || typeof parsed !== "object") {
      continue;
    }
    events.push({
      time: String(parsed.time || ""),
      type: String(parsed.type || "event"),
      state: String(parsed.state || ""),
      message: String(parsed.message || ""),
      source: String(parsed.source || ""),
      meta: parsed.meta && typeof parsed.meta === "object" ? parsed.meta : {},
    });
  }
  return events;
}

async function readChatMessagesFromDirectory({ directory, role, limit = CHAT_MAX_MESSAGES }) {
  let entries = [];
  try {
    entries = await fsp.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const fileNames = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))
    .slice(-limit);

  const messages = await Promise.all(
    fileNames.map(async (fileName) => {
      const filePath = path.join(directory, fileName);
      const raw = await fsp.readFile(filePath, "utf8");
      const text = extractRemoteNoteMessage(raw.trim());
      return {
        id: `${role}:${fileName}`,
        role,
        text: String(text || ""),
        noteTimestamp: fileName.replace(".md", ""),
        filePath: path.relative(ROOT, filePath).replace(/\\/g, "/"),
      };
    })
  );

  return messages.filter((message) => message.text);
}

async function readChatHistory(limit = CHAT_MAX_MESSAGES) {
  const [inboxMessages, outboxMessages] = await Promise.all([
    readChatMessagesFromDirectory({
      directory: INBOX_DIR,
      role: "user",
      limit,
    }),
    readChatMessagesFromDirectory({
      directory: OUTBOX_DIR,
      role: "assistant",
      limit,
    }),
  ]);

  const merged = [...inboxMessages, ...outboxMessages];
  merged.sort((left, right) => {
    const byTime = left.noteTimestamp.localeCompare(right.noteTimestamp);
    if (byTime !== 0) return byTime;
    return left.id.localeCompare(right.id);
  });
  return merged.slice(-limit);
}

function estimateTokenCountFromText(text) {
  const content = String(text || "").trim();
  if (!content) {
    return 0;
  }
  return Math.max(1, Math.ceil(content.length / 4));
}

function buildChatUsageSummary(history) {
  let promptTokens = 0;
  let completionTokens = 0;
  for (const message of history || []) {
    const tokens = estimateTokenCountFromText(message?.text || "");
    if (message?.role === "assistant") {
      completionTokens += tokens;
    } else {
      promptTokens += tokens;
    }
  }
  return {
    estimated: true,
    basis: "chars_div_4",
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    messageCount: Array.isArray(history) ? history.length : 0,
  };
}

function buildChatSignature(snapshot) {
  const lastMessage = snapshot.history[snapshot.history.length - 1];
  return JSON.stringify({
    statusState: snapshot.status?.state || "idle",
    statusUpdatedAt: snapshot.status?.updatedAt || "",
    historyCount: snapshot.history.length,
    lastMessageId: lastMessage?.id || "",
    usageTotalTokens: Number.parseInt(String(snapshot?.usage?.totalTokens || 0), 10) || 0,
  });
}

async function buildChatSnapshot(limit = CHAT_MAX_MESSAGES) {
  const [status, history] = await Promise.all([readAgentStatus(), readChatHistory(limit)]);
  const usage = buildChatUsageSummary(history);
  return { status, history, usage };
}

function wsSend(ws, payload) {
  if (!ws || ws.readyState !== 1) {
    return;
  }
  ws.send(JSON.stringify(payload));
}

async function broadcastActivityUpdate(event) {
  if (state.wsClients.size === 0 || !event) {
    return;
  }
  let status = null;
  try {
    status = await readAgentStatus();
  } catch {
    status = null;
  }
  const payload = {
    type: "activity:event",
    event,
    status,
  };
  for (const ws of state.wsClients) {
    wsSend(ws, payload);
  }
}

async function broadcastChatSnapshot(reason = "update", options = {}) {
  if (state.wsClients.size === 0) {
    return;
  }

  const snapshot = await buildChatSnapshot();
  const signature = buildChatSignature(snapshot);
  const force = Boolean(options.force);
  if (!force && signature === state.lastChatSignature) {
    return;
  }

  state.lastChatSignature = signature;
  const payload = {
    type: "chat:update",
    reason,
    ...snapshot,
  };
  for (const ws of state.wsClients) {
    wsSend(ws, payload);
  }
}

async function handlePreviewProxy(req, res, pathname, search) {
  const match = pathname.match(/^\/preview\/([^/]+)(\/.*)?$/);
  if (!match) {
    notFound(res);
    return;
  }

  const manifestId = decodeURIComponent(match[1]);
  if (!SAFE_MANIFEST_ID.test(manifestId)) {
    badRequest(res, "Invalid preview id");
    return;
  }

  const manifest = await readManifestFile(manifestId);
  if (!manifest) {
    notFound(res);
    return;
  }

  const host = String(manifest.host || "127.0.0.1");
  const port = Number.parseInt(String(manifest.port || ""), 10);

  if (!LOCAL_PREVIEW_HOSTS.has(host)) {
    forbidden(res, "Preview proxy only supports local dev hosts.");
    return;
  }
  if (!Number.isFinite(port)) {
    badRequest(res, "Preview target port is invalid.");
    return;
  }

  const forwardPath = match[2] || "/";
  const pathWithQuery = `${forwardPath}${search || ""}`;
  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;
  delete headers["accept-encoding"];

  const proxyReq = http.request(
    {
      host,
      port,
      method: req.method,
      path: pathWithQuery,
      headers,
    },
    (proxyRes) => {
      const proxiedHeaders = { ...proxyRes.headers };
      if (proxiedHeaders.location) {
        try {
          const location = new URL(String(proxiedHeaders.location), `http://${host}:${port}`);
          if (location.hostname === host && Number(location.port || "80") === port) {
            proxiedHeaders.location = withBasePath(
              `/preview/${encodeURIComponent(manifestId)}${location.pathname}${location.search}`
            );
          }
        } catch {
          // ignore malformed location header rewrite
        }
      }

      res.writeHead(proxyRes.statusCode || 502, proxiedHeaders);
      proxyRes.pipe(res);
    }
  );

  proxyReq.setTimeout(8000, () => {
    proxyReq.destroy(new Error("Preview upstream timed out."));
  });

  proxyReq.on("error", (error) => {
    if (res.headersSent) {
      return;
    }
    const message = String(error?.message || "Preview connection failed.");
    if (message.toLowerCase().includes("timed out")) {
      json(res, 504, {
        ok: false,
        error: message,
      });
      return;
    }
    badRequest(res, `Preview connection failed: ${message}`);
  });

  if (["GET", "HEAD"].includes(req.method || "GET")) {
    proxyReq.end();
    return;
  }

  req.pipe(proxyReq);
}

async function serveStatic(req, res, pathname) {
  let resolvedPath = pathname;
  if (resolvedPath === "/") {
    resolvedPath = "/index.html";
  }

  if (resolvedPath.includes("..")) {
    badRequest(res, "Invalid path");
    return;
  }

  const bundledAssetPath = resolveFirstExistingFile(XTERM_ASSET_CANDIDATES[resolvedPath] || []);
  if (bundledAssetPath) {
    const ext = path.extname(bundledAssetPath).toLowerCase();
    const contentType = ext === ".css" ? "text/css; charset=utf-8" : "application/javascript; charset=utf-8";
    setSecurityHeaders(res);
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    });
    fs.createReadStream(bundledAssetPath).pipe(res);
    return;
  }
  if (Object.prototype.hasOwnProperty.call(XTERM_ASSET_CANDIDATES, resolvedPath)) {
    notFound(res);
    return;
  }
  const domTermAssetPath = resolveDomTermAsset(resolvedPath);
  if (domTermAssetPath) {
    const ext = path.extname(domTermAssetPath).toLowerCase();
    const contentType = {
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".mjs": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".ico": "image/x-icon",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
      ".ttf": "font/ttf",
      ".eot": "application/vnd.ms-fontobject",
      ".txt": "text/plain; charset=utf-8",
      ".map": "application/json; charset=utf-8",
      ".patch": "text/plain; charset=utf-8",
    }[ext] || "application/octet-stream";
    setSecurityHeaders(res);
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    });
    fs.createReadStream(domTermAssetPath).pipe(res);
    return;
  }
  if (resolvedPath.startsWith("/vendor/domterm/")) {
    notFound(res);
    return;
  }

  const fsPath = path.join(PUBLIC_DIR, resolvedPath);
  if (!fsPath.startsWith(PUBLIC_DIR)) {
    forbidden(res);
    return;
  }

  const fallbackPath = path.join(PUBLIC_DIR, "index.html");
  let targetPath = fsPath;
  try {
    const stat = await fsp.stat(targetPath);
    if (!stat.isFile()) {
      targetPath = fallbackPath;
    }
  } catch {
    targetPath = fallbackPath;
  }

  const ext = path.extname(targetPath).toLowerCase();
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".eot": "application/vnd.ms-fontobject",
  };

  setSecurityHeaders(res);
  if (ext === ".html") {
    const html = await fsp.readFile(targetPath, "utf8");
    const rendered = html.replace(/__REMOTE_PANEL_BASE_PATH__/g, settings.basePath || "");
    res.writeHead(200, {
      "Content-Type": types[ext],
      "Cache-Control": "no-store",
    });
    res.end(rendered);
    return;
  }
  res.writeHead(200, {
    "Content-Type": types[ext] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  fs.createReadStream(targetPath).pipe(res);
}

function ensureMutationCsrf(req, session) {
  const method = String(req.method || "GET").toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return true;
  }
  const token = String(req.headers["x-csrf-token"] || "");
  return token && token === session.csrfToken;
}

function checkLoginRateLimit(ip) {
  const now = Date.now();
  const attempts = state.loginAttempts.get(ip) || [];
  const validAttempts = attempts.filter((stamp) => now - stamp < LOGIN_WINDOW_MS);
  state.loginAttempts.set(ip, validAttempts);
  return validAttempts.length < MAX_LOGIN_ATTEMPTS;
}

function registerFailedLogin(ip) {
  const now = Date.now();
  const attempts = state.loginAttempts.get(ip) || [];
  attempts.push(now);
  state.loginAttempts.set(ip, attempts);
}

async function handleApi(req, res, pathname, ip) {
  if (pathname === "/api/health" && req.method === "GET") {
    json(res, 200, {
      ok: true,
      now: timestamp(),
      panelBootToken: PANEL_BOOT_TOKEN,
      panelStartedAt: PANEL_BOOT_ISO,
      panel: {
        host: settings.host,
        port: settings.port,
        requireHttps: settings.securityMode === "on",
        securityMode: settings.securityMode,
        effectiveSecurityMode: effectiveSecurityModeForIp(ip),
      },
      activeEnvironment: state.activeEnvironment,
      activeDev: publicDevState(),
      activeRelay: publicRelayState(),
      activeRelays: publicRelayStates(),
      activeTunnel: publicTunnelState(),
      commandRunning: state.commandRunning,
    });
    return;
  }

  if (pathname === "/api/auth/login" && req.method === "POST") {
    if (!checkLoginRateLimit(ip)) {
      forbidden(res, "Too many login attempts. Try again later.");
      return;
    }

    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      badRequest(res, error.message);
      return;
    }

    const submitted = String(body.password || "");
    const a = Buffer.from(submitted);
    const b = Buffer.from(settings.password);
    const isValid = a.length === b.length && crypto.timingSafeEqual(a, b);

    if (!isValid) {
      registerFailedLogin(ip);
      unauthorized(res, "Invalid credentials");
      return;
    }

    const session = createSession(ip);
    await persistSessionStore().catch(() => null);
    setSessionCookie(res, session.id, shouldUseSecureCookie(req, ip));
    json(res, 200, {
      ok: true,
      csrfToken: session.csrfToken,
      expiresAt: new Date(session.expiresAt).toISOString(),
    });
    return;
  }

  const session = getSession(req, ip);
  if (!session) {
    unauthorized(res);
    return;
  }
  const terminalSessionId = resolveTerminalSessionId(session.id);

  if (!ensureMutationCsrf(req, session)) {
    forbidden(res, "Missing or invalid CSRF token.");
    return;
  }

  if (pathname === "/api/auth/logout" && req.method === "POST") {
    deleteSessionById(session.id);
    await persistSessionStore().catch(() => null);
    clearSessionCookie(res, shouldUseSecureCookie(req, ip));
    json(res, 200, { ok: true });
    return;
  }

  if (pathname === "/api/session" && req.method === "GET") {
    json(res, 200, {
      ok: true,
      panelBootToken: PANEL_BOOT_TOKEN,
      panelStartedAt: PANEL_BOOT_ISO,
      csrfToken: session.csrfToken,
      expiresAt: new Date(session.expiresAt).toISOString(),
      activeEnvironment: state.activeEnvironment,
      commandRunning: state.commandRunning,
      activeDev: publicDevState(),
      activeRelay: publicRelayState(),
      activeRelays: publicRelayStates(),
      activeTunnel: publicTunnelState(),
      previewRefreshMs: settings.previewRefreshMs,
      bindSessionIp: settings.bindSessionIp,
      securityMode: settings.securityMode,
      tunnelMode: parseTunnelMode(settings.tunnelMode, "quick"),
      effectiveSecurityMode: effectiveSecurityModeForIp(ip),
      persistSessions: settings.persistSessions,
      sharedTerminal: settings.sharedTerminal,
    });
    return;
  }

  if (pathname === "/api/env/status" && req.method === "GET") {
    try {
      const status = await buildEnvironmentStatus();
      json(res, 200, status);
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to read environment status.",
      });
    }
    return;
  }

  if (pathname === "/api/env/up" && req.method === "POST") {
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch (error) {
      badRequest(res, error.message);
      return;
    }

    const context = normalizeEnvironmentContext(body.context, "commander");
    const project = String(body.project || "").trim();
    const prep = normalizeEnvironmentPrep(body.prep, "quick");
    const devMode = normalizeEnvironmentDevMode(body.devMode ?? body.dev, context === "system" ? "off" : "project");
    const panelMode = normalizeEnvironmentPanelMode(body.panelMode ?? body.panel, context === "commander" ? "remote" : "local");
    const remoteMode = normalizeEnvironmentRemoteMode(body.remoteMode ?? body.remote, context === "commander" ? "named" : "off");
    const relayEnabled = parseBool(body.relayEnabled ?? body.relay, context === "commander");
    const sessionName = normalizeEnvironmentName(body.sessionName || "codex-chat", "codex-chat");
    const publicHost = String(body.publicHost || "").trim();
    const devPort = String(body.devPort || "").trim();
    const environmentProfileName = String(body.environmentProfileName || body.envProfile || body.profileName || "").trim();
    const dryRun = parseBool(body.dryRun, false);

    if (!validateProjectRef(project)) {
      badRequest(res, "Invalid project value.");
      return;
    }
    if (!validateSessionName(sessionName)) {
      badRequest(res, "Invalid session name.");
      return;
    }
    if (!validatePort(devPort)) {
      badRequest(res, "Port must be between 1024 and 65535.");
      return;
    }

    try {
      const plan = buildEnvironmentLaunchPlan({
        context,
        project,
        prep,
        devMode,
        panelMode,
        remoteMode,
        relayEnabled,
        sessionName,
        publicHost,
        devPort,
        environmentProfileName,
      });
      if (dryRun) {
        json(res, 200, {
          ok: true,
          dryRun: true,
          ...plan,
          help: buildConnectionHelpPayload(),
        });
        return;
      }
      const launched = await launchEnvironment({
        context,
        project,
        prep,
        devMode,
        panelMode,
        remoteMode,
        relayEnabled,
        sessionName,
        publicHost,
        devPort,
        environmentProfileName,
      });
      pushLog("environment", `Environment up -> ${launched.environment?.summary || summarizeEnvironmentRequest({ context, project, prep, panelMode, devMode, relayEnabled, remoteMode })}`);
      await appendActivityEvent({
        type: "environment_up",
        state: "working",
        message: `Environment ready (${context})${project ? ` for ${project}` : ""}`,
        source: "panel-environment",
        meta: {
          context,
          project,
          prep,
          panelMode,
          devMode,
          remoteMode,
          relayEnabled,
          sessionName,
        },
      }).catch(() => null);
      json(res, 200, {
        ok: true,
        ...launched,
      });
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to start environment.",
      });
    }
    return;
  }

  if (pathname === "/api/env/down" && req.method === "POST") {
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch (error) {
      badRequest(res, error.message);
      return;
    }

    const stopPanel = parseBool(body.stopPanel, false);
    try {
      const stopped = await stopEnvironment({
        stopPanel,
      });
      pushLog("environment", `Environment down${stopPanel ? " (panel shutdown requested)" : ""}`);
      await appendActivityEvent({
        type: "environment_down",
        state: "idle",
        message: stopPanel ? "Environment shutdown requested." : "Environment services stopped.",
        source: "panel-environment",
        meta: {
          stopPanel,
        },
      }).catch(() => null);
      json(res, 200, {
        ok: true,
        ...stopped,
      });
      if (stopPanel) {
        setTimeout(() => {
          shutdown().catch(() => null);
        }, 100);
      }
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to stop environment.",
      });
    }
    return;
  }

  if (pathname === "/api/env/profiles" && req.method === "GET") {
    try {
      const profiles = await readEnvProfiles();
      json(res, 200, {
        ok: true,
        profiles,
      });
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to read environment profiles.",
      });
    }
    return;
  }

  if (pathname === "/api/env/profiles/upsert" && req.method === "POST") {
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch (error) {
      badRequest(res, error.message);
      return;
    }

    try {
      const profiles = await upsertEnvProfile(body);
      json(res, 200, {
        ok: true,
        profiles,
      });
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to save environment profile.",
      });
    }
    return;
  }

  if (pathname === "/api/env/profiles/default" && req.method === "POST") {
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch (error) {
      badRequest(res, error.message);
      return;
    }

    try {
      const profiles = await setDefaultEnvProfile(body.context, body.name);
      json(res, 200, {
        ok: true,
        profiles,
      });
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to set default environment profile.",
      });
    }
    return;
  }

  if (pathname === "/api/env/profiles/retire" && req.method === "POST") {
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch (error) {
      badRequest(res, error.message);
      return;
    }

    try {
      const profiles = await retireEnvProfile(body.name);
      json(res, 200, {
        ok: true,
        profiles,
      });
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to retire environment profile.",
      });
    }
    return;
  }

  if (pathname === "/api/runs" && req.method === "GET") {
    try {
      const runs = await readLaunchRuns();
      json(res, 200, {
        ok: true,
        runs: runs.runs,
      });
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to read launch runs.",
      });
    }
    return;
  }

  if (pathname === "/api/runs/relaunch" && req.method === "POST") {
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch (error) {
      badRequest(res, error.message);
      return;
    }

    const runId = String(body.runId || body.id || "").trim();
    const dryRun = parseBool(body.dryRun, false);
    if (!runId) {
      badRequest(res, "Run id is required.");
      return;
    }

    try {
      const run = await getLaunchRunById(runId);
      if (!run) {
        json(res, 404, { ok: false, error: "Launch run not found." });
        return;
      }
      if (run.kind === "environment") {
        if (dryRun) {
          const plan = buildEnvironmentLaunchPlan(run.request || run);
          json(res, 200, {
            ok: true,
            dryRun: true,
            run,
            ...plan,
            help: buildConnectionHelpPayload(),
          });
          return;
        }
        const launched = await launchEnvironment(run.request || run);
        json(res, 200, {
          ok: true,
          relaunched: true,
          run,
          ...launched,
        });
        return;
      }
      if (run.kind === "agent-spawn") {
        const relaunched = await spawnSuperAgentFromRequest(run.request || run, {
          dryRun,
        });
        json(res, relaunched.ok ? 200 : 500, {
          ...relaunched,
          run,
        });
        return;
      }
      if (run.kind === "session-create") {
        const recreated = await createCodexSessionFromRequest(run.request || run, {
          dryRun,
        });
        json(res, recreated.ok ? 200 : 500, {
          ...recreated,
          run,
        });
        return;
      }
      json(res, 409, {
        ok: false,
        error: `Unsupported run kind '${run.kind || "unknown"}'.`,
      });
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to relaunch run.",
      });
    }
    return;
  }

  if (pathname === "/api/agents/profiles" && req.method === "GET") {
    try {
      const snapshot = await readAgentProfilesSnapshot();
      json(res, 200, {
        ok: true,
        ...snapshot,
      });
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to read agent profiles.",
      });
    }
    return;
  }

  if (pathname === "/api/agents/profiles/upsert" && req.method === "POST") {
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch (error) {
      badRequest(res, error.message);
      return;
    }

    try {
      const registry = await upsertAgentProfile(body);
      json(res, 200, {
        ok: true,
        registry,
        profiles: listAgentProfiles(registry, { includeRetired: true }),
        resolvedDefault: resolveAgentProfile(registry, {}) || null,
      });
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to save agent profile.",
      });
    }
    return;
  }

  if (pathname === "/api/agents/profiles/default" && req.method === "POST") {
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch (error) {
      badRequest(res, error.message);
      return;
    }

    try {
      const registry = await setDefaultAgentProfile(body);
      json(res, 200, {
        ok: true,
        registry,
        profiles: listAgentProfiles(registry, { includeRetired: true }),
        resolvedDefault: resolveAgentProfile(registry, {}) || null,
      });
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to set default agent profile.",
      });
    }
    return;
  }

  if (pathname === "/api/agents/profiles/retire" && req.method === "POST") {
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch (error) {
      badRequest(res, error.message);
      return;
    }

    try {
      const registry = await retireAgentProfile(body.name);
      json(res, 200, {
        ok: true,
        registry,
        profiles: listAgentProfiles(registry, { includeRetired: true }),
        resolvedDefault: resolveAgentProfile(registry, {}) || null,
      });
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to retire agent profile.",
      });
    }
    return;
  }

  if (pathname === "/api/terminal/start" && req.method === "POST") {
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch (error) {
      badRequest(res, error.message);
      return;
    }

    try {
      const result = await startTerminalForSession(terminalSessionId, {
        cols: body.cols,
        rows: body.rows,
        clearHistory: body.clearHistory,
      });
      json(res, 200, {
        ok: true,
        started: result.started,
        terminal: terminalStatusForResponse(result.terminal),
      });
    } catch (error) {
      json(res, isNodePtyUnavailableError(error) ? 501 : 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to start terminal.",
      });
    }
    return;
  }

  if (pathname === "/api/terminal/status" && req.method === "GET") {
    const terminal = state.terminalSessions.get(terminalSessionId) || null;
    json(res, 200, {
      ok: true,
      terminal: terminalStatusForResponse(terminal),
    });
    return;
  }

  if (pathname === "/api/terminal/history" && req.method === "GET") {
    const terminal = state.terminalSessions.get(terminalSessionId) || null;
    const requestUrl = new URL(req.url || "/api/terminal/history", "http://localhost");
    const since = parseTerminalSequence(requestUrl.searchParams.get("since"), 0);
    json(res, 200, {
      ok: true,
      terminal: terminalStatusForResponse(terminal),
      history: terminalHistoryForResponse(terminal, { since }),
    });
    return;
  }

  if (pathname === "/api/terminal/interrupt" && req.method === "POST") {
    try {
      const interrupted = interruptTerminalForSession(terminalSessionId);
      json(res, 200, {
        ok: true,
        interrupted,
        terminal: terminalStatusForResponse(state.terminalSessions.get(terminalSessionId) || null),
      });
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to interrupt terminal.",
      });
    }
    return;
  }

  if (pathname === "/api/terminal/stop" && req.method === "POST") {
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch (error) {
      badRequest(res, error.message);
      return;
    }

    const terminal = state.terminalSessions.get(terminalSessionId) || null;
    const stopped = stopTerminalForSession(terminalSessionId);
    if (terminal && parseBool(body.clearHistory, false)) {
      clearTerminalHistory(terminal);
    }
    json(res, 200, {
      ok: true,
      stopped,
      terminal: terminalStatusForResponse(state.terminalSessions.get(terminalSessionId) || terminal || null),
    });
    return;
  }

  if (pathname === "/api/connection/help" && req.method === "GET") {
    json(res, 200, {
      ok: true,
      ...buildConnectionHelpPayload(),
    });
    return;
  }

  if (pathname === "/api/security/mode" && req.method === "POST") {
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch (error) {
      badRequest(res, error.message);
      return;
    }

    const mode = parseSecurityMode(body.mode, "");
    if (!mode) {
      badRequest(res, "Mode must be one of: on, off, auto.");
      return;
    }

    const hasPublicHost = Object.prototype.hasOwnProperty.call(body, "publicHost");
    const nextPublicHost = hasPublicHost ? normalizePublicHost(body.publicHost) : settings.publicHost;
    settings.securityMode = mode;
    settings.publicHost = nextPublicHost;

    try {
      await persistRuntimeConfig();
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to persist runtime security config.",
      });
      return;
    }

    pushLog("system", `Security mode updated to ${mode}${nextPublicHost ? ` publicHost=${nextPublicHost}` : ""}`);
    await appendActivityEvent({
      type: "security_mode",
      state: "working",
      message: `Security mode set to ${mode}`,
      source: "panel-security",
      meta: {
        mode,
        publicHost: nextPublicHost || "",
        byIp: ip,
      },
    }).catch(() => null);

    json(res, 200, {
      ok: true,
      mode,
      publicHost: nextPublicHost || "",
      help: buildConnectionHelpPayload(),
    });
    return;
  }

  if (pathname === "/api/projects" && req.method === "GET") {
    const projectData = await discoverProjects();
    json(res, 200, {
      ok: true,
      activeProject: projectData.activeProject,
      projects: projectData.projects,
    });
    return;
  }

  if (pathname === "/api/codex/sessions" && req.method === "GET") {
    try {
      const registry = await readCodexRegistrySafe();
      const resolved = resolveCodexSessionTarget(registry, {});
      json(res, 200, {
        ok: true,
        registry,
        sessions: listCodexSessions(registry, { includeRetired: true }),
        resolvedDefault: resolved,
      });
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to read Codex session registry.",
      });
    }
    return;
  }

  if (pathname === "/api/manifests" && req.method === "GET") {
    const manifests = await listManifests();
    json(res, 200, {
      ok: true,
      manifests,
    });
    return;
  }

  if (pathname === "/api/logs" && req.method === "GET") {
    json(res, 200, {
      ok: true,
      logs: state.logs,
    });
    return;
  }

  if (pathname === "/api/inbox/latest" && req.method === "GET") {
    try {
      const note = await readLatestRemoteNote();
      json(res, 200, {
        ok: true,
        note,
      });
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to read inbox note.",
      });
    }
    return;
  }

  if (pathname === "/api/agent/reply/latest" && req.method === "GET") {
    try {
      const reply = await readLatestAgentReply();
      json(res, 200, {
        ok: true,
        reply,
      });
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to read outbox reply.",
      });
    }
    return;
  }

  if (pathname === "/api/agent/status" && req.method === "GET") {
    try {
      const status = await readAgentStatus();
      json(res, 200, {
        ok: true,
        status,
      });
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to read agent status.",
      });
    }
    return;
  }

  if (pathname === "/api/agent/poller" && req.method === "GET") {
    try {
      const snapshot = await readRelaySnapshot();
      json(res, 200, {
        ok: true,
        ...snapshot,
      });
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to read relay snapshot.",
      });
    }
    return;
  }

  if (pathname === "/api/agent/activity" && req.method === "GET") {
    try {
      const [status, events] = await Promise.all([readAgentStatus(), readActivityEvents(180)]);
      json(res, 200, {
        ok: true,
        status,
        events,
      });
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to read activity feed.",
      });
    }
    return;
  }

  if (pathname === "/api/chat/history" && req.method === "GET") {
    try {
      const snapshot = await buildChatSnapshot();
      json(res, 200, {
        ok: true,
        ...snapshot,
      });
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load chat history.",
      });
    }
    return;
  }

  if (pathname === "/api/events" && req.method === "GET") {
    setSecurityHeaders(res);
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    });
    res.write(
      `event: state\ndata: ${JSON.stringify({
        activeEnvironment: state.activeEnvironment,
        commandRunning: state.commandRunning,
        activeDev: publicDevState(),
        activeRelay: publicRelayState(),
        activeRelays: publicRelayStates(),
        activeTunnel: publicTunnelState(),
      })}\n\n`
    );

    state.sseClients.add(res);
    req.on("close", () => {
      state.sseClients.delete(res);
    });
    return;
  }

  if (pathname === "/api/command/scaffold" && req.method === "POST") {
    try {
      const result = await runOneShot({
        source: "scaffold",
        script: "scaffold",
      });
      json(res, result.ok ? 200 : 500, { ok: result.ok, result });
    } catch (error) {
      json(res, 409, { ok: false, error: error.message });
    }
    return;
  }

  if (pathname === "/api/command/build" && req.method === "POST") {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      badRequest(res, error.message);
      return;
    }

    const project = String(body.project || "").trim();
    if (!validateProjectRef(project)) {
      badRequest(res, "Invalid project value");
      return;
    }

    const args = project ? [`--project=${project}`] : [];

    try {
      const result = await runOneShot({
        source: "build",
        script: "build",
        args,
      });
      json(res, result.ok ? 200 : 500, { ok: result.ok, result });
    } catch (error) {
      json(res, 409, { ok: false, error: error.message });
    }
    return;
  }

  if (pathname === "/api/command/build-all" && req.method === "POST") {
    try {
      const result = await runOneShot({
        source: "build-all",
        script: "build:all",
      });
      json(res, result.ok ? 200 : 500, { ok: result.ok, result });
    } catch (error) {
      json(res, 409, { ok: false, error: error.message });
    }
    return;
  }

  if (pathname === "/api/dev/start" && req.method === "POST") {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      badRequest(res, error.message);
      return;
    }

    const mode = String(body.mode || "single").toLowerCase();
    const project = String(body.project || "").trim();
    const port = String(body.port || "").trim();

    if (!["single", "all"].includes(mode)) {
      badRequest(res, "Mode must be 'single' or 'all'.");
      return;
    }
    if (!validateProjectRef(project)) {
      badRequest(res, "Invalid project value");
      return;
    }
    if (!validatePort(port)) {
      badRequest(res, "Port must be between 1024 and 65535.");
      return;
    }

    try {
      const started = await startDevProcess(mode, project, port);
      json(res, 200, { ok: true, activeDev: started });
    } catch (error) {
      json(res, 409, { ok: false, error: error.message });
    }
    return;
  }

  if (pathname === "/api/dev/stop" && req.method === "POST") {
    try {
      const stopped = await stopDevProcess();
      json(res, 200, { ok: true, stopped });
    } catch (error) {
      json(res, 500, { ok: false, error: error.message });
    }
    return;
  }

  if (pathname === "/api/relay/status" && req.method === "GET") {
    json(res, 200, {
      ok: true,
      activeRelay: publicRelayState(),
      activeRelays: publicRelayStates(),
      activeTunnel: publicTunnelState(),
    });
    return;
  }

  if (pathname === "/api/tunnel/status" && req.method === "GET") {
    json(res, 200, {
      ok: true,
      provider: settings.tunnelProvider,
      mode: parseTunnelMode(settings.tunnelMode, "quick"),
      activeTunnel: publicTunnelState(),
      help: buildConnectionHelpPayload(),
    });
    return;
  }

  if (pathname === "/api/tunnel/start" && req.method === "POST") {
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch (error) {
      badRequest(res, error.message);
      return;
    }

    const provider = parseTunnelProvider(body.provider || settings.tunnelProvider || "cloudflared", "cloudflared");
    const modeInput =
      body.mode !== undefined && body.mode !== null && String(body.mode).trim() !== ""
        ? body.mode
        : settings.tunnelMode || "quick";
    const mode = parseTunnelMode(modeInput, "");
    if (!mode) {
      badRequest(res, "Tunnel mode must be one of: quick, token, named.");
      return;
    }
    const tunnelToken = String(body.token || "").trim() || settings.cloudflaredTunnelToken;
    const tunnelName = String(body.tunnelName || body.name || "").trim() || settings.cloudflaredTunnelName;
    const configFile = String(body.configFile || "").trim() || settings.cloudflaredConfig;
    const publicHost = String(body.publicHost || settings.publicHost || "").trim();
    const timeoutMsRaw = Number.parseInt(String(body.timeoutMs ?? ""), 10);
    const timeoutMs = Number.isFinite(timeoutMsRaw) ? Math.max(5000, Math.min(180000, timeoutMsRaw)) : TUNNEL_DISCOVERY_TIMEOUT_MS;

    let targetUrl = "";
    try {
      targetUrl = parseTunnelTargetUrl(body.targetUrl, settings.port);
    } catch (error) {
      badRequest(res, error instanceof Error ? error.message : "Invalid tunnel target URL.");
      return;
    }

    try {
      const activeTunnel = await startTunnelProcess({
        provider,
        mode,
        requestedMode: mode,
        targetUrl,
        tunnelToken,
        tunnelName,
        configFile,
        publicHost,
        timeoutMs,
      });
      await appendActivityEvent({
        type: "tunnel_start",
        state: "working",
        message: `External tunnel started (${provider}, ${mode})`,
        source: "panel-tunnel",
        meta: {
          provider,
          mode,
          targetUrl,
          timeoutMs,
          configFile: configFile ? "provided" : "",
          pid: activeTunnel?.pid || 0,
          url: activeTunnel?.url || "",
          byIp: ip,
        },
      }).catch(() => null);

      json(res, 200, {
        ok: true,
        provider,
        mode,
        activeTunnel,
        help: buildConnectionHelpPayload(),
      });
    } catch (error) {
      json(res, 409, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to start tunnel.",
      });
    }
    return;
  }

  if (pathname === "/api/tunnel/stop" && req.method === "POST") {
    try {
      const previous = publicTunnelState();
      const stopped = await stopTunnelProcess();
      await appendActivityEvent({
        type: "tunnel_stop",
        state: "idle",
        message: stopped ? "External tunnel stop requested." : "External tunnel is not running.",
        source: "panel-tunnel",
        meta: {
          byIp: ip,
          previousUrl: previous?.url || "",
          previousPid: previous?.pid || 0,
        },
      }).catch(() => null);
      json(res, 200, {
        ok: true,
        stopped,
        activeTunnel: publicTunnelState(),
        help: buildConnectionHelpPayload(),
      });
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to stop tunnel.",
      });
    }
    return;
  }

  if (pathname === "/api/relay/start" && req.method === "POST") {
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch (error) {
      badRequest(res, error.message);
      return;
    }

    const sessionName = String(body.sessionName || "codex-chat").trim();
    const project = String(body.project || "").trim();
    const useLast = parseBool(body.useLast, false);
    const dryRun = parseBool(body.dryRun, false);
    const startFromLatest = parseBool(body.startFromLatest, true);

    const pollMsRaw = Number.parseInt(String(body.pollMs ?? ""), 10);
    const historyRaw = Number.parseInt(String(body.history ?? ""), 10);
    const pollMs = Number.isFinite(pollMsRaw) ? Math.max(400, Math.min(60000, pollMsRaw)) : 1200;
    const history = Number.isFinite(historyRaw) ? Math.max(2, Math.min(120, historyRaw)) : 16;

    if (!validateSessionName(sessionName)) {
      badRequest(res, "Invalid session name.");
      return;
    }
    if (!validateProjectRef(project)) {
      badRequest(res, "Invalid project value.");
      return;
    }

    try {
      const startedRelay = await startRelayWatcher({
        sessionName,
        project,
        useLast,
        dryRun,
        startFromLatest,
        pollMs,
        history,
      });
      await appendActivityEvent({
        type: "relay_start",
        state: "working",
        message: `Relay watcher started (${sessionName})${project ? ` for ${project}` : ""}`,
        source: "panel-relay",
        meta: {
          sessionName,
          project,
          useLast,
          dryRun,
          startFromLatest,
          pollMs,
          history,
          pid: startedRelay?.pid || 0,
        },
      }).catch(() => null);
      json(res, 200, {
        ok: true,
        startedRelay,
        activeRelay: publicRelayState(),
        activeRelays: publicRelayStates(),
      });
    } catch (error) {
      json(res, 409, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to start relay watcher.",
      });
    }
    return;
  }

  if (pathname === "/api/relay/stop" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const requestedSessionName = String(body.sessionName || "").trim();
      const stopAll = parseBool(body.all, false);
      const result = await stopRelayWatcher({
        sessionName: requestedSessionName,
        all: stopAll,
      });
      await appendActivityEvent({
        type: "relay_stop",
        state: "idle",
        message: result.stopped
          ? `Relay watcher stop requested${result.requestedSessionName ? ` (${result.requestedSessionName})` : ""}.`
          : "Relay watcher is not running.",
        source: "panel-relay",
        meta: {
          requestedSessionName: result.requestedSessionName || "",
          stoppedCount: result.stoppedCount || 0,
          all: stopAll,
        },
      }).catch(() => null);
      json(res, 200, {
        ok: true,
        stopped: result.stopped,
        stoppedCount: result.stoppedCount,
        requestedSessionName: result.requestedSessionName,
        activeRelay: publicRelayState(),
        activeRelays: publicRelayStates(),
      });
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to stop relay watcher.",
      });
    }
    return;
  }

  if (pathname === "/api/chat/quick" && req.method === "POST") {
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch (error) {
      badRequest(res, error.message);
      return;
    }

    const project = String(body.project || "").trim();
    if (!validateProjectRef(project)) {
      badRequest(res, "Invalid project value");
      return;
    }

    // `chat:new:quick` executes a PowerShell script that expects `-Project <value>`.
    const args = project ? ["-Project", project] : [];

    try {
      const result = await runOneShot({
        source: "chat:new:quick",
        script: "chat:new:quick",
        args,
        timeoutMs: 30 * 60 * 1000,
      });
      json(res, result.ok ? 200 : 500, { ok: result.ok, result });
    } catch (error) {
      json(res, 409, { ok: false, error: error.message });
    }
    return;
  }

  if (pathname === "/api/chat/briefing" && req.method === "POST") {
    try {
      const result = await runOneShot({
        source: "chat:briefing",
        script: "chat:briefing",
      });
      json(res, result.ok ? 200 : 500, { ok: result.ok, result });
    } catch (error) {
      json(res, 409, { ok: false, error: error.message });
    }
    return;
  }

  if (pathname === "/api/codex/sessions/upsert" && req.method === "POST") {
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch (error) {
      badRequest(res, error.message);
      return;
    }

    const name = String(body.name || "").trim();
    const target = String(body.target || "").trim();
    const project = String(body.project || "").trim();
    const notes = String(body.notes || "").trim().slice(0, 5000);
    const makeDefault = Boolean(body.makeDefault);

    if (!validateSessionName(name)) {
      badRequest(res, "Invalid session name.");
      return;
    }
    if (!validateSessionTarget(target)) {
      badRequest(res, "Invalid session target.");
      return;
    }
    if (!validateCodexProjectRef(project)) {
      badRequest(res, "Invalid project value.");
      return;
    }

    try {
      const current = await readCodexRegistrySafe();
      const updated = upsertCodexSession(current, {
        name,
        target,
        project,
        notes,
        source: "panel-upsert",
        makeDefault,
      });
      const persisted = await writeCodexRegistrySafe(updated);
      pushLog("codex-sessions", `Upserted session ${name} -> ${target}`);
      await appendActivityEvent({
        type: "session_upsert",
        state: "working",
        message: `Session saved: ${name}`,
        source: "panel-codex",
        meta: {
          name,
          target,
          project,
        },
      }).catch(() => null);
      json(res, 200, {
        ok: true,
        registry: persisted,
        resolved: resolveCodexSessionTarget(persisted, { name, project }),
      });
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to upsert session.",
      });
    }
    return;
  }

  if (pathname === "/api/codex/sessions/default" && req.method === "POST") {
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch (error) {
      badRequest(res, error.message);
      return;
    }

    const name = String(body.name || "").trim();
    const project = String(body.project || "").trim();
    if (!validateSessionName(name)) {
      badRequest(res, "Invalid session name.");
      return;
    }
    if (!validateCodexProjectRef(project)) {
      badRequest(res, "Invalid project value.");
      return;
    }

    try {
      const current = await readCodexRegistrySafe();
      const updated = setDefaultCodexSession(current, {
        name,
        project,
      });
      const persisted = await writeCodexRegistrySafe(updated);
      pushLog("codex-sessions", `Default ${project ? `for ${project}` : "global"} set to ${name}`);
      await appendActivityEvent({
        type: "session_default",
        state: "working",
        message: `Default session set to ${name}${project ? ` for ${project}` : " (global)"}`,
        source: "panel-codex",
        meta: {
          name,
          project,
        },
      }).catch(() => null);
      json(res, 200, {
        ok: true,
        registry: persisted,
        resolved: resolveCodexSessionTarget(persisted, { project }),
      });
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to set session default.",
      });
    }
    return;
  }

  if (pathname === "/api/codex/sessions/retire" && req.method === "POST") {
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch (error) {
      badRequest(res, error.message);
      return;
    }

    const name = String(body.name || "").trim();
    if (!validateSessionName(name)) {
      badRequest(res, "Invalid session name.");
      return;
    }

    try {
      const current = await readCodexRegistrySafe();
      const updated = retireCodexSession(current, { name });
      const persisted = await writeCodexRegistrySafe(updated);
      pushLog("codex-sessions", `Retired session ${name}`);
      await appendActivityEvent({
        type: "session_retire",
        state: "working",
        message: `Session retired: ${name}`,
        source: "panel-codex",
        meta: { name },
      }).catch(() => null);
      json(res, 200, {
        ok: true,
        registry: persisted,
      });
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to retire session.",
      });
    }
    return;
  }

  if (pathname === "/api/codex/sessions/create" && req.method === "POST") {
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch (error) {
      badRequest(res, error.message);
      return;
    }

    try {
      const result = await createCodexSessionFromRequest(body, {
        dryRun: parseBool(body.dryRun, false),
      });
      json(res, result.ok ? 200 : 500, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create Codex session.";
      const status = /^Invalid\b/i.test(message) ? 400 : 500;
      json(res, status, {
        ok: false,
        error: message,
      });
    }
    return;
  }

  if (pathname === "/api/codex/sessions/prep" && req.method === "POST") {
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch (error) {
      badRequest(res, error.message);
      return;
    }

    const project = String(body.project || "").trim();
    const mode = String(body.mode || "quick").trim().toLowerCase();
    const generateBriefing = body.generateBriefing !== false;
    const runMcpPrep = body.runMcpPrep !== false;

    if (!validateProjectRef(project)) {
      badRequest(res, "Invalid project value.");
      return;
    }
    if (!["quick", "full"].includes(mode)) {
      badRequest(res, "Mode must be 'quick' or 'full'.");
      return;
    }

    const prepScript = mode === "full" ? "chat:new:full" : "chat:new:quick";
    const prepArgs = project ? ["-Project", project] : [];

    try {
      const prep = await runOneShot({
        source: prepScript,
        script: prepScript,
        args: prepArgs,
        timeoutMs: 30 * 60 * 1000,
      });
      if (!prep.ok) {
        json(res, 500, { ok: false, step: "prep", result: prep });
        return;
      }

      let mcpPrep = null;
      if (runMcpPrep) {
        mcpPrep = await runOneShot({
          source: "mcp:prep",
          script: "mcp:prep",
          timeoutMs: 15 * 60 * 1000,
        });
        if (!mcpPrep.ok) {
          json(res, 500, { ok: false, step: "mcp:prep", prep, mcpPrep });
          return;
        }
      }

      let briefing = null;
      if (generateBriefing) {
        briefing = await runOneShot({
          source: "chat:briefing",
          script: "chat:briefing",
          timeoutMs: 10 * 60 * 1000,
        });
        if (!briefing.ok) {
          json(res, 500, { ok: false, step: "chat:briefing", prep, mcpPrep, briefing });
          return;
        }
      }

      const latestSession = await readLatestPreparedChatSession();
      pushLog("codex-sessions", `Prepared context for project=${project || "(auto)"} mode=${mode}`);
      await appendActivityEvent({
        type: "prep_complete",
        state: "working",
        message: `Prep complete (${mode})${project ? ` for ${project}` : ""}`,
        source: "panel-codex",
        meta: {
          project,
          mode,
          sessionFolder: latestSession?.folderPath || "",
        },
      }).catch(() => null);
      json(res, 200, {
        ok: true,
        project,
        mode,
        prep,
        mcpPrep,
        briefing,
        latestSession,
      });
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to prepare Codex context.",
      });
    }
    return;
  }

  if (pathname === "/api/codex/sessions/super-agent/spawn" && req.method === "POST") {
    let body = {};
    try {
      body = await readJsonBody(req);
    } catch (error) {
      badRequest(res, error.message);
      return;
    }

    try {
      const result = await spawnSuperAgentFromRequest(body, {
        dryRun: parseBool(body.dryRun, false),
      });
      json(res, result.ok ? 200 : 500, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to spawn super agent.";
      const status = /^Invalid\b|^Unsupported\b/i.test(message) ? 400 : 500;
      json(res, status, {
        ok: false,
        error: message,
      });
    }
    return;
  }

  if (pathname === "/api/agent/status" && req.method === "POST") {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      badRequest(res, error.message);
      return;
    }

    const nextState = normalizeAgentState(body.state);
    const message = String(body.message || "").trim();
    const source = String(body.source || "panel");
    if (message.length > 5000) {
      badRequest(res, "Status message too long.");
      return;
    }

    try {
      const status = await writeAgentStatus({
        state: nextState,
        message,
        source,
      });
      await appendActivityEvent({
        type: "status",
        state: status.state,
        message: status.message || `Status set to ${status.state}`,
        source: "panel-status",
      }).catch(() => null);
      pushLog("agent", `Status set to ${status.state}`);
      await broadcastChatSnapshot("agent:status", { force: true }).catch(() => null);
      json(res, 200, { ok: true, status });
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to write agent status.",
      });
    }
    return;
  }

  if (pathname === "/api/agent/reply" && req.method === "POST") {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      badRequest(res, error.message);
      return;
    }

    const message = String(body.message || "").trim();
    const inReplyTo = String(body.inReplyTo || "").trim().slice(0, 500);
    const stateAfterReply = normalizeAgentState(body.state || "idle");
    if (!message) {
      badRequest(res, "Reply message is required.");
      return;
    }
    if (message.length > 50_000) {
      badRequest(res, "Reply message too long.");
      return;
    }

    try {
      const reply = await appendAgentReply({
        message,
        inReplyTo,
      });
      const status = await writeAgentStatus({
        state: stateAfterReply,
        message: "Reply published.",
        source: "panel-reply",
      });
      await appendActivityEvent({
        type: "assistant_reply",
        state: status.state,
        message: `Assistant reply stored (${reply.fileName})`,
        source: "panel-reply",
        meta: {
          file: reply.filePath,
          inReplyTo,
        },
      }).catch(() => null);
      pushLog("agent", `Stored assistant reply at ${reply.filePath}`);
      await broadcastChatSnapshot("agent:reply", { force: true }).catch(() => null);
      json(res, 200, { ok: true, reply, status });
    } catch (error) {
      json(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to store assistant reply.",
      });
    }
    return;
  }

  if (pathname === "/api/note" && req.method === "POST") {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      badRequest(res, error.message);
      return;
    }

    const message = String(body.message || "").trim();
    if (!message) {
      badRequest(res, "Message is required.");
      return;
    }
    if (message.length > 5000) {
      badRequest(res, "Message too long.");
      return;
    }

    const note = await appendRemoteNote({
      message,
      ip,
    });
    await writeAgentStatus({
      state: "pending",
      message: `Queued inbox note: ${note.fileName}`,
      source: "panel-note",
    });
    await appendActivityEvent({
      type: "user_message",
      state: "pending",
      message: `Queued user message (${note.fileName})`,
      source: "panel-note",
      meta: {
        file: note.filePath,
      },
    }).catch(() => null);

    pushLog("note", `Stored remote note at ${note.filePath}`);
    await broadcastChatSnapshot("note", { force: true }).catch(() => null);
    json(res, 200, {
      ok: true,
      note,
    });
    return;
  }

  notFound(res);
}

const wsServer = new WebSocketServer({ noServer: true });

wsServer.on("connection", (ws, req, session) => {
  const sessionId = String(session?.id || "").trim();
  if (!sessionId) {
    wsSend(ws, {
      type: "chat:error",
      error: "Missing session.",
    });
    try {
      ws.close(1008, "Missing session");
    } catch {
      // ignore close failures when session is missing
    }
    return;
  }
  state.wsClients.add(ws);
  state.wsSessionBySocket.set(ws, sessionId);
  prepareSocketHeartbeat(ws, sessionId);
  pushLog("chat", "WebSocket client connected.");

  ws.on("message", async (raw) => {
    touchSessionById(sessionId);
    try {
      let payload = null;
      try {
        payload = JSON.parse(String(raw || ""));
      } catch {
        wsSend(ws, {
          type: "chat:error",
          error: "Invalid JSON message.",
        });
        return;
      }

      const messageType = String(payload?.type || "").trim();
      if (messageType === "chat:refresh") {
        const snapshot = await buildChatSnapshot();
        state.lastChatSignature = buildChatSignature(snapshot);
        wsSend(ws, {
          type: "chat:update",
          reason: "manual-refresh",
          ...snapshot,
        });
        return;
      }

      if (messageType === "chat:send") {
        const message = String(payload?.message || "").trim();
        const ip = normalizeIp(req.socket.remoteAddress || "");
        if (!message) {
          wsSend(ws, {
            type: "chat:error",
            error: "Message is required.",
          });
          return;
        }
        if (message.length > 5000) {
          wsSend(ws, {
            type: "chat:error",
            error: "Message too long.",
          });
          return;
        }

        const note = await appendRemoteNote({
          message,
          ip,
        });
        await writeAgentStatus({
          state: "pending",
          message: `Queued inbox note: ${note.fileName}`,
          source: "panel-ws-note",
        });
        await appendActivityEvent({
          type: "user_message",
          state: "pending",
          message: `Queued user message (${note.fileName})`,
          source: "panel-ws",
          meta: {
            file: note.filePath,
          },
        }).catch(() => null);
        pushLog("note", `Stored remote note at ${note.filePath}`);
        wsSend(ws, {
          type: "chat:ack",
          ok: true,
          note,
        });
        await broadcastChatSnapshot("chat:send", { force: true }).catch(() => null);
        return;
      }

      wsSend(ws, {
        type: "chat:error",
        error: `Unsupported message type: ${messageType || "(empty)"}`,
      });
    } catch (error) {
      wsSend(ws, {
        type: "chat:error",
        error: error instanceof Error ? error.message : "WebSocket message handling failed.",
      });
    }
  });

  ws.on("close", () => {
    state.wsClients.delete(ws);
    state.wsSessionBySocket.delete(ws);
  });

  ws.on("error", () => {
    state.wsClients.delete(ws);
    state.wsSessionBySocket.delete(ws);
  });

  buildChatSnapshot()
    .then((snapshot) => {
      state.lastChatSignature = buildChatSignature(snapshot);
      wsSend(ws, {
        type: "chat:init",
        ...snapshot,
      });
    })
    .catch((error) => {
      wsSend(ws, {
        type: "chat:error",
        error: error instanceof Error ? error.message : "Failed to initialize chat.",
      });
    });
});

const terminalWsServer = new WebSocketServer({ noServer: true });

terminalWsServer.on("connection", (ws, _req, session) => {
  const sessionId = String(session?.id || "").trim();
  if (!sessionId) {
    wsSend(ws, {
      type: "terminal:error",
      error: "Missing session.",
    });
    closeTerminalSocket(ws, "Missing session.");
    return;
  }
  const terminalSessionId = resolveTerminalSessionId(sessionId);
  const terminal = attachTerminalSocket(terminalSessionId, ws);
  prepareSocketHeartbeat(ws, sessionId);
  pushLog("terminal", "Terminal WebSocket client connected.");
  wsSend(ws, {
    type: "terminal:init",
    terminal: terminalStatusForResponse(terminal),
  });
  wsSend(ws, {
    type: "terminal:history",
    ...terminalHistoryForResponse(terminal, { since: 0 }),
  });

  ws.on("message", (raw) => {
    touchSessionById(sessionId);
    try {
      let payload = null;
      try {
        payload = JSON.parse(String(raw || ""));
      } catch {
        wsSend(ws, {
          type: "terminal:error",
          error: "Invalid JSON message.",
        });
        return;
      }

      const messageType = String(payload?.type || "").trim();
      if (messageType === "terminal:stdin") {
        writeTerminalInput(terminalSessionId, payload?.data ?? "");
        return;
      }

      if (messageType === "terminal:resize") {
        const nextTerminal = resizeTerminalForSession(terminalSessionId, payload?.cols, payload?.rows);
        broadcastTerminalPayload(nextTerminal, {
          type: "terminal:status",
          terminal: terminalStatusForResponse(nextTerminal),
        });
        return;
      }

      if (messageType === "terminal:interrupt") {
        const interrupted = interruptTerminalForSession(terminalSessionId);
        wsSend(ws, {
          type: "terminal:interrupt",
          interrupted,
        });
        return;
      }

      if (messageType === "terminal:status") {
        wsSend(ws, {
          type: "terminal:status",
          terminal: terminalStatusForResponse(state.terminalSessions.get(terminalSessionId) || null),
        });
        return;
      }

      if (messageType === "terminal:history") {
        const since = parseTerminalSequence(payload?.since, 0);
        wsSend(ws, {
          type: "terminal:history",
          ...terminalHistoryForResponse(state.terminalSessions.get(terminalSessionId) || null, { since }),
        });
        return;
      }

      if (messageType === "terminal:resume") {
        const since = parseTerminalSequence(payload?.since, 0);
        wsSend(ws, {
          type: "terminal:resume",
          ...terminalHistoryForResponse(state.terminalSessions.get(terminalSessionId) || null, { since }),
        });
        return;
      }

      wsSend(ws, {
        type: "terminal:error",
        error: `Unsupported message type: ${messageType || "(empty)"}`,
      });
    } catch (error) {
      wsSend(ws, {
        type: "terminal:error",
        error: error instanceof Error ? error.message : "Terminal message handling failed.",
      });
    }
  });

  ws.on("close", () => {
    detachTerminalSocket(ws);
  });

  ws.on("error", () => {
    detachTerminalSocket(ws);
  });
});

loadSessionStoreSync();
const sessionSweepInterval = setInterval(() => {
  pruneExpiredSessions();
}, SESSION_SWEEP_INTERVAL_MS);
if (typeof sessionSweepInterval.unref === "function") {
  sessionSweepInterval.unref();
}

function logStartupBanner() {
  const externalHint = settings.host === "0.0.0.0" ? "LAN enabled" : "local-only";
  console.log("[remote-panel] -------------------------------------------------");
  console.log(`[remote-panel] Listening on http://${settings.host}:${settings.port} (${externalHint})`);
  console.log(`[remote-panel] Security mode: ${settings.securityMode} (${securityModeLabel(settings.securityMode)})`);
  console.log(`[remote-panel] Tunnel mode default: ${parseTunnelMode(settings.tunnelMode, "quick")}`);
  if (settings.basePath) {
    console.log(`[remote-panel] Base path: ${settings.basePath}`);
  }
  if (settings.publicHost) {
    console.log(`[remote-panel] Public/mobile host hint: ${settings.publicHost}`);
  }
  console.log(
    `[remote-panel] Session persistence: ${settings.persistSessions ? "enabled" : "disabled"} (${path
      .relative(ROOT, settings.sessionStoreFile)
      .replace(/\\/g, "/")})`
  );
  console.log(`[remote-panel] Runtime config: ${path.relative(ROOT, settings.runtimeConfigFile).replace(/\\/g, "/")}`);
  if (process.platform === "win32") {
    console.log(`[remote-panel] Terminal PTY mode: ${TERMINAL_USE_CONPTY ? "conpty" : "winpty"}`);
  }
  if (settings.allowlist.length > 0) {
    console.log(`[remote-panel] IP allowlist: ${settings.allowlist.join(", ")}`);
  }
  console.log("[remote-panel] -------------------------------------------------");
}

const server = http.createServer(async (req, res) => {
  try {
    const ip = normalizeIp(req.socket.remoteAddress || "");

    if (!isIpAllowed(ip)) {
      forbidden(res, "IP not allowed.");
      return;
    }

    if (shouldEnforceHttps(req, ip)) {
      forbidden(res, "HTTPS is required for remote access.");
      return;
    }

    const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const pathname = requestUrl.pathname;
    if (settings.basePath && pathname === settings.basePath) {
      setSecurityHeaders(res);
      res.writeHead(302, {
        Location: `${withBasePath("/")}${requestUrl.search || ""}`,
        "Cache-Control": "no-store",
      });
      res.end();
      return;
    }
    const strippedPathname = stripBasePath(pathname);
    if (strippedPathname === null) {
      notFound(res);
      return;
    }

    if (strippedPathname.startsWith("/api/")) {
      await handleApi(req, res, strippedPathname, ip);
      return;
    }

    if (strippedPathname.startsWith("/preview/")) {
      await handlePreviewProxy(req, res, strippedPathname, requestUrl.search);
      return;
    }

    await serveStatic(req, res, strippedPathname);
  } catch (error) {
    json(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

server.on("upgrade", (req, socket, head) => {
  try {
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const strippedPathname = stripBasePath(requestUrl.pathname);
    const isChatWs = strippedPathname === WS_PATH;
    const isTerminalWs = strippedPathname === TERMINAL_WS_PATH;
    if (!isChatWs && !isTerminalWs) {
      socket.destroy();
      return;
    }

    const ip = normalizeIp(req.socket.remoteAddress || "");
    if (!isIpAllowed(ip)) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    if (shouldEnforceHttps(req, ip)) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    const session = getSession(req, ip);
    if (!session) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    if (isChatWs) {
      wsServer.handleUpgrade(req, socket, head, (ws) => {
        wsServer.emit("connection", ws, req, session);
      });
      return;
    }

    terminalWsServer.handleUpgrade(req, socket, head, (ws) => {
      terminalWsServer.emit("connection", ws, req, session);
    });
  } catch {
    socket.destroy();
  }
});

server.listen(settings.port, settings.host, () => {
  logStartupBanner();
  pushLog("system", `Remote panel ready at http://${settings.host}:${settings.port}`);
});

server.on("close", () => {
  destroyAllTerminalSessions("Server closed.");
});

const relayBroadcastInterval = setInterval(() => {
  broadcastChatSnapshot("poll").catch(() => null);
}, 2000);
if (typeof relayBroadcastInterval.unref === "function") {
  relayBroadcastInterval.unref();
}

const wsHeartbeatInterval = setInterval(() => {
  heartbeatWebSocketClients(state.wsClients);
  heartbeatWebSocketClients(state.terminalWsClients);
}, WS_HEARTBEAT_INTERVAL_MS);
if (typeof wsHeartbeatInterval.unref === "function") {
  wsHeartbeatInterval.unref();
}

async function shutdown() {
  pushLog("system", "Shutting down remote panel...");
  if (persistSessionTimer) {
    clearTimeout(persistSessionTimer);
    persistSessionTimer = null;
  }
  await persistSessionStore().catch(() => null);
  clearInterval(sessionSweepInterval);
  clearInterval(relayBroadcastInterval);
  clearInterval(wsHeartbeatInterval);
  for (const ws of state.wsClients) {
    try {
      ws.close(1001, "Server shutting down");
    } catch {
      // ignore socket close failures during shutdown
    }
  }
  destroyAllTerminalSessions("Server shutting down.");
  if (state.activeRelays.size > 0 || state.activeRelay?.pid) {
    await stopRelayWatcher({ all: true }).catch(() => null);
  }
  if (state.activeTunnel?.pid) {
    await stopTunnelProcess().catch(() => null);
  }
  if (state.activeDev?.pid) {
    await stopDevProcess().catch(() => null);
  }
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  shutdown().catch(() => process.exit(1));
});

process.on("SIGTERM", () => {
  shutdown().catch(() => process.exit(1));
});
