import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const APP_PASSWORD = process.env.APP_PASSWORD || 'yt-viewer-1234';

async function readPassword(request: NextRequest): Promise<string | null> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => null) as { password?: unknown } | null;
    return typeof body?.password === 'string' ? body.password : null;
  }

  try {
    const form = await request.formData();
    const password = form.get('password');
    return typeof password === 'string' ? password : null;
  } catch {
    // Fallback for unusual clients.
    const text = await request.text().catch(() => '');
    const params = new URLSearchParams(text);
    const password = params.get('password');
    return password;
  }
}

export async function POST(request: NextRequest) {
  try {
    const password = await readPassword(request);
    const isFormRequest = !(request.headers.get('content-type') ?? '').includes('application/json');

    if (password === APP_PASSWORD) {
      const response = isFormRequest
        ? NextResponse.redirect(new URL('/', request.url), { status: 303 })
        : NextResponse.json({ success: true });

      // Set authentication cookie (valid for 30 days)
      response.cookies.set('yt-viewer-auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });

      return response;
    }

    if (isFormRequest) {
      return NextResponse.redirect(new URL('/login?error=1', request.url), { status: 303 });
    }

    return NextResponse.json({ success: false, message: 'Falsches Passwort' }, { status: 401 });
  } catch {
    const contentType = request.headers.get('content-type') ?? '';
    const isFormRequest = !contentType.includes('application/json');

    if (isFormRequest) {
      return NextResponse.redirect(new URL('/login?error=1', request.url), { status: 303 });
    }

    return NextResponse.json({ success: false, message: 'Fehler bei der Authentifizierung' }, { status: 500 });
  }
}
