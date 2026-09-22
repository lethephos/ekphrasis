# Ekphrasis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Ekphrasis MVP described by the approved architecture spec: an ephemeral image-identification service on Next.js/Vercel that combines Google Vision candidate extraction, parallel museum evidence, deterministic matching, CLIP/Qdrant fallback, enrichment, caching, rate limiting, and the English-language result UI.

**Architecture:** The runtime is a deterministic pipeline with explicit adapter boundaries. Vision generates search candidates; museum adapters provide primary evidence; CLIP/Qdrant retrieves additional candidates only when primary evidence is insufficient; all candidates pass the same evidence gate and canonical-selection rules. Redis-compatible caching and request-volume protection sit outside the recognition core, while CLIP index generation is an offline/batch concern.

**Tech Stack:** Next.js App Router, TypeScript, Vercel runtime, Google Cloud Vision Web Detection, The Met Collection API, Rijksmuseum API, Art Institute of Chicago API, Smithsonian Open Access API, Wikidata/Wikipedia, Qdrant, Upstash Redis, Vitest/React Testing Library, and the existing GitHub Pages fixture dashboard.

**Spec:** `docs/superpowers/specs/2026-09-21-ekphrasis-architecture-design.md`

## Global Constraints

- The interface, result copy, and project documentation are in English.
- The application is a Next.js app deployed on Vercel.
- No authentication, accounts, history, or saved images.
- Uploaded photos are ephemeral and are never stored as user assets.
- Railway is not part of the architecture.
- A repeated identical upload is keyed by SHA-256 of the original upload bytes; the cache never stores image bytes.
- Missing candidate fields map to `UNAVAILABLE`, never `MISMATCH`.
- Candidate selection is deterministic and must not depend on provider response arrival order.
- CLIP is candidate retrieval, not an independent identity authority.
- The frontend exposes only `IDLE → SELECTING/UPLOADING → PROCESSING → MATCH | NO_MATCH | ERROR`; it does not expose provider-specific progress.
- The Match card always uses the selected museum source's `source.image_url`.
- `medium` is always shown with Artist and Year; `style` is shown only when explicitly supplied by a museum adapter.
- No raw AI score, crosshairs, bounding boxes, scanlines, grids, fake measurements, glitch/HUD styling, or “AI detected” badge.
- Baseline upload limit is 10 MB plus decoded pixel/dimension protection.
- Provider credentials are server-side only.
- `API_UNAVAILABLE` is not cached as a normal identification result; degraded results use a shorter TTL than normal results.
- `POST /api/identify` is rate-limited before pipeline execution and returns HTTP 429 when rejected.
- Qdrant index maintenance is offline/batch work and the runtime records the index version used.
- Smarthistory is future-only; no scraping or access-control bypass.

## Review Focus

- **Malformed/hostile image:** a file with a valid-looking extension but invalid bytes must fail server-side before provider calls; test MIME sniffing, decoding, and cleanup.
- **Decompression amplification:** a small compressed image that decodes to excessive dimensions must be rejected before Vision; test the pixel/dimension guard.
- **Provider partial failure:** one museum timing out or returning an invalid response must not abort usable remaining sources; test degraded match/no-match semantics and normalized failure classes.
- **Arrival-order nondeterminism:** identical candidate sets delivered in different adapter completion orders must produce identical canonical artwork, confidence, and diagnostics; test randomized delays/order.
- **Cache poisoning/staleness:** a cached degraded result must expire independently of a normal result, while `API_UNAVAILABLE` must not be written as a normal result; test class-aware TTL behavior and cache-key isolation.

---

## File map

The implementation starts from the current fixture-driven GitHub Pages dashboard and adds a focused Next.js runtime without moving provider logic into UI components.

