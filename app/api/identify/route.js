import { createIdentifyPipeline } from '../../../lib/api/identify.js';

export async function POST(request) {
  try {
    const body = await request.arrayBuffer();
    if (!body.byteLength) return Response.json({ status: 'error', code: 'INVALID_INPUT' }, { status: 400 });

    const pipeline = createIdentifyPipeline({
      validate: async (bytes) => ({ size: bytes.byteLength, format: 'unknown' }),
      hash: async (bytes) => {
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        return [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, '0')).join('');
      },
      cache: { get: async () => null, set: async () => {} },
      rateLimiter: { check: async () => ({ allowed: true, remaining: 9 }) },
      vision: { detect: async () => ({ queries: [] }) },
      museums: [],
      score: () => null,
      gate: () => ({ status: 'no_match', confidence: 'low', useVisualFallback: true }),
    });

    return Response.json(await pipeline.identify(new Uint8Array(body), {
      clientKey: request.headers.get('x-forwarded-for') ?? 'unknown',
    }));
  } catch (error) {
    const code = error?.message === 'RATE_LIMITED' ? 'RATE_LIMITED' : 'API_UNAVAILABLE';
    return Response.json({ status: 'error', code }, { status: code === 'RATE_LIMITED' ? 429 : 503 });
  }
}
