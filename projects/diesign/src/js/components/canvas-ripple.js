import { observeCanvasSize } from './canvas-manager';

function Perlin(seed = Math.random()) {
  const p = new Uint8Array(512);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 0; i < 256; i++) {
    const r = i + Math.floor(seed * (256 - i));
    const t = p[i];
    p[i] = p[r];
    p[r] = t;
  }
  for (let i = 0; i < 256; i++) p[i + 256] = p[i];
  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(t, a, b) { return a + t * (b - a); }
  function grad(hash, x, y) {
    const h = hash & 3;
    return (h & 1 ? -x : x) + (h & 2 ? -y : y);
  }
  return function(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const aa = p[p[X] + Y], ab = p[p[X] + Y + 1];
    const ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
    return lerp(v,
      lerp(u, grad(aa, x, y), grad(ba, x - 1, y)),
      lerp(u, grad(ab, x, y - 1), grad(bb, x - 1, y - 1))
    );
  };
}

export default class CanvasRipple {
  constructor(options = {}) {
    this.duration = options.duration ?? 600;
    this.easing = options.easing ?? 'ease-out';
    this.colorStops = options.colorStops ?? [
      { offset: 0, color: 'rgba(0,0,0,0.3)' },
      { offset: 1, color: 'rgba(0,0,0,0)' }
    ];
    this.maxScale = options.scale ?? 1;
    this.noiseAmplitude = options.noise ?? 1;
    this.center = options.center ?? false;
    this.cleanup = options.cleanup !== false;
    this.trigger = options.trigger ?? 'pointerdown';
    this.blendMode = options.blendMode ?? 'source-over';

    this.ripples = [];
    this.running = false;
    this.perlin = Perlin();
    this._attachedCanvases = [];
    this._listeners = new Map();
  }

  attachTo(elements) {
    const els = typeof elements === 'string'
      ? document.querySelectorAll(elements)
      : elements;

    els.forEach(canvas => {
      if (canvas.dataset.canvasRippleAttached) return;
      canvas.dataset.canvasRippleAttached = 'true';

      const { disconnect } = observeCanvasSize(canvas);
      canvas._rippleResizeDisconnect = disconnect;
      this._attachedCanvases.push(canvas);

      const triggerEl = canvas.parentElement ?? canvas;
      const listener = (event) => this._createRipple(event, canvas);
      triggerEl.addEventListener(this.trigger, listener);
      this._listeners.set(canvas, { triggerEl, listener });
    });
  }

  _createRipple(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);

    const centerX = this.center
      ? rect.width / 2
      : event.clientX - rect.left;
    const centerY = this.center
      ? rect.height / 2
      : event.clientY - rect.top;

    this.ripples.push({
      x: centerX,
      y: centerY,
      startTime: performance.now(),
      duration: this.duration,
      size: size,
      canvas: canvas,
      noiseSeedX: Math.random() * 1000,
      noiseSeedY: Math.random() * 1000
    });

