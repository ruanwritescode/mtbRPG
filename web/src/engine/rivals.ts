// The riders you race against. A fixed roster of fictional racers, from club regulars to the handful who
// win World Cups; which of them line up at a race depends on its level. Results are built around the
// engine's placement (which never changes), so the table on the result screen always agrees with it.
import type { Rng } from './rng';
import type { RaceSession } from './types';

export interface Rival {
  id: string;
  name: string;
  /** ISO country code, for the flag. */
  country: string;
  /** 1 (club regular) to 10 (the best in the world). Also the race level they're "at home" in. */
  rating: number;
  /** Kit colour index (see KITS). */
  kit: number;
}

/** Kit colours a rider can wear. The first is the shreddi green. */
export const KITS: { name: string; hex: string; dark: string }[] = [
  { name: 'Forest', hex: '#1F6B4A', dark: '#15523A' },
  { name: 'Ember', hex: '#F2791C', dark: '#C45D0E' },
  { name: 'Sky', hex: '#2F80ED', dark: '#1F5FB8' },
  { name: 'Berry', hex: '#C2417A', dark: '#94305D' },
  { name: 'Sun', hex: '#F2B83C', dark: '#C4901F' },
  { name: 'Slate', hex: '#3B4149', dark: '#24282E' },
  { name: 'Teal', hex: '#1E9E8A', dark: '#157467' },
  { name: 'Lilac', hex: '#8B6FD6', dark: '#6A4FB4' },
];

const R = (id: string, name: string, country: string, rating: number, kit: number): Rival => ({ id, name, country, rating, kit });

/** The roster, roughly in order of ability. Names are invented. */
export const RIVALS: Rival[] = [
  R('vale', 'Valentina Rocca', 'IT', 10, 3),
  R('moss', 'Callum Moss', 'GB', 10, 2),
  R('lind', 'Freya Lindqvist', 'SE', 9, 4),
  R('duro', 'Mateo Durand', 'FR', 9, 1),
  R('kohl', 'Jonas Kohler', 'CH', 9, 0),
  R('tane', 'Aroha Tane', 'NZ', 8, 5),
  R('reye', 'Diego Reyes', 'ES', 8, 2),
  R('hask', 'Mia Haskins', 'AU', 8, 7),
  R('bran', 'Luka Brankovic', 'SI', 8, 6),
  R('ogaw', 'Ren Ogawa', 'JP', 7, 3),
  R('ferr', 'Nadia Ferreira', 'PT', 7, 1),
  R('weis', 'Tobias Weiss', 'AT', 7, 0),
  R('park', 'Jordan Park', 'CA', 7, 4),
  R('sand', 'Elin Sandoval', 'US', 6, 2),
  R('okaf', 'Sam Okafor', 'US', 6, 5),
  R('leno', 'Camille Lenoir', 'FR', 6, 7),
  R('tho', 'Owen Thorne', 'GB', 6, 6),
  R('ruiz', 'Paloma Ruiz', 'MX', 5, 1),
  R('bell', 'Jake Bellamy', 'US', 5, 3),
  R('nyst', 'Hanna Nystrom', 'NO', 5, 0),
  R('vega', 'Marcus Vega', 'US', 4, 4),
  R('ambe', 'Tess Amberly', 'CA', 4, 2),
  R('bris', 'Kai Brisbane', 'US', 4, 7),
  R('dunn', 'Rory Dunn', 'IE', 3, 5),
  R('silv', 'Lena Silva', 'BR', 3, 6),
  R('hale', 'Cody Hale', 'US', 3, 0),
  R('wint', 'Maya Winters', 'US', 2, 1),
  R('hart', 'Eli Hartman', 'US', 2, 3),
  R('pike', 'Jess Pike', 'US', 2, 4),
  R('fox', 'Tyler Fox', 'US', 1, 2),
  R('morr', 'Zoe Morrow', 'US', 1, 7),
  R('nash', 'Ben Nash', 'US', 1, 5),
];

export const rivalById = (id: string): Rival | undefined => RIVALS.find((r) => r.id === id);

/** How many riders line up at a race of this level, including you. */
export function fieldSize(level: number): number {
  return [6, 8, 9, 10, 12, 12, 14, 18, 24][Math.max(0, Math.min(8, level))];
}

/**
 * Who shows up: riders at home at this level, plus a few from the levels either side, drawn in a random
 * order so the same race never has quite the same start list.
 */
