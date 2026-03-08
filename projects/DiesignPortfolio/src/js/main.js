(() => {
  const appShell = document.querySelector('[data-app-shell]');
  const panelFrame = document.querySelector('[data-panel-frame]');
  const panel = document.querySelector('[data-content-panel]');
  const tabs = Array.from(document.querySelectorAll('[data-tab]'));
  const routeLabel = document.querySelector('[data-route-label]');
  let panelSizeAnimation;

  const PANEL_SIZE_DURATION_MS = 560;
  const PANEL_SIZE_EASING = 'cubic-bezier(0.87, 0, 0.13, 1)';

  if (!appShell || !panelFrame || !panel || tabs.length === 0) {
    return;
  }

  const routes = {
    home: {
      label: 'Home',
      title: 'A one-page portfolio with a product-grade app shell.',
      copy: 'This is a focused demo tuned for production handoff: semantic HTML, CSS-first architecture, progressive enhancement, and history-driven in-app navigation.',
      stats: [
        ['8+ yrs', 'Design + frontend'],
        ['40+', 'Interfaces shipped'],
        ['100%', 'Vanilla stack']
      ],
      cards: [
        { title: 'Visual system', text: 'Type, spacing, contrast, and motion tuned for mobile and desktop parity.' },
        { title: 'Experience model', text: 'Bottom icon dock with spatial panel transitions and stateful URL updates.' }
      ],
      chips: ['CSS-first', 'Progressive enhancement', 'No framework lock-in'],
      actions: [
        { href: '?view=work', label: 'See selected work' },
        { href: '?view=contact', label: 'Start a project' }
      ],
      heightFactor: 0.9,
      widthFactor: 0.96
    },
    work: {
      label: 'Work',
      title: 'Selected outcomes from design-engineering engagements.',
      copy: 'The panel intentionally scales with content density to demonstrate grow/shrink behavior across short and long states.',
      cards: [
        { title: 'Remote Control Panel', text: 'Designed and implemented secure command UX with multi-session orchestration.' },
        { title: 'Marketing + Product Blend', text: 'Built launch surfaces that keep brand polish while preserving performance budgets.' },
        { title: 'Systemized Delivery', text: 'Introduced reusable UI primitives to accelerate multi-team shipping cadence.' }
      ],
      chips: ['UI architecture', 'Motion', 'Accessibility', 'Performance'],
      actions: [
        { href: 'https://www.diesign.dev', label: 'Current portfolio ↗' }
      ],
      heightFactor: 1,
      widthFactor: 1
    },
    about: {
      label: 'About',
      title: 'Design strategy translated directly into maintainable code.',
      copy: 'I work across product framing, interaction design, and implementation. The goal is always to deliver measurable outcomes without sacrificing craft.',
      cards: [
        { title: 'How I work', text: 'Rapid browser-first prototyping, then stabilize into scalable production patterns.' },
        { title: 'Core stack', text: 'Semantic HTML, modern CSS, and vanilla JavaScript with lightweight tooling only where needed.' }
      ],
      chips: ['Design systems', 'Front-end architecture', 'Creative direction'],
      actions: [
        { href: '?view=contact', label: 'Connect' }
      ],
      heightFactor: 0.82,
      widthFactor: 0.9
    },
    contact: {
      label: 'Contact',
      title: 'Available for focused collaborations.',
      copy: 'Share your goals, timeline, and constraints. I can plug in as a design engineer or lead end-to-end delivery for premium web experiences.',
      cards: [
        { title: 'Best for', text: 'Launches, redesigns, app shells, and premium web interfaces.' }
      ],
      chips: ['Freelance', 'Product partnerships', 'Consulting'],
      actions: [
        { href: 'mailto:hello@diesign.dev', label: 'hello@diesign.dev' },
        { href: 'https://www.diesign.dev', label: 'diesign.dev ↗' }
      ],
      heightFactor: 0.74,
      widthFactor: 0.84
    }
  };

  const normalizeTab = (tab) => (routes[tab] ? tab : 'home');
  const getTabFromUrl = (url = new URL(location.href)) => normalizeTab(url.searchParams.get('view') || 'home');

  const getPanelTargetDimensions = (tabKey) => {
    const route = routes[normalizeTab(tabKey)] || routes.home;
    const shellStyle = getComputedStyle(appShell);
    const shellPaddingTop = parseFloat(shellStyle.paddingTop) || 0;
    const shellPaddingBottom = parseFloat(shellStyle.paddingBottom) || 0;
    const shellPaddingLeft = parseFloat(shellStyle.paddingLeft) || 0;
    const shellPaddingRight = parseFloat(shellStyle.paddingRight) || 0;
    const shellGap = parseFloat(shellStyle.rowGap || shellStyle.gap) || 0;

    const header = appShell.querySelector('.app-header');
    const dock = appShell.querySelector('.dock');
    const headerSize = header ? header.offsetHeight : 0;
    const dockSize = dock ? dock.offsetHeight : 0;

    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const availableHeight = viewportHeight - shellPaddingTop - shellPaddingBottom - headerSize - dockSize - (shellGap * 2);

    const shellWidth = appShell.getBoundingClientRect().width - shellPaddingLeft - shellPaddingRight;
    const targetWidth = Math.max(280, shellWidth * route.widthFactor);

    const previousHeight = panelFrame.style.height;
    const previousWidth = panelFrame.style.width;
    panelFrame.style.height = 'auto';
    panelFrame.style.width = `${targetWidth}px`;
    const naturalContentHeight = panel.scrollHeight;
    panelFrame.style.height = previousHeight;
    panelFrame.style.width = previousWidth;

    const cappedAvailableHeight = Math.max(220, availableHeight * route.heightFactor);
    const targetHeight = Math.min(naturalContentHeight, cappedAvailableHeight);

    return {
      width: Math.min(shellWidth, targetWidth),
      height: targetHeight
    };
  };

  const animatePanelSize = (nextDimensions, { immediate = false } = {}) => {
    const nextWidth = nextDimensions.width;
    const nextHeight = nextDimensions.height;

    if (panelSizeAnimation) {
      panelSizeAnimation.cancel();
      panelSizeAnimation = undefined;
    }

    const rect = panelFrame.getBoundingClientRect();
    const currentWidth = rect.width || nextWidth;
    const currentHeight = rect.height || nextHeight;

    if (immediate || (Math.abs(currentWidth - nextWidth) < 1 && Math.abs(currentHeight - nextHeight) < 1)) {
      panelFrame.style.width = `${nextWidth}px`;
      panelFrame.style.height = `${nextHeight}px`;
      return;
    }

    panelFrame.style.width = `${currentWidth}px`;
    panelFrame.style.height = `${currentHeight}px`;

    if (panelFrame.animate) {
      panelSizeAnimation = panelFrame.animate(
        [
          { width: `${currentWidth}px`, height: `${currentHeight}px` },
          { width: `${nextWidth}px`, height: `${nextHeight}px` }
        ],
        {
          duration: PANEL_SIZE_DURATION_MS,
          easing: PANEL_SIZE_EASING,
          fill: 'forwards'
        }
      );

      panelSizeAnimation.addEventListener('finish', () => {
        panelFrame.style.width = `${nextWidth}px`;
        panelFrame.style.height = `${nextHeight}px`;
        panelSizeAnimation = undefined;
      }, { once: true });

      panelSizeAnimation.addEventListener('cancel', () => {
        panelSizeAnimation = undefined;
      }, { once: true });

      return;
    }

    requestAnimationFrame(() => {
      panelFrame.style.width = `${nextWidth}px`;
      panelFrame.style.height = `${nextHeight}px`;
    });
  };

  const renderStats = (stats = []) => {
    if (!stats.length) {
      return '';
    }

    const items = stats
      .map(([value, label]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`)
      .join('');

    return `<div class="stats">${items}</div>`;
  };

  const renderCards = (cards = []) => {
    const items = cards
      .map((card) => `<li><strong>${card.title}</strong>${card.text}</li>`)
      .join('');

    return `<ul class="cards">${items}</ul>`;
  };

  const renderChips = (chips = []) => {
    if (!chips.length) {
      return '';
    }

    return `<div class="chips">${chips.map((chip) => `<span>${chip}</span>`).join('')}</div>`;
  };

  const renderActions = (actions = []) => {
    if (!actions.length) {
      return '';
    }

    return `<div class="panel-actions">${actions.map((action) => `<a href="${action.href}">${action.label}</a>`).join('')}</div>`;
  };

  const renderPanel = (tabKey) => {
    const key = normalizeTab(tabKey);
    const route = routes[key];

    panel.innerHTML = `
      <div class="panel-content" data-panel-content>
        <p class="panel-eyebrow">${route.label}</p>
        <h2 class="panel-title">${route.title}</h2>
        <p class="panel-copy">${route.copy}</p>
        ${renderStats(route.stats)}
        ${renderCards(route.cards)}
        ${renderChips(route.chips)}
        ${renderActions(route.actions)}
      </div>
    `;

    const panelContent = panel.querySelector('[data-panel-content]');
    if (panelContent) {
      requestAnimationFrame(() => panelContent.classList.add('is-visible'));
    }

    panel.scrollTop = 0;

    tabs.forEach((tab) => {
      const active = tab.dataset.tab === key;
      if (active) {
        tab.setAttribute('aria-current', 'page');
      } else {
        tab.removeAttribute('aria-current');
      }
    });

    if (routeLabel) {
      routeLabel.textContent = `Now viewing: ${route.label}`;
    }
  };

  const navigate = (targetTab, { replace = false, immediate = false } = {}) => {
    const tab = normalizeTab(targetTab);
    const nextUrl = new URL(location.href);
    nextUrl.searchParams.set('view', tab);

    const updateDom = () => renderPanel(tab);

    if (document.startViewTransition && !immediate) {
      const transition = document.startViewTransition(updateDom);
      transition.ready
        .catch(() => undefined)
        .finally(() => {
          requestAnimationFrame(() => {
            animatePanelSize(getPanelTargetDimensions(tab));
          });
        });
    } else {
      updateDom();
      animatePanelSize(getPanelTargetDimensions(tab), { immediate });
    }

    const nextState = { tab };
    if (replace) {
      history.replaceState(nextState, '', nextUrl);
    } else {
      history.pushState(nextState, '', nextUrl);
    }
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabKey = tab.dataset.tab || 'home';
      const currentTab = history.state?.tab || getTabFromUrl();
      if (currentTab !== tabKey) {
        navigate(tabKey);
      }
    });
  });

  panel.addEventListener('click', (event) => {
    const anchor = event.target.closest('a[href^="?view="]');
    if (!anchor) {
      return;
    }

    event.preventDefault();
    navigate(getTabFromUrl(new URL(anchor.href, location.origin)));
  });

  window.addEventListener('popstate', (event) => {
    const tab = normalizeTab(event.state?.tab || getTabFromUrl());
    renderPanel(tab);
    animatePanelSize(getPanelTargetDimensions(tab));
  });

  window.addEventListener('resize', () => {
    animatePanelSize(getPanelTargetDimensions(history.state?.tab || getTabFromUrl()), { immediate: true });
  });

  navigate(getTabFromUrl(), { replace: true, immediate: true });
})();
