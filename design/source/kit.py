import math
import os
import sys

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

FONT = os.environ.get("INTER_WOFF")
if not FONT:
    sys.exit("Set INTER_WOFF to inter-latin-600-normal.woff (npm: @fontsource/inter)")

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
TITLE = "better-caprover-mcp"
TAGLINE = "UNOFFICIAL  ·  MCP SERVER FOR CAPROVER"
INK, BONE = "#0F172A", "#F8FAFC"
TEAL, TEAL_LIGHT = "#0D9488", "#2DD4BF"
SLATE, SLATE_LIGHT = "#475569", "#94A3B8"
THEMES = {
    "light": {"ink": INK, "accent": TEAL, "tagline": SLATE},
    "dark": {"ink": BONE, "accent": TEAL_LIGHT, "tagline": SLATE_LIGHT},
}
MONO = {"black": "#000000", "white": "#ffffff"}
FRAME, FRAME_SMALL = 18, 30
HEX = {
    "T": (128, 32), "TR": (211.14, 80), "BR": (211.14, 176),
    "B": (128, 224), "BL": (44.86, 176), "TL": (44.86, 80), "C": (128, 128),
}

font = TTFont(FONT)
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
upm = font["head"].unitsPerEm


def offset_polygon(points, distances):
    # Why: each edge moves inward by its own distance; the corners are where the moved edges meet.
    count = len(points)
    lines = []
    for index in range(count):
        (x1, y1), (x2, y2) = points[index], points[(index + 1) % count]
        dx, dy = x2 - x1, y2 - y1
        length = math.hypot(dx, dy)
        nx, ny = -dy / length, dx / length
        lines.append(((x1 + nx * distances[index], y1 + ny * distances[index]), (dx, dy)))
    corners = []
    for index in range(count):
        (px, py), (dx, dy) = lines[index - 1]
        (qx, qy), (ex, ey) = lines[index]
        t = ((qx - px) * ey - (qy - py) * ex) / (dx * ey - dy * ex)
        corners.append((px + dx * t, py + dy * t))
    return corners


def polygon_path(points):
    return "M" + "L".join(f"{x:.2f} {y:.2f}" for x, y in points) + "Z"


def symbol_paths(frame):
    outer = [HEX[name] for name in ("T", "TR", "BR", "B", "BL", "TL")]
    top = offset_polygon([HEX["TL"], HEX["T"], HEX["TR"], HEX["C"]], [frame, frame, 0, frame / 2])
    left = offset_polygon([HEX["TL"], HEX["C"], HEX["B"], HEX["BL"]], [frame / 2, 0, frame, frame])
    sealed = [HEX["C"], HEX["TR"], HEX["BR"], HEX["B"]]
    return polygon_path(outer) + polygon_path(top) + polygon_path(left), polygon_path(sealed)


def text_path(text, size, x, baseline, tracking=0):
    scale = size / upm
    pen = SVGPathPen(glyphs)
    cursor = x
    for char in text:
        name = cmap[ord(char)]
        glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, cursor, baseline)))
        cursor += glyphs[name].width * scale + tracking
    return pen.getCommands(), cursor


def text_width(text, size, tracking=0):
    return text_path(text, size, 0, 0, tracking)[1]


def symbol_group(frame, ink, accent, offset_x=0):
    body, sealed = symbol_paths(frame)
    move = f' transform="translate({offset_x:.1f} 0)"' if offset_x else ""
    return (f'<g id="icone"{move}><path d="{body}" fill="{ink}" fill-rule="evenodd"/>'
            f'<path d="{sealed}" fill="{accent}"/></g>')


def wrap(view_box, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}" role="img" aria-label="{TITLE}">'
            f"<title>{TITLE}</title>{body}</svg>\n")


def symbol_svg(frame, ink, accent):
    return wrap("0 0 256 256", symbol_group(frame, ink, accent))


def horizontal_svg(ink, accent, tagline_color):
    word, word_end = text_path(TITLE, 96, 300, 150, -1.2)
    tag, tag_end = text_path(TAGLINE, 30, 304, 206, 3.2)
    width = int(max(word_end, tag_end)) + 40
    body = (symbol_group(FRAME, ink, accent) + f'<g id="palavra"><path d="{word}" fill="{ink}"/></g>'
            f'<g id="slogan"><path d="{tag}" fill="{tagline_color}"/></g>')
    return wrap(f"0 0 {width} 256", body)


def stacked_svg(ink, accent, tagline_color):
    word_width = text_width(TITLE, 56, -0.7)
    tag_width = text_width(TAGLINE, 19, 2.2)
    width = int(max(word_width, 256)) + 80
    center = width / 2
    word, _ = text_path(TITLE, 56, center - word_width / 2, 330, -0.7)
    tag, _ = text_path(TAGLINE, 19, center - tag_width / 2, 372, 2.2)
    body = (symbol_group(FRAME, ink, accent, center - 128) + f'<g id="palavra"><path d="{word}" fill="{ink}"/></g>'
            f'<g id="slogan"><path d="{tag}" fill="{tagline_color}"/></g>')
    return wrap(f"0 0 {width} 400", body)


def write(folder, name, content):
    with open(os.path.join(ROOT, folder, name), "w", encoding="utf-8") as handle:
        handle.write(content)


for theme, colors in THEMES.items():
    ink, accent, tagline = colors["ink"], colors["accent"], colors["tagline"]
    write("svg", f"symbol-{theme}.svg", symbol_svg(FRAME, ink, accent))
    write("svg", f"symbol-small-{theme}.svg", symbol_svg(FRAME_SMALL, ink, accent))
    write("svg", f"horizontal-{theme}.svg", horizontal_svg(ink, accent, tagline))
    write("svg", f"stacked-{theme}.svg", stacked_svg(ink, accent, tagline))

for name, color in MONO.items():
    write("mono", f"symbol-{name}.svg", symbol_svg(FRAME, color, color))
    write("mono", f"horizontal-{name}.svg", horizontal_svg(color, color, color))
    write("mono", f"stacked-{name}.svg", stacked_svg(color, color, color))

write("web", "better-caprover-mcp-app-icon.svg", wrap(
    "0 0 256 256",
    f'<rect width="256" height="256" rx="56" fill="{INK}"/><g transform="translate(32 32) scale(0.75)">'
    + symbol_group(FRAME_SMALL, BONE, TEAL_LIGHT) + "</g>"))
print("kit written")
