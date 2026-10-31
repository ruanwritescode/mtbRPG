// SVG artwork: difficulty badges, the rider and bike, and an illustrated scene for every trail section and
// start gate. The style is ink line work over flat washes: one ink color, a few consistent stroke weights
// (contours 2, details 1.3), round caps and joins everywhere, and a muted outdoor palette.
import { esc } from './dom';
import { allPartImages } from './partImages';

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
 * A downhill frame in side view, facing right, drawn like a product shot of a Pivot Phoenix: no wheels
 * or fork, a tall slack head tube, a big straight down tube, a short seat mast, a near-vertical coil
 * shock in front of the seat tube driven by a rocker link, flat chainstays and a lower link at the BB.
 * Black with gold details. Origin is the bottom bracket; about 215 wide and 125 tall at scale 1.
 */
export function frameArt(x: number, y: number, scale = 1, rotate = 0): string {
  const black = '#1F2227';
  const edge = '#0D0F12';
  const hi = '#565B63';
  const gold = '#C9A04A';
  const tube = (d: string, w: number) =>
    `<path d="${d}" fill="none" stroke="${edge}" stroke-width="${w + 3}" stroke-linecap="round" stroke-linejoin="round"/>
     <path d="${d}" fill="none" stroke="${black}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>
     <path d="${d}" fill="none" stroke="${hi}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 ${-(w / 2 - 2)})" opacity=".75"/>`;
  const pivot = (cx: number, cy: number, r = 3.2) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${black}" stroke="${edge}" stroke-width="1.6"/><circle cx="${cx}" cy="${cy}" r="${r - 1.8}" fill="${hi}"/>`;
  const rand = rng(99);
  let speckle = '';
  for (let i = 0; i < 26; i++) {
    const t = rand();
    const onTop = rand() < 0.4;
    const px = onTop ? 106 - 112 * t : 113 - 109 * t;
    const py = onTop ? -110 + 54 * t : -92 + 90 * t;
    speckle += `<circle cx="${r1(px + (rand() - 0.5) * (onTop ? 5 : 8))}" cy="${r1(py + (rand() - 0.5) * (onTop ? 5 : 8))}" r="${r1(0.5 + rand() * 0.6)}" fill="${gold}" opacity=".85"/>`;
  }
  return `<g transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})">
    <!-- rear triangle -->
    ${tube('M-10 -15 Q-50 -16 -89 -3', 10)}
    ${tube('M-88 -6 L-12 -46', 8)}
    ${tube('M-80 -7 L-78 -2', 6)}
    <circle cx="-92" cy="-1" r="4.5" fill="${black}" stroke="${edge}" stroke-width="2"/><circle cx="-92" cy="-1" r="1.6" fill="${hi}"/>
    <path d="M-70 -12 L-30 -12" stroke="${hi}" stroke-width="1.2" stroke-dasharray="6 4" opacity=".6"/>
    <!-- front triangle -->
    ${tube('M113 -92 L4 -2', 14)}
    ${tube('M106 -110 L-6 -56', 9)}
    ${tube('M-5 -56 L0 -8', 9)}
    ${tube('M-5 -56 L-11 -78', 8)}
    ${tube('M109 -114 L116 -94', 12)}
    <path d="M109 -114 L110 -110" stroke="${gold}" stroke-width="10" stroke-linecap="round"/>
    <path d="M110 -117 L120 -116" stroke="${edge}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="-11" cy="-78" r="4.5" fill="${gold}" stroke="${edge}" stroke-width="1.6"/>
    <path d="M86 -70 L34 -27" stroke="${gold}" stroke-width="4.5" stroke-linecap="round" opacity=".95"/>
    <path d="M78 -66 L60 -51 M70 -58 L52 -43" stroke="${black}" stroke-width="1.6" stroke-linecap="round"/>
    ${speckle}
    <!-- links -->
    ${tube('M-10 -16 L-2 -6', 6)}${pivot(-10, -16, 2.8)}${pivot(-2, -6, 2.8)}
    <path d="M-4 -53 L18 -51 L0 -38Z" fill="${black}" stroke="${edge}" stroke-width="2.4" stroke-linejoin="round"/>
    ${pivot(-4, -53)}${pivot(0, -38)}${pivot(18, -51)}
    <!-- shock: eyelet, Kashima shaft, body, reservoir -->
    <path d="M18 -51 L16 -36" stroke="${edge}" stroke-width="8" stroke-linecap="round"/>
    <path d="M18 -51 L16 -36" stroke="${gold}" stroke-width="5" stroke-linecap="round"/>
    <path d="M16 -37 L13 -8" stroke="${edge}" stroke-width="15" stroke-linecap="round"/>
    <path d="M16 -37 L13 -8" stroke="${black}" stroke-width="12" stroke-linecap="round"/>
    <path d="M16 -36 L15.6 -32" stroke="${gold}" stroke-width="12" stroke-linecap="butt"/>
    <path d="M13.5 -30 L11.5 -12" stroke="${hi}" stroke-width="1.4" stroke-linecap="round" transform="translate(-3.5 0)" opacity=".7"/>
    <circle cx="27" cy="-45" r="7" fill="${black}" stroke="${edge}" stroke-width="2"/><circle cx="27" cy="-45" r="2.5" fill="#2F6F9F"/>
    ${pivot(13, -8)}
    <!-- cranks and chainring -->
    <circle cx="0" cy="0" r="10" fill="${black}" stroke="${edge}" stroke-width="2.2"/>
    <circle cx="0" cy="0" r="9.4" fill="none" stroke="${hi}" stroke-width="1.6" stroke-dasharray="1.6 1.6"/>
    <path d="M0 0 L36 6 M0 0 L-34 11" stroke="${edge}" stroke-width="8.5" stroke-linecap="round"/>
    <path d="M0 0 L36 6 M0 0 L-34 11" stroke="${black}" stroke-width="5.5" stroke-linecap="round"/>
    <circle cx="36" cy="6" r="1.6" fill="${hi}"/><circle cx="-34" cy="11" r="1.6" fill="${hi}"/>
    <circle cx="0" cy="0" r="3.6" fill="${hi}" stroke="${edge}" stroke-width="1.4"/>
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
  return frame(id, `
    ${ground(230, 8)}
    ${conifer(50, 252, 1.3, 12)}${broadleaf(140, 240, 0.8)}${conifer(740, 256, 1.5, 13)}${conifer(680, 242, 1, 14)}
    <path d="${top} L800 360 L0 360Z" fill="${C.dirt}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="${top} L800 360 L0 360Z" fill="url(#dots-${id})" opacity=".22"/>
    <path d="${shade}" fill="${C.dirtDark}" opacity=".45"/>
    ${rock(760, 344, 0.9, 15)}
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

// ---------------------------------------------------------------- title stickers

/** Objects from the game drawn as stickers (ink line icons with a white cut-out edge). Each is ~100 units. */
export const stickers = {
  tire: () => `<circle r="34" fill="#33373D" stroke="${INK}" stroke-width="3"/>
    <circle r="34" fill="none" stroke="#5F646B" stroke-width="5" stroke-dasharray="4 5"/>
    <circle r="22" fill="#D5D8DB" stroke="${INK}" stroke-width="2.5"/>
    <circle r="9" fill="#FBFAF6" stroke="${INK}" stroke-width="2.5"/>`,
  wheel: () => `<g transform="scale(2.4)">${wheel(0, 0)}</g>`,
  frame: () => `<g transform="translate(-6 30)">${frameArt(0, 0, 0.5, -8)}</g>`,
  rotor: () => `<circle r="34" fill="#C9CBCE" stroke="${INK}" stroke-width="3"/>
    ${Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return `<circle cx="${r1(Math.cos(a) * 24)}" cy="${r1(Math.sin(a) * 24)}" r="4" fill="#FBFAF6" stroke="${INK}" stroke-width="1.8"/>`; }).join('')}
    <circle r="12" fill="#8C9094" stroke="${INK}" stroke-width="2.5"/><circle r="4" fill="${INK}"/>
    <rect x="18" y="-46" width="22" height="30" rx="7" fill="#D2453B" stroke="${INK}" stroke-width="2.5" transform="rotate(35)"/>`,
  shock: () => `<g transform="rotate(-35)">
    <rect x="4" y="-6" width="40" height="12" rx="3" fill="#8C9094" stroke="${INK}" stroke-width="2.5"/>
    <rect x="-40" y="-13" width="48" height="26" rx="6" fill="#D5D8DB" stroke="${INK}" stroke-width="2.5"/>
    <path d="M-34 -13 L-28 13 M-26 -13 L-20 13 M-18 -13 L-12 13 M-10 -13 L-4 13" fill="none" stroke="#D2453B" stroke-width="4" stroke-linecap="round"/>
    <path d="M-34 -13 L-28 13 M-26 -13 L-20 13 M-18 -13 L-12 13 M-10 -13 L-4 13" fill="none" stroke="${INK}" stroke-width="1.2" opacity=".5"/>
    <circle cx="-46" cy="0" r="7" fill="#FBFAF6" stroke="${INK}" stroke-width="2.5"/><circle cx="50" cy="0" r="7" fill="#FBFAF6" stroke="${INK}" stroke-width="2.5"/>
  </g>`,
  snack: () => `<g transform="rotate(-18)">
    <path d="M-44 -16 L-36 -10 L-44 -4 L-36 2 L-44 8 L-36 14 L36 14 L44 8 L36 2 L44 -4 L36 -10 L44 -16Z" fill="#F2791C" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="-24" y="-16" width="48" height="30" fill="#F7A253" stroke="${INK}" stroke-width="2.5"/>
    <path d="M-14 -4 L-4 6 L2 -6 L8 4 L14 -2" fill="none" stroke="#FBFAF6" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`,
  wrench: () => `<g transform="rotate(-40)">
    <rect x="-7" y="-6" width="14" height="52" rx="5" fill="#8C9094" stroke="${INK}" stroke-width="2.5"/>
    <path d="M-16 -34 A17 17 0 1 1 16 -34 L8 -22 L-8 -22Z" fill="#B4B8BC" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M-8 -22 L8 -22 L8 -44 L-8 -44Z" fill="#FBFAF6" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="0" cy="38" r="3" fill="${INK}"/>
  </g>`,
  flag: (color = '#2E9E4F') => `<ellipse cx="2" cy="40" rx="18" ry="6" fill="${C.shadow}"/>
    <path d="M0 40 L0 -40" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M2 -40 L44 -22 L2 -4Z" fill="${color}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="16" cy="-22" r="5" fill="#FBFAF6"/>`,
  checkered: () => `<path d="M0 44 L0 -42" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M2 -42 L50 -42 L50 -8 L2 -8Z" fill="#FBFAF6" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M2 -42h12v8.5h-12zM26 -42h12v8.5h-12zM14 -33.5h12v8.5h-12zM38 -33.5h12v8.5h-12zM2 -25h12v8.5h-12zM26 -25h12v8.5h-12zM14 -16.5h12v8.5h-12zM38 -16.5h12v8.5h-12z" fill="${INK}"/>`,
  trophy: () => `<path d="M-24 -36 L24 -36 L20 -2 C20 10 -20 10 -20 -2Z" fill="#F2B83C" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M-24 -30 C-40 -30 -40 -8 -22 -8 M24 -30 C40 -30 40 -8 22 -8" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M-24 -30 C-40 -30 -40 -8 -22 -8 M24 -30 C40 -30 40 -8 22 -8" fill="none" stroke="#F2B83C" stroke-width="4"/>
    <path d="M-6 8 L6 8 L8 22 L-8 22Z" fill="#D99A1F" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="-20" y="22" width="40" height="10" rx="3" fill="#8C6B4A" stroke="${INK}" stroke-width="2.5"/>
    <path d="M-12 -28 L-10 -10" stroke="#FBFAF6" stroke-width="3" stroke-linecap="round" opacity=".8"/>`,
  badge: () => `<circle r="40" fill="#E3F0E8" stroke="${INK}" stroke-width="3"/>
    <circle cx="16" cy="-14" r="8" fill="#F2B83C" stroke="${INK}" stroke-width="2"/>
    <path d="M-34 20 L-12 -14 L0 2 L10 -10 L34 20Z" fill="#5B7E60" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M-12 -14 L-6 -5 L-10 -3 L-12 -8 L-16 -2 L-20 -4Z" fill="#FBFAF6" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M-40 20 L40 20" stroke="${INK}" stroke-width="2.5"/>`,
  pin: () => `<path d="M0 40 C-18 16 -26 4 -26 -10 A26 26 0 1 1 26 -10 C26 4 18 16 0 40Z" fill="#F2791C" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <circle cy="-10" r="11" fill="#FBFAF6" stroke="${INK}" stroke-width="2.5"/>`,
  helmet: () => `<g transform="translate(-4 36) scale(2.4)">
    <path d="M8 -79 C8 -88 15 -93 22 -92 C29 -91 33 -86 33 -80 L34 -73 L28 -69 L18 -69 L10 -72Z" transform="translate(-21 80)" fill="#1F6B4A" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M22 -92 L37 -88 L36 -85 L28 -87Z" transform="translate(-21 80)" fill="#1F6B4A" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M14 -81 L32 -80 L32 -75 L15 -76Z" transform="translate(-21 80)" fill="#2F6F9F" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>
  </g>`,
  sign: (shape: 'circle' | 'square' | 'diamond' = 'diamond') => {
    const col = shape === 'circle' ? '#2E9E4F' : shape === 'square' ? '#1F6FD1' : INK;
    const mark = shape === 'circle' ? '<circle r="12" fill="' + col + '"/>' : shape === 'square' ? '<rect x="-11" y="-11" width="22" height="22" rx="2" fill="' + col + '"/>' : '<rect x="-10" y="-10" width="20" height="20" fill="' + col + '" transform="rotate(45)"/>';
    return `<path d="M0 44 L0 0" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M0 44 L0 0" stroke="#8C6B4A" stroke-width="3"/>
      <rect x="-24" y="-44" width="48" height="44" rx="5" fill="#FBFAF6" stroke="${INK}" stroke-width="3"/>
      <g transform="translate(0 -22)">${mark}</g>`;
  },
  cash: () => `<g transform="rotate(-8)">
    <rect x="-44" y="-22" width="88" height="44" rx="5" fill="#5BAA6E" stroke="${INK}" stroke-width="2.5"/>
    <rect x="-36" y="-15" width="72" height="30" rx="3" fill="none" stroke="#FBFAF6" stroke-width="2" opacity=".8"/>
    <circle r="12" fill="#FBFAF6" stroke="${INK}" stroke-width="2"/>
    <text y="5" text-anchor="middle" font-size="16" font-weight="900" font-family="system-ui, sans-serif" fill="${INK}">$</text>
  </g>`,
};

type StickerName = keyof typeof stickers;

export type ItemKind = 'frame' | 'suspension' | 'brakes' | 'wheels' | 'tires' | 'snacks' | 'toolkits';
const ITEM_STICKER: Record<ItemKind, StickerName> = { frame: 'frame', suspension: 'shock', brakes: 'rotor', wheels: 'wheel', tires: 'tire', snacks: 'snack', toolkits: 'wrench' };

/** A small inline icon for a kind of shop item, drawn from the same stickers as the title screen. */
export function itemIcon(kind: ItemKind, size = 40): string {
  const fn = stickers[ITEM_STICKER[kind]] as () => string;
  return `<svg class="item-icon" width="${size}" height="${size}" viewBox="-58 -58 116 116" aria-hidden="true"><g transform="scale(.92)">${fn()}</g></svg>`;
}
type Placement = [StickerName, number, number, number, number, ...string[]];

const LANDSCAPE: Placement[] = [
  ['wrench', 330, 100, 15, 0.9], ['rotor', 620, 92, 10, 0.8], ['badge', 870, 80, -8, 0.9], ['pin', 1080, 110, 10, 0.8],
  ['shock', 130, 100, -10, 0.8], ['wheel', 1130, 240, 8, 0.7],
  ['tire', 130, 210, -15, 1], ['snack', 130, 390, 0, 1], ['sign', 110, 560, -6, 0.9, 'circle'], ['frame', 250, 620, 0, 2.9],
  ['trophy', 1040, 250, 8, 1.1], ['flag', 1130, 400, 0, 1, '#1F6FD1'], ['cash', 1030, 520, 0, 1], ['wheel', 1090, 660, 12, 1],
  ['shock', 430, 690, 0, 0.9], ['helmet', 600, 690, -10, 0.8], ['sign', 780, 680, 5, 0.85, 'diamond'], ['checkered', 930, 660, 6, 0.9],
];
// A phone shows the middle ~560 of these 800 units, so everything sits between x 150 and 650.
const PORTRAIT: Placement[] = [
  ['wrench', 190, 90, 15, 0.8], ['trophy', 330, 120, 8, 0.9], ['rotor', 480, 70, 10, 0.7], ['badge', 610, 120, -8, 0.8],
  ['tire', 170, 250, -15, 0.8], ['flag', 640, 270, 0, 0.8, '#1F6FD1'], ['pin', 165, 400, 10, 0.6], ['snack', 640, 420, 0, 0.75],
  ['frame', 300, 950, 0, 2.2], ['cash', 430, 880, 0, 0.8], ['wheel', 600, 940, 12, 0.8],
  ['shock', 350, 1040, 0, 0.8], ['helmet', 500, 1050, -10, 0.7], ['sign', 630, 1070, 5, 0.75, 'diamond'], ['checkered', 190, 1070, 6, 0.7],
];

/** Sticker slots that real product photos take over when they exist, in the order photos are used. */
const PHOTO_SLOTS: StickerName[] = ['frame', 'shock', 'rotor', 'wheel', 'tire', 'snack', 'wrench'];

function stickerLayer(id: string, places: Placement[], vw: number, vh: number): string {
  // Frames first so they land in the big frame slot; the portrait layout starts further along the list.
  const photos = allPartImages().sort((x, y) => Number(/demo|sender|v10|phoenix|commencal/.test(y.slug)) - Number(/demo|sender|v10|phoenix|commencal/.test(x.slug)));
  const rest = photos.slice(1);
  let photoIndex = id === 'port' ? Math.floor(rest.length / 2) : 0;
  const items = places.map(([name, x, y, rot, scale, ...args]) => {
    const fn = stickers[name] as (...a: string[]) => string;
    let body = fn(...args);
    if (photos.length && PHOTO_SLOTS.includes(name)) {
      // The big frame slot always shows a frame; the other slots cycle through the rest.
      const photo = name === 'frame' ? photos[id === 'port' && photos.length > 1 ? 1 : 0] : rest.length ? rest[photoIndex++ % rest.length] : photos[0];
      // Photos get a fixed footprint on screen whatever the slot's scale: big for the frame slot, medium elsewhere.
      const size = (name === 'frame' ? 240 : 150) / scale;
      body = `<image href="${photo.url}" x="${r1(-size / 2)}" y="${r1(-size / 2)}" width="${r1(size)}" height="${r1(size)}" preserveAspectRatio="xMidYMid meet"/>`;
    }
    return `<g filter="url(#sticker-${id})" transform="translate(${x} ${y}) rotate(${rot}) scale(${scale})">${body}</g>`;
  }).join('');
  return `<svg class="title-bg-svg ${id}" viewBox="0 0 ${vw} ${vh}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <filter id="sticker-${id}" x="-20%" y="-20%" width="140%" height="140%" primitiveUnits="userSpaceOnUse">
        <feMorphology in="SourceAlpha" operator="dilate" radius="4" result="d"/>
        <feFlood flood-color="#FFFFFF" result="w"/><feComposite in="w" in2="d" operator="in" result="edge"/>
        <feGaussianBlur in="d" stdDeviation="3" result="b"/><feFlood flood-color="#16181A" flood-opacity=".14" result="s"/><feComposite in="s" in2="b" operator="in" result="shadow"/>
        <feOffset in="shadow" dx="0" dy="4" result="shadow2"/>
        <feMerge><feMergeNode in="shadow2"/><feMergeNode in="edge"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <radialGradient id="glow-${id}" cx="50%" cy="50%" r="45%"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".9"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="${vw}" height="${vh}" fill="#EEF3EA"/>
    <rect width="${vw}" height="${vh}" fill="url(#glow-${id})"/>
    ${items}
  </svg>`;
}

/** Full-bleed title background: game objects scattered around a clear centre, one layout per orientation. */
export function titleBackground(): string {
  return stickerLayer('land', LANDSCAPE, 1200, 800) + stickerLayer('port', PORTRAIT, 800, 1200);
}
