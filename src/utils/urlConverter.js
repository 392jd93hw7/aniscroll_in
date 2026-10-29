export function absoluteUrl(value, baseUrl) {
  if (!value) return null;
  try { const url = new URL(value, baseUrl); return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null; } catch { return null; }
}
export function isHlsUrl(value) {
  try { return new URL(value).pathname.toLowerCase().endsWith('.m3u8'); } catch { return false; }
}
