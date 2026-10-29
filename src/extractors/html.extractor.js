import * as cheerio from 'cheerio';

export function extractCards(html, baseUrl) {
  const $ = cheerio.load(html);
  const output = [];
  const seen = new Set();
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    const title = ($(element).attr('title') || $(element).text() || '').replace(/\s+/g, ' ').trim();
    if (!href || !title || href.startsWith('#') || href.startsWith('javascript:')) return;
    let url;
    try { url = new URL(href, baseUrl).toString(); } catch { return; }
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol) || seen.has(url)) return;
    seen.add(url);
    const image = $(element).find('img').first();
    output.push({ title, url, image: image.attr('data-src') || image.attr('src') || null });
  });
  return output;
}

export function pageLooksBlocked(html) {
  const text = String(html).toLowerCase();
  return text.includes('just a moment') || text.includes('verify you are human') || text.includes('access denied') || text.includes('captcha');
}
