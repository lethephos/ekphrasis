export function buildResultViewModel(result) {
  if (result?.status !== 'match') {
    return { status: result?.status ?? 'error', title: null, metadata: {}, source: null, relatedReading: [] };
  }
  return {
    status: 'match',
    title: result.artwork.title,
    metadata: {
      artist: result.artwork.artist,
      year: result.artwork.year,
      medium: result.artwork.medium,
      ...(result.artwork.style ? { style: result.artwork.style } : {}),
    },
    source: result.source,
    relatedReading: Array.isArray(result.related_reading) ? result.related_reading : [],
  };
}
