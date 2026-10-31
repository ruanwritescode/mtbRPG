// Screens, input and flow. Rules live in ../engine; this file only decides what to show and when.
import { gameData as data } from '../data';
import { isLand } from '../engine/parse';
import { mathRng as rng } from '../engine/rng';
import * as G from '../engine/game';
import {
  PART_LABELS,
  PART_SLOTS,
  STAT_LABELS,
  STAT_NAMES,
  ZONE_LABELS,
  type GameState,
  type PartSlot,
  type Point,
  type RaceKind,
  type RaceSession,
  type StatName,
} from '../engine/types';
import { itemIcon, levelBadge, sectionScene, signIcon, startScene, titleBackground, type ItemKind } from './art';
import { esc, money, ordinal, seconds } from './dom';
import { cellFromEvent, mapSvg } from './mapSvg';
import * as Save from './save';
import { partImage } from './partImages';

type Screen = 'title' | 'load' | 'name' | 'story' | 'map' | 'shop' | 'race' | 'europe' | 'victory' | 'gameover';
type Tone = 'info' | 'good' | 'bad';

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
}

const SPONSOR_NAMES = ['Dirt Bag Coffee', 'Loam Ranger Tires', 'Hometown Bike Co.'];

export class App {
  private root: HTMLElement;
  private screen: Screen = 'title';
  private game: GameState | null = null;
  private log: { text: string; tone: Tone }[] = [];
  private modal: Modal | null = null;
  private cart: G.Cart = G.emptyCart();
  private raceView: 'start' | 'ride' | 'result' = 'start';
  private result: (G.RaceResult & { session: RaceSession }) | null = null;
  private from: Point | null = null;
  private walkTimer: number | null = null;
  private walkPath: Point[] = [];
  private toast: string | null = null;
  private toastTimer: number | null = null;
  private firstShop = false;
  /** Whether the stat meters are expanded; collapsed by default on phones so the map stays in view. */
  private metersOpen = !window.matchMedia?.('(max-width: 820px)').matches;
  private shopCat: ItemKind | 'supplies' = 'frame';

  constructor(root: HTMLElement) {
    this.root = root;
    root.addEventListener('click', (e) => this.onClick(e));
    root.addEventListener('submit', (e) => this.onSubmit(e));
    root.addEventListener(
      'toggle',
      (e) => {
        const el = e.target as HTMLDetailsElement;
        if (el.dataset?.sec === 'meters') this.metersOpen = el.open;
      },
      true,
    );
    window.addEventListener('keydown', (e) => this.onKey(e));
    this.render();
  }

  // ------------------------------------------------------------ plumbing

  private get g(): GameState {
    if (!this.game) throw new Error('no game');
    return this.game;
  }

  private say(text: string, tone: Tone = 'info') {
    this.log.unshift({ text, tone });
    this.log.length = Math.min(this.log.length, 6);
  }

  private flash(text: string) {
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
      if (this.screen !== 'race' && G.checkGameOver(this.game, data)) this.screen = 'gameover';
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
    this.act(el.dataset.act!, el.dataset);
  }

  private onSubmit(e: SubmitEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    if (form.id === 'name-form') {
      const name = (new FormData(form).get('name') as string).trim().slice(0, 24);
      if (!name) return;
      this.newGame(name);
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
        } else if (keyNum >= 1 && keyNum <= 4) {
          this.act(['local', 'eat', 'repair', 'save'][keyNum - 1], {});
        } else if (k === 'Escape') this.act('menu', {});
        break;
      }
      case 'shop':
        if (k === 'Escape') this.act('leave', {});
        break;
      case 'race':
        if (this.raceView === 'start' && (k === 'Enter' || k === ' ')) {
          e.preventDefault();
          this.act('drop-in', {});
        } else if (this.raceView === 'ride' && keyNum) {
          const opts = data.terrain[this.g.activeRace!.feature].options;
          if (keyNum <= opts.length) this.act('line', { n: String(keyNum) });
        } else if (this.raceView === 'ride' && k === 'Escape') this.act('quit-race', {});
        else if (this.raceView === 'result' && (k === 'Enter' || k === ' ')) {
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
      case 'continue': {
        const s = Save.loadAutosave();
        if (s) this.resume(s);
        return;
      }
      case 'new':
        this.screen = 'name';
        this.render();
        queueMicrotask(() => this.root.querySelector<HTMLInputElement>('#name')?.focus());
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
      case 'eat':
        this.eat();
        return;
      case 'repair':
        this.repair();
        return;
      case 'save':
        this.save();
        return;
      case 'dpad':
        this.stopWalk();
        this.step(ds.dir as G.Direction);
        return;
      // shop
      case 'cat':
        this.shopCat = ds.cat as ItemKind | 'supplies';
        this.render();
        queueMicrotask(() => this.root.querySelector<HTMLElement>(`[data-act="cat"][data-cat="${this.shopCat}"]`)?.focus());
        return;
      case 'uncart': {
        const k = ds.k as ItemKind;
        if (k === 'tires' || k === 'snacks' || k === 'toolkits') this.cart[k] = 0;
        else delete this.cart.parts[k];
        this.render();
        return;
      }
      case 'part': {
        const slot = ds.slot as PartSlot;
        const i = Number(ds.i);
        if (this.cart.parts[slot] === i) delete this.cart.parts[slot];
        else this.cart.parts[slot] = i;
        this.render();
        return;
      }
      case 'qty': {
        const what = ds.what as G.Consumable;
        const next = this.cart[what] + Number(ds.d);
        this.cart[what] = Math.max(0, Math.min(next, G.maxAdd(this.g.player, what)));
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
        this.raceView = 'ride';
        this.commit();
        return;
      case 'line':
        this.rideLine(Number(ds.n));
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
        this.log = [];
        this.say('Welcome to Europe! The World Cup circuit awaits.', 'good');
        this.commit();
        return;
    }
  }

