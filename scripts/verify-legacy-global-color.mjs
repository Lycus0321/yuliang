import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const appUrl = process.env.APP_URL || 'http://127.0.0.1:8787';

try {
  await page.goto(appUrl);
  await page.getByText('先看看演示耗材库').click();
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    localStorage.setItem(
      'yuliang-preferences-v1',
      JSON.stringify({
        schemaVersion: 1,
        customColors: [{ name: '旧版自定义', hex: '#EEBCBC' }],
        customTypeColors: {
          'Bambu Lab/PLA Basic': [
            { name: '旧版自定义', hex: '#EEBCBC' },
          ],
        },
      }),
    );
  });
  await page.reload();
  await page.waitForTimeout(700);
  await page.getByText('偏好设置', { exact: true }).first().click();
  await page.getByLabel('耗材目录', { exact: true }).click();
  await page.waitForTimeout(250);

  assert(await page.getByText('旧版自定义', { exact: true }).isVisible());
  await page.getByLabel('编辑颜色 旧版自定义', { exact: true }).click();
  assert(await page.getByText('编辑颜色', { exact: true }).isVisible());
  await page.getByLabel('关闭表单').click();
  await page.getByLabel('删除颜色 旧版自定义', { exact: true }).click();
  await page.getByLabel('确认目录删除', { exact: true }).click();
  const remainingColors = await page.evaluate(() => {
    const raw = localStorage.getItem('yuliang-preferences-v1');
    if (!raw) return { global: [], typed: [] };
    const value = JSON.parse(raw);
    return {
      global: value.customColors || [],
      typed: Object.values(value.customTypeColors || {}).flat(),
    };
  });
  assert.deepEqual(remainingColors.global, []);
  assert.deepEqual(remainingColors.typed, []);

  console.log('LEGACY_GLOBAL_COLOR: PASS');
  console.log('PAGE_ERRORS:', errors);
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
