"""Drink photos for the home gallery, from the free-library photos listed in docs/credits.md ("Drink photos from free
libraries"). Each is cropped square (1:1, centred on the glass or can) and saved as src/assets/img/drinks/<name>.webp
(640 x 640) plus <name>-t320.webp (320 x 320) for the srcset. Pillow writes no EXIF or GPS into the WebP files.

The sources aren't kept in the repo. To rebuild, save each photo's Commons rendering 1920 px wide (what the shipped files
were made from; smaller originals as they are, and `coke-zero-sugar` from its full 4080 x 3060 original) into a folder,
named <name>.jpg as in CROPS below, then:
  uv run -q --with pillow python scripts/make_drink_photos.py <folder>
Crops are fractions of the photo (left, top, right, bottom), so they also fit the full-size original.
"""
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "assets" / "img" / "drinks"
CROPS = {
    "iced-matcha": (0.0, 0.2778, 1.0, 0.9444),
    "iced-coffee": (0.1469, 0.0, 0.8135, 1.0),
    "soft-drink": (0.1128, 0.0, 0.8872, 1.0),
    "iced-tea": (0.075, 0.1, 0.825, 0.6625),
    "chrysanthemum-tea": (0.25, 0.25, 0.75, 0.75),
    "water": (0.0, 0.1853, 1.0, 0.8687),
    "ice": (0.0, 0.1919, 1.0, 0.8585),
    # The can only (x 60-1660, y 600-2200 of 4080 x 3060): leaves out the food box and its handwritten price note.
    "coke-zero-sugar": (0.0147, 0.1961, 0.4069, 0.719),
}
QUALITY = {"chrysanthemum-tea": 60}  # a frame full of tiny dried flowers: 134 KB at quality 80, 96 KB at 60


def main(src_dir: Path) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, crop in CROPS.items():
        src = next(src_dir.glob(f"{name}.*"))
        with Image.open(src) as im:
            im = ImageOps.exif_transpose(im).convert("RGB")
            l, t, r, b = crop
            im = im.crop((round(l * im.width), round(t * im.height), round(r * im.width), round(b * im.height)))
            im = ImageOps.fit(im, (640, 640), Image.LANCZOS)  # trims the last few px to exactly 1:1
            q = QUALITY.get(name, 80)
            im.save(OUT / f"{name}.webp", "WEBP", quality=q, method=6)
            im.resize((320, 320), Image.LANCZOS).save(OUT / f"{name}-t320.webp", "WEBP", quality=q, method=6)
        print(f"{name}: {(OUT / f'{name}.webp').stat().st_size // 1024} KB + {(OUT / f'{name}-t320.webp').stat().st_size // 1024} KB")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
