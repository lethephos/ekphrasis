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

      const vision = await deps.vision.detect(bytes);
      const queries = vision.queries ?? [];
      const raw = [];
      for (const museum of deps.museums ?? []) {
        for (const query of queries) {
          try { raw.push(...await museum.search(query)); } catch {}
        }
      }
      const scored = raw.map((candidate) => deps.score(vision, candidate));
      const best = deps.selectCanonical
        ? deps.selectCanonical(scored)
        : [...scored].sort((a, b) => b.score - a.score)[0] ?? null;

      if (!best) {
        const result = { status: 'no_match', confidence: 'low', diagnostics: { degraded: true, input: validated, hash } };
        await deps.cache?.set?.(hash, result, deps.noMatchTtlSeconds ?? 300);
        return result;
      }

      let decision = deps.gate(best);
      let candidate = best.candidate;
      if (decision.useVisualFallback && deps.visualFallback) {
        try { await deps.visualFallback.search(bytes); } catch {}
      }

      let style = { style: candidate.style ?? null, styleSource: candidate.style ? 'museum' : null };
      if (!candidate.style && deps.enrich) style = await deps.enrich(candidate);

      const result = buildIdentificationResult({
        status: decision.status,
        confidence: decision.confidence,
        artwork: {
          title: candidate.title,
          artist: candidate.artist,
          year: candidate.year,
          medium: candidate.medium,
          style: style.style,
          styleSource: style.styleSource,
        },
        source: {
          institution: candidate.institution,
          objectId: candidate.objectId,
          artworkUrl: candidate.artworkUrl,
          imageUrl: candidate.imageUrl,
          license: candidate.license,
        },
        evidence: best.evidence,
        diagnostics: { degraded: false, hash },
      });
      await deps.cache?.set?.(hash, result, deps.cacheTtlSeconds ?? 3600);
      return result;
    },
  };
}
