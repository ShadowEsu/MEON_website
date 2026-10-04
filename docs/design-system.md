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
2. Header: white, with a hairline appearing on scroll. It hides as you scroll down and returns as you scroll up. It holds the logo mark, the nav with the Noodles mega menu, **Sound**, **Search** (Ctrl/⌘ K or "/") and **Visit**.
3. Page hero (`pageHero()`): breadcrumbs, then a small red eyebrow, then a large split-word title, a lead and actions. On the right is one visual or a peeking mascot (`peeker()`).
4. Content sections.
5. Red closing band (`ctaBand()`) with big type and three mascots.
6. Ink footer with a giant red wordmark that rises in letter by letter.
7. Phones: a bottom tab bar (Home, Noodles, Search, Countries, Visit).

## Noodle page (QR landing)
The page is built for someone standing at the shelf with their phone. The order is:
1. Photo (full width on phones)
2. "Scanned from the shelf" line, shown only with `?src=qr`
3. Country and brand, the name, and a one-line flavour summary
4. **Machine setting (big red code) and the cook timer**, side by side between two rules. A mascot appears while the timer runs and says "Noodles ready" when it ends; the phone also beeps and vibrates.
5. Facts row: spice, style, diet, packet
6. About, then how to cook it (numbered), then toppings that go well with it (round photos)
7. Share, previous and next, and similar noodles

## Motion (smooth by design)
All motion uses transform and opacity only, runs from one scroll loop, pauses when off-screen and switches off for reduced motion.

| Effect | Where |
| --- | --- |
| Lenis smooth scrolling | Whole site (not used with reduced motion) |
| Intro: red panel, wordmark letters rise, panel lifts away | Home, first visit per session only |
| Masked word reveal | Every heading with `data-split` |
| Fade and rise | `.reveal` elements, staggered with `--rd` |
| Image reveal: a cover panel slides away and the photo settles | `.img-reveal` |
| Parallax using the `translate` property | `[data-parallax="0.05"]` (hero photos, flags, member card, plates) |
| Scroll-linked rows (move with your scroll, not on their own) | Noodle wall, topping names band (`[data-hscroll]`) |
| Sticky heading with a progress line | How MEON works |
| Count-up numbers | `.facts` |
| Magnetic buttons | `[data-magnetic]` (mouse only) |
| Mascots: blink, wave, eyes follow the cursor, gentle drift, tap to talk | Home hero, page heroes, red band, timer, back-to-top |
| Moving logo: letters hop, script line cycles (Japanese, Korean, Chinese, Thai) | Header mark, logo tiles |
| Paper confetti | Roulette win, timer finished |

Removed on purpose:
- backdrop blur
- animated blur and drop-shadow filters
- card tilt
- typewriter caret
- auto-scrolling marquees

These were the main causes of lag, and some are common "AI website" tells.

## Sound
`music.js` is an original lo-fi loop generated live with the Web Audio API: electric piano chords (Fmaj9, Em7, Dm9, Cmaj7), bass, brushed drums and vinyl crackle. Nothing is downloaded and there are no licensing issues.
- It is off by default.
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
