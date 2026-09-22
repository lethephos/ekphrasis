const REQUIRED_SOURCES = ['The Metropolitan Museum of Art', 'Rijksmuseum', 'Art Institute of Chicago', 'Smithsonian'];

export function validateIndexManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') throw new Error('INVALID_INDEX_MANIFEST');
  if (!manifest.collection || !manifest.model || !Number.isInteger(manifest.dimensions) || manifest.dimensions <= 0) throw new Error('INVALID_INDEX_MANIFEST');
  for (const source of REQUIRED_SOURCES) if (!manifest.sources?.includes(source)) throw new Error('INDEX_SOURCE_MISSING');
  if (!Number.isInteger(manifest.pointCount) || manifest.pointCount < 0) throw new Error('INVALID_INDEX_MANIFEST');
  return structuredClone(manifest);
}

export function buildQdrantFilter(institution, objectId) {
  return { must: [
    { key: 'institution', match: { value: institution } },
    { key: 'objectId', match: { value: objectId } },
  ] };
}
