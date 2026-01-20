import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Honeypot: Swagger JSON at /api/v1/swagger.json
export async function GET() {
  // Re-use the main swagger honeypot
  return fetch(new Request(new URL('/api/swagger.json', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000')))
}
