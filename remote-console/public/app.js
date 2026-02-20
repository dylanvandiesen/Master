const state = {
  csrfToken: "",
  projects: [],
  activeProject: "",
  manifests: [],
  activePreviewId: "",
  previewRefreshMs: 3000,
  commandRunning: false,
  activeDev: null,
  activeRelay: null,
  activeTunnel: null,
  chatMessages: [],
  chatUsage: null,
  agentStatus: null,
  activityEvents: [],
  codexRegistry: null,
  codexSessions: [],
  connectionHelp: null,
  autoRefreshTimer: null,
  activityTimer: null,
  metaTimer: null,
  ws: null,
  wsConnected: false,
  wsReconnectTimer: null,
  activeUtilityPanel: "preview",
  utilityCollapsed: false,
  mobileNavOpen: false,
  preferredTunnelMode: "quick",
  promptMode: "live",
  promptQueue: [],
  composerBusy: false,
  composerBusyTimer: null,
  quickReplyDismissedKey: "",
};

const els = {
  loginView: document.getElementById("loginView"),
  appView: document.getElementById("appView"),
  loginForm: document.getElementById("loginForm"),
  password: document.getElementById("password"),
  loginError: document.getElementById("loginError"),

  statusLine: document.getElementById("statusLine"),
  refreshBtn: document.getElementById("refreshBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  commandResult: document.getElementById("commandResult"),
  utilityDock: document.getElementById("utilityDock"),
  navPreviewBtn: document.getElementById("navPreviewBtn"),
  navActivityBtn: document.getElementById("navActivityBtn"),
  navSessionsBtn: document.getElementById("navSessionsBtn"),
  navConnectionBtn: document.getElementById("navConnectionBtn"),
  navOutputBtn: document.getElementById("navOutputBtn"),
  navTogglePanelsBtn: document.getElementById("navTogglePanelsBtn"),
  mobileMenuBtn: document.getElementById("mobileMenuBtn"),
  mobileNavBackdrop: document.getElementById("mobileNavBackdrop"),
  mobileNavCloseBtn: document.getElementById("mobileNavCloseBtn"),
  utilityDockBackdrop: document.getElementById("utilityDockBackdrop"),
  utilityDockCloseBtn: document.getElementById("utilityDockCloseBtn"),

  chatPreviewBtn: document.getElementById("chatPreviewBtn"),
  chatConnection: document.getElementById("chatConnection"),
  agentStateBadge: document.getElementById("agentStateBadge"),
  chatLiveStatus: document.getElementById("chatLiveStatus"),
  chatRuntimeDetails: document.getElementById("chatRuntimeDetails"),
  chatRuntimeSummary: document.getElementById("chatRuntimeSummary"),
  chatRuntimeValues: document.getElementById("chatRuntimeValues"),
  chatStream: document.getElementById("chatStream"),
  chatQuickReplies: document.getElementById("chatQuickReplies"),
  chatTokenUsage: document.getElementById("chatTokenUsage"),
  chatMessageCount: document.getElementById("chatMessageCount"),
  noteMessage: document.getElementById("noteMessage"),
  sendNoteBtn: document.getElementById("sendNoteBtn"),
  chatRefreshBtn: document.getElementById("chatRefreshBtn"),
  noteStatus: document.getElementById("noteStatus"),
  promptModeLiveBtn: document.getElementById("promptModeLiveBtn"),
  promptModeQueueBtn: document.getElementById("promptModeQueueBtn"),
  promptModeStopBtn: document.getElementById("promptModeStopBtn"),
  promptQueueCount: document.getElementById("promptQueueCount"),

  manifestSelect: document.getElementById("manifestSelect"),
  refreshMsInput: document.getElementById("refreshMsInput"),
  autoRefreshToggle: document.getElementById("autoRefreshToggle"),
  loadPreviewBtn: document.getElementById("loadPreviewBtn"),
  previewFullscreenBtn: document.getElementById("previewFullscreenBtn"),
  openPreviewTabBtn: document.getElementById("openPreviewTabBtn"),
  previewFrame: document.getElementById("previewFrame"),
  previewViewport: document.getElementById("previewViewport"),
  previewStatus: document.getElementById("previewStatus"),

  activityRefreshBtn: document.getElementById("activityRefreshBtn"),
  agentStatusText: document.getElementById("agentStatusText"),
  activityStatus: document.getElementById("activityStatus"),
  activityFeed: document.getElementById("activityFeed"),

  codexSessionSelect: document.getElementById("codexSessionSelect"),
  codexSessionName: document.getElementById("codexSessionName"),
  codexSessionTarget: document.getElementById("codexSessionTarget"),
  codexSessionProject: document.getElementById("codexSessionProject"),
  codexSessionNotes: document.getElementById("codexSessionNotes"),
  codexRefreshBtn: document.getElementById("codexRefreshBtn"),
  codexUpsertBtn: document.getElementById("codexUpsertBtn"),
  codexCreateBtn: document.getElementById("codexCreateBtn"),
  codexSetDefaultBtn: document.getElementById("codexSetDefaultBtn"),
  codexRetireBtn: document.getElementById("codexRetireBtn"),
  codexPrepQuickBtn: document.getElementById("codexPrepQuickBtn"),
  codexPrepFullBtn: document.getElementById("codexPrepFullBtn"),
  relayStartBtn: document.getElementById("relayStartBtn"),
  relayStopBtn: document.getElementById("relayStopBtn"),
  relayRefreshBtn: document.getElementById("relayRefreshBtn"),
  relayStatusText: document.getElementById("relayStatusText"),
  codexSessionStatus: document.getElementById("codexSessionStatus"),
  codexSessionPreview: document.getElementById("codexSessionPreview"),

  connectionMode: document.getElementById("connectionMode"),
  mobileUrlText: document.getElementById("mobileUrlText"),
  tunnelUrlText: document.getElementById("tunnelUrlText"),
  tunnelModeQuickBtn: document.getElementById("tunnelModeQuickBtn"),
  tunnelModeTokenBtn: document.getElementById("tunnelModeTokenBtn"),
  tunnelModeNamedBtn: document.getElementById("tunnelModeNamedBtn"),
  tunnelModeHint: document.getElementById("tunnelModeHint"),
  refreshConnectionHelpBtn: document.getElementById("refreshConnectionHelpBtn"),
  copyMobileUrlBtn: document.getElementById("copyMobileUrlBtn"),
  tunnelStartBtn: document.getElementById("tunnelStartBtn"),
  tunnelStopBtn: document.getElementById("tunnelStopBtn"),
  tunnelRefreshBtn: document.getElementById("tunnelRefreshBtn"),
  openTunnelUrlBtn: document.getElementById("openTunnelUrlBtn"),
  enableHttpsBtn: document.getElementById("enableHttpsBtn"),
  useAdaptiveSecurityBtn: document.getElementById("useAdaptiveSecurityBtn"),
  connectionAdvice: document.getElementById("connectionAdvice"),
};

const RUNTIME_STRIP_STORAGE_KEY = "remote.chat.runtime.strip.collapsed";
const TOOLTIP_TEXTS = {
  statusLine: "Current workspace runtime summary.",
  refreshBtn: "Reload session, projects, manifests, chat, and activity data.",
  logoutBtn: "Sign out from this remote panel session.",
  mobileMenuBtn: "Open panel navigation.",
  mobileNavCloseBtn: "Close panel navigation.",
  utilityDockBackdrop: "Tap to close the currently open utility panel.",
  utilityDockCloseBtn: "Close the currently open utility panel.",
  navPreviewBtn: "Open preview tools.",
  navActivityBtn: "Open Codex activity feed.",
  navSessionsBtn: "Open sessions and preparation tools.",
  navConnectionBtn: "Open remote access and tunnel controls.",
  navOutputBtn: "Open operation output logs.",
  navTogglePanelsBtn: "Hide or show the utility panel area.",
  chatPreviewBtn: "Jump to the preview panel.",
  chatConnection: "Realtime chat socket connection status.",
  agentStateBadge: "Current Codex agent state.",
  chatLiveStatus: "Latest high-level Codex activity message.",
  chatRuntimeDetails: "Expanded runtime checks for chat, relay, preview, and network.",
  chatRuntimeSummary: "Compact runtime checks summary.",
  chatStream: "Conversation timeline between you and Codex.",
  chatQuickReplies: "Tap a suggested numbered reply from Codex prompts.",
  chatTokenUsage: "Estimated token usage from current chat history.",
  chatMessageCount: "Message count in the visible chat timeline.",
  noteMessage: "Message sent to Codex through the remote inbox bridge.",
  sendNoteBtn: "Send message to Codex.",
  chatRefreshBtn: "Refresh chat history manually.",
  noteStatus: "Message delivery and sync status.",
  promptModeLiveBtn: "Live mode sends prompts immediately.",
  promptModeQueueBtn: "Queue mode stores prompts and sends them later in order.",
  promptModeStopBtn: "Stop mode pauses prompt sending.",
  promptQueueCount: "Number of queued prompts waiting to send.",
  manifestSelect: "Select which dev server manifest to preview.",
  refreshMsInput: "Preview auto-refresh interval in milliseconds.",
  autoRefreshToggle: "Enable or disable preview auto-refresh.",
  loadPreviewBtn: "Load the selected preview manifest in the embedded frame.",
  previewFullscreenBtn: "Open embedded preview in fullscreen mode.",
  openPreviewTabBtn: "Open current preview in a new browser tab.",
  previewFrame: "Embedded live preview of the selected manifest.",
  previewViewport: "Preview container.",
  previewStatus: "Current preview load status.",
  activityRefreshBtn: "Refresh activity status and event feed.",
  agentStatusText: "Current agent status text from relay/runtime.",
  activityStatus: "Last activity refresh timestamp.",
  activityFeed: "Recent Codex activity events and transitions.",
  codexSessionSelect: "Choose a registered Codex session profile.",
  codexSessionName: "Session alias name used by relay tooling.",
  codexSessionTarget: "Target thread/session ID or alias.",
  codexSessionProject: "Optional project slug for scoped relay context.",
  codexSessionNotes: "Optional notes saved with this session profile.",
  codexRefreshBtn: "Reload session registry from disk.",
  codexUpsertBtn: "Save or update the current session profile.",
  codexCreateBtn: "Create a new Codex session and register it.",
  codexSetDefaultBtn: "Set selected session as default.",
  codexRetireBtn: "Mark selected session as retired.",
  codexPrepQuickBtn: "Run fast context preparation for this project.",
  codexPrepFullBtn: "Run full context preparation including installs.",
  relayStartBtn: "Start realtime Codex relay watcher.",
  relayStopBtn: "Stop realtime Codex relay watcher.",
  relayRefreshBtn: "Refresh relay process state.",
  relayStatusText: "Current relay watcher status.",
  codexSessionStatus: "Latest session/relay action result.",
  codexSessionPreview: "Registry summary for sessions and defaults.",
  connectionMode: "Network bind mode and security mode summary.",
  mobileUrlText: "Best URL to open this panel from mobile.",
  tunnelModeQuickBtn: "Use quick tunnel mode (ephemeral public URL).",
  tunnelModeTokenBtn: "Use Cloudflare account token tunnel from REMOTE_PANEL_CLOUDFLARED_TUNNEL_TOKEN.",
  tunnelModeNamedBtn: "Use named Cloudflare tunnel from REMOTE_PANEL_CLOUDFLARED_TUNNEL_NAME.",
  tunnelModeHint: "Tunnel mode requirements and configuration hints.",
  refreshConnectionHelpBtn: "Refresh connection and network guidance.",
  copyMobileUrlBtn: "Copy the recommended mobile URL.",
  tunnelUrlText: "External tunnel status and public URL.",
  tunnelStartBtn: "Start a public HTTPS tunnel for outside access.",
  tunnelStopBtn: "Stop the currently running tunnel.",
  tunnelRefreshBtn: "Refresh tunnel status from the server.",
  openTunnelUrlBtn: "Open the active tunnel URL in a new tab.",
  enableHttpsBtn: "Require HTTPS for incoming remote clients.",
  useAdaptiveSecurityBtn: "Use adaptive security based on client network.",
  connectionAdvice: "Connection recommendations and actions.",
  commandResult: "Raw output from recent panel operations.",
};

function runtimeCheckHelp(label) {
  const map = {
    auth: "Panel authentication token availability.",
    socket: "WebSocket connection state for realtime chat updates.",
    agent: "Codex agent state from relay status.",
    relay: "Relay watcher process state.",
    tunnel: "Public HTTPS tunnel availability.",
    security: "Panel security mode currently in effect.",
    preview: "Currently selected preview manifest.",
    refresh: "Preview auto-refresh setting.",
    session: "Selected Codex session alias.",
    mobile: "Recommended URL for phone or remote access.",
    prompt: "Current prompt dispatch mode: live, queue, or stop.",
    queue: "Queued prompt count waiting to be sent.",
    tokens: "Estimated chat token usage based on message text length.",
    messages: "Total number of chat messages currently loaded.",
  };
  return map[String(label || "").toLowerCase()] || "Runtime check value.";
}

function applyStaticTooltips() {
  for (const [id, text] of Object.entries(TOOLTIP_TEXTS)) {
    const node = document.getElementById(id);
    if (!node || !text) {
      continue;
    }
    node.title = text;
  }
}

async function api(path, options = {}) {
  const method = options.method || "GET";
  const headers = {};
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (!["GET", "HEAD"].includes(method.toUpperCase()) && state.csrfToken) {
    headers["x-csrf-token"] = state.csrfToken;
  }

  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    throw new Error(payload?.error || `${response.status} ${response.statusText}`);
  }
  return payload;
}

