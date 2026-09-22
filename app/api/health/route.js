export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({
    status: 'ok',
    service: 'ekphrasis',
    version: process.env.GIT_COMMIT_SHA ?? 'unknown',
  }, {
    headers: {
      'cache-control': 'no-store',
    },
  });
}
