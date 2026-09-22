export type StyleSource = 'museum' | 'wikipedia' | 'wikidata';
export interface StyleEvidence {
  style: string | null;
  styleSource: StyleSource | null;
}
