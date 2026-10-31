// Uses a Shopify store's search suggestions to find products and their images.
import { execFileSync } from 'node:child_process';
const [site, q] = process.argv.slice(2);
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
try {
  const url = `${site}/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=8&resources[options][unavailable_products]=last`;
  const j = JSON.parse(execFileSync('curl', ['-sSLg', '--max-time', '40', '-A', UA, url], { maxBuffer: 20e6, encoding: 'utf8' }));
  const ps = j.resources?.results?.products || [];
  for (const p of ps) console.log(`${p.title} | ${p.image || p.featured_image?.url || 'no image'} | ${site}${p.url}`);
  console.log(`-- ${ps.length} results for "${q}" on ${site}`);
} catch (e) { console.log('FAILED', site, q, String(e.message).split('\n')[0].slice(0, 100)); }
