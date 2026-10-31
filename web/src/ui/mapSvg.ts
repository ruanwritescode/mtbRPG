// Draws a zone map from the original ASCII map file. Each character is drawn 1 unit wide and 2 tall
// (terminal proportions), so a rider step (two columns or one row) is a square cell.
import { isLand, type Terrain } from '../engine/parse';
import { FINAL_LEVEL } from '../engine/game';
import type { MapState, Point } from '../engine/types';
import { difficulty } from './art';

const landCache = new Map<Terrain, string>();

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
  // Dots on every cell the rider can stand on.
  let dots = '';
  const parity = t.start.x % 2;
  for (let y = 0; y < t.height; y++) {
    for (let x = parity; x < t.width; x += 2) {
      if (isLand(t, x, y)) dots += `M${x + 0.5} ${y * 2 + 1}h0.01`;
    }
  }
  const svg = `
    <g filter="url(#coast)"><path d="${d}" fill="var(--coast)"/></g>
    <g filter="url(#smooth)"><path d="${d}" fill="var(--land)"/></g>
    <path d="${dots}" stroke="var(--grid)" stroke-width="0.32" stroke-linecap="round"/>`;
  landCache.set(t, svg);
  return svg;
}

function center(p: Point): [number, number] {
  return [p.x + 0.5, p.y * 2 + 1];
}

function flag(p: Point, color: string, label: string): string {
  const [x, y] = center(p);
  return `<g class="m-race" transform="translate(${x} ${y})"><title>${label}</title>
    <ellipse cx="0" cy="0.9" rx="1" ry="0.35" fill="rgba(0,0,0,.18)"/>
    <path d="M0 0.9V-2.2" stroke="#16181A" stroke-width="0.22" stroke-linecap="round"/>
    <path d="M0.1 -2.2L2 -1.55L0.1 -0.9Z" fill="${color}" stroke="#fff" stroke-width="0.12" stroke-linejoin="round"/>
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
  opts: { nextLevel: number; finalOpen: boolean; path?: Point[]; from?: Point; camera?: Camera },
): string {
  const vw = t.width;
  const vh = t.height * 2;
  const visited = map.visited
    .map((k) => k.split(',').map(Number))
    .map(([x, y]) => `M${x + 0.5} ${y * 2 + 1}h0.01`)
    .join('');
  const won = map.won.map((p) => {
    const [x, y] = center(p);
    return `<g transform="translate(${x} ${y})"><title>Race won</title><circle r="0.85" fill="var(--brand)" stroke="#fff" stroke-width="0.18"/><path d="M-0.38 0l0.28 0.3l0.5-0.6" fill="none" stroke="#fff" stroke-width="0.22" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  }).join('');
  const shops = map.shops.map((p) => {
    const [x, y] = center(p);
    return `<g class="m-shop" transform="translate(${x} ${y})"><title>Bike shop</title><circle r="0.95" fill="var(--accent)" stroke="#fff" stroke-width="0.18"/>
      <path d="M-0.42 0.42L0.2 -0.2" stroke="#fff" stroke-width="0.26" stroke-linecap="round"/><circle cx="0.28" cy="-0.28" r="0.3" fill="none" stroke="#fff" stroke-width="0.2"/></g>`;
  }).join('');
  const d = difficulty(opts.nextLevel);
  const races = map.races.map((p) => flag(p, d.color, `Level ${opts.nextLevel} race`)).join('');
  const fd = difficulty(FINAL_LEVEL[map.zone]);
  const [fx, fy] = center(map.final);
  const finalMark = `<g class="m-final ${opts.finalOpen ? 'open' : 'locked'}" transform="translate(${fx} ${fy})"><title>Final race${opts.finalOpen ? '' : ' (locked)'}</title>
    <ellipse cx="0" cy="0.9" rx="1.1" ry="0.38" fill="rgba(0,0,0,.18)"/>
    <path d="M0 0.9V-2.4" stroke="#16181A" stroke-width="0.24" stroke-linecap="round"/>
    <rect x="0.1" y="-2.4" width="2.2" height="1.4" fill="#fff" stroke="${opts.finalOpen ? fd.color : '#9AA0A6'}" stroke-width="0.14"/>
    <path d="M0.1 -2.4h0.55v0.47h-0.55zM1.2 -2.4h0.55v0.47h-0.55zM0.65 -1.93h0.55v0.46h-0.55zM1.75 -1.93h0.55v0.46h-0.55zM0.1 -1.47h0.55v0.47h-0.55zM1.2 -1.47h0.55v0.47h-0.55z" fill="${opts.finalOpen ? '#16181A' : '#9AA0A6'}"/>
  </g>`;
  const path = opts.path?.length
    ? `<path d="M${[map.player, ...opts.path].map((p) => center(p).join(' ')).join('L')}" fill="none" stroke="var(--accent)" stroke-width="0.3" stroke-dasharray="0.1 0.7" stroke-linecap="round"/>`
    : '';
  const [px, py] = center(map.player);
  const [ox, oy] = opts.from ? center(opts.from) : [px, py];
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
    ${path}${won}${shops}${races}${finalMark}
    <g class="m-player" transform="translate(${px} ${py})"><g class="slide" style="--fx:${ox - px}px;--fy:${oy - py}px">
      <circle class="pulse" r="1.1" fill="none" stroke="var(--ink)" stroke-width="0.15"/>
      <circle r="0.95" fill="var(--ink)" stroke="#fff" stroke-width="0.22"/>
      <circle cx="-0.38" cy="0.15" r="0.27" fill="none" stroke="#fff" stroke-width="0.12"/><circle cx="0.38" cy="0.15" r="0.27" fill="none" stroke="#fff" stroke-width="0.12"/>
      <path d="M-0.38 0.15L-0.1 -0.25L0.25 -0.25L0.38 0.15M-0.1 -0.25L0 0.15" fill="none" stroke="#fff" stroke-width="0.1" stroke-linejoin="round"/>
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
