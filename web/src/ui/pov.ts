// First-person trail scenes for the race. Every section is drawn from the cockpit: one trail runs away from
// the bars, and each line choice is a line down it (left side, middle, right side) carrying the feature that
// line rides (rocks, roots, a rut, a berm, a gap...) with a sign for its arrow key.
import type { TerrainFeature } from '../engine/parse';
import { C, INK, broadleaf, clouds, conifer, defs, fern, hatch, ink, line, r1, ridges, rng, rock } from './art';
import { esc } from './dom';

export type Lane = 'left' | 'straight' | 'right';

export const LANE_KEY: Record<string, Lane> = {
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowUp: 'straight', w: 'straight', W: 'straight',
  ArrowRight: 'right', d: 'right', D: 'right',
};
export const LANE_GLYPH: Record<Lane, string> = { left: '←', straight: '↑', right: '→' };

/** Which lane each option of a section takes. Options beyond the third have no lane (number keys only). */
export function lanesFor(feat: TerrainFeature): Lane[] {
  const n = feat.options.length;
  const title = feat.title.toLowerCase();
  if (n === 1) return ['straight'];
  if (n === 2) {
    if (title.includes('right hand')) return ['right', 'left']; // inside, outside
    if (title.includes('gap')) return ['straight', 'right']; // send it, chicken line
    return ['left', 'right'];
  }
  return ['left', 'straight', 'right'];
}

// ---------------------------------------------------------------- geometry
const W = 800;
const H = 360;
// The scene is drawn 200 units past each side, so a wide container shows more scenery instead of cropping
// off the top of the trail. Everything that matters stays within x 112-688 (what a 16:10 phone shows).
const X0 = -200;
const VW = W - 2 * X0;
const HZ = 168; // where the trail would vanish
type Pt = [number, number];
type Curve = [Pt, Pt, Pt, Pt];

/** The one trail, from the bars to the distance; corners bend it. */
const TRAILS = {
  straight: [[400, 372], [400, 310], [400, 250], [400, 212]] as Curve,
  left: [[400, 372], [400, 306], [356, 240], [272, 214]] as Curve,
  right: [[400, 372], [400, 306], [444, 240], [528, 214]] as Curve,
};
/** How wide the trail is at a given height on screen. */
const trailWidth = (y: number) => Math.max(8, (y - HZ) * 1.85);
/** Where each line runs across the trail (-0.5 left edge … 0.5 right edge) and how wide it is. */
const LANE_OFF: Record<Lane, number> = { left: -0.32, straight: 0, right: 0.32 };
const LANE_W = 0.33;

/** A line down the trail: an offset across it, with its own width as a share of the trail's. */
interface Track {
  trail: Curve;
  off: number;
  wf: number;
}

function bez(c: Curve, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, d = 3 * u * t * t, e = t * t * t;
  return [a * c[0][0] + b * c[1][0] + d * c[2][0] + e * c[3][0], a * c[0][1] + b * c[1][1] + d * c[2][1] + e * c[3][1]];
}

interface At { x: number; y: number; w: number; nx: number; ny: number; tx: number; ty: number }
/** Point on a track, its width there, the unit tangent (direction of travel) and the normal (to the rider's right). */
function at(c: Track, t: number): At {
  const [x, y] = bez(c.trail, t);
  const [x2, y2] = bez(c.trail, Math.min(1, t + 0.01));
  const [x1, y1] = bez(c.trail, Math.max(0, t - 0.01));
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const tx = (x2 - x1) / len, ty = (y2 - y1) / len;
  const nx = -ty, ny = tx;
  const tw = trailWidth(y);
  return { x: x + nx * c.off * tw, y: y + ny * c.off * tw, w: tw * c.wf, tx, ty, nx, ny };
}
/** A point across the track: `o` is -0.5 (left edge) to 0.5 (right edge), in track widths. */
function across(p: At, o: number): Pt {
  return [p.x + p.nx * o * p.w, p.y + p.ny * o * p.w];
}
const P = ([x, y]: Pt) => `${r1(x)} ${r1(y)}`;
const pathOf = (pts: Pt[], close = false) => pts.map((p, i) => `${i ? 'L' : 'M'}${P(p)}`).join('') + (close ? 'Z' : '');

