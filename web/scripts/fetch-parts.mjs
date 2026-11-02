// Downloads product photos for shop items into src/assets/parts/, named by item slug.
// Usage: node scripts/fetch-parts.mjs            (all items in part-sources.json)
//        node scripts/fetch-parts.mjs "Trek Session"   (just one)
// A source may be an image URL or a product page; for a page, the og:image / twitter:image is used.
// Uses curl so the session's HTTPS proxy settings apply.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const outDir = join(root, 'src/assets/parts');
mkdirSync(outDir, { recursive: true });
const sources = JSON.parse(readFileSync(join(root, 'scripts/part-sources.json'), 'utf8'));
const only = process.argv.slice(2);

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
function curl(url, binary = false) {
  const args = ['-sSL', '--max-time', '40', '-A', UA, url.replace(/^http:/, 'https:')];
  return execFileSync('curl', args, { maxBuffer: 50e6, encoding: binary ? 'buffer' : 'utf8' });
}
function slug(name) {
  return name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function imageFromPage(html, base) {
  const m =
    html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
    html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  if (!m) return null;
  return new URL(m[1].replace(/&amp;/g, '&'), base).href;
}
function extOf(url, buf) {
  const head = buf.subarray(0, 12).toString('binary');
  if (head.startsWith('\x89PNG')) return 'png';
  if (head.startsWith('\xff\xd8')) return 'jpg';
  if (head.includes('WEBP')) return 'webp';
  if (head.includes('ftypavif')) return 'avif';
  const m = url.match(/\.(png|jpe?g|webp|avif)(\?|$)/i);
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'png';
}

let ok = 0;
for (const [name, source] of Object.entries(sources)) {
  if (name.startsWith('_') || (only.length && !only.includes(name))) continue;
  const s = slug(name);
  if (!only.length && ['png', 'jpg', 'webp', 'avif'].some((e) => existsSync(join(outDir, `${s}.${e}`)))) {
    console.log(`= ${name}: already have it`);
    ok++;
    continue;
  }
  try {
    let imageUrl = source;
    if (!/\.(png|jpe?g|webp|avif)(\?|$)/i.test(source)) {
      const html = curl(source);
      imageUrl = imageFromPage(html, source);
      if (!imageUrl) throw new Error('no og:image on the page');
    }
    const buf = curl(imageUrl, true);
    if (buf.length < 2000) throw new Error(`tiny response (${buf.length} bytes) from ${imageUrl}`);
    const file = join(outDir, `${s}.${extOf(imageUrl, buf)}`);
    writeFileSync(file, buf);
    console.log(`+ ${name}: ${(buf.length / 1024).toFixed(0)} KB from ${imageUrl}`);
    ok++;
  } catch (e) {
    console.log(`! ${name}: ${String(e.message || e).split('\n')[0]}`);
  }
}
console.log(`\n${ok} of ${Object.keys(sources).filter((k) => !k.startsWith('_')).length} items have a photo in src/assets/parts/`);
