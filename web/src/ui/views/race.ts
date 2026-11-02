// The race: the start gate, each trail section from the rider's point of view, and the results.
import { gameData as data } from '../../data';
import * as G from '../../engine/game';
import { rivalById, type ResultRow } from '../../engine/rivals';
import { PART_LABELS, STAT_LABELS, type GameState, type RaceSession } from '../../engine/types';
import { levelBadge, startScene } from '../art';
import { esc, money, ordinal, seconds } from '../dom';
import { LANE_GLYPH, lanesFor, povScene } from '../pov';
import { flagEmoji, riderAvatar } from '../rider';
import type { UI } from '../state';
import { icon, rankDelta } from '../widgets';

/** A finishing time (the race's time units are milliseconds) as m:ss.mmm. */
export function fmtTime(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = Math.floor(ms % 1000);
  return `${m}:${String(s).padStart(2, '0')}.${String(r).padStart(3, '0')}`;
}

/** A stat bar for a choice: the current value, the part it will cost, and the pace it has to beat. */
function statMeter(label: string, value: number, after: number, max: number, tick: number, ok: boolean): string {
  const pct = (v: number) => Math.max(0, Math.min(100, (v / max) * 100));
  return `<div class="meter ${ok ? 'ok' : 'under'}">
    <span><em>${esc(label)}</em><b>${value}</b><i>→ ~${after}</i></span>
    <div class="bar"><span class="keep" style="width:${pct(after)}%"></span><span class="lose" style="left:${pct(after)}%;width:${Math.max(0, pct(value) - pct(after))}%"></span><i class="tick" style="left:${pct(tick)}%" title="Pace ${tick}"></i></div>
  </div>`;
}

function raceHead(ui: UI, s: RaceSession): string {
  const r = s.race;
  const where = r.venue ? `<span class="venue">${icon('pin', 13)} ${esc(r.venue)}${r.region ? `, ${esc(r.region)}` : ''}</span>` : r.club ? '<span class="venue">Club race</span>' : '';
  return `<div class="race-head">
    <div><h2>${esc(r.name)}</h2><div class="muted race-meta">${levelBadge(r.level)} · ${r.length} sections · <span title="Stats above this gain time, below it lose time">pace ${G.turningPoint(r.level)}</span> ${where}</div></div>
    ${ui.raceView === 'ride' ? `<div class="split ${s.gap > 0 ? 'ahead' : s.gap < 0 ? 'behind' : ''}"><span>Split</span><b data-gap="${s.gap}">${seconds(s.gap)}</b></div>` : ''}
  </div>`;
}

function fieldPreview(s: RaceSession, g: GameState): string {
  const field = (s.field ?? []).map(rivalById).filter((r): r is NonNullable<typeof r> => !!r).sort((a, b) => b.rating - a.rating);
  if (!field.length) return '';
  const top = field.slice(0, 3);
  const you = g.player;
  return `<div class="field card">
    <div class="field-head"><b>${field.length + 1} riders on the start list</b><span class="muted small">Rank #${G.rankOf(g)} · you're ${esc(you.name)}</span></div>
    <ul class="field-list">${top.map((r) => `<li>${riderAvatar(r.kit, 30)}<span><b>${esc(r.name)}</b><small>${flagEmoji(r.country)} ${'★'.repeat(Math.max(1, Math.round(r.rating / 2)))}</small></span></li>`).join('')}
      ${field.length > 3 ? `<li class="more">+${field.length - 3} more</li>` : ''}</ul>
  </div>`;
}

