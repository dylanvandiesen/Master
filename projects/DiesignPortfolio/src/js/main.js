(() => {
  const VIEW_ORDER = ["home", "work", "about", "contact"];

  const routes = {
    home: {
      label: "Home",
      status: "Studio overview",
      widthFactor: 0.62,
      heightFactor: 0.54,
      render: () => `
        <section class="hero-block">
          <p class="section-kicker">Single surface / four states</p>
          <h2>Fullscreen navigation without ever leaving the frame.</h2>
          <p class="lead">
            DIESIGN-VIEWTRANSITIONS keeps one centered panel alive while the URL, panel size, and
            content rhythm change together. <a href="?view=work">Open work</a> or
            <a href="?view=about">read the setup</a>.
          </p>
        </section>

        <section class="metric-grid" aria-label="Route signals">
          <article class="metric-card">
            <p class="card-kicker">Routes</p>
            <strong class="metric-value">04</strong>
            <p>Home, work, about, and contact all live inside one persistent shell.</p>
          </article>
          <article class="metric-card">
            <p class="card-kicker">Frame motion</p>
            <strong class="metric-value">W + H</strong>
            <p>The panel interpolates width and height together with no overshoot bounce.</p>
          </article>
          <article class="metric-card">
            <p class="card-kicker">History</p>
            <strong class="metric-value">URL</strong>
            <p>Every tap writes <code>?view=</code> so back and forward navigation stay meaningful.</p>
          </article>
        </section>

        <section class="feature-strip">
          <article class="note-card">
            <h3>Content stays readable</h3>
            <p>
              The frame stays clipped while an internal scroll surface handles long views and the
              dock stays pinned at the bottom edge.
            </p>
          </article>
          <article class="note-card">
            <h3>Transitions stay subtle</h3>
            <p>
              CSS View Transitions handle the content swap, while registered CSS properties animate
              the live frame dimensions in both axes.
            </p>
          </article>
        </section>
      `
    },
    work: {
      label: "Work",
      status: "Project selection",
      widthFactor: 0.98,
      heightFactor: 0.92,
      render: () => `
        <section class="hero-block">
          <p class="section-kicker">Selected work</p>
          <h2>A wider panel gives project cards enough air to breathe.</h2>
          <p class="lead">
            This route stretches horizontally for side-by-side previews, then compresses again on
            tighter views. <a href="?view=contact">Jump to contact</a> when you are ready.
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
          </article>
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
      widthFactor: 0.76,
      heightFactor: 0.72,
      render: () => `
        <section class="hero-block">
          <p class="section-kicker">How it works</p>
          <h2>The route model is simple, but the panel feels alive.</h2>
          <p class="lead">
            Each view carries width and height factors, while natural content height keeps the
            result grounded. <a href="?view=home">Return home</a> or continue into
            <a href="?view=contact">contact</a>.
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
                <p>The frame follows registered width and height properties with in-out-expo easing and no bounce.</p>
              </li>
            </ol>
          </article>
        </section>
      `
    },
    contact: {
      label: "Contact",
      status: "Availability + links",
      widthFactor: 0.52,
      heightFactor: 0.44,
      render: () => `
        <section class="hero-block">
          <p class="section-kicker">Reach out</p>
          <h2>A tighter contact state brings the focus back to the call to action.</h2>
          <p class="lead">
            This route intentionally compresses into a narrower frame. If you want more context,
            <a href="?view=work">browse work</a> first.
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
            revisit <a href="?view=about">the process notes</a>.
          </p>
        </article>
      `
    }
  };

  const panel = document.querySelector("[data-panel]");
  const stage = document.querySelector(".panel-stage");
  const scrollHost = document.querySelector(".panel-scroll");
  const bodyHost = document.querySelector("[data-panel-body]");
  const routeLabel = document.querySelector("[data-route-label]");
  const routeStatus = document.querySelector("[data-route-status]");
  const routeSequence = document.querySelector("[data-route-sequence]");
  const dockLinks = Array.from(document.querySelectorAll("[data-view-link]"));

  if (!panel || !stage || !scrollHost || !bodyHost || !routeLabel || !routeStatus || !routeSequence || !dockLinks.length) {
    return;
  }

  history.scrollRestoration = "manual";

  const measure = createMeasurePanel();
  let activeView = "";
  let fadeFrame = 0;
  let resizeFrame = 0;
  let navigationToken = 0;

  function resolveView(value) {
    return Object.prototype.hasOwnProperty.call(routes, value) ? value : VIEW_ORDER[0];
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function sequenceText(view) {
    return `${String(VIEW_ORDER.indexOf(view) + 1).padStart(2, "0")} / ${String(VIEW_ORDER.length).padStart(2, "0")}`;
  }

  function buildUrl(view) {
    const url = new URL(window.location.href);
    url.searchParams.set("view", view);
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function createMeasurePanel() {
    const root = document.createElement("div");
    root.className = "panel-measure-root";
    root.setAttribute("aria-hidden", "true");
    root.innerHTML = `
      <article class="content-panel measure-panel">
        <header class="panel-chrome">
          <div class="panel-brand">
            <p class="brand-mark">DIESIGN-VIEWTRANSITIONS</p>
            <h1 class="route-label">Measure</h1>
          </div>
          <div class="route-meta">
            <span class="route-sequence">00 / 00</span>
            <strong class="route-status">Measuring</strong>
          </div>
        </header>
        <div class="panel-viewport">
          <div class="panel-scroll">
            <div class="panel-body"></div>
          </div>
        </div>
      </article>
    `;
    document.body.appendChild(root);

    return {
      panel: root.querySelector(".measure-panel"),
      body: root.querySelector(".panel-body"),
      label: root.querySelector(".route-label"),
      status: root.querySelector(".route-status"),
      sequence: root.querySelector(".route-sequence")
    };
  }

  function createPanelContent(view) {
    const wrapper = document.createElement("div");
    wrapper.className = "panel-content";
    wrapper.dataset.view = view;
    wrapper.innerHTML = routes[view].render();
    return wrapper;
  }

  function updateRouteMeta(view) {
    routeLabel.textContent = routes[view].label;
    routeStatus.textContent = routes[view].status;
    routeSequence.textContent = sequenceText(view);
    document.title = `${routes[view].label} | DIESIGN-VIEWTRANSITIONS`;
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

  function applyPanelSize(size, immediate = false) {
    if (immediate) {
      panel.classList.add("is-sizing-immediate");
    }

    panel.style.setProperty("--panel-width", `${size.width}px`);
    panel.style.setProperty("--panel-height", `${size.height}px`);

    if (immediate) {
      panel.getBoundingClientRect();
      panel.classList.remove("is-sizing-immediate");
    }
  }

  function measureTargetSize(view) {
    const route = routes[view];
    const availableWidth = Math.max(stage.clientWidth, 280);
    const availableHeight = Math.max(stage.clientHeight, 320);
    const maxWidth = Math.min(availableWidth, 960);
    const minWidth = Math.min(maxWidth, availableWidth < 480 ? 220 : 300);
    const width = Math.round(clamp(availableWidth * route.widthFactor, minWidth, maxWidth));

    measure.label.textContent = route.label;
    measure.status.textContent = route.status;
    measure.sequence.textContent = sequenceText(view);
    measure.panel.style.width = `${width}px`;
    measure.body.replaceChildren(createPanelContent(view));

    const naturalHeight = Math.ceil(measure.panel.getBoundingClientRect().height);
    const minHeight = Math.min(availableHeight, availableWidth < 680 ? 360 : 420);
    const maxHeight = Math.floor(
      Math.min(availableHeight, Math.max(minHeight, availableHeight * route.heightFactor))
    );
    const height = Math.round(clamp(naturalHeight, minHeight, maxHeight));

    return { width, height };
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

  function commitView(view, token) {
    updateRouteMeta(view);
    updateDockState(view);

    const content = createPanelContent(view);
    bodyHost.replaceChildren(content);
    scrollHost.scrollTop = 0;
    queueFadeIn(content, token);
  }

  function swapWithViewTransition(callback) {
    if (typeof document.startViewTransition !== "function") {
      callback();
      return;
    }

    try {
      document.startViewTransition(() => {
        callback();
      });
    } catch (error) {
      callback();
    }
  }

  function renderView(nextView, options = {}) {
    const view = resolveView(nextView);
    const { historyMode = "push", immediate = false } = options;

    if (view === activeView && historyMode === "push") {
      scrollHost.scrollTop = 0;
      return;
    }

    const token = ++navigationToken;
    const targetSize = measureTargetSize(view);

    if (historyMode === "push") {
      history.pushState({ view }, "", buildUrl(view));
    } else if (historyMode === "replace") {
      history.replaceState({ view }, "", buildUrl(view));
    }

    activeView = view;

    if (immediate || !bodyHost.firstElementChild) {
      commitView(view, token);
      applyPanelSize(targetSize, true);
      return;
    }

    swapWithViewTransition(() => {
      commitView(view, token);
      applyPanelSize(targetSize);
    });
  }

  function syncCurrentRouteSize() {
    if (!activeView) {
      return;
    }

    const targetSize = measureTargetSize(activeView);
    applyPanelSize(targetSize, true);
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
    if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) {
      return;
    }

    const requestedView = url.searchParams.get("view");
    if (!requestedView || !Object.prototype.hasOwnProperty.call(routes, requestedView)) {
      return;
    }

    event.preventDefault();
    renderView(requestedView, { historyMode: "push" });
  }

  document.addEventListener("click", handleNavigationClick);

  window.addEventListener("popstate", (event) => {
    const stateView = typeof event.state?.view === "string" ? event.state.view : null;
    const queryView = new URL(window.location.href).searchParams.get("view");
    renderView(queryView || stateView || VIEW_ORDER[0], { historyMode: "none" });
  });

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

  const initialView = resolveView(new URL(window.location.href).searchParams.get("view"));
  renderView(initialView, { historyMode: "replace", immediate: true });
  console.log("[agency] DIESIGN-VIEWTRANSITIONS initialized");
})();
