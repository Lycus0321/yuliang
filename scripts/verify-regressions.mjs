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
  await page.getByPlaceholder('添加这盘耗材的备注').fill('仅修改备注');
  await page.getByText('保存信息', { exact: true }).click();
  await page.waitForTimeout(300);

  await page.getByText('曜石黑').first().click();
  assert.equal(
    await page.getByPlaceholder('添加这盘耗材的备注').inputValue(),
    '仅修改备注',
  );
  assert.equal(await page.getByText(/品牌:/).count(), 0);
  await page.getByLabel('关闭').click();

  await page.getByText('曜石黑').first().click();
  await page.getByText('重量', { exact: true }).click();
  await page.getByPlaceholder('972').fill('100');
  assert(
    await page
      .getByText(/整盘总重不能小于空盘皮重与其他重量之和/)
      .isVisible(),
  );
  assert(
    await page
      .getByText('保存重量', { exact: true })
      .evaluate((element) => Boolean(element.closest('[aria-disabled="true"]'))),
  );

  console.log('REGRESSIONS: PASS');
  console.log('PAGE_ERRORS:', errors);
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
