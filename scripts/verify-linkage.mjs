import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const appUrl = process.env.APP_URL || 'http://localhost:8081';

await page.goto(appUrl);
await page.getByText('先看看演示耗材库').click();
await page.waitForTimeout(800);
await page.getByText('曜石黑').first().click();
await page.waitForTimeout(300);

const before = await page.getByText('备注', { exact: true }).boundingBox();
await page.getByText('品牌 · Bambu Studio').click();
await page.waitForTimeout(200);
const after = await page.getByText('备注', { exact: true }).boundingBox();
console.log('NOTE_SHIFT:', before?.y, after?.y, (after?.y || 0) - (before?.y || 0));
await page.screenshot({ path: 'artifacts-app-dropdown.png', fullPage: true });

await page.getByText('SUNLU', { exact: true }).click();
await page.waitForTimeout(200);
console.log(
  'LINKED_TYPE:',
  await page.getByText('类型 · Bambu Studio').locator('..').innerText(),
);

await page.getByText('类型 · Bambu Studio').click();
await page.waitForTimeout(150);
await page.getByText('PLA+', { exact: true }).click();
await page.waitForTimeout(200);
console.log(
  'LINKED_COLOR:',
  await page.getByText('颜色 · 通用色与自定义').locator('..').innerText(),
);
await page.screenshot({ path: 'artifacts-linkage.png', fullPage: true });

await browser.close();
