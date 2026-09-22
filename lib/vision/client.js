export function createVisionHttpClient({ apiKey, fetchImpl = fetch } = {}) {
  if (!apiKey) throw new Error('VISION_CONFIG_MISSING');
  return {
    async request({ bytes, signal }) {
      const endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`;
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ requests: [{ image: { content: Buffer.from(bytes).toString('base64') }, features: [{ type: 'WEB_DETECTION' }] }] }),
        signal,
      });
      if (!response.ok) throw new Error('VISION_PROVIDER_ERROR');
      const body = await response.json();
      return body.responses?.[0] ?? {};
    },
  };
}
