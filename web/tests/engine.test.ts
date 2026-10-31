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
    expect(data.shop.parts.frame[0]).toEqual({ name: 'Commencal Supreme V5', price: 3000, quality: 100, max: 100 });
    for (const list of Object.values(data.shop.parts)) expect(list).toHaveLength(5);
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

describe('game rules', () => {
  it('starts a new game like the original', () => {
    const s = G.createGame('Demi', data, seededRng(1));
    expect(s.money).toBe(6050);
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
    expect(G.summarizeCart(s, data, cart)).toMatchObject({ subtotal: 3180, tradeIn: 0, canAfford: true });
    expect(G.checkout(s, data, cart)).toBe(true);
    expect(s.money).toBe(6050 - 3180);
    expect(s.player.tires).toEqual([20, 20]);
    s.level = 1;
    s.player.parts.frame!.quality = 50;
    const swap = G.emptyCart();
    swap.parts.frame = 4; // Santa Cruz V10, 2550
    const sum = G.summarizeCart(s, data, swap);
    expect(sum.subtotal).toBe(Math.trunc(2550 * 1.17));
    expect(sum.tradeIn).toBe(Math.trunc((3000 * 1.17 * 50) / 100));
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
    expect(s.money).toBeLessThan(6050);
    session.status = 'running';
    let guard = 0;
    while (session.status === 'running' && guard++ < 50) G.rideSection(s, data, session, 1, rng);
    expect(['finished', 'crash', 'flat', 'broken']).toContain(session.status);
    const res = G.settleRace(s, session);
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
    G.settleRace(s, session);
    expect(s.player.points).toBe(30);
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
      results.map((r) => `${r.done ? 'WIN ' : 'STUCK'} races=${r.races} steps=${r.steps} lvl=${r.state.level} pts=${r.state.player.points} $${r.state.money} ${r.stuck ?? ''}`).join('\n'),
    );
    expect(done.length).toBeGreaterThanOrEqual(6);
  });
});
