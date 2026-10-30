# MEON design system (v3)

The site is professional and calm, and lets the food lead. It uses one typeface and one colour (MEON red) on ink and white. Layout comes from spacing and hairlines, not boxes. Files: `src/assets/css/site.css` (styles), `src/assets/js/site.js` (behaviour), `src/assets/js/music.js` (optional music), `scripts/build.mjs` (pages), `scripts/lib/art.mjs` (icons, flags, logo, mascots).

## Rules
- **One font:** Bricolage Grotesque (variable, with automatic optical size). It is used for headings and body text alike, set apart only by weight and size.
- **One colour:**
  - ink `#121010` on white, with MEON red as the only accent
  - `--brand #ec1b25` (the logo red) for big red blocks
  - `--red #d7141d` for text and buttons, because it meets contrast rules
  - `--soft #f6f4f1` is the only tint, used for alternating sections
- **No emojis anywhere.** Icons are a custom line set (`svgIcon()` in `art.mjs`, also published as `assets/img/icons.svg` for JavaScript). Flags are real artwork from flag-icons (MIT), copied to `assets/img/flags/`.
- **The logo is drawn, not typed, and always complete.** It is the full mixed logo: "meon" with み อี 哦 ㄴ underneath, never the word alone (Preston, 29 Oct 2026). `scripts/trace_logo.py` traces it from the official artwork into `scripts/lib/logo-mixed.json`, so no second font is loaded. `logoMark()` in `art.mjs` is the red square, used everywhere it appears as a badge: the header on every page (Preston, 29 Oct 2026: "square please", never the wide crop, and always animated), the home hero and About. In the square the glyphs are about 6% of its height, so in the header they read as small marks; the big hero square is where they read clearly. `logoLockup()` is the lettering alone in the current colour (footer, red on ink).
- **No boxes:**
  - cards are a photo plus text
  - sections are separated by hairlines (`--line`) and space
  - nothing is a card inside a card
- **Copy is specific and plain.** It uses full stops, few exclamation marks, no "slurp" or "noodle heaven", and no em dash in headings.
- **First person** (Preston, 29 Oct 2026): the shop speaks as "we", "us" and "our" ("Come visit us", "our crew is here if you need a hand"). Quotes of MEON's own Instagram captions keep their wording.
- **Filter and diet wording** (Preston, 29 Oct 2026): spice filters are just "No heat", "Medium" and "Hot" (no "exactly" options); the diet label is "Vegetarian" (never "vegetarian-friendly"), and there is no vegan filter or label. A product's own name keeps its wording.

