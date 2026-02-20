import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const VALID_MODES = new Set(["local", "remote"]);

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

function normalizeMode(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return VALID_MODES.has(normalized) ? normalized : "local";
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
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
    // No .env file is fine.
  }
}

function runNpmScript(commandName, script, scriptArgs = [], env = process.env) {
  const child = spawn(npmCommand(), ["run", script, "--", ...scriptArgs], {
    cwd: ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  const onLine = (source) => (line) => {
    process.stdout.write(`[${commandName}:${source}] ${line}\n`);
  };
  const stdoutRl = child.stdout ? readline.createInterface({ input: child.stdout }) : null;
  const stderrRl = child.stderr ? readline.createInterface({ input: child.stderr }) : null;
  stdoutRl?.on("line", onLine("stdout"));
  stderrRl?.on("line", onLine("stderr"));

  const cleanup = () => {
    stdoutRl?.close();
    stderrRl?.close();
  };
  child.once("exit", cleanup);
  child.once("error", cleanup);

  return child;
}

async function terminateChild(child) {
  if (!child || child.exitCode !== null || child.killed) {
    return;
  }
  const pid = child.pid;
  if (!pid) {
    return;
  }
  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(pid), "/t", "/f"], {
        cwd: ROOT,
        stdio: "ignore",
        windowsHide: true,
      });
      killer.on("exit", () => resolve());
      killer.on("error", () => resolve());
    });
    return;
  }
  child.kill("SIGTERM");
}

async function main() {
  loadDotEnvFile(path.join(ROOT, ".env"), process.env);
  const mode = normalizeMode(parseArgValue("mode") || process.env.REMOTE_PANEL_START_MODE || "local");
  const project = String(parseArgValue("project") || process.env.PROJECT || "").trim();
  const panelPort = String(parseArgValue("panel-port") || process.env.REMOTE_PANEL_PORT || "").trim();
  const devPort = String(parseArgValue("dev-port") || process.env.DEV_PORT || "").trim();
  const sessionName = String(parseArgValue("session-name") || "codex-chat").trim() || "codex-chat";
  const noDev = parseBool(parseArgValue("no-dev"), false);
  const noRelay = parseBool(parseArgValue("no-relay"), false);
  const dryRun = parseBool(parseArgValue("dry-run"), false);

  const panelScript = mode === "remote" ? "remote:panel:remote" : "remote:panel:local";
  const panelArgs = [];
  if (panelPort) {
    panelArgs.push(`--port=${panelPort}`);
  }

  const devArgs = [];
  if (project) {
    devArgs.push(`--project=${project}`);
  }
  if (devPort) {
    devArgs.push(`--port=${devPort}`);
  }

  const relayArgs = [`--session-name=${sessionName}`];
  if (project) {
    relayArgs.push(`--project=${project}`);
  }

  const commands = [
    { name: "panel", script: panelScript, args: panelArgs, enabled: true },
    { name: "dev", script: "dev", args: devArgs, enabled: !noDev },
    { name: "relay", script: "remote:relay:codex:watch", args: relayArgs, enabled: !noRelay },
  ].filter((command) => command.enabled);

  process.stdout.write(
    `[panel-stack] mode=${mode} project=${project || "(active default)"} panelScript=${panelScript} dev=${noDev ? "off" : "on"} relay=${
      noRelay ? "off" : "on"
    }\n`
  );

  if (dryRun) {
    for (const command of commands) {
      process.stdout.write(
        `[panel-stack] dry-run ${command.name} -> npm run ${command.script}${command.args.length ? ` -- ${command.args.join(" ")}` : ""}\n`
      );
    }
    return;
  }

  const children = [];
  let stopping = false;

  const stopAll = async () => {
    if (stopping) {
      return;
    }
    stopping = true;
    await Promise.all(children.map(({ child }) => terminateChild(child)));
  };

  const signalHandler = async () => {
    process.stdout.write("[panel-stack] Shutdown requested. Stopping child processes...\n");
    await stopAll();
  };
  process.on("SIGINT", signalHandler);
  process.on("SIGTERM", signalHandler);

  const exitPromises = [];
  for (const command of commands) {
    const child = runNpmScript(command.name, command.script, command.args, process.env);
    children.push({ ...command, child });
    process.stdout.write(`[panel-stack] started ${command.name} -> npm run ${command.script}${command.args.length ? ` -- ${command.args.join(" ")}` : ""}\n`);
    exitPromises.push(
      new Promise((resolve, reject) => {
        child.once("error", (error) => {
          reject(new Error(`${command.name} failed to start: ${error.message}`));
        });
        child.once("exit", (code, signal) => {
          resolve({
            name: command.name,
            code: code ?? 0,
            signal: signal || "",
          });
        });
      })
    );
  }

  let result;
  try {
    result = await Promise.race(exitPromises);
  } catch (error) {
    await stopAll();
    throw error;
  }
  const exitCode = Number(result?.code ?? 0);
  const exitSignal = String(result?.signal || "").trim();
  const label = String(result?.name || "process");

  if (!stopping && (exitCode !== 0 || exitSignal)) {
    process.stderr.write(
      `[panel-stack] ${label} exited unexpectedly (code=${exitCode}${exitSignal ? ` signal=${exitSignal}` : ""}). Stopping remaining processes.\n`
    );
    await stopAll();
    process.exit(exitCode || 1);
    return;
  }

  if (!stopping) {
    process.stdout.write(`[panel-stack] ${label} exited (code=${exitCode}). Stopping remaining processes.\n`);
    await stopAll();
    process.exit(exitCode);
    return;
  }

  process.exit(0);
}

main().catch((error) => {
  process.stderr.write(`[panel-stack] ${error instanceof Error ? error.message : "Unknown startup error."}\n`);
  process.exit(1);
});
