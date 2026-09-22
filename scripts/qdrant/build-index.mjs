import fs from 'node:fs/promises';
import { createCatalogExporter } from '../../lib/visual/catalog-exporter.js';
import { runCatalogExports } from '../../lib/visual/catalog-batch.js';
import { downloadCorpusArtifacts } from '../../lib/visual/corpus-artifact.js';
import { createProductionClipEmbedder } from '../../lib/visual/clip-adapter.js';
import { createQdrantAdminClient } from '../../lib/visual/qdrant.js';
import { createQdrantIndex } from '../../lib/visual/qdrant-index.js';
import { createQdrantPromotion } from '../../lib/visual/qdrant-promotion.js';
import { buildVisualIndex } from '../../lib/visual/index-builder.js';

const exporter = createCatalogExporter();
const limit = Number(process.env.CORPUS_LIMIT || 100);
const query = process.env.CORPUS_QUERY || 'painting';
const batch = await runCatalogExports([
  { name: 'met', export: () => exporter.exportMet({ query, limit }) },
  { name: 'rijksmuseum', export: () => exporter.exportRijksmuseum({ query, limit }) },
  { name: 'aic', export: () => exporter.exportAIC({ page: 1, limit }) },
  { name: 'smithsonian', export: () => exporter.exportSmithsonian({ query, limit, apiKey: process.env.SMITHSONIAN_API_KEY }) },
]);
const records = batch.records.flatMap(({ records: providerRecords }) => providerRecords);
if (!records.length) throw new Error('CATALOG_EXPORT_ALL_PROVIDERS_FAILED');

const admin = createQdrantAdminClient({ endpoint: process.env.QDRANT_URL, apiKey: process.env.QDRANT_API_KEY });
const index = createQdrantIndex({ client: admin, collection: process.env.QDRANT_COLLECTION || 'ekphrasis-clip', dimensions: Number(process.env.CLIP_EMBEDDING_DIMENSIONS || 512) });
const embed = createProductionClipEmbedder({ model: process.env.CLIP_MODEL_ID });
const result = await buildVisualIndex({
  records,
  version: process.env.QDRANT_INDEX_VERSION || new Date().toISOString().slice(0, 10),
  collection: process.env.QDRANT_COLLECTION || 'ekphrasis-clip',
  model: process.env.CLIP_MODEL_ID || 'Xenova/clip-vit-base-patch32',
  dimensions: Number(process.env.CLIP_EMBEDDING_DIMENSIONS || 512),
  download: (items) => downloadCorpusArtifacts({ records: items }),
  embed,
  index,
});
const promotion = createQdrantPromotion({
  client: admin,
  requiredSources: ['The Met', 'Rijksmuseum', 'Art Institute of Chicago', 'Smithsonian'],
  alias: process.env.QDRANT_ALIAS || 'ekphrasis-clip-current',
});
await promotion.promote(result);
await fs.writeFile(process.env.QDRANT_BUILD_MANIFEST || 'data/qdrant/build-manifest.json', JSON.stringify({ ...result, promoted: true }, null, 2));
console.log(JSON.stringify({ ...result, promoted: true }, null, 2));
