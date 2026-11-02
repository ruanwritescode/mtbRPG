// The map screen: the zone map with the rider on it, and the side panel for where they're standing.
import { gameData as data } from '../../data';
import * as G from '../../engine/game';
import type { GameState } from '../../engine/types';
import { signIcon } from '../art';
import { esc, money } from '../dom';
import { mapSvg } from '../mapSvg';
import type { UI } from '../state';
import { icon } from '../widgets';

export function mapView(g: GameState, ui: UI): string {
  const zone = G.zoneOf(g);
  const map = G.currentMap(g);
  const t = data.maps[zone];
  const loc = G.locationOf(g);
  const req = G.requiredPoints(g.level);
  const here = G.placeName(map, map.player);
  const region = G.placeRegion(map, map.player);
  const finalRace = data.raceList.find((r) => r.level === G.FINAL_LEVEL[zone]);
  let card: string;
  if (loc === 'shop') {
    card = `<div class="here-kicker">${icon('shop', 14)} Bike shop · fuel</div><h3>${esc(here ?? 'Bike shop')}</h3><p>Parts, tires, snacks and toolkits, plus a fuel pump out front.</p>
      <button class="btn primary" data-act="interact">Visit the shop <kbd>Enter</kbd></button>`;
  } else if (loc === 'race') {
    const ok = g.player.points >= req;
    card = `<div class="here-kicker">${signIcon(g.level + 1, 14)} Level ${g.level + 1} qualifier${region ? ` · ${esc(region)}` : ''}</div><h3>${esc(here ?? 'Race venue')}</h3>
      <p>${ok ? 'Win or podium here to move up a level.' : `You need <b>${req}</b> points to enter and have ${g.player.points}. Local races earn points.`}</p>
      <button class="btn primary" data-act="interact" ${ok ? '' : 'disabled'}>Enter the race <kbd>Enter</kbd></button>`;
  } else if (loc === 'final') {
    const open = map.races.length === 0;
    card = `<div class="here-kicker">${icon('flag', 14)} ${esc(finalRace?.name ?? 'Final')}${region ? ` · ${esc(region)}` : ''}</div><h3>${esc(here ?? 'Final')}</h3>
      <p>${open ? 'The final is open. Win or podium it to finish the region!' : `Win every other flag on the map first (${map.races.length} to go).`}</p>
      <button class="btn primary" data-act="interact" ${open ? '' : 'disabled'}>Enter the final <kbd>Enter</kbd></button>`;
  } else {
    card = g.level === 0
      ? `<div class="here-kicker">${icon('map', 14)} Open trail</div><h3>Find your first race</h3><p>Ride to a flag to enter a level 1 qualifier. Tap the map, or use the arrow keys.</p>`
      : `<div class="here-kicker">${icon('map', 14)} Open trail</div><h3>Between venues</h3><p>Enter a local race for points and prize money, or explore to find bike shops.</p>
        <button class="btn primary" data-act="local" ${G.raceBlocker(g.player) ? 'disabled' : ''}>Enter a local race <kbd>1</kbd></button>`;
  }
  const blocker = G.raceBlocker(g.player);
  const p = g.player;
  const station = G.atFuelStation(g);
  const need = G.fillUpGallons(g);
  const fuelBtn = station
    ? `<button class="btn plain" data-act="fuel" ${need ? '' : 'disabled'} title="Fuel station: ${money(G.fuelPrice(g))} a gallon"><kbd>5</kbd>${icon('fuel', 16)} Fill up <small>${need ? `${need} gal · ${money(need * G.fuelPrice(g))}` : 'full'}</small></button>`
    : `<button class="btn plain" data-act="fuel" ${need ? '' : 'disabled'} title="Delivered anywhere at ${G.DELIVERY_MARKUP}× the price"><kbd>5</kbd>${icon('fuel', 16)} Fuel delivery <small>${G.DELIVERY_GALLONS} gal · ${money(Math.min(G.DELIVERY_GALLONS, need) * G.fuelPrice(g, true))}</small></button>`;
  // Only the actions that make sense right now: fuel when there's a pump or the tank is low, a local
  // race when the card above doesn't already offer one.
  const showFuel = station ? need > 0 : g.fuel <= 10 && need > 0;
  const actions = `<div class="actions">
    ${g.level && loc !== 'open' ? `<button class="btn plain" data-act="local" ${blocker ? 'disabled' : ''} title="A race you can enter anywhere, for points and prize money"><kbd>1</kbd>${icon('flag', 16)} Local race</button>` : ''}
    ${showFuel ? fuelBtn : ''}
    <button class="btn plain" data-act="eat" ${p.snacks ? '' : 'disabled'} title="Restores all four stats"><kbd>2</kbd>${icon('snack', 16)} Eat a snack <small>${p.snacks ? `${p.snacks} left` : 'none · buy at a shop'}</small></button>
    <button class="btn plain" data-act="repair" ${p.toolkits ? '' : 'disabled'} title="Repairs every working part"><kbd>3</kbd>${icon('wrench', 16)} Use a toolkit <small>${p.toolkits ? `${p.toolkits} left` : 'none · buy at a shop'}</small></button>
  </div>`;
  const log = ui.log.map((m) => `<li class="${m.tone}">${esc(m.text)}</li>`).join('');
  return `<div class="map-stage">
    <div class="map-wrap">
      ${mapSvg(t, map, { nextLevel: g.level + 1, finalOpen: map.races.length === 0, path: ui.walkPath, from: ui.from ?? undefined, camera: ui.mobile && !ui.fullMap ? { w: 30, h: 30 } : undefined, kit: p.kit ?? 0, home: t.start })}
      <button class="btn plain small map-toggle" data-act="fullmap">${ui.fullMap ? 'Follow rider' : 'Full map'}</button>
      <div class="dpad" aria-label="Move">
        <button class="btn plain" data-act="dpad" data-dir="up" data-key="up" aria-label="Up">▲</button>
        <button class="btn plain" data-act="dpad" data-dir="left" data-key="left" aria-label="Left">◀</button>
        <button class="btn plain" data-act="dpad" data-dir="down" data-key="down" aria-label="Down">▼</button>
        <button class="btn plain" data-act="dpad" data-dir="right" data-key="right" aria-label="Right">▶</button>
      </div>
      <div class="legend"><span><i class="lg you"></i>You</span><span>${signIcon(g.level + 1, 12)}Qualifier</span><span><i class="lg shop"></i>Shop · fuel</span><span>${icon('flag', 12)} Final</span><span><i class="lg won"></i>Won</span><span><i class="lg trail"></i>Ridden</span></div>
    </div>
    <div class="panel">
      <div class="here card">${card}</div>
      ${blocker ? `<div class="notice bad">${esc(blocker)}</div>` : ''}
      ${g.fuel < 1 ? `<div class="notice bad">Out of fuel. ${g.level ? 'Race locally to earn cash, or ' : ''}call a fuel delivery to keep moving.</div>` : g.fuel <= 5 ? `<div class="notice warn">Low fuel: ${g.fuel} gal left. Towns with a shop and race venues sell fuel.</div>` : ''}
      ${actions}
      <ul class="log" aria-live="polite">${log}</ul>
      <p class="hint muted small">Arrows move · tap the map to ride there · <kbd>Esc</kbd> menu · <kbd>C</kbd> career · <button class="linkish" data-act="help">How to play</button></p>
    </div>
  </div>`;
}
