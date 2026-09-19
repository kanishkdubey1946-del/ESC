// Local QA only: uses a throwaway account in the isolated backend database.
const { chromium } = require(process.env.ESC_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.ESC_BROWSER_CHANNEL ? {channel: process.env.ESC_BROWSER_CHANNEL} : {}) });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:5174/');
    await page.getByRole('navigation', {name:'Primary'}).getByRole('button', {name:'Get Started',exact:true}).click();
    await page.getByRole('textbox', {name:'Email address',exact:true}).fill(`qa-${Date.now()}@example.com`);
    await page.getByRole('button', {name:'Continue with this email',exact:true}).click();
    await page.getByRole('textbox', {name:'Full name',exact:true}).fill('QA Student');
    await page.getByRole('textbox', {name:'Password Show password',exact:true}).fill('Local-audit-only-2026!');
    await page.getByRole('textbox', {name:'Confirm password',exact:true}).fill('Local-audit-only-2026!');
    await page.getByRole('button', {name:'Create secure account',exact:true}).click();
    await page.getByRole('textbox', {name:'Message ESC',exact:true}).waitFor();
    assert.equal(await page.locator('.esc-chat-scroll').evaluate(el => el.scrollTop), 0);
    console.log('PASS: registration and unclipped welcome');
    const nav = async name => {
      await page.getByRole('button', {name:'Open navigation',exact:true}).click();
      await page.getByRole('dialog', {name:'Navigation',exact:true}).getByRole('button', {name,exact:true}).click();
    };
    for (const name of ['Overview','Study planner','My progress']) {
      await nav(name);
      await page.getByRole('textbox', {name:'Class / grade',exact:true}).waitFor();
      console.log(`PASS: ${name} first-use setup`);
    }
    await nav('My library');
    await page.getByRole('button', {name:'+ Add sources',exact:true}).click();
    await page.getByRole('button', {name:'Paste text',exact:true}).click();
    await page.getByRole('textbox', {name:'Source title',exact:true}).fill('QA source');
    await page.getByRole('textbox', {name:'Source text',exact:true}).fill('The study group is Cedar. Sessions last 23 minutes. No exam date is provided.');
    await page.getByRole('button', {name:'Add Text Source',exact:true}).click();
    await page.getByRole('dialog', {name:'Add your sources',exact:true}).waitFor({state:'hidden'});
    assert.ok((await page.locator('body').innerText()).includes('QA source'));
    await page.reload();
    await page.getByLabel('Source library').getByText('QA source', {exact:true}).waitFor();
    console.log('PASS: source save and reload');
    await nav('Specialists 12');
    await page.getByText('Concept Clarifier', {exact:true}).first().waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    console.log('PASS: specialists at mobile width');
    await page.screenshot({path:'../docs/audit-specialists-mobile.png',fullPage:true});
    await page.getByRole('textbox', {name:'Search specialists by name, responsibility, or tag',exact:true}).fill('Concept Clarifier');
    await page.getByRole('button', {name:'Quick Launch',exact:true}).click();
    await page.getByRole('textbox', {name:'Message ESC',exact:true}).waitFor();
    assert.ok((await page.getByRole('textbox', {name:'Message ESC',exact:true}).inputValue()).includes('electric potential'));
    console.log('PASS: specialist search and chat handoff');
    await nav('Specialists 12');
    await page.getByRole('button', {name:'Open report studio',exact:true}).click();
    await page.getByRole('button', {name:'Manual',exact:true}).click();
    const panel = page.getByRole('complementary', {name:'Agent selection and reports',exact:true});
    await panel.scrollIntoViewIfNeeded();
    await panel.getByRole('button', {name:'Clear',exact:true}).click();
    await panel.getByRole('button', {name:'Select StudyVault',exact:true}).click();
    assert.equal(await panel.getByRole('button', {name:'Select StudyVault',exact:true}).getAttribute('aria-pressed'), 'true');
    assert.equal(await panel.getByRole('button', {name:'View StudyVault report',exact:true}).isDisabled(), true);
    console.log('PASS: mobile report studio and manual selection');
    await page.screenshot({path:'../docs/audit-studio-mobile.png',fullPage:true});
    await nav('AI companion');
    await page.getByRole('textbox', {name:'Message ESC',exact:true}).fill('Using only my source, name the group and session duration. Is the exam date stated?');
    await page.screenshot({path:'../docs/audit-chat-mobile.png',fullPage:true});
    if (process.env.ESC_TEST_LIVE_AI === '1') {
      await page.getByRole('button', {name:'Send message',exact:true}).click();
      await page.getByRole('button', {name:'Stop response',exact:true}).waitFor({state:'hidden',timeout:90000});
      console.log('CHAT RESULT:', (await page.locator('main').innerText()).slice(-2500));
    }
    assert.deepEqual(errors, []);
    console.log('PASS: no uncaught page errors');
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode=1;});
