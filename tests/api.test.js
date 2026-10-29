import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';

test('health route returns service status', async () => {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.status, 'ok');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('unknown routes return JSON 404', async () => {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/does-not-exist`);
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error.code, 'NOT_FOUND');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
