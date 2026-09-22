import sharp from 'sharp';
import { convertHeic, detectImageFormat } from './heic.js';

export async function normalizeImage(bytes, { heicConverter, maxDimension = 2048 } = {}) {
  const format = detectImageFormat(bytes);
  const converted = format === 'heic' ? await convertHeic(bytes, heicConverter) : bytes;
  const output = await sharp(converted, { failOn: 'error' })
    .rotate()
    .resize({ width: maxDimension, height: maxDimension, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
  return { bytes: new Uint8Array(output), format: 'jpeg' };
}
