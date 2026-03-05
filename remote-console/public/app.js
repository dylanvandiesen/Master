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
  activeRelays: [],
  activeTunnel: null,
  chatMessages: [],
  chatUsage: null,
  agentStatus: null,
  activityEvents: [],
  activeEnvironment: null,
  envProfiles: null,
  launchRuns: [],
  envRuntime: null,
  agentProfileRegistry: null,
  agentProfiles: [],
  codexRegistry: null,
  codexSessions: [],
  connectionHelp: null,
  autoRefreshTimer: null,
  activityTimer: null,
  metaTimer: null,
  ws: null,
  wsConnected: false,
  wsReconnectTimer: null,
  chatHistoryRefreshPending: false,
  terminal: null,
  terminalRenderer: "",
  terminalMountNode: null,
  terminalSocket: null,
  terminalSocketConnected: false,
  terminalReconnectTimer: null,
  terminalHistoryRefreshPending: false,
  terminalStatus: null,
  terminalCols: 0,
  terminalRows: 0,
  terminalFitTimer: null,
  terminalResizeObserver: null,
  terminalPointerBindingsReady: false,
  terminalAutoReconnect: false,
  terminalInputQueue: [],
  terminalTextBuffer: "",
  terminalSelectMode: false,
  terminalDirectInputLastValue: "",
  terminalDirectInputLiveValue: "",
  terminalDirectInputNeedsCommit: false,
  terminalDirectInputCommitAt: 0,
  terminalTouchScroll: {
    active: false,
    pointerId: null,
    startX: 0,
    lastY: 0,
    carry: 0,
    dragging: false,
  },
  terminalModifiers: {
    ctrl: false,
    alt: false,
    shift: false,
  },
  terminalCommandQueue: [],
  terminalToolsOpen: false,
  terminalQueueMode: false,
  terminalTransactionMode: false,
  terminalDockExpanded: false,
  terminalMobileKeyboardOpen: false,
  terminalProxyInputMode: false,
  terminalLastInputChunk: "",
  terminalLastInputAt: 0,
  terminalArrowRepeatKey: "",
  terminalArrowRepeatTimer: null,
  terminalArrowRepeatDelayTimer: null,
  terminalArrowRepeatActive: false,
  terminalArrowRepeatSuppressUntil: 0,
  terminalTouchActionHandledUntil: 0,
  terminalTouchActionHandledButton: null,
  terminalLastCodexSyncAt: 0,
  terminalLastResumeKey: "",
  terminalLastOutputSeq: 0,
  terminalResumeRequestedSince: 0,
  terminalResumeAckAt: 0,
  terminalResumeWatchdogTimer: null,
  terminalResumeFallbackStep: 0,
  terminalSequenceGap: null,
  terminalSearchQuery: "",
  terminalSearchMatches: [],
  terminalSearchActiveIndex: -1,
  terminalSearchRefreshTimer: null,
  terminalDomWriteErrorCount: 0,
  terminalDirectInputComposing: false,
  terminalSkipNextInputEvent: false,
  terminalAutoStickBottom: true,
  terminalUserScrolling: false,
  terminalUserScrollTimer: null,
  terminalDockFocusLockUntil: 0,
  terminalProxyRefocusTimer: null,
  activeUtilityPanel: "preview",
  utilityCollapsed: false,
  mobileNavOpen: false,
  preferredTunnelProvider: "cloudflared",
  preferredTunnelMode: "quick",
  promptMode: "live",
  promptQueue: [],
  composerBusy: false,
  composerBusyTimer: null,
  quickReplyDismissedKey: "",
  statusDotChecks: [],
  statusDotPopoverKey: "",
  panelBootToken: "",
  panelBootTokenReloaded: false,
  previewFramePendingSince: 0,
};

const els = {
  loginView: document.getElementById("loginView"),
  appView: document.getElementById("appView"),
  loginForm: document.getElementById("loginForm"),
  password: document.getElementById("password"),
  loginError: document.getElementById("loginError"),

  statusLine: document.getElementById("statusLine"),
  workspaceShell: document.getElementById("workspaceShell"),
  refreshBtn: document.getElementById("refreshBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  commandResult: document.getElementById("commandResult"),
  utilityDock: document.getElementById("utilityDock"),
  navPreviewBtn: document.getElementById("navPreviewBtn"),
  navActivityBtn: document.getElementById("navActivityBtn"),
  navSessionsBtn: document.getElementById("navSessionsBtn"),
  navConnectionBtn: document.getElementById("navConnectionBtn"),
  navTerminalBtn: document.getElementById("navTerminalBtn"),
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
  statusDotBar: document.getElementById("statusDotBar"),
  statusDotPopover: document.getElementById("statusDotPopover"),
  statusDotPopoverText: document.getElementById("statusDotPopoverText"),
  legacyChatShell: document.querySelector(".legacy-chat-shell"),
  terminalTopBar: document.querySelector(".terminal-command-panel .chat-head"),
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

  envProfileSelect: document.getElementById("envProfileSelect"),
  envProfileName: document.getElementById("envProfileName"),
  envContextSelect: document.getElementById("envContextSelect"),
  envProject: document.getElementById("envProject"),
  envPrepSelect: document.getElementById("envPrepSelect"),
  envPanelModeSelect: document.getElementById("envPanelModeSelect"),
  envDevModeSelect: document.getElementById("envDevModeSelect"),
  envRemoteModeSelect: document.getElementById("envRemoteModeSelect"),
  envPublicHost: document.getElementById("envPublicHost"),
  envRelaySelect: document.getElementById("envRelaySelect"),
  envSessionName: document.getElementById("envSessionName"),
  envStatusText: document.getElementById("envStatusText"),
  envLocalUrlText: document.getElementById("envLocalUrlText"),
  envRemoteUrlText: document.getElementById("envRemoteUrlText"),
  envRefreshBtn: document.getElementById("envRefreshBtn"),
  envSaveProfileBtn: document.getElementById("envSaveProfileBtn"),
  envSetDefaultBtn: document.getElementById("envSetDefaultBtn"),
  envPlanBtn: document.getElementById("envPlanBtn"),
  envLaunchBtn: document.getElementById("envLaunchBtn"),
  envShutdownBtn: document.getElementById("envShutdownBtn"),
  envPreview: document.getElementById("envPreview"),

  agentProfileSelect: document.getElementById("agentProfileSelect"),
  agentProfileName: document.getElementById("agentProfileName"),
  agentProfileProject: document.getElementById("agentProfileProject"),
  agentProfileModeSelect: document.getElementById("agentProfileModeSelect"),
  agentProfileModel: document.getElementById("agentProfileModel"),
  agentProfileCodexProfile: document.getElementById("agentProfileCodexProfile"),
  agentProfileSessionName: document.getElementById("agentProfileSessionName"),
  agentProfileRunPrepSelect: document.getElementById("agentProfileRunPrepSelect"),
  agentProfileStartRelaySelect: document.getElementById("agentProfileStartRelaySelect"),
  agentProfileMakeDefaultSelect: document.getElementById("agentProfileMakeDefaultSelect"),
  agentProfileNotes: document.getElementById("agentProfileNotes"),
  agentProfileRefreshBtn: document.getElementById("agentProfileRefreshBtn"),
  agentProfileSaveBtn: document.getElementById("agentProfileSaveBtn"),
  agentProfileSetDefaultBtn: document.getElementById("agentProfileSetDefaultBtn"),
  agentProfileRetireBtn: document.getElementById("agentProfileRetireBtn"),
  agentProfilePlanBtn: document.getElementById("agentProfilePlanBtn"),
  agentProfileSpawnBtn: document.getElementById("agentProfileSpawnBtn"),
  agentProfilePreview: document.getElementById("agentProfilePreview"),

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
  launchRunSelect: document.getElementById("launchRunSelect"),
  launchRunStatus: document.getElementById("launchRunStatus"),
  launchRunRefreshBtn: document.getElementById("launchRunRefreshBtn"),
  launchRunPlanBtn: document.getElementById("launchRunPlanBtn"),
  launchRunRelaunchBtn: document.getElementById("launchRunRelaunchBtn"),
  launchRunPreview: document.getElementById("launchRunPreview"),

  connectionMode: document.getElementById("connectionMode"),
  mobileUrlText: document.getElementById("mobileUrlText"),
  tunnelUrlText: document.getElementById("tunnelUrlText"),
  tunnelProviderSelect: document.getElementById("tunnelProviderSelect"),
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

  terminalStatus: document.getElementById("terminalStatus"),
  terminalRefreshBtn: document.getElementById("terminalRefreshBtn"),
  terminalStartBtn: document.getElementById("terminalStartBtn"),
  terminalReattachBtn: document.getElementById("terminalReattachBtn"),
  terminalInterruptBtn: document.getElementById("terminalInterruptBtn"),
  terminalStopBtn: document.getElementById("terminalStopBtn"),
  terminalClearBtn: document.getElementById("terminalClearBtn"),
  terminalViewport: document.getElementById("terminalViewport"),
  terminalToolsPopover: document.getElementById("terminalToolsPopover"),
  terminalMount: document.getElementById("terminalMount"),
  terminalDirectInputProxy: document.getElementById("terminalDirectInputProxy"),
  terminalSelectableOutput: document.getElementById("terminalSelectableOutput"),
  terminalCommandDeck: document.getElementById("terminalCommandDeck"),
  terminalCommandInput: document.getElementById("terminalCommandInput"),
  terminalCommandSendBtn: document.getElementById("terminalCommandSendBtn"),
  terminalSendQueueBtn: document.getElementById("terminalSendQueueBtn"),
  terminalQueueFlushBtn: document.getElementById("terminalQueueFlushBtn"),
  terminalFocusInputBtn: document.getElementById("terminalFocusInputBtn"),
  terminalTransactionModeBtn: document.getElementById("terminalTransactionModeBtn"),
  terminalGapRecoverBtn: document.getElementById("terminalGapRecoverBtn"),
  terminalToolsToggleBtn: document.getElementById("terminalToolsToggleBtn"),
  terminalQueueCount: document.getElementById("terminalQueueCount"),
  terminalPanelToggleBtn: document.getElementById("terminalPanelToggleBtn"),
  terminalSearchInput: document.getElementById("terminalSearchInput"),
  terminalSearchPrevBtn: document.getElementById("terminalSearchPrevBtn"),
  terminalSearchNextBtn: document.getElementById("terminalSearchNextBtn"),
  terminalSearchClearBtn: document.getElementById("terminalSearchClearBtn"),
  terminalSearchStatus: document.getElementById("terminalSearchStatus"),
  terminalSearchMarkerRail: document.getElementById("terminalSearchMarkerRail"),
  terminalTextModeBtn: document.getElementById("terminalTextModeBtn"),
  terminalCopyTextBtn: document.getElementById("terminalCopyTextBtn"),
  terminalSelectExitBtn: document.getElementById("terminalSelectExitBtn"),
  terminalSelectDockBtn: document.getElementById("terminalSelectDockBtn"),
  terminalSelectDockExitBtn: document.getElementById("terminalSelectDockExitBtn"),
  terminalQueueModeBtn: document.getElementById("terminalQueueModeBtn"),
  terminalDockTransactionModeBtn: document.getElementById("terminalDockTransactionModeBtn"),
  terminalDockMoreBtn: document.getElementById("terminalDockMoreBtn"),
  terminalDockExtensions: document.getElementById("terminalDockExtensions"),
  terminalDockInput: document.getElementById("terminalDockInput"),
  terminalDockSendBtn: document.getElementById("terminalDockSendBtn"),
  terminalDockQueueBtn: document.getElementById("terminalDockQueueBtn"),
  terminalExecResumeBtn: document.getElementById("terminalExecResumeBtn"),
  terminalQuickCommands: document.getElementById("terminalQuickCommands"),
  terminalSpecialControls: document.getElementById("terminalSpecialControls"),
  terminalKeyboardDock: document.getElementById("terminalKeyboardDock"),
};

const RUNTIME_STRIP_STORAGE_KEY = "remote.chat.runtime.strip.collapsed";
const TERMINAL_RENDERER_STORAGE_KEY = "remote.terminal.renderer";
const TERMINAL_WS_PATH = "/terminal-ws";
const TERMINAL_RECONNECT_MS = 2200;
const TERMINAL_FIT_DEBOUNCE_MS = 120;
const TERMINAL_RESUME_ACK_MS = 1350;
const TERMINAL_RESUME_FALLBACK_MS = 1750;
const PANEL_BASE_PATH = (() => {
  const meta = document.querySelector('meta[name="remote-panel-base-path"]');
  const raw = String(meta?.content || "").trim();
  if (!raw || raw === "/") {
    return "";
  }
  const prefixed = raw.startsWith("/") ? raw : `/${raw}`;
  return prefixed.replace(/\/+$/, "");
})();

function normalizePanelPath(path = "/") {
  const raw = String(path || "").trim();
  if (!raw) {
    return "/";
  }
  const prefixed = raw.startsWith("/") ? raw : `/${raw}`;
  return prefixed.replace(/\/{2,}/g, "/");
}

function withBasePath(path = "/") {
  const normalized = normalizePanelPath(path);
  if (!PANEL_BASE_PATH) {
    return normalized;
  }
  if (normalized === "/") {
    return `${PANEL_BASE_PATH}/`;
  }
  return `${PANEL_BASE_PATH}${normalized}`;
}

function wsUrlFor(path) {
  const scheme = window.location.protocol === "https:" ? "wss" : "ws";
  return `${scheme}://${window.location.host}${withBasePath(path)}`;
}

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
  navTerminalBtn: "Open commander terminal.",
  navOutputBtn: "Open the client chat panel.",
  navTogglePanelsBtn: "Hide or show the utility panel area.",
  chatPreviewBtn: "Jump to the preview panel.",
  chatConnection: "Realtime connection status.",
  agentStateBadge: "Current Codex agent state.",
  chatLiveStatus: "Latest high-level runtime message.",
  statusDotBar: "Color status indicators for realtime system health.",
  statusDotPopover: "Detail popover for selected status indicator.",
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
  envProfileSelect: "Choose a saved environment profile.",
  envProfileName: "Name of the reusable environment profile.",
  envContextSelect: "Select whether this environment targets project, system, or commander workflows.",
  envProject: "Optional project slug used by prep, dev, and launch defaults.",
  envPrepSelect: "Choose how much preparation the environment should run before services start.",
  envPanelModeSelect: "Choose whether the commander panel should bind locally or for LAN/remote access.",
  envDevModeSelect: "Choose whether to start project dev, all-project dev, or no dev watcher.",
  envRemoteModeSelect: "Choose how remote HTTPS access is provisioned for commander.",
  envPublicHost: "Hostname advertised for remote HTTPS commander access.",
  envRelaySelect: "Choose whether environment launch also starts relay management.",
  envSessionName: "Relay/session alias the environment should target by default.",
  envStatusText: "Current environment runtime state.",
  envLocalUrlText: "Local panel URL for this environment.",
  envRemoteUrlText: "Remote HTTPS URL for this environment when available.",
  envRefreshBtn: "Refresh environment status, profiles, and current runtime summary.",
  envSaveProfileBtn: "Save the current environment settings as a reusable profile.",
  envSetDefaultBtn: "Set the selected environment profile as the default for its context.",
  envPlanBtn: "Resolve the environment launch plan without starting services.",
  envLaunchBtn: "Run prep and start the selected environment services.",
  envShutdownBtn: "Stop environment services and optionally shut down the panel.",
  envPreview: "Resolved environment summary, artifacts, and URLs.",
  agentProfileSelect: "Choose a saved agent launch profile.",
  agentProfileName: "Name of the reusable agent launch profile.",
  agentProfileProject: "Optional project slug used as the default for this agent profile.",
  agentProfileModeSelect: "Choose whether this profile launches quick or full prep.",
  agentProfileModel: "Optional model override passed to Codex when the agent launches.",
  agentProfileCodexProfile: "Optional Codex CLI profile value passed with --profile.",
  agentProfileSessionName: "Optional default session alias created or resumed by this agent profile.",
  agentProfileRunPrepSelect: "Choose whether the profile runs prep/bootstrap before spawning.",
  agentProfileStartRelaySelect: "Choose whether the profile starts the relay watcher after spawn.",
  agentProfileMakeDefaultSelect: "Choose whether spawned sessions become the default alias for their project.",
  agentProfileNotes: "Optional notes stored with the agent launch profile.",
  agentProfileRefreshBtn: "Reload agent launch profiles from disk.",
  agentProfileSaveBtn: "Save or update the current agent launch profile.",
  agentProfileSetDefaultBtn: "Set the selected agent launch profile as the default.",
  agentProfileRetireBtn: "Mark the selected agent launch profile as retired.",
  agentProfilePlanBtn: "Resolve the selected agent launch plan without spawning anything.",
  agentProfileSpawnBtn: "Spawn an agent using the selected agent launch profile.",
  agentProfilePreview: "Resolved agent launch profile summary and defaults.",
  codexSessionSelect: "Choose a registered session alias.",
  codexSessionName: "Session alias name used by relay tooling.",
  codexSessionTarget: "Target thread/session ID or alias.",
  codexSessionProject: "Optional project slug for scoped relay context.",
  codexSessionNotes: "Optional notes saved with this session alias.",
  codexRefreshBtn: "Reload session aliases from disk.",
  codexUpsertBtn: "Save or update the current session alias.",
  codexCreateBtn: "Create a new Codex thread and register it under this alias.",
  codexSetDefaultBtn: "Set the selected session alias as default.",
  codexRetireBtn: "Mark the selected session alias as retired.",
  codexPrepQuickBtn: "Run fast context preparation for this project.",
  codexPrepFullBtn: "Run full context preparation including installs.",
  relayStartBtn: "Start realtime Codex relay watcher.",
  relayStopBtn: "Stop realtime Codex relay watcher.",
  relayRefreshBtn: "Refresh relay process state.",
  relayStatusText: "Current relay watcher status.",
  codexSessionStatus: "Latest agent/session/relay action result.",
  codexSessionPreview: "Registry summary for session aliases and defaults.",
  launchRunSelect: "Select a recent environment or agent launch run.",
  launchRunStatus: "Current selected run status summary.",
  launchRunRefreshBtn: "Refresh recorded environment and agent runs.",
  launchRunPlanBtn: "Resolve the selected run into a dry-run plan.",
  launchRunRelaunchBtn: "Repeat the selected run with the recorded request.",
  launchRunPreview: "Recent environment and agent launch history.",
  connectionMode: "Network bind mode and security mode summary.",
  mobileUrlText: "Best URL to open this panel from mobile.",
  tunnelProviderSelect: "Choose whether remote HTTPS is managed through Cloudflare or an external reverse proxy/server.",
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
  terminalStatus: "Commander terminal process and socket status.",
  terminalRefreshBtn: "Refresh terminal status and output history.",
  terminalStartBtn: "Start a new commander terminal process.",
  terminalReattachBtn: "Reattach to the current commander terminal session.",
  terminalInterruptBtn: "Send Ctrl+C interrupt to the active terminal process.",
  terminalStopBtn: "Stop the active commander terminal process.",
  terminalClearBtn: "Clear terminal viewport output.",
  terminalViewport: "Terminal viewport.",
  terminalToolsPopover: "Terminal controls popover.",
  terminalMount: "Interactive terminal session output.",
  terminalCommandInput: "Type an npm command to run or queue from the top bar.",
  terminalCommandSendBtn: "Run NPM command immediately in terminal.",
  terminalSendQueueBtn: "Queue command without sending it immediately (Tab behavior).",
  terminalQueueFlushBtn: "Send all queued commands to terminal in order.",
  terminalFocusInputBtn: "Focus direct terminal typing in the console area.",
  terminalTransactionModeBtn: "Edit terminal input locally and send as one atomic command.",
  terminalGapRecoverBtn: "Detected output gap. Tap to reload history and recover.",
  terminalToolsToggleBtn: "Show or hide advanced terminal tools on mobile.",
  terminalQueueCount: "Current number of queued commands.",
  terminalPanelToggleBtn: "Open or close the side panel dock.",
  terminalSearchInput: "Search terminal history output.",
  terminalSearchPrevBtn: "Jump to previous search match in terminal output.",
  terminalSearchNextBtn: "Jump to next search match in terminal output.",
  terminalSearchClearBtn: "Clear terminal search query and markers.",
  terminalSearchStatus: "Search match progress in terminal output.",
  terminalTextModeBtn: "Toggle selectable text mode for touch devices.",
  terminalCopyTextBtn: "Copy selected text or full terminal text.",
  terminalSelectDockBtn: "Toggle text selection mode from the keyboard dock.",
  terminalQueueModeBtn: "Toggle queue mode for terminal commands on mobile keyboard.",
  terminalDockTransactionModeBtn: "Toggle atomic transaction mode on the mobile controller.",
  terminalDockMoreBtn: "Show or hide extended mobile controller buttons.",
  terminalDockSendBtn: "Send command from the top command bar (or queue if queue mode is on).",
  terminalDockQueueBtn: "Queue command from the top command bar without sending immediately.",
  terminalExecResumeBtn: "Resume the selected Codex terminal session target in this terminal.",
  terminalKeyboardDock: "Mobile-first virtual key dock for terminal control.",
  terminalQuickCommands: "One-tap quick actions for common project commands.",
  terminalSpecialControls: "Mobile special-key control pad for full terminal navigation.",
  commandResult: "Raw output from recent panel operations.",
};

