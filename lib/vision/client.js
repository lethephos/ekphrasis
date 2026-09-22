export function createVisionHttpClient({ endpoint, apiKey, timeoutMs = 5000, fetchImpl = fetch } = {}) {
  if (!endpoint || !apiKey) throw new Error('VISION_CONFIG_MISSING');
  return {
    async request({ bytes, signal }) {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ requests: [{ image: { content: Buffer.from(bytes).toString('base64') }, features: [{ type: 'WEB_DETECTION' }] }] }),
        signal,
      });
      if (!response.ok) throw new Error('VISION_PROVIDER_ERROR');
      const body = await response.json();
      return body.responses?.[0] ?? body;
    },
  };
}