function setLoggedIn(isLoggedIn) {
  els.loginView.hidden = isLoggedIn;
  els.appView.hidden = !isLoggedIn;
}

function utilityNavButtons() {
  return [
    [els.navPreviewBtn, "preview"],
    [els.navActivityBtn, "activity"],
    [els.navSessionsBtn, "sessions"],
    [els.navConnectionBtn, "connection"],
    [els.navOutputBtn, "output"],
  ];
}

function isMobileViewport() {
  return window.matchMedia("(max-width: 900px)").matches;
}

function setMobileNavOpen(open) {
  const next = Boolean(open);
  state.mobileNavOpen = next;
  document.body.classList.toggle("mobile-nav-open", next);
  if (els.mobileNavBackdrop) {
    els.mobileNavBackdrop.hidden = !next;
  }
  if (els.mobileMenuBtn) {
    els.mobileMenuBtn.setAttribute("aria-expanded", next ? "true" : "false");
  }
}

function updateUtilityOverlayState() {
  const open = isMobileViewport() && !state.utilityCollapsed;
  document.body.classList.toggle("utility-dock-open", open);
  if (els.utilityDockBackdrop) {
    els.utilityDockBackdrop.hidden = !open;
  }
  if (els.utilityDockCloseBtn) {
    els.utilityDockCloseBtn.hidden = !open;
  }
}

function setUtilityCollapsed(collapsed) {
  state.utilityCollapsed = Boolean(collapsed);
  els.utilityDock.classList.toggle("collapsed", state.utilityCollapsed);
  const toggleLabel = els.navTogglePanelsBtn.querySelector("span");
  if (toggleLabel) {
    toggleLabel.textContent = state.utilityCollapsed ? "Show" : "Hide";
  }
  els.navTogglePanelsBtn.title = state.utilityCollapsed ? "Show utility panels" : "Hide utility panels";
  updateUtilityOverlayState();
}

function setActiveUtilityPanel(panelId, options = {}) {
  const target = String(panelId || "preview").trim().toLowerCase();
  const available = new Set(["preview", "activity", "sessions", "connection", "output"]);
  const next = available.has(target) ? target : "preview";
  state.activeUtilityPanel = next;

  const cards = els.utilityDock.querySelectorAll("[data-panel-id]");
  for (const card of cards) {
    card.hidden = card.getAttribute("data-panel-id") !== next;
  }

  for (const [button, key] of utilityNavButtons()) {
    button.classList.toggle("active", key === next);
  }

  if (state.mobileNavOpen) {
    setMobileNavOpen(false);
  }

  if (options.expand !== false) {
    setUtilityCollapsed(false);
  }
}

function applyResponsiveUtilityDefaults(force = false) {
  const utilityNarrow = window.matchMedia("(max-width: 1240px)").matches;
  if (force || utilityNarrow) {
    setUtilityCollapsed(utilityNarrow);
  }
  updateUtilityOverlayState();
}

function setCommandResult(text, isError = false) {
  els.commandResult.textContent = text;
  els.commandResult.classList.toggle("error-block", isError);
}

function formatDevStatus() {
  if (!state.activeDev) {
    return "No active dev process";
  }
  const project = state.activeDev.project ? ` project=${state.activeDev.project}` : "";
  const port = state.activeDev.port ? ` port=${state.activeDev.port}` : "";
  return `Dev ${state.activeDev.mode}${project}${port} pid=${state.activeDev.pid}`;
}

function formatRelayStatus() {
  if (!state.activeRelay) {
    return "Relay stopped";
  }
  const session = state.activeRelay.sessionName ? ` session=${state.activeRelay.sessionName}` : "";
  const project = state.activeRelay.project ? ` project=${state.activeRelay.project}` : "";
  const dryRun = state.activeRelay.dryRun ? " dry-run=true" : "";
  return `Relay running${session}${project}${dryRun} pid=${state.activeRelay.pid}`;
}

function normalizeTunnelMode(value, fallback = "quick") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (["quick", "token", "named"].includes(normalized)) {
    return normalized;
  }
  return fallback;
}

function currentTunnelMode() {
  return normalizeTunnelMode(
    state.activeTunnel?.mode || state.connectionHelp?.tunnel?.mode || state.connectionHelp?.tunnel?.configuredMode || state.preferredTunnelMode,
    "quick"
  );
}

function formatTunnelStatus() {
  if (!state.activeTunnel) {
    return `Tunnel stopped (${currentTunnelMode()})`;
  }
  const mode = normalizeTunnelMode(state.activeTunnel.mode || state.preferredTunnelMode, "quick");
  const provider = state.activeTunnel.provider ? ` (${state.activeTunnel.provider}, ${mode})` : ` (${mode})`;
  const url = state.activeTunnel.url ? ` ${state.activeTunnel.url}` : "";
  return `Tunnel live${provider}${url} pid=${state.activeTunnel.pid}`;
}

function renderTopStatus() {
  const command = state.commandRunning ? " | command running" : "";
  const agent = state.agentStatus?.state ? ` | codex ${state.agentStatus.state}` : "";
  const relay = state.activeRelay ? " | relay active" : "";
  const tunnel = state.activeTunnel ? " | tunnel live" : "";
  els.statusLine.textContent = `${formatDevStatus()}${relay}${tunnel}${agent}${command}`;
  els.statusLine.title = `Workspace status: ${els.statusLine.textContent}`;
  renderChatRuntimeStrip();
}

function renderRelayStatus() {
  els.relayStatusText.value = formatRelayStatus();
  els.relayStatusText.title = `Relay watcher: ${els.relayStatusText.value}`;
  const running = Boolean(state.activeRelay);
  els.relayStartBtn.disabled = running;
  els.relayStopBtn.disabled = !running;
  renderChatRuntimeStrip();
}

