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
The palette comes from the landing page: a near-black background, a lime accent and soft greys.

| Name | HEX | RGB | CMYK (approx.) | Use |
| --- | --- | --- | --- | --- |
| Ink | `#0A0C10` | 10, 12, 16 | 38, 25, 0, 94 | Frame and wordmark on light; dark backgrounds; the app icon tile |
| Text | `#F2F4F6` | 242, 244, 246 | 2, 1, 0, 4 | Frame and wordmark on dark; light backgrounds |
| Lime | `#B6F259` | 182, 242, 89 | 25, 0, 63, 5 | The sealed face on dark |
| Deep lime | `#4D7C0F` | 77, 124, 15 | 38, 0, 88, 51 | The sealed face on light |
| Grey | `#5B6168` | 91, 97, 104 | 12, 7, 0, 59 | Tagline on light (`#90969D` on dark) |

CMYK values are rough conversions; check them with the printer. No Pantone is defined.

**Approved pairs** (WCAG contrast):
- `dark` files (lime on ink) are the primary use: lime on ink is 14.8:1 and the frame on ink is 17.8:1.
- `light` files (deep lime) on white 5.0:1 or on the text colour 4.5:1.
- Lime on white is only 1.3:1: do not use it.
- One colour: `mono/*-black.svg` or `*-white.svg` when colour is not available.

## Type
The wordmark is outlined from Geist Medium and the tagline from Geist Mono Medium (SIL OFL 1.1), so the SVG files need no font. Do not retype them in another typeface. Geist and Geist Mono are the companion typefaces for surrounding text, as on the landing page.

## Don'ts
- Do not stretch, squash or rotate the logo.
- Do not recolour outside the palette, or colour the frame with the lime.
- Do not move the sealed face to another side.
- Do not add shadows, outlines, gradients or effects.
- Do not change the size of the symbol relative to the wordmark.
- Do not use the full symbol below 32 px.
- Do not place it on a busy background without a colour block behind it.
- Do not use it in a way that suggests the project is made or endorsed by CapRover.
