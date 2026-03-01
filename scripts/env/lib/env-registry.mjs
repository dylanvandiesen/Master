import path from "node:path";
import fsp from "node:fs/promises";

const ROOT = process.cwd();

export const DEFAULT_ENV_PROFILE_FILE = path.join(ROOT, ".agency", "remote", "env-profiles.json");
export const DEFAULT_LAUNCH_RUN_FILE = path.join(ROOT, ".agency", "remote", "launch-runs.json");
export const DEFAULT_ENV_RUNTIME_FILE = path.join(ROOT, ".agency", "remote", "env-runtime.json");

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

function normalizeContext(value, fallback = "commander") {
  const normalized = asString(value).toLowerCase();
  return ["project", "system", "commander"].includes(normalized) ? normalized : fallback;
}

function normalizePrep(value, fallback = "quick") {
  const normalized = asString(value).toLowerCase();
  return ["none", "quick", "standard", "full"].includes(normalized) ? normalized : fallback;
}

function normalizePanelMode(value, fallback = "remote") {
  const normalized = asString(value).toLowerCase();
  return ["off", "local", "remote"].includes(normalized) ? normalized : fallback;
}

function normalizeDevMode(value, fallback = "project") {
  const normalized = asString(value).toLowerCase();
  return ["off", "project", "all"].includes(normalized) ? normalized : fallback;
}

function normalizeRemoteMode(value, fallback = "named") {
  const normalized = asString(value).toLowerCase();
  return ["off", "quick", "named", "token"].includes(normalized) ? normalized : fallback;
}

