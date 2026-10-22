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

## Noodle photos

The main noodle photos come from the MEON photo shoot. The photographer's shared Drive folder has one folder per noodle, each with a "Web - Sized" copy. For every noodle the site uses:
- the **bowl-with-packet** shot as the main photo
- the top-down and close-up shots as extra photos (`data/gallery.json`)

Only Steven's MEON shoot photos are used (42 noodles so far). The old stock photos from the Wix site were removed: many had harsh black backgrounds or showed cup noodles, which MEON doesn't sell. Noodles without a shoot photo show an illustrated packet in a flavour colour. When more noodles are photographed, ask Claude to "add the new noodle photos from the shoot folder".

Some shoot folders are named differently from the packet in the photo. The site follows the packet:
- "Samyang Ramen Original Mild" is Samyang Bulgogi
- "Buldak Hot Chicken" is the Buldak Stew Type
- "Mama Shrimp Tomyum" is Wai Wai Tom Yum Shrimp
- "Kang Shi Fu Vegetables & Beef" is the Pickled Mustard Beef

"Neoguri Stir Fry" is not on the noodle list yet, so it isn't used.

## Wording that changes often

The site says **"100+ noodles"** and **"from across Asia"** rather than exact counts. Both are set once at the top of `scripts/build.mjs` (`COUNT` and `REGION`). Exact counts still appear where they're useful, like the library's filter results.

## Updating the noodle list

When there's a new list of the packets on the wall, send it to Claude ("here's the new noodle list, update the site"). Noodles that are gone are removed, new ones get a page and a shelf QR code, and the QR PNGs in Drive are regenerated. Existing noodle page addresses stay the same, so printed QR codes keep working.

## Prices, sides and drinks (from the till)

Prices come from the Square catalogue export (`MLKQPB3Z0PNN4_catalogue-2026-10-16-1334.xlsx`, 16 October 2026) and live in `data/catalogue.json`. The site shows them in Australian dollars, exactly as in the till:
- **Noodle pages**: the packet price sits under the packet weight. 54 noodles on the wall matched a till item; the till's packet weight replaced the old one where they differed.
- **New noodles**: 27 noodles were in the till but not on the site. They now have their own page and shelf QR code (on `/qr/`), with an illustrated packet. Their spice rating, diet and machine setting say "rating soon" / "Ask the crew" until the crew confirms them.
- **Toppings page**: a "Sides" and a "Drinks" list with prices.

Never copied from the till: SKUs, stock counts, barcodes (GTINs), Square tokens, the $0 "Yr12 Drink Promo" and the "Pairings 4.20 Per 100g" line.

When prices change, send Claude the new catalogue export ("here's the new Square catalogue, update the prices"). Noodles that are on the site but not in the till keep their page and simply show no price.

## MEON Card (not launched)

The card is hidden from the website: it's not in the menus, footer, search or sitemap, and Google is told not to index it. The page still exists at `/meon-card/` as a "coming soon" page with the planned offer: top up $20, get a $5 voucher to use on the spot, every time.

To launch it, ask Claude to "launch the MEON Card". That adds it back to the menu, footer and home page and updates the wording.

## Videos

The "Watch" section on the home page (below "How MEON works") plays the videos and offers them as downloads. The files are in `src/assets/video/`:

| File | What it is |
| --- | --- |
| `meon-promo.mp4` | 47-second promo, 16:9 (100+ noodles, across Asia, spice levels; no card) |
| `meon-promo-vertical.mp4` | The same promo in 9:16, for Reels, TikTok and Stories |
| `meon-website-tour.mp4` | 4:04 tour of the website, including the new interactive sections and the phone QR-scan experience |
| `poster-*.jpg` | The still image shown before a video plays |

All the music is original and generated for MEON, so there are no licensing issues on Instagram, TikTok or YouTube.

