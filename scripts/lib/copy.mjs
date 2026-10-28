// Copywriting helpers: turns the structured noodle data into friendly, varied page copy.

// Ordered most-specific first. `re` is tested against "name + flavour" (lower-case).
const FLAVOUR_NOTES = [
  { re: /chapaguri|ram ?don/, note: "It's the famous \"ram-don\" mash-up of black-bean Chapagetti and spicy seafood Neoguri, the bowl the movie <em>Parasite</em> made world-famous." },
  { re: /habanero/, note: "Fiery Buldak chilli gets a zesty habanero-and-lime twist: fruity, sharp and seriously moreish." },
  { re: /tangle/, note: "Samyang's Tangle range: wide, chewy pasta-style noodles tossed through a rich, Western-style sauce." },
  { re: /buldak.*(carbonara)|carbonara.*buldak/, note: "Buldak's sweet, smoky fire sauce is softened by a creamy carbonara-style finish, rich, cheesy and still packing heat." },
  { re: /buldak.*cheese|cheese.*buldak/, note: "Buldak's smoky fire sauce meets a melty, savoury cheese powder for a rich, spicy, gooey bowl." },
  { re: /buldak.*(jjajang)/, note: "Two Korean icons in one: roasty black-bean jjajang sauce with Buldak's signature chilli kick." },
  { re: /buldak.*tomato|tomato.*pasta/, note: "A tangy tomato-pasta style sauce with Buldak's fiery chilli, like spicy spaghetti, Korean style." },
  { re: /buldak.*yakisoba|yakisoba/, note: "Sweet-savoury yakisoba-style sauce with a punchy chilli edge, Japanese street-festival vibes." },
  { re: /buldak.*mala|mala/, note: "Numbing Sichuan peppercorn plus chilli heat, that famous tingly mala buzz." },
  { re: /buldak.*kimchi/, note: "Tangy, fermented kimchi notes cut through Buldak's sweet, smoky fire sauce." },
  { re: /buldak.*stew/, note: "Buldak's sweet, smoky chilli in a soupy stew-style bowl, warming, saucy and spoonable." },
  { re: /buldak/, note: "Samyang's cult fire-noodle line: a sweet, smoky chilli sauce with heat that builds with every bite." },
  { re: /carbonara|bonara/, note: "A creamy, cheesy carbonara-style sauce makes this rich, comforting and very easy to love." },
  { re: /gomtang/, note: "A milky, gentle beef-bone gomtang broth, mellow, soothing and perfect on a cold day." },
  { re: /bulgogi/, note: "Sweet-savoury Korean BBQ bulgogi flavour with soy, garlic and a hint of caramel." },
  { re: /jjambbong/, note: "A spicy seafood-and-vegetable broth inspired by Korean-Chinese jjambbong, with a smoky chilli-oil depth." },
  { re: /jjajang|black ?bean|chapagetti|chacharoni/, note: "A roasty, sweet-savoury black-bean sauce, Korea's favourite takeaway noodle, ready in minutes." },
  { re: /neoguri.*mild/, note: "Thick, chewy udon-style noodles in a gentle seafood broth with a little kelp, the mild side of Neoguri." },
  { re: /neoguri/, note: "Thick, chewy udon-style noodles in a spicy seafood broth, finished with a little kelp for real ocean depth." },
  { re: /kim ?chi/, note: "Tangy, fermented kimchi flavour with a garlicky kick and a gently spicy finish." },
  { re: /shin black|black.*premium/, note: "Shin's premium edition adds a rich, bone-broth style soup on top of the classic spicy Shin seasoning." },
  { re: /shin.*cheese/, note: "Shin's bold, beefy chilli seasoning as a stir-fry, mellowed by a creamy cheese sauce." },
  { re: /shin/, note: "Nongshim's legendary Shin seasoning: a bold, beefy, chilli-forward broth with mushrooms and veg." },
  { re: /tempura/, note: "Thick, slurpy udon-style noodles in a light, savoury broth with crunchy tempura bits." },
  { re: /tang myun|ahn sung/, note: "A Korean pantry classic with a deep, savoury beef-and-vegetable broth and comforting, mellow spice." },
  { re: /tom ?yum|tomyum|thai tom|lau thai|mi lau/, note: "Lemongrass, kaffir lime, galangal and chilli, the hot, sour, fragrant Thai classic in noodle form." },
  { re: /asam laksa/, note: "Tangy tamarind and fish-based asam laksa, Penang style, sour, spicy and incredibly aromatic." },
  { re: /vege mee/, note: "A light, savoury vegetable-style noodle soup, Penang hawker style." },
  { re: /white curry/, note: "Penang white curry: creamy, coconutty and peppery, with a slow-building chilli warmth." },
  { re: /laksa/, note: "A rich, coconutty laksa broth loaded with spice, lemongrass and curry depth." },
  { re: /hokkien|prawn/, note: "A deep, sweet-savoury prawn broth inspired by the hawker-stall Hokkien prawn mee." },
  { re: /fish broth/, note: "A light, milky fish broth with delicate rice vermicelli, clean, comforting and gentle." },
  { re: /salted egg/, note: "Rich, buttery salted-egg-yolk sauce, Singapore's most indulgent flavour trend, with a little curry-leaf aroma." },
  { re: /mee po[hk]/, note: "Flat, springy mee pok noodles tossed in a savoury, tangy chilli-style sauce, hawker style." },
  { re: /masala/, note: "Classic masala spice, cumin, coriander, turmeric and a gentle tang that tastes like home to millions." },
  { re: /curry|kari/, note: "Warming curry spices in a rich, golden, aromatic base." },
  { re: /soto/, note: "A turmeric-gold, lemongrass-scented soto broth, Indonesia's ultimate comfort soup." },
  { re: /baso|bakso/, note: "A light, savoury meatball-soup style broth, just like Indonesia's beloved bakso." },
  { re: /satay/, note: "Nutty, sweet satay-style peanut flavours with a little spice." },
  { re: /sambal/, note: "Sweet-soy fried noodles turned up with fiery sambal chilli." },
  { re: /goreng|mi goreng|mie goreng/, note: "Indonesia's iconic fried-noodle style: sweet kecap manis soy, savoury seasoning, chilli and crispy fried shallots." },
  { re: /tonkotsu/, note: "A creamy, rich, pork-bone style tonkotsu broth with deep umami." },
  { re: /black garlic|garlic/, note: "Roasted black garlic oil adds a smoky, mellow, irresistible depth." },
  { re: /miso/, note: "A deep, savoury fermented miso broth, Hokkaido style." },
  { re: /shoyu/, note: "A clear, glossy soy-sauce broth, the classic Tokyo ramen bowl." },
  { re: /dan ?dan/, note: "A nutty sesame-and-chilli dan dan sauce with a gentle Sichuan tingle." },
  { re: /sesame/, note: "Toasty, nutty sesame oil aroma over a light, savoury soup, a Hong Kong cha chaan teng favourite." },
  { re: /sriracha|siracha/, note: "A garlicky sriracha hot-sauce kick through sweet-savoury stir-fried noodles." },
  { re: /chow ?mi?en|pancit|canton/, note: "Stir-fried style noodles in a sweet-savoury soy glaze, saucy, glossy and snackable." },
  { re: /kalamansi|chili-?mansi|mansi/, note: "Bright, zesty kalamansi citrus lifts the sweet-savoury sauce." },
  { re: /danzai/, note: "Tainan's famous danzai flavour: a savoury minced-meat and shrimp style sauce over springy noodles." },
  { re: /scallion/, note: "Fragrant scallion-oil sauce, simple, glossy and very moreish." },
  { re: /hand ?pulled|meteor|a-sha|taiwan style/, note: "Sun-dried, restaurant-style noodles with a bouncy, satisfying chew." },
  { re: /pickled mustard/, note: "Tangy pickled mustard greens brighten a rich, savoury beef broth." },
  { re: /hot and sour|sour/, note: "A bright hot-and-sour balance that wakes up every bite." },
  { re: /pho/, note: "An aromatic pho-style broth with warming star anise and spice notes." },
  { re: /hot ?pot|chongqing/, note: "Chongqing hot-pot style: deep, oily chilli heat with bold spice." },
  { re: /spaghetti/, note: "Filipino-style sweet spaghetti flavour, tomatoey, a little sweet and nostalgic." },
  { re: /chilli crab/, note: "Singapore's famous chilli crab in noodle form: a sweet, tangy chilli sauce with a seafood edge." },
  { re: /lobster|crab|shrimp|seafood|fish/, note: "A briny, oceanic seafood flavour with savoury depth." },
  { re: /braised beef|beef|\bbo\b|brisket/, note: "A savoury, slow-braised beef-style broth with gentle spice." },
  { re: /rib|pork|suon/, note: "A rich, rounded pork-and-rib style broth." },
  { re: /mushroom/, note: "Earthy, savoury mushroom notes in a comforting broth." },
  { re: /chicken|\bga\b/, note: "A comforting, savoury chicken broth, the ultimate classic." },
  { re: /veg|vegan|veggie|vegetasty/, note: "A plant-based broth full of vegetable sweetness and savoury depth." },
  { re: /oriental/, note: "The classic savoury 'oriental' seasoning so many Aussies grew up on." },
  { re: /cheese/, note: "Melty, savoury cheese flavour makes it rich and moreish." },
  { re: /pepper/, note: "A punchy, peppery broth with plenty of warmth." },
  { re: /spicy|hot|chilli|chili/, note: "A chilli-forward seasoning with a satisfying kick." },
];

