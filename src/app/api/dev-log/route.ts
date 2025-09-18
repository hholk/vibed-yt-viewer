import { NextResponse } from 'next/server';
import { appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';

interface DevLogRequestBody {
  timestamp?: string;
  level?: 'info' | 'warn' | 'error' | 'debug';
  message?: string;
  payload?: Record<string, unknown> | null;
}

function normaliseEntry(body: DevLogRequestBody) {
  return {
    timestamp: body.timestamp ?? new Date().toISOString(),
    level: body.level ?? 'info',
    message: body.message ?? 'client-log',
    payload: body.payload ?? null,
  };
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const body = (await request.json()) as DevLogRequestBody;
    const entry = normaliseEntry(body);
    const line = `${entry.timestamp} [${entry.level}] ${entry.message}${
      entry.payload ? ` ${JSON.stringify(entry.payload)}` : ''
    }\n`;

    const logPath = resolve(process.cwd(), 'server.log');
    await appendFile(logPath, line, { encoding: 'utf8' });

    console.log('[dev-log endpoint]', line.trim());
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[dev-log endpoint] failed to write log', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
