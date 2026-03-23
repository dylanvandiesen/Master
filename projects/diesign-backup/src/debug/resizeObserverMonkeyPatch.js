// public/debug/resizeObserverMonkeyPatch.js

(function () {
  if (typeof ResizeObserver === 'undefined') {
    console.warn('ResizeObserver not supported in this browser.');
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const isDebugEnabled = params.get('debugResizeObserver') === '1';

  if (!isDebugEnabled) {
    return;
  }

  const OriginalResizeObserver = window.ResizeObserver;

  window.ResizeObserver = class extends OriginalResizeObserver {
    constructor(callback) {
      const wrappedCallback = (entries, observer) => {
        console.groupCollapsed('[ResizeObserver Triggered]');
        for (const entry of entries) {
          console.log('Element:', entry.target);
          console.log('Size:', entry.contentRect);
        }
        console.trace();
        console.groupEnd();

        try {
          callback(entries, observer);
        } catch (err) {
          console.error('Error in ResizeObserver callback:', err);
        }
      };

      super(wrappedCallback);
    }
  };

  const originalScrollTo = Element.prototype.scrollTo;
Element.prototype.scrollTo = function (...args) {
  console.warn('[scrollTo]', this, args);
  console.trace();
  return originalScrollTo.apply(this, args);
};

const originalScrollTop = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop');
Object.defineProperty(Element.prototype, 'scrollTop', {
  set(value) {
    console.warn('[scrollTop write]', this, value);
    console.trace();
    return originalScrollTop.set.call(this, value);
  },
  get() {
    return originalScrollTop.get.call(this);
  }
});


  console.info('%c[ResizeObserver Monkey Patch Active]', 'color: limegreen; font-weight: bold');
})();