// The "regulars" line needs a track record, so noodles just added from the till (n.newToSite) never get it.
const REGULARS_OPENER = (n) => `Straight from ${n.country}, ${n.brand}'s ${n.name} is a bowl our regulars keep coming back for.`;
const OPENERS = [
  (n) => `${n.name} by ${n.brand} is ${/^[AEIOU]/.test(n.countryAdj) ? "an" : "a"} ${n.countryAdj} favourite you can cook here at MEON.`,
  REGULARS_OPENER,
  (n) => `${n.brand} ${n.name} brings a proper taste of ${n.country} to Canning Bridge.`,
  (n) => `Craving something from ${n.country}? ${n.brand}'s ${n.name} is a great place to start.`,
];

const TYPE_LINES = {
  Soup: "It's a broth-first bowl: the aroma hits first, then the noodles soak up the soup as they cook, so every mouthful is full of flavour.",
  Dry: "It's a mix-and-eat noodle: cook, drain most of the water, then toss through the sauce so it coats every strand.",
  Porridge: "It cooks down into a soft, porridge-style bowl, gentle, hearty and very comforting.",
};

const COUNTRY_ADJ = {
  "South Korea": "Korean", Japan: "Japanese", Indonesia: "Indonesian", Vietnam: "Vietnamese", China: "Chinese",
  Malaysia: "Malaysian", Thailand: "Thai", Singapore: "Singaporean", India: "Indian", Philippines: "Filipino",
  Taiwan: "Taiwanese", Australia: "Aussie",
};

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function flavourNote(n) {
  const hay = `${n.brand} ${n.name} ${n.flavour}`.toLowerCase();
  const hit = FLAVOUR_NOTES.find((f) => f.re.test(hay));
  return hit ? hit.note : `${n.brand}'s signature seasoning in one of its best-loved forms.`;
}

