# PvP Arena — Playtest Checklist

A focused pass/fail checklist for the current single-player prototype (you vs a
dummy). Tick each item; log anything that fails in **Bugs to log** at the bottom.

## How to run
```bash
cd arena
node serve.js            # http://localhost:8080
```
Open the URL. Controls: **A/D** or **←/→** move · **W/↑/Space** jump (hold = higher,
tap = small hop) · **S/↓** descend · **mouse** aim · **left-click** use weapon ·
**1/2/3** select weapon · **mouse wheel** zoom · **0** reset zoom. On-screen:
*show aim + debug*, *rig anchors*, *Reset position*, zoom buttons, **⚙ Tuning**.

> Toggle **show aim + debug** ON for most checks — it shows hurtboxes/hitboxes,
> aim line, and the debug panel (weapon, aim°, P1/P2 HP, score, coords, zoom).

---

## 1. Movement
- [ ] `A`/`←` moves left, `D`/`→` moves right; releasing decelerates to a stop.
- [ ] Top speed feels consistent (debug `vx` settles around ±285).
- [ ] `W`/`↑`/`Space` jumps; **holding** jumps higher, **tapping** gives a small hop.
- [ ] Coyote time: a jump pressed just after walking off a ledge still fires.
- [ ] Jump buffer: a jump pressed just before landing fires on touchdown.
- [ ] `S`/`↓` drops/descends as expected.
- [ ] Player lands cleanly on the floor and platforms (no jitter, no sinking).
- [ ] Left and right boundary walls block the player; no tunneling out of the map.
- [ ] All platforms are reachable with a normal jump (no impossible gaps).
- [ ] No spots where the player gets stuck or clips into tiles.

## 2. Camera & zoom
- [ ] Camera follows the player smoothly (not floaty, not snappy).
- [ ] Camera clamps at the world edges (no black/void beyond the map).
- [ ] **Mouse wheel up** zooms in, **wheel down** zooms out.
- [ ] Zoom clamps to **0.75×–2.0×** (debug `zoom` value); can't exceed either end.
- [ ] **0** resets zoom to 1.00×; `+`/`−` keys and on-screen buttons also work.
- [ ] Player stays centred while zooming; HUD, hotbar, and debug panel stay
      fixed to the screen (do not scale with zoom).
