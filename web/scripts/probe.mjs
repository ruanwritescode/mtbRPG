// Lists candidate product images on a page: JSON-LD Product images, og:image, and large <img> tags.
import { execFileSync } from 'node:child_process';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const url = process.argv[2].replace(/^http:/, 'https:');
let html = '';
try { html = execFileSync('curl', ['-sSL', '--max-time', '40', '-A', UA, url], { maxBuffer: 50e6, encoding: 'utf8' }); } catch (e) { console.log('FETCH FAILED', String(e.message).split('\n')[0]); process.exit(0); }
console.log('title:', (html.match(/<title[^>]*>([^<]*)/i) || [])[1]?.trim().slice(0, 100));
const out = new Set();
for (const m of html.matchAll(/<script[^>]+ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
  try {
    const j = JSON.parse(m[1]);
    const walk = (o) => { if (!o || typeof o !== 'object') return; if (o['@type'] === 'Product' || o.image) { const im = o.image; const arr = Array.isArray(im) ? im : [im]; for (const i of arr) { const u = typeof i === 'string' ? i : i?.url || i?.contentUrl; if (u) out.add('LD ' + u); } } for (const v of Object.values(o)) walk(v); };
    walk(j);
  } catch {}
}
for (const m of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/gi)) out.add('OG ' + m[1]);
for (const m of html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/gi)) out.add('OG ' + m[1]);
for (const m of html.matchAll(/<img[^>]+(?:src|data-src|srcset)=["']([^"' ]+)["'][^>]*>/gi)) { const u = m[1]; if (/\.(png|jpe?g|webp)/i.test(u) && !/logo|icon|flag|sprite|badge|payment|avatar/i.test(u)) out.add('IMG ' + u); }
const list = [...out].slice(0, 40);
for (const l of list) console.log(l.replace(/&amp;/g, '&'));
