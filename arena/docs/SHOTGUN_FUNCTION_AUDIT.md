# Shotgun (id 248) — function audit

Everything knowable about the Diggerz Shotgun, researched from
`diggerz_v-203.js`, `tiles.png`, and the extracted weapon table, BEFORE
implementing Shotgun V1. Labels are strict:

- **CONFIRMED_FROM_CLIENT** — read directly from the decompiled client code
- **CONFIRMED_FROM_ASSETS** — verified against the real asset files
- **CONFIRMED_BY_RUNTIME_TEST** — verified by running code
- **LIKELY** — strong indication, not proven (includes owner recollection)
- **PROPOSED_STANDALONE** — our standalone value, not from Diggerz
- **UNKNOWN_SERVER_SIDE** — decided by the lost server; not recoverable

## Identity & visuals

| finding | value | label |
|---|---|---|
| sprite key | `SHOTGUN_PNG`, rect [468,1206,28,63] in `tiles.png` | CONFIRMED_FROM_CLIENT + CONFIRMED_FROM_ASSETS |
| name | `"Shotgun"`, held item (`a4 = 2`) | CONFIRMED_FROM_CLIENT (item table `case 248`) |
| tint | `h4(26)` — index 26 is outside the palette table ⇒ multiplies by (1,1,1) = **untinted** (natural sprite colours) | CONFIRMED_FROM_CLIENT |
| hold offset | `O27(b, -3, 28, 4)` ⇒ `t44=-3, t45=28` on the hand node | CONFIRMED_FROM_CLIENT |
| muzzle point | `P29(b, -8, 28, 26)` ⇒ a `gun_tip` child node at **(-8, 28)** on the weapon sprite | CONFIRMED_FROM_CLIENT |
| shot colour / mode | `u41 = 26` (the last P29 arg) — doubles as the weapon's FIRE MODE and the tracer colour index | CONFIRMED_FROM_CLIENT |

## Behaviour class & trajectory

| finding | value | label |
|---|---|---|
| behaviour class | `Yf.W48`: ids 79,80,81,82,83,86,**248** → `tm` — the **same gun class as the ray guns**; no shotgun-specific extras in `tm.H51` (those exist only for 81/82/86) | CONFIRMED_FROM_CLIENT |
| trajectory | `tm` calls `ma.call(this, a, 0)` ⇒ projectile **gravity = 0**: a straight shot, same as the ray guns | CONFIRMED_FROM_CLIENT |
| aim-preview velocity | base `F57`: 3600 px/s toward the mouse (client aim preview) | CONFIRMED_FROM_CLIENT |

## Firing (the `u39` gun-fire switch — the key find)

The client fire handler switches on the gun's `u41`. **The shotgun has its own
case (`case 26: case 28:`)**:

```js
case 26: case 28:
  a = l.z39.j35;                       // the equipped gun
  b = a.f0("gun_tip");                 // fire origin = the gun_tip muzzle node
  ... E.u6(b, 0, .5, .5, 2);           // muzzle recoil tween
  this.u37 = a.C5;                     // mode = the gun's colour index (26)
  this.u38();                          // -> K._16(muzzleX, muzzleY, mouseX, mouseY, 26)
  l.z39.o33 = 40;                      // COOLDOWN = 40 game ticks
```

| finding | value | label |
|---|---|---|
| use packet | **op 287** via `K._16(origin, target, mode)` — same op as all weapons, **mode = 26**, origin = `gun_tip`, target = the mouse world point (÷ tile size) | CONFIRMED_FROM_CLIENT |
| cooldown | **40 game ticks** (`o33 = 40`; regular guns get 50, melee 9, Beta 150/300). Tick RATE is not in the client — seconds require an assumed rate | CONFIRMED_FROM_CLIENT (tick count) / tick rate ASSUMED |
| recoil/shake | muzzle tween `E.u6(gun_tip, 0, .5, .5, 2)` on fire | CONFIRMED_FROM_CLIENT |

## Shot visual (the `ul` effect entity)

Server effect events of type 26/28 spawn `ul(x1,y1,x2,y2, type)`:

| finding | value | label |
|---|---|---|
| effect path | same `ul` stretched-tracer path as the ray guns | CONFIRMED_FROM_CLIENT |
| sprite | `SPARK_PNG` stretched muzzle→impact (rotated, midpoint anchor, `xScale = dist/width`) | CONFIRMED_FROM_CLIENT |
| colour | tinted `h4(26)` = **white** (untinted) | CONFIRMED_FROM_CLIENT |
| fade | type 26/28 use the QUICK fade: **alpha .7 → 0 over 200 ms** (regular tracers fade 2→0 over 500 ms) | CONFIRMED_FROM_CLIENT |
| beam | `BEAM_PNG` stretch is **type 28 only** — the shotgun (26) gets **no fat beam** | CONFIRMED_FROM_CLIENT |
| sound | types 26/28 skip the generic shot sound at spawn | CONFIRMED_FROM_CLIENT |

So the shotgun's authentic look is a **thin white quick-fading ray** — which is
also exactly what a short-range shotgun blast should read as.

## What is NOT in the client

| finding | status |
|---|---|
| range | **UNKNOWN_SERVER_SIDE.** No range value exists client-side (the tracer length comes from server-provided impact coords). Owner recollection: **~7 tiles ≈ 280 px @40px tiles** (Blue Ray ~17 tiles) — LIKELY, adopted as the PROPOSED_STANDALONE default. |
| damage | UNKNOWN_SERVER_SIDE → PROPOSED_STANDALONE in V1 |
| pellets / spread | UNKNOWN_SERVER_SIDE — nothing in the client suggests multiple pellets; the fire intent is a single origin→target line. V1 fires **one short ray**; pellets will not be added without new evidence. |
| gameplay projectile speed | UNKNOWN_SERVER_SIDE (client preview uses 3600) → PROPOSED_STANDALONE |

## Note discovered in passing (not applied)

The regular guns' `default:` fire case sets `o33 = 50` ⇒ the **Blue Ray Gun's
cooldown is 50 game ticks, CONFIRMED_FROM_CLIENT** (currently 0.6 s PROPOSED in
the prototype). Left unchanged per scope; adoptable in a future pass.

## V1 implementation contract (from this audit)

- Same ray-style shot system as the Blue Ray Gun (same class in the client).
- Straight shot (gravity 0 confirmed), **single ray**, no pellets.
- Range-limited: default **280 px = 7 tiles** (PROPOSED_STANDALONE, tunable).
- Cooldown **40 ticks** (CONFIRMED count) at the assumed 30 ticks/s = 1.33 s.
- Untinted sprite, real hold offset (-3,28) + muzzle (-8,28).
- Shot visual: thin **white** tracer, alpha .7→0 over **200 ms**, **no beam**.
- Damage PROPOSED_STANDALONE (V1: 40 — close-range reward, tunable).
