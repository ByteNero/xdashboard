import express from 'express';
import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const GO2RTC_URL = process.env.GO2RTC_URL || 'http://localhost:1984';

// Data directory - use /data in Docker, local data/ otherwise
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Ensure data directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
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
// go2rtc Proxy — stream management + MSE/WebRTC
// ============================================

// Proxy go2rtc REST API (streams management, snapshots, etc.)
app.all('/go2rtc/*', async (req, res) => {
  const go2rtcPath = req.url.replace('/go2rtc', '');
  const targetUrl = `${GO2RTC_URL}${go2rtcPath}`;

  console.log(`[go2rtc] ${req.method} -> ${targetUrl}`);

  try {
    const parsed = new URL(targetUrl);
    const client = parsed.protocol === 'https:' ? https : http;

    // Forward body for POST/PUT
    let body = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = req.body ? Buffer.from(JSON.stringify(req.body)) : null;
    }

    const headers = { 'Content-Type': 'application/json' };
    if (body) headers['Content-Length'] = body.length;

    const proxyReq = client.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: req.method,
      headers,
      timeout: 10000
    }, (proxyRes) => {
      res.statusCode = proxyRes.statusCode;
      // Copy headers, but skip problematic ones
      const skipHeaders = ['content-encoding', 'transfer-encoding', 'connection', 'x-content-type-options'];
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        const lk = key.toLowerCase();
        if (!skipHeaders.includes(lk)) {
          try { res.setHeader(key, value); } catch (e) {}
        }
      }
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Ensure correct Content-Type for JS files (go2rtc may not set it properly)
      const reqPath = parsed.pathname.toLowerCase();
      if (reqPath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (reqPath.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
      }

      // Stream if needed (video-rtc.js, MP4 streams, etc.)
      const ct = proxyRes.headers['content-type'] || '';
      if (ct.includes('javascript') || ct.includes('html') || ct.includes('json') || ct.includes('text')) {
        const chunks = [];
        proxyRes.on('data', c => chunks.push(c));
        proxyRes.on('end', () => res.end(Buffer.concat(chunks)));
      } else {
        proxyRes.pipe(res);
        res.on('close', () => proxyRes.destroy());
      }
    });

    proxyReq.on('error', (err) => {
      console.error(`[go2rtc] Proxy error: ${err.message}`);
      if (!res.headersSent) res.status(502).json({ error: err.message });
    });

    if (body) proxyReq.write(body);
    proxyReq.end();
  } catch (err) {
    console.error(`[go2rtc] Error: ${err.message}`);
    if (!res.headersSent) res.status(502).json({ error: err.message });
  }
});

// API to add/update RTSP streams to go2rtc dynamically
app.post('/api/go2rtc/streams', async (req, res) => {
  const { streams } = req.body; // { "camera_name": "rtspx://...", ... }
  if (!streams || typeof streams !== 'object') {
    return res.status(400).json({ error: 'streams object required' });
  }

  console.log(`[go2rtc] Configuring ${Object.keys(streams).length} streams`);
  const results = {};

  for (const [name, source] of Object.entries(streams)) {
    try {
      // go2rtc expects: PUT /api/streams?name=NAME&src=SOURCE_URL (no body)
      const putUrl = `${GO2RTC_URL}/api/streams?name=${encodeURIComponent(name)}&src=${encodeURIComponent(source)}`;
      const parsed = new URL(putUrl);

      console.log(`[go2rtc] PUT stream: name=${name}, src=${source}`);

      await new Promise((resolve) => {
        const r = http.request({
          hostname: parsed.hostname,
          port: parsed.port,
          path: parsed.pathname + parsed.search,
          method: 'PUT',
          timeout: 5000
        }, (pRes) => {
          const chunks = [];
          pRes.on('data', c => chunks.push(c));
          pRes.on('end', () => {
            const body = Buffer.concat(chunks).toString();
            results[name] = { ok: pRes.statusCode < 400, status: pRes.statusCode, body };
            if (pRes.statusCode >= 400) {
              console.error(`[go2rtc] Stream ${name} failed: ${pRes.statusCode} - ${body}`);
            }
            resolve();
          });
        });
        r.on('error', (e) => { results[name] = { ok: false, error: e.message }; resolve(); });
        r.end(); // No body — everything is in the query string
      });
    } catch (e) {
      results[name] = { ok: false, error: e.message };
    }
  }

  console.log('[go2rtc] Stream config results:', results);
  res.json({ results });
});

// ============================================
// Image Upload — for standby background etc.
// ============================================

// Serve uploaded files
app.use('/uploads', express.static(UPLOADS_DIR, {
  maxAge: '7d',
  setHeaders: (res, filePath) => {
    // Set correct content-type based on extension
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.bmp': 'image/bmp' };
    if (mimeTypes[ext]) res.setHeader('Content-Type', mimeTypes[ext]);
  }
}));

