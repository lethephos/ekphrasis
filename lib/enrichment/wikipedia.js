export function createWikipediaStyleSource({ lookup } = {}) {
  if (typeof lookup !== 'function') throw new TypeError('lookup must be a function');
  return {
    async lookup({ title, artist }) {
      const evidence = await lookup({ title, artist });
      if (!evidence || evidence.source !== 'wikipedia' || typeof evidence.style !== 'string') return null;
      return { style: evidence.style, source: 'wikipedia' };
    },
  };
}