## Page anatomy
1. Announcement line (every page except home): "Cook-it-yourself instant noodles at Shop 8, 45 Francis Street, Northbridge." with a Get directions link.
2. Header: white, always visible, with a hairline appearing on scroll. On the home page it floats see-through over the video hero, with white controls, until the hero scrolls away. The square logo on the left (its letters and glyphs rise in on every page load, then wave in turn), the nav centred (Home, Noodles mega menu, Countries, Pairings and sides, About), and **Sound**, **Search** (Ctrl/⌘ K or "/") and **Visit** on the right.
3. Home (video-first, 29 Oct 2026, same brand; Preston: videos and the scroll story at the start, the Instagram reels high up): a full-screen video hero, pinned while you scroll (one portrait clip on phones, three portrait clips side by side on desktop), with the big square logo, "Your bowl, your rules.", the address and two actions (Browse the noodle wall, Get directions), plus a pause button for every background video. Straight after it, the Instagram-style @meonnoodles reel cards, then the four "Do it yourself" steps as stacked full-screen video cards (phones and tablets: the whole clip in a centred 9:16 frame at the top with the words below it, so the reels' own captions never run into the headline; desktop: a 9:16 frame beside the words) and the "Bring your crew." video wall (portrait tiles, plus wide 16:9 tiles that keep the landscape shop clips whole). Then the flavour banners, the five booth-shoot bowls ("Straight out of the machine."), the noodle wall, Most picked, roulette, countries, heat check, Build your bowl, reviews, a closing "Find us in Northbridge." band over the street video, and last "Follow us." (Preston, 29 Oct 2026) with big Instagram and TikTok logo links to @meonnoodles (the two logos keep their own colours). No count-up facts and no stats on the home page.
   Pairings and sides, Noodles, Countries, About and Visit (29 Oct 2026, Preston: "update the other pages"): a video hero (`videoHero()`) with the header floating over it. Desktop: the words on ink on the left (breadcrumbs, a red eyebrow, the big title, a lead and actions; About also shows the big square logo) and two portrait clips side by side on the right; phones: the whole clip in a centred 9:16 rounded frame under the header, the words below. The reels have their own burned-in captions, so the words never sit on the footage. Not pinned: as the page scrolls on, the footage shrinks into a rounded card and the words lift away. Every other page (country pages, Privacy, the staff QR pages): page hero (`pageHero()`): breadcrumbs, then a small red eyebrow, then a large split-word title, a lead and actions. On the right is one visual or a peeking mascot (`peeker()`).
   Videos are "zoomed out" (Preston, 29 Oct 2026): each frame shows most or all of its clip (desktop hero columns at least 75% of the clip's width, inner-page columns at least 70%, phone frames the whole 9:16 clip), and nothing is cropped tighter than that.
4. Content sections.
5. Reviews (`reviewsBlock()`): a star summary, a form and the latest reviews. It appears on the home page and on every noodle page.
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
All motion uses transform and opacity only, runs from one scroll loop, pauses when off-screen and switches off for reduced motion. The one exception is the background videos: they keep playing (Preston wants them to start by themselves on every phone), and the pause button stops them all.

| Effect | Where |
| --- | --- |
| Background videos: muted loops that start by themselves on every device, reduced motion included (Preston, 29 Oct 2026: "nobody has to press play"), loaded only near the screen, playing only while on screen (a covered step card pauses); if the browser refuses to start them (iPhone Low Power Mode), the next tap starts the ones on screen; never loaded for Save-Data; no play badges; one pause button for all of them, remembered until the tab closes | Home (hero, step cards, video wall, closing band, reel cards), inner-page heroes |
| Pinned hero: the footage shrinks into a card and the words lift away as you scroll (once it starts moving the corners round off in one short transition; the faded words stop taking clicks); the three desktop columns drift at different speeds and rise in on load. Screens shorter than 560px skip the pin | Home hero (`[data-scene]`, `--p`) |
| Stacked cards: each step card sticks, the next slides up over it; the covered card sinks back (scaled from its top edge) and dims, the arriving clip tilts in. Keyboard focus in a covered card scrolls it back into place. Screens shorter than 560px skip the stacking | Home steps (`[data-stack]`, `--p`/`--q`) |
| Video wall: four columns of clips and photos drift at different speeds through the section | Home "Bring your crew." (`[data-scene="through"]`) |
| Glyphs in the big logo rise in one after another, then take turns to hop (they never disappear) | Home hero logo |
| Auto-scrolling reel strip (Preston asked for it, 29 Oct 2026): one transform animation, paused on hover, focus, the pause button and off-screen; a still, swipeable row for reduce motion | Home (`#instagram`) |
| Masked word reveal | Every heading with `data-split` |
| Fade and rise | `.reveal` elements, staggered with `--rd` |
| Image reveal: a cover panel slides away and the photo settles | `.img-reveal` |
| Parallax using the `translate` property | `[data-parallax="0.05"]` (hero photos, flags) |
| Scroll-linked rows (move with your scroll, not on their own) | Noodle wall, flavour banners (`[data-hscroll]`) |
| Count-up numbers | `.facts` (country pages) |
| Magnetic buttons | `[data-magnetic]` (mouse only) |
| Mascots: blink, eyes follow the cursor; wave and squish on hover; tap to talk | Page heroes, red band, timer, back-to-top |
| Header logo: letters and glyphs rise in on every page load, then wave one after another every few seconds (pauses with the video pause button; still for reduce motion) | Header, every page |
| Logo: letters and glyphs hop when you hover | About logo, footer |
| Paper confetti | Roulette win, timer finished |
| Crossing flavour banners (red and ink) that move with your scroll | Home, after the reel cards (`.ticker`) |
| Build your bowl: pairings and sides drop into the bowl with a bounce, the bowl wobbles | Home (`#build`) |
| Heat check: chilli slider warms the section, the mascot sweats, matching noodles appear | Home (`#spice`) |
| Illustrated packets, coloured by flavour, for noodles without a photo | Cards, noodle pages |

Speed rules (tested with the CPU slowed 4x, like an average phone):
- Nothing animates forever except cheap things (blinks, floats, the header logo's transform-only wave). Waves, squishes and the other logo hops only play on hover or tap.
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
- On the first visit to the home page a small "Turn the vibes on?" prompt offers it once the video hero has scrolled away, so it never covers the hero's buttons (browsers don't allow sound before a tap); on phones it drops in under the header, clear of the step cards' buttons. The answer is remembered.
- The **Sound** button starts it, and the choice is remembered. Browsers block autoplay, so a returning visitor's music resumes on their first tap.
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
