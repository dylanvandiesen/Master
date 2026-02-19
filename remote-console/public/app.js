const state = {
  csrfToken: "",
  projects: [],
  manifests: [],
  activePreviewId: "",
  commandRunning: false,
  activeDev: null,
  previewRefreshMs: 3000,
  autoRefreshTimer: null,
  eventSource: null,
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

  projectSelect: document.getElementById("projectSelect"),
  portInput: document.getElementById("portInput"),

  scaffoldBtn: document.getElementById("scaffoldBtn"),
  buildBtn: document.getElementById("buildBtn"),
  buildAllBtn: document.getElementById("buildAllBtn"),
  chatQuickBtn: document.getElementById("chatQuickBtn"),
  chatBriefingBtn: document.getElementById("chatBriefingBtn"),
  startDevSingleBtn: document.getElementById("startDevSingleBtn"),
  startDevAllBtn: document.getElementById("startDevAllBtn"),
  stopDevBtn: document.getElementById("stopDevBtn"),
  commandResult: document.getElementById("commandResult"),

  noteTitle: document.getElementById("noteTitle"),
  noteMessage: document.getElementById("noteMessage"),
  sendNoteBtn: document.getElementById("sendNoteBtn"),
  noteStatus: document.getElementById("noteStatus"),

  manifestSelect: document.getElementById("manifestSelect"),
  refreshMsInput: document.getElementById("refreshMsInput"),
  autoRefreshToggle: document.getElementById("autoRefreshToggle"),
  loadPreviewBtn: document.getElementById("loadPreviewBtn"),
  openPreviewTabBtn: document.getElementById("openPreviewTabBtn"),
  previewFrame: document.getElementById("previewFrame"),

  logsOutput: document.getElementById("logsOutput"),
};

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
    const errorMessage = payload?.error || `${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return payload;
}

function setLoggedIn(isLoggedIn) {
  els.loginView.hidden = isLoggedIn;
  els.appView.hidden = !isLoggedIn;
}

function appendLog(entry) {
  const line = `[${entry.time}] [${entry.source}] ${entry.message}`;
  const existing = els.logsOutput.textContent || "";
  const lines = `${existing}${existing ? "\n" : ""}${line}`.split("\n");
  const tail = lines.slice(-500);
  els.logsOutput.textContent = tail.join("\n");
  els.logsOutput.scrollTop = els.logsOutput.scrollHeight;
}

function formatDevStatus() {
  if (!state.activeDev) {
    return "No active dev process";
  }
  const projectLabel = state.activeDev.mode === "single" ? ` project=${state.activeDev.project || "(auto)"}` : " all-project mode";
  const portLabel = state.activeDev.port ? ` port=${state.activeDev.port}` : "";
  return `Dev running (${state.activeDev.mode})${projectLabel}${portLabel} pid=${state.activeDev.pid}`;
}

function renderStatusLine() {
  const busy = state.commandRunning ? " | command running" : "";
  els.statusLine.textContent = `${formatDevStatus()}${busy}`;
}

function renderProjects(activeProject) {
  const current = els.projectSelect.value;
  els.projectSelect.innerHTML = "";

  if (state.projects.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No projects found";
    els.projectSelect.appendChild(opt);
    return;
  }

  for (const project of state.projects) {
    const opt = document.createElement("option");
    opt.value = project.slug;
    opt.textContent = `${project.name} (${project.slug})`;
    els.projectSelect.appendChild(opt);
  }

  const preferred = current || activeProject || state.projects[0].slug;
  const match = state.projects.find((project) => project.slug === preferred || project.name.toLowerCase() === String(preferred).toLowerCase());
  els.projectSelect.value = match ? match.slug : state.projects[0].slug;
}

function renderManifests() {
  const previous = els.manifestSelect.value;
  els.manifestSelect.innerHTML = "";

  if (state.manifests.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No dev server manifests found";
    els.manifestSelect.appendChild(opt);
    state.activePreviewId = "";
    updatePreviewFrame();
    return;
  }

  for (const manifest of state.manifests) {
    const opt = document.createElement("option");
    const mode = manifest.mode || "unknown";
    const project = manifest.project ? `:${manifest.project}` : "";
    opt.value = manifest.id;
    opt.textContent = `${manifest.id} (${mode}${project})`;
    els.manifestSelect.appendChild(opt);
  }

  const preferred = previous || state.activePreviewId || state.manifests[0].id;
  const exists = state.manifests.find((manifest) => manifest.id === preferred);
  els.manifestSelect.value = exists ? preferred : state.manifests[0].id;
  state.activePreviewId = els.manifestSelect.value;
  updatePreviewFrame();
}

function selectedProject() {
  return els.projectSelect.value || "";
}

function selectedPort() {
  const raw = els.portInput.value.trim();
  return raw;
}

function selectedManifest() {
  return state.manifests.find((manifest) => manifest.id === els.manifestSelect.value) || null;
}

function previewUrlFor(manifestId) {
  if (!manifestId) {
    return "about:blank";
  }
  return `/preview/${encodeURIComponent(manifestId)}/`;
}

function updatePreviewFrame() {
  if (!state.activePreviewId) {
    els.previewFrame.src = "about:blank";
    return;
  }
  els.previewFrame.src = previewUrlFor(state.activePreviewId);
}

function restartAutoRefresh() {
  if (state.autoRefreshTimer) {
    clearInterval(state.autoRefreshTimer);
    state.autoRefreshTimer = null;
  }

  const enabled = els.autoRefreshToggle.checked;
  const refreshMs = Number.parseInt(els.refreshMsInput.value, 10);
  if (!enabled || !Number.isFinite(refreshMs) || refreshMs < 1000) {
    return;
  }

  state.autoRefreshTimer = window.setInterval(() => {
    if (!state.activePreviewId || document.hidden) {
      return;
    }
    try {
      els.previewFrame.contentWindow.location.reload();
    } catch {
      els.previewFrame.src = previewUrlFor(state.activePreviewId);
    }
  }, refreshMs);
}

function setCommandResult(text, isError = false) {
  els.commandResult.textContent = text;
  els.commandResult.classList.toggle("error-block", isError);
}

async function refreshSessionData() {
  const session = await api("/api/session");
  state.csrfToken = session.csrfToken;
  state.commandRunning = Boolean(session.commandRunning);
  state.activeDev = session.activeDev;
  state.previewRefreshMs = session.previewRefreshMs || 3000;

  const projects = await api("/api/projects");
  state.projects = projects.projects || [];

  const manifests = await api("/api/manifests");
  state.manifests = manifests.manifests || [];

  renderProjects(projects.activeProject);
  renderManifests();
  renderStatusLine();

  if (!els.refreshMsInput.value) {
    els.refreshMsInput.value = String(state.previewRefreshMs);
  }

  const logs = await api("/api/logs");
  els.logsOutput.textContent = "";
  for (const entry of logs.logs || []) {
    appendLog(entry);
  }
}

function setControlsDisabled(disabled) {
  const buttons = [
    els.scaffoldBtn,
    els.buildBtn,
    els.buildAllBtn,
    els.chatQuickBtn,
    els.chatBriefingBtn,
    els.startDevSingleBtn,
    els.startDevAllBtn,
    els.stopDevBtn,
    els.refreshBtn,
    els.sendNoteBtn,
  ];
  for (const button of buttons) {
    button.disabled = disabled;
  }
}

async function runAction(path, body = {}) {
  setControlsDisabled(true);
  try {
    const result = await api(path, { method: "POST", body });
    setCommandResult(JSON.stringify(result, null, 2));
  } catch (error) {
    setCommandResult(String(error.message || error), true);
  } finally {
    setControlsDisabled(false);
    await refreshSessionData().catch(() => null);
  }
}

function connectEvents() {
  if (state.eventSource) {
    state.eventSource.close();
    state.eventSource = null;
  }

  const eventSource = new EventSource("/api/events", { withCredentials: true });

  eventSource.addEventListener("log", (event) => {
    try {
      appendLog(JSON.parse(event.data));
    } catch {
      // ignore malformed log entries
    }
  });

  eventSource.addEventListener("state", (event) => {
    try {
      const payload = JSON.parse(event.data);
      state.commandRunning = Boolean(payload.commandRunning);
      state.activeDev = payload.activeDev || null;
      renderStatusLine();
    } catch {
      // ignore malformed state payload
    }
  });

  eventSource.onerror = () => {
    eventSource.close();
    window.setTimeout(connectEvents, 3000);
  };

  state.eventSource = eventSource;
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
    setLoggedIn(true);
    await refreshSessionData();
    connectEvents();
    restartAutoRefresh();
  } catch (error) {
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
  if (state.eventSource) {
    state.eventSource.close();
    state.eventSource = null;
  }
  setLoggedIn(false);
}

async function onBootstrap() {
  try {
    setLoggedIn(true);
    await refreshSessionData();
    connectEvents();
    restartAutoRefresh();
  } catch {
    setLoggedIn(false);
  }
}

function bindEvents() {
  els.loginForm.addEventListener("submit", onLoginSubmit);
  els.logoutBtn.addEventListener("click", onLogout);
  els.refreshBtn.addEventListener("click", async () => {
    await refreshSessionData().catch((error) => setCommandResult(error.message, true));
  });

  els.scaffoldBtn.addEventListener("click", () => runAction("/api/command/scaffold"));
  els.buildBtn.addEventListener("click", () => runAction("/api/command/build", { project: selectedProject() }));
  els.buildAllBtn.addEventListener("click", () => runAction("/api/command/build-all"));
  els.chatQuickBtn.addEventListener("click", () => runAction("/api/chat/quick", { project: selectedProject() }));
  els.chatBriefingBtn.addEventListener("click", () => runAction("/api/chat/briefing"));

  els.startDevSingleBtn.addEventListener("click", () => {
    runAction("/api/dev/start", {
      mode: "single",
      project: selectedProject(),
      port: selectedPort(),
    });
  });

  els.startDevAllBtn.addEventListener("click", () => {
    runAction("/api/dev/start", {
      mode: "all",
      port: selectedPort(),
    });
  });

  els.stopDevBtn.addEventListener("click", () => runAction("/api/dev/stop"));

  els.sendNoteBtn.addEventListener("click", async () => {
    const title = els.noteTitle.value.trim();
    const message = els.noteMessage.value.trim();
    if (!message) {
      els.noteStatus.textContent = "Message is required.";
      return;
    }

    try {
      const result = await api("/api/note", {
        method: "POST",
        body: { title, message },
      });
      els.noteMessage.value = "";
      els.noteStatus.textContent = `Saved: ${result.note.filePath}`;
    } catch (error) {
      els.noteStatus.textContent = `Error: ${error.message}`;
    }
  });

  els.manifestSelect.addEventListener("change", () => {
    state.activePreviewId = els.manifestSelect.value;
    updatePreviewFrame();
  });

  els.loadPreviewBtn.addEventListener("click", () => {
    state.activePreviewId = els.manifestSelect.value;
    updatePreviewFrame();
  });

  els.openPreviewTabBtn.addEventListener("click", () => {
    const manifest = selectedManifest();
    if (!manifest) {
      return;
    }
    window.open(previewUrlFor(manifest.id), "_blank", "noopener,noreferrer");
  });

  els.autoRefreshToggle.addEventListener("change", restartAutoRefresh);
  els.refreshMsInput.addEventListener("change", restartAutoRefresh);
}

bindEvents();
onBootstrap();
