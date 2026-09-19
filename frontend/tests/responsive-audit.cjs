// Run against the isolated QA server, not production. Requires Playwright.
const { chromium } = require(process.env.ESC_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.ESC_BROWSER_CHANNEL ? { channel: process.env.ESC_BROWSER_CHANNEL } : {}) });
  const results = [];
  try {
    for (const width of [360, 390, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 800 }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(process.env.ESC_AUDIT_URL || 'http://127.0.0.1:5174/');
      await page.getByRole('heading', { level: 1 }).waitFor();
      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        headingOverflow: [...document.querySelectorAll('h1 span')].some(el => el.getBoundingClientRect().right > innerWidth),
        anchors: [...document.querySelectorAll('a[href^="#"]')].every(a => document.getElementById(a.hash.slice(1))),
      }));
      results.push({ width, ...layout, errors });
      // Reveal intersection-animated sections before capturing the full page.
      await page.locator('#specialists').scrollIntoViewIfNeeded();
      for (const item of await page.locator('.sp-feature-card, .sp-step, .hp-cta-inner').all()) {
        await item.scrollIntoViewIfNeeded();
        await page.waitForFunction(el => getComputedStyle(el).opacity === '1', await item.elementHandle());
      }
      await page.screenshot({ path: `../docs/audit-home-${width}.png`, fullPage: true });
      assert.equal(layout.overflow, false, `Page overflow at ${width}`);
      assert.equal(layout.headingOverflow, false, `Heading overflow at ${width}`);
      assert.equal(layout.anchors, true, 'Broken section anchor');
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); console.log(JSON.stringify(results, null, 2)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
