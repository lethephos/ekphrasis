# Ekphrasis

Ekphrasis is a web service for identifying paintings from photographs — “Shazam for paintings.”

## Architecture demo

The static GitHub Pages dashboard visualizes the planned recognition pipeline, museum evidence, matching semantics, fallback path, provenance, and result presentation.

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
