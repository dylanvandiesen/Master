const HOME_VIEW = 'home';
const CONTACT_VIEW = 'contact';
const PANEL_VIEWS = new Set(['work', 'about', 'contact']);
const HEIGHT_LOCKED_PANEL_VIEWS = new Set(['about', 'contact']);
const TYPOGRAPHY_STABLE_VIEWS = new Set(['about', CONTACT_VIEW]);
const ROUTE_REVEAL_VIEWS = new Set([CONTACT_VIEW]);
const ROUTE_REVEALED_CLASS = 'is-route-revealed';
const HOME_ASPECT_LOCK_CLASS = 'is-home-aspect-locked';
const PANEL_SHELL_INLINE_SIZES = {
  work: '1200px',
  about: '1000px',
  contact: '472px'
};
const ROUTE_VIEWS = new Set([HOME_VIEW, ...PANEL_VIEWS]);
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const SHELL_RESIZE_MS = 760;
const CONTENT_FADE_MS = 880;
const CONTENT_FADE_DELAY_MS = 72;
const TRANSITION_BUFFER_MS = 80;
const LIVE_SETTLE_MS = 360;

function getPrimaryRoute(pathname = location.pathname) {
  const [segment] = pathname.split('/').filter(Boolean);
  return PANEL_VIEWS.has(segment) ? segment : HOME_VIEW;
}

function getAspectRatio(width, height) {
  const safeWidth = Number(width) || 0;
  const safeHeight = Number(height) || 0;

  if (!safeWidth || !safeHeight) {
    return 0;
  }

  return safeWidth / safeHeight;
}

function afterNextPaint() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
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

function primeRouteState(routeRoot, view) {
  if (!(routeRoot instanceof HTMLElement)) {
    return;
  }

  routeRoot.classList.remove(ROUTE_REVEALED_CLASS);

  if (TYPOGRAPHY_STABLE_VIEWS.has(view)) {
    // Keep layout-affecting route typography active from the first measurement/mount.
    routeRoot.classList.add('is-settled');
    return;
  }

  routeRoot.classList.remove('is-settled');
}

