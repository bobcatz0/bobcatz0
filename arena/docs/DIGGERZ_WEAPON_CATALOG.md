# Diggerz Weapon Catalog (confirmed from client + assets)

Extracted from the real client `client/diggerz_v-203.js` (item-definition
switch) and the recovered atlas `arena/assets/tiles.atlas.json`. This is the
**source of truth** for the standalone PvP weapon roster — no invented weapons,
no renames. Machine-readable form: `arena/src/diggerz/DiggerzWeaponCatalog.js`.

Confidence tags: **[CONFIRMED]** (in client/atlas), **[INFERRED]** (strong guess
from sprite/animation), **[UNKNOWN]** (server-side; not in client).

> Key correction: the item type field `a4 === 2` means **"held/equipped item"**
> — it covers hats, shoes, hair and masks **as well as** weapons (174 items use
> it). Weapons are the **subset** below, identified by their weapon sprite, not
> by `a4` alone. (`a4 === 1` = placeable block.)

---

## 1. Confirmed weapon assets

All weapon/tool sprites live in **`tiles.png`** with exact rects (recovered).
Selected (full list in the JS catalog):

| Sprite key | Rect [x, y, w, h] |
| --- | --- |
| `SWORD_PNG` | 1442, 720, 70, 38 |
| `EXCALIBUR_PNG` | 1911, 644, 87, 40 |
| `PIRATESWORD_PNG` | 988, 883, 91, 38 |
| `AXE_PNG` | 250, 4, 82, 42 |
| `HAMMER_PNG` | 1702, 352, 57, 34 |
| `CLEAVER_PNG` | 792, 697, 82, 40 |
| `CROWBAR_PNG` | 1354, 696, 76, 32 |
| `PIPEWRENCH_PNG` | 917, 720, 74, 35 |
| `PICKAXE_PNG` | 1622, 820, 73, 57 |
| `SHOVEL_PNG` | 967, 1235, 96, 39 |
| `LIGHTSABRE_PNG` | 699, 264, 32, 17 |
| `RAILGUN_PNG` | 437, 1207, 29, 50 |
| `GOLDRAYGUN_PNG` | 1501, 352, 31, 48 |
| `LIGHTGUN_PNG` | 436, 740, 35, 52 |
| `SHOTGUN_PNG` | 468, 1206, 28, 63 |
| `MUSKET_PNG` | 784, 936, 38, 84 |
| `GRENADELAUNCHER_PNG` | 1533, 352, 29, 60 |
| `BAZOOKA_PNG` | 146, 604, 29, 60 |
| `CUPIDBOW_PNG` | 563, 352, 64, 29 |

**[CONFIRMED] Projectile / effect sprites** (also in `tiles.png`):

| Sprite key | Rect | Likely use |
| --- | --- | --- |
| `BLACKBALLET_PNG` | 105, 38, 32, 16 | bullet |
| `CUPIDARROW_PNG` | 58, 1593, 18, 52 | arrow |
| `MISSILE_PNG` | 275, 444, 20, 47 | rocket/missile |
| `PURPLERAY_PNG` | 275, 402, 21, 34 | ray shot |
| `FLASH_PNG` | 825, 761, 162, 162 | muzzle/explosion flash |
| `SPARK_PNG` / `SPARK2_PNG` | 14,192,2,2 / 1,498,6,6 | impact sparks |

---

## 2. Confirmed weapon/item metadata

**38 confirmed combat weapons/tools** (item id = switch `case`; name = client
`_1`). Category is **[INFERRED]** from sprite + animation (see §3/§5).

| id | category | name | sprite |
| --- | --- | --- | --- |
| 55 | melee | Fake Sword | `SWORD_PNG` |
| 239 | melee | Excalibur | `EXCALIBUR_PNG` |
| 242 | melee | (Pirate Sword) | `PIRATESWORD_PNG` |
| 227 | melee | (Axe) | `AXE_PNG` |
| 48 | melee | (Hammer) | `HAMMER_PNG` |
| 245 | melee | Meat Cleaver | `CLEAVER_PNG` |
| 243 | melee | Crowbar | `CROWBAR_PNG` |
| 244 | melee | Pipewrench | `PIPEWRENCH_PNG` |
| 241 | melee | Rock | `ROCK_PNG` |
| 329 | melee | Blade | `B112_0_PNG` |
| 379–394 | melee | Lightsabre / Dual Lightsabre | `LIGHTSABRE_PNG` / `DUALLIGHTSABRE_PNG` |
| 45/46/47 | melee | Red/Black/White Boxing Gloves | `BOXINGGLOVE_PNG` |
| 228 | melee | Extinguisher | `EXTINGUISHER_PNG` |
| 229 | melee | Flashlight | `FLASHLIGHT_PNG` |
| 240 | tool | Pickaxe | `PICKAXE_PNG` |
| 246 | tool | Shovel | `SHOVEL_PNG` |
| 79 | ranged | Blue Ray Gun | `RAILGUN_PNG` |
| 80 | ranged | Red Ray Gun | `RAILGUN_PNG` |
| 83 | ranged | Green Ray Gun | `RAILGUN_PNG` |
| 81 | ranged | Beta Gun | `GOLDRAYGUN_PNG` |
| 235 | ranged | Light Gun | `LIGHTGUN_PNG` |
| 248 | ranged | Shotgun | `SHOTGUN_PNG` |
| 276 | ranged | Musket | `MUSKET_PNG` |
| 93 | ranged | Grenade Launcher | `GRENADELAUNCHER_PNG` |
| 139 | ranged | Bazooka | `BAZOOKA_PNG` |
| 326 | ranged | Mortar | `BAZOOKA_PNG` |
| 370 | ranged | Homing Mortar | `BAZOOKA_PNG` |
| 327 | thrown | Triple Mortar | `TRIPLE_PNG` |
| 371 | thrown | Depth Charge | `DEPTHCHARGE_PNG` |

