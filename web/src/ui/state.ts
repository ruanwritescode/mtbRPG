// What the views need to know about the UI beyond the game state itself.
import type { Cart, RaceResult } from '../engine/game';
import type { Point, RaceSession, SectionOutcome } from '../engine/types';
import type { ItemKind } from './art';

export type Screen = 'title' | 'load' | 'name' | 'story' | 'map' | 'shop' | 'race' | 'europe' | 'victory' | 'gameover';
export type Tone = 'info' | 'good' | 'bad';

export interface UI {
  screen: Screen;
  cart: Cart;
  raceView: 'start' | 'ride' | 'result';
  result: (RaceResult & { session: RaceSession }) | null;
  /** Phone layout, and whether the whole map is shown instead of the camera window. */
  mobile: boolean;
  fullMap: boolean;
  metersOpen: boolean;
  shopCat: ItemKind | 'supplies';
  log: { text: string; tone: Tone }[];
  walkPath: Point[];
  from: Point | null;
  /** The section just ridden, shown for a moment before the next one. */
  flash: { outcome: SectionOutcome; feature: number } | null;
  muted: boolean;
  /** Kit colour being chosen on the name screen. */
  nameKit: number;
}
