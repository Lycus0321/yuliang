import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
const appUrl = process.env.APP_URL || 'http://localhost:8081';

const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
desktop.on('pageerror', (error) => errors.push(error.message));
await desktop.goto(appUrl);
await desktop.getByText('先看看演示耗材库').click();
await desktop.waitForTimeout(1000);
console.log('DESKTOP_TEXT:', (await desktop.locator('body').innerText()).slice(0, 500));
await desktop.screenshot({ path: 'artifacts-app-library.png', fullPage: true });
console.log(
  'DESKTOP:',
  await desktop.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    cards: document.querySelectorAll('[aria-label*="剩余"]').length,
  })),
);
await desktop.getByLabel('列表视图', { exact: true }).click();
await desktop.waitForTimeout(200);
await desktop.screenshot({ path: 'artifacts-library-view-list.png', fullPage: true });
await desktop.getByLabel(/排序方式/).click();
await desktop.getByLabel('余量从少到多', { exact: true }).click();
await desktop.waitForTimeout(200);
await desktop.getByLabel('卡片视图', { exact: true }).click();

await desktop.getByLabel('称重', { exact: true }).first().click();
await desktop.waitForTimeout(400);
await desktop.screenshot({ path: 'artifacts-app-weight.png', fullPage: true });
await desktop.getByLabel('关闭').click();
await desktop.getByLabel('编辑', { exact: true }).first().click();
await desktop.waitForTimeout(300);
await desktop.screenshot({ path: 'artifacts-app-modal.png', fullPage: true });
await desktop.getByLabel('关闭').click();

await desktop.getByText('耗材目录', { exact: true }).click();
await desktop.waitForTimeout(200);
await desktop.screenshot({ path: 'artifacts-catalog-manager.png', fullPage: true });
console.log(
  'MANAGER_OPEN:',
  (await desktop.locator('body').innerText()).includes('耗材目录'),
);
await desktop.getByText('偏好设置', { exact: true }).first().click();
await desktop.waitForTimeout(350);
await desktop.screenshot({ path: 'artifacts-app-settings.png', fullPage: true });
await desktop.getByText('数据管理', { exact: true }).click();
await desktop.waitForTimeout(200);
const downloadPromise = desktop.waitForEvent('download');
await desktop.getByText('导出 JSON', { exact: true }).click();
const download = await downloadPromise;
console.log('EXPORT_FILE:', download.suggestedFilename());

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
mobile.on('pageerror', (error) => errors.push(error.message));
await mobile.goto(appUrl);
await mobile.getByText('先看看演示耗材库').click();
await mobile.waitForTimeout(1000);
await mobile.screenshot({ path: 'artifacts-app-mobile.png', fullPage: true });
console.log(
  'MOBILE:',
  await mobile.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  })),
);
await mobile.getByText('曜石黑').first().click();
await mobile.waitForTimeout(300);
await mobile.screenshot({ path: 'artifacts-app-modal-mobile.png' });
await mobile.getByText('重量', { exact: true }).click();
await mobile.waitForTimeout(250);
await mobile.screenshot({ path: 'artifacts-app-weight-mobile.png' });
await mobile.getByLabel('关闭').click();
await mobile.getByText('偏好设置', { exact: true }).first().click();
await mobile.waitForTimeout(300);
await mobile.screenshot({ path: 'artifacts-app-settings-mobile.png' });
console.log(
  'MOBILE_SETTINGS:',
  await mobile.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  })),
);

console.log('PAGE_ERRORS:', errors);
await browser.close();
