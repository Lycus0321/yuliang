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

  await page.getByText('偏好设置', { exact: true }).first().click();
  await page.getByText('耗材与皮重', { exact: true }).click();
  await page.getByText('管理预设', { exact: true }).first().click();
  await page.getByLabel('新增空盘皮重', { exact: true }).click();
  await page.getByPlaceholder('名称').fill('SUNLU PLA+ 专用');
  await page.getByPlaceholder('克重').fill('205');
  await page.getByLabel('选择适用品牌', { exact: true }).click();
  await page.getByLabel('SUNLU', { exact: true }).click();
  await page.getByLabel('选择适用型号', { exact: true }).click();
  await page.getByLabel('PLA+', { exact: true }).click();
  await page.getByText('添加', { exact: true }).click();
  await page.getByLabel('关闭').click();

  await page.getByText('耗材库', { exact: true }).first().click();
  await page.getByText('曜石黑').first().click();
  await page.getByText('品牌 · Bambu Studio').click();
  await page.getByText('SUNLU', { exact: true }).last().click();
  await page.getByText('类型 · Bambu Studio').click();
  await page.getByText('PLA+', { exact: true }).last().click();
  await page.getByText('重量', { exact: true }).click();
  const draftTare = await page
    .getByText('空盘皮重 · SUNLU PLA+ 专用')
    .locator('..')
    .innerText();
  assert(draftTare.includes('205 g'));
  await page.getByLabel('关闭').click();

  await page.getByText('哑光白').first().click();
  await page.getByText('重量', { exact: true }).click();
  const sunluTare = await page
    .getByText('空盘皮重 · SUNLU PLA+ 专用')
    .locator('..')
    .innerText();
  assert(sunluTare.includes('205 g'));
  await page.getByLabel('关闭').click();

  await page.getByText('透明橙').first().click();
  await page.getByText('重量', { exact: true }).click();
  const polymakerTare = await page
    .getByText('空盘皮重 · 通用空盘')
    .locator('..')
    .innerText();
  assert(polymakerTare.includes('200 g'));

  console.log('TARE_MAPPING: PASS');
  console.log('PAGE_ERRORS:', errors);
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
