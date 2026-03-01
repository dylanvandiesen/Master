import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { WebSocket } from "ws";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_PANEL_URL = "http://127.0.0.1:8787";
const DEFAULT_CONNECT_TIMEOUT_MS = 10_000;
const DETACH_CTRL_BYTE = 0x1d; // Ctrl+]

function parseArgValue(name) {
  const prefixed = `--${name}=`;
  for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    if (arg.startsWith(prefixed)) {
      return arg.slice(prefixed.length);
    }
    if (arg === `--${name}`) {
      return process.argv[index + 1] ?? "";
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

function loadDotEnvFile(filePath, env) {
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
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!env[key]) {
        env[key] = value;
      }
    }
  } catch {
    // .env is optional
  }
}

function normalizePanelUrl(raw) {
  let value = String(raw || "").trim();
  if (!value) {
    value = DEFAULT_PANEL_URL;
  }
  if (!/^https?:\/\//i.test(value)) {
    value = `http://${value}`;
  }
  const parsed = new URL(value);
  if (!parsed.pathname) {
    parsed.pathname = "/";
  }
  if (!parsed.pathname.endsWith("/")) {
    parsed.pathname = `${parsed.pathname}/`;
  }
  parsed.search = "";
  parsed.hash = "";
  return parsed;
}

function panelRouteUrl(baseUrl, routePath) {
  const relativePath = String(routePath || "").replace(/^\/+/, "");
  return new URL(relativePath, baseUrl);
}

function readTerminalSize() {
  const rawCols = Number.parseInt(String(process.stdout.columns || process.stdin.columns || 120), 10);
  const rawRows = Number.parseInt(String(process.stdout.rows || process.stdin.rows || 32), 10);
  const cols = Number.isFinite(rawCols) ? Math.max(20, Math.min(320, rawCols)) : 120;
  const rows = Number.isFinite(rawRows) ? Math.max(8, Math.min(200, rawRows)) : 32;
  return { cols, rows };
}

function parseSetCookie(setCookieHeader) {
  const values = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
      ? [setCookieHeader]
      : [];
  for (const entry of values) {
    const text = String(entry || "");
    const match = text.match(/(?:^|;\s*)(rc_session=[^;]+)/i);
    if (match && match[1]) {
      return match[1];
    }
    if (text.toLowerCase().startsWith("rc_session=")) {
      const first = text.split(";")[0].trim();
      if (first) {
        return first;
      }
    }
  }
  return "";
}

