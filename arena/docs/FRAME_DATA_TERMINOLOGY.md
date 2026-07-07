# Frame-data terminology (design language)

**Rule: frame data first.** All PvP weapon/gameplay design is written in
fighting-game frame-data terms. Engine-internal words are allowed only inside
implementation code and "internal" notes — never as the primary description of
how a weapon plays.

**1 frame = 1/60 s** (design convention). The sim runs a 120 Hz fixed step;
2 sim steps = 1 design frame. Cooldowns may also be given in Diggerz *game
ticks* when the value was extracted from the client (tick rate assumed 30/s).

## Player/design terms (use these)

| term | meaning |
|---|---|
| **range** | how far the attack reaches, in **tiles** and **px** (1 tile = 40 px) |
| **startup frames** | time between pressing attack and the hitbox existing (telegraph: weapon shine/flash, windup) |
| **active frames** | frames during which the damaging **hitbox** exists |
| **recovery frames** | attack is visually finishing (beam fading, arm returning); **no damage** unless intentionally designed |
| **cooldown** | frames/ticks before the player may attack again (measured from press) |
| **damage** | HP removed on hit |
| **sweetspot / sourspot** | stronger/weaker hit region of the same attack (e.g. direct missile hit vs explosion edge) |
| **hitbox** | the attack's damaging volume |
| **hurtbox** | the region of a character that can be hit |

## Engine/internal terms (implementation only)

`lifetime`, `velocity`, `ttl`, `seconds`, `projectile age`, `visual fade
duration`, `alpha`, `tween` — fine in code and in "internal" spec fields, but a
weapon's gameplay must never be *described* by them.

## Beam weapons — required framing

A beam is NOT a projectile and must not be described via lifetime/velocity:

- **startup frames** — muzzle shine/flash before the beam exists
- **active frames** — the beam line hitbox can damage (usually 1–2 frames)
- **recovery frames** — the beam fades on screen; visual only, no damage
- **cooldown** — until the next shot
- *(internal)* **visual fade duration** — how long the fade render lasts;
  intentionally LONGER than the active frames

Wrong: "the ray gun projectile has a 1.2 s lifetime."
Right: "the ray gun beam has 4f startup, 2f active, ~18f recovery, 36f cooldown,
7-tile range."

## Applying it to the current build

| weapon | frame-data description |
|---|---|
| Fake Sword | 0f startup (strike sent on press, real client behaviour), swing anim 12f, cooldown 9 game ticks (~0.30 s) — strike point, not a lingering hitbox |
| Blue Ray Gun | beam: 4f startup (muzzle shine) → 2f active line hitbox → 12f fading recovery (visual only; = the confirmed 200ms laser fade); range 285px ≈ 7.1 tiles (medium-range beam TEST cap — not the OG long raygun); cooldown 36f (0.6 s PROPOSED; client shows 50 ticks) |
| Shotgun | short ray: range capped 250px = 6.25 tiles; cooldown 40 game ticks (CONFIRMED) ≈ 80f @30tps |
