# Standalone PvP Arena — Combat Design (proposal)

Status: **proposal — not implemented.** No combat will be coded until this is
approved.

This proposes the combat system for the standalone PvP arena. It builds on the
**confirmed** Diggerz client controls (see
`DIGGERZ_CLIENT_MECHANICS_AUDIT.md`) and the **confirmed** Diggerz weapon roster
(see `DIGGERZ_WEAPON_CATALOG.md` / `src/diggerz/DiggerzWeaponCatalog.js`), and,
where the original Diggerz **server** logic is gone, proposes a clean new design
rather than pretending anything was extracted.

**Provenance ground rules (read first):**
- **Weapon roster** comes from the confirmed Diggerz client/assets (the weapon
  catalog) — real items, real ids, real names, real sprites. Not invented.
- **Combat controls** come from the confirmed Diggerz client (WASD/arrows,
  W/↑/Space jump, S/↓ descend, mouse aim, left-mouse use, wheel hotbar). No J/K.
- **Combat resolution** (damage, range, cooldown, projectile physics, hit
  detection, scoring) is the **only** part that needs new design, because the
  original server logic is missing.
- **Any new damage / cooldown / projectile / range value is PROPOSED, not
  extracted** — every such number below is tagged as a proposal and lives in a
  config file for tuning.

Three buckets are kept strictly separate:
1. **Confirmed from the Diggerz client** — facts we will reuse as-is.
2. **Missing because the Diggerz server is gone** — must be designed.
3. **Proposed design** — the new standalone combat (numbers are proposals).
4. **Needs your approval before coding** — the open decisions.

---

## 1. Confirmed from the Diggerz client (reuse as-is)

These are facts from the client (no invention). The standalone uses them as the
control + intent base.

- **Movement / jump controls:** `A`/`←` left, `D`/`→` right, `W`/`↑`/`Space`
  jump, `S`/`↓` descend. (Already implemented in the movement prototype.)
- **Attack/use control:** **left mouse held/click** = use the selected item
  (attack / dig / build). There is **no `J`/`K`** and no number keys.
- **Hotbar selection:** **mouse wheel** cycles the selected slot (`q43`).
- **Aim:** `angle = atan2(worldMouseY − playerY, worldMouseX − playerX)`,
  encoded `floor((angle + 2π) · 600)` as a uint16, sent continuously in the
  movement packet (opcode 6). → `CharacterRig.aimAngle/encodeAim`.
- **Use intent:** a use sends opcode **287** = `(originX, originY, targetX,
  targetY, modeByte, slotIndex, [targetUuid])`. → `WeaponSystem.buildUseIntent`.
- **Item model:** hotbar slots with `type` (`1` = block, `2` = weapon/tool) and
  `count`. → `ItemSystem.Hotbar`.
- **Animation states:** `idle`, `walk`, `jump_in`, `gun_pose`, `build`, `hit`.
- **Authority model (original):** the Diggerz **server** resolved everything;
  the client only sent intent and rendered server results.
- **Assets:** real weapon/block/character sprite rects recovered in
  `assets/tiles.atlas.json` (e.g. `SWORD_PNG`, `SHOTGUN_PNG`, `B108_0_PNG`).

---

## 2. Missing because the Diggerz server logic is gone

None of the following exist in the client; the server computed them and that
code is not recoverable. They must be **designed**, not extracted:

- Hit detection (melee overlap; projectile-vs-player).
- Per-weapon damage, melee range/arc, projectile speed/lifetime/gravity.
- Fire-rate / cooldowns (the client had no weapon cooldown timer).
- Projectile spawning + physics (the client only renders server-spawned shots).
- Scoring, win condition, respawn, and any safe-zone/shrink rules.
- The authority/anti-cheat model for a brand-new server.

---

## 3. Proposed design (new standalone PvP)

> All numbers below are **starting proposals** and tunable. They are not from
> Diggerz.

### 3.1 Controls (locked to the real Diggerz scheme)

| Input | Action |
| --- | --- |
| `A`/`←`, `D`/`→` | move left / right |
| `W`/`↑`/`Space` | jump (hold = higher) |
| `S`/`↓` | descend / drop |
| Mouse move | aim (cursor = aim point) |
| **Left mouse (hold/click)** | **use selected item** — attack / dig / build |
| **Mouse wheel** | change selected hotbar slot |

No other combat keys. (Optional later, behind approval: `R` reload, `Q` drop —
but only if we decide we want them; not in Diggerz.)

### 3.2 Use intent → attack pipeline

The confirmed flow already exists in `CombatController`:

