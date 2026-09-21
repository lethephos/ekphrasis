# Ekphrasis MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Ekphrasis MVP as a Next.js application that accepts a painting photo, identifies a canonical museum artwork through Vision and museum adapters with deterministic evidence gating, enriches the selected result with Wikipedia/Wikidata facts, and renders the specified mobile-first result/no-match/error experience.

**Architecture:** A server-side Next.js pipeline owns image validation, hashing/cache, Google Vision candidate generation, parallel primary museum adapters, normalization/scoring/canonical-source selection, CLIP/Qdrant fallback, enrichment, and result construction. The frontend is provider-independent and consumes only `IdentificationResult`; all external APIs remain behind adapters and secrets remain server-side. The repository currently contains only the approved architecture spec, so implementation begins with the application scaffold and test harness before building the pipeline.

**Tech Stack:** Next.js App Router + TypeScript; React; Vitest for unit/integration/pipeline tests; Playwright for browser tests; Google Cloud Vision Web Detection; The Met Collection API; Rijksmuseum API; Art Institute of Chicago API; Smithsonian Open Access API; Wikidata/Wikipedia; Qdrant; Upstash Redis-compatible cache/rate-limit service; Vercel runtime. CLIP corpus generation/index maintenance is an offline batch workflow and is not a request-time dependency.

**Spec:** `docs/superpowers/specs/2026-09-21-ekphrasis-architecture-design.md`

## Global Constraints

- MVP endpoint is `POST /api/identify` with `multipart/form-data` field `image`.
- SHA-256 is computed from original upload bytes before expensive processing.
- The hash cache stores `hash → IdentificationResult`, never image bytes.
- Recognition order is `Validation / normalization → Google Vision Web Detection → Extract search candidates → parallel Museum Search`.
- Museum adapters normalize into `ArtworkCandidate`.
- Missing candidate fields are `UNAVAILABLE`, never `MISMATCH`, and contribute no score.
- A confident match requires at least two independent strong positive dimensions and no active strong negative.
- CLIP/Qdrant is fallback only when the primary path is insufficient.
- Canonical selection is deterministic and never depends on provider arrival order.
- Enrichment cannot override museum-established identity.
- `artwork.style` is museum-supplied only; never infer style from image, artist, title, medium, period, or other metadata.
- `artwork.medium` and `artwork.style` are distinct fields.
- The Match card always renders the selected museum's `source.image_url`.
- The Match card always shows Artist, Year, and Medium labels; Style is shown only when non-null.
- Related reading is optional, Wikipedia-derived only, maximum three links, article order preserved, with no fallback search.
- Uploaded photos are ephemeral; original image data is deleted after the request lifecycle.
- Provider credentials exist only in server-side environment variables; no `.env` or API keys are committed.
- Railway is excluded; Vercel is the runtime/deployment platform and Qdrant is external.
- MVP excludes auth, accounts, history, saved images, multiple alternatives, raw AI scores, and runtime dependence on the external batch-embedding compute.
- Significant changes use separate commits with clear descriptions; experimental work uses feature branches.
- README stays current; `.env.example` contains placeholders only.
- The four primary museum adapters are MVP scope. Victoria and Albert Museum, National Gallery of Art, Cleveland Museum of Art, Harvard Art Museums, and Europeana remain explicitly documented future/secondary sources and are not implemented in the MVP.

## Concrete Runtime Decisions

These decisions close the implementation gaps identified during plan audit; they are not left to worker discretion.

| Concern | MVP decision |
|---|---|
| Result cache | Upstash Redis-compatible store; adapter isolated behind `CacheStore` |
| Rate limiting | Upstash Redis-compatible sliding-window limiter at the API boundary; limit by client IP, with a conservative MVP default recorded in `.env.example` and README |
| Provider timeout | `AbortController` with 5s Vision timeout, 4s per museum-adapter timeout, 6s Qdrant timeout, 5s Wikidata/Wikipedia timeout |
| HEIC | Normalize through a dedicated HEIC conversion adapter; keep conversion isolated so runtime implementation can be swapped without changing the pipeline |
| Runtime image processing | `sharp` for ordinary image decoding/normalization; HEIC conversion remains behind the dedicated adapter |
| Qdrant runtime | Read-only query path from Vercel; no runtime writes or collection mutation |
| Qdrant corpus | Offline generated from the four primary museum catalogs; each point stores embedding plus museum/object identity and source image provenance |
| CLIP model | One pinned CLIP model/version for both corpus generation and query embeddings; exact model identifier is recorded in the index manifest and README before ingestion |
| Corpus refresh | Explicit offline batch command; generate a new versioned collection, validate counts/sample queries, then promote the collection alias |
| External compute | Optional droplet/local batch worker may generate embeddings; no request-time dependency |
| Primary museum scope | Four adapters only for MVP; additional museum sources are future work |