function renderTunnelStatus() {
  const helpTunnel = state.connectionHelp?.tunnel && typeof state.connectionHelp.tunnel === "object" ? state.connectionHelp.tunnel : null;
  state.preferredTunnelMode = normalizeTunnelMode(
    state.activeTunnel?.mode || helpTunnel?.mode || helpTunnel?.configuredMode || state.preferredTunnelMode,
    "quick"
  );
  const activeUrl = String(state.activeTunnel?.url || helpTunnel?.url || "").trim();
  const hasActiveTunnel = Boolean(state.activeTunnel || (helpTunnel?.active && activeUrl));
  if (state.activeTunnel) {
    els.tunnelUrlText.value = formatTunnelStatus();
  } else if (activeUrl) {
    const mode = normalizeTunnelMode(helpTunnel?.mode || state.preferredTunnelMode, "quick");
    els.tunnelUrlText.value = `Tunnel live (${mode}) ${activeUrl}`;
  } else {
    els.tunnelUrlText.value = `Tunnel stopped (${state.preferredTunnelMode})`;
  }
  els.tunnelUrlText.title = `Tunnel state: ${els.tunnelUrlText.value}`;
  renderTunnelModeControls();
  els.tunnelStartBtn.disabled = hasActiveTunnel;
  els.tunnelStopBtn.disabled = !hasActiveTunnel;
  els.openTunnelUrlBtn.disabled = !activeUrl;
  renderChatRuntimeStrip();
}

function renderTunnelModeControls() {
  const mode = currentTunnelMode();
  const helpTunnel = state.connectionHelp?.tunnel && typeof state.connectionHelp.tunnel === "object" ? state.connectionHelp.tunnel : null;
  const hasTokenConfig = Boolean(helpTunnel?.hasTokenConfig);
  const hasNamedConfig = Boolean(helpTunnel?.hasNamedConfig);
  const hasConfigFile = Boolean(helpTunnel?.hasConfigFile);

  const buttons = [
    [els.tunnelModeQuickBtn, "quick"],
    [els.tunnelModeTokenBtn, "token"],
    [els.tunnelModeNamedBtn, "named"],
  ];
  for (const [button, key] of buttons) {
    if (!button) {
      continue;
    }
    button.classList.toggle("active", key === mode);
  }

  if (!els.tunnelModeHint) {
    return;
  }
  let hint = "";
  if (mode === "token") {
    hint = hasTokenConfig
      ? "Token mode uses REMOTE_PANEL_CLOUDFLARED_TUNNEL_TOKEN from environment."
      : "Token mode requires REMOTE_PANEL_CLOUDFLARED_TUNNEL_TOKEN.";
  } else if (mode === "named") {
    hint = hasNamedConfig
      ? `Named mode uses REMOTE_PANEL_CLOUDFLARED_TUNNEL_NAME${hasConfigFile ? " and REMOTE_PANEL_CLOUDFLARED_CONFIG." : "."}`
      : "Named mode requires REMOTE_PANEL_CLOUDFLARED_TUNNEL_NAME.";
  } else {
    hint = "Quick mode starts an ephemeral Cloudflare URL.";
  }
  els.tunnelModeHint.textContent = hint;
  els.tunnelModeHint.title = `Tunnel mode hint: ${hint}`;
}

function setPreferredTunnelMode(mode) {
  state.preferredTunnelMode = normalizeTunnelMode(mode, state.preferredTunnelMode || "quick");
  renderTunnelModeControls();
}

function formatClock(raw) {
  const date = new Date(raw || "");
  if (Number.isNaN(date.valueOf())) {
    return String(raw || "");
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function sanitizeAgentMessage(raw) {
  const message = String(raw || "").trim();
  if (!message) {
    return "";
  }
  if (/^reply sent:\s+.+\.md$/i.test(message)) {
    return "";
  }
  return message;
}

function formatNoteClock(raw) {
  const value = String(raw || "").trim();
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/);
  if (!match) {
    return value || "";
  }
  const iso = `${match[1]}T${match[2]}:${match[3]}:${match[4]}.${match[5]}Z`;
  return formatClock(iso);
}

function safeLocalStorageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage errors
  }
}

function runtimeStateTone(value) {
  const normalized = String(value || "").toLowerCase();
  if (["ok", "live", "running", "on", "working", "thinking", "pending", "auto"].includes(normalized)) {
    return "ok";
  }
  if (["off", "stopped", "missing", "offline", "none", "blocked", "error", "n/a"].includes(normalized)) {
    return "warn";
  }
  return "soft";
}

function preferredSessionLabel() {
  const selected = String(els.codexSessionSelect?.value || "").trim();
  if (selected) {
    return selected;
  }
  const typed = String(els.codexSessionName?.value || "").trim();
  if (typed) {
    return typed;
  }
  return "n/a";
}

function parseUsageCount(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

function normalizeChatUsage() {
  const usage = state.chatUsage && typeof state.chatUsage === "object" ? state.chatUsage : {};
  const promptTokens = parseUsageCount(usage.promptTokens);
  const completionTokens = parseUsageCount(usage.completionTokens);
  const totalTokens = parseUsageCount(usage.totalTokens) || promptTokens + completionTokens;
  const messageCount = parseUsageCount(usage.messageCount) || state.chatMessages.length;
  const estimated = usage.estimated !== false;
  return {
    promptTokens,
    completionTokens,
    totalTokens,
    messageCount,
    estimated,
  };
}

function formatNumber(value) {
  const count = parseUsageCount(value);
  return count.toLocaleString();
}

function renderChatUsage() {
  if (!els.chatTokenUsage || !els.chatMessageCount) {
    return;
  }
  const usage = normalizeChatUsage();
  const estimatePrefix = usage.estimated ? "~" : "";
  const tokenText = usage.totalTokens > 0 ? `${estimatePrefix}${formatNumber(usage.totalTokens)} tokens` : "tokens n/a";
  const messageText = `${formatNumber(usage.messageCount)} messages`;
  els.chatTokenUsage.textContent = tokenText;
  els.chatTokenUsage.title = `Prompt: ${formatNumber(usage.promptTokens)} | Completion: ${formatNumber(usage.completionTokens)} | Total: ${formatNumber(usage.totalTokens)}${usage.estimated ? " (estimated)" : ""}`;
  els.chatMessageCount.textContent = messageText;
  els.chatMessageCount.title = `Loaded chat messages: ${formatNumber(usage.messageCount)}`;
}

function renderChatRuntimeStrip() {
  const details = els.chatRuntimeDetails;
  if (!details) {
    return;
  }

  const usage = normalizeChatUsage();
  const securityMode = String(state.connectionHelp?.panel?.securityMode || "unknown");
  const refreshMs = Number.parseInt(els.refreshMsInput.value, 10);
  const refreshLabel = Number.isFinite(refreshMs) ? `${els.autoRefreshToggle.checked ? "on" : "off"} @ ${refreshMs}ms` : "off";
  const mobile = String(state.connectionHelp?.guidance?.recommendedMobileUrl || "").trim() || "none";
  const tunnelUrl = String(state.activeTunnel?.url || state.connectionHelp?.tunnel?.url || "").trim();
  const agentState = String(state.agentStatus?.state || "idle");
  const socketState = state.wsConnected ? "live" : "offline";
  const relayState = state.activeRelay ? "running" : "stopped";
  const tunnelState = tunnelUrl ? "live" : "stopped";
  const promptMode = normalizePromptMode(state.promptMode, "live");
  const queueCount = state.promptQueue.length;

  const checks = [
    { label: "auth", value: state.csrfToken ? "ok" : "missing" },
    { label: "socket", value: socketState },
    { label: "agent", value: agentState || "idle" },
    { label: "relay", value: relayState },
    { label: "tunnel", value: tunnelState },
    { label: "security", value: securityMode },
    { label: "tokens", value: usage.totalTokens ? `${usage.estimated ? "~" : ""}${formatNumber(usage.totalTokens)}` : "n/a" },
    { label: "messages", value: formatNumber(usage.messageCount) },
    { label: "preview", value: state.activePreviewId || "none" },
    { label: "refresh", value: refreshLabel },
    { label: "session", value: preferredSessionLabel() },
    { label: "mobile", value: mobile },
    { label: "prompt", value: promptMode },
    { label: "queue", value: String(queueCount) },
  ];

  const summary = `socket ${socketState} | agent ${agentState || "idle"} | relay ${relayState} | tokens ${usage.totalTokens ? `${usage.estimated ? "~" : ""}${formatNumber(usage.totalTokens)}` : "n/a"}`;
  els.chatRuntimeSummary.textContent = summary;
  els.chatRuntimeSummary.title = `Runtime summary: ${summary}`;

  const container = els.chatRuntimeValues;
  container.innerHTML = "";
  const fragment = document.createDocumentFragment();
  for (const item of checks) {
    const pill = document.createElement("span");
    pill.className = `runtime-pill ${runtimeStateTone(item.value)}`;

    const key = document.createElement("strong");
    key.textContent = item.label;

    const val = document.createElement("span");
    val.textContent = String(item.value || "n/a");
    pill.title = `${runtimeCheckHelp(item.label)} Current value: ${val.textContent}.`;

    pill.appendChild(key);
    pill.appendChild(val);
    fragment.appendChild(pill);
  }
  container.appendChild(fragment);
  renderChatUsage();
}

function setChatConnectionState(text, isConnected = false) {
  els.chatConnection.textContent = text;
  els.chatConnection.title = `Realtime socket status: ${text}`;
  els.chatConnection.classList.remove("ok", "bad");
  if (isConnected) {
    els.chatConnection.classList.add("ok");
  } else if (text.toLowerCase().includes("error") || text.toLowerCase().includes("disconnected")) {
    els.chatConnection.classList.add("bad");
  }
  renderChatRuntimeStrip();
}

function shouldShowThinkingCloud() {
  const status = String(state.agentStatus?.state || "").toLowerCase();
  return ["pending", "thinking", "working"].includes(status);
}

function syncThinkingCloudIndicator() {
  const existing = els.chatStream.querySelector('[data-thinking-cloud="true"]');
  if (!shouldShowThinkingCloud()) {
    if (existing) {
      existing.remove();
    }
    return;
  }
  if (existing) {
    return;
  }

  const cloud = document.createElement("article");
  cloud.className = "chat-bubble assistant thinking-cloud";
  cloud.setAttribute("data-thinking-cloud", "true");
  cloud.innerHTML = `
    <header>
      <strong>Codex</strong>
      <span>live</span>
    </header>
    <div class="thinking-wrap">
      <span class="thinking-puffs"><span></span><span></span><span></span></span>
      <span class="thinking-text">Thinking...</span>
    </div>
  `;
  els.chatStream.appendChild(cloud);
  els.chatStream.scrollTop = els.chatStream.scrollHeight;
}

function renderAgentStatus() {
  const status = state.agentStatus || { state: "idle", message: "No status yet." };
  const cleanMessage = sanitizeAgentMessage(status.message);
  const label = cleanMessage ? `${status.state || "idle"} | ${cleanMessage}` : `${status.state || "idle"}`;
  els.agentStatusText.value = label;
  els.agentStatusText.title = `Agent status: ${label}`;

  const badge = els.agentStateBadge;
  badge.textContent = status.state || "idle";
  badge.title = `Agent state: ${badge.textContent}`;
  badge.classList.remove("idle", "pending", "thinking", "working", "blocked");
  badge.classList.add(String(status.state || "idle"));

  const stateText = String(status.state || "idle").toLowerCase();
  const message = cleanMessage;
  const liveMap = {
    idle: "Codex is idle.",
    pending: "Codex has queued work.",
    thinking: "Codex is thinking...",
    working: "Codex is working...",
    blocked: "Codex is blocked.",
  };
  const liveText = message || liveMap[stateText] || "Codex status updated.";
  els.chatLiveStatus.textContent = liveText;
  els.chatLiveStatus.title = `Live status: ${liveText}`;
  els.chatLiveStatus.classList.remove("idle", "pending", "thinking", "working", "blocked");
  els.chatLiveStatus.classList.add(stateText);
  syncThinkingCloudIndicator();
}

function extractChoiceRepliesFromText(rawText) {
  const text = String(rawText || "");
  if (!text.trim()) {
    return [];
  }
  const choices = [];
  const seen = new Set();
  const pushChoice = (replyRaw, labelRaw) => {
    const reply = String(replyRaw || "").trim();
    const label = String(labelRaw || "").trim().replace(/\s+/g, " ");
    if (!reply || !label || seen.has(reply)) {
      return;
    }
    seen.add(reply);
    choices.push({
      reply,
      label: label.length > 100 ? `${label.slice(0, 100)}...` : label,
    });
  };

  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*(?:[-*]\s+)?(\d{1,2})\s*[.)-]\s+(.+)$/);
    if (!match) {
      continue;
    }
    pushChoice(match[1], match[2]);
    if (choices.length >= 8) {
      break;
    }
  }

  if (choices.length < 2) {
    const compact = text.replace(/\r/g, "");
    const inlinePattern = /(?:^|\s)(\d{1,2})\s*[.)-]\s+([^]+?)(?=(?:\s+\d{1,2}\s*[.)-]\s+)|$)/g;
    for (const match of compact.matchAll(inlinePattern)) {
      pushChoice(match[1], match[2]);
      if (choices.length >= 8) {
        break;
      }
    }
  }

  return choices.length >= 2 ? choices : [];
}

