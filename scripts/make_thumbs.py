"""Small copies of photos that the site only ever shows small, saved next to each original:

  <name>-t192.webp  extra noodle photos (data/gallery.json), shown as 96 px gallery thumbnails
  <name>-t128.webp  pairing and side photos (data/toppings.json), 64 px icons and 44 px search results
  <name>-t384.webp  the same photos for the Pairings and sides grid (about 177-230 px), offered in a srcset
  <name>-t480.webp  posters of the card-sized clips (src/assets/video/ig-*.webp and step-*.webp), 480 px wide, offered in
                    a srcset next to the original so 1-2x screens skip the 720 px poster
  <name>-t240.webp  the noodle photos in the home hero's strip (data/home-strip.json): 240 x 192 (5:4, a little below
                    centre, where the bowl sits) for the 120 x 96 desktop and 96 x 72 phone cards at 2x

scripts/build.mjs uses a copy when it exists and falls back to the original, so a missing copy only costs bytes.
Run after adding or replacing those photos or clips:  uv run -q --with pillow python scripts/make_thumbs.py
"""
import json
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"


def small_copy(src: Path, px: int, h: int | None = None, centre: tuple[float, float] = (0.5, 0.5)) -> None:
    """px wide; photos are cut to px x h (square when h is None) like object-fit: cover, around `centre`."""
    dst = src.with_name(f"{src.stem}-t{px}.webp")
    if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
        return
    with Image.open(src) as im:
        if im.width <= px:  # never upscale: the build falls back to the original
            return
        im = ImageOps.exif_transpose(im).convert("RGB")
        if src.parent.name == "video":  # posters keep their shape, scaled to px wide
            out = im.resize((px, round(im.height * px / im.width)), Image.LANCZOS)
        else:
            out = ImageOps.fit(im, (px, h or px), Image.LANCZOS, centering=centre)
    out.save(dst, "WEBP", quality=80, method=6)
    print(f"{dst.relative_to(ROOT)}  {dst.stat().st_size // 1024} KB (from {src.stat().st_size // 1024} KB)")


gallery = json.loads((ROOT / "data" / "gallery.json").read_text())
for files in gallery.values():
    for p in files:
        if (SRC / "assets" / p).exists():
            small_copy(SRC / "assets" / p, 192)
for t in json.loads((ROOT / "data" / "toppings.json").read_text()):
    if t.get("img") and (SRC / t["img"]).exists():
        small_copy(SRC / t["img"], 128)
        small_copy(SRC / t["img"], 384)
for poster in sorted((SRC / "assets" / "video").glob("*.webp")):
    if poster.stem.startswith(("ig-", "step-")) and not poster.stem.endswith("-t480"):
        small_copy(poster, 480)
images = json.loads((ROOT / "data" / "images.json").read_text())
for slug in json.loads((ROOT / "data" / "home-strip.json").read_text())["slugs"]:
    if slug in images and (SRC / "assets" / images[slug]).exists():
        small_copy(SRC / "assets" / images[slug], 240, 192, (0.5, 0.62))
