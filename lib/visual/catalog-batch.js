const SAFE_ERRORS = new Set([
  'CATALOG_PROVIDER_UNAVAILABLE',
  'RIJKSMUSEUM_API_KEY_REQUIRED',
  'SMITHSONIAN_API_KEY_REQUIRED',
]);

function safeError(error) {
  return SAFE_ERRORS.has(error?.message) ? error.message : 'CATALOG_PROVIDER_UNAVAILABLE';
}

export async function runCatalogExports(providers) {
  const settled = await Promise.all(
    providers.map(async ({ name, export: run }) => {
      try {
        return { provider: name, records: await run() };
      } catch (error) {
        return { provider: name, error: safeError(error) };
      }
    }),
  );

  return {
    records: settled.filter((result) => 'records' in result),
    failures: settled.filter((result) => 'error' in result),
  };
}
