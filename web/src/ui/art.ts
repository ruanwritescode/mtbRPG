// SVG artwork: difficulty badges, the rider and bike, and an illustrated scene for every trail section and
// start gate. The style is ink line work over flat washes: one ink color, a few consistent stroke weights
// (contours 2, details 1.3), round caps and joins everywhere, and a muted outdoor palette.
import { esc } from './dom';

export interface Difficulty {
  label: string;
  color: string;
  shape: 'circle' | 'square' | 'diamond' | 'double' | 'pro';
}

/** Trail-sign difficulty for a race level, using shreddi's grading colors. */
export function difficulty(level: number): Difficulty {
  if (level <= 2) return { label: 'Green', color: '#2E9E4F', shape: 'circle' };
  if (level <= 4) return { label: 'Blue', color: '#1F6FD1', shape: 'square' };
  if (level <= 6) return { label: 'Black', color: '#16181A', shape: 'diamond' };
  if (level === 7) return { label: 'Double black', color: '#D0312D', shape: 'double' };
  return { label: 'Pro', color: '#F2791C', shape: 'pro' };
}

export function signIcon(level: number, size = 14): string {
  const d = difficulty(level);
  const c = d.color;
  let body: string;
  switch (d.shape) {
    case 'circle':
      body = `<circle cx="8" cy="8" r="6.5" fill="${c}"/>`;
      break;
    case 'square':
      body = `<rect x="2" y="2" width="12" height="12" rx="1.5" fill="${c}"/>`;
      break;
    case 'diamond':
      body = `<rect x="3.5" y="3.5" width="9" height="9" fill="${c}" transform="rotate(45 8 8)"/>`;
      break;
    case 'double':
      body = `<rect x="1.2" y="5" width="6" height="6" fill="${c}" transform="rotate(45 4.2 8)"/><rect x="8.8" y="5" width="6" height="6" fill="${c}" transform="rotate(45 11.8 8)"/>`;
      break;
    default:
      body = `<path d="M8 1.5l1.9 4.2 4.6.5-3.4 3.1 1 4.5L8 11.5l-4.1 2.3 1-4.5L1.5 6.2l4.6-.5z" fill="${c}"/>`;
  }
  return `<svg class="sign" width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true">${body}</svg>`;
}

export function levelBadge(level: number): string {
  const d = difficulty(level);
  return `<span class="badge" title="${d.label}">${signIcon(level)}Level ${level}</span>`;
}

// ---------------------------------------------------------------- palette and helpers

const INK = '#2B2E33';
const W = 800;
const H = 360;
const C = {
  skyTop: '#D6E4EA',
  skyBottom: '#F1EFE6',
  far: '#C7D2D6',
  farEdge: '#A9B8BE',
  mid: '#9FB4A3',
  midDark: '#86A08C',
  grass: '#A3B785',
  grassDark: '#7E9A66',
  dirt: '#B8976B',
  dirtLight: '#CBB08A',
  dirtDark: '#8E6E4C',
  rock: '#A6A9AC',
  rockLight: '#C9CBCD',
  rockDark: '#6C7074',
  trunk: '#6F5744',
  needle: '#5B7E60',
  needleDark: '#405F48',
  leaf: '#7FA067',
  leafDark: '#5E8050',
  snow: '#F7F8F6',
  shadow: 'rgba(43,46,51,0.18)',
};

/** Small deterministic random generator so scattered detail is the same on every render. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

const r1 = (v: number) => Math.round(v * 10) / 10;

/** A closed polygon with an ink outline. */
function poly(points: [number, number][], fill: string, sw = 2, extra = ''): string {
  const d = points.map(([x, y], i) => `${i ? 'L' : 'M'}${r1(x)} ${r1(y)}`).join('') + 'Z';
  return `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round" ${extra}/>`;
}

function ink(d: string, sw = 1.3, extra = ''): string {
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
}

/** Diagonal hatching to suggest shadow on a face; `d` is the area's outline. */
function hatch(id: string, d: string, opacity = 0.35): string {
  return `<path d="${d}" fill="url(#hatch-${id})" opacity="${opacity}"/>`;
}

function defs(id: string): string {
  return `<defs>
    <linearGradient id="sky-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.skyTop}"/><stop offset="1" stop-color="${C.skyBottom}"/></linearGradient>
    <pattern id="hatch-${id}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)"><line x1="0" y1="0" x2="0" y2="7" stroke="${INK}" stroke-width="1"/></pattern>
    <pattern id="dots-${id}" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="0.8" fill="${INK}"/><circle cx="6.5" cy="6" r="0.6" fill="${INK}"/></pattern>
  </defs>`;
}

