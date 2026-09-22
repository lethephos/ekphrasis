import { NextResponse } from "next/server";

export const runtime = "nodejs";
import { identifyImage } from "../../../lib/pipeline/identify";
import { UpstashResultCache } from "../../../lib/cache/upstash";
import { SlidingWindowRateLimiter, createRequestIdentity } from "../../../lib/rate-limit/rate-limit";
import { UpstashRateLimitStore } from "../../../lib/rate-limit/upstash";
import { GoogleVisionAdapter } from "../../../lib/vision/google";
import { MetAdapter } from "../../../lib/museums/met";
import { RijksmuseumAdapter } from "../../../lib/museums/rijksmuseum";
import { ArticAdapter } from "../../../lib/museums/artic";
import { SmithsonianAdapter } from "../../../lib/museums/smithsonian";
import { HttpClipEncoder } from "../../../lib/clip/http";
import { QdrantRuntimeAdapter } from "../../../lib/clip/qdrant";
import clipIndex from "../../../data/clip/index-version.json";
import type { ClipCandidateRef } from "../../../lib/clip/types";
import type { ArtworkCandidate } from "../../../lib/types";

async function hydrateClipCandidates(refs: ClipCandidateRef[], museums: Array<MetAdapter | RijksmuseumAdapter | ArticAdapter | SmithsonianAdapter>): Promise<ArtworkCandidate[]> {
  const bySource = new Map(museums.map(museum => [museum.id, museum]));
  const hydrated = await Promise.all(refs.filter(ref => !ref.candidate).map(async ref => {
    const separator = ref.artworkId.indexOf(":");
    if (separator <= 0) return null;
    const adapter = bySource.get(ref.artworkId.slice(0, separator));
    if (!adapter?.getById) return null;
    return adapter.getById(ref.artworkId.slice(separator + 1));
  }));
  return hydrated.filter((candidate): candidate is ArtworkCandidate => Boolean(candidate));
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("image");
  if (!file || typeof file !== "object" || !("arrayBuffer" in file) || !("size" in file)) {
    return NextResponse.json({ state: "ERROR", error: "INVALID_IMAGE" }, { status: 400 });
  }

  const secret = process.env.RATE_LIMIT_HMAC_SECRET;
  if (!secret) {
    return NextResponse.json({ state: "ERROR", error: "PROCESSING_FAILED" }, { status: 503 });
  }

  try {
    const limiter = new SlidingWindowRateLimiter(new UpstashRateLimitStore());
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const identity = await createRequestIdentity(forwarded, secret);
    const rate = await limiter.check(identity);
    if (!rate.allowed) {
      return NextResponse.json(
        { state: "ERROR", error: "PROCESSING_FAILED" },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds ?? 60) } }
      );
    }

    const clipConfigured = Boolean(
      process.env.CLIP_EMBEDDING_URL &&
      process.env.QDRANT_URL &&
      process.env.QDRANT_API_KEY
    );

    const museums = [new MetAdapter(), new RijksmuseumAdapter(), new ArticAdapter(), new SmithsonianAdapter()];
    const result = await identifyImage(
      { file: file as File, address: identity },
      {
        cache: new UpstashResultCache(),
        limiter: { check: async () => ({ allowed: true }) },
        vision: new GoogleVisionAdapter(),
        museums,
        clip: clipConfigured
          ? {
              encoder: new HttpClipEncoder(),
              qdrant: new QdrantRuntimeAdapter(),
              index: clipIndex,
              hydrate: refs => hydrateClipCandidates(refs, museums)
            }
          : undefined
      }
    );

    const status =
      result.state !== "ERROR" ? 200 :
      result.error === "INVALID_IMAGE" || result.error === "UNSUPPORTED_INPUT" ? 400 :
      result.error === "API_UNAVAILABLE" || result.error === "PROCESSING_FAILED" ? 503 : 500;
    return NextResponse.json(result, { status });
  } catch {
    return NextResponse.json({ state: "ERROR", error: "API_UNAVAILABLE" }, { status: 503 });
  }
}
