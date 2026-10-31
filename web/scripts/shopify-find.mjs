// Searches a Shopify store's public catalogue for products whose title matches a pattern and prints their first image.
import { execFileSync } from 'node:child_process';
const [site, pattern] = process.argv.slice(2);
const re = new RegExp(pattern, 'i');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
let found = 0;
for (let page = 1; page <= 8; page++) {
  let json;
  try { json = JSON.parse(execFileSync('curl', ['-sSL', '--max-time', '40', '-A', UA, `${site}/products.json?limit=250&page=${page}`], { maxBuffer: 80e6, encoding: 'utf8' })); } catch (e) { console.log('FAILED', site, String(e.message).split('\n')[0].slice(0, 120)); break; }
  const products = json.products || [];
  for (const p of products) {
    if (re.test(p.title)) { found++; console.log(`${p.title} | ${p.product_type || ''} | ${p.images?.[0]?.src || 'no image'}`); }
  }
  if (products.length < 250) break;
}
console.log(`-- ${found} matches on ${site}`);