function isLikelyNumericChoiceSet(choices) {
  if (!Array.isArray(choices) || choices.length < 2 || choices.length > 6) {
    return false;
  }
  const numbers = [];
  for (const choice of choices) {
    const reply = String(choice?.reply || "").trim();
    const label = String(choice?.label || "").trim();
    if (!/^\d{1,2}$/.test(reply)) {
      return false;
    }
    if (!label || label.length > 180) {
      return false;
    }
    const value = Number.parseInt(reply, 10);
    if (!Number.isFinite(value)) {
      return false;
    }
    numbers.push(value);
  }
  if (numbers[0] !== 1) {
    return false;
  }
  for (let index = 1; index < numbers.length; index += 1) {
    if (numbers[index] !== numbers[index - 1] + 1) {
      return false;
    }
  }
  return true;
}

function hasChoicePromptCue(rawText) {
  const text = String(rawText || "").trim();
  if (!text) {
    return false;
  }
  const cuePatterns = [
    /\bchoose\b.*\b(option|number|reply|answer|1|2|3)\b/i,
    /\bselect\b.*\b(option|number|reply|answer|1|2|3)\b/i,
    /\bpick\b.*\b(option|number|reply|answer|1|2|3)\b/i,
    /\breply\b.*\b(with|using)\b.*\b(1|2|3|number)\b/i,
    /\brespond\b.*\b(with|using)\b.*\b(1|2|3|number)\b/i,
    /\bwhich\s+(option|one)\b/i,
    /\boptions?\b.*\?/i,
  ];
  return cuePatterns.some((pattern) => pattern.test(text));
}

function buildAssistantChoiceSourceKey(message) {
  if (!message || message.role !== "assistant") {
    return "";
  }
  return `${String(message.noteTimestamp || "")}|${String(message.text || "")}`;
}

function latestAssistantChoiceReplyBundle() {
  const last = state.chatMessages[state.chatMessages.length - 1];
  if (!last || last.role !== "assistant") {
    return { key: "", choices: [] };
  }
  const text = String(last.text || "");
  const key = buildAssistantChoiceSourceKey(last);
  if (!hasChoicePromptCue(text)) {
    return { key, choices: [] };
  }
  const choices = extractChoiceRepliesFromText(text);
  if (!isLikelyNumericChoiceSet(choices)) {
    return { key, choices: [] };
  }
  return { key, choices };
}

function normalizePromptMode(value, fallback = "live") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (["live", "queue", "stop"].includes(normalized)) {
    return normalized;
  }
  return fallback;
}

function clearComposerBusyTimer() {
  if (!state.composerBusyTimer) {
    return;
  }
  clearTimeout(state.composerBusyTimer);
  state.composerBusyTimer = null;
}

function updateComposerInteractivity() {
  const blockedByStop = state.promptMode === "stop";
  const busy = state.composerBusy;
  const disableInput = busy || blockedByStop;
  els.noteMessage.disabled = disableInput;
  els.sendNoteBtn.disabled = disableInput;
  els.chatRefreshBtn.disabled = busy;
  if (blockedByStop) {
    els.noteMessage.placeholder = "Prompting stopped. Switch to Live or Queue mode.";
  } else {
    els.noteMessage.placeholder = "Type a message for Codex...";
  }
  const quickReplyButtons = els.chatQuickReplies?.querySelectorAll("button") || [];
  for (const button of quickReplyButtons) {
    button.disabled = disableInput;
  }
}

function renderPromptModeControls() {
  const mode = normalizePromptMode(state.promptMode, "live");
  const map = [
    [els.promptModeLiveBtn, "live"],
    [els.promptModeQueueBtn, "queue"],
    [els.promptModeStopBtn, "stop"],
  ];
  for (const [button, key] of map) {
    if (!button) {
      continue;
    }
    button.classList.toggle("active", key === mode);
  }
  if (els.promptQueueCount) {
    const count = state.promptQueue.length;
    els.promptQueueCount.textContent = `Queue ${count}`;
    els.promptQueueCount.title = `Queued prompts waiting to send: ${count}`;
  }
  updateComposerInteractivity();
}

async function flushPromptQueue() {
  if (state.promptMode !== "live" || state.composerBusy || state.promptQueue.length === 0) {
    return;
  }
  const queued = state.promptQueue.shift();
  renderPromptModeControls();
  await sendChatMessage(queued, { fromQueue: true }).catch((error) => {
    els.noteStatus.textContent = `Queue error: ${error.message}`;
  });
}

function setComposerBusy(nextBusy, statusText = "") {
  state.composerBusy = Boolean(nextBusy);
  clearComposerBusyTimer();
  if (state.composerBusy) {
    if (statusText) {
      els.noteStatus.textContent = statusText;
    }
    state.composerBusyTimer = window.setTimeout(() => {
      state.composerBusy = false;
      renderPromptModeControls();
      els.noteStatus.textContent = "Send wait timed out. You can send again.";
      flushPromptQueue().catch(() => null);
    }, 30000);
  } else {
    if (statusText) {
      els.noteStatus.textContent = statusText;
    }
    window.setTimeout(() => {
      flushPromptQueue().catch(() => null);
    }, 0);
  }
  renderPromptModeControls();
}

function setPromptMode(mode, announce = true) {
  const next = normalizePromptMode(mode, state.promptMode || "live");
  if (state.promptMode === next) {
    return;
  }
  state.promptMode = next;
  renderPromptModeControls();
  if (announce) {
    if (next === "live") {
      els.noteStatus.textContent = state.promptQueue.length ? "Live mode enabled. Sending queued prompts..." : "Live mode enabled.";
    } else if (next === "queue") {
      els.noteStatus.textContent = "Queue mode enabled. Send adds prompts to queue.";
    } else {
      els.noteStatus.textContent = "Prompting stopped.";
    }
  }
  if (next === "live") {
    flushPromptQueue().catch(() => null);
  }
}

function renderQuickReplies() {
  const container = els.chatQuickReplies;
  if (!container) {
    return;
  }
  const bundle = latestAssistantChoiceReplyBundle();
  const choices = bundle.choices;
  container.innerHTML = "";
  if (!choices.length || !bundle.key || state.quickReplyDismissedKey === bundle.key) {
    container.hidden = true;
    updateComposerInteractivity();
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const choice of choices) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quick-reply-chip";
    button.dataset.choiceReply = choice.reply;
    button.dataset.choiceSourceKey = bundle.key;
    button.title = `Send "${choice.reply}"`;
    button.innerHTML = `<strong>${choice.reply}</strong><span>${choice.label}</span>`;
    fragment.appendChild(button);
  }
  container.appendChild(fragment);
  container.hidden = false;
  updateComposerInteractivity();
}

