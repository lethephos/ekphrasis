import test from 'node:test';
import assert from 'node:assert/strict';
import { writeCorpusArtifact } from '../../lib/visual/corpus-artifact.js';

test('corpus artifact writes deterministic metadata and image bytes', async () => {
  const writes = [];
  const result = await writeCorpusArtifact({
    rootDir: '/corpus',
    record: {
      institution: 'The Metropolitan Museum of Art',
      objectId: '436535',
      sourceUrl: 'https://images.example/met/436535.jpg',
      artworkUrl: 'https://www.metmuseum.org/art/collection/search/436535',
      contentType: 'image/jpeg',
      sha256: '9f64a747e1b97f131fabb6b447296c9b6f0201e79fb3c5356e6c77e89b6a806a',
    },
    bytes: new Uint8Array([1, 2, 3, 4]),
    writeFile: async (path, data) => writes.push({ path, data }),
    mkdir: async () => {},
  });

  assert.equal(result.path, '/corpus/The-Metropolitan-Museum-of-Art/436535/9f64a747e1b97f131fabb6b447296c9b6f0201e79fb3c5356e6c77e89b6a806a.jpg');
  assert.equal(writes.length, 1);
  assert.deepEqual([...writes[0].data], [1, 2, 3, 4]);
});

test('corpus artifact refuses an unsafe object id', async () => {
  await assert.rejects(
    () => writeCorpusArtifact({
      rootDir: '/corpus',
      record: { institution: 'Rijksmuseum', objectId: '../escape', contentType: 'image/jpeg', sha256: 'abc' },
      bytes: new Uint8Array([1]),
      writeFile: async () => {},
      mkdir: async () => {},
    }),
    /UNSAFE_CORPUS_PATH/,
  );
});