export function describe(n) {
  const ctx = { ...n, countryAdj: COUNTRY_ADJ[n.country] || n.country };
  const openers = n.newToSite ? OPENERS.filter((o) => o !== REGULARS_OPENER) : OPENERS;
  const opener = openers[hash(n.slug) % openers.length](ctx);
  const paras = [`${opener} ${flavourNote(n)}`];
  if (n.type && TYPE_LINES[n.type]) paras.push(TYPE_LINES[n.type]);
  return paras;
}

export function shortBlurb(n) {
  // Plain-text, one sentence, for meta descriptions and cards.
  return flavourNote(n).replace(/<[^>]+>/g, "");
}

// Every noodle cooks for 3 minutes 50 seconds (Preston, 28 Oct 2026): press 1, then 2 on the machine.
export const COOK_SECONDS = 230;
export const COOK_TIME = `${Math.floor(COOK_SECONDS / 60)} minutes ${COOK_SECONDS % 60} seconds`;

// How cooking works at MEON: pairings go in with the noodles at the start; egg and cheese go on top of the
// noodles (never on the bowl, it burns) in the last 30 seconds; sides are ready to eat and stay out of the machine.
const PICK = ["Grab your packet", "Pick it off the wall and bring it to the cooking machine with a MEON bowl."];
const PRESS = ["Press 1, then 2", `Press 1, then 2 on the machine. It cooks for ${COOK_TIME}.`];
const LAST = ["Egg and cheese last", "In the last 30 seconds, crack the egg and add cheese on top of the noodles, not on the bowl, so it doesn't burn."];

