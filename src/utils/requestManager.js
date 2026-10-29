import axios from 'axios';
import { SOURCES, SOURCE_TIMEOUT_MS, HTTP_RETRIES } from '../configs/source.config.js';

const client = axios.create({
  timeout: SOURCE_TIMEOUT_MS,
  maxRedirects: 5,
  responseType: 'text',
  validateStatus: () => true,
  headers: { 'User-Agent': 'AniScrollAPI/1.0 (source metadata client)', Accept: 'text/html,application/json;q=0.9,*/*;q=0.8' }
});
const transientStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);

export async function requestText(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !SOURCES.some(s => parsed.hostname === new URL(s.baseUrl).hostname)) {
    throw Object.assign(new Error('URL is not from a configured source.'), { code: 'SOURCE_URL_REJECTED', status: 400 });
  }
  let lastError;
  for (let attempt = 0; attempt <= HTTP_RETRIES; attempt++) {
    try {
      const response = await client.get(url);
      if (response.status >= 400) {
        const error = Object.assign(new Error(`Upstream returned HTTP ${response.status}`), { code: 'UPSTREAM_HTTP_ERROR', status: response.status });
        if (!transientStatuses.has(response.status)) throw error;
        lastError = error;
      } else {
        return { data: response.data, status: response.status, finalUrl: response.request?.res?.responseUrl || url, headers: response.headers };
      }
    } catch (error) {
      lastError = error;
      if (error.code === 'SOURCE_URL_REJECTED' || (error.response?.status && !transientStatuses.has(error.response.status))) throw error;
    }
    if (attempt < HTTP_RETRIES) await new Promise(resolve => setTimeout(resolve, 150 * (2 ** attempt)));
  }
  throw lastError || new Error('Upstream request failed');
}

export async function getSourcePage(path = '/') {
  const errors = [];
  for (const source of SOURCES) {
    try {
      const url = new URL(path, source.baseUrl).toString();
      const result = await requestText(url);
      if (typeof result.data !== 'string' || result.data.trim().length === 0) throw new Error('Upstream returned an empty page');
      return { ...result, source: source.name, baseUrl: source.baseUrl };
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
      const response = await requestText(source.baseUrl);
      return { name: source.name, baseUrl: source.baseUrl, available: response.status >= 200 && response.status < 400, status: response.status, durationMs: Date.now() - started };
    } catch (error) {
      return { name: source.name, baseUrl: source.baseUrl, available: false, error: error.code || 'SOURCE_UNAVAILABLE', durationMs: Date.now() - started };
    }
  }));
}
