import { chromium } from 'playwright';

const baseUrl = 'http://127.0.0.1:8123/index.html';
const out = [];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function routeState(page) {
  return page.evaluate(() => {
    const app = document.querySelector('#app');
    const logo = document.querySelector('.logo-container');
    return {
      path: location.pathname,
      route: app?.dataset.route ?? null,
      phase: app?.dataset.routeTransitionPhase ?? null,
      mode: app?.dataset.routeTransitionMode ?? null,
      running: app?.classList.contains('is-route-transition-running') ?? false,
      logoOpacity: logo ? getComputedStyle(logo).opacity : null,
      logoVisibility: logo ? getComputedStyle(logo).visibility : null
    };
  });
}

async function clickNav(page, targetId) {
  await page.click(`label[for="${targetId}"]`);
  await sleep(120);
  const early = await routeState(page);
  await sleep(300);
  const mid = await routeState(page);
  await sleep(700);
  const settled = await routeState(page);
  return { early, mid, settled };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await sleep(1200);

  out.push({ name: 'initial-home', state: await routeState(page) });
  out.push({ name: 'home-to-work', result: await clickNav(page, 'nav-work') });
  out.push({ name: 'work-to-home', result: await clickNav(page, 'nav-home') });
  out.push({ name: 'home-to-about', result: await clickNav(page, 'nav-about') });
  out.push({ name: 'about-to-contact', result: await clickNav(page, 'nav-contact') });
  out.push({ name: 'contact-to-home', result: await clickNav(page, 'nav-home') });

  const finalState = await routeState(page);
  console.log(JSON.stringify({ checks: out, finalState, consoleErrors }, null, 2));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
