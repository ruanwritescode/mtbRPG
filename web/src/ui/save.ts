// Saves live in this browser's localStorage. The current run is autosaved; named saves work like the
// original's save files (one per rider name).
import type { GameState } from '../engine/types';

const AUTO = 'mtbrpg:v1:autosave';
const SLOTS = 'mtbrpg:v1:saves';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function valid(s: unknown): s is GameState {
  return !!s && typeof s === 'object' && (s as GameState).version === 1 && !!(s as GameState).player;
}

export function loadAutosave(): GameState | null {
  const s = read<unknown>(AUTO, null);
  return valid(s) ? s : null;
}

export function autosave(state: GameState) {
  write(AUTO, state);
}

export function clearAutosave() {
  try {
    localStorage.removeItem(AUTO);
  } catch {
    /* storage unavailable */
  }
}

export function listSaves(): GameState[] {
  const all = read<Record<string, unknown>>(SLOTS, {});
  return Object.values(all)
    .filter(valid)
    .sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
}

export function hasSave(name: string): boolean {
  return name in read<Record<string, unknown>>(SLOTS, {});
}

export function saveGame(state: GameState): boolean {
  const all = read<Record<string, GameState>>(SLOTS, {});
  const copy: GameState = JSON.parse(JSON.stringify({ ...state, activeRace: undefined, savedAt: Date.now() }));
  all[state.player.name] = copy;
  return write(SLOTS, all);
}

export function deleteSave(name: string) {
  const all = read<Record<string, GameState>>(SLOTS, {});
  delete all[name];
  write(SLOTS, all);
}

export function copyOf(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}
