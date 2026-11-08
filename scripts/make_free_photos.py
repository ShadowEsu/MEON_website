"""Noodle and side photos from free libraries (data/free-photos.json, ledger 582; sources and licences in
agents/meon/free-images/SOURCES.md and docs/credits.md). Each is cropped square, centred on the bowl or plate, and saved
as its `file`. Noodle photos (img/noodles/free/) are 900 x 900 (the noodle page) plus sm/<id>.webp (400 x 400, the cards),
like the shoot photos in src/assets/img/noodles. Side photos (img/toppings/free/) are 480 x 480 plus <id>-t384.webp for
the Pairings and sides grid's srcset, like the owner's photos in src/assets/img/toppings, or the photo's own size when it's
smaller than 480: nothing is upscaled for a side. Pillow writes no EXIF, XMP or GPS into the WebP files (Security F5).

The originals aren't kept in the repo. To rebuild, save each photo's original (the full-size file its source page links,
whose sha256 is source.sha256) into a folder as <id>.<ext>, then:
  uv run -q --with pillow python scripts/make_free_photos.py <folder>
`crop` is a fraction of the photo (left, top, right, bottom); without one the photo is cut to its centred square.
"""
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "src" / "assets"


def main(src_dir: Path) -> None:
    photos = json.loads((ROOT / "data" / "free-photos.json").read_text())["photos"]
    for pid, p in photos.items():
        src = next(src_dir.glob(f"{pid}.*"))
        if hashlib.sha256(src.read_bytes()).hexdigest() != p["source"]["sha256"]:
            raise SystemExit(f"{src}: not the file source.sha256 names")
        out = ASSETS / p["file"]
        side = p["file"].startswith("img/toppings/")
        with Image.open(src) as im:
            im = ImageOps.exif_transpose(im).convert("RGB")
            if p.get("crop"):
                l, t, r, b = p["crop"]
                im = im.crop((round(l * im.width), round(t * im.height), round(r * im.width), round(b * im.height)))
            px = min(480, im.width, im.height) if side else 900
            im = ImageOps.fit(im, (px, px), Image.LANCZOS)  # the centred square, or trims a crop's last few px to 1:1
            out.parent.mkdir(parents=True, exist_ok=True)
            im.save(out, "WEBP", quality=80, method=6)
            # a side's photo shows only in the Pairings and sides grid (with its caption and credit), so no 128 px icon copy
            copies = [(out.with_name(f"{out.stem}-t384.webp"), 384)] if side else [(out.parent / "sm" / out.name, 400)]
            for dst, s in copies:
                dst.parent.mkdir(parents=True, exist_ok=True)
                im.resize((s, s), Image.LANCZOS).save(dst, "WEBP", quality=80, method=6)
        sha = hashlib.sha256(out.read_bytes()).hexdigest()
        print(f"{pid}: {px} px, {out.stat().st_size // 1024} KB + {' + '.join(f'{d.stat().st_size // 1024} KB' for d, _ in copies)}  sha256 {sha}")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
