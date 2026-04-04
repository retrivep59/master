import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

// Mobile viewport (iPhone 14 Pro)
const page = await browser.newPage();
await page.setViewportSize({ width: 390, height: 844 });
await page.goto('http://localhost:3000');
await page.waitForLoadState('networkidle');

// Age gate
await page.screenshot({ path: '/home/user/master/screenshot-mobile-agegate.png' });
await page.click('button:has-text("I am 18+")');
await page.waitForTimeout(800);

// Main page
await page.screenshot({ path: '/home/user/master/screenshot-mobile-main.png', fullPage: true });

// Scroll to templates
await page.evaluate(() => window.scrollTo(0, 300));
await page.waitForTimeout(300);
await page.screenshot({ path: '/home/user/master/screenshot-mobile-templates.png' });

// Scene Weaver
await page.goto('http://localhost:3000/scene-weaver');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(800);
await page.screenshot({ path: '/home/user/master/screenshot-mobile-sceneweaver.png', fullPage: true });

await browser.close();
console.log('Mobile screenshots saved.');
