// The rules of mtbRPG, ported from the original C++ (Game.cpp, Racer.cpp, Map.cpp, Minigame.cpp, Shop.cpp).
// Numbers and formulas follow the original; places that crashed or contradicted the README are fixed
// and marked "fix:".
import { isLand, type GameData, type Terrain } from './parse';
import type { Rng } from './rng';
import {
  ATTR_NAMES,
  PART_SLOTS,
  type Attrs,
  type GameState,
  type MapState,
  type Part,
  type PartSlot,
  type Point,
  type RaceDef,
  type RaceKind,
  type RaceSession,
  type Racer,
  type SectionOutcome,
  type StatName,
  type Zone,
} from './types';

/** Sponsor money at the start: enough for a mid-range bike plus tires and supplies at real-world prices. */
export const START_MONEY = 8000;
export const MAX_TIRES = 5;
export const MAX_TOOLS = 3;
export const MAX_SNACKS = 9;
export const TIRE_LIFE = 20;
/** Real-world prices: a Maxxis DH tire, an energy bar, and a home mechanic's toolkit. */
export const UNIT_PRICES = { tires: 95, snacks: 3, toolkits: 400 } as const;
export type Consumable = keyof typeof UNIT_PRICES;
export const QUIT_PENALTY = 20;
export const START_SPONSORS = 3;
export const MAX_INJURIES = 3;
export const FINAL_BONUS = 1000;
/**
 * Prize money for 1st/2nd/3rd, scaled by (level/7)^2. fix: the original paid 1000/750/500, about the
 * same as the entry fee, so racing never made money and a season could not be finished (checked with
 * the bot in tests/bot.ts). Five times that (a World Cup win pays $5,000) keeps a rider who looks after
 * their bike afloat at real-world part prices.
 */
export const PRIZES = [0, 5000, 3750, 2500];
const MAX_RACES_ON_MAP = 5;
/** Level of the race at each map's F. fix: Europe's final is the World Championship (level 8). */
export const FINAL_LEVEL: Record<Zone, number> = { usa: 6, europe: 8 };

// ---------------------------------------------------------------- creation

export function newRacer(name: string, rng: Rng): Racer {
  return {
    name,
    strength: 65 + rng.int(20),
    skill: 65 + rng.int(20),
    endurance: 65 + rng.int(20),
    mental: 100,
    points: 1,
    parts: { frame: null, suspension: null, brakes: null, wheels: null },
    tires: [],
    toolkits: 0,
    snacks: 0,
    injuries: 0,
  };
}

export function makeRace(name: string, level: number, rng: Rng): RaceDef {
  const minutes = 2 + rng.int(4);
  const seconds = rng.int(60);
  const ms = rng.int(1000);
  let endcap: number;
  let length: number;
  if (level >= 7) {
    endcap = 3;
    length = 15 + rng.int(6);
  } else if (level >= 5) {
    endcap = 2;
    length = 7 + rng.int(4);
  } else if (level >= 3) {
    endcap = 1;
    length = 6;
  } else {
    endcap = 0;
    length = 4 + rng.int(4);
  }
  return {
    name,
    level,
    entryFee: Math.trunc(level * level * (rng.int(10) + 15)),
    endcap,
    length,
    time: minutes * 100000 + seconds * 1000 + ms,
  };
}

const CLUB_NAMES = ['Thursday Club Race', 'Sunday Shred Series', 'Bike Park Gravity Jam', 'Trail Builders Benefit Race'];

function clubRace(level: number, rng: Rng): RaceDef {
  return { ...makeRace(CLUB_NAMES[rng.int(CLUB_NAMES.length)], level, rng), club: true };
}

export function newMap(zone: Zone, terrain: Terrain, rng: Rng): MapState {
  const map: MapState = {
    zone,
    player: { ...terrain.start },
    final: { ...terrain.final },
    shops: [],
    races: [],
    won: [],
    maxShops: terrain.maxShops,
    visited: [key(terrain.start)],
  };
  spawnRaces(map, terrain, rng);
  return map;
}

export function createGame(name: string, data: GameData, rng: Rng): GameState {
  return {
    version: 1,
    phase: 'usa',
    player: newRacer(name.trim() || 'Rider', rng),
    level: 0,
    money: START_MONEY,
    sponsors: START_SPONSORS,
    maps: {
      usa: newMap('usa', data.maps.usa, rng),
      europe: newMap('europe', data.maps.europe, rng),
    },
    races: data.raceList.map((r) => makeRace(r.name, r.level, rng)),
    stats: { entered: 0, wins: 0, podiums: 0 },
    createdAt: Date.now(),
  };
}

