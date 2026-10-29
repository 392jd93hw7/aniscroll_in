import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { findHlsUrls, findMediaUrls } from '../src/utils/jsParser.js';
import { normalizePlaybackSources } from '../src/models/playModel.js';

async function withServer(fn) {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    await fn('http://127.0.0.1:' + port);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('health route returns service status', async () => {
  await withServer(async base => {
    const response = await fetch(base + '/health');
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.status, 'ok');
  });
});

test('unknown routes return JSON 404', async () => {
  await withServer(async base => {
    const response = await fetch(base + '/does-not-exist');
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error.code, 'NOT_FOUND');
  });
});

test('route catalog exposes at least 21 endpoints', async () => {
  await withServer(async base => {
    const response = await fetch(base + '/_routes');
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.ok(body.routes.length >= 21);
  });
});

test('search validates required query without making upstream requests', async () => {
  await withServer(async base => {
    const response = await fetch(base + '/search');
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'QUERY_REQUIRED');
  });
});

test('stream resolve validates required id', async () => {
  await withServer(async base => {
    const response = await fetch(base + '/stream/resolve');
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'ID_REQUIRED');
  });
});

test('extracts direct HLS and media URLs from visible markup', () => {
  const html = '<script>var src="https://cdn.example.test/video/index.m3u8?token=abc";</script><source src="https://cdn.example.test/video.mp4">';
  assert.deepEqual(findHlsUrls(html), ['https://cdn.example.test/video/index.m3u8?token=abc']);
  assert.deepEqual(findMediaUrls(html), ['https://cdn.example.test/video/index.m3u8?token=abc', 'https://cdn.example.test/video.mp4']);
});

test('normalizes exposed playback and embed URLs', () => {
  const result = normalizePlaybackSources({
    html: '<iframe src="https://player.example.test/embed/123"></iframe><source src="https://cdn.example.test/a.m3u8">',
    pageUrl: 'https://animepahe.ch/play/123',
    source: 'animepahe-ch'
  });
  assert.equal(result.streams[0].format, 'm3u8');
  assert.ok(result.embeds.includes('https://player.example.test/embed/123'));
});
