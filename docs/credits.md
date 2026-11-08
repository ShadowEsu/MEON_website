# Image credits and licences

Every image on the site that MEON didn't make itself, with where it came from and its licence. Checked on 27 Oct 2026.

## MEON's own

- **Noodle photos** (`src/assets/img/noodles/`): Steven's MEON photo shoot, commissioned by MEON, except the packet photos listed under "Noodle photos from free libraries" below. **Packet check, 31 Oct 2026:** each photo shows the packet next to the bowl, so a photo is only used on the noodle whose packet it shows. The photo and 3 extras filed as MyKuali Penang White Curry show an Ibumie Penang White Curry Mee packet, so they now live on that noodle (`ibumie-penang-white-curry-mee*.webp`). The Drive folder "Mama Shrimp Tomyum Flavour" holds the Wai Wai Tom Yum Shrimp bowl (the Wai Wai packet is in frame), so the home page's tom yum close-up (`shoot/tomyum-egg-prawn-*`) now links to Wai Wai Quick Zabb Tom Yum Shrimp. The photos this check took off the site were deleted from the repo on 1 Nov 2026 (they stay in git history): `samyang-samyang-ramen*.webp` (the packet is Samyang Bulgogi), `nissin-ramen-kyushu-black-garlic.webp` (the packet is Demae Iccho Black Garlic Oil Tonkotsu) and `more/mama-tom-yum-shrimp-1..4` (the Wai Wai bowl, the same shoot as that noodle's own photos).
- **Booth-shoot bowl photos** (`src/assets/img/shoot/`, used on the home page, Visit page and as the share image): MEON's own shoot on a black background (MEON's Drive, one folder per noodle), resized from the 4K originals. **Source check, 4 Nov 2026:** all 7 originals are camera files (Fujifilm X-T5, XF18-55mm lens, edited in Lightroom), shot on 6 and 7 Jan 2026, each folder with a frame of the bowl next to its own packet. They have no GPS, and the set (black tufted booth, round wooden table) isn't MEON's shop as its store-tour video shows it, so the home page doesn't say they were shot in the shop. `tonkotsu-top` and `tonkotsu-nori-close` are the same bowl, so the home grid uses only one of them.
- **Background videos** (`src/assets/video/`): MEON's own footage. The shop clips are Preston's; the step, wall and `ig-*.mp4` clips also use MEON's own @meonnoodles reels. Reels by other creators (for example the @little_miss_fussy_eats collab) are not re-hosted.
- **Topping photos on the MEON lid** (`toppings/meatballs.webp`, `toppings/spring-onion.webp`, `photos/topping-*.webp`): MEON's own topping shoot (MEON's Drive folder "Toppings pics"). **Not used since 31 Oct 2026:** the owner doesn't want photos on the black background, so those pairings showed line icons instead (`data/toppings.json`). The files were deleted from the repo on 1 Nov 2026 so they're no longer served; they stay in git history.
- **Pairing and side photos by the owner** (`src/assets/img/toppings/`, every file not in the tables below): MEON's owner photographed what the shop serves and sells on 30 Oct 2026 and sent the 47 files to Preston on 4 Nov 2026 through Google Drive (copies sorted into Preston's Drive folder "MEON photos: pairings, sides and drinks"; the originals stay in the owner's Drive). The photos are centred 480 × 480 square crops, saved without camera data (no EXIF; the originals have no location). Names follow the owner's file names: "Amy's Chicken" is the chicken wings, "Narutomaki" the fishcake, "Chesse Slice" the cheese slice. **Not used**, after a check of every photo for logos, packaging, watermarks and stock marks (4 Nov 2026): his 15 drink photos from that shoot, because a can, bottle or pouch carries another company's packaging and logo (Preston via BOSS), so those files stayed off the site; and "Seaweed.jpg", a branded packet of seasoned laver, so seasoned seaweed keeps its line icon. Items that are on the page because the owner's photos show the shop has them: fish balls, bean sprouts, Gabo nuggets, chicken sausage, mini frankfurts, sliced, penguin, Pandy and Thai fish cakes, fish balls with roe, lobster balls, crab nuggets, prawn wontons, cheese tofu, bok choy, spinach, quail eggs, cheese slice and kimchi, plus the drink Milkis Peach. He also photographed Red Bull and Milkis banana, melon and original, which aren't in the till: they stay off the page until he confirms they're on sale (Security, 4 Nov 2026). The owner's photos replaced the Commons beef, crab stick and tofu photos on 4 Nov 2026.
- **Logo** (`logo-*.png`, favicons): MEON's own.
- **Chilli in the spice meter** (`src/assets/img/chilli.svg`), mascots, icons and illustrated packets: drawn in code for this site (`scripts/lib/art.mjs`). The TikTok glyph in the "Follow us." links is the [Simple Icons](https://simpleicons.org/?q=tiktok) TikTok path (CC0); it links only to MEON's own TikTok.

## Topping photos from free libraries

All files are in `src/assets/img/toppings/`, cropped to 480 × 480. The CC0 and public-domain rows need no credit; it's recorded here so the source can be proven. `seasoned-seaweed.webp` is CC BY-SA, so its card names the photographer and the licence.

| File | Source | Author | Licence |
|---|---|---|---|
| `spring-onion.webp` | [Wikimedia Commons: Beijing scallions.jpg](https://commons.wikimedia.org/wiki/File:Beijing_scallions.jpg) | Fumikas Sagisavas | CC0 |
| `shiitake.webp` | [Wikimedia Commons: Fresh shiitake mushrooms.jpg](https://commons.wikimedia.org/wiki/File:Fresh_shiitake_mushrooms.jpg) | Fumikas Sagisavas | CC0 |
| `seaweed.webp` | [Wikimedia Commons: Dried wakame.jpg](https://commons.wikimedia.org/wiki/File:Dried_wakame.jpg) | Fumikas Sagisavas | CC0 |
| `seasoned-seaweed.webp` | [Wikimedia Commons: Nori.jpg](https://commons.wikimedia.org/wiki/File:Nori.jpg) | Alice Wiegand (Lyzzy), own work, April 2006 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Credit on the Seasoned seaweed card. The smaller cut sheets are the seasoned ones. Cropped square from the left of the 1024 × 812 original, 7 Nov 2026. |
| `onion.webp` | [Wikimedia Commons: Alliumcepa.JPG](https://commons.wikimedia.org/wiki/File:Alliumcepa.JPG) | Михаил Киречко | Public domain (released by the author) |
| `mushrooms.webp` | [Wikimedia Commons: Agaricus bisporus (1).jpg](https://commons.wikimedia.org/wiki/File:Agaricus_bisporus_(1).jpg) | Fumikas Sagisavas | CC0 |
| `shrimp-katsu.webp` | [Wikimedia Commons: Ebi Fry 003.jpg](https://commons.wikimedia.org/wiki/File:Ebi_Fry_003.jpg) | Ocdp | CC0 |
| `corn.webp` | [Wikimedia Commons: Corn on the cob (sweet corn).jpg](https://commons.wikimedia.org/wiki/File:Corn_on_the_cob_(sweet_corn).jpg) | Nutrition, Food Safety & Health (via Flickr, licence review passed) | CC0 |
| `extra-noodles.webp` | [Wikimedia Commons: Lucky Me instant pancit canton noodles (Philippines) 02.jpg](https://commons.wikimedia.org/wiki/File:Lucky_Me_instant_pancit_canton_noodles_(Philippines)_02.jpg), cropped to the noodle block | Obsidian Soul | CC0 |
| `egg.webp` | [Wikimedia Commons: Three chicken eggs.jpg](https://commons.wikimedia.org/wiki/File:Three_chicken_eggs.jpg), from [Flickr 24327051445](https://www.flickr.com/photos/137643065@N06/24327051445), cropped square | www.Pixel.la Free Stock Photos (Flickr 137643065@N06) | CC0 (Flickr licence id 9, checked on the page 30 Oct 2026; Commons licence review passed 16 Sep 2016) |

Topping photos are MEON's own, CC0, public domain, or the one credited CC BY-SA sheet above. The earlier unlicensed Wix-era photos were replaced with licensed Commons pictures, and the owner's own photos take precedence whenever available. This table lists only the library assets currently in use; remove a row when its photo is withdrawn. The licence captures are retained in MEON's private records.

Keep the owner's original pairing and side photos. Do not add substitute food photos to fill gaps without a new owner instruction. Drink photos are the separately authorized exception, used on the Pairings and sides menu and the home gallery under the rules below.

## Noodle photos from free libraries

Packet photos for noodles that the MEON shoot hasn't covered yet (Preston, 29 Oct 2026: "completely free, no copyright"). Only public-domain or CC0 photos are used: no CC BY or BY-SA, no "free to use" sites with their own terms, and no recognisable people. Each one was checked against the packet's brand, product and flavour. Files are 900 × 900 in `src/assets/img/noodles/` with a 400 × 400 copy in `sm/`; replace them with the shoot photo when that noodle is photographed.

| File | Source | Author | Licence | Edits |
|---|---|---|---|---|
| `indomie-soto-mie.webp` | [Flickr: IMG_20160623_174010](https://www.flickr.com/photos/138690323@N08/27579257520) ([archived 26 Feb 2025](https://web.archive.org/web/20250226035308/https://www.flickr.com/photos/138690323@N08/27579257520)) | Ricky Maulana (Flickr: aries5485), his own photo | [Public Domain Mark 1.0](https://creativecommons.org/publicdomain/mark/1.0/) (Flickr "Public domain", licence id 10), checked on the page 30 Oct 2026 and in the 2025 archive copy | Cropped to a square around the packet (from 3264 × 2448) and resized |

The packet is Indonesia's domestic Indomie Soto Mie design from about 2016; the one on our wall may look slightly different.

Flickr owners can change a licence later, so each row records the date it was checked and an archived copy of the page. A capture of the Flickr page as checked is kept in MEON's private records.

## Drink photos

The home gallery's Drinks tab and the Pairings and sides drinks menu use the same photos. On 7 Nov 2026 the owner sent pack shots and asked for them in place of the library photos (glasses of coffee, cola, tea, water and ice, plus a Commons crop of a Coca-Cola Zero can and a brewed chrysanthemum bowl). Those library files were deleted from the repo the same day. Git history still has them, with the licence notes that used to be in this section.

Each current file is the product it is filed under. Files are 640 × 640 in `src/assets/img/drinks/`, with a 320 × 320 `-t320` copy, fitted onto a white square with the whole pack in frame and no EXIF. `data/drink-photos.json` records the SHA-256 of every shipped file.

| File | Product |
|---|---|
| `100-plus.webp` | 100 Plus, slim can |
| `aussie-natural-water.webp` | Aussie Natural Water. The photo is a 20 × 600 ml pack labelled Aussie Natural Spring Water. Australian Natural Spring Water is a different product and has no photo. |
| `caffe-bene-americano.webp` | Caffe Bene Americano, 190 mL pouch |
| `caffe-bene-black.webp` | Caffe Bene Black Iced Drink. The pouch is labelled Black, 190 mL. The owner sent this photo twice; one copy is used. |
| `caffe-bene-caramel-macchiato.webp` | Caffe Bene Caramel Macchiato, 190 mL pouch |
| `caffe-bene-hazelnut.webp` | Caffe Bene Hazelnut, 190 mL pouch |
| `caffe-bene-vanilla-americano.webp` | Caffe Bene Vanilla Americano, 190 mL pouch |
| `coca-cola-classic.webp` | Coca-Cola Classic, 375 mL can |
| `coke-zero-sugar.webp` | Coca-Cola Zero Sugar, 375 mL can |
| `milkis-peach.webp` | Milkis Peach, 250 mL can |
| `sosro-teh-botol.webp` | Sosro Teh Botol Original, 250 ml carton. The owner also sent a three quarter view of the same carton; the front is the one on the page. |
| `yeos-chrysanthemum-tea.webp` | Yeo's Chrysanthemum Tea, 300 mL can |
| `ice.webp` | Ice in a cup: ice cubes in a clear plastic cup |

## Code libraries that ship artwork

- **Country flags** (`assets/img/flags/*.svg`): [flag-icons](https://github.com/lipis/flag-icons), MIT licence. The build copies its licence to `assets/img/flags/LICENSE.txt` next to the flags.

## Font

- **Bricolage Grotesque** (`src/assets/fonts/*.woff2`): © 2022 The Bricolage Grotesque Project Authors (<https://github.com/ateliertriay/bricolage>), SIL Open Font License 1.1. The licence text sits next to the files as `src/assets/fonts/OFL.txt`. The files are the Google Fonts v9 subsets (latin, latin-ext, vietnamese). They are served from this site, so visitors' browsers don't contact Google.
