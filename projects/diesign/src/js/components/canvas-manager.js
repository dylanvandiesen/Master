// // canvasManager.js

// === EFFECT REGISTRY ===
const _effectRegistry = new Map();
const _effectConfigMap = new Map();

export function registerEffectType(type, factory) {
  _effectRegistry.set(type, factory);
}

export function unregisterEffectType(type) {
  _effectRegistry.delete(type);
  _effectConfigMap.delete(type);
}

export function setEffectDefaultConfig(type, config) {
  _effectConfigMap.set(type, config);
}

// === MAIN CANVAS SIZE OBSERVER ===
const _activeObservers = new WeakMap();

export function observeCanvasSize(
  canvas,
  onResize = () => {},
  {
    excludeClass = "ripple",
    debounceDelay = 150,
    dprCheckInterval = 250,
    visibilityThreshold = 0,
  } = {}
) {
  const ctx = canvas.getContext("2d");
  let dpr = window.devicePixelRatio || 1;
  let resizeTimeout = null;
  let visible = false;
  let initialized = false;

  const isExcluded = canvas.classList.contains(excludeClass);

  function resizeCanvas() {
    if (!visible || !canvas.isConnected) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const { clientWidth, clientHeight } = parent;
    const newDpr = window.devicePixelRatio || 1;
    const displayWidth = Math.floor(clientWidth * newDpr);
    const displayHeight = Math.floor(clientHeight * newDpr);

    const sizeChanged =
      canvas.width !== displayWidth ||
      canvas.height !== displayHeight ||
      newDpr !== dpr;

    if (sizeChanged) {
      dpr = newDpr;
      canvas.width = displayWidth;
      canvas.height = displayHeight;

      if (!isExcluded) {
        canvas.style.width = `${clientWidth}px`;
        canvas.style.height = `${clientHeight}px`;
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      onResize(dpr, clientWidth, clientHeight);
    }
  }

  const debounceResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resizeCanvas, debounceDelay);
  };

  const ro = isExcluded
    ? null
    : new ResizeObserver(() => {
        if (visible && initialized) debounceResize();
      });

  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !initialized) {
        initialized = true;
        resizeCanvas();
      } else if (visible) {
        debounceResize();
      }
    },
    { root: null, threshold: visibilityThreshold }
  );

  const dprCheck = () => {
    if (visible && initialized && window.devicePixelRatio !== dpr) {
      debounceResize();
    }
  };

  const dprInterval = setInterval(dprCheck, dprCheckInterval);

  if (ro && canvas.parentElement) ro.observe(canvas.parentElement);
  io.observe(canvas);

  const observerData = {
    disconnect() {
      ro?.disconnect();
      io.disconnect();
      clearTimeout(resizeTimeout);
      clearInterval(dprInterval);
    },
    pause() {
      visible = false;
    },
    resume() {
      visible = true;
      resizeCanvas();
    },
  };

  _activeObservers.set(canvas, observerData);
  return observerData;
}

export function pauseCanvas(canvas) {
  _activeObservers.get(canvas)?.pause();
}

export function resumeCanvas(canvas) {
  _activeObservers.get(canvas)?.resume();
}

// === AUTO-BOOTSTRAP FOR ALL CANVASES ===
export function observeAllCanvases({
  selector = "[data-effect]",
  excludeClass = "ripple",
  resizeConfig = {},
  observeDOM = true,
  targetRoot = document.body,
} = {}) {
  const effects = [];
  const observers = [];
  const handled = new WeakSet();
  const activeCanvasEntries = new WeakMap();

  function parseDataConfig(canvas, type) {
    try {
      const raw = canvas.dataset.config;
      const isParsable =
        typeof raw === "string" && raw.trim() !== "" && raw !== "undefined";

      const inline = isParsable ? JSON.parse(raw) : {};
      const defaults = _effectConfigMap.get(type) || {};
      return { ...defaults, ...inline };
    } catch (err) {
      console.warn("Invalid data-config on canvas:", canvas.dataset.config);
      return _effectConfigMap.get(type) || {};
    }
  }

  function ensureCanvasElement(node) {
    if (node instanceof HTMLCanvasElement) return node;

    const canvas = document.createElement("canvas");
    canvas.dataset.effect = node.dataset.effect;
    canvas.dataset.config = node.dataset.config;
    canvas.className = node.className;

    node.replaceWith(canvas);
    return canvas;
  }

  function processCanvas(node) {
    if (handled.has(node)) return;

    const type = node.dataset.effect;
    const factory = _effectRegistry.get(type);
    if (!factory) {
      console.warn(`No effect registered for: "${type}"`);
      return;
    }

    const canvas = ensureCanvasElement(node);
    const config = parseDataConfig(canvas, type);
    const effect = factory(canvas, config);
    canvas._canvasEffectInstance = effect; // Attach instance to canvas
    effects.push(effect);

    const observer = observeCanvasSize(
      canvas,
      (dpr, w, h) => {
        effect.update?.({ dpr, width: w, height: h });
        effect.onResize?.(dpr, w, h);
      },
      {
        excludeClass,
        ...resizeConfig,
      }
    );

    observers.push(observer);
    activeCanvasEntries.set(canvas, { observer, effect });
    handled.add(node);
  }

  function cleanupCanvas(node) {
    if (!(node instanceof HTMLElement)) {
      return;
    }

    const candidates = [];
    if (node instanceof HTMLCanvasElement && node.matches?.(selector)) {
      candidates.push(node);
    }
    if (node.matches?.(selector)) {
      candidates.push(node);
    }
    node.querySelectorAll?.(selector).forEach((candidate) => {
      candidates.push(candidate);
    });

    candidates.forEach((candidate) => {
      const canvas = candidate instanceof HTMLCanvasElement
        ? candidate
        : candidate.querySelector?.('canvas[data-effect]');

      if (!(canvas instanceof HTMLCanvasElement)) {
        return;
      }

      const entry = activeCanvasEntries.get(canvas);
      if (!entry) {
        return;
      }

      entry.observer?.disconnect?.();
      entry.effect?.onDestroy?.();
      activeCanvasEntries.delete(canvas);
    });
  }

  document.querySelectorAll(selector).forEach(processCanvas);

  let mo = null;
  if (observeDOM) {
    mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches?.(selector)) processCanvas(node);
          node.querySelectorAll?.(selector).forEach(processCanvas);
        });
        m.removedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          cleanupCanvas(node);
        });
      }
    });
    mo.observe(targetRoot, { childList: true, subtree: true });
  }

  return {
    disconnect() {
      observers.forEach((o) => o.disconnect());
      effects.forEach((e) => e.onDestroy?.());
      mo?.disconnect();
    },
    effects,
    observers,
  };
}
