# Weapon function audit — everything the client knows about every weapon

Extracted from the decompiled client (`diggerz_v-203.js`) + the embedded
`guy_anims` Spine skeleton. **Found, not yet wired into the prototype.**
Machine-readable data: `docs/extracted/weapon_function_table.json` (261 held
items) and `docs/extracted/guy_weapon_anims.json` (animation keyframes).

## 1. The per-item definition table (~offset 798K)

One giant switch defines every item. Per held item (`a4 = 2`) it sets:

| field | meaning |
|---|---|
| `Init(f.X_PNG())` | base sprite in `tiles.png` |
| `h4(n)` / `h3(name)` | **palette tint** — many weapons are ONE base sprite tinted |
| `_1` | display name |
| `h.O27(b, x, y, z)` | **hold offset** on the hand (`t44,t45`), z-layer |
| `h.P29(b, mx, my, c)` | **"is a gun"**: muzzle point (`t48,t49`) + **shot colour `u41 = c`** |
| `h.q20(b)` | **"is a melee weapon"** flag (`T40`) |

Equip code (`m38`): the item attaches to the **front arm/hand node** at the hold
offset; guns get a `"gun_tip"` child node at the muzzle point; `j36` = equipped
melee item, `j35` = equipped gun.

### Our three weapons, exactly

| id | name | sprite | tint | hold offset | muzzle | shot colour |
|---|---|---|---|---|---|---|
| 55 | Fake Sword | `SWORD_PNG` | none | (−20, 2) | — | — (melee, `q20`) |
| 79 | Blue Ray Gun | `RAILGUN_PNG` | **`h4(4)` = blue (.3,.3,1)** | (−10, 0) | (0, 0) | **4 = blue** |
| 248 | Shotgun | `SHOTGUN_PNG` | untinted | (−3, 28) | (−8, 28) | 26 = white |

> Note: the grey `RAILGUN_PNG` is **tinted blue in-game** — our prototype
> currently shows it untinted. Same for the whole ray-gun family: 80 Red =
> `h4(1)`, 83 Green = `h4(2)`, 81 Beta = `GOLDRAYGUN` + `h4(10)`, 82 Purple =
> `PURPLERAY` + `h4(6)`, 86 Orange = `h3("orange")`.

## 2. Behavior classes (`Yf.W48` factory)

| ids | class | function |
|---|---|---|
| 79,80,81,82,83,86,248 | `tm` | gun; Beta Gun 81 adds 8 idle sparkles + a spark-line along each shot (`H51`); 82/86 recoil tween |
| 93,329,371 | `Ok` (F50=.55) | lobbed projectile at 0.55× velocity (grenade launcher family) |
| 326,327,328,370 | `Ok` | mortar lob: `v = 10·(dx, dy−50)` |
| 139 | `tp` | bazooka: straight shot, v=3600 |
| 107 | `rp` | thrown: `v = 8·(mouse−muzzle)`, gravity 150 |
| 65,113,132,186,228 | `km` | spray (extinguisher family) |
| 239 Excalibur | `Bp` | melee with `FLASH_PNG` glow, **swing anim = `zstab`** |
| 242 | — | swing anim = `zstab` |
| 379–394 sabres | `Pk` | idle anim `sabre_pose` (**not in the shipped skeleton** — see §4) |
| 56,116,149/150,161,163,172/185,216–218 | — | cosmetic idle/walk anim overrides (kpop_dance, crane_pose, smartphone, ballet_pose, robot, coffee, roo_walk) |
| default | `ma` | generic held item |

## 3. Firing model (client side — REAL values)

- **Launch velocity** (`F57`, base `ma`): **3600 px/s toward the mouse**, from
  the muzzle (`gun_tip`). Per-weapon overrides above. `F50` multiplies it.
- **Projectile gravity** (`f59`): default **300**, thrown `rp` **150**.
- **Trajectory preview** (`F53`): the original aim-arc = 11 `SPARK_PNG` dots at
  `p(t) = muzzle + (v/8)·t + ½·f59·t²`, `t = i/5`, alpha `1 − i/15`.
- **Firing sends op 287** (`K._16`): origin & target ÷ tile size, a mode byte,
  the selected slot, optional target id. The **server** resolves everything.

### Shot visual (`ul` effect entity, spawned from network effect events)
- Default **tracer**: `SPARK_PNG` stretched muzzle→impact (rotated, midpoint
  anchor, `xScale = dist/width`), `yScale 3→1` over 500 ms, **tinted `h4(u41)`**
  (Blue Ray Gun ⇒ blue), colour channels brighten then fade.
- **Type 28 = laser beam**: `BEAM_PNG` stretched to the full shot length,
  alpha .7→0 over **200 ms**.
- Type 26: quick tracer variant (same 200 ms fade, no sound).
- Plus an impact particle burst (`E.V0`) at the hit point and a gunshot sound
  (`Ak`) at the muzzle; the gun's `H51` adds per-gun extras (Beta spark-line).

## 4. Melee attack (`U30`) — the real swing

1. Requires an equipped melee item (`j36`) and cooldown `o33 ≤ 0`.
2. **Strike point** = `x + tileSize/1.5 · facing`, `y − 10`
   (mounted/crouched: straight below, `y + tileSize`).
3. Sends **op 287** with that point (mode 25) — **hit resolution is server-side**.
4. Plays **`zswing`** (or `zstab` for 239/242) with 50 ms blend + swing sound.
5. Sets cooldown **`o33 = 9` game ticks**.

### Animations (full keyframes in `guy_weapon_anims.json`)
| anim | length | what it is |
|---|---|---|
| `sword_pose` | static | hold stance — front shoulder cocked at **196°** |
| `zswing` | **0.200 s** | overhead chop: front shoulder **196° → 70° → 196°** (all bones keyed) |
| `zstab` | 0.133 s | forward stab (Excalibur/242) |
| `hit` | 0.400 s | taking-damage reaction |
| `idle` / `walk` / `jump_in` | 1.0 s loop / loop / — | locomotion |

**Missing from the shipped skeleton:** `gun_pose` and `sabre_pose` are
referenced by code but do **not** exist in this build's `guy_anims` — guns are
aimed by rotating the arm/weapon node toward the mouse, not by an animation.

## 5. Hitboxes — what exists and what doesn't

- **Character hurtbox**: `J34 = rect(−30, −180, 60, 140)` on the guy entity
  (60×140, relative to the feet origin). Client-side bounding rect.
- **Melee "hitbox"**: there isn't one client-side — the client sends a **strike
  point** (§4) and the server decides. Reach ≈ `tileSize/1.5` in front.
- **Projectile hitboxes / damage / pellet counts / fire cooldowns for guns**:
  **server-side, lost.** Not in the client. (The only client-side cooldown is
  the melee `o33 = 9` ticks.) Any damage numbers remain PROPOSED standalone
  values in our prototype.

## 6. What this enables (not yet done)

If/when approved, the prototype could adopt with **real** data: blue-tinted
Blue Ray Gun + palette-tinted gun family, real hold offsets + muzzle points,
the real `zswing`/`sword_pose`/`zstab` animations, blue tracer + type-28 laser
visuals, trajectory preview arc, melee strike point at `tile/1.5`, and the
9-tick melee cooldown. Damage/hit resolution would stay PROPOSED (server logic
is lost).
