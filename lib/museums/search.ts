import type { ArtworkCandidate } from "../types";
import type { MuseumAdapter } from "./types";

export type MuseumSearchResult = {
  candidates: ArtworkCandidate[];
  unavailableSources: string[];
};

export async function searchMuseums(
  adapters: MuseumAdapter[],
  queries: string[]
): Promise<MuseumSearchResult> {
  const uniqueQueries = [...new Set(queries.filter(Boolean))].slice(0, 6);
  const results = await Promise.allSettled(
    adapters.map(async adapter => {
      const records = await Promise.all(uniqueQueries.map(query => adapter.search(query)));
      return records.flat();
    })
  );

  const candidates: ArtworkCandidate[] = [];
  const unavailableSources: string[] = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") candidates.push(...result.value);
    else unavailableSources.push(adapters[index].id);
  });

  return { candidates, unavailableSources };
}