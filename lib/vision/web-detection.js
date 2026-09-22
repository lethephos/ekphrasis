export function normalizeWebDetection(payload) {
  if (!payload || typeof payload !== 'object' || !('webDetection' in payload)) throw new Error('VISION_MALFORMED_RESPONSE');
  const web = payload.webDetection ?? {};
  const queries = [];
  const references = [];
  const signals = [];
  for (const page of web.pagesWithMatchingImages ?? []) {
    if (page?.pageTitle) {
      queries.push(page.pageTitle);
      signals.push({ value: page.pageTitle, type: 'title' });
    }
    if (page?.url) references.push({ url: page.url, title: page.pageTitle ?? null });
  }
  for (const entity of web.webEntities ?? []) {
    if (entity?.description) {
      queries.push(entity.description);
      signals.push({ value: entity.description, type: 'artist' });
    }
  }
  return { queries: [...new Set(queries)], references, signals };
}

export function createVisionClient({ request, timeoutMs = 5000 } = {}) {
  if (typeof request !== 'function') throw new TypeError('request must be a function');
  return {
    async detect(bytes) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return normalizeWebDetection(await request({ bytes, signal: controller.signal }));
      } catch (error) {
        if (error?.name === 'AbortError' || controller.signal.aborted) throw new Error('VISION_TIMEOUT');
        if (error?.message === 'VISION_MALFORMED_RESPONSE') throw error;
        throw new Error('VISION_UNAVAILABLE');
      } finally { clearTimeout(timer); }
    },
  };
}
