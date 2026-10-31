# better-caprover-mcp logo guidelines

## The mark
- **Idea:** a container cube with one sealed face. The solid face is the read-only default made visible: the server operates apps and starts protected.
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
| Name | HEX | RGB | CMYK (approx.) | Use |
| --- | --- | --- | --- | --- |
| Ink | `#0F172A` | 15, 23, 42 | 64, 45, 0, 84 | Frame and wordmark on light; the app icon tile |
| Teal | `#0D9488` | 13, 148, 136 | 91, 0, 8, 42 | The sealed face on light |
| Bone | `#F8FAFC` | 248, 250, 252 | 2, 1, 0, 1 | Frame and wordmark on dark; light backgrounds |
| Bright teal | `#2DD4BF` | 45, 212, 191 | 79, 0, 10, 17 | The sealed face on dark |
| Slate | `#475569` | 71, 85, 105 | 32, 19, 0, 59 | Tagline on light (`#94A3B8` on dark) |

CMYK values are rough conversions; check them with the printer. No Pantone is defined.

**Approved pairs:**
- `light` files on white or on bone. Teal on white is 3.7:1: use it for the sealed face only, never for text.
- `dark` files on ink.
- One colour: `mono/*-black.svg` or `*-white.svg` when colour is not available.

## Type
The wordmark is outlined from Inter SemiBold (SIL OFL 1.1), so the SVG files need no font. Do not retype it in another typeface. Inter is the companion typeface for surrounding text.

## Don'ts
- Do not stretch, squash or rotate the logo.
- Do not recolour outside the palette, or colour the frame with the teal.
- Do not move the sealed face to another side.
- Do not add shadows, outlines, gradients or effects.
- Do not change the size of the symbol relative to the wordmark.
- Do not use the full symbol below 32 px.
- Do not place it on a busy background without a colour block behind it.
- Do not use it in a way that suggests the project is made or endorsed by CapRover.