function requestJson(baseUrl, method, routePath, options = {}) {
  const body = options.body;
  const headers = options.headers && typeof options.headers === "object" ? { ...options.headers } : {};
  const timeoutMs = Math.max(1000, Number.parseInt(String(options.timeoutMs || DEFAULT_CONNECT_TIMEOUT_MS), 10));
  const requestUrl = panelRouteUrl(baseUrl, routePath);
  const transport = requestUrl.protocol === "https:" ? https : http;
  const payload = body === undefined ? null : Buffer.from(JSON.stringify(body), "utf8");
  if (payload) {
    headers["content-type"] = "application/json";
    headers["content-length"] = String(payload.length);
  }

  return new Promise((resolve, reject) => {
    const req = transport.request(
      requestUrl,
      {
        method,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let json = null;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {
            json = null;
          }
          resolve({
            statusCode: Number(res.statusCode || 0),
            headers: res.headers || {},
            text,
            json,
          });
        });
      }
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
    });
    req.on("error", reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function wsUrlFor(baseUrl) {
  const url = panelRouteUrl(baseUrl, "terminal-ws");
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function sequenceNumber(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return parsed;
}

async function main() {
  loadDotEnvFile(path.join(ROOT, ".env"), process.env);

  const panelUrl = normalizePanelUrl(
    parseArgValue("url") ||
      process.env.REMOTE_PANEL_URL ||
      `${process.env.REMOTE_PANEL_HOST || "127.0.0.1"}:${process.env.REMOTE_PANEL_PORT || "8787"}`
  );
  const password = String(parseArgValue("password") || process.env.REMOTE_PANEL_PASSWORD || "").trim();
  const autoStart = parseBool(parseArgValue("start"), true);
  const clearHistory = parseBool(parseArgValue("clear-history"), false);
  const showHistory = parseBool(parseArgValue("history"), false);
  const once = parseBool(parseArgValue("once"), false);
  const quiet = parseBool(parseArgValue("quiet"), false);

  if (!password) {
    throw new Error(
      "Missing panel password. Set REMOTE_PANEL_PASSWORD in .env or pass --password=<value>."
    );
  }

  const login = await requestJson(panelUrl, "POST", "/api/auth/login", {
    body: { password },
  });
  if (login.statusCode !== 200 || !login.json?.csrfToken) {
    throw new Error(login.json?.error || `Login failed (${login.statusCode}).`);
  }
  const csrfToken = String(login.json.csrfToken || "").trim();
  const sessionCookie = parseSetCookie(login.headers["set-cookie"]);
  if (!sessionCookie) {
    throw new Error("Login succeeded but rc_session cookie was not returned.");
  }

  const authHeaders = {
    cookie: sessionCookie,
    "x-csrf-token": csrfToken,
  };

  if (autoStart) {
    const { cols, rows } = readTerminalSize();
    const startPayload = await requestJson(panelUrl, "POST", "/api/terminal/start", {
      headers: authHeaders,
      body: {
        cols,
        rows,
        clearHistory,
      },
    });
    if (startPayload.statusCode !== 200) {
      throw new Error(startPayload.json?.error || `Terminal start failed (${startPayload.statusCode}).`);
    }
  }

  const wsUrl = wsUrlFor(panelUrl);
  const ws = new WebSocket(wsUrl, {
    headers: {
      Cookie: sessionCookie,
    },
  });

  let detached = false;
  let lastSeq = 0;
  let ready = false;
  let onceTimer = null;
  let inputAttached = false;

  const sendJson = (payload) => {
    if (!payload || ws.readyState !== WebSocket.OPEN) {
      return;
    }
    ws.send(JSON.stringify(payload));
  };

  const cleanupInput = () => {
    if (!inputAttached || !process.stdin.isTTY) {
      return;
    }
    process.stdin.off("data", onInputData);
    process.stdin.setRawMode?.(false);
    inputAttached = false;
  };

  const shutdown = (code = 0) => {
    if (detached) {
      return;
    }
    detached = true;
    if (onceTimer) {
      clearTimeout(onceTimer);
      onceTimer = null;
    }
    cleanupInput();
    try {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    } catch {
      // ignore
    }
    process.exit(code);
  };

  const writeChunk = (rawData, seq = 0) => {
    const data = String(rawData ?? "");
    if (!data) {
      return;
    }
    const parsedSeq = sequenceNumber(seq);
    if (parsedSeq > 0) {
      if (parsedSeq <= lastSeq) {
        return;
      }
      lastSeq = parsedSeq;
    }
    process.stdout.write(data);
  };

  const markReady = () => {
    if (ready) {
      return;
    }
    ready = true;
    if (once) {
      onceTimer = setTimeout(() => {
        shutdown(0);
      }, 500);
    }
  };

  const onInputData = (chunk) => {
    if (!chunk || ws.readyState !== WebSocket.OPEN) {
      return;
    }
    if (Buffer.isBuffer(chunk) && chunk.length === 1 && chunk[0] === DETACH_CTRL_BYTE) {
      process.stderr.write("\n[terminal-attach] detached\n");
      shutdown(0);
      return;
    }
    sendJson({
      type: "terminal:stdin",
      data: Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk),
    });
  };

  ws.on("open", () => {
    const { cols, rows } = readTerminalSize();
    sendJson({ type: "terminal:resize", cols, rows });
    sendJson({ type: "terminal:status" });
    if (!quiet) {
      process.stderr.write(
        `[terminal-attach] connected ${panelUrl.origin} (shared terminal). Press Ctrl+] to detach.\n`
      );
    }
    if (process.stdin.isTTY) {
      process.stdin.setRawMode?.(true);
      process.stdin.resume();
      process.stdin.on("data", onInputData);
      inputAttached = true;
    }
  });

  ws.on("message", (raw) => {
    const text = String(raw ?? "");
    let payload = null;
    try {
      payload = JSON.parse(text);
    } catch {
      writeChunk(text);
      markReady();
      return;
    }
    const type = String(payload?.type || "").toLowerCase();
    if (type === "terminal:init" || type === "terminal:status") {
      markReady();
      return;
    }
    if (type.includes("history")) {
      if (!showHistory) {
        markReady();
        return;
      }
      const chunks = Array.isArray(payload?.history?.chunks)
        ? payload.history.chunks
        : Array.isArray(payload?.chunks)
          ? payload.chunks
          : [];
      for (const chunk of chunks) {
        writeChunk(chunk?.data, chunk?.seq);
      }
      markReady();
      return;
    }
    if (type === "terminal:output") {
      const chunk = payload?.chunk && typeof payload.chunk === "object" ? payload.chunk : payload;
      writeChunk(chunk?.data || payload?.data || payload?.output || payload?.text, chunk?.seq || payload?.seq);
      markReady();
      return;
    }
    if (type.includes("error")) {
      const message = String(payload?.error || payload?.message || "terminal error");
      process.stderr.write(`\n[terminal-attach] ${message}\n`);
      markReady();
      return;
    }
    if (type.includes("exit") || type.includes("closed")) {
      const code = payload?.exitCode;
      if (!quiet) {
        process.stderr.write(`\n[terminal-attach] terminal exited${code === undefined ? "" : ` (code=${code})`}\n`);
      }
      markReady();
      return;
    }
  });

  ws.on("close", () => {
    if (!detached) {
      if (!quiet) {
        process.stderr.write("\n[terminal-attach] disconnected\n");
      }
      shutdown(0);
    }
  });

  ws.on("error", (error) => {
    if (!quiet) {
      process.stderr.write(`\n[terminal-attach] socket error: ${error.message}\n`);
    }
    shutdown(1);
  });

  process.on("SIGWINCH", () => {
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }
    const { cols, rows } = readTerminalSize();
    sendJson({
      type: "terminal:resize",
      cols,
      rows,
    });
  });

  process.on("SIGINT", () => {
    shutdown(0);
  });
  process.on("SIGTERM", () => {
    shutdown(0);
  });
}

main().catch((error) => {
  process.stderr.write(`[terminal-attach] ${error instanceof Error ? error.message : "Unknown error"}\n`);
  process.exit(1);
});