function runtimeCheckHelp(label) {
  const map = {
    auth: "Panel authentication token availability.",
    socket: "WebSocket connection state for realtime chat updates.",
    agent: "Codex agent state from relay status.",
    relay: "Relay watcher process state.",
    tunnel: "Public HTTPS tunnel availability.",
    terminal: "Commander terminal process state.",
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

  const response = await fetch(withBasePath(path), {
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
  if (!payload || typeof payload !== "object") {
    throw new Error(`Invalid panel response for ${path}.`);
  }
  return payload;
}

function setLoggedIn(isLoggedIn) {
  els.loginView.hidden = isLoggedIn;
  els.appView.hidden = !isLoggedIn;
  document.body.classList.toggle("app-active", Boolean(isLoggedIn));
}

function utilityNavButtons() {
  return [
    [els.navPreviewBtn, "preview"],
    [els.navActivityBtn, "activity"],
    [els.navSessionsBtn, "sessions"],
    [els.navConnectionBtn, "connection"],
    [els.navTerminalBtn, "terminal"],
    [els.navOutputBtn, "output"],
  ];
}

function isMobileViewport() {
  return window.matchMedia("(max-width: 900px)").matches;
}

function setMobileNavOpen(open) {
  const next = Boolean(open);
  state.mobileNavOpen = next;
  if (next) {
    hideStatusDotPopover();
  }
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
    els.utilityDockCloseBtn.hidden = state.utilityCollapsed;
  }
}

function setUtilityCollapsed(collapsed) {
  state.utilityCollapsed = Boolean(collapsed);
  els.utilityDock.classList.toggle("collapsed", state.utilityCollapsed);
  if (els.workspaceShell) {
    els.workspaceShell.classList.toggle("panel-collapsed", state.utilityCollapsed);
  }
  if (els.navTogglePanelsBtn) {
    const toggleLabel = els.navTogglePanelsBtn.querySelector("span");
    if (toggleLabel) {
      toggleLabel.textContent = state.utilityCollapsed ? "Show" : "Hide";
    }
    els.navTogglePanelsBtn.title = state.utilityCollapsed ? "Show utility panels" : "Hide utility panels";
  }
  updateUtilityOverlayState();
}

function setActiveUtilityPanel(panelId, options = {}) {
  const target = String(panelId || "preview").trim().toLowerCase();
  const available = new Set(["preview", "activity", "sessions", "connection", "terminal", "output"]);
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

  if (next === "terminal") {
    activateTerminalPanel().catch((error) => {
      setTerminalStatusLine(`Terminal unavailable: ${error.message}`, "bad");
    });
  }
}

function applyResponsiveUtilityDefaults(force = false) {
  const utilityNarrow = window.matchMedia("(max-width: 1240px)").matches;
  if (force) {
    setUtilityCollapsed(true);
  } else if (utilityNarrow) {
    setUtilityCollapsed(true);
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

function normalizeRelayList(value, fallbackRelay = null) {
  const source = Array.isArray(value) ? value : [];
  const relays = source.filter((item) => item && typeof item === "object");
  if (relays.length > 0) {
    return relays;
  }
  return fallbackRelay && typeof fallbackRelay === "object" ? [fallbackRelay] : [];
}

function setRelayState(activeRelay, activeRelays) {
  const primary = activeRelay && typeof activeRelay === "object" ? activeRelay : null;
  const relays = normalizeRelayList(activeRelays, primary);
  state.activeRelays = relays;
  state.activeRelay = primary || relays[0] || null;
}

function relayCount() {
  return Array.isArray(state.activeRelays) && state.activeRelays.length > 0 ? state.activeRelays.length : state.activeRelay ? 1 : 0;
}

function selectedRelaySessionName() {
  return codexSessionNameForTerminalSync();
}

function findRelayBySessionName(sessionName) {
  const name = String(sessionName || "")
    .trim()
    .toLowerCase();
  if (!name) {
    return null;
  }
  return (
    state.activeRelays.find((relay) => String(relay?.sessionName || "").trim().toLowerCase() === name) ||
    (state.activeRelay && String(state.activeRelay.sessionName || "").trim().toLowerCase() === name ? state.activeRelay : null)
  );
}

function formatRelayStatus() {
  const relays = normalizeRelayList(state.activeRelays, state.activeRelay);
  if (!relays.length) {
    return "Relay stopped";
  }
  if (relays.length === 1) {
    const relay = relays[0];
    const session = relay.sessionName ? ` session=${relay.sessionName}` : "";
    const project = relay.project ? ` project=${relay.project}` : "";
    const dryRun = relay.dryRun ? " dry-run=true" : "";
    return `Relay running${session}${project}${dryRun} pid=${relay.pid}`;
  }
  const summary = relays
    .map((relay) => `${relay.sessionName || "unnamed"}#${relay.pid || "n/a"}`)
    .slice(0, 4)
    .join(", ");
  const suffix = relays.length > 4 ? ` +${relays.length - 4} more` : "";
  return `${relays.length} relays running (${summary}${suffix})`;
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

function normalizeTunnelProvider(value, fallback = "cloudflared") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (["cloudflared", "server"].includes(normalized)) {
    return normalized;
  }
  return fallback;
}

function currentTunnelProvider() {
  return normalizeTunnelProvider(
    state.activeTunnel?.provider
      || state.connectionHelp?.tunnel?.provider
      || state.connectionHelp?.panel?.tunnelProvider
      || state.preferredTunnelProvider,
    "cloudflared"
  );
}

function currentTunnelMode() {
  if (currentTunnelProvider() === "server") {
    return "named";
  }
  return normalizeTunnelMode(
    state.activeTunnel?.requestedMode
      || state.activeTunnel?.mode
      || state.connectionHelp?.tunnel?.requestedMode
      || state.connectionHelp?.tunnel?.mode
      || state.connectionHelp?.tunnel?.configuredMode
      || state.preferredTunnelMode,
    "quick"
  );
}

function formatTunnelStatus() {
  if (!state.activeTunnel) {
    return `Tunnel stopped (${currentTunnelProvider()}, ${currentTunnelMode()})`;
  }
  const mode = normalizeTunnelMode(state.activeTunnel.requestedMode || state.activeTunnel.mode || state.preferredTunnelMode, "quick");
  const provider = state.activeTunnel.provider ? ` (${state.activeTunnel.provider}, ${mode})` : ` (${mode})`;
  const url = state.activeTunnel.publicUrl || state.activeTunnel.url ? ` ${state.activeTunnel.publicUrl || state.activeTunnel.url}` : "";
  return `Tunnel live${provider}${url} pid=${state.activeTunnel.pid}`;
}

function renderTopStatus() {
  const relayTotal = relayCount();
  const relay = relayTotal > 1 ? `${relayTotal} relays active` : relayTotal === 1 ? "relay active" : "relay stopped";
  const tunnel = state.activeTunnel ? "tunnel live" : `tunnel stopped (${currentTunnelMode()})`;
  const terminal = isTerminalActive() ? "terminal active" : "terminal stopped";
  const agent = state.agentStatus?.state ? `codex ${state.agentStatus.state}` : "codex idle";
  const command = state.commandRunning ? "command running" : "command idle";
  els.statusLine.textContent = `${formatDevStatus()} | ${relay} | ${tunnel} | ${terminal} | ${agent} | ${command}`;
  els.statusLine.title = `Workspace status: ${els.statusLine.textContent}`;
  renderChatRuntimeStrip();
}

function renderRelayStatus() {
  els.relayStatusText.value = formatRelayStatus();
  els.relayStatusText.title = `Relay watcher: ${els.relayStatusText.value}`;
  const total = relayCount();
  const selectedName = selectedRelaySessionName();
  const selectedRunning = Boolean(findRelayBySessionName(selectedName));
  els.relayStartBtn.disabled = selectedRunning;
  els.relayStopBtn.disabled = total === 0;
  renderChatRuntimeStrip();
}

function renderTunnelStatus() {
  const helpTunnel = state.connectionHelp?.tunnel && typeof state.connectionHelp.tunnel === "object" ? state.connectionHelp.tunnel : null;
  state.preferredTunnelProvider = normalizeTunnelProvider(
    state.activeTunnel?.provider || helpTunnel?.provider || state.connectionHelp?.panel?.tunnelProvider || state.preferredTunnelProvider,
    "cloudflared"
  );
  state.preferredTunnelMode = normalizeTunnelMode(
    state.activeTunnel?.requestedMode || state.activeTunnel?.mode || helpTunnel?.requestedMode || helpTunnel?.mode || helpTunnel?.configuredMode || state.preferredTunnelMode,
    "quick"
  );
  if (els.tunnelProviderSelect) {
    els.tunnelProviderSelect.value = currentTunnelProvider();
  }
  const activeUrl = String(state.activeTunnel?.publicUrl || state.activeTunnel?.url || helpTunnel?.publicUrl || helpTunnel?.url || "").trim();
  const hasActiveTunnel = Boolean(state.activeTunnel || (helpTunnel?.active && activeUrl));
  if (state.activeTunnel) {
    els.tunnelUrlText.value = formatTunnelStatus();
  } else if (activeUrl) {
    const mode = normalizeTunnelMode(helpTunnel?.requestedMode || helpTunnel?.mode || state.preferredTunnelMode, "quick");
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
  const provider = currentTunnelProvider();
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
    button.disabled = provider === "server" && key !== "named";
  }

  if (!els.tunnelModeHint) {
    return;
  }
  let hint = "";
  if (provider === "server") {
    hint = "Reverse-proxy mode expects your own HTTPS host to forward traffic to this panel. Named mode is used as the stable-host placeholder.";
  } else if (mode === "token") {
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
  if (currentTunnelProvider() === "server") {
    state.preferredTunnelMode = "named";
    renderTunnelModeControls();
    return;
  }
  state.preferredTunnelMode = normalizeTunnelMode(mode, state.preferredTunnelMode || "quick");
  renderTunnelModeControls();
}

function setPreferredTunnelProvider(provider) {
  state.preferredTunnelProvider = normalizeTunnelProvider(provider, state.preferredTunnelProvider || "cloudflared");
  if (state.preferredTunnelProvider === "server") {
    state.preferredTunnelMode = "named";
  }
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

function rememberTerminalRenderer(renderer) {
  const value = String(renderer || "")
    .trim()
    .toLowerCase();
  if (value !== "xterm") {
    return;
  }
  safeLocalStorageSet(TERMINAL_RENDERER_STORAGE_KEY, "xterm");
}

function runtimeStateTone(value) {
  const normalized = String(value || "").toLowerCase();
  if (
    ["ok", "live", "running", "on", "working", "thinking", "pending", "auto"].includes(normalized) ||
    normalized.includes(" live") ||
    normalized.includes(" running") ||
    normalized.endsWith("running")
  ) {
    return "ok";
  }
  if (
    ["off", "stopped", "missing", "offline", "none", "blocked", "error", "n/a"].includes(normalized) ||
    normalized.includes("stopped") ||
    normalized.includes("offline") ||
    normalized.includes("error")
  ) {
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

function hideStatusDotPopover() {
  state.statusDotPopoverKey = "";
  if (!els.statusDotPopover) {
    return;
  }
  els.statusDotPopover.hidden = true;
  els.statusDotPopover.classList.remove("visible");
}

function showStatusDotPopover(button, item) {
  if (!els.statusDotPopover || !els.statusDotPopoverText || !button || !item) {
    return;
  }
  const value = String(item.value || "n/a");
  const title = runtimeCheckHelp(item.label);
  els.statusDotPopoverText.textContent = `${item.label.toUpperCase()}: ${value} — ${title}`;
  const parentRect = els.statusDotBar?.getBoundingClientRect?.() || null;
  const buttonRect = button.getBoundingClientRect();
  const popoverWidth = 260;
  if (parentRect) {
    const center = buttonRect.left - parentRect.left + buttonRect.width / 2;
    const left = Math.max(8, Math.min(parentRect.width - popoverWidth - 8, center - popoverWidth / 2));
    els.statusDotPopover.style.left = `${Math.round(left)}px`;
  } else {
    els.statusDotPopover.style.left = "8px";
  }
  state.statusDotPopoverKey = item.label;
  els.statusDotPopover.hidden = false;
  els.statusDotPopover.classList.add("visible");
}

function renderStatusDotBar(checks = []) {
  if (!els.statusDotBar) {
    return;
  }
  state.statusDotChecks = Array.isArray(checks) ? checks.slice() : [];
  const map = new Map(state.statusDotChecks.map((item) => [String(item.label || "").toLowerCase(), item]));
  const buttons = els.statusDotBar.querySelectorAll("[data-status-dot]");
  for (const button of buttons) {
    const key = String(button.getAttribute("data-status-dot") || "").trim().toLowerCase();
    const item = map.get(key);
    const value = String(item?.value || "unknown");
    const tone = runtimeStateTone(value);
    button.classList.remove("ok", "warn", "soft", "unknown", "active");
    button.classList.add(tone);
    if (!item) {
      button.classList.add("unknown");
      button.title = `${key}: unavailable`;
      continue;
    }
    button.title = `${item.label}: ${value}. ${runtimeCheckHelp(item.label)}`;
    if (state.statusDotPopoverKey === key) {
      button.classList.add("active");
      showStatusDotPopover(button, item);
    }
  }
  if (state.statusDotPopoverKey && !map.has(state.statusDotPopoverKey)) {
    hideStatusDotPopover();
  }
}

function statusDotItemForKey(key) {
  const lookup = String(key || "").trim().toLowerCase();
  if (!lookup || !Array.isArray(state.statusDotChecks)) {
    return null;
  }
  return state.statusDotChecks.find((item) => String(item?.label || "").trim().toLowerCase() === lookup) || null;
}

function utilityPanelForStatusDot(key) {
  const lookup = String(key || "").trim().toLowerCase();
  const panelMap = {
    auth: "connection",
    socket: "connection",
    agent: "activity",
    relay: "sessions",
    terminal: "terminal",
    tunnel: "connection",
    preview: "preview",
  };
  return panelMap[lookup] || "";
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
  const tunnelUrl = String(
    state.activeTunnel?.publicUrl || state.activeTunnel?.url || state.connectionHelp?.tunnel?.publicUrl || state.connectionHelp?.tunnel?.url || ""
  ).trim();
  const agentState = String(state.agentStatus?.state || "idle");
  const socketState = state.wsConnected ? "live" : "offline";
  const relayTotal = relayCount();
  const relayState = relayTotal > 1 ? `${relayTotal} running` : relayTotal === 1 ? "running" : "stopped";
  const tunnelState = tunnelUrl ? "live" : "stopped";
  const terminalState = isTerminalActive() ? "running" : "stopped";
  const promptMode = normalizePromptMode(state.promptMode, "live");
  const queueCount = state.promptQueue.length;

  const checks = [
    { label: "auth", value: state.csrfToken ? "ok" : "missing" },
    { label: "socket", value: socketState },
    { label: "agent", value: agentState || "idle" },
    { label: "relay", value: relayState },
    { label: "tunnel", value: tunnelState },
    { label: "terminal", value: terminalState },
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
  renderStatusDotBar(checks);
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

function ensureChatSurfaceVisible() {
  if (els.chatConnection) {
    els.chatConnection.hidden = false;
  }
  if (els.agentStateBadge) {
    els.agentStateBadge.hidden = false;
  }
  if (els.chatLiveStatus) {
    els.chatLiveStatus.hidden = false;
  }
  if (els.chatRuntimeDetails) {
    els.chatRuntimeDetails.hidden = false;
  }
  if (els.legacyChatShell) {
    els.legacyChatShell.hidden = false;
    els.legacyChatShell.setAttribute("aria-hidden", "false");
  }
}

function looksLikeTerminalStatus(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  return (
    Object.prototype.hasOwnProperty.call(value, "active") ||
    Object.prototype.hasOwnProperty.call(value, "running") ||
    Object.prototype.hasOwnProperty.call(value, "attached") ||
    Object.prototype.hasOwnProperty.call(value, "pid")
  );
}

function parseTerminalStatusObject(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const candidates = [payload.status, payload.terminal, payload.activeTerminal, payload.data, payload];
  for (const candidate of candidates) {
    if (looksLikeTerminalStatus(candidate)) {
      return candidate;
    }
  }
  return null;
}

function isTerminalActive(status = state.terminalStatus) {
  const target = status && typeof status === "object" ? status : null;
  if (!target) {
    return false;
  }
  const pid = Number.parseInt(String(target.pid || ""), 10);
  if (Number.isFinite(pid) && pid > 0) {
    return true;
  }
  return Boolean(target.active || target.running || target.attached || target.connected);
}

function terminalStatusSummaryText() {
  const status = state.terminalStatus && typeof state.terminalStatus === "object" ? state.terminalStatus : {};
  const active = isTerminalActive(status);
  const socketLive = Boolean(state.terminalSocketConnected);
  const pid = Number.parseInt(String(status.pid || ""), 10);
  const sessionId = String(status.sessionId || status.id || status.instanceId || "").trim();
  const parts = [active ? "Running" : "Stopped", socketLive ? "socket live" : "socket offline"];
  const renderer = state.terminalRenderer || "xterm";
  if (renderer) {
    parts.push(`renderer ${renderer}`);
  }
  if (Number.isFinite(pid) && pid > 0) {
    parts.push(`pid ${pid}`);
  }
  if (sessionId) {
    parts.push(`session ${sessionId}`);
  }
  return parts.join(" | ");
}

function setTerminalStatusLine(text, tone = "muted") {
  if (!els.terminalStatus) {
    return;
  }
  const label = String(text || "").trim() || terminalStatusSummaryText();
  els.terminalStatus.textContent = label;
  els.terminalStatus.title = `Terminal status: ${label}`;
  els.terminalStatus.classList.remove("ok", "bad");
  if (tone === "ok") {
    els.terminalStatus.classList.add("ok");
  } else if (tone === "bad") {
    els.terminalStatus.classList.add("bad");
  }
}

function renderTerminalControls(statusOverride = "") {
  const active = isTerminalActive();
  const socketLive = Boolean(state.terminalSocketConnected);
  if (els.terminalStartBtn) {
    els.terminalStartBtn.disabled = active && socketLive;
  }
  if (els.terminalReattachBtn) {
    els.terminalReattachBtn.disabled = socketLive;
  }
  if (els.terminalInterruptBtn) {
    els.terminalInterruptBtn.disabled = !active;
  }
  if (els.terminalStopBtn) {
    els.terminalStopBtn.disabled = !active;
  }
  if (els.terminalClearBtn) {
    els.terminalClearBtn.disabled = !state.terminal;
  }
  const hasError = String(state.terminalStatus?.error || "").trim();
  const tone = hasError ? "bad" : active || socketLive ? "ok" : "muted";
  setTerminalStatusLine(statusOverride || terminalStatusSummaryText(), tone);
  renderTerminalModifierButtons();
  renderTerminalQueueMode();
  renderTerminalTransactionMode();
  renderTerminalGapIndicator();
  renderTerminalSearchStatus();
  renderTopStatus();
}

function clearTerminalReconnectTimer() {
  if (!state.terminalReconnectTimer) {
    return;
  }
  clearTimeout(state.terminalReconnectTimer);
  state.terminalReconnectTimer = null;
}

function clearTerminalResumeWatchdog() {
  if (!state.terminalResumeWatchdogTimer) {
    return;
  }
  window.clearTimeout(state.terminalResumeWatchdogTimer);
  state.terminalResumeWatchdogTimer = null;
}

function clearTerminalFitTimer() {
  if (!state.terminalFitTimer) {
    return;
  }
  clearTimeout(state.terminalFitTimer);
  state.terminalFitTimer = null;
}

function terminalGeometryFallback() {
  const rect = els.terminalMount?.getBoundingClientRect?.() || null;
  const width = Math.max(320, Math.round(Number(rect?.width) || 0));
  const height = Math.max(180, Math.round(Number(rect?.height) || 0));
  const cols = Math.max(20, Math.min(320, Math.floor((width - 6) / 9) || 80));
  const rows = Math.max(8, Math.min(200, Math.floor((height - 6) / 18) || 24));
  return { cols, rows };
}

function readTerminalGeometry() {
  let cols = Number.parseInt(String(state.terminalCols || ""), 10);
  let rows = Number.parseInt(String(state.terminalRows || ""), 10);
  if (Number.isFinite(cols) && cols > 0 && Number.isFinite(rows) && rows > 0) {
    return { cols, rows };
  }
  if (state.terminal) {
    cols = Number.parseInt(String(state.terminal.cols || ""), 10);
    rows = Number.parseInt(String(state.terminal.rows || ""), 10);
  }
  if (Number.isFinite(cols) && cols > 0 && Number.isFinite(rows) && rows > 0) {
    state.terminalCols = cols;
    state.terminalRows = rows;
    return { cols, rows };
  }
  const fallback = terminalGeometryFallback();
  state.terminalCols = fallback.cols;
  state.terminalRows = fallback.rows;
  return fallback;
}

function disposeTerminalInstance(options = {}) {
  const preserveMount = Boolean(options.preserveMount);
  const terminal = state.terminal;
  if (state.terminalResizeObserver) {
    try {
      state.terminalResizeObserver.disconnect();
    } catch {
      // ignore
    }
    state.terminalResizeObserver = null;
  }
  if (terminal) {
    try {
      terminal.dispose?.();
    } catch {
      // ignore
    }
  }
  state.terminal = null;
  state.terminalRenderer = "";
  state.terminalMountNode = null;
  if (state.terminalResizeObserver) {
    try {
      state.terminalResizeObserver.disconnect();
    } catch {
      // ignore
    }
    state.terminalResizeObserver = null;
  }
  if (!preserveMount && els.terminalMount) {
    els.terminalMount.replaceChildren();
  }
}

function closeTerminalSocket(options = {}) {
  const preserveAutoReconnect = Boolean(options.preserveAutoReconnect);
  clearTerminalReconnectTimer();
  clearTerminalResumeWatchdog();
  state.terminalResumeRequestedSince = 0;
  state.terminalResumeAckAt = 0;
  state.terminalResumeFallbackStep = 0;
  if (!preserveAutoReconnect) {
    state.terminalAutoReconnect = false;
  }
  const ws = state.terminalSocket;
  state.terminalSocket = null;
  state.terminalSocketConnected = false;
  if (ws) {
    try {
      ws.close();
    } catch {
      // ignore
    }
  }
  renderTerminalControls();
}

function scheduleTerminalReconnect() {
  if (state.terminalReconnectTimer || els.appView.hidden || !state.terminalAutoReconnect) {
    return;
  }
  state.terminalReconnectTimer = window.setTimeout(() => {
    state.terminalReconnectTimer = null;
    if (els.appView.hidden || !state.terminalAutoReconnect) {
      return;
    }
    connectTerminalSocket({ allowReconnect: true });
  }, TERMINAL_RECONNECT_MS);
}

function sendTerminalWsMessage(payload) {
  if (!state.terminalSocket || state.terminalSocket.readyState !== WebSocket.OPEN) {
    return false;
  }
  try {
    state.terminalSocket.send(JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

function sendTerminalResize(cols, rows) {
  const width = Number.parseInt(String(cols || ""), 10);
  const height = Number.parseInt(String(rows || ""), 10);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return;
  }
  sendTerminalWsMessage({
    type: "terminal:resize",
    cols: width,
    rows: height,
  });
}

function shouldDropDuplicateTerminalInput(chunk) {
  const now = Date.now();
  const previousChunk = String(state.terminalLastInputChunk || "");
  const previousAt = Number(state.terminalLastInputAt || 0);
  const hasControlChars = /[\u0000-\u001f\u007f]/.test(chunk);
  if (chunk === "\u007f") {
    state.terminalLastInputChunk = chunk;
    state.terminalLastInputAt = now;
    return false;
  }
  // In proxy mode, only dedupe duplicated multi-char printable chunks
  // that commonly appear from mobile suggestion/replacement events.
  if (state.terminalProxyInputMode) {
    if (hasControlChars) {
      state.terminalLastInputChunk = chunk;
      state.terminalLastInputAt = now;
      return false;
    }
    if (chunk.length === 1) {
      const isDuplicate = chunk === previousChunk && now - previousAt <= 26;
      state.terminalLastInputChunk = chunk;
      state.terminalLastInputAt = now;
      return isDuplicate;
    }
    const isDuplicate = chunk === previousChunk && now - previousAt < 170;
    state.terminalLastInputChunk = chunk;
    state.terminalLastInputAt = now;
    return isDuplicate;
  }
  // Outside proxy mode, suppress only immediate duplicate echoes that can
  // happen when mobile IME events duplicate a key sequence.
  const immediateWindowMs = hasControlChars ? 22 : 24;
  const isDuplicate = chunk === previousChunk && now - previousAt <= immediateWindowMs;
  state.terminalLastInputChunk = chunk;
  state.terminalLastInputAt = now;
  return isDuplicate;
}

function sendTerminalStdin(data) {
  const chunk = String(data || "");
  if (!chunk) {
    return;
  }
  if (shouldDropDuplicateTerminalInput(chunk)) {
    return;
  }
  const sent = sendTerminalWsMessage({
    type: "terminal:stdin",
    data: chunk,
  });
  if (sent) {
    return;
  }

  state.terminalInputQueue.push(chunk);
  if (state.terminalInputQueue.length > 1024) {
    state.terminalInputQueue.shift();
  }

  const ws = state.terminalSocket;
  if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
    connectTerminalSocket({ allowReconnect: true });
  }
}

function normalizeTerminalModifiers() {
  const mods = state.terminalModifiers && typeof state.terminalModifiers === "object" ? state.terminalModifiers : {};
  return {
    ctrl: Boolean(mods.ctrl),
    alt: Boolean(mods.alt),
    shift: Boolean(mods.shift),
  };
}

function renderTerminalModifierButtons() {
  const scopes = [els.terminalSpecialControls, els.terminalKeyboardDock].filter(Boolean);
  if (!scopes.length) {
    return;
  }
  const mods = normalizeTerminalModifiers();
  for (const scope of scopes) {
    const buttons = scope.querySelectorAll("[data-terminal-mod]");
    for (const button of buttons) {
      const key = String(button.getAttribute("data-terminal-mod") || "").trim().toLowerCase();
      button.classList.toggle("active", Boolean(mods[key]));
    }
  }
}

function setTerminalModifier(name, enabled) {
  const key = String(name || "").trim().toLowerCase();
  if (!["ctrl", "alt", "shift"].includes(key)) {
    return;
  }
  state.terminalModifiers[key] = Boolean(enabled);
  renderTerminalModifierButtons();
}

function clearTerminalModifiers() {
  state.terminalModifiers = {
    ctrl: false,
    alt: false,
    shift: false,
  };
  renderTerminalModifierButtons();
}

function terminalModifierParam(mods) {
  return 1 + (mods.shift ? 1 : 0) + (mods.alt ? 2 : 0) + (mods.ctrl ? 4 : 0);
}

function csiWithModifiers(code, mods, usesTilde = false) {
  const mod = terminalModifierParam(mods);
  if (usesTilde) {
    return mod === 1 ? `\u001b[${code}~` : `\u001b[${code};${mod}~`;
  }
  return mod === 1 ? `\u001b[${code}` : `\u001b[1;${mod}${code}`;
}

function ctrlCharacterFromText(text) {
  if (typeof text !== "string" || text.length !== 1) {
    return "";
  }
  const char = text.toUpperCase();
  if (char === " ") {
    return "\u0000";
  }
  const code = char.charCodeAt(0);
  if (code >= 64 && code <= 95) {
    return String.fromCharCode(code - 64);
  }
  if (code >= 97 && code <= 122) {
    return String.fromCharCode(code - 96);
  }
  return "";
}

function terminalSequenceForSpecialKey(key, mods) {
  const normalized = String(key || "").trim();
  if (!normalized) {
    return "";
  }
  switch (normalized) {
    case "Escape":
      return "\u001b";
    case "Tab":
      return mods.shift ? "\u001b[Z" : "\t";
    case "Enter":
      return "\r";
    case "Backspace":
      return mods.ctrl ? "\b" : "\u007f";
    case "Delete":
      return csiWithModifiers("3", mods, true);
    case "ArrowUp":
      return csiWithModifiers("A", mods);
    case "ArrowDown":
      return csiWithModifiers("B", mods);
    case "ArrowRight":
      return csiWithModifiers("C", mods);
    case "ArrowLeft":
      return csiWithModifiers("D", mods);
    case "Home":
      return csiWithModifiers("H", mods);
    case "End":
      return csiWithModifiers("F", mods);
    case "PageUp":
      return csiWithModifiers("5", mods, true);
    case "PageDown":
      return csiWithModifiers("6", mods, true);
    default:
      return "";
  }
}

function isTerminalArrowKey(key) {
  return ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(String(key || "").trim());
}

function isTerminalArrowButton(button) {
  if (!button || typeof button.getAttribute !== "function") {
    return false;
  }
  return isTerminalArrowKey(button.getAttribute("data-terminal-key"));
}

function clearTerminalArrowRepeat(options = {}) {
  if (state.terminalArrowRepeatDelayTimer) {
    window.clearTimeout(state.terminalArrowRepeatDelayTimer);
    state.terminalArrowRepeatDelayTimer = null;
  }
  if (state.terminalArrowRepeatTimer) {
    window.clearInterval(state.terminalArrowRepeatTimer);
    state.terminalArrowRepeatTimer = null;
  }
  if (state.terminalArrowRepeatActive && options.suppressClick !== false) {
    state.terminalArrowRepeatSuppressUntil = Date.now() + 180;
  }
  state.terminalArrowRepeatActive = false;
  state.terminalArrowRepeatKey = "";
}

function startTerminalArrowRepeat(button) {
  if (!isTerminalArrowButton(button)) {
    return;
  }
  const key = String(button.getAttribute("data-terminal-key") || "").trim();
  clearTerminalArrowRepeat({ suppressClick: false });
  state.terminalArrowRepeatKey = key;
  state.terminalArrowRepeatSuppressUntil = Date.now() + 400;
  sendTerminalSpecialKey(key, { silent: true, preserveModifiers: true }).catch(() => null);
  state.terminalArrowRepeatDelayTimer = window.setTimeout(() => {
    if (state.terminalArrowRepeatKey !== key) {
      return;
    }
    state.terminalArrowRepeatActive = true;
    state.terminalArrowRepeatTimer = window.setInterval(() => {
      sendTerminalSpecialKey(key, { silent: true, preserveModifiers: true }).catch(() => null);
    }, 55);
  }, 220);
}

function terminalSequenceForText(text, mods) {
  let value = String(text || "");
  if (!value) {
    return "";
  }
  if (mods.ctrl) {
    const ctrl = ctrlCharacterFromText(value);
    if (ctrl) {
      return mods.alt ? `\u001b${ctrl}` : ctrl;
    }
  }
  if (mods.shift && value.length === 1) {
    value = value.toUpperCase();
  }
  if (mods.alt) {
    value = `\u001b${value}`;
  }
  return value;
}

async function ensureTerminalInputReady() {
  const terminal = ensureTerminalReady();
  if (!terminal) {
    throw new Error("xterm is unavailable.");
  }
  if (!isTerminalActive() || !state.terminalSocketConnected) {
    await ensurePersistentTerminalChannel({
      autoStart: true,
      loadHistory: false,
    });
  }
  if (!state.terminalProxyInputMode) {
    terminal?.focus?.();
  } else if (isTouchFirstDevice() && els.terminalDirectInputProxy && document.activeElement !== els.terminalDirectInputProxy) {
    els.terminalDirectInputProxy.focus({ preventScroll: true });
  }
}

async function sendTerminalSequence(sequence, statusText = "") {
  const chunk = String(sequence || "");
  if (!chunk) {
    return;
  }
  await ensureTerminalInputReady();
  sendTerminalStdin(chunk);
  if (statusText) {
    setTerminalStatusLine(statusText, "ok");
  }
}

async function sendTerminalSpecialKey(key, options = {}) {
  const mods = normalizeTerminalModifiers();
  const sequence = terminalSequenceForSpecialKey(key, mods);
  if (!Boolean(options.preserveModifiers)) {
    clearTerminalModifiers();
  }
  if (!sequence) {
    return;
  }
  const statusText = Boolean(options.silent) ? "" : `Sent key: ${key}`;
  await sendTerminalSequence(sequence, statusText);
}

async function sendTerminalTextKey(text) {
  const mods = normalizeTerminalModifiers();
  const sequence = terminalSequenceForText(text, mods);
  clearTerminalModifiers();
  if (!sequence) {
    return;
  }
  await sendTerminalSequence(sequence, "Sent text key.");
}

async function runTerminalCommand(command, options = {}) {
  const value = String(command || "").trim();
  if (!value) {
    return false;
  }
  const fromQueue = Boolean(options.fromQueue);
  const forceLive = Boolean(options.forceLive);
  if (state.terminalQueueMode && !fromQueue && !forceLive) {
    return queueTerminalCommand(value);
  }
  await sendTerminalSequence(`${value}\r`, `Sent command: ${value}`);
  return true;
}

function handleTerminalControlButton(button) {
  if (!button) {
    return;
  }
  const action = String(button.getAttribute("data-terminal-action") || "").trim().toLowerCase();
  if (action === "select") {
    setTerminalSelectMode(!state.terminalSelectMode, {
      focusBottom: state.terminalSelectMode === false,
    });
    return;
  }
  if (action === "copy") {
    copyTerminalTextFromView({ exitSelectMode: false }).catch((error) => {
      setTerminalStatusLine(`Copy failed: ${error.message}`, "bad");
      setCommandResult(error.message, true);
    });
    return;
  }
  if (action === "copy-live") {
    copyTerminalTextFromView({ exitSelectMode: true }).catch((error) => {
      setTerminalStatusLine(`Copy failed: ${error.message}`, "bad");
      setCommandResult(error.message, true);
    });
    return;
  }
  if (action === "select-exit") {
    if (state.terminalSelectMode) {
      setTerminalSelectMode(false, { focus: true });
    } else {
      focusTerminalTypingSurface();
    }
    return;
  }
  if (action === "focus") {
    if (state.terminalSelectMode) {
      setTerminalSelectMode(false, { focus: false });
    }
    focusTerminalTypingSurface();
    return;
  }
  if (action === "tools") {
    setTerminalToolsOpen(!state.terminalToolsOpen);
    return;
  }
  if (action === "queue-mode") {
    setTerminalQueueMode(!state.terminalQueueMode, { announce: true });
    return;
  }
  if (action === "transaction-mode") {
    setTerminalTransactionMode(!state.terminalTransactionMode, { announce: true });
    return;
  }
  if (action === "dock-extend") {
    setTerminalDockExpanded(!state.terminalDockExpanded);
    return;
  }
  if (action === "search-prev") {
    jumpTerminalSearchMatch(-1);
    return;
  }
  if (action === "search-next") {
    jumpTerminalSearchMatch(1);
    return;
  }
  if (action === "search-clear") {
    clearTerminalSearch();
    return;
  }
  if (action === "gap-recover") {
    refreshTerminalHistory({ clear: true, silent: true })
      .then(() => {
        clearTerminalSequenceGap({ silent: true });
        setTerminalStatusLine("Terminal history recovered.", "ok");
      })
      .catch((error) => {
        setTerminalStatusLine(`Recover failed: ${error.message}`, "bad");
        setCommandResult(error.message, true);
      });
    return;
  }
  if (button.hasAttribute("data-terminal-soft-enter")) {
    sendTerminalSoftLineBreak().catch((error) => {
      setTerminalStatusLine(`Soft enter failed: ${error.message}`, "bad");
      setCommandResult(error.message, true);
    });
    return;
  }

  const mod = String(button.getAttribute("data-terminal-mod") || "").trim().toLowerCase();
  if (mod) {
    const mods = normalizeTerminalModifiers();
    setTerminalModifier(mod, !mods[mod]);
    return;
  }
  const specialKey = button.getAttribute("data-terminal-key");
  if (specialKey) {
    if (isTerminalArrowButton(button) && Date.now() < Number(state.terminalArrowRepeatSuppressUntil || 0)) {
      return;
    }
    sendTerminalSpecialKey(specialKey).catch((error) => {
      setTerminalStatusLine(`Key failed: ${error.message}`, "bad");
      setCommandResult(error.message, true);
    });
    return;
  }
  const textKey = button.getAttribute("data-terminal-text");
  if (textKey) {
    sendTerminalTextKey(textKey).catch((error) => {
      setTerminalStatusLine(`Key failed: ${error.message}`, "bad");
      setCommandResult(error.message, true);
    });
    return;
  }
  const command = button.getAttribute("data-terminal-command");
  if (command) {
    runTerminalCommand(command).catch((error) => {
      setTerminalStatusLine(`Command failed: ${error.message}`, "bad");
      setCommandResult(error.message, true);
    });
    return;
  }
  const rawSequence = button.getAttribute("data-terminal-sequence");
  if (rawSequence) {
    const sequence = decodeTerminalSequenceLiteral(rawSequence);
    sendTerminalSequence(sequence, "Sent terminal control sequence.").catch((error) => {
      setTerminalStatusLine(`Control failed: ${error.message}`, "bad");
      setCommandResult(error.message, true);
    });
  }
}

function normalizeNpmCommandInput(rawCommand) {
  const value = String(rawCommand || "").trim();
  if (!value) {
    return "";
  }
  const lowered = value.toLowerCase();
  if (lowered.startsWith("npm ")) {
    return value;
  }
  if (lowered.startsWith("run ")) {
    return `npm ${value}`;
  }
  if (/^[a-z0-9:_-]+$/i.test(value)) {
    return `npm run ${value}`;
  }
  return `npm ${value}`;
}

function normalizeCodexSessionName(rawSessionName) {
  const value = String(rawSessionName || "").trim();
  if (!value) {
    return "";
  }
  return value.replace(/[^a-zA-Z0-9._:-]/g, "");
}

function normalizeCodexSessionTarget(rawSessionTarget) {
  const value = String(rawSessionTarget || "").trim();
  if (!value) {
    return "";
  }
  return value.replace(/[^a-zA-Z0-9._:-]/g, "");
}

function codexSessionsForLookup() {
  if (Array.isArray(state.codexSessions) && state.codexSessions.length > 0) {
    return state.codexSessions;
  }
  if (Array.isArray(state.codexRegistry?.sessions) && state.codexRegistry.sessions.length > 0) {
    return state.codexRegistry.sessions;
  }
  return [];
}

function codexSessionEntryByName(name) {
  const lookup = normalizeCodexSessionName(name);
  if (!lookup) {
    return null;
  }
  const sessions = codexSessionsForLookup();
  for (const session of sessions) {
    const entryName = normalizeCodexSessionName(session?.name || "");
    if (entryName && entryName.toLowerCase() === lookup.toLowerCase()) {
      return session;
    }
  }
  return null;
}

function codexDefaultSessionName() {
  const perProject = state.codexRegistry?.defaults?.perProject && typeof state.codexRegistry.defaults.perProject === "object"
    ? state.codexRegistry.defaults.perProject
    : {};
  const project = String(els.codexSessionProject?.value || state.activeProject || "").trim();
  const projectDefault = project ? normalizeCodexSessionName(perProject[project] || "") : "";
  if (projectDefault) {
    return projectDefault;
  }
  const globalDefault = normalizeCodexSessionName(state.codexRegistry?.defaults?.global || "");
  if (globalDefault) {
    return globalDefault;
  }
  return "";
}

function codexSessionNameForTerminalSync() {
  const typedName = normalizeCodexSessionName(els.codexSessionName?.value || "");
  if (typedName) {
    return typedName;
  }
  const selected = normalizeCodexSessionName(els.codexSessionSelect?.value || "");
  if (selected) {
    return selected;
  }
  const defaultName = codexDefaultSessionName();
  if (defaultName) {
    return defaultName;
  }
  const sessions = codexSessionsForLookup();
  const firstActive = sessions.find((entry) => !Boolean(entry?.retired));
  const fallbackName = normalizeCodexSessionName(firstActive?.name || sessions[0]?.name || "");
  if (fallbackName) {
    return fallbackName;
  }
  return "codex-chat";
}

function codexSessionTargetForTerminalSync() {
  const direct = normalizeCodexSessionTarget(els.codexSessionTarget?.value || "");
  if (direct) {
    return direct;
  }
  const sessionName = codexSessionNameForTerminalSync();
  const selected = codexSessionEntryByName(sessionName);
  return normalizeCodexSessionTarget(selected?.target || "");
}

function buildCodexExecResumeCommand() {
  const target = codexSessionTargetForTerminalSync();
  if (target) {
    return `cmd /c codex resume ${target}`;
  }
  const sessionName = codexSessionNameForTerminalSync();
  if (!sessionName) {
    return "";
  }
  return `cmd /c codex exec resume ${sessionName} READY`;
}

function renderTerminalExecResumeButton() {
  const button = els.terminalExecResumeBtn;
  if (!button) {
    return;
  }
  const command = buildCodexExecResumeCommand();
  if (command) {
    button.setAttribute("data-terminal-command", command);
  }
  const target = codexSessionTargetForTerminalSync();
  const sessionName = codexSessionNameForTerminalSync();
  if (target) {
    button.title = `Resume Codex thread: ${target}`;
    return;
  }
  button.title = sessionName ? `Resume Codex session: ${sessionName}` : "Resume Codex session in this terminal.";
}

async function syncCodexTerminalSession(options = {}) {
  const command = buildCodexExecResumeCommand();
  if (!command) {
    return false;
  }
  const force = Boolean(options.force);
  const target = codexSessionTargetForTerminalSync();
  const sessionName = codexSessionNameForTerminalSync();
  const resumeKey = target ? `target:${target}` : sessionName ? `session:${sessionName}` : "";
  const resumeTargetChanged = Boolean(resumeKey && resumeKey !== state.terminalLastResumeKey);
  if (resumeTargetChanged) {
    state.terminalLastResumeKey = resumeKey;
    state.terminalLastOutputSeq = 0;
    state.terminalLastCodexSyncAt = 0;
    state.terminalResumeRequestedSince = 0;
    state.terminalResumeAckAt = 0;
    state.terminalResumeFallbackStep = 0;
    clearTerminalSequenceGap({ silent: true });
    clearTerminalViewport();
    setTerminalStatusLine(target ? `Switching to Codex thread ${target}...` : `Switching to Codex session ${sessionName}...`, "ok");
  }
  if (!force && !resumeTargetChanged) {
    return false;
  }
  const now = Date.now();
  const minGapMs = Math.max(0, Number(options.minGapMs ?? 4500));
  if (!resumeTargetChanged && now - Number(state.terminalLastCodexSyncAt || 0) < minGapMs) {
    return false;
  }
  await ensurePersistentTerminalChannel({
    autoStart: true,
    loadHistory: false,
  });
  const sent = await runTerminalCommand(command, {
    forceLive: true,
  });
  if (sent) {
    state.terminalLastCodexSyncAt = now;
    if (!Boolean(options.silent)) {
      setTerminalStatusLine(
        target ? `Codex thread synced: ${target}` : `Codex session synced: ${sessionName}`,
        "ok"
      );
    }
  }
  return sent;
}

function readNpmCommandFromTopBar() {
  return normalizeNpmCommandInput(els.terminalCommandInput?.value || "");
}

function readTerminalDockCommand() {
  const dockCommand = normalizeNpmCommandInput(els.terminalDockInput?.value || "");
  if (dockCommand) {
    return { command: dockCommand, source: "dock" };
  }
  const topBarCommand = readNpmCommandFromTopBar();
  if (topBarCommand) {
    return { command: topBarCommand, source: "top-bar" };
  }
  return { command: "", source: "" };
}

async function submitTerminalDockCommand(options = {}) {
  const forceQueue = Boolean(options.forceQueue);
  const { command, source } = readTerminalDockCommand();
  if (!command) {
    setTerminalStatusLine("Type a command in the top bar first.", "bad");
    return;
  }
  if (forceQueue) {
    const queued = queueTerminalCommand(command);
    if (queued) {
      if (source === "dock" && els.terminalDockInput) {
        els.terminalDockInput.value = "";
      } else if (source === "top-bar" && els.terminalCommandInput) {
        els.terminalCommandInput.value = "";
      }
    }
    return;
  }
  const handled = await runTerminalCommand(command);
  if (handled) {
    if (source === "dock" && els.terminalDockInput) {
      els.terminalDockInput.value = "";
    } else if (source === "top-bar" && els.terminalCommandInput) {
      els.terminalCommandInput.value = "";
    }
  }
  if (handled && !state.terminalQueueMode) {
    setCommandResult(`NPM command sent: ${command}`);
  }
  renderTerminalCommandQueue();
}

function isTouchFirstDevice() {
  return window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(max-width: 900px)").matches;
}

function getTerminalViewportScroller() {
  if (!els.terminalMount) {
    return null;
  }
  return els.terminalMount.querySelector(".xterm-viewport") || els.terminalMount.querySelector(".xterm-screen");
}

function isScrollerNearBottom(node, threshold = 48) {
  if (!node) {
    return true;
  }
  const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
  return distance <= threshold;
}

function setTerminalUserScrolling(active, options = {}) {
  const next = Boolean(active);
  if (next) {
    state.terminalUserScrolling = true;
    if (state.terminalUserScrollTimer) {
      window.clearTimeout(state.terminalUserScrollTimer);
      state.terminalUserScrollTimer = null;
    }
    return;
  }
  const delay = Number(options.delay ?? 220);
  if (!Number.isFinite(delay) || delay <= 0) {
    state.terminalUserScrolling = false;
    if (state.terminalUserScrollTimer) {
      window.clearTimeout(state.terminalUserScrollTimer);
      state.terminalUserScrollTimer = null;
    }
    return;
  }
  if (state.terminalUserScrollTimer) {
    window.clearTimeout(state.terminalUserScrollTimer);
  }
  state.terminalUserScrollTimer = window.setTimeout(() => {
    state.terminalUserScrollTimer = null;
    state.terminalUserScrolling = false;
  }, delay);
}

function applyTerminalInputMode() {
  if (!state.terminal) {
    return;
  }
  const disableNativeStdin = Boolean(state.terminalSelectMode || state.terminalProxyInputMode);
  if (!state.terminal.options) {
    return;
  }
  state.terminal.options.disableStdin = disableNativeStdin;
}

function shouldFocusTerminalFromTouchTap(event) {
  if (!isTouchFirstDevice()) {
    return true;
  }
  if (state.terminalUserScrolling) {
    return false;
  }
  const pointerType = String(event?.pointerType || "").toLowerCase();
  if (pointerType && !["touch", "pen"].includes(pointerType)) {
    return true;
  }
  return true;
}

function setTerminalMobileKeyboardOpen(open) {
  const next = Boolean(open);
  state.terminalMobileKeyboardOpen = next;
  if (els.terminalCommandDeck) {
    els.terminalCommandDeck.classList.toggle("mobile-kbd-open", next);
  }
  refreshTerminalKeyboardDockVisibility();
}

function refreshTerminalKeyboardDockVisibility() {
  const visible = isTouchFirstDevice() && state.terminalMobileKeyboardOpen;
  if (els.terminalCommandDeck) {
    els.terminalCommandDeck.classList.toggle("mobile-dock-visible", visible);
  }
  if (els.terminalKeyboardDock) {
    els.terminalKeyboardDock.hidden = !visible;
  }
  if (!visible) {
    state.terminalDockExpanded = false;
    if (els.terminalCommandDeck) {
      els.terminalCommandDeck.classList.remove("mobile-dock-extended");
    }
    if (els.terminalDockExtensions) {
      els.terminalDockExtensions.hidden = true;
    }
    if (els.terminalDockMoreBtn) {
      els.terminalDockMoreBtn.classList.remove("active");
      els.terminalDockMoreBtn.setAttribute("aria-pressed", "false");
      const label = els.terminalDockMoreBtn.querySelector("span");
      if (label) {
        label.textContent = "More";
      } else {
        els.terminalDockMoreBtn.textContent = "More";
      }
    }
    return;
  }
  if (els.terminalDockExtensions) {
    els.terminalDockExtensions.hidden = !state.terminalDockExpanded;
  }
}

function isTerminalDomRenderer() {
  return Boolean(els.terminalCommandDeck?.classList?.contains("dom-renderer"));
}

function setTerminalDockFocusLock(durationMs = 420) {
  const duration = Number(durationMs);
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 420;
  state.terminalDockFocusLockUntil = Date.now() + safeDuration;
}

function terminalDockFocusLockActive() {
  return isTouchFirstDevice() && !state.terminalSelectMode && Date.now() < Number(state.terminalDockFocusLockUntil || 0);
}

function scheduleTerminalProxyRefocus(delayMs = 0) {
  if (state.terminalSelectMode) {
    return;
  }
  if (state.terminalProxyRefocusTimer) {
    window.clearTimeout(state.terminalProxyRefocusTimer);
    state.terminalProxyRefocusTimer = null;
  }
  const delay = Number(delayMs);
  const safeDelay = Number.isFinite(delay) && delay > 0 ? delay : 0;
  state.terminalProxyRefocusTimer = window.setTimeout(() => {
    state.terminalProxyRefocusTimer = null;
    if (!terminalDockFocusLockActive()) {
      return;
    }
    if (els.terminalDirectInputProxy) {
      state.terminalProxyInputMode = true;
      applyTerminalInputMode();
      try {
        els.terminalDirectInputProxy.focus({ preventScroll: true });
      } catch {
        els.terminalDirectInputProxy.focus();
      }
    } else {
      state.terminalProxyInputMode = false;
      applyTerminalInputMode();
      state.terminal?.focus?.();
    }
    setTerminalMobileKeyboardOpen(true);
  }, safeDelay);
}

function markTerminalTouchAction(button, holdMs = 2400) {
  if (!isTouchFirstDevice()) {
    return;
  }
  const hold = Number(holdMs);
  const safeHold = Number.isFinite(hold) && hold > 0 ? hold : 2400;
  state.terminalTouchActionHandledUntil = Date.now() + safeHold;
  state.terminalTouchActionHandledButton = button || null;
}

function beginTerminalTouchScroll(event) {
  if (!isTouchFirstDevice()) {
    return;
  }
  state.terminalTouchScroll.active = true;
  state.terminalTouchScroll.pointerId = event?.pointerId ?? null;
  state.terminalTouchScroll.startX = Number(event?.clientX || 0);
  state.terminalTouchScroll.lastY = Number(event?.clientY || 0);
  state.terminalTouchScroll.carry = 0;
  state.terminalTouchScroll.dragging = false;
}

function trackTerminalTouchScroll(event) {
  if (!isTouchFirstDevice() || !state.terminalTouchScroll.active) {
    return;
  }
  const pointerId = state.terminalTouchScroll.pointerId;
  if (pointerId !== null && pointerId !== undefined && event?.pointerId !== pointerId) {
    return;
  }
  const dx = Number(event?.clientX || 0) - Number(state.terminalTouchScroll.startX || 0);
  const dy = Number(event?.clientY || 0) - Number(state.terminalTouchScroll.lastY || 0);
  state.terminalTouchScroll.carry = Math.max(Math.abs(dx), Math.abs(dy));
  if (state.terminalTouchScroll.carry >= 10) {
    state.terminalTouchScroll.dragging = true;
    state.terminalTouchActionHandledUntil = Date.now() + 120;
    state.terminalTouchActionHandledButton = null;
  }
}

function endTerminalTouchScroll() {
  state.terminalTouchScroll.active = false;
  state.terminalTouchScroll.pointerId = null;
  state.terminalTouchScroll.startX = 0;
  state.terminalTouchScroll.lastY = 0;
  window.setTimeout(() => {
    state.terminalTouchScroll.dragging = false;
    state.terminalTouchScroll.carry = 0;
  }, 40);
}

function shouldSuppressTerminalTouchClick(button) {
  if (!isTouchFirstDevice()) {
    return false;
  }
  if (state.terminalTouchScroll.dragging) {
    return true;
  }
  const until = Number(state.terminalTouchActionHandledUntil || 0);
  if (!until || Date.now() > until) {
    state.terminalTouchActionHandledButton = null;
    return false;
  }
  const handledButton = state.terminalTouchActionHandledButton || null;
  if (!handledButton) {
    return true;
  }
  return handledButton === button;
}

function maintainTerminalTouchFocus(lockMs = 700) {
  if (!isTouchFirstDevice() || state.terminalSelectMode) {
    return;
  }
  setTerminalDockFocusLock(lockMs);
  scheduleTerminalProxyRefocus(0);
}

function terminalInputSurfaceFocused() {
  const active = document.activeElement || null;
  if (!active) {
    return false;
  }
  if (active === els.terminalDirectInputProxy) {
    return true;
  }
  const nativeTextarea = state.terminal?.textarea || state.terminal?._core?._textarea || null;
  return Boolean(nativeTextarea && active === nativeTextarea);
}

function syncViewportCssVars(options = {}) {
  const root = document.documentElement;
  const inputFocused = terminalInputSurfaceFocused();
  const mobileKeyboardOpen = isTouchFirstDevice() && inputFocused && !state.terminalSelectMode;
  setTerminalMobileKeyboardOpen(mobileKeyboardOpen);
  const terminalTopBar = els.terminalTopBar;
  if (terminalTopBar) {
    const measuredHeight = Math.max(44, Math.round(terminalTopBar.getBoundingClientRect().height || terminalTopBar.offsetHeight || 0));
    root.style.setProperty("--terminal-head-height", `${measuredHeight}px`);
  }
  if (options.fitTerminal !== false) {
    scheduleTerminalFit({ notify: false });
  }
}

function triggerTerminalHapticPulse() {
  if (!isTouchFirstDevice()) {
    return;
  }
  if (typeof navigator?.vibrate === "function") {
    try {
      navigator.vibrate(8);
    } catch {
      // ignore vibration errors
    }
  }
}

function paintTerminalTapFeedback(target) {
  const button = target?.closest?.("button");
  if (!button || !button.closest(".terminal-command-deck")) {
    return false;
  }
  button.classList.remove("tap-press");
  window.requestAnimationFrame(() => {
    button.classList.add("tap-press");
    window.setTimeout(() => {
      button.classList.remove("tap-press");
    }, 120);
  });
  return true;
}

function setTerminalToolsOpen(open, options = {}) {
  if (!els.terminalCommandDeck) {
    return;
  }
  const next = Boolean(open);
  state.terminalToolsOpen = next;
  els.terminalCommandDeck.classList.toggle("tools-open", next);
  els.terminalCommandDeck.classList.toggle("tools-collapsed", !next);
  if (els.terminalToolsPopover) {
    els.terminalToolsPopover.hidden = !next;
  }
  if (els.terminalToolsToggleBtn) {
    const label = els.terminalToolsToggleBtn.querySelector("span");
    if (label) {
      label.textContent = next ? "Hide" : "Tools";
    }
    els.terminalToolsToggleBtn.classList.toggle("active", next);
    els.terminalToolsToggleBtn.setAttribute("aria-expanded", next ? "true" : "false");
  }
  const actionButtons = els.terminalCommandDeck.querySelectorAll('[data-terminal-action="tools"]');
  for (const button of actionButtons) {
    button.classList.toggle("active", next);
    if (button === els.terminalToolsToggleBtn) {
      continue;
    }
    button.textContent = next ? "Close" : "Tools";
    button.setAttribute("aria-pressed", next ? "true" : "false");
  }
  if (options.fit !== false) {
    scheduleTerminalFit({ notify: false });
  }
  refreshTerminalKeyboardDockVisibility();
  syncViewportCssVars({ fitTerminal: false });
}

async function sendTerminalSoftLineBreak() {
  if (state.terminalTransactionMode && els.terminalDirectInputProxy) {
    const current = String(els.terminalDirectInputProxy.value || state.terminalDirectInputLastValue || "");
    const next = `${current}\n`;
    els.terminalDirectInputProxy.value = next;
    state.terminalDirectInputLastValue = next;
    state.terminalDirectInputNeedsCommit = true;
    setTerminalStatusLine("Soft line break buffered in transaction mode.", "ok");
    return;
  }
  await sendTerminalSequence("\n", "Soft line break sent.");
}

function focusTerminalTypingSurface() {
  const terminal = ensureTerminalReady();
  if (!terminal && !isTerminalDomRenderer()) {
    return;
  }
  if (isTouchFirstDevice() && els.terminalDirectInputProxy && !state.terminalSelectMode) {
    state.terminalProxyInputMode = true;
    applyTerminalInputMode();
    els.terminalDirectInputProxy.readOnly = false;
    if (typeof els.terminalDirectInputProxy.focus === "function") {
      els.terminalDirectInputProxy.focus({ preventScroll: true });
    }
    setTerminalMobileKeyboardOpen(true);
    refreshTerminalKeyboardDockVisibility();
    window.setTimeout(() => {
      syncViewportCssVars({ fitTerminal: false });
    }, 50);
  } else {
    state.terminalProxyInputMode = false;
    applyTerminalInputMode();
    terminal?.focus?.();
    const nativeTextarea = terminal?.textarea || terminal?._core?._textarea || null;
    if (nativeTextarea && typeof nativeTextarea.focus === "function") {
      nativeTextarea.focus();
    }
  }
  ensurePersistentTerminalChannel({
    autoStart: true,
    loadHistory: false,
  }).catch(() => null);
}

function syncDirectInputProxyFromValue(nextValue) {
  if (!els.terminalDirectInputProxy) {
    return;
  }
  const proxy = els.terminalDirectInputProxy;
  const value = String(nextValue ?? els.terminalDirectInputProxy.value ?? "");
  const previous = String(state.terminalDirectInputLastValue || "");
  if (value === previous) {
    return;
  }
  if (state.terminalTransactionMode) {
    state.terminalDirectInputLastValue = value;
    state.terminalDirectInputNeedsCommit = value !== String(state.terminalDirectInputLiveValue || "");
    return;
  }
  if (state.terminalQueueMode) {
    state.terminalDirectInputLastValue = value;
    state.terminalDirectInputNeedsCommit = true;
    return;
  }
  const selectionStart =
    typeof proxy.selectionStart === "number" && Number.isFinite(proxy.selectionStart)
      ? proxy.selectionStart
      : value.length;
  const selectionEnd =
    typeof proxy.selectionEnd === "number" && Number.isFinite(proxy.selectionEnd) ? proxy.selectionEnd : value.length;
  const caretAtEnd = selectionStart === value.length && selectionEnd === value.length;
  if (!caretAtEnd) {
    state.terminalDirectInputLastValue = value;
    state.terminalDirectInputNeedsCommit = true;
    return;
  }
  if (state.terminalDirectInputNeedsCommit) {
    state.terminalDirectInputLastValue = value;
    if (value === String(state.terminalDirectInputLiveValue || "")) {
      state.terminalDirectInputNeedsCommit = false;
    }
    return;
  }
  if (!value && !previous) {
    return;
  }
  if (value.startsWith(previous)) {
    const appended = value.slice(previous.length);
    if (appended) {
      sendTerminalStdin(appended);
    }
    state.terminalDirectInputLastValue = value;
    state.terminalDirectInputLiveValue = value;
    return;
  }
  if (previous.startsWith(value)) {
    const removed = previous.length - value.length;
    if (removed > 0) {
      sendTerminalStdin("\u007f".repeat(removed));
    }
    state.terminalDirectInputLastValue = value;
    state.terminalDirectInputLiveValue = value;
    return;
  }
  state.terminalDirectInputLastValue = value;
  state.terminalDirectInputNeedsCommit = true;
}

function renderTerminalCommandQueue() {
  if (!els.terminalQueueCount) {
    return;
  }
  const count = Array.isArray(state.terminalCommandQueue) ? state.terminalCommandQueue.length : 0;
  els.terminalQueueCount.textContent = `Que ${count}`;
  els.terminalQueueCount.title = `Queued terminal commands: ${count}`;
  if (els.terminalQueueFlushBtn) {
    els.terminalQueueFlushBtn.disabled = count === 0;
  }
}

function renderTerminalQueueMode() {
  if (!els.terminalQueueModeBtn) {
    return;
  }
  const enabled = Boolean(state.terminalQueueMode);
  const label = enabled ? "Que On" : "Que Off";
  els.terminalQueueModeBtn.classList.toggle("active", enabled);
  els.terminalQueueModeBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
  const labelNode = els.terminalQueueModeBtn.querySelector("span");
  if (labelNode) {
    labelNode.textContent = label;
  } else {
    els.terminalQueueModeBtn.textContent = label;
  }
  els.terminalQueueModeBtn.title = enabled
    ? "Queue mode is on. Enter queues commands."
    : "Queue mode is off. Enter sends commands live.";
}

function renderTerminalTransactionMode() {
  const enabled = Boolean(state.terminalTransactionMode);
  const buttons = [els.terminalTransactionModeBtn, els.terminalDockTransactionModeBtn].filter(Boolean);
  for (const button of buttons) {
    button.classList.toggle("active", enabled);
    button.setAttribute("aria-pressed", enabled ? "true" : "false");
    const label = enabled ? "Txn On" : "Txn Off";
    const labelNode = button.querySelector("span");
    if (labelNode) {
      labelNode.textContent = label;
    } else {
      button.textContent = label;
    }
    button.title = enabled
      ? "Transaction mode is on. Typed chars stay local until commit."
      : "Transaction mode is off. Typed chars stream live.";
  }
}

function setTerminalQueueMode(enabled, options = {}) {
  const next = Boolean(enabled);
  state.terminalQueueMode = next;
  renderTerminalQueueMode();
  if (options.announce !== false) {
    setTerminalStatusLine(
      next ? "Queue mode enabled. Enter queues commands." : "Live mode enabled. Enter sends immediately.",
      "ok"
    );
  }
}

function setTerminalTransactionMode(enabled, options = {}) {
  const next = Boolean(enabled);
  state.terminalTransactionMode = next;
  if (!next) {
    state.terminalDirectInputNeedsCommit = false;
  } else if (els.terminalDirectInputProxy) {
    const value = String(els.terminalDirectInputProxy.value || "");
    state.terminalDirectInputLastValue = value;
    state.terminalDirectInputNeedsCommit = true;
    if (isTouchFirstDevice() && !state.terminalSelectMode) {
      state.terminalProxyInputMode = true;
      applyTerminalInputMode();
      try {
        els.terminalDirectInputProxy.focus({ preventScroll: true });
      } catch {
        els.terminalDirectInputProxy.focus();
      }
      setTerminalMobileKeyboardOpen(true);
    }
  }
  renderTerminalTransactionMode();
  if (options.announce !== false) {
    setTerminalStatusLine(
      next
        ? "Transaction mode enabled. Input is local until you commit."
        : "Transaction mode disabled. Input streams live.",
      "ok"
    );
  }
}

function setTerminalDockExpanded(expanded) {
  const next = Boolean(expanded);
  state.terminalDockExpanded = next;
  if (els.terminalCommandDeck) {
    els.terminalCommandDeck.classList.toggle("mobile-dock-extended", next);
  }
  if (els.terminalDockExtensions) {
    els.terminalDockExtensions.hidden = !next;
  }
  if (els.terminalDockMoreBtn) {
    els.terminalDockMoreBtn.classList.toggle("active", next);
    els.terminalDockMoreBtn.setAttribute("aria-pressed", next ? "true" : "false");
    const label = els.terminalDockMoreBtn.querySelector("span");
    if (label) {
      label.textContent = next ? "Less" : "More";
    } else {
      els.terminalDockMoreBtn.textContent = next ? "Less" : "More";
    }
  }
  syncViewportCssVars({ fitTerminal: false });
}

function clearTerminalSequenceGap(options = {}) {
  state.terminalSequenceGap = null;
  renderTerminalGapIndicator();
  if (options.silent !== true) {
    renderTerminalControls();
  }
}

function recordTerminalSequenceGap(fromSeq, toSeq, source = "stream") {
  const from = parseTerminalSequenceId(fromSeq);
  const to = parseTerminalSequenceId(toSeq);
  if (!from || !to || to < from) {
    return;
  }
  const existing = state.terminalSequenceGap;
  if (existing && existing.from === from && existing.to === to) {
    return;
  }
  const count = to - from + 1;
  state.terminalSequenceGap = {
    from,
    to,
    count,
    source: String(source || "stream"),
    at: Date.now(),
  };
  renderTerminalGapIndicator();
  setTerminalStatusLine(`Terminal output gap detected (${from}-${to}). Tap Gap to recover.`, "bad");
}

function renderTerminalGapIndicator() {
  if (!els.terminalGapRecoverBtn) {
    return;
  }
  const gap = state.terminalSequenceGap;
  if (!gap) {
    els.terminalGapRecoverBtn.hidden = true;
    els.terminalGapRecoverBtn.textContent = "Gap";
    return;
  }
  const count = Number(gap.count || 0);
  const label = count > 0 ? `Gap +${count}` : "Gap";
  els.terminalGapRecoverBtn.hidden = false;
  els.terminalGapRecoverBtn.textContent = label;
  els.terminalGapRecoverBtn.title = `Missing terminal output from seq ${gap.from} to ${gap.to}. Tap to reload history.`;
}

function renderTerminalSearchStatus() {
  const total = Array.isArray(state.terminalSearchMatches) ? state.terminalSearchMatches.length : 0;
  const active = total > 0 ? Math.max(1, state.terminalSearchActiveIndex + 1) : 0;
  if (els.terminalSearchStatus) {
    els.terminalSearchStatus.textContent = `${active} / ${total}`;
    els.terminalSearchStatus.title = total > 0 ? `Terminal search match ${active} of ${total}` : "No terminal search matches.";
  }
  if (els.terminalSearchPrevBtn) {
    els.terminalSearchPrevBtn.disabled = total === 0;
  }
  if (els.terminalSearchNextBtn) {
    els.terminalSearchNextBtn.disabled = total === 0;
  }
}

function renderTerminalSearchMarkers() {
  const rail = els.terminalSearchMarkerRail;
  if (!rail) {
    return;
  }
  rail.replaceChildren();
  const matches = Array.isArray(state.terminalSearchMatches) ? state.terminalSearchMatches : [];
  const textLength = Math.max(1, String(state.terminalTextBuffer || "").length);
  if (matches.length === 0) {
    rail.hidden = true;
    return;
  }
  rail.hidden = false;
  const maxMarkers = 180;
  const stride = Math.max(1, Math.ceil(matches.length / maxMarkers));
  for (let index = 0; index < matches.length; index += stride) {
    const match = matches[index];
    const marker = document.createElement("span");
    marker.className = "terminal-search-marker";
    const topPct = Math.max(0, Math.min(100, (Number(match.offset || 0) / textLength) * 100));
    marker.style.top = `${topPct}%`;
    if (index === state.terminalSearchActiveIndex) {
      marker.classList.add("active");
    }
    rail.appendChild(marker);
  }
}

function scrollTerminalToSearchMatch(match) {
  if (!match || typeof match !== "object") {
    return;
  }
  const textLength = Math.max(1, String(state.terminalTextBuffer || "").length);
  const ratio = Math.max(0, Math.min(1, Number(match.offset || 0) / textLength));
  const scroller = getTerminalViewportScroller();
  if (scroller) {
    const maxScrollTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    scroller.scrollTop = Math.round(maxScrollTop * ratio);
    state.terminalAutoStickBottom = false;
    setTerminalUserScrolling(false, { delay: 0 });
  }
  if (els.terminalSelectableOutput && !els.terminalSelectableOutput.hidden) {
    const output = els.terminalSelectableOutput;
    const maxScrollTop = Math.max(0, output.scrollHeight - output.clientHeight);
    output.scrollTop = Math.round(maxScrollTop * ratio);
  }
}

function refreshTerminalSearchMatches(options = {}) {
  const query = String(state.terminalSearchQuery || "");
  if (!query) {
    state.terminalSearchMatches = [];
    state.terminalSearchActiveIndex = -1;
    renderTerminalSearchStatus();
    renderTerminalSearchMarkers();
    return;
  }
  const haystack = String(state.terminalTextBuffer || "");
  const search = query.toLowerCase();
  const source = haystack.toLowerCase();
  const matches = [];
  const maxMatches = 700;
  let fromIndex = 0;
  while (fromIndex < source.length && matches.length < maxMatches) {
    const offset = source.indexOf(search, fromIndex);
    if (offset < 0) {
      break;
    }
    matches.push({
      offset,
      length: search.length,
    });
    fromIndex = offset + Math.max(1, search.length);
  }
  state.terminalSearchMatches = matches;
  if (!matches.length) {
    state.terminalSearchActiveIndex = -1;
    renderTerminalSearchStatus();
    renderTerminalSearchMarkers();
    return;
  }
  const preserveActive = options.preserveActive !== false;
  if (!preserveActive || state.terminalSearchActiveIndex < 0 || state.terminalSearchActiveIndex >= matches.length) {
    state.terminalSearchActiveIndex = 0;
  }
  renderTerminalSearchStatus();
  renderTerminalSearchMarkers();
}

function scheduleTerminalSearchRefresh(options = {}) {
  if (state.terminalSearchRefreshTimer) {
    window.clearTimeout(state.terminalSearchRefreshTimer);
    state.terminalSearchRefreshTimer = null;
  }
  const immediate = options.immediate === true;
  if (immediate) {
    refreshTerminalSearchMatches(options);
    return;
  }
  state.terminalSearchRefreshTimer = window.setTimeout(() => {
    state.terminalSearchRefreshTimer = null;
    refreshTerminalSearchMatches(options);
  }, 70);
}

function setTerminalSearchQuery(rawQuery, options = {}) {
  const next = String(rawQuery || "").trim();
  state.terminalSearchQuery = next;
  if (els.terminalSearchInput && els.terminalSearchInput.value !== rawQuery) {
    els.terminalSearchInput.value = rawQuery;
  }
  scheduleTerminalSearchRefresh({
    immediate: options.immediate === true,
    preserveActive: options.preserveActive !== false,
  });
  if (options.jump === true) {
    jumpTerminalSearchMatch(1, { fromStart: true });
  }
}

function clearTerminalSearch() {
  state.terminalSearchQuery = "";
  state.terminalSearchMatches = [];
  state.terminalSearchActiveIndex = -1;
  if (els.terminalSearchInput) {
    els.terminalSearchInput.value = "";
  }
  renderTerminalSearchStatus();
  renderTerminalSearchMarkers();
}

function jumpTerminalSearchMatch(step, options = {}) {
  const matches = Array.isArray(state.terminalSearchMatches) ? state.terminalSearchMatches : [];
  if (!matches.length) {
    setTerminalStatusLine("No terminal search matches.", "bad");
    return false;
  }
  const direction = Number(step) < 0 ? -1 : 1;
  const total = matches.length;
  let nextIndex = Number(state.terminalSearchActiveIndex || 0);
  if (options.fromStart === true || nextIndex < 0 || nextIndex >= total) {
    nextIndex = direction > 0 ? 0 : total - 1;
  } else {
    nextIndex = (nextIndex + direction + total) % total;
  }
  state.terminalSearchActiveIndex = nextIndex;
  renderTerminalSearchStatus();
  renderTerminalSearchMarkers();
  const current = matches[nextIndex];
  scrollTerminalToSearchMatch(current);
  setTerminalStatusLine(`Search match ${nextIndex + 1}/${total}.`, "ok");
  return true;
}

function queueTerminalCommand(command) {
  const value = String(command || "").trim();
  if (!value) {
    return false;
  }
  state.terminalCommandQueue.push(value);
  renderTerminalCommandQueue();
  setTerminalStatusLine(`Queued: ${value}`, "ok");
  setCommandResult(`Queued command (${state.terminalCommandQueue.length}): ${value}`);
  return true;
}

async function flushTerminalCommandQueue() {
  if (!state.terminalCommandQueue.length) {
    renderTerminalCommandQueue();
    return;
  }
  while (state.terminalCommandQueue.length) {
    const next = state.terminalCommandQueue.shift();
    try {
      await runTerminalCommand(next, { fromQueue: true, forceLive: true });
    } catch (error) {
      // Restore the current item if send failed, then stop.
      state.terminalCommandQueue.unshift(next);
      renderTerminalCommandQueue();
      throw error;
    }
  }
  renderTerminalCommandQueue();
  setTerminalStatusLine("Queued commands sent.", "ok");
}

function decodeTerminalSequenceLiteral(rawValue) {
  const value = String(rawValue || "");
  if (!value) {
    return "";
  }
  return value
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\r/g, "\r")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t");
}

function stripAnsiSequences(text) {
  const value = String(text || "");
  if (!value) {
    return "";
  }
  return value
    .replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g, "")
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\u001b[@-Z\\-_]/g, "");
}

function renderTerminalSelectableOutput(options = {}) {
  if (!els.terminalSelectableOutput) {
    return;
  }
  const node = els.terminalSelectableOutput;
  const domRenderer = isTerminalDomRenderer();
  const selectMode = Boolean(state.terminalSelectMode);
  if (domRenderer && !selectMode && options.forceBottom !== true && options.force !== true) {
    node.hidden = true;
    return;
  }
  const text = String(state.terminalTextBuffer || "");
  const shouldStickToBottom = options.stickToBottom !== false;
  const nearBottom =
    node.scrollHeight - node.scrollTop - node.clientHeight < 60 || node.scrollTop <= 2 || options.forceBottom === true;
  if ("value" in node) {
    node.value = text || "No terminal output yet.";
  } else {
    node.textContent = text || "No terminal output yet.";
  }
  if (shouldStickToBottom && nearBottom) {
    node.scrollTop = node.scrollHeight;
  }
  if (domRenderer) {
    node.hidden = !selectMode;
  }
}

function appendTerminalTextBuffer(rawChunk) {
  const chunk = stripAnsiSequences(rawChunk);
  if (!chunk) {
    return;
  }
  state.terminalTextBuffer += chunk;
  const maxChars = 800_000;
  if (state.terminalTextBuffer.length > maxChars) {
    state.terminalTextBuffer = state.terminalTextBuffer.slice(state.terminalTextBuffer.length - maxChars);
  }
  renderTerminalSelectableOutput();
  scheduleTerminalSearchRefresh();
}

function setTerminalSelectMode(enabled, options = {}) {
  const next = Boolean(enabled);
  const domRenderer = isTerminalDomRenderer();
  state.terminalSelectMode = next;
  if (next) {
    state.terminalProxyInputMode = false;
    state.terminalDockFocusLockUntil = 0;
    if (state.terminalProxyRefocusTimer) {
      window.clearTimeout(state.terminalProxyRefocusTimer);
      state.terminalProxyRefocusTimer = null;
    }
  }
  applyTerminalInputMode();
  if (els.terminalViewport) {
    els.terminalViewport.classList.toggle("select-mode", next);
  }
  if (els.terminalTextModeBtn) {
    const label = els.terminalTextModeBtn.querySelector("span");
    if (label) {
      label.textContent = next ? "Live Control" : "Select Text";
    }
    els.terminalTextModeBtn.classList.toggle("active", next);
  }
  if (els.terminalSelectDockBtn) {
    const label = els.terminalSelectDockBtn.querySelector("span");
    if (label) {
      label.textContent = next ? "Live" : "Select";
    } else {
      els.terminalSelectDockBtn.textContent = next ? "Live" : "Select";
    }
    els.terminalSelectDockBtn.classList.toggle("active", next);
  }
  if (els.terminalSelectExitBtn) {
    els.terminalSelectExitBtn.hidden = !next;
    els.terminalSelectExitBtn.disabled = !next;
  }
  if (els.terminalSelectDockExitBtn) {
    els.terminalSelectDockExitBtn.hidden = !next;
    els.terminalSelectDockExitBtn.disabled = !next;
  }
  const copyLiveButtons = document.querySelectorAll('[data-terminal-action="copy-live"]');
  for (const button of copyLiveButtons) {
    button.disabled = !next;
  }
  if (els.terminalSelectableOutput) {
    els.terminalSelectableOutput.hidden = !next;
  }
  if (els.terminalDirectInputProxy) {
    els.terminalDirectInputProxy.disabled = next;
    els.terminalDirectInputProxy.readOnly = next;
    if (next) {
      els.terminalDirectInputProxy.blur();
      els.terminalDirectInputProxy.value = "";
      state.terminalDirectInputLastValue = "";
      state.terminalDirectInputLiveValue = "";
      state.terminalDirectInputNeedsCommit = false;
      state.terminalDirectInputCommitAt = 0;
      state.terminalDirectInputComposing = false;
    }
  }
  refreshTerminalKeyboardDockVisibility();
  if (next) {
    endTerminalTouchScroll();
  }
  applyTerminalInputMode();
  if (next) {
    renderTerminalSelectableOutput({ forceBottom: options.focusBottom === true });
    if (!domRenderer && options.focus !== false) {
      window.setTimeout(() => {
        els.terminalSelectableOutput?.focus();
      }, 0);
    }
    setTerminalStatusLine(
      domRenderer ? "Select mode active. Highlight text directly in terminal output." : "Select mode active. Scroll and highlight text.",
      "ok"
    );
  } else {
    if (options.focus !== false) {
      focusTerminalTypingSurface();
    } else if (!isTouchFirstDevice()) {
      state.terminal?.focus?.();
    }
    setTerminalStatusLine(domRenderer ? "DOM terminal live mode active." : "Live control active.", "ok");
  }
}

async function copyTerminalTextFromView(options = {}) {
  const exitSelectMode = Boolean(options.exitSelectMode);
  const wasSelectMode = Boolean(state.terminalSelectMode);
  let selected = "";
  if (els.terminalSelectableOutput && !els.terminalSelectableOutput.hidden) {
    const node = els.terminalSelectableOutput;
    if ("selectionStart" in node && "selectionEnd" in node && "value" in node) {
      const start = Number(node.selectionStart || 0);
      const end = Number(node.selectionEnd || 0);
      if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
        selected = String(node.value || "").slice(start, end).trim();
      }
    }
  }
  if (!selected) {
    selected = String(window.getSelection?.().toString?.() || "").trim();
  }
  const fallback = String(state.terminalTextBuffer || "").trim();
  const text = selected || fallback;
  if (!text) {
    throw new Error("No terminal text available.");
  }
  await copyTextToClipboard(text);
  if (exitSelectMode && wasSelectMode) {
    setTerminalSelectMode(false, { focus: true });
    setTerminalStatusLine(selected ? "Selected text copied. Live control active." : "Terminal text copied. Live control active.", "ok");
    return;
  }
  setTerminalStatusLine(selected ? "Selected text copied." : "Terminal text copied.", "ok");
}

function fitTerminalToViewport(options = {}) {
  if (!state.terminal || !els.terminalMount) {
    return;
  }
  const geometry = terminalGeometryFallback();
  const cols = Number.parseInt(String(geometry.cols || ""), 10);
  const rows = Number.parseInt(String(geometry.rows || ""), 10);
  if (Number.isFinite(cols) && cols > 0 && Number.isFinite(rows) && rows > 0) {
    try {
      if (state.terminal.cols !== cols || state.terminal.rows !== rows) {
        state.terminal.resize(cols, rows);
      }
    } catch {
      // ignore transient xterm resize errors
    }
    state.terminalCols = cols;
    state.terminalRows = rows;
    if (options.notify !== false) {
      sendTerminalResize(cols, rows);
    }
  }
  const scroller = getTerminalViewportScroller();
  if (scroller && !state.terminalUserScrolling && state.terminalAutoStickBottom) {
    scroller.scrollTop = scroller.scrollHeight;
    renderTerminalSelectableOutput({ forceBottom: true });
  }
}

function scheduleTerminalFit(options = {}) {
  clearTerminalFitTimer();
  state.terminalFitTimer = window.setTimeout(() => {
    state.terminalFitTimer = null;
    fitTerminalToViewport(options);
  }, TERMINAL_FIT_DEBOUNCE_MS);
}

function ensureTerminalPointerFocusBindings() {
  if (state.terminalPointerBindingsReady || !els.terminalMount) {
    return;
  }
  const focusHandledFlag = "__roboaiTerminalFocusHandled";
  const handleTerminalPointerFocus = (event) => {
    if (event && event[focusHandledFlag]) {
      return;
    }
    if (event) {
      event[focusHandledFlag] = true;
    }
    if (state.terminalSelectMode) {
      return;
    }
    if (!shouldFocusTerminalFromTouchTap(event)) {
      return;
    }
    focusTerminalTypingSurface();
  };
  els.terminalMount.addEventListener("pointerup", handleTerminalPointerFocus);
  if (els.terminalViewport) {
    els.terminalViewport.addEventListener("pointerup", (event) => {
      if (state.terminalSelectMode) {
        return;
      }
      if (event.target === els.terminalSelectableOutput) {
        return;
      }
      handleTerminalPointerFocus(event);
    });
  }
  state.terminalPointerBindingsReady = true;
}

function ensureXtermTerminalReady() {
  if (!els.terminalMount) {
    return null;
  }
  if (state.terminal && state.terminalRenderer === "xterm") {
    return state.terminal;
  }
  disposeTerminalInstance({ preserveMount: false });
  if (typeof window.Terminal !== "function") {
    setTerminalStatusLine("xterm.js assets failed to load.", "bad");
    return null;
  }
  try {
    const terminal = new window.Terminal({
      convertEol: false,
      disableStdin: Boolean(state.terminalSelectMode || state.terminalProxyInputMode),
      cursorBlink: true,
      scrollback: 10000,
      fontFamily: '"Cascadia Mono", "Consolas", "SFMono-Regular", "Menlo", monospace',
      fontSize: 13,
      lineHeight: 1.2,
      theme: {
        background: "#070f1d",
        foreground: "#e7f2ff",
        cursor: "#79d8ff",
        selectionBackground: "rgba(121, 216, 255, 0.26)",
        selectionInactiveBackground: "rgba(121, 216, 255, 0.16)",
      },
    });
    terminal.open(els.terminalMount);
    terminal.onData((data) => {
      if (terminal.options?.disableStdin) {
        return;
      }
      sendTerminalStdin(data);
    });
    terminal.onResize(({ cols, rows }) => {
      const safeCols = Number.parseInt(String(cols || ""), 10);
      const safeRows = Number.parseInt(String(rows || ""), 10);
      if (!Number.isFinite(safeCols) || !Number.isFinite(safeRows) || safeCols <= 0 || safeRows <= 0) {
        return;
      }
      state.terminalCols = safeCols;
      state.terminalRows = safeRows;
      if (state.terminalSocketConnected) {
        sendTerminalResize(safeCols, safeRows);
      }
    });
    state.terminal = terminal;
    state.terminalRenderer = "xterm";
    state.terminalMountNode = terminal.element || null;
    state.terminalDomWriteErrorCount = 0;
    rememberTerminalRenderer("xterm");
    applyTerminalInputMode();
    const viewportScroller = getTerminalViewportScroller();
    if (viewportScroller) {
      const handleTerminalScroll = () => {
        const nearBottom = isScrollerNearBottom(viewportScroller, 18);
        if (!nearBottom) {
          state.terminalAutoStickBottom = false;
        } else if (!state.terminalUserScrolling) {
          state.terminalAutoStickBottom = true;
        }
      };
      viewportScroller.addEventListener("scroll", handleTerminalScroll, { passive: true });
      viewportScroller.addEventListener(
        "touchmove",
        () => {
          setTerminalUserScrolling(true);
          state.terminalAutoStickBottom = false;
        },
        { passive: true }
      );
      viewportScroller.addEventListener(
        "touchend",
        () => {
          setTerminalUserScrolling(false, { delay: 260 });
          handleTerminalScroll();
        },
        { passive: true }
      );
      viewportScroller.addEventListener(
        "touchcancel",
        () => {
          setTerminalUserScrolling(false, { delay: 260 });
          handleTerminalScroll();
        },
        { passive: true }
      );
      viewportScroller.addEventListener(
        "wheel",
        () => {
          setTerminalUserScrolling(true);
        },
        { passive: true }
      );
      handleTerminalScroll();
    } else {
      state.terminalAutoStickBottom = true;
    }
    if (typeof ResizeObserver === "function" && els.terminalViewport) {
      if (state.terminalResizeObserver) {
        try {
          state.terminalResizeObserver.disconnect();
        } catch {
          // ignore
        }
      }
      state.terminalResizeObserver = new ResizeObserver(() => {
        scheduleTerminalFit();
      });
      state.terminalResizeObserver.observe(els.terminalViewport);
    }
    ensureTerminalPointerFocusBindings();
    syncViewportCssVars({ fitTerminal: false });
    scheduleTerminalFit({ notify: false });
    renderTerminalSelectableOutput({ forceBottom: true });
    return terminal;
  } catch (error) {
    disposeTerminalInstance({ preserveMount: false });
    if (els.terminalMount) {
      els.terminalMount.replaceChildren();
    }
    state.terminalDomWriteErrorCount = 0;
    setTerminalStatusLine(`xterm init failed: ${error instanceof Error ? error.message : "unknown error"}`, "bad");
    return null;
  }
}

function ensureTerminalReady() {
  if (!els.terminalMount) {
    return null;
  }
  if (els.terminalCommandDeck) {
    els.terminalCommandDeck.classList.remove("dom-renderer");
    els.terminalCommandDeck.classList.add("xterm-renderer");
  }
  return ensureXtermTerminalReady();
}

function parseTerminalSequenceId(value) {
  const seq = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(seq) || seq <= 0) {
    return 0;
  }
  return seq;
}

function terminalHistoryPayloadAcksResume(payload, expectedSince) {
  const since = parseTerminalSequenceId(expectedSince);
  if (!since) {
    return true;
  }
  if (!payload || typeof payload !== "object") {
    return false;
  }
  const requestedSince = parseTerminalSequenceId(payload?.requestedSince ?? payload?.since ?? payload?.history?.requestedSince);
  const latestSeq = parseTerminalSequenceId(payload?.latestSeq ?? payload?.history?.latestSeq ?? extractTerminalHistoryMaxSequence(payload));
  const availableFromSeq = parseTerminalSequenceId(payload?.availableFromSeq ?? payload?.history?.availableFromSeq);
  const gapFrom = parseTerminalSequenceId(payload?.gap?.from ?? payload?.history?.gap?.from);
  if (requestedSince >= since) {
    return true;
  }
  if (latestSeq >= since) {
    return true;
  }
  if (availableFromSeq > 0 && availableFromSeq <= since + 1) {
    return true;
  }
  if (gapFrom > 0 && gapFrom <= since + 1) {
    return true;
  }
  return false;
}

function markTerminalResumeAck(payload = null) {
  if (terminalHistoryPayloadAcksResume(payload, state.terminalResumeRequestedSince)) {
    state.terminalResumeAckAt = Date.now();
    state.terminalResumeFallbackStep = 0;
    clearTerminalResumeWatchdog();
    return true;
  }
  return false;
}

function scheduleTerminalResumeWatchdog(ws, since = 0) {
  if (!ws) {
    return;
  }
  clearTerminalResumeWatchdog();
  const expectedSince = parseTerminalSequenceId(since);
  state.terminalResumeRequestedSince = expectedSince;
  state.terminalResumeAckAt = 0;
  state.terminalResumeFallbackStep = 0;
  const runStep = (step) => {
    state.terminalResumeWatchdogTimer = window.setTimeout(async () => {
      if (ws !== state.terminalSocket || ws.readyState !== WebSocket.OPEN) {
        clearTerminalResumeWatchdog();
        return;
      }
      if (state.terminalResumeAckAt > 0) {
        clearTerminalResumeWatchdog();
        return;
      }
      state.terminalResumeFallbackStep = step;
      if (step === 0) {
        sendTerminalWsMessage({
          type: "terminal:history",
          since: expectedSince,
        });
        runStep(1);
        return;
      }
      if (step === 1) {
        try {
          const payload = await refreshTerminalHistory({
            clear: false,
            since: expectedSince,
            silent: true,
          });
          markTerminalResumeAck(payload);
        } catch {
          // ignore fallback fetch failures
        }
        if (ws !== state.terminalSocket || ws.readyState !== WebSocket.OPEN) {
          clearTerminalResumeWatchdog();
          return;
        }
        if (state.terminalResumeAckAt > 0) {
          clearTerminalResumeWatchdog();
          return;
        }
        runStep(2);
        return;
      }
      try {
        await refreshTerminalHistory({ clear: true, silent: true });
        clearTerminalSequenceGap({ silent: true });
        setTerminalStatusLine("Terminal stream recovered after reconnect.", "ok");
      } catch {
        // ignore final recovery failures
      }
      state.terminalResumeAckAt = Date.now();
      state.terminalResumeFallbackStep = 0;
      clearTerminalResumeWatchdog();
    }, step === 0 ? TERMINAL_RESUME_ACK_MS : TERMINAL_RESUME_FALLBACK_MS);
  };
  runStep(0);
}

function extractTerminalHistoryMaxSequence(payload) {
  if (!payload || typeof payload !== "object") {
    return 0;
  }
  let maxSeq = 0;
  const accept = (value) => {
    const seq = parseTerminalSequenceId(value);
    if (seq > maxSeq) {
      maxSeq = seq;
    }
  };
  const inspectList = (list) => {
    if (!Array.isArray(list)) {
      return;
    }
    for (const item of list) {
      if (item && typeof item === "object") {
        accept(item.seq);
      }
    }
  };
  accept(payload.seq);
  if (payload.chunk && typeof payload.chunk === "object") {
    accept(payload.chunk.seq);
  }
  inspectList(payload.chunks);
  inspectList(payload.lines);
  inspectList(payload.history);
  if (payload.history && typeof payload.history === "object" && !Array.isArray(payload.history)) {
    accept(payload.history.seq);
    inspectList(payload.history.chunks);
    inspectList(payload.history.lines);
    inspectList(payload.history.history);
  }
  return maxSeq;
}

function terminalPayloadText(payload) {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  if (payload.chunk && typeof payload.chunk === "object" && typeof payload.chunk.data === "string") {
    const seq = parseTerminalSequenceId(payload.chunk.seq);
    if (seq > 0) {
      const lastSeq = Number(state.terminalLastOutputSeq || 0);
      if (seq <= lastSeq) {
        return "";
      }
      if (lastSeq > 0 && seq > lastSeq + 1) {
        recordTerminalSequenceGap(lastSeq + 1, seq - 1, "stream");
      }
      state.terminalLastOutputSeq = seq;
    }
    return payload.chunk.data;
  }
  const payloadSeq = parseTerminalSequenceId(payload.seq);
  if (payloadSeq > 0) {
    const lastSeq = Number(state.terminalLastOutputSeq || 0);
    if (payloadSeq <= lastSeq) {
      return "";
    }
    if (lastSeq > 0 && payloadSeq > lastSeq + 1) {
      recordTerminalSequenceGap(lastSeq + 1, payloadSeq - 1, "stream");
    }
    state.terminalLastOutputSeq = payloadSeq;
  }
  const candidates = [payload.data, payload.output, payload.chunk, payload.text, payload.message];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  }
  return "";
}

function collectTerminalHistoryEntries(payload) {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const historyText = typeof payload.historyText === "string" ? payload.historyText : "";
  if (historyText) {
    return [{
      data: historyText,
      seq: parseTerminalSequenceId(payload.seq),
    }];
  }
  const bufferText = typeof payload.buffer === "string" ? payload.buffer : "";
  if (bufferText) {
    return [{
      data: bufferText,
      seq: parseTerminalSequenceId(payload.seq),
    }];
  }
  const entries = [];
  const append = (value, seq = 0) => {
    if (typeof value !== "string" || value.length === 0) {
      return;
    }
    entries.push({
      data: value,
      seq: parseTerminalSequenceId(seq),
    });
  };
  const appendObject = (item) => {
    if (!item || typeof item !== "object") {
      return;
    }
    const seq = parseTerminalSequenceId(item.seq);
    const keys = ["data", "output", "chunk", "text", "message"];
    for (const key of keys) {
      if (typeof item[key] === "string" && item[key]) {
        append(item[key], seq);
        return;
      }
    }
  };
  const appendList = (list) => {
    if (!Array.isArray(list)) {
      return;
    }
    for (const item of list) {
      if (typeof item === "string") {
        append(item, 0);
        continue;
      }
      appendObject(item);
    }
  };

  // Prefer explicit history arrays first to preserve exact output order and
  // allow identical repeated lines/chunks.
  const historyObject = payload.history && typeof payload.history === "object" && !Array.isArray(payload.history)
    ? payload.history
    : null;
  const hasStructuredHistory = Boolean(
    Array.isArray(payload.history) ||
      Array.isArray(payload.chunks) ||
      Array.isArray(payload.lines) ||
      Array.isArray(historyObject?.chunks) ||
      Array.isArray(historyObject?.lines) ||
      Array.isArray(historyObject?.history)
  );
  if (hasStructuredHistory) {
    appendList(Array.isArray(payload.history) ? payload.history : []);
    appendList(historyObject?.chunks);
    appendList(historyObject?.lines);
    appendList(historyObject?.history);
    appendList(payload.chunks);
    appendList(payload.lines);
    if (entries.length > 0) {
      return entries;
    }
  }

  append(payload.output, payload.seq);
  append(payload.data, payload.seq);
  append(payload.chunk, payload.seq);
  append(payload.text, payload.seq);
  append(payload.message, payload.seq);
  if (historyObject) {
    append(historyObject.output, historyObject.seq || payload.seq);
    append(historyObject.data, historyObject.seq || payload.seq);
    append(historyObject.chunk, historyObject.seq || payload.seq);
    append(historyObject.text, historyObject.seq || payload.seq);
  }
  return entries;
}

function writeTerminalOutput(rawChunk) {
  const chunk = String(rawChunk || "");
  if (!chunk) {
    return;
  }
  appendTerminalTextBuffer(chunk);
  const terminal = ensureTerminalReady();
  if (!terminal) {
    return;
  }
  const scroller = getTerminalViewportScroller();
  const shouldStickToBottom = !state.terminalUserScrolling && (state.terminalAutoStickBottom || isScrollerNearBottom(scroller));
  try {
    terminal.write(chunk);
  } catch {
    setTerminalStatusLine("xterm render error.", "bad");
    return;
  }
  if (shouldStickToBottom) {
    state.terminalAutoStickBottom = true;
    window.requestAnimationFrame(() => {
      const nextScroller = getTerminalViewportScroller();
      if (nextScroller) {
        nextScroller.scrollTop = nextScroller.scrollHeight;
      }
    });
  }
}

function applyTerminalStatusPayload(payload) {
  const previous = state.terminalStatus && typeof state.terminalStatus === "object" ? state.terminalStatus : null;
  const next = parseTerminalStatusObject(payload);
  if (next) {
    state.terminalStatus = {
      ...(state.terminalStatus && typeof state.terminalStatus === "object" ? state.terminalStatus : {}),
      ...next,
    };
    const prevStartedAt = String(previous?.startedAt || "");
    const nextStartedAt = String(state.terminalStatus?.startedAt || "");
    const prevPid = Number.parseInt(String(previous?.pid || ""), 10);
    const nextPid = Number.parseInt(String(state.terminalStatus?.pid || ""), 10);
    if (
      (nextStartedAt && nextStartedAt !== prevStartedAt) ||
      (Number.isFinite(prevPid) && prevPid > 0 && Number.isFinite(nextPid) && nextPid > 0 && prevPid !== nextPid)
    ) {
      state.terminalLastOutputSeq = 0;
      state.terminalLastCodexSyncAt = 0;
      state.terminalResumeRequestedSince = 0;
      state.terminalResumeAckAt = 0;
      state.terminalResumeFallbackStep = 0;
      clearTerminalSequenceGap({ silent: true });
    }
  }
  renderTerminalControls();
}

function applyTerminalHistoryPayload(payload, options = {}) {
  const terminal = ensureTerminalReady();
  if (!terminal) {
    return;
  }
  const clearFirst = options.clear !== false;
  const gapInfo = payload?.gap || payload?.history?.gap || null;
  const reportedGapFrom = parseTerminalSequenceId(gapInfo?.from);
  const reportedGapTo = parseTerminalSequenceId(gapInfo?.to);
  if (reportedGapFrom > 0 && reportedGapTo >= reportedGapFrom) {
    recordTerminalSequenceGap(reportedGapFrom, reportedGapTo, "resume");
  }
  const historyMaxSeq = extractTerminalHistoryMaxSequence(payload);
  if (clearFirst) {
    state.terminalLastOutputSeq = 0;
    clearTerminalSequenceGap({ silent: true });
  }
  if (clearFirst) {
    state.terminalTextBuffer = "";
    scheduleTerminalSearchRefresh({ immediate: true, preserveActive: false });
    renderTerminalSelectableOutput({ forceBottom: true });
    try {
      terminal.reset();
      terminal.clear();
    } catch {
      // ignore transient clear failures
    }
  }
  let lastSeq = Number(state.terminalLastOutputSeq || 0);
  for (const entry of collectTerminalHistoryEntries(payload)) {
    const seq = parseTerminalSequenceId(entry.seq);
    if (seq > 0) {
      if (seq <= lastSeq) {
        continue;
      }
      if (lastSeq > 0 && seq > lastSeq + 1) {
        recordTerminalSequenceGap(lastSeq + 1, seq - 1, "history");
      }
      lastSeq = seq;
      state.terminalLastOutputSeq = seq;
    }
    writeTerminalOutput(entry.data);
  }
  if (historyMaxSeq > Number(state.terminalLastOutputSeq || 0)) {
    state.terminalLastOutputSeq = historyMaxSeq;
  }
  if (clearFirst) {
    setTerminalUserScrolling(false, { delay: 0 });
    state.terminalAutoStickBottom = true;
    const scroller = getTerminalViewportScroller();
    if (scroller) {
      scroller.scrollTop = scroller.scrollHeight;
    }
    renderTerminalSelectableOutput({ forceBottom: true });
  } else {
    renderTerminalSelectableOutput({ stickToBottom: false });
  }
  const nextStatus = parseTerminalStatusObject(payload);
  if (nextStatus) {
    state.terminalStatus = {
      ...(state.terminalStatus && typeof state.terminalStatus === "object" ? state.terminalStatus : {}),
      ...nextStatus,
    };
  }
  scheduleTerminalFit({ notify: false });
  renderTerminalControls();
}

async function refreshTerminalStatus(options = {}) {
  const payload = await api("/api/terminal/status");
  applyTerminalStatusPayload(payload);
  if (options.connectIfActive && isTerminalActive()) {
    connectTerminalSocket({ allowReconnect: true });
  }
  if (!options.silent) {
    setCommandResult(JSON.stringify(payload, null, 2));
  }
  return payload;
}

async function refreshTerminalHistory(options = {}) {
  const since = parseTerminalSequenceId(options.since);
  const query = since > 0 ? `?since=${since}` : "";
  const payload = await api(`/api/terminal/history${query}`);
  markTerminalResumeAck(payload);
  applyTerminalHistoryPayload(payload, { clear: options.clear !== false });
  if (!options.silent) {
    setCommandResult(JSON.stringify(payload, null, 2));
  }
  return payload;
}

function connectTerminalSocket(options = {}) {
  const terminal = ensureTerminalReady();
  if (!terminal) {
    return;
  }
  const allowReconnect = options.allowReconnect !== false;
  state.terminalAutoReconnect = allowReconnect;
  clearTerminalReconnectTimer();

  const existing = state.terminalSocket;
  if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
    state.terminalSocketConnected = existing.readyState === WebSocket.OPEN;
    if (state.terminalSocketConnected) {
      scheduleTerminalFit();
      renderTerminalControls();
    } else {
      renderTerminalControls("Connecting terminal socket...");
    }
    return;
  }

  closeTerminalSocket({ preserveAutoReconnect: true });

  const ws = new WebSocket(wsUrlFor(TERMINAL_WS_PATH));
  state.terminalSocket = ws;
  state.terminalSocketConnected = false;
  renderTerminalControls("Connecting terminal socket...");

  ws.addEventListener("open", () => {
    if (ws !== state.terminalSocket) {
      return;
    }
    state.terminalSocketConnected = true;
    renderTerminalControls("Terminal socket live.");
    scheduleTerminalFit();
    const geometry = readTerminalGeometry();
    sendTerminalResize(geometry.cols, geometry.rows);
    const resumeSince = parseTerminalSequenceId(state.terminalLastOutputSeq);
    if (resumeSince > 0) {
      sendTerminalWsMessage({
        type: "terminal:resume",
        since: resumeSince,
      });
      scheduleTerminalResumeWatchdog(ws, resumeSince);
    } else {
      sendTerminalWsMessage({ type: "terminal:status" });
      clearTerminalResumeWatchdog();
    }
    if (state.terminalInputQueue.length > 0) {
      const queued = state.terminalInputQueue.join("");
      state.terminalInputQueue = [];
      sendTerminalWsMessage({
        type: "terminal:stdin",
        data: queued,
      });
    }
    if (!state.terminalProxyInputMode) {
      terminal?.focus?.();
    }
  });

  ws.addEventListener("message", (event) => {
    if (ws !== state.terminalSocket) {
      return;
    }
    let payload = null;
    const raw = String(event.data || "");
    try {
      payload = JSON.parse(raw);
    } catch {
      writeTerminalOutput(raw);
      return;
    }

    const type = String(payload?.type || payload?.event || "").toLowerCase();
    if (type === "terminal:resume") {
      markTerminalResumeAck(payload);
      applyTerminalHistoryPayload(payload, { clear: false });
      return;
    }
    if (type.includes("history")) {
      markTerminalResumeAck(payload);
      const requestedSince = parseTerminalSequenceId(payload?.requestedSince ?? payload?.since);
      const shouldClear = requestedSince === 0 && Number(state.terminalLastOutputSeq || 0) === 0;
      applyTerminalHistoryPayload(payload, { clear: shouldClear });
      return;
    }

    const statusPayload = parseTerminalStatusObject(payload);
    if (statusPayload) {
      applyTerminalStatusPayload(statusPayload);
    }

    const output = terminalPayloadText(payload);
    if (output) {
      writeTerminalOutput(output);
      const seq = parseTerminalSequenceId(payload?.chunk?.seq ?? payload?.seq);
      if (!state.terminalResumeAckAt && seq > 0 && seq >= parseTerminalSequenceId(state.terminalResumeRequestedSince)) {
        state.terminalResumeAckAt = Date.now();
        clearTerminalResumeWatchdog();
      }
    }

    if (type.includes("exit") || type.includes("stop") || type.includes("closed")) {
      state.terminalStatus = {
        ...(state.terminalStatus && typeof state.terminalStatus === "object" ? state.terminalStatus : {}),
        active: false,
        running: false,
        exitCode: payload?.exitCode ?? payload?.code ?? state.terminalStatus?.exitCode ?? null,
      };
      state.terminalAutoReconnect = false;
    }

    if (type.includes("error")) {
      const message = String(payload?.error || payload?.message || "Terminal error.");
      renderTerminalControls(`Terminal error: ${message}`);
      return;
    }

    renderTerminalControls();
  });

  ws.addEventListener("close", () => {
    if (ws !== state.terminalSocket) {
      return;
    }
    state.terminalSocket = null;
    state.terminalSocketConnected = false;
    clearTerminalResumeWatchdog();
    state.terminalResumeRequestedSince = 0;
    state.terminalResumeAckAt = 0;
    state.terminalResumeFallbackStep = 0;
    if (state.terminalAutoReconnect && !els.appView.hidden) {
      renderTerminalControls("Terminal socket disconnected. Reconnecting...");
      scheduleTerminalReconnect();
      return;
    }
    renderTerminalControls();
  });

  ws.addEventListener("error", () => {
    if (ws !== state.terminalSocket) {
      return;
    }
    state.terminalSocketConnected = false;
    clearTerminalResumeWatchdog();
    renderTerminalControls("Terminal socket error.");
  });
}

async function startTerminalSession(options = {}) {
  const reattach = Boolean(options.reattach);
  const terminal = ensureTerminalReady();
  if (!terminal) {
    throw new Error("xterm is unavailable.");
  }
  const geometry = readTerminalGeometry();

  renderTerminalControls(reattach ? "Reattaching terminal..." : "Starting terminal...");
  const payload = await api("/api/terminal/start", {
    method: "POST",
    body: {
      reattach,
      cols: geometry.cols,
      rows: geometry.rows,
    },
  });
  applyTerminalStatusPayload(payload);
  await refreshTerminalHistory({ clear: true, silent: true }).catch(() => null);
  connectTerminalSocket({ allowReconnect: true });
  renderTerminalControls(reattach ? "Terminal reattached." : "Terminal started.");
  setCommandResult(JSON.stringify(payload, null, 2));
}

async function reattachTerminalSession() {
  try {
    await startTerminalSession({ reattach: true });
  } catch (error) {
    await refreshTerminalStatus({ silent: true }).catch(() => null);
    if (isTerminalActive()) {
      await refreshTerminalHistory({ clear: true, silent: true }).catch(() => null);
      connectTerminalSocket({ allowReconnect: true });
      renderTerminalControls("Terminal reattached.");
      return;
    }
    throw error;
  }
}

async function interruptTerminalSession() {
  renderTerminalControls("Sending interrupt...");
  const payload = await api("/api/terminal/interrupt", {
    method: "POST",
    body: {},
  });
  applyTerminalStatusPayload(payload);
  renderTerminalControls("Interrupt sent.");
  setCommandResult(JSON.stringify(payload, null, 2));
}

async function stopTerminalSession() {
  renderTerminalControls("Stopping terminal...");
  const payload = await api("/api/terminal/stop", {
    method: "POST",
    body: {},
  });
  applyTerminalStatusPayload(payload);
  connectTerminalSocket({ allowReconnect: true });
  renderTerminalControls(payload?.stopped === false ? "Terminal was not running." : "Terminal stopped.");
  setCommandResult(JSON.stringify(payload, null, 2));
}

function clearTerminalViewport() {
  const terminal = ensureTerminalReady();
  if (!terminal) {
    return;
  }
  setTerminalUserScrolling(false, { delay: 0 });
  state.terminalAutoStickBottom = true;
  state.terminalTextBuffer = "";
  scheduleTerminalSearchRefresh({ immediate: true, preserveActive: false });
  clearTerminalSequenceGap({ silent: true });
  renderTerminalSelectableOutput({ forceBottom: true });
  try {
    terminal.reset();
    terminal.clear();
  } catch {
    // ignore transient clear failures
  }
  const scroller = getTerminalViewportScroller();
  if (scroller) {
    scroller.scrollTop = scroller.scrollHeight;
  }
  renderTerminalControls();
}

async function activateTerminalPanel() {
  const terminal = ensureTerminalReady();
  if (!terminal) {
    throw new Error("xterm is unavailable.");
  }
  scheduleTerminalFit({ notify: false });
  applyTerminalInputMode();
  if (!state.terminalProxyInputMode) {
    terminal?.focus?.();
  }
  await ensurePersistentTerminalChannel({
    autoStart: true,
    loadHistory: false,
  });
}

async function ensurePersistentTerminalChannel(options = {}) {
  const autoStart = options.autoStart !== false;
  const loadHistory = options.loadHistory === true;
  const terminal = ensureTerminalReady();
  if (!terminal) {
    throw new Error("xterm is unavailable.");
  }
  const geometry = readTerminalGeometry();

  await refreshTerminalStatus({ silent: true }).catch(() => null);
  if (!isTerminalActive() && autoStart) {
    try {
      renderTerminalControls("Opening persistent terminal channel...");
      const payload = await api("/api/terminal/start", {
        method: "POST",
        body: {
          reattach: true,
          cols: geometry.cols,
          rows: geometry.rows,
        },
      });
      applyTerminalStatusPayload(payload);
      state.terminalLastOutputSeq = 0;
      state.terminalResumeRequestedSince = 0;
      state.terminalResumeAckAt = 0;
      state.terminalResumeFallbackStep = 0;
      clearTerminalSequenceGap({ silent: true });
    } catch (error) {
      setTerminalStatusLine(`Terminal start failed: ${error.message}`, "bad");
    }
  }

  if (loadHistory && isTerminalActive()) {
    await refreshTerminalHistory({ clear: true, silent: true }).catch(() => null);
  }
  connectTerminalSocket({ allowReconnect: true });
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
  const ws = new WebSocket(wsUrlFor("/ws"));
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
  const manifest = state.manifests.find((entry) => entry.id === manifestId);
  if (manifest?.previewUrl) {
    return manifest.previewUrl;
  }
  return withBasePath(`/preview/${encodeURIComponent(manifestId)}/`);
}

function markPreviewFrameLoading() {
  state.previewFramePendingSince = Date.now();
}

function clearPreviewFrameLoading() {
  state.previewFramePendingSince = 0;
}

function isPreviewFrameLoading() {
  if (!state.previewFramePendingSince) {
    return false;
  }
  if (Date.now() - state.previewFramePendingSince > 15000) {
    state.previewFramePendingSince = 0;
    return false;
  }
  return true;
}

function updatePreviewFrame() {
  const target = previewUrlFor(state.activePreviewId);
  markPreviewFrameLoading();
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
    if (state.activeUtilityPanel !== "preview") return;
    if (isPreviewFrameLoading()) return;
    markPreviewFrameLoading();
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

function selectedEnvironmentProject() {
  return els.envProject?.value.trim() || state.activeProject || "";
}

function selectedAgentProject() {
  return els.agentProfileProject?.value.trim() || selectedEnvironmentProject() || "";
}

function selectedCodexProject() {
  return els.codexSessionProject.value.trim() || selectedAgentProject() || "";
}

function selectedAgentProfileName() {
  return String(els.agentProfileName?.value || els.agentProfileSelect?.value || "").trim();
}

function suggestedSuperAgentSessionName(project = "") {
  const scope = String(project || "workspace")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return `super-${scope || "workspace"}-${stamp}`;
}

function environmentProfilesForLookup() {
  return Array.isArray(state.envProfiles?.profiles) ? state.envProfiles.profiles : [];
}

function selectedEnvironmentProfileName() {
  return String(els.envProfileName?.value || els.envProfileSelect?.value || "").trim();
}

function renderEnvironmentSummary() {
  const lines = [];
  const active = state.activeEnvironment;
  const runtime = state.envRuntime;
  const selectedProfile = selectedEnvironmentProfileName() || state.activeEnvironment?.environmentProfileName || "(none)";
  const localUrl = String(els.envLocalUrlText?.value || "").trim();
  const remoteUrl = String(els.envRemoteUrlText?.value || "").trim();

  lines.push(`Profile: ${selectedProfile}`);
  if (active) {
    lines.push(`Active environment: ${active.summary || active.context || "ready"}`);
    if (active.startedAt) {
      lines.push(`Started: ${active.startedAt}`);
    }
    if (active.sessionName) {
      lines.push(`Session: ${active.sessionName}`);
    }
  } else {
    lines.push("Active environment: (none)");
    lines.push(`Configured context: ${els.envContextSelect?.value || "commander"}`);
    lines.push(`Configured project: ${selectedEnvironmentProject() || "(default)"}`);
    lines.push(`Configured prep: ${els.envPrepSelect?.value || "quick"}`);
    lines.push(`Configured relay: ${els.envRelaySelect?.value || "off"}`);
    lines.push(`Configured session: ${els.envSessionName?.value.trim() || "codex-chat"}`);
  }

  if (runtime?.services) {
    lines.push(`Dev: ${runtime.services.dev ? runtime.services.dev.mode || "running" : "off"}`);
    lines.push(`Relay: ${runtime.services.relay ? runtime.services.relay.sessionName || "running" : "off"}`);
    lines.push(`Tunnel: ${runtime.services.tunnel ? runtime.services.tunnel.mode || "running" : "off"}`);
  }

  if (localUrl) {
    lines.push(`Local URL: ${localUrl}`);
  }
  if (remoteUrl) {
    lines.push(`Remote URL: ${remoteUrl}`);
  }

  const artifacts = runtime?.artifacts || {};
  const artifactKeys = Object.keys(artifacts);
  if (artifactKeys.length) {
    lines.push("");
    lines.push("Artifacts:");
    for (const key of artifactKeys) {
      const item = artifacts[key];
      if (!item || typeof item !== "object") {
        continue;
      }
      const label = item.path || key;
      const stamp = item.updatedAt ? ` (${item.updatedAt})` : "";
      lines.push(`- ${label}${item.exists === false ? " [missing]" : ""}${stamp}`);
    }
  }

  if (els.envPreview) {
    els.envPreview.value = lines.join("\n");
  }
}

function fillEnvironmentFormFromSelection() {
  const selectedName = String(els.envProfileSelect?.value || "").trim();
  const selected = environmentProfilesForLookup().find((entry) => entry.name === selectedName);
  if (!selected) {
    renderEnvironmentSummary();
    return;
  }
  if (els.envProfileName) {
    els.envProfileName.value = selected.name || "";
  }
  if (els.envContextSelect) {
    els.envContextSelect.value = selected.context || "commander";
  }
  if (els.envProject) {
    els.envProject.value = selected.project || "";
  }
  if (els.envPrepSelect) {
    els.envPrepSelect.value = selected.prep || "quick";
  }
  if (els.envPanelModeSelect) {
    els.envPanelModeSelect.value = selected.panelMode || "remote";
  }
  if (els.envDevModeSelect) {
    els.envDevModeSelect.value = selected.devMode || "project";
  }
  if (els.envRemoteModeSelect) {
    els.envRemoteModeSelect.value = selected.remoteMode || "named";
  }
  if (els.envPublicHost) {
    els.envPublicHost.value = selected.publicHost || "";
  }
  if (els.envRelaySelect) {
    els.envRelaySelect.value = selected.relayEnabled ? "on" : "off";
  }
  if (els.envSessionName) {
    els.envSessionName.value = selected.sessionName || "codex-chat";
  }
  renderEnvironmentSummary();
}

function renderEnvironmentProfileSelect() {
  if (!els.envProfileSelect) {
    return;
  }
  const profiles = environmentProfilesForLookup();
  const previous = String(els.envProfileSelect.value || "").trim();
  els.envProfileSelect.innerHTML = "";
  if (!profiles.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No environment profiles";
    els.envProfileSelect.appendChild(option);
    renderEnvironmentSummary();
    return;
  }
  for (const profile of profiles) {
    const option = document.createElement("option");
    option.value = profile.name;
    option.textContent = `${profile.name}${profile.retired ? " (retired)" : ""}`;
    els.envProfileSelect.appendChild(option);
  }
  const preferred = previous && profiles.some((entry) => entry.name === previous)
    ? previous
    : state.envProfiles?.defaults?.perContext?.[els.envContextSelect?.value || "commander"] || state.envProfiles?.defaults?.global || profiles[0].name;
  els.envProfileSelect.value = preferred;
  fillEnvironmentFormFromSelection();
}

function renderLaunchRuns() {
  if (!els.launchRunSelect || !els.launchRunPreview || !els.launchRunStatus) {
    return;
  }
  const previous = String(els.launchRunSelect.value || "").trim();
  els.launchRunSelect.innerHTML = "";

  if (!Array.isArray(state.launchRuns) || !state.launchRuns.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No runs";
    els.launchRunSelect.appendChild(option);
    els.launchRunStatus.value = "No runs loaded.";
    els.launchRunPreview.value = "No environment or agent runs recorded yet.";
    if (els.launchRunPlanBtn) {
      els.launchRunPlanBtn.disabled = true;
    }
    if (els.launchRunRelaunchBtn) {
      els.launchRunRelaunchBtn.disabled = true;
    }
    return;
  }

  for (const run of state.launchRuns) {
    const option = document.createElement("option");
    option.value = run.id;
    option.textContent = `${run.status || "ready"} | ${run.summary || run.sessionName || run.id}`;
    els.launchRunSelect.appendChild(option);
  }

  const selectedId = previous && state.launchRuns.some((entry) => entry.id === previous) ? previous : state.launchRuns[0].id;
  els.launchRunSelect.value = selectedId;
  const selected = state.launchRuns.find((entry) => entry.id === selectedId) || state.launchRuns[0];
  els.launchRunStatus.value = selected?.status || "ready";
  if (els.launchRunPlanBtn) {
    els.launchRunPlanBtn.disabled = false;
  }
  if (els.launchRunRelaunchBtn) {
    els.launchRunRelaunchBtn.disabled = false;
  }

  const lines = [
    `Summary: ${selected?.summary || "(none)"}`,
    `Kind: ${selected?.kind || "(unknown)"}`,
    `Environment Profile: ${selected?.environmentProfileName || "(none)"}`,
    `Agent Profile: ${selected?.agentProfileName || "(none)"}`,
    `Context: ${selected?.context || "(none)"}`,
    `Project: ${selected?.project || "(default)"}`,
    `Prep: ${selected?.prep || "(none)"}`,
    `Panel: ${selected?.panelMode || "(none)"}`,
    `Remote: ${selected?.remoteMode || "(none)"}`,
    `Relay: ${selected?.relayEnabled ? "on" : "off"}`,
    `Public Host: ${selected?.publicHost || "(none)"}`,
    `Session: ${selected?.sessionName || "(none)"}`,
    `Thread: ${selected?.threadId || "(none)"}`,
  ];
  if (selected?.model) {
    lines.push(`Model: ${selected.model}`);
  }
  if (selected?.codexProfile) {
    lines.push(`Codex Profile: ${selected.codexProfile}`);
  }
  const urls = selected?.urls && typeof selected.urls === "object" ? selected.urls : {};
  if (urls.local) {
    lines.push(`Local URL: ${urls.local}`);
  }
  if (urls.public) {
    lines.push(`Remote URL: ${urls.public}`);
  }
  if (selected?.request && typeof selected.request === "object") {
    lines.push("");
    lines.push("Recorded Request:");
    for (const [key, value] of Object.entries(selected.request)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }
      lines.push(`- ${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`);
    }
  }
  els.launchRunPreview.value = lines.join("\n");
}

function applyEnvironmentStatusPayload(payload) {
  state.activeEnvironment = payload?.environment || null;
  state.envProfiles = payload?.profiles || state.envProfiles || null;
  state.launchRuns = Array.isArray(payload?.runs) ? payload.runs : state.launchRuns;
  state.envRuntime = payload?.runtime || state.envRuntime || null;
  if (payload?.agentProfiles) {
    applyAgentProfilesPayload(payload.agentProfiles);
  }
  if (payload?.activeDev !== undefined) {
    state.activeDev = payload.activeDev || null;
  }
  if (payload?.activeRelay || payload?.activeRelays) {
    setRelayState(payload.activeRelay || null, payload.activeRelays || []);
  }
  if (payload?.activeTunnel !== undefined) {
    state.activeTunnel = payload.activeTunnel || null;
  }
  if (payload?.connection) {
    state.connectionHelp = payload.connection;
  }

  if (!els.envProject.value) {
    els.envProject.value = state.activeProject || "";
  }
  if (els.envStatusText) {
    els.envStatusText.value = state.activeEnvironment?.summary || "environment idle";
  }

  const localUrl = String(payload?.connection?.urls?.local || payload?.runtime?.urls?.local || "").trim();
  const remoteUrl = String(
    payload?.connection?.guidance?.recommendedMobileUrl || payload?.runtime?.urls?.recommendedMobileUrl || payload?.connection?.urls?.public || ""
  ).trim();
  if (els.envLocalUrlText) {
    els.envLocalUrlText.value = localUrl;
  }
  if (els.envRemoteUrlText) {
    els.envRemoteUrlText.value = remoteUrl;
  }
  if (els.envSessionName && state.activeEnvironment?.sessionName) {
    els.envSessionName.value = state.activeEnvironment.sessionName;
  }
  if (els.envRelaySelect && state.activeEnvironment) {
    els.envRelaySelect.value = state.activeEnvironment.relayEnabled ? "on" : "off";
  }
  if (els.envRemoteModeSelect && state.activeEnvironment?.remoteMode) {
    els.envRemoteModeSelect.value = state.activeEnvironment.remoteMode;
  }
  if (els.envPublicHost && state.activeEnvironment?.publicHost) {
    els.envPublicHost.value = state.activeEnvironment.publicHost;
  }

  renderEnvironmentProfileSelect();
  renderLaunchRuns();
  renderConnectionHelp();
  renderEnvironmentSummary();
}

async function refreshEnvironmentStatus() {
  const payload = await api("/api/env/status");
  applyEnvironmentStatusPayload(payload);
  return payload;
}

async function refreshLaunchRuns() {
  const payload = await api("/api/runs");
  state.launchRuns = Array.isArray(payload?.runs) ? payload.runs : [];
  renderLaunchRuns();
  return payload;
}

function buildEnvironmentRequestFromForm(overrides = {}) {
  return {
    environmentProfileName: selectedEnvironmentProfileName(),
    context: els.envContextSelect.value,
    project: selectedEnvironmentProject(),
    prep: els.envPrepSelect.value,
    panelMode: els.envPanelModeSelect.value,
    devMode: els.envDevModeSelect.value,
    relayEnabled: els.envRelaySelect?.value !== "off",
    remoteMode: els.envRemoteModeSelect.value,
    publicHost: els.envPublicHost.value.trim(),
    sessionName: els.envSessionName?.value.trim() || "codex-chat",
    ...overrides,
  };
}

async function saveEnvironmentProfile() {
  const payload = await api("/api/env/profiles/upsert", {
    method: "POST",
    body: {
      name: selectedEnvironmentProfileName(),
      context: els.envContextSelect.value,
      project: selectedEnvironmentProject(),
      prep: els.envPrepSelect.value,
      panelMode: els.envPanelModeSelect.value,
      devMode: els.envDevModeSelect.value,
      relayEnabled: els.envRelaySelect?.value !== "off",
      remoteMode: els.envRemoteModeSelect.value,
      publicHost: els.envPublicHost.value.trim(),
      sessionName: els.envSessionName?.value.trim() || "codex-chat",
      notes: "",
    },
  });
  state.envProfiles = payload?.profiles || state.envProfiles;
  renderEnvironmentProfileSelect();
  els.codexSessionStatus.textContent = `Saved environment profile ${selectedEnvironmentProfileName()}.`;
}

async function setDefaultEnvironmentProfile() {
  const profileName = selectedEnvironmentProfileName() || els.envProfileSelect.value.trim();
  if (!profileName) {
    els.codexSessionStatus.textContent = "Environment profile name is required.";
    return;
  }
  const payload = await api("/api/env/profiles/default", {
    method: "POST",
    body: {
      context: els.envContextSelect.value,
      name: profileName,
    },
  });
  state.envProfiles = payload?.profiles || state.envProfiles;
  renderEnvironmentProfileSelect();
  els.codexSessionStatus.textContent = `Default environment profile set to ${profileName}.`;
}

async function launchEnvironmentFromPanel() {
  const payload = await api("/api/env/up", {
    method: "POST",
    body: buildEnvironmentRequestFromForm(),
  });
  applyEnvironmentStatusPayload(payload);
  els.codexSessionStatus.textContent = `Environment launched: ${payload?.environment?.summary || els.envContextSelect.value}.`;
  setCommandResult(JSON.stringify(payload, null, 2));
}

async function planEnvironmentFromPanel() {
  const payload = await api("/api/env/up", {
    method: "POST",
    body: buildEnvironmentRequestFromForm({
      dryRun: true,
    }),
  });
  if (els.envPreview) {
    const lines = [
      `Plan: ${payload?.summary || "(none)"}`,
      `Context: ${payload?.request?.context || els.envContextSelect.value}`,
      `Project: ${payload?.request?.project || "(default)"}`,
      `Prep: ${payload?.request?.prep || els.envPrepSelect.value}`,
      `Panel: ${payload?.request?.panelMode || els.envPanelModeSelect.value}`,
      `Dev: ${payload?.request?.devMode || els.envDevModeSelect.value}`,
      `Remote: ${payload?.request?.remoteMode || els.envRemoteModeSelect.value}`,
      `Relay: ${payload?.request?.relayEnabled ? "on" : "off"}`,
      `Session: ${payload?.request?.sessionName || "codex-chat"}`,
    ];
    if (payload?.tunnel) {
      lines.push("");
      lines.push(`Tunnel Requested: ${payload.tunnel.requestedMode || "(none)"}`);
      lines.push(`Tunnel Effective: ${payload.tunnel.effectiveMode || "(none)"}`);
      lines.push(`Public Host: ${payload.tunnel.publicHost || "(none)"}`);
      lines.push(`Named Configured: ${payload.tunnel.namedTunnelConfigured ? "yes" : "no"}`);
      lines.push(`Redirect Automation: ${payload.tunnel.remoteRedirectAvailable ? "yes" : "no"}`);
    }
    els.envPreview.value = lines.join("\n");
  }
  els.codexSessionStatus.textContent = payload?.summary || "Environment plan ready.";
  setCommandResult(JSON.stringify(payload, null, 2));
}

function selectedLaunchRun() {
  const selectedId = String(els.launchRunSelect?.value || "").trim();
  return state.launchRuns.find((entry) => entry.id === selectedId) || null;
}

function renderLaunchRunPlanPreview(payload) {
  if (!els.launchRunPreview) {
    return;
  }
  const lines = [
    `Plan: ${payload?.summary || "(none)"}`,
    `Kind: ${payload?.kind || payload?.run?.kind || "(unknown)"}`,
  ];
  const request = payload?.request && typeof payload.request === "object"
    ? payload.request
    : payload?.run?.request && typeof payload.run.request === "object"
      ? payload.run.request
      : null;
  if (request) {
    for (const [key, value] of Object.entries(request)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }
      lines.push(`${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`);
    }
  }
  if (payload?.tunnel) {
    lines.push(`tunnel.requestedMode: ${payload.tunnel.requestedMode || "(none)"}`);
    lines.push(`tunnel.effectiveMode: ${payload.tunnel.effectiveMode || "(none)"}`);
    lines.push(`tunnel.publicHost: ${payload.tunnel.publicHost || "(none)"}`);
  }
  els.launchRunPreview.value = lines.join("\n");
}

async function planSelectedRun() {
  const run = selectedLaunchRun();
  if (!run?.id) {
    els.codexSessionStatus.textContent = "Select a run first.";
    return;
  }
  const payload = await api("/api/runs/relaunch", {
    method: "POST",
    body: {
      runId: run.id,
      dryRun: true,
    },
  });
  renderLaunchRunPlanPreview(payload);
  els.codexSessionStatus.textContent = payload?.summary || `Run plan ready: ${run.summary || run.id}`;
  setCommandResult(JSON.stringify(payload, null, 2));
}

async function relaunchSelectedRun() {
  const run = selectedLaunchRun();
  if (!run?.id) {
    els.codexSessionStatus.textContent = "Select a run first.";
    return;
  }
  const payload = await api("/api/runs/relaunch", {
    method: "POST",
    body: {
      runId: run.id,
      dryRun: false,
    },
  });
  if (payload?.environment || payload?.runtime || payload?.profiles) {
    applyEnvironmentStatusPayload(payload);
  }
  if (payload?.agentProfiles) {
    applyAgentProfilesPayload(payload.agentProfiles);
  }
  if (payload?.registry) {
    applyCodexSessionsPayload(payload);
  }
  if (Array.isArray(payload?.runs)) {
    state.launchRuns = payload.runs;
    renderLaunchRuns();
  } else {
    await refreshLaunchRuns().catch(() => null);
  }
  if (payload?.relay?.activeRelay || payload?.relay?.activeRelays) {
    setRelayState(payload.relay.activeRelay || null, payload.relay.activeRelays || []);
    renderRelayStatus();
    renderTopStatus();
  }
  if (payload?.created?.name) {
    els.codexSessionName.value = payload.created.name;
    els.codexSessionTarget.value = payload.created.target || payload.created.threadId || "";
  }
  els.codexSessionStatus.textContent = `Run relaunched: ${payload?.run?.summary || run.summary || run.id}`;
  setCommandResult(JSON.stringify(payload, null, 2));
}

async function shutdownEnvironmentFromPanel() {
  const payload = await api("/api/env/down", {
    method: "POST",
    body: {
      stopPanel: false,
    },
  });
  state.activeEnvironment = null;
  state.activeDev = null;
  setRelayState(null, []);
  state.activeTunnel = null;
  state.envRuntime = payload?.runtime || state.envRuntime;
  renderEnvironmentSummary();
  renderRelayStatus();
  renderTunnelStatus();
  renderTopStatus();
  els.codexSessionStatus.textContent = "Environment services stopped.";
  setCommandResult(JSON.stringify(payload, null, 2));
}

function agentProfilesForLookup() {
  return Array.isArray(state.agentProfiles) ? state.agentProfiles : [];
}

function agentDefaultProfileName(project = "") {
  const registry = state.agentProfileRegistry || {};
  const defaults = registry.defaults && typeof registry.defaults === "object" ? registry.defaults : {};
  const perProject = defaults.perProject && typeof defaults.perProject === "object" ? defaults.perProject : {};
  return String((project && perProject[project]) || defaults.global || "").trim();
}

function renderAgentProfileSummary() {
  if (!els.agentProfilePreview) {
    return;
  }
  const registry = state.agentProfileRegistry;
  if (!registry) {
    els.agentProfilePreview.value = "No agent profile registry loaded.";
    return;
  }

  const lines = [];
  const selectedName = String(els.agentProfileSelect?.value || "").trim();
  const selected = agentProfilesForLookup().find((entry) => entry.name === selectedName) || null;
  if (selected) {
    lines.push(`Selected: ${selected.name}`);
    lines.push(`Kind: ${selected.agentKind || "super"}`);
    lines.push(`Project: ${selected.project || "(default)"}`);
    lines.push(`Mode: ${selected.mode || "quick"}`);
    lines.push(`Model: ${selected.model || "(default)"}`);
    lines.push(`Codex Profile: ${selected.codexProfile || "(none)"}`);
    lines.push(`Session Alias: ${selected.sessionName || "(auto)"}`);
    lines.push(`Run Prep: ${selected.runPrep ? "on" : "off"}`);
    lines.push(`Start Relay: ${selected.startRelay ? "on" : "off"}`);
    lines.push(`Default Session: ${selected.makeDefaultSession ? "on" : "off"}`);
    if (selected.notes) {
      lines.push(`Notes: ${selected.notes}`);
    }
    lines.push("");
  }
  lines.push(`Global default: ${registry?.defaults?.global || "(none)"}`);
  const perProject = registry?.defaults?.perProject || {};
  const entries = Object.entries(perProject);
  if (entries.length) {
    lines.push("Per-project defaults:");
    for (const [project, profileName] of entries) {
      lines.push(`- ${project} -> ${profileName}`);
    }
  } else {
    lines.push("Per-project defaults: (none)");
  }
  lines.push("");
  lines.push("Profiles:");
  for (const profile of agentProfilesForLookup()) {
    const parts = [
      profile.name,
      `[${profile.mode || "quick"}]`,
      profile.project ? `project=${profile.project}` : "",
      profile.model ? `model=${profile.model}` : "",
      profile.codexProfile ? `profile=${profile.codexProfile}` : "",
      profile.retired ? "retired" : "",
    ].filter(Boolean);
    lines.push(`- ${parts.join(" ")}`);
  }
  els.agentProfilePreview.value = lines.join("\n");
}

function fillAgentProfileFormFromSelection() {
  const selectedName = String(els.agentProfileSelect?.value || "").trim();
  const selected = agentProfilesForLookup().find((entry) => entry.name === selectedName);
  if (!selected) {
    renderAgentProfileSummary();
    return;
  }
  if (els.agentProfileName) {
    els.agentProfileName.value = selected.name || "";
  }
  if (els.agentProfileProject) {
    els.agentProfileProject.value = selected.project || "";
  }
  if (els.agentProfileModeSelect) {
    els.agentProfileModeSelect.value = selected.mode || "quick";
  }
  if (els.agentProfileModel) {
    els.agentProfileModel.value = selected.model || "";
  }
  if (els.agentProfileCodexProfile) {
    els.agentProfileCodexProfile.value = selected.codexProfile || "";
  }
  if (els.agentProfileSessionName) {
    els.agentProfileSessionName.value = selected.sessionName || "";
  }
  if (els.agentProfileRunPrepSelect) {
    els.agentProfileRunPrepSelect.value = selected.runPrep ? "on" : "off";
  }
  if (els.agentProfileStartRelaySelect) {
    els.agentProfileStartRelaySelect.value = selected.startRelay ? "on" : "off";
  }
  if (els.agentProfileMakeDefaultSelect) {
    els.agentProfileMakeDefaultSelect.value = selected.makeDefaultSession ? "on" : "off";
  }
  if (els.agentProfileNotes) {
    els.agentProfileNotes.value = selected.notes || "";
  }
  if (!els.codexSessionProject.value && selected.project) {
    els.codexSessionProject.value = selected.project;
  }
  renderAgentProfileSummary();
  renderEnvironmentSummary();
}

function renderAgentProfileSelect() {
  if (!els.agentProfileSelect) {
    return;
  }
  const previous = String(els.agentProfileSelect.value || "").trim();
  els.agentProfileSelect.innerHTML = "";
  const profiles = agentProfilesForLookup();
  if (!profiles.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No agent profiles";
    els.agentProfileSelect.appendChild(option);
    renderAgentProfileSummary();
    return;
  }
  for (const profile of profiles) {
    const option = document.createElement("option");
    option.value = profile.name;
    option.textContent = `${profile.name}${profile.retired ? " (retired)" : ""}`;
    els.agentProfileSelect.appendChild(option);
  }
  const defaultName = agentDefaultProfileName(selectedAgentProject());
  const preferred = previous && profiles.some((entry) => entry.name === previous)
    ? previous
    : selectedAgentProfileName() && profiles.some((entry) => entry.name === selectedAgentProfileName())
      ? selectedAgentProfileName()
      : defaultName && profiles.some((entry) => entry.name === defaultName)
        ? defaultName
        : profiles[0].name;
  els.agentProfileSelect.value = preferred;
  fillAgentProfileFormFromSelection();
}

function applyAgentProfilesPayload(payload) {
  state.agentProfileRegistry = payload?.registry || state.agentProfileRegistry || null;
  const profiles = Array.isArray(payload?.profiles)
    ? payload.profiles
    : Array.isArray(payload?.registry?.profiles)
      ? payload.registry.profiles
      : [];
  state.agentProfiles = [...profiles].sort((left, right) => {
    const retiredDiff = Number(Boolean(left.retired)) - Number(Boolean(right.retired));
    if (retiredDiff !== 0) {
      return retiredDiff;
    }
    return String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""));
  });
  renderAgentProfileSelect();
}

async function refreshAgentProfiles() {
  const payload = await api("/api/agents/profiles");
  applyAgentProfilesPayload(payload);
  return payload;
}

function renderCodexRegistrySummary() {
  const registry = state.codexRegistry;
  if (!registry) {
    els.codexSessionPreview.value = "No session alias registry loaded.";
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
  lines.push("Session Aliases:");
  for (const session of state.codexSessions) {
    const hints = Array.isArray(session.projectHints) && session.projectHints.length
      ? ` [projects=${session.projectHints.join(", ")}]`
      : "";
    lines.push(`- ${session.name} -> ${session.target}${hints}${session.retired ? " [retired]" : ""}`);
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
  renderTerminalExecResumeButton();
}

function renderCodexSessionSelect() {
  const previous = els.codexSessionSelect.value;
  els.codexSessionSelect.innerHTML = "";
  if (!state.codexSessions.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No session aliases";
    els.codexSessionSelect.appendChild(option);
    renderCodexRegistrySummary();
    renderTerminalExecResumeButton();
    return;
  }
  for (const session of state.codexSessions) {
    const option = document.createElement("option");
    option.value = session.name;
    option.textContent = `${session.name}${session.retired ? " (retired)" : ""}`;
    els.codexSessionSelect.appendChild(option);
  }
  const defaultName = codexDefaultSessionName();
  const preferred = previous && state.codexSessions.some((entry) => entry.name === previous)
    ? previous
    : defaultName && state.codexSessions.some((entry) => entry.name === defaultName)
      ? defaultName
      : state.codexSessions[0].name;
  els.codexSessionSelect.value = preferred;
  fillCodexFormFromSelection();
  renderCodexRegistrySummary();
  renderChatRuntimeStrip();
  renderTerminalExecResumeButton();
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
  return payload;
}

async function launchCodexSessionFromPanel(options = {}) {
  const ensureRelay = Boolean(options.ensureRelay);
  const refreshChat = options.refreshChat !== false;
  const refreshHistory = Boolean(options.refreshHistory);
  const silent = Boolean(options.silent);
  const sessionName = codexSessionNameForTerminalSync();
  const target = codexSessionTargetForTerminalSync();
  await ensurePersistentTerminalChannel({
    autoStart: true,
    loadHistory: refreshHistory,
  }).catch(() => null);
  await syncCodexTerminalSession({
    minGapMs: 0,
    silent: true,
    force: true,
  }).catch(() => null);
  if (ensureRelay && sessionName && !findRelayBySessionName(sessionName)) {
    await startRelayWatcher().catch(() => null);
  } else {
    await refreshRelayStatus().catch(() => null);
  }
  if (refreshChat) {
    await refreshChatHistory().catch(() => null);
  }
  if (!silent) {
    els.codexSessionStatus.textContent = target
      ? `Session launched for thread ${target}.`
      : `Session launched (${sessionName || "codex-chat"}).`;
  }
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
  await launchCodexSessionFromPanel({
    ensureRelay: false,
    silent: true,
    refreshChat: false,
  });
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
      agentProfileName: selectedAgentProfileName(),
      codexProfile: els.agentProfileCodexProfile?.value.trim() || "",
      notes: els.codexSessionNotes.value.trim(),
    },
  });
  if (payload?.agentProfiles) {
    applyAgentProfilesPayload(payload.agentProfiles);
  }
  applyCodexSessionsPayload(payload);
  if (Array.isArray(payload?.runs)) {
    state.launchRuns = payload.runs;
    renderLaunchRuns();
  }
  if (els.codexSessionSelect && state.codexSessions.some((entry) => entry.name === name)) {
    els.codexSessionSelect.value = name;
    fillCodexFormFromSelection();
  } else {
    els.codexSessionTarget.value = payload?.created?.target || "";
  }
  els.codexSessionStatus.textContent = `Created session ${name}.`;
  renderTerminalExecResumeButton();
  await launchCodexSessionFromPanel({
    ensureRelay: true,
    silent: true,
    refreshChat: true,
    refreshHistory: true,
  });
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
  await launchCodexSessionFromPanel({
    ensureRelay: false,
    silent: true,
    refreshChat: false,
  });
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
  await launchCodexSessionFromPanel({
    ensureRelay: false,
    silent: true,
    refreshChat: false,
  });
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

async function saveAgentProfile() {
  const name = selectedAgentProfileName();
  if (!name) {
    els.codexSessionStatus.textContent = "Agent profile name is required.";
    return;
  }
  const payload = await api("/api/agents/profiles/upsert", {
    method: "POST",
    body: {
      name,
      agentKind: "super",
      project: selectedAgentProject(),
      mode: els.agentProfileModeSelect?.value || "quick",
      model: els.agentProfileModel?.value.trim() || "",
      codexProfile: els.agentProfileCodexProfile?.value.trim() || "",
      sessionName: els.agentProfileSessionName?.value.trim() || "",
      runPrep: els.agentProfileRunPrepSelect?.value !== "off",
      startRelay: els.agentProfileStartRelaySelect?.value !== "off",
      makeDefaultSession: els.agentProfileMakeDefaultSelect?.value !== "off",
      notes: els.agentProfileNotes?.value.trim() || "",
    },
  });
  applyAgentProfilesPayload(payload);
  els.codexSessionStatus.textContent = `Saved agent profile ${name}.`;
}

async function setDefaultAgentProfile() {
  const name = selectedAgentProfileName();
  if (!name) {
    els.codexSessionStatus.textContent = "Agent profile name is required.";
    return;
  }
  const payload = await api("/api/agents/profiles/default", {
    method: "POST",
    body: {
      name,
      project: selectedAgentProject(),
    },
  });
  applyAgentProfilesPayload(payload);
  els.codexSessionStatus.textContent = `Default agent profile set to ${name}${selectedAgentProject() ? ` for ${selectedAgentProject()}` : " (global)"}.`;
}

async function retireAgentProfile() {
  const name = selectedAgentProfileName();
  if (!name) {
    els.codexSessionStatus.textContent = "Agent profile name is required.";
    return;
  }
  const payload = await api("/api/agents/profiles/retire", {
    method: "POST",
    body: { name },
  });
  applyAgentProfilesPayload(payload);
  els.codexSessionStatus.textContent = `Retired agent profile ${name}.`;
}

async function spawnAgentFromProfile(options = {}) {
  const dryRun = Boolean(options.dryRun);
  const project = selectedAgentProject();
  const sessionName = els.agentProfileSessionName?.value.trim() || suggestedSuperAgentSessionName(project);
  const mode = String(els.agentProfileModeSelect?.value || "quick").trim().toLowerCase();
  const action = dryRun ? "Planning" : "Spawning";
  els.codexSessionStatus.textContent = `${action} agent (${mode})${project ? ` for ${project}` : ""}...`;

  const payload = await api("/api/codex/sessions/super-agent/spawn", {
    method: "POST",
    body: {
      dryRun,
      agentProfileName: selectedAgentProfileName(),
      project,
      name: sessionName,
      mode,
      model: els.agentProfileModel?.value.trim() || "",
      codexProfile: els.agentProfileCodexProfile?.value.trim() || "",
      notes: els.agentProfileNotes?.value.trim() || "",
      makeDefault: els.agentProfileMakeDefaultSelect?.value !== "off",
      runPrep: els.agentProfileRunPrepSelect?.value !== "off",
      startRelay: els.agentProfileStartRelaySelect?.value !== "off",
    },
  });

  if (payload?.agentProfiles) {
    applyAgentProfilesPayload(payload.agentProfiles);
  }
  if (dryRun) {
    els.codexSessionStatus.textContent = payload?.summary || "Agent launch plan ready.";
    if (els.agentProfilePreview) {
      const lines = [
        `Plan: ${payload?.summary || "(none)"}`,
        `Profile: ${payload?.request?.agentProfileName || selectedAgentProfileName() || "(none)"}`,
        `Project: ${payload?.request?.project || project || "(default)"}`,
        `Mode: ${payload?.request?.mode || mode}`,
        `Session: ${payload?.request?.name || sessionName}`,
        `Model: ${payload?.request?.model || "(default)"}`,
        `Codex Profile: ${payload?.request?.codexProfile || "(none)"}`,
        `Run Prep: ${payload?.request?.runPrep ? "on" : "off"}`,
        `Start Relay: ${payload?.request?.startRelay ? "on" : "off"}`,
      ];
      els.agentProfilePreview.value = lines.join("\n");
    }
    setCommandResult(JSON.stringify(payload, null, 2));
    return;
  }

  applyCodexSessionsPayload(payload);
  if (Array.isArray(payload?.runs)) {
    state.launchRuns = payload.runs;
    renderLaunchRuns();
  }
  if (payload?.created?.name) {
    els.codexSessionName.value = payload.created.name;
    els.codexSessionTarget.value = payload.created.target || payload.created.threadId || "";
    if (els.codexSessionSelect && state.codexSessions.some((entry) => entry.name === payload.created.name)) {
      els.codexSessionSelect.value = payload.created.name;
      fillCodexFormFromSelection();
    }
  }

  if (payload?.relay?.error) {
    els.codexSessionStatus.textContent = `Agent created (${payload?.created?.name || sessionName}) but relay failed: ${payload.relay.error}`;
  } else {
    els.codexSessionStatus.textContent = `Agent ready: ${payload?.created?.name || sessionName}`;
  }

  if (payload?.relay?.activeRelay || payload?.relay?.activeRelays) {
    setRelayState(payload.relay.activeRelay || null, payload.relay.activeRelays || []);
    renderRelayStatus();
    renderTopStatus();
  }
  renderTerminalExecResumeButton();
  setCommandResult(JSON.stringify(payload, null, 2));
  await launchCodexSessionFromPanel({
    ensureRelay: true,
    silent: true,
    refreshChat: true,
    refreshHistory: true,
  });
}

async function refreshRelayStatus() {
  const payload = await api("/api/relay/status");
  setRelayState(payload.activeRelay || null, payload.activeRelays || []);
  state.activeTunnel = payload.activeTunnel || state.activeTunnel || null;
  renderRelayStatus();
  renderTunnelStatus();
  renderTopStatus();
}

async function startRelayWatcher() {
  const sessionName = codexSessionNameForTerminalSync();
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
  setRelayState(payload.activeRelay || payload.startedRelay || null, payload.activeRelays || []);
  renderRelayStatus();
  renderTopStatus();
  els.codexSessionStatus.textContent = `Relay watcher started (${sessionName}). Active: ${relayCount()}.`;
  setCommandResult(JSON.stringify(payload, null, 2));
}

async function stopRelayWatcher() {
  const sessionName = selectedRelaySessionName();
  const selectedRunning = Boolean(findRelayBySessionName(sessionName));
  const stopTarget = selectedRunning ? sessionName : "";
  els.codexSessionStatus.textContent = stopTarget ? `Stopping relay watcher (${stopTarget})...` : "Stopping relay watcher...";
  const payload = await api("/api/relay/stop", {
    method: "POST",
    body: stopTarget ? { sessionName: stopTarget } : {},
  });
  setRelayState(payload.activeRelay || null, payload.activeRelays || []);
  renderRelayStatus();
  renderTopStatus();
  els.codexSessionStatus.textContent = payload.stopped
    ? `Relay watcher stop requested${stopTarget ? ` (${stopTarget})` : ""}. Active: ${relayCount()}.`
    : "Relay watcher was not running.";
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
  if (helpTunnel?.active && (helpTunnel?.url || helpTunnel?.publicUrl)) {
    state.activeTunnel = {
      provider: String(helpTunnel.provider || state.activeTunnel?.provider || ""),
      mode: normalizeTunnelMode(helpTunnel.mode || state.activeTunnel?.mode || state.preferredTunnelMode, "quick"),
      requestedMode: normalizeTunnelMode(
        helpTunnel.requestedMode || state.activeTunnel?.requestedMode || helpTunnel.mode || state.preferredTunnelMode,
        "quick"
      ),
      url: String(helpTunnel.url || ""),
      publicUrl: String(helpTunnel.publicUrl || state.activeTunnel?.publicUrl || ""),
      publicHost: String(helpTunnel.publicHost || state.activeTunnel?.publicHost || ""),
      verification: helpTunnel.verification || state.activeTunnel?.verification || null,
      pid: Number.parseInt(String(helpTunnel.pid || state.activeTunnel?.pid || 0), 10) || 0,
      startedAt: String(helpTunnel.startedAt || state.activeTunnel?.startedAt || ""),
    };
  } else if (!state.activeTunnel?.url && !state.activeTunnel?.publicUrl) {
    state.activeTunnel = null;
  }
  state.preferredTunnelMode = normalizeTunnelMode(
    helpTunnel?.configuredMode
      || helpTunnel?.requestedMode
      || helpTunnel?.mode
      || state.activeTunnel?.requestedMode
      || state.activeTunnel?.mode
      || state.preferredTunnelMode,
    "quick"
  );
  const isHttpsRequired = Boolean(help?.panel?.requireHttps);
  const securityMode = String(help?.panel?.securityMode || "");
  const host = String(help?.panel?.host || "");
  const bindLabel = host === "0.0.0.0" ? "LAN bind active" : "Local bind only";
  const security = String(help?.security?.label || (isHttpsRequired ? "HTTPS required" : "HTTP allowed"));
  const activeTunnelUrl = String(
    state.activeTunnel?.publicUrl
      || state.activeTunnel?.url
      || helpTunnel?.publicUrl
      || helpTunnel?.url
      || ""
  ).trim();
  let mobile = activeTunnelUrl || String(help?.guidance?.recommendedMobileUrl || "");
  if (!mobile) {
    mobile = isHttpsRequired ? "(HTTPS tunnel URL required)" : "(No LAN URL available)";
  }
  els.connectionMode.textContent = `${bindLabel} | ${security}`;
  els.connectionMode.title = `Connection mode: ${els.connectionMode.textContent}`;
  els.mobileUrlText.value = mobile;
  els.mobileUrlText.title = `Recommended mobile URL: ${mobile}`;
  if (els.envLocalUrlText) {
    els.envLocalUrlText.value = String(help?.urls?.local || "").trim();
  }
  if (els.envRemoteUrlText) {
    els.envRemoteUrlText.value = mobile.startsWith("(") ? "" : mobile;
  }
  els.connectionAdvice.textContent = String(help?.guidance?.action || "")
    || (activeTunnelUrl ? `External tunnel live: ${activeTunnelUrl}` : "");
  els.connectionAdvice.title = `Connection guidance: ${els.connectionAdvice.textContent}`;
  els.enableHttpsBtn.disabled = securityMode === "on";
  els.useAdaptiveSecurityBtn.disabled = securityMode === "auto";
  renderTunnelStatus();
  renderEnvironmentSummary();
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
  state.preferredTunnelProvider = normalizeTunnelProvider(
    payload.provider || state.activeTunnel?.provider || state.preferredTunnelProvider,
    "cloudflared"
  );
  state.preferredTunnelMode = normalizeTunnelMode(
    payload.mode || state.activeTunnel?.requestedMode || state.activeTunnel?.mode || state.preferredTunnelMode,
    "quick"
  );
  if (payload?.help) {
    state.connectionHelp = payload.help;
  }
  renderConnectionHelp();
}

async function startTunnel() {
  const provider = currentTunnelProvider();
  const mode = currentTunnelMode();
  els.connectionAdvice.textContent = `Starting external remote access (${provider}, ${mode})...`;
  const payload = await api("/api/tunnel/start", {
    method: "POST",
    body: {
      provider,
      mode,
      publicHost: els.envPublicHost?.value.trim() || "",
    },
  });
  state.activeTunnel = payload.activeTunnel || null;
  state.preferredTunnelProvider = normalizeTunnelProvider(
    payload.provider || state.activeTunnel?.provider || state.preferredTunnelProvider,
    "cloudflared"
  );
  state.preferredTunnelMode = normalizeTunnelMode(
    payload.mode || state.activeTunnel?.requestedMode || state.activeTunnel?.mode || state.preferredTunnelMode,
    "quick"
  );
  if (payload?.help) {
    state.connectionHelp = payload.help;
  }
  renderConnectionHelp();
  const liveTunnelUrl = state.activeTunnel?.publicUrl || state.activeTunnel?.url || "";
  if (liveTunnelUrl) {
    els.connectionAdvice.textContent = `Remote access live (${state.preferredTunnelProvider}, ${state.preferredTunnelMode}): ${liveTunnelUrl}`;
  } else {
    els.connectionAdvice.textContent = `Remote access started (${state.preferredTunnelProvider}, ${state.preferredTunnelMode}).`;
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
    els.navTerminalBtn,
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
    els.envRefreshBtn,
    els.envSaveProfileBtn,
    els.envSetDefaultBtn,
    els.envPlanBtn,
    els.envLaunchBtn,
    els.envShutdownBtn,
    els.agentProfileRefreshBtn,
    els.agentProfileSaveBtn,
    els.agentProfileSetDefaultBtn,
    els.agentProfileRetireBtn,
    els.agentProfilePlanBtn,
    els.agentProfileSpawnBtn,
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
    els.launchRunRefreshBtn,
    els.launchRunPlanBtn,
    els.launchRunRelaunchBtn,
    els.refreshConnectionHelpBtn,
    els.copyMobileUrlBtn,
    els.tunnelStartBtn,
    els.tunnelStopBtn,
    els.tunnelRefreshBtn,
    els.openTunnelUrlBtn,
    els.enableHttpsBtn,
    els.useAdaptiveSecurityBtn,
    els.terminalRefreshBtn,
    els.terminalStartBtn,
    els.terminalReattachBtn,
    els.terminalInterruptBtn,
    els.terminalStopBtn,
    els.terminalClearBtn,
    els.promptModeLiveBtn,
    els.promptModeQueueBtn,
    els.promptModeStopBtn,
    els.terminalCommandSendBtn,
    els.terminalSendQueueBtn,
    els.terminalQueueFlushBtn,
    els.terminalTransactionModeBtn,
    els.terminalGapRecoverBtn,
    els.terminalToolsToggleBtn,
    els.terminalFocusInputBtn,
    els.terminalPanelToggleBtn,
    els.terminalSearchPrevBtn,
    els.terminalSearchNextBtn,
    els.terminalSearchClearBtn,
    els.terminalTextModeBtn,
    els.terminalCopyTextBtn,
    els.terminalSelectDockBtn,
    els.terminalQueueModeBtn,
    els.terminalDockTransactionModeBtn,
    els.terminalDockMoreBtn,
    els.terminalDockSendBtn,
    els.terminalDockQueueBtn,
  ];
  for (const button of buttons) {
    if (!button) {
      continue;
    }
    button.disabled = disabled;
  }
  if (els.terminalCommandInput) {
    els.terminalCommandInput.disabled = disabled;
  }
  if (els.terminalSearchInput) {
    els.terminalSearchInput.disabled = disabled;
  }
  if (els.terminalDirectInputProxy) {
    els.terminalDirectInputProxy.disabled = disabled || state.terminalSelectMode;
  }
  if (els.terminalDockInput) {
    els.terminalDockInput.disabled = disabled;
  }
  const terminalDeckButtons = document.querySelectorAll(
    "[data-terminal-command], [data-terminal-sequence], [data-terminal-key], [data-terminal-text], [data-terminal-mod], [data-terminal-action], [data-terminal-soft-enter]"
  );
  for (const button of terminalDeckButtons) {
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
    renderTerminalControls();
    renderTerminalModifierButtons();
    renderTerminalCommandQueue();
    renderTerminalQueueMode();
  }
}

async function refreshSessionMeta() {
  const session = await api("/api/session");
  const nextBootToken = String(session.panelBootToken || session.bootToken || "").trim();
  if (nextBootToken) {
    if (state.panelBootToken && state.panelBootToken !== nextBootToken && !state.panelBootTokenReloaded) {
      state.panelBootTokenReloaded = true;
      setStatusLine("Panel restarted. Reloading...", "ok");
      window.setTimeout(() => {
        window.location.reload();
      }, 60);
      return;
    }
    state.panelBootToken = nextBootToken;
  }
  state.csrfToken = session.csrfToken;
  state.activeEnvironment = session.activeEnvironment || state.activeEnvironment || null;
  state.commandRunning = Boolean(session.commandRunning);
  state.activeDev = session.activeDev || null;
  setRelayState(session.activeRelay || null, session.activeRelays || []);
  state.activeTunnel = session.activeTunnel || null;
  state.previewRefreshMs = session.previewRefreshMs || 3000;
  if (els.envStatusText) {
    els.envStatusText.value = state.activeEnvironment?.summary || "environment idle";
  }
  renderRelayStatus();
  renderTunnelStatus();
  renderTopStatus();
}

async function refreshSessionData() {
  await refreshSessionMeta();

  try {
    const projectsPayload = await api("/api/projects");
    state.projects = projectsPayload.projects || [];
    state.activeProject = projectsPayload.activeProject || state.projects[0]?.slug || "";
  } catch {
    if (!Array.isArray(state.projects)) {
      state.projects = [];
    }
  }

  try {
    const manifestsPayload = await api("/api/manifests");
    state.manifests = manifestsPayload.manifests || [];
    renderManifests();
  } catch {
    if (!Array.isArray(state.manifests)) {
      state.manifests = [];
    }
  }

  if (!els.codexSessionProject.value) {
    els.codexSessionProject.value = selectedEnvironmentProject() || state.activeProject || "";
  }
  if (!els.agentProfileProject.value) {
    els.agentProfileProject.value = selectedEnvironmentProject() || state.activeProject || "";
  }
  if (!els.envProject.value) {
    els.envProject.value = state.activeProject || "";
  }
  if (!els.refreshMsInput.value) {
    els.refreshMsInput.value = String(state.previewRefreshMs);
  }

  await refreshConnectionHelp().catch(() => null);
  await refreshEnvironmentStatus().catch(() => null);
  await refreshAgentProfiles().catch(() => null);
  await refreshCodexSessions().catch(() => null);
  await refreshLaunchRuns().catch(() => null);
  await refreshChatHistory().catch(() => null);
  await refreshActivityFeed().catch(() => null);
  await refreshTerminalStatus({ silent: true }).catch(() => null);
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
    if (state.wsConnected) {
      return;
    }
    refreshActivityFeed().catch(() => null);
  }, 10000);

  state.metaTimer = window.setInterval(() => {
    if (els.appView.hidden) return;
    if (!state.wsConnected || !state.ws || state.ws.readyState !== WebSocket.OPEN) {
      connectChatSocket();
    }
    if (!state.terminalSocketConnected || !state.terminalSocket || state.terminalSocket.readyState !== WebSocket.OPEN) {
      ensurePersistentTerminalChannel({
        autoStart: true,
        loadHistory: false,
      }).catch(() => null);
    } else {
      sendTerminalWsMessage({ type: "terminal:status" });
    }
    refreshSessionMeta().catch(() => null);
    refreshTerminalStatus({ silent: true }).catch(() => null);
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
    if (typeof payload.csrfToken !== "string" || !payload.csrfToken) {
      throw new Error("Login succeeded but no CSRF token was returned by the panel.");
    }
    state.csrfToken = payload.csrfToken;
    els.password.value = "";
    await refreshSessionData();
    setLoggedIn(true);
    connectChatSocket();
    restartAutoRefresh();
    startPolling();
    ensurePersistentTerminalChannel({
      autoStart: true,
      loadHistory: false,
    }).catch(() => null);
  } catch (error) {
    closeTerminalSocket();
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
  clearTerminalArrowRepeat({ suppressClick: false });
  state.terminalCommandQueue = [];
  setTerminalQueueMode(false, { announce: false });
  setTerminalTransactionMode(false, { announce: false });
  clearTerminalSearch();
  clearTerminalSequenceGap({ silent: true });
  setTerminalDockExpanded(false);
  endTerminalTouchScroll();
  if (state.terminalSearchRefreshTimer) {
    window.clearTimeout(state.terminalSearchRefreshTimer);
    state.terminalSearchRefreshTimer = null;
  }
  setTerminalMobileKeyboardOpen(false);
  state.terminalDockFocusLockUntil = 0;
  state.terminalTouchActionHandledUntil = 0;
  state.terminalTouchActionHandledButton = null;
  if (state.terminalProxyRefocusTimer) {
    window.clearTimeout(state.terminalProxyRefocusTimer);
    state.terminalProxyRefocusTimer = null;
  }
  state.terminalProxyInputMode = false;
  state.terminalDirectInputLastValue = "";
  state.terminalDirectInputLiveValue = "";
  state.terminalDirectInputNeedsCommit = false;
  state.terminalDirectInputCommitAt = 0;
  state.terminalLastInputChunk = "";
  state.terminalLastInputAt = 0;
  state.terminalLastResumeKey = "";
  state.terminalLastOutputSeq = 0;
  clearTerminalResumeWatchdog();
  state.terminalResumeRequestedSince = 0;
  state.terminalResumeAckAt = 0;
  state.terminalResumeFallbackStep = 0;
  state.terminalDomWriteErrorCount = 0;
  state.chatHistoryRefreshPending = false;
  state.terminalHistoryRefreshPending = false;
  state.previewFramePendingSince = 0;
  applyTerminalInputMode();
  clearTerminalModifiers();
  closeChatSocket();
  closeTerminalSocket();
  disposeTerminalInstance({ preserveMount: false });
  state.terminalCols = 0;
  state.terminalRows = 0;
  clearTerminalFitTimer();
  state.terminalAutoReconnect = false;
  state.terminalStatus = null;
  state.activeEnvironment = null;
  state.envProfiles = null;
  state.envRuntime = null;
  state.agentProfileRegistry = null;
  state.agentProfiles = [];
  state.launchRuns = [];
  setRelayState(null, []);
  stopPolling();
  if (state.autoRefreshTimer) {
    clearInterval(state.autoRefreshTimer);
    state.autoRefreshTimer = null;
  }
  setLoggedIn(false);
  renderPromptModeControls();
  renderTerminalCommandQueue();
  renderTerminalControls("Disconnected.");
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
    ensurePersistentTerminalChannel({
      autoStart: true,
      loadHistory: false,
    }).catch(() => null);
  } catch {
    closeTerminalSocket();
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
  els.navTerminalBtn.addEventListener("click", () => setActiveUtilityPanel("terminal"));
  els.navOutputBtn.addEventListener("click", () => setActiveUtilityPanel("output"));
  if (els.navTogglePanelsBtn) {
    els.navTogglePanelsBtn.addEventListener("click", () => {
      setUtilityCollapsed(!state.utilityCollapsed);
    });
  }
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
  if (els.chatPreviewBtn) {
    els.chatPreviewBtn.addEventListener("click", () => {
      if (state.mobileNavOpen) {
        setMobileNavOpen(false);
      }
      if (state.utilityCollapsed) {
        setActiveUtilityPanel(state.activeUtilityPanel || "preview", { expand: true });
        return;
      }
      setUtilityCollapsed(true);
    });
  }
  if (els.statusDotBar) {
    const resolveDotButton = (event) => event.target instanceof HTMLElement ? event.target.closest("[data-status-dot]") : null;
    const showForButton = (button) => {
      const key = String(button?.getAttribute("data-status-dot") || "").trim().toLowerCase();
      const item = statusDotItemForKey(key);
      if (!item) {
        return;
      }
      showStatusDotPopover(button, item);
      renderStatusDotBar(state.statusDotChecks);
    };
    els.statusDotBar.addEventListener("click", (event) => {
      const button = resolveDotButton(event);
      if (!button) {
        return;
      }
      const key = String(button.getAttribute("data-status-dot") || "").trim().toLowerCase();
      const panel = utilityPanelForStatusDot(key);
      if (panel) {
        setActiveUtilityPanel(panel, { expand: true });
      }
      showForButton(button);
    });
    els.statusDotBar.addEventListener("mouseover", (event) => {
      if (isTouchFirstDevice()) {
        return;
      }
      const button = resolveDotButton(event);
      if (!button) {
        return;
      }
      showForButton(button);
    });
    els.statusDotBar.addEventListener("focusin", (event) => {
      const button = resolveDotButton(event);
      if (!button) {
        return;
      }
      showForButton(button);
    });
  }

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
  els.previewFrame.addEventListener("load", () => {
    clearPreviewFrameLoading();
  });
  els.previewFrame.addEventListener("error", () => {
    clearPreviewFrameLoading();
  });
  els.autoRefreshToggle.addEventListener("change", restartAutoRefresh);
  els.refreshMsInput.addEventListener("change", restartAutoRefresh);

  els.activityRefreshBtn.addEventListener("click", async () => {
    await refreshActivityFeed().catch((error) => {
      els.activityStatus.textContent = `Error: ${error.message}`;
    });
  });

  if (els.envProfileSelect) {
    els.envProfileSelect.addEventListener("change", () => {
      fillEnvironmentFormFromSelection();
    });
  }
  if (els.envContextSelect) {
    els.envContextSelect.addEventListener("change", () => {
      renderEnvironmentProfileSelect();
      renderEnvironmentSummary();
    });
  }
  if (els.envProject) {
    els.envProject.addEventListener("input", () => {
      renderEnvironmentSummary();
      if (!els.agentProfileProject.value) {
        els.agentProfileProject.value = els.envProject.value.trim();
        renderAgentProfileSummary();
      }
      if (!els.codexSessionProject.value) {
        els.codexSessionProject.value = els.envProject.value.trim();
      }
    });
  }
  if (els.envPrepSelect) {
    els.envPrepSelect.addEventListener("change", renderEnvironmentSummary);
  }
  if (els.envPanelModeSelect) {
    els.envPanelModeSelect.addEventListener("change", renderEnvironmentSummary);
  }
  if (els.envDevModeSelect) {
    els.envDevModeSelect.addEventListener("change", renderEnvironmentSummary);
  }
  if (els.envRemoteModeSelect) {
    els.envRemoteModeSelect.addEventListener("change", renderEnvironmentSummary);
  }
  if (els.envPublicHost) {
    els.envPublicHost.addEventListener("input", renderEnvironmentSummary);
  }
  if (els.envRelaySelect) {
    els.envRelaySelect.addEventListener("change", renderEnvironmentSummary);
  }
  if (els.envSessionName) {
    els.envSessionName.addEventListener("input", renderEnvironmentSummary);
  }
  if (els.envRefreshBtn) {
    els.envRefreshBtn.addEventListener("click", () => refreshEnvironmentStatus().then(() => {
      els.codexSessionStatus.textContent = "Environment status refreshed.";
    }).catch((error) => {
      els.codexSessionStatus.textContent = `Error: ${error.message}`;
      setCommandResult(error.message, true);
    }));
  }
  if (els.envSaveProfileBtn) {
    els.envSaveProfileBtn.addEventListener("click", () => saveEnvironmentProfile().catch((error) => {
      els.codexSessionStatus.textContent = `Error: ${error.message}`;
      setCommandResult(error.message, true);
    }));
  }
  if (els.envSetDefaultBtn) {
    els.envSetDefaultBtn.addEventListener("click", () => setDefaultEnvironmentProfile().catch((error) => {
      els.codexSessionStatus.textContent = `Error: ${error.message}`;
      setCommandResult(error.message, true);
    }));
  }
  if (els.envPlanBtn) {
    els.envPlanBtn.addEventListener("click", () => planEnvironmentFromPanel().catch((error) => {
      els.codexSessionStatus.textContent = `Error: ${error.message}`;
      setCommandResult(error.message, true);
    }));
  }
  if (els.envLaunchBtn) {
    els.envLaunchBtn.addEventListener("click", () => launchEnvironmentFromPanel().catch((error) => {
      els.codexSessionStatus.textContent = `Error: ${error.message}`;
      setCommandResult(error.message, true);
    }));
  }
  if (els.envShutdownBtn) {
    els.envShutdownBtn.addEventListener("click", () => shutdownEnvironmentFromPanel().catch((error) => {
      els.codexSessionStatus.textContent = `Error: ${error.message}`;
      setCommandResult(error.message, true);
    }));
  }

  if (els.agentProfileSelect) {
    els.agentProfileSelect.addEventListener("change", () => {
      fillAgentProfileFormFromSelection();
    });
  }
  if (els.agentProfileName) {
    els.agentProfileName.addEventListener("input", renderAgentProfileSummary);
  }
  if (els.agentProfileProject) {
    els.agentProfileProject.addEventListener("input", () => {
      if (!els.codexSessionProject.value) {
        els.codexSessionProject.value = els.agentProfileProject.value.trim();
      }
      renderAgentProfileSummary();
      renderEnvironmentSummary();
    });
  }
  if (els.agentProfileModeSelect) {
    els.agentProfileModeSelect.addEventListener("change", renderAgentProfileSummary);
  }
  if (els.agentProfileModel) {
    els.agentProfileModel.addEventListener("input", renderAgentProfileSummary);
  }
  if (els.agentProfileCodexProfile) {
    els.agentProfileCodexProfile.addEventListener("input", renderAgentProfileSummary);
  }
  if (els.agentProfileSessionName) {
    els.agentProfileSessionName.addEventListener("input", renderAgentProfileSummary);
  }
  if (els.agentProfileRunPrepSelect) {
    els.agentProfileRunPrepSelect.addEventListener("change", renderAgentProfileSummary);
  }
  if (els.agentProfileStartRelaySelect) {
    els.agentProfileStartRelaySelect.addEventListener("change", renderAgentProfileSummary);
  }
  if (els.agentProfileMakeDefaultSelect) {
    els.agentProfileMakeDefaultSelect.addEventListener("change", renderAgentProfileSummary);
  }
  if (els.agentProfileNotes) {
    els.agentProfileNotes.addEventListener("input", renderAgentProfileSummary);
  }
  if (els.agentProfileRefreshBtn) {
    els.agentProfileRefreshBtn.addEventListener("click", () => refreshAgentProfiles().then(() => {
      els.codexSessionStatus.textContent = "Agent profiles refreshed.";
    }).catch((error) => {
      els.codexSessionStatus.textContent = `Error: ${error.message}`;
      setCommandResult(error.message, true);
    }));
  }
  if (els.agentProfileSaveBtn) {
    els.agentProfileSaveBtn.addEventListener("click", () => saveAgentProfile().catch((error) => {
      els.codexSessionStatus.textContent = `Error: ${error.message}`;
      setCommandResult(error.message, true);
    }));
  }
  if (els.agentProfileSetDefaultBtn) {
    els.agentProfileSetDefaultBtn.addEventListener("click", () => setDefaultAgentProfile().catch((error) => {
      els.codexSessionStatus.textContent = `Error: ${error.message}`;
      setCommandResult(error.message, true);
    }));
  }
  if (els.agentProfileRetireBtn) {
    els.agentProfileRetireBtn.addEventListener("click", () => retireAgentProfile().catch((error) => {
      els.codexSessionStatus.textContent = `Error: ${error.message}`;
      setCommandResult(error.message, true);
    }));
  }
  if (els.agentProfilePlanBtn) {
    els.agentProfilePlanBtn.addEventListener("click", () => spawnAgentFromProfile({ dryRun: true }).catch((error) => {
      els.codexSessionStatus.textContent = `Error: ${error.message}`;
      setCommandResult(error.message, true);
    }));
  }
  if (els.agentProfileSpawnBtn) {
    els.agentProfileSpawnBtn.addEventListener("click", () => spawnAgentFromProfile({ dryRun: false }).catch((error) => {
      els.codexSessionStatus.textContent = `Error: ${error.message}`;
      setCommandResult(error.message, true);
    }));
  }

  els.codexSessionSelect.addEventListener("change", () => {
    fillCodexFormFromSelection();
    renderRelayStatus();
    renderChatRuntimeStrip();
    launchCodexSessionFromPanel({
      ensureRelay: false,
      silent: true,
      refreshChat: true,
      refreshHistory: true,
    }).catch((error) => {
      els.codexSessionStatus.textContent = `Error: ${error.message}`;
    });
  });
  els.codexSessionName.addEventListener("input", () => {
    renderRelayStatus();
    renderChatRuntimeStrip();
    renderTerminalExecResumeButton();
  });
  els.codexSessionTarget.addEventListener("input", () => {
    renderTerminalExecResumeButton();
    renderChatRuntimeStrip();
  });
  els.codexSessionProject.addEventListener("input", () => {
    renderTerminalExecResumeButton();
    renderChatRuntimeStrip();
  });
  els.codexRefreshBtn.addEventListener("click", async () => {
    await refreshCodexSessions().then(() => {
      els.codexSessionStatus.textContent = "Session aliases refreshed.";
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
  if (els.launchRunRefreshBtn) {
    els.launchRunRefreshBtn.addEventListener("click", () => refreshLaunchRuns().then(() => {
      els.codexSessionStatus.textContent = "Launch runs refreshed.";
    }).catch((error) => {
      els.codexSessionStatus.textContent = `Error: ${error.message}`;
      setCommandResult(error.message, true);
    }));
  }
  if (els.launchRunPlanBtn) {
    els.launchRunPlanBtn.addEventListener("click", () => planSelectedRun().catch((error) => {
      els.codexSessionStatus.textContent = `Error: ${error.message}`;
      setCommandResult(error.message, true);
    }));
  }
  if (els.launchRunRelaunchBtn) {
    els.launchRunRelaunchBtn.addEventListener("click", () => relaunchSelectedRun().catch((error) => {
      els.codexSessionStatus.textContent = `Error: ${error.message}`;
      setCommandResult(error.message, true);
    }));
  }
  if (els.launchRunSelect) {
    els.launchRunSelect.addEventListener("change", () => {
      renderLaunchRuns();
    });
  }

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
  if (els.tunnelProviderSelect) {
    els.tunnelProviderSelect.addEventListener("change", () => {
      setPreferredTunnelProvider(els.tunnelProviderSelect.value);
      els.connectionAdvice.textContent = `Remote provider set to ${currentTunnelProvider()}.`;
    });
  }
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
    const url = String(
      state.activeTunnel?.publicUrl || state.activeTunnel?.url || state.connectionHelp?.tunnel?.publicUrl || state.connectionHelp?.tunnel?.url || ""
    ).trim();
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
  els.terminalRefreshBtn.addEventListener("click", () => {
    refreshTerminalStatus({ silent: true, connectIfActive: true })
      .then(() => {
        if (isTerminalActive()) {
          return refreshTerminalHistory({ clear: true, silent: true }).catch(() => null);
        }
        return null;
      })
      .then(() => {
        renderTerminalControls();
      })
      .catch((error) => {
        setTerminalStatusLine(`Error: ${error.message}`, "bad");
        setCommandResult(error.message, true);
      });
  });
  els.terminalStartBtn.addEventListener("click", () => {
    startTerminalSession({ reattach: false }).catch((error) => {
      setTerminalStatusLine(`Start failed: ${error.message}`, "bad");
      setCommandResult(error.message, true);
    });
  });
  els.terminalReattachBtn.addEventListener("click", () => {
    reattachTerminalSession().catch((error) => {
      setTerminalStatusLine(`Reattach failed: ${error.message}`, "bad");
      setCommandResult(error.message, true);
    });
  });
  els.terminalInterruptBtn.addEventListener("click", () => {
    interruptTerminalSession().catch((error) => {
      setTerminalStatusLine(`Interrupt failed: ${error.message}`, "bad");
      setCommandResult(error.message, true);
    });
  });
  els.terminalStopBtn.addEventListener("click", () => {
    stopTerminalSession().catch((error) => {
      setTerminalStatusLine(`Stop failed: ${error.message}`, "bad");
      setCommandResult(error.message, true);
    });
  });
  els.terminalClearBtn.addEventListener("click", clearTerminalViewport);
  if (els.terminalCommandSendBtn) {
    els.terminalCommandSendBtn.addEventListener("click", () => {
      const command = readNpmCommandFromTopBar();
      if (!command) {
        setTerminalStatusLine("Type an npm command first.", "bad");
        return;
      }
      runTerminalCommand(command)
        .then((handled) => {
          if (handled && els.terminalCommandInput) {
            els.terminalCommandInput.value = "";
          }
          if (handled && !state.terminalQueueMode) {
            setCommandResult(`NPM command sent: ${command}`);
          }
          renderTerminalCommandQueue();
        })
        .catch((error) => {
          setTerminalStatusLine(`Command failed: ${error.message}`, "bad");
          setCommandResult(error.message, true);
        });
    });
  }
  if (els.terminalSendQueueBtn) {
    els.terminalSendQueueBtn.addEventListener("click", () => {
      const command = readNpmCommandFromTopBar();
      if (!command) {
        setTerminalStatusLine("Type an npm command first.", "bad");
        return;
      }
      const queued = queueTerminalCommand(command);
      if (queued && els.terminalCommandInput) {
        els.terminalCommandInput.value = "";
      }
    });
  }
  if (els.terminalQueueFlushBtn) {
    els.terminalQueueFlushBtn.addEventListener("click", () => {
      flushTerminalCommandQueue().catch((error) => {
        setTerminalStatusLine(`Queue send failed: ${error.message}`, "bad");
        setCommandResult(error.message, true);
      });
    });
  }
  if (els.terminalCommandInput) {
    els.terminalCommandInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        els.terminalCommandSendBtn?.click();
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        els.terminalSendQueueBtn?.click();
      }
    });
  }
  if (els.terminalDockSendBtn) {
    els.terminalDockSendBtn.addEventListener("click", () => {
      submitTerminalDockCommand({ forceQueue: false }).catch((error) => {
        setTerminalStatusLine(`Command failed: ${error.message}`, "bad");
        setCommandResult(error.message, true);
      });
    });
  }
  if (els.terminalDockQueueBtn) {
    els.terminalDockQueueBtn.addEventListener("click", () => {
      submitTerminalDockCommand({ forceQueue: true }).catch((error) => {
        setTerminalStatusLine(`Queue failed: ${error.message}`, "bad");
        setCommandResult(error.message, true);
      });
    });
  }
  if (els.terminalDockInput) {
    els.terminalDockInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        els.terminalDockSendBtn?.click();
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        els.terminalDockQueueBtn?.click();
      }
    });
  }
  if (els.terminalToolsToggleBtn) {
    els.terminalToolsToggleBtn.addEventListener("click", (event) => {
      if (isTouchFirstDevice()) {
        event.preventDefault();
      }
      handleTerminalControlButton(els.terminalToolsToggleBtn);
      const insidePanelNav = Boolean(els.terminalToolsToggleBtn.closest("#panelNav"));
      if (insidePanelNav) {
        if (state.mobileNavOpen) {
          setMobileNavOpen(false);
        }
        return;
      }
      maintainTerminalTouchFocus(700);
    });
  }
  if (els.terminalToolsPopover) {
    els.terminalToolsPopover.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) {
        return;
      }
      if (
        !button.matches(
          "[data-terminal-action], [data-terminal-key], [data-terminal-text], [data-terminal-mod], [data-terminal-sequence], [data-terminal-soft-enter]"
        )
      ) {
        return;
      }
      handleTerminalControlButton(button);
      maintainTerminalTouchFocus(450);
    });
  }
  if (els.terminalSearchInput) {
    els.terminalSearchInput.addEventListener("input", (event) => {
      const next = String(event.target?.value || "");
      setTerminalSearchQuery(next, { immediate: true, preserveActive: false });
    });
    els.terminalSearchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        jumpTerminalSearchMatch(event.shiftKey ? -1 : 1);
      } else if (event.key === "Escape") {
        event.preventDefault();
        clearTerminalSearch();
      }
    });
  }
  if (els.terminalDirectInputProxy) {
    const proxy = els.terminalDirectInputProxy;
    const markSkipNextInput = (ttlMs = 180) => {
      state.terminalSkipNextInputEvent = true;
      const safeTtl = Number.isFinite(Number(ttlMs)) && Number(ttlMs) > 0 ? Number(ttlMs) : 180;
      window.setTimeout(() => {
        state.terminalSkipNextInputEvent = false;
      }, safeTtl);
    };
    const clearProxyState = () => {
      proxy.value = "";
      state.terminalDirectInputLastValue = "";
      state.terminalDirectInputLiveValue = "";
      state.terminalDirectInputNeedsCommit = false;
      state.terminalDirectInputComposing = false;
    };
    const queueProxyCommand = (commandOverride = "") => {
      const queuedCommand = String(commandOverride || proxy.value || state.terminalDirectInputLastValue || "").trim();
      if (!queuedCommand) {
        setTerminalStatusLine("Type a command first.", "bad");
        return false;
      }
      queueTerminalCommand(queuedCommand);
      return true;
    };
    const submitProxyLine = async (options = {}) => {
      const softLineBreak = Boolean(options.softLineBreak);
      const now = Date.now();
      if (now - Number(state.terminalDirectInputCommitAt || 0) < 140) {
        return;
      }
      state.terminalDirectInputCommitAt = now;
      const value = String(proxy.value || state.terminalDirectInputLastValue || "");
      if (state.terminalTransactionMode) {
        if (softLineBreak) {
          const nextValue = `${value}\n`;
          proxy.value = nextValue;
          state.terminalDirectInputLastValue = nextValue;
          state.terminalDirectInputNeedsCommit = true;
          return;
        }
        if (state.terminalQueueMode) {
          if (queueProxyCommand(value)) {
            clearProxyState();
          }
          return;
        }
        const payload = value ? `${value}\r` : "\r";
        const statusText = value.trim() ? `Sent transaction: ${value}` : "Enter key sent.";
        await sendTerminalSequence(payload, statusText);
        clearProxyState();
        return;
      }
      if (!softLineBreak && state.terminalQueueMode) {
        if (queueProxyCommand()) {
          clearProxyState();
        }
        return;
      }
      const liveValue = String(state.terminalDirectInputLiveValue || "");
      if (state.terminalDirectInputNeedsCommit) {
        const lineTerminator = softLineBreak ? "\n" : "\r";
        const needsReplay = value !== liveValue;
        const clearSequence = needsReplay && liveValue ? "\u007f".repeat(liveValue.length) : "";
        const replayValue = needsReplay ? value : "";
        const statusText = softLineBreak ? "Soft line break sent." : value.trim() ? `Sent command: ${value}` : "Enter key sent.";
        await sendTerminalSequence(`${clearSequence}${replayValue}${lineTerminator}`, statusText);
        clearProxyState();
        return;
      }
      if (softLineBreak) {
        await sendTerminalSoftLineBreak();
      } else {
        await sendTerminalSpecialKey("Enter");
      }
      clearProxyState();
    };
    proxy.addEventListener("focus", () => {
      if (state.terminalSelectMode) {
        proxy.blur();
        return;
      }
      state.terminalProxyInputMode = true;
      applyTerminalInputMode();
      const current = String(proxy.value || "");
      state.terminalDirectInputLastValue = current;
      if (!state.terminalTransactionMode) {
        state.terminalDirectInputLiveValue = current;
        state.terminalDirectInputNeedsCommit = false;
      } else {
        state.terminalDirectInputNeedsCommit = Boolean(current);
      }
      state.terminalDirectInputComposing = false;
      state.terminalSkipNextInputEvent = false;
      window.setTimeout(() => {
        syncViewportCssVars();
      }, 60);
      ensurePersistentTerminalChannel({
        autoStart: true,
        loadHistory: false,
      }).catch(() => null);
    });
    proxy.addEventListener("blur", () => {
      if (terminalDockFocusLockActive()) {
        scheduleTerminalProxyRefocus(0);
        return;
      }
      state.terminalProxyInputMode = false;
      applyTerminalInputMode();
      state.terminalDirectInputComposing = false;
      const current = String(proxy.value || "");
      state.terminalDirectInputLastValue = current;
      if (!state.terminalTransactionMode) {
        state.terminalDirectInputLiveValue = current;
        state.terminalDirectInputNeedsCommit = false;
      } else {
        state.terminalDirectInputNeedsCommit = Boolean(current);
      }
      state.terminalSkipNextInputEvent = false;
      window.setTimeout(() => {
        syncViewportCssVars();
      }, 60);
    });
    proxy.addEventListener("compositionstart", () => {
      state.terminalDirectInputComposing = true;
    });
    proxy.addEventListener("compositionend", (event) => {
      state.terminalDirectInputComposing = false;
      if (state.terminalSelectMode) {
        clearProxyState();
        return;
      }
      // Let the upcoming input event drive terminal writes through delta sync.
      // Sending here as well causes duplicate commits with mobile suggestions.
    });
    proxy.addEventListener("beforeinput", (event) => {
      if (state.terminalSelectMode || state.terminalDirectInputComposing) {
        return;
      }
      const inputType = String(event.inputType || "");
      if (!inputType) {
        return;
      }
      if (inputType === "insertLineBreak" || inputType === "insertParagraph") {
        event.preventDefault();
        markSkipNextInput(220);
        const useSoftLineBreak =
          typeof event.getModifierState === "function" ? Boolean(event.getModifierState("Shift")) : false;
        submitProxyLine({ softLineBreak: useSoftLineBreak }).catch((error) => {
          const label = useSoftLineBreak ? "Soft enter failed" : "Enter key failed";
          setTerminalStatusLine(`${label}: ${error.message}`, "bad");
          setCommandResult(error.message, true);
        });
        return;
      }
      if (inputType === "deleteContentBackward" || inputType === "deleteContentForward") {
        event.preventDefault();
        markSkipNextInput(120);
        const value = String(proxy.value || "");
        const rawStart =
          typeof proxy.selectionStart === "number" && Number.isFinite(proxy.selectionStart) ? proxy.selectionStart : value.length;
        const rawEnd = typeof proxy.selectionEnd === "number" && Number.isFinite(proxy.selectionEnd) ? proxy.selectionEnd : rawStart;
        let start = Math.max(0, Math.min(rawStart, rawEnd));
        let end = Math.max(0, Math.max(rawStart, rawEnd));
        if (start === end) {
          if (inputType === "deleteContentBackward" && start > 0) {
            start -= 1;
          } else if (inputType === "deleteContentForward" && end < value.length) {
            end += 1;
          }
        }
        if (end <= start) {
          return;
        }
        const nextValue = `${value.slice(0, start)}${value.slice(end)}`;
        proxy.value = nextValue;
        state.terminalDirectInputLastValue = value;
        syncDirectInputProxyFromValue(nextValue);
        try {
          proxy.setSelectionRange(start, start);
        } catch {
          // ignore caret restore failures
        }
        return;
      }
    });
    proxy.addEventListener("input", (event) => {
      if (state.terminalSkipNextInputEvent) {
        state.terminalSkipNextInputEvent = false;
        return;
      }
      if (state.terminalSelectMode) {
        clearProxyState();
        return;
      }
      if (state.terminalDirectInputComposing) {
        return;
      }
      const inputType = String(event?.inputType || "");
      if (event?.isComposing) {
        return;
      }
      // Android suggestion flows can emit extra composition/replacement input
      // events after commit; ignore those here to avoid duplicate output.
      if (inputType === "insertFromComposition") {
        return;
      }
      syncDirectInputProxyFromValue(proxy.value);
    });
    proxy.addEventListener("keydown", (event) => {
      if (state.terminalSelectMode) {
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        markSkipNextInput(220);
        const useSoftLineBreak = Boolean(event.shiftKey);
        submitProxyLine({ softLineBreak: useSoftLineBreak }).catch((error) => {
          const label = useSoftLineBreak ? "Soft enter failed" : "Enter key failed";
          setTerminalStatusLine(`${label}: ${error.message}`, "bad");
          setCommandResult(error.message, true);
        });
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        markSkipNextInput(180);
        sendTerminalSpecialKey("Tab").catch((error) => {
          setTerminalStatusLine(`Tab key failed: ${error.message}`, "bad");
          setCommandResult(error.message, true);
        });
        return;
      }
    });
  }
  if (els.terminalKeyboardDock) {
    els.terminalKeyboardDock.addEventListener("pointerdown", (event) => {
      const button = event.target.closest("button");
      if (!button) {
        return;
      }
      const arrow = isTerminalArrowButton(button);
      const touchDevice = isTouchFirstDevice();
      if (touchDevice) {
        beginTerminalTouchScroll(event);
      }
      if (arrow) {
        if (touchDevice) {
          event.preventDefault();
          markTerminalTouchAction(button);
          maintainTerminalTouchFocus(700);
        }
        startTerminalArrowRepeat(button);
        return;
      }
    });
    els.terminalKeyboardDock.addEventListener("pointermove", (event) => {
      trackTerminalTouchScroll(event);
    });
    els.terminalKeyboardDock.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) {
        return;
      }
      if (shouldSuppressTerminalTouchClick(button)) {
        event.preventDefault();
        endTerminalTouchScroll();
        return;
      }
      handleTerminalControlButton(button);
      maintainTerminalTouchFocus(700);
      endTerminalTouchScroll();
    });
  }
  if (els.terminalSpecialControls) {
    els.terminalSpecialControls.addEventListener("pointerdown", (event) => {
      const button = event.target.closest("button");
      if (!button) {
        return;
      }
      const arrow = isTerminalArrowButton(button);
      if (isTouchFirstDevice()) {
        if (arrow) {
          event.preventDefault();
          markTerminalTouchAction(button);
          maintainTerminalTouchFocus(450);
        }
      }
      if (arrow) {
        startTerminalArrowRepeat(button);
        return;
      }
    });
    els.terminalSpecialControls.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) {
        return;
      }
      if (shouldSuppressTerminalTouchClick(button)) {
        event.preventDefault();
        return;
      }
      handleTerminalControlButton(button);
      maintainTerminalTouchFocus(450);
    });
  }
  document.addEventListener("pointerup", () => {
    clearTerminalArrowRepeat();
    endTerminalTouchScroll();
  });
  document.addEventListener("pointercancel", () => {
    clearTerminalArrowRepeat();
    endTerminalTouchScroll();
  });
  window.addEventListener("blur", () => {
    clearTerminalArrowRepeat({ suppressClick: false });
    endTerminalTouchScroll();
    hideStatusDotPopover();
  });
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (event.pointerType && !["touch", "pen"].includes(event.pointerType)) {
        return;
      }
      if (paintTerminalTapFeedback(event.target)) {
        triggerTerminalHapticPulse();
      }
    },
    { passive: true }
  );
  if (els.terminalPanelToggleBtn) {
    els.terminalPanelToggleBtn.addEventListener("click", () => {
      setUtilityCollapsed(!state.utilityCollapsed);
    });
  }
  document.addEventListener("click", (event) => {
    const panelButton = event.target.closest("[data-open-panel]");
    if (panelButton) {
      const target = String(panelButton.getAttribute("data-open-panel") || "").trim();
      if (target) {
        setActiveUtilityPanel(target, { expand: true });
      }
      return;
    }

    if (state.statusDotPopoverKey) {
      const insideDots = Boolean(event.target.closest("#statusDotBar,#statusDotPopover"));
      if (!insideDots) {
        hideStatusDotPopover();
        renderStatusDotBar(state.statusDotChecks);
      }
    }

    if (!state.terminalToolsOpen) {
      return;
    }
    const insidePopover = Boolean(event.target.closest("#terminalToolsPopover"));
    const insideToggle = Boolean(event.target.closest('#terminalToolsToggleBtn,[data-terminal-action="tools"]'));
    if (!insidePopover && !insideToggle) {
      setTerminalToolsOpen(false);
    }
  });
  if (els.terminalQuickCommands) {
    els.terminalQuickCommands.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) {
        return;
      }
      if (shouldSuppressTerminalTouchClick(button)) {
        event.preventDefault();
        return;
      }
      handleTerminalControlButton(button);
      maintainTerminalTouchFocus(700);
    });
  }
 
  window.addEventListener("resize", () => {
    applyResponsiveUtilityDefaults();
    setTerminalToolsOpen(state.terminalToolsOpen, { fit: false });
    applyTerminalInputMode();
    syncViewportCssVars();
  });
  window.addEventListener("online", () => {
    if (els.appView.hidden) {
      return;
    }
    connectChatSocket();
    ensurePersistentTerminalChannel({
      autoStart: true,
      loadHistory: false,
    }).catch(() => null);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden || els.appView.hidden) {
      return;
    }
    connectChatSocket();
    ensurePersistentTerminalChannel({
      autoStart: true,
      loadHistory: false,
    }).catch(() => null);
  });
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    if (state.statusDotPopoverKey) {
      hideStatusDotPopover();
      renderStatusDotBar(state.statusDotChecks);
      return;
    }
    if (state.terminalToolsOpen) {
      setTerminalToolsOpen(false);
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
setActiveUtilityPanel("preview", { expand: true });
applyResponsiveUtilityDefaults(false);
renderRelayStatus();
renderTunnelModeControls();
renderPromptModeControls();
renderTerminalCommandQueue();
renderTerminalQueueMode();
renderTerminalTransactionMode();
renderTerminalGapIndicator();
renderTerminalSearchStatus();
renderStatusDotBar([]);
syncViewportCssVars({ fitTerminal: false });
setTerminalToolsOpen(false, { fit: false });
setTerminalDockExpanded(false);
refreshTerminalKeyboardDockVisibility();
renderTerminalExecResumeButton();
renderTerminalControls("Disconnected.");
onBootstrap();
ensureChatSurfaceVisible();
