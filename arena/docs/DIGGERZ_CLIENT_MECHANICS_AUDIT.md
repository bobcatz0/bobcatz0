# Diggerz Client Mechanics Audit

Reverse-engineered from the original compiled client `client/diggerz_v-203.js`
(Haxe/OpenFL/Lime, build .946). This is the **source of truth**: everything
below is taken from the client code or the recovered sprite atlas, with each
item tagged by confidence. Nothing here is invented.

Legend:
- **[CONFIRMED]** — directly read from the client code / atlas.
- **[LIKELY]** — strongly implied by the code but not 100% pinned down.
- **[UNKNOWN]** — not present in the client (often because it was
  server-authoritative and that server code is lost).
- **[PLACEHOLDER]** — what the current prototype uses instead (to be replaced).

A note that shapes everything below: **Diggerz combat is server-authoritative.**
The client sends *intent* (move + aim, "use item", "build", "dig"); the server
resolves hits, damage, projectile spawns, tile changes and scoring and streams
the results back. So hit detection, damage, ranges, cooldowns and projectile
physics are **not in the client** and cannot be extracted — only designed.

---

## 1. Input bindings

### [CONFIRMED] Keyboard
Keys are read through `q.KeyDown(code)` → `q.mKeyDown[code]`. The keydown
handler sets both the keyCode and the lowercased charCode true, and gameplay
reads keyCodes. Exact bindings, quoted from the movement code:

```
if (q.KeyDown(65) || q.KeyDown(37)) a = -3.4;   // move LEFT:  A / ArrowLeft
if (q.KeyDown(68) || q.KeyDown(39)) a =  3.4;   // move RIGHT: D / ArrowRight
var b = q.KeyDown(38) || q.KeyDown(87) || q.KeyDown(32);  // JUMP: ArrowUp / W / Space
if (q.KeyDown(40) || q.KeyDown(83)) ...         // DOWN: ArrowDown / S
```

| Action | Keys (keyCode) |
| --- | --- |
| Move left | `A` (65), `←` (37) |
| Move right | `D` (68), `→` (39) |
| Jump | `W` (87), `↑` (38), `Space` (32) |
| Down / descend | `S` (83), `↓` (40) |
| Menu / close | `Esc` (27) |
| Toggle (scoreboard?) | `Tab` (9) |
| Chat | `Enter` (13) |

The horizontal input magnitude is `±3.4` (engine units). This matches the
official instructions in `index.html`: *"WASD to move."*

### [CONFIRMED] Mouse
- `q.mX`, `q.mY` — cursor position (screen space; converted to world via the
  camera `l.z38.A7/A8` offset and `a8/a9` zoom).
- `q.mState` — button state: `0` = up, `1` = down (held).
- `q.mClicked` / `q.justClicked` — edge flags for a fresh press.
- `q.mWheel` — scroll wheel, normalized to `-1 / 0 / +1`.

Left mouse **held** (`1 == q.mState`) drives the primary action (use / dig /
build). This matches *"Use mouse to aim, dig, and pick weapons"* and the
web description *"left-click to shoot or dig."*

### [CONFIRMED] Item / weapon selection
- The hotbar selection changes with the **mouse wheel** (`q.mWheel`), handled by
  the toolbar UI object `n38` (it scrolls and updates the selected index).
- **No number-key slot selection exists** — `q.KeyDown(49..57)` (keys 1–9) is
  never called. (Explicitly verified absent.)

### [PLACEHOLDER] Current prototype
The standalone prototype currently uses `J` (melee) and `K` (projectile) and
left/right mouse for attacks — **none of which exist in Diggerz**. The real
client has no `J`/`K`; attacks are left-mouse + selected item. These keys are
to be removed/replaced.

---

## 2. Player rendering

### [CONFIRMED] Skeletal (cut-out) rig — not a frame sheet
The character is assembled from named body-part sprites, looked up at runtime
via `i33.f2("partName")`. Confirmed part names (with usage counts):

