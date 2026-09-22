export function normalizeWebDetection(payload) {
  if (!payload || typeof payload !== 'object' || !('webDetection' in payload)) {
    throw new Error('VISION_MALFORMED_RESPONSE');
  }
  const web = payload.webDetection ?? {};
  const queries = [];
  const references = [];
  for (const page of web.pagesWithMatchingImages ?? []) {
    if (page?.pageTitle) queries.push(page.pageTitle);
    if (page?.url) references.push({ url: page.url, title: page.pageTitle ?? null });
  }
  for (const entity of web.webEntities ?? []) {
    if (entity?.description) queries.push(entity.description);
  }
  return {
    queries: [...new Set(queries)],
    references,
  };
}

export function createVisionClient({ request, timeoutMs = 5000 } = {}) {
  if (typeof request !== 'function') throw new TypeError('request must be a function');
  return {
    async detect(bytes) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const payload = await request({ bytes, signal: controller.signal });
        return normalizeWebDetection(payload);
      } catch (error) {
        if (error?.name === 'AbortError' || controller.signal.aborted) throw new Error('VISION_TIMEOUT');
        if (error?.message === 'VISION_MALFORMED_RESPONSE') throw error;
        throw new Error('VISION_UNAVAILABLE');
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
