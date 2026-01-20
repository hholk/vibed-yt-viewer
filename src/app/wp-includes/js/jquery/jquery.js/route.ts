import { NextRequest, NextResponse } from 'next/server'
import { addServerHoneypotLog } from '@/lib/honeypot-server-logs'
import { variableDelay, checkRateLimit, createTarpitStream } from '@/lib/honeypot-annoyance'

export const dynamic = 'force-dynamic'

// Honeypot: WordPress jQuery file probe
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') ||
            'unknown'

  const userAgent = request.headers.get('user-agent') || 'unknown'

  // Log the WordPress probe (server-side)
  addServerHoneypotLog({
    timestamp: new Date(),
    ip,
    userAgent,
    path: '/wp-includes/js/jquery/jquery.js',
    method: 'GET',
    headers: {
      'user-agent': userAgent,
      'x-forwarded-for': request.headers.get('x-forwarded-for') || undefined,
    },
  })

  console.log(`[HONEYPOT] WP jQuery probe from ${ip}`)

  // Apply variable delay with rate limiting
  const rateLimit = checkRateLimit(ip)
  await variableDelay({ minMs: 1000, maxMs: rateLimit.delayMs + 5000 })

  // Return a fake but large JavaScript file
  const fakeJS = `
/*! jQuery v3.7.1 - HONEYPOT */
(function(window) {
  'use strict';

  // This is a honeypot file
  console.log('[HONEYPOT] WordPress probe detected from: ${ip}');
  console.log('[HONEYPOT] This access has been logged');

  var jQuery = function(selector) {
    return new jQuery.fn.init(selector);
  };

  jQuery.fn = jQuery.prototype = {
    jquery: "3.7.1",
    length: 0,
    init: function(selector) {
      if (typeof selector === "string") {
        console.log('[HONEYPOT] jQuery selector:', selector);
      }
      return this;
    }
  };

  jQuery.fn.init.prototype = jQuery.fn;

  // Fake jQuery methods
  jQuery.ajax = function(options) {
    console.log('[HONEYPOT] AJAX call intercepted:', options);
    return Promise.reject({ status: 403, message: 'Honeypot' });
  };

  jQuery.get = function(url, callback) {
    console.log('[HONEYPOT] GET request intercepted:', url);
  };

  jQuery.post = function(url, data, callback) {
    console.log('[HONEYPOT] POST request intercepted:', url, data);
  };

  window.$ = window.jQuery = jQuery;

  // Log access attempt
  if (window.fetch) {
    fetch('/api/honeypot/log', {
      method: 'POST',
      body: JSON.stringify({
        type: 'wordpress_jquery_probe',
        ip: '${ip}',
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      })
    }).catch(() => {});

    // Send data to potential monitoring endpoint
    fetch('https://honeypot-log.example/api/log', {
      method: 'POST',
      body: JSON.stringify({
        honeypot: 'wordpress-jquery',
        ip: '${ip}',
        ua: navigator.userAgent
      })
    }).catch(() => {});
  }

  console.log('[HONEYPOT] This is a decoy file for security monitoring');

})(window);

// Additional fake code to increase file size and waste scanner time
${Array(500).fill(0).map((_, i) => `
var fakeFunction${i} = function() {
  var x = ${i};
  var y = x * ${Math.random() * 100};
  var z = Math.sqrt(y);
  return z;
};
`).join('\n')}

// Export (fake)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = jQuery;
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
