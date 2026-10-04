#!/usr/bin/env python3
"""Make the compact shelf-QR PNGs that live in Google Drive (one per noodle).

    pip install qrcode==8.2 pillow
    python3 scripts/make_qr_pngs.py [outDir]        # default: qr-png/

Each file is a 656x656 1-bit PNG (~1 KB) named "<nnn> <Brand> <Name> (<CC>).png",
encoding <siteUrl>/noodles/<slug>/?src=qr. The output is deterministic, so the
md5 of every file can be compared against Drive's md5Checksum after upload.
A manifest.csv (file, slug, url, md5) is written alongside.
"""
import csv
import hashlib
import io
import json
import os
import re
import sys

import qrcode

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "qr-png")
os.makedirs(out, exist_ok=True)

site = json.load(open(os.path.join(ROOT, "data", "site.json")))
noodles = json.load(open(os.path.join(ROOT, "data", "noodles.json")))
base = site["siteUrl"].rstrip("/")

rows = []
for i, n in enumerate(noodles, 1):
    url = f"{base}/noodles/{n['slug']}/?src=qr"
    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=16, border=2)
    q.add_data(url)
    q.make(fit=True)
    img = q.make_image().get_image().convert("1")
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    data = buf.getvalue()
    name = re.sub(r'[\\/:*?"<>|]', "", f"{n['brand']} {n['name']}".replace(" / ", "-"))
    name = re.sub(r"\s+", " ", name)
    fn = f"{i:03d} {name} ({n['countryCode'].upper()}).png"
    with open(os.path.join(out, fn), "wb") as fh:
        fh.write(data)
    rows.append([fn, n["slug"], url, hashlib.md5(data).hexdigest()])

with open(os.path.join(out, "manifest.csv"), "w", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(["file", "slug", "url", "md5"])
    w.writerows(rows)
print(f"Wrote {len(rows)} PNGs to {out}")
