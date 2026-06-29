# PvP Arena — movement prototype + Diggerz reference

A standalone browser prototype that recreates the **Diggerz-style movement
feel** as clean, reusable code, plus a set of modules that faithfully recreate
the **confirmed** Diggerz client systems (input, character rig, items) to build
the real PvP game on top of.

Single player. No networking. **Combat V1** is implemented using the confirmed
Diggerz weapons (Fake Sword + Blue Ray Gun) with the real Diggerz controls.
Combat *resolution* values (damage/range/cooldown/projectile/respawn) are
**proposed standalone PvP values**, not extracted (the original server combat
logic is lost — see the docs).

![preview](preview.png)

## Run it

```bash
cd arena
node serve.js          # http://localhost:8080
```
Open the URL.

Controls:

- **Move:** `A`/`D` or `←`/`→`
- **Jump:** `W` / `↑` / `Space` — hold for height, tap for a small hop
- **Descend:** `S` / `↓`
- **Aim:** mouse
- **Use weapon:** left-click (selected weapon, toward the aim)
- **Select weapon:** `1` Fake Sword · `2` Blue Ray Gun · `3` Shotgun
  (`Numpad1/2/3` too)
- **Zoom camera:** **mouse wheel** — up = in, down = out (clamped 0.75×–2.0×);
  `0` resets to 1.0× (`+`/`−` also nudge it, or use the on-screen buttons)
- Reset / toggle aim+debug / **rig anchors**: on-screen button + checkboxes
  (not keybinds)

> **Standalone control change (intentional):** Diggerz used the mouse wheel for
> hotbar selection. For this PvP prototype the wheel **zooms the camera** and
> weapon swapping moves to the **number keys** for direct/fast selection. The
> confirmed Diggerz wheel→slot behavior is still documented/tested in
> `src/diggerz/` (the recreation layer); only the active prototype controls
> diverge.

Run the headless logic tests:

```bash
npm test
```

## What's implemented

- A large PvP arena (**80×34 tiles = 3200×1360 world**) with a wide floor,
  boundary walls, an open centre, and reachable multi-height platforms
  (`src/game/arenaMap.js`); spawn points (P1 left, P2 right) in the map
- A **follow camera** (`src/game/Camera.js`): fixed 1000×640 viewport, smooth
  (non-floaty) follow, clamped to the world bounds; HUD/hotbar/debug stay fixed
  to the screen; the debug overlay shows true world coords + camera x/y
- **Real Diggerz presentation:** a parallax backdrop from `bknd.png` (mountains,
  hills, moon — `src/render/Background.js`), the official `loading.jpg` loading
  screen, and `favicon.png` as the app icon
