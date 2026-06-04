from PIL import Image, ImageFilter

src = r"C:\Users\Administrator\Downloads\ChatGPT Image 2026年6月3日 00_13_24 (6).png"
dst = "assets/ui/month-compare-moonscape.png"

image = Image.open(src).convert("RGBA")
pixels = image.load()
width, height = image.size
out = Image.new("RGBA", (width, height))
out_pixels = out.load()
mask = Image.new("L", (width, height), 0)
mask_pixels = mask.load()

for y in range(height):
    for x in range(width):
        r, g, b, _ = pixels[x, y]
        brightness = (r + g + b) / 3
        yellow = r > b + 13 and g > b + 8 and r > 130 and g > 115
        purple = b > g + 8 and r > g + 4 and brightness < 235
        deep_purple = brightness < 170 and b > g + 3 and r > g - 6
        star = r > 210 and g > 155 and b < 170

        if yellow or purple or deep_purple or star:
            mask_pixels[x, y] = 255

mask = mask.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(3))
mask_pixels = mask.load()

for y in range(height):
    for x in range(width):
        r, g, b, _ = pixels[x, y]
        alpha = mask_pixels[x, y]
        out_pixels[x, y] = (r, g, b, alpha)

out.save(dst)
print("saved", dst, out.mode, out.size, out.getextrema()[-1])