**Create:**
- `package.json` — Next.js/TypeScript scripts and runtime dependencies.
- `tsconfig.json` — strict TypeScript configuration.
- `next.config.ts` — Next.js runtime configuration.
- `app/layout.tsx` — document shell and global metadata.
- `app/page.tsx` — upload/results shell.
- `app/api/identify/route.ts` — multipart HTTP boundary and pipeline invocation.
- `components/upload-form.tsx` — camera/file selection and client-side UX validation.
- `components/processing-state.tsx` — single processing state.
- `components/match-card.tsx` — artwork result and provenance.
- `components/no-match.tsx` — no-match/degraded state.
- `components/error-state.tsx` — public error guidance.
- `components/source-annotation.tsx` — responsive Source annotation.
- `components/related-reading.tsx` — optional related-reading block.
- `lib/types.ts` — canonical domain/result types.
- `lib/errors.ts` — public/internal error and provider-failure types.
- `lib/image/validate.ts` — upload validation and decoded resource guards.
- `lib/image/normalize.ts` — safe internal image normalization, including HEIC/HEIF.
- `lib/cache/cache.ts` — cache interface and result-class TTL policy.
- `lib/cache/upstash.ts` — Upstash Redis implementation.
- `lib/rate-limit/rate-limit.ts` — request-volume interface/policy.
- `lib/rate-limit/upstash.ts` — Upstash-backed implementation.
- `lib/vision/google.ts` — Google Vision adapter.
- `lib/candidates/extract.ts` — Vision candidate extraction.
- `lib/museums/types.ts` — museum adapter contract.
- `lib/museums/met.ts` — Met adapter.
- `lib/museums/rijksmuseum.ts` — Rijksmuseum adapter.
- `lib/museums/artic.ts` — Art Institute of Chicago adapter.
- `lib/museums/smithsonian.ts` — Smithsonian adapter.
- `lib/museums/search.ts` — parallel museum orchestration.
- `lib/matching/normalize.ts` — title/artist/date/medium normalization.
- `lib/matching/evidence.ts` — evidence state generation.
- `lib/matching/score.ts` — deterministic scoring and strong-positive/negative rules.
- `lib/matching/select.ts` — ambiguity and canonical-source selection.
- `lib/clip/types.ts` — CLIP/Qdrant contracts and index version.
- `lib/clip/qdrant.ts` — Qdrant runtime retrieval adapter.
- `lib/clip/fallback.ts` — fallback candidate integration.
- `lib/enrichment/wikipedia.ts` — Wikipedia retrieval.
- `lib/enrichment/wikidata.ts` — Wikidata facts.
- `lib/enrichment/related-reading.ts` — qualifying links from retrieved Wikipedia article.
- `lib/enrichment/normalize.ts` — Context/Detail normalization.
- `lib/pipeline/identify.ts` — end-to-end deterministic orchestration.
- `lib/pipeline/policy.ts` — timeout/failure/degraded policy.
- `lib/pipeline/cache-policy.ts` — cache class decisions.
- `data/clip/index-version.json` — runtime-visible Qdrant index version metadata.
- `tests/helpers/fixtures.ts` — reusable provider/result fixtures.

**Modify:**
- `README.md` — local setup, environment variables, API, MVP status, deployment notes.
- `.env.example` — server-only provider/cache/rate-limit/Qdrant variable names and placeholders.
- `.gitignore` — ensure local image/temp/build artifacts and secrets stay untracked.
- Existing dashboard files only where needed to keep architecture visualization synchronized with the approved spec.

**Tests:**
- `tests/unit/image/*.test.ts`
- `tests/unit/cache/*.test.ts`
- `tests/unit/rate-limit/*.test.ts`
- `tests/unit/matching/*.test.ts`
- `tests/unit/candidates/*.test.ts`
- `tests/unit/pipeline/*.test.ts`
- `tests/adapters/*.test.ts`
- `tests/api/identify.test.ts`
- `tests/frontend/*.test.tsx`
- `tests/integration/pipeline.test.ts`
- `tests/helpers/fixtures.ts`

---

## Task 1: Bootstrap the Next.js runtime boundary

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Modify: `.gitignore`
- Modify: `.env.example`
- Test: `tests/frontend/smoke.test.tsx`

