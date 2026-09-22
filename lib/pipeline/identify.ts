import type { IdentificationResult, ArtworkCandidate } from "../types";
import type { ResultCache } from "../cache/cache";
import { sha256 } from "../cache/cache";
import { validateUpload, type ValidatedUpload } from "../image/validate";
import { normalizeImage, type NormalizedImage } from "../image/normalize";
import { extractSearchCandidates } from "../candidates/extract";
import type { VisionAdapter } from "../vision/google";
import type { MuseumAdapter } from "../museums/types";
import { searchMuseums } from "../museums/search";
import { equivalentDate, equivalentText } from "../matching/normalize";
import { scoreCandidates } from "../matching/score";
import { selectCanonicalCandidate } from "../matching/select";
import type { ClipEncoder, ClipIndex, QdrantAdapter } from "../clip/types";
import { retrieveFallbackCandidates } from "../clip/fallback";
import { fetchWikipedia } from "../enrichment/wikipedia";
import { fetchWikidataFacts } from "../enrichment/wikidata";
import { normalizeContext, normalizeDetail } from "../enrichment/normalize";
import { extractRelatedReading } from "../enrichment/related-reading";
import type { RateLimitDecision } from "../rate-limit/rate-limit";
import { InputError, ProviderError } from "../errors";

export type IdentifyRequest = { file: File; address: string };

export interface IdentifyDeps {
  cache: ResultCache;
  limiter: { check(identity: string): Promise<RateLimitDecision> };
  validate?: (file: File) => Promise<ValidatedUpload>;
  normalize?: (upload: ValidatedUpload) => Promise<NormalizedImage>;
  vision?: VisionAdapter;
  museums?: MuseumAdapter[];
  clip?: { encoder: ClipEncoder; qdrant: QdrantAdapter; index: ClipIndex };
}

function anyTextMatch(value: string | null, queries: string[]): boolean {
  return Boolean(value && queries.some(query => equivalentText(value, query)));
}

function anyDateMatch(value: string | null, queries: string[]): boolean {
  return Boolean(value && queries.some(query => /^\s*(?:c\.?\s*)?\d{4}\s*$/.test(query) && equivalentDate(value, query)));
}

export function evidenceCandidates(candidates: ArtworkCandidate[], queries: string[]): ArtworkCandidate[] {
  return candidates.map(candidate => ({
    ...candidate,
    evidence: {
      vision_text_match: "UNAVAILABLE",
      title_match: anyTextMatch(candidate.artwork.title, queries) ? "MATCH" : "UNAVAILABLE",
      artist_match: anyTextMatch(candidate.artwork.artist, queries) ? "MATCH" : "UNAVAILABLE",
      date_match: anyDateMatch(candidate.artwork.year, queries) ? "MATCH" : "UNAVAILABLE",
      medium_match: anyTextMatch(candidate.artwork.medium, queries) ? "MATCH" : "UNAVAILABLE",
      image_similarity: "UNAVAILABLE"
    }
  }));
}

async function enrich(candidate: ArtworkCandidate): Promise<{ context: string | null; detail: string | null; related_reading: Array<{ title: string; url: string }> }> {
  try {
    const article = await fetchWikipedia(candidate.artwork.title ?? candidate.artwork.artist ?? "");
    const facts = await fetchWikidataFacts(candidate.artwork.title ?? candidate.artwork.artist ?? "");
    return {
      context: normalizeContext([...(article?.extract ? [article.extract] : []), ...facts]),
      detail: normalizeDetail(facts),
      related_reading: extractRelatedReading(
        (article?.externallinks ?? []).map(url => ({ title: new URL(url).hostname.replace(/^www\./, ""), url }))
      )
    };
  } catch {
    return { context: null, detail: null, related_reading: [] };
  }
}

export async function identifyImage(request: IdentifyRequest, deps: IdentifyDeps): Promise<IdentificationResult> {
  const rate = await deps.limiter.check(request.address);
  if (!rate.allowed) return { state: "ERROR", error: "PROCESSING_FAILED" };

  if (request.file.size === 0 || request.file.size > 10 * 1024 * 1024) {
    return { state: "ERROR", error: "UNSUPPORTED_INPUT" };
  }

  const originalBytes = new Uint8Array(await request.file.arrayBuffer());
  const hash = await sha256(originalBytes);
  try {
    const cached = await deps.cache.get(hash);
    if (cached) return cached;
  } catch {
    // Cache is an optimization; recognition must remain available if it is down.
  }

  try {
    const upload = await (deps.validate ?? validateUpload)(request.file);
    const image = await (deps.normalize ?? normalizeImage)(upload);

    if (!deps.vision || !deps.museums) throw new ProviderError("vision", "PROVIDER_ERROR", "Recognition providers are not configured.");

    const detection = await deps.vision.detect(image.bytes);
    const queries = extractSearchCandidates(detection);
    const museumResult = await searchMuseums(deps.museums, queries);
    let candidates = evidenceCandidates(museumResult.candidates, queries);
    let selection = selectCanonicalCandidate(scoreCandidates(candidates), ["met", "rijksmuseum", "aic", "smithsonian"]);

    if (!selection.candidate && deps.clip) {
      try {
        const fallback = await retrieveFallbackCandidates(
          image.bytes,
          deps.clip.index,
          deps.clip.encoder,
          deps.clip.qdrant,
          async refs => refs.flatMap(ref => ref.candidate ? [ref.candidate] : [])
        );
        candidates = evidenceCandidates(fallback, queries);
        selection = selectCanonicalCandidate(scoreCandidates(candidates), ["met", "rijksmuseum", "aic", "smithsonian"]);
      } catch {
        // Qdrant/CLIP is non-critical; continue to NO_MATCH.
      }
    }

    const result: IdentificationResult = selection.candidate
      ? {
          state: "MATCH",
          confidence: selection.confidence ?? "medium",
          artwork: selection.candidate.artwork,
          source: selection.candidate.source,
          ...(await enrich(selection.candidate)),
          degraded: museumResult.unavailableSources.length > 0,
          unavailable_sources: museumResult.unavailableSources
        }
      : {
          state: "NO_MATCH",
          reason: "insufficient_evidence",
          degraded: museumResult.unavailableSources.length > 0,
          unavailable_sources: museumResult.unavailableSources
        };

    try {
      await deps.cache.set(hash, result);
    } catch {
      // Cache write failures do not invalidate an otherwise valid recognition result.
    }
    return result;
  } catch (error) {
    const result: IdentificationResult =
      error instanceof InputError
        ? { state: "ERROR", error: error.code }
        : error instanceof ProviderError && error.provider === "vision"
          ? { state: "ERROR", error: "API_UNAVAILABLE" }
          : { state: "ERROR", error: "PROCESSING_FAILED" };
    return result;
  }
}