The exact numeric rate limit is chosen during Task 4 as part of the implementation decision record, then committed to configuration/README; the worker may not choose a different backend.

## Review Focus

1. **Missing museum metadata:** an absent year/medium/style must remain neutral rather than becoming a mismatch; adapter tests must assert `UNAVAILABLE`/null behavior.
2. **Canonical determinism:** identical candidates returned in different provider arrival orders must produce the same canonical artwork, source, confidence, and diagnostics; randomized-delay tests must own this requirement.
3. **Image provenance:** the UI must use the selected museum's `source.image_url`, never a generated or independently discovered replacement; browser/component tests must assert the rendered URL.
4. **Degraded operation:** partial museum failure must not automatically fail the request, while critical Vision failure must produce the specified public error when fallback cannot independently initiate meaningful search; pipeline tests must cover both.
5. **Ephemeral image lifecycle:** original upload bytes and normalized temporary files must be cleaned up on success and exceptions; cleanup tests must cover both paths.
6. **Fallback corpus availability:** Qdrant fallback must be backed by a populated, versioned corpus before the fallback path is considered complete. Tests must prove query payloads resolve to real museum/object identities from the indexed corpus.
7. **Scope integrity:** secondary museum APIs are documented but not silently omitted; MVP implementation and README must explicitly state the four-source boundary.
8. **Execution reproducibility:** runtime choices in this plan are fixed before coding; workers must not substitute infrastructure or provider patterns without a separate plan/spec change.

---

### Task 1: Bootstrap the Next.js application and repository guardrails

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `README.md`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `tests/smoke/app.test.ts`

**Interfaces:**
- Produces a runnable Next.js app and test commands used by all later tasks.

- [ ] **Step 1: Write the failing smoke test** asserting the app exposes a page and the test runner is configured.
- [ ] **Step 2: Run the smoke test** and verify it fails because the application scaffold does not exist.
- [ ] **Step 3: Create the Next.js/TypeScript scaffold** with App Router, a minimal English upload page, test configuration, strict TypeScript, and repository hygiene files.
- [ ] **Step 4: Add `.env.example` names/placeholders** for Vision, museum APIs, Wikidata/Wikipedia, Qdrant, Upstash Redis, and rate-limit configuration without secret values.
- [ ] **Step 5: Update README** with purpose, local setup, current API contract, external dependencies, primary/future source boundary, and MVP status.
- [ ] **Step 6: Run unit and build smoke tests** and verify the clean scaffold passes.
- [ ] **Step 7: Commit** `chore: bootstrap Ekphrasis Next.js app`.

---

### Task 2: Define domain models and public result contracts

