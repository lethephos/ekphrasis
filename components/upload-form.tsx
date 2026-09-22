"use client";

import { useState } from "react";
import type { IdentificationResult } from "../lib/types";

export function UploadForm({ onResult }: { onResult: (result: IdentificationResult) => void }) {
  const [busy, setBusy] = useState(false);
  async function submit(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      onResult({ state: "ERROR", error: "UNSUPPORTED_INPUT" });
      return;
    }
    setBusy(true);
    try {
      const form = new FormData(); form.append("image", file);
      const response = await fetch("/api/identify", { method: "POST", body: form });
      onResult(await response.json() as IdentificationResult);
    } catch {
      onResult({ state: "ERROR", error: "PROCESSING_FAILED" });
    } finally { setBusy(false); }
  }
  return (
    <label>
      <span>{busy ? "Identifying…" : "Choose a photo"}</span>
      <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment" hidden disabled={busy}
        onChange={event => { const file = event.target.files?.[0]; if (file) void submit(file); }} />
    </label>
  );
}