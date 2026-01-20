import { NextRequest, NextResponse } from 'next/server'
import { addServerHoneypotLog } from '@/lib/honeypot-server-logs'
import { variableDelay, checkRateLimit } from '@/lib/honeypot-annoyance'

export const dynamic = 'force-dynamic'

// Honeypot: Fake config that looks juicy but contains useless data
export async function GET(request: NextRequest) {
  // Extract scanner info
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') ||
            'unknown'

  const userAgent = request.headers.get('user-agent') || 'unknown'

  // Log the honeypot access (server-side)
  addServerHoneypotLog({
    timestamp: new Date(),
    ip,
    userAgent,
    path: '/api/config.json',
    method: 'GET',
    headers: {
      'user-agent': userAgent,
      'x-forwarded-for': request.headers.get('x-forwarded-for') || undefined,
      'referer': request.headers.get('referer') || undefined,
    },
  })

  // Check rate limit and apply progressive delays
  const rateLimit = checkRateLimit(ip)
  if (rateLimit.delayMs > 0) {
    await variableDelay({ minMs: rateLimit.delayMs, maxMs: rateLimit.delayMs * 2 })
  } else {
    // Intentional delay to waste scanner time
    await variableDelay({ minMs: 2000, maxMs: 10000 })
  }

  return NextResponse.json({
    appName: "BTC-Predictor-Pro",
    version: "3.7.2",
    environment: process.env.NODE_ENV || 'development',

    // Juicy-looking but fake API keys
    integrations: {
      openai: {
        apiKey: "sk-" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        model: "gpt-4-turbo-preview",
        endpoint: "https://api.openai.com/v1"
      },
      coinbase: {
        apiKey: "cb_prod_" + Math.random().toString(36).substring(2, 20),
        secret: "***REDACTED***",
        webhookUrl: "/api/webhooks/coinbase"
      },
      binance: {
        apiKey: "prod_key_" + Math.random().toString(36).substring(2, 25),
        testnet: false
      }
    },

    // Fake database config
    database: {
      host: "crypto-db.internal",
      port: 5432,
      name: "btc_predictions_v2",
      ssl: true,
      poolSize: 50,
      credentials: {
        user: "prediction_service",
        password: "***ENCRYPTED***"
      }
    },

    // Fake ML model config
    predictionEngine: {
      model: "btc-lstm-v47",
      accuracy: "97.3%",
      retrainInterval: "6h",
      features: ["sentiment", "onchain", "technical", "whale_alerts"],
      gpuEnabled: true
    },

    // Fake admin panel (honeypot)
    adminPanel: {
      enabled: true,
      path: "/admin/dashboard",
      authRequired: true,
      sessionTimeout: 3600
    },

    // Fake webhook endpoints
    webhooks: {
      slack: "https://hooks.slack.com/services/T00/B00/XXX",
      discord: "***REDACTED***",
      telegram: "***REDACTED***"
    },

    // Fake cache config
    cache: {
      redis: {
        host: "redis.internal",
        port: 6379,
        password: "***REDACTED***",
        ttl: 300
      }
    },

    // WARNING: This data is entirely fake - honeypot for security scanners
    _honeypot: true,
    _logged: true,
    _ip_logged: true
  }, {
    headers: {
      'X-Response-Time': Math.random().toString(36),
      'Server': 'BTC-Predictor-API/3.7.2'
    }
  })
}