  // ------------------------------------------------------------ flow

  private newGame(name: string) {
    this.game = G.createGame(name, data, rng);
    this.log = [];
    this.screen = 'story';
    this.commit();
  }

  private resume(s: GameState) {
    this.game = s;
    this.log = [];
    this.cart = G.emptyCart();
    if (s.phase === 'champion') this.screen = 'victory';
    else if (s.phase === 'gameover') this.screen = 'gameover';
    else if (s.activeRace) {
      this.screen = 'race';
      this.raceView = s.activeRace.status === 'start' ? 'start' : 'ride';
    } else {
      this.screen = 'map';
      this.say(`Welcome back, ${s.player.name}.`);
    }
    this.commit();
  }

  private step(dir: G.Direction): boolean {
    const map = G.currentMap(this.g);
    const before = { ...map.player };
    const r = G.move(this.g, data, dir, rng);
    if (!r.moved) return false;
    this.from = before;
    if (r.shopFound) this.say('There’s a bike shop in this town!', 'good');
    this.commit();
    this.from = null;
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
    this.walkPath = path;
    const tick = () => {
      const next = this.walkPath.shift();
      if (!next || this.screen !== 'map' || this.modal) return this.stopWalk();
      const cur = G.currentMap(this.g).player;
      const dir = (Object.keys(G.DIRS) as G.Direction[]).find((d) => cur.x + G.DIRS[d].x === next.x && cur.y + G.DIRS[d].y === next.y);
      if (!dir || !this.step(dir)) return this.stopWalk();
      if (G.locationOf(this.g) !== 'open' || !this.walkPath.length) return this.stopWalk();
      this.walkTimer = window.setTimeout(tick, 120);
    };
    tick();
  }

  private stopWalk() {
    if (this.walkTimer) clearTimeout(this.walkTimer);
    this.walkTimer = null;
    if (this.walkPath.length) {
      this.walkPath = [];
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
    if (kind === 'local' && G.locationOf(g) !== 'open') return this.interact();
    if (kind === 'map' && g.player.points < G.requiredPoints(g.level)) {
      this.say(`Earn ${G.requiredPoints(g.level)} qualification points to enter this race.`, 'bad');
      return this.render();
    }
    if (kind === 'final' && map.races.length) {
      this.say(`Complete all other races on the map to enter the final (${map.races.length} left).`, 'bad');
      return this.render();
    }
    const blocker = G.raceBlocker(g.player);
    if (blocker) {
      this.say(blocker, 'bad');
      return this.render();
    }
    const pick = G.pickRace(g, kind, rng);
    if (!pick) {
      this.say('No local races at your level yet. Head to a flag on the map to start your season.', 'bad');
      return this.render();
    }
    const r = pick.race;
    const debt = r.entryFee > g.money ? `<p class="warn">That’s more than you have — you’ll go into debt.</p>` : '';
    this.confirm(
      esc(r.name),
      `<div class="race-card"><div>${levelBadge(r.level)} <span class="muted">· ${r.length} sections</span></div>
        <p>The entry fee is <b>${money(r.entryFee)}</b>. You have ${money(g.money)}.</p>${debt}
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
    this.raceView = 'start';
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

  private rideLine(n: number) {
    const s = this.g.activeRace;
    if (!s || s.status !== 'running') return;
    G.rideSection(this.g, data, s, n, rng);
    if (s.status !== 'running') this.finishRace(s);
    else this.commit();
  }

  private finishRace(s: RaceSession) {
    const res = G.settleRace(this.g, s);
    this.result = { ...res, session: s };
    this.raceView = 'result';
    this.commit();
  }

  private afterRace() {
    const res = this.result;
    this.result = null;
    if (!res) return;
    const g = this.g;
    const s = res.session;
    if (res.placement) this.say(`${ordinal(res.placement)} at the ${s.race.name}: +${res.points} points, ${money(res.prize)}.`, 'good');
    else if (res.placement === 0) this.say(`No podium at the ${s.race.name}. ${res.points} points.`, 'bad');
    if (res.levelUp) this.say(`Level up! You’re now level ${g.level}.`, 'good');
    if (g.phase === 'gameover' || G.checkGameOver(g, data)) this.screen = 'gameover';
    else if (res.champion) this.screen = 'victory';
    else if (res.zoneComplete) this.screen = 'europe';
    else this.screen = 'map';
    this.commit();
  }

  private eat() {
    const d = G.eat(this.g, rng);
    if (!d) this.say('You’re out of snacks. Buy some at a bike shop.', 'bad');
    else this.say(`Snack time! ${d.map((x) => `${STAT_LABELS[x.name as StatName]} +${x.after - x.before}`).join(', ')}.`, 'good');
    this.commit();
  }

  private repair() {
    const d = G.repair(this.g, rng);
    if (!d) this.say('You have no toolkits. Buy some at a bike shop.', 'bad');
    else {
      const fixed = d.filter((x) => x.after > x.before).map((x) => `${PART_LABELS[x.name as PartSlot]} +${x.after - x.before}`);
      this.say(fixed.length ? `Wrenched on the bike: ${fixed.join(', ')}.` : 'Spent a toolkit but nothing would budge.', fixed.length ? 'good' : 'bad');
    }
    this.commit();
  }

  private save() {
    const g = this.g;
    const doSave = () => {
      if (Save.saveGame(g)) this.flash('Game saved');
      else this.flash('Couldn’t save — browser storage is unavailable');
      this.render();
    };
    if (Save.hasSave(g.player.name)) {
      this.confirm('Overwrite save?', `A save file for <b>${esc(g.player.name)}</b> already exists.`, 'Overwrite', doSave);
    } else doSave();
  }

  private openShop() {
    this.stopWalk();
    this.cart = G.emptyCart();
    const p = this.g.player;
    this.shopCat = PART_SLOTS.find((slot) => !p.parts[slot] || p.parts[slot]!.quality <= 0) ?? (p.tires.length ? 'supplies' : 'tires');
    if (this.shopCat === 'tires') this.shopCat = 'supplies';
    this.screen = 'shop';
    this.render();
  }

  private checkout() {
    const g = this.g;
    if (!G.checkout(g, data, this.cart)) {
      this.flash('You can’t afford that cart');
      return this.render();
    }
    this.say('Purchase successful! Enjoy your new gear.', 'good');
    this.flash('Order placed');
    this.closeShop();
  }

  private closeShop() {
    this.cart = G.emptyCart();
    this.screen = 'map';
    if (this.firstShop) {
      this.firstShop = false;
      this.log = [];
      this.say(
        G.raceBlocker(this.g.player)
          ? 'Welcome to the USA! You still need a full bike and tires before you can race — keep an eye out for shops.'
          : 'Welcome to the USA! Head to a flag to enter your first race.',
        G.raceBlocker(this.g.player) ? 'bad' : 'good',
      );
    }
    this.commit();
  }

  private leaveShop() {
    const sum = G.summarizeCart(this.g, data, this.cart);
    if (!sum.empty) this.confirm('Leave the shop?', 'Your cart will be emptied.', 'Leave', () => this.closeShop(), 'Stay');
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
        this.commit();
      },
    );
  }

  private showMenu() {
    const g = this.g;
    this.show({
      title: 'Paused',
      body: `<p class="muted">${esc(g.player.name)} · Level ${g.level} · ${ZONE_LABELS[G.zoneOf(g)]}</p>`,
      cancel: () => {
        this.close();
        this.render();
      },
      actions: [
        { label: 'Resume', kind: 'primary', run: () => (this.close(), this.render()) },
        { label: 'Save game', kind: 'plain', run: () => (this.close(), this.save()) },
        { label: 'How to play', kind: 'plain', run: () => this.showHelp() },
        { label: 'Quit to title', kind: 'plain', run: () => this.act('title', {}) },
      ],
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
        <p>Race your way from local events to the World Championship in Val Di Sole, Italy.</p>
        <h4>Getting around</h4>
        <ul><li>Move with <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or the arrow keys, or tap a spot on the map to ride there.</li>
        <li>Bike shops pop up as you explore new towns. Press <kbd>Enter</kbd> on one to go in.</li>
        <li>Flags are qualifying races. Each one needs more points than the last; winning (or a podium) levels you up.</li>
        <li>Win every flag to unlock the region’s final race (the checkered flag).</li>
        <li>Anywhere else, <kbd>1</kbd> enters a local race for points and prize money.</li></ul>
        <h4>Racing</h4>
        <ul><li>Each section offers lines that use Strength, Skill or Endurance — or a safe line that just loses time.</li>
        <li>A stat above the race’s pace gains time, below it loses time. Using a stat tires it out.</li>
        <li>Riding a line your stats can’t handle risks a crash that <b>injures</b> you. Three injuries end your career.</li>
        <li>Bike health matters most: keep parts above 30% with toolkits (<kbd>3</kbd>). Snacks (<kbd>2</kbd>) restore your stats.</li>
        <li>Tires wear one tread per section. Run out mid-race and you flat.</li></ul>
        <h4>Money and sponsors</h4>
        <ul><li>Entry fees can put you in debt. If you’re broke and can’t race, one of your three sponsors can bail you out — once each.</li>
        <li>No money, no sponsors, no bike? That’s game over.</li></ul>
      </div>`,
      actions: [{ label: 'Got it', kind: 'primary', run: back }],
    });
  }