/** Distant ridges with ink contour lines and snow on the high peaks. */
function ridges(): string {
  const far: [number, number][] = [[0, 160], [55, 128], [105, 142], [165, 98], [215, 124], [275, 108], [335, 136], [395, 90], [445, 118], [500, 104], [555, 128], [615, 108], [670, 130], [730, 112], [800, 126]];
  const farD = far.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('');
  const snow = [[165, 98], [395, 90]].map(([x, y]) => `<path d="M${x - 16} ${y + 12} L${x - 9} ${y + 6} L${x - 5} ${y + 10} L${x} ${y} L${x + 5} ${y + 9} L${x + 10} ${y + 5} L${x + 16} ${y + 12}" fill="${C.snow}" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>`).join('');
  const mid: [number, number][] = [[0, 206], [60, 178], [130, 192], [200, 164], [270, 186], [340, 170], [420, 194], [490, 172], [560, 190], [640, 168], [710, 188], [800, 176]];
  const midD = mid.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('');
  // Tree line on the middle ridge: tiny conifer marks.
  const rand = rng(7);
  let marks = '';
  for (let i = 0; i < mid.length - 1; i++) {
    const [x0, y0] = mid[i];
    const [x1, y1] = mid[i + 1];
    for (let t = 0.08; t < 1; t += 0.12 + rand() * 0.08) {
      const x = r1(x0 + (x1 - x0) * t);
      const y = r1(y0 + (y1 - y0) * t);
      const h = 5 + rand() * 4;
      marks += `M${x} ${y + 1}l${r1(h / 3)} ${r1(-h)}l${r1(h / 3)} ${r1(h)}`;
    }
  }
  return `
    <path d="${farD}L800 240L0 240Z" fill="${C.far}"/>
    ${ink(farD, 1.3, `stroke="${C.farEdge}"`)}
    ${snow}
    <path d="${farD}" fill="none" stroke="${INK}" stroke-width="1" opacity=".45"/>
    <path d="${midD}L800 260L0 260Z" fill="${C.mid}"/>
    <path d="${marks}" fill="${C.midDark}" stroke="${C.midDark}" stroke-width=".8" stroke-linejoin="round"/>
    <path d="${midD}" fill="none" stroke="${INK}" stroke-width="1.2" opacity=".6"/>`;
}

function clouds(): string {
  const cloud = (x: number, y: number, s: number) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-30 6 C-34 -2 -26 -8 -18 -6 C-16 -16 0 -18 4 -9 C12 -14 24 -8 22 0 C30 0 32 6 26 8 Z" fill="#FBFBF8" stroke="${INK}" stroke-width="1" stroke-linejoin="round" opacity=".9"/></g>`;
  return cloud(150, 52, 1) + cloud(560, 40, 1.3) + cloud(700, 70, 0.7);
}

/** Flat ground with scattered grass tufts. */
function ground(y = 230, seed = 3): string {
  const rand = rng(seed);
  let tufts = '';
  for (let i = 0; i < 70; i++) {
    const x = r1(rand() * W);
    const ty = r1(y + 8 + rand() * (H - y - 12));
    const h = 3 + rand() * 4;
    tufts += `M${x} ${ty}l-2 ${r1(-h)}M${x} ${ty}l1 ${r1(-h - 1)}M${x} ${ty}l3 ${r1(-h + 1)}`;
  }
  return `<rect y="${y}" width="${W}" height="${H - y}" fill="${C.grass}"/>
    <path d="${tufts}" fill="none" stroke="${C.grassDark}" stroke-width="1.2" stroke-linecap="round"/>`;
}

/** A conifer with layered, jagged tiers; the right side is in shadow. */
function conifer(x: number, y: number, s = 1, seed = 1): string {
  const rand = rng(seed * 31 + 11);
  let out = `<path d="M-3 0 L-2.2 -12 L2.2 -12 L3 0Z" fill="${C.trunk}" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>`;
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const base = -10 - i * 12;
    const half = 17 - i * 3.6;
    const apex = base - 20 + i * 2;
    const left: [number, number][] = [];
    const steps = 4;
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const px = -half * (1 - t);
      const py = base + (apex - base) * t;
      left.push([px + (k && k < steps ? (rand() - 0.5) * 3 : 0), py + (k && k < steps ? rand() * 3 : 0)]);
      if (k && k < steps) left.push([px + 2.5, py + 3.5]);
    }
    const right = left.slice(0, -1).reverse().map(([px, py]) => [-px, py] as [number, number]);
    const pts: [number, number][] = [...left, ...right];
    out += poly(pts, C.needle, 1.3);
    const rightHalf: [number, number][] = [[0, apex], ...right, [0, base]];
    out += `<path d="${rightHalf.map(([px, py], j) => `${j ? 'L' : 'M'}${r1(px)} ${r1(py)}`).join('')}Z" fill="${C.needleDark}"/>`;
  }
  return `<g transform="translate(${x} ${y}) scale(${s})">${out}</g>`;
}

