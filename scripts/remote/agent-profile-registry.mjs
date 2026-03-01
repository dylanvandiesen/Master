import crypto from "node:crypto";
import path from "node:path";
import fsp from "node:fs/promises";

export const DEFAULT_AGENT_PROFILE_REGISTRY_FILE = path.join(
  process.cwd(),
  ".agency",
  "remote",
  "agent-profiles.json"
);

const SAFE_AGENT_PROFILE_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/;
const SAFE_PROJECT_REF = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
const AGENT_KINDS = new Set(["super"]);
const AGENT_MODES = new Set(["quick", "full"]);

function nowIso() {
  return new Date().toISOString();
}

function asString(value) {
  return String(value ?? "").trim();
}

function asBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value;
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

function asInteger(value, fallback = 0) {
  const parsed = Number.parseInt(asString(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function validateAgentProfileName(name) {
  return SAFE_AGENT_PROFILE_NAME.test(asString(name));
}

export function validateProjectRef(project) {
  if (!asString(project)) {
    return true;
  }
  return SAFE_PROJECT_REF.test(asString(project));
}

export function normalizeAgentProfileName(name, fallback = "super-default") {
  const normalized = asString(name)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  if (validateAgentProfileName(normalized)) {
    return normalized;
  }
  return fallback;
}

function normalizeAgentKind(value, fallback = "super") {
  const normalized = asString(value).toLowerCase();
  return AGENT_KINDS.has(normalized) ? normalized : fallback;
}

function normalizeAgentMode(value, fallback = "quick") {
  const normalized = asString(value).toLowerCase();
  return AGENT_MODES.has(normalized) ? normalized : fallback;
}

function normalizeAgentProfile(raw = {}) {
  const now = nowIso();
  return {
    id: asString(raw.id || "") || crypto.randomUUID(),
    name: normalizeAgentProfileName(raw.name, "super-default"),
    agentKind: normalizeAgentKind(raw.agentKind, "super"),
    project: asString(raw.project),
    model: asString(raw.model),
    codexProfile: asString(raw.codexProfile || raw.profile || ""),
    sessionName: normalizeAgentProfileName(raw.sessionName, ""),
    mode: normalizeAgentMode(raw.mode, "quick"),
    runPrep: asBoolean(raw.runPrep, true),
    startRelay: asBoolean(raw.startRelay, true),
    makeDefaultSession: asBoolean(raw.makeDefaultSession, true),
    timeoutMs: Math.max(20_000, Math.min(30 * 60 * 1000, asInteger(raw.timeoutMs, 8 * 60 * 1000))),
    notes: asString(raw.notes),
    retired: asBoolean(raw.retired, false),
    createdAt: asString(raw.createdAt) || now,
    updatedAt: asString(raw.updatedAt) || now,
    retiredAt: asBoolean(raw.retired, false) ? asString(raw.retiredAt || "") || now : "",
  };
}

export function createDefaultAgentProfileRegistry() {
  const now = nowIso();
  return {
    version: 1,
    updatedAt: now,
    profiles: [
      normalizeAgentProfile({
        name: "super-default",
        agentKind: "super",
        mode: "quick",
        runPrep: true,
        startRelay: true,
        makeDefaultSession: true,
        notes: "Default super-agent launch profile.",
      }),
    ],
    defaults: {
      global: "super-default",
      perProject: {},
    },
  };
}

function normalizeRegistry(raw = {}) {
  const base = createDefaultAgentProfileRegistry();
  const profilesInput = Array.isArray(raw?.profiles) ? raw.profiles : [];
  const byName = new Map();
  for (const profile of profilesInput) {
    const normalized = normalizeAgentProfile(profile);
    byName.set(normalized.name, normalized);
  }
  for (const profile of base.profiles) {
    if (!byName.has(profile.name)) {
      byName.set(profile.name, profile);
    }
  }

  const profiles = [...byName.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const defaultsRaw = raw?.defaults && typeof raw.defaults === "object" ? raw.defaults : {};
  const perProjectRaw = defaultsRaw.perProject && typeof defaultsRaw.perProject === "object" ? defaultsRaw.perProject : {};

  const resolveLiveProfileName = (name, fallback) => {
    const normalized = normalizeAgentProfileName(name, "");
    const existing = profiles.find((entry) => entry.name === normalized && !entry.retired);
    return existing ? existing.name : fallback;
  };

  const perProject = {};
  for (const [project, profileName] of Object.entries(perProjectRaw)) {
    const normalizedProject = asString(project);
    if (!validateProjectRef(normalizedProject)) {
      continue;
    }
    perProject[normalizedProject] = resolveLiveProfileName(profileName, "");
  }

  return {
    version: 1,
    updatedAt: asString(raw?.updatedAt) || nowIso(),
    profiles,
    defaults: {
      global: resolveLiveProfileName(defaultsRaw.global, base.defaults.global),
      perProject,
    },
  };
}

async function readJsonFile(filePath, fallbackFactory) {
  try {
    const raw = await fsp.readFile(filePath, "utf8");
    return JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch {
    return fallbackFactory();
  }
}

async function writeJsonFile(filePath, value) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return value;
}

export async function readAgentProfileRegistry(filePath = DEFAULT_AGENT_PROFILE_REGISTRY_FILE) {
  return normalizeRegistry(await readJsonFile(filePath, createDefaultAgentProfileRegistry));
}

export async function writeAgentProfileRegistry(registry, filePath = DEFAULT_AGENT_PROFILE_REGISTRY_FILE) {
  return writeJsonFile(
    filePath,
    normalizeRegistry({
      ...registry,
      updatedAt: nowIso(),
    })
  );
}

export function listAgentProfiles(registry, options = {}) {
  const includeRetired = Boolean(options.includeRetired);
  const profiles = Array.isArray(registry?.profiles) ? registry.profiles : [];
  return profiles
    .filter((profile) => includeRetired || !profile.retired)
    .sort((left, right) => {
      const retiredDiff = Number(Boolean(left.retired)) - Number(Boolean(right.retired));
      if (retiredDiff !== 0) {
        return retiredDiff;
      }
      return String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""));
    });
}

export function resolveAgentProfile(registry, input = {}) {
  const requestedName = normalizeAgentProfileName(input?.name || "", "");
  const project = asString(input?.project || "");
  const defaults = registry?.defaults || {};
  const defaultName = project && defaults?.perProject?.[project] ? defaults.perProject[project] : defaults?.global || "";
  const targetName = requestedName || normalizeAgentProfileName(defaultName, "");
  if (!targetName) {
    return null;
  }
  const profile = (registry?.profiles || []).find((entry) => entry.name === targetName && !entry.retired);
  return profile || null;
}

export async function upsertAgentProfile(input, filePath = DEFAULT_AGENT_PROFILE_REGISTRY_FILE) {
  const current = await readAgentProfileRegistry(filePath);
  const nextProfile = normalizeAgentProfile(input);
  if (!validateProjectRef(nextProfile.project)) {
    throw new Error("Invalid project reference.");
  }
  const profiles = current.profiles.filter((entry) => entry.name !== nextProfile.name);
  profiles.push({
    ...nextProfile,
    createdAt: current.profiles.find((entry) => entry.name === nextProfile.name)?.createdAt || nextProfile.createdAt,
    updatedAt: nowIso(),
  });
  return writeAgentProfileRegistry(
    {
      ...current,
      profiles,
    },
    filePath
  );
}

export async function setDefaultAgentProfile(input = {}, filePath = DEFAULT_AGENT_PROFILE_REGISTRY_FILE) {
  const current = await readAgentProfileRegistry(filePath);
  const name = normalizeAgentProfileName(input?.name || "", "");
  const project = asString(input?.project || "");
  if (!name) {
    throw new Error("Agent profile name is required.");
  }
  if (!validateProjectRef(project)) {
    throw new Error("Invalid project reference.");
  }
  const existing = current.profiles.find((entry) => entry.name === name && !entry.retired);
  if (!existing) {
    throw new Error(`Agent profile '${name}' not found.`);
  }
  const next = {
    ...current,
    defaults: {
      ...current.defaults,
      global: project ? current.defaults.global : name,
      perProject: {
        ...(current.defaults?.perProject || {}),
        ...(project ? { [project]: name } : {}),
      },
    },
  };
  return writeAgentProfileRegistry(next, filePath);
}

export async function retireAgentProfile(name, filePath = DEFAULT_AGENT_PROFILE_REGISTRY_FILE) {
  const current = await readAgentProfileRegistry(filePath);
  const normalizedName = normalizeAgentProfileName(name, "");
  const profiles = current.profiles.map((entry) =>
    entry.name === normalizedName
      ? {
          ...entry,
          retired: true,
          retiredAt: nowIso(),
          updatedAt: nowIso(),
        }
      : entry
  );
  return writeAgentProfileRegistry(
    {
      ...current,
      profiles,
    },
    filePath
  );
}
