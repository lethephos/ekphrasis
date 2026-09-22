const EVIDENCE_STATES = Object.freeze(['MATCH', 'MISMATCH', 'UNAVAILABLE']);
const PUBLIC_STATUSES = Object.freeze(['match', 'no_match', 'error']);
const CONFIDENCE_LEVELS = Object.freeze(['low', 'medium', 'high']);
const STYLE_SOURCES = Object.freeze(['museum', 'wikipedia', 'wikidata']);
const LICENSE_STATUSES = Object.freeze(['verified', 'unknown']);

function assertOneOf(name, value, allowed) {
  if (!allowed.includes(value)) throw new TypeError(`${name} must be one of: ${allowed.join(', ')}`);
}
function assertString(name, value, { nullable = false } = {}) {
  if (nullable && value == null) return;
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${name} must be a non-empty string`);
}
export function buildIdentificationResult(input) {
  if (!input || typeof input !== 'object') throw new TypeError('result must be an object');
  assertOneOf('status', input.status, PUBLIC_STATUSES);
  if (input.status === 'match') {
    assertOneOf('confidence', input.confidence, CONFIDENCE_LEVELS);
    const { artwork, source } = input;
    if (!artwork || !source) throw new TypeError('match results require artwork and source');
    assertString('artwork.title', artwork.title);
    assertString('artwork.artist', artwork.artist);
    assertString('artwork.year', artwork.year, { nullable: true });
    assertString('artwork.medium', artwork.medium, { nullable: true });
    assertString('artwork.museum', artwork.museum);
    if (artwork.style != null) {
      assertString('artwork.style', artwork.style);
      assertOneOf('artwork.styleSource', artwork.styleSource, STYLE_SOURCES);
    } else if (artwork.styleSource != null) throw new TypeError('styleSource requires style');
    assertString('source.institution', source.institution);
    assertString('source.objectId', source.objectId);
    assertString('source.artworkUrl', source.artworkUrl);
    assertString('source.imageUrl', source.imageUrl);
    if (!source.license || typeof source.license !== 'object') throw new TypeError('source.license is required');
    assertOneOf('source.license.status', source.license.status, LICENSE_STATUSES);
  }
  return structuredClone(input);
}
export { EVIDENCE_STATES, PUBLIC_STATUSES, CONFIDENCE_LEVELS, STYLE_SOURCES, LICENSE_STATUSES };
