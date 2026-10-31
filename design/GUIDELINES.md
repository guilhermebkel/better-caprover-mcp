# better-caprover-mcp logo guidelines

## The mark
- **Idea:** a container cube with soft corners and one sealed face. The solid face is the read-only default made visible: the server operates apps and starts protected.
- **Versions:** horizontal (primary), stacked, symbol only, and a small symbol for 16 to 32 px.
- **Files:** `svg/` for screens (light and dark), `mono/` for one colour, `web/` for the favicon, app icon and manifest.
- **Unofficial:** the wordmark carries "UNOFFICIAL · MCP SERVER FOR CAPROVER". Keep it in prominent uses. The mark does not use the CapRover logo or its colours, and says nothing of affiliation.

## Clear space
Keep a clear zone of one quarter of the symbol height on every side. The zone scales with the logo; never use a fixed distance.

## Minimum size
| Version | Screen |
| --- | --- |
| Horizontal | 120 px wide |
| Stacked | 80 px wide |
| Symbol | 32 px wide |
| Small symbol (`symbol-small-*.svg`, favicon) | 16 px |

Below 32 px always use the small symbol: its frame is heavier so the openings stay clear.

## Colour
The mark uses the warm colours chosen for it: a red-orange frame and a yellow sealed face on dark, and an orange sealed face on light. The ink and the greys are the ones of the landing page.

| Name | HEX | RGB | CMYK (approx.) | Use |
| --- | --- | --- | --- | --- |
| Red-orange | `#EF5C24` | 239, 92, 36 | 0, 62, 85, 6 | The frame, on dark and on light |
| Yellow | `#F4E40C` | 244, 228, 12 | 0, 7, 95, 4 | The sealed face on dark |
| Orange | `#F4941C` | 244, 148, 28 | 0, 39, 89, 4 | The sealed face on light |
| Ink | `#0A0C10` | 10, 12, 16 | 38, 25, 0, 94 | Wordmark on light; dark backgrounds; the app icon tile |
| Text | `#F2F4F6` | 242, 244, 246 | 2, 1, 0, 4 | Wordmark on dark; light backgrounds |
| Lime | `#B6F259` | 182, 242, 89 | 25, 0, 63, 5 | Not in the logo. The accent of the landing page and the badges: it says "enabled" and "ok", so yellow and red-orange are left to the logo and do not look like a warning |
| Grey | `#5B6168` | 91, 97, 104 | 12, 7, 0, 59 | Tagline on light (`#90969D` on dark) |

CMYK values are rough conversions; check them with the printer. No Pantone is defined.

**Approved pairs** (WCAG contrast):
- `dark` files on ink are the primary use: the frame is 5.8:1 and the yellow face 14.9:1.
- `light` files on white: the frame is 3.4:1 and the orange face only 2.2:1. The frame carries the shape, so the mark stays readable, but do not use the light version below 32 px on white; use `mono/` there.
- Yellow on white is 1.3:1: do not use it.
- One colour: `mono/*-black.svg` or `*-white.svg` when colour is not available.

## Type
The wordmark is outlined from Geist Medium and the tagline from Geist Mono Medium (SIL OFL 1.1), so the SVG files need no font. Do not retype them in another typeface. Geist and Geist Mono are the companion typefaces for surrounding text, as on the landing page.

## Don'ts
- Do not stretch, squash or rotate the logo.
- Do not recolour outside the palette, or colour the frame with the yellow.
- Do not move the sealed face to another side.
- Do not add shadows, outlines, gradients or effects.
- Do not change the size of the symbol relative to the wordmark.
- Do not use the full symbol below 32 px.
- Do not place it on a busy background without a colour block behind it.
- Do not use it in a way that suggests the project is made or endorsed by CapRover.
