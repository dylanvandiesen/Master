import replaceVideoPlaceholdersInDialog from './video-popover.js';
import PopoverDragScrollSnap from './popover-drag-scroll-snap.js';

export function setupDynamicNavigation(options = {}) {
  const {
    tabsSelector = 'input[name="d-tabs"]',
    popoverButtonSelector = '.pop-btn.open',
    popoverSelector = '.project-pop',
    popoverCloseSelector = '.project-pop .close',
    navPrefix = 'nav-',
    homePath = '/',
    workPath = '/work',
    cleanTrailingSlash = true
  } = options;

  const activeInstances = new Map();
  let currentPath = getCurrentPath();
  let routeJobId = 0;
  function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function getCurrentPath() {
    return location.pathname;
  }

  function getPopoverMount() {
    return (
      document.querySelector('.tab-panes') ||
      document.querySelector('.content-container') ||
      document.body
    );
  }

  function getMountedPopovers() {
    return Array.from(document.querySelectorAll(popoverSelector));
  }

  function isPopoverOpen(popover) {
    return Boolean(popover?.matches?.(':popover-open') || popover?.hasAttribute?.('open'));
  }

  function clearDetailsTimer(popover) {
    if (!popover?._detailsTimer) {
      return;
    }

    window.clearTimeout(popover._detailsTimer);
    popover._detailsTimer = null;
  }

  function clearCloseTimeout(popover) {
    if (!popover?._closeTimeout) {
      return;
    }

    window.clearTimeout(popover._closeTimeout);
    popover._closeTimeout = null;
  }

  function destroyPopoverInstance(popover) {
    if (!popover) {
      return;
    }

    const projectId = popover.id;
    const instance = activeInstances.get(projectId);
    if (instance && typeof instance.destroy === 'function') {
      try {
        instance.destroy();
      } catch (error) {
        console.warn(`[Navigation] Error destroying instance ${projectId}:`, error);
      }
    }
    activeInstances.delete(projectId);

    if (popover._scrollSnapInstance && typeof popover._scrollSnapInstance.destroy === 'function') {
      try {
        popover._scrollSnapInstance.destroy();
      } catch (error) {
        console.warn('[Navigation] Error destroying popover instance:', error);
      }
    }
    popover._scrollSnapInstance = null;
    clearDetailsTimer(popover);
    clearCloseTimeout(popover);
  }

  function finalizePopoverRemoval(popover) {
    if (!popover) {
      return;
    }

    destroyPopoverInstance(popover);

    const details = popover.querySelector('details');
    if (details) {
      details.open = false;
    }

    try {
      popover.hidePopover?.();
    } catch (error) {
      console.warn('[Navigation] Error hiding popover:', error);
    }

    if (popover.parentNode) {
      popover.remove();
    }
  }

  function removeStalePopoverNodes({ keepId = null } = {}) {
    getMountedPopovers().forEach((popover) => {
      if (keepId && popover.id === keepId && isPopoverOpen(popover)) {
        return;
      }

      finalizePopoverRemoval(popover);
    });
  }

  function parseTimeList(value = '') {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        if (part.endsWith('ms')) {
          return parseFloat(part) || 0;
        }

        if (part.endsWith('s')) {
          return (parseFloat(part) || 0) * 1000;
        }

        return 0;
      });
  }

  function getMaxMotionMs(node) {
    if (!node) {
      return 0;
    }

    const styles = window.getComputedStyle(node);
    const transitionDurations = parseTimeList(styles.transitionDuration);
    const transitionDelays = parseTimeList(styles.transitionDelay);
    const animationDurations = parseTimeList(styles.animationDuration);
    const animationDelays = parseTimeList(styles.animationDelay);

    const transitionMax = transitionDurations.reduce((max, duration, index) => {
      return Math.max(max, duration + (transitionDelays[index] ?? transitionDelays[0] ?? 0));
    }, 0);

    const animationMax = animationDurations.reduce((max, duration, index) => {
      return Math.max(max, duration + (animationDelays[index] ?? animationDelays[0] ?? 0));
    }, 0);

    return Math.max(transitionMax, animationMax);
  }

  function getPopoverCloseMs(popover) {
    const nodes = [
      popover?.querySelector('.oversnap-scroller'),
      popover?.querySelector('.pop-nav'),
      popover?.querySelector('.project-content')
    ].filter(Boolean);

    return Math.min(
      1600,
      400,
      Math.max(
        400,
        Math.ceil(nodes.reduce((max, node) => Math.max(max, getMaxMotionMs(node)), 0)) + 100
      )
    );
  }

  async function initializePopoverContent(popover, projectId) {
    try {
      if (typeof window.popoverPreloader === 'function') {
        await window.popoverPreloader(popover);
      }

      if (typeof window.observeLazyElements === 'function') {
        await window.observeLazyElements(popover);
      }

      if (typeof replaceVideoPlaceholdersInDialog === 'function') {
        await replaceVideoPlaceholdersInDialog(popover);
      }

      const scrollSnapInstance = new PopoverDragScrollSnap();
      activeInstances.set(projectId, scrollSnapInstance);
      popover._scrollSnapInstance = scrollSnapInstance;

      popover._detailsTimer = window.setTimeout(() => {
        const details = popover.querySelector('details');
        if (details) {
          details.open = true;
        }
      }, 450);

      addCloseButtonListeners(popover);
    } catch (error) {
      console.error('[Navigation] Error initializing popover:', error);
    }
  }

  function addCloseButtonListeners(popover) {
    const closeButtons = popover.querySelectorAll('.close, [data-close]');
    closeButtons.forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        history.pushState({}, '', workPath);
        window.setTimeout(() => {
          void handleRoute();
        }, 30);
      });
    });
  }

  async function closeAllPopovers() {
    const popovers = getMountedPopovers().filter((popover) => isPopoverOpen(popover));
    if (!popovers.length) {
      return;
    }

    const closingPromises = popovers.map(
      (popover) =>
        new Promise((resolve) => {
          destroyPopoverInstance(popover);
          popover.removeAttribute('open');

          const onAnimationComplete = () => {
            popover.removeEventListener('transitionend', onAnimationComplete);
            popover.removeEventListener('animationend', onAnimationComplete);
            clearCloseTimeout(popover);
            finalizePopoverRemoval(popover);
            resolve();
          };

          popover.addEventListener('transitionend', onAnimationComplete);
          popover.addEventListener('animationend', onAnimationComplete);

          popover._closeTimeout = window.setTimeout(onAnimationComplete, getPopoverCloseMs(popover));
        })
    );

    await Promise.all(closingPromises);
    removeStalePopoverNodes();
  }

  async function openProjectPopover(projectId, { jobId = routeJobId } = {}) {
    await closeAllPopovers();
    if (jobId !== routeJobId) {
      return;
    }

    const template = document.getElementById(`template-${projectId}`);
    if (!template) {
      console.warn('[Navigation] No template found for:', projectId);
      return;
    }

    const existingPopover = document.getElementById(projectId);
    if (existingPopover) {
      if (isPopoverOpen(existingPopover)) {
        return;
      }

      finalizePopoverRemoval(existingPopover);
    }

    const popover = template.content.cloneNode(true).firstElementChild;
    const parentContainer = getPopoverMount();
    if (!parentContainer) {
      console.warn('[Navigation] No popover mount found for:', projectId);
      return;
    }

    parentContainer.appendChild(popover);
    popover.showPopover();
    popover.setAttribute('open', '');

    if (jobId !== routeJobId || location.pathname !== `${workPath}/${projectId}`) {
      finalizePopoverRemoval(popover);
      return;
    }

    await initializePopoverContent(popover, projectId);
  }

  if (cleanTrailingSlash && location.pathname !== homePath && location.pathname.endsWith('/')) {
    const newPath = location.pathname.replace(/\/+$/, '');
    history.replaceState({}, '', newPath);
  }

  function emitRouteWillChange(path, previousPath) {
    window.dispatchEvent(
      new CustomEvent('routewillchange', {
        detail: { path, previousPath }
      })
    );
  }

  function emitRouteChange(path, previousPath) {
    window.dispatchEvent(
      new CustomEvent('routechange', {
        detail: { path, previousPath }
      })
    );
  }

  async function handleRoute() {
    const jobId = ++routeJobId;
    const nextPath = location.pathname;
    const previousPath = currentPath;

    if (nextPath !== previousPath) {
      emitRouteWillChange(nextPath, previousPath);
    }

    const [tab, projectId] = nextPath.split('/').filter(Boolean);
    const tabName = tab || 'home';

    const radio = document.getElementById(`${navPrefix}${tabName}`);
    if (radio) {
      radio.checked = true;
    }

    await closeAllPopovers();
    if (jobId !== routeJobId) {
      return;
    }

    currentPath = nextPath;
    emitRouteChange(nextPath, previousPath);

    if (tabName === workPath.replace(/^\//, '') && projectId) {
      await delay(50);

      if (jobId === routeJobId && location.pathname === nextPath) {
        await openProjectPopover(projectId, { jobId });
      }
    }
  }

  void handleRoute();

  document.querySelectorAll(tabsSelector).forEach((input) => {
    input.addEventListener('change', () => {
      if (!input.checked) {
        return;
      }

      const tab = input.id.replace(navPrefix, '');
      history.pushState({}, '', tab === 'home' ? homePath : `/${tab}`);
      void handleRoute();
    });
  });

  window.addEventListener('popstate', () => {
    void handleRoute();
  });

  document.addEventListener('click', (event) => {
    const button = event.target.closest(popoverButtonSelector);
    if (!button) {
      return;
    }

    event.preventDefault();
    const projectId = button.getAttribute('popovertarget');
    if (!projectId) {
      return;
    }

    history.pushState({}, '', `${workPath}/${projectId}`);
    void handleRoute();
  });

  document.addEventListener('click', (event) => {
    const closeButton = event.target.closest(popoverCloseSelector);
    if (!closeButton) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    history.pushState({}, '', workPath);
    void handleRoute();
  });

  window.addEventListener('beforeunload', () => {
    routeJobId += 1;
    getMountedPopovers().forEach((popover) => {
      finalizePopoverRemoval(popover);
    });
    activeInstances.clear();
  });

  return {
    getCurrentPath,
    closeAllPopovers: () => closeAllPopovers(),
    getActiveInstances: () => new Map(activeInstances)
  };
}
