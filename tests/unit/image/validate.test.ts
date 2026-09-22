import { describe, expect, it } from "vitest";
import { validateUpload } from "../../../lib/image/validate";

function file(bytes: number[], name = "image.jpg", type = "image/jpeg") {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("image intake", () => {
  it("rejects an extension/content-type mismatch", async () => {
    await expect(validateUpload(file([0, 1, 2], "photo.jpg", "image/jpeg"))).rejects.toMatchObject({
      code: "INVALID_IMAGE"
    });
  });

  it("rejects an upload over 10 MB", async () => {
    const bytes = new Uint8Array(10 * 1024 * 1024 + 1);
    await expect(validateUpload(new File([bytes], "large.jpg", { type: "image/jpeg" }))).rejects.toMatchObject({
      code: "UNSUPPORTED_INPUT"
    });
  });

  it("rejects decoded dimensions above the resource guard", async () => {
    await expect(validateUpload(file([255, 216, 255, 224, 0, 16, 74, 70], "huge.jpg"))).rejects.toMatchObject({
      code: "INVALID_IMAGE"
    });
  });
});