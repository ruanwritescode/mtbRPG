// SVG artwork: difficulty badges, the rider, and a scene for every trail section and start gate.
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

// ---------------------------------------------------------------- rider

/** A rider on a bike, origin between the wheels at ground level. ~70 units long. */
export function rider(x: number, y: number, scale = 1, rotate = 0, jersey = '#1F6B4A', cls = 'rider'): string {
  return `<g class="${cls}" transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})">
    <g fill="none" stroke="#16181A" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="-23" cy="-13" r="13"/><circle cx="23" cy="-13" r="13"/>
      <path d="M-23 -13 L-7 -31 L13 -31 L23 -13 M-7 -31 L-1 -13 L-23 -13 M13 -31 L17 -42 L22 -43" />
      <path d="M-11 -35 L-3 -35" stroke-width="4"/>
    </g>
    <g stroke-linecap="round" stroke-linejoin="round" fill="none">
      <path d="M-6 -38 L-3 -24 L-1 -14" stroke="#2B2F33" stroke-width="5.5"/>
      <path d="M-6 -38 L9 -54" stroke="${jersey}" stroke-width="9"/>
      <path d="M8 -52 L18 -43" stroke="${jersey}" stroke-width="5"/>
    </g>
    <circle cx="14" cy="-62" r="7.5" fill="${jersey}" stroke="#16181A" stroke-width="2"/>
    <path d="M8 -63 L21 -60" stroke="#16181A" stroke-width="2.5" stroke-linecap="round"/>
  </g>`;
}

// ---------------------------------------------------------------- scene helpers

const W = 800;
const H = 360;

function frame(id: string, body: string, opts: { sky?: [string, string]; hills?: boolean; label: string; align?: string }): string {
  const [top, bottom] = opts.sky ?? ['#BFE0F2', '#EAF4F2'];
  const hills = opts.hills === false ? '' : `
    <path d="M0 170 L90 110 L160 150 L250 80 L340 140 L430 95 L520 150 L610 90 L700 135 L800 100 L800 230 L0 230Z" fill="#B9CFC4"/>
    <path d="M250 80 L272 96 L262 98 L250 90 L238 99 L230 96Z M610 90 L630 104 L620 106 L610 99 L600 106 L592 103Z" fill="#fff" opacity=".8"/>
    <path d="M0 200 L120 150 L230 190 L360 140 L480 185 L600 150 L720 190 L800 165 L800 260 L0 260Z" fill="#8FB59F"/>`;
  return `<svg class="scene-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label)}" preserveAspectRatio="${opts.align ?? 'xMidYMid'} slice">
    <defs>
      <linearGradient id="sky-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
      <linearGradient id="dirt-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C9A27A"/><stop offset="1" stop-color="#A97C53"/></linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#sky-${id})"/>
    ${hills}
    ${body}
  </svg>`;
}

function tree(x: number, y: number, s = 1): string {
  return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-3" y="-6" width="6" height="12" fill="#6B4F36"/><path d="M0 -60 L18 -20 L9 -20 L22 0 L-22 0 L-9 -20 L-18 -20Z" fill="#2F6E4D"/></g>`;
}

function trees(list: [number, number, number][]): string {
  return list.map(([x, y, s]) => tree(x, y, s)).join('');
}

/** Numbered marker matching a choice button. */
function pin(n: number, x: number, y: number): string {
  return `<g class="pin" transform="translate(${x} ${y})"><circle r="15" fill="#16181A" stroke="#fff" stroke-width="3"/><text y="5.5" text-anchor="middle" font-size="16" font-weight="900" fill="#fff">${n}</text></g>`;
}

function dashed(d: string, color = '#fff'): string {
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="4" stroke-dasharray="2 10" stroke-linecap="round" opacity=".95"/>`;
}

function grass(): string {
  return `<rect y="230" width="${W}" height="${H - 230}" fill="#7FAE73"/>`;
}

function rock(x: number, y: number, s = 1): string {
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-14 4 L-10 -8 L2 -13 L13 -6 L15 4Z" fill="#8C8F93"/><path d="M-10 -8 L2 -13 L13 -6 L0 -4Z" fill="#B3B6B9"/></g>`;
}

// ---------------------------------------------------------------- sections

