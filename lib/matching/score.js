const FIELDS = ['artist', 'title', 'year', 'medium'];
const DEFAULT_SOURCE_PRIORITY = ['The Metropolitan Museum of Art', 'Rijksmuseum', 'Art Institute of Chicago', 'Smithsonian'];

function norm(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function fieldState(query, candidate, field) {
  if (query[field] == null || candidate[field] == null || query[field] === '' || candidate[field] === '') return 'UNAVAILABLE';
  return norm(query[field]) === norm(candidate[field]) ? 'MATCH' : 'MISMATCH';
}

export function scoreCandidate(query, candidate) {
  const evidence = Object.fromEntries(FIELDS.map((field) => [`${field}_match`, fieldState(query, candidate, field)]));
  const available = FIELDS.filter((field) => evidence[`${field}_match`] !== 'UNAVAILABLE');
  const matches = available.filter((field) => evidence[`${field}_match`] === 'MATCH').length;
  const score = available.length ? matches / available.length : 0;
  return { candidate, evidence, score };
}

export function selectCanonical(candidates, sourcePriority = DEFAULT_SOURCE_PRIORITY) {
  const priority = new Map(sourcePriority.map((source, index) => [source, index]));
  const populatedCount = (candidate) => FIELDS.filter((field) => candidate?.candidate?.[field] != null && candidate.candidate[field] !== '').length;

  return [...candidates].sort((a, b) =>
    b.score - a.score ||
    populatedCount(b) - populatedCount(a) ||
    (priority.get(a.candidate?.institution) ?? Number.MAX_SAFE_INTEGER) - (priority.get(b.candidate?.institution) ?? Number.MAX_SAFE_INTEGER) ||
    String(a.candidate?.institution ?? '').localeCompare(String(b.candidate?.institution ?? '')) ||
    String(a.candidate?.objectId ?? '').localeCompare(String(b.candidate?.objectId ?? ''))
  )[0] ?? null;
}