```
head, eye, torso, body,
front_shoulder, front_arm,          // the aiming arm
pants, leg, leg_back, frontleg, backleg, front_foot, back_foot,
frontpaw, backpaw, wing, tail, prickear   // animal / special skins
```

So a humanoid is: `head` + `eye` on `torso`/`body`, a `front_shoulder` →
`front_arm` (holds the weapon), `pants` + `leg`/`leg_back` + feet. Animal skins
swap in `paw`/`wing`/`tail`/`prickear`.

### [CONFIRMED] Animation states
Played via `i33._38("name", ...)`; the current state is `i33.Z28`. Confirmed
state names found in the client:

```
"idle"   "walk"   "jump_in"   "hit"   "build"   "gun_pose"
```

- `idle` / `walk` — grounded rest / movement.
- `jump_in` — leaving the ground.
- `gun_pose` — aiming a ranged weapon (arm rotates to the aim angle).
- `build` — placing a block.
- `hit` — melee swing / taking a hit (used in both attack and damage contexts).

> Note: the real names are `walk` and `jump_in` (not "run"/"jump"), plus
> `gun_pose`/`build`/`hit` which the prototype does not model. There is **no
> separate "fall" state** in the confirmed list — falling reuses jump/idle.

### [CONFIRMED] Facing
`k33` holds the rig's x-scale (`b4`); `set_local_xScale(±1)` flips the whole
character. The aiming arm rotates independently toward the cursor.

### [CONFIRMED] Aim direction (arm angle)
World aim angle, quoted:
```
b = i33.b4 * (Math.PI/2 + Math.atan2(
      (q.mY - l.z38.A8)/l.z38.a9 - (this.b7 - 50),   // worldMouseY - playerY
      (q.mX - l.z38.A7)/l.z38.a8 - this.b6));         // worldMouseX - playerX
b += 2*Math.PI; b *= 600;                              // encode
... K.X7(..., Math.floor(b), ...)                      // sent as uint16 in move packet
```
So aim = `atan2(worldMouseY - playerY, worldMouseX - playerX)`, encoded as
`floor((angle + 2π) * 600)` and sent **continuously inside the movement packet
(opcode 6)** — not a separate packet.

### [LIKELY] Body-part offsets
Parts are parented in a skeleton hierarchy (Spine-like) with per-part transforms
bahaved by the animation data. The exact bone offsets live in the animation/
skeleton JSON (referenced as `library.json` / skeleton data), which is **not in
the repo**. The atlas gives each part's source rect (below) but not its bone
placement. → see **[UNKNOWN]**.

### [PLACEHOLDER] Current prototype
A single procedural blob (head + body + 2 legs + arm) with `idle/run/jump/fall`.
It reads clearly but is not the real rig or the real state names.

---

## 3. Weapon / tool / item system

### [CONFIRMED] Hotbar model
- `n38` = the toolbar/hotbar object (also a UI element).
- `n38.B30[]` = the array of item slots.
- `n38.q43` = the **selected slot index** (`-1` = nothing selected).
- `n38.q41` = the currently-equipped item object.
- Each slot item exposes: `h44` (item/tile id), `a4` (**type**), `g36`
  (count / ammo), `Q36`, `b14` (sub-type).

### [CONFIRMED] Item types (`a4`)
```
a4 === 1  -> placeable BLOCK/tile      (built with opcode 11; needs g36 > 0)
a4 === 2  -> HELD/EQUIPPED item        (cosmetics AND weapons/tools)
```
CORRECTION: `a4 === 2` is **not** weapon-only — 174 items use it, including
hats/shoes/hair/masks as well as weapons. Weapons are the **subset** identified
by their weapon sprite/id; the confirmed list is in
`DIGGERZ_WEAPON_CATALOG.md`. Weapons are used via opcode 287.
Special-cased ids seen: `h44 === 141`, `h44 === 127`, `h44 === 326`.