function normalizeProfileName(value, fallback = "") {
  const normalized = asString(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return normalized || fallback;
}

function normalizeEnvProfile(raw = {}) {
  const context = normalizeContext(raw.context, "commander");
  const defaultsByContext = {
    project: {
      prep: "quick",
      devMode: "project",
      panelMode: "local",
      remoteMode: "off",
      relayEnabled: false,
      sessionName: "codex-chat",
      publicHost: "",
      notes: "Project development with local panel access.",
    },
    system: {
      prep: "quick",
      devMode: "off",
      panelMode: "local",
      remoteMode: "off",
      relayEnabled: false,
      sessionName: "codex-chat",
      publicHost: "",
      notes: "System and agency setup without project runtime defaults.",
    },
    commander: {
      prep: "quick",
      devMode: "project",
      panelMode: "remote",
      remoteMode: "named",
      relayEnabled: true,
      sessionName: "codex-chat",
      publicHost: "local-commander.diesign.dev",
      notes: "Full commander operating surface with remote-ready defaults.",
    },
  };
  const defaults = defaultsByContext[context];
  const now = nowIso();
  const remoteMode = normalizeRemoteMode(raw.remoteMode, defaults.remoteMode);

  return {
    name: normalizeProfileName(raw.name, `${context}-profile`),
    context,
    project: asString(raw.project),
    prep: normalizePrep(raw.prep, defaults.prep),
    devMode: normalizeDevMode(raw.devMode, defaults.devMode),
    panelMode: normalizePanelMode(raw.panelMode, defaults.panelMode),
    panelPort: asInteger(raw.panelPort, 8787),
    devPort: asInteger(raw.devPort, 0),
    relayEnabled: asBoolean(raw.relayEnabled, defaults.relayEnabled),
    remoteMode,
    sessionName: normalizeProfileName(raw.sessionName, defaults.sessionName),
    publicHost: remoteMode === "off" ? "" : asString(raw.publicHost) || defaults.publicHost,
    basePath: asString(raw.basePath),
    notes: asString(raw.notes) || defaults.notes,
    retired: asBoolean(raw.retired, false),
    createdAt: asString(raw.createdAt) || now,
    updatedAt: asString(raw.updatedAt) || now,
  };
}

function createDefaultProfiles() {
  const profiles = [
    normalizeEnvProfile({
      name: "project-local",
      context: "project",
      panelMode: "local",
      remoteMode: "off",
    }),
    normalizeEnvProfile({
      name: "system-local",
      context: "system",
      panelMode: "local",
      remoteMode: "off",
    }),
    normalizeEnvProfile({
      name: "commander-remote",
      context: "commander",
      panelMode: "remote",
      remoteMode: "named",
      publicHost: "local-commander.diesign.dev",
    }),
  ];

  return {
    version: 1,
    updatedAt: nowIso(),
    defaults: {
      global: "commander-remote",
      perContext: {
        project: "project-local",
        system: "system-local",
        commander: "commander-remote",
      },
    },
    profiles,
  };
}

function normalizeEnvProfileRegistry(raw = {}) {
  const base = createDefaultProfiles();
  const byName = new Map();
  for (const profile of Array.isArray(raw.profiles) ? raw.profiles : []) {
    const normalized = normalizeEnvProfile(profile);
    byName.set(normalized.name, normalized);
  }
  for (const profile of base.profiles) {
    if (!byName.has(profile.name)) {
      byName.set(profile.name, profile);
    }
  }

  const profiles = [...byName.values()].sort((left, right) => left.name.localeCompare(right.name));
  const defaults = raw.defaults && typeof raw.defaults === "object" ? raw.defaults : {};
  const perContext = defaults.perContext && typeof defaults.perContext === "object" ? defaults.perContext : {};

  const resolveExisting = (name, fallback) => {
    const normalized = normalizeProfileName(name, "");
    const existing = profiles.find((entry) => entry.name === normalized && !entry.retired);
    return existing ? existing.name : fallback;
  };

  return {
    version: 1,
    updatedAt: asString(raw.updatedAt) || nowIso(),
    defaults: {
      global: resolveExisting(defaults.global, base.defaults.global),
      perContext: {
        project: resolveExisting(perContext.project, base.defaults.perContext.project),
        system: resolveExisting(perContext.system, base.defaults.perContext.system),
        commander: resolveExisting(perContext.commander, base.defaults.perContext.commander),
      },
    },
    profiles,
  };
}

function createDefaultLaunchRuns() {
  return {
    version: 1,
    updatedAt: nowIso(),
    runs: [],
  };
}

function normalizeLaunchRun(raw = {}) {
  const now = nowIso();
  const inferredKind = asString(raw.kind)
    || (asString(raw.threadId)
      ? String(asString(raw.status)).startsWith("agent-")
        ? "agent-spawn"
        : "session-create"
      : "environment");
  return {
    id: asString(raw.id) || `${Date.now()}`,
    kind: inferredKind,
    environmentProfileName: normalizeProfileName(raw.environmentProfileName, ""),
    agentProfileName: normalizeProfileName(raw.agentProfileName, ""),
    context: normalizeContext(raw.context, "commander"),
    project: asString(raw.project),
    prep: normalizePrep(raw.prep, "quick"),
    panelMode: normalizePanelMode(raw.panelMode, "remote"),
    remoteMode: normalizeRemoteMode(raw.remoteMode, "named"),
    relayEnabled: asBoolean(raw.relayEnabled, false),
    publicHost: asString(raw.publicHost),
    sessionName: asString(raw.sessionName),
    threadId: asString(raw.threadId),
    model: asString(raw.model),
    codexProfile: asString(raw.codexProfile),
    status: asString(raw.status) || "ready",
    summary: asString(raw.summary),
    urls: raw.urls && typeof raw.urls === "object" ? raw.urls : {},
    request: raw.request && typeof raw.request === "object" ? raw.request : {},
    artifacts: raw.artifacts && typeof raw.artifacts === "object" ? raw.artifacts : {},
    createdAt: asString(raw.createdAt) || now,
    updatedAt: asString(raw.updatedAt) || now,
  };
}

function normalizeLaunchRunRegistry(raw = {}) {
  const runs = Array.isArray(raw.runs) ? raw.runs.map((entry) => normalizeLaunchRun(entry)) : [];
  runs.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  return {
    version: 1,
    updatedAt: asString(raw.updatedAt) || nowIso(),
    runs,
  };
}

function createDefaultEnvRuntime() {
  return {
    version: 1,
    updatedAt: nowIso(),
    environment: null,
    panel: null,
    services: {
      dev: null,
      relay: null,
      relays: [],
      tunnel: null,
    },
    urls: {},
    artifacts: {},
  };
}

function normalizeEnvRuntime(raw = {}) {
  const base = createDefaultEnvRuntime();
  return {
    version: 1,
    updatedAt: asString(raw.updatedAt) || nowIso(),
    environment: raw.environment && typeof raw.environment === "object" ? raw.environment : base.environment,
    panel: raw.panel && typeof raw.panel === "object" ? raw.panel : base.panel,
    services: raw.services && typeof raw.services === "object" ? { ...base.services, ...raw.services } : base.services,
    urls: raw.urls && typeof raw.urls === "object" ? raw.urls : {},
    artifacts: raw.artifacts && typeof raw.artifacts === "object" ? raw.artifacts : {},
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

export async function readEnvProfiles(filePath = DEFAULT_ENV_PROFILE_FILE) {
  return normalizeEnvProfileRegistry(await readJsonFile(filePath, createDefaultProfiles));
}

export async function writeEnvProfiles(registry, filePath = DEFAULT_ENV_PROFILE_FILE) {
  return writeJsonFile(
    filePath,
    normalizeEnvProfileRegistry({
      ...registry,
      updatedAt: nowIso(),
    })
  );
}

export async function upsertEnvProfile(input, filePath = DEFAULT_ENV_PROFILE_FILE) {
  const current = await readEnvProfiles(filePath);
  const nextProfile = normalizeEnvProfile(input);
  const profiles = current.profiles.filter((entry) => entry.name !== nextProfile.name);
  profiles.push({
    ...nextProfile,
    createdAt: current.profiles.find((entry) => entry.name === nextProfile.name)?.createdAt || nextProfile.createdAt,
    updatedAt: nowIso(),
  });
  return writeEnvProfiles(
    {
      ...current,
      profiles,
    },
    filePath
  );
}

export async function setDefaultEnvProfile(context, name, filePath = DEFAULT_ENV_PROFILE_FILE) {
  const current = await readEnvProfiles(filePath);
  const normalizedContext = normalizeContext(context, "commander");
  const normalizedName = normalizeProfileName(name, "");
  const existing = current.profiles.find((entry) => entry.name === normalizedName && !entry.retired);
  if (!existing) {
    throw new Error(`Environment profile '${normalizedName}' was not found.`);
  }
  return writeEnvProfiles(
    {
      ...current,
      defaults: {
        ...current.defaults,
        global: normalizedName,
        perContext: {
          ...current.defaults.perContext,
          [normalizedContext]: normalizedName,
        },
      },
    },
    filePath
  );
}

export async function retireEnvProfile(name, filePath = DEFAULT_ENV_PROFILE_FILE) {
  const current = await readEnvProfiles(filePath);
  const normalizedName = normalizeProfileName(name, "");
  const profiles = current.profiles.map((entry) =>
    entry.name === normalizedName
      ? {
          ...entry,
          retired: true,
          updatedAt: nowIso(),
        }
      : entry
  );
  return writeEnvProfiles(
    {
      ...current,
      profiles,
    },
    filePath
  );
}

export async function readLaunchRuns(filePath = DEFAULT_LAUNCH_RUN_FILE) {
  return normalizeLaunchRunRegistry(await readJsonFile(filePath, createDefaultLaunchRuns));
}

export async function appendLaunchRun(run, filePath = DEFAULT_LAUNCH_RUN_FILE) {
  const current = await readLaunchRuns(filePath);
  const runs = [normalizeLaunchRun(run), ...current.runs].slice(0, 100);
  return writeJsonFile(
    filePath,
    normalizeLaunchRunRegistry({
      ...current,
      runs,
      updatedAt: nowIso(),
    })
  );
}

export async function getLaunchRunById(id, filePath = DEFAULT_LAUNCH_RUN_FILE) {
  const current = await readLaunchRuns(filePath);
  const normalizedId = asString(id);
  if (!normalizedId) {
    return null;
  }
  return current.runs.find((entry) => entry.id === normalizedId) || null;
}

export async function readEnvRuntime(filePath = DEFAULT_ENV_RUNTIME_FILE) {
  return normalizeEnvRuntime(await readJsonFile(filePath, createDefaultEnvRuntime));
}

export async function writeEnvRuntime(runtime, filePath = DEFAULT_ENV_RUNTIME_FILE) {
  return writeJsonFile(
    filePath,
    normalizeEnvRuntime({
      ...runtime,
      updatedAt: nowIso(),
    })
  );
}

export async function mergeEnvRuntime(partial, filePath = DEFAULT_ENV_RUNTIME_FILE) {
  const current = await readEnvRuntime(filePath);
  return writeEnvRuntime(
    {
      ...current,
      ...partial,
      services: {
        ...(current.services || {}),
        ...(partial.services || {}),
      },
      urls: {
        ...(current.urls || {}),
        ...(partial.urls || {}),
      },
      artifacts: {
        ...(current.artifacts || {}),
        ...(partial.artifacts || {}),
      },
    },
    filePath
  );
}
