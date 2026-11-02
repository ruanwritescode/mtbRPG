import { describe, expect, it } from 'vitest';
import { gameData as data } from '../src/data';
import { isLand } from '../src/engine/parse';
import { seededRng } from '../src/engine/rng';
import * as G from '../src/engine/game';
import { playSeason } from './bot';

describe('data files', () => {
  it('parses both maps with valid start and final cells', () => {
    for (const zone of ['usa', 'europe'] as const) {
      const t = data.maps[zone];
      expect(t.rows.length).toBe(t.height);
      expect(isLand(t, t.start.x, t.start.y)).toBe(true);
      expect(isLand(t, t.final.x, t.final.y)).toBe(true);
    }
    expect(data.maps.usa).toMatchObject({ width: 65, height: 19, maxShops: 20, start: { x: 25, y: 7 } });
  });

  it('parses the shop inventory', () => {
    expect(data.shop.parts.frame[0]).toMatchObject({ name: 'Specialized Demo 11', price: 6500, quality: 100, max: 100 });
    for (const list of Object.values(data.shop.parts)) expect(list.length).toBeGreaterThanOrEqual(5);
  });

  it('parses races and terrain features', () => {
    expect(data.raceList).toHaveLength(25);
    expect(data.raceList.at(-1)).toEqual({ name: 'Val Di Sole World Championship', level: 8 });
    expect(data.terrain).toHaveLength(8);
    expect(data.terrain[0].title).toBe('Line Choice Section');
    expect(data.terrain[0].options.map((o) => o.modifier)).toEqual(['strength', 'skill', 'time']);
    expect(data.terrain[4].options).toEqual([{ label: 'Hold on tight!', tag: 'Bike', modifier: 'bike' }]);
    expect(data.terrain[6].options.map((o) => o.label)).toEqual(['Send It!', 'Chicken Line']);
    expect(data.starts).toHaveLength(4);
  });
});

describe('part attributes', () => {
  it('rates every shop part and the tire on four 1-10 attributes', () => {
    for (const list of Object.values(data.shop.parts)) {
      for (const part of list) {
        expect(part.attrs, part.name).toBeDefined();
        for (const v of Object.values(part.attrs!)) expect(v).toBeGreaterThanOrEqual(1);
      }
    }
    expect(data.attrs['Tire']).toBeDefined();
  });

  it('gives the frames distinct characters', () => {
    const f = Object.fromEntries(data.shop.parts.frame.map((p) => [p.name, p.attrs!]));
    expect(f['Commencal Supreme V5'].durability).toBeGreaterThan(f['Santa Cruz V10'].durability);
    expect(f['Santa Cruz V10'].playfulness).toBeGreaterThan(f['Commencal Supreme V5'].playfulness);
    expect(f['Pivot Phoenix'].lightness).toBeGreaterThan(f['Commencal Supreme V5'].lightness);
  });

  it('prices parts by usefulness: within a slot a dearer part has higher ratings and health', () => {
    for (const list of Object.values(data.shop.parts)) {
      const sorted = [...list].sort((a, b) => b.price - a.price);
      const total = (p: (typeof list)[number]) => Object.values(p.attrs!).reduce((x, y) => x + y, 0);
      for (let i = 1; i < sorted.length; i++) {
        expect(total(sorted[i - 1]), `${sorted[i - 1].name} vs ${sorted[i].name}`).toBeGreaterThanOrEqual(total(sorted[i]));
        expect(sorted[i - 1].max).toBeGreaterThanOrEqual(sorted[i].max);
      }
    }
  });

  it('averages the bike and makes a playful bike more forgiving', () => {
    const s = G.createGame('A', data, seededRng(7));
    s.money = 20000;
    const cart = G.emptyCart();
    cart.parts = { frame: 0, suspension: 0, brakes: 0, wheels: 0 };
    expect(G.checkout(s, data, cart)).toBe(true);
    const a = G.bikeAttrs(s.player);
    expect(a.speed).toBeGreaterThanOrEqual(9);
    expect(G.bikeAttrs(s.player).playfulness).toBeGreaterThanOrEqual(8);
    s.player.strength = 30;
    const stiff = G.crashRisk(s.player, 'strength', 7);
    for (const slot of ['frame', 'suspension', 'brakes', 'wheels'] as const) s.player.parts[slot]!.attrs = { speed: 6, durability: 6, playfulness: 10, lightness: 6 };
    expect(G.crashRisk(s.player, 'strength', 7)).toBeLessThan(stiff);
  });
});

