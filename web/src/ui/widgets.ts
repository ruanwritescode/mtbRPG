// Small shared pieces of UI: icons, bars, rating dots, item art and the rider's kit swatches.
import { ATTR_LABELS, ATTR_NAMES, type Attrs } from '../engine/types';
import { itemIcon, type ItemKind } from './art';
import { esc } from './dom';
import { partImage } from './partImages';

/** Line icons (24-unit grid, stroked with currentColor). */
const ICONS: Record<string, string> = {
  fuel: '<path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M5 21h10M8 7h4M15 10h2l2 2v6a1.5 1.5 0 0 0 3 0v-7l-2-2"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 10h.01M18 14h.01"/>',
  rank: '<path d="M4 20h16M6 20v-7h4v7M14 20V4h4v16M10 20v-11h4v11"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
  flag: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  sound: '<path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  mute: '<path d="M4 9v6h4l5 4V5L8 9zM16 9l5 6M21 9l-5 6"/>',
  snack: '<path d="M4 9l2-2h12l2 2v6l-2 2H6l-2-2zM8 7v10M16 7v10"/>',
  wrench: '<path d="M14.5 6.5a4 4 0 0 1 4.9 4.9L9 21l-3-3L16.4 7.6zM15 4l5 5"/>',
  tire: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
  map: '<path d="M9 4l6 2 6-2v14l-6 2-6-2-6 2V6zM9 4v14M15 6v14"/>',
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  save: '<path d="M5 3h11l3 3v15H5zM8 3v5h7V3M8 14h8v7H8z"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
  pin: '<path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  shop: '<path d="M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9h16M9 20v-6h6v6"/>',
  warn: '<path d="M12 3l10 18H2zM12 10v5M12 18h.01"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  plane: '<path d="M10 21l2-5 7-7a2 2 0 0 0-3-3l-7 7-5 2 2 2 4-1 1 4z"/>',
  medal: '<circle cx="12" cy="15" r="5"/><path d="M8.5 10.5L6 3h4l2 5 2-5h4l-2.5 7.5"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
};

export function icon(name: string, size = 18, cls = ''): string {
  const body = ICONS[name] ?? ICONS.info;
  return `<svg class="ico ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

/** A progress bar; `tick` marks a threshold on the same scale as `max`. */
export function bar(value: number, max: number, cls = '', tick?: number): string {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const t = tick !== undefined ? `<i class="tick" style="left:${Math.min(100, (tick / max) * 100)}%"></i>` : '';
  return `<div class="bar ${cls}"><span style="width:${pct}%"></span>${t}</div>`;
}

/** Five dots for a 1–10 rating, half dots for odd values. */
export function dots(value: number, label?: string): string {
  const v = Math.max(0, Math.min(10, Math.round(value)));
  const pips = Array.from({ length: 5 }, (_, i) => `<i class="${v >= (i + 1) * 2 ? 'full' : v === i * 2 + 1 ? 'half' : ''}"></i>`).join('');
  return `<span class="dots" role="img" aria-label="${label ? label + ' ' : ''}${v / 2} out of 5">${pips}</span>`;
}

/** Four rating blocks (label over five dots). */
export function attrRows(a: Attrs, cls = ''): string {
  return `<div class="attrs ${cls}">${ATTR_NAMES.map((k) => `<span><em>${ATTR_LABELS[k]}</em>${dots(a[k], ATTR_LABELS[k])}</span>`).join('')}</div>`;
}

/** A product photo when one exists, otherwise the drawn icon. */
export function itemArt(kind: ItemKind, name: string, size: number): string {
  const url = partImage(name);
  return url ? `<img class="item-photo" src="${url}" width="${size}" height="${size}" alt="" loading="lazy" />` : itemIcon(kind, size);
}

export function mini(label: string, value: string, pct: number, cls: string, tick?: number, sub?: string): string {
  return `<div class="mini ${cls === 'none' ? 'missing' : ''}" ${sub ? `title="${esc(sub)}"` : ''}><div class="mt"><span>${label}</span><b>${value}</b></div>${bar(pct, 100, cls === 'none' ? '' : cls, tick)}</div>`;
}

export function pips(n: number, max: number, cls: string): string {
  return `<span class="pips ${cls}">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
}

/** Rank movement chip: "#27 → #22" with an arrow. */
export function rankDelta(before: number, after: number): string {
  if (before === after) return `<span class="stat-chip neutral">${icon('rank', 14)} Rank #${after}</span>`;
  const up = after < before;
  return `<span class="stat-chip ${up ? 'good' : 'bad'}">${icon('rank', 14)} #${before} → #${after} ${up ? '▲' : '▼'}${Math.abs(before - after)}</span>`;
}