function renderChatMessages() {
  els.chatStream.innerHTML = "";
  if (!state.chatMessages.length && !shouldShowThinkingCloud()) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No messages yet.";
    els.chatStream.appendChild(empty);
    renderQuickReplies();
    renderChatUsage();
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const message of state.chatMessages) {
    const role = message.role === "assistant" ? "assistant" : "user";
    const node = document.createElement("article");
    node.className = `chat-bubble ${role}`;
    node.innerHTML = `
      <header>
        <strong>${role === "assistant" ? "Codex" : "You"}</strong>
        <span>${formatNoteClock(message.noteTimestamp)}</span>
      </header>
      <p></p>
    `;
    node.querySelector("p").textContent = message.text || "";
    fragment.appendChild(node);
  }
  if (state.chatMessages.length) {
    els.chatStream.appendChild(fragment);
  }
  syncThinkingCloudIndicator();
  els.chatStream.scrollTop = els.chatStream.scrollHeight;
  renderQuickReplies();
  renderChatUsage();
}

function applyChatSnapshot(snapshot) {
  if (snapshot.status) {
    state.agentStatus = snapshot.status;
  }
  if (Array.isArray(snapshot.history)) {
    state.chatMessages = snapshot.history.slice(-200);
  }
  if (snapshot.usage && typeof snapshot.usage === "object") {
    state.chatUsage = snapshot.usage;
  } else {
    state.chatUsage = null;
  }
  renderAgentStatus();
  renderChatMessages();
  renderTopStatus();
}

function renderActivityFeed() {
  const container = els.activityFeed;
  container.innerHTML = "";
  const events = state.activityEvents || [];
  if (!events.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No activity yet.";
    container.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const event of events.slice(-160)) {
    const item = document.createElement("article");
    const stateClass = String(event.state || "").toLowerCase();
    item.className = `activity-item ${stateClass}`;

    const metaBits = [];
    if (event.source) metaBits.push(event.source);
    if (event.type) metaBits.push(event.type);

    item.innerHTML = `
      <header>
        <span>${formatClock(event.time)}</span>
        <span>${metaBits.join(" | ")}</span>
      </header>
      <p></p>
    `;
    item.querySelector("p").textContent = event.message || "(no message)";
    fragment.appendChild(item);
  }
  container.appendChild(fragment);
  container.scrollTop = container.scrollHeight;
}

async function refreshActivityFeed() {
  const payload = await api("/api/agent/activity");
  state.activityEvents = Array.isArray(payload.events) ? payload.events : [];
  if (payload.status) {
    state.agentStatus = payload.status;
  }
  renderAgentStatus();
  renderActivityFeed();
  renderTopStatus();
  els.activityStatus.textContent = `Updated ${formatClock(new Date().toISOString())}`;
}

function clearChatReconnectTimer() {
  if (!state.wsReconnectTimer) return;
  clearTimeout(state.wsReconnectTimer);
  state.wsReconnectTimer = null;
}

function closeChatSocket() {
  clearChatReconnectTimer();
  clearComposerBusyTimer();
  state.composerBusy = false;
  if (state.ws) {
    try {
      state.ws.close();
    } catch {
      // ignore
    }
  }
  state.ws = null;
  state.wsConnected = false;
  renderPromptModeControls();
}

function scheduleChatReconnect() {
  if (state.wsReconnectTimer || els.appView.hidden) return;
  state.wsReconnectTimer = window.setTimeout(() => {
    state.wsReconnectTimer = null;
    if (els.appView.hidden) {
      return;
    }
    connectChatSocket();
  }, 2500);
}

function connectChatSocket() {
  closeChatSocket();
  const scheme = window.location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${scheme}://${window.location.host}/ws`);
  state.ws = ws;
  setChatConnectionState("Connecting...");

  ws.addEventListener("open", () => {
    state.wsConnected = true;
    setChatConnectionState("Live", true);
  });

  ws.addEventListener("message", (event) => {
    let payload = null;
    try {
      payload = JSON.parse(String(event.data || ""));
    } catch {
      return;
    }
    if (payload.type === "chat:init" || payload.type === "chat:update") {
      applyChatSnapshot(payload);
      return;
    }
    if (payload.type === "activity:event") {
      const eventItem = payload?.event && typeof payload.event === "object" ? payload.event : null;
      if (payload?.status) {
        state.agentStatus = payload.status;
      } else if (eventItem?.state) {
        state.agentStatus = {
          ...(state.agentStatus || {}),
          state: String(eventItem.state || "idle"),
          message: String(eventItem.message || state.agentStatus?.message || ""),
          updatedAt: String(eventItem.time || new Date().toISOString()),
          source: String(eventItem.source || "panel-ws"),
        };
      }
      if (eventItem) {
        state.activityEvents.push(eventItem);
        if (state.activityEvents.length > 240) {
          state.activityEvents.splice(0, state.activityEvents.length - 240);
        }
      }
      renderAgentStatus();
      renderActivityFeed();
      renderTopStatus();
      const stamp = eventItem?.time || new Date().toISOString();
      els.activityStatus.textContent = `Live ${formatClock(stamp)}`;
      return;
    }
    if (payload.type === "chat:ack") {
      setComposerBusy(false, `Queued: ${payload?.note?.filePath || "ok"}`);
      return;
    }
    if (payload.type === "chat:error") {
      setComposerBusy(false, `Chat error: ${payload.error || "Unknown error"}`);
    }
  });

  ws.addEventListener("close", () => {
    state.wsConnected = false;
    if (state.composerBusy) {
      setComposerBusy(false);
    }
    setChatConnectionState("Disconnected. Reconnecting...");
    scheduleChatReconnect();
  });

  ws.addEventListener("error", () => {
    state.wsConnected = false;
    if (state.composerBusy) {
      setComposerBusy(false);
    }
    setChatConnectionState("Socket error.");
    scheduleChatReconnect();
  });
}

async function refreshChatHistory() {
  const snapshot = await api("/api/chat/history");
  applyChatSnapshot(snapshot);
}

async function sendChatMessage(messageOverride = null, options = {}) {
  const fromQueue = Boolean(options?.fromQueue);
  const useOverride = messageOverride !== null && messageOverride !== undefined;
  const message = useOverride ? String(messageOverride).trim() : els.noteMessage.value.trim();
  if (!message) {
    els.noteStatus.textContent = "Message is required.";
    return;
  }

  const quickReplyBundle = latestAssistantChoiceReplyBundle();
  if (quickReplyBundle.key) {
    state.quickReplyDismissedKey = quickReplyBundle.key;
    renderQuickReplies();
  }

  if (!fromQueue && state.promptMode === "stop") {
    els.noteStatus.textContent = "Prompting is stopped. Switch to Live or Queue mode.";
    return;
  }

  if (!fromQueue && state.promptMode === "queue") {
    state.promptQueue.push(message);
    if (!useOverride) {
      els.noteMessage.value = "";
    }
    renderPromptModeControls();
    els.noteStatus.textContent = `Queued prompt (${state.promptQueue.length}).`;
    return;
  }

  if (state.composerBusy) {
    if (!fromQueue && state.promptMode === "queue") {
      state.promptQueue.push(message);
      if (!useOverride) {
        els.noteMessage.value = "";
      }
      renderPromptModeControls();
      els.noteStatus.textContent = `Queued prompt (${state.promptQueue.length}).`;
      return;
    }
    els.noteStatus.textContent = "A send is already in progress.";
    return;
  }

  setComposerBusy(true, fromQueue ? "Sending queued prompt..." : useOverride ? `Sending choice ${message}...` : "Sending...");
  if (state.wsConnected && state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({ type: "chat:send", message }));
    if (!useOverride) {
      els.noteMessage.value = "";
    }
    return;
  }

  try {
    const result = await api("/api/note", {
      method: "POST",
      body: { message },
    });
    if (!useOverride) {
      els.noteMessage.value = "";
    }
    setComposerBusy(false, `Queued: ${result?.note?.filePath || "ok"}`);
    await refreshChatHistory().catch(() => null);
  } catch (error) {
    setComposerBusy(false);
    throw error;
  }
}

function previewUrlFor(manifestId) {
  if (!manifestId) return "about:blank";
  return `/preview/${encodeURIComponent(manifestId)}/`;
}

function updatePreviewFrame() {
  const target = previewUrlFor(state.activePreviewId);
  els.previewFrame.src = target;
  els.previewStatus.textContent = state.activePreviewId ? `Loaded ${state.activePreviewId}` : "No preview selected.";
  els.previewStatus.title = `Preview status: ${els.previewStatus.textContent}`;
  renderChatRuntimeStrip();
}

function renderManifests() {
  const previous = els.manifestSelect.value;
  els.manifestSelect.innerHTML = "";
  if (!state.manifests.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No manifests found";
    els.manifestSelect.appendChild(option);
    state.activePreviewId = "";
    updatePreviewFrame();
    return;
  }

  for (const manifest of state.manifests) {
    const option = document.createElement("option");
    option.value = manifest.id;
    option.textContent = `${manifest.id} (${manifest.mode || "unknown"})`;
    els.manifestSelect.appendChild(option);
  }
  state.activePreviewId = state.manifests.some((m) => m.id === previous) ? previous : state.manifests[0].id;
  els.manifestSelect.value = state.activePreviewId;
  updatePreviewFrame();
}