    if (!this.running) {
      this.running = true;
      this._animate();
    }
  }

  _animate() {
    const now = performance.now();
    const canvasMap = new Map();

    this.ripples.forEach(ripple => {
      if (!canvasMap.has(ripple.canvas)) {
        canvasMap.set(ripple.canvas, []);
      }
      canvasMap.get(ripple.canvas).push(ripple);
    });

    canvasMap.forEach((ripples, canvas) => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = this.blendMode;

      ripples.forEach(ripple => {
        const elapsed = now - ripple.startTime;
        let progress = Math.min(elapsed / ripple.duration, 1);
        progress = 1 - Math.pow(1 - progress, 3);

        const radius = ripple.size * this.maxScale * progress;
        const alpha = 1 - progress;

        const t = now / 500;
        const noiseX = this.perlin(ripple.noiseSeedX, t) * this.noiseAmplitude;
        const noiseY = this.perlin(ripple.noiseSeedY, t) * this.noiseAmplitude;

        const gradient = ctx.createRadialGradient(
          ripple.x + noiseX,
          ripple.y + noiseY,
          0,
          ripple.x + noiseX,
          ripple.y + noiseY,
          radius
        );

        this.colorStops.forEach(stop => {
          let colorStr;
          if ('h' in stop) {
            const { h, s, l, a } = stop;
            colorStr = `hsla(${h}, ${s}%, ${l}%, ${a * alpha})`;
          } else if ('color' in stop) {
            colorStr = stop.color.replace(/rgba?\\(([^)]+)\\)/, (match, values) => {
              const parts = values.split(',').map(p => p.trim());
              const r = parts[0], g = parts[1], b = parts[2];
              const a = parts[3] !== undefined ? parseFloat(parts[3]) * alpha : alpha;
              return `rgba(${r}, ${g}, ${b}, ${a})`;
            });
          } else {
            const { r, g, b, a } = stop;
            colorStr = `rgba(${r},${g},${b},${a * alpha})`;
          }
          gradient.addColorStop(stop.offset, colorStr);
        });

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(
          ripple.x + noiseX,
          ripple.y + noiseY,
          radius,
          0,
          2 * Math.PI
        );
        ctx.fill();
      });

      ctx.globalCompositeOperation = 'source-over';
    });

    this.ripples = this.ripples.filter(r => now - r.startTime < r.duration);

    if (this.ripples.length > 0) {
      requestAnimationFrame(() => this._animate());
    } else {
      this.running = false;
    }
  }

  disconnectRipple(canvas) {
    if (canvas._rippleResizeDisconnect) {
      canvas._rippleResizeDisconnect();
      delete canvas._rippleResizeDisconnect;
    }
  }

  destroy() {
    for (const canvas of this._attachedCanvases) {
      const listenerEntry = this._listeners.get(canvas);
      if (listenerEntry) {
        listenerEntry.triggerEl.removeEventListener(this.trigger, listenerEntry.listener);
        this._listeners.delete(canvas);
      }
      delete canvas.dataset.canvasRippleAttached;
      this.disconnectRipple(canvas);
    }
    this._attachedCanvases = [];
    this.ripples = [];
    this.running = false;
  }
}


// // Tiny Perlin noise implementation
// // Source: https://github.com/joeiddon/perlin (MIT)

// // import CanvasRipple from './canvasRipple.js';

// // const ripple = new CanvasRipple({
// //   duration: 1000,
// //   scale: 1.2,
// //   noise: 3, // More noticeable smooth noise
// //   blendMode: 'lighter', // Additive blending
// //   colorStops: [
// //     { offset: 0, color: 'rgba(0,150,255,0.4)' },
// //     { offset: 1, color: 'rgba(0,150,255,0)' }
// //   ]
// // });

// // ripple.attachTo('.ripple');


// function Perlin(seed = Math.random()) {
//   const p = new Uint8Array(512);
//   for (let i = 0; i < 256; i++) p[i] = i;
//   for (let i = 0; i < 256; i++) {
//     const r = i + Math.floor(seed * (256 - i));
//     const t = p[i];
//     p[i] = p[r];
//     p[r] = t;
//   }
//   for (let i = 0; i < 256; i++) p[i + 256] = p[i];
//   function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
//   function lerp(t, a, b) { return a + t * (b - a); }
//   function grad(hash, x, y) {
//     const h = hash & 3;
//     return (h & 1 ? -x : x) + (h & 2 ? -y : y);
//   }
//   return function(x, y) {
//     const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
//     x -= Math.floor(x); y -= Math.floor(y);
//     const u = fade(x), v = fade(y);
//     const aa = p[p[X] + Y], ab = p[p[X] + Y + 1];
//     const ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
//     return lerp(v,
//       lerp(u, grad(aa, x, y), grad(ba, x - 1, y)),
//       lerp(u, grad(ab, x, y - 1), grad(bb, x - 1, y - 1))
//     );
//   };
// }

// export default class CanvasRipple {
//   constructor(options = {}) {
//     this.duration = options.duration ?? 600;
//     this.easing = options.easing ?? 'ease-out';
//     this.colorStops = options.colorStops ?? [
//       { offset: 0, color: 'rgba(0,0,0,0.3)' },
//       { offset: 1, color: 'rgba(0,0,0,0)' }
//     ];
//     this.maxScale = options.scale ?? 1;
//     this.noiseAmplitude = options.noise ?? 1;
//     this.center = options.center ?? false;
//     this.cleanup = options.cleanup !== false;
//     this.trigger = options.trigger ?? 'pointerdown';
//     this.blendMode = options.blendMode ?? 'source-over'; // New blending option

//     this.ripples = [];
//     this.running = false;

//     this.perlin = Perlin(); // Create noise generator
//   }

