import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const PANEL_CREDENTIALS_FILE = path.join(ROOT, ".agency", "remote", "panel-credentials.json");

export function parseBooleanFlag(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value;
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

export function loadDotEnvInto(targetEnv = process.env, filePath = path.join(ROOT, ".env")) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const splitAt = trimmed.indexOf("=");
      if (splitAt <= 0) {
        continue;
      }
      const key = trimmed.slice(0, splitAt).trim();
      const value = trimmed.slice(splitAt + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!targetEnv[key]) {
        targetEnv[key] = value;
      }
    }
  } catch {
    // No .env file is fine.
  }
  return targetEnv;
}

export function panelPasswordFromEnvironment() {
  loadDotEnvInto(process.env);
  const envPassword = String(process.env.REMOTE_PANEL_PASSWORD || "").trim();
  if (envPassword) {
    return envPassword;
  }
  try {
    const raw = fs.readFileSync(PANEL_CREDENTIALS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return String(parsed?.password || "").trim();
  } catch {
    return "";
  }
}

export function formatPanelUrl({ host = "127.0.0.1", port = 8787, protocol = "http", basePath = "" } = {}) {
  const normalizedProtocol = String(protocol || "http").trim() || "http";
  const normalizedHost = String(host || "127.0.0.1").trim() || "127.0.0.1";
  const normalizedPort = Number.parseInt(String(port || "8787"), 10) || 8787;
  const normalizedBasePath = String(basePath || "").trim().replace(/\/+$/, "");
  return `${normalizedProtocol}://${normalizedHost}:${normalizedPort}${normalizedBasePath || ""}`;
}

export async function waitForPanel(baseUrl, timeoutMs = 60_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/api/health`, {
        method: "GET",
      });
      if (response.ok) {
        return response.json();
      }
    } catch {
      // keep retrying
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for panel health at ${baseUrl}.`);
}

export async function panelLogin(baseUrl, password) {
  if (!password) {
    throw new Error("REMOTE_PANEL_PASSWORD is required to drive the panel API.");
  }
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      password,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(payload?.error || payload?.message || "Panel login failed."));
  }
  const cookie = response.headers.get("set-cookie");
  if (!cookie) {
    throw new Error("Panel login did not return a session cookie.");
  }
  return {
    baseUrl,
    cookie,
    csrfToken: String(payload?.csrfToken || "").trim(),
  };
}

export async function panelRequest(session, method, requestPath, body) {
  const response = await fetch(`${session.baseUrl}${requestPath}`, {
    method,
    headers: {
      cookie: session.cookie,
      "x-csrf-token": session.csrfToken,
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(payload?.error || payload?.message || `Request failed (${response.status}).`));
  }
  return payload;
}

export function startPanelProcess({
  mode = "remote",
  host,
  port = 8787,
  security = "on",
  publicHost = "",
  basePath = "",
} = {}) {
  const panelHost = String(host || (mode === "remote" ? "0.0.0.0" : "127.0.0.1")).trim();
  const panelArgs = ["remote-console/server.mjs", `--host=${panelHost}`, `--port=${port}`];
  if (security) {
    panelArgs.push(`--security=${security}`);
  }
  if (publicHost) {
    panelArgs.push(`--public-host=${publicHost}`);
  }
  if (basePath) {
    panelArgs.push(`--base-path=${basePath}`);
  }

  const tmpDir = path.join(ROOT, ".tmp");
  fs.mkdirSync(tmpDir, { recursive: true });
  const outPath = path.join(tmpDir, "env-panel.out.log");
  const errPath = path.join(tmpDir, "env-panel.err.log");
  const stdout = fs.openSync(outPath, "a");
  const stderr = fs.openSync(errPath, "a");
  const child = spawn(process.execPath, panelArgs, {
    cwd: ROOT,
    env: process.env,
    detached: true,
    stdio: ["ignore", stdout, stderr],
    windowsHide: true,
  });
  child.unref();
  return {
    pid: child.pid,
    outPath,
    errPath,
  };
}

