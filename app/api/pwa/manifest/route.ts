import { NextResponse } from 'next/server';
import { buildManifestForUrl } from '@/lib/pwa-manifest';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url') || searchParams.get('start_url') || '/';

    const manifestData = buildManifestForUrl(targetUrl);

    return new NextResponse(JSON.stringify(manifestData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/manifest+json; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
