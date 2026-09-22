import { createHash } from 'node:crypto';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function contentType(response) {
  return response.headers?.get?.('content-type')?.split(';', 1)[0]?.trim().toLowerCase() ?? '';
}

export async function ingestCorpusImage({ record, fetchImpl = fetch, maxBytes = MAX_IMAGE_BYTES } = {}) {
  if (!record?.imageUrl) return { status: 'rejected', reason: 'NO_SOURCE_IMAGE' };

  let response;
  try {
    response = await fetchImpl(record.imageUrl);
  } catch {
    return { status: 'rejected', reason: 'SOURCE_UNAVAILABLE' };
  }

  if (!response.ok) return { status: 'rejected', reason: 'SOURCE_UNAVAILABLE' };

  const type = contentType(response);
  if (!type.startsWith('image/')) return { status: 'rejected', reason: 'SOURCE_NOT_IMAGE' };

  const buffer = new Uint8Array(await response.arrayBuffer());
  if (buffer.byteLength === 0) return { status: 'rejected', reason: 'EMPTY_SOURCE' };
  if (buffer.byteLength > maxBytes) return { status: 'rejected', reason: 'IMAGE_TOO_LARGE' };

  return {
    status: 'downloaded',
    sha256: sha256(buffer),
    bytes: buffer,
    contentType: type,
    sourceUrl: record.imageUrl,
    artworkUrl: record.artworkUrl ?? null,
    institution: record.institution,
    objectId: record.objectId,
  };
}
