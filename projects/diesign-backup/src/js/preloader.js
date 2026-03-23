(() => {
  const defaultConfig = {
    loadTimeout: 5000,
    loaderSelector: '#loader',
    loadedClass: 'loaded',
    removeDelay: 180,
    stageSelector: '#bg, #mbg, #mg, #fg'
  };

  const config = (window.PreloaderConfig = Object.assign(
    {},
    defaultConfig,
    window.PreloaderConfig || {}
  ));

  let timeoutId;
  let removeLoaderTimeoutId;
  let resolvePreloader;

  const preloaderPromise = new Promise((resolve) => {
    resolvePreloader = resolve;
  });

  const LOADER_FADE_DURATION_MS = 400;
  const SPINNER_FADE_DURATION_MS = 300;

  function applyLoaderTiming(revealDelay) {
    const loader = document.querySelector(config.loaderSelector);
    if (!loader) {
      return;
    }

    loader.style.setProperty(
      '--loader-fade-delay',
      `${Math.max(0, revealDelay - LOADER_FADE_DURATION_MS)}ms`
    );
    loader.style.setProperty(
      '--loader-spinner-delay',
      `${Math.max(0, revealDelay - SPINNER_FADE_DURATION_MS)}ms`
    );
  }

  function cleanup() {
    document.removeEventListener('DOMContentLoaded', onDOMContentLoaded);
    window.removeEventListener('load', onWindowLoad);
    observer.disconnect();
    clearTimeout(timeoutId);
  }

  function finishLoading() {
    if (document.body.classList.contains(config.loadedClass)) {
      return;
    }

    requestAnimationFrame(() => {
      const revealDelay = Math.max(0, config.removeDelay);
      applyLoaderTiming(revealDelay);
      document.body.classList.add(config.loadedClass);
      removeLoaderTimeoutId = window.setTimeout(() => {
        document.querySelector(config.loaderSelector)?.remove();
        resolvePreloader();
      }, revealDelay);

      cleanup();
    });
  }

  function checkBackgroundImages() {
    const stageElements = document.querySelectorAll(config.stageSelector);
    if (!stageElements.length) {
      return Promise.resolve();
    }

    const loadPromises = Array.from(stageElements).map((element) => {
      const backgroundImage = window.getComputedStyle(element).backgroundImage;
      if (!backgroundImage || backgroundImage === 'none') {
        return Promise.resolve();
      }

      const urlMatch = backgroundImage.match(/url\((['"]?)(.*?)\1\)/);
      const url = urlMatch?.[2];

      if (!url) {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        const image = new Image();
        image.onload = resolve;
        image.onerror = resolve;
        image.src = url;
      });
    });

    return Promise.all(loadPromises);
  }

  function onDOMContentLoaded() {
    checkBackgroundImages().then(finishLoading);
  }

  function onWindowLoad() {
    checkBackgroundImages().then(finishLoading);
  }

  function handleLoad() {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      checkBackgroundImages().then(finishLoading);
      return;
    }

    document.addEventListener('DOMContentLoaded', onDOMContentLoaded);
    window.addEventListener('load', onWindowLoad);
  }

  const observer = new MutationObserver(() => {
    if (document.readyState === 'complete') {
      checkBackgroundImages().then(finishLoading);
    }
  });

  handleLoad();
  timeoutId = window.setTimeout(() => checkBackgroundImages().then(finishLoading), config.loadTimeout);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.preloaderReady = preloaderPromise;
})();
