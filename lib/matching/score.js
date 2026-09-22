const FIELDS = ['artist', 'title', 'year', 'medium'];

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

export function selectCanonical(candidates) {
  return [...candidates].sort((a, b) =>
    b.score - a.score ||
    String(a.institution).localeCompare(String(b.institution)) ||
    String(a.objectId).localeCompare(String(b.objectId))
  )[0] ?? null;
}
