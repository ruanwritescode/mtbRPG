// A simple bot that plays a whole season, used to check the game can be finished.
import { gameData as data } from '../src/data';
import { isLand } from '../src/engine/parse';
import type { Rng } from '../src/engine/rng';
import * as G from '../src/engine/game';
import { PART_SLOTS, type GameState, type Point, type RaceKind } from '../src/engine/types';

export interface BotRun {
  state: GameState;
  steps: number;
  races: number;
  done: boolean;
  stuck?: string;
}

function shopFor(state: GameState) {
  const p = state.player;
  const lvl = state.level;
  const cart = G.emptyCart();
  const reserve = (lvl + 1) * (lvl + 1) * 30;
  let essential = true; // missing parts and the first tire ignore the reserve
  const afford = () => G.summarizeCart(state, data, cart).total <= state.money - (essential ? 0 : reserve);
  // 1. Missing parts: spend up to ~70% of money on a bike, cheapest first then upgrade.
  const missing = PART_SLOTS.filter((s) => !p.parts[s]);
  for (const slot of missing) {
    const list = data.shop.parts[slot];
    cart.parts[slot] = list.length - 1; // cheapest is last in the file
  }
  if (missing.length) {
    const cap = state.money - 400;
    for (let improved = true; improved; ) {
      improved = false;
      for (const slot of missing) {
        const idx = cart.parts[slot]!;
        if (idx === 0) continue;
        cart.parts[slot] = idx - 1;
        if (G.summarizeCart(state, data, cart).total > cap) cart.parts[slot] = idx;
        else improved = true;
      }
    }
  }
  const tryAdd = (what: G.Consumable, upTo: number) => {
    while (cart[what] < Math.min(upTo, G.maxAdd(p, what))) {
      cart[what]++;
      if (!afford()) {
        cart[what]--;
        break;
      }
    }
  };
  tryAdd('tires', p.tires.length ? 0 : 1);
  if (Math.min(p.strength, p.skill, p.endurance, p.mental) <= 10) tryAdd('snacks', 1);
  if (G.bikeHealth(p) < 30 && p.toolkits === 0) tryAdd('toolkits', 1);
  essential = false;
  tryAdd('tires', 2 - p.tires.length);
  tryAdd('toolkits', 3);
  tryAdd('tires', 3 - p.tires.length);
  tryAdd('snacks', 6);
  // Replace worn-out parts if money allows.
  for (const slot of PART_SLOTS) {
    const owned = p.parts[slot];
    if (!owned || owned.quality >= 40) continue;
    const list = data.shop.parts[slot];
    for (let idx = 0; idx < list.length; idx++) {
      if (list[idx].name === owned.name) continue;
      cart.parts[slot] = idx;
      if (afford()) break;
      delete cart.parts[slot];
    }
  }
  while (!G.summarizeCart(state, data, cart).canAfford && cart.snacks > 0) cart.snacks--;
  if (G.summarizeCart(state, data, cart).canAfford) G.checkout(state, data, cart);
}

function bfs(state: GameState, goal: (p: Point) => boolean): G.Direction | null {
  const map = G.currentMap(state);
  const t = data.maps[map.zone];
  const start = map.player;
  const seen = new Map<string, G.Direction | null>([[G.key(start), null]]);
  const queue: Point[] = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    const first = seen.get(G.key(cur));
    if ((cur.x !== start.x || cur.y !== start.y) && goal(cur)) return first ?? null;
    for (const d of Object.keys(G.DIRS) as G.Direction[]) {
      const n = { x: cur.x + G.DIRS[d].x, y: cur.y + G.DIRS[d].y };
      if (!isLand(t, n.x, n.y) || seen.has(G.key(n))) continue;
      seen.set(G.key(n), first ?? d);
      queue.push(n);
    }
  }
  return null;
}

function chooseLine(state: GameState, feature: number, level: number): number {
  const opts = data.terrain[feature].options;
  const tp = G.turningPoint(level);
  let best = 1;
  let bestScore = -Infinity;
  opts.forEach((o, i) => {
    let score = 0;
    if (o.modifier === 'time') score = -750;
    else if (o.modifier === 'strength' || o.modifier === 'skill' || o.modifier === 'endurance') {
      const after = state.player[o.modifier] * 0.8;
      score = 5000 * (state.player.mental / 100) * (after / tp - 1);
      score -= G.crashRisk(state.player, o.modifier, level) * 40000;
    }
    if (score > bestScore) {
      bestScore = score;
      best = i + 1;
    }
  });
  return best;
}

