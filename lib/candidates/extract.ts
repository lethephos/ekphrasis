export type VisionDetection = {
  webDetection?: {
    webEntities?: Array<{ description?: string | null }>;
    bestGuessLabels?: Array<{ label?: string | null }>;
  };
};

export function extractSearchCandidates(detection: VisionDetection): string[] {
  const values = [
    ...(detection.webDetection?.webEntities ?? []).map(item => item.description),
    ...(detection.webDetection?.bestGuessLabels ?? []).map(item => item.label)
  ];
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())).values())].slice(0, 12);
}