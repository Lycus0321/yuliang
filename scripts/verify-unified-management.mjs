import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const appUrl = process.env.APP_URL || 'http://localhost:8150';

async function readPreferences() {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) =>
      item.includes('yuliang-preferences-v1'),
    );
    return key ? JSON.parse(localStorage.getItem(key) || '{}') : null;
  });
}

try {
  await page.goto(appUrl);
  await page.getByText('先看看演示耗材库').click();
  await page.waitForTimeout(800);

  await page.getByText('偏好设置', { exact: true }).first().click();
  await page.getByText('耗材与皮重', { exact: true }).click();
  await page.getByText('管理预设', { exact: true }).first().click();
  await page.getByLabel('新增空盘皮重', { exact: true }).click();
  await page.getByPlaceholder('名称').fill('测试皮重');
  await page.getByPlaceholder('克重').fill('175');
  await page.getByText('添加', { exact: true }).click();
  await page.getByLabel('关闭').click();

  await page.getByLabel('耗材目录', { exact: true }).click();
  assert(await page.getByText('耗材目录', { exact: true }).first().isVisible());
  await page.getByLabel('新增品牌', { exact: true }).click();
  await page.getByPlaceholder('品牌名称').fill('测试品牌');
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'artifacts-catalog-editor-modal.png' });
  await page.getByLabel('保存品牌', { exact: true }).click();
  await page.getByLabel('新增型号', { exact: true }).click();
  await page.getByPlaceholder('型号名称').fill('测试型号');
  await page.getByLabel('保存型号', { exact: true }).click();

  await page.getByLabel('选择默认皮重 测试型号', { exact: true }).click();
  await page.getByLabel('设置默认皮重 测试皮重', { exact: true }).click();

  await page.getByLabel('新增型号颜色', { exact: true }).click();
  await page.getByPlaceholder('颜色名称').fill('测试颜色');
  await page.getByLabel('选择颜色 #61C680', { exact: true }).click();
  await page.getByLabel('保存颜色', { exact: true }).click();
  await page.getByLabel('显示品牌 SUNLU', { exact: true }).click();
  await page.getByLabel('编辑品牌 测试品牌', { exact: true }).click();
  await page.getByPlaceholder('品牌名称').fill('测试品牌改');
  await page.getByLabel('保存品牌', { exact: true }).click();
  await page.getByLabel('编辑型号 测试型号', { exact: true }).click();
  await page.getByPlaceholder('型号名称').fill('测试型号改');
  await page.getByLabel('保存型号', { exact: true }).click();
  await page.screenshot({
    path: 'artifacts-catalog-manager-unified.png',
    fullPage: true,
  });
  await page.waitForTimeout(300);

  const typeId = '测试品牌改/测试型号改';
  const persisted = await readPreferences();
  assert(persisted.customBrands.includes('测试品牌改'));
  assert(persisted.customTypes['测试品牌改'].includes('测试型号改'));
  assert(
    persisted.customTypeColors[typeId].some(
      (color) => color.name === '测试颜色' && color.hex === '#61C680',
    ),
  );
  const tareId = persisted.typeTareDefaults[typeId];
  assert(tareId.startsWith('custom-tare-'));
  assert(persisted.hiddenBrands.includes('SUNLU'));

  await page.getByText('耗材库', { exact: true }).first().click();
  await page.getByText('曜石黑').first().click();
  await page.getByText('品牌 · Bambu Studio').click();
  await page.getByText('加载更多', { exact: true }).click();
  await page.screenshot({ path: 'artifacts-brand-dropdown-debug.png' });
  await page.getByText('测试品牌改', { exact: true }).last().click();
  await page.waitForTimeout(300);
  assert(
    (await page.locator('body').innerText()).includes(
      '类型 · 自定义选项\n测试型号改',
    ),
  );
  await page.getByText(/颜色 ·/).first().click();
  await page.getByText('加载更多', { exact: true }).click();
  await page.getByText('测试颜色', { exact: true }).click();
  await page.getByText('重量', { exact: true }).click();
  assert(
    (await page.getByText('空盘皮重 · 测试皮重').locator('..').innerText()).includes(
      '175 g',
    ),
  );
  await page.getByLabel('关闭').click();

  await page.reload();
  await page.waitForTimeout(700);
  assert.deepEqual(await readPreferences(), persisted);
  await page.getByText('偏好设置', { exact: true }).first().click();
  await page.getByLabel('耗材目录', { exact: true }).click();

  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(appUrl);
  await mobile.waitForTimeout(600);
  await mobile.getByText('偏好设置', { exact: true }).first().click();
  await mobile.getByLabel('耗材目录', { exact: true }).click();
  await mobile.waitForTimeout(350);
  const mobileLayout = await mobile.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  assert.equal(mobileLayout.scrollWidth, mobileLayout.innerWidth);
  await mobile.screenshot({
    path: 'artifacts-catalog-manager-mobile.png',
    fullPage: true,
  });
  await mobile.getByLabel('选择品牌 Bambu Lab', { exact: true }).click();
  await mobile.waitForTimeout(180);
  assert(await mobile.getByLabel('返回品牌列表', { exact: true }).isVisible());
  await mobile.getByLabel('选择型号 PLA Basic', { exact: true }).click();
  await mobile.waitForTimeout(180);
  assert(await mobile.getByText('默认空盘皮重', { exact: true }).isVisible());
  await mobile.screenshot({
    path: 'artifacts-catalog-manager-mobile-detail.png',
    fullPage: true,
  });
  await mobile.close();

  await page.getByLabel('耗材目录', { exact: true }).click();
  await page.getByText('测试品牌改', { exact: true }).click();
  await page.getByLabel('删除品牌 测试品牌改', { exact: true }).click();
  await page.getByLabel('确认目录删除', { exact: true }).click();
  const afterDelete = await readPreferences();
  assert.equal(afterDelete.customBrands.includes('测试品牌改'), false);
  assert.equal('测试品牌改' in afterDelete.customTypes, false);
  assert.equal(typeId in afterDelete.customTypeColors, false);
  assert.equal(typeId in afterDelete.typeTareDefaults, false);

  console.log('UNIFIED_MANAGEMENT: PASS');
  console.log('PAGE_ERRORS:', errors);
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
