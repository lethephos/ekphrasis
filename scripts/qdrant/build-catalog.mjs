import { createCatalogExporter } from '../../lib/visual/catalog-exporter.js';
import { runCatalogExports } from '../../lib/visual/catalog-batch.js';
import { exportCatalog } from './export-catalog.mjs';

const exporter = createCatalogExporter();
const limit = Number(process.env.CORPUS_LIMIT || 100);
const query = process.env.CORPUS_QUERY || 'painting';

const batch = await runCatalogExports([
  { name: 'met', export: () => exporter.exportMet({ query, limit }) },
  { name: 'rijksmuseum', export: () => exporter.exportRijksmuseum({ query, limit, apiKey: process.env.RIJKSMUSEUM_API_KEY }) },
  { name: 'aic', export: () => exporter.exportAIC({ page: Number(process.env.AIC_PAGE || 1), limit }) },
  { name: 'smithsonian', export: () => exporter.exportSmithsonian({ query, limit, apiKey: process.env.SMITHSONIAN_API_KEY }) },
]);

for (const failure of batch.failures) {
  console.warn(`Catalog provider ${failure.provider} failed: ${failure.error}`);
}

const records = batch.records.flatMap(({ records: providerRecords }) => providerRecords);
if (records.length === 0) throw new Error('CATALOG_EXPORT_ALL_PROVIDERS_FAILED');

await exportCatalog(records, process.env.CORPUS_OUTPUT || 'data/qdrant/catalog.json');
console.log(`Exported ${records.length} corpus records from ${batch.records.length} providers.`);
