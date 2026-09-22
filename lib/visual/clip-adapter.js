const DEFAULT_MODEL = 'Xenova/clip-vit-base-patch32';

function normalize(values) {
  const norm = Math.hypot(...values);
  if (!Number.isFinite(norm) || norm === 0) throw new Error('INVALID_CLIP_OUTPUT');
  return values.map((value) => value / norm);
}

export function createClipEmbedder({
  model = DEFAULT_MODEL,
  pipelineFactory,
  imageLoader,
} = {}) {
  if (typeof pipelineFactory !== 'function') throw new Error('CLIP_PIPELINE_FACTORY_REQUIRED');
  if (typeof imageLoader !== 'function') throw new Error('CLIP_IMAGE_LOADER_REQUIRED');

  let pipelinePromise;

  return async function embed(bytes) {
    const image = await imageLoader(bytes);
    pipelinePromise ??= pipelineFactory(model);
    const output = await pipelinePromise(image);
    const dims = output?.dims;
    if (dims && (dims.length !== 2 || dims[0] !== 1)) throw new Error('INVALID_CLIP_OUTPUT');

    const values = Array.from(output?.data ?? []);
    if (!values.length) throw new Error('INVALID_CLIP_OUTPUT');
    return normalize(values);
  };
}
