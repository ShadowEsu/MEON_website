# Running MEON's website: QR codes, Google Drive and updates

A how-to for the owners and staff. No coding is needed for most tasks.

## Google Drive (folder "MEON Website Hub")

Folder: https://drive.google.com/drive/folders/1B13fCWhjdPt7kiS31U0OfAv0-pZjTImV

| File | What it's for |
| --- | --- |
| **MEON — Website Guide & Important Info** | The guide (this page, in short), site map, things to confirm |
| **MEON — Shelf QR Codes (print me)** | All 172 QR codes on one printable doc, with names |
| **MEON — QR Codes (one per noodle, PNG)** (folder) | 172 separate QR images, e.g. `045 Nissin Demae Ramen Sesame Oil (JP).png`. Use them for single labels, menus and social posts |
| **MEON — Noodle Database** | Every noodle: brand, country, spice, diet, soup/dry, weight, page URL |
| **MEON — Deals & Promotions** | Current deals and member-card perks |
| **MEON — Website Views Log** | Page-view snapshots. It is updated **only when you ask** (see below) |

The QR PNGs come from `scripts/make_qr_pngs.py`. Each file was checked: it decodes to the right page, and its Drive MD5 matches the generated file.

## QR codes

- No QR codes are printed yet, so no public page links to them: not the announcement bar, home, About, Visit, FAQ, the footer or site search (Preston, 28 Oct: "no qr codes yet"). The staff pages `/qr/` and `/qr-generator/` stay ready, hidden from Google; open them by typing the address.
- Every noodle has a code that opens `https://meon-noodles.vercel.app/noodles/<noodle>/?src=qr`.
- `?src=qr` shows a "Scanned from the shelf" line and lets analytics count shelf scans separately.
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

Every noodle cooks for **3 minutes 50 seconds** (230 seconds): guests press 1, then 2 on the machine, and the timer on each noodle page shows 3:50. The time is set once as `COOK_SECONDS` in `scripts/lib/copy.mjs`, with the cook steps next to it. Spice is rated 0 to 5 against Shin Ramyun = 3; the ladder copy is `SPICE_LADDER` in `scripts/build.mjs`.

## Updating the noodle list

When there's a new list of the packets on the wall, send it to Claude ("here's the new noodle list, update the site"). Noodles that are gone are removed, new ones get a page and a shelf QR code, and the QR PNGs in Drive are regenerated. Existing noodle page addresses stay the same, so printed QR codes keep working.

## Sides and drinks (from the till)

**The site shows no prices** (Preston, 28 Oct 2026: prices change, so they stay off the site). Items come from the Square catalogue export (`MLKQPB3Z0PNN4_catalogue-2026-10-16-1334.xlsx`, 16 October 2026):
- **Noodle pages**: 14 noodles use the till's packet weight where it differed from the old one (`noodles` in `data/catalogue.json`).
- **New noodles**: 27 noodles were in the till but not on the site (`extraNoodles` in `data/catalogue.json`). They have their own page and shelf QR code (on `/qr/`), with an illustrated packet and a spice rating. Their diet says "Ask the crew" until the crew confirms it.
- **Pairings and sides page**: the "Sides" group of `data/toppings.json` holds the ready-to-eat sides (chicken wings, fried Spam, shrimp katsu, tempura prawn, soft-boiled egg, seasoned seaweed), including the till's sides that used to be in `data/catalogue.json`. The drinks list at the end of the page comes from `drinks` in `data/catalogue.json`.

Never copied from the till: prices, SKUs, stock counts, barcodes (GTINs), Square tokens, the $0 "Yr12 Drink Promo" and the "Pairings 4.20 Per 100g" line.

When the till changes, send Claude the new catalogue export ("here's the new Square catalogue, update the site"). It updates packet weights, new noodles, sides and drinks, never prices.

## Pairings and sides

The page is `/pairings-and-sides/`, titled "Pairings and sides" (and so is the nav link; always written with "and", never "&"). The old address `/toppings/` redirects there permanently (`vercel.json`), so old links and anything already shared keep working. The data file is still `data/toppings.json`, with four groups:
- **Meat and seafood** and **Vegetables and more**: pairings. They go in the bowl with the noodles at the start, so they cook together.
- **Egg and cheese**: added on top of the noodles in the last 30 seconds (on the noodles, not the bowl, or the bowl burns).
- **Sides**: ready to eat, and they don't go in the machine.

Bok choy was removed (28 Oct 2026) because MEON doesn't stock it.

## MEON Card

The MEON Card has been taken off the website completely. `/meon-card/` redirects to the home page (see `vercel.json`).

## Videos

The home page is built around short, muted background clips cut from MEON's own footage (29 Oct 2026, Preston: full-screen video hero, videos and photos as you scroll, an auto-scrolling Instagram strip near the bottom). The promo and the website tour came off the site the same day. The clips have no sound, no captions and no prices in frame. Some are slowed down, some sped up.

| File in `src/assets/video/` | Where | What it is |
| --- | --- | --- |
| `hero-phone.mp4` | Home hero, phones | 17 s portrait montage: the MEON sign, someone pointing at it, the stairs, the noodle wall, walking past the counter |
| `hero-wide.mp4` | Home hero, desktop | 12 s, three portrait clips side by side (street, sign and walk-in, wall and counter); portrait footage stretched to 16:9 would go soft |
| `wall-glide.mp4` | Step 1, Pick a packet | The noodle wall, slowed down |
| `enjoy-friends.mp4` | Step 4, Enjoy your meal | Friends eating, from the @meonnoodles reel DedzCYDhezV (before its captions) |
| `street-front.mp4` | Closing "Find us in Northbridge." band | The street and the MEON sign, slowed down |
| `ig-*.mp4` | Instagram strip | 6-second previews of @meonnoodles reels (trimmed before any price). Each opens its reel on Instagram; the three cut from Preston's WhatsApp clips (`ig-store-tour`, `ig-sign`, `ig-walk-in`) open the profile |

Every clip has a `.webp` poster of the same name. Posters are all that visitors with "reduce motion" or Save-Data get, and what everyone sees until a clip starts. A clip loads only when it nears the screen and plays only while on screen; the hero loads just the cut that fits the screen. The pause button in the hero stops every background video and the strip, and the browser remembers the choice.

Sources: Preston's WhatsApp clips of the shop and @meonnoodles' own reels. The collab reel by @little_miss_fussy_eats is a third-party creator's and is not re-hosted. `meon-work/rebuild/make_videos.sh` cuts and encodes everything (H.264, no audio, `+faststart`). File names don't need dates: the build adds a content hash to every asset URL. To change a clip, replace the file, run `npm run build` and redeploy. Sharper originals (not WhatsApp copies) would make the hero look better.

All the music is original and generated for MEON, so there are no licensing issues on Instagram, TikTok or YouTube.

## Guest reviews

Guests can leave a 1–5 star rating, their first name and a comment at the bottom of the home page (general reviews) and of every noodle page (reviews for that noodle). Reviews appear on the site straight away. The form only posts after the guest ticks "Publish my first name and review on this site" (unticked by default). `/privacy/` explains what is kept and how to have a review removed.

**Where they are stored:** Supabase, table `meon_reviews` in the project **jaymini-prod** (`wzgfjuxcprignwdlopvl`). The free Supabase plan allows only two projects, and both were already in use, so MEON shares that project. The table is kept separate and locked down, so it cannot read or change anything else in the project. Settings live in `data/site.json` under `reviews`.

| Column | Meaning |
| --- | --- |
| `name`, `rating`, `comment` | What the guest typed (name up to 40 characters, comment up to 600) |
| `noodle_slug` | Which noodle page it came from; empty means a general review from the home page |
| `source` | `qr` if they arrived by scanning a shelf code, otherwise `web` |
| `approved` | `true` shows it on the site; set it to `false` to hide it |
| `created_at` | When it was posted |
| `consent_version` | Which version of the review agreement the guest ticked (e.g. `reviews-2026-10-27`); empty on reviews posted before the checkbox existed |

