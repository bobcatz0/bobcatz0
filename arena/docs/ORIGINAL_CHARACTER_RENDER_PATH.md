# Original Diggerz character render path

Source of truth: the decompiled client `diggerz_v-203.js` (Haxe/OpenFL, with a
Spine-style skeleton runtime) + `assets/tiles.png`. This documents *exactly* how
the original client builds and draws the player character, so the prototype can
reproduce it instead of guessing. Byte offsets below are into `diggerz_v-203.js`.

## 1. Where `guy_anims` is loaded

`GameSpecificInit` (≈122900):

```js
GameSpecificInit: function () {
  f.InitNames();
  var a = E.u2("guy_anims");
  Fc.M39 = (new Mm(a, !0)).getValue();   // parse the skeleton JSON once
  a = E.u2("pet_anims"); Td.M39 = (new Mm(a, !0)).getValue();
}
```

- `E.u2("guy_anims")` fetches the embedded asset named `guy_anims` — a
  **base64 string** found in the asset table (≈2964427):
  `{ name: "guy_anims", data: "eyJza2VsZXRvbiI6..." }`. Decoded it is a
  **Spine 3.6.53 skeleton JSON** (`{"skeleton":{...,"width":56.05,"height":90.86},
  "bones":[...],"slots":[...],"skins":{"default":..,"guyskin":..},"animations":{
  idle, walk, sword_pose, ... }}`).
- `Mm(...).getValue()` parses it; the parsed object is cached on `Fc.M39`
  (`Fc` is the player-character class, `__name__ = "H38"`).

## 2. What `guyskin` is

The character is constructed (`Fc` constructor, ≈384100):

```js
this.i33 = (Fc.n30.length ? Fc.n30.pop()
          : this.G2("guy_anims", "guyskin", f, Fc.M39, q.player.l0, !0));
```

- `i33` is the character's **skeleton instance**.
- `"guyskin"` is **a Spine SKIN name**, not a PNG. The skeleton JSON has two
  skins, `default` and `guyskin`; `guyskin` is the one that maps each slot to its
  body-part region (head→head, torso→torso, leg→leg, …). There is **no
  `guyskin.png`** — the pixels all come from `tiles.png`.

## 3. `G2(...)` — the skeleton loader

`G2: function (name, skin, f, data, l0, ...)` (≈34686) is a minimal Spine loader:

```js
for each bone J in data.bones:
  h._1 = J.name;
  h.Z21 = J.parent;
  h.set_local_rot(-J.rotation * Math.PI/180);   // rotation NEGATED
  h.b6 = J.x;                                    // x as-is
  h.b7 = -J.y;                                   // y NEGATED
```

So the client converts Spine's **y-up** data to its own **y-down** screen space
by negating `y` and the rotation per bone. It then attaches the skin's region
images per slot in the slot draw order, and binds the animations (idle/walk/…).
`f` is the atlas-sprite factory (`f.HEAD_PNG()` etc.); `l0` is the player look.

## 4. `q.player.l0` and player colors / tints

- `q.player.l0` is the player's **appearance/look data**, passed into `G2` and
  also used to colour the body. The colour lives on a small holder class `P3`
  (`Cd`, ≈381808): `{ P4, P5, P6, P7 }`, all default **0** (`P8()` sets them 0).
  `P4` is the **body colour index**.
- The body colour is applied in `m37` (≈393998) to the **WHITE base parts**:

  ```js
  f2("front_shoulder").f2("arm").Init(WHITE_ARM_PNG()).h4(e14(q7.P4) % e14(10) | 0);
  f2("back_shoulder").f2("arm_back").Init(WHITE_ARM_PNG()).h4(...);
  f2("torso").Init(WHITE_TORSO_PNG()).h4(e14(q7.P4) % e14(10) | 0);
  ```

  i.e. **only the torso + both arms** are tinted; the colour index = `P4 % 10`.