**Interfaces:**
- Produces the Next.js App Router shell that later tasks fill with typed pipeline services.
- The root page must render without provider credentials and without performing identification during module load.

- [ ] **Step 1: Write the failing smoke test** asserting that the root page renders the English upload surface and no provider call occurs during render.
- [ ] **Step 2: Run the smoke test and confirm the app shell is missing.**
- [ ] **Step 3: Add the minimal Next.js/TypeScript configuration and root layout/page.**
- [ ] **Step 4: Add only the environment variable names required by later tasks; keep all values placeholders.**
- [ ] **Step 5: Run the smoke test and TypeScript check.**
- [ ] **Step 6: Commit `feat: bootstrap Next.js runtime`.**

## Task 2: Define domain contracts and normalized failure semantics

**Files:**
- Create: `lib/types.ts`
- Create: `lib/errors.ts`
- Create: `lib/pipeline/policy.ts`
- Test: `tests/unit/pipeline/policy.test.ts`

**Interfaces:**
- Produces `EvidenceState = MATCH | MISMATCH | UNAVAILABLE`.
- Produces `ProviderFailureClass = TIMEOUT | RATE_LIMITED | AUTH | NOT_FOUND | INVALID_RESPONSE | NETWORK | PROVIDER_ERROR`.
- Produces `IdentificationResult`, `ArtworkCandidate`, `Evidence`, `Diagnostics`, and public error/state unions matching the spec.
- Produces `classifyProviderError(error): ProviderFailureClass` and `decideProviderFailure(context): continue | degrade | fallback | api_unavailable`.

- [ ] **Step 1: Write tests for missing fields, each normalized failure class, and critical vs non-critical provider policy.**
- [ ] **Step 2: Run policy tests and confirm the contracts/functions are absent.**
- [ ] **Step 3: Implement the smallest typed domain model and failure-policy functions.**
- [ ] **Step 4: Assert that raw provider errors never cross the public result boundary.**
- [ ] **Step 5: Run unit tests and TypeScript checks.**
- [ ] **Step 6: Commit `feat: define recognition domain contracts`.**

## Task 3: Implement image validation, normalization, and ephemeral cleanup

**Files:**
- Create: `lib/image/validate.ts`
- Create: `lib/image/normalize.ts`
- Create: `tests/unit/image/validate.test.ts`
- Create: `tests/unit/image/normalize.test.ts`

**Interfaces:**
- Produces `validateUpload(file): ValidatedUpload | InputError`.
- Produces `normalizeImage(upload): NormalizedImage`.
- Enforces 10 MB input ceiling, actual decodability/type checks, decoded pixel/dimension limits, and HEIC/HEIF normalization.
- Returns only temporary normalized data; no persistence API is allowed.

- [ ] **Step 1: Write failing tests for valid JPEG/PNG/WebP, malformed bytes, extension/content-type mismatch, >10 MB input, excessive decoded dimensions, and HEIC/HEIF normalization.**
- [ ] **Step 2: Run image tests and confirm failure.**
- [ ] **Step 3: Implement server-authoritative byte/type/size/decode validation.**
- [ ] **Step 4: Implement bounded normalization and HEIC/HEIF conversion without storing user assets.**
- [ ] **Step 5: Add cleanup tests proving temporary data is released on success and thrown errors.**
- [ ] **Step 6: Run image tests and commit `feat: harden image intake`.**

## Task 4: Add cache abstraction and Upstash Redis implementation

