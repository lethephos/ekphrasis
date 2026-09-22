import { demoRun } from "./data/demo-run.js";

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
}[c]));

const el = (id) => document.getElementById(id);
const statusClass = (status) => status === "complete" ? "complete" : status;

function renderHeader() {
  const r = demoRun.request;
  el("run-summary").innerHTML = `
    <div class="hero-grid">
      <div>
        <div class="eyebrow">Identification run · fixture 001</div>
        <h1>From photograph<br>to provenance.</h1>
        <p class="lede">A single view of the Ekphrasis recognition pipeline — showing what each source contributed, what remained unavailable, and why the canonical match survived the evidence gate.</p>
        <div class="meta-row">
          <span class="pill">${esc(r.imageName)}</span>
          <span class="pill">${esc(r.dimensions)}</span>
          <span class="pill">SHA-256 ${esc(r.hash)}</span>
        </div>
      </div>
      <div class="run-card">
        <div class="eyebrow">Run state</div>
        <strong>MATCH · HIGH</strong>
        <div class="section-note">Fixture / no live APIs</div>
      </div>
    </div>`;
}

function renderPipeline() {
  el("pipeline").innerHTML = `
    <div class="section-head"><div><div class="eyebrow">01 / Pipeline</div><h2 class="section-title">The request, end to end</h2></div><div class="section-note">Sequential where dependency matters · parallel where it doesn't</div></div>
    <div class="pipeline">
      ${demoRun.pipeline.map((s, i) => `
        <article class="stage">
          <div class="stage-num">0${i + 1}</div>
          <div class="status ${statusClass(s.status)}">${esc(s.status)}</div>
          <h3>${esc(s.label)}</h3>
          <p>${esc(s.summary)}</p>
          <p class="mono" style="margin-top:12px">${esc(s.duration)}</p>
        </article>`).join("")}
    </div>`;
}

function renderProviders() {
  el("providers").innerHTML = `
    <div class="section-head"><div><div class="eyebrow">02 / Parallel search</div><h2 class="section-title">Museum evidence</h2></div><div class="section-note">Four primary adapters · one degraded source does not fail the request</div></div>
    <div class="providers">
      ${demoRun.providers.map(p => `
        <article class="provider">
          <div class="provider-head"><div class="provider-name">${esc(p.name)}</div><div class="provider-code">${esc(p.short)}</div></div>
          <div class="provider-meta"><span class="status ${statusClass(p.status)}">${esc(p.status)}</span><span>${esc(p.latency)}</span></div>
          <div class="evidence">
            ${p.evidence.map(([label, signal]) => `<div class="evidence-row"><span class="evidence-label">${esc(label)}</span><span class="signal ${esc(signal)}">${esc(signal)}</span></div>`).join("")}
          </div>
          <div class="scorebar" aria-label="candidate score"><i style="width:${p.score * 100}%"></i></div>
          <div class="provider-meta" style="margin-bottom:0"><span>${esc(p.note)}</span><span>${p.score.toFixed(2)}</span></div>
        </article>`).join("")}
    </div>
    <details class="source-expansion">
      <summary>
        <span><strong>Museum coverage</strong> · ${demoRun.providers.length} active providers · ${demoRun.additionalSources.length} additional sources</span>
        <span class="status neutral">expand</span>
      </summary>
      <div class="source-groups">
        <div>
          <div class="eyebrow">Extended sources</div>
          <div class="source-list">
            ${demoRun.additionalSources.filter(s => s.tier === "extended").map(s => `
              <div class="source-row">
                <div><strong>${esc(s.name)}</strong><span>${esc(s.note)}</span></div>
                <div><span class="provider-code">${esc(s.short)}</span><span class="status neutral">${esc(s.status)}</span></div>
              </div>`).join("")}
          </div>
        </div>
        <div>
          <div class="eyebrow">Enrichment</div>
          <div class="source-list">
            ${demoRun.additionalSources.filter(s => s.tier === "enrichment").map(s => `
              <div class="source-row">
                <div><strong>${esc(s.name)}</strong><span>${esc(s.note)}</span></div>
                <div><span class="provider-code">${esc(s.short)}</span><span class="status neutral">${esc(s.status)}</span></div>
              </div>`).join("")}
          </div>
        </div>
      </div>
    </details>`;
}

