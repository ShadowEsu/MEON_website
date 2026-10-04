# MEON website

MEON is an instant-noodle dine-in at Canning Bridge, Perth, Western Australia. This repo builds the MEON website: a fast, static site with **a page and a QR code for every noodle on the wall**.

- 172 noodles from 12 countries, each with its own page (story, spice level, diet, soup/dry, packet size, **cooking-machine setting**, cook timer, topping ideas, similar noodles)
- Noodle library with search, country / style / spice / diet filters and sorting (filters are shareable URLs, e.g. `/noodles/?country=jp&type=Soup`)
- Site-wide search on every page (header button, <kbd>Ctrl/⌘ K</kbd> or <kbd>/</kbd>)
- Shelf QR codes (`/qr/`, printable) plus an in-browser QR generator (`/qr-generator/`) with the MEON logo, colours, PNG/SVG download
- Country pages, toppings & sides, MEON Member Card, About, Visit
- Professional, calm design: one typeface (Bricolage Grotesque), ink and white with MEON red as the only colour, hairlines instead of boxes, no emojis (custom line icons and real flag artwork)
- Noodle pages built for in-store QR scans: photo, machine setting and cook timer first, then facts, cooking steps and toppings
- Smooth motion: Lenis scrolling, masked headline reveals, image reveals, parallax, scroll-linked noodle wall, sticky "how it works", magnetic buttons, living mascots, moving logo, home intro. Transform/opacity only, paused off-screen, off for "reduce motion"
- Optional background music: an original lo-fi loop generated in the browser (off by default)
- SEO: Restaurant, WebSite, Menu (172 items), MenuItem, Breadcrumb, ItemList and FAQ structured data, keyword titles, image sitemap, `llms.txt`
- Dine-in only: no online ordering

Docs: [`docs/design-system.md`](docs/design-system.md) (rules, page anatomy, motion catalogue, sound, adding a page) · [`docs/operations.md`](docs/operations.md) (QR codes, Google Drive hub, views log, common edits) · [`docs/seo.md`](docs/seo.md) (what's done for Google and the owner's step-by-step guide).

## Quick start

```bash
npm install
npm run build      # writes ./site
npm run serve      # http://localhost:4173
npm run check      # validates links, titles, h1s, alt text, ids
```

Requires Node 18+. No framework — `scripts/build.mjs` renders HTML from the JSON in `data/`.

## Deploying (Vercel)

`vercel.json` is set up: build command `npm run build`, output directory `site`. Import the repo in Vercel (or `vercel --prod`) and it just works. Vercel Web Analytics is loaded automatically on non-localhost hosts (toggle with `analytics.vercel` in `data/site.json`); QR scans arrive as page views with `?src=qr`.

**QR codes encode `siteUrl` from `data/site.json`** (currently `https://meon-noodles.vercel.app`). If you use a different domain, change `siteUrl` and rebuild **before printing** shelf codes.

## Editing content

| What | Where |
| --- | --- |
| Address, phone, email, hours, Instagram, ordering note, domain | `data/site.json` (empty values are hidden) |
| Noodles (name, brand, country, spice, diet, type, weight, machine setting) | `data/noodles.json` — regenerate from the Drive sources with `python3 scripts/parse_library.py` |
| Noodle photos | `src/assets/img/noodles/<slug>.webp` (800×800) + `src/assets/img/noodles/sm/<slug>.webp` (400×400), mapped in `data/images.json` |
| Countries (intro copy, flag, colour) | `data/countries.json` |
| Toppings & sides | `data/toppings.json` |
| Deals / member perks | `data/deals.json` (set `"active": false` to hide) |
| Page copy & layout | `scripts/build.mjs`; flavour descriptions in `scripts/lib/copy.mjs`; illustrations in `scripts/lib/art.mjs` |
| Styles / behaviour | `src/assets/css/site.css`, `src/assets/js/site.js` |

### Data sources

- `data/source/Meon_Website_format2.md` — export of the Drive doc *Meon_Website_format2.docx* (names, countries, spice, diet, fun notes). Source of truth.
- `data/source/meon_wix_cms_fixed_final.csv` — Wix CMS export (adds machine settings, fills missing soup/dry and weights).
- Photos were taken from the previous Wix Studio site and checked by hand; six mismatched photos were dropped. Noodles without a photo show a mascot placeholder (“Photo coming soon”).

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
- 20 noodles whose names say spicy/hot are rated 0 in the source doc; the site shows “spice rating coming soon” for them (`data/spice_review.json`). Fix the rating in `data/source/Meon_Website_format2.md`, re-run the parser and remove the slug from that list.