/** Outline of a track strip from t0 to t1, between offsets o0 and o1 across it. */
function strip(c: Track, t0 = 0, t1 = 1, o0 = -0.5, o1 = 0.5, n = 22): Pt[] {
  const a: Pt[] = [];
  const b: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const p = at(c, t0 + ((t1 - t0) * i) / n);
    a.push(across(p, o0));
    b.push(across(p, o1));
  }
  return [...a, ...b.reverse()];
}
/** A path along the track at offset `o`. */
function along(c: Track, t0: number, t1: number, o = 0, n = 18): string {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) pts.push(across(at(c, t0 + ((t1 - t0) * i) / n), o));
  return pathOf(pts);
}
/** A line straight across the track at t, a little wider than the track by `over`. */
function crossLine(c: Track, t: number, over = 1): [Pt, Pt] {
  const p = at(c, t);
  return [across(p, -0.5 * over), across(p, 0.5 * over)];
}

// ---------------------------------------------------------------- lane features
type Deco =
  | 'rocks' | 'roots' | 'rut' | 'apex' | 'berm' | 'triple' | 'double' | 'pump' | 'whoops'
  | 'gaps' | 'hairpin' | 'turns' | 'kicker' | 'smooth' | 'chatter' | 'tuck' | 'pedal';

const BY_LABEL: Record<string, Deco> = {
  'rock garden': 'rocks', roots: 'roots', rut: 'rut',
  'corner inside': 'apex', 'corner outside': 'berm',
  triple: 'triple', double: 'double', pump: 'pump',
  'berm gaps': 'gaps', 'endo turns': 'hairpin', 'full turns': 'turns',
  'send it!': 'kicker', 'chicken line': 'smooth',
  'power down': 'chatter', tuck: 'tuck', pedal: 'pedal',
};
const BY_MODIFIER: Record<string, Deco> = { strength: 'rocks', skill: 'roots', endurance: 'pump', time: 'smooth', bike: 'whoops' };

function decoFor(label: string, modifier: string): Deco {
  return BY_LABEL[label.toLowerCase().trim()] ?? BY_MODIFIER[modifier] ?? 'smooth';
}

/** A roller or whoop seen from behind: a lit face rising to an inked crest. */
function hump(c: Track, t: number, size: number): string {
  const p = at(c, t);
  const [l, r] = crossLine(c, t, 1.02);
  const h = Math.max(2, p.w * 0.2 * size);
  const mid: Pt = [p.x, p.y];
  const face = `M${P([l[0], l[1] + h])}L${P(l)}Q${P([mid[0], mid[1] - h * 0.5])} ${P(r)}L${P([r[0], r[1] + h])}Q${P([mid[0], mid[1] + h * 0.55])} ${P([l[0], l[1] + h])}Z`;
  return `<path d="${face}" fill="${C.dirtLight}" stroke="${INK}" stroke-width="${r1(Math.min(1.8, 0.7 + p.w * 0.02))}" stroke-linejoin="round"/>
    <path d="M${P([l[0], l[1] + h])}Q${P([mid[0], mid[1] + h * 0.55])} ${P([r[0], r[1] + h])}" fill="none" stroke="${C.dirtDark}" stroke-width="${r1(Math.max(1, h * 0.35))}" opacity=".55"/>`;
}

/** An airtime arc from t0 to t1, lifted `lift` px above the lane. */
function airArc(c: Track, t0: number, t1: number, lift: number, tone: 'fast' | 'safe' | 'risky' = 'risky'): string {
  const a = at(c, t0);
  const b = at(c, t1);
  const m = at(c, (t0 + t1) / 2);
  return line(`M${r1(a.x)} ${r1(a.y)}Q${r1(m.x)} ${r1(m.y - lift)} ${r1(b.x)} ${r1(b.y)}`, tone);
}

function gapBand(id: string, c: Track, t0: number, t1: number, over = 1.15): string {
  const pts = strip(c, t0, t1, -0.5 * over, 0.5 * over, 6);
  const d = pathOf(pts, true);
  return `<path d="${d}" fill="#3F4B41" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>${hatch(id, d, 0.35)}`;
}

