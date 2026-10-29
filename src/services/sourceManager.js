import { SOURCES } from '../configs/source.config.js';
import { requestText } from '../utils/requestManager.js';

export async function getSourceHealth() {
  return Promise.all(SOURCES.map(async source => {
    const started = Date.now();
    try {
      const result = await requestText(source.baseUrl);
      return { name: source.name, baseUrl: source.baseUrl, available: result.status >= 200 && result.status < 400, status: result.status, durationMs: Date.now() - started };
    } catch (error) {
      return { name: source.name, baseUrl: source.baseUrl, available: false, error: error.code || 'UPSTREAM_ERROR', durationMs: Date.now() - started };
    }
  }));
}
