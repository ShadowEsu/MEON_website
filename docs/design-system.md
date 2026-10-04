# MEON design system

The site is light-mode only. It is built from a small set of shared pieces, so every page looks and moves the same way. Everything lives in `src/assets/css/site.css` (styles), `src/assets/js/site.js` (behaviour), `scripts/build.mjs` (page templates) and `scripts/lib/art.mjs` (illustrations).

## Brand tokens

| Token | Value | Use |
| --- | --- | --- |
| `--red` | `#ec1b25` | MEON red: logo, primary buttons, highlights |
| `--bg` / `--bg-2` | `#fffaf3` / `#fff2e2` | Warm paper background, alternate sections |
| `--ink` | `#17110f` | Text, dark pills, footer |
| `--yellow` | `#ffc83d` | Underline highlights, glows |
| `--sky`, `--pink`, `--green` | | Mascots, tints, diet badges |
| `--font-display` | Bricolage Grotesque | Headlines |
| `--font-serif` | Instrument Serif (italic) | The red accent word in every headline |
| `--font-body` | DM Sans | Body copy |
| Quicksand | | The `meon` wordmark inside the logo |

Headlines follow one pattern: a bold display phrase plus one italic serif word in red, e.g. `Toppings <span class="serif red">& sides</span>`.

## Page anatomy (every page)

1. **Announcement bar**: a one-line tip in dark ink.
2. **Floating glass header**: a pill-shaped bar with the moving logo, main nav and the **Noodles mega menu**, a search button (<kbd>Ctrl/⌘ K</kbd> or <kbd>/</kbd>) and *Visit us*. The bar gets more solid when you scroll.
3. **Page hero** (`pageHero()` in `build.mjs`), centred:
   - breadcrumbs, then a badge pill (dark tag plus label)
   - a split-word headline (`data-split`), a lead paragraph and action buttons
   - an optional `after` slot (stats, plates, a card or the logo)
   - a faint grid background, a radial tint (`--tint`, e.g. the country's colour) and four floating **mini mascots** (`crewMini(seed)`)
4. **Content sections**: white/paper `section`, `section--alt` (warm) and numbered eyebrows (`01`, `02`…) on the home page.
5. **CTA band** (`ctaBand()`): a closing card with "Browse the noodle wall" and "Visit info" plus three bouncing mascots.
6. **Footer**, **scroll progress bar** and **back-to-top mascot**.
7. On phones: the **bottom tab bar** (Home · Noodles · Search · Countries · Visit). It is always visible and its centre button opens search.

Noodle detail pages use `detail-hero` (the same background and mascots) with a two-column layout. The left column is a sticky photo. The right column holds the machine setting, spec grid, cook timer, steps, toppings, and prev/next links.

## Navigation

| Where | What |
| --- | --- |
| Desktop header | Noodles (hover/focus opens the mega menu) · Countries · Toppings · MEON Card · About · Search · Visit us |
| Mega menu | Quick filters (all, soup, dry, veg, vegan, spicy 3+, no heat, photos first), 12 countries with counts, and the "Can't decide?" roulette card |
| Mobile | Hamburger drawer (the mega menu becomes an expandable section), plus the always-on bottom tab bar |
| Everywhere | Breadcrumbs, search overlay (noodles, countries, toppings, pages), and shareable filter URLs like `/noodles/?country=jp&type=Soup` |
| Between pages | Cross-document view transitions (a soft fade/slide; the header and tab bar stay put) |

## Motion catalogue

All motion is turned off or reduced when the visitor has *prefers-reduced-motion* set.

| Effect | Where | How |
| --- | --- | --- |
| Moving logo | Header (`logoMini`), About/home (`logoAnimated`) | Letters hop; the subline cycles through Japanese, Korean, Chinese and Thai scripts |
| Mascot crew | Home hero, every page hero, CTA band | Floating, blinking, waving; pupils follow the cursor; tap a mascot to make it hop and talk; drifts with the cursor (parallax) |
| Split-word headline | Every `h1[data-split]` | Words rise in with a stagger (`word-rise`) |
| Reveal on scroll | `.reveal` (`--rd` sets the delay) | Fade and slide up once the element is in view |
| Count-up | `[data-count]` (home stats, country mini-stats) | Numbers count up when they come into view |
| Card tilt + spotlight | Noodle cards, country tiles, steps, toppings, info cards, QR cards | 3D tilt toward the cursor with a soft light (mouse/pen only) |
| Highlighter underline | Red serif words in section headings | Yellow underline sweeps in |
| Floating bits | Flag (country), plates (toppings), member card swing, logo (about) | CSS keyframes |
| Wall marquee, typewriter, confetti, roulette, cook timer | Home and noodle pages | `site.js` |

## Adding a new page

In `scripts/build.mjs`:

```js
addPage("new-page/", layout({
  urlPath: "new-page/",
  title: "New page",
  description: "One-sentence summary for search engines.",
  body: (r) => `
${pageHero(r, { crumbs: [["New page"]], badge: "…", tag: "NEW", title: `Title <span class="serif red">word</span>`, lead: "…", seed: 4 })}
<section class="section"><div class="wrap">…</div></section>
${ctaBand(r)}`,
}));
```

`r("path/")` makes a link relative to the current page (Home is added to the breadcrumbs automatically). To put it in the main nav, add it to `NAV` and pass `active: "new-page/"`.

Run `npm run build && npm run check`, then the smoke test and sweep (see the README).
