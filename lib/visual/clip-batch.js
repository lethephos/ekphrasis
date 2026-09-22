export async function embedCorpusArtifacts({ artifacts, embed, model }) {
  if (!Array.isArray(artifacts)) throw new Error('INVALID_ARTIFACTS');
  if (typeof embed !== 'function') throw new Error('EMBEDDER_REQUIRED');

  let dimensions = null;
  const points = [];

  for (const artifact of artifacts) {
    const vector = await embed(artifact.bytes);
    if (!Array.isArray(vector) || vector.length === 0) throw new Error('INVALID_EMBEDDING');
    if (dimensions == null) dimensions = vector.length;
    if (vector.length !== dimensions) throw new Error('EMBEDDING_DIMENSION_MISMATCH');

    points.push({
      id: `${artifact.institution}:${artifact.objectId}`,
      vector,
      payload: {
        institution: artifact.institution,
        objectId: artifact.objectId,
        sha256: artifact.sha256,
      },
    });
  }

  return { model, dimensions: dimensions ?? 0, points };
}
