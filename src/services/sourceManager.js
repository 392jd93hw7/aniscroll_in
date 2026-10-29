import { SOURCES } from '../configs/source.config.js';
import { getSourcePage } from '../utils/requestManager.js';
import { pageLooksBlocked } from '../extractors/html.extractor.js';

export async function getSourceHealth() {
  const health = [];
  for (const source of SOURCES) {
    try {
      const result = await getSourcePage('/');
      health.push({ name: source.name, baseUrl: source.baseUrl, available: true, sampledSource: result.source });
    } catch (error) {
      health.push({ name: source.name, baseUrl: source.baseUrl, available: false, error: error.code || 'UPSTREAM_ERROR' });
    }
  }
  return health;
}
