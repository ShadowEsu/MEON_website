# Getting MEON to the top of Google

Nobody can guarantee a #1 spot, but for searches like "instant noodles Perth", "ramen Northbridge" or "noodle bar near me", a few things decide who shows up first. The website side is done (list below). The rest needs you, because Google wants the business owner to do it. Work through the steps in order; the first two matter most.

## Already done in the website

- **Structured data (schema.org)** that Google reads directly:
  - `Restaurant` on the home page: name, logo, photos, cuisine, menu link, the Google listing as the map link, the street address (Shop 8, 45 Francis Street, Northbridge WA 6003), map coordinates and opening hours. The hours are the same sourced rows the Visit page shows (`hours` in `data/site.json`), and `npm run check` fails if the two ever differ. Once `hoursSource.checked` is more than 90 days old, the build leaves the hours out of the schema until someone re-checks them and updates `checked`, so search engines never keep stale hours for long. No price range, ratings or reviews: those need the owner's facts first. It still needs a phone number, if MEON gets one.
  - `WebSite`
  - a full `Menu` of all 199 noodles, grouped by country
  - a `MenuItem` for every noodle (description with country and packet size, and diet; no price, because prices stay off the site)
  - `BreadcrumbList` on every noodle and country page, and on Countries, Pairings and sides, About, Visit and Privacy
  - an `ItemList` on each country page
  - `FAQPage` on the Visit page
  - All of it passes validator.schema.org with no errors or warnings. Google doesn't show special "rich results" for menus, FAQs or the sitelinks search box any more, so the markup helps Google understand the pages but won't change how they look in results.
- **Titles and descriptions**: every page has its own title and description, for example "Indomie Soto Mie (Indonesia) · Instant Noodles at Meon Perth", "Korean Instant Noodles in Perth (51) · Meon Noodles" and "Visit Meon · Instant Noodle Bar in Northbridge, Perth". Very long noodle names use a shorter "· Meon Perth" ending so the title fits in search results.
- **199 unique noodle pages**, each with real content, which gives Google something to match for searches like "Buldak carbonara Perth" or "where to buy Chapagetti Perth".
- **An FAQ on the Visit page**: questions people actually ask (location, online orders and delivery, how many noodles, vegetarian options, how spicy, how long the noodles take).
- **Sitemaps**: `sitemap.xml` includes image entries, so photos can appear in Google Images.
- **Robots**: `robots.txt` points to the sitemap, and the staff QR pages are hidden from Google.
- **AI assistants**: `llms.txt` gives AI assistants a clean summary of MEON and every noodle. Google says it has no effect on Google Search.
- **Speed (a ranking factor)**:
  - the first image (the home hero poster, each noodle page's photo) loads first; background videos load only near the screen
  - images are sized and lazy-loaded
  - one font file
  - scripts are deferred
  - long caching on assets
- **Sharing and safety**: Open Graph and Twitter cards (good previews when links are shared), and security headers.
- **Settings slots** in `data/site.json`: `googleSiteVerification`, `bingSiteVerification`, `googleBusinessUrl`, `geo`, `hours` with `hoursSource`, and `indexNow`.
- **IndexNow** (Bing, Yandex, Seznam, Naver; free, no account): the build publishes the site's key at `/<key>.txt` (the key comes from the domain, `scripts/lib/indexnow.mjs`, so a new domain gets a new key). After a deploy that adds or changes pages, run `npm run indexnow` to send every sitemap URL, or `npm run indexnow -- visit/ noodles/<slug>/` for just a few. Google doesn't use IndexNow; it reads the sitemap from Search Console.

## Your steps

### 1. Google Business Profile (the biggest win for "near me" searches)
1. The profile exists already: "Meon", Asian restaurant, https://www.google.com/maps?cid=8133712238712901594 (5.0 from 36 reviews on 2 Nov 2026). Go to <https://business.google.com>, find it and **claim** it if you haven't, so you can edit it.
2. Choose the categories:
   - primary: **Noodle shop**
   - secondary: **Ramen restaurant** and **Asian restaurant**
3. Enter the exact street address, phone and opening hours. Use exactly the same details everywhere (see step 5).
4. Website: `https://meon-noodles.vercel.app` (or your own domain later). Menu link: `/noodles/`. On 2 Nov 2026 the listing had **no website**, so Google can't connect the site to the shop yet. This is the single most useful step.
5. Turn on the attributes "Dine-in", "Takeaway" and "No delivery".
6. Upload at least 15 photos: shopfront, the noodle wall, bowls, the cooking stations and the crew. Add new ones every month.
7. Post a Google update every week, for example "New this week: Buldak Mala".
8. The listing's link is already in `googleBusinessUrl` in `data/site.json`.

### 2. Google Search Console (tells Google the site exists)
1. Go to <https://search.google.com/search-console> and click **Add property**, then **URL prefix**.
2. Enter `https://meon-noodles.vercel.app/`.
3. Choose **HTML tag**. Copy only the `content="…"` value into `googleSiteVerification` in `data/site.json`, then ask Claude to redeploy. Click **Verify**.
4. Open **Sitemaps**, enter `sitemap.xml` and click **Submit**.
5. Use **URL inspection** on the home page and `/noodles/`, and click **Request indexing**.
6. For Bing (and ChatGPT search, which uses Bing): go to <https://www.bing.com/webmasters> and choose **Import from Google Search Console**.

### 3. Reviews (the second-biggest local ranking factor)
- Use the review cards: print `/qr/review-card/` (four per A4). Their QR code opens Google's review box for MEON. Rules and setup are in `docs/operations.md`, under "Asking for Google reviews".
- Ask for Google reviews the same way with every guest: never only the happy ones (asking "Enjoyed your bowl?" first is review gating, which Google doesn't allow), and never for anything in return.
- Reply to every review, good or bad, within a few days.
- Never buy or swap reviews. Google removes them and can penalise the profile.

### 4. Your own domain (recommended before printing QR codes)
- Buy `meon.com.au` (needs your ABN) or `meonnoodles.com`. Connect it in Vercel under **Project**, then **Domains**.
- Then change `siteUrl` in `data/site.json` and rebuild. The QR codes and Drive PNGs must be regenerated with `scripts/make_qr_pngs.py`.
- Add the new domain as a property in Search Console too.

### 5. Same details everywhere (NAP: name, address, phone)
Use the identical name ("Meon Noodles"), address and phone on:
- Google, Apple Maps (<https://businessconnect.apple.com>), Bing Places
- Instagram, TikTok and Facebook
- TripAdvisor and Yelp

Mismatched details confuse Google and lower your ranking.

### 6. Get mentioned (backlinks)
- Pitch Perth food media:
  - Broadsheet Perth
  - The Urban List Perth
  - Perth Now food
  - So Perth
  - WA Today
- Invite Perth food TikTokers and Instagrammers. "199 noodles from 12 countries" and the Buldak challenge are easy stories.
- University food clubs (Curtin and UWA are close by) and local community pages.
- Every article that links to the website helps it rank.

### 7. Keep the website fresh
- Add new noodles as they arrive (see `docs/operations.md`). New pages mean new searches you can rank for.
- If MEON gets a phone number, add it to `data/site.json` (and to the Google listing). The hours and map coordinates are in already.
- Keep `@meonnoodles` active and link to the website in your bio.

## How long it takes
- Google usually indexes the site within days of step 2.
- Local map rankings improve over 4 to 12 weeks as reviews, photos and posts build up.
- Check progress in Search Console (**Performance**) and in your Business Profile insights.
