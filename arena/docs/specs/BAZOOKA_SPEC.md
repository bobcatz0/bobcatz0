# Weapon spec — Bazooka (SPEC ONLY — NOT IMPLEMENTED)

> Status: **spec only.** Do not implement until explicitly asked and until the
> current three weapons pass the `WEAPON_BALANCE_PLAYTEST.md` rule.
> References: `docs/references/bazooka_missile_smoke_reference.png` (missile +
> smoke trail), `docs/references/bazooka_held_reference.png` (equipped/held).
> Design language: `docs/FRAME_DATA_TERMINOLOGY.md`. All numbers below are
> PROPOSED_STANDALONE starting points unless labeled otherwise.

## Identity
| field | value |
|---|---|
| **weapon name** | Bazooka |
| **archetype** | projectile / missile (explosive area damage) |
| **visual description** | shoulder-carried launcher; fires a visible missile with a smoke trail attached from the moment of firing; explosion visual on collision (see reference images) |
| **held sprite/icon** | to be confirmed from the client catalog before implementation (id/sprite/tint UNKNOWN until researched — research-first, like the Shotgun) |
| **hold offset** | from the sprite's hand anchor; confirm gun_tip from the client if present |
| **muzzle/strike point** | launcher muzzle (front of the tube); missile spawns there |

## Stances
| field | value |
|---|---|
| **idle hold stance** | carried like the held reference image; gun-style aim-at-mouse hold (same system as the other guns) |
| **walk hold stance** | same hold; no attack anticipation |

## Attack
| field | value |
|---|---|
| **attack animation** | muzzle flash/backblast puff on fire (visual only) |
| **shot/swing behavior** | spawns ONE missile toward the aim; missile travels in a straight line until it collides with a wall/object/player, then explodes |
| **range** | unlimited / very long — the missile is stopped by collision, not by a range cap (internal: a generous max lifetime only as a leak guard, never reached on any real map) |
| **damage** | sweetspot (direct hit) **60** / sourspot (explosion only) **25** — PROPOSED, tune in playtest |
| **cooldown** | **90 frames** (1.5 s) — PROPOSED; long, it's a commitment weapon |
| **startup frames** | **8f** before the missile leaves the muzzle (shoulder-and-fire telegraph) |
| **active frames** | missile: active the entire flight (it IS the sweetspot hitbox). Explosion: **3f** area hitbox on collision |
| **recovery frames** | ~**12f** — explosion visual fades; no damage during the fade |

## Sweetspot / sourspot model
- **Sweetspot (critical):** the missile body directly collides with a player's
  hurtbox (or the object/tile the player is standing on, directly under their
  feet) → full critical damage.
- **Sourspot:** the player was NOT directly hit but overlaps the explosion
  area hitbox during its active frames → lower damage.
- **Radii:** inner radius **24 px** (treated as direct/sweetspot) and outer
  radius **72 px** (sourspot). Either a hard two-ring model or linear distance
  falloff from inner→outer (pick one at implementation time; two-ring is
  simpler to test). One damage application per player per explosion.

## Frame data summary
| phase | frames | notes |
|---|---|---|
| startup | 8f | before the missile fires |
| missile travel | until collision | missile visible + smoke trail attached from frame 1 of flight |
| explosion active | 3f | area hitbox (inner/outer radius) |
| explosion recovery | ~12f | visual fade only, no damage |
| cooldown | 90f | from the press |

## Interaction
| field | value |
|---|---|
| **hitbox/collision logic** | missile = small AABB swept along its path (direct-hit check first); explosion = circle-vs-hurtbox with inner/outer radius |
| **wall interaction** | missile explodes on the first solid tile; explosion does NOT pass through walls (line-of-sight check from explosion centre, or at minimum the wall tile absorbs it) |
| **player interaction** | direct hit consumes the missile and deals sweetspot damage; the same player does not also take sourspot damage from the resulting explosion; self-damage: decide before implementing (default: none in V1) |

## Visual
- Missile visible for its entire flight.
- **Smoke trail attached behind the missile from the moment the shot is
  fired**, following the missile's path (see missile/smoke reference).
- Explosion visual appears at the collision point; fades during recovery.

## Balance
| field | value |
|---|---|
| **tuning knobs** | missile speed, sweetspot damage, sourspot damage, inner radius, outer radius, cooldown, startup frames |
| **missile speed** | **520 px/s** PROPOSED — slow enough to dodge/jump at range, deadly in enclosed spaces |
| **counterplay** | dodge the slow visible missile (the smoke telegraphs it), fight up close inside its startup+cooldown, use terrain so the explosion is absorbed |

## Provenance
| field | value |
|---|---|
| **confirmed from Diggerz/client** | nothing yet — a client research pass (item table id, sprite, muzzle, cooldown ticks, shot effect type) is REQUIRED before implementation, same as the Shotgun audit |
| **proposed for standalone** | every number above (speed, damages, radii, frames, cooldown) |
| **unknown/server-side missing** | real damage model, real explosion radii/falloff, self-damage rule, real cooldown |

## Tests needed (before/while coding the Bazooka)
- [ ] missile fires toward the aim in all 8 directions
- [ ] missile travels until wall collision (no range cap ends it on an open map)
- [ ] missile explodes on wall / object / player collision
- [ ] direct player hit = sweetspot damage (single application, missile consumed)
- [ ] near-miss inside outer radius = sourspot (lower) damage
- [ ] outside outer radius = no damage
- [ ] a directly-hit player is NOT also dealt sourspot damage by the same explosion
- [ ] explosion damage only during its active frames (fade deals nothing)
- [ ] explosion blocked by walls (no damage through solid terrain)
- [ ] cooldown gates refire; startup delays the missile spawn
- [ ] smoke-trail record exists from the first flight frame (render-side check)
- [ ] tuning knobs (speed/damages/radii/cooldown) apply live per shot
