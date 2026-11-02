// Draws a zone map from the original ASCII map file. Each character is drawn 1 unit wide and 2 tall
// (terminal proportions), so a rider step (two columns or one row) is a square cell.
import { isLand, type Terrain } from '../engine/parse';
import { FINAL_LEVEL, key } from '../engine/game';
import { KITS } from '../engine/rivals';
import type { MapState, Point } from '../engine/types';
import { difficulty } from './art';
import { esc } from './dom';

const landCache = new Map<Terrain, string>();

/** Deterministic 0–1 hash of a cell, for scattering scenery the same way every render. */
function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function landLayer(t: Terrain): string {
  const cached = landCache.get(t);
  if (cached) return cached;
  let d = '';
  for (let y = 0; y < t.height; y++) {
    const row = t.rows[y];
    let x = 0;
    while (x < t.width) {
      if (row[x] === '#') {
        x++;
        continue;
      }
      const start = x;
      while (x < t.width && row[x] !== '#') x++;
      d += `M${start} ${y * 2}h${x - start}v2h${start - x}z`;
    }
  }
  // Dots on every cell the rider can stand on, plus scattered hills and trees on the ones in between.
  let dots = '';
  let hills = '';
  let trees = '';
  const parity = t.start.x % 2;
  const inland = (x: number, y: number) => [[-2, 0], [2, 0], [0, -1], [0, 1], [-2, -1], [2, 1], [-2, 1], [2, -1]].every(([dx, dy]) => isLand(t, x + dx, y + dy));
  for (let y = 0; y < t.height; y++) {
    for (let x = parity; x < t.width; x += 2) {
      if (!isLand(t, x, y)) continue;
      dots += `M${x + 0.5} ${y * 2 + 1}h0.01`;
      const h = hash(x, y);
      if (!inland(x, y)) continue;
      const cx = x + 1.5;
      const cy = y * 2 + 2;
      if (h < 0.05) hills += `M${cx - 1.4} ${cy + 0.5}L${cx - 0.4} ${cy - 1.1}L${cx} ${cy - 0.5}L${cx + 0.5} ${cy - 1.4}L${cx + 1.5} ${cy + 0.5}`;
      else if (h < 0.1) trees += `M${cx - 0.45} ${cy + 0.4}L${cx} ${cy - 0.7}L${cx + 0.45} ${cy + 0.4}Z`;
    }
  }
  const svg = `
    <g filter="url(#coast)"><path d="${d}" fill="var(--coast)"/></g>
    <g filter="url(#smooth)"><path d="${d}" fill="var(--land)"/></g>
    <path d="${dots}" stroke="var(--grid)" stroke-width="0.32" stroke-linecap="round"/>
    <path d="${hills}" fill="none" stroke="var(--relief)" stroke-width="0.28" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="${trees}" fill="var(--forest)"/>`;
  landCache.set(t, svg);
  return svg;
}

function center(p: Point): [number, number] {
  return [p.x + 0.5, p.y * 2 + 1];
}

function label(x: number, y: number, text: string, cls = ''): string {
  if (!text) return '';
  return `<text class="m-label ${cls}" x="${x}" y="${y}" text-anchor="middle" font-size="1.15" font-weight="800" paint-order="stroke" stroke="#fff" stroke-width="0.4" stroke-linejoin="round" fill="var(--ink)">${esc(text)}</text>`;
}

function flag(p: Point, color: string, title: string, name?: string): string {
  const [x, y] = center(p);
  return `<g class="m-race" transform="translate(${x} ${y})"><title>${esc(title)}</title>
    <ellipse cx="0" cy="0.9" rx="1" ry="0.35" fill="rgba(0,0,0,.18)"/>
    <path d="M0 0.9V-2.2" stroke="#16181A" stroke-width="0.22" stroke-linecap="round"/>
    <path d="M0.1 -2.2L2 -1.55L0.1 -0.9Z" fill="${color}" stroke="#fff" stroke-width="0.12" stroke-linejoin="round"/>
    ${label(0, 2.4, name ?? '')}
  </g>`;
}

/** A zoomed window that follows the rider: width and height in map units, centred on the rider. */
export interface Camera {
  w: number;
  h: number;
}