/** A deciduous tree with a lobed canopy. */
function broadleaf(x: number, y: number, s = 1): string {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-3 0 L-2 -18 L-8 -28 M-2 -18 L2 -18 L8 -30 M2 -18 L3 0 M0 -18 L0 -30" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
    <path d="M-3 0 L-2 -18 L2 -18 L3 0Z" fill="${C.trunk}"/>
    <path d="M-20 -30 C-26 -42 -16 -52 -8 -48 C-6 -60 10 -62 14 -52 C24 -54 30 -42 22 -34 C28 -26 18 -18 10 -22 C6 -14 -8 -14 -10 -22 C-20 -18 -26 -24 -20 -30Z" fill="${C.leaf}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M-10 -22 C-2 -26 6 -24 10 -22 C8 -16 -6 -15 -10 -22Z M12 -36 C18 -34 22 -32 22 -34 C24 -28 16 -24 12 -30Z" fill="${C.leafDark}"/>
  </g>`;
}

/** A faceted rock with a lit top and shaded side. */
function rock(x: number, y: number, s = 1, seed = 1): string {
  const rand = rng(seed * 17 + 5);
  const pts: [number, number][] = [];
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rad = 10 + rand() * 5;
    pts.push([Math.cos(a) * rad * 1.3, Math.sin(a) * rad * 0.8]);
  }
  const top = pts.filter(([, py]) => py <= 0.5);
  const topD = top.length > 2 ? top.map(([px, py], i) => `${i ? 'L' : 'M'}${r1(px)} ${r1(py)}`).join('') + 'Z' : '';
  const crack = `M${r1(pts[1][0] * 0.4)} ${r1(pts[1][1] * 0.4)}L${r1(pts[3][0] * 0.5)} ${r1(pts[3][1] * 0.5)}`;
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="2" cy="7" rx="14" ry="4" fill="${C.shadow}"/>
    ${poly(pts, C.rock, 1.5)}
    <path d="${topD}" fill="${C.rockLight}"/>
    <path d="M${r1(pts[4][0])} ${r1(pts[4][1])} L${r1(pts[5][0])} ${r1(pts[5][1])} L${r1(pts[0][0])} ${r1(pts[0][1])} L${r1(pts[0][0] * 0.4)} ${r1(pts[0][1] * 0.3 + 4)}Z" fill="${C.rockDark}"/>
    ${ink(crack, 1)}
  </g>`;
}

function fern(x: number, y: number, s = 1, flip = false): string {
  const fronds = [-40, -15, 10, 35].map((deg) => `<path d="M0 0 Q6 -18 2 -34" transform="rotate(${deg})"/><path d="M1 -8l-4 -3M2 -14l-4 -3M2.5 -20l-4 -3M2.5 -26l-4 -3M1 -8l4 -3M2 -14l4 -3M2.5 -20l4 -3M2.5 -26l4 -3" transform="rotate(${deg})"/>`).join('');
  return `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})" fill="none" stroke="${C.leafDark}" stroke-width="1.5" stroke-linecap="round">${fronds}</g>`;
}

/** Numbered marker matching a choice button. */
function pin(n: number, x: number, y: number): string {
  return `<g class="pin" transform="translate(${x} ${y})">
    <path d="M0 14 L-5 4 A11 11 0 1 1 5 4Z" fill="#FBFAF6" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <text y="4" text-anchor="middle" font-size="14" font-weight="800" font-family="system-ui, sans-serif" fill="${INK}">${n}</text>
  </g>`;
}

/** A suggested riding line. */
function line(d: string, tone: 'fast' | 'safe' | 'risky' = 'fast'): string {
  const color = tone === 'fast' ? '#FBFAF6' : tone === 'safe' ? '#F3C96B' : INK;
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round" opacity=".5"/>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-dasharray="1 8" stroke-linecap="round"/>`;
}

/** A dirt trail ribbon along a centre line, with an ink edge, a worn centre and a shaded lower edge. */
function ribbon(id: string, d: string, width: number): string {
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${width + 3}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${d}" fill="none" stroke="${C.dirt}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${d}" fill="none" stroke="${C.dirtLight}" stroke-width="${width * 0.45}" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>
    <path d="${d}" fill="none" stroke="url(#dots-${id})" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" opacity=".25"/>`;
}

