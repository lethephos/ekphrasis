# Ekphrasis

Ekphrasis is a web service for identifying paintings from photographs — effectively “Shazam for paintings.”

## MVP architecture

`Image Intake → SHA-256 Cache → Google Vision → Candidate Extraction → parallel Museum Search → Matching/Scoring → CLIP/Qdrant fallback → Enrichment → Presentation`

Primary museum sources:
- The Metropolitan Museum of Art
- Rijksmuseum
- Art Institute of Chicago
- Smithsonian Open Access

The authoritative architecture specification is [docs/superpowers/specs/2026-09-21-ekphrasis-architecture-design.md](docs/superpowers/specs/2026-09-21-ekphrasis-architecture-design.md).

The implementation is a Next.js App Router application intended for Vercel. User images are ephemeral and are never stored as image assets. Railway is not part of the architecture.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Add server-side credentials for Google Vision, museum APIs, Upstash Redis, Qdrant, and the optional CLIP embedding endpoint.
3. Install dependencies with `npm install`.
4. Start the app with `npm run dev`.
5. Run verification with `npm test`, `npm run typecheck`, and `npm run build`.

## API

`POST /api/identify` accepts a multipart form field named `image`.

Public states are:
- `MATCH`
- `NO_MATCH`
- `ERROR`

Repeated identical uploads use a SHA-256 result cache. Normal results use a 7-day TTL; degraded results use a 15-minute TTL. `API_UNAVAILABLE` is not cached as a normal result.

Anonymous requests are rate-limited before recognition starts. The MVP uses 5 requests/minute and 30 requests/hour per privacy-preserving identity key.

## Dashboard

The existing GitHub Pages dashboard is fixture-driven documentation of the recognition architecture. It does not contain provider credentials and does not perform live identification.

Dashboard: https://lethephos.github.io/ekphrasis/
