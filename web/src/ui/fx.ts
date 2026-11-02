// Visual effects that live outside the render cycle: confetti bursts and number tweens.

const reduced = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** A burst of confetti over the whole screen. Cleans itself up. */
export function confetti(opts: { count?: number; colors?: string[]; duration?: number } = {}) {
  if (reduced()) return;
  const count = opts.count ?? 90;
  const colors = opts.colors ?? ['#1F6B4A', '#F2791C', '#2F80ED', '#F2B83C', '#D2453B', '#8B6FD6', '#FBFAF6'];
  const duration = opts.duration ?? 2600;
  const layer = document.createElement('div');
  layer.className = 'confetti';
  layer.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i');
    const x = Math.random() * 100;
    const delay = Math.random() * 0.5;
    const dur = 1.8 + Math.random() * 1.4;
    const size = 6 + Math.random() * 7;
    p.style.cssText = `left:${x}vw;background:${colors[i % colors.length]};width:${size}px;height:${size * (0.5 + Math.random())}px;animation-duration:${dur}s;animation-delay:${delay}s;--spin:${Math.random() > 0.5 ? 1 : -1};--drift:${(Math.random() - 0.5) * 30}vw;border-radius:${Math.random() > 0.5 ? '50%' : '2px'}`;
    layer.appendChild(p);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), duration + 1200);
}

/** Tween the text of an element from one number to another. `fmt` turns a value into text. */
export function countUp(el: Element | null, from: number, to: number, fmt: (v: number) => string, ms = 700) {
  if (!el) return;
  if (reduced() || from === to) {
    el.textContent = fmt(to);
    return;
  }
  const start = performance.now();
  const ease = (t: number) => 1 - Math.pow(1 - t, 3);
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    el.textContent = fmt(from + (to - from) * ease(t));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Shake an element briefly (adds and removes a class). */
export function shake(el: Element | null, cls = 'shake') {
  if (!el || reduced()) return;
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
}
