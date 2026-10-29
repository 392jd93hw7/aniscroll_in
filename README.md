# AniScroll AnimePahe API

Node.js REST API for generic anime listing/search, metadata, episode catalogs, source health, and playback URL discovery.

> This adapter only parses pages and media URLs available through normal, permitted access. It does not bypass DDoS protection, solve CAPTCHAs, evade access controls, or defeat DRM. Source HTML changes may require parser updates.

## Requirements
- Node.js 20+ (Node 24 recommended)
- npm

## Run locally
```sh
cp .env.example .env
npm install
npm run dev
```
Defaults to `http://localhost:3000`. See `/_routes`, `/health`, and `/sources/status`.

## Configuration
See `.env.example`. Primary and fallback URLs default to `https://animepahe.ch` and `https://animepahe.ng`. The adapter restricts source requests to these hosts. Set `CORS_ORIGINS` to `*` for open development access or a comma-separated origin allowlist in production.

## API routes (22+)
- `GET /health`, `GET /sources/status`, `GET /_routes`
- `GET /home`
- `GET /search?q=naruto&page=1`, `GET /search/suggest?q=nar`
- `GET /genres`, `GET /studios`, `GET /tags`, `GET /categories`
- `GET /az/:letter`, `GET /seasonal?year=2026&season=fall`
- `GET /series?page=1`, `GET /series/:id`
- `GET /anime/:id`, `GET /anime/:id/episodes`
- `GET /episode/:id/sources`, `GET /stream/resolve?id=...`, `GET /embed/resolve?url=...`

Search and listing use conservative generic HTML parsing and common route patterns. Since the upstream page contract is not guaranteed, validate results against the live source before production use. Source changes can return errors rather than fabricated data.

## Playback
The resolver detects visible HLS `.m3u8`, MP4, DASH `.mpd`, and iframe/embed URLs in accessible HTML. It does not execute untrusted page scripts, recursively crawl arbitrary hosts, or defeat token challenges. URLs signed by a provider may expire.

## Deploy
- Docker: `docker build -t aniscroll-api . && docker run --env-file .env -p 3000:3000 aniscroll-api`
- Render: `render.yaml`
- Railway: set the start command to `npm start`
- Vercel: `vercel.json` (browser automation is not used inside serverless requests)

## Tests
```sh
npm test
```
