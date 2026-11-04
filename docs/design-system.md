# MEON design system (v3)

The site is professional, light and calm, and lets the food lead. It uses one typeface and one colour (MEON red) on white and a soft cream (since the light re-skin, Preston, 4 Nov 2026: "just make the site more light, more, now"; nothing is ink-backed any more). Layout comes from spacing and hairlines, not boxes. Files: `src/assets/css/site.css` (styles; the "Light re-skin" block near the end overrides the older dark rules above it), `src/assets/js/site.js` (behaviour), `src/assets/js/music.js` (optional music), `scripts/build.mjs` (pages), `scripts/lib/art.mjs` (icons, flags, logo, mascots).

## Rules
- **One font:** Bricolage Grotesque (variable, with automatic optical size). It is used for headings and body text alike, set apart only by weight and size.
- **One colour:**
  - ink `#1d1a17` text on white (`--ink`; `--muted #67625d` for small print), with MEON red as the only accent: the logo, the primary button (with a 2 px ink bottom edge), the active nav underline and small dots. Yellow appears only on small spice badges.
  - `--brand #ec1b25` (the logo red) for the logo and large fills only: white on it is 4.4:1, enough for large text only
  - `--red #c6121b` for text and buttons with normal-size white text on red: white on it is 6.0:1 (`--red-deep #a50f16` on hover)
  - `--soft #fbf7ef` is the only tint: the announcement line, footer, video wall, closing bands and alternating sections. Hairlines are `--line #ece6da`, 1 px; no heavy outlines or offset shadows
- **No emojis anywhere.** Icons are a custom line set (`svgIcon()` in `art.mjs`, also published as `assets/img/icons.svg` for JavaScript). Flags are real artwork from flag-icons (MIT), copied to `assets/img/flags/`.
- **The logo is drawn, not typed, and always complete.** It is the full mixed logo: "meon" with み อี 哦 ㄴ underneath, never the word alone (Preston, 29 Oct 2026). `scripts/trace_logo.py` traces it from the official artwork into `scripts/lib/logo-mixed.json`, so no second font is loaded. `logoMark()` in `art.mjs` is the red square, used everywhere it appears as a badge: the header on every page (Preston, 29 Oct 2026: "square please", never the wide crop, and always animated) and About's hero. The home hero has none since 5 Nov 2026 (it doubled the header's square right above it; Design). In the square the glyphs are about 6% of its height, so in the header they read as small marks; About's big square is where they read clearly. `logoLockup()` is the lettering alone in the current colour (footer: logo red on the soft band).
- **No boxes:**
  - cards are a photo plus text
  - sections are separated by hairlines (`--line`) and space
  - borders of controls (inputs, selects, textareas, empty rating stars) use `--line-strong #8a847e`, 3.7:1 on white (WCAG 1.4.11); `--line-2` is only for hairlines
  - nothing is a card inside a card
- **Copy is specific and plain.** It uses full stops, few exclamation marks, no "slurp" or "noodle heaven", and no em dash in headings.
- **First person** (Preston, 29 Oct 2026): the shop speaks as "we", "us" and "our" ("Come visit us", "our crew is here if you need a hand"). Quotes of MEON's own Instagram captions keep their wording.
- **Filter and diet wording** (Preston, 29 Oct 2026): spice filters are just "No heat", "Medium" and "Hot" (no "exactly" options); the diet label is "Vegetarian" (never "vegetarian-friendly"), and there is no vegan filter or label. A product's own name keeps its wording. Noodles with chicken, beef or pork flavour say **"Meat flavour"** (with the meat in brackets when the packet names it), never "Vegetarian" or "Ask the crew", even when the flavour is artificial (owner's ruling, 2 Nov 2026); their noodle page explains it under the facts row. "Vegetarian" needs the maker's ingredient list on record (`dietSource`, BOSS and Security, 2 Nov 2026); without it a noodle says "Ask the crew", and with no sourced vegetarian noodle the Vegetarian filter and links are left out
- **One name per action** (Design, 31 Oct 2026):
  - every Google Maps link says **"Get directions"** (announcement line, hero, visit band, visit page, footer)
  - in-page links and buttons to `/visit/` say **"Visit us"**; the nav, footer page list and tab bar keep the page name "Visit"
  - every button that opens search says **"Search noodles"** (the header and tab-bar buttons show "Search" for space, with "Search noodles" as their accessible name)
  - both reset buttons on `/noodles/` say **"Clear filters"** ("Clear search and filters" when a typed search found nothing)
  - the noodle count is the real number from the data, never "100+" (see `docs/operations.md`). It stays on one line; on a phone, if it doesn't fit beside the sort and "Clear filters", those move to their own row
