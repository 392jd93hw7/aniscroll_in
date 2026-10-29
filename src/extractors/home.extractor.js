import { extractCards } from './html.extractor.js';
export function extractHome(html, baseUrl) { return { items: extractCards(html, baseUrl) }; }
