import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import readline from "node:readline";
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "remote-console", "public");
const MANIFEST_DIR = path.join(ROOT, ".agency", "dev-servers");
const INBOX_DIR = path.join(ROOT, ".agency", "remote", "inbox");

const SESSION_COOKIE_NAME = "rc_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_BODY_BYTES = 1_000_000;
const MAX_LOG_LINES = 1500;
const SAFE_MANIFEST_ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,100}$/;
const SAFE_PROJECT_REF = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
const LOCAL_PREVIEW_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "0.0.0.0"]);

const state = {
  logs: [],
  sessions: new Map(),
  loginAttempts: new Map(),
  sseClients: new Set(),
  commandRunning: false,
  activeDev: null,
};

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

function parseAllowlist(raw) {
  return String(raw ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const settings = {
  host: parseArgValue("host") || process.env.REMOTE_PANEL_HOST || "127.0.0.1",
  port: parseInteger(parseArgValue("port") || process.env.REMOTE_PANEL_PORT, 8787),
  password: process.env.REMOTE_PANEL_PASSWORD || "",
  sessionSecret: process.env.REMOTE_PANEL_SESSION_SECRET || "",
  requireHttps: parseBool(process.env.REMOTE_PANEL_REQUIRE_HTTPS, false),
  allowlist: parseAllowlist(process.env.REMOTE_PANEL_ALLOWLIST),
  previewRefreshMs: Math.max(1000, Math.min(20000, parseInteger(process.env.REMOTE_PREVIEW_REFRESH_MS, 3000))),
  bindSessionIp: parseBool(process.env.REMOTE_PANEL_BIND_SESSION_IP, true),
};

if (!settings.password || settings.password.startsWith("replace_with")) {
  settings.password = crypto.randomBytes(18).toString("base64url");
  console.warn("[remote-panel] REMOTE_PANEL_PASSWORD is not set. Generated one-time password.");
  console.warn(`[remote-panel] One-time password: ${settings.password}`);
}

if (!settings.sessionSecret || settings.sessionSecret.startsWith("replace_with")) {
  settings.sessionSecret = crypto.randomBytes(32).toString("base64url");
  console.warn("[remote-panel] REMOTE_PANEL_SESSION_SECRET is not set. Generated one-time secret.");
}

function timestamp() {
  return new Date().toISOString();
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

function broadcastState() {
  const payload = {
    time: timestamp(),
    commandRunning: state.commandRunning,
    activeDev: publicDevState(),
  };
  const body = `event: state\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of state.sseClients) {
    res.write(body);
  }
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

function setSessionCookie(res, sessionId) {
  const attributes = [
    `${SESSION_COOKIE_NAME}=${sessionCookieValue(sessionId)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (settings.requireHttps) {
    attributes.push("Secure");
  }
  res.setHeader("Set-Cookie", attributes.join("; "));
}

function clearSessionCookie(res) {
  const attributes = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=0",
  ];
  if (settings.requireHttps) {
    attributes.push("Secure");
  }
  res.setHeader("Set-Cookie", attributes.join("; "));
}

function setSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-src 'self'; object-src 'none'; base-uri 'none';"
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
    state.sessions.delete(sessionId);
    return null;
  }
  if (settings.bindSessionIp && session.ip !== ip) {
    return null;
  }
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  return {
    id: sessionId,
    ...session,
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
  return {
    id: sessionId,
    ...record,
  };
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
      previewUrl: `/preview/${encodeURIComponent(manifest.id || id)}/`,
    });
  }

  manifests.sort((a, b) => {
    const lhs = Date.parse(a.generatedAt || "") || 0;
    const rhs = Date.parse(b.generatedAt || "") || 0;
    return rhs - lhs;
  });

  return manifests;
}

async function appendRemoteNote({ title, message, ip }) {
  await fsp.mkdir(INBOX_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${stamp}.md`;
  const filePath = path.join(INBOX_DIR, fileName);
  const body = [
    `# Remote Request`,
    "",
    `- Time: ${timestamp()}`,
    `- Source IP: ${ip}`,
    `- Title: ${title || "(no title)"}`,
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
            proxiedHeaders.location = `/preview/${encodeURIComponent(manifestId)}${location.pathname}${location.search}`;
          }
        } catch {
          // ignore malformed location header rewrite
        }
      }

      res.writeHead(proxyRes.statusCode || 502, proxiedHeaders);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on("error", (error) => {
    badRequest(res, `Preview connection failed: ${error.message}`);
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
  };

  setSecurityHeaders(res);
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
      panel: {
        host: settings.host,
        port: settings.port,
        requireHttps: settings.requireHttps,
      },
      activeDev: publicDevState(),
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
    setSessionCookie(res, session.id);
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

  if (!ensureMutationCsrf(req, session)) {
    forbidden(res, "Missing or invalid CSRF token.");
    return;
  }

  if (pathname === "/api/auth/logout" && req.method === "POST") {
    state.sessions.delete(session.id);
    clearSessionCookie(res);
    json(res, 200, { ok: true });
    return;
  }

  if (pathname === "/api/session" && req.method === "GET") {
    json(res, 200, {
      ok: true,
      csrfToken: session.csrfToken,
      expiresAt: new Date(session.expiresAt).toISOString(),
      commandRunning: state.commandRunning,
      activeDev: publicDevState(),
      previewRefreshMs: settings.previewRefreshMs,
      bindSessionIp: settings.bindSessionIp,
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

  if (pathname === "/api/events" && req.method === "GET") {
    setSecurityHeaders(res);
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    });
    res.write(`event: state\ndata: ${JSON.stringify({ commandRunning: state.commandRunning, activeDev: publicDevState() })}\n\n`);

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

    const args = project ? [`--project=${project}`] : [];

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

  if (pathname === "/api/note" && req.method === "POST") {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      badRequest(res, error.message);
      return;
    }

    const title = String(body.title || "").trim();
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
      title,
      message,
      ip,
    });

    pushLog("note", `Stored remote note at ${note.filePath}`);
    json(res, 200, {
      ok: true,
      note,
    });
    return;
  }

  notFound(res);
}

function logStartupBanner() {
  const externalHint = settings.host === "0.0.0.0" ? "LAN enabled" : "local-only";
  console.log("[remote-panel] -------------------------------------------------");
  console.log(`[remote-panel] Listening on http://${settings.host}:${settings.port} (${externalHint})`);
  if (settings.requireHttps) {
    console.log("[remote-panel] HTTPS enforcement is ON (expects TLS at proxy/tunnel).");
  } else {
    console.log("[remote-panel] HTTPS enforcement is OFF. Use local network only.");
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

    if (settings.requireHttps && !isHttpsRequest(req, ip)) {
      forbidden(res, "HTTPS is required for remote access.");
      return;
    }

    const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const pathname = requestUrl.pathname;

    if (pathname.startsWith("/api/")) {
      await handleApi(req, res, pathname, ip);
      return;
    }

    if (pathname.startsWith("/preview/")) {
      await handlePreviewProxy(req, res, pathname, requestUrl.search);
      return;
    }

    await serveStatic(req, res, pathname);
  } catch (error) {
    json(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

server.listen(settings.port, settings.host, () => {
  logStartupBanner();
  pushLog("system", `Remote panel ready at http://${settings.host}:${settings.port}`);
});

async function shutdown() {
  pushLog("system", "Shutting down remote panel...");
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