**Files:**
- Create: `lib/cache/cache.ts`
- Create: `lib/cache/upstash.ts`
- Create: `lib/pipeline/cache-policy.ts`
- Create: `tests/unit/cache/cache.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces `ResultCache.get(hash): Promise<IdentificationResult | null>`.
- Produces `ResultCache.set(hash, result): Promise<void>`.
- Produces `cacheClassFor(result): normal | degraded | uncacheable`.
- Uses SHA-256 of original bytes as the only image-derived key.
- Never writes image bytes.
- `NO_MATCH` is cacheable; `API_UNAVAILABLE` is uncacheable; degraded TTL is shorter than normal TTL.

- [ ] **Step 1: Write tests using an in-memory fake cache for hit/miss, expiry class, `NO_MATCH`, and `API_UNAVAILABLE`.**
- [ ] **Step 2: Run cache tests and confirm the abstraction is absent.**
- [ ] **Step 3: Implement the cache policy and provider-neutral interface.**
- [ ] **Step 4: Implement the Upstash Redis adapter with native TTLs and JSON serialization of `IdentificationResult`.**
- [ ] **Step 5: Verify the cache key is computed from original upload bytes before normalization.**
- [ ] **Step 6: Run cache tests and commit `feat: add result cache`.**

## Task 5: Implement request-volume protection

**Files:**
- Create: `lib/rate-limit/rate-limit.ts`
- Create: `lib/rate-limit/upstash.ts`
- Create: `tests/unit/rate-limit/rate-limit.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces `RateLimiter.check(identity): Promise<{ allowed: boolean; retryAfterSeconds?: number }>`.
- Produces a stable request identity from trusted Vercel/runtime request metadata without requiring accounts.
- Returns 429 before pipeline execution when rejected.
- Provider failures do not consume the same user-originated budget as rejected request volume.

- [ ] **Step 1: Write failing tests for allowed requests, threshold rejection, retry metadata, and missing/unstable identity fallback.**
- [ ] **Step 2: Run tests and confirm the rate-limit implementation is absent.**
- [ ] **Step 3: Implement the provider-neutral limiter contract.**
- [ ] **Step 4: Implement the Upstash-backed limiter with the exact algorithm/window/threshold selected during execution from deployment constraints, keeping those values configuration rather than hard-coded business logic.**
- [ ] **Step 5: Test that rejected requests never invoke the recognition pipeline.**
- [ ] **Step 6: Run tests and commit `feat: add request rate limiting`.**

## Task 6: Implement Google Vision candidate extraction

**Files:**
- Create: `lib/vision/google.ts`
- Create: `lib/candidates/extract.ts`
- Create: `tests/adapters/google-vision.test.ts`
- Create: `tests/unit/candidates/extract.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces `VisionAdapter.detect(image): Promise<VisionDetection>`.
- Produces `extractSearchCandidates(detection): SearchCandidate[]`.
- Maps provider failures through `classifyProviderError`.
- Does not declare a final artwork identity.

- [ ] **Step 1: Write mocked Vision response tests for titles, artist names, URLs, empty detection, malformed provider response, timeout, and rate limit.**
- [ ] **Step 2: Run tests and confirm adapter/extractor is absent.**
- [ ] **Step 3: Implement the Google Vision adapter with server-side credentials and per-provider timeout.**
- [ ] **Step 4: Implement candidate extraction without making museum calls from the extractor.**
- [ ] **Step 5: Verify raw Vision responses are not returned to the public API.**
- [ ] **Step 6: Run tests and commit `feat: add Vision candidate extraction`.**

## Task 7: Implement primary museum adapters and parallel search

**Files:**
- Create: `lib/museums/types.ts`
- Create: `lib/museums/met.ts`
- Create: `lib/museums/rijksmuseum.ts`
- Create: `lib/museums/artic.ts`
- Create: `lib/museums/smithsonian.ts`
- Create: `lib/museums/search.ts`
- Create: `tests/adapters/museums.test.ts`
- Create: `tests/unit/candidates/normalization.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces a shared `MuseumAdapter.search(query): Promise<ArtworkCandidate[]>` contract.
- Each adapter maps its own API response into the shared candidate model.
- Each adapter has its own timeout and normalized failure class.
- Museum searches execute concurrently after Vision candidate extraction.
- A failed adapter does not mutate or cancel the results of other adapters.

