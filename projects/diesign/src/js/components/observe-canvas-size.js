export function observeCanvasSize(canvas, onResize = () => {}) {
  const ctx = canvas.getContext("2d");
  let dpr = window.devicePixelRatio || 1;
  let resizeTimeout = null;
  let visible = true;
  let lastWidth = 0;
  let lastHeight = 0;

  // --- Resize Logic ---
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
      lastWidth = clientWidth;
      lastHeight = clientHeight;

      canvas.width = displayWidth;
      canvas.height = displayHeight;
      canvas.style.width = `${clientWidth}px`;
      canvas.style.height = `${clientHeight}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      onResize(dpr, clientWidth, clientHeight);
    }
  }

  const debounceResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resizeCanvas, 150); // Wait for user to stop resizing
  };

  // --- ResizeObserver ---
  const ro = new ResizeObserver(() => {
    if (visible) debounceResize();
  });

  // --- IntersectionObserver to track visibility ---
  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible) debounceResize();
    },
    { root: null, threshold: 0 }
  );

  // --- DPR Check ---
  const dprCheck = () => {
    if (visible && window.devicePixelRatio !== dpr) {
      debounceResize();
    }
  };
  const dprInterval = setInterval(dprCheck, 250);

  // --- Initialize ---
  if (canvas.parentElement) ro.observe(canvas.parentElement);
  io.observe(canvas);
  resizeCanvas(); // Initial render

  return {
    disconnect() {
      ro.disconnect();
      io.disconnect();
      clearTimeout(resizeTimeout);
      clearInterval(dprInterval);
    }
  };
}