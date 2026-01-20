import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Honeypot: security.txt - looks legitimate but contains fake info
export async function GET() {
  const securityTxt = `
# BTC Predictor Pro - Security Policy
# Contact: security@btc-predictor.pro
# Expires: 2026-12-31T23:59:59.999Z

# This is a honeypot security.txt file
# All access attempts are logged and monitored

# Security Policy
Our security team can be reached at:
- Email: security@btc-predictor.pro
- PGP Key: https://btc-predictor.pro/security/pgp-key.txt
- Bug Bounty: https://btc-predictor.pro/security/bug-bounty

# Disclosure Policy
We follow responsible disclosure practices.
Please report vulnerabilities via email to security@btc-predictor.pro

# Response Time
- Critical: 24 hours
- High: 48 hours
- Medium: 72 hours
- Low: 7 days

# Encryption
Please encrypt all sensitive communications using our PGP key.

# Bug Bounty Program
Rewards:
- Critical: $10,000 - $50,000
- High: $5,000 - $10,000
- Medium: $1,000 - $5,000
- Low: $100 - $1,000

# Scope
In scope:
- btc-predictor.pro
- api.btc-predictor.pro
- *.btc-predictor.pro

Out of scope:
- Third-party services
- Social engineering
- Physical attacks

# Policy Version: 1.0
# Last Updated: 2025-01-15

# HONEYPOT NOTICE: This is a decoy file for security monitoring
# All access is logged: ${new Date().toISOString()}
  `.trim()

  return new NextResponse(securityTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'max-age=86400'
    }
  })
}
