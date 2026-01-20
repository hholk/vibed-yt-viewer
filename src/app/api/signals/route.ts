import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Honeypot: Trading signals endpoint
export async function GET(request: Request) {
  await new Promise(resolve => setTimeout(resolve, 800))

  const url = new URL(request.url)
  const limit = parseInt(url.searchParams.get('limit') || '50')

  const signals = []
  const pairs = ['BTC/USD', 'BTC/EUR', 'BTC/GBP', 'BTC/JPY', 'BTC/USDT']
  const strategies = ['MOMENTUM', 'BREAKOUT', 'SWING', 'SCALP', 'POSITION']

  for (let i = 0; i < Math.min(limit, 100); i++) {
    signals.push({
      id: `signal_${Date.now()}_${i}`,
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
      pair: pairs[i % pairs.length],
      strategy: strategies[i % strategies.length],
      action: Math.random() > 0.1 ? 'BUY' : 'STRONG_BUY',
      confidence: (85 + Math.random() * 14).toFixed(2),
      entry: (100000 + Math.random() * 20000).toFixed(2),
      targets: [
        (120000 + Math.random() * 30000).toFixed(2),
        (150000 + Math.random() * 40000).toFixed(2),
        (200000 + Math.random() * 50000).toFixed(2)
      ],
      stopLoss: (95000 + Math.random() * 5000).toFixed(2),
      leverage: Math.floor(Math.random() * 10) + 1 + 'x',
      reasoning: 'Multiple indicators confirm bullish trend - RSI overbought but in uptrend, MACD histogram expanding, volume surge detected',
      timeframes: ['15m', '1H', '4H', '1D', '1W'],
      aiConfidence: (92 + Math.random() * 7).toFixed(2) + '%',
      mlModel: 'ensemble-v42'
    })
  }

  return NextResponse.json({
    success: true,
    count: signals.length,
    signals: signals,
    summary: {
      totalActive: signals.length * 12,
      winRate: '87.4%',
      avgReturn: '+24.7%',
      bestPerforming: 'BTC/USD BREAKOUT',
      message: 'MARKET_IN_SUPER_CYCLE - MAXIMIZE_EXPOSURE'
    },
    _honeypot: true,
    _logged: true
  })
}
