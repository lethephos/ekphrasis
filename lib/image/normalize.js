import sharp from 'sharp';
import { convertHeic, detectImageFormat } from './heic.js';

export async function normalizeImage(bytes, { heicConverter, maxDimension = 2048 } = {}) {
  const format = detectImageFormat(bytes);
  const converted = format === 'heic' ? await convertHeic(bytes, heicConverter) : bytes;
  let output;
  try {
    output = await sharp(converted, { failOn: 'error' })
    .rotate()
    .resize({ width: maxDimension, height: maxDimension, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
    return { bytes: new Uint8Array(await output.rotate().resize({ width: maxDimension, height: maxDimension, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer()), format: 'jpeg' };
  } catch {
    throw new Error('UNSUPPORTED_INPUT');
  }
}
