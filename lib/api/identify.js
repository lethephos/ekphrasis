import { buildIdentificationResult } from '../domain/model.js';

function buildVisionQuery(signals) {
  return signals.reduce((query, signal) => {
    if (signal?.type === 'artist' && !query.artist) query.artist = signal.value;
    if (signal?.type === 'title' && !query.title) query.title = signal.value;
    return query;
  }, {});
}

export function createIdentifyPipeline(deps = {}) {
  return {
    async identify(bytes, { clientKey } = {}) {
      const admission = await deps.rateLimiter?.check?.(clientKey ?? 'unknown');
      if (admission && !admission.allowed) throw new Error('RATE_LIMITED');

      const validated = await deps.validate(bytes);
      const hash = await deps.hash(bytes);
      let cached = null;
      try { cached = await deps.cache?.get?.(hash); } catch {}
      if (cached) return cached;

      const normalized = deps.normalize ? await deps.normalize(bytes) : { bytes };
      const vision = await deps.vision.detect(normalized.bytes);
      const signals = vision.signals ?? vision.queries?.map((value) => ({ value, type: 'title' })) ?? [];
      const query = buildVisionQuery(signals);
      const scored = [];
      let degraded = false;

      for (const museum of deps.museums ?? []) {
        try {
          const searchTerm = query.title ?? query.artist ?? signals[0]?.value;
          if (!searchTerm) continue;
          const candidates = await museum.search(searchTerm);
          for (const candidate of candidates) scored.push(deps.score(query, candidate));
        } catch { degraded = true; }
      }

      let best = deps.selectCanonical ? deps.selectCanonical(scored) : [...scored].sort((a, b) => b.score - a.score)[0] ?? null;
      if (!best || !best.candidate.artist || !best.candidate.artworkUrl || !best.candidate.imageUrl) {
        const result = { status: 'no_match', confidence: 'low', diagnostics: { degraded: degraded || scored.length === 0, input: validated, hash } };
        const ttl = deps.cachePolicy?.ttlFor?.(result) ?? deps.noMatchTtlSeconds ?? 300;
        if (deps.cachePolicy?.shouldCache?.(result) !== false) { try { await deps.cache?.set?.(hash, result, ttl); } catch {} }
        return result;
      }

      let decision = deps.gate(best);
      if (decision.useVisualFallback && deps.visual) {
        const visual = await deps.visual.resolve(normalized.bytes, decision);
        if (visual?.candidate) {
          const visualScore = deps.score(query, visual.candidate);
          const hasMetadataMismatch = Object.values(visualScore.evidence ?? {}).includes('MISMATCH');
          const visualDecision = deps.gate({
            ...visualScore,
            score: hasMetadataMismatch ? 0 : (visual.similarity ?? 0),
          });
          if (visualDecision.status === 'match') {
            best = visualScore;
            decision = visualDecision;
            degraded = degraded || visual.degraded;
          }
        }
      }
      let style = { style: best.candidate.style ?? null, styleSource: best.candidate.style ? 'museum' : null };
      if (!best.candidate.style && deps.enrich) { try { style = await deps.enrich(best.candidate); } catch {} }

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
        diagnostics: { degraded, hash },
      });

      const ttl = deps.cachePolicy?.ttlFor?.(result) ?? deps.cacheTtlSeconds ?? 3600;
      if (deps.cachePolicy?.shouldCache?.(result) !== false) {
        try { await deps.cache?.set?.(hash, result, ttl); } catch {}
      }
      return result;
    },
  };
}
