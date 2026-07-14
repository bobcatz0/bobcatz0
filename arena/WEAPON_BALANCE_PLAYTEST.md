# Weapon Balance Playtest — Fake Sword · Blue Ray Gun · Shotgun

A hands-on balance guide for the current three-weapon build. Use it with the
**⚙ Tuning** panel (live values + Export JSON). Damage numbers are PROPOSED
standalone values unless marked otherwise; fighter HP is 100.

> Time-to-kill (TTK) below assumes every hit lands, starting off cooldown.

---

## 1. What each weapon is supposed to do

| weapon | role | intended feel |
|---|---|---|
| **Fake Sword** | point-blank duel/punish | highest damage-per-second, but you must stand in the opponent's face and commit to the swing rhythm |
| **Blue Ray Gun** | mid/long-range poke | safe, steady chip damage from anywhere; wins if the target can't close distance |
| **Shotgun** | close-range burst | one heavy hit up close, then a long vulnerable reload — reward for ambush/corner play |

The triangle to protect: **sword beats shotgun point-blank** (out-tempos it),
**shotgun beats ray gun at close range** (burst > chip), **ray gun beats sword
at range** (never lets it close for free).

## 2. Current values

### Fake Sword (id 55)
| value | current | provenance |
|---|---|---|
| damage | 34 (3 hits to kill) | PROPOSED |
| strike distance | 26.7 px (tile/1.5) | **CONFIRMED** (client strike point) |
| strike y-offset | −10 px | **CONFIRMED** |
| strike radius | 6 px forgiveness | PROPOSED (not extracted) |
| swing animation | 0.200 s zswing | **CONFIRMED** |
| cooldown | 0.30 s (9 ticks confirmed; 30 tps assumed) | ticks CONFIRMED / rate ASSUMED |
| TTK | 3 hits ≈ **0.8 s** | — |

### Blue Ray Gun (id 79) — BEAM
| value | current | provenance |
|---|---|---|
| damage | 25 (4 hits to kill) | PROPOSED |
| range | **285 px ≈ 7.1 tiles** (beam line, instant) | PROPOSED_STANDALONE medium-range beam TEST cap |
| startup | 4 frames (muzzle shine, no hitbox) | PROPOSED |
| active | 2 frames (beam line hitbox) | PROPOSED |
| recovery | 12 frames (beam fade — visual only) | fade length = CONFIRMED 200ms type-28 laser |
| cooldown | 0.60 s = 36 frames | PROPOSED — client actually shows **50 ticks** (≈1.67 s @30tps), not adopted |
| TTK | 4 hits ≈ **1.8 s** | — |

> ⚠ 285 px is a **medium-range beam test**, not the OG long-range raygun —
> that would be a much longer beam with much lower damage, later. Note 285 px
> is deliberately close to the Shotgun's 250 px for this test.