/** A trail drawn in perspective as a polygon, with hatched shadow on one edge. */
function trailPoly(id: string, pts: [number, number][], shade?: [number, number][]): string {
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('') + 'Z';
  const sh = shade ? shade.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('') + 'Z' : '';
  return `<path d="${d}" fill="${C.dirt}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="${d}" fill="url(#dots-${id})" opacity=".2"/>
    ${sh ? `<path d="${sh}" fill="${C.dirtDark}" opacity=".5"/>${hatch(id, sh, 0.3)}` : ''}`;
}

function frame(id: string, body: string, opts: { label: string; hills?: boolean; align?: string; sky?: boolean }): string {
  const hills = opts.hills === false ? '' : ridges();
  return `<svg class="scene-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label)}" preserveAspectRatio="${opts.align ?? 'xMidYMid'} slice">
    ${defs(id)}
    <rect width="${W}" height="${H}" fill="url(#sky-${id})"/>
    ${opts.sky === false ? '' : clouds()}
    ${hills}
    ${body}
  </svg>`;
}

// ---------------------------------------------------------------- rider and bike

function wheel(cx: number, cy: number): string {
  const spokes = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    return `M${r1(cx + Math.cos(a) * 2.5)} ${r1(cy + Math.sin(a) * 2.5)}L${r1(cx + Math.cos(a) * 10.5)} ${r1(cy + Math.sin(a) * 10.5)}`;
  }).join('');
  return `<circle cx="${cx}" cy="${cy}" r="14" fill="none" stroke="${INK}" stroke-width="3.6"/>
    <circle cx="${cx}" cy="${cy}" r="14" fill="none" stroke="#4A4D52" stroke-width="1.4" stroke-dasharray="1.6 2.6"/>
    <circle cx="${cx}" cy="${cy}" r="11" fill="none" stroke="${INK}" stroke-width="1.4"/>
    <circle cx="${cx}" cy="${cy}" r="10.3" fill="none" stroke="#C9CBCE" stroke-width="0.8"/>
    <path d="${spokes}" stroke="${INK}" stroke-width="0.7"/>
    <circle cx="${cx}" cy="${cy}" r="2.6" fill="${INK}"/>`;
}

/**
 * A rider in the attack position on a full-suspension bike, facing right. Origin is on the ground between
 * the wheels; the drawing is about 70 units long and 90 tall at scale 1.
 */
export function rider(x: number, y: number, scale = 1, rotate = 0, jersey = '#1F6B4A', cls = 'rider'): string {
  const tubes = 'M17 -40 L20 -33 M20 -33 L25 -14 M20 -33 L-3 -10 M17 -40 L-8 -37 M-8 -37 L-3 -10 M-3 -10 L-25 -14 M-25 -14 L-10 -31';
  const limb = (d: string, w: number, color: string) =>
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 2.4}" stroke-linecap="round" stroke-linejoin="round"/>
     <path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const pants = '#33373D';
  const skin = '#D9A57A';
  return `<g class="${cls}" transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})">
    <ellipse cx="0" cy="1" rx="34" ry="4" fill="${C.shadow}"/>
    ${wheel(-25, -14)}${wheel(25, -14)}
    <path d="${tubes}" fill="none" stroke="${INK}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${tubes}" fill="none" stroke="#D5D8DB" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M-10 -31 L4 -35" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M-10 -31 L4 -35" fill="none" stroke="${jersey}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="-3" cy="-10" r="4.5" fill="none" stroke="${INK}" stroke-width="1.6"/>
    <path d="M-3 -10 L7 -3 M-3 -10 L-12 -16" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M4 -3 L10 -3 M-15 -16 L-9 -16" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M-3 -14.5 L-25 -16.5 M-3 -5.5 L-25 -11.5" stroke="${INK}" stroke-width="1" opacity=".7"/>
    <path d="M17 -40 L14 -46 M10 -47 L19 -45" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M-15 -40 L-5 -41" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>
    ${limb('M-11 -49 L-9 -30 L-12 -16', 6, '#262A2F')}
    ${limb('M7 -69 L17 -56 L14 -46', 4.5, jersey)}
    ${limb('M-11 -49 L7 -30 L7 -3', 6.5, pants)}
    <path d="M-15 -45 C-17 -56 -8 -62 -2 -64 L8 -72 L13 -66 L4 -56 C-2 -50 -8 -46 -11 -42Z" fill="${jersey}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M-4 -57 L4 -62" stroke="#FBFAF6" stroke-width="2" stroke-linecap="round" opacity=".8"/>
    ${limb('M9 -70 L19 -58 L15 -46', 4.5, jersey)}
    <path d="M15 -48 L13 -45" stroke="${skin}" stroke-width="4" stroke-linecap="round"/>
    <path d="M8 -79 C8 -88 15 -93 22 -92 C29 -91 33 -86 33 -80 L34 -73 L28 -69 L18 -69 L10 -72Z" fill="${jersey}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M22 -92 L37 -88 L36 -85 L28 -87Z" fill="${jersey}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M14 -81 L32 -80 L32 -75 L15 -76Z" fill="#2F6F9F" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M18 -78 L24 -78" stroke="#8FC3E6" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M20 -72 L31 -73" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>
  </g>`;
}

