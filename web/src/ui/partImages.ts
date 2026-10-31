// Real product photos for shop items. Drop a file into src/assets/parts/ named after the item's slug
// (see `slug`) and it is used automatically in the shop and on the title screen; anything without a
// photo falls back to the drawn icon. Prefer PNGs with a transparent background.
const files = import.meta.glob('../assets/parts/*.{png,webp,jpg,jpeg,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** "Commencal Supreme V5" → "commencal-supreme-v5". Supplies use "tire", "snack" and "toolkit". */
export function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const bySlug = new Map<string, string>();
for (const [path, url] of Object.entries(files)) {
  const base = path.split('/').pop()!.replace(/\.[^.]+$/, '');
  bySlug.set(base, url);
}

export function partImage(name: string): string | undefined {
  return bySlug.get(slug(name));
}

/** Every photo that exists, for sprinkling on the title screen. */
export function allPartImages(): { slug: string; url: string }[] {
  return [...bySlug.entries()].map(([s, url]) => ({ slug: s, url }));
}
