import { createCatalogExporter } from '../../lib/visual/catalog-exporter.js';
import { exportCatalog } from './export-catalog.mjs';

const exporter = createCatalogExporter();
const limit = Number(process.env.CORPUS_LIMIT || 100);
const query = process.env.CORPUS_QUERY || 'painting';

const [met, rijksmuseum, aic, smithsonian] = await Promise.all([
  exporter.exportMet({ query, limit }),
  exporter.exportRijksmuseum({ query, limit, apiKey: process.env.RIJKSMUSEUM_API_KEY }),
  exporter.exportAIC({ page: Number(process.env.AIC_PAGE || 1), limit }),
  exporter.exportSmithsonian({ query, limit, apiKey: process.env.SMITHSONIAN_API_KEY }),
]);

await exportCatalog([...met, ...rijksmuseum, ...aic, ...smithsonian], process.env.CORPUS_OUTPUT || 'data/qdrant/catalog.json');
console.log(`Exported ${met.length + rijksmuseum.length + aic.length + smithsonian.length} corpus records.`);
