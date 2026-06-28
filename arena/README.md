# PvP Arena — movement prototype + Diggerz reference

A standalone browser prototype that recreates the **Diggerz-style movement
feel** as clean, reusable code, plus a set of modules that faithfully recreate
the **confirmed** Diggerz client systems (input, character rig, items) to build
the real PvP game on top of.

Single player. No networking. **No combat is implemented yet** — combat is being
designed first (the original Diggerz combat was server-authoritative and that
server code is lost; see the docs below).

![preview](preview.png)

## Run it

```bash
cd arena
node serve.js          # http://localhost:8080
```
Open the URL.

Controls (the real Diggerz scheme):

- **Move:** `A`/`D` or `←`/`→`
- **Jump:** `W` / `↑` / `Space` — hold for height, tap for a small hop
- **Descend:** `S` / `↓`

(Mouse aim, left-mouse use/dig/build, and mouse-wheel hotbar selection are the
confirmed Diggerz controls and are documented in the audit, but combat is not
wired up yet — by design.)

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
- AABB collision against tile/platform blocks (with flush ground-snap)
- Velocity tracking, facing direction, animation-state values
- FT20 score placeholder in the HUD (no scoring logic yet)
- Debug overlay: `x, y, vx, vy, grounded, facing, anim`
- Diggerz-style rendering: grass-topped dirt blocks + stone and an animated
  character — uses the real Diggerz sprites when `tiles.png` is present (see
  **Assets**), procedural art otherwise

## Documentation

- **`docs/DIGGERZ_CLIENT_MECHANICS_AUDIT.md`** — the real Diggerz client
  mechanics (input, rendering, items, networking, assets), each finding tagged
  Confirmed / Likely / Unknown / Placeholder. The source of truth.
- **`docs/DIGGERZ_WEAPON_CATALOG.md`** — the confirmed Diggerz weapon roster
  (38 real items: ids, names, sprites, atlas rects). Machine-readable form in
  `src/diggerz/DiggerzWeaponCatalog.js`.
- **`docs/STANDALONE_PVP_COMBAT_DESIGN.md`** — the proposed combat design for
  the standalone game (awaiting approval before any combat is coded).

## Modules

```
src/
  main.js                  boot the scene
  game/
    MovementController.js   the "feel": gravity, accel, jump, anim — PURE logic
    TileCollision.js        AABB-vs-tile resolution + ground snap — PURE logic
    PlayerController.js      binds input + body + movement
    InputState.js            keyboard -> movement intents
    ArenaScene.js            canvas, game loop, HUD, debug overlay, tile classify
    arenaMap.js              the one arena, as ASCII -> collision grid
  render/
    AssetStore.js            loads the real Diggerz atlas (tiles.png) if present
    TileSprites.js           real dirt/grass/stone tiles, else procedural texture
    CharacterSprite.js       real torso+head sprite, else procedural character
    SpriteAnimation.js       reusable sprite-sheet frame stepper
  diggerz/                  ← faithful recreations of CONFIRMED client systems
    InputBindings.js         real key/mouse/wheel bindings (audit §1)
    CharacterRig.js          real parts, animation states, facing, aim encoding
    ItemSystem.js            real hotbar/slot model (type, count, wheel select)
    WeaponSystem.js          confirmed "use intent" (opcode 287) + animation only
    CombatController.js      wires the confirmed flow; resolution is delegated
assets/
  tiles.atlas.json         recovered sprite rects (698 sprites) — see "Assets"
serve.js                   zero-dependency static server (ES modules need http)
tests/movement.test.js     headless physics checks (no DOM)
tests/diggerz.test.js      headless checks of the confirmed Diggerz systems
```

The `src/diggerz/` modules contain **only confirmed** client behavior — no
invented damage, ranges, cooldowns, or projectiles. Those were server-side and
are deliberately left out until the combat design is approved.

## Assets — real Diggerz sprites

The original Diggerz textures are **not** in this repo (binaries never
committed; live site dead; archive blocked by the egress allowlist). But the
sprite *rectangles* are hardcoded in the client, so the exact coordinates of
**all 698 gameplay sprites** were recovered into `assets/tiles.atlas.json`.

| Sprite | Name | Rect (x, y, w, h) |
| --- | --- | --- |
| Dirt block | `B108_0_PNG` | 1091, 62, 64, 64 |
| Grass surface block | `B100_0_PNG` | 149, 62, 64, 64 |
| Stone block | `B216_0_PNG` | 430, 286, 64, 64 |
| Character torso | `ADVTORSO_PNG` | 138, 4, 34, 39 |
| Character head | `ALIENHEAD_PNG` | 18, 61, 60, 65 |

**Use the real sprites:** drop the original `tiles.png` into `arena/assets/`.
`AssetStore` loads it and the renderers switch from procedural art to the real
sprites automatically.

## Tuning the feel

All movement constants live in `MovementController.DEFAULTS` (gravity, move
speed, accel/friction, jump speed, coyote/buffer times, jump-cut).

## Verified

- `npm test` — 6 movement + 7 Diggerz-mechanics headless checks (gravity/
  landing, horizontal accel, jump, wall collision, facing, animation states;
  real bindings, aim encoding, animation names, hotbar wheel-select, opcode-287
  intent shape).
- Browser smoke test (Chromium) — loads with no JS errors and responds to real
  key input: rests grounded, runs, jumps, lands, stops at walls.

## Not in scope yet (intentionally)

Combat (pending the design doc), multiplayer, ranked, tournaments, cosmetics,
accounts, rollback. This is the movement foundation plus the confirmed Diggerz
reference systems only.
