export function normalizeText(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.toLowerCase().normalize("NFKD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, " ").trim() || null;
}
export function equivalentText(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalizeText(a); const right = normalizeText(b);
  if (!left || !right) return false;
  return left === right || left.replace(/^the /, "") === right.replace(/^the /, "");
}
export function equivalentDate(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const left = a.match(/\b\d{4}\b/)?.[0]; const right = b.match(/\b\d{4}\b/)?.[0];
  return Boolean(left && right && left === right);
}