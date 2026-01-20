import { NextRequest } from 'next/server'
import { handleWlwmanifestHoneypot } from '@/lib/honeypot-wlwmanifest'

export const dynamic = 'force-dynamic'

// Honeypot: WordPress wlwmanifest.xml probe
export async function GET(request: NextRequest) {
  return handleWlwmanifestHoneypot(request, '/test/wp-includes/wlwmanifest.xml')
}
