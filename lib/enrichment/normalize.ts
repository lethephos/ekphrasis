export function normalizeContext(facts: string[]): string | null {
  const clean = facts.map(f => f.trim()).filter(Boolean);
  if (!clean.length) return null;
  return clean.slice(0, 2).join(" ");
}
export function normalizeDetail(facts: string[]): string | null {
  return facts.find(Boolean) ?? null;
}