function lineChoice(): string {
  const rocks = [
    [250, 330, 1.6], [300, 300, 1.3], [230, 280, 1.1], [300, 262, 0.9], [270, 245, 0.7], [312, 236, 0.6],
  ].map(([x, y, s]) => rock(x, y, s)).join('');
  const roots = [0, 1, 2, 3, 4].map((i) => {
    const y = 330 - i * 22;
    const w = 70 - i * 10;
    return `<path d="M${400 - w} ${y} q ${w / 2} -12 ${w} 0 t ${w} 0" fill="none" stroke="#6B4F36" stroke-width="${6 - i}" stroke-linecap="round"/>`;
  }).join('');
  return frame('line', `
    ${grass()}
    ${trees([[90, 250, 1.4], [150, 238, 1], [690, 250, 1.5], [620, 236, 1], [730, 232, 0.8]])}
    <path d="M160 360 L370 225 L430 225 L640 360Z" fill="url(#dirt-line)"/>
    <path d="M330 360 L390 225 M470 360 L410 225" stroke="#B08860" stroke-width="3" opacity=".6"/>
    ${rocks}${roots}
    <path d="M560 360 Q520 300 440 228" fill="none" stroke="#7A5638" stroke-width="16" stroke-linecap="round" opacity=".85"/>
    <path d="M560 360 Q520 300 440 228" fill="none" stroke="#5E4128" stroke-width="5" stroke-linecap="round"/>
    ${pin(1, 262, 205)}${pin(2, 400, 205)}${pin(3, 520, 205)}
  `, { label: 'Line choice: rock garden, roots or a rut' });
}

function corner(dir: 'left' | 'right'): string {
  const flip = dir === 'right' ? `transform="translate(${W} 0) scale(-1 1)"` : '';
  const inner = dir === 'left' ? [300, 215] : [W - 300, 215];
  const outer = dir === 'left' ? [430, 175] : [W - 430, 175];
  return frame(dir, `
    ${grass()}
    <g ${flip}>
      ${trees([[110, 238, 1.2], [60, 250, 1.5], [720, 250, 1.4], [660, 238, 1]])}
      <path d="M520 360 C 520 260, 420 220, 180 214 L180 246 C 360 250, 420 290, 380 360Z" fill="url(#dirt-${dir})"/>
      <path d="M520 360 C 520 260, 420 220, 180 214 L180 200 C 440 200, 560 250, 560 360Z" fill="#9A7049"/>
      ${dashed('M400 350 C 420 290, 360 250, 200 236')}
      ${dashed('M480 350 C 500 270, 420 222, 200 220', '#FFE3A8')}
      ${rider(470, 330, 0.9, -8, '#F2791C')}
    </g>
    ${pin(1, inner[0], inner[1])}${pin(2, outer[0], outer[1])}
  `, { label: `${dir === 'left' ? 'Left' : 'Right'} hand corner` });
}

function rollers(): string {
  const ground = 'M0 300 L120 300 Q160 250 200 300 Q240 250 280 300 Q320 250 360 300 Q400 250 440 300 L800 300 L800 360 L0 360Z';
  return frame('roll', `
    ${grass()}
    ${trees([[600, 240, 1.3], [680, 250, 1.6], [740, 236, 1]])}
    <path d="${ground}" fill="url(#dirt-roll)"/>
    ${dashed('M120 296 Q280 150 440 296')}
    ${dashed('M120 296 Q200 215 280 296 Q360 215 440 296', '#FFE3A8')}
    ${dashed('M120 304 Q160 262 200 304 Q240 262 280 304 Q320 262 360 304 Q400 262 440 304', '#16181A')}
    ${rider(80, 300, 0.85, 0)}
    ${pin(1, 280, 190)}${pin(2, 200, 236)}${pin(3, 470, 280)}
  `, { label: 'Roller section' });
}

function whoops(): string {
  let d = 'M0 300 L80 300';
  for (let x = 80; x < 720; x += 40) d += ` Q${x + 20} 274 ${x + 40} 300`;
  d += ' L800 300 L800 360 L0 360Z';
  return frame('whoop', `
    ${grass()}
    <path d="${d}" fill="url(#dirt-whoop)"/>
    ${trees([[60, 240, 1.2], [760, 245, 1.4]])}
    <g class="bounce">${rider(380, 290, 0.95, -6, '#D2453B')}</g>
    <g stroke="#16181A" stroke-width="3" stroke-linecap="round" opacity=".5"><path d="M300 238 l-30 0 M296 252 l-40 0 M300 266 l-26 0"/></g>
  `, { label: 'Moto whoop section' });
}

function switchbacks(): string {
  return frame('switch', `
    <path d="M0 120 L800 60 L800 360 L0 360Z" fill="#86B27C"/>
    ${trees([[90, 150, 0.9], [700, 110, 0.9], [740, 300, 1.2], [60, 320, 1.3], [520, 200, 0.7]])}
    <path d="M650 80 L180 130 Q130 140 170 160 L620 200 Q680 210 630 230 L170 280 Q120 290 160 310 L520 345" fill="none" stroke="#B48A62" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M650 80 L180 130 Q130 140 170 160 L620 200 Q680 210 630 230 L170 280 Q120 290 160 310 L520 345" fill="none" stroke="#C9A27A" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
    ${dashed('M300 118 L300 300')}
    ${dashed('M190 132 Q150 146 182 160', '#FFE3A8')}
    ${dashed('M612 196 Q690 212 640 232', '#16181A')}
    ${rider(560, 96, 0.55, 4)}
    ${pin(1, 300, 210)}${pin(2, 130, 120)}${pin(3, 690, 190)}
  `, { label: 'Switchbacks on a steep hillside' });
}

