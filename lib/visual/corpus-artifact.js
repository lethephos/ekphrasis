import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/tiff': '.tif',
};

function safeSegment(value) {
  const segment = String(value ?? '');
  if (!segment || segment === '.' || segment === '..' || segment.includes('/') || segment.includes('\\') || segment.includes('\0')) throw new Error('UNSAFE_CORPUS_PATH');
  return segment.replace(/[^a-zA-Z0-9._-]+/g, '-');
}

export async function writeCorpusArtifact({ rootDir, record, bytes, writeFile: write = writeFile, mkdir: makeDir = mkdir } = {}) {
  const institution = safeSegment(record?.institution);
  const objectId = safeSegment(record?.objectId);
  const hash = safeSegment(record?.sha256);
  const extension = EXTENSIONS[record?.contentType] ?? '.bin';
  const root = path.resolve(rootDir);
  const directory = path.join(root, institution, objectId);
  const filePath = path.join(directory, hash + extension);
  if (!filePath.startsWith(root + path.sep)) throw new Error('UNSAFE_CORPUS_PATH');
  await makeDir(directory, { recursive: true });
  await write(filePath, bytes);
  return { path: filePath, institution: record.institution, objectId: record.objectId, sha256: record.sha256, contentType: record.contentType, sourceUrl: record.sourceUrl ?? null, artworkUrl: record.artworkUrl ?? null };
}

export function buildArtifactManifest({ collection, model, dimensions, artifacts }) {
  const sourceCounts = {};
  for (const artifact of artifacts) {
    sourceCounts[artifact.institution] = (sourceCounts[artifact.institution] ?? 0) + 1;
  }
  return {
    collection,
    model,
    dimensions,
    pointCount: artifacts.length,
    sourceCounts,
    artifacts: artifacts.map(({ institution, objectId, sha256, sourceUrl, artworkUrl, contentType }) => ({
      institution, objectId, sha256, sourceUrl: sourceUrl ?? null, artworkUrl: artworkUrl ?? null, contentType: contentType ?? null,
    })),
  };
}


export async function downloadCorpusArtifacts({ records, fetchImpl = fetch, maxBytes = 10 * 1024 * 1024 } = {}) {
  if (!Array.isArray(records)) throw new Error('INVALID_CORPUS_RECORDS');
  const artifacts = [];
  for (const record of records) {
    if (!record?.imageUrl) continue;
    const response = await fetchImpl(record.imageUrl);
    if (!response.ok) throw new Error('CORPUS_IMAGE_UNAVAILABLE');
    const contentType = (response.headers?.get?.('content-type') ?? '').split(';')[0].toLowerCase();
    if (!EXTENSIONS[contentType]) throw new Error('UNSUPPORTED_CORPUS_IMAGE');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) throw new Error('CORPUS_IMAGE_TOO_LARGE');
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    artifacts.push({ ...record, contentType, sha256, bytes, sourceUrl: record.imageUrl });
  }
  return artifacts;
}
