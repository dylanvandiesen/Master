export default function createStarfield(canvas, config = {}) {
  // const ctx = canvas.getContext("2d");
  const ctx = canvas.getContext("2d", { alpha: true, premultipliedAlpha: true });

  const defaults = {
    numStars: 300,
    minRadius: 0.3,
    maxRadius: 1.8,
    minAlpha: 0.4,
    maxAlpha: 1,
    minTwinkleSpeed: 0.001,
    maxTwinkleSpeed: 0.005,
    hueRange: [200, 60],
    saturationRange: [30, 80],
    lightnessRange: [70, 100],
    fallingStars: {
      enabled: true,
      seed: null,
      rate: 0.001,
      maxConcurrent: 5,
      minSpeed: 300,
      maxSpeed: 600,
      minLength: 100,
      maxLength: 300,
      arcAmount: 0.9, // 0=straight, >0=curved
      meteorRadius: [1, 3],
      meteorGlow: 0.6,
      trailFade: 0.04,
      trailOpacity: 1,
      flickerAmount: 0.2,
      directionRange: [60, 100],
      trailEasing: "easeOutQuad",
      spawnZone: {
        xRange: [0, 1],
        yRange: [-0.1, 0.2]
      },
      color: {
        hueRange: [0, 60],
        saturation: [60, 100],
        lightness: [70, 100]
      }
    }
  };

  const options = {
    ...defaults,
    ...config,
    fallingStars: {
      ...defaults.fallingStars,
      ...(config.fallingStars || {}),
      color: {
        ...defaults.fallingStars.color,
        ...((config.fallingStars && config.fallingStars.color) || {})
      },
      spawnZone: {
        ...defaults.fallingStars.spawnZone,
        ...((config.fallingStars && config.fallingStars.spawnZone) || {})
      }
    }
  };

  const Easing = {
    linear: t => t,
    easeOutQuad: t => t * (2 - t),
    easeInQuad: t => t * t,
    easeInOutQuad: t =>
      t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  };

  const easingFn = Easing[options.fallingStars.trailEasing] || Easing.linear;

  let rng = Math.random;
  if (options.fallingStars.seed != null) {
    let seed = options.fallingStars.seed;
    rng = (() => {
      let s = seed;
      return () => {
        s = Math.sin(s) * 10000;
        return s - Math.floor(s);
      };
    })();
  }

  let stars = [];

  function random(min, max, useRng = Math.random) {
    return useRng() * (max - min) + min;
  }

  function createStars() {
    stars = [];
    for (let i = 0; i < options.numStars; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: random(options.minRadius, options.maxRadius),
        baseAlpha: random(options.minAlpha, options.maxAlpha),
        twinkleSpeed: random(options.minTwinkleSpeed, options.maxTwinkleSpeed),
        twinklePhase: Math.random() * Math.PI * 2,
        hue: random(options.hueRange[0], options.hueRange[1]),
        saturation: random(options.saturationRange[0], options.saturationRange[1]),
        lightness: random(options.lightnessRange[0], options.lightnessRange[1])
      });
    }
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    createStars();
  }

  window.addEventListener("resize", resize);
  resize();

  const activeFalling = [];

  function spawnFallingStar() {
    const angleDeg = random(
      options.fallingStars.directionRange[0],
      options.fallingStars.directionRange[1],
      rng
    );
    const angleRad = (angleDeg * Math.PI) / 180;

    const speed = random(
      options.fallingStars.minSpeed,
      options.fallingStars.maxSpeed,
      rng
    );

    const length = random(
      options.fallingStars.minLength,
      options.fallingStars.maxLength,
      rng
    );

    const radius = random(
      options.fallingStars.meteorRadius[0],
      options.fallingStars.meteorRadius[1],
      rng
    );

    const hue = random(
      options.fallingStars.color.hueRange[0],
      options.fallingStars.color.hueRange[1],
      rng
    );
    const saturation = random(
      options.fallingStars.color.saturation[0],
      options.fallingStars.color.saturation[1],
      rng
    );
    const lightness = random(
      options.fallingStars.color.lightness[0],
      options.fallingStars.color.lightness[1],
      rng
    );

    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);

    const x = random(
      options.fallingStars.spawnZone.xRange[0] * w,
      options.fallingStars.spawnZone.xRange[1] * w,
      rng
    );
    const y = random(
      options.fallingStars.spawnZone.yRange[0] * h,
      options.fallingStars.spawnZone.yRange[1] * h,
      rng
    );

    activeFalling.push({
      x,
      y,
      angle: angleRad,
      speed,
      length,
      radius,
      hue,
      saturation,
      lightness,
      opacity: options.fallingStars.trailOpacity,
      progress: 0
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
    for (const star of stars) {
      star.twinklePhase += star.twinkleSpeed * delta;
      const alpha = star.baseAlpha + Math.sin(star.twinklePhase) * 0.3;

      const gradient = ctx.createRadialGradient(
        star.x,
        star.y,
        0,
        star.x,
        star.y,
        star.radius * 3
      );
      gradient.addColorStop(
        0,
        `hsla(${star.hue}, ${star.saturation}%, 100%, ${alpha * 1.2})`
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

    // Falling stars
    if (options.fallingStars.enabled) {
      const spawnProb = options.fallingStars.rate * delta;
      if (
        activeFalling.length < options.fallingStars.maxConcurrent &&
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

        const arcOffset = (
          isFinite(fs.progress) &&
          isFinite(fs.arcAmount) &&
          isFinite(fs.length)
        )
          ? Math.sin(fs.progress * Math.PI) * fs.arcAmount * fs.length
          : 0;

        const dx = Math.cos(fs.angle) * moveDist;
        const dy = Math.sin(fs.angle) * moveDist;

        fs.x += dx;
        fs.y += dy;

        const flicker = 1 - random(0, options.fallingStars.flickerAmount, rng);

        const currentX = fs.x + arcOffset;

        const x1 = currentX - Math.cos(fs.angle) * fs.length;
        const y1 = fs.y - Math.sin(fs.angle) * fs.length;

        if (!isFinite(currentX) || !isFinite(fs.y) || !isFinite(x1) || !isFinite(y1)) {
          activeFalling.splice(i, 1);
          continue;
        }

        const trailGradient = ctx.createLinearGradient(currentX, fs.y, x1, y1);
        trailGradient.addColorStop(
          0,
          `hsla(${fs.hue}, ${fs.saturation}%, ${fs.lightness}%, ${fs.opacity * flicker})`
        );
        trailGradient.addColorStop(
          1,
          `hsla(${fs.hue}, ${fs.saturation}%, ${fs.lightness}%, 0)`
        );

        ctx.strokeStyle = trailGradient;
        ctx.lineCap = "round";
        ctx.lineWidth = fs.radius * 2;
        ctx.beginPath();
        ctx.moveTo(currentX, fs.y);
        ctx.lineTo(x1, y1);
        ctx.stroke();

        const glowGradient = ctx.createRadialGradient(
          currentX,
          fs.y,
          0,
          currentX,
          fs.y,
          fs.radius * 4
        );
        glowGradient.addColorStop(
          0,
          `hsla(${fs.hue}, ${fs.saturation}%, ${fs.lightness}%, ${options.fallingStars.meteorGlow * fs.opacity * flicker})`
        );
        glowGradient.addColorStop(1, `transparent`);
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(currentX, fs.y, fs.radius * 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `hsla(${fs.hue}, ${fs.saturation}%, ${fs.lightness}%, ${fs.opacity * flicker})`;
        ctx.beginPath();
        ctx.arc(currentX, fs.y, fs.radius, 0, Math.PI * 2);
        ctx.fill();

        fs.opacity *= 1 - options.fallingStars.trailFade;

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

  return {
    destroy() {
      window.removeEventListener("resize", resize);
    },
    burst(count = 5) {
      for (let i = 0; i < count; i++) {
        spawnFallingStar();
      }
    }
  };
}











// export default function createStarfield(canvas, config = {}) {
//   const ctx = canvas.getContext("2d");

//   const defaults = {
//     numStars: 800,
//     minRadius: 0.1,
//     maxRadius: 1,
//     minAlpha: 0.4,
//     maxAlpha: 1,
//     minTwinkleSpeed: 0.002,
//     maxTwinkleSpeed: 0.006,
//     hueRange: [200, 60],
//     saturationRange: [30, 80],
//     lightnessRange: [70, 100],
//     fallingStars: {
//       enabled: true,
//       seed: null,
//       rate: 0.001,
//       minSpeed: 150,
//       maxSpeed: 350,
//       minLength: 10,
//       maxLength: 500,
//       trailFade: 0.09,
//       trailOpacity: 0.6,
//       flickerAmount: 0.4,
//       maxConcurrent: 100,
//       directionRange: [40, 40],
//       color: {
//         hueRange: [0, 60],
//         saturation: [60, 100],
//         lightness: [70, 100],
//       }
//     }
//   };

//   // Merge config
//   const options = {
//     ...defaults,
//     ...config,
//     fallingStars: { ...defaults.fallingStars, ...(config.fallingStars || {}) }
//   };

//   // RNG
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

//   // Background stars
//   let stars = [];

//   function random(min, max, useRng = Math.random) {
//     return useRng() * (max - min) + min;
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
//         lightness: random(options.lightnessRange[0], options.lightnessRange[1]),
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

//   // Falling stars
//   const activeFalling = [];

//   function spawnFallingStar() {
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
//     const length = random(
//       options.fallingStars.minLength,
//       options.fallingStars.maxLength,
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

//     // Start somewhere along the top width
//     const x = random(0, canvas.width / (window.devicePixelRatio || 1), rng);
//     const y = length;

//     activeFalling.push({
//       x,
//       y,
//       angle: angleRad,
//       speed,
//       length,
//       hue,
//       saturation,
//       lightness,
//       opacity: options.fallingStars.trailOpacity,
//     });
//   }

//   let lastTime = performance.now();
//   let accumulator = 0;

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
//       accumulator += delta;
//       const spawnProb = options.fallingStars.rate * delta;

//       if (
//         activeFalling.length < options.fallingStars.maxConcurrent &&
//         rng() < spawnProb
//       ) {
        
//     console.log("Falling star spawn triggered");
//     console.log("Active falling stars:", activeFalling.length);
//         spawnFallingStar();
//       }

//       for (let i = activeFalling.length - 1; i >= 0; i--) {
//         const fs = activeFalling[i];
//         const dx = Math.cos(fs.angle) * fs.speed * (delta / 1000);
//         const dy = Math.sin(fs.angle) * fs.speed * (delta / 1000);

//         fs.x += dx;
//         fs.y += dy;

//         fs.opacity *= 1 - options.fallingStars.trailFade;

//         const flicker = 1 - random(0, options.fallingStars.flickerAmount, rng);

//         ctx.strokeStyle = `hsla(${fs.hue}, ${fs.saturation}%, ${fs.lightness}%, ${
//           fs.opacity * flicker
//         })`;
//         ctx.lineWidth = 2;
//         ctx.beginPath();
//         ctx.moveTo(fs.x, fs.y);
//         ctx.lineTo(
//           fs.x - Math.cos(fs.angle) * fs.length,
//           fs.y - Math.sin(fs.angle) * fs.length
//         );
//         ctx.stroke();

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

//   return {
//     destroy() {
//       window.removeEventListener("resize", resize);
//     }
//   };
// }