export function raceView(g: GameState, ui: UI): string {
  if (ui.raceView === 'result' && ui.result) return resultView(g, ui);
  const s = g.activeRace;
  if (!s) return '';
  const r = s.race;
  const head = raceHead(ui, s);
  if (ui.raceView === 'start') {
    return `<div class="race start">${head}
      <div class="scene">${startScene(r.endcap)}</div>
      <div class="race-start">
        ${fieldPreview(s, g)}
        <div class="race-brief card"><p>Pick a line in every section with <kbd>←</kbd><kbd>↑</kbd><kbd>→</kbd>. Stats above <b>${G.turningPoint(r.level)}</b> gain time, bike health above 30 gains time. Finish ahead of the field to win.</p>
        <button class="btn primary big" data-act="drop-in">${icon('play', 18)} Drop in <kbd>Enter</kbd></button></div>
      </div></div>`;
  }
  const p = g.player;
  const pace = G.turningPoint(r.level);
  const flash = ui.flash;
  const featIndex = flash ? flash.feature : s.feature;
  const feat = data.terrain[featIndex];
  const lanes = lanesFor(feat);
  const choices = feat.options.map((o, i) => {
    const risk = G.crashRisk(p, o.modifier, r.level);
    let meter = '';
    let verdict = '';
    if (o.modifier === 'strength' || o.modifier === 'skill' || o.modifier === 'endurance') {
      const v = p[o.modifier];
      const after = G.projectedStat(p, o.modifier);
      const ok = v >= pace;
      verdict = `<span class="stat-chip ${ok ? 'good' : 'bad'}">${ok ? 'Gains time' : 'Loses time'}</span>`;
      meter = statMeter(STAT_LABELS[o.modifier], v, after, 102, pace, ok);
    } else if (o.modifier === 'time') {
      verdict = '<span class="stat-chip neutral">Plays it safe · −0.75s</span>';
      meter = '<div class="meter none"><span>No stat used</span></div>';
    } else if (o.modifier === 'bike') {
      const hp = G.bikeHealth(p);
      const after = G.projectedBikeHealth(p, r.level);
      verdict = `<span class="stat-chip ${hp >= 30 ? 'neutral' : 'bad'}">${hp >= 30 ? 'Wears every part' : 'Bike may break'}</span>`;
      meter = statMeter('Bike health', hp, after, 100, 30, hp >= 30);
    }
    const riskChip = risk > 0 ? `<span class="stat-chip risk">⚠ ${Math.round(risk * 100)}% injury</span>` : '';
    const lane = lanes[i];
    const key = lane ? `<kbd class="arrow" aria-label="${lane}">${LANE_GLYPH[lane]}</kbd>` : `<kbd>${i + 1}</kbd>`;
    const picked = flash && flash.outcome.choice === i + 1 ? 'picked' : '';
    return `<button class="choice lane-${lane ?? 'extra'} ${picked}" data-act="line" data-n="${i + 1}" data-key="line-${i + 1}" ${flash ? 'disabled' : ''}>
      <span class="choice-head">${key}<span class="choice-label">${esc(o.label)}</span></span>
      ${meter}
      <span class="chips">${verdict}${riskChip}</span></button>`;
  }).join('');
  const doneSections = flash ? s.section : s.section;
  const progress = `<div class="progress" aria-label="Section ${Math.min(doneSections + 1, r.length)} of ${r.length}">${Array.from({ length: r.length }, (_, i) => {
    const split = s.splits[i];
    const cls = i < s.section ? (split > 0 ? 'ahead' : 'behind') : i === s.section ? 'now' : '';
    return `<i class="${cls}"></i>`;
  }).join('')}</div>`;
  const keys = (['left', 'straight', 'right'] as const).filter((l) => lanes.includes(l)).map((l) => `<kbd>${LANE_GLYPH[l]}</kbd>`).join('');
  const hint = feat.options.length > 1 ? `Pick a line with ${keys} or tap a trail` : `Press ${keys} to ride it out`;
  const sectionNo = flash ? Math.min(s.section, r.length) : s.section + 1;
  return `<div class="race ${flash ? 'flashing' : ''}">${head}${progress}
    <div class="scene">${povScene(feat, featIndex)}<div class="section-label">Section ${sectionNo} / ${r.length} · ${esc(feat.title)}</div>${flash ? outcomeOverlay(flash.outcome) : ''}</div>
    <div class="choices lanes">${choices}</div>
    ${lastOutcome(s)}
    <div class="race-foot"><span class="muted small">${hint}</span><button class="btn ghost small" data-act="quit-race">Quit race <kbd>Esc</kbd></button></div>
  </div>`;
}