Confirmed per-item fields from the client:
- **[CONFIRMED] id** — the item-definition `case` number (= hotbar item id).
- **[CONFIRMED] name** — the client display string (`b._1`), e.g. the SWORD
  sprite's item is literally named **"Fake Sword"**; the RAILGUN sprite is
  **"Blue/Red/Green Ray Gun"**; `GOLDRAYGUN` is **"Beta Gun"**.
- **[CONFIRMED] a4 = 2** — "held/equipped item" (not weapon-specific).
- **[CONFIRMED] arm offset** — `h.O27(item, x, y, layer)` places the weapon on
  the arm (layer 4 = hand), e.g. SWORD `(-20, 2, 4)`, RAILGUN `(-10, 0, 4)`,
  SHOTGUN `(-3, 28, 4)`.
- **[CONFIRMED] variant param** — `h.h4(n)`; for guns it distinguishes
  projectile/colour variants (railgun 4/1/2 = blue/red/green), for cosmetics
  it's a colour index. Meaning is per-item.

> Colour variants share one sprite (the 3 ray guns are all `RAILGUN_PNG`).

---

## 3. Confirmed use / attack intent

- **[CONFIRMED] Trigger:** left mouse held/click uses the selected hotbar item
  (audit §1). Wheel selects the slot. No `J`/`K`/number keys.
- **[CONFIRMED] Aim:** `atan2(worldMouseY−playerY, worldMouseX−playerX)`,
  encoded `floor((θ+2π)·600)` uint16, streamed in the move packet (opcode 6).
- **[CONFIRMED] Use packet — opcode 287 (`K._16`):**
  `(originX, originY, targetX, targetY, modeByte, slotIndex, [targetUuid])`,
  where `modeByte` carries the held weapon's fire id (`j35.u41`) and
  `slotIndex` is the selected hotbar slot (`q43`).
- **[CONFIRMED] Build/dig** (deferred for PvP): place block = opcode 11
  (`K.X8`), interact/dig = opcodes 20/47 (`K.Y0`/`K.Y1`).

---

## 4. Confirmed projectile / effect rendering

The client does **not** create gameplay projectiles; it renders ones the
**server** spawns:
- **[CONFIRMED] opcode 8 (`V38`)** — spawn an effect/projectile near a player.
- **[CONFIRMED] opcodes 15 / 16 (`U39`)** — projectile state update.
- **[CONFIRMED]** projectile/effect sprites exist in the atlas (§1) and are
  weapon-specific (bullet, arrow, missile, ray, flash, sparks).
- **[INFERRED]** which sprite each weapon's shot uses (the mapping was applied
  server-side via the spawned entity's type).

---

## 5. Unknown server-side combat behavior

Not in the client (the server computed it; that code is lost):
- **[UNKNOWN]** damage per weapon.
- **[UNKNOWN]** melee range / arc.
- **[UNKNOWN]** fire-rate / cooldown (no client weapon cooldown timer exists).
- **[UNKNOWN]** projectile speed / lifetime / gravity / pellet count / spread.
- **[UNKNOWN]** the exact melee-vs-ranged classification per item (we **inferred**
  it from the sprite role + the client's `gun_pose` (ranged) vs `hit` (melee)
  animation split — strong, but not a server-confirmed field).
- **[UNKNOWN]** `u41` → projectile-type mapping values.

---

## 6. Proposed standalone behavior (only where server logic is missing)

These are **proposals**, not extracted — see
`STANDALONE_PVP_COMBAT_DESIGN.md` for the full design. They fill only the
[UNKNOWN] gaps above and are tunable in a config file:

- **Melee** (sword/blade): short arc in the aim direction, single hit per swing,
  per-weapon cooldown.
- **Ranged** (ray guns / shotgun): spawn projectile(s) toward aim; die on
  enemy/wall/ttl; per-weapon fire-rate.
- Concrete starting numbers (damage, reach, speed, cooldown) are proposed in the
  design doc and **clearly marked as proposed, not extracted**.

---

## Recommendation — first weapons to implement

Implement the **real** Diggerz items, simplest-and-most-useful first:

1. **Fake Sword** — item **id 55**, `SWORD_PNG`. Melee. Simplest to resolve
   (arc overlap, no projectile). Best for proving hurtboxes, damage, death,
   respawn and FT20.
2. **Blue Ray Gun (Railgun)** — item **id 79**, `RAILGUN_PNG`. Ranged, the
   single-shot "ray" reads as a fast/clean projectile — simplest gun to resolve
   (one projectile, wall + hurtbox collision). (Red/Green = ids 80/83, same
   sprite, later.)
3. **Shotgun** — item **id 248**, `SHOTGUN_PNG`. Ranged, multi-pellet spread —
   add after the single-shot railgun works, since it reuses the projectile path
   with N pellets + spread.

Defer the rest (mortars, bazooka, lightsabre, tools) until these three feel
right. Tools (pickaxe/shovel) wait for the dig/build phase.
