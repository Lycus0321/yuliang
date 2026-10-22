import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

await page.goto('http://localhost:8081');
await page.getByText('先看看演示耗材库').click();
await page.waitForTimeout(600);
await page.getByText('曜石黑').first().click();
await page.getByText('编辑', { exact: true }).click();
await page.waitForTimeout(300);

await page.getByPlaceholder('例如 SUNLU', { exact: true }).fill('TEST BRAND');
await page.getByPlaceholder('例如 PLA+', { exact: true }).fill('TEST TYPE');
await page.getByPlaceholder('#RRGGBB').fill('#00FF00');
await page.locator('textarea').fill('CODEX 写入测试');
await page.screenshot({ path: 'artifacts-edit-mobile.png', fullPage: true });

await page.getByText('保存并验证').click();
await page.waitForTimeout(500);
const text = await page.locator('body').innerText();
console.log('HAS_BRAND:', text.includes('TEST BRAND'));
console.log('HAS_TYPE:', text.includes('TEST TYPE'));
await page.getByText(/TEST BRAND TEST TYPE/).first().click();
await page.getByText('编辑', { exact: true }).click();
await page.waitForTimeout(250);
console.log('NAME:', await page.getByPlaceholder('例如 SUNLU PLA+ 哑光白').inputValue());
console.log('NOTE:', await page.locator('textarea').inputValue());

await browser.close();