- **Keyboard and screen readers** (accessibility pass, 1 Nov 2026; `scripts/smoke.mjs` checks the keyboard and naming items, the build checks the alt text):
  - the skip link and other in-page links move keyboard focus to where they scroll
  - the phone menu and search behave as dialogs: the page behind is inert, Tab wraps inside, Escape closes and puts focus back on the button that opened them
  - nothing focusable is invisible: the back-to-top button shows while focused, and a step card with a focused button comes out from under the next card
  - a control's accessible name starts with its visible label ("Sound (background music)", "Search noodles"); a reel link's name is its caption
  - photos say what they show (`data/photo-alts.json`, keyed by file; the build stops on a photo without one); photos inside a card link have empty alt, because the link text names the noodle

## Page anatomy
1. Announcement line (every page except home): "Cook-it-yourself instant noodles at Shop 8, 45 Francis Street, Northbridge." with a Get directions link.
2. Header: solid white on every page, with a hairline appearing on scroll. The square logo on the left (its letters and glyphs rise in on every page load, then wave in turn), the nav centred (Home, Noodles mega menu, Countries, Pairings and sides, About), and **Sound**, **Search** (Ctrl/⌘ K or "/") and **Visit** on the right, all at least 44 px tall.
3. Home (light re-skin, 4-5 Nov 2026): a white hero with "Your bowl, your rules." (the second line in red), two real bowls from the booth shoot linking to their noodle pages, the two actions (Browse the noodle wall, Get directions) and one line on what MEON is. Desktop: the one portrait clip (Preston, 30 Oct 2026: "I only want the left one, not all 3") whole at 9:16 in a rounded card on the left, the words and bowls beside it. Phones: headline, the two bowls, the two buttons, then the line, and no clip (Design, 5 Nov 2026: the clip card's top peeked into the first screen and slowed the largest paint; the same footage plays in the reels right below). Straight after it, the Instagram-style @meonnoodles reel cards (MEON's real logo as the avatar in Instagram's story ring), then the four "Do it yourself" steps as white cards in a grid (clip on top, words below; 1 column on phones, 2 on tablets, 4 on desktop) and the "Bring your crew." video wall on the soft band, its words on a white card. Then the flavour banners, the five booth-shoot bowls ("Real bowls, real packets."; until 4 Nov 2026 "Straight out of the machine.", which nothing proved, since the shoot was on another set), the noodle wall, Worth a try, roulette, countries, heat check, Build your bowl, reviews, a closing "Find us in Northbridge." band, and last "Follow us." (Preston, 29 Oct 2026) with big Instagram and TikTok logo links to @meonnoodles (the two logos keep their own colours). No count-up facts and no stats on the home page.
   Pairings and sides, Noodles, Countries, About and Visit (29 Oct 2026, Preston: "update the other pages"): a white video hero (`videoHero()`). Desktop: the words on the left (breadcrumbs, an eyebrow with a red dot, the big title, a lead and actions; About also shows the big square logo) and two portrait clips side by side in a rounded card on the right; phones: the words first, then the whole clip in a centred 9:16 rounded card. The reels have their own burned-in captions, so the words never sit on the footage. Pairings and sides adds sticky same-page tabs under the header (each group and Drinks, with counts from the data). Every other page (country pages, Privacy, the staff QR pages): page hero (`pageHero()`): breadcrumbs, then a small eyebrow, then a large split-word title, a lead and actions. On the right is one visual or a peeking mascot (`peeker()`).
   Videos are "zoomed out" (Preston, 29 Oct 2026): each frame shows most or all of its clip (the desktop home clip, phone frames and the desktop inner-page columns show the whole 9:16 clip, fitted on the soft tint with `object-fit: contain`, Design, 31 Oct 2026, so no reel caption is cut at the column edge), and nothing is cropped tighter than that.
4. Content sections.
5. Reviews (`reviewsBlock()`): a star summary, a form and the latest reviews. It appears on the home page and on every noodle page. "Keep it friendly." is the review field's hint, directly under "Your review" and in its `aria-describedby` (Design, 31 Oct 2026). It is never a line under the Post button, where it would read like a telling-off after an error.
6. Red closing band (`ctaBand()`) with big type and three mascots. The home page closes with its own video band instead.
7. Ink footer with the giant red logo lockup, its letters and glyphs rising in one by one.
8. Phones: a bottom tab bar (Noodles, Search, Countries, Visit).

## Noodle page (shelf landing)
The page is built for someone standing at the shelf with their phone. The order is:
1. Photo (full width on phones)
2. "Scanned from the shelf" line, shown only with `?src=qr`
3. Country and brand, the name, and a one-line flavour summary
4. **"Press 1, then 2" and the 3:50 cook timer**, side by side between two rules. A mascot appears while the timer runs and says "Noodles ready" when it ends; the phone also beeps and vibrates.
5. Facts row: spice, style, diet, packet
6. About, then how to cook it (numbered: grab your packet, pairings in, press 1 then 2, egg and cheese in the last 30 seconds, stir and eat; dry noodles drain and toss), then pairings that go well with it (round photos)
7. Share, previous and next
8. Reviews of this noodle, then similar noodles

## Motion (smooth by design)
All motion uses transform and opacity only, runs from one scroll loop, pauses when off-screen and switches off for reduced motion. The background videos follow the same rule: they start by themselves on every phone (Preston wants that), but for reduced motion they start paused behind a "Play videos" pill and play only after a tap (BOSS, 30 Oct 2026).

Sections don't fade or rise in as you scroll, and section headings (h2) don't animate: their content is already there when you reach it. A page title's word reveal is the page's one entrance moment, and only on pages a visitor sees once or twice (About, Visit, Countries, country pages, Pairings and sides, Noodles, Privacy). Pages people open back to back show their title at once: every noodle page, /spiciest-noodles/ and /buldak/ (`pageHero(…, { split: false })`). Screen readers get the title once, from the h1's aria-label; the word spans are aria-hidden (Design, 4 Nov 2026, no-AI-slop item 16: one orchestrated moment per page at most; animate by frequency).

| Effect | Where |
| --- | --- |
| Background videos: muted loops that start by themselves on every device (Preston, 29 Oct 2026: "nobody has to press play"); for reduced motion they start paused and the hero shows a "Play videos" pill, one tap plays them all (BOSS, 30 Oct 2026); loaded only near the screen, playing only while on screen (a reel or step card that leaves drops a file still downloading: Design, 31 Oct 2026); if the browser refuses to start them (iPhone Low Power Mode), the next tap starts the ones on screen; never loaded for Save-Data; no play badges. One play/pause for all of them: a 44 px white round button on the hero's clip card, an icon while they play and a "Play videos" pill while paused; once it scrolls away (or on phones, where the home hero has no clip), the same button appears in the header, left of Sound, while a video is in view (never two at once, nothing on top of it, no transition). The choice lasts until the tab closes | Home (hero, step cards, video wall, closing band, reel cards), inner-page heroes, header |
| Nothing pins, shrinks or fades with scroll since the light re-skin (4 Nov 2026): the heroes and the four step cards are still layouts. `site.js` still sets `--p`/`--q` on the home scenes; only the video wall and the scroll progress bar read them | Home |
| Video wall: four columns of clips and photos drift at different speeds through the section | Home "Bring your crew." (`[data-scene="through"]`) |
| Glyphs in the big logo rise in one after another, then take turns to hop (they never disappear) | About hero logo |
| Auto-scrolling reel strip (Preston asked for it, 29 Oct 2026): one transform animation, paused on hover, focus, the pause button and off-screen; a still, swipeable row for reduce motion | Home (`#instagram`) |
| Masked word reveal | Page titles (`h1` with `data-split`), except noodle pages and the SEO lists |
| Image reveal: a cover panel slides away and the photo settles | `.img-reveal`: home "Straight out of the machine." tiles, Visit photos. Not the noodle-page photo, which shows at once like its title |
| Parallax using the `translate` property | `[data-parallax="0.05"]` (hero photos, flags) |
| Scroll-linked rows (move with your scroll, not on their own) | Noodle wall, flavour banners (`[data-hscroll]`) |
| Count-up numbers | `.facts` (country pages) |
| Magnetic buttons | `[data-magnetic]` (mouse only) |
| Mascots: blink, eyes follow the cursor; wave and squish on hover; tap to talk | Page heroes, red band, timer, back-to-top |
| Header logo: still, letters there on load (every page, so no entrance and no idle wave: Design, 4 Nov 2026); the badge tilts on hover | Header, every page |
| Logo: letters and glyphs hop when you hover | About logo, footer |
| Paper confetti | Roulette win, timer finished |
| Flavour banners (white, ink words, small red dots) that move with your scroll | Home, after the reel cards (`.ticker`) |
| Build your bowl: pairings and sides drop into the bowl with a bounce, the bowl wobbles | Home (`#build`) |
| Heat check: chilli slider warms the section, the mascot sweats, matching noodles appear | Home (`#spice`) |
| Illustrated packets, coloured by flavour, for noodles without a photo | Cards, noodle pages |

Speed rules (tested with the CPU slowed 4x, like an average phone):
- Nothing animates forever except cheap things (blinks, floats, the home hero logo's glyph hop). Waves, squishes and the other logo hops only play on hover or tap.
- Sections below the first one use `content-visibility: auto`, so the browser skips drawing them until you scroll near.
- `play.js` does nothing until someone touches Build your bowl, Heat check or a mascot.

Removed on purpose:
- the cursor ring, headline letters reacting to the mouse, scrambling labels and page transitions (they made the site laggy)
- smooth-scroll libraries and scroll hijacking: scrolling is the browser's own, so it never lags behind your finger or wheel
- the home intro screen
- the header hiding on scroll
- backdrop blur
- animated blur and drop-shadow filters
- card tilt (cards now wiggle slightly instead)
- auto-scrolling marquees, except the home reel strip Preston asked for (the flavour banners only move when you scroll)

These were the main causes of lag, and some are common "AI website" tells.

## Sound
`music.js` plays **MEON FM** (`assets/audio/meon-fm.mp3`), an original 103-second seamless loop in the same style as the promo videos: electric piano, marimba melody, bass and soft drums. If the file can't load it falls back to a lo-fi loop generated live with the Web Audio API. No licensing issues.
- On the first visit to the home page a small "Turn the vibes on?" prompt (a white pill) offers it once the video hero has scrolled away, so it never covers the hero's buttons (browsers don't allow sound before a tap). It closes itself after 14 s. On phones it docks 12 px above the tab bar (Design, 5 Nov 2026: under the header it covered the name tags of cards scrolling past), rising from below the screen behind the tab bar (z-index 85, under the tab bar's 90); the back-to-top mascot, which shares that corner, steps aside while it shows. The answer is remembered.
- The **Sound** button starts it, and the choice is remembered. Browsers block autoplay, so a returning visitor's music resumes on their first tap. Its accessible name is "Sound (background music)" whether music is on or off; `aria-pressed` says which.
- While music plays, mascots blip when tapped and the roulette chimes.

## Adding a page
In `scripts/build.mjs`:

```js
addPage("new-page/", layout({
  urlPath: "new-page/",
  title: "New page",
  seoTitle: "Keyword-rich title for Google · MEON Noodles Perth",
  description: "One-sentence summary for search results.",
  body: (r) => `
${pageHero(r, { crumbs: [["New page"]], eyebrow: "Label", title: "Title.", lead: "…", seed: 4 })}
<section class="section"><div class="wrap">…</div></section>
${ctaBand(r)}`,
}));
```

Then run `npm run build && npm run check`, followed by the smoke test and sweep from the README.
