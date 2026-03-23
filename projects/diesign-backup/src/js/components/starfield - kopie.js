import Easing from "./easing.js";

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

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    // canvas.style.width = `${width}px`;
    // canvas.style.height = `${height}px`;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    createStars();
  }
  window.addEventListener("resize", resize);
  resize();

  function spawnFallingStar() {
    const r = rng();
    const relOff = options.fallingStars.settings.relationshipOffset;

    const getRelOrRand = (range) =>
      options.fallingStars.settings.relationshipMode
        ? interpolate(range[0], range[1], r) +
          random(-relOff, relOff) * (range[1] - range[0])
        : random(...range, rng);

    const radius = Math.max(0.1, getRelOrRand(options.fallingStars.star.radius));
    const length = getRelOrRand(options.fallingStars.star.length);
    const trailFade = getRelOrRand(options.fallingStars.animations.fade);
    const opacity = Math.max(
      0.1,
      Math.min(1, getRelOrRand(options.fallingStars.animations.opacity))
    );

    const angleDeg = random(...options.fallingStars.animations.direction);
    const angleRad = (angleDeg * Math.PI) / 180;

    const speed = random(...options.fallingStars.animations.speed);

    const spawnX =
      getRelOrRand(options.fallingStars.scene.spawnZone.x) *
      (canvas.width / (window.devicePixelRatio || 1));
    const spawnY =
      getRelOrRand(options.fallingStars.scene.spawnZone.y) *
      (canvas.height / (window.devicePixelRatio || 1));

    const hue = random(...options.fallingStars.star.head.colors.h);
    const saturation = random(...options.fallingStars.star.head.colors.s);
    const lightness = random(...options.fallingStars.star.head.colors.l);

    activeFalling.push({
      x: spawnX,
      y: spawnY,
      angle: angleRad,
      speed,
      length,
      radius,
      hue,
      saturation,
      lightness,
      opacity,
      trailFade,
      progress: 0,
      tailProgress: 0,
    });
  }

  let lastTime = performance.now();
  function draw(now = performance.now()) {
    const delta = now - lastTime;
    lastTime = now;

    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, w, h);

    // Background stars
    if (options.starField.enabled) {
      for (const star of stars) {
        star.twinklePhase += star.twinkleSpeed * delta;
        const alpha = star.baseAlpha + Math.sin(star.twinklePhase) * 0.3;

        const gradient = ctx.createRadialGradient(
          star.x, star.y, 0,
          star.x, star.y, star.radius * 3
        );

        gradient.addColorStop(
          0,
          `hsla(${star.hue}, ${star.saturation}%, ${star.lightness}%, ${alpha})`
        );
        gradient.addColorStop(
          1,
          `hsla(${star.hue}, ${star.saturation}%, ${star.lightness}%, 0)`
        );

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Falling stars
    if (options.fallingStars.settings.enabled) {
      const spawnProb = options.fallingStars.scene.rate * delta;
      if (
        activeFalling.length < options.fallingStars.scene.maxConcurrent &&
        rng() < spawnProb
      ) {
        spawnFallingStar();
      }

      for (let i = activeFalling.length - 1; i >= 0; i--) {
        const fs = activeFalling[i];
        const moveDist = fs.speed * (delta / 1000);

        fs.progress = Math.max(
          0,
          Math.min(1, (fs.progress || 0) + moveDist / Math.max(1, fs.length))
        );

        // Tail growth
        fs.tailProgress = Math.min(1, fs.tailProgress + delta * options.fallingStars.animations.tailGrowthSpeed / 1000);

        const arcOffset = (
          isFinite(fs.progress) &&
          isFinite(options.fallingStars.animations.arcAmount) &&
          isFinite(fs.length)
        )
          ? Math.sin(fs.progress * Math.PI) * options.fallingStars.animations.arcAmount * fs.length
          : 0;

        const dx = Math.cos(fs.angle) * moveDist;
        const dy = Math.sin(fs.angle) * moveDist;

        fs.x += dx;
        fs.y += dy;

        const flicker = 1 - random(0, options.fallingStars.animations.flicker, rng);

        const currentX = fs.x + arcOffset;
        const tailLength = fs.length * fs.tailProgress;

        const x1 = currentX - Math.cos(fs.angle) * tailLength;
        const y1 = fs.y - Math.sin(fs.angle) * tailLength;

        if (!isFinite(currentX) || !isFinite(fs.y) || !isFinite(x1) || !isFinite(y1)) {
          activeFalling.splice(i, 1);
          continue;
        }

        // Trail gradient
        if (options.fallingStars.star.trail.enabled) {
          const trailGradient = ctx.createLinearGradient(currentX, fs.y, x1, y1);
          trailGradient.addColorStop(
            0,
            `hsla(${options.fallingStars.star.trail.gradient.from.h},${options.fallingStars.star.trail.gradient.from.s}%,${options.fallingStars.star.trail.gradient.from.l}%,${fs.opacity * flicker})`
          );
          trailGradient.addColorStop(
            1,
            `hsla(${options.fallingStars.star.trail.gradient.to.h},${options.fallingStars.star.trail.gradient.to.s}%,${options.fallingStars.star.trail.gradient.to.l}%,0)`
          );

          ctx.strokeStyle = trailGradient;
          ctx.lineCap = "round";
          ctx.lineWidth = fs.radius * 2;
          ctx.beginPath();
          ctx.moveTo(currentX, fs.y);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        }

        // Additive glow halo
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const glowGradient = ctx.createRadialGradient(
          currentX,
          fs.y,
          0,
          currentX,
          fs.y,
          fs.radius * 6
        );
        glowGradient.addColorStop(
          0,
          `hsla(${fs.hue},${fs.saturation}%,${fs.lightness}%,${options.fallingStars.star.glow * fs.opacity * flicker})`
        );
        glowGradient.addColorStop(1, "transparent");
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(currentX, fs.y, fs.radius * 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Meteor head with bloom
        ctx.save();
        ctx.translate(currentX, fs.y);
        ctx.rotate(fs.angle);

        if (options.fallingStars.star.head.bloom.enabled) {
          ctx.shadowColor = `hsla(${fs.hue},${fs.saturation}%,${fs.lightness}%,0.9)`;
          ctx.shadowBlur = fs.radius * options.fallingStars.star.head.bloom.blurMultiplier;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = `hsla(${fs.hue},${fs.saturation}%,${fs.lightness}%,${fs.opacity})`;

        ctx.beginPath();
        if (options.fallingStars.star.head.shape === "ellipse") {
          ctx.ellipse(
            0,
            0,
            fs.radius * options.fallingStars.star.head.ellipseAspectRatio,
            fs.radius,
            0,
            0,
            Math.PI * 2
          );
        } else {
          ctx.arc(0, 0, fs.radius, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();

        // Fade out
        fs.opacity *= 1 - fs.trailFade;

        if (
          fs.opacity < 0.01 ||
          fs.x < -fs.length ||
          fs.x > w + fs.length ||
          fs.y > h + fs.length
        ) {
          activeFalling.splice(i, 1);
        }
      }
    }

    requestAnimationFrame(draw);
  }

  draw();

  // --- Helpers ---

  function startMeteorShower({
    delay = 0,
    duration = 5000,
    maxRate = 20,
  } = {}) {
    function launch() {
      const startTime = performance.now();
      let lastTime = startTime;
      let spawnAccumulator = 0;
      function loop(now) {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        const rate = Math.sin(t * Math.PI) * maxRate;
        const delta = (now - lastTime) / 1000;
        lastTime = now;
        spawnAccumulator += rate * delta;
        const toSpawn = Math.floor(spawnAccumulator);
        if (toSpawn > 0) {
          for (let i = 0; i < toSpawn; i++) spawnFallingStar();
          spawnAccumulator -= toSpawn;
        }
        if (t < 1) requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);
    }
    if (delay > 0) {
      setTimeout(launch, delay);
    } else {
      launch();
    }
  }

  function startMeteorShowers({
    delay = 0,
    interval = 20000,
    duration = 5000,
    maxRate = 20,
  } = {}) {
    function scheduleNext() {
      startMeteorShower({
        duration,
        maxRate,
        seed: Math.random() * 1e5,
      });
      meteorShowersTimer = setTimeout(scheduleNext, interval);
    }
    meteorShowersTimer = setTimeout(scheduleNext, delay);
  }

  function startMeteorShowerSchedule({
    delay = 0,
    sequence = [],
  } = {}) {
    stopMeteorShowerSchedule();
    let index = 0;
    function runNext() {
      if (index >= sequence.length) return;
      const config = sequence[index++];
      startMeteorShower({
        duration: config.duration || 5000,
        maxRate: config.maxRate || 20,
        seed: Math.random() * 1e5,
      });
      const totalDelay = (config.duration || 5000) + (config.delayAfter || 0);
      const id = setTimeout(runNext, totalDelay);
      meteorScheduleTimeouts.push(id);
    }
    const startId = setTimeout(runNext, delay);
    meteorScheduleTimeouts.push(startId);
  }

  function stopMeteorShowers() {
    if (meteorShowersTimer) {
      clearTimeout(meteorShowersTimer);
      meteorShowersTimer = null;
    }
  }

  function stopMeteorShowerSchedule() {
    for (const id of meteorScheduleTimeouts) clearTimeout(id);
    meteorScheduleTimeouts = [];
  }

  return {
    destroy() {
      window.removeEventListener("resize", resize);
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


// import Easing from './easing.js';

// export default function createStarfield(canvas, config = {}) {
//   const ctx = canvas.getContext("2d");

//   const defaults = {
//      numStars: 600,
//     minRadius: 0.25,
//     maxRadius: 1.25,
//     minAlpha: .5,
//     maxAlpha: 1,
//     minTwinkleSpeed: 0.001,
//     maxTwinkleSpeed: 0.007,
//     hueRange: [280, 290],
//     saturationRange: [86, 106],
//     lightnessRange: [65, 100],
//     fallingStars: {
//       enabled: true,
//       seed: null,
//       rate: 0.002,
//       maxConcurrent: 10,
//       minSpeed: 150,
//       maxSpeed: 250,
//       meteorRadius: [0.25, 3],
//       arcAmount: 0,
//       meteorGlow: 1,
//       flickerAmount: 0.6,
//       directionRange: [44, 46],
//       headShape: "ellipse", // ellipse or radial
//       ellipseAspectRatio: 1.75,
//       relationshipMode: false,
//       relationshipOffset: 0.4,
//       lengthRange: [100, 325],
//       fadeRange: [0.06, 0.065],
//       opacityRange: [.5, 1],
//       tailGrowthSpeed: 5,
//       trailEasing: "easeInBack",
//       trailColorStart: { hue: 285, saturation: 96, lightness: 100 },
//       trailColorEnd: { hue: 285, saturation: 96, lightness: 65 },
//       spawnZone: {
//         xRange: [-0.1, 1],
//         yRange: [-0.05, 0.7]
//       },
//       color: {
//         hueRange: [275, 295],
//         saturation: [96, 96],
//         lightness: [100, 100]
//       },
//       bloom: {
//           enabled: true,          // turn glow on/off
//           blurMultiplier: 12,      // how strong/big the glow is (multiplies radius)
//       }
//     }
//   };

//   const options = {
//     ...defaults,
//     ...config,
//     fallingStars: {
//       ...defaults.fallingStars,
//       ...(config.fallingStars || {}),
//       color: {
//         ...defaults.fallingStars.color,
//         ...((config.fallingStars && config.fallingStars.color) || {})
//       },
//       trailColorStart: {
//         ...defaults.fallingStars.trailColorStart,
//         ...((config.fallingStars && config.fallingStars.trailColorStart) || {})
//       },
//       trailColorEnd: {
//         ...defaults.fallingStars.trailColorEnd,
//         ...((config.fallingStars && config.fallingStars.trailColorEnd) || {})
//       }
//     }
//   };

//   const easingFn = Easing[options.fallingStars.trailEasing] || easingFn.linear;

//   let rng = Math.random;
//   if (options.fallingStars.seed != null) {
//     let seed = options.fallingStars.seed;
//     rng = (() => {
//       let s = seed;
//       return () => {
//         s = Math.sin(s) * 10000;
//         return s - Math.floor(s);
//       };
//     })();
//   }

//   let stars = [];
//   let meteorShowersTimer = null;
//   let meteorScheduleTimeouts = [];

//   function random(min, max, useRng = Math.random) {
//     return useRng() * (max - min) + min;
//   }

//   function interpolate(min, max, t) {
//     return min + (max - min) * t;
//   }

//   function createStars() {
//     stars = [];
//     for (let i = 0; i < options.numStars; i++) {
//       stars.push({
//         x: Math.random() * canvas.width,
//         y: Math.random() * canvas.height,
//         radius: random(options.minRadius, options.maxRadius),
//         baseAlpha: random(options.minAlpha, options.maxAlpha),
//         twinkleSpeed: random(options.minTwinkleSpeed, options.maxTwinkleSpeed),
//         twinklePhase: Math.random() * Math.PI * 2,
//         hue: random(options.hueRange[0], options.hueRange[1]),
//         saturation: random(options.saturationRange[0], options.saturationRange[1]),
//         lightness: random(options.lightnessRange[0], options.lightnessRange[1])
//       });
//     }
//   }

//   function resize() {
//     const dpr = window.devicePixelRatio || 1;
//     const width = window.innerWidth;
//     const height = window.innerHeight;

//     canvas.width = width * dpr;
//     canvas.height = height * dpr;
//     canvas.style.width = `${width}px`;
//     canvas.style.height = `${height}px`;

//     ctx.setTransform(1, 0, 0, 1, 0, 0);
//     ctx.scale(dpr, dpr);

//     createStars();
//   }

//   window.addEventListener("resize", resize);
//   resize();

//   const activeFalling = [];

//   function spawnFallingStar() {
//     const r = rng();
//     const relOff = options.fallingStars.relationshipOffset;

//     // If relationship mode, derive properties consistently:
//     let radius = options.fallingStars.relationshipMode
//       ? interpolate(
//           options.fallingStars.meteorRadius[0],
//           options.fallingStars.meteorRadius[1],
//           r
//         )
//       : random(
//           options.fallingStars.meteorRadius[0],
//           options.fallingStars.meteorRadius[1],
//           rng
//         );

//     // Add offset:
//     radius += random(-relOff, relOff, rng) * (options.fallingStars.meteorRadius[1] - options.fallingStars.meteorRadius[0]);

//     radius = Math.max(0.1, radius);

//     const length = options.fallingStars.relationshipMode
//       ? interpolate(
//           options.fallingStars.lengthRange[0],
//           options.fallingStars.lengthRange[1],
//           r
//         ) + random(-relOff, relOff, rng)*(options.fallingStars.lengthRange[1]-options.fallingStars.lengthRange[0])
//       : random(
//           options.fallingStars.lengthRange[0],
//           options.fallingStars.lengthRange[1],
//           rng
//         );

//     const trailFade = options.fallingStars.relationshipMode
//       ? interpolate(
//           options.fallingStars.fadeRange[0],
//           options.fallingStars.fadeRange[1],
//           r
//         ) + random(-relOff, relOff, rng)*(options.fallingStars.fadeRange[1]-options.fallingStars.fadeRange[0])
//       : interpolate(
//           options.fallingStars.fadeRange[0],
//           options.fallingStars.fadeRange[1],
//           rng()
//         );

//     const opacity = options.fallingStars.relationshipMode
//       ? interpolate(
//           options.fallingStars.opacityRange[0],
//           options.fallingStars.opacityRange[1],
//           r
//         ) + random(-relOff, relOff, rng)*(options.fallingStars.opacityRange[1]-options.fallingStars.opacityRange[0])
//       : random(
//           options.fallingStars.opacityRange[0],
//           options.fallingStars.opacityRange[1],
//           rng
//         );
//         const clampedOpacity = Math.max(0.1, Math.min(1, opacity));

//     // const spawnY = options.fallingStars.relationshipMode
//     //   ? interpolate(
//     //       options.fallingStars.spawnYRange[0],
//     //       options.fallingStars.spawnYRange[1],
//     //       r
//     //     )
//     //   : random(
//     //       options.fallingStars.spawnYRange[0],
//     //       options.fallingStars.spawnYRange[1],
//     //       rng
//     //     );

//     const angleDeg = random(
//       options.fallingStars.directionRange[0],
//       options.fallingStars.directionRange[1],
//       rng
//     );
//     const angleRad = (angleDeg * Math.PI) / 180;

//     const speed = random(
//       options.fallingStars.minSpeed,
//       options.fallingStars.maxSpeed,
//       rng
//     );

//     const hue = random(
//       options.fallingStars.color.hueRange[0],
//       options.fallingStars.color.hueRange[1],
//       rng
//     );
//     const saturation = random(
//       options.fallingStars.color.saturation[0],
//       options.fallingStars.color.saturation[1],
//       rng
//     );
//     const lightness = random(
//       options.fallingStars.color.lightness[0],
//       options.fallingStars.color.lightness[1],
//       rng
//     );

//     const w = canvas.width / (window.devicePixelRatio || 1);
//     const h = canvas.height / (window.devicePixelRatio || 1);

//     const spawnX = options.fallingStars.relationshipMode
//       ? interpolate(
//           options.fallingStars.spawnZone.xRange[0],
//           options.fallingStars.spawnZone.xRange[1],
//           r
//         )
//       : random(
//           options.fallingStars.spawnZone.xRange[0],
//           options.fallingStars.spawnZone.xRange[1],
//           rng
//         );

//     const spawnYCoord = options.fallingStars.relationshipMode
//       ? interpolate(
//           options.fallingStars.spawnZone.yRange[0],
//           options.fallingStars.spawnZone.yRange[1],
//           r
//         )
//       : random(
//           options.fallingStars.spawnZone.yRange[0],
//           options.fallingStars.spawnZone.yRange[1],
//           rng
//         );

//     const x = spawnX * w;
//     const y = spawnYCoord * h;


//     activeFalling.push({
//       x,
//       y,
//       angle: angleRad,
//       speed,
//       length,
//       radius,
//       hue,
//       saturation,
//       lightness,
//       opacity: clampedOpacity,
//       trailFade,
//       progress: 0,
//       tailProgress: 0
//     });

//     // console.log(`Spawned star at x=${x}, y=${y}, angle=${angleDeg}, speed=${speed}`);
//   }

//   let lastTime = performance.now();

//   function draw(now = performance.now()) {
//     const delta = now - lastTime;
//     lastTime = now;

//     const w = canvas.width / (window.devicePixelRatio || 1);
//     const h = canvas.height / (window.devicePixelRatio || 1);

//     ctx.clearRect(0, 0, w, h);

//     // Background stars
//     for (const star of stars) {
//       star.twinklePhase += star.twinkleSpeed * delta;
//       const alpha = star.baseAlpha + Math.sin(star.twinklePhase) * 0.3;

//       const gradient = ctx.createRadialGradient(
//         star.x,
//         star.y,
//         0,
//         star.x,
//         star.y,
//         star.radius * 3
//       );

//       gradient.addColorStop(
//         0,
//         `hsla(${star.hue}, ${star.saturation}%, ${star.lightness}%, ${alpha})`
//       );
//       gradient.addColorStop(
//         1,
//         `hsla(${star.hue}, ${star.saturation}%, ${star.lightness}%, 0)`
//       );

//       ctx.fillStyle = gradient;
//       ctx.beginPath();
//       ctx.arc(star.x, star.y, star.radius * 3, 0, Math.PI * 2);
//       ctx.fill();
//     }

//     // Falling stars
//     if (options.fallingStars.enabled) {
//       const spawnProb = options.fallingStars.rate * delta;
//       if (
//         activeFalling.length < options.fallingStars.maxConcurrent &&
//         rng() < spawnProb
//       ) {
//         spawnFallingStar();
//       }

//       for (let i = activeFalling.length - 1; i >= 0; i--) {
//         const fs = activeFalling[i];
//         const moveDist = fs.speed * (delta / 1000);

//         fs.progress = Math.max(
//           0,
//           Math.min(1, (fs.progress || 0) + moveDist / Math.max(1, fs.length))
//         );

//         // Tail growth
//         fs.tailProgress = Math.min(1, fs.tailProgress + delta * options.fallingStars.tailGrowthSpeed / 1000);

//         const arcOffset = (
//           isFinite(fs.progress) &&
//           isFinite(options.fallingStars.arcAmount) &&
//           isFinite(fs.length)
//         )
//           ? Math.sin(fs.progress * Math.PI) * options.fallingStars.arcAmount * fs.length
//           : 0;

//         const dx = Math.cos(fs.angle) * moveDist;
//         const dy = Math.sin(fs.angle) * moveDist;

//         fs.x += dx;
//         fs.y += dy;

//         const flicker = 1 - random(0, options.fallingStars.flickerAmount, rng);

//         const currentX = fs.x + arcOffset;
//         const tailLength = fs.length * fs.tailProgress;

//         const x1 = currentX - Math.cos(fs.angle) * tailLength;
//         const y1 = fs.y - Math.sin(fs.angle) * tailLength;

//         if (!isFinite(currentX) || !isFinite(fs.y) || !isFinite(x1) || !isFinite(y1)) {
//           activeFalling.splice(i, 1);
//           continue;
//         }

//         // Trail gradient from start color to end color
//         const trailGradient = ctx.createLinearGradient(currentX, fs.y, x1, y1);
//         trailGradient.addColorStop(
//           0,
//           `hsla(${options.fallingStars.trailColorStart.hue},${options.fallingStars.trailColorStart.saturation}%,${options.fallingStars.trailColorStart.lightness}%,${fs.opacity * flicker})`
//         );
//         trailGradient.addColorStop(
//           1,
//           `hsla(${options.fallingStars.trailColorEnd.hue},${options.fallingStars.trailColorEnd.saturation}%,${options.fallingStars.trailColorEnd.lightness}%,0)`
//         );

//         ctx.strokeStyle = trailGradient;
//         ctx.lineCap = "round";
//         ctx.lineWidth = fs.radius * 2;
//         ctx.beginPath();
//         ctx.moveTo(currentX, fs.y);
//         ctx.lineTo(x1, y1);
//         ctx.stroke();

//         // Meteor glow with additive blending for stronger glow
//         ctx.save();
//         // ctx.globalCompositeOperation = "color-dodge";  // Use additive color blending

//         const glowGradient = ctx.createRadialGradient(
//           currentX,
//           fs.y,
//           0,
//           currentX,
//           fs.y,
//           fs.radius * 5  // increased radius for stronger glow
//         );
//         glowGradient.addColorStop(
//           0,
//           `hsla(${fs.hue},${fs.saturation}%,${fs.lightness}%,${options.fallingStars.meteorGlow * fs.opacity * flicker})`
//         );
//         glowGradient.addColorStop(1, `transparent`);

//         ctx.fillStyle = glowGradient;
//         ctx.beginPath();
//         ctx.arc(currentX, fs.y, fs.radius * 6, 0, Math.PI * 2);
//         ctx.fill();

//         ctx.restore();


//         // Meteor head with bloom
// ctx.save();

// if (options.fallingStars.bloom.enabled) {
//   ctx.shadowColor = `hsla(${fs.hue},${fs.saturation}%,${fs.lightness}%,${fs.opacity * flicker})`;
//   ctx.shadowBlur = fs.radius * options.fallingStars.bloom.blurMultiplier;
// } else {
//   ctx.shadowColor = "transparent";
//   ctx.shadowBlur = 0;
// }

// ctx.fillStyle = `hsla(${fs.hue},${fs.saturation}%,${fs.lightness}%,${fs.opacity * flicker})`;
// ctx.translate(currentX, fs.y);
// ctx.rotate(fs.angle);

// if (options.fallingStars.headShape === "ellipse") {
//   ctx.beginPath();
//   ctx.ellipse(
//     0,
//     0,
//     fs.radius * options.fallingStars.ellipseAspectRatio,
//     fs.radius,
//     0,
//     0,
//     Math.PI * 2
//   );
// } else {
//   ctx.beginPath();
//   ctx.arc(0, 0, fs.radius, 0, Math.PI * 2);
// }

// ctx.fill();
// ctx.restore();


//         fs.opacity *= 1 - fs.trailFade;

//         if (
//           fs.opacity < 0.01 ||
//           fs.x < -fs.length ||
//           fs.x > w + fs.length ||
//           fs.y > h + fs.length
//         ) {
//           activeFalling.splice(i, 1);
//         }
//       }
//     }

//     requestAnimationFrame(draw);
//   }


//   draw();

//   function startMeteorShower({
//     delay = 0,           // NEW: initial delay
//     duration = 5000,     
//     maxRate = 20,        
//     seed = null
//   } = {}) {
//     function launch() {
//       const startTime = performance.now();
//       let lastTime = startTime;
//       let spawnAccumulator = 0;

//       function loop(now) {
//         const elapsed = now - startTime;
//         const t = Math.min(1, elapsed / duration);
//         const rate = Math.sin(t * Math.PI) * maxRate;

//         const delta = (now - lastTime) / 1000;
//         lastTime = now;

//         spawnAccumulator += rate * delta;
//         const toSpawn = Math.floor(spawnAccumulator);

//         if (toSpawn > 0) {
//           for (let i = 0; i < toSpawn; i++) {
//             spawnFallingStar();
//           }
//           spawnAccumulator -= toSpawn;
//         }

//         if (t < 1) {
//           requestAnimationFrame(loop);
//         }
//       }
//       requestAnimationFrame(loop);
//     }

//     if (delay > 0) {
//       setTimeout(launch, delay);
//     } else {
//       launch();
//     }
//   }

//   function startMeteorShowers({
//     delay = 0,
//     interval = 20000,
//     duration = 5000,
//     maxRate = 20
//   } = {}) {
//     function scheduleNext() {
//       startMeteorShower({
//         duration,
//         maxRate,
//         seed: Math.random() * 100000
//       });
//       meteorShowersTimer = setTimeout(scheduleNext, interval);
//     }
//     meteorShowersTimer = setTimeout(scheduleNext, delay);
//   }

//   function startMeteorShowerSchedule({
//     delay = 0,
//     sequence = []
//   } = {}) {
//     // If there is already an active schedule, clear it
//     stopMeteorShowerSchedule();

//     let index = 0;

//     function runNext() {
//       if (index >= sequence.length) {
//         return;
//       }

//       const config = sequence[index++];
//       startMeteorShower({
//         duration: config.duration || 5000,
//         maxRate: config.maxRate || 20,
//         seed: Math.random() * 100000
//       });

//       const totalDelay = (config.duration || 5000) + (config.delayAfter || 0);
//       const timeoutId = setTimeout(runNext, totalDelay);
//       meteorScheduleTimeouts.push(timeoutId);
//     }

//     const startId = setTimeout(runNext, delay);
//     meteorScheduleTimeouts.push(startId);
//   }
//   function stopMeteorShowerSchedule() {
//     for (const id of meteorScheduleTimeouts) {
//       clearTimeout(id);
//     }
//     meteorScheduleTimeouts = [];
//   }



//   function stopMeteorShowers() {
//     if (meteorShowersTimer) {
//       clearTimeout(meteorShowersTimer);
//       meteorShowersTimer = null;
//     }
//   }



//   return {
//     destroy() {
//       window.removeEventListener("resize", resize);
//     },
//     burst(count = 5) {
//       for (let i = 0; i < count; i++) {
//         spawnFallingStar();
//       }
//     },
//     startMeteorShower,
//     startMeteorShowers,
//     startMeteorShowerSchedule,
//     stopMeteorShowers,
//     stopMeteorShowerSchedule
//   };
// }