# diggerz.io — reconstructed server

An authoritative game server for the abandoned **diggerz.io** browser client
(`client/diggerz_v-203.js`). It speaks the client's **raw binary WebSocket
protocol** that was reverse-engineered from the Haxe/OpenFL build — it is *not*
a Socket.IO server (the previous version was, which is why the client could
never connect and closed with code 1001).

---

## What you need to run multiplayer

1. **Node.js 18+**
2. **This server** (`server/`) — provides:
   - a raw WebSocket server on `ws://localhost:3000` (the URL is hard-coded in
     the client), and
   - a static HTTP server on the same port that serves the game client.
3. **The full client asset bundle** in the `client/` folder at the repo root:
   - `index.html`
   - `diggerz_v-203.js`
   - the support libraries the page loads: `lib/howler.min.js`,
     `lib/pako.min.js`, `lib/FileSaver.min.js`, `lime-compat.js`,
     `disable-audio.js`, `manifest.json`, `service-worker.js`, `favicon.png`
   - the asset directories: `assets/`, `libs/`, `sdks/`
   - If some assets are missing the page may not fully render, but the
     WebSocket protocol will still work.
4. **Remove the stray localhost socket from `index.html`** (you already did
   this) — the real client connects on its own via the compiled game code.

> The client connects to `ws://localhost:3000` regardless of any configured
> server address (this is hard-coded in `Wj.create("ws://localhost:3000", …)`),
> so run locally on port 3000.

---

## Run it

```bash
cd server
npm install
npm start
```

Then open **http://localhost:3000/** in a browser.

- Serve a client from a different folder:
  `CLIENT_DIR=/path/to/client npm start`
- Change the port (not recommended — the client expects 3000):
  `PORT=3000 npm start`

Verify the protocol layouts without a browser:

```bash
npm test
```

---

## How the connection works

The flow, reconstructed from the client's `U34` / `v30` / `U36` handlers:

```
client connects (raw WebSocket, binary frames)
  C -> S   op 2   login            (name, uid, platform, …)
  S -> C   op 2   handshake        (status, session UUID, version "0.9", keys)
  C -> S   op 4   ack
  S -> C   op 4   world map         (chunked 4x4x4 tile grid)
  C -> S   op 18  map loaded
  S -> C   op 5   player spawn      (UUID == session UUID => local player)
  C -> S   op 6   movement (every frame)  ->  S broadcasts op 6 to others
```

Key facts the codec depends on (all confirmed from the client):

- **All integers are little-endian.**
- Opcodes and counts are `uint16`; positions are "split floats"
  (`int32 floor` + `int32 frac*1e5`), in **tile units** (client multiplies by
  `l._44 = 64` px).
- Strings are `int32 length (incl. NUL) + bytes + NUL`.
- The world is layers `0/1/2` (`bg/main/fg`), up to 128 columns; tiles are
  packed as `(flags << 11) | tileType`. Ground tile IDs: grass `100`,
  dirt `108`, stone `216`.
- The handshake's "encryption" keys are inert — the client's scrambler is a
  no-op, so traffic is plaintext.

---

## Project layout

```
server/
  src/
    index.js              HTTP static server + WebSocket server
    GameServer.js         connection flow, broadcasts, world state
    Client.js             per-connection state + session UUID
    World.js              tile-grid generation
    net/
      ByteWriter.js       binary writer (mirrors the client's `tb` writer)
      ByteReader.js       binary reader (mirrors the client's `tb` reader)
      opcodes.js          named opcode constants (C2S / S2C)
      log.js              packet logging + hex dumps
    protocol/
      handshake.js        opcode 2 (login parse + handshake build)
      worldmap.js         opcode 4 (chunked tile world)
      spawn.js            opcode 5 (player spawn)
  test/
    handshake-test.js     round-trip codec checks (npm test)
```

---

## What works and what's next

**Working & verified:** transport, binary codec, the full join handshake,
world-map streaming, player spawn (recognised as the local player), and
movement broadcast between players.

**Stubbed (extend against the live client using the packet logs):**

- `op 47 / 20 / 11` — digging & building (mutate the world, broadcast
  `op 11` TILE_UPDATE)
- `op 8` — projectiles / combat
- `op 211` / `op 12` — chat
- battle-royale zone, scoring, items, shop

Every inbound/outbound packet is logged with its opcode name, length and a hex
preview, so when a stubbed packet needs implementing you can see exactly what
the client sends.
