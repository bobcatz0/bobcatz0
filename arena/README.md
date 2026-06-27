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
- Diggerz-style rendering: grass-topped dirt blocks + stone, and an animated
  character (idle/run/jump/fall) — uses the real Diggerz sprites when
  `tiles.png` is present (see **Assets**), procedural art otherwise

## Modules

```
src/
  main.js                  boot the scene
  game/
    MovementController.js   the "feel": gravity, accel, jump, anim — PURE logic
    TileCollision.js        AABB-vs-tile resolution + ground snap — PURE logic
    PlayerController.js      binds input + body + movement
    InputState.js            keyboard -> intents (left/right/jumpHeld/jumpPressed)
    ArenaScene.js            canvas, game loop, HUD, debug overlay, tile classify
    arenaMap.js              the one arena, as ASCII -> collision grid
  render/
    AssetStore.js            loads the real Diggerz atlas (tiles.png) if present
    TileSprites.js           real dirt/grass/stone tiles, else procedural texture
    CharacterSprite.js       real torso+head sprite, else procedural character
    SpriteAnimation.js       reusable sprite-sheet frame stepper
assets/
  tiles.atlas.json         recovered sprite rects (698 sprites) — see "Assets"
serve.js                   zero-dependency static server (ES modules need http)
test/movement.test.js      headless physics checks (no DOM)
```

## Assets — real Diggerz sprites

The original Diggerz textures are **not** in this repo (the binaries were never
committed, aren't on disk, the live site is dead, and the Wayback Machine is
blocked by the network egress allowlist). But the sprite *rectangles* are
hardcoded in the client, so the exact coordinates of **all 698 gameplay
sprites** were recovered into `assets/tiles.atlas.json`.

What's where in the original atlas (`tiles.png`):

| Sprite | Name | Rect (x, y, w, h) |
| --- | --- | --- |
| Dirt block | `B108_0_PNG` | 1091, 62, 64, 64 |
| Grass surface block | `B100_0_PNG` | 149, 62, 64, 64 |
| Stone block | `B216_0_PNG` | 430, 286, 64, 64 |
| Character torso | `ADVTORSO_PNG` | 138, 4, 34, 39 |
| Character head | `ALIENHEAD_PNG` | 18, 61, 60, 65 |
| Character arm | `ARM_PNG` | 0, 19, 17, 14 |

> The player is **skeletal** in Diggerz (assembled from body-part sprites),
> not a single frame sheet.

**Use the real sprites:** drop the original `tiles.png` into `arena/assets/`.
`AssetStore` loads it, and `TileSprites` / `CharacterSprite` switch from the
procedural art to the real sprites automatically (the console logs which mode
is active). Until then the prototype renders faithful Diggerz-style procedural
tiles + character so it always runs.

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
