import fs from 'node:fs/promises';
import { validateCorpusRecord, buildCorpusManifest } from '../../lib/visual/corpus.js';

export async function exportCatalog(records, outputPath) {
  const normalized = records.map(validateCorpusRecord);
  const manifest = buildCorpusManifest({
    collection: process.env.QDRANT_COLLECTION_VERSION || 'ekphrasis-v1',
    model: process.env.CLIP_MODEL_ID || 'openai/clip-vit-base-patch32',
    dimensions: Number(process.env.CLIP_EMBEDDING_DIMENSIONS || 512),
    records: normalized,
  });
  await fs.mkdir(new URL('.', new URL(outputPath, 'file://'+process.cwd()+'/')).pathname, { recursive: true }).catch(() => {});
  await fs.writeFile(outputPath, JSON.stringify({ manifest, records: normalized }, null, 2));
  return manifest;
}
