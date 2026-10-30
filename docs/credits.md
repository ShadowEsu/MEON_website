# Image credits and licences

Every image on the site that MEON didn't make itself, with where it came from and its licence. Checked on 27 Oct 2026.

## MEON's own

- **Noodle photos** (`src/assets/img/noodles/`): Steven's MEON photo shoot, commissioned by MEON, except the packet photos listed under "Noodle photos from free libraries" below.
- **Booth-shoot bowl photos** (`src/assets/img/shoot/`, used on the home page, Visit page and as the share image): MEON's own shoot on a black background (MEON's Drive, one folder per noodle), resized from the 4K originals.
- **Background videos** (`src/assets/video/`): MEON's own footage. The shop clips are Preston's; the step, wall and `ig-*.mp4` clips also use MEON's own @meonnoodles reels. Reels by other creators (for example the @little_miss_fussy_eats collab) are not re-hosted.
- **Topping photos on the MEON lid** (`toppings/meatballs.webp`, `toppings/spring-onion.webp`, `photos/topping-*.webp`): MEON's own topping shoot (MEON's Drive folder "Toppings pics").
- **Logo** (`logo-*.png`, favicons): MEON's own.
- **Chilli in the spice meter** (`src/assets/img/chilli.svg`), mascots, icons and illustrated packets: drawn in code for this site (`scripts/lib/art.mjs`). The TikTok glyph in the "Follow us." links is the [Simple Icons](https://simpleicons.org/?q=tiktok) TikTok path (CC0); it links only to MEON's own TikTok.

## Topping photos from free libraries

All files are in `src/assets/img/toppings/`, cropped to 480 × 480. None of these licences require a credit; it's recorded here so the source can be proven.

| File | Source | Author | Licence |
|---|---|---|---|
| `beef.webp` | [Wikimedia Commons: QuanXi hotpot 肥牛 beef, R12S 05](https://commons.wikimedia.org/wiki/File:GD_%E5%BB%A3%E6%9D%B1_Guangdong_%E4%B8%AD%E5%B1%B1_Zhongshan_%E6%9D%B1%E5%8D%80_Dong_District_%E9%95%B7%E6%B1%9F%E8%B7%AF_ChangJiang_Road_%E5%AD%AB%E6%96%87%E6%9D%B1%E8%B7%AF_SunWen_East_Road_%E5%AF%8C%E9%80%B8%E5%9F%8E_Top_Park_Mall_%E5%85%A8%E5%B8%8C%E9%AE%AE%E8%A0%94%E8%87%AA%E5%8A%A9%E9%A4%90%E5%BB%B3_QuanXi_Oyster_Buffet_Hotpot_Restaurant_%E8%82%A5%E7%89%9B_beef_September_2024_R12S_05.jpg) | Tongkwim 238 Bjaiame | CC0 |
| `tofu.webp` | [Wikimedia Commons: Japanese tofu 001.jpg](https://commons.wikimedia.org/wiki/File:Japanese_tofu_001.jpg) | Ocdp | CC0 |
| `onion.webp` | [Wikimedia Commons: Alliumcepa.JPG](https://commons.wikimedia.org/wiki/File:Alliumcepa.JPG) | Михаил Киречко | Public domain (released by the author) |
| `mushrooms.webp` | [Wikimedia Commons: Agaricus bisporus (1).jpg](https://commons.wikimedia.org/wiki/File:Agaricus_bisporus_(1).jpg) | Fumikas Sagisavas | CC0 |
| `crab-sticks.webp` | [Wikimedia Commons: Kanikama 001.jpg](https://commons.wikimedia.org/wiki/File:Kanikama_001.jpg) | Ocdp | CC0 |
| `shrimp-katsu.webp` | [Wikimedia Commons: Ebi Fry 003.jpg](https://commons.wikimedia.org/wiki/File:Ebi_Fry_003.jpg) | Ocdp | CC0 |
| `corn.webp` | [Wikimedia Commons: Corn on the cob (sweet corn).jpg](https://commons.wikimedia.org/wiki/File:Corn_on_the_cob_(sweet_corn).jpg) | Nutrition, Food Safety & Health (via Flickr, licence review passed) | CC0 |
| `extra-noodles.webp` | [Wikimedia Commons: Lucky Me instant pancit canton noodles (Philippines) 02.jpg](https://commons.wikimedia.org/wiki/File:Lucky_Me_instant_pancit_canton_noodles_(Philippines)_02.jpg), cropped to the noodle block | Obsidian Soul | CC0 |
| `egg.webp` | [Pexels photo 162712](https://www.pexels.com/photo/162712/) | Pexels (uploaded as "Pixabay") | [Pexels licence](https://www.pexels.com/license/) |

`egg.webp` came from the old Wix site and was matched to its library page by reverse image search. The other eight Wix-era topping photos had no licence on record, so they were replaced with the Commons photos above.

To add a new topping photo, prefer a shot on the MEON lid. If you use a library photo, add a row here with the link, author and licence.

## Noodle photos from free libraries

Packet photos for noodles that the MEON shoot hasn't covered yet (Preston, 29 Oct 2026: "completely free, no copyright"). Only public-domain or CC0 photos are used: no CC BY or BY-SA, no "free to use" sites with their own terms, and no recognisable people. Each one was checked against the packet's brand, product and flavour. Files are 900 × 900 in `src/assets/img/noodles/` with a 400 × 400 copy in `sm/`; replace them with the shoot photo when that noodle is photographed.

| File | Source | Author | Licence | Edits |
|---|---|---|---|---|
| `indomie-soto-mie.webp` | [Flickr: IMG_20160623_174010](https://www.flickr.com/photos/138690323@N08/27579257520) ([archived 26 Feb 2025](https://web.archive.org/web/20250226035308/https://www.flickr.com/photos/138690323@N08/27579257520)) | Ricky Maulana (Flickr: aries5485), his own photo | [Public Domain Mark 1.0](https://creativecommons.org/publicdomain/mark/1.0/) (Flickr "Public domain", licence id 10), checked on the page 30 Oct 2026 and in the 2025 archive copy | Cropped to a square around the packet (from 3264 × 2448) and resized |

The packet is Indonesia's domestic Indomie Soto Mie design from about 2016; the one on our wall may look slightly different.

Flickr owners can change a licence later, so each row records the date it was checked and an archived copy of the page; the photo stays covered by the licence it had when we took it.

## Code libraries that ship artwork

- **Country flags** (`assets/img/flags/*.svg`): [flag-icons](https://github.com/lipis/flag-icons), MIT licence. The build copies its licence to `assets/img/flags/LICENSE.txt` next to the flags.

## Font

- **Bricolage Grotesque** (`src/assets/fonts/*.woff2`): © 2022 The Bricolage Grotesque Project Authors (<https://github.com/ateliertriay/bricolage>), SIL Open Font License 1.1. The licence text sits next to the files as `src/assets/fonts/OFL.txt`. The files are the Google Fonts v9 subsets (latin, latin-ext, vietnamese). They are served from this site, so visitors' browsers don't contact Google.