export function pickField(level: number, rng: Rng): Rival[] {
  const n = fieldSize(level) - 1;
  const want = (r: Rival) => Math.abs(r.rating - Math.min(10, level + (level >= 7 ? 1 : 0)));
  // Three tiers of closeness; shuffle within each so the picks vary.
  const pool = [...RIVALS].sort((a, b) => want(a) - want(b) || rng.int(3) - 1);
  const shuffleHead = (arr: Rival[], upTo: number) => {
    for (let i = Math.min(arr.length, upTo) - 1; i > 0; i--) {
      const j = rng.int(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  };
  shuffleHead(pool, n + 3);
  return pool.slice(0, n);
}

export interface ResultRow {
  /** Rival id, or null for the player. */
  id: string | null;
  name: string;
  position: number;
  /** Finishing time in the race's time units (ms), or null for a DNF. */
  time: number | null;
}

/**
 * Builds a full results table around the player's placement. Rivals ahead of the player are the strongest
 * in the field, with gaps that grow down the order. Times share the session's reference time: the race
 * winner finishes in `race.time` when the player loses; when the player wins, the player's time is
 * `race.time - gap`.
 */
export function buildResults(s: RaceSession, placement: number | null, playerName: string, field: Rival[], rng: Rng): ResultRow[] {
  const T = s.race.time;
  const ordered = [...field].sort((a, b) => b.rating - a.rating || rng.int(3) - 1);
  const rows: ResultRow[] = [];
  const noise = (scale: number) => Math.trunc(scale * (0.6 + rng.int(80) / 100));
  const step = Math.max(400, Math.trunc(T * 0.0045)); // typical gap between consecutive riders
  if (placement === null) {
    // DNF: everyone else finishes.
    let t = T;
    ordered.forEach((r, i) => {
      rows.push({ id: r.id, name: r.name, position: i + 1, time: t });
      t += noise(step);
    });
    rows.push({ id: null, name: playerName, position: rows.length + 1, time: null });
    return rows;
  }
  // How many rivals finished ahead.
  let ahead: number;
  if (placement === 1) ahead = 0;
  else if (placement === 2) ahead = 1;
  else if (placement === 3) ahead = 2;
  else {
    const margin = -s.gap / T; // > 0.01
    ahead = Math.min(ordered.length, 3 + Math.floor((margin - 0.01) / 0.012));
  }
  ahead = Math.min(ahead, ordered.length);
  const playerTime = T - s.gap;
  let pos = 1;
  if (ahead === 0) {
    rows.push({ id: null, name: playerName, position: pos++, time: playerTime });
    let t = T;
    for (const r of ordered) {
      rows.push({ id: r.id, name: r.name, position: pos++, time: t });
      t += noise(step);
    }
    return rows;
  }
  // Rivals ahead: the winner at T, the rest spread evenly between T and the player's time.
  const span = playerTime - T;
  for (let i = 0; i < ahead; i++) {
    const frac = ahead === 1 ? 0 : i / ahead;
    const t = T + Math.trunc(span * frac) + (i ? noise(Math.min(step, span / ahead / 3)) : 0);
    rows.push({ id: ordered[i].id, name: ordered[i].name, position: pos++, time: Math.min(t, playerTime - 1) });
  }
  rows.push({ id: null, name: playerName, position: pos++, time: playerTime });
  let t = playerTime;
  for (const r of ordered.slice(ahead)) {
    t += noise(step);
    rows.push({ id: r.id, name: r.name, position: pos++, time: t });
  }
  return rows;
}

/** Ranking points a position earns in a race of this level (rivals and player alike for standings). */
export function rankingPoints(position: number, level: number): number {
  const base = [0, 275, 175, 125, 90, 70, 55, 45, 35, 28, 22, 18, 15, 12, 10, 8, 6, 5, 4, 3, 2, 2, 1, 1, 1][position] ?? 1;
  // Rivals race a full calendar you never see, so each race you share counts for a little less for them.
  return Math.max(1, Math.trunc(base * 0.6 * (level / 7)));
}

/** A rival's starting ranking points: the best start far ahead of a rookie, who starts at 1. */
export function startingPoints(r: Rival): number {
  return Math.max(10, Math.trunc(r.rating * r.rating * 45 + r.rating * 10 - 40));
}
