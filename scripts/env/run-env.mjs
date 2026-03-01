import {
  DEFAULT_ENV_RUNTIME_FILE,
  readEnvProfiles,
  readEnvRuntime,
} from "./lib/env-registry.mjs";
import {
  formatPanelUrl,
  panelLogin,
  panelPasswordFromEnvironment,
  panelRequest,
  parseBooleanFlag,
  startPanelProcess,
  waitForPanel,
} from "./lib/panel-client.mjs";

function parseInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeContext(value, fallback = "commander") {
  const normalized = String(value || "").trim().toLowerCase();
  return ["project", "system", "commander"].includes(normalized) ? normalized : fallback;
}

function normalizePrep(value, fallback = "quick") {
  const normalized = String(value || "").trim().toLowerCase();
  return ["none", "quick", "standard", "full"].includes(normalized) ? normalized : fallback;
}

function normalizePanelMode(value, fallback = "remote") {
  const normalized = String(value || "").trim().toLowerCase();
  return ["off", "local", "remote"].includes(normalized) ? normalized : fallback;
}

function normalizeDevMode(value, fallback = "project") {
  const normalized = String(value || "").trim().toLowerCase();
  return ["off", "project", "all"].includes(normalized) ? normalized : fallback;
}

function normalizeRemoteMode(value, fallback = "named") {
  const normalized = String(value || "").trim().toLowerCase();
  return ["off", "quick", "named", "token"].includes(normalized) ? normalized : fallback;
}

