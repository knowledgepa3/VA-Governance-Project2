/**
 * Simple CORS Proxy Server for SAM.gov API
 *
 * Run with: node server/proxy.js
 * This proxies requests to SAM.gov to bypass CORS restrictions
 */

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3001;

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Only handle /api/sam endpoint
  if (!req.url.startsWith('/api/sam')) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  // Extract the SAM.gov URL from query params
  const parsedUrl = url.parse(req.url, true);
  const samUrl = parsedUrl.query.url;

  if (!samUrl) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'Missing url parameter' }));
    return;
  }

  console.log('[Proxy] Fetching:', samUrl.substring(0, 100) + '...');

  // Make request to SAM.gov
  https.get(samUrl, (samRes) => {
    let data = '';

    samRes.on('data', chunk => {
      data += chunk;
    });

    samRes.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(samRes.statusCode);
      res.end(data);
      console.log('[Proxy] Response sent, status:', samRes.statusCode);
    });

  }).on('error', (err) => {
    console.error('[Proxy] Error:', err.message);
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
  });
});

server.listen(PORT, () => {
  console.log(`[SAM.gov Proxy] Running on http://localhost:${PORT}`);
  console.log('[SAM.gov Proxy] Use: http://localhost:3001/api/sam?url=<encoded-sam-url>');
});
