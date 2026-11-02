# mtbRPG for the web

A graphical, browser version of mtbRPG, served at **https://game.shreddi.bike**. It's a static site built with
Vite and TypeScript, with no framework and no backend. It reads the same data files as the C++ game
(`../maps`, `../items`, `../races`), so editing a race list or a map changes both versions.

## Run it locally

```bash
cd web
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run dev:sync   # the same, plus it pulls new commits from origin every few seconds
npm test           # engine tests, including a bot that plays whole seasons
npm run build      # typecheck + production build into web/dist
```

`npm run dev` hot-reloads the page whenever a file changes, so edits appear without a rebuild.
`npm run dev:sync` adds a fast-forward pull of the current branch (every 8 s, or `SYNC_INTERVAL=3`), which
makes commits pushed from a cloud session show up in the browser on their own. It never pulls over local
edits.

## How it's put together

| Path | What it does |
| --- | --- |
| `src/data.ts` | Imports the original text files (`?raw`) and parses them |
| `src/engine/` | The rules, ported from the C++ (`game.ts`), with parsers, types and RNG. No DOM |
| `src/engine/rivals.ts` | The roster of rival riders, start lists, results tables and ranking points |
| `src/engine/venues.ts` | Real-world race venues and bike-shop towns for each map |
| `src/ui/app.ts` | Input (keyboard, mouse/tap, on-screen D-pad), modals and game flow |
| `src/ui/views/` | One module per screen: HUD, map, shop, race, story screens, career sheet |
| `src/ui/mapSvg.ts` | Draws a zone map from its ASCII file, with coastlines, hills, forests and venue labels |
| `src/ui/pov.ts` | First-person trail scenes: the view over the bars, forking into one lane per line choice |
| `src/ui/rider.ts` | The rider portrait (a full-face helmet in the kit colour) used for you and every rival |
| `src/ui/art.ts` | SVG art: start gates, the frame drawing, title stickers and shared drawing helpers |
| `src/ui/sound.ts` | Sound effects synthesised with the Web Audio API; mute is remembered |
| `src/ui/fx.ts` | Confetti and number tweens |
| `src/ui/save.ts` | Saves in `localStorage`: an autosave (Continue) plus named saves like the original |
| `tests/bot.ts` | A simple bot that plays full seasons. It's used to check the game can be finished |

## Playing

- **Your career:** you start as a Rookie ranked #33 of 33. Every race has a start list of rivals (a fixed
  roster of 32 fictional riders, from club regulars to World Cup winners); where you finish among them
  moves you up the world rankings. Levels have names (Rookie, Novice, Amateur, Sport, Expert, Semi-Pro,
  Pro, World Cup, World Champion) and the career sheet (<kbd>C</kbd>) shows your stats, the rankings
  and the races you've won.
- **Map:** arrow keys or WASD move one step (or tap a cell to ride there). <kbd>Enter</kbd> enters a shop or
  race, <kbd>1</kbd> local race, <kbd>2</kbd> eat, <kbd>3</kbd> toolkit, <kbd>4</kbd> save, <kbd>5</kbd> fuel,
  <kbd>Esc</kbd> menu.
- **Races:** each section is drawn from the rider's point of view, with the trail forking into a left,
  straight and right lane. Every lane is one line choice with the feature it rides drawn on it (rocks, roots,
  a rut, the inside of a corner or the berm, rollers, gaps, switchbacks...). Pick one with <kbd>←</kbd>
  <kbd>↑</kbd> <kbd>→</kbd> (or A/W/D, the number keys, or a tap on the trail or its tile). Which lane an option
  takes is set in `lanesFor()` in `src/ui/pov.ts`; a section added to `races/terrain.txt` gets a scene
  automatically, with lane features picked from each option's name or the stat it uses.
- **Venues:** the flags on the map are real riding destinations (Northstar to Killington in the USA; Fort
  William to Maribor in Europe, with Snowshoe and Val di Sole as the finals), and bike shops turn up in
  real mountain-bike towns. World Cups are named after the venue you enter them at.
- **Sound:** short synthesised effects for picks, splits, crashes, wins and level-ups. Toggle with the
  speaker button, <kbd>M</kbd>, or from the menu; the setting is remembered.
- **Fuel:** the van holds 30 gallons and every step burns one. Fill up at shops, race venues and finals
  (USA $4/gal, Europe $7/gal). Run dry on the open trail and you can call a fuel delivery (5 gallons at triple
  price) or enter a local race from where you're standing to earn fuel money.
- **Layout:** on desktop the game always fits one screen with no scrolling. On phones the map zooms in and
  follows the rider (tap **Full map** to see everything), with the D-pad over the map.

## Product photos

Shop items and the title screen use real product photos when they exist in `src/assets/parts/`, named by
the item's slug (`commencal-supreme-v5.png`, `fox-factory.png`, `tire.png`, `snack.png`, `toolkit.png`;
see `slug()` in `src/ui/partImages.ts`). Anything without a photo falls back to the drawn icon. PNGs with
a transparent background look best, because the title screen cuts a white sticker edge around the alpha.

`node scripts/fetch-parts.mjs` downloads them from the URLs listed in `scripts/part-sources.json` (an image
URL, or a product page whose `og:image` is used). The shipped photos were then cut out with ImageMagick
(corner flood-fill to transparent, trim, resize to 900 px, WebP). `scripts/probe.mjs`, `shopify-find.mjs` and
`shopify-search.mjs` help find product images on brand and retailer sites. The photos are manufacturers' and
retailers' product shots; check the licence of anything you ship.

## Part attributes

`items/attributes.txt` rates every part (and the tire) from 1 to 10 on four attributes, shown in the game as
five dots with half dots. The C++ game ignores the file.

| Attribute | In a race |
| --- | --- |
| Speed | Turns a good line into more time gained (and softens a bad one) |
| Durability | Parts lose less health per section |
| Playfulness | Lower injury-crash risk, and a small bonus on skill lines |
| Lightness | Using a stat tires the rider less |

The bike's rating is the average of its four parts and shows in the rider bar. An average rating (6) changes
nothing, so the base balance is unchanged.

## Differences from the terminal game

The formulas follow the C++ code. These changes fix crashes, keep the game finishable, or come from playtesting:

- **Real-world prices.** Every part, tire, snack and toolkit costs roughly its real retail price (frame-only
  prices for frames, pairs for brakes, wheelsets for wheels), and prices no longer rise with your level.
  Within each slot a dearer part has higher ratings and more health, so you get what you pay for. Starting
  sponsor money is $8,000, enough for a mid-range bike.
- **Prize money is 5× the original** (a World Cup win pays $5,000). The original paid about the same as the
  entry fee, so racing never made money and the bot could never finish a season.
- **A loss can be off the podium.** The original's margin check always gave second place on a loss. The README
  says you can miss the podium, so now you can.
- **Sponsors and game over.** You start with 3 sponsors. If you're broke and can't race, a sponsor will pay what
  you're short and then drop you. With no money and no sponsors left, the season is over.
- **Injuries.** Riding a line your stat can't handle (below the race's pace), or the whoops on a worn-out bike,
  can crash you and injure you. Each choice shows the risk. Three injuries end your career. The original 1%
  bad-luck crash is still there, and it never injures.
- **The Europe final is the Val Di Sole World Championship** (level 8). In the original that race could never
  be reached.
- **Club races.** Once every named race at your level is won, local "club" races stand in, so you can't get
  stuck without races to enter.
- **Rivals and rankings.** The original raced against an abstract reference time. The reference time still
  decides your placement; a results table is built around it so the podium always agrees, and rivals
  bank ranking points from the races they share with you. Winning the World Championship puts you at #1.
- **Fuel.** The map has a fuel tank, so you can't wander freely: plan stops at shops and races. Running dry
  with no money and no sponsors to pay for a delivery ends the season.
- Racing with no tires no longer crashes the game, and a flat tire gets thrown away.

## Deploying to game.shreddi.bike (Cloudflare)

`shreddi.bike` is a Cloudflare zone, so the game is its own Cloudflare project on the subdomain. It deploys
from the **`production`** branch. `wrangler.jsonc` tells Cloudflare to serve the built `dist/` folder as static
files.

**Simplest setup:** leave Cloudflare's build settings at their defaults (no root directory, deploy command
`npx wrangler deploy`). The repository root has its own `wrangler.jsonc` and `package.json` that build `web/` and
upload `web/dist`, so it deploys whatever branch Cloudflare builds.

**As a Worker with explicit settings** (what **Workers & Pages → Create → Import a repository** makes now):

1. Connect `ruanwritescode/mtbRPG`. In the project's **Settings → Build**, set:

   | Setting | Value |
   | --- | --- |
   | Root directory (path) | `web` |
   | Build command | `npm run build` |
   | Deploy command | `npx wrangler deploy` |
   | Branch control → Production branch | `production` |

2. The project name must match `"name"` in `web/wrangler.jsonc` (`mtbrpg`). If the project has a different
   name, change that line to match.
3. Under **Settings → Domains & Routes → Add → Custom domain**, enter `game.shreddi.bike`.

**As a Pages project** (the older flow): use root directory `web`, build command `npm run build`, build
output directory `dist`, production branch `production`, and add `game.shreddi.bike` under **Custom domains**.

Every push to `production` redeploys the live site. `public/_headers` makes the hashed files in `/assets`
cache forever. The build reads `../maps` and the other data folders, so Cloudflare needs the whole
repository, which it checks out by default.
