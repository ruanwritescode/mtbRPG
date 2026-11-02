// Screens outside the map: the title, saves, creating a rider, the intro, the trip to Europe and the ends.
import * as G from '../../engine/game';
import { KITS, RIVALS } from '../../engine/rivals';
import { ZONE_LABELS, type GameState } from '../../engine/types';
import { titleBackground } from '../art';
import { esc, money } from '../dom';
import { riderAvatar } from '../rider';
import * as Save from '../save';
import type { UI } from '../state';
import { icon } from '../widgets';
import { tierBadge } from './hud';

export function titleView(ui: UI): string {
  const auto = Save.loadAutosave();
  const saves = Save.listSaves();
  const canContinue = auto && auto.phase !== 'gameover' && auto.phase !== 'champion';
  const cont = canContinue
    ? `<button class="btn primary duo cont" data-act="continue">${riderAvatar(auto.player.kit ?? 0, 40)}<span class="cont-text">Continue<span class="sub">${esc(auto.player.name)} · ${G.tierName(auto.level)} · ${ZONE_LABELS[auto.phase === 'usa' ? 'usa' : 'europe']} · Rank #${G.rankOf(auto)}</span></span></button>`
    : '';
  return `<main class="title-screen">
    <div class="title-bg">${titleBackground()}</div>
    <button class="btn ghost small iconbtn sound-toggle" data-act="sound" aria-label="${ui.muted ? 'Unmute' : 'Mute'} sound">${icon(ui.muted ? 'mute' : 'sound', 20)}</button>
    <div class="title-content">
      <h1 class="logo">mtb<span>RPG</span></h1>
      <p class="tagline">Build a bike. Climb the ranks. Race the best in the world.</p>
      <div class="menu">
        ${cont}
        <button class="btn ${cont ? 'plain' : 'primary'} duo" data-act="new">${cont ? 'New season' : 'Start a new season'}</button>
        ${saves.length ? `<button class="btn plain duo" data-act="load">Load game<span class="sub">${saves.length} save${saves.length > 1 ? 's' : ''}</span></button>` : ''}
        <button class="btn ghost duo" data-act="help">How to play</button>
      </div>
    </div>
    <footer class="credits">Based on the C++ terminal game by Ruan Abarbanel (2022) · Part of <a href="https://shreddi.bike">shreddi</a></footer>
  </main>`;
}

export function loadView(): string {
  const rows = Save.listSaves().map((s) => `<li class="save-row">
      ${riderAvatar(s.player.kit ?? 0, 40)}
      <div><b>${esc(s.player.name)}</b><div class="muted small">${G.tierName(s.level)} · ${ZONE_LABELS[s.phase === 'usa' ? 'usa' : 'europe']} · Rank #${G.rankOf(s)} · ${money(s.money)}${s.savedAt ? ` · ${new Date(s.savedAt).toLocaleDateString()}` : ''}</div></div>
      <div class="row-actions"><button class="btn plain small" data-act="delete-slot" data-name="${esc(s.player.name)}">Delete</button>
      <button class="btn primary small" data-act="load-slot" data-name="${esc(s.player.name)}">Load</button></div></li>`).join('');
  return `<main class="center-screen"><div class="card narrow">
    <h2>Load game</h2>
    <ul class="saves">${rows || '<li class="muted">No saves yet.</li>'}</ul>
    <button class="btn ghost" data-act="title">← Back</button></div></main>`;
}

export function nameView(ui: UI): string {
  const swatches = KITS.map((k, i) => `<button type="button" class="swatch ${ui.nameKit === i ? 'active' : ''}" data-act="kit" data-i="${i}" data-key="kit-${i}" style="--kit:${k.hex}" aria-label="${k.name} kit" aria-pressed="${ui.nameKit === i}"></button>`).join('');
  return `<main class="center-screen"><form class="card narrow create" id="name-form">
    <div class="create-top">${riderAvatar(ui.nameKit, 120, { label: 'Your rider' })}<div><h2>Create your rider</h2><p class="muted">Pick a name and a kit. You start as a rookie, ranked last of ${RIVALS.length + 1}.</p></div></div>
    <label class="field-label" for="name">Rider name</label>
    <input id="name" name="name" maxlength="24" autocomplete="off" placeholder="e.g. Sam Rivers" required />
    <div class="field-label">Kit colour <span class="muted">· ${KITS[ui.nameKit].name}</span></div>
    <div class="swatches">${swatches}</div>
    <div class="row-actions"><button type="button" class="btn ghost" data-act="title">Back</button><button class="btn primary" type="submit">Let’s ride ${icon('chevron', 16)}</button></div>
  </form></main>`;
}

