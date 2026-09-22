export type RelatedLink = { title: string; url: string };
const blocked = /instagram|facebook|tiktok|youtube|patreon|subscribe|shop|store/i;
export function extractRelatedReading(links: RelatedLink[]): RelatedLink[] {
  return links.filter(link => /^https?:\/\//.test(link.url) && !blocked.test(link.url)).slice(0, 3);
}