  // ------------------------------------------------------------ views

  render() {
    let body: string;
    switch (this.screen) {
      case 'title': body = this.titleView(); break;
      case 'load': body = this.loadView(); break;
      case 'name': body = this.nameView(); break;
      case 'story': body = this.storyView(); break;
      case 'europe': body = this.europeView(); break;
      case 'victory': body = this.endView(true); break;
      case 'gameover': body = this.endView(false); break;
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
    return `<div class="modal-backdrop"><div class="modal ${m.wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <h2 id="modal-title">${m.title}</h2><div class="modal-body">${m.body}</div><div class="modal-actions">${btns}</div></div></div>`;
  }

  private titleView(): string {
    const auto = Save.loadAutosave();
    const saves = Save.listSaves();
    const canContinue = auto && auto.phase !== 'gameover' && auto.phase !== 'champion';
    const cont = canContinue
      ? `<button class="btn primary duo" data-act="continue">Continue<span class="sub">${esc(auto.player.name)} · Level ${auto.level} · ${ZONE_LABELS[auto.phase === 'usa' ? 'usa' : 'europe']}</span></button>`
      : '';
    return `<main class="title-screen">
      <div class="title-bg">${titleBackground()}</div>
      <div class="title-content">
        <h1 class="logo">mtb<span>RPG</span></h1>
        <p class="tagline">Build a bike. Chase points. Race your way to the World Championship.</p>
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

  private loadView(): string {
    const rows = Save.listSaves().map((s) => `<li class="save-row">
        <div><b>${esc(s.player.name)}</b><div class="muted small">Level ${s.level} · ${ZONE_LABELS[s.phase === 'usa' ? 'usa' : 'europe']} · ${s.player.points} pts · ${money(s.money)}${s.savedAt ? ` · ${new Date(s.savedAt).toLocaleDateString()}` : ''}</div></div>
        <div class="row-actions"><button class="btn plain small" data-act="delete-slot" data-name="${esc(s.player.name)}">Delete</button>
        <button class="btn primary small" data-act="load-slot" data-name="${esc(s.player.name)}">Load</button></div></li>`).join('');
    return `<main class="center-screen"><div class="card narrow">
      <h2>Load game</h2>
      <ul class="saves">${rows || '<li class="muted">No saves yet.</li>'}</ul>
      <button class="btn ghost" data-act="title">← Back</button></div></main>`;
  }

  private nameView(): string {
    return `<main class="center-screen"><form class="card narrow" id="name-form">
      <h2>Hi there, what is your name?</h2>
      <input id="name" name="name" maxlength="24" autocomplete="off" placeholder="Rider name" required />
      <div class="row-actions"><button type="button" class="btn ghost" data-act="title">Back</button><button class="btn primary" type="submit">Let’s ride</button></div>
    </form></main>`;
  }

  private storyView(): string {
    const g = this.g;
    return `<main class="center-screen"><div class="card story">
      <h2>Hello ${esc(g.player.name)}!</h2>
      <p>Welcome to a mountain bike role-playing game. Your goal this season: climb from local races all the way to the World Championship in Val Di Sole, Italy.</p>
      <p>You’ve picked up <b>${G.START_SPONSORS} new sponsors</b> this year, and to build your bike they’ve offered <b>${money(g.money)}</b> to get you started.</p>
      <p>Head to your local bike shop to build a fresh bike for the season and stock up on supplies. You’ll need all four parts and at least one tire to race.</p>
      <button class="btn primary big" data-act="to-shop">Go to the bike shop →</button>
    </div></main>`;
  }

  private europeView(): string {
    return `<main class="center-screen"><div class="card story">
      <div class="trophy">🏆</div>
      <h2>WOW!</h2>
      <p>You’ve climbed up the ladder and won the most competitive race the United States has to offer!</p>
      <p>Now it’s time to really test your skills and go overseas. The European World Cup circuit is waiting.</p>
      <button class="btn primary big" data-act="fly">Fly to Europe ✈</button>
    </div></main>`;
  }

  private endView(won: boolean): string {
    const g = this.g;
    const stats = `<div class="end-stats">
      <div><b>${g.stats.entered}</b><span>races</span></div><div><b>${g.stats.wins}</b><span>wins</span></div>
      <div><b>${g.stats.podiums}</b><span>podiums</span></div><div><b>${g.player.points}</b><span>points</span></div></div>`;
    if (won) {
      return `<main class="center-screen"><div class="card story">
        <div class="trophy">🌈</div><h2>World Champion!</h2>
        <p>${esc(g.player.name)}, you won the Val Di Sole World Championship. Time to pull on the rainbow stripes.</p>
        ${stats}<button class="btn primary big" data-act="new">Start a new season</button>
        <button class="btn ghost" data-act="title">Title screen</button></div></main>`;
    }
    const why = g.gameOver === 'injury'
      ? `<h2>Season over — injured</h2><p>Too many crashes from riding beyond your limits. ${esc(g.player.name)} is off the bike for the rest of the year.</p>`
      : `<h2>Season over — broke</h2><p>No money, no sponsors and no way to get your bike race-ready. ${esc(g.player.name)} is hanging up the helmet for now.</p>`;
    return `<main class="center-screen"><div class="card story gameover">
      <div class="trophy">${g.gameOver === 'injury' ? '🩼' : '💸'}</div>${why}
      ${stats}<button class="btn primary big" data-act="new">Try again</button>
      <button class="btn ghost" data-act="title">Title screen</button></div></main>`;
  }

  // ------------------------------------------------------------ in-game layout

  private gameView(): string {
    const g = this.g;
    const zone = G.zoneOf(g);
    let stage = '';
    let paceLevel = g.level + 1;
    if (this.screen === 'map' || this.screen === 'shop') stage = this.mapView();
    else if (this.screen === 'race') {
      stage = this.raceViewHtml();
      paceLevel = g.activeRace?.race.level ?? this.result?.session.race.level ?? paceLevel;
    }
    return `<div class="game screen-${this.screen}">
      <header class="topbar">
        <button class="logo small" data-act="menu" aria-label="Menu">mtb<span>RPG</span></button>
        <span class="chip zone">${zone === 'usa' ? '🇺🇸' : '🇪🇺'} ${ZONE_LABELS[zone]}</span>
        <span class="spacer"></span>
        <button class="btn ghost small" data-act="help">How to play</button>
        <button class="btn ghost small" data-act="menu" aria-label="Open menu">☰ Menu</button>
      </header>
      ${this.hudView(paceLevel)}
      <section class="stage">${stage}</section>
      ${this.screen === 'shop' ? this.shopModal() : ''}
    </div>`;
  }

  private bar(value: number, max: number, cls = '', tick?: number): string {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    const t = tick !== undefined ? `<i class="tick" style="left:${Math.min(100, (tick / max) * 100)}%"></i>` : '';
    return `<div class="bar ${cls}"><span style="width:${pct}%"></span>${t}</div>`;
  }

  /** A product photo when one exists, otherwise the drawn icon. */
  private itemArt(kind: ItemKind, name: string, size: number): string {
    const url = partImage(name);
    return url ? `<img class="item-photo" src="${url}" width="${size}" height="${size}" alt="" loading="lazy" />` : itemIcon(kind, size);
  }

  private mini(label: string, value: string, pct: number, cls: string, tick?: number, sub?: string): string {
    return `<div class="mini ${cls === 'none' ? 'missing' : ''}" ${sub ? `title="${sub}"` : ''}><div class="mt"><span>${label}</span><b>${value}</b></div>${this.bar(pct, 100, cls === 'none' ? '' : cls, tick)}</div>`;
  }

  private hudView(paceLevel: number): string {
    const g = this.g;
    const p = g.player;
    const pace = G.turningPoint(paceLevel);
    const stats = STAT_NAMES.map((s) => {
      const v = p[s];
      const cls = s === 'mental' ? (v < 40 ? 'bad' : v < 70 ? 'warn' : 'good') : v < pace ? 'bad' : v < pace + 10 ? 'warn' : 'good';
      return this.mini(STAT_LABELS[s], String(v), (v / 102) * 100, cls, s === 'mental' ? undefined : (pace / 102) * 100);
    }).join('');
    const parts = PART_SLOTS.map((slot) => {
      const part = p.parts[slot];
      if (!part) return this.mini(PART_LABELS[slot], 'none', 0, 'none');
      const cls = part.quality < 30 ? 'bad' : part.quality < 60 ? 'warn' : 'good';
      return this.mini(PART_LABELS[slot], `${part.quality}<small>/${part.max}</small>`, part.quality, cls, undefined, esc(part.name));
    }).join('');
    const tire = p.tires.length
      ? this.mini('Tire', `${p.tires[0]}<small>/${G.TIRE_LIFE}</small>`, (p.tires[0] / G.TIRE_LIFE) * 100, p.tires[0] < 6 ? 'bad' : p.tires[0] < 12 ? 'warn' : 'good')
      : this.mini('Tire', 'none', 0, 'none');
    const pips = (n: number, max: number, cls: string) =>
      `<span class="pips ${cls}">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
    const req = G.requiredPoints(g.level);
    const gate = g.phase === 'usa' || g.phase === 'europe'
      ? (G.currentMap(g).races.length ? (p.points >= req ? 'qualified for next flag' : `${req} for next flag`) : 'final unlocked')
      : '';
    return `<section class="hud" aria-label="Rider">
      <div class="hud-bar">
        <div class="hud-id"><div class="avatar" aria-hidden="true">${esc(p.name.slice(0, 1).toUpperCase())}</div>
          <div><div class="rider-name">${esc(p.name)}</div><div>${g.level ? levelBadge(g.level) : '<span class="badge">Rookie</span>'}</div></div></div>
        <div class="hud-kpi"><span>Points</span><b>${p.points}</b><small>${gate}</small></div>
        <div class="hud-kpi"><span>Money</span><b class="${g.money < 0 ? 'neg' : ''}">${money(g.money)}</b><small>prices ×${G.shopMultiplier(g.level).toFixed(2)}</small></div>
        <div class="hud-kpi"><span>Sponsors</span>${pips(g.sponsors, G.START_SPONSORS, 'sponsor')}<small>${g.sponsors} left</small></div>
        <div class="hud-kpi"><span>Injuries</span>${pips(p.injuries, G.MAX_INJURIES, 'injury')}<small>${G.MAX_INJURIES - p.injuries} to go</small></div>
        <div class="hud-supply" title="Spare tires, snacks and toolkits">
          <span>${this.itemArt('tires', 'Tire', 26)}<b>${Math.max(0, p.tires.length - 1)}</b></span>
          <span>${this.itemArt('snacks', 'Snack', 26)}<b>${p.snacks}</b></span>
          <span>${this.itemArt('toolkits', 'Toolkit', 26)}<b>${p.toolkits}</b></span>
        </div>
      </div>
      <details class="hud-meters" data-sec="meters" ${this.metersOpen ? 'open' : ''}>
        <summary>Rider &amp; bike <small class="muted">pace ${pace} · bike health ${G.bikeHealth(p)}</small></summary>
        <div class="mgroups">
          <div class="mgroup"><h5 title="Stats above the race pace gain time; below it they lose time">Rider <i class="tick-key"></i> pace ${pace}</h5><div class="minis">${stats}</div></div>
          <div class="mgroup"><h5 title="Average part health above 30 gains time; a part at 0 breaks">Bike · hp ${G.bikeHealth(p)}</h5><div class="minis">${parts}${tire}</div></div>
        </div>
      </details>
    </section>`;
  }

  private mapView(): string {
    const g = this.g;
    const zone = G.zoneOf(g);
    const map = G.currentMap(g);
    const t = data.maps[zone];
    const loc = G.locationOf(g);
    const req = G.requiredPoints(g.level);
    const finalRace = data.raceList.find((r) => r.level === G.FINAL_LEVEL[zone]);
    let here: string;
    if (loc === 'shop') {
      here = `<h3>🔧 Bike shop</h3><p>There’s a bike shop in this town. Parts, tires, snacks and toolkits.</p>
        <button class="btn primary" data-act="interact">Visit shop <kbd>Enter</kbd></button>`;
    } else if (loc === 'race') {
      const ok = g.player.points >= req;
      here = `<h3>${signIcon(g.level + 1, 16)} Level ${g.level + 1} qualifier</h3><p>${ok ? 'Win or podium here to level up.' : `You need <b>${req}</b> points to enter and have ${g.player.points}. Local races earn points.`}</p>
        <button class="btn primary" data-act="interact" ${ok ? '' : 'disabled'}>Enter race <kbd>Enter</kbd></button>`;
    } else if (loc === 'final') {
      const open = map.races.length === 0;
      here = `<h3>🏁 ${esc(finalRace?.name ?? 'Final race')}</h3><p>${open ? 'The final is open. Win or podium it to finish the region!' : `Complete all other races on the map to enter (${map.races.length} left).`}</p>
        <button class="btn primary" data-act="interact" ${open ? '' : 'disabled'}>Enter the final <kbd>Enter</kbd></button>`;
    } else {
      here = g.level === 0
        ? `<h3>Open trail</h3><p>Ride to a flag to enter your first qualifier. Tap the map or use the arrow keys.</p>`
        : `<h3>Open trail</h3><p>Enter a local race for points and money, or keep exploring to find bike shops.</p>
        <button class="btn primary" data-act="local" ${G.raceBlocker(g.player) ? 'disabled' : ''}>Enter a local race <kbd>1</kbd></button>`;
    }
    const blocker = G.raceBlocker(g.player);
    const p = g.player;
    const actions = `<div class="actions">
      <button class="btn plain" data-act="eat" ${p.snacks ? '' : 'disabled'} title="Restores all four stats"><kbd>2</kbd> Eat a snack <small>${p.snacks} left</small></button>
      <button class="btn plain" data-act="repair" ${p.toolkits ? '' : 'disabled'} title="Repairs every working part"><kbd>3</kbd> Use a toolkit <small>${p.toolkits} left</small></button>
      <button class="btn plain" data-act="save"><kbd>4</kbd> Save game</button>
    </div>`;
    const log = this.log.map((m) => `<li class="${m.tone}">${esc(m.text)}</li>`).join('');
    return `<div class="map-stage">
      <div class="map-wrap">
        ${mapSvg(t, map, { nextLevel: g.level + 1, finalOpen: map.races.length === 0, path: this.walkPath, from: this.from ?? undefined })}
        <div class="legend"><span><i class="lg you"></i>You</span><span>${signIcon(g.level + 1, 12)}Qualifier</span><span><i class="lg shop"></i>Shop</span><span>🏁 Final</span><span><i class="lg won"></i>Won</span><span><i class="lg trail"></i>Ridden</span></div>
      </div>
      <div class="panel">
        <div class="here card">${here}</div>
        ${blocker ? `<div class="notice bad">${esc(blocker)}</div>` : ''}
        ${actions}
        <div class="dpad" aria-label="Move">
          <button class="btn plain" data-act="dpad" data-dir="up" data-key="up" aria-label="Up">▲</button>
          <button class="btn plain" data-act="dpad" data-dir="left" data-key="left" aria-label="Left">◀</button>
          <button class="btn plain" data-act="dpad" data-dir="down" data-key="down" aria-label="Down">▼</button>
          <button class="btn plain" data-act="dpad" data-dir="right" data-key="right" aria-label="Right">▶</button>
        </div>
        <ul class="log" aria-live="polite">${log}</ul>
        <p class="hint muted small"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrows to move · tap the map to ride there · <kbd>Esc</kbd> menu · <button class="linkish" data-act="help">How to play</button></p>
      </div>
    </div>`;
  }

  private shopModal(): string {
    const g = this.g;
    const p = g.player;
    const lvl = g.level;
    const sum = G.summarizeCart(g, data, this.cart);
    const cats: { key: ItemKind | 'supplies'; label: string; icon: ItemKind; note: string; need: boolean }[] = [
      ...PART_SLOTS.map((slot) => {
        const owned = p.parts[slot];
        const need = !owned || owned.quality <= 0;
        return { key: slot as ItemKind | 'supplies', label: PART_LABELS[slot], icon: slot as ItemKind, note: need ? 'needed' : this.cart.parts[slot] !== undefined ? 'in cart' : `${owned!.quality}/${owned!.max}`, need };
      }),
      { key: 'supplies', label: 'Supplies', icon: 'tires', note: !p.tires.length ? 'tires needed' : `${this.cart.tires + this.cart.snacks + this.cart.toolkits || ''}${this.cart.tires + this.cart.snacks + this.cart.toolkits ? ' in cart' : ''}`, need: !p.tires.length },
    ];
    const nav = cats.map((c) => `<button class="cat ${this.shopCat === c.key ? 'active' : ''}" data-act="cat" data-cat="${c.key}" aria-pressed="${this.shopCat === c.key}">${itemIcon(c.icon, 30)}<span class="cat-l">${c.label}<small class="${c.need ? 'need' : ''}">${c.note}</small></span></button>`).join('');

    let items: string;
    if (this.shopCat === 'supplies') {
      items = (['tires', 'snacks', 'toolkits'] as G.Consumable[]).map((what) => {
        const have = what === 'tires' ? p.tires.length : p[what];
        const max = what === 'tires' ? G.MAX_TIRES : what === 'snacks' ? G.MAX_SNACKS : G.MAX_TOOLS;
        const label = { tires: 'Tire', snacks: 'Trail snack', toolkits: 'Toolkit' }[what];
        const note = { tires: `${G.TIRE_LIFE} sections of tread. Mounted one at a time.`, snacks: 'Restores all four stats a little.', toolkits: 'Repairs every working part a little.' }[what];
        const left = G.maxAdd(p, what);
        return `<div class="srow ${this.cart[what] ? 'selected' : ''}">${this.itemArt(what, label, 56)}
          <div><div class="name">${label}</div><div class="sub">${note} You have ${have}/${max}.</div></div>
          <div class="price">${money(G.priceAt(G.UNIT_PRICES[what], lvl))}</div>
          <div class="stepper"><button class="btn plain small" data-act="qty" data-what="${what}" data-d="-1" data-key="${what}-" ${this.cart[what] ? '' : 'disabled'} aria-label="Fewer">−</button><output>${this.cart[what]}</output><button class="btn plain small" data-act="qty" data-what="${what}" data-d="1" data-key="${what}+" ${this.cart[what] < left ? '' : 'disabled'} aria-label="More">+</button></div>
        </div>`;
      }).join('');
    } else {
      const slot = this.shopCat as PartSlot;
      const owned = p.parts[slot];
      items = data.shop.parts[slot].map((it, i) => {
        const isOwned = owned?.name === it.name;
        const inCart = this.cart.parts[slot] === i;
        return `<div class="srow ${inCart ? 'selected' : ''} ${isOwned ? 'owned' : ''}">${this.itemArt(slot as ItemKind, it.name, 56)}
          <div><div class="name">${esc(it.name)}</div><div class="sub">${isOwned ? `On your bike · ${owned!.quality}/${owned!.max} health` : `Health ${it.max}`}</div></div>
          <div class="price">${money(G.priceAt(it.price, lvl))}</div>
          <button class="btn ${inCart ? 'primary' : 'plain'} small" data-act="part" data-slot="${slot}" data-i="${i}" data-key="${slot}-${i}" ${isOwned ? 'disabled' : ''} aria-pressed="${inCart}">${isOwned ? 'Owned' : inCart ? '✓ In cart' : 'Add'}</button>
        </div>`;
      }).join('');
      if (owned && this.cart.parts[slot] !== undefined) {
        const tradeIn = Math.trunc(owned.price * G.shopMultiplier(lvl) * owned.quality / 100);
        items += `<p class="muted small">Your ${esc(owned.name)} sells on the used market for ${money(tradeIn)}, taken off the total.</p>`;
      }
    }

    const lines: string[] = [];
    for (const slot of PART_SLOTS) {
      const i = this.cart.parts[slot];
      if (i === undefined) continue;
      const it = data.shop.parts[slot][i];
      lines.push(`<li class="cline">${this.itemArt(slot as ItemKind, it.name, 34)}<span><b>${esc(it.name)}</b><small>${PART_LABELS[slot]}${p.parts[slot] ? ' · replaces ' + esc(p.parts[slot]!.name) : ''}</small></span><span class="cp">${money(G.priceAt(it.price, lvl))}<button class="linkish" data-act="uncart" data-k="${slot}" aria-label="Remove ${PART_LABELS[slot]}">Remove</button></span></li>`);
    }
    for (const what of ['tires', 'snacks', 'toolkits'] as G.Consumable[]) {
      if (!this.cart[what]) continue;
      lines.push(`<li class="cline">${this.itemArt(what, { tires: 'Tire', snacks: 'Snack', toolkits: 'Toolkit' }[what], 34)}<span><b>${this.cart[what]} × ${{ tires: 'Tire', snacks: 'Trail snack', toolkits: 'Toolkit' }[what]}</b><small>${money(G.priceAt(G.UNIT_PRICES[what], lvl))} each</small></span><span class="cp">${money(this.cart[what] * G.priceAt(G.UNIT_PRICES[what], lvl))}<button class="linkish" data-act="uncart" data-k="${what}" aria-label="Remove ${what}">Remove</button></span></li>`);
    }
    const shortfall = G.sponsorShortfall(g, data);
    const sponsor = shortfall > 0 && g.sponsors > 0 && sum.empty
      ? `<div class="notice warn"><span><b>Short on cash?</b> You need ${money(shortfall)} more to get race-ready. A sponsor can cover it, then they drop you.</span><button class="btn plain small" data-act="sponsor">Call a sponsor (${g.sponsors} left)</button></div>`
      : '';
    const after = g.money - sum.total;
    return `<div class="modal-backdrop"><div class="modal shop-modal" role="dialog" aria-modal="true" aria-labelledby="shop-title">
      <header class="shop-top"><h2 id="shop-title">Bike shop</h2><span class="muted small">${lvl ? `Level ${lvl} prices, ×${G.shopMultiplier(lvl).toFixed(2)}` : 'Welcome! Build a bike and stock up.'}</span><span class="spacer"></span><span class="chip">${money(g.money)}</span><button class="btn ghost small" data-act="leave" aria-label="Close shop">✕</button></header>
      ${sponsor}
      <div class="shop-grid">
        <nav class="shop-cats" aria-label="Departments">${nav}</nav>
        <section class="shop-items">${items}</section>
        <aside class="shop-cart"><h3>Cart</h3>
          <ul class="clines">${lines.join('') || '<li class="muted small">Your cart is empty. Add parts or supplies.</li>'}</ul>
          <dl class="totals"><dt>Items</dt><dd>${money(sum.subtotal)}</dd>
          ${sum.tradeIn ? `<dt>Old parts sold</dt><dd class="good">−${money(sum.tradeIn)}</dd>` : ''}
          <dt class="total">Total</dt><dd class="total">${money(sum.total)}</dd>
          <dt>Left after</dt><dd class="${after < 0 ? 'neg' : ''}">${money(after)}</dd></dl>
          ${!sum.canAfford ? '<p class="warn small">Not enough money for this cart.</p>' : ''}
          <button class="btn primary block" data-act="checkout" ${sum.empty || !sum.canAfford ? 'disabled' : ''}>${sum.empty ? 'Checkout' : `Checkout · ${money(sum.total)}`}</button>
          <button class="btn ghost block small" data-act="leave">${sum.empty ? 'Leave shop' : 'Leave without buying'}</button>
        </aside>
      </div>
    </div></div>`;
  }

  private raceViewHtml(): string {
    const g = this.g;
    if (this.raceView === 'result' && this.result) return this.resultView();
    const s = g.activeRace;
    if (!s) return '';
    const r = s.race;
    const head = `<div class="race-head">
        <div><h2>${esc(r.name)}</h2><div class="muted race-meta">${levelBadge(r.level)} · ${r.length} sections${r.club ? ' · club race' : ''} · <span title="Stats above this gain time, below it lose time">pace ${G.turningPoint(r.level)}</span></div></div>
        ${this.raceView === 'ride' ? `<div class="split ${s.gap > 0 ? 'ahead' : s.gap < 0 ? 'behind' : ''}"><span>Split</span><b>${seconds(s.gap)}</b></div>` : ''}
      </div>`;
    if (this.raceView === 'start') {
      return `<div class="race">${head}
        <div class="scene">${startScene(r.endcap) ?? `<pre class="ascii">${esc(data.starts[r.endcap] ?? '')}</pre>`}</div>
        <div class="race-start"><p>Pick a line in each section. Stats above <b>${G.turningPoint(r.level)}</b> gain time, bike health above 30 gains time. Finish ahead to win.</p>
        <button class="btn primary big" data-act="drop-in">Drop in <kbd>Enter</kbd></button></div></div>`;
    }
    const feat = data.terrain[s.feature];
    const pace = G.turningPoint(r.level);
    const p = g.player;
    const choices = feat.options.map((o, i) => {
      const risk = G.crashRisk(p, o.modifier, r.level);
      let chip = '';
      if (o.modifier === 'strength' || o.modifier === 'skill' || o.modifier === 'endurance') {
        const v = p[o.modifier];
        chip = `<span class="stat-chip ${v >= pace ? 'good' : 'bad'}">${STAT_LABELS[o.modifier]} ${v} · ${v >= pace ? 'gains time' : 'loses time'}</span>`;
      } else if (o.modifier === 'time') chip = '<span class="stat-chip neutral">Safe · loses 0.75s</span>';
      else if (o.modifier === 'bike') chip = `<span class="stat-chip neutral">Bike health ${G.bikeHealth(p)} · wears every part</span>`;
      const riskChip = risk > 0 ? `<span class="stat-chip risk">⚠ ${Math.round(risk * 100)}% injury risk</span>` : '';
      return `<button class="choice" data-act="line" data-n="${i + 1}" data-key="line-${i + 1}"><kbd>${i + 1}</kbd><span class="choice-label">${esc(o.label)}</span><span class="chips">${chip}${riskChip}</span></button>`;
    }).join('');
    const art = sectionScene(s.feature) ?? `<pre class="ascii">${esc(feat.art)}</pre>`;
    const progress = `<div class="progress" aria-label="Section ${s.section + 1} of ${r.length}">${Array.from({ length: r.length }, (_, i) => {
      const split = s.splits[i];
      const cls = i < s.section ? (split > 0 ? 'ahead' : 'behind') : i === s.section ? 'now' : '';
      return `<i class="${cls}"></i>`;
    }).join('')}</div>`;
    return `<div class="race">${head}${progress}
      <div class="scene">${art}<div class="section-label">Section ${s.section + 1} / ${r.length}</div></div>
      <h3 class="feature-title">${esc(feat.title)}</h3>
      <div class="choices">${choices}</div>
      ${this.lastOutcome(s)}
      <div class="race-foot"><span class="muted small">${feat.options.length > 1 ? `Press <kbd>1</kbd>–<kbd>${feat.options.length}</kbd> to choose a line` : 'Press <kbd>1</kbd> to ride it out'}</span><button class="btn ghost small" data-act="quit-race">Quit race <kbd>Esc</kbd></button></div>
    </div>`;
  }

  private lastOutcome(s: RaceSession): string {
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

  private resultView(): string {
    const res = this.result!;
    const s = res.session;
    const g = this.g;
    let title: string;
    let text: string;
    let icon: string;
    if (s.status === 'quit') {
      icon = '🏳️';
      title = 'You pulled out';
      text = `You quit the race and lost your entry fee and ${G.QUIT_PENALTY} points.`;
    } else if (s.status === 'flat') {
      icon = '🛞';
      title = 'Flat tire!';
      text = 'You got a flat! Make sure to put some fresh tires on next time.';
    } else if (s.status === 'broken') {
      icon = '🔩';
      title = 'Your bike broke';
      text = '#@%$! Your bike broke and you crashed! Get some new parts from a bike shop and try again.';
    } else if (s.status === 'crash') {
      icon = '💥';
      title = s.last?.injury ? 'Crash — you’re injured' : 'You crashed!';
      text = s.last?.injury
        ? `You rode a line beyond your ability and went down hard. Injuries: ${g.player.injuries} of ${G.MAX_INJURIES}.${g.player.injuries >= G.MAX_INJURIES ? ' That’s the end of your season.' : ' Ride within your limits!'}`
        : '#@%$! Bad luck on the trail. Heal up quick and get back out here.';
    } else {
      const pl = res.placement!;
      icon = ['😤', '🥇', '🥈', '🥉'][pl];
      title = pl ? `${ordinal(pl)} place!` : 'Off the podium';
      text = pl === 1
        ? `You won by ${(s.gap / 1000).toFixed(3)} seconds!`
        : pl
          ? `${(-s.gap / 1000).toFixed(3)} seconds back — still on the podium.`
          : `You were ${(-s.gap / 1000).toFixed(3)} seconds back and didn’t podium this time.`;
    }
    const chips = s.status === 'finished' || s.status === 'quit'
      ? `<div class="result-chips"><span class="${res.points >= 0 ? 'good' : 'bad'}">${res.points >= 0 ? '+' : ''}${res.points} points</span>${res.prize ? `<span class="good">+${money(res.prize)}</span>` : ''}${res.levelUp ? `<span class="good">Level ${g.level}!</span>` : ''}${res.zoneComplete ? '<span class="good">+1000 bonus points</span>' : ''}</div>`
      : '<p class="muted">Entry fee lost. No points this time.</p>';
    return `<div class="race result"><div class="card result-card">
      <div class="result-icon">${icon}</div><h2>${title}</h2><p>${text}</p>${chips}
      ${this.sparkline(s)}
      <button class="btn primary big" data-act="race-done">Continue <kbd>Enter</kbd></button></div></div>`;
  }

  private sparkline(s: RaceSession): string {
    if (s.splits.length < 2) return '';
    const vals = [0, ...s.splits];
    const max = Math.max(1, ...vals.map(Math.abs));
    const w = 300;
    const h = 70;
    const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h / 2 - (v / max) * (h / 2 - 4)}`).join(' ');
    return `<figure class="spark"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Split gap per section">
      <line x1="0" x2="${w}" y1="${h / 2}" y2="${h / 2}" stroke="var(--line)" stroke-width="1.5"/>
      <polyline points="${pts}" fill="none" stroke="${s.gap >= 0 ? 'var(--good)' : 'var(--danger)'}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/></svg>
      <figcaption class="muted small">Your gap to the leader, section by section</figcaption></figure>`;
  }
}