export function storyView(g: GameState): string {
  const p = g.player;
  return `<main class="center-screen"><div class="card story intro">
    ${riderAvatar(p.kit ?? 0, 110)}
    <h2>Welcome to the circuit, ${esc(p.name)}.</h2>
    <p>You’re ranked <b>#${G.rankOf(g)} of ${RIVALS.length + 1}</b>. The riders above you have factory bikes and World Cup wins. You have ${money(g.money)} from three small sponsors and a van with a full tank.</p>
    <ol class="goals">
      <li>${icon('shop', 20)}<span><b>Build a bike.</b> Four parts and a tire, from a shop that stocks real-world gear.</span></li>
      <li>${icon('flag', 20)}<span><b>Win qualifiers</b> at venues across the USA to climb from ${G.tierName(0)} to ${G.tierName(6)}.</span></li>
      <li>${icon('trophy', 20)}<span><b>Race the World Cup</b> in Europe and the World Championship at Val di Sole.</span></li>
    </ol>
    <button class="btn primary big" data-act="to-shop">Go to the bike shop ${icon('chevron', 16)}</button>
  </div></main>`;
}

export function europeView(g: GameState): string {
  return `<main class="center-screen"><div class="card story">
    <div class="fly">${riderAvatar(g.player.kit ?? 0, 96)}<span class="plane">${icon('plane', 40)}</span></div>
    <h2>USA champion!</h2>
    <p>You won ${esc(G.placeName(g.maps.usa, g.maps.usa.final) ?? 'the final')} and the whole country knows your name. ${tierBadge(g.level, 16)}</p>
    <p>Now the real test: the European World Cup circuit, where the top riders in the rankings live. Win there and the World Championship at Val di Sole is yours to take.</p>
    <button class="btn primary big" data-act="fly">Fly to Europe ${icon('plane', 18)}</button>
  </div></main>`;
}

export function endView(g: GameState, won: boolean): string {
  const stats = `<div class="end-stats">
    <div><b>${g.stats.entered}</b><span>races</span></div><div><b>${g.stats.wins}</b><span>wins</span></div>
    <div><b>${g.stats.podiums}</b><span>podiums</span></div><div><b>#${G.rankOf(g)}</b><span>final rank</span></div>
    <div><b>${money(g.stats.earned ?? 0)}</b><span>prize money</span></div><div><b>${g.player.points}</b><span>points</span></div></div>`;
  if (won) {
    return `<main class="center-screen"><div class="card story champion">
      ${riderAvatar(g.player.kit ?? 0, 130, { rainbow: true })}<h2>World Champion!</h2>
      <p>${esc(g.player.name)}, you won the Val di Sole World Championship. Time to pull on the rainbow stripes.</p>
      ${stats}<button class="btn primary big" data-act="new">Start a new season</button>
      <button class="btn ghost" data-act="career">Career summary</button>
      <button class="btn ghost" data-act="title">Title screen</button></div></main>`;
  }
  const why = g.gameOver === 'injury'
    ? `<h2>Season over — injured</h2><p>Three crashes from riding beyond your limits. ${esc(g.player.name)} is off the bike for the rest of the year.</p>`
    : `<h2>Season over — broke</h2><p>No money, no sponsors and no way to get the bike race-ready. ${esc(g.player.name)} is hanging up the helmet for now.</p>`;
  return `<main class="center-screen"><div class="card story gameover">
    <div class="faded">${riderAvatar(g.player.kit ?? 0, 110)}</div>${why}
    ${stats}<button class="btn primary big" data-act="new">Try again</button>
    <button class="btn ghost" data-act="career">Career summary</button>
    <button class="btn ghost" data-act="title">Title screen</button></div></main>`;
}
