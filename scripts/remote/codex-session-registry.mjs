import crypto from "node:crypto";
import path from "node:path";
import fsp from "node:fs/promises";

export const DEFAULT_CODEX_SESSION_REGISTRY_FILE = path.join(
  process.cwd(),
  ".agency",
  "remote",
  "codex-sessions.json"
);

const SAFE_SESSION_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/;
const SAFE_SESSION_TARGET = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$/;
const SAFE_PROJECT_REF = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;

function nowIso() {
  return new Date().toISOString();
}

function asString(value) {
  return String(value ?? "").trim();
}

export function validateSessionName(name) {
  return SAFE_SESSION_NAME.test(asString(name));
}

export function validateSessionTarget(target) {
  return SAFE_SESSION_TARGET.test(asString(target));
}

export function validateProjectRef(project) {
  if (!asString(project)) {
    return true;
  }
  return SAFE_PROJECT_REF.test(asString(project));
}

export function normalizeSessionName(name, fallback = "codex-chat") {
  const sanitized = asString(name)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  if (validateSessionName(sanitized)) {
    return sanitized;
  }
  return fallback;
}

export function createDefaultRegistry() {
  const now = nowIso();
  return {
    version: 1,
    updatedAt: now,
    sessions: [
      {
        id: crypto.randomUUID(),
        name: "codex-chat",
        target: "codex-chat",
        threadId: "",
        source: "bootstrap",
        notes: "Default session alias for relay automation.",
        projectHints: [],
        createdAt: now,
        updatedAt: now,
        retired: false,
        retiredAt: "",
      },
    ],
    defaults: {
      global: "codex-chat",
      perProject: {},
    },
  };
}

function normalizeSessionEntry(raw) {
  const name = normalizeSessionName(raw?.name || "codex-chat");
  const targetCandidate = asString(raw?.target || raw?.threadId || name);
  const target = validateSessionTarget(targetCandidate) ? targetCandidate : name;
  const projectHints = Array.isArray(raw?.projectHints)
    ? raw.projectHints.map((item) => asString(item)).filter((item) => validateProjectRef(item))
    : [];
  const createdAt = asString(raw?.createdAt || "") || nowIso();
  const updatedAt = asString(raw?.updatedAt || "") || createdAt;
  const retired = Boolean(raw?.retired);
  const retiredAt = retired ? asString(raw?.retiredAt || "") || updatedAt : "";

  return {
    id: asString(raw?.id || "") || crypto.randomUUID(),
    name,
    target,
    threadId: asString(raw?.threadId || ""),
    source: asString(raw?.source || "registry"),
    notes: asString(raw?.notes || ""),
    projectHints,
    createdAt,
    updatedAt,
    retired,
    retiredAt,
  };
}

export function normalizeRegistry(raw) {
  const base = createDefaultRegistry();
  const sessionsInput = Array.isArray(raw?.sessions) ? raw.sessions : [];
  const byName = new Map();
  for (const session of sessionsInput) {
    const normalized = normalizeSessionEntry(session);
    byName.set(normalized.name, normalized);
  }
  if (!byName.has("codex-chat")) {
    byName.set("codex-chat", base.sessions[0]);
  }

  const sessions = [...byName.values()];
  sessions.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  const defaultsRaw = raw?.defaults || {};
  const globalCandidate = asString(defaultsRaw.global || "");
  const perProjectRaw = defaultsRaw.perProject && typeof defaultsRaw.perProject === "object" ? defaultsRaw.perProject : {};

  const perProject = {};
  for (const [project, sessionName] of Object.entries(perProjectRaw)) {
    const projectValue = asString(project);
    const sessionValue = asString(sessionName);
    if (!validateProjectRef(projectValue)) {
      continue;
    }
    if (!validateSessionName(sessionValue)) {
      continue;
    }
    const match = sessions.find((entry) => entry.name === sessionValue && !entry.retired);
    if (!match) {
      continue;
    }
    perProject[projectValue] = sessionValue;
  }

  const globalMatch = sessions.find((entry) => entry.name === globalCandidate && !entry.retired);
  const fallbackGlobal = sessions.find((entry) => !entry.retired)?.name || "codex-chat";

  return {
    version: 1,
    updatedAt: asString(raw?.updatedAt || "") || nowIso(),
    sessions,
    defaults: {
      global: globalMatch ? globalMatch.name : fallbackGlobal,
      perProject,
    },
  };
}

export async function readCodexSessionRegistry(filePath = DEFAULT_CODEX_SESSION_REGISTRY_FILE) {
  try {
    const raw = await fsp.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw.replace(/^\uFEFF/, ""));
    return normalizeRegistry(parsed);
  } catch {
    return createDefaultRegistry();
  }
}

