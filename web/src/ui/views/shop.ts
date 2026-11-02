// The bike shop: a modal over the map with departments, product cards and a cart.
import { gameData as data } from '../../data';
import * as G from '../../engine/game';
import { PART_LABELS, PART_SLOTS, type GameState, type PartSlot } from '../../engine/types';
import { itemIcon, type ItemKind } from '../art';
import { esc, money } from '../dom';
import type { UI } from '../state';
import { attrRows, icon, itemArt } from '../widgets';

const sum = (a?: { speed: number; durability: number; playfulness: number; lightness: number }) => (a ? a.speed + a.durability + a.playfulness + a.lightness : 24);

export function shopModal(g: GameState, ui: UI): string {
  const p = g.player;
  const lvl = g.level;
  const cart = ui.cart;
  const total = G.summarizeCart(g, data, cart);
  const map = G.currentMap(g);
  const shopName = G.locationOf(g) === 'shop' ? G.placeName(map, map.player) : undefined;
  const cats: { key: ItemKind | 'supplies'; label: string; icon: ItemKind; note: string; need: boolean }[] = [
    ...PART_SLOTS.map((slot) => {
      const owned = p.parts[slot];
      const need = !owned || owned.quality <= 0;
      return { key: slot as ItemKind | 'supplies', label: PART_LABELS[slot], icon: slot as ItemKind, note: need ? 'needed' : cart.parts[slot] !== undefined ? 'in cart' : owned!.name, need };
    }),
    { key: 'supplies', label: 'Supplies', icon: 'tires', note: !p.tires.length ? 'tires needed' : cart.tires + cart.snacks + cart.toolkits ? `${cart.tires + cart.snacks + cart.toolkits} in cart` : '', need: !p.tires.length },
  ];
  const nav = cats.map((c) => `<button class="cat ${ui.shopCat === c.key ? 'active' : ''}" data-act="cat" data-cat="${c.key}" aria-pressed="${ui.shopCat === c.key}">${itemIcon(c.icon, 30)}<span class="cat-l">${c.label}<small class="${c.need ? 'need' : ''}">${esc(c.note)}</small></span></button>`).join('');

  let items: string;
  if (ui.shopCat === 'supplies') {
    items = (['tires', 'snacks', 'toolkits'] as G.Consumable[]).map((what) => {
      const have = what === 'tires' ? p.tires.length : p[what];
      const max = what === 'tires' ? G.MAX_TIRES : what === 'snacks' ? G.MAX_SNACKS : G.MAX_TOOLS;
      const label = { tires: 'Tire', snacks: 'Trail snack', toolkits: 'Toolkit' }[what];
      const note = { tires: `${G.TIRE_LIFE} sections of tread. Mounted one at a time.`, snacks: 'Restores all four stats a little.', toolkits: 'Repairs every working part a little.' }[what];
      const left = G.maxAdd(p, what);
      return `<div class="pcard ${cart[what] ? 'selected' : ''}">
        <div class="pimg">${itemArt(what, label, 120)}</div>
        <div class="name">${label}</div>
        <div class="price">${money(G.priceAt(G.UNIT_PRICES[what], lvl))} <small>each</small></div>
        <div class="sub">${note} You have ${have}/${max}.</div>
        ${what === 'tires' && data.attrs['Tire'] ? attrRows(data.attrs['Tire'], 'stack') : ''}
        <div class="stepper"><button class="btn plain small" data-act="qty" data-what="${what}" data-d="-1" data-key="${what}-" ${cart[what] ? '' : 'disabled'} aria-label="Fewer">−</button><output>${cart[what]}</output><button class="btn plain small" data-act="qty" data-what="${what}" data-d="1" data-key="${what}+" ${cart[what] < left ? '' : 'disabled'} aria-label="More">+</button></div>
      </div>`;
    }).join('');
    items = `<div class="pgrid">${items}</div>`;
  } else {
    const slot = ui.shopCat as PartSlot;
    const owned = p.parts[slot];
    const ownedScore = owned ? sum(owned.attrs) : 0;
    items = data.shop.parts[slot].map((it, i) => {
      const isOwned = owned?.name === it.name;
      const inCart = cart.parts[slot] === i;
      const upgrade = owned && !isOwned && sum(it.attrs) > ownedScore;
      return `<div class="pcard ${inCart ? 'selected' : ''} ${isOwned ? 'owned' : ''}">
        <div class="pimg">${itemArt(slot as ItemKind, it.name, 120)}${upgrade ? '<span class="tag up">Upgrade</span>' : isOwned ? '<span class="tag own">On your bike</span>' : ''}</div>
        <div class="name">${esc(it.name)}</div>
        <div class="price">${money(G.priceAt(it.price, lvl))}</div>
        ${it.attrs ? attrRows(it.attrs, 'stack') : ''}
        <button class="btn ${inCart ? 'primary' : 'plain'} small" data-act="part" data-slot="${slot}" data-i="${i}" data-key="${slot}-${i}" ${isOwned ? 'disabled' : ''} aria-pressed="${inCart}">${isOwned ? 'Owned' : inCart ? '✓ In cart' : 'Add to cart'}</button>
      </div>`;
    }).join('');
    items = `<div class="pgrid">${items}</div>`;
    if (owned && cart.parts[slot] !== undefined) {
      const tradeIn = Math.trunc(owned.price * G.shopMultiplier(lvl) * owned.quality / 100);
      items += `<p class="muted small">Your ${esc(owned.name)} sells on the used market for ${money(tradeIn)}, taken off the total.</p>`;
    }
  }

  const lines: string[] = [];
  for (const slot of PART_SLOTS) {
    const i = cart.parts[slot];
    if (i === undefined) continue;
    const it = data.shop.parts[slot][i];
    lines.push(`<li class="cline">${itemArt(slot as ItemKind, it.name, 34)}<span><b>${esc(it.name)}</b><small>${PART_LABELS[slot]}${p.parts[slot] ? ' · replaces ' + esc(p.parts[slot]!.name) : ''}</small></span><span class="cp">${money(G.priceAt(it.price, lvl))}<button class="linkish" data-act="uncart" data-k="${slot}" aria-label="Remove ${PART_LABELS[slot]}">Remove</button></span></li>`);
  }
  for (const what of ['tires', 'snacks', 'toolkits'] as G.Consumable[]) {
    if (!cart[what]) continue;
    const label = { tires: 'Tire', snacks: 'Trail snack', toolkits: 'Toolkit' }[what];
    lines.push(`<li class="cline">${itemArt(what, { tires: 'Tire', snacks: 'Snack', toolkits: 'Toolkit' }[what], 34)}<span><b>${cart[what]} × ${label}</b><small>${money(G.priceAt(G.UNIT_PRICES[what], lvl))} each</small></span><span class="cp">${money(cart[what] * G.priceAt(G.UNIT_PRICES[what], lvl))}<button class="linkish" data-act="uncart" data-k="${what}" aria-label="Remove ${what}">Remove</button></span></li>`);
  }
  const shortfall = G.sponsorShortfall(g, data);
  const sponsor = shortfall > 0 && g.sponsors > 0 && total.empty
    ? `<div class="notice warn"><span><b>Short on cash?</b> You need ${money(shortfall)} more to get race-ready. A sponsor can cover it, then they drop you.</span><button class="btn plain small" data-act="sponsor">Call a sponsor (${g.sponsors} left)</button></div>`
    : '';
  const after = g.money - total.total;
  return `<div class="modal-backdrop"><div class="modal shop-modal" role="dialog" aria-modal="true" aria-labelledby="shop-title">
    <header class="shop-top">${icon('shop', 22)}<div><h2 id="shop-title">${esc(shopName ?? 'Bike shop')}</h2><span class="muted small">${lvl ? 'Real-world prices. Better parts ride better.' : 'Welcome! Build a bike and stock up.'}</span></div><span class="spacer"></span><span class="chip">${icon('cash', 14)} ${money(g.money)}</span><button class="btn ghost small iconbtn" data-act="leave" aria-label="Close shop">${icon('close', 18)}</button></header>
    ${sponsor}
    <div class="shop-grid">
      <nav class="shop-cats" aria-label="Departments">${nav}</nav>
      <section class="shop-items">${items}</section>
      <aside class="shop-cart"><h3>Cart</h3>
        <ul class="clines">${lines.join('') || '<li class="muted small">Your cart is empty. Add parts or supplies.</li>'}</ul>
        <dl class="totals"><dt>Items</dt><dd>${money(total.subtotal)}</dd>
        ${total.tradeIn ? `<dt>Old parts sold</dt><dd class="good">−${money(total.tradeIn)}</dd>` : ''}
        <dt class="total">Total</dt><dd class="total">${money(total.total)}</dd>
        <dt>Left after</dt><dd class="${after < 0 ? 'neg' : ''}">${money(after)}</dd></dl>
        ${!total.canAfford ? '<p class="warn small">Not enough money for this cart.</p>' : ''}
        <button class="btn primary block" data-act="checkout" ${total.empty || !total.canAfford ? 'disabled' : ''}>${total.empty ? 'Checkout' : `Checkout · ${money(total.total)}`}</button>
        <button class="btn ghost block small" data-act="leave">${total.empty ? 'Leave shop' : 'Leave without buying'}</button>
      </aside>
    </div>
  </div></div>`;
}
