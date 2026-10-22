import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

await page.goto('http://127.0.0.1:8787');
await page.waitForTimeout(1800);
const state = await page.evaluate(async () => {
  const manifestLink = document.querySelector('link[rel="manifest"]')?.getAttribute('href');
  const registrations = await navigator.serviceWorker.getRegistrations();
  const manifest = manifestLink ? await fetch(manifestLink).then((response) => response.json()) : null;
  return {
    manifestLink,
    display: manifest?.display,
    name: manifest?.name,
    icons: manifest?.icons?.length || 0,
    serviceWorkers: registrations.length,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  };
});

console.log('PWA:', state);
console.log('PAGE_ERRORS:', errors);
await browser.close();
