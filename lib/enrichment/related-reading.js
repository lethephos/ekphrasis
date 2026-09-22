const BLOCKED_HOSTS = new Set(['en.wikipedia.org', 'wikipedia.org']);

export function extractRelatedReading({ externalLinks } = {}) {
  if (!Array.isArray(externalLinks)) return [];
  const result = [];
  for (const link of externalLinks) {
    if (result.length >= 3 || !link?.url || !link?.title) continue;
    try {
      const url = new URL(link.url);
      if (url.protocol !== 'https:' || BLOCKED_HOSTS.has(url.hostname.toLowerCase())) continue;
      result.push({ title: String(link.title), url: url.toString() });
    } catch {}
  }
  return result;
}
