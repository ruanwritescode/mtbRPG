// The header: who you are and what's next on the left; fuel, money and rank on the right. Under it, a
// collapsible strip with the numbers that decide races: rider stats, bike health and supplies.
import * as G from '../../engine/game';
import { RIVALS } from '../../engine/rivals';
import { PART_LABELS, PART_SLOTS, STAT_LABELS, STAT_NAMES, ZONE_LABELS, type GameState, type PartSlot } from '../../engine/types';
import { signIcon } from '../art';
import { esc, money } from '../dom';
import { riderAvatar } from '../rider';
import type { UI } from '../state';
import { bar, icon, itemArt, mini, pips } from '../widgets';

/** "● Amateur · Lv 2", or "Rookie" before the first win. */
export function tierBadge(level: number, size = 14): string {
  if (level <= 0) return `<span class="badge rookie">${G.tierName(0)}</span>`;
  return `<span class="badge">${signIcon(level, size)}${G.tierName(level)}<small>Lv ${level}</small></span>`;
}

/** What to do next, in a few words, plus progress towards it (0–1) when it's about points. */
export function nextGoal(g: GameState): { text: string; progress?: number } {
  const p = g.player;
  const req = G.requiredPoints(g.level);
  const map = G.currentMap(g);
  if (g.phase === 'champion') return { text: 'World Champion' };
  if (g.phase === 'gameover') return { text: 'Season over' };
  if (!map.races.length) return { text: `Final open at ${G.placeName(map, map.final) ?? 'the checkered flag'}` };
  if (p.points >= req) return { text: `Qualified · ride to a level ${g.level + 1} flag` };
  return { text: `${p.points} / ${req} points for the level ${g.level + 1} flags`, progress: p.points / req };
}

export function headerView(g: GameState, ui: UI): string {
  const p = g.player;
  const zone = G.zoneOf(g);
  const goal = nextGoal(g);
  const rank = G.rankOf(g);
  return `<header class="topbar">
    <button class="logo small" data-act="menu" aria-label="Menu">mtb<span>RPG</span></button>
    <div class="who">
      ${riderAvatar(p.kit ?? 0, 42, { rainbow: g.phase === 'champion' })}
      <div class="who-text">
        <div class="rider-name">${esc(p.name)} <span class="zone-tag">${zone === 'usa' ? '🇺🇸' : '🇪🇺'} ${ZONE_LABELS[zone]}</span></div>
        <div class="rider-sub">${tierBadge(g.level)}<span class="goal">${esc(goal.text)}</span></div>
        ${goal.progress !== undefined ? `<div class="goal-bar"><span style="width:${Math.min(100, goal.progress * 100)}%"></span></div>` : ''}
      </div>
    </div>
    <span class="spacer"></span>
    <div class="kpi fuel ${g.fuel <= 5 ? 'low' : ''}" title="Fuel in the van: a gallon per step. Fill up at towns and venues (${money(G.fuelPrice(g))}/gal)">${icon('fuel', 16)}<div>${bar(g.fuel, G.FUEL_TANK, g.fuel <= 5 ? 'bad' : g.fuel <= 12 ? 'warn' : 'good')}<small>${g.fuel}/${G.FUEL_TANK} gal</small></div></div>
    <span class="chip top ${g.money < 0 ? 'neg' : ''}" title="Money">${icon('cash', 15)} ${money(g.money)}</span>
    <button class="chip top btnchip" data-act="career" title="World rank · ${p.points.toLocaleString('en-US')} points. Open the career sheet">${icon('rank', 15)} #${rank}<small>/${RIVALS.length + 1}</small></button>
    <button class="btn ghost small iconbtn" data-act="sound" aria-label="${ui.muted ? 'Unmute' : 'Mute'} sound">${icon(ui.muted ? 'mute' : 'sound', 18)}</button>
    <button class="btn ghost small menubtn" data-act="menu" aria-label="Open menu">${icon('menu', 18)}<span>Menu</span></button>
  </header>`;
}

export function metersView(g: GameState, ui: UI, paceLevel: number): string {
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
  const tire = p.tires.length
    ? mini('Tire', `${p.tires[0]}<small>/${G.TIRE_LIFE}</small>`, (p.tires[0] / G.TIRE_LIFE) * 100, p.tires[0] < 6 ? 'bad' : p.tires[0] < 12 ? 'warn' : 'good')
    : mini('Tire', 'none', 0, 'none');
  const low = Math.min(p.strength, p.skill, p.endurance) < pace;
  const hp = G.bikeHealth(p);
  const summary = `${low ? '<span class="bad">a stat is under pace</span>' : 'stats above pace'} · bike ${hp < 30 ? '<span class="bad">' + hp + '</span>' : hp}`;
  return `<details class="hud-meters" data-sec="meters" ${ui.metersOpen ? 'open' : ''}>
    <summary>Rider &amp; bike <small class="muted">${summary}</small></summary>
    <div class="mgroups">
      <div class="mgroup"><h5 title="Stats above the race pace gain time; below it they lose time. Using a stat tires it; snacks restore it">Rider <i class="tick-key"></i> pace ${pace}</h5><div class="minis">${stats}</div></div>
      <div class="mgroup"><h5 title="Average part health above 30 gains time; a part at 0 breaks. Toolkits repair">Bike · ${hp}</h5><div class="minis">${parts}${tire}</div></div>
      <div class="mgroup supplies"><h5 title="Spare tires, snacks and toolkits">Supplies</h5>
        <div class="hud-supply"><span title="Spare tires">${itemArt('tires', 'Tire', 24)}<b>${Math.max(0, p.tires.length - 1)}</b></span><span title="Snacks">${itemArt('snacks', 'Snack', 24)}<b>${p.snacks}</b></span><span title="Toolkits">${itemArt('toolkits', 'Toolkit', 24)}<b>${p.toolkits}</b></span></div>
        <div class="lives"><span title="Sponsors left to bail you out">${pips(g.sponsors, G.START_SPONSORS, 'sponsor')}<small>sponsors</small></span><span title="Injuries: three end the season">${pips(p.injuries, G.MAX_INJURIES, 'injury')}<small>injuries</small></span></div>
      </div>
    </div>
  </details>`;
}
