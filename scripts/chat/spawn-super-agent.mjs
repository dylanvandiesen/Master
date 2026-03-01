import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { spawn } from "node:child_process";
import {
  DEFAULT_CODEX_SESSION_REGISTRY_FILE,
  normalizeSessionName,
  readCodexSessionRegistry,
  upsertCodexSession,
  validateProjectRef,
  writeCodexSessionRegistry,
} from "../remote/codex-session-registry.mjs";

const ROOT = process.cwd();
const MODES = new Set(["quick", "full"]);

function parseBooleanFlag(value, fallback = true) {
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
  const normalized = String(value || "quick")
    .trim()
    .toLowerCase();
  return MODES.has(normalized) ? normalized : "quick";
}

function parseArgs(argv) {
  const options = {
    mode: "quick",
    project: "",
    name: "",
    model: "",
    notes: "",
    runPrep: true,
    makeDefault: true,
    timeoutMs: 8 * 60 * 1000,
  };

  const readValue = (index, inlineValue) => {
    if (inlineValue) {
      return inlineValue;
    }
    const next = String(argv[index + 1] || "");
    if (next && !next.startsWith("-")) {
      return next;
    }
    return "";
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = String(argv[index] || "");
    if (!token.startsWith("-")) {
      continue;
    }

    const equalsAt = token.indexOf("=");
    const rawKey = equalsAt >= 0 ? token.slice(0, equalsAt) : token;
    const inlineValue = equalsAt >= 0 ? token.slice(equalsAt + 1) : "";
    const key = rawKey
      .replace(/^--?/, "")
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase();

    if (!key) {
      continue;
    }

    if (key === "mode") {
      options.mode = normalizeMode(readValue(index, inlineValue));
      if (!inlineValue && argv[index + 1] && !String(argv[index + 1]).startsWith("-")) {
        index += 1;
      }
      continue;
    }

    if (key === "project") {
      options.project = readValue(index, inlineValue).trim();
      if (!inlineValue && argv[index + 1] && !String(argv[index + 1]).startsWith("-")) {
        index += 1;
      }
      continue;
    }

    if (key === "name") {
      options.name = readValue(index, inlineValue).trim();
      if (!inlineValue && argv[index + 1] && !String(argv[index + 1]).startsWith("-")) {
        index += 1;
      }
      continue;
    }

    if (key === "model") {
      options.model = readValue(index, inlineValue).trim();
      if (!inlineValue && argv[index + 1] && !String(argv[index + 1]).startsWith("-")) {
        index += 1;
      }
      continue;
    }

    if (key === "notes") {
      options.notes = readValue(index, inlineValue).trim();
      if (!inlineValue && argv[index + 1] && !String(argv[index + 1]).startsWith("-")) {
        index += 1;
      }
      continue;
    }

    if (key === "timeoutms") {
      const raw = readValue(index, inlineValue).trim();
      const parsed = Number.parseInt(raw, 10);
      if (Number.isFinite(parsed)) {
        options.timeoutMs = Math.max(20_000, Math.min(15 * 60 * 1000, parsed));
      }
      if (!inlineValue && argv[index + 1] && !String(argv[index + 1]).startsWith("-")) {
        index += 1;
      }
      continue;
    }

    if (key === "noprep") {
      options.runPrep = !parseBooleanFlag(inlineValue, true);
      if (!inlineValue && argv[index + 1] && !String(argv[index + 1]).startsWith("-")) {
        index += 1;
      }
      continue;
    }

    if (key === "runprep") {
      options.runPrep = parseBooleanFlag(inlineValue, true);
      if (!inlineValue && argv[index + 1] && !String(argv[index + 1]).startsWith("-")) {
        index += 1;
      }
      continue;
    }

    if (key === "nodefault") {
      options.makeDefault = !parseBooleanFlag(inlineValue, true);
      if (!inlineValue && argv[index + 1] && !String(argv[index + 1]).startsWith("-")) {
        index += 1;
      }
      continue;
    }

    if (key === "makedefault") {
      options.makeDefault = parseBooleanFlag(inlineValue, true);
      if (!inlineValue && argv[index + 1] && !String(argv[index + 1]).startsWith("-")) {
        index += 1;
      }
    }
  }

  options.mode = normalizeMode(options.mode);
  return options;
}

async function readAgencyActiveProject() {
  const configPath = path.join(ROOT, "agency.config.json");
  try {
    const raw = await fs.readFile(configPath, "utf8");
    const parsed = JSON.parse(raw);
    return String(parsed?.activeProject || "").trim();
  } catch {
    return "";
  }
}

function buildSuperAgentPrompt({ project = "", mode = "quick" }) {
  const projectLabel = String(project || "").trim() || "workspace-default";
  const selectedMode = normalizeMode(mode);
  return [
    "Initialize a Playground super agent session.",
    `Project focus: ${projectLabel}.`,
    `Bootstrap mode completed: ${selectedMode}.`,
    "Load these context artifacts first:",
    "- .agency/chat/latest-super-context.json",
    "- .agency/chat/latest-system-briefing.md",
    "- .agency/chat/latest-briefing.md",
    "Operate quickly and keep outputs deterministic.",
    "Boundary rule: ask for explicit scope confirmation before crossing unrelated project/commander internals.",
    "Reply exactly with READY when initialization is complete.",
  ].join("\n");
}

