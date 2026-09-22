import test from 'node:test';
import assert from 'node:assert/strict';
import { embedCorpusArtifacts } from '../../lib/visual/clip-batch.js';

test('CLIP batch embeds artifacts and preserves identity metadata', async () => {
  const result = await embedCorpusArtifacts({
    artifacts: [{ institution: 'The Met', objectId: '1', sha256: 'abc', bytes: new Uint8Array([1, 2]) }],
    embed: async (bytes) => {
      assert.deepEqual([...bytes], [1, 2]);
      return [0.1, 0.2, 0.3];
    },
    model: 'test-clip@1',
  });

  assert.deepEqual(result, {
    model: 'test-clip@1',
    dimensions: 3,
    points: [{
      id: 'The Met:1',
      vector: [0.1, 0.2, 0.3],
      payload: { institution: 'The Met', objectId: '1', sha256: 'abc' },
    }],
  });
});

test('CLIP batch rejects inconsistent embedding dimensions', async () => {
  await assert.rejects(
    () => embedCorpusArtifacts({
      artifacts: [
        { institution: 'The Met', objectId: '1', sha256: 'a', bytes: new Uint8Array([1]) },
        { institution: 'Rijksmuseum', objectId: '2', sha256: 'b', bytes: new Uint8Array([2]) },
      ],
      embed: async (bytes) => bytes[0] === 1 ? [0.1, 0.2] : [0.1],
      model: 'test-clip@1',
    }),
    /EMBEDDING_DIMENSION_MISMATCH/,
  );
});
