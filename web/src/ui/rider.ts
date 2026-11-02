// Rider portraits: a modern full-face mountain bike helmet seen from three-quarters, the way it's
// photographed: long peak jutting forward, vented shell, wide goggle strap round the back, and an angular
// chin bar pushed out in front. Drawn in the rider's kit colour, for you and every rival.
import { KITS } from '../engine/rivals';

const INK = '#2B2E33';

export interface AvatarOpts {
  /** World-champion rainbow stripes across the helmet. */
  rainbow?: boolean;
  /** Extra class on the svg. */
  cls?: string;
  /** Accessible label, or omitted to hide from screen readers. */
  label?: string;
}

/** The helmet faces the viewer's left. `size` px square. */
export function riderAvatar(kit: number, size = 40, opts: AvatarOpts = {}): string {
  const k = KITS[Math.max(0, Math.min(KITS.length - 1, kit))] ?? KITS[0];
  const id = `av${kit}${opts.rainbow ? 'r' : ''}`;
  // Shell: brow at the front-left, crown, back of the head on the right, down to the cheek.
  const shell = 'M28 44 C26 28 38 12 58 12 C78 12 88 28 87 48 L86 64 C85 72 80 76 72 77 L46 77 C36 76 30 70 29 62Z';
  const stripes = opts.rainbow
    ? `<clipPath id="${id}-c"><path d="${shell}"/></clipPath>
       <g clip-path="url(#${id}-c)">${['#2F80ED', '#D2453B', '#16181A', '#F2B83C', '#2E9E4F'].map((c, i) => `<path d="M10 ${42 + i * 3} L95 ${28 + i * 3} L95 ${31 + i * 3} L10 ${45 + i * 3}Z" fill="${c}"/>`).join('')}</g>`
    : '';
  const aria = opts.label ? `role="img" aria-label="${opts.label}"` : 'aria-hidden="true"';
  return `<svg class="avatar-svg ${opts.cls ?? ''}" width="${size}" height="${size}" viewBox="0 0 100 100" ${aria}>
    <defs>
      <linearGradient id="${id}-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>
      <linearGradient id="${id}-l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD37A"/><stop offset=".45" stop-color="#F2791C"/><stop offset="1" stop-color="#7A2E12"/></linearGradient>
    </defs>
    <!-- neck and jersey -->
    <path d="M40 86 C44 80 56 78 66 80 C74 82 80 86 82 92 L84 100 L36 100Z" fill="${k.hex}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M52 82 L58 90 L66 84" fill="none" stroke="${k.dark}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- shell -->
    <path d="${shell}" fill="${k.hex}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    ${stripes}
    <path d="${shell}" fill="url(#${id}-g)"/>
    <!-- crown vents -->
    <path d="M40 27 C43 22 48 18 54 16.5 L55.5 20.5 C50.5 22 46 25 43.5 29.5Z M61 15.5 C67 15.5 73 18 77.5 22.5 L74.5 25.5 C70.5 21.5 66 19.5 61 19.5Z M33 38 C34.5 33 37 29 40 26.5 L43 29.5 C40.5 32 38.5 35.5 37 40Z" fill="${k.dark}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>
    <!-- goggle strap round the back -->
    <path d="M74 44 C82 44 88 48 88 52 L88 62 C88 64 82 64 74 60Z" fill="${INK}"/>
    <path d="M78 47 C84 48 86 51 86 53" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".3"/>
    <!-- peak -->
    <path d="M5 35 L48 21 C62 18 77 22 86 31 L83 39 C73 33 61 30 49 31 L19 44Z" fill="#FBFAF6" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M19 44 L49 31 C61 30 73 33 83 39 L81 42 C71 37 60 35 49 36 L23 46Z" fill="${k.dark}"/>
    <path d="M12 36 L46 25" fill="none" stroke="${k.hex}" stroke-width="2.4" stroke-linecap="round"/>
    <!-- goggles: wide on the near side, tapering round the far side -->
    <path d="M18 46 C28 40 46 37 60 38 C70 39 77 43 78 50 L77 57 C72 62 60 65 46 64 C32 63 22 60 19 55Z" fill="#FBFAF6" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M23 48 C32 43 46 40.5 59 41.5 C67 42 73 45 74 50 L73 56 C68 60 58 62 46 61 C35 60 26 58 23 54Z" fill="url(#${id}-l)" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M27 49 C34 45.5 42 44 48 44 L47 48 C41 48 35 49.5 30 52.5Z" fill="#fff" opacity=".6"/>
    <!-- chin bar: angular, out in front -->
    <path d="M29 58 L18 66 C14 70 14 76 18 80 C24 86 36 88 50 88 L56 88 C64 88 68 86 70 82 L72 77 L46 77 C36 76 30 70 29 62Z" fill="${k.hex}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M18 66 L36 70 L46 77 L72 77 L70 82 C68 86 64 88 56 88 L50 88 C36 88 24 86 18 80 C14 76 14 70 18 66Z" fill="${k.dark}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <!-- mouth vent -->
    <path d="M20 70 L40 75 L40 83 L22 79Z" fill="${INK}"/>
    <path d="M24 72 L24 79 M28 73 L28 80 M32 74 L32 81 M36 75 L36 82" stroke="#8C9094" stroke-width="1.3" stroke-linecap="round"/>
    <!-- cheek vent and highlight -->
    <path d="M52 80 L62 80 L61 84 L53 84Z" fill="${INK}" opacity=".55"/>
    <path d="M32 62 C33 66 35 69 38 72" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".3"/>
  </svg>`;
}

/** Flag emoji for an ISO 3166 country code. */
export function flagEmoji(country?: string): string {
  if (!country || country.length !== 2) return '';
  return String.fromCodePoint(...[...country.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