### [CONFIRMED] Equipped weapon
`l.z39.j35` is the held weapon entity; `j35.u41` is its id; `j35.F57()` is its
fire method, which computes the aim and calls the use packet.

### [CONFIRMED] Use / trigger flow
Left mouse held (`mState === 1`) with a selected slot:
- **Block selected** (`a4 === 1`): place tile at the aimed cell → `K.X8(...)`
  (opcode **11**), animation `build`.
- **Weapon selected** (`a4 === 2`): fire/use toward aim → `K._16(...)`
  (opcode **287**), animation `gun_pose` (ranged) or `hit` (melee).
- **Nothing / dig**: dig the aimed tile → `K.Y0`/`K.Y1` (opcodes **20** / **47**).

### [CONFIRMED] Use packet — opcode 287 (`K._16`)
```
K._16 = function (a, b, c, d, e, g) {
  p.r8(a / l._44);   // origin x  (tile units)
  p.r8(b / l._44);   // origin y
  p.r8(c / l._44);   // target x  (aim point, tile units)
  p.r8(d / l._44);   // target y
  p.R4(e);           // byte: action/weapon-mode flag
  p.R0(l.z39.n38.q43); // int32: selected slot
  if (g != null) p.R8(g);  // optional uuid: target player
  A17(287, p);
}
```
i.e. *"use the item in slot `q43`, from `origin` toward `target`, mode `e`,
optionally at target player `g`."* The server resolves the rest.

### [UNKNOWN — server-authoritative] Effects
The following are **not in the client** (the server computed them):
- **Hit detection** (melee overlap, projectile collision vs players).
- **Damage** values per weapon.
- **Melee range / arc**.
- **Cooldowns / fire rate** — no client-side cooldown timer exists for weapons;
  pacing was enforced server-side (the client just sends 287 on input).
- **Projectile physics** (speed, gravity, lifetime).

### [CONFIRMED] Projectiles are server-spawned
The client never constructs a gameplay projectile locally. Projectiles arrive
from the server and are rendered by receive-handlers:
- opcode **8** (`V38`) — spawn an effect/projectile near a player.
- opcode **15 / 16** (`U39`) — projectile state update.
So a standalone game must implement projectile spawning itself; the client only
shows server-driven projectiles.

---

## 4. Networking / protocol (combat-relevant)

All binary, little-endian. Positions are "split floats" (`int32 floor` +
`int32 frac*1e5`) in tile units (client multiplies by `l._44 = 64`).

### [CONFIRMED] Client → Server (intent)
| Opcode | Sender | Payload | Meaning |
| --- | --- | --- | --- |
| **6** | `K.X7` | x, y, vx, vy, anim, b35, facing, **aim(uint16 = floor((θ+2π)·600))**, 0, 0 | movement + aim (continuous) |
| **287** | `K._16` | originX, originY, targetX, targetY, byte mode, **int32 slot (q43)**, [uuid] | use weapon/item |
| **11** | `K.X8` | playerX, 0, playerY, 0, tileId, col, flags, row, slot, subtype, bool | place / build block |
| **20** | `K.Y0` | col, flags, row | activate / interact tile |
| **47** | `K.Y1` | (empty) | dig commit |
| **8** | `K.y8` | bool, x, 0, y, 0, uint16 | position ping |

### [CONFIRMED] Server → Client (results)
| Opcode | Handler | Meaning |
| --- | --- | --- |
| **6** | `V34`→`L34` | other players' position + aim |
| **5** | `U36` | player spawn — includes inventory array + loadout arrays |
| **8** | `V38` | projectile / effect spawn |
| **15 / 16** | `U39` | projectile state update |
| **11** | `U37` | bulk tile updates (dig/build results) |

### [CONFIRMED] Client-side only vs server-relayed
- **Client-side only:** aim-angle computation, animation selection, hotbar
  selection (`q43`), and prediction of the local player's own movement.
- **Server-relayed (authoritative):** all hits, damage, projectile spawns/motion,
  tile changes, scoring, and other players' state.

