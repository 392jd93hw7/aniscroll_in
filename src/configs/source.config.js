const defaults = [
  { name: 'animepahe-ch', baseUrl: process.env.ANIMEPAHE_PRIMARY_URL || 'https://animepahe.ch' },
  { name: 'animepahe-ng', baseUrl: process.env.ANIMEPAHE_FALLBACK_URL || 'https://animepahe.ng' }
];
function normalizeSource(source) {
  const url = new URL(source.baseUrl);
  if (url.protocol !== 'https:' || !['animepahe.ch', 'animepahe.ng'].includes(url.hostname)) throw new Error(`Unsupported source host: ${url.hostname}`);
  return { ...source, baseUrl: url.origin };
}
export const SOURCES = defaults.map(normalizeSource);
export const SOURCE_TIMEOUT_MS = Math.max(1000, Number(process.env.HTTP_TIMEOUT_MS || 10000));
export const HTTP_RETRIES = Math.max(0, Math.min(3, Number(process.env.HTTP_RETRIES || 1)));
