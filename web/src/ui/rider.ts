// Rider portraits: a flat silhouette of a modern full-face helmet in three-quarter profile (long peak,
// goggles, angular chin bar) on a round badge, in the rider's kit colour. Used for you and every rival.
import { KITS } from '../engine/rivals';

export interface AvatarOpts {
  /** World-champion rainbow stripes across the helmet. */
  rainbow?: boolean;
  /** Extra class on the svg. */
  cls?: string;
  /** Accessible label, or omitted to hide from screen readers. */
  label?: string;
}

/** Helmet outline, facing the viewer's left: peak tip, over the dome, down the back, round the chin bar. */
const HELMET = 'M0 31 L34 14 L54 6 L76 9 L91 24 L96 44 L92 62 L84 78 L68 90 L42 92 L16 82 L10 68 L20 60 L24 50 L29 42 L9 41Z';
const SHOULDER = 'M20 106 L34 90 L64 86 L92 92 L102 106Z';
const LENS = 'M25 47 L50 41 L72 44 L76 51 L72 57 L44 60 L27 57Z';
const VENT = 'M16 70 L32 74 L32 82 L18 79Z';

/** A rider's silhouette, `size` px square. */
export function riderAvatar(kit: number, size = 40, opts: AvatarOpts = {}): string {
  const k = KITS[Math.max(0, Math.min(KITS.length - 1, kit))] ?? KITS[0];
  const id = `av${kit}${opts.rainbow ? 'r' : ''}`;
  const stripes = opts.rainbow
    ? `<clipPath id="${id}-c"><path d="${HELMET}"/></clipPath>
       <g clip-path="url(#${id}-c)">${['#2F80ED', '#D2453B', '#FBFAF6', '#F2B83C', '#2E9E4F'].map((c, i) => `<path d="M0 ${44 + i * 4.5} L100 ${22 + i * 4.5} L100 ${26.5 + i * 4.5} L0 ${48.5 + i * 4.5}Z" fill="${c}"/>`).join('')}</g>`
    : '';
  const aria = opts.label ? `role="img" aria-label="${opts.label}"` : 'aria-hidden="true"';
  return `<svg class="avatar-svg ${opts.cls ?? ''}" width="${size}" height="${size}" viewBox="0 0 100 100" ${aria}>
    <defs><clipPath id="${id}-b"><circle cx="50" cy="50" r="50"/></clipPath></defs>
    <circle cx="50" cy="50" r="50" fill="${k.hex}" opacity=".16"/>
    <g clip-path="url(#${id}-b)" transform="translate(50 56) scale(0.78) translate(-50 -50)">
      <path d="${SHOULDER}" fill="${k.dark}"/>
      <path d="${HELMET}" fill="${k.hex}"/>
      ${stripes}
      <path d="M34 14 L54 6 L58 20 L40 26Z M76 9 L91 24 L80 28 L70 16Z" fill="#fff" opacity=".18"/>
      <path d="${LENS}" fill="#fff" opacity=".9"/>
      <path d="${VENT}" fill="#fff" opacity=".35"/>
    </g>
  </svg>`;
}

/** Flag emoji for an ISO 3166 country code. */
export function flagEmoji(country?: string): string {
  if (!country || country.length !== 2) return '';
  return String.fromCodePoint(...[...country.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
