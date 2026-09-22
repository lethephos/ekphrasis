import { validateCorpusManifest } from '../../lib/visual/corpus.js';

export function validateIndexSnapshot(snapshot) {
  const manifest = validateCorpusManifest(snapshot?.manifest);
  if (manifest.pointCount !== snapshot?.points?.length) throw new Error('POINT_COUNT_MISMATCH');
  for (const point of snapshot.points ?? []) {
    if (!point?.id || !Array.isArray(point.vector) || point.vector.length !== manifest.dimensions) throw new Error('INVALID_INDEX_POINT');
    if (!point.payload?.institution || !point.payload?.objectId || !point.payload?.imageUrl || !point.payload?.artworkUrl) throw new Error('INVALID_INDEX_POINT_PAYLOAD');
  }
  return manifest;
}