// ---------------------------------------------------------------- map

export function key(p: Point): string {
  return `${p.x},${p.y}`;
}

function has(list: Point[], x: number, y: number): boolean {
  return list.some((p) => p.x === x && p.y === y);
}

export function zoneOf(state: GameState): Zone {
  if (state.phase === 'usa') return 'usa';
  if (state.phase === 'gameover') return state.level >= 6 ? 'europe' : 'usa';
  return 'europe';
}

export function currentMap(state: GameState): MapState {
  return state.maps[zoneOf(state)];
}

function isFreeSpace(map: MapState, t: Terrain, x: number, y: number): boolean {
  return (
    isLand(t, x, y) &&
    !map.visited.includes(`${x},${y}`) &&
    !has(map.shops, x, y) &&
    !has(map.races, x, y) &&
    !(map.final.x === x && map.final.y === y)
  );
}

function addRace(map: MapState, t: Terrain, x: number, y: number): boolean {
  if (map.races.length >= MAX_RACES_ON_MAP || !isFreeSpace(map, t, x, y)) return false;
  if (isLand(t, x + 2, y) && isLand(t, x - 2, y) && isLand(t, x, y + 1) && isLand(t, x, y - 1)) {
    map.races.push({ x, y });
    return true;
  }
  return false;
}

/** Spreads the races across five vertical bands of the map, like Map::spawnRaces. */
function spawnRaces(map: MapState, t: Terrain, rng: Rng) {
  let left = 1;
  const band = Math.floor(t.width / (MAX_RACES_ON_MAP + 1));
  let tries = 0;
  while (map.races.length < MAX_RACES_ON_MAP && tries < 5000) {
    tries++;
    let x = left + rng.int(band);
    x = x - 1 + (x % 2);
    const y = 1 + rng.int(t.height - 2);
    if (addRace(map, t, x, y)) left += Math.floor(t.width / MAX_RACES_ON_MAP);
  }
  // fix: never loop forever on an unusual map; fill any remaining races anywhere valid.
  for (let y = 1; y < t.height - 1 && map.races.length < MAX_RACES_ON_MAP; y++) {
    for (let x = 1; x < t.width - 1 && map.races.length < MAX_RACES_ON_MAP; x += 2) {
      if (rng.int(4) === 0) addRace(map, t, x, y);
    }
  }
}

export type Direction = 'up' | 'down' | 'left' | 'right';
// Columns are half as wide as rows are tall in the map files, so horizontal steps are two columns.
export const DIRS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -2, y: 0 },
  right: { x: 2, y: 0 },
};

export function canStand(data: GameData, zone: Zone, x: number, y: number) {
  return isLand(data.maps[zone], x, y);
}

/** Moves the rider; 1 in 10 steps onto a new cell turns out to be a town with a bike shop. */
export function move(state: GameState, data: GameData, dir: Direction, rng: Rng): { moved: boolean; shopFound: boolean } {
  const map = currentMap(state);
  const t = data.maps[map.zone];
  const nx = map.player.x + DIRS[dir].x;
  const ny = map.player.y + DIRS[dir].y;
  if (!isLand(t, nx, ny)) return { moved: false, shopFound: false };
  map.player = { x: nx, y: ny };
  let shopFound = false;
  if (rng.int(10) === 3 && map.shops.length < map.maxShops && isFreeSpace(map, t, nx, ny)) {
    if (isLand(t, nx + 1, ny) && isLand(t, nx - 1, ny) && isLand(t, nx, ny + 1) && isLand(t, nx, ny - 1)) {
      map.shops.push({ x: nx, y: ny });
      shopFound = true;
    }
  }
  const k = key(map.player);
  if (!map.visited.includes(k)) map.visited.push(k);
  return { moved: true, shopFound };
}

export type Location = 'shop' | 'race' | 'final' | 'open';

export function locationOf(state: GameState): Location {
  const map = currentMap(state);
  const { x, y } = map.player;
  if (has(map.shops, x, y)) return 'shop';
  if (has(map.races, x, y)) return 'race';
  if (map.final.x === x && map.final.y === y) return 'final';
  return 'open';
}

export function requiredPoints(level: number): number {
  return 75 * level * level;
}

