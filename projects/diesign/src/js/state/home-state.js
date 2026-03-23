// home-state.js
export default (() => {
  let isHomeNow = location.pathname === '/' || location.pathname === '';
  const listeners = new Set();

  function update(path) {
    const wasHome = isHomeNow;
    isHomeNow = path === '/' || path === '';
    if (wasHome !== isHomeNow) {
      // Notify all listeners when state changes
      for (const fn of listeners) {
        fn(isHomeNow);
      }
    }
  }

  function onChange(handler) {
    listeners.add(handler);
    // Return unsubscribe function
    return () => listeners.delete(handler);
  }

  function get() {
    return isHomeNow;
  }

  return { get, update, onChange };
})();
