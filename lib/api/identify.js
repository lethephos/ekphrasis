import { buildIdentificationResult } from '../domain/model.js';

export function createIdentifyPipeline(deps = {}) {
  return {
    async identify(bytes, { clientKey } = {}) {
      const admission = await deps.rateLimiter?.check?.(clientKey ?? 'unknown');
      if (admission && !admission.allowed) throw new Error('RATE_LIMITED');

      const validated = await deps.validate(bytes);
      const hash = await deps.hash(bytes);
      const cached = await deps.cache?.get?.(hash);
      if (cached) return cached;

      const normalized = deps.normalize ? await deps.normalize(bytes) : { bytes };
      const vision = await deps.vision.detect(normalized.bytes);
      const signals = vision.signals ?? vision.queries?.map((value) => ({ value, type: 'title' })) ?? [];
      const scored = [];

      for (const museum of deps.museums ?? []) {
        for (const signal of signals) {
          try {
            const candidates = await museum.search(signal.value);
            for (const candidate of candidates) {
              const query = signal.type === 'artist' ? { artist: signal.value } : { title: signal.value };
              scored.push(deps.score(query, candidate));
            }
          } catch {}
        }
      }

      const best = deps.selectCanonical ? deps.selectCanonical(scored) : [...scored].sort((a, b) => b.score - a.score)[0] ?? null;
      if (!best || !best.candidate.artist || !best.candidate.artworkUrl || !best.candidate.imageUrl) {
        const result = { status: 'no_match', confidence: 'low', diagnostics: { degraded: true, input: validated, hash } };
        const ttl = deps.cachePolicy?.ttlFor?.(result) ?? deps.noMatchTtlSeconds ?? 300;
        if (deps.cachePolicy?.shouldCache?.(result) !== false) await deps.cache?.set?.(hash, result, ttl);
        return result;
      }

      const decision = deps.gate(best);
      let style = { style: best.candidate.style ?? null, styleSource: best.candidate.style ? 'museum' : null };
      if (!best.candidate.style && deps.enrich) style = await deps.enrich(best.candidate);

      const result = buildIdentificationResult({
        status: decision.status,
        confidence: decision.confidence,
        artwork: {
          title: best.candidate.title,
          artist: best.candidate.artist,
          year: best.candidate.year,
          medium: best.candidate.medium,
          style: style.style,
          styleSource: style.styleSource,
          museum: best.candidate.institution,
        },
        source: {
          institution: best.candidate.institution,
          objectId: best.candidate.objectId,
          artworkUrl: best.candidate.artworkUrl,
          imageUrl: best.candidate.imageUrl,
          license: { status: best.candidate.license === 'verified' ? 'verified' : 'unknown' },
        },
        evidence: best.evidence,
        diagnostics: { degraded: false, hash },
      });

      const ttl = deps.cachePolicy?.ttlFor?.(result) ?? deps.cacheTtlSeconds ?? 3600;
      if (deps.cachePolicy?.shouldCache?.(result) !== false) await deps.cache?.set?.(hash, result, ttl);
      return result;
    },
  };
}
