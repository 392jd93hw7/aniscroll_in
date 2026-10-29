import { Router } from 'express';
import { cacheGet, cacheSet, cacheTtlSeconds } from '../helper/cache.helper.js';
import { asyncRoute, ApiError } from '../helper/error.helper.js';
import { scrapeHome, searchAnime, discoverEpisodeSources } from '../scrapers/animepahe.js';
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

router.get('/health', (req, res) => res.json({ success: true, service: 'aniscroll-animepahe-api', status: 'ok', sources: SOURCES.length }));
router.get('/sources/status', asyncRoute(async (req, res) => res.json({ success: true, sources: await sourceStatus() })));
router.get('/home', cached('home', cacheTtlSeconds('metadata'), async () => ({ success: true, ...(await scrapeHome()) })));
router.get('/search', cached(req => `search:${String(req.query.q || '').trim().toLowerCase()}:${pageNumber(req)}`, cacheTtlSeconds('search'), async req => ({ success: true, ...(await searchAnime(String(req.query.q || ''), pageNumber(req))) })));
router.get('/search/suggest', asyncRoute(async (req, res) => {
  if (!String(req.query.q || '').trim()) throw new ApiError(400, 'QUERY_REQUIRED', 'Query parameter q is required.');
  res.json({ success: true, query: String(req.query.q).trim(), suggestions: [], note: 'Suggestions will be populated after source selectors are verified.' });
}));
router.get('/genres', (req, res) => res.json({ success: true, items: [], note: 'Source parser pending live selector verification.' }));
router.get('/studios', (req, res) => res.json({ success: true, items: [], note: 'Source parser pending live selector verification.' }));
router.get('/tags', (req, res) => res.json({ success: true, items: [], note: 'Source parser pending live selector verification.' }));
router.get('/categories', (req, res) => res.json({ success: true, items: [], note: 'Source parser pending live selector verification.' }));
router.get('/az/:letter', (req, res) => res.json({ success: true, letter: req.params.letter, page: pageNumber(req), items: [], note: 'Source parser pending live selector verification.' }));
router.get('/seasonal', (req, res) => res.json({ success: true, year: req.query.year || null, season: req.query.season || null, items: [], note: 'Source parser pending live selector verification.' }));
router.get('/series', (req, res) => res.json({ success: true, page: pageNumber(req), items: [], note: 'Source parser pending live selector verification.' }));
router.get('/series/:id', (req, res) => res.json({ success: true, id: req.params.id, items: [], note: 'Source parser pending live selector verification.' }));
router.get('/anime/:id', (req, res) => res.status(501).json({ success: false, error: { code: 'UPSTREAM_UNSUPPORTED', message: 'Anime detail extraction requires verified upstream selectors.' }, id: req.params.id }));
router.get('/anime/:id/episodes', (req, res) => res.status(501).json({ success: false, error: { code: 'UPSTREAM_UNSUPPORTED', message: 'Episode extraction requires verified upstream selectors.' }, id: req.params.id }));
router.get('/episode/:id/sources', asyncRoute(async (req, res) => res.json({ success: true, id: req.params.id, ...(await discoverEpisodeSources(req.params.id)) })));
router.get('/stream/resolve', asyncRoute(async (req, res) => {
  if (!String(req.query.id || '').trim()) throw new ApiError(400, 'ID_REQUIRED', 'Query parameter id is required.');
  const result = await discoverEpisodeSources(String(req.query.id));
  res.json({ success: true, ...result });
}));
router.get('/_routes', (req, res) => res.json({ success: true, routes: [
  'GET /health','GET /sources/status','GET /home','GET /search?q=','GET /search/suggest?q=',
  'GET /genres','GET /studios','GET /tags','GET /categories','GET /az/:letter','GET /seasonal',
  'GET /series','GET /series/:id','GET /anime/:id','GET /anime/:id/episodes',
  'GET /episode/:id/sources','GET /stream/resolve?id='
] }));
export default router;
