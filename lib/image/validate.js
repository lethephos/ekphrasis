import { detectImageFormat } from './heic.js';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function validateImageBytes(bytes, metadata = {}) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError('image bytes must be a Uint8Array');
  if (bytes.byteLength > MAX_UPLOAD_BYTES) throw new Error('UPLOAD_TOO_LARGE');
  const format = detectImageFormat(bytes);
  if (!format) throw new Error('UNSUPPORTED_INPUT');
  return { format, byteLength: bytes.byteLength, declaredMime: metadata.declaredMime ?? null, fileName: metadata.fileName ?? null };
}
