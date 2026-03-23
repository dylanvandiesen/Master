// createRipple.js
import CanvasRipple from './canvas-ripple.js';

export default function createRipple(canvas, config = {}) {
  const ripple = new CanvasRipple(config);

  ripple.attachTo([canvas]);

  return {
    onResize(dpr, width, height) {
      // No action needed for now
    },
    onDestroy() {
      ripple.destroy?.();
    },
    update(newConfig) {
      // Future: live config updates
    },
    ready: ripple.ready ?? Promise.resolve(), // optional ready support
  };
}


// export default function createRipple(canvas, config = {}) {
//   const ripple = new CanvasRipple(config);

//   // Attach to the provided canvas directly
//   ripple.attachTo([canvas]);

//   return {
//     onResize(dpr, width, height) {
//       // No manual resize logic needed — observeCanvasSize handles this
//     },
//     onDestroy() {
//       ripple.destroy();
//     },
//     update(newConfig) {
//       // For future live config updates
//     }
//   };
// }
