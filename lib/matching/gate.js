export function decideMatch({ score, evidence }) {
  const mismatches = Object.values(evidence ?? {}).filter((state) => state === 'MISMATCH').length;
  if (score >= 0.8 && mismatches === 0) return { status: 'match', confidence: 'high', useVisualFallback: false };
  if (score >= 0.6 && mismatches <= 1) return { status: 'match', confidence: 'medium', useVisualFallback: false };
  return { status: 'no_match', confidence: 'low', useVisualFallback: true };
}

export function createVisualFallback({ search } = {}) {
  if (typeof search !== 'function') throw new TypeError('search must be a function');
  return {
    async search(bytes) {
      return search(bytes);
    },
  };
}