To swap a video, replace the file but keep its name, then run `npm run build` and redeploy. The sizes shown on the download buttons update automatically. To make new versions, for example after adding new noodles or photos, ask Claude to "re-make the MEON promo" or "re-record the website tour".

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

Vercel Web Analytics is off for now: it isn't enabled on the Vercel project, so the site no longer loads its script. To use the Views Log, first enable Web Analytics in Vercel, then set `analytics.vercel` to `true` in `data/site.json` and redeploy.

1. Open Vercel → the project → **Analytics** and choose the date range.
2. Copy the totals and the top pages (QR scans show as URLs ending `?src=qr`).
3. Add a row to *MEON — Website Views Log*: date range, visitors, page views, QR scans, top 5 noodles, notes.

Or just ask Claude: "update the MEON views log for last week".

## Common edits

| I want to… | Do this |
| --- | --- |
| Add the address, phone, email or hours | Fill in `data/site.json` (empty fields stay hidden) |
| Add or change a noodle | Edit the Drive doc *Meon_Website_format2*, export it to `data/source/Meon_Website_format2.md`, run `python3 scripts/parse_library.py`, then `npm run build` |
| Add a photo | Save a 900×900 `.webp` to `src/assets/img/noodles/<slug>.webp` and a 400×400 copy to `…/noodles/sm/`, then add the slug to `data/images.json`. Use the bowl-and-packet shot, so guests can match it to the shelf |
| Add extra photos to a noodle page | Save 900×900 `.webp` files to `src/assets/img/noodles/more/<slug>-1.webp`, `-2.webp` and so on, and list them under the slug in `data/gallery.json`. They appear as tappable thumbnails under the main photo |
| Set a real spice rating for a noodle marked "coming soon" | Fix the rating in the source doc and remove the slug from `data/spice_review.json` |

After any change: `npm run build && npm run check`. Pushing to GitHub redeploys on Vercel once it's connected.

## Still to confirm

- Street address, postcode, phone, email and opening hours, copied exactly from the Google Business Profile into `data/site.json` (Google treats the address as required for a local business)
- The official suburb: "Canning Bridge" is a precinct, not a postal suburb (it spans Applecross/Mount Pleasant 6153 and Como 6152). Put the suburb from the Business Profile into `suburb` in `data/site.json`
- Whether MEON already has a Google Maps place (an online directory copy of a Facebook page lists "Meon Noodles Perth Australia" at Shop 7/8, 45 Francis St, Northbridge). If there is one, claim it rather than making a second listing
- The final domain (do this before printing QR codes). `meon.au` is registered to Seven Ninety Seven Pty Ltd and parked at GoDaddy. If that's MEON's company, point it at the Vercel project rather than buying a new domain
- Nongshim Shin Noodle Soup Original is marked vegetarian-friendly in the Drive doc; check the packet on the wall (many Shin Ramyun versions list beef)
- 20 noodles have "spice rating coming soon" (listed in `data/spice_review.json`)
- 130 noodles still need a shoot photo (they show an illustrated packet)
- The updated noodle list of what is actually on the wall
- The Google Business Profile review link (paste it into `googleBusinessUrl` in `data/site.json`; until then the review buttons open MEON on Google Maps)
- Spice rating, diet and machine setting for the 27 noodles added from the till (in `data/catalogue.json`)
- Shelf QR PNGs in Drive: the 27 new noodles' codes are on `/qr/` but not yet in the Drive folder (run `python3 scripts/make_qr_pngs.py` and upload)
- Till items not added yet: "Kang Shi Fu Hot & Spicy Beef" (may be the Braised Beef Spicy Red already on the site) and "Nissin Black Garlic Demae Ramen" (may be the same packet as the Black Garlic Oil Tonkotsu)
- Myojo's country: the new Myojo Mee Goreng says Singapore (Myojo is Nissin Foods Singapore's brand), while the Drive doc lists Myojo Mee Poh Dry as Malaysia
- Whether the toppings bar is priced by weight (the till has "Pairings 4.20 Per 100g"); the site doesn't show it