function revealRouteContent(routeRoot, view) {
  if (!(routeRoot instanceof HTMLElement) || !ROUTE_REVEAL_VIEWS.has(view)) {
    return;
  }

  routeRoot.classList.add(ROUTE_REVEALED_CLASS);
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

function getShellChromeHeight(shell) {
  const styles = window.getComputedStyle(shell);
  const paddingTop = parseFloat(styles.paddingTop) || 0;
  const paddingBottom = parseFloat(styles.paddingBottom) || 0;
  const borderTop = parseFloat(styles.borderTopWidth) || 0;
  const borderBottom = parseFloat(styles.borderBottomWidth) || 0;
  return paddingTop + paddingBottom + borderTop + borderBottom;
}

function getShellChromeWidth(shell) {
  const styles = window.getComputedStyle(shell);
  const paddingLeft = parseFloat(styles.paddingLeft) || 0;
  const paddingRight = parseFloat(styles.paddingRight) || 0;
  const borderLeft = parseFloat(styles.borderLeftWidth) || 0;
  const borderRight = parseFloat(styles.borderRightWidth) || 0;
  return paddingLeft + paddingRight + borderLeft + borderRight;
}

function createMeasureHost(shellSlot) {
  const host = document.createElement('div');
  host.className = 'panel-route-measure-host';
  host.setAttribute('aria-hidden', 'true');
  host.innerHTML = `
    <div class="panel-route-measure-shell spacer">
      <div class="panel-route-measure-body"></div>
    </div>
  `;
  shellSlot.append(host);

  return {
    host,
    shell: host.querySelector('.panel-route-measure-shell'),
    body: host.querySelector('.panel-route-measure-body')
  };
}

export function setupPanelRouteTransition({
  rootSelector = '.content-container',
  shellSlotSelector = '[data-panel-shell-slot]',
  shellSelector = '[data-panel-shell]',
  scrollerSelector = '[data-panel-scroller]',
  swapSelector = '[data-panel-swap]',
  scrollSelector = '[data-panel-scroll]',
  bodySelector = '[data-panel-body]',
  overlaySelector = '[data-panel-overlay]',
  homeOverlaySelector = '[data-home-overlay]',
  observeLazyElements = null
} = {}) {
  const root = document.querySelector(rootSelector);
  const shellSlot = root?.querySelector(shellSlotSelector);
  const shell = root?.querySelector(shellSelector);
  const scroller = root?.querySelector(scrollerSelector);
  const swapHost = root?.querySelector(swapSelector);
  const scrollHost = root?.querySelector(scrollSelector);
  const bodyHost = root?.querySelector(bodySelector);
  const overlayHost = root?.querySelector(overlaySelector);
  const homeContainer = root?.querySelector('#home.tab-pane-container');
  const homeOverlayHost = root?.querySelector(homeOverlaySelector);
  const routeTemplates = new Map(
    Array.from(ROUTE_VIEWS, (view) => [view, document.getElementById(`route-template-${view}`)])
  );
  const observeLazy = typeof observeLazyElements === 'function'
    ? observeLazyElements
    : window.observeLazyElements;

  if (!root || !shellSlot || !shell || !scroller || !swapHost || !scrollHost || !bodyHost || !overlayHost || !homeContainer || !homeOverlayHost) {
    return null;
  }

  if (Array.from(routeTemplates.values()).some((template) => !(template instanceof HTMLTemplateElement))) {
    return null;
  }

  const reducedMotion = window.matchMedia?.(REDUCED_MOTION_QUERY);
  const routeFormState = new Map();
  const routeScrollState = new Map();
  const measure = createMeasureHost(shellSlot);
  let activeView = getPrimaryRoute(location.pathname);
  let transitionToken = 0;
  let settleToken = 0;
  let cleanupTimer = 0;
  let currentShellInlineSize = 0;
  let currentShellContentHeight = 0;
  let scrollRestoreToken = 0;
  let transitionScaleFrame = 0;
  let syncTimer = 0;
  let contactViewportFrame = 0;
  let contactBlurTimer = 0;
  let focusedContactControl = null;
  let isTransitionRunning = false;
  let queuedView = null;
  let queuedScrollTop = null;

  function setMeasureShellView(view) {
    if (measure.shell instanceof HTMLElement) {
      measure.shell.dataset.panelView = view;
    }
  }

  function clearMeasureShellView() {
    if (measure.shell instanceof HTMLElement) {
      delete measure.shell.dataset.panelView;
      measure.shell.style.removeProperty('--panel-shell-inline-size');
    }
  }

  function setShellHomeAspectRatio(ratio) {
    if (Number.isFinite(ratio) && ratio > 0) {
      shell.classList.add(HOME_ASPECT_LOCK_CLASS);
      shell.style.setProperty('--panel-shell-home-aspect-ratio', `${ratio}`);
      return;
    }

    shell.classList.remove(HOME_ASPECT_LOCK_CLASS);
    shell.style.removeProperty('--panel-shell-home-aspect-ratio');
  }

  function setTransitionState({
    currentView = activeView,
    nextView = activeView,
    isRunning = false
  } = {}) {
    const mode = currentView === HOME_VIEW || nextView === HOME_VIEW
      ? 'home'
      : 'panel';
    const phase = isRunning
      ? (nextView === HOME_VIEW ? 'to-home' : currentView === HOME_VIEW ? 'from-home' : 'panel-to-panel')
      : 'idle';

    root.dataset.routeTransitionMode = mode;
    root.dataset.routeTransitionPhase = phase;
    root.dataset.routeCurrent = currentView;
    root.dataset.routeNext = nextView;
    root.dataset.headerBrand = isRunning
      ? (currentView !== HOME_VIEW ? 'visible' : 'hidden')
      : (nextView === HOME_VIEW ? 'hidden' : 'visible');
    root.classList.toggle('is-route-transition-running', isRunning);
  }

  function shouldFreezeForTransition(view, { involvesHome = false } = {}) {
    if (!PANEL_VIEWS.has(view)) {
      return false;
    }

    return involvesHome || PANEL_VIEWS.has(view);
  }

  function isContactControl(target) {
    return target instanceof HTMLElement
      && target.matches('input, textarea, select')
      && Boolean(target.closest(`[data-route-view="${CONTACT_VIEW}"]`));
  }

  function getViewportMetrics() {
    const visualViewport = window.visualViewport;
    const viewportHeight = visualViewport?.height || window.innerHeight;
    const viewportTop = visualViewport?.offsetTop || 0;
    const viewportBottom = viewportHeight + viewportTop;
    const scrollRect = scrollHost.getBoundingClientRect();
    const obscuredBottom = Math.max(0, scrollRect.bottom - viewportBottom);

    return {
      viewportHeight,
      viewportTop,
      viewportBottom,
      obscuredBottom
    };
  }

  function syncContactViewportState() {
    const { viewportHeight, viewportTop, obscuredBottom } = getViewportMetrics();
    const isContactActive = activeView === CONTACT_VIEW;
    const focusInset = isContactActive ? obscuredBottom : 0;

    root.style.setProperty('--contact-viewport-height', `${viewportHeight}px`);
    root.style.setProperty('--contact-viewport-offset-top', `${viewportTop}px`);
    root.style.setProperty('--contact-keyboard-inset', `${focusInset}px`);
    root.style.setProperty('--contact-obscured-bottom', `${focusInset}px`);
    root.style.setProperty('--contact-focus-safe-area', `${focusInset + 24}px`);
    root.dataset.contactKeyboard = isContactActive && focusInset > 0 ? 'open' : 'closed';
  }

  function ensureContactControlVisibility(control, { immediate = false } = {}) {
    if (activeView !== CONTACT_VIEW || !isContactControl(control) || !control.isConnected) {
      return;
    }

    const controlRect = control.getBoundingClientRect();
    const scrollRect = scrollHost.getBoundingClientRect();
    const { viewportBottom, obscuredBottom } = getViewportMetrics();
    const visibleTop = scrollRect.top + 18;
    const visibleBottom = Math.min(scrollRect.bottom - Math.max(12, obscuredBottom), viewportBottom - 18);

    let delta = 0;

    if (controlRect.bottom > visibleBottom) {
      delta = controlRect.bottom - visibleBottom;
    } else if (controlRect.top < visibleTop) {
      delta = controlRect.top - visibleTop;
    }

    if (Math.abs(delta) < 1) {
      return;
    }

    const nextScrollTop = Math.max(0, scrollHost.scrollTop + delta);
    routeScrollState.set(CONTACT_VIEW, nextScrollTop);

    if (immediate || scrollHost.classList.contains('is-settling-live') || scrollHost.classList.contains('is-restoring-scroll')) {
      scrollHost.classList.add('is-restoring-scroll');
      scrollHost.scrollTop = nextScrollTop;
      void afterNextPaint().then(() => {
        if (!scrollHost.classList.contains('is-settling-live')) {
          scrollHost.classList.remove('is-restoring-scroll');
        }
      });
      return;
    }

    scrollHost.scrollTo({
      top: nextScrollTop,
      behavior: 'smooth'
    });
  }

  function scheduleContactViewportSync({ target = focusedContactControl, immediate = false } = {}) {
    window.cancelAnimationFrame(contactViewportFrame);
    contactViewportFrame = window.requestAnimationFrame(() => {
      contactViewportFrame = 0;
      const liveTarget = isContactControl(target) && target.isConnected ? target : null;

      if (!liveTarget && focusedContactControl && !focusedContactControl.isConnected) {
        focusedContactControl = null;
      }

      syncContactViewportState();

      if (liveTarget) {
        ensureContactControlVisibility(liveTarget, { immediate });
      }
    });
  }

  function shouldBypassSyncForContactViewport() {
    if (activeView !== CONTACT_VIEW) {
      return false;
    }

    const { obscuredBottom } = getViewportMetrics();
    return Boolean(focusedContactControl && focusedContactControl.isConnected) || obscuredBottom > 0;
  }

  function handleContactFocusIn(event) {
    if (!isContactControl(event.target)) {
      return;
    }

    window.clearTimeout(contactBlurTimer);
    focusedContactControl = event.target;
    scheduleContactViewportSync({ target: focusedContactControl, immediate: true });
    window.setTimeout(() => {
      if (focusedContactControl === event.target) {
        scheduleContactViewportSync({ target: event.target });
      }
    }, 180);
  }

  function handleContactFocusOut(event) {
    if (!isContactControl(event.target)) {
      return;
    }

    window.clearTimeout(contactBlurTimer);
    contactBlurTimer = window.setTimeout(() => {
      const activeElement = document.activeElement;
      focusedContactControl = isContactControl(activeElement) ? activeElement : null;
      scheduleContactViewportSync({ target: focusedContactControl, immediate: true });
    }, 80);
  }

  function setShellSize({ inlineSize = currentShellInlineSize, blockSize = currentShellContentHeight } = {}, { immediate = false } = {}) {
    currentShellInlineSize = Math.max(0, Number(inlineSize) || 0);
    currentShellContentHeight = Math.max(0, Number(blockSize) || 0);

    if (immediate) {
      shell.classList.add('is-sizing-immediate');
    }

    shell.style.inlineSize = `${currentShellInlineSize}px`;
    shell.style.setProperty('--panel-shell-block-size', `${currentShellContentHeight}px`);

    if (immediate) {
      shell.getBoundingClientRect();
      shell.classList.remove('is-sizing-immediate');
    }
  }

  function setShellContentHeight(height, { immediate = false } = {}) {
    setShellSize({ blockSize: height }, { immediate });
  }

  function measureShellInlineSize(view) {
    if (!PANEL_VIEWS.has(view) || !measure.shell) {
      return 0;
    }

    const inlineSize = PANEL_SHELL_INLINE_SIZES[view];

    if (!inlineSize) {
      return 0;
    }

    setMeasureShellView(view);
    measure.shell.style.setProperty('--panel-shell-inline-size', inlineSize);
    const width = measure.shell.getBoundingClientRect().width || 0;
    clearMeasureShellView();
    return width;
  }

  function setRouteState(view, { collapsed = view === HOME_VIEW, preserveShellSize = false, currentView = activeView } = {}) {
    const shellIsHidden = view === HOME_VIEW && collapsed;

    root.dataset.route = view;
    homeContainer.inert = view !== HOME_VIEW;
    homeContainer.setAttribute('aria-hidden', view === HOME_VIEW ? 'false' : 'true');
    shellSlot.inert = shellIsHidden;
    shellSlot.setAttribute('aria-hidden', shellIsHidden ? 'true' : 'false');
    shell.classList.toggle('is-collapsed', collapsed);
    shell.dataset.panelView = view;
    shell.setAttribute('aria-hidden', shellIsHidden ? 'true' : 'false');
    setTransitionState({ currentView, nextView: view, isRunning: isTransitionRunning });

    if (collapsed && !preserveShellSize) {
      currentShellInlineSize = 0;
      currentShellContentHeight = 0;
      shell.style.inlineSize = '0px';
      shell.style.setProperty('--panel-shell-block-size', '0px');
    }
  }

  function restoreScrollPosition(scrollTop, { immediate = false } = {}) {
    const nextScrollTop = Math.max(0, Math.round(scrollTop));
    const token = ++scrollRestoreToken;

    scrollHost.classList.add('is-restoring-scroll');
    scrollHost.scrollTop = nextScrollTop;

    if (immediate) {
      scrollHost.getBoundingClientRect();
      scrollHost.classList.remove('is-restoring-scroll');
      return Promise.resolve();
    }

    return afterNextPaint().then(() => {
      if (token !== scrollRestoreToken) {
        return;
      }

      scrollHost.scrollTop = nextScrollTop;

      return afterNextPaint().then(() => {
        if (token !== scrollRestoreToken) {
          return;
        }

        scrollHost.classList.remove('is-restoring-scroll');
      });
    });
  }

  function instantiateRoute(view) {
    const template = routeTemplates.get(view);

    if (!(template instanceof HTMLTemplateElement)) {
      return null;
    }

    const fragment = template.content.cloneNode(true);
    const routeRoot = fragment.firstElementChild;

    if (!(routeRoot instanceof HTMLElement)) {
      return null;
    }

    routeRoot.dataset.routeView = view;
    primeRouteState(routeRoot, view);
    applyFormState(routeRoot, routeFormState.get(view));

    return { fragment, routeRoot };
  }

  function createLiveLayer(view) {
    const mounted = instantiateRoute(view);

    if (!mounted) {
      return null;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'panel-content is-current is-visible';
    wrapper.dataset.view = view;

    const viewport = document.createElement('div');
    viewport.className = 'panel-live-viewport';

    const track = document.createElement('div');
    track.className = 'panel-live-track';
    track.append(mounted.routeRoot);
    viewport.append(track);
    wrapper.append(viewport);

    return {
      wrapper,
      routeRoot: mounted.routeRoot
    };
  }

  function mountHomeView({ reset = false } = {}) {
    const existingRouteRoot = homeContainer.querySelector(`[data-route-view="${HOME_VIEW}"]`);

    if (reset && existingRouteRoot) {
      homeContainer.replaceChildren();
    }

    if (!reset && existingRouteRoot) {
      return existingRouteRoot;
    }

    const mounted = instantiateRoute(HOME_VIEW);
    if (!mounted) {
      return null;
    }

    homeContainer.replaceChildren(mounted.routeRoot);
    observeLazy?.(mounted.routeRoot);
    return mounted.routeRoot;
  }

  function unmountHomeView() {
    homeContainer.replaceChildren();
  }

  function freezeAnimatedState(scope) {
    if (!(scope instanceof Element)) {
      return;
    }

    scope.getAnimations({ subtree: true }).forEach((animation) => {
      try {
        animation.commitStyles?.();
      } catch (error) {
        // Ignore animations that cannot commit their current styles.
      }

      try {
        animation.cancel();
      } catch (error) {
        // Ignore animations that cannot be cancelled cleanly.
      }
    });
  }

  function createHomeExitLayer() {
    const routeRoot = getLiveRouteRoot(HOME_VIEW);

    if (!(routeRoot instanceof HTMLElement)) {
      return null;
    }

    freezeAnimatedState(routeRoot.querySelector('.intro-container') ?? routeRoot);

    const layer = document.createElement('div');
    layer.className = 'home-transition-content';
    layer.append(routeRoot);

    return layer;
  }

  function getLiveRouteRoot(view) {
    if (view === HOME_VIEW) {
      return homeContainer.querySelector(`[data-route-view="${HOME_VIEW}"]`);
    }

    return bodyHost.querySelector(`.panel-content.is-current [data-route-view="${view}"]`);
  }

  function rememberActivePanelState({ scrollTop = scrollHost.scrollTop } = {}) {
    if (!PANEL_VIEWS.has(activeView)) {
      return;
    }

    const liveWrapper = bodyHost.querySelector('.panel-content.is-current');

    if (!liveWrapper) {
      return;
    }

    routeScrollState.set(activeView, Math.max(0, Math.round(scrollTop)));
    const formState = captureFormState(liveWrapper);

    if (formState?.length) {
      routeFormState.set(activeView, formState);
    }
  }

  function mountPanelView(view, { restoreScroll = true, scrollTopOverride = null } = {}) {
    bodyHost.replaceChildren();

    if (!PANEL_VIEWS.has(view)) {
      restoreScrollPosition(0, { immediate: true });
      return null;
    }

    const liveLayer = createLiveLayer(view);

    if (!liveLayer) {
      return null;
    }

    bodyHost.append(liveLayer.wrapper);

    const scrollTop = Number.isFinite(scrollTopOverride)
      ? Math.max(0, Math.round(scrollTopOverride))
      : Math.max(0, Math.round(routeScrollState.get(view) ?? 0));
    if (restoreScroll) {
      void restoreScrollPosition(scrollTop);
    }
    observeLazy?.(liveLayer.routeRoot);
    void afterNextPaint().then(() => {
      observeLazy?.(liveLayer.routeRoot);
    });

    return {
      ...liveLayer,
      scrollTop
    };
  }

  function measureRouteContentHeight(view) {
    if (!PANEL_VIEWS.has(view)) {
      measure.body.replaceChildren();
      clearMeasureShellView();
      return 0;
    }

    const liveLayer = createLiveLayer(view);

    if (!liveLayer || !measure.body || !measure.shell) {
      measure.body.replaceChildren();
      clearMeasureShellView();
      return 0;
    }

    setMeasureShellView(view);
    measure.body.replaceChildren(liveLayer.wrapper);

    const shellSlotRect = shellSlot.getBoundingClientRect();
    const shellChromeHeight = getShellChromeHeight(measure.shell);
    const shellSlotChromeHeight = getShellChromeHeight(shellSlot);
    const maxShellBlockSize = Math.max(0, Math.floor(shellSlotRect.height - shellSlotChromeHeight));
    const routeRoot = liveLayer.routeRoot;
    const routeRectHeight = routeRoot.getBoundingClientRect().height || 0;
    const measuredHeight = HEIGHT_LOCKED_PANEL_VIEWS.has(view)
      ? routeRectHeight
      : Math.max(
          measure.body.scrollHeight || 0,
          liveLayer.wrapper.scrollHeight || 0,
          routeRoot.scrollHeight || 0,
          routeRectHeight
        );

    measure.body.replaceChildren();
    clearMeasureShellView();
    return Math.min(measuredHeight + shellChromeHeight, maxShellBlockSize);
  }

  function measureRouteLayerSize(
    view,
    { shellInlineSize = 0, shellBlockSize = 0, freezeToShellViewport = false } = {}
  ) {
    if (!PANEL_VIEWS.has(view) || !freezeToShellViewport) {
      return null;
    }

    setMeasureShellView(view);
    const chromeWidth = getShellChromeWidth(measure.shell);
    const chromeHeight = getShellChromeHeight(measure.shell);
    clearMeasureShellView();

    if (!shellInlineSize || !shellBlockSize) {
      return null;
    }

    return {
      width: Math.max(0, shellInlineSize - chromeWidth),
      height: Math.max(0, shellBlockSize - chromeHeight)
    };
  }

  function createFrozenLayer(liveWrapper, view, scrollTop, stateClass) {
    if (!liveWrapper) {
      return null;
    }

    const routeRoot = liveWrapper.querySelector('[data-route-view]');

    if (!(routeRoot instanceof HTMLElement)) {
      return null;
    }

    const layer = document.createElement('div');
    layer.className = `panel-content ${stateClass}`;
    layer.dataset.view = view;
    layer.style.setProperty('--panel-layer-scroll-top', `${-Math.max(0, scrollTop)}px`);

    const viewport = document.createElement('div');
    viewport.className = 'panel-freeze-viewport';

    const track = document.createElement('div');
    track.className = 'panel-freeze-track';

    const routeClone = routeRoot.cloneNode(true);

    const formState = captureFormState(liveWrapper);
    if (formState?.length) {
      applyFormState(routeClone, formState);
    }

    track.append(routeClone);
    viewport.append(track);
    layer.append(viewport);

    return layer;
  }

  function freezeLayerSize(layer, source) {
    if (!(layer instanceof HTMLElement) || !PANEL_VIEWS.has(layer.dataset.view)) {
      return;
    }

    const size = source instanceof HTMLElement
      ? {
          width: source.getBoundingClientRect().width,
          height: source.getBoundingClientRect().height
        }
      : source;

    if (!size?.width || !size?.height) {
      return;
    }

    layer.dataset.freezeSize = 'true';
    layer.style.setProperty('--panel-layer-inline-size', `${size.width}px`);
    layer.style.setProperty('--panel-layer-block-size', `${size.height}px`);
  }

  function clearLayerFreeze(layer) {
    if (!(layer instanceof HTMLElement)) {
      return;
    }

    delete layer.dataset.freezeSize;
    layer.style.removeProperty('--panel-layer-inline-size');
    layer.style.removeProperty('--panel-layer-block-size');
    layer.style.removeProperty('--panel-layer-fit-scale');
    layer.style.removeProperty('--panel-layer-offset-x');
    layer.style.removeProperty('--panel-layer-offset-y');
  }

  function pinFrozenLayerToRect(layer, referenceRect) {
    if (!(layer instanceof HTMLElement) || layer.dataset.freezeSize !== 'true' || !referenceRect) {
      return;
    }

    const layerRect = layer.getBoundingClientRect();
    const deltaX = Math.round((referenceRect.left - layerRect.left) * 1000) / 1000;
    const deltaY = Math.round((referenceRect.top - layerRect.top) * 1000) / 1000;

    layer.style.setProperty('--panel-layer-offset-x', `${deltaX}px`);
    layer.style.setProperty('--panel-layer-offset-y', `${deltaY}px`);
  }

  function clearOverlay({ preserveSettlingLive = false } = {}) {
    window.clearTimeout(cleanupTimer);
    cleanupTimer = 0;
    window.cancelAnimationFrame(transitionScaleFrame);
    transitionScaleFrame = 0;
    overlayHost.replaceChildren();
    homeOverlayHost.replaceChildren();
    swapHost.classList.remove('is-transitioning');
    swapHost.classList.remove('is-home-route-transition');
    shell.classList.remove('is-shell-transitioning');
    shell.classList.remove('is-expanding-from-home', 'is-collapsing-to-home');
    setShellHomeAspectRatio(0);
    setTransitionState({ currentView: activeView, nextView: activeView, isRunning: false });
    if (!preserveSettlingLive) {
      scrollHost.classList.remove('is-settling-live');
    }
  }

  function prepareLiveHandoff(layer, referenceRect, { lockScroll = true, transformOrigin = '50% 50%' } = {}) {
    if (!(layer instanceof HTMLElement) || !referenceRect) {
      return false;
    }

    const liveRect = layer.getBoundingClientRect();
    const deltaX = Math.round((referenceRect.left - liveRect.left) * 1000) / 1000;
    const deltaY = Math.round((referenceRect.top - liveRect.top) * 1000) / 1000;
    const scaleX = liveRect.width ? referenceRect.width / liveRect.width : 1;
    const scaleY = liveRect.height ? referenceRect.height / liveRect.height : 1;
    const supportsScaleHandoff = [scaleX, scaleY].every((value) => Number.isFinite(value) && value > 0)
      && Math.abs(scaleX - 1) <= 0.08
      && Math.abs(scaleY - 1) <= 0.08;
    const needsScaleHandoff = supportsScaleHandoff
      && (Math.abs(scaleX - 1) >= 0.002 || Math.abs(scaleY - 1) >= 0.002);

    if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5 && !needsScaleHandoff) {
      return false;
    }

    if (lockScroll) {
      scrollHost.classList.add('is-settling-live');
    }
    layer.classList.add('is-settling');
    layer.style.transition = 'none';
    layer.style.transformOrigin = transformOrigin;
    layer.style.transform = needsScaleHandoff
      ? `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`
      : `translate(${deltaX}px, ${deltaY}px)`;
    layer.getBoundingClientRect();
    return true;
  }

  function animateLiveHandoff(layer, { releaseScrollLock = true } = {}) {
    if (!(layer instanceof HTMLElement)) {
      return Promise.resolve();
    }

    return afterNextPaint().then(() => {
      layer.style.transition = `transform ${LIVE_SETTLE_MS}ms var(--panel-resize-easing)`;
      layer.style.transform = 'translate(0px, 0px)';

      return new Promise((resolve) => {
        window.setTimeout(() => {
          layer.classList.remove('is-settling');
          layer.style.removeProperty('transform');
          layer.style.removeProperty('transition');
          layer.style.removeProperty('transform-origin');
          if (releaseScrollLock) {
            scrollHost.classList.remove('is-settling-live');
          }
          resolve();
        }, LIVE_SETTLE_MS + 34);
      });
    });
  }

  function syncFrozenLayerScale(layer, availableSize) {
    if (!(layer instanceof HTMLElement) || layer.dataset.freezeSize !== 'true') {
      return;
    }

    const frozenWidth = parseFloat(layer.style.getPropertyValue('--panel-layer-inline-size')) || 0;

    if (!frozenWidth || !availableSize?.width) {
      layer.style.setProperty('--panel-layer-fit-scale', '1');
      return;
    }

    const fitScale = availableSize.width / frozenWidth;

    layer.style.setProperty('--panel-layer-fit-scale', `${fitScale}`);
  }

  function startTransitionScaleSync(layers) {
    window.cancelAnimationFrame(transitionScaleFrame);

    const step = () => {
      if (!swapHost.classList.contains('is-transitioning')) {
        transitionScaleFrame = 0;
        return;
      }

      const availableSize = {
        width: scrollHost.getBoundingClientRect().width || 0,
        height: scrollHost.getBoundingClientRect().height || 0
      };

      layers.forEach((layer) => syncFrozenLayerScale(layer, availableSize));
      transitionScaleFrame = window.requestAnimationFrame(step);
    };

    step();
  }

  function scheduleSettle(view) {
    const currentSettleToken = ++settleToken;

    return afterNextPaint().then(() => {
      if (currentSettleToken !== settleToken) {
        return;
      }

      const routeRoot = getLiveRouteRoot(view);
      routeRoot?.classList.add('is-settled');
      revealRouteContent(routeRoot, view);
    });
  }

  function finalizeTransitionQueue() {
    isTransitionRunning = false;
    setTransitionState({ currentView: activeView, nextView: activeView, isRunning: false });

    if (queuedView && queuedView !== activeView) {
      const queuedNextView = queuedView;
      const queuedNextScrollTop = queuedScrollTop;
      queuedView = null;
      queuedScrollTop = null;
      void transitionTo(queuedNextView, { queuedScrollTopOverride: queuedNextScrollTop });
      return;
    }

    queuedView = null;
    queuedScrollTop = null;
  }

  async function transitionTo(view, { immediate = false, queuedScrollTopOverride = null } = {}) {
    const nextView = PANEL_VIEWS.has(view) ? view : HOME_VIEW;

    if (isTransitionRunning || scrollHost.classList.contains('is-settling-live')) {
      queuedView = nextView;
      queuedScrollTop = PANEL_VIEWS.has(nextView)
        ? Math.max(0, Math.round(routeScrollState.get(nextView) ?? 0))
        : 0;
      return;
    }

    const currentView = activeView;
    const involvesHome = currentView === HOME_VIEW || nextView === HOME_VIEW;
    const shouldScaleWithShell = PANEL_VIEWS.has(currentView) || PANEL_VIEWS.has(nextView);
    const currentScrollTop = PANEL_VIEWS.has(currentView)
      ? Math.max(0, Math.round(routeScrollState.get(currentView) ?? scrollHost.scrollTop))
      : 0;
    const nextScrollTop = PANEL_VIEWS.has(nextView)
      ? Math.max(0, Math.round(queuedScrollTopOverride ?? routeScrollState.get(nextView) ?? 0))
      : 0;

    if (nextView === currentView) {
      return;
    }

    isTransitionRunning = true;
    setTransitionState({ currentView, nextView, isRunning: true });

    if (currentView === HOME_VIEW) {
      mountHomeView();
    }

    if (nextView === HOME_VIEW) {
      mountHomeView({ reset: true });
    }

    rememberActivePanelState({ scrollTop: currentScrollTop });

    const token = ++transitionToken;
    const currentWrapper = bodyHost.querySelector('.panel-content.is-current');
    const currentRouteRoot = currentWrapper?.querySelector('[data-route-view]');
    const currentVisibleViewportRect = swapHost.getBoundingClientRect();
    const homeExitLayer = currentView === HOME_VIEW
      ? createHomeExitLayer()
      : null;
    const exitLayer = PANEL_VIEWS.has(currentView)
      ? createFrozenLayer(currentWrapper, currentView, currentScrollTop, 'is-exiting')
      : null;
    const startHeight = currentShellContentHeight;

    clearOverlay();

    if (immediate || reducedMotion?.matches) {
      setRouteState(nextView, {
        collapsed: nextView === HOME_VIEW,
        currentView
      });
      const liveLayer = mountPanelView(nextView, {
        scrollTopOverride: nextScrollTop
      });
      revealRouteContent(liveLayer?.routeRoot, nextView);
      activeView = nextView;
      setShellSize({
        inlineSize: measureShellInlineSize(nextView),
        blockSize: measureRouteContentHeight(nextView)
      }, { immediate: true });
      if (currentView === HOME_VIEW && nextView !== HOME_VIEW) {
        unmountHomeView();
      }
      await scheduleSettle(nextView);
      finalizeTransitionQueue();
      return;
    }

    shell.classList.add('is-shell-transitioning');
    shell.classList.toggle('is-expanding-from-home', currentView === HOME_VIEW && nextView !== HOME_VIEW);
    shell.classList.toggle('is-collapsing-to-home', nextView === HOME_VIEW);
    swapHost.classList.add('is-transitioning');
    swapHost.classList.toggle('is-home-route-transition', involvesHome);

    if (homeExitLayer) {
      homeExitLayer.classList.add('is-visible');
      homeOverlayHost.append(homeExitLayer);
    }

    if (exitLayer) {
      if (shouldFreezeForTransition(currentView, { involvesHome })) {
        freezeLayerSize(exitLayer, currentVisibleViewportRect ?? currentWrapper ?? currentRouteRoot);
      }
      exitLayer.classList.add('is-visible');
      overlayHost.append(exitLayer);
      pinFrozenLayerToRect(exitLayer, currentVisibleViewportRect);
    }

    setRouteState(nextView, {
      collapsed: false,
      preserveShellSize: nextView === HOME_VIEW,
      currentView
    });
    const endWidth = measureShellInlineSize(nextView);
    const endHeight = measureRouteContentHeight(nextView);
    const homeAspectRatio = currentView === HOME_VIEW
      ? getAspectRatio(endWidth, endHeight)
      : getAspectRatio(currentShellInlineSize, startHeight);

    if (involvesHome) {
      setShellHomeAspectRatio(homeAspectRatio);
    }

    const nextRouteSize = measureRouteLayerSize(nextView, {
      shellInlineSize: endWidth,
      shellBlockSize: endHeight,
      freezeToShellViewport: shouldScaleWithShell
    });
    setShellSize({ inlineSize: currentShellInlineSize, blockSize: startHeight }, { immediate: true });
    const liveLayer = mountPanelView(nextView, {
      restoreScroll: false,
      scrollTopOverride: nextScrollTop
    });
    activeView = nextView;
    if (nextView !== CONTACT_VIEW) {
      focusedContactControl = null;
    }

    liveLayer?.routeRoot?.classList.add('is-settled');
    revealRouteContent(liveLayer?.routeRoot, nextView);

    const enterLayer = PANEL_VIEWS.has(nextView) && liveLayer
      ? createFrozenLayer(liveLayer.wrapper, nextView, nextScrollTop, 'is-entering')
      : null;

    const liveViewport = liveLayer?.wrapper?.querySelector('.panel-live-viewport');
    const nextFreezeSource = nextRouteSize ?? liveViewport ?? liveLayer?.routeRoot;

    const shouldFreezeLiveLayer = PANEL_VIEWS.has(nextView);
    const shouldHideLiveLayerUntilHandoff = PANEL_VIEWS.has(nextView);

    if (shouldFreezeLiveLayer) {
      freezeLayerSize(liveLayer?.wrapper, nextFreezeSource);
    }

    if (shouldHideLiveLayerUntilHandoff) {
      liveLayer?.wrapper?.classList.add('is-live-hidden');
    }

    if (enterLayer) {
      if (shouldFreezeForTransition(nextView, { involvesHome })) {
        freezeLayerSize(enterLayer, nextFreezeSource);
      }
      overlayHost.append(enterLayer);
    }

    if (shouldScaleWithShell) {
      startTransitionScaleSync([exitLayer, enterLayer, shouldFreezeLiveLayer ? liveLayer?.wrapper : null]);
    }

    setShellSize({ inlineSize: endWidth, blockSize: endHeight });
    await afterNextPaint();

    if (token !== transitionToken) {
      finalizeTransitionQueue();
      return;
    }

    homeExitLayer?.classList.remove('is-visible');
    enterLayer?.classList.add('is-visible');
    exitLayer?.classList.remove('is-visible');

    cleanupTimer = window.setTimeout(async () => {
      if (token !== transitionToken) {
        return;
      }

      const liveReferenceRect = enterLayer?.getBoundingClientRect() ?? liveLayer?.wrapper?.getBoundingClientRect();
      const shouldReleaseLiveFreezeBeforeReveal = false;

      if (shouldReleaseLiveFreezeBeforeReveal) {
        clearLayerFreeze(liveLayer?.wrapper);
        liveLayer?.wrapper?.getBoundingClientRect();
      }

      const shouldPrepareLiveHandoff = PANEL_VIEWS.has(nextView);
      const shouldLockLiveScroller = shouldPrepareLiveHandoff
        && PANEL_VIEWS.has(nextView)
        && shouldFreezeForTransition(nextView, { involvesHome });
      const preparedLiveHandoff = shouldPrepareLiveHandoff
        ? prepareLiveHandoff(liveLayer?.wrapper, liveReferenceRect, {
            lockScroll: shouldLockLiveScroller,
            transformOrigin: '50% 50%'
          })
        : false;

      if (shouldLockLiveScroller) {
        scrollHost.classList.add('is-settling-live');
      }

      if (shouldHideLiveLayerUntilHandoff) {
        liveLayer?.wrapper?.classList.add('is-handoff-reveal');
        liveLayer?.wrapper?.classList.remove('is-live-hidden');
        liveLayer?.wrapper?.getBoundingClientRect();
        if (enterLayer) {
          enterLayer.style.transitionDelay = '0ms';
          enterLayer.classList.remove('is-visible');
        }
      }

      if (preparedLiveHandoff) {
        await animateLiveHandoff(liveLayer?.wrapper, {
          releaseScrollLock: !shouldLockLiveScroller
        });
      }

      clearOverlay({ preserveSettlingLive: shouldLockLiveScroller });

      if (currentView === HOME_VIEW && nextView !== HOME_VIEW) {
        unmountHomeView();
      }

      if (PANEL_VIEWS.has(nextView)) {
        const shouldReleaseLiveFreezeForScrollRestore = shouldFreezeLiveLayer && nextScrollTop > 0;

        if (shouldReleaseLiveFreezeForScrollRestore) {
          clearLayerFreeze(liveLayer?.wrapper);
          liveLayer?.wrapper?.getBoundingClientRect();
          await afterNextPaint();
        }

        await restoreScrollPosition(nextScrollTop);
        if (shouldLockLiveScroller) {
          await afterNextPaint();
          scrollHost.classList.remove('is-settling-live');
        }
      } else {
        bodyHost.replaceChildren();
        await restoreScrollPosition(0, { immediate: true });
        setRouteState(nextView, { collapsed: true, currentView });
      }

      await scheduleSettle(nextView);
      scheduleContactViewportSync({ target: focusedContactControl, immediate: true });
      if (shouldFreezeLiveLayer && !shouldReleaseLiveFreezeBeforeReveal && nextScrollTop <= 0) {
        clearLayerFreeze(liveLayer?.wrapper);
        liveLayer?.wrapper?.getBoundingClientRect();
      }
      liveLayer?.wrapper?.classList.remove('is-handoff-reveal');
      finalizeTransitionQueue();
    }, Math.max(SHELL_RESIZE_MS, CONTENT_FADE_MS + CONTENT_FADE_DELAY_MS) + TRANSITION_BUFFER_MS);
  }

  function persistCurrentFormState() {
    if (!PANEL_VIEWS.has(activeView)) {
      return;
    }

    const liveWrapper = bodyHost.querySelector('.panel-content.is-current');

    if (!liveWrapper) {
      return;
    }

    const formState = captureFormState(liveWrapper);

    if (formState?.length) {
      routeFormState.set(activeView, formState);
    }
  }

  function persistCurrentScrollState() {
    if (!PANEL_VIEWS.has(activeView)) {
      return;
    }

    routeScrollState.set(activeView, Math.max(0, Math.round(scrollHost.scrollTop)));
  }

  function syncCurrentState() {
    transitionToken += 1;
    isTransitionRunning = false;
    clearOverlay();
    rememberActivePanelState();
    if (activeView === HOME_VIEW) {
      mountHomeView({ reset: true });
    }
    setRouteState(activeView, { collapsed: activeView === HOME_VIEW, currentView: activeView });

    const liveWrapper = bodyHost.querySelector('.panel-content.is-current');
    const shouldReuseLivePanel = PANEL_VIEWS.has(activeView)
      && liveWrapper?.dataset.view === activeView;

    if (!shouldReuseLivePanel) {
      const liveLayer = mountPanelView(activeView, {
        restoreScroll: false,
        scrollTopOverride: routeScrollState.get(activeView) ?? scrollHost.scrollTop ?? 0
      });
      revealRouteContent(liveLayer?.routeRoot, activeView);
    }

    if (PANEL_VIEWS.has(activeView)) {
      void restoreScrollPosition(routeScrollState.get(activeView) ?? scrollHost.scrollTop ?? 0, { immediate: true });
    } else {
      void restoreScrollPosition(0, { immediate: true });
    }
    setShellSize({
      inlineSize: measureShellInlineSize(activeView),
      blockSize: measureRouteContentHeight(activeView)
    }, { immediate: true });
    scrollHost.classList.remove('is-restoring-scroll');
    scheduleContactViewportSync({ target: focusedContactControl, immediate: true });
    void scheduleSettle(activeView);
  }

  function requestSyncCurrentState() {
    window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(() => {
      syncTimer = 0;

      if (isTransitionRunning || scrollHost.classList.contains('is-settling-live')) {
        requestSyncCurrentState();
        return;
      }

      if (shouldBypassSyncForContactViewport()) {
        scheduleContactViewportSync({ target: focusedContactControl, immediate: true });
        return;
      }

      syncCurrentState();
    }, 140);
  }

  function handleRouteChange(event) {
    const nextView = getPrimaryRoute(event.detail?.path);
    void transitionTo(nextView);
  }

  function handleScroll() {
    if (
      scrollHost.classList.contains('is-restoring-scroll')
      || isTransitionRunning
      || scrollHost.classList.contains('is-settling-live')
    ) {
      return;
    }

    persistCurrentScrollState();
  }

  mountHomeView();
  setRouteState(activeView, { collapsed: activeView === HOME_VIEW, currentView: activeView });
  mountPanelView(activeView);
  setShellSize({
    inlineSize: measureShellInlineSize(activeView),
    blockSize: measureRouteContentHeight(activeView)
  }, { immediate: true });
  void scheduleSettle(activeView);

  window.addEventListener('routechange', handleRouteChange);
  scrollHost.addEventListener('scroll', handleScroll, { passive: true });
  bodyHost.addEventListener('input', persistCurrentFormState, true);
  bodyHost.addEventListener('change', persistCurrentFormState, true);
  bodyHost.addEventListener('focusin', handleContactFocusIn, true);
  bodyHost.addEventListener('focusout', handleContactFocusOut, true);
  window.addEventListener('resize', requestSyncCurrentState, { passive: true });
  window.addEventListener('orientationchange', requestSyncCurrentState, { passive: true });
  window.visualViewport?.addEventListener('resize', requestSyncCurrentState, { passive: true });
  scheduleContactViewportSync({ immediate: true });

  return {
    destroy() {
      settleToken += 1;
      clearOverlay();
      window.clearTimeout(syncTimer);
      window.clearTimeout(contactBlurTimer);
      window.cancelAnimationFrame(contactViewportFrame);
      measure.host.remove();
      window.removeEventListener('routechange', handleRouteChange);
      scrollHost.removeEventListener('scroll', handleScroll);
      bodyHost.removeEventListener('input', persistCurrentFormState, true);
      bodyHost.removeEventListener('change', persistCurrentFormState, true);
      bodyHost.removeEventListener('focusin', handleContactFocusIn, true);
      bodyHost.removeEventListener('focusout', handleContactFocusOut, true);
      window.removeEventListener('resize', requestSyncCurrentState);
      window.removeEventListener('orientationchange', requestSyncCurrentState);
      window.visualViewport?.removeEventListener('resize', requestSyncCurrentState);
    }
  };
}
