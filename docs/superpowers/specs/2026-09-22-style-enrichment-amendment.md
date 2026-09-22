# Ekphrasis Style Enrichment Amendment

Date: 2026-09-22

## Decision

Artwork style is a sourced metadata field, not an inference made by the model.

The style resolution order is now:

`Museum style field → Wikipedia/Wikidata style evidence → null`

1. If the selected museum source explicitly supplies an artistic style or movement, use it.
2. If the museum does not supply style, query Wikipedia/Wikidata using the already selected artwork and artist identity.
3. Accept a style only when the external source explicitly states the movement/style classification. Do not derive style from visual appearance, title, medium, year, artist name alone, or model judgment.
4. Record the provenance of the style value as `museum` or `wikipedia`/`wikidata`.
5. If no explicit external style classification is found, keep `style=null` and present that absence explicitly in the UI.

The external lookup is enrichment only. It cannot change the canonical artwork identity, score, confidence, or museum provenance.

## Wikipedia matching

The lookup should prefer an exact artwork page when available. If the artwork page does not contain an explicit style/movement classification, the matched artist page may be used when it explicitly classifies the artist by movement and the relationship is unambiguous; the UI/source metadata must identify that the style came from Wikipedia rather than the museum.

No free-form web search result, generative classification, or visual guess may populate `artwork.style`.

## Demo fixture

The current dashboard fixture uses `Post-Impressionism` for Vincent van Gogh's *Wheat Field with Cypresses* with `styleSource: "wikipedia"`. This is sourced enrichment, not a model-generated classification.

## UI

The result metadata should show the style value and its provenance (`Wikipedia` or `Museum source`). When no source provides style, show `Not supplied by museum or Wikipedia` rather than an empty value.
