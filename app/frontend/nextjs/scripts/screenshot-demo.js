const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/demo_main', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);

  // Slow scroll to bottom to trigger all whileInView animations with time to complete
  await page.evaluate(async () => {
    const totalHeight = document.body.scrollHeight;
    const step = 80;
    for (let i = 0; i <= totalHeight + 800; i += step) {
      window.scrollTo(0, i);
      await new Promise(r => setTimeout(r, 80));
    }
    // Scroll back to top
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 200));
  });

  // Wait for all spring/blur animations to settle
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'test-results/demo_main-v2.png', fullPage: true });
  console.log('Screenshot saved to test-results/demo_main-v2.png');
  await browser.close();
})();
