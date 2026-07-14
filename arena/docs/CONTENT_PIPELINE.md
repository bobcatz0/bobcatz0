# Content pipeline & control philosophy

The order content is built in, the control scheme it must fit, and what is
explicitly deferred. Specs use `docs/templates/`; design language uses
`docs/FRAME_DATA_TERMINOLOGY.md`.

## Implementation order

1. **Weapon system** — slots, resolvers, frame-data timing, tuning knobs (live)
2. **Weapon specs** — one spec per weapon from `WEAPON_SPEC_TEMPLATE.md`,
   research-first (client audit → CONFIRMED/PROPOSED/UNKNOWN labels)
3. **Weapon implementation, one at a time** — spec → implement → tests →
   screenshots → balance playtest. No new weapon until the previous ones feel
   good (`WEAPON_BALANCE_PLAYTEST.md` rule).
4. **Gear specs** — later (`GEAR_SPEC_TEMPLATE.md`)
5. **Build mode** — later (`BUILD_SPEC_TEMPLATE.md`)
6. **Animation/emote system** — last, cosmetic (`ANIMATION_SPEC_TEMPLATE.md`)

## Control philosophy

**Equipment slots get hotkeys — individual weapons do not.**

| input | action |
|---|---|
| `1` | Weapon Slot 1 |
| `2` | Weapon Slot 2 |
| `3` | Weapon Slot 3 |
| Left click | use the selected weapon (in Weapon Mode) |
| Mouse | aim |
| `CTRL` | *(later)* toggle Build Mode on/off — press again to return to Weapon Mode (inspired by Coaster Town Recoastered's CTRL build toggling) |
| Left click in Build Mode | *(later)* place/use build |
| `Q` / right-click | *(reserved, later)* gear activation |
| Emotes | *(later)* cosmetic wheel/menu — never combat hotkeys |

Weapon Mode is the default mode. Adding a weapon must never add a new hotkey;
it goes into a slot.

## Deferred systems — DOCUMENT ONLY, DO NOT IMPLEMENT

### Carts (later)
- Boosting must NOT require holding one direction for a long time; the player
  picks momentum/speed direction more immediately.
- The chosen speed/direction shows an **arrow indicator**.
- Higher speed option = stronger boost AND longer cooldown.

### Future melee archetype (later)
- GunZ-style directional melee: sword swing + a chosen direction —
  left / right / up / down / up-left / up-right / down-left / down-right.
- Design idea only; the current Fake Sword stays facing-based.

### Gears (later)
- Jetpacks, wings, other movement/utility equipment.
- Controls reserved: likely `Q` / right-click.
- Spec with `GEAR_SPEC_TEMPLATE.md` before any implementation.

### Build mode (later)
- Default mode is Weapon Mode; `CTRL` toggles Build Mode (see table above).
- Spec builds with `BUILD_SPEC_TEMPLATE.md`.

### Animations/emotes (last)
- Cosmetic only, wheel/menu input, must not affect hitboxes.
- Character visuals remain **copied reference sprites** per
  `CHARACTER_RENDERING.md` — new states only from owner-provided screenshots.
