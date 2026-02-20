import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

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

function sanitizeToken(value) {
  const token = String(value || "").trim();
  if (!token || token.startsWith("replace_with")) {
    return "";
  }
  return token;
}

function sanitizeValue(value) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.startsWith("replace_with")) {
    return "";
  }
  return normalized;
}

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function summarizeApiError(payload, status) {
  if (payload && typeof payload === "object") {
    const message = String(payload.message || "").trim();
    if (message) {
      return message;
    }
  }
  return `GitHub token request failed (HTTP ${status})`;
}

function normalizePrivateKey(rawValue) {
  const key = String(rawValue || "")
    .replace(/\r/g, "")
    .replace(/\\n/g, "\n")
    .trim();
  if (!key || key.startsWith("replace_with")) {
    return "";
  }
  return key;
}

async function readPrivateKey(env) {
  const inline = normalizePrivateKey(env.GITHUB_APP_PRIVATE_KEY);
  if (inline) {
    return inline;
  }
  const fromPathRaw = sanitizeValue(env.GITHUB_APP_PRIVATE_KEY_PATH);
  if (!fromPathRaw) {
    return "";
  }
  const filePath = path.isAbsolute(fromPathRaw) ? fromPathRaw : path.resolve(process.cwd(), fromPathRaw);
  try {
    const loaded = await fs.readFile(filePath, "utf8");
    return normalizePrivateKey(loaded);
  } catch {
    return "";
  }
}

function createGithubAppJwt({ appId, privateKey, now = Math.floor(Date.now() / 1000) }) {
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iat: now - 60,
    exp: now + 9 * 60,
    iss: appId,
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(signingInput), privateKey);
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

async function requestInstallationAccessToken({ appJwt, installationId, fetchImpl }) {
  const endpoint = `https://api.github.com/app/installations/${encodeURIComponent(installationId)}/access_tokens`;
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${appJwt}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "playground-mcp-token-resolver",
    },
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      reason: summarizeApiError(payload, response.status),
    };
  }

  const token = sanitizeToken(payload?.token);
  if (!token) {
    return {
      ok: false,
      reason: "GitHub token response did not include a usable token.",
    };
  }

  return {
    ok: true,
    token,
    expiresAt: String(payload?.expires_at || "").trim(),
  };
}

export async function resolveGithubToken({ env = process.env, fetchImpl = fetch } = {}) {
  const pat = sanitizeToken(env.GITHUB_PERSONAL_ACCESS_TOKEN);
  if (pat) {
    return {
      ok: true,
      source: "pat",
      token: pat,
      expiresAt: "",
    };
  }

  const mcpPat = sanitizeToken(env.GITHUB_MCP_PAT);
  if (mcpPat) {
    return {
      ok: true,
      source: "mcp_pat",
      token: mcpPat,
      expiresAt: "",
    };
  }

  const appId = sanitizeValue(env.GITHUB_APP_ID);
  const installationId = sanitizeValue(env.GITHUB_APP_INSTALLATION_ID);
  const privateKey = await readPrivateKey(env);

  if (!appId || !installationId || !privateKey) {
    return {
      ok: false,
      source: "none",
      reason:
        "No PAT found. Set GITHUB_PERSONAL_ACCESS_TOKEN or provide GITHUB_APP_ID, GITHUB_APP_INSTALLATION_ID, and GITHUB_APP_PRIVATE_KEY(_PATH).",
      expiresAt: "",
      token: "",
    };
  }

  let appJwt = "";
  try {
    appJwt = createGithubAppJwt({ appId, privateKey });
  } catch (error) {
    return {
      ok: false,
      source: "github_app",
      reason: `Failed to sign GitHub App JWT: ${error instanceof Error ? error.message : "Unknown signing error."}`,
      expiresAt: "",
      token: "",
    };
  }

  const issued = await requestInstallationAccessToken({
    appJwt,
    installationId,
    fetchImpl,
  });
  if (!issued.ok) {
    return {
      ok: false,
      source: "github_app",
      reason: issued.reason,
      expiresAt: "",
      token: "",
    };
  }

  return {
    ok: true,
    source: "github_app",
    token: issued.token,
    expiresAt: issued.expiresAt,
  };
}

function outputAsEnv(result, redactToken = false) {
  if (!result.ok) {
    return "";
  }
  const tokenValue = redactToken ? "<redacted>" : result.token;
  return `GITHUB_PERSONAL_ACCESS_TOKEN=${tokenValue}\nGITHUB_MCP_PAT=${tokenValue}\n`;
}

function withOptionalRedaction(result, redactToken = false) {
  if (!redactToken || !result?.token) {
    return result;
  }
  return {
    ...result,
    token: "<redacted>",
  };
}

async function runCli() {
  const format = String(parseArgValue("format") || "json").trim().toLowerCase();
  const allowMissing = parseBool(parseArgValue("allow-missing"), false);
  const redactToken = parseBool(parseArgValue("redact"), false);
  const result = await resolveGithubToken();

  if (!result.ok && !allowMissing) {
    const reason = String(result.reason || "Unable to resolve GitHub token.");
    process.stderr.write(`${reason}\n`);
    process.exit(1);
  }

  if (format === "token") {
    if (result.ok) {
      process.stdout.write(`${redactToken ? "<redacted>" : result.token}\n`);
    }
    return;
  }

  if (format === "env") {
    process.stdout.write(outputAsEnv(result, redactToken));
    return;
  }

  process.stdout.write(`${JSON.stringify(withOptionalRedaction(result, redactToken), null, 2)}\n`);
}

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  runCli().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Unknown resolver error."}\n`);
    process.exit(1);
  });
}
