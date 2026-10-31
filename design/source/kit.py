import math
import os
import sys

import pathops
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

GEIST = os.environ.get("GEIST_WOFF")
GEIST_MONO = os.environ.get("GEIST_MONO_WOFF")
if not GEIST or not GEIST_MONO:
    sys.exit("Set GEIST_WOFF and GEIST_MONO_WOFF to the latin-500-normal.woff files (npm: @fontsource/geist and @fontsource/geist-mono)")

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
TITLE = "better-caprover-mcp"
TAGLINE = "UNOFFICIAL  \u00b7  MCP SERVER FOR CAPROVER"
# Why: the colours are the ones of the landing page: a near-black background, a lime accent and soft greys.
INK, TEXT, LIME, LIME_DEEP = "#0A0C10", "#F2F4F6", "#B6F259", "#4D7C0F"
GREY, GREY_DARK = "#5B6168", "#90969D"
THEMES = {
    "light": {"ink": INK, "accent": LIME_DEEP, "tagline": GREY},
    "dark": {"ink": TEXT, "accent": LIME, "tagline": GREY_DARK},
}
MONO = {"black": "#000000", "white": "#ffffff"}
FRAME, FRAME_SMALL = 18, 30
CORNER, HOLE_CORNER, HOLE_CORNER_SMALL = 12, 5, 4
HEX = {
    "T": (128, 32), "TR": (211.14, 80), "BR": (211.14, 176),
    "B": (128, 224), "BL": (44.86, 176), "TL": (44.86, 80), "C": (128, 128),
}

FONTS = {}
for key, path in (("sans", GEIST), ("mono", GEIST_MONO)):
    face = TTFont(path)
    FONTS[key] = (face.getGlyphSet(), face.getBestCmap(), face["head"].unitsPerEm)


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


def rounded_polygon(points, radii):
    # Why: each corner is cut at `radius` along both edges and joined with a curve, so every corner is soft.
    path = pathops.Path()
    pen = path.getPen()
    count = len(points)
    for index, (x, y) in enumerate(points):
        px, py = points[index - 1]
        nx, ny = points[(index + 1) % count]
        radius = radii[index]
        before = math.hypot(px - x, py - y)
        after = math.hypot(nx - x, ny - y)
        cut = min(radius, before / 2, after / 2)
        start = (x + (px - x) / before * cut, y + (py - y) / before * cut)
        end = (x + (nx - x) / after * cut, y + (ny - y) / after * cut)
        if index == 0:
            pen.moveTo(start)
        else:
            pen.lineTo(start)
        if cut > 0:
            pen.qCurveTo((x, y), end)
    pen.closePath()
    path.simplify(fix_winding=True)
    return path


def path_commands(path):
    pen = SVGPathPen(None, ntos=lambda value: f"{value:.2f}".rstrip("0").rstrip("."))
    path.draw(pen)
    return pen.getCommands()


def symbol_paths(frame):
    hole_corner = HOLE_CORNER_SMALL if frame == FRAME_SMALL else HOLE_CORNER
    outer = rounded_polygon([HEX[name] for name in ("T", "TR", "BR", "B", "BL", "TL")], [CORNER] * 6)
    top = rounded_polygon(
        offset_polygon([HEX["TL"], HEX["T"], HEX["TR"], HEX["C"]], [frame, frame, 0, frame / 2]), [hole_corner] * 4)
    left = rounded_polygon(
        offset_polygon([HEX["TL"], HEX["C"], HEX["B"], HEX["BL"]], [frame / 2, 0, frame, frame]), [hole_corner] * 4)
    body = pathops.op(pathops.op(outer, top, pathops.PathOp.DIFFERENCE), left, pathops.PathOp.DIFFERENCE)
    right = rounded_polygon([HEX["C"], HEX["TR"], HEX["BR"], HEX["B"]], [hole_corner, 0, 0, 0])
    sealed = pathops.op(right, outer, pathops.PathOp.INTERSECTION)
    return path_commands(body), path_commands(sealed)


def text_path(text, size, x, baseline, tracking=0, face="sans"):
    glyphs, cmap, upm = FONTS[face]
    scale = size / upm
    pen = SVGPathPen(glyphs)
    cursor = x
    for char in text:
        name = cmap[ord(char)]
        glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, cursor, baseline)))
        cursor += glyphs[name].width * scale + tracking
    return pen.getCommands(), cursor


def text_width(text, size, tracking=0, face="sans"):
    return text_path(text, size, 0, 0, tracking, face)[1]


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
    word, word_end = text_path(TITLE, 96, 300, 150, -1.6)
    tag, tag_end = text_path(TAGLINE, 28, 304, 206, 2.4, "mono")
    width = int(max(word_end, tag_end)) + 40
    body = (symbol_group(FRAME, ink, accent) + f'<g id="palavra"><path d="{word}" fill="{ink}"/></g>'
            f'<g id="slogan"><path d="{tag}" fill="{tagline_color}"/></g>')
    return wrap(f"0 0 {width} 256", body)


def stacked_svg(ink, accent, tagline_color):
    word_width = text_width(TITLE, 56, -0.9)
    tag_width = text_width(TAGLINE, 17, 1.6, "mono")
    width = int(max(word_width, 256)) + 80
    center = width / 2
    word, _ = text_path(TITLE, 56, center - word_width / 2, 330, -0.9)
    tag, _ = text_path(TAGLINE, 17, center - tag_width / 2, 372, 1.6, "mono")
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
    + symbol_group(FRAME_SMALL, TEXT, LIME) + "</g>"))
print("kit written")
