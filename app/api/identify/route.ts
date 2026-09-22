import { NextResponse } from "next/server";
import { identifyImage } from "../../../lib/pipeline/identify";
import { UpstashResultCache } from "../../../lib/cache/upstash";
import { SlidingWindowRateLimiter } from "../../../lib/rate-limit/rate-limit";
import { UpstashRateLimitStore } from "../../../lib/rate-limit/upstash";
import { createRequestIdentity } from "../../../lib/rate-limit/rate-limit";
import { GoogleVisionAdapter } from "../../../lib/vision/google";
import { MetAdapter } from "../../../lib/museums/met";
import { RijksmuseumAdapter } from "../../../lib/museums/rijksmuseum";
import { ArticAdapter } from "../../../lib/museums/artic";
import { SmithsonianAdapter } from "../../../lib/museums/smithsonian";

const limiter = new SlidingWindowRateLimiter(new UpstashRateLimitStore());

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ state: "ERROR", error: "INVALID_IMAGE" }, { status: 400 });
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const identity = await createRequestIdentity(forwarded, process.env.RATE_LIMIT_HMAC_SECRET ?? "development-only-secret");
  const rate = await limiter.check(identity);
  if (!rate.allowed) {
    return NextResponse.json(
      { state: "ERROR", error: "PROCESSING_FAILED" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds ?? 60) } }
    );
  }

  const result = await identifyImage(
    { file, address: identity },
    {
      cache: new UpstashResultCache(),
      limiter: { check: async () => ({ allowed: true }) },
      vision: new GoogleVisionAdapter(),
      museums: [new MetAdapter(), new RijksmuseumAdapter(), new ArticAdapter(), new SmithsonianAdapter()]
    }
  );

  return NextResponse.json(result, { status: result.state === "ERROR" ? 503 : 200 });
}