function restartAutoRefresh() {
  if (state.autoRefreshTimer) {
    clearInterval(state.autoRefreshTimer);
    state.autoRefreshTimer = null;
  }
  const enabled = els.autoRefreshToggle.checked;
  const refreshMs = Number.parseInt(els.refreshMsInput.value, 10);
  if (!enabled || !Number.isFinite(refreshMs) || refreshMs < 1000) {
    renderChatRuntimeStrip();
    return;
  }

  state.autoRefreshTimer = window.setInterval(() => {
    if (!state.activePreviewId || document.hidden) return;
    try {
      els.previewFrame.contentWindow.location.reload();
    } catch {
      els.previewFrame.src = previewUrlFor(state.activePreviewId);
    }
  }, refreshMs);
  renderChatRuntimeStrip();
}

async function openPreviewFullscreen() {
  const target = els.previewViewport || els.previewFrame;
  if (document.fullscreenElement) {
    await document.exitFullscreen().catch(() => null);
    return;
  }
  if (target.requestFullscreen) {
    await target.requestFullscreen().catch(() => null);
    return;
  }
  window.open(previewUrlFor(state.activePreviewId), "_blank", "noopener,noreferrer");
}

function selectedCodexProject() {
  return els.codexSessionProject.value.trim() || state.activeProject || "";
}

function renderCodexRegistrySummary() {
  const registry = state.codexRegistry;
  if (!registry) {
    els.codexSessionPreview.value = "No registry loaded.";
    return;
  }

  const lines = [];
  lines.push(`Global default: ${registry?.defaults?.global || "(none)"}`);
  const perProject = registry?.defaults?.perProject || {};
  const entries = Object.entries(perProject);
  if (entries.length) {
    lines.push("Per-project defaults:");
    for (const [project, sessionName] of entries) {
      lines.push(`- ${project} -> ${sessionName}`);
    }
  } else {
    lines.push("Per-project defaults: (none)");
  }
  lines.push("");
  lines.push("Sessions:");
  for (const session of state.codexSessions) {
    lines.push(`- ${session.name} -> ${session.target}${session.retired ? " [retired]" : ""}`);
  }
  els.codexSessionPreview.value = lines.join("\n");
}

function fillCodexFormFromSelection() {
  const selectedName = els.codexSessionSelect.value;
  const selected = state.codexSessions.find((entry) => entry.name === selectedName);
  if (!selected) return;
  els.codexSessionName.value = selected.name || "";
  els.codexSessionTarget.value = selected.target || "";
  if (!els.codexSessionProject.value && Array.isArray(selected.projectHints) && selected.projectHints.length) {
    els.codexSessionProject.value = selected.projectHints[0];
  }
  els.codexSessionNotes.value = selected.notes || "";
  renderChatRuntimeStrip();
}

function renderCodexSessionSelect() {
  const previous = els.codexSessionSelect.value;
  els.codexSessionSelect.innerHTML = "";
  if (!state.codexSessions.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No sessions";
    els.codexSessionSelect.appendChild(option);
    renderCodexRegistrySummary();
    return;
  }
  for (const session of state.codexSessions) {
    const option = document.createElement("option");
    option.value = session.name;
    option.textContent = `${session.name}${session.retired ? " (retired)" : ""}`;
    els.codexSessionSelect.appendChild(option);
  }
  const preferred = previous && state.codexSessions.some((entry) => entry.name === previous) ? previous : state.codexSessions[0].name;
  els.codexSessionSelect.value = preferred;
  fillCodexFormFromSelection();
  renderCodexRegistrySummary();
  renderChatRuntimeStrip();
}

function applyCodexSessionsPayload(payload) {
  state.codexRegistry = payload.registry || null;
  const sessions = Array.isArray(payload.sessions)
    ? payload.sessions
    : Array.isArray(payload?.registry?.sessions)
      ? payload.registry.sessions
      : [];
  state.codexSessions = [...sessions].sort((left, right) => {
    const retiredDiff = Number(Boolean(left.retired)) - Number(Boolean(right.retired));
    if (retiredDiff !== 0) return retiredDiff;
    return String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""));
  });
  renderCodexSessionSelect();
}

async function refreshCodexSessions() {
  const payload = await api("/api/codex/sessions");
  applyCodexSessionsPayload(payload);
}

async function upsertCodexSession() {
  const name = els.codexSessionName.value.trim();
  const target = els.codexSessionTarget.value.trim();
  if (!name || !target) {
    els.codexSessionStatus.textContent = "Session name and target are required.";
    return;
  }
  const payload = await api("/api/codex/sessions/upsert", {
    method: "POST",
    body: {
      name,
      target,
      project: selectedCodexProject(),
      notes: els.codexSessionNotes.value.trim(),
    },
  });
  applyCodexSessionsPayload(payload);
  els.codexSessionStatus.textContent = `Saved session ${name}.`;
}

async function createCodexSession() {
  const name = els.codexSessionName.value.trim();
  if (!name) {
    els.codexSessionStatus.textContent = "Session name is required.";
    return;
  }
  const payload = await api("/api/codex/sessions/create", {
    method: "POST",
    body: {
      name,
      project: selectedCodexProject(),
      notes: els.codexSessionNotes.value.trim(),
    },
  });
  applyCodexSessionsPayload(payload);
  els.codexSessionTarget.value = payload?.created?.target || "";
  els.codexSessionStatus.textContent = `Created session ${name}.`;
}

async function setCodexSessionDefault() {
  const name = els.codexSessionName.value.trim() || els.codexSessionSelect.value.trim();
  if (!name) {
    els.codexSessionStatus.textContent = "Session name is required.";
    return;
  }
  const project = selectedCodexProject();
  const payload = await api("/api/codex/sessions/default", {
    method: "POST",
    body: {
      name,
      project,
    },
  });
  applyCodexSessionsPayload(payload);
  els.codexSessionStatus.textContent = `Default set to ${name}${project ? ` for ${project}` : " (global)"}.`;
}

async function retireCodexSession() {
  const name = els.codexSessionName.value.trim() || els.codexSessionSelect.value.trim();
  if (!name) {
    els.codexSessionStatus.textContent = "Session name is required.";
    return;
  }
  const payload = await api("/api/codex/sessions/retire", {
    method: "POST",
    body: { name },
  });
  applyCodexSessionsPayload(payload);
  els.codexSessionStatus.textContent = `Retired session ${name}.`;
}

async function prepCodexContext(mode) {
  const project = selectedCodexProject();
  els.codexSessionStatus.textContent = `Preparing ${mode}${project ? ` for ${project}` : ""}...`;
  const payload = await api("/api/codex/sessions/prep", {
    method: "POST",
    body: {
      mode,
      project,
      runMcpPrep: true,
      generateBriefing: true,
    },
  });
  setCommandResult(JSON.stringify(payload, null, 2));
  const folder = payload?.latestSession?.folderPath || "(unknown)";
  els.codexSessionStatus.textContent = `Prep complete (${mode}) -> ${folder}`;
}

async function refreshRelayStatus() {
  const payload = await api("/api/relay/status");
  state.activeRelay = payload.activeRelay || null;
  state.activeTunnel = payload.activeTunnel || state.activeTunnel || null;
  renderRelayStatus();
  renderTunnelStatus();
  renderTopStatus();
}

async function startRelayWatcher() {
  const sessionName = (els.codexSessionName.value.trim() || els.codexSessionSelect.value.trim() || "codex-chat").trim();
  const project = selectedCodexProject();
  els.codexSessionStatus.textContent = `Starting relay watcher (${sessionName})...`;

  const payload = await api("/api/relay/start", {
    method: "POST",
    body: {
      sessionName,
      project,
      useLast: false,
      dryRun: false,
      startFromLatest: true,
      pollMs: 1200,
      history: 16,
    },
  });
  state.activeRelay = payload.activeRelay || null;
  renderRelayStatus();
  renderTopStatus();
  els.codexSessionStatus.textContent = `Relay watcher started (${sessionName}).`;
  setCommandResult(JSON.stringify(payload, null, 2));
}

async function stopRelayWatcher() {
  els.codexSessionStatus.textContent = "Stopping relay watcher...";
  const payload = await api("/api/relay/stop", {
    method: "POST",
    body: {},
  });
  state.activeRelay = payload.activeRelay || null;
  renderRelayStatus();
  renderTopStatus();
  els.codexSessionStatus.textContent = payload.stopped ? "Relay watcher stop requested." : "Relay watcher was not running.";
  setCommandResult(JSON.stringify(payload, null, 2));
}

function renderConnectionHelp() {
  const help = state.connectionHelp;
  if (!help) {
    els.connectionMode.textContent = "Connection details unavailable.";
    els.connectionMode.title = "Connection details are not available yet.";
    els.mobileUrlText.value = "";
    els.mobileUrlText.title = "No recommended mobile URL available.";
    els.tunnelUrlText.value = "";
    els.tunnelUrlText.title = "No tunnel information available.";
    els.connectionAdvice.textContent = "";
    els.connectionAdvice.title = "No connection guidance available.";
    els.enableHttpsBtn.disabled = false;
    els.useAdaptiveSecurityBtn.disabled = false;
    renderTunnelStatus();
    renderChatRuntimeStrip();
    return;
  }
  const helpTunnel = help?.tunnel && typeof help.tunnel === "object" ? help.tunnel : null;
  if (helpTunnel?.active && helpTunnel?.url) {
    state.activeTunnel = {
      provider: String(helpTunnel.provider || state.activeTunnel?.provider || ""),
      mode: normalizeTunnelMode(helpTunnel.mode || state.activeTunnel?.mode || state.preferredTunnelMode, "quick"),
      url: String(helpTunnel.url || ""),
      pid: Number.parseInt(String(helpTunnel.pid || state.activeTunnel?.pid || 0), 10) || 0,
      startedAt: String(helpTunnel.startedAt || state.activeTunnel?.startedAt || ""),
    };
  } else if (!state.activeTunnel?.url) {
    state.activeTunnel = null;
  }
  state.preferredTunnelMode = normalizeTunnelMode(
    helpTunnel?.configuredMode || helpTunnel?.mode || state.activeTunnel?.mode || state.preferredTunnelMode,
    "quick"
  );
  const isHttpsRequired = Boolean(help?.panel?.requireHttps);
  const securityMode = String(help?.panel?.securityMode || "");
  const host = String(help?.panel?.host || "");
  const bindLabel = host === "0.0.0.0" ? "LAN bind active" : "Local bind only";
  const security = String(help?.security?.label || (isHttpsRequired ? "HTTPS required" : "HTTP allowed"));
  const activeTunnelUrl = String(state.activeTunnel?.url || helpTunnel?.url || "").trim();
  let mobile = activeTunnelUrl || String(help?.guidance?.recommendedMobileUrl || "");
  if (!mobile) {
    mobile = isHttpsRequired ? "(HTTPS tunnel URL required)" : "(No LAN URL available)";
  }
  els.connectionMode.textContent = `${bindLabel} | ${security}`;
  els.connectionMode.title = `Connection mode: ${els.connectionMode.textContent}`;
  els.mobileUrlText.value = mobile;
  els.mobileUrlText.title = `Recommended mobile URL: ${mobile}`;
  els.connectionAdvice.textContent = activeTunnelUrl
    ? `External tunnel live: ${activeTunnelUrl}`
    : String(help?.guidance?.action || "");
  els.connectionAdvice.title = `Connection guidance: ${els.connectionAdvice.textContent}`;
  els.enableHttpsBtn.disabled = securityMode === "on";
  els.useAdaptiveSecurityBtn.disabled = securityMode === "auto";
  renderTunnelStatus();
  renderChatRuntimeStrip();
}

