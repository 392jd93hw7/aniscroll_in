import { findHlsUrls, findMediaUrls } from '../utils/jsParser.js';
export function normalizePlaybackSources({ html = '', pageUrl, source }) {
  const media = findMediaUrls(html);
  const streams = media.map(url => ({
    type: url.toLowerCase().includes('.m3u8') ? 'hls' : url.toLowerCase().includes('.mpd') ? 'dash' : 'file',
    format: url.toLowerCase().includes('.m3u8') ? 'm3u8' : url.toLowerCase().includes('.mpd') ? 'mpd' : 'mp4',
    url
  }));
  const embeds = [];
  for (const match of String(html).matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
    try {
      const url = new URL(match[1].replace(/&amp;/g, '&'), pageUrl);
      if (['https:', 'http:'].includes(url.protocol) && !embeds.includes(url.toString())) embeds.push(url.toString());
    } catch { /* ignore malformed URLs */ }
  }
  return {
    source: source || null, pageUrl: pageUrl || null,
    streams, hls: findHlsUrls(html),
    embeds,
    note: 'Only media and embed URLs exposed in accessible page source are returned. Signed URLs may expire.'
  };
}