function parseArgs(argv) {
  const options = {
    command: "up",
    context: "commander",
    project: "",
    prep: "quick",
    panel: "remote",
    dev: "project",
    relay: null,
    remote: "named",
    panelPort: 8787,
    devPort: 0,
    publicHost: "",
    basePath: "",
    envProfile: "",
    sessionName: "",
    stopPanel: true,
    dryRun: false,
    json: false,
    provided: {},
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = String(argv[index] || "");
    if (!token) {
      continue;
    }
    if (!token.startsWith("-") && index === 0) {
      options.command = token;
      continue;
    }
    if (!token.startsWith("-")) {
      continue;
    }

    const equalsAt = token.indexOf("=");
    const rawKey = equalsAt >= 0 ? token.slice(0, equalsAt) : token;
    const inlineValue = equalsAt >= 0 ? token.slice(equalsAt + 1) : "";
    const key = rawKey.replace(/^--?/, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
    const nextValue =
      inlineValue || (argv[index + 1] && !String(argv[index + 1]).startsWith("-") ? String(argv[++index]) : "");

    if (key === "context") {
      options.provided.context = true;
      options.context = normalizeContext(nextValue, options.context);
    } else if (key === "project") {
      options.provided.project = true;
      options.project = nextValue.trim();
    } else if (key === "prep") {
      options.provided.prep = true;
      options.prep = normalizePrep(nextValue, options.prep);
    } else if (key === "panel") {
      options.provided.panel = true;
      options.panel = normalizePanelMode(nextValue, options.panel);
    } else if (key === "dev") {
      options.provided.dev = true;
      options.dev = normalizeDevMode(nextValue, options.dev);
    } else if (key === "relay") {
      options.provided.relay = true;
      options.relay = parseBooleanFlag(nextValue, true);
    } else if (key === "remote") {
      options.provided.remote = true;
      options.remote = normalizeRemoteMode(nextValue, options.remote);
    } else if (key === "panelport") {
      options.provided.panelPort = true;
      options.panelPort = parseInteger(nextValue, options.panelPort);
    } else if (key === "devport") {
      options.provided.devPort = true;
      options.devPort = parseInteger(nextValue, options.devPort);
    } else if (key === "publichost") {
      options.provided.publicHost = true;
      options.publicHost = nextValue.trim();
    } else if (key === "basepath") {
      options.provided.basePath = true;
      options.basePath = nextValue.trim();
    } else if (key === "envprofile" || key === "profile") {
      options.provided.envProfile = true;
      options.envProfile = nextValue.trim();
    } else if (key === "sessionname") {
      options.provided.sessionName = true;
      options.sessionName = nextValue.trim();
    } else if (key === "stoppanel") {
      options.provided.stopPanel = true;
      options.stopPanel = parseBooleanFlag(nextValue, true);
    } else if (key === "dryrun") {
      options.provided.dryRun = true;
      options.dryRun = parseBooleanFlag(nextValue, true);
    } else if (key === "json") {
      options.provided.json = true;
      options.json = parseBooleanFlag(nextValue, true);
    }
  }

  options.command = String(options.command || "up").trim().toLowerCase();
  return options;
}

async function resolveOptions(options) {
  const registry = await readEnvProfiles().catch(() => null);
  const requestedProfileName = String(options.envProfile || "").trim().toLowerCase();
  const defaultProfileName =
    registry?.defaults?.perContext?.[options.context] ||
    registry?.defaults?.global ||
    "";
  const profileName = requestedProfileName || defaultProfileName;
  const selectedProfile = Array.isArray(registry?.profiles)
    ? registry.profiles.find((entry) => entry.name === profileName && !entry.retired)
    : null;

  if (!selectedProfile) {
    return {
      ...options,
      envProfile: requestedProfileName || "",
      envProfiles: registry,
      selectedProfile: null,
    };
  }

  return {
    ...options,
    context: options.provided.context ? options.context : normalizeContext(selectedProfile.context, options.context),
    project: options.provided.project ? options.project : String(selectedProfile.project || "").trim(),
    prep: options.provided.prep ? options.prep : normalizePrep(selectedProfile.prep, options.prep),
    panel: options.provided.panel ? options.panel : normalizePanelMode(selectedProfile.panelMode, options.panel),
    dev: options.provided.dev ? options.dev : normalizeDevMode(selectedProfile.devMode, options.dev),
    relay: options.provided.relay ? options.relay : parseBooleanFlag(selectedProfile.relayEnabled, null),
    remote: options.provided.remote ? options.remote : normalizeRemoteMode(selectedProfile.remoteMode, options.remote),
    panelPort: options.provided.panelPort ? options.panelPort : parseInteger(selectedProfile.panelPort, options.panelPort),
    devPort: options.provided.devPort ? options.devPort : parseInteger(selectedProfile.devPort, options.devPort),
    publicHost: options.provided.publicHost ? options.publicHost : String(selectedProfile.publicHost || "").trim(),
    basePath: options.provided.basePath ? options.basePath : String(selectedProfile.basePath || "").trim(),
    sessionName: options.provided.sessionName ? options.sessionName : String(selectedProfile.sessionName || "").trim(),
    envProfile: selectedProfile.name,
    envProfiles: registry,
    selectedProfile,
  };
}

function printResult(value, asJson = false) {
  if (asJson) {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
    return;
  }
  if (value && typeof value === "object") {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${String(value ?? "")}\n`);
}

async function ensurePanelSession(options, { startIfMissing = true } = {}) {
  const protocol = options.panel === "remote" && options.remote !== "off" ? "http" : "http";
  const baseUrl = formatPanelUrl({
    host: "127.0.0.1",
    port: options.panelPort,
    protocol,
    basePath: options.basePath,
  });

  let health = null;
  try {
    health = await waitForPanel(baseUrl, 2500);
  } catch {
    health = null;
  }

  let panelProcess = null;
  if (!health && startIfMissing && options.panel !== "off") {
    const effectivePublicHost = options.remote !== "off" ? options.publicHost || "local-commander.diesign.dev" : "";
    panelProcess = startPanelProcess({
      mode: options.panel,
      port: options.panelPort,
      security: options.remote !== "off" ? "on" : options.panel === "remote" ? "auto" : "off",
      publicHost: effectivePublicHost,
      basePath: options.basePath,
    });
    health = await waitForPanel(baseUrl, 90_000);
  }
  if (!health) {
    throw new Error(
      options.panel === "off"
        ? `Commander panel is not reachable at ${baseUrl}. Start a panel first or launch with --panel=local|remote.`
        : `Commander panel is not reachable at ${baseUrl}.`
    );
  }

  const password = panelPasswordFromEnvironment();
  const session = await panelLogin(baseUrl, password);
  return {
    health,
    panelProcess,
    session,
  };
}

async function runUp(options) {
  if (options.dryRun) {
    return {
      ok: true,
      dryRun: true,
      command: "up",
      request: options,
    };
  }

  const { session, panelProcess } = await ensurePanelSession(options);
  const relayEnabled = typeof options.relay === "boolean" ? options.relay : options.context === "commander";
  const publicHost = options.remote !== "off" ? options.publicHost || "local-commander.diesign.dev" : "";
  const payload = await panelRequest(session, "POST", "/api/env/up", {
    environmentProfileName: options.envProfile,
    context: options.context,
    project: options.project,
    prep: options.prep,
    devMode: options.dev,
    relayEnabled,
    remoteMode: options.remote,
    panelMode: options.panel,
    panelPort: options.panelPort,
    devPort: options.devPort,
    publicHost,
    basePath: options.basePath,
    sessionName: options.sessionName || "codex-chat",
  });
  return {
    ...payload,
    panelProcess,
  };
}

async function runStatus(options) {
  try {
    const { session } = await ensurePanelSession(options, {
      startIfMissing: false,
    });
    return panelRequest(session, "GET", "/api/env/status");
  } catch {
    return readEnvRuntime(DEFAULT_ENV_RUNTIME_FILE);
  }
}

async function runDown(options) {
  const { session } = await ensurePanelSession(options, {
    startIfMissing: false,
  });
  return panelRequest(session, "POST", "/api/env/down", {
    stopPanel: options.stopPanel,
  });
}

async function main() {
  const options = await resolveOptions(parseArgs(process.argv.slice(2)));
  let result;
  if (options.command === "status") {
    result = await runStatus(options);
  } else if (options.command === "down") {
    result = await runDown(options);
  } else {
    result = await runUp(options);
  }
  printResult(result, options.json);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[env] ${message}\n`);
  process.exit(1);
});