// ---------------------------------------------------------------- scenes

function lineChoice(): string {
  const id = 'line';
  const rand = rng(21);
  let rocks = '';
  const spots: [number, number, number][] = [[250, 338, 1.5], [292, 306, 1.2], [236, 290, 1], [300, 268, 0.85], [268, 250, 0.7], [305, 238, 0.55], [246, 318, 0.9]];
  spots.forEach(([x, y, s], i) => (rocks += rock(x, y, s, i + 3)));
  let roots = '';
  for (let i = 0; i < 6; i++) {
    const y = 338 - i * 20;
    const w = 46 - i * 5;
    roots += `<path d="M${400 - w} ${y} C${400 - w / 2} ${y - 9 - rand() * 4} ${400 + w / 3} ${y + 6} ${400 + w} ${y - 2}" fill="none" stroke="${INK}" stroke-width="${5.5 - i * 0.6}" stroke-linecap="round"/>
      <path d="M${400 - w} ${y} C${400 - w / 2} ${y - 9 - rand() * 4} ${400 + w / 3} ${y + 6} ${400 + w} ${y - 2}" fill="none" stroke="${C.trunk}" stroke-width="${3 - i * 0.35}" stroke-linecap="round"/>`;
  }
  return frame(id, `
    ${ground(230, 4)}
    ${conifer(70, 258, 1.5, 1)}${conifer(140, 244, 1.1, 2)}${broadleaf(190, 236, 0.8)}
    ${conifer(720, 258, 1.5, 3)}${conifer(640, 242, 1.1, 4)}${broadleaf(600, 236, 0.8)}
    ${trailPoly(id, [[150, 360], [368, 224], [432, 224], [650, 360]], [[432, 224], [650, 360], [700, 360], [445, 224]])}
    ${ink('M330 360 L388 226 M470 360 L412 226', 1, 'opacity=".45"')}
    <path d="M560 360 C520 300 470 260 440 230 L452 230 C486 262 540 300 592 360Z" fill="${C.dirtDark}" opacity=".6"/>
    ${hatch(id, 'M560 360 C520 300 470 260 440 230 L452 230 C486 262 540 300 592 360Z', 0.45)}
    ${ink('M560 360 C520 300 470 260 440 230 M592 360 C540 300 486 262 452 230', 1.6)}
    ${rocks}${roots}
    ${fern(170, 352, 0.9)}${fern(660, 356, 0.8, true)}
    ${pin(1, 262, 212)}${pin(2, 400, 212)}${pin(3, 518, 212)}
  `, { label: 'Line choice: rock garden, roots or a rut' });
}

function corner(dir: 'left' | 'right'): string {
  const id = dir;
  const flip = dir === 'right' ? `transform="translate(${W} 0) scale(-1 1)"` : '';
  const px = (x: number) => (dir === 'left' ? x : W - x);
  const face = 'M520 360 C 520 262, 430 224, 190 216 L190 198 C 450 200, 560 250, 560 360Z';
  return frame(id, `
    ${ground(230, 5)}
    <g ${flip}>
      ${conifer(60, 262, 1.6, 5)}${conifer(120, 246, 1.2, 6)}${broadleaf(700, 240, 0.9)}${conifer(760, 258, 1.3, 7)}
      ${rock(690, 330, 1.1, 9)}${fern(110, 356, 1)}
      <path d="M520 360 C 520 262, 430 224, 190 216 L190 248 C 360 252, 420 292, 380 360Z" fill="${C.dirt}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M520 360 C 520 262, 430 224, 190 216 L190 248 C 360 252, 420 292, 380 360Z" fill="url(#dots-${id})" opacity=".22"/>
      <path d="${face}" fill="${C.dirtDark}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
      ${hatch(id, face, 0.4)}
      ${ink('M470 360 C 470 290, 400 240, 190 232', 1, 'opacity=".5"')}
      ${line('M400 352 C 420 292, 360 252, 200 240', 'fast')}
      ${line('M488 352 C 500 282, 420 226, 200 220', 'safe')}
      ${rider(470, 332, 0.95, -12, '#F2791C')}
    </g>
    ${pin(1, px(300), 206)}${pin(2, px(420), 168)}
  `, { label: `${dir === 'left' ? 'Left' : 'Right'} hand corner` });
}

