# Getting MEON to the top of Google

Nobody can guarantee a #1 spot, but for searches like "instant noodles Perth", "ramen Canning Bridge" or "noodle bar near me", a few things decide who shows up first. The website side is done (list below). The rest needs you, because Google wants the business owner to do it. Work through the steps in order; the first two matter most.

## Already done in the website

- **Structured data (schema.org)** that Google reads directly:
  - `Restaurant`: name, logo, photos, cuisine, price range, map link, address (plus phone, hours and coordinates once you add them)
  - `WebSite` with a search box
  - a full `Menu` of all 172 noodles, grouped by country
  - a `MenuItem` for every noodle (brand, country, weight, diet)
  - `BreadcrumbList` on 184 pages
  - an `ItemList` on each country page
  - `FAQPage` on the Visit page
- **Titles and descriptions**: every page has its own keyword-rich title, for example "Indomie Soto Mie (Indonesia) · Instant Noodles at MEON Perth", "Korean Instant Noodles in Perth (41)" and "Visit MEON Noodles · Instant Noodle Bar in Canning Bridge, Perth".
- **172 unique noodle pages**, each with real content. These rank for searches like "Buldak carbonara Perth" or "where to buy Chapagetti Perth".
- **An FAQ on the Visit page**: questions people actually ask (online orders, vegan options, location, QR codes, member card).
- **Sitemaps**: `sitemap.xml` includes image entries, so photos can appear in Google Images.
- **Robots**: `robots.txt` points to the sitemap, and the staff QR pages are hidden from Google.
- **AI search**: `llms.txt` gives AI assistants (ChatGPT, Gemini, Perplexity) a clean summary of MEON and every noodle.
- **Speed (a ranking factor)**:
  - the main photo is preloaded
  - images are sized and lazy-loaded
  - one font file
  - scripts are deferred
  - long caching on assets
- **Sharing and safety**: Open Graph and Twitter cards (good previews when links are shared), and security headers.
- **Settings slots** in `data/site.json`: `googleSiteVerification`, `bingSiteVerification`, `googleBusinessUrl`, `geo` and `openingHours`.

## Your steps

### 1. Google Business Profile (the biggest win for "near me" searches)
1. Go to <https://business.google.com>, search for MEON and **claim** it, or create a new profile.
2. Choose the categories:
   - primary: **Noodle shop**
   - secondary: **Ramen restaurant** and **Asian restaurant**
3. Enter the exact street address, phone and opening hours. Use exactly the same details everywhere (see step 5).
4. Website: `https://meon-noodles.vercel.app` (or your own domain later). Menu link: `/noodles/`.
5. Turn on the attributes "Dine-in", "No delivery" and "No takeaway" (if true).
6. Upload at least 15 photos: shopfront, the noodle wall, bowls, the cooking stations and the crew. Add new ones every month.
7. Post a Google update every week, for example "New this week: Buldak Mala".
8. Copy your profile's share link into `googleBusinessUrl` in `data/site.json`.

### 2. Google Search Console (tells Google the site exists)
1. Go to <https://search.google.com/search-console> and click **Add property**, then **URL prefix**.
2. Enter `https://meon-noodles.vercel.app/`.
3. Choose **HTML tag**. Copy only the `content="…"` value into `googleSiteVerification` in `data/site.json`, then ask Claude to redeploy. Click **Verify**.
4. Open **Sitemaps**, enter `sitemap.xml` and click **Submit**.
5. Use **URL inspection** on the home page and `/noodles/`, and click **Request indexing**.
6. For Bing (and ChatGPT search, which uses Bing): go to <https://www.bing.com/webmasters> and choose **Import from Google Search Console**.

### 3. Reviews (the second-biggest local ranking factor)
- Create a review QR code:
  1. In your Google Business Profile, click **Ask for reviews** and copy the link.
  2. Make a QR code from it at `/qr-generator/` (paste the link, untick `?src=qr`).
  3. Put the code on every table: "Enjoyed your bowl? Leave us a review."
- Reply to every review, good or bad, within a few days.
- Never buy or swap reviews. Google removes them and can penalise the profile.

### 4. Your own domain (recommended before printing QR codes)
- Buy `meon.com.au` (needs your ABN) or `meonnoodles.com`. Connect it in Vercel under **Project**, then **Domains**.
- Then change `siteUrl` in `data/site.json` and rebuild. The QR codes and Drive PNGs must be regenerated with `scripts/make_qr_pngs.py`.
- Add the new domain as a property in Search Console too.

### 5. Same details everywhere (NAP: name, address, phone)
Use the identical name ("MEON Noodles"), address and phone on:
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
- Invite Perth food TikTokers and Instagrammers. "172 noodles from 12 countries" and the Buldak challenge are easy stories.
- University food clubs (Curtin and UWA are close by) and local community pages.
- Every article that links to the website helps it rank.

### 7. Keep the website fresh
- Add new noodles as they arrive (see `docs/operations.md`). New pages mean new searches you can rank for.
- Add your street address, phone, hours and map coordinates to `data/site.json` as soon as you can. They feed the structured data Google uses for the map pack.
- Keep `@meonnoodles` active and link to the website in your bio.

## How long it takes
- Google usually indexes the site within days of step 2.
- Local map rankings improve over 4 to 12 weeks as reviews, photos and posts build up.
- Check progress in Search Console (**Performance**) and in your Business Profile insights.
