# GitHub Pages Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished, static GitHub Pages demo of Ekphrasis that makes the identification pipeline, museum evidence, matching logic, fallback path, and final result understandable at a glance.

**Architecture:** A dependency-free static site under `site/` uses semantic HTML, CSS, and ES modules with local fixture data. The UI models a realistic identification run without exposing secrets or requiring a backend, while keeping the data shape close to the planned `POST /api/identify` response so the demo can later switch to the real API without redesigning the surface.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript (ES modules), local JSON fixtures, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-21-ekphrasis-architecture-design.md`

## Global Constraints

- All user-facing UI, result copy, and dashboard labels are in English.
- The MVP pipeline is `Image Intake → Vision → Candidate Extraction → parallel Museum Search → Matching/Scoring → CLIP/Qdrant fallback → Enrichment → Presentation`.
- Missing candidate metadata is neutral and does not become an automatic mismatch.
- Matching evidence uses `MATCH | MISMATCH | UNAVAILABLE`.
- Museum image provenance remains the original museum `source.image_url`.
- Style is museum-supplied only; it is never inferred.
- The dashboard is demo-only and makes no unauthenticated museum, Vision, Wikidata, Wikipedia, CLIP, or Qdrant calls.
- No API keys, secrets, or `.env` files are added.
- GitHub Pages must work as a static site without a Node runtime.
- The dashboard must have a clear path to replacing fixtures with `/api/identify` later.

## Review Focus

- Missing metadata: evidence must visibly show `UNAVAILABLE` rather than `MISMATCH`.
- Parallel museum search: the four primary museums must appear as parallel providers, not as a serial waterfall.
- Low-confidence fallback: CLIP + Qdrant must be represented as a conditional fallback, not as another always-on provider.
- Provenance: the displayed artwork image must be identified as museum-sourced, not generated or inferred.
- Degraded operation: at least one provider may be shown as degraded without collapsing the whole identification result.

### Task 1: Static site shell and fixture contract

**Files:**
- Create: `site/index.html`
- Create: `site/styles.css`
- Create: `site/app.js`
- Create: `site/data/demo-run.js`
- Create: `site/README.md`

**Interfaces:**
- `site/data/demo-run.js) exports `demoRun`, containing `request`, `pipeline`, `providers`, `match`, `fallback`, and `result`.
- `site/app.js) consumes `demoRun` and renders the dashboard without network calls.

- [ ] **Step 1: Define the fixture contract first**
Create `site/data/demo-run.js` with a complete deterministic run for a Renaissance portrait. Include:
  - request metadata: image name, dimensions, hash prefix;
  - pipeline stages with status, duration, and summary;
  - four museum providers: Met, Rijksmuseum, AIC, Smithsonian;
  - candidate evidence for artist/title/year/medium using `MATCH`, `MISMATCH`, and `UNAVAILABLE`;
  - one provider in a degraded state;
  - deterministic score and canonical selection;
  - fallback object with `activated: false`, plus CLIP/Qdrant configuration text;
  - enrichment sources limited to Wikidata/Wikipedia;
  - final result with museum image URL, artist, title, year, medium, nullable style, and reading links.

- [ ] **Step 2: Add the HTML skeleton**
Create `site/index.html` with accessible landmarks and empty mount points for:
  - top navigation/header;
  - hero/run summary;
  - pipeline timeline;
  - museum provider grid;
  - scoring/evidence panel;
  - fallback panel;
  - final result panel;
  - system telemetry/footer.
Load `site/app.js` as a module.

- [ ] **Step 3: Add the visual system**
Create `site/styles.css` with:
  - dark museum/technical visual language;
  - responsive desktop/mobile layouts;
  - clear status tokens for success/degraded/neutral/mismatch;
  - readable typography hierarchy;
  - cards, timeline connectors, evidence chips, progress bars, and image treatment;
  - reduced-motion media query;
  - visible keyboard focus states.

- [ ] **Step 4: Add the rendering layer**
Create `site/app.js` with small rendering functions:
  - `renderHeader`
  - `renderRunSummary`
  - `renderPipeline`
  - `renderProviders`
  - `renderScoring`
  - `renderFallback`
  - `renderResult`
  - `renderTelemetry`
  - `renderApp`
Use DOM APIs and escaped text content; do not inject fixture strings through `innerHTML` where text can be user-controlled.

- [ ] **Step 5: Document the Pages surface**
Create `site/README.md` explaining that the directory is the public static demo, how fixture mode works, the expected Pages URL, and how a future `/api/identify` adapter would replace the fixture import.

- [ ] **Step 6: Verify the static shell**
Run a static validation using a local HTTP server and browser-level smoke test. Confirm the page loads, all major panels render, there are no console errors, and the mobile layout remains usable.

- [ ] **Step 7: Commit**
Commit as:
```
feat: add Ekphrasis GitHub Pages dashboard
```

### Task 2: Add GitHub Pages deployment workflow

**Files:**
- Create: `.github/workflows/pages.yml`

**Interfaces:**
- The workflow publishes the `site/` directory as the Pages artifact.
- It must not require Node, secrets, or a build step.

- [ ] **Step 1: Define the workflow**
Use GitHub's Pages deployment actions to:
  - trigger on pushes to `main` affecting `site/**` or the workflow;
  - allow manual dispatch;
  - configure Pages;
  - upload `site/` as the artifact;
  - deploy it with the Pages deployment action;
  - grant only the permissions required for Pages deployment.

- [ ] **Step 2: Validate workflow structure**
Run a YAML parse/lint check locally and inspect the workflow for least-privilege permissions and correct artifact path.

- [ ] **Step 3: Commit**
Commit as:
```
ci: deploy Ekphrasis dashboard to GitHub Pages
```

### Task 3: Final integration verification

**Files:**
- Modify: `README.md` only if the repository currently has a root README; otherwise create `README.md` with the dashboard link and existing project purpose.

**Interfaces:**
- The repository README points to the public Pages demo when the Pages deployment exists.
- Existing architecture/spec/plan documents remain unchanged.

- [ ] **Step 1: Verify branch contents**
Confirm the branch contains only the dashboard, deployment workflow, and the minimal README addition.

- [ ] **Step 2: Run final static verification**
Serve `site/` locally, exercise the page at desktop and mobile viewport sizes, and verify:
  - pipeline ordering is correct;
  - museum providers are visibly parallel;
  - missing metadata renders `UNAVAILABLE`;
  - fallback is conditional;
  - museum provenance is visible;
  - degraded provider state is visible;
  - result, context, and detail sections render.

- [ ] **Step 3: Review against the architecture spec**
Check every dashboard claim against `docs/superpowers/specs/2026-09-21-ekphrasis-architecture-design.md`; remove anything that implies unsupported inference or live backend behavior.

- [ ] **Step 4: Commit any final README adjustment**
Use:
```
docs: link GitHub Pages dashboard
```

## Completion Contract

The feature is complete when the static dashboard is visually usable, all fixture-driven pipeline states are represented, the site contains no secrets or network dependencies, the Pages workflow is structurally valid, and the branch is ready for review without modifying `main`.
