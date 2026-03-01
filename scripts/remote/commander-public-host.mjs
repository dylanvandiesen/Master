import path from "node:path";
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const UPDATE_REDIRECT_SCRIPT = path.join(ROOT, "scripts", "remote", "update-commander-local-redirect.ps1");

function asString(value) {
  return String(value ?? "").trim();
}

function parseBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const normalized = asString(value).toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

export function normalizePublicHost(value) {
  return asString(value)
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
}

export function buildPublicUrl(publicHost, protocol = "https", basePath = "") {
  const host = normalizePublicHost(publicHost);
  if (!host) {
    return "";
  }
  const pathSuffix = asString(basePath).replace(/\/+$/, "");
  return `${protocol}://${host}${pathSuffix || ""}/`;
}

export function resolvePublicHostAutomationConfig(env = process.env) {
  return {
    publicHostVerifyTimeoutMs: Math.max(
      2000,
      Math.min(30000, Number.parseInt(asString(env.REMOTE_PANEL_PUBLIC_HOST_VERIFY_TIMEOUT_MS), 10) || 8000)
    ),
    publicAuthUser: asString(env.REMOTE_PANEL_PUBLIC_AUTH_USER),
    publicAuthPassword: asString(env.REMOTE_PANEL_PUBLIC_AUTH_PASSWORD),
    autoRemoteRedirect: parseBool(env.REMOTE_PANEL_REMOTE_REDIRECT_ENABLED, true),
    remoteRedirectHost: asString(env.REMOTE_PANEL_REMOTE_REDIRECT_HOST),
    remoteRedirectUser: asString(env.REMOTE_PANEL_REMOTE_REDIRECT_USER),
    remoteRedirectKeyPath: asString(env.REMOTE_PANEL_REMOTE_REDIRECT_KEY_PATH),
    remoteRedirectSitePath: asString(env.REMOTE_PANEL_REMOTE_REDIRECT_SITE_PATH),
    localCommanderSitePath: asString(env.REMOTE_PANEL_LOCAL_COMMANDER_SITE_PATH),
  };
}

export function canManageRemoteRedirect(config = {}) {
  return Boolean(
    config.autoRemoteRedirect &&
      asString(config.remoteRedirectHost) &&
      asString(config.remoteRedirectUser) &&
      asString(config.remoteRedirectKeyPath)
  );
}

export async function verifyPublicHost({
  publicHost = "",
  basePath = "",
  timeoutMs = 8000,
  authUser = "",
  authPassword = "",
} = {}) {
  const url = `${buildPublicUrl(publicHost, "https", basePath).replace(/\/$/, "")}/api/health`;
  if (!url) {
    return {
      ok: false,
      url: "",
      status: 0,
      error: "Public host is not configured.",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = {};
    if (authUser && authPassword) {
      headers.authorization = `Basic ${Buffer.from(`${authUser}:${authPassword}`).toString("base64")}`;
    }
    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    });
    return {
      ok: response.ok,
      url,
      status: response.status,
      error: response.ok ? "" : `Remote host responded with HTTP ${response.status}.`,
    };
  } catch (error) {
    return {
      ok: false,
      url,
      status: 0,
      error: error instanceof Error ? error.message : "Failed to verify remote public host.",
    };
  } finally {
    clearTimeout(timer);
  }
}

export function runRemoteRedirectUpdate({
  tunnelUrl,
  remoteRedirectHost,
  remoteRedirectUser,
  remoteRedirectKeyPath,
  remoteRedirectSitePath = "",
  localCommanderSitePath = "",
  timeoutMs = 120000,
} = {}) {
  return new Promise((resolve, reject) => {
    if (!tunnelUrl) {
      reject(new Error("Tunnel URL is required for remote redirect update."));
      return;
    }

    const args = [
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      UPDATE_REDIRECT_SCRIPT,
      "-TunnelUrl",
      tunnelUrl,
      "-RemoteHost",
      remoteRedirectHost,
      "-RemoteUser",
      remoteRedirectUser,
      "-RemoteKeyPath",
      remoteRedirectKeyPath,
    ];
    if (remoteRedirectSitePath) {
      args.push("-RemoteSitePath", remoteRedirectSitePath);
    }
    if (localCommanderSitePath) {
      args.push("-LocalCommanderSitePath", localCommanderSitePath);
    }

    const child = spawn("powershell", args, {
      cwd: ROOT,
      env: process.env,
      windowsHide: true,
    });

    const outputLines = [];
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      try {
        child.kill("SIGTERM");
      } catch {
        // ignore
      }
      reject(new Error("Timed out while updating remote Commander redirect."));
    }, timeoutMs);

    const onLine = (line) => {
      outputLines.push(String(line || ""));
    };
    child.stdout?.on("data", (chunk) => {
      for (const line of String(chunk || "").split(/\r?\n/)) {
        if (line) {
          onLine(line);
        }
      }
    });
    child.stderr?.on("data", (chunk) => {
      for (const line of String(chunk || "").split(/\r?\n/)) {
        if (line) {
          onLine(line);
        }
      }
    });
    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on("exit", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (code === 0) {
        resolve({
          ok: true,
          exitCode: 0,
          outputLines,
        });
        return;
      }
      reject(new Error(`Remote Commander redirect update failed (exit ${code ?? -1}).`));
    });
  });
}
