import { NextRequest, NextResponse } from 'next/server'
import { addServerHoneypotLog } from '@/lib/honeypot-server-logs'
import { variableDelay, checkRateLimit } from '@/lib/honeypot-annoyance'

export const dynamic = 'force-dynamic'

// Honeypot: Joomla core.js probe
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') ||
            'unknown'

  const userAgent = request.headers.get('user-agent') || 'unknown'

  // Log the Joomla probe (server-side)
  addServerHoneypotLog({
    timestamp: new Date(),
    ip,
    userAgent,
    path: '/media/system/js/core.js',
    method: 'GET',
    headers: {
      'user-agent': userAgent,
      'x-forwarded-for': request.headers.get('x-forwarded-for') || undefined,
    },
  })

  console.log(`[HONEYPOT] Joomla core.js probe from ${ip}`)

  // Apply variable delay with rate limiting
  const rateLimit = checkRateLimit(ip)
  await variableDelay({ minMs: 1000, maxMs: rateLimit.delayMs + 5000 })

  const fakeJS = `
/**
 * Joomla Core - HONEYPOT FILE
 * @version  4.4.0
 * @package  Joomla.API
 *
 * SECURITY ALERT: This is a honeypot file
 */

'use strict';

// Log the probe
console.log('[HONEYPOT] Joomla CMS probe detected from: ${ip}');
console.log('[HONEYPOT] Access attempt logged and timestamped');

// Fake Joomla core object
var Joomla = {
  version: '4.4.0',
  token: '${Math.random().toString(36).substring(2, 15)}',

  // Fake initialization
  init: function() {
    console.log('[HONEYPOT] Joomla initialization attempt');
    this.logProbe();
  },

  // Log the probe attempt
  logProbe: function() {
    var data = {
      type: 'joomla_core_probe',
      ip: '${ip}',
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      honeypot: true
    };

    // Send to logging endpoint
    fetch('/api/honeypot/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(function() {});

    // External monitoring
    fetch('https://security-monitor.example/log', {
      method: 'POST',
      body: JSON.stringify(data)
    }).catch(function() {});
  },

  // Fake Joomla API methods
  submitform: function(task, form) {
    console.log('[HONEYPOT] Form submission intercepted:', task, form);
  },

  submitbutton: function(task) {
    console.log('[HONEYPOT] Button click intercepted:', task);
  },

  // Fake token methods
  getToken: function() {
    return this.token;
  },

  // Fake options
  Options: {
    set: function(key, value) {
      console.log('[HONEYPOT] Option set:', key, value);
    },
    get: function(key) {
      return null;
    }
  }
};

// Initialize honeypot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    Joomla.init();
  });
} else {
  Joomla.init();
}

${Array(300).fill(0).map((_, i) => `
// Fake Joomla function ${i}
Joomla.fakeFunction${i} = function() {
  var result = ${Math.random() * 1000};
  return result * ${i};
};
`).join('\n')}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Joomla;
}
  `.trim()

  return new NextResponse(fakeJS, {
    headers: {
      'Content-Type': 'application/javascript',
      'Content-Length': fakeJS.length.toString(),
      'Cache-Control': 'public, max-age=3600'
    }
  })
}
