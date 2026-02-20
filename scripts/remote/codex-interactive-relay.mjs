import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  DEFAULT_CODEX_SESSION_REGISTRY_FILE,
  readCodexSessionRegistry,
  resolveCodexSessionTarget,
  validateProjectRef,
} from "./codex-session-registry.mjs";

const ROOT = process.cwd();
const REMOTE_DIR = path.join(ROOT, ".agency", "remote");
const INBOX_DIR = path.join(REMOTE_DIR, "inbox");
const OUTBOX_DIR = path.join(REMOTE_DIR, "outbox");
const STATUS_FILE = path.join(REMOTE_DIR, "agent-status.json");
const ACTIVITY_FILE = path.join(REMOTE_DIR, "activity.jsonl");
const DEFAULT_MEMORY_FILE = path.join(ROOT, "mcp", "data", "memory.jsonl");
const AGENT_STATES = new Set(["idle", "pending", "thinking", "working", "blocked"]);

function nowIso() {
  return new Date().toISOString();
}

function nowFileStamp() {
  return nowIso().replace(/[:.]/g, "-");
}

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, parsed));
}

function parseArgs(argv) {
  const output = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    if (arg.includes("=")) {
      const [key, ...rest] = arg.slice(2).split("=");
      output[key] = rest.join("=");
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      output[key] = "true";
      continue;
    }
    output[key] = next;
    i += 1;
  }
  return output;
}

function parseBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function sanitizeName(value, fallback = "default") {
  const sanitized = String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return sanitized || fallback;
}

function normalizeAgentState(state) {
  const normalized = String(state || "").trim().toLowerCase();
  if (AGENT_STATES.has(normalized)) {
    return normalized;
  }
  return "idle";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureFile(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, "", "utf8");
  }
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const normalized = raw.replace(/^\uFEFF/, "").trim();
    if (!normalized) {
      return fallback;
    }
    return JSON.parse(normalized);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function writeStatus({ state, message, source }) {
  const payload = {
    state: normalizeAgentState(state),
    message: String(message || "").slice(0, 5000),
    updatedAt: nowIso(),
    source: String(source || "relay-codex"),
  };
  await writeJson(STATUS_FILE, payload);
  return payload;
}

async function appendActivity({
  type = "event",
  state = "",
  message = "",
  source = "relay-codex",
  meta = {},
}) {
  const payload = {
    time: nowIso(),
    type: String(type || "event").slice(0, 80),
    state: state ? normalizeAgentState(state) : "",
    message: String(message || "").slice(0, 2000),
    source: String(source || "relay-codex").slice(0, 120),
    meta: meta && typeof meta === "object" ? meta : {},
  };
  await fs.mkdir(path.dirname(ACTIVITY_FILE), { recursive: true });
  await fs.appendFile(ACTIVITY_FILE, `${JSON.stringify(payload)}\n`, "utf8");
  return payload;
}

function extractRemoteNoteMessage(raw) {
  const marker = "## Message";
  const markerIndex = raw.indexOf(marker);
  if (markerIndex < 0) {
    return raw.trim();
  }
  return raw.slice(markerIndex + marker.length).trim();
}

function buildReplyMarkdown({ message, inReplyTo = "" }) {
  return [
    "# Codex Response",
    "",
    `- Time: ${nowIso()}`,
    `- InReplyTo: ${inReplyTo || "(none)"}`,
    "",
    "## Message",
    "",
    String(message || "").trim(),
    "",
  ].join("\n");
}

async function appendAgentReply({ message, inReplyTo = "" }) {
  await fs.mkdir(OUTBOX_DIR, { recursive: true });
  const fileName = `${nowFileStamp()}.md`;
  const filePath = path.join(OUTBOX_DIR, fileName);
  await fs.writeFile(filePath, buildReplyMarkdown({ message, inReplyTo }), "utf8");
  return {
    fileName,
    filePath: path.relative(ROOT, filePath).replace(/\\/g, "/"),
  };
}