/**
 * Shop price multiplier by level. The original raised prices 17% per level; parts now cost their real-world
 * price at every level, so this is 1. Kept so the rule has one place to change.
 */
export function shopMultiplier(_level: number): number {
  return 1;
}

export function levelUp(state: GameState) {
  if (state.level < 6 || currentMap(state).races.length === 0) state.level++;
}

// ---------------------------------------------------------------- rider

export function modStat(r: Racer, stat: StatName, rate: number) {
  const v = r[stat];
  let next: number;
  if (rate > 0) next = v + rate * (102 - v);
  else next = v + (stat === 'skill' ? rate / 2 : rate) * v;
  r[stat] = Math.trunc(next);
}

export const DEFAULT_ATTRS: Attrs = { speed: 6, durability: 6, playfulness: 6, lightness: 6 };

export function partAttrs(p: Part | null | undefined): Attrs {
  return p?.attrs ?? DEFAULT_ATTRS;
}

/** The bike's ride attributes: the average of its four parts (a missing part counts as average). */
export function bikeAttrs(r: Racer): Attrs {
  const out = { ...DEFAULT_ATTRS };
  for (const k of ATTR_NAMES) {
    out[k] = Math.round((PART_SLOTS.reduce((sum, slot) => sum + partAttrs(r.parts[slot])[k], 0) / PART_SLOTS.length) * 2) / 2;
  }
  return out;
}

/** Multiplier from an attribute: 1 at an average (6) rating, ±`per` for each point above or below. */
function attrFactor(value: number, per: number): number {
  return 1 + (value - 6) * per;
}

export function bikeHealth(r: Racer): number {
  const sum = PART_SLOTS.reduce((s, slot) => s + (r.parts[slot]?.quality ?? 0), 0);
  return Math.trunc(sum / 4);
}

export interface StatDelta {
  name: string;
  before: number;
  after: number;
}

/** Eat a trail snack: every stat recovers 10–29% of the way back to the top. */
export function eat(state: GameState, rng: Rng): StatDelta[] | null {
  const p = state.player;
  if (p.snacks <= 0) return null;
  const rate = (10 + rng.int(20)) / 100;
  const out: StatDelta[] = [];
  for (const s of ['strength', 'skill', 'endurance', 'mental'] as StatName[]) {
    const before = p[s];
    modStat(p, s, rate);
    out.push({ name: s, before, after: p[s] });
  }
  p.snacks--;
  return out;
}

/** Use a toolkit: each working part gets back a random chunk of its missing health. */
export function repair(state: GameState, rng: Rng): StatDelta[] | null {
  const p = state.player;
  if (p.toolkits <= 0) return null;
  const out: StatDelta[] = [];
  for (const slot of PART_SLOTS) {
    const part = p.parts[slot];
    if (!part || part.quality <= 0) continue;
    const before = part.quality;
    const steps = Math.trunc((part.max + 5 - part.quality) / 5);
    if (steps > 0) part.quality += rng.int(steps) * 5;
    out.push({ name: slot, before, after: part.quality });
  }
  p.toolkits--;
  return out;
}

// ---------------------------------------------------------------- racing

/** Why the rider can't race right now, or null when they can. */
export function raceBlocker(r: Racer): string | null {
  if (PART_SLOTS.some((s) => !r.parts[s] || r.parts[s]!.quality <= 0)) {
    return 'Looks like you are missing some parts for your bike! Head to a shop to get more parts.';
  }
  // fix: the original crashed when racing with no tires at all.
  if (!r.tires.length || r.tires[0] <= 0) {
    return 'You have no tires with tread left. Head to a shop to buy some.';
  }
  if (r.strength <= 10 || r.skill <= 10 || r.endurance <= 10 || r.mental <= 10) {
    return "Hmm... You really aren't fit enough to do another race. Eat some snacks and come back once your stats are better!";
  }
  return null;
}

export interface RacePick {
  race: RaceDef;
  index: number;
}

/** Chooses which race runs: the next level up on the map, the zone final, or any local race at or below your level. */
export function pickRace(state: GameState, kind: RaceKind, rng: Rng): RacePick | null {
  const target = kind === 'map' ? state.level + 1 : kind === 'final' ? FINAL_LEVEL[zoneOf(state)] : state.level;
  const pool: number[] = [];
  state.races.forEach((r, i) => {
    if (kind === 'local' ? r.level <= state.level : r.level === target) pool.push(i);
  });
  if (pool.length) {
    const index = pool[rng.int(pool.length)];
    return { race: state.races[index], index };
  }
  if (target < 1) return null;
  // fix: once every named race is won the original could soft-lock; club races never run out.
  return { race: clubRace(target, rng), index: -1 };
}

