import { createProductionPipeline } from '../../../lib/runtime.js';

let pipeline;
function getPipeline() {
  pipeline ??= createProductionPipeline();
  return pipeline;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    let bytes;
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('image');
      if (!file || typeof file.arrayBuffer !== 'function') {
        return Response.json({ status: 'error', code: 'INVALID_INPUT' }, { status: 400 });
      }
      bytes = new Uint8Array(await file.arrayBuffer());
    } else {
      bytes = new Uint8Array(await request.arrayBuffer());
    }

    if (!bytes.byteLength) return Response.json({ status: 'error', code: 'INVALID_INPUT' }, { status: 400 });

    const clientKey = (request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown')
      .split(',')[0].trim();

    return Response.json(await getPipeline().identify(bytes, { clientKey }));
  } catch (error) {
    const message = error?.message;
    if (message === 'RATE_LIMITED') return Response.json({ status: 'error', code: message }, { status: 429 });
    if (message === 'RATE_LIMITER_UNAVAILABLE') return Response.json({ status: 'error', code: message }, { status: 503 });
    if (message === 'UPLOAD_TOO_LARGE' || message === 'UNSUPPORTED_INPUT') {
      return Response.json({ status: 'error', code: message }, { status: 400 });
    }
    if (message === 'VISION_TIMEOUT') return Response.json({ status: 'error', code: message }, { status: 504 });
    return Response.json({ status: 'error', code: 'API_UNAVAILABLE' }, { status: 503 });
  }
}
