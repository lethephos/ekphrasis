import { embedCorpusArtifacts } from './clip-batch.js';

export async function buildVisualIndex({ records, version, collection, model, dimensions, download, embed, index } = {}) {
  if (!Array.isArray(records) || !version || !collection || !model || !Number.isInteger(dimensions) || typeof download !== 'function' || typeof embed !== 'function' || !index) {
    throw new Error('INVALID_INDEX_BUILD');
  }
  const artifacts = await download(records);
  const embedded = await embedCorpusArtifacts({ artifacts, embed, model });
  if (embedded.dimensions !== dimensions) throw new Error('EMBEDDING_DIMENSION_MISMATCH');
  await index.createVersion(version);
  await index.upsert(version, embedded.points);
  return {
    collection: collection + '-' + version,
    model,
    dimensions,
    pointCount: embedded.points.length,
    sourceCounts: embedded.points.reduce((counts, point) => ({ ...counts, [point.payload.institution]: (counts[point.payload.institution] ?? 0) + 1 }), {}),
  };
}
