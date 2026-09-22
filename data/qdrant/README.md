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

1. Export normalized catalog records with `scripts/qdrant/export-catalog.mjs` or run the end-to-end offline builder `scripts/qdrant/build-index.mjs`.
2. Download only museum-provided source images; bytes are SHA-256 hashed before persistence.
3. Generate embeddings with the pinned Transformers.js CLIP model.
4. Batch-upsert into a new date-versioned Qdrant collection.
5. Validate point count, payload completeness, dimensions, source coverage, and the smoke-query set before promotion.
6. Promote only after validation by atomically switching the configured active alias.

A batch worker may run locally or on an external droplet. It is never a request-time dependency.

The repository intentionally does not contain museum image binaries or embedding vectors.
