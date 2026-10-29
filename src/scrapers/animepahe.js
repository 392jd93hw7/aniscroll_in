import * as cheerio from 'cheerio';
import { getSourcePage } from '../utils/requestManager.js';
import { extractCards, pageLooksBlocked } from '../extractors/html.extractor.js';
import { extractInfo } from '../extractors/info.extractor.js';
import { normalizePlaybackSources } from '../models/playModel.js';

function fail(status, code, message, details) {
  return Object.assign(new Error(message), { status, code, details });
}
function assertAccessible(page) {
  if (pageLooksBlocked(page.data)) throw fail(503, 'SOURCE_ACCESS_RESTRICTED', 'The source returned an access or verification page. This API does not bypass access controls.');
}
function linksMatching(html, baseUrl, predicate) {
  const $ = cheerio.load(html);
  const results = [];
  const seen = new Set();
  $('a[href]').each((_, el) => {
    const raw = $(el).attr('href');
    if (!raw) return;
    let url;
    try { url = new URL(raw, baseUrl); } catch { return; }
    if (url.protocol !== 'https:' || url.hostname !== new URL(baseUrl).hostname || !predicate(url)) return;
    const title = ($(el).attr('title') || $(el).text() || '').replace(/\\s+/g, ' ').trim();
    if (!title || seen.has(url.toString())) return;
    seen.add(url.toString());
    const img = $(el).find('img').first();
    results.push({ title, url: url.toString(), image: img.attr('data-src') || img.attr('src') || null });
  });
  return results;
}
function pageParam(page) {
  const n = Number.parseInt(page, 10);
  return Number.isFinite(n) ? Math.max(1, Math.min(1000, n)) : 1;
}
function parseSearchApi(data, baseUrl) {
  let parsed;
  try { parsed = JSON.parse(data); } catch { return null; }
  const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.data) ? parsed.data : Array.isArray(parsed?.results) ? parsed.results : null;
  if (!rows) return null;
  const seen = new Set();
  return rows.map(row => {
    const title = String(row?.title || row?.name || row?.english || row?.japanese || '').replace(/\\s+/g, ' ').trim();
    const session = String(row?.session || row?.slug || row?.id || '').trim();
    if (!title || !session) return null;
    const url = /^https:\/\//i.test(session) ? session : new URL('/anime/' + encodeURIComponent(session), baseUrl).toString();
    if (new URL(url).hostname !== new URL(baseUrl).hostname || seen.has(url)) return null;
    seen.add(url);
    let image = row?.poster || row?.image || row?.thumbnail || null;
    if (image) {
      try { image = new URL(image, baseUrl).toString(); } catch { image = null; }
    }
    return { title, url, image, id: row?.id ?? session, session: row?.session ?? session, type: row?.type ?? null };
  }).filter(Boolean);
}

