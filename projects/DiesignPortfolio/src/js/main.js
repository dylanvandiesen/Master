(() => {
  const HOME_VIEW = "home";
  const ROUTE_VIEWS = [HOME_VIEW, "work", "about", "contact"];
  const NON_HOME_VIEWS = ROUTE_VIEWS.filter((view) => view !== HOME_VIEW);
  const CONTENT_FADE_MS = 620;
  const CONTENT_FADE_DELAY_MS = 72;
  const STATIC_ENTRY_PATTERN = /\/(?:index|demo)\.html$/;
  const routes = {
    home: {
      label: "Home",
      status: "Shell closed",
      render: () => ""
    },
    work: {
      label: "Work",
      status: "Project selection",
      sizing: [
        { minWidth: 0, widthFactor: 0.98, heightFactor: 0.92 },
        { minWidth: 700, widthFactor: 0.88, heightFactor: 0.86 },
        { minWidth: 1040, widthFactor: 0.76, heightFactor: 0.82 }
      ],
      render: () => `
        <section class="hero-block">
          <p class="section-kicker">Selected work</p>
          <h2>A wider panel gives project cards enough air to breathe.</h2>
          <p class="lead">
            This route stretches horizontally for side-by-side previews, then compresses again on
            tighter views. <a href="${routeHref("contact")}">Jump to contact</a> when you are ready.
          </p>
        </section>

        <section class="case-grid" aria-label="Project cards">
          <article class="case-card wide">
            <span class="case-chip">Interface systems</span>
            <h3>Living archive for a design team</h3>
            <p class="case-copy">
              A panel-first navigation pattern that balanced dense internal references with a calm,
              scroll-contained reading surface.
            </p>
            <div class="pill-list">
              <span>Structured content</span>
              <span>History API</span>
              <span>Motion states</span>
            </div>
          </article>
          <article class="case-card">
            <span class="case-chip">Launch page</span>
            <h3>Editorial product reveal</h3>
            <p class="case-copy">
              Tuned for mobile-first timing, especially when the frame changes aspect ratio between
              stacked and gridded sections.
            </p>
          </article>I still see 
          <article class="case-card">
            <span class="case-chip">System prototype</span>
            <h3>One panel, many densities</h3>
            <p class="case-copy">
              The shell maintains a single center of gravity while route templates vary in content
              length, card density, and visual emphasis.
            </p>
          </article>
        </section>
      `
    },
    about: {
      label: "About",
      status: "Process notes",
      sizing: [
        { minWidth: 0, widthFactor: 0.76, heightFactor: 0.72 },
        { minWidth: 700, widthFactor: 0.7, heightFactor: 0.72 },
        { minWidth: 1040, widthFactor: 0.6, heightFactor: 0.76 }
      ],
      render: () => `
        <section class="hero-block">
          <p class="section-kicker">How it works</p>
          <h2>The route model is simple, but the panel feels alive.</h2>
          <p class="lead">
            Each view carries width and height factors, while natural content height keeps the
            result grounded. <a href="${routeHref("home")}">Return home</a> or continue into
            <a href="${routeHref("contact")}">contact</a>.
          </p>
        </section>

        <section class="story-grid">
          <article class="story-card">
            <p class="timeline-label">Principles</p>
            <h3>Motion follows content, not the other way around.</h3>
            <p class="body-copy">
              The panel never snaps between hard-coded presets. Instead, the next size is derived
              from available stage space, route preferences, and the measured height of the new
              content.
            </p>
            <p class="body-copy">
              That keeps the morph grounded on both small touch screens and wider desktop layouts.
            </p>
          </article>
          <article class="story-card">
            <p class="timeline-label">Sequence</p>
            <ol class="timeline">
              <li>
                <strong>Measure the next route</strong>
                <p>Render the next template in a hidden panel to discover its natural size.</p>
              </li>
              <li>
                <strong>Commit the content swap</strong>
                <p>Use <code>document.startViewTransition</code> when the browser supports it.</p>
              </li>
              <li>
                <strong>Animate the shell</strong>
                <p>The frame follows CSS width and height transitions with in-out-expo easing and no bounce.</p>
              </li>
            </ol>
          </article>
        </section>
      `
    },
    contact: {
      label: "Contact",
      status: "Availability + links",
      sizing: [
        { minWidth: 0, widthFactor: 0.52, heightFactor: 0.44 },
        { minWidth: 700, widthFactor: 0.46, heightFactor: 0.48 },
        { minWidth: 1040, widthFactor: 0.4, heightFactor: 0.54 }
      ],
      render: () => `
        <section class="hero-block">
          <p class="section-kicker">Reach out</p>
          <h2>A tighter contact state brings the focus back to the call to action.</h2>
          <p class="lead">
            This route intentionally compresses into a narrower frame. If you want more context,
            <a href="${routeHref("work")}">browse work</a> first.
          </p>
        </section>

        <section class="contact-stack">
          <article class="contact-card">
            <p class="contact-label">Email</p>
            <strong><a href="mailto:hello@diesign.example">hello@diesign.example</a></strong>
            <p>For pitches, product collaboration, and interface consulting.</p>
          </article>
          <article class="contact-card">
            <p class="contact-label">Availability</p>
            <strong>Booking for April 2026</strong>
            <p>Short discovery calls are open on Tuesdays and Thursdays.</p>
          </article>
        </section>

        <article class="availability-card">
          <p class="contact-label">Next step</p>
          <strong>Share a brief and expected launch window.</strong>
          <p class="availability-copy">
            A concise project note is enough to start. If you need a fuller walkthrough first,
            revisit <a href="${routeHref("about")}">the process notes</a>.
          </p>
        </article>
      `
    }
  };

  const panel = document.querySelector("[data-panel]");
  const stage = document.querySelector(".panel-stage");
  const swapHost = document.querySelector(".panel-swap");
  const scrollHost = document.querySelector(".panel-scroll");
  const bodyHost = document.querySelector("[data-panel-body]");
  const overlayHost = document.querySelector("[data-panel-overlay]");
  const dockLinks = Array.from(document.querySelectorAll("[data-view-link]"));

  if (!panel || !stage || !swapHost || !scrollHost || !bodyHost || !overlayHost || !dockLinks.length) {
    return;
  }

  history.scrollRestoration = "manual";

  const measure = createMeasurePanel();
  const usesHashRouting = window.location.protocol === "file:";
  const basePath = resolveBasePath(window.location.pathname);
  let activeView = "";
  let targetView = "";
  let fadeFrame = 0;
  let resizeFrame = 0;
  let navigationToken = 0;
  let contentCleanupTimer = 0;

  function resolveView(value) {
    return Object.prototype.hasOwnProperty.call(routes, value) ? value : HOME_VIEW;
  }

  function isPanelView(view) {
    return view !== HOME_VIEW;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function normalizePathname(pathname) {
    const stripped = pathname.replace(STATIC_ENTRY_PATTERN, "");

    if (!stripped) {
      return "/";
    }

    return stripped === "/" ? "/" : stripped.replace(/\/+$/, "") || "/";
  }

  function resolveBasePath(pathname) {
    if (usesHashRouting) {
      return "";
    }

    const normalized = normalizePathname(pathname);

    for (const view of NON_HOME_VIEWS) {
      const suffix = `/${view}`;

      if (normalized === suffix || normalized.endsWith(suffix)) {
        return normalized.slice(0, -suffix.length) || "/";
      }
    }

    return normalized;
  }

  function routeHref(view) {
    const resolvedView = resolveView(view);

    if (usesHashRouting) {
      return resolvedView === HOME_VIEW ? "#/" : `#/${resolvedView}`;
    }

    const suffix = resolvedView === HOME_VIEW ? "" : `/${resolvedView}`;
    const prefix = basePath === "/" ? "" : basePath;
    return `${prefix}${suffix}` || "/";
  }

  function resolveSizing(route, availableWidth) {
    const base = {
      widthFactor: route.widthFactor ?? 0.72,
      heightFactor: route.heightFactor ?? 0.7
    };

    for (const rule of route.sizing ?? []) {
      if (availableWidth >= rule.minWidth) {
        Object.assign(base, rule);
      }
    }

    return base;
  }

  function resolveViewFromUrl(input) {
    const url = input instanceof URL ? input : new URL(input, window.location.href);

    if (usesHashRouting) {
      const hashView = url.hash.replace(/^#\/?/, "").replace(/\/+$/, "");
      return hashView ? resolveView(hashView) : HOME_VIEW;
    }

    const normalizedPath = normalizePathname(url.pathname);

    if (normalizedPath === basePath) {
      return HOME_VIEW;
    }

    for (const view of NON_HOME_VIEWS) {
      if (normalizedPath === routeHref(view)) {
        return view;
      }
    }

    const legacyView = url.searchParams.get("view");
    return legacyView && Object.prototype.hasOwnProperty.call(routes, legacyView) ? legacyView : null;
  }

  function commitHistory(view, mode) {
    if (mode === "none") {
      return;
    }

    const href = routeHref(view);

    if (mode === "push") {
      history.pushState(null, "", href);
      return;
    }

    history.replaceState(null, "", href);
  }

  function createMeasurePanel() {
    const root = document.createElement("div");
    root.className = "panel-measure-root";
    root.setAttribute("aria-hidden", "true");
    root.innerHTML = `
      <article class="content-panel measure-panel">
        <div class="panel-viewport">
          <div class="panel-swap">
            <div class="panel-scroll">
              <div class="panel-body"></div>
            </div>
          </div>
        </div>
      </article>
    `;
    document.body.appendChild(root);

    return {
      panel: root.querySelector(".measure-panel"),
      body: root.querySelector(".panel-body")
    };
  }

  function createPanelContent(view) {
    const wrapper = document.createElement("div");
    wrapper.className = "panel-content";
    wrapper.dataset.view = view;
    wrapper.innerHTML = routes[view].render();
    return wrapper;
  }

  function captureContentMetrics(content) {
    if (!content) {
      return null;
    }

    const rect = content.getBoundingClientRect();
    return {
      contentWidth: Math.round(rect.width),
      contentHeight: Math.ceil(rect.height)
    };
  }

  function captureExitState(content) {
    if (!content) {
      return null;
    }

    const metrics = captureContentMetrics(content);
    const swapRect = swapHost.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();

    return {
      contentWidth: metrics?.contentWidth ?? Math.round(contentRect.width),
      contentHeight: metrics?.contentHeight ?? Math.ceil(contentRect.height),
      top: Math.round(contentRect.top - swapRect.top)
    };
  }

  function applyFrozenMetrics(content, metrics, options = {}) {
    if (!content || !metrics) {
      return;
    }

    const { lockHeight = false } = options;
    content.style.width = `${metrics.contentWidth}px`;
    content.style.minHeight = `${metrics.contentHeight}px`;

    if (lockHeight) {
      content.style.height = `${metrics.contentHeight}px`;
      return;
    }

    content.style.removeProperty("height");
  }

  function createExitLayer(content, metrics) {
    if (!content || !metrics) {
      return null;
    }

    const exitLayer = content.cloneNode(true);
    exitLayer.classList.remove("is-current", "is-entering");
    exitLayer.classList.add("is-exiting");
    exitLayer.classList.remove("is-visible");
    exitLayer.style.opacity = window.getComputedStyle(content).opacity;
    exitLayer.style.contentVisibility = "visible";
    applyFrozenMetrics(exitLayer, metrics, { lockHeight: true });
    exitLayer.style.setProperty("--panel-layer-top", `${metrics.top}px`);
    return exitLayer;
  }

  function getCurrentVisualContent() {
    return (
      overlayHost.querySelector(".panel-content.is-transition-current") ||
      bodyHost.querySelector(".panel-content.is-current") ||
      bodyHost.lastElementChild
    );
  }

  function getTransitionLayerTop() {
    return Math.round(parseFloat(window.getComputedStyle(bodyHost).paddingTop) || 0);
  }

  function createIncomingLayer(view, metrics) {
    const incomingLayer = createPanelContent(view);
    incomingLayer.classList.add("is-transition-current", "is-entering");
    incomingLayer.style.contentVisibility = "visible";
    incomingLayer.style.setProperty("--panel-layer-top", `${getTransitionLayerTop()}px`);
    applyFrozenMetrics(incomingLayer, metrics, { lockHeight: true });
    return incomingLayer;
  }

  function createLiveContent(view, metrics) {
    const content = createPanelContent(view);
    content.classList.add("is-current", "is-visible");
    applyFrozenMetrics(content, metrics);
    return content;
  }

  function syncActiveRoute(view) {
    activeView = view;
    targetView = view;
    updateRouteMeta(view);
    updateDockState(view);
  }

  function setTransitioning(isTransitioning) {
    swapHost.classList.toggle("is-transitioning", isTransitioning);
    if (!isTransitioning) {
      overlayHost.replaceChildren();
    }
  }

  function mountLiveContent(view, metrics) {
    if (!isPanelView(view)) {
      bodyHost.replaceChildren();
      scrollHost.scrollTop = 0;
      return;
    }

    bodyHost.replaceChildren(createLiveContent(view, metrics));
    scrollHost.scrollTop = 0;
  }

  function updateRouteMeta(view) {
    document.title = `${routes[view].label} | DIESIGN-VIEWTRANSITIONS`;
    panel.setAttribute("aria-label", `${routes[view].label}: ${routes[view].status}`);
  }

  function syncDockTargets() {
    for (const link of dockLinks) {
      link.href = routeHref(link.dataset.viewLink);
    }
  }

  function updateDockState(view) {
    for (const link of dockLinks) {
      const isActive = link.dataset.viewLink === view;
      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    }
  }

  function applyPanelState(size, options = {}) {
    const { immediate = false, collapsed = false } = options;

    if (immediate) {
      panel.classList.add("is-sizing-immediate");
    }

    panel.classList.toggle("is-collapsed", collapsed);
    panel.style.setProperty("--panel-width", `${size.width}px`);
    panel.style.setProperty("--panel-height", `${size.height}px`);

    if (immediate) {
      panel.getBoundingClientRect();
      panel.classList.remove("is-sizing-immediate");
    }
  }

  function measureTargetSize(view) {
    if (!isPanelView(view)) {
      return {
        width: 0,
        height: 0,
        contentWidth: 0,
        contentHeight: 0
      };
    }

    const route = routes[view];
    const availableWidth = Math.max(stage.clientWidth, 280);
    const availableHeight = Math.max(stage.clientHeight, 320);
    const sizing = resolveSizing(route, availableWidth);
    const maxWidth = Math.min(availableWidth, 960);
    const minWidth = Math.min(maxWidth, availableWidth < 480 ? 220 : 300);
    const width = Math.round(clamp(availableWidth * sizing.widthFactor, minWidth, maxWidth));

    measure.panel.style.width = `${width}px`;
    measure.body.replaceChildren(createPanelContent(view));
    const measuredContent = measure.body.querySelector(".panel-content");
    const contentMetrics = captureContentMetrics(measuredContent);

    const naturalHeight = Math.ceil(measure.panel.getBoundingClientRect().height);
    const minHeight = Math.min(availableHeight, availableWidth < 680 ? 360 : 420);
    const maxHeight = Math.floor(
      Math.min(availableHeight, Math.max(minHeight, availableHeight * sizing.heightFactor))
    );
    const height = Math.round(clamp(naturalHeight, minHeight, maxHeight));

    return {
      width,
      height,
      contentWidth: contentMetrics?.contentWidth ?? width,
      contentHeight: contentMetrics?.contentHeight ?? height
    };
  }

  function queueFadeIn(content, token) {
    cancelAnimationFrame(fadeFrame);
    fadeFrame = requestAnimationFrame(() => {
      if (token !== navigationToken) {
        return;
      }
      content.classList.add("is-visible");
    });
  }

  function commitImmediateView(view, targetSize) {
    clearTimeout(contentCleanupTimer);
    syncActiveRoute(view);
    setTransitioning(false);
    mountLiveContent(view, targetSize);
  }

  function commitView(view, token, targetSize, exitState = null) {
    clearTimeout(contentCleanupTimer);
    syncActiveRoute(view);

    const currentContent = getCurrentVisualContent();
    const nextHasPanel = isPanelView(view);

    if (!currentContent && !nextHasPanel) {
      commitImmediateView(view, targetSize);
      return;
    }

    const frozenState = currentContent ? exitState || captureExitState(currentContent) : null;
    const exitLayer = currentContent ? createExitLayer(currentContent, frozenState) : null;
    const incomingLayer = nextHasPanel ? createIncomingLayer(view, targetSize) : null;

    setTransitioning(true);
    overlayHost.replaceChildren(...[exitLayer, incomingLayer].filter(Boolean));

    scrollHost.scrollTop = 0;
    if (incomingLayer) {
      queueFadeIn(incomingLayer, token);
    }

    if (exitLayer) {
      requestAnimationFrame(() => {
        if (token !== navigationToken || !exitLayer.isConnected) {
          return;
        }
        exitLayer.style.opacity = "0";
      });
    }

    contentCleanupTimer = window.setTimeout(() => {
      if (token !== navigationToken) {
        return;
      }
      mountLiveContent(view, targetSize);
      setTransitioning(false);
    }, CONTENT_FADE_MS + CONTENT_FADE_DELAY_MS);
  }

  async function swapWithViewTransition(callback) {
    if (typeof document.startViewTransition !== "function") {
      callback();
      return;
    }

    try {
      const transition = document.startViewTransition(() => {
        callback();
      });
      await transition.finished.catch(() => {});
    } catch (error) {
      callback();
    }
  }

  function renderView(nextView, options = {}) {
    const view = resolveView(nextView);
    const { historyMode = "push", immediate = false } = options;

    if (view === targetView && historyMode === "push") {
      scrollHost.scrollTop = 0;
      return;
    }

    const token = ++navigationToken;
    const targetSize = measureTargetSize(view);

    commitHistory(view, historyMode);

    targetView = view;
    updateDockState(view);

    if (immediate || !activeView) {
      commitImmediateView(view, targetSize);
      applyPanelState(targetSize, { immediate: true, collapsed: !isPanelView(view) });
      return;
    }

    const exitState = captureExitState(getCurrentVisualContent());
    const canUseViewTransition = isPanelView(activeView) && isPanelView(view);

    const commitRoute = () => {
      if (token !== navigationToken) {
        return;
      }
      commitView(view, token, targetSize, exitState);
      applyPanelState(targetSize, { collapsed: !isPanelView(view) });
    };

    if (!canUseViewTransition) {
      commitRoute();
      return;
    }

    swapWithViewTransition(commitRoute);
  }

  function syncCurrentRouteSize() {
    const view = targetView || activeView;
    if (!view) {
      return;
    }

    const targetSize = measureTargetSize(view);
    applyPanelState(targetSize, { immediate: true, collapsed: !isPanelView(view) });

    if (!isPanelView(view)) {
      return;
    }

    const currentContent =
      overlayHost.querySelector(".panel-content.is-transition-current") ||
      bodyHost.querySelector(".panel-content.is-current");
    const isTransitionLayer = Boolean(currentContent?.classList.contains("is-transition-current"));
    applyFrozenMetrics(currentContent, targetSize, { lockHeight: isTransitionLayer });
    if (isTransitionLayer) {
      currentContent.style.setProperty("--panel-layer-top", `${getTransitionLayerTop()}px`);
    }
  }

  function requestSyncCurrentRouteSize() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      syncCurrentRouteSize();
    });
  }

  function handleNavigationClick(event) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const link = event.target.closest("a[href]");
    if (!link || link.target || link.hasAttribute("download")) {
      return;
    }

    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) {
      return;
    }

    const requestedView = resolveViewFromUrl(url);
    if (!requestedView) {
      return;
    }

    event.preventDefault();
    renderView(requestedView, { historyMode: "push" });
  }

  document.addEventListener("click", handleNavigationClick);

  const syncViewFromLocation = () => {
    const currentView = resolveViewFromUrl(new URL(window.location.href));
    renderView(currentView || HOME_VIEW, { historyMode: "none" });
  };

  if (usesHashRouting) {
    window.addEventListener("hashchange", syncViewFromLocation);
  } else {
    window.addEventListener("popstate", syncViewFromLocation);
  }

  window.addEventListener("resize", requestSyncCurrentRouteSize, { passive: true });
  window.addEventListener("orientationchange", requestSyncCurrentRouteSize, { passive: true });

  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(() => {
      requestSyncCurrentRouteSize();
    });
    observer.observe(stage);
  }

  if (document.fonts && typeof document.fonts.ready?.then === "function") {
    document.fonts.ready.then(() => {
      requestSyncCurrentRouteSize();
    });
  }

  syncDockTargets();
  const initialView = resolveView(resolveViewFromUrl(new URL(window.location.href)));
  renderView(initialView, { historyMode: "replace", immediate: true });
  console.log("[agency] DIESIGN-VIEWTRANSITIONS initialized");
})();
