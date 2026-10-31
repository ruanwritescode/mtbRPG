import { describe, expect, it } from 'vitest';
import { gameData as data } from '../src/data';
import { lanesFor, povScene } from '../src/ui/pov';

describe('race scenes', () => {
  it('gives every option of every section its own lane and a clickable trail', () => {
    data.terrain.forEach((feat, i) => {
      const lanes = lanesFor(feat);
      expect(lanes.length).toBe(Math.min(3, feat.options.length));
      expect(new Set(lanes).size).toBe(lanes.length);
      const svg = povScene(feat, i);
      lanes.forEach((lane, n) => expect(svg).toContain(`data-n="${n + 1}" data-lane="${lane}"`));
    });
  });

  it('puts the inside line of a corner on the inside', () => {
    const left = data.terrain.find((f) => f.title.startsWith('Left Hand'))!;
    const right = data.terrain.find((f) => f.title.startsWith('Right Hand'))!;
    expect(lanesFor(left)[left.options.findIndex((o) => /inside/i.test(o.label))]).toBe('left');
    expect(lanesFor(right)[right.options.findIndex((o) => /inside/i.test(o.label))]).toBe('right');
  });
});
