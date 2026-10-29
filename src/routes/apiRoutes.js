import { Router } from 'express';
import { cacheGet, cacheSet, cacheTtlSeconds } from '../helper/cache.helper.js';
import { asyncRoute, ApiError } from '../helper/error.helper.js';
import {
  scrapeHome, searchAnime, suggestAnime, scrapeListing, scrapeSeries,
  scrapeAnimeInfo, scrapeEpisodes, discoverEpisodeSources
} from '../scrapers/animepahe.js';
import { sourceStatus } from '../utils/requestManager.js';
import { SOURCES } from '../configs/source.config.js';

const router = Router();
const cached = (key, ttl, work) => asyncRoute(async (req, res) => {
  const cacheKey = typeof key === 'function' ? key(req) : key;
  const hit = cacheGet(cacheKey);
  if (hit !== undefined) return res.json({ ...hit, cached: true });
  const value = await work(req);
  cacheSet(cacheKey, value, ttl * 1000);
  res.json({ ...value, cached: false });
});
const pageNumber = req => Math.max(1, Math.min(1000, Number.parseInt(req.query.page || '1', 10) || 1));
const q = req => String(req.query.q || '').trim();
const listing = kind => cached(req => 'listing:' + kind + ':' + JSON.stringify(req.query), cacheTtlSeconds('default'), async req => ({ success: true, ...(await scrapeListing(kind, { page: pageNumber(req), year: req.query.year, season: req.query.season, letter: req.params.letter })) }));
const homepageAlias = label => cached(label, cacheTtlSeconds('metadata'), async () => ({ success: true, view: label, ...(await scrapeHome()) }));

router.get('/', (req, res) => res.json({ name: 'AniScroll AnimePahe API', status: 'running', docs: '/_routes', health: '/health' }));
router.get('/health', (req, res) => res.json({ success: true, service: 'aniscroll-animepahe-api', status: 'ok', sources: SOURCES.length }));
router.get('/ping', (req, res) => res.json({ success: true, pong: true, timestamp: new Date().toISOString() }));
router.get('/version', (req, res) => res.json({ success: true, name: 'aniscroll-animepahe-api', version: '1.1.0' }));
router.get('/sources/status', asyncRoute(async (req, res) => res.json({ success: true, sources: await sourceStatus() })));
router.get('/home', cached('home', cacheTtlSeconds('metadata'), async () => ({ success: true, ...(await scrapeHome()) })));
router.get('/recent', homepageAlias('recent'));
router.get('/latest', homepageAlias('latest'));
router.get('/popular', homepageAlias('popular'));
router.get('/search', cached(req => 'search:' + q(req).toLowerCase() + ':' + pageNumber(req), cacheTtlSeconds('search'), async req => ({ success: true, ...(await searchAnime(q(req), pageNumber(req))) })));
router.get('/search/advanced', cached(req => 'advanced:' + JSON.stringify(req.query), cacheTtlSeconds('search'), async req => {
  const query = q(req);
  if (!query) throw new ApiError(400, 'QUERY_REQUIRED', 'Query parameter q is required.');
  return { success: true, ...(await searchAnime(query, pageNumber(req))), filters: { genre: req.query.genre || null, year: req.query.year || null, season: req.query.season || null, type: req.query.type || null } };
}));
router.get('/search/suggest', cached(req => 'suggest:' + q(req).toLowerCase(), cacheTtlSeconds('search'), async req => ({ success: true, ...(await suggestAnime(q(req))) })));
router.get('/genres', listing('genres'));
router.get('/studios', listing('studios'));
router.get('/tags', listing('tags'));
router.get('/categories', listing('categories'));
router.get('/az/:letter', listing('az'));
router.get('/seasonal', listing('seasonal'));
router.get('/browse', cached(req => 'browse:' + JSON.stringify(req.query), cacheTtlSeconds('default'), async req => {
  const kind = String(req.query.kind || 'series');
  if (!['genres', 'studios', 'tags', 'categories', 'az', 'seasonal', 'series'].includes(kind)) throw new ApiError(400, 'INVALID_BROWSE_KIND', 'Unsupported browse kind.');
  return { success: true, ...(await scrapeListing(kind, { page: pageNumber(req), year: req.query.year, season: req.query.season, letter: req.query.letter })) };
}));
router.get('/series', listing('series'));
router.get('/series/:id', cached(req => 'series:' + req.params.id, cacheTtlSeconds('metadata'), async req => ({ success: true, ...(await scrapeSeries(req.params.id)) })));
router.get('/anime/:id', cached(req => 'anime:' + req.params.id, cacheTtlSeconds('metadata'), async req => ({ success: true, ...(await scrapeAnimeInfo(req.params.id)) })));
router.get('/metadata/:id', cached(req => 'metadata:' + req.params.id, cacheTtlSeconds('metadata'), async req => ({ success: true, ...(await scrapeAnimeInfo(req.params.id)) })));
router.get('/anime/:id/episodes', cached(req => 'episodes:' + req.params.id, cacheTtlSeconds('metadata'), async req => ({ success: true, ...(await scrapeEpisodes(req.params.id)) })));
router.get('/episode/:id/sources', cached(req => 'playback:' + req.params.id, cacheTtlSeconds('search'), async req => ({ success: true, ...(await discoverEpisodeSources(req.params.id)) })));
router.get('/episodes/:id/sources', cached(req => 'playback:' + req.params.id, cacheTtlSeconds('search'), async req => ({ success: true, ...(await discoverEpisodeSources(req.params.id)) })));
router.get('/watch/:id', cached(req => 'watch:' + req.params.id, cacheTtlSeconds('search'), async req => ({ success: true, ...(await discoverEpisodeSources(req.params.id)) })));
router.get('/stream/resolve', cached(req => 'resolve:' + String(req.query.id || ''), cacheTtlSeconds('search'), async req => {
  if (!String(req.query.id || '').trim()) throw new ApiError(400, 'ID_REQUIRED', 'Query parameter id is required.');
  return { success: true, ...(await discoverEpisodeSources(String(req.query.id))) };
}));
router.get('/embed/resolve', cached(req => 'embed:' + String(req.query.url || ''), cacheTtlSeconds('search'), async req => {
  if (!String(req.query.url || '').trim()) throw new ApiError(400, 'URL_REQUIRED', 'Query parameter url is required.');
  return { success: true, ...(await discoverEpisodeSources(String(req.query.url))) };
}));
router.get('/_routes', (req, res) => res.json({ success: true, routes: [
  'GET /','GET /health','GET /ping','GET /version','GET /sources/status','GET /home','GET /recent','GET /latest','GET /popular',
  'GET /search?q=&page=','GET /search/advanced?q=&genre=&year=&season=&type=','GET /search/suggest?q=',
  'GET /genres','GET /studios','GET /tags','GET /categories','GET /az/:letter','GET /seasonal?year=&season=','GET /browse?kind=',
  'GET /series?page=','GET /series/:id','GET /anime/:id','GET /metadata/:id','GET /anime/:id/episodes',
  'GET /episode/:id/sources','GET /episodes/:id/sources','GET /watch/:id','GET /stream/resolve?id=','GET /embed/resolve?url='
] }));
export default router;
