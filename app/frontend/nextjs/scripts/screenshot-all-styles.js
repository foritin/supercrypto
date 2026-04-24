const { chromium } = require('playwright');

async function screenshotStyle(style, filename) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Inject localStorage before page load
  await page.goto('http://localhost:3000/demo_main', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate((s) => {
    localStorage.setItem('demo_main_hero_style', s);
  }, style);

  // Reload to pick up style
  await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);

  // Scroll to trigger animations
  await page.evaluate(async () => {
    const total = document.body.scrollHeight;
    for (let i = 0; i <= total + 600; i += 100) {
      window.scrollTo(0, i);
      await new Promise(r => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 200));
  });

  await page.waitForTimeout(3000);
  await page.screenshot({ path: `test-results/${filename}`, fullPage: true });
  console.log(`Screenshot saved: ${filename}`);
  await browser.close();
}

(async () => {
  await screenshotStyle('metal', 'demo_main-metal.png');
  await screenshotStyle('liquid', 'demo_main-liquid.png');
  await screenshotStyle('neon', 'demo_main-neon.png');
  console.log('All screenshots done');
})();