- `h4(index)` (≈40877) is the **colour palette** — it sets per-channel multiply
  `(r,g,b)` on the white sprite. The full table:

  | idx | r,g,b | colour | idx | r,g,b | colour |
  |----|-------|--------|----|-------|--------|
  | 0 | .6,.6,.6 | grey (DEFAULT) | 11 | 1,.53,1 | pink |
  | 1 | 1,.3,.3 | red | 12 | .8,.6,.4 | tan |
  | 2 | .3,1,.3 | green | 13 | .2,.5,.15 | dk green |
  | 3 | .3,1,1 | cyan | 14/15 | 1,.75,.33 | gold |
  | 4 | .3,.3,1 | **blue** | 16 | .15,.15,.5 | **dk blue** |
  | 5 | .2,.2,.2 | **near-black** | 17 | .5,.15,.15 | dk red |
  | 6 | .6,.3,1 | **purple** | 18 | .3,.15,.5 | **dk purple** |
  | 8 | 1,.5,.1 | orange | 19 | .83,.54,.4 | skin |
  | 9 | 1,.85,.15 | yellow | 20 | .5,.35,.2 | brown |

  With `P4 = 0` (default) → index 0 → grey torso/arms.

## 5. Atlas parts used for the DEFAULT character

Slot setup functions `m33` (legs), `m35` (head+eyes), `m36`/`m37` (arms+torso):

| part | sprite (`tiles.png`) | tint |
|------|----------------------|------|
| head | `HEAD_PNG` (brown) | none |
| eyes | `EYES_PNG` (added as a child of the head, offset `b6=-7, b7=-3`) | none |
| torso | **`WHITE_TORSO_PNG`** | `h4(P4%10)` |
| front/back arm | **`WHITE_ARM_PNG`** | `h4(P4%10)` |
| front/back hand | `HAND_PNG` / `HAND_BACK_PNG` (skin) | none |
| front leg | `LEG_PNG` (green) | none (`rgb=1`) |
| back leg | `LEG_BACK_PNG` (green) | none |
| pants | `PANTS_PNG` (green) | none |
| feet | `FOOT_PNG` (black) | none |

**Key consequence:** the bare default guy has a **grey** torso/arms, **green**
legs/pants, **black** feet and **skin** hands. The reference screenshot (dark
navy torso, blue/purple legs + shoes) is therefore **a customised player**, not
the default — its colour index and any worn clothing (`m38`, the `J33` "wear"
array) are player data that is **not recoverable from the client alone**.

## 6. Idle pose

- `Fc` sets `this.I32 = "idle"` as the default state (and `I33="jump_in"`,
  `I36="walk"`, `j30="zswing"`, `sword`/`gun` poses for actions). The skeleton
  plays the **`idle`** animation, which rotates the leg/arm/spine bones from the
  setup pose into the standing pose (e.g. `back_upperleg +16.21°`,
  `front_upperleg -11.6°`, looping with eased curves).
- Our prototype bakes **idle @ time 0** onto the setup bones (a static stand).

## 7. How the original applies pose / scale / tint / draw order / facing

- **Pose:** forward kinematics over the bone tree — each bone's world transform =
  parent world × local (`x`, `-y`, `-rotation`, scale), then the idle animation's
  bone keyframes are added.
- **Scale:** skeleton units ≈ px (skeleton is 56×91). The world sets the overall
  character scale via `set_local_xScale/yScale`.
- **Tint:** multiply `(r,g,b)` from the `h4` palette on the **white** torso/arms
  only (index `P4 % 10`); everything else natural.
- **Draw order:** the Spine **slot order** (back arm/leg → torso → pants → front
  leg → head → eyes → front arm). Eyes draw on top of the head.
- **Facing:** horizontal mirror via `set_local_xScale(±1)` on the skeleton.

## 8. What the prototype does (reproduction)

`src/render/guySkeleton.js` is the skeleton extracted verbatim (bones with the
idle pose baked, `guyskin` slot draw order + region offsets, eyes as the head
child at `-7,-3`). `src/render/CharacterSprite.js` runs the same FK + draw order
+ facing mirror, and tints the white parts with the **real `h4` palette**.

Because the reference is a **customised colour** (not the default grey/green),
the prototype selects real palette indices that match the reference look
(near-black torso/arms `idx 5`, blue legs/pants `idx 4`, purple shoes `idx 6`) —
using the **real palette**, not invented hex. If an exact 1:1 with the screenshot
is required, the missing piece is that player's `P4` + worn-clothing data, which
only exists server-side / in that account, not in the client bundle.
