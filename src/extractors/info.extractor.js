import * as cheerio from 'cheerio';
export function extractInfo(html, url) {
  const $ = cheerio.load(html);
  const title = $('h1').first().text().trim() || $('title').text().trim();
  return { title: title || null, description: $('meta[name="description"]').attr('content') || null, image: $('meta[property="og:image"]').attr('content') || null, url };
}