describe('game rules', () => {
  it('starts a new game like the original', () => {
    const s = G.createGame('Demi', data, seededRng(1));
    expect(s.money).toBe(8000);
    expect(s.level).toBe(0);
    expect(s.maps.usa.races).toHaveLength(5);
    expect(s.maps.europe.races).toHaveLength(5);
    for (const r of s.maps.usa.races) expect(r.x % 2).toBe(1);
    expect(s.player.strength).toBeGreaterThanOrEqual(65);
    expect(s.player.mental).toBe(100);
  });

  it('only moves onto land, two columns at a time horizontally', () => {
    const s = G.createGame('A', data, seededRng(2));
    const before = { ...s.maps.usa.player };
    const r = G.move(s, data, 'right', seededRng(3));
    expect(r.moved).toBe(true);
    expect(s.maps.usa.player).toEqual({ x: before.x + 2, y: before.y });
    // Walk up until blocked by the coast.
    for (let i = 0; i < 40; i++) G.move(s, data, 'up', seededRng(i));
    const t = data.maps.usa;
    expect(isLand(t, s.maps.usa.player.x, s.maps.usa.player.y - 1)).toBe(false);
  });

  it('applies stat changes with the original formulas', () => {
    const r = G.newRacer('x', seededRng(1));
    r.strength = 80;
    G.modStat(r, 'strength', -0.2);
    expect(r.strength).toBe(64);
    r.skill = 80;
    G.modStat(r, 'skill', -0.2);
    expect(r.skill).toBe(72);
    r.mental = 50;
    G.modStat(r, 'mental', 0.25);
    expect(r.mental).toBe(63);
  });

  it('prices the shop with the level multiplier and trades in old parts', () => {
    const s = G.createGame('A', data, seededRng(4));
    const cart = G.emptyCart();
    cart.parts.frame = 0;
    cart.tires = 2;
    expect(G.summarizeCart(s, data, cart)).toMatchObject({ subtotal: 6690, tradeIn: 0, canAfford: true });
    expect(G.checkout(s, data, cart)).toBe(true);
    expect(s.money).toBe(8000 - 6690);
    expect(s.player.tires).toEqual([20, 20]);
    s.level = 1;
    s.player.parts.frame!.quality = 50;
    const swap = G.emptyCart();
    swap.parts.frame = data.shop.parts.frame.findIndex((p) => p.name === 'Commencal Supreme V5');
    const sum = G.summarizeCart(s, data, swap);
    expect(sum.subtotal).toBe(2900);
    expect(sum.tradeIn).toBe(Math.trunc((6500 * 50) / 100));
  });

  it('blocks racing without a complete bike and tires', () => {
    const s = G.createGame('A', data, seededRng(5));
    expect(G.raceBlocker(s.player)).toMatch(/missing some parts/);
    const cart = G.emptyCart();
    cart.parts = { frame: 4, suspension: 4, brakes: 4, wheels: 4 };
    G.checkout(s, data, cart);
    expect(G.raceBlocker(s.player)).toMatch(/tires/);
  });

  it('places losses by margin instead of always awarding second', () => {
    const base = G.makeRace('Test', 3, seededRng(1));
    const session = { race: { ...base, time: 300000 }, gap: -100 } as Parameters<typeof G.placementFor>[0];
    expect(G.placementFor(session)).toBe(2);
    session.gap = -2000;
    expect(G.placementFor(session)).toBe(3);
    session.gap = -5000;
    expect(G.placementFor(session)).toBe(0);
    session.gap = 1;
    expect(G.placementFor(session)).toBe(1);
  });

  it('runs a race section by section', () => {
    const rng = seededRng(9);
    const s = G.createGame('A', data, rng);
    const cart = G.emptyCart();
    cart.parts = { frame: 2, suspension: 2, brakes: 2, wheels: 2 };
    cart.tires = 2;
    G.checkout(s, data, cart);
    const pick = G.pickRace(s, 'map', rng)!;
    expect(pick.race.level).toBe(1);
    s.maps.usa.player = { ...s.maps.usa.races[0] };
    const session = G.startRace(s, data, 'map', pick, rng);
    expect(s.money).toBeLessThan(8000);
    session.status = 'running';
    let guard = 0;
    while (session.status === 'running' && guard++ < 50) G.rideSection(s, data, session, 1, rng);
    expect(['finished', 'crash', 'flat', 'broken']).toContain(session.status);
    const res = G.settleRace(s, session, rng);
    expect(s.activeRace).toBeUndefined();
    if (res.placement) {
      expect(s.level).toBe(1);
      expect(s.maps.usa.won).toHaveLength(1);
      expect(s.maps.usa.races).toHaveLength(4);
    }
  });

  it('charges points for quitting a race', () => {
    const rng = seededRng(10);
    const s = G.createGame('A', data, rng);
    s.player.points = 50;
    const session = G.startRace(s, data, 'local', { race: G.makeRace('X', 1, rng), index: -1 }, rng);
    session.status = 'quit';
    G.settleRace(s, session, rng);
    expect(s.player.points).toBe(30);
  });
});

