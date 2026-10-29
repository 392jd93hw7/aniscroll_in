// Extract readable string assignments without evaluating untrusted page scripts.
export function extractStringAssignments(script, variableNames = []) {
  const wanted = new Set(variableNames);
  const results = {};
  const pattern = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(['"])(.*?)\2/gms;
  for (const match of String(script).matchAll(pattern)) {
    if (!wanted.size || wanted.has(match[1])) results[match[1]] = match[3];
  }
  return results;
}
export function findHlsUrls(text) {
  const input = String(text).replace(/\\\//g, '/').replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
  const matches = input.match(/https?:\/\/[^"'\s<>\\]+?\.m3u8(?:\?[^"'\s<>\\]*)?/gi) || [];
  return [...new Set(matches.map(value => value.replace(/[),;]+$/, '')))];
}
export function findMediaUrls(text) {
  const input = String(text).replace(/\\\//g, '/').replace(/&amp;/g, '&');
  const matches = input.match(/https?:\/\/[^"'\s<>\\]+?\.(?:mp4|m3u8|mpd)(?:\?[^"'\s<>\\]*)?/gi) || [];
  return [...new Set(matches.map(value => value.replace(/[),;]+$/, '')))];
}