// Upload endpoint — accepts multipart form data with a single 'image' file
app.post('/api/upload', (req, res) => {
  const contentType = req.headers['content-type'] || '';

  // Handle multipart form upload
  if (contentType.includes('multipart/form-data')) {
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) return res.status(400).json({ error: 'Missing boundary' });

    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks);
        const bodyStr = body.toString('latin1');

        // Parse multipart — find the file part
        const parts = bodyStr.split('--' + boundary);
        let fileData = null;
        let fileName = 'upload.jpg';
        let fileMime = 'image/jpeg';

        for (const part of parts) {
          if (part.includes('Content-Disposition') && part.includes('filename=')) {
            // Extract filename
            const fnMatch = part.match(/filename="([^"]+)"/);
            if (fnMatch) fileName = fnMatch[1];

            // Extract content-type
            const ctMatch = part.match(/Content-Type:\s*([^\r\n]+)/i);
            if (ctMatch) fileMime = ctMatch[1].trim();

            // Extract file data (after the double CRLF)
            const headerEnd = part.indexOf('\r\n\r\n');
            if (headerEnd >= 0) {
              // Get raw binary from the original buffer
              const partStart = body.indexOf(Buffer.from(part.substring(0, 20), 'latin1'));
              if (partStart >= 0) {
                const dataStart = partStart + headerEnd + 4;
                // Find end of this part (before the trailing \r\n)
                let dataEnd = body.length;
                const nextBoundary = body.indexOf(Buffer.from('\r\n--' + boundary, 'latin1'), dataStart);
                if (nextBoundary > 0) dataEnd = nextBoundary;
                fileData = body.slice(dataStart, dataEnd);
              }
            }
          }
        }

        if (!fileData || fileData.length === 0) {
          return res.status(400).json({ error: 'No file data found' });
        }

        // Validate it's an image
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'];
        if (!allowedTypes.includes(fileMime)) {
          return res.status(400).json({ error: 'Only image files are allowed' });
        }

        // Limit to 20MB
        if (fileData.length > 20 * 1024 * 1024) {
          return res.status(400).json({ error: 'File too large (max 20MB)' });
        }

        // Generate unique filename
        const ext = path.extname(fileName).toLowerCase() || '.jpg';
        const safeName = `standby_${Date.now()}${ext}`;
        const filePath = path.join(UPLOADS_DIR, safeName);

        // Delete any previous standby images to save space
        try {
          const existing = fs.readdirSync(UPLOADS_DIR).filter(f => f.startsWith('standby_'));
          existing.forEach(f => {
            try { fs.unlinkSync(path.join(UPLOADS_DIR, f)); } catch (e) {}
          });
        } catch (e) {}

        fs.writeFileSync(filePath, fileData);
        console.log(`[Upload] Saved ${safeName} (${(fileData.length / 1024).toFixed(1)}KB)`);

        res.json({ ok: true, url: `/uploads/${safeName}` });
      } catch (err) {
        console.error('[Upload] Parse error:', err.message);
        res.status(500).json({ error: 'Upload failed' });
      }
    });
    return;
  }

  res.status(400).json({ error: 'Unsupported content type. Use multipart/form-data.' });
});

// Delete uploaded file
app.delete('/api/upload', (req, res) => {
  try {
    const existing = fs.readdirSync(UPLOADS_DIR).filter(f => f.startsWith('standby_'));
    existing.forEach(f => {
      try { fs.unlinkSync(path.join(UPLOADS_DIR, f)); } catch (e) {}
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

// Create HTTP server (needed for WebSocket upgrade)
const server = http.createServer(app);

// WebSocket proxy for go2rtc — handles MSE/WebRTC streaming
server.on('upgrade', (req, socket, head) => {
  // Only proxy /go2rtc/api/ws paths
  if (!req.url.startsWith('/go2rtc/')) {
    socket.destroy();
    return;
  }

  const go2rtcPath = req.url.replace('/go2rtc', '');
  const parsed = new URL(`${GO2RTC_URL}${go2rtcPath}`);

  console.log(`[go2rtc] WS upgrade -> ${parsed.href}`);

  const proxyReq = http.request({
    hostname: parsed.hostname,
    port: parsed.port,
    path: parsed.pathname + parsed.search,
    method: 'GET',
    headers: {
      ...req.headers,
      host: `${parsed.hostname}:${parsed.port}`
    }
  });

  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    // Send the 101 response back to client
    let response = `HTTP/1.1 101 Switching Protocols\r\n`;
    for (const [key, value] of Object.entries(proxyRes.headers)) {
      response += `${key}: ${value}\r\n`;
    }
    response += '\r\n';
    socket.write(response);

    // Pipe data both ways
    if (proxyHead.length > 0) socket.write(proxyHead);
    if (head.length > 0) proxySocket.write(head);

    proxySocket.pipe(socket);
    socket.pipe(proxySocket);

    socket.on('error', () => proxySocket.destroy());
    proxySocket.on('error', () => socket.destroy());
    socket.on('close', () => proxySocket.destroy());
    proxySocket.on('close', () => socket.destroy());
  });

  proxyReq.on('error', (err) => {
    console.error(`[go2rtc] WS proxy error: ${err.message}`);
    socket.destroy();
  });

  proxyReq.end();
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Ultrawide Dashboard running on http://0.0.0.0:${PORT}`);
  console.log(`[Server] go2rtc proxy at /go2rtc/ -> ${GO2RTC_URL}`);
  console.log(`[Server] Settings stored in: ${SETTINGS_FILE}`);
});
