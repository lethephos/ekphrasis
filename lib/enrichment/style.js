export async function enrichStyle(artwork, source) {
  if (artwork?.style) {
    return { style: artwork.style, styleSource: artwork.styleSource ?? 'museum' };
  }
  if (!source?.lookup) return { style: null, styleSource: null };
  try {
    const evidence = await source.lookup({
      title: artwork?.title ?? '',
      artist: artwork?.artist ?? '',
    });
    const allowed = evidence?.styleSource === 'wikidata' ? 'wikidata' :
      evidence?.source === 'wikipedia' ? 'wikipedia' : null;
    if (evidence?.style && allowed) return { style: evidence.style, styleSource: allowed };
  } catch {}
  return { style: null, styleSource: null };
}