export function cookSteps(n) {
  if (n.type === "Dry") {
    return {
      steps: [
        PICK,
        ["Pairings in", "Put the noodle block and your pairings in the bowl. Keep the sauce and flakes aside."],
        PRESS,
        LAST,
        ["Drain and toss", "Pour off most of the water, keeping a couple of spoonfuls, then mix in the sauce and flakes until glossy."],
      ],
    };
  }
  if (!n.type) {
    return {
      steps: [
        PICK,
        ["Pairings in", "Put the noodles, the seasoning and your pairings in the bowl."],
        PRESS,
        LAST,
        ["Soup or sauce", "Check the packet: keep the water for a soup, or drain most of it and toss through the sauce."],
      ],
    };
  }
  return {
    steps: [
      PICK,
      ["Pairings in", "Put the noodles, the soup base and your pairings in the bowl."],
      PRESS,
      LAST,
      ["Stir and eat", "Give it a good stir, grab your chopsticks and enjoy it hot. Sides go on the side."],
    ],
  };
}

// Suggest pairings and sides (by id from data/toppings.json) based on flavour and style.
export function suggestPairings(n, pairings) {
  const hay = `${n.brand} ${n.name} ${n.flavour}`.toLowerCase();
  const ids = new Set(["egg"]);
  if (/buldak|cheese|carbonara|bonara|spicy|fire|kimchi/.test(hay)) ids.add("cheese");
  if (/tom ?yum|seafood|shrimp|prawn|crab|lobster|fish|neoguri|jjambbong/.test(hay)) { ids.add("crab-sticks"); ids.add("fishcake"); }
  if (/beef|bulgogi|shin|gomtang|brisket|bo\b/.test(hay)) ids.add("beef");
  if (/pork|rib|tonkotsu|spam/.test(hay)) ids.add("spam");
  if (/chicken|soto|curry|laksa|masala/.test(hay)) ids.add("chicken");
  if (/veg|vegan|mushroom|miso|shoyu/.test(hay) || n.diet === "Vegetarian/Vegan") { ids.add("tofu"); ids.add("mushrooms"); }
  if (/jjajang|black ?bean|chapa|goreng|carbonara|cheese/.test(hay)) ids.add("corn");
  if (n.type === "Soup") { ids.add("lettuce"); ids.add("seaweed"); }
  ids.add("spring-onion");
  if (n.diet === "Vegetarian/Vegan") ["beef", "spam", "chicken", "crab-sticks", "fishcake", "egg", "cheese"].forEach((x) => ids.delete(x));
  const byId = new Map(pairings.map((t) => [t.id, t]));
  return [...ids].map((id) => byId.get(id)).filter(Boolean).slice(0, 5);
}

export { COUNTRY_ADJ };

// Customer-facing badge for the Drive doc's "fun note". Staff notes (market share, rival brands,
// "rural variant") are hidden; everything else gets tidy wording. Unknown notes show as written.
const BADGES = {
  "2nd Most popular": "Crowd favourite",
  "2nd most popular brands in Vietnam": "A Vietnam favourite",
  "3 Mien represents North, Central & South": "North, Central & South",
  "3rd Most popular / Healthier option": "A lighter pick",
  "Affordable, more rural": null,
  "Big competitor to Kangsifu": null,
  "Collab Noodle, Popular online": "Collab noodle",
  "Collab with Famous Chef / Bangkok Michelin starred restaurant": "Michelin-star collab",
  "Featured": "Featured",
  "Hand pulled - Top Seller": "Hand-pulled · Top seller",
  "High Rating + More Premium": "Premium pick",
  "Increasing market share": "Rising star",
  "Known for no MSG flavour": "No added MSG",
  "Many other flavours.": null,
  "Most popular flavour": "Most popular flavour",
  "Most popular in India": "India's favourite",
  "Most popular in Vietnam": "Vietnam's favourite",
  "Most popular in the brand": "Brand bestseller",
  "New range": "New",
  "New": "New",
  "Niche flavour": "Something different",
  "No.1 Ramen in the World": "No.1 ramen in the world",
  "Popular in US / Canada / Everywhere": "Loved worldwide",
  "Premium Quality, Restaurant Style": "Restaurant style",
  "Rural variant": null,
  "Staple in Philippines home": "A Filipino staple",
  "Super Premium": "Super premium",
  "Superior Taste Award; hard to get": "Award winner · Hard to find",
  "Thailand Top 1 Product 2014": "Thailand's top product 2014",
  "Third most popular": "Crowd favourite",
  "Top 10 Noodle 2021": "Top 10 noodle 2021",
  "Top 10 rated noodle 2021": "Top 10 noodle 2021",
  "Top Rated in Malaysia": "Top rated in Malaysia",
  "Top Seller": "Top seller",
  "Was hyped like Buldak": "Internet famous",
  "Was viral on tik tok before": "Viral on TikTok",
};
export const badge = (note) => (note == null ? null : note in BADGES ? BADGES[note] : note);
