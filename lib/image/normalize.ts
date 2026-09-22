import sharp from "sharp";
import type { ValidatedUpload } from "./validate";

export type NormalizedImage = {
  bytes: Buffer;
  mimeType: "image/jpeg";
  width: number;
  height: number;
};

export async function normalizeImage(upload: ValidatedUpload): Promise<NormalizedImage> {
  const image = sharp(upload.bytes, { failOn: "error" }).rotate();
  const output = await image.jpeg({ quality: 90 }).toBuffer({ resolveWithObject: true });

  return {
    bytes: output.data,
    mimeType: "image/jpeg",
    width: output.info.width,
    height: output.info.height
  };
}