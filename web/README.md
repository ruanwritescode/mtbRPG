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
npm test           # engine tests, including a bot that plays whole seasons
npm run build      # typecheck + production build into web/dist
```

## How it's put together

| Path | What it does |
| --- | --- |
| `src/data.ts` | Imports the original text files (`?raw`) and parses them |
| `src/engine/` | The rules, ported from the C++ (`game.ts`), with parsers, types and RNG. No DOM |
| `src/ui/app.ts` | Screens, input (keyboard, mouse/tap, on-screen D-pad), modals and game flow |
| `src/ui/mapSvg.ts` | Draws a zone map from its ASCII file, with smoothed coastlines |
| `src/ui/art.ts` | SVG art: the rider, start gates and one scene for each trail section |
| `src/ui/save.ts` | Saves in `localStorage`: an autosave (Continue) plus named saves like the original |
| `tests/bot.ts` | A simple bot that plays full seasons. It's used to check the game can be finished |

A trail section with no SVG scene (for example one newly added to `races/terrain.txt`) falls back to its ASCII
art.

## Differences from the terminal game

The formulas follow the C++ code. These changes fix crashes, keep the game finishable, or come from playtesting:

- **Prize money is 3× the original.** The original paid about the same as the entry fee, so racing never made
  money and the bot could never finish a season.
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
- Racing with no tires no longer crashes the game, and a flat tire gets thrown away.

## Deploying to game.shreddi.bike (Cloudflare)

`shreddi.bike` is a Cloudflare zone, so the game is its own Cloudflare project on the subdomain. It deploys
from the **`production`** branch. `wrangler.jsonc` tells Cloudflare to serve the built `dist/` folder as static
files.

**As a Worker** (what **Workers & Pages → Create → Import a repository** makes now):

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
