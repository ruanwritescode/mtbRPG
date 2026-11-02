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

import { fmtTime } from '../src/ui/views/race';
import { riderAvatar, flagEmoji } from '../src/ui/rider';

describe('race presentation', () => {
  it('formats finishing times as m:ss.mmm', () => {
    expect(fmtTime(235123)).toBe('3:55.123');
    expect(fmtTime(600000)).toBe('10:00.000');
    expect(fmtTime(59999)).toBe('0:59.999');
  });

  it('draws a portrait for every kit and a flag for a country', () => {
    for (let k = 0; k < 8; k++) expect(riderAvatar(k, 40)).toContain('<svg');
    expect(riderAvatar(0, 40, { rainbow: true })).toContain('clipPath');
    expect(flagEmoji('NZ')).toBe('🇳🇿');
    expect(flagEmoji()).toBe('');
  });
});