function renderScoring() {
  const m = demoRun.match;
  el("scoring").innerHTML = `
    <div class="section-head"><div><div class="eyebrow">03 / Evidence gate</div><h2 class="section-title">Why this candidate won</h2></div><div class="section-note">Missing fields remain neutral</div></div>
    <div class="two-col">
      <article class="card">
        <div class="eyebrow">Canonical candidate</div>
        <div class="score-big">${m.score.toFixed(2)}</div>
        <div class="status complete">evidence gate passed</div>
        <p class="rationale">${esc(m.rationale)}</p>
        <div class="evidence-detail">
          ${m.evidence.map(([key, state, value]) => `<div class="evidence-row"><span><span class="evidence-label">${esc(key)}</span><br><strong>${esc(value)}</strong></span><span class="signal ${esc(state)}">${esc(state)}</span></div>`).join("")}
        </div>
      </article>
      <article class="card">
        <div class="eyebrow">Canonical source</div>
        <h3 style="font-size:24px;margin:12px 0">${esc(m.canonicalSource)}</h3>
        <p class="rationale">Selection is deterministic: evidence-gate-passing candidates first, then populated required metadata, then configured source priority, then source ID.</p>
        <div class="meta-row"><span class="pill">artist · title · year · medium</span><span class="pill">no arrival-order tie break</span></div>
      </article>
    </div>`;
}

function renderFallback() {
  const f = demoRun.fallback;
  el("fallback").innerHTML = `
    <div class="section-head"><div><div class="eyebrow">04 / Fallback</div><h2 class="section-title">CLIP + Qdrant</h2></div><div class="section-note">Conditional path, not another always-on provider</div></div>
    <div class="card fallback-card">
      <div class="fallback-icon">CLIP</div>
      <div><div class="status skipped">standby · not activated</div><h3 style="margin:8px 0 4px">${esc(f.collection)}</h3><div class="rationale">${esc(f.summary)}</div></div>
      <div class="status skipped">${esc(f.model)}</div>
    </div>`;
}

function renderResult() {
  const r = demoRun.result;
  const a = r.artwork;
  el("result").innerHTML = `
    <div class="section-head"><div><div class="eyebrow">05 / Presentation</div><h2 class="section-title">The result</h2></div><div class="section-note">Provider-independent public model</div></div>
    <div class="result-layout">
      <div>
        <div class="art-frame" id="art-frame">
          <img src="${esc(r.source.imageUrl)}" alt="${esc(a.title)} — ${esc(a.artist)}" id="art-image">
        </div>
        <div class="source-label">ORIGINAL ARTWORK IMAGE · ${esc(r.source.institution)} · SOURCE ID ${esc(r.source.objectId)}</div>
      </div>
      <article>
        <div class="result-kicker">Match · High confidence</div>
        <h2 class="result-title">${esc(a.title)}</h2>
        <div class="metadata">
          <div><span>Artist</span><strong>${esc(a.artist)}</strong></div>
          <div><span>Year</span><strong>${esc(a.year)}</strong></div>
          <div><span>Medium</span><strong>${esc(a.medium)}</strong></div>
          ${a.style ? `<div><span>Style</span><strong>${esc(a.style)}</strong></div>` : `<div><span>Style</span><strong>—</strong></div>`}
        </div>
        <div class="copy-block"><h3>The Context</h3><p>${esc(r.context)}</p></div>
        <div class="copy-block"><h3>The Detail</h3><p>${esc(r.detail)}</p></div>
        <div class="source-note"><div class="eyebrow">Source</div><p><strong>${esc(r.source.institution)}</strong> · object ${esc(r.source.objectId)}</p><a href="${esc(r.source.artworkUrl)}" target="_blank" rel="noreferrer">Open museum record ↗</a></div>
        <div class="copy-block"><h3>Related reading</h3><div class="reading">${r.relatedReading.map(x => `<a href="${esc(x.url)}" target="_blank" rel="noreferrer">${esc(x.title)} ↗</a>`).join("")}</div></div>
      </article>
    </div>`;
  el("art-image").addEventListener("error", () => el("art-frame").classList.add("is-broken"));
}

function renderTelemetry() {
  el("telemetry").innerHTML = `
    <div class="section-head"><div><div class="eyebrow">06 / Diagnostics</div><h2 class="section-title">System telemetry</h2></div><div class="section-note">Representative fixture values</div></div>
    <div class="telemetry">
      ${Object.entries(demoRun.telemetry).map(([key, value]) => `<div class="metric"><span>${esc(key)}</span><strong>${esc(value)}</strong></div>`).join("")}
    </div>`;
}

function renderApp() {
  renderHeader(); renderPipeline(); renderProviders(); renderScoring(); renderFallback(); renderResult(); renderTelemetry();
}
renderApp();