function gapJump(): string {
  return frame('gap', `
    ${grass()}
    ${trees([[40, 236, 1.2], [770, 238, 1.3]])}
    <path d="M0 290 L170 290 Q250 288 300 225 L300 360 L0 360Z" fill="url(#dirt-gap)"/>
    <path d="M300 225 L300 360 L520 360 L520 240 Z" fill="#3E4A3F" opacity=".55"/>
    <path d="M520 240 Q580 250 650 300 L800 300 L800 360 L520 360Z" fill="url(#dirt-gap)"/>
    <path d="M170 292 Q260 300 330 330 Q420 350 520 342 Q600 336 650 310" fill="none" stroke="#C9A27A" stroke-width="14" stroke-linecap="round"/>
    ${dashed('M300 222 Q410 70 540 236')}
    ${dashed('M180 300 Q300 320 360 336 Q450 352 600 326', '#FFE3A8')}
    ${rider(240, 280, 0.9, -22)}
    ${pin(1, 420, 130)}${pin(2, 450, 318)}
  `, { label: 'Gap jump with a chicken line' });
}

function motorway(): string {
  return frame('motor', `
    ${grass()}
    ${trees([[80, 250, 1.6], [170, 236, 1], [640, 236, 1], [720, 252, 1.6], [250, 230, 0.7], [560, 230, 0.7]])}
    <path d="M120 360 L380 222 L420 222 L680 360Z" fill="url(#dirt-motor)"/>
    <g stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7">
      <path d="M250 330 l-60 22 M560 330 l60 22 M300 290 l-40 15 M500 290 l40 15 M330 262 l-26 10 M470 262 l26 10"/>
    </g>
    <g class="bounce">${rider(400, 340, 1.05, 0, '#F2791C')}</g>
  `, { label: 'Motorway straight' });
}

// ---------------------------------------------------------------- start gates

function startGate(level: number): string {
  const tents = level >= 1
    ? [130, 590].map((x) => `<g transform="translate(${x} 250)"><path d="M0 0 L40 -40 L80 0Z" fill="#F2791C"/><path d="M40 -40 L80 0 L60 0Z" fill="#C85F12"/></g>`).join('')
    : '';
  const crowd = level >= 3
    ? Array.from({ length: 60 }, (_, i) => {
        const x = 20 + (i % 30) * 26 + (i > 29 ? 13 : 0);
        const y = i > 29 ? 262 : 252;
        const col = ['#D2453B', '#1F6FD1', '#F2791C', '#2E9E4F', '#16181A'][i % 5];
        return `<circle cx="${x}" cy="${y}" r="6" fill="${col}"/>`;
      }).join('')
    : '';
  const banner = ['START', 'START', 'MOUNTAIN', 'WORLD CUP'][Math.min(level, 3)];
  const big = level >= 2;
  return frame(`start${level}`, `
    ${big ? '<path d="M120 230 L400 40 L680 230Z" fill="#7E9A8B"/><path d="M400 40 L450 74 L425 78 L400 62 L378 80 L352 74Z" fill="#fff"/>' : ''}
    ${grass()}
    ${crowd}${tents}
    ${trees(level >= 3 ? [] : [[60, 245, 1.3], [740, 245, 1.3]])}
    <path d="M250 360 L370 250 L430 250 L550 360Z" fill="url(#dirt-start${level})"/>
    <g>
      <rect x="300" y="150" width="10" height="110" fill="#16181A"/><rect x="490" y="150" width="10" height="110" fill="#16181A"/>
      <rect x="290" y="130" width="220" height="44" rx="6" fill="${level >= 3 ? '#16181A' : '#1F6B4A'}"/>
      <text x="400" y="160" text-anchor="middle" font-size="24" font-weight="900" letter-spacing="3" fill="#fff">${banner}</text>
    </g>
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
  return frame('title', `
    <path d="M0 260 L140 170 L230 220 L380 110 L520 210 L640 150 L800 230 L800 360 L0 360Z" fill="#2F6E4D"/>
    <path d="M380 110 L420 140 L398 144 L380 130 L362 146 L344 140Z" fill="#fff"/>
    <path d="M0 300 C 200 250, 300 330, 480 290 S 700 260, 800 300 L800 360 L0 360Z" fill="#C9A27A"/>
    ${trees([[90, 270, 1.2], [700, 280, 1.3], [620, 270, 0.9]])}
    ${rider(420, 296, 1.2, -10, '#F2791C')}
  `, { label: 'A rider on a mountain trail', hills: true, align: 'xMidYMax' });
}