function deco(id: string, kind: Deco, c: Track, lane: Lane, seed: number): string {
  const rand = rng(seed);
  switch (kind) {
    case 'rocks': {
      const ts = [0.9, 0.8, 0.68, 0.56, 0.44, 0.32, 0.2, 0.08];
      return ts.map((t, i) => {
        const p = at(c, t);
        const [x, y] = across(p, (((i * 7) % 3) - 1) * 0.27 + (rand() - 0.5) * 0.08);
        return rock(r1(x), r1(y), r1(p.w / 40), seed + i);
      }).join('');
    }
    case 'roots': {
      let out = '';
      for (const t of [0.82, 0.62, 0.44, 0.27, 0.1]) {
        const p = at(c, t);
        const [l, r] = crossLine(c, t, 1.18);
        const bend = (rand() - 0.5) * 0.5 * p.w;
        const c1: Pt = [l[0] + (r[0] - l[0]) * 0.35 + p.tx * bend, l[1] + (r[1] - l[1]) * 0.35 + p.ty * bend];
        const c2: Pt = [l[0] + (r[0] - l[0]) * 0.7 - p.tx * bend, l[1] + (r[1] - l[1]) * 0.7 - p.ty * bend];
        const d = `M${P(l)}C${P(c1)} ${P(c2)} ${P(r)}`;
        const sw = Math.max(1.6, p.w * 0.11);
        out += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${r1(sw + 2)}" stroke-linecap="round"/>
          <path d="${d}" fill="none" stroke="${C.trunk}" stroke-width="${r1(sw)}" stroke-linecap="round"/>
          <path d="${d}" fill="none" stroke="#9C8268" stroke-width="${r1(sw * 0.3)}" stroke-linecap="round" transform="translate(0 ${r1(-sw * 0.2)})"/>`;
      }
      return out;
    }
    case 'rut': {
      const groove = pathOf(strip(c, 0, 0.97, -0.13, 0.13), true);
      return `<path d="${groove}" fill="${C.dirtDark}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
        ${hatch(id, groove, 0.4)}
        ${ink(along(c, 0, 0.97, -0.2), 1.2, `stroke="${C.dirtLight}" stroke-width="2.4"`)}
        ${ink(along(c, 0, 0.97, 0.2), 1.2, `stroke="${C.dirtLight}" stroke-width="2.4"`)}`;
    }
    case 'apex': {
      const inner = lane === 'left' ? -1 : 1;
      const p = at(c, 0.62);
      const [sx, sy] = across(p, inner * 0.72);
      return `${line(along(c, 0.02, 0.98, inner * 0.26), 'fast')}
        ${rock(r1(sx), r1(sy), r1(p.w / 46), seed)}
        ${fern(r1(sx + inner * 10), r1(sy + 4), r1(p.w / 50), inner > 0)}`;
    }
    case 'berm': {
      const outer = lane === 'right' ? 1 : -1;
      const o0 = outer * 0.22, o1 = outer * 0.78;
      const wall = pathOf(strip(c, 0.12, 1, Math.min(o0, o1), Math.max(o0, o1)), true);
      return `<path d="${wall}" fill="${C.dirtDark}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
        ${hatch(id, wall, 0.38)}
        ${ink(along(c, 0.12, 1, outer * 0.74), 1.2, `stroke="${C.dirtLight}" stroke-width="2.6"`)}
        ${line(along(c, 0.02, 0.98, outer * 0.12), 'safe')}`;
    }
    case 'triple':
      return [0.74, 0.48, 0.22].map((t) => hump(c, t, 1.5)).join('') + airArc(c, 0.12, 0.84, 70);
    case 'double':
      return [0.76, 0.58, 0.38, 0.2].map((t) => hump(c, t, 1.1)).join('') + airArc(c, 0.12, 0.42, 30) + airArc(c, 0.5, 0.8, 22);
    case 'pump': {
      const ts = [0.86, 0.73, 0.6, 0.47, 0.34, 0.21, 0.08];
      let wave = '';
      for (let i = 0; i <= 28; i++) {
        const t = 0.04 + (0.88 * i) / 28;
        const p = at(c, t);
        const [x, y] = across(p, 0);
        wave += `${i ? 'L' : 'M'}${r1(x)} ${r1(y - Math.abs(Math.sin(i * 0.8)) * p.w * 0.12)}`;
      }
      return ts.map((t) => hump(c, t, 0.75)).join('') + line(wave, 'safe');
    }
    case 'whoops':
      return Array.from({ length: 11 }, (_, i) => hump(c, 0.92 - i * 0.084, 0.95)).join('');
    case 'gaps':
      return gapBand(id, c, 0.62, 0.7) + gapBand(id, c, 0.3, 0.4) +
        airArc(c, 0.22, 0.46, 34) + airArc(c, 0.56, 0.76, 22);
    case 'hairpin': {
      // Tight hooks, each with a little berm on its outside.
      const pts: Pt[] = [];
      let hooks = '';
      [0.06, 0.24, 0.42, 0.6, 0.78, 0.94].forEach((t, i) => {
        const p = at(c, t);
        const o = i === 0 || i === 5 ? 0 : i % 2 ? 0.36 : -0.36;
        pts.push(across(p, o));
        if (o) {
          const [x, y] = across(p, o * 1.32);
          hooks += `<path d="M${r1(x - p.w * 0.12)} ${r1(y + p.w * 0.1)}Q${r1(x)} ${r1(y - p.w * 0.14)} ${r1(x + p.w * 0.12)} ${r1(y + p.w * 0.1)}" fill="none" stroke="${INK}" stroke-width="${r1(Math.max(1.4, p.w * 0.08))}" stroke-linecap="round"/>`;
        }
      });
      return hooks + line(pathOf(pts), 'risky');
    }
    case 'turns': {
      let d = '';
      for (let i = 0; i <= 36; i++) {
        const t = 0.03 + (0.93 * i) / 36;
        const [x, y] = across(at(c, t), Math.sin(i * 0.26) * 0.34);
        d += `${i ? 'L' : 'M'}${r1(x)} ${r1(y)}`;
      }
      return line(d, 'safe');
    }
    case 'kicker': {
      const ramp = pathOf(strip(c, 0.16, 0.38, -0.36, 0.36, 8), true);
      let planks = '';
      for (let t = 0.19; t < 0.38; t += 0.035) {
        const p = at(c, t);
        planks += `M${P(across(p, -0.36))}L${P(across(p, 0.36))}`;
      }
      return `<path d="${ramp}" fill="#B59366" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
        ${ink(planks, 1, 'opacity=".6"')}
        ${gapBand(id, c, 0.42, 0.62, 1.5)}
        ${airArc(c, 0.36, 0.72, 78)}`;
    }
    case 'smooth':
      return line(along(c, 0.03, 0.97, 0), 'safe');
    case 'chatter': {
      let d = '';
      for (let t = 0.06; t < 0.95; t += 0.055) {
        const p = at(c, t);
        const [l, r] = crossLine(c, t, 0.86);
        d += `M${P(l)}Q${r1(p.x)} ${r1(p.y - p.w * 0.06)} ${P(r)}`;
      }
      return ink(d, 1.2, 'opacity=".7"') + line(along(c, 0.03, 0.97, 0), 'fast');
    }
    case 'tuck': {
      let d = '';
      for (const t of [0.12, 0.3, 0.48, 0.66, 0.84]) {
        for (const o of [-0.62, 0.62]) {
          const a = across(at(c, t), o);
          const b = across(at(c, t + 0.08), o);
          d += `M${P(a)}L${P(b)}`;
        }
      }
      return ink(d, 1.6, `stroke="#FBFAF6" opacity=".9"`) + line(along(c, 0.03, 0.97, 0), 'fast');
    }
    case 'pedal': {
      let out = '';
      for (const t of [0.84, 0.66, 0.48, 0.3, 0.12]) {
        const p = at(c, t);
        const s = p.w * 0.22;
        const tip: Pt = [p.x + p.tx * s, p.y + p.ty * s];
        const l: Pt = [p.x - p.nx * s - p.tx * s * 0.2, p.y - p.ny * s - p.ty * s * 0.2];
        const r: Pt = [p.x + p.nx * s - p.tx * s * 0.2, p.y + p.ny * s - p.ty * s * 0.2];
        const d = `M${P(l)}L${P(tip)}L${P(r)}`;
        out += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${r1(Math.max(3, p.w * 0.12))}" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="${d}" fill="none" stroke="#F3C96B" stroke-width="${r1(Math.max(1.5, p.w * 0.07))}" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
      return out;
    }
  }
}

// ---------------------------------------------------------------- scenery
function grassland(seed: number): string {
  const rand = rng(seed);
  let tufts = '';
  for (let i = 0; i < 160; i++) {
    const y = 172 + Math.pow(rand(), 0.7) * (H - 172);
    const x = X0 + rand() * VW;
    const k = (y - HZ) / 200;
    const h = 2 + k * 6;
    tufts += `M${r1(x)} ${r1(y)}l${r1(-k * 3)} ${r1(-h)}M${r1(x)} ${r1(y)}l${r1(k)} ${r1(-h - 1)}M${r1(x)} ${r1(y)}l${r1(k * 4)} ${r1(-h + 1)}`;
  }
  return `<rect x="${X0}" y="168" width="${VW}" height="${H - 168}" fill="${C.grass}"/>
    <path d="M${X0} 168 H${W - X0}" stroke="${INK}" stroke-width="1" opacity=".35"/>
    <path d="${tufts}" fill="none" stroke="${C.grassDark}" stroke-width="1.1" stroke-linecap="round"/>`;
}

/** A row of small far-off conifers along the horizon, where the lanes disappear into the woods. */
function treeline(seed: number): string {
  const rand = rng(seed);
  let out = '';
  for (let x = X0 - 10; x < W - X0 + 20; x += 22 + rand() * 14) out += conifer(r1(x), r1(176 + rand() * 6), r1(0.34 + rand() * 0.16), seed + Math.round(x));
  return out;
}

function sides(seed: number): string {
  let out = conifer(84, 330, 2.5, seed) + conifer(170, 262, 1.5, seed + 1) + broadleaf(236, 212, 0.7) + conifer(126, 214, 0.9, seed + 2);
  out += conifer(716, 330, 2.5, seed + 3) + conifer(630, 262, 1.5, seed + 4) + broadleaf(564, 212, 0.7) + conifer(676, 214, 0.9, seed + 5);
  out += fern(200, 352, 1.4) + fern(600, 352, 1.4, true) + rock(214, 300, 1.1, seed + 6) + rock(590, 306, 0.9, seed + 7);
  // Out past the edges, seen only in wide views.
  out += conifer(-150, 300, 2, seed + 20) + conifer(-60, 236, 1.2, seed + 21) + broadleaf(10, 222, 0.8) + rock(-90, 330, 1.2, seed + 22) + fern(-20, 350, 1.3);
  out += conifer(950, 300, 2, seed + 23) + conifer(860, 236, 1.2, seed + 24) + broadleaf(790, 222, 0.8) + rock(890, 330, 1.2, seed + 25) + fern(820, 350, 1.3, true);
  out += conifer(318, 190, 0.5, seed + 8) + conifer(484, 190, 0.5, seed + 9) + fern(296, 206, 0.5) + fern(506, 206, 0.5, true);
  return out;
}

/** Course tape along both sides of a lane: there's only one way through. */
function tape(c: Track): string {
  let out = '';
  for (const o of [-0.85, 0.85]) {
    const d = along(c, 0.02, 0.96, o);
    out += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="#F2791C" stroke-width="2.2" stroke-dasharray="7 6" stroke-linecap="round"/>`;
    for (const t of [0.06, 0.3, 0.56, 0.82]) {
      const p = at(c, t);
      const [x, y] = across(p, o);
      const h = Math.min(26, p.w * 0.2);
      out += `<path d="M${r1(x)} ${r1(y + 2)}V${r1(y - h)}" stroke="${INK}" stroke-width="${r1(Math.min(3, Math.max(1.5, p.w * 0.03)))}" stroke-linecap="round"/>`;
    }
  }
  return out;
}

/** The view over the bars: riser bar, grips, levers, direct-mount stem and dual-crown fork. */
function cockpit(): string {
  const bar = 'M148 316 C 230 338, 300 345, 400 345 C 500 345, 570 338, 652 316';
  const gripL = 'M150 317 C 166 322, 190 329, 214 334';
  const gripR = 'M650 317 C 634 322, 610 329, 586 334';
  const ribs = (d: 'l' | 'r') => Array.from({ length: 6 }, (_, i) => {
    const x = d === 'l' ? 158 + i * 9 : 642 - i * 9;
    const y = 319 + i * 2.6;
    return `M${x} ${r1(y - 7)}l${d === 'l' ? 1.5 : -1.5} 14`;
  }).join('');
  const lever = (s: 1 | -1) => {
    const x = (v: number) => 400 + s * (v - 400);
    return `<path d="M${x(256)} 336 Q ${x(226)} 318 ${x(194)} 310" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
      <path d="M${x(256)} 336 Q ${x(226)} 318 ${x(194)} 310" fill="none" stroke="#B9BDC2" stroke-width="4.5" stroke-linecap="round"/>
      <rect x="${Math.min(x(244), x(276))}" y="326" width="32" height="15" rx="4" fill="#2F3338" stroke="${INK}" stroke-width="2"/>
      <rect x="${Math.min(x(250), x(262))}" y="329" width="12" height="7" rx="2" fill="#E25B45"/>`;
  };
  return `<g class="cockpit" pointer-events="none">
    <path d="M377 296 C 377 274, 423 274, 423 296Z" fill="#26292D" stroke="${INK}" stroke-width="2"/>
    <path d="M384 292 C 386 282, 414 282, 416 292" fill="none" stroke="#565C62" stroke-width="2" stroke-dasharray="3 4" stroke-linecap="round"/>
    <path d="M352 322 L364 290 M448 322 L436 290" stroke="${INK}" stroke-width="15" stroke-linecap="round"/>
    <path d="M352 322 L364 290 M448 322 L436 290" stroke="#C9A24A" stroke-width="10" stroke-linecap="round"/>
    <path d="M356 316 L366 290 M444 316 L434 290" stroke="#E8CF8A" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M346 296 Q 400 280 454 296 L450 290 Q 400 274 350 290Z" fill="#2B2E33" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M330 330 L470 330 L460 312 L340 312Z" fill="#2B2E33" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M342 318 L458 318" stroke="#555B61" stroke-width="2"/>
    <rect x="370" y="310" width="60" height="34" rx="7" fill="#33373D" stroke="${INK}" stroke-width="2"/>
    <circle cx="400" cy="320" r="8" fill="#4A5056" stroke="${INK}" stroke-width="2"/>
    <path d="M397 318 l3 -2 l3 2 v3 l-3 2 l-3 -2Z" fill="#2B2E33"/>
    <path d="${bar}" fill="none" stroke="${INK}" stroke-width="17" stroke-linecap="round"/>
    <path d="${bar}" fill="none" stroke="#3A3F45" stroke-width="12.5" stroke-linecap="round"/>
    <path d="${bar}" fill="none" stroke="#7A8188" stroke-width="2" stroke-linecap="round" transform="translate(0 -3.5)"/>
    ${lever(1)}${lever(-1)}
    <path d="${gripL} M${gripR.slice(1)}" fill="none" stroke="${INK}" stroke-width="24" stroke-linecap="round"/>
    <path d="${gripL} M${gripR.slice(1)}" fill="none" stroke="#1F2226" stroke-width="19.5" stroke-linecap="round"/>
    <path d="${ribs('l')}${ribs('r')}" stroke="#3D4247" stroke-width="2" stroke-linecap="round"/>
    <rect x="360" y="334" width="80" height="17" rx="5" fill="#3E444A" stroke="${INK}" stroke-width="2"/>
    <circle cx="370" cy="342.5" r="2.4" fill="#9AA0A6"/><circle cx="430" cy="342.5" r="2.4" fill="#9AA0A6"/>
    <circle cx="390" cy="342.5" r="2.4" fill="#9AA0A6"/><circle cx="410" cy="342.5" r="2.4" fill="#9AA0A6"/>
  </g>`;
}

/** The sign for a line: arrow key chip plus the line's name, up in the sky with a pointer down to the line. */
function sign(lane: Lane, label: string, slotX: number, target: Pt): string {
  const tw = Math.round(label.length * 8.4 + 52);
  const y = lane === 'straight' ? 122 : 136;
  const x = Math.min(Math.max(slotX, 124 + tw / 2), 676 - tw / 2);
  const rot = lane === 'left' ? 180 : lane === 'straight' ? -90 : 0;
  const chipX = -tw / 2 + 18;
  return `<path d="M${r1(x)} ${y + 14}L${r1(target[0])} ${r1(target[1])}" stroke="${INK}" stroke-width="2" stroke-dasharray="4 4" stroke-linecap="round" opacity=".7"/>
    <circle cx="${r1(target[0])}" cy="${r1(target[1])}" r="4" fill="#FBFAF6" stroke="${INK}" stroke-width="2"/>
    <g class="lane-sign" transform="translate(${r1(x)} ${y})">
      <rect x="${-tw / 2}" y="-14" width="${tw}" height="31" rx="15.5" fill="#D9D5C7" stroke="${INK}" stroke-width="2"/>
      <rect class="sign-face" x="${-tw / 2}" y="-17" width="${tw}" height="31" rx="15.5" fill="#FBFAF6" stroke="${INK}" stroke-width="2"/>
      <rect x="${chipX - 12}" y="-12" width="24" height="21" rx="6" fill="${INK}"/>
      <path d="M-6 0H6M1 -5L6 0L1 5" transform="translate(${chipX} -1.5) rotate(${rot})" fill="none" stroke="#FBFAF6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="${r1(chipX + 18 + (tw / 2 - 12 - (chipX + 18)) / 2)}" y="3.5" text-anchor="middle" font-size="15" font-weight="800" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" fill="${INK}">${esc(label)}</text>
    </g>`;
}

/** First-person scene for a trail section: one trail, with a line down it for every option. */
export function povScene(feat: TerrainFeature, index: number): string {
  const id = `pov${index}`;
  const lanes = lanesFor(feat);
  const title = feat.title.toLowerCase();
  const trail = title.includes('left hand') ? TRAILS.left : title.includes('right hand') ? TRAILS.right : TRAILS.straight;
  const whole: Track = { trail, off: 0, wf: 1 };
  const tracks: Track[] = lanes.length === 1 ? [whole] : lanes.map((l) => ({ trail, off: LANE_OFF[l], wf: LANE_W }));

  // The trail itself: one ribbon from the bars to the distance, shaded on the right edge.
  const body = pathOf(strip(whole, 0, 1, -0.5, 0.5, 30), true);
  const shade = pathOf(strip(whole, 0, 1, 0.42, 0.5, 30), true);
  const trailSvg = `<path d="${body}" fill="${C.dirt}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="${body}" fill="url(#dots-${id})" opacity=".2"/>
    <path d="${shade}" fill="${C.dirtDark}" opacity=".35"/>
    ${ink(along(whole, 0.02, 0.98, -0.5), 1, 'opacity=".35"')}${ink(along(whole, 0.02, 0.98, 0.5), 1, 'opacity=".35"')}`;

  // Sign slots spread across the sky so labels never crowd each other.
  const slots: Record<Lane, number> = lanes.length === 2 && !lanes.includes('straight') ? { left: 290, straight: 400, right: 510 } : { left: 236, straight: 400, right: 564 };
  const lanesSvg = lanes.map((lane, i) => {
    const t = tracks[i];
    const o = feat.options[i];
    const hl = pathOf(strip(t, 0.01, 0.99, -0.5, 0.5), true);
    const kind = decoFor(o.label, o.modifier);
    const target = at(t, 0.72);
    return `<g class="lane" data-act="line" data-n="${i + 1}" data-lane="${lane}">
      <path class="lane-hl" d="${hl}" fill="#FBFAF6" fill-opacity="0" stroke="#58CC02" stroke-opacity="0" stroke-width="3" stroke-linejoin="round"/>
      ${deco(id, kind, t, lane, index * 31 + i * 7 + 3)}
      ${lanes.length === 1 ? tape(t) : ''}
      ${sign(lane, o.label, slots[lane], [target.x, target.y])}
    </g>`;
  }).join('');

  const hills = ridges();
  return `<svg class="scene-svg pov" viewBox="${X0} 0 ${VW} ${H}" role="img" aria-label="${esc(feat.title)}: ${esc(feat.options.map((o, i) => `${lanes[i] ?? ''} ${o.label}`).join(', '))}" preserveAspectRatio="xMidYMax slice">
    ${defs(id)}
    <rect x="${X0}" width="${VW}" height="${H}" fill="url(#sky-${id})"/>
    ${clouds()}<g transform="translate(-560 18)">${clouds()}</g><g transform="translate(560 -6)">${clouds()}</g>
    <g transform="translate(0 -46)">${hills}<g transform="translate(1 0) scale(-1 1)">${hills}</g><g transform="translate(1599 0) scale(-1 1)">${hills}</g></g>
    ${grassland(index + 50)}
    ${treeline(index + 70)}
    ${sides(index * 13 + 100)}
    ${trailSvg}
    ${lanesSvg}
    ${cockpit()}
  </svg>`;
}
