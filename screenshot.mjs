import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
await page.setViewportSize({ width: 1400, height: 900 });

await page.goto('http://localhost:3000');
await page.waitForLoadState('networkidle');

// Skip age gate
await page.click('button:has-text("I am 18+")');
await page.waitForTimeout(1000);

// Full page screenshot
await page.screenshot({ path: '/home/user/master/screenshot-main.png', fullPage: true });
console.log('Main app screenshot saved.');

// Scroll to template gallery and screenshot it
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);
await page.screenshot({ path: '/home/user/master/screenshot-templates.png', fullPage: false });
console.log('Templates screenshot saved.');

await browser.close();
