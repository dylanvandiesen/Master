import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const REMOTE_DIR = path.join(ROOT, ".agency", "remote");
const OUTBOX_DIR = path.join(REMOTE_DIR, "outbox");
const STATUS_FILE = path.join(REMOTE_DIR, "agent-status.json");
const ALLOWED_STATES = new Set(["idle", "pending", "thinking", "working", "blocked"]);

function nowIso() {
  return new Date().toISOString();
}

function nowFileStamp() {
  return nowIso().replace(/[:.]/g, "-");
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    if (arg.includes("=")) {
      const [k, ...rest] = arg.slice(2).split("=");
      out[k] = rest.join("=");
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      out[key] = "true";
      continue;
    }
    out[key] = next;
    i += 1;
  }
  return out;
}

function normalizeState(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (ALLOWED_STATES.has(value)) {
    return value;
  }
  return "idle";
}

async function writeStatus({ state, message, source = "manual-cli" }) {
  const payload = {
    state: normalizeState(state),
    message: String(message || "").slice(0, 5000),
    updatedAt: nowIso(),
    source,
  };
  await fs.mkdir(REMOTE_DIR, { recursive: true });
  await fs.writeFile(STATUS_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
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

async function writeReply({ message, inReplyTo = "", state = "idle" }) {
  if (!String(message || "").trim()) {
    throw new Error("Missing --message for reply command.");
  }

  await fs.mkdir(OUTBOX_DIR, { recursive: true });
  const fileName = `${nowFileStamp()}.md`;
  const filePath = path.join(OUTBOX_DIR, fileName);
  await fs.writeFile(filePath, buildReplyMarkdown({ message, inReplyTo }), "utf8");
  const status = await writeStatus({
    state,
    message: "Reply published.",
    source: "manual-cli-reply",
  });
  return {
    fileName,
    filePath: path.relative(ROOT, filePath).replace(/\\/g, "/"),
    status,
  };
}

async function main() {
  const [command = "", ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  if (command === "status") {
    const status = await writeStatus({
      state: args.state,
      message: args.message || "",
      source: args.source || "manual-cli-status",
    });
    console.log(JSON.stringify({ ok: true, status }, null, 2));
    return;
  }

  if (command === "reply") {
    const result = await writeReply({
      message: args.message || "",
      inReplyTo: args.inReplyTo || "",
      state: args.state || "idle",
    });
    console.log(JSON.stringify({ ok: true, reply: result }, null, 2));
    return;
  }

  console.error("Usage:");
  console.error("  node scripts/remote/publish-agent-update.mjs status --state=working --message=\"Investigating\" [--source=manual]");
  console.error("  node scripts/remote/publish-agent-update.mjs reply --message=\"Done\" [--inReplyTo=file.md] [--state=idle]");
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(String(error?.message || error));
  process.exitCode = 1;
});