function fallbackSessionName(project = "") {
  const scope = String(project || "workspace")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const base = normalizeSessionName(scope ? `super-${scope}` : "super-agent", "super-agent");
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return normalizeSessionName(`${base}-${stamp}`, base);
}

function extractThreadId(outputLines = []) {
  for (const line of outputLines) {
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

function runProcess(command, args, { input = "", timeoutMs = 8 * 60 * 1000, shell = false } = {}) {
  return new Promise((resolve, reject) => {
    const outputLines = [];
    const child = spawn(command, args, {
      cwd: ROOT,
      env: process.env,
      windowsHide: true,
      shell,
    });

    let settled = false;
    const startedAt = Date.now();
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      try {
        child.kill("SIGTERM");
      } catch {
        // ignore
      }
      reject(new Error(`Command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const attachStream = (stream) => {
      if (!stream) {
        return;
      }
      const rl = readline.createInterface({ input: stream });
      rl.on("line", (line) => {
        const text = String(line || "");
        outputLines.push(text);
        if (outputLines.length > 500) {
          outputLines.splice(0, outputLines.length - 500);
        }
        process.stdout.write(`${text}\n`);
      });
    };

    attachStream(child.stdout);
    attachStream(child.stderr);

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
        exitCode: Number.isFinite(code) ? code : -1,
        durationMs: Date.now() - startedAt,
        outputLines,
      });
    });

    if (child.stdin) {
      if (input) {
        child.stdin.write(String(input));
      }
      child.stdin.end();
    }
  });
}

async function runNpmScript(script, scriptArgs = [], timeoutMs = 35 * 60 * 1000) {
  const npmBin = process.platform === "win32" ? "npm.cmd" : "npm";
  const args = ["run", script];
  if (scriptArgs.length > 0) {
    args.push("--", ...scriptArgs);
  }
  process.stdout.write(`>> npm run ${script}${scriptArgs.length ? ` -- ${scriptArgs.join(" ")}` : ""}\n`);
  return runProcess(npmBin, args, {
    timeoutMs,
    shell: process.platform === "win32",
  });
}

async function runCodexCreate(prompt, model, timeoutMs) {
  const args = ["exec", "--json"];
  if (model) {
    args.push("--model", model);
  }
  args.push("-");
  process.stdout.write(`>> codex ${args.join(" ")}\n`);
  return runProcess("codex", args, {
    input: prompt,
    timeoutMs,
    shell: process.platform === "win32",
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const activeProject = await readAgencyActiveProject();
  const project = String(options.project || process.env.npm_config_project || activeProject || "").trim();
  if (!validateProjectRef(project)) {
    throw new Error(`Invalid project value '${project}'.`);
  }

  const name = options.name ? normalizeSessionName(options.name, "") : fallbackSessionName(project);
  if (!name) {
    throw new Error("Invalid session name.");
  }

  const mode = normalizeMode(options.mode);
  const prepScript = mode === "full" ? "super:bootstrap:full" : "super:bootstrap";
  const prepArgs = project ? [`--project=${project}`] : [];
  let prepResult = null;

  if (options.runPrep) {
    prepResult = await runNpmScript(prepScript, prepArgs);
    if (!prepResult.ok) {
      throw new Error(`Bootstrap failed (exit ${prepResult.exitCode}).`);
    }
  }

  const prompt = buildSuperAgentPrompt({
    project,
    mode,
  });
  const codexResult = await runCodexCreate(prompt, options.model, options.timeoutMs);
  if (!codexResult.ok) {
    throw new Error(`Codex create failed (exit ${codexResult.exitCode}).`);
  }
  const threadId = extractThreadId(codexResult.outputLines);
  if (!threadId) {
    throw new Error("Codex create completed but no thread_id was found in output.");
  }

  const currentRegistry = await readCodexSessionRegistry(DEFAULT_CODEX_SESSION_REGISTRY_FILE);
  const updatedRegistry = upsertCodexSession(currentRegistry, {
    name,
    target: threadId,
    threadId,
    project,
    model: options.model,
    notes: options.notes || `Super agent (${mode}) created via desktop CLI.`,
    source: "desktop-super-agent",
    makeDefault: options.makeDefault,
  });
  const persistedRegistry = await writeCodexSessionRegistry(updatedRegistry, DEFAULT_CODEX_SESSION_REGISTRY_FILE);

  const summary = {
    ok: true,
    created: {
      name,
      target: threadId,
      threadId,
      project: project || "",
      mode,
    },
    prep: prepResult
      ? {
          script: prepScript,
          exitCode: prepResult.exitCode,
          durationMs: prepResult.durationMs,
        }
      : null,
    codex: {
      exitCode: codexResult.exitCode,
      durationMs: codexResult.durationMs,
      outputTail: codexResult.outputLines.slice(-25),
    },
    registry: {
      file: path.relative(ROOT, DEFAULT_CODEX_SESSION_REGISTRY_FILE).replace(/\\/g, "/"),
      defaultGlobal: persistedRegistry?.defaults?.global || "",
    },
    next: {
      resume: `codex resume ${threadId}`,
      relayWatch: `npm run commander:relay:codex:watch -- --session-name=${name}${project ? ` --project=${project}` : ""} --codex-use-last=false`,
    },
  };

  process.stdout.write("\nSuper-agent spawn complete.\n");
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`super-agent spawn failed: ${message}\n`);
  process.exit(1);
});