- [ ] **Step 1: Write adapter fixture tests covering normal records, missing year/medium/style, invalid responses, timeouts, and provider-specific identifiers/images/licenses.**
- [ ] **Step 2: Run adapter tests and confirm failures.**
- [ ] **Step 3: Implement each adapter independently behind the shared contract.**
- [ ] **Step 4: Implement bounded parallel orchestration with per-source timeout isolation.**
- [ ] **Step 5: Assert that missing fields produce `UNAVAILABLE` downstream rather than mismatch.**
- [ ] **Step 6: Run adapter/orchestration tests and commit `feat: add museum search adapters`.**

## Task 8: Implement deterministic matching, evidence, ambiguity, and canonical source selection

**Files:**
- Create: `lib/matching/normalize.ts`
- Create: `lib/matching/evidence.ts`
- Create: `lib/matching/score.ts`
- Create: `lib/matching/select.ts`
- Create: `tests/unit/matching/evidence.test.ts`
- Create: `tests/unit/matching/score.test.ts`
- Create: `tests/unit/matching/select.test.ts`

**Interfaces:**
- Produces normalized title/artist/date/medium comparison values.
- Produces `buildEvidence(candidate, extractedSignals): Evidence`.
- Produces deterministic `scoreCandidates(candidates): ScoredCandidate[]`.
- Produces `selectCanonicalCandidate(candidates, sourcePriority): SelectionResult`.
- Missing candidate fields are neutral.
- Strong match requires two independent strong positives and no active strong negative.
- Near-equal different artworks produce one canonical result with medium confidence and internal ambiguity diagnostics.
- Tie resolution never uses arrival order.

- [ ] **Step 1: Write tests for exact matches, equivalent title/artist/date variations, substantive date conflict, missing year, missing style, strong negatives, insufficient evidence, near-equal ambiguity, and source metadata completeness ties.**
- [ ] **Step 2: Run matching tests and confirm failures.**
- [ ] **Step 3: Implement normalization rules explicitly listed in the spec.**
- [ ] **Step 4: Implement evidence states and scoring with deterministic ordering.**
- [ ] **Step 5: Implement canonical-source tie breakers: metadata completeness, configured source priority, then alphabetical source ID.**
- [ ] **Step 6: Randomize candidate arrival order in tests and assert identical outputs.**
- [ ] **Step 7: Run all matching tests and commit `feat: add deterministic artwork matching`.**

## Task 9: Add CLIP/Qdrant fallback and versioned index contract

