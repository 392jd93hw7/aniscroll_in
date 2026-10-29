// Parse string assignments from readable page source without executing scripts.
export function extractStringAssignments(script, variableNames = []) {
  const wanted = new Set(variableNames);
  const results = {};
  const pattern = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(['"])(.*?)\2/gms;
  for (const match of String(script).matchAll(pattern)) if (!wanted.size || wanted.has(match[1])) results[match[1]] = match[3];
  return results;
}
export function findHlsUrls(text) {
  const matches = String(text).match(/https?:\\?\/\\?\/[^"'\s<>]+?\.m3u8(?:\?[^"'\s<>]*)?/gi) || [];
  return [...new Set(matches.map(value => value.replace(/\\\//g, '/')))];
}
