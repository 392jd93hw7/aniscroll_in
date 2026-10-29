import { extractCards } from './html.extractor.js';
export function extractSearch(html, baseUrl) { return { items: extractCards(html, baseUrl) }; }
