const DEV_LOG_ENDPOINT = '/api/dev-log';

interface DevLogPayload {
  message: string;
  payload?: Record<string, unknown> | null;
  level?: 'info' | 'warn' | 'error' | 'debug';
}

function formatEntry({ message, payload, level }: DevLogPayload) {
  return {
    timestamp: new Date().toISOString(),
    level: level ?? 'info',
    message,
    payload: payload ?? null,
  };
}

async function writeServerLog(entry: ReturnType<typeof formatEntry>) {
  try {
    // Only run on server side
    if (typeof window !== 'undefined') return;

    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const logPath = path.resolve(process.cwd(), 'server.log');
    const line = `${entry.timestamp} [${entry.level}] ${entry.message}${
      entry.payload ? ` ${JSON.stringify(entry.payload)}` : ''
    }\n`;
    await fs.appendFile(logPath, line, { encoding: 'utf8' });
  } catch (error) {
    console.warn('[dev-log] Failed to append server log entry', error);
  }
}

export async function logDevEvent(payload: DevLogPayload) {
  if (process.env.NODE_ENV === 'production') return;

  const entry = formatEntry(payload);

  if (typeof window === 'undefined') {
    console.log('[dev-log]', entry);
    await writeServerLog(entry);
    return;
  }

  try {
    await fetch(DEV_LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
      keepalive: true,
    });
  } catch (error) {
    console.warn('[dev-log] Failed to send entry to server', error);
  }
}

export async function logDevError(message: string, payload?: Record<string, unknown>) {
  await logDevEvent({ message, payload: payload ?? null, level: 'error' });
}

export async function logDevInfo(message: string, payload?: Record<string, unknown>) {
  await logDevEvent({ message, payload: payload ?? null, level: 'info' });
}
