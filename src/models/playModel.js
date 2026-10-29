import { findHlsUrls } from '../utils/jsParser.js';
export function normalizePlaybackSources({ html = '', pageUrl, source }) {
  const hls = findHlsUrls(html);
  const embeds = [];
  for (const match of String(html).matchAll(/(?:src|href)\s*=\s*["'](https?:\/\/[^"']+)["']/gi)) {
    try {
      const url = new URL(match[1], pageUrl);
      if (['https:', 'http:'].includes(url.protocol) && !embeds.includes(url.toString())) embeds.push(url.toString());
    } catch { /* ignore malformed URLs */ }
  }
  return { source: source || null, pageUrl: pageUrl || null, streams: hls.map(url => ({ type: 'hls', format: 'm3u8', url })), embeds, note: 'Only publicly exposed source URLs are reported; signed URLs may expire and access controls are not bypassed.' };
}