export const log: string[] = [];
export function playSeason(rng: Rng, maxSteps = 20000): BotRun {
  const state = G.createGame('Bot', data, rng);
  shopFor(state);
  let steps = 0;
  let races = 0;
  let broke = false;
  let bailouts = 0;
  let shopped = false; // already shopped since the last race
  const needsShop = () =>
    !shopped && (G.raceBlocker(state.player)?.includes('parts') ||
    !state.player.tires.length ||
    (state.player.toolkits === 0 && state.money > G.priceAt(100, state.level) * 2) ||
    PART_SLOTS.some((s) => (state.player.parts[s]?.quality ?? 0) < 40) ||
    (state.player.tires.length < 2 && state.money > G.priceAt(90, state.level) * 2) ||
    (state.player.snacks === 0 && state.money > 200));

  const race = (kind: RaceKind): boolean => {
    const pick = G.pickRace(state, kind, rng);
    if (!pick) return false;
    if (pick.race.entryFee > state.money && state.money > 0) {
      // fine: like the original, fees can put you in debt
    }
    races++;
    shopped = false;
    const s = G.startRace(state, data, kind, pick, rng);
    if (G.tireIsLow(state.player, s.race)) G.swapTire(state.player);
    s.status = 'running';
    while (s.status === 'running') G.rideSection(state, data, s, chooseLine(state, s.feature, s.race.level), rng);
    const res = G.settleRace(state, s);
    log.push(`L${s.race.level} ${kind} ${s.status} p=${res.placement} gap=${s.gap} fee=${s.race.entryFee} prize=${res.prize} $=${state.money} hp=${G.bikeHealth(state.player)} st=${state.player.strength}/${state.player.skill}/${state.player.endurance}/${state.player.mental}`);
    return res.placement !== null && res.placement > 0;
  };

  while (steps++ < maxSteps && state.phase !== 'champion') {
    if (G.checkGameOver(state, data)) return { state, steps, races, done: false, stuck: `game over: ${state.gameOver}` };
    if (broke) return { state, steps, races, done: false, stuck: 'cannot afford entry fees' };
    const p = state.player;
    // Maintenance
    while (p.snacks > 0 && Math.min(p.strength, p.skill, p.endurance) < G.turningPoint(state.level + 1) + 10) G.eat(state, rng);
    while (p.toolkits > 0 && G.bikeHealth(p) < 70) G.repair(state, rng);

    const loc = G.locationOf(state);
    if (loc === 'shop' && needsShop()) {
      shopFor(state);
      shopped = true;
    }
    const map = G.currentMap(state);
    if (G.raceBlocker(p)) {
      if (loc === 'shop' && shopped) {
        if (G.sponsorBailout(state, data) > 0) {
          bailouts++;
          shopped = false;
          continue;
        }
        if (p.snacks > 0) G.eat(state, rng);
        else return { state, steps, races, done: false, stuck: 'broke: ' + G.raceBlocker(p) + ' sponsors=' + state.sponsors };
      }
      const known = map.shops;
      const dir = bfs(state, (pt) => known.some((s) => s.x === pt.x && s.y === pt.y)) ?? bfs(state, (pt) => !map.visited.includes(G.key(pt)));
      if (!dir) return { state, steps, races, done: false, stuck: 'no path' };
      G.move(state, data, dir, rng);
      continue;
    }
    if (needsShop() && state.money > 300) {
      if (loc !== 'shop') {
        const known = map.shops;
        const dir = known.length
          ? bfs(state, (pt) => known.some((s) => s.x === pt.x && s.y === pt.y))
          : bfs(state, (pt) => !map.visited.includes(G.key(pt)));
        if (dir) {
          G.move(state, data, dir, rng);
          continue;
        }
      }
    }
    if (map.races.length === 0) {
      if (loc === 'final') {
        race('final');
        continue;
      }
      const dir = bfs(state, (pt) => pt.x === map.final.x && pt.y === map.final.y);
      if (dir) G.move(state, data, dir, rng);
      continue;
    }
    if (p.points >= G.requiredPoints(state.level)) {
      if (loc === 'race') {
        race('map');
        continue;
      }
      const dir = bfs(state, (pt) => map.races.some((r) => r.x === pt.x && r.y === pt.y));
      if (dir) G.move(state, data, dir, rng);
      continue;
    }
    if (loc === 'race' || loc === 'final' || loc === 'shop') {
      const dir = bfs(state, (pt) => !map.races.some((r) => r.x === pt.x && r.y === pt.y) && !map.shops.some((r) => r.x === pt.x && r.y === pt.y));
      if (dir) G.move(state, data, dir, rng);
      continue;
    }
    if (!race('local')) {
      // nothing
    }
  }
  return { state, steps, races, done: state.phase === 'champion', stuck: `bailouts=${bailouts}` };
}
