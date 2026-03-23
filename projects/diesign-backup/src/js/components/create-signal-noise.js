import { observeCanvasSize } from './canvas-manager';

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function easeOutExpo(t) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export default function createSignalNoise(canvas, config = {}) {
  const ctx = canvas.getContext('2d', { alpha: true });
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');

  const settings = {
    burstInterval: [3000, 11000],
    burstDuration: [280, 1100],
    noiseResolution: 0.16,
    baseScanlineAlpha: 0.045,
    baseBandAlpha: 0.06,
    maxNoiseAlpha: 0.22,
    maxGhostAlpha: 0.18,
    maxBandAlpha: 0.24,
    maxFlickerAlpha: 0.12,
    ...config
  };

  let width = 0;
  let height = 0;
  let animationFrame = 0;
  let disposed = false;
  let nextBurstAt = performance.now() + randomBetween(...settings.burstInterval);
  let activeBurst = null;
  let noiseStamp = 0;

  const baseBands = Array.from({ length: 4 }, (_, index) => ({
    phase: Math.random() * Math.PI * 2,
    speed: randomBetween(0.00015, 0.00045),
    amplitude: randomBetween(0.03, 0.12),
    thickness: randomBetween(0.04, 0.1),
    alpha: randomBetween(0.02, settings.baseBandAlpha),
    hueShift: index % 2 === 0 ? 1 : -1
  }));

  const noiseCanvas = document.createElement('canvas');
  const noiseCtx = noiseCanvas.getContext('2d', { alpha: true });

  function resizeNoiseBuffer() {
    const scaledWidth = Math.max(48, Math.round(width * settings.noiseResolution));
    const scaledHeight = Math.max(32, Math.round(height * settings.noiseResolution));

    if (noiseCanvas.width === scaledWidth && noiseCanvas.height === scaledHeight) {
      return;
    }

    noiseCanvas.width = scaledWidth;
    noiseCanvas.height = scaledHeight;
  }

  function scheduleNextBurst(now) {
    nextBurstAt = now + randomBetween(...settings.burstInterval);
  }

  function createBurst(now) {
    const bandCount = Math.round(randomBetween(2, 6));
    const tearCount = Math.round(randomBetween(3, 10));

    activeBurst = {
      start: now,
      duration: randomBetween(...settings.burstDuration),
      scanlineAlpha: randomBetween(0.08, 0.2),
      bandAlpha: randomBetween(0.08, settings.maxBandAlpha),
      noiseAlpha: randomBetween(0.08, settings.maxNoiseAlpha),
      ghostAlpha: randomBetween(0.08, settings.maxGhostAlpha),
      flickerAlpha: randomBetween(0.03, settings.maxFlickerAlpha),
      sliceBands: Array.from({ length: bandCount }, () => ({
        baseY: Math.random(),
        drift: randomBetween(0.03, 0.18),
        height: randomBetween(0.025, 0.13),
        speed: randomBetween(0.0015, 0.005),
        phase: Math.random() * Math.PI * 2,
        shift: randomBetween(12, 80) * (Math.random() > 0.5 ? 1 : -1),
        alpha: randomBetween(0.15, 0.7)
      })),
      tearLines: Array.from({ length: tearCount }, () => ({
        y: Math.random(),
        thickness: randomBetween(1, 4),
        alpha: randomBetween(0.08, 0.45),
        hueShift: Math.random() > 0.5 ? 1 : -1
      }))
    };
  }

  function getBurstStrength(now) {
    if (!activeBurst) {
      if (now >= nextBurstAt) {
        createBurst(now);
      }
      return 0;
    }

    const elapsed = now - activeBurst.start;
    const progress = clamp(elapsed / activeBurst.duration);

    if (progress >= 1) {
      activeBurst = null;
      scheduleNextBurst(now);
      return 0;
    }

    const attack = clamp(progress / 0.16);
    const release = clamp((1 - progress) / 0.52);

    return easeOutExpo(Math.min(attack, 1)) * easeInOutSine(release);
  }

  function refreshNoise(now, intensity) {
    if (!noiseCtx || now - noiseStamp < 1000 / (14 + intensity * 22)) {
      return;
    }

    noiseStamp = now;
    resizeNoiseBuffer();

    const imageData = noiseCtx.createImageData(noiseCanvas.width, noiseCanvas.height);
    const { data } = imageData;

    for (let index = 0; index < data.length; index += 4) {
      const value = Math.random() * 255;
      const tint = (Math.random() - 0.5) * 36 * intensity;

      data[index] = clamp(value + tint, 0, 255);
      data[index + 1] = clamp(value - tint * 0.4, 0, 255);
      data[index + 2] = clamp(value + tint * 1.15, 0, 255);
      data[index + 3] = Math.round((50 + Math.random() * 205) * intensity);
    }

    noiseCtx.putImageData(imageData, 0, 0);
  }

  function drawScanlines(now, burstStrength) {
    const scanlineAlpha = settings.baseScanlineAlpha + (activeBurst?.scanlineAlpha || 0) * burstStrength;
    const drift = ((now * 0.03) % 6) - 3;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let y = -6; y < height + 6; y += 3) {
      const animatedAlpha = scanlineAlpha * (0.72 + 0.28 * Math.sin(y * 0.015 + now * 0.01));
      ctx.fillStyle = `rgba(255,255,255,${animatedAlpha})`;
      ctx.fillRect(0, y + drift, width, 1);
    }

    ctx.restore();
  }

  function drawBaseBands(now, burstStrength) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    baseBands.forEach((band) => {
      const centerY = (0.5 + Math.sin(now * band.speed + band.phase) * band.amplitude) * height;
      const bandHeight = Math.max(18, height * band.thickness);
      const gradient = ctx.createLinearGradient(0, centerY - bandHeight, 0, centerY + bandHeight);
      const alpha = band.alpha + burstStrength * 0.04;

      gradient.addColorStop(0, 'rgba(255,255,255,0)');
      gradient.addColorStop(0.5, `hsla(${286 + band.hueShift * 10}, 95%, 78%, ${alpha})`);
      gradient.addColorStop(1, 'rgba(255,255,255,0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, centerY - bandHeight, width, bandHeight * 2);
    });

    ctx.restore();
  }

  function drawNoise(now, burstStrength) {
    if (!burstStrength) {
      return;
    }

    refreshNoise(now, burstStrength);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = (activeBurst?.noiseAlpha || 0) * burstStrength;
    ctx.drawImage(noiseCanvas, 0, 0, width, height);
    ctx.restore();
  }

  function drawDistortionBands(now, burstStrength) {
    if (!activeBurst || !burstStrength) {
      return;
    }

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    activeBurst.sliceBands.forEach((band, index) => {
      const oscillation = Math.sin(now * band.speed + band.phase);
      const centerY = (band.baseY + oscillation * band.drift) * height;
      const bandHeight = Math.max(8, height * band.height * (0.55 + burstStrength * 0.8));
      const shiftX = band.shift * burstStrength * (0.45 + 0.55 * Math.sin(now * band.speed * 0.7 + index));

      const ghostGradient = ctx.createLinearGradient(0, centerY - bandHeight, 0, centerY + bandHeight);
      ghostGradient.addColorStop(0, 'rgba(255,255,255,0)');
      ghostGradient.addColorStop(0.35, `hsla(${292}, 100%, 80%, ${(activeBurst.ghostAlpha * band.alpha) * burstStrength})`);
      ghostGradient.addColorStop(0.65, `hsla(${196}, 100%, 72%, ${(activeBurst.ghostAlpha * band.alpha * 0.82) * burstStrength})`);
      ghostGradient.addColorStop(1, 'rgba(255,255,255,0)');

      ctx.filter = `blur(${1 + burstStrength * 8}px)`;
      ctx.fillStyle = ghostGradient;
      ctx.fillRect(shiftX, centerY - bandHeight, width, bandHeight * 2);
      ctx.filter = 'none';

      ctx.fillStyle = `rgba(255,255,255,${activeBurst.bandAlpha * 0.1 * band.alpha * burstStrength})`;
      ctx.fillRect(0, centerY - bandHeight * 0.12, width, Math.max(1, bandHeight * 0.24));
    });

    activeBurst.tearLines.forEach((line, index) => {
      const y = line.y * height + Math.sin(now * 0.014 + index * 2.1) * 12 * burstStrength;
      const lineAlpha = line.alpha * burstStrength;

      ctx.fillStyle = `hsla(${line.hueShift > 0 ? 292 : 196}, 100%, 76%, ${lineAlpha})`;
      ctx.fillRect(0, y, width, line.thickness);
      ctx.fillStyle = `rgba(255,255,255,${lineAlpha * 0.7})`;
      ctx.fillRect(0, y + line.thickness, width, 1);
    });

    ctx.restore();
  }

  function drawFlicker(now, burstStrength) {
    if (!activeBurst || !burstStrength) {
      return;
    }

    const flicker = (0.45 + 0.55 * Math.sin(now * 0.12)) * activeBurst.flickerAlpha * burstStrength;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(255,255,255,${flicker})`;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  function drawFrame(now) {
    if (disposed) {
      return;
    }

    if (!width || !height) {
      animationFrame = window.requestAnimationFrame(drawFrame);
      return;
    }

    const burstStrength = reducedMotion?.matches ? 0 : getBurstStrength(now);

    ctx.clearRect(0, 0, width, height);
    drawBaseBands(now, burstStrength);
    drawScanlines(now, burstStrength);
    drawNoise(now, burstStrength);
    drawDistortionBands(now, burstStrength);
    drawFlicker(now, burstStrength);

    animationFrame = window.requestAnimationFrame(drawFrame);
  }

  const observer = observeCanvasSize(
    canvas,
    (newDpr, clientWidth, clientHeight) => {
      width = clientWidth;
      height = clientHeight;
      canvas.style.width = `${clientWidth}px`;
      canvas.style.height = `${clientHeight}px`;
    },
    {
      excludeClass: '__never-exclude__',
      debounceDelay: 80,
      dprCheckInterval: 200,
      visibilityThreshold: 0
    }
  );

  animationFrame = window.requestAnimationFrame(drawFrame);

  return {
    onDestroy() {
      disposed = true;
      observer.disconnect();
      window.cancelAnimationFrame(animationFrame);
    },
    update(nextConfig = {}) {
      Object.assign(settings, nextConfig);
    }
  };
}
