# Ekphrasis

Ekphrasis is a web service for identifying paintings from photographs.

## Architecture demo

The static GitHub Pages dashboard visualizes the planned recognition pipeline, museum evidence, matching semantics, sourced style enrichment, fallback path, provenance, and result presentation.

**Dashboard:** https://lethephos.github.io/ekphrasis/

The dashboard is fixture-driven and does not expose provider credentials or perform live identification.

## MVP architecture

`Image Intake → Vision → Candidate Extraction → parallel Museum Search → Matching/Scoring → CLIP/Qdrant fallback → Enrichment → Presentation`

Primary museum sources:
- The Metropolitan Museum of Art
- Rijksmuseum
- Art Institute of Chicago
- Smithsonian Open Access

The architecture specification lives at `docs/superpowers/specs/2026-09-21-ekphrasis-architecture-design.md`.

## Repository

Implementation is planned as a Next.js application on Vercel. Uploaded photos are ephemeral; provider credentials remain server-side. Railway is not part of the architecture.

## API runtime

The MVP API is exposed at `POST /api/identify`. It accepts either a raw image body or a multipart form field named `image` and enforces a 10 MB server-side limit.

Required provider configuration is documented in `.env.example`. Google Vision credentials are server-side only. Upstash Redis is used for persistent result caching and sliding-window rate limiting when configured; local development falls back to in-memory implementations.

Default request limit: **20 requests per client IP per minute**. Normal results are cached for **1 hour**; degraded/no-match results use a **5 minute** TTL. Provider-unavailable errors are not cached.
