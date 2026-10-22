import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

await page.goto('http://localhost:8081');
await page.getByPlaceholder('邮箱或手机号').fill('codex-test@example.com');
await page.getByPlaceholder('输入 Bambu 密码').fill('not-a-real-password');
await page.getByText('登录并读取').click();
await page.waitForTimeout(2500);

const text = await page.locator('body').innerText();
console.log('HAS_NETWORK_ERROR:', text.includes('无法连接拓竹云'));
console.log('HAS_CREDENTIAL_ERROR:', text.includes('账号、密码、验证码或地区不正确'));
console.log(text.slice(-320));

await browser.close();
