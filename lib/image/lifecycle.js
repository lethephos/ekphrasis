export async function withImageLifecycle({ originalBytes, process }) {
  if (!(originalBytes instanceof Uint8Array)) throw new TypeError('originalBytes must be a Uint8Array');
  if (typeof process !== 'function') throw new TypeError('process must be a function');
  const cleanups = [];
  const cleanup = async (fn) => {
    if (typeof fn !== 'function') throw new TypeError('cleanup must be a function');
    cleanups.push(fn);
  };
  try { return await process({ originalBytes, cleanup }); }
  finally { for (const fn of cleanups.reverse()) await fn(); }
}
