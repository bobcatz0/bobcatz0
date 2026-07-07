# Build spec — <build name>

> Build Mode is LATER (see `docs/CONTENT_PIPELINE.md`): `CTRL` toggles Build
> Mode on/off; left-click in Build Mode places the build (Weapon Mode is the
> default). Copy to `docs/specs/` and fill.

| field | value |
|---|---|
| **build name** | |
| **mode requirement** | Build Mode only (CTRL toggled) |
| **placement rule** | where/how it may be placed (grid snap, distance from player…) |
| **lifetime** | how long it exists (frames/ticks, or permanent-until-broken) |
| **cooldown** | frames/ticks between placements |
| **HP** | how much damage it absorbs |
| **what it blocks** | movement / projectiles / beams / explosions / line of sight |
| **what breaks it** | which weapons/effects damage it and how fast |
| **placement restrictions** | no-build zones, overlap rules, max count |
| **abuse cases** | box-in kills, spawn camping, stalling FT rounds — and the mitigation |

## Tests needed
- [ ] (placement rules, HP/break, blocking behavior per weapon archetype, restriction/abuse mitigations)
