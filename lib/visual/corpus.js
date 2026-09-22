const REQUIRED_SOURCES = ['The Metropolitan Museum of Art', 'Rijksmuseum', 'Art Institute of Chicago', 'Smithsonian'];

export function validateCorpusRecord(record) {
  if (!record || typeof record !== 'object'
    || !record.institution || !record.objectId || !record.title || !record.artist
    || !record.imageUrl || !record.artworkUrl
    || !record.license || typeof record.license.status !== 'string') {
    throw new Error('INVALID_CORPUS_RECORD');
  }
  return structuredClone(record);
}

export function buildCorpusManifest({ collection, model, dimensions, records }) {
  if (!collection || !model || !Number.isInteger(dimensions) || dimensions <= 0 || !Array.isArray(records)) {
    throw new Error('INVALID_CORPUS_MANIFEST');
  }
  const normalized = records.map(validateCorpusRecord);
  const identities = new Set();
  for (const record of normalized) {
    const key = record.institution + '::' + record.objectId;
    if (identities.has(key)) throw new Error('DUPLICATE_CORPUS_IDENTITY');
    identities.add(key);
  }
  const sourceCounts = Object.fromEntries(REQUIRED_SOURCES.map((source) => [source, 0]));
  for (const record of normalized) if (sourceCounts[record.institution] !== undefined) sourceCounts[record.institution] += 1;
  return {
    collection,
    model,
    dimensions,
    pointCount: normalized.length,
    sourceCounts,
    sources: REQUIRED_SOURCES,
  };
}

export function validateCorpusManifest(manifest) {
  if (!manifest || typeof manifest !== 'object'
    || !manifest.collection || !manifest.model
    || !Number.isInteger(manifest.dimensions) || manifest.dimensions <= 0
    || !Number.isInteger(manifest.pointCount) || manifest.pointCount < 0) {
    throw new Error('INVALID_CORPUS_MANIFEST');
  }
  for (const source of REQUIRED_SOURCES) if (!manifest.sources?.includes(source)) throw new Error('INDEX_SOURCE_MISSING');
  return structuredClone(manifest);
}
