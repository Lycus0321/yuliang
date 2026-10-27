import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const appUrl = process.env.APP_URL || 'http://localhost:8081';

async function openDemo(viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(appUrl);
  await page.getByText('先看看演示耗材库').click();
  await page.waitForTimeout(500);
  return { context, page };
}

async function readPreferences(page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem('yuliang-preferences-v1') || '{}'),
  );
}

try {
  {
    const { context, page } = await openDemo();
    await page.evaluate(() => {
      const key = 'yuliang-preferences-v1';
      const current = JSON.parse(localStorage.getItem(key) || '{}');
      Object.assign(current, {
        forceRfidEdit: true,
        defaultTarePresetId: 'custom-tare-777',
        defaultExtraPresetId: 'custom-extra-777',
      });
      localStorage.setItem(key, JSON.stringify(current));
    });
    await page.reload();
    await page.waitForTimeout(700);
    await page.getByLabel('偏好设置', { exact: true }).click();
    await page.getByLabel('数据管理', { exact: true }).first().click();
    await page.getByLabel('导入 JSON', { exact: true }).click();
    await page
      .getByLabel('偏好 JSON 输入框', { exact: true })
      .fill('{"customBrands":["探针品牌"]}');
    await page.getByLabel('合并导入', { exact: true }).click();
    await page.waitForTimeout(250);
    const preferences = await readPreferences(page);
    assert.equal(preferences.forceRfidEdit, true);
    assert.equal(preferences.defaultTarePresetId, 'custom-tare-777');
    assert.equal(preferences.defaultExtraPresetId, 'custom-extra-777');
    assert.deepEqual(preferences.customBrands, ['探针品牌']);
    await context.close();
  }

  {
    const { context, page } = await openDemo();
    await page.locator('[aria-label*="剩余"]').first().click();
    await page.getByLabel('耗材备注', { exact: true }).fill('B'.repeat(50));
    await page.getByText('品牌 · Bambu Studio', { exact: true }).click();
    await page.getByText('SUNLU', { exact: true }).click();
    await page.getByText('保存信息', { exact: true }).click();
    await page.waitForTimeout(350);
    await page.locator('[aria-label*="剩余"]').first().click();
    const storedNote = await page.getByLabel('耗材备注', { exact: true }).inputValue();
    assert(storedNote.endsWith('B'.repeat(50)));
    assert(storedNote.length > 50);
    await context.close();
  }

  {
    const { context, page } = await openDemo();
    await page.getByLabel('偏好设置', { exact: true }).click();
    await page.getByLabel('耗材与皮重', { exact: true }).first().click();
    await page.getByText('管理预设', { exact: true }).first().click();
    const toggle = page.getByLabel('显示通用空盘', { exact: true });
    assert.equal(await toggle.isEnabled(), false);
    const preferences = await readPreferences(page);
    assert(!(preferences.hiddenTarePresetIds || []).includes('generic-200'));
    await context.close();
  }

  {
    const { context, page } = await openDemo();
    await page.getByLabel('列表视图', { exact: true }).click();
    await page.waitForTimeout(250);
    const badge = page.getByText('AMS 1 · 1 号位', { exact: true }).first().locator('..');
    const box = await badge.boundingBox();
    assert(box);
    assert(box.width < 140);
    await context.close();
  }

  {
    const { context, page } = await openDemo();
    await page.locator('[aria-label*="剩余"]').first().click();
    await page.getByText('重量', { exact: true }).click();
    await page.getByText('保存重量', { exact: true }).click();
    await page.waitForTimeout(250);
    const beforeDelete = await readPreferences(page);
    assert.equal(Object.keys(beforeDelete.spoolWeights).length, 1);
    await page.locator('[aria-label*="剩余"]').first().click();
    await page.getByLabel('删除料盘', { exact: true }).click();
    await page.getByLabel('确认删除料盘', { exact: true }).click();
    await page.waitForTimeout(300);
    const afterDelete = await readPreferences(page);
    assert.deepEqual(afterDelete.spoolWeights, {});
    await context.close();
  }

  {
    const { context, page } = await openDemo({ width: 979, height: 900 });
    const mobileNav = await page.getByLabel('偏好设置', { exact: true }).boundingBox();
    assert(mobileNav);
    assert(mobileNav.y > 800);
    await context.close();
  }

  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.goto(appUrl);
    await page.evaluate(() => {
      localStorage.setItem(
        'bambu-session-v1',
        JSON.stringify({
          token: 'fake-token',
          region: 'china',
          email: 'test@example.com',
          demo: false,
        }),
      );
    });
    await page.route('**/api/spools', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            spools: [
              {
                id: 101,
                filamentVendor: 'Bambu Lab',
                filamentType: 'PLA',
                filamentName: 'PLA Basic',
                displayName: '测试料盘',
                color: '#202421',
                netWeight: 812,
                totalNetWeight: 1000,
                inPrinter: false,
                createType: 'manual',
              },
            ],
          }),
        });
        return;
      }
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: '更新耗材接口超时，请稍后重试。' }),
      });
    });
    await page.route('**/api/catalog', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: '读取耗材目录失败（503）。' }),
      });
    });
    await page.reload();
    await page.waitForTimeout(900);
    assert(
      await page.getByText(/已使用内置耗材目录/).isVisible(),
    );
    await page.getByText('测试料盘', { exact: true }).click();
    await page.getByText('重量', { exact: true }).click();
    const weightInput = page.getByLabel('整盘总重，单位克', { exact: true });
    await weightInput.fill('1012.5');
    assert.equal(await weightInput.inputValue(), '1012');
    await page.getByText('保存重量', { exact: true }).click();
    await page.waitForTimeout(300);
    assert(
      await page
        .getByText('更新耗材接口超时，请稍后重试。', { exact: true })
        .isVisible(),
    );
    await context.close();
  }

  console.log('REVIEW_REGRESSIONS: PASS');
} finally {
  await browser.close();
}
