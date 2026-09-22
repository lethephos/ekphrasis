import { mkdir, writeFile } from 'node:fs/promises';
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