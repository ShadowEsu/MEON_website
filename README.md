# MEON website

MEON is a cook-it-yourself instant-noodle bar at Shop 8, 45 Francis Street, Northbridge, Perth, Western Australia. This repo builds the MEON website: a fast, static site with **a page for every noodle on the wall** (and shelf QR codes ready to print).

- 199 noodles from 12 countries, each with its own page (story, spice level, diet, soup/dry, packet size, **"press 1, then 2"** on the cooking machine, a 3:50 cook timer, pairing ideas, similar noodles)
- Noodle library with search, country / style / spice / diet filters and sorting (filters are shareable URLs, e.g. `/noodles/?country=jp&type=Soup`)
- Site-wide search on every page (header button, <kbd>Ctrl/⌘ K</kbd> or <kbd>/</kbd>)
- Shelf QR codes (`/qr/`, printable) plus an in-browser QR generator (`/qr-generator/`) with the MEON logo, colours, PNG/SVG download. Both are staff pages hidden from Google; no codes are printed yet, so the public pages don't mention QR codes
- Country pages, Pairings and sides (`/pairings-and-sides/`: pairings, egg and cheese, ready-to-eat sides, then a drinks list; the old `/toppings/` address redirects there), About, Visit
- No prices anywhere: prices change, so they stay off the site
- Professional, calm design: one typeface (Bricolage Grotesque), ink and white with MEON red as the only colour, hairlines instead of boxes, no emojis (custom line icons and real flag artwork)
- Noodle pages built for someone at the shelf: photo, "press 1, then 2" and the cook timer first, then facts, cooking steps and pairings
- Motion with plain native scrolling (no scroll smoothing, no intro screen): masked headline reveals, image reveals, parallax, scroll-linked noodle wall, magnetic buttons, mascots, logo letters that hop on hover and glyphs that take turns in the big home logo. Transform/opacity only, paused off-screen, off for "reduce motion"
- Guest reviews: star rating, name and comment on the home page and every noodle page, stored in Supabase (see `docs/operations.md`)
- Optional background music: an original lo-fi loop generated in the browser (off by default)
- Video-first home page (29 Oct 2026): a full-screen video hero (a portrait cut on phones, a wide 3-up cut on desktop), the booth-shoot bowls, the four "Do it yourself" steps over video and photos, and an auto-scrolling strip of @meonnoodles reels. Background clips are muted, load only near the screen and stay still for "reduce motion" and Save-Data (see `docs/operations.md`, Videos)
- SEO: Restaurant, WebSite, Menu (199 items), MenuItem, Breadcrumb, ItemList and FAQ structured data, keyword titles, image sitemap, `llms.txt`
- Dine in or take it away: no online ordering

Docs: [`docs/design-system.md`](docs/design-system.md) (rules, page anatomy, motion catalogue, sound, adding a page) · [`docs/operations.md`](docs/operations.md) (QR codes, Google Drive hub, reviews, views log, common edits) · [`docs/seo.md`](docs/seo.md) (what's done for Google and the owner's step-by-step guide).

## Quick start

```bash
npm install
npm run build      # writes ./site
npm run serve      # http://localhost:4173
npm run check      # validates links, titles, h1s, alt text, ids
```

Requires Node 18+. No framework — `scripts/build.mjs` renders HTML from the JSON in `data/`.

## Deploying (Vercel)

`vercel.json` is set up: build command `npm run build`, output directory `site`. Production is published with `vercel deploy --prod`. Vercel's Git builds are off for every branch except `main` and `preview/<name>` (`git.deploymentEnabled` in `vercel.json`), so ordinary pushes don't use up the 100-deployments-a-day limit. Vercel Web Analytics is off (`analytics.vercel: false` in `data/site.json`), because it isn't enabled on the Vercel project and the script returned 404. To use it, enable Web Analytics on the project in Vercel first, then set the flag to `true` and redeploy. QR scans arrive as page views with `?src=qr`.

**QR codes encode `siteUrl` from `data/site.json`** (currently `https://meon-noodles.vercel.app`). If you use a different domain, change `siteUrl` and rebuild **before printing** shelf codes.

## Editing content

| What | Where |
| --- | --- |
| Address, phone, email, hours, Instagram, ordering note, domain | `data/site.json` (empty values are hidden) |
| Noodles (name, brand, country, spice, diet, type, weight) | `data/noodles.json` — regenerate from the Drive sources with `python3 scripts/parse_library.py` |
| Catalogue weights, catalogue-only noodles, drinks (no prices) | `data/catalogue.json` (from the Square catalogue export; see `docs/operations.md`) |
| Noodle photos | `src/assets/img/noodles/<slug>.webp` (800×800) + `src/assets/img/noodles/sm/<slug>.webp` (400×400), mapped in `data/images.json` |
| Countries (intro copy, flag, colour) | `data/countries.json` |
| Pairings & sides (groups: Meat and seafood, Vegetables and more, Egg and cheese, Sides) | `data/toppings.json` |
| Cook time (230 s, shown as 3:50) | `COOK_SECONDS` and `COOK_TIME` in `scripts/lib/copy.mjs` |
| Spice ladder copy (0 to 5, against Shin Ramyun = 3) | `SPICE_LADDER` in `scripts/build.mjs` |
| Logo | traced from the official artwork by `python3 scripts/trace_logo.py` into `scripts/lib/logo-mixed.json`; drawn by `logoMark()` and `logoLockup()` in `scripts/lib/art.mjs` |
| Page copy & layout | `scripts/build.mjs`; flavour descriptions and cook steps in `scripts/lib/copy.mjs`; illustrations in `scripts/lib/art.mjs` |
| Styles / behaviour | `src/assets/css/site.css`, `src/assets/js/site.js` |

### Data sources

- `data/source/Meon_Website_format2.md` — export of the Drive doc *Meon_Website_format2.docx* (names, countries, diet, fun notes, and spice for noodles new to the site). Source of truth.
- `data/source/meon_wix_cms_fixed_final.csv` — Wix CMS export (fills missing soup/dry and weights).
- Spice: every noodle is rated 0 to 5 against Shin Ramyun = 3 (Indomie Mi Goreng = 1, Mama Creamy Tom Yum = 2), recalibrated on 28 Oct 2026. Re-running `scripts/parse_library.py` keeps the spice already in `data/noodles.json` and takes the doc's spice only for noodles new to the site.
- `data/catalogue.json` — items from MEON's Square catalogue export (16 Oct 2026), with no prices. It adds the till's packet weight to 14 noodles where it differs, 27 noodles that are in the till but not yet in the Drive doc (`extraNoodles`), and the drinks on the Pairings & sides page. The till's sides live in `data/toppings.json`. SKUs, stock counts and barcodes are never copied in.
- Photos: noodle and bowl photos come from MEON's own photo shoot (see `docs/operations.md`). Pairing and side photos are MEON's own or free-licence library photos. `docs/credits.md` lists the source and licence of every image MEON didn't make itself. Noodles without a shoot photo show an illustrated packet.

## Dev helpers

```bash
PLAYWRIGHT_PATH=/path/to/playwright/index.mjs node scripts/smoke.mjs   # clicks through search, filters, roulette, timer, QR generator
PLAYWRIGHT_PATH=... node scripts/sweep.mjs                              # every page × phone/desktop: console errors + overflow
PLAYWRIGHT_PATH=... node scripts/screenshot.mjs <outDir> / /noodles/    # full-page screenshots
python3 scripts/make_qr_pngs.py [outDir]                                # compact 1-bit QR PNGs for Drive (+ manifest.csv with md5s)
```

## Things to confirm

- Street address, phone, email and opening hours (placeholders on the old Wix site were template text, so they are hidden until set in `data/site.json`).
- Final domain for QR codes (see above).
- The 27 noodles added from the till (`extraNoodles` in `data/catalogue.json`) have no diet yet; their pages say "Ask the crew". Fill these in `data/catalogue.json` when the crew confirms them.
