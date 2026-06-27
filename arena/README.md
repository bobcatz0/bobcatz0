# PvP Arena — movement prototype

A standalone browser prototype that recreates the **Diggerz-style movement
feel** as clean, reusable game code. Single player, no networking, no scoring
logic yet — the only goal is to prove the movement feels good locally before
weapons/gear/multiplayer are built on top.

![preview](preview.png)

## Run it

```bash
cd arena
node serve.js          # http://localhost:8080
```
Open the URL.

- **Move:** `A`/`D` or `←`/`→`
- **Jump:** `W` / `↑` / `Space` — hold for height, tap for a small hop

Run the headless logic tests:

```bash
npm test
```

## What's implemented

- One hand-authored arena map (`src/game/arenaMap.js`)
- One controllable player
- Gravity + capped fall speed
- Accelerated horizontal movement with ground/air friction
- Jumping with **coyote time**, **jump buffering**, and **variable height**
  (release early to cut the jump) — the small tricks that make it feel good
- AABB collision against tile/platform blocks (with flush ground-snap so a
  standing player never jitters)
- Velocity tracking (`vx`, `vy`)
- Facing direction
- Simple animation-state values: `idle` / `run` / `jump` / `fall`
- FT20 score placeholder in the HUD (no scoring logic yet)
- Debug overlay: `x, y, vx, vy, grounded, facing, anim`

## Modules

```
src/
  main.js                  boot the scene
  game/
    MovementController.js   the "feel": gravity, accel, jump, anim — PURE logic
    TileCollision.js        AABB-vs-tile resolution + ground snap — PURE logic
    PlayerController.js      binds input + body + movement
    InputState.js            keyboard -> intents (left/right/jumpHeld/jumpPressed)
    ArenaScene.js            canvas, game loop, rendering, HUD, debug overlay
    arenaMap.js              the one arena, as ASCII -> collision grid
serve.js                   zero-dependency static server (ES modules need http)
test/movement.test.js      headless physics checks (no DOM)
```

`MovementController` and `TileCollision` are **pure** — no DOM, input, or
rendering — so they're the pieces you carry into the real PvP arena game.
`MovementController.step(body, input, dt, collider)` is the whole movement
model; tune the constants in its `DEFAULTS` to dial the feel.

## Tuning the feel

All movement constants live in `MovementController.DEFAULTS` (gravity, move
speed, accel/friction, jump speed, coyote/buffer times, jump-cut). They're
plain px/s and px/s² values — adjust and reload. The collision box size and
spawn are set in `ArenaScene` and `arenaMap`.

## Verified

- `npm test` — 6 headless checks (gravity/landing, horizontal accel, jump,
  wall collision, facing, animation states).
- Browser smoke test (Chromium) — loads with no JS errors and responds to real
  key input: rests grounded, runs right, jumps off the ground, lands, and stops
  at walls.

## Not in scope yet (intentionally)

Ranked, tournaments, cosmetics, accounts, rollback, weapons/gear, and
multiplayer. This is the movement foundation only.
