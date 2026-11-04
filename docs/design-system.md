# MEON design system (v3)

The site is professional and calm, and lets the food lead. It uses one typeface and one colour (MEON red) on ink and white. Layout comes from spacing and hairlines, not boxes. Files: `src/assets/css/site.css` (styles), `src/assets/js/site.js` (behaviour), `src/assets/js/music.js` (optional music), `scripts/build.mjs` (pages), `scripts/lib/art.mjs` (icons, flags, logo, mascots).

## Rules
- **One font:** Bricolage Grotesque (variable, with automatic optical size). It is used for headings and body text alike, set apart only by weight and size.
- **One colour:**
  - ink `#121010` on cream, with MEON red as the only accent
  - the page ground (Preston, ledger 458: "cream base plus gradients"; Design, 4 Nov 2026, option M1 "Broth"): `--cream #fbf3e6` with two warm glows sized to the first screen, set once as `--ground` on `body`, so another pick is one line. The glows scroll with the page (never `fixed` behind text), and with no gradient (forced colours, print) the page is the plain cream. `theme-color` and the manifest background are the cream too
  - `--paper #fff` is for plates only: cards, forms, the header and the "Follow us" band
  - `--brand #ec1b25` (the logo red) for the logo and red with only large type on it (the flavour ticker band): white on it is 4.4:1, enough for large text only (18.66 px bold and up); labels over a red band sit on a plate
  - `--red #c6121b` for text, buttons and any red block with normal-size white text (step card 1, its numbers, the mega-menu feature): white on it is 6.0:1, and it is 5.4:1 on cream, 4.9:1 on `--soft` and 4.5:1 at the brightest point of the glow (Design, 4 Nov 2026; it was `#d7141d` before the cream ground)
  - `--muted #67625d`: 6.0:1 on white, 5.5:1 on cream, 5.0:1 on `--soft`, 4.5:1 at the glow (it was `#6e6863`)
  - `--soft #f3e8d6` is the deeper cream band, used for alternating sections and the reel strip
