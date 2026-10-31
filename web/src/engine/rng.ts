export interface Rng {
  /** Integer in [0, n). Mirrors `rand() % n` from the original. */
  int(n: number): number;
}

export const mathRng: Rng = {
  int: (n) => (n <= 0 ? 0 : Math.floor(Math.random() * n)),
};

/** Deterministic generator (mulberry32) for tests and simulations. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { int: (n) => (n <= 0 ? 0 : Math.floor(next() * n)) };
}
