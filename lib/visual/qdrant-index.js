function versionedName(base, version) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(version)) throw new Error('INVALID_COLLECTION_VERSION');
  return base + '-' + version;
}

export function createQdrantIndex({ client, collection, dimensions }) {
  if (!client || typeof client.createCollection !== 'function' || typeof client.upsert !== 'function') {
    throw new Error('QDRANT_CLIENT_REQUIRED');
  }

  return {
    createVersion: async (version) => {
      const name = versionedName(collection, version);
      await client.createCollection(name, { vectors: { size: dimensions, distance: 'Cosine' } });
      return name;
    },
    upsert: async (version, points) => {
      const name = versionedName(collection, version);
      await client.upsert(name, points);
      return name;
    },
  };
}
