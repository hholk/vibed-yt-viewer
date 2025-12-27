import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DEFAULT_TTS_API_URL = 'http://127.0.0.1:50000';

export async function POST(request: Request) {
  const ttsBase = process.env.NEXT_PUBLIC_TTS_API_URL || DEFAULT_TTS_API_URL;
  const url = new URL('/tts', ttsBase).toString();

  try {
    const body = await request.text();

    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      // no caching for audio
      cache: 'no-store',
    });

    const headers = new Headers();
    // pass through content-type if the server sends one
    const contentType = upstream.headers.get('content-type') || 'audio/wav';
    headers.set('content-type', contentType);
    headers.set('cache-control', 'no-store');

    // Stream the response to the browser
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'TTS proxy failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