/** The big stamp over the scene right after a section: the time gained or lost, or what went wrong. */
function outcomeOverlay(o: ReturnType<typeof G.rideSection>): string {
  const d = o.gapAfter - o.gapBefore;
  let cls = d >= 0 ? 'good' : 'bad';
  let main = seconds(d);
  let sub = d >= 0 ? 'Time gained' : 'Time lost';
  if (o.injury) {
    cls = 'crash';
    main = 'CRASH';
    sub = 'Injured';
  } else {
    // A crash or a mechanical is known from the session status, passed in via the outcome's lack of a next section.
    const bits: string[] = [];
    if (o.stat) bits.push(`${STAT_LABELS[o.stat.name]} ${o.stat.before}→${o.stat.after}`);
    const worn = o.damage.filter((x) => x.after < x.before);
    if (worn.length) bits.push(worn.length > 1 ? 'Bike worn' : `${PART_LABELS[worn[0].slot]} −${worn[0].before - worn[0].after}`);
    if (bits.length) sub += ` · ${bits.join(' · ')}`;
  }
  return `<div class="outcome ${cls}"><b>${main}</b><span>${esc(sub)}</span></div>`;
}

function lastOutcome(s: RaceSession): string {
  const o = s.last;
  if (!o) return '';
  const feat = data.terrain[o.feature];
  const d = o.gapAfter - o.gapBefore;
  const bits = [`<span class="${d >= 0 ? 'good' : 'bad'}">${seconds(d)}</span>`];
  if (o.stat) bits.push(`${STAT_LABELS[o.stat.name]} ${o.stat.before}→${o.stat.after}`);
  for (const dm of o.damage) if (dm.after < dm.before) bits.push(`${PART_LABELS[dm.slot]} −${dm.before - dm.after}`);
  bits.push(`Tread ${o.tireLife}`);
  return `<div class="last"><b>Last section</b> ${esc(feat.title)} — ${esc(feat.options[o.choice - 1]?.label ?? '')} <span class="last-bits">${bits.join('<i>·</i>')}</span></div>`;
}

function rowAvatar(row: ResultRow, g: GameState, size: number): string {
  if (row.id === null) return riderAvatar(g.player.kit ?? 0, size);
  return riderAvatar(rivalById(row.id)?.kit ?? 5, size);
}

function rowFlag(row: ResultRow): string {
  if (row.id === null) return '';
  return flagEmoji(rivalById(row.id)?.country);
}

function podium(rows: ResultRow[], g: GameState): string {
  const top = rows.slice(0, 3);
  if (top.length < 3 || top.some((r) => r.time === null)) return '';
  const order = [top[1], top[0], top[2]];
  return `<div class="podium" aria-label="Podium">${order.map((r) => `<div class="step p${r.position} ${r.id === null ? 'you' : ''}">
      ${rowAvatar(r, g, r.position === 1 ? 64 : 52)}
      <b>${esc(r.id === null ? 'You' : r.name.split(' ').pop()!)}</b>
      <small>${r.position === 1 ? fmtTime(r.time!) : '+' + ((r.time! - top[0].time!) / 1000).toFixed(3)}</small>
      <div class="block"><span>${r.position}</span></div>
    </div>`).join('')}</div>`;
}

function resultsTable(rows: ResultRow[], g: GameState): string {
  const me = rows.findIndex((r) => r.id === null);
  let show: (ResultRow | null)[];
  if (rows.length <= 10) show = rows;
  else {
    const keep = new Set<number>();
    for (let i = 0; i < 5; i++) keep.add(i);
    for (let i = me - 2; i <= me + 2; i++) if (i >= 0 && i < rows.length) keep.add(i);
    show = [];
    let last = -1;
    for (const i of [...keep].sort((a, b) => a - b)) {
      if (i > last + 1) show.push(null);
      show.push(rows[i]);
      last = i;
    }
    if (last < rows.length - 1) show.push(null);
  }
  const winner = rows.find((r) => r.time !== null)?.time ?? 0;
  return `<table class="results"><thead><tr><th>#</th><th>Rider</th><th class="num">Time</th><th class="num">Gap</th></tr></thead><tbody>
    ${show.map((r) => r === null ? '<tr class="gap-row"><td colspan="4">···</td></tr>' : `<tr class="${r.id === null ? 'you' : ''}">
      <td class="pos">${r.position}</td>
      <td class="who">${rowAvatar(r, g, 24)}<span>${esc(r.id === null ? `${r.name} (you)` : r.name)}</span><small>${rowFlag(r)}</small></td>
      <td class="num">${r.time === null ? 'DNF' : fmtTime(r.time)}</td>
      <td class="num muted">${r.time === null ? '' : r.position === 1 ? '—' : '+' + ((r.time - winner) / 1000).toFixed(3)}</td></tr>`).join('')}
  </tbody></table>`;
}

