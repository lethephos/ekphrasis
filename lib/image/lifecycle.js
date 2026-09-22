import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export async function withImageLifecycle({ originalBytes, process }) {
  if (!(originalBytes instanceof Uint8Array)) throw new TypeError('originalBytes must be a Uint8Array');
  if (typeof process !== 'function') throw new TypeError('process must be a function');

  const tempDir = await mkdtemp(join(tmpdir(), 'ekphrasis-'));
  const originalPath = join(tempDir, 'original');
  await writeFile(originalPath, originalBytes);

  try {
    return await process({ originalBytes, originalPath, tempDir });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
