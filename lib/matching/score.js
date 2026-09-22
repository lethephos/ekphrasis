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
  const source = (entry) => entry?.candidate ?? entry;
  const populatedCount = (entry) => {
    const candidate = source(entry);
    return FIELDS.filter((field) => candidate?.[field] != null && candidate[field] !== '').length;
  };

  return [...candidates].sort((a, b) =>
    b.score - a.score ||
    populatedCount(b) - populatedCount(a) ||
    (priority.get(source(a)?.institution) ?? Number.MAX_SAFE_INTEGER) - (priority.get(source(b)?.institution) ?? Number.MAX_SAFE_INTEGER) ||
    String(source(a)?.institution ?? '').localeCompare(String(source(b)?.institution ?? '')) ||
    String(source(a)?.objectId ?? '').localeCompare(String(source(b)?.objectId ?? ''))
  )[0] ?? null;
}
