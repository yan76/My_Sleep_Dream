from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "ui"
SCALE = 4


def rgba(hex_color: str, alpha: int) -> tuple[int, int, int, int]:
    hex_color = hex_color.lstrip("#")
    return (
        int(hex_color[0:2], 16),
        int(hex_color[2:4], 16),
        int(hex_color[4:6], 16),
        alpha,
    )


def layer(size: tuple[int, int]) -> Image.Image:
    return Image.new("RGBA", size, (0, 0, 0, 0))


def downsample(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    return img.resize(size, Image.Resampling.LANCZOS)


def ellipse(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill: tuple[int, int, int, int]) -> None:
    scaled = tuple(v * SCALE for v in box)
    draw.ellipse(scaled, fill=fill)


def rounded(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], radius: int, fill: tuple[int, int, int, int]) -> None:
    scaled = tuple(v * SCALE for v in box)
    draw.rounded_rectangle(scaled, radius=radius * SCALE, fill=fill)


def add_blurred_ellipse(
    base: Image.Image,
    box: tuple[int, int, int, int],
    color: tuple[int, int, int, int],
    blur: int,
) -> None:
    glow = layer(base.size)
    draw = ImageDraw.Draw(glow)
    ellipse(draw, box, color)
    glow = glow.filter(ImageFilter.GaussianBlur(blur * SCALE))
    base.alpha_composite(glow)


def draw_ring(
    base: Image.Image,
    box: tuple[int, int, int, int],
    width: int,
    color: tuple[int, int, int, int],
) -> None:
    draw = ImageDraw.Draw(base)
    scaled = tuple(v * SCALE for v in box)
    draw.ellipse(scaled, outline=color, width=width * SCALE)


def radial_soft_circle(size: int, inner: str, outer: str, alpha: int) -> Image.Image:
    img = layer((size * SCALE, size * SCALE))
    px = img.load()
    center = (size * SCALE - 1) / 2
    inner_rgb = rgba(inner, alpha)[:3]
    outer_rgb = rgba(outer, 0)[:3]
    max_dist = center

    for y in range(size * SCALE):
        for x in range(size * SCALE):
            dx = x - center
            dy = y - center
            t = min((dx * dx + dy * dy) ** 0.5 / max_dist, 1)
            eased = t * t * (3 - 2 * t)
            r = round(inner_rgb[0] * (1 - eased) + outer_rgb[0] * eased)
            g = round(inner_rgb[1] * (1 - eased) + outer_rgb[1] * eased)
            b = round(inner_rgb[2] * (1 - eased) + outer_rgb[2] * eased)
            a = round(alpha * (1 - eased) ** 1.8)
            px[x, y] = (r, g, b, a)

    return img


def export_background() -> None:
    size = (2048, 2048)
    canvas = layer((size[0] * SCALE, size[1] * SCALE))

    add_blurred_ellipse(canvas, (-320, 1380, 780, 2480), rgba("#332C37", 118), 70)
    add_blurred_ellipse(canvas, (960, -460, 2380, 960), rgba("#20213C", 145), 84)
    add_blurred_ellipse(canvas, (1260, 520, 2080, 1320), rgba("#242235", 152), 34)
    add_blurred_ellipse(canvas, (900, 1180, 1900, 2100), rgba("#1D2631", 104), 90)
    add_blurred_ellipse(canvas, (80, -180, 780, 560), rgba("#2B2838", 78), 72)

    draw_ring(canvas, (1170, -420, 2420, 830), 180, rgba("#252645", 132))
    draw_ring(canvas, (1350, -160, 2180, 670), 132, rgba("#1B1D34", 148))
    draw_ring(canvas, (1120, 540, 1970, 1390), 4, rgba("#62647D", 72))

    dust = layer(canvas.size)
    dust_draw = ImageDraw.Draw(dust)
    for x, y, r, a in [
        (360, 250, 9, 80),
        (520, 430, 5, 66),
        (1510, 350, 7, 70),
        (1690, 1480, 6, 58),
        (370, 1550, 5, 58),
        (1820, 1030, 4, 54),
    ]:
        ellipse(dust_draw, (x - r, y - r, x + r, y + r), rgba("#E6D5B8", a))
    canvas.alpha_composite(dust.filter(ImageFilter.GaussianBlur(1 * SCALE)))

    downsample(canvas, size).save(OUT / "sleep-generator-background-alpha.png")


def export_icon() -> None:
    size = (1024, 1024)
    canvas = layer((size[0] * SCALE, size[1] * SCALE))

    soft_back = radial_soft_circle(860, "#252742", "#252742", 130)
    canvas.alpha_composite(soft_back, (74 * SCALE, 58 * SCALE))

    add_blurred_ellipse(canvas, (130, 520, 560, 960), rgba("#E9D8B8", 86), 26)
    add_blurred_ellipse(canvas, (400, 360, 920, 690), rgba("#C9DDC6", 78), 30)

    draw = ImageDraw.Draw(canvas)

    ellipse(draw, (150, 512, 542, 904), rgba("#E9D8B8", 255))
    add_blurred_ellipse(canvas, (100, 462, 592, 954), rgba("#F2DFC1", 34), 24)

    rounded(draw, (410, 394, 900, 662), 134, rgba("#B7CAB1", 230))
    rounded(draw, (315, 372, 755, 642), 135, rgba("#C9DDC6", 230))
    rounded(draw, (298, 390, 768, 654), 128, rgba("#9EBDB0", 130))
    rounded(draw, (720, 432, 936, 642), 105, rgba("#A9BCA8", 202))

    cloud_highlight = layer(canvas.size)
    cloud_draw = ImageDraw.Draw(cloud_highlight)
    rounded(cloud_draw, (333, 380, 742, 444), 32, rgba("#F2F4DA", 68))
    rounded(cloud_draw, (435, 408, 858, 470), 31, rgba("#EFF3D5", 50))
    canvas.alpha_composite(cloud_highlight.filter(ImageFilter.GaussianBlur(13 * SCALE)))

    text_layer = layer(canvas.size)
    text_draw = ImageDraw.Draw(text_layer)
    try:
        font = ImageFont.truetype("arialbd.ttf", 118 * SCALE)
    except Exception:
        from PIL import ImageFont

        font = ImageFont.load_default(size=118 * SCALE)
    text_draw.text((608 * SCALE, 292 * SCALE), "Zz", font=font, fill=rgba("#E6D5B8", 236))
    canvas.alpha_composite(text_layer)

    downsample(canvas, size).save(OUT / "sleep-generator-icon-alpha.png")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    export_background()
    export_icon()


if __name__ == "__main__":
    from PIL import ImageFont

    main()
