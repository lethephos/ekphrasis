import type { IdentificationResult, ArtworkCandidate } from "../types";
import type { ResultCache } from "../cache/cache";
import { sha256 } from "../cache/cache";
import { validateUpload, type ValidatedUpload } from "../image/validate";
import { normalizeImage, type NormalizedImage } from "../image/normalize";
import { extractSearchCandidates } from "../candidates/extract";
import type { VisionAdapter } from "../vision/google";
import type { MuseumAdapter } from "../museums/types";
import { searchMuseums } from "../museums/search";
import { buildEvidence } from "../matching/evidence";
import { scoreCandidates } from "../matching/score";
import { selectCanonicalCandidate } from "../matching/select";
import type { ClipEncoder, ClipIndex, QdrantAdapter } from "../clip/types";
import { retrieveFallbackCandidates } from "../clip/fallback";
import { fetchWikipedia } from "../enrichment/wikipedia";
import { fetchWikidataFacts } from "../enrichment/wikidata";
import { normalizeContext, normalizeDetail } from "../enrichment/normalize";
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

function evidenceCandidates(candidates: ArtworkCandidate[], queries: string[]): ArtworkCandidate[] {
  return candidates.map(candidate => {
    const evidences = queries.map(query =>
      buildEvidence(candidate.artwork, { title: query, artist: query, year: query, medium: query })
    );
    const best = (field: keyof ArtworkCandidate["evidence"]) =>
      evidences.some(evidence => evidence[field] === "MATCH")
        ? "MATCH" as const
        : evidences.some(evidence => evidence[field] === "MISMATCH")
          ? "MISMATCH" as const
          : "UNAVAILABLE" as const;
    return {
      ...candidate,
      evidence: {
        vision_text_match: "UNAVAILABLE",
        title_match: best("title_match"),
        artist_match: best("artist_match"),
        date_match: best("date_match"),
        medium_match: best("medium_match"),
        image_similarity: "UNAVAILABLE"
      }
    };
  });
}

async function enrich(candidate: ArtworkCandidate): Promise<{ context: string | null; detail: string | null }> {
  try {
    const article = await fetchWikipedia(candidate.artwork.title ?? candidate.artwork.artist ?? "");
    const facts = await fetchWikidataFacts(candidate.artwork.title ?? candidate.artwork.artist ?? "");
    return {
      context: normalizeContext([...(article?.extract ? [article.extract] : []), ...facts]),
      detail: normalizeDetail(facts)
    };
  } catch {
    return { context: null, detail: null };
  }
}

export async function identifyImage(request: IdentifyRequest, deps: IdentifyDeps): Promise<IdentificationResult> {
  const rate = await deps.limiter.check(request.address);
  if (!rate.allowed) return { state: "ERROR", error: "PROCESSING_FAILED" };

  const originalBytes = new Uint8Array(await request.file.arrayBuffer());
  const hash = await sha256(originalBytes);
  const cached = await deps.cache.get(hash);
  if (cached) return cached;

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
          async refs => refs
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

    await deps.cache.set(hash, result);
    return result;
  } catch (error) {
    const result: IdentificationResult =
      error instanceof InputError
        ? { state: "ERROR", error: error.code }
        : error instanceof ProviderError && error.provider === "vision"
          ? { state: "ERROR", error: "API_UNAVAILABLE" }
          : { state: "ERROR", error: "PROCESSING_FAILED" };
    if (result.state !== "ERROR" || result.error !== "API_UNAVAILABLE") await deps.cache.set(hash, result);
    return result;
  }
}