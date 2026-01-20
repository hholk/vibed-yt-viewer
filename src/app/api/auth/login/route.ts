import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { timingSafeEqual } from 'crypto';

const APP_PASSWORD = process.env.APP_PASSWORD;

if (!APP_PASSWORD) {
  throw new Error('APP_PASSWORD environment variable is required');
}

const APP_PASSWORD_NON_NULL = APP_PASSWORD;

type RateLimitEntry = {
  attempts: number;
  windowStart: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { attempts: 1, windowStart: now });
    return true;
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    return false;
  }

  entry.attempts++;
  return true;
}

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
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
             request.headers.get('x-real-ip') ||
             'unknown';

  if (!checkRateLimit(ip)) {
    const isFormRequest = !(request.headers.get('content-type') ?? '').includes('application/json');
    if (isFormRequest) {
      return NextResponse.redirect(new URL('/login?error=ratelimit', request.url), { status: 303 });
    }
    return NextResponse.json({ success: false, message: 'Zu viele Versuche. Bitte warten Sie 10 Minuten.' }, { status: 429 });
  }

  try {
    const password = await readPassword(request);
    const isFormRequest = !(request.headers.get('content-type') ?? '').includes('application/json');

    if (!password) {
      return NextResponse.json({ success: false, message: 'Passwort erforderlich' }, { status: 400 });
    }

    const passwordBuffer = Buffer.from(password);
    const expectedBuffer = Buffer.from(APP_PASSWORD_NON_NULL);

    if (passwordBuffer.length !== expectedBuffer.length) {
      return NextResponse.json({ success: false, message: 'Falsches Passwort' }, { status: 401 });
    }

    if (timingSafeEqual(passwordBuffer, expectedBuffer)) {
      const response = isFormRequest
        ? NextResponse.redirect(new URL('/', request.url), { status: 303 })
        : NextResponse.json({ success: true });

      response.cookies.set('yt-viewer-auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
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