async function refreshConnectionHelp() {
  const payload = await api("/api/connection/help");
  state.connectionHelp = payload;
  renderConnectionHelp();
}

async function refreshTunnelStatus() {
  const payload = await api("/api/tunnel/status");
  state.activeTunnel = payload.activeTunnel || null;
  state.preferredTunnelMode = normalizeTunnelMode(payload.mode || state.activeTunnel?.mode || state.preferredTunnelMode, "quick");
  if (payload?.help) {
    state.connectionHelp = payload.help;
  }
  renderConnectionHelp();
}

async function startTunnel() {
  const mode = currentTunnelMode();
  els.connectionAdvice.textContent = `Starting external tunnel (${mode})...`;
  const payload = await api("/api/tunnel/start", {
    method: "POST",
    body: {
      mode,
    },
  });
  state.activeTunnel = payload.activeTunnel || null;
  state.preferredTunnelMode = normalizeTunnelMode(payload.mode || state.activeTunnel?.mode || state.preferredTunnelMode, "quick");
  if (payload?.help) {
    state.connectionHelp = payload.help;
  }
  renderConnectionHelp();
  if (state.activeTunnel?.url) {
    els.connectionAdvice.textContent = `Tunnel live (${state.preferredTunnelMode}): ${state.activeTunnel.url}`;
  } else {
    els.connectionAdvice.textContent = `Tunnel started (${state.preferredTunnelMode}).`;
  }
  setCommandResult(JSON.stringify(payload, null, 2));
}

async function stopTunnel() {
  els.connectionAdvice.textContent = "Stopping external tunnel...";
  const payload = await api("/api/tunnel/stop", {
    method: "POST",
    body: {},
  });
  state.activeTunnel = payload.activeTunnel || null;
  if (payload?.help) {
    state.connectionHelp = payload.help;
  }
  renderConnectionHelp();
  els.connectionAdvice.textContent = payload.stopped ? "Tunnel stop requested." : "Tunnel was not running.";
  setCommandResult(JSON.stringify(payload, null, 2));
}

async function updateSecurityMode(mode) {
  const payload = await api("/api/security/mode", {
    method: "POST",
    body: {
      mode,
    },
  });
  if (payload?.help) {
    state.connectionHelp = payload.help;
    renderConnectionHelp();
  } else {
    await refreshConnectionHelp();
  }
  const label = String(payload?.mode || mode);
  els.connectionAdvice.textContent = `Security mode updated: ${label}.`;
  setCommandResult(JSON.stringify(payload, null, 2));
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "absolute";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(area);
  if (!ok) throw new Error("Clipboard copy failed.");
}

function initializeRuntimeStrip() {
  const collapsed = safeLocalStorageGet(RUNTIME_STRIP_STORAGE_KEY) === "1";
  els.chatRuntimeDetails.open = !collapsed;
  renderChatRuntimeStrip();
}

function setControlsDisabled(disabled) {
  const buttons = [
    els.refreshBtn,
    els.mobileMenuBtn,
    els.navPreviewBtn,
    els.navActivityBtn,
    els.navSessionsBtn,
    els.navConnectionBtn,
    els.navOutputBtn,
    els.navTogglePanelsBtn,
    els.mobileNavCloseBtn,
    els.utilityDockCloseBtn,
    els.chatPreviewBtn,
    els.sendNoteBtn,
    els.chatRefreshBtn,
    els.loadPreviewBtn,
    els.previewFullscreenBtn,
    els.openPreviewTabBtn,
    els.activityRefreshBtn,
    els.codexRefreshBtn,
    els.codexUpsertBtn,
    els.codexCreateBtn,
    els.codexSetDefaultBtn,
    els.codexRetireBtn,
    els.codexPrepQuickBtn,
    els.codexPrepFullBtn,
    els.relayStartBtn,
    els.relayStopBtn,
    els.relayRefreshBtn,
    els.refreshConnectionHelpBtn,
    els.copyMobileUrlBtn,
    els.tunnelStartBtn,
    els.tunnelStopBtn,
    els.tunnelRefreshBtn,
    els.openTunnelUrlBtn,
    els.enableHttpsBtn,
    els.useAdaptiveSecurityBtn,
    els.promptModeLiveBtn,
    els.promptModeQueueBtn,
    els.promptModeStopBtn,
  ];
  for (const button of buttons) {
    button.disabled = disabled;
  }
  const quickReplyButtons = els.chatQuickReplies?.querySelectorAll("button") || [];
  for (const button of quickReplyButtons) {
    button.disabled = disabled;
  }
  if (!disabled) {
    renderRelayStatus();
    renderConnectionHelp();
    renderPromptModeControls();
    renderQuickReplies();
  }
}

async function refreshSessionMeta() {
  const session = await api("/api/session");
  state.csrfToken = session.csrfToken;
  state.commandRunning = Boolean(session.commandRunning);
  state.activeDev = session.activeDev || null;
  state.activeRelay = session.activeRelay || null;
  state.activeTunnel = session.activeTunnel || null;
  state.previewRefreshMs = session.previewRefreshMs || 3000;
  renderRelayStatus();
  renderTunnelStatus();
  renderTopStatus();
}

async function refreshSessionData() {
  await refreshSessionMeta();

  const projectsPayload = await api("/api/projects");
  state.projects = projectsPayload.projects || [];
  state.activeProject = projectsPayload.activeProject || state.projects[0]?.slug || "";

  const manifestsPayload = await api("/api/manifests");
  state.manifests = manifestsPayload.manifests || [];
  renderManifests();

  if (!els.codexSessionProject.value) {
    els.codexSessionProject.value = state.activeProject || "";
  }
  if (!els.refreshMsInput.value) {
    els.refreshMsInput.value = String(state.previewRefreshMs);
  }

  await refreshConnectionHelp().catch(() => null);
  await refreshCodexSessions().catch(() => null);
  await refreshChatHistory().catch(() => null);
  await refreshActivityFeed().catch(() => null);
}

function startPolling() {
  if (state.activityTimer) {
    clearInterval(state.activityTimer);
  }
  if (state.metaTimer) {
    clearInterval(state.metaTimer);
  }

  state.activityTimer = window.setInterval(() => {
    if (document.hidden || els.appView.hidden) return;
    refreshActivityFeed().catch(() => null);
  }, 2200);

  state.metaTimer = window.setInterval(() => {
    if (document.hidden || els.appView.hidden) return;
    refreshSessionMeta().catch(() => null);
  }, 9000);
}

function stopPolling() {
  if (state.activityTimer) {
    clearInterval(state.activityTimer);
    state.activityTimer = null;
  }
  if (state.metaTimer) {
    clearInterval(state.metaTimer);
    state.metaTimer = null;
  }
}

async function onLoginSubmit(event) {
  event.preventDefault();
  els.loginError.hidden = true;
  try {
    const payload = await api("/api/auth/login", {
      method: "POST",
      body: { password: els.password.value },
    });
    state.csrfToken = payload.csrfToken;
    els.password.value = "";
    await refreshSessionData();
    setLoggedIn(true);
    connectChatSocket();
    restartAutoRefresh();
    startPolling();
  } catch (error) {
    setLoggedIn(false);
    els.loginError.textContent = error.message;
    els.loginError.hidden = false;
  }
}

async function onLogout() {
  try {
    await api("/api/auth/logout", { method: "POST", body: {} });
  } catch {
    // ignore
  }
  setMobileNavOpen(false);
  clearComposerBusyTimer();
  state.composerBusy = false;
  state.promptQueue = [];
  state.promptMode = "live";
  closeChatSocket();
  stopPolling();
  if (state.autoRefreshTimer) {
    clearInterval(state.autoRefreshTimer);
    state.autoRefreshTimer = null;
  }
  setLoggedIn(false);
  renderPromptModeControls();
}

async function onBootstrap() {
  setLoggedIn(false);
  setMobileNavOpen(false);
  try {
    await refreshSessionData();
    setLoggedIn(true);
    connectChatSocket();
    restartAutoRefresh();
    startPolling();
  } catch {
    setLoggedIn(false);
  }
}

