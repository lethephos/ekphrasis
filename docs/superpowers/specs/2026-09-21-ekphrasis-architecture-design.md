# Ekphrasis Architecture Design

## 1. Purpose and constraints

Ekphrasis is a web service that identifies paintings from photos — “Shazam for paintings.”

MVP constraints:
- The interface, result copy, and project documentation are in English.
- The application is a Next.js app deployed on Vercel.
- No authentication, accounts, history, or saved images.
- Uploaded photos are ephemeral and are never stored as user assets.
- GitHub is the source of truth for code and documentation.
- Railway is not part of the architecture.
- An existing external droplet may be used only as optional auxiliary compute for batch CLIP embedding maintenance; the MVP must not depend on it.

## 2. Architecture and component boundaries

Request pipeline:

`Image Intake → Vision → Candidate Extraction → parallel Museum Search → Matching/Scoring → CLIP/Qdrant fallback → Enrichment → Presentation`

### Image Intake
Responsibilities:
- receive upload;
- validate type and size;
- convert HEIC when needed;
- compute SHA-256 from original bytes before expensive processing;
- own the hash-cache boundary;
- create a normalized temporary image;
- delete temporary image data after the entire request lifecycle.

### Recognition
Recognition is a strict sequence:

`Validation / normalization → Google Vision Web Detection → Extract search candidates → parallel Museum Search`

Vision is upstream because museum search depends on search candidates extracted from Vision. Museum adapters run in parallel. Vision is candidate generation, not final identity authority.

### Candidate Matching
Responsibilities:
- normalize museum responses to `ArtworkCandidate`;
- compare title, artist, year, medium, and image similarity;
- apply metadata-aware scoring;
- invoke CLIP + Qdrant fallback if Web Detection does not produce enough candidate evidence;
- apply deterministic ambiguity and canonical-source rules.

### Enrichment
Enrichment runs only for the selected artwork. Wikidata/Wikipedia provide factual context and cannot override museum identity.

### Presentation/API
The public result is provider-independent:

```
IdentificationResult
├── status: match | no_match | error
├── artwork
│   ├── artist
│   ├── title
│   ├── year
│   ├── medium
│   ├── museum
│   └── style
├── context
├── detail
├── related_reading[]
│   ├── title
│   ├── url
│   └── source: "wikipedia"
├── source
├── confidence: low | medium | high
└── diagnostics
```

Source:

```
source
├── institution
├── object_id
├── artwork_url
├── image_url
└── license
    ├── status
    └── details
```

License status is `unknown` when unverifiable and is never invented.

## 3. Candidate model and scoring

All providers normalize to:

```
ArtworkCandidate
├── id
├── source
│   ├── museum
│   ├── object_id
│   ├── url
│   ├── image_url
│   └── license
├── artwork
│   ├── title
│   ├── artist
│   ├── year
│   ├── medium
│   └── museum
├── evidence
│   ├── vision_text_match
│   ├── artist_match
│   ├── title_match
│   ├── date_match
│   ├── medium_match
│   └── image_similarity
└── score
```

Evidence signals have three semantic states:
- `MATCH`: positive;
- `MISMATCH`: negative;
- `UNAVAILABLE`: the field is absent or unavailable and contributes no score.

A missing field is always neutral. For example, a museum candidate without a year has `date_match=UNAVAILABLE`; it is never treated as an automatic mismatch.

Score alone is insufficient for confidence. A confident match requires at least two independent strong positive dimensions and no active strong negative. “Independent” means different evidence dimensions.

If the primary path is insufficient, CLIP/Qdrant is used as fallback. Fallback candidates are merged and subjected to the same evidence gate.

If no candidate passes the evidence gate after fallback, return `NO_MATCH`.

If two different artworks are near-equal, MVP returns one canonical top result with `confidence=medium` and an internal ambiguity diagnostic. MVP does not expose multiple alternatives.

The same artwork appearing in multiple museums may be merged into one canonical artwork with multiple provenance records.

## 4. Data sources and adapters

Primary sources:
- Google Cloud Vision API — Web Detection;
- The Met Collection API;
- Rijksmuseum API;
- Art Institute of Chicago API;
- Smithsonian Open Access API.

Additional/fallback sources:
- Victoria and Albert Museum;
- National Gallery of Art, Washington, DC;
- Cleveland Museum of Art API;
- Harvard Art Museums API;
- Europeana aggregator;
- Wikidata/Wikipedia for facts.

Museum count does not guarantee top-result accuracy. Candidate filtering and matching remain authoritative. Provider-specific request/response formats are isolated behind adapters.

## 5. Canonical source and conflict handling

Flow:

`Evidence-gate-passing candidates → canonical-source selection → presentation`

