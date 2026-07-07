# Weapon spec — Blue Ray Gun (id 79) — BEAM (implemented)

> Status: **implemented** (`src/combat/BeamResolver.js`, `CombatConfig.js`,
> `ArenaScene._drawBeams`). Beam look reference:
> `docs/references/raygun_beam_reference.png`. Design language:
> `docs/FRAME_DATA_TERMINOLOGY.md`.

## Identity
| field | value |
|---|---|
| **weapon name** | Blue Ray Gun — CONFIRMED_FROM_CLIENT (item table id 79) |
| **archetype** | beam (line hitbox, NOT a traveling projectile) |
| **visual description** | grey RAILGUN_PNG tinted h4(4) blue; on fire: small shiny white circle/flash at the muzzle (startup) → a thin lane from the muzzle to max range or impact with a **white circle endpoint** → the lane fades out |
| **held sprite/icon** | RAILGUN_PNG, tint h4(4) — CONFIRMED_FROM_CLIENT |
| **hold offset** | gun rig grip; rotates to the mouse aim |
| **muzzle/strike point** | weapon origin (P29 gun_tip {0,0}) — CONFIRMED_FROM_CLIENT; standalone fires from the attacker centre nudged toward the aim |

## Stances
| field | value |
|---|---|
| **idle hold stance** | gun aim-at-mouse hold (shared gun system) |
| **walk hold stance** | same; no attack anticipation |

## Attack (frame data — 1 frame = 1/60 s)
| field | value |
|---|---|
| **attack animation** | startup muzzle shine → beam lane → fade |
| **shot/swing behavior** | the whole beam line is cast at the press: muzzle → max range or first wall impact |
| **range** | **285 px ≈ 7.1 tiles** — PROPOSED_STANDALONE **medium-range beam TEST** cap. NOT the true OG long-range raygun (that comes later: much longer beam, much lower damage). Deliberately close to the Shotgun's 250 px for this test. |
| **damage** | 25 HP — PROPOSED (once per target per beam) |
| **cooldown** | 36 frames (0.6 s) — PROPOSED (client shows 50 ticks ≈ 1.67 s @30tps; not adopted) |
| **startup frames** | 4 — muzzle shine/flash; NO hitbox yet |
| **active frames** | 2 — the beam line hitbox can damage |
| **recovery frames** | 12 — the beam fades; **visual only, no damage** |
| *(internal)* visual fade duration | 200 ms — the CONFIRMED type-28 laser fade; intentionally longer than the active window |

## Interaction
| field | value |
|---|---|
| **hitbox/collision logic** | segment-vs-hurtbox (slab test) during active frames only; line locked at the press |
| **wall interaction** | beam ends at the first solid tile (4 px cast step); endpoint = impact point; no damage behind walls |
| **player interaction** | damages each target at most once per beam; does not hit the owner |
| **white endpoint behavior** | white circle drawn at the beam end — at max range in open air, at the impact point on a wall; fades with the beam |

## Balance
| field | value |
|---|---|
| **tuning knobs** | damage, cooldown, beam range (px), startup frames, active frames (⚙ Tuning panel) |
| **counterplay** | stay past 285 px, use terrain (any tile stops the beam), close distance during the 0.6 s cooldown; the startup shine is the tell |

## Provenance
| field | value |
|---|---|
| **confirmed from Diggerz/client** | identity (id 79, name, RAILGUN_PNG, h4(4) tint), muzzle point, shot colour u41=4, type-28 laser 200 ms fade, cooldown 50 ticks (observed, not adopted) |
| **proposed for standalone** | beam archetype numbers: 285 px range, 25 damage, 36f cooldown, 4f startup, 2f active |
| **unknown/server-side missing** | real range, real damage, real hit logic (server resolved hits; that code is lost) |

## Tests (all in `tests/combat.test.js`, passing)
- [x] beam fires in all 8 directions and hits a target on the line
- [x] beam ends at exactly max range (285 px endpoint, no impact flag)
- [x] beam ends on wall impact (endpoint at the wall, impact flag)
- [x] no damage during startup frames
- [x] damage only during active frames, once per beam
- [x] recovery/fade is visual only (target on the line takes nothing)
- [x] beam culled after the fade window
- [x] no projectiles exist (kind = beam; `projectilesOf(79)` empty)
- [x] no unlimited range (target past 285 px untouched)
- [x] cooldown gates refire
