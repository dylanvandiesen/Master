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

  chatPreviewBtn: document.getElementById("chatPreviewBtn"),
  chatConnection: document.getElementById("chatConnection"),
  agentStateBadge: document.getElementById("agentStateBadge"),
  chatLiveStatus: document.getElementById("chatLiveStatus"),
  chatRuntimeDetails: document.getElementById("chatRuntimeDetails"),
  chatRuntimeSummary: document.getElementById("chatRuntimeSummary"),
  chatRuntimeValues: document.getElementById("chatRuntimeValues"),
  chatStream: document.getElementById("chatStream"),
  noteTitle: document.getElementById("noteTitle"),
  noteMessage: document.getElementById("noteMessage"),
  sendNoteBtn: document.getElementById("sendNoteBtn"),
  chatRefreshBtn: document.getElementById("chatRefreshBtn"),
  noteStatus: document.getElementById("noteStatus"),

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
  const next = Boolean(open) && isMobileViewport();
  state.mobileNavOpen = next;
  document.body.classList.toggle("mobile-nav-open", next);
  if (els.mobileNavBackdrop) {
    els.mobileNavBackdrop.hidden = !next;
  }
  if (els.mobileMenuBtn) {
    els.mobileMenuBtn.setAttribute("aria-expanded", next ? "true" : "false");
  }
}

function setUtilityCollapsed(collapsed) {
  state.utilityCollapsed = Boolean(collapsed);
  els.utilityDock.classList.toggle("collapsed", state.utilityCollapsed);
  els.navTogglePanelsBtn.textContent = state.utilityCollapsed ? "OPEN" : "HIDE";
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

  if (state.mobileNavOpen && isMobileViewport()) {
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
  if (!isMobileViewport() && state.mobileNavOpen) {
    setMobileNavOpen(false);
  }
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

function formatTunnelStatus() {
  if (!state.activeTunnel) {
    return "Tunnel stopped";
  }
  const provider = state.activeTunnel.provider ? ` (${state.activeTunnel.provider})` : "";
  const url = state.activeTunnel.url ? ` ${state.activeTunnel.url}` : "";
  return `Tunnel live${provider}${url} pid=${state.activeTunnel.pid}`;
}

function renderTopStatus() {
  const command = state.commandRunning ? " | command running" : "";
  const agent = state.agentStatus?.state ? ` | codex ${state.agentStatus.state}` : "";
  const relay = state.activeRelay ? " | relay active" : "";
  const tunnel = state.activeTunnel ? " | tunnel live" : "";
  els.statusLine.textContent = `${formatDevStatus()}${relay}${tunnel}${agent}${command}`;
  renderChatRuntimeStrip();
}

function renderRelayStatus() {
  els.relayStatusText.value = formatRelayStatus();
  const running = Boolean(state.activeRelay);
  els.relayStartBtn.disabled = running;
  els.relayStopBtn.disabled = !running;
  renderChatRuntimeStrip();
}

function renderTunnelStatus() {
  const helpTunnel = state.connectionHelp?.tunnel && typeof state.connectionHelp.tunnel === "object" ? state.connectionHelp.tunnel : null;
  const activeUrl = String(state.activeTunnel?.url || helpTunnel?.url || "").trim();
  const hasActiveTunnel = Boolean(state.activeTunnel || (helpTunnel?.active && activeUrl));
  if (state.activeTunnel) {
    els.tunnelUrlText.value = formatTunnelStatus();
  } else if (activeUrl) {
    els.tunnelUrlText.value = `Tunnel live ${activeUrl}`;
  } else {
    els.tunnelUrlText.value = "Tunnel stopped";
  }
  els.tunnelStartBtn.disabled = hasActiveTunnel;
  els.tunnelStopBtn.disabled = !hasActiveTunnel;
  els.openTunnelUrlBtn.disabled = !activeUrl;
  renderChatRuntimeStrip();
}

function formatClock(raw) {
  const date = new Date(raw || "");
  if (Number.isNaN(date.valueOf())) {
    return String(raw || "");
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
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

function renderChatRuntimeStrip() {
  const details = els.chatRuntimeDetails;
  if (!details) {
    return;
  }

  const securityMode = String(state.connectionHelp?.panel?.securityMode || "unknown");
  const refreshMs = Number.parseInt(els.refreshMsInput.value, 10);
  const refreshLabel = Number.isFinite(refreshMs) ? `${els.autoRefreshToggle.checked ? "on" : "off"} @ ${refreshMs}ms` : "off";
  const mobile = String(state.connectionHelp?.guidance?.recommendedMobileUrl || "").trim() || "none";
  const tunnelUrl = String(state.activeTunnel?.url || state.connectionHelp?.tunnel?.url || "").trim();
  const agentState = String(state.agentStatus?.state || "idle");
  const socketState = state.wsConnected ? "live" : "offline";
  const relayState = state.activeRelay ? "running" : "stopped";
  const tunnelState = tunnelUrl ? "live" : "stopped";

  const checks = [
    { label: "auth", value: state.csrfToken ? "ok" : "missing" },
    { label: "socket", value: socketState },
    { label: "agent", value: agentState || "idle" },
    { label: "relay", value: relayState },
    { label: "tunnel", value: tunnelState },
    { label: "security", value: securityMode },
    { label: "preview", value: state.activePreviewId || "none" },
    { label: "refresh", value: refreshLabel },
    { label: "session", value: preferredSessionLabel() },
    { label: "mobile", value: mobile },
  ];

  const summary = `socket ${socketState} | agent ${agentState || "idle"} | relay ${relayState} | tunnel ${tunnelState}`;
  els.chatRuntimeSummary.textContent = summary;

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

    pill.appendChild(key);
    pill.appendChild(val);
    fragment.appendChild(pill);
  }
  container.appendChild(fragment);
}

function setChatConnectionState(text, isConnected = false) {
  els.chatConnection.textContent = text;
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
  const label = `${status.state || "idle"} | ${status.message || ""}`.trim();
  els.agentStatusText.value = label;

  const badge = els.agentStateBadge;
  badge.textContent = status.state || "idle";
  badge.classList.remove("idle", "pending", "thinking", "working", "blocked");
  badge.classList.add(String(status.state || "idle"));

  const stateText = String(status.state || "idle").toLowerCase();
  const message = String(status.message || "").trim();
  const liveMap = {
    idle: "Codex is idle.",
    pending: "Codex has queued work.",
    thinking: "Codex is thinking...",
    working: "Codex is working...",
    blocked: "Codex is blocked.",
  };
  const liveText = message || liveMap[stateText] || "Codex status updated.";
  els.chatLiveStatus.textContent = liveText;
  els.chatLiveStatus.classList.remove("idle", "pending", "thinking", "working", "blocked");
  els.chatLiveStatus.classList.add(stateText);
  syncThinkingCloudIndicator();
}

function renderChatMessages() {
  els.chatStream.innerHTML = "";
  if (!state.chatMessages.length && !shouldShowThinkingCloud()) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No messages yet.";
    els.chatStream.appendChild(empty);
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
}

function applyChatSnapshot(snapshot) {
  if (snapshot.status) {
    state.agentStatus = snapshot.status;
  }
  if (Array.isArray(snapshot.history)) {
    state.chatMessages = snapshot.history.slice(-200);
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
  if (state.ws) {
    try {
      state.ws.close();
    } catch {
      // ignore
    }
  }
  state.ws = null;
  state.wsConnected = false;
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
      els.noteStatus.textContent = `Queued: ${payload?.note?.filePath || "ok"}`;
      return;
    }
    if (payload.type === "chat:error") {
      els.noteStatus.textContent = `Chat error: ${payload.error || "Unknown error"}`;
    }
  });

  ws.addEventListener("close", () => {
    state.wsConnected = false;
    setChatConnectionState("Disconnected. Reconnecting...");
    scheduleChatReconnect();
  });

  ws.addEventListener("error", () => {
    state.wsConnected = false;
    setChatConnectionState("Socket error.");
    scheduleChatReconnect();
  });
}

async function refreshChatHistory() {
  const snapshot = await api("/api/chat/history");
  applyChatSnapshot(snapshot);
}

async function sendChatMessage() {
  const title = els.noteTitle.value.trim();
  const message = els.noteMessage.value.trim();
  if (!message) {
    els.noteStatus.textContent = "Message is required.";
    return;
  }

  if (state.wsConnected && state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({ type: "chat:send", title, message }));
    els.noteMessage.value = "";
    els.noteStatus.textContent = "Sending...";
    return;
  }

  const result = await api("/api/note", {
    method: "POST",
    body: { title, message },
  });
  els.noteMessage.value = "";
  els.noteStatus.textContent = `Queued: ${result?.note?.filePath || "ok"}`;
  await refreshChatHistory().catch(() => null);
}

