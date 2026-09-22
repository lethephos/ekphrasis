# Ekphrasis CLIP / Qdrant corpus

The runtime Qdrant path is read-only. Corpus generation is an offline batch workflow.

## Contract

- One pinned CLIP model/version is used for both query embeddings and corpus embeddings.
- Every point resolves to a museum + object ID.
- Every point carries museum image/artwork provenance and license metadata.
- The four MVP sources are The Metropolitan Museum of Art, Rijksmuseum, Art Institute of Chicago, and Smithsonian.
- Rebuilds create a new versioned collection; validation happens before promotion.
- The live request path never creates collections or writes vectors.

## Offline flow

1. Export normalized catalog records with `scripts/qdrant/export-catalog.mjs`.
2. Download only museum-provided source images.
3. Generate embeddings with the pinned CLIP model.
4. Batch-upsert into a new versioned Qdrant collection.
5. Run `scripts/qdrant/validate-index.mjs` against the snapshot/manifest.
6. Promote the validated collection by changing the configured active collection/version.

A batch worker may run locally or on an external droplet. It is never a request-time dependency.

The repository intentionally does not contain museum image binaries or embedding vectors.
