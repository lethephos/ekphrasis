import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { validateImageBytes } from './image/validate.js';
import { normalizeImage } from './image/normalize.js';
import { sha256 } from './image/hash.js';
import { createMemoryCacheStore } from './cache/store.js';
import { createCachePolicy } from './cache/policy.js';
import { createSlidingWindowLimiter } from './security/rate-limit.js';
import { createVisionHttpClient } from './vision/client.js';
import { createVisionClient } from './vision/web-detection.js';
import { createMuseumSearchAdapters } from './museums/providers.js';
import { scoreCandidate, selectCanonical } from './matching/score.js';
import { decideMatch } from './matching/gate.js';
import { createQdrantClient } from './visual/qdrant.js';
import { createVisualResolver } from './visual/fallback.js';
import { createProductionClipEmbedder } from './visual/clip-adapter.js';
import { enrichStyle } from './enrichment/style.js';
import { createIdentifyPipeline } from './api/identify.js';

function createCache(env) {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return createMemoryCacheStore();
  const redis = new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN });
  return {
    get: (key) => redis.get(key),
    set: (key, value, ttlSeconds) => redis.set(key, value, { ex: ttlSeconds }),
  };
}

function createLimiter(env) {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return createSlidingWindowLimiter({ limit: 20, windowMs: 60_000 });
  }
  const ratelimit = new Ratelimit({
    redis: new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN }),
    limiter: Ratelimit.slidingWindow(20, '1 m'),
    analytics: false,
  });
  return {
    check: async (key) => {
      const result = await ratelimit.limit(key);
      return { allowed: result.success, remaining: result.remaining };
    },
  };
}

function createStyleSource(fetchImpl) {
  return {
    async lookup({ title, artist }) {
      const search = new URL('https://www.wikidata.org/w/api.php');
      search.searchParams.set('action', 'wbsearchentities');
      search.searchParams.set('search', artist);
      search.searchParams.set('language', 'en');
      search.searchParams.set('format', 'json');
      search.searchParams.set('limit', '1');
      const found = await fetchImpl(search);
      if (!found.ok) return null;
      const entity = (await found.json()).search?.[0];
      if (!entity?.id) return null;

      const claimsUrl = new URL('https://www.wikidata.org/w/api.php');
      claimsUrl.searchParams.set('action', 'wbgetclaims');
      claimsUrl.searchParams.set('entity', entity.id);
      claimsUrl.searchParams.set('property', 'P135');
      claimsUrl.searchParams.set('format', 'json');
      const claimsResponse = await fetchImpl(claimsUrl);
      if (!claimsResponse.ok) return null;
      const claims = (await claimsResponse.json()).claims?.P135 ?? [];
      const movementId = claims[0]?.mainsnak?.datavalue?.value?.id;
      if (!movementId) return null;

      const labelUrl = new URL('https://www.wikidata.org/w/api.php');
      labelUrl.searchParams.set('action', 'wbgetentities');
      labelUrl.searchParams.set('ids', movementId);
      labelUrl.searchParams.set('languages', 'en');
      labelUrl.searchParams.set('format', 'json');
      const labelResponse = await fetchImpl(labelUrl);
      if (!labelResponse.ok) return null;
      const labels = (await labelResponse.json()).entities?.[movementId]?.labels?.en?.value;
      return labels ? { style: labels, source: 'wikidata' } : null;
    },
  };
}

export function createRuntime({ env = process.env, fetchImpl = fetch, clipPipelineFactory, clipImageLoader } = {}) {
  const visionHttp = createVisionHttpClient({ apiKey: env.GOOGLE_VISION_API_KEY, fetchImpl });
  const vision = createVisionClient({ request: visionHttp.request, timeoutMs: 5000 });
  const cache = createCache(env);
  const policy = createCachePolicy({
    normalTtlSeconds: Number(env.CACHE_TTL_SECONDS ?? 3600),
    degradedTtlSeconds: Number(env.DEGRADED_CACHE_TTL_SECONDS ?? 300),
  });
  const museums = createMuseumSearchAdapters({
    fetchImpl,
    keys: { rijksmuseum: env.RIJKSMUSEUM_API_KEY, smithsonian: env.SMITHSONIAN_API_KEY },
  });

  const visualSearch = env.QDRANT_URL && env.QDRANT_API_KEY && env.QDRANT_COLLECTION
    ? createQdrantClient({ endpoint: env.QDRANT_URL, apiKey: env.QDRANT_API_KEY, collection: env.QDRANT_COLLECTION, fetchImpl })
    : null;
  const clipEmbedder = visualSearch
    ? createProductionClipEmbedder({
        model: env.CLIP_MODEL_ID,
        pipelineFactory: clipPipelineFactory,
        imageLoader: clipImageLoader,
      })
    : null;
  const visual = clipEmbedder && visualSearch
    ? createVisualResolver({
        embed: clipEmbedder,
        search: (vector) => visualSearch.search(vector),
      })
    : null;

  return {
    validate: (bytes) => validateImageBytes(bytes),
    normalize: (bytes) => normalizeImage(bytes),
    hash: (bytes) => sha256(bytes),
    cache,
    cachePolicy: policy,
    rateLimiter: createLimiter(env),
    vision,
    museums,
    score: (query, candidate) => scoreCandidate(query, candidate),
    selectCanonical,
    gate: decideMatch,
    visual,
    enrich: (artwork) => enrichStyle(artwork, createStyleSource(fetchImpl)),
  };
}

export function createProductionPipeline(options = {}) {
  const runtime = createRuntime(options);
  return createIdentifyPipeline(runtime);
}