//   attachTo(selectorOrElements) {
//     const elements = typeof selectorOrElements === 'string'
//       ? document.querySelectorAll(selectorOrElements)
//       : selectorOrElements;

//     elements.forEach(el => {
//       if (el.dataset.canvasRippleAttached) return;
//       el.dataset.canvasRippleAttached = 'true';

//       const canvas = document.createElement('canvas');
//       canvas.className = 'canvas-ripple';
//       canvas.style.position = 'absolute';
//       canvas.style.top = '0';
//       canvas.style.left = '0';
//       canvas.style.width = '100%';
//       canvas.style.height = '100%';
//       canvas.style.pointerEvents = 'none';
//       canvas.style.borderRadius = getComputedStyle(el).borderRadius;
//       canvas.width = el.offsetWidth;
//       canvas.height = el.offsetHeight;
//       el.appendChild(canvas);

//       const resizeObserver = new ResizeObserver(() => {
//         canvas.width = el.offsetWidth;
//         canvas.height = el.offsetHeight;
//       });
//       resizeObserver.observe(el);

//       el.addEventListener(this.trigger, e =>
//         this._createRipple(e, canvas)
//       );
//     });
//   }

//   _createRipple(event, canvas) {
//     const rect = canvas.getBoundingClientRect();
//     const size = Math.max(rect.width, rect.height);

//     const centerX = this.center
//       ? rect.width / 2
//       : event.clientX - rect.left;
//     const centerY = this.center
//       ? rect.height / 2
//       : event.clientY - rect.top;

//     this.ripples.push({
//       x: centerX,
//       y: centerY,
//       startTime: performance.now(),
//       duration: this.duration,
//       size: size,
//       canvas: canvas,
//       noiseSeedX: Math.random() * 1000,
//       noiseSeedY: Math.random() * 1000
//     });

//     if (!this.running) {
//       this.running = true;
//       this._animate();
//     }
//   }

//   _animate() {
//     const now = performance.now();
//     const canvasMap = new Map();
//     this.ripples.forEach(ripple => {
//       if (!canvasMap.has(ripple.canvas)) {
//         canvasMap.set(ripple.canvas, []);
//       }
//       canvasMap.get(ripple.canvas).push(ripple);
//     });

//     canvasMap.forEach((ripples, canvas) => {
//       const ctx = canvas.getContext('2d');
//       ctx.clearRect(0, 0, canvas.width, canvas.height);
//       ctx.globalCompositeOperation = this.blendMode;

//       ripples.forEach(ripple => {
//         const elapsed = now - ripple.startTime;
//         let progress = Math.min(elapsed / ripple.duration, 1);
//         progress = 1 - Math.pow(1 - progress, 3);

//         const radius = ripple.size * this.maxScale * progress;
//         const alpha = 1 - progress;

//         // Perlin noise offsets
//         const t = now / 500;
//         const noiseX = this.perlin(ripple.noiseSeedX, t) * this.noiseAmplitude;
//         const noiseY = this.perlin(ripple.noiseSeedY, t) * this.noiseAmplitude;

//         const gradient = ctx.createRadialGradient(
//           ripple.x + noiseX,
//           ripple.y + noiseY,
//           0,
//           ripple.x + noiseX,
//           ripple.y + noiseY,
//           radius
//         );

//         this.colorStops.forEach(stop => {
//           let colorStr;

//           if ('h' in stop) {
//             // HSL input
//             const h = stop.h;
//             const s = stop.s /* * 100 */; // Convert from 0-1 to 0-100%
//             const l = stop.l /* * 100 */;
//             const a = stop.a * alpha;

//             colorStr = `hsla(${h}, ${s}%, ${l}%, ${a})`;
//           } else {
//             // RGB input
//             colorStr = `rgba(${stop.r},${stop.g},${stop.b},${stop.a * alpha})`;
//           }

//           gradient.addColorStop(stop.offset, colorStr);
//         });

//         ctx.fillStyle = gradient;
//         ctx.beginPath();
//         ctx.arc(
//           ripple.x + noiseX,
//           ripple.y + noiseY,
//           radius,
//           0,
//           2 * Math.PI
//         );
//         ctx.fill();
//       });

//       ctx.globalCompositeOperation = 'source-over';
//     });

//     this.ripples = this.ripples.filter(r => now - r.startTime < r.duration);

//     if (this.ripples.length > 0) {
//       requestAnimationFrame(() => this._animate());
//     } else {
//       this.running = false;
//     }
//   }
// }
