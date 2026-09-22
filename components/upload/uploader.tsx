'use client';

import { useState } from 'react';

export function Uploader({ onResult }: { onResult: (result: any) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(file: File) {
    setBusy(true); setError(null);
    try {
      const form = new FormData(); form.append('image', file);
      const response = await fetch('/api/identify', { method: 'POST', body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.code ?? 'API_UNAVAILABLE');
      onResult(result);
    } catch (e) { setError(e instanceof Error ? e.message : 'API_UNAVAILABLE'); }
    finally { setBusy(false); }
  }
  return <label className="uploader">
    <input type="file" accept="image/*" disabled={busy} onChange={(e) => {
      const file = e.target.files?.[0]; if (file) void submit(file);
    }} />
    <strong>{busy ? 'Analyzing image…' : 'Choose a painting photo'}</strong>
    <span>{error ?? 'JPG, PNG, WebP, or HEIC · up to 10 MB'}</span>
  </label>;
}