describe('fuel', () => {
  it('uses a gallon per step and stops the van when the tank is dry', () => {
    const s = G.createGame('A', data, seededRng(11));
    expect(s.fuel).toBe(G.FUEL_TANK);
    const before = s.fuel;
    const r = G.move(s, data, 'right', seededRng(1));
    if (r.moved) expect(s.fuel).toBe(before - 1);
    s.fuel = 0;
    const pos = { ...s.maps.usa.player };
    expect(G.move(s, data, 'left', seededRng(2))).toMatchObject({ moved: false, noFuel: true });
    expect(s.maps.usa.player).toEqual(pos);
  });

  it('fills up only at stations, and delivers anywhere at a markup', () => {
    const s = G.createGame('A', data, seededRng(12));
    s.fuel = 10;
    expect(G.atFuelStation(s)).toBe(false);
    expect(G.refuel(s)).toBeNull();
    const money = s.money;
    expect(G.refuel(s, true)).toEqual({ gallons: G.DELIVERY_GALLONS, cost: G.DELIVERY_GALLONS * G.FUEL_PRICE.usa * G.DELIVERY_MARKUP });
    expect(s.money).toBe(money - G.DELIVERY_GALLONS * G.FUEL_PRICE.usa * G.DELIVERY_MARKUP);
    s.maps.usa.shops.push({ ...s.maps.usa.player });
    expect(G.refuel(s)).toEqual({ gallons: G.FUEL_TANK - 15, cost: (G.FUEL_TANK - 15) * G.FUEL_PRICE.usa });
    expect(s.fuel).toBe(G.FUEL_TANK);
  });

  it('is game over when stranded with no fuel, no money and no sponsors', () => {
    const s = G.createGame('A', data, seededRng(13));
    s.fuel = 0;
    s.money = 0;
    s.sponsors = 0;
    expect(G.checkGameOver(s, data)).toBe(true);
    expect(s.gameOver).toBe('broke');
  });
});

describe('sponsors, injuries and game over', () => {
  it('rates lines beyond your ability as risky', () => {
    const r = G.newRacer('x', seededRng(1));
    r.strength = 90;
    expect(G.crashRisk(r, 'strength', 3)).toBe(0);
    r.strength = 30; // pace at level 7 is 75
    expect(G.crashRisk(r, 'strength', 7)).toBeCloseTo(0.18);
    expect(G.crashRisk(r, 'time', 7)).toBe(0);
  });

  it('ends the career after three injuries', () => {
    const s = G.createGame('A', data, seededRng(1));
    s.player.injuries = G.MAX_INJURIES;
    expect(G.checkGameOver(s, data)).toBe(true);
    expect(s).toMatchObject({ phase: 'gameover', gameOver: 'injury' });
  });

  it('lets sponsors bail you out until they run out, then it is game over', () => {
    const s = G.createGame('A', data, seededRng(2));
    s.money = 0;
    expect(s.sponsors).toBe(3);
    expect(G.checkGameOver(s, data)).toBe(false);
    const paid = G.sponsorBailout(s, data);
    expect(paid).toBeGreaterThan(0);
    expect(s.money).toBe(paid);
    expect(s.sponsors).toBe(2);
    s.money = 0;
    s.sponsors = 0;
    expect(G.sponsorBailout(s, data)).toBe(0);
    expect(G.checkGameOver(s, data)).toBe(true);
    expect(s.gameOver).toBe('broke');
  });

  it('is not game over while you can still race, even in debt', () => {
    const s = G.createGame('A', data, seededRng(3));
    const cart = G.emptyCart();
    cart.parts = { frame: 4, suspension: 4, brakes: 4, wheels: 4 };
    cart.tires = 1;
    G.checkout(s, data, cart);
    s.money = -500;
    s.sponsors = 0;
    expect(G.checkGameOver(s, data)).toBe(false);
  });
});

