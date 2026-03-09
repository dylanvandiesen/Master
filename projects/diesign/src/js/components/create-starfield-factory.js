export default function createStarfieldFactory(canvas, config = {}) {
  const instance = createStarfield(canvas, config);

  const ready = new Promise((resolve) => {
    requestAnimationFrame(() => {
      canvas.style.opacity = '1'; // fade-in after DOM
      resolve(); // signal effect is ready
    });
  });

  return {
    ready,
    update(newConfig) {},
    destroy() {
      instance.destroy();
    },
    // expose methods directly:
    startMeteorShowerSchedule: instance.startMeteorShowerSchedule,
    stopMeteorShowerSchedule: instance.stopMeteorShowerSchedule,
    burst: instance.burst,
  };
}


// export default function createStarfieldFactory(canvas, config = {}) {
//   const instance = createStarfield(canvas, config);

//   const ready = new Promise((resolve) => {
//     // You can resolve immediately, or delay until fade-in or other setup completes
//     requestAnimationFrame(() => resolve());
//   });

//   return {
//     ...instance,     // startMeteorShowerSchedule, destroy, burst, etc.
//     ready,           // <-- now available
//     update(newConfig) {
//       // Optional: implement dynamic config updates if needed
//     },
//     destroy() {
//       instance.destroy();
//     },
//   };
// }
