import { NextRequest, NextResponse } from 'next/server'
import { addServerHoneypotLog } from '@/lib/honeypot-server-logs'
import { variableDelay, checkRateLimit } from '@/lib/honeypot-annoyance'

export const dynamic = 'force-dynamic'

// Honeypot: Elaborate Swagger/OpenAPI docs with hundreds of fake endpoints
export async function GET(request: NextRequest) {
  // Log the swagger access (server-side)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') ||
            'unknown'

  const userAgent = request.headers.get('user-agent') || 'unknown'

  addServerHoneypotLog({
    timestamp: new Date(),
    ip,
    userAgent,
    path: '/api/swagger.json',
    method: 'GET',
    headers: {
      'user-agent': userAgent,
      'x-forwarded-for': request.headers.get('x-forwarded-for') || undefined,
    },
  })

  // Apply variable delay and rate limiting
  const rateLimit = checkRateLimit(ip)
  await variableDelay({ minMs: 1500, maxMs: rateLimit.delayMs + 5000 })

  const fakeEndpoints = []
  const operations = ['get', 'post', 'put', 'delete', 'patch']

  // Generate 100 fake endpoints to waste parser time
  const resources = [
    'predictions', 'signals', 'alerts', 'whales', 'sentiment',
    'technical', 'fundamental', 'onchain', 'markets', 'trades',
    'orders', 'positions', 'portfolio', 'risk', 'models',
    'datasets', 'features', 'training', 'backtest', 'optimize',
    'deployments', 'webhooks', 'notifications', 'users', 'auth'
  ]

  let id = 1
  for (const resource of resources) {
    for (const op of operations) {
      fakeEndpoints.push({
        id: id++,
        path: `/api/v1/${resource}`,
        method: op,
        summary: `${op.toUpperCase()} ${resource} - Bitcoin prediction and analysis`,
        description: `Advanced ${resource} endpoint for BTC price prediction using ML models`,
        parameters: [
          {
            name: 'authorization',
            in: 'header',
            required: true,
            schema: { type: 'string', example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
          },
          {
            name: 'X-API-Key',
            in: 'header',
            required: true,
            schema: { type: 'string', example: 'sk_prod_xxxxxxxxxxxxx' }
          }
        ],
        responses: {
          '200': { description: 'Success' },
          '401': { description: 'Unauthorized' },
          '429': { description: 'Rate limited' }
        }
      })
    }
  }

  // Add nested endpoints
  for (let i = 1; i <= 50; i++) {
    fakeEndpoints.push({
      id: id++,
      path: `/api/v1/predictions/${i}/backtest`,
      method: 'get',
      summary: `Get backtest results for prediction #${i}`,
      parameters: [
        { name: 'authorization', in: 'header', required: true }
      ],
      responses: { '200': { description: 'Backtest results' } }
    })

    fakeEndpoints.push({
      id: id++,
      path: `/api/v1/models/${i}/evaluate`,
      method: 'post',
      summary: `Evaluate model #${i} performance`,
      parameters: [
        { name: 'authorization', in: 'header', required: true },
        { name: 'dataset', in: 'body', required: true }
      ],
      responses: { '200': { description: 'Evaluation metrics' } }
    })
  }

  return NextResponse.json({
    openapi: '3.0.0',
    info: {
      title: 'BTC Predictor Pro API',
      version: '3.7.2',
      description: 'Advanced Bitcoin price prediction using machine learning',
      contact: {
        name: 'API Support',
        email: 'api@btc-predictor.pro',
        url: 'https://btc-predictor.pro/support'
      },
      license: {
        name: 'PROPRIETARY',
        url: 'https://btc-predictor.pro/license'
      }
    },
    servers: [
      { url: 'https://api.btc-predictor.pro/v1', description: 'Production' },
      { url: 'https://staging-api.btc-predictor.pro/v1', description: 'Staging' },
      { url: 'http://localhost:3000/api/v1', description: 'Development' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      },
      schemas: {
        Prediction: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            symbol: { type: 'string', example: 'BTC/USD' },
            timestamp: { type: 'string', format: 'date-time' },
            predictedPrice: { type: 'number' },
            confidence: { type: 'number' },
            timeframe: { type: 'string' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            code: { type: 'integer' }
          }
        }
      }
    },
    paths: {
      '/predictions': {
        get: {
          summary: 'Get all predictions',
          tags: ['Predictions'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
            { name: 'offset', in: 'query', schema: { type: 'integer' } }
          ],
          responses: {
            '200': {
              description: 'List of predictions',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Prediction' }
                  }
                }
              }
            }
          }
        }
      },
      '/predictions/latest': {
        get: {
          summary: 'Get latest BTC prediction',
          tags: ['Predictions'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Latest prediction',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Prediction' }
                }
              }
            }
          }
        }
      },
      '/signals': {
        get: {
          summary: 'Get trading signals',
          tags: ['Signals'],
          security: [{ apiKey: [] }],
          responses: {
            '200': { description: 'Trading signals' }
          }
        }
      },
      '/models/train': {
        post: {
          summary: 'Train new prediction model',
          tags: ['Models'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    dataset: { type: 'string' },
                    epochs: { type: 'integer' },
                    learningRate: { type: 'number' }
                  }
                }
              }
            }
          },
          responses: {
            '201': { description: 'Model training started' }
          }
        }
      },
      '/admin/stats': {
        get: {
          summary: 'Get system statistics (admin only)',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'System stats' },
            '403': { description: 'Forbidden - admin access required' }
          }
        }
      },
      '/webhooks': {
        post: {
          summary: 'Register webhook',
          tags: ['Webhooks'],
          security: [{ apiKey: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    url: { type: 'string', format: 'uri' },
                    events: { type: 'array', items: { type: 'string' } },
                    secret: { type: 'string' }
                  },
                  required: ['url', 'events']
                }
              }
            }
          },
          responses: {
            '201': { description: 'Webhook registered' }
          }
        }
      }
    },
    // Add all the fake endpoints to waste parser time
    'x-endpoints': fakeEndpoints,
    'x-total-endpoints': fakeEndpoints.length,
    _honeypot: true,
    _logged: true
  }, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Version': '3.7.2'
    }
  })
}