export function startRace(state: GameState, data: GameData, kind: RaceKind, pick: RacePick, rng: Rng): RaceSession {
  state.money -= pick.race.entryFee;
  state.stats.entered++;
  const topTime = pick.race.time;
  const session: RaceSession = {
    race: pick.race,
    raceIndex: pick.index,
    kind,
    section: 0,
    feature: rng.int(data.terrain.length),
    usedFeatures: [],
    topTime,
    gap: 0,
    splits: [],
    status: 'start',
  };
  state.activeRace = session;
  return session;
}

/** Whether to offer a fresh tire before the start (the mounted one won't last the race). */
export function tireIsLow(r: Racer, race: RaceDef): boolean {
  return r.tires.length > 1 && r.tires[0] < race.length;
}

export function swapTire(r: Racer) {
  if (r.tires.length > 1) r.tires.shift();
}

export function turningPoint(level: number): number {
  return 40 + 5 * level;
}

/**
 * Chance of an injury crash from riding a line beyond your ability: a stat line when that stat is below
 * the level's pace, or the whoops on a worn-out bike. Safe "lose time" lines carry no risk. (New: the
 * original only had a flat 1% bad-luck crash, which is still there and never injures.)
 */
export function crashRisk(r: Racer, modifier: string, level: number): number {
  const forgiving = attrFactor(bikeAttrs(r).playfulness, -0.06); // a playful bike is more forgiving
  if (modifier === 'strength' || modifier === 'skill' || modifier === 'endurance') {
    const tp = turningPoint(level);
    return Math.max(0, (tp - r[modifier]) / tp) * 0.3 * forgiving;
  }
  if (modifier === 'bike') {
    return Math.max(0, (30 - bikeHealth(r)) / 30) * 0.2 * forgiving;
  }
  return 0;
}

function damage(part: Part | null, rate: number) {
  if (part) part.quality += Math.trunc(part.quality * -rate);
}

/** Ride one trail section with the chosen line (1-based), mirroring the loop in Game::ride. */
export function rideSection(state: GameState, data: GameData, s: RaceSession, choice: number, rng: Rng): SectionOutcome {
  const p = state.player;
  const level = s.race.level;
  const feature = data.terrain[s.feature];
  const option = feature.options[choice - 1] ?? feature.options[0];
  const modifier = option.modifier;
  const split = Math.trunc(s.topTime / (s.feature + 2));
  s.topTime -= split;
  const gapBefore = s.gap;
  const out: SectionOutcome = {
    feature: s.feature,
    choice,
    modifier,
    gapBefore,
    gapAfter: s.gap,
    damage: [],
    tireLife: 0,
    risk: crashRisk(p, modifier, level),
  };
  const errorRoll = rng.int(1000) < out.risk * 1000;

  const bike = bikeAttrs(p);
  // A light bike tires the rider less; a fast one turns the same effort into more time.
  let rate = ((15 + rng.int(10)) / 100) * attrFactor(bike.lightness, -0.04);
  const mentalEffect = p.mental / 100;
  const dial = split % 10000;
  let tp = turningPoint(level);
  if (modifier === 'strength' || modifier === 'skill' || modifier === 'endurance') {
    const before = p[modifier];
    modStat(p, modifier, -rate);
    let delta = dial * mentalEffect * (p[modifier] / tp - 1);
    delta *= delta > 0 ? attrFactor(bike.speed, 0.03) : attrFactor(bike.speed, -0.02);
    if (modifier === 'skill') delta += Math.abs(dial) * (bike.playfulness - 6) * 0.004; // playful bikes shine on skill lines
    s.gap = Math.trunc(s.gap + delta);
    out.stat = { name: modifier, before, after: p[modifier] };
  } else if (modifier === 'time') {
    s.gap -= 750;
  }

  // Durable parts wear more slowly.
  rate = ((5 + rng.int(level * 5)) / 100) * attrFactor(bike.durability, -0.05);
  const hit = rng.int(4);
  const slots: PartSlot[] = modifier === 'bike' ? PART_SLOTS : [PART_SLOTS[hit]];
  for (const slot of slots) {
    const before = p.parts[slot]?.quality ?? 0;
    damage(p.parts[slot], rate);
    out.damage.push({ slot, before, after: p.parts[slot]?.quality ?? 0 });
  }

  if (p.tires.length && p.tires[0] > 0) p.tires[0]--;
  out.tireLife = p.tires[0] ?? 0;
  if ((p.tires[0] ?? 0) <= 0) {
    modStat(p, 'mental', -rate * 2);
    p.tires.shift(); // fix: a flat tire is thrown away instead of staying mounted
    s.status = 'flat';
  } else if (PART_SLOTS.some((slot) => (p.parts[slot]?.quality ?? 0) <= 0)) {
    modStat(p, 'mental', -rate * 2);
    s.status = 'broken';
  } else if (errorRoll) {
    modStat(p, 'mental', -rate * 2);
    p.injuries++;
    out.injury = true;
    s.status = 'crash';
  } else if (rng.int(100) === 13) {
    modStat(p, 'mental', -rate * 2);
    s.status = 'crash';
  } else {
    tp = 30;
    const health = bikeHealth(p);
    s.gap = Math.trunc(s.gap + dial * ((health - tp) / 2 / tp));
    s.section++;
    s.splits.push(s.gap);
    if (s.section >= s.race.length) {
      s.status = 'finished';
    } else {
      const options = data.terrain.length;
      if (s.usedFeatures.length === options - 1) s.usedFeatures = [s.feature];
      else s.usedFeatures.push(s.feature);
      if (options > 1) {
        while (s.usedFeatures.includes(s.feature)) s.feature = rng.int(options);
      }
    }
  }
  out.gapAfter = s.gap;
  s.last = out;
  return out;
}