function rollers(): string {
  const id = 'roll';
  const top = 'M0 300 L120 300 Q160 250 200 300 Q240 250 280 300 Q320 250 360 300 Q400 250 440 300 L800 300';
  const rollShade = [160, 240, 320, 400].map((x) => `M${x} 275 Q${x + 24} 280 ${x + 40} 300 L${x} 300Z`).join('');
  return frame(id, `
    ${ground(230, 6)}
    ${conifer(610, 246, 1.3, 8)}${conifer(690, 258, 1.6, 9)}${broadleaf(750, 240, 0.85)}${conifer(60, 250, 1.2, 10)}
    <path d="${top} L800 360 L0 360Z" fill="${C.dirt}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="${top} L800 360 L0 360Z" fill="url(#dots-${id})" opacity=".22"/>
    <path d="${rollShade}" fill="${C.dirtDark}" opacity=".4"/>
    ${hatch(id, rollShade, 0.35)}
    ${ink('M0 322 L800 322', 1, 'opacity=".3"')}
    ${line('M120 296 Q280 150 440 296', 'fast')}
    ${line('M120 296 Q200 212 280 296 Q360 212 440 296', 'risky')}
    ${line('M120 306 Q160 262 200 306 Q240 262 280 306 Q320 262 360 306 Q400 262 440 306', 'safe')}
    ${rock(520, 340, 1, 11)}${fern(760, 352, 0.9, true)}
    ${rider(78, 300, 0.9, 0)}
    ${pin(1, 280, 184)}${pin(2, 200, 232)}${pin(3, 470, 278)}
  `, { label: 'Roller section' });
}

function whoops(): string {
  const id = 'whoop';
  let top = 'M0 300 L80 300';
  let shade = '';
  for (let x = 80; x < 720; x += 40) {
    top += ` Q${x + 20} 272 ${x + 40} 300`;
    shade += ` M${x + 20} 286 Q${x + 32} 290 ${x + 40} 300 L${x + 20} 300Z`;
  }
  top += ' L800 300';
  const dust = `<g fill="none" stroke="${INK}" stroke-width="1.3" stroke-linecap="round" opacity=".55"><path d="M330 250 c-8 -6 -18 -4 -24 2 M322 262 c-10 -4 -20 0 -26 6 M334 272 c-8 -2 -16 2 -20 8"/></g>`;
  return frame(id, `
    ${ground(230, 8)}
    ${conifer(50, 252, 1.3, 12)}${broadleaf(140, 240, 0.8)}${conifer(740, 256, 1.5, 13)}${conifer(680, 242, 1, 14)}
    <path d="${top} L800 360 L0 360Z" fill="${C.dirt}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="${top} L800 360 L0 360Z" fill="url(#dots-${id})" opacity=".22"/>
    <path d="${shade}" fill="${C.dirtDark}" opacity=".45"/>
    ${rock(760, 344, 0.9, 15)}
    <g class="bounce">${rider(390, 286, 1, -8, '#D2453B')}</g>
    ${dust}
  `, { label: 'Moto whoop section' });
}

function switchbacks(): string {
  const id = 'switch';
  const path = 'M660 78 L190 128 Q130 138 170 158 L620 198 Q690 208 630 230 L170 282 Q110 292 160 312 L540 350';
  const contours = [100, 150, 200, 250, 300].map((y) => `M0 ${y + 24} C 200 ${y - 10}, 500 ${y + 40}, 800 ${y - 20}`).join('');
  return frame(id, `
    <path d="M0 110 L800 52 L800 360 L0 360Z" fill="${C.grass}"/>
    <path d="${contours}" fill="none" stroke="${C.grassDark}" stroke-width="1.2" opacity=".6"/>
    ${conifer(90, 160, 0.9, 16)}${conifer(690, 118, 0.9, 17)}${conifer(740, 300, 1.3, 18)}${broadleaf(70, 330, 1)}${conifer(520, 204, 0.7, 19)}${conifer(420, 262, 0.75, 20)}
    ${rock(330, 240, 0.9, 21)}${rock(560, 330, 1.1, 22)}
    ${ribbon(id, path, 26)}
    ${line('M300 118 L300 300', 'risky')}
    ${line('M190 132 Q140 148 180 162', 'fast')}
    ${line('M612 194 Q690 212 640 234', 'safe')}
    ${rider(570, 94, 0.6, 6)}
    ${pin(1, 300, 216)}${pin(2, 118, 124)}${pin(3, 700, 190)}
  `, { label: 'Switchbacks on a steep hillside', sky: false, hills: false });
}

