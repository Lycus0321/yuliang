import { chromium } from 'playwright';

const width = Number(process.env.VIEWPORT_WIDTH || 390);
const height = Number(process.env.VIEWPORT_HEIGHT || 844);
const suffix = process.env.SCREENSHOT_SUFFIX || 'mobile';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: 1,
});

await page.goto('http://localhost:8081');
await page.getByText('先看看演示耗材库').click();
await page.waitForTimeout(700);
const viewportState = await page.evaluate(() => ({
  innerWidth: window.innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
}));
console.log('VIEWPORT:', { width, height, ...viewportState });
await page.getByText('曜石黑').first().click();
await page.waitForTimeout(400);
const geometry = await page.getByText('整盘总重').evaluate((element) => {
  const field = element.parentElement;
  const group = field?.parentElement;
  const content = group?.parentElement;
  const rect = (node) => {
    if (!node) return null;
    const box = node.getBoundingClientRect();
    return { x: box.x, width: box.width, paddingLeft: getComputedStyle(node).paddingLeft };
  };
  return { field: rect(field), group: rect(group), content: rect(content) };
});
console.log('GEOMETRY:', geometry);
const chain = await page.getByText('称重校准').evaluate((element) => {
  const rows = [];
  let node = element;
  for (let index = 0; index < 7 && node; index += 1) {
    const box = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    rows.push({
      tag: node.tagName,
      x: Math.round(box.x),
      y: Math.round(box.y),
      width: Math.round(box.width),
      position: style.position,
      left: style.left,
      paddingLeft: style.paddingLeft,
      overflow: style.overflow,
    });
    node = node.parentElement;
  }
  return rows;
});
console.log('CHAIN:', chain);
await page.screenshot({ path: `artifacts-weigh-${suffix}.png`, fullPage: true });

await page.locator('input[placeholder="826"]').fill('700');
await page.waitForTimeout(200);
console.log('SHEET:', (await page.locator('body').innerText()).slice(-500));

await page.getByText('保存到耗材库').click();
await page.waitForTimeout(700);
await page.screenshot({ path: `artifacts-saved-${suffix}.png`, fullPage: true });

const text = await page.locator('body').innerText();
console.log('SAVED_HAS_500:', text.includes('500'));
console.log(text.slice(0, 420));

await browser.close();