```
left mouse pressed
  → CombatController reads selected hotbar item + aim point
  → emits a use-intent (opcode-287 shape: origin, target, mode, slot)
  → the RESOLVER turns the intent into an attack
```

Proposed: the **resolver** is the new piece. It looks at the selected item's
*category* and applies the proposed behavior below. In local play the resolver
runs in-process; online it runs on the server (same code) — see §3.13.

### 3.3 Weapon categories & roster (from the confirmed catalog)

The roster is **not invented** — it is the confirmed Diggerz weapon catalog
(`DIGGERZ_WEAPON_CATALOG.md`, 38 items with real ids/names/sprites). Categories
are [INFERRED] from sprite role + the client's `gun_pose`/`hit` animation split:

| Category | Real Diggerz items (id, name) |
| --- | --- |
| **Melee** | 55 Fake Sword, 239 Excalibur, 242 Pirate Sword, 245 Meat Cleaver, 243 Crowbar, 329 Blade, 379+ Lightsabre … |
| **Ranged** | 79/80/83 Ray Gun (railgun), 81 Beta Gun, 235 Light Gun, 248 Shotgun, 276 Musket, 93 Grenade Launcher, 139 Bazooka … |
| **Thrown** | 327 Triple Mortar, 371 Depth Charge |
| **Tool** (later) | 240 Pickaxe, 246 Shovel |

Each weapon's **identity** (id, name, sprite, rect, category) is **confirmed**
and lives in `DiggerzWeaponCatalog.js`. Its **combat values** (`damage`,
`cooldown`, melee `reach`/`arc`, projectile `speed`/`ttl`/`pellets`/`spread`)
are **[UNKNOWN] server-side** → they are filled by the **proposed** config
(§3.4–3.7), clearly marked as proposed, never as extracted.

### 3.4 Melee behavior — Combat V1 weapon: **Fake Sword** (catalog id 55)

Identity is **confirmed** (id 55, name "Fake Sword", `SWORD_PNG`). The behavior
values are **PROPOSED standalone PvP values — NOT extracted from Diggerz** (the
server logic is gone). All live in `src/combat/CombatConfig.js`:

- On use: play `hit`; spawn a short-lived **hit arc** in the aim direction.
- **[PROPOSED]** reach `46 px`, arc `70°`, active `0.12 s`, cooldown `0.45 s`,
  damage `34` (→ 3 hits to drop a 100-HP fighter).
- One target hit per swing.

### 3.5 Projectile behavior — Combat V1 weapon: **Blue Ray Gun** (catalog id 79)

Identity is **confirmed** (id 79, name "Blue Ray Gun", `RAILGUN_PNG`). The
behavior values are **PROPOSED standalone PvP values — NOT extracted**:

- On use: play `gun_pose`; spawn one straight projectile/ray toward the aim.
- **[PROPOSED]** speed `900 px/s`, ttl `1.2 s`, no gravity, cooldown `0.6 s`,
  damage `25` (→ 4 hits to drop a 100-HP fighter), projectile `24×6 px`.
- Dies on enemy hit, wall hit (terrain), or ttl. We spawn projectiles ourselves
  (the client never did — §2).

### 3.5b Third weapon (later) — **Shotgun** (catalog id 248)

Added only after the first two work. Per the request, the shotgun's firing
shape (pellet count / spread) will be taken from the **real client's shotgun
functions** in `diggerz_v-203.js`, not invented; only the gap values (damage/
cooldown) remain PROPOSED.

### 3.6 Digging / building tools (later, gated)

