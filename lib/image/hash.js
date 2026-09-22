import { createHash } from 'node:crypto';
export function sha256(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError('image bytes must be a Uint8Array');
  return createHash('sha256').update(bytes).digest('hex');
}
