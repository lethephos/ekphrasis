import { describe, expect, it, vi } from "vitest";
import { HuggingFaceVisionAdapter } from "./huggingface";

describe("HuggingFaceVisionAdapter", () => {
  it("turns structured VLM output into search candidates", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ artist: "Johannes Vermeer", title: "Girl with a Pearl Earring", year: "1665", medium: "oil on canvas", candidates: [{ text: "Johannes Vermeer" }, { text: "Girl with a Pearl Earring" }] }) } }]
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const result = await new HuggingFaceVisionAdapter("hf_test").detect(Buffer.from("image"));
    expect(result.webDetection?.webEntities?.map(item => item.description)).toEqual(["Johannes Vermeer", "Girl with a Pearl Earring", "1665", "oil on canvas"]);
    expect(fetchMock).toHaveBeenCalledOnce();
    fetchMock.mockRestore();
  });

  it("fails clearly when the token is missing", async () => {
    await expect(new HuggingFaceVisionAdapter("").detect(Buffer.from("image"))).rejects.toMatchObject({ provider: "vision", failure: "AUTH" });
  });

  it("allows enough time for Hugging Face vision cold starts", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ candidates: [{ text: "Girl with a Pearl Earring" }] }) } }]
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const timeoutMock = vi.spyOn(AbortSignal, "timeout");
    await new HuggingFaceVisionAdapter("hf_test").detect(Buffer.from("image"));
    expect(timeoutMock).toHaveBeenCalledWith(30000);
    fetchMock.mockRestore();
    timeoutMock.mockRestore();
  });
});