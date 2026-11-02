// Screens, input and flow. Rules live in ../engine; this file decides what to show and when, and the
// views in ./views decide how it looks.
import { gameData as data } from '../data';
import { isLand } from '../engine/parse';
import { mathRng as rng } from '../engine/rng';
import * as G from '../engine/game';
import { KITS } from '../engine/rivals';
import { PART_LABELS, STAT_LABELS, ZONE_LABELS, type GameState, type PartSlot, type Point, type RaceKind, type RaceSession, type StatName } from '../engine/types';
import { levelBadge, signIcon, type ItemKind } from './art';
import { esc, money, ordinal, seconds } from './dom';
import { confetti, countUp, shake } from './fx';
import { cellFromEvent } from './mapSvg';
import { LANE_KEY, lanesFor } from './pov';
import { riderAvatar } from './rider';
import * as Save from './save';
import { sfx } from './sound';
import type { Screen, Tone, UI } from './state';
import { icon } from './widgets';
import { careerBody } from './views/career';
import { hudView } from './views/hud';
import { mapView } from './views/map';
import { raceView } from './views/race';
import { shopModal } from './views/shop';
import { endView, europeView, loadView, nameView, storyView, titleView } from './views/story';

interface ModalAction {
  label: string;
  run: () => void;
  kind?: 'primary' | 'danger' | 'plain';
}
interface Modal {
  title: string;
  body: string;
  actions: ModalAction[];
  /** Run on Escape / backdrop; omitted means the modal can't be dismissed that way. */
  cancel?: () => void;
  wide?: boolean;
  /** Extra class, e.g. a celebration. */
  cls?: string;
}

const SPONSOR_NAMES = ['Dirt Bag Coffee', 'Loam Ranger Tires', 'Hometown Bike Co.'];
const FLASH_MS = 950;

/** The first part slot that's missing or broken, if any. */
function firstMissingSlot(p: GameState['player']): PartSlot | undefined {
  return (['frame', 'suspension', 'brakes', 'wheels'] as PartSlot[]).find((slot) => !p.parts[slot] || p.parts[slot]!.quality <= 0);
}

export class App {
  private root: HTMLElement;
  private game: GameState | null = null;
  private modal: Modal | null = null;
  private walkTimer: number | null = null;
  private toast: string | null = null;
  private toastTimer: number | null = null;
  private firstShop = false;
  private picking = false;
  private ui: UI = {
    screen: 'title',
    cart: G.emptyCart(),
    raceView: 'start',
    result: null,
    mobile: !!window.matchMedia?.('(max-width: 820px)').matches,
    fullMap: false,
    metersOpen: !window.matchMedia?.('(max-width: 820px)').matches,
    shopCat: 'frame',
    log: [],
    walkPath: [],
    from: null,
    flash: null,
    muted: sfx.muted,
    nameKit: 0,
    nameDraft: '',
  };

  constructor(root: HTMLElement) {
    this.root = root;
    root.addEventListener('click', (e) => this.onClick(e));
    root.addEventListener('submit', (e) => this.onSubmit(e));
    root.addEventListener(
      'toggle',
      (e) => {
        const el = e.target as HTMLDetailsElement;
        if (el.dataset?.sec === 'meters') this.ui.metersOpen = el.open;
      },
      true,
    );
    window.addEventListener('keydown', (e) => this.onKey(e));
    window.addEventListener('resize', () => {
      const m = !!window.matchMedia?.('(max-width: 820px)').matches;
      if (m !== this.ui.mobile) {
        this.ui.mobile = m;
        this.render();
      }
    });
    this.render();
  }

  // ------------------------------------------------------------ plumbing

  private get g(): GameState {
    if (!this.game) throw new Error('no game');
    return this.game;
  }

  private get screen(): Screen {
    return this.ui.screen;
  }
  private set screen(s: Screen) {
    this.ui.screen = s;
  }

  private say(text: string, tone: Tone = 'info') {
    this.ui.log.unshift({ text, tone });
    this.ui.log.length = Math.min(this.ui.log.length, 6);
  }

  private flashToast(text: string) {
    this.toast = text;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toast = null;
      this.render();
    }, 2200);
  }

  /** Persist after every change and route to the end screens when the season is over. */
  private commit() {
    if (this.game) {
      if (this.screen !== 'race' && G.checkGameOver(this.game, data)) {
        if (this.screen !== 'gameover') sfx.play('bad');
        this.screen = 'gameover';
      }
      Save.autosave(this.game);
    }
    this.render();
  }

  private show(modal: Modal) {
    this.modal = modal;
    this.render();
    queueMicrotask(() => this.root.querySelector<HTMLButtonElement>('.modal .btn.primary, .modal .btn')?.focus());
  }

  private close() {
    this.modal = null;
  }

  private confirm(title: string, body: string, yes: string, onYes: () => void, no = 'Cancel', onNo?: () => void) {
    const cancel = () => {
      this.close();
      onNo?.();
      this.render();
    };
    this.show({
      title,
      body,
      cancel,
      actions: [
        { label: no, run: cancel, kind: 'plain' },
        {
          label: yes,
          kind: 'primary',
          run: () => {
            this.close();
            onYes();
            this.render();
          },
        },
      ],
    });
  }

  // ------------------------------------------------------------ input

  private onClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.classList.contains('modal-backdrop')) {
      if (this.modal?.cancel) this.modal.cancel();
      else if (this.screen === 'shop' && !this.modal) this.leaveShop();
      return;
    }
    const svg = target.closest<SVGSVGElement>('svg.map-svg');
    if (svg && this.screen === 'map' && !this.modal) {
      const cell = cellFromEvent(svg, e, data.maps[G.zoneOf(this.g)].start.x % 2);
      if (cell) this.walkTo(cell);
      return;
    }
    const el = target.closest<HTMLElement>('[data-act]');
    if (!el || (el as HTMLButtonElement).disabled) return;
    const act = el.dataset.act!;
    if (act !== 'line' && act !== 'dpad' && act !== 'sound') sfx.play('tap');
    this.act(act, el.dataset);
  }

  private onSubmit(e: SubmitEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    if (form.id === 'name-form') {
      const name = (new FormData(form).get('name') as string).trim().slice(0, 24);
      if (!name) return;
      this.newGame(name, this.ui.nameKit);
    }
  }

  private onKey(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const k = e.key;
    if (this.modal) {
      if (k === 'Escape' && this.modal.cancel) {
        e.preventDefault();
        this.modal.cancel();
      }
      return; // Enter/Space activate the focused button natively
    }
    const keyNum = /^[1-9]$/.test(k) ? parseInt(k, 10) : 0;
    switch (this.screen) {
      case 'title':
        if (k === 'Enter') this.act(Save.loadAutosave() ? 'continue' : 'new', {});
        break;
      case 'map': {
        const dir = ({ ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' } as Record<string, G.Direction>)[k];
        if (dir) {
          e.preventDefault();
          this.stopWalk();
          this.step(dir);
        } else if (k === 'Enter' || k === ' ' || k === 'e' || k === 'E') {
          e.preventDefault();
          this.act('interact', {});
        } else if (keyNum >= 1 && keyNum <= 5) {
          this.act(['local', 'eat', 'repair', 'save', 'fuel'][keyNum - 1], {});
        } else if (k === 'Escape') this.act('menu', {});
        else if (k === 'c' || k === 'C') this.act('career', {});
        else if (k === 'm' || k === 'M') this.act('sound', {});
        break;
      }
      case 'shop':
        if (k === 'Escape') this.act('leave', {});
        break;
      case 'race':
        if (this.ui.raceView === 'start' && (k === 'Enter' || k === ' ')) {
          e.preventDefault();
          this.act('drop-in', {});
        } else if (this.ui.raceView === 'ride' && k !== 'Escape') {
          const feat = data.terrain[this.g.activeRace!.feature];
          let n = keyNum;
          if (!n && LANE_KEY[k]) n = lanesFor(feat).indexOf(LANE_KEY[k]) + 1;
          if (!n && (k === 'Enter' || k === ' ') && feat.options.length === 1) n = 1;
          if (LANE_KEY[k] || k === ' ') e.preventDefault();
          if (n >= 1 && n <= feat.options.length) this.act('line', { n: String(n) });
        } else if (this.ui.raceView === 'ride' && k === 'Escape') this.act('quit-race', {});
        else if (this.ui.raceView === 'result' && (k === 'Enter' || k === ' ')) {
          e.preventDefault();
          this.act('race-done', {});
        }
        break;
      case 'story':
      case 'europe':
        if (k === 'Enter') this.act(this.screen === 'story' ? 'to-shop' : 'fly', {});
        break;
    }
  }

  private act(name: string, ds: DOMStringMap) {
    switch (name) {
      case 'modal':
        this.modal?.actions[Number(ds.i)]?.run();
        return;
      case 'sound':
        this.ui.muted = sfx.toggle();
        this.render();
        return;
      case 'continue': {
        const s = Save.loadAutosave();
        if (s) this.resume(s);
        return;
      }
      case 'new':
        this.ui.nameKit = Math.floor(Math.random() * KITS.length);
        this.ui.nameDraft = '';
        this.screen = 'name';
        this.close();
        this.render();
        queueMicrotask(() => this.root.querySelector<HTMLInputElement>('#name')?.focus());
        return;
      case 'kit':
        this.ui.nameDraft = this.root.querySelector<HTMLInputElement>('#name')?.value ?? this.ui.nameDraft;
        this.ui.nameKit = Number(ds.i);
        this.render();
        return;
      case 'load':
        this.screen = 'load';
        this.render();
        return;
      case 'load-slot': {
        const s = Save.listSaves().find((x) => x.player.name === ds.name);
        if (s) this.resume(Save.copyOf(s));
        return;
      }
      case 'delete-slot':
        this.confirm('Delete save?', `The save for <b>${esc(ds.name)}</b> will be gone for good.`, 'Delete', () => {
          Save.deleteSave(ds.name!);
          if (!Save.listSaves().length) this.screen = 'title';
        });
        return;
      case 'title':
        this.stopWalk();
        this.close();
        this.screen = 'title';
        this.render();
        return;
      case 'help':
        this.showHelp();
        return;
      case 'career':
        this.showCareer();
        return;
      case 'to-shop':
        this.firstShop = true;
        this.openShop();
        return;
      case 'menu':
        this.showMenu();
        return;
      case 'interact':
        this.interact();
        return;
      case 'local':
        this.askRace('local');
        return;
      case 'fuel':
        this.buyFuel();
        return;
      case 'eat':
        this.eat();
        return;
      case 'repair':
        this.repair();
        return;
      case 'save':
        this.save();
        return;
      case 'fullmap':
        this.ui.fullMap = !this.ui.fullMap;
        this.render();
        return;
      case 'dpad':
        this.stopWalk();
        this.step(ds.dir as G.Direction);
        return;
      // shop
      case 'cat':
        this.ui.shopCat = ds.cat as ItemKind | 'supplies';
        this.render();
        queueMicrotask(() => this.root.querySelector<HTMLElement>(`[data-act="cat"][data-cat="${this.ui.shopCat}"]`)?.focus());
        return;
      case 'uncart': {
        const k = ds.k as ItemKind;
        if (k === 'tires' || k === 'snacks' || k === 'toolkits') this.ui.cart[k] = 0;
        else delete this.ui.cart.parts[k];
        this.render();
        return;
      }
      case 'part': {
        const slot = ds.slot as PartSlot;
        const i = Number(ds.i);
        if (this.ui.cart.parts[slot] === i) delete this.ui.cart.parts[slot];
        else this.ui.cart.parts[slot] = i;
        this.render();
        return;
      }
      case 'qty': {
        const what = ds.what as G.Consumable;
        const next = this.ui.cart[what] + Number(ds.d);
        this.ui.cart[what] = Math.max(0, Math.min(next, G.maxAdd(this.g.player, what)));
        this.render();
        return;
      }
      case 'checkout':
        this.checkout();
        return;
      case 'leave':
        this.leaveShop();
        return;
      case 'sponsor':
        this.callSponsor();
        return;
      // race
      case 'drop-in':
        this.g.activeRace!.status = 'running';
        this.ui.raceView = 'ride';
        sfx.play('start');
        this.commit();
        return;
      case 'line':
        this.pickLine(Number(ds.n));
        return;
      case 'quit-race':
        this.confirm(
          'Quit this race?',
          `You'll lose your entry fee and ${G.QUIT_PENALTY} points.`,
          'Quit race',
          () => {
            const s = this.g.activeRace!;
            s.status = 'quit';
            this.finishRace(s);
          },
          'Keep riding',
        );
        return;
      case 'race-done':
        this.afterRace();
        return;
      case 'fly':
        this.screen = 'map';
        this.ui.log = [];
        this.say('Welcome to Europe! The World Cup circuit awaits.', 'good');
        sfx.play('open');
        this.commit();
        return;
    }
  }

  // ------------------------------------------------------------ flow

  private newGame(name: string, kit: number) {
    this.game = G.createGame(name, data, rng, kit);
    this.ui.log = [];
    this.screen = 'story';
    sfx.play('open');
    this.commit();
  }

  private resume(s: GameState) {
    G.normalize(s, rng);
    this.game = s;
    this.ui.log = [];
    this.ui.cart = G.emptyCart();
    this.ui.flash = null;
    this.close();
    if (s.phase === 'champion') this.screen = 'victory';
    else if (s.phase === 'gameover') this.screen = 'gameover';
    else if (s.activeRace) {
      this.screen = 'race';
      this.ui.raceView = s.activeRace.status === 'start' ? 'start' : 'ride';
    } else {
      this.screen = 'map';
      this.say(`Welcome back, ${s.player.name}. ${G.tierName(s.level)}, ranked #${G.rankOf(s)}.`);
    }
    this.commit();
  }

  private step(dir: G.Direction): boolean {
    const map = G.currentMap(this.g);
    const before = { ...map.player };
    const r = G.move(this.g, data, dir, rng);
    if (r.noFuel) {
      this.say(this.g.level ? 'Out of fuel. Race locally for cash (1) or call a fuel delivery (5).' : 'Out of fuel. Call a fuel delivery (5) to keep going.', 'bad');
      sfx.play('bad');
      this.render();
      return false;
    }
    if (!r.moved) return false;
    if (this.g.fuel === 5) this.say('Fuel is running low. Fill up at a town or a race venue.', 'bad');
    this.ui.from = before;
    if (r.shopFound) {
      this.say(`You found ${G.placeName(map, map.player) ?? 'a bike shop'} — a town with a bike shop and fuel!`, 'good');
      sfx.play('open');
    }
    this.commit();
    this.ui.from = null;
    return true;
  }

  private walkTo(goal: Point) {
    this.stopWalk();
    const map = G.currentMap(this.g);
    const t = data.maps[map.zone];
    if (!isLand(t, goal.x, goal.y)) return;
    const start = map.player;
    const prev = new Map<string, Point | null>([[G.key(start), null]]);
    const queue: Point[] = [start];
    while (queue.length) {
      const cur = queue.shift()!;
      if (cur.x === goal.x && cur.y === goal.y) break;
      for (const d of Object.values(G.DIRS)) {
        const n = { x: cur.x + d.x, y: cur.y + d.y };
        if (!isLand(t, n.x, n.y) || prev.has(G.key(n))) continue;
        prev.set(G.key(n), cur);
        queue.push(n);
      }
    }
    if (!prev.has(G.key(goal))) return;
    const path: Point[] = [];
    for (let p: Point | null = goal; p && G.key(p) !== G.key(start); p = prev.get(G.key(p)) ?? null) path.unshift(p);
    this.ui.walkPath = path;
    const tick = () => {
      const next = this.ui.walkPath.shift();
      if (!next || this.screen !== 'map' || this.modal) return this.stopWalk();
      const cur = G.currentMap(this.g).player;
      const dir = (Object.keys(G.DIRS) as G.Direction[]).find((d) => cur.x + G.DIRS[d].x === next.x && cur.y + G.DIRS[d].y === next.y);
      if (!dir || !this.step(dir)) return this.stopWalk();
      if (G.locationOf(this.g) !== 'open' || !this.ui.walkPath.length) return this.stopWalk();
      this.walkTimer = window.setTimeout(tick, 120);
    };
    tick();
  }

  private stopWalk() {
    if (this.walkTimer) clearTimeout(this.walkTimer);
    this.walkTimer = null;
    if (this.ui.walkPath.length) {
      this.ui.walkPath = [];
      this.render();
    }
  }

  private interact() {
    const loc = G.locationOf(this.g);
    if (loc === 'shop') this.openShop();
    else if (loc === 'race') this.askRace('map');
    else if (loc === 'final') this.askRace('final');
    else this.askRace('local');
  }

  private askRace(kind: RaceKind) {
    const g = this.g;
    const map = G.currentMap(g);
    if (kind === 'map' && g.player.points < G.requiredPoints(g.level)) {
      this.say(`Earn ${G.requiredPoints(g.level)} qualification points to enter this race.`, 'bad');
      return this.render();
    }
    if (kind === 'final' && map.races.length) {
      this.say(`Win every other flag on the map to enter the final (${map.races.length} left).`, 'bad');
      return this.render();
    }
    const blocker = G.raceBlocker(g.player);
    if (blocker) {
      this.say(blocker, 'bad');
      sfx.play('bad');
      return this.render();
    }
    const pick = G.pickRace(g, kind, rng);
    if (!pick) {
      this.say('No local races at your level yet. Head to a flag on the map to start your season.', 'bad');
      return this.render();
    }
    const r = pick.race;
    const debt = r.entryFee > g.money ? `<p class="warn">That’s more than you have — you’ll go into debt.</p>` : '';
    const where = r.venue ? `<div class="muted small">${icon('pin', 13)} ${esc(r.venue)}${r.region ? `, ${esc(r.region)}` : ''}</div>` : '';
    this.confirm(
      esc(r.name),
      `<div class="race-card">${where}<div>${levelBadge(r.level)} <span class="muted">· ${r.length} sections · pace ${G.turningPoint(r.level)}</span></div>
        <p>The entry fee is <b>${money(r.entryFee)}</b>. You have ${money(g.money)}. A win pays <b>${money(Math.trunc((r.level / 7) ** 2 * G.PRIZES[1]))}</b>.</p>${debt}
        ${kind === 'final' ? '<p>This is the final race of the region. Win or podium it to move on!</p>' : ''}</div>`,
      'Enter race',
      () => this.beginRace(kind, pick),
      'Not now',
    );
  }

  private beginRace(kind: RaceKind, pick: G.RacePick) {
    const g = this.g;
    const s = G.startRace(g, data, kind, pick, rng);
    this.screen = 'race';
    this.ui.raceView = 'start';
    this.ui.flash = null;
    this.commit();
    if (G.tireIsLow(g.player, s.race)) {
      this.confirm(
        'Tires looking thin',
        `Your tire has ${g.player.tires[0]} sections of tread left and this race is ${s.race.length} long. Mount a fresh one?`,
        'Mount fresh tire',
        () => {
          G.swapTire(g.player);
          this.commit();
        },
        'Risk it',
      );
    }
  }

  /** Light up the chosen lane, ride the section, show what happened, then move on. */
  private pickLine(n: number) {
    const s = this.g.activeRace;
    if (this.picking || this.ui.flash || !s || s.status !== 'running') return;
    this.picking = true;
    sfx.play('pick');
    this.root.querySelectorAll(`.race [data-act="line"][data-n="${n}"]`).forEach((el) => el.classList.add('picked'));
    const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => {
      this.picking = false;
      this.rideLine(n, reduced);
    }, reduced ? 0 : 180);
  }

  private rideLine(n: number, reduced = false) {
    const s = this.g.activeRace;
    if (!s || s.status !== 'running') return;
    const feature = s.feature;
    const gapBefore = s.gap;
    const out = G.rideSection(this.g, data, s, n, rng);
    const d = out.gapAfter - out.gapBefore;
    const status: string = s.status;
    if (status === 'crash' || status === 'broken' || status === 'flat') sfx.play('crash');
    else sfx.play(d >= 0 ? 'gain' : 'lose');
    const finish = () => {
      this.ui.flash = null;
      if (s.status !== 'running') this.finishRace(s);
      else {
        this.commit();
        countUp(this.root.querySelector('.split b'), gapBefore, s.gap, seconds, 500);
      }
    };
    if (reduced) return finish();
    this.ui.flash = { outcome: out, feature };
    Save.autosave(this.g);
    this.render();
    if (s.status !== 'running') shake(this.root.querySelector('.scene'));
    setTimeout(finish, FLASH_MS);
  }

  private finishRace(s: RaceSession) {
    const res = G.settleRace(this.g, s, rng);
    this.ui.result = { ...res, session: s };
    this.ui.raceView = 'result';
    if (res.placement === 1) {
      sfx.play('win');
      confetti();
    } else if (res.placement) sfx.play('podium');
    else if (res.placement === 0) sfx.play('lose');
    this.commit();
  }

  private afterRace() {
    const res = this.ui.result;
    this.ui.result = null;
    if (!res) return;
    const g = this.g;
    const s = res.session;
    if (res.placement) this.say(`${ordinal(res.position)} at the ${s.race.name}: +${res.points} points, ${money(res.prize)}.`, 'good');
    else if (res.placement === 0) this.say(`${ordinal(res.position)} at the ${s.race.name}. ${res.points} points.`, 'bad');
    if (res.rankAfter < res.rankBefore) this.say(`You moved up to #${res.rankAfter} in the world rankings.`, 'good');
    if (g.phase === 'gameover' || G.checkGameOver(g, data)) this.screen = 'gameover';
    else if (res.champion) this.screen = 'victory';
    else if (res.zoneComplete) this.screen = 'europe';
    else this.screen = 'map';
    if (res.champion) {
      sfx.play('levelup');
      confetti({ count: 160, duration: 4000 });
    }
    this.commit();
    if (res.levelUp && !res.zoneComplete && !res.champion) this.celebrateLevel();
  }

  private celebrateLevel() {
    const g = this.g;
    const lvl = g.level;
    sfx.play('levelup');
    confetti({ count: 70 });
    const unlock = lvl >= 6 ? 'Europe’s World Cup flags are next.' : `Level ${lvl + 1} flags open once you have ${G.requiredPoints(lvl)} points. The pace rises to ${G.turningPoint(lvl + 1)} and the prizes grow.`;
    this.show({
      title: `Level ${lvl} — ${G.tierName(lvl)}`,
      cls: 'celebrate',
      body: `<div class="level-up"><div class="avatar-wrap">${riderAvatar(g.player.kit ?? 0, 120)}${signIcon(lvl, 40)}</div><p>You moved up the career ladder. ${unlock}</p><p class="muted small">World rank #${G.rankOf(g)}.</p></div>`,
      cancel: () => {
        this.close();
        this.render();
      },
      actions: [{ label: 'Keep climbing', kind: 'primary', run: () => (this.close(), this.render()) }],
    });
  }

  private buyFuel() {
    const g = this.g;
    const station = G.atFuelStation(g);
    if (G.fillUpGallons(g) === 0) {
      this.say('The tank is already full.');
      return this.render();
    }
    const r = G.refuel(g, !station);
    if (!r) {
      this.say(`You can’t afford fuel ($${G.fuelPrice(g, !station)}/gal). Race locally to earn some.`, 'bad');
      sfx.play('bad');
    } else {
      this.say(station ? `Filled up: ${r.gallons} gal for ${money(r.cost)}.` : `Fuel delivered: ${r.gallons} gal for ${money(r.cost)}.`, 'good');
      sfx.play('fuel');
    }
    this.commit();
  }

  private eat() {
    const d = G.eat(this.g, rng);
    if (!d) {
      this.say('You’re out of snacks. Buy some at a bike shop.', 'bad');
      sfx.play('bad');
    } else {
      this.say(`Snack time! ${d.map((x) => `${STAT_LABELS[x.name as StatName]} +${x.after - x.before}`).join(', ')}.`, 'good');
      sfx.play('gain');
    }
    this.commit();
  }

  private repair() {
    const d = G.repair(this.g, rng);
    if (!d) {
      this.say('You have no toolkits. Buy some at a bike shop.', 'bad');
      sfx.play('bad');
    } else {
      const fixed = d.filter((x) => x.after > x.before).map((x) => `${PART_LABELS[x.name as PartSlot]} +${x.after - x.before}`);
      this.say(fixed.length ? `Wrenched on the bike: ${fixed.join(', ')}.` : 'Spent a toolkit but nothing would budge.', fixed.length ? 'good' : 'bad');
      sfx.play(fixed.length ? 'gain' : 'bad');
    }
    this.commit();
  }

  private save() {
    const g = this.g;
    const doSave = () => {
      if (Save.saveGame(g)) this.flashToast('Game saved');
      else this.flashToast('Couldn’t save — browser storage is unavailable');
      this.render();
    };
    if (Save.hasSave(g.player.name)) {
      this.confirm('Overwrite save?', `A save file for <b>${esc(g.player.name)}</b> already exists.`, 'Overwrite', doSave);
    } else doSave();
  }

  private openShop() {
    this.stopWalk();
    this.ui.cart = G.emptyCart();
    this.ui.shopCat = firstMissingSlot(this.g.player) ?? 'supplies';
    this.screen = 'shop';
    sfx.play('open');
    this.render();
  }

  private checkout() {
    const g = this.g;
    if (!G.checkout(g, data, this.ui.cart)) {
      this.flashToast('You can’t afford that cart');
      sfx.play('bad');
      return this.render();
    }
    this.say('Purchase successful! Enjoy your new gear.', 'good');
    this.flashToast('Order placed');
    sfx.play('cash');
    this.closeShop();
  }

  private closeShop() {
    this.ui.cart = G.emptyCart();
    this.screen = 'map';
    if (this.firstShop) {
      this.firstShop = false;
      this.ui.log = [];
      const blocked = G.raceBlocker(this.g.player);
      this.say(
        blocked
          ? 'You still need a full bike and a tire before you can race — keep an eye out for shops as you explore.'
          : 'Bike built! Head to a flag on the map to enter your first qualifier.',
        blocked ? 'bad' : 'good',
      );
    }
    this.commit();
  }

  private leaveShop() {
    const total = G.summarizeCart(this.g, data, this.ui.cart);
    if (!total.empty) this.confirm('Leave the shop?', 'Your cart will be emptied.', 'Leave', () => this.closeShop(), 'Stay');
    else this.closeShop();
  }

  private callSponsor() {
    const g = this.g;
    const amount = G.sponsorShortfall(g, data);
    const name = SPONSOR_NAMES[G.START_SPONSORS - g.sponsors] ?? 'Your sponsor';
    this.confirm(
      'Call a sponsor?',
      `<b>${esc(name)}</b> will wire you <b>${money(amount)}</b> to get back on the bike — and then drop you from their team.
       <p class="muted">You have ${g.sponsors} sponsor${g.sponsors === 1 ? '' : 's'} left. With none left and no money, your season is over.</p>`,
      'Take the money',
      () => {
        G.sponsorBailout(g, data);
        this.say(`${name} bailed you out with ${money(amount)} and dropped you.`, 'bad');
        sfx.play('cash');
        this.commit();
      },
    );
  }

  private showMenu() {
    const g = this.g;
    this.show({
      title: 'Paused',
      body: `<p class="muted">${esc(g.player.name)} · ${G.tierName(g.level)} · ${ZONE_LABELS[G.zoneOf(g)]} · Rank #${G.rankOf(g)}</p>`,
      cancel: () => {
        this.close();
        this.render();
      },
      actions: [
        { label: 'Resume', kind: 'primary', run: () => (this.close(), this.render()) },
        { label: 'Career', kind: 'plain', run: () => this.showCareer() },
        { label: 'Save game', kind: 'plain', run: () => (this.close(), this.save()) },
        { label: 'How to play', kind: 'plain', run: () => this.showHelp() },
        { label: sfx.muted ? 'Sound: off' : 'Sound: on', kind: 'plain', run: () => (this.act('sound', {}), this.showMenu()) },
        { label: 'Quit to title', kind: 'plain', run: () => this.act('title', {}) },
      ],
    });
  }

  private showCareer() {
    const back = () => {
      this.close();
      this.render();
    };
    this.show({
      title: 'Career',
      wide: true,
      cancel: back,
      body: careerBody(this.g),
      actions: [{ label: 'Close', kind: 'primary', run: back }],
    });
  }

  private showHelp() {
    const back = () => {
      this.close();
      this.render();
    };
    this.show({
      title: 'How to play',
      wide: true,
      cancel: back,
      body: `<div class="help">
        <p>You’re a rookie ranked last of 33. Climb the career ladder from local races to the World Cup, and win the World Championship in Val Di Sole, Italy.</p>
        <h4>Getting around</h4>
        <ul><li>Move with <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or the arrow keys, or tap a spot on the map to ride there.</li>
        <li>Bike shops pop up in towns as you explore. Press <kbd>Enter</kbd> on one to go in.</li>
        <li>Flags are qualifying races at real venues. Each level needs more points than the last; a win or podium levels you up.</li>
        <li>Win every flag to unlock the region’s final (the checkered flag).</li>
        <li><kbd>1</kbd> enters a local race anywhere, for points and prize money.</li>
        <li>Your van uses a gallon of fuel per step. Fill up (<kbd>5</kbd>) at towns with a bike shop or at race venues. Run dry and you can call a delivery at three times the price, or race locally to pay for it.</li></ul>
        <h4>Racing</h4>
        <ul><li>Every section is a fork in the trail. Pick a line with <kbd>←</kbd><kbd>↑</kbd><kbd>→</kbd>: lines use Strength, Skill or Endurance, or play it safe and lose a little time.</li>
        <li>A stat above the race’s pace gains time, below it loses time. Using a stat tires it out.</li>
        <li>Riding a line your stats can’t handle risks a crash that <b>injures</b> you. Three injuries end your career.</li>
        <li>Bike health matters most: keep parts above 30% with toolkits (<kbd>3</kbd>). Snacks (<kbd>2</kbd>) restore your stats.</li>
        <li>Parts are rated out of five dots: <b>Speed</b> turns effort into time, <b>Durability</b> slows wear, <b>Playfulness</b> makes crashes less likely and helps on skill lines, <b>Lightness</b> tires you out less.</li>
        <li>Tires wear one tread per section. Run out mid-race and you flat.</li></ul>
        <h4>Rankings, money and sponsors</h4>
        <ul><li>Every race has a start list of rivals. Finish ahead of them to climb the world rankings (<kbd>C</kbd> opens your career sheet).</li>
        <li>Entry fees can put you in debt. If you’re broke and can’t race, one of your three sponsors can bail you out — once each.</li>
        <li>No money, no sponsors, no bike? That’s game over.</li></ul>
      </div>`,
      actions: [{ label: 'Got it', kind: 'primary', run: back }],
    });
  }

  // ------------------------------------------------------------ views

  render() {
    let body: string;
    switch (this.screen) {
      case 'title': body = titleView(this.ui); break;
      case 'load': body = loadView(); break;
      case 'name': body = nameView(this.ui); break;
      case 'story': body = storyView(this.g); break;
      case 'europe': body = europeView(this.g); break;
      case 'victory': body = endView(this.g, true); break;
      case 'gameover': body = endView(this.g, false); break;
      default: body = this.gameView();
    }
    const focusAct = (document.activeElement as HTMLElement | null)?.dataset?.act;
    const focusKey = (document.activeElement as HTMLElement | null)?.dataset?.key;
    this.root.innerHTML = body + this.modalView() + (this.toast ? `<div class="toast" role="status">${esc(this.toast)}</div>` : '');
    if (focusAct && !this.modal) {
      const sel = focusKey ? `[data-key="${CSS.escape(focusKey)}"]` : `[data-act="${CSS.escape(focusAct)}"]`;
      this.root.querySelector<HTMLElement>(sel)?.focus();
    }
  }

  private modalView(): string {
    const m = this.modal;
    if (!m) return '';
    const btns = m.actions
      .map((a, i) => `<button class="btn ${a.kind ?? 'plain'}" data-act="modal" data-i="${i}">${esc(a.label)}</button>`)
      .join('');
    return `<div class="modal-backdrop"><div class="modal ${m.wide ? 'wide' : ''} ${m.cls ?? ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <h2 id="modal-title">${m.title}</h2><div class="modal-body">${m.body}</div><div class="modal-actions">${btns}</div></div></div>`;
  }

  private gameView(): string {
    const g = this.g;
    const zone = G.zoneOf(g);
    let stage = '';
    let paceLevel = g.level + 1;
    if (this.screen === 'map' || this.screen === 'shop') stage = mapView(g, this.ui);
    else if (this.screen === 'race') {
      stage = raceView(g, this.ui);
      paceLevel = g.activeRace?.race.level ?? this.ui.result?.session.race.level ?? paceLevel;
    }
    return `<div class="game screen-${this.screen}">
      <header class="topbar">
        <button class="logo small" data-act="menu" aria-label="Menu">mtb<span>RPG</span></button>
        <span class="chip zone">${zone === 'usa' ? '🇺🇸' : '🇪🇺'} ${ZONE_LABELS[zone]}</span>
        <span class="spacer"></span>
        <span class="chip top fuel-chip ${g.fuel <= 5 ? 'low' : ''}" title="Fuel">${icon('fuel', 15)} ${g.fuel}<small>/${G.FUEL_TANK}</small></span>
        <span class="chip top" title="Ranking points">${icon('star', 15)} ${g.player.points.toLocaleString('en-US')}</span>
        <span class="chip top ${g.money < 0 ? 'neg' : ''}" title="Money">${icon('cash', 15)} ${money(g.money)}</span>
        <button class="btn ghost small iconbtn" data-act="sound" aria-label="${this.ui.muted ? 'Unmute' : 'Mute'} sound">${icon(this.ui.muted ? 'mute' : 'sound', 18)}</button>
        <button class="btn ghost small" data-act="menu" aria-label="Open menu">${icon('menu', 18)} Menu</button>
      </header>
      ${hudView(g, this.ui, paceLevel)}
      <section class="stage">${stage}</section>
      ${this.screen === 'shop' ? shopModal(g, this.ui) : ''}
    </div>`;
  }
}