export interface RaceResult {
  /** 1–3 for a podium, 0 for off the podium, null when the rider did not finish. */
  placement: number | null;
  points: number;
  prize: number;
  gap: number;
  levelUp: boolean;
  zoneComplete: boolean;
  champion: boolean;
}

export function placementFor(s: RaceSession): number {
  if (s.gap > 0) return 1;
  // fix: the original compared a negative margin, so every loss counted as second place.
  const margin = -s.gap / s.race.time;
  if (margin < 0.005) return 2;
  if (margin < 0.01) return 3;
  return 0;
}

export function addPoints(r: Racer, n: number) {
  r.points = Math.max(1, r.points + n);
}

/** Pays out a finished (or abandoned) race and applies what it means for the map and the season. */
export function settleRace(state: GameState, s: RaceSession): RaceResult {
  const result: RaceResult = {
    placement: null,
    points: 0,
    prize: 0,
    gap: s.gap,
    levelUp: false,
    zoneComplete: false,
    champion: false,
  };
  state.activeRace = undefined;
  if (s.status === 'quit') {
    addPoints(state.player, -QUIT_PENALTY);
    result.points = -QUIT_PENALTY;
    return result;
  }
  if (s.status !== 'finished') {
    checkGameOver(state);
    return result;
  }

  const level = s.race.level / 7;
  const placement = placementFor(s);
  result.placement = placement;
  result.points = Math.trunc(level * [-125, 275, 175, 125][placement]);
  result.prize = Math.trunc(level * level * PRIZES[placement]);
  addPoints(state.player, result.points);
  state.money += result.prize;
  if (placement === 1) state.stats.wins++;
  if (placement > 0) {
    state.stats.podiums++;
    if (s.raceIndex >= 0) state.races.splice(s.raceIndex, 1);
    const map = currentMap(state);
    if (s.kind === 'map') {
      const before = state.level;
      levelUp(state);
      result.levelUp = state.level > before;
      map.won.push({ ...map.player });
      map.races = map.races.filter((r) => !(r.x === map.player.x && r.y === map.player.y));
    } else if (s.kind === 'final') {
      addPoints(state.player, FINAL_BONUS);
      result.zoneComplete = true;
      map.won.push({ ...map.player });
      if (state.phase === 'usa') {
        const before = state.level;
        state.phase = 'europe';
        levelUp(state);
        result.levelUp = state.level > before;
      } else {
        state.phase = 'champion';
        result.champion = true;
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------- shop

export interface Cart {
  /** Index into the shop's list for that slot. */
  parts: Partial<Record<PartSlot, number>>;
  tires: number;
  snacks: number;
  toolkits: number;
}

export function emptyCart(): Cart {
  return { parts: {}, tires: 0, snacks: 0, toolkits: 0 };
}

export function priceAt(base: number, level: number): number {
  return Math.trunc(base * shopMultiplier(level));
}

export function maxAdd(r: Racer, what: Consumable): number {
  if (what === 'tires') return MAX_TIRES - r.tires.length;
  if (what === 'snacks') return MAX_SNACKS - r.snacks;
  return MAX_TOOLS - r.toolkits;
}

export interface CartSummary {
  subtotal: number;
  tradeIn: number;
  total: number;
  canAfford: boolean;
  empty: boolean;
}

export function summarizeCart(state: GameState, data: GameData, cart: Cart): CartSummary {
  const mult = shopMultiplier(state.level);
  let subtotal = 0;
  let tradeIn = 0;
  for (const slot of PART_SLOTS) {
    const idx = cart.parts[slot];
    if (idx === undefined) continue;
    const item = data.shop.parts[slot][idx];
    subtotal += priceAt(item.price, state.level);
    const owned = state.player.parts[slot];
    if (owned) tradeIn += Math.trunc(((owned.price * mult) * owned.quality) / 100);
  }
  for (const c of Object.keys(UNIT_PRICES) as Consumable[]) {
    subtotal += cart[c] * priceAt(UNIT_PRICES[c], state.level);
  }
  const total = subtotal - tradeIn;
  const empty = subtotal === 0;
  return { subtotal, tradeIn, total, canAfford: total <= state.money, empty };
}

export function checkout(state: GameState, data: GameData, cart: Cart): boolean {
  const sum = summarizeCart(state, data, cart);
  if (!sum.canAfford || sum.empty) return false;
  const p = state.player;
  for (const slot of PART_SLOTS) {
    const idx = cart.parts[slot];
    if (idx === undefined) continue;
    p.parts[slot] = { ...data.shop.parts[slot][idx] };
  }
  for (let i = 0; i < Math.min(cart.tires, maxAdd(p, 'tires')); i++) p.tires.push(TIRE_LIFE);
  p.snacks += Math.min(cart.snacks, maxAdd(p, 'snacks'));
  p.toolkits += Math.min(cart.toolkits, maxAdd(p, 'toolkits'));
  state.money -= sum.total;
  return true;
}

// ---------------------------------------------------------------- sponsors and game over

/**
 * How much money the rider is short of being able to race competitively again: the cheapest part for every
 * missing or broken slot, one tire if none are left, one snack if they are too worn out to ride and one
 * toolkit if the bike is nearly worn out. Zero when none of that is needed or they can already afford it.
 */
export function sponsorShortfall(state: GameState, data: GameData): number {
  const p = state.player;
  const worn = bikeHealth(p) < 30 && p.toolkits === 0;
  if (!raceBlocker(p) && !worn) return 0;
  let need = worn ? priceAt(UNIT_PRICES.toolkits, state.level) : 0;
  for (const slot of PART_SLOTS) {
    if (p.parts[slot] && p.parts[slot]!.quality > 0) continue;
    need += Math.min(...data.shop.parts[slot].map((it) => priceAt(it.price, state.level)));
  }
  if (!p.tires.length || p.tires[0] <= 0) need += priceAt(UNIT_PRICES.tires, state.level);
  if (p.snacks === 0 && (p.strength <= 10 || p.skill <= 10 || p.endurance <= 10 || p.mental <= 10)) {
    need += priceAt(UNIT_PRICES.snacks, state.level);
  }
  return Math.max(0, need - state.money);
}

/** A sponsor covers the shortfall, then drops you. Returns the amount paid. */
export function sponsorBailout(state: GameState, data: GameData): number {
  const amount = sponsorShortfall(state, data);
  if (amount <= 0 || state.sponsors <= 0) return 0;
  state.money += amount;
  state.sponsors--;
  return amount;
}

/**
 * Ends the season when the rider is out for good: too injured to ride, or unable to race, unable to
 * pay for what they need and with no sponsor left to call.
 */
export function checkGameOver(state: GameState, data?: GameData): boolean {
  if (state.phase === 'champion' || state.phase === 'gameover') return state.phase === 'gameover';
  if (state.player.injuries >= MAX_INJURIES) state.gameOver = 'injury';
  else if (data && raceBlocker(state.player) && sponsorShortfall(state, data) > 0 && state.sponsors <= 0) {
    state.gameOver = 'broke';
  }
  if (state.gameOver) {
    state.phase = 'gameover';
    state.activeRace = undefined;
    return true;
  }
  return false;
}