export async function scrapeHome() {
  const page = await getSourcePage('/');
  assertAccessible(page);
  return { source: page.source, url: page.finalUrl, items: extractCards(page.data, page.baseUrl) };
}
export async function searchAnime(query, page = 1, filters = {}) {
  const q = String(query || '').trim();
  if (!q) throw fail(400, 'QUERY_REQUIRED', 'Query parameter q is required.');
  const pageNo = pageParam(page);
  const safeFilters = Object.fromEntries(['genre', 'year', 'season', 'type'].map(key => [key, filters[key] ? String(filters[key]) : null]).filter(([, value]) => value));
  const params = new URLSearchParams({ m: 'search', l: '8', q });
  if (pageNo > 1) params.set('page', String(pageNo));

  // AnimePahe-compatible deployments commonly expose search as JSON at /api.
  // Parse only a documented-looking data/results array; otherwise try ordinary HTML search pages.
  try {
    const apiResult = await getSourcePage('/api?' + params.toString());
    assertAccessible(apiResult);
    const apiItems = parseSearchApi(apiResult.data, apiResult.baseUrl);
    if (apiItems) {
      const items = apiItems.filter(item => {
        if (!item.url.startsWith('https://')) return false;
        return Object.entries(safeFilters).every(([key, value]) => !value || String(item[key] || '').toLowerCase().includes(value.toLowerCase()));
      });
      return { source: apiResult.source, query: q, page: pageNo, filters: safeFilters, url: apiResult.finalUrl, items, total: Number.isFinite(Number(JSON.parse(apiResult.data)?.total)) ? Number(JSON.parse(apiResult.data).total) : null };
    }
  } catch (error) {
    if (error.code === 'SOURCE_ACCESS_RESTRICTED') throw error;
    // Continue to the HTML parser for installations that do not provide the JSON endpoint.
  }

  const htmlPaths = [
    '/search?' + new URLSearchParams({ q, ...(pageNo > 1 ? { page: String(pageNo) } : {}), ...safeFilters }).toString(),
    '/?' + new URLSearchParams({ q, ...(pageNo > 1 ? { page: String(pageNo) } : {}), ...safeFilters }).toString()
  ];
  let lastError;
  for (const path of htmlPaths) {
    try {
      const result = await getSourcePage(path);
      assertAccessible(result);
      const items = extractCards(result.data, result.baseUrl).filter(item => {
        const parsed = new URL(item.url);
        return parsed.hostname === new URL(result.baseUrl).hostname && parsed.pathname !== '/' && !/\\/(?:search|login|register|genre|tag|category)(?:\/|$)/i.test(parsed.pathname);
      });
      if (items.length) return { source: result.source, query: q, page: pageNo, filters: safeFilters, url: result.finalUrl, items };
      lastError = fail(502, 'SEARCH_RESULTS_NOT_FOUND', 'The upstream page loaded, but no anime search results matched the known HTML patterns.');
    } catch (error) {
      if (error.code === 'SOURCE_ACCESS_RESTRICTED') throw error;
      lastError = error;
    }
  }
  throw lastError || fail(502, 'SEARCH_UNAVAILABLE', 'Could not retrieve search results from the configured sources.');
}
export async function suggestAnime(query) {
  const q = String(query || '').trim();
  if (!q) throw fail(400, 'QUERY_REQUIRED', 'Query parameter q is required.');
  const result = await searchAnime(q, 1);
  return { query: q, suggestions: result.items.slice(0, 10).map(({ title, url, image }) => ({ title, url, image })) };
}
export async function scrapeListing(kind, { page = 1, year, season, letter } = {}) {
  const pageNo = pageParam(page);
  const params = new URLSearchParams();
  if (kind === 'seasonal') {
    if (year) params.set('year', String(year));
    if (season) params.set('season', String(season));
  }
  if (pageNo > 1) params.set('page', String(pageNo));
  const paths = {
    genres: '/genre', studios: '/studio', tags: '/tag', categories: '/category',
    az: '/anime/' + encodeURIComponent(String(letter || 'a').slice(0, 1)),
    seasonal: '/seasonal', series: '/anime', recent: '/recent', latest: '/latest', popular: '/popular'
  };
  const path = (paths[kind] || '/') + (params.size ? '?' + params.toString() : '');
  const result = await getSourcePage(path);
  assertAccessible(result);
  return { source: result.source, url: result.finalUrl, kind, page: pageNo, items: extractCards(result.data, result.baseUrl), year: year || null, season: season || null, letter: letter || null };
}
export async function scrapeSeries(id) {
  return scrapeAnimeInfo(id);
}
export async function scrapeAnimeInfo(id) {
  const safeId = String(id || '').trim();
  if (!safeId || safeId.length > 180 || /[\\r\\n]/.test(safeId)) throw fail(400, 'INVALID_ID', 'A valid anime id is required.');
  const paths = ['/anime/' + encodeURIComponent(safeId), '/' + encodeURIComponent(safeId)];
  let lastError;
  for (const path of paths) {
    try {
      const page = await getSourcePage(path);
      assertAccessible(page);
      const info = extractInfo(page.data, page.finalUrl);
      const $ = cheerio.load(page.data);
      const description = info.description || $('.anime-synopsis, .synopsis, [itemprop="description"]').first().text().trim() || null;
      const details = {};
      $('dt, .anime-info-label, .info-label').each((_, el) => {
        const key = $(el).text().replace(/:$/, '').trim().toLowerCase();
        const value = $(el).next('dd, .anime-info-value, .info-value').text().replace(/\\s+/g, ' ').trim();
        if (key && value) details[key] = value;
      });
      const episodes = linksMatching(page.data, page.baseUrl, url => /\\/(?:play|episode)\\//i.test(url.pathname));
      return { source: page.source, id: safeId, ...info, description, details, episodes, url: page.finalUrl };
    } catch (error) {
      lastError = error;
      if (error.status && error.status !== 404) throw error;
    }
  }
  throw lastError || fail(404, 'ANIME_NOT_FOUND', 'Anime page was not found.');
}
export async function scrapeEpisodes(id) {
  const info = await scrapeAnimeInfo(id);
  return { source: info.source, animeId: String(id), episodes: info.episodes || [] };
}
export async function discoverEpisodeSources(id) {
  const safeId = String(id || '').trim();
  if (!safeId || safeId.length > 180 || /[\\r\\n]/.test(safeId)) throw fail(400, 'INVALID_ID', 'A valid episode id is required.');
  const paths = safeId.startsWith('https://') ? [safeId] : ['/play/' + encodeURIComponent(safeId), '/episode/' + encodeURIComponent(safeId)];
  let lastError;
  for (const path of paths) {
    try {
      const page = await getSourcePage(path);
      assertAccessible(page);
      const playback = normalizePlaybackSources({ html: page.data, pageUrl: page.finalUrl, source: page.source });
      const embeds = linksMatching(page.data, page.baseUrl, url => /\\/(?:embed|player|play)\\//i.test(url.pathname));
      return { id: safeId, source: page.source, pageUrl: page.finalUrl, ...playback, embeds: [...new Set([...playback.embeds, ...embeds.map(x => x.url)])] };
    } catch (error) {
      lastError = error;
      if (error.status && ![404, 400].includes(error.status)) throw error;
    }
  }
  throw lastError || fail(404, 'EPISODE_NOT_FOUND', 'Episode page was not found.');
}