- [ ] Mouse wheel does **not** change the weapon (that's the number keys now).
- [ ] Zoom changes only the view — world coords/aim/collision are unaffected.

## 3. Weapon select
- [ ] `1` selects **Fake Sword**, `2` **Blue Ray Gun**, `3` **Shotgun** (Numpad 1/2/3 too).
- [ ] The hotbar highlights the selected slot and shows the weapon name.
- [ ] The selected weapon appears **held in the hand**; guns rotate toward the
      mouse, the sword sits in its **low diagonal guard** stance: idle = blade
      diagonally down-forward across the front; walking = blade diagonally
      forward/upward with a slight bob (it swings on click instead).
- [ ] Held weapon mirrors correctly when facing left vs right; stays attached
      while moving/jumping; doesn't detach or flip weirdly when aiming behind.
- [ ] Shotgun fires a **short white ray** (250px = 6.25 tiles, PROPOSED cap);
      with debug on, the range endpoint tick shows along the aim.

## 4. Sword combat (Fake Sword)
- [ ] Left-click swings: the sword plays the real zswing (cocked over the
      shoulder, overhead chop to the ground in front, back to the hold pose).
- [ ] A swing with the dummy **in strike range** (~27px in front) deals damage
      (≈34); out of range does nothing. The sword plays the real 0.2s zswing.
- [ ] Swing respects the cooldown (9 game ticks ≈ 0.3s) — spam-clicking doesn't multi-hit instantly.
- [ ] With **debug** on, the sword **strike point** marker (real client model —
      a point at tile/1.5 in front, not a hitbox) shows while the swing plays.
- [ ] One swing hits the dummy at most once (no double-counting per swing).
- [ ] Dummy HP bar + debug `P2 hp` drop by the damage amount on each hit.

## 5. Ray gun combat (Blue Ray Gun — BEAM)
- [ ] Left-click: a small **shiny white flash** shows at the muzzle (startup),
      then the **beam lane** appears instantly from the muzzle to max range or
      the first wall — it reads as a lane/wall, **not** a small projectile.
- [ ] A **white circle endpoint** shows at the end of the beam (max range or
      the impact point).
- [ ] A target on the beam line takes damage (≈25) — once per beam.
- [ ] Beam is **blocked by walls/tiles**: it visibly ends at the wall and
      deals no damage behind it.
- [ ] Beam is capped at **285px** (~7.1 tiles — medium-range beam TEST cap);
      with debug on, the range tick shows along the aim.
- [ ] After the short active hit window the beam **fades out** — the fade is
      visual only (nothing walking into a fading beam takes damage).
- [ ] Fire respects the cooldown (≈0.6s).
- [ ] Works aiming in every direction (up/down/diagonals), including into
      ceilings/floors (endpoint on the tile).

## 6. Dummy, death & respawn
- [ ] Dummy (P2) takes damage from both weapons; HP bar reflects it.
- [ ] Dummy **dies at 0 HP**; P1 score increases by **+1**.
- [ ] Dummy **respawns at the P2 spawn** (right side) after the respawn delay (~1.5s).
- [ ] On respawn the dummy is at **full HP** with brief **invulnerability** (~1s):
      damage during invuln is ignored (a faint flash shows it's protected).
- [ ] Health bar resets to full on respawn.
- [ ] "respawning…" marker shows while the dummy is dead.

## 7. FT20 win & rematch
- [ ] HUD shows the score as `P1 n · FT20 · m P2`.
- [ ] Reaching **20 kills** ends the match and shows the **win banner**.
- [ ] After the win, scoring stops (no further kills count).
- [ ] **Rematch** button resets score to 0, clears the winner, and revives the dummy.
- [ ] After a rematch the sword/ray gun can fire immediately (no stuck cooldown).

## 8. Hit feedback
- [ ] A **damage number** floats up above the dummy on each hit (gold for big hits).
- [ ] A small burst of **impact sparks** appears at the hit location.
- [ ] The damaged character shows a quick **red/white hit-flash**.
- [ ] A tiny **hit-pause** (brief freeze) registers on a hit, then play resumes smoothly.
- [ ] On death a **red ring** plays; on respawn a **purple ring** plays at the spawn.
- [ ] Feedback never blocks input or leaves lingering artifacts after it fades.

## 9. Tuning panel (⚙ Tuning, or `#tune` in the URL)
- [ ] Panel is hidden by default; the button (or `#tune`) opens/closes it.
- [ ] Sliders/inputs exist for: move speed, acceleration, friction, gravity, jump
      power (upward launch velocity); sword damage/cooldown/reach; ray gun
      damage/cooldown/beam range/startup/active frames; shotgun
      range/damage/cooldown; respawn time; invulnerability time.
- [ ] Changing a value affects play **immediately** (move speed, weapon stats, etc.).
- [ ] **Reset to defaults** restores every value and updates the inputs.
- [ ] **Export JSON** shows the current config; Copy / Download work.
- [ ] Typing into a panel field does **not** drive the player (no move/jump/zoom).

## Bugs to log
For each issue, note: **what you did → what you expected → what happened**, plus
weapon/zoom/score state and any console errors (F12). Keep them small and specific.

| # | Steps to reproduce | Expected | Actual | Severity |
|---|--------------------|----------|--------|----------|
|   |                    |          |        |          |
|   |                    |          |        |          |
|   |                    |          |        |          |

Severity guide: **A** = blocks play / crash · **B** = wrong behavior · **C** = polish/feel.

## Rule: do NOT add features during playtest
Playtesting is for **finding and logging** issues, not building. During a playtest:
- Do **not** add new weapons, systems, modes, multiplayer, ranked, or tournaments.
- Do **not** change movement physics, combat values, map, camera, or the character.
- Only **observe and record**. Tuning values via the dev panel is fine for *feel
  notes* (export the JSON), but treat code/feature changes as a separate task
  done **after** the playtest, from the logged bugs.
