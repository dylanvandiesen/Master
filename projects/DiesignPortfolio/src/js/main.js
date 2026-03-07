(() => {
  const panelFrame = document.querySelector('[data-panel-frame]');
  const panel = document.querySelector('[data-content-panel]');
  const tabs = Array.from(document.querySelectorAll('[data-tab]'));
  const routeLabel = document.querySelector('[data-route-label]');

  if (!panelFrame || !panel || tabs.length === 0) {
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
      ]
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
      ]
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
      ]
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
      ]
    }
  };

  const normalizeTab = (tab) => (routes[tab] ? tab : 'home');

  const getTabFromUrl = (url = new URL(location.href)) => normalizeTab(url.searchParams.get('view') || 'home');

  const measurePanel = () => {
    requestAnimationFrame(() => {
      panelFrame.style.blockSize = `${panel.offsetHeight}px`;
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
      <p class="panel-eyebrow">${route.label}</p>
      <h2 class="panel-title">${route.title}</h2>
      <p class="panel-copy">${route.copy}</p>
      ${renderStats(route.stats)}
      ${renderCards(route.cards)}
      ${renderChips(route.chips)}
      ${renderActions(route.actions)}
    `;

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

    measurePanel();
  };

  const navigate = (targetTab, { replace = false } = {}) => {
    const tab = normalizeTab(targetTab);
    const nextUrl = new URL(location.href);
    nextUrl.searchParams.set('view', tab);

    const updateDom = () => renderPanel(tab);
    if (document.startViewTransition) {
      document.startViewTransition(updateDom);
    } else {
      updateDom();
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
    const url = new URL(anchor.href, location.origin);
    navigate(getTabFromUrl(url));
  });

  window.addEventListener('popstate', (event) => {
    const tab = normalizeTab(event.state?.tab || getTabFromUrl());
    renderPanel(tab);
  });

  window.addEventListener('resize', measurePanel);

  navigate(getTabFromUrl(), { replace: true });
})();
