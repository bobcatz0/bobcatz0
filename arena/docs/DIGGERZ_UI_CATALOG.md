# Diggerz UI / asset catalog (confirmed from client + assets)

The real Diggerz frontend assets are now in `arena/assets/`. Sprite rectangles
are recovered from the client (`diggerz_v-203.js`) into atlas JSONs. Nothing
invented.

| File | Size | Atlas | Contents |
| --- | --- | --- | --- |
| `tiles.png` | 2048² | `tiles.atlas.json` (`f`, 698) | terrain blocks, character parts, weapons, items |
| `ui.png` | 2048² | `ui.atlas.json` (`u`, 251) | UI: buttons, arrows, meter, coins, flags, bitmap font |
| `bknd.png` | 2048² | `bknd.atlas.json` (`sa`, 26) | parallax scenery: mountains, hills, moon, clouds, sky |
| `loading.jpg` | 640×960 | — | official loading screen (character + "Loading…") |
| `favicon.png` | 128² | — | app icon |

## In use now (this turn — presentation only, no combat)

- **`favicon.png`** → the page favicon.
- **`loading.jpg`** → a loading screen shown until the real assets finish loading.
- **`bknd.png`** scenery → parallax backdrop (`MOUNTAIN_PNG`, `HILL_PNG`,
  `MOON_PNG`) behind the world, via `src/render/Background.js`.
- **`tiles.png`** → terrain + character (already wired).

## Useful UI sprites identified in `ui.png` (for later wiring)

Confirmed `u`-atlas rects `[x, y, w, h]`. These are **ready to use** when we
style the HUD/hotbar — not wired yet (this turn is presentation/scale only).

| UI need | Sprite key | Rect |
| --- | --- | --- |
| Health / meter bar | `METER_PNG` | 193, 16, 32, 30 |
| Slot / tooltip panel (hotbar bg) | `TOOLTIP_PNG` | 594, 16, 32, 32 |
| Primary button | `REDBUTTON_PNG` | 1071, 147, 320, 104 |
| Secondary button | `YELLOWBUTTON_PNG` | 1645, 147, 320, 104 |
| Chat button | `CHATBUTTON_PNG` | 73, 147, 79, 82 |
| Score / currency icon | `COINS_PNG` | 154, 66, 76, 74 |
| Settings | `SETTINGS_WHEEL_PNG` (bknd) / gear in `ui` | — |
| Close (X) | `RED_X_PNG` | 0, 145, 61, 57 |
| Small close marks | `AX_PNG` / `CX_PNG` / `MX_PNG` | 16×11 each |

**Arrows** (left / right / up) are present in `ui.png` (visible in the sheet)
for hotbar/nav indicators — usable once we decide the HUD layout. The sheet also
contains the **Diggerz bitmap font** glyphs if we later want pixel-perfect text.

> Mapping to needs: HUD score → `COINS_PNG` + bitmap font; hotbar slots →
> `TOOLTIP_PNG` panel + weapon sprite; health bars → `METER_PNG`; buttons
> (reset/menu) → `REDBUTTON_PNG` / `YELLOWBUTTON_PNG`; match status → bitmap
> font or buttons. Country flags (most of the 251) are not needed for PvP.

## Explicitly out of scope (per request)

Ad / analytics / consent / notification assets are ignored:
`tag.min.js`, `mappings.json`, `OneSignalSDK.js`, `cmp.min.css`. Also
`FileSaver` / `howler` / `pako` are not used yet.
