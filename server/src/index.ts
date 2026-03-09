import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { Matchmaking } from './game/Matchmaking';
import { registerHandlers } from './network/handlers';

const PORT          = parseInt(process.env['PORT'] ?? '3000', 10);
const CLIENT_ORIGIN = process.env['CLIENT_ORIGIN'] ?? '*';

// ── HTTP + Socket.io setup ────────────────────────────────────────────────────

const app        = express();
const httpServer = createServer(app);
const io         = new SocketServer(httpServer, {
  cors: {
    origin:  CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
  },
  pingTimeout:  60_000,
  pingInterval: 25_000,
});

// ── Game systems ──────────────────────────────────────────────────────────────

const matchmaking = new Matchmaking(io);

// ── HTTP routes ───────────────────────────────────────────────────────────────

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/info', (_req, res) => {
  res.json({ name: 'Diggerz.io Game Server', version: '1.0.0' });
});

// ── Socket.io connections ─────────────────────────────────────────────────────

io.on('connection', (socket) => {
  registerHandlers(io, socket, matchmaking);
});

// ── Start ─────────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`[server] diggerz.io server listening on port ${PORT}`);
});

const shutdown = (): void => {
  console.log('[server] shutting down…');
  matchmaking.cleanup();
  httpServer.close(() => process.exit(0));
};

process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);
