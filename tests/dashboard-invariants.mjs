import assert from "node:assert/strict";
import { demoRun } from "../site/data/demo-run.js";

assert.ok(Array.isArray(demoRun.additionalSources), "additionalSources should exist");
assert.equal(demoRun.additionalSources.length, 6, "fixture should model six extended sources");
assert.deepEqual(
  demoRun.additionalSources.map((source) => source.name),
  ["Victoria and Albert Museum", "National Gallery of Art", "Cleveland Museum of Art", "Harvard Art Museums", "Europeana", "Wikidata / Wikipedia"],
  "extended sources should match the architecture"
);
assert.ok(
  demoRun.additionalSources.every((source) => source.status === "not-queried"),
  "extended sources must be explicitly marked not queried in fixture mode"
);
assert.ok(
  demoRun.additionalSources.every((source) => source.tier === "extended" || source.tier === "enrichment"),
  "extended source entries must carry an explicit tier"
);
console.log("dashboard additional-source contract: PASS");
