export type PartSlot = 'frame' | 'suspension' | 'brakes' | 'wheels';
export const PART_SLOTS: PartSlot[] = ['frame', 'suspension', 'brakes', 'wheels'];
export const PART_LABELS: Record<PartSlot, string> = {
  frame: 'Frame',
  suspension: 'Suspension',
  brakes: 'Brakes',
  wheels: 'Wheels',
};

export type StatName = 'strength' | 'skill' | 'endurance' | 'mental';
export const STAT_NAMES: StatName[] = ['strength', 'skill', 'endurance', 'mental'];
export const STAT_LABELS: Record<StatName, string> = {
  strength: 'Strength',
  skill: 'Skill',
  endurance: 'Endurance',
  mental: 'Mental',
};

/** How a part rides, each 1–10 (shown as five dots, half dots possible). */
export interface Attrs {
  speed: number;
  durability: number;
  playfulness: number;
  lightness: number;
}
export const ATTR_NAMES: (keyof Attrs)[] = ['speed', 'durability', 'playfulness', 'lightness'];
export const ATTR_LABELS: Record<keyof Attrs, string> = { speed: 'Speed', durability: 'Durability', playfulness: 'Playfulness', lightness: 'Lightness' };

export interface Part {
  name: string;
  price: number;
  quality: number;
  max: number;
  attrs?: Attrs;
}

export interface Racer {
  name: string;
  strength: number;
  skill: number;
  endurance: number;
  mental: number;
  points: number;
  parts: Record<PartSlot, Part | null>;
  /** Remaining life of each tire; tires[0] is the one mounted on the bike. */
  tires: number[];
  toolkits: number;
  snacks: number;
  /** Crashes caused by riding beyond your ability. MAX_INJURIES ends the career. */
  injuries: number;
}

export type Zone = 'usa' | 'europe';
export const ZONE_LABELS: Record<Zone, string> = { usa: 'USA', europe: 'Europe' };

export interface Point {
  x: number;
  y: number;
}

/** The parts of a map that change while playing. The terrain itself comes from the map file. */
export interface MapState {
  zone: Zone;
  player: Point;
  final: Point;
  shops: Point[];
  races: Point[];
  won: Point[];
  maxShops: number;
  /** Cells the rider has been to, as "x,y". */
  visited: string[];
}

export interface RaceDef {
  name: string;
  level: number;
  entryFee: number;
  /** Which start gate art to use (0 local … 3 world cup). */
  endcap: number;
  /** Number of trail sections. */
  length: number;
  /** Reference time used for split maths (minutes*100000 + seconds*1000 + ms, as in the original). */
  time: number;
  /** A generated club race that never runs out. */
  club?: boolean;
}

export type RaceKind = 'map' | 'final' | 'local';
export type RaceStatus = 'start' | 'running' | 'finished' | 'flat' | 'crash' | 'broken' | 'quit';

export interface SectionOutcome {
  feature: number;
  choice: number;
  modifier: string;
  gapBefore: number;
  gapAfter: number;
  stat?: { name: StatName; before: number; after: number };
  damage: { slot: PartSlot; before: number; after: number }[];
  tireLife: number;
  /** Chance of a crash on this line, 0–1, and whether the crash injured the rider. */
  risk: number;
  injury?: boolean;
}

export interface RaceSession {
  race: RaceDef;
  /** Index into GameState.races, or -1 for a club race. */
  raceIndex: number;
  kind: RaceKind;
  section: number;
  feature: number;
  usedFeatures: number[];
  topTime: number;
  gap: number;
  splits: number[];
  status: RaceStatus;
  last?: SectionOutcome;
}

export type Phase = 'usa' | 'europe' | 'champion' | 'gameover';
export type GameOverReason = 'broke' | 'injury';

export interface GameState {
  version: 1;
  phase: Phase;
  player: Racer;
  level: number;
  money: number;
  /** Sponsors still backing you; each bail-out costs one. */
  sponsors: number;
  /** Gallons in the van's tank; each step on the map uses one. */
  fuel: number;
  gameOver?: GameOverReason;
  maps: Record<Zone, MapState>;
  races: RaceDef[];
  activeRace?: RaceSession;
  stats: { entered: number; wins: number; podiums: number };
  createdAt: number;
  savedAt?: number;
}