Canonical source selection is deterministic:
1. only evidence-gate-passing candidates qualify;
2. candidate with more populated required metadata fields (title, artist, year, medium) wins;
3. tie → configured source priority;
4. tie → alphabetical source ID;
5. never arrival order.

Different museum records for the same artwork become provenance records under one canonical artwork.

Conflict normalization distinguishes equivalent variation from substantive contradiction:
- “1889” vs “1890” is substantive;
- “circa 1889” vs “1889” may be equivalent;
- full/middle-name artist variations may be normalization;
- “Starry Night” vs “The Starry Night” is not automatically a conflict.

Only substantive contradictions are surfaced in diagnostics.

## 6. API and request lifecycle

MVP exposes:

`POST /api/identify`

Request: `multipart/form-data` with field `image`.

No authentication, sessions, or history in MVP.

Lifecycle:

`POST /api/identify → Image Intake → SHA-256 cache lookup → HEIC normalization → Vision → candidate extraction → parallel museum searches → normalize → score/gate → CLIP/Qdrant fallback if needed → select/NO_MATCH → enrichment → build result → cache`

Cleanup is not a pipeline stage. Temporary image resources are guaranteed to be released in teardown/finally regardless of match, no-match, or error.

### Hash cache
The cache key is the SHA-256 of original upload bytes. A repeated identical image can bypass Vision/museum work.

The cache stores:

`hash → IdentificationResult`

It never stores the image.

`NO_MATCH` may be cached. `API_UNAVAILABLE` is not cached as a normal identification result. Fully resolved and degraded results are distinct cache classes; degraded results use a shorter TTL.

Exact TTL values and storage implementation remain implementation-planning questions.

## 7. Errors and degraded operation

Public states:

```
MATCH
└── artwork found
    └── confidence: high | medium | low

NO_MATCH
├── reason: insufficient_evidence
├── degraded: false | true
└── unavailable_sources: [...]

ERROR
├── INVALID_IMAGE
├── API_UNAVAILABLE
├── PROCESSING_FAILED
└── UNSUPPORTED_INPUT
```

`NO_MATCH` is not an error.

`degraded=false` means expected/usable sources completed and no candidate passed the evidence gate.

`degraded=true` means partial source failure prevented enough evidence. It must not imply that the artwork is absent from databases.

An individual museum API failure does not automatically fail the request. If remaining sources are sufficient, return a match with degraded diagnostics. If they are insufficient, return degraded `NO_MATCH`.

Vision is critical. If Vision is unavailable and the fallback cannot independently initiate meaningful search, return `API_UNAVAILABLE`.

CLIP/Qdrant and Wikidata/Wikipedia are non-critical. Missing license metadata does not fail identification.

Raw technical errors are not exposed to the UI.

Temporary errors offer retry. Invalid/unsupported input requires a new or corrected file.

Per-source timeout budgets and exact provider-failure classification remain implementation questions.

## 8. Enrichment and provenance

Enrichment flow:

`Selected ArtworkCandidate → Provenance check → Wikidata/Wikipedia enrichment → Fact normalization → Presentation model`

“The Context” contains 2–3 sentences. “The Detail” contains one concrete fact.

Only facts reliably linked to the selected artwork or artist are used. If no reliable facts exist, `context=null` and `detail=null`; the UI may omit those sections.

Enrichment cannot override identity established by museum candidates and matching.

### Style

`artwork.style` is an optional museum-supplied artistic style/movement field, distinct from `artwork.medium`.

The adapter must never infer or classify style from the image, artist, title, medium, period, or other metadata. If the source does not explicitly provide a style/movement value, `style=null`.

For the four primary museum APIs:

| Source | Documented object field | Ekphrasis mapping | Rule |
|---|---|---|---|
| The Met Collection API | `classification` | no style mapping | The documented `classification` describes the artwork/object type (e.g. Paintings), not an artistic movement; no dedicated style/movement field is documented. Set `style=null`. urlThe Met Collection API documentationhttps://metmuseum.github.io/ |
| Rijksmuseum Data Services | object metadata / controlled-vocabulary concepts; search documents `type`, `material`, and `technique` | no style mapping | No dedicated style/movement field is documented in the current object metadata/search documentation. Do not reinterpret classification/type as artistic style. Set `style=null`. urlRijksmuseum Data Services documentationhttps://data.rijksmuseum.nl/docs/ |
| Art Institute of Chicago API | `style_id`, `style_title`, `style_ids`, `style_titles` | `style_title` as the preferred single style value | Use the explicitly supplied preferred style term; if unavailable, set `style=null`. The API separately exposes `classification_title` / `classification_titles`. urlArt Institute of Chicago API documentationhttps://api.artic.edu/docs/ |
| Smithsonian Open Access API | documented descriptive fields include `objectType`, topic, physical description, etc. | no style mapping | No dedicated style/movement field is documented in the available Open Access field documentation. Do not reinterpret `objectType`/classification or topic as artistic style. Set `style=null`. urlSmithsonian Open Access Developer Toolshttps://www.si.edu/openaccess/devtools |