function gapJump(): string {
  const id = 'gap';
  const lip = 'M0 290 L170 290 Q250 288 300 225 L300 360 L0 360Z';
  const landing = 'M520 240 Q580 250 650 300 L800 300 L800 360 L520 360Z';
  const planks = Array.from({ length: 7 }, (_, i) => {
    const t = i / 6;
    const x = 170 + 130 * t;
    const y = 290 - 65 * t * t;
    return `M${r1(x)} ${r1(y + 2)} L${r1(x - 4)} ${r1(y + 16)}`;
  }).join('');
  return frame(id, `
    ${ground(230, 9)}
    ${conifer(40, 250, 1.4, 23)}${broadleaf(110, 236, 0.8)}${conifer(770, 252, 1.5, 24)}${conifer(700, 240, 1, 25)}
    <path d="${lip}" fill="${C.dirt}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="${lip}" fill="url(#dots-${id})" opacity=".22"/>
    <path d="M170 290 Q250 288 300 225 L300 240 Q258 300 176 304Z" fill="#8A6A4C" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
    ${ink(planks, 1)}
    <path d="M300 225 L300 360 L520 360 L520 240 L500 268 Q400 306 322 268Z" fill="#4A5A4C"/>
    ${hatch(id, 'M300 225 L300 360 L520 360 L520 240 L500 268 Q400 306 322 268Z', 0.3)}
    ${ink('M300 225 L300 360 M520 240 L520 360 M322 268 Q400 306 500 268', 1.6)}
    ${fern(330, 300, 1)}${fern(470, 320, 1.1, true)}${rock(420, 340, 1, 26)}
    <path d="${landing}" fill="${C.dirt}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="${landing}" fill="url(#dots-${id})" opacity=".22"/>
    ${ribbon(id, 'M170 292 Q260 300 330 334 Q420 352 520 344 Q600 338 650 310', 16)}
    ${line('M300 222 Q410 70 540 236', 'risky')}
    ${line('M180 300 Q300 320 360 336 Q450 352 600 326', 'safe')}
    ${rider(238, 282, 0.9, -24)}
    ${pin(1, 420, 118)}${pin(2, 450, 310)}
  `, { label: 'Gap jump with a chicken line' });
}

function motorway(): string {
  const id = 'motor';
  const bumps = Array.from({ length: 6 }, (_, i) => {
    const y = 350 - i * 22;
    const half = 120 - i * 16;
    return `M${400 - half} ${y} Q400 ${y - 6} ${400 + half} ${y}`;
  }).join('');
  return frame(id, `
    ${ground(230, 10)}
    ${conifer(70, 262, 1.7, 27)}${conifer(160, 244, 1.2, 28)}${broadleaf(240, 232, 0.7)}${conifer(560, 232, 0.7, 29)}${conifer(640, 244, 1.2, 30)}${conifer(730, 262, 1.7, 31)}
    ${trailPoly(id, [[120, 360], [378, 222], [422, 222], [680, 360]], [[422, 222], [680, 360], [720, 360], [432, 222]])}
    ${trailPoly(id, [[60, 360], [120, 360], [378, 222], [372, 222]], [[60, 360], [120, 360], [378, 222], [372, 222]])}
    ${ink(bumps, 1.2, 'opacity=".55"')}
    ${rock(140, 340, 0.8, 32)}${fern(690, 352, 1, true)}
    <g class="bounce">${rider(400, 342, 1.05, 0, '#F2791C')}</g>
  `, { label: 'Motorway straight' });
}

// ---------------------------------------------------------------- start gates

function tent(x: number, y: number, color: string): string {
  return `<g transform="translate(${x} ${y})">
    <path d="M0 0 L42 -42 L84 0Z" fill="${color}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M42 -42 L84 0 L62 0Z" fill="${INK}" opacity=".22"/>
    <path d="M42 -42 L42 0" stroke="${INK}" stroke-width="1.2"/>
    <path d="M-6 0 L90 0" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>
  </g>`;
}

function crowd(seed: number): string {
  const rand = rng(seed);
  const cols = ['#D2453B', '#2F6F9F', '#F2791C', '#5B7E60', '#E8DCC4', '#33373D'];
  let out = '';
  for (let i = 0; i < 64; i++) {
    const x = 14 + (i % 32) * 25 + (i >= 32 ? 12 : 0);
    const y = i >= 32 ? 266 : 254;
    const c = cols[Math.floor(rand() * cols.length)];
    out += `<path d="M${x - 6} ${y} q6 -12 12 0Z" fill="${c}" stroke="${INK}" stroke-width="1.2"/><circle cx="${x}" cy="${y - 13}" r="4" fill="#D9A57A" stroke="${INK}" stroke-width="1.2"/>`;
    if (rand() < 0.25) out += `<path d="M${x + 5} ${y - 10} l4 -8" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>`;
  }
  return out;
}