### Shotgun (id 248)
| value | current | provenance |
|---|---|---|
| damage | 40 (3 hits to kill) | PROPOSED |
| range | 250 px = 6.25 tiles | PROPOSED cap (kept below the ray beam's 285 px) |
| projectile speed | 900 px/s | PROPOSED |
| cooldown | 1.33 s (**40 ticks CONFIRMED**; 30 tps assumed) | ticks CONFIRMED / rate ASSUMED |
| pellets | 1 (single short ray) | spread UNKNOWN_SERVER_SIDE |
| TTK | 3 hits ≈ **2.7 s** | — |

## 3. What to test by hand (per weapon)

**Fake Sword**
- Walk into the dummy and hold the swing rhythm — does landing 3 hits feel earned?
- Try hitting a moving target you're chasing; try swinging while retreating.
- Jump-in swing: can you land a hit on the way down?
- Whiff punish: miss on purpose — does the 0.3 s cooldown feel fair?

**Blue Ray Gun (beam)**
- Poke from 4, 6, and just past 7.1 tiles — the 285 px cap should read clearly
  (white endpoint circle at max range).
- Kite the dummy's position: shoot, retreat, shoot. Does chip feel oppressive?
- The beam is instant — does the 4f startup shine give the target any tell?
- Shoot through gaps/over ledges — the beam must end at walls (endpoint on the
  tile), never damage behind them.

**Shotgun**
- Ambush at 3–5 tiles: fire → the 1.33 s reload — does the gap feel survivable
  for the target and tense for the shooter?
- Fire at exactly ~6.25 tiles (use the debug range tick) — edge hits should
  feel readable, not random.
- Miss up close, then get swordded during reload — that SHOULD lose.
- Whiff at 7+ tiles — the ray visibly dying at 250 px should read clearly.

## 4. Signs of too strong / too weak

| weapon | TOO STRONG if… | TOO WEAK if… |
|---|---|---|
| Sword | you can face-tank shotgun/ray users and win by holding click; 3-hit kills happen through minor mistakes only | you can't finish even a cornered target; strike range feels like you must overlap the enemy |
| Ray Gun | chip from across the map decides every round; there's no reason to ever close distance | shots feel unlandable on moving targets; 4 hits takes so long the target always heals distance |
| Shotgun | one poke + retreat repeated wins with no exposure; it outduels the sword point-blank | the reload makes every exchange a loss; its burst doesn't scare anyone inside 7 tiles |

Cross-weapon smells: everyone picks the same weapon; a weapon is never picked;
FT20 rounds all end the same way regardless of positioning.

## 5. Recommended tuning ranges

| knob | floor | default | ceiling | notes |
|---|---|---|---|---|
| sword damage | 25 | **34** | 50 | 50 = 2-hit kill; dangerous |
| sword cooldown | 0.20 | **0.30** | 0.60 | below 0.2 becomes a blender |
| sword strike radius | 0 | **6** | 12 | 0 = pure authentic point |
| ray damage | 15 | **25** | 34 | 34 = 3-hit kill, big |
| ray cooldown | 0.45 | **0.60** | 1.67 | 1.67 = the confirmed 50 ticks @30tps |
| ray beam range | 200 | **285** | 680 | 285 = medium-range TEST; 680 ≈ the remembered 17-tile OG (pair with much lower damage) |
| ray startup | 2f | **4f** | 10f | more startup = more counterplay to the instant beam |
| shotgun damage | 30 | **40** | 60 | 60 = 2-hit kill; only with long cooldown |
| shotgun range | 200 | **250** | 400 | keep shorter than the ray beam |
| shotgun cooldown | 0.67 | **1.33** | 2.0 | 0.67 = 40 ticks if the real rate was 60 tps |

## 6. Presets

Apply by typing values into ⚙ Tuning (then Export JSON to save the run).

### A. STRICT — closest to confirmed/remembered Diggerz
Every confirmed tick honored at 30 tps; ray = the remembered ~17-tile OG
long-range beam paired with much lower damage.
```json
{ "fakeSword": { "damage": 34, "cooldown": 0.30, "reach": 27, "proposedStrikeRadius": 0 },
  "blueRayGun": { "damage": 15, "cooldown": 1.67, "range": 680, "startupFrames": 4, "activeFrames": 2 },
  "shotgun": { "range": 250, "damage": 40, "cooldown": 1.33 } }
```
Expect: slow, deliberate duels; misses hurt.

### B. PLAYABLE — the current shipped defaults
```json
{ "fakeSword": { "damage": 34, "cooldown": 0.30, "reach": 27, "proposedStrikeRadius": 6 },
  "blueRayGun": { "damage": 25, "cooldown": 0.60, "range": 285, "startupFrames": 4, "activeFrames": 2 },
  "shotgun": { "range": 250, "damage": 40, "cooldown": 1.33 } }
```
Expect: forgiving melee, chatty ray gun, deliberate shotgun.

### C. AGGRESSIVE — fast TTK brawl
```json
{ "fakeSword": { "damage": 40, "cooldown": 0.25, "reach": 27, "proposedStrikeRadius": 8 },
  "blueRayGun": { "damage": 34, "cooldown": 0.45, "range": 320, "startupFrames": 2, "activeFrames": 2 },
  "shotgun": { "range": 300, "damage": 50, "cooldown": 0.90 } }
```
Expect: 2–3 hit kills everywhere; positioning mistakes end rounds instantly.

## 7. Ten-minute playtest checklist

- [ ] **0–2 min, Sword:** kill the dummy 5×, mixing standing, chasing and
      jump-in hits. Note whiffs that "should have hit" (radius too small?)
      and hits that felt cheap (radius too big?).
- [ ] **2–4 min, Ray Gun:** kill 3× from ≥10 tiles, then 2× while moving.
      Note the range where landing shots stops feeling fair.
- [ ] **4–6 min, Shotgun:** kill 3× inside 7 tiles. Fire once at the debug
      range tick — edge behaviour readable? Note how the reload gap feels.
- [ ] **6–8 min, Switching:** run FT10-style: sword → ray → shotgun each kill.
      Which swap felt like a downgrade? That weapon is the balance problem.
- [ ] **8–10 min, One preset:** apply STRICT or AGGRESSIVE and re-kill 3×.
      Export JSON of whatever felt best and save it with a note.
- [ ] Log anything broken in `PLAYTEST_CHECKLIST.md` → Bugs to log.

## 8. Rule

**No new weapons until these three feel good.** A weapon passes when: it wins
the matchups it's supposed to win (see §1), loses the ones it should lose, and
you'd voluntarily pick it at least some of the time. Tuning-panel experiments
are encouraged; permanent value changes happen in `CombatConfig.js` afterwards,
as their own commit, keeping provenance labels honest.
