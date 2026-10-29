# AniScroll AnimePahe API

Node.js REST API for generic anime listing/search, metadata, episode catalogs, source health, and playback URL discovery.

> This adapter only parses pages and media URLs available through normal, permitted access. It does not bypass DDoS protection, solve CAPTCHAs, evade access controls, or defeat DRM. Source HTML changes may require parser updates.

## Requirements
- Node.js 20.18.1+ (Node 24 recommended)
- npm

## Run locally
```sh
cp .env.example .env
npm install
npm run dev
```
Defaults to `http://localhost:3000`. See `/_routes`, `/health`, and `/sources/status`.

## Configuration
See `.env.example`. Primary and fallback URLs default to `https://animepahe.ch` and `https://animepahe.ng`. The adapter restricts source requests and redirects to these HTTPS hosts. Set `CORS_ORIGINS` to `*` for open development access or a comma-separated origin allowlist in production.

## API routes
- Service: `GET /`, `GET /health`, `GET /ping`, `GET /version`, `GET /sources/status`, `GET /_routes`
- Home/listings: `GET /home`, `GET /recent`, `GET /latest`, `GET /popular`, `GET /browse?kind=series`
- Search: `GET /search?q=naruto&page=1`, `GET /search/suggest?q=nar`, `GET /search/advanced?q=naruto&year=2026`
- Browse filters: `GET /genres`, `GET /studios`, `GET /tags`, `GET /categories`, `GET /az/:letter`, `GET /seasonal?year=2026&season=fall`
- Anime data: `GET /series?page=1`, `GET /series/:id`, `GET /anime/:id`, `GET /metadata/:id`, `GET /anime/:id/episodes`
- Playback: `GET /episode/:id/sources`, `GET /episodes/:id/sources`, `GET /watch/:id`, `GET /stream/resolve?id=...`, `GET /embed/resolve?url=...`

Search and listing use conservative generic HTML parsing and common route patterns. The upstream route names and selectors have not been confirmed against live pages, so validate results before production use. Source changes may cause errors rather than fabricated metadata.

## Playback
The resolver detects visible HLS `.m3u8`, MP4, DASH `.mpd`, and iframe/embed URLs in accessible HTML. It does not execute untrusted page scripts, recursively crawl arbitrary hosts, defeat token challenges, or access DRM-protected streams. Signed URLs may expire.

## Deploy
- Docker: `docker build -t aniscroll-api . && docker run --env-file .env -p 3000:3000 aniscroll-api`
- Render: `render.yaml`
- Railway: set the start command to `npm start`
- Vercel: `vercel.json` (browser automation is not used inside serverless requests)

## Tests
```sh
npm test
```
