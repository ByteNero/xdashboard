import express from 'express';
import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Data directory - use /data in Docker, local data/ otherwise
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Middleware
app.use(express.json({ limit: '10mb' }));

// CORS for development
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  next();
});

// ============================================
// Settings API
// ============================================

// GET /api/settings - Load settings
app.get('/api/settings', (req, res) => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      const settings = JSON.parse(data);
      console.log('[Settings] Loaded settings from disk');
      res.json(settings);
    } else {
      console.log('[Settings] No settings file found, returning null');
      res.json(null);
    }
  } catch (error) {
    console.error('[Settings] Failed to read settings:', error.message);
    res.status(500).json({ error: 'Failed to read settings' });
  }
});

// POST /api/settings - Save settings
app.post('/api/settings', (req, res) => {
  try {
    const data = req.body;
    if (!data || (!data.panels && !data.integrations && !data.settings)) {
      return res.status(400).json({ error: 'Invalid settings data' });
    }

    // Write atomically: write to temp file, then rename
    const tempFile = SETTINGS_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, SETTINGS_FILE);

    console.log('[Settings] Saved settings to disk');
    res.json({ success: true, savedAt: new Date().toISOString() });
  } catch (error) {
    console.error('[Settings] Failed to save settings:', error.message);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// ============================================
// CORS Proxy
// ============================================

app.all('/api/proxy', async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }

  // Convert webcal:// to https://
  let normalizedUrl = targetUrl;
  if (normalizedUrl.startsWith('webcal://')) {
    normalizedUrl = normalizedUrl.replace('webcal://', 'https://');
  }

  let responseSent = false;

  const sendError = (statusCode, error) => {
    if (responseSent || res.headersSent) return;
    responseSent = true;
    res.status(statusCode).json({ error: error.message || error, code: error.code });
  };

  // Collect request body
  const getRequestBody = () => {
    return new Promise((resolve) => {
      if (req.method === 'GET' || req.method === 'HEAD') {
        resolve(null);
        return;
      }
      // Express already parsed JSON body, but we need raw for forwarding
      if (req.body && Object.keys(req.body).length > 0) {
        resolve(Buffer.from(JSON.stringify(req.body)));
        return;
      }
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => resolve(chunks.length > 0 ? Buffer.concat(chunks) : null));
    });
  };

  try {
    const parsed = new URL(normalizedUrl);
    const requestBody = await getRequestBody();

    console.log(`[Proxy] ${req.method} -> ${parsed.href}${requestBody ? ` (${requestBody.length} bytes)` : ''}`);

    const client = parsed.protocol === 'https:' ? https : http;

    // Build headers
    const apiKey = url.searchParams.get('apiKey');
    const token = url.searchParams.get('token');
    const cookie = url.searchParams.get('cookie');

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

    if (apiKey) proxyHeaders['X-Api-Key'] = apiKey;
    if (token) proxyHeaders['Authorization'] = `Bearer ${token}`;
    if (cookie) proxyHeaders['Cookie'] = decodeURIComponent(cookie);

    // Custom headers
    const customHeaders = url.searchParams.get('headers');
    if (customHeaders) {
      try {
        const parsedHeaders = JSON.parse(decodeURIComponent(customHeaders));
        Object.assign(proxyHeaders, parsedHeaders);
      } catch (e) {
        console.error('[Proxy] Failed to parse custom headers:', e.message);
      }
    }

    // Forward Content-Type for POST/PUT
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
      timeout: 30000,
      rejectUnauthorized: false
    }, (proxyRes) => {
      if (responseSent || res.headersSent) return;

      console.log(`[Proxy] Response: ${proxyRes.statusCode} from ${parsed.hostname}`);

      res.statusCode = proxyRes.statusCode;

      // Copy headers
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        const lowerKey = key.toLowerCase();
        if (!['content-encoding', 'transfer-encoding', 'connection'].includes(lowerKey)) {
          try { res.setHeader(key, value); } catch (e) {}
        }
      }

      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie, X-Scrypted-Cookie');

      if (proxyRes.headers['set-cookie']) {
        const cookieValue = Array.isArray(proxyRes.headers['set-cookie'])
          ? proxyRes.headers['set-cookie'][0]
          : proxyRes.headers['set-cookie'];
        res.setHeader('X-Scrypted-Cookie', cookieValue);
        console.log('[Proxy] Set-Cookie found:', cookieValue);
      }

      const contentType = proxyRes.headers['content-type'] || '';
      const isStreaming = contentType.includes('multipart') ||
                         contentType.includes('mjpeg') ||
                         contentType.includes('octet-stream') ||
                         normalizedUrl.includes('getVideoStream');

      if (isStreaming) {
        console.log(`[Proxy] Streaming response (${contentType})`);
        responseSent = true;
        proxyRes.pipe(res);
        proxyRes.on('error', (err) => {
          console.error('[Proxy] Stream error:', err.message);
          if (!res.writableEnded) res.end();
        });
        res.on('close', () => proxyRes.destroy());
      } else {
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

    if (requestBody) proxyReq.write(requestBody);
    proxyReq.end();

  } catch (error) {
    console.error('[Proxy] Error:', error.message);
    sendError(502, error);
  }
});

// ============================================
// Static files (production only)
// ============================================

const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
  console.log('[Server] Serving static files from dist/');
}

// ============================================
// Start server
// ============================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Ultrawide Dashboard running on http://0.0.0.0:${PORT}`);
  console.log(`[Server] Settings stored in: ${SETTINGS_FILE}`);
});