**Files:**
- Create: `lib/domain/models.ts`
- Create: `lib/domain/result.ts`
- Create: `tests/domain/models.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: none.
- Produces: `ArtworkCandidate`, `IdentificationResult`, `SourceProvenance`, evidence enums, diagnostics, and related-reading types consumed by adapters, matching, enrichment, API, and UI.

- [ ] **Step 1: Write failing tests** for exact fields in `ArtworkCandidate` and `IdentificationResult`, including `artwork.style` and optional `related_reading[]`.
- [ ] **Step 2: Run the tests** and verify the types/contracts are absent.
- [ ] **Step 3: Implement the TypeScript domain models** with explicit nullable/optional semantics for missing provider facts.
- [ ] **Step 4: Encode evidence states** as `MATCH | MISMATCH | UNAVAILABLE`; ensure absent source fields can only map to `UNAVAILABLE`.
- [ ] **Step 5: Add result/error types** for `MATCH`, `NO_MATCH`, and `ERROR` with the specified public error codes.
- [ ] **Step 6: Run the domain tests and typecheck**.
- [ ] **Step 7: Commit** `feat: define Ekphrasis domain contracts`.

---

### Task 3: Implement image intake, validation, normalization, hashing, and cleanup

**Files:**
- Create: `lib/image/validate.ts`
- Create: `lib/image/normalize.ts`
- Create: `lib/image/hash.ts`
- Create: `lib/image/lifecycle.ts`
- Create: `lib/image/heic.ts`
- Create: `tests/image/validate.test.ts`
- Create: `tests/image/lifecycle.test.ts`
- Create: `tests/image/heic.test.ts`

**Interfaces:**
- Consumes: multipart upload bytes.
- Produces: validated normalized image resource plus original-byte SHA-256 and guaranteed cleanup hooks.

- [ ] **Step 1: Write failing tests** for MIME/type validation, the 10 MB baseline boundary, unsupported input, SHA-256 over original bytes, HEIC normalization, and cleanup on both success and thrown processing.
- [ ] **Step 2: Run the tests** and verify they fail.
- [ ] **Step 3: Implement authoritative server-side validation** that does not trust filename extensions or client Content-Type.
- [ ] **Step 4: Implement original-byte SHA-256** before normalization/expensive processing.
- [ ] **Step 5: Implement ordinary image decoding/normalization with `sharp` and HEIC conversion behind the dedicated `heic.ts` adapter**; keep the conversion library isolated from the rest of the pipeline.
- [ ] **Step 6: Add explicit conversion-failure classification as `UNSUPPORTED_INPUT` when the file cannot be normalized safely**.
- [ ] **Step 7: Implement request-lifecycle cleanup** so original/temporary image resources are released in `finally` regardless of outcome.
- [ ] **Step 8: Run focused image tests and typecheck**.
- [ ] **Step 9: Commit** `feat: add secure image intake lifecycle`.

---

### Task 4: Implement cache and unauthenticated request protection

**Files:**
- Create: `lib/cache/types.ts`
- Create: `lib/cache/store.ts`
- Create: `lib/cache/policy.ts`
- Create: `lib/security/rate-limit.ts`
- Create: `tests/cache/cache.test.ts`
- Create: `tests/security/rate-limit.test.ts`

**Interfaces:**
- Consumes: SHA-256 keys and `IdentificationResult`.
- Produces: normal/degraded cache classes, TTL behavior, cache lookup/store, and a request-volume guard suitable for the Vercel runtime.

- [ ] **Step 1: Write failing tests** for cache miss/hit/expiry, separate normal/degraded TTL classes, `NO_MATCH` caching, and `API_UNAVAILABLE` exclusion.
- [ ] **Step 2: Write failing rate-limit tests** proving repeated different-image requests are independently limited rather than relying on the SHA-256 cache.
- [ ] **Step 3: Lock the concrete infrastructure** to Upstash Redis-compatible storage plus a sliding-window limiter; use a single environment-configured limit and fixed normal/degraded TTLs defined in the implementation decision record and README.
- [ ] **Step 4: Implement the cache interface** so the rest of the pipeline is independent of the storage backend.
- [ ] **Step 5: Implement rate limiting** at the API boundary without introducing authentication or user accounts.
- [ ] **Step 6: Run cache/security tests** including a mocked provider-independent limiter failure path that fails closed for request admission.
- [ ] **Step 7: Commit** `feat: add result cache and request protection`.

---

### Task 5: Build Google Vision candidate generation

**Files:**
- Create: `lib/vision/client.ts`
- Create: `lib/vision/web-detection.ts`
- Create: `lib/vision/types.ts`
- Create: `tests/vision/web-detection.test.ts`

**Interfaces:**
- Consumes: normalized image resource.
- Produces: provider-neutral Vision search candidates for museum queries; provider failures are classified without leaking raw errors.

- [ ] **Step 1: Write failing mocked-response tests** for successful Web Detection, empty candidate evidence, malformed responses, provider failure, and timeout.
- [ ] **Step 2: Run the tests** and verify failure.
- [ ] **Step 3: Implement the server-side Vision client** using environment credentials and a narrow adapter boundary.
- [ ] **Step 4: Normalize Web Detection output** into the candidate-query representation used by museum adapters.
- [ ] **Step 5: Apply the fixed 5s request timeout** and classify timeout separately from malformed-provider responses while mapping both to the public degraded/error model.
- [ ] **Step 6: Implement failure classification** so Vision is critical while raw provider errors stay internal.
- [ ] **Step 7: Run adapter tests**.
- [ ] **Step 8: Commit** `feat: add Google Vision candidate generation`.

---

### Task 6: Implement the four primary museum adapters

**Files:**
- Create: `lib/museums/types.ts`
- Create: `lib/museums/met.ts`
- Create: `lib/museums/rijksmuseum.ts`
- Create: `lib/museums/artic.ts`
- Create: `lib/museums/smithsonian.ts`
- Create: `tests/museums/met.test.ts`
- Create: `tests/museums/rijksmuseum.test.ts`
- Create: `tests/museums/artic.test.ts`
- Create: `tests/museums/smithsonian.test.ts`

**Interfaces:**
- Consumes: normalized Vision search candidates.
- Produces: `ArtworkCandidate[]` with source provenance and evidence-ready artwork metadata.

- [ ] **Step 1: Write fixture-driven failing tests** for each provider's documented response shape, including absent fields and provider errors.
- [ ] **Step 2: Assert the Met `classification` is not mapped to style** and missing style yields `style=null`.
- [ ] **Step 3: Assert Rijksmuseum `type/material/technique` are not reinterpreted as style** and missing style yields `style=null`.
- [ ] **Step 4: Assert Art Institute `style_title` is mapped to `artwork.style` and missing style is null**, while classification remains separate.
- [ ] **Step 5: Assert Smithsonian descriptive object fields are not reinterpreted as style** and missing style yields `style=null`.
- [ ] **Step 6: Implement the four adapters** with source IDs, object IDs, artwork URLs, direct museum image URLs, license metadata, and normalized artwork fields.
- [ ] **Step 7: Apply the fixed 4s per-provider timeout and isolate failures** so one museum cannot block or fail all remaining sources.
- [ ] **Step 8: Run all adapter tests with mocked HTTP boundaries**.
- [ ] **Step 9: Commit** `feat: add primary museum adapters`.

**Scope note:** V&A, National Gallery of Art, Cleveland Museum of Art, Harvard Art Museums, and Europeana are intentionally not adapter tasks in the MVP. Their presence in the architecture spec is future/secondary scope, not an omitted implementation task.

---

### Task 7: Implement deterministic matching, evidence semantics, and canonical source selection

**Files:**
- Create: `lib/matching/evidence.ts`
- Create: `lib/matching/scoring.ts`
- Create: `lib/matching/gate.ts`
- Create: `lib/matching/canonical.ts`
- Create: `tests/matching/evidence.test.ts`
- Create: `tests/matching/scoring.test.ts`
- Create: `tests/matching/canonical.test.ts`

**Interfaces:**
- Consumes: Vision evidence plus `ArtworkCandidate[]`.
- Produces: evidence-gated candidates, deterministic canonical artwork/source, confidence, and ambiguity diagnostics.

- [ ] **Step 1: Write failing tests** for title/artist/year/medium/image evidence and explicit `UNAVAILABLE` semantics.
- [ ] **Step 2: Write failing tests** for strong positives, strong negatives, the two-independent-dimensions confidence rule, and no-match gating.
- [ ] **Step 3: Write failing canonical-selection tests** for metadata completeness, configured source priority, alphabetical source ID, duplicate artwork records, and near-equal ambiguity.
- [ ] **Step 4: Run tests and verify failure.**
- [ ] **Step 5: Implement evidence extraction** without converting absent fields into mismatches.
- [ ] **Step 6: Implement deterministic scoring and evidence gate**.
- [ ] **Step 7: Implement canonical selection and provenance merging** with no dependency on arrival order.
- [ ] **Step 8: Add randomized provider-order/delay tests with fixed seeds** and assert identical outputs across repetitions.
- [ ] **Step 9: Run all matching tests**.
- [ ] **Step 10: Commit** `feat: add deterministic artwork matching`.

---

### Task 8: Build and populate the CLIP/Qdrant fallback corpus

**Files:**
- Create: `lib/embeddings/clip.ts`
- Create: `lib/qdrant/client.ts`
- Create: `lib/qdrant/schema.ts`
- Create: `lib/matching/fallback.ts`
- Create: `scripts/qdrant/export-catalog.ts`
- Create: `scripts/qdrant/build-index.ts`
- Create: `scripts/qdrant/validate-index.ts`
- Create: `data/qdrant/README.md`
- Create: `tests/qdrant/schema.test.ts`
- Create: `tests/matching/fallback.test.ts`
- Create: `tests/qdrant/index-manifest.test.ts`

**Interfaces:**
- Runtime consumes: normalized upload image and an insufficient primary-path result.
- Runtime produces: additional `ArtworkCandidate[]` that re-enter the same evidence gate and canonical-selection logic.
- Offline indexing consumes: normalized museum catalog records plus their museum-provided `image_url` values.
- Offline indexing produces: a versioned Qdrant collection and manifest mapping vector points to museum/object identity and source provenance.

- [ ] **Step 1: Write failing schema tests** for vector dimensions, required payload fields (`museum`, `object_id`, title/artist metadata, `image_url`, artwork URL, license), collection version, and source identity.
- [ ] **Step 2: Write failing fallback tests** proving runtime queries return provider-neutral candidates whose identity can be resolved back to museum/object IDs.
- [ ] **Step 3: Define the Qdrant payload and collection schema** and pin one CLIP model/version; record the model identifier and vector dimension in the index manifest.
- [ ] **Step 4: Implement `export-catalog.ts`** to fetch the four primary museum catalogs through the same normalized adapter contracts, deduplicate by museum/object ID, reject records without usable source image URLs, and emit a reproducible manifest.
- [ ] **Step 5: Implement `build-index.ts`** as an offline batch process: download source museum images, generate CLIP embeddings with the pinned model, batch-upsert points into a new versioned Qdrant collection, and write the collection manifest. Do not write embeddings from the Vercel request path.
- [ ] **Step 6: Implement `validate-index.ts`** to verify expected point counts, payload completeness, embedding dimension, duplicate identity rate, and a fixed smoke-query set before promotion.
- [ ] **Step 7: Define collection promotion**: build a new versioned collection, validate it, then update one configured active-collection alias/config value; never mutate the live collection in place during a rebuild.
- [ ] **Step 8: Implement the runtime Qdrant client as read-only** with the fixed 6s timeout and no collection creation/indexing permissions.
- [ ] **Step 9: Implement fallback candidate conversion** so every Qdrant hit resolves to a real museum/object identity and then re-enters the existing evidence gate.
- [ ] **Step 10: Document the first corpus build and refresh procedure** in `data/qdrant/README.md`, including source image provenance/licensing checks and the fact that the optional external droplet is batch-only.
- [ ] **Step 11: Run schema, manifest, mocked-runtime, and index-validation tests**.
- [ ] **Step 12: Commit** `feat: add populated CLIP Qdrant fallback corpus workflow`.

**Definition of completion:** The fallback is not considered implemented until a validated Qdrant corpus exists for the pinned four-source catalog snapshot and a smoke query returns resolvable museum/object identities. If live provider access is unavailable during coding, the code/tests may be completed with fixtures, but the deployment gate remains blocked until the first real corpus is built and validated.

---

### Task 9: Implement Wikipedia/Wikidata enrichment and optional related reading

**Files:**
- Create: `lib/wikidata/client.ts`
- Create: `lib/wikipedia/client.ts`
- Create: `lib/enrichment/context.ts`
- Create: `lib/enrichment/related-reading.ts`
- Create: `tests/enrichment/context.test.ts`
- Create: `tests/enrichment/related-reading.test.ts`

**Interfaces:**
- Consumes: selected canonical museum artwork/artist.
- Produces: factual `context`, `detail`, and optional `related_reading[]` without changing identity.

- [ ] **Step 1: Write failing enrichment tests** for linked artist/artwork articles, missing articles, unreliable/unlinked facts, and timeout.
- [ ] **Step 2: Write failing related-reading tests** for External links/Further reading, maximum three links, article order, domain exclusions, and empty-array behavior.
- [ ] **Step 3: Implement Wikidata/Wikipedia retrieval using the existing enrichment dependency path**.
- [ ] **Step 4: Normalize only facts reliably linked to the selected artwork or artist** and return null context/detail when no reliable facts exist.
- [ ] **Step 5: Apply the fixed 5s enrichment timeout** and treat timeout as non-critical, returning null enrichment rather than failing identification.
- [ ] **Step 6: Extract the first qualifying External links/Further reading links in article order**; never rank or search externally as fallback.
- [ ] **Step 7: Run enrichment tests with mocked provider responses**.
- [ ] **Step 8: Commit** `feat: add factual enrichment and related reading`.

---

### Task 10: Assemble the identification pipeline and API route

**Files:**
- Create: `lib/pipeline/identify.ts`
- Create: `lib/pipeline/errors.ts`
- Create: `app/api/identify/route.ts`
- Create: `tests/pipeline/identify.test.ts`
- Create: `tests/api/identify.test.ts`

**Interfaces:**
- Consumes: multipart image request.
- Produces: public `IdentificationResult` and the specified HTTP response behavior.

- [ ] **Step 1: Write failing pipeline tests** for normal match, fallback, no-match, degraded match, degraded no-match, critical Vision failure, cache hit, rate-limit rejection, provider timeouts, and cleanup on success/error.
- [ ] **Step 2: Write failing API tests** for invalid image, unsupported input, provider unavailability, processing failure, rate limiting, and valid multipart requests.
- [ ] **Step 3: Implement the exact lifecycle** `POST /api/identify → Image Intake → SHA-256 cache lookup → HEIC normalization → Vision → candidate extraction → parallel museum searches → normalize → score/gate → fallback if needed → select/NO_MATCH → enrichment → build result → cache`.
- [ ] **Step 4: Enforce the fixed timeout boundaries** without allowing a slow secondary provider to stall the whole request.
- [ ] **Step 5: Ensure individual museum failure can degrade the request** while Vision remains critical according to the spec.
- [ ] **Step 6: Ensure `API_UNAVAILABLE` is not cached as a normal identification result** and degraded results use their separate cache class.
- [ ] **Step 7: Ensure all image cleanup happens in teardown/finally**.
- [ ] **Step 8: Run pipeline/API tests and typecheck**.
- [ ] **Step 9: Commit** `feat: expose artwork identification API`.

---

### Task 11: Build the mobile-first result UI and all public states

**Files:**
- Create: `components/upload/uploader.tsx`
- Create: `components/results/match-card.tsx`
- Create: `components/results/context.tsx`
- Create: `components/results/detail.tsx`
- Create: `components/results/source.tsx`
- Create: `components/results/related-reading.tsx`
- Create: `components/results/no-match.tsx`
- Create: `components/results/error-state.tsx`
- Create: `components/results/processing.tsx`
- Modify: `app/page.tsx`
- Create: `tests/ui/result-components.test.tsx`
- Create: `tests/ui/page.spec.ts`

**Interfaces:**
- Consumes: public `IdentificationResult`.
- Produces: IDLE, upload, PROCESSING, MATCH, NO_MATCH, and ERROR UI with no provider-specific internals.

- [ ] **Step 1: Write failing component/browser tests** for upload, processing, match, no-match, and all four error codes.
- [ ] **Step 2: Write assertions** that Match always uses `source.image_url`, always shows Artist/Year/Medium, conditionally shows Style, and hides Related reading when empty.
- [ ] **Step 3: Implement the Museum-catalog-first visual hierarchy** with exactly the specified forensic elements and none of the prohibited HUD/crosshair/score treatments.
- [ ] **Step 4: Implement mobile-first responsive layout** with large touch targets, stacked metadata, fluid typography, responsive image crop, and no horizontal scrolling.
- [ ] **Step 5: Implement Source as one semantic component** that changes orientation responsively.
- [ ] **Step 6: Implement the optional Related reading block** with the neutral title and no fallback behavior.
- [ ] **Step 7: Run component and browser tests at mobile/tablet/desktop widths** and verify no horizontal overflow.
- [ ] **Step 8: Commit** `feat: build Ekphrasis result experience`.

---

### Task 12: Create the English Miro architecture map before deployment hardening

**Files:**
- Create/update: Miro mind map through the connected Miro integration
- Modify: `README.md`

**Interfaces:**
- Consumes: approved architecture spec and implementation decisions from Tasks 1–11.
- Produces: the required English Miro architecture/mind map.

- [ ] **Step 1: Create/update the Miro mind map before deployment work begins**, preserving the original project requirement that Miro is an early architectural deliverable.
- [ ] **Step 2: Include functionality, tech stack, one node per API/data source, UX flow, design system, hosting/deployment, and MVP → v2 roadmap.**
- [ ] **Step 3: Explicitly distinguish MVP primary sources from future/secondary museum sources and show the CLIP/Qdrant offline corpus-maintenance path.**
- [ ] **Step 4: Verify all Miro copy is English and that the UX flow is `upload → processing → result card → no-match state / error state`.**
- [ ] **Step 5: Commit** `docs: add Ekphrasis architecture mind map`.

---

### Task 13: Add end-to-end verification and deployment configuration

**Files:**
- Create: `tests/e2e/identify.spec.ts`
- Create: `vercel.json` only if required by the selected runtime configuration
- Modify: `README.md`
- Modify: `.env.example`

**Interfaces:**
- Consumes: complete API, frontend, Miro deliverable, and validated Qdrant corpus.
- Produces: verified MVP flow, deployment configuration, and current documentation.

- [ ] **Step 1: Add mocked end-to-end fixtures** for match, degraded match, no-match, and error paths so tests do not depend on live external APIs.
- [ ] **Step 2: Run the complete unit, adapter, pipeline, component, and browser test suites**.
- [ ] **Step 3: Run a production build** and fix only verified failures.
- [ ] **Step 4: Verify environment handling** so no provider credential reaches client bundles and no secret appears in tracked files.
- [ ] **Step 5: Verify the Qdrant corpus promotion target and active collection configuration** before deployment.
- [ ] **Step 6: Update README** with the actual local setup, API contract, provider list, primary/future source boundary, cache/rate-limit decisions, Qdrant corpus build/refresh procedure, test commands, and MVP status.
- [ ] **Step 7: Verify the deployed app's browser flow** against the public states, image provenance requirement, rate limiting, and fallback path.
- [ ] **Step 8: Commit** `docs: finalize MVP setup and deployment verification`.

---

## Plan Self-Review

### Spec coverage
- Sections 1–2: Tasks 1, 10, 11.
- Section 3: Task 2 plus Tasks 6, 9, 11.
- Section 4: Tasks 5–8; the four primary museum APIs are implemented in MVP, while additional/fallback sources are explicitly deferred.
- Section 5: Task 7.
- Section 6: Tasks 3, 4, 10.
- Section 7: Task 10 plus Task 11.
- Section 8: Task 9 and the style constraints in Task 6/11.
- Section 9: Task 11.
- Section 10: Task 11.
- Section 11: Tasks 2–11 plus Task 13.
- Section 12: Tasks 3, 4, 5, 6, 8, 10, 13.
- Section 13: Task 13 plus Task 12.
- Section 14: Task 1 and the implementation files in later tasks.
- Section 15: Task 12; Miro is intentionally moved earlier than deployment hardening.
- Section 16: the implementation choices identified as execution-risk are resolved in the plan; Smarthistory remains future scope in the spec.
- Section 17: written-spec approval has already been received before this plan.

### Audit fixes applied
- **Qdrant population gap:** added a complete offline corpus export/build/validate/promotion workflow, manifest/schema tests, and a deployment gate requiring a real validated corpus.
- **Unresolved infrastructure drift:** fixed cache/rate-limit backend, provider timeout budgets, image-processing boundary, read-only runtime Qdrant behavior, pinned CLIP/index versioning, and corpus refresh procedure.
- **Execution abstraction:** added concrete files, interfaces, tests, timeout behavior, failure boundaries, and promotion criteria to the highest-risk tasks.
- **Secondary museum scope:** explicitly documented the four-source MVP boundary and future/secondary sources rather than silently omitting them.
- **Miro sequencing:** moved Miro to an explicit pre-deployment task so the architecture deliverable is produced before final hardening/deployment.
- **Style consistency:** made `artwork.style` explicit in the global contract and review focus and kept it present in domain, adapter, matching, and UI tasks.

### Placeholder scan
No critical infrastructure choice is left as an unspecified worker decision. The only intentionally parameterized value is the conservative numeric request-rate limit, which is recorded as a configuration decision during Task 4 rather than chosen ad hoc by an implementer.

### Type/interface consistency
The plan establishes domain types in Task 2 before adapter, matching, enrichment, pipeline, and UI consumers. The Qdrant runtime and offline indexer share an explicit schema/manifest contract. Each later task consumes the named interfaces and returns the specified result shapes.

### Review-focus coverage
- Missing metadata → Task 6 adapter tests + Task 7 evidence tests.
- Arrival-order determinism → Task 7 randomized-order tests.
- Museum image provenance → Task 11 UI tests.
- Degraded operation → Task 10 pipeline tests.
- Cleanup → Task 3 lifecycle tests + Task 10 pipeline tests.
- Qdrant population → Task 8 corpus build/validation + Task 13 deployment gate.

### Repository reality check
The repository currently contains the approved architecture spec and this implementation plan; no application scaffold, package manifest, or test suite exists yet. Therefore the first implementation task is intentionally repository bootstrap rather than assuming nonexistent files.

### Execution boundary
This plan does not implement application code. It is the approved-spec-to-code roadmap and must be reviewed before implementation begins.
