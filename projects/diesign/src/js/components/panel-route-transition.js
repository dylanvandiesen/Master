const HOME_VIEW = 'home';
const PANEL_VIEWS = new Set(['work', 'about', 'contact']);
const SHELL_RESIZE_MS = 760;
const CONTENT_FADE_MS = 880;
const CONTENT_FADE_DELAY_MS = 72;
const TRANSITION_BUFFER_MS = 80;
const SCROLL_PRIME_MS = 220;

function getPrimaryRoute(pathname = location.pathname) {
  const [segment] = pathname.split('/').filter(Boolean);
  return PANEL_VIEWS.has(segment) ? segment : HOME_VIEW;
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function toStageRect(stage, element) {
  const stageRect = stage.getBoundingClientRect();
  const rect = element.getBoundingClientRect();

  return {
    left: Math.round(rect.left - stageRect.left),
    top: Math.round(rect.top - stageRect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  };
}

function collapseRect(rect) {
  if (!rect) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }

  return {
    left: Math.round(rect.left + rect.width / 2),
    top: Math.round(rect.top + rect.height / 2),
    width: 0,
    height: 0
  };
}

function getContentHeight(node) {
  return Math.max(
    Math.round(node.scrollHeight || 0),
    Math.round(node.getBoundingClientRect().height)
  );
}

function getNaturalContentHeight(node) {
  const content = node?.querySelector?.('.content-wrapper, .intro-container');

  if (!content) {
    return getContentHeight(node);
  }

  const styles = window.getComputedStyle(content);
  const marginTop = parseFloat(styles.marginTop) || 0;
  const marginBottom = parseFloat(styles.marginBottom) || 0;

  return Math.round(content.getBoundingClientRect().height + marginTop + marginBottom);
}

export function setupPanelRouteTransition({
  rootSelector = '.content-container',
  panesSelector = '.tab-panes',
  stageSelector = '[data-panel-stage]',
  shellSelector = '[data-panel-shell]',
  swapSelector = '[data-panel-swap]',
  scrollSelector = '[data-panel-scroll]',
  bodySelector = '[data-panel-body]',
  overlaySelector = '[data-panel-overlay]'
} = {}) {
  const root = document.querySelector(rootSelector);
  const panes = root?.querySelector(panesSelector);
  const stage = root?.querySelector(stageSelector);
  const shell = root?.querySelector(shellSelector);
  const swapHost = root?.querySelector(swapSelector);
  const scrollHost = root?.querySelector(scrollSelector);
  const bodyHost = root?.querySelector(bodySelector);
  const overlayHost = root?.querySelector(overlaySelector);

  if (!root || !panes || !stage || !shell || !swapHost || !scrollHost || !bodyHost || !overlayHost) {
    return null;
  }

  const routes = ['home', 'work', 'about', 'contact'].reduce((map, view) => {
    const container = root.querySelector(`#${view}.tab-pane-container`);
    const spacer = container?.querySelector('.spacer') ?? null;
    const scroller = container?.querySelector('.content-scroller') ?? null;
    const pane = container?.querySelector('.tab-pane') ?? null;

    if (!container || !spacer || !scroller || !pane) {
      return map;
    }

    if (view !== HOME_VIEW) {
      container.setAttribute('aria-hidden', 'true');
      container.inert = true;
    }

    map[view] = { container, spacer, scroller, pane };
    return map;
  }, {});

  if (!routes.home || !routes.work || !routes.about || !routes.contact) {
    return null;
  }

  root.classList.add('is-panel-shell-ready');
  const routeFormState = new Map();

  let activeView = getPrimaryRoute(location.pathname);
  let targetView = activeView;
  let lastExpandedRect = toStageRect(stage, routes.work.spacer);
  let transitionToken = 0;
  let cleanupTimer = 0;
  let pendingExitLayer = null;
  let scrollResetFrame = 0;
  let scrollPrimeTimer = 0;
  let liveLayoutFrame = 0;
  let liveLayoutTimeout = 0;
  let deferredLayoutTimeout = 0;
  const HOME_TRANSITION_OUT_CLASS = 'is-home-transition-out';
  const HOME_TRANSITION_IN_CLASS = 'is-home-transition-in';

  function isEditableElement(element) {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    if (element.isContentEditable) {
      return true;
    }

    return /^(INPUT|TEXTAREA|SELECT)$/.test(element.tagName);
  }

  function isEditingLivePanelControl() {
    const activeElement = document.activeElement;

    return isEditableElement(activeElement) && bodyHost.contains(activeElement);
  }

  function setLiveContentSettled(settled) {
    const liveContent = bodyHost.querySelector('.panel-content.is-current');
    if (liveContent) {
      liveContent.classList.toggle('is-settled', settled);
    }
  }

  function setBodyCentered(centered) {
    bodyHost.classList.toggle('is-centered-flow', Boolean(centered));
  }

  function getSourceShellRect(view) {
    if (!PANEL_VIEWS.has(view)) {
      return null;
    }

    return toStageRect(stage, routes[view].spacer);
  }

  function getShellBoundaryRect(view) {
    const shellRect = getSourceShellRect(view);

    return shellRect;
  }

  function getShellFrameHeight() {
    const styles = window.getComputedStyle(shell);
    const paddingTop = parseFloat(styles.paddingTop) || 0;
    const paddingBottom = parseFloat(styles.paddingBottom) || 0;
    const borderTop = parseFloat(styles.borderTopWidth) || 0;
    const borderBottom = parseFloat(styles.borderBottomWidth) || 0;

    return Math.max(0, Math.round(paddingTop + paddingBottom + borderTop + borderBottom));
  }

  function getIntrinsicContentHeight(view, scroller, node) {
    const naturalHeight = getNaturalContentHeight(node);
    const scrollHeight = Math.max(
      Math.ceil(scroller?.scrollHeight || 0),
      Math.ceil(node?.scrollHeight || 0)
    );
    const boundaryRect = getShellBoundaryRect(view);
    const availableInnerHeight = boundaryRect
      ? Math.max(0, Math.round(boundaryRect.height - getShellFrameHeight()))
      : Math.max(0, Math.ceil(scroller?.clientHeight || 0));

    if (naturalHeight <= availableInnerHeight) {
      return naturalHeight;
    }

    return Math.max(naturalHeight, scrollHeight);
  }

  function getSourceContentMetrics(view) {
    if (!PANEL_VIEWS.has(view)) {
      return null;
    }

    const height = getIntrinsicContentHeight(view, routes[view].scroller, routes[view].pane);
    const paneRect = routes[view].pane.getBoundingClientRect();
    const scrollerRect = routes[view].scroller.getBoundingClientRect();

    return {
      width: Math.round(paneRect.width),
      height,
      top: Math.round(paneRect.top - scrollerRect.top),
      centered: height <= Math.round(scrollerRect.height)
    };
  }

  function getPreferredShellRect(view, metrics = getSourceContentMetrics(view)) {
    if (!PANEL_VIEWS.has(view)) {
      return null;
    }

    const widthRect = getSourceShellRect(view);
    const boundaryRect = getShellBoundaryRect(view);

    if (!widthRect || !boundaryRect || !metrics) {
      return widthRect;
    }

    const chromeHeight = getShellFrameHeight();
    const preferredHeight = Math.min(
      boundaryRect.height,
      Math.max(chromeHeight, Math.round(metrics.height + chromeHeight))
    );
    const centeredTop = Math.round(
      boundaryRect.top + Math.max(0, (boundaryRect.height - preferredHeight) / 2)
    );

    return {
      left: widthRect.left,
      top: centeredTop,
      width: widthRect.width,
      height: preferredHeight
    };
  }

  function getSourceInitialScrollTop(view) {
    if (!PANEL_VIEWS.has(view)) {
      return 0;
    }

    const firstSnapTarget = routes[view].pane.querySelector('.content-wrapper');

    if (!firstSnapTarget) {
      return 0;
    }

    const styles = window.getComputedStyle(firstSnapTarget);
    const scrollMarginTop = parseFloat(styles.scrollMarginTop) || 0;

    return Math.max(0, Math.round(firstSnapTarget.offsetTop - scrollMarginTop));
  }

  function getCurrentShellRect() {
    if (shell.classList.contains('is-collapsed')) {
      return collapseRect(lastExpandedRect);
    }

    return toStageRect(stage, shell);
  }

  function getCurrentVisualContent() {
    return (
      overlayHost.querySelector('.panel-content.is-entering.is-visible') ||
      overlayHost.querySelector('.panel-content.is-visible') ||
      bodyHost.querySelector('.panel-content.is-current')
    );
  }

  function getFormControls(scope) {
    return Array.from(scope?.querySelectorAll?.('input, textarea, select') ?? []).filter((control) => {
      return !['submit', 'button', 'reset', 'image', 'file'].includes((control.type || '').toLowerCase());
    });
  }

  function getControlStateKey(control, index) {
    return control.id || control.name || `${control.tagName.toLowerCase()}-${index}`;
  }

  function captureFormState(scope) {
    const controls = getFormControls(scope);

    if (!controls.length) {
      return null;
    }

    return controls.map((control, index) => {
      const key = getControlStateKey(control, index);
      const tag = control.tagName.toLowerCase();
      const type = (control.type || '').toLowerCase();
      const baseState = { key, tag, type };

      if (tag === 'select') {
        return {
          ...baseState,
          value: control.value,
          selectedValues: Array.from(control.options)
            .filter((option) => option.selected)
            .map((option) => option.value)
        };
      }

      if (type === 'checkbox' || type === 'radio') {
        return {
          ...baseState,
          value: control.value,
          checked: control.checked
        };
      }

      return {
        ...baseState,
        value: control.value
      };
    });
  }

  function applyFormState(scope, state) {
    if (!scope || !state?.length) {
      return;
    }

    const controlMap = new Map(
      getFormControls(scope).map((control, index) => [getControlStateKey(control, index), control])
    );

    state.forEach((entry) => {
      const control = controlMap.get(entry.key);

      if (!control) {
        return;
      }

      if (entry.tag === 'select') {
        const selectedValues = new Set(entry.selectedValues || []);
        Array.from(control.options).forEach((option) => {
          const selected = selectedValues.has(option.value);
          option.selected = selected;
          option.defaultSelected = selected;
        });
        control.value = entry.value ?? '';
        return;
      }

      if (entry.type === 'checkbox' || entry.type === 'radio') {
        control.checked = Boolean(entry.checked);
        control.defaultChecked = Boolean(entry.checked);
        return;
      }

      const value = entry.value ?? '';
      control.value = value;

      if ('defaultValue' in control) {
        control.defaultValue = value;
      }

      if (entry.tag === 'textarea') {
        control.textContent = value;
      }
    });
  }

  function syncRouteFormState(view, scope) {
    if (!PANEL_VIEWS.has(view) || !scope) {
      return;
    }

    const state = captureFormState(scope);

    if (!state?.length) {
      return;
    }

    routeFormState.set(view, state);
    applyFormState(routes[view].pane, state);
  }

  function persistCurrentLiveFormState() {
    const liveContent = bodyHost.querySelector('.panel-content.is-current');
    const view = liveContent?.dataset.view;

    if (!view) {
      return;
    }

    syncRouteFormState(view, liveContent);
    scheduleLiveLayoutSync();
    scheduleDeferredLiveLayoutSync();
  }

  function getLiveContentMetrics(view, node) {
    const rect = node.getBoundingClientRect();
    const scrollRect = scrollHost.getBoundingClientRect();
    const height = getIntrinsicContentHeight(view, scrollHost, node);

    return {
      width: Math.round(rect.width),
      height,
      top: Math.round(rect.top - scrollRect.top),
      centered: height <= Math.round(scrollRect.height)
    };
  }

  function getResolvedContentMetrics(view, node) {
    const liveMetrics = node ? getLiveContentMetrics(view, node) : null;
    const sourceMetrics = PANEL_VIEWS.has(view) ? getSourceContentMetrics(view) : null;

    if (!liveMetrics) {
      return sourceMetrics;
    }

    if (!sourceMetrics) {
      return liveMetrics;
    }

    return {
      width: sourceMetrics.width || liveMetrics.width,
      height: Math.max(liveMetrics.height, sourceMetrics.height),
      top: Math.min(liveMetrics.top, sourceMetrics.top),
      centered: liveMetrics.centered || sourceMetrics.centered
    };
  }

  function shouldCenterContent(view, metrics) {
    if (!PANEL_VIEWS.has(view) || !metrics) {
      return false;
    }

    const boundaryRect = getShellBoundaryRect(view);
    if (!boundaryRect) {
      return Boolean(metrics.centered);
    }

    const availableInnerHeight = Math.max(0, boundaryRect.height - getShellFrameHeight());
    return Math.round(metrics.height) <= Math.round(availableInnerHeight);
  }

  function applyContentMetrics(node, metrics) {
    if (!node || !metrics) {
      return;
    }

    node.style.width = `${metrics.width}px`;
    node.style.minHeight = `${metrics.height}px`;
    node.style.setProperty('--panel-layer-top', `${metrics.top}px`);
    node.style.removeProperty('height');
    node.classList.toggle('is-centered-layout', Boolean(metrics.centered));
  }

  function getFrozenContentMetrics(view, node, { preferSource = false } = {}) {
    const liveMetrics = node ? getLiveContentMetrics(view, node) : null;
    const sourceMetrics = PANEL_VIEWS.has(view) ? getSourceContentMetrics(view) : null;

    if (preferSource && sourceMetrics) {
      return sourceMetrics;
    }

    return liveMetrics || sourceMetrics;
  }

  function syncLivePanelLayout({ immediate = false, force = false } = {}) {
    if (!PANEL_VIEWS.has(targetView) || (!force && swapHost.classList.contains('is-transitioning'))) {
      return;
    }

    const liveContent = bodyHost.querySelector('.panel-content.is-current');

    if (!liveContent) {
      return;
    }

    const metrics = getResolvedContentMetrics(targetView, liveContent);
    const centered = shouldCenterContent(targetView, metrics);
    applyContentMetrics(liveContent, { ...metrics, centered });
    setBodyCentered(centered);
    setShellRect(getPreferredShellRect(targetView, metrics), { immediate, collapsed: false });
  }

  function scheduleLiveLayoutSync() {
    window.cancelAnimationFrame(liveLayoutFrame);
    window.clearTimeout(liveLayoutTimeout);
    liveLayoutFrame = window.requestAnimationFrame(() => {
      syncLivePanelLayout();
    });
    liveLayoutTimeout = window.setTimeout(() => {
      syncLivePanelLayout();
    }, 80);
  }

  function scheduleDeferredLiveLayoutSync(delay = 360) {
    window.clearTimeout(deferredLayoutTimeout);
    deferredLayoutTimeout = window.setTimeout(() => {
      syncLivePanelLayout();
    }, delay);
  }

  function cloneRouteContent(view) {
    if (!PANEL_VIEWS.has(view)) {
      return null;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'panel-content';
    wrapper.dataset.view = view;

    const pane = routes[view].pane.cloneNode(true);
    pane.dataset.livePanel = view;
    wrapper.append(pane);

    return wrapper;
  }

  function setImmediateScrollTop(top = 0) {
    window.cancelAnimationFrame(scrollResetFrame);
    scrollHost.classList.add('is-resetting-scroll');
    scrollHost.scrollTo({ top, behavior: 'auto' });
    scrollHost.scrollTop = top;
    scrollResetFrame = window.requestAnimationFrame(() => {
      scrollHost.classList.remove('is-resetting-scroll');
    });
  }

  function clearScrollPrimeTimer() {
    window.clearTimeout(scrollPrimeTimer);
    scrollPrimeTimer = 0;
  }

  function setScrollPrimed(primed) {
    clearScrollPrimeTimer();
    scrollHost.classList.toggle('is-priming-scroll', primed);
  }

  function settleScrollHost(delay = SCROLL_PRIME_MS) {
    clearScrollPrimeTimer();
    scrollHost.classList.add('is-priming-scroll');
    scrollPrimeTimer = window.setTimeout(() => {
      scrollHost.classList.remove('is-priming-scroll');
    }, delay);
  }

  function createFrozenLayer(node, metrics, stateClass) {
    if (!node || !metrics) {
      return null;
    }

    const layer = node.cloneNode(true);
    layer.classList.remove('is-current', 'is-entering', 'is-exiting', 'is-visible');
    layer.classList.add(stateClass);
    applyContentMetrics(layer, metrics);
    applyFormState(layer, captureFormState(node));
    return layer;
  }

  function createLiveLayer(view) {
    const content = cloneRouteContent(view);
    const metrics = getSourceContentMetrics(view);

    if (!content || !metrics) {
      return null;
    }

    applyContentMetrics(content, metrics);
    applyFormState(content, routeFormState.get(view));
    content.classList.add('is-current', 'is-visible');
    return content;
  }

  function mountLiveView(view, { resetScroll = true } = {}) {
    persistCurrentLiveFormState();
    bodyHost.replaceChildren();
    setBodyCentered(false);
    setScrollPrimed(true);

    if (!PANEL_VIEWS.has(view)) {
      if (resetScroll) {
        setImmediateScrollTop(0);
      }
      return;
    }

    const content = createLiveLayer(view);

    if (!content) {
      return;
    }

    content.classList.remove('is-settled');
    bodyHost.append(content);

    if (resetScroll) {
      setImmediateScrollTop(getSourceInitialScrollTop(view));
    }

    const metrics = getResolvedContentMetrics(view, content);
    const centered = shouldCenterContent(view, metrics);
    applyContentMetrics(content, { ...metrics, centered });
    setBodyCentered(centered);

    return content;
  }

  function setShellRect(rect, { immediate = false, collapsed = false } = {}) {
    if (!rect) {
      return;
    }

    if (immediate) {
      shell.classList.add('is-sizing-immediate');
    }

    shell.classList.toggle('is-collapsed', collapsed);
    shell.style.setProperty('--panel-shell-left', `${rect.left}px`);
    shell.style.setProperty('--panel-shell-top', `${rect.top}px`);
    shell.style.setProperty('--panel-shell-width', `${rect.width}px`);
    shell.style.setProperty('--panel-shell-height', `${rect.height}px`);
    shell.style.setProperty('--panel-shell-opacity', collapsed ? '0' : '1');

    if (!collapsed && rect.width > 0 && rect.height > 0) {
      lastExpandedRect = rect;
    }

    if (immediate) {
      shell.getBoundingClientRect();
      shell.classList.remove('is-sizing-immediate');
    }
  }

  function clearOverlay() {
    clearTimeout(cleanupTimer);
    overlayHost.replaceChildren();
    swapHost.classList.remove('is-transitioning');
  }

  function resetOverlay() {
    pendingExitLayer = null;
    clearOverlay();
    root.classList.remove(HOME_TRANSITION_OUT_CLASS, HOME_TRANSITION_IN_CLASS);
  }

  function getExitLayerSnapshot() {
    if (pendingExitLayer) {
      const layer = pendingExitLayer;
      pendingExitLayer = null;
      return layer;
    }

    const visualContent = getCurrentVisualContent();
    return visualContent
      ? createFrozenLayer(visualContent, getFrozenContentMetrics(targetView, visualContent), 'is-exiting')
      : null;
  }

  function capturePendingExitLayer(view) {
    if (!PANEL_VIEWS.has(view)) {
      pendingExitLayer = null;
      return;
    }

    const visualContent = getCurrentVisualContent();
    const layer = visualContent
      ? createFrozenLayer(visualContent, getFrozenContentMetrics(view, visualContent), 'is-exiting')
      : null;
    pendingExitLayer = layer;
  }

  function commitImmediate(view) {
    targetView = view;
    activeView = view;
    resetOverlay();
    mountLiveView(view);
    setLiveContentSettled(PANEL_VIEWS.has(view));

    if (PANEL_VIEWS.has(view)) {
      syncLivePanelLayout({ immediate: true, force: true });
      setImmediateScrollTop(getSourceInitialScrollTop(view));
      settleScrollHost();
      return;
    }

    settleScrollHost();
    setShellRect(collapseRect(lastExpandedRect), { immediate: true, collapsed: true });
  }

  async function transitionTo(view) {
    const nextView = PANEL_VIEWS.has(view) ? view : HOME_VIEW;
    const currentView = targetView;

    if (nextView === currentView) {
      return;
    }

    targetView = nextView;
    const token = ++transitionToken;
    const startRect = PANEL_VIEWS.has(currentView)
      ? getCurrentShellRect()
      : collapseRect(getPreferredShellRect(nextView) ?? getSourceShellRect(nextView) ?? lastExpandedRect);
    const endRect = PANEL_VIEWS.has(nextView) ? getPreferredShellRect(nextView) : collapseRect(startRect);
    const exitLayer = getExitLayerSnapshot();
    const liveNextContent = PANEL_VIEWS.has(nextView) ? mountLiveView(nextView) : null;
    const enterLayer = liveNextContent
      ? createFrozenLayer(
          liveNextContent,
          getFrozenContentMetrics(nextView, liveNextContent, { preferSource: true }) ??
            getResolvedContentMetrics(nextView, liveNextContent),
          'is-entering'
        )
      : null;

    clearOverlay();

    if (currentView === HOME_VIEW && PANEL_VIEWS.has(nextView)) {
      root.classList.add(HOME_TRANSITION_OUT_CLASS);
    }

    if (nextView === HOME_VIEW && PANEL_VIEWS.has(currentView)) {
      root.classList.add(HOME_TRANSITION_IN_CLASS);
    }

    if (!exitLayer && !enterLayer) {
      commitImmediate(nextView);
      return;
    }

    swapHost.classList.add('is-transitioning');

    if (exitLayer) {
      exitLayer.classList.add('is-visible');
      overlayHost.append(exitLayer);
    }

    if (enterLayer) {
      overlayHost.append(enterLayer);
    }

    setShellRect(startRect, {
      immediate: true,
      collapsed: !PANEL_VIEWS.has(currentView)
    });

    await nextFrame();

    if (token !== transitionToken) {
      return;
    }

    if (enterLayer) {
      enterLayer.classList.add('is-visible');
    }

    if (exitLayer) {
      exitLayer.classList.remove('is-visible');
    }

    setShellRect(endRect, {
      collapsed: !PANEL_VIEWS.has(nextView)
    });

    cleanupTimer = window.setTimeout(() => {
      if (token !== transitionToken) {
        return;
      }

      activeView = nextView;

      if (PANEL_VIEWS.has(nextView)) {
        setImmediateScrollTop(getSourceInitialScrollTop(nextView));
        syncLivePanelLayout({ immediate: true, force: true });
      }

      setLiveContentSettled(PANEL_VIEWS.has(nextView));
      resetOverlay();
      settleScrollHost();

      if (!PANEL_VIEWS.has(nextView)) {
        bodyHost.replaceChildren();
        setImmediateScrollTop(0);
        setShellRect(collapseRect(lastExpandedRect), { immediate: true, collapsed: true });
      }
    }, Math.max(SHELL_RESIZE_MS, CONTENT_FADE_MS + CONTENT_FADE_DELAY_MS) + TRANSITION_BUFFER_MS);
  }

  function syncCurrentState() {
    transitionToken += 1;
    activeView = targetView;
    resetOverlay();
    mountLiveView(targetView);
    setLiveContentSettled(PANEL_VIEWS.has(targetView));

    if (PANEL_VIEWS.has(targetView)) {
      syncLivePanelLayout({ immediate: true, force: true });
      setImmediateScrollTop(getSourceInitialScrollTop(targetView));
      settleScrollHost(160);
      return;
    }

    settleScrollHost(160);
    setShellRect(collapseRect(lastExpandedRect), { immediate: true, collapsed: true });
  }

  function handleRouteChange(event) {
    const nextView = getPrimaryRoute(event.detail?.path);
    transitionTo(nextView);
  }

  function handleRouteWillChange(event) {
    const nextView = getPrimaryRoute(event.detail?.path);

    if (nextView !== targetView) {
      capturePendingExitLayer(targetView);
    }
  }

  function handleViewportChange() {
    if (isEditingLivePanelControl()) {
      return;
    }

    syncCurrentState();
  }

  window.addEventListener('routewillchange', handleRouteWillChange);
  window.addEventListener('routechange', handleRouteChange);
  window.addEventListener('resize', handleViewportChange, { passive: true });
  window.addEventListener('orientationchange', handleViewportChange, { passive: true });
  window.visualViewport?.addEventListener('resize', handleViewportChange, { passive: true });
  bodyHost.addEventListener('input', scheduleLiveLayoutSync, true);
  bodyHost.addEventListener('change', scheduleLiveLayoutSync, true);
  bodyHost.addEventListener('toggle', scheduleLiveLayoutSync, true);
  bodyHost.addEventListener('load', scheduleLiveLayoutSync, true);
  bodyHost.addEventListener('input', persistCurrentLiveFormState, true);
  bodyHost.addEventListener('change', persistCurrentLiveFormState, true);

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      syncCurrentState();
    });
  }

  commitImmediate(activeView);

  return {
    destroy() {
      resetOverlay();
      window.cancelAnimationFrame(scrollResetFrame);
      window.cancelAnimationFrame(liveLayoutFrame);
      window.clearTimeout(liveLayoutTimeout);
      window.clearTimeout(deferredLayoutTimeout);
      clearScrollPrimeTimer();
      bodyHost.removeEventListener('input', scheduleLiveLayoutSync, true);
      bodyHost.removeEventListener('change', scheduleLiveLayoutSync, true);
      bodyHost.removeEventListener('toggle', scheduleLiveLayoutSync, true);
      bodyHost.removeEventListener('load', scheduleLiveLayoutSync, true);
      bodyHost.removeEventListener('input', persistCurrentLiveFormState, true);
      bodyHost.removeEventListener('change', persistCurrentLiveFormState, true);
      window.removeEventListener('routewillchange', handleRouteWillChange);
      window.removeEventListener('routechange', handleRouteChange);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
    }
  };
}
