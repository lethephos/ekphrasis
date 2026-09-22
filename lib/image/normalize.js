import { convertHeic, detectImageFormat } from './heic.js';
export async function normalizeImage(bytes, { heicConverter, normalize } = {}) {
  const format = detectImageFormat(bytes);
  const converted = format === 'heic' ? await convertHeic(bytes, heicConverter) : bytes;
  if (typeof normalize !== 'function') return { bytes: converted, format };
  return normalize(converted, format);
}