`medium` remains the source-supplied material/technique field. `style` is the separate artistic-direction field; neither replaces the other.

## 9. Frontend and UX

State machine:

`IDLE → SELECTING/UPLOADING → PROCESSING → MATCH | NO_MATCH | ERROR`

Processing covers the entire backend request, including CLIP/Qdrant fallback. The frontend does not expose provider-specific stages or fake “Searching museums…” progress.

Loading copy can be “Identifying your artwork…”

Client-side validation is UX only; server validation is authoritative.

Match result includes:
- The Match;
- the original artwork image, rendered from `source.image_url` supplied directly by the museum source;
- Artist, Year, and Medium provenance labels;
- the museum-supplied Style value when available;
- The Context;
- The Detail;
- The Source;
- confidence.

The Match card must always display the original artwork image using `source.image_url` from the selected museum source. The UI must not substitute an independently discovered image or a generated/reconstructed image.

The Match card must always display `medium` alongside the other provenance labels (Artist, Year, Medium); it is not omitted by default. `medium` represents material/technique, while `style` represents artistic movement/style. They are distinct fields.

The Style label/value is shown only when `artwork.style` is non-null; absence remains neutral and does not trigger an error.

Degraded match copy may explain that some sources were temporarily unavailable.

### Related reading (optional, experimental)

The API may expose an optional `related_reading` array:

```
related_reading[]
├── title
├── url
└── source: "wikipedia"
```

Related reading is derived only from the Wikipedia article already retrieved for enrichment of The Context: the article about the artist, or a separate article about the specific artwork when one exists. It uses the article's `External links` / `Further reading` section and introduces no new external dependency.

Rules:
- include at most 3 links;
- preserve article order; take the first qualifying links and do not rank them by quality;
- exclude social-media domains, commercial shopping/store domains, and pages requiring registration or a subscription;
- if the article is not found or contains no qualifying links, return `related_reading=[]`;
- do not perform fallback web searches for related reading;
- the UI block is titled **Related reading** and is hidden when the array is empty;
- this feature is optional and experimental and does not block Definition of Done;
- it may be disabled or removed after the initial usefulness evaluation.

Degraded no-match copy must not imply that the artwork does not exist in databases.

Error guidance:
- `INVALID_IMAGE`: select another image;
- `UNSUPPORTED_INPUT`: use a supported format;
- `API_UNAVAILABLE`: retry;
- `PROCESSING_FAILED`: retry.

Long fallback processing remains the same processing state.

## 10. Design system

Design direction: **Museum catalog first. Contemporary gallery restraint. Forensic language only for evidence and confidence.**

Three forensic elements exactly:
1. subtle confidence indicator, e.g. “Confidence · High”;
2. small provenance/evidence labels: Artist, Year, Medium;
3. one thin annotation treatment for Source, vertical/side on desktop.

No raw AI score is shown.

Hard no-go:
- crosshairs;
- bounding boxes;
- scanlines;
- grids over artwork;
- coordinates/specimen notation;
- fake measurements;
- glitch effects;
- terminal/HUD styling;
- “AI detected” badges;
- technical score breakdowns;
- decorative arrows/callouts.

Mobile-first requirements:
- large touch targets;
- camera/photo-library friendly upload;
- artwork remains visually prioritized;
- one vertical result column;
- stacked metadata;
- no horizontal scrolling;
- fluid typography and spacing;
- responsive image crop.

The Source annotation uses one semantic component that becomes vertical/side on desktop and horizontal/inline on narrow screens.

## 11. Testing strategy

### Unit tests
Cover:
- validation and normalization;
- candidate normalization;
- evidence semantics;
- scoring and evidence gate;
- strong negatives;
- ambiguity;
- canonical-source selection;
- metadata completeness;
- source priority;
- conflict normalization;
- result construction;
- cache class and TTL behavior.

Critical invariant: missing candidate field = `UNAVAILABLE`, never `MISMATCH`.

Same inputs must produce deterministic results regardless of provider response arrival order.

### Adapter/integration tests
Test Vision, each museum adapter, Qdrant, and Wikidata/Wikipedia for:
- response mapping;
- missing fields;
- provider failures.

Matching tests use mocked provider responses and remain independent of live APIs.

### Pipeline tests
Cover:
- normal match;
- fallback;
- no-match;
- degraded match;
- degraded no-match;
- critical Vision failure;
- cleanup on success;
- cleanup when processing throws.

