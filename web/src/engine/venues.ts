// Places on the map: race venues (real riding destinations, west to east) and the towns bike shops turn
// up in. Names are assigned when a map is created or a shop is found, and kept in the save.
import type { Rng } from './rng';
import type { Zone } from './types';

export interface Venue {
  name: string;
  region: string;
}

/** Qualifier venues, ordered west to east so they land sensibly on the map. */
export const VENUES: Record<Zone, Venue[]> = {
  usa: [
    { name: 'Northstar', region: 'Lake Tahoe, CA' },
    { name: 'Big Bear', region: 'California' },
    { name: 'Solitude', region: 'Utah' },
    { name: 'Angel Fire', region: 'New Mexico' },
    { name: 'Winter Park', region: 'Colorado' },
    { name: 'Crested Butte', region: 'Colorado' },
    { name: 'Windrock', region: 'Tennessee' },
    { name: 'Rock Creek', region: 'North Carolina' },
    { name: 'Mountain Creek', region: 'New Jersey' },
    { name: 'Windham', region: 'New York' },
    { name: 'Killington', region: 'Vermont' },
  ],
  europe: [
    { name: 'Fort William', region: 'Scotland' },
    { name: 'Lousa', region: 'Portugal' },
    { name: 'Andorra', region: 'Pal Arinsal' },
    { name: 'Lenzerheide', region: 'Switzerland' },
    { name: 'Leogang', region: 'Austria' },
    { name: 'Maribor', region: 'Slovenia' },
  ],
};

export const FINAL_VENUE: Record<Zone, Venue> = {
  usa: { name: 'Snowshoe', region: 'West Virginia' },
  europe: { name: 'Val di Sole', region: 'Italy' },
};

/** Towns a bike shop can be in. */
export const TOWNS: Record<Zone, string[]> = {
  usa: ['Bentonville', 'Moab', 'Sedona', 'Bend', 'Brevard', 'Durango', 'Fruita', 'Park City', 'Hood River', 'Asheville', 'Harrisonburg', 'Marquette', 'Bellingham', 'Santa Cruz', 'Downieville', 'Whitefish', 'Jackson', 'Stowe', 'Roanoke', 'Copper Harbor'],
  europe: ['Morzine', 'Finale Ligure', 'Innsbruck', 'Chamonix', 'Livigno', 'Davos', 'Verbier', 'Saalbach', 'Schladming', 'Winterberg', 'Peebles', 'Sölden', 'Bad Wildbad', 'Aosta', 'Girona', 'Sintra', 'Kranjska Gora', 'La Thuile'],
};

const SHOP_SUFFIX = ['Bike Co.', 'Cycles', 'Cyclery', 'Bike Works', 'Trail Shop', 'Gravity Lab'];

/** Picks `n` venues spread west to east for race points sorted by x. */
export function assignVenues(zone: Zone, xs: number[], rng: Rng): Venue[] {
  const list = VENUES[zone];
  const order = xs.map((x, i) => ({ x, i })).sort((a, b) => a.x - b.x);
  const out: Venue[] = new Array(xs.length);
  // Evenly spaced indices with a little jitter, kept unique and in order.
  const used = new Set<number>();
  order.forEach(({ i }, rank) => {
    let idx = Math.round((rank / Math.max(1, xs.length - 1)) * (list.length - 1) + (rng.int(3) - 1) * 0.6);
    idx = Math.max(0, Math.min(list.length - 1, idx));
    while (used.has(idx) && idx < list.length - 1) idx++;
    while (used.has(idx) && idx > 0) idx--;
    used.add(idx);
    out[i] = list[idx];
  });
  return out;
}

/** A shuffled list of towns for a zone, used in order as shops are found. */
export function townOrder(zone: Zone, rng: Rng): string[] {
  const arr = [...TOWNS[zone]];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function shopName(town: string, index: number): string {
  return `${town} ${SHOP_SUFFIX[index % SHOP_SUFFIX.length]}`;
}
