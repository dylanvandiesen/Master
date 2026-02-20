import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolveGithubToken } from "./github-token-resolver.mjs";

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

function resolveRoot() {
  const scriptPath = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(scriptPath), "..", "..");
}

function loadDotEnvFile(filePath, targetEnv) {
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
      if (!targetEnv[name]) {
        targetEnv[name] = value;
      }
    }
  } catch {
    // Optional dotenv file.
  }
}

function runChild(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: "inherit",
    windowsHide: true,
    ...options,
  });
  child.on("error", (error) => {
    process.stderr.write(`[mcp:github] Launch failed: ${error.message}\n`);
    process.exit(1);
  });
  child.on("exit", (code, signal) => {
    if (signal) {
      process.stderr.write(`[mcp:github] Process exited by signal ${signal}\n`);
      process.exit(1);
      return;
    }
    process.exit(code ?? 0);
  });
}

async function main() {
  const root = resolveRoot();
  const useDocker = parseBool(parseArgValue("docker"), false);
  loadDotEnvFile(path.join(root, ".env"), process.env);
  const tokenResult = await resolveGithubToken();
  if (!tokenResult.ok) {
    throw new Error(tokenResult.reason || "Unable to resolve GitHub credentials.");
  }

  const expiresSuffix = tokenResult.expiresAt ? ` (expires ${tokenResult.expiresAt})` : "";
  process.stdout.write(`[mcp:github] Token source: ${tokenResult.source}${expiresSuffix}\n`);

  const env = {
    ...process.env,
    GITHUB_PERSONAL_ACCESS_TOKEN: tokenResult.token,
    GITHUB_MCP_PAT: tokenResult.token,
  };

  if (useDocker) {
    const image = String(process.env.GITHUB_MCP_DOCKER_IMAGE || "ghcr.io/github/github-mcp-server").trim();
    const args = ["run", "-i", "--rm", "-e", "GITHUB_PERSONAL_ACCESS_TOKEN", image];
    runChild("docker", args, {
      cwd: root,
      env,
    });
    return;
  }

  const defaultEntry = path.join(root, "mcp", "node_modules", "@modelcontextprotocol", "server-github", "dist", "index.js");
  const serverEntryInput = String(parseArgValue("server-entry") || "").trim();
  const serverEntry = serverEntryInput
    ? path.isAbsolute(serverEntryInput)
      ? serverEntryInput
      : path.resolve(root, serverEntryInput)
    : defaultEntry;
  if (!fs.existsSync(serverEntry)) {
    throw new Error(`GitHub MCP server entry not found: ${serverEntry}`);
  }

  runChild(process.execPath, [serverEntry], {
    cwd: root,
    env,
  });
}

main().catch((error) => {
  process.stderr.write(`[mcp:github] ${error instanceof Error ? error.message : "Unknown error."}\n`);
  process.exit(1);
});