function bindEvents() {
  els.loginForm.addEventListener("submit", onLoginSubmit);
  els.logoutBtn.addEventListener("click", onLogout);
  els.chatRuntimeDetails.addEventListener("toggle", () => {
    const collapsed = !els.chatRuntimeDetails.open;
    safeLocalStorageSet(RUNTIME_STRIP_STORAGE_KEY, collapsed ? "1" : "0");
  });
  els.navPreviewBtn.addEventListener("click", () => setActiveUtilityPanel("preview"));
  els.navActivityBtn.addEventListener("click", () => setActiveUtilityPanel("activity"));
  els.navSessionsBtn.addEventListener("click", () => setActiveUtilityPanel("sessions"));
  els.navConnectionBtn.addEventListener("click", () => setActiveUtilityPanel("connection"));
  els.navOutputBtn.addEventListener("click", () => setActiveUtilityPanel("output"));
  els.navTogglePanelsBtn.addEventListener("click", () => {
    setUtilityCollapsed(!state.utilityCollapsed);
  });
  els.mobileMenuBtn.addEventListener("click", () => {
    setMobileNavOpen(!state.mobileNavOpen);
  });
  els.mobileNavCloseBtn.addEventListener("click", () => {
    setMobileNavOpen(false);
  });
  els.mobileNavBackdrop.addEventListener("click", () => {
    setMobileNavOpen(false);
  });
  els.utilityDockCloseBtn.addEventListener("click", () => {
    setUtilityCollapsed(true);
  });
  els.utilityDockBackdrop.addEventListener("click", () => {
    setUtilityCollapsed(true);
  });
  els.chatPreviewBtn.addEventListener("click", () => {
    setActiveUtilityPanel("preview");
  });

  els.refreshBtn.addEventListener("click", async () => {
    setControlsDisabled(true);
    try {
      await refreshSessionData();
    } catch (error) {
      setCommandResult(error.message, true);
    } finally {
      setControlsDisabled(false);
    }
  });

  els.sendNoteBtn.addEventListener("click", async () => {
    try {
      await sendChatMessage();
    } catch (error) {
      els.noteStatus.textContent = `Error: ${error.message}`;
    }
  });

  if (els.promptModeLiveBtn) {
    els.promptModeLiveBtn.addEventListener("click", () => setPromptMode("live"));
  }
  if (els.promptModeQueueBtn) {
    els.promptModeQueueBtn.addEventListener("click", () => setPromptMode("queue"));
  }
  if (els.promptModeStopBtn) {
    els.promptModeStopBtn.addEventListener("click", () => setPromptMode("stop"));
  }

  if (els.chatQuickReplies) {
    els.chatQuickReplies.addEventListener("click", (event) => {
      const target = event.target instanceof HTMLElement ? event.target.closest("button[data-choice-reply]") : null;
      if (!target) {
        return;
      }
      const reply = String(target.dataset.choiceReply || "").trim();
      if (!reply) {
        return;
      }
      const sourceKey = String(target.dataset.choiceSourceKey || "").trim();
      if (sourceKey) {
        state.quickReplyDismissedKey = sourceKey;
        renderQuickReplies();
      }
      sendChatMessage(reply).catch((error) => {
        els.noteStatus.textContent = `Error: ${error.message}`;
      });
    });
  }

  els.noteMessage.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendChatMessage().catch((error) => {
        els.noteStatus.textContent = `Error: ${error.message}`;
      });
    }
  });

  els.chatRefreshBtn.addEventListener("click", async () => {
    if (state.wsConnected && state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ type: "chat:refresh" }));
      return;
    }
    await refreshChatHistory().catch((error) => {
      els.noteStatus.textContent = `Error: ${error.message}`;
    });
  });

  els.manifestSelect.addEventListener("change", () => {
    state.activePreviewId = els.manifestSelect.value;
    updatePreviewFrame();
  });
  els.loadPreviewBtn.addEventListener("click", () => {
    state.activePreviewId = els.manifestSelect.value;
    updatePreviewFrame();
  });
  els.previewFullscreenBtn.addEventListener("click", () => {
    openPreviewFullscreen().catch(() => null);
  });
  els.openPreviewTabBtn.addEventListener("click", () => {
    window.open(previewUrlFor(state.activePreviewId), "_blank", "noopener,noreferrer");
  });
  els.autoRefreshToggle.addEventListener("change", restartAutoRefresh);
  els.refreshMsInput.addEventListener("change", restartAutoRefresh);

  els.activityRefreshBtn.addEventListener("click", async () => {
    await refreshActivityFeed().catch((error) => {
      els.activityStatus.textContent = `Error: ${error.message}`;
    });
  });

  els.codexSessionSelect.addEventListener("change", fillCodexFormFromSelection);
  els.codexSessionName.addEventListener("input", renderChatRuntimeStrip);
  els.codexRefreshBtn.addEventListener("click", async () => {
    await refreshCodexSessions().then(() => {
      els.codexSessionStatus.textContent = "Session registry refreshed.";
    }).catch((error) => {
      els.codexSessionStatus.textContent = `Error: ${error.message}`;
    });
  });
  els.codexUpsertBtn.addEventListener("click", () => upsertCodexSession().catch((error) => {
    els.codexSessionStatus.textContent = `Error: ${error.message}`;
  }));
  els.codexCreateBtn.addEventListener("click", () => createCodexSession().catch((error) => {
    els.codexSessionStatus.textContent = `Error: ${error.message}`;
  }));
  els.codexSetDefaultBtn.addEventListener("click", () => setCodexSessionDefault().catch((error) => {
    els.codexSessionStatus.textContent = `Error: ${error.message}`;
  }));
  els.codexRetireBtn.addEventListener("click", () => retireCodexSession().catch((error) => {
    els.codexSessionStatus.textContent = `Error: ${error.message}`;
  }));
  els.codexPrepQuickBtn.addEventListener("click", () => prepCodexContext("quick").catch((error) => {
    els.codexSessionStatus.textContent = `Error: ${error.message}`;
    setCommandResult(error.message, true);
  }));
  els.codexPrepFullBtn.addEventListener("click", () => prepCodexContext("full").catch((error) => {
    els.codexSessionStatus.textContent = `Error: ${error.message}`;
    setCommandResult(error.message, true);
  }));
  els.relayStartBtn.addEventListener("click", () => startRelayWatcher().catch((error) => {
    els.codexSessionStatus.textContent = `Error: ${error.message}`;
    setCommandResult(error.message, true);
  }));
  els.relayStopBtn.addEventListener("click", () => stopRelayWatcher().catch((error) => {
    els.codexSessionStatus.textContent = `Error: ${error.message}`;
    setCommandResult(error.message, true);
  }));
  els.relayRefreshBtn.addEventListener("click", () => refreshRelayStatus().catch((error) => {
    els.codexSessionStatus.textContent = `Error: ${error.message}`;
  }));

  els.refreshConnectionHelpBtn.addEventListener("click", () => {
    refreshConnectionHelp().catch((error) => {
      els.connectionAdvice.textContent = `Error: ${error.message}`;
    });
  });
  els.copyMobileUrlBtn.addEventListener("click", async () => {
    const url = els.mobileUrlText.value.trim();
    if (!url || url.startsWith("(")) {
      els.connectionAdvice.textContent = "No copyable mobile URL available.";
      return;
    }
    try {
      await copyTextToClipboard(url);
      els.connectionAdvice.textContent = `Copied ${url}`;
    } catch (error) {
      els.connectionAdvice.textContent = `Copy failed: ${error.message}`;
    }
  });
  els.tunnelModeQuickBtn.addEventListener("click", () => {
    setPreferredTunnelMode("quick");
    els.connectionAdvice.textContent = "Tunnel mode set to quick.";
  });
  els.tunnelModeTokenBtn.addEventListener("click", () => {
    setPreferredTunnelMode("token");
    els.connectionAdvice.textContent = "Tunnel mode set to token.";
  });
  els.tunnelModeNamedBtn.addEventListener("click", () => {
    setPreferredTunnelMode("named");
    els.connectionAdvice.textContent = "Tunnel mode set to named.";
  });
  els.tunnelStartBtn.addEventListener("click", () => {
    startTunnel().catch((error) => {
      els.connectionAdvice.textContent = `Error: ${error.message}`;
      setCommandResult(error.message, true);
    });
  });
  els.tunnelStopBtn.addEventListener("click", () => {
    stopTunnel().catch((error) => {
      els.connectionAdvice.textContent = `Error: ${error.message}`;
      setCommandResult(error.message, true);
    });
  });
  els.tunnelRefreshBtn.addEventListener("click", () => {
    refreshTunnelStatus().catch((error) => {
      els.connectionAdvice.textContent = `Error: ${error.message}`;
      setCommandResult(error.message, true);
    });
  });
  els.openTunnelUrlBtn.addEventListener("click", () => {
    const url = String(state.activeTunnel?.url || state.connectionHelp?.tunnel?.url || "").trim();
    if (!url) {
      els.connectionAdvice.textContent = "No active tunnel URL to open.";
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  });
  els.enableHttpsBtn.addEventListener("click", () => {
    updateSecurityMode("on").catch((error) => {
      els.connectionAdvice.textContent = `Error: ${error.message}`;
      setCommandResult(error.message, true);
    });
  });
  els.useAdaptiveSecurityBtn.addEventListener("click", () => {
    updateSecurityMode("auto").catch((error) => {
      els.connectionAdvice.textContent = `Error: ${error.message}`;
      setCommandResult(error.message, true);
    });
  });

  window.addEventListener("resize", () => {
    applyResponsiveUtilityDefaults();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    if (state.mobileNavOpen) {
      setMobileNavOpen(false);
      return;
    }
    if (isMobileViewport() && !state.utilityCollapsed) {
      setUtilityCollapsed(true);
    }
  });
}

bindEvents();
applyStaticTooltips();
initializeRuntimeStrip();
setActiveUtilityPanel("preview", { expand: false });
applyResponsiveUtilityDefaults(true);
renderRelayStatus();
renderTunnelModeControls();
renderPromptModeControls();
onBootstrap();
