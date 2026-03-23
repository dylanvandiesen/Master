export default function createDisplacementEffect({
  canvas: displaceCanvas,
  imageSrc = '/image.jpg',
  displacementMapSrc = '/displacementMap.png',
  strength = 30,
}) {
  const displaceCtx = displaceCanvas.getContext('2d');
  let image = new Image();
  let dispMap = new Image();

  let mouse = { x: 0.5, y: 0.5 };
  let width = 0;
  let height = 0;
  let dispData;

  function resize() {
    width = displaceCanvas.clientWidth;
    height = displaceCanvas.clientHeight;
    displaceCanvas.width = width;
    displaceCanvas.height = height;
  }

  function onMouseMove(e) {
    const rect = displaceCanvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) / width;
    mouse.y = (e.clientY - rect.top) / height;
  }

  function draw() {
    if (!image.complete || !dispData) return;

    const imageData = displaceCtx.createImageData(width, height);
    const pixels = imageData.data;
    const source = displaceCtx.getImageData(0, 0, width, height).data;
    const disp = dispData.data;

    const dx = (mouse.x - 0.5) * strength;
    const dy = (mouse.y - 0.5) * strength;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;

        const dispX = (disp[i] - 128) / 128;   // Red channel = horizontal
        const dispY = (disp[i + 1] - 128) / 128; // Green channel = vertical

        const sx = Math.min(width - 1, Math.max(0, Math.floor(x + dispX * dx)));
        const sy = Math.min(height - 1, Math.max(0, Math.floor(y + dispY * dy)));
        const si = (sy * width + sx) * 4;

        pixels[i]     = source[si];     // R
        pixels[i + 1] = source[si + 1]; // G
        pixels[i + 2] = source[si + 2]; // B
        pixels[i + 3] = source[si + 3]; // A
      }
    }

    displaceCtx.putImageData(imageData, 0, 0);
    requestAnimationFrame(draw);
  }

  function loadDisplacementMap() {
    const offscreen = document.createElement('canvas');
    const offCtx = offscreen.getContext('2d');
    offscreen.width = width;
    offscreen.height = height;
    offCtx.drawImage(dispMap, 0, 0, width, height);
    dispData = offCtx.getImageData(0, 0, width, height);
  }

  function init() {
    resize();
    displaceCtx.drawImage(image, 0, 0, width, height);
    loadDisplacementMap();
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => {
    resize();
    init();
  });

  displaceCanvas.addEventListener('mousemove', onMouseMove);

  Promise.all([
    new Promise((res) => { image.onload = res; image.src = imageSrc; }),
    new Promise((res) => { dispMap.onload = res; dispMap.src = displacementMapSrc; }),
  ]).then(init);
}