### Determinism
Randomize museum adapter arrival order and artificial delays. Use fixed seeds and repeated randomized runs. Canonical artwork/source, confidence, and diagnostics must remain unchanged.

### Cache/TTL
Cover:
- miss → generate/cache;
- hit before TTL;
- expiration after TTL;
- fresh processing after expiry;
- separate normal/degraded TTL classes.

Observe externally visible serving behavior rather than relying on cleanup implementation details.

### Frontend
Test all public states and variants, including fallback without a separate state, responsive behavior at mobile/tablet/desktop, upload, result artwork, metadata, Source marker, touch targets, and absence of horizontal overflow.

External APIs are mocked at the application boundary.

## 12. Security, privacy, and operations

### Image privacy
Uploaded photos are ephemeral and are not user assets. Original image data is deleted after the request lifecycle. MVP has no history/gallery.

Avoid unnecessary third-party transmission.

The cache may persist a cryptographic hash and result, never the original image.

### Secrets
Provider credentials live only in server-side environment variables. No `.env` or API keys are committed. `.env.example` contains names/placeholders only. Frontend code never receives provider credentials.

### Input/resource protection
Server-side validation is authoritative for MIME/type, size, decoding, supported formats, and HEIC handling. Do not trust extension or client-provided Content-Type. Individual requests must have bounded resource consumption.

Exact limits beyond the baseline 10 MB input boundary remain an implementation-planning question.

### External API isolation
All external services are accessed through adapters that isolate credentials, request formats, and provider failures.

### Diagnostics
Internal diagnostics may include unavailable sources, degraded status, provider failure class, and ambiguity. User-facing responses never expose secrets, raw provider responses, or internal configuration.

### Request-volume / rate-limiting strategy — OPEN QUESTION
The SHA-256 cache protects against repeated submissions of the same image. It does not protect against many different images.

A separate request-volume protection strategy is therefore required for the unauthenticated MVP and must account for Vercel runtime behavior. The concrete mechanism is intentionally deferred to implementation planning.

## 13. Hosting and deployment

```
Vercel
└── Ekphrasis Next.js app
      ├── Google Vision
      ├── Museum APIs
      ├── Wikidata / Wikipedia
      └── Qdrant (external)
```

Vercel is the deployment/runtime platform. Qdrant is external. Secrets are stored as Vercel environment variables. Uploaded photos remain ephemeral.

The existing external droplet is an optional auxiliary compute escape hatch for batch CLIP embedding generation/maintenance only. It creates no runtime dependency, credential contract, or required request path for the MVP.

Railway is excluded from the architecture.

## 14. Repository structure

```
ekphrasis/
├── app/
│   ├── page.tsx
│   ├── api/
│   │   └── identify/
│   └── ...
├── components/
├── lib/
│   ├── vision/
│   ├── museums/
│   │   ├── met.ts
│   │   ├── rijksmuseum.ts
│   │   ├── artic.ts
│   │   ├── smithsonian.ts
│   │   └── ...
│   ├── matching/
│   ├── wikidata/
│   └── image/
├── data/
├── docs/
│   └── superpowers/
│       └── specs/
├── tests/
├── public/
├── .env.example
├── .gitignore
└── README.md
```

Repository rules:
- significant changes use separate commits with clear descriptions;
- experimental work uses feature branches;
- only tested/working code merges to `main`;
- README stays current with purpose, local setup, APIs, and MVP status;
- never commit `.env` or API keys;
- `.env.example` contains placeholders only.

## 15. Product scope boundaries

MVP excludes:
- authentication;
- accounts;
- history;
- saved images;
- multiple alternative result cards;
- raw AI/technical scores;
- dependence on the external Codex droplet;
- Railway hosting.

Miro is a required project deliverable. Its mind map is in English and includes:
- functionality;
- tech stack;
- data sources/API, one node per API;
- UX flow;
- design system;
- hosting & deployment;
- roadmap MVP → v2.

UX flow in Miro:

`upload → processing → result card → no-match state / error state`

## 16. Open questions for implementation planning

1. Per-source timeout budgets and failure classification.
2. Exact normal/degraded cache TTLs.
3. Concrete cache storage implementation.
4. Exact input/resource limits beyond 10 MB.
5. Concrete request-volume/rate-limiting strategy.
6. Exact CLIP embedding generation, Qdrant indexing, and maintenance workflow.
7. **Low-priority future candidate — Smarthistory integration.** Smarthistory is explicitly not part of the current enrichment architecture or implementation scope. Revisit only as a future candidate if API availability, programmatic-access permissions, and sufficiently reliable artwork-level matching can be confirmed. No scraping or access-restriction bypass is permitted.

## 17. Approval gate

This document is the architectural specification for Ekphrasis. Implementation planning and implementation begin only after the written specification has been reviewed and explicitly approved.