function previewUrlFor(manifestId) {
  if (!manifestId) return "about:blank";
  return `/preview/${encodeURIComponent(manifestId)}/`;
}

function updatePreviewFrame() {
  const target = previewUrlFor(state.activePreviewId);
  els.previewFrame.src = target;
  els.previewStatus.textContent = state.activePreviewId ? `Loaded ${state.activePreviewId}` : "No preview selected.";
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
    els.mobileUrlText.value = "";
    els.tunnelUrlText.value = "";
    els.connectionAdvice.textContent = "";
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
      url: String(helpTunnel.url || ""),
      pid: Number.parseInt(String(helpTunnel.pid || state.activeTunnel?.pid || 0), 10) || 0,
      startedAt: String(helpTunnel.startedAt || state.activeTunnel?.startedAt || ""),
    };
  } else if (!state.activeTunnel?.url) {
    state.activeTunnel = null;
  }
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
  els.mobileUrlText.value = mobile;
  els.connectionAdvice.textContent = activeTunnelUrl
    ? `External tunnel live: ${activeTunnelUrl}`
    : String(help?.guidance?.action || "");
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
  if (payload?.help) {
    state.connectionHelp = payload.help;
  }
  renderConnectionHelp();
}

async function startTunnel() {
  els.connectionAdvice.textContent = "Starting external tunnel...";
  const payload = await api("/api/tunnel/start", {
    method: "POST",
    body: {},
  });
  state.activeTunnel = payload.activeTunnel || null;
  if (payload?.help) {
    state.connectionHelp = payload.help;
  }
  renderConnectionHelp();
  if (state.activeTunnel?.url) {
    els.connectionAdvice.textContent = `Tunnel live: ${state.activeTunnel.url}`;
  } else {
    els.connectionAdvice.textContent = "Tunnel started.";
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
  ];
  for (const button of buttons) {
    button.disabled = disabled;
  }
  if (!disabled) {
    renderRelayStatus();
    renderConnectionHelp();
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
  closeChatSocket();
  stopPolling();
  if (state.autoRefreshTimer) {
    clearInterval(state.autoRefreshTimer);
    state.autoRefreshTimer = null;
  }
  setLoggedIn(false);
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
    if (event.key === "Escape" && state.mobileNavOpen) {
      setMobileNavOpen(false);
    }
  });
}

bindEvents();
initializeRuntimeStrip();
setActiveUtilityPanel("preview", { expand: false });
applyResponsiveUtilityDefaults(true);
renderRelayStatus();
onBootstrap();
