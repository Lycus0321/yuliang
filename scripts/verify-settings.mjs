import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const appUrl = process.env.APP_URL || 'http://127.0.0.1:8787';

try {
  await page.goto(appUrl);
  await page.getByText('先看看演示耗材库').click();
  await page.waitForTimeout(700);
  await page.getByText('偏好设置', { exact: true }).first().click();
  await page.waitForTimeout(250);
  assert(await page.getByText('账户与安全', { exact: true }).first().isVisible());
  await page.screenshot({
    path: 'artifacts-settings-security.png',
    fullPage: true,
  });

  await page.getByLabel('耗材目录', { exact: true }).click();
  await page.waitForTimeout(180);
  assert(await page.getByLabel('新增品牌', { exact: true }).isVisible());
  await page.screenshot({
    path: 'artifacts-settings-catalog.png',
    fullPage: true,
  });

  await page.getByLabel('偏好设置', { exact: true }).click();
  await page.waitForTimeout(180);
  await page.getByText('耗材与皮重', { exact: true }).click();
  await page.waitForTimeout(180);
  assert(await page.getByText('空盘皮重', { exact: true }).isVisible());
  await page.screenshot({
    path: 'artifacts-settings-tare.png',
    fullPage: true,
  });

  await page.getByText('数据管理', { exact: true }).click();
  await page.waitForTimeout(180);
  assert(await page.getByLabel('导出 JSON', { exact: true }).isVisible());
  assert(await page.getByLabel('合并导入', { exact: true }).isVisible());
  assert(await page.getByLabel('完整替换', { exact: true }).isVisible());
  await page.screenshot({
    path: 'artifacts-settings-data.png',
    fullPage: true,
  });

  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 320, height: 640 });
  await mobile.goto(appUrl);
  await mobile.waitForTimeout(600);
  const statRights = await Promise.all(
    ['已装入设备', '低余量', '材料类型'].map(async (label) => {
      const box = await mobile.getByText(label, { exact: true }).first().boundingBox();
      return box ? box.x + box.width : Number.POSITIVE_INFINITY;
    }),
  );
  assert(statRights.every((right) => right <= 320));
  await mobile.getByText('偏好设置', { exact: true }).first().click();
  await mobile.waitForTimeout(250);
  const accountBox = await mobile.getByText('演示账户', { exact: true }).boundingBox();
  const logoutBox = await mobile.getByLabel('退出登录', { exact: true }).boundingBox();
  assert(accountBox);
  assert(logoutBox);
  assert(logoutBox.y > accountBox.y);
  await mobile.getByLabel('耗材目录', { exact: true }).click();
  await mobile.waitForTimeout(180);
  const dimensions = await mobile.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  assert.equal(dimensions.scrollWidth, dimensions.innerWidth);
  await mobile.screenshot({
    path: 'artifacts-settings-mobile.png',
    fullPage: true,
  });
  await mobile.close();

  console.log('SETTINGS_LAYOUT: PASS');
  console.log('PAGE_ERRORS:', errors);
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
