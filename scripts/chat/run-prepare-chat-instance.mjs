import { spawn } from "node:child_process";

const MODE_DEFAULT_SWITCHES = {
  standard: {
    PrepareMcp: true,
  },
  quick: {
    SkipBuild: true,
    PrepareMcp: true,
  },
  full: {
    InstallRootDeps: true,
    InstallMcpDeps: true,
    PrepareMcp: true,
  },
};

const VALUE_KEYS = new Map([
  ["mode", "mode"],
  ["project", "Project"],
  ["sessionid", "SessionId"],
  ["session", "SessionId"],
  ["reporoot", "RepoRoot"],
  ["repo", "RepoRoot"],
]);

const SWITCH_KEYS = new Map([
  ["installrootdeps", "InstallRootDeps"],
  ["installmcpdeps", "InstallMcpDeps"],
  ["preparemcp", "PrepareMcp"],
  ["skipscaffold", "SkipScaffold"],
  ["skipbuild", "SkipBuild"],
  ["nobriefing", "NoBriefing"],
]);

function normalizeKey(raw) {
  return String(raw || "")
    .trim()
    .replace(/^--?/, "")
    .replace(/[:=].*$/, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

function parseBool(raw, fallback = true) {
  if (raw === undefined || raw === null || raw === "") {
    return fallback;
  }
  const value = String(raw).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(value)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(value)) {
    return false;
  }
  return fallback;
}

function parseArgs(argv) {
  const values = {};
  const switches = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = String(argv[index] || "");
    if (!token.startsWith("-")) {
      continue;
    }

    let rawKey = token;
    let inlineValue = "";
    const equalsIndex = token.indexOf("=");
    if (equalsIndex >= 0) {
      rawKey = token.slice(0, equalsIndex);
      inlineValue = token.slice(equalsIndex + 1);
    }

    const key = normalizeKey(rawKey);
    if (!key) {
      continue;
    }

    if (VALUE_KEYS.has(key)) {
      const target = VALUE_KEYS.get(key);
      let value = inlineValue;
      if (!value) {
        const next = String(argv[index + 1] || "");
        if (next && !next.startsWith("-")) {
          value = next;
          index += 1;
        }
      }
      if (value) {
        values[target] = value;
      }
      continue;
    }

    if (SWITCH_KEYS.has(key)) {
      const target = SWITCH_KEYS.get(key);
      let enabled = parseBool(inlineValue, true);
      if (!inlineValue) {
        const next = String(argv[index + 1] || "");
        if (next && !next.startsWith("-")) {
          enabled = parseBool(next, true);
          index += 1;
        }
      }
      switches[target] = enabled;
    }
  }

  return { values, switches };
}

function normalizeMode(rawMode) {
  const normalized = String(rawMode || "standard")
    .trim()
    .toLowerCase();
  if (Object.prototype.hasOwnProperty.call(MODE_DEFAULT_SWITCHES, normalized)) {
    return normalized;
  }
  return "standard";
}

function buildPowerShellArgs(parsed) {
  const mode = normalizeMode(parsed.values.mode);
  const defaults = MODE_DEFAULT_SWITCHES[mode];
  const mergedSwitches = {
    ...defaults,
    ...parsed.switches,
  };
  const projectFromEnv = String(process.env.npm_config_project || "").trim();
  const effectiveProject = String(parsed.values.Project || projectFromEnv || "").trim();

  const args = ["-ExecutionPolicy", "Bypass", "-File", "scripts/chat/prepare-chat-instance.ps1"];

  if (parsed.values.RepoRoot) {
    args.push("-RepoRoot", parsed.values.RepoRoot);
  }
  if (effectiveProject) {
    args.push("-Project", effectiveProject);
  }
  if (parsed.values.SessionId) {
    args.push("-SessionId", parsed.values.SessionId);
  }

  const switchOrder = ["InstallRootDeps", "InstallMcpDeps", "PrepareMcp", "SkipScaffold", "SkipBuild", "NoBriefing"];
  for (const key of switchOrder) {
    if (mergedSwitches[key]) {
      args.push(`-${key}`);
    }
  }

  return args;
}

function run() {
  const parsed = parseArgs(process.argv.slice(2));
  const powershellArgs = buildPowerShellArgs(parsed);
  const child = spawn("powershell", powershellArgs, {
    stdio: "inherit",
    windowsHide: true,
  });

  child.on("error", (error) => {
    process.stderr.write(`[chat:new] Failed to start PowerShell: ${error.message}\n`);
    process.exit(1);
  });

  child.on("exit", (code) => {
    process.exit(Number.isFinite(code) ? code : 1);
  });
}

run();
