const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const STYLES = ["metal", "matrix", "nexus", "vortex", "neon"];
const BASE_URL = "http://localhost:3000/demo_main";
const OUT_DIR = path.join(__dirname, "..", "..", "..", "..", "test-results");

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  for (const style of STYLES) {
    console.log(`[screenshot] Style: ${style}`);
    try {
      await page.goto(`${BASE_URL}?style=${style}`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      // Wait for canvas/animation to settle
      await new Promise((r) => setTimeout(r, 3500));
      const outPath = path.join(OUT_DIR, `demo_main-${style}.png`);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`  → ${outPath}`);
    } catch (err) {
      console.error(`  ✗ ${style}: ${err.message}`);
    }
  }

  await browser.close();
  console.log("\nAll screenshots done.");
})();
