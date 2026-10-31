// Parsers for the original game's text data files.
import type { Attrs, Part, PartSlot, Point } from './types';

export interface Terrain {
  width: number;
  height: number;
  rows: string[];
  start: Point;
  final: Point;
  maxShops: number;
}

export interface FeatureOption {
  label: string;
  /** What the original file says the line costs, e.g. "Strength" or "Lose Time". */
  tag: string;
  modifier: string;
}

export interface TerrainFeature {
  title: string;
  art: string;
  options: FeatureOption[];
}

export interface ShopInventory {
  parts: Record<PartSlot, Part[]>;
}

export interface GameData {
  maps: { usa: Terrain; europe: Terrain };
  shop: ShopInventory;
  /** Ride attributes by item name (items/attributes.txt). */
  attrs: Record<string, Attrs>;
  raceList: { name: string; level: number }[];
  terrain: TerrainFeature[];
  starts: string[];
}

const MARKER = '≤'; // "≤", the record separator used in races/*.txt

function lines(raw: string): string[] {
  return raw.replace(/\r/g, '').split('\n');
}

export function parseMap(raw: string): Terrain {
  const all = lines(raw);
  const header = all[0].split(',').map((s) => parseInt(s, 10));
  const rows = all.slice(1);
  while (rows.length && rows[rows.length - 1].trim() === '') rows.pop();
  const width = Math.max(...rows.map((r) => r.length));
  return {
    width,
    height: rows.length,
    rows: rows.map((r) => r.padEnd(width, '#')),
    start: { x: header[0], y: header[1] },
    final: { x: header[2], y: header[3] },
    maxShops: header[4] || 0,
  };
}

/** True for cells the rider can stand on (spaces in the map file). */
export function isLand(t: Terrain, x: number, y: number): boolean {
  return y >= 0 && y < t.height && x >= 0 && x < t.width && t.rows[y][x] === ' ';
}

export function parseItems(raw: string): ShopInventory {
  const sections: Part[][] = [[]];
  for (const line of lines(raw)) {
    const bits = line.split(',');
    if (bits.length === 3 && bits[0].trim()) {
      const quality = parseInt(bits[2], 10);
      sections[sections.length - 1].push({
        name: bits[0].trim(),
        price: parseFloat(bits[1]),
        quality,
        max: quality,
      });
    } else if (sections[sections.length - 1].length) {
      sections.push([]);
    }
  }
  return {
    parts: {
      frame: sections[0] ?? [],
      suspension: sections[1] ?? [],
      brakes: sections[2] ?? [],
      wheels: sections[3] ?? [],
    },
  };
}

/** items/attributes.txt: `name,speed,durability,playfulness,lightness`, values 1–10; `#` lines are comments. */
export function parseAttributes(raw: string): Record<string, Attrs> {
  const out: Record<string, Attrs> = {};
  for (const line of lines(raw)) {
    if (!line.trim() || line.startsWith('#')) continue;
    const b = line.split(',').map((x) => x.trim());
    if (b.length !== 5) continue;
    const n = b.slice(1).map((x) => Math.max(1, Math.min(10, parseInt(x, 10) || 6)));
    out[b[0]] = { speed: n[0], durability: n[1], playfulness: n[2], lightness: n[3] };
  }
  return out;
}

export function parseRaceList(raw: string): { name: string; level: number }[] {
  return lines(raw)
    .map((l) => l.split(','))
    .filter((b) => b.length === 2 && b[0].trim() && !isNaN(parseInt(b[1], 10)))
    .map((b) => ({ name: b[0].trim(), level: parseInt(b[1], 10) }));
}

function trimBlank(block: string[]): string[] {
  let a = 0;
  let b = block.length;
  while (a < b && block[a].trim() === '') a++;
  while (b > a && block[b - 1].trim() === '') b--;
  return block.slice(a, b);
}

export function parseTerrain(raw: string): TerrainFeature[] {
  const features: TerrainFeature[] = [];
  let block: string[] = [];
  for (const line of lines(raw)) {
    if (!line.startsWith(MARKER)) {
      block.push(line);
      continue;
    }
    const meta = line.split(',').map((s) => s.trim());
    const modifiers = meta.slice(2);
    let promptAt = block.findIndex((l) => /^\s*1\.\s/.test(l) || /^\s*Sorry/i.test(l));
    if (promptAt < 0) promptAt = block.length;
    let titleAt = promptAt - 1;
    while (titleAt >= 0 && block[titleAt].trim() === '') titleAt--;
    const title = titleAt >= 0 ? block[titleAt].trim() : `Section ${features.length + 1}`;
    const art = trimBlank(block.slice(0, Math.max(0, titleAt))).join('\n');
    const options: FeatureOption[] = [];
    for (const l of block.slice(promptAt)) {
      const m = l.match(/^\s*(\d+)\.\s*(.+?)\s*\(([^)]+)\)\s*$/);
      if (m) {
        const idx = parseInt(m[1], 10) - 1;
        options.push({ label: m[2].trim(), tag: m[3].trim(), modifier: modifiers[idx] ?? '' });
      }
    }
    if (!options.length) {
      options.push({ label: 'Hold on tight!', tag: 'Bike', modifier: modifiers[0] ?? '' });
    }
    features.push({ title, art, options });
    block = [];
  }
  return features;
}

export function parseStarts(raw: string): string[] {
  const starts: string[] = [];
  let block: string[] = [];
  for (const line of lines(raw)) {
    if (line.startsWith(MARKER)) {
      starts.push(trimBlank(block).join('\n'));
      block = [];
    } else {
      block.push(line);
    }
  }
  return starts;
}
