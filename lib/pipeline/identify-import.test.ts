import { describe, expect, it } from "vitest";
import { identifyImage } from "./identify";

describe("identify pipeline wiring", () => {
  it("loads the production vision adapter type without the deleted Google adapter", () => {
    expect(typeof identifyImage).toBe("function");
  });
});
