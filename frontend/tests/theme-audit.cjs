// Local-only visual regression: uses the isolated backend started for QA.
const { chromium } = require(process.env.ESC_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.ESC_BROWSER_CHANNEL ? { channel: process.env.ESC_BROWSER_CHANNEL } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(15_000);
  const requestErrors = [];
  const apiResponses = [];
  const pageErrors = [];
  page.on('requestfailed', request => requestErrors.push(`${request.url()} — ${request.failure()?.errorText}`));
  page.on('response', response => { if (response.url().includes(':8000/')) apiResponses.push(`${response.status()} ${response.url()}`); });
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    const email = `theme-audit-${Date.now()}@example.com`;
    const response = await fetch('http://127.0.0.1:8000/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Theme Audit', email, password: 'Local-theme-audit-2026!' }),
    });
    if (response.status !== 201) throw new Error(`Registration failed (${response.status}): ${await response.text()}`);
    const { token } = await response.json();
    await page.addInitScript(({ token: sessionToken, email: sessionEmail }) => {
      localStorage.setItem('esc-local-session', sessionToken);
      const nativeFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url = String(input);
        if (url.endsWith('/health')) return new Response(JSON.stringify({ status: 'running' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        if (url.endsWith('/api/auth/me')) return new Response(JSON.stringify({ id: 'theme-audit', name: 'Theme Audit', email: sessionEmail }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        return nativeFetch(input, init);
      };
    }, { token, email });
    await page.goto('http://127.0.0.1:5173/dashboard');
    try {
      await page.getByRole('textbox', { name: 'Message ESC', exact: true }).waitFor();
    } catch (error) {
      throw new Error(`Dashboard did not load: ${page.url()}\nlocal token: ${await page.evaluate(() => Boolean(localStorage.getItem('esc-local-session')))}\nAPI responses: ${apiResponses.join('\n')}\npage errors: ${pageErrors.join('\n')}\nrequest errors: ${requestErrors.join('\n')}\n${(await page.locator('body').innerText()).slice(0, 1000)}\n${error}`);
    }
    await page.getByRole('switch', { name: 'Toggle theme', exact: true }).click();
    await page.waitForFunction(() => document.documentElement.classList.contains('light') || !document.documentElement.classList.contains('dark'));
    const data = await page.evaluate(() => {
      const style = (selector) => getComputedStyle(document.querySelector(selector));
      const rgb = value => value.match(/\d+/g)?.map(Number) || [];
      const luminance = color => {
        const [r, g, b] = rgb(color).slice(0, 3).map(channel => {
          const v = channel / 255;
          return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
        });
        return .2126 * r + .7152 * g + .0722 * b;
      };
      const ratio = (foreground, background) => {
        const a = luminance(foreground), b = luminance(background);
        return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      };
      const shell = style('.esc-workspace');
      const title = style('.esc-chat-welcome h1');
      const copy = style('.esc-chat-welcome > p');
      const icon = style('.esc-starter.lilac > svg');
      const surface = shell.backgroundColor;
      return {
        rootClass: document.documentElement.className,
        theme: document.querySelector('.esc-workspace')?.getAttribute('data-theme'),
        surface,
        title: title.color,
        copy: copy.color,
        icon: icon.color,
        titleRatio: ratio(title.color, surface),
        copyRatio: ratio(copy.color, surface),
        iconRatio: ratio(icon.color, surface),
      };
    });
    assert.equal(data.theme, 'light');
    assert.ok(data.titleRatio >= 4.5, `welcome title contrast ${data.titleRatio}`);
    assert.ok(data.copyRatio >= 4.5, `welcome copy contrast ${data.copyRatio}`);
    assert.ok(data.iconRatio >= 3, `starter icon contrast ${data.iconRatio}`);
    await page.screenshot({ path: '../docs/audit-light-chat.png', fullPage: true });

    await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
    await page.getByRole('dialog', { name: 'Navigation', exact: true }).getByRole('button', { name: 'Specialists 12', exact: true }).click();
    const specialist = await page.evaluate(() => ({
      background: getComputedStyle(document.querySelector('.esc-specialist-page')).backgroundColor,
      foreground: getComputedStyle(document.querySelector('.esc-specialist-page')).color,
    }));
    assert.notEqual(specialist.background, 'rgb(16, 17, 20)');
    await page.screenshot({ path: '../docs/audit-light-specialists.png', fullPage: true });
    console.log(JSON.stringify({ ...data, specialist }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
