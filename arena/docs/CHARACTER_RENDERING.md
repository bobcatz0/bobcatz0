# Character rendering — final approach and why

**Decision: the prototype character is a single reference-image sprite**
(`assets/generated/default-diggerz-character-idle.png`), not a reconstructed
skeletal rig. This doc records the facts that forced that decision so the
question stays settled.

## 1. There is no finished character image in the original files

Verified directly (see `ORIGINAL_CHARACTER_RENDER_PATH.md` for the full audit):

- The Diggerz zip's only images are `tiles.png`, `ui.png`, `bknd.png`,
  `loading.jpg`, `favicon.png`. No character PNG.
- All 698 sprites in `tiles.png` were enumerated — only body **parts** (head,
  eyes, torso, legs, feet, arms, hands, in several clothing variants). The
  largest sprites are blocks/backgrounds/vehicles, never an assembled character.
- `"guyskin"` in `diggerz_v-203.js` is a **Spine skin name**, not a file.

## 2. How the original client actually builds the character

From the decompiled client (`diggerz_v-203.js`):

1. `GameSpecificInit` decodes the embedded base64 asset **`guy_anims`** — a
   Spine 3.6.53 skeleton JSON (bones, slots, `guyskin` skin, ~29 animations).
2. `G2(...)` instantiates it (negating y/rotation into screen space) and binds
   each slot to a `tiles.png` part sprite.
3. The body is coloured by multiply-tinting the WHITE parts with the `h4`
   palette, indexed by the player's colour (`P4 % 10`); worn clothing comes from
   per-player data (`m38`, the `J33` "wear" array).
4. The `idle`/`walk`/pose animations drive the bones every frame.

**Key consequence:** the character's final look depends on **player/account
data** (colour index + clothing) that lives server-side and is *not in the
client bundle*. The bare default is a grey-torso, green-legged guy — not the
character seen in real gameplay screenshots.

## 3. Why the skeletal reproduction was removed

We extracted the real skeleton and reproduced the render path (FK over the real
bones, real draw order, real palette). It was *technically* faithful — and it
still **did not look like the real in-game character** (proportions/pose/colour
read as wrong at gameplay scale, and the customised reference look isn't
recoverable from the files). Per the project rule — **visual output is the
judge** — a "real data" pipeline that renders wrong is wrong. Hand-tuning it
produced weeks of cursed intermediate results. The path was reverted.

The extraction knowledge is not lost: `ORIGINAL_CHARACTER_RENDER_PATH.md`
documents exactly where `guy_anims` lives and how to decode it, so a future
skeletal-animation pass can start from data, not archaeology.

## 4. The approach that shipped

- **Source:** a real in-game Diggerz character screenshot (provided as the
  visual reference), background flood-fill masked + de-fringed into a clean
  54×95 transparent idle sprite.
- **Files:** `assets/generated/default-diggerz-character-idle.png` + `.json`
  (dimensions, ground/center/head/hand anchors, source facing).
- **Renderer:** `src/render/CharacterSprite.js` draws the sprite pinned by its
  ground anchor (`TARGET_H` = on-screen height), mirrors horizontally for
  facing, and draws the held weapon at the hand anchor with per-weapon
  grip/rotation/scale (`CharacterRigConfig.js`). When the aim points up, the
  weapon is layered **behind** the body so it never covers the face
  (`weaponBehind`). A procedural placeholder covers the frames before the
  sprite loads.
- **Tests:** `tests/rig.test.js` — sprite/metadata consistency, per-weapon held
  rigs, weapon layering rule, facing rule.

## 5. ACCEPTED SYSTEM (owner-approved): copied reference sprites per state

The character is a set of **copied reference screenshots** — masked, never
drawn or invented. Current states:

| state | sprite | trigger |
|---|---|---|
| grounded (idle/run) | `default-diggerz-character-idle.png` | `grounded === true` |
| airborne (jump/fall) | `default-diggerz-character-jump.png` | `airPoseState()` → `'jump'`/`'fall'` |

Each sprite ships with a `.json` (dimensions, ground/hand anchors, source
facing, provenance). The renderer pins the ground anchor, scales to `TARGET_H`,
mirrors for facing, and overlays the held weapon.

### Rules (do not violate)

1. **Do NOT draw or invent poses.** The drawn-arm overlay was tried and
   rejected; it is deleted. Do not re-add anything like it.
2. **Do NOT resurrect the Spine rig** for rendering (see §3).
3. **New states come ONLY from owner-provided reference screenshots.** When a
   reference arrives for walk / fall / sword swing / gun pose / hitstun /
   death-respawn: mask it exactly like the existing ones (edge flood-fill with
   character-colour protection, largest component + interior hole-fill,
   halo de-fringe exempting character colours), save as
   `assets/generated/default-diggerz-character-<state>.png` + `.json` with
   `"copied, not drawn"` provenance, and wire it as a sprite state in
   `CharacterSprite`.
4. Until a reference exists for a state, the nearest existing sprite covers it
   (e.g. one jump sprite covers rising *and* falling today).

## 6. Trade-offs accepted

- Static frames per state; no in-between animation.
- The arm doesn't visibly raise toward the aim; the weapon does.
- Matching the reference exactly is guaranteed *by construction* — each sprite
  **is** its reference image.

If real skeletal animation is ever wanted, re-extract `guy_anims` per the audit
doc and build it as a separate, screenshot-judged pass — and only with the
owner's explicit go-ahead.
