'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const GameServer = require('./GameServer');
const log = require('./net/log');

const PORT = parseInt(process.env.PORT || '3000', 10);
// The client hard-codes ws://localhost:3000, and also loads its assets over
// HTTP. Serving both from the same port keeps everything on localhost:3000.
// Override the client location with CLIENT_DIR=/path/to/client if needed.
const CLIENT_DIR = path.resolve(process.env.CLIENT_DIR || path.join(__dirname, '..', '..', 'client'));

// ── Static file server (serves the game client) ──────────────────────────────

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.ogg':  'audio/ogg',
  '.mp3':  'audio/mpeg',
  '.m4a':  'audio/mp4',
  '.wasm': 'application/wasm',
};

const httpServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  // Resolve safely inside CLIENT_DIR (prevent path traversal).
  const filePath = path.normalize(path.join(CLIENT_DIR, urlPath));
  if (!filePath.startsWith(CLIENT_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`Not found: ${urlPath}`);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

// ── WebSocket server (the game protocol) ─────────────────────────────────────

const game = new GameServer();
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
  // The client sends/receives binary frames; default binaryType is fine.
  game.onConnect(ws);
});

httpServer.listen(PORT, () => {
  log.info(`diggerz server listening on http://localhost:${PORT}`);
  log.info(`  - game client:  http://localhost:${PORT}/  (served from ${CLIENT_DIR})`);
  log.info(`  - websocket:    ws://localhost:${PORT}`);
  if (!fs.existsSync(path.join(CLIENT_DIR, 'index.html'))) {
    log.info(`  ! WARNING: ${CLIENT_DIR}/index.html not found — the client assets are not in place.`);
  }
});

process.on('SIGINT', () => { log.info('shutting down'); process.exit(0); });
process.on('SIGTERM', () => { log.info('shutting down'); process.exit(0); });
