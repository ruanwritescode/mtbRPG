// Game data, read from the same text files the original C++ game uses (repository root).
import usaRaw from '../../maps/usa.txt?raw';
import europeRaw from '../../maps/europe.txt?raw';
import itemsRaw from '../../items/items.txt?raw';
import racesRaw from '../../races/races.txt?raw';
import terrainRaw from '../../races/terrain.txt?raw';
import startsRaw from '../../races/starts.txt?raw';
import {
  parseItems,
  parseMap,
  parseRaceList,
  parseStarts,
  parseTerrain,
  type GameData,
} from './engine/parse';

export const gameData: GameData = {
  maps: { usa: parseMap(usaRaw), europe: parseMap(europeRaw) },
  shop: parseItems(itemsRaw),
  raceList: parseRaceList(racesRaw),
  terrain: parseTerrain(terrainRaw),
  starts: parseStarts(startsRaw),
};