- One controllable player
- Gravity + capped fall speed
- Accelerated horizontal movement with ground/air friction
- Jumping with **coyote time**, **jump buffering**, and **variable height**
- AABB collision against tile/platform blocks (with flush ground-snap)
- Velocity tracking, facing direction, animation-state values
- **Combat V1 (wired):** a P2 **dummy** with health + hurtbox; left-click uses the
  selected weapon toward the mouse aim. **Fake Sword** is a melee arc hitbox;
  **Blue Ray Gun** spawns a straight projectile (wall-blocked). On a kill: P1
  scores +1, the dummy respawns at the P2 spawn with brief invulnerability;
  **first to 20 kills** wins (rematch button restarts). **Shotgun** is in the
  hotbar and selectable but does **not** resolve yet (it will use the real
  client's shotgun functions). All combat **numbers** are PROPOSED standalone
  values (`src/combat/CombatConfig.js`).
- FT20 kill score in the HUD; a win banner with a rematch button
- Health bars over both fighters; respawn marker; muzzle/swing visuals
- Debug overlay (toggle "show aim + debug"): weapon, aim, P1/P2 HP, score,
  world mouse/player/camera + zoom, and the live **hurtboxes/hitboxes**
- Diggerz-style rendering: real Diggerz tiles + the **real character**, drawn
  from the **actual Spine skeleton** (`"guy_anims"`/`"guyskin"`, Spine 3.6.53)
  extracted verbatim from the decompiled client (`src/render/guySkeleton.js`) —
  not an invented rig. A tiny forward-kinematics pass (`CharacterSprite`) poses
  the idle frame and draws each part with the real `tiles.png` sprites; the body
  is coloured by multiply-**tinting** the white base parts (`WHITE_TORSO`,
  `LEG_WHITE`, …) navy + blue/purple + purple shoes, the way the game colours
  characters. The skeleton mirrors for facing (right→right, left→left), and
  the equipped weapon is held in the front hand with a **per-weapon grip /
  rotation / scale** (so the sword is held like a sword and the guns like guns)
  that rotates toward the mouse aim and stays attached when aiming behind. Body
  facing follows the **aim while actively using**, else movement (idle keeps the
  last facing). A **rig anchors** debug toggle shows the head/hand/shoulder/body
  anchors + facing arrow.
- Camera **zoom** (0.75×–2.0×, keeps the player centred) on the **mouse wheel**
  (`0` resets; `+`/`−` also nudge it)
- **Diggerz hotbar + Combat V1 resolution (wired):** a 3-slot hotbar using the
  real `ui.png` **POCKET** slot sprite + the real weapon icons from `tiles.png`
  (**Fake Sword**, **Blue Ray Gun**, **Shotgun**). The number keys `1`/`2`/`3`
  select the slot (highlight + name), the mouse aims (aim line + reticle), and
  left-click resolves the selected weapon against the dummy through the headless
  resolver layer (`src/combat/`) — melee arc for the sword, projectile for the
  ray gun, health / death / respawn / FT20 kill scoring. The shotgun is
  selectable but deferred.

## Documentation

- **`docs/DIGGERZ_CLIENT_MECHANICS_AUDIT.md`** — the real Diggerz client
  mechanics (input, rendering, items, networking, assets), each finding tagged
  Confirmed / Likely / Unknown / Placeholder. The source of truth.
- **`docs/DIGGERZ_WEAPON_CATALOG.md`** — the confirmed Diggerz weapon roster
  (38 real items: ids, names, sprites, atlas rects). Machine-readable form in
  `src/diggerz/DiggerzWeaponCatalog.js`.
- **`docs/STANDALONE_PVP_COMBAT_DESIGN.md`** — the proposed combat design for
  the standalone game.
- **`docs/UI_ASSET_AUDIT.md`** — the `ui.png` UI sprites identified + verified
  for HUD/hotbar/health/buttons/arrows/score/match status (ready to wire), plus
  the real asset inventory.

## Modules

```
src/
  main.js                  boot the scene
  game/
    MovementConfig.js       ALL movement values (one clear config file)
    MovementController.js   the "feel": gravity, accel, jump, anim — PURE logic
    TileCollision.js        AABB-vs-tile resolution + ground snap — PURE logic
    PlayerController.js      binds input + body + movement
    InputState.js            keyboard -> movement intents
    ArenaScene.js            viewport, game loop, camera, HUD, debug, rendering
    arenaMap.js              the 80x34 arena (floor/walls/platforms) + spawns
    Camera.js                follow camera with smoothing + world clamping
    TuningPanel.js           dev-only live playtest tuning panel (+ JSON export)
  render/
    AssetStore.js            loads the real Diggerz atlas (tiles.png) if present
    TileSprites.js           real dirt/grass/stone tiles, else procedural texture
    guySkeleton.js           the REAL character Spine skeleton (from the client)
    CharacterSprite.js       poses the skeleton's idle frame + draws + held weapon
    CharacterRigConfig.js    per-weapon held rigs, body colour tints, facing rule
    SpriteAnimation.js       reusable sprite-sheet frame stepper
    Background.js            real bknd.png parallax backdrop (mountains/hills/moon)
  diggerz/                  ← faithful recreations of CONFIRMED client systems
    InputBindings.js         real key/mouse/wheel bindings (audit §1)
    CharacterRig.js          real parts, animation states, facing, aim encoding
    ItemSystem.js            real hotbar/slot model (type, count, wheel select)
    WeaponSystem.js          confirmed "use intent" (opcode 287) + animation only
    CombatController.js      wires the confirmed flow; resolution is delegated
    DiggerzWeaponCatalog.js  38 confirmed weapons (id, name, sprite, rect)
  combat/                   ← Combat V1 (confirmed weapons; PROPOSED resolution)
    CombatConfig.js          all combat numbers (PROPOSED standalone), tunable
    geometry.js  Health.js  MeleeResolver.js  ProjectileResolver.js
    MatchState.js            FT20 kill scoring
    CombatSystem.js          headless orchestrator (local now, server later)
    CombatInput.js           mouse aim / left-click use / wheel select (DOM)
assets/
  tiles.atlas.json         recovered sprite rects (698 sprites) — see "Assets"
serve.js                   zero-dependency static server (ES modules need http)
tests/movement.test.js     headless physics checks (no DOM)
tests/arena.test.js        arena size/spawns/camera/zoom/facing-sign
tests/diggerz.test.js      headless checks of the confirmed Diggerz systems
tests/hotbar.test.js       hotbar selection + confirmed use-intent shape
tests/combat.test.js       Combat V1 resolution (sword/ray gun/death/respawn/FT20)
tests/rig.test.js          character rig offsets + per-weapon held config + facing
```

The `src/diggerz/` modules contain **only confirmed** client behavior — no
invented damage, ranges, cooldowns, or projectiles. Those were server-side and
are deliberately left out until the combat design is approved.

## Assets — real Diggerz sprites

The **real Diggerz assets are now in `assets/`** — the original
`tiles.png` (2048×2048 atlas), `ui.png`, `bknd.png`, `favicon.png`, alongside
the recovered `tiles.atlas.json` (698 sprite rects). The arena renders the real
sprites (console: *"real Diggerz tiles.png loaded"*); the procedural art is now
only a fallback if `tiles.png` is missing.

| Sprite | Name | Rect (x, y, w, h) |
| --- | --- | --- |
| Dirt block | `B108_0_PNG` | 1091, 62, 64, 64 |
| Grass surface block | `B100_0_PNG` | 149, 62, 64, 64 |
| Stone block | `B216_0_PNG` | 430, 286, 64, 64 |
| Character torso | `ADVTORSO_PNG` | 138, 4, 34, 39 |
| Character head | `ALIENHEAD_PNG` | 18, 61, 60, 65 |
| Fake Sword (weapon) | `SWORD_PNG` | 1442, 720, 70, 38 |

The 38 confirmed weapons (verified against the real `tiles.png`) are in
`docs/DIGGERZ_WEAPON_CATALOG.md` / `src/diggerz/DiggerzWeaponCatalog.js`.

## Tuning the feel

All movement constants — gravity, move speed, accel/friction, jump speed,
coyote/buffer times, jump-cut — live in **one clear config file**,
`src/game/MovementConfig.js` (`MovementController` imports it as its defaults).
These are the prototype's tunable standalone feel values, not extracted server
numbers. (Playtest note: movement reads a touch faster than the original; it's
left unchanged this pass — tune `moveSpeed` there when we decide to.)

The combat numbers live in `src/combat/CombatConfig.js` and are likewise
**PROPOSED standalone PvP values**, not extracted from Diggerz (the server
combat logic is lost).

### Dev-only tuning panel

Click **⚙ Tuning** (or open the page with `#tune`) for a live playtest panel
(`src/game/TuningPanel.js`). It exposes — as sliders + number inputs you can
change *while playing* — move speed, acceleration, friction, gravity, jump
speed; Fake Sword damage/cooldown/reach; Blue Ray Gun damage/cooldown/speed/
lifetime; and respawn time + invulnerability time. **Reset to defaults** restores
the boot values, and **Export JSON** gives you the current set (copy or download)
to save a good config. The panel only mutates the live objects the sim already
reads each step — it does **not** change any source defaults, and the exported
values are PROPOSED standalone PvP values, not extracted Diggerz numbers.

## Verified

- `npm test` — 6 movement + 12 arena + 7 Diggerz-mechanics + 3 hotbar + 10
  combat + 4 rig headless checks (movement physics; arena size/spawns/landing/
  traversal/boundary-walls/jump-reachability/camera-clamp/zoom-clamp/facing-sign/
  number-key weapon select/wheel-zoom/**zoom-is-render-only**; real bindings/aim/
  animation; hotbar; sword + ray gun hits, wall-blocked ray, death, respawn +
  invulnerability, score, FT20 win, reset + cooldown-clear, **held-weapon-follows-
  selection**; **rig offsets/eyes-on-head/per-weapon held config/body-facing
  rule**).
- Browser smoke (Chromium) — real assets load; eyes sit on the face; the body
  mirrors correctly (right→R, left→L, no moonwalk) and faces the aim while using;
  each weapon (sword/ray gun/shotgun) is held in the hand with its own grip and
  rotates to the mouse through the full circle (incl. aiming behind) without
  detaching; the camera follows + wheel-zooms and clamps without changing world
  coordinates; the sword hitbox + rig anchors show under debug; and Combat V1
  resolves end to end (sword 34 dmg, ray gun 25 dmg + wall block, dummy death →
  +1 score, respawn at full HP with invuln, FT20 banner + rematch, shotgun
  selectable but inert).

## Not in scope yet (intentionally)

Shotgun *behavior* (its damage/spread/cooldown were server-side and are **lost**;
it stays selectable but inert until that logic can be shown in the decompiled
client — we won't invent it), more weapons, multiplayer, ranked, tournaments,
cosmetics, accounts, rollback. Combat V1 is local single-player vs a dummy.
