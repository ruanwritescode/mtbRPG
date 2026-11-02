// The career sheet: season stats, the world rankings and the trophy shelf.
import * as G from '../../engine/game';
import { rivalById } from '../../engine/rivals';
import type { GameState } from '../../engine/types';
import { levelBadge } from '../art';
import { esc, money } from '../dom';
import { flagEmoji, riderAvatar } from '../rider';
import { icon } from '../widgets';
import { tierBadge } from './hud';

export function careerBody(g: GameState): string {
  const p = g.player;
  const table = G.standingsTable(g);
  const me = table.findIndex((r) => r.id === null);
  const keep = new Set<number>();
  for (let i = 0; i < 8; i++) keep.add(i);
  for (let i = me - 3; i <= me + 3; i++) if (i >= 0 && i < table.length) keep.add(i);
  const rows: string[] = [];
  let last = -1;
  for (const i of [...keep].sort((a, b) => a - b)) {
    if (i > last + 1) rows.push('<tr class="gap-row"><td colspan="3">···</td></tr>');
    const r = table[i];
    const rival = r.id ? rivalById(r.id) : undefined;
    rows.push(`<tr class="${r.id === null ? 'you' : ''}"><td class="pos">${r.rank}</td><td class="who">${riderAvatar(r.kit, 24)}<span>${esc(r.id === null ? `${r.name} (you)` : r.name)}</span><small>${flagEmoji(rival?.country)}</small></td><td class="num">${r.points.toLocaleString('en-US')}</td></tr>`);
    last = i;
  }
  if (last < table.length - 1) rows.push('<tr class="gap-row"><td colspan="3">···</td></tr>');
  const trophies = (g.trophies ?? []).slice().reverse();
  return `<div class="career">
    <div class="career-id">${riderAvatar(p.kit ?? 0, 64, { rainbow: g.phase === 'champion' })}<div><div class="rider-name big">${esc(p.name)}</div><div>${tierBadge(g.level, 15)}</div></div>
      <div class="career-rank"><span>World rank</span><b>#${G.rankOf(g)}</b><small>best #${g.stats.bestRank ?? G.rankOf(g)}</small></div></div>
    <div class="end-stats compact">
      <div><b>${g.stats.entered}</b><span>races</span></div><div><b>${g.stats.wins}</b><span>wins</span></div>
      <div><b>${g.stats.podiums}</b><span>podiums</span></div><div><b>${g.stats.dnfs ?? 0}</b><span>DNFs</span></div>
      <div><b>${money(g.stats.earned ?? 0)}</b><span>prize money</span></div><div><b>${p.points.toLocaleString('en-US')}</b><span>points</span></div></div>
    <h4>${icon('rank', 14)} World rankings</h4>
    <table class="results standings"><thead><tr><th>#</th><th>Rider</th><th class="num">Points</th></tr></thead><tbody>${rows.join('')}</tbody></table>
    <h4>${icon('trophy', 14)} Trophy shelf</h4>
    ${trophies.length ? `<ul class="trophies">${trophies.map((t) => `<li>${levelBadge(t.level)}<b>${esc(t.name)}</b>${t.venue ? `<small>${esc(t.venue)}</small>` : ''}</li>`).join('')}</ul>` : '<p class="muted small">No wins yet. Your first will go here.</p>'}
  </div>`;
}
