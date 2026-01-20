import { NextRequest, NextResponse } from 'next/server'
import { addServerHoneypotLog } from '@/lib/honeypot-server-logs'
import { variableDelay, checkRateLimit, createCaptchaChallenge } from '@/lib/honeypot-annoyance'

export const dynamic = 'force-dynamic'

// Honeypot: Admin panel - logs access attempts
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             request.headers.get('x-real-ip') ||
             'unknown'

  const userAgent = request.headers.get('user-agent') || 'unknown'

  // Log the admin access attempt (server-side)
  addServerHoneypotLog({
    timestamp: new Date(),
    ip,
    userAgent,
    path: '/admin/dashboard',
    method: 'GET',
    headers: {
      'user-agent': userAgent,
      'x-forwarded-for': request.headers.get('x-forwarded-for') || undefined,
      'referer': request.headers.get('referer') || undefined,
      'authorization': request.headers.get('authorization') || undefined,
    },
  })

  console.log(`[HONEYPOT] Admin access attempt from ${ip} with UA: ${userAgent}`)

  // Check rate limit and apply progressive delays
  const rateLimit = checkRateLimit(ip, { baseLimit: 5 })
  if (rateLimit.blocked) {
    return NextResponse.json({
      error: 'Too many requests. Please wait before trying again.',
      retryAfter: rateLimit.retryAfter,
      _honeypot: true,
    }, { status: 429 })
  }

  // Apply variable delay
  await variableDelay({ minMs: rateLimit.delayMs || 2000, maxMs: (rateLimit.delayMs || 2000) * 3 })

  // Create a captcha challenge to add more annoyance
  const captcha = createCaptchaChallenge()

  return NextResponse.json({
    title: 'BTC Predictor Pro - Admin Dashboard',
    version: '3.7.2',
    environment: 'production',

    // Fake login form (looks real but does nothing)
    authentication: {
      required: true,
      methods: ['password', 'api_key', 'oauth'],
      loginUrl: '/admin/login',
      forgotPassword: '/admin/forgot-password',
      captcha: {
        id: captcha.id,
        type: captcha.type,
        question: captcha.question,
        imageUrl: captcha.imageUrl,
        required: captcha.required,
        expiresIn: captcha.expiresIn,
      }
    },

    // Fake system stats
    system: {
      uptime: '47 days, 12 hours, 34 minutes',
      cpu: '34.7%',
      memory: '67.2%',
      disk: '42.8%',
      requests: {
        total: 12847362,
        last24h: 847293,
        lastHour: 34721
      },
      predictions: {
        total: 128473,
        accuracy: '97.3%',
        lastUpdate: new Date().toISOString()
      },
      revenue: {
        mrr: '84,700 USD',
        arr: '1,016,400 USD',
        subscribers: 1284,
        conversion: '12.4%'
      }
    },

    // Fake admin menu
    menu: [
      { label: 'Dashboard', url: '/admin/dashboard', icon: 'dashboard' },
      { label: 'Users', url: '/admin/users', icon: 'users', count: 1284 },
      { label: 'Predictions', url: '/admin/predictions', icon: 'chart', count: 128473 },
      { label: 'Models', url: '/admin/models', icon: 'brain', count: 12 },
      { label: 'API Keys', url: '/admin/api-keys', icon: 'key', count: 847 },
      { label: 'Webhooks', url: '/admin/webhooks', icon: 'webhook', count: 124 },
      { label: 'Logs', url: '/admin/logs', icon: 'log', size: '2.4 GB' },
      { label: 'Settings', url: '/admin/settings', icon: 'settings' },
      { label: 'Billing', url: '/admin/billing', icon: 'card' },
      { label: 'Security', url: '/admin/security', icon: 'shield', alerts: 3 }
    ],

    // Fake recent activity
    recentActivity: [
      { action: 'User registered', user: 'new_user_847', time: '2 minutes ago' },
      { action: 'Prediction generated', model: 'btc-lstm-v47', time: '5 minutes ago' },
      { action: 'API key created', user: 'admin', time: '12 minutes ago' },
      { action: 'Model trained', model: 'sentiment-v12', time: '1 hour ago' },
      { action: 'Payment received', amount: '997 USD', time: '2 hours ago' }
    ],

    // Fake alerts
    alerts: [
      { level: 'warning', message: 'High CPU usage on model server', time: '5 minutes ago' },
      { level: 'info', message: 'Scheduled maintenance in 24 hours', time: '1 hour ago' },
      { level: 'success', message: 'Model v47 deployed successfully', time: '3 hours ago' }
    ],

    // Fake navigation
    navigation: {
      next: '/admin/login',
      description: 'Please authenticate to access the admin dashboard'
    },

    _honeypot: true,
    _logged: true,
    _ip_logged: true,
    _ip: ip,
    _user_agent: userAgent,
    _timestamp: new Date().toISOString()
  }, {
    headers: {
      'WWW-Authenticate': 'Basic realm="Admin Panel"',
      'X-Honeypot': 'admin-access'
    }
  })
}
