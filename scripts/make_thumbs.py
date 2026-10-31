"""Small copies of photos that the site only ever shows small, saved next to each original:

  <name>-t192.webp  extra noodle photos (data/gallery.json), shown as 96 px gallery thumbnails
  <name>-t128.webp  pairing and side photos (data/toppings.json), shown as 64 px icons and 44 px search results
  <name>-t384.webp  the same photos for the Pairings and sides grid (about 177-230 px), offered in a srcset
  <name>-t480.webp  posters of the card-sized clips (src/assets/video/ig-*.webp and step-*.webp), 480 px wide, offered in
                    a srcset next to the original so 1-2x screens skip the 720 px poster

scripts/build.mjs uses a copy when it exists and falls back to the original, so a missing copy only costs bytes.
Run after adding or replacing those photos or clips:  uv run -q --with pillow python scripts/make_thumbs.py
"""
import json
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"


def small_copy(src: Path, px: int) -> None:
    dst = src.with_name(f"{src.stem}-t{px}.webp")
    if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
        return
    with Image.open(src) as im:
        if im.width <= px:  # never upscale: the build falls back to the original
            return
        im = ImageOps.exif_transpose(im).convert("RGB")
        if src.parent.name == "video":  # posters keep their shape, scaled to px wide
            out = im.resize((px, round(im.height * px / im.width)), Image.LANCZOS)
        else:  # photos: centre square, like object-fit: cover
            out = ImageOps.fit(im, (px, px), Image.LANCZOS)
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
