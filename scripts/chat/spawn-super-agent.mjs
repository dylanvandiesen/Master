import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { spawn } from "node:child_process";
import {
  readAgentProfileRegistry,
  resolveAgentProfile,
} from "../remote/agent-profile-registry.mjs";
import {
  DEFAULT_CODEX_SESSION_REGISTRY_FILE,
  normalizeSessionName,
  readCodexSessionRegistry,
  upsertCodexSession,
  validateProjectRef,
  writeCodexSessionRegistry,
} from "../remote/codex-session-registry.mjs";

const ROOT = process.cwd();
const MODES = new Set(["quick", "standard", "full"]);
const CONTEXTS = new Set(["project", "system", "commander"]);

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

function normalizeContext(value) {
  const normalized = String(value || "project")
    .trim()
    .toLowerCase();
  return CONTEXTS.has(normalized) ? normalized : "project";
}

function parseArgs(argv) {
  const options = {
    mode: "",
    project: "",
      agentProfile: "",
      context: "",
      codexProfile: "",
    name: "",
    model: "",
    notes: "",
    runPrep: null,
    makeDefault: null,
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

    if (key === "context" || key === "contextmode") {
      options.context = normalizeContext(readValue(index, inlineValue));
      if (!inlineValue && argv[index + 1] && !String(argv[index + 1]).startsWith("-")) {
        index += 1;
      }
      continue;
    }

    if (key === "agentprofile") {
      options.agentProfile = readValue(index, inlineValue).trim();
      if (!inlineValue && argv[index + 1] && !String(argv[index + 1]).startsWith("-")) {
        index += 1;
      }
      continue;
    }

    if (key === "codexprofile" || key === "profile") {
      options.codexProfile = readValue(index, inlineValue).trim();
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

function buildContextArtifactList(mode = "quick", context = "project") {
  const selectedMode = normalizeMode(mode);
  const selectedContext = normalizeContext(context);
  const artifacts = [".agency/chat/latest-super-context.json"];
  if (selectedContext === "commander") {
    artifacts.push(".agency/chat/latest-commander-briefing.md");
    if (selectedMode === "full") {
      artifacts.push(".agency/chat/latest-system-briefing.md");
    }
    return artifacts;
  }
  if (selectedContext === "system") {
    artifacts.push(".agency/chat/latest-system-briefing.md");
    return artifacts;
  }
  if (selectedMode === "standard" || selectedMode === "full") {
    artifacts.push(".agency/chat/latest-system-briefing.md");
  }
  artifacts.push(".agency/chat/latest-briefing.md");
  return artifacts;
}

function buildSuperAgentPrompt({ project = "", mode = "quick", context = "project" }) {
  const projectLabel = String(project || "").trim() || "workspace-default";
  const selectedMode = normalizeMode(mode);
  const selectedContext = normalizeContext(context);
  const contextArtifacts = buildContextArtifactList(selectedMode, selectedContext);
  return [
    "Initialize a Playground super agent session.",
    `Project focus: ${projectLabel}.`,
    `Launch context: ${selectedContext}.`,
    `Bootstrap mode completed: ${selectedMode}.`,
    "Load these context artifacts first:",
    ...contextArtifacts.map((artifact) => `- ${artifact}`),
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

async function runCodexCreate(prompt, model, codexProfile, timeoutMs) {
  const args = ["exec", "--json"];
  if (model) {
    args.push("--model", model);
  }
  if (codexProfile) {
    args.push("--profile", codexProfile);
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
  const requestedProject = String(options.project || process.env.npm_config_project || activeProject || "").trim();
  const agentProfileRegistry = await readAgentProfileRegistry().catch(() => null);
  const resolvedAgentProfile = agentProfileRegistry
    ? resolveAgentProfile(agentProfileRegistry, {
        name: options.agentProfile,
        project: requestedProject,
      })
    : null;
  const project = String(requestedProject || resolvedAgentProfile?.project || "").trim();
  if (!validateProjectRef(project)) {
    throw new Error(`Invalid project value '${project}'.`);
  }

  const mode = normalizeMode(options.mode || resolvedAgentProfile?.mode || "quick");
  const context = normalizeContext(options.context || process.env.npm_config_context || "project");
  const model = String(options.model || resolvedAgentProfile?.model || "").trim();
  const codexProfile = String(options.codexProfile || resolvedAgentProfile?.codexProfile || "").trim();
  const runPrep = typeof options.runPrep === "boolean"
    ? options.runPrep
    : Boolean(resolvedAgentProfile?.runPrep ?? true);
  const makeDefault = typeof options.makeDefault === "boolean"
    ? options.makeDefault
    : Boolean(resolvedAgentProfile?.makeDefaultSession ?? true);
  const timeoutMs = Number.isFinite(Number(options.timeoutMs))
    ? options.timeoutMs
    : Number(resolvedAgentProfile?.timeoutMs || 8 * 60 * 1000);
  const requestedName = String(options.name || resolvedAgentProfile?.sessionName || "").trim();
  const name = requestedName ? normalizeSessionName(requestedName, "") : fallbackSessionName(project);
  if (!name) {
    throw new Error("Invalid session name.");
  }
  const prepScriptByMode = {
    quick: "super:bootstrap",
    standard: "super:bootstrap:standard",
    full: "super:bootstrap:full",
  };
  const prepScript = prepScriptByMode[mode] || "super:bootstrap";
  const prepArgs = project ? [`--project=${project}`] : [];
  let prepResult = null;

  if (runPrep) {
    prepResult = await runNpmScript(prepScript, prepArgs);
    if (!prepResult.ok) {
      throw new Error(`Bootstrap failed (exit ${prepResult.exitCode}).`);
    }
  }

  const prompt = buildSuperAgentPrompt({
    project,
    mode,
    context,
  });
  const codexResult = await runCodexCreate(prompt, model, codexProfile, timeoutMs);
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
    notes: options.notes || `Super agent (${mode}) created via desktop CLI.`,
    source: "desktop-super-agent",
    makeDefault,
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
      agentProfileName: resolvedAgentProfile?.name || "",
      model,
      codexProfile,
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
      profile: codexProfile,
    },
    agentProfile: resolvedAgentProfile
      ? {
          name: resolvedAgentProfile.name,
          project: resolvedAgentProfile.project,
          mode: resolvedAgentProfile.mode,
          model: resolvedAgentProfile.model,
          codexProfile: resolvedAgentProfile.codexProfile,
        }
      : null,
    registry: {
      file: path.relative(ROOT, DEFAULT_CODEX_SESSION_REGISTRY_FILE).replace(/\\/g, "/"),
      defaultGlobal: persistedRegistry?.defaults?.global || "",
    },
    next: {
      resume: `codex resume ${threadId}`,
      relayWatch: `npm run commander:relay:codex:watch -- --session-name=${name}${project ? ` --project=${project}` : ""} --bootstrap-mode=${mode} --codex-use-last=false`,
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
