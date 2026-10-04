# Running MEON's website: QR codes, Google Drive and updates

A how-to for the owners and staff. No coding is needed for most tasks.

## Google Drive (folder "MEON Website Hub")

Folder: https://drive.google.com/drive/folders/1B13fCWhjdPt7kiS31U0OfAv0-pZjTImV

| File | What it's for |
| --- | --- |
| **MEON — Website Guide & Important Info** | The guide (this page, in short), site map, things to confirm |
| **MEON — Shelf QR Codes (print me)** | All 172 QR codes on one printable doc, with names and machine settings |
| **MEON — QR Codes (one per noodle, PNG)** (folder) | 172 separate QR images, e.g. `045 Nissin Demae Ramen Sesame Oil (JP).png`. Use them for single labels, menus and social posts |
| **MEON — Noodle Database** | Every noodle: brand, country, spice, diet, soup/dry, weight, machine setting, page URL |
| **MEON — Deals & Promotions** | Current deals and member-card perks |
| **MEON — Website Views Log** | Page-view snapshots. It is updated **only when you ask** (see below) |

The QR PNGs come from `scripts/make_qr_pngs.py`. Each file was checked: it decodes to the right page, and its Drive MD5 matches the generated file.

## QR codes

- Every noodle has a code that opens `https://meon-noodles.vercel.app/noodles/<noodle>/?src=qr`.
- `?src=qr` shows a "You scanned the shelf!" welcome and lets analytics count shelf scans separately.
- **Before printing**, confirm the final web address. If you buy a domain (e.g. `meon.au`), change `siteUrl` in `data/site.json`, rebuild, then regenerate the codes:
  - website pages: `npm run build`, then the codes are at `/qr/`
  - Drive PNGs: `python3 scripts/make_qr_pngs.py`, then re-upload
- Make your own codes for posters, Wi-Fi or Instagram at `/qr-generator/` (logo, colours, PNG/SVG download).
- Print tips: at least 2.5 cm wide, black on white, and leave the white border.

## Guest reviews

Guests can leave a 1–5 star rating, their first name and a comment at the bottom of the home page (general reviews) and of every noodle page (reviews for that noodle). Reviews appear on the site straight away.

**Where they are stored:** Supabase, table `meon_reviews` in the project **jaymini-prod** (`wzgfjuxcprignwdlopvl`). The free Supabase plan allows only two projects, and both were already in use, so MEON shares that project. The table is kept separate and locked down, so it cannot read or change anything else in the project. Settings live in `data/site.json` under `reviews`.

| Column | Meaning |
| --- | --- |
| `name`, `rating`, `comment` | What the guest typed (name up to 40 characters, comment up to 600) |
| `noodle_slug` | Which noodle page it came from; empty means a general review from the home page |
| `source` | `qr` if they arrived by scanning a shelf code, otherwise `web` |
| `approved` | `true` shows it on the site; set it to `false` to hide it |
| `created_at` | When it was posted |

**To read or hide reviews:**
1. Open <https://supabase.com/dashboard>, choose **jaymini-prod**, then **Table Editor**, then `meon_reviews`.
2. To hide a review, untick `approved` on its row. It disappears from the site on the next page load.
3. To export them, click **Export**, then **CSV**.

Or ask Claude: "show me this week's MEON reviews" or "hide the review from <name>".

**Spam protection:**
- The public key can only add reviews and read approved ones. It cannot edit or delete them.
- A database rule allows at most 20 new reviews a minute across the whole site.
- The form has a hidden trap field for bots, rejects posts made within 2.5 seconds of the page loading, and remembers on each phone which pages it has already reviewed.

**Moving to MEON's own project later:** create a new Supabase project, apply the same table, then update `supabaseUrl` and `publishableKey` in `data/site.json` and rebuild.

Reviews on the website do not count towards Google rankings. For that, use the Google review QR code in `docs/seo.md`.

## Updating the Views Log (only when asked)

1. Open Vercel → the project → **Analytics** and choose the date range.
2. Copy the totals and the top pages (QR scans show as URLs ending `?src=qr`).
3. Add a row to *MEON — Website Views Log*: date range, visitors, page views, QR scans, top 5 noodles, notes.

Or just ask Claude: "update the MEON views log for last week".

## Common edits

| I want to… | Do this |
| --- | --- |
| Add the address, phone, email or hours | Fill in `data/site.json` (empty fields stay hidden) |
| Add or change a noodle | Edit the Drive doc *Meon_Website_format2*, export it to `data/source/Meon_Website_format2.md`, run `python3 scripts/parse_library.py`, then `npm run build` |
| Add a photo | Save an 800×800 `.webp` to `src/assets/img/noodles/<slug>.webp` and a 400×400 copy to `…/noodles/sm/`, then add the slug to `data/images.json` |
| Set a real spice rating for a noodle marked "coming soon" | Fix the rating in the source doc and remove the slug from `data/spice_review.json` |
| Run a deal | Edit `data/deals.json` (`"active": false` hides it) |

After any change: `npm run build && npm run check`. Pushing to GitHub redeploys on Vercel once it's connected.

## Still to confirm

- Street address, phone, email and opening hours
- The final domain (do this before printing QR codes)
- 20 noodles have "spice rating coming soon" (listed in `data/spice_review.json`)
- 62 noodles still need a photo (they show a mascot placeholder)
