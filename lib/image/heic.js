const text = (bytes, start, length) => new TextDecoder('ascii').decode(bytes.slice(start, start + length));
const HEIC_BRANDS = new Set(['heic','heix','hevc','hevx','heim','heis','hevm','hevs','mif1','msf1']);
export function detectImageFormat(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (bytes.length >= 8 && bytes[0] === 0x89 && text(bytes, 1, 3) === 'PNG' && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return 'png';
  if (bytes.length >= 12 && text(bytes, 0, 4) === 'RIFF' && text(bytes, 8, 4) === 'WEBP') return 'webp';
  if (bytes.length >= 12 && text(bytes, 4, 4) === 'ftyp' && HEIC_BRANDS.has(text(bytes, 8, 4))) return 'heic';
  return null;
}
export function convertHeic(bytes, converter) {
  if (detectImageFormat(bytes) !== 'heic') return bytes;
  if (typeof converter !== 'function') throw new Error('HEIC_CONVERTER_UNAVAILABLE');
  return converter(bytes);
}