Not in the first combat pass. When added: left mouse with a Tool digs the aimed
tile (mutate terrain, like the movement prototype's grid); with a Block places
a tile if `count > 0`. Uses the confirmed opcodes 11/20/47 shapes if/when we go
online. **Flagged: do not build until combat core is approved.**

### 3.7 Cooldowns

Per-weapon `cooldown` seconds, tracked on the attacker. A use is rejected if the
weapon is still cooling down. (Diggerz had no client cooldown; this is new and
necessary to prevent spam.)

### 3.8 Hit detection & hurtboxes

- **Hurtbox:** each fighter has an AABB hurtbox derived from its body (we
  already have `bodyHurtbox`-style logic from the prototype; it will be
  re-introduced cleanly under the new design, not the deleted placeholder).
- **Melee:** arc/box vs enemy hurtbox overlap.
- **Projectile:** projectile AABB vs enemy hurtbox; projectile vs terrain via
  the existing `TileCollision` (point/tile test).
- Resolved **once** per attack instance.

### 3.9 Damage vs hit-scoring — two options

- **Option A — Hit-count FT20 (simplest):** each confirmed hit = +1; first to
  20 wins. No health. Fast to build; good for spacing tests.
- **Option B — Health + kills FT20 (recommended):** each fighter has HP (e.g.
  100); weapons deal damage; a kill = +1; first to **20 kills** wins. Closer to
  a real arena and to CTR-style FT20.

→ **Decision needed (§4).**

### 3.10 FT20 rules (proposed)

- Match = first to **20** (kills under Option B, or hits under Option A).
- HUD shows `P1 n — FT20 — n P2` (already present as a placeholder).
- On reaching 20: show "Px Wins FT20", freeze scoring, offer reset (`R` or a
  button). (Reset already existed; will be re-added under the new design.)

### 3.11 Respawn rules (proposed, Option B)

- On death: brief delay (~`1.5 s`), then respawn at a spawn point with full HP
  and temporary spawn protection (~`1 s`, no damage dealt/taken).
- Spawn points: a small list per arena (the map can mark them like it marks the
  player spawn today).

### 3.12 Wall / projectile collision

- Players already collide with terrain (`TileCollision`).
- Projectiles test their position against `TileCollision.isSolid` each step and
  die on a solid tile (and on arena bounds).

### 3.13 Server authority model

Mirror the **confirmed Diggerz model** (client sends intent; authority
resolves), but with our own authority code:

- **Single resolver, two homes.** The combat resolver (hit detection, damage,
  cooldowns, projectiles, scoring) is **pure and headless** so it can run:
  - **locally** now (single-process, instant), and
  - **on a server** later (same module) for online play.
- The client/controller only ever emits **intents** (move+aim, use). It never
  decides hits. This keeps local and online identical and is the basis for
  anti-cheat.
- Server sends back authoritative state (positions, projectiles, hits, scores) —
  the same shape we already use for movement relay in the diggerz server.

### 3.14 Anti-cheat considerations

Because the resolver is authoritative:

- Validate every use: cooldown elapsed, item actually in the hotbar, aim within
  range, fire-rate sane (we already have the movement anti-cheat validator
  pattern: clamp + flag, never trust the client).
- Damage/hits are computed authority-side only; clients can't assert a kill.
- Rate-limit use intents (per the existing movement-validator approach).
- Hidden info (HP, cooldowns) is server-owned; clients render what they're told.

### 3.15 Path to online PvP

1. Build the **headless resolver** + local play first (this design).
2. Wrap the resolver in the existing diggerz binary WebSocket server (it already
   relays movement); add use-intent (opcode-287-shaped) and projectile/hit
   broadcast packets.
3. Clients send intent; server runs the resolver; broadcasts results. The
   confirmed opcodes (6 move+aim, 287 use, 8/15/16 projectiles, 11 tiles) give
   us a ready-made wire vocabulary.

### 3.16 Path to ranked & tournament (later, out of scope now)

- **Ranked:** add accounts + matchmaking + an MMR/Elo on top of FT20 match
  results. The resolver already produces authoritative match outcomes to feed a
  rating system. No combat changes needed.
- **Tournament:** bracket/lobby orchestration around the same match results.
- Both are **separate systems** layered on the authoritative match output — not
  part of the combat core, and explicitly **not** to be built now.

---

## 4. Needs your approval before coding

Please confirm these so the build matches your intent (no code until then):

1. **Scoring model:** Option A (hit-count FT20) or **Option B (health + kills
   FT20, recommended)**?
2. **First weapon set (v1):** confirmed real Diggerz items recommended (from the
   catalog): **id 55 "Fake Sword"** (melee) → **id 79 "Blue Ray Gun" / railgun**
   (single-shot ranged) → **id 248 "Shotgun"** (multi-pellet ranged). Confirm
   this order / set.
3. **Tools/building:** include dig/build in the first combat pass, or defer
   until after melee+gun feel right? (Proposed: defer.)
4. **Respawn:** enable respawn (Option B) or keep a single life per point and
   just score hits (Option A)?
5. **Second fighter for testing:** a still dummy again, a simple AI, or
   two-keyboard local? (Proposed: still dummy first, to test spacing only.)
6. **Numbers:** accept the proposed starting values (reach/arc/speed/cooldowns)
   as defaults to tune, or set your own?
7. **Authority:** confirm the "pure headless resolver, local now / server later"
   model is what you want.

Once you approve (and answer 1–7), the build order would be:

`HurtboxSystem → MeleeResolver → ProjectileResolver → MatchState (FT20/respawn)
→ wire into CombatController → local test (dummy) → headless resolver tests`,

all using the confirmed controls and `src/diggerz/` modules — no invented keys.
