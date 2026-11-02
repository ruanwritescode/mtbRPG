// The rider strip under the top bar: who you are, where you stand, and the numbers that decide races.
import * as G from '../../engine/game';
import { RIVALS } from '../../engine/rivals';
import { PART_LABELS, PART_SLOTS, STAT_LABELS, STAT_NAMES, type GameState, type PartSlot } from '../../engine/types';
import { signIcon } from '../art';
import { esc, money } from '../dom';
import { riderAvatar } from '../rider';
import type { UI } from '../state';
import { attrRows, bar, itemArt, mini, pips } from '../widgets';

/** "● Amateur · Lv 2", or "Rookie" before the first win. */
export function tierBadge(level: number, size = 14): string {
  if (level <= 0) return `<span class="badge rookie">${G.tierName(0)}</span>`;
  return `<span class="badge">${signIcon(level, size)}${G.tierName(level)}<small>Lv ${level}</small></span>`;
}

/** What to do next, in a few words. */
export function nextGoal(g: GameState): string {
  const p = g.player;
  const req = G.requiredPoints(g.level);
  const map = G.currentMap(g);
  if (g.phase === 'champion') return 'World Champion';
  if (g.phase === 'gameover') return 'Season over';
  if (!map.races.length) return `Final unlocked at ${G.placeName(map, map.final) ?? 'the final'}`;
  if (p.points >= req) return `Qualified for the level ${g.level + 1} flags`;
  return `${req - p.points} more points for the level ${g.level + 1} flags`;
}

export function hudView(g: GameState, ui: UI, paceLevel: number): string {
  const p = g.player;
  const pace = G.turningPoint(paceLevel);
  const stats = STAT_NAMES.map((s) => {
    const v = p[s];
    const cls = s === 'mental' ? (v < 40 ? 'bad' : v < 70 ? 'warn' : 'good') : v < pace ? 'bad' : v < pace + 10 ? 'warn' : 'good';
    return mini(STAT_LABELS[s], String(v), (v / 102) * 100, cls, s === 'mental' ? undefined : (pace / 102) * 100);
  }).join('');
  const parts = PART_SLOTS.map((slot: PartSlot) => {
    const part = p.parts[slot];
    if (!part) return mini(PART_LABELS[slot], 'none', 0, 'none');
    const cls = part.quality < 30 ? 'bad' : part.quality < 60 ? 'warn' : 'good';
    return mini(PART_LABELS[slot], `${part.quality}<small>/${part.max}</small>`, part.quality, cls, undefined, part.name);
  }).join('');
  const rank = G.rankOf(g);
  const tire = p.tires.length
    ? mini('Tire', `${p.tires[0]}<small>/${G.TIRE_LIFE}</small>`, (p.tires[0] / G.TIRE_LIFE) * 100, p.tires[0] < 6 ? 'bad' : p.tires[0] < 12 ? 'warn' : 'good')
    : mini('Tire', 'none', 0, 'none');
  return `<section class="hud" aria-label="Rider">
      <div class="hud-bar">
        <div class="hud-id">${riderAvatar(p.kit ?? 0, 46, { rainbow: g.phase === 'champion' })}
          <div><div class="rider-name">${esc(p.name)}</div><div class="rider-sub">${tierBadge(g.level)}<span class="rank-chip">#${rank}</span><span class="muted goal">${esc(nextGoal(g))}</span></div></div></div>
        <div class="hud-kpi rank" title="World ranking: your points against every rider on the circuit"><span>Rank</span><b>#${rank}</b><small>of ${RIVALS.length + 1}</small></div>
        <div class="hud-kpi fuel"><span>Fuel</span>${bar(g.fuel, G.FUEL_TANK, g.fuel <= 5 ? 'bad' : g.fuel <= 12 ? 'warn' : 'good')}<small>${g.fuel}/${G.FUEL_TANK} gal · ${money(G.fuelPrice(g))}/gal</small></div>
        <div class="hud-kpi"><span>Sponsors</span>${pips(g.sponsors, G.START_SPONSORS, 'sponsor')}<small>${g.sponsors} left</small></div>
        <div class="hud-kpi"><span>Injuries</span>${pips(p.injuries, G.MAX_INJURIES, 'injury')}<small>${G.MAX_INJURIES - p.injuries} to go</small></div>
        <div class="hud-ride" title="How your bike rides: the average of its four parts">${attrRows(G.bikeAttrs(p), 'compact')}</div>
        <div class="hud-supply" title="Spare tires, snacks and toolkits">
          <span>${itemArt('tires', 'Tire', 26)}<b>${Math.max(0, p.tires.length - 1)}</b></span>
          <span>${itemArt('snacks', 'Snack', 26)}<b>${p.snacks}</b></span>
          <span>${itemArt('toolkits', 'Toolkit', 26)}<b>${p.toolkits}</b></span>
        </div>
      </div>
      <details class="hud-meters" data-sec="meters" ${ui.metersOpen ? 'open' : ''}>
        <summary>Rider &amp; bike <small class="muted">pace ${pace} · bike health ${G.bikeHealth(p)}</small></summary>
        <div class="mgroups">
          <div class="mgroup"><h5 title="Stats above the race pace gain time; below it they lose time">Rider <i class="tick-key"></i> pace ${pace}</h5><div class="minis">${stats}</div></div>
          <div class="mgroup"><h5 title="Average part health above 30 gains time; a part at 0 breaks">Bike · hp ${G.bikeHealth(p)}</h5><div class="minis">${parts}${tire}</div></div>
        </div>
      </details>
    </section>`;
}
