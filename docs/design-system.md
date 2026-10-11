# MEON design system (v3)

The site is professional and calm, and lets the food lead. It uses one typeface and one colour (MEON red) on ink and white. Layout comes from spacing and hairlines, not boxes. Files: `src/assets/css/site.css` (styles), `src/assets/js/site.js` (behaviour), `src/assets/js/music.js` (optional music), `scripts/build.mjs` (pages), `scripts/lib/art.mjs` (icons, flags, wordmark, mascots).

## Rules
- **One font:** Bricolage Grotesque (variable, with automatic optical size). It is used for headings and body text alike, set apart only by weight and size.
- **One colour:**
  - ink `#121010` on white, with MEON red as the only accent
  - `--brand #ec1b25` (the logo red) for big red blocks
  - `--red #d7141d` for text and buttons, because it meets contrast rules
  - `--soft #f6f4f1` is the only tint, used for alternating sections
- **No emojis anywhere.** Icons are a custom line set (`svgIcon()` in `art.mjs`, also published as `assets/img/icons.svg` for JavaScript). Flags are real artwork from flag-icons (MIT), copied to `assets/img/flags/`.
- **The wordmark is drawn, not typed.** "meon" is built from the logo's own letter shapes (Quicksand outlines turned into SVG paths), so no second font is loaded.
- **No boxes:**
  - cards are a photo plus text
  - sections are separated by hairlines (`--line`) and space
  - nothing is a card inside a card
- **Copy is specific and plain.** It uses full stops, few exclamation marks, no "slurp" or "noodle heaven", and no em dash in headings.

## Page anatomy
1. Announcement line: "Every packet on our wall has a QR code…"
2. Header: white, always visible, with a hairline appearing on scroll. Logo on the left, the nav centred (Noodles mega menu, Countries, Toppings, MEON Card, About), and **Sound**, **Search** (Ctrl/⌘ K or "/") and **Visit** on the right.
3. Home: the centred launch hero. It has a pill line, the giant "Slurp the world." headline and a "Tonight I'm craving…" typewriter, then actions and checks, with the mascot crew around the headline (never over the photos). Below that sit a photo stage with the red logo tile and the count-up facts.
   Other pages: page hero (`pageHero()`): breadcrumbs, then a small red eyebrow, then a large split-word title, a lead and actions. On the right is one visual or a peeking mascot (`peeker()`).
4. Content sections.
5. Reviews (`reviewsBlock()`): a star summary, a form and the latest reviews. It appears on the home page and on every noodle page.
6. Red closing band (`ctaBand()`) with big type and three mascots.
7. Ink footer with a giant red wordmark that rises in letter by letter.
8. Phones: a bottom tab bar (Home, Noodles, Search, Countries, Visit).

## Noodle page (QR landing)
The page is built for someone standing at the shelf with their phone. The order is:
1. Photo (full width on phones)
2. "Scanned from the shelf" line, shown only with `?src=qr`
3. Country and brand, the name, and a one-line flavour summary
4. **Machine setting (big red code) and the cook timer**, side by side between two rules. A mascot appears while the timer runs and says "Noodles ready" when it ends; the phone also beeps and vibrates.
5. Facts row: spice, style, diet, packet
6. About, then how to cook it (numbered), then toppings that go well with it (round photos)
7. Share, previous and next
8. Reviews of this noodle, then similar noodles

## Motion (smooth by design)
All motion uses transform and opacity only, runs from one scroll loop, pauses when off-screen and switches off for reduced motion.

| Effect | Where |
| --- | --- |
| Typewriter ("Tonight I'm craving…") | Home hero |
| Masked word reveal | Every heading with `data-split` |
| Fade and rise | `.reveal` elements, staggered with `--rd` |
| Image reveal: a cover panel slides away and the photo settles | `.img-reveal` |
| Parallax using the `translate` property | `[data-parallax="0.05"]` (hero photos, flags, member card, plates) |
| Scroll-linked rows (move with your scroll, not on their own) | Noodle wall, topping names band (`[data-hscroll]`) |
| Sticky heading with a progress line | How MEON works |
| Count-up numbers | `.facts` |
| Magnetic buttons | `[data-magnetic]` (mouse only) |
| Mascots: blink, eyes follow the cursor, gentle drift; wave and squish on hover; tap to talk | Home hero, page heroes, red band, timer, back-to-top |
| Moving logo: script line cycles (Japanese, Korean, Chinese, Thai); letters hop when you hover | Header mark, logo tiles |
| Paper confetti | Roulette win, timer finished |
| Throwable mascots: drag, throw, bounce off the edges; tap to talk | Home hero crew |
| Crossing flavour banners (red and ink) that move with your scroll | Under the home hero (`.ticker`) |
| Build your bowl: toppings drop into the bowl with a bounce, the bowl wobbles | Home (`#build`) |
| Heat check: chilli slider warms the section, the mascot sweats, matching noodles appear | Home (`#spice`) |
| Illustrated packets, coloured by flavour, for noodles without a photo | Cards, noodle pages |

Speed rules (tested with the CPU slowed 4x, like an average phone):
- Nothing animates forever except cheap things (blinks, floats, the glyph cycle). Waves, squishes and logo hops only play on hover or tap.
- Nothing reacts to every mouse movement except the mascots' eyes.
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
- auto-scrolling marquees (the flavour banners only move when you scroll)

These were the main causes of lag, and some are common "AI website" tells.

## Sound
`music.js` plays **MEON FM** (`assets/audio/meon-fm.mp3`), an original 103-second seamless loop in the same style as the promo videos: electric piano, marimba melody, bass and soft drums. If the file can't load it falls back to a lo-fi loop generated live with the Web Audio API. No licensing issues.
- On the first visit to the home page a small "Turn the vibes on?" prompt offers it (browsers don't allow sound before a tap). The answer is remembered.
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
