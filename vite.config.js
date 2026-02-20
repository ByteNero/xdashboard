import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import http from 'http'
import https from 'https'

// Custom proxy middleware for CORS bypass
function corsProxyPlugin() {
  return {
    name: 'cors-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Only handle /api/proxy requests
        if (!req.url.startsWith('/api/proxy')) {
          return next();
        }

        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.statusCode = 204;
          res.end();
          return;
        }

        const url = new URL(req.url, 'http://localhost');
        const targetUrl = url.searchParams.get('url');

        if (!targetUrl) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing url parameter' }));
          return;
        }

        // Convert webcal:// to https:// (Apple Calendar uses webcal protocol)
        let normalizedUrl = targetUrl;
        if (normalizedUrl.startsWith('webcal://')) {
          normalizedUrl = normalizedUrl.replace('webcal://', 'https://');
        }

        // Track if response has been sent
        let responseSent = false;

        const sendError = (statusCode, error) => {
          if (responseSent || res.headersSent) return;
          responseSent = true;
          res.statusCode = statusCode;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ error: error.message || error, code: error.code }));
        };

        // Collect request body for POST/PUT requests
        const getRequestBody = () => {
          return new Promise((resolve) => {
            if (req.method === 'GET' || req.method === 'HEAD') {
              resolve(null);
              return;
            }
            const chunks = [];
            req.on('data', chunk => chunks.push(chunk));
            req.on('end', () => resolve(Buffer.concat(chunks)));
          });
        };

        try {
          const parsed = new URL(normalizedUrl);
          const requestBody = await getRequestBody();

          console.log(`[Proxy] ${req.method} -> ${parsed.href}${requestBody ? ` (${requestBody.length} bytes)` : ''}`);

          // Use http/https module for more reliable proxying
          const client = parsed.protocol === 'https:' ? https : http;

          // Check for API key in query params (for services like Overseerr)
          const apiKey = url.searchParams.get('apiKey');
          // Check for bearer token (for Scrypted)
          const token = url.searchParams.get('token');
          // Check for cookie (for cookie-based auth like Scrypted)
          const cookie = url.searchParams.get('cookie');
          // Determine Accept header based on URL (video streams need different Accept)
          const isVideoStream = normalizedUrl.includes('getVideoStream') ||
                               normalizedUrl.includes('mjpeg') ||
                               normalizedUrl.includes('/stream');
          const isCalendar = normalizedUrl.includes('caldav') || normalizedUrl.includes('.ics') || normalizedUrl.includes('calendar');
          const proxyHeaders = {
            'Accept': isVideoStream ? '*/*' : isCalendar ? 'text/calendar, text/plain, */*' : 'application/json',
            'User-Agent': isCalendar
              ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
              : 'UltrawideDashboard/1.0'
          };
          if (apiKey) {
            proxyHeaders['X-Api-Key'] = apiKey;
          }
          if (token) {
            proxyHeaders['Authorization'] = `Bearer ${token}`;
          }
          if (cookie) {
            proxyHeaders['Cookie'] = decodeURIComponent(cookie);
          }

          // Forward custom headers (e.g. trakt-api-version, trakt-api-key)
          const customHeaders = url.searchParams.get('headers');
          if (customHeaders) {
            try {
              const parsed_headers = JSON.parse(decodeURIComponent(customHeaders));
              Object.assign(proxyHeaders, parsed_headers);
            } catch (e) {
              console.error('[Proxy] Failed to parse custom headers:', e.message);
            }
          }

          // Forward Content-Type for POST/PUT requests
          if (requestBody && req.headers['content-type']) {
            proxyHeaders['Content-Type'] = req.headers['content-type'];
            proxyHeaders['Content-Length'] = requestBody.length;
          }

          const proxyReq = client.request({
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method: req.method || 'GET',
            headers: proxyHeaders,
            timeout: 30000,  // Increased timeout for slower services like Docker
            rejectUnauthorized: false  // Allow self-signed certs (common for Scrypted, etc.)
          }, (proxyRes) => {
            if (responseSent || res.headersSent) return;

            console.log(`[Proxy] Response: ${proxyRes.statusCode} from ${parsed.hostname}`);

            // Set response status
            res.statusCode = proxyRes.statusCode;

            // Copy headers (except problematic ones)
            for (const [key, value] of Object.entries(proxyRes.headers)) {
              const lowerKey = key.toLowerCase();
              if (!['content-encoding', 'transfer-encoding', 'connection'].includes(lowerKey)) {
                try { res.setHeader(key, value); } catch (e) {}
              }
            }

            // Add CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', '*');
            res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie, X-Scrypted-Cookie');

            // Also expose the cookie in a custom header (some browsers block Set-Cookie)
            if (proxyRes.headers['set-cookie']) {
              const cookieValue = Array.isArray(proxyRes.headers['set-cookie'])
                ? proxyRes.headers['set-cookie'][0]
                : proxyRes.headers['set-cookie'];
              res.setHeader('X-Scrypted-Cookie', cookieValue);
              console.log('[Proxy] Set-Cookie found:', cookieValue);
            }

            // Check if this is a streaming response (MJPEG, multipart, etc.)
            const contentType = proxyRes.headers['content-type'] || '';
            const isStreaming = contentType.includes('multipart') ||
                               contentType.includes('mjpeg') ||
                               contentType.includes('octet-stream') ||
                               normalizedUrl.includes('getVideoStream');

            if (isStreaming) {
              // Stream directly without buffering for live video
              console.log(`[Proxy] Streaming response (${contentType})`);
              responseSent = true;
              proxyRes.pipe(res);
              proxyRes.on('error', (err) => {
                console.error('[Proxy] Stream error:', err.message);
                if (!res.writableEnded) res.end();
              });
              res.on('close', () => {
                proxyRes.destroy();
              });
            } else {
              // Buffer non-streaming responses
              const chunks = [];
              proxyRes.on('data', chunk => chunks.push(chunk));
              proxyRes.on('end', () => {
                if (responseSent || res.headersSent) return;
                responseSent = true;
                const body = Buffer.concat(chunks);
                res.end(body);
              });
              proxyRes.on('error', (err) => sendError(502, err));
            }
          });

          proxyReq.on('error', (error) => {
            console.error(`[Proxy] Request error: ${error.message}`);
            sendError(502, error);
          });

          proxyReq.on('timeout', () => {
            console.error('[Proxy] Request timeout');
            proxyReq.destroy();
            sendError(504, { message: 'Gateway timeout' });
          });

          // Send request body if present
          if (requestBody) {
            proxyReq.write(requestBody);
          }
          proxyReq.end();

        } catch (error) {
          console.error('[Proxy] Error:', error.message);
          sendError(502, error);
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), corsProxyPlugin()],
  server: {
    host: true,  // Listen on all network interfaces (0.0.0.0)
    proxy: {
      // Proxy settings API to Express backend in dev
      '/api/settings': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
