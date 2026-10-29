import { chromium } from 'playwright';

// Browser rendering for pages you are permitted to access. This intentionally
// does not configure stealth plugins, CAPTCHA solving, or anti-bot circumvention.
export async function renderAccessiblePage(url, { timeout = 10000 } = {}) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !['animepahe.ch', 'animepahe.ng'].includes(parsed.hostname)) {
    throw Object.assign(new Error('Browser URL is not an allowed source host.'), { status: 400, code: 'SOURCE_URL_REJECTED' });
  }
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
    return { url: page.url(), html: await page.content(), title: await page.title() };
  } finally {
    await browser.close();
  }
}
