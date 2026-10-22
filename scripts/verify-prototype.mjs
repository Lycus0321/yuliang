import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];

const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
desktop.on('pageerror', (error) => errors.push(error.message));
await desktop.goto('http://localhost:4173');
await desktop.waitForTimeout(500);
await desktop.screenshot({ path: 'artifacts-prototype-library.png', fullPage: true });
console.log(
  'DESKTOP:',
  await desktop.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    cards: document.querySelectorAll('.spool-card').length,
    rfidBadges: document.querySelectorAll('.mode-pill.is-rfid').length,
    columns: getComputedStyle(document.querySelector('.spool-grid')).gridTemplateColumns,
  })),
);

await desktop.locator('.spool-card').first().click();
await desktop.waitForTimeout(250);
await desktop.screenshot({ path: 'artifacts-prototype-modal-basic.png', fullPage: true });
console.log('MODAL_OPEN:', await desktop.locator('#spool-modal').evaluate((el) => el.classList.contains('is-open')));

await desktop.locator('[data-dropdown-toggle="brand"]').click();
await desktop.waitForTimeout(150);
await desktop.screenshot({ path: 'artifacts-prototype-brand-common.png', fullPage: true });
await desktop.locator('[data-expand-options="brand"]').click();
await desktop.waitForTimeout(150);
await desktop.screenshot({ path: 'artifacts-prototype-brand-all.png', fullPage: true });
await desktop.locator('[data-select-brand="Bambu Lab"]').click();
await desktop.locator('[data-dropdown-toggle="color"]').click();
await desktop.waitForTimeout(150);
await desktop.screenshot({ path: 'artifacts-prototype-color-options.png', fullPage: true });

await desktop.locator('[data-modal-tab="weight"]').click();
await desktop.waitForTimeout(250);
await desktop.screenshot({ path: 'artifacts-prototype-modal-weight.png', fullPage: true });
console.log(
  'TARE_DEFAULT:',
  await desktop.locator('[data-dropdown-toggle="tare"]').innerText(),
);
await desktop.locator('[data-dropdown-toggle="tare"]').click();
await desktop.waitForTimeout(150);
await desktop.screenshot({ path: 'artifacts-prototype-tare-options.png', fullPage: true });

await desktop.keyboard.press('Escape');
await desktop.locator('[data-view="settings"]').click();
await desktop.waitForTimeout(250);
await desktop.screenshot({ path: 'artifacts-prototype-settings.png', fullPage: true });

await desktop.goto('http://localhost:4173/?view=login');
await desktop.waitForTimeout(350);
await desktop.screenshot({ path: 'artifacts-prototype-login.png', fullPage: true });

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
mobile.on('pageerror', (error) => errors.push(error.message));
await mobile.goto('http://localhost:4173');
await mobile.waitForTimeout(500);
await mobile.screenshot({ path: 'artifacts-prototype-mobile.png', fullPage: true });
console.log(
  'MOBILE:',
  await mobile.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    columns: getComputedStyle(document.querySelector('.spool-grid')).gridTemplateColumns,
  })),
);
await mobile.locator('.spool-card').first().click();
await mobile.waitForTimeout(250);
await mobile.screenshot({ path: 'artifacts-prototype-mobile-modal.png' });
await mobile.locator('[data-modal-tab="weight"]').click();
await mobile.waitForTimeout(250);
console.log(
  'MOBILE_WEIGHT_RESULT:',
  JSON.stringify(
    await mobile.locator('.result-panel').evaluate((el) => ({
      text: el.innerText,
      rect: el.getBoundingClientRect().toJSON(),
      children: [...el.children].map((child) => ({
        text: child.innerText,
        rect: child.getBoundingClientRect().toJSON(),
        color: getComputedStyle(child.querySelector('span, strong')).color,
        display: getComputedStyle(child).display,
        opacity: getComputedStyle(child).opacity,
      })),
    })),
    null,
    2,
  ),
);
await mobile.locator('.result-panel').screenshot({ path: 'artifacts-prototype-result-panel.png' });
await mobile.screenshot({ path: 'artifacts-prototype-mobile-weight.png' });

console.log('PAGE_ERRORS:', errors);
await browser.close();
