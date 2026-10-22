import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const appUrl = process.env.APP_URL || 'http://localhost:8150';

try {
  await page.goto(appUrl);
  await page.getByText('先看看演示耗材库').click();
  await page.waitForTimeout(800);

  await page.getByText('曜石黑').first().click();
  await page.getByLabel('标记为已用尽', { exact: true }).click();
  await page.screenshot({ path: 'artifacts-spool-actions.png', fullPage: true });
  await page.getByLabel('确认标记用尽', { exact: true }).click();
  await page.waitForTimeout(300);
  assert.equal(await page.getByText('曜石黑', { exact: true }).count(), 0);
  await page.getByText('已用尽', { exact: true }).click();
  assert((await page.getByText('已用尽', { exact: true }).count()) >= 2);
  assert.equal(await page.getByText('曜石黑', { exact: true }).count(), 1);

  await page.getByText('曜石黑').first().click();
  assert(await page.getByText('已经用尽', { exact: true }).isVisible());
  await page.getByLabel('关闭').click();
  await page.getByText('全部', { exact: true }).click();

  await page.getByText('哑光白').first().click();
  await page.getByLabel('删除料盘', { exact: true }).click();
  await page.getByLabel('确认删除料盘', { exact: true }).click();
  await page.waitForTimeout(300);
  assert.equal(await page.getByText('哑光白', { exact: true }).count(), 0);
  assert.equal(
    await page.locator('[aria-label*="剩余"]').count(),
    3,
  );

  console.log('SPOOL_ACTIONS: PASS');
  console.log('PAGE_ERRORS:', errors);
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
