import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import WebSocket from "ws";

const HOST = "localhost";
const ROOT = process.cwd();
const SERVER_ENTRY = path.join(ROOT, "remote-console", "server.mjs");
const REQUIRED_ASSETS = [
  ["/vendor/xterm/xterm.css", "text/css"],
  ["/vendor/xterm/xterm.js", "javascript"],
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? Number(address.port || 0) : 0;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        if (!port) {
          reject(new Error("Could not find a free port."));
          return;
        }
        resolve(port);
      });
    });
  });
}

async function waitFor(fn, timeoutMs, label) {
  const start = Date.now();
  let lastError = null;
  while (Date.now() - start < timeoutMs) {
    try {
      const value = await fn();
      if (value) {
        return value;
      }
    } catch (error) {
      lastError = error;
    }
    await sleep(180);
  }
  if (lastError) {
    throw new Error(`${label}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
  }
  throw new Error(`${label}: timeout after ${timeoutMs}ms`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function parseCookieHeader(setCookieHeader) {
  const raw = String(setCookieHeader || "").trim();
  if (!raw) {
    return "";
  }
  return raw.split(";")[0] || "";
}

function readArg(name) {
  const prefixed = `${name}=`;
  for (let i = 2; i < process.argv.length; i += 1) {
    const arg = String(process.argv[i] || "");
    if (arg === name) {
      return String(process.argv[i + 1] || "");
    }
    if (arg.startsWith(prefixed)) {
      return arg.slice(prefixed.length);
    }
  }
  return "";
}

function hasArg(name) {
  return process.argv.includes(name);
}

function decodeEscapedArg(raw) {
  return String(raw || "")
    .replace(/\\r/g, "\r")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t");
}

async function requestJson(baseUrl, pathname, options = {}, auth = {}) {
  const url = new URL(String(pathname || "").replace(/^\/+/, ""), `${baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`}`);
  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(auth.cookie ? { Cookie: auth.cookie } : {}),
    ...(auth.csrf ? { "x-csrf-token": auth.csrf } : {}),
    ...(options.headers || {}),
  };
  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  return { response, payload };
}

async function readAsset(baseUrl, pathname) {
  const url = new URL(String(pathname || "").replace(/^\/+/, ""), `${baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`}`);
  const response = await fetch(url);
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  const text = await response.text();
  return { response, contentType, text };
}

function connectTerminalWs(url, cookie) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, {
      headers: cookie ? { Cookie: cookie } : {},
    });
    const messages = [];
    ws.once("open", () => resolve({ ws, messages }));
    ws.on("message", (raw) => {
      const text = String(raw || "");
      try {
        messages.push(JSON.parse(text));
      } catch {
        messages.push({ type: "terminal:raw", data: text });
      }
    });
    ws.once("error", (error) => reject(error));
  });
}

async function run() {
  const providedBaseUrl = String(readArg("--base-url") || process.env.TERMINAL_TEST_BASE_URL || "").trim();
  const shouldSpawnServer = !providedBaseUrl && !hasArg("--no-spawn");
  const commandArg = String(readArg("--command") || process.env.TERMINAL_TEST_COMMAND || "").trim();
  const expectArg = String(readArg("--expect") || process.env.TERMINAL_TEST_EXPECT || "").trim();
  const smokeCommand = decodeEscapedArg(commandArg || "echo XTERM_SMOKE_OK\\r");
  const smokeExpect = expectArg || "XTERM_SMOKE_OK";
  const port = shouldSpawnServer ? await findFreePort() : 0;
  const baseUrl = providedBaseUrl || `http://${HOST}:${port}`;
  const base = new URL(baseUrl);
  const wsScheme = base.protocol === "https:" ? "wss:" : "ws:";
  const wsBaseUrl = `${wsScheme}//${base.host}`;
  const password = String(process.env.REMOTE_PANEL_PASSWORD || "testpass123");
  const sessionSecret =
    process.env.REMOTE_PANEL_SESSION_SECRET || "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  let server = null;
  let stdout = "";
  let stderr = "";
  if (shouldSpawnServer) {
    try {
      server = spawn(process.execPath, [SERVER_ENTRY, `--host=${HOST}`, `--port=${port}`, "--security=off"], {
        cwd: ROOT,
        env: {
          ...process.env,
          REMOTE_PANEL_PASSWORD: password,
          REMOTE_PANEL_SESSION_SECRET: sessionSecret,
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      server.stdout.on("data", (chunk) => {
        stdout += String(chunk || "");
      });
      server.stderr.on("data", (chunk) => {
        stderr += String(chunk || "");
      });
    } catch (error) {
      throw new Error(
        `Failed to spawn server process. Use --base-url=http://127.0.0.1:<port> with an already-running commander. ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  const cleanup = async () => {
    if (!server || server.killed) {
      return;
    }
    server.kill("SIGTERM");
    await Promise.race([new Promise((resolve) => server.once("exit", resolve)), sleep(2000)]);
    if (!server.killed) {
      server.kill("SIGKILL");
    }
  };

  try {
    await waitFor(
      async () => {
        const response = await fetch(new URL("api/health", `${baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`}`));
        return response.ok;
      },
      shouldSpawnServer ? 15000 : 8000,
      "Panel startup"
    );

    const index = await readAsset(baseUrl, "/");
    assert(index.response.ok, "Index page failed to load.");
    assert(index.text.includes("/vendor/xterm/xterm.js"), "Index page is missing xterm script.");

    for (const [assetPath, expectedMime] of REQUIRED_ASSETS) {
      const asset = await readAsset(baseUrl, assetPath);
      assert(asset.response.ok, `Asset not found: ${assetPath}`);
      assert(asset.contentType.includes(expectedMime), `Bad MIME for ${assetPath}: ${asset.contentType || "missing"}`);
      assert(!asset.text.trimStart().toLowerCase().startsWith("<!doctype html"), `Asset returned HTML fallback: ${assetPath}`);
    }

    const login = await requestJson(baseUrl, "/api/auth/login", {
      method: "POST",
      body: { password },
    });
    assert(login.response.ok, `Login failed: ${JSON.stringify(login.payload)}`);
    const cookie = parseCookieHeader(login.response.headers.get("set-cookie"));
    const csrf = String(login.payload?.csrfToken || "").trim();
    assert(cookie.includes("rc_session="), "Session cookie missing after login.");
    assert(csrf.length > 10, "CSRF token missing after login.");

    const session = await requestJson(baseUrl, "/api/session", {}, { cookie });
    assert(session.response.ok, "Session fetch failed.");

    const start = await requestJson(
      baseUrl,
      "/api/terminal/start",
      {
        method: "POST",
        body: { reattach: true, cols: 120, rows: 32 },
      },
      { cookie, csrf }
    );
    assert(start.response.ok, `Terminal start failed: ${JSON.stringify(start.payload)}`);
    assert(start.payload?.terminal?.running === true, "Terminal did not report running state.");

    const terminalWsUrl = new URL("terminal-ws", `${wsBaseUrl}${base.pathname.endsWith("/") ? base.pathname : `${base.pathname}/`}`);
    const { ws, messages } = await connectTerminalWs(terminalWsUrl.toString(), cookie);
    await waitFor(() => messages.some((msg) => String(msg?.type || "").toLowerCase() === "terminal:init"), 8000, "WS init");
    await waitFor(() => messages.some((msg) => String(msg?.type || "").toLowerCase() === "terminal:history"), 8000, "WS history");

    ws.send(
      JSON.stringify({
        type: "terminal:stdin",
        data: smokeCommand,
      })
    );
    ws.send(
      JSON.stringify({
        type: "terminal:resize",
        cols: 100,
        rows: 28,
      })
    );

    await waitFor(() => {
      return messages.some((msg) => {
        if (String(msg?.type || "").toLowerCase() !== "terminal:output") {
          return false;
        }
        const output = String(msg?.chunk?.data || msg?.data || msg?.output || "");
        return output.includes(smokeExpect);
      });
    }, 12000, "Terminal output stream");

    const history = await requestJson(baseUrl, "/api/terminal/history", {}, { cookie, csrf });
    assert(history.response.ok, "Terminal history endpoint failed.");
    const historyText = JSON.stringify(history.payload || {});
    assert(historyText.includes(smokeExpect), "Terminal history did not include expected output.");

    const stop = await requestJson(baseUrl, "/api/terminal/stop", { method: "POST", body: {} }, { cookie, csrf });
    assert(stop.response.ok, "Terminal stop failed.");

    ws.close();

    console.log("[terminal-test] PASS");
    console.log(`[terminal-test] base=${baseUrl}`);
    console.log(`[terminal-test] spawned=${shouldSpawnServer ? "yes" : "no"}`);
    console.log(`[terminal-test] terminal-running=${Boolean(start.payload?.terminal?.running)}`);
    console.log(`[terminal-test] output-found=true`);
    console.log(`[terminal-test] expect=${smokeExpect}`);
  } finally {
    await cleanup();
    if (stderr.trim()) {
      console.error("[terminal-test][stderr]");
      console.error(stderr.trim());
    }
    if (stdout.trim()) {
      console.error("[terminal-test][stdout]");
      console.error(stdout.trim());
    }
  }
}

run().catch((error) => {
  console.error("[terminal-test] FAIL");
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
