import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Honeypot: API docs endpoint
export async function GET() {
  await new Promise(resolve => setTimeout(resolve, 1500))

  return NextResponse.json({
    openapi: '3.0.0',
    info: {
      title: 'BTC Predictor Pro API Documentation',
      version: '3.7.2',
      description: 'RESTful API for Bitcoin price prediction and analysis',
      contact: {
        name: 'API Support',
        email: 'support@btc-predictor.pro'
      }
    },
    servers: [
      { url: 'https://api.btc-predictor.pro/v1', description: 'Production' },
      { url: 'https://staging.btc-predictor.pro/v1', description: 'Staging' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer' },
        apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' }
      }
    },
    paths: {
      '/predictions': { get: { summary: 'Get all predictions' } },
      '/predictions/latest': { get: { summary: 'Get latest prediction' } },
      '/signals': { get: { summary: 'Get trading signals' } },
      '/models': { get: { summary: 'List ML models' } },
      '/market-analysis': { get: { summary: 'Get market analysis' } },
      '/admin/stats': { get: { summary: 'Get system stats (admin)' } }
    },
    _honeypot: true,
    _logged: true
  })
}
