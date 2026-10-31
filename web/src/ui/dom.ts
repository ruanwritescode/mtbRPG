const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape text for use inside HTML or an attribute. */
export function esc(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (c) => ENTITIES[c]);
}

export function money(n: number): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(Math.trunc(n)).toLocaleString('en-US')}`;
}

/** Split gap in ms as "+1.234s" / "-0.500s". */
export function seconds(ms: number): string {
  const sign = ms > 0 ? '+' : ms < 0 ? '−' : '±';
  return `${sign}${(Math.abs(ms) / 1000).toFixed(3)}s`;
}

export function ordinal(n: number): string {
  return ['', '1st', '2nd', '3rd'][n] ?? `${n}th`;
}
