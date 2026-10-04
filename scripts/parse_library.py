"""Parse the 'Meon Global Instant Noodle Library' doc export (markdown text) into data/noodles.json.

Usage: python3 scripts/parse_library.py [library.md] [cms.csv]
Defaults: data/source/Meon_Website_format2.md (export of Drive doc Meon_Website_format2.docx)
          data/source/meon_wix_cms_fixed_final.csv (Wix CMS export: adds machine settings + fills missing soup/dry/weight)
The doc is the source of truth for names, countries, spice and diet.
"""
import csv, json, re, sys, unicodedata
from pathlib import Path

COUNTRY_CODES = {
    "South Korea": "kr", "Australia": "au", "Japan": "jp", "Malaysia": "my", "Indonesia": "id",
    "Thailand": "th", "India": "in", "China": "cn", "Taiwan": "tw", "Singapore": "sg",
    "Philippines": "ph", "Vietnam": "vn",
}

# Spelling fixes applied to names/brands/flavours from the doc.
FIXES = {"Cabonara": "Carbonara", "cabonara": "carbonara", "Habenaro": "Habanero",
         "Siracha": "Sriracha", "siracha": "sriracha", "WaiWai": "Wai Wai", "Bonara": "Bonara"}

def fix(s):
    for a, b in FIXES.items():
        s = s.replace(a, b)
    return s

def slugify(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = s.lower().replace("&", " and ").replace("!", "")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")

def main(src):
    text = Path(src).read_text(encoding="utf-8").replace("\\*", "*").replace("\\!", "!")
    out, seen, country = [], set(), None
    for b in re.split(r"^(?=#{1,2} )", text, flags=re.M):
        if b.startswith("# "):
            section = b[2:].splitlines()[0].strip()
            country = section if section in COUNTRY_CODES else country
            continue
        if not b.startswith("## "):
            continue
        lines = [l.strip() for l in b[3:].strip().splitlines() if l.strip()]
        head, body, spec = lines[0], lines[1:-1], lines[-1]
        m = re.match(r"(.+?) – (.+?)(?: \((.+?)\))?$", head)
        name, brand = fix(m.group(1).strip()), fix(m.group(2).strip())
        desc = " ".join(body)
        flav = re.search(r"built around (?:a )?(.+?)(?:-style)? flavour", desc)
        flavour = fix(flav.group(1).strip()) if flav else "signature"
        fun = re.search(r"Fun note: (.+?)\.(?: |$)", desc)
        fun_note = fun.group(1).strip() if fun else None
        if fun_note in ("No",):
            fun_note = "No.1 Ramen in the World"
        parts = [p.strip() for p in spec.split(",")]
        weight = int(parts[0][:-1]) if parts[0].endswith("g") else None
        spice = int(re.search(r"\d+", parts[1]).group())
        diet = ", ".join(parts[2:-1]).strip()
        ntype = parts[-1] if parts[-1] != "—" else None
        slug = slugify(f"{brand.split('/')[0]} {name}")
        if slug in seen:  # duplicate heading in the doc: keep the first (more complete) entry
            print(f"skipping duplicate entry: {head}", file=sys.stderr)
            continue
        seen.add(slug)
        out.append({
            "slug": slug, "name": name, "brand": brand, "country": country,
            "countryCode": COUNTRY_CODES[country], "flavour": flavour, "funNote": fun_note,
            "weightG": weight, "spice": spice,
            "diet": diet.rstrip("*").strip(), "dietNote": diet.endswith("*"),
            "type": ntype, "machine": None,
        })
    return out

def merge_cms(data, csv_path):
    rows = list(csv.DictReader(open(csv_path, encoding="utf-8-sig")))
    idx = {}
    for x in rows:
        m = re.match(r"(.+?) – (.+)$", x["Title"].strip())
        name, brand = (m.group(1), m.group(2)) if m else (x["Title"], "")
        idx.setdefault(slugify(f"{fix(brand).split('/')[0]} {fix(name)}"), x)
    for n in data:
        x = idx.get(n["slug"])
        if not x:
            print(f"no CMS row for {n['slug']}", file=sys.stderr)
            continue
        n["machine"] = x["Machine Setting"].strip() or None
        if not n["type"] and x["Dry or Soup"].strip() not in ("", "—"):
            n["type"] = x["Dry or Soup"].strip()
        w = x["Weight"].strip()
        if not n["weightG"] and w.endswith("g") and w[:-1].isdigit():
            n["weightG"] = int(w[:-1])
    return data

if __name__ == "__main__":
    base = Path(__file__).resolve().parent.parent
    src = sys.argv[1] if len(sys.argv) > 1 else base / "data" / "source" / "Meon_Website_format2.md"
    cms = sys.argv[2] if len(sys.argv) > 2 else base / "data" / "source" / "meon_wix_cms_fixed_final.csv"
    data = main(src)
    if Path(cms).exists():
        data = merge_cms(data, cms)
    dest = base / "data" / "noodles.json"
    dest.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {len(data)} noodles -> {dest}")
