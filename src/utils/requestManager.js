import axios from 'axios';
import { SOURCES, SOURCE_TIMEOUT_MS, HTTP_RETRIES } from '../configs/source.config.js';

const client = axios.create({
  timeout: SOURCE_TIMEOUT_MS,
  maxRedirects: 0,
  responseType: 'text',
  validateStatus: () => true,
  headers: { 'User-Agent': 'AniScrollAPI/1.1 (source metadata client)', Accept: 'text/html,application/json;q=0.9,*/*;q=0.8' }
});
const transientStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);
const redirectStatuses = new Set([301, 302, 303, 307, 308]);
const sourceFor = url => SOURCES.find(source => {
  const base = new URL(source.baseUrl);
  return url.protocol === 'https:' && url.hostname === base.hostname;
});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function requestOnce(startUrl) {
  let currentUrl = new URL(startUrl);
  for (let redirects = 0; redirects <= 5; redirects++) {
    if (!sourceFor(currentUrl)) {
      throw Object.assign(new Error('URL or redirect is outside the configured HTTPS source hosts.'), { code: 'REDIRECT_HOST_REJECTED', status: 502 });
    }
    const response = await client.get(currentUrl.toString());
    if (redirectStatuses.has(response.status)) {
      if (redirects === 5) throw Object.assign(new Error('Upstream redirect limit exceeded.'), { code: 'REDIRECT_LIMIT', status: 502 });
      const location = response.headers.location;
      if (!location) throw Object.assign(new Error('Upstream redirect omitted a Location header.'), { code: 'INVALID_REDIRECT', status: 502 });
      currentUrl = new URL(location, currentUrl);
      if (!sourceFor(currentUrl)) {
        throw Object.assign(new Error('Upstream redirected outside configured source hosts.'), { code: 'REDIRECT_HOST_REJECTED', status: 502 });
      }
      continue;
    }
    if (response.status >= 400) {
      throw Object.assign(new Error('Upstream returned HTTP ' + response.status), {
        code: 'UPSTREAM_HTTP_ERROR', status: response.status, retryable: transientStatuses.has(response.status)
      });
    }
    const source = sourceFor(currentUrl);
    return { data: response.data, status: response.status, finalUrl: currentUrl.toString(), headers: response.headers, source: source.name };
  }
  throw Object.assign(new Error('Upstream redirect limit exceeded.'), { code: 'REDIRECT_LIMIT', status: 502 });
}

export async function requestText(url) {
  let parsed;
  try { parsed = new URL(url); } catch {
    throw Object.assign(new Error('Invalid source URL.'), { code: 'SOURCE_URL_REJECTED', status: 400 });
  }
  if (!sourceFor(parsed)) {
    throw Object.assign(new Error('URL is not from a configured HTTPS source.'), { code: 'SOURCE_URL_REJECTED', status: 400 });
  }
  let lastError;
  for (let attempt = 0; attempt <= HTTP_RETRIES; attempt++) {
    try {
      return await requestOnce(parsed.toString());
    } catch (error) {
      lastError = error;
      if (['SOURCE_URL_REJECTED', 'REDIRECT_HOST_REJECTED', 'REDIRECT_LIMIT', 'INVALID_REDIRECT'].includes(error.code)) throw error;
      if (attempt >= HTTP_RETRIES || !(error.retryable || transientStatuses.has(error.response?.status) || error.code === 'ECONNABORTED' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT')) throw error;
      await delay(150 * (2 ** attempt));
    }
  }
  throw lastError || new Error('Upstream request failed.');
}

export async function getSourcePage(path = '/') {
  const errors = [];
  for (const source of SOURCES) {
    try {
      const url = new URL(path, source.baseUrl).toString();
      const result = await requestText(url);
      if (typeof result.data !== 'string' || result.data.trim().length === 0) throw new Error('Upstream returned an empty page.');
      return { ...result, source: result.source || source.name, baseUrl: source.baseUrl };
    } catch (error) {
      errors.push({ source: source.name, code: error.code || 'UPSTREAM_ERROR', message: error.message });
    }
  }
  const error = new Error('All configured AnimePahe sources failed.');
  error.status = 502;
  error.code = 'ALL_SOURCES_FAILED';
  error.details = errors;
  throw error;
}

export async function sourceStatus() {
  return Promise.all(SOURCES.map(async source => {
    const started = Date.now();
    try {
      const result = await requestText(source.baseUrl);
      return { name: source.name, baseUrl: source.baseUrl, available: result.status >= 200 && result.status < 400, status: result.status, durationMs: Date.now() - started };
    } catch (error) {
      return { name: source.name, baseUrl: source.baseUrl, available: false, error: error.code || 'SOURCE_UNAVAILABLE', durationMs: Date.now() - started };
    }
  }));
}