async function appendProjectDocumentation({
  docsFilePath,
  sessionName,
  project,
  userFile,
  userMessage,
  assistantFile,
  assistantMessage,
}) {
  if (!docsFilePath) {
    return;
  }
  const block = [
    `## ${nowIso()} | session=${sessionName}`,
    `- Project: ${project || "(none)"}`,
    `- UserNote: ${userFile}`,
    `- ReplyNote: ${assistantFile}`,
    "",
    "### User",
    String(userMessage || "").trim() || "(empty)",
    "",
    "### Assistant",
    String(assistantMessage || "").trim() || "(empty)",
    "",
  ].join("\n");
  await fs.mkdir(path.dirname(docsFilePath), { recursive: true });
  await fs.appendFile(docsFilePath, `${block}\n`, "utf8");
}

async function listMarkdownNames(directory) {
  let entries = [];
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

function afterMarker(sortedNames, marker) {
  if (!marker) return sortedNames;
  return sortedNames.filter((name) => name.localeCompare(marker) > 0);
}

function clip(text, max = 2000) {
  const compact = String(text || "").replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max)}...`;
}

async function readMemoryGraph(memoryFilePath) {
  try {
    const raw = await fs.readFile(memoryFilePath, "utf8");
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const graph = { entities: [], relations: [] };
    for (const line of lines) {
      let item = null;
      try {
        item = JSON.parse(line);
      } catch {
        continue;
      }
      if (item?.type === "entity") {
        graph.entities.push({
          name: String(item.name || ""),
          entityType: String(item.entityType || "note"),
          observations: Array.isArray(item.observations) ? item.observations.map((obs) => String(obs || "")) : [],
        });
      } else if (item?.type === "relation") {
        graph.relations.push({
          from: String(item.from || ""),
          to: String(item.to || ""),
          relationType: String(item.relationType || ""),
        });
      }
    }
    return graph;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return { entities: [], relations: [] };
    }
    throw error;
  }
}

async function writeMemoryGraph(memoryFilePath, graph) {
  const lines = [
    ...graph.entities.map((entity) =>
      JSON.stringify({
        type: "entity",
        name: entity.name,
        entityType: entity.entityType,
        observations: entity.observations,
      })
    ),
    ...graph.relations.map((relation) =>
      JSON.stringify({
        type: "relation",
        from: relation.from,
        to: relation.to,
        relationType: relation.relationType,
      })
    ),
  ];
  await fs.mkdir(path.dirname(memoryFilePath), { recursive: true });
  await fs.writeFile(memoryFilePath, lines.join("\n"), "utf8");
}

function ensureEntity(graph, name, entityType = "conversation") {
  let entity = graph.entities.find((entry) => entry.name === name);
  if (!entity) {
    entity = {
      name,
      entityType,
      observations: [],
    };
    graph.entities.push(entity);
  }
  return entity;
}

async function addMemoryObservation(memoryFilePath, entityName, observation) {
  const graph = await readMemoryGraph(memoryFilePath);
  const entity = ensureEntity(graph, entityName, "conversation");
  if (!entity.observations.includes(observation)) {
    entity.observations.push(observation);
  }
  await writeMemoryGraph(memoryFilePath, graph);
}

async function getRecentMemory(memoryFilePath, entityName, maxItems) {
  const graph = await readMemoryGraph(memoryFilePath);
  const entity = graph.entities.find((entry) => entry.name === entityName);
  if (!entity) return [];
  return entity.observations.slice(-maxItems);
}

function buildRelayPrompt({ sessionName, memoryItems, userMessage, noteFile }) {
  const memoryBlock = memoryItems.length ? memoryItems.map((item) => `- ${item}`).join("\n") : "- (no prior memory)";
  return [
    "You are responding through a remote relay panel chat.",
    "Keep responses concise, actionable, and plain text (no markdown headings).",
    "If context is missing, ask exactly one clarifying question.",
    "",
    `Session: ${sessionName}`,
    `Inbox file: ${noteFile}`,
    "",
    "Recent memory:",
    memoryBlock,
    "",
    "Latest user message:",
    userMessage,
    "",
    "Reply now:",
  ].join("\n");
}

async function runCodexResume(prompt, options, onEvent) {
  const args = ["exec", "resume"];
  if (options.useLast) {
    args.push("--last");
  } else if (options.sessionId) {
    args.push(options.sessionId);
  } else {
    throw new Error("No session selected. Use --codex-session-id=<id> or --codex-use-last=true.");
  }
  args.push("--json");
  if (options.model) {
    args.push("--model", options.model);
  }
  if (options.profile) {
    args.push("--profile", options.profile);
  }
  if (options.fullAuto) {
    args.push("--full-auto");
  }
  if (options.skipGitRepoCheck) {
    args.push("--skip-git-repo-check");
  }
  args.push("-");

  const emitEvent = (event) => {
    if (!onEvent || typeof onEvent !== "function") {
      return;
    }
    try {
      const result = onEvent(event);
      if (result && typeof result.then === "function") {
        result.catch(() => null);
      }
    } catch {
      // ignore callback errors; relay should continue
    }
  };

  return new Promise((resolve, reject) => {
    const child = spawn("codex", args, {
      cwd: ROOT,
      env: process.env,
      windowsHide: true,
      shell: process.platform === "win32",
    });

    let stdout = "";
    let stderr = "";
    let buffer = "";
    const messages = [];
    let thinkingNoticeSent = false;

    const handleJsonEvent = (event) => {
      if (!event || typeof event !== "object") {
        return;
      }

      if (event.type === "turn.started") {
        emitEvent({
          type: "thinking",
          state: "thinking",
          message: "Codex is thinking.",
        });
        return;
      }

      if (event.type === "turn.completed") {
        emitEvent({
          type: "turn_complete",
          state: "working",
          message: "Codex completed a turn.",
        });
        return;
      }

      if (event.type === "item.completed" && event.item && typeof event.item === "object") {
        const itemType = String(event.item.type || "");
        if (itemType === "reasoning") {
          if (!thinkingNoticeSent) {
            thinkingNoticeSent = true;
            emitEvent({
              type: "thinking",
              state: "thinking",
              message: "Codex is reasoning through the request.",
            });
          }
          return;
        }
        if (itemType === "agent_message") {
          const text = String(event.item.text || "").trim();
          if (text) {
            messages.push(text);
          }
          emitEvent({
            type: "assistant_message",
            state: "working",
            message: "Codex produced a response draft.",
          });
          return;
        }
      }
    };

    const parseLines = (textChunk) => {
      buffer += textChunk;
      while (true) {
        const newlineIndex = buffer.indexOf("\n");
        if (newlineIndex < 0) {
          break;
        }
        const rawLine = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (!rawLine) {
          continue;
        }
        let parsed = null;
        try {
          parsed = JSON.parse(rawLine);
        } catch {
          continue;
        }
        handleJsonEvent(parsed);
      }
    };

    let killedForTimeout = false;
    const timer = setTimeout(() => {
      killedForTimeout = true;
      child.kill();
    }, options.timeoutMs);

    child.stdout.on("data", (chunk) => {
      const text = String(chunk);
      stdout += text;
      parseLines(text);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      if (killedForTimeout) {
        reject(new Error(`Codex resume timed out after ${options.timeoutMs}ms.`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`Codex resume failed (exit ${code}): ${stderr || stdout}`));
        return;
      }

      if (buffer.trim()) {
        let parsed = null;
        try {
          parsed = JSON.parse(buffer.trim());
          handleJsonEvent(parsed);
        } catch {
          // ignore trailing non-json line
        }
      }

      const reply = messages.filter(Boolean).join("\n\n").trim();
      if (!reply) {
        reject(new Error("Codex resume returned no assistant message."));
        return;
      }
      resolve(reply);
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

function logFeed(role, fileName, message) {
  const head = `[${nowIso()}] [${role}] ${fileName}`;
  process.stdout.write(`${head}\n${message.trim() || "(empty)"}\n\n`);
}

async function processInboxFile(fileName, config) {
  const filePath = path.join(INBOX_DIR, fileName);
  const raw = await fs.readFile(filePath, "utf8");
  const userMessage = extractRemoteNoteMessage(raw).trim();
  if (!userMessage) {
    return;
  }

  logFeed("user", fileName, userMessage);
  await appendActivity({
    type: "user_message",
    state: "pending",
    message: `Received user message (${fileName}).`,
    source: "relay-codex",
    meta: {
      file: fileName,
      project: config.project || "",
    },
  });
  const userObs = `[${nowIso()}] user(${fileName}): ${clip(userMessage, 1800)}`;
  await addMemoryObservation(config.memoryFilePath, config.memoryEntity, userObs);

  if (config.dryRun) {
    const dryReply = `DRY RUN reply for ${fileName}: relay module is active.`;
    const reply = await appendAgentReply({
      message: dryReply,
      inReplyTo: fileName,
    });
    await addMemoryObservation(
      config.memoryFilePath,
      config.memoryEntity,
      `[${nowIso()}] assistant(${reply.fileName}): ${clip(dryReply, 1800)}`
    );
    await writeStatus({
      state: "idle",
      message: `Reply sent: ${reply.fileName}`,
      source: "relay-codex-dry-run",
    });
    await appendActivity({
      type: "assistant_reply",
      state: "idle",
      message: `Dry-run reply generated (${reply.fileName}).`,
      source: "relay-codex",
      meta: {
        file: reply.fileName,
        inReplyTo: fileName,
      },
    });
    await appendProjectDocumentation({
      docsFilePath: config.docsFilePath,
      sessionName: config.sessionName,
      project: config.project,
      userFile: fileName,
      userMessage,
      assistantFile: reply.fileName,
      assistantMessage: dryReply,
    });
    return;
  }

  await writeStatus({
    state: "working",
    message: `Processing ${fileName} via Codex resume...`,
    source: "relay-codex",
  });
  await appendActivity({
    type: "codex_start",
    state: "working",
    message: `Starting Codex resume for ${fileName}.`,
    source: "relay-codex",
    meta: {
      file: fileName,
      sessionName: config.sessionName,
      sessionId: config.sessionId || "",
    },
  });

  const memoryItems = await getRecentMemory(config.memoryFilePath, config.memoryEntity, config.historyItems);
  const prompt = buildRelayPrompt({
    sessionName: config.sessionName,
    memoryItems,
    userMessage,
    noteFile: fileName,
  });

  const replyMessage = await runCodexResume(prompt, config, async (event) => {
    const nextState = event?.state ? normalizeAgentState(event.state) : "";
    if (nextState) {
      await writeStatus({
        state: nextState,
        message: String(event?.message || "").slice(0, 300) || `Codex state: ${nextState}`,
        source: "relay-codex",
      }).catch(() => null);
    }
    await appendActivity({
      type: String(event?.type || "codex_event"),
      state: nextState,
      message: String(event?.message || "Codex event."),
      source: "relay-codex",
      meta: {
        file: fileName,
      },
    }).catch(() => null);
  });
  const reply = await appendAgentReply({
    message: replyMessage,
    inReplyTo: fileName,
  });
  await addMemoryObservation(
    config.memoryFilePath,
    config.memoryEntity,
    `[${nowIso()}] assistant(${reply.fileName}): ${clip(replyMessage, 1800)}`
  );
  await writeStatus({
    state: "idle",
    message: `Reply sent: ${reply.fileName}`,
    source: "relay-codex",
  });
  await appendActivity({
    type: "assistant_reply",
    state: "idle",
    message: `Reply sent (${reply.fileName}).`,
    source: "relay-codex",
    meta: {
      file: reply.fileName,
      inReplyTo: fileName,
    },
  });
  await appendProjectDocumentation({
    docsFilePath: config.docsFilePath,
    sessionName: config.sessionName,
    project: config.project,
    userFile: fileName,
    userMessage,
    assistantFile: reply.fileName,
    assistantMessage: replyMessage,
  });
}

async function printNewOutboxMessages(lastOutboxFile) {
  const outboxNames = await listMarkdownNames(OUTBOX_DIR);
  const fresh = afterMarker(outboxNames, lastOutboxFile);
  for (const fileName of fresh) {
    const filePath = path.join(OUTBOX_DIR, fileName);
    const raw = await fs.readFile(filePath, "utf8");
    const message = extractRemoteNoteMessage(raw);
    logFeed("assistant", fileName, message);
    lastOutboxFile = fileName;
  }
  return lastOutboxFile;
}

async function runLoop(config, once) {
  await fs.mkdir(INBOX_DIR, { recursive: true });
  await fs.mkdir(OUTBOX_DIR, { recursive: true });
  await ensureFile(config.memoryFilePath);
  await ensureFile(config.stateFilePath);

  await writeStatus({
    state: "idle",
    message: config.dryRun
      ? "Codex interactive relay started (dry run)."
      : "Codex interactive relay started.",
    source: "relay-codex",
  });
  await appendActivity({
    type: "relay_start",
    state: "idle",
    message: config.dryRun ? "Relay started in dry-run mode." : "Relay started.",
    source: "relay-codex",
    meta: {
      sessionName: config.sessionName,
      project: config.project || "",
    },
  }).catch(() => null);

  const state = await readJson(config.stateFilePath, {
    session: config.sessionName,
    lastInboxFile: "",
    lastOutboxFile: "",
  });

  if (config.startFromLatest) {
    if (!state.lastInboxFile) {
      const inboxNames = await listMarkdownNames(INBOX_DIR);
      state.lastInboxFile = inboxNames[inboxNames.length - 1] || "";
    }
    if (!state.lastOutboxFile) {
      const outboxNames = await listMarkdownNames(OUTBOX_DIR);
      state.lastOutboxFile = outboxNames[outboxNames.length - 1] || "";
    }
    await writeJson(config.stateFilePath, state);
  }

  process.stdout.write(
    [
      "[relay-codex] watching inbox/outbox",
      `[relay-codex] session=${config.sessionName}`,
      `[relay-codex] memory=${path.relative(ROOT, config.memoryFilePath).replace(/\\/g, "/")}`,
      config.docsFilePath ? `[relay-codex] docs=${path.relative(ROOT, config.docsFilePath).replace(/\\/g, "/")}` : "[relay-codex] docs=(disabled)",
      config.dryRun
        ? "[relay-codex] mode=dry-run (no codex calls)"
        : config.useLast
          ? "[relay-codex] codex target=resume --last"
          : `[relay-codex] codex target=session ${config.sessionId}`,
      "",
    ].join("\n")
  );

  let keepRunning = true;
  process.on("SIGINT", () => {
    keepRunning = false;
  });
  process.on("SIGTERM", () => {
    keepRunning = false;
  });

  while (keepRunning) {
    const inboxNames = await listMarkdownNames(INBOX_DIR);
    const pending = afterMarker(inboxNames, state.lastInboxFile);

    for (const fileName of pending) {
      await writeStatus({
        state: "pending",
        message: `Queued inbox note: ${fileName}`,
        source: "relay-codex",
      });
      try {
        await processInboxFile(fileName, config);
      } catch (error) {
        await writeStatus({
          state: "blocked",
          message: String(error?.message || error),
          source: "relay-codex",
        });
        await appendActivity({
          type: "error",
          state: "blocked",
          message: String(error?.message || error),
          source: "relay-codex",
          meta: {
            file: fileName,
          },
        }).catch(() => null);
        process.stderr.write(`[relay-codex] failed ${fileName}: ${String(error?.message || error)}\n`);
      } finally {
        state.lastInboxFile = fileName;
      }
      await writeJson(config.stateFilePath, state);
    }

    state.lastOutboxFile = await printNewOutboxMessages(state.lastOutboxFile);
    await writeJson(config.stateFilePath, state);

    if (once) {
      break;
    }
    await sleep(config.pollMs);
  }

  await writeStatus({
    state: "idle",
    message: "Codex interactive relay stopped.",
    source: "relay-codex",
  });
  await appendActivity({
    type: "relay_stop",
    state: "idle",
    message: "Relay stopped.",
    source: "relay-codex",
    meta: {
      sessionName: config.sessionName,
      project: config.project || "",
    },
  }).catch(() => null);
}

async function main() {
  const [subcommand = "watch", ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  const sessionName = sanitizeName(args["session-name"] || "codex-chat");
  const project = String(args.project || "").trim();
  const projectSlug = project ? sanitizeName(project, "project") : "";
  const memoryFilePath = path.resolve(ROOT, args["memory-file"] || DEFAULT_MEMORY_FILE);
  const memoryEntity = projectSlug ? `remote-chat-project:${projectSlug}` : `remote-chat-session:${sessionName}`;
  const stateFilePath = path.join(REMOTE_DIR, `relay-state-${sessionName}.json`);
  const registryFilePath = path.resolve(ROOT, args["registry-file"] || DEFAULT_CODEX_SESSION_REGISTRY_FILE);
  const autoDocs = parseBool(args["auto-docs"], true);
  const docsCandidate = autoDocs ? String(args["docs-file"] || "").trim() || (projectSlug ? path.join(".agency", "remote", "project-memory", `${projectSlug}.md`) : "") : "";
  const docsFilePath = docsCandidate ? path.resolve(ROOT, docsCandidate) : "";

  if (!validateProjectRef(project)) {
    throw new Error("Invalid --project value.");
  }

  const config = {
    sessionName,
    memoryFilePath,
    memoryEntity,
    stateFilePath,
    registryFilePath,
    project,
    docsFilePath,
    pollMs: clampInt(args["poll-ms"], 1200, 400, 60000),
    historyItems: clampInt(args.history, 16, 2, 120),
    useLast: parseBool(args["codex-use-last"], true),
    sessionId: String(args["codex-session-id"] || "").trim(),
    model: String(args.model || "").trim(),
    profile: String(args.profile || "").trim(),
    fullAuto: parseBool(args["full-auto"], false),
    skipGitRepoCheck: parseBool(args["skip-git-repo-check"], true),
    timeoutMs: clampInt(args["timeout-ms"], 15 * 60 * 1000, 15000, 120 * 60 * 1000),
    dryRun: parseBool(args["dry-run"], false),
    startFromLatest: parseBool(args["start-from-latest"], true),
  };

  if (!config.useLast) {
    const registry = await readCodexSessionRegistry(config.registryFilePath);
    if (config.sessionId) {
      const alias = resolveCodexSessionTarget(registry, {
        name: config.sessionId,
        project: config.project,
      });
      if (alias?.target) {
        config.sessionId = alias.target;
      }
    } else {
      const resolvedByName = resolveCodexSessionTarget(registry, {
        name: config.sessionName,
        project: config.project,
      });
      const resolved = resolvedByName || resolveCodexSessionTarget(registry, { project: config.project });
      if (resolved?.target) {
        config.sessionId = resolved.target;
      }
    }
    if (!config.sessionId) {
      throw new Error("No Codex session resolved. Configure registry default or pass --codex-session-id.");
    }
  }

  if (!["watch", "once"].includes(subcommand)) {
    throw new Error("Usage: node scripts/remote/codex-interactive-relay.mjs <watch|once> [--flags]");
  }

  await runLoop(config, subcommand === "once");
}

main().catch(async (error) => {
  process.stderr.write(`[relay-codex] ${String(error?.message || error)}\n`);
  await writeStatus({
    state: "blocked",
    message: String(error?.message || error),
    source: "relay-codex",
  }).catch(() => null);
  await appendActivity({
    type: "error",
    state: "blocked",
    message: String(error?.message || error),
    source: "relay-codex",
  }).catch(() => null);
  process.exitCode = 1;
});