describe('full season', () => {
  it('can be finished by a simple bot', () => {
    const results = Array.from({ length: 12 }, (_, i) => playSeason(seededRng(100 + i)));
    const done = results.filter((r) => r.done);
    // Print a short summary for balancing.
    console.log(
      results.map((r) => `${r.done ? 'WIN ' : 'STUCK'} races=${r.races} steps=${r.steps} lvl=${r.state.level} rank=${G.rankOf(r.state)} pts=${r.state.player.points} $${r.state.money} ${r.stuck ?? ''}`).join('\n'),
    );
    expect(done.length).toBeGreaterThanOrEqual(6);
  });
});

describe('rivals and venues', () => {
  it('names every race flag and the final, and shops as they are found', () => {
    const rng = seededRng(21);
    const s = G.createGame('A', data, rng);
    const map = s.maps.usa;
    for (const p of map.races) expect(G.placeName(map, p)).toBeTruthy();
    expect(G.placeName(map, map.final)).toBe('Snowshoe');
    expect(G.placeName(s.maps.europe, s.maps.europe.final)).toBe('Val di Sole');
    expect(new Set(map.races.map((p) => G.placeName(map, p))).size).toBe(map.races.length);
  });

  it('builds a results table that agrees with the placement', () => {
    const rng = seededRng(5);
    const s = G.createGame('Demi', data, rng);
    s.player.points = 1000;
    const session = G.startRace(s, data, 'local', { race: { ...G.makeRace('Test', 3, rng) }, index: -1 }, rng);
    expect(session.field!.length).toBeGreaterThan(3);
    session.status = 'finished';
    session.gap = 1500; // ahead: a win
    const win = G.settleRace(s, session, rng);
    expect(win.placement).toBe(1);
    expect(win.position).toBe(1);
    expect(win.rows[0].id).toBeNull();
    expect(win.rows.length).toBe(session.field!.length + 1);
    for (let i = 1; i < win.rows.length; i++) expect(win.rows[i].time!).toBeGreaterThanOrEqual(win.rows[i - 1].time!);
    expect(s.trophies).toHaveLength(1);
    // A loss well off the podium.
    const s2 = G.createGame('Demi', data, seededRng(6));
    const ses2 = G.startRace(s2, data, 'local', { race: G.makeRace('Test', 3, rng), index: -1 }, rng);
    ses2.status = 'finished';
    ses2.gap = -Math.trunc(ses2.race.time * 0.03);
    const loss = G.settleRace(s2, ses2, rng);
    expect(loss.placement).toBe(0);
    expect(loss.position).toBeGreaterThan(3);
    expect(loss.rows[loss.position - 1].id).toBeNull();
    expect(loss.rows[0].time).toBe(ses2.race.time);
  });

  it('ranks a rookie last and a world cup winner near the top', () => {
    const s = G.createGame('A', data, seededRng(3));
    expect(G.rankOf(s)).toBe(33);
    s.player.points = 5000;
    expect(G.rankOf(s)).toBe(1);
    expect(G.standingsTable(s)[0].id).toBeNull();
    expect(G.tierName(0)).toBe('Rookie');
    expect(G.tierName(8)).toBe('World Champion');
  });

  it('runs the World Cup that matches the venue you are standing at', () => {
    const rng = seededRng(8);
    const s = G.createGame('A', data, rng);
    s.phase = 'europe';
    s.level = 6;
    const map = s.maps.europe;
    map.player = { ...map.races[0] };
    const venue = G.placeName(map, map.player)!;
    const pick = G.pickRace(s, 'map', rng)!;
    expect(pick.race.name).toBe(`World Cup ${venue}`);
    expect(pick.race.venue).toBe(venue);
  });
});

describe('saves from older versions', () => {
  it('fills in rankings, venues, kit and stats that an old save lacks', () => {
    const rng = seededRng(30);
    const s = G.createGame('Old', data, rng) as unknown as Record<string, unknown>;
    delete s.standings;
    delete s.trophies;
    delete s.fuel;
    const old = s as unknown as ReturnType<typeof G.createGame>;
    delete old.player.kit;
    for (const map of Object.values(old.maps)) {
      delete map.names;
      delete map.regions;
      delete map.towns;
      map.shops.push({ x: map.player.x, y: map.player.y });
    }
    G.normalize(old, rng);
    expect(old.fuel).toBe(G.FUEL_TANK);
    expect(old.player.kit).toBe(0);
    expect(Object.keys(old.standings!).length).toBeGreaterThan(20);
    expect(G.placeName(old.maps.usa, old.maps.usa.final)).toBe('Snowshoe');
    expect(G.placeName(old.maps.usa, old.maps.usa.shops[0])).toMatch(/\w+ /);
    expect(G.rankOf(old)).toBeGreaterThan(1);
  });
});
