import { getSourcePage } from '../utils/requestManager.js';
import { extractCards, pageLooksBlocked } from '../extractors/html.extractor.js';

export async function scrapeHome() {
  const page = await getSourcePage('/');
  if (pageLooksBlocked(page.data)) {
    const error = new Error('The source returned an access or verification page; automated circumvention is not supported.');
    error.status = 503;
    error.code = 'SOURCE_ACCESS_RESTRICTED';
    throw error;
  }
  return { source: page.source, url: page.finalUrl, items: extractCards(page.data, page.baseUrl) };
}

export async function searchAnime(query) {
  if (!query || !query.trim()) {
    const error = new Error('Query parameter q is required.');
    error.status = 400;
    error.code = 'QUERY_REQUIRED';
    throw error;
  }
  // Query URL conventions are deliberately not guessed; inspect current source markup/docs first.
  const error = new Error('Search extraction requires verification of the upstream search route and selectors.');
  error.status = 501;
  error.code = 'UPSTREAM_UNSUPPORTED';
  error.details = { query: query.trim(), nextStep: 'Verify the live search interface before configuring source-specific selectors.' };
  throw error;
}

export async function discoverEpisodeSources() {
  const error = new Error('Episode/stream discovery requires a verified episode-page contract and permitted player URLs.');
  error.status = 501;
  error.code = 'UPSTREAM_UNSUPPORTED';
  throw error;
}
