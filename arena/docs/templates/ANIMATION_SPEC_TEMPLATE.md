# Animation spec — <animation name>

> Animations/emotes are LAST in the pipeline and cosmetic (wheel/menu input,
> never combat hotkeys). Character visuals stay copied reference sprites per
> `docs/CHARACTER_RENDERING.md` — a **visual reference from the owner is
> required** before any new pose exists. Copy to `docs/specs/` and fill.

| field | value |
|---|---|
| **animation name** | |
| **cosmetic or gameplay** | (emotes must be cosmetic) |
| **trigger** | input / event that starts it |
| **duration** | frames |
| **interrupt rules** | what cancels it (movement, damage, weapon use…) |
| **visual reference needed** | which owner-provided screenshot(s) it is copied from |
| **affects hitboxes** | must be **no** for cosmetic animations — state it explicitly |

## Tests needed
- [ ] (trigger, duration, interruption, hurtbox/hitbox unchanged while playing)
