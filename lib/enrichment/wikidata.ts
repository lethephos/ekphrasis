import { ProviderError } from "../errors";
export async function fetchWikidataFacts(search: string): Promise<string[]> {
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(search)}&language=en&format=json&limit=1`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new ProviderError("wikidata", "PROVIDER_ERROR", "Wikidata request failed.");
    const data = await response.json() as { search?: Array<{ description?: string }> };
    return data.search?.map(item => item.description).filter((x): x is string => Boolean(x)) ?? [];
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError("wikidata", "NETWORK", "Wikidata request failed.");
  }
}