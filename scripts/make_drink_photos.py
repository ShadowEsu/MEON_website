"""Drink-type photos for the home gallery, from the public-domain / CC0 photos listed in docs/credits.md
("Drink photos from free libraries"). Each is cropped to 4:5 and saved as src/assets/img/drinks/<type>.webp (640 x 800)
plus <type>-t320.webp (320 x 400) for the srcset.

The sources aren't kept in the repo. To rebuild, save each photo's Commons rendering 1920 px wide (what the shipped files
were made from; smaller originals as they are) into a folder, named <type>.jpg as in CROPS below, then:
  uv run -q --with pillow python scripts/make_drink_photos.py <folder>
Crops are fractions of the photo (left, top, right, bottom), so they also fit the full-size original.
"""
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "assets" / "img" / "drinks"
CROPS = {
    "iced-matcha": (0.1333, 0.2639, 0.9667, 0.9583),
    "iced-coffee": (0.2135, 0.0, 0.7469, 1.0),
    "soft-drink": (0.1901, 0.0, 0.8099, 1.0),
    "iced-tea": (0.15, 0.1, 0.75, 0.6625),
    "chrysanthemum-tea": (0.3, 0.25, 0.7, 0.75),
    "water": (0.0, 0.1, 1.0, 0.954),
    "ice": (0.1146, 0.1563, 1.0, 0.8941),
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
            im = ImageOps.fit(im, (640, 800), Image.LANCZOS)  # trims the last few px to exactly 4:5
            q = QUALITY.get(name, 80)
            im.save(OUT / f"{name}.webp", "WEBP", quality=q, method=6)
            im.resize((320, 400), Image.LANCZOS).save(OUT / f"{name}-t320.webp", "WEBP", quality=q, method=6)
        print(f"{name}: {(OUT / f'{name}.webp').stat().st_size // 1024} KB + {(OUT / f'{name}-t320.webp').stat().st_size // 1024} KB")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
