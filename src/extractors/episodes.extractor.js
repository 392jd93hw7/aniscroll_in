import * as cheerio from 'cheerio';
export function extractEpisodes(html, baseUrl) {
  const $ = cheerio.load(html);
  const items = [];
  $('a[href]').each((_, element) => {
    const title = ($(element).attr('title') || $(element).text()).replace(/\s+/g, ' ').trim();
    const href = $(element).attr('href');
    if (!title || !href || href.startsWith('javascript:')) return;
    try { const url = new URL(href, baseUrl); if (url.protocol === 'https:') items.push({ title, url: url.toString() }); } catch { /* ignore malformed URLs */ }
  });
  return items;
}
