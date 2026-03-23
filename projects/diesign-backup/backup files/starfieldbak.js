import Easing from "./easing.js";
import { observeCanvasSize } from './canvas-manager';

// Helper for deep merge
function mergeDeep(target, source) {
  for (const key of Object.keys(source)) {
    if (
      source[key] instanceof Object &&
      key in target &&
      target[key] instanceof Object
    ) {
      mergeDeep(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

export default function createStarfield(canvas, config = {}) {
  const ctx = canvas.getContext("2d");

  const defaults = {
    starField: {
      enabled: true,
      amount: 600,
      radius: [0.25, 1.25],
      alpha: [0.5, 1],
      twinkleSpeed: [0.001, 0.007],
      colors: { h: [280, 290], s: [86, 106], l: [65, 100] },
    },
    fallingStars: {
      settings: {
        enabled: true,
        seed: null,
        relationshipMode: false,
        relationshipOffset: 0.4,
      },
      scene: {
        rate: 0.002,
        maxConcurrent: 10,
        spawnZone: { x: [-0.1, 1], y: [-0.05, 0.7] },
      },
      animations: {
        speed: [150, 250],
        fade: [0.06, 0.065],
        direction: [44, 46],
        opacity: [0.5, 1],
        flicker: 0.6,
        arcAmount: 0,
        tailGrowthSpeed: 5,
        trailEasing: "easeInBack",
      },
      star: {
        radius: [0.25, 3],
        length: [100, 325],
        glow: 1,
        head: {
          colors: { h: [275, 295], s: [96, 96], l: [100, 100] },
          shape: "ellipse",
          ellipseAspectRatio: 1.75,
          bloom: { enabled: true, blurMultiplier: 12 },
        },
        trail: {
          enabled: true,
          gradient: {
            from: { h: 285, s: 96, l: 100 },
            to: { h: 285, s: 96, l: 65 },
          },
        },
      },
    },
  };

  const options = JSON.parse(JSON.stringify(defaults));
  mergeDeep(options, config);

  const easingFn =
    Easing[options.fallingStars.animations.trailEasing] || Easing.linear;

  let rng = Math.random;
  if (options.fallingStars.settings.seed != null) {
    let seed = options.fallingStars.settings.seed;
    rng = (() => {
      let s = seed;
      return () => {
        s = Math.sin(s) * 10000;
        return s - Math.floor(s);
      };
    })();
  }

  const stars = [];
  const activeFalling = [];
  let meteorShowersTimer = null;
  let meteorScheduleTimeouts = [];

  function random(min, max, useRng = Math.random) {
    return useRng() * (max - min) + min;
  }

  function interpolate(min, max, t) {
    return min + (max - min) * t;
  }

  function createStars() {
    stars.length = 0;
    if (!options.starField.enabled) return;
    for (let i = 0; i < options.starField.amount; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: random(...options.starField.radius),
        baseAlpha: random(...options.starField.alpha),
        twinkleSpeed: random(...options.starField.twinkleSpeed),
        twinklePhase: Math.random() * Math.PI * 2,
        hue: random(...options.starField.colors.h),
        saturation: random(...options.starField.colors.s),
        lightness: random(...options.starField.colors.l),
      });
    }
  }

  // Integrate observeCanvasSize for responsive sizing
  const { disconnect } = observeCanvasSize(canvas, () => {
    createStars();
  });

  // ... rest of the starfield code continues unchanged ...

  return {
    destroy() {
      disconnect();
    },
    burst(count = 5) {
      for (let i = 0; i < count; i++) spawnFallingStar();
    },
    startMeteorShower,
    startMeteorShowers,
    startMeteorShowerSchedule,
    stopMeteorShowers,
    stopMeteorShowerSchedule,
  };
}