**Consent setup:** `docs/sql/2026-10-27-meon-reviews-consent.sql`. All three steps were done on 28 October 2026:
1. STEP 1 (13:40 PDT) added the `consent_version` column before the site version with the checkbox went live.
2. The site was deployed (13:43 PDT).
3. STEP 3 (16:35 PDT) made the database itself reject reviews without consent. Reviews posted before `2026-10-28 20:50:05 UTC` are exempt, so old reviews can still be hidden or shown.

Since STEP 3, anything that inserts reviews, including an admin script using the service role, must send `consent_version`.

If you change the checkbox wording or what the form collects:
- bump `REVIEW_CONSENT` in `scripts/build.mjs`;
- update `/privacy/`.

**To read or hide reviews:**
1. Open <https://supabase.com/dashboard>, choose **jaymini-prod**, then **Table Editor**, then `meon_reviews`.
2. To hide a review, untick `approved` on its row. It disappears from the site on the next page load.
3. To export them, click **Export**, then **CSV**.
4. When a guest asks for their review to be removed (the privacy page tells them to message Instagram), delete the row. Hiding it isn't enough, because the privacy page promises removal.

Read and manage reviews only in the Supabase dashboard. Don't paste them into, or have them read by, an AI assistant: guests haven't agreed to their reviews going to an AI provider (ledger 299). If that's ever wanted, name the provider on `/privacy/`, add it to the checkbox text and bump `REVIEW_CONSENT` first.

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
| Change a noodle's spice rating | Edit `spice` for that noodle in `data/noodles.json` (or in `extraNoodles` in `data/catalogue.json`), rating it against Shin Ramyun = 3. Editing the Drive doc alone won't change it: the parser keeps existing ratings and only takes the doc's spice for new noodles |

After any change: `npm run build && npm run check`. Pushing to GitHub doesn't deploy: `vercel.json` turns off Vercel's Git builds for every branch except `main` and `preview/<name>` (the free plan allows 100 deployments a day across all the projects). Publish a checked change once with `vercel deploy --prod`, and push to a `preview/<name>` branch only when you need a preview link.

## Still to confirm

- Phone, email and opening hours. The address is Shop 8, 45 Francis Street, Northbridge WA 6003 (Preston, 29 Oct 2026, matching MEON's Instagram). Opening hours are on Instagram and change often, so the site points there instead of listing them
- Whether MEON already has a Google Maps place at 45 Francis Street. If there is one, claim it rather than making a second listing, and paste its link into `googleBusinessUrl` and its coordinates into `geo`
- The final domain (do this before printing QR codes). `meon.au` is registered to Seven Ninety Seven Pty Ltd and parked at GoDaddy. If that's MEON's company, point it at the Vercel project rather than buying a new domain
- Nongshim Shin Noodle Soup Original is marked vegetarian-friendly in the Drive doc; check the packet on the wall (many Shin Ramyun versions list beef)
- The promo and website tour videos were taken down on 29 Oct 2026 (Preston: "get rid of it for now"); the home page now uses short background clips instead (see Videos)
- 130 noodles still need a shoot photo (they show an illustrated packet)
- The updated noodle list of what is actually on the wall
- The Google Business Profile review link (paste it into `googleBusinessUrl` in `data/site.json`; until then the review buttons open MEON on Google Maps)
- Diet for the 27 noodles added from the till (in `data/catalogue.json`)
- Shelf QR PNGs in Drive: the 27 new noodles' codes are on `/qr/` but not yet in the Drive folder (run `python3 scripts/make_qr_pngs.py` and upload)
- Till items not added yet: "Kang Shi Fu Hot & Spicy Beef" (may be the Braised Beef Spicy Red already on the site) and "Nissin Black Garlic Demae Ramen" (may be the same packet as the Black Garlic Oil Tonkotsu)
- Myojo's country: the new Myojo Mee Goreng says Singapore (Myojo is Nissin Foods Singapore's brand), while the Drive doc lists Myojo Mee Poh Dry as Malaysia
