# AniScroll AnimePahe API

Node.js REST API scaffold for anime metadata, search, episode catalogs, source health, and playback-source discovery.

> Streaming discovery is limited to URLs exposed through accessible pages or permitted interfaces. This project does not bypass DDoS protections, defeat CAPTCHAs, or evade access controls.

## Requirements

- Node.js 24 LTS recommended (Node.js >=20 supported)
- npm

## Run locally

```sh
cp .env.example .env
npm install
npm run dev
```

The service defaults to `http://localhost:3000`. Open `/` for the API overview, `/health` for health status, and `/sources/status` for configured source reachability.

## Configuration

See `.env.example`. The source order defaults to `https://animepahe.ch` then `https://animepahe.ng`. Only these allowlisted hosts are accepted by the source adapter. Set `CORS_ORIGINS=*` for permissive CORS, or provide a comma-separated allowlist for production.

## API surface

- `GET /health`
- `GET /sources/status`
- `GET /search?q=naruto&page=1`
- `GET /search/suggest?q=nar`
- `GET /genres`, `/studios`, `/tags`, `/categories`
- `GET /az/:letter`, `/seasonal?year=2026&season=fall`
- `GET /series?page=1`, `/series/:id`
- `GET /anime/:id`, `/anime/:id/episodes`
- `GET /episode/:id/sources`
- `GET /stream/resolve?id=:id`

Because the upstream site's live HTML/API contract has not been verified, scraper results may report `UPSTREAM_UNSUPPORTED` instead of fabricating metadata. The source adapter is isolated so verified selectors or a documented API can be added safely.

## Deployment

- Docker: `docker build -t aniscroll-api . && docker run --env-file .env -p 3000:3000 aniscroll-api`
- Render: use `render.yaml`
- Railway: deploy from this repository and use `npm start`
- Vercel: `vercel.json` maps API routes to the Express function; browser automation is intentionally not bundled into serverless requests.

## Tests

```sh
npm test
```