function startGate(level: number): string {
  const id = `start${level}`;
  const banner = ['START', 'START', 'START', 'WORLD CUP'][Math.min(level, 3)];
  const big = level >= 2;
  const posts = `<path d="M300 150 L300 260 M500 150 L500 260" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
    <path d="M300 150 L300 260 M500 150 L500 260" stroke="#8C9094" stroke-width="3"/>
    <path d="M290 260 L310 260 M490 260 L510 260" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
  const truss = level >= 3
    ? `<path d="M290 128 L510 128 L510 176 L290 176Z" fill="#33373D" stroke="${INK}" stroke-width="2"/>
       <path d="${Array.from({ length: 11 }, (_, i) => `M${290 + i * 22} 128 L${312 + i * 22} 176`).join('')}" stroke="#6C7074" stroke-width="1.2"/>`
    : `<rect x="290" y="130" width="220" height="44" rx="4" fill="${level >= 1 ? '#1F6B4A' : '#8C6B4A'}" stroke="${INK}" stroke-width="2"/>`;
  const ramp = `<path d="M250 360 L370 250 L430 250 L550 360Z" fill="#8A6A4C" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    ${ink(Array.from({ length: 8 }, (_, i) => `M${370 - i * 15} ${250 + i * 13.75} L${430 + i * 15} ${250 + i * 13.75}`).join(''), 1, 'opacity=".55"')}
    <path d="M370 250 L430 250 L436 256 L364 256Z" fill="#B59366" stroke="${INK}" stroke-width="1.5"/>`;
  const flags = level >= 1
    ? Array.from({ length: 6 }, (_, i) => `<path d="M${312 + i * 32} 178 l0 10 l12 -5Z" fill="${['#F2791C', '#FBFAF6', '#D2453B'][i % 3]}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`).join('')
    : '';
  return frame(id, `
    ${big ? `<path d="M90 240 L400 34 L720 240Z" fill="#8FA7A2"/><path d="M400 34 L450 70 L428 74 L400 56 L376 76 L350 70Z" fill="${C.snow}" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/><path d="M90 240 L400 34 L720 240" fill="none" stroke="${INK}" stroke-width="1.2" opacity=".5"/>` : ''}
    ${ground(230, 11 + level)}
    ${level >= 3 ? crowd(level) : ''}
    ${level >= 1 ? tent(110, 256, '#F2791C') + tent(600, 256, '#2F6F9F') : ''}
    ${level >= 3 ? '' : conifer(50, 258, 1.5, 40 + level) + conifer(750, 258, 1.5, 44 + level) + broadleaf(200, 236, 0.9)}
    ${ramp}${posts}${truss}
    <text x="400" y="${level >= 3 ? 160 : 160}" text-anchor="middle" font-size="24" font-weight="900" letter-spacing="4" font-family="system-ui, sans-serif" fill="#FBFAF6">${banner}</text>
    ${flags}
    ${rider(400, 300, 1.1, 0)}
  `, { label: `${banner.toLowerCase()} gate` });
}

/** Scene for a trail section by its index in races/terrain.txt, or null for sections without art. */
export function sectionScene(index: number): string | null {
  switch (index) {
    case 0: return lineChoice();
    case 1: return corner('left');
    case 2: return corner('right');
    case 3: return rollers();
    case 4: return whoops();
    case 5: return switchbacks();
    case 6: return gapJump();
    case 7: return motorway();
    default: return null;
  }
}

export function startScene(endcap: number): string {
  return startGate(endcap);
}

export function titleArt(): string {
  const id = 'title';
  const trail = 'M820 150 C 700 160, 640 200, 560 210 S 420 230, 380 262 S 300 310, 200 330';
  return frame(id, `
    <path d="M0 262 L120 182 L210 226 L360 118 L500 216 L620 160 L800 236 L800 360 L0 360Z" fill="#6C8D72"/>
    <path d="M360 118 L400 148 L380 152 L360 138 L342 154 L324 148Z" fill="${C.snow}" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>
    <path d="M0 262 L120 182 L210 226 L360 118 L500 216 L620 160 L800 236" fill="none" stroke="${INK}" stroke-width="1.4" opacity=".55"/>
    <path d="M0 300 C 150 282, 240 320, 400 300 S 650 272, 800 296 L800 360 L0 360Z" fill="${C.grass}"/>
    ${conifer(60, 300, 1.1, 50)}${conifer(120, 286, 0.8, 51)}${conifer(700, 290, 1, 52)}${conifer(760, 304, 1.3, 53)}${broadleaf(640, 290, 0.8)}
    ${ribbon(id, trail, 22)}
    ${rock(300, 334, 1, 54)}${rock(520, 326, 0.8, 55)}${fern(250, 350, 1)}${fern(600, 350, 1, true)}
    ${rider(418, 300, 1.2, -10, '#F2791C')}
  `, { label: 'A rider on a mountain trail', align: 'xMidYMax' });
}