export async function writeCodexSessionRegistry(registry, filePath = DEFAULT_CODEX_SESSION_REGISTRY_FILE) {
  const normalized = normalizeRegistry({
    ...registry,
    updatedAt: nowIso(),
  });
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}

export function listCodexSessions(registry, options = {}) {
  const includeRetired = Boolean(options.includeRetired);
  const sessions = Array.isArray(registry?.sessions) ? registry.sessions : [];
  return sessions
    .filter((session) => includeRetired || !session.retired)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function ensureLiveSession(registry, name) {
  const targetName = normalizeSessionName(name, name);
  const session = (registry.sessions || []).find((entry) => entry.name === targetName);
  if (!session || session.retired) {
    throw new Error(`Session '${targetName}' not found or retired.`);
  }
  return session;
}

export function upsertCodexSession(registry, input) {
  const name = normalizeSessionName(input?.name || input?.target || "codex-chat");
  const target = asString(input?.target || "");
  const project = asString(input?.project || "");
  const now = nowIso();

  if (!validateSessionName(name)) {
    throw new Error("Invalid session name.");
  }
  if (!validateSessionTarget(target)) {
    throw new Error("Invalid session target.");
  }
  if (!validateProjectRef(project)) {
    throw new Error("Invalid project reference.");
  }

  const sessions = Array.isArray(registry.sessions) ? [...registry.sessions] : [];
  const existingIndex = sessions.findIndex((entry) => entry.name === name);
  const existing = existingIndex >= 0 ? sessions[existingIndex] : null;
  const projectHints = [...new Set([...(existing?.projectHints || []), project].filter(Boolean))];

  const next = {
    id: existing?.id || crypto.randomUUID(),
    name,
    target,
    threadId: asString(input?.threadId || existing?.threadId || ""),
    source: asString(input?.source || existing?.source || "manual"),
    notes: asString(input?.notes || existing?.notes || ""),
    projectHints,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    retired: false,
    retiredAt: "",
  };

  if (existingIndex >= 0) {
    sessions[existingIndex] = next;
  } else {
    sessions.push(next);
  }

  const normalized = normalizeRegistry({
    ...registry,
    sessions,
    updatedAt: now,
  });

  if (input?.makeDefault) {
    return setDefaultCodexSession(normalized, {
      name,
      project,
    });
  }
  return normalized;
}

export function setDefaultCodexSession(registry, input) {
  const name = normalizeSessionName(input?.name || "codex-chat");
  const project = asString(input?.project || "");
  if (!validateProjectRef(project)) {
    throw new Error("Invalid project reference.");
  }
  ensureLiveSession(registry, name);

  const next = normalizeRegistry(registry);
  if (project) {
    next.defaults.perProject[project] = name;
  } else {
    next.defaults.global = name;
  }
  next.updatedAt = nowIso();
  return next;
}

export function retireCodexSession(registry, input) {
  const name = normalizeSessionName(input?.name || "");
  const sessions = (registry.sessions || []).map((entry) => {
    if (entry.name !== name) {
      return entry;
    }
    return {
      ...entry,
      retired: true,
      retiredAt: nowIso(),
      updatedAt: nowIso(),
    };
  });

  const next = normalizeRegistry({
    ...registry,
    sessions,
    updatedAt: nowIso(),
  });

  if (next.defaults.global === name) {
    const fallback = next.sessions.find((entry) => !entry.retired)?.name || "codex-chat";
    next.defaults.global = fallback;
  }
  for (const [project, sessionName] of Object.entries(next.defaults.perProject || {})) {
    if (sessionName === name) {
      delete next.defaults.perProject[project];
    }
  }
  next.updatedAt = nowIso();
  return next;
}

export function resolveCodexSessionTarget(registry, input = {}) {
  const explicitName = asString(input.name || "");
  const project = asString(input.project || "");
  let resolvedName = "";
  let source = "";

  if (explicitName) {
    resolvedName = normalizeSessionName(explicitName, explicitName);
    source = "explicit";
  } else if (project && registry?.defaults?.perProject?.[project]) {
    resolvedName = registry.defaults.perProject[project];
    source = "project-default";
  } else if (registry?.defaults?.global) {
    resolvedName = registry.defaults.global;
    source = "global-default";
  } else {
    resolvedName = "codex-chat";
    source = "fallback";
  }

  const session = (registry?.sessions || []).find((entry) => entry.name === resolvedName && !entry.retired);
  if (!session) {
    return null;
  }

  return {
    source,
    session,
    name: session.name,
    target: session.target,
  };
}
