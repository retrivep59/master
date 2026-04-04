import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });

// Age verification page
await page.goto('http://localhost:3000');
await page.waitForLoadState('networkidle');
await page.screenshot({ path: '/home/user/master/screenshot-age-gate.png', fullPage: false });
console.log('Age gate screenshot saved.');

// Click verify to enter main app
await page.click('button:has-text("I am 18+")');
await page.waitForTimeout(800);
await page.screenshot({ path: '/home/user/master/screenshot-main.png', fullPage: true });
console.log('Main app screenshot saved.');

await browser.close();
