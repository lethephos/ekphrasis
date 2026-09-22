import test from 'node:test';
import assert from 'node:assert/strict';
import { runCatalogExports } from '../../lib/visual/catalog-batch.js';

test('catalog batch isolates one provider failure and keeps successful records', async () => {
  const result = await runCatalogExports([
    { name: 'met', export: async () => [{ objectId: '1' }] },
    { name: 'aic', export: async () => { throw new Error('AIC_DOWN'); } },
    { name: 'smithsonian', export: async () => [{ objectId: '3' }] },
  ]);

  assert.deepEqual(result.records, [
    { provider: 'met', records: [{ objectId: '1' }] },
    { provider: 'smithsonian', records: [{ objectId: '3' }] },
  ]);
  assert.deepEqual(result.failures, [{ provider: 'aic', error: 'CATALOG_PROVIDER_UNAVAILABLE' }]);
});

test('catalog batch reports provider failure without exposing arbitrary error objects', async () => {
  const result = await runCatalogExports([
    { name: 'met', export: async () => { throw new Error('secret transport detail'); } },
  ]);

  assert.deepEqual(result.failures, [{ provider: 'met', error: 'CATALOG_PROVIDER_UNAVAILABLE' }]);
});
