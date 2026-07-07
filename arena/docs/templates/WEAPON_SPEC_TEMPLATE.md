# Weapon spec — <weapon name>

> Copy this file to `docs/specs/<WEAPON>_SPEC.md` and fill every field.
> Design language: `docs/FRAME_DATA_TERMINOLOGY.md` (frame data first — engine
> terms like lifetime/velocity/seconds only in the *internal* notes).
> Provenance labels: CONFIRMED_FROM_CLIENT / CONFIRMED_FROM_ASSETS /
> CONFIRMED_BY_RUNTIME_TEST / LIKELY / PROPOSED_STANDALONE / UNKNOWN_SERVER_SIDE.

## Identity
| field | value |
|---|---|
| **weapon name** | |
| **archetype** | melee / beam / projectile / missile / … |
| **visual description** | what it looks like held + when used |
| **held sprite/icon** | atlas key + tint (h4 index) |
| **hold offset** | where the sprite sits relative to the hand anchor |
| **muzzle/strike point** | where shots/strikes originate (px offsets) |

## Stances (no attack motion — see CHARACTER_RENDERING.md rules)
| field | value |
|---|---|
| **idle hold stance** | pose while standing (reference image if any) |
| **walk hold stance** | pose while moving (bob allowed, no attack anticipation) |

## Attack
| field | value |
|---|---|
| **attack animation** | what plays on use (name + duration in frames) |
| **shot/swing behavior** | what actually happens (ray cast, strike point, spawned missile…) |
| **range** | X tiles = Y px (1 tile = 40 px) |
| **damage** | HP (note sweetspot/sourspot split if any) |
| **cooldown** | frames/ticks (state tick rate assumption) |
| **startup frames** | before the hitbox exists (telegraph) |
| **active frames** | hitbox exists |
| **recovery frames** | visual finish, no damage |

## Interaction
| field | value |
|---|---|
| **hitbox/collision logic** | line vs hurtbox, AABB, point, area… |
| **wall interaction** | blocked / explodes / passes through |
| **player interaction** | consumed on hit? pierces? once per target? |

## Balance
| field | value |
|---|---|
| **tuning knobs** | which values are exposed in the tuning panel |
| **counterplay** | how the opponent beats it |

## Provenance
| field | value |
|---|---|
| **confirmed from Diggerz/client** | list every extracted fact |
| **proposed for standalone** | every invented number |
| **unknown/server-side missing** | what is honestly lost |

## Tests needed
- [ ] (list before implementing — hit, miss, range cap, wall, cooldown, all directions where relevant)
