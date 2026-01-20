/**
 * Shared handler for WordPress wlwmanifest.xml honeypot
 *
 * The wlwmanifest.xml file is probed by scanners looking for WordPress installations.
 * This honeypot logs the access and returns a fake XML manifest.
 */

import { NextRequest } from 'next/server'
import { addServerHoneypotLog } from './honeypot-server-logs'
import { variableDelay, checkRateLimit } from './honeypot-annoyance'

export async function handleWlwmanifestHoneypot(request: NextRequest, path: string) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') ||
            'unknown'

  const userAgent = request.headers.get('user-agent') || 'unknown'

  // Log the WordPress probe (server-side)
  addServerHoneypotLog({
    timestamp: new Date(),
    ip,
    userAgent,
    path,
    method: 'GET',
    headers: {
      'user-agent': userAgent,
      'x-forwarded-for': request.headers.get('x-forwarded-for') || undefined,
    },
  })

  console.log(`[HONEYPOT] WP wlwmanifest.xml probe from ${ip} -> ${path}`)

  // Apply variable delay with rate limiting
  const rateLimit = checkRateLimit(ip)
  await variableDelay({ minMs: 500, maxMs: rateLimit.delayMs + 3000 })

  // Return a fake wlwmanifest.xml
  const fakeXML = `<?xml version="1.0" encoding="utf-8" ?>
<manifest xmlns="http://schemas.microsoft.com/wlw/manifest/weblog">
  <options>
    <clientType>WordPress</clientType>
    <supportsHtmlType>html</supportsHtmlType>
    <supportsScripts>yes</supportsScripts>
    <supportsEmbeds>yes</supportsEmbeds>
  </options>
  <weblog>
    <serviceName>WordPress Blog</serviceName>
    <homepage>http://wordpress.org/</homepage>
    <adminUrl>/wp-admin</adminUrl>
    <postEditingUrl>/wp-admin/post.php?action=edit&amp;post=\${post-id}</postEditingUrl>
  </weblog>
  <buttons>
    <button>
      <id>1</id>
      <text>WordPress Admin</text>
      <imageUrl>/wp-admin/images/wordpress-logo.png</imageUrl>
      <clickUrl>/wp-admin/</clickUrl>
    </button>
  </buttons>
</manifest>`

  return new Response(fakeXML, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Length': fakeXML.length.toString(),
      'Cache-Control': 'public, max-age=3600'
    }
  })
}