- **No emojis anywhere.** Icons are a custom line set (`svgIcon()` in `art.mjs`, also published as `assets/img/icons.svg` for JavaScript). Flags are real artwork from flag-icons (MIT), copied to `assets/img/flags/`.
- **The logo is drawn, not typed, and always complete.** It is the full mixed logo: "meon" with み อี 哦 ㄴ underneath, never the word alone (Preston, 29 Oct 2026). `scripts/trace_logo.py` traces it from the official artwork into `scripts/lib/logo-mixed.json`, so no second font is loaded. `logoMark()` in `art.mjs` is the red square, used everywhere it appears as a badge: the header on every page (Preston, 29 Oct 2026: "square please", never the wide crop, and always animated), the home hero and About. In the square the glyphs are about 6% of its height, so in the header they read as small marks; the big hero square is where they read clearly. `logoLockup()` is the lettering alone in the current colour (footer, red on ink).
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
2. Header: white, always visible, with a hairline appearing on scroll. On the home page it floats see-through over the video hero, with white controls, until the hero scrolls away. The square logo on the left (its letters and glyphs rise in on every page load, then wave in turn), the nav centred (Home, Noodles mega menu, Countries, Pairings and sides, About), and **Sound**, **Search** (Ctrl/⌘ K or "/") and **Visit** on the right.
3. Home (video-first, 29 Oct 2026, same brand; Preston: videos and the scroll story at the start, the Instagram reels high up): a full-screen video hero, pinned while you scroll (one portrait clip on phones; on desktop one portrait clip too, the left one of the former three (Preston, 30 Oct 2026: "I only want the left one, not all 3"), shown whole at 9:16 on the left with the words beside it on ink), with the big square logo, "Your bowl, your rules.", the address and two actions (Browse the noodle wall, Get directions), plus a pause button for every background video. Straight after it, the real bowls (Preston via BOSS, 4 Nov 2026: bowl photos at the start): "Real bowls, real packets.", "5 from our wall." and a row of the 5 booth-shoot bowls as tall cards (see Real bowls below; the heading was "Straight out of the machine." until 4 Nov 2026, which nothing proved, since the shoot was on another set). Then the Instagram-style @meonnoodles reel cards (MEON's real logo as the avatar in Instagram's story ring), the four "Do it yourself" steps as stacked full-screen video cards (phones and tablets: the whole clip in a centred 9:16 frame at the top with the words below it, so the reels' own captions never run into the headline; desktop: a 9:16 frame beside the words) and the "Bring your crew." video wall (portrait tiles, plus wide 16:9 tiles that keep the landscape shop clips whole). Then the flavour banners, the noodle wall, Most picked, roulette, countries, heat check, Build your bowl, reviews, a closing "Find us in Northbridge." band over the street video, and last "Follow us." (Preston, 29 Oct 2026) with big Instagram and TikTok logo links to @meonnoodles (the two logos keep their own colours). No count-up facts and no stats on the home page.
   Pairings and sides, Noodles, Countries, About and Visit (29 Oct 2026, Preston: "update the other pages"): a video hero (`videoHero()`) with the header floating over it. Desktop: the words on ink on the left (breadcrumbs, a red eyebrow, the big title, a lead and actions; About also shows the big square logo) and two portrait clips side by side on the right; phones: the whole clip in a centred 9:16 rounded frame under the header, the words below. The reels have their own burned-in captions, so the words never sit on the footage. Not pinned: as the page scrolls on, the footage shrinks into a rounded card and the words lift away. Every other page (country pages, Privacy, the staff QR pages): page hero (`pageHero()`): breadcrumbs, then a small red eyebrow, then a large split-word title, a lead and actions. On the right is one visual or a peeking mascot (`peeker()`).
   Videos are "zoomed out" (Preston, 29 Oct 2026): each frame shows most or all of its clip (the desktop home clip, phone frames and the desktop inner-page columns show the whole 9:16 clip; the columns fit it on ink with `object-fit: contain`, Design, 31 Oct 2026, so no reel caption is cut at the column edge), and nothing is cropped tighter than that.
   Real bowls (Design, 4 Nov 2026, `bowlCard()`): a 3:4 card per booth-shoot photo, with a heat chip at the top left (the catalogue's spice number and word: No heat green, Medium yolk, Hot in `--red` with white), the country, the brand and name, and "See the packet", linking to the noodle's page. A shade runs from the middle of the card to 62 % black at the bottom, under the words. Desktop: 5 columns; phones: one swipe row with about 1.4 cards in view. The photos load lazy behind a reserved box, so the hero video stays the LCP and nothing shifts. Each photo is on a page once. Under the video heroes of Noodles, Countries (Japan, Malaysia, South Korea) and Pairings and sides (the tempura udon and the tom yum, both with crumbed prawns and egg), the same cards sit in a band (`bowlBand()`) at the home row's size, with "Real bowls, real packets." and the lead in the first columns. In the Noodles library the band sits under the sticky search and filters, so search stays first; it hides while a search or filter is on, so results come first (a filtered link, like the footer's "Soup noodles", is marked by the head script before the first paint, so nothing jumps), and on phones it is one row of 150 × 200 px cards without the note, so the first noodle cards still show above the fold. About and Visit keep their own photos. The spiciest list shows the tom yum (4, Hot) in its page hero's aside (`phBowl()`), loaded eager as that page's LCP.
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

Loading and winning moments follow the fleet's shared motion spec (Design, 4 Nov 2026: `agents/design/motion-system-2026-11-04/MOTION-SPEC.md` in the BOSS repo; Preston asked for animation while things load, numbers counting up and small celebrations). Its tokens are the `--m-*` custom properties at the top of `site.css`; the moments below use only those. Each one runs only while something real is loading or after it has arrived, never as a delay, and any click, key, wheel or touch ends a count-up or a celebration at its final state.

| Effect | Where |
| --- | --- |
| Background videos: muted loops that start by themselves on every device (Preston, 29 Oct 2026: "nobody has to press play"); for reduced motion they start paused and the hero shows a "Play videos" pill, one tap plays them all (BOSS, 30 Oct 2026); loaded only near the screen, playing only while on screen (only the active step card loads and plays its clip, and a reel or step card that leaves drops a file still downloading: Design, 31 Oct 2026); if the browser refuses to start them (iPhone Low Power Mode), the next tap starts the ones on screen; never loaded for Save-Data; no play badges. One play/pause for all of them: a 44 px button in the hero (inside the clip frame on inner pages), an icon while they play and a "Play videos" pill while paused; once it scrolls away or under the see-through header, the same button appears in the header, left of Sound, while a video is in view, and the hero's own button and scroll cue hide (never two at once, nothing on top of it, no transition). The choice lasts until the tab closes | Home (hero, step cards, video wall, closing band, reel cards), inner-page heroes, header |
| Pinned hero: the footage shrinks into a card and the words lift away as you scroll (once it starts moving the corners round off in one short transition; the faded words stop taking clicks); the desktop clip rises in on load. Screens shorter than 560px skip the pin | Home hero (`[data-scene]`, `--p`) |
| Stacked cards: each step card sticks, the next slides up over it; the covered card sinks back (scaled from its top edge) and dims, the arriving clip tilts in. Keyboard focus in a covered card scrolls it back into place. Screens shorter than 560px skip the stacking | Home steps (`[data-stack]`, `--p`/`--q`) |
| Video wall: four columns of clips and photos drift at different speeds through the section | Home "Bring your crew." (`[data-scene="through"]`) |
| Glyphs in the big logo rise in one after another, then take turns to hop (they never disappear) | Home hero logo |
| Auto-scrolling reel strip (Preston asked for it, 29 Oct 2026): one transform animation, paused on hover, focus, the pause button and off-screen; a still, swipeable row for reduce motion | Home (`#instagram`) |
| Masked word reveal | Page titles (`h1` with `data-split`), except noodle pages and the SEO lists |
| Image reveal: a cover panel slides away and the photo settles | `.img-reveal`: Visit photos. Not the noodle-page photo, which shows at once like its title, and not the bowl cards |
| Parallax using the `translate` property | `[data-parallax="0.05"]` (hero photos, flags) |
| Scroll-linked rows (move with your scroll, not on their own) | Noodle wall, flavour banners (`[data-hscroll]`) |
| Count-up: a number below the fold shows 0 and counts up once when it scrolls into view (700 ms under 100, 1000 ms under 10,000), with tabular numerals; one already on screen when the page opens just stays. Screen readers get the final value | `.facts` (library, spiciest, Buldak, country pages) |
| Skeleton shimmer: only if loading takes over 200 ms, blocks shaped like the real content hold its space and one highlight sweeps across; the content fades in when it lands. Reduced motion: still blocks | Reviews (home and every noodle page): "No reviews yet" shows only once the answer says there are none. Search, the first time it opens |
| Staggered arrival: after a filter change, the cards that just came into view (the first 8) fade and rise 8 px, 70 ms apart; cards already showing don't move, and a sort or the first load doesn't animate. Bowl rows: the first time a row scrolls into view, its cards fade and rise 16 px, 70 ms apart; a row on screen when the page opens just shows. Hovering a bowl card zooms its photo to 1.03 inside the card | Noodle library, bowl rows (home, Noodles, Countries, Pairings and sides) |
| Magnetic buttons | `[data-magnetic]` (mouse only) |
| Mascots: blink, eyes follow the cursor; wave and squish on hover; tap to talk | Page heroes, red band, timer, back-to-top |
| Header logo: still, letters there on load (every page, so no entrance and no idle wave: Design, 4 Nov 2026); the badge tilts on hover | Header, every page |
| Logo: letters and glyphs hop when you hover | About logo, footer |
| Celebration: 8 paper shapes in MEON's colours burst up to 48 px from the edge of what won and fade, while it pops to 1.04 and back (600 ms; once per win per visit). Reduced motion: a still red outline for 900 ms | Timer finished (the dial), roulette pick (the reel window), review posted (the new review) |
| Crossing flavour banners (red and ink) that move with your scroll | Home, after the reel cards (`.ticker`) |
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
- On the first visit to the home page a small "Turn the vibes on?" prompt offers it once the video hero has scrolled away, so it never covers the hero's buttons (browsers don't allow sound before a tap); on phones it drops in under the header, clear of the step cards' buttons. On phones it also stacks below the header (z-index 95: under the header's 100, over the tab bar's 90), so it slides in behind the header's controls and never covers the play/pause. The answer is remembered.
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
