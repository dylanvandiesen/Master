import HomeState from '../state/home-state';
import createLazyElementObserver from '../features/media/lazy-elements';
import { setupDynamicNavigation } from './router';
import { setupPanelRouteTransition } from './route-shell';
import { queueVisualInitialization, triggerIntroMeteorBurst } from '../features/effects/initialize-visuals';

function suppressBenignResizeObserverOverlay() {
  const isBenignResizeObserverError = (message) => {
    return typeof message === 'string' && message.includes('ResizeObserver loop completed with undelivered notifications');
  };

  window.addEventListener('error', (event) => {
    if (!isBenignResizeObserverError(event.message)) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
}

export function bootstrapApp() {
  suppressBenignResizeObserverOverlay();

  const observeLazyElements = createLazyElementObserver({
    loadedClass: 'd-loaded',
    errorClass: 'error'
  });

  // Keep the legacy global during phase 1 while route shell and popovers are being modularized.
  window.observeLazyElements = observeLazyElements;

  setupDynamicNavigation({
    tabsSelector: 'input[name="d-tabs"]',
    popoverButtonSelector: '.pop-btn.open',
    popoverSelector: '.project-pop',
    popoverCloseSelector: '.project-pop .close',
    navPrefix: 'nav-',
    homePath: '/',
    workPath: '/work',
    cleanTrailingSlash: true,
    observeLazyElements
  });

  setupPanelRouteTransition({
    observeLazyElements
  });

  window.addEventListener('routechange', (event) => {
    HomeState.update(event.detail.path);
  });

  window.preloaderReady.then(() => {
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.intro-container')) {
        return;
      }

      triggerIntroMeteorBurst();
    });

    observeLazyElements();
    queueVisualInitialization();
  });
}
