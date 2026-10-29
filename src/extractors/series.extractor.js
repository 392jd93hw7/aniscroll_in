import { extractCards } from './html.extractor.js';
export function extractSeries(html, baseUrl) { return { items: extractCards(html, baseUrl) }; }