function resultView(g: GameState, ui: UI): string {
  const res = ui.result!;
  const s = res.session;
  let title: string;
  let text: string;
  let mood: 'win' | 'podium' | 'meh' | 'dnf' = 'meh';
  if (s.status === 'quit') {
    title = 'You pulled out';
    text = `You quit the race and lost your entry fee and ${G.QUIT_PENALTY} points.`;
    mood = 'dnf';
  } else if (s.status === 'flat') {
    title = 'Flat tire!';
    text = 'The tire gave up with the finish in sight. Mount a fresh one before the next race.';
    mood = 'dnf';
  } else if (s.status === 'broken') {
    title = 'Mechanical';
    text = 'A part broke and that was that. Fit new parts at a bike shop and keep the bike above 30% with toolkits.';
    mood = 'dnf';
  } else if (s.status === 'crash') {
    title = s.last?.injury ? 'Crash — you’re injured' : 'You crashed!';
    text = s.last?.injury
      ? `You rode a line beyond your ability and went down hard. Injuries: ${g.player.injuries} of ${G.MAX_INJURIES}.${g.player.injuries >= G.MAX_INJURIES ? ' That’s the end of your season.' : ' Ride within your limits!'}`
      : 'Bad luck on the trail. Dust off and get back out there.';
    mood = 'dnf';
  } else {
    const pl = res.placement!;
    title = pl === 1 ? 'You won!' : pl ? `${ordinal(pl)} place!` : `${ordinal(res.position)} place`;
    text = pl === 1
      ? `You won the ${s.race.name} by ${(s.gap / 1000).toFixed(3)} seconds.`
      : pl
        ? `${(-s.gap / 1000).toFixed(3)} seconds off the win — still on the podium.`
        : `${(-s.gap / 1000).toFixed(3)} seconds back and off the podium this time.`;
    mood = pl === 1 ? 'win' : pl ? 'podium' : 'meh';
  }
  const chips = s.status === 'finished' || s.status === 'quit'
    ? `<div class="result-chips"><span class="stat-chip ${res.points >= 0 ? 'good' : 'bad'}">${icon('star', 14)} ${res.points >= 0 ? '+' : ''}${res.points} points</span>${res.prize ? `<span class="stat-chip good">${icon('cash', 14)} +${money(res.prize)}</span>` : ''}${rankDelta(res.rankBefore, res.rankAfter)}${res.levelUp ? `<span class="stat-chip good">${icon('up', 14)} Level ${g.level} · ${G.tierName(g.level)}</span>` : ''}${res.zoneComplete ? '<span class="stat-chip good">+1000 bonus points</span>' : ''}</div>`
    : `<div class="result-chips"><span class="stat-chip bad">Entry fee lost</span>${rankDelta(res.rankBefore, res.rankAfter)}</div>`;
  return `<div class="race result ${mood}"><div class="result-wrap">
    <div class="card result-card">
      <div class="result-kicker">${esc(s.race.name)}${s.race.venue ? ` · ${esc(s.race.venue)}` : ''}</div>
      <h2>${title}</h2><p>${text}</p>${chips}
      ${podium(res.rows, g)}
      ${sparkline(s)}
      <button class="btn primary big" data-act="race-done">Continue <kbd>Enter</kbd></button>
    </div>
    <div class="card results-card"><h3>Results</h3>${resultsTable(res.rows, g)}</div>
  </div></div>`;
}

function sparkline(s: RaceSession): string {
  if (s.splits.length < 2) return '';
  const vals = [0, ...s.splits];
  const max = Math.max(1, ...vals.map(Math.abs));
  const w = 300;
  const h = 60;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h / 2 - (v / max) * (h / 2 - 4)}`).join(' ');
  return `<figure class="spark"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Split gap per section">
    <line x1="0" x2="${w}" y1="${h / 2}" y2="${h / 2}" stroke="var(--line)" stroke-width="1.5"/>
    <polyline points="${pts}" fill="none" stroke="${s.gap >= 0 ? 'var(--good)' : 'var(--danger)'}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/></svg>
    <figcaption class="muted small">Your gap to the leader, section by section</figcaption></figure>`;
}