export function mapSvg(
  t: Terrain,
  map: MapState,
  opts: { nextLevel: number; finalOpen: boolean; path?: Point[]; from?: Point; camera?: Camera; kit?: number; home?: Point },
): string {
  const vw = t.width;
  const vh = t.height * 2;
  const names = map.names ?? {};
  const visited = map.visited
    .map((k) => k.split(',').map(Number))
    .map(([x, y]) => `M${x + 0.5} ${y * 2 + 1}h0.01`)
    .join('');
  const won = map.won.map((p) => {
    const [x, y] = center(p);
    return `<g transform="translate(${x} ${y})"><title>Race won${names[key(p)] ? ` at ${esc(names[key(p)])}` : ''}</title><circle r="0.85" fill="var(--brand)" stroke="#fff" stroke-width="0.18"/><path d="M-0.38 0l0.28 0.3l0.5-0.6" fill="none" stroke="#fff" stroke-width="0.22" stroke-linecap="round" stroke-linejoin="round"/>${label(0, 2.3, names[key(p)] ?? '', 'won')}</g>`;
  }).join('');
  const shops = map.shops.map((p) => {
    const [x, y] = center(p);
    return `<g class="m-shop" transform="translate(${x} ${y})"><title>${esc(names[key(p)] ?? 'Bike shop')}</title><circle r="0.95" fill="var(--accent)" stroke="#fff" stroke-width="0.18"/>
      <path d="M-0.42 0.42L0.2 -0.2" stroke="#fff" stroke-width="0.26" stroke-linecap="round"/><circle cx="0.28" cy="-0.28" r="0.3" fill="none" stroke="#fff" stroke-width="0.2"/>${label(0, -1.5, (names[key(p)] ?? '').split(' ')[0], 'town')}</g>`;
  }).join('');
  const d = difficulty(opts.nextLevel);
  const races = map.races.map((p) => flag(p, d.color, `${names[key(p)] ?? 'Race'} · level ${opts.nextLevel} qualifier`, names[key(p)])).join('');
  const fd = difficulty(FINAL_LEVEL[map.zone]);
  const [fx, fy] = center(map.final);
  const finalMark = `<g class="m-final ${opts.finalOpen ? 'open' : 'locked'}" transform="translate(${fx} ${fy})"><title>${esc(names[key(map.final)] ?? 'Final')} · final${opts.finalOpen ? '' : ' (locked)'}</title>
    <ellipse cx="0" cy="0.9" rx="1.1" ry="0.38" fill="rgba(0,0,0,.18)"/>
    <path d="M0 0.9V-2.4" stroke="#16181A" stroke-width="0.24" stroke-linecap="round"/>
    <rect x="0.1" y="-2.4" width="2.2" height="1.4" fill="#fff" stroke="${opts.finalOpen ? fd.color : '#9AA0A6'}" stroke-width="0.14"/>
    <path d="M0.1 -2.4h0.55v0.47h-0.55zM1.2 -2.4h0.55v0.47h-0.55zM0.65 -1.93h0.55v0.46h-0.55zM1.75 -1.93h0.55v0.46h-0.55zM0.1 -1.47h0.55v0.47h-0.55zM1.2 -1.47h0.55v0.47h-0.55z" fill="${opts.finalOpen ? '#16181A' : '#9AA0A6'}"/>
    ${label(0, 2.4, names[key(map.final)] ?? '', opts.finalOpen ? '' : 'locked')}
  </g>`;
  const home = opts.home && !(opts.home.x === map.player.x && opts.home.y === map.player.y) && !map.shops.some((s) => s.x === opts.home!.x && s.y === opts.home!.y)
    ? (() => {
        const [hx, hy] = center(opts.home!);
        return `<g class="m-home" transform="translate(${hx} ${hy})"><title>Home</title><path d="M-0.9 0.1L0 -0.8L0.9 0.1V0.9H-0.9Z" fill="#fff" stroke="var(--ink)" stroke-width="0.16" stroke-linejoin="round"/><rect x="-0.22" y="0.3" width="0.44" height="0.6" fill="var(--ink)"/></g>`;
      })()
    : '';
  const path = opts.path?.length
    ? `<path d="M${[map.player, ...opts.path].map((p) => center(p).join(' ')).join('L')}" fill="none" stroke="var(--accent)" stroke-width="0.3" stroke-dasharray="0.1 0.7" stroke-linecap="round"/>`
    : '';
  const [px, py] = center(map.player);
  const [ox, oy] = opts.from ? center(opts.from) : [px, py];
  const kit = KITS[opts.kit ?? 0] ?? KITS[0];
  // With a camera the view is a window centred on the rider (clamped to the map), panning smoothly from
  // where it was last step; without one the whole map shows.
  const cam = opts.camera;
  const origin = (c: [number, number]) => {
    if (!cam) return [-1, -1];
    const clamp = (v: number, size: number, total: number) => (size >= total + 2 ? (total - size) / 2 : Math.max(-1, Math.min(total + 1 - size, v - size / 2)));
    return [clamp(c[0], cam.w, vw), clamp(c[1], cam.h, vh)];
  };
  const [x0, y0] = origin(center(map.player));
  const [fx0, fy0] = opts.from ? origin(center(opts.from)) : [x0, y0];
  const viewBox = cam ? `0 0 ${cam.w} ${cam.h}` : `-1 -1 ${vw + 2} ${vh + 2}`;
  const camOpen = cam ? `<g class="cam" style="transform:translate(${-x0}px,${-y0}px);--cfx:${-fx0}px;--cfy:${-fy0}px">` : '<g>';
  return `<svg class="map-svg ${cam ? 'zoomed' : ''}" viewBox="${viewBox}" data-x0="${cam ? x0 : 0}" data-y0="${cam ? y0 : 0}" data-w="${vw}" data-h="${vh}" role="img" aria-label="Map">
    <defs>
      <filter id="smooth" x="-2%" y="-2%" width="104%" height="104%"><feGaussianBlur stdDeviation="0.55"/><feComponentTransfer><feFuncA type="discrete" tableValues="0 1"/></feComponentTransfer></filter>
      <filter id="coast" x="-3%" y="-3%" width="106%" height="106%"><feGaussianBlur stdDeviation="0.75"/><feComponentTransfer><feFuncA type="discrete" tableValues="0 0 1 1 1 1 1 1"/></feComponentTransfer></filter>
    </defs>
    ${cam ? `<rect width="${cam.w}" height="${cam.h}" fill="var(--water)"/>` : ''}
    ${camOpen}
    <rect x="-1" y="-1" width="${vw + 2}" height="${vh + 2}" fill="var(--water)" rx="1"/>
    ${landLayer(t)}
    <path d="${visited}" stroke="var(--trail)" stroke-width="0.6" stroke-linecap="round"/>
    ${path}${home}${won}${shops}${races}${finalMark}
    <g class="m-player" transform="translate(${px} ${py})"><g class="slide" style="--fx:${ox - px}px;--fy:${oy - py}px">
      <circle class="pulse" r="1.1" fill="none" stroke="${kit.hex}" stroke-width="0.15"/>
      <circle r="1.05" fill="${kit.hex}" stroke="#fff" stroke-width="0.22"/>
      <path d="M-0.72 -0.1 C-0.5 -0.45 0.5 -0.45 0.72 -0.1 L0.66 0.22 C0.4 0.42 -0.4 0.42 -0.66 0.22Z" fill="#1F3A5A" stroke="#fff" stroke-width="0.12" stroke-linejoin="round"/>
      <path d="M-0.5 -0.1 C-0.3 -0.25 0 -0.25 0.1 -0.2" fill="none" stroke="#fff" stroke-width="0.1" stroke-linecap="round" opacity=".8"/>
      <path d="M-0.5 0.55 L0.5 0.55" stroke="${kit.dark}" stroke-width="0.22" stroke-linecap="round"/>
    </g></g>
    </g>
  </svg>`;
}

/** Map a click on the SVG to the nearest standable cell coordinates. */
export function cellFromEvent(svg: SVGSVGElement, ev: MouseEvent, parity: number): Point | null {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const raw = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(ctm.inverse());
  const pt = { x: raw.x + Number(svg.dataset.x0 ?? 0), y: raw.y + Number(svg.dataset.y0 ?? 0) };
  const y = Math.floor(pt.y / 2);
  const x = parity + 2 * Math.round((pt.x - 0.5 - parity) / 2);
  return { x, y };
}