**Files:**
- Create: `lib/clip/types.ts`
- Create: `lib/clip/qdrant.ts`
- Create: `lib/clip/fallback.ts`
- Create: `data/clip/index-version.json`
- Create: `tests/adapters/qdrant.test.ts`
- Create: `tests/unit/pipeline/clip-fallback.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces `ClipIndex { version: string }`.
- Produces `QdrantAdapter.search(image): Promise<ClipCandidateRef[]>`.
- Produces `retrieveFallbackCandidates(image, indexVersion): Promise<ArtworkCandidate[]>`.
- Qdrant candidates are only candidate references; they must be hydrated/merged with museum metadata and pass the same evidence gate.
- Runtime never generates the complete museum embedding index.
- Index version is attached to internal diagnostics.

- [ ] **Step 1: Write mocked Qdrant tests for candidate IDs, empty search, unavailable Qdrant, and index-version mismatch.**
- [ ] **Step 2: Run tests and confirm failures.**
- [ ] **Step 3: Implement the Qdrant adapter and index-version contract.**
- [ ] **Step 4: Implement fallback integration so CLIP only runs when primary evidence is insufficient.**
- [ ] **Step 5: Assert fallback candidates use the same evidence gate and canonical selection logic.**
- [ ] **Step 6: Run fallback tests and commit `feat: add CLIP Qdrant fallback`.**

## Task 10: Implement enrichment and related reading

**Files:**
- Create: `lib/enrichment/wikipedia.ts`
- Create: `lib/enrichment/wikidata.ts`
- Create: `lib/enrichment/related-reading.ts`
- Create: `lib/enrichment/normalize.ts`
- Create: `tests/adapters/enrichment.test.ts`
- Create: `tests/unit/enrichment/related-reading.test.ts`
- Create: `tests/unit/enrichment/normalize.test.ts`

**Interfaces:**
- Produces `enrichArtwork(candidate): Promise<EnrichmentData>`.
- Produces `extractRelatedReading(article): RelatedReading[]` with max 3 qualifying links in article order.
- Produces normalized 2–3 sentence Context and one concrete Detail or null.
- Enrichment cannot override museum identity.
- Missing enrichment is non-critical.

- [ ] **Step 1: Write mocked enrichment tests for linked artwork/artist facts, no reliable facts, article external links, and excluded commercial/social/subscription links.**
- [ ] **Step 2: Run tests and confirm failures.**
- [ ] **Step 3: Implement Wikipedia/Wikidata retrieval behind adapters and provider timeouts.**
- [ ] **Step 4: Implement fact normalization and related-reading extraction without fallback web search.**
- [ ] **Step 5: Assert enrichment failures leave the selected artwork intact.**
- [ ] **Step 6: Run enrichment tests and commit `feat: add artwork enrichment`.**

## Task 11: Compose the recognition pipeline and public API

**Files:**
- Create: `lib/pipeline/identify.ts`
- Create: `app/api/identify/route.ts`
- Create: `tests/unit/pipeline/identify.test.ts`
- Create: `tests/integration/pipeline.test.ts`
- Create: `tests/api/identify.test.ts`

**Interfaces:**
- Produces `identifyImage(requestContext): Promise<IdentificationResult>`.
- Pipeline order is exactly: validation/normalization → original-byte SHA-256 cache → Vision → candidate extraction → parallel museum search → evidence gate → CLIP/Qdrant fallback when needed → canonical selection/NO_MATCH → enrichment → result build → cache.
- Cleanup occurs in `finally`.
- Public HTTP response maps `MATCH`, `NO_MATCH`, and `ERROR` without raw provider errors.

- [ ] **Step 1: Write failing pipeline tests for cache hit, normal match, degraded match, degraded no-match, fallback, critical Vision failure, invalid image, API unavailable, and cleanup on thrown error.**
- [ ] **Step 2: Run pipeline tests and confirm failures.**
- [ ] **Step 3: Implement the pipeline as orchestration only; keep provider-specific code in adapters.**
- [ ] **Step 4: Add cache lookup before Vision and cache write only for permitted result classes.**
- [ ] **Step 5: Add fallback invocation only after the primary evidence gate fails.**
- [ ] **Step 6: Add enrichment only after canonical artwork selection.**
- [ ] **Step 7: Wrap all temporary-resource teardown in `finally`.**
- [ ] **Step 8: Implement `POST /api/identify` multipart handling and HTTP 429 before pipeline invocation.**
- [ ] **Step 9: Run unit/integration/API tests and commit `feat: wire identification pipeline`.**

## Task 12: Build the English result UI and responsive design system

**Files:**
- Create/modify: `app/page.tsx`
- Create: `components/upload-form.tsx`
- Create: `components/processing-state.tsx`
- Create: `components/match-card.tsx`
- Create: `components/no-match.tsx`
- Create: `components/error-state.tsx`
- Create: `components/source-annotation.tsx`
- Create: `components/related-reading.tsx`
- Create: `tests/frontend/result-states.test.tsx`
- Create: `tests/frontend/responsive.test.tsx`

**Interfaces:**
- Consumes only `IdentificationResult` and upload callbacks.
- Produces the four public UI branches without provider-specific progress.
- Uses museum `source.image_url` directly.
- Always displays Artist, Year, Medium; conditionally displays Style.
- Shows confidence subtly and Source using one responsive semantic component.

- [ ] **Step 1: Write failing component tests for upload, processing, match, no-match, error, degraded match, medium visibility, conditional style, Source marker, and related reading visibility.**
- [ ] **Step 2: Run frontend tests and confirm failures.**
- [ ] **Step 3: Implement the upload surface with mobile camera/photo-library affordances and client-side validation only as UX.**
- [ ] **Step 4: Implement the processing state with “Identifying your artwork…” and no provider stages.**
- [ ] **Step 5: Implement the Match card with the museum image and provenance labels.**
- [ ] **Step 6: Implement degraded no-match/error guidance and optional Related reading.**
- [ ] **Step 7: Apply the “Museum catalog first. Contemporary gallery restraint.” design constraints and the three allowed forensic elements.**
- [ ] **Step 8: Test mobile/tablet/desktop structure and no horizontal overflow.**
- [ ] **Step 9: Run frontend tests and commit `feat: build Ekphrasis result UI`.**

## Task 13: Synchronize documentation, deployment configuration, and dashboard

**Files:**
- Modify: `README.md`
- Modify: `.env.example`
- Modify: `.gitignore`
- Modify: existing GitHub Pages dashboard files only where they contradict the approved architecture
- Test: repository configuration/CI checks

**Interfaces:**
- README describes actual local setup, environment variables, `POST /api/identify`, Vercel deployment, cache/rate-limit dependencies, and the fixture dashboard.
- Dashboard remains a documentation/demo artifact and never receives provider credentials.

- [ ] **Step 1: Compare README/dashboard wording against the approved spec and identify contradictions.**
- [ ] **Step 2: Update README with concrete local commands, required server-side variables, and deployment notes.**
- [ ] **Step 3: Verify no secrets, local image artifacts, or temporary files are tracked.**
- [ ] **Step 4: Keep GitHub Pages dashboard fixture-driven and synchronize only stale architecture labels/flows.**
- [ ] **Step 5: Run repository/CI checks and commit `docs: synchronize MVP documentation`.**

## Task 14: End-to-end verification and production hardening

**Files:**
- Modify: `tests/integration/pipeline.test.ts`
- Create: `tests/e2e/identify.spec.ts`
- Create: `tests/fixtures/images/*`
- Modify: deployment configuration only where tests expose a real requirement

**Interfaces:**
- Produces a repeatable verification suite for all public states and critical resource/provider failure paths.

- [ ] **Step 1: Add representative image fixtures that are safe to keep in the repository and do not contain user-uploaded personal content.**
- [ ] **Step 2: Run the full unit, adapter, integration, frontend, and API suite.**
- [ ] **Step 3: Run a production build and verify the Next.js app starts without provider credentials for UI-only paths.**
- [ ] **Step 4: Verify a mocked normal match, degraded match, degraded no-match, fallback, invalid image, rate-limited request, and API-unavailable response end-to-end.**
- [ ] **Step 5: Verify cleanup and absence of image persistence in logs/test artifacts.**
- [ ] **Step 6: Verify Vercel environment variable names and server-only access boundaries.**
- [ ] **Step 7: Commit `test: harden MVP verification`.**

## Implementation order

Tasks are intentionally sequenced so each subsystem has a stable contract before the next depends on it:

1. runtime shell
2. domain contracts
3. image intake
4. cache
5. rate limiting
6. Vision
7. museum adapters
8. matching
9. CLIP/Qdrant
10. enrichment
11. pipeline/API
12. UI
13. docs/dashboard
14. end-to-end hardening

No task should bypass the adapter boundaries or introduce provider logic into React components.

## Completion criteria

- `POST /api/identify` accepts a validated multipart image and returns the provider-independent result contract.
- Repeated identical images can be served from SHA-256 result cache without re-running external recognition.
- Missing provider fields remain neutral.
- Museum searches are parallel after Vision candidate extraction.
- Provider failures are isolated and normalized.
- CLIP/Qdrant is fallback-only and passes the same evidence gate.
- Canonical selection is deterministic regardless of response order.
- Enrichment cannot change identity.
- No user image is persisted.
- Rate limiting rejects excessive anonymous requests before recognition starts.
- UI is English, responsive, and follows the approved design system.
- README and dashboard match the implemented architecture.
- Full automated verification passes.

