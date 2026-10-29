export function normalizeList(items, page = 1, limit = 20) {
  return { items: Array.isArray(items) ? items : [], pagination: { page: Math.max(1, Number(page) || 1), limit: Math.max(1, Number(limit) || 20), count: Array.isArray(items) ? items.length : 0 } };
}
