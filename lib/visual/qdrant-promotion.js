export function createQdrantPromotion({ client, requiredSources, alias }) {
  if (!client) throw new Error('QDRANT_CLIENT_REQUIRED');

  return {
    promote: async (manifest) => {
      for (const source of requiredSources) {
        if (!(manifest.sourceCounts?.[source] > 0)) throw new Error('SOURCE_COVERAGE_MISMATCH');
      }

      if (typeof client.count !== 'function' || typeof client.getCollection !== 'function') {
        throw new Error('QDRANT_CLIENT_REQUIRED');
      }

      const collection = await client.getCollection(manifest.collection);
      const size = collection?.config?.params?.vectors?.size;
      if (size !== manifest.dimensions) throw new Error('DIMENSION_MISMATCH');

      const count = (await client.count(manifest.collection))?.count;
      if (count !== manifest.pointCount) throw new Error('POINT_COUNT_MISMATCH');

      if (typeof client.setAlias !== 'function') throw new Error('QDRANT_ALIAS_REQUIRED');
      await client.setAlias(alias, manifest.collection);
      return manifest.collection;
    },
  };
}