### [UNKNOWN] Dedicated item-switch packet
There is no separate "I selected slot N" packet — the selected slot `q43`
travels **inside each action** (it's a field of opcodes 11 and 287). Whether the
server also tracked selection independently is unknown.

---

## 5. Assets

All gameplay sprites are sub-rects of **`tiles.png`** (the `f` atlas, 698
sprites); UI is in **`ui.png`** (the `u` atlas, 251 sprites); background is
`bknd.png`. The image binaries are not in the repo, but the **exact rectangles
are recovered** in `arena/assets/tiles.atlas.json`.

### [CONFIRMED] Weapon / tool sprites (name → `[x, y, w, h]` in tiles.png)
```
AXE_PNG             [250, 4, 82, 42]
SWORD_PNG           [1442, 720, 70, 38]
PIRATESWORD_PNG     [988, 883, 91, 38]
HAMMER_PNG          [1702, 352, 57, 34]
PICKAXE_PNG         [1622, 820, 73, 57]
SHOVEL_PNG          (in atlas)
SHOTGUN_PNG         [468, 1206, 28, 63]
RAILGUN_PNG         [437, 1207, 29, 50]
LIGHTGUN_PNG        [436, 740, 35, 52]
GOLDRAYGUN_PNG / PURPLERAY_PNG / DEFENSEGUN_PNG
GRENADELAUNCHER_PNG [1533, 352, 29, 60]
BOMB_PNG / CUPIDBOW_PNG / CUPIDARROW_PNG
```
(16 weapon/tool sprites confirmed in total.)

### [CONFIRMED] Character-part sprites
```
ADVTORSO_PNG  [138, 4, 34, 39]      ALIENHEAD_PNG [18, 61, 60, 65]
ARM_PNG       [0, 19, 17, 14]       ARM_BACK_PNG  [0, 34, 17, 14]
ADVHAT_PNG    [18, 4, 86, 56]       ADVSHOES_PNG  [105, 4, 32, 16]
```
…plus many more heads/torsos/arms/hats/shoes (skins).

### [CONFIRMED] Block sprites
```
B100_0_PNG  [149, 62, 64, 64]    grass surface block
B108_0_PNG  [1091, 62, 64, 64]   dirt block (variants B108_1/2 = edges)
B216_0_PNG  [430, 286, 64, 64]   stone block
```
Naming convention: `B<tileId>_<variant>_PNG`.

### [CONFIRMED] Projectile / effect sprites
```
CUPIDARROW_PNG [58, 1593, 18, 52]   BLACKBALLET_PNG [105, 38, 32, 16]
SPARK_PNG [14, 192, 2, 2]           SPARK2_PNG [1, 498, 6, 6]
FLASH_PNG [825, 761, 162, 162]      FLASHLIGHT_PNG [1367, 352, 42, 30]
```
(Projectile visuals are weapon-specific; the actual shot entities are spawned by
the server — see §3.)

### [CONFIRMED] UI icons
In `ui.png` (`u` atlas): country flags, `METER_PNG`, `TOOLTIP_PNG`, etc.
(251 sprites).

---

## Summary — what we can rebuild vs what we must design

**Rebuildable now from confirmed client behavior (no invention):**
- Input bindings (keys, mouse, wheel).
- Character rig spec (part names, animation-state names, facing, aim encoding).
- Item/hotbar model (slots, selected index, type `a4`, count `g36`, wheel select).
- "Use item" *intent* (opcode-287-shaped: origin + aim + slot), and which
  animation a use plays.
- All sprite identities + atlas coordinates.

**Must be designed (NOT in the client — server was authoritative, code lost):**
- Hit detection, damage, melee range/arc, fire-rate/cooldowns.
- Projectile spawning + physics (client only renders server-spawned ones).
- Scoring / FT20 resolution rules.

→ Therefore `ProjectileSystem.js` and the damage half of `CombatController.js`
are **not built from the client** — building them now would be invention. They
are left as explicit design decisions for the standalone server/sim